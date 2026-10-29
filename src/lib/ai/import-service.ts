import type { DatabaseSync } from 'node:sqlite';
import { FinanceService } from '../finance-service';
import type { ContentPart, LlmProvider } from './provider';
import { ExtractionSchema, type Extraction, type ExtractedRow } from './schemas';
import { EXTRACTION_SYSTEM, extractionUserText } from './prompts';
import { categorizeWithLlm } from './categorizer';
import {
  validateExtraction,
  isApprovable,
  minorToDecimalString,
  REASON_LABELS,
  SOFT_REASONS,
  type ReasonCode,
  type ReconciliationStatus,
  type ValidationResult,
} from './validation';

export type SourceKind = 'statement' | 'receipt';

export type ImportSource =
  | { format: 'text'; text: string }
  | { format: 'pdf'; base64: string }
  | { format: 'image'; base64: string; mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif' };

export interface ImportRowView {
  id: string;
  index: number;
  date: string | null;
  amount: number | null;
  direction: 'debit' | 'credit';
  merchant: string;
  balanceAfter: number | null;
  categoryId: string | null;
  categorySource: string | null;
  status: 'validated' | 'review' | 'posted' | 'skipped' | 'removed';
  reasons: Array<{ code: ReasonCode; label: string; soft: boolean }>;
  approvable: boolean;
  transactionId: string | null;
}

export interface ImportBatchView {
  id: string;
  accountId: string;
  sourceKind: SourceKind;
  sourceFormat: string;
  fileName: string | null;
  provider: string;
  model: string;
  currency: string;
  openingBalance: number | null;
  closingBalance: number | null;
  statedTotal: number | null;
  reconciliation: { status: ReconciliationStatus; diff: number | null };
  status: string;
  createdAt: string;
  rows: ImportRowView[];
}

const MAX_TEXT_CHARS = 200_000;

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function todayIso(now: Date) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Orchestrates: model extraction -> deterministic validation -> review queue ->
 * user confirmation -> ledger posting. The model never touches the ledger; the
 * only write path into `transactions` is confirm(), which re-validates first.
 */
export class AiImportService {
  private readonly finance: FinanceService;

  constructor(
    private readonly provider: LlmProvider,
    private readonly db: DatabaseSync,
    private readonly now: () => Date = () => new Date()
  ) {
    this.finance = new FinanceService(db);
  }

  async extract(
    userId: string,
    params: { accountId: string; kind: SourceKind; source: ImportSource; fileName?: string }
  ): Promise<ImportBatchView> {
    const account = this.finance.getAccountById(params.accountId, userId);
    if (!account) throw new Error('Forbidden: target account not found');

    const { source, kind } = params;
    if (source.format === 'text' && source.text.length > MAX_TEXT_CHARS) {
      throw new Error(`Document too large (max ${MAX_TEXT_CHARS} characters)`);
    }
    if (source.format !== 'text' && !this.provider.supportsBinaryInput) {
      throw new Error('PDF and image imports need a model provider. Paste the statement text or a CSV instead.');
    }

    const content: ContentPart[] =
      source.format === 'text'
        ? [{ type: 'text', text: extractionUserText(kind, source.text) }]
        : [
            source.format === 'pdf'
              ? { type: 'pdf', base64: source.base64 }
              : { type: 'image', mediaType: source.mediaType, base64: source.base64 },
            { type: 'text', text: extractionUserText(kind) },
          ];

    const response = await this.provider.generateStructured({
      task: 'extract',
      system: EXTRACTION_SYSTEM,
      content,
      schema: ExtractionSchema,
    });
    const extraction = ExtractionSchema.parse(response.data);

    const sourceText = source.format === 'text' ? source.text : null;
    const batchId = newId('aib');
    const validation = this.runValidation(userId, params.accountId, account.currency || 'INR', extraction, sourceText, new Set(), batchId);

    this.db.prepare(`
      INSERT INTO ai_import_batches (
        id, user_id, account_id, source_kind, source_format, file_name, provider, model, currency,
        opening_balance, closing_balance, stated_total, reconciliation_status, reconciliation_diff,
        period_start, period_end, source_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      batchId, userId, params.accountId, kind, source.format, params.fileName ?? null,
      this.provider.name, response.model, validation.currency,
      validation.openingBalance, validation.closingBalance, validation.statedTotal,
      validation.reconciliation.status, validation.reconciliation.diff,
      extraction.period_start, extraction.period_end, sourceText
    );

    const insertRow = this.db.prepare(`
      INSERT INTO ai_import_rows (id, batch_id, user_id, row_index, raw_json, date, amount, direction, merchant, balance_after, status, reasons)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const row of validation.rows) {
      insertRow.run(
        newId('air'), batchId, userId, row.index, JSON.stringify(row.raw), row.date, row.amount,
        row.direction, row.merchant, row.balanceAfter, row.status, JSON.stringify(row.reasons)
      );
    }

    await this.assignCategories(userId, batchId);
    return this.getBatch(userId, batchId);
  }

  /** Rules and merchant history first; the model only fills the gaps, constrained to the user's categories. */
  private async assignCategories(userId: string, batchId: string) {
    const rows = this.db.prepare(
      `SELECT id, row_index, merchant, direction FROM ai_import_rows WHERE batch_id = ? AND user_id = ? ORDER BY row_index`
    ).all(batchId, userId) as Array<{ id: string; row_index: number; merchant: string; direction: 'debit' | 'credit' }>;
    const update = this.db.prepare(`UPDATE ai_import_rows SET category_id = ?, category_source = ? WHERE id = ? AND user_id = ?`);

    const pending: typeof rows = [];
    for (const row of rows) {
      const suggested = this.finance.suggestCategory(userId, row.merchant);
      if (suggested) update.run(suggested, 'rule', row.id, userId);
      else pending.push(row);
    }
    if (pending.length === 0) return;

    try {
      const { categories } = this.finance.getCategories(userId);
      const assigned = await categorizeWithLlm(
        this.provider,
        categories,
        pending.map(r => ({ index: r.row_index, merchant: r.merchant, direction: r.direction }))
      );
      for (const row of pending) {
        const cat = assigned.get(row.row_index);
        if (cat) update.run(cat, 'llm', row.id, userId);
      }
    } catch (err) {
      // Categorisation is a convenience; a failure leaves rows uncategorised.
      console.warn('[AI] Categorisation failed:', err instanceof Error ? err.message : err);
    }
  }

  private runValidation(
    userId: string,
    accountId: string,
    accountCurrency: string,
    extraction: Extraction,
    sourceText: string | null,
    userEdited: Set<number>,
    batchId: string
  ): ValidationResult {
    const ownPostings = new Set(
      (this.db.prepare(`SELECT transaction_id FROM ai_import_rows WHERE batch_id = ? AND transaction_id IS NOT NULL`).all(batchId) as any[]).map(r => r.transaction_id)
    );
    return validateExtraction(extraction, {
      today: todayIso(this.now()),
      accountCurrency,
      sourceText,
      userEditedIndices: userEdited,
      isLedgerDuplicate: row => {
        const dup = this.finance.checkDuplicate(userId, accountId, row.date, row.amount, row.merchant);
        if (!dup) return false;
        const type = row.direction === 'credit' ? 'income' : 'expense';
        return dup.existingTransactions.some((t: any) => t.type === type && !ownPostings.has(t.id));
      },
    });
  }

  /**
   * Re-runs validation for a batch from stored proposals plus user edits.
   * Posted and skipped rows still count towards reconciliation; removed rows do not.
   */
  private revalidate(userId: string, batchId: string): ValidationResult {
    const batch = this.db.prepare(`SELECT * FROM ai_import_batches WHERE id = ? AND user_id = ?`).get(batchId, userId) as any;
    if (!batch) throw new Error('Forbidden: import batch not found');
    const account = this.finance.getAccountById(batch.account_id, userId);
    if (!account) throw new Error('Forbidden: target account not found');

    const rows = this.db.prepare(
      `SELECT * FROM ai_import_rows WHERE batch_id = ? AND user_id = ? AND status != 'removed' ORDER BY row_index`
    ).all(batchId, userId) as any[];

    const fmt = (v: number | null) => (v === null ? null : minorToDecimalString(v, batch.currency));
    const extraction: Extraction = {
      document_type: batch.source_kind,
      currency: batch.currency,
      period_start: batch.period_start,
      period_end: batch.period_end,
      opening_balance: fmt(batch.opening_balance),
      closing_balance: fmt(batch.closing_balance),
      stated_total: fmt(batch.stated_total),
      rows: rows.map(r => JSON.parse(r.raw_json) as ExtractedRow),
    };
    const edited = new Set<number>(rows.flatMap((r, i) => (r.user_edited ? [i] : [])));
    const result = this.runValidation(userId, batch.account_id, account.currency || 'INR', extraction, batch.source_text, edited, batchId);

    const update = this.db.prepare(`
      UPDATE ai_import_rows SET date = ?, amount = ?, direction = ?, merchant = ?, balance_after = ?, status = ?, reasons = ?
      WHERE id = ? AND user_id = ?
    `);
    result.rows.forEach((v, i) => {
      const stored = rows[i];
      if (stored.status === 'posted' || stored.status === 'skipped') return;
      const status = v.status === 'review' && stored.approved && isApprovable(v.reasons) ? 'validated' : v.status;
      update.run(v.date, v.amount, v.direction, v.merchant, v.balanceAfter, status, JSON.stringify(v.reasons), stored.id, userId);
    });
    this.db.prepare(`UPDATE ai_import_batches SET reconciliation_status = ?, reconciliation_diff = ? WHERE id = ? AND user_id = ?`)
      .run(result.reconciliation.status, result.reconciliation.diff, batchId, userId);
    return result;
  }

  private getOwnedRow(userId: string, rowId: string) {
    const row = this.db.prepare(`SELECT * FROM ai_import_rows WHERE id = ? AND user_id = ?`).get(rowId, userId) as any;
    if (!row) throw new Error('Forbidden: import row not found');
    if (row.status === 'posted') throw new Error('Row has already been posted to the ledger');
    return row;
  }

  editRow(
    userId: string,
    rowId: string,
    patch: { date?: string; amount?: string; merchant?: string; direction?: 'debit' | 'credit'; categoryId?: string | null }
  ): ImportBatchView {
    const row = this.getOwnedRow(userId, rowId);
    const raw = JSON.parse(row.raw_json) as ExtractedRow;
    const next: ExtractedRow = {
      ...raw,
      date: patch.date ?? raw.date,
      amount: patch.amount ?? raw.amount,
      merchant: patch.merchant ?? raw.merchant,
      direction: patch.direction ?? raw.direction,
    };
    const fieldsChanged = JSON.stringify(next) !== JSON.stringify(raw);

    if (patch.categoryId !== undefined) {
      if (patch.categoryId !== null) {
        const { categories } = this.finance.getCategories(userId);
        if (!categories.some((c: any) => c.id === patch.categoryId)) throw new Error('Forbidden: category not found');
      }
      this.db.prepare(`UPDATE ai_import_rows SET category_id = ?, category_source = 'user' WHERE id = ? AND user_id = ?`)
        .run(patch.categoryId, rowId, userId);
    }
    if (fieldsChanged) {
      this.db.prepare(`UPDATE ai_import_rows SET raw_json = ?, user_edited = 1, approved = 0, status = 'review' WHERE id = ? AND user_id = ?`)
        .run(JSON.stringify(next), rowId, userId);
    }
    this.revalidate(userId, row.batch_id);
    return this.getBatch(userId, row.batch_id);
  }

  /** Acknowledge soft reasons (possible duplicate, no balance evidence). Hard reasons need an edit. */
  approveRow(userId: string, rowId: string): ImportBatchView {
    const row = this.getOwnedRow(userId, rowId);
    const reasons = JSON.parse(row.reasons) as ReasonCode[];
    if (!isApprovable(reasons)) {
      throw new Error('This row has blocking problems. Edit it so it matches the document before approving.');
    }
    this.db.prepare(`UPDATE ai_import_rows SET approved = 1 WHERE id = ? AND user_id = ?`).run(rowId, userId);
    this.revalidate(userId, row.batch_id);
    return this.getBatch(userId, row.batch_id);
  }

  /** skip: real row, but don't post it (e.g. already in ledger). remove: not in the document at all. */
  setRowExcluded(userId: string, rowId: string, mode: 'skip' | 'remove' | 'restore'): ImportBatchView {
    const row = this.getOwnedRow(userId, rowId);
    const status = mode === 'skip' ? 'skipped' : mode === 'remove' ? 'removed' : 'review';
    this.db.prepare(`UPDATE ai_import_rows SET status = ? WHERE id = ? AND user_id = ?`).run(status, rowId, userId);
    this.revalidate(userId, row.batch_id);
    return this.getBatch(userId, row.batch_id);
  }

  /** User adds a row the model missed. It is user-entered, so grounding is skipped, but reconciliation still applies. */
  addRow(userId: string, batchId: string, row: { date: string; amount: string; merchant: string; direction: 'debit' | 'credit' }): ImportBatchView {
    this.revalidate(userId, batchId); // ownership check
    const max = this.db.prepare(`SELECT COALESCE(MAX(row_index), -1) as m FROM ai_import_rows WHERE batch_id = ?`).get(batchId) as any;
    const raw: ExtractedRow = { ...row, balance_after: null };
    this.db.prepare(`
      INSERT INTO ai_import_rows (id, batch_id, user_id, row_index, raw_json, direction, merchant, status, reasons, user_edited)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'review', '[]', 1)
    `).run(newId('air'), batchId, userId, max.m + 1, JSON.stringify(raw), row.direction, row.merchant);
    this.revalidate(userId, batchId);
    return this.getBatch(userId, batchId);
  }

  /**
   * The only path from a proposal into the ledger. Re-validates the whole batch
   * immediately before posting so stale client state cannot post a row that no
   * longer passes.
   */
  confirm(userId: string, batchId: string, rowIds: string[]): { posted: number; refused: Array<{ rowId: string; reason: string }>; batch: ImportBatchView } {
    const validation = this.revalidate(userId, batchId);
    const batch = this.db.prepare(`SELECT * FROM ai_import_batches WHERE id = ? AND user_id = ?`).get(batchId, userId) as any;
    const { categories } = this.finance.getCategories(userId);
    const categoryIds = new Set(categories.map((c: any) => c.id));
    const refused: Array<{ rowId: string; reason: string }> = [];
    let posted = 0;

    for (const rowId of rowIds) {
      const row = this.db.prepare(`SELECT * FROM ai_import_rows WHERE id = ? AND batch_id = ? AND user_id = ?`).get(rowId, batchId, userId) as any;
      if (!row) {
        refused.push({ rowId, reason: 'Row not found in this import' });
        continue;
      }
      if (row.status !== 'validated' || row.amount === null || row.date === null) {
        refused.push({ rowId, reason: `Row is ${row.status}, not validated` });
        continue;
      }
      if (validation.reconciliation.status === 'mismatch' || validation.reconciliation.status === 'unverifiable') {
        refused.push({ rowId, reason: 'Statement does not reconcile' });
        continue;
      }

      const tx = this.finance.createTransaction({
        userId,
        accountId: batch.account_id,
        type: row.direction === 'credit' ? 'income' : 'expense',
        amount: row.amount,
        date: row.date,
        merchantName: row.merchant,
        categoryId: row.category_id && categoryIds.has(row.category_id) ? row.category_id : undefined,
        notes: `Imported via AI (${batch.source_kind})`,
      });
      this.db.prepare(`UPDATE ai_import_rows SET status = 'posted', transaction_id = ? WHERE id = ? AND user_id = ?`)
        .run(tx?.id ?? null, rowId, userId);
      posted++;
    }

    const open = this.db.prepare(`SELECT COUNT(*) as c FROM ai_import_rows WHERE batch_id = ? AND status IN ('validated', 'review')`).get(batchId) as any;
    if (open.c === 0) this.db.prepare(`UPDATE ai_import_batches SET status = 'completed' WHERE id = ? AND user_id = ?`).run(batchId, userId);
    return { posted, refused, batch: this.getBatch(userId, batchId) };
  }

  discardBatch(userId: string, batchId: string) {
    const res = this.db.prepare(`UPDATE ai_import_batches SET status = 'discarded' WHERE id = ? AND user_id = ?`).run(batchId, userId);
    if (!res.changes) throw new Error('Forbidden: import batch not found');
    this.db.prepare(`UPDATE ai_import_rows SET status = 'skipped' WHERE batch_id = ? AND user_id = ? AND status IN ('validated', 'review')`).run(batchId, userId);
  }

  listBatches(userId: string) {
    return this.db.prepare(`
      SELECT b.id, b.source_kind, b.file_name, b.status, b.reconciliation_status, b.created_at,
             SUM(CASE WHEN r.status = 'review' THEN 1 ELSE 0 END) as review_count,
             SUM(CASE WHEN r.status = 'validated' THEN 1 ELSE 0 END) as validated_count,
             SUM(CASE WHEN r.status = 'posted' THEN 1 ELSE 0 END) as posted_count
      FROM ai_import_batches b
      LEFT JOIN ai_import_rows r ON r.batch_id = b.id
      WHERE b.user_id = ? AND b.status != 'discarded'
      GROUP BY b.id
      ORDER BY b.created_at DESC
      LIMIT 20
    `).all(userId);
  }

  getBatch(userId: string, batchId: string): ImportBatchView {
    const b = this.db.prepare(`SELECT * FROM ai_import_batches WHERE id = ? AND user_id = ?`).get(batchId, userId) as any;
    if (!b) throw new Error('Forbidden: import batch not found');
    const rows = this.db.prepare(`SELECT * FROM ai_import_rows WHERE batch_id = ? AND user_id = ? ORDER BY row_index`).all(batchId, userId) as any[];
    return {
      id: b.id,
      accountId: b.account_id,
      sourceKind: b.source_kind,
      sourceFormat: b.source_format,
      fileName: b.file_name,
      provider: b.provider,
      model: b.model,
      currency: b.currency,
      openingBalance: b.opening_balance,
      closingBalance: b.closing_balance,
      statedTotal: b.stated_total,
      reconciliation: { status: b.reconciliation_status, diff: b.reconciliation_diff },
      status: b.status,
      createdAt: b.created_at,
      rows: rows.map(r => {
        const reasons = JSON.parse(r.reasons) as ReasonCode[];
        return {
          id: r.id,
          index: r.row_index,
          date: r.date,
          amount: r.amount,
          direction: r.direction,
          merchant: r.merchant,
          balanceAfter: r.balance_after,
          categoryId: r.category_id,
          categorySource: r.category_source,
          status: r.status,
          reasons: reasons.map(code => ({ code, label: REASON_LABELS[code], soft: SOFT_REASONS.has(code) })),
          approvable: r.status === 'review' && !r.approved && isApprovable(reasons),
          transactionId: r.transaction_id,
        };
      }),
    };
  }
}

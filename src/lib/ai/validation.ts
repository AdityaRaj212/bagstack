import { getCurrencyDecimals } from '../money';
import { ExtractionSchema, type Extraction, type ExtractedRow } from './schemas';

/**
 * Deterministic validation of LLM extractions.
 *
 * Nothing in here calls a model or uses floating point. Every row either passes
 * every check (status 'validated') or lands in the review queue with the reason
 * codes that blocked it. Only 'validated' rows may be posted, and only after the
 * user confirms them.
 */

export type ReasonCode =
  // Hard: row cannot be posted until the user edits it
  | 'amount_unparseable'
  | 'amount_precision'
  | 'amount_nonpositive'
  | 'amount_not_in_source'
  | 'date_invalid'
  | 'date_future'
  | 'date_too_old'
  | 'date_not_in_source'
  | 'merchant_missing'
  | 'balance_chain_break'
  | 'statement_unreconciled'
  | 'currency_mismatch'
  // Soft: user may approve as-is after looking at it
  | 'date_outside_period'
  | 'duplicate_in_batch'
  | 'duplicate_in_ledger'
  | 'no_balance_evidence';

export const SOFT_REASONS: ReadonlySet<ReasonCode> = new Set<ReasonCode>([
  'date_outside_period',
  'duplicate_in_batch',
  'duplicate_in_ledger',
  'no_balance_evidence',
]);

export const REASON_LABELS: Record<ReasonCode, string> = {
  amount_unparseable: 'Amount is not a valid decimal number',
  amount_precision: 'Amount has more decimal places than the currency allows',
  amount_nonpositive: 'Amount must be greater than zero',
  amount_not_in_source: 'Amount does not appear in the source document',
  date_invalid: 'Date is not a valid calendar date',
  date_future: 'Date is in the future',
  date_too_old: 'Date is more than 10 years old',
  date_not_in_source: 'Date does not appear in the source document',
  merchant_missing: 'Merchant / narration is empty',
  balance_chain_break: 'Running balance on this row does not follow from the previous row',
  statement_unreconciled: 'Statement does not reconcile (opening + transactions ≠ closing)',
  currency_mismatch: 'Document currency differs from the target account currency',
  date_outside_period: 'Date falls outside the statement period',
  duplicate_in_batch: 'Same date, amount and merchant appears earlier in this document',
  duplicate_in_ledger: 'A matching transaction already exists in this account',
  no_balance_evidence: 'Document has no balances to verify this row against',
};

export type ReconciliationStatus = 'balanced' | 'mismatch' | 'unverifiable' | 'not_provided';

export interface ValidatedRow {
  index: number;
  raw: ExtractedRow;
  date: string | null;
  amount: number | null; // positive minor units
  direction: 'debit' | 'credit';
  merchant: string;
  balanceAfter: number | null;
  reasons: ReasonCode[];
  status: 'validated' | 'review';
}

export interface ValidationResult {
  currency: string;
  openingBalance: number | null;
  closingBalance: number | null;
  statedTotal: number | null;
  reconciliation: { status: ReconciliationStatus; diff: number | null };
  rows: ValidatedRow[];
}

export interface ValidationContext {
  today: string; // YYYY-MM-DD, injected for determinism
  accountCurrency: string;
  /** Raw document text, when the source was text. Enables grounding checks. */
  sourceText?: string | null;
  /** Indian statements print DD/MM/YYYY; used when matching dates against source text. */
  dayFirst?: boolean;
  /** Returns true when the ledger already holds an equivalent posting. */
  isLedgerDuplicate?: (row: { date: string; amount: number; direction: 'debit' | 'credit'; merchant: string }) => boolean;
  /** Row indices whose fields were typed by the user; source grounding is skipped for them. */
  userEditedIndices?: ReadonlySet<number>;
}

// --- Amounts ---------------------------------------------------------------

export type ParsedAmount = { ok: true; value: number } | { ok: false; reason: 'amount_unparseable' | 'amount_precision' };

const PLAIN_DECIMAL = /^\d+(\.\d+)?$/;
// Western (1,234,567.89) and Indian (12,34,567.89) digit grouping
const GROUPED_DECIMAL = /^\d{1,3}(,\d{3})+(\.\d+)?$|^\d{1,2}(,\d{2})*,\d{3}(\.\d+)?$/;

/**
 * Parses a decimal string into integer minor units using only string and BigInt
 * arithmetic. Excess precision is rejected rather than silently rounded.
 */
export function parseDecimalToMinor(input: string, currency = 'INR', allowNegative = false): ParsedAmount {
  let s = (input ?? '').trim();
  let negative = false;
  if (s.startsWith('-')) {
    if (!allowNegative) return { ok: false, reason: 'amount_unparseable' };
    negative = true;
    s = s.slice(1).trim();
  }
  if (!PLAIN_DECIMAL.test(s) && !GROUPED_DECIMAL.test(s)) return { ok: false, reason: 'amount_unparseable' };
  s = s.replace(/,/g, '');

  const decimals = getCurrencyDecimals(currency);
  const [whole, fraction = ''] = s.split('.');
  // Trailing zeros beyond the currency precision are harmless ("12.500" is 12.50)
  const trimmedFraction = fraction.replace(/0+$/, '');
  if (trimmedFraction.length > decimals) return { ok: false, reason: 'amount_precision' };

  const minor = BigInt(whole + trimmedFraction.padEnd(decimals, '0'));
  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) return { ok: false, reason: 'amount_unparseable' };
  const value = Number(minor);
  return { ok: true, value: negative ? -value : value };
}

/** Inverse of parseDecimalToMinor, using integer/string operations only. */
export function minorToDecimalString(minor: number, currency = 'INR'): string {
  const decimals = getCurrencyDecimals(currency);
  const digits = String(Math.abs(Math.trunc(minor))).padStart(decimals + 1, '0');
  const whole = decimals > 0 ? digits.slice(0, -decimals) : digits;
  const fraction = decimals > 0 ? `.${digits.slice(-decimals)}` : '';
  return `${minor < 0 ? '-' : ''}${whole}${fraction}`;
}

/** Every number printed in the document, as minor units. Used to ground model output in the source. */
export function collectSourceAmounts(text: string, currency = 'INR'): Set<number> {
  const found = new Set<number>();
  const tokens = text.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
  for (const token of tokens) {
    // In CSV a comma may be a field delimiter or a thousands separator, so try
    // every contiguous run of comma-separated pieces ("26,450.00" -> 26, 450.00, 26,450.00).
    const pieces = token.split(',');
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i; j < pieces.length; j++) {
        const candidate = pieces.slice(i, j + 1).join(',');
        if (!candidate) continue;
        const parsed = parseDecimalToMinor(candidate, currency);
        if (parsed.ok) found.add(parsed.value);
      }
    }
  }
  return found;
}

// --- Dates -----------------------------------------------------------------

export function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function shiftYears(iso: string, years: number): string {
  const [y, m, d] = iso.split('-');
  return `${Number(y) + years}-${m}-${d}`;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Renderings of an ISO date as it might be printed on a statement or receipt. */
export function dateRenderings(iso: string, dayFirst = true): string[] {
  const [y, m, d] = iso.split('-');
  const yy = y.slice(2);
  const dn = String(Number(d));
  const mn = String(Number(m));
  const mon = MONTHS[Number(m) - 1];
  const out = [iso, `${y}/${m}/${d}`, `${d} ${mon} ${y}`, `${d}-${mon}-${y}`, `${d} ${mon} ${yy}`, `${d}-${mon}-${yy}`, `${dn} ${mon} ${y}`, `${mon} ${d}, ${y}`, `${mon} ${dn}, ${y}`];
  for (const sep of ['/', '-', '.']) {
    if (dayFirst) {
      out.push(`${d}${sep}${m}${sep}${y}`, `${d}${sep}${m}${sep}${yy}`, `${dn}${sep}${mn}${sep}${y}`);
    } else {
      out.push(`${m}${sep}${d}${sep}${y}`, `${m}${sep}${d}${sep}${yy}`, `${mn}${sep}${dn}${sep}${y}`);
    }
  }
  return out;
}

function dateInSource(iso: string, sourceLower: string, dayFirst: boolean): boolean {
  return dateRenderings(iso, dayFirst).some(r => {
    const needle = r.toLowerCase();
    let idx = sourceLower.indexOf(needle);
    while (idx !== -1) {
      // Reject partial matches such as "01/02/2026" inside "11/02/2026"
      const before = sourceLower[idx - 1];
      const after = sourceLower[idx + needle.length];
      if (!(before && /\d/.test(before)) && !(after && /\d/.test(after))) return true;
      idx = sourceLower.indexOf(needle, idx + 1);
    }
    return false;
  });
}

// --- Main entry point ------------------------------------------------------

function normalizeMerchant(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function signed(row: ValidatedRow): number {
  return row.direction === 'credit' ? (row.amount as number) : -(row.amount as number);
}

/**
 * Checks each row's printed running balance against the previous one. Statements
 * are printed oldest-first or newest-first, so both orders are tried and the one
 * with fewer breaks wins. Returns per-row verdicts (true = verified, false = break,
 * null = no evidence).
 */
function checkBalanceChain(rows: ValidatedRow[], opening: number | null): (boolean | null)[] {
  const evaluate = (order: number[], startBalance: number | null) => {
    const verdict: (boolean | null)[] = rows.map(() => null);
    let prev = startBalance;
    for (const i of order) {
      const row = rows[i];
      if (row.balanceAfter === null || row.amount === null) {
        prev = null;
        continue;
      }
      if (prev !== null) verdict[i] = prev + signed(row) === row.balanceAfter;
      prev = row.balanceAfter;
    }
    return verdict;
  };

  const forward = rows.map((_, i) => i);
  const fwd = evaluate(forward, opening);
  const rev = evaluate([...forward].reverse(), opening);
  const breaks = (v: (boolean | null)[]) => v.filter(x => x === false).length;
  return breaks(rev) < breaks(fwd) ? rev : fwd;
}

export function validateExtraction(input: unknown, ctx: ValidationContext): ValidationResult {
  // Re-validate even though the provider claims schema conformance.
  const extraction: Extraction = ExtractionSchema.parse(input);
  const currency = (extraction.currency || ctx.accountCurrency).toUpperCase();
  const dayFirst = ctx.dayFirst ?? true;
  const sourceLower = ctx.sourceText ? ctx.sourceText.toLowerCase() : null;
  const sourceAmounts = ctx.sourceText ? collectSourceAmounts(ctx.sourceText, currency) : null;
  const oldest = shiftYears(ctx.today, -10);
  const edited = ctx.userEditedIndices ?? new Set<number>();

  const periodStart = extraction.period_start && isValidIsoDate(extraction.period_start) ? extraction.period_start : null;
  const periodEnd = extraction.period_end && isValidIsoDate(extraction.period_end) ? extraction.period_end : null;

  const parseBalance = (v: string | null) => {
    if (v === null || v.trim() === '') return { value: null, bad: false };
    const p = parseDecimalToMinor(v, currency, true);
    return p.ok ? { value: p.value, bad: false } : { value: null, bad: true };
  };
  const opening = parseBalance(extraction.opening_balance);
  const closing = parseBalance(extraction.closing_balance);
  const stated = parseBalance(extraction.stated_total);

  const rows: ValidatedRow[] = extraction.rows.map((raw, index) => {
    const reasons: ReasonCode[] = [];
    const grounded = !edited.has(index);

    let amount: number | null = null;
    const parsed = parseDecimalToMinor(raw.amount, currency);
    if (!parsed.ok) reasons.push(parsed.reason);
    else if (parsed.value <= 0) reasons.push('amount_nonpositive');
    else {
      amount = parsed.value;
      if (grounded && sourceAmounts && !sourceAmounts.has(amount)) reasons.push('amount_not_in_source');
    }

    let date: string | null = null;
    if (!isValidIsoDate(raw.date)) reasons.push('date_invalid');
    else {
      date = raw.date;
      if (date > ctx.today) reasons.push('date_future');
      if (date < oldest) reasons.push('date_too_old');
      if ((periodStart && date < periodStart) || (periodEnd && date > periodEnd)) reasons.push('date_outside_period');
      if (grounded && sourceLower && !dateInSource(date, sourceLower, dayFirst)) reasons.push('date_not_in_source');
    }

    const merchant = raw.merchant.trim();
    if (!merchant) reasons.push('merchant_missing');

    let balanceAfter: number | null = null;
    if (raw.balance_after !== null) {
      const b = parseDecimalToMinor(raw.balance_after, currency, true);
      if (b.ok) balanceAfter = b.value;
    }

    if (currency !== ctx.accountCurrency.toUpperCase()) reasons.push('currency_mismatch');

    return { index, raw, date, amount, direction: raw.direction, merchant, balanceAfter, reasons, status: 'review' };
  });

  // --- Reconciliation ---
  const anyUnparsed = rows.some(r => r.amount === null);
  const net = anyUnparsed ? null : rows.reduce((acc, r) => acc + signed(r), 0);
  let status: ReconciliationStatus = 'not_provided';
  let diff: number | null = null;

  if (opening.value !== null && closing.value !== null) {
    if (net === null) status = 'unverifiable';
    else {
      diff = closing.value - (opening.value + net);
      status = diff === 0 ? 'balanced' : 'mismatch';
    }
  } else if (stated.value !== null) {
    if (net === null) status = 'unverifiable';
    else {
      // Receipts: stated total equals money out minus refunds
      diff = stated.value - -net;
      status = diff === 0 ? 'balanced' : 'mismatch';
    }
  }
  if (opening.bad || closing.bad || stated.bad) status = 'unverifiable';

  const chain = checkBalanceChain(rows, opening.value);
  rows.forEach((row, i) => {
    if (chain[i] === false) row.reasons.push('balance_chain_break');
    if (status === 'mismatch' || status === 'unverifiable') row.reasons.push('statement_unreconciled');
    else if (status === 'not_provided' && chain[i] !== true) row.reasons.push('no_balance_evidence');
  });

  // --- Duplicates ---
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.date === null || row.amount === null) continue;
    const key = `${row.date}|${row.amount}|${row.direction}|${normalizeMerchant(row.merchant)}`;
    if (seen.has(key)) row.reasons.push('duplicate_in_batch');
    seen.add(key);
    if (ctx.isLedgerDuplicate?.({ date: row.date, amount: row.amount, direction: row.direction, merchant: row.merchant })) {
      row.reasons.push('duplicate_in_ledger');
    }
  }

  for (const row of rows) {
    row.reasons = [...new Set(row.reasons)];
    row.status = row.reasons.length === 0 ? 'validated' : 'review';
  }

  return {
    currency,
    openingBalance: opening.value,
    closingBalance: closing.value,
    statedTotal: stated.value,
    reconciliation: { status, diff },
    rows,
  };
}

/** A review row can be approved without edits only when every blocking reason is soft. */
export function isApprovable(reasons: ReasonCode[]): boolean {
  return reasons.every(r => SOFT_REASONS.has(r));
}

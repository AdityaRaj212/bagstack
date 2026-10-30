'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatDateDMY } from '@/lib/date';
import { minorToDecimalString } from '@/lib/ai/validation';
import {
  Sparkles,
  Send,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Check,
  Pencil,
  SkipForward,
  Trash2,
  Undo2,
  ShieldCheck,
  FileText,
} from 'lucide-react';

type Status = 'validated' | 'review' | 'posted' | 'skipped' | 'removed';
interface Row {
  id: string;
  date: string | null;
  amount: number | null;
  direction: 'debit' | 'credit';
  merchant: string;
  balanceAfter: number | null;
  categoryId: string | null;
  categorySource: string | null;
  status: Status;
  reasons: Array<{ code: string; label: string; soft: boolean }>;
  approvable: boolean;
}
interface Batch {
  id: string;
  sourceKind: 'statement' | 'receipt';
  provider: string;
  model: string;
  currency: string;
  openingBalance: number | null;
  closingBalance: number | null;
  reconciliation: { status: 'balanced' | 'mismatch' | 'unverifiable' | 'not_provided'; diff: number | null };
  status: string;
  rows: Row[];
}

const PROVIDER_LABELS: Record<string, string> = { gemini: 'Gemini', anthropic: 'Claude' };

const EXAMPLE_QUESTIONS = [
  'How much did I spend on food last month?',
  'Who were my top 5 merchants this month?',
  'Compare my spending this month vs last month',
  "What's my total balance right now?",
];

// Synthetic demo documents so the sandbox can be tried without a real statement
const SAMPLE_STATEMENT = `DEMO BANK - SAVINGS ACCOUNT STATEMENT
Statement Period: 01/05/2026 to 31/05/2026
Opening Balance: 42,180.00

Date        Description                                   Withdrawals      Deposits         Balance
----------------------------------------------------------------------------------------------------
01/05/2026  NEFT CR-SALARY ACME TECHNOLOGIES                             95,000.00     1,37,180.00
03/05/2026  UPI-HOUSE RENT NOBROKER-412398712311          28,000.00                    1,09,180.00
06/05/2026  UPI-SWIGGY-512398712399                           486.50                   1,08,693.50
09/05/2026  UPI-BIGBASKET-612398712377                      2,341.20                   1,06,352.30
14/05/2026  UPI-UBER INDIA-712398712344                       312.00                   1,06,040.30
18/05/2026  UPI-NETFLIX-812398712322                          649.00                   1,05,391.30
22/05/2026  UPI-APOLLO PHARMACY-912398712300                  918.75                   1,04,472.55
27/05/2026  UPI-ZERODHA SIP-112398712388                   10,000.00                      94,472.55
----------------------------------------------------------------------------------------------------
Closing Balance: 94,472.55`;

// Same statement with a misprinted closing balance: nothing may post until it is fixed
const SAMPLE_TAMPERED = SAMPLE_STATEMENT.replace('Closing Balance: 94,472.55', 'Closing Balance: 95,472.55');

const SAMPLE_RECEIPT = `CAFE MOCHA INDIRANAGAR
12th Main, Indiranagar, Bengaluru
GSTIN: 29ABCDE4529F1Z5
Bill No: 6099    Date: 02/06/2026    Time: 20:24
----------------------------------------
Cappuccino x2                     360.00
Veg Club Sandwich x1              260.00
----------------------------------------
Sub Total                         620.00
CGST 2.5%                          15.50
SGST 2.5%                          15.50
Grand Total                       651.00
Paid via UPI`;

const RECON_COPY: Record<Batch['reconciliation']['status'], { icon: React.ElementType; color: string; bg: string; text: string }> = {
  balanced: { icon: CheckCircle2, color: 'var(--color-income)', bg: 'var(--color-income-subtle)', text: 'Reconciled: opening balance + transactions = closing balance.' },
  mismatch: { icon: XCircle, color: 'var(--color-expense)', bg: 'var(--color-expense-subtle)', text: 'Does not reconcile. Nothing can be posted until the rows match the document.' },
  unverifiable: { icon: XCircle, color: 'var(--color-expense)', bg: 'var(--color-expense-subtle)', text: 'Could not verify: some amounts or balances failed to parse. Fix them to continue.' },
  not_provided: { icon: AlertTriangle, color: 'var(--color-warning)', bg: 'var(--color-warning-subtle)', text: 'No opening/closing balance printed. Rows are checked against running balances where available.' },
};

const STATUS_STYLE: Record<Status, { label: string; color: string; bg: string }> = {
  validated: { label: 'Validated', color: 'var(--color-income)', bg: 'var(--color-income-subtle)' },
  review: { label: 'Review', color: 'var(--color-warning)', bg: 'var(--color-warning-subtle)' },
  posted: { label: 'Posted', color: 'var(--brand-primary)', bg: 'var(--brand-light)' },
  skipped: { label: 'Skipped', color: 'var(--text-muted)', bg: 'var(--bg-subtle)' },
  removed: { label: 'Removed', color: 'var(--text-muted)', bg: 'var(--bg-subtle)' },
};

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function readFileAs(file: File, mode: 'text' | 'base64'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(mode === 'text' ? result : result.substring(result.indexOf(',') + 1));
    };
    if (mode === 'text') reader.readAsText(file);
    else reader.readAsDataURL(file);
  });
}

export default function AssistantPage() {
  const { showToast, triggerRefresh } = useApp();
  const [status, setStatus] = useState<{ provider: string; model: string; supportsBinaryInput: boolean } | null>(null);

  // Ask
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<{ ok: boolean; answer: string; tool?: string | null; args?: unknown } | null>(null);

  // Import
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accountId, setAccountId] = useState('');
  const [kind, setKind] = useState<'statement' | 'receipt'>('statement');
  const [pasted, setPasted] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; date: string; amount: string; merchant: string; direction: 'debit' | 'credit' } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetch('/api/ai/ask').then(r => r.json()).then(d => !d.error && setStatus(d)).catch(() => {});
    fetch('/api/accounts').then(r => r.json()).then(d => {
      const list = (d.accounts || []).filter((a: any) => !a.archived);
      setAccounts(list);
      if (list.length) setAccountId((list.find((a: any) => a.is_default) || list[0]).id);
    });
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(d.categories || []));
  }, []);

  const validatedRows = useMemo(() => batch?.rows.filter(r => r.status === 'validated') ?? [], [batch]);
  const counts = useMemo(() => {
    const c: Record<Status, number> = { validated: 0, review: 0, posted: 0, skipped: 0, removed: 0 };
    batch?.rows.forEach(r => c[r.status]++);
    return c;
  }, [batch]);

  const ask = async (q: string) => {
    if (!q.trim()) return;
    setQuestion(q);
    setAsking(true);
    try {
      setAnswer(await postJson('/api/ai/ask', { question: q }));
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setAsking(false);
    }
  };

  const extract = async (override?: { text: string; kind: 'statement' | 'receipt' }) => {
    if (!accountId) return showToast('Create an account first', 'error');
    setExtracting(true);
    setBatch(null);
    try {
      const k = override?.kind ?? kind;
      let payload: Record<string, unknown>;
      if (override) payload = { format: 'text', text: override.text };
      else if (file) {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const isImage = file.type.startsWith('image/');
        if (isPdf) payload = { format: 'pdf', base64: await readFileAs(file, 'base64') };
        else if (isImage) payload = { format: 'image', mediaType: file.type, base64: await readFileAs(file, 'base64') };
        else payload = { format: 'text', text: await readFileAs(file, 'text') };
        payload.fileName = file.name;
      } else if (pasted.trim()) payload = { format: 'text', text: pasted };
      else {
        setExtracting(false);
        return showToast('Upload a file or paste statement text', 'error');
      }
      const data = await postJson('/api/ai/import', { action: 'extract', accountId, kind: k, ...payload });
      setBatch(data.batch);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setExtracting(false);
    }
  };

  const rowAction = async (rowId: string, body: Record<string, unknown>) => {
    setBusyRow(rowId);
    try {
      const data = await postJson('/api/ai/import', { rowId, ...body });
      setBatch(data.batch);
      setEditing(null);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setBusyRow(null);
    }
  };

  const confirmPost = async () => {
    if (!batch) return;
    setPosting(true);
    try {
      const data = await postJson('/api/ai/import', { action: 'confirm', batchId: batch.id, rowIds: validatedRows.map(r => r.id) });
      setBatch(data.batch);
      showToast(`Posted ${data.posted} transaction${data.posted === 1 ? '' : 's'}${data.refused.length ? `, ${data.refused.length} refused` : ''}`, data.refused.length ? 'info' : 'success');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setPosting(false);
      setConfirmOpen(false);
    }
  };

  const currency = batch?.currency || 'INR';
  const recon = batch ? RECON_COPY[batch.reconciliation.status] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={22} style={{ color: 'var(--brand-primary)' }} /> AI Assistant
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            The model proposes; deterministic checks decide. Nothing reaches your ledger without validation and your confirmation.
          </p>
        </div>
        {status && (
          <span className="badge badge-neutral" title="Active model provider">
            {status.provider === 'offline' ? 'Offline rules engine (no API key)' : `${PROVIDER_LABELS[status.provider] ?? status.provider} · ${status.model}`}
          </span>
        )}
      </div>

      {/* Ask */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ fontWeight: 600 }}>Ask about your money</div>
        <form
          onSubmit={e => {
            e.preventDefault();
            ask(question);
          }}
          style={{ display: 'flex', gap: '0.5rem' }}
        >
          <input
            className="form-input"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="How much did I spend on food last month?"
            maxLength={500}
            style={{ flex: 1 }}
          />
          <button className="btn-primary" type="submit" disabled={asking || !question.trim()}>
            {asking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Ask
          </button>
        </form>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {EXAMPLE_QUESTIONS.map(q => (
            <button key={q} className="tag-chip" style={{ cursor: 'pointer' }} onClick={() => ask(q)} disabled={asking}>
              {q}
            </button>
          ))}
        </div>
        {answer && (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-default)',
              transition: 'opacity var(--transition-normal)',
            }}
          >
            <div style={{ fontSize: '0.95rem', color: answer.ok ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{answer.answer}</div>
            {answer.ok && answer.tool && (
              <div style={{ marginTop: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                query: {answer.tool}({JSON.stringify(answer.args)})
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontWeight: 600 }}>Import a statement or receipt</div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button className="btn-ghost" disabled={extracting} onClick={() => extract({ text: SAMPLE_STATEMENT, kind: 'statement' })}>
              <FileText size={14} /> Try sample statement
            </button>
            <button className="btn-ghost" disabled={extracting} onClick={() => extract({ text: SAMPLE_TAMPERED, kind: 'statement' })}>
              <AlertTriangle size={14} /> Try tampered statement
            </button>
            <button className="btn-ghost" disabled={extracting} onClick={() => extract({ text: SAMPLE_RECEIPT, kind: 'receipt' })}>
              <FileText size={14} /> Try sample receipt
            </button>
          </div>
        </div>

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <div className="form-group">
            <label className="form-label">Post into account</label>
            <select className="form-select" value={accountId} onChange={e => setAccountId(e.target.value)}>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Document type</label>
            <select className="form-select" value={kind} onChange={e => setKind(e.target.value as 'statement' | 'receipt')}>
              <option value="statement">Bank statement</option>
              <option value="receipt">Receipt</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">File (CSV, TXT{status?.supportsBinaryInput ? ', PDF, image' : ''})</label>
            <input
              className="form-input"
              type="file"
              accept={status?.supportsBinaryInput ? '.csv,.txt,.pdf,image/*' : '.csv,.txt'}
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <textarea
          className="form-input"
          rows={4}
          value={pasted}
          onChange={e => setPasted(e.target.value)}
          placeholder="…or paste statement / receipt text here"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', resize: 'vertical' }}
        />
        <div>
          <button className="btn-primary" onClick={() => extract()} disabled={extracting}>
            {extracting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {extracting ? 'Reading document…' : 'Extract transactions'}
          </button>
        </div>
      </div>

      {/* Review queue */}
      {batch && recon && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn var(--transition-normal)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', backgroundColor: recon.bg, color: recon.color }}>
            <recon.icon size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 600 }}>{recon.text}</div>
              {batch.openingBalance !== null && batch.closingBalance !== null && (
                <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                  Opening <MoneyDisplay amount={batch.openingBalance} currency={currency} size="xs" /> · Closing{' '}
                  <MoneyDisplay amount={batch.closingBalance} currency={currency} size="xs" />
                  {batch.reconciliation.diff ? (
                    <> · Off by <MoneyDisplay amount={batch.reconciliation.diff} currency={currency} size="xs" /></>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {counts.validated} validated · {counts.review} in review · {counts.posted} posted · read by {batch.provider === 'offline' ? 'offline rules' : batch.model}
            </div>
            <button className="btn-primary" disabled={validatedRows.length === 0 || posting} onClick={() => setConfirmOpen(true)}>
              <ShieldCheck size={16} /> Post {validatedRows.length} validated row{validatedRows.length === 1 ? '' : 's'}
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.5rem' }}>Status</th>
                  <th style={{ padding: '0.5rem' }}>Date</th>
                  <th style={{ padding: '0.5rem' }}>Merchant</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '0.5rem' }}>Category</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batch.rows.map(row => {
                  const st = STATUS_STYLE[row.status];
                  const isEditing = editing?.id === row.id;
                  const locked = row.status === 'posted';
                  const dim = row.status === 'skipped' || row.status === 'removed';
                  return (
                    <React.Fragment key={row.id}>
                      <tr style={{ borderTop: '1px solid var(--border-subtle)', opacity: busyRow === row.id ? 0.5 : dim ? 0.55 : 1, transition: 'opacity var(--transition-fast)' }}>
                        <td style={{ padding: '0.55rem 0.5rem' }}>
                          <span className="badge" style={{ color: st.color, backgroundColor: st.bg }}>{st.label}</span>
                        </td>
                        {isEditing ? (
                          <>
                            <td style={{ padding: '0.4rem' }}>
                              <input className="form-input" type="date" value={editing.date} onChange={e => setEditing({ ...editing, date: e.target.value })} />
                            </td>
                            <td style={{ padding: '0.4rem' }}>
                              <input className="form-input" value={editing.merchant} onChange={e => setEditing({ ...editing, merchant: e.target.value })} />
                            </td>
                            <td style={{ padding: '0.4rem' }}>
                              <div style={{ display: 'flex', gap: '0.3rem' }}>
                                <select className="form-select" value={editing.direction} onChange={e => setEditing({ ...editing, direction: e.target.value as 'debit' | 'credit' })}>
                                  <option value="debit">Out</option>
                                  <option value="credit">In</option>
                                </select>
                                <input className="form-input" inputMode="decimal" value={editing.amount} onChange={e => setEditing({ ...editing, amount: e.target.value })} style={{ width: 110 }} />
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '0.55rem 0.5rem', whiteSpace: 'nowrap' }}>{row.date ? formatDateDMY(row.date) : '—'}</td>
                            <td style={{ padding: '0.55rem 0.5rem', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.merchant}>
                              {row.merchant || '—'}
                            </td>
                            <td style={{ padding: '0.55rem 0.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {row.amount !== null ? (
                                <MoneyDisplay amount={row.direction === 'credit' ? row.amount : -row.amount} currency={currency} showSign colored size="sm" />
                              ) : (
                                <span style={{ color: 'var(--color-expense)' }}>unreadable</span>
                              )}
                            </td>
                          </>
                        )}
                        <td style={{ padding: '0.4rem' }}>
                          <select
                            className="form-select"
                            value={row.categoryId ?? ''}
                            disabled={locked || dim}
                            onChange={e => rowAction(row.id, { action: 'edit', categoryId: e.target.value || null })}
                            style={{ minWidth: 150 }}
                          >
                            <option value="">Uncategorized</option>
                            {categories
                              .filter(c => c.type === (row.direction === 'credit' ? 'income' : 'expense'))
                              .map(c => (
                                <option key={c.id} value={c.id}>{c.parent_id ? `— ${c.name}` : c.name}</option>
                              ))}
                          </select>
                          {row.categorySource === 'llm' && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>suggested by model</div>}
                        </td>
                        <td style={{ padding: '0.4rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {isEditing ? (
                            <>
                              <button className="btn-icon" title="Save and re-validate" onClick={() => rowAction(row.id, { action: 'edit', date: editing.date, amount: editing.amount, merchant: editing.merchant, direction: editing.direction })}>
                                <Check size={15} />
                              </button>
                              <button className="btn-icon" title="Cancel" onClick={() => setEditing(null)}>
                                <Undo2 size={15} />
                              </button>
                            </>
                          ) : locked ? null : dim ? (
                            <button className="btn-icon" title="Restore" onClick={() => rowAction(row.id, { action: 'restore' })}>
                              <Undo2 size={15} />
                            </button>
                          ) : (
                            <>
                              {row.approvable && (
                                <button className="btn-icon" title="Approve after checking" onClick={() => rowAction(row.id, { action: 'approve' })}>
                                  <Check size={15} />
                                </button>
                              )}
                              <button
                                className="btn-icon"
                                title="Edit to match the document"
                                onClick={() =>
                                  setEditing({ id: row.id, date: row.date ?? '', amount: row.amount !== null ? minorToDecimalString(row.amount, currency) : '', merchant: row.merchant, direction: row.direction })
                                }
                              >
                                <Pencil size={15} />
                              </button>
                              <button className="btn-icon" title="Skip (real row, don't post)" onClick={() => rowAction(row.id, { action: 'skip' })}>
                                <SkipForward size={15} />
                              </button>
                              <button className="btn-icon" title="Remove (not in the document)" onClick={() => rowAction(row.id, { action: 'remove' })}>
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                      {row.reasons.length > 0 && !dim && row.status !== 'posted' && (
                        <tr>
                          <td />
                          <td colSpan={5} style={{ padding: '0 0.5rem 0.55rem' }}>
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {row.reasons.map(r => (
                                <span
                                  key={r.code}
                                  style={{
                                    fontSize: '0.7rem',
                                    padding: '0.1rem 0.45rem',
                                    borderRadius: 'var(--radius-full)',
                                    color: r.soft ? 'var(--color-warning)' : 'var(--color-expense)',
                                    backgroundColor: r.soft ? 'var(--color-warning-subtle)' : 'var(--color-expense-subtle)',
                                  }}
                                >
                                  {r.label}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Post validated transactions?"
        message={`${validatedRows.length} row${validatedRows.length === 1 ? '' : 's'} passed every check and will be added to your ledger.`}
        details="Rows still in review stay in the queue. Each row is re-validated on the server immediately before posting."
        confirmText="Post to ledger"
        variant="info"
        isLoading={posting}
        onConfirm={confirmPost}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

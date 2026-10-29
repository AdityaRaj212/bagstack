import { describe, it, expect } from 'vitest';
import {
  parseDecimalToMinor,
  minorToDecimalString,
  validateExtraction,
  collectSourceAmounts,
  isApprovable,
} from '../src/lib/ai/validation';
import type { Extraction } from '../src/lib/ai/schemas';

const ctx = { today: '2026-06-15', accountCurrency: 'INR' };

function statement(rows: Extraction['rows'], extra: Partial<Extraction> = {}): Extraction {
  return {
    document_type: 'statement',
    currency: 'INR',
    period_start: null,
    period_end: null,
    opening_balance: null,
    closing_balance: null,
    stated_total: null,
    rows,
    ...extra,
  };
}

const row = (date: string, amount: string, direction: 'debit' | 'credit', balance_after: string | null = null, merchant = 'SWIGGY') => ({
  date,
  amount,
  direction,
  merchant,
  balance_after,
});

describe('parseDecimalToMinor', () => {
  it('parses decimal strings into integer minor units without float drift', () => {
    expect(parseDecimalToMinor('0.10')).toEqual({ ok: true, value: 10 });
    expect(parseDecimalToMinor('0.20')).toEqual({ ok: true, value: 20 });
    expect(parseDecimalToMinor('1245.5')).toEqual({ ok: true, value: 124550 });
    expect(parseDecimalToMinor('12.500')).toEqual({ ok: true, value: 1250 });
    expect(parseDecimalToMinor('100')).toEqual({ ok: true, value: 10000 });
  });

  it('accepts western and Indian digit grouping', () => {
    expect(parseDecimalToMinor('1,234,567.89')).toEqual({ ok: true, value: 123456789 });
    expect(parseDecimalToMinor('12,34,567.89')).toEqual({ ok: true, value: 123456789 });
  });

  it('rejects malformed input instead of guessing', () => {
    for (const bad of ['', 'abc', '1.2.3', '₹100', '1,23', '12,3456.00', '1e5', ' . ']) {
      expect(parseDecimalToMinor(bad).ok).toBe(false);
    }
  });

  it('rejects precision the currency cannot hold rather than rounding', () => {
    expect(parseDecimalToMinor('10.005')).toEqual({ ok: false, reason: 'amount_precision' });
    expect(parseDecimalToMinor('10.5', 'JPY')).toEqual({ ok: false, reason: 'amount_precision' });
    expect(parseDecimalToMinor('1050', 'JPY')).toEqual({ ok: true, value: 1050 });
  });

  it('only allows a sign where explicitly permitted (balances)', () => {
    expect(parseDecimalToMinor('-50.00').ok).toBe(false);
    expect(parseDecimalToMinor('-50.00', 'INR', true)).toEqual({ ok: true, value: -5000 });
  });

  it('round-trips through minorToDecimalString', () => {
    for (const v of [0, 5, 99, 100, 123456789, -4250]) {
      const back = parseDecimalToMinor(minorToDecimalString(v), 'INR', true);
      expect(back).toEqual({ ok: true, value: v });
    }
  });
});

describe('collectSourceAmounts', () => {
  it('finds amounts in CSV lines where commas are delimiters', () => {
    const found = collectSourceAmounts('05/05/26,UPI-SWIGGY,26,450.00,,"1,23,456.50"');
    expect(found.has(45000)).toBe(true);
    expect(found.has(12345650)).toBe(true);
  });
});

describe('validateExtraction', () => {
  it('validates a statement whose opening + rows = closing', () => {
    const res = validateExtraction(
      statement([row('2026-05-02', '100.00', 'debit', '900.00'), row('2026-05-03', '50.25', 'credit', '950.25')], {
        opening_balance: '1000.00',
        closing_balance: '950.25',
      }),
      ctx
    );
    expect(res.reconciliation).toEqual({ status: 'balanced', diff: 0 });
    expect(res.rows.map(r => r.status)).toEqual(['validated', 'validated']);
    expect(res.rows[1].amount).toBe(5025);
  });

  it('sends every row to review when the statement does not reconcile', () => {
    const res = validateExtraction(
      statement([row('2026-05-02', '100.00', 'debit'), row('2026-05-03', '50.00', 'debit')], {
        opening_balance: '1000.00',
        closing_balance: '800.00',
      }),
      ctx
    );
    expect(res.reconciliation).toEqual({ status: 'mismatch', diff: -5000 });
    expect(res.rows.every(r => r.status === 'review' && r.reasons.includes('statement_unreconciled'))).toBe(true);
  });

  it('marks reconciliation unverifiable when any amount fails to parse', () => {
    const res = validateExtraction(
      statement([row('2026-05-02', '1OO.00', 'debit'), row('2026-05-03', '50.00', 'debit')], {
        opening_balance: '1000.00',
        closing_balance: '850.00',
      }),
      ctx
    );
    expect(res.reconciliation.status).toBe('unverifiable');
    expect(res.rows[0].reasons).toContain('amount_unparseable');
    expect(res.rows[1].reasons).toContain('statement_unreconciled');
  });

  it('pinpoints the row whose running balance breaks the chain', () => {
    const res = validateExtraction(
      statement([
        row('2026-05-01', '100.00', 'credit', '1100.00'),
        row('2026-05-02', '200.00', 'debit', '900.00'),
        row('2026-05-03', '30.00', 'debit', '880.00'), // should be 870.00
        row('2026-05-04', '10.00', 'debit', '870.00'),
      ]),
      ctx
    );
    expect(res.rows.map(r => r.reasons.includes('balance_chain_break'))).toEqual([false, false, true, false]);
    // First row has no prior balance to check against
    expect(res.rows[0].reasons).toEqual(['no_balance_evidence']);
    expect(res.rows[1].status).toBe('validated');
  });

  it('verifies newest-first statements by checking the chain in reverse', () => {
    const res = validateExtraction(
      statement([
        row('2026-05-04', '10.00', 'debit', '870.00'),
        row('2026-05-03', '20.00', 'debit', '880.00'),
        row('2026-05-02', '100.00', 'credit', '900.00'),
      ], { opening_balance: '800.00', closing_balance: '870.00' }),
      ctx
    );
    expect(res.reconciliation.status).toBe('balanced');
    expect(res.rows.every(r => r.status === 'validated')).toBe(true);
  });

  it('rejects amounts and dates that do not appear in the source text', () => {
    const source = 'Date,Narration,Debit\n02/05/2026,SWIGGY,450.00\n03/05/2026,UBER,120.00';
    const res = validateExtraction(
      statement([row('2026-05-02', '4500.00', 'debit'), row('2026-03-05', '120.00', 'debit')], {
        opening_balance: '1000.00',
        closing_balance: '-3620.00',
      }),
      { ...ctx, sourceText: source }
    );
    expect(res.rows[0].reasons).toContain('amount_not_in_source');
    // Day/month swapped by the model: 3 May printed, 5 March extracted
    expect(res.rows[1].reasons).toContain('date_not_in_source');
  });

  it('skips grounding for user-edited rows but still checks everything else', () => {
    const res = validateExtraction(statement([row('2026-05-02', '999.00', 'debit')]), {
      ...ctx,
      sourceText: 'nothing relevant',
      userEditedIndices: new Set([0]),
    });
    expect(res.rows[0].reasons).toEqual(['no_balance_evidence']);
  });

  it('flags future, ancient and invalid dates', () => {
    const res = validateExtraction(
      statement([row('2026-07-01', '1.00', 'debit'), row('2010-01-01', '1.00', 'debit'), row('2026-02-30', '1.00', 'debit')]),
      ctx
    );
    expect(res.rows[0].reasons).toContain('date_future');
    expect(res.rows[1].reasons).toContain('date_too_old');
    expect(res.rows[2].reasons).toContain('date_invalid');
  });

  it('flags in-batch and ledger duplicates as soft review reasons', () => {
    const res = validateExtraction(
      statement([row('2026-05-02', '345.00', 'debit'), row('2026-05-02', '345.00', 'debit'), row('2026-05-04', '99.00', 'debit', null, 'NETFLIX')]),
      { ...ctx, isLedgerDuplicate: r => r.merchant === 'NETFLIX' }
    );
    expect(res.rows[1].reasons).toContain('duplicate_in_batch');
    expect(res.rows[2].reasons).toContain('duplicate_in_ledger');
    expect(isApprovable(res.rows[1].reasons)).toBe(true);
  });

  it('checks receipts against the printed total and the account currency', () => {
    const receipt = (amount: string, currency = 'INR'): Extraction => ({
      ...statement([row('2026-06-01', amount, 'debit', null, 'CAFE')]),
      document_type: 'receipt',
      currency,
      stated_total: '803.26',
    });
    expect(validateExtraction(receipt('803.26'), ctx).rows[0].status).toBe('validated');
    expect(validateExtraction(receipt('8032.60'), ctx).rows[0].reasons).toContain('statement_unreconciled');
    const usd = validateExtraction(receipt('803.26', 'USD'), ctx);
    expect(usd.rows[0].reasons).toContain('currency_mismatch');
    expect(isApprovable(usd.rows[0].reasons)).toBe(false);
  });

  it('re-validates the schema instead of trusting the provider', () => {
    expect(() => validateExtraction({ rows: [{ amount: 5 }] }, ctx)).toThrow();
  });
});

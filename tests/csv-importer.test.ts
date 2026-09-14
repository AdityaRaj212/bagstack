import { describe, it, expect } from 'vitest';
import { parseCsvContent, autoDetectColumnMapping, processCsvRows, normalizeDate } from '../src/lib/csv-importer';

describe('CSV Importer and Bank Statement Parser', () => {
  it('parses raw CSV text with quotes and commas properly', () => {
    const csv = `Date,Narration,Withdrawal Amt,Deposit Amt\n01/03/2026,"Swiggy, Food Order",850.00,\n02/03/2026,TechCorp Salary,,120000.00`;
    const { headers, rows } = parseCsvContent(csv);

    expect(headers).toEqual(['Date', 'Narration', 'Withdrawal Amt', 'Deposit Amt']);
    expect(rows.length).toBe(2);
    expect(rows[0]['Narration']).toBe('Swiggy, Food Order');
  });

  it('auto detects columns and processes debit/credit bank statements', () => {
    const csv = `Txn Date,Particulars,Debit,Credit\n03/03/2026,Amazon India,4999.00,\n05/03/2026,Interest Payout,,1500.00`;
    const { headers, rows } = parseCsvContent(csv);
    const mapping = autoDetectColumnMapping(headers);

    expect(mapping.dateColumn).toBe('Txn Date');
    expect(mapping.descriptionColumn).toBe('Particulars');
    expect(mapping.debitColumn).toBe('Debit');
    expect(mapping.creditColumn).toBe('Credit');

    const processed = processCsvRows(rows, mapping as any);
    expect(processed.length).toBe(2);

    expect(processed[0].type).toBe('expense');
    expect(processed[0].amount).toBe(499900); // minor units paise
    expect(processed[0].date).toBe('2026-03-03');

    expect(processed[1].type).toBe('income');
    expect(processed[1].amount).toBe(150000);
    expect(processed[1].date).toBe('2026-03-05');
  });

  it('normalizes various date formats safely', () => {
    expect(normalizeDate('2026-03-15')).toBe('2026-03-15');
    expect(normalizeDate('15/03/2026')).toBe('2026-03-15');
    expect(normalizeDate('05-04-2026')).toBe('2026-04-05');
  });
});

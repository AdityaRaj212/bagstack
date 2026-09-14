import { toMinorUnits } from './money';

export interface CsvColumnMapping {
  dateColumn: string;
  descriptionColumn: string;
  amountColumn?: string;
  debitColumn?: string;
  creditColumn?: string;
  categoryColumn?: string;
  typeColumn?: string;
}

export interface ParsedTransactionRow {
  date: string;
  description: string;
  amount: number; // minor units (paise)
  type: 'expense' | 'income';
  categorySuggested?: string;
  raw: Record<string, string>;
}

export function parseCsvContent(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Simple and robust CSV line splitter handling quotes
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 1 && !values[0]) continue;
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] || '';
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

export function autoDetectColumnMapping(headers: string[]): Partial<CsvColumnMapping> {
  const mapping: Partial<CsvColumnMapping> = {};
  const lower = headers.map(h => h.toLowerCase());

  // Date detection
  const dateIdx = lower.findIndex(h => h.includes('date') || h.includes('txn date') || h.includes('transaction date'));
  if (dateIdx !== -1) mapping.dateColumn = headers[dateIdx];

  // Description / Merchant
  const descIdx = lower.findIndex(h => h.includes('desc') || h.includes('merchant') || h.includes('narration') || h.includes('particulars') || h.includes('payee'));
  if (descIdx !== -1) mapping.descriptionColumn = headers[descIdx];

  // Debit / Credit separate columns
  const debitIdx = lower.findIndex(h => h.includes('debit') || h.includes('withdrawal') || h.includes('dr'));
  const creditIdx = lower.findIndex(h => h.includes('credit') || h.includes('deposit') || h.includes('cr'));

  if (debitIdx !== -1 && creditIdx !== -1) {
    mapping.debitColumn = headers[debitIdx];
    mapping.creditColumn = headers[creditIdx];
  } else {
    // Single amount column
    const amountIdx = lower.findIndex(h => h.includes('amount') || h.includes('amt') || h.includes('total') || h.includes('sum'));
    if (amountIdx !== -1) mapping.amountColumn = headers[amountIdx];
  }

  // Category
  const catIdx = lower.findIndex(h => h.includes('category') || h.includes('tag'));
  if (catIdx !== -1) mapping.categoryColumn = headers[catIdx];

  return mapping;
}

export function normalizeDate(dateStr: string): string {
  const trimmed = dateStr.trim();
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // MM/DD/YYYY or Date.parse
  const timestamp = Date.parse(trimmed);
  if (!isNaN(timestamp)) {
    return new Date(timestamp).toISOString().substring(0, 10);
  }

  return new Date().toISOString().substring(0, 10);
}

export function processCsvRows(
  rows: Record<string, string>[],
  mapping: CsvColumnMapping
): ParsedTransactionRow[] {
  const results: ParsedTransactionRow[] = [];

  for (const row of rows) {
    const rawDate = row[mapping.dateColumn] || '';
    const date = normalizeDate(rawDate);
    const description = row[mapping.descriptionColumn] || 'Unknown Transaction';

    let amount = 0;
    let type: 'expense' | 'income' = 'expense';

    if (mapping.debitColumn && mapping.creditColumn) {
      const debitVal = row[mapping.debitColumn] || '';
      const creditVal = row[mapping.creditColumn] || '';
      const debitNum = parseFloat(debitVal.replace(/[^0-9.-]/g, '')) || 0;
      const creditNum = parseFloat(creditVal.replace(/[^0-9.-]/g, '')) || 0;

      if (creditNum > 0) {
        type = 'income';
        amount = toMinorUnits(creditNum);
      } else {
        type = 'expense';
        amount = toMinorUnits(debitNum);
      }
    } else if (mapping.amountColumn) {
      const amtStr = row[mapping.amountColumn] || '0';
      const cleanAmt = amtStr.replace(/[^0-9.-]/g, '');
      const parsedNum = parseFloat(cleanAmt) || 0;

      if (parsedNum < 0 || amtStr.includes('Dr') || amtStr.toLowerCase().includes('debit')) {
        type = 'expense';
        amount = toMinorUnits(Math.abs(parsedNum));
      } else {
        type = parsedNum >= 0 ? 'income' : 'expense';
        amount = toMinorUnits(Math.abs(parsedNum));
      }
    }

    if (amount > 0) {
      results.push({
        date,
        description,
        amount,
        type,
        categorySuggested: mapping.categoryColumn ? row[mapping.categoryColumn] : undefined,
        raw: row,
      });
    }
  }

  return results;
}

import { NextResponse } from 'next/server';
import { getCurrentUser, handleApiError } from '@/lib/auth';
import { FinanceService } from '@/lib/finance-service';
import { parseCsvContent, autoDetectColumnMapping, processCsvRows, CsvColumnMapping } from '@/lib/csv-importer';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();

    // Mode 1: Parse CSV text and return preview + auto-detected mapping
    if (body.action === 'preview') {
      const csvText = body.csvText;
      if (!csvText) {
        return NextResponse.json({ error: 'csvText is required' }, { status: 400 });
      }

      const { headers, rows } = parseCsvContent(csvText);
      const suggestedMapping = autoDetectColumnMapping(headers);

      return NextResponse.json({
        headers,
        sampleRows: rows.slice(0, 5),
        totalRows: rows.length,
        suggestedMapping,
      });
    }

    // Mode 2: Execute Import
    if (body.action === 'execute') {
      const { csvText, mapping, accountId } = body;
      if (!csvText || !mapping || !accountId) {
        return NextResponse.json({ error: 'csvText, mapping, and accountId are required' }, { status: 400 });
      }

      const service = new FinanceService();
      const account = service.getAccountById(accountId, user.id);
      if (!account) {
        return NextResponse.json({ error: 'Target account not found' }, { status: 404 });
      }

      const { rows } = parseCsvContent(csvText);
      const parsedTransactions = processCsvRows(rows, mapping as CsvColumnMapping);

      let importedCount = 0;
      let duplicateCount = 0;

      for (const item of parsedTransactions) {
        // Duplicate check
        const dup = service.checkDuplicate(user.id, accountId, item.date, item.amount, item.description);
        if (dup && !body.importDuplicates) {
          duplicateCount++;
          continue;
        }

        // Suggest category if rule exists
        const suggestedCat = service.suggestCategory(user.id, item.description);

        service.createTransaction({
          userId: user.id,
          accountId,
          type: item.type,
          amount: item.amount,
          date: item.date,
          merchantName: item.description,
          categoryId: suggestedCat || undefined,
          notes: 'Imported via CSV',
        });

        importedCount++;
      }

      return NextResponse.json({
        success: true,
        importedCount,
        duplicateCount,
        totalParsed: parsedTransactions.length,
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use "preview" or "execute"' }, { status: 400 });
  } catch (error: any) {
    return handleApiError(error, 'Import failed');
  }
}

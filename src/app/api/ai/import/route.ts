import { NextResponse } from 'next/server';
import { getCurrentUser, handleApiError } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { rateLimiter } from '@/lib/rate-limiter';
import { AiImportService, checkDailyBudget, createProvider } from '@/lib/ai';
import type { ImportSource } from '@/lib/ai/import-service';

export const runtime = 'nodejs';
export const maxDuration = 120;

const MAX_BASE64_CHARS = 11_000_000; // ~8 MB file
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;

function service(userId: string) {
  const db = getDb();
  return new AiImportService(createProvider(db, userId), db);
}

export async function GET(req: Request) {
  try {
    const user = getCurrentUser(req);
    const batchId = new URL(req.url).searchParams.get('batchId');
    const svc = service(user.id);
    if (batchId) return NextResponse.json({ batch: svc.getBatch(user.id, batchId) });
    return NextResponse.json({ batches: svc.listBatches(user.id) });
  } catch (error: any) {
    return handleApiError(error, 'Failed to load imports');
  }
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();
    const svc = service(user.id);

    switch (body.action) {
      case 'extract': {
        const limit = rateLimiter.check(`ai:extract:${user.id}`, 10, 10 * 60_000);
        if (!limit.allowed) return NextResponse.json({ error: 'Too many imports. Please wait a few minutes.' }, { status: 429 });
        const budget = checkDailyBudget(getDb(), user.id);
        if (budget) return NextResponse.json({ error: budget }, { status: 429 });

        const kind = body.kind === 'receipt' ? 'receipt' : 'statement';
        let source: ImportSource;
        if (body.format === 'text') {
          if (typeof body.text !== 'string' || !body.text.trim()) return NextResponse.json({ error: 'text is required' }, { status: 400 });
          source = { format: 'text', text: body.text };
        } else if (body.format === 'pdf' || body.format === 'image') {
          if (typeof body.base64 !== 'string' || body.base64.length > MAX_BASE64_CHARS) {
            return NextResponse.json({ error: 'File missing or larger than 8 MB' }, { status: 400 });
          }
          if (body.format === 'pdf') source = { format: 'pdf', base64: body.base64 };
          else {
            if (!IMAGE_TYPES.includes(body.mediaType)) return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
            source = { format: 'image', base64: body.base64, mediaType: body.mediaType };
          }
        } else {
          return NextResponse.json({ error: 'format must be text, pdf or image' }, { status: 400 });
        }
        const batch = await svc.extract(user.id, {
          accountId: String(body.accountId || ''),
          kind,
          source,
          fileName: typeof body.fileName === 'string' ? body.fileName.slice(0, 200) : undefined,
        });
        return NextResponse.json({ batch });
      }
      case 'edit':
        return NextResponse.json({
          batch: svc.editRow(user.id, String(body.rowId), {
            date: typeof body.date === 'string' ? body.date : undefined,
            amount: typeof body.amount === 'string' ? body.amount : undefined,
            merchant: typeof body.merchant === 'string' ? body.merchant : undefined,
            direction: body.direction === 'debit' || body.direction === 'credit' ? body.direction : undefined,
            categoryId: body.categoryId === null || typeof body.categoryId === 'string' ? body.categoryId : undefined,
          }),
        });
      case 'approve':
        return NextResponse.json({ batch: svc.approveRow(user.id, String(body.rowId)) });
      case 'skip':
      case 'remove':
      case 'restore':
        return NextResponse.json({ batch: svc.setRowExcluded(user.id, String(body.rowId), body.action) });
      case 'add_row': {
        const direction = body.direction === 'credit' ? 'credit' : 'debit';
        return NextResponse.json({
          batch: svc.addRow(user.id, String(body.batchId), {
            date: String(body.date || ''),
            amount: String(body.amount || ''),
            merchant: String(body.merchant || ''),
            direction,
          }),
        });
      }
      case 'confirm': {
        const rowIds = Array.isArray(body.rowIds) ? body.rowIds.map(String).slice(0, 500) : [];
        return NextResponse.json(svc.confirm(user.id, String(body.batchId), rowIds));
      }
      case 'discard':
        svc.discardBatch(user.id, String(body.batchId));
        return NextResponse.json({ success: true });
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    return handleApiError(error, 'AI import failed');
  }
}

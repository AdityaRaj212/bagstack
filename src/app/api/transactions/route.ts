import { NextResponse } from 'next/server';
import { getCurrentUser, handleApiError } from '@/lib/auth';
import { FinanceService } from '@/lib/finance-service';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const user = getCurrentUser(req);
    const { searchParams } = new URL(req.url);

    const accountId = searchParams.get('accountId') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const type = searchParams.get('type') || undefined;
    const month = searchParams.get('month') || undefined;
    let startDate = searchParams.get('startDate') || undefined;
    let endDate = searchParams.get('endDate') || undefined;

    if (month && !startDate && !endDate) {
      startDate = `${month}-01`;
      endDate = `${month}-31`;
    }

    const search = searchParams.get('search') || undefined;
    const tag = searchParams.get('tag') || undefined;
    const limit = parseInt(searchParams.get('limit') || '200', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const service = new FinanceService();
    const transactions = service.getTransactions(user.id, {
      accountId,
      categoryId,
      type,
      startDate,
      endDate,
      search,
      tag,
      limit,
      offset,
    });

    return NextResponse.json({ transactions });
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch transactions');
  }
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();

    if (!body.accountId || !body.type || !body.amount || !body.date) {
      return NextResponse.json({ error: 'accountId, type, amount, and date are required' }, { status: 400 });
    }

    const service = new FinanceService();

    // Check duplicate if flag is requested
    if (body.checkDuplicate) {
      const dup = service.checkDuplicate(user.id, body.accountId, body.date, body.amount, body.merchantName);
      if (dup && !body.confirmedDuplicate) {
        return NextResponse.json({ duplicateWarning: dup }, { status: 409 });
      }
    }

    const transaction = service.createTransaction({
      userId: user.id,
      accountId: body.accountId,
      type: body.type,
      amount: body.amount,
      currency: body.currency,
      date: body.date,
      merchantName: body.merchantName,
      categoryId: body.categoryId,
      notes: body.notes,
      destinationAccountId: body.destinationAccountId,
      status: body.status || 'cleared',
      splits: body.splits,
      tags: body.tags,
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error, 'Failed to create transaction');
  }
}

export async function PUT(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Transaction id is required' }, { status: 400 });
    }

    const service = new FinanceService();
    const transaction = service.updateTransaction(body.id, user.id, {
      accountId: body.accountId,
      destinationAccountId: body.destinationAccountId,
      type: body.type,
      amount: body.amount,
      date: body.date,
      merchantName: body.merchantName,
      categoryId: body.categoryId,
      notes: body.notes,
      status: body.status,
      tags: body.tags,
      splits: body.splits,
    });

    return NextResponse.json({ transaction });
  } catch (error: any) {
    return handleApiError(error, 'Failed to update transaction');
  }
}

export async function DELETE(req: Request) {
  try {
    const user = getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const restore = searchParams.get('restore') === 'true';

    if (!id) {
      return NextResponse.json({ error: 'Transaction id is required' }, { status: 400 });
    }

    const service = new FinanceService();
    if (restore) {
      const result = service.restoreTransaction(id, user.id);
      return NextResponse.json(result);
    }

    const result = service.deleteTransaction(id, user.id, false); // soft delete enables undo!
    return NextResponse.json(result);
  } catch (error: any) {
    return handleApiError(error, 'Failed to process transaction');
  }
}

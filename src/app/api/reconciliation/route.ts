import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { FinanceService } from '@/lib/finance-service';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const user = getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    const service = new FinanceService();
    const history = service.getReconciliations(user.id, accountId);
    return NextResponse.json({ history });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch reconciliation' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();

    if (!body.accountId || !body.statementDate || body.statementBalance === undefined) {
      return NextResponse.json({ error: 'accountId, statementDate, and statementBalance are required' }, { status: 400 });
    }

    const service = new FinanceService();
    const result = service.createReconciliation({
      userId: user.id,
      accountId: body.accountId,
      statementDate: body.statementDate,
      statementBalance: body.statementBalance,
      reconciledTransactionIds: body.reconciledTransactionIds,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to execute reconciliation' }, { status: 500 });
  }
}

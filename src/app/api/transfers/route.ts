import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { FinanceService } from '@/lib/finance-service';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();

    if (!body.fromAccountId || !body.toAccountId || !body.amount || !body.date) {
      return NextResponse.json(
        { error: 'fromAccountId, toAccountId, amount, and date are required' },
        { status: 400 }
      );
    }

    const service = new FinanceService();
    const result = service.createTransaction({
      userId: user.id,
      accountId: body.fromAccountId,
      type: 'transfer',
      amount: body.amount,
      date: body.date,
      destinationAccountId: body.toAccountId,
      notes: body.notes,
    });

    return NextResponse.json({ transfer: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to execute transfer' }, { status: 500 });
  }
}

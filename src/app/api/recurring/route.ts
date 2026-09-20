import { NextResponse } from 'next/server';
import { getCurrentUser, handleApiError } from '@/lib/auth';
import { FinanceService } from '@/lib/finance-service';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const user = getCurrentUser(req);
    const service = new FinanceService();
    const recurring = service.getRecurring(user.id);
    return NextResponse.json({ recurring });
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch recurring');
  }
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();

    if (!body.accountId || !body.type || !body.amount || !body.frequency || !body.nextDate) {
      return NextResponse.json({ error: 'accountId, type, amount, frequency, and nextDate are required' }, { status: 400 });
    }

    const service = new FinanceService();
    const id = service.createRecurring({
      userId: user.id,
      accountId: body.accountId,
      type: body.type,
      amount: body.amount,
      frequency: body.frequency,
      nextDate: body.nextDate,
      endDate: body.endDate,
      merchant: body.merchant,
      categoryId: body.categoryId,
      notes: body.notes,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error, 'Failed to create recurring');
  }
}

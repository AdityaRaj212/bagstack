import { NextResponse } from 'next/server';
import { getCurrentUser, handleApiError } from '@/lib/auth';
import { FinanceService } from '@/lib/finance-service';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const user = getCurrentUser(req);
    const service = new FinanceService();
    const loans = service.getLoans(user.id);
    return NextResponse.json({ loans });
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch loans');
  }
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();

    if (!body.accountId || !body.name || !body.principal || body.interestRate === undefined || !body.tenureMonths || !body.startDate) {
      return NextResponse.json({ error: 'accountId, name, principal, interestRate, tenureMonths, and startDate are required' }, { status: 400 });
    }

    const service = new FinanceService();
    const id = service.createLoan({
      userId: user.id,
      accountId: body.accountId,
      name: body.name,
      principal: body.principal,
      outstandingPrincipal: body.outstandingPrincipal ?? body.principal,
      interestRate: body.interestRate,
      tenureMonths: body.tenureMonths,
      startDate: body.startDate,
      emiDay: body.emiDay || 5,
      type: body.type || 'loan',
      notes: body.notes,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error, 'Failed to create loan');
  }
}

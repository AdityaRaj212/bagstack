import { NextResponse } from 'next/server';
import { getCurrentUser, handleApiError } from '@/lib/auth';
import { FinanceService } from '@/lib/finance-service';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getCurrentUser(req);
    const { id: loanId } = await params;
    const body = await req.json().catch(() => ({}));

    const service = new FinanceService();
    const loan = service.getLoans(user.id).find((l: any) => l.id === loanId);
    if (!loan) {
      return NextResponse.json({ error: 'Loan or EMI not found' }, { status: 404 });
    }

    const accountId = body.accountId || loan.account_id;
    if (!accountId) {
      return NextResponse.json({ error: 'A debit account must be selected to pay EMI' }, { status: 400 });
    }

    const result = service.recordLoanPayment({
      userId: user.id,
      loanId,
      accountId,
      amount: body.amount,
      date: body.date,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return handleApiError(error, 'Failed to record EMI payment');
  }
}

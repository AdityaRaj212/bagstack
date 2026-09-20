import { NextResponse } from 'next/server';
import { getCurrentUser, handleApiError } from '@/lib/auth';
import { FinanceService } from '@/lib/finance-service';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const user = getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || undefined;

    const service = new FinanceService();
    const budgets = service.getBudgets(user.id, month);
    return NextResponse.json({ budgets });
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch budgets');
  }
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();

    if (!body.categoryId || !body.amount) {
      return NextResponse.json({ error: 'categoryId and amount are required' }, { status: 400 });
    }

    const service = new FinanceService();
    const budgetId = service.createBudget({
      userId: user.id,
      categoryId: body.categoryId,
      amount: body.amount,
      periodType: body.periodType || 'monthly',
      rollover: body.rollover,
    });

    return NextResponse.json({ id: budgetId }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error, 'Failed to create budget');
  }
}

export async function DELETE(req: Request) {
  try {
    const user = getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const service = new FinanceService();
    service.deleteBudget(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error, 'Failed to delete budget');
  }
}

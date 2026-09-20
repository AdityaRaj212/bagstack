import { NextResponse } from 'next/server';
import { getCurrentUser, handleApiError } from '@/lib/auth';
import { FinanceService } from '@/lib/finance-service';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const user = getCurrentUser(req);
    const service = new FinanceService();
    const goals = service.getGoals(user.id);
    return NextResponse.json({ goals });
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch goals');
  }
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();

    if (!body.name || !body.targetAmount || !body.targetDate) {
      return NextResponse.json({ error: 'name, targetAmount, and targetDate are required' }, { status: 400 });
    }

    const service = new FinanceService();
    const goalId = service.createGoal({
      userId: user.id,
      name: body.name,
      targetAmount: body.targetAmount,
      currentAmount: body.currentAmount || 0,
      targetDate: body.targetDate,
      notes: body.notes,
    });

    return NextResponse.json({ id: goalId }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error, 'Failed to create goal');
  }
}

export async function PATCH(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();

    if (!body.id || body.addAmount === undefined) {
      return NextResponse.json({ error: 'id and addAmount are required' }, { status: 400 });
    }

    const service = new FinanceService();
    const result = service.contributeToGoal(body.id, user.id, body.addAmount, body.sourceAccountId);
    return NextResponse.json(result);
  } catch (error: any) {
    return handleApiError(error, 'Failed to update goal');
  }
}

export async function PUT(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const service = new FinanceService();
    const result = service.updateGoal(body.id, user.id, {
      name: body.name,
      targetAmount: body.targetAmount,
      currentAmount: body.currentAmount,
      targetDate: body.targetDate,
      notes: body.notes,
      status: body.status,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    return handleApiError(error, 'Failed to edit goal');
  }
}

export async function DELETE(req: Request) {
  try {
    const user = getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const service = new FinanceService();
    service.deleteGoal(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error, 'Failed to delete goal');
  }
}

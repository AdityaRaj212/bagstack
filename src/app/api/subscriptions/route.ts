import { NextResponse } from 'next/server';
import { getCurrentUser, handleApiError } from '@/lib/auth';
import { FinanceService } from '@/lib/finance-service';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const user = getCurrentUser(req);
    const service = new FinanceService();
    const result = service.getSubscriptions(user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch subscriptions');
  }
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();

    if (!body.name || !body.amount || !body.accountId || !body.nextBillingDate) {
      return NextResponse.json({ error: 'name, amount, accountId, and nextBillingDate are required' }, { status: 400 });
    }

    const service = new FinanceService();
    const id = service.createSubscription({
      userId: user.id,
      name: body.name,
      amount: body.amount,
      billingFrequency: body.billingFrequency || 'monthly',
      nextBillingDate: body.nextBillingDate,
      accountId: body.accountId,
      categoryId: body.categoryId,
      notes: body.notes,
      autoDeduct: body.autoDeduct,
      alreadyPaid: Boolean(body.alreadyPaid),
      lastPaidDate: body.lastPaidDate,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error, 'Failed to create subscription');
  }
}

export async function PATCH(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();
    const service = new FinanceService();

    if (body.action === 'record_payment') {
      if (!body.subscriptionId) {
        return NextResponse.json({ error: 'subscriptionId required' }, { status: 400 });
      }
      const res = service.recordSubscriptionPayment({
        userId: user.id,
        subscriptionId: body.subscriptionId,
        paidDate: body.paidDate,
        accountId: body.accountId,
      });
      return NextResponse.json(res);
    }

    if (body.action === 'snooze') {
      if (!body.subscriptionId || !body.newNextBillingDate) {
        return NextResponse.json({ error: 'subscriptionId and newNextBillingDate required' }, { status: 400 });
      }
      const res = service.snoozeSubscription({
        userId: user.id,
        subscriptionId: body.subscriptionId,
        newNextBillingDate: body.newNextBillingDate,
      });
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return handleApiError(error, 'Failed to update subscription');
  }
}

export async function DELETE(req: Request) {
  try {
    const user = getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const service = new FinanceService();
    service.deleteSubscription(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error, 'Failed to delete subscription');
  }
}

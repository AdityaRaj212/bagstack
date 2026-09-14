import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { FinanceService } from '@/lib/finance-service';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const user = getCurrentUser(req);
    const service = new FinanceService();
    const accounts = service.getAccounts(user.id);
    return NextResponse.json({ accounts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch accounts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();

    if (!body.name || !body.type) {
      return NextResponse.json({ error: 'Account name and type are required' }, { status: 400 });
    }

    const service = new FinanceService();
    const account = service.createAccount({
      userId: user.id,
      name: body.name,
      institution: body.institution,
      type: body.type,
      currency: body.currency || user.baseCurrency,
      openingBalance: body.openingBalance || 0,
      creditLimit: body.creditLimit || 0,
      billingCycleDay: body.billingCycleDay || 1,
      dueDateDay: body.dueDateDay || 20,
      interestRate: body.interestRate || 0,
      icon: body.icon,
      color: body.color,
      notes: body.notes,
      includeInNetWorth: body.includeInNetWorth !== false,
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create account' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();

    if (!body.id || !body.name?.trim()) {
      return NextResponse.json({ error: 'Account ID and name are required' }, { status: 400 });
    }

    const service = new FinanceService();
    const updated = service.updateAccount(body.id, user.id, {
      name: body.name.trim(),
      institution: body.institution?.trim() || '',
      type: body.type,
      color: body.color,
      icon: body.icon,
      creditLimit: body.creditLimit ? Math.round(Number(body.creditLimit)) : undefined,
      notes: body.notes,
      includeInNetWorth: body.includeInNetWorth !== undefined ? Boolean(body.includeInNetWorth) : undefined,
    });

    return NextResponse.json({ success: true, account: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update account' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();

    const service = new FinanceService();
    if (body.action === 'set_default' && body.accountId) {
      const account = service.setDefaultAccount(user.id, body.accountId);
      return NextResponse.json({ success: true, account });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update account' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Account id required' }, { status: 400 });

    const service = new FinanceService();
    service.deleteAccount(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete account' }, { status: 500 });
  }
}


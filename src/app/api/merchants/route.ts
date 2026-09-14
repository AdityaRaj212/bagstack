import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { FinanceService } from '@/lib/finance-service';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const user = getCurrentUser(req);
    const service = new FinanceService();
    const merchants = service.getMerchants(user.id);
    return NextResponse.json({ merchants });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch payees' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Payee name is required' }, { status: 400 });
    }

    const service = new FinanceService();
    const id = service.findOrCreateMerchant(user.id, body.name, body.defaultCategoryId);
    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create payee' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Payee id is required' }, { status: 400 });
    }

    const service = new FinanceService();
    service.deleteMerchant(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete payee' }, { status: 500 });
  }
}

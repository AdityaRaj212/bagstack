import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { FinanceService } from '@/lib/finance-service';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const user = getCurrentUser(req);
    const service = new FinanceService();
    const result = service.getInvestments(user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch investments' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUser(req);
    const body = await req.json();

    if (!body.accountId || !body.symbol || !body.name || !body.costBasis || !body.currentPrice) {
      return NextResponse.json({ error: 'accountId, symbol, name, costBasis, and currentPrice are required' }, { status: 400 });
    }

    const service = new FinanceService();
    const id = service.createInvestment({
      userId: user.id,
      accountId: body.accountId,
      symbol: body.symbol,
      name: body.name,
      assetType: body.assetType || 'stock',
      quantity: body.quantity || 1,
      costBasis: body.costBasis,
      currentPrice: body.currentPrice,
      notes: body.notes,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create investment' }, { status: 500 });
  }
}

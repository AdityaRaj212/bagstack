import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { FinanceService } from '@/lib/finance-service';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const user = getCurrentUser(req);
    const service = new FinanceService();
    const result = service.seedDemoData(user.id);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Seeding failed' }, { status: 500 });
  }
}

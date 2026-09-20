import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { FinanceService } from '@/lib/finance-service';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const user = getCurrentUser(req);

    // In production, block seeding real accounts with mock data
    if (process.env.NODE_ENV === 'production' && user.id !== 'user_default') {
      return NextResponse.json({ error: 'Demo seeding is disabled for production accounts' }, { status: 403 });
    }

    const service = new FinanceService();
    const result = service.seedDemoData(user.id);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    const status = error.message?.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: error.message || 'Seeding failed' }, { status });
  }
}

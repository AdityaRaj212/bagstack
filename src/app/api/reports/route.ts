import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { FinanceService } from '@/lib/finance-service';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const user = getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || new Date().toISOString().substring(0, 7);
    const compareMonth = searchParams.get('compareMonth') || undefined;

    const service = new FinanceService();
    const spendingByCategory = service.getSpendingByCategory(user.id, month);
    const spendingByMerchant = service.getSpendingByMerchant(user.id, 15);
    const cashFlowTrend = service.getMonthlyCashFlowTrend(user.id, 12);
    const metrics = service.getDashboardMetrics(user.id, month);
    const dailySpending = service.getDailySpending(user.id, month);
    const splitAnalytics = service.getSplitTransactionsAnalytics(user.id, month);

    let comparison = null;
    if (compareMonth) {
      comparison = service.getMonthComparison(user.id, month, compareMonth);
    }

    return NextResponse.json({
      selectedMonth: month,
      spendingByCategory,
      spendingByMerchant,
      cashFlowTrend,
      metrics,
      dailySpending,
      splitAnalytics,
      comparison,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch reports' }, { status: 500 });
  }
}

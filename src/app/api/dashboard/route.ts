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
    const metrics = service.getDashboardMetrics(user.id, month);
    const cashFlowTrend = service.getMonthlyCashFlowTrend(user.id, 6);
    const topCategories = service.getSpendingByCategory(user.id, month);
    const recentTransactions = service.getTransactions(user.id, { limit: 10 });
    const accounts = service.getAccounts(user.id);
    const budgets = service.getBudgets(user.id, month);
    const goals = service.getGoals(user.id);
    const subscriptions = service.getSubscriptions(user.id);
    const insights = service.getDeterministicInsights(user.id);

    return NextResponse.json({
      user,
      metrics,
      cashFlowTrend,
      topCategories,
      recentTransactions,
      accounts,
      budgets,
      goals,
      subscriptions,
      insights,
    });
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch dashboard data');
  }
}

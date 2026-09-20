import { NextResponse } from 'next/server';
import { getCurrentUser, handleApiError } from '@/lib/auth';
import { FinanceService } from '@/lib/finance-service';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const user = getCurrentUser(req);
    const service = new FinanceService();
    const forecast = service.getCashFlowForecast(user.id, 90);
    return NextResponse.json(forecast);
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch cash flow forecast');
  }
}

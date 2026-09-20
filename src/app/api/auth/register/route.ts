import { NextResponse } from 'next/server';
import { createNewUser, getCurrentUser, DEFAULT_USER_ID } from '@/lib/auth';
import { FinanceService } from '@/lib/finance-service';
import { toMinorUnits } from '@/lib/money';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const currentUser = getCurrentUser(req);
    const body = await req.json();
    const { name, email, baseCurrency = 'INR', initialAccountName, initialBalance } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Profile name is required' }, { status: 400 });
    }

    if (!currentUser || currentUser.id === DEFAULT_USER_ID) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be logged in to create a workspace profile' },
        { status: 401 }
      );
    }

    const ownerEmail = (currentUser.ownerEmail || currentUser.email).toLowerCase();

    const newUser = createNewUser({
      name: name.trim(),
      email: email?.trim().toLowerCase(),
      baseCurrency,
      ownerEmail,
    });

    // If an initial bank/cash account was specified, create it!
    if (initialAccountName && initialAccountName.trim()) {
      const service = new FinanceService();
      const openingMinor = initialBalance ? toMinorUnits(initialBalance, baseCurrency) : 0;

      service.createAccount({
        userId: newUser.id,
        name: initialAccountName.trim(),
        type: 'savings',
        currency: baseCurrency,
        openingBalance: openingMinor,
        institution: 'Primary Bank',
      });
    }

    const db = getDb();
    const cookieHeader = req.headers.get('cookie') || '';
    const sessionMatch = cookieHeader.match(/apex_session_token=([^;]+)/);
    if (sessionMatch && sessionMatch[1]) {
      const token = decodeURIComponent(sessionMatch[1].trim());
      db.prepare('UPDATE user_sessions SET user_id = ? WHERE token = ?').run(newUser.id, token);
    }

    const isProd = process.env.NODE_ENV === 'production';
    const response = NextResponse.json({ success: true, user: newUser }, { status: 201 });

    // Set cookie for automatic session retention
    response.cookies.set('finance_user_id', newUser.id, {
      path: '/',
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return response;
  } catch (error: any) {
    const status = error.message?.includes('Unauthorized') ? 401 : 400;
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status });
  }
}

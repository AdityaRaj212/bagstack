import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, email } = body;

    const db = getDb();
    let user = null;

    if (userId) {
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    } else if (email) {
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase()) as any;
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      baseCurrency: user.base_currency || 'INR',
      ownerEmail: user.owner_email || user.email,
    };

    // If an authenticated session cookie exists, update the session record to point to this switched profile!
    const cookieHeader = req.headers.get('cookie') || '';
    const sessionMatch = cookieHeader.match(/apex_session_token=([^;]+)/);
    if (sessionMatch && sessionMatch[1]) {
      const token = decodeURIComponent(sessionMatch[1].trim());
      db.prepare('UPDATE user_sessions SET user_id = ? WHERE token = ?').run(user.id, token);
    }

    const response = NextResponse.json({ success: true, user: sessionUser });
    response.cookies.set('finance_user_id', user.id, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 });
  }
}

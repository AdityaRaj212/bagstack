import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const currentUser = getCurrentUser(req);
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const db = getDb();
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

    if (!targetUser) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Ownership verification: Can only switch to profiles belonging to the same owner account
    const currentOwner = (currentUser.ownerEmail || currentUser.email).toLowerCase();
    const targetOwner = (targetUser.owner_email || targetUser.email).toLowerCase();

    if (currentOwner !== targetOwner && currentUser.id !== targetUser.id) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to switch to this profile' }, { status: 403 });
    }

    const sessionUser = {
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      baseCurrency: targetUser.base_currency || 'INR',
      ownerEmail: targetUser.owner_email || targetUser.email,
    };

    // Update active session record
    const cookieHeader = req.headers.get('cookie') || '';
    const sessionMatch = cookieHeader.match(/apex_session_token=([^;]+)/);
    if (sessionMatch && sessionMatch[1]) {
      const token = decodeURIComponent(sessionMatch[1].trim());
      db.prepare('UPDATE user_sessions SET user_id = ? WHERE token = ?').run(targetUser.id, token);
    }

    const isProd = process.env.NODE_ENV === 'production';
    const response = NextResponse.json({ success: true, user: sessionUser });
    response.cookies.set('finance_user_id', targetUser.id, {
      path: '/',
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error: any) {
    const status = error.message?.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: error.message || 'Profile switch failed' }, { status });
  }
}

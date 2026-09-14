import { NextResponse } from 'next/server';
import { OtpService } from '@/lib/otp-service';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const sessionMatch = cookieHeader.match(/apex_session_token=([^;]+)/);
    const sessionToken = sessionMatch ? decodeURIComponent(sessionMatch[1].trim()) : '';

    if (sessionToken) {
      const otpService = new OtpService();
      const user = otpService.validateSession(sessionToken);
      if (user) {
        return NextResponse.json({
          user,
          isAuthenticated: true,
          isDemo: false,
        });
      }
    }

    // Check if in demo sandbox mode
    const demoMatch = cookieHeader.match(/apex_demo_mode=([^;]+)/);
    if (demoMatch && demoMatch[1] === 'true') {
      const db = getDb();
      const demoUser = db.prepare('SELECT * FROM users WHERE id = ?').get('user_default') as any;
      if (demoUser) {
        return NextResponse.json({
          user: {
            id: demoUser.id,
            email: demoUser.email,
            name: demoUser.name,
            baseCurrency: demoUser.base_currency || 'INR',
          },
          isAuthenticated: true,
          isDemo: true,
        });
      }
    }

    return NextResponse.json({
      user: null,
      isAuthenticated: false,
      isDemo: false,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to check session' }, { status: 500 });
  }
}

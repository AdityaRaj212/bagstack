import { NextResponse } from 'next/server';
import { OtpService } from '@/lib/otp-service';
import { rateLimiter, getClientIp } from '@/lib/rate-limiter';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and verification code are required' }, { status: 400 });
    }

    const clientIp = getClientIp(req);
    const ipCheck = rateLimiter.check(`otp:verify:${clientIp}`, 10, 60_000);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please wait a minute.' },
        { status: 429 }
      );
    }

    const otpService = new OtpService();
    const result = await otpService.verifyOtp(email, code);

    if (!result.success || !result.token) {
      return NextResponse.json({ error: result.error || 'Verification failed' }, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      user: result.user,
    });

    const isProd = process.env.NODE_ENV === 'production';

    // Set secure HTTP-only session cookie for 30 days
    response.cookies.set('apex_session_token', result.token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Also set finance_user_id for profile routing
    response.cookies.set('finance_user_id', result.user.id, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: error.message || 'Verification failed' }, { status: 500 });
  }
}

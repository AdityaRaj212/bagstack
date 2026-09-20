import { NextResponse } from 'next/server';
import { OtpService } from '@/lib/otp-service';
import { rateLimiter, getClientIp } from '@/lib/rate-limiter';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const clientIp = getClientIp(req);

    // 1. Rate limit by Client IP (max 5 OTP requests per minute)
    const ipCheck = rateLimiter.check(`otp:ip:${clientIp}`, 5, 60_000);
    if (!ipCheck.allowed) {
      const waitSeconds = Math.ceil(ipCheck.resetInMs / 1000);
      return NextResponse.json(
        { error: `Too many login attempts. Please wait ${waitSeconds}s before trying again.` },
        {
          status: 429,
          headers: { 'Retry-After': String(waitSeconds) },
        }
      );
    }

    // 2. Rate limit by Email (max 3 OTP requests per minute)
    const emailCheck = rateLimiter.check(`otp:email:${cleanEmail}`, 3, 60_000);
    if (!emailCheck.allowed) {
      const waitSeconds = Math.ceil(emailCheck.resetInMs / 1000);
      return NextResponse.json(
        { error: `A verification code was recently sent to this email. Please wait ${waitSeconds}s before requesting a new code.` },
        {
          status: 429,
          headers: { 'Retry-After': String(waitSeconds) },
        }
      );
    }

    const otpService = new OtpService();
    const result = await otpService.sendOtp(cleanEmail);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send verification code' }, { status: 500 });
  }
}

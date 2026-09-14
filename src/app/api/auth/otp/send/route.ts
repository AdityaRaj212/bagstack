import { NextResponse } from 'next/server';
import { OtpService } from '@/lib/otp-service';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    const otpService = new OtpService();
    const result = await otpService.sendOtp(email);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send verification code' }, { status: 500 });
  }
}

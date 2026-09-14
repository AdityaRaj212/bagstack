import { NextResponse } from 'next/server';
import { OtpService } from '@/lib/otp-service';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/apex_session_token=([^;]+)/);
    const token = match ? decodeURIComponent(match[1].trim()) : '';

    if (token) {
      const otpService = new OtpService();
      otpService.destroySession(token);
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

    // Clear session cookies
    response.cookies.delete('apex_session_token');
    response.cookies.delete('finance_user_id');

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Logout failed' }, { status: 500 });
  }
}

import nodemailer from 'nodemailer';

const SMTP_USER = process.env.SMTP_USER || 'adityaraj212.work@gmail.com';
const SMTP_PASS = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
const FROM_NAME = 'Bagstack';
const FROM_EMAIL = SMTP_USER;

// Create reusable Nodemailer transporter
function getTransporter() {
  if (!SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

/**
 * Sends a branded 6-digit OTP verification email to the user.
 */
export async function sendVerificationEmail(
  toEmail: string,
  otpCode: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const transporter = getTransporter();

  const formattedCode = `${otpCode.slice(0, 3)} ${otpCode.slice(3)}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bagstack Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 500px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #1f2937; text-align: center;">
              <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; background: linear-gradient(135deg, #4f46e5, #8b5cf6); color: #ffffff; font-weight: 800; font-size: 20px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);">
                B
              </div>
              <h1 style="margin: 12px 0 4px 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: #ffffff;">Bagstack</h1>
              <p style="margin: 0; font-size: 13px; color: #9ca3af;">Personal Financial Command Center</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #e5e7eb; line-height: 1.5;">
                Hello,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #9ca3af; line-height: 1.6;">
                Use the following one-time verification code to securely access your personal finance workspace:
              </p>

              <!-- OTP Code Display Card -->
              <div style="background-color: #030712; border: 1px solid #374151; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #6366f1; display: inline-block;">
                  ${formattedCode}
                </span>
                <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">
                  Expires in <strong>10 minutes</strong>
                </div>
              </div>

              <p style="margin: 0 0 8px 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                • This code is single-use and will expire shortly.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                • If you did not request this login, you can safely ignore this email.
              </p>

              <!-- Security Notice -->
              <div style="background-color: rgba(79, 70, 229, 0.08); border-left: 3px solid #6366f1; padding: 12px 16px; border-radius: 4px;">
                <p style="margin: 0; font-size: 12px; color: #c7d2fe; line-height: 1.4;">
                  <strong>Zero data tracking</strong>: Bagstack strictly seals your financial ledger behind verified sessions.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0d1322; border-top: 1px solid #1f2937; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                Sent with security from <strong>${SMTP_USER}</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  if (!transporter) {
    console.warn(`[DEV AUTH] No SMTP_PASS configured. Dev OTP for ${toEmail} is: ${otpCode}`);
    return {
      success: false,
      error: 'SMTP credentials not configured. Please supply a valid Google App Password in .env.local.',
    };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: toEmail,
      subject: `${otpCode} is your Bagstack login code`,
      text: `Your Bagstack one-time verification code is: ${otpCode}. It expires in 10 minutes.`,
      html: htmlContent,
    });
    console.log(`[SMTP] Verification email sent to ${toEmail}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error(`[SMTP ERROR] Failed to send email to ${toEmail}:`, errorMsg);
    console.warn(`[DEV FALLBACK] Your OTP for ${toEmail} is: ${otpCode}`);
    return {
      success: false,
      error: errorMsg.includes('BadCredentials') || errorMsg.includes('535')
        ? 'Google SMTP rejected the App Password (535 Bad Credentials). Ensure the App Password was generated for ' + SMTP_USER + ' and that 2-Step Verification is active.'
        : errorMsg,
    };
  }
}

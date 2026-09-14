import crypto from 'crypto';
import { getDb, seedDefaultCategories } from './db';
import { sendVerificationEmail } from './mailer';

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_ATTEMPTS = 5;

function hashToken(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export class OtpService {
  private db = getDb();

  /**
   * Generates a 6-digit OTP, stores it in SQLite, and dispatches via email.
   */
  async sendOtp(rawEmail: string): Promise<{
    success: boolean;
    emailSent: boolean;
    message: string;
    devCode?: string;
    smtpError?: string;
  }> {
    const email = rawEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address');
    }

    // Generate random 6-digit code
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const codeHash = hashToken(otpCode);
    const expiresAt = Date.now() + OTP_EXPIRY_MS;
    const otpId = `otp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Clean up older OTPs for this email
    this.db.prepare('DELETE FROM email_otps WHERE email = ?').run(email);

    // Store new OTP
    this.db.prepare(`
      INSERT INTO email_otps (id, email, code_hash, expires_at, attempts)
      VALUES (?, ?, ?, ?, 0)
    `).run(otpId, email, codeHash, expiresAt);

    // Dispatch email via Nodemailer
    const mailResult = await sendVerificationEmail(email, otpCode);

    if (mailResult.success) {
      return {
        success: true,
        emailSent: true,
        message: `A 6-digit login code has been sent to ${email}`,
      };
    }

    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      throw new Error(mailResult.error || 'Failed to send verification email. Please check your SMTP settings.');
    }

    return {
      success: true,
      emailSent: false,
      devCode: otpCode,
      smtpError: mailResult.error,
      message: `Could not deliver email: ${mailResult.error || 'SMTP delivery failed'}. Use the verification code shown below.`,
    };
  }

  /**
   * Validates the 6-digit OTP, logs in / registers the user, and creates a session token.
   */
  async verifyOtp(rawEmail: string, rawCode: string): Promise<{
    success: boolean;
    token?: string;
    user?: any;
    error?: string;
  }> {
    const email = rawEmail.trim().toLowerCase();
    const code = rawCode.trim().replace(/\s+/g, '');

    if (!code || code.length !== 6) {
      return { success: false, error: 'Verification code must be 6 digits' };
    }

    // Retrieve active OTP record
    const otpRecord = this.db.prepare(`
      SELECT * FROM email_otps 
      WHERE email = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(email) as any;

    if (!otpRecord) {
      return { success: false, error: 'No active code found. Please request a new code.' };
    }

    if (Date.now() > otpRecord.expires_at) {
      this.db.prepare('DELETE FROM email_otps WHERE id = ?').run(otpRecord.id);
      return { success: false, error: 'Verification code has expired. Please request a new one.' };
    }

    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      this.db.prepare('DELETE FROM email_otps WHERE id = ?').run(otpRecord.id);
      return { success: false, error: 'Too many incorrect attempts. Please request a new code.' };
    }

    const enteredHash = hashToken(code);
    if (enteredHash !== otpRecord.code_hash) {
      this.db.prepare('UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?').run(otpRecord.id);
      const remaining = MAX_ATTEMPTS - (otpRecord.attempts + 1);
      return {
        success: false,
        error: `Incorrect code. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`,
      };
    }

    // OTP is valid! Remove it so it cannot be re-used
    this.db.prepare('DELETE FROM email_otps WHERE id = ?').run(otpRecord.id);

    // Find or create User
    let user = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const defaultName = email.split('@')[0].replace(/[._-]/g, ' ');
      const formattedName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);

      this.db.prepare(`
        INSERT INTO users (id, email, name, base_currency)
        VALUES (?, ?, ?, 'INR')
      `).run(userId, email, formattedName);

      seedDefaultCategories(this.db, userId);

      // Create default primary bank account for fresh user
      const accId = `acc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      this.db.prepare(`
        INSERT INTO accounts (
          id, user_id, name, institution, type, currency,
          opening_balance, current_balance, credit_limit,
          icon, color, include_in_net_worth, is_default
        ) VALUES (?, ?, 'Primary Savings', 'Bank', 'savings', 'INR', 0, 0, 0, 'landmark', '#4f46e5', 1, 1)
      `).run(accId, userId);

      user = {
        id: userId,
        email,
        name: formattedName,
        base_currency: 'INR',
      };
    }

    // Generate Session Token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionExpiresAt = Date.now() + SESSION_EXPIRY_MS;

    this.db.prepare(`
      INSERT INTO user_sessions (token, user_id, expires_at)
      VALUES (?, ?, ?)
    `).run(sessionToken, user.id, sessionExpiresAt);

    return {
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        baseCurrency: user.base_currency || 'INR',
        isNewUser,
      },
    };
  }

  /**
   * Validates a session token from cookie/header.
   */
  validateSession(token: string): any | null {
    if (!token) return null;

    const row = this.db.prepare(`
      SELECT s.*, u.email, u.name, u.base_currency 
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > ?
    `).get(token, Date.now()) as any;

    if (!row) return null;

    return {
      id: row.user_id,
      email: row.email,
      name: row.name,
      baseCurrency: row.base_currency || 'INR',
    };
  }

  /**
   * Invalidates a session token.
   */
  destroySession(token: string): void {
    if (!token) return;
    this.db.prepare('DELETE FROM user_sessions WHERE token = ?').run(token);
  }
}

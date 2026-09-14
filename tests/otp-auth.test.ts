import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDb } from '../src/lib/db';
import { OtpService } from '../src/lib/otp-service';

// Mock mailer so tests don't send real emails over internet
vi.mock('../src/lib/mailer', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'msg_123' }),
}));

describe('OTP Authentication & Session Engine', () => {
  const testEmail = 'tester@example.com';
  const db = getDb();
  let service: OtpService;

  beforeEach(() => {
    service = new OtpService();
    // Clean up any test records
    db.prepare(`DELETE FROM email_otps WHERE email = ?`).run(testEmail);
    db.prepare(`DELETE FROM users WHERE email = ?`).run(testEmail);
  });

  it('generates a 6-digit OTP and stores it securely hashed in sqlite', async () => {
    const res = await service.sendOtp(testEmail);
    expect(res.success).toBe(true);

    // Check DB record exists (hashed)
    const row = db.prepare(`SELECT * FROM email_otps WHERE email = ?`).get(testEmail) as any;
    expect(row).toBeDefined();
    expect(row.code_hash).toBeDefined();
    expect(row.code_hash.length).toBe(64); // SHA-256 hex length
    expect(row.expires_at).toBeGreaterThan(Date.now());
  });

  it('rejects invalid OTP and increments attempt counter', async () => {
    await service.sendOtp(testEmail);

    const result = await service.verifyOtp(testEmail, '000000');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Incorrect code');

    const row = db.prepare(`SELECT attempts FROM email_otps WHERE email = ?`).get(testEmail) as any;
    expect(row.attempts).toBe(1);
  });

  it('verifies valid OTP, creates user and returns active session token', async () => {
    // Generate OTP
    await service.sendOtp(testEmail);

    // Retrieve hash and let's test with brute force or inspect code
    // Since mock mailer was called, we can inspect mock calls or set known hash
    const crypto = await import('crypto');
    const knownCode = '123456';
    const knownHash = crypto.createHash('sha256').update(knownCode).digest('hex');

    db.prepare(`UPDATE email_otps SET code_hash = ? WHERE email = ?`).run(knownHash, testEmail);

    const verifyResult = await service.verifyOtp(testEmail, knownCode);
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.token).toBeDefined();
    expect(verifyResult.user).toBeDefined();
    expect(verifyResult.user.email).toBe(testEmail);
    expect(verifyResult.user.isNewUser).toBe(true);

    // Validate session
    const session = service.validateSession(verifyResult.token!);
    expect(session).toBeDefined();
    expect(session.email).toBe(testEmail);

    // User should have default savings account created
    const userAccs = db.prepare(`SELECT * FROM accounts WHERE user_id = ?`).all(verifyResult.user.id);
    expect(userAccs.length).toBeGreaterThan(0);
  });

  it('destroys session on logout', async () => {
    await service.sendOtp(testEmail);

    const crypto = await import('crypto');
    const knownCode = '654321';
    const knownHash = crypto.createHash('sha256').update(knownCode).digest('hex');
    db.prepare(`UPDATE email_otps SET code_hash = ? WHERE email = ?`).run(knownHash, testEmail);

    const verifyResult = await service.verifyOtp(testEmail, knownCode);
    expect(verifyResult.success).toBe(true);

    // Session is valid
    expect(service.validateSession(verifyResult.token!)).not.toBeNull();

    // Invalidate
    service.destroySession(verifyResult.token!);

    // Now session must be null
    expect(service.validateSession(verifyResult.token!)).toBeNull();
  });

  it('handles email delivery failure gracefully by returning devCode and diagnostic error', async () => {
    const { sendVerificationEmail } = await import('../src/lib/mailer');
    (sendVerificationEmail as any).mockResolvedValueOnce({
      success: false,
      error: 'Google SMTP rejected credentials (535 Bad Credentials)',
    });

    const res = await service.sendOtp(testEmail);
    expect(res.success).toBe(true);
    expect(res.emailSent).toBe(false);
    expect(res.devCode).toBeDefined();
    expect(res.devCode?.length).toBe(6);
    expect(res.smtpError).toContain('535 Bad Credentials');

    // Verification still succeeds with the devCode
    const verifyResult = await service.verifyOtp(testEmail, res.devCode!);
    expect(verifyResult.success).toBe(true);
  });
});

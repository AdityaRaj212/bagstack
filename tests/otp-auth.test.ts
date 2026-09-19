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

  it('allows creating multiple workspace profiles under the same owner email', async () => {
    const { createNewUser, getAllUsers } = await import('../src/lib/auth');
    const ownerEmail = 'multi_profile_owner@example.com';
    db.prepare(`DELETE FROM users WHERE owner_email = ? OR email = ?`).run(ownerEmail, ownerEmail);

    // Primary profile
    const profile1 = await createNewUser({
      name: 'Aditya Personal',
      email: ownerEmail,
      ownerEmail: ownerEmail,
    });
    expect(profile1.email).toBe(ownerEmail);
    expect(profile1.ownerEmail).toBe(ownerEmail);

    // Second profile under the same owner email (e.g. Freelance)
    const profile2 = await createNewUser({
      name: 'Aditya Freelance',
      email: ownerEmail,
      ownerEmail: ownerEmail,
    });
    expect(profile2).toBeDefined();
    expect(profile2.name).toBe('Aditya Freelance');
    expect(profile2.ownerEmail).toBe(ownerEmail);
    expect(profile2.id).not.toBe(profile1.id);

    // Third profile under the same owner email (e.g. Business)
    const profile3 = await createNewUser({
      name: 'Aditya Business',
      email: ownerEmail,
      ownerEmail: ownerEmail,
    });
    expect(profile3).toBeDefined();
    expect(profile3.name).toBe('Aditya Business');
    expect(profile3.ownerEmail).toBe(ownerEmail);

    // All profiles for this owner
    const all = await getAllUsers(ownerEmail);
    const profileNames = all.map(p => p.name);
    expect(profileNames).toContain('Aditya Personal');
    expect(profileNames).toContain('Aditya Freelance');
    expect(profileNames).toContain('Aditya Business');
  });

  it('updates session record when switching between workspace profiles', async () => {
    const { createNewUser } = await import('../src/lib/auth');
    const ownerEmail = 'switching_tester@example.com';
    db.prepare(`DELETE FROM users WHERE owner_email = ? OR email = ?`).run(ownerEmail, ownerEmail);

    const user1 = createNewUser({ name: 'Aditya Profile', email: ownerEmail, ownerEmail });
    const user2 = createNewUser({ name: 'Mumma Profile', email: ownerEmail, ownerEmail });

    // Create session for user1
    const token = 'test_switch_token_' + Date.now();
    db.prepare(`INSERT INTO user_sessions (token, user_id, expires_at) VALUES (?, ?, ?)`).run(token, user1.id, Date.now() + 100000);

    const sessionBefore = service.validateSession(token);
    expect(sessionBefore.id).toBe(user1.id);
    expect(sessionBefore.name).toBe('Aditya Profile');

    // Simulate switch in /api/auth/login
    db.prepare('UPDATE user_sessions SET user_id = ? WHERE token = ?').run(user2.id, token);

    const sessionAfter = service.validateSession(token);
    expect(sessionAfter.id).toBe(user2.id);
    expect(sessionAfter.name).toBe('Mumma Profile');
    expect(sessionAfter.ownerEmail).toBe(ownerEmail);
  });
});

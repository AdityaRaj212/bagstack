import { describe, it, expect, beforeEach } from 'vitest';
import { getDb } from '../src/lib/db';
import { getCurrentUser, getUserIdFromRequest, DEFAULT_USER_ID } from '../src/lib/auth';
import { FinanceService } from '../src/lib/finance-service';
import { rateLimiter } from '../src/lib/rate-limiter';

describe('Security & Authorization Hardening Suite', () => {
  const db = getDb();

  beforeEach(() => {
    // Clean up test sessions
    db.prepare("DELETE FROM user_sessions WHERE user_id LIKE 'sec_test%'").run();
    db.prepare("DELETE FROM users WHERE id LIKE 'sec_test%'").run();
  });

  it('blocks unauthenticated requests when no valid session token exists in production', () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      // Temporarily simulate production environment
      (process.env as any).NODE_ENV = 'production';

      const unauthenticatedReq = new Request('https://bagstack.tech/api/accounts');
      expect(() => getCurrentUser(unauthenticatedReq)).toThrow(/Unauthorized/);
      expect(() => getUserIdFromRequest(unauthenticatedReq)).toThrow(/Unauthorized/);
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
    }
  });

  it('rejects x-user-id header spoofing in production', () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      (process.env as any).NODE_ENV = 'production';

      const spoofedReq = new Request('https://bagstack.tech/api/accounts', {
        headers: {
          'x-user-id': 'victim_user_123',
        },
      });

      // Must NOT return victim_user_123; must throw Unauthorized
      expect(() => getCurrentUser(spoofedReq)).toThrow(/Unauthorized/);
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
    }
  });

  it('prevents IDOR: authenticated session cannot spoof finance_user_id to access another user', () => {
    // Create User A (Attacker) and User B (Victim)
    const userA = 'sec_test_user_a';
    const userB = 'sec_test_user_b';
    const tokenA = 'valid_session_token_a';

    db.prepare(`
      INSERT OR REPLACE INTO users (id, email, name, base_currency, owner_email)
      VALUES (?, 'attacker@evil.com', 'Attacker', 'INR', 'attacker@evil.com')
    `).run(userA);

    db.prepare(`
      INSERT OR REPLACE INTO users (id, email, name, base_currency, owner_email)
      VALUES (?, 'victim@bank.com', 'Victim', 'INR', 'victim@bank.com')
    `).run(userB);

    db.prepare(`
      INSERT OR REPLACE INTO user_sessions (token, user_id, expires_at)
      VALUES (?, ?, ?)
    `).run(tokenA, userA, Date.now() + 3600000);

    // Attacker sends their valid session token A, but tries to pass finance_user_id=sec_test_user_b
    const maliciousReq = new Request('https://bagstack.tech/api/accounts', {
      headers: {
        cookie: `apex_session_token=${tokenA}; finance_user_id=${userB}`,
      },
    });

    const user = getCurrentUser(maliciousReq);
    // Must strictly remain User A, NOT User B!
    expect(user.id).toBe(userA);
    expect(user.email).toBe('attacker@evil.com');
  });

  it('allows switching between profiles owned by the same verified owner', () => {
    const primaryId = 'sec_test_owner_primary';
    const subProfileId = 'sec_test_owner_sub';
    const token = 'valid_owner_session_token';
    const ownerEmail = 'owner@family.com';

    db.prepare(`
      INSERT OR REPLACE INTO users (id, email, name, base_currency, owner_email)
      VALUES (?, 'owner@family.com', 'Primary Workspace', 'INR', ?)
    `).run(primaryId, ownerEmail);

    db.prepare(`
      INSERT OR REPLACE INTO users (id, email, name, base_currency, owner_email)
      VALUES (?, 'owner+kids@family.com', 'Kids Pocket Money', 'INR', ?)
    `).run(subProfileId, ownerEmail);

    db.prepare(`
      INSERT OR REPLACE INTO user_sessions (token, user_id, expires_at)
      VALUES (?, ?, ?)
    `).run(token, primaryId, Date.now() + 3600000);

    // Request with finance_user_id pointing to legitimate sub-profile
    const legitimateReq = new Request('https://bagstack.tech/api/accounts', {
      headers: {
        cookie: `apex_session_token=${token}; finance_user_id=${subProfileId}`,
      },
    });

    const user = getCurrentUser(legitimateReq);
    expect(user.id).toBe(subProfileId);
    expect(user.name).toBe('Kids Pocket Money');
  });

  it('safely handles SQL injection payloads in getSplitTransactionsAnalytics', () => {
    const service = new FinanceService(db);
    const userId = 'sec_test_sql_user';

    db.prepare(`
      INSERT OR REPLACE INTO users (id, email, name, base_currency, owner_email)
      VALUES (?, 'sql@test.com', 'SQL Test', 'INR', 'sql@test.com')
    `).run(userId);

    // Malicious month string attempting UNION injection
    const maliciousMonth = "' UNION SELECT 1, 2, 3, 4, 5, '2026-01-01', 9999, 'Hacked', 'Fake', '#000', 'tag' --";

    // Calling with SQL injection payload must NOT crash or execute injected SQL
    expect(() => {
      const result = service.getSplitTransactionsAnalytics(userId, maliciousMonth);
      expect(result).toBeDefined();
    }).not.toThrow();
  });

  it('rate limits excessive requests using sliding window limiter', () => {
    const testIp = '198.51.100.42';
    const maxRequests = 3;
    const windowMs = 1000;

    // 1st request -> allowed
    const r1 = rateLimiter.check(`test:${testIp}`, maxRequests, windowMs);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    // 2nd request -> allowed
    const r2 = rateLimiter.check(`test:${testIp}`, maxRequests, windowMs);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    // 3rd request -> allowed
    const r3 = rateLimiter.check(`test:${testIp}`, maxRequests, windowMs);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);

    // 4th request -> blocked!
    const r4 = rateLimiter.check(`test:${testIp}`, maxRequests, windowMs);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.resetInMs).toBeGreaterThan(0);
  });
});

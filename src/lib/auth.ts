import { NextResponse } from 'next/server';
import { getDb, seedDefaultCategories } from './db';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  baseCurrency: string;
  ownerEmail?: string;
}

export const DEFAULT_USER_ID = 'user_default';

/**
 * Cryptographically verifies the session token and extracts the active user ID.
 * Prevents header spoofing (x-user-id) and unverified cookie tampering in production.
 */
export function getUserIdFromRequest(req?: Request): string {
  if (!req) {
    if (process.env.NODE_ENV === 'test') return DEFAULT_USER_ID;
    throw new Error('Unauthorized: Authentication required');
  }

  const cookieHeader = req.headers.get('cookie') || '';

  // 1. Authenticated session token check
  const sessionMatch = cookieHeader.match(/apex_session_token=([^;]+)/);
  if (sessionMatch && sessionMatch[1]) {
    try {
      const token = decodeURIComponent(sessionMatch[1].trim());
      const db = getDb();
      const session = db.prepare(`
        SELECT s.user_id, u.owner_email, u.email 
        FROM user_sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ? AND s.expires_at > ?
      `).get(token, Date.now()) as any;

      if (session && session.user_id) {
        // Check if user has selected a specific sub-profile via finance_user_id cookie
        const profileMatch = cookieHeader.match(/finance_user_id=([^;]+)/);
        if (profileMatch && profileMatch[1]) {
          const requestedProfileId = decodeURIComponent(profileMatch[1].trim());
          if (requestedProfileId && requestedProfileId !== session.user_id) {
            // Verify ownership: requested profile must share the same owner_email
            const targetProfile = db.prepare('SELECT id, owner_email, email FROM users WHERE id = ?').get(requestedProfileId) as any;
            const sessionOwner = (session.owner_email || session.email || '').toLowerCase();
            if (targetProfile) {
              const targetOwner = (targetProfile.owner_email || targetProfile.email || '').toLowerCase();
              if (targetOwner === sessionOwner) {
                return targetProfile.id;
              }
            }
          }
        }
        return session.user_id;
      }
    } catch {
      // Fallback
    }
  }

  // 2. Demo Sandbox Mode (explicit user opt-in only)
  const demoMatch = cookieHeader.match(/apex_demo_mode=([^;]+)/);
  if (demoMatch && demoMatch[1] === 'true') {
    return DEFAULT_USER_ID;
  }

  // 3. Test environment override (Vitest/CI only)
  if (process.env.NODE_ENV === 'test') {
    const headerUserId = req.headers.get('x-user-id');
    if (headerUserId && headerUserId.trim()) {
      return headerUserId.trim();
    }
    return DEFAULT_USER_ID;
  }

  // Unauthenticated in production
  throw new Error('Unauthorized: Authentication required');
}

/**
 * Ensures the requesting user is authenticated and returns their verified session.
 */
export function getCurrentUser(req?: Request): UserSession {
  const db = getDb();
  const targetUserId = getUserIdFromRequest(req);

  let user = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId) as any;

  // If user requested doesn't exist and in demo mode, create demo user
  if (!user && targetUserId === DEFAULT_USER_ID) {
    db.prepare(`
      INSERT INTO users (id, email, name, base_currency, owner_email)
      VALUES (?, ?, ?, ?, ?)
    `).run(DEFAULT_USER_ID, 'aditya@finance.local', 'Aditya (Demo)', 'INR', 'aditya@finance.local');

    seedDefaultCategories(db, DEFAULT_USER_ID);

    user = {
      id: DEFAULT_USER_ID,
      email: 'aditya@finance.local',
      name: 'Aditya (Demo)',
      base_currency: 'INR',
      owner_email: 'aditya@finance.local',
    };
  }

  if (!user) {
    throw new Error('Unauthorized: User profile not found');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    baseCurrency: user.base_currency || 'INR',
    ownerEmail: user.owner_email || user.email,
  };
}

/**
 * Creates a brand new user workspace/profile
 */
export function createNewUser(data: {
  name: string;
  email?: string;
  baseCurrency?: string;
  ownerEmail?: string;
}): UserSession {
  const db = getDb();
  const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const currency = data.baseCurrency || 'INR';
  const ownerEmail = (data.ownerEmail || data.email || 'aditya@finance.local').trim().toLowerCase();

  let profileEmail = data.email?.trim().toLowerCase();

  // If profileEmail was not specified OR matches ownerEmail, check if this is an additional profile
  // under the same owner account
  if (!profileEmail || profileEmail === ownerEmail) {
    const existingPrimary = db.prepare('SELECT id FROM users WHERE email = ?').get(ownerEmail) as any;
    if (!existingPrimary) {
      // First workspace under this email
      profileEmail = ownerEmail;
    } else {
      // Additional workspace profile under the same verified email account!
      // Generate a unique workspace alias so SQLite UNIQUE constraint is satisfied
      // while owner_email remains ownerEmail to group all profiles together
      const slug = data.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const uniqueSuffix = `${slug ? slug + '_' : ''}${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`;
      const [local, domain] = ownerEmail.split('@');
      profileEmail = `${local}+${uniqueSuffix}@${domain || 'workspace.local'}`;
    }
  } else {
    // A specific distinct email was requested - check if already taken
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(profileEmail) as any;
    if (existing) {
      throw new Error('An account with this email identifier already exists. Please sign in instead.');
    }
  }

  db.prepare(`
    INSERT INTO users (id, email, name, base_currency, owner_email)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, profileEmail, data.name.trim(), currency, ownerEmail);

  // Automatically seed clean default categories for the new user profile
  seedDefaultCategories(db, id);

  return {
    id,
    email: profileEmail,
    name: data.name.trim(),
    baseCurrency: currency,
    ownerEmail,
  };
}

/**
 * List all workspaces/profiles belonging strictly to the active authenticated account
 */
export function getAllUsers(currentUser?: UserSession | string): Array<UserSession & { isDefault: boolean }> {
  const db = getDb();

  const userObj: UserSession | undefined = typeof currentUser === 'string'
    ? { id: 'lookup', email: currentUser, name: '', baseCurrency: 'INR', ownerEmail: currentUser }
    : currentUser;

  // If unauthenticated or demo user, only return demo user
  if (!userObj || userObj.id === DEFAULT_USER_ID) {
    const demo = db.prepare('SELECT * FROM users WHERE id = ?').get(DEFAULT_USER_ID) as any;
    if (!demo) return [];
    return [{
      id: demo.id,
      email: demo.email,
      name: demo.name,
      baseCurrency: demo.base_currency || 'INR',
      ownerEmail: demo.owner_email || demo.email,
      isDefault: true,
    }];
  }

  let effectiveEmail = (userObj.ownerEmail || '').trim().toLowerCase();
  if (!effectiveEmail && userObj.id && userObj.id !== DEFAULT_USER_ID) {
    const dbUser = db.prepare('SELECT owner_email, email FROM users WHERE id = ?').get(userObj.id) as any;
    if (dbUser) {
      effectiveEmail = (dbUser.owner_email || dbUser.email || '').trim().toLowerCase();
    }
  }
  if (!effectiveEmail) {
    effectiveEmail = (userObj.email || '').trim().toLowerCase();
  }
  if (!effectiveEmail) return [];

  const rows = db.prepare(`
    SELECT * FROM users 
    WHERE owner_email = ? OR email = ?
    ORDER BY created_at ASC
  `).all(effectiveEmail, effectiveEmail) as any[];

  return rows.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    baseCurrency: u.base_currency || 'INR',
    ownerEmail: u.owner_email || u.email,
    isDefault: u.id === DEFAULT_USER_ID,
  }));
}

/**
 * Updates a user profile's display name
 */
export function updateUserName(userId: string, newName: string): UserSession {
  if (!newName || !newName.trim()) {
    throw new Error('Name cannot be empty');
  }

  const db = getDb();
  db.prepare(`
    UPDATE users 
    SET name = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(newName.trim(), userId);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!updated) {
    throw new Error('User not found');
  }

  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    baseCurrency: updated.base_currency || 'INR',
    ownerEmail: updated.owner_email || updated.email,
  };
}

/**
 * Deletes a user profile and all their associated financial data
 */
export function deleteUser(userId: string): boolean {
  if (userId === DEFAULT_USER_ID) {
    throw new Error('Cannot delete the primary demo profile');
  }

  const db = getDb();
  // Clean up all related user records
  db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM transactions WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM accounts WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM categories WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM goals WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM budgets WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM recurring_transactions WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM investments WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM loans WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM rules WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM tags WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM merchants WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM user_preferences WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  return true;
}

/**
 * Standardized API error response handler that properly maps auth errors to 401/403.
 */
export function handleApiError(error: any, fallbackMessage: string = 'Operation failed'): NextResponse {
  const isUnauthorized = error?.message?.includes('Unauthorized');
  const isForbidden = error?.message?.includes('Forbidden');
  const status = isUnauthorized ? 401 : isForbidden ? 403 : 500;
  return NextResponse.json({ error: error?.message || fallbackMessage }, { status });
}



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
 * Extracts the user ID from the request (cookie or header) or falls back to DEFAULT_USER_ID
 */
export function getUserIdFromRequest(req?: Request): string {
  if (!req) return DEFAULT_USER_ID;

  // 0. Check authenticated session cookie
  const cookieHeader = req.headers.get('cookie') || '';
  const sessionMatch = cookieHeader.match(/apex_session_token=([^;]+)/);
  if (sessionMatch && sessionMatch[1]) {
    try {
      const token = decodeURIComponent(sessionMatch[1].trim());
      const db = getDb();
      const session = db.prepare('SELECT user_id FROM user_sessions WHERE token = ? AND expires_at > ?').get(token, Date.now()) as any;
      if (session && session.user_id) {
        return session.user_id;
      }
    } catch {
      // Fallback
    }
  }

  // 1. Check custom header x-user-id
  const headerUserId = req.headers.get('x-user-id');
  if (headerUserId && headerUserId.trim()) {
    return headerUserId.trim();
  }

  // 2. Check finance_user_id cookie
  const match = cookieHeader.match(/finance_user_id=([^;]+)/);
  if (match && match[1]) {
    return decodeURIComponent(match[1].trim());
  }

  return DEFAULT_USER_ID;
}

/**
 * Ensures the default active user exists and has default categories seeded.
 */
export function getCurrentUser(req?: Request): UserSession {
  const db = getDb();
  const targetUserId = getUserIdFromRequest(req);

  let user = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId) as any;

  // If user requested doesn't exist, fallback to default user
  if (!user && targetUserId !== DEFAULT_USER_ID) {
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(DEFAULT_USER_ID) as any;
  }

  // If even default user doesn't exist yet, create it
  if (!user) {
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
  const profileEmail = data.email
    ? data.email.trim().toLowerCase()
    : `${ownerEmail.split('@')[0]}+${Date.now()}@${ownerEmail.split('@')[1] || 'workspace.local'}`;

  // Check if profile email already exists
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(profileEmail) as any;
  if (existing) {
    throw new Error('A workspace profile with this identifier already exists');
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
export function getAllUsers(currentUser?: UserSession): Array<UserSession & { isDefault: boolean }> {
  const db = getDb();

  // If unauthenticated or demo user, only return demo user
  if (!currentUser || currentUser.id === DEFAULT_USER_ID) {
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

  const effectiveEmail = currentUser.ownerEmail || currentUser.email;
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


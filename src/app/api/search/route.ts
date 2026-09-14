import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const user = getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q) {
      return NextResponse.json({ results: [] });
    }

    const db = getDb();
    const term = `%${q}%`;

    // Search Accounts
    const accounts = db.prepare(`
      SELECT id, name, type, current_balance, icon, color
      FROM accounts
      WHERE user_id = ? AND archived = 0 AND (name LIKE ? OR institution LIKE ?)
      LIMIT 5
    `).all(user.id, term, term);

    // Search Categories
    const categories = db.prepare(`
      SELECT id, name, type, icon, color
      FROM categories
      WHERE user_id = ? AND archived = 0 AND name LIKE ?
      LIMIT 5
    `).all(user.id, term);

    // Search Transactions
    const transactions = db.prepare(`
      SELECT t.id, t.merchant_name, t.amount, t.type, t.date, a.name as account_name
      FROM transactions t
      LEFT JOIN accounts a ON a.id = t.account_id
      WHERE t.user_id = ? AND t.is_deleted = 0
        AND (t.merchant_name LIKE ? OR t.notes LIKE ?)
      ORDER BY t.date DESC
      LIMIT 10
    `).all(user.id, term, term);

    // Search Goals
    const goals = db.prepare(`
      SELECT id, name, target_amount, current_amount
      FROM goals
      WHERE user_id = ? AND name LIKE ?
      LIMIT 5
    `).all(user.id, term);

    // Search Subscriptions
    const subscriptions = db.prepare(`
      SELECT id, name, amount, billing_frequency
      FROM subscriptions
      WHERE user_id = ? AND name LIKE ?
      LIMIT 5
    `).all(user.id, term);

    return NextResponse.json({
      query: q,
      results: {
        accounts,
        categories,
        transactions,
        goals,
        subscriptions,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Search failed' }, { status: 500 });
  }
}

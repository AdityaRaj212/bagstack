import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { FinanceService } from '@/lib/finance-service';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const user = getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json';

    const db = getDb();
    const service = new FinanceService(db);

    if (format === 'csv') {
      const txs = service.getTransactions(user.id, { limit: 10000 });
      let csv = 'Date,Type,Amount,Currency,Account,Category,Merchant,Notes\n';
      for (const t of txs as any[]) {
        const amt = (t.amount / 100).toFixed(2);
        const line = [
          t.date,
          t.type,
          amt,
          t.currency,
          `"${(t.account_name || '').replace(/"/g, '""')}"`,
          `"${(t.category_name || '').replace(/"/g, '""')}"`,
          `"${(t.merchant_name || '').replace(/"/g, '""')}"`,
          `"${(t.notes || '').replace(/"/g, '""')}"`,
        ].join(',');
        csv += line + '\n';
      }

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="finance_transactions_${new Date().toISOString().substring(0, 10)}.csv"`,
        },
      });
    }

    // Complete JSON Backup (All tables)
    const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ?').all(user.id);
    const categories = db.prepare('SELECT * FROM categories WHERE user_id = ?').all(user.id);
    const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ?').all(user.id);
    const splits = db.prepare('SELECT * FROM transaction_splits WHERE transaction_id IN (SELECT id FROM transactions WHERE user_id = ?)').all(user.id);
    const budgets = db.prepare('SELECT * FROM budgets WHERE user_id = ?').all(user.id);
    const goals = db.prepare('SELECT * FROM goals WHERE user_id = ?').all(user.id);
    const subscriptions = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').all(user.id);
    const recurring = db.prepare('SELECT * FROM recurring_transactions WHERE user_id = ?').all(user.id);
    const investments = db.prepare('SELECT * FROM investments WHERE user_id = ?').all(user.id);
    const loans = db.prepare('SELECT * FROM loans WHERE user_id = ?').all(user.id);
    const tags = db.prepare('SELECT * FROM tags WHERE user_id = ?').all(user.id);

    const backup = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      user: { id: user.id, email: user.email, name: user.name, currency: user.baseCurrency },
      data: {
        accounts,
        categories,
        transactions,
        splits,
        budgets,
        goals,
        subscriptions,
        recurring,
        investments,
        loans,
        tags,
      },
    };

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="finance_backup_${new Date().toISOString().substring(0, 10)}.json"`,
      },
    });
  } catch (error: any) {
    const status = error.message?.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: error.message || 'Export failed' }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUser(req);
    const backup = await req.json();

    if (!backup.data || !backup.version) {
      return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 });
    }

    const db = getDb();
    const { accounts, categories, transactions, budgets, goals, subscriptions, recurring, investments, loans } = backup.data;

    // Restore inside transaction
    db.exec('BEGIN TRANSACTION;');
    try {
      if (Array.isArray(accounts)) {
        for (const a of accounts) {
          db.prepare(`
            INSERT OR REPLACE INTO accounts (id, user_id, name, institution, type, currency, opening_balance, current_balance, credit_limit, icon, color, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(a.id, user.id, a.name, a.institution, a.type, a.currency, a.opening_balance, a.current_balance, a.credit_limit, a.icon, a.color, a.notes);
        }
      }

      if (Array.isArray(categories)) {
        for (const c of categories) {
          db.prepare(`
            INSERT OR REPLACE INTO categories (id, user_id, parent_id, name, type, icon, color, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(c.id, user.id, c.parent_id, c.name, c.type, c.icon, c.color, c.sort_order);
        }
      }

      if (Array.isArray(transactions)) {
        for (const t of transactions) {
          db.prepare(`
            INSERT OR REPLACE INTO transactions (id, user_id, account_id, type, amount, currency, date, merchant_name, category_id, notes, status, transfer_group_id, destination_account_id, transfer_peer_account_id, is_deleted)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(t.id, user.id, t.account_id, t.type, t.amount, t.currency, t.date, t.merchant_name, t.category_id, t.notes, t.status, t.transfer_group_id, t.destination_account_id, t.transfer_peer_account_id, t.is_deleted || 0);
        }
      }

      if (Array.isArray(budgets)) {
        for (const b of budgets) {
          db.prepare('INSERT OR REPLACE INTO budgets (id, user_id, category_id, amount, period_type) VALUES (?, ?, ?, ?, ?)')
            .run(b.id, user.id, b.category_id, b.amount, b.period_type);
        }
      }

      if (Array.isArray(goals)) {
        for (const g of goals) {
          db.prepare('INSERT OR REPLACE INTO goals (id, user_id, name, target_amount, current_amount, target_date) VALUES (?, ?, ?, ?, ?, ?)')
            .run(g.id, user.id, g.name, g.target_amount, g.current_amount, g.target_date);
        }
      }

      if (Array.isArray(subscriptions)) {
        for (const s of subscriptions) {
          db.prepare('INSERT OR REPLACE INTO subscriptions (id, user_id, name, amount, billing_frequency, next_billing_date, account_id, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .run(s.id, user.id, s.name, s.amount, s.billing_frequency, s.next_billing_date, s.account_id, s.category_id);
        }
      }

      db.exec('COMMIT;');
      return NextResponse.json({ success: true, message: 'Backup restored successfully' });
    } catch (e) {
      db.exec('ROLLBACK;');
      throw e;
    }
  } catch (error: any) {
    const status = error.message?.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: error.message || 'Restore failed' }, { status });
  }
}

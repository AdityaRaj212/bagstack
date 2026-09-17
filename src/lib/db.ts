import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

let globalDb: any = null;
let syncTimer: any = null;
let lastSyncTime = 0;

export function syncTurso(force = false) {
  if (globalDb && typeof globalDb.sync === 'function') {
    const now = Date.now();
    // On reads, sync at most once every 1500ms; on writes (force=true), sync immediately
    if (force || now - lastSyncTime > 1500) {
      try {
        globalDb.sync();
        lastSyncTime = Date.now();
      } catch (e) {
        console.warn('[TURSO SYNC ERROR]', e);
      }
    }
  }
}

function attachAutoSync(db: any) {
  if (!db || typeof db.prepare !== 'function' || typeof db.sync !== 'function') return;
  const originalPrepare = db.prepare.bind(db);
  db.prepare = function (sql: string) {
    const stmt = originalPrepare(sql);
    const isWrite = /^\s*(INSERT|UPDATE|DELETE|REPLACE|ALTER|CREATE|DROP)\b/i.test(sql);
    if (isWrite && typeof stmt.run === 'function') {
      const originalRun = stmt.run.bind(stmt);
      stmt.run = function (...args: any[]) {
        const result = originalRun(...args);
        syncTurso(true); // Push changes to Turso cloud immediately on write!
        return result;
      };
    }
    return stmt;
  };
}

export function getDb(dbPath?: string): any {
  if (globalDb && !dbPath) {
    syncTurso(false); // Quick pull (80ms) if last sync was > 1.5s ago
    return globalDb;
  }

  let resolvedPath = dbPath;
  if (!resolvedPath) {
    const isVercel = Boolean(process.env.VERCEL);
    const dataDir = isVercel ? '/tmp' : path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        console.warn('[DB] Could not create data directory:', err);
      }
    }
    resolvedPath = path.join(dataDir, 'finance.db');
  }

  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  let db: any;
  if (tursoUrl && tursoToken && !dbPath) {
    try {
      // Use native Libsql with cloud sync to Turso
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const LibsqlDatabase = require('libsql');
      try {
        db = new LibsqlDatabase(resolvedPath, { syncUrl: tursoUrl, authToken: tursoToken });
      } catch (openErr: any) {
        if (openErr?.message?.includes('InvalidLocalState') || openErr?.message?.includes('metadata')) {
          console.warn('[TURSO] Self-healing local replica state...');
          for (const ext of ['', '-info', '-wal', '-shm']) {
            try { fs.unlinkSync(resolvedPath + ext); } catch {}
          }
          db = new LibsqlDatabase(resolvedPath, { syncUrl: tursoUrl, authToken: tursoToken });
        } else {
          throw openErr;
        }
      }
      console.log('[TURSO] Connected to Turso cloud SQLite at:', tursoUrl);
      try {
        db.sync();
        lastSyncTime = Date.now();
        console.log('[TURSO] Successfully synchronized with Turso cloud.');
      } catch (syncErr) {
        console.warn('[TURSO] Initial sync warning:', syncErr);
      }

      // Automatically sync writes to Turso cloud
      attachAutoSync(db);

      // Schedule periodic background sync every 15 seconds
      if (!syncTimer && typeof setInterval !== 'undefined') {
        syncTimer = setInterval(() => {
          syncTurso(false);
        }, 15000);
        if (syncTimer?.unref) syncTimer.unref();
      }
    } catch (err) {
      console.warn('[TURSO] Falling back to local node:sqlite:', err);
      db = new DatabaseSync(resolvedPath);
    }
  } else {
    db = new DatabaseSync(resolvedPath);
  }
  
  // Pragmas for performance and integrity
  try {
    db.exec('PRAGMA foreign_keys = ON;');
  } catch {}
  try {
    db.exec('PRAGMA journal_mode = WAL;');
  } catch {
    // Memory dbs may not support WAL
  }

  initSchema(db);

  if (!dbPath) {
    globalDb = db;
  }
  return db;
}

export function initSchema(db: DatabaseSync) {
  // Fast path: Check if tables are already created & migrated (0ms vs 4000ms cold start)
  try {
    const isReady = (db as any).prepare("SELECT 1 FROM pragma_table_info('goals') WHERE name = 'notes'").get();
    if (isReady) {
      return;
    }
  } catch {
    // Needs full initialization
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      base_currency TEXT DEFAULT 'INR',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      institution TEXT DEFAULT '',
      type TEXT NOT NULL, -- 'bank' | 'savings' | 'current' | 'cash' | 'credit_card' | 'fixed_deposit' | 'recurring_deposit' | 'investment' | 'loan' | 'asset' | 'liability'
      currency TEXT DEFAULT 'INR',
      opening_balance INTEGER NOT NULL DEFAULT 0, -- minor units (paise)
      current_balance INTEGER NOT NULL DEFAULT 0, -- minor units (paise)
      credit_limit INTEGER DEFAULT 0, -- for credit cards
      billing_cycle_day INTEGER DEFAULT 1,
      due_date_day INTEGER DEFAULT 20,
      interest_rate REAL DEFAULT 0,
      icon TEXT DEFAULT 'wallet',
      color TEXT DEFAULT '#4F46E5',
      notes TEXT DEFAULT '',
      include_in_net_worth INTEGER DEFAULT 1,
      is_hidden INTEGER DEFAULT 0,
      is_default INTEGER DEFAULT 0,
      archived INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      parent_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'expense' | 'income'
      icon TEXT DEFAULT 'tag',
      color TEXT DEFAULT '#6B7280',
      sort_order INTEGER DEFAULT 0,
      archived INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS merchants (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      default_category_id TEXT,
      transaction_count INTEGER DEFAULT 1,
      last_used_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (default_category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      type TEXT NOT NULL, -- 'expense' | 'income' | 'transfer'
      amount INTEGER NOT NULL, -- minor units (paise), positive
      currency TEXT DEFAULT 'INR',
      date TEXT NOT NULL, -- YYYY-MM-DD
      merchant_id TEXT,
      merchant_name TEXT,
      category_id TEXT,
      notes TEXT,
      status TEXT DEFAULT 'cleared', -- 'pending' | 'cleared' | 'reconciled'
      cleared INTEGER DEFAULT 1,
      reconciled INTEGER DEFAULT 0,
      recurring_id TEXT,
      transfer_group_id TEXT, -- pairs the 2 sides of a transfer
      transfer_peer_account_id TEXT, -- for display convenience
      destination_account_id TEXT, -- for outgoing transfer target
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS transaction_splits (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      category_id TEXT,
      amount INTEGER NOT NULL, -- minor units
      notes TEXT,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#3B82F6',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transaction_tags (
      transaction_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (transaction_id, tag_id),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      condition_field TEXT NOT NULL, -- 'merchant' | 'notes' | 'amount' | 'account'
      condition_operator TEXT NOT NULL, -- 'contains' | 'equals' | 'starts_with'
      condition_value TEXT NOT NULL,
      action_category_id TEXT NOT NULL,
      priority INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (action_category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      amount INTEGER NOT NULL, -- minor units
      period_type TEXT DEFAULT 'monthly',
      period_start TEXT,
      period_end TEXT,
      rollover INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      target_amount INTEGER NOT NULL, -- minor units
      current_amount INTEGER NOT NULL DEFAULT 0,
      target_date TEXT NOT NULL, -- YYYY-MM-DD
      monthly_target INTEGER DEFAULT 0,
      notes TEXT,
      status TEXT DEFAULT 'in_progress', -- 'in_progress' | 'completed' | 'paused'
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      frequency TEXT NOT NULL, -- 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
      next_date TEXT NOT NULL,
      end_date TEXT,
      merchant TEXT,
      category_id TEXT,
      notes TEXT,
      auto_add INTEGER DEFAULT 1,
      is_subscription INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount INTEGER NOT NULL, -- minor units
      billing_frequency TEXT DEFAULT 'monthly', -- 'monthly' | 'yearly' | 'quarterly' | 'weekly'
      next_billing_date TEXT NOT NULL,
      account_id TEXT NOT NULL,
      category_id TEXT,
      status TEXT DEFAULT 'active', -- 'active' | 'cancelled' | 'paused'
      auto_deduct INTEGER DEFAULT 1,
      last_paid_date TEXT,
      payment_status TEXT DEFAULT 'pending', -- 'pending' | 'paid' | 'overdue'
      notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS investments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      asset_type TEXT NOT NULL, -- 'stock' | 'mutual_fund' | 'etf' | 'crypto' | 'gold' | 'fd' | 'other'
      quantity REAL NOT NULL DEFAULT 1,
      cost_basis INTEGER NOT NULL, -- minor units total
      current_price INTEGER NOT NULL, -- minor units per unit
      current_value INTEGER NOT NULL, -- minor units total
      notes TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      name TEXT NOT NULL,
      principal INTEGER NOT NULL,
      outstanding_principal INTEGER NOT NULL,
      interest_rate REAL NOT NULL, -- percentage e.g. 8.5
      emi_amount INTEGER NOT NULL,
      tenure_months INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      emi_day INTEGER DEFAULT 5,
      type TEXT DEFAULT 'loan',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reconciliations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      statement_date TEXT NOT NULL,
      statement_balance INTEGER NOT NULL,
      reconciled_balance INTEGER NOT NULL,
      difference INTEGER NOT NULL,
      status TEXT DEFAULT 'balanced',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT NOT NULL,
      pref_key TEXT NOT NULL,
      pref_value TEXT NOT NULL,
      PRIMARY KEY (user_id, pref_key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS email_otps (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Performance indexes
    CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_tx_transfer_group ON transactions(transfer_group_id);
    CREATE INDEX IF NOT EXISTS idx_merchants_user_norm ON merchants(user_id, normalized_name);
    CREATE INDEX IF NOT EXISTS idx_otps_email ON email_otps(email);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token);
  `);

  // Safe migration for existing databases
  const safeAlterations = [
    `ALTER TABLE accounts ADD COLUMN is_default INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN owner_email TEXT`,
    `ALTER TABLE subscriptions ADD COLUMN billing_frequency TEXT DEFAULT 'monthly'`,
    `ALTER TABLE subscriptions ADD COLUMN auto_deduct INTEGER DEFAULT 1`,
    `ALTER TABLE subscriptions ADD COLUMN last_paid_date TEXT`,
    `ALTER TABLE subscriptions ADD COLUMN payment_status TEXT DEFAULT 'pending'`,
    `ALTER TABLE subscriptions ADD COLUMN notes TEXT`,
    `ALTER TABLE goals ADD COLUMN notes TEXT`,
    `ALTER TABLE goals ADD COLUMN monthly_target INTEGER DEFAULT 0`,
    `ALTER TABLE goals ADD COLUMN status TEXT DEFAULT 'in_progress'`,
    `ALTER TABLE transactions ADD COLUMN merchant_name TEXT`,
    `ALTER TABLE transactions ADD COLUMN cleared INTEGER DEFAULT 1`,
    `ALTER TABLE transactions ADD COLUMN reconciled INTEGER DEFAULT 0`,
    `ALTER TABLE transactions ADD COLUMN recurring_id TEXT`,
    `ALTER TABLE transactions ADD COLUMN transfer_peer_account_id TEXT`,
    `ALTER TABLE transactions ADD COLUMN destination_account_id TEXT`,
    `ALTER TABLE budgets ADD COLUMN period_type TEXT DEFAULT 'monthly'`,
    `ALTER TABLE budgets ADD COLUMN period_start TEXT`,
    `ALTER TABLE budgets ADD COLUMN period_end TEXT`,
    `ALTER TABLE budgets ADD COLUMN rollover INTEGER DEFAULT 0`,
    `ALTER TABLE investments ADD COLUMN asset_type TEXT DEFAULT 'stock'`,
    `ALTER TABLE investments ADD COLUMN cost_basis INTEGER DEFAULT 0`,
    `ALTER TABLE loans ADD COLUMN principal INTEGER DEFAULT 0`,
    `ALTER TABLE loans ADD COLUMN outstanding_principal INTEGER DEFAULT 0`,
    `ALTER TABLE loans ADD COLUMN tenure_months INTEGER DEFAULT 12`,
    `ALTER TABLE loans ADD COLUMN emi_day INTEGER DEFAULT 5`,
    `ALTER TABLE loans ADD COLUMN type TEXT DEFAULT 'loan'`,
    `ALTER TABLE loans ADD COLUMN notes TEXT`,
  ];

  for (const sql of safeAlterations) {
    try {
      db.exec(sql);
    } catch {
      // Column already exists or table does not need migration
    }
  }

  try {
    db.exec(`UPDATE users SET owner_email = email WHERE owner_email IS NULL OR owner_email = ''`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_users_owner_email ON users(owner_email)`);
  } catch {
    // Ignore
  }
}

/**
 * Seed default categories for a user if none exist
 */
export function seedDefaultCategories(db: DatabaseSync, userId: string) {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM categories WHERE user_id = ?');
  const result = countStmt.get(userId) as { count: number } | undefined;
  if (result && result.count > 0) return;

  const defaultCategories: Array<{
    id: string;
    parent_id?: string;
    name: string;
    type: 'expense' | 'income';
    icon: string;
    color: string;
    sort_order: number;
    subcategories?: Array<{ id: string; name: string; icon: string }>;
  }> = [
    {
      id: 'cat-food',
      name: 'Food & Dining',
      type: 'expense',
      icon: 'utensils',
      color: '#EF4444',
      sort_order: 1,
      subcategories: [
        { id: 'cat-food-groceries', name: 'Groceries', icon: 'shopping-cart' },
        { id: 'cat-food-restaurants', name: 'Restaurants', icon: 'coffee' },
        { id: 'cat-food-delivery', name: 'Food Delivery', icon: 'bike' },
        { id: 'cat-food-coffee', name: 'Coffee & Snacks', icon: 'cup-soda' },
      ],
    },
    {
      id: 'cat-transport',
      name: 'Transportation',
      type: 'expense',
      icon: 'car',
      color: '#F59E0B',
      sort_order: 2,
      subcategories: [
        { id: 'cat-trans-fuel', name: 'Fuel', icon: 'fuel' },
        { id: 'cat-trans-cab', name: 'Cab & Auto', icon: 'car-taxi' },
        { id: 'cat-trans-public', name: 'Public Transit', icon: 'train' },
        { id: 'cat-trans-maint', name: 'Vehicle Maintenance', icon: 'wrench' },
      ],
    },
    {
      id: 'cat-housing',
      name: 'Housing & Utilities',
      type: 'expense',
      icon: 'home',
      color: '#3B82F6',
      sort_order: 3,
      subcategories: [
        { id: 'cat-house-rent', name: 'Rent', icon: 'key' },
        { id: 'cat-house-elec', name: 'Electricity & Gas', icon: 'zap' },
        { id: 'cat-house-net', name: 'Internet & Mobile', icon: 'wifi' },
        { id: 'cat-house-maint', name: 'Maintenance', icon: 'tool' },
      ],
    },
    {
      id: 'cat-shopping',
      name: 'Shopping & Electronics',
      type: 'expense',
      icon: 'shopping-bag',
      color: '#EC4899',
      sort_order: 4,
      subcategories: [
        { id: 'cat-shop-clothes', name: 'Clothing', icon: 'shirt' },
        { id: 'cat-shop-gadgets', name: 'Electronics', icon: 'laptop' },
        { id: 'cat-shop-home', name: 'Home Essentials', icon: 'package' },
      ],
    },
    {
      id: 'cat-entertainment',
      name: 'Entertainment & Leisure',
      type: 'expense',
      icon: 'film',
      color: '#8B5CF6',
      sort_order: 5,
      subcategories: [
        { id: 'cat-ent-streaming', name: 'Streaming Services', icon: 'tv' },
        { id: 'cat-ent-movies', name: 'Movies & Events', icon: 'ticket' },
        { id: 'cat-ent-games', name: 'Games & Apps', icon: 'gamepad' },
      ],
    },
    {
      id: 'cat-health',
      name: 'Health & Wellness',
      type: 'expense',
      icon: 'heart-pulse',
      color: '#10B981',
      sort_order: 6,
      subcategories: [
        { id: 'cat-hlth-meds', name: 'Medicines & Pharmacy', icon: 'pill' },
        { id: 'cat-hlth-doctor', name: 'Doctor & Hospital', icon: 'stethoscope' },
        { id: 'cat-hlth-fitness', name: 'Gym & Fitness', icon: 'activity' },
      ],
    },
    {
      id: 'cat-finance',
      name: 'Financial Expenses',
      type: 'expense',
      icon: 'credit-card',
      color: '#64748B',
      sort_order: 7,
      subcategories: [
        { id: 'cat-fin-emi', name: 'Loan EMI / Interest', icon: 'percent' },
        { id: 'cat-fin-charges', name: 'Bank Charges & Fees', icon: 'receipt' },
        { id: 'cat-fin-insurance', name: 'Insurance Premium', icon: 'shield' },
        { id: 'cat-fin-tax', name: 'Taxes', icon: 'file-text' },
      ],
    },
    {
      id: 'cat-savings',
      name: 'Savings & Goals',
      type: 'expense',
      icon: 'piggy-bank',
      color: '#06B6D4',
      sort_order: 8,
      subcategories: [
        { id: 'cat-sav-goal', name: 'Savings Goal Contribution', icon: 'target' },
        { id: 'cat-sav-invest', name: 'Investments & Mutual Funds', icon: 'trending-up' },
        { id: 'cat-sav-emergency', name: 'Emergency Fund', icon: 'shield-check' },
      ],
    },
    {
      id: 'cat-income-salary',
      name: 'Salary & Professional',
      type: 'income',
      icon: 'briefcase',
      color: '#10B981',
      sort_order: 8,
      subcategories: [
        { id: 'cat-inc-fulltime', name: 'Full-time Salary', icon: 'wallet' },
        { id: 'cat-inc-bonus', name: 'Bonus & Incentives', icon: 'award' },
        { id: 'cat-inc-freelance', name: 'Freelance & Consulting', icon: 'laptop' },
      ],
    },
    {
      id: 'cat-income-investment',
      name: 'Investments & Returns',
      type: 'income',
      icon: 'trending-up',
      color: '#06B6D4',
      sort_order: 9,
      subcategories: [
        { id: 'cat-inc-dividend', name: 'Dividends & Capital Gains', icon: 'coins' },
        { id: 'cat-inc-interest', name: 'Interest Income', icon: 'piggy-bank' },
      ],
    },
    {
      id: 'cat-income-other',
      name: 'Other Income',
      type: 'income',
      icon: 'plus-circle',
      color: '#14B8A6',
      sort_order: 10,
      subcategories: [
        { id: 'cat-inc-refund', name: 'Refunds & Reimbursements', icon: 'rotate-ccw' },
        { id: 'cat-inc-gifts', name: 'Gifts & Grants', icon: 'gift' },
      ],
    },
  ];

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO categories (id, user_id, parent_id, name, type, icon, color, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const parent of defaultCategories) {
    insertStmt.run(parent.id, userId, null, parent.name, parent.type, parent.icon, parent.color, parent.sort_order);
    if (parent.subcategories) {
      parent.subcategories.forEach((sub, idx) => {
        insertStmt.run(sub.id, userId, parent.id, sub.name, parent.type, sub.icon, parent.color, idx + 1);
      });
    }
  }
}

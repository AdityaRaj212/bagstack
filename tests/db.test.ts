import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { initSchema, seedDefaultCategories } from '../src/lib/db';

describe('Database Schema and Seeding', () => {
  it('initializes schema and tables correctly in SQLite', () => {
    const db = new DatabaseSync(':memory:');
    initSchema(db);

    const tablesStmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table'");
    const tables = tablesStmt.all() as Array<{ name: string }>;
    const tableNames = tables.map(t => t.name);

    expect(tableNames).toContain('users');
    expect(tableNames).toContain('accounts');
    expect(tableNames).toContain('categories');
    expect(tableNames).toContain('transactions');
    expect(tableNames).toContain('transaction_splits');
    expect(tableNames).toContain('budgets');
    expect(tableNames).toContain('goals');
    expect(tableNames).toContain('subscriptions');
    expect(tableNames).toContain('investments');
    expect(tableNames).toContain('loans');
    expect(tableNames).toContain('rules');
    expect(tableNames).toContain('merchants');
  });

  it('seeds default categories and subcategories for a user', () => {
    const db = new DatabaseSync(':memory:');
    initSchema(db);

    const userId = 'user_test_1';
    db.prepare("INSERT INTO users (id, email, name) VALUES (?, ?, ?)").run(userId, 'test@wallet.local', 'Test User');

    seedDefaultCategories(db, userId);

    const catStmt = db.prepare("SELECT COUNT(*) as count FROM categories WHERE user_id = ?");
    const count = (catStmt.get(userId) as { count: number }).count;
    expect(count).toBeGreaterThan(20);

    const foodSubcats = db.prepare("SELECT name FROM categories WHERE parent_id = 'cat-food'").all() as Array<{ name: string }>;
    const names = foodSubcats.map(c => c.name);
    expect(names).toContain('Groceries');
    expect(names).toContain('Food Delivery');
  });
});

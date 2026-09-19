import { DatabaseSync } from 'node:sqlite';
import { getDb, syncTurso } from './db';
import { toMinorUnits, addMoney, subtractMoney, sumMoney } from './money';

export interface CreateAccountDTO {
  userId: string;
  name: string;
  institution?: string;
  type: string;
  currency?: string;
  openingBalance: number; // in minor units
  creditLimit?: number;
  billingCycleDay?: number;
  dueDateDay?: number;
  interestRate?: number;
  icon?: string;
  color?: string;
  notes?: string;
  includeInNetWorth?: boolean;
  isDefault?: boolean;
}

export interface CreateTransactionDTO {
  userId: string;
  accountId: string;
  type: 'expense' | 'income' | 'transfer';
  amount: number; // in minor units, positive
  currency?: string;
  date: string; // YYYY-MM-DD
  merchantName?: string;
  categoryId?: string;
  notes?: string;
  destinationAccountId?: string; // for transfer
  status?: 'pending' | 'cleared' | 'reconciled';
  splits?: Array<{ categoryId: string; amount: number; notes?: string }>;
  tags?: string[];
}

export class FinanceService {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDb();
  }

  // --- ACCOUNTS ---

  getAccounts(userId: string) {
    const stmt = this.db.prepare(`
      SELECT * FROM accounts 
      WHERE user_id = ? AND archived = 0 
      ORDER BY is_default DESC, sort_order ASC, created_at ASC
    `);
    const rows = stmt.all(userId) as any[];

    const hasDefault = rows.some(r => Boolean(r.is_default));
    if (!hasDefault && rows.length > 0) {
      const firstAsset = rows.find(r => r.type !== 'credit_card' && r.type !== 'loan') || rows[0];
      this.db.prepare('UPDATE accounts SET is_default = 1 WHERE id = ? AND user_id = ?').run(firstAsset.id, userId);
      firstAsset.is_default = 1;
    }

    const emiMap = new Map<string, number>();
    try {
      const emiRows = this.db.prepare(`
        SELECT account_id, COALESCE(SUM(outstanding_principal), 0) as total_emi
        FROM loans
        WHERE user_id = ?
        GROUP BY account_id
      `).all(userId) as any[];
      for (const r of emiRows) {
        emiMap.set(r.account_id, r.total_emi);
      }
    } catch {
      // Table might not exist yet during migration
    }

    return rows.map(acc => {
      const isCreditCard = acc.type === 'credit_card';
      const isLiability = isCreditCard || acc.type === 'loan' || acc.type === 'liability';
      const emiOutstanding = emiMap.get(acc.id) || 0;
      const directDebt = Math.max(0, acc.current_balance);
      const totalDebt = isCreditCard
        ? (directDebt + emiOutstanding)
        : (isLiability ? (directDebt + emiOutstanding) : acc.current_balance);
      const availableCredit = isCreditCard
        ? Math.max(0, acc.credit_limit - (directDebt + emiOutstanding))
        : 0;
      const utilizationRate = (isCreditCard && acc.credit_limit > 0)
        ? Math.min(100, Math.round(((directDebt + emiOutstanding) / acc.credit_limit) * 100))
        : 0;

      return {
        ...acc,
        isLiability,
        emiOutstanding,
        totalDebt,
        availableCredit,
        utilizationRate,
        is_default: Boolean(acc.is_default),
      };
    });
  }

  getAccountById(id: string, userId: string) {
    const stmt = this.db.prepare(`
      SELECT * FROM accounts WHERE id = ? AND user_id = ?
    `);
    const acc = stmt.get(id, userId) as any;
    if (!acc) return null;

    let emiOutstanding = 0;
    try {
      const emiRow = this.db.prepare(`
        SELECT COALESCE(SUM(outstanding_principal), 0) as total_emi
        FROM loans
        WHERE user_id = ? AND account_id = ?
      `).get(userId, id) as any;
      emiOutstanding = emiRow?.total_emi || 0;
    } catch {}

    const isCreditCard = acc.type === 'credit_card';
    const isLiability = isCreditCard || acc.type === 'loan' || acc.type === 'liability';
    const directDebt = Math.max(0, acc.current_balance);
    const totalDebt = isCreditCard
      ? (directDebt + emiOutstanding)
      : (isLiability ? (directDebt + emiOutstanding) : acc.current_balance);
    const availableCredit = isCreditCard
      ? Math.max(0, acc.credit_limit - (directDebt + emiOutstanding))
      : 0;
    const utilizationRate = (isCreditCard && acc.credit_limit > 0)
      ? Math.min(100, Math.round(((directDebt + emiOutstanding) / acc.credit_limit) * 100))
      : 0;

    return {
      ...acc,
      isLiability,
      emiOutstanding,
      totalDebt,
      availableCredit,
      utilizationRate,
      is_default: Boolean(acc.is_default),
    };
  }

  setDefaultAccount(userId: string, accountId: string) {
    const account = this.getAccountById(accountId, userId);
    if (!account) throw new Error('Account not found');

    this.db.prepare('UPDATE accounts SET is_default = 0 WHERE user_id = ?').run(userId);
    this.db.prepare('UPDATE accounts SET is_default = 1 WHERE id = ? AND user_id = ?').run(accountId, userId);

    return this.getAccountById(accountId, userId);
  }

  createAccount(data: CreateAccountDTO) {
    const id = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const currency = data.currency || 'INR';
    const openingBalance = Math.round(data.openingBalance || 0);
    // For normal accounts, current balance starts at openingBalance.
    // For credit cards, opening balance is typically current outstanding balance (debt).
    const currentBalance = openingBalance;

    const countRow = this.db.prepare('SELECT COUNT(*) as c FROM accounts WHERE user_id = ?').get(data.userId) as any;
    const isFirstAccount = (countRow?.c || 0) === 0;
    const shouldBeDefault = data.isDefault || isFirstAccount;

    if (shouldBeDefault) {
      this.db.prepare('UPDATE accounts SET is_default = 0 WHERE user_id = ?').run(data.userId);
    }

    const stmt = this.db.prepare(`
      INSERT INTO accounts (
        id, user_id, name, institution, type, currency,
        opening_balance, current_balance, credit_limit,
        billing_cycle_day, due_date_day, interest_rate,
        icon, color, notes, include_in_net_worth, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.userId,
      data.name,
      data.institution || '',
      data.type,
      currency,
      openingBalance,
      currentBalance,
      data.creditLimit || 0,
      data.billingCycleDay || 1,
      data.dueDateDay || 20,
      data.interestRate || 0,
      data.icon || (data.type === 'credit_card' ? 'credit-card' : 'wallet'),
      data.color || '#4F46E5',
      data.notes || '',
      data.includeInNetWorth !== false ? 1 : 0,
      shouldBeDefault ? 1 : 0
    );

    return this.getAccountById(id, data.userId)!;
  }

  deleteAccount(id: string, userId: string) {
    const acc = this.getAccountById(id, userId);
    if (!acc) throw new Error('Account not found');

    this.db.prepare('DELETE FROM accounts WHERE id = ? AND user_id = ?').run(id, userId);
    this.db.prepare('DELETE FROM transactions WHERE account_id = ? AND user_id = ?').run(id, userId);

    // If default account was deleted, ensure another account becomes default
    const remaining = this.db.prepare('SELECT id FROM accounts WHERE user_id = ? LIMIT 1').get(userId) as any;
    if (remaining) {
      this.setDefaultAccount(userId, remaining.id);
    }
    return { success: true };
  }

  updateAccount(id: string, userId: string, data: Partial<CreateAccountDTO>) {
    const current = this.getAccountById(id, userId);
    if (!current) throw new Error('Account not found');

    const stmt = this.db.prepare(`
      UPDATE accounts SET
        name = COALESCE(?, name),
        institution = COALESCE(?, institution),
        type = COALESCE(?, type),
        opening_balance = COALESCE(?, opening_balance),
        credit_limit = COALESCE(?, credit_limit),
        icon = COALESCE(?, icon),
        color = COALESCE(?, color),
        notes = COALESCE(?, notes),
        include_in_net_worth = COALESCE(?, include_in_net_worth),
        updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(
      data.name ?? null,
      data.institution ?? null,
      data.type ?? null,
      data.openingBalance !== undefined ? data.openingBalance : null,
      data.creditLimit ?? null,
      data.icon ?? null,
      data.color ?? null,
      data.notes ?? null,
      data.includeInNetWorth !== undefined ? (data.includeInNetWorth ? 1 : 0) : null,
      id,
      userId
    );

    // If opening_balance was updated, recalculate current_balance!
    if (data.openingBalance !== undefined) {
      this.recalculateAccountBalance(id);
    }

    return this.getAccountById(id, userId);
  }

  // --- RECALCULATE ACCOUNT BALANCE ---
  recalculateAccountBalance(accountId: string) {
    const acc = this.db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId) as any;
    if (!acc) return;

    let balance = acc.opening_balance;
    const isCreditCard = acc.type === 'credit_card';

    // Sum all non-deleted transactions for this account
    const txs = this.db.prepare(`
      SELECT type, amount, transfer_group_id, transfer_peer_account_id, destination_account_id
      FROM transactions 
      WHERE account_id = ? AND is_deleted = 0
    `).all(accountId) as any[];

    for (const tx of txs) {
      if (tx.type === 'income') {
        if (isCreditCard) {
          balance -= tx.amount; // income/refund reduces credit card balance
        } else {
          balance += tx.amount;
        }
      } else if (tx.type === 'expense') {
        if (isCreditCard) {
          balance += tx.amount; // expense on credit card increases debt
        } else {
          balance -= tx.amount;
        }
      } else if (tx.type === 'transfer') {
        // A transfer out (has destination_account_id) decreases balance
        // A transfer in (has transfer_peer_account_id) increases balance (or reduces credit card debt!)
        if (tx.destination_account_id) {
          // Outgoing transfer
          if (isCreditCard) {
            balance += tx.amount; // cash advance from credit card increases debt
          } else {
            balance -= tx.amount; // bank sending money decreases balance
          }
        } else {
          // Incoming transfer
          if (isCreditCard) {
            balance -= tx.amount; // paying credit card decreases debt!
          } else {
            balance += tx.amount;
          }
        }
      }
    }

    this.db.prepare("UPDATE accounts SET current_balance = ?, updated_at = datetime('now') WHERE id = ?")
      .run(balance, accountId);

    return balance;
  }

  // --- MERCHANTS & AUTO-CATEGORIZATION ---

  findOrCreateMerchant(userId: string, merchantName: string, categoryId?: string) {
    if (!merchantName || !merchantName.trim()) return null;
    const raw = merchantName.trim();
    const normalized = raw.toLowerCase().replace(/[^a-z0-9]/g, '');

    const existing = this.db.prepare(`
      SELECT * FROM merchants WHERE user_id = ? AND normalized_name = ?
    `).get(userId, normalized) as any;

    if (existing) {
      this.db.prepare(`
        UPDATE merchants 
        SET transaction_count = transaction_count + 1,
            last_used_at = datetime('now'),
            default_category_id = COALESCE(?, default_category_id)
        WHERE id = ?
      `).run(categoryId || null, existing.id);
      return existing.id;
    }

    const id = `mer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.db.prepare(`
      INSERT INTO merchants (id, user_id, name, normalized_name, default_category_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, raw, normalized, categoryId || null);

    return id;
  }

  getMerchants(userId: string) {
    return this.db.prepare(`
      SELECT m.*, c.name as default_category_name, c.color as default_category_color
      FROM merchants m
      LEFT JOIN categories c ON c.id = m.default_category_id
      WHERE m.user_id = ?
      ORDER BY m.last_used_at DESC, m.transaction_count DESC
    `).all(userId) as any[];
  }

  deleteMerchant(userId: string, id: string) {
    this.db.prepare('DELETE FROM merchants WHERE id = ? AND user_id = ?').run(id, userId);
    return { success: true };
  }

  // --- TAGS ---

  getTags(userId: string) {
    return this.db.prepare(`
      SELECT t.*, 
             COUNT(DISTINCT CASE WHEN tx.transfer_group_id IS NOT NULL THEN tx.transfer_group_id ELSE tt.transaction_id END) as transaction_count
      FROM tags t
      LEFT JOIN transaction_tags tt ON tt.tag_id = t.id
      LEFT JOIN transactions tx ON tx.id = tt.transaction_id AND tx.is_deleted = 0
      WHERE t.user_id = ?
      GROUP BY t.id
      ORDER BY transaction_count DESC, t.name ASC
    `).all(userId) as any[];
  }

  createTag(userId: string, name: string, color = '#3B82F6') {
    const clean = name.trim().replace(/^#/, '');
    if (!clean) throw new Error('Tag name is required');

    const existing = this.db.prepare('SELECT * FROM tags WHERE user_id = ? AND LOWER(name) = ?').get(userId, clean.toLowerCase()) as any;
    if (existing) return existing;

    const id = `tag_${userId}_${clean.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    this.db.prepare('INSERT INTO tags (id, user_id, name, color) VALUES (?, ?, ?, ?)').run(id, userId, clean, color);
    return { id, user_id: userId, name: clean, color };
  }

  updateTag(userId: string, id: string, data: { name?: string; color?: string }) {
    const existing = this.db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) throw new Error('Tag not found');

    let newName = existing.name;
    if (data.name !== undefined) {
      const clean = data.name.trim().replace(/^#/, '');
      if (!clean) throw new Error('Tag name cannot be empty');
      newName = clean;
    }
    const newColor = data.color || existing.color || '#3B82F6';

    // If renaming to a name that matches an existing tag, merge them smoothly
    if (newName.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = this.db.prepare(
        'SELECT * FROM tags WHERE user_id = ? AND LOWER(name) = ? AND id != ?'
      ).get(userId, newName.toLowerCase(), id) as any;

      if (duplicate) {
        this.db.prepare(`
          INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id)
          SELECT transaction_id, ? FROM transaction_tags WHERE tag_id = ?
        `).run(duplicate.id, id);
        this.db.prepare('DELETE FROM transaction_tags WHERE tag_id = ?').run(id);
        this.db.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').run(id, userId);
        if (data.color) {
          this.db.prepare('UPDATE tags SET color = ? WHERE id = ?').run(newColor, duplicate.id);
        }
        return { ...duplicate, color: newColor };
      }
    }

    this.db.prepare(`
      UPDATE tags SET name = ?, color = ? WHERE id = ? AND user_id = ?
    `).run(newName, newColor, id, userId);

    return { id, user_id: userId, name: newName, color: newColor };
  }

  deleteTag(userId: string, id: string) {
    this.db.prepare('DELETE FROM transaction_tags WHERE tag_id = ?').run(id);
    this.db.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').run(id, userId);
    return { success: true };
  }

  suggestCategory(userId: string, merchantName?: string, notes?: string, amount?: number): string | null {
    // 1. Check rules
    const rules = this.db.prepare(`
      SELECT * FROM rules WHERE user_id = ? ORDER BY priority DESC
    `).all(userId) as any[];

    for (const rule of rules) {
      let targetText = '';
      if (rule.condition_field === 'merchant' && merchantName) targetText = merchantName;
      if (rule.condition_field === 'notes' && notes) targetText = notes;

      const needle = rule.condition_value.toLowerCase();
      const haystack = targetText.toLowerCase();

      if (rule.condition_operator === 'contains' && haystack.includes(needle)) {
        return rule.action_category_id;
      }
      if (rule.condition_operator === 'equals' && haystack === needle) {
        return rule.action_category_id;
      }
      if (rule.condition_operator === 'starts_with' && haystack.startsWith(needle)) {
        return rule.action_category_id;
      }
    }

    // 2. Check merchant historical default
    if (merchantName) {
      const normalized = merchantName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const merchant = this.db.prepare(`
        SELECT default_category_id FROM merchants 
        WHERE user_id = ? AND normalized_name = ? AND default_category_id IS NOT NULL
      `).get(userId, normalized) as any;

      if (merchant && merchant.default_category_id) {
        return merchant.default_category_id;
      }
    }

    return null;
  }

  // --- DUPLICATE DETECTION ---

  checkDuplicate(userId: string, accountId: string, date: string, amount: number, merchantName?: string) {
    // Looks for transactions in the same account with the exact same amount within +/- 2 days
    const duplicates = this.db.prepare(`
      SELECT t.*, a.name as account_name
      FROM transactions t
      JOIN accounts a ON a.id = t.account_id
      WHERE t.user_id = ? 
        AND t.account_id = ?
        AND t.amount = ?
        AND t.is_deleted = 0
        AND date(t.date) BETWEEN date(?, '-2 days') AND date(?, '+2 days')
    `).all(userId, accountId, amount, date, date) as any[];

    if (duplicates.length === 0) return null;

    return {
      isPossibleDuplicate: true,
      existingTransactions: duplicates,
    };
  }

  // --- TRANSACTIONS & TRANSFERS ---

  createTransaction(dto: CreateTransactionDTO) {
    const {
      userId,
      accountId,
      type,
      amount,
      date,
      merchantName,
      categoryId,
      notes,
      destinationAccountId,
      status = 'cleared',
      splits = [],
      tags = [],
    } = dto;

    if (amount <= 0) {
      throw new Error('Transaction amount must be greater than zero');
    }

    // Splits validation: if splits are provided, sum must equal total
    if (splits.length > 0) {
      const splitSum = sumMoney(splits.map(s => s.amount));
      if (splitSum !== amount) {
        throw new Error(`Split amounts total (${splitSum}) does not match transaction amount (${amount})`);
      }
    }

    const account = this.getAccountById(accountId, userId);
    if (!account) throw new Error('Source account not found');

    const merchantId = merchantName ? this.findOrCreateMerchant(userId, merchantName, categoryId) : null;

    if (type === 'transfer') {
      if (!destinationAccountId) {
        throw new Error('Destination account is required for transfers');
      }
      if (destinationAccountId === accountId) {
        throw new Error('Source and destination accounts must be different');
      }

      const destAccount = this.getAccountById(destinationAccountId, userId);
      if (!destAccount) throw new Error('Destination account not found');

      const transferGroupId = `trf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const outTxId = `tx_${Date.now()}_out_${Math.random().toString(36).substring(2, 5)}`;
      const inTxId = `tx_${Date.now()}_in_${Math.random().toString(36).substring(2, 5)}`;

      // 1. Outgoing transfer leg
      this.db.prepare(`
        INSERT INTO transactions (
          id, user_id, account_id, type, amount, currency, date,
          notes, status, transfer_group_id, destination_account_id
        ) VALUES (?, ?, ?, 'transfer', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        outTxId,
        userId,
        accountId,
        amount,
        account.currency,
        date,
        notes || `Transfer to ${destAccount.name}`,
        status,
        transferGroupId,
        destinationAccountId
      );

      // 2. Incoming transfer leg
      this.db.prepare(`
        INSERT INTO transactions (
          id, user_id, account_id, type, amount, currency, date,
          notes, status, transfer_group_id, transfer_peer_account_id
        ) VALUES (?, ?, ?, 'transfer', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        inTxId,
        userId,
        destinationAccountId,
        amount,
        destAccount.currency,
        date,
        notes || `Transfer from ${account.name}`,
        status,
        transferGroupId,
        accountId
      );

      // Save tags for transfer legs
      if (tags.length > 0) {
        const linkInsert = this.db.prepare(`
          INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)
        `);

        for (const tag of tags) {
          const cleanTag = tag.trim().replace(/^#/, '');
          if (!cleanTag) continue;
          const tagObj = this.createTag(userId, cleanTag);
          linkInsert.run(outTxId, tagObj.id);
          linkInsert.run(inTxId, tagObj.id);
        }
      }

      // Recalculate balances for both accounts
      this.recalculateAccountBalance(accountId);
      this.recalculateAccountBalance(destinationAccountId);

      return {
        id: outTxId,
        transferGroupId,
        linkedId: inTxId,
        type: 'transfer',
        amount,
        fromAccount: account.name,
        toAccount: destAccount.name,
      };
    }

    // Expense or Income
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.db.prepare(`
      INSERT INTO transactions (
        id, user_id, account_id, type, amount, currency, date,
        merchant_id, merchant_name, category_id, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      txId,
      userId,
      accountId,
      type,
      amount,
      account.currency,
      date,
      merchantId,
      merchantName || null,
      categoryId || null,
      notes || null,
      status
    );

    // Save splits if provided
    if (splits.length > 0) {
      const splitStmt = this.db.prepare(`
        INSERT INTO transaction_splits (id, transaction_id, category_id, amount, notes)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const split of splits) {
        const splitId = `sp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
        splitStmt.run(splitId, txId, split.categoryId, split.amount, split.notes || null);
      }
    }

    // Save tags
    if (tags.length > 0) {
      const linkInsert = this.db.prepare(`
        INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)
      `);

      for (const tag of tags) {
        const cleanTag = tag.trim().replace(/^#/, '');
        if (!cleanTag) continue;
        const tagObj = this.createTag(userId, cleanTag);
        linkInsert.run(txId, tagObj.id);
      }
    }

    // Recalculate account balance
    this.recalculateAccountBalance(accountId);

    return this.getTransactionById(txId, userId);
  }

  getTransactionById(id: string, userId: string) {
    const tx = this.db.prepare(`
      SELECT t.*, 
             a.name as account_name, a.type as account_type, a.color as account_color,
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             p.name as peer_account_name, d.name as destination_account_name
      FROM transactions t
      LEFT JOIN accounts a ON a.id = t.account_id
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN accounts p ON p.id = t.transfer_peer_account_id
      LEFT JOIN accounts d ON d.id = t.destination_account_id
      WHERE t.id = ? AND t.user_id = ?
    `).get(id, userId) as any;

    if (!tx) return null;

    const splits = this.db.prepare(`
      SELECT s.*, c.name as category_name 
      FROM transaction_splits s
      LEFT JOIN categories c ON c.id = s.category_id
      WHERE s.transaction_id = ?
    `).all(id) as any[];

    const tags = this.db.prepare(`
      SELECT tg.id, tg.name, tg.color FROM transaction_tags tt
      JOIN tags tg ON tg.id = tt.tag_id
      WHERE tt.transaction_id = ?
    `).all(id) as Array<{ id: string; name: string; color: string }>;

    return {
      ...tx,
      splits,
      tags: tags.map(t => t.name),
      tag_objects: tags,
    };
  }

  updateTransaction(id: string, userId: string, data: {
    accountId?: string;
    destinationAccountId?: string;
    type?: 'expense' | 'income' | 'transfer';
    amount?: number;
    date?: string;
    merchantName?: string;
    categoryId?: string;
    notes?: string;
    status?: string;
    tags?: string[];
    splits?: Array<{ categoryId: string; amount: number; notes?: string }>;
  }) {
    const existing = this.getTransactionById(id, userId);
    if (!existing) throw new Error('Transaction not found');

    const newType = data.type || existing.type;
    const newAmount = data.amount !== undefined ? data.amount : existing.amount;
    const newDate = data.date || existing.date;
    const newNotes = data.notes !== undefined ? data.notes : existing.notes;
    const newStatus = data.status || existing.status || 'cleared';
    const newCategoryId = data.categoryId !== undefined ? data.categoryId : existing.category_id;
    const newMerchantName = data.merchantName !== undefined ? data.merchantName : existing.merchant_name;
    const newAccountId = data.accountId || existing.account_id;

    if (existing.transfer_group_id || newType === 'transfer') {
      const transferGroupId = existing.transfer_group_id;
      if (!transferGroupId) {
        throw new Error('Converting regular transaction to transfer is not supported directly');
      }

      const newDestAccountId = data.destinationAccountId || existing.destination_account_id || existing.transfer_peer_account_id;
      if (!newDestAccountId) throw new Error('Destination account is required for transfers');
      if (newAccountId === newDestAccountId) throw new Error('Source and destination accounts must be different');

      // Fetch both transfer legs
      const legs = this.db.prepare('SELECT * FROM transactions WHERE transfer_group_id = ?').all(transferGroupId) as any[];
      const outLeg = legs.find(l => Boolean(l.destination_account_id)) || legs[0];
      const inLeg = legs.find(l => Boolean(l.transfer_peer_account_id)) || legs[1];

      const oldAccountsToRecalc = new Set<string>();
      if (outLeg) oldAccountsToRecalc.add(outLeg.account_id);
      if (inLeg) oldAccountsToRecalc.add(inLeg.account_id);

      // Update outgoing leg
      if (outLeg) {
        this.db.prepare(`
          UPDATE transactions
          SET account_id = ?, amount = ?, date = ?, notes = ?, destination_account_id = ?, status = ?
          WHERE id = ?
        `).run(newAccountId, newAmount, newDate, newNotes, newDestAccountId, newStatus, outLeg.id);
      }

      // Update incoming leg
      if (inLeg) {
        this.db.prepare(`
          UPDATE transactions
          SET account_id = ?, amount = ?, date = ?, notes = ?, transfer_peer_account_id = ?, status = ?
          WHERE id = ?
        `).run(newDestAccountId, newAmount, newDate, newNotes, newAccountId, newStatus, inLeg.id);
      }

      // Update tags if provided for transfer legs
      if (data.tags !== undefined) {
        const txIds = [outLeg?.id, inLeg?.id].filter(Boolean);
        for (const tid of txIds) {
          this.db.prepare('DELETE FROM transaction_tags WHERE transaction_id = ?').run(tid);
          if (data.tags.length > 0) {
            const linkInsert = this.db.prepare(`
              INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)
            `);
            for (const tag of data.tags) {
              const cleanTag = tag.trim().replace(/^#/, '');
              if (!cleanTag) continue;
              const tagObj = this.createTag(userId, cleanTag);
              linkInsert.run(tid, tagObj.id);
            }
          }
        }
      }

      oldAccountsToRecalc.add(newAccountId);
      oldAccountsToRecalc.add(newDestAccountId);

      for (const accId of oldAccountsToRecalc) {
        this.recalculateAccountBalance(accId);
      }

      return this.getTransactionById(id, userId);
    }

    // Expense or Income update
    const oldAccountId = existing.account_id;
    const merchantId = newMerchantName ? this.findOrCreateMerchant(userId, newMerchantName, newCategoryId) : null;

    this.db.prepare(`
      UPDATE transactions
      SET account_id = ?, type = ?, amount = ?, date = ?, merchant_id = ?,
          merchant_name = ?, category_id = ?, notes = ?, status = ?
      WHERE id = ? AND user_id = ?
    `).run(
      newAccountId,
      newType,
      newAmount,
      newDate,
      merchantId,
      newMerchantName || null,
      newCategoryId || null,
      newNotes || null,
      newStatus,
      id,
      userId
    );

    // Update splits if provided
    if (data.splits !== undefined) {
      this.db.prepare('DELETE FROM transaction_splits WHERE transaction_id = ?').run(id);
      if (data.splits.length > 0) {
        const splitStmt = this.db.prepare(`
          INSERT INTO transaction_splits (id, transaction_id, category_id, amount, notes)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const split of data.splits) {
          const splitId = `sp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
          splitStmt.run(splitId, id, split.categoryId, split.amount, split.notes || null);
        }
      }
    }

    // Update tags if provided
    if (data.tags !== undefined) {
      this.db.prepare('DELETE FROM transaction_tags WHERE transaction_id = ?').run(id);
      if (data.tags.length > 0) {
        const linkInsert = this.db.prepare(`
          INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)
        `);
        for (const tag of data.tags) {
          const cleanTag = tag.trim().replace(/^#/, '');
          if (!cleanTag) continue;
          const tagObj = this.createTag(userId, cleanTag);
          linkInsert.run(id, tagObj.id);
        }
      }
    }

    // Recalculate balances
    this.recalculateAccountBalance(oldAccountId);
    if (newAccountId !== oldAccountId) {
      this.recalculateAccountBalance(newAccountId);
    }

    return this.getTransactionById(id, userId);
  }

  getTransactions(userId: string, filters: {
    accountId?: string;
    categoryId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    limit?: number;
    offset?: number;
    tag?: string;
  } = {}) {
    let sql = `
      SELECT t.*, 
             a.name as account_name, a.type as account_type, a.color as account_color,
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             p.name as peer_account_name, d.name as destination_account_name
      FROM transactions t
      LEFT JOIN accounts a ON a.id = t.account_id
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN accounts p ON p.id = t.transfer_peer_account_id
      LEFT JOIN accounts d ON d.id = t.destination_account_id
      WHERE t.user_id = ? AND t.is_deleted = 0
    `;
    const params: any[] = [userId];

    if (filters.accountId) {
      sql += ` AND t.account_id = ?`;
      params.push(filters.accountId);
    }
    if (filters.categoryId) {
      sql += ` AND t.category_id = ?`;
      params.push(filters.categoryId);
    }
    if (filters.type) {
      sql += ` AND t.type = ?`;
      params.push(filters.type);
    }
    if (filters.startDate) {
      sql += ` AND t.date >= ?`;
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      sql += ` AND t.date <= ?`;
      params.push(filters.endDate);
    }
    if (filters.search) {
      const rawSearch = filters.search.trim();
      const term = `%${rawSearch}%`;
      const cleanTag = rawSearch.replace(/^#/, '');
      const tagTerm = `%${cleanTag}%`;

      // Check if search might be an amount in rupees (e.g. "400", "400.50", "₹400", "1,200")
      const numericStr = rawSearch.replace(/[₹,\s]/g, '');
      const isNumeric = /^-?\d+(\.\d+)?$/.test(numericStr);

      if (isNumeric) {
        const numVal = parseFloat(numericStr);
        const paiseVal = Math.round(numVal * 100);
        sql += ` AND (t.merchant_name LIKE ? OR t.notes LIKE ? OR c.name LIKE ? OR t.amount = ? OR CAST(t.amount / 100 AS TEXT) LIKE ? OR t.id IN (
          SELECT tt.transaction_id FROM transaction_tags tt
          JOIN tags tg ON tg.id = tt.tag_id
          WHERE tg.name LIKE ?
        ))`;
        params.push(term, term, term, paiseVal, `%${numericStr}%`, tagTerm);
      } else {
        sql += ` AND (t.merchant_name LIKE ? OR t.notes LIKE ? OR c.name LIKE ? OR t.id IN (
          SELECT tt.transaction_id FROM transaction_tags tt
          JOIN tags tg ON tg.id = tt.tag_id
          WHERE tg.name LIKE ?
        ))`;
        params.push(term, term, term, tagTerm);
      }
    }
    if (filters.tag) {
      const cleanTag = filters.tag.trim().replace(/^#/, '');
      sql += ` AND t.id IN (
        SELECT tt.transaction_id FROM transaction_tags tt
        JOIN tags tg ON tg.id = tt.tag_id
        WHERE tg.name = ? OR tg.id = ?
      )`;
      params.push(cleanTag, cleanTag);
    }

    sql += ` ORDER BY t.date DESC, t.created_at DESC`;

    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = this.db.prepare(sql).all(...params) as any[];
    if (!rows || rows.length === 0) return rows || [];

    const txIds = rows.map(r => r.id);
    const placeholders = txIds.map(() => '?').join(',');

    // Batch load tags
    const tagRows = this.db.prepare(`
      SELECT tt.transaction_id, tg.id, tg.name, tg.color
      FROM transaction_tags tt
      JOIN tags tg ON tg.id = tt.tag_id
      WHERE tt.transaction_id IN (${placeholders})
    `).all(...txIds) as Array<{ transaction_id: string; id: string; name: string; color: string }>;

    const tagsByTxId = new Map<string, string[]>();
    const tagObjectsByTxId = new Map<string, Array<{ id: string; name: string; color: string }>>();
    for (const tr of tagRows) {
      if (!tagsByTxId.has(tr.transaction_id)) {
        tagsByTxId.set(tr.transaction_id, []);
        tagObjectsByTxId.set(tr.transaction_id, []);
      }
      tagsByTxId.get(tr.transaction_id)!.push(tr.name);
      tagObjectsByTxId.get(tr.transaction_id)!.push({ id: tr.id, name: tr.name, color: tr.color });
    }

    // Batch load splits
    const splitRows = this.db.prepare(`
      SELECT s.*, c.name as category_name
      FROM transaction_splits s
      LEFT JOIN categories c ON c.id = s.category_id
      WHERE s.transaction_id IN (${placeholders})
    `).all(...txIds) as any[];

    const splitsByTxId = new Map<string, any[]>();
    for (const sr of splitRows) {
      if (!splitsByTxId.has(sr.transaction_id)) {
        splitsByTxId.set(sr.transaction_id, []);
      }
      splitsByTxId.get(sr.transaction_id)!.push(sr);
    }

    return rows.map(r => ({
      ...r,
      tags: tagsByTxId.get(r.id) || [],
      tag_objects: tagObjectsByTxId.get(r.id) || [],
      splits: splitsByTxId.get(r.id) || [],
    }));
  }

  deleteTransaction(id: string, userId: string, permanent = false) {
    const tx = this.getTransactionById(id, userId);
    if (!tx) throw new Error('Transaction not found');

    if (tx.transfer_group_id) {
      // It's a transfer pair! Delete both legs
      if (permanent) {
        this.db.prepare('DELETE FROM transactions WHERE transfer_group_id = ?').run(tx.transfer_group_id);
      } else {
        this.db.prepare('UPDATE transactions SET is_deleted = 1 WHERE transfer_group_id = ?').run(tx.transfer_group_id);
      }
      if (tx.account_id) this.recalculateAccountBalance(tx.account_id);
      if (tx.destination_account_id) this.recalculateAccountBalance(tx.destination_account_id);
      if (tx.transfer_peer_account_id) this.recalculateAccountBalance(tx.transfer_peer_account_id);
      return { success: true, undoId: tx.transfer_group_id, isTransfer: true };
    }

    if (permanent) {
      this.db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(id, userId);
    } else {
      this.db.prepare('UPDATE transactions SET is_deleted = 1 WHERE id = ? AND user_id = ?').run(id, userId);
    }

    this.recalculateAccountBalance(tx.account_id);
    return { success: true, undoId: id, isTransfer: false };
  }

  restoreTransaction(idOrGroupId: string, userId: string) {
    this.db.prepare(`
      UPDATE transactions SET is_deleted = 0 
      WHERE user_id = ? AND (id = ? OR transfer_group_id = ?)
    `).run(userId, idOrGroupId, idOrGroupId);

    // Recalculate accounts
    const accounts = this.db.prepare(`
      SELECT DISTINCT account_id FROM transactions WHERE id = ? OR transfer_group_id = ?
    `).all(idOrGroupId, idOrGroupId) as any[];

    for (const a of accounts) {
      this.recalculateAccountBalance(a.account_id);
    }

    return { restored: true };
  }

  // --- DASHBOARD & NET WORTH ---

  getDashboardMetrics(userId: string, currentMonthStr?: string) {
    const month = currentMonthStr || new Date().toISOString().substring(0, 7); // YYYY-MM
    const accounts = this.getAccounts(userId);

    let totalAssets = 0;
    let totalLiabilities = 0;
    let cashBalance = 0;
    let investmentBalance = 0;
    let creditCardOutstanding = 0;

    for (const acc of accounts) {
      if (!acc.include_in_net_worth) continue;

      if (acc.type === 'credit_card') {
        const outstanding = Math.max(0, acc.current_balance);
        const cardEmi = acc.emiOutstanding || 0;
        creditCardOutstanding += (outstanding + cardEmi);
        totalLiabilities += outstanding;
        if (acc.current_balance < 0) {
          totalAssets += Math.abs(acc.current_balance);
        }
      } else if (acc.type === 'loan' || acc.type === 'liability') {
        totalLiabilities += Math.max(0, acc.current_balance);
      } else {
        totalAssets += acc.current_balance;
        if (acc.type === 'cash' || acc.type === 'bank' || acc.type === 'savings' || acc.type === 'current') {
          cashBalance += acc.current_balance;
        } else if (acc.type === 'investment' || acc.type === 'fixed_deposit' || acc.type === 'recurring_deposit') {
          investmentBalance += acc.current_balance;
        }
      }
    }

    // Include outstanding loans & purchase EMIs in liabilities
    const loanRow = this.db.prepare(`
      SELECT COALESCE(SUM(outstanding_principal), 0) as total
      FROM loans
      WHERE user_id = ?
    `).get(userId) as any;
    totalLiabilities += (loanRow?.total || 0);

    const netWorth = totalAssets - totalLiabilities;

    // Monthly Income and Expenses (EXCLUDING TRANSFERS!)
    const monthTx = this.db.prepare(`
      SELECT type, SUM(amount) as total
      FROM transactions
      WHERE user_id = ? 
        AND is_deleted = 0
        AND date LIKE ?
        AND type IN ('income', 'expense')
      GROUP BY type
    `).all(userId, `${month}%`) as any[];

    let monthlyIncome = 0;
    let monthlyExpenses = 0;

    for (const row of monthTx) {
      if (row.type === 'income') monthlyIncome = row.total;
      if (row.type === 'expense') monthlyExpenses = row.total;
    }

    const monthlySavings = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0
      ? Math.max(0, Math.round((monthlySavings / monthlyIncome) * 100))
      : 0;

    return {
      month,
      netWorth,
      totalAssets,
      totalLiabilities,
      cashBalance,
      investmentBalance,
      creditCardOutstanding,
      monthlyIncome,
      monthlyExpenses,
      monthlySavings,
      savingsRate,
    };
  }

  // --- LOAN AMORTIZATION SCHEDULE ---

  calculateLoanAmortization(principal: number, annualInterestRate: number, tenureMonths: number, startDateStr: string) {
    // principal in minor units (paise)
    const monthlyRate = (annualInterestRate / 100) / 12;
    // EMI formula: E = P * r * (1+r)^n / ((1+r)^n - 1)
    let emi = 0;
    if (monthlyRate === 0) {
      emi = Math.round(principal / tenureMonths);
    } else {
      const factor = Math.pow(1 + monthlyRate, tenureMonths);
      emi = Math.round((principal * monthlyRate * factor) / (factor - 1));
    }

    let remainingPrincipal = principal;
    let totalInterest = 0;
    const schedule = [];
    const [year, month] = startDateStr.split('-').map(Number);

    for (let i = 1; i <= tenureMonths; i++) {
      const interestComponent = Math.round(remainingPrincipal * monthlyRate);
      let principalComponent = emi - interestComponent;
      if (i === tenureMonths || principalComponent > remainingPrincipal) {
        principalComponent = remainingPrincipal;
        emi = principalComponent + interestComponent;
      }
      remainingPrincipal -= principalComponent;
      totalInterest += interestComponent;

      const dateObj = new Date(year, month - 1 + i, 1);
      const paymentDate = dateObj.toISOString().substring(0, 7);

      schedule.push({
        monthNumber: i,
        paymentDate,
        emi,
        principalComponent,
        interestComponent,
        remainingPrincipal: Math.max(0, remainingPrincipal),
      });
    }

    return {
      principal,
      annualInterestRate,
      tenureMonths,
      monthlyEmi: emi,
      totalInterest,
      totalRepayment: principal + totalInterest,
      schedule,
    };
  }

  // --- BUDGETS ---

  getBudgets(userId: string, monthStr?: string) {
    const month = monthStr || new Date().toISOString().substring(0, 7); // YYYY-MM
    const budgets = this.db.prepare(`
      SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM budgets b
      JOIN categories c ON c.id = b.category_id
      WHERE b.user_id = ?
    `).all(userId) as any[];

    return budgets.map(b => {
      // Calculate spent for this category in the month
      const spentRow = this.db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as spent
        FROM transactions
        WHERE user_id = ?
          AND category_id = ?
          AND type = 'expense'
          AND is_deleted = 0
          AND date LIKE ?
      `).get(userId, b.category_id, `${month}%`) as any;

      const spent = spentRow?.spent || 0;
      const remaining = b.amount - spent;
      const percentUsed = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
      const isOverspent = remaining < 0;

      return {
        ...b,
        month,
        spent,
        remaining,
        percentUsed,
        isOverspent,
      };
    });
  }

  createBudget(data: { userId: string; categoryId: string; amount: number; periodType?: string; rollover?: boolean }) {
    const id = `bud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.db.prepare(`
      INSERT INTO budgets (id, user_id, category_id, amount, period_type, rollover)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.userId,
      data.categoryId,
      data.amount,
      data.periodType || 'monthly',
      data.rollover ? 1 : 0
    );
    return id;
  }

  deleteBudget(id: string, userId: string) {
    this.db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?').run(id, userId);
    return { success: true };
  }

  // --- GOALS ---

  getGoals(userId: string) {
    const goals = this.db.prepare(`
      SELECT * FROM goals WHERE user_id = ? ORDER BY target_date ASC
    `).all(userId) as any[];

    const now = new Date();
    return goals.map(g => {
      const targetDate = new Date(g.target_date);
      const remainingAmount = Math.max(0, g.target_amount - g.current_amount);
      const percent = g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0;
      
      const monthsDiff = Math.max(1, (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth()));
      const monthlyTarget = Math.round(remainingAmount / monthsDiff);

      return {
        ...g,
        percent,
        remainingAmount,
        monthsRemaining: monthsDiff,
        calculatedMonthlyTarget: monthlyTarget,
      };
    });
  }

  createGoal(data: { userId: string; name: string; targetAmount: number; currentAmount?: number; targetDate: string; notes?: string }) {
    const id = `gol_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.db.prepare(`
      INSERT INTO goals (id, user_id, name, target_amount, current_amount, target_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.userId,
      data.name,
      data.targetAmount,
      data.currentAmount || 0,
      data.targetDate,
      data.notes || ''
    );
    return id;
  }

  contributeToGoal(id: string, userId: string, addAmount: number, sourceAccountId?: string) {
    const goal = this.db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!goal) throw new Error('Goal not found');

    if (sourceAccountId) {
      const acc = this.getAccountById(sourceAccountId, userId);
      if (!acc) throw new Error('Source account not found');

      // Find or create 'Savings' category for user
      let savingsCat = this.db.prepare(`
        SELECT id FROM categories 
        WHERE user_id = ? AND (LOWER(name) LIKE '%savings%' OR LOWER(name) LIKE '%goal%')
        ORDER BY parent_id ASC LIMIT 1
      `).get(userId) as any;

      if (!savingsCat) {
        const catId = `cat_savings_${userId.substring(0, 8)}`;
        this.db.prepare(`
          INSERT OR IGNORE INTO categories (id, user_id, name, type, icon, color, sort_order)
          VALUES (?, ?, 'Savings & Goals', 'expense', 'piggy-bank', '#06B6D4', 8)
        `).run(catId, userId);
        savingsCat = { id: catId };
      }

      // Record transaction so it becomes visible in transactions feed and analytics!
      this.createTransaction({
        userId,
        accountId: sourceAccountId,
        type: 'expense',
        amount: addAmount,
        categoryId: savingsCat?.id,
        date: new Date().toISOString().substring(0, 10),
        merchantName: `Goal: ${goal.name}`,
        notes: `Contribution towards goal "${goal.name}"`,
      });
    }

    const newAmount = goal.current_amount + addAmount;
    const status = newAmount >= goal.target_amount ? 'completed' : goal.status;

    this.db.prepare(`
      UPDATE goals 
      SET current_amount = ?, status = ?
      WHERE id = ? AND user_id = ?
    `).run(newAmount, status, id, userId);

    return { success: true, currentAmount: newAmount, status };
  }

  updateGoalContribution(id: string, userId: string, addAmount: number) {
    return this.contributeToGoal(id, userId, addAmount);
  }

  updateGoal(id: string, userId: string, data: { name?: string; targetAmount?: number; currentAmount?: number; targetDate?: string; notes?: string; status?: string }) {
    const goal = this.db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!goal) throw new Error('Goal not found');

    const name = data.name !== undefined ? data.name : goal.name;
    const targetAmount = data.targetAmount !== undefined ? data.targetAmount : goal.target_amount;
    const currentAmount = data.currentAmount !== undefined ? data.currentAmount : goal.current_amount;
    const targetDate = data.targetDate !== undefined ? data.targetDate : goal.target_date;
    const notes = data.notes !== undefined ? data.notes : goal.notes;
    const status = data.status !== undefined ? data.status : (currentAmount >= targetAmount ? 'completed' : 'in_progress');

    this.db.prepare(`
      UPDATE goals
      SET name = ?, target_amount = ?, current_amount = ?, target_date = ?, notes = ?, status = ?
      WHERE id = ? AND user_id = ?
    `).run(name, targetAmount, currentAmount, targetDate, notes, status, id, userId);

    return { success: true };
  }

  deleteGoal(id: string, userId: string) {
    this.db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(id, userId);
    return { success: true };
  }

  // --- SUBSCRIPTIONS ---

  private computeNextBillingDate(currentDateStr: string, frequency: string): string {
    const parts = (currentDateStr || '').split('-');
    if (parts.length !== 3) {
      const now = new Date();
      return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    }
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const date = new Date(y, m, d);

    if (frequency === 'yearly') {
      date.setFullYear(date.getFullYear() + 1);
    } else if (frequency === 'quarterly') {
      date.setMonth(date.getMonth() + 3);
    } else if (frequency === 'weekly') {
      date.setDate(date.getDate() + 7);
    } else {
      // Monthly default
      date.setMonth(date.getMonth() + 1);
    }

    const resY = date.getFullYear();
    const resM = (date.getMonth() + 1).toString().padStart(2, '0');
    const resD = date.getDate().toString().padStart(2, '0');
    return `${resY}-${resM}-${resD}`;
  }

  processDueSubscriptions(userId: string) {
    const todayStr = new Date().toISOString().substring(0, 10);
    const dueSubs = this.db.prepare(`
      SELECT * FROM subscriptions
      WHERE user_id = ?
        AND status = 'active'
        AND auto_deduct = 1
        AND next_billing_date <= ?
    `).all(userId, todayStr) as any[];

    for (const sub of dueSubs) {
      try {
        this.recordSubscriptionPayment({
          userId,
          subscriptionId: sub.id,
          paidDate: sub.next_billing_date,
          accountId: sub.account_id,
        });
      } catch (err) {
        console.error('Failed to auto-deduct subscription:', sub.id, err);
      }
    }
  }

  getSubscriptions(userId: string) {
    // Process any due auto-deductions first so amounts and transactions stay strictly in sync
    this.processDueSubscriptions(userId);

    const subs = this.db.prepare(`
      SELECT s.*, a.name as account_name, c.name as category_name
      FROM subscriptions s
      LEFT JOIN accounts a ON a.id = s.account_id
      LEFT JOIN categories c ON c.id = s.category_id
      WHERE s.user_id = ?
      ORDER BY s.next_billing_date ASC
    `).all(userId) as any[];

    let monthlyTotal = 0;
    let annualTotal = 0;

    for (const sub of subs) {
      if (sub.status !== 'active') continue;
      let monthlyCost = sub.amount;
      if (sub.billing_frequency === 'yearly') monthlyCost = Math.round(sub.amount / 12);
      if (sub.billing_frequency === 'quarterly') monthlyCost = Math.round(sub.amount / 3);
      if (sub.billing_frequency === 'weekly') monthlyCost = Math.round(sub.amount * 4.33);

      monthlyTotal += monthlyCost;
      annualTotal += monthlyCost * 12;
    }

    return {
      subscriptions: subs,
      monthlyTotal,
      annualTotal,
    };
  }

  createSubscription(data: {
    userId: string;
    name: string;
    amount: number;
    billingFrequency?: string;
    nextBillingDate: string;
    accountId: string;
    categoryId?: string;
    notes?: string;
    autoDeduct?: boolean;
    alreadyPaid?: boolean;
    lastPaidDate?: string;
  }) {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const autoDeduct = data.autoDeduct !== false ? 1 : 0;
    const frequency = data.billingFrequency || 'monthly';
    let nextDate = data.nextBillingDate;
    let paymentStatus = 'pending';
    let lastPaidDate = data.lastPaidDate || null;

    if (data.alreadyPaid) {
      paymentStatus = 'paid';
      lastPaidDate = data.lastPaidDate || new Date().toISOString().substring(0, 10);
      nextDate = this.computeNextBillingDate(data.nextBillingDate, frequency);
    }

    this.db.prepare(`
      INSERT INTO subscriptions (
        id, user_id, name, amount, billing_frequency,
        next_billing_date, account_id, category_id, notes,
        auto_deduct, last_paid_date, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.userId,
      data.name,
      data.amount,
      frequency,
      nextDate,
      data.accountId,
      data.categoryId || null,
      data.notes || '',
      autoDeduct,
      lastPaidDate,
      paymentStatus
    );

    // If user marked as already paid for the current cycle, create the corresponding expense transaction!
    if (data.alreadyPaid) {
      let catId = data.categoryId;
      if (!catId) {
        const subCat = this.db.prepare("SELECT id FROM categories WHERE user_id = ? AND (name LIKE '%subscription%' OR name LIKE '%bills%') LIMIT 1").get(data.userId) as { id: string } | undefined;
        if (!subCat) {
          const newCatId = `cat_sub_${data.userId.substring(0, 8)}`;
          this.db.prepare(`
            INSERT OR IGNORE INTO categories (id, user_id, name, type, icon, color, sort_order)
            VALUES (?, ?, 'Subscriptions & Bills', 'expense', 'repeat', '#6366F1', 9)
          `).run(newCatId, data.userId);
          catId = newCatId;
        } else {
          catId = subCat.id;
        }
      }

      this.createTransaction({
        userId: data.userId,
        accountId: data.accountId,
        type: 'expense',
        amount: data.amount,
        categoryId: catId,
        date: lastPaidDate!,
        merchantName: data.name,
        notes: `Subscription payment for ${data.name}`,
      });
    }

    return id;
  }

  recordSubscriptionPayment(data: {
    userId: string;
    subscriptionId: string;
    paidDate?: string;
    accountId?: string;
  }) {
    const sub = this.db.prepare('SELECT * FROM subscriptions WHERE id = ? AND user_id = ?').get(data.subscriptionId, data.userId) as any;
    if (!sub) throw new Error('Subscription not found');

    const paidDate = data.paidDate || new Date().toISOString().substring(0, 10);
    const accountId = data.accountId || sub.account_id;

    let catId = sub.category_id;
    if (!catId) {
      const subCat = this.db.prepare("SELECT id FROM categories WHERE user_id = ? AND (name LIKE '%subscription%' OR name LIKE '%bills%') LIMIT 1").get(data.userId) as { id: string } | undefined;
      if (!subCat) {
        const newCatId = `cat_sub_${data.userId.substring(0, 8)}`;
        this.db.prepare(`
          INSERT OR IGNORE INTO categories (id, user_id, name, type, icon, color, sort_order)
          VALUES (?, ?, 'Subscriptions & Bills', 'expense', 'repeat', '#6366F1', 9)
        `).run(newCatId, data.userId);
        catId = newCatId;
      } else {
        catId = subCat.id;
      }
    }

    const txId = this.createTransaction({
      userId: data.userId,
      accountId,
      type: 'expense',
      amount: sub.amount,
      categoryId: catId,
      date: paidDate,
      merchantName: sub.name,
      notes: `Subscription payment for ${sub.name}`,
    });

    const nextDate = this.computeNextBillingDate(sub.next_billing_date || paidDate, sub.billing_frequency);

    this.db.prepare(`
      UPDATE subscriptions
      SET last_paid_date = ?,
          next_billing_date = ?,
          payment_status = 'paid'
      WHERE id = ? AND user_id = ?
    `).run(paidDate, nextDate, sub.id, data.userId);

    return { success: true, transactionId: txId, nextBillingDate: nextDate };
  }

  snoozeSubscription(data: {
    userId: string;
    subscriptionId: string;
    newNextBillingDate: string;
  }) {
    this.db.prepare(`
      UPDATE subscriptions
      SET next_billing_date = ?,
          payment_status = 'pending'
      WHERE id = ? AND user_id = ?
    `).run(data.newNextBillingDate, data.subscriptionId, data.userId);
    return { success: true, nextBillingDate: data.newNextBillingDate };
  }

  deleteSubscription(id: string, userId: string) {
    this.db.prepare('DELETE FROM subscriptions WHERE id = ? AND user_id = ?').run(id, userId);
    return { success: true };
  }

  // --- RECURRING TRANSACTIONS ---

  getRecurring(userId: string) {
    return this.db.prepare(`
      SELECT r.*, a.name as account_name, c.name as category_name
      FROM recurring_transactions r
      LEFT JOIN accounts a ON a.id = r.account_id
      LEFT JOIN categories c ON c.id = r.category_id
      WHERE r.user_id = ?
      ORDER BY r.next_date ASC
    `).all(userId);
  }

  createRecurring(data: {
    userId: string;
    accountId: string;
    type: string;
    amount: number;
    frequency: string;
    nextDate: string;
    endDate?: string;
    merchant?: string;
    categoryId?: string;
    notes?: string;
  }) {
    const id = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.db.prepare(`
      INSERT INTO recurring_transactions (
        id, user_id, account_id, type, amount, frequency,
        next_date, end_date, merchant, category_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.userId,
      data.accountId,
      data.type,
      data.amount,
      data.frequency,
      data.nextDate,
      data.endDate || null,
      data.merchant || '',
      data.categoryId || null,
      data.notes || ''
    );
    return id;
  }

  // --- INVESTMENTS ---

  getInvestments(userId: string) {
    const rows = this.db.prepare(`
      SELECT i.*, a.name as account_name
      FROM investments i
      LEFT JOIN accounts a ON a.id = i.account_id
      WHERE i.user_id = ?
      ORDER BY i.current_value DESC
    `).all(userId) as any[];

    let totalCostBasis = 0;
    let totalCurrentValue = 0;

    const items = rows.map(item => {
      totalCostBasis += item.cost_basis;
      totalCurrentValue += item.current_value;
      const unrealizedGain = item.current_value - item.cost_basis;
      const returnPercent = item.cost_basis > 0
        ? Math.round(((item.current_value - item.cost_basis) / item.cost_basis) * 1000) / 10
        : 0;

      return {
        ...item,
        unrealizedGain,
        returnPercent,
      };
    });

    const totalGain = totalCurrentValue - totalCostBasis;
    const totalReturnPercent = totalCostBasis > 0
      ? Math.round(((totalCurrentValue - totalCostBasis) / totalCostBasis) * 1000) / 10
      : 0;

    return {
      holdings: items,
      totalCostBasis,
      totalCurrentValue,
      totalGain,
      totalReturnPercent,
    };
  }

  createInvestment(data: {
    userId: string;
    accountId: string;
    symbol: string;
    name: string;
    assetType: string;
    quantity: number;
    costBasis: number; // minor units
    currentPrice: number; // minor units
    notes?: string;
  }) {
    const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const currentValue = Math.round(data.quantity * data.currentPrice);

    this.db.prepare(`
      INSERT INTO investments (
        id, user_id, account_id, symbol, name, asset_type,
        quantity, cost_basis, current_price, current_value, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.userId,
      data.accountId,
      data.symbol,
      data.name,
      data.assetType,
      data.quantity,
      data.costBasis,
      data.currentPrice,
      currentValue,
      data.notes || ''
    );

    return id;
  }

  // --- LOANS ---

  getLoans(userId: string) {
    const loans = this.db.prepare(`
      SELECT l.*, a.name as account_name
      FROM loans l
      LEFT JOIN accounts a ON a.id = l.account_id
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
    `).all(userId) as any[];

    return loans.map(loan => {
      const paidPrincipal = loan.principal - loan.outstanding_principal;
      const progressPercent = loan.principal > 0
        ? Math.round((paidPrincipal / loan.principal) * 100)
        : 0;
      const amortization = this.calculateLoanAmortization(
        loan.principal,
        loan.interest_rate,
        loan.tenure_months,
        loan.start_date
      );

      return {
        ...loan,
        type: loan.type || 'loan',
        notes: loan.notes || '',
        paidPrincipal,
        progressPercent,
        amortization,
      };
    });
  }

  createLoan(data: {
    userId: string;
    accountId: string;
    name: string;
    principal: number;
    outstandingPrincipal: number;
    interestRate: number;
    tenureMonths: number;
    startDate: string;
    emiDay?: number;
    type?: 'loan' | 'emi';
    notes?: string;
  }) {
    const id = `loan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const amort = this.calculateLoanAmortization(data.principal, data.interestRate, data.tenureMonths, data.startDate);

    const runInsert = () => {
      this.db.prepare(`
        INSERT INTO loans (
          id, user_id, account_id, name, principal, outstanding_principal,
          interest_rate, emi_amount, tenure_months, start_date, emi_day, type, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.userId,
        data.accountId,
        data.name,
        data.principal,
        data.outstandingPrincipal,
        data.interestRate,
        amort.monthlyEmi,
        data.tenureMonths,
        data.startDate,
        data.emiDay || 5,
        data.type || 'loan',
        data.notes || ''
      );
    };

    try {
      runInsert();
    } catch (err: any) {
      if (err?.message?.includes('no column named') || err?.message?.includes('table loans')) {
        try { this.db.exec(`ALTER TABLE loans ADD COLUMN principal INTEGER DEFAULT 0`); } catch {}
        try { this.db.exec(`ALTER TABLE loans ADD COLUMN outstanding_principal INTEGER DEFAULT 0`); } catch {}
        try { this.db.exec(`ALTER TABLE loans ADD COLUMN tenure_months INTEGER DEFAULT 12`); } catch {}
        try { this.db.exec(`ALTER TABLE loans ADD COLUMN emi_day INTEGER DEFAULT 5`); } catch {}
        try { this.db.exec(`ALTER TABLE loans ADD COLUMN type TEXT DEFAULT 'loan'`); } catch {}
        try { this.db.exec(`ALTER TABLE loans ADD COLUMN notes TEXT`); } catch {}
        syncTurso(true);
        runInsert();
      } else {
        throw err;
      }
    }

    return id;
  }

  recordLoanPayment(params: {
    userId: string;
    loanId: string;
    accountId: string;
    amount?: number;
    date?: string;
  }) {
    const loan = this.db.prepare('SELECT * FROM loans WHERE id = ? AND user_id = ?').get(params.loanId, params.userId) as any;
    if (!loan) throw new Error('Loan or EMI not found');
    if (loan.outstanding_principal <= 0) throw new Error('This loan or EMI is already fully repaid');

    const paymentAmount = params.amount || loan.emi_amount;
    const monthlyRate = (loan.interest_rate / 100) / 12;
    const interestComponent = monthlyRate > 0 ? Math.round(loan.outstanding_principal * monthlyRate) : 0;
    let principalComponent = Math.max(0, paymentAmount - interestComponent);
    if (principalComponent > loan.outstanding_principal) {
      principalComponent = loan.outstanding_principal;
    }

    // Find a relevant category for EMI payments
    let emiCat = this.db.prepare("SELECT id FROM categories WHERE user_id = ? AND (name LIKE '%loan%' OR name LIKE '%emi%' OR name LIKE '%debt%') LIMIT 1").get(params.userId) as any;
    if (!emiCat) {
      emiCat = this.db.prepare("SELECT id FROM categories WHERE user_id = ? AND type = 'expense' LIMIT 1").get(params.userId) as any;
    }

    const isEmi = loan.type === 'emi';
    const txName = isEmi ? `EMI: ${loan.name}` : `Loan EMI: ${loan.name}`;
    const paymentDate = params.date || new Date().toISOString().substring(0, 10);

    // 1. Record expense in account transactions (reduces account balance and liquid cash)
    const txId = this.createTransaction({
      userId: params.userId,
      accountId: params.accountId,
      type: 'expense',
      amount: paymentAmount,
      date: paymentDate,
      merchantName: txName,
      categoryId: emiCat?.id,
      notes: `Installment payment for ${isEmi ? 'Purchase EMI' : 'Loan'} "${loan.name}" (Principal: ₹${Math.round(principalComponent / 100)}, Interest: ₹${Math.round(interestComponent / 100)})`,
    });

    // 2. Reduce outstanding principal on loan (reduces liabilities)
    const newOutstanding = Math.max(0, loan.outstanding_principal - principalComponent);
    this.db.prepare(`
      UPDATE loans
      SET outstanding_principal = ?
      WHERE id = ? AND user_id = ?
    `).run(newOutstanding, params.loanId, params.userId);

    return {
      success: true,
      transactionId: txId,
      principalPaid: principalComponent,
      interestPaid: interestComponent,
      newOutstandingPrincipal: newOutstanding,
      isFullyRepaid: newOutstanding === 0,
    };
  }

  // --- RECONCILIATION ---

  getReconciliations(userId: string, accountId: string) {
    return this.db.prepare(`
      SELECT * FROM reconciliations 
      WHERE user_id = ? AND account_id = ?
      ORDER BY statement_date DESC
    `).all(userId, accountId);
  }

  createReconciliation(data: {
    userId: string;
    accountId: string;
    statementDate: string;
    statementBalance: number;
    reconciledTransactionIds?: string[];
  }) {
    const id = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    // Mark specific transactions as reconciled
    if (data.reconciledTransactionIds && data.reconciledTransactionIds.length > 0) {
      const markStmt = this.db.prepare('UPDATE transactions SET reconciled = 1 WHERE id = ? AND user_id = ?');
      for (const txId of data.reconciledTransactionIds) {
        markStmt.run(txId, data.userId);
      }
    }

    const account = this.getAccountById(data.accountId, data.userId);
    const recordedBalance = account ? account.current_balance : 0;
    const difference = recordedBalance - data.statementBalance;
    const status = difference === 0 ? 'balanced' : 'discrepancy';

    this.db.prepare(`
      INSERT INTO reconciliations (
        id, user_id, account_id, statement_date, statement_balance,
        reconciled_balance, difference, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.userId,
      data.accountId,
      data.statementDate,
      data.statementBalance,
      recordedBalance,
      difference,
      status
    );

    return { id, status, difference, recordedBalance, statementBalance: data.statementBalance };
  }

  // --- CASH FLOW FORECAST (30/60/90 DAYS) ---

  getCashFlowForecast(userId: string, days = 90) {
    const metrics = this.getDashboardMetrics(userId);
    const liquidBalance = metrics.cashBalance;

    const recurring = this.getRecurring(userId) as any[];
    const subs = this.getSubscriptions(userId);

    const periods = [30, 60, 90].filter(p => p <= days);
    const forecastResults = periods.map(periodDays => {
      let expectedIncome = 0;
      let expectedExpenses = 0;

      // Calculate factor based on recurring
      const months = periodDays / 30;

      for (const rec of recurring) {
        if (rec.type === 'income') {
          if (rec.frequency === 'monthly') expectedIncome += rec.amount * months;
          if (rec.frequency === 'weekly') expectedIncome += rec.amount * (periodDays / 7);
          if (rec.frequency === 'yearly') expectedIncome += (rec.amount / 12) * months;
        } else if (rec.type === 'expense') {
          if (rec.frequency === 'monthly') expectedExpenses += rec.amount * months;
          if (rec.frequency === 'weekly') expectedExpenses += rec.amount * (periodDays / 7);
          if (rec.frequency === 'yearly') expectedExpenses += (rec.amount / 12) * months;
        }
      }

      // Add subscriptions
      expectedExpenses += subs.monthlyTotal * months;

      const projectedBalance = liquidBalance + expectedIncome - expectedExpenses;

      return {
        days: periodDays,
        currentLiquidBalance: liquidBalance,
        expectedIncome: Math.round(expectedIncome),
        expectedExpenses: Math.round(expectedExpenses),
        projectedBalance: Math.round(projectedBalance),
      };
    });

    return {
      currentLiquidBalance: liquidBalance,
      periods: forecastResults,
      disclaimer: 'Projections are deterministic estimates based on historical recurring obligations and subscriptions.',
    };
  }

  // --- REPORTS ---

  getSpendingByCategory(userId: string, monthStr?: string) {
    const month = monthStr || new Date().toISOString().substring(0, 7);
    const rows = this.db.prepare(`
      SELECT c.id, c.name, c.icon, c.color, SUM(t.amount) as total
      FROM transactions t
      JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = ?
        AND t.type = 'expense'
        AND t.is_deleted = 0
        AND t.date LIKE ?
      GROUP BY c.id
      ORDER BY total DESC
    `).all(userId, `${month}%`) as any[];

    const totalExpense = rows.reduce((sum, r) => sum + r.total, 0);

    return rows.map(r => ({
      ...r,
      percentage: totalExpense > 0 ? Math.round((r.total / totalExpense) * 100) : 0,
    }));
  }

  getSpendingByMerchant(userId: string, limit = 10) {
    return this.db.prepare(`
      SELECT merchant_name, COUNT(*) as count, SUM(amount) as total
      FROM transactions
      WHERE user_id = ?
        AND type = 'expense'
        AND is_deleted = 0
        AND merchant_name IS NOT NULL
      GROUP BY merchant_name
      ORDER BY total DESC
      LIMIT ?
    `).all(userId, limit);
  }

  getMonthlyCashFlowTrend(userId: string, numMonths = 6) {
    const result = [];
    const now = new Date();

    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = d.toISOString().substring(0, 7);

      const rows = this.db.prepare(`
        SELECT type, COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE user_id = ?
          AND is_deleted = 0
          AND date LIKE ?
          AND type IN ('income', 'expense')
        GROUP BY type
      `).all(userId, `${mStr}%`) as any[];

      let income = 0;
      let expense = 0;

      for (const r of rows) {
        if (r.type === 'income') income = r.total;
        if (r.type === 'expense') expense = r.total;
      }

      result.push({
        month: mStr,
        monthLabel: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        income,
        expense,
        net: income - expense,
      });
    }

    return result;
  }

  getDailySpending(userId: string, monthStr: string) {
    const [year, month] = monthStr.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    const rows = this.db.prepare(`
      SELECT CAST(strftime('%d', date) AS INTEGER) as day, SUM(amount) as total
      FROM transactions
      WHERE user_id = ?
        AND type = 'expense'
        AND is_deleted = 0
        AND date LIKE ?
      GROUP BY day
      ORDER BY day ASC
    `).all(userId, `${monthStr}%`) as any[];

    const dayMap: Record<number, number> = {};
    for (const r of rows) {
      dayMap[r.day] = r.total;
    }

    let runningCumulative = 0;
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dailySpent = dayMap[d] || 0;
      runningCumulative += dailySpent;
      days.push({
        day: d,
        date: `${monthStr}-${String(d).padStart(2, '0')}`,
        dailySpent,
        cumulativeSpent: runningCumulative,
      });
    }

    return {
      month: monthStr,
      daysInMonth,
      totalSpent: runningCumulative,
      days,
    };
  }

  getSplitTransactionsAnalytics(userId: string, monthStr?: string) {
    const monthFilter = monthStr ? `AND t.date LIKE '${monthStr}%'` : '';

    const splits = this.db.prepare(`
      SELECT 
        ts.id as split_id, ts.transaction_id, ts.category_id, ts.amount as split_amount, ts.notes as split_notes,
        t.date, t.amount as transaction_total, t.merchant_name,
        c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transaction_splits ts
      JOIN transactions t ON t.id = ts.transaction_id
      LEFT JOIN categories c ON c.id = ts.category_id
      WHERE t.user_id = ? AND t.is_deleted = 0 ${monthFilter}
      ORDER BY t.date DESC
    `).all(userId) as any[];

    const txMap: Record<string, any> = {};
    const categoryTotals: Record<string, { name: string; color: string; total: number; count: number }> = {};
    let totalSplitVolume = 0;

    for (const s of splits) {
      totalSplitVolume += s.split_amount;
      if (!txMap[s.transaction_id]) {
        txMap[s.transaction_id] = {
          transactionId: s.transaction_id,
          date: s.date,
          merchantName: s.merchant_name || 'Multi-Item Purchase',
          totalAmount: s.transaction_total,
          splits: [],
        };
      }
      txMap[s.transaction_id].splits.push({
        splitId: s.split_id,
        categoryId: s.category_id,
        categoryName: s.category_name || 'General',
        color: s.category_color || '#4F46E5',
        amount: s.split_amount,
        notes: s.split_notes,
      });

      const catKey = s.category_name || 'General';
      if (!categoryTotals[catKey]) {
        categoryTotals[catKey] = {
          name: catKey,
          color: s.category_color || '#4F46E5',
          total: 0,
          count: 0,
        };
      }
      categoryTotals[catKey].total += s.split_amount;
      categoryTotals[catKey].count += 1;
    }

    const topCategories = Object.values(categoryTotals).sort((a, b) => b.total - a.total);

    return {
      totalSplitTransactions: Object.keys(txMap).length,
      totalSplitVolume,
      topCategories,
      recentSplitTransactions: Object.values(txMap).slice(0, 10),
    };
  }

  getMonthComparison(userId: string, monthA: string, monthB: string) {
    const rawMetricsA = this.getDashboardMetrics(userId, monthA);
    const rawMetricsB = this.getDashboardMetrics(userId, monthB);

    const metricsA = {
      ...rawMetricsA,
      totalIncome: rawMetricsA.monthlyIncome,
      totalExpense: rawMetricsA.monthlyExpenses,
      netSavings: rawMetricsA.monthlySavings,
    };
    const metricsB = {
      ...rawMetricsB,
      totalIncome: rawMetricsB.monthlyIncome,
      totalExpense: rawMetricsB.monthlyExpenses,
      netSavings: rawMetricsB.monthlySavings,
    };

    const catsA = this.getSpendingByCategory(userId, monthA);
    const catsB = this.getSpendingByCategory(userId, monthB);

    const catMapA = new Map(catsA.map(c => [c.id, c]));
    const catMapB = new Map(catsB.map(c => [c.id, c]));
    const allCatIds = new Set([...catMapA.keys(), ...catMapB.keys()]);

    const categoryComparison = Array.from(allCatIds).map(catId => {
      const a = catMapA.get(catId);
      const b = catMapB.get(catId);
      const name = a?.name || b?.name || 'Category';
      const color = a?.color || b?.color || '#4F46E5';
      const icon = a?.icon || b?.icon || 'tag';
      const spentA = a?.total || 0;
      const spentB = b?.total || 0;
      const delta = spentA - spentB;
      const percentChange = spentB > 0 ? Math.round((delta / spentB) * 100) : (spentA > 0 ? 100 : 0);

      return {
        id: catId,
        name,
        color,
        icon,
        amountA: spentA,
        amountB: spentB,
        spentA,
        spentB,
        diff: delta,
        delta,
        percentChange,
      };
    }).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

    const incomeDelta = metricsA.totalIncome - metricsB.totalIncome;
    const expenseDelta = metricsA.totalExpense - metricsB.totalExpense;
    const savingsDelta = metricsA.netSavings - metricsB.netSavings;
    const savingsRateDelta = metricsA.savingsRate - metricsB.savingsRate;

    const incomePercent = metricsB.totalIncome > 0
      ? Math.round((incomeDelta / metricsB.totalIncome) * 100)
      : (metricsA.totalIncome > 0 ? 100 : 0);

    const expensePercent = metricsB.totalExpense > 0
      ? Math.round((expenseDelta / metricsB.totalExpense) * 100)
      : (metricsA.totalExpense > 0 ? 100 : 0);

    const diff = {
      income: incomeDelta,
      incomePercent,
      expense: expenseDelta,
      expensePercent,
      netSavings: savingsDelta,
      savings: savingsDelta,
      savingsRate: savingsRateDelta,
    };

    return {
      monthA,
      monthB,
      metricsA,
      metricsB,
      diff,
      deltas: {
        incomeDelta,
        expenseDelta,
        savingsDelta,
        savingsRateDelta,
      },
      categoryComparison,
      categoryDeltas: categoryComparison,
    };
  }

  // --- DETERMINISTIC FINANCIAL INSIGHTS ---

  getDeterministicInsights(userId: string) {
    const insights = [];
    const currentMonth = new Date().toISOString().substring(0, 7);
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const prevMonth = d.toISOString().substring(0, 7);

    const currentMetrics = this.getDashboardMetrics(userId, currentMonth);
    const prevMetrics = this.getDashboardMetrics(userId, prevMonth);

    // 1. Spending comparison vs last month
    if (prevMetrics.monthlyExpenses > 0 && currentMetrics.monthlyExpenses > 0) {
      const diff = currentMetrics.monthlyExpenses - prevMetrics.monthlyExpenses;
      const absDiff = Math.abs(diff);
      if (diff > 0) {
        insights.push({
          type: 'warning',
          title: 'Spending Increased',
          description: `You have spent ₹${Math.round(absDiff / 100).toLocaleString('en-IN')} more this month than last month.`,
        });
      } else {
        insights.push({
          type: 'positive',
          title: 'Spending Reduced',
          description: `Great job! Your spending is ₹${Math.round(absDiff / 100).toLocaleString('en-IN')} lower than last month.`,
        });
      }
    }

    // 2. Savings Rate insight
    if (currentMetrics.savingsRate > 20) {
      insights.push({
        type: 'positive',
        title: 'Healthy Savings Rate',
        description: `Your savings rate is ${currentMetrics.savingsRate}% this month, exceeding the 20% benchmark.`,
      });
    }

    // 3. Top category insight
    const topCats = this.getSpendingByCategory(userId, currentMonth);
    if (topCats.length > 0) {
      insights.push({
        type: 'info',
        title: 'Largest Expense Category',
        description: `${topCats[0].name} accounts for ${topCats[0].percentage}% of your total expenses this month.`,
      });
    }

    // 4. Subscriptions insight
    const subs = this.getSubscriptions(userId);
    if (subs.monthlyTotal > 0) {
      insights.push({
        type: 'info',
        title: 'Recurring Subscriptions',
        description: `Active subscriptions cost ₹${Math.round(subs.monthlyTotal / 100).toLocaleString('en-IN')}/month (₹${Math.round(subs.annualTotal / 100).toLocaleString('en-IN')}/year).`,
      });
    }

    // 5. Credit card utilization insight
    const accounts = this.getAccounts(userId);
    const creditCards = accounts.filter(a => a.type === 'credit_card' && a.credit_limit > 0);
    for (const card of creditCards) {
      if (card.utilizationRate > 30) {
        insights.push({
          type: 'warning',
          title: 'High Credit Utilization',
          description: `${card.name} is at ${card.utilizationRate}% utilization (₹${Math.round(card.current_balance / 100).toLocaleString('en-IN')} of ₹${Math.round(card.credit_limit / 100).toLocaleString('en-IN')}). Aim to stay under 30%.`,
        });
      }
    }

    // 6. Overspent budgets insight
    const budgets = this.getBudgets(userId, currentMonth);
    const overspent = budgets.filter(b => b.isOverspent);
    if (overspent.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Budget Limit Exceeded',
        description: `${overspent[0].category_name} has exceeded its budget by ₹${Math.round(Math.abs(overspent[0].remaining) / 100).toLocaleString('en-IN')}.`,
      });
    }

    // 7. Savings goals progress insight
    const goals = this.getGoals(userId);
    const completedGoals = goals.filter(g => g.percent >= 100);
    const nearingGoals = goals.filter(g => g.percent >= 75 && g.percent < 100);
    if (completedGoals.length > 0) {
      insights.push({
        type: 'positive',
        title: 'Goal Achieved!',
        description: `Congratulations! You reached 100% of your target for "${completedGoals[0].name}".`,
      });
    } else if (nearingGoals.length > 0) {
      insights.push({
        type: 'positive',
        title: 'Goal In Reach',
        description: `"${nearingGoals[0].name}" is ${nearingGoals[0].percent}% funded — almost there!`,
      });
    }

    return insights;
  }

  // --- SEED DEMO DATA (PRIMARY USER JOURNEY) ---

  seedDemoData(userId: string) {
    // 1. Clear existing non-user records for clean demo
    this.db.prepare('DELETE FROM transaction_splits WHERE transaction_id IN (SELECT id FROM transactions WHERE user_id = ?)').run(userId);
    this.db.prepare('DELETE FROM transaction_tags WHERE transaction_id IN (SELECT id FROM transactions WHERE user_id = ?)').run(userId);
    this.db.prepare('DELETE FROM transactions WHERE user_id = ?').run(userId);
    this.db.prepare('DELETE FROM budgets WHERE user_id = ?').run(userId);
    this.db.prepare('DELETE FROM goals WHERE user_id = ?').run(userId);
    this.db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(userId);
    this.db.prepare('DELETE FROM recurring_transactions WHERE user_id = ?').run(userId);
    this.db.prepare('DELETE FROM investments WHERE user_id = ?').run(userId);
    this.db.prepare('DELETE FROM loans WHERE user_id = ?').run(userId);
    this.db.prepare('DELETE FROM accounts WHERE user_id = ?').run(userId);

    // 2. Accounts (from prompt #70 primary user journey)
    const hdfc = this.createAccount({
      userId,
      name: 'HDFC Savings',
      institution: 'HDFC Bank',
      type: 'savings',
      currency: 'INR',
      openingBalance: 10000000, // ₹1,00,000
      icon: 'landmark',
      color: '#1E40AF',
    })!;

    const sbi = this.createAccount({
      userId,
      name: 'SBI Savings',
      institution: 'State Bank of India',
      type: 'savings',
      currency: 'INR',
      openingBalance: 5000000, // ₹50,000
      icon: 'landmark',
      color: '#0284C7',
    })!;

    const hdfcCard = this.createAccount({
      userId,
      name: 'HDFC Millennia Credit Card',
      institution: 'HDFC Bank',
      type: 'credit_card',
      currency: 'INR',
      openingBalance: 1000000, // ₹10,000 previous statement balance
      creditLimit: 10000000, // ₹1,00,000 limit
      icon: 'credit-card',
      color: '#DC2626',
    })!;

    const cash = this.createAccount({
      userId,
      name: 'Physical Cash',
      institution: 'Cash in Hand',
      type: 'cash',
      currency: 'INR',
      openingBalance: 500000, // ₹5,000
      icon: 'coins',
      color: '#10B981',
    })!;

    const zerodha = this.createAccount({
      userId,
      name: 'Zerodha Kite',
      institution: 'Zerodha',
      type: 'investment',
      currency: 'INR',
      openingBalance: 25000000, // ₹2,50,000
      icon: 'trending-up',
      color: '#F97316',
    })!;

    const fd = this.createAccount({
      userId,
      name: 'HDFC Fixed Deposit',
      institution: 'HDFC Bank',
      type: 'fixed_deposit',
      currency: 'INR',
      openingBalance: 15000000, // ₹1,50,000
      icon: 'shield-check',
      color: '#8B5CF6',
    })!;

    // 3. Transactions matching Requirement 70 Primary User Journey
    const today = new Date().toISOString().substring(0, 10);
    const thisMonth = today.substring(0, 7);

    // Salary: ₹1,20,000 to HDFC
    this.createTransaction({
      userId,
      accountId: hdfc.id,
      type: 'income',
      amount: 12000000,
      date: `${thisMonth}-01`,
      merchantName: 'TechCorp Solutions',
      categoryId: 'cat-inc-fulltime',
      notes: 'Monthly Salary Credit',
    });

    // Transfer: ₹20,000 SBI -> HDFC
    this.createTransaction({
      userId,
      accountId: sbi.id,
      type: 'transfer',
      amount: 2000000,
      date: `${thisMonth}-02`,
      destinationAccountId: hdfc.id,
      notes: 'Monthly Savings Transfer',
    });

    // Expense: ₹850 Swiggy on HDFC Credit Card
    this.createTransaction({
      userId,
      accountId: hdfcCard.id,
      type: 'expense',
      amount: 85000,
      date: `${thisMonth}-03`,
      merchantName: 'Swiggy',
      categoryId: 'cat-food-delivery',
      notes: 'Dinner Order',
      tags: ['#food', '#personal'],
    });

    // Expense: ₹4,200 Groceries Nature Basket on HDFC Card
    this.createTransaction({
      userId,
      accountId: hdfcCard.id,
      type: 'expense',
      amount: 420000,
      date: `${thisMonth}-04`,
      merchantName: 'Nature Basket',
      categoryId: 'cat-food-groceries',
      notes: 'Weekly organic groceries',
    });

    // Credit Card Payment: ₹10,000 HDFC -> HDFC Credit Card
    this.createTransaction({
      userId,
      accountId: hdfc.id,
      type: 'transfer',
      amount: 1000000,
      date: `${thisMonth}-05`,
      destinationAccountId: hdfcCard.id,
      notes: 'Credit Card Outstanding Settlement',
    });

    // Split Transaction: Amazon ₹5,000
    this.createTransaction({
      userId,
      accountId: hdfc.id,
      type: 'expense',
      amount: 500000,
      date: `${thisMonth}-06`,
      merchantName: 'Amazon India',
      splits: [
        { categoryId: 'cat-shop-gadgets', amount: 350000, notes: 'Noise Cancelling Headphones' },
        { categoryId: 'cat-shop-home', amount: 100000, notes: 'Desk Lamp' },
        { categoryId: 'cat-food-coffee', amount: 50000, notes: 'Blue Tokai Coffee' },
      ],
      tags: ['#amazon', '#setup'],
    });

    // 4. Budgets
    this.createBudget({
      userId,
      categoryId: 'cat-food',
      amount: 1500000, // ₹15,000 Food Budget
      periodType: 'monthly',
      rollover: true,
    });

    this.createBudget({
      userId,
      categoryId: 'cat-shopping',
      amount: 1000000, // ₹10,000 Shopping Budget
      periodType: 'monthly',
    });

    // 5. Goals
    this.createGoal({
      userId,
      name: 'MacBook Pro M-Series',
      targetAmount: 15000000, // ₹1,50,000
      currentAmount: 7500000, // ₹75,000
      targetDate: '2027-06-30',
      notes: '16-inch M3 Max for development',
    });

    this.createGoal({
      userId,
      name: 'Emergency Fund (6 Months)',
      targetAmount: 30000000, // ₹3,00,000
      currentAmount: 18000000, // ₹1,80,000
      targetDate: '2026-12-31',
      notes: 'Safe liquid emergency reserves',
    });

    // 6. Recurring Transactions
    this.createRecurring({
      userId,
      accountId: hdfc.id,
      type: 'expense',
      amount: 2500000, // ₹25,000/month rent
      frequency: 'monthly',
      nextDate: `${thisMonth}-05`,
      merchant: 'Landlord Apartment',
      categoryId: 'cat-house-rent',
      notes: 'Monthly Apartment Rent',
    });

    this.createRecurring({
      userId,
      accountId: hdfc.id,
      type: 'income',
      amount: 12000000, // ₹1,20,000
      frequency: 'monthly',
      nextDate: `${thisMonth}-01`,
      merchant: 'TechCorp Solutions',
      categoryId: 'cat-inc-fulltime',
      notes: 'Monthly Direct Deposit Salary',
    });

    // 7. Subscriptions
    this.createSubscription({
      userId,
      name: 'Netflix Premium (4K)',
      amount: 64900, // ₹649/month
      billingFrequency: 'monthly',
      nextBillingDate: `${thisMonth}-18`,
      accountId: hdfcCard.id,
      categoryId: 'cat-ent-streaming',
      notes: 'Family 4-screen plan',
    });

    this.createSubscription({
      userId,
      name: 'Spotify Premium Family',
      amount: 17900, // ₹179/month
      billingFrequency: 'monthly',
      nextBillingDate: `${thisMonth}-22`,
      accountId: hdfcCard.id,
      categoryId: 'cat-ent-streaming',
      notes: 'High resolution streaming',
    });

    this.createSubscription({
      userId,
      name: 'Amazon Prime Yearly',
      amount: 149900, // ₹1,499/year
      billingFrequency: 'yearly',
      nextBillingDate: `${thisMonth}-28`,
      accountId: hdfcCard.id,
      categoryId: 'cat-shop-gadgets',
      notes: 'Free delivery & Prime Video',
    });

    // 8. Investments Portfolio
    this.createInvestment({
      userId,
      accountId: zerodha.id,
      symbol: 'NIFTYBEES',
      name: 'Nippon India Nifty 50 ETF',
      assetType: 'etf',
      quantity: 500,
      costBasis: 12000000, // ₹1,20,000
      currentPrice: 26500, // ₹265/unit
      notes: 'Core index foundation',
    });

    this.createInvestment({
      userId,
      accountId: zerodha.id,
      symbol: 'GOLDBEES',
      name: 'Nippon India Gold ETF',
      assetType: 'gold',
      quantity: 800,
      costBasis: 5000000, // ₹50,000
      currentPrice: 7200, // ₹72/unit
      notes: 'Gold hedge against inflation',
    });

    // 9. Loans
    this.createLoan({
      userId,
      accountId: hdfc.id,
      name: 'Car Loan (EV)',
      principal: 80000000, // ₹8,00,000
      outstandingPrincipal: 52000000, // ₹5,20,000 remaining
      interestRate: 8.75,
      tenureMonths: 60,
      startDate: '2024-01-10',
    });

    return { seeded: true };
  }
}

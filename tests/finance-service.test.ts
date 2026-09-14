import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { initSchema, seedDefaultCategories } from '../src/lib/db';
import { FinanceService } from '../src/lib/finance-service';

describe('Finance Domain Business Logic Tests', () => {
  let db: DatabaseSync;
  let service: FinanceService;
  const userId = 'user_vitest_1';

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    initSchema(db);
    db.prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)').run(userId, 'vitest@wallet.local', 'Vitest User');
    seedDefaultCategories(db, userId);
    service = new FinanceService(db);
  });

  it('handles regular income and expense with exact balance adjustment', () => {
    // 1. Add HDFC Savings: ₹1,00,000 (10000000 paise)
    const hdfc = service.createAccount({
      userId,
      name: 'HDFC Savings',
      type: 'savings',
      openingBalance: 10000000,
    });
    expect(hdfc?.current_balance).toBe(10000000);

    // 2. Add Salary income: ₹1,20,000
    service.createTransaction({
      userId,
      accountId: hdfc!.id,
      type: 'income',
      amount: 12000000,
      date: '2026-03-01',
      merchantName: 'Employer Corp',
    });

    const afterSalary = service.getAccountById(hdfc!.id, userId);
    expect(afterSalary?.current_balance).toBe(22000000); // 1,00,000 + 1,20,000 = 2,20,000

    // 3. Add Groceries expense: ₹4,000
    service.createTransaction({
      userId,
      accountId: hdfc!.id,
      type: 'expense',
      amount: 400000,
      date: '2026-03-02',
      merchantName: 'Nature Basket',
    });

    const afterExpense = service.getAccountById(hdfc!.id, userId);
    expect(afterExpense?.current_balance).toBe(21600000); // 2,20,000 - 4,000 = 2,16,000
  });

  it('handles first-class transfers without distorting income, expenses, or net worth', () => {
    // SBI: ₹50,000 (5000000)
    const sbi = service.createAccount({
      userId,
      name: 'SBI Savings',
      type: 'savings',
      openingBalance: 5000000,
    });

    // HDFC: ₹1,00,000 (10000000)
    const hdfc = service.createAccount({
      userId,
      name: 'HDFC Savings',
      type: 'savings',
      openingBalance: 10000000,
    });

    const metricsBefore = service.getDashboardMetrics(userId, '2026-03');
    expect(metricsBefore.netWorth).toBe(15000000); // ₹1,50,000
    expect(metricsBefore.monthlyIncome).toBe(0);
    expect(metricsBefore.monthlyExpenses).toBe(0);

    // Transfer ₹20,000 (2000000) from SBI -> HDFC
    const transfer = service.createTransaction({
      userId,
      accountId: sbi!.id,
      type: 'transfer',
      amount: 2000000,
      date: '2026-03-05',
      destinationAccountId: hdfc!.id,
    });

    expect(transfer.type).toBe('transfer');

    // SBI balance should be 50,000 - 20,000 = 30,000
    const sbiAfter = service.getAccountById(sbi!.id, userId);
    expect(sbiAfter?.current_balance).toBe(3000000);

    // HDFC balance should be 1,00,000 + 20,000 = 1,20,000
    const hdfcAfter = service.getAccountById(hdfc!.id, userId);
    expect(hdfcAfter?.current_balance).toBe(12000000);

    // CRITICAL: Transfers must NOT appear as income or expenses in monthly cash flow reports!
    const metricsAfter = service.getDashboardMetrics(userId, '2026-03');
    expect(metricsAfter.monthlyIncome).toBe(0);
    expect(metricsAfter.monthlyExpenses).toBe(0);
    // Net worth remains exactly unchanged (₹1,50,000)
    expect(metricsAfter.netWorth).toBe(15000000);
  });

  it('correctly tracks credit card purchases and payments with utilization rate', () => {
    // Bank account with ₹50,000
    const bank = service.createAccount({
      userId,
      name: 'HDFC Bank',
      type: 'savings',
      openingBalance: 5000000,
    });

    // Credit Card with limit ₹1,00,000 (10000000) and 0 initial balance
    const card = service.createAccount({
      userId,
      name: 'HDFC Credit Card',
      type: 'credit_card',
      openingBalance: 0,
      creditLimit: 10000000,
    });

    expect(card?.current_balance).toBe(0);
    expect(card?.availableCredit).toBe(10000000);
    expect(card?.utilizationRate).toBe(0);

    // 1. Purchase ₹850 (85000 paise) Swiggy on Credit Card
    service.createTransaction({
      userId,
      accountId: card!.id,
      type: 'expense',
      amount: 85000,
      date: '2026-03-03',
      merchantName: 'Swiggy',
    });

    const cardAfterExpense = service.getAccountById(card!.id, userId);
    // Debt owed increases by ₹850
    expect(cardAfterExpense?.current_balance).toBe(85000);
    expect(cardAfterExpense?.availableCredit).toBe(9915000);

    // 2. Another purchase ₹9,150 (915000 paise) -> total debt ₹10,000 (1000000 paise)
    service.createTransaction({
      userId,
      accountId: card!.id,
      type: 'expense',
      amount: 915000,
      date: '2026-03-04',
      merchantName: 'Amazon',
    });

    const cardAtTenK = service.getAccountById(card!.id, userId);
    expect(cardAtTenK?.current_balance).toBe(1000000);
    expect(cardAtTenK?.utilizationRate).toBe(10); // 10,000 / 1,00,000 = 10%

    // 3. Credit Card Payment: ₹10,000 from Bank -> Credit Card (as a transfer!)
    service.createTransaction({
      userId,
      accountId: bank!.id,
      type: 'transfer',
      amount: 1000000,
      date: '2026-03-10',
      destinationAccountId: card!.id,
      notes: 'Credit Card Bill Payment',
    });

    // Bank decreases from 50,000 to 40,000
    const bankAfterPayment = service.getAccountById(bank!.id, userId);
    expect(bankAfterPayment?.current_balance).toBe(4000000);

    // Credit card outstanding returns to 0
    const cardAfterPayment = service.getAccountById(card!.id, userId);
    expect(cardAfterPayment?.current_balance).toBe(0);
    expect(cardAfterPayment?.availableCredit).toBe(10000000);
    expect(cardAfterPayment?.utilizationRate).toBe(0);
  });

  it('strictly validates split transactions to prevent balance distortion', () => {
    const bank = service.createAccount({
      userId,
      name: 'ICICI Bank',
      type: 'savings',
      openingBalance: 2000000,
    });

    // Amazon ₹5,000 (500000 paise) split into 3500 + 1000 + 500 = 5000
    const validTx = service.createTransaction({
      userId,
      accountId: bank!.id,
      type: 'expense',
      amount: 500000,
      date: '2026-03-04',
      merchantName: 'Amazon',
      splits: [
        { categoryId: 'cat-shop-gadgets', amount: 350000, notes: 'Headphones' },
        { categoryId: 'cat-shop-home', amount: 100000, notes: 'Lamp' },
        { categoryId: 'cat-food-coffee', amount: 50000, notes: 'Coffee beans' },
      ],
    });

    expect(validTx.id).toBeDefined();
    expect(validTx.splits.length).toBe(3);

    // Invalid split mismatch: total ₹5,000 but splits sum to ₹4,000 -> must throw error
    expect(() => {
      service.createTransaction({
        userId,
        accountId: bank!.id,
        type: 'expense',
        amount: 500000,
        date: '2026-03-04',
        merchantName: 'Amazon',
        splits: [
          { categoryId: 'cat-shop-gadgets', amount: 300000 },
          { categoryId: 'cat-shop-home', amount: 100000 },
        ],
      });
    }).toThrow(/Split amounts total/);
  });

  it('computes accurate loan amortization schedules', () => {
    // ₹10,00,000 (100000000 paise) loan at 8.5% p.a. for 12 months
    const loan = service.calculateLoanAmortization(100000000, 8.5, 12, '2026-04-01');
    expect(loan.schedule.length).toBe(12);
    expect(loan.monthlyEmi).toBeGreaterThan(8000000); // > ₹80,000
    expect(loan.schedule[11].remainingPrincipal).toBe(0); // Final remaining principal is 0
  });

  it('detects duplicate transactions reliably', () => {
    const bank = service.createAccount({
      userId,
      name: 'HDFC Bank',
      type: 'savings',
      openingBalance: 5000000,
    });

    service.createTransaction({
      userId,
      accountId: bank!.id,
      type: 'expense',
      amount: 85000, // ₹850
      date: '2026-03-05',
      merchantName: 'Swiggy',
    });

    const dup = service.checkDuplicate(userId, bank!.id, '2026-03-06', 85000, 'Swiggy');
    expect(dup).not.toBeNull();
    expect(dup?.isPossibleDuplicate).toBe(true);

    const nonDup = service.checkDuplicate(userId, bank!.id, '2026-03-06', 99000, 'Swiggy');
    expect(nonDup).toBeNull();
  });

  it('runs Primary User Journey (#70) and produces mathematically consistent metrics', () => {
    service.seedDemoData(userId);

    const accounts = service.getAccounts(userId);
    expect(accounts.length).toBe(6);

    const thisMonth = new Date().toISOString().substring(0, 7);
    const metrics = service.getDashboardMetrics(userId, thisMonth);

    // Income: Salary ₹1,20,000 = 12000000 paise
    expect(metrics.monthlyIncome).toBe(12000000);

    // Expenses:
    // Swiggy: ₹850 (85000)
    // Groceries: ₹4,200 (420000)
    // Amazon split: ₹5,000 (500000)
    // Total expenses = 85000 + 420000 + 500000 = 1005000 (₹10,050)
    expect(metrics.monthlyExpenses).toBe(1005000);

    // Savings: 1,20,000 - 10,050 = 1,09,950
    expect(metrics.monthlySavings).toBe(10995000);
    expect(metrics.savingsRate).toBe(92); // (10995000 / 12000000) * 100 = 91.6% -> 92%

    // Net Worth should include:
    // Assets: HDFC Savings + SBI Savings + Cash + Zerodha + FD
    // Liabilities: Credit Card Debt (if any)
    expect(metrics.netWorth).toBeGreaterThan(50000000); // > ₹5,00,000

    // Budgets
    const budgets = service.getBudgets(userId, thisMonth);
    const foodBudget = budgets.find(b => b.category_id === 'cat-food');
    expect(foodBudget).toBeDefined();
    expect(foodBudget?.amount).toBe(1500000); // ₹15,000
    // Food spent: Swiggy ₹850 + Groceries ₹4,200 = ₹5,050 (505000)
    // (Note: subcategory spending rollups or direct category)

    // Goals
    const goals = service.getGoals(userId);
    const macbook = goals.find(g => g.name.includes('MacBook'));
    expect(macbook).toBeDefined();
    expect(macbook?.target_amount).toBe(15000000); // ₹1,50,000
    expect(macbook?.current_amount).toBe(7500000); // ₹75,000
    expect(macbook?.percent).toBe(50); // 50%

    // Subscriptions
    const subs = service.getSubscriptions(userId);
    expect(subs.subscriptions.length).toBe(3);
    expect(subs.monthlyTotal).toBeGreaterThan(80000); // > ₹800/month
  });

  it('manages subscription payments, alreadyPaid flag, and snooze properly', () => {
    const acc = service.createAccount({
      userId,
      name: 'Salary Account',
      type: 'savings',
      openingBalance: 5000000, // ₹50,000
    });

    // 1. Create subscription with alreadyPaid = true
    const subId = service.createSubscription({
      userId,
      name: 'Netflix Premium',
      amount: 64900, // ₹649
      billingFrequency: 'monthly',
      nextBillingDate: '2026-09-14',
      accountId: acc!.id,
      alreadyPaid: true,
      lastPaidDate: '2026-09-14',
    });

    // An expense transaction should exist immediately
    const accAfter = service.getAccountById(acc!.id, userId);
    expect(accAfter?.current_balance).toBe(5000000 - 64900);

    const subsData = service.getSubscriptions(userId);
    const sub = subsData.subscriptions.find(s => s.id === subId);
    expect(sub).toBeDefined();
    expect(sub?.payment_status).toBe('paid');
    expect(sub?.last_paid_date).toBe('2026-09-14');
    expect(sub?.next_billing_date).toBe('2026-10-14');

    // 2. Snooze / Pay Late
    service.snoozeSubscription({
      userId,
      subscriptionId: subId,
      newNextBillingDate: '2026-10-25',
    });

    const subsAfterSnooze = service.getSubscriptions(userId);
    const snoozedSub = subsAfterSnooze.subscriptions.find(s => s.id === subId);
    expect(snoozedSub?.next_billing_date).toBe('2026-10-25');
    expect(snoozedSub?.payment_status).toBe('pending');

    // 3. Record next payment manually via recordSubscriptionPayment
    service.recordSubscriptionPayment({
      userId,
      subscriptionId: subId,
      paidDate: '2026-10-25',
      accountId: acc!.id,
    });

    const accAfterSecondPayment = service.getAccountById(acc!.id, userId);
    expect(accAfterSecondPayment?.current_balance).toBe(5000000 - (64900 * 2));

    const subsAfterSecondPayment = service.getSubscriptions(userId);
    const paidSub = subsAfterSecondPayment.subscriptions.find(s => s.id === subId);
    expect(paidSub?.payment_status).toBe('paid');
    expect(paidSub?.last_paid_date).toBe('2026-10-25');
    expect(paidSub?.next_billing_date).toBe('2026-11-25');
  });
});

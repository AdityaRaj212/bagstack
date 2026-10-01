import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Mock useApp
vi.mock('../src/context/AppContext', () => ({
  useApp: () => ({ refreshKey: 0 })
}));

import ReportsPageRaw, { SpeedometerGauge, DailyBar, ExpenseDonutChart } from '../src/app/reports/page';

const ReportsPage = ReportsPageRaw as React.ComponentType<{ initialData?: any; initialForecast?: any }>;

describe('Reports Page Comprehensive Render Tests', () => {
  it('renders initial loading state when no initialData is provided', () => {
    const html = renderToString(React.createElement(ReportsPage));
    expect(html).toContain('Loading comprehensive analytics and reports');
  });

  it('renders loaded dashboard with real user data from staging', () => {
    const mockData = {
      selectedMonth: '2026-10',
      spendingByCategory: [],
      spendingByTag: [],
      spendingByMerchant: [
        { merchant_name: 'Shree Krishna Properties', count: 6, total: 16800000 }
      ],
      cashFlowTrend: [
        { month: '2026-09', monthLabel: 'Oct 26', income: 385000, expense: 6703800, net: -6318800 }
      ],
      metrics: {
        month: '2026-10',
        netWorth: 133246800,
        totalAssets: 208352000,
        totalLiabilities: 75105200,
        cashBalance: 140352000,
        investmentBalance: 68000000,
        creditCardOutstanding: 12105200,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        monthlySavings: 0,
        savingsRate: 0
      },
      dailySpending: {
        month: '2026-10',
        daysInMonth: 31,
        totalSpent: 0,
        days: [
          { day: 1, date: '2026-10-01', dailySpent: 0, cumulativeSpent: 0 }
        ]
      },
      budgetHealth: {
        totalBudgeted: 8200000,
        totalSpent: 0,
        totalRemaining: 8200000,
        overallPercent: 0,
        totalCategories: 6,
        overBudgetCount: 0,
        nearLimitCount: 0,
        healthyCount: 6,
        overBudgetItems: [],
        nearLimitItems: []
      },
      comparison: null
    };

    const mockForecast = {
      currentLiquidBalance: 140352000,
      periods: [
        { days: 30, currentLiquidBalance: 140352000, expectedIncome: 13500000, expectedExpenses: 3249892, projectedBalance: 150602108 }
      ]
    };

    const html = renderToString(React.createElement(ReportsPage, { initialData: mockData, initialForecast: mockForecast }));
    expect(html).toContain('Analytics &amp; Reports');
    expect(html).toContain('Shree Krishna Properties');
    expect(html).toContain('BUDGET UTILIZATION');
  });

  it('renders error state safely when api returns error', () => {
    const errorData = { error: 'Unauthorized: Authentication required' };
    const html = renderToString(React.createElement(ReportsPage, { initialData: errorData }));
    expect(html).toContain('Failed to load reports data');
    expect(html).toContain('Unauthorized: Authentication required');
  });

  it('renders safely when budgetHealth items are missing or null (Bug #1 reproduction)', () => {
    const mockData = {
      selectedMonth: '2026-10',
      spendingByCategory: [{ id: 'c1', name: 'Food', total: 5000, percentage: 100 }],
      spendingByTag: [{ id: 't1', name: 'dining', total: 5000, percentage: 100 }],
      spendingByMerchant: [{ merchant_name: 'Bistro', count: 1, total: 5000 }],
      cashFlowTrend: [],
      metrics: { monthlyExpenses: 5000, monthlyIncome: 10000 },
      dailySpending: { days: [{ day: 1, date: '2026-10-01', dailySpent: 5000, cumulativeSpent: 5000 }] },
      budgetHealth: {
        totalBudgeted: 10000,
        totalSpent: 5000,
        overallPercent: 50,
        totalCategories: 1,
        overBudgetCount: 0,
        nearLimitCount: 0,
        healthyCount: 1,
        // overBudgetItems and nearLimitItems omitted intentionally
      },
      comparison: null
    };

    const html = renderToString(React.createElement(ReportsPage, { initialData: mockData }));
    expect(html).toContain('Budget Health');
    expect(html).toContain('Food');
  });

  it('renders safely when category has null name and items have 0 total (Bug #2 reproduction)', () => {
    const mockData = {
      selectedMonth: '2026-10',
      spendingByCategory: [
        { id: 'c1', name: null, total: 0, percentage: 0 },
        { id: 'c2', name: 'Groceries', total: 5000, percentage: 100 }
      ],
      spendingByTag: [
        { id: 't1', name: null, total: 0, percentage: 0 }
      ],
      spendingByMerchant: [
        { merchant_name: null, count: 1, total: 5000 }
      ],
      metrics: { monthlyExpenses: 5000, monthlyIncome: 10000 },
      dailySpending: { days: [] },
      budgetHealth: null,
      comparison: null
    };

    const html = renderToString(React.createElement(ReportsPage, { initialData: mockData }));
    expect(html).toContain('Groceries');
    expect(html).toContain('Unknown Payee');
  });

  it('renders safely when comparison has diff but missing metricsA/B (Bug #3 reproduction)', () => {
    const mockData = {
      selectedMonth: '2026-10',
      spendingByCategory: [],
      spendingByTag: [],
      spendingByMerchant: [],
      metrics: { monthlyExpenses: 0, monthlyIncome: 0 },
      dailySpending: { days: [] },
      budgetHealth: null,
      comparison: {
        monthA: '2026-10',
        monthB: '2026-09',
        diff: { income: 5000, incomePercent: 10, expense: -2000, expensePercent: -5, netSavings: 7000 },
        metricsA: null, // intentionally null
        metricsB: null, // intentionally null
        categoryComparison: [{ id: 'c1', name: null, amountA: 1000, amountB: 2000, diff: -1000 }]
      }
    };

    // Render with compareEnabled logic simulated
    const html = renderToString(React.createElement(ReportsPage, { initialData: mockData }));
    expect(html).toBeDefined();
  });

  it('renders SpeedometerGauge safely with edge cases', () => {
    // NaN / Infinity / undefined values
    const html1 = renderToString(React.createElement(SpeedometerGauge, { value: NaN, max: 0, label: 'Test NaN' }));
    expect(html1).toContain('Test NaN');
    expect(html1).toContain('0<!-- -->%');

    const html2 = renderToString(React.createElement(SpeedometerGauge, { value: 75, max: 100, label: 'Healthy', sublabel: 'Doing great' }));
    expect(html2).toContain('75<!-- -->%');
    expect(html2).toContain('Doing great');
  });

  it('renders ExpenseDonutChart safely with empty, null, or hovered slice', () => {
    const emptyHtml = renderToString(React.createElement(ExpenseDonutChart, {
      items: [],
      totalSpend: 0,
      analyticsLabel: 'Category',
      hoveredId: null,
      onHover: vi.fn(),
    }));
    expect(emptyHtml).toContain('No expenses');

    const chartHtml = renderToString(React.createElement(ExpenseDonutChart, {
      items: [
        { id: '1', name: 'Rent', total: 5000000, percentage: 80, color: '#4F46E5' },
        { id: '2', name: 'Food', total: 1000000, percentage: 20, color: '#10B981' },
      ],
      totalSpend: 6000000,
      analyticsLabel: 'Category',
      hoveredId: '1',
      onHover: vi.fn(),
    }));
    expect(chartHtml).toContain('Rent');
  });

  it('renders DailyBar safely with 0 and spike spends', () => {
    const html = renderToString(React.createElement(DailyBar, {
      day: 1,
      date: '2026-10-01',
      spent: 1000000,
      cumulative: 2000000,
      maxSpend: 1000000,
      avgSpend: 200000,
    }));
    expect(html).toContain('linear-gradient');
  });
});

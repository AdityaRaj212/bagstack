'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Split,
  Flame,
  Scale,
} from 'lucide-react';

export default function ReportsPage() {
  const { refreshKey } = useApp();

  // Selected Month (YYYY-MM)
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Month Comparison State
  const [compareEnabled, setCompareEnabled] = useState(false);
  const prevMonthStr = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prev = new Date(year, month - 2, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedMonth]);
  const [compareMonth, setCompareMonth] = useState<string>(prevMonthStr);

  const [data, setData] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load analytics when selectedMonth or compareMonth changes
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('month', selectedMonth);
    if (compareEnabled && compareMonth) {
      params.set('compareMonth', compareMonth);
    }

    Promise.all([
      fetch(`/api/reports?${params.toString()}`).then(r => r.json()),
      fetch('/api/forecast').then(r => r.json()),
    ])
      .then(([rep, fc]) => {
        setData(rep);
        setForecast(fc);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedMonth, compareEnabled, compareMonth, refreshKey]);

  // Month Navigation Helpers
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prev = new Date(year, month - 2, 1);
    const newMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const next = new Date(year, month, 1);
    const newMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const formatMonthDisplay = (mStr: string) => {
    if (!mStr) return '';
    const [y, m] = mStr.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  if (loading && !data) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading comprehensive analytics and reports...
      </div>
    );
  }

  const spendingByCategory = data?.spendingByCategory || [];
  const spendingByMerchant = data?.spendingByMerchant || [];
  const periods = forecast?.periods || [];
  const dailySpending = data?.dailySpending?.days || (Array.isArray(data?.dailySpending) ? data?.dailySpending : []);
  const splitAnalytics = data?.splitAnalytics || {};
  const splitCount = splitAnalytics.totalSplitTransactions ?? splitAnalytics.count ?? 0;
  const splitVolume = splitAnalytics.totalSplitVolume ?? splitAnalytics.totalAmount ?? 0;
  const splitCategories = splitAnalytics.topCategories ?? splitAnalytics.topSplitCategories ?? [];
  const comparison = data?.comparison;
  const metrics = data?.metrics || { totalIncome: 0, totalExpense: 0, netSavings: 0, savingsRate: 0 };

  // Calculate max daily spend for chart scaling
  const maxDailySpend = Math.max(...dailySpending.map((d: any) => d.dailySpent ?? d.amount ?? 0), 100);
  const totalMonthSpend = metrics.totalExpense;
  const daysInMonth = dailySpending.length || 30;
  const avgDailySpend = daysInMonth > 0 ? Math.round(totalMonthSpend / daysInMonth) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header & Export Options */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Analytics & Reports</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Deep dive into monthly cash flows, month-over-month comparisons, daily burn rate, and 90-day forecasts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a href="/api/export?format=json" download className="btn-secondary">
            <Download size={16} /> Export JSON Backup
          </a>
          <a href="/api/export?format=csv" download className="btn-secondary">
            <Download size={16} /> Export CSV
          </a>
        </div>
      </div>

      {/* Top Month Selector & Comparison Toggle Bar */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
        }}
      >
        {/* Month Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="btn-icon"
            onClick={handlePrevMonth}
            title="Previous Month"
            style={{ width: '32px', height: '32px' }}
          >
            <ChevronLeft size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '190px', justifyContent: 'center' }}>
            <Calendar size={16} style={{ color: 'var(--brand-primary)' }} />
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              {formatMonthDisplay(selectedMonth)}
            </span>
          </div>
          <button
            className="btn-icon"
            onClick={handleNextMonth}
            title="Next Month"
            style={{ width: '32px', height: '32px' }}
          >
            <ChevronRight size={18} />
          </button>

          {selectedMonth !== currentMonthStr && (
            <button
              className="btn-ghost"
              onClick={() => setSelectedMonth(currentMonthStr)}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', color: 'var(--brand-primary)' }}
            >
              Current Month
            </button>
          )}
        </div>

        {/* Comparison Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setCompareEnabled(!compareEnabled)}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              backgroundColor: compareEnabled ? 'var(--brand-primary)' : 'var(--bg-subtle)',
              color: compareEnabled ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Scale size={14} /> Compare Months
          </button>

          {compareEnabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>vs</span>
              <input
                type="month"
                className="form-input"
                value={compareMonth}
                onChange={e => setCompareMonth(e.target.value)}
                style={{ fontSize: '0.8125rem', padding: '0.3rem 0.6rem' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Month-over-Month Comparison Widget (If Enabled) */}
      {compareEnabled && comparison?.diff && (
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--brand-primary)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--brand-light)',
                  color: 'var(--brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Scale size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                  Month Comparison: {formatMonthDisplay(comparison.monthA)} vs {formatMonthDisplay(comparison.monthB)}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Detailed delta in income, expenses, and category variance.
                </div>
              </div>
            </div>
          </div>

          {/* Delta KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {/* Income Delta */}
            <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>INCOME DELTA</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: comparison.diff.income >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
                  {comparison.diff.income >= 0 ? '+' : ''}₹{Math.round(comparison.diff.income / 100).toLocaleString('en-IN')}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: comparison.diff.income >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
                  ({comparison.diff.incomePercent}%)
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                ₹{(comparison.metricsA.totalIncome / 100).toLocaleString('en-IN')} vs ₹{(comparison.metricsB.totalIncome / 100).toLocaleString('en-IN')}
              </div>
            </div>

            {/* Expense Delta */}
            <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>EXPENSE DELTA</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: comparison.diff.expense <= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
                  {comparison.diff.expense >= 0 ? '+' : ''}₹{Math.round(comparison.diff.expense / 100).toLocaleString('en-IN')}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: comparison.diff.expense <= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
                  ({comparison.diff.expensePercent}%)
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                ₹{(comparison.metricsA.totalExpense / 100).toLocaleString('en-IN')} vs ₹{(comparison.metricsB.totalExpense / 100).toLocaleString('en-IN')}
              </div>
            </div>

            {/* Savings Delta */}
            <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>NET SAVINGS DELTA</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: comparison.diff.netSavings >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
                  {comparison.diff.netSavings >= 0 ? '+' : ''}₹{Math.round(comparison.diff.netSavings / 100).toLocaleString('en-IN')}
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Savings Rate: {comparison.metricsA.savingsRate}% vs {comparison.metricsB.savingsRate}%
              </div>
            </div>
          </div>

          {/* Category Variance Table */}
          {comparison.categoryComparison?.length > 0 && (
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Category-by-Category Shift
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {comparison.categoryComparison.slice(0, 6).map((c: any) => {
                  const increased = c.diff > 0;
                  return (
                    <div
                      key={c.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.4rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-subtle)',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{c.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          ₹{Math.round(c.amountA / 100).toLocaleString('en-IN')} vs ₹{Math.round(c.amountB / 100).toLocaleString('en-IN')}
                        </span>
                        <span
                          style={{
                            fontWeight: 600,
                            minWidth: '80px',
                            textAlign: 'right',
                            color: increased ? 'var(--color-expense)' : 'var(--color-income)',
                          }}
                        >
                          {increased ? '↑ +' : '↓ '}₹{Math.round(Math.abs(c.diff) / 100).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Daily Spending Burn Trend for Selected Month */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={18} style={{ color: 'var(--color-expense)' }} />
              Daily Spending Burn Rate ({formatMonthDisplay(selectedMonth)})
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Daily expense velocity and spending spikes across all {daysInMonth} days.
            </div>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Average: <strong style={{ color: 'var(--text-primary)' }}>₹{avgDailySpend.toLocaleString('en-IN')}/day</strong>
          </div>
        </div>

        {/* Daily Bars Visualizer */}
        <div
          style={{
            height: '140px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '3px',
            paddingTop: '1rem',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          {dailySpending.map((d: any) => {
            const spent = d.dailySpent ?? d.amount ?? 0;
            const cum = d.cumulativeSpent ?? d.cumulative ?? 0;
            const barHeight = maxDailySpend > 0 ? (spent / maxDailySpend) * 110 : 0;
            const hasSpend = spent > 0;

            return (
              <div
                key={d.day}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                }}
                title={`Day ${d.day} (${d.date}): ₹${(spent / 100).toLocaleString('en-IN')} | Cumulative: ₹${(cum / 100).toLocaleString('en-IN')}`}
              >
                <div
                  style={{
                    width: '100%',
                    maxWidth: '14px',
                    height: `${Math.max(2, barHeight)}px`,
                    background: hasSpend
                      ? spent > avgDailySpend * 1.5 * 100
                        ? 'linear-gradient(180deg, #F43F5E, #BE123C)'
                        : 'linear-gradient(180deg, #6366F1, #4F46E5)'
                      : 'var(--border-subtle)',
                    borderRadius: '2px 2px 0 0',
                    transition: 'height 300ms ease',
                    cursor: 'pointer',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Day scale markings */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)', padding: '0 2px' }}>
          <span>Day 1</span>
          <span>Day 7</span>
          <span>Day 14</span>
          <span>Day 21</span>
          <span>Day {daysInMonth}</span>
        </div>
      </div>

      {/* Split Transactions Breakdown & Forecast Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {/* Split Transactions Analysis */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Split size={16} style={{ color: 'var(--brand-primary)' }} /> Split Transactions Analytics
              </h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Multi-category receipts and itemized purchases
              </div>
            </div>
            <span className="badge badge-neutral">
              {splitCount} splits
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SPLIT VOLUME</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                ₹{Math.round(splitVolume / 100).toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AVG PER SPLIT</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                ₹{splitCount > 0 ? Math.round(splitVolume / splitCount / 100).toLocaleString('en-IN') : 0}
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              MOST SPLIT CATEGORIES
            </div>
            {splitCategories.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {splitCategories.map((sc: any) => (
                  <div
                    key={sc.name}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8125rem',
                      padding: '0.35rem 0.5rem',
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <span>{sc.name}</span>
                    <span style={{ fontWeight: 600 }}>₹{Math.round(sc.total / 100).toLocaleString('en-IN')} ({sc.count}x)</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
                No split transactions recorded for this month.
              </div>
            )}
          </div>
        </div>

        {/* 30/60/90 Day Cash-Flow Forecast */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 600 }}>30 / 60 / 90-Day Cash Flow Forecast</h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Deterministic projections based on recurring schedules & obligations.
              </div>
            </div>
            <span className="badge badge-neutral">Estimate</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
            {periods.map((p: any) => (
              <div
                key={p.days}
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {p.days}-DAY PROJECTION
                  </div>
                  <MoneyDisplay amount={p.projectedBalance} size="lg" weight="bold" />
                </div>
                <div style={{ fontSize: '0.75rem', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: 'var(--color-income)' }}>In: +₹{Math.round(p.expectedIncome / 100).toLocaleString('en-IN')}</span>
                  <span style={{ color: 'var(--color-expense)' }}>Out: -₹{Math.round(p.expectedExpenses / 100).toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2-Column Analytics: Categories & Top Merchants */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {/* Spending by Category */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Expenses by Category ({formatMonthDisplay(selectedMonth)})
          </h2>
          {spendingByCategory.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No category data available for this month.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {spendingByCategory.map((c: any) => (
                <div key={c.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                    <span style={{ fontWeight: 600 }}>
                      ₹{Math.round(c.total / 100).toLocaleString('en-IN')} ({c.percentage}%)
                    </span>
                  </div>
                  <div className="progress-bar-bg">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${c.percentage}%`,
                        backgroundColor: c.color || 'var(--brand-primary)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Merchants Breakdown */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Top Payees & Merchants</h2>
          {spendingByMerchant.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No merchant data available.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {spendingByMerchant.map((m: any, idx: number) => (
                <div
                  key={m.merchant_name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--border-default)',
                    fontSize: '0.875rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '20px' }}>#{idx + 1}</span>
                    <span style={{ fontWeight: 500 }}>{m.merchant_name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({m.count} txns)</span>
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    ₹{Math.round(m.total / 100).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

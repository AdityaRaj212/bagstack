'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { formatDateDMY } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  CreditCard,
  Target,
  Repeat,
  Plus,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  Upload,
} from 'lucide-react';
import { LandingPage } from '@/components/LandingPage';

export default function DashboardPage() {
  const { openTransactionModal, openImportModal, currentUser, refreshKey, showToast, isAuthenticated, openAuthModal, enterDemoMode } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [insightsExpanded, setInsightsExpanded] = useState(false);
  const [chartMode, setChartMode] = useState<'networth' | 'cashflow'>('networth');

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [isAuthenticated, refreshKey]);

  if (!isAuthenticated) {
    return <LandingPage onOpenAuth={openAuthModal} onEnterDemo={enterDemoMode} />;
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem 0', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ height: '40px', width: '220px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: '110px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {
    netWorth: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    cashBalance: 0,
    investmentBalance: 0,
    creditCardOutstanding: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    monthlySavings: 0,
    savingsRate: 0,
  };

  const accounts = data?.accounts || [];
  const topCategories = data?.topCategories || [];
  const recentTransactions = data?.recentTransactions || [];
  const budgets = data?.budgets || [];
  const goals = data?.goals || [];
  const subscriptions = data?.subscriptions?.subscriptions || [];
  const insights = data?.insights || [];
  const cashFlowTrend = data?.cashFlowTrend || [];


  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (currentUser?.name || '').replace(/\s*\(.*\)\s*/, '').split(' ')[0];
  const todayLabel = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const currency = currentUser?.baseCurrency || 'INR';

  const thisMonth = cashFlowTrend[cashFlowTrend.length - 1];
  const lastMonth = cashFlowTrend[cashFlowTrend.length - 2];
  const monthName = new Date().toLocaleDateString('en-IN', { month: 'long' });
  const pctChange = (cur: number, prev: number | undefined) =>
    prev && prev > 0 ? Math.round(((cur - prev) * 100) / prev) : null;
  const incomeDelta = pctChange(thisMonth?.income ?? metrics.monthlyIncome, lastMonth?.income);
  const spendDelta = pctChange(thisMonth?.expense ?? metrics.monthlyExpenses, lastMonth?.expense);
  const savingsRateTrend = cashFlowTrend.map((c: any) =>
    c.income > 0 ? Math.round(((c.income - c.expense) * 100) / c.income) : 0
  );


  // Charts only earn a sparkline when at least two months hold real data.
  const hasHistory = cashFlowTrend.filter((c: any) => c.income > 0 || c.expense > 0).length >= 2;

  // Month-end net worth, walked back from today's figure through each later month's net flow.
  const netWorthTrend: number[] = cashFlowTrend.map((_: any, i: number) =>
    metrics.netWorth -
    cashFlowTrend.slice(i + 1).reduce((s: number, c: any) => s + (c.income - c.expense), 0)
  );
  const netWorthDelta =
    netWorthTrend.length > 1 ? netWorthTrend[netWorthTrend.length - 1] - netWorthTrend[netWorthTrend.length - 2] : 0;

  // Upcoming obligations within a week (active subscriptions, EMIs and bills tracked as subscriptions).
  const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const now = new Date();
  const todayKey = toKey(now);
  const weekKey = toKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));
  // Card bills fall on each card's due day; the next one is this month's if it hasn't passed, else next month's.
  const cardBills = accounts
    .filter((a: any) => a.type === 'credit_card' && (a.totalDebt ?? a.current_balance) > 0 && a.due_date_day)
    .map((a: any) => {
      const day = Number(a.due_date_day);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), day);
      const due = toKey(thisMonth) >= todayKey ? thisMonth : new Date(now.getFullYear(), now.getMonth() + 1, day);
      return { name: `${a.name} bill`, amount: a.totalDebt ?? a.current_balance, next_billing_date: toKey(due) };
    });
  const upcoming = [
    ...subscriptions
      .filter((s: any) => (s.status ?? 'active') === 'active' && s.next_billing_date)
      .map((s: any) => ({ name: s.name, amount: s.amount || 0, next_billing_date: s.next_billing_date })),
    ...cardBills,
  ].sort((a: any, b: any) => a.next_billing_date.localeCompare(b.next_billing_date));
  const dueSoon = upcoming.filter((u: any) => u.next_billing_date <= weekKey);
  const nextLater = upcoming.find((u: any) => u.next_billing_date > weekKey);
  const dueSoonTotal = dueSoon.reduce((s: number, d: any) => s + (d.amount || 0), 0);
  const dueLabel = (date: string) => {
    if (date < todayKey) return 'overdue';
    if (date === todayKey) return 'today';
    const days = Math.round((new Date(date).getTime() - new Date(todayKey).getTime()) / 86400000);
    if (days === 1) return 'tomorrow';
    if (days <= 7) return `in ${days} days`;
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).replace(' ', ' ');
  };

  // Donut: top five categories plus "Other", coloured from the categorical palette by rank.
  const topFive = topCategories.slice(0, 5);
  const otherPct = Math.max(0, 100 - topFive.reduce((s: number, c: any) => s + (c.percentage || 0), 0));
  const otherTotal = Math.max(0, metrics.monthlyExpenses - topFive.reduce((s: number, c: any) => s + (c.total || 0), 0));
  const donutSlices: { id: string; name: string; percentage: number; total: number; color: string }[] = [
    ...topFive.map((c: any, i: number) => ({ id: c.id, name: c.name, percentage: c.percentage || 0, total: c.total || 0, color: `var(--cat-${i + 1})` })),
    ...(otherPct >= 1 ? [{ id: 'other', name: 'Other', percentage: otherPct, total: otherTotal, color: 'var(--cat-11)' }] : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">
            {greeting}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="page-subtitle">Here’s where your money stands · {todayLabel}</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={openImportModal}>
            <Upload size={15} /> Import statement
          </button>
          <button className="btn-primary" onClick={() => openTransactionModal('expense')}>
            <Plus size={16} /> New Transaction
          </button>
        </div>
      </div>

      {/* Deterministic Financial Insights Banner */}
      {insights.length > 0 ? (
        <div
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all var(--transition-fast)',
          }}
        >
          {!insightsExpanded ? (
            <div className="insight-banner-collapsed" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                className="insight-icon"
                style={{
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: insights[0].type === 'warning' ? 'var(--color-expense-subtle)' : 'var(--brand-light)',
                  color: insights[0].type === 'warning' ? 'var(--color-expense)' : 'var(--brand-primary)',
                  flexShrink: 0,
                }}
              >
                {insights[0].type === 'warning' ? (
                  <AlertTriangle size={20} />
                ) : insights[0].type === 'positive' ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <Sparkles size={20} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="insight-title-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{insights[0].title}</span>
                  <span
                    className="insight-badge"
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      padding: '0.1rem 0.45rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-default)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Live Insight
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  {insights[0].description}
                </div>
              </div>
              {insights.length > 1 && (
                <button
                  type="button"
                  onClick={() => setInsightsExpanded(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--brand-primary)',
                    backgroundColor: 'var(--brand-light)',
                    padding: '0.4rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--border-default)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all var(--transition-fast)',
                  }}
                  className="card-interactive insight-expand-btn"
                  aria-label="Expand all insights"
                >
                  +{insights.length - 1} more <ChevronDown size={14} />
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-default)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      padding: '0.35rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--brand-light)',
                      color: 'var(--brand-primary)',
                    }}
                  >
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      Deterministic Financial Intelligence
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          padding: '0.1rem 0.45rem',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'var(--color-income-subtle)',
                          color: 'var(--color-income)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        100% Calculated from Live Data
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Evaluated deterministically against your recorded transactions, budgets, credit card utilization, and subscriptions.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInsightsExpanded(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--bg-subtle)',
                    padding: '0.35rem 0.65rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    cursor: 'pointer',
                  }}
                  className="card-interactive"
                >
                  Collapse <ChevronUp size={14} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {insights.map((ins: any, idx: number) => {
                  const isWarn = ins.type === 'warning';
                  const isPos = ins.type === 'positive';
                  const Icon = isWarn ? AlertTriangle : isPos ? CheckCircle2 : Sparkles;
                  const iconBg = isWarn ? 'var(--color-expense-subtle)' : isPos ? 'var(--color-income-subtle)' : 'var(--brand-light)';
                  const iconColor = isWarn ? 'var(--color-expense)' : isPos ? 'var(--color-income)' : 'var(--brand-primary)';

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '0.85rem 1rem',
                        backgroundColor: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-default)',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          padding: '0.4rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: iconBg,
                          color: iconColor,
                          flexShrink: 0,
                          marginTop: '0.1rem',
                        }}
                      >
                        <Icon size={16} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.825rem', color: 'var(--text-primary)' }}>
                            {ins.title}
                          </span>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              color: iconColor,
                            }}
                          >
                            {ins.type}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                          {ins.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px dashed var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--brand-light)',
                color: 'var(--brand-primary)',
              }}
            >
              <Info size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Welcome to your financial workspace
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Deterministic spending comparisons, savings rate, and credit alerts will automatically generate as you record transactions.
              </div>
            </div>
          </div>
          <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', flexShrink: 0 }} onClick={() => openTransactionModal('expense')}>
            <Plus size={14} /> Record First Entry
          </button>
        </div>
      )}

      {/* KPI row + net worth / cash flow + spending */}
      <div className="dash-grid">
        <div className="card kpi-card">
          <span className="card-label">Income · {monthName}</span>
          <MoneyDisplay amount={metrics.monthlyIncome} currency={currency} size="xl" weight="semibold" className="kpi-value" />
          <DeltaLine delta={incomeDelta} goodWhenUp label="vs last month" />
          {hasHistory && <Sparkline values={cashFlowTrend.map((c: any) => c.income)} color="var(--color-income)" id="inc" />}
        </div>

        <div className="card kpi-card">
          <span className="card-label">Spent · {monthName}</span>
          <MoneyDisplay amount={metrics.monthlyExpenses} currency={currency} size="xl" weight="semibold" className="kpi-value" />
          <DeltaLine delta={spendDelta} goodWhenUp={false} label="vs last month" />
          {hasHistory && <Sparkline values={cashFlowTrend.map((c: any) => c.expense)} color="var(--color-expense)" id="exp" />}
        </div>

        <div className="card kpi-card">
          <span className="card-label">Saved · {monthName}</span>
          <MoneyDisplay amount={metrics.monthlySavings} currency={currency} size="xl" weight="semibold" className="kpi-value" showSign />
          <span className="kpi-delta" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: metrics.savingsRate >= 0 ? 'var(--color-income)' : 'var(--color-expense)', fontWeight: 600 }}>
              {metrics.savingsRate}%
            </span>{' '}
            savings rate
          </span>
          {hasHistory && <Sparkline values={savingsRateTrend} color="var(--brand-primary)" id="sav" />}
        </div>

        <Link href="/subscriptions" className="card card-interactive kpi-card">
          <span className="card-label">Due in the next 7 days</span>
          <span className="kpi-value tabular" style={{ color: dueSoon.length > 0 ? 'var(--color-warning)' : 'var(--text-primary)' }}>
            {formatMoney(dueSoonTotal, currency)}
          </span>
          {dueSoon.length > 0 ? (
            <span className="kpi-delta" style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Next: <b style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{dueSoon[0].name}</b> · {dueLabel(dueSoon[0].next_billing_date)}
            </span>
          ) : (
            <span className="kpi-delta" style={{ color: 'var(--text-muted)' }}>
              {nextLater ? (
                <>
                  Nothing this week · next <b style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{nextLater.name}</b> {dueLabel(nextLater.next_billing_date)}
                </>
              ) : (
                'Nothing due this week'
              )}
            </span>
          )}
          {dueSoon.length > 1 && (
            <span className="kpi-delta" style={{ color: 'var(--text-muted)' }}>
              +{dueSoon.length - 1} more {dueSoon.length - 1 === 1 ? 'payment' : 'payments'}
            </span>
          )}
        </Link>

        {/* Net worth trend / cash flow */}
        <div className="card span-3" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="card-label">Net worth</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                <MoneyDisplay amount={metrics.netWorth} currency={currency} size="3xl" weight="bold" />
                {netWorthTrend.length > 1 && (
                  <span className="kpi-delta" style={{ color: netWorthDelta >= 0 ? 'var(--color-income)' : 'var(--color-expense)', fontWeight: 600 }}>
                    {netWorthDelta >= 0 ? '+' : '−'}{formatMoney(Math.abs(netWorthDelta), currency)} this month
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                <span>Liquid <b className="tabular" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{formatMoney(metrics.cashBalance, currency, { compact: true })}</b></span>
                <span>Assets <b className="tabular" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{formatMoney(metrics.totalAssets, currency, { compact: true })}</b></span>
                <span>Liabilities <b className="tabular" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{formatMoney(metrics.totalLiabilities, currency, { compact: true })}</b></span>
                <span>Card dues <b className="tabular" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{formatMoney(metrics.creditCardOutstanding, currency, { compact: true })}</b></span>
              </div>
            </div>
            <div className="segmented" role="group" aria-label="Chart">
              <button type="button" aria-pressed={chartMode === 'networth'} onClick={() => setChartMode('networth')}>Net worth</button>
              <button type="button" aria-pressed={chartMode === 'cashflow'} onClick={() => setChartMode('cashflow')}>Cash flow</button>
            </div>
          </div>
          {chartMode === 'networth' ? (
            <TrendChart
              key="nw"
              labels={cashFlowTrend.map((c: any) => c.monthLabel)}
              series={[{ name: 'Net worth', values: netWorthTrend, color: 'var(--brand-primary)', fill: true }]}
              currency={currency}
              zeroBased={false}
              caption="Month-end net worth from your ledger’s income and spending"
            />
          ) : (
            <TrendChart
              key="cf"
              labels={cashFlowTrend.map((c: any) => c.monthLabel)}
              series={[
                { name: 'Income', values: cashFlowTrend.map((c: any) => c.income), color: 'var(--color-income)', fill: true },
                { name: 'Spent', values: cashFlowTrend.map((c: any) => c.expense), color: 'var(--color-expense)' },
              ]}
              currency={currency}
              zeroBased
            />
          )}
        </div>

        {/* Spending by category */}
        <div className="card dash-donut" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">Spending</h3>
            <Link href="/reports" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              Report <ArrowRight size={14} />
            </Link>
          </div>
          {donutSlices.length === 0 ? (
            <div style={{ padding: '2rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No spending recorded in {monthName} yet.
            </div>
          ) : (
            <>
              <SpendDonut slices={donutSlices} total={metrics.monthlyExpenses} currency={currency} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {donutSlices.map(slice => (
                  <div key={slice.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                    <span className="legend-dot" style={{ backgroundColor: slice.color }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      {slice.name}
                    </span>
                    <span className="tabular" style={{ fontWeight: 600 }}>{slice.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Grid: Recent Transactions & Active Accounts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {/* Recent Transactions */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">Recent Transactions</h3>
            <Link href="/transactions" style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No transactions yet. Click &ldquo;Record Transaction&rdquo; to start.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentTransactions.slice(0, 6).map((tx: any) => {
                const isIncome = tx.type === 'income';
                const isTransfer = tx.type === 'transfer';

                return (
                  <div
                    key={tx.id}
                    onClick={() => openTransactionModal(tx.type, tx.account_id, tx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      borderBottom: '1px solid var(--border-default)',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    className="card-interactive"
                    title="Click to edit transaction"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: isIncome
                            ? 'var(--color-income-subtle)'
                            : isTransfer
                            ? 'var(--color-transfer-subtle)'
                            : 'var(--color-expense-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isIncome
                            ? 'var(--color-income)'
                            : isTransfer
                            ? 'var(--color-transfer)'
                            : 'var(--color-expense)',
                        }}
                      >
                        {isIncome ? <TrendingUp size={16} /> : isTransfer ? <Repeat size={16} /> : <TrendingDown size={16} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                          {isTransfer
                            ? tx.destination_account_name
                              ? `Transfer to ${tx.destination_account_name}`
                              : `Transfer from ${tx.peer_account_name}`
                            : tx.merchant_name || tx.category_name || 'Transaction'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatDateDMY(tx.date)} • {tx.account_name}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <MoneyDisplay
                        amount={isTransfer ? tx.amount : (isIncome ? tx.amount : -tx.amount)}
                        size="sm"
                        weight="bold"
                        colored={!isTransfer}
                        showSign={!isTransfer}
                      />
                      {tx.category_name && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {tx.category_name}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Accounts Overview */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">Accounts & Balances</h3>
            <Link href="/accounts" style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              Manage <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {accounts.map((acc: any) => (
              <Link
                key={acc.id}
                href={`/accounts?id=${acc.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
                className="card-interactive"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: `color-mix(in srgb, ${acc.color || 'var(--brand-primary)'} 13%, transparent)`,
                      color: acc.color || 'var(--brand-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {acc.type === 'credit_card' ? <CreditCard size={16} /> : <Landmark size={16} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{acc.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {acc.institution || acc.type}
                      {acc.type === 'credit_card' && acc.credit_limit > 0 && ` • ${acc.utilizationRate}% used`}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  {(() => {
                    const bal = acc.isLiability ? (acc.totalDebt ?? acc.current_balance) : acc.current_balance;
                    return (
                      <span style={{ color: acc.type === 'credit_card' && bal > 0 ? 'var(--color-expense)' : 'inherit' }}>
                        <MoneyDisplay amount={bal} size="sm" weight="bold" />
                      </span>
                    );
                  })()}
                  {acc.type === 'credit_card' && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Limit: ₹{Math.round(acc.credit_limit / 100).toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Budgets & Goals Quick Glance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Budgets */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="card-title">Monthly Budgets</h3>
            <Link href="/budgets" style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontWeight: 500 }}>
              Details
            </Link>
          </div>
          {budgets.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No budgets set yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {budgets.map((b: any) => (
                <div key={b.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 500 }}>{b.category_name}</span>
                    <span>
                      ₹{Math.round(b.spent / 100).toLocaleString('en-IN')} / ₹{Math.round(b.amount / 100).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="progress-bar-bg">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min(100, b.percentUsed)}%`,
                        backgroundColor: b.isOverspent ? 'var(--color-expense)' : 'var(--color-income)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Goals */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="card-title">Savings Goals</h3>
            <Link href="/goals" style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontWeight: 500 }}>
              Details
            </Link>
          </div>
          {goals.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No savings goals created.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {goals.map((g: any) => (
                <div key={g.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 500 }}>{g.name}</span>
                    <span style={{ fontWeight: 600 }}>{g.percent}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${g.percent}%`,
                        backgroundColor: 'var(--brand-primary)',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    <span>Target: ₹{Math.round(g.target_amount / 100).toLocaleString('en-IN')}</span>
                    <span>Target Date: {formatDateDMY(g.target_date)}</span>
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

function DeltaLine({ delta, goodWhenUp, label }: { delta: number | null; goodWhenUp: boolean; label: string }) {
  if (delta === null) {
    return <span className="kpi-delta" style={{ color: 'var(--text-muted)' }}>No prior month to compare</span>;
  }
  const up = delta >= 0;
  const good = up === goodWhenUp;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="kpi-delta" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600, color: good ? 'var(--color-income)' : 'var(--color-expense)' }}>
        <Icon size={13} /> {up ? '+' : ''}{delta}%
      </span>
      {label}
    </span>
  );
}

function Sparkline({ values, color, id }: { values: number[]; color: string; id: string }) {
  if (values.length < 2) return <div className="kpi-spark" />;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 240, 32 - ((v - min) / range) * 28]);
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg className="kpi-spark" viewBox="0 0 240 36" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L240 36 L0 36 Z`} fill={`url(#spark-${id})`} className="chart-fade" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="chart-draw" />
      <circle cx={lx} cy={ly} r="3" fill={color} className="chart-fade" />
    </svg>
  );
}

// Monotone cubic (Fritsch–Carlson) so a curve never overshoots between data points.
function monotonePath(pts: [number, number][]) {
  const n = pts.length;
  if (n < 2) return '';
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    slope.push((pts[i + 1][1] - pts[i][1]) / dx[i]);
  }
  const m: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) m.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  m.push(slope[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * slope[i];
      m[i + 1] = t * b * slope[i];
    }
  }
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    d += ` C${x0 + dx[i] / 3} ${y0 + (m[i] * dx[i]) / 3} ${x1 - dx[i] / 3} ${y1 - (m[i + 1] * dx[i]) / 3} ${x1} ${y1}`;
  }
  return d;
}

// Short axis labels in rupees: 2.6 Cr, 1.5 L, 79k, 500.
function axisLabel(minor: number) {
  const rupees = Math.round(minor / 100);
  const abs = Math.abs(rupees);
  const sign = rupees < 0 ? '−' : '';
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(1).replace(/\.0$/, '')} Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1).replace(/\.0$/, '')} L`;
  if (abs >= 1000) return `${sign}₹${Math.round(abs / 1000)}k`;
  return `${sign}₹${abs}`;
}

type TrendSeries = { name: string; values: number[]; color: string; fill?: boolean };

function TrendChart({
  labels,
  series,
  currency,
  zeroBased,
  caption,
}: {
  labels: string[];
  series: TrendSeries[];
  currency: string;
  zeroBased: boolean;
  caption?: string;
}) {
  // Measure the container so axis text stays at its real pixel size at every width.
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => setW(Math.max(280, Math.round(entries[0].contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = W < 480 ? 190 : 230;
  const left = 62;
  const right = 12;
  const top = 14;
  const bottom = 30;
  const plotW = W - left - right;
  const plotH = H - top - bottom;

  if (labels.length < 2) {
    return (
      <div style={{ height: '200px', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Trends appear after your first month of transactions.
      </div>
    );
  }

  // Snap the domain to round steps (1, 2, 2.5 or 5 × 10^n) so the axis reads as a scale.
  const all = series.flatMap(s => s.values);
  const dataLo = zeroBased ? 0 : Math.min(...all);
  const dataHi = Math.max(...all, zeroBased ? 100000 : dataLo + 100000);
  const rawStep = Math.max((dataHi - dataLo) / 2, 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = [1, 2, 2.5, 5, 10].map(f => f * mag).find(v => v >= rawStep) ?? 10 * mag;
  const lo = Math.floor(dataLo / step) * step;
  const hi = Math.max(lo + step * 2, Math.ceil(dataHi / step) * step);
  const range = hi - lo || 1;
  const x = (i: number) => left + (i / (labels.length - 1)) * plotW;
  const y = (v: number) => top + plotH - ((v - lo) / range) * plotH;
  const ticks = Array.from({ length: Math.round(range / step) + 1 }, (_, i) => lo + i * step);
  const last = labels.length - 1;

  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={`${series.map(s => s.name).join(' and ')} over the last ${labels.length} months`}>
        <defs>
          {series.map((s, si) => (
            <linearGradient key={si} id={`trend-fill-${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={s.color} stopOpacity="0.3" />
              <stop offset="1" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {ticks.map((t, ti) => (
          <g key={ti}>
            <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} stroke="var(--border-default)" strokeDasharray={ti === 0 ? undefined : '3 5'} />
            <text x={left - 10} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {axisLabel(t)}
            </text>
          </g>
        ))}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => [x(i), y(v)] as [number, number]);
          const line = monotonePath(pts);
          return (
            <g key={s.name}>
              {s.fill && <path d={`${line} L${x(last)} ${top + plotH} L${x(0)} ${top + plotH} Z`} fill={`url(#trend-fill-${si})`} className="chart-fade" />}
              <path d={line} fill="none" stroke={s.color} strokeWidth={si === 0 ? 2.5 : 2} strokeLinecap="round" pathLength={1} className="chart-draw" />
              <circle cx={x(last)} cy={y(s.values[last])} r="4.5" fill={s.color} stroke="var(--bg-surface)" strokeWidth="2.5" className="chart-fade" />
            </g>
          );
        })}
        {labels.map((label, i) => (
          <g key={label + i}>
            <rect x={x(i) - plotW / last / 2} y={top} width={plotW / last} height={plotH} fill="transparent">
              <title>{`${label} · ${series.map(s => `${s.name} ${formatMoney(s.values[i], currency)}`).join(' · ')}`}</title>
            </rect>
            <text
              x={x(i)}
              y={H - 8}
              textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'}
              fontSize="11"
              fill={i === last ? 'var(--text-primary)' : 'var(--text-muted)'}
              fontWeight={i === last ? 600 : 400}
            >
              {String(label).split(' ')[0]}
            </text>
          </g>
        ))}
      </svg>
      {(caption || series.length > 1) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
          <span>{caption}</span>
          {series.length > 1 && (
            <span style={{ display: 'flex', gap: '0.9rem' }}>
              {series.map(s => (
                <span key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                  <span className="legend-dot" style={{ backgroundColor: s.color }} /> {s.name}
                </span>
              ))}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function SpendDonut({ slices, total, currency }: { slices: { id: string; name: string; percentage: number; total: number; color: string }[]; total: number; currency: string }) {
  const offsets = slices.map((_, i) => slices.slice(0, i).reduce((s, sl) => s + sl.percentage, 0));
  return (
    <div style={{ position: 'relative', width: '168px', height: '168px', margin: '0.25rem auto' }}>
      <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} role="img" aria-label="Spending by category">
        <circle cx="60" cy="60" r="48" fill="none" stroke="var(--bg-active)" strokeWidth="14" />
        {slices.map((slice, i) => {
          const pct = Math.max(0, slice.percentage - 0.8);
          return (
            <circle
              key={slice.id}
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke={slice.color}
              strokeWidth="14"
              pathLength={100}
              strokeDasharray={`${pct} ${100 - pct}`}
              strokeDashoffset={-offsets[i]}
              className="chart-fade"
            >
              <title>{`${slice.name}: ${formatMoney(slice.total, currency)} (${slice.percentage}%)`}</title>
            </circle>
          );
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Spent</div>
          <div className="tabular" style={{ fontSize: '1rem', fontWeight: 650, letterSpacing: '-0.02em' }}>
            {formatMoney(total, currency, { compact: true })}
          </div>
        </div>
      </div>
    </div>
  );
}

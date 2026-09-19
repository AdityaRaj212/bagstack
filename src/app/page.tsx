'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { formatDateDMY } from '@/lib/date';
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
} from 'lucide-react';
import { LandingPage } from '@/components/LandingPage';

export default function DashboardPage() {
  const { openTransactionModal, refreshKey, showToast, isAuthenticated, openAuthModal, enterDemoMode } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [insightsExpanded, setInsightsExpanded] = useState(false);

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

  const maxCashFlow = Math.max(
    ...cashFlowTrend.map((c: any) => Math.max(c.income, c.expense)),
    100000
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Financial Command Center
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Real-time overview of your liquid wealth, obligations, and cash flow.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
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
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{insights[0].title}</span>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      padding: '0.1rem 0.4rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    REAL-TIME LEDGER INSIGHT
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
                  className="card-interactive"
                  aria-label="Expand all insights"
                >
                  +{insights.length - 1} more insights <ChevronDown size={14} />
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
                          padding: '0.1rem 0.4rem',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          color: 'var(--color-income)',
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

      {/* Primary KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Net Worth */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Net Worth
            </span>
            <Layers size={16} color="var(--color-asset)" />
          </div>
          <MoneyDisplay amount={metrics.netWorth} size="2xl" weight="bold" />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem' }}>
            <span>Assets: ₹{Math.round(metrics.totalAssets / 100).toLocaleString('en-IN')}</span>
            <span>•</span>
            <span>Liab: ₹{Math.round(metrics.totalLiabilities / 100).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Liquid Cash & Bank */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Liquid Balance
            </span>
            <Landmark size={16} color="var(--brand-primary)" />
          </div>
          <MoneyDisplay amount={metrics.cashBalance} size="2xl" weight="bold" />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Available across bank & cash accounts
          </div>
        </div>

        {/* Monthly Income vs Expense */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Monthly Cash Flow
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: metrics.monthlySavings >= 0 ? 'var(--color-income)' : 'var(--color-expense)',
              }}
            >
              {metrics.savingsRate}% Saved
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <MoneyDisplay
              amount={metrics.monthlySavings}
              size="2xl"
              weight="bold"
              colored
              showSign
            />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem' }}>
            <span style={{ color: 'var(--color-income)' }}>+₹{Math.round(metrics.monthlyIncome / 100).toLocaleString('en-IN')} in</span>
            <span>•</span>
            <span style={{ color: 'var(--color-expense)' }}>-₹{Math.round(metrics.monthlyExpenses / 100).toLocaleString('en-IN')} out</span>
          </div>
        </div>

        {/* Credit Card Outstanding */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Card Outstanding
            </span>
            <CreditCard size={16} color="var(--color-expense)" />
          </div>
          <MoneyDisplay amount={metrics.creditCardOutstanding} size="2xl" weight="bold" />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Total credit card debt owed
          </div>
        </div>
      </div>

      {/* Main 2-Column Analytics Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {/* Cash Flow Trend Chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>6-Month Cash Flow Trend</h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Income vs Expenses & Net Monthly Delta
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-income)', fontWeight: 500 }}>
                <span style={{ width: '10px', height: '10px', background: 'linear-gradient(180deg, #10B981, #059669)', borderRadius: '3px' }} /> Income
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-expense)', fontWeight: 500 }}>
                <span style={{ width: '10px', height: '10px', background: 'linear-gradient(180deg, #F43F5E, #E11D48)', borderRadius: '3px' }} /> Expense
              </span>
            </div>
          </div>

          {/* Visualization Container with Subtle Grid */}
          <div style={{ position: 'relative', height: '200px', display: 'flex', alignItems: 'flex-end', gap: '0.75rem', padding: '1.5rem 0.5rem 0 0.5rem' }}>
            {/* Horizontal Grid lines */}
            <div style={{ position: 'absolute', top: '1.5rem', left: 0, right: 0, bottom: '24px', pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ borderTop: '1px dashed var(--border-subtle)', width: '100%' }} />
              <div style={{ borderTop: '1px dashed var(--border-subtle)', width: '100%' }} />
              <div style={{ borderTop: '1px solid var(--border-default)', width: '100%' }} />
            </div>

            {cashFlowTrend.map((item: any, idx: number) => {
              const incomeHeight = maxCashFlow > 0 ? (item.income / maxCashFlow) * 140 : 0;
              const expenseHeight = maxCashFlow > 0 ? (item.expense / maxCashFlow) * 140 : 0;
              const net = item.income - item.expense;
              const isPositive = net >= 0;

              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.35rem',
                    height: '100%',
                    justifyContent: 'flex-end',
                    zIndex: 1,
                    position: 'relative',
                  }}
                  className="card-interactive"
                >
                  {/* Net badge over bars */}
                  {(item.income > 0 || item.expense > 0) && (
                    <span
                      style={{
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        padding: '1px 4px',
                        borderRadius: '4px',
                        backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                        color: isPositive ? 'var(--color-income)' : 'var(--color-expense)',
                        whiteSpace: 'nowrap',
                        marginBottom: '2px',
                      }}
                      title={`Net Cash Flow: ${isPositive ? '+' : ''}₹${Math.round(net / 100).toLocaleString('en-IN')}`}
                    >
                      {isPositive ? '+' : ''}₹{Math.round(Math.abs(net) / 100000) > 0 ? `${(net / 100000).toFixed(1)}L` : `${Math.round(net / 1000)}k`}
                    </span>
                  )}

                  {/* Dual Bars */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height: '140px' }}>
                    {/* Income Bar */}
                    <div
                      style={{
                        width: '16px',
                        height: `${Math.max(4, incomeHeight)}px`,
                        background: 'linear-gradient(180deg, #10B981, #059669)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)',
                        cursor: 'pointer',
                      }}
                      title={`${item.monthLabel} Income: ₹${Math.round(item.income / 100).toLocaleString('en-IN')}`}
                    />
                    {/* Expense Bar */}
                    <div
                      style={{
                        width: '16px',
                        height: `${Math.max(4, expenseHeight)}px`,
                        background: 'linear-gradient(180deg, #F43F5E, #E11D48)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 2px 8px rgba(244, 63, 94, 0.2)',
                        cursor: 'pointer',
                      }}
                      title={`${item.monthLabel} Expense: ₹${Math.round(item.expense / 100).toLocaleString('en-IN')}`}
                    />
                  </div>

                  <span style={{ fontSize: '0.725rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {item.monthLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Spending Categories */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Top Spending Categories</h3>
            <Link href="/reports" style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              Full Report <ArrowRight size={14} />
            </Link>
          </div>

          {topCategories.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No expense transactions recorded this month.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {topCategories.slice(0, 5).map((cat: any) => (
                <div key={cat.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 500 }}>{cat.name}</span>
                    <span style={{ fontWeight: 600 }}>
                      ₹{Math.round(cat.total / 100).toLocaleString('en-IN')} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="progress-bar-bg">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color || 'var(--brand-primary)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Recent Transactions & Active Accounts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {/* Recent Transactions */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Recent Transactions</h3>
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
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Accounts & Balances</h3>
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
                      backgroundColor: `${acc.color || 'var(--brand-primary)'}22`,
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
                      <MoneyDisplay
                        amount={bal}
                        size="sm"
                        weight="bold"
                        colored={acc.type === 'credit_card' && bal > 0}
                      />
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
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Monthly Budgets</h3>
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
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Savings Goals</h3>
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

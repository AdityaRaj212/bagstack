'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { formatDateDMY, formatDateWithWeekday } from '@/lib/date';
import {
  Plus,
  Search,
  Trash2,
  Upload,
  Download,
  Layers,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Edit2,
} from 'lucide-react';

export default function TransactionsPage() {
  const { openTransactionModal, openImportModal, showToast, refreshKey, triggerRefresh } = useApp();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Month navigation: format 'YYYY-MM'
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedType, setSelectedType] = useState('');

  const fetchTransactions = React.useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedMonth) params.set('month', selectedMonth);
    if (search) params.set('search', search);
    if (selectedAccountId) params.set('accountId', selectedAccountId);
    if (selectedCategoryId) params.set('categoryId', selectedCategoryId);
    if (selectedType) params.set('type', selectedType);

    fetch(`/api/transactions?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        setTransactions(d.transactions || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedMonth, search, selectedAccountId, selectedCategoryId, selectedType]);

  useEffect(() => {
    fetch('/api/accounts')
      .then(r => r.json())
      .then(d => setAccounts(d.accounts || []));

    fetch('/api/categories')
      .then(r => r.json())
      .then(d => setCategories(d.categories || []));
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, refreshKey]);

  // Month Navigation Helpers
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prev = new Date(year, month - 2, 1);
    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const next = new Date(year, month, 1);
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  const formatMonthDisplay = (mStr: string) => {
    if (!mStr) return 'All Months';
    const [y, m] = mStr.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleDelete = async (id: string, merchantName?: string) => {
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Trigger Undo toast
      showToast(
        `Deleted transaction${merchantName ? ` "${merchantName}"` : ''}`,
        'info',
        async () => {
          await fetch(`/api/transactions?id=${data.undoId}&restore=true`, { method: 'DELETE' });
          showToast('Transaction restored successfully!');
          triggerRefresh();
        }
      );

      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete', 'error');
    }
  };

  // Group transactions by date
  const groupedByDate = useMemo(() => {
    const groups: { [dateStr: string]: { date: string; items: any[]; dayExpense: number; dayIncome: number } } = {};
    const todayStr = new Date().toISOString().substring(0, 10);
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().substring(0, 10);

    transactions.forEach(tx => {
      const dateKey = tx.date;
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          items: [],
          dayExpense: 0,
          dayIncome: 0,
        };
      }
      groups[dateKey].items.push(tx);
      if (tx.type === 'expense') {
        groups[dateKey].dayExpense += tx.amount;
      } else if (tx.type === 'income') {
        groups[dateKey].dayIncome += tx.amount;
      }
    });

    // Sort dates descending
    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return sortedKeys.map(k => {
      const g = groups[k];
      let displayDate = formatDateDMY(g.date);
      try {
        if (g.date === todayStr) {
          displayDate = `Today, ${formatDateDMY(g.date)}`;
        } else if (g.date === yesterdayStr) {
          displayDate = `Yesterday, ${formatDateDMY(g.date)}`;
        } else {
          displayDate = formatDateWithWeekday(g.date);
        }
      } catch {
        // Fallback
      }

      return {
        ...g,
        displayDate,
      };
    });
  }, [transactions]);

  // Month totals
  const monthStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      if (t.type === 'expense') expense += t.amount;
    });
    return { income, expense, net: income - expense };
  }, [transactions]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Transactions</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Complete audit ledger categorized by date with instant undo and filters.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={openImportModal}>
            <Upload size={16} /> Import CSV
          </button>
          <a href="/api/export?format=csv" className="btn-secondary" download>
            <Download size={16} /> Export CSV
          </a>
          <button className="btn-primary" onClick={() => openTransactionModal('expense')}>
            <Plus size={16} /> Add Transaction
          </button>
        </div>
      </div>

      {/* Month Navigator Banner */}
      <div
        className="card"
        style={{
          padding: '0.875rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn-icon"
            onClick={handlePrevMonth}
            title="Previous Month"
            style={{ width: '32px', height: '32px' }}
          >
            <ChevronLeft size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '180px', justifyContent: 'center' }}>
            <Calendar size={16} style={{ color: 'var(--brand-primary)' }} />
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
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
              style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', color: 'var(--brand-primary)' }}
            >
              Current Month
            </button>
          )}

          {selectedMonth && (
            <button
              className="btn-ghost"
              onClick={() => setSelectedMonth('')}
              style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', color: 'var(--text-muted)' }}
            >
              View All Time
            </button>
          )}
        </div>

        {/* Month Summary KPI Badges */}
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', fontSize: '0.8125rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)', marginRight: '4px' }}>In:</span>
            <span style={{ fontWeight: 600, color: 'var(--color-income)' }}>
              ₹{(monthStats.income / 100).toLocaleString('en-IN')}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', marginRight: '4px' }}>Out:</span>
            <span style={{ fontWeight: 600, color: 'var(--color-expense)' }}>
              ₹{(monthStats.expense / 100).toLocaleString('en-IN')}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', marginRight: '4px' }}>Net:</span>
            <span style={{ fontWeight: 700, color: monthStats.net >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
              {monthStats.net >= 0 ? '+' : ''}₹{(monthStats.net / 100).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="card"
        style={{
          padding: '1rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          alignItems: 'center',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search merchant, notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
          <button type="submit" className="btn-secondary">Search</button>
        </form>

        <select
          className="form-select"
          value={selectedType}
          onChange={e => setSelectedType(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="expense">Expenses Only</option>
          <option value="income">Income Only</option>
          <option value="transfer">Transfers Only</option>
        </select>

        <select
          className="form-select"
          value={selectedAccountId}
          onChange={e => setSelectedAccountId(e.target.value)}
        >
          <option value="">All Accounts</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>
              {a.name} {a.is_default ? '★' : ''}
            </option>
          ))}
        </select>

        <select
          className="form-select"
          value={selectedCategoryId}
          onChange={e => setSelectedCategoryId(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date-Grouped Transactions Ledger */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading ledger transactions...
          </div>
        ) : groupedByDate.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No transactions found for {selectedMonth ? formatMonthDisplay(selectedMonth) : 'this selection'}.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table
              style={{
                width: '100%',
                minWidth: '680px',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.875rem',
                tableLayout: 'fixed',
              }}
            >
              <colgroup>
                <col style={{ width: '38%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '10%', minWidth: '70px' }} />
              </colgroup>
              <tbody>
                {groupedByDate.map(group => (
                  <React.Fragment key={group.date}>
                    {/* Date Header Row */}
                    <tr
                      style={{
                        backgroundColor: 'var(--bg-subtle, rgba(255, 255, 255, 0.02))',
                        borderTop: '1px solid var(--border-default)',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      <td colSpan={5} style={{ padding: '0.55rem 1rem' }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            letterSpacing: '0.02em',
                          }}
                        >
                          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                            {group.displayDate}
                          </span>
                          <span style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                            {group.dayExpense > 0 && (
                              <span>
                                Spent: <strong style={{ color: 'var(--text-primary)' }}>₹{(group.dayExpense / 100).toLocaleString('en-IN')}</strong>
                              </span>
                            )}
                            {group.dayIncome > 0 && (
                              <span style={{ color: 'var(--color-income)' }}>
                                Income: <strong>+₹{(group.dayIncome / 100).toLocaleString('en-IN')}</strong>
                              </span>
                            )}
                            <span>
                              ({group.items.length} {group.items.length === 1 ? 'txn' : 'txns'})
                            </span>
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Transactions under this Date */}
                    {group.items.map(tx => {
                      const isIncome = tx.type === 'income';
                      const isTransfer = tx.type === 'transfer';

                      return (
                        <tr
                          key={tx.id}
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          className="card-interactive"
                        >
                          {/* Col 1: Title & Notes & Splits & Tags */}
                          <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                            <div
                              style={{
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                cursor: 'pointer',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              onClick={() => openTransactionModal(tx.type, tx.account_id, tx)}
                              title="Click to edit transaction"
                            >
                              {isTransfer ? (
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {tx.destination_account_name
                                    ? `Transfer to ${tx.destination_account_name}`
                                    : `Transfer from ${tx.peer_account_name}`}
                                </span>
                              ) : (
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {tx.merchant_name || 'Direct Entry'}
                                </span>
                              )}
                            </div>
                            {tx.notes && (
                              <div
                                style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--text-muted)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={tx.notes}
                              >
                                {tx.notes}
                              </div>
                            )}
                            {tx.splits?.length > 0 && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--brand-primary)', display: 'flex', gap: '0.25rem', marginTop: '0.2rem' }}>
                                <Layers size={12} /> {tx.splits.length} splits
                              </div>
                            )}
                            {((tx.tag_objects && tx.tag_objects.length > 0) || (tx.tags && tx.tags.length > 0)) && (
                              <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                                {(tx.tag_objects && tx.tag_objects.length > 0
                                  ? tx.tag_objects
                                  : (tx.tags || []).map((t: string) => ({ id: t, name: t, color: '#3B82F6' }))
                                ).map((tagObj: any) => {
                                  const tagColor = tagObj.color || '#3B82F6';
                                  return (
                                    <span
                                      key={tagObj.id || tagObj.name}
                                      style={{
                                        fontSize: '0.6875rem',
                                        fontWeight: 500,
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        backgroundColor: `${tagColor}18`,
                                        color: tagColor,
                                        border: `1px solid ${tagColor}35`,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: '5px',
                                          height: '5px',
                                          borderRadius: '50%',
                                          backgroundColor: tagColor,
                                        }}
                                      />
                                      #{tagObj.name}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>

                          {/* Col 2: Category Badge */}
                          <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                            {isTransfer ? (
                              <span className="badge badge-transfer">Transfer</span>
                            ) : tx.category_name ? (
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: `${tx.category_color || '#4f46e5'}20`,
                                  color: tx.category_color || 'var(--brand-primary)',
                                  maxWidth: '100%',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-block',
                                }}
                              >
                                {tx.category_name}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Uncategorized</span>
                            )}
                          </td>

                          {/* Col 3: Account Name */}
                          <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                            <span
                              style={{
                                color: 'var(--text-secondary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block',
                              }}
                              title={tx.account_name}
                            >
                              {tx.account_name}
                            </span>
                          </td>

                          {/* Col 4: Amount */}
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            <MoneyDisplay
                              amount={isTransfer ? tx.amount : (isIncome ? tx.amount : -tx.amount)}
                              weight="bold"
                              colored={!isTransfer}
                              showSign={!isTransfer}
                            />
                          </td>

                          {/* Col 5: Actions */}
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', width: '100%' }}>
                              <button
                                className="btn-icon"
                                onClick={() => openTransactionModal(tx.type, tx.account_id, tx)}
                                title="Edit transaction"
                                style={{ color: 'var(--text-muted)', width: '28px', height: '28px' }}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                className="btn-icon"
                                onClick={() => handleDelete(tx.id, tx.merchant_name)}
                                title="Delete transaction (with undo)"
                                style={{ color: 'var(--text-muted)', width: '28px', height: '28px' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

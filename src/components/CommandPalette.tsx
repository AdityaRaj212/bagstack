'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Search,
  PlusCircle,
  ArrowRightLeft,
  Wallet,
  PieChart,
  Target,
  BarChart3,
  Repeat,
  TrendingUp,
  Download,
  Upload,
  Sun,
  Moon,
  ArrowRight,
  User,
  UserPlus,
} from 'lucide-react';
import { formatDateDMY } from '@/lib/date';

export const CommandPalette = () => {
  const router = useRouter();
  const {
    isCommandPaletteOpen,
    closeCommandPalette,
    openTransactionModal,
    openImportModal,
    openAccountModal,
    theme,
    setTheme,
    showToast,
    triggerRefresh,
  } = useApp();

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        try {
          inputRef.current?.focus();
        } catch {
          // Ignore focus errors
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isCommandPaletteOpen]);

  // Fetch search results when query changes
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSearchResults(data.results);
      } catch (err) {
        console.error('Search error', err);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isCommandPaletteOpen) return null;

  const defaultActions = [
    {
      id: 'add-expense',
      label: 'Add Expense',
      shortcut: 'E',
      icon: PlusCircle,
      action: () => {
        closeCommandPalette();
        openTransactionModal('expense');
      },
    },
    {
      id: 'add-income',
      label: 'Add Income',
      shortcut: 'I',
      icon: PlusCircle,
      action: () => {
        closeCommandPalette();
        openTransactionModal('income');
      },
    },
    {
      id: 'transfer',
      label: 'Transfer Money',
      shortcut: 'T',
      icon: ArrowRightLeft,
      action: () => {
        closeCommandPalette();
        openTransactionModal('transfer');
      },
    },
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      shortcut: 'G D',
      icon: PieChart,
      action: () => {
        closeCommandPalette();
        router.push('/');
      },
    },
    {
      id: 'nav-transactions',
      label: 'Go to Transactions',
      shortcut: 'G T',
      icon: Wallet,
      action: () => {
        closeCommandPalette();
        router.push('/transactions');
      },
    },
    {
      id: 'nav-accounts',
      label: 'Go to Accounts',
      shortcut: 'G A',
      icon: Wallet,
      action: () => {
        closeCommandPalette();
        router.push('/accounts');
      },
    },
    {
      id: 'nav-budgets',
      label: 'Go to Budgets',
      shortcut: 'G B',
      icon: PieChart,
      action: () => {
        closeCommandPalette();
        router.push('/budgets');
      },
    },
    {
      id: 'nav-goals',
      label: 'Go to Goals',
      shortcut: 'G G',
      icon: Target,
      action: () => {
        closeCommandPalette();
        router.push('/goals');
      },
    },
    {
      id: 'nav-reports',
      label: 'Go to Reports & Analytics',
      shortcut: 'G R',
      icon: BarChart3,
      action: () => {
        closeCommandPalette();
        router.push('/reports');
      },
    },
    {
      id: 'nav-subscriptions',
      label: 'Go to Subscriptions',
      shortcut: 'G S',
      icon: Repeat,
      action: () => {
        closeCommandPalette();
        router.push('/subscriptions');
      },
    },
    {
      id: 'nav-investments',
      label: 'Go to Investments & Portfolio',
      shortcut: 'G P',
      icon: TrendingUp,
      action: () => {
        closeCommandPalette();
        router.push('/investments');
      },
    },
    {
      id: 'import-csv',
      label: 'Import Bank CSV / Statement',
      icon: Upload,
      action: () => {
        closeCommandPalette();
        openImportModal();
      },
    },
    {
      id: 'export-json',
      label: 'Export Complete JSON Backup',
      icon: Download,
      action: () => {
        closeCommandPalette();
        window.open('/api/export?format=json', '_blank');
      },
    },
    {
      id: 'toggle-theme',
      label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      icon: theme === 'dark' ? Sun : Moon,
      action: () => {
        closeCommandPalette();
        setTheme(theme === 'dark' ? 'light' : 'dark');
      },
    },
    {
      id: 'switch-user',
      label: 'Switch User Profile / Account',
      icon: User,
      action: () => {
        closeCommandPalette();
        openAccountModal();
      },
    },
    {
      id: 'create-account',
      label: 'Create New User Account',
      icon: UserPlus,
      action: () => {
        closeCommandPalette();
        openAccountModal();
      },
    },
  ];

  const filteredActions = defaultActions.filter(a =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  // Unified list of actionable items for keyboard arrow navigation
  const allNavItems = React.useMemo(() => {
    const items: Array<{ id: string; action: () => void }> = [];
    if (searchResults && Array.isArray(searchResults.accounts)) {
      for (const acc of searchResults.accounts) {
        if (!acc?.id) continue;
        items.push({
          id: `acc-${acc.id}`,
          action: () => {
            closeCommandPalette();
            router.push(`/accounts?id=${acc.id}`);
          },
        });
      }
    }
    if (searchResults && Array.isArray(searchResults.transactions)) {
      for (const tx of searchResults.transactions) {
        if (!tx?.id) continue;
        items.push({
          id: `tx-${tx.id}`,
          action: () => {
            closeCommandPalette();
            router.push(`/transactions?search=${encodeURIComponent(tx.merchant_name || '')}`);
          },
        });
      }
    }
    for (const act of filteredActions) {
      if (!act?.id) continue;
      items.push({
        id: act.id,
        action: act.action,
      });
    }
    return items;
  }, [searchResults, filteredActions, closeCommandPalette, router]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, searchResults]);

  let runningIdx = -1;

  return (
    <div className="modal-overlay" onClick={closeCommandPalette}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '600px',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-default)',
            background: 'var(--bg-surface)',
          }}
        >
          <Search size={20} color="var(--text-muted)" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'k' || e.code === 'KeyK')) {
                e.preventDefault();
                closeCommandPalette();
                return;
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, allNavItems.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (allNavItems.length > 0 && selectedIndex >= 0 && selectedIndex < allNavItems.length) {
                  allNavItems[selectedIndex].action();
                }
              } else if (e.key === 'Escape') {
                closeCommandPalette();
              }
            }}
            placeholder="Type a command, account, merchant, or transaction..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '1rem',
              color: 'var(--text-primary)',
            }}
          />
          <kbd
            style={{
              padding: '0.2rem 0.4rem',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-default)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '0.5rem' }}>
          {/* If there are live search results */}
          {searchResults && (
            <div style={{ marginBottom: '0.75rem' }}>
              {searchResults.accounts?.length > 0 && (
                <div>
                  <div
                    style={{
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Accounts
                  </div>
                  {searchResults.accounts.map((acc: any) => {
                    runningIdx += 1;
                    const itemIdx = runningIdx;
                    const isSelected = selectedIndex === itemIdx;
                    return (
                      <div
                        key={acc.id}
                        onClick={() => {
                          closeCommandPalette();
                          router.push(`/accounts?id=${acc.id}`);
                        }}
                        onMouseEnter={() => setSelectedIndex(itemIdx)}
                        style={{
                          padding: '0.6rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'var(--bg-hover)' : 'transparent',
                          outline: isSelected ? '1px solid var(--brand-primary)' : 'none',
                        }}
                        className="card-interactive"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Wallet size={16} color="var(--brand-primary)" />
                          <span style={{ fontWeight: 500 }}>{acc.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({acc.type})</span>
                        </div>
                        <ArrowRight size={14} color="var(--text-muted)" />
                      </div>
                    );
                  })}
                </div>
              )}

              {searchResults.transactions?.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div
                    style={{
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Transactions
                  </div>
                  {searchResults.transactions.map((tx: any) => {
                    runningIdx += 1;
                    const itemIdx = runningIdx;
                    const isSelected = selectedIndex === itemIdx;
                    return (
                      <div
                        key={tx.id}
                        onClick={() => {
                          closeCommandPalette();
                          router.push(`/transactions?search=${encodeURIComponent(tx.merchant_name || '')}`);
                        }}
                        onMouseEnter={() => setSelectedIndex(itemIdx)}
                        style={{
                          padding: '0.6rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'var(--bg-hover)' : 'transparent',
                          outline: isSelected ? '1px solid var(--brand-primary)' : 'none',
                        }}
                        className="card-interactive"
                      >
                        <div>
                          <div style={{ fontWeight: 500 }}>{tx.merchant_name || 'Transaction'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {formatDateDMY(tx.date)} • {tx.account_name}
                          </div>
                        </div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: tx.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)',
                          }}
                        >
                          ₹{typeof tx.amount === 'number' ? tx.amount.toLocaleString('en-IN') : Number(tx.amount || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Action List */}
          <div>
            <div
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              Actions & Navigation
            </div>
            {filteredActions.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No commands found
              </div>
            ) : (
              filteredActions.map((item) => {
                runningIdx += 1;
                const itemIdx = runningIdx;
                const isSelected = selectedIndex === itemIdx;
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(itemIdx)}
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'var(--bg-hover)' : 'transparent',
                      outline: isSelected ? '1px solid var(--brand-primary)' : 'none',
                    }}
                    className="card-interactive"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Icon size={16} color="var(--brand-primary)" />
                      <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{item.label}</span>
                    </div>
                    {item.shortcut && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          backgroundColor: 'var(--bg-subtle)',
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                        }}
                      >
                        {item.shortcut}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0.6rem 1rem',
            borderTop: '1px solid var(--border-default)',
            background: 'var(--bg-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
        >
          <div>Navigate with mouse or keyboard</div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span>[N] New Transaction</span>
            <span>[/] Search</span>
          </div>
        </div>
      </div>
    </div>
  );
};

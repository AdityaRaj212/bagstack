'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Tag,
  ChevronDown,
  Check,
  X,
  Loader2,
} from 'lucide-react';

export default function TransactionsPage() {
  const { openTransactionModal, openImportModal, showToast, refreshKey, triggerRefresh } = useApp();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryTree, setCategoryTree] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Month navigation: format 'YYYY-MM'
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Dropdown states & refs
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [searchTagSuggestionsOpen, setSearchTagSuggestionsOpen] = useState(false);
  const [deletingTxIds, setDeletingTxIds] = useState<Set<string>>(new Set());

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const categoryContainerRef = useRef<HTMLDivElement>(null);

  // Debounce search input (250ms) for continuous querying
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchTagSuggestionsOpen(false);
      }
      if (categoryContainerRef.current && !categoryContainerRef.current.contains(event.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTransactions = React.useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedMonth) params.set('month', selectedMonth);
    if (debouncedSearch) params.set('search', debouncedSearch);
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
  }, [selectedMonth, debouncedSearch, selectedAccountId, selectedCategoryId, selectedType]);

  useEffect(() => {
    fetch('/api/accounts')
      .then(r => r.json())
      .then(d => setAccounts(d.accounts || []));

    fetch('/api/categories?tree=true')
      .then(r => r.json())
      .then(d => {
        if (d.categories) setCategories(d.categories);
        if (d.tree) setCategoryTree(d.tree);
      });

    fetch('/api/tags')
      .then(r => r.json())
      .then(d => setTags(d.tags || []));
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
    // 1. Immediately indicate deleting on the specific row (blinking dim animation)
    setDeletingTxIds(prev => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // 2. Optimistically remove from visible transactions
      setTransactions(prev => prev.filter(t => t.id !== id));
      setDeletingTxIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

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
      setDeletingTxIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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

  // Helper to resolve selected category object
  const selectedCategoryObj = useMemo(() => {
    if (!selectedCategoryId) return null;
    for (const parent of categoryTree) {
      if (parent.id === selectedCategoryId) {
        return { ...parent, fullName: parent.name, isParent: true };
      }
      if (parent.subcategories) {
        for (const sub of parent.subcategories) {
          if (sub.id === selectedCategoryId) {
            return { ...sub, parentName: parent.name, fullName: `${parent.name} › ${sub.name}`, isParent: false };
          }
        }
      }
    }
    const flat = categories.find(c => c.id === selectedCategoryId);
    if (flat) return { ...flat, fullName: flat.name, isParent: !flat.parent_id };
    return null;
  }, [selectedCategoryId, categoryTree, categories]);

  // Filter category tree for searchable combobox
  const filteredCategoryTree = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    const typeMatching = categoryTree.filter(cat => {
      if (!selectedType) return true;
      return !cat.type || cat.type === selectedType;
    });

    if (!query) return typeMatching;

    const result: any[] = [];
    for (const parent of typeMatching) {
      const parentMatches = parent.name.toLowerCase().includes(query);
      const matchingSubs = (parent.subcategories || []).filter((sub: any) =>
        sub.name.toLowerCase().includes(query) || parentMatches
      );
      if (parentMatches || matchingSubs.length > 0) {
        result.push({
          ...parent,
          subcategories: matchingSubs,
        });
      }
    }
    return result;
  }, [categoryTree, categorySearch, selectedType]);

  // Set of tag names already present in search query
  const existingSearchTags = useMemo(() => {
    const matches = search.match(/#([a-zA-Z0-9_\-]+)/g);
    if (!matches) return new Set<string>();
    return new Set(matches.map(m => m.replace(/^#/, '').toLowerCase()));
  }, [search]);

  // Active tag token currently being typed (e.g. #repayment -> repayment)
  const currentTypingTag = useMemo(() => {
    const match = search.match(/#([a-zA-Z0-9_\-]*)$/);
    return match ? match[1].toLowerCase() : '';
  }, [search]);

  // Tag suggestions:
  // If actively typing #token, match that token.
  // Otherwise, show all available tags so the user can easily select more tags on subsequent clicks!
  const matchingTagSuggestions = useMemo(() => {
    if (!tags || tags.length === 0) return [];
    if (currentTypingTag) {
      return tags.filter(t => t.name.toLowerCase().includes(currentTypingTag));
    }
    // Return all tags, sorting unselected tags to the front
    return [...tags].sort((a, b) => {
      const aSelected = existingSearchTags.has(a.name.toLowerCase()) ? 1 : 0;
      const bSelected = existingSearchTags.has(b.name.toLowerCase()) ? 1 : 0;
      return aSelected - bSelected;
    });
  }, [tags, currentTypingTag, existingSearchTags]);

  const handleToggleSearchTag = (tagName: string) => {
    const lower = tagName.toLowerCase();
    if (existingSearchTags.has(lower)) {
      // Remove this tag from search
      setSearch(prev => {
        const regex = new RegExp(`\\s*#${tagName}\\b`, 'gi');
        return prev.replace(regex, '').trimStart();
      });
    } else {
      // Append this tag to search
      setSearch(prev => {
        const trimmed = prev.trim();
        if (!trimmed) return `#${tagName} `;
        if (/#([a-zA-Z0-9_\-]*)$/.test(trimmed)) {
          return trimmed.replace(/#([a-zA-Z0-9_\-]*)$/, `#${tagName} `);
        }
        return `${trimmed} #${tagName} `;
      });
    }
  };

  const hasActiveFilters = Boolean(search || selectedType || selectedAccountId || selectedCategoryId);

  const handleClearFilters = () => {
    setSearch('');
    setSelectedType('');
    setSelectedAccountId('');
    setSelectedCategoryId('');
  };

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
        className="card txn-filter-card"
        style={{
          padding: '1rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '0.75rem',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        {/* Search with Tag Dropdown & Continuous Filtering */}
        <div className="txn-search-col" ref={searchContainerRef} style={{ position: 'relative' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search merchant, notes, #tag1 #tag2, ₹amount..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setSearchTagSuggestionsOpen(true);
              }}
              onClick={() => setSearchTagSuggestionsOpen(true)}
              onFocus={() => setSearchTagSuggestionsOpen(true)}
              style={{ paddingLeft: '2.25rem', paddingRight: search ? '4rem' : '2.5rem', width: '100%' }}
            />
            <div
              style={{
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px',
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setSearchTagSuggestionsOpen(prev => !prev)}
                style={{
                  background: searchTagSuggestionsOpen ? 'var(--brand-light)' : 'none',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: searchTagSuggestionsOpen ? 'var(--brand-primary)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '3px',
                }}
                title={searchTagSuggestionsOpen ? 'Hide tag suggestions' : 'Show tag suggestions'}
              >
                <Tag size={14} />
              </button>
            </div>
          </div>

          {/* Tag Dropdown Suggestions */}
          {searchTagSuggestionsOpen && matchingTagSuggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
                zIndex: 70,
                padding: '0.6rem',
                maxHeight: '220px',
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <Tag size={12} /> Filter by Tags
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTagSuggestionsOpen(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                  className="btn-ghost"
                  title="Hide tag list for now"
                >
                  <X size={12} /> Hide
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {matchingTagSuggestions.map((t: any) => {
                  const isSelected = existingSearchTags.has(t.name.toLowerCase());
                  const tagColor = t.color || '#3B82F6';
                  return (
                    <button
                      key={t.id || t.name}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleToggleSearchTag(t.name);
                      }}
                      style={{
                        background: isSelected ? tagColor : `${tagColor}15`,
                        color: isSelected ? '#ffffff' : tagColor,
                        border: `1px solid ${isSelected ? tagColor : `${tagColor}35`}`,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: isSelected ? 600 : 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSelected ? (
                        <Check size={11} strokeWidth={3} />
                      ) : (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: tagColor }} />
                      )}
                      #{t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Type Select */}
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

        {/* Account Select */}
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

        {/* Searchable & Color-Segregated Category Combobox */}
        <div ref={categoryContainerRef} style={{ position: 'relative' }}>
          <div
            className="form-input"
            onClick={() => setCategoryDropdownOpen(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              padding: '0.55rem 0.75rem',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedCategoryObj ? (
                <>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: selectedCategoryObj.color || 'var(--brand-primary)',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {selectedCategoryObj.fullName}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  All Categories
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {selectedCategoryId && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCategoryId('');
                  }}
                  title="Clear category filter"
                  style={{ color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                >
                  <X size={14} />
                </span>
              )}
              <ChevronDown
                size={14}
                style={{
                  color: 'var(--text-muted)',
                  transform: categoryDropdownOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.15s ease',
                }}
              />
            </div>
          </div>

          {categoryDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                minWidth: '240px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
                zIndex: 80,
                maxHeight: '280px',
                overflowY: 'auto',
                padding: '0.4rem',
              }}
            >
              {/* Category Search Input */}
              <div style={{ padding: '0.25rem 0.25rem 0.5rem 0.25rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '0.35rem' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search categories..."
                    value={categorySearch}
                    onChange={e => setCategorySearch(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    autoFocus
                    style={{
                      paddingLeft: '1.8rem',
                      paddingTop: '0.35rem',
                      paddingBottom: '0.35rem',
                      fontSize: '0.75rem',
                      width: '100%',
                    }}
                  />
                </div>
              </div>

              {/* "All Categories" Option */}
              <div
                style={{
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.8125rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: !selectedCategoryId ? 'var(--brand-primary)' : 'var(--text-muted)',
                  fontWeight: !selectedCategoryId ? 600 : 400,
                  backgroundColor: !selectedCategoryId ? 'rgba(79, 70, 229, 0.12)' : 'transparent',
                  marginBottom: '0.25rem',
                }}
                onClick={() => {
                  setSelectedCategoryId('');
                  setCategoryDropdownOpen(false);
                  setCategorySearch('');
                }}
              >
                <span>All Categories</span>
                {!selectedCategoryId && <Check size={14} />}
              </div>

              {filteredCategoryTree.length === 0 ? (
                <div style={{ padding: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  No categories match &ldquo;{categorySearch}&rdquo;
                </div>
              ) : (
                filteredCategoryTree.map(parent => {
                  const isParentSelected = selectedCategoryId === parent.id;
                  return (
                    <div key={parent.id} style={{ marginBottom: '0.35rem' }}>
                      {/* Parent category */}
                      <div
                        style={{
                          padding: '0.4rem 0.6rem',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          color: parent.color || 'var(--text-primary)',
                          backgroundColor: isParentSelected ? 'rgba(79, 70, 229, 0.12)' : 'transparent',
                        }}
                        onClick={() => {
                          setSelectedCategoryId(parent.id);
                          setCategoryDropdownOpen(false);
                          setCategorySearch('');
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: parent.color || '#6B7280',
                              flexShrink: 0,
                            }}
                          />
                          <span>{parent.name}</span>
                        </div>
                        {isParentSelected && <Check size={14} style={{ color: 'var(--brand-primary)' }} />}
                      </div>

                      {/* Subcategories */}
                      {parent.subcategories?.map((sub: any) => {
                        const isSubSelected = selectedCategoryId === sub.id;
                        return (
                          <div
                            key={sub.id}
                            style={{
                              padding: '0.35rem 0.6rem 0.35rem 1.6rem',
                              fontSize: '0.8125rem',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              color: isSubSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                              backgroundColor: isSubSelected ? 'rgba(79, 70, 229, 0.12)' : 'transparent',
                            }}
                            onClick={() => {
                              setSelectedCategoryId(sub.id);
                              setCategoryDropdownOpen(false);
                              setCategorySearch('');
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: sub.color || parent.color || '#6B7280',
                                  opacity: 0.8,
                                  flexShrink: 0,
                                }}
                              />
                              <span>{sub.name}</span>
                            </div>
                            {isSubSelected && <Check size={14} style={{ color: 'var(--brand-primary)' }} />}
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>


        {/* Clear Filters Button if any active */}
        {hasActiveFilters && (
          <button
            type="button"
            className="btn-ghost"
            onClick={handleClearFilters}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              padding: '0.45rem 0.65rem',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              justifyContent: 'center',
            }}
          >
            <X size={14} /> Clear Filters
          </button>
        )}
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
                      const isDeleting = deletingTxIds.has(tx.id);

                      return (
                        <tr
                          key={tx.id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            pointerEvents: isDeleting ? 'none' : 'auto',
                          }}
                          className={isDeleting ? 'row-deleting' : 'card-interactive'}
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
                                  const isTagActive = existingSearchTags.has(tagObj.name.toLowerCase());
                                  const tagColor = tagObj.color || '#3B82F6';
                                  return (
                                    <span
                                      key={tagObj.id || tagObj.name}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleSearchTag(tagObj.name);
                                      }}
                                      title={isTagActive ? `Remove #${tagObj.name} filter` : `Filter by #${tagObj.name}`}
                                      style={{
                                        fontSize: '0.6875rem',
                                        fontWeight: 500,
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        backgroundColor: isTagActive ? tagColor : `${tagColor}18`,
                                        color: isTagActive ? '#ffffff' : tagColor,
                                        border: `1px solid ${tagColor}35`,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {isTagActive ? (
                                        <Check size={9} strokeWidth={3} />
                                      ) : (
                                        <span
                                          style={{
                                            width: '5px',
                                            height: '5px',
                                            borderRadius: '50%',
                                            backgroundColor: tagColor,
                                          }}
                                        />
                                      )}
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
                                disabled={isDeleting}
                                title={isDeleting ? 'Deleting...' : 'Delete transaction (with undo)'}
                                style={{ color: isDeleting ? 'var(--color-danger)' : 'var(--text-muted)', width: '28px', height: '28px' }}
                              >
                                {isDeleting ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
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

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { toMinorUnits } from '@/lib/money';
import { X, Plus, Minus, Calculator, Trash2, AlertCircle, Calendar, Tag as TagIcon, Settings2, Check, Search, ChevronDown } from 'lucide-react';
import { PayeeTagManagerModal } from './PayeeTagManagerModal';
import { ModernDatePicker } from './ModernDatePicker';

interface Account {
  id: string;
  name: string;
  type: string;
  current_balance: number;
  color: string;
  is_default?: boolean | number;
}

interface Category {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  subcategories?: Category[];
}

interface MerchantItem {
  id: string;
  name: string;
  default_category_id?: string;
}

interface TagItem {
  id: string;
  name: string;
  color: string;
}

import { evaluateAmountInput, AmountEvaluation } from '@/lib/amount-evaluator';
export { evaluateAmountInput };
export type { AmountEvaluation };

export const TransactionModal = () => {
  const {
    isTransactionModalOpen,
    closeTransactionModal,
    transactionModalType,
    preselectedAccountId,
    showToast,
    triggerRefresh,
  } = useApp();

  const [type, setType] = useState<'expense' | 'income' | 'transfer'>(transactionModalType);
  const [amountStr, setAmountStr] = useState('');
  const [accountId, setAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [notes, setNotes] = useState('');

  // Merchants & Tags
  const [merchantsList, setMerchantsList] = useState<MerchantItem[]>([]);
  const [merchantDropdownOpen, setMerchantDropdownOpen] = useState(false);
  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const [selectedTags, setSelectedTags] = useState<TagItem[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageInitialTab, setManageInitialTab] = useState<'payees' | 'tags'>('payees');

  // Splits
  const [showSplits, setShowSplits] = useState(false);
  const [splits, setSplits] = useState<Array<{ categoryId: string; amountStr: string; notes: string }>>([
    { categoryId: '', amountStr: '', notes: '' },
    { categoryId: '', amountStr: '', notes: '' },
  ]);

  // Accounts & Categories
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categoryTree, setCategoryTree] = useState<Category[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [pendingKeepOpen, setPendingKeepOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

  const merchantRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const amountEvaluation = React.useMemo(() => evaluateAmountInput(amountStr), [amountStr]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Restrict strictly to numbers, decimal point, +, -, and spaces
    const clean = e.target.value.replace(/[^0-9.+\-\s]/g, '');
    setAmountStr(clean);
  };

  const handleApplyEvaluation = () => {
    if (amountEvaluation.isValid && amountEvaluation.isPositive) {
      setAmountStr(amountEvaluation.value.toString());
    }
  };

  const handleAppendOperator = (op: '+' | '-') => {
    setAmountStr(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return '';
      if (/[+\-]$/.test(trimmed)) {
        return trimmed.slice(0, -1).trim() + ` ${op} `;
      }
      return `${trimmed} ${op} `;
    });
    setTimeout(() => amountInputRef.current?.focus(), 20);
  };

  const handleQuickAddAmount = (val: number) => {
    setAmountStr(prev => {
      const trimmed = prev.trim();
      if (!trimmed || trimmed === '0') return val.toString();
      if (/[+\-]$/.test(trimmed)) {
        return `${trimmed} ${val}`;
      }
      return `${trimmed} + ${val}`;
    });
    setTimeout(() => amountInputRef.current?.focus(), 20);
  };

  const loadMerchantsAndTags = async () => {
    try {
      const [merchRes, tagsRes] = await Promise.all([
        fetch('/api/merchants').then(r => r.json()),
        fetch('/api/tags').then(r => r.json()),
      ]);
      if (merchRes.merchants) setMerchantsList(merchRes.merchants);
      if (tagsRes.tags) setAllTags(tagsRes.tags);
    } catch {
      // Non-critical fallback
    }
  };

  useEffect(() => {
    if (isTransactionModalOpen) {
      setType(transactionModalType);
      setAmountStr('');
      setMerchantName('');
      setCategoryId('');
      setCategorySearch('');
      setCategoryDropdownOpen(false);
      setPendingKeepOpen(false);
      setNotes('');
      setSelectedTags([]);
      setTagInput('');
      setShowSplits(false);
      setDuplicateWarning(null);
      setDate(new Date().toISOString().substring(0, 10));

      // Fetch accounts and categories
      fetch('/api/accounts')
        .then(r => r.json())
        .then(d => {
          if (d.accounts) {
            setAccounts(d.accounts);
            if (preselectedAccountId) {
              setAccountId(preselectedAccountId);
            } else {
              // Preselect default account if available, else first account
              const defaultAcc = d.accounts.find((a: any) => Boolean(a.is_default)) || d.accounts[0];
              if (defaultAcc) {
                setAccountId(defaultAcc.id);
                const otherAcc = d.accounts.find((a: any) => a.id !== defaultAcc.id);
                if (otherAcc) setDestinationAccountId(otherAcc.id);
              }
            }
          }
        });

      fetch('/api/categories')
        .then(r => r.json())
        .then(d => {
          if (d.tree) setCategoryTree(d.tree);
        });

      loadMerchantsAndTags();
    }
  }, [isTransactionModalOpen, transactionModalType, preselectedAccountId]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (merchantRef.current && !merchantRef.current.contains(e.target as Node)) {
        setMerchantDropdownOpen(false);
      }
      if (tagRef.current && !tagRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to find selected category object across tree
  const selectedCategory = React.useMemo(() => {
    if (!categoryId) return null;
    for (const parent of categoryTree) {
      if (parent.id === categoryId) {
        return { ...parent, fullName: parent.name, isParent: true };
      }
      if (parent.subcategories) {
        for (const sub of parent.subcategories) {
          if (sub.id === categoryId) {
            return { ...sub, parentName: parent.name, fullName: `${parent.name} › ${sub.name}`, isParent: false };
          }
        }
      }
    }
    return null;
  }, [categoryId, categoryTree]);

  // Filter category tree for searchable dropdown
  const filteredCategories = React.useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    
    // Filter by type if applicable (expense or income)
    const typeMatchingParents = categoryTree.filter(cat => {
      if (type === 'transfer') return true;
      return !cat.type || cat.type === type;
    });

    if (!query) {
      return typeMatchingParents;
    }

    // When searching, filter both parents and subcategories
    const result: Array<Category & { subcategories?: Category[] }> = [];

    for (const parent of typeMatchingParents) {
      const parentMatches = parent.name.toLowerCase().includes(query);
      const matchingSubs = (parent.subcategories || []).filter(sub =>
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
  }, [categoryTree, categorySearch, type]);

  // Auto suggest category on merchant selection
  const selectMerchant = async (name: string, defaultCatId?: string) => {
    setMerchantName(name);
    setMerchantDropdownOpen(false);

    if (defaultCatId && !categoryId) {
      setCategoryId(defaultCatId);
      setCategorySearch('');
      return;
    }

    if (!categoryId) {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(name)}`);
        const data = await res.json();
        if (data.results?.transactions?.length > 0) {
          const lastTx = data.results.transactions[0];
          if (lastTx.category_id) {
            setCategoryId(lastTx.category_id);
            setCategorySearch('');
          }
        }
      } catch {
        // Ignore background suggestion error
      }
    }
  };

  const handleAddTag = async (tagItem: TagItem) => {
    if (!selectedTags.some(t => t.name.toLowerCase() === tagItem.name.toLowerCase())) {
      setSelectedTags(prev => [...prev, tagItem]);
    }
    setTagInput('');
    setTagDropdownOpen(false);
  };

  const handleCreateAndAddTag = async (tagName: string) => {
    const cleanName = tagName.replace(/^#/, '').trim();
    if (!cleanName) return;

    // Check if tag already exists in allTags
    const existing = allTags.find(t => t.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      handleAddTag(existing);
      return;
    }

    try {
      const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, color: randomColor }),
      });
      const data = await res.json();
      if (res.ok && data.tag) {
        setAllTags(prev => [...prev, data.tag]);
        setSelectedTags(prev => [...prev, data.tag]);
      } else {
        // Fallback local tag
        setSelectedTags(prev => [...prev, { id: cleanName, name: cleanName, color: randomColor }]);
      }
    } catch {
      setSelectedTags(prev => [...prev, { id: cleanName, name: cleanName, color: '#3B82F6' }]);
    }
    setTagInput('');
    setTagDropdownOpen(false);
  };

  const handleRemoveTag = (tagName: string) => {
    setSelectedTags(prev => prev.filter(t => t.name !== tagName));
  };

  // Quick Date Helpers
  const setDateToday = () => setDate(new Date().toISOString().substring(0, 10));
  const setDateYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().substring(0, 10));
  };

  const handleAddSplit = () => {
    setSplits(prev => [...prev, { categoryId: '', amountStr: '', notes: '' }]);
  };

  const handleRemoveSplit = (idx: number) => {
    setSplits(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSplitChange = (idx: number, field: string, val: string) => {
    setSplits(prev => {
      const next = [...prev];
      (next[idx] as any)[field] = val;
      return next;
    });
  };

  const handleSubmit = async (confirmDup = false, keepOpen = false) => {
    if (!amountEvaluation.isValid || !amountEvaluation.isPositive) {
      showToast(amountEvaluation.errorMessage || 'Please enter a valid amount greater than zero', 'error');
      return;
    }

    const resolvedAmountStr = amountEvaluation.value.toString();
    const minorAmount = toMinorUnits(resolvedAmountStr);
    if (minorAmount <= 0) {
      showToast('Please enter a valid amount greater than zero', 'error');
      return;
    }
    if (!accountId) {
      showToast('Please select an account', 'error');
      return;
    }

    if (type === 'transfer') {
      if (!destinationAccountId) {
        showToast('Please select a destination account', 'error');
        return;
      }
      if (accountId === destinationAccountId) {
        showToast('Source and destination accounts must be different', 'error');
        return;
      }
    }

    // Process splits if active
    let formattedSplits: any[] = [];
    if (showSplits) {
      formattedSplits = splits.map(s => ({
        categoryId: s.categoryId || categoryId,
        amount: toMinorUnits(s.amountStr),
        notes: s.notes,
      }));
      const splitTotal = formattedSplits.reduce((sum, s) => sum + s.amount, 0);
      if (splitTotal !== minorAmount) {
        showToast(`Splits sum (₹${splitTotal / 100}) must equal transaction total (₹${minorAmount / 100})`, 'error');
        return;
      }
    }

    setLoading(true);
    setPendingKeepOpen(keepOpen);

    try {
      if (type === 'transfer') {
        const res = await fetch('/api/transfers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromAccountId: accountId,
            toAccountId: destinationAccountId,
            amount: minorAmount,
            date,
            notes,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        triggerRefresh();

        if (keepOpen) {
          showToast(`Transfer of ₹${resolvedAmountStr} recorded! Ready for next on ${date}.`);
          setAmountStr('');
          setNotes('');
          setTimeout(() => {
            amountInputRef.current?.focus();
          }, 50);
        } else {
          showToast('Transfer completed successfully!');
          closeTransactionModal();
        }
      } else {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId,
            type,
            amount: minorAmount,
            date,
            merchantName: merchantName.trim() || undefined,
            categoryId: categoryId || undefined,
            notes: notes.trim() || undefined,
            splits: showSplits ? formattedSplits : undefined,
            tags: selectedTags.map(t => t.name),
            checkDuplicate: !confirmDup,
            confirmedDuplicate: confirmDup,
          }),
        });

        const data = await res.json();
        if (res.status === 409 && data.duplicateWarning) {
          setDuplicateWarning(data.duplicateWarning);
          setLoading(false);
          return;
        }

        if (!res.ok) throw new Error(data.error);

        triggerRefresh();

        if (keepOpen) {
          showToast(`${type === 'expense' ? 'Expense' : 'Income'} of ₹${resolvedAmountStr} saved! Ready for next on ${date}.`);
          // Clear inputs for next transaction
          setAmountStr('');
          setMerchantName('');
          setCategoryId('');
          setCategorySearch('');
          setNotes('');
          setSelectedTags([]);
          setTagInput('');
          setShowSplits(false);
          setSplits([
            { categoryId: '', amountStr: '', notes: '' },
            { categoryId: '', amountStr: '', notes: '' },
          ]);
          setDuplicateWarning(null);

          // Retain date and account so user can batch log transactions for that day
          setTimeout(() => {
            amountInputRef.current?.focus();
          }, 50);
        } else {
          showToast(`${type === 'expense' ? 'Expense' : 'Income'} recorded successfully!`);
          closeTransactionModal();
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save transaction', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtered lists for comboboxes
  const filteredMerchants = merchantsList.filter(m =>
    m.name.toLowerCase().includes(merchantName.toLowerCase())
  );
  const exactMerchantMatch = merchantsList.some(
    m => m.name.toLowerCase() === merchantName.trim().toLowerCase()
  );

  const availableTags = allTags.filter(
    t =>
      !selectedTags.some(sel => sel.name.toLowerCase() === t.name.toLowerCase()) &&
      t.name.toLowerCase().includes(tagInput.toLowerCase().replace(/^#/, ''))
  );
  const exactTagMatch = allTags.some(
    t => t.name.toLowerCase() === tagInput.trim().toLowerCase().replace(/^#/, '')
  );

  if (!isTransactionModalOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={closeTransactionModal}>
        <div
          className="modal-content"
          onClick={e => e.stopPropagation()}
          style={{ maxWidth: '540px', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Record Transaction</h2>
            <button className="btn-icon" onClick={closeTransactionModal}>
              <X size={18} />
            </button>
          </div>

          {/* Type Selector (Pills) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '0.375rem',
              backgroundColor: 'var(--bg-subtle)',
              padding: '0.25rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem',
            }}
          >
            {(['expense', 'income', 'transfer'] as const).map(t => {
              const active = type === t;
              let activeColor = 'var(--text-primary)';
              if (active && t === 'expense') activeColor = 'var(--color-expense)';
              if (active && t === 'income') activeColor = 'var(--color-income)';
              if (active && t === 'transfer') activeColor = 'var(--color-transfer)';

              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  style={{
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                    color: activeColor,
                    boxShadow: active ? 'var(--shadow-sm)' : 'none',
                    textTransform: 'capitalize',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {/* Amount Input */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem', flexWrap: 'wrap', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                AMOUNT (₹)
              </label>

              {/* Math Operators & Quick Amount Chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <button
                  type="button"
                  onClick={() => handleAppendOperator('+')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    fontSize: '0.72rem',
                    padding: '0.15rem 0.45rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                  title="Add amount (+)"
                >
                  <Plus size={11} /> Add
                </button>
                <button
                  type="button"
                  onClick={() => handleAppendOperator('-')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    fontSize: '0.72rem',
                    padding: '0.15rem 0.45rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                  title="Subtract amount (-)"
                >
                  <Minus size={11} /> Sub
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddAmount(100)}
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.15rem 0.4rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  +100
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddAmount(500)}
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.15rem 0.4rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  +500
                </button>
              </div>
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '1rem',
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                }}
              >
                ₹
              </span>
              <input
                ref={amountInputRef}
                type="text"
                autoFocus
                value={amountStr}
                onChange={handleAmountChange}
                onBlur={() => {
                  if (amountEvaluation.hasExpression && amountEvaluation.isValid && amountEvaluation.isPositive) {
                    setAmountStr(amountEvaluation.value.toString());
                  }
                }}
                placeholder="0 (e.g. 1200 + 450 - 50)"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  backgroundColor: 'var(--bg-subtle)',
                  border: `1px solid ${
                    amountEvaluation.hasExpression && !amountEvaluation.isPositive && amountEvaluation.errorMessage
                      ? 'var(--color-expense)'
                      : amountEvaluation.hasExpression && amountEvaluation.isValid
                      ? 'var(--brand-primary)'
                      : 'var(--border-default)'
                  }`,
                  borderRadius: 'var(--radius-lg)',
                  color: 'var(--text-primary)',
                  fontVariantNumeric: 'tabular-nums',
                  outline: 'none',
                }}
              />
            </div>

            {/* Live Expression Evaluation Badge */}
            {amountEvaluation.hasExpression && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '0.45rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: !amountEvaluation.isPositive && amountEvaluation.errorMessage
                    ? 'var(--color-expense-subtle)'
                    : 'var(--brand-light)',
                  border: `1px solid ${
                    !amountEvaluation.isPositive && amountEvaluation.errorMessage
                      ? 'rgba(239, 68, 68, 0.3)'
                      : 'rgba(99, 102, 241, 0.3)'
                  }`,
                  fontSize: '0.8rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calculator
                    size={14}
                    style={{
                      color: !amountEvaluation.isPositive && amountEvaluation.errorMessage
                        ? 'var(--color-expense)'
                        : 'var(--brand-primary)',
                    }}
                  />
                  {amountEvaluation.isValid && amountEvaluation.isPositive ? (
                    <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>
                      Net Sum = ₹{amountEvaluation.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--color-expense)', fontWeight: 600 }}>
                      {amountEvaluation.errorMessage || 'Net sum must be positive (> ₹0)'}
                    </span>
                  )}
                </div>

                {amountEvaluation.isValid && amountEvaluation.isPositive && (
                  <button
                    type="button"
                    onClick={handleApplyEvaluation}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--brand-primary)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '0 4px',
                    }}
                  >
                    Apply ₹{amountEvaluation.value}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Duplicate Warning Prompt */}
          {duplicateWarning && (
            <div
              style={{
                backgroundColor: 'var(--color-warning-subtle)',
                border: '1px solid var(--color-warning)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-warning)', fontWeight: 600, fontSize: '0.875rem' }}>
                <AlertCircle size={16} /> Possible duplicate transaction detected!
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                A matching transaction for ₹{amountStr} was recorded within the last 48 hours. Would you like to keep both or cancel?
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button
                  className="btn-primary"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  onClick={() => handleSubmit(true, pendingKeepOpen)}
                >
                  Keep Both
                </button>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  onClick={() => setDuplicateWarning(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Transfer Source & Destination */}
          {type === 'transfer' ? (
            <div className="form-row" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">FROM ACCOUNT</label>
                <select
                  className="form-select"
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} {acc.is_default ? '★ (Default)' : ''} (₹{(acc.current_balance / 100).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">TO ACCOUNT</label>
                <select
                  className="form-select"
                  value={destinationAccountId}
                  onChange={e => setDestinationAccountId(e.target.value)}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} {acc.is_default ? '★ (Default)' : ''} (₹{(acc.current_balance / 100).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            /* Expense / Income Account & Merchant & Category */
            <>
              <div className="form-row" style={{ marginBottom: '1rem' }}>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>ACCOUNT</label>
                  </div>
                  <select
                    className="form-select"
                    value={accountId}
                    onChange={e => setAccountId(e.target.value)}
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} {acc.is_default ? '★ (Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Merchant / Payee Autocomplete Combobox (NO color dots) */}
                <div className="form-group" ref={merchantRef} style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>MERCHANT / PAYEE</label>
                    <button
                      type="button"
                      onClick={() => {
                        setManageInitialTab('payees');
                        setShowManageModal(true);
                      }}
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                      title="Manage Payees"
                    >
                      <Settings2 size={11} /> Manage
                    </button>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    value={merchantName}
                    onChange={e => {
                      setMerchantName(e.target.value);
                      setMerchantDropdownOpen(true);
                    }}
                    onFocus={() => setMerchantDropdownOpen(true)}
                    placeholder="Search or add payee..."
                    autoComplete="off"
                  />

                  {/* Dropdown Suggestions */}
                  {merchantDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                        zIndex: 50,
                        maxHeight: '180px',
                        overflowY: 'auto',
                        marginTop: '4px',
                      }}
                    >
                      {merchantName.trim() && !exactMerchantMatch && (
                        <div
                          style={{
                            padding: '0.5rem 0.75rem',
                            fontSize: '0.8rem',
                            color: 'var(--brand-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            borderBottom: filteredMerchants.length > 0 ? '1px solid var(--border-subtle)' : 'none',
                            backgroundColor: 'rgba(59, 130, 246, 0.08)',
                          }}
                          onMouseDown={e => {
                            e.preventDefault();
                            selectMerchant(merchantName.trim());
                          }}
                        >
                          <Plus size={14} /> Add payee &ldquo;<strong>{merchantName.trim()}</strong>&rdquo;
                        </div>
                      )}

                      {filteredMerchants.length > 0 ? (
                        filteredMerchants.map(m => (
                          <div
                            key={m.id}
                            style={{
                              padding: '0.5rem 0.75rem',
                              fontSize: '0.8125rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              color: 'var(--text-primary)',
                              transition: 'background-color 0.12s ease',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                            onMouseDown={e => {
                              e.preventDefault();
                              selectMerchant(m.name, m.default_category_id);
                            }}
                          >
                            <span>{m.name}</span>
                            {merchantName.trim().toLowerCase() === m.name.toLowerCase() && (
                              <Check size={14} style={{ color: 'var(--color-income)' }} />
                            )}
                          </div>
                        ))
                      ) : !merchantName.trim() ? (
                        <div style={{ padding: '0.6rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Start typing to see payees...
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              {/* Searchable Category Combobox */}
              {!showSplits && (
                <div className="form-group" style={{ marginBottom: '1rem', position: 'relative' }} ref={categoryRef}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>CATEGORY</label>
                    <button
                      type="button"
                      onClick={() => setShowSplits(true)}
                      style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      + Split Transaction
                    </button>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Search
                        size={15}
                        style={{
                          position: 'absolute',
                          left: '0.75rem',
                          color: 'var(--text-muted)',
                          pointerEvents: 'none',
                        }}
                      />
                      <input
                        ref={categoryInputRef}
                        type="text"
                        className="form-input"
                        style={{
                          paddingLeft: '2.25rem',
                          paddingRight: selectedCategory ? '4.5rem' : '2.25rem',
                        }}
                        placeholder={selectedCategory ? selectedCategory.fullName : 'Search or select category...'}
                        value={categoryDropdownOpen ? categorySearch : (selectedCategory ? selectedCategory.fullName : '')}
                        onChange={e => {
                          setCategorySearch(e.target.value);
                          setCategoryDropdownOpen(true);
                        }}
                        onFocus={() => {
                          setCategoryDropdownOpen(true);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Escape') {
                            setCategoryDropdownOpen(false);
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            if (filteredCategories.length > 0) {
                              const firstParent = filteredCategories[0];
                              if (firstParent.subcategories && firstParent.subcategories.length > 0) {
                                setCategoryId(firstParent.subcategories[0].id);
                              } else {
                                setCategoryId(firstParent.id);
                              }
                              setCategorySearch('');
                              setCategoryDropdownOpen(false);
                            }
                          }
                        }}
                      />

                      {/* Right icons: Clear & Toggle */}
                      <div style={{ position: 'absolute', right: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {categoryId && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setCategoryId('');
                              setCategorySearch('');
                              categoryInputRef.current?.focus();
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                              padding: '2px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Clear category"
                          >
                            <X size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setCategoryDropdownOpen(prev => !prev)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '2px',
                          }}
                        >
                          <ChevronDown
                            size={16}
                            style={{
                              transform: categoryDropdownOpen ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.15s ease',
                            }}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Filtered Dropdown */}
                    {categoryDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-default)',
                          borderRadius: 'var(--radius-md)',
                          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
                          zIndex: 60,
                          maxHeight: '260px',
                          overflowY: 'auto',
                          marginTop: '4px',
                          padding: '0.35rem',
                        }}
                      >
                        {filteredCategories.length === 0 ? (
                          <div style={{ padding: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                            No categories found matching &ldquo;<strong>{categorySearch}</strong>&rdquo;
                          </div>
                        ) : (
                          filteredCategories.map(parent => (
                            <div key={parent.id} style={{ marginBottom: '0.35rem' }}>
                              {/* Parent Category Option */}
                              <div
                                style={{
                                  padding: '0.45rem 0.6rem',
                                  fontSize: '0.8125rem',
                                  fontWeight: 600,
                                  borderRadius: 'var(--radius-sm)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  color: parent.color || 'var(--text-primary)',
                                  backgroundColor: categoryId === parent.id ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
                                  transition: 'background-color 0.12s ease',
                                }}
                                onMouseEnter={e => {
                                  if (categoryId !== parent.id) e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
                                }}
                                onMouseLeave={e => {
                                  if (categoryId !== parent.id) e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                                onMouseDown={e => {
                                  e.preventDefault();
                                  setCategoryId(parent.id);
                                  setCategorySearch('');
                                  setCategoryDropdownOpen(false);
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
                                {categoryId === parent.id && <Check size={14} style={{ color: 'var(--brand-primary)' }} />}
                              </div>

                              {/* Subcategories */}
                              {parent.subcategories?.map(sub => {
                                const isSelected = categoryId === sub.id;
                                return (
                                  <div
                                    key={sub.id}
                                    style={{
                                      padding: '0.4rem 0.6rem 0.4rem 1.6rem',
                                      fontSize: '0.8125rem',
                                      borderRadius: 'var(--radius-sm)',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      color: 'var(--text-secondary)',
                                      backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
                                      transition: 'background-color 0.12s ease, color 0.12s ease',
                                    }}
                                    onMouseEnter={e => {
                                      if (!isSelected) {
                                        e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
                                        e.currentTarget.style.color = 'var(--text-primary)';
                                      }
                                    }}
                                    onMouseLeave={e => {
                                      if (!isSelected) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = 'var(--text-secondary)';
                                      }
                                    }}
                                    onMouseDown={e => {
                                      e.preventDefault();
                                      setCategoryId(sub.id);
                                      setCategorySearch('');
                                      setCategoryDropdownOpen(false);
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
                                      {categorySearch && (
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                                          ({parent.name})
                                        </span>
                                      )}
                                    </div>
                                    {isSelected && <Check size={14} style={{ color: 'var(--brand-primary)' }} />}
                                  </div>
                                );
                              })}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Splits Form */}
          {showSplits && type !== 'transfer' && (
            <div
              style={{
                backgroundColor: 'var(--bg-subtle)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>SPLIT AMOUNTS</span>
                <button
                  type="button"
                  onClick={() => setShowSplits(false)}
                  style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Cancel Split
                </button>
              </div>
              {splits.map((split, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <select
                    className="form-select"
                    value={split.categoryId}
                    onChange={e => handleSplitChange(idx, 'categoryId', e.target.value)}
                    style={{ flex: 2 }}
                  >
                    <option value="">Category</option>
                    {categoryTree.map(cat => (
                      <optgroup key={cat.id} label={cat.name}>
                        <option value={cat.id}>{cat.name}</option>
                        {cat.subcategories?.map(sub => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="form-input"
                    value={split.amountStr}
                    onChange={e => handleSplitChange(idx, 'amountStr', e.target.value)}
                    placeholder="Amount"
                    style={{ flex: 1 }}
                  />
                  {splits.length > 2 && (
                    <button
                      className="btn-icon"
                      onClick={() => handleRemoveSplit(idx)}
                      style={{ color: 'var(--color-expense)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddSplit}
                style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Plus size={12} /> Add another split
              </button>
            </div>
          )}

          {/* Date & Modern Date Picker */}
          <div className="form-row" style={{ marginBottom: '1rem' }}>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  DATE
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={setDateToday}
                    style={{
                      padding: '2px 6px',
                      fontSize: '0.6875rem',
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={setDateYesterday}
                    style={{
                      padding: '2px 6px',
                      fontSize: '0.6875rem',
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    Yesterday
                  </button>
                </div>
              </div>
              <ModernDatePicker
                value={date}
                onChange={setDate}
                placeholder="Transaction date"
                required
              />
            </div>

            {/* Tags Combobox with Chips & Color Dots */}
            <div className="form-group" ref={tagRef} style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                <label className="form-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <TagIcon size={12} /> TAGS
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setManageInitialTab('tags');
                    setShowManageModal(true);
                  }}
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                  title="Manage Tags"
                >
                  <Settings2 size={11} /> Manage
                </button>
              </div>

              {/* Tag Input and Chips container */}
              <div
                style={{
                  minHeight: '40px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  padding: '4px 8px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {selectedTags.map(tag => (
                  <span key={tag.name} className="tag-chip">
                    <span className="tag-chip-dot" style={{ backgroundColor: tag.color || '#3B82F6' }} />
                    #{tag.name}
                    <button
                      type="button"
                      className="tag-chip-remove"
                      onClick={() => handleRemoveTag(tag.name)}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => {
                    setTagInput(e.target.value);
                    setTagDropdownOpen(true);
                  }}
                  onFocus={() => setTagDropdownOpen(true)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      e.preventDefault();
                      handleCreateAndAddTag(tagInput);
                    }
                  }}
                  placeholder={selectedTags.length === 0 ? 'Type tag or enter...' : '+ Add'}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '0.8125rem',
                    color: 'var(--text-primary)',
                    minWidth: '70px',
                    flex: 1,
                    padding: '4px 2px',
                  }}
                />
              </div>

              {/* Tag Dropdown */}
              {tagDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    zIndex: 50,
                    maxHeight: '160px',
                    overflowY: 'auto',
                    marginTop: '4px',
                  }}
                >
                  {tagInput.trim() && !exactTagMatch && (
                    <div
                      style={{
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.8rem',
                        color: 'var(--brand-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        backgroundColor: 'rgba(59, 130, 246, 0.08)',
                        borderBottom: availableTags.length > 0 ? '1px solid var(--border-subtle)' : 'none',
                      }}
                      onMouseDown={e => {
                        e.preventDefault();
                        handleCreateAndAddTag(tagInput);
                      }}
                    >
                      <Plus size={14} /> Create tag &ldquo;<strong>#{tagInput.trim().replace(/^#/, '')}</strong>&rdquo;
                    </div>
                  )}

                  {availableTags.map(tag => (
                    <div
                      key={tag.id}
                      style={{
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--text-primary)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      onMouseDown={e => {
                        e.preventDefault();
                        handleAddTag(tag);
                      }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: tag.color || '#3B82F6',
                        }}
                      />
                      <span>#{tag.name}</span>
                    </div>
                  ))}

                  {availableTags.length === 0 && !tagInput.trim() && (
                    <div style={{ padding: '0.6rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      No more tags. Type to create new.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">NOTES (OPTIONAL)</label>
            <input
              type="text"
              className="form-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any extra details..."
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={closeTransactionModal} disabled={loading}>
              Cancel
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => handleSubmit(false, true)}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderColor: 'rgba(79, 70, 229, 0.4)',
                color: 'var(--brand-primary)',
                fontWeight: 600,
              }}
              title="Save this transaction and keep the modal open with the same date for entering another"
            >
              <Plus size={15} /> Save & Add Another
            </button>
            <button className="btn-primary" onClick={() => handleSubmit(false, false)} disabled={loading}>
              {loading ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </div>
      </div>

      {/* Payee & Tag Manager Modal */}
      <PayeeTagManagerModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        initialTab={manageInitialTab}
        onUpdate={loadMerchantsAndTags}
      />
    </>
  );
};

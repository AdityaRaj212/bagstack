'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { Plus, PieChart, AlertTriangle, CheckCircle2, Trash2, X } from 'lucide-react';

export default function BudgetsPage() {
  const { showToast, refreshKey, triggerRefresh } = useApp();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Budget Modal
  const [isOpen, setIsOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [rollover, setRollover] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/budgets')
      .then(r => r.json())
      .then(d => {
        setBudgets(d.budgets || []);
        setLoading(false);
      });

    fetch('/api/categories')
      .then(r => r.json())
      .then(d => {
        // filter expense categories
        const exp = (d.categories || []).filter((c: any) => c.type === 'expense');
        setCategories(exp);
        if (exp.length > 0) setCategoryId(exp[0].id);
      });
  }, [refreshKey]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const minor = Math.round((parseFloat(amountStr) || 0) * 100);
    if (minor <= 0) {
      showToast('Please enter a valid budget amount', 'error');
      return;
    }

    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          amount: minor,
          rollover,
        }),
      });
      if (!res.ok) throw new Error('Failed to create budget');

      showToast('Budget created successfully!');
      setIsOpen(false);
      setAmountStr('');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/budgets?id=${id}`, { method: 'DELETE' });
      showToast('Budget removed');
      triggerRefresh();
    } catch {
      showToast('Failed to delete budget', 'error');
    }
  };

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudgeted - totalSpent;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Budgets</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Track categorical spending limits, overspending alerts, and rollover reserves.
          </p>
        </div>

        <button className="btn-primary" onClick={() => setIsOpen(true)}>
          <Plus size={16} /> Create Budget
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>TOTAL BUDGETED</div>
          <MoneyDisplay amount={totalBudgeted} size="xl" weight="bold" />
        </div>
        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>TOTAL SPENT</div>
          <MoneyDisplay amount={totalSpent} size="xl" weight="bold" colored />
        </div>
        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>TOTAL REMAINING</div>
          <MoneyDisplay amount={totalRemaining} size="xl" weight="bold" colored showSign />
        </div>
      </div>

      {/* Budget Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        {budgets.map(b => {
          const isOver = b.isOverspent;
          const statusColor = isOver ? 'var(--color-expense)' : b.percentUsed > 80 ? 'var(--color-warning)' : 'var(--color-income)';

          return (
            <div key={b.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{b.category_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {b.rollover ? 'Rollover enabled' : 'Monthly reset'}
                  </div>
                </div>
                <button
                  className="btn-icon"
                  onClick={() => handleDelete(b.id)}
                  style={{ color: 'var(--text-muted)' }}
                  title="Delete budget"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    ₹{Math.round(b.spent / 100).toLocaleString('en-IN')}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                      {' '}
                      / ₹{Math.round(b.amount / 100).toLocaleString('en-IN')}
                    </span>
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: statusColor }}>
                    {b.percentUsed}%
                  </span>
                </div>

                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.min(100, b.percentUsed)}%`,
                      backgroundColor: statusColor,
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  borderTop: '1px solid var(--border-default)',
                  paddingTop: '0.75rem',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>
                  {isOver ? 'Overspent by' : 'Safe to spend'}
                </span>
                <span style={{ fontWeight: 600, color: statusColor }}>
                  ₹{Math.round(Math.abs(b.remaining) / 100).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Set Monthly Budget</h2>
              <button className="btn-icon" onClick={() => setIsOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  CATEGORY
                </label>
                <select
                  className="input-field"
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  MONTHLY LIMIT (₹)
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 15000"
                  className="input-field"
                  value={amountStr}
                  onChange={e => setAmountStr(e.target.value)}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                <input
                  type="checkbox"
                  checked={rollover}
                  onChange={e => setRollover(e.target.checked)}
                />
                <span>Enable rollover (carry remaining balance to next month)</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

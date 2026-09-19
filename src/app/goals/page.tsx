'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { Plus, Target, Calendar, CheckCircle2, TrendingUp, X, Edit2, Trash2, ArrowDownLeft, AlertCircle } from 'lucide-react';
import { ModernDatePicker } from '@/components/ModernDatePicker';
import { formatDateDMY } from '@/lib/date';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatIndianNumberString, parseIndianNumber } from '@/lib/amount-evaluator';

export default function GoalsPage() {
  const { showToast, refreshKey, triggerRefresh, startAsyncOp, stopAsyncOp } = useApp();
  const [goals, setGoals] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Deletion confirm state
  const [goalToDelete, setGoalToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingGoal, setDeletingGoal] = useState(false);

  // New Goal Modal
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const [currentAmountStr, setCurrentAmountStr] = useState('0');
  const [targetDate, setTargetDate] = useState('2027-06-30');
  const [notes, setNotes] = useState('');

  // Contribution Modal
  const [contributeGoal, setContributeGoal] = useState<any>(null);
  const [contribStr, setContribStr] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');

  // Edit Goal Modal
  const [editGoal, setEditGoal] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editTargetAmountStr, setEditTargetAmountStr] = useState('');
  const [editCurrentAmountStr, setEditCurrentAmountStr] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/goals').then(r => r.json()),
      fetch('/api/accounts').then(r => r.json()),
    ]).then(([goalsData, accsData]) => {
      setGoals(goalsData.goals || []);
      const accList = accsData.accounts || [];
      setAccounts(accList);
      const defaultAcc = accList.find((a: any) => a.is_default) || accList[0];
      if (defaultAcc) setSourceAccountId(defaultAcc.id);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetMinor = Math.round(parseIndianNumber(targetAmountStr) * 100);
    const currMinor = Math.round((parseIndianNumber(currentAmountStr) || 0) * 100);

    startAsyncOp();
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          targetAmount: targetMinor,
          currentAmount: currMinor,
          targetDate,
          notes,
        }),
      });
      if (!res.ok) throw new Error('Failed to create goal');
      const data = await res.json();

      const createdGoal = {
        id: data.id || `gol_${Date.now()}`,
        name: name.trim(),
        target_amount: targetMinor,
        current_amount: currMinor,
        target_date: targetDate,
        notes,
        status: currMinor >= targetMinor ? 'completed' : 'in_progress',
        percent: targetMinor > 0 ? Math.min(100, Math.round((currMinor / targetMinor) * 100)) : 0,
        remainingAmount: Math.max(0, targetMinor - currMinor),
        monthsRemaining: 12,
        calculatedMonthlyTarget: Math.round(Math.max(0, targetMinor - currMinor) / 12),
      };

      setGoals(prev => [createdGoal, ...prev]);
      showToast('Savings goal created!');
      setIsOpen(false);
      setName('');
      setTargetAmountStr('');
      setCurrentAmountStr('0');
      triggerRefresh();
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      stopAsyncOp();
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoal) return;
    const addMinor = Math.round(parseIndianNumber(contribStr) * 100);
    if (addMinor <= 0) {
      showToast('Enter a valid contribution amount', 'error');
      return;
    }

    startAsyncOp();
    try {
      const res = await fetch('/api/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contributeGoal.id,
          addAmount: addMinor,
          sourceAccountId: sourceAccountId || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to record contribution');

      showToast(
        sourceAccountId
          ? 'Goal contribution saved & transaction recorded!'
          : 'Goal contribution recorded!'
      );
      setGoals(prev => prev.map(g => {
        if (g.id === contributeGoal.id) {
          const newCurr = g.current_amount + addMinor;
          return {
            ...g,
            current_amount: newCurr,
            percent: g.target_amount > 0 ? Math.min(100, Math.round((newCurr / g.target_amount) * 100)) : 0,
            remainingAmount: Math.max(0, g.target_amount - newCurr),
            status: newCurr >= g.target_amount ? 'completed' : g.status,
          };
        }
        return g;
      }));
      setContributeGoal(null);
      setContribStr('');
      triggerRefresh();
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      stopAsyncOp();
    }
  };

  const openEditModal = (g: any) => {
    setEditGoal(g);
    setEditName(g.name);
    setEditTargetAmountStr(formatIndianNumberString((g.target_amount / 100).toString()));
    setEditCurrentAmountStr(formatIndianNumberString((g.current_amount / 100).toString()));
    setEditTargetDate(g.target_date || '');
    setEditNotes(g.notes || '');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGoal) return;
    const targetMinor = Math.round(parseIndianNumber(editTargetAmountStr) * 100);
    const currMinor = Math.round(parseIndianNumber(editCurrentAmountStr) * 100);

    startAsyncOp();
    try {
      const res = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editGoal.id,
          name: editName.trim(),
          targetAmount: targetMinor,
          currentAmount: currMinor,
          targetDate: editTargetDate,
          notes: editNotes,
        }),
      });
      if (!res.ok) throw new Error('Failed to update goal');

      showToast('Goal updated successfully!');
      setGoals(prev => prev.map(g => {
        if (g.id === editGoal.id) {
          return {
            ...g,
            name: editName.trim(),
            target_amount: targetMinor,
            current_amount: currMinor,
            target_date: editTargetDate,
            notes: editNotes,
            percent: targetMinor > 0 ? Math.min(100, Math.round((currMinor / targetMinor) * 100)) : 0,
            remainingAmount: Math.max(0, targetMinor - currMinor),
          };
        }
        return g;
      }));
      setEditGoal(null);
      triggerRefresh();
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      stopAsyncOp();
    }
  };

  const handleDeleteGoal = (id: string, name: string) => {
    setGoalToDelete({ id, name });
  };

  const confirmDeleteGoal = async () => {
    if (!goalToDelete) return;
    setDeletingGoal(true);
    startAsyncOp();
    try {
      const res = await fetch(`/api/goals?id=${goalToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setGoals(prev => prev.filter(g => g.id !== goalToDelete.id));
      showToast(`Goal "${goalToDelete.name}" deleted`);
      triggerRefresh();
      loadData();
    } catch {
      showToast('Failed to delete goal', 'error');
    } finally {
      setDeletingGoal(false);
      setGoalToDelete(null);
      stopAsyncOp();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Savings Goals</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Plan major milestones, contribute directly from your accounts, and track your progress.
          </p>
        </div>

        <button className="btn-primary" onClick={() => setIsOpen(true)}>
          <Plus size={16} /> New Goal
        </button>
      </div>

      {/* Goals Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {goals.map(g => (
          <div key={g.id} className="card card-interactive" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{g.name}</div>
                {g.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{g.notes}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  className="btn-icon"
                  onClick={() => openEditModal(g)}
                  title="Edit Goal & Opening Balance"
                  style={{ padding: '4px', color: 'var(--text-muted)' }}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  className="btn-icon"
                  onClick={() => handleDeleteGoal(g.id, g.name)}
                  title="Delete Goal"
                  style={{ padding: '4px', color: 'var(--text-muted)' }}
                >
                  <Trash2 size={14} />
                </button>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: g.percent >= 100 ? 'var(--color-income)' : 'var(--brand-primary)',
                    backgroundColor: 'var(--bg-subtle)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  {g.percent}%
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                <MoneyDisplay amount={g.current_amount} size="lg" weight="bold" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Target: ₹{Math.round(g.target_amount / 100).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="progress-bar-bg" style={{ height: '8px' }}>
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${Math.min(g.percent, 100)}%`,
                    backgroundColor: g.percent >= 100 ? 'var(--color-income)' : 'var(--brand-primary)',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                backgroundColor: 'var(--bg-subtle)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.75rem',
              }}
            >
              <div>
                <div style={{ color: 'var(--text-muted)' }}>TARGET DATE</div>
                <div style={{ fontWeight: 600 }}>{formatDateDMY(g.target_date)}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>MONTHLY TARGET</div>
                <div style={{ fontWeight: 600 }}>
                  ₹{Math.round(g.calculatedMonthlyTarget / 100).toLocaleString('en-IN')}/mo
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-default)', paddingTop: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Remaining: ₹{Math.max(0, Math.round((g.target_amount - g.current_amount) / 100)).toLocaleString('en-IN')}
              </span>
              <button
                className="btn-primary"
                onClick={() => {
                  setContributeGoal(g);
                  setContribStr('');
                  const def = accounts.find(a => a.is_default) || accounts[0];
                  if (def) setSourceAccountId(def.id);
                }}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <ArrowDownLeft size={14} /> Contribute
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* New Goal Modal */}
      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Create Savings Goal</h2>
              <button className="btn-icon" onClick={() => setIsOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">GOAL NAME *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MacBook Pro, Emergency Fund, Bali Vacation"
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">TARGET AMOUNT (₹) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="1,50,000"
                    className="form-input"
                    value={targetAmountStr}
                    onChange={e => setTargetAmountStr(formatIndianNumberString(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">INITIAL SAVED (₹)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    className="form-input"
                    value={currentAmountStr}
                    onChange={e => setCurrentAmountStr(formatIndianNumberString(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">TARGET DATE *</label>
                <ModernDatePicker
                  value={targetDate}
                  onChange={setTargetDate}
                  placeholder="Select target date"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">NOTES</label>
                <input
                  type="text"
                  placeholder="Optional motivation or notes"
                  className="form-input"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Goal Modal */}
      {editGoal && (
        <div className="modal-overlay" onClick={() => setEditGoal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Edit Goal: {editGoal.name}</h2>
              <button className="btn-icon" onClick={() => setEditGoal(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">GOAL NAME *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">CURRENT / OPENING BALANCE (₹) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    className="form-input"
                    value={editCurrentAmountStr}
                    onChange={e => setEditCurrentAmountStr(formatIndianNumberString(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">TARGET AMOUNT (₹) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    className="form-input"
                    value={editTargetAmountStr}
                    onChange={e => setEditTargetAmountStr(formatIndianNumberString(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">TARGET DATE *</label>
                <ModernDatePicker
                  value={editTargetDate}
                  onChange={setEditTargetDate}
                  placeholder="Select target date"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">NOTES</label>
                <input
                  type="text"
                  className="form-input"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setEditGoal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribution Modal with Account Selector */}
      {contributeGoal && (
        <div className="modal-overlay" onClick={() => setContributeGoal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Contribute to {contributeGoal.name}</h2>
              <button className="btn-icon" onClick={() => setContributeGoal(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleContribute} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">CONTRIBUTION AMOUNT (₹) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  autoFocus
                  placeholder="e.g. 5,000"
                  className="form-input"
                  value={contribStr}
                  onChange={e => setContribStr(formatIndianNumberString(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">DEDUCT FROM ACCOUNT</label>
                <select
                  className="form-select"
                  value={sourceAccountId}
                  onChange={e => setSourceAccountId(e.target.value)}
                >
                  <option value="">Manual / Offline Cash (No account deduction)</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} {acc.is_default ? '★ (Default)' : ''} (₹{(acc.current_balance / 100).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.3 }}>
                  {sourceAccountId
                    ? '✓ Will automatically create a transaction and deduct this amount from the selected account.'
                    : '• Manual progress adjustment without creating a bank transaction.'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setContributeGoal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Contribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(goalToDelete)}
        title="Delete Savings Goal"
        message={`Are you sure you want to delete goal "${goalToDelete?.name}"?`}
        details="Your tracked progress toward this goal will be removed. Associated account balances and ledger transactions will remain intact."
        confirmText="Delete Goal"
        cancelText="Keep Goal"
        variant="danger"
        isLoading={deletingGoal}
        onConfirm={confirmDeleteGoal}
        onCancel={() => setGoalToDelete(null)}
      />
    </div>
  );
}

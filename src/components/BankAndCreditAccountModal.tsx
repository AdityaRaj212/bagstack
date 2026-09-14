'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Landmark, CreditCard, Wallet, TrendingUp, ShieldCheck, X, Star } from 'lucide-react';

interface BankAndCreditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  accountToEdit?: any | null;
}

export const BankAndCreditAccountModal: React.FC<BankAndCreditAccountModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accountToEdit,
}) => {
  const { showToast, triggerRefresh } = useApp();

  const [accountType, setAccountType] = useState('savings');
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [openingBalanceStr, setOpeningBalanceStr] = useState('0');
  const [creditLimitStr, setCreditLimitStr] = useState('0');
  const [billingCycleDay, setBillingCycleDay] = useState('1');
  const [dueDateDay, setDueDateDay] = useState('20');
  const [color, setColor] = useState('#4f46e5');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pre-fill when editing
  React.useEffect(() => {
    if (accountToEdit) {
      setName(accountToEdit.name || '');
      setAccountType(accountToEdit.type || 'savings');
      setInstitution(accountToEdit.institution || '');
      setCurrency(accountToEdit.currency || 'INR');
      setColor(accountToEdit.color || '#4f46e5');
      setCreditLimitStr(accountToEdit.creditLimit ? (accountToEdit.creditLimit / 100).toString() : '0');
      setIsDefault(Boolean(accountToEdit.isDefault));
      setOpeningBalanceStr(accountToEdit.openingBalance ? (accountToEdit.openingBalance / 100).toString() : '0');
    } else {
      setName('');
      setInstitution('');
      setAccountType('savings');
      setCurrency('INR');
      setColor('#4f46e5');
      setOpeningBalanceStr('0');
      setCreditLimitStr('0');
      setIsDefault(false);
    }
  }, [accountToEdit, isOpen]);

  const colorOptions = [
    '#4f46e5', // Indigo
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#EC4899', // Pink
    '#64748B', // Slate
  ];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter an account name', 'error');
      return;
    }

    const openingPaise = Math.round((parseFloat(openingBalanceStr) || 0) * 100);
    const limitPaise = accountType === 'credit_card' ? Math.round((parseFloat(creditLimitStr) || 0) * 100) : 0;

    setLoading(true);
    try {
      if (accountToEdit) {
        // Edit / Rename existing account
        const res = await fetch('/api/accounts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: accountToEdit.id,
            name: name.trim(),
            institution: institution.trim(),
            type: accountType,
            color,
            creditLimit: limitPaise,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        // If toggled default
        if (isDefault && !accountToEdit.isDefault) {
          await fetch('/api/accounts', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'set_default', accountId: accountToEdit.id }),
          });
        }

        showToast(`Account renamed to "${name.trim()}"!`);
      } else {
        // Create brand new account
        const res = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            institution: institution.trim(),
            type: accountType,
            currency,
            openingBalance: openingPaise,
            creditLimit: limitPaise,
            billingCycleDay: parseInt(billingCycleDay) || 1,
            dueDateDay: parseInt(dueDateDay) || 20,
            color,
            isDefault,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        showToast(`Account "${name}" created successfully!`);
      }

      triggerRefresh();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to save account', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isCard = accountType === 'credit_card';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '540px',
          width: '100%',
          padding: '1.75rem',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2), rgba(139, 92, 246, 0.2))',
                border: '1px solid var(--brand-primary)',
                color: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isCard ? (
                <CreditCard size={20} />
              ) : accountType === 'cash' ? (
                <Wallet size={20} />
              ) : accountType === 'investment' ? (
                <TrendingUp size={20} />
              ) : (
                <Landmark size={20} />
              )}
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                {accountToEdit ? 'Edit & Rename Account' : 'Add Financial Account'}
              </h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {accountToEdit ? `Updating details for ${accountToEdit.name}` : 'Bank account, physical cash, investment book, or credit card'}
              </div>
            </div>
          </div>

          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {/* Account Type Pills */}
          <div>
            <label className="form-label">ACCOUNT TYPE *</label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.375rem',
                backgroundColor: 'var(--bg-subtle)',
                padding: '0.25rem',
                borderRadius: 'var(--radius-md)',
              }}
            >
              {[
                { id: 'savings', label: 'Savings' },
                { id: 'current', label: 'Current' },
                { id: 'credit_card', label: 'Credit Card' },
                { id: 'cash', label: 'Cash' },
                { id: 'investment', label: 'Demat / Invest' },
                { id: 'fixed_deposit', label: 'Fixed Deposit' },
                { id: 'bank', label: 'Other Bank' },
                { id: 'loan', label: 'Loan / Debt' },
              ].map(t => {
                const active = accountType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAccountType(t.id)}
                    style={{
                      padding: '0.45rem 0.25rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: active ? 600 : 500,
                      backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                      color: active ? 'var(--brand-primary)' : 'var(--text-secondary)',
                      boxShadow: active ? 'var(--shadow-sm)' : 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Name */}
          <div className="form-group">
            <label className="form-label">ACCOUNT NAME *</label>
            <input
              type="text"
              required
              autoFocus
              className="form-input"
              placeholder="e.g. HDFC Salary, SBI Savings, Amex Gold, Physical Cash"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Institution & Currency */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">FINANCIAL INSTITUTION</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. HDFC Bank, ICICI, Zerodha, Physical Cash"
                value={institution}
                onChange={e => setInstitution(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">BASE CURRENCY</label>
              <select
                className="form-select"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          {/* Balance & Limits */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                {isCard ? 'OUTSTANDING BALANCE (₹)' : 'OPENING BALANCE (₹)'}
              </label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                placeholder="0"
                value={openingBalanceStr}
                onChange={e => setOpeningBalanceStr(e.target.value)}
              />
            </div>

            {isCard && (
              <div className="form-group">
                <label className="form-label">TOTAL CREDIT LIMIT (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="form-input"
                  placeholder="e.g. 100000"
                  value={creditLimitStr}
                  onChange={e => setCreditLimitStr(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Credit Card Cycle Days */}
          {isCard && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">BILLING CYCLE DAY</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  className="form-input"
                  value={billingCycleDay}
                  onChange={e => setBillingCycleDay(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">PAYMENT DUE DAY</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  className="form-input"
                  value={dueDateDay}
                  onChange={e => setDueDateDay(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Color Picker */}
          <div className="form-group">
            <label className="form-label">COLOR ACCENT</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {colorOptions.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: color === c ? '2px solid #ffffff' : '1px solid var(--border-default)',
                    boxShadow: color === c ? '0 0 8px rgba(255,255,255,0.4)' : 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.1s ease',
                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Default Account Checkbox */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-subtle)',
              border: isDefault ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-default)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#F59E0B' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', color: isDefault ? '#F59E0B' : 'var(--text-primary)' }}>
                <Star size={13} fill={isDefault ? '#F59E0B' : 'none'} /> Set as default transaction account
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Preselects this account automatically in the Record Transaction modal.
              </span>
            </div>
          </label>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (accountToEdit ? 'Saving...' : 'Creating...') : (accountToEdit ? 'Save Changes' : 'Create Account')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { User, Plus, Check, X, Shield, ArrowRightCircle, Mail, DollarSign, Landmark, Star, Trash2, Pencil } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatIndianNumberString, parseIndianNumber } from '@/lib/amount-evaluator';

export const AccountModal = () => {
  const {
    isAccountModalOpen,
    closeAccountModal,
    currentUser,
    availableUsers,
    switchUser,
    registerUser,
    deleteUser,
    updateUserName,
  } = useApp();

  const [mode, setMode] = useState<'switch' | 'create'>('switch');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('INR');
  const [initialAccountName, setInitialAccountName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [isDefaultAccount, setIsDefaultAccount] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Profile renaming state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savingRename, setSavingRename] = useState(false);

  // Profile deletion state
  const [profileToDelete, setProfileToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingProfile, setDeletingProfile] = useState(false);

  if (!isAccountModalOpen) return null;

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    const balanceNum = initialBalance ? parseIndianNumber(initialBalance) : undefined;
    const success = await registerUser({
      name: name.trim(),
      email: email.trim() || currentUser?.email || 'aditya@finance.local',
      baseCurrency,
      initialAccountName: initialAccountName.trim() || undefined,
      initialBalance: balanceNum,
    });

    setSubmitting(false);
    if (success) {
      setName('');
      setEmail('');
      setInitialAccountName('');
      setInitialBalance('');
      setMode('switch');
    }
  };

  const getInitials = (userName?: string) => {
    if (!userName) return 'U';
    const parts = userName.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return userName.substring(0, 2).toUpperCase();
  };

  return (
    <div className="modal-overlay" onClick={closeAccountModal}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '540px',
          width: '100%',
          padding: '1.75rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-modal)',
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
                boxShadow: '0 0 16px rgba(79, 70, 229, 0.2)',
              }}
            >
              <User size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                Workspaces & Profiles
              </h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {currentUser?.email ? `Workspaces for ${currentUser.email}` : 'Isolated financial workspaces'}
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={closeAccountModal} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Mode Toggle Tabs */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.25rem',
            marginBottom: '1.5rem',
            gap: '0.25rem',
            border: '1px solid var(--border-default)',
          }}
        >
          <button
            type="button"
            onClick={() => setMode('switch')}
            style={{
              flex: 1,
              padding: '0.55rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: mode === 'switch' ? 600 : 500,
              backgroundColor: mode === 'switch' ? 'var(--bg-surface)' : 'transparent',
              color: mode === 'switch' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: mode === 'switch' ? 'var(--shadow-sm)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
          >
            Switch Profile ({availableUsers.length})
          </button>
          <button
            type="button"
            onClick={() => setMode('create')}
            style={{
              flex: 1,
              padding: '0.55rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: mode === 'create' ? 600 : 500,
              backgroundColor: mode === 'create' ? 'var(--bg-surface)' : 'transparent',
              color: mode === 'create' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: mode === 'create' ? 'var(--shadow-sm)' : 'none',
              transition: 'all var(--transition-fast)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
            }}
          >
            <Plus size={15} /> Create New Profile
          </button>
        </div>

        {mode === 'switch' ? (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Select Active Workspace
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {availableUsers.map(u => {
                const isActive = currentUser?.id === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => {
                      if (!isActive) switchUser(u.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isActive ? 'var(--brand-light)' : 'var(--bg-subtle)',
                      border: `1px solid ${isActive ? 'var(--brand-primary)' : 'var(--border-default)'}`,
                      cursor: isActive ? 'default' : 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                    className={isActive ? '' : 'card-interactive'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: isActive ? 'var(--brand-primary)' : 'var(--bg-surface-elevated)',
                          color: isActive ? '#ffffff' : 'var(--text-primary)',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid var(--border-strong)',
                        }}
                      >
                        {getInitials(u.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {editingUserId === u.id ? (
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (!editingName.trim() || savingRename) return;
                                  setSavingRename(true);
                                  await updateUserName(u.id, editingName.trim());
                                  setSavingRename(false);
                                  setEditingUserId(null);
                                } else if (e.key === 'Escape') {
                                  setEditingUserId(null);
                                }
                              }}
                              autoFocus
                              style={{
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.85rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-focus)',
                                backgroundColor: 'var(--bg-surface)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                width: '150px',
                              }}
                            />
                            <button
                              type="button"
                              className="btn-icon"
                              disabled={savingRename}
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!editingName.trim() || savingRename) return;
                                setSavingRename(true);
                                await updateUserName(u.id, editingName.trim());
                                setSavingRename(false);
                                setEditingUserId(null);
                              }}
                              style={{ color: 'var(--color-income)', padding: '4px' }}
                              title="Save name"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingUserId(null);
                              }}
                              style={{ color: 'var(--text-muted)', padding: '4px' }}
                              title="Cancel"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
                            <span>{u.name}</span>
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingUserId(u.id);
                                setEditingName(u.name);
                              }}
                              style={{ color: 'var(--text-muted)', padding: '3px' }}
                              title={`Rename "${u.name}"`}
                            >
                              <Pencil size={13} />
                            </button>
                            {u.id === 'user_default' && (
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  padding: '0.1rem 0.45rem',
                                  borderRadius: 'var(--radius-full)',
                                  backgroundColor: 'var(--bg-surface)',
                                  color: 'var(--text-muted)',
                                  border: '1px solid var(--border-default)',
                                  fontWeight: 500,
                                }}
                              >
                                Demo
                              </span>
                            )}
                          </div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {u.email} • {u.baseCurrency || 'INR'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {!isActive && u.id !== 'user_default' && (
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProfileToDelete({ id: u.id, name: u.name });
                          }}
                          style={{ color: 'var(--color-expense)', padding: '6px' }}
                          title={`Delete profile "${u.name}"`}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}

                      {isActive ? (
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--brand-primary)',
                            backgroundColor: 'var(--bg-surface)',
                            padding: '0.25rem 0.7rem',
                            borderRadius: 'var(--radius-full)',
                            border: '1px solid var(--border-default)',
                          }}
                        >
                          <Check size={14} /> Active
                        </span>
                      ) : (
                        <button
                          className="btn-ghost"
                          style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            switchUser(u.id);
                          }}
                        >
                          Switch <ArrowRightCircle size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <Shield size={14} /> Complete data isolation per account
              </div>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                onClick={() => setMode('create')}
              >
                <Plus size={14} /> Add Another Profile
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {currentUser?.email && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.8rem',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Account: </span>
                <strong style={{ color: 'var(--text-primary)' }}>{currentUser.email}</strong>
                <div style={{ fontSize: '0.72rem', color: 'var(--brand-primary)', marginTop: '2px' }}>
                  This new profile will be securely bound to your verified email.
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="user-name">
                <User size={13} /> WORKSPACE / PROFILE NAME *
              </label>
              <input
                id="user-name"
                className="form-input"
                type="text"
                required
                placeholder="e.g. Personal, Freelance Business, Family Budget"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="user-currency">
                <DollarSign size={13} /> Base Currency
              </label>
              <select
                id="user-currency"
                className="form-select"
                value={baseCurrency}
                onChange={e => setBaseCurrency(e.target.value)}
              >
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="AED">AED (د.إ) - UAE Dirham</option>
                <option value="SGD">SGD ($) - Singapore Dollar</option>
                <option value="CAD">CAD ($) - Canadian Dollar</option>
                <option value="AUD">AUD ($) - Australian Dollar</option>
              </select>
            </div>

            {/* Optional Initial Account */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-default)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                <Landmark size={15} color="var(--brand-primary)" />
                Optional: Initial Bank or Cash Account
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Account Name</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="e.g. HDFC Salary"
                    value={initialAccountName}
                    onChange={e => setInitialAccountName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Opening Balance</label>
                  <input
                    className="form-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 50,000"
                    value={initialBalance}
                    onChange={e => setInitialBalance(formatIndianNumberString(e.target.value))}
                  />
                </div>
              </div>

              {initialAccountName.trim() && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', marginTop: '0.2rem' }}>
                  <input
                    type="checkbox"
                    checked={isDefaultAccount}
                    onChange={e => setIsDefaultAccount(e.target.checked)}
                    style={{ accentColor: 'var(--brand-primary)' }}
                  />
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Star size={13} color="var(--color-warning)" fill="var(--color-warning)" />
                    Set as default account for transactions
                  </span>
                </label>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setMode('switch')}
                disabled={submitting}
              >
                Back to Profiles
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || !name.trim()}
              >
                {submitting ? 'Creating...' : 'Create & Open Workspace'}
              </button>
            </div>
          </form>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(profileToDelete)}
        title="Delete Profile"
        message={`Are you sure you want to permanently delete profile "${profileToDelete?.name}"?`}
        details="All accounts, transactions, budgets, and savings goals linked to this profile will be permanently removed. This action cannot be undone."
        confirmText="Delete Profile"
        cancelText="Keep Profile"
        variant="danger"
        isLoading={deletingProfile}
        onConfirm={async () => {
          if (!profileToDelete) return;
          setDeletingProfile(true);
          await deleteUser(profileToDelete.id);
          setDeletingProfile(false);
          setProfileToDelete(null);
        }}
        onCancel={() => setProfileToDelete(null)}
      />
    </div>
  );
};

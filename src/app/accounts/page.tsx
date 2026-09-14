'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import {
  Plus,
  Landmark,
  CreditCard,
  Wallet,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  X,
  Scale,
  Star,
  Trash2,
  Pencil,
} from 'lucide-react';
import { BankAndCreditAccountModal } from '@/components/BankAndCreditAccountModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ModernDatePicker } from '@/components/ModernDatePicker';

export default function AccountsPage() {
  const { openTransactionModal, showToast, refreshKey, triggerRefresh } = useApp();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);

  // Deletion confirm state
  const [accountToDelete, setAccountToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Reconciliation Modal
  const [reconAccount, setReconAccount] = useState<any>(null);
  const [stmtDate, setStmtDate] = useState(new Date().toISOString().substring(0, 10));
  const [stmtBalanceStr, setStmtBalanceStr] = useState('');
  const [reconResult, setReconResult] = useState<any>(null);

  const fetchAccounts = () => {
    setLoading(true);
    fetch('/api/accounts')
      .then(r => r.json())
      .then(d => {
        setAccounts(d.accounts || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAccounts();
  }, [refreshKey]);

  const handleSetDefault = async (accId: string, accName: string) => {
    try {
      const res = await fetch('/api/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_default', accountId: accId }),
      });
      if (!res.ok) throw new Error();
      showToast(`"${accName}" set as default account`);
      triggerRefresh();
    } catch {
      showToast('Failed to set default account', 'error');
    }
  };

  const handleDeleteAccount = (id: string, name: string) => {
    setAccountToDelete({ id, name });
  };

  const confirmDeleteAccount = async () => {
    if (!accountToDelete) return;
    setDeletingAccount(true);
    try {
      const res = await fetch(`/api/accounts?id=${accountToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast(`Account "${accountToDelete.name}" deleted`);
      triggerRefresh();
    } catch {
      showToast('Failed to delete account', 'error');
    } finally {
      setDeletingAccount(false);
      setAccountToDelete(null);
    }
  };

  const handleReconcileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconAccount || !stmtBalanceStr) return;
    const stmtMinor = Math.round(parseFloat(stmtBalanceStr) * 100);

    try {
      const res = await fetch('/api/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: reconAccount.id,
          statementDate: stmtDate,
          statementBalance: stmtMinor,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReconResult(data);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Reconciliation failed', 'error');
    }
  };

  const assets = accounts.filter(a => !a.isLiability);
  const liabilities = accounts.filter(a => a.isLiability);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Financial Accounts</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Manage bank accounts, physical cash, investments, and credit cards.
            </p>
          </div>

          <button
            className="btn-primary"
            onClick={() => {
              setEditingAccount(null);
              setIsNewAccountModalOpen(true);
            }}
          >
            <Plus size={16} /> New Account
          </button>
        </div>

        {/* Assets Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Assets</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ({assets.length} accounts • Total: ₹
              {Math.round(
                assets.reduce((sum, a) => sum + (a.current_balance || 0), 0) / 100
              ).toLocaleString('en-IN')}
              )
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {assets.map(acc => {
              const isDefault = Boolean(acc.is_default);

              return (
                <div
                  key={acc.id}
                  className="card card-interactive"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.875rem',
                    border: isDefault ? '1px solid rgba(245, 158, 11, 0.4)' : undefined,
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: `${acc.color || 'var(--brand-primary)'}20`,
                          color: acc.color || 'var(--brand-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {acc.type === 'investment' ? (
                          <TrendingUp size={20} />
                        ) : acc.type === 'cash' ? (
                          <Wallet size={20} />
                        ) : (
                          <Landmark size={20} />
                        )}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{acc.name}</span>
                          {isDefault && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                padding: '2px 7px',
                                borderRadius: '12px',
                                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                color: '#F59E0B',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                              }}
                            >
                              <Star size={10} fill="#F59E0B" /> Default
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {acc.institution || acc.type} • {acc.currency || 'INR'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        className="btn-ghost"
                        onClick={() => {
                          setReconAccount(acc);
                          setStmtBalanceStr('');
                          setReconResult(null);
                        }}
                        title="Reconcile with bank statement"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
                      >
                        <Scale size={14} /> Reconcile
                      </button>

                      <button
                        className="btn-icon"
                        onClick={() => {
                          setEditingAccount(acc);
                          setIsNewAccountModalOpen(true);
                        }}
                        title="Edit / rename account"
                        style={{ color: 'var(--text-muted)', width: '28px', height: '28px' }}
                      >
                        <Pencil size={13} />
                      </button>

                      <button
                        className="btn-icon"
                        onClick={() => handleDeleteAccount(acc.id, acc.name)}
                        title="Delete account"
                        style={{ color: 'var(--text-muted)', width: '28px', height: '28px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Current Balance</div>
                    <MoneyDisplay amount={acc.current_balance} size="xl" weight="bold" />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid var(--border-default)',
                      paddingTop: '0.75rem',
                    }}
                  >
                    <div>
                      {!isDefault && (
                        <button
                          onClick={() => handleSetDefault(acc.id, acc.name)}
                          style={{
                            fontSize: '0.725rem',
                            color: 'var(--text-muted)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 4px',
                            borderRadius: 'var(--radius-sm)',
                          }}
                          title="Set as default transaction account"
                        >
                          <Star size={12} /> Set as default
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn-secondary"
                        onClick={() => openTransactionModal('expense', acc.id)}
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                      >
                        + Expense
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => openTransactionModal('income', acc.id)}
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                      >
                        + Income
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Liabilities & Credit Cards Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Liabilities & Credit Cards</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ({liabilities.length} accounts • Total Debt: ₹
              {Math.round(
                liabilities.reduce((sum, a) => sum + (a.current_balance || 0), 0) / 100
              ).toLocaleString('en-IN')}
              )
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {liabilities.map(card => {
              const isCard = card.type === 'credit_card';
              const isDefault = Boolean(card.is_default);
              const utilColor =
                card.utilizationRate > 70
                  ? 'var(--color-expense)'
                  : card.utilizationRate > 30
                  ? 'var(--color-warning)'
                  : 'var(--color-income)';

              return (
                <div
                  key={card.id}
                  className="card card-interactive"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.875rem',
                    border: isDefault ? '1px solid rgba(245, 158, 11, 0.4)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: `${card.color || 'var(--color-liability)'}20`,
                          color: card.color || 'var(--color-liability)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{card.name}</span>
                          {isDefault && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                padding: '2px 7px',
                                borderRadius: '12px',
                                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                color: '#F59E0B',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                              }}
                            >
                              <Star size={10} fill="#F59E0B" /> Default
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {card.institution || card.type}
                          {card.due_date_day && ` • Due on day ${card.due_date_day}`}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        className="btn-ghost"
                        onClick={() => openTransactionModal('transfer', undefined)}
                        title="Pay credit card bill"
                        style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', fontWeight: 600 }}
                      >
                        Pay Card
                      </button>

                      <button
                        className="btn-icon"
                        onClick={() => {
                          setEditingAccount(card);
                          setIsNewAccountModalOpen(true);
                        }}
                        title="Edit / rename account"
                        style={{ color: 'var(--text-muted)', width: '28px', height: '28px' }}
                      >
                        <Pencil size={13} />
                      </button>

                      <button
                        className="btn-icon"
                        onClick={() => handleDeleteAccount(card.id, card.name)}
                        title="Delete account"
                        style={{ color: 'var(--text-muted)', width: '28px', height: '28px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Outstanding Due</div>
                      <MoneyDisplay amount={card.current_balance} size="xl" weight="bold" colored />
                    </div>
                    {isCard && card.credit_limit > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available Limit</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                          ₹{Math.round(card.availableCredit / 100).toLocaleString('en-IN')}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Utilization % Bar */}
                  {isCard && card.credit_limit > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        <span>Credit Utilization</span>
                        <span style={{ fontWeight: 600, color: utilColor }}>{card.utilizationRate}%</span>
                      </div>
                      <div className="progress-bar-bg">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${card.utilizationRate}%`,
                            backgroundColor: utilColor,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid var(--border-default)',
                      paddingTop: '0.75rem',
                    }}
                  >
                    <div>
                      {!isDefault && (
                        <button
                          onClick={() => handleSetDefault(card.id, card.name)}
                          style={{
                            fontSize: '0.725rem',
                            color: 'var(--text-muted)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Set as default transaction account"
                        >
                          <Star size={12} /> Set as default
                        </button>
                      )}
                    </div>

                    <button
                      className="btn-secondary"
                      onClick={() => openTransactionModal('expense', card.id)}
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    >
                      + Record Card Expense
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reconciliation Modal */}
        {reconAccount && (
          <div className="modal-overlay" onClick={() => setReconAccount(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Reconcile {reconAccount.name}</h2>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Recorded Balance: ₹{Math.round(reconAccount.current_balance / 100).toLocaleString('en-IN')}
                  </div>
                </div>
                <button className="btn-icon" onClick={() => setReconAccount(null)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleReconcileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">STATEMENT DATE</label>
                  <ModernDatePicker
                    value={stmtDate}
                    onChange={setStmtDate}
                    placeholder="Select statement date"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">BANK STATEMENT ENDING BALANCE (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 84530.00"
                    className="form-input"
                    value={stmtBalanceStr}
                    onChange={e => setStmtBalanceStr(e.target.value)}
                  />
                </div>

                {reconResult && (
                  <div
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: reconResult.status === 'balanced' ? 'var(--color-income-subtle)' : 'var(--color-warning-subtle)',
                      border: `1px solid ${reconResult.status === 'balanced' ? 'var(--color-income)' : 'var(--color-warning)'}`,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {reconResult.status === 'balanced' ? (
                        <CheckCircle2 size={16} color="var(--color-income)" />
                      ) : (
                        <AlertCircle size={16} color="var(--color-warning)" />
                      )}
                      {reconResult.status === 'balanced' ? 'Balanced! No Discrepancy.' : 'Discrepancy Detected'}
                    </div>
                    {reconResult.difference !== 0 && (
                      <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        Discrepancy: ₹{Math.round(Math.abs(reconResult.difference) / 100).toLocaleString('en-IN')}{' '}
                        ({reconResult.difference > 0 ? 'Recorded is higher' : 'Statement is higher'})
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setReconAccount(null)}>
                    Close
                  </button>
                  <button type="submit" className="btn-primary">
                    Check & Save Reconciliation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Dedicated Bank and Credit Account Creation Modal */}
      <BankAndCreditAccountModal
        isOpen={isNewAccountModalOpen}
        onClose={() => {
          setIsNewAccountModalOpen(false);
          setEditingAccount(null);
        }}
        accountToEdit={editingAccount}
      />

      <ConfirmDialog
        isOpen={Boolean(accountToDelete)}
        title="Delete Account"
        message={`Are you sure you want to delete account "${accountToDelete?.name}"?`}
        details="All ledger transactions and history recorded under this account will also be permanently removed. This action cannot be undone."
        confirmText="Delete Account"
        cancelText="Keep Account"
        variant="danger"
        isLoading={deletingAccount}
        onConfirm={confirmDeleteAccount}
        onCancel={() => setAccountToDelete(null)}
      />
    </>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import {
  Plus,
  Repeat,
  Calendar,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  Check,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { ModernDatePicker } from '@/components/ModernDatePicker';
import { formatDateDMY } from '@/lib/date';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function SubscriptionsPage() {
  const { showToast, refreshKey, triggerRefresh } = useApp();
  const [data, setData] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Subscription Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [nextBillingDate, setNextBillingDate] = useState(new Date().toISOString().substring(0, 10));
  const [accountId, setAccountId] = useState('');
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [lastPaidDate, setLastPaidDate] = useState(new Date().toISOString().substring(0, 10));
  const [autoDeduct, setAutoDeduct] = useState(true);

  // Deletion confirm state
  const [subToDelete, setSubToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingSub, setDeletingSub] = useState(false);

  // "Mark as Paid" action state
  const [subToPay, setSubToPay] = useState<any | null>(null);
  const [payDate, setPayDate] = useState(new Date().toISOString().substring(0, 10));
  const [payAccountId, setPayAccountId] = useState('');
  const [processingPay, setProcessingPay] = useState(false);

  // "Pay Late" / Snooze action state
  const [subToSnooze, setSubToSnooze] = useState<any | null>(null);
  const [snoozeDate, setSnoozeDate] = useState('');
  const [processingSnooze, setProcessingSnooze] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/subscriptions')
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });

    fetch('/api/accounts')
      .then(r => r.json())
      .then(d => {
        const accs = d.accounts || [];
        setAccounts(accs);
        if (accs.length > 0 && !accountId) {
          setAccountId(accs[0].id);
        }
      });
  }, [refreshKey]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amountStr || !nextBillingDate || !accountId) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    const minor = Math.round(parseFloat(amountStr) * 100);
    if (isNaN(minor) || minor <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          amount: minor,
          billingFrequency: frequency,
          nextBillingDate,
          accountId,
          autoDeduct,
          alreadyPaid,
          lastPaidDate: alreadyPaid ? lastPaidDate : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create subscription');
      }

      showToast(
        alreadyPaid
          ? 'Subscription added and payment recorded in ledger!'
          : 'Subscription added successfully!'
      );
      setIsOpen(false);
      setName('');
      setAmountStr('');
      setAlreadyPaid(false);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const confirmDelete = async () => {
    if (!subToDelete) return;
    setDeletingSub(true);
    try {
      const res = await fetch(`/api/subscriptions?id=${subToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast(`Subscription "${subToDelete.name}" removed`);
      triggerRefresh();
    } catch {
      showToast('Failed to delete subscription', 'error');
    } finally {
      setDeletingSub(false);
      setSubToDelete(null);
    }
  };

  const handleMarkAsPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subToPay) return;
    setProcessingPay(true);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_payment',
          subscriptionId: subToPay.id,
          paidDate: payDate,
          accountId: payAccountId || subToPay.account_id,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to record payment');
      }

      showToast(`Payment recorded for "${subToPay.name}" and renewal date updated!`, 'success');
      setSubToPay(null);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setProcessingPay(false);
    }
  };

  const handleSnooze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subToSnooze || !snoozeDate) return;
    setProcessingSnooze(true);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'snooze',
          subscriptionId: subToSnooze.id,
          newNextBillingDate: snoozeDate,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to reschedule subscription');
      }

      showToast(`Renewal date for "${subToSnooze.name}" rescheduled to ${snoozeDate}`, 'success');
      setSubToSnooze(null);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setProcessingSnooze(false);
    }
  };

  const subs = data?.subscriptions || [];
  const monthlyTotal = data?.monthlyTotal || 0;
  const annualTotal = data?.annualTotal || 0;
  const todayStr = new Date().toISOString().substring(0, 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Subscriptions</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Manage recurring memberships, track auto-deductions, and schedule payments on your terms.
          </p>
        </div>

        <button className="btn-primary" onClick={() => setIsOpen(true)}>
          <Plus size={16} /> Add Subscription
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            MONTHLY SUBSCRIPTION COST
          </div>
          <MoneyDisplay amount={monthlyTotal} size="xl" weight="bold" />
        </div>
        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            ANNUALIZED SUBSCRIPTION COST
          </div>
          <MoneyDisplay amount={annualTotal} size="xl" weight="bold" />
        </div>
        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            ACTIVE SUBSCRIPTIONS
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {subs.length} Active
          </div>
        </div>
      </div>

      {/* Subscriptions Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.1rem' }}>
        {subs.map((s: any) => {
          const isDue = s.next_billing_date <= todayStr;
          const isPaid = s.payment_status === 'paid';

          return (
            <div
              key={s.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                border: isDue && !isPaid ? '1px solid rgba(245, 158, 11, 0.4)' : undefined,
                transition: 'all var(--transition-fast)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    Charged to <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{s.account_name}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button
                    className="btn-icon"
                    onClick={() => setSubToDelete({ id: s.id, name: s.name })}
                    style={{ color: 'var(--text-muted)', padding: '5px' }}
                    title="Delete subscription"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <MoneyDisplay amount={s.amount} size="lg" weight="bold" />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                    {s.billing_frequency}
                  </span>
                  {s.auto_deduct ? (
                    <span
                      title="Auto-deducts on due date"
                      style={{
                        fontSize: '0.68rem',
                        padding: '0.15rem 0.45rem',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--brand-light)',
                        color: 'var(--brand-primary)',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                      }}
                    >
                      <ShieldCheck size={12} /> Auto
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Status & Next Renewal Date */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.78rem',
                  borderTop: '1px solid var(--border-default)',
                  paddingTop: '0.65rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>Due: <strong style={{ color: 'var(--text-primary)' }}>{formatDateDMY(s.next_billing_date)}</strong></span>
                </div>

                {isPaid && s.last_paid_date ? (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'var(--color-income)',
                      backgroundColor: 'var(--color-income-subtle)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <CheckCircle2 size={12} /> Paid ({formatDateDMY(s.last_paid_date)})
                  </span>
                ) : isDue ? (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'var(--color-warning)',
                      backgroundColor: 'var(--color-warning-subtle)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <Clock size={12} /> Due for Payment
                  </span>
                ) : (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Upcoming
                  </span>
                )}
              </div>

              {/* Quick Actions: Mark Paid & Pay Late */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '0.25rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSubToPay(s);
                    setPayDate(s.next_billing_date || todayStr);
                    setPayAccountId(s.account_id);
                  }}
                  className="btn-ghost"
                  style={{
                    flex: 1,
                    fontSize: '0.75rem',
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--color-income)',
                    fontWeight: 600,
                    justifyContent: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <Check size={14} /> Mark as Paid
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSubToSnooze(s);
                    // Default snooze target +1 month or next week
                    setSnoozeDate(s.next_billing_date);
                  }}
                  className="btn-ghost"
                  style={{
                    flex: 1,
                    fontSize: '0.75rem',
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--color-warning)',
                    fontWeight: 600,
                    justifyContent: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <Clock size={14} /> Pay Late
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Subscription Modal */}
      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Add Subscription</h2>
              <button className="btn-icon" onClick={() => setIsOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  SERVICE NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Netflix, Spotify, iCloud, ChatGPT Plus"
                  className="input-field"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    AMOUNT (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    placeholder="649"
                    className="input-field"
                    value={amountStr}
                    onChange={e => setAmountStr(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    BILLING FREQUENCY
                  </label>
                  <select
                    className="input-field"
                    value={frequency}
                    onChange={e => setFrequency(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  NEXT BILLING DATE *
                </label>
                <ModernDatePicker
                  value={nextBillingDate}
                  onChange={setNextBillingDate}
                  placeholder="Select renewal date"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  CHARGED TO ACCOUNT *
                </label>
                <select
                  className="input-field"
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Already Paid Toggle */}
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={alreadyPaid}
                    onChange={e => setAlreadyPaid(e.target.checked)}
                    style={{ accentColor: 'var(--brand-primary)', width: '16px', height: '16px' }}
                  />
                  <span style={{ fontWeight: 500 }}>I have already paid for this current cycle</span>
                </label>

                {alreadyPaid && (
                  <div style={{ marginTop: '0.35rem', animation: 'fadeIn 150ms ease-out' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                      DATE ALREADY PAID
                    </label>
                    <ModernDatePicker
                      value={lastPaidDate}
                      onChange={setLastPaidDate}
                      placeholder="Date of payment"
                    />
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                      An expense transaction will be recorded in your account ledger on this date, and the next cycle date will be advanced automatically.
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* "Mark as Paid" Modal */}
      {subToPay && (
        <div className="modal-overlay" onClick={() => setSubToPay(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Mark as Paid</h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {subToPay.name} • <MoneyDisplay amount={subToPay.amount} size="sm" weight="bold" />
                </div>
              </div>
              <button className="btn-icon" onClick={() => setSubToPay(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleMarkAsPaid} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  PAYMENT DATE
                </label>
                <ModernDatePicker
                  value={payDate}
                  onChange={setPayDate}
                  placeholder="Select payment date"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  PAID FROM ACCOUNT
                </label>
                <select
                  value={payAccountId}
                  onChange={e => setPayAccountId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                Recording this payment will create an expense in your account ledger and automatically advance the renewal date to the next cycle.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setSubToPay(null)} disabled={processingPay}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={processingPay}>
                  {processingPay ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* "Pay Late" / Snooze Modal */}
      {subToSnooze && (
        <div className="modal-overlay" onClick={() => setSubToSnooze(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Pay Late / Reschedule</h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {subToSnooze.name}
                </div>
              </div>
              <button className="btn-icon" onClick={() => setSubToSnooze(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSnooze} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  NEW TARGET PAYMENT DATE
                </label>
                <ModernDatePicker
                  value={snoozeDate}
                  onChange={setSnoozeDate}
                  placeholder="Select new payment date"
                  required
                />
              </div>

              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                Postponing will update the renewal reminder without deducting money now, allowing you to pay when ready.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setSubToSnooze(null)} disabled={processingSnooze}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={processingSnooze || !snoozeDate}>
                  {processingSnooze ? 'Updating...' : 'Reschedule Date'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standard & Modern Warning Dialog before deleting a subscription */}
      <ConfirmDialog
        isOpen={Boolean(subToDelete)}
        title="Delete Subscription"
        message={`Are you sure you want to delete "${subToDelete?.name}"?`}
        details="Existing recorded payment transactions in your accounts will remain safely preserved in your ledger history, but future automatic deductions and reminders will stop."
        confirmText="Delete Subscription"
        cancelText="Keep Subscription"
        variant="danger"
        isLoading={deletingSub}
        onConfirm={confirmDelete}
        onCancel={() => setSubToDelete(null)}
      />
    </div>
  );
}

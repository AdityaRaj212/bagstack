'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { formatDateDMY } from '@/lib/date';
import {
  Plus,
  CreditCard,
  Calendar,
  Percent,
  ChevronDown,
  ChevronUp,
  X,
  ShoppingBag,
  Building2,
  CheckCircle2,
  ArrowRight,
  Wallet,
  Sparkles,
  Info,
} from 'lucide-react';
import { ModernDatePicker } from '@/components/ModernDatePicker';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function LoansPage() {
  const { showToast, refreshKey, triggerRefresh } = useApp();
  const [loans, setLoans] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [tabFilter, setTabFilter] = useState<'all' | 'emi' | 'loan'>('all');

  // Create Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [recordType, setRecordType] = useState<'emi' | 'loan'>('emi');
  const [name, setName] = useState('');
  const [principalStr, setPrincipalStr] = useState('');
  const [interestRateStr, setInterestRateStr] = useState('0');
  const [tenureMonthsStr, setTenureMonthsStr] = useState('6');
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');

  // Pay EMI Modal state
  const [payModalLoan, setPayModalLoan] = useState<any | null>(null);
  const [payAccountId, setPayAccountId] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().substring(0, 10));
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/loans')
      .then(r => r.json())
      .then(d => {
        setLoans(d.loans || []);
        setLoading(false);
      });

    fetch('/api/accounts')
      .then(r => r.json())
      .then(d => {
        setAccounts(d.accounts || []);
        if (d.accounts?.length > 0) {
          setAccountId(d.accounts[0].id);
          setPayAccountId(d.accounts[0].id);
        }
      });
  }, [refreshKey]);

  // Open Create Modal in specific mode
  const openCreateModal = (mode: 'emi' | 'loan') => {
    setRecordType(mode);
    setName('');
    setPrincipalStr('');
    setNotes('');
    setStartDate(new Date().toISOString().substring(0, 10));
    if (mode === 'emi') {
      setInterestRateStr('0');
      setTenureMonthsStr('6');
    } else {
      setInterestRateStr('8.5');
      setTenureMonthsStr('60');
    }
    setIsOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const principalMinor = Math.round(parseFloat(principalStr) * 100);
    const rate = parseFloat(interestRateStr) || 0;
    const tenure = parseInt(tenureMonthsStr, 10) || 12;

    if (isNaN(principalMinor) || principalMinor <= 0) {
      showToast('Please enter a valid amount greater than zero', 'error');
      return;
    }

    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          principal: principalMinor,
          interestRate: rate,
          tenureMonths: tenure,
          startDate,
          accountId,
          type: recordType,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record entry');
      }

      showToast(
        recordType === 'emi'
          ? 'Purchase EMI installment schedule recorded!'
          : 'Bank Loan added with full amortization schedule!'
      );
      setIsOpen(false);
      setName('');
      setPrincipalStr('');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Handle Recording an EMI Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalLoan) return;

    setPayLoading(true);
    try {
      const res = await fetch(`/api/loans/${payModalLoan.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: payAccountId,
          date: payDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      const emiFormatted = Math.round(payModalLoan.emi_amount / 100).toLocaleString('en-IN');
      showToast(`Installment of ₹${emiFormatted} recorded! Bank cash & liabilities updated.`);
      setPayModalLoan(null);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setPayLoading(false);
    }
  };

  const emiLoans = loans.filter(l => l.type === 'emi');
  const bankLoans = loans.filter(l => l.type !== 'emi');

  const filteredLoans = loans.filter(l => {
    if (tabFilter === 'emi') return l.type === 'emi';
    if (tabFilter === 'loan') return l.type !== 'emi';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Loans & EMIs</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Track product purchase installments (gadgets, appliances, no-cost EMIs) and bank loans with complete amortization.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            className="btn-secondary"
            onClick={() => openCreateModal('emi')}
            style={{
              borderColor: 'rgba(168, 85, 247, 0.4)',
              color: 'var(--text-primary)',
            }}
          >
            <ShoppingBag size={16} style={{ color: '#a855f7' }} />
            <span>Add Purchase EMI</span>
          </button>
          <button className="btn-primary" onClick={() => openCreateModal('loan')}>
            <Building2 size={16} />
            <span>Add Bank Loan</span>
          </button>
        </div>
      </div>

      {/* Segmented Filter Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-default)',
          paddingBottom: '0.5rem',
        }}
      >
        <button
          type="button"
          onClick={() => setTabFilter('all')}
          style={{
            fontSize: '0.875rem',
            padding: '0.4rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            backgroundColor: tabFilter === 'all' ? 'var(--brand-light)' : 'transparent',
            color: tabFilter === 'all' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            transition: 'all var(--transition-fast)',
          }}
        >
          All Items ({loans.length})
        </button>

        <button
          type="button"
          onClick={() => setTabFilter('emi')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.875rem',
            padding: '0.4rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            backgroundColor: tabFilter === 'emi' ? 'rgba(168, 85, 247, 0.12)' : 'transparent',
            color: tabFilter === 'emi' ? '#a855f7' : 'var(--text-secondary)',
            transition: 'all var(--transition-fast)',
          }}
        >
          <ShoppingBag size={15} />
          <span>Purchase EMIs ({emiLoans.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTabFilter('loan')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.875rem',
            padding: '0.4rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            backgroundColor: tabFilter === 'loan' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
            color: tabFilter === 'loan' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            transition: 'all var(--transition-fast)',
          }}
        >
          <Building2 size={15} />
          <span>Bank Loans ({bankLoans.length})</span>
        </button>
      </div>

      {/* Loans List */}
      {loading ? (
        <LoadingScreen compact message="Loading your loans & purchase EMI schedules..." />
      ) : filteredLoans.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {tabFilter === 'emi' ? <ShoppingBag size={28} /> : <CreditCard size={28} />}
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              {tabFilter === 'emi'
                ? 'No Purchase EMIs Tracked'
                : tabFilter === 'loan'
                ? 'No Bank Loans Tracked'
                : 'No Loans or EMIs Recorded'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto' }}>
              {tabFilter === 'emi'
                ? 'Record gadgets, phones, or appliances bought on card installments or No-Cost EMI to stay on top of monthly outflows.'
                : 'Keep track of home loans, car loans, or education debts with automatic principal and interest tracking.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button className="btn-secondary" onClick={() => openCreateModal('emi')}>
              <ShoppingBag size={15} style={{ color: '#a855f7' }} /> Add Purchase EMI
            </button>
            <button className="btn-primary" onClick={() => openCreateModal('loan')}>
              <Building2 size={15} /> Add Bank Loan
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredLoans.map(loan => {
            const isExpanded = expandedLoanId === loan.id;
            const amort = loan.amortization;
            const isEmi = loan.type === 'emi';
            const isFullyPaid = loan.outstanding_principal <= 0;

            return (
              <div key={loan.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isEmi ? 'rgba(168, 85, 247, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                        color: isEmi ? '#a855f7' : 'var(--brand-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isEmi ? <ShoppingBag size={22} /> : <Building2 size={22} />}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{loan.name}</span>
                        {/* Type Badge */}
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: isEmi ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: isEmi ? '#a855f7' : 'var(--brand-primary)',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {isEmi
                            ? loan.interest_rate === 0
                              ? '0% No-Cost EMI'
                              : 'Purchase Installment'
                            : 'Bank Loan'}
                        </span>
                        {isFullyPaid && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.5rem',
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              color: 'var(--color-income)',
                            }}
                          >
                            ✓ Fully Repaid
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Charged to <strong>{loan.account_name || 'Linked Account'}</strong> • Started {formatDateDMY(loan.start_date)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {!isFullyPaid && (
                      <button
                        className="btn-primary"
                        onClick={() => {
                          setPayModalLoan(loan);
                          if (loan.account_id) setPayAccountId(loan.account_id);
                          setPayDate(new Date().toISOString().substring(0, 10));
                        }}
                        style={{
                          fontSize: '0.78rem',
                          padding: '0.4rem 0.8rem',
                          backgroundColor: isEmi ? '#8b5cf6' : undefined,
                        }}
                      >
                        <Wallet size={14} /> Pay Installment (₹{Math.round(loan.emi_amount / 100).toLocaleString('en-IN')})
                      </button>
                    )}

                    <button
                      className="btn-secondary"
                      onClick={() => setExpandedLoanId(isExpanded ? null : loan.id)}
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      <span>{isExpanded ? 'Hide Schedule' : 'View Schedule'}</span>
                    </button>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '1rem',
                    backgroundColor: 'var(--bg-subtle)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                      {isEmi ? 'MONTHLY INSTALLMENT' : 'MONTHLY EMI'}
                    </div>
                    <MoneyDisplay amount={loan.emi_amount} size="lg" weight="bold" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                      {isEmi ? 'REMAINING BALANCE' : 'OUTSTANDING PRINCIPAL'}
                    </div>
                    <MoneyDisplay amount={loan.outstanding_principal} size="lg" weight="bold" colored />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                      INTEREST RATE
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                      {loan.interest_rate === 0 ? '0% (No-Cost)' : `${loan.interest_rate}% p.a.`}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                      {isEmi ? 'TOTAL TENURE' : 'LOAN TENURE'}
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{loan.tenure_months} Months</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                    <span>
                      Principal Repaid: ₹{Math.round(loan.paidPrincipal / 100).toLocaleString('en-IN')} of ₹
                      {Math.round(loan.principal / 100).toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--color-income)' }}>{loan.progressPercent}% Completed</span>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '8px' }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${loan.progressPercent}%`,
                        backgroundColor: 'var(--color-income)',
                      }}
                    />
                  </div>
                </div>

                {/* Expanded Amortization Schedule */}
                {isExpanded && amort && (
                  <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '1rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                      {isEmi ? 'Installment Schedule Breakdown' : 'Monthly Amortization Schedule'}
                    </h4>
                    <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                            <th style={{ padding: '0.5rem 0.75rem' }}>Month</th>
                            <th style={{ padding: '0.5rem 0.75rem' }}>Date</th>
                            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Installment</th>
                            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Principal</th>
                            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Interest</th>
                            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Remaining Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {amort.schedule.map((row: any) => (
                            <tr key={row.monthNumber} style={{ borderBottom: '1px solid var(--border-default)' }}>
                              <td style={{ padding: '0.4rem 0.75rem' }}>#{row.monthNumber}</td>
                              <td style={{ padding: '0.4rem 0.75rem' }}>{row.paymentDate}</td>
                              <td style={{ padding: '0.4rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>
                                ₹{Math.round(row.emi / 100).toLocaleString('en-IN')}
                              </td>
                              <td style={{ padding: '0.4rem 0.75rem', textAlign: 'right', color: 'var(--color-income)' }}>
                                ₹{Math.round(row.principalComponent / 100).toLocaleString('en-IN')}
                              </td>
                              <td style={{ padding: '0.4rem 0.75rem', textAlign: 'right', color: 'var(--color-expense)' }}>
                                ₹{Math.round(row.interestComponent / 100).toLocaleString('en-IN')}
                              </td>
                              <td style={{ padding: '0.4rem 0.75rem', textAlign: 'right' }}>
                                ₹{Math.round(row.remainingPrincipal / 100).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Record Loan or Purchase EMI Modal */}
      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '520px', padding: '1.5rem', overflow: 'visible' }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  {recordType === 'emi' ? 'Record Purchase / Product EMI' : 'Record Bank Loan'}
                </h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  {recordType === 'emi'
                    ? 'Track gadgets, electronics, or appliances on 0% No-Cost or Card EMI.'
                    : 'Track mortgages, vehicle loans, or personal debts with interest schedules.'}
                </p>
              </div>
              <button className="btn-icon" onClick={() => setIsOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Segmented Mode Selector */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.375rem',
                backgroundColor: 'var(--bg-subtle)',
                padding: '0.25rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setRecordType('emi');
                  setInterestRateStr('0');
                  setTenureMonthsStr('6');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  backgroundColor: recordType === 'emi' ? 'var(--bg-surface)' : 'transparent',
                  color: recordType === 'emi' ? '#a855f7' : 'var(--text-muted)',
                  boxShadow: recordType === 'emi' ? 'var(--shadow-sm)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <ShoppingBag size={15} />
                <span>Product / Purchase EMI</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRecordType('loan');
                  setInterestRateStr('8.5');
                  setTenureMonthsStr('60');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  backgroundColor: recordType === 'loan' ? 'var(--bg-surface)' : 'transparent',
                  color: recordType === 'loan' ? 'var(--brand-primary)' : 'var(--text-muted)',
                  boxShadow: recordType === 'loan' ? 'var(--shadow-sm)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Building2 size={15} />
                <span>Bank Loan</span>
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  {recordType === 'emi' ? 'PRODUCT / PURCHASE NAME *' : 'LOAN PURPOSE / NAME *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={recordType === 'emi' ? 'e.g. MacBook Pro M3, iPhone 16 Pro, Sony 4K TV' : 'e.g. Home Loan, Car Loan, Education Loan'}
                  className="input-field"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    {recordType === 'emi' ? 'TOTAL PURCHASE PRICE (₹) *' : 'PRINCIPAL AMOUNT (₹) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder={recordType === 'emi' ? '85000' : '800000'}
                    className="input-field"
                    value={principalStr}
                    onChange={e => setPrincipalStr(e.target.value)}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      INTEREST RATE (% P.A.) *
                    </label>
                    {recordType === 'emi' && (
                      <span style={{ fontSize: '0.68rem', color: '#a855f7', fontWeight: 600 }}>0% for No-Cost</span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0"
                    className="input-field"
                    value={interestRateStr}
                    onChange={e => setInterestRateStr(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    TENURE (MONTHS) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder={recordType === 'emi' ? '6' : '60'}
                    className="input-field"
                    value={tenureMonthsStr}
                    onChange={e => setTenureMonthsStr(e.target.value)}
                  />
                  {/* Tenure presets */}
                  <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.35rem' }}>
                    {(recordType === 'emi' ? [3, 6, 9, 12] : [12, 36, 60, 120]).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setTenureMonthsStr(m.toString())}
                        style={{
                          fontSize: '0.68rem',
                          padding: '1px 5px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: tenureMonthsStr === m.toString() ? 'var(--brand-primary)' : 'var(--bg-subtle)',
                          color: tenureMonthsStr === m.toString() ? '#fff' : 'var(--text-muted)',
                          border: '1px solid var(--border-default)',
                          cursor: 'pointer',
                        }}
                      >
                        {m}M
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    {recordType === 'emi' ? 'FIRST EMI DATE *' : 'START DATE *'}
                  </label>
                  <ModernDatePicker
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Select start date"
                    align="right"
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  {recordType === 'emi' ? 'DEBIT CARD / ACCOUNT FOR MONTHLY EMI' : 'DEBIT ACCOUNT FOR EMIs'}
                </label>
                <select
                  className="input-field"
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ backgroundColor: recordType === 'emi' ? '#8b5cf6' : undefined }}
                >
                  {recordType === 'emi' ? 'Save Purchase EMI' : 'Calculate & Save Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay EMI Modal */}
      {payModalLoan && (
        <div className="modal-overlay" onClick={() => setPayModalLoan(null)}>
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '440px', padding: '1.5rem', overflow: 'visible' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    color: 'var(--color-income)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Record Installment Payment</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    {payModalLoan.name}
                  </p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setPayModalLoan(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Payment Summary Box */}
              <div
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>MONTHLY INSTALLMENT</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-expense)' }}>
                    ₹{Math.round(payModalLoan.emi_amount / 100).toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>OUTSTANDING AFTER</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    ₹{Math.max(0, Math.round((payModalLoan.outstanding_principal - payModalLoan.emi_amount) / 100)).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  PAY FROM ACCOUNT (LIQUID CASH) *
                </label>
                <select
                  className="input-field"
                  value={payAccountId}
                  onChange={e => setPayAccountId(e.target.value)}
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} (Balance: ₹{Math.round(a.current_balance / 100).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  This will record an expense transaction and automatically deduct ₹{Math.round(payModalLoan.emi_amount / 100).toLocaleString('en-IN')} from your liquid cash.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  PAYMENT DATE *
                </label>
                <ModernDatePicker
                  value={payDate}
                  onChange={setPayDate}
                  align="right"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setPayModalLoan(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={payLoading}>
                  {payLoading ? 'Recording...' : 'Confirm & Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

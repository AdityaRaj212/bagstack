'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { Plus, CreditCard, Calendar, Percent, ChevronDown, ChevronUp, X } from 'lucide-react';
import { ModernDatePicker } from '@/components/ModernDatePicker';

export default function LoansPage() {
  const { showToast, refreshKey, triggerRefresh } = useApp();
  const [loans, setLoans] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  // Modal
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [principalStr, setPrincipalStr] = useState('');
  const [interestRateStr, setInterestRateStr] = useState('8.5');
  const [tenureMonthsStr, setTenureMonthsStr] = useState('60');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [accountId, setAccountId] = useState('');

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
        if (d.accounts?.length > 0) setAccountId(d.accounts[0].id);
      });
  }, [refreshKey]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const principalMinor = Math.round(parseFloat(principalStr) * 100);
    const rate = parseFloat(interestRateStr) || 0;
    const tenure = parseInt(tenureMonthsStr, 10) || 12;

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
        }),
      });
      if (!res.ok) throw new Error('Failed to record loan');

      showToast('Loan added with amortization schedule!');
      setIsOpen(false);
      setName('');
      setPrincipalStr('');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Loans & EMIs</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Track outstanding liabilities, EMI amortization schedules, and principal vs interest breakdown.
          </p>
        </div>

        <button className="btn-primary" onClick={() => setIsOpen(true)}>
          <Plus size={16} /> Add Loan
        </button>
      </div>

      {/* Loans List */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading loan schedules...</div>
      ) : loans.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No loans or EMIs recorded.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {loans.map(loan => {
            const isExpanded = expandedLoanId === loan.id;
            const amort = loan.amortization;

            return (
              <div key={loan.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-expense-subtle)',
                        color: 'var(--color-expense)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{loan.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Linked to {loan.account_name} • Started {loan.start_date}
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn-secondary"
                    onClick={() => setExpandedLoanId(isExpanded ? null : loan.id)}
                    style={{ fontSize: '0.75rem' }}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <span>{isExpanded ? 'Hide Schedule' : 'View Amortization'}</span>
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '1rem',
                    backgroundColor: 'var(--bg-subtle)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MONTHLY EMI</div>
                    <MoneyDisplay amount={loan.emi_amount} size="lg" weight="bold" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OUTSTANDING PRINCIPAL</div>
                    <MoneyDisplay amount={loan.outstanding_principal} size="lg" weight="bold" colored />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>INTEREST RATE</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{loan.interest_rate}% p.a.</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TENURE</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{loan.tenure_months} Months</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                    <span>Principal Paid: ₹{Math.round(loan.paidPrincipal / 100).toLocaleString('en-IN')}</span>
                    <span style={{ fontWeight: 600 }}>{loan.progressPercent}% Repaid</span>
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
                      Monthly Amortization Schedule
                    </h4>
                    <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                            <th style={{ padding: '0.5rem 0.75rem' }}>Month</th>
                            <th style={{ padding: '0.5rem 0.75rem' }}>Date</th>
                            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>EMI</th>
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

      {/* Modal */}
      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Record Loan or EMI</h2>
              <button className="btn-icon" onClick={() => setIsOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  LOAN NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Home Loan, Car Loan, Education Loan"
                  className="input-field"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    PRINCIPAL AMOUNT (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="800000"
                    className="input-field"
                    value={principalStr}
                    onChange={e => setPrincipalStr(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    INTEREST RATE (% P.A.) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="8.5"
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
                    required
                    placeholder="60"
                    className="input-field"
                    value={tenureMonthsStr}
                    onChange={e => setTenureMonthsStr(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    START DATE *
                  </label>
                  <ModernDatePicker
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Select loan start date"
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  DEBIT ACCOUNT FOR EMIs
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
                <button type="submit" className="btn-primary">
                  Calculate & Save Loan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

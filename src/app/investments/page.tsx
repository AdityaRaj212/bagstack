'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { Plus, TrendingUp, TrendingDown, Layers, X, ShieldCheck } from 'lucide-react';

export default function InvestmentsPage() {
  const { showToast, refreshKey, triggerRefresh } = useApp();
  const [data, setData] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isOpen, setIsOpen] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState('stock');
  const [quantity, setQuantity] = useState('1');
  const [costBasisStr, setCostBasisStr] = useState('');
  const [currentPriceStr, setCurrentPriceStr] = useState('');
  const [accountId, setAccountId] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/investments')
      .then(r => r.json())
      .then(d => {
        setData(d);
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
    const costMinor = Math.round(parseFloat(costBasisStr) * 100);
    const priceMinor = Math.round(parseFloat(currentPriceStr) * 100);
    const qty = parseFloat(quantity) || 1;

    try {
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol.toUpperCase().trim(),
          name: name.trim(),
          assetType,
          quantity: qty,
          costBasis: costMinor,
          currentPrice: priceMinor,
          accountId,
        }),
      });
      if (!res.ok) throw new Error('Failed to create investment');

      showToast('Holding added to portfolio!');
      setIsOpen(false);
      setSymbol('');
      setName('');
      setCostBasisStr('');
      setCurrentPriceStr('');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const holdings = data?.holdings || [];
  const totalCurrentValue = data?.totalCurrentValue || 0;
  const totalCostBasis = data?.totalCostBasis || 0;
  const totalGain = data?.totalGain || 0;
  const totalReturnPercent = data?.totalReturnPercent || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Investments Portfolio</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Track equity, mutual funds, ETFs, fixed deposits, and unrealized returns.
          </p>
        </div>

        <button className="btn-primary" onClick={() => setIsOpen(true)}>
          <Plus size={16} /> Add Holding
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            PORTFOLIO VALUE
          </div>
          <MoneyDisplay amount={totalCurrentValue} size="xl" weight="bold" />
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            TOTAL INVESTED
          </div>
          <MoneyDisplay amount={totalCostBasis} size="xl" weight="bold" />
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            TOTAL UNREALIZED GAIN
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <MoneyDisplay amount={totalGain} size="xl" weight="bold" colored showSign />
            <span
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: totalReturnPercent >= 0 ? 'var(--color-income)' : 'var(--color-expense)',
              }}
            >
              ({totalReturnPercent > 0 ? `+${totalReturnPercent}` : totalReturnPercent}%)
            </span>
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading portfolio holdings...</div>
        ) : holdings.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No investment holdings tracked yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Asset / Symbol</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Qty</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Cost Basis</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Current Value</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Return</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((item: any) => {
                  const isPositive = item.unrealizedGain >= 0;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-default)' }} className="card-interactive">
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontWeight: 600 }}>{item.symbol}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.name}</div>
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span className="badge badge-neutral" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                          {item.asset_type}
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: 500 }}>
                        {item.quantity}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                        <MoneyDisplay amount={item.cost_basis} size="sm" />
                      </td>
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                        <MoneyDisplay amount={item.current_value} size="sm" weight="bold" />
                      </td>
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: isPositive ? 'var(--color-income)' : 'var(--color-expense)' }}>
                          {isPositive ? '+' : ''}₹{Math.round(item.unrealizedGain / 100).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: isPositive ? 'var(--color-income)' : 'var(--color-expense)' }}>
                          {item.returnPercent > 0 ? `+${item.returnPercent}` : item.returnPercent}%
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Add Portfolio Holding</h2>
              <button className="btn-icon" onClick={() => setIsOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    SYMBOL / TICKER *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NIFTYBEES, HDFCBANK"
                    className="input-field"
                    value={symbol}
                    onChange={e => setSymbol(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    ASSET TYPE
                  </label>
                  <select
                    className="input-field"
                    value={assetType}
                    onChange={e => setAssetType(e.target.value)}
                  >
                    <option value="etf">ETF</option>
                    <option value="stock">Stock / Equity</option>
                    <option value="mutual_fund">Mutual Fund</option>
                    <option value="gold">Gold</option>
                    <option value="fd">Fixed Deposit</option>
                    <option value="crypto">Crypto</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  SECURITY NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nippon India Nifty 50 ETF"
                  className="input-field"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    QUANTITY *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="input-field"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    COST BASIS (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="Total invested"
                    className="input-field"
                    value={costBasisStr}
                    onChange={e => setCostBasisStr(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    PRICE/UNIT (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="Current price"
                    className="input-field"
                    value={currentPriceStr}
                    onChange={e => setCurrentPriceStr(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  HELD IN ACCOUNT
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
                  Add Holding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

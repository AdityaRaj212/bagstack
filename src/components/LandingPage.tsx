'use client';

import React from 'react';
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Scale,
  Target,
  Clock,
  Lock,
  BarChart3,
} from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: () => void;
  onEnterDemo: () => void;
}

// Illustrative sample values for the preview; not user data.
const SAMPLE_NET_WORTH = [
  { m: 'May', v: 302000 },
  { m: 'Jun', v: 324500 },
  { m: 'Jul', v: 341800 },
  { m: 'Aug', v: 370200 },
  { m: 'Sep', v: 396250 },
  { m: 'Oct', v: 452500 },
];

const PILLARS = [
  {
    icon: BarChart3,
    color: 'var(--cat-1)',
    title: 'Deterministic Math Engine',
    body: 'Integer-based minor currency calculations completely eliminate floating-point rounding errors. Real net balance calculations match bank ledgers down to the exact paisa.',
  },
  {
    icon: Scale,
    color: 'var(--cat-2)',
    title: 'Bank Statement Reconciliation',
    body: 'Compare physical bank statements against your recorded ledger in seconds. Detect discrepancies, pending transactions, and interest charges with cryptographic verification.',
  },
  {
    icon: Target,
    color: 'var(--cat-3)',
    title: 'Savings Goals with Account Deductions',
    body: 'Set milestone targets, calculate monthly commitments, and deduct contributions directly from existing bank accounts so your ledger and analytics remain 100% synchronized.',
  },
  {
    icon: Clock,
    color: 'var(--cat-4)',
    title: '30 / 60 / 90-Day Liquidity Forecast',
    body: 'Mathematical cash flow simulations track upcoming salaries, rent obligations, loan EMIs, and recurring subscriptions to predict liquidity cliffs before they occur.',
  },
  {
    icon: Lock,
    color: 'var(--cat-5)',
    title: 'Passwordless Security via OTP',
    body: 'Instant sign in with 6-digit cryptographic codes sent to your unique email address from adityaraj212.work@gmail.com. No passwords to leak or memorize.',
  },
  {
    icon: ShieldCheck,
    color: 'var(--cat-6)',
    title: 'Zero Data Lock-In',
    body: 'You own your data completely. One-click instant export of your entire ledger and profile structure into clean CSV and JSON backups anytime.',
  },
];

const inr = (rupees: number) => `₹${rupees.toLocaleString('en-IN')}`;

function PreviewChart() {
  const W = 640;
  const H = 170;
  const lo = 280000;
  const hi = 470000;
  const x = (i: number) => 4 + (i / (SAMPLE_NET_WORTH.length - 1)) * (W - 8);
  const y = (v: number) => 10 + (H - 34) - ((v - lo) / (hi - lo)) * (H - 34);
  const line = SAMPLE_NET_WORTH.map((t, i) => {
    if (i === 0) return `M${x(0)} ${y(t.v)}`;
    const cx = (x(i - 1) + x(i)) / 2;
    return `C${cx} ${y(SAMPLE_NET_WORTH[i - 1].v)} ${cx} ${y(t.v)} ${x(i)} ${y(t.v)}`;
  }).join(' ');
  const last = SAMPLE_NET_WORTH.length - 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', marginTop: '0.75rem' }} aria-hidden="true">
      <defs>
        <linearGradient id="lp-nw" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--brand-primary)" stopOpacity="0.32" />
          <stop offset="1" stopColor="var(--brand-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="4" x2={W - 4} y1={H - 24} y2={H - 24} stroke="var(--border-default)" />
      <path d={`${line} L${x(last)} ${H - 24} L${x(0)} ${H - 24} Z`} fill="url(#lp-nw)" className="chart-fade" />
      <path d={line} fill="none" stroke="var(--brand-primary)" strokeWidth="2.5" strokeLinecap="round" pathLength={1} className="chart-draw" />
      <circle cx={x(last)} cy={y(SAMPLE_NET_WORTH[last].v)} r="4.5" fill="var(--brand-primary)" stroke="var(--bg-surface)" strokeWidth="2.5" />
      {SAMPLE_NET_WORTH.map((t, i) => (
        <text key={t.m} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'} fontSize="11" fill="var(--text-muted)">
          {t.m}
        </text>
      ))}
    </svg>
  );
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth, onEnterDemo }) => {
  return (
    <div className="landing">
      {/* Top Navigation Bar */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="brand-lockup" style={{ margin: 0, padding: 0 }}>
            <span className="brand-mark" aria-hidden="true">
              <Layers size={16} strokeWidth={2.25} />
            </span>
            <span className="brand-name">Bagstack</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button type="button" className="btn-ghost landing-nav-demo" onClick={onEnterDemo}>
              Try Live Demo
            </button>
            <button type="button" className="btn-primary" onClick={onOpenAuth}>
              Sign In <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero: claim on the left, the product itself on the right */}
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <h1 className="landing-title">Take sovereign control of your wealth with deterministic precision.</h1>
          <p className="landing-lede">
            Zero tracking ads. Zero data broker scrapers. Complete manual ledger control, bank statement reconciliation,
            multi-account cash flow velocity, and 90-day liquidity forecasting.
          </p>
          <div className="landing-ctas">
            <button type="button" className="btn-primary landing-cta" onClick={onOpenAuth}>
              Get Started with Email OTP <ArrowRight size={18} />
            </button>
            <button type="button" className="btn-secondary landing-cta" onClick={onEnterDemo}>
              <Zap size={16} style={{ color: 'var(--color-warning)' }} /> Launch Live Demo Sandbox
            </button>
          </div>
        </div>

        {/* Product preview built from the app's own components (sample data) */}
        <div className="landing-preview">
          <div className="landing-preview-bar">
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Dashboard</span>
            <span className="badge badge-neutral" style={{ textTransform: 'none' }}>Sample data</span>
          </div>
          <div className="landing-preview-grid">
            <div className="card landing-preview-chart">
              <span className="card-label">Net worth</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.15rem' }}>
                <span className="kpi-value" style={{ fontSize: '1.75rem', marginTop: 0 }}>{inr(452500)}</span>
                <span className="kpi-delta" style={{ color: 'var(--color-income)', fontWeight: 600 }}>+14.2% from last month</span>
              </div>
              <PreviewChart />
            </div>
            <div className="card kpi-card">
              <span className="card-label">Monthly cash inflow</span>
              <span className="kpi-value" style={{ color: 'var(--color-income)' }}>+{inr(120000)}</span>
              <span className="kpi-delta" style={{ color: 'var(--text-muted)' }}>Verified direct deposit</span>
            </div>
            <div className="card kpi-card">
              <span className="card-label">Total expenses</span>
              <span className="kpi-value" style={{ color: 'var(--color-expense)' }}>−{inr(34800)}</span>
              <span className="kpi-delta" style={{ color: 'var(--text-muted)' }}>Savings rate: 71%</span>
            </div>
            <div className="card kpi-card">
              <span className="card-label">90-day forecast</span>
              <span className="kpi-value">{inr(685000)}</span>
              <span className="kpi-delta" style={{ color: 'var(--text-muted)' }}>Deterministic obligations</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature pillars */}
      <section className="landing-section">
        <h2 className="landing-h2">Built for Financial Sovereignty &amp; Speed</h2>
        <p className="landing-sub">Engineered from first principles without fragile API syncs or third-party tracking.</p>
        <div className="landing-pillars">
          {PILLARS.map(p => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="landing-pillar">
                <span className="landing-pillar-icon" style={{ color: p.color, backgroundColor: `color-mix(in srgb, ${p.color} 14%, transparent)` }}>
                  <Icon size={18} />
                </span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="landing-close">
        <h2 className="landing-h2">Ready to experience genuine financial clarity?</h2>
        <p className="landing-sub" style={{ marginBottom: '1.75rem' }}>
          Enter your email to verify your code and get immediate access to your command center.
        </p>
        <button type="button" className="btn-primary landing-cta" onClick={onOpenAuth}>
          Sign In with Email OTP <ArrowRight size={18} />
        </button>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Bagstack Financial Command Center</span>
          <span aria-hidden="true">·</span>
          <span>
            Contact:{' '}
            <a href="mailto:adityaraj212.work@gmail.com" style={{ color: 'var(--brand-primary)', textDecoration: 'underline' }}>
              adityaraj212.work@gmail.com
            </a>
          </span>
        </div>
        <p>Designed and engineered with deterministic rigor. All rights reserved.</p>
      </footer>
    </div>
  );
};

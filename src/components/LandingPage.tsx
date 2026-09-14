'use client';

import React from 'react';
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  Scale,
  Target,
  Clock,
  Lock,
  Mail,
  CheckCircle2,
  Sparkles,
  BarChart3,
  Calendar,
  Wallet,
} from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: () => void;
  onEnterDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenAuth,
  onEnterDemo,
}) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#090d16',
        color: '#f3f4f6',
        fontFamily: 'var(--font-sans)',
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      {/* Background Ambient Glows */}
      <div
        style={{
          position: 'absolute',
          top: '-120px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '500px',
          background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.05), transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Top Navigation Bar */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backdropFilter: 'blur(16px)',
          backgroundColor: 'rgba(9, 13, 22, 0.8)',
          borderBottom: '1px solid rgba(31, 41, 55, 0.6)',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4f46e5, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
            }}
          >
            <Layers size={20} />
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.03em', color: '#ffffff' }}>
              Ledgr
            </span>
          </div>
        </div>

        {/* Right CTA Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onEnterDemo}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#e5e7eb',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Try Live Demo
          </button>

          <button
            type="button"
            onClick={onOpenAuth}
            style={{
              padding: '0.5rem 1.15rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              border: '1px solid rgba(99, 102, 241, 0.5)',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            Sign In with OTP <ArrowRight size={15} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '4.5rem 1.5rem 3rem 1.5rem',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#a5b4fc',
            fontSize: '0.8125rem',
            fontWeight: 600,
            marginBottom: '1.75rem',
          }}
        >
          <Sparkles size={14} style={{ color: '#818cf8' }} />
          <span>Next-Generation Personal Financial Command Center</span>
        </div>

        {/* Main Headline */}
        <h1
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            marginBottom: '1.5rem',
            color: '#ffffff',
          }}
        >
          Take sovereign control of your wealth with{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #38bdf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            deterministic precision.
          </span>
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            color: '#9ca3af',
            maxWidth: '750px',
            margin: '0 auto 2.5rem auto',
            lineHeight: 1.6,
          }}
        >
          Zero tracking ads. Zero data broker scrapers. Complete manual ledger control, bank statement reconciliation, multi-account cash flow velocity, and 90-day liquidity forecasting.
        </p>

        {/* Hero CTAs */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3.5rem' }}>
          <button
            type="button"
            onClick={onOpenAuth}
            style={{
              padding: '0.85rem 1.75rem',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              border: 'none',
              color: '#ffffff',
              boxShadow: '0 8px 24px rgba(79, 70, 229, 0.4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'transform 0.15s ease',
            }}
          >
            Get Started with Email OTP <ArrowRight size={18} />
          </button>

          <button
            type="button"
            onClick={onEnterDemo}
            style={{
              padding: '0.85rem 1.5rem',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 600,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f3f4f6',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Zap size={16} style={{ color: '#f59e0b' }} /> Launch Live Demo Sandbox
          </button>
        </div>

        {/* Interactive Preview Mockup Showcase */}
        <div
          style={{
            borderRadius: '16px',
            border: '1px solid rgba(55, 65, 81, 0.6)',
            backgroundColor: 'rgba(17, 24, 39, 0.8)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
            padding: '1.5rem',
            textAlign: 'left',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Mockup Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(31, 41, 55, 0.8)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              <span style={{ marginLeft: '12px', fontSize: '0.8125rem', color: '#6b7280', fontFamily: 'monospace' }}>
                https://ledgr.app/command-center
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              Live Ledger Verified
            </span>
          </div>

          {/* Grid Preview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div style={{ backgroundColor: 'rgba(3, 7, 18, 0.6)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(31, 41, 55, 0.6)' }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>NET WORTH</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', margin: '4px 0' }}>₹4,52,500</div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>↑ +14.2% from last month</div>
            </div>

            <div style={{ backgroundColor: 'rgba(3, 7, 18, 0.6)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(31, 41, 55, 0.6)' }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MONTHLY CASH INFLOW</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>+₹1,20,000</div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Verified direct deposit</div>
            </div>

            <div style={{ backgroundColor: 'rgba(3, 7, 18, 0.6)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(31, 41, 55, 0.6)' }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL EXPENSES</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f43f5e', margin: '4px 0' }}>-₹34,800</div>
              <div style={{ fontSize: '0.75rem', color: '#60a5fa' }}>Savings rate: 71%</div>
            </div>

            <div style={{ backgroundColor: 'rgba(3, 7, 18, 0.6)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(31, 41, 55, 0.6)' }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>90-DAY FORECAST</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#818cf8', margin: '4px 0' }}>₹6,85,000</div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Deterministic obligations</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars Grid */}
      <section
        style={{
          maxWidth: '1100px',
          margin: '3rem auto 5rem auto',
          padding: '0 1.5rem',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff', marginBottom: '0.5rem' }}>
            Built for Financial Sovereignty & Speed
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>
            Engineered from first principles without fragile API syncs or third-party tracking.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Pillar 1 */}
          <div style={{ backgroundColor: 'rgba(17, 24, 39, 0.6)', border: '1px solid rgba(31, 41, 55, 0.8)', padding: '1.75rem', borderRadius: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <BarChart3 size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.5rem' }}>
              Deterministic Math Engine
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: 1.6 }}>
              Integer-based minor currency calculations completely eliminate floating-point rounding errors. Real net balance calculations match bank ledgers down to the exact paisa.
            </p>
          </div>

          {/* Pillar 2 */}
          <div style={{ backgroundColor: 'rgba(17, 24, 39, 0.6)', border: '1px solid rgba(31, 41, 55, 0.8)', padding: '1.75rem', borderRadius: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Scale size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.5rem' }}>
              Bank Statement Reconciliation
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: 1.6 }}>
              Compare physical bank statements against your recorded ledger in seconds. Detect discrepancies, pending transactions, and interest charges with cryptographic verification.
            </p>
          </div>

          {/* Pillar 3 */}
          <div style={{ backgroundColor: 'rgba(17, 24, 39, 0.6)', border: '1px solid rgba(31, 41, 55, 0.8)', padding: '1.75rem', borderRadius: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Target size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.5rem' }}>
              Savings Goals with Account Deductions
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: 1.6 }}>
              Set milestone targets, calculate monthly commitments, and deduct contributions directly from existing bank accounts so your ledger and analytics remain 100% synchronized.
            </p>
          </div>

          {/* Pillar 4 */}
          <div style={{ backgroundColor: 'rgba(17, 24, 39, 0.6)', border: '1px solid rgba(31, 41, 55, 0.8)', padding: '1.75rem', borderRadius: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Clock size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.5rem' }}>
              30 / 60 / 90-Day Liquidity Forecast
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: 1.6 }}>
              Mathematical cash flow simulations track upcoming salaries, rent obligations, loan EMIs, and recurring subscriptions to predict liquidity cliffs before they occur.
            </p>
          </div>

          {/* Pillar 5 */}
          <div style={{ backgroundColor: 'rgba(17, 24, 39, 0.6)', border: '1px solid rgba(31, 41, 55, 0.8)', padding: '1.75rem', borderRadius: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Lock size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.5rem' }}>
              Passwordless Security via OTP
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: 1.6 }}>
              Instant sign in with 6-digit cryptographic codes sent to your unique email address from <code>adityaraj212.work@gmail.com</code>. No passwords to leak or memorize.
            </p>
          </div>

          {/* Pillar 6 */}
          <div style={{ backgroundColor: 'rgba(17, 24, 39, 0.6)', border: '1px solid rgba(31, 41, 55, 0.8)', padding: '1.75rem', borderRadius: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <ShieldCheck size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.5rem' }}>
              Zero Data Lock-In
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: 1.6 }}>
              You own your data completely. One-click instant export of your entire ledger and profile structure into clean CSV and JSON backups anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section
        style={{
          maxWidth: '900px',
          margin: '0 auto 5rem auto',
          padding: '3rem 2rem',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.15), rgba(139, 92, 246, 0.15))',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
          Ready to experience genuine financial clarity?
        </h2>
        <p style={{ color: '#9ca3af', fontSize: '1rem', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem auto' }}>
          Enter your email to verify your code and get immediate access to your command center.
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          style={{
            padding: '0.9rem 2rem',
            borderRadius: '10px',
            fontSize: '1rem',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            border: 'none',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(79, 70, 229, 0.4)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          Sign In with Email OTP <ArrowRight size={18} />
        </button>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(31, 41, 55, 0.8)',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '0.8125rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: 600, color: '#9ca3af' }}>Ledgr Financial Command Center</span>
          <span>•</span>
          <span>Contact: <a href="mailto:adityaraj212.work@gmail.com" style={{ color: '#818cf8' }}>adityaraj212.work@gmail.com</a></span>
        </div>
        <p style={{ margin: 0 }}>
          Designed and engineered with deterministic rigor. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

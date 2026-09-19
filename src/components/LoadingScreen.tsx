'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, ShieldCheck, PieChart, Lightbulb, Wallet } from 'lucide-react';

export interface LoadingScreenProps {
  message?: string;
  compact?: boolean;
}

const FINANCIAL_FACTS = [
  {
    icon: Lightbulb,
    category: 'The Rule of 72',
    fact: 'Divide 72 by your expected annual interest rate to estimate how many years it will take for your money to double.',
  },
  {
    icon: PieChart,
    category: 'The 50/30/20 Rule',
    fact: 'A timeless budgeting balance: 50% for Needs, 30% for Wants, and 20% dedicated to Savings & Debt reduction.',
  },
  {
    icon: TrendingUp,
    category: 'Power of Compounding',
    fact: '"Compound interest is the eighth wonder of the world. He who understands it, earns it; he who doesn\'t, pays it."',
  },
  {
    icon: ShieldCheck,
    category: 'Emergency Cushion',
    fact: 'Maintaining 3 to 6 months of living expenses in liquid cash protects long-term investments from forced liquidations.',
  },
  {
    icon: Wallet,
    category: 'Pay Yourself First',
    fact: 'Automating your savings transfer on payday guarantees wealth accumulation before discretionary spending begins.',
  },
  {
    icon: TrendingUp,
    category: 'Fee Drag Impact',
    fact: 'A mere 1% reduction in annual investment management fees can save 20–30% of your total portfolio value over 30 years.',
  },
  {
    icon: PieChart,
    category: 'Rupee Cost Averaging',
    fact: 'Systematic investments (SIPs) automatically buy more units when market prices dip, smoothing out market volatility.',
  },
  {
    icon: Lightbulb,
    category: 'Inflation Reality',
    fact: 'At 6% annual inflation, ₹1,00,000 loses half its real purchasing power in just 12 years without yielding investments.',
  },
  {
    icon: Wallet,
    category: 'Micro-Expense Leaks',
    fact: 'An untracked ₹150 daily habit amounts to over ₹54,000 per year—investing that at 12% grows to ₹9.5 Lakhs in 10 years.',
  },
  {
    icon: ShieldCheck,
    category: 'Debt Snowball vs Avalanche',
    fact: 'Avalanche saves the most money by targeting high-interest debt first; Snowball builds psychological momentum by knocking out small balances.',
  },
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading your financial workspace...',
  compact = false,
}) => {
  const [factIndex, setFactIndex] = useState(0);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');

  useEffect(() => {
    // Pick a random starting fact
    setFactIndex(Math.floor(Math.random() * FINANCIAL_FACTS.length));

    const interval = setInterval(() => {
      setFadeState('out');
      setTimeout(() => {
        setFactIndex(prev => (prev + 1) % FINANCIAL_FACTS.length);
        setFadeState('in');
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const currentFact = FINANCIAL_FACTS[factIndex] || FINANCIAL_FACTS[0];
  const IconComponent = currentFact.icon;

  if (compact) {
    return (
      <div
        style={{
          padding: '2.5rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          textAlign: 'center',
        }}
      >
        {/* Animated Rings */}
        <div style={{ position: 'relative', width: '48px', height: '48px' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '3px solid rgba(99, 102, 241, 0.15)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '3px solid transparent',
              borderTopColor: 'var(--brand-primary)',
              borderRightColor: 'var(--brand-primary)',
              animation: 'spin 1s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--brand-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-primary)',
            }}
          >
            <Sparkles size={16} />
          </div>
        </div>

        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {message}
        </div>

        {/* Dynamic Fact Bubble */}
        <div
          style={{
            maxWidth: '380px',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.75rem 1rem',
            transition: 'opacity 300ms ease, transform 300ms ease',
            opacity: fadeState === 'in' ? 1 : 0,
            transform: fadeState === 'in' ? 'translateY(0)' : 'translateY(4px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--brand-primary)',
              marginBottom: '0.25rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <IconComponent size={12} />
            <span>{currentFact.category}</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
            {currentFact.fact}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-app)',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle Background Glow */}
      <div
        style={{
          position: 'absolute',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0) 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '440px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* Animated Brand Pulse Rings */}
        <div style={{ position: 'relative', width: '68px', height: '68px', marginBottom: '1.5rem' }}>
          <div
            style={{
              position: 'absolute',
              inset: '-6px',
              borderRadius: '50%',
              border: '2px solid rgba(99, 102, 241, 0.25)',
              animation: 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '3.5px solid rgba(99, 102, 241, 0.12)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '3.5px solid transparent',
              borderTopColor: 'var(--brand-primary)',
              borderRightColor: 'var(--brand-primary)',
              animation: 'spin 1.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '4px',
              borderRadius: '50%',
              border: '2px dashed rgba(99, 102, 241, 0.3)',
              animation: 'spinReverse 3s linear infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '9px',
              borderRadius: '50%',
              backgroundColor: 'var(--brand-primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 18px rgba(99, 102, 241, 0.45)',
              animation: 'pulseGlow 2s ease-in-out infinite',
            }}
          >
            <Sparkles size={22} />
          </div>
        </div>

        <h3
          style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            marginBottom: '0.4rem',
            color: 'var(--text-primary)',
          }}
        >
          {message}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2rem' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--brand-primary)',
              animation: 'pulse 1.5s infinite',
            }}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Synchronizing your ledger & insights</span>
        </div>

        {/* Fact Card */}
        <div
          style={{
            width: '100%',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.25rem 1.5rem',
            boxShadow: 'var(--shadow-md)',
            transition: 'opacity 300ms ease, transform 300ms ease',
            opacity: fadeState === 'in' ? 1 : 0,
            transform: fadeState === 'in' ? 'translateY(0)' : 'translateY(6px)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--brand-light)',
              color: 'var(--brand-primary)',
              marginBottom: '0.65rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <IconComponent size={13} />
            <span>{currentFact.category}</span>
          </div>

          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              margin: 0,
              lineHeight: 1.55,
              fontStyle: 'normal',
            }}
          >
            {currentFact.fact}
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '4px',
              marginTop: '1rem',
            }}
          >
            {FINANCIAL_FACTS.slice(0, 5).map((_, i) => (
              <div
                key={i}
                style={{
                  width: factIndex % 5 === i ? '16px' : '4px',
                  height: '4px',
                  borderRadius: '2px',
                  backgroundColor: factIndex % 5 === i ? 'var(--brand-primary)' : 'var(--border-default)',
                  transition: 'all 300ms ease',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Sidebar, MobileNavigation } from './Navigation';
import { AuthModal } from './AuthModal';
import { Lock, ArrowRight, Sparkles } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

import { LoadingScreen } from './LoadingScreen';

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const {
    isAuthenticated,
    isDemoMode,
    isAuthModalOpen,
    closeAuthModal,
    openAuthModal,
    enterDemoMode,
    logout,
    authChecked,
    isAsyncOperationRunning,
  } = useApp();

  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // While checking initial auth session
  if (!authChecked) {
    return <LoadingScreen message="Initializing your private ledger..." />;
  }

  // If on homepage and not authenticated: render full landing page directly without sidebar!
  if (pathname === '/' && !isAuthenticated) {
    return (
      <>
        {children}
        <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      </>
    );
  }

  // If on a subpage (e.g. /accounts, /transactions) while unauthenticated: prompt login
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', padding: '1.5rem' }}>
        <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '2rem', textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--brand-light)',
              color: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
            }}
          >
            <Lock size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Protected Financial Workspace
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Sign in with your email to access your private financial ledger, accounts, and reports.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              className="btn-primary"
              onClick={openAuthModal}
              style={{ width: '100%', padding: '0.75rem', justifyContent: 'center' }}
            >
              Sign In with Email OTP <ArrowRight size={16} />
            </button>
            <button
              className="btn-secondary"
              onClick={enterDemoMode}
              style={{ width: '100%', padding: '0.75rem', justifyContent: 'center' }}
            >
              <Sparkles size={15} style={{ color: 'var(--color-warning)' }} /> Continue in Demo Sandbox
            </button>
          </div>
        </div>
        <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      </div>
    );
  }

  // Authenticated: Render full application shell with Sidebar & Navigation
  return (
    <>
      {isAsyncOperationRunning && <div className="top-loading-bar" />}
      {isDemoMode && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderBottom: '1px solid var(--border-default)',
            minHeight: 'var(--demo-banner-h)',
            padding: '0.55rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'var(--color-warning-subtle)',
                color: 'var(--color-warning)',
                border: '1px solid color-mix(in srgb, var(--color-warning) 35%, transparent)',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '2px 9px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              <Sparkles size={12} /> Demo sandbox
            </span>
            <span className="demo-banner-desc" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              You are exploring Bagstack with preloaded sample data.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              onClick={() => setShowExitConfirm(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.78rem',
                padding: '0.35rem 0.75rem',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
              title="Leave demo and return to public homepage"
            >
              <span>← Exit Demo<span className="demo-banner-desc"> to Homepage</span></span>
            </button>

            <button
              onClick={openAuthModal}
              className="btn-primary"
              style={{
                fontSize: '0.78rem',
                padding: '0.35rem 0.85rem',
                fontWeight: 600,
              }}
            >
              <span>Sign In<span className="demo-banner-desc"> with Real Email</span></span>
            </button>
          </div>
        </div>
      )}

      <div className={`app-layout${isDemoMode ? ' has-demo-banner' : ''}`}>
        <Sidebar />
        <main className="main-content">{children}</main>
        <MobileNavigation />
      </div>
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />

      <ConfirmDialog
        isOpen={showExitConfirm}
        title="Exit Demo Sandbox"
        message="Are you sure you want to leave the demo sandbox and return to the homepage?"
        details="You will be returned to the Bagstack public homepage. You can re-enter demo mode anytime or sign in with your email."
        confirmText="Exit Demo"
        cancelText="Stay in Demo"
        variant="warning"
        onConfirm={async () => {
          setShowExitConfirm(false);
          await logout();
        }}
        onCancel={() => setShowExitConfirm(false)}
      />
    </>
  );
};

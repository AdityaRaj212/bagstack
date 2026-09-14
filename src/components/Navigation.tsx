'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard,
  Wallet,
  Landmark,
  PieChart,
  Target,
  Repeat,
  TrendingUp,
  CreditCard,
  BarChart3,
  Plus,
  Search,
  Sun,
  Moon,
  Database,
  Menu,
  X,
  Upload,
  Layers,
  Users,
  ChevronDown,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export const Sidebar = () => {
  const pathname = usePathname();
  const {
    theme,
    setTheme,
    currentUser,
    openTransactionModal,
    openCommandPalette,
    openImportModal,
    openAccountModal,
    showToast,
    triggerRefresh,
    logout,
    isDemoMode,
    openAuthModal,
  } = useApp();

  const [showSignoutConfirm, setShowSignoutConfirm] = useState(false);

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/transactions', label: 'Transactions', icon: Wallet },
    { href: '/accounts', label: 'Accounts', icon: Landmark },
    { href: '/budgets', label: 'Budgets', icon: PieChart },
    { href: '/goals', label: 'Goals', icon: Target },
    { href: '/subscriptions', label: 'Subscriptions', icon: Repeat },
    { href: '/investments', label: 'Investments', icon: TrendingUp },
    { href: '/loans', label: 'Loans & EMIs', icon: CreditCard },
    { href: '/reports', label: 'Analytics & Reports', icon: BarChart3 },
  ];

  const handleLoadDemo = async () => {
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      if (res.ok) {
        showToast('Demo dataset loaded with primary user journey!');
        triggerRefresh();
      }
    } catch {
      showToast('Failed to seed demo data', 'error');
    }
  };

  return (
    <aside
      style={{
        width: '260px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.25rem 1rem',
        zIndex: 20,
      }}
      className="desktop-sidebar"
    >
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', padding: '0 0.5rem' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--brand-primary), #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
            }}
          >
            <Layers size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Ledgr</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Financial Command Center</div>
          </div>
        </Link>
      </div>

      {/* Demo Mode Notice */}
      {isDemoMode && (
        <div
          style={{
            padding: '0.45rem 0.65rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
            fontSize: '0.74rem',
            color: '#d97706',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
            <Sparkles size={12} /> Demo Mode
          </span>
          <button
            onClick={openAuthModal}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--brand-primary)',
              fontWeight: 600,
              fontSize: '0.72rem',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Sign In
          </button>
        </div>
      )}

      {/* Active User Profile & Account Switcher */}
      <button
        type="button"
        onClick={openAccountModal}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '0.5rem 0.65rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-subtle)',
          border: '1px solid var(--border-default)',
          marginBottom: '0.9rem',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all var(--transition-fast)',
        }}
        className="card-interactive"
        title="Switch profile or create new account"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--brand-primary)',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'U'}
          </div>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {currentUser?.name || 'Demo User'}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>{currentUser?.baseCurrency || 'INR'}</span>
              <span>•</span>
              <span style={{ color: 'var(--brand-primary)', fontWeight: 500 }}>Switch / +New</span>
            </div>
          </div>
        </div>
        <ChevronDown size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
      </button>

      {/* Global Quick Action Button */}
      <button
        className="btn-primary"
        onClick={() => openTransactionModal('expense')}
        style={{
          width: '100%',
          marginBottom: '1rem',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.7rem',
          boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)',
        }}
      >
        <Plus size={16} /> Record Transaction
      </button>

      {/* Command Palette Trigger */}
      <button
        onClick={openCommandPalette}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 0.75rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-subtle)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-muted)',
          fontSize: '0.8rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={14} /> Search or Command
        </div>
        <kbd
          style={{
            fontSize: '0.7rem',
            backgroundColor: 'var(--bg-surface)',
            padding: '0.1rem 0.35rem',
            borderRadius: '4px',
            border: '1px solid var(--border-default)',
          }}
        >
          ⌘K
        </kbd>
      </button>

      {/* Nav Links */}
      <nav style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--brand-light)' : 'transparent',
                transition: 'all var(--transition-fast)',
              }}
              className="card-interactive"
            >
              <Icon size={18} color={isActive ? 'var(--brand-primary)' : 'currentColor'} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions: Theme, Demo Data, CSV Import */}
      <div
        style={{
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
        }}
      >
        <button
          className="btn-ghost"
          onClick={openImportModal}
          style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8rem' }}
        >
          <Upload size={15} /> Import Bank Statement
        </button>

        <button
          className="btn-ghost"
          onClick={handleLoadDemo}
          style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8rem' }}
        >
          <Database size={15} /> Load Demo Dataset
        </button>

        <button
          className="btn-ghost"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8rem' }}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {isDemoMode ? (
          <button
            className="btn-ghost"
            onClick={() => setShowSignoutConfirm(true)}
            style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600 }}
            title="Leave demo and return to homepage"
          >
            <LogOut size={15} />
            <span>Exit Demo (Homepage)</span>
          </button>
        ) : (
          <button
            className="btn-ghost"
            onClick={() => setShowSignoutConfirm(true)}
            style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8rem', color: 'var(--color-danger)' }}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        )}
      </div>

      <ConfirmDialog
        isOpen={showSignoutConfirm}
        title={isDemoMode ? 'Exit Demo Sandbox' : 'Sign Out'}
        message={isDemoMode ? 'Are you sure you want to exit the demo sandbox and return to the homepage?' : 'Are you sure you want to sign out of your account?'}
        details={isDemoMode ? 'You will be redirected back to the public homepage.' : 'Your active session will be ended on this device.'}
        confirmText={isDemoMode ? 'Exit Demo' : 'Sign Out'}
        cancelText="Cancel"
        variant="warning"
        onConfirm={async () => {
          setShowSignoutConfirm(false);
          await logout();
        }}
        onCancel={() => setShowSignoutConfirm(false)}
      />
    </aside>
  );
};

export const MobileNavigation = () => {
  const pathname = usePathname();
  const {
    openTransactionModal,
    openCommandPalette,
    openAccountModal,
    currentUser,
    logout,
    isDemoMode,
    openAuthModal,
  } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);
  const [showSignoutConfirm, setShowSignoutConfirm] = useState(false);

  const primaryTabs = [
    { href: '/', label: 'Home', icon: LayoutDashboard },
    { href: '/transactions', label: 'Txns', icon: Wallet },
    { href: '#action', label: 'Add', icon: Plus, isAction: true },
    { href: '/accounts', label: 'Accounts', icon: Landmark },
    { href: '#more', label: 'More', icon: Menu, isMore: true },
  ];

  const moreLinks = [
    { href: '/budgets', label: 'Budgets', icon: PieChart },
    { href: '/goals', label: 'Savings Goals', icon: Target },
    { href: '/subscriptions', label: 'Subscriptions', icon: Repeat },
    { href: '/investments', label: 'Investments', icon: TrendingUp },
    { href: '/loans', label: 'Loans & Debts', icon: CreditCard },
    { href: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
  ];

  return (
    <>
      {/* Mobile Drawer */}
      {moreOpen && (
        <div className="modal-overlay" onClick={() => setMoreOpen(false)} style={{ alignItems: 'flex-end', padding: 0 }}>
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              maxHeight: '75vh',
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600 }}>More Financial Tools</div>
              <button className="btn-icon" onClick={() => setMoreOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Mobile User Profile Button */}
            <button
              onClick={() => {
                setMoreOpen(false);
                openAccountModal();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                marginBottom: '1rem',
              }}
              className="card-interactive"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--brand-primary)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'U'}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{currentUser?.name || 'Demo User'}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tap to switch or create account</div>
                </div>
              </div>
              <ChevronDown size={16} color="var(--text-muted)" />
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {moreLinks.map(l => {
                const Icon = l.icon;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMoreOpen(false)}
                    className="card card-interactive"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '1rem',
                      textAlign: 'center',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <Icon size={22} color="var(--brand-primary)" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{l.label}</span>
                  </Link>
                );
              })}
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-default)' }}>
              {isDemoMode ? (
                <button
                  className="btn-primary"
                  onClick={() => {
                    setMoreOpen(false);
                    openAuthModal();
                  }}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Sparkles size={16} /> Sign In with Email
                </button>
              ) : (
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setMoreOpen(false);
                    setShowSignoutConfirm(true);
                  }}
                  style={{ width: '100%', justifyContent: 'center', color: 'var(--color-danger)' }}
                >
                  <LogOut size={16} /> Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Bar */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          height: '60px',
          zIndex: 40,
          boxShadow: 'var(--shadow-lg)',
        }}
        className="mobile-bottom-nav"
      >
        {primaryTabs.map(tab => {
          const Icon = tab.icon;
          if (tab.isAction) {
            return (
              <button
                key={tab.label}
                onClick={() => openTransactionModal('expense')}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--brand-primary)',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
                  transform: 'translateY(-12px)',
                }}
              >
                <Plus size={24} />
              </button>
            );
          }

          if (tab.isMore) {
            return (
              <button
                key={tab.label}
                onClick={() => setMoreOpen(prev => !prev)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary)',
                  padding: '0.25rem',
                }}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </button>
            );
          }

          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                fontSize: '0.7rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                padding: '0.25rem',
              }}
            >
              <Icon size={20} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      <ConfirmDialog
        isOpen={showSignoutConfirm}
        title={isDemoMode ? 'Exit Demo Sandbox' : 'Sign Out'}
        message={isDemoMode ? 'Are you sure you want to exit the demo sandbox and return to the homepage?' : 'Are you sure you want to sign out of your account?'}
        details={isDemoMode ? 'You will be redirected back to the public homepage.' : 'Your active session will be ended on this device.'}
        confirmText={isDemoMode ? 'Exit Demo' : 'Sign Out'}
        cancelText="Cancel"
        variant="warning"
        onConfirm={async () => {
          setShowSignoutConfirm(false);
          await logout();
        }}
        onCancel={() => setShowSignoutConfirm(false)}
      />
    </>
  );
};

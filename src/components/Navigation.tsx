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

  return (
    <aside className="desktop-sidebar app-sidebar">
      {/* Brand */}
      <Link href="/" className="brand-lockup">
        <span className="brand-mark" aria-hidden="true">
          <Layers size={16} strokeWidth={2.25} />
        </span>
        <span className="brand-name">Bagstack</span>
      </Link>

      {/* Active User Profile & Account Switcher */}
      <button
        type="button"
        onClick={openAccountModal}
        className="profile-switcher"
        title="Switch profile or create new account"
      >
        <span className="profile-avatar">
          {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'U'}
        </span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.25 }}>
            {currentUser?.name || 'Demo User'}
          </span>
          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {currentUser?.baseCurrency || 'INR'} · Switch profile
          </span>
        </span>
        <ChevronDown size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
      </button>

      {/* Global Quick Action Button */}
      <button
        className="btn-secondary"
        onClick={() => openTransactionModal('expense')}
        style={{ width: '100%', justifyContent: 'center', padding: '0.6rem', marginBottom: '0.75rem' }}
      >
        <Plus size={16} /> Record Transaction
      </button>

      {/* Command Palette Trigger */}
      <button
        type="button"
        className="sidebar-search"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openCommandPalette();
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={14} /> Search or jump to…
        </span>
        <kbd className="kbd">⌘K</kbd>
      </button>

      {/* Nav Links */}
      <nav className="sidebar-nav" aria-label="Primary">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link"
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={17} strokeWidth={isActive ? 2.25 : 2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions: Import, Theme, Sign out */}
      <div className="sidebar-footer">
        <button className="btn-ghost sidebar-footer-btn" onClick={openImportModal}>
          <Upload size={15} /> Import Bank Statement
        </button>

        <button
          className="btn-ghost sidebar-footer-btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {isDemoMode ? (
          <button
            className="btn-ghost sidebar-footer-btn"
            onClick={() => setShowSignoutConfirm(true)}
            style={{ color: 'var(--color-warning)', fontWeight: 600 }}
            title="Leave demo and return to homepage"
          >
            <LogOut size={15} />
            <span>Exit Demo (Homepage)</span>
          </button>
        ) : (
          <button
            className="btn-ghost sidebar-footer-btn"
            onClick={() => setShowSignoutConfirm(true)}
            style={{ color: 'var(--color-expense)' }}
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
                <div className="profile-avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
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
                  style={{ width: '100%', justifyContent: 'center', color: 'var(--color-expense)' }}
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
          borderTop: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          height: 'calc(62px + env(safe-area-inset-bottom))',
          paddingBottom: 'env(safe-area-inset-bottom)',
          zIndex: 40,
        }}
        className="mobile-bottom-nav mobile-tabbar"
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
                  backgroundColor: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-fg)',
                  boxShadow: 'var(--shadow-lg)',
                  transform: 'translateY(-10px)',
                  border: '3px solid var(--bg-app)',
                }}
                aria-label="Add transaction"
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

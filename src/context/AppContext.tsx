'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  undoAction?: () => Promise<void> | void;
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  baseCurrency: string;
}

interface AppContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  currentUser: UserSession | null;
  availableUsers: UserSession[];
  isAccountModalOpen: boolean;
  openAccountModal: () => void;
  closeAccountModal: () => void;
  switchUser: (userId: string) => Promise<boolean>;
  registerUser: (data: { name: string; email: string; baseCurrency?: string; initialAccountName?: string; initialBalance?: number }) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  updateUserName: (userId: string, name: string) => Promise<boolean>;
  isTransactionModalOpen: boolean;
  openTransactionModal: (initialType?: 'expense' | 'income' | 'transfer', accountId?: string, editingTransaction?: any) => void;
  closeTransactionModal: () => void;
  editingTransaction: any;
  isCommandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  isImportModalOpen: boolean;
  openImportModal: () => void;
  closeImportModal: () => void;
  transactionModalType: 'expense' | 'income' | 'transfer';
  preselectedAccountId?: string;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info', undoAction?: () => Promise<void> | void) => void;
  removeToast: (id: string) => void;
  // Authentication & Session
  isAuthenticated: boolean;
  isDemoMode: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  enterDemoMode: () => void;
  logout: () => Promise<void>;
  authChecked: boolean;
  refreshKey: number;
  triggerRefresh: () => void;
  isAsyncOperationRunning: boolean;
  startAsyncOp: () => void;
  stopAsyncOp: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

let toastCounter = 0;

function applyThemeToDOM(t: Theme) {
  let effective = t;
  if (t === 'system') {
    effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', effective);
}

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [availableUsers, setAvailableUsers] = useState<UserSession[]>([]);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionModalType, setTransactionModalType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [preselectedAccountId, setPreselectedAccountId] = useState<string | undefined>();
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [asyncOpCount, setAsyncOpCount] = useState(0);

  const startAsyncOp = useCallback(() => setAsyncOpCount(prev => prev + 1), []);
  const stopAsyncOp = useCallback(() => setAsyncOpCount(prev => Math.max(0, prev - 1)), []);

  const triggerRefresh = useCallback(() => setRefreshKey(prev => prev + 1), []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success', undoAction?: () => Promise<void> | void) => {
    toastCounter += 1;
    const id = `toast_${toastCounter}`;
    const newToast: Toast = { id, message, type, undoAction };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, undoAction ? 7000 : 4000);
  }, [removeToast]);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(Boolean(data.isAuthenticated));
        setIsDemoMode(Boolean(data.isDemo));
        if (data.user) {
          setCurrentUser(prev => (prev?.id === data.user.id && prev?.email === data.user.email ? prev : data.user));
        } else {
          setCurrentUser(null);
        }
      }
    } catch {
      // Fallback
    } finally {
      setAuthChecked(true);
    }
  }, []);

  const enterDemoMode = useCallback(async () => {
    document.cookie = 'apex_demo_mode=true; path=/; max-age=86400';
    setIsDemoMode(true);
    setIsAuthenticated(true);
    await checkAuth();
    triggerRefresh();
    showToast('Entered demo sandbox mode. Try out features freely!');
  }, [checkAuth, triggerRefresh, showToast]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    document.cookie = 'apex_demo_mode=false; path=/; max-age=0';
    document.cookie = 'apex_session_token=; path=/; max-age=0';
    document.cookie = 'finance_user_id=; path=/; max-age=0';
    setIsAuthenticated(false);
    setIsDemoMode(false);
    setCurrentUser(null);
    showToast('Logged out successfully');
    triggerRefresh();

    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.href = '/';
    }
  }, [showToast, triggerRefresh]);

  // Fetch users & check session
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(prev => prev || data.currentUser);
        setAvailableUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    fetchUsers();
  }, [checkAuth, fetchUsers, refreshKey]);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const saved = localStorage.getItem('fm_theme') as Theme | null;
    if (saved) {
      setThemeState(saved);
      applyThemeToDOM(saved);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = prefersDark ? 'dark' : 'light';
      setThemeState(initial);
      applyThemeToDOM(initial);
    }

    // Reactively listen to system color scheme changes if not explicitly overridden or if set to system
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e: MediaQueryListEvent) => {
      const current = localStorage.getItem('fm_theme') as Theme | null;
      if (!current || current === 'system') {
        applyThemeToDOM(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('fm_theme', newTheme);
    applyThemeToDOM(newTheme);
  }, []);

  const openTransactionModal = useCallback((type: 'expense' | 'income' | 'transfer' = 'expense', accountId?: string, editTx?: any) => {
    setTransactionModalType(type);
    setPreselectedAccountId(accountId);
    setEditingTransaction(editTx || null);
    setIsTransactionModalOpen(true);
  }, []);

  const closeTransactionModal = useCallback(() => {
    setIsTransactionModalOpen(false);
    setEditingTransaction(null);
  }, []);

  const openCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), []);
  const closeCommandPalette = useCallback(() => setIsCommandPaletteOpen(false), []);

  const openImportModal = useCallback(() => setIsImportModalOpen(true), []);
  const closeImportModal = useCallback(() => setIsImportModalOpen(false), []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // Cmd+K / Ctrl+K - open or toggle command palette everywhere
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'k' || e.code === 'KeyK')) {
        e.preventDefault();
        e.stopPropagation();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }

      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
        if (isTransactionModalOpen) {
          setIsTransactionModalOpen(false);
          setEditingTransaction(null);
        }
        if (isImportModalOpen) setIsImportModalOpen(false);
        return;
      }

      if (isInput) return;

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openTransactionModal('expense');
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        openCommandPalette();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isCommandPaletteOpen, isTransactionModalOpen, isImportModalOpen, openCommandPalette, openTransactionModal]);

  const openAccountModal = useCallback(() => setIsAccountModalOpen(true), []);
  const closeAccountModal = useCallback(() => setIsAccountModalOpen(false), []);

  const switchUser = useCallback(async (userId: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to switch user', 'error');
        return false;
      }
      setCurrentUser(data.user);
      showToast(`Switched account to ${data.user.name}`, 'success');
      triggerRefresh();
      return true;
    } catch {
      showToast('Error switching user', 'error');
      return false;
    }
  }, [showToast, triggerRefresh]);

  const registerUser = useCallback(async (formData: {
    name: string;
    email: string;
    baseCurrency?: string;
    initialAccountName?: string;
    initialBalance?: number;
  }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Registration failed', 'error');
        return false;
      }
      setCurrentUser(data.user);
      setIsAccountModalOpen(false);
      showToast(`Welcome, ${data.user.name}! Your account is ready.`, 'success');
      triggerRefresh();
      return true;
    } catch {
      showToast('Error creating user account', 'error');
      return false;
    }
  }, [showToast, triggerRefresh]);

  const updateUserName = useCallback(async (userId: string, name: string) => {
    try {
      const res = await fetch('/api/auth/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to update profile name', 'error');
        return false;
      }
      showToast('Profile name updated', 'success');
      if (currentUser?.id === userId) {
        setCurrentUser(prev => prev ? { ...prev, name } : null);
      }
      await fetchUsers();
      triggerRefresh();
      return true;
    } catch {
      showToast('Error updating profile name', 'error');
      return false;
    }
  }, [currentUser, showToast, fetchUsers, triggerRefresh]);

  const deleteUser = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/auth/users?id=${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to delete profile', 'error');
        return false;
      }
      showToast('User profile deleted');
      // If deleted current user, switch to default demo user
      if (currentUser?.id === userId) {
        await switchUser('user_default');
      } else {
        await fetchUsers();
      }
      triggerRefresh();
      return true;
    } catch {
      showToast('Error deleting user profile', 'error');
      return false;
    }
  }, [currentUser, showToast, switchUser, fetchUsers, triggerRefresh]);

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        currentUser,
        availableUsers,
        isAccountModalOpen,
        openAccountModal,
        closeAccountModal,
        switchUser,
        registerUser,
        deleteUser,
        updateUserName,
        isAuthenticated,
        isDemoMode,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        enterDemoMode,
        logout,
        authChecked,
        isTransactionModalOpen,
        openTransactionModal,
        closeTransactionModal,
        editingTransaction,
        isCommandPaletteOpen,
        openCommandPalette,
        closeCommandPalette,
        isImportModalOpen,
        openImportModal,
        closeImportModal,
        transactionModalType,
        preselectedAccountId,
        toasts,
        showToast,
        removeToast,
        refreshKey,
        triggerRefresh,
        isAsyncOperationRunning: asyncOpCount > 0,
        startAsyncOp,
        stopAsyncOp,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

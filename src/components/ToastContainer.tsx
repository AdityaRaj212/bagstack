'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { CheckCircle2, AlertTriangle, Info, RotateCcw, X } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            pointerEvents: 'auto',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-primary)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            minWidth: '280px',
            maxWidth: '420px',
            animation: 'slideUp 200ms ease-out',
          }}
        >
          {toast.type === 'error' ? (
            <AlertTriangle size={18} color="var(--color-expense)" />
          ) : toast.type === 'info' ? (
            <Info size={18} color="var(--brand-primary)" />
          ) : (
            <CheckCircle2 size={18} color="var(--color-income)" />
          )}

          <div style={{ flex: 1, fontSize: '0.875rem' }}>{toast.message}</div>

          {toast.undoAction && (
            <button
              onClick={async () => {
                await toast.undoAction!();
                removeToast(toast.id);
              }}
              style={{
                backgroundColor: 'var(--brand-light)',
                color: 'var(--brand-primary)',
                padding: '0.3rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <RotateCcw size={12} /> Undo
            </button>
          )}

          <button
            onClick={() => removeToast(toast.id)}
            style={{ color: 'var(--text-muted)', padding: '0.2rem' }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

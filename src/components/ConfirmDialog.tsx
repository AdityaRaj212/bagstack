'use client';

import React, { useEffect, useCallback } from 'react';
import { AlertTriangle, AlertCircle, Info, X, Loader2 } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  details?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  details,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen || isLoading) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    },
    [isOpen, isLoading, onCancel, onConfirm]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          icon: <AlertTriangle size={24} style={{ color: 'var(--color-warning)' }} />,
          iconBg: 'var(--color-warning-subtle)',
          confirmBtnBg: 'var(--color-warning)',
          confirmBtnHover: '#d97706',
          confirmBtnText: '#ffffff',
          accentBorder: 'rgba(245, 158, 11, 0.3)',
        };
      case 'info':
        return {
          icon: <Info size={24} style={{ color: 'var(--brand-primary)' }} />,
          iconBg: 'var(--brand-light)',
          confirmBtnBg: 'var(--brand-primary)',
          confirmBtnHover: 'var(--brand-hover)',
          confirmBtnText: '#ffffff',
          accentBorder: 'rgba(99, 102, 241, 0.3)',
        };
      case 'danger':
      default:
        return {
          icon: <AlertCircle size={24} style={{ color: 'var(--color-expense)' }} />,
          iconBg: 'var(--color-expense-subtle)',
          confirmBtnBg: 'var(--color-expense)',
          confirmBtnHover: '#dc2626',
          confirmBtnText: '#ffffff',
          accentBorder: 'rgba(239, 68, 68, 0.3)',
        };
    }
  };

  const style = getVariantStyles();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        zIndex: 9999,
        animation: 'fadeIn 150ms ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onCancel();
        }
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-modal)',
          overflow: 'hidden',
          animation: 'scaleUp 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: style.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: `1px solid ${style.accentBorder}`,
              }}
            >
              {style.icon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <h3
                  id="confirm-dialog-title"
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {title}
                </h3>
                {!isLoading && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="btn-icon"
                    style={{
                      color: 'var(--text-muted)',
                      padding: '4px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              <p
                style={{
                  fontSize: '0.9rem',
                  lineHeight: '1.45',
                  color: 'var(--text-secondary)',
                  marginTop: '0.5rem',
                  marginBottom: 0,
                }}
              >
                {message}
              </p>

              {details && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    lineHeight: '1.4',
                  }}
                >
                  {details}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            padding: '1rem 1.5rem',
            backgroundColor: 'var(--bg-subtle)',
            borderTop: '1px solid var(--border-default)',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: '0.55rem 1.1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              borderRadius: 'var(--radius-md)',
            }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
              backgroundColor: style.confirmBtnBg,
              color: style.confirmBtnText,
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'opacity var(--transition-fast)',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

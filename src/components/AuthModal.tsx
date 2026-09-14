'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Mail, Shield, CheckCircle2, ArrowRight, X, RotateCcw, Lock, AlertTriangle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast, triggerRefresh } = useApp();

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [devOtpNotice, setDevOtpNotice] = useState<{ code?: string; error?: string } | null>(null);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setStep('email');
      setDigits(['', '', '', '', '', '']);
      setErrorMsg('');
      setLoading(false);
    }
  }, [isOpen]);

  // Resend Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!isOpen) return null;

  // Step 1: Send OTP to email
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');

      setStep('otp');
      setCountdown(60);

      if (process.env.NODE_ENV !== 'production' && !data.emailSent && data.devCode) {
        setDevOtpNotice({ code: data.devCode, error: data.smtpError });
        showToast('Google SMTP rejected credentials. Fallback OTP provided on screen.', 'error');
        // Auto-fill the code for testing convenience
        setDigits(data.devCode.split(''));
      } else {
        setDevOtpNotice(null);
        showToast(`Verification code sent to ${cleanEmail}`);
        setDigits(['', '', '', '', '', '']);
      }

      // Focus first digit input
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (codeStr: string) => {
    if (codeStr.length !== 6) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: codeStr }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      showToast(`Welcome, ${data.user.name}!`);
      triggerRefresh();
      onSuccess?.();
      onClose();

      // Set demo mode cookie to false to ensure authenticated session takes priority
      document.cookie = 'apex_demo_mode=false; path=/; max-age=0';
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    // Extract numbers, stripping spaces/dashes/newlines
    const clean = pasted.replace(/\D/g, '').slice(0, 6);
    if (!clean) return;

    const nextDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < clean.length; i++) {
      nextDigits[i] = clean[i];
    }
    setDigits(nextDigits);

    if (clean.length === 6) {
      handleVerifyOtp(clean);
    } else {
      inputRefs.current[clean.length]?.focus();
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const singleVal = val.replace(/\D/g, '').slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = singleVal;
    setDigits(nextDigits);

    if (singleVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits are filled
    const fullCode = nextDigits.join('');
    if (fullCode.length === 6) {
      handleVerifyOtp(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setCountdown(60);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (!data.emailSent && data.devCode) {
        setDevOtpNotice({ code: data.devCode, error: data.smtpError });
        setDigits(data.devCode.split(''));
        showToast('SMTP credentials rejected. Fresh fallback OTP loaded.', 'error');
      } else {
        setDevOtpNotice(null);
        showToast('A new 6-digit code was sent to your email');
        setDigits(['', '', '', '', '', '']);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend code');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '440px',
          width: '100%',
          padding: '2rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--brand-primary), #8b5cf6)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
              }}
            >
              <Lock size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                {step === 'email' ? 'Sign in to Bagstack' : 'Verify Email Code'}
              </h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {step === 'email' ? 'Passwordless instant sign in with email OTP' : `Code sent to ${email}`}
              </div>
            </div>
          </div>

          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--color-expense)',
              fontSize: '0.8125rem',
              marginBottom: '1rem',
            }}
          >
            {errorMsg}
          </div>
        )}

        {step === 'email' ? (
          /* Step 1: Email Input */
          <form onSubmit={handleSendEmail} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Mail size={13} /> EMAIL ADDRESS
              </label>
              <input
                type="email"
                required
                autoFocus
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ fontSize: '0.95rem', padding: '0.75rem 1rem' }}
              />
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                We will email a 6-digit verification code from <strong>adityaraj212.work@gmail.com</strong>.
              </span>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ padding: '0.75rem', fontSize: '0.9rem', justifyContent: 'center' }}
            >
              {loading ? 'Sending code...' : (
                <>
                  Continue with Email <ArrowRight size={16} />
                </>
              )}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.725rem', color: 'var(--text-muted)', justifyContent: 'center' }}>
              <Shield size={13} /> Secure passwordless login • Zero spam
            </div>
          </form>
        ) : (
          /* Step 2: 6-Digit OTP Code Input */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {process.env.NODE_ENV !== 'production' && devOtpNotice && (
              <div
                style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#d97706',
                  fontSize: '0.78rem',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem', color: '#f59e0b' }}>
                  <AlertTriangle size={15} /> Google SMTP App Password Issue (535)
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  Google rejected credentials for <strong>adityaraj212.work@gmail.com</strong> (535 Bad Credentials). Please ensure the App Password was generated while signed into that exact Google account.
                </div>
                <div style={{ marginTop: '0.65rem', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '6px', textAlign: 'center', border: '1px dashed #f59e0b' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Generated testing code:</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '4px', color: 'var(--brand-primary)', marginTop: '2px' }}>
                    {devOtpNotice.code}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Auto-filled below for instant testing</span>
                </div>
              </div>
            )}

            <div>
              <label className="form-label" style={{ textAlign: 'center', display: 'block', marginBottom: '0.75rem' }}>
                ENTER 6-DIGIT VERIFICATION CODE
              </label>

              {/* 6 Digit Input Boxes */}
              <div
                onPaste={handlePaste}
                style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
              >
                {digits.map((digit, idx) => (
                   <input
                     key={idx}
                     ref={el => { inputRefs.current[idx] = el; }}
                     type="text"
                     inputMode="numeric"
                     maxLength={1}
                     value={digit}
                     onChange={e => handleDigitChange(idx, e.target.value)}
                     onKeyDown={e => handleKeyDown(idx, e)}
                     onPaste={handlePaste}
                     style={{
                      width: '46px',
                      height: '52px',
                      textAlign: 'center',
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      backgroundColor: 'var(--bg-subtle)',
                      border: digit ? '2px solid var(--brand-primary)' : '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      transition: 'all 0.15s ease',
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setStep('email')}
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              >
                ← Change Email
              </button>

              <button
                type="button"
                className="btn-ghost"
                onClick={handleResend}
                disabled={countdown > 0}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  color: countdown > 0 ? 'var(--text-muted)' : 'var(--brand-primary)',
                  cursor: countdown > 0 ? 'default' : 'pointer',
                }}
              >
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
              </button>
            </div>

            <button
              type="button"
              className="btn-primary"
              disabled={loading || digits.join('').length !== 6}
              onClick={() => handleVerifyOtp(digits.join(''))}
              style={{ padding: '0.75rem', fontSize: '0.9rem', justifyContent: 'center' }}
            >
              {loading ? 'Verifying...' : 'Verify & Enter Workspace'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

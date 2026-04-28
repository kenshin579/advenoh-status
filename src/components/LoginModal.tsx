'use client';

import { useState } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<boolean>;
  error: string | null;
  loading: boolean;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid var(--color-glass-border)',
  borderRadius: 8,
  color: 'var(--color-text)',
  fontSize: 14,
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
  marginBottom: 6,
};

export default function LoginModal({ isOpen, onClose, onLogin, error, loading }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onLogin(email, password);
    if (success) {
      setEmail('');
      setPassword('');
      onClose();
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={handleClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(10, 5, 18, 0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      />

      <div
        className="glass-panel"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          margin: '0 16px',
          padding: 28,
        }}
      >
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--color-text)',
            marginBottom: 20,
            letterSpacing: '-0.01em',
          }}
        >
          로그인
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label htmlFor="email" style={labelStyle}>
              EMAIL
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              required
              disabled={loading}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-cyan)')}
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = 'var(--color-glass-border)')
              }
            />
          </div>

          <div>
            <label htmlFor="password" style={labelStyle}>
              PASSWORD
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              required
              disabled={loading}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-cyan)')}
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = 'var(--color-glass-border)')
              }
            />
          </div>

          {error && (
            <p style={{ fontSize: 12, color: 'var(--color-error)' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
            <button
              type="button"
              onClick={handleClose}
              className="mono"
              style={{
                flex: 1,
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--color-glass-border)',
                color: 'var(--color-text-muted)',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              className="mono"
              style={{
                flex: 1,
                padding: '10px 16px',
                background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                opacity: loading ? 0.5 : 1,
                boxShadow: '0 6px 16px color-mix(in srgb, var(--color-accent) 33%, transparent)',
              }}
              disabled={loading}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

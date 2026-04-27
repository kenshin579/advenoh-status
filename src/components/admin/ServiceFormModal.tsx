'use client';

import { useState, useEffect } from 'react';
import type { Service } from '@/types';

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; url: string; threshold_ms: number }) => Promise<void>;
  service: Service | null;
  error: string | null;
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

export default function ServiceFormModal({
  isOpen,
  onClose,
  onSubmit,
  service,
  error,
}: ServiceFormModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [thresholdMs, setThresholdMs] = useState(3000);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isEdit = !!service;

  useEffect(() => {
    if (service) {
      setName(service.name);
      setUrl(service.url);
      setThresholdMs(service.threshold_ms);
    } else {
      setName('');
      setUrl('');
      setThresholdMs(3000);
    }
    setValidationError(null);
  }, [service, isOpen]);

  if (!isOpen) return null;

  const validateUrl = (value: string): boolean => {
    try {
      const urlObj = new URL(value);
      return urlObj.protocol === 'https:' || urlObj.protocol === 'http:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError('Please enter a service name.');
      return;
    }
    if (!validateUrl(url)) {
      setValidationError('Please enter a valid URL format. (https:// or http://)');
      return;
    }
    if (thresholdMs < 0) {
      setValidationError('Threshold must be 0 or greater.');
      return;
    }

    setSubmitting(true);
    await onSubmit({ name: name.trim(), url: url.trim(), threshold_ms: thresholdMs });
    setSubmitting(false);
  };

  const handleClose = () => {
    setName('');
    setUrl('');
    setThresholdMs(3000);
    setValidationError(null);
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
          maxWidth: 460,
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
          {isEdit ? 'Edit Service' : 'Add Service'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label htmlFor="name" style={labelStyle}>
              SERVICE NAME <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              disabled={submitting}
              placeholder="e.g., My Service"
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-cyan)')}
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = 'var(--color-glass-border)')
              }
            />
          </div>

          <div>
            <label htmlFor="url" style={labelStyle}>
              URL <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <input
              id="url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
              disabled={submitting}
              placeholder="https://example.com"
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-cyan)')}
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = 'var(--color-glass-border)')
              }
            />
          </div>

          <div>
            <label htmlFor="threshold" style={labelStyle}>
              THRESHOLD (ms)
            </label>
            <input
              id="threshold"
              type="number"
              value={thresholdMs}
              onChange={(e) => setThresholdMs(Number(e.target.value))}
              style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
              disabled={submitting}
              min={0}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-cyan)')}
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = 'var(--color-glass-border)')
              }
            />
          </div>

          {(validationError || error) && (
            <p style={{ fontSize: 12, color: 'var(--color-error)' }}>
              {validationError || error}
            </p>
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
              disabled={submitting}
            >
              Cancel
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
                opacity: submitting ? 0.5 : 1,
                boxShadow: '0 6px 16px color-mix(in srgb, var(--color-accent) 33%, transparent)',
              }}
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

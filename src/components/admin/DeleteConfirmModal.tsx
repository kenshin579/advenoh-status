'use client';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  serviceName: string;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  serviceName,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm();
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
        onClick={onClose}
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
          maxWidth: 380,
          margin: '0 16px',
          padding: 28,
        }}
      >
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--color-text)',
            marginBottom: 14,
            letterSpacing: '-0.01em',
          }}
        >
          Delete Service
        </h2>

        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 6 }}>
          Are you sure you want to delete &quot;{serviceName}&quot;?
        </p>
        <p
          className="mono"
          style={{
            color: 'var(--color-text-dim)',
            fontSize: 11,
            letterSpacing: '0.06em',
            marginBottom: 22,
          }}
        >
          Related status logs will also be deleted.
        </p>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={onClose}
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
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="mono"
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'var(--color-error)',
              color: '#0a0512',
              border: 'none',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0 6px 16px color-mix(in srgb, var(--color-error) 33%, transparent)',
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

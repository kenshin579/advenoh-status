export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="mono"
      style={{
        marginTop: 64,
        borderTop: '1px solid var(--color-glass-border)',
      }}
    >
      <div
        className="mx-auto"
        style={{
          maxWidth: 1280,
          padding: '28px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 11,
          color: 'var(--color-text-dim)',
          letterSpacing: '0.06em',
        }}
      >
        <span>
          © {year} advenoh.status · v∞
        </span>
        <span style={{ display: 'flex', gap: 16 }}>
          <span style={{ color: 'var(--color-cyan)' }}>● online</span>
          <span>powered by next.js · supabase</span>
        </span>
      </div>
    </footer>
  );
}

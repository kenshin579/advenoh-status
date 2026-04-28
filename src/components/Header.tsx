'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useOverallStatus } from '@/hooks/useOverallStatus';
import LoginModal from './LoginModal';
import StatusPill from './ui/StatusPill';

const NAV_LINKS = [
  { href: '/', label: 'DASHBOARD' },
  { href: '/history', label: 'HISTORY' },
];

function HeaderContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, dbUser, loading, error, signIn, signOut, clearError } = useAuth();
  const { status: overall } = useOverallStatus();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const enableLogin = searchParams.get('enable_login') === 'true';
  const showLoginButton = enableLogin && !isAuthenticated && !loading;
  const showUserInfo = isAuthenticated && !loading;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenModal = () => {
    clearError();
    setIsModalOpen(true);
  };

  return (
    <>
      <header
        className="hdr-root"
        style={{
          borderBottom: '1px solid var(--color-glass-border)',
          background: 'rgba(10, 5, 18, 0.45)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div className="hdr-inner mx-auto flex items-center" style={{ maxWidth: 1280, padding: '20px 32px', gap: 28 }}>
          {/* Logo */}
          <Link href="/" className="flex items-center" style={{ gap: 14, textDecoration: 'none' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background:
                  'conic-gradient(from 180deg, var(--color-accent), var(--color-accent-2), var(--color-cyan), var(--color-accent))',
                padding: 1.5,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 9,
                  background: 'var(--color-bg-0)',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontSize: 18,
                  color: 'var(--color-text)',
                  letterSpacing: '-0.04em',
                }}
              >
                A
              </div>
            </div>
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 16,
                  letterSpacing: '-0.01em',
                  background: 'linear-gradient(90deg, var(--color-text), var(--color-accent) 130%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                advenoh.status
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.2em',
                  color: 'var(--color-text-dim)',
                  textTransform: 'uppercase',
                }}
              >
                net.online
              </div>
            </div>
          </Link>

          {/* Navigation */}
          <nav
            style={{
              display: 'flex',
              marginLeft: 'auto',
              gap: 4,
              padding: 4,
              background: 'var(--color-glass-bg)',
              borderRadius: 10,
              border: '1px solid var(--color-glass-border)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="mono"
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))'
                      : 'transparent',
                    color: active ? '#fff' : 'var(--color-text-muted)',
                    fontSize: 12,
                    letterSpacing: '0.06em',
                    fontWeight: 600,
                    padding: '8px 18px',
                    borderRadius: 7,
                    boxShadow: active ? '0 4px 16px color-mix(in srgb, var(--color-accent) 33%, transparent)' : 'none',
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Overall Status Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <StatusPill status={overall} glitch />

            {/* Login Button */}
            {showLoginButton && (
              <button
                onClick={handleOpenModal}
                className="mono"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--color-glass-border)',
                  color: 'var(--color-text-muted)',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  fontWeight: 600,
                  padding: '7px 14px',
                  borderRadius: 7,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Login
              </button>
            )}

            {/* User Avatar + Dropdown */}
            {showUserInfo && (
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background:
                      'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px color-mix(in srgb, var(--color-accent) 33%, transparent)',
                  }}
                >
                  {dbUser?.email?.charAt(0).toUpperCase() || 'A'}
                </button>

                {isDropdownOpen && (
                  <div
                    className="glass-panel"
                    style={{
                      position: 'absolute',
                      right: 0,
                      marginTop: 8,
                      width: 200,
                      padding: '6px 0',
                      zIndex: 50,
                      borderRadius: 10,
                    }}
                  >
                    <div
                      style={{
                        padding: '8px 14px',
                        fontSize: 11,
                        color: 'var(--color-text-dim)',
                        borderBottom: '1px solid var(--color-glass-border)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {dbUser?.email}
                    </div>
                    <Link
                      href="/admin"
                      onClick={() => setIsDropdownOpen(false)}
                      style={{
                        display: 'block',
                        padding: '8px 14px',
                        fontSize: 13,
                        color: 'var(--color-text)',
                        textDecoration: 'none',
                      }}
                    >
                      Admin
                    </Link>
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        signOut();
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 14px',
                        fontSize: 13,
                        color: 'var(--color-text)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <LoginModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLogin={signIn}
        error={error}
        loading={loading}
      />

      <style>{`
        @media (max-width: 640px) {
          .hdr-inner {
            padding: 14px 16px !important;
            gap: 12px !important;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </>
  );
}

function HeaderFallback() {
  return (
    <header
      style={{
        borderBottom: '1px solid var(--color-glass-border)',
        background: 'rgba(10, 5, 18, 0.45)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className="mx-auto flex items-center" style={{ maxWidth: 1280, padding: '20px 32px', gap: 28 }}>
        <Link href="/" style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: 700, fontSize: 16 }}>
          advenoh.status
        </Link>
      </div>
    </header>
  );
}

export default function Header() {
  return (
    <Suspense fallback={<HeaderFallback />}>
      <HeaderContent />
    </Suspense>
  );
}

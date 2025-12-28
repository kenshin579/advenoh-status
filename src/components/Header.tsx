'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import LoginModal from './LoginModal';

function HeaderContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, dbUser, loading, error, signIn, signOut, clearError } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const enableLogin = searchParams.get('enable_login') === 'true';
  const showLoginButton = enableLogin && !isAuthenticated && !loading;
  const showUserInfo = isAuthenticated && !loading;

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/history', label: 'History' },
  ];

  const handleOpenModal = () => {
    clearError();
    setIsModalOpen(true);
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-gray-900">Advenoh Status</span>
            </Link>

            {/* Navigation + Auth */}
            <div className="flex items-center gap-6">
              <nav className="flex items-center gap-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-medium transition-colors ${
                      pathname === link.href
                        ? 'text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* Login Button */}
              {showLoginButton && (
                <button
                  onClick={handleOpenModal}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  로그인
                </button>
              )}

              {/* User Info */}
              {showUserInfo && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">{dbUser?.email}</span>
                  <button
                    onClick={signOut}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
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
    </>
  );
}

export default function Header() {
  return (
    <Suspense fallback={
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-gray-900">Advenoh Status</span>
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Dashboard
              </Link>
              <Link href="/history" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                History
              </Link>
            </nav>
          </div>
        </div>
      </header>
    }>
      <HeaderContent />
    </Suspense>
  );
}

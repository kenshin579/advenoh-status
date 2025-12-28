'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const enableLogin = searchParams.get('enable_login') === 'true';
  const showLoginButton = enableLogin && !isAuthenticated && !loading;
  const showUserInfo = isAuthenticated && !loading;

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
                  Login
                </button>
              )}

              {/* User Avatar + Dropdown */}
              {showUserInfo && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium text-sm hover:bg-blue-700 transition-colors"
                  >
                    {dbUser?.email?.charAt(0).toUpperCase() || 'A'}
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                      <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-100 truncate">
                        {dbUser?.email}
                      </div>
                      <Link
                        href="/admin"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        Admin
                      </Link>
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          signOut();
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Logout
                      </button>
                    </div>
                  )}
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

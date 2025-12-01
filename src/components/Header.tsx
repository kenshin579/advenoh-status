'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Header() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/history', label: 'History' },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold text-gray-900">Advenoh Status</span>
          </Link>

          {/* Navigation */}
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

            {user && (
              <button
                onClick={handleSignOut}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign out
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

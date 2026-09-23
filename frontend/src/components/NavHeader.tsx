'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Briefcase, LogOut, User } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface NavHeaderProps {
  showBack?: boolean;
  backHref?: string;
  backLabel?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function NavHeader({ 
  showBack = false, 
  backHref = '/dashboard',
  backLabel = 'Dashboard',
  title,
  subtitle,
  actions 
}: NavHeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-dark-200/50 dark:border-dark-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            {showBack ? (
              <Link href={backHref} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <svg className="w-5 h-5 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium text-dark-700 dark:text-dark-300 hidden sm:block">{backLabel}</span>
              </Link>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold text-dark-900 dark:text-white">Interview Prep Kit</span>
                </Link>
                <Link
                  href="/"
                  className="text-sm font-medium text-dark-600 dark:text-dark-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors ml-1"
                >
                  Home
                </Link>
              </div>
            )}
            {title && (
              <>
                {showBack && <div className="h-6 w-px bg-dark-200 dark:bg-dark-700 hidden sm:block" />}
                <div className="hidden sm:block">
                  <h1 className="text-lg font-semibold text-dark-900 dark:text-white truncate max-w-[300px]">
                    {title}
                  </h1>
                  {subtitle && <p className="text-xs text-dark-500 dark:text-dark-400">{subtitle}</p>}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <ThemeToggle />
            {user && (
              <>
                <div className="hidden sm:flex items-center gap-2 text-sm text-dark-500 dark:text-dark-400">
                  <User className="w-4 h-4" />
                  <span>{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
'use client';

import { Toaster } from 'react-hot-toast';
import { ToastContainer } from '@/components/Toast';
import { ReactNode, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { checkAuth } = useAuthStore();

  // Prevent duplicate auth checks
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    // Don't check authentication on public authentication pages
    const publicAuthPages = ['/login', '/register'];

    if (publicAuthPages.includes(pathname)) {
      return;
    }

    // Prevent duplicate calls
    if (hasCheckedAuth.current) {
      return;
    }

    hasCheckedAuth.current = true;

    checkAuth();
  }, [pathname, checkAuth]);

  return (
    <>
      {children}

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#334155',
            color: '#f8fafc',
            borderRadius: '0.75rem',
            padding: '1rem 1.25rem',
          },

          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#f8fafc',
            },
          },

          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#f8fafc',
            },
          },
        }}
      />

      <ToastContainer />
    </>
  );
}
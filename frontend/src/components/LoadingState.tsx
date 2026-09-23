'use client';

import { ReactNode } from 'react';
import { AnimatedBackground } from './AnimatedBackground';

interface LoadingStateProps {
  message?: string;
  submessage?: string;
  showProgress?: boolean;
  progress?: number;
}

export function LoadingState({ 
  message = 'Loading...', 
  submessage,
  showProgress = false,
  progress = 0
}: LoadingStateProps) {
  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center animate-fade-in">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-dark-200 dark:border-dark-700 rounded-full" />
            <div className="absolute inset-0 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            {showProgress && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                  {Math.round(progress)}%
                </span>
              </div>
            )}
          </div>
          <h2 className="text-xl font-semibold text-dark-900 dark:text-white mb-2">
            {message}
          </h2>
          {submessage && (
            <p className="text-dark-500 dark:text-dark-400 text-sm max-w-md">
              {submessage}
            </p>
          )}
          {showProgress && (
            <div className="mt-4 w-64 mx-auto">
              <div className="h-2 bg-dark-200 dark:bg-dark-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card p-12 text-center">
      {icon && (
        <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
      )}
      <h2 className="text-xl font-semibold text-dark-900 dark:text-white mb-2">
        {title}
      </h2>
      <p className="text-dark-500 dark:text-dark-400 mb-6 max-w-md mx-auto">
        {description}
      </p>
      {action}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  title = 'Something went wrong', 
  message, 
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="card p-8 text-center max-w-md mx-auto">
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-dark-900 dark:text-white mb-2">
        {title}
      </h2>
      <p className="text-dark-500 dark:text-dark-400 mb-6">
        {message}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary">
          Try Again
        </button>
      )}
    </div>
  );
}
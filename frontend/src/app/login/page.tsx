'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'react-hot-toast';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Briefcase,
  CheckCircle
} from 'lucide-react';

const demoCredentials = [
  {
    email: 'demo@interviewprepkit.com',
    password: 'demo123456',
    name: 'Demo User'
  },
  {
    email: 'alex@techcorp.com',
    password: 'alex123456',
    name: 'Alex Chen'
  },
  {
    email: 'sarah@startup.io',
    password: 'sarah123456',
    name: 'Sarah Johnson'
  }
];

export default function LoginPage() {
  const router = useRouter();

  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDemo, setSelectedDemo] =
    useState<(typeof demoCredentials)[0] | null>(null);

  // Normal login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;

    setIsLoading(true);

    try {
      await login(email, password);

      toast.success('Welcome back!');

      router.push('/dashboard');
      router.refresh();
    } catch (error: any) {
      console.error('Login error:', error);

      toast.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          'Login failed'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Demo login
  const handleDemoLogin = async (
    cred: (typeof demoCredentials)[0]
  ) => {
    // Prevent multiple clicks
    if (isLoading) return;

    setSelectedDemo(cred);
    setEmail(cred.email);
    setPassword(cred.password);
    setIsLoading(true);

    try {
      // Only attempt LOGIN.
      // Do not automatically register if login fails.
      await login(cred.email, cred.password);

      toast.success(`Logged in as ${cred.name}!`);

      router.push('/dashboard');
      router.refresh();
    } catch (error: any) {
      console.error('Demo login error:', error);

      toast.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          'Demo login failed'
      );
    } finally {
      setIsLoading(false);
      setSelectedDemo(null);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <AnimatedBackground />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="card p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 mb-6"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-white" />
              </div>

              <span className="text-2xl font-bold text-dark-900 dark:text-white">
                Interview Prep Kit
              </span>
            </Link>

            <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
              Welcome Back
            </h1>

            <p className="text-dark-500 dark:text-dark-400 mt-2">
              Sign in to access your interview kits
            </p>
          </div>

          {/* Login Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5"
              >
                Email
              </label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5"
              >
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />

                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300"
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />

                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>

                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Accounts */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dark-200 dark:border-dark-700" />
              </div>

              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white/80 dark:bg-dark-800/80 text-dark-500 dark:text-dark-400 backdrop-blur-sm">
                  Or try a demo account
                </span>
              </div>
            </div>

            <div
              className="mt-4 space-y-2"
              role="list"
              aria-label="Demo accounts"
            >
              {demoCredentials.map((cred) => (
                <button
                  key={cred.email}
                  type="button"
                  onClick={() => handleDemoLogin(cred)}
                  disabled={isLoading}
                  className="w-full btn-secondary justify-start gap-3 transition-all hover:shadow-md"
                  role="listitem"
                >
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />

                  <div className="flex-1 text-left">
                    <p className="font-medium text-dark-900 dark:text-white text-sm">
                      {cred.name}
                    </p>

                    <p className="text-xs text-dark-500 dark:text-dark-400 font-mono">
                      {cred.email}
                    </p>
                  </div>

                  {selectedDemo?.email === cred.email && (
                    <svg
                      className="animate-spin h-5 w-5 text-primary-500"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />

                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Register Link */}
          <p className="mt-6 text-center text-sm text-dark-500 dark:text-dark-400">
            Don't have an account?{' '}

            <Link
              href="/register"
              className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
            >
              Sign up for free
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
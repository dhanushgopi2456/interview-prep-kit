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
  CheckCircle,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  KeyRound
} from 'lucide-react';

const demoCredentials = [
  {
    email: 'demo@interviewprepkit.com',
    password: 'demo123456',
    name: 'Demo Candidate',
    role: 'Candidate (Default)',
    badge: 'Recommended • Prepared Kit Ready',
    features: 'Sample kit loaded with questions, flashcards & 5-day schedule'
  },
  {
    email: 'alex@techcorp.com',
    password: 'alex123456',
    name: 'Alex Chen',
    role: 'Senior Backend Engineer',
    badge: 'Senior Role • Node.js & Go Focus',
    features: 'System design, database tuning, and microservices prep'
  },
  {
    email: 'sarah@startup.io',
    password: 'sarah123456',
    name: 'Sarah Johnson',
    role: 'Full Stack Engineer',
    badge: 'Full Stack • React & Cloud',
    features: 'Frontend architecture and cross-functional behavioural questions'
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Copy to clipboard helper
  const handleCopy = (text: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    toast.success(`Copied ${label} to clipboard!`);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === text ? null : curr));
    }, 2000);
  };

  // Autofill form inputs
  const handleAutofill = (cred: (typeof demoCredentials)[0], e: React.MouseEvent) => {
    e.stopPropagation();
    setEmail(cred.email);
    setPassword(cred.password);
    toast.success(`Filled credentials for ${cred.name}`);
  };

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
    if (isLoading) return;

    setSelectedDemo(cred);
    setEmail(cred.email);
    setPassword(cred.password);
    setIsLoading(true);

    try {
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
    <div className="min-h-screen relative flex items-center justify-center p-4 py-12">
      <AnimatedBackground />

      <div className="w-full max-w-lg relative z-10 animate-slide-up">
        <div className="card p-6 sm:p-8 shadow-xl">

          {/* Header */}
          <div className="text-center mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-sm">
                <Briefcase className="w-6 h-6 text-white" />
              </div>

              <span className="text-2xl font-bold text-dark-900 dark:text-white">
                Interview Prep Kit
              </span>
            </Link>

            <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
              Sign In to Your Account
            </h1>

            <p className="text-dark-500 dark:text-dark-400 mt-1.5 text-sm">
              Enter your credentials or choose a pre-configured demo account below
            </p>
          </div>

          {/* Login Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1"
              >
                Email Address
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
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-dark-700 dark:text-dark-300"
                >
                  Password
                </label>
              </div>

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
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 p-1"
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-base font-semibold shadow-md mt-2"
            >
              {isLoading && !selectedDemo ? (
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

          {/* =========================================
              DEMO CREDENTIALS SECTION
          ========================================= */}
          <div className="mt-8 pt-6 border-t border-dark-200 dark:border-dark-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-dark-700 dark:text-dark-200">
                  Demo Credentials
                </h2>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-medium">
                Instant Access
              </span>
            </div>

            <p className="text-xs text-dark-500 dark:text-dark-400 mb-4">
              Click <strong className="text-dark-700 dark:text-dark-200">1-Click Sign In</strong> to log in immediately, or <strong className="text-dark-700 dark:text-dark-200">Autofill</strong> to test the form inputs.
            </p>

            <div
              className="space-y-3"
              role="list"
              aria-label="Demo credentials list"
            >
              {demoCredentials.map((cred) => (
                <div
                  key={cred.email}
                  className="rounded-xl border border-dark-200/80 dark:border-dark-700/80 bg-dark-50/60 dark:bg-dark-900/40 p-3.5 transition-all hover:border-primary-400 dark:hover:border-primary-600 hover:shadow-sm"
                  role="listitem"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-dark-900 dark:text-white">
                          {cred.name}
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                          {cred.badge}
                        </span>
                      </div>
                      <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                        {cred.features}
                      </p>
                    </div>
                  </div>

                  {/* Credential Data Rows */}
                  <div className="bg-white/80 dark:bg-dark-800/80 rounded-lg p-2.5 mb-3 border border-dark-200/60 dark:border-dark-700/60 font-mono text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-dark-600 dark:text-dark-300">
                      <span className="text-dark-400 dark:text-dark-500 font-sans text-[11px]">Email:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-dark-800 dark:text-dark-100 selection:bg-primary-200">
                          {cred.email}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopy(cred.email, 'email', e)}
                          className="p-1 hover:bg-dark-100 dark:hover:bg-dark-700 rounded text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 transition-colors"
                          title="Copy email"
                        >
                          {copiedKey === cred.email ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-dark-600 dark:text-dark-300 border-t border-dark-100 dark:border-dark-700/50 pt-1.5">
                      <span className="text-dark-400 dark:text-dark-500 font-sans text-[11px]">Password:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-dark-800 dark:text-dark-100 selection:bg-primary-200">
                          {cred.password}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopy(cred.password, 'password', e)}
                          className="p-1 hover:bg-dark-100 dark:hover:bg-dark-700 rounded text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 transition-colors"
                          title="Copy password"
                        >
                          {copiedKey === cred.password ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDemoLogin(cred)}
                      disabled={isLoading}
                      className="btn-primary text-xs py-2 px-3 flex-1 justify-center gap-1.5 font-medium shadow-sm"
                    >
                      {selectedDemo?.email === cred.email && isLoading ? (
                        <svg
                          className="animate-spin h-3.5 w-3.5 text-white"
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
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      )}
                      <span>1-Click Sign In</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleAutofill(cred, e)}
                      disabled={isLoading}
                      className="btn-secondary text-xs py-2 px-3 font-medium text-dark-700 dark:text-dark-200 hover:bg-dark-200/60 dark:hover:bg-dark-700/60"
                      title="Fill into email and password inputs above"
                    >
                      Autofill Form
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Register Link */}
          <div className="mt-8 text-center text-sm text-dark-500 dark:text-dark-400 border-t border-dark-200 dark:border-dark-700 pt-6">
            Need a new account?{' '}
            <Link
              href="/register"
              className="text-primary-600 dark:text-primary-400 hover:underline font-semibold"
            >
              Sign up for free
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
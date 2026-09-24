'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'react-hot-toast';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Briefcase,
  Sparkles,
  KeyRound,
  Check,
  ArrowRight
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAutofillNewUser = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setName(`Test Candidate ${randomSuffix}`);
    setEmail(`candidate.${randomSuffix}@example.com`);
    setPassword('prepkit123');
    setConfirmPassword('prepkit123');
    toast.success('Generated test user details!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    setIsLoading(true);

    try {
      await register(email.trim(), password, name.trim());

      toast.success('Account created successfully! Please sign in to continue.');

      router.push(`/login?registered=true&email=${encodeURIComponent(email.trim())}`);
    } catch (error: any) {
      console.error('Registration error:', error);

      toast.error(
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Registration failed'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isPasswordLongEnough = password.length >= 8;
  const doPasswordsMatch = password.length > 0 && password === confirmPassword;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 py-12">
      <AnimatedBackground />

      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg relative z-10 animate-slide-up">
        <div className="card p-6 sm:p-8 shadow-xl">

          {/* Header */}
          <div className="text-center mb-6">
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
              Create Your Account
            </h1>

            <p className="text-dark-500 dark:text-dark-400 mt-1.5 text-sm">
              Sign up to generate personalized interview prep kits in minutes
            </p>
          </div>

          {/* Quick Demo Callout */}
          <div className="mb-6 p-3 rounded-xl bg-primary-50/70 dark:bg-primary-950/30 border border-primary-200/70 dark:border-primary-800/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
              <span className="text-xs text-dark-700 dark:text-dark-200">
                Want to test immediately without signing up?
              </span>
            </div>
            <Link
              href="/login"
              className="text-xs font-semibold text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200 flex items-center gap-1 flex-shrink-0"
            >
              <span>Demo Login</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Registration Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Quick Fill Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAutofillNewUser}
                disabled={isLoading}
                className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Autofill test candidate</span>
              </button>
            </div>

            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1"
              >
                Full Name
              </label>

              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />

                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input pl-10"
                  placeholder="Alex Morgan"
                  required
                  autoComplete="name"
                  disabled={isLoading}
                />
              </div>
            </div>

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
                  placeholder="alex@example.com"
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
                className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1"
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
                  autoComplete="new-password"
                  minLength={8}
                  disabled={isLoading}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1"
              >
                Confirm Password
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />

                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  disabled={isLoading}
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 p-1"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Validation Hints */}
            <div className="p-2.5 rounded-lg bg-dark-50 dark:bg-dark-900/40 border border-dark-200/60 dark:border-dark-700/60 text-xs space-y-1">
              <div className="flex items-center gap-1.5">
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${isPasswordLongEnough ? 'bg-emerald-500 text-white' : 'bg-dark-300 dark:bg-dark-600 text-dark-50'}`}>
                  {isPasswordLongEnough ? <Check className="w-2.5 h-2.5" /> : null}
                </div>
                <span className={isPasswordLongEnough ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-dark-500 dark:text-dark-400'}>
                  At least 8 characters
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${doPasswordsMatch ? 'bg-emerald-500 text-white' : 'bg-dark-300 dark:bg-dark-600 text-dark-50'}`}>
                  {doPasswordsMatch ? <Check className="w-2.5 h-2.5" /> : null}
                </div>
                <span className={doPasswordsMatch ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-dark-500 dark:text-dark-400'}>
                  Passwords match
                </span>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-base font-semibold shadow-md mt-2"
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

                  Creating account...
                </span>
              ) : (
                'Create Account & Start'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center text-sm text-dark-500 dark:text-dark-400 border-t border-dark-200 dark:border-dark-700 pt-6">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-primary-600 dark:text-primary-400 hover:underline font-semibold"
            >
              Sign in
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
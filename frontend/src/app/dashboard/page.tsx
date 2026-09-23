'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { kitsApi, Kit } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import {
  Plus,
  Briefcase,
  Trash2,
  Clock,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const router = useRouter();

  const {
    user,
    isAuthenticated,
    checkAuth,
    logout
  } = useAuthStore();

  const [kits, setKits] = useState<Kit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /*
   * ==========================================
   * CHECK AUTHENTICATION & LOAD KITS
   * ==========================================
   */
  const loadKits = async () => {
    try {
      setIsLoading(true);

      const { data } = await kitsApi.list();

      /*
       * Protect against invalid API responses.
       */
      const loadedKits = Array.isArray(data?.kits)
        ? data.kits
        : [];

      setKits(loadedKits);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        router.replace('/login');
        return;
      }

      console.error('Failed to load kits:', error);

      toast.error(
        error?.response?.data?.error ||
        'Failed to load kits'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        setIsLoading(true);
        if (!isAuthenticated) {
          await checkAuth();
        }
        if (isMounted) {
          await loadKits();
        }
      } catch (error: any) {
        if (error?.response?.status === 401) {
          router.replace('/login');
        } else {
          console.error('Dashboard initialization error:', error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, checkAuth, router]);

  /*
   * ==========================================
   * DELETE KIT
   * ==========================================
   */
  const handleDelete = async (id: string) => {
    if (!id) {
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete this interview kit?'
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);

    try {
      await kitsApi.delete(id);

      toast.success('Kit deleted successfully');

      setKits(currentKits =>
        currentKits.filter(kit => kit._id !== id)
      );
    } catch (error: any) {
      console.error('Delete kit error:', error);

      toast.error(
        error?.response?.data?.error ||
        'Failed to delete kit'
      );
    } finally {
      setDeletingId(null);
    }
  };

  /*
   * ==========================================
   * CREATE KIT
   * ==========================================
   */
  const handleCreateKit = () => {
    router.push('/create');
  };

  /*
   * ==========================================
   * LOGOUT
   * ==========================================
   */
  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.replace('/login');
    }
  };

  /*
   * ==========================================
   * STATUS COLORS
   * ==========================================
   */
  const statusColors = {
    draft:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',

    generating:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',

    completed:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',

    failed:
      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  };

  /*
   * ==========================================
   * STATUS ICONS
   * ==========================================
   */
  const statusIcons = {
    draft: Clock,
    generating: Loader2,
    completed: Briefcase,
    failed: ExternalLink
  };

  /*
   * ==========================================
   * LOADING STATE
   * ==========================================
   */
  if (isLoading) {
    return (
      <div className="min-h-screen relative">
        <AnimatedBackground />

        <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-dark-200/50 dark:border-dark-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link
                href="/dashboard"
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>

                <span className="text-xl font-bold text-dark-900 dark:text-white">
                  Interview Prep Kit
                </span>
              </Link>
            </div>
          </div>
        </nav>

        <main className="pt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="h-9 w-72 bg-dark-200 dark:bg-dark-700 rounded-lg animate-pulse" />

            <div className="h-5 w-48 bg-dark-200 dark:bg-dark-700 rounded mt-3 animate-pulse" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(item => (
              <div
                key={item}
                className="card p-6 animate-pulse"
              >
                <div className="h-6 bg-dark-200 dark:bg-dark-700 rounded w-3/4 mb-4" />

                <div className="h-4 bg-dark-200 dark:bg-dark-700 rounded w-1/2 mb-6" />

                <div className="h-4 bg-dark-200 dark:bg-dark-700 rounded w-full mb-3" />

                <div className="h-4 bg-dark-200 dark:bg-dark-700 rounded w-2/3" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  /*
   * ==========================================
   * DASHBOARD
   * ==========================================
   */
  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />

      {/* ======================================
          NAVBAR
      ====================================== */}
      <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-dark-200/50 dark:border-dark-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>

                <span className="text-xl font-bold text-dark-900 dark:text-white">
                  Interview Prep Kit
                </span>
              </Link>

              <Link
                href="/"
                className="text-sm font-medium text-dark-600 dark:text-dark-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors ml-2"
              >
                Home
              </Link>
            </div>

            {/* User */}
            <div className="flex items-center gap-4">

              {user?.name && (
                <span className="text-sm text-dark-500 dark:text-dark-400 hidden sm:block">
                  {user.name}
                </span>
              )}

              <button
                onClick={handleLogout}
                className="btn-ghost text-dark-600 dark:text-dark-300"
              >
                Logout
              </button>

            </div>
          </div>
        </div>
      </nav>

      {/* ======================================
          MAIN
      ====================================== */}
      <main className="pt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">

          <div>
            <h1 className="text-3xl font-bold text-dark-900 dark:text-white">
              Your Interview Kits
            </h1>

            <p className="text-dark-500 dark:text-dark-400 mt-1">
              {kits.length} kit{kits.length !== 1 ? 's' : ''}
              {user?.name ? ` • ${user.name}` : ''}
            </p>
          </div>

          <button
            onClick={handleCreateKit}
            className="btn-primary inline-flex items-center justify-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Kit
          </button>

        </div>

        {/* ======================================
            NO KITS
        ====================================== */}
        {kits.length === 0 ? (

          <div className="card p-12 text-center">

            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>

            <h2 className="text-xl font-semibold text-dark-900 dark:text-white mb-2">
              No kits yet
            </h2>

            <p className="text-dark-500 dark:text-dark-400 mb-6 max-w-md mx-auto">
              Create your first interview prep kit by pasting a job
              description and company URL.
            </p>

            <button
              onClick={handleCreateKit}
              className="btn-primary inline-flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Kit
            </button>

          </div>

        ) : (

          /* ======================================
             KIT GRID
          ====================================== */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

            {kits.map(kit => {

              /*
               * IMPORTANT:
               *
               * Older kits may not contain:
               *
               * schedule
               * role
               * questions
               * source
               *
               * Therefore NEVER access them directly.
               */

              const days =
                kit.schedule?.daysAvailable ?? 0;

              const requirements =
                kit.role?.requirements?.length ?? 0;

              const questions =
                kit.questions?.length ?? 0;

              const role =
                kit.source?.role ||
                kit.role?.title ||
                'Untitled Role';

              const company =
                kit.source?.company ||
                'Company not available';

              const status =
                kit.status || 'draft';

              const StatusIcon =
                statusIcons[
                  status as keyof typeof statusIcons
                ] || Clock;

              const statusClass =
                statusColors[
                  status as keyof typeof statusColors
                ] || statusColors.draft;

              const updatedAt =
                kit.updatedAt
                  ? new Date(kit.updatedAt)
                  : new Date();

              return (

                <Link
                  key={kit._id}
                  href={`/kit/${kit._id}`}
                  className="card p-6 hover:shadow-xl transition-all duration-200 group"
                >

                  {/* Card header */}
                  <div className="flex items-start justify-between mb-4">

                    <div className="flex-1 min-w-0 pr-3">

                      <h3 className="text-lg font-semibold text-dark-900 dark:text-white truncate">
                        {role}
                      </h3>

                      <p className="text-sm text-dark-500 dark:text-dark-400 mt-1 truncate">
                        {company}
                      </p>

                    </div>

                    {/* Status */}
                    <span
                      className={`badge ${statusClass} flex-shrink-0 flex items-center gap-1`}
                    >
                      <StatusIcon
                        className={`w-3.5 h-3.5 ${
                          status === 'generating'
                            ? 'animate-spin'
                            : ''
                        }`}
                      />

                      {status.charAt(0).toUpperCase() +
                        status.slice(1)}
                    </span>

                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-dark-500 dark:text-dark-400 mb-4">

                    {/* Days */}
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {days} days
                    </span>

                    {/* Requirements */}
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      {requirements} reqs
                    </span>

                    {/* Questions */}
                    <span className="flex items-center gap-1">
                      <ExternalLink className="w-4 h-4" />
                      {questions} Qs
                    </span>

                  </div>

                  {/* Bottom */}
                  <div className="flex items-center justify-between pt-4 border-t border-dark-200/50 dark:border-dark-700/50">

                    <span className="text-xs text-dark-400 dark:text-dark-500">

                      Updated{' '}

                      {formatDistanceToNow(
                        updatedAt,
                        {
                          addSuffix: true
                        }
                      )}

                    </span>

                    {/* Delete */}
                    <button
                      onClick={event => {
                        event.preventDefault();
                        event.stopPropagation();

                        if (!deletingId) {
                          handleDelete(kit._id);
                        }
                      }}
                      disabled={deletingId === kit._id}
                      className="p-2 text-dark-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group-hover:opacity-100 opacity-0 disabled:opacity-50"
                      aria-label="Delete kit"
                    >

                      {deletingId === kit._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}

                    </button>

                  </div>

                </Link>
              );
            })}

          </div>
        )}

      </main>
    </div>
  );
}
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/lib/api';
import { authApi } from '@/lib/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;

  login: (
    email: string,
    password: string
  ) => Promise<void>;

  register: (
    email: string,
    password: string,
    name: string
  ) => Promise<void>;

  logout: () => Promise<void>;

  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({

      user: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false
        }),

      setLoading: (isLoading) =>
        set({
          isLoading
        }),

      /*
       * LOGIN
       *
       * Login creates the JWT cookie on the backend.
       * After successful login, the user becomes authenticated.
       */
      login: async (email, password) => {
        const { data } = await authApi.login(
          email,
          password
        );

        set({
          user: data.user,
          isAuthenticated: true,
          isLoading: false
        });
      },

      /*
       * REGISTER
       *
       * Registration only creates the account.
       * It does NOT keep the user authenticated.
       *
       * After registration, the register page redirects
       * the user to /login.
       */
      register: async (email, password, name) => {
        await authApi.register(
          email,
          password,
          name
        );

        set({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
      },

      /*
       * LOGOUT
       */
      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false
          });
        }
      },

      /*
       * CHECK AUTHENTICATION
       */
      checkAuth: async () => {
        try {
          const { data } = await authApi.me();

          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false
          });
        } catch {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false
          });
        }
      }
    }),

    {
      name: 'auth-storage',

      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
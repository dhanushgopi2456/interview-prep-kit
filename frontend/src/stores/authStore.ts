'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/lib/api';
import { authApi } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
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
      token: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false
        }),

      setToken: (token) => {
        if (typeof window !== 'undefined') {
          if (token) localStorage.setItem('auth_token', token);
          else localStorage.removeItem('auth_token');
        }
        set({ token });
      },

      setLoading: (isLoading) =>
        set({
          isLoading
        }),

      /*
       * LOGIN
       */
      login: async (email, password) => {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('explicitly_logged_out');
        }

        const { data } = await authApi.login(
          email,
          password
        );

        const token = data.token || null;
        if (token && typeof window !== 'undefined') {
          localStorage.setItem('auth_token', token);
        }

        set({
          user: data.user,
          token,
          isAuthenticated: true,
          isLoading: false
        });
      },

      /*
       * REGISTER
       */
      register: async (email, password, name) => {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('explicitly_logged_out');
        }

        const { data } = await authApi.register(
          email,
          password,
          name
        );

        const token = data.token || null;
        if (token && typeof window !== 'undefined') {
          localStorage.setItem('auth_token', token);
        }

        set({
          user: data.user,
          token,
          isAuthenticated: true,
          isLoading: false
        });
      },

      /*
       * LOGOUT
       */
      logout: async () => {
        try {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
          }
          await authApi.logout();
        } finally {
          set({
            user: null,
            token: null,
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
          const token = data.token || (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null);
          if (token && typeof window !== 'undefined') {
            localStorage.setItem('auth_token', token);
          }

          set({
            user: data.user,
            token,
            isAuthenticated: !!data.user,
            isLoading: false
          });
        } catch {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
          }
          set({
            user: null,
            token: null,
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
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
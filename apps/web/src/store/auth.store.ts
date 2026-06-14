'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        set({ user, token });
        if (typeof window !== 'undefined') {
          localStorage.setItem('mithaqyn_token', token);
        }
      },
      clearAuth: () => {
        set({ user: null, token: null });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('mithaqyn_token');
        }
      },
      isAuthenticated: () => !!get().token && !!get().user,
    }),
    {
      name: 'mithaqyn-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    },
  ),
);

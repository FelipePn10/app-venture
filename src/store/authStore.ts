import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/types/auth';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  userName: string | null;
  user: AuthUser | null;
  setAuthData: (payload: {
    token: string;
    userName: string;
    refreshToken?: string | null;
    expiresAt?: string | null;
    user?: AuthUser | null;
  }) => void;
  setUserProfile: (payload: { userName?: string | null; user?: AuthUser | null }) => void;
  clearAuthData: () => void;
  isAuthenticated: () => boolean;
}

function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return false;
  }

  const expiresMs = new Date(expiresAt).getTime();
  return Number.isNaN(expiresMs) ? false : expiresMs <= Date.now();
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      expiresAt: null,
      userName: null,
      user: null,
      setAuthData: ({ token, userName, refreshToken, expiresAt, user }) =>
        set({
          token,
          userName,
          refreshToken: refreshToken ?? null,
          expiresAt: expiresAt ?? null,
          user: user ?? null,
        }),
      setUserProfile: ({ userName, user }) =>
        set((state) => ({
          userName: userName ?? state.userName,
          user: user ?? state.user,
        })),
      clearAuthData: () =>
        set({ token: null, refreshToken: null, expiresAt: null, userName: null, user: null }),
      isAuthenticated: () => {
        const { token, expiresAt } = get();
        return Boolean(token) && !isTokenExpired(expiresAt);
      },
    }),
    {
      name: 'erp-auth-storage',
    },
  ),
);

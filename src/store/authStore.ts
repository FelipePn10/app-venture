import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  userName: string | null;
  setAuthData: (token: string, userName: string) => void;
  clearAuthData: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      userName: null,
      setAuthData: (token, userName) => set({ token, userName }),
      clearAuthData: () => set({ token: null, userName: null }),
      isAuthenticated: () => Boolean(get().token)
    }),
    {
      name: 'erp-auth-storage'
    }
  )
);

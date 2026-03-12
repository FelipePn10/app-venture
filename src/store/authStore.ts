import { create } from 'zustand';

interface AuthState {
  token: string | null;
  userName: string | null;
  setAuthData: (token: string, userName: string) => void;
  clearAuthData: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userName: null,
  setAuthData: (token, userName) => set({ token, userName }),
  clearAuthData: () => set({ token: null, userName: null })
}));

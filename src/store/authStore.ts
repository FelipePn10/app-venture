import { create } from 'zustand';
import { persist, type StateStorage } from 'zustand/middleware';
import type { AuthUser } from '@/types/auth';

/**
 * Onde a sessão é guardada depende do "manter conectado":
 *
 * - **marcado** → `localStorage`: a sessão sobrevive a fechar e reabrir o app,
 *   que é justamente o que a caixa promete;
 * - **desmarcado** → `sessionStorage`: a sessão vale enquanto a janela está
 *   aberta e desaparece ao fechar.
 *
 * A escolha em si mora no `localStorage` (`erp-auth-remember`), porque precisa
 * ser lida ANTES de saber onde está a sessão. O e-mail do último acesso também
 * fica guardado quando a caixa está marcada, para a tela de login vir
 * preenchida e o usuário digitar só a senha quando a sessão expirar de vez.
 */
const STORE_KEY = 'erp-auth-storage';
const REMEMBER_KEY = 'erp-auth-remember';
const LAST_EMAIL_KEY = 'erp-auth-last-email';

/** Toda leitura/escrita é protegida: janela privada e site data bloqueado lançam. */
function comLocal<T>(fn: (s: Storage) => T, padrao: T): T {
  try {
    return fn(window.localStorage);
  } catch {
    return padrao;
  }
}
function comSession<T>(fn: (s: Storage) => T, padrao: T): T {
  try {
    return fn(window.sessionStorage);
  } catch {
    return padrao;
  }
}

export function isRememberMeChosen(): boolean {
  return comLocal((s) => s.getItem(REMEMBER_KEY) === '1', false);
}

export function getRememberedEmail(): string {
  return comLocal((s) => s.getItem(LAST_EMAIL_KEY) ?? '', '');
}

/**
 * Registra a escolha da tela de login e MOVE a sessão para o armazenamento
 * certo. Chamado antes de gravar o token: sem isso o token nasceria no lugar
 * errado e a caixa continuaria sem efeito.
 */
export function setRememberMe(remember: boolean, email?: string): void {
  const atual = comLocal((s) => s.getItem(STORE_KEY), null) ?? comSession((s) => s.getItem(STORE_KEY), null);
  comLocal((s) => s.setItem(REMEMBER_KEY, remember ? '1' : '0'), undefined);
  if (remember) {
    if (email?.trim()) comLocal((s) => s.setItem(LAST_EMAIL_KEY, email.trim()), undefined);
    if (atual) comLocal((s) => s.setItem(STORE_KEY, atual), undefined);
    comSession((s) => s.removeItem(STORE_KEY), undefined);
  } else {
    // Desmarcar apaga o rastro do acesso anterior: nada de sessão nem e-mail
    // sobrando no disco.
    comLocal((s) => s.removeItem(LAST_EMAIL_KEY), undefined);
    if (atual) comSession((s) => s.setItem(STORE_KEY, atual), undefined);
    comLocal((s) => s.removeItem(STORE_KEY), undefined);
  }
}

/** Armazenamento que segue a escolha do usuário, lendo dos dois na dúvida. */
const authStorage: StateStorage = {
  getItem: (name) => {
    const preferido = isRememberMeChosen()
      ? comLocal((s) => s.getItem(name), null)
      : comSession((s) => s.getItem(name), null);
    if (preferido !== null) return preferido;
    // Sessão gravada antes desta mudança (ou logo depois de trocar a escolha)
    // continua valendo: ler dos dois evita derrubar quem já estava conectado.
    return comLocal((s) => s.getItem(name), null) ?? comSession((s) => s.getItem(name), null);
  },
  setItem: (name, value) => {
    if (isRememberMeChosen()) {
      comLocal((s) => s.setItem(name, value), undefined);
      comSession((s) => s.removeItem(name), undefined);
    } else {
      comSession((s) => s.setItem(name, value), undefined);
      comLocal((s) => s.removeItem(name), undefined);
    }
  },
  removeItem: (name) => {
    comLocal((s) => s.removeItem(name), undefined);
    comSession((s) => s.removeItem(name), undefined);
  },
};

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  /** Escolha do "manter conectado" desta sessão, espelhada do backend. */
  rememberMe: boolean;
  userName: string | null;
  user: AuthUser | null;
  setAuthData: (payload: {
    token: string;
    userName: string;
    refreshToken?: string | null;
    expiresAt?: string | null;
    rememberMe?: boolean;
    user?: AuthUser | null;
  }) => void;
  /** Troca só o token/vencimento: é o que a renovação da sessão faz. */
  setSessionToken: (payload: { token: string; expiresAt?: string | null; rememberMe?: boolean }) => void;
  setUserProfile: (payload: { userName?: string | null; user?: AuthUser | null }) => void;
  clearAuthData: () => void;
  isAuthenticated: () => boolean;
  /** Quantos milissegundos faltam para o token vencer (Infinity se não se sabe). */
  millisUntilExpiry: () => number;
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
      rememberMe: false,
      userName: null,
      user: null,
      setAuthData: ({ token, userName, refreshToken, expiresAt, rememberMe, user }) =>
        set({
          token,
          userName,
          refreshToken: refreshToken ?? null,
          expiresAt: expiresAt ?? null,
          rememberMe: rememberMe ?? isRememberMeChosen(),
          user: user ?? null,
        }),
      setSessionToken: ({ token, expiresAt, rememberMe }) =>
        set((state) => ({
          token,
          expiresAt: expiresAt ?? state.expiresAt,
          rememberMe: rememberMe ?? state.rememberMe,
        })),
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
      millisUntilExpiry: () => {
        const { expiresAt } = get();
        if (!expiresAt) return Number.POSITIVE_INFINITY;
        const expiresMs = new Date(expiresAt).getTime();
        return Number.isNaN(expiresMs) ? Number.POSITIVE_INFINITY : expiresMs - Date.now();
      },
    }),
    {
      name: STORE_KEY,
      storage: {
        getItem: (name) => {
          const raw = authStorage.getItem(name);
          return raw ? (JSON.parse(raw as string) as never) : null;
        },
        setItem: (name, value) => authStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => authStorage.removeItem(name),
      },
    },
  ),
);

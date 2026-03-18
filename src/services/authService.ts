import axios from 'axios';
import { httpClient } from '@/services/httpClient';
import type { AuthResponse, LoginPayload, SessionProfileResponse } from '@/types/auth';

const SIMULATED_DELAY_MS = 800;
const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH === 'true';
const AUTH_LOGIN_PATH = import.meta.env.VITE_AUTH_LOGIN_PATH ?? '/auth/login';
const AUTH_ME_PATH = import.meta.env.VITE_AUTH_ME_PATH ?? '/auth/me';
const AUTH_LOGIN_FIELD = import.meta.env.VITE_AUTH_LOGIN_FIELD ?? 'email';

function normalizeAuthResponse(data: AuthResponse): AuthResponse {
  return {
    token: data.token,
    userName: data.userName ?? data.user?.name ?? 'Usuário ERP',
    refreshToken: data.refreshToken,
    expiresAt: data.expiresAt,
    user: data.user,
  };
}

async function simulateLogin(payload: LoginPayload): Promise<AuthResponse> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_DELAY_MS));

  if (!payload.email || !payload.password) {
    throw new Error('Preencha usuário/e-mail e senha para continuar.');
  }

  return {
    token: 'mock-jwt-token',
    userName: 'Usuário ERP',
    user: {
      name: 'Usuário ERP',
      email: payload.email,
      role: 'Administrador',
    },
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
  };
}

async function loginWithApi(payload: LoginPayload): Promise<AuthResponse> {
  const requestPayload = {
    [AUTH_LOGIN_FIELD]: payload.email,
    password: payload.password,
  };

  const response = await httpClient.post<AuthResponse>(AUTH_LOGIN_PATH, requestPayload);
  return normalizeAuthResponse(response.data);
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  return USE_MOCK_AUTH ? simulateLogin(payload) : loginWithApi(payload);
}

export async function fetchSessionProfile(): Promise<SessionProfileResponse | null> {
  if (USE_MOCK_AUTH) {
    return null;
  }

  try {
    const response = await httpClient.get<SessionProfileResponse>(AUTH_ME_PATH);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && [401, 404, 405].includes(error.response?.status ?? 0)) {
      return null;
    }

    throw error;
  }
}

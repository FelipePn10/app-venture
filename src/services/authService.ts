import axios from 'axios';
import { httpClient } from '@/services/httpClient';
import type { AuthResponse, LoginPayload, SessionProfileResponse } from '@/types/auth';

const SIMULATED_DELAY_MS = 800;
const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH === 'true';
const AUTH_LOGIN_PATH = import.meta.env.VITE_AUTH_LOGIN_PATH ?? '/users/login';
const AUTH_ME_PATH = import.meta.env.VITE_AUTH_ME_PATH ?? '';
const AUTH_LOGIN_FIELD = import.meta.env.VITE_AUTH_LOGIN_FIELD ?? 'email';
const AUTH_LOGIN_FALLBACK_FIELDS = [AUTH_LOGIN_FIELD, 'email', 'username', 'login', 'userName'];

function getObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function extractAuthResponse(payload: unknown): AuthResponse {
  const root = getObject(payload);
  const nestedData = getObject(root?.data);
  const user = getObject(root?.user) ?? getObject(nestedData?.user);

  const token =
    getString(root?.token) ??
    getString(root?.accessToken) ??
    getString(root?.access_token) ??
    getString(root?.jwt) ??
    getString(nestedData?.token) ??
    getString(nestedData?.accessToken) ??
    getString(nestedData?.access_token) ??
    getString(nestedData?.jwt);

  if (!token) {
    throw new Error('Resposta de login inválida: token não encontrado.');
  }

  const userName =
    getString(root?.userName) ??
    getString(root?.name) ??
    getString(root?.username) ??
    getString(nestedData?.userName) ??
    getString(nestedData?.name) ??
    getString(nestedData?.username) ??
    getString(user?.name) ??
    getString(user?.username) ??
    'Usuário ERP';

  const userEmail =
    getString(root?.email) ??
    getString(nestedData?.email) ??
    getString(user?.email);

  const userRole =
    getString(root?.role) ??
    getString(nestedData?.role) ??
    getString(user?.role);

  return {
    token,
    userName,
    refreshToken:
      getString(root?.refreshToken) ??
      getString(root?.refresh_token) ??
      getString(nestedData?.refreshToken) ??
      getString(nestedData?.refresh_token),
    expiresAt:
      getString(root?.expiresAt) ??
      getString(root?.expires_at) ??
      getString(nestedData?.expiresAt) ??
      getString(nestedData?.expires_at),
    user: {
      id:
        getString(root?.id) ??
        getString(nestedData?.id) ??
        getString(user?.id),
      name: userName,
      email: userEmail,
      role: userRole,
    },
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

async function tryLoginWithField(field: string, payload: LoginPayload): Promise<AuthResponse> {
  const identifier = payload.email.trim();
  const response = await httpClient.post(AUTH_LOGIN_PATH, {
    [field]: identifier,
    password: payload.password,
  });

  return extractAuthResponse(response.data);
}

async function loginWithApi(payload: LoginPayload): Promise<AuthResponse> {
  let lastError: unknown;

  for (const field of [...new Set(AUTH_LOGIN_FALLBACK_FIELDS)]) {
    try {
      return await tryLoginWithField(field, payload);
    } catch (error) {
      lastError = error;

      if (
        !axios.isAxiosError(error) ||
        ![400, 401, 404, 422].includes(error.response?.status ?? 0)
      ) {
        throw error;
      }
    }
  }

  if (axios.isAxiosError(lastError)) {
    const apiMessage =
      (lastError.response?.data as { message?: string; error?: string } | undefined)?.message ??
      (lastError.response?.data as { message?: string; error?: string } | undefined)?.error;

    throw new Error(apiMessage ?? 'Falha ao autenticar com o backend.');
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Falha ao autenticar com o backend.');
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  return USE_MOCK_AUTH ? simulateLogin(payload) : loginWithApi(payload);
}

export async function fetchSessionProfile(): Promise<SessionProfileResponse | null> {
  if (USE_MOCK_AUTH || !AUTH_ME_PATH.trim()) {
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

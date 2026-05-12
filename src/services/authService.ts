import axios from 'axios';
import { httpClient } from '@/services/httpClient';
import type { AuthResponse, LoginPayload, SessionProfileResponse } from '@/types/auth';

const SIMULATED_DELAY_MS = 800;
const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH === 'true';
const AUTH_LOGIN_PATH = import.meta.env.VITE_AUTH_LOGIN_PATH ?? '/users/login';
const AUTH_ME_PATH = import.meta.env.VITE_AUTH_ME_PATH ?? '';
const AUTH_LOGIN_FIELD = import.meta.env.VITE_AUTH_LOGIN_FIELD ?? 'email';
const AUTH_LOGIN_FALLBACK_FIELDS = [AUTH_LOGIN_FIELD, 'email', 'username', 'login', 'userName'];


/**
 * Deep-search flattens an unknown payload into a flat string→string map.
 * Keys are built as lowercased dot-separated paths (e.g. "data.user.name").
 * Only scalar values under depth 12 are collected to avoid cyclic/giant payloads.
 */
function flattenPayload(value: unknown, prefix = '', depth = 0): Record<string, string> {
  const out: Record<string, string> = {};
  if (depth > 12 || value === null || value === undefined) return out;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) out[prefix] = trimmed;
    return out;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    out[prefix] = String(value);
    return out;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      Object.assign(out, flattenPayload(value[i], `${prefix}[${i}]`, depth + 1));
    }
    return out;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k.toLowerCase()}` : k.toLowerCase();
      if (v === null || v === undefined) continue;
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        const s = typeof v === 'string' ? v.trim() : String(v);
        if (s) out[path] = s;
      } else {
        Object.assign(out, flattenPayload(v, path, depth + 1));
      }
    }
  }

  return out;
}

/** Search a flat map for any key ending with one of the candidates, returning the first match. */
function findInFlat(flat: Record<string, string>, ...candidates: string[]): string | undefined {
  for (const c of candidates) {
    const target = c.toLowerCase();
    // Exact match
    if (flat[target] && flat[target].length > 1) return flat[target];
    // Suffix match (e.g. any path ending with .name or .nome)
    for (const [path, val] of Object.entries(flat)) {
      if ((path === target || path.endsWith(`.${target}`)) && val.length > 1) return val;
    }
  }
  return undefined;
}

function extractAuthResponse(payload: unknown): AuthResponse {
  const flat = flattenPayload(payload);

  const token =
    flat['token'] ??
    flat['accesstoken'] ??
    flat['access_token'] ??
    flat['jwt'] ??
    findInFlat(flat, 'token', 'accesstoken', 'access_token', 'jwt');

  if (!token) {
    throw new Error('Resposta de login inválida: token não encontrado.');
  }

  const NAME_CANDIDATES = [
    'username', 'name', 'nome', 'nom_usuario', 'nomusuario',
    'displayname', 'display_name', 'fullname', 'full_name',
    'login', 'apelido',
  ];

  const userName = findInFlat(flat, ...NAME_CANDIDATES) ?? 'Usuário ERP';

  const userEmail =
    findInFlat(flat, 'email', 'e-mail') ??
    flat['email'];

  const userRole =
    findInFlat(flat, 'role', 'perfil', 'tipo', 'cargo', 'funcao', 'type') ??
    flat['role'] ??
    flat['perfil'];

  return {
    token,
    userName,
    refreshToken:
      flat['refreshtoken'] ??
      flat['refresh_token'] ??
      findInFlat(flat, 'refreshtoken', 'refresh_token'),
    expiresAt:
      flat['expiresat'] ??
      flat['expires_at'] ??
      findInFlat(flat, 'expiresat', 'expires_at'),
    user: {
      id:
        flat['id'] ??
        flat['userid'] ??
        flat['user_id'] ??
        findInFlat(flat, 'id', 'userid', 'user_id'),
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
  const mePath = AUTH_ME_PATH.trim() || '/users/me';

  if (USE_MOCK_AUTH) return null;

  try {
    const response = await httpClient.get<unknown>(mePath);
    const flat = flattenPayload(response.data);

    const NAME_CANDIDATES = [
      'username', 'name', 'nome', 'nom_usuario', 'nomusuario',
      'displayname', 'display_name', 'fullname', 'full_name',
      'login', 'apelido',
    ];

    const fetchedName = findInFlat(flat, ...NAME_CANDIDATES);
    const fetchedEmail =
      findInFlat(flat, 'email', 'e-mail') ?? flat['email'];
    const fetchedRole =
      findInFlat(flat, 'role', 'perfil', 'tipo', 'cargo', 'funcao') ??
      flat['role'] ??
      flat['perfil'];

    if (fetchedName || fetchedEmail || fetchedRole) {
      return {
        userName: fetchedName,
        user: {
          id: flat['id'] ?? flat['userid'] ?? findInFlat(flat, 'id', 'userid', 'user_id'),
          name: fetchedName ?? '',
          email: fetchedEmail,
          role: fetchedRole,
        },
      };
    }

    return null;
  } catch (error) {
    if (axios.isAxiosError(error) && [401, 404, 405, 403].includes(error.response?.status ?? 0)) {
      return null;
    }
    throw error;
  }
}

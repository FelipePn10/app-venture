import axios from 'axios';
import { httpClient } from '@/services/httpClient';
import { useAuthStore } from '@/store/authStore';

/**
 * Shared helpers for service modules.
 *
 * Backends in this project answer inconsistently — the same field may arrive as
 * snake_case, camelCase or PascalCase (Go structs without json tags). These
 * defensive parsers normalize that, and the unwrap helpers tolerate envelopes
 * such as `{ data: [...] }`, `{ items: [...] }` or `{ result: {...} }`.
 *
 * `httpClient` is re-exported so screens/services can import everything they
 * need from a single module.
 */
export { httpClient };

export type Obj = Record<string, unknown>;

/**
 * UUID do usuário logado (claim `sub` do JWT) — vários endpoints exigem
 * `created_by`/`updated_by`/`calculated_by` no corpo. Decodifica o token do
 * authStore (mesma fonte do interceptor do httpClient). Fallback: '' (o backend
 * rejeita, surfando o erro, em vez de mascarar com um UUID falso).
 */
export function currentUserId(): string {
  const { user, token } = useAuthStore.getState();
  if (user?.id) return user.id;
  if (!token) return '';
  try {
    const part = token.split('.')[1];
    if (!part) return '';
    const p = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as Obj;
    return String(p['sub'] ?? p['id'] ?? p['user_id'] ?? '');
  } catch { return ''; }
}

// ─── Field pickers ──────────────────────────────────────────────────────────

/** Returns the first non-null value found across the given keys. */
export function pick<T>(obj: Obj, ...keys: string[]): T | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
}

/** Reads a string value from any of the given keys (coerces numbers). */
export function parseStr(obj: Obj, ...keys: string[]): string {
  const v = pick<unknown>(obj, ...keys);
  return v != null ? String(v) : '';
}

/** Reads a numeric value from any of the given keys (defaults to 0). */
export function parseNum(obj: Obj, ...keys: string[]): number {
  const v = pick<unknown>(obj, ...keys);
  if (v === undefined || v === null) return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

/** Reads a boolean value from any of the given keys (tolerant of 0/1, "true"/"false"). */
export function parseBool(obj: Obj, ...keys: string[]): boolean {
  const v = pick<unknown>(obj, ...keys);
  if (v === undefined || v === null) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 's' || s === 'sim' || s === 'y' || s === 'yes' || s === 't';
  }
  return Boolean(v);
}

// ─── Envelope unwrappers ────────────────────────────────────────────────────

const ARRAY_ENVELOPE_KEYS = ['data', 'items', 'results', 'list', 'records', 'rows', 'content'];
const OBJECT_ENVELOPE_KEYS = ['data', 'result', 'item', 'record', 'value'];

/**
 * Returns the array out of a response, tolerating common envelopes. If the
 * payload is an error envelope (`{ message }` / `{ error }`) the message is
 * thrown so callers surface it; otherwise an empty array is returned.
 */
export function unwrapArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Obj;
    for (const key of ARRAY_ENVELOPE_KEYS) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
    const msg = pick<string>(obj, 'message', 'error', 'msg');
    if (msg && typeof msg === 'string') throw new Error(msg);
  }
  return [];
}

/**
 * Returns the object out of a response, tolerating common single-record
 * envelopes. Non-object payloads yield an empty object.
 */
export function unwrapObject(raw: unknown): Obj {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Obj;
    for (const key of OBJECT_ENVELOPE_KEYS) {
      const inner = obj[key];
      if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
        return inner as Obj;
      }
    }
    return obj;
  }
  return {};
}

// ─── Error formatting ───────────────────────────────────────────────────────

/** Extracts a human-readable message from an axios/Error/unknown failure. */
export function errMessage(e: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as
      | { message?: string; error?: string; detail?: string; errors?: unknown }
      | string
      | undefined;
    if (typeof data === 'string' && data.trim()) return data;
    if (data && typeof data === 'object') {
      const msg = data.message ?? data.error ?? data.detail;
      if (msg && typeof msg === 'string') return msg;
    }
    if (e.message) return e.message;
  }
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === 'string' && e.trim()) return e;
  return fallback;
}

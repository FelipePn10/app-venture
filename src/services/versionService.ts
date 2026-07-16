import { getVersion } from '@tauri-apps/api/app';
import { isTauri } from '@tauri-apps/api/core';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { httpClient } from '@/services/httpClient';

export interface BackendVersion {
  version: string;
  min_client: string;
}

export function compareVersions(left: string, right: string): number {
  const parse = (value: string): number[] => value.replace(/^v/, '').split('-', 1)[0].split('.').map((part) => Number(part));
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < Math.max(a.length, b.length, 3); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference > 0 ? 1 : -1;
  }
  return 0;
}

export async function getBackendVersion(): Promise<BackendVersion> {
  const response = await httpClient.get<BackendVersion>('/api/version');
  return response.data;
}

export async function getClientVersion(): Promise<string> {
  return isTauri() ? getVersion() : 'dev';
}

export async function checkDesktopUpdate(): Promise<Update | null> {
  if (!isTauri()) return null;
  return check();
}

export async function installDesktopUpdate(update: Update): Promise<void> {
  await update.downloadAndInstall();
  await relaunch();
}

export interface ReleaseNote {
  version: string;
  name: string;
  notes: string;
  date: string;
  url: string;
}

// Notas de versão do app desktop (o que cada atualização traz). Vem direto da
// GitHub Releases API (envia CORS: *); a origem precisa estar no connect-src da
// CSP (ver tauri.conf.json). É o mesmo repositório que o updater consulta.
const RELEASES_API =
  'https://api.github.com/repos/FelipePn10/app-venture/releases?per_page=20';

export async function fetchReleaseNotes(): Promise<ReleaseNote[]> {
  const res = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GitHub respondeu ${res.status}`);
  const data = (await res.json()) as Array<{
    tag_name?: string;
    name?: string;
    body?: string;
    published_at?: string;
    html_url?: string;
    draft?: boolean;
  }>;
  return data
    .filter((r) => !r.draft)
    .map((r) => ({
      version: (r.tag_name ?? '').replace(/^v/, ''),
      name: r.name || r.tag_name || '',
      notes: (r.body ?? '').trim(),
      date: r.published_at ?? '',
      url: r.html_url ?? '',
    }));
}

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

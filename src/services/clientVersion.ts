import { getVersion } from '@tauri-apps/api/app';
import { isTauri } from '@tauri-apps/api/core';

let clientVersionPromise: Promise<string> | null = null;

export function getClientVersion(): Promise<string> {
  if (!clientVersionPromise) {
    clientVersionPromise = isTauri() ? getVersion() : Promise.resolve('dev');
  }
  return clientVersionPromise;
}

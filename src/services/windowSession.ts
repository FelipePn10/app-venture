import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { emitTo, listen } from '@tauri-apps/api/event';
import { useAuthStore } from '@/store/authStore';

const REQUEST = 'erp:window-session-request';
const RESPONSE = 'erp:window-session-response';

type Session = Pick<ReturnType<typeof useAuthStore.getState>,
  'token' | 'expiresAt' | 'refreshToken' | 'rememberMe' | 'userName' | 'user'>;

/** The main window lends its current in-memory session only to ERP routine windows. */
export function listenForWindowSessions(): Promise<() => void> {
  if (!isTauri() || getCurrentWindow().label !== 'main') return Promise.resolve(() => {});
  return listen<{ nonce: string; label: string }>(REQUEST, (event) => {
    const label = event.payload?.label;
    if (!/^screen-[a-z0-9-]+$/.test(label) || !event.payload?.nonce) return;
    void WebviewWindow.getByLabel(label).then((target) => {
      if (!target) return;
      const state = useAuthStore.getState();
      if (!state.isAuthenticated()) return;
      const { token, expiresAt, refreshToken, rememberMe, userName, user } = state;
      return emitTo(label, RESPONSE, {
        nonce: event.payload.nonce,
        session: { token, expiresAt, refreshToken, rememberMe, userName, user },
      });
    }).catch(() => {});
  });
}

/** SessionStorage is per webview, so a new routine needs a one-time handoff. */
export async function receiveWindowSession(): Promise<Session | null> {
  if (!isTauri() || !getCurrentWindow().label.startsWith('screen-')) return null;
  const label = getCurrentWindow().label;
  const nonce = crypto.randomUUID();
  return new Promise<Session | null>((resolve) => {
    let finished = false;
    let unlisten: (() => void) | undefined;
    const finish = (session: Session | null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      unlisten?.();
      resolve(session);
    };
    const timer = setTimeout(() => finish(null), 4000);
    void (async () => {
      try {
        unlisten = await listen<{ nonce: string; session: Session }>(RESPONSE, (event) => {
          if (event.payload?.nonce !== nonce) return;
          finish(event.payload.session);
        });
        if (finished) { unlisten(); return; }
        await emitTo('main', REQUEST, { nonce, label });
      } catch {
        finish(null);
      }
    })();
  });
}

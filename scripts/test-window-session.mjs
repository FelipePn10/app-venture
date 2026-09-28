import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/services/windowSession.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const listeners = new Map();
const session = {
  token: 'valid-token', expiresAt: new Date(Date.now() + 3600000).toISOString(),
  refreshToken: null, rememberMe: false, userName: 'Operador', user: { role: 'USER' },
};
const store = { ...session, isAuthenticated: () => true };

function load(label) {
  const module = { exports: {} };
  const require = (name) => {
    if (name === '@tauri-apps/api/core') return { isTauri: () => true };
    if (name === '@tauri-apps/api/window') return { getCurrentWindow: () => ({ label }) };
    if (name === '@tauri-apps/api/webviewWindow') return {
      WebviewWindow: { getByLabel: async (target) => target === 'screen-vent0210' ? {} : null },
    };
    if (name === '@tauri-apps/api/event') return {
      listen: async (event, callback) => {
        const key = `${label}:${event}`;
        listeners.set(key, callback);
        return () => listeners.delete(key);
      },
      emitTo: async (target, event, payload) => {
        listeners.get(`${target}:${event}`)?.({ payload });
      },
    };
    if (name === '@/store/authStore') return { useAuthStore: { getState: () => store } };
    throw new Error(`Unexpected dependency: ${name}`);
  };
  vm.runInNewContext(compiled, { module, exports: module.exports, require, crypto, setTimeout, clearTimeout });
  return module.exports;
}

const main = load('main');
const screen = load('screen-vent0210');
const stop = await main.listenForWindowSessions();
const received = await screen.receiveWindowSession();
assert.equal(received?.token, session.token, 'routine window should receive the active session');
assert.equal(received?.rememberMe, false, 'handoff must preserve nonpersistent sessions');
assert.equal(listeners.has('screen-vent0210:erp:window-session-response'), false, 'response listener should be removed');
stop();
console.log('Window session handoff OK');

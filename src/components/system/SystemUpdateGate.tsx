import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { Update } from '@tauri-apps/plugin-updater';
import {
  checkDesktopUpdate,
  compareVersions,
  getBackendVersion,
  getClientVersion,
  installDesktopUpdate,
} from '@/services/versionService';

type GateState = 'checking' | 'ready' | 'blocked' | 'unavailable';

// Cada tela do ERP abre em uma WebviewWindow própria (label "screen-*") que
// recarrega este componente. A trava de compatibilidade só faz sentido uma vez,
// na janela principal ("main"); as demais já foram validadas no login. Sem isto,
// toda tela reexibiria o "Validando…/Atualização necessária" por alguns segundos.
function isMainGateWindow(): boolean {
  if (!isTauri()) return true; // navegador/dev: trata como janela principal
  try {
    return getCurrentWindow().label === 'main';
  } catch {
    return true;
  }
}

export function SystemUpdateGate({ children }: { children: ReactNode }): JSX.Element {
  const gated = useMemo(() => isMainGateWindow(), []);
  const [state, setState] = useState<GateState>(gated ? 'checking' : 'ready');
  const [message, setMessage] = useState('Validando compatibilidade com o servidor…');
  const [update, setUpdate] = useState<Update | null>(null);
  const [installing, setInstalling] = useState(false);

  const validate = useCallback(async () => {
    setState('checking');
    setMessage('Validando compatibilidade com o servidor…');
    // A trava de compatibilidade só é obrigatória no app de PRODUÇÃO. Em
    // desenvolvimento e na demo o backend pode estar fora do ar (ou local), e
    // isso não deve impedir o uso/teste do aplicativo.
    const enforce = import.meta.env.MODE === 'production';
    try {
      const [backend, client] = await Promise.all([getBackendVersion(), getClientVersion()]);
      const incompatible =
        client !== 'dev' && backend.min_client !== 'dev' && compareVersions(client, backend.min_client) < 0;
      if (incompatible && enforce) {
        setState('blocked');
        setMessage(`Este aplicativo é v${client}. O servidor exige no mínimo v${backend.min_client}.`);
      } else {
        if (incompatible) {
          console.warn(
            `SystemUpdateGate: cliente v${client} abaixo do min_client v${backend.min_client} (ignorado fora de produção).`,
          );
        }
        setState('ready');
      }
      try {
        setUpdate(await checkDesktopUpdate());
      } catch {
        // A indisponibilidade do catálogo não impede uma versão compatível de operar.
      }
    } catch {
      if (enforce) {
        setState('unavailable');
        setMessage('Não foi possível validar a versão do servidor. Verifique a conexão e tente novamente.');
      } else {
        // Dev/demo: seguir sem travar mesmo com o backend inacessível.
        setState('ready');
      }
    }
  }, []);

  useEffect(() => {
    if (gated) void validate();
  }, [gated, validate]);

  async function install(): Promise<void> {
    if (!update) return;
    setInstalling(true);
    try {
      await installDesktopUpdate(update);
    } catch {
      setInstalling(false);
      setMessage('A instalação falhou. Nenhuma alteração insegura foi aplicada; tente novamente.');
    }
  }

  // Janelas de tela (screen-*) não passam pela trava: renderizam direto.
  if (!gated) return <>{children}</>;

  if (state !== 'ready') {
    return (
      <main className="version-gate" role="alert" aria-live="assertive">
        <section className="version-card">
          <span className="version-mark">V</span>
          <h1>{state === 'checking' ? 'Preparando o VentureERP' : 'Atualização necessária'}</h1>
          <p>{message}</p>
          {state !== 'checking' && (
            <div className="version-actions">
              {update && <button type="button" onClick={() => void install()} disabled={installing}>{installing ? 'Instalando…' : `Instalar v${update.version}`}</button>}
              <button type="button" className="secondary" onClick={() => void validate()} disabled={installing}>Tentar novamente</button>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <>
      {children}
      {update && (
        <aside className="desktop-update" role="dialog" aria-label="Atualização do aplicativo">
          <strong>Atualização disponível — v{update.version}</strong>
          <span>O pacote é verificado pela assinatura oficial antes da instalação.</span>
          <div>
            <button type="button" onClick={() => void install()} disabled={installing}>{installing ? 'Instalando…' : 'Instalar agora'}</button>
            <button type="button" className="secondary" onClick={() => setUpdate(null)} disabled={installing}>Depois</button>
          </div>
        </aside>
      )}
    </>
  );
}

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Update } from '@tauri-apps/plugin-updater';
import {
  checkDesktopUpdate,
  compareVersions,
  getBackendVersion,
  getClientVersion,
  installDesktopUpdate,
} from '@/services/versionService';

type GateState = 'checking' | 'ready' | 'blocked' | 'unavailable';

export function SystemUpdateGate({ children }: { children: ReactNode }): JSX.Element {
  const [state, setState] = useState<GateState>('checking');
  const [message, setMessage] = useState('Validando compatibilidade com o servidor…');
  const [update, setUpdate] = useState<Update | null>(null);
  const [installing, setInstalling] = useState(false);

  const validate = useCallback(async () => {
    setState('checking');
    setMessage('Validando compatibilidade com o servidor…');
    try {
      const [backend, client] = await Promise.all([getBackendVersion(), getClientVersion()]);
      if (client !== 'dev' && backend.min_client !== 'dev' && compareVersions(client, backend.min_client) < 0) {
        setState('blocked');
        setMessage(`Este aplicativo é v${client}. O servidor exige no mínimo v${backend.min_client}.`);
      } else {
        setState('ready');
      }
      try {
        setUpdate(await checkDesktopUpdate());
      } catch {
        // A indisponibilidade do catálogo não impede uma versão compatível de operar.
      }
    } catch {
      setState('unavailable');
      setMessage('Não foi possível validar a versão do servidor. Verifique a conexão e tente novamente.');
    }
  }, []);

  useEffect(() => { void validate(); }, [validate]);

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

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  dismissDownloadNotice,
  getDownloadNotice,
  subscribeDownloadNotice,
} from '@/services/fileDownload';

const CheckIcon = (): JSX.Element => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const AlertIcon = (): JSX.Element => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 5v4.5M8 11.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

/**
 * Confirmação de download, montada UMA vez na raiz do app.
 *
 * Lê um store de módulo (`fileDownload.ts`) via `useSyncExternalStore`: quando
 * ninguém baixou nada, `notice` é `null` e o componente devolve `null` — nenhum
 * nó no DOM, nenhum timer, nenhum re-render em outro lugar da árvore. Só este
 * componente re-renderiza quando um download termina.
 *
 * Sem animação de propósito: o aviso aparece e some por conta própria em ~5s,
 * sem transição, sem reflow contínuo e sem custo de composição.
 */
export function DownloadNotice(): JSX.Element | null {
  const notice = useSyncExternalStore(subscribeDownloadNotice, getDownloadNotice, () => null);
  if (!notice) return null;

  const ok = notice.kind === 'success';
  return createPortal(
    <div className={`erp-dl-notice ${notice.kind}`} role="status" aria-live="polite">
      <span className="erp-dl-notice-icon">{ok ? <CheckIcon /> : <AlertIcon />}</span>
      <div className="erp-dl-notice-body">
        <span className="erp-dl-notice-msg">{notice.message}</span>
        {notice.filename && <span className="erp-dl-notice-file">{notice.filename}</span>}
      </div>
      <button
        type="button"
        className="erp-dl-notice-close"
        onClick={dismissDownloadNotice}
        aria-label="Fechar aviso"
      >
        ×
      </button>
    </div>,
    document.body,
  );
}

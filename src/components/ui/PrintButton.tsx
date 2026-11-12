import { useState } from 'react';
import { errMessage } from '@/services/fiscalShared';
import { notifyDownload } from '@/services/fileDownload';

export interface PrintButtonProps {
  /** Gera e baixa o PDF; o aviso de download sai do próprio serviço. */
  onPrint: () => Promise<unknown>;
  label?: string;
  title?: string;
  disabled?: boolean;
  small?: boolean;
  /** Recebe a mensagem de erro, para telas que mostram feedback próprio. */
  onError?: (message: string) => void;
}

/**
 * Botão de impressão de documento (PDF com layout próprio, gerado no backend).
 * Cuida do "gerando…" e do erro sozinho, para não misturar com o estado de
 * carregamento da tela.
 */
export function PrintButton({ onPrint, label = 'Imprimir', title, disabled, small, onError }: PrintButtonProps) {
  const [busy, setBusy] = useState(false);
  const click = async () => {
    setBusy(true);
    try {
      await onPrint();
    } catch (e) {
      const message = errMessage(e, 'Não foi possível gerar o PDF.');
      notifyDownload('error', message);
      onError?.(message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      className={`erp-btn${small ? ' erp-btn-sm' : ''}`}
      onClick={() => void click()}
      disabled={disabled || busy}
      title={title}
    >
      {busy && <span className="erp-spin" />}
      {busy ? 'Gerando PDF…' : label}
    </button>
  );
}

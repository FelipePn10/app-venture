import { useCallback, useState } from 'react';
import { EXPORT_FORMATS, exportReport, type ExportFormat, type ExportPayload } from '@/services/reportExport';
import { errMessage } from '@/services/fiscalShared';

export type ExportToast = { type: 'success' | 'error'; message: string } | null;

export interface UseReportExport {
  /** Formato em exportação no momento (para spinner/disable), ou null. */
  exporting: ExportFormat | null;
  /** Mensagem transitória de sucesso/erro. */
  toast: ExportToast;
  clearToast: () => void;
  /** Faz o POST de exportação e dispara o download. Não relança — surfa via toast. */
  run: (format: ExportFormat, payload: ExportPayload) => Promise<void>;
}

/**
 * Gerencia o ciclo de exportação de uma tela: estado de carregando, toast de
 * sucesso/erro e a chamada ao backend. Reutilizável por qualquer listagem/relatório.
 */
export function useReportExport(): UseReportExport {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [toast, setToast] = useState<ExportToast>(null);

  const clearToast = useCallback(() => setToast(null), []);

  const run = useCallback(async (format: ExportFormat, payload: ExportPayload) => {
    if (!payload.rows.length) {
      setToast({ type: 'error', message: 'Nada para exportar — gere/filtre os dados primeiro.' });
      return;
    }
    const label = EXPORT_FORMATS.find((f) => f.format === format)?.label ?? format.toUpperCase();
    setExporting(format);
    setToast(null);
    try {
      await exportReport(format, payload);
      setToast({ type: 'success', message: `Exportação para ${label} concluída.` });
    } catch (e) {
      setToast({ type: 'error', message: errMessage(e, 'Falha ao exportar o relatório.') });
    } finally {
      setExporting(null);
    }
  }, []);

  return { exporting, toast, clearToast, run };
}

import { useCallback, useState } from 'react';
import { EXPORT_FORMATS, exportReport, type ExportFormat, type ExportPayload } from '@/services/reportExport';
import { errMessage } from '@/services/fiscalShared';
import { notifyDownload } from '@/services/fileDownload';

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
      const message = 'Nada para exportar — gere/filtre os dados primeiro.';
      setToast({ type: 'error', message });
      notifyDownload('error', message);
      return;
    }
    const label = EXPORT_FORMATS.find((f) => f.format === format)?.label ?? format.toUpperCase();
    setExporting(format);
    setToast(null);
    try {
      const filename = await exportReport(format, payload);
      setToast({ type: 'success', message: `Exportação para ${label} concluída.` });
      notifyDownload('success', `Exportação para ${label} concluída — o arquivo está na sua pasta de downloads.`, filename);
    } catch (e) {
      const message = errMessage(e, 'Falha ao exportar o relatório.');
      setToast({ type: 'error', message });
      notifyDownload('error', message);
    } finally {
      setExporting(null);
    }
  }, []);

  return { exporting, toast, clearToast, run };
}

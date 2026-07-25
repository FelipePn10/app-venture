import { httpClient } from '@/services/fiscalShared';
import { downloadBlob } from '@/services/fileDownload';

/**
 * Exportação genérica de relatórios (`POST /api/reports/export?format=xlsx|pdf|csv`).
 * O front envia as linhas que já exibe (título/colunas/linhas) e recebe o arquivo.
 * Serve para dar botão de exportação a QUALQUER tela sem rota dedicada.
 */
export interface ReportTable {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: string[][];
}

export async function exportReport(table: ReportTable, fmt: 'xlsx' | 'pdf' | 'csv'): Promise<void> {
  const { data } = await httpClient.post('/api/reports/export', table, { params: { format: fmt }, responseType: 'blob' });
  const name = (table.title || 'relatorio').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  downloadBlob(data as Blob, `${name || 'relatorio'}.${fmt}`);
}

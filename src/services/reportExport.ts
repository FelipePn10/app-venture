import { httpClient } from '@/services/httpClient';
import { useAuthStore } from '@/store/authStore';

/**
 * Exportação genérica de relatórios/listagens.
 *
 * Contrato do backend:
 *   POST /api/reports/export?format=pdf|xlsx|csv|docx
 *   body: { title, subtitle?, filename?, columns[], rows[][], meta? }
 *   resposta: arquivo binário (Content-Disposition: attachment; filename="...").
 *
 * O cabeçalho/rodapé profissional (logo, razão social, CNPJ, paginação, usuário)
 * é montado no SERVIDOR — o front só envia título, colunas, linhas e metadados.
 */

export type ExportFormat = 'pdf' | 'xlsx' | 'csv' | 'docx';

export type ExportCell = string | number | null | undefined;

export interface ExportPayload {
  title: string;
  subtitle?: string;
  filename?: string;
  columns: string[];
  rows: ExportCell[][];
  meta?: Record<string, string>;
}

export const EXPORT_FORMATS: { format: ExportFormat; label: string; ext: string }[] = [
  { format: 'pdf', label: 'PDF', ext: 'pdf' },
  { format: 'xlsx', label: 'Excel (.xlsx)', ext: 'xlsx' },
  { format: 'docx', label: 'Word (.docx)', ext: 'docx' },
  { format: 'csv', label: 'CSV', ext: 'csv' },
];

/** Papéis autorizados a exportar. */
const ALLOWED_ROLES = ['ADMIN', 'USER'];

/** Decodifica o claim `role` do JWT (o backend o coloca lá; o /login só devolve o token). */
function roleFromJwt(token: string | null): string | undefined {
  if (!token) return undefined;
  const part = token.split('.')[1];
  if (!part) return undefined;
  try {
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json) as Record<string, unknown>;
    const role = claims.role ?? claims.perfil ?? claims.type;
    return typeof role === 'string' ? role.toUpperCase() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Pode exportar? Exige sessão válida e papel ADMIN/USER. Se o papel não puder ser
 * determinado (token sem claim), libera — todo usuário autenticado da demo é ADMIN/USER.
 */
export function canExport(): boolean {
  const { token, user } = useAuthStore.getState();
  if (!token) return false;
  const role = (user?.role ?? roleFromJwt(token))?.toUpperCase();
  if (!role) return true;
  return ALLOWED_ROLES.includes(role);
}

/** Extrai o nome do arquivo do header Content-Disposition, com fallback. */
function filenameFromDisposition(disposition: string | undefined, fallback: string): string {
  if (!disposition) return fallback;
  const star = /filename\*=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(disposition);
  if (star?.[1]) return decodeURIComponent(star[1]);
  const plain = /filename=["']?([^"';]+)["']?/i.exec(disposition);
  return plain?.[1] ?? fallback;
}

/** Dispara o download de um Blob no navegador. */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoga após o tick para garantir que o download iniciou.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Envia a tabela para o backend, recebe o arquivo e dispara o download.
 * Lança em caso de 4xx/5xx (o chamador trata com toast).
 */
export async function exportReport(format: ExportFormat, payload: ExportPayload): Promise<void> {
  const ext = EXPORT_FORMATS.find((f) => f.format === format)?.ext ?? format;
  const fallbackName = `${payload.filename || 'relatorio'}.${ext}`;

  let response;
  try {
    response = await httpClient.post('/api/reports/export', payload, {
      params: { format },
      responseType: 'blob',
    });
  } catch (e) {
    // Quando responseType=blob, o corpo de erro vem como Blob — tenta extrair a mensagem.
    const blob = (e as { response?: { data?: unknown } })?.response?.data;
    if (blob instanceof Blob) {
      try {
        const text = await blob.text();
        const parsed = JSON.parse(text) as { error?: string; message?: string };
        throw new Error(parsed.error ?? parsed.message ?? 'Falha ao exportar o relatório.');
      } catch (inner) {
        if (inner instanceof Error && inner.message !== 'Unexpected end of JSON input') throw inner;
      }
    }
    throw e instanceof Error ? e : new Error('Falha ao exportar o relatório.');
  }

  const filename = filenameFromDisposition(
    response.headers?.['content-disposition'] as string | undefined,
    fallbackName,
  );
  triggerDownload(response.data as Blob, filename);
}

/**
 * Download de arquivos + aviso de conclusão.
 *
 * Antes cada serviço/tela repetia a dança do `<a download>` e nenhuma delas dava
 * retorno ao usuário: o arquivo caía na pasta de downloads em silêncio e a pessoa
 * ficava sem saber se deu certo. Aqui centralizamos as duas coisas.
 *
 * O aviso é um **store de módulo** com lista de assinantes — não é Context e não
 * envolve a árvore de componentes. Só o `<DownloadNotice>` (montado uma vez na
 * raiz) reage, e ele renderiza `null` enquanto não há nada a mostrar: ocioso,
 * custa zero DOM e zero re-render. Sem animação, sem biblioteca.
 */

export type DownloadNoticeKind = 'success' | 'error' | 'info';

export interface DownloadNotice {
  id: number;
  kind: DownloadNoticeKind;
  message: string;
  /** Nome do arquivo, quando houver — a tela mostra em destaque. */
  filename?: string;
}

/** Quanto tempo o aviso fica na tela antes de sair sozinho. */
const AUTO_DISMISS_MS = 5000;

let current: DownloadNotice | null = null;
let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Assina mudanças do aviso (usado por `useSyncExternalStore`). */
export function subscribeDownloadNotice(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Aviso atual — referência estável enquanto nada muda. */
export function getDownloadNotice(): DownloadNotice | null {
  return current;
}

export function dismissDownloadNotice(): void {
  if (timer) clearTimeout(timer);
  timer = undefined;
  if (current === null) return;
  current = null;
  emit();
}

/**
 * Publica um aviso. Um novo substitui o anterior — a intenção é confirmar a
 * última ação do usuário, não empilhar histórico.
 */
export function notifyDownload(kind: DownloadNoticeKind, message: string, filename?: string): void {
  if (timer) clearTimeout(timer);
  current = { id: ++seq, kind, message, filename };
  emit();
  timer = setTimeout(dismissDownloadNotice, AUTO_DISMISS_MS);
}

/** Extrai o nome do arquivo do header `Content-Disposition`, com fallback. */
export function filenameFromDisposition(disposition: string | undefined, fallback: string): string {
  if (!disposition) return fallback;
  const star = /filename\*=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(disposition);
  if (star?.[1]) {
    try { return decodeURIComponent(star[1]); } catch { return star[1]; }
  }
  const plain = /filename=["']?([^"';]+)["']?/i.exec(disposition);
  return plain?.[1] ?? fallback;
}

/**
 * Dispara o download de um Blob e confirma ao usuário.
 *
 * Passe `notify: false` quando o chamador já emite a própria mensagem (evita
 * dois avisos para a mesma ação).
 */
export function downloadBlob(blob: Blob, filename: string, options: { notify?: boolean } = {}): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoga fora do tick atual para garantir que o download já começou.
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  if (options.notify !== false) {
    notifyDownload('success', 'Download concluído — o arquivo está na sua pasta de downloads.', filename);
  }
}

/** Mesmo que {@link downloadBlob}, resolvendo o nome pelo `Content-Disposition`. */
export function downloadResponse(
  data: Blob,
  headers: Record<string, unknown> | undefined,
  fallbackName: string,
  options: { notify?: boolean } = {},
): string {
  const filename = filenameFromDisposition(
    headers?.['content-disposition'] as string | undefined,
    fallbackName,
  );
  downloadBlob(data, filename, options);
  return filename;
}

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReportExport } from '@/hooks/useReportExport';
import {
  EXPORT_FORMATS,
  canExport,
  type ExportCell,
  type ExportFormat,
} from '@/services/reportExport';

/** Tabela montada pela tela no momento do clique (todas as linhas filtradas). */
export interface ExportTable {
  columns: string[];
  rows: ExportCell[][];
  subtitle?: string;
  meta?: Record<string, string>;
}

export interface ExportButtonProps {
  /** Título do relatório (vai no cabeçalho gerado pelo backend). */
  title: string;
  /** Nome base do arquivo (sem extensão). */
  filename: string;
  /**
   * Monta a tabela a exportar a partir do estado ATUAL da tela. Opcional: se
   * omitido, o botão lê a tabela `.fsc-table` visível na própria tela (todas as
   * linhas do resultado, já formatadas em pt-BR), ignorando a coluna de "Ações".
   * Use `build` apenas quando precisar de colunas/linhas diferentes do exibido.
   */
  build?: () => ExportTable | null;
  /** Subtítulo automático (período/filtros) quando usando o scrape padrão. */
  subtitle?: string;
  /** Metadados de contexto (filtros/período) quando usando o scrape padrão. */
  meta?: Record<string, string>;
  disabled?: boolean;
  /** Formatos oferecidos (padrão: PDF, Excel, Word, CSV). */
  formats?: ExportFormat[];
  /** Rótulo do botão (padrão "Exportar"). */
  label?: string;
}

const ACTION_HEADER = /^(a[çc][aã]o(es|ões)?|actions?)$/i;

/** Lê a tabela `.fsc-table` visível dentro do escopo da tela, ignorando "Ações". */
function scrapeTable(scope: Element | Document): ExportTable | null {
  const tables = Array.from(scope.querySelectorAll<HTMLTableElement>('table.fsc-table'));
  const table =
    tables.find((t) => t.querySelector('tbody tr td:not(.fsc-empty)')) ?? tables[0];
  if (!table) return null;

  const headers = Array.from(table.querySelectorAll('thead th')).map(
    (th) => (th.textContent ?? '').trim(),
  );
  const skip = new Set<number>();
  headers.forEach((h, i) => { if (!h || ACTION_HEADER.test(h)) skip.add(i); });
  const columns = headers.filter((_, i) => !skip.has(i));

  const rows: ExportCell[][] = [];
  for (const tr of Array.from(table.querySelectorAll('tbody tr'))) {
    const cells = Array.from(tr.children) as HTMLElement[];
    if (cells.length === 1 && (cells[0].classList.contains('fsc-empty') || cells[0].hasAttribute('colspan'))) continue;
    const vals = cells
      .map((td) => ((td as HTMLElement).innerText || td.textContent || '').trim().replace(/\s+/g, ' '))
      .filter((_, i) => !skip.has(i));
    rows.push(vals);
  }
  return columns.length ? { columns, rows } : null;
}

const DownloadIcon = (): JSX.Element => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ marginRight: 5 }}>
    <path d="M8 1.5v8m0 0L4.8 6.3M8 9.5l3.2-3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2.5 11v2A1.5 1.5 0 004 14.5h8a1.5 1.5 0 001.5-1.5v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

/**
 * Botão de exportação padronizado (dropdown PDF/Excel/Word/CSV) para telas de
 * relatório e listagem. Esconde-se para papéis sem permissão. Cabeçalho/rodapé
 * profissional e branding são responsabilidade do backend.
 */
export function ExportButton({
  title,
  filename,
  build,
  subtitle,
  meta,
  disabled,
  formats,
  label = 'Exportar',
}: ExportButtonProps): JSX.Element | null {
  const { exporting, toast, clearToast, run } = useReportExport();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Posiciona o menu (portal/fixed) a partir do retângulo do botão, evitando que
  // o overflow/stacking da actionbar recorte ou esconda o dropdown.
  const reposition = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  }, []);

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  // Reposiciona ao rolar/redimensionar; fecha ao clicar fora (botão ou menu).
  useEffect(() => {
    if (!open) return;
    const onScrollResize = () => reposition();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!wrapRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false);
    };
    window.addEventListener('scroll', onScrollResize, true);
    window.addEventListener('resize', onScrollResize);
    document.addEventListener('mousedown', onDoc);
    return () => {
      window.removeEventListener('scroll', onScrollResize, true);
      window.removeEventListener('resize', onScrollResize);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [open, reposition]);

  // Auto-dismiss do toast.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clearToast, 4000);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  if (!canExport()) return null;

  const items = (formats ?? EXPORT_FORMATS.map((f) => f.format))
    .map((fmt) => EXPORT_FORMATS.find((f) => f.format === fmt))
    .filter((f): f is (typeof EXPORT_FORMATS)[number] => Boolean(f));

  async function choose(format: ExportFormat) {
    setOpen(false);
    const scope = wrapRef.current?.closest('.fsc-root') ?? document;
    const table = build ? build() : scrapeTable(scope);
    if (!table || !table.rows.length) {
      // useReportExport já emite o toast de "nada para exportar".
      await run(format, { title, filename, columns: table?.columns ?? [], rows: table?.rows ?? [] });
      return;
    }
    await run(format, {
      title,
      filename,
      subtitle: table.subtitle ?? subtitle,
      columns: table.columns,
      rows: table.rows,
      meta: table.meta ?? meta,
    });
  }

  const busy = exporting !== null;

  return (
    <div ref={wrapRef} style={{ display: 'inline-flex' }}>
      <button
        ref={btnRef}
        type="button"
        className="fsc-btn fsc-btn-ghost"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || busy}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        <DownloadIcon />
        {busy ? `Exportando ${exporting?.toUpperCase()}…` : label}
        <span style={{ marginLeft: 5, fontSize: 9, opacity: 0.7 }}>▼</span>
      </button>

      {open && !busy && pos && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999,
            background: '#0f231a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
            minWidth: 172, padding: 4, boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
          }}
        >
          {items.map((f) => (
            <button
              key={f.format}
              type="button"
              role="menuitem"
              onClick={() => void choose(f.format)}
              style={{
                display: 'flex', width: '100%', alignItems: 'center', gap: 8,
                background: 'transparent', border: 'none', color: '#dfeee5',
                padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13, textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <DownloadIcon />
              {f.label}
            </button>
          ))}
        </div>,
        document.body,
      )}

      {toast && createPortal(
        <div
          style={{
            position: 'fixed', bottom: 20, right: 20, zIndex: 10000,
            background: toast.type === 'success' ? '#13351f' : '#3a1414',
            border: `1px solid ${toast.type === 'success' ? '#2e7d4f' : '#a13b3b'}`,
            color: '#eaf3ee', borderRadius: 10, padding: '12px 16px', fontSize: 13,
            maxWidth: 340, boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            animation: 'fscBodyIn 0.2s ease both',
          }}
          role="status"
        >
          {toast.message}
        </div>,
        document.body,
      )}
    </div>
  );
}

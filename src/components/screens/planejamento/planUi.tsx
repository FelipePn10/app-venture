import type { ReactNode } from "react";
import { num, type Feedback, type Tom } from "./planFormat";
import "@/styles/planejamento.css";

/** Componentes comuns das telas de planejamento e produção (formatação em planFormat, hooks em planHooks). */

// ── Componentes ───────────────────────────────────────────────────────────────

const BADGE: Record<Tom, string> = { ok: "ok", info: "info", warn: "warn", danger: "err", muted: "draft" };

export function Selo({ tom = "muted", children, title }: { tom?: Tom; children: ReactNode; title?: string }): JSX.Element {
  return <span className={`erp-badge ${BADGE[tom]}`} title={title}>{children}</span>;
}

export type Kpi = { label: string; value: ReactNode; hint?: ReactNode; tom?: Tom; onClick?: () => void; title?: string };
/** Faixa de indicadores. Indicador clicável leva à aba que explica o número. */
export function Kpis({ itens }: { itens: Kpi[] }): JSX.Element {
  return (
    <div className="vpl-kpis">
      {itens.map((k) => {
        const cls = `vpl-kpi${k.tom && k.tom !== "ok" ? ` ${k.tom === "danger" ? "danger" : k.tom}` : ""}`;
        const corpo = (<>
          <div className="vpl-kpi-label">{k.label}</div>
          <div className="vpl-kpi-value">{k.value}</div>
          {k.hint !== undefined && <div className="vpl-kpi-hint">{k.hint}</div>}
        </>);
        return k.onClick
          ? <button key={k.label} type="button" className={cls} onClick={k.onClick} title={k.title}>{corpo}</button>
          : <div key={k.label} className={cls} title={k.title}>{corpo}</div>;
      })}
    </div>
  );
}

export type Aba<T extends string> = { id: T; label: string; contador?: number; alerta?: boolean; hint?: string; desabilitada?: boolean };
export function Abas<T extends string>({ abas, ativa, onChange }: { abas: Aba<T>[]; ativa: T; onChange: (id: T) => void }): JSX.Element {
  return (
    <div className="erp-tabs" role="tablist">
      {abas.map((a) => (
        <button key={a.id} type="button" role="tab" aria-selected={ativa === a.id}
          className={`erp-tab${ativa === a.id ? " active" : ""}`} title={a.hint}
          disabled={a.desabilitada} onClick={() => onChange(a.id)}>
          {a.label}
          {a.contador !== undefined && <span className={`vpl-tab-count${a.alerta && a.contador > 0 ? " alerta" : ""}`}>{a.contador}</span>}
        </button>
      ))}
    </div>
  );
}

/** Bloco com título, subtítulo e ações à direita. `flush` tira o respiro para grades. */
export function Painel({ titulo, sub, acoes, flush = false, children }: {
  titulo: ReactNode; sub?: ReactNode; acoes?: ReactNode; flush?: boolean; children: ReactNode;
}): JSX.Element {
  return (
    <div className="erp-fieldset">
      <div className="erp-fieldset-head vpl-panel-head">
        <span className="vpl-panel-head-title">{titulo}{sub !== undefined && <span className="vpl-panel-head-sub">{sub}</span>}</span>
        {acoes && <span className="vpl-panel-head-actions">{acoes}</span>}
      </div>
      <div className={`vpl-panel-body${flush ? " flush" : ""}`}>{children}</div>
    </div>
  );
}

export function Vazio({ titulo, texto, acao }: { titulo: string; texto?: ReactNode; acao?: ReactNode }): JSX.Element {
  return (
    <div className="erp-detail-empty" style={{ padding: "36px 20px" }}>
      <div className="erp-detail-empty-title">{titulo}</div>
      {texto && <div className="erp-detail-empty-sub">{texto}</div>}
      {acao}
    </div>
  );
}

export function Detalhe({ itens }: { itens: { label: string; value: ReactNode; forte?: boolean }[] }): JSX.Element {
  return (
    <div className="vpl-kv">
      {itens.map((i) => (
        <div key={i.label} className="vpl-kv-item">
          <div className="vpl-kv-label">{i.label}</div>
          <div className={`vpl-kv-value${i.forte ? " strong" : ""}`}>{i.value ?? "—"}</div>
        </div>
      ))}
    </div>
  );
}

/** Barra de progresso com o número escrito: a cor nunca é o único sinal. */
export function Progresso({ valor, total, tom }: { valor: number; total: number; tom?: "warn" | "danger" }): JSX.Element {
  // A barra para em 100%; o número não — 140% de carga não pode virar "100%".
  const real = total > 0 ? Math.max(0, (valor / total) * 100) : 0;
  return (
    <div className="vpl-progress" title={`${num(valor)} de ${num(total)}`}>
      <div className="vpl-progress-track"><div className={`vpl-progress-fill${tom ? ` ${tom}` : ""}`} style={{ width: `${Math.min(100, real)}%` }} /></div>
      <span className="vpl-progress-label">{Math.round(real)}%</span>
    </div>
  );
}

export function Aviso({ feedback, busy }: { feedback: Feedback; busy?: boolean }): JSX.Element | null {
  if (!feedback) return null;
  return <div className={`erp-feedback ${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>{busy && <span className="erp-spin" />}{feedback.message}</div>;
}

/** Cabeçalho de tela padrão: módulo › título · código. */
export function Cabecalho({ modulo, titulo, codigo, meta }: { modulo: string; titulo: string; codigo: string; meta?: ReactNode }): JSX.Element {
  return (
    <header className="erp-titlebar">
      <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
      <nav className="erp-crumbs">
        <span className="erp-crumb-mut">{modulo}</span><span className="erp-crumb-sep">›</span>
        <span className="erp-crumb-cur">{titulo}</span><span className="erp-crumb-code">{codigo}</span>
      </nav>
      <div className="erp-titlebar-spacer" />
      {meta && <span className="erp-titlebar-meta">{meta}</span>}
    </header>
  );
}

export function Rodape({ children }: { children?: ReactNode }): JSX.Element {
  return (
    <footer className="erp-statusbar">
      <div style={{ display: "contents" }}>{children}</div>
      <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
    </footer>
  );
}

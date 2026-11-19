import { useState } from "react";
import { type ProductionOrderDTO } from "@/services/productionOrderService";
import { destinoDaPeca, origemDaNecessidade } from "./identificacao";
import { LookupField } from "@/components/ui/LookupField";
import { loadCustomers, loadProjects } from "@/services/lookups";

/**
 * Reconhecer a OF sem decorar o número. "OF 194" sozinho não diz nada; a
 * linha diz o que ela fabrica, para quem (cliente, pedido ou demanda), em que
 * projeto e para qual OF a peça dela vai — a bucha que vai para o RN da OF 239.
 */

/** Linha de baixo da OF na lista: cliente · projeto · pedido/demanda, e o destino da peça. */
export function LinhaDaOrigem({ o }: { o: ProductionOrderDTO }): JSX.Element | null {
  const x = o.origin;
  if (!x) return null;
  const quem = [x.customer_name, x.project_code ? `Projeto ${x.project_code}` : "", origemDaNecessidade(x)].filter(Boolean).join(" · ");
  const destino = destinoDaPeca(x);
  if (!quem && !destino) return null;
  return (
    <div className="vpro-origem" style={{ gridColumn: "1 / -1", minWidth: 0, fontSize: 11.5, lineHeight: 1.35 }}>
      {quem && <div className="erp-text-muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={quem}>{quem}</div>}
      {destino && <div style={{ color: "var(--v-accent, inherit)" }} title="A peça desta ordem vai para a ordem indicada">{destino}</div>}
    </div>
  );
}

/** Cabeçalho da OF aberta: o que fabrica, para quem e para qual OF. */
export function IdentificacaoDaOF({ of, onAbrirOF, onEditar }: { of: ProductionOrderDTO; onAbrirOF: (id: number) => void; onEditar?: () => void }): JSX.Element | null {
  const x = of.origin;
  if (!x) return null;
  const necessidade = origemDaNecessidade(x);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 6, fontSize: 12.5, alignItems: "center" }}>
      <span><span className="erp-text-muted">Cliente </span><strong>{x.customer_name || "—"}</strong></span>
      <span><span className="erp-text-muted">Projeto </span><strong>{x.project_code ? `${x.project_code}${x.project_name && x.project_name !== x.project_code ? ` — ${x.project_name}` : ""}` : "—"}</strong></span>
      {necessidade && <span><span className="erp-text-muted">Atende </span><strong>{necessidade}</strong></span>}
      {x.level > 0 && (x.parent_order_id
        ? <span><span className="erp-text-muted">Componente para </span>
            <button type="button" className="erp-btn erp-btn-sm erp-btn-ghost" onClick={() => onAbrirOF(x.parent_order_id!)} title="Abrir a ordem que usa a peça desta">OF {x.parent_order_id}{x.parent_item ? ` · ${x.parent_item}` : ""}</button></span>
        : <span><span className="erp-text-muted">Componente para </span><strong>planejada {x.parent_planned_order}{x.parent_item ? ` · ${x.parent_item}` : ""}</strong> <span className="erp-hint">(ainda sem OF)</span></span>)}
      {x.root_order_id && x.root_order_id !== x.parent_order_id && (
        <span><span className="erp-text-muted">Produto final </span>
          <button type="button" className="erp-btn erp-btn-sm erp-btn-ghost" onClick={() => onAbrirOF(x.root_order_id!)}>OF {x.root_order_id}{x.root_item ? ` · ${x.root_item}` : ""}</button></span>
      )}
      {x.children > 0 && <span className="erp-text-muted">{x.children} componente(s) fabricado(s) para ela</span>}
      {onEditar && <button type="button" className="erp-btn erp-btn-sm" onClick={onEditar} title="Cliente e projeto desta ordem">Cliente e projeto</button>}
    </div>
  );
}

/** Edição de cliente e projeto da OF. As OFs dos componentes que herdaram acompanham. */
export function OrigemDialog({ of, busy, onSalvar, onFechar }: {
  of: ProductionOrderDTO; busy: boolean;
  onSalvar: (v: { customer_code?: number | null; project_code?: string | null }) => void; onFechar: () => void;
}): JSX.Element {
  const [cliente, setCliente] = useState<number | undefined>(of.origin?.customer_code);
  const [projeto, setProjeto] = useState<string | undefined>(of.origin?.project_code);
  return (
    <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="origem-titulo" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onFechar(); }}>
      <div className="erp-modal" style={{ width: "min(560px, 94vw)" }}>
        <div className="erp-modal-head"><div><strong id="origem-titulo">Cliente e projeto da OF {of.id}</strong>
          <div className="erp-field-hint">A OF do pedido, da demanda ou de componente já vem com os dois. Trocar aqui leva junto as OFs dos componentes que herdaram desta; a que tem cliente ou projeto próprio fica como está.</div></div>
          <button className="erp-btn erp-btn-sm" onClick={onFechar} disabled={busy}>Fechar</button></div>
        <div className="erp-modal-body">
          <div className="erp-fieldset-body" style={{ padding: 0 }}>
            <div className="erp-field erp-c12"><label className="erp-label">Cliente</label>
              <LookupField value={cliente} loader={loadCustomers} entityLabel="cliente" clearable placeholder="Sem cliente (estoque)" onChange={(c) => setCliente(c ? Number(c) : undefined)} /></div>
            <div className="erp-field erp-c12"><label className="erp-label">Projeto</label>
              <LookupField value={projeto} loader={loadProjects} entityLabel="projeto" clearable allowManualCode={false} placeholder="Sem projeto" vazio="Nenhum projeto cadastrado — cadastre na VPLA0120" onChange={(c) => setProjeto(c ? String(c) : undefined)} />
              <span className="erp-hint">Projeto com cliente traz o cliente junto. Cadastre projetos na VPLA0120.</span></div>
          </div>
        </div>
        <div className="erp-modal-actions">
          <button className="erp-btn" onClick={onFechar} disabled={busy}>Cancelar</button>
          <button className="erp-btn erp-btn-primary" onClick={() => onSalvar({ customer_code: cliente ?? null, project_code: projeto ?? null })} disabled={busy}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

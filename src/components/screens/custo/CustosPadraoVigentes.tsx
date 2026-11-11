import { useState } from "react";
import { type StandardCost, listStandardCosts } from "@/services/standardCostService";
import { errMessage } from "@/services/fiscalShared";
import { EntityName } from "@/components/ui/EntityName";
import { loadItems } from "@/services/lookups";

const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* Custo padrão vigente de todos os itens (era a VPRO0300), na aba Histórico da VCUS0100. */
export function CustosPadraoVigentes(): JSX.Element {
  const [lista, setLista] = useState<StandardCost[] | null>(null);
  const [filtro, setFiltro] = useState("");
  const [erro, setErro] = useState("");
  const visiveis = (lista ?? []).filter((c) => !filtro.trim() || String(c.item_code).includes(filtro.trim()));
  return (
    <div className="erp-fieldset"><div className="erp-fieldset-head">Custo padrão vigente dos itens{lista ? ` — ${lista.length}` : ""}</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={() => { setErro(""); listStandardCosts().then(setLista).catch((e) => setErro(errMessage(e))); }}>Listar todos</button></div>
      {lista && <div className="erp-field erp-c3"><label className="erp-label">Filtrar pelo código</label><input className="erp-input" value={filtro} onChange={(e) => setFiltro(e.target.value)} /></div>}
      {erro && <div className="erp-field erp-c12 erp-feedback error">{erro}</div>}
      {lista && <div className="erp-field erp-c12" style={{ maxHeight: 360, overflow: "auto" }}><table className="erp-grid">
        <thead><tr><th>Item</th><th className="num">Material</th><th className="num">Operação</th><th className="num">Indiretos</th><th className="num">Total</th></tr></thead>
        <tbody>
          {visiveis.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum custo padrão apurado.</td></tr>}
          {visiveis.map((c) => <tr key={c.item_code}><td><EntityName code={String(c.item_code)} loader={loadItems} /></td><td className="num">{money(c.material_cost)}</td><td className="num">{money(c.operation_cost)}</td><td className="num">{money(c.overhead_cost)}</td><td className="num" style={{ fontWeight: 600 }}>{money(c.total_cost)}</td></tr>)}
        </tbody>
      </table></div>}
    </div></div>
  );
}

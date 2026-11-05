import { useState } from "react";
import { getAcuracidade, getIdadeDoEstoque, type AcuracidadeDTO, type FaixaIdadeDTO, type GrupoAcuracidadeDTO } from "@/services/stockService";
import { EntityName } from "@/components/ui/EntityName";
import { LookupField } from "@/components/ui/LookupField";
import { loadWarehouses } from "@/services/lookups";
import { num, reais, useAcao } from "./comum";
import { FeedbackBox, Resumo } from "./ui";

const pct = (v?: number) => (v == null ? "—" : `${num(v, 2)}%`);
const mesBR = (k: string) => (/^\d{4}-\d{2}$/.test(k) ? `${k.slice(5)}/${k.slice(0, 4)}` : k);

function Grupos({ titulo, grupos }: { titulo: string; grupos: GrupoAcuracidadeDTO[] }) {
  return (
    <div className="erp-field erp-c6">
      <table className="erp-grid">
        <thead><tr><th>{titulo}</th><th className="num">Contagens</th><th className="num">Acertos</th><th className="num">Por linha</th><th className="num">Por valor</th><th className="num">Divergência</th></tr></thead>
        <tbody>{grupos.map((g) => (
          <tr key={g.key}><td>{mesBR(g.key)}</td><td className="num">{g.counts}</td><td className="num">{g.hits}</td>
            <td className="num">{pct(g.line_accuracy_pct)}</td><td className="num">{pct(g.value_accuracy_pct)}</td><td className="num">{reais(g.divergent_value)}</td></tr>))}</tbody>
      </table>
    </div>
  );
}

/**
 * Acuracidade das contagens encerradas (inventário e contagem cíclica), com a
 * tolerância de cada classe ABC, o que erra de forma recorrente e a idade do
 * estoque. Recorrente é o item ou endereço que errou duas vezes ou mais.
 */
export function AcuracidadeSecao() {
  const { busy, feedback, run } = useAcao();
  const [f, setF] = useState({ months: 12, warehouse_id: undefined as number | undefined, tol_a: "0", tol_b: "2", tol_c: "5" });
  const [r, setR] = useState<AcuracidadeDTO | null>(null);
  const [idade, setIdade] = useState<FaixaIdadeDTO[] | null>(null);
  const tolerancia = (k: "tol_a" | "tol_b" | "tol_c", rotulo: string) => (
    <div className="erp-field erp-c1"><label className="erp-label">{rotulo}</label>
      <input className="erp-input num" value={f[k]} onChange={(e) => setF((p) => ({ ...p, [k]: e.target.value }))} /></div>
  );
  const apurar = () => run(async () => {
    const [a, i] = await Promise.all([getAcuracidade({ ...f, tol_a: f.tol_a.replace(",", "."), tol_b: f.tol_b.replace(",", "."), tol_c: f.tol_c.replace(",", ".") }), getIdadeDoEstoque()]);
    setR(a); setIdade(i);
  });

  return (<>
    <FeedbackBox feedback={feedback} />
    <div className="erp-fieldset"><div className="erp-fieldset-head">Acuracidade e idade do estoque</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c2"><label className="erp-label">Janela (meses)</label>
        <input className="erp-input num" type="number" min={1} value={f.months} onChange={(e) => setF((p) => ({ ...p, months: Number(e.target.value) }))} /></div>
      <div className="erp-field erp-c4"><label className="erp-label">Almoxarifado</label>
        <LookupField value={f.warehouse_id} loader={loadWarehouses} entityLabel="almoxarifado" placeholder="Todos" clearable onChange={(c) => setF((p) => ({ ...p, warehouse_id: c ? Number(c) : undefined }))} /></div>
      {tolerancia("tol_a", "Tol. A %")}{tolerancia("tol_b", "Tol. B %")}{tolerancia("tol_c", "Tol. C %")}
      <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={apurar} disabled={busy}>Apurar</button></div>
      {r && r.total.counts === 0 && <div className="erp-field erp-c12 erp-hint">Nenhuma contagem encerrada neste período.</div>}
      {r && r.total.counts > 0 && (<>
        <div className="erp-field erp-c12"><Resumo>Acuracidade por linha <strong>{pct(r.total.line_accuracy_pct)}</strong> · por valor <strong>{pct(r.total.value_accuracy_pct)}</strong> · {r.total.hits} de {r.total.counts} contagens dentro da tolerância · divergência {reais(r.total.divergent_value)}</Resumo></div>
        <Grupos titulo="Mês" grupos={r.by_month} />
        <Grupos titulo="Classe" grupos={r.by_class} />
        <div className="erp-field erp-c6">
          <table className="erp-grid">
            <thead><tr><th>Item com erro repetido</th><th className="num">Erros</th><th className="num">Contagens</th><th className="num">Divergência</th></tr></thead>
            <tbody>
              {r.recurring_items.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhum item com erro repetido.</td></tr>}
              {r.recurring_items.map((d) => <tr key={d.item_code}><td><strong>{d.business_code}</strong> {d.name}</td><td className="num">{d.misses}</td><td className="num">{d.counts}</td><td className="num">{reais(d.divergent_value)}</td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="erp-field erp-c6">
          <table className="erp-grid">
            <thead><tr><th>Endereço com erro repetido</th><th>Almoxarifado</th><th className="num">Erros</th><th className="num">Contagens</th><th className="num">Divergência</th></tr></thead>
            <tbody>
              {r.recurring_addresses.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum endereço com erro repetido.</td></tr>}
              {r.recurring_addresses.map((d) => <tr key={`${d.warehouse_id}-${d.address}`}><td><strong>{d.address}</strong></td><td><EntityName code={d.warehouse_id!} loader={loadWarehouses} prefix="Almox." /></td><td className="num">{d.misses}</td><td className="num">{d.counts}</td><td className="num">{reais(d.divergent_value)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </>)}
      {idade && (
        <div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Sem movimento real há</th><th className="num">Itens</th><th className="num">Valor</th><th className="num">Do estoque</th></tr></thead>
            <tbody>{idade.map((i) => <tr key={i.range}><td>{i.range}</td><td className="num">{i.items}</td><td className="num">{reais(i.value)}</td><td className="num">{pct(i.value_pct)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div></div>
  </>);
}

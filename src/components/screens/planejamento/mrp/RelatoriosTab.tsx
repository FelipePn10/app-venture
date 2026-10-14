import { useState } from "react";
import { type MrpReport, type ReportParams, reportAvailability, reportExplosion, reportGroupedNeeds, reportProfile, reportReorderPoint } from "@/services/mrpReportsService";
import { fieldLabel } from "@/utils/fieldLabels";
import { Aviso, Painel, Vazio } from "../planUi";
import { data } from "../planFormat";
import { useAcao } from "../planHooks";

type Relatorio = "profile" | "availability" | "grouped-needs" | "explosion" | "reorder-point";
const RELATORIOS: { id: Relatorio; rotulo: string; texto: string; exigeItem?: boolean; exigePlano?: boolean; usaQtd?: boolean }[] = [
  { id: "profile", rotulo: "Perfil sintético", texto: "Demanda, ordens e estoque projetado por item no plano.", exigePlano: true },
  { id: "grouped-needs", rotulo: "Necessidades agrupadas", texto: "O que o plano pede, somado por item e período.", exigePlano: true },
  { id: "availability", rotulo: "Disponibilidade", texto: "Se a quantidade do item está disponível e quando.", exigeItem: true, usaQtd: true },
  { id: "explosion", rotulo: "Explosão multinível", texto: "Todos os componentes do item para a quantidade informada.", exigeItem: true, usaQtd: true },
  { id: "reorder-point", rotulo: "Ponto de reposição", texto: "Itens planejados por ponto de pedido e a situação de cada um." },
];

/**
 * Colunas dos relatórios, na ordem de leitura: quem é o item, depois o que ele
 * precisa e o que tem. O backend devolve os campos em inglês e na ordem
 * alfabética — a grade abria com "available" e escondia o item no meio.
 */
const COLUNAS: Record<string, string> = {
  item_code: "Item", parent_item_code: "Item pai", level: "Nível", row_type: "Linha", date: "Data", uom: "Unidade",
  demand: "Demanda", required: "Necessário", stock: "Estoque", available: "Disponível",
  planned_supply: "Planejado", firm_supply: "Firme", purchase_supply: "Compras", projected_stock: "Estoque projetado",
  safety_stock: "Estoque de segurança", maximum_stock: "Estoque máximo", average_monthly: "Consumo médio mensal", cost: "Custo",
};
const ORDEM = Object.keys(COLUNAS);
/** Códigos internos (legacy_*) e campos de identificação não são leitura do relatório. */
const oculta = (k: string) => k.startsWith("legacy_");
const rotuloColuna = (k: string) => COLUNAS[k] ?? fieldLabel(k);
const ehCodigo = (k: string) => k === "level" || k.endsWith("_code");

/** Valor de célula legível: data como data, número em pt-BR, booleano como Sim/Não. */
function celula(chave: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(s)) return data(s);
  if (!ehCodigo(chave) && /^-?\d+(\.\d+)?$/.test(s)) return Number(s).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
  if (chave === "row_type") return s.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
  return s;
}
const alinhaDireita = (chave: string, v: unknown) => !ehCodigo(chave) && /^-?\d+(\.\d+)?$/.test(String(v ?? ""));

export function RelatoriosTab({ plano }: { plano?: number }): JSX.Element {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [tipo, setTipo] = useState<Relatorio>("profile");
  const [item, setItem] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [qtd, setQtd] = useState("1");
  const [rel, setRel] = useState<MrpReport | null>(null);
  const def = RELATORIOS.find((r) => r.id === tipo)!;

  const gerar = () => run(async () => {
    const it = item.trim();
    if (def.exigePlano && !plano) { setFeedback({ type: "error", message: "Escolha o plano na barra acima." }); return; }
    if (def.exigeItem && !it) { setFeedback({ type: "error", message: `"${def.rotulo}" exige o item.` }); return; }
    const comum: ReportParams = { plan_code: plano, item_code: it || undefined, from: de || undefined, to: ate || undefined };
    let r: MrpReport;
    switch (tipo) {
      case "profile": r = await reportProfile({ ...comum, plan_code: plano!, layout: "SINTETICO", position: "CURRENT" }); break;
      case "availability": r = await reportAvailability({ ...comum, quantity: Number(qtd) || 1, layout: "AMBOS" }); break;
      case "grouped-needs": r = await reportGroupedNeeds({ ...comum, plan_code: plano! }); break;
      case "explosion": r = await reportExplosion(it, { quantity: Number(qtd) || 1, at: ate || de || undefined, list_mode: "TODOS", explosion_option: "SIMPLES" }); break;
      default: r = await reportReorderPoint({ ...comum, planning_type: "REORDER_POINT" });
    }
    setRel(r);
  });

  const colunas = rel && rel.rows.length > 0
    ? Array.from(rel.rows.reduce((s, row) => { Object.keys(row).forEach((k) => { if (!oculta(k)) s.add(k); }); return s; }, new Set<string>()))
      .sort((x, y) => (ORDEM.indexOf(x) + 1 || 999) - (ORDEM.indexOf(y) + 1 || 999))
    : [];

  return (
    <>
      <Aviso feedback={feedback} busy={busy} />
      <Painel titulo="Relatório">
        <div className="erp-chips">
          {RELATORIOS.map((r) => (
            <button key={r.id} type="button" className={`erp-chip${tipo === r.id ? " active" : ""}`} onClick={() => { setTipo(r.id); setRel(null); }}>{r.rotulo}</button>
          ))}
        </div>
        <p className="erp-hint" style={{ margin: "10px 0 12px" }}>{def.texto}</p>
        <div className="vpl-filters">
          <div className="erp-field vpl-grow"><label className={`erp-label${def.exigeItem ? " erp-req" : ""}`} htmlFor="rel-item">Item</label>
            <input id="rel-item" className="erp-input" value={item} placeholder={def.exigeItem ? "" : "Todos"} onChange={(e) => setItem(e.target.value)} /></div>
          {def.usaQtd && <div className="erp-field"><label className="erp-label" htmlFor="rel-qtd">Quantidade</label>
            <input id="rel-qtd" className="erp-input num" type="number" min={0} value={qtd} onChange={(e) => setQtd(e.target.value)} /></div>}
          {tipo !== "explosion" && <div className="erp-field"><label className="erp-label" htmlFor="rel-de">De</label>
            <input id="rel-de" className="erp-input" type="date" value={de} onChange={(e) => setDe(e.target.value)} /></div>}
          <div className="erp-field"><label className="erp-label" htmlFor="rel-ate">{tipo === "explosion" ? "Estrutura vigente em" : "Até"}</label>
            <input id="rel-ate" className="erp-input" type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
          <button className="erp-btn erp-btn-primary" style={{ alignSelf: "flex-end" }} onClick={() => void gerar()} disabled={busy}>Gerar relatório</button>
        </div>
      </Painel>

      {rel && (rel.rows.length === 0
        ? <Painel titulo={def.rotulo}><Vazio titulo="Sem linhas para esses filtros" /></Painel>
        : (
          <Painel titulo={def.rotulo} sub={`${rel.rows.length} linha(s)`} flush>
            <div className="vpl-grid-scroll">
              <table className="erp-grid">
                <thead><tr>{colunas.map((c) => <th key={c} className={ehCodigo(c) || c === "item_code" || c === "date" || c === "uom" || c === "row_type" ? undefined : "num"}>{rotuloColuna(c)}</th>)}</tr></thead>
                <tbody>{rel.rows.map((row, i) => <tr key={i}>{colunas.map((c) => (
                  <td key={c} className={c === "item_code" ? "vpl-strong" : alinhaDireita(c, row[c]) ? "num" : undefined}>{celula(c, row[c])}</td>
                ))}</tr>)}</tbody>
                {rel.totals && <tfoot><tr>{colunas.map((c, i) => <td key={c} className={alinhaDireita(c, rel.totals?.[c]) ? "num" : undefined} style={{ fontWeight: 600 }}>{i === 0 ? "Totais" : celula(c, rel.totals?.[c])}</td>)}</tr></tfoot>}
              </table>
            </div>
          </Painel>
        ))}
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  type ConfiguredRule, type MrpProfileRow, RULE_TYPES, createConfiguredRule, getMrpProfile, listConfiguredRules,
} from "@/services/mrpService";
import { enumLabel } from "@/utils/enumLabels";
import { Kpis, Painel, Selo, Vazio, Aviso } from "../planUi";
import { data, num } from "../planFormat";
import { useAcao } from "../planHooks";

const REGRA_VAZIA: ConfiguredRule = { item_code: "", table_type: "PLANNING_DATA", field_name: "lead_time", rule_type: "EQUAL", rule_value: "", sequence: 1 };

/**
 * Perfil time-phased do item no plano e as regras configuradas dele. Eram duas
 * caixas de texto soltas pedindo o código do item; aqui o item vem da lista do
 * próprio plano (ou é digitado), e o perfil diz logo o que importa: quando o
 * estoque projetado fura.
 */
export function PerfilTab({ plano, itensDoPlano, itemInicial }: { plano?: number; itensDoPlano: string[]; itemInicial?: string }): JSX.Element {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [item, setItem] = useState(itemInicial ?? "");
  const [perfil, setPerfil] = useState<MrpProfileRow[] | null>(null);
  const [regras, setRegras] = useState<ConfiguredRule[]>([]);
  const [regra, setRegra] = useState<ConfiguredRule>(REGRA_VAZIA);

  const consultar = (codigo: string) => run(async () => {
    const it = codigo.trim();
    if (!it) { setFeedback({ type: "error", message: "Escolha o item." }); return; }
    if (!plano) { setFeedback({ type: "error", message: "Escolha o plano na barra acima." }); return; }
    const [p, r] = await Promise.all([getMrpProfile(it, plano), listConfiguredRules(it).catch(() => [] as ConfiguredRule[])]);
    setPerfil(p); setRegras(r); setRegra((s) => ({ ...s, item_code: it }));
  });

  // Vindo de "Ver perfil" em outra aba, o item já chega escolhido.
  useEffect(() => { if (itemInicial) { setItem(itemInicial); void consultar(itemInicial); } }, [itemInicial, plano]); // eslint-disable-line react-hooks/exhaustive-deps

  const resumo = useMemo(() => {
    if (!perfil || perfil.length === 0) return null;
    const falta = perfil.find((r) => (r.projected_stock ?? 0) < 0);
    const menor = perfil.reduce((m, r) => Math.min(m, r.projected_stock ?? 0), Number.POSITIVE_INFINITY);
    return {
      demanda: perfil.reduce((t, r) => t + (r.demand ?? 0), 0),
      planejadas: perfil.reduce((t, r) => t + (r.planned_orders ?? 0), 0),
      firmes: perfil.reduce((t, r) => t + (r.firm_orders ?? 0), 0),
      falta, menor,
    };
  }, [perfil]);

  const criarRegra = () => run(async () => {
    if (!regra.item_code || !regra.field_name.trim()) { setFeedback({ type: "error", message: "Consulte um item e informe o campo da regra." }); return; }
    await createConfiguredRule(regra);
    setRegras(await listConfiguredRules(regra.item_code));
    setRegra((s) => ({ ...s, rule_value: "", condicao_mascara: "" }));
    setFeedback({ type: "success", message: "Regra criada." });
  });

  return (
    <>
      <Aviso feedback={feedback} busy={busy} />
      <Painel titulo="Item">
        <div className="vpl-filters">
          <div className="erp-field vpl-grow"><label className="erp-label erp-req" htmlFor="perfil-item">Item</label>
            <input id="perfil-item" className="erp-input" list="perfil-itens" placeholder="Código do item" value={item}
              onChange={(e) => setItem(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void consultar(item); }} />
            <datalist id="perfil-itens">{itensDoPlano.map((i) => <option key={i} value={i} />)}</datalist>
            <span className="erp-hint">A lista sugere os itens que entraram no último cálculo deste plano.</span></div>
          <button className="erp-btn erp-btn-primary" style={{ alignSelf: "flex-start", marginTop: 20 }} onClick={() => void consultar(item)} disabled={busy}>Ver perfil</button>
        </div>
      </Painel>

      {perfil && perfil.length === 0 && <Painel titulo="Perfil do item"><Vazio titulo="O item não tem movimento neste plano" texto="Sem demanda nem ordem planejada no último cálculo." /></Painel>}

      {resumo && perfil && perfil.length > 0 && (<>
        <Kpis itens={[
          { label: "Demanda no horizonte", value: num(resumo.demanda) },
          { label: "Ordens planejadas", value: num(resumo.planejadas) },
          { label: "Ordens firmes", value: num(resumo.firmes) },
          resumo.falta
            ? { label: "Primeira falta", value: data(resumo.falta.date), hint: `estoque projetado ${num(resumo.falta.projected_stock)}`, tom: "danger" }
            : { label: "Primeira falta", value: "Nenhuma", hint: "o estoque cobre o horizonte", tom: "ok" },
        ]} />
        <Painel titulo="Perfil no tempo" sub={`plano ${plano}`} flush>
          <div className="vpl-grid-scroll">
            <table className="erp-grid">
              <thead><tr><th>Data</th><th className="num">Demanda</th><th className="num">Planejadas</th><th className="num">Firmes</th><th className="num">Estoque projetado</th><th /></tr></thead>
              <tbody>
                {perfil.map((r, i) => {
                  const negativo = (r.projected_stock ?? 0) < 0;
                  return (
                    <tr key={`${r.date}-${i}`}>
                      <td>{data(r.date)}</td>
                      <td className="num">{num(r.demand)}</td>
                      <td className="num">{num(r.planned_orders)}</td>
                      <td className="num">{num(r.firm_orders)}</td>
                      <td className={`num${negativo ? " erp-cell-danger" : ""}`}>{num(r.projected_stock)}</td>
                      <td>{negativo ? <Selo tom="danger">Falta</Selo> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Painel>
        <p className="erp-note">
          O estoque projetado é a foto do cálculo <strong>antes</strong> das ordens sugeridas: negativo mostra quanto faltaria
          se nada fosse feito. As ordens planejadas e firmes do mesmo dia são a resposta do MRP a essa falta.
        </p>
      </>)}

      {regra.item_code && (
        <Painel titulo="Regras configuradas" sub={`item ${regra.item_code}`}>
          <div className="vpl-filters">
            <div className="erp-field"><label className="erp-label" htmlFor="rg-tabela">Tabela</label>
              <select id="rg-tabela" className="erp-input" value={regra.table_type} onChange={(e) => setRegra((s) => ({ ...s, table_type: e.target.value }))}>
                <option value="PLANNING_DATA">{enumLabel("PLANNING_DATA")}</option><option value="PLANNER_DATA">{enumLabel("PLANNER_DATA")}</option>
              </select></div>
            <div className="erp-field"><label className="erp-label erp-req" htmlFor="rg-campo">Campo</label>
              <input id="rg-campo" className="erp-input" value={regra.field_name} onChange={(e) => setRegra((s) => ({ ...s, field_name: e.target.value }))} /></div>
            <div className="erp-field vpl-grow"><label className="erp-label erp-req" htmlFor="rg-valor">Valor</label>
              <input id="rg-valor" className="erp-input" placeholder={regra.field_name === "lead_time" ? "dias úteis" : regra.field_name === "lote_minimo" ? "quantidade" : ""}
                value={regra.rule_value} onChange={(e) => setRegra((s) => ({ ...s, rule_value: e.target.value }))} /></div>
            <div className="erp-field"><label className="erp-label" htmlFor="rg-tipo">Máscara</label>
              <select id="rg-tipo" className="erp-input" value={regra.rule_type} onChange={(e) => setRegra((s) => ({ ...s, rule_type: e.target.value as ConfiguredRule["rule_type"] }))}>
                {RULE_TYPES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}
              </select></div>
            <div className="erp-field"><label className="erp-label" htmlFor="rg-cond">Condição da máscara</label>
              <input id="rg-cond" className="erp-input" placeholder={regra.rule_type === "RANGE" ? "ex.: 100-200" : "vazio = todas"} value={regra.condicao_mascara ?? ""}
                onChange={(e) => setRegra((s) => ({ ...s, condicao_mascara: e.target.value }))} /></div>
            <button className="erp-btn erp-btn-primary" style={{ alignSelf: "flex-end" }} onClick={() => void criarRegra()} disabled={busy}>Criar regra</button>
          </div>
          {regras.length > 0 ? (
            <table className="erp-grid" style={{ marginTop: 12 }}>
              <thead><tr><th>Tabela</th><th>Campo</th><th>Valor</th><th>Vale para</th><th className="num">Seq.</th></tr></thead>
              <tbody>{regras.map((r, i) => <tr key={r.id ?? i}><td>{enumLabel(r.table_type)}</td><td>{r.field_name}</td><td>{r.rule_value}</td>
                <td>{r.condicao_mascara ? `máscara ${enumLabel(r.rule_type).toLowerCase()} ${r.condicao_mascara}` : "todas as máscaras"}</td><td className="num">{r.sequence ?? "—"}</td></tr>)}</tbody>
            </table>
          ) : <p className="erp-hint" style={{ marginTop: 10 }}>Este item ainda não tem regras configuradas.</p>}
        </Painel>
      )}
    </>
  );
}

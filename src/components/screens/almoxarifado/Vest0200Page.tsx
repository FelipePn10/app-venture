import { useState } from "react";
import {
  type InventoryCloseResult, type InventoryDTO, type MovementTypeDTO,
  closeInventory, countInventoryItem, createInventory, createMovementType, getInventory,
  listInventories, listInventoryItems, listMovementTypes, updateMovementType,
} from "@/services/stockService";
import { type Obj, parseNum, parseStr } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadItems, loadWarehouses } from "@/services/lookups";
import { hoje, qtd, reais, useAcao } from "./estoque/comum";
import { FeedbackBox, Resumo } from "./estoque/ui";

type Aba = "inventario" | "tipos";

const TIPO_VAZIO: MovementTypeDTO = {
  sigla: "", description: "", usage_type: "GERAL", entry_exit: "SAIDA",
  considers_consumption: true, updates_avg_cost: true, is_adjustment: false, updates_cycle_count: false,
  shows_in_summary: true, entry_order: false, exit_order: false, generates_fci_movement: false,
  requires_cost_center: false, allows_manual: true, is_active: true,
};

/**
 * Inventário físico e tipos de movimento.
 *
 * Inventário: a abertura grava a FOTO do saldo; a contagem calcula a diferença
 * contra ela (recontar substitui a anterior, que fica guardada); o fechamento
 * lança o ajuste de cada diferença ao custo médio — o que entrou ou saiu depois
 * da abertura continua valendo. Contagem cíclica fica na VEST0500.
 */
export function Vest0200Page(): JSX.Element {
  const [aba, setAba] = useState<Aba>("inventario");
  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Almoxarifado</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Inventário e tipos de movimento</span><span className="erp-crumb-code">VEST0200</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>
      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span><ExportButton title="VEST0200 — Inventário" filename="vest0200" /></div>
      </div>
      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs" role="tablist">
            <button role="tab" className={`erp-tab${aba === "inventario" ? " active" : ""}`} onClick={() => setAba("inventario")}>Inventário físico</button>
            <button role="tab" className={`erp-tab${aba === "tipos" ? " active" : ""}`} onClick={() => setAba("tipos")}>Tipos de movimento</button>
          </div>
          <div className="erp-detail-body">
            {aba === "inventario" ? <InventarioAba /> : <TiposAba />}
          </div>
        </section>
      </div>
      <footer className="erp-statusbar">
        <div className="erp-status-item">{aba === "inventario" ? "Abrir → contar → fechar (o fechamento lança os ajustes)" : "As regras do tipo valem no lançamento manual (VEST0100 › Lançamentos)"}</div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

function InventarioAba() {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [invs, setInvs] = useState<InventoryDTO[]>([]);
  const [sel, setSel] = useState<InventoryDTO | null>(null);
  const [itens, setItens] = useState<Obj[]>([]);
  const [novo, setNovo] = useState({ code: "", warehouse_id: 0, description: "", start_date: hoje(), parcial: [] as string[], itemParcial: "" });
  const [cont, setCont] = useState({ item_code: "", counted_qty: "", reason: "" });
  const [zerar, setZerar] = useState(false);
  const [resultado, setResultado] = useState<InventoryCloseResult | null>(null);

  const carregar = () => run(async () => { setInvs(await listInventories()); });
  const abrir = (id?: number) => { if (id) void run(async () => { setSel(await getInventory(id)); setItens(await listInventoryItems(id)); setResultado(null); }); };
  const proximoCodigo = () => String((invs.reduce((m, i) => Math.max(m, i.code ?? 0), 0) || 0) + 1);

  const criar = () => run(async () => {
    const code = Number(novo.code || proximoCodigo());
    if (!novo.warehouse_id || !novo.description.trim()) { setFeedback({ type: "error", message: "Almoxarifado e descrição são obrigatórios." }); return; }
    const inv = await createInventory({ code, warehouse_id: novo.warehouse_id, description: novo.description.trim(), start_date: novo.start_date, item_codes: novo.parcial.length ? novo.parcial : undefined } as InventoryDTO);
    setFeedback({ type: "success", message: `Inventário ${inv.code} aberto com a foto de ${inv.total_items ?? 0} item(ns).` });
    setNovo((p) => ({ ...p, code: "", description: "", parcial: [] }));
    setInvs(await listInventories());
    if (inv.id) abrir(inv.id);
  });
  const contar = () => { const id = sel?.id; if (!id) return; void run(async () => {
    const q = Number(cont.counted_qty.replace(",", "."));
    if (!cont.item_code || cont.counted_qty === "" || q < 0) { setFeedback({ type: "error", message: "Item e quantidade contada são obrigatórios." }); return; }
    await countInventoryItem({ inventory_id: id, item_code: cont.item_code, warehouse_id: sel!.warehouse_id, counted_qty: q, adjustment_reason: cont.reason || undefined });
    setItens(await listInventoryItems(id)); setSel(await getInventory(id));
    setCont({ item_code: "", counted_qty: "", reason: "" });
    setFeedback({ type: "success", message: "Contagem registrada." });
  }); };
  const fechar = () => { const id = sel?.id; if (!id) return; void run(async () => {
    const r = await closeInventory(id, zerar);
    setResultado(r); setSel(await getInventory(id)); setItens(await listInventoryItems(id)); setInvs(await listInventories());
    setFeedback({ type: "success", message: `Inventário fechado: ${r.adjustments} ajuste(s), valor líquido ${reais(r.adjusted_value)}.` });
  }); };

  const linhas = itens.map((it) => {
    const sys = parseNum(it, "system_qty"); const counted = it["counted_qty"] != null ? parseNum(it, "counted_qty") : null;
    const diff = counted == null ? null : (it["difference_qty"] != null ? parseNum(it, "difference_qty") : counted - sys);
    const custo = parseNum(it, "unit_cost");
    return { it, item: parseStr(it, "item_code"), sys, counted, diff, custo, contagens: parseNum(it, "count_number"), anterior: it["previous_counted_qty"] != null ? parseNum(it, "previous_counted_qty") : null, motivo: parseStr(it, "adjustment_reason"), ajustado: it["is_adjusted"] === true };
  });
  const naoContados = linhas.filter((l) => l.counted == null).length;
  const valorDif = linhas.reduce((s, l) => s + (l.diff ?? 0) * l.custo, 0);

  return (<>
    <FeedbackBox feedback={feedback} />
    <div className="erp-fieldset"><div className="erp-fieldset-head">Abrir inventário</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c2"><label className="erp-label">Número</label><input className="erp-input num" value={novo.code} placeholder={proximoCodigo()} onChange={(e) => setNovo((p) => ({ ...p, code: e.target.value }))} /></div>
      <div className="erp-field erp-c3"><label className="erp-label erp-req">Almoxarifado</label>
        <LookupField value={novo.warehouse_id || undefined} loader={loadWarehouses} entityLabel="almoxarifado" onChange={(c) => setNovo((p) => ({ ...p, warehouse_id: c ? Number(c) : 0 }))} /></div>
      <div className="erp-field erp-c5"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={novo.description} placeholder="Inventário geral de outubro" onChange={(e) => setNovo((p) => ({ ...p, description: e.target.value }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label erp-req">Data</label><input className="erp-input" type="date" value={novo.start_date} onChange={(e) => setNovo((p) => ({ ...p, start_date: e.target.value }))} /></div>
      <div className="erp-field erp-c4"><label className="erp-label">Inventário parcial (opcional)</label>
        <LookupField value={novo.itemParcial || undefined} loader={loadItems} entityLabel="item" placeholder="Adicionar item…" onChange={(c) => { const v = String(c ?? ""); if (v) setNovo((p) => ({ ...p, parcial: p.parcial.includes(v) ? p.parcial : [...p.parcial, v], itemParcial: "" })); }} /></div>
      <div className="erp-field erp-c6" style={{ alignSelf: "end" }}>
        {novo.parcial.length === 0 ? <span className="erp-hint">Sem itens escolhidos: o almoxarifado inteiro.</span>
          : novo.parcial.map((c) => <span key={c} className="erp-badge erp-badge-blue" style={{ marginRight: 4, cursor: "pointer" }} title="Remover" onClick={() => setNovo((p) => ({ ...p, parcial: p.parcial.filter((x) => x !== c) }))}>{c} ×</span>)}
      </div>
      <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={criar} disabled={busy}>Abrir inventário</button></div>
    </div></div>

    <div className="erp-fieldset"><div className="erp-fieldset-head">Inventários ({invs.length})</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c12"><button className="erp-btn" onClick={carregar} disabled={busy}>Carregar inventários</button></div>
      <div className="erp-field erp-c12">
        <table className="erp-grid">
          <thead><tr><th>Nº</th><th>Almoxarifado</th><th>Descrição</th><th>Data</th><th>Situação</th><th>Contados</th><th className="num">Ajuste</th><th></th></tr></thead>
          <tbody>
            {invs.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhum inventário carregado.</td></tr>}
            {invs.map((iv) => (
              <tr key={iv.id} className={sel?.id === iv.id ? "erp-row-sel" : ""}>
                <td><strong>{iv.code}</strong></td><td><EntityName code={iv.warehouse_id} loader={loadWarehouses} prefix="Almox." /></td>
                <td>{iv.description || "—"}</td><td>{iv.start_date?.slice(0, 10) ?? "—"}</td>
                <td>{iv.status === "OPEN" ? <span className="erp-badge erp-badge-blue">Aberto</span> : <span className="erp-badge erp-badge-gray">Fechado</span>}</td>
                <td>{iv.counted_items ?? 0}/{iv.total_items ?? 0}</td>
                <td className="num">{iv.adjustment_value != null ? reais(iv.adjustment_value) : "—"}</td>
                <td><button className="erp-btn erp-btn-sm" onClick={() => abrir(iv.id)} disabled={busy}>Abrir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div></div>

    {sel && (<>
      <div className="erp-fieldset"><div className="erp-fieldset-head">Inventário {sel.code} — {sel.status === "OPEN" ? "aberto" : "fechado"}</div><div className="erp-fieldset-body">
        {sel.status === "OPEN" ? (<>
          <div className="erp-field erp-c4"><label className="erp-label erp-req">Item</label>
            <LookupField value={cont.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(c) => setCont((p) => ({ ...p, item_code: String(c ?? "") }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Quantidade contada</label><input className="erp-input num" value={cont.counted_qty} onChange={(e) => setCont((p) => ({ ...p, counted_qty: e.target.value }))} /></div>
          <div className="erp-field erp-c4"><label className="erp-label">Observação da contagem</label><input className="erp-input" value={cont.reason} onChange={(e) => setCont((p) => ({ ...p, reason: e.target.value }))} placeholder="Ex.: caixa avariada encontrada" /></div>
          <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={contar} disabled={busy}>Registrar contagem</button></div>
          <div className="erp-field erp-c12" style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <Resumo>{naoContados} item(ns) sem contagem · diferença valorizada {reais(valorDif)}</Resumo>
            <label style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}><input type="checkbox" checked={zerar} onChange={(e) => setZerar(e.target.checked)} /> Zerar os itens não contados</label>
            <button className="erp-btn erp-btn-danger" onClick={fechar} disabled={busy || (naoContados > 0 && !zerar)} title={naoContados > 0 && !zerar ? "Conte todos os itens ou marque 'zerar os não contados'" : ""}>Fechar e lançar ajustes</button>
          </div>
        </>) : (
          <div className="erp-field erp-c12"><Resumo>Inventário fechado. Ajuste líquido: <strong>{reais(sel.adjustment_value)}</strong>. Os ajustes estão no extrato de cada item (VEST0100 › Extrato).</Resumo></div>
        )}
        {resultado && (
          <div className="erp-field erp-c12"><div className="erp-note">
            {resultado.adjustments} ajuste(s) lançado(s): sobras {qtd(resultado.surplus_qty)}, faltas {qtd(resultado.shortage_qty)}, valor líquido <strong>{reais(resultado.adjusted_value)}</strong>
            {resultado.uncounted_zeroed > 0 ? ` · ${resultado.uncounted_zeroed} item(ns) não contado(s) zerado(s)` : ""}.
          </div></div>
        )}
      </div></div>
      <div className="erp-fieldset"><div className="erp-fieldset-head">Itens ({linhas.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
        <table className="erp-grid">
          <thead><tr><th>Item</th><th className="num">Sistema (foto)</th><th className="num">Contado</th><th className="num">Diferença</th><th className="num">Custo</th><th className="num">Valor da diferença</th><th>Contagens</th><th>Observação</th><th>Ajuste</th></tr></thead>
          <tbody>
            {linhas.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">Sem itens.</td></tr>}
            {linhas.map((l, i) => (
              <tr key={i} style={{ color: l.diff != null && l.diff !== 0 ? (l.diff < 0 ? "var(--v-err)" : "var(--v-ok)") : undefined }}>
                <td><EntityName code={l.item} loader={loadItems} prefix="Item" /></td>
                <td className="num">{qtd(l.sys)}</td><td className="num">{l.counted == null ? <span className="erp-badge erp-badge-amber">a contar</span> : qtd(l.counted)}</td>
                <td className="num">{l.diff == null ? "—" : qtd(l.diff)}</td><td className="num">{reais(l.custo)}</td>
                <td className="num">{l.diff == null ? "—" : reais(l.diff * l.custo)}</td>
                <td>{l.contagens || "—"}{l.anterior != null ? ` (antes ${qtd(l.anterior)})` : ""}</td>
                <td>{l.motivo || "—"}</td>
                <td>{l.ajustado ? <span className="erp-badge erp-badge-green">lançado</span> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div></div>
    </>)}
  </>);
}

function TiposAba() {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [tipos, setTipos] = useState<MovementTypeDTO[]>([]);
  const [f, setF] = useState<MovementTypeDTO>({ ...TIPO_VAZIO });
  const editando = !!f.id;
  const set = <K extends keyof MovementTypeDTO>(k: K, v: MovementTypeDTO[K]) => setF((p) => ({ ...p, [k]: v }));

  const carregar = () => run(async () => { setTipos(await listMovementTypes()); });
  const salvar = () => run(async () => {
    if (!f.sigla.trim() || !f.description.trim()) { setFeedback({ type: "error", message: "Sigla e descrição são obrigatórias." }); return; }
    if (editando) await updateMovementType(f); else await createMovementType({ ...f, sigla: f.sigla.trim().toUpperCase() });
    setFeedback({ type: "success", message: `Tipo ${f.sigla} ${editando ? "alterado" : "criado"}.` });
    setF({ ...TIPO_VAZIO }); setTipos(await listMovementTypes());
  });
  const flag = (k: keyof MovementTypeDTO, rotulo: string, dica: string) => (
    <label className="erp-field erp-c3" style={{ flexDirection: "row", gap: 6, alignItems: "center" }} title={dica}>
      <input type="checkbox" checked={f[k] === true} onChange={(e) => set(k, e.target.checked as never)} /> {rotulo}
    </label>
  );

  return (<>
    <FeedbackBox feedback={feedback} />
    <div className="erp-fieldset"><div className="erp-fieldset-head">{editando ? `Alterando o tipo ${f.sigla}` : "Novo tipo de movimento"}</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c2"><label className="erp-label erp-req">Sigla</label><input className="erp-input" value={f.sigla} disabled={editando} onChange={(e) => set("sigla", e.target.value)} /></div>
      <div className="erp-field erp-c4"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
      <div className="erp-field erp-c3"><label className="erp-label">Direção</label>
        <select className="erp-input" value={f.entry_exit} onChange={(e) => set("entry_exit", e.target.value)}>
          <option value="ENTRADA">Entrada</option><option value="SAIDA">Saída</option><option value="AMBOS">Entrada ou saída</option><option value="TRANSFERENCIA">Transferência</option>
        </select></div>
      <div className="erp-field erp-c3"><label className="erp-label">Uso</label>
        <select className="erp-input" value={f.usage_type} onChange={(e) => set("usage_type", e.target.value)}>
          <option value="GERAL">Geral</option><option value="PRODUCAO">Produção</option><option value="COMPRAS">Compras</option><option value="VENDAS">Vendas</option><option value="AJUSTE">Ajuste</option><option value="TRANSFERENCIA">Transferência</option>
        </select></div>
      {flag("allows_manual", "Permite lançamento manual", "Desmarque para tipos gerados só por processo (nota, produção)")}
      {flag("requires_cost_center", "Exige centro de custo", "O lançamento manual com este tipo precisa do centro de custo")}
      {flag("updates_avg_cost", "Entrada atualiza o custo médio", "Desmarcado, a entrada entra pelo custo médio atual (ex.: devolução interna)")}
      {flag("considers_consumption", "Considera consumo", "A saída entra na média de consumo, no ponto de pedido e na curva ABC")}
      {flag("is_adjustment", "É ajuste", "Classifica o movimento como ajuste nos relatórios")}
      {flag("updates_cycle_count", "Atualiza contagem cíclica", "")}
      {flag("shows_in_summary", "Aparece no resumo", "")}
      {flag("generates_fci_movement", "Gera movimento FCI", "")}
      {editando && flag("is_active", "Ativo", "Inativo some do lançamento manual")}
      <div className="erp-field erp-c12" style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <button className="erp-btn erp-btn-primary" onClick={salvar} disabled={busy}>{editando ? "Salvar alteração" : "Criar tipo"}</button>
        {editando && <button className="erp-btn" onClick={() => setF({ ...TIPO_VAZIO })}>Novo</button>}
      </div>
    </div></div>
    <div className="erp-fieldset"><div className="erp-fieldset-head">Tipos cadastrados ({tipos.length})</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c12"><button className="erp-btn" onClick={carregar} disabled={busy}>Carregar tipos</button></div>
      <div className="erp-field erp-c12">
        <table className="erp-grid">
          <thead><tr><th>Sigla</th><th>Descrição</th><th>Direção</th><th>Manual</th><th>Centro de custo</th><th>Atualiza custo</th><th>Consumo</th><th>Situação</th></tr></thead>
          <tbody>
            {tipos.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Clique em Carregar tipos.</td></tr>}
            {tipos.map((t) => (
              <tr key={t.sigla} onClick={() => setF({ ...TIPO_VAZIO, ...t })} style={{ cursor: "pointer", opacity: t.is_active === false ? 0.55 : 1 }} title="Clique para alterar">
                <td><strong>{t.sigla}</strong></td><td>{t.description}</td><td>{t.entry_exit}</td>
                <td>{t.allows_manual ? "Sim" : "Não"}</td><td>{t.requires_cost_center ? "Exige" : "—"}</td>
                <td>{t.updates_avg_cost ? "Sim" : "Não"}</td><td>{t.considers_consumption ? "Sim" : "Não"}</td>
                <td>{t.is_active === false ? "Inativo" : "Ativo"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div></div>
  </>);
}

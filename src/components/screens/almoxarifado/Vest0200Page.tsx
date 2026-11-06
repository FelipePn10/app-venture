import { useCallback, useEffect, useState } from "react";
import { CadernosInventario } from "./estoque/CadernosInventario";
import {
  type InventoryCloseResult, type InventoryDTO, type MovementTypeDTO,
  closeInventory, countInventoryItem, createInventory, createMovementType, finishInventoryCount, getInventory,
  listInventories, listInventoryItems, listMovementTypes, recountInventory, updateMovementType,
  listarMotivosDivergencia, type MotivoDivergenciaDTO,
} from "@/services/stockService";
import { type Obj, parseNum, parseStr } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadItems, loadWarehouses } from "@/services/lookups";
import { dataBR, hoje, qtd, reais, useAcao } from "./estoque/comum";
import { FeedbackBox, Resumo } from "./estoque/ui";
import { SituacoesLoteAba } from "./estoque/SituacoesLoteAba";
import { FechamentoAba } from "./estoque/FechamentoAba";

type Aba = "inventario" | "tipos" | "lotes" | "fechamento";

const DICA: Record<Aba, string> = {
  inventario: "Abrir → contar → conferir → fechar (o fechamento lança os ajustes)",
  tipos: "As regras do tipo valem no lançamento manual (VEST0100 › Lançamentos)",
  lotes: "A situação do lote é trocada em VEST0100 › Lotes",
  fechamento: "Simule antes de fechar: depois disso nenhum movimento pode ter data no mês",
};

const TIPO_VAZIO: MovementTypeDTO = {
  sigla: "", description: "", usage_type: "GERAL", entry_exit: "SAIDA",
  considers_consumption: true, updates_avg_cost: true, is_adjustment: false, updates_cycle_count: false,
  shows_in_summary: true, entry_order: false, exit_order: false, generates_fci_movement: false,
  requires_cost_center: false, allows_manual: true, is_active: true,
};

/**
 * Inventário físico e tipos de movimento.
 *
 * Inventário: a abertura grava a FOTO do saldo por endereço e lote; a contagem
 * é feita na própria lista (recontar substitui a anterior, que fica guardada);
 * encerrar a contagem mostra as diferenças, e o fechamento lança o ajuste de cada
 * uma ao custo médio ou o manda para aprovação. O que entrou ou saiu depois da
 * abertura continua valendo. Contagem cíclica fica na VEST0500.
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
            <button role="tab" className={`erp-tab${aba === "lotes" ? " active" : ""}`} onClick={() => setAba("lotes")}>Situações de lote</button>
            <button role="tab" className={`erp-tab${aba === "fechamento" ? " active" : ""}`} onClick={() => setAba("fechamento")}>Fechamento mensal</button>
          </div>
          <div className="erp-detail-body">
            {aba === "inventario" ? <InventarioAba /> : aba === "tipos" ? <TiposAba /> : aba === "lotes" ? <SituacoesLoteAba /> : <FechamentoAba />}
          </div>
        </section>
      </div>
      <footer className="erp-statusbar">
        <div className="erp-status-item">{DICA[aba]}</div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

const SITUACAO: Record<string, { rotulo: string; cor: string }> = {
  OPEN: { rotulo: "Em contagem", cor: "erp-badge-blue" },
  EM_CONFERENCIA: { rotulo: "Em conferência", cor: "erp-badge-amber" },
  AGUARDANDO_APROVACAO: { rotulo: "Aguardando aprovação", cor: "erp-badge-amber" },
  CLOSED: { rotulo: "Fechado", cor: "erp-badge-gray" },
};
const numero = (v: string) => Number(v.replace(",", "."));

function InventarioAba() {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [invs, setInvs] = useState<InventoryDTO[]>([]);
  const [sel, setSel] = useState<InventoryDTO | null>(null);
  const [itens, setItens] = useState<Obj[]>([]);
  const [novo, setNovo] = useState({
    code: "", warehouse_id: 0, description: "", start_date: hoje(), parcial: [] as string[], itemParcial: "",
    bloquear: false, cega: true, aprovacao: "NUNCA" as NonNullable<InventoryDTO["approval_mode"]>, tolPct: "", tolValor: "",
  });
  const [digitado, setDigitado] = useState<Record<string, string>>({});
  const [achado, setAchado] = useState({ item_code: "", address: "", lot: "", counted_qty: "" });
  const [zerar, setZerar] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [motivos, setMotivos] = useState<MotivoDivergenciaDTO[]>([]);
  useEffect(() => { listarMotivosDivergencia().then(setMotivos).catch(() => setMotivos([])); }, []);
  const [resultado, setResultado] = useState<InventoryCloseResult | null>(null);

  const carregar = useCallback(() => run(async () => { setInvs(await listInventories()); }), [run]);
  // A lista vem ao abrir: é dela que sai o próximo número sugerido.
  useEffect(() => { void carregar(); }, [carregar]);
  const recarregar = async (id: number) => { setSel(await getInventory(id)); setItens(await listInventoryItems(id)); setDigitado({}); };
  const abrir = (id?: number) => { if (id) void run(async () => { await recarregar(id); setResultado(null); }); };
  const proximoCodigo = () => String((invs.reduce((m, i) => Math.max(m, i.code ?? 0), 0) || 0) + 1);

  const criar = () => run(async () => {
    const code = Number(novo.code || proximoCodigo());
    if (!novo.warehouse_id || !novo.description.trim()) { setFeedback({ type: "error", message: "Almoxarifado e descrição são obrigatórios." }); return; }
    if (novo.aprovacao === "FORA_TOLERANCIA" && !novo.tolPct && !novo.tolValor) { setFeedback({ type: "error", message: "Informe a tolerância em percentual ou em valor." }); return; }
    const inv = await createInventory({
      code, warehouse_id: novo.warehouse_id, description: novo.description.trim(), start_date: novo.start_date,
      item_codes: novo.parcial.length ? novo.parcial : undefined, blocks_movements: novo.bloquear, blind_count: novo.cega,
      approval_mode: novo.aprovacao, tolerance_pct: novo.tolPct ? numero(novo.tolPct) : undefined, tolerance_value: novo.tolValor ? numero(novo.tolValor) : undefined,
    });
    setNovo((p) => ({ ...p, code: "", description: "", parcial: [] }));
    setInvs(await listInventories());
    if (inv.id) { await recarregar(inv.id); setResultado(null); }
    setFeedback({ type: "success", message: `Inventário ${inv.code} aberto com a foto de ${inv.total_items ?? 0} linha(s).` });
  });

  const linhas = itens.map((it) => {
    const sys = parseNum(it, "system_qty"); const counted = it["counted_qty"] != null ? parseNum(it, "counted_qty") : null;
    const diff = counted == null ? null : (it["difference_qty"] != null ? parseNum(it, "difference_qty") : null);
    const custo = parseNum(it, "unit_cost");
    return {
      id: parseNum(it, "id"), item: parseStr(it, "item_code"), mask: parseStr(it, "mask"), address: parseStr(it, "address"), lot: parseStr(it, "lot"),
      sys, counted, diff, custo, contagens: parseNum(it, "count_number"), anterior: it["previous_counted_qty"] != null ? parseNum(it, "previous_counted_qty") : null,
      motivo: parseStr(it, "adjustment_reason"), ajustado: Boolean(it["is_adjusted"]), recontar: Boolean(it["needs_recount"]),
    };
  });
  const emContagem = sel?.status === "OPEN";
  const emConferencia = sel?.status === "EM_CONFERENCIA";
  const cega = Boolean(sel?.blind_count) && emContagem;
  const naoContados = linhas.filter((l) => l.counted == null).length;
  const valorDif = linhas.reduce((s, l) => s + (l.diff ?? 0) * l.custo, 0);
  const pendentes = Object.keys(digitado).filter((id) => digitado[id].trim() !== "").length;

  const gravar = () => { const id = sel?.id; if (!id) return; void run(async () => {
    const alterar = linhas.filter((l) => (digitado[l.id] ?? "").trim() !== "");
    if (alterar.some((l) => !(numero(digitado[l.id]) >= 0))) { setFeedback({ type: "error", message: "Informe quantidades válidas, sem valores negativos." }); return; }
    for (const l of alterar) {
      await countInventoryItem({ inventory_id: id, item_code: l.item, warehouse_id: sel!.warehouse_id, address: l.address || undefined, lot: l.lot || undefined, counted_qty: numero(digitado[l.id]) });
    }
    await recarregar(id);
    setFeedback({ type: "success", message: `${alterar.length} contagem(ns) gravada(s).` });
  }); };
  const incluirAchado = () => { const id = sel?.id; if (!id) return; void run(async () => {
    if (!achado.item_code || achado.counted_qty === "" || !(numero(achado.counted_qty) >= 0)) { setFeedback({ type: "error", message: "Item e quantidade contada são obrigatórios." }); return; }
    await countInventoryItem({ inventory_id: id, item_code: achado.item_code, warehouse_id: sel!.warehouse_id, address: achado.address.trim() || undefined, lot: achado.lot.trim() || undefined, counted_qty: numero(achado.counted_qty) });
    await recarregar(id);
    setAchado({ item_code: "", address: "", lot: "", counted_qty: "" });
    setFeedback({ type: "success", message: "Item encontrado incluído na contagem." });
  }); };
  const encerrarContagem = () => { const id = sel?.id; if (!id) return; void run(async () => {
    await finishInventoryCount(id); await recarregar(id); setInvs(await listInventories());
    setFeedback({ type: "info", message: "Contagem encerrada: confira as diferenças antes de fechar." });
  }); };
  const recontar = () => { const id = sel?.id; if (!id) return; void run(async () => {
    const n = await recountInventory(id); await recarregar(id); setInvs(await listInventories());
    setFeedback({ type: "info", message: `${n} linha(s) voltaram para a contagem.` });
  }); };
  const fechar = () => { const id = sel?.id; if (!id) return; void run(async () => {
    if (!motivo.trim()) { setFeedback({ type: "error", message: "Informe o motivo do acerto." }); return; }
    const r = await closeInventory(id, zerar, motivo.trim());
    await recarregar(id); setInvs(await listInventories());
    if (r.pending_approval) { setResultado(null); setFeedback({ type: "info", message: "O ajuste foi enviado para aprovação (VAPR0100). O estoque só muda depois de aprovado." }); return; }
    setResultado(r);
    setFeedback({ type: "success", message: `Inventário fechado: ${r.adjustments} ajuste(s), valor líquido ${reais(r.adjusted_value)}.` });
  }); };

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
      <div className="erp-field erp-c8" style={{ alignSelf: "end" }}>
        {novo.parcial.length === 0 ? <span className="erp-hint">Sem itens escolhidos: o almoxarifado inteiro.</span>
          : novo.parcial.map((c) => <span key={c} className="erp-badge erp-badge-blue" style={{ marginRight: 4, cursor: "pointer" }} title="Remover" onClick={() => setNovo((p) => ({ ...p, parcial: p.parcial.filter((x) => x !== c) }))}><EntityName code={c} loader={loadItems} prefix="Item" showCode={false} /> ✕</span>)}
      </div>
      <div className="erp-field erp-c3"><label className="erp-label">Aprovação do ajuste</label>
        <select className="erp-input" value={novo.aprovacao} onChange={(e) => setNovo((p) => ({ ...p, aprovacao: e.target.value as typeof p.aprovacao }))}>
          <option value="NUNCA">Sem aprovação</option><option value="FORA_TOLERANCIA">Só fora da tolerância</option><option value="SEMPRE">Sempre que houver diferença</option>
        </select></div>
      <div className="erp-field erp-c2"><label className="erp-label">Tolerância (%)</label><input className="erp-input num" value={novo.tolPct} onChange={(e) => setNovo((p) => ({ ...p, tolPct: e.target.value }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Tolerância (R$)</label><input className="erp-input num" value={novo.tolValor} onChange={(e) => setNovo((p) => ({ ...p, tolValor: e.target.value }))} /></div>
      <div className="erp-field erp-c5" style={{ alignSelf: "end", gap: 4 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={novo.cega} onChange={(e) => setNovo((p) => ({ ...p, cega: e.target.checked }))} /> Contagem cega (quem conta não vê o saldo do sistema)</label>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={novo.bloquear} onChange={(e) => setNovo((p) => ({ ...p, bloquear: e.target.checked }))} /> Bloquear a movimentação até o fechamento</label>
      </div>
      {novo.bloquear && <div className="erp-field erp-c12"><div className="erp-note">Com o bloqueio, notas, apontamentos e requisições destes itens neste almoxarifado ficam recusados até o inventário terminar. Sem ele, o ajuste é feito pela diferença contra a foto e o que entrou ou saiu depois continua valendo.</div></div>}
      <div className="erp-field erp-c12" style={{ alignItems: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={criar} disabled={busy}>Abrir inventário</button></div>
    </div></div>

    <div className="erp-fieldset"><div className="erp-fieldset-head">Inventários ({invs.length})</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c12">
        <table className="erp-grid">
          <thead><tr><th>Nº</th><th>Almoxarifado</th><th>Descrição</th><th>Data</th><th>Situação</th><th>Contados</th><th className="num">Ajuste</th><th></th></tr></thead>
          <tbody>
            {invs.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhum inventário.</td></tr>}
            {invs.map((iv) => { const st = SITUACAO[iv.status ?? ""] ?? SITUACAO.OPEN; return (
              <tr key={iv.id} className={sel?.id === iv.id ? "erp-row-sel" : ""}>
                <td><strong>{iv.code}</strong></td><td><EntityName code={iv.warehouse_id} loader={loadWarehouses} prefix="Almox." /></td>
                <td>{iv.description || "—"}</td><td>{dataBR(iv.start_date)}</td>
                <td><span className={`erp-badge ${st.cor}`}>{st.rotulo}</span></td>
                <td>{iv.counted_items ?? 0}/{iv.total_items ?? 0}</td>
                <td className="num">{iv.adjustment_value != null ? reais(iv.adjustment_value) : "—"}</td>
                <td><button className="erp-btn erp-btn-sm" onClick={() => abrir(iv.id)} disabled={busy}>Abrir</button></td>
              </tr>); })}
          </tbody>
        </table>
      </div>
    </div></div>

    {sel && (<>
      <CadernosInventario inventario={Number(sel.id)} codigo={sel.code ?? ""} aberto={sel.status === "OPEN"} linhas={itens} aoGerar={() => recarregar(Number(sel.id))} />
      <div className="erp-fieldset"><div className="erp-fieldset-head">Inventário {sel.code} — {(SITUACAO[sel.status ?? ""] ?? SITUACAO.OPEN).rotulo.toLowerCase()}</div><div className="erp-fieldset-body">
        <div className="erp-field erp-c12" style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {sel.blind_count && <span className="erp-badge erp-badge-gray">Contagem cega</span>}
          {sel.blocks_movements && <span className="erp-badge erp-badge-red">Movimentação bloqueada</span>}
          {sel.approval_mode === "SEMPRE" && <span className="erp-badge erp-badge-gray">Ajuste com aprovação</span>}
          {sel.approval_mode === "FORA_TOLERANCIA" && <span className="erp-badge erp-badge-gray">Aprovação fora da tolerância{sel.tolerance_pct != null ? ` · ${sel.tolerance_pct}%` : ""}{sel.tolerance_value != null ? ` · ${reais(sel.tolerance_value)}` : ""}</span>}
        </div>
        {emContagem && (<>
          <div className="erp-field erp-c4"><label className="erp-label">Encontrou item fora da lista?</label>
            <LookupField value={achado.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(c) => setAchado((p) => ({ ...p, item_code: String(c ?? "") }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Endereço</label><input className="erp-input" value={achado.address} onChange={(e) => setAchado((p) => ({ ...p, address: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Lote</label><input className="erp-input" value={achado.lot} onChange={(e) => setAchado((p) => ({ ...p, lot: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Quantidade</label><input className="erp-input num" value={achado.counted_qty} onChange={(e) => setAchado((p) => ({ ...p, counted_qty: e.target.value }))} /></div>
          <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn" onClick={incluirAchado} disabled={busy}>Incluir</button></div>
          <div className="erp-field erp-c12" style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <Resumo>{naoContados} linha(s) sem contagem{pendentes > 0 ? ` · ${pendentes} digitada(s) sem gravar` : ""}</Resumo>
            <button className="erp-btn erp-btn-primary" onClick={gravar} disabled={busy || pendentes === 0}>Gravar contagens</button>
            <button className="erp-btn" onClick={encerrarContagem} disabled={busy || pendentes > 0} title={pendentes > 0 ? "Grave as contagens digitadas antes" : undefined}>Encerrar contagem</button>
          </div>
        </>)}
        {emConferencia && (<>
          <div className="erp-field erp-c12"><Resumo>{naoContados} linha(s) sem contagem · diferença valorizada {reais(valorDif)}</Resumo></div>
          <div className="erp-field erp-c6"><label className="erp-label erp-req">Motivo do acerto</label><input className="erp-input" list="motivos-divergencia" value={motivo} placeholder="Inventário anual" onChange={(e) => setMotivo(e.target.value)} /><span className="erp-field-hint">Fica na observação dos movimentos de ajuste.</span></div>
          <datalist id="motivos-divergencia">{motivos.filter((m) => m.is_active).map((m) => <option key={m.code} value={m.description} />)}</datalist>
          <div className="erp-field erp-c6" style={{ alignSelf: "center" }}><label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={zerar} onChange={(e) => setZerar(e.target.checked)} /> Zerar as linhas não contadas</label></div>
          <div className="erp-field erp-c12" style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <button className="erp-btn" onClick={recontar} disabled={busy}>Recontar as divergências</button>
            <button className="erp-btn erp-btn-danger" onClick={fechar} disabled={busy || (naoContados > 0 && !zerar)} title={naoContados > 0 && !zerar ? "Conte todas as linhas ou marque 'zerar'" : undefined}>Fechar e lançar ajustes</button>
          </div>
        </>)}
        {sel.status === "AGUARDANDO_APROVACAO" && <div className="erp-field erp-c12"><div className="erp-note">Ajuste aguardando aprovação em Aprovações (VAPR0100). Se for reprovado, o inventário volta para a conferência.{sel.close_reason ? ` Motivo: ${sel.close_reason}.` : ""}</div></div>}
        {sel.status === "CLOSED" && <div className="erp-field erp-c12"><Resumo>Inventário fechado. Ajuste líquido: <strong>{reais(sel.adjustment_value)}</strong>.{sel.close_reason ? ` Motivo: ${sel.close_reason}.` : ""} Os ajustes estão no extrato de cada item (VEST0100 › Extrato).</Resumo></div>}
        {resultado && (
          <div className="erp-field erp-c12"><div className="erp-note">
            {resultado.adjustments} ajuste(s) lançado(s): sobras {qtd(resultado.surplus_qty)}, faltas {qtd(resultado.shortage_qty)}, valor líquido <strong>{reais(resultado.adjusted_value)}</strong>
            {resultado.uncounted_zeroed > 0 ? ` · ${resultado.uncounted_zeroed} linha(s) não contada(s) zerada(s)` : ""}.
          </div></div>
        )}
      </div></div>
      <div className="erp-fieldset"><div className="erp-fieldset-head">Lista de contagem ({linhas.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
        <table className="erp-grid">
          <thead><tr><th>Endereço</th><th>Item</th><th>Lote</th>{!cega && <th className="num">Sistema (foto)</th>}<th className="num">Contado</th>{!cega && <th className="num">Diferença</th>}{!cega && <th className="num">Valor</th>}<th>Contagens</th><th>Ajuste</th></tr></thead>
          <tbody>
            {linhas.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">Sem linhas.</td></tr>}
            {linhas.map((l) => (
              <tr key={l.id} style={{ color: !cega && l.diff != null && l.diff !== 0 ? (l.diff < 0 ? "var(--v-err)" : "var(--v-ok)") : undefined }}>
                <td>{l.address || "—"}</td>
                <td><EntityName code={l.item} loader={loadItems} prefix="Item" />{l.mask ? ` · ${l.mask}` : ""}</td>
                <td>{l.lot || "—"}</td>
                {!cega && <td className="num">{qtd(l.sys)}</td>}
                <td className="num">{emContagem
                  ? <input className="erp-input num" style={{ width: 100, marginLeft: "auto" }} aria-label={`Contagem de ${l.item}`} placeholder={l.counted != null ? qtd(l.counted) : ""} value={digitado[l.id] ?? ""} onChange={(e) => setDigitado((p) => ({ ...p, [l.id]: e.target.value }))} />
                  : l.counted == null ? <span className="erp-badge erp-badge-amber">não contado</span> : qtd(l.counted)}</td>
                {!cega && <td className="num">{l.diff == null ? "—" : qtd(l.diff)}</td>}
                {!cega && <td className="num">{l.diff == null ? "—" : reais(l.diff * l.custo)}</td>}
                <td>{l.recontar ? <span className="erp-badge erp-badge-amber">recontar</span> : (l.contagens || "—")}{!cega && l.anterior != null ? ` (antes ${qtd(l.anterior)})` : ""}</td>
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

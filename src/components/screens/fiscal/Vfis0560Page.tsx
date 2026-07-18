import { useState, useCallback, useEffect } from "react";
import {
  type NotaEspecialDTO, type NotaEspecialItemDTO, type NotaEspecialPurpose,
  listNotasEspeciais, createNotaEspecial, updateNotaEspecial, addNotaEspecialItem, listNotaEspecialItens,
} from "@/services/fiscalAdvancedService";
import { errMessage, type Obj, parseStr, parseNum } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const currentPeriod = () => new Date().toISOString().slice(0, 7);
const todayIso = () => new Date().toISOString();
const PURPOSES: NotaEspecialPurpose[] = ["COMPLEMENTAR", "AJUSTE"];

const EMPTY: NotaEspecialDTO = {
  empresa_id: 1, purpose: "AJUSTE", issue_date: todayIso(), period: currentPeriod(),
  auto_generate_summary: false, total_value: 0, total_icms: 0, observation: "",
};
const EMPTY_ITEM: NotaEspecialItemDTO = {
  item_code: "", description: "", quantity: 1, unit: "UN", unit_value: 0, total_value: 0,
  icms_base: 0, icms_pct: 0, icms_value: 0, cst_icms: "00",
};

function statusPill(s?: string): JSX.Element {
  const x = (s ?? "").toLowerCase();
  const cls = x.includes("emitid") ? "erp-badge-green" : x.includes("cancel") ? "erp-badge-red" : "erp-badge-amber";
  return <span className={`erp-badge ${cls}`}>{s || "—"}</span>;
}

export function Vfis0560Page(): JSX.Element {
  const [form, setForm] = useState<NotaEspecialDTO>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [list, setList] = useState<NotaEspecialDTO[]>([]);
  const [selected, setSelected] = useState<NotaEspecialDTO | null>(null);
  const [itens, setItens] = useState<Obj[]>([]);
  const [itemForm, setItemForm] = useState<NotaEspecialItemDTO>(EMPTY_ITEM);
  const [periodFilter, setPeriodFilter] = useState(currentPeriod());
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  // O endpoint de listagem exige period=YYYY-MM.
  const reload = useCallback(async (period: string) => {
    if (!/^\d{4}-\d{2}$/.test(period)) { setFeedback({ type: "error", message: "Informe um período YYYY-MM para listar." }); return; }
    setBusy(true);
    try { setList(await listNotasEspeciais({ period })); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar notas especiais.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(currentPeriod()); }, [reload]);

  const setF = <K extends keyof NotaEspecialDTO>(k: K, v: NotaEspecialDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  const setI = <K extends keyof NotaEspecialItemDTO>(k: K, v: NotaEspecialItemDTO[K]) => setItemForm((p) => {
    const m = { ...p, [k]: v };
    if (k === "quantity" || k === "unit_value") m.total_value = Number((m.quantity * m.unit_value).toFixed(2));
    return m;
  });
  function novo() { setForm({ ...EMPTY, issue_date: todayIso(), period: currentPeriod() }); setEditId(null); setFeedback(null); }
  function edit(n: NotaEspecialDTO) { setForm({ ...n }); setEditId(n.id ?? null); setFeedback(null); }

  async function salvar() {
    if (!/^\d{4}-\d{2}$/.test(form.period)) { setFeedback({ type: "error", message: "Período deve estar no formato YYYY-MM." }); return; }
    if (!form.empresa_id) { setFeedback({ type: "error", message: "Empresa (ID) é obrigatória." }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (editId !== null) { await updateNotaEspecial({ ...form, id: editId }); setFeedback({ type: "success", message: `Nota #${editId} atualizada.` }); }
      else { await createNotaEspecial(form); setFeedback({ type: "success", message: "Nota especial criada (RASCUNHO)." }); }
      novo(); await reload(periodFilter);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function abrir(n: NotaEspecialDTO) {
    if (!n.id) return;
    setSelected(n); setItemForm(EMPTY_ITEM); setBusy(true); setFeedback(null);
    try { setItens(await listNotaEspecialItens(n.id)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function addItem() {
    if (!selected?.id) return;
    if (!itemForm.item_code.trim() || !itemForm.description.trim()) { setFeedback({ type: "error", message: "Código e descrição do item são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await addNotaEspecialItem(selected.id, itemForm);
      setItemForm(EMPTY_ITEM); setItens(await listNotaEspecialItens(selected.id));
      setFeedback({ type: "success", message: "Item adicionado." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Notas Especiais de Ajuste</span><span className="erp-crumb-code">VFIS0560</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Nova Nota</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Filtro período</span>
          <input className="erp-input" style={{ width: 110, height: 32 }} value={periodFilter} placeholder="2024-01" onChange={(e) => setPeriodFilter(e.target.value)} />
          <button className="erp-btn" onClick={() => void reload(periodFilter)} disabled={busy}>Filtrar</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editId !== null ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0560 — Notas Especiais de Ajuste" filename="vfis0560" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Notas Especiais de Ajuste</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Nota  — <span style={{fontWeight:400,opacity:0.65}}>{editId !== null ? `Editando #${editId}` : "Nova (status RASCUNHO)"}</span></div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Empresa (ID)</label>
              <input className="erp-input num" type="number" value={form.empresa_id || ""} onChange={(e) => setF("empresa_id", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Finalidade</label>
              <select className="erp-input" value={form.purpose} onChange={(e) => setF("purpose", e.target.value as NotaEspecialPurpose)}>
                {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Período</label>
              <input className="erp-input" value={form.period} placeholder="2024-01" onChange={(e) => setF("period", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Emissão</label>
              <input className="erp-input" type="date" value={(form.issue_date || "").slice(0, 10)} onChange={(e) => setF("issue_date", new Date(e.target.value).toISOString())} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Gera resumo automático</label>
              <div className="erp-toggle-row">
                <label className="erp-toggle"><input type="checkbox" checked={!!form.auto_generate_summary} onChange={(e) => setF("auto_generate_summary", e.target.checked)} /><div className="erp-toggle-track" /><div className="erp-toggle-thumb" /></label>
                <span className="erp-toggle-label">{form.auto_generate_summary ? "Sim" : "Não"}</span></div></div>
            <div className="erp-field erp-c2"><label className="erp-label">CFOP (ID)</label>
              <input className="erp-input num" type="number" value={form.cfop_id ?? ""} onChange={(e) => setF("cfop_id", e.target.value ? Number(e.target.value) : undefined)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Linha Apur. (ID)</label>
              <input className="erp-input num" type="number" value={form.icms_apuracao_line_id ?? ""} onChange={(e) => setF("icms_apuracao_line_id", e.target.value ? Number(e.target.value) : undefined)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Cód. Ajuste (ID)</label>
              <input className="erp-input num" type="number" value={form.adjustment_code_id ?? ""} onChange={(e) => setF("adjustment_code_id", e.target.value ? Number(e.target.value) : undefined)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Valor Total</label>
              <input className="erp-input num" type="number" step="0.01" value={form.total_value} onChange={(e) => setF("total_value", Number(e.target.value))} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">ICMS Total</label>
              <input className="erp-input num" type="number" step="0.01" value={form.total_icms} onChange={(e) => setF("total_icms", Number(e.target.value))} /></div>
            <div className="erp-field erp-c12"><label className="erp-label">Observação</label>
              <input className="erp-input" value={form.observation ?? ""} onChange={(e) => setF("observation", e.target.value)} /></div>
          </div>
        </div>

        <div className="erp-fieldset-head">Notas — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div>
        <div className="erp-fieldset"><div className="erp-fieldset-body">
          <table className="erp-grid">
            <thead><tr><th>#</th><th>Período</th><th>Finalidade</th><th>Status</th><th>Total</th><th>ICMS</th><th style={{ width: 150 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhuma nota cadastrada.</td></tr>}
              {list.map((n) => (
                <tr key={n.id}>
                  <td>{n.id}</td><td style={{ fontWeight: 600 }}>{n.period}</td><td>{n.purpose}</td><td>{statusPill(n.status)}</td>
                  <td>{money(n.total_value)}</td><td>{money(n.total_icms)}</td>
                  <td>
                    <button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => edit(n)}>Editar</button>
                    <button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => void abrir(n)} disabled={!n.id}>Itens</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>

        {selected && (
          <>
            <div className="erp-fieldset-head" style={{display:"flex",alignItems:"center",gap:8}}><span>Itens — Nota {selected.id}</span><span style={{flex:1}} /> <button className="erp-btn" onClick={() => setSelected(null)}>Fechar</button></div>
            <div className="erp-fieldset"><div className="erp-fieldset-body">
              
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Item</label>
                  <input className="erp-input" value={itemForm.item_code} onChange={(e) => setI("item_code", e.target.value)} /></div>
                <div className="erp-field erp-c4"><label className="erp-label erp-req">Descrição</label>
                  <input className="erp-input" value={itemForm.description} onChange={(e) => setI("description", e.target.value)} /></div>
                <div className="erp-field erp-c1"><label className="erp-label">Qtd</label>
                  <input className="erp-input num" type="number" value={itemForm.quantity} onChange={(e) => setI("quantity", Number(e.target.value))} /></div>
                <div className="erp-field erp-c1"><label className="erp-label">UN</label>
                  <input className="erp-input" value={itemForm.unit ?? ""} onChange={(e) => setI("unit", e.target.value)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Vlr Unit.</label>
                  <input className="erp-input num" type="number" step="0.01" value={itemForm.unit_value} onChange={(e) => setI("unit_value", Number(e.target.value))} /></div>
                <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
                  <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void addItem()} disabled={busy}>+ Item (R$ {money(itemForm.total_value)})</button></div>
                <div className="erp-field erp-c3"><label className="erp-label">Base ICMS</label>
                  <input className="erp-input num" type="number" step="0.01" value={itemForm.icms_base} onChange={(e) => setI("icms_base", Number(e.target.value))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">% ICMS</label>
                  <input className="erp-input num" type="number" step="0.01" value={itemForm.icms_pct} onChange={(e) => setI("icms_pct", Number(e.target.value))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Valor ICMS</label>
                  <input className="erp-input num" type="number" step="0.01" value={itemForm.icms_value} onChange={(e) => setI("icms_value", Number(e.target.value))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">CST</label>
                  <input className="erp-input" value={itemForm.cst_icms ?? ""} onChange={(e) => setI("cst_icms", e.target.value)} /></div>
              
            </div>
              <div className="erp-fieldset-body">
                <table className="erp-grid">
                  <thead><tr><th>Item</th><th>Descrição</th><th>Qtd</th><th>Total</th><th>ICMS</th><th>CST</th></tr></thead>
                  <tbody>
                    {itens.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum item.</td></tr>}
                    {itens.map((it, i) => (
                      <tr key={i}>
                        <td>{parseStr(it, "item_code", "ItemCode")}</td><td>{parseStr(it, "description", "Description")}</td>
                        <td>{parseNum(it, "quantity", "Quantity") ?? 0}</td>
                        <td>{money(parseNum(it, "total_value", "TotalValue"))}</td>
                        <td>{money(parseNum(it, "icms_value", "IcmsValue"))}</td>
                        <td>{parseStr(it, "cst_icms", "CstIcms") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Notas: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

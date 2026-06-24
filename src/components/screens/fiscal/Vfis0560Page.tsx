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
  const cls = x.includes("emitid") ? "fsc-pill-green" : x.includes("cancel") ? "fsc-pill-red" : "fsc-pill-amber";
  return <span className={`fsc-pill ${cls}`}>{s || "—"}</span>;
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
    <div className="fsc-root">
      <header className="fsc-topbar">
        <div className="fsc-topbar-left">
          <div className="fsc-logo">
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
              <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
              <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
              <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
              <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
            </svg>
          </div>
          <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
          <span className="fsc-screen-title">VFIS0560 — Notas Especiais de Ajuste</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={novo} disabled={busy}>+ Nova Nota</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Filtro período</span>
          <input className="fsc-input" style={{ width: 110, height: 32 }} value={periodFilter} placeholder="2024-01" onChange={(e) => setPeriodFilter(e.target.value)} />
          <button className="fsc-btn fsc-btn-ghost" onClick={() => void reload(periodFilter)} disabled={busy}>Filtrar</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Ações</span>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editId !== null ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VFIS0560 — Notas Especiais de Ajuste" filename="vfis0560" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Nota</span><div className="fsc-section-banner-line" />
          <span className="fsc-section-banner-hint">{editId !== null ? `Editando #${editId}` : "Nova (status RASCUNHO)"}</span></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Empresa (ID)</label>
              <input className="fsc-input fsc-input-right" type="number" value={form.empresa_id || ""} onChange={(e) => setF("empresa_id", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Finalidade</label>
              <select className="fsc-select" value={form.purpose} onChange={(e) => setF("purpose", e.target.value as NotaEspecialPurpose)}>
                {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Período</label>
              <input className="fsc-input" value={form.period} placeholder="2024-01" onChange={(e) => setF("period", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Emissão</label>
              <input className="fsc-input" type="date" value={(form.issue_date || "").slice(0, 10)} onChange={(e) => setF("issue_date", new Date(e.target.value).toISOString())} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Gera resumo automático</label>
              <div className="fsc-toggle-row">
                <label className="fsc-toggle"><input type="checkbox" checked={!!form.auto_generate_summary} onChange={(e) => setF("auto_generate_summary", e.target.checked)} /><div className="fsc-toggle-track" /><div className="fsc-toggle-thumb" /></label>
                <span className="fsc-toggle-label">{form.auto_generate_summary ? "Sim" : "Não"}</span></div></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">CFOP (ID)</label>
              <input className="fsc-input fsc-input-right" type="number" value={form.cfop_id ?? ""} onChange={(e) => setF("cfop_id", e.target.value ? Number(e.target.value) : undefined)} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Linha Apur. (ID)</label>
              <input className="fsc-input fsc-input-right" type="number" value={form.icms_apuracao_line_id ?? ""} onChange={(e) => setF("icms_apuracao_line_id", e.target.value ? Number(e.target.value) : undefined)} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Cód. Ajuste (ID)</label>
              <input className="fsc-input fsc-input-right" type="number" value={form.adjustment_code_id ?? ""} onChange={(e) => setF("adjustment_code_id", e.target.value ? Number(e.target.value) : undefined)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Valor Total</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.total_value} onChange={(e) => setF("total_value", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">ICMS Total</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.total_icms} onChange={(e) => setF("total_icms", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-12"><label className="fsc-label">Observação</label>
              <input className="fsc-input" value={form.observation ?? ""} onChange={(e) => setF("observation", e.target.value)} /></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Notas</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th>#</th><th>Período</th><th>Finalidade</th><th>Status</th><th className="fsc-num">Total</th><th className="fsc-num">ICMS</th><th style={{ width: 150 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={7} className="fsc-empty">Nenhuma nota cadastrada.</td></tr>}
              {list.map((n) => (
                <tr key={n.id}>
                  <td>{n.id}</td><td style={{ fontWeight: 600 }}>{n.period}</td><td>{n.purpose}</td><td>{statusPill(n.status)}</td>
                  <td className="fsc-num">{money(n.total_value)}</td><td className="fsc-num">{money(n.total_icms)}</td>
                  <td>
                    <button className="fsc-action-btn fsc-edit-btn" onClick={() => edit(n)}>Editar</button>
                    <button className="fsc-action-btn fsc-edit-btn" onClick={() => void abrir(n)} disabled={!n.id}>Itens</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>

        {selected && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Itens — Nota {selected.id}</span><div className="fsc-section-banner-line" />
              <button className="fsc-btn fsc-btn-ghost" onClick={() => setSelected(null)}>Fechar</button></div>
            <div className="fsc-card"><div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Item</label>
                  <input className="fsc-input" value={itemForm.item_code} onChange={(e) => setI("item_code", e.target.value)} /></div>
                <div className="fsc-field fsc-col-4"><label className="fsc-label fsc-label-req">Descrição</label>
                  <input className="fsc-input" value={itemForm.description} onChange={(e) => setI("description", e.target.value)} /></div>
                <div className="fsc-field fsc-col-1"><label className="fsc-label">Qtd</label>
                  <input className="fsc-input fsc-input-right" type="number" value={itemForm.quantity} onChange={(e) => setI("quantity", Number(e.target.value))} /></div>
                <div className="fsc-field fsc-col-1"><label className="fsc-label">UN</label>
                  <input className="fsc-input" value={itemForm.unit ?? ""} onChange={(e) => setI("unit", e.target.value)} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Vlr Unit.</label>
                  <input className="fsc-input fsc-input-right" type="number" step="0.01" value={itemForm.unit_value} onChange={(e) => setI("unit_value", Number(e.target.value))} /></div>
                <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}>
                  <button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void addItem()} disabled={busy}>+ Item (R$ {money(itemForm.total_value)})</button></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Base ICMS</label>
                  <input className="fsc-input fsc-input-right" type="number" step="0.01" value={itemForm.icms_base} onChange={(e) => setI("icms_base", Number(e.target.value))} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">% ICMS</label>
                  <input className="fsc-input fsc-input-right" type="number" step="0.01" value={itemForm.icms_pct} onChange={(e) => setI("icms_pct", Number(e.target.value))} /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Valor ICMS</label>
                  <input className="fsc-input fsc-input-right" type="number" step="0.01" value={itemForm.icms_value} onChange={(e) => setI("icms_value", Number(e.target.value))} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">CST</label>
                  <input className="fsc-input" value={itemForm.cst_icms ?? ""} onChange={(e) => setI("cst_icms", e.target.value)} /></div>
              </div>
            </div>
              <div className="fsc-results-wrap">
                <table className="fsc-table">
                  <thead><tr><th>Item</th><th>Descrição</th><th className="fsc-num">Qtd</th><th className="fsc-num">Total</th><th className="fsc-num">ICMS</th><th>CST</th></tr></thead>
                  <tbody>
                    {itens.length === 0 && <tr><td colSpan={6} className="fsc-empty">Nenhum item.</td></tr>}
                    {itens.map((it, i) => (
                      <tr key={i}>
                        <td>{parseStr(it, "item_code", "ItemCode")}</td><td>{parseStr(it, "description", "Description")}</td>
                        <td className="fsc-num">{parseNum(it, "quantity", "Quantity") ?? 0}</td>
                        <td className="fsc-num">{money(parseNum(it, "total_value", "TotalValue"))}</td>
                        <td className="fsc-num">{money(parseNum(it, "icms_value", "IcmsValue"))}</td>
                        <td>{parseStr(it, "cst_icms", "CstIcms") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Notas: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}

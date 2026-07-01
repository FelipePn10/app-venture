import { useState, useEffect, useCallback } from "react";
import {
  type SalesDivisionDTO,
  DIVISION_ANALYSIS,
  listSalesDivisions, createSalesDivision, updateSalesDivision, deleteSalesDivision,
} from "@/services/salesDivisionService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const EMPTY: SalesDivisionDTO = { code: 0, description: "", commercial_analysis: "FREE", financial_analysis: "FREE", consider_mrp: true };

export function Vvnd0100Page(): JSX.Element {
  const [list, setList] = useState<SalesDivisionDTO[]>([]);
  const [form, setForm] = useState<SalesDivisionDTO>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listSalesDivisions()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar divisões de vendas.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  function novo() { setForm(EMPTY); setEditing(false); setFeedback(null); }
  async function salvar() {
    if (!form.code) { setFeedback({ type: "error", message: "Código é obrigatório (maior que zero)." }); return; }
    if (!form.description.trim()) { setFeedback({ type: "error", message: "Descrição é obrigatória." }); return; }
    setBusy(true); setFeedback(null);
    try { if (editing) await updateSalesDivision(form.code, form); else await createSalesDivision(form); setFeedback({ type: "success", message: `Divisão ${form.code} salva.` }); novo(); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function remover(code: number) {
    setBusy(true); setFeedback(null);
    try { await deleteSalesDivision(code); setFeedback({ type: "success", message: `Divisão ${code} excluída.` }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VVND0100 — Divisão de Vendas</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={novo} disabled={busy}>+ Novo</button>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "..." : editing ? "Atualizar" : "Salvar"}</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VVND0100 — Divisão de Vendas" filename="vvnd0100" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Organização comercial</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">Equipe / região / unidade associável ao pedido de venda.</span></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Código</label><input className="fsc-input fsc-input-right" type="number" value={form.code || ""} disabled={editing} onChange={(e) => setForm((p) => ({ ...p, code: Number(e.target.value) }))} /></div>
          <div className="fsc-field fsc-col-4"><label className="fsc-label fsc-label-req">Descrição</label><input className="fsc-input" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-3"><label className="fsc-label">Análise comercial</label>
            <select className="fsc-input" value={form.commercial_analysis ?? "FREE"} onChange={(e) => setForm((p) => ({ ...p, commercial_analysis: e.target.value as SalesDivisionDTO["commercial_analysis"] }))}>{DIVISION_ANALYSIS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}</select></div>
          <div className="fsc-field fsc-col-3"><label className="fsc-label">Análise financeira</label>
            <select className="fsc-input" value={form.financial_analysis ?? "FREE"} onChange={(e) => setForm((p) => ({ ...p, financial_analysis: e.target.value as SalesDivisionDTO["financial_analysis"] }))}>{DIVISION_ANALYSIS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}</select></div>
          <div className="fsc-field fsc-col-3" style={{ alignSelf: "end" }}><label className="fsc-action-label" style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={!!form.consider_mrp} onChange={(e) => setForm((p) => ({ ...p, consider_mrp: e.target.checked }))} /> Considera MRP</label></div>
        </div></div></div>

        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th className="fsc-num">Código</th><th>Descrição</th><th style={{ width: 130 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={3} className="fsc-empty">Nenhuma divisão de vendas.</td></tr>}
              {list.map((d) => (
                <tr key={d.code}><td className="fsc-num" style={{ fontWeight: 600 }}>{d.code}</td><td>{d.description}</td>
                  <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => { setForm({ ...d }); setEditing(true); setFeedback(null); }}>Editar</button>
                    <button className="fsc-action-btn fsc-delete-btn" onClick={() => void remover(d.code)}>Excluir</button></td></tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Divisões: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}

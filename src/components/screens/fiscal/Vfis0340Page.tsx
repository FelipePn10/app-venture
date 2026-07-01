import { useState, useCallback, useEffect } from "react";
import {
  type ApuracaoSimples, type ApuracaoSimplesDTO, type SimplesAnexo,
  listApuracaoSimples, createApuracaoSimples, updateApuracaoSimples,
} from "@/services/fiscalSupportService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const ANEXOS: SimplesAnexo[] = ["I", "II", "III", "IV", "V", "VI"];
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const currentPeriod = () => new Date().toISOString().slice(0, 7);

const EMPTY: ApuracaoSimplesDTO = {
  period: currentPeriod(), annex: "I", receita_interna: 0, receita_externa: 0, folha_pagamento: 0,
  receita_bruta_12m: 0, simples_recolhido: 0, aliquota_nominal: 0, aliquota_efetiva: 0,
  aliquota_efetiva_icms: 0, parcela_deduzir: 0, observation: "",
};

export function Vfis0340Page(): JSX.Element {
  const [form, setForm] = useState<ApuracaoSimplesDTO>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [list, setList] = useState<ApuracaoSimples[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listApuracaoSimples(false)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar apurações.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof ApuracaoSimplesDTO>(k: K, v: ApuracaoSimplesDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  const setNum = (k: keyof ApuracaoSimplesDTO, raw: string) => setF(k, (raw === "" ? 0 : Number(raw)) as ApuracaoSimplesDTO[typeof k]);
  function novo() { setForm({ ...EMPTY, period: currentPeriod() }); setEditing(false); setFeedback(null); }
  function edit(a: ApuracaoSimples) { setForm({ ...a }); setEditing(true); setFeedback(null); }

  async function salvar() {
    if (!/^\d{4}-\d{2}$/.test(form.period)) { setFeedback({ type: "error", message: "Período deve estar no formato YYYY-MM." }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (editing) { await updateApuracaoSimples(form); setFeedback({ type: "success", message: `Apuração ${form.period}/${form.annex} atualizada.` }); }
      else { await createApuracaoSimples(form); setFeedback({ type: "success", message: `Apuração ${form.period}/${form.annex} cadastrada.` }); }
      novo(); await reload();
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
          <span className="fsc-screen-title">VFIS0340 — Apuração do Simples Nacional</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={novo} disabled={busy}>+ Nova Apuração</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Ações</span>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editing ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VFIS0340 — Apuração do Simples Nacional" filename="vfis0340" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Dados</span><div className="fsc-section-banner-line" />
          <span className="fsc-section-banner-hint">Par (período, anexo) é único</span></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Período</label>
              <input className="fsc-input" value={form.period} placeholder="2024-01" disabled={editing} onChange={(e) => setF("period", e.target.value)} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Anexo</label>
              <select className="fsc-select" value={form.annex} disabled={editing} onChange={(e) => setF("annex", e.target.value as SimplesAnexo)}>
                {ANEXOS.map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
            <div className="fsc-field fsc-col-4"><label className="fsc-label">Receita Interna</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.receita_interna} onChange={(e) => setNum("receita_interna", e.target.value)} /></div>
            <div className="fsc-field fsc-col-4"><label className="fsc-label">Receita Externa</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.receita_externa} onChange={(e) => setNum("receita_externa", e.target.value)} /></div>
            <div className="fsc-field fsc-col-4"><label className="fsc-label">Folha de Pagamento</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.folha_pagamento} onChange={(e) => setNum("folha_pagamento", e.target.value)} /></div>
            <div className="fsc-field fsc-col-4"><label className="fsc-label">Receita Bruta 12m</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.receita_bruta_12m} onChange={(e) => setNum("receita_bruta_12m", e.target.value)} /></div>
            <div className="fsc-field fsc-col-4"><label className="fsc-label">Simples Recolhido</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.simples_recolhido} onChange={(e) => setNum("simples_recolhido", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Alíq. Nominal (%)</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.aliquota_nominal} onChange={(e) => setNum("aliquota_nominal", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Alíq. Efetiva (%)</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.aliquota_efetiva} onChange={(e) => setNum("aliquota_efetiva", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Alíq. Efetiva ICMS (%)</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.aliquota_efetiva_icms} onChange={(e) => setNum("aliquota_efetiva_icms", e.target.value)} /></div>
            <div className="fsc-field fsc-col-3"><label className="fsc-label">Parcela a Deduzir</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.parcela_deduzir} onChange={(e) => setNum("parcela_deduzir", e.target.value)} /></div>
            <div className="fsc-field fsc-col-12"><label className="fsc-label">Observação</label>
              <input className="fsc-input" value={form.observation ?? ""} onChange={(e) => setF("observation", e.target.value)} /></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Apurações</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th>Período</th><th>Anexo</th><th className="fsc-num">Receita Bruta 12m</th><th className="fsc-num">Alíq. Efetiva</th><th className="fsc-num">Recolhido</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="fsc-empty">Nenhuma apuração cadastrada.</td></tr>}
              {list.map((a) => (
                <tr key={`${a.period}-${a.annex}`}>
                  <td style={{ fontWeight: 600 }}>{a.period}</td><td><span className="fsc-pill fsc-pill-gray">{a.annex}</span></td>
                  <td className="fsc-num">{money(a.receita_bruta_12m)}</td><td className="fsc-num">{a.aliquota_efetiva}%</td>
                  <td className="fsc-num">{money(a.simples_recolhido)}</td>
                  <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => edit(a)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Apurações: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}

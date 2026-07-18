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
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Apuração do Simples Nacional</span><span className="erp-crumb-code">VFIS0340</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Nova Apuração</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editing ? "Atualizar" : "Salvar"}</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0340 — Apuração do Simples Nacional" filename="vfis0340" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Apuração do Simples Nacion</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Dados  — <span style={{fontWeight:400,opacity:0.65}}>Par (período, anexo) é único</span></div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Período</label>
              <input className="erp-input" value={form.period} placeholder="2024-01" disabled={editing} onChange={(e) => setF("period", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Anexo</label>
              <select className="erp-input" value={form.annex} disabled={editing} onChange={(e) => setF("annex", e.target.value as SimplesAnexo)}>
                {ANEXOS.map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
            <div className="erp-field erp-c4"><label className="erp-label">Receita Interna</label>
              <input className="erp-input num" type="number" step="0.01" value={form.receita_interna} onChange={(e) => setNum("receita_interna", e.target.value)} /></div>
            <div className="erp-field erp-c4"><label className="erp-label">Receita Externa</label>
              <input className="erp-input num" type="number" step="0.01" value={form.receita_externa} onChange={(e) => setNum("receita_externa", e.target.value)} /></div>
            <div className="erp-field erp-c4"><label className="erp-label">Folha de Pagamento</label>
              <input className="erp-input num" type="number" step="0.01" value={form.folha_pagamento} onChange={(e) => setNum("folha_pagamento", e.target.value)} /></div>
            <div className="erp-field erp-c4"><label className="erp-label">Receita Bruta 12m</label>
              <input className="erp-input num" type="number" step="0.01" value={form.receita_bruta_12m} onChange={(e) => setNum("receita_bruta_12m", e.target.value)} /></div>
            <div className="erp-field erp-c4"><label className="erp-label">Simples Recolhido</label>
              <input className="erp-input num" type="number" step="0.01" value={form.simples_recolhido} onChange={(e) => setNum("simples_recolhido", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Alíq. Nominal (%)</label>
              <input className="erp-input num" type="number" step="0.01" value={form.aliquota_nominal} onChange={(e) => setNum("aliquota_nominal", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Alíq. Efetiva (%)</label>
              <input className="erp-input num" type="number" step="0.01" value={form.aliquota_efetiva} onChange={(e) => setNum("aliquota_efetiva", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Alíq. Efetiva ICMS (%)</label>
              <input className="erp-input num" type="number" step="0.01" value={form.aliquota_efetiva_icms} onChange={(e) => setNum("aliquota_efetiva_icms", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Parcela a Deduzir</label>
              <input className="erp-input num" type="number" step="0.01" value={form.parcela_deduzir} onChange={(e) => setNum("parcela_deduzir", e.target.value)} /></div>
            <div className="erp-field erp-c12"><label className="erp-label">Observação</label>
              <input className="erp-input" value={form.observation ?? ""} onChange={(e) => setF("observation", e.target.value)} /></div>
          
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Apurações — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Período</th><th>Anexo</th><th>Receita Bruta 12m</th><th>Alíq. Efetiva</th><th>Recolhido</th><th style={{ width: 80 }}>Ações</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhuma apuração cadastrada.</td></tr>}
              {list.map((a) => (
                <tr key={`${a.period}-${a.annex}`}>
                  <td style={{ fontWeight: 600 }}>{a.period}</td><td><span className="erp-badge erp-badge-gray">{a.annex}</span></td>
                  <td>{money(a.receita_bruta_12m)}</td><td>{a.aliquota_efetiva}%</td>
                  <td>{money(a.simples_recolhido)}</td>
                  <td><button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => edit(a)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Apurações: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

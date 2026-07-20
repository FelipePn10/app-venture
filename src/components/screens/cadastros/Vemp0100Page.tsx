import { useState } from "react";
import { type EnterpriseDTO, createEnterprise } from "@/services/enterpriseService";
import { errMessage } from "@/services/fiscalShared";
import { validateCNPJOrCPF } from "@/utils/validation";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const EMPTY: EnterpriseDTO = {
  cnpj: "", razao_social: "", nome_fantasia: "", inscricao_estadual: "", inscricao_municipal: "",
  regime_tributario: "3", uf: "", municipio: "", codigo_municipio: "", cep: "", logradouro: "", numero: "", bairro: "", telefone: "", matriz_cnpj: "",
};
const REGIMES = [{ v: "1", l: "1 — Simples Nacional" }, { v: "2", l: "2 — Lucro Presumido" }, { v: "3", l: "3 — Lucro Real" }];

export function Vemp0100Page(): JSX.Element {
  const [form, setForm] = useState<EnterpriseDTO>(EMPTY);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  function setF<K extends keyof EnterpriseDTO>(k: K, v: EnterpriseDTO[K]) { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); }

  async function salvar() {
    if (!form.cnpj.trim() || !form.razao_social.trim() || !form.uf.trim()) { setFeedback({ type: "error", message: "CNPJ, Razão Social e UF são obrigatórios." }); return; }
    if (!validateCNPJOrCPF(form.cnpj)) { setFeedback({ type: "error", message: "CNPJ inválido (dígito verificador não confere)." }); return; }
    setBusy(true); setFeedback(null);
    try { await createEnterprise(form); setFeedback({ type: "success", message: "Empresa cadastrada com sucesso." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Cadastros & Plataforma</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Cadastro de Empresa</span><span className="erp-crumb-code">VEMP0100</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "..." : "Salvar Empresa"}</button>
          <button className="erp-btn" onClick={() => { setForm(EMPTY); setFeedback(null); }} disabled={busy}>Limpar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VEMP0100 — Cadastro de Empresa" filename="vemp0100" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Cadastro de Empresa</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="erp-fieldset"><div className="erp-fieldset-head">Identificação</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c3"><label className="erp-label erp-req">CNPJ</label><input className="erp-input" value={form.cnpj} onChange={(e) => setF("cnpj", e.target.value)} />
            {form.cnpj.trim() && <span className="erp-field-hint" style={{ color: validateCNPJOrCPF(form.cnpj) ? "#1e6030" : "#b91c1c" }}>{validateCNPJOrCPF(form.cnpj) ? "✓ válido" : "✗ inválido"}</span>}</div>
          <div className="erp-field erp-c6"><label className="erp-label erp-req">Razão Social</label><input className="erp-input" value={form.razao_social} onChange={(e) => setF("razao_social", e.target.value)} /></div>
          <div className="erp-field erp-c3"><label className="erp-label">Nome Fantasia</label><input className="erp-input" value={form.nome_fantasia ?? ""} onChange={(e) => setF("nome_fantasia", e.target.value)} /></div>
          <div className="erp-field erp-c3"><label className="erp-label">Inscrição Estadual</label><input className="erp-input" value={form.inscricao_estadual ?? ""} onChange={(e) => setF("inscricao_estadual", e.target.value)} /></div>
          <div className="erp-field erp-c3"><label className="erp-label">Inscrição Municipal</label><input className="erp-input" value={form.inscricao_municipal ?? ""} onChange={(e) => setF("inscricao_municipal", e.target.value)} /></div>
          <div className="erp-field erp-c4"><label className="erp-label erp-req">Regime Tributário</label><select className="erp-input" value={form.regime_tributario} onChange={(e) => setF("regime_tributario", e.target.value)}>{REGIMES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</select></div>
          <div className="erp-field erp-c2"><label className="erp-label">Matriz (CNPJ)</label><input className="erp-input" value={form.matriz_cnpj ?? ""} placeholder="filial → CNPJ matriz" onChange={(e) => setF("matriz_cnpj", e.target.value)} /></div>
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Endereço (SEFAZ) — <span style={{fontWeight:400,opacity:0.65}}>Necessário para emissão de NF-e</span></div><div className="erp-fieldset-body">
          <div className="erp-field erp-c6"><label className="erp-label">Logradouro</label><input className="erp-input" value={form.logradouro ?? ""} onChange={(e) => setF("logradouro", e.target.value)} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Número</label><input className="erp-input" value={form.numero ?? ""} onChange={(e) => setF("numero", e.target.value)} /></div>
          <div className="erp-field erp-c4"><label className="erp-label">Bairro</label><input className="erp-input" value={form.bairro ?? ""} onChange={(e) => setF("bairro", e.target.value)} /></div>
          <div className="erp-field erp-c4"><label className="erp-label">Município</label><input className="erp-input" value={form.municipio ?? ""} onChange={(e) => setF("municipio", e.target.value)} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Cód. IBGE</label><input className="erp-input" value={form.codigo_municipio ?? ""} onChange={(e) => setF("codigo_municipio", e.target.value)} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">UF</label><input className="erp-input" maxLength={2} value={form.uf} onChange={(e) => setF("uf", e.target.value.toUpperCase())} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">CEP</label><input className="erp-input" value={form.cep ?? ""} onChange={(e) => setF("cep", e.target.value)} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Telefone</label><input className="erp-input" value={form.telefone ?? ""} onChange={(e) => setF("telefone", e.target.value)} /></div>
        </div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Regime: <strong>{REGIMES.find((r) => r.v === form.regime_tributario)?.l ?? "—"}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

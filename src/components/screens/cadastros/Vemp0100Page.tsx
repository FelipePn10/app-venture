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
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VEMP0100 — Cadastro de Empresa</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Ações</span>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "..." : "Salvar Empresa"}</button>
          <button className="fsc-btn fsc-btn-ghost" onClick={() => { setForm(EMPTY); setFeedback(null); }} disabled={busy}>Limpar</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VEMP0100 — Cadastro de Empresa" filename="vemp0100" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Identificação</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">CNPJ</label><input className="fsc-input" value={form.cnpj} onChange={(e) => setF("cnpj", e.target.value)} />
            {form.cnpj.trim() && <span className="fsc-field-hint" style={{ color: validateCNPJOrCPF(form.cnpj) ? "#1e6030" : "#b91c1c" }}>{validateCNPJOrCPF(form.cnpj) ? "✓ válido" : "✗ inválido"}</span>}</div>
          <div className="fsc-field fsc-col-6"><label className="fsc-label fsc-label-req">Razão Social</label><input className="fsc-input" value={form.razao_social} onChange={(e) => setF("razao_social", e.target.value)} /></div>
          <div className="fsc-field fsc-col-3"><label className="fsc-label">Nome Fantasia</label><input className="fsc-input" value={form.nome_fantasia ?? ""} onChange={(e) => setF("nome_fantasia", e.target.value)} /></div>
          <div className="fsc-field fsc-col-3"><label className="fsc-label">Inscrição Estadual</label><input className="fsc-input" value={form.inscricao_estadual ?? ""} onChange={(e) => setF("inscricao_estadual", e.target.value)} /></div>
          <div className="fsc-field fsc-col-3"><label className="fsc-label">Inscrição Municipal</label><input className="fsc-input" value={form.inscricao_municipal ?? ""} onChange={(e) => setF("inscricao_municipal", e.target.value)} /></div>
          <div className="fsc-field fsc-col-4"><label className="fsc-label fsc-label-req">Regime Tributário</label><select className="fsc-select" value={form.regime_tributario} onChange={(e) => setF("regime_tributario", e.target.value)}>{REGIMES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</select></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Matriz (CNPJ)</label><input className="fsc-input" value={form.matriz_cnpj ?? ""} placeholder="filial → CNPJ matriz" onChange={(e) => setF("matriz_cnpj", e.target.value)} /></div>
        </div></div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Endereço (SEFAZ)</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">Necessário para emissão de NF-e</span></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-6"><label className="fsc-label">Logradouro</label><input className="fsc-input" value={form.logradouro ?? ""} onChange={(e) => setF("logradouro", e.target.value)} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Número</label><input className="fsc-input" value={form.numero ?? ""} onChange={(e) => setF("numero", e.target.value)} /></div>
          <div className="fsc-field fsc-col-4"><label className="fsc-label">Bairro</label><input className="fsc-input" value={form.bairro ?? ""} onChange={(e) => setF("bairro", e.target.value)} /></div>
          <div className="fsc-field fsc-col-4"><label className="fsc-label">Município</label><input className="fsc-input" value={form.municipio ?? ""} onChange={(e) => setF("municipio", e.target.value)} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Cód. IBGE</label><input className="fsc-input" value={form.codigo_municipio ?? ""} onChange={(e) => setF("codigo_municipio", e.target.value)} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">UF</label><input className="fsc-input" maxLength={2} value={form.uf} onChange={(e) => setF("uf", e.target.value.toUpperCase())} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">CEP</label><input className="fsc-input" value={form.cep ?? ""} onChange={(e) => setF("cep", e.target.value)} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Telefone</label><input className="fsc-input" value={form.telefone ?? ""} onChange={(e) => setF("telefone", e.target.value)} /></div>
        </div></div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Regime: <strong>{REGIMES.find((r) => r.v === form.regime_tributario)?.l ?? "—"}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}

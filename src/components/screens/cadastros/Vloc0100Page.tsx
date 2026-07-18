import { useState, useEffect, useCallback } from "react";
import {
  type CountryDTO, type UfDTO,
  listCountries, createCountry, updateCountry,
  listUfs, createUf, updateUf,
} from "@/services/locationService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type Tab = "countries" | "ufs";
const EMPTY_C: CountryDTO = { sigla: "", name: "", ddi: "", bacen_code: "", sis_comex: "" };
const EMPTY_U: UfDTO = { sigla: "", name: "", country_id: undefined, ibge_code: "" };

export function Vloc0100Page(): JSX.Element {
  const [tab, setTab] = useState<Tab>("countries");
  const [countries, setCountries] = useState<CountryDTO[]>([]);
  const [ufs, setUfs] = useState<UfDTO[]>([]);
  const [cForm, setCForm] = useState<CountryDTO>(EMPTY_C);
  const [uForm, setUForm] = useState<UfDTO>(EMPTY_U);
  const [cEdit, setCEdit] = useState(false);
  const [uEdit, setUEdit] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { const [c, u] = await Promise.all([listCountries(), listUfs()]); setCountries(c); setUfs(u); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar localização.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  async function saveCountry() {
    if (!cForm.sigla.trim() || !cForm.name.trim()) { setFeedback({ type: "error", message: "Sigla e nome do país são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try { if (cEdit) await updateCountry(cForm); else await createCountry(cForm); setFeedback({ type: "success", message: `País ${cForm.sigla} salvo.` }); setCForm(EMPTY_C); setCEdit(false); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function saveUf() {
    if (!uForm.sigla.trim() || !uForm.name.trim()) { setFeedback({ type: "error", message: "Sigla e nome da UF são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try { if (uEdit) await updateUf(uForm); else await createUf(uForm); setFeedback({ type: "success", message: `UF ${uForm.sigla} salva.` }); setUForm(EMPTY_U); setUEdit(false); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Cadastros & Plataforma</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Localização (Países e UFs)</span><span className="erp-crumb-code">VLOC0100</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Dados</span>
          <button className="erp-btn" onClick={() => void reload()} disabled={busy}>Recarregar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VLOC0100 — Localização" filename="vloc0100" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Localização</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset">
          <div className="erp-tabs">
            <button className={`erp-tab ${tab === "countries" ? "active" : ""}`} onClick={() => setTab("countries")}>Países</button>
            <button className={`erp-tab ${tab === "ufs" ? "active" : ""}`} onClick={() => setTab("ufs")}>UFs</button>
          </div>

          {tab === "countries" && (
            <div className="erp-fieldset-body">
              
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Sigla</label><input className="erp-input" maxLength={3} value={cForm.sigla} disabled={cEdit} onChange={(e) => setCForm((p) => ({ ...p, sigla: e.target.value.toUpperCase() }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label erp-req">Nome</label><input className="erp-input" value={cForm.name} onChange={(e) => setCForm((p) => ({ ...p, name: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">DDI</label><input className="erp-input" value={cForm.ddi ?? ""} onChange={(e) => setCForm((p) => ({ ...p, ddi: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Cód. BACEN</label><input className="erp-input" value={cForm.bacen_code ?? ""} onChange={(e) => setCForm((p) => ({ ...p, bacen_code: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">SISCOMEX</label><input className="erp-input" value={cForm.sis_comex ?? ""} onChange={(e) => setCForm((p) => ({ ...p, sis_comex: e.target.value }))} /></div>
                <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8 }}>
                  <button className="erp-btn erp-btn-primary" onClick={() => void saveCountry()} disabled={busy}>{cEdit ? "Atualizar" : "Adicionar"}</button>
                  {cEdit && <button className="erp-btn" onClick={() => { setCForm(EMPTY_C); setCEdit(false); }}>Cancelar</button>}</div>
              
              <div className="erp-fieldset-body" style={{ marginTop: 16 }}><table className="erp-grid">
                <thead><tr><th>Sigla</th><th>Nome</th><th>DDI</th><th>BACEN</th><th style={{ width: 70 }}>Ações</th></tr></thead>
                <tbody>
                  {countries.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum país.</td></tr>}
                  {countries.map((c) => <tr key={c.sigla}><td style={{ fontWeight: 600 }}>{c.sigla}</td><td>{c.name}</td><td>{c.ddi}</td><td>{c.bacen_code}</td>
                    <td><button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => { setCForm({ ...EMPTY_C, ...c }); setCEdit(true); }}>Editar</button></td></tr>)}
                </tbody></table></div>
            </div>
          )}

          {tab === "ufs" && (
            <div className="erp-fieldset-body">
              
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Sigla</label><input className="erp-input" maxLength={2} value={uForm.sigla} disabled={uEdit} onChange={(e) => setUForm((p) => ({ ...p, sigla: e.target.value.toUpperCase() }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label erp-req">Nome</label><input className="erp-input" value={uForm.name} onChange={(e) => setUForm((p) => ({ ...p, name: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">País (ID)</label><input className="erp-input num" type="number" value={uForm.country_id ?? ""} onChange={(e) => setUForm((p) => ({ ...p, country_id: e.target.value ? Number(e.target.value) : undefined }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Cód. IBGE</label><input className="erp-input" value={uForm.ibge_code ?? ""} onChange={(e) => setUForm((p) => ({ ...p, ibge_code: e.target.value }))} /></div>
                <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8 }}>
                  <button className="erp-btn erp-btn-primary" onClick={() => void saveUf()} disabled={busy}>{uEdit ? "Atualizar" : "Adicionar"}</button>
                  {uEdit && <button className="erp-btn" onClick={() => { setUForm(EMPTY_U); setUEdit(false); }}>Cancelar</button>}</div>
              
              <div className="erp-fieldset-body" style={{ marginTop: 16 }}><table className="erp-grid">
                <thead><tr><th>Sigla</th><th>Nome</th><th>País</th><th>IBGE</th><th style={{ width: 70 }}>Ações</th></tr></thead>
                <tbody>
                  {ufs.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhuma UF.</td></tr>}
                  {ufs.map((u) => <tr key={u.sigla}><td style={{ fontWeight: 600 }}>{u.sigla}</td><td>{u.name}</td><td>{u.country_id}</td><td>{u.ibge_code}</td>
                    <td><button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => { setUForm({ ...EMPTY_U, ...u }); setUEdit(true); }}>Editar</button></td></tr>)}
                </tbody></table></div>
            </div>
          )}
        </div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Países: <strong>{countries.length}</strong></div><div className="erp-status-item">UFs: <strong>{ufs.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

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
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VLOC0100 — Localização (Países e UFs)</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Dados</span>
          <button className="fsc-btn fsc-btn-ghost" onClick={() => void reload()} disabled={busy}>Recarregar</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VLOC0100 — Localização" filename="vloc0100" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-card">
          <div className="fsc-tabs">
            <button className={`fsc-tab ${tab === "countries" ? "active" : ""}`} onClick={() => setTab("countries")}>Países</button>
            <button className={`fsc-tab ${tab === "ufs" ? "active" : ""}`} onClick={() => setTab("ufs")}>UFs</button>
          </div>

          {tab === "countries" && (
            <div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Sigla</label><input className="fsc-input" maxLength={3} value={cForm.sigla} disabled={cEdit} onChange={(e) => setCForm((p) => ({ ...p, sigla: e.target.value.toUpperCase() }))} /></div>
                <div className="fsc-field fsc-col-4"><label className="fsc-label fsc-label-req">Nome</label><input className="fsc-input" value={cForm.name} onChange={(e) => setCForm((p) => ({ ...p, name: e.target.value }))} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">DDI</label><input className="fsc-input" value={cForm.ddi ?? ""} onChange={(e) => setCForm((p) => ({ ...p, ddi: e.target.value }))} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Cód. BACEN</label><input className="fsc-input" value={cForm.bacen_code ?? ""} onChange={(e) => setCForm((p) => ({ ...p, bacen_code: e.target.value }))} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">SISCOMEX</label><input className="fsc-input" value={cForm.sis_comex ?? ""} onChange={(e) => setCForm((p) => ({ ...p, sis_comex: e.target.value }))} /></div>
                <div className="fsc-field fsc-col-12" style={{ flexDirection: "row", gap: 8 }}>
                  <button className="fsc-btn fsc-btn-primary" onClick={() => void saveCountry()} disabled={busy}>{cEdit ? "Atualizar" : "Adicionar"}</button>
                  {cEdit && <button className="fsc-btn fsc-btn-ghost" onClick={() => { setCForm(EMPTY_C); setCEdit(false); }}>Cancelar</button>}</div>
              </div>
              <div className="fsc-results-wrap" style={{ marginTop: 16 }}><table className="fsc-table">
                <thead><tr><th>Sigla</th><th>Nome</th><th>DDI</th><th>BACEN</th><th style={{ width: 70 }}>Ações</th></tr></thead>
                <tbody>
                  {countries.length === 0 && <tr><td colSpan={5} className="fsc-empty">Nenhum país.</td></tr>}
                  {countries.map((c) => <tr key={c.sigla}><td style={{ fontWeight: 600 }}>{c.sigla}</td><td>{c.name}</td><td>{c.ddi}</td><td>{c.bacen_code}</td>
                    <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => { setCForm({ ...EMPTY_C, ...c }); setCEdit(true); }}>Editar</button></td></tr>)}
                </tbody></table></div>
            </div>
          )}

          {tab === "ufs" && (
            <div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Sigla</label><input className="fsc-input" maxLength={2} value={uForm.sigla} disabled={uEdit} onChange={(e) => setUForm((p) => ({ ...p, sigla: e.target.value.toUpperCase() }))} /></div>
                <div className="fsc-field fsc-col-4"><label className="fsc-label fsc-label-req">Nome</label><input className="fsc-input" value={uForm.name} onChange={(e) => setUForm((p) => ({ ...p, name: e.target.value }))} /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">País (ID)</label><input className="fsc-input fsc-input-right" type="number" value={uForm.country_id ?? ""} onChange={(e) => setUForm((p) => ({ ...p, country_id: e.target.value ? Number(e.target.value) : undefined }))} /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Cód. IBGE</label><input className="fsc-input" value={uForm.ibge_code ?? ""} onChange={(e) => setUForm((p) => ({ ...p, ibge_code: e.target.value }))} /></div>
                <div className="fsc-field fsc-col-12" style={{ flexDirection: "row", gap: 8 }}>
                  <button className="fsc-btn fsc-btn-primary" onClick={() => void saveUf()} disabled={busy}>{uEdit ? "Atualizar" : "Adicionar"}</button>
                  {uEdit && <button className="fsc-btn fsc-btn-ghost" onClick={() => { setUForm(EMPTY_U); setUEdit(false); }}>Cancelar</button>}</div>
              </div>
              <div className="fsc-results-wrap" style={{ marginTop: 16 }}><table className="fsc-table">
                <thead><tr><th>Sigla</th><th>Nome</th><th className="fsc-num">País</th><th>IBGE</th><th style={{ width: 70 }}>Ações</th></tr></thead>
                <tbody>
                  {ufs.length === 0 && <tr><td colSpan={5} className="fsc-empty">Nenhuma UF.</td></tr>}
                  {ufs.map((u) => <tr key={u.sigla}><td style={{ fontWeight: 600 }}>{u.sigla}</td><td>{u.name}</td><td className="fsc-num">{u.country_id}</td><td>{u.ibge_code}</td>
                    <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => { setUForm({ ...EMPTY_U, ...u }); setUEdit(true); }}>Editar</button></td></tr>)}
                </tbody></table></div>
            </div>
          )}
        </div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Países: <strong>{countries.length}</strong></div><div className="fsc-footer-stat">UFs: <strong>{ufs.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}

import { useState, useCallback, useEffect } from "react";
import {
  type NcmTaxTable,
  type IcmsInterno,
  type IcmsInterestadual,
  listNcmTaxes, upsertNcmTax, deleteNcmTax,
  listIcmsInterno, upsertIcmsInterno,
  listIcmsInterestadual, upsertIcmsInterestadual,
} from "@/services/taxTableService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Tab = "ncm" | "interno" | "interestadual";

const EMPTY_NCM: NcmTaxTable = {
  ncm: "", aliq_ipi: 0, aliq_pis: 0.0165, aliq_cofins: 0.076,
  cst_pis: "01", cst_cofins: "01", cst_ipi: "50", description: "",
};
const EMPTY_INTERNO: IcmsInterno = { uf: "", aliq_icms: 0, aliq_fcp: 0 };
const EMPTY_INTER: IcmsInterestadual = { origin_uf: "", destination_uf: "", aliq_icms: 0 };

export function Vfis0110Page(): JSX.Element {
  const [tab, setTab] = useState<Tab>("ncm");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const [ncms, setNcms] = useState<NcmTaxTable[]>([]);
  const [internos, setInternos] = useState<IcmsInterno[]>([]);
  const [inters, setInters] = useState<IcmsInterestadual[]>([]);

  const [ncmForm, setNcmForm] = useState<NcmTaxTable>(EMPTY_NCM);
  const [internoForm, setInternoForm] = useState<IcmsInterno>(EMPTY_INTERNO);
  const [interForm, setInterForm] = useState<IcmsInterestadual>(EMPTY_INTER);

  const reload = useCallback(async () => {
    setBusy(true);
    try {
      const [a, b, c] = await Promise.all([listNcmTaxes(), listIcmsInterno(), listIcmsInterestadual()]);
      setNcms(a); setInternos(b); setInters(c);
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar as tabelas tributárias.") });
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  async function saveNcm() {
    if (!ncmForm.ncm.trim()) { setFeedback({ type: "error", message: "NCM é obrigatório." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await upsertNcmTax(ncmForm);
      setFeedback({ type: "success", message: `NCM ${ncmForm.ncm} salvo.` });
      setNcmForm(EMPTY_NCM);
      await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function removeNcm(ncm: string) {
    setBusy(true); setFeedback(null);
    try {
      await deleteNcmTax(ncm);
      setFeedback({ type: "success", message: `NCM ${ncm} desativado.` });
      await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function saveInterno() {
    if (!internoForm.uf.trim()) { setFeedback({ type: "error", message: "UF é obrigatória." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await upsertIcmsInterno(internoForm);
      setFeedback({ type: "success", message: `ICMS interno de ${internoForm.uf} salvo.` });
      setInternoForm(EMPTY_INTERNO);
      await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function saveInter() {
    if (!interForm.origin_uf.trim() || !interForm.destination_uf.trim()) {
      setFeedback({ type: "error", message: "UF origem e destino são obrigatórias." }); return;
    }
    setBusy(true); setFeedback(null);
    try {
      await upsertIcmsInterestadual(interForm);
      setFeedback({ type: "success", message: `ICMS ${interForm.origin_uf}→${interForm.destination_uf} salvo.` });
      setInterForm(EMPTY_INTER);
      await reload();
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
          <span className="fsc-screen-title">VFIS0110 — Tabelas Tributárias</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Dados</span>
          <button className="fsc-btn fsc-btn-ghost" onClick={() => void reload()} disabled={busy}>
            {busy ? <><div className="fsc-spinner-dark" />Carregando...</> : "Recarregar"}
          </button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VFIS0110 — Tabelas Tributárias" filename="vfis0110" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="fsc-card">
          <div className="fsc-tabs">
            <button className={`fsc-tab ${tab === "ncm" ? "active" : ""}`} onClick={() => setTab("ncm")}>NCM (IPI/PIS/COFINS)</button>
            <button className={`fsc-tab ${tab === "interno" ? "active" : ""}`} onClick={() => setTab("interno")}>ICMS Interno</button>
            <button className={`fsc-tab ${tab === "interestadual" ? "active" : ""}`} onClick={() => setTab("interestadual")}>ICMS Interestadual</button>
          </div>

          {tab === "ncm" && (
            <div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-2">
                  <label className="fsc-label fsc-label-req">NCM</label>
                  <input className="fsc-input" value={ncmForm.ncm} placeholder="84714900"
                    onChange={(e) => setNcmForm((p) => ({ ...p, ncm: e.target.value }))} />
                </div>
                <div className="fsc-field fsc-col-2">
                  <label className="fsc-label">Alíq. IPI</label>
                  <input className="fsc-input fsc-input-right" type="number" step="0.0001" value={ncmForm.aliq_ipi}
                    onChange={(e) => setNcmForm((p) => ({ ...p, aliq_ipi: Number(e.target.value) }))} />
                </div>
                <div className="fsc-field fsc-col-2">
                  <label className="fsc-label">Alíq. PIS</label>
                  <input className="fsc-input fsc-input-right" type="number" step="0.0001" value={ncmForm.aliq_pis}
                    onChange={(e) => setNcmForm((p) => ({ ...p, aliq_pis: Number(e.target.value) }))} />
                </div>
                <div className="fsc-field fsc-col-2">
                  <label className="fsc-label">Alíq. COFINS</label>
                  <input className="fsc-input fsc-input-right" type="number" step="0.0001" value={ncmForm.aliq_cofins}
                    onChange={(e) => setNcmForm((p) => ({ ...p, aliq_cofins: Number(e.target.value) }))} />
                </div>
                <div className="fsc-field fsc-col-1">
                  <label className="fsc-label">CST IPI</label>
                  <input className="fsc-input" value={ncmForm.cst_ipi}
                    onChange={(e) => setNcmForm((p) => ({ ...p, cst_ipi: e.target.value }))} />
                </div>
                <div className="fsc-field fsc-col-1">
                  <label className="fsc-label">CST PIS</label>
                  <input className="fsc-input" value={ncmForm.cst_pis}
                    onChange={(e) => setNcmForm((p) => ({ ...p, cst_pis: e.target.value }))} />
                </div>
                <div className="fsc-field fsc-col-2">
                  <label className="fsc-label">CST COFINS</label>
                  <input className="fsc-input" value={ncmForm.cst_cofins}
                    onChange={(e) => setNcmForm((p) => ({ ...p, cst_cofins: e.target.value }))} />
                </div>
                <div className="fsc-field fsc-col-10">
                  <label className="fsc-label">Descrição</label>
                  <input className="fsc-input" value={ncmForm.description ?? ""}
                    onChange={(e) => setNcmForm((p) => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}>
                  <button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void saveNcm()} disabled={busy}>Salvar NCM</button>
                </div>
              </div>

              <div className="fsc-results-wrap" style={{ marginTop: 16 }}>
                <table className="fsc-table">
                  <thead>
                    <tr><th>NCM</th><th className="fsc-num">IPI</th><th className="fsc-num">PIS</th><th className="fsc-num">COFINS</th>
                      <th>CST IPI/PIS/COF</th><th>Descrição</th><th style={{ width: 90 }}>Ações</th></tr>
                  </thead>
                  <tbody>
                    {ncms.length === 0 && <tr><td colSpan={7} className="fsc-empty">Nenhum NCM cadastrado.</td></tr>}
                    {ncms.map((n) => (
                      <tr key={n.ncm}>
                        <td style={{ fontWeight: 600 }}>{n.ncm}</td>
                        <td className="fsc-num">{n.aliq_ipi}</td>
                        <td className="fsc-num">{n.aliq_pis}</td>
                        <td className="fsc-num">{n.aliq_cofins}</td>
                        <td>{n.cst_ipi}/{n.cst_pis}/{n.cst_cofins}</td>
                        <td>{n.description || "—"}</td>
                        <td><button className="fsc-action-btn fsc-delete-btn" onClick={() => void removeNcm(n.ncm)}>Desativar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "interno" && (
            <div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-2">
                  <label className="fsc-label fsc-label-req">UF</label>
                  <input className="fsc-input" maxLength={2} value={internoForm.uf}
                    onChange={(e) => setInternoForm((p) => ({ ...p, uf: e.target.value.toUpperCase() }))} />
                </div>
                <div className="fsc-field fsc-col-3">
                  <label className="fsc-label">Alíq. ICMS</label>
                  <input className="fsc-input fsc-input-right" type="number" step="0.0001" value={internoForm.aliq_icms}
                    onChange={(e) => setInternoForm((p) => ({ ...p, aliq_icms: Number(e.target.value) }))} />
                </div>
                <div className="fsc-field fsc-col-3">
                  <label className="fsc-label">Alíq. FCP</label>
                  <input className="fsc-input fsc-input-right" type="number" step="0.0001" value={internoForm.aliq_fcp}
                    onChange={(e) => setInternoForm((p) => ({ ...p, aliq_fcp: Number(e.target.value) }))} />
                </div>
                <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}>
                  <button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void saveInterno()} disabled={busy}>Salvar UF</button>
                </div>
              </div>
              <div className="fsc-results-wrap" style={{ marginTop: 16 }}>
                <table className="fsc-table">
                  <thead><tr><th>UF</th><th className="fsc-num">ICMS</th><th className="fsc-num">FCP</th></tr></thead>
                  <tbody>
                    {internos.length === 0 && <tr><td colSpan={3} className="fsc-empty">Nenhuma UF cadastrada.</td></tr>}
                    {internos.map((i) => (
                      <tr key={i.uf}><td style={{ fontWeight: 600 }}>{i.uf}</td><td className="fsc-num">{i.aliq_icms}</td><td className="fsc-num">{i.aliq_fcp}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "interestadual" && (
            <div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-2">
                  <label className="fsc-label fsc-label-req">UF Origem</label>
                  <input className="fsc-input" maxLength={2} value={interForm.origin_uf}
                    onChange={(e) => setInterForm((p) => ({ ...p, origin_uf: e.target.value.toUpperCase() }))} />
                </div>
                <div className="fsc-field fsc-col-2">
                  <label className="fsc-label fsc-label-req">UF Destino</label>
                  <input className="fsc-input" maxLength={2} value={interForm.destination_uf}
                    onChange={(e) => setInterForm((p) => ({ ...p, destination_uf: e.target.value.toUpperCase() }))} />
                </div>
                <div className="fsc-field fsc-col-3">
                  <label className="fsc-label">Alíq. ICMS</label>
                  <input className="fsc-input fsc-input-right" type="number" step="0.0001" value={interForm.aliq_icms}
                    onChange={(e) => setInterForm((p) => ({ ...p, aliq_icms: Number(e.target.value) }))} />
                </div>
                <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}>
                  <button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void saveInter()} disabled={busy}>Salvar</button>
                </div>
              </div>
              <div className="fsc-results-wrap" style={{ marginTop: 16 }}>
                <table className="fsc-table">
                  <thead><tr><th>Origem</th><th>Destino</th><th className="fsc-num">Alíq. ICMS</th></tr></thead>
                  <tbody>
                    {inters.length === 0 && <tr><td colSpan={3} className="fsc-empty">Nenhuma alíquota cadastrada.</td></tr>}
                    {inters.map((i) => (
                      <tr key={`${i.origin_uf}_${i.destination_uf}`}>
                        <td style={{ fontWeight: 600 }}>{i.origin_uf}</td><td>{i.destination_uf}</td><td className="fsc-num">{i.aliq_icms}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left">
          <div className="fsc-footer-stat">NCMs: <strong>{ncms.length}</strong></div>
          <div className="fsc-footer-stat">UFs internas: <strong>{internos.length}</strong></div>
          <div className="fsc-footer-stat">Interestaduais: <strong>{inters.length}</strong></div>
        </div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}

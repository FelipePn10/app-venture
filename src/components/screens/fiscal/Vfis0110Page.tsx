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
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Tabelas Tributárias</span><span className="erp-crumb-code">VFIS0110</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Dados</span>
          <button className="erp-btn" onClick={() => void reload()} disabled={busy}>
            {busy ? <><div className="erp-spin" />Carregando...</> : "Recarregar"}
          </button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0110 — Tabelas Tributárias" filename="vfis0110" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Tabelas Tributárias</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="erp-fieldset">
          <div className="erp-tabs">
            <button className={`erp-tab ${tab === "ncm" ? "active" : ""}`} onClick={() => setTab("ncm")}>NCM (IPI/PIS/COFINS)</button>
            <button className={`erp-tab ${tab === "interno" ? "active" : ""}`} onClick={() => setTab("interno")}>ICMS Interno</button>
            <button className={`erp-tab ${tab === "interestadual" ? "active" : ""}`} onClick={() => setTab("interestadual")}>ICMS Interestadual</button>
          </div>

          {tab === "ncm" && (
            <div className="erp-fieldset-body">
              
                <div className="erp-field erp-c2">
                  <label className="erp-label erp-req">NCM</label>
                  <input className="erp-input" value={ncmForm.ncm} placeholder="84714900"
                    onChange={(e) => setNcmForm((p) => ({ ...p, ncm: e.target.value }))} />
                </div>
                <div className="erp-field erp-c2">
                  <label className="erp-label">Alíq. IPI</label>
                  <input className="erp-input num" type="number" step="0.0001" value={ncmForm.aliq_ipi}
                    onChange={(e) => setNcmForm((p) => ({ ...p, aliq_ipi: Number(e.target.value) }))} />
                </div>
                <div className="erp-field erp-c2">
                  <label className="erp-label">Alíq. PIS</label>
                  <input className="erp-input num" type="number" step="0.0001" value={ncmForm.aliq_pis}
                    onChange={(e) => setNcmForm((p) => ({ ...p, aliq_pis: Number(e.target.value) }))} />
                </div>
                <div className="erp-field erp-c2">
                  <label className="erp-label">Alíq. COFINS</label>
                  <input className="erp-input num" type="number" step="0.0001" value={ncmForm.aliq_cofins}
                    onChange={(e) => setNcmForm((p) => ({ ...p, aliq_cofins: Number(e.target.value) }))} />
                </div>
                <div className="erp-field erp-c1">
                  <label className="erp-label">CST IPI</label>
                  <input className="erp-input" value={ncmForm.cst_ipi}
                    onChange={(e) => setNcmForm((p) => ({ ...p, cst_ipi: e.target.value }))} />
                </div>
                <div className="erp-field erp-c1">
                  <label className="erp-label">CST PIS</label>
                  <input className="erp-input" value={ncmForm.cst_pis}
                    onChange={(e) => setNcmForm((p) => ({ ...p, cst_pis: e.target.value }))} />
                </div>
                <div className="erp-field erp-c2">
                  <label className="erp-label">CST COFINS</label>
                  <input className="erp-input" value={ncmForm.cst_cofins}
                    onChange={(e) => setNcmForm((p) => ({ ...p, cst_cofins: e.target.value }))} />
                </div>
                <div className="erp-field erp-c10">
                  <label className="erp-label">Descrição</label>
                  <input className="erp-input" value={ncmForm.description ?? ""}
                    onChange={(e) => setNcmForm((p) => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
                  <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void saveNcm()} disabled={busy}>Salvar NCM</button>
                </div>
              

              <div className="erp-fieldset-body" style={{ marginTop: 16 }}>
                <table className="erp-grid">
                  <thead>
                    <tr><th>NCM</th><th>IPI</th><th>PIS</th><th>COFINS</th>
                      <th>CST IPI/PIS/COF</th><th>Descrição</th><th style={{ width: 90 }}>Ações</th></tr>
                  </thead>
                  <tbody>
                    {ncms.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhum NCM cadastrado.</td></tr>}
                    {ncms.map((n) => (
                      <tr key={n.ncm}>
                        <td style={{ fontWeight: 600 }}>{n.ncm}</td>
                        <td>{n.aliq_ipi}</td>
                        <td>{n.aliq_pis}</td>
                        <td>{n.aliq_cofins}</td>
                        <td>{n.cst_ipi}/{n.cst_pis}/{n.cst_cofins}</td>
                        <td>{n.description || "—"}</td>
                        <td><button className="erp-btn erp-btn-sm erp-btn erp-btn-danger erp-btn-sm" onClick={() => void removeNcm(n.ncm)}>Desativar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "interno" && (
            <div className="erp-fieldset-body">
              
                <div className="erp-field erp-c2">
                  <label className="erp-label erp-req">UF</label>
                  <input className="erp-input" maxLength={2} value={internoForm.uf}
                    onChange={(e) => setInternoForm((p) => ({ ...p, uf: e.target.value.toUpperCase() }))} />
                </div>
                <div className="erp-field erp-c3">
                  <label className="erp-label">Alíq. ICMS</label>
                  <input className="erp-input num" type="number" step="0.0001" value={internoForm.aliq_icms}
                    onChange={(e) => setInternoForm((p) => ({ ...p, aliq_icms: Number(e.target.value) }))} />
                </div>
                <div className="erp-field erp-c3">
                  <label className="erp-label">Alíq. FCP</label>
                  <input className="erp-input num" type="number" step="0.0001" value={internoForm.aliq_fcp}
                    onChange={(e) => setInternoForm((p) => ({ ...p, aliq_fcp: Number(e.target.value) }))} />
                </div>
                <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
                  <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void saveInterno()} disabled={busy}>Salvar UF</button>
                </div>
              
              <div className="erp-fieldset-body" style={{ marginTop: 16 }}>
                <table className="erp-grid">
                  <thead><tr><th>UF</th><th>ICMS</th><th>FCP</th></tr></thead>
                  <tbody>
                    {internos.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhuma UF cadastrada.</td></tr>}
                    {internos.map((i) => (
                      <tr key={i.uf}><td style={{ fontWeight: 600 }}>{i.uf}</td><td>{i.aliq_icms}</td><td>{i.aliq_fcp}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "interestadual" && (
            <div className="erp-fieldset-body">
              
                <div className="erp-field erp-c2">
                  <label className="erp-label erp-req">UF Origem</label>
                  <input className="erp-input" maxLength={2} value={interForm.origin_uf}
                    onChange={(e) => setInterForm((p) => ({ ...p, origin_uf: e.target.value.toUpperCase() }))} />
                </div>
                <div className="erp-field erp-c2">
                  <label className="erp-label erp-req">UF Destino</label>
                  <input className="erp-input" maxLength={2} value={interForm.destination_uf}
                    onChange={(e) => setInterForm((p) => ({ ...p, destination_uf: e.target.value.toUpperCase() }))} />
                </div>
                <div className="erp-field erp-c3">
                  <label className="erp-label">Alíq. ICMS</label>
                  <input className="erp-input num" type="number" step="0.0001" value={interForm.aliq_icms}
                    onChange={(e) => setInterForm((p) => ({ ...p, aliq_icms: Number(e.target.value) }))} />
                </div>
                <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
                  <button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void saveInter()} disabled={busy}>Salvar</button>
                </div>
              
              <div className="erp-fieldset-body" style={{ marginTop: 16 }}>
                <table className="erp-grid">
                  <thead><tr><th>Origem</th><th>Destino</th><th>Alíq. ICMS</th></tr></thead>
                  <tbody>
                    {inters.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhuma alíquota cadastrada.</td></tr>}
                    {inters.map((i) => (
                      <tr key={`${i.origin_uf}_${i.destination_uf}`}>
                        <td style={{ fontWeight: 600 }}>{i.origin_uf}</td><td>{i.destination_uf}</td><td>{i.aliq_icms}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}>
          <div className="erp-status-item">NCMs: <strong>{ncms.length}</strong></div>
          <div className="erp-status-item">UFs internas: <strong>{internos.length}</strong></div>
          <div className="erp-status-item">Interestaduais: <strong>{inters.length}</strong></div>
        </div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

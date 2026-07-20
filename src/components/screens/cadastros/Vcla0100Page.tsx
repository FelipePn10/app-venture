import { useState, useEffect, useCallback } from "react";
import {
  type ClassificationMaskDTO, type ClassificationDTO,
  listMasks, createMask, updateMask, listMaskClassifications, createClassification,
} from "@/services/itemClassificationService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const EMPTY_M: ClassificationMaskDTO = { description: "", mask: "" };
const EMPTY_C: ClassificationDTO = { code: "", mask_code: 0, description: "", parent_code: "" };

export function Vcla0100Page(): JSX.Element {
  const [masks, setMasks] = useState<ClassificationMaskDTO[]>([]);
  const [selMask, setSelMask] = useState<number | null>(null);
  const [classifs, setClassifs] = useState<ClassificationDTO[]>([]);
  const [mForm, setMForm] = useState<ClassificationMaskDTO>(EMPTY_M);
  const [mEdit, setMEdit] = useState(false);
  const [cForm, setCForm] = useState<ClassificationDTO>(EMPTY_C);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const reloadMasks = useCallback(async () => {
    setBusy(true);
    try { setMasks(await listMasks()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar máscaras.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reloadMasks(); }, [reloadMasks]);

  const loadClassifs = useCallback(async (maskCode: number) => {
    setSelMask(maskCode); setCForm({ ...EMPTY_C, mask_code: maskCode });
    setBusy(true);
    try { setClassifs(await listMaskClassifications(maskCode)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); }
  }, []);

  async function saveMask() {
    if (!mForm.description.trim()) { setFeedback({ type: "error", message: "Descrição da máscara é obrigatória." }); return; }
    setBusy(true); setFeedback(null);
    try { if (mEdit) await updateMask(mForm); else await createMask(mForm); setFeedback({ type: "success", message: "Máscara salva." }); setMForm(EMPTY_M); setMEdit(false); await reloadMasks(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function saveClassif() {
    if (!cForm.code.trim() || !cForm.description.trim()) { setFeedback({ type: "error", message: "Código e descrição da classificação são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try { await createClassification(cForm); setFeedback({ type: "success", message: `Classificação ${cForm.code} salva.` }); setCForm({ ...EMPTY_C, mask_code: selMask ?? 0 }); if (selMask) await loadClassifs(selMask); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Cadastros & Plataforma</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Classificação de Itens</span><span className="erp-crumb-code">VCLA0100</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Dados</span>
          <button className="erp-btn" onClick={() => void reloadMasks()} disabled={busy}>Recarregar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VCLA0100 — Classificação de Itens" filename="vcla0100" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Classificação de Itens</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="erp-fieldset"><div className="erp-fieldset-head">Máscaras de Classificação</div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c6"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={mForm.description} onChange={(e) => setMForm((p) => ({ ...p, description: e.target.value }))} /></div>
            <div className="erp-field erp-c4"><label className="erp-label">Máscara (formato)</label><input className="erp-input" value={mForm.mask ?? ""} placeholder="Ex.: 99.99.99" onChange={(e) => setMForm((p) => ({ ...p, mask: e.target.value }))} /></div>
            <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void saveMask()} disabled={busy}>{mEdit ? "Atualizar" : "Adicionar"}</button></div>
          
          <div className="erp-fieldset-body" style={{ marginTop: 16 }}><table className="erp-grid">
            <thead><tr><th>Código</th><th>Descrição</th><th>Máscara</th><th style={{ width: 150 }}>Ações</th></tr></thead>
            <tbody>
              {masks.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhuma máscara.</td></tr>}
              {masks.map((m) => <tr key={m.code} style={{ background: selMask === m.code ? "#f4fbf2" : undefined }}>
                <td style={{ fontWeight: 600 }}>{m.code}</td><td>{m.description}</td><td>{m.mask || "—"}</td>
                <td><button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => { setMForm({ ...EMPTY_M, ...m }); setMEdit(true); }}>Editar</button>
                  <button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => m.code && void loadClassifs(m.code)}>Abrir</button></td></tr>)}
            </tbody></table></div>
        </div></div>

        {selMask !== null && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Classificações da máscara {selMask}</div><div className="erp-fieldset-body">
              
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label><input className="erp-input" value={cForm.code} placeholder="01.01" onChange={(e) => setCForm((p) => ({ ...p, code: e.target.value }))} /></div>
                <div className="erp-field erp-c6"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={cForm.description} onChange={(e) => setCForm((p) => ({ ...p, description: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Pai (código)</label><input className="erp-input" value={cForm.parent_code ?? ""} onChange={(e) => setCForm((p) => ({ ...p, parent_code: e.target.value }))} /></div>
                <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void saveClassif()} disabled={busy}>Adicionar</button></div>
              
              <div className="erp-fieldset-body" style={{ marginTop: 16 }}><table className="erp-grid">
                <thead><tr><th>Código</th><th>Descrição</th><th>Pai</th><th>Nível</th></tr></thead>
                <tbody>
                  {classifs.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhuma classificação nesta máscara.</td></tr>}
                  {classifs.map((c) => <tr key={c.code}><td style={{ fontWeight: 600 }}>{c.code}</td><td>{c.description}</td><td>{c.parent_code || "—"}</td><td>{c.level ?? "—"}</td></tr>)}
                </tbody></table></div>
            </div></div>
          </>
        )}
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Máscaras: <strong>{masks.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

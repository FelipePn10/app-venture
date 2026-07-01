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
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VCLA0100 — Classificação de Itens</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Dados</span>
          <button className="fsc-btn fsc-btn-ghost" onClick={() => void reloadMasks()} disabled={busy}>Recarregar</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VCLA0100 — Classificação de Itens" filename="vcla0100" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Máscaras de Classificação</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-6"><label className="fsc-label fsc-label-req">Descrição</label><input className="fsc-input" value={mForm.description} onChange={(e) => setMForm((p) => ({ ...p, description: e.target.value }))} /></div>
            <div className="fsc-field fsc-col-4"><label className="fsc-label">Máscara (formato)</label><input className="fsc-input" value={mForm.mask ?? ""} placeholder="Ex.: 99.99.99" onChange={(e) => setMForm((p) => ({ ...p, mask: e.target.value }))} /></div>
            <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void saveMask()} disabled={busy}>{mEdit ? "Atualizar" : "Adicionar"}</button></div>
          </div>
          <div className="fsc-results-wrap" style={{ marginTop: 16 }}><table className="fsc-table">
            <thead><tr><th className="fsc-num">Código</th><th>Descrição</th><th>Máscara</th><th style={{ width: 150 }}>Ações</th></tr></thead>
            <tbody>
              {masks.length === 0 && <tr><td colSpan={4} className="fsc-empty">Nenhuma máscara.</td></tr>}
              {masks.map((m) => <tr key={m.code} style={{ background: selMask === m.code ? "#f4fbf2" : undefined }}>
                <td className="fsc-num" style={{ fontWeight: 600 }}>{m.code}</td><td>{m.description}</td><td>{m.mask || "—"}</td>
                <td><button className="fsc-action-btn fsc-edit-btn" onClick={() => { setMForm({ ...EMPTY_M, ...m }); setMEdit(true); }}>Editar</button>
                  <button className="fsc-action-btn fsc-edit-btn" onClick={() => m.code && void loadClassifs(m.code)}>Abrir</button></td></tr>)}
            </tbody></table></div>
        </div></div>

        {selMask !== null && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Classificações da máscara {selMask}</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-card-body">
              <div className="fsc-grid">
                <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Código</label><input className="fsc-input" value={cForm.code} placeholder="01.01" onChange={(e) => setCForm((p) => ({ ...p, code: e.target.value }))} /></div>
                <div className="fsc-field fsc-col-6"><label className="fsc-label fsc-label-req">Descrição</label><input className="fsc-input" value={cForm.description} onChange={(e) => setCForm((p) => ({ ...p, description: e.target.value }))} /></div>
                <div className="fsc-field fsc-col-2"><label className="fsc-label">Pai (código)</label><input className="fsc-input" value={cForm.parent_code ?? ""} onChange={(e) => setCForm((p) => ({ ...p, parent_code: e.target.value }))} /></div>
                <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void saveClassif()} disabled={busy}>Adicionar</button></div>
              </div>
              <div className="fsc-results-wrap" style={{ marginTop: 16 }}><table className="fsc-table">
                <thead><tr><th>Código</th><th>Descrição</th><th>Pai</th><th className="fsc-num">Nível</th></tr></thead>
                <tbody>
                  {classifs.length === 0 && <tr><td colSpan={4} className="fsc-empty">Nenhuma classificação nesta máscara.</td></tr>}
                  {classifs.map((c) => <tr key={c.code}><td style={{ fontWeight: 600 }}>{c.code}</td><td>{c.description}</td><td>{c.parent_code || "—"}</td><td className="fsc-num">{c.level ?? "—"}</td></tr>)}
                </tbody></table></div>
            </div></div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Máscaras: <strong>{masks.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}

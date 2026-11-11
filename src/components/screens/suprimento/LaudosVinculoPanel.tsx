import { useCallback, useEffect, useState } from "react";
import { type ItemSupplierQualityReport, type QualityReportStatus, createItemSupplierQualityReport, downloadItemSupplierQualityReport, listItemSupplierQualityReports } from "@/services/purchasingMasterService";
import { errMessage } from "@/services/fiscalShared";
import { hojeLocal } from "@/utils/dataLocal";

/*
 * Laudos de qualidade do vínculo item × fornecedor (VSUP0130): o certificado ou
 * relatório que o fornecedor manda. O lote de inspeção (VINS0300) lista e
 * vincula estes laudos. Era a rotina genérica VSUP0670.
 */

const SITUACOES: { value: QualityReportStatus; label: string }[] = [
  { value: "PENDENTE", label: "Pendente" }, { value: "APROVADO", label: "Aprovado" }, { value: "REJEITADO", label: "Rejeitado" }, { value: "EXPIRADO", label: "Expirado" },
];
const TIPOS = "application/pdf,image/png,image/jpeg";
const MAX_BYTES = 10 * 1024 * 1024;
const base64 = (f: File) => new Promise<string>((ok, falha) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).split(",")[1] ?? "");
  r.onerror = () => falha(r.error);
  r.readAsDataURL(f);
});

export function LaudosVinculoPanel({ vinculoId }: { vinculoId: number }): JSX.Element {
  const [laudos, setLaudos] = useState<ItemSupplierQualityReport[]>([]);
  const [form, setForm] = useState<{ data: string; situacao: QualityReportStatus; obs: string; arquivo?: File }>({ data: hojeLocal(), situacao: "PENDENTE", obs: "" });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const carregar = useCallback(async () => { setLaudos(await listItemSupplierQualityReports(vinculoId)); }, [vinculoId]);
  useEffect(() => { void carregar().catch((e) => setFeedback({ type: "error", message: errMessage(e) })); }, [carregar]);

  const anexar = async () => {
    const f = form.arquivo;
    if (f && !TIPOS.split(",").includes(f.type)) { setFeedback({ type: "error", message: "O laudo tem de ser PDF, PNG ou JPEG." }); return; }
    if (f && f.size > MAX_BYTES) { setFeedback({ type: "error", message: "O arquivo passa de 10 MB." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await createItemSupplierQualityReport(vinculoId, {
        registered_on: form.data, status: form.situacao, notes: form.obs.trim() || undefined,
        ...(f ? { file_name: f.name, content_type: f.type, content: await base64(f) } : {}),
      });
      setForm({ data: hojeLocal(), situacao: "PENDENTE", obs: "" }); await carregar();
      setFeedback({ type: "success", message: "Laudo registrado." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  };

  return (
    <div className="erp-fieldset"><div className="erp-fieldset-head">Laudos de qualidade do fornecedor <span className="erp-count">{laudos.length}</span></div><div className="erp-fieldset-body">
      {feedback && <div className={`erp-field erp-c12 erp-feedback ${feedback.type}`}>{feedback.message}</div>}
      <div className="erp-field erp-c2"><label className="erp-label erp-req">Data</label><input className="erp-input" type="date" value={form.data} onChange={(e) => setForm((x) => ({ ...x, data: e.target.value }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Situação</label><select className="erp-input" value={form.situacao} onChange={(e) => setForm((x) => ({ ...x, situacao: e.target.value as QualityReportStatus }))}>{SITUACOES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
      <div className="erp-field erp-c4"><label className="erp-label">Arquivo (PDF, PNG ou JPEG)</label><input className="erp-input" type="file" accept={TIPOS} onChange={(e) => setForm((x) => ({ ...x, arquivo: e.target.files?.[0] }))} /></div>
      <div className="erp-field erp-c3"><label className="erp-label">Observação</label><input className="erp-input" value={form.obs} onChange={(e) => setForm((x) => ({ ...x, obs: e.target.value }))} /></div>
      <div className="erp-field erp-c1" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void anexar()} disabled={busy}>Anexar</button></div>
      <div className="erp-field erp-c12"><table className="erp-grid">
        <thead><tr><th>Data</th><th>Situação</th><th>Arquivo</th><th>Observação</th></tr></thead>
        <tbody>
          {laudos.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhum laudo deste fornecedor para o item.</td></tr>}
          {laudos.map((l) => (
            <tr key={l.id}>
              <td>{String(l.registered_on).slice(0, 10).split("-").reverse().join("/")}</td>
              <td>{SITUACOES.find((s) => s.value === l.status)?.label ?? l.status}</td>
              <td>{l.has_attachment ? <button className="erp-btn erp-btn-sm" onClick={() => void downloadItemSupplierQualityReport(l.id, l.file_name).catch((e) => setFeedback({ type: "error", message: errMessage(e) }))}>{l.file_name || "Baixar"}</button> : "—"}</td>
              <td>{l.notes || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div></div>
  );
}

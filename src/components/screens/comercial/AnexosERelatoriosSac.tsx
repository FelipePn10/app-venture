import { useCallback, useEffect, useState } from "react";
import { downloadBlob } from "@/services/fileDownload";
import { errMessage, httpClient, type Obj, unwrapArray, unwrapObject } from "@/services/fiscalShared";
import { deleteCallAttachment, downloadCallAttachment, getCall, uploadCallAttachment, type ConsumerCallAttachmentDTO } from "@/services/consumerServiceService";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const size = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB`;
const REPORT_LABELS: Record<string, string> = { code: "Código", name: "Nome", person_type: "Tipo de pessoa", cpf: "CPF", cnpj: "CNPJ", created_at: "Cadastrado em", is_active: "Situação", subject: "Assunto", description: "Descrição", customer_code: "Cliente", consumer_code: "Consumidor", contacted_at: "Contato em", contact_type: "Tipo de contato", call_number: "Número do chamado" };
const reportLabel = (key: string) => REPORT_LABELS[key] ?? key.replace(/_/g, " ").replace(/^./, (letter) => letter.toLocaleUpperCase("pt-BR"));
const reportValue = (key: string, value: unknown) => {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? (key === "is_active" ? "Ativo" : "Sim") : (key === "is_active" ? "Inativo" : "Não");
  if (key === "person_type") return value === "F" ? "Pessoa física" : value === "J" ? "Pessoa jurídica" : String(value);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleString("pt-BR");
  return String(value);
};

/*
 * Anexos do chamado e relatórios do SAC (eram a VSAC0200): os anexos aparecem
 * no chamado aberto da VSAC0100; os relatórios, na visão Relatórios dela.
 */
export function AnexosChamadoSacPanel({ callCode }: { callCode: number }): JSX.Element {
  const [attachments, setAttachments] = useState<ConsumerCallAttachmentDTO[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (action: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await action(); } catch (error) { setFeedback({ type: "error", message: errMessage(error) }); } finally { setBusy(false); }
  }, []);
  const loadCall = useCallback(async () => { setAttachments((await getCall(callCode)).attachments ?? []); }, [callCode]);
  useEffect(() => { void run(loadCall); }, [run, loadCall]);
  const upload = () => run(async () => {
    if (!file) { setFeedback({ type: "error", message: "Selecione um arquivo." }); return; }
    if (file.size > 10 * 1024 * 1024) { setFeedback({ type: "error", message: "O arquivo deve ter no máximo 10 MiB." }); return; }
    await uploadCallAttachment(callCode, file, notes);
    await loadCall(); setFile(null); setNotes("");
    setFeedback({ type: "success", message: "Arquivo anexado ao chamado." });
  });
  const download = (attachment: ConsumerCallAttachmentDTO) => run(async () => downloadBlob(await downloadCallAttachment(callCode, attachment.id), attachment.file_name));
  const remove = (attachment: ConsumerCallAttachmentDTO) => run(async () => {
    await deleteCallAttachment(callCode, attachment.id); await loadCall();
    setFeedback({ type: "success", message: "Anexo excluído." });
  });
  return (
    <div className="erp-fieldset"><div className="erp-fieldset-head">Documentos do chamado ({attachments.length})</div><div className="erp-fieldset-body">
      {feedback && <div className={`erp-field erp-c12 erp-feedback ${feedback.type}`}>{feedback.message}</div>}
      <div className="erp-field erp-c5"><label className="erp-label erp-req">Arquivo</label><input className="erp-input" type="file" accept="application/pdf,image/png,image/jpeg,text/plain" onChange={(event) => setFile(event.target.files?.[0] ?? null)}/><span className="erp-field-hint">PDF, PNG, JPEG ou texto; máximo de 10 MiB.</span></div>
      <div className="erp-field erp-c5"><label className="erp-label">Observações</label><input className="erp-input" value={notes} onChange={(event) => setNotes(event.target.value)}/></div>
      <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={upload} disabled={busy || !file}>{busy ? "Enviando…" : "Anexar"}</button></div>
      <div className="erp-field erp-c12"><div className="erp-grid-wrap"><table className="erp-grid"><thead><tr><th>Arquivo</th><th>Tipo</th><th className="num">Tamanho</th><th>Observações</th><th style={{width:180}}>Ações</th></tr></thead><tbody>
        {attachments.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum arquivo anexado.</td></tr>}
        {attachments.map((attachment) => <tr key={attachment.id}><td><strong>{attachment.file_name}</strong></td><td>{attachment.content_type ?? "—"}</td><td className="num">{size(attachment.file_size)}</td><td>{attachment.notes ?? "—"}</td><td><div style={{display:'flex',gap:6}}><button className="erp-btn erp-btn-sm" onClick={() => download(attachment)} disabled={busy}>Baixar</button><button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => remove(attachment)} disabled={busy}>Excluir</button></div></td></tr>)}
      </tbody></table></div></div>
    </div></div>
  );
}

export function RelatoriosSacPanel(): JSX.Element {
  const [reportRows, setReportRows] = useState<Obj[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const reportColumns = Array.from(new Set(reportRows.flatMap((row) => Object.keys(row))));
  const report = async (path: string, label: string) => {
    setBusy(true); setFeedback(null);
    try { const { data } = await httpClient.get(path); setReportRows(unwrapArray(data).map(unwrapObject)); setFeedback({ type: "info", message: `${label} gerado.` }); }
    catch (error) { setFeedback({ type: "error", message: errMessage(error) }); } finally { setBusy(false); }
  };
  return (
    <div className="erp-detail-body">
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
      <div className="erp-fieldset"><div className="erp-fieldset-head">Relatórios do SAC</div><div className="erp-fieldset-body"><div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <button className="erp-btn" onClick={() => void report('/api/consumer-service/consumers/labels', 'Etiquetas de consumidores')} disabled={busy}>Etiquetas de consumidores</button>
        <button className="erp-btn" onClick={() => void report('/api/consumer-service/customer-contacts/report', 'Relatório de contatos')} disabled={busy}>Relatório de contatos</button>
        <button className="erp-btn" onClick={() => void report('/api/consumer-service/calls/labels', 'Etiquetas de chamados')} disabled={busy}>Etiquetas de chamados</button>
      </div></div></div>
      {reportRows.length > 0 && <div className="erp-fieldset"><div className="erp-fieldset-head">Resultado ({reportRows.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12"><div className="erp-grid-wrap"><table className="erp-grid"><thead><tr>{reportColumns.map((column) => <th key={column}>{reportLabel(column)}</th>)}</tr></thead><tbody>{reportRows.map((row, index) => <tr key={String(row.code ?? index)}>{reportColumns.map((column) => <td key={column}>{reportValue(column, row[column])}</td>)}</tr>)}</tbody></table></div></div></div></div>}
    </div>
  );
}

import { useState } from "react";
import { type SalesOrderDTO, analyzeSalesOrder, attendSalesOrder, conferSalesOrder, saveSalesOrderDelayReason } from "@/services/salesOrderService";
import { errMessage } from "@/services/fiscalShared";
import { hojeLocal } from "@/utils/dataLocal";

/*
 * Aba Andamento do pedido (VVND0200): análise comercial e financeira,
 * atendimento, conferência e motivo de atraso, com o motivo registrado no
 * histórico do pedido. Era a rotina genérica VVND0600, em que cada decisão
 * pedia o número do pedido e um JSON.
 */

const ANALISE: Record<string, string> = { NOT_ANALYZED: "Não analisado", APPROVED: "Aprovado", REJECTED: "Reprovado" };
const CONFERENCIA: Record<string, string> = { PENDING: "Pendente", CONFERRED: "Conferido", DIVERGENT: "Com divergência" };
const tom = (s?: string) => (s === "APPROVED" || s === "CONFERRED" ? "erp-badge-green" : s === "REJECTED" || s === "DIVERGENT" ? "erp-badge-red" : "erp-badge-amber");

export function AndamentoPedidoPanel({ pedido, aoMudar }: { pedido: SalesOrderDTO; aoMudar: () => void }): JSX.Element {
  const code = pedido.code!;
  const [motivo, setMotivo] = useState("");
  const [dataAtendimento, setDataAtendimento] = useState(hojeLocal());
  const [acaoAtraso, setAcaoAtraso] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const encerrado = pedido.status === "CANCELLED" || pedido.status === "F";

  const fazer = async (fn: () => Promise<void>, ok: string) => {
    if (!motivo.trim()) { setFeedback({ type: "error", message: "Escreva o motivo: ele fica no histórico do pedido." }); return; }
    setBusy(true); setFeedback(null);
    try { await fn(); setMotivo(""); setAcaoAtraso(""); setFeedback({ type: "success", message: ok }); aoMudar(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  };

  return (
    <div className="erp-fieldset"><div className="erp-fieldset-head">Andamento do pedido</div><div className="erp-fieldset-body">
      {feedback && <div className={`erp-field erp-c12 erp-feedback ${feedback.type}`}>{feedback.message}</div>}
      <div className="erp-field erp-c12"><dl className="erp-dados">
        <dt>Análise comercial</dt><dd><span className={`erp-badge ${tom(pedido.commercial_analysis_status)}`}>{ANALISE[pedido.commercial_analysis_status ?? "NOT_ANALYZED"] ?? pedido.commercial_analysis_status}</span></dd>
        <dt>Análise financeira</dt><dd><span className={`erp-badge ${tom(pedido.financial_analysis_status)}`}>{ANALISE[pedido.financial_analysis_status ?? "NOT_ANALYZED"] ?? pedido.financial_analysis_status}</span></dd>
        <dt>Conferência</dt><dd><span className={`erp-badge ${tom(pedido.conference_status)}`}>{CONFERENCIA[pedido.conference_status ?? "PENDING"] ?? pedido.conference_status}</span></dd>
      </dl></div>

      <div className="erp-field erp-c12"><label className="erp-label erp-req">Motivo / observação</label>
        <input className="erp-input" value={motivo} disabled={encerrado} placeholder="Ex.: crédito conferido com o financeiro" onChange={(e) => setMotivo(e.target.value)} /></div>

      <div className="erp-field erp-c6"><label className="erp-label">Análise comercial</label><div style={{ display: "flex", gap: 6 }}>
        <button className="erp-btn erp-btn-sm erp-btn-primary" disabled={busy || encerrado} onClick={() => void fazer(() => analyzeSalesOrder(code, "COMMERCIAL", "APPROVED", motivo.trim()), "Análise comercial aprovada.")}>Aprovar</button>
        <button className="erp-btn erp-btn-sm erp-btn-danger" disabled={busy || encerrado} onClick={() => void fazer(() => analyzeSalesOrder(code, "COMMERCIAL", "REJECTED", motivo.trim()), "Análise comercial reprovada.")}>Reprovar</button>
      </div></div>
      <div className="erp-field erp-c6"><label className="erp-label">Análise financeira</label><div style={{ display: "flex", gap: 6 }}>
        <button className="erp-btn erp-btn-sm erp-btn-primary" disabled={busy || encerrado} onClick={() => void fazer(() => analyzeSalesOrder(code, "FINANCIAL", "APPROVED", motivo.trim()), "Análise financeira aprovada.")}>Aprovar</button>
        <button className="erp-btn erp-btn-sm erp-btn-danger" disabled={busy || encerrado} onClick={() => void fazer(() => analyzeSalesOrder(code, "FINANCIAL", "REJECTED", motivo.trim()), "Análise financeira reprovada.")}>Reprovar</button>
      </div></div>
      <div className="erp-field erp-c6"><label className="erp-label">Conferência</label><div style={{ display: "flex", gap: 6 }}>
        <button className="erp-btn erp-btn-sm erp-btn-primary" disabled={busy || encerrado} onClick={() => void fazer(() => conferSalesOrder(code, "CONFERRED", motivo.trim()), "Pedido conferido.")}>Conferido</button>
        <button className="erp-btn erp-btn-sm erp-btn-danger" disabled={busy || encerrado} onClick={() => void fazer(() => conferSalesOrder(code, "DIVERGENT", motivo.trim()), "Divergência registrada na conferência.")}>Com divergência</button>
      </div></div>
      <div className="erp-field erp-c6"><label className="erp-label">Atendimento</label><div style={{ display: "flex", gap: 6 }}>
        <input className="erp-input" type="date" style={{ width: 160 }} value={dataAtendimento} disabled={encerrado} onChange={(e) => setDataAtendimento(e.target.value)} />
        <button className="erp-btn erp-btn-sm" disabled={busy || encerrado} onClick={() => void fazer(() => attendSalesOrder(code, motivo.trim(), dataAtendimento), "Atendimento registrado.")}>Registrar atendimento</button>
      </div></div>
      <div className="erp-field erp-c12"><label className="erp-label">Atraso</label><div style={{ display: "flex", gap: 6 }}>
        <input className="erp-input" value={acaoAtraso} disabled={encerrado} placeholder="O que será feito (ex.: reprogramar com o cliente)" onChange={(e) => setAcaoAtraso(e.target.value)} />
        <button className="erp-btn erp-btn-sm" disabled={busy || encerrado} onClick={() => { if (!acaoAtraso.trim()) { setFeedback({ type: "error", message: "Diga o que será feito com o atraso." }); return; } void fazer(() => saveSalesOrderDelayReason(code, motivo.trim(), acaoAtraso.trim()), "Motivo de atraso registrado."); }}>Registrar atraso</button>
      </div></div>
    </div></div>
  );
}

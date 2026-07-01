import { useState } from "react";
import { SupportCrud } from "./SupportCrud";
import { postSupport } from "@/services/customerService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Tab = "condicao" | "tabela";

export function Vcli0520Page(): JSX.Element {
  const [tab, setTab] = useState<Tab>("condicao");
  const [inst, setInst] = useState({ payment_condition_code: "", installment_number: "1", due_days: "30", description: "", document_type: "DUPLICATA", carrier_code: "" });
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function addInstallment() {
    if (!inst.payment_condition_code) { setFeedback({ type: "error", message: "Informe a condição de pagamento." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await postSupport("payment-conditions/installments", {
        payment_condition_code: Number(inst.payment_condition_code), installment_number: Number(inst.installment_number),
        due_days: Number(inst.due_days), description: inst.description || undefined, document_type: inst.document_type,
        carrier_code: inst.carrier_code ? Number(inst.carrier_code) : undefined,
      });
      setInst((p) => ({ ...p, installment_number: String(Number(p.installment_number) + 1), description: "" }));
      setFeedback({ type: "success", message: "Parcela adicionada." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VCLI0520 — Apoio de Cliente (Comercial)</span>
      </div></header>
      <div className="fsc-actionbar"><div className="fsc-action-group"><span className="fsc-action-label">Condições &amp; Tabelas</span></div><div className="fsc-action-group"><span className="fsc-action-label">Relatório</span><ExportButton title="VCLI0520 — Apoio de Cliente (Comercial)" filename="vcli0520" /></div></div>

      <div className="fsc-body">
        <div className="fsc-card">
          <div className="fsc-tabs">
            <button className={`fsc-tab ${tab === "condicao" ? "active" : ""}`} onClick={() => setTab("condicao")}>Condição de Pagamento</button>
            <button className={`fsc-tab ${tab === "tabela" ? "active" : ""}`} onClick={() => setTab("tabela")}>Tabela de Vendas</button>
          </div>

          {tab === "condicao" && (
            <>
              <SupportCrud resource="payment-conditions"
                fields={[
                  { key: "description", label: "Descrição", col: 4, required: true },
                  { key: "carrier_code", label: "Portador (cód.)", kind: "number", col: 2 },
                  { key: "analysis_type", label: "Análise crédito", kind: "select", options: ["SEMPRE_ANALISA", "BLOQUEIA_SEMPRE", "LIBERA_SEM_ANALISE"], col: 3 },
                  { key: "parcel_start", label: "Início parcelas", kind: "select", options: ["EMISSAO", "PROXIMO_MES", "PROXIMA_QUINZENA"], col: 3 },
                  { key: "expenses", label: "Despesas", kind: "number", col: 2 },
                  { key: "average_term", label: "Prazo médio (d)", kind: "number", col: 2 },
                  { key: "is_special", label: "Especial", kind: "bool", col: 2 },
                  { key: "is_revenue", label: "Gera receita", kind: "bool", col: 2 },
                  { key: "is_at_sight", label: "À vista", kind: "bool", col: 2 },
                ]}
                columns={[{ key: "description", label: "Descrição" }, { key: "analysis_type", label: "Análise" }, { key: "average_term", label: "Prazo médio", kind: "number" }, { key: "is_revenue", label: "Receita", kind: "bool" }]} />
              <div className="fsc-card-body" style={{ borderTop: "1px solid #e2e8e4" }}>
                {feedback && <div className={`fsc-feedback ${feedback.type}`} style={{ marginBottom: 10 }}>{feedback.message}</div>}
                <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Parcelas</span><div className="fsc-section-banner-line" /></div>
                <div className="fsc-grid">
                  <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Condição (cód.)</label><input className="fsc-input fsc-input-right" type="number" value={inst.payment_condition_code} onChange={(e) => setInst((p) => ({ ...p, payment_condition_code: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-1"><label className="fsc-label">Nº</label><input className="fsc-input fsc-input-right" type="number" value={inst.installment_number} onChange={(e) => setInst((p) => ({ ...p, installment_number: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Dias venc.</label><input className="fsc-input fsc-input-right" type="number" value={inst.due_days} onChange={(e) => setInst((p) => ({ ...p, due_days: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Descrição</label><input className="fsc-input" value={inst.description} onChange={(e) => setInst((p) => ({ ...p, description: e.target.value }))} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Documento</label><select className="fsc-select" value={inst.document_type} onChange={(e) => setInst((p) => ({ ...p, document_type: e.target.value }))}><option>DUPLICATA</option><option>CHEQUE</option><option>PROMISSORIA</option></select></div>
                  <div className="fsc-field fsc-col-2" style={{ justifyContent: "flex-end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={() => void addInstallment()} disabled={busy}>+ Parcela</button></div>
                </div>
              </div>
            </>
          )}

          {tab === "tabela" && <SupportCrud resource="sales-tables"
            fields={[
              { key: "description", label: "Descrição", col: 5, required: true },
              { key: "validity_start", label: "Vigência início (ISO)", col: 3, placeholder: "2025-01-01T00:00:00Z" },
              { key: "validity_end", label: "Vigência fim (ISO)", col: 3 },
              { key: "tolerance_min_pct", label: "Tol. mín %", kind: "number", col: 2 },
              { key: "tolerance_max_pct", label: "Tol. máx %", kind: "number", col: 2 },
              { key: "price_formation", label: "Formação de preço", kind: "select", options: ["INFORMADO", "CUSTO_MEDIO", "CUSTO_STANDARD_TOTAL", "CUSTO_STANDARD_MATERIAL", "INFORMADO_SEM_ICMS", "MAT_OPER", "TABELA_CUSTO", "TRANSFERENCIA_IPI", "TRANSFERENCIA_UF"], col: 4 },
              { key: "decimal_places", label: "Casas decimais", kind: "number", col: 2 },
              { key: "composition", label: "Incoterm", kind: "select", options: ["FOB", "CIF", "EXWORK"], col: 2 },
              { key: "table_type", label: "Tipo", kind: "select", options: ["NORMAL", "PROMOCIONAL"], col: 2 },
              { key: "base_date", label: "Data base", kind: "select", options: ["PEDIDO", "DATA_ATUAL"], col: 2 },
              { key: "allow_items_below_cent", label: "Permite < R$0,01", kind: "bool", col: 3 },
              { key: "icms_interestadual_por_dentro", label: "ICMS por dentro", kind: "bool", col: 3 },
              { key: "observation", label: "Observação", col: 6 },
            ]}
            columns={[{ key: "description", label: "Descrição" }, { key: "price_formation", label: "Formação" }, { key: "table_type", label: "Tipo" }, { key: "composition", label: "Incoterm" }]} />}
        </div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Apoio: <strong>{tab}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}

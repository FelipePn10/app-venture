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
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Cliente</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Apoio de Cliente (Comercial)</span><span className="erp-crumb-code">VCLI0520</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>
      <div className="erp-toolbar"><div className="erp-tgroup"><span className="erp-tgroup-label">Condições &amp; Tabelas</span></div><div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span><ExportButton title="VCLI0520 — Apoio de Cliente (Comercial)" filename="vcli0520" /></div></div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Apoio de Cliente</button></div>
          <div className="erp-detail-body">
        <div className="erp-fieldset">
          <div className="erp-tabs">
            <button className={`erp-tab ${tab === "condicao" ? "active" : ""}`} onClick={() => setTab("condicao")}>Condição de Pagamento</button>
            <button className={`erp-tab ${tab === "tabela" ? "active" : ""}`} onClick={() => setTab("tabela")}>Tabela de Vendas</button>
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
              <div className="erp-fieldset-body" style={{ borderTop: "1px solid #e2e8e4" }}>
                {feedback && <div className={`erp-feedback ${feedback.type}`} style={{ marginBottom: 10 }}>{feedback.message}</div>}
                
                  <div className="erp-field erp-c2"><label className="erp-label erp-req">Condição (cód.)</label><input className="erp-input num" type="number" value={inst.payment_condition_code} onChange={(e) => setInst((p) => ({ ...p, payment_condition_code: e.target.value }))} /></div>
                  <div className="erp-field erp-c1"><label className="erp-label">Nº</label><input className="erp-input num" type="number" value={inst.installment_number} onChange={(e) => setInst((p) => ({ ...p, installment_number: e.target.value }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Dias venc.</label><input className="erp-input num" type="number" value={inst.due_days} onChange={(e) => setInst((p) => ({ ...p, due_days: e.target.value }))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Descrição</label><input className="erp-input" value={inst.description} onChange={(e) => setInst((p) => ({ ...p, description: e.target.value }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Documento</label><select className="erp-input" value={inst.document_type} onChange={(e) => setInst((p) => ({ ...p, document_type: e.target.value }))}><option>DUPLICATA</option><option>CHEQUE</option><option>PROMISSORIA</option></select></div>
                  <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={() => void addInstallment()} disabled={busy}>+ Parcela</button></div>
                
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
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Apoio: <strong>{tab}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

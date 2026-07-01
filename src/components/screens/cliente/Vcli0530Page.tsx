import { useState } from "react";
import { SupportCrud, type FieldSpec } from "./SupportCrud";
import { ExportButton } from "@/components/ui/ExportButton";

type Tab = "nf" | "imposto";

const NF_TYPES = ["VENDA", "DEVOLUCAO", "REMESSA", "REMESSA_CONSIGNACAO", "REMESSA_ARMAZENAGEM", "REMESSA_BENEFICIAMENTO", "RETORNO_BENEFICIAMENTO", "SIMPLES_REMESSA", "TRANSFERENCIA", "VENDA_CONSIGNACAO", "COMPLEMENTAR_ICM", "COMPLEMENTAR_IPI", "DEMONSTRACAO", "EMPRESTIMO", "FATURAMENTO_ANTECIPADO", "PRESTACAO_SERVICOS", "OUTROS"];

const NF_FIELDS: FieldSpec[] = [
  { key: "description", label: "Descrição", col: 5, required: true },
  { key: "type", label: "Natureza", kind: "select", options: NF_TYPES, col: 4 },
  { key: "stock_movement", label: "Estoque", kind: "select", options: ["ATUALIZA", "NAO_ATUALIZA", "TRANSFERENCIA_EXTERNA"], col: 3 },
  { key: "icms_type", label: "Situação ICMS", kind: "select", options: ["TRIBUTADO", "ISENTO", "OUTROS"], col: 3 },
  { key: "icms_pct", label: "% ICMS", kind: "number", col: 2 }, { key: "icms_reduction_pct", label: "% Red. ICMS", kind: "number", col: 2 },
  { key: "ipi_pct", label: "% IPI", kind: "number", col: 2 }, { key: "pis_pct", label: "% PIS", kind: "number", col: 2 }, { key: "cofins_pct", label: "% COFINS", kind: "number", col: 2 },
  { key: "issqn_pct", label: "% ISSQN", kind: "number", col: 2 }, { key: "ir_pct", label: "% IR", kind: "number", col: 2 }, { key: "csll_pct", label: "% CSLL", kind: "number", col: 2 }, { key: "inss_pct", label: "% INSS", kind: "number", col: 2 },
  { key: "generates_revenue", label: "Gera receita", kind: "bool", col: 3 }, { key: "updates_inventory", label: "Atualiza estoque", kind: "bool", col: 3 },
  { key: "generates_financial_title", label: "Gera título", kind: "bool", col: 3 }, { key: "considers_goals", label: "Conta metas", kind: "bool", col: 3 },
  { key: "calc_substitution_tax", label: "Calc. ICMS-ST", kind: "bool", col: 3 }, { key: "calc_icms_deferral", label: "Calc. diferimento", kind: "bool", col: 3 },
  { key: "calc_pis_cofins", label: "Calc. PIS/COFINS", kind: "bool", col: 3 }, { key: "calc_difal", label: "Calc. DIFAL", kind: "bool", col: 3 },
  { key: "requires_sales_order", label: "Exige pedido", kind: "bool", col: 3 }, { key: "lists_fiscal_books", label: "Livros fiscais", kind: "bool", col: 3 },
  { key: "baixa_pedido", label: "Baixa pedido", kind: "bool", col: 3 }, { key: "gera_titulo_dev", label: "Título devolução", kind: "bool", col: 3 }, { key: "exige_suframa", label: "Exige SUFRAMA", kind: "bool", col: 3 },
  { key: "model_nf", label: "Modelo NF", kind: "select", options: ["55", "65"], col: 2 },
  { key: "cst_icms", label: "CST ICMS", col: 2 }, { key: "csosn_icms", label: "CSOSN", col: 2 }, { key: "cst_ipi", label: "CST IPI", col: 2 }, { key: "cst_pis", label: "CST PIS", col: 2 }, { key: "cst_cofins", label: "CST COFINS", col: 2 },
  { key: "ir_pct_presumption", label: "% Presunção IR", kind: "number", col: 3 }, { key: "csll_pct_presumption", label: "% Presunção CSLL", kind: "number", col: 3 },
];

const TAX_FIELDS: FieldSpec[] = [
  { key: "description", label: "Descrição", col: 8, required: true },
  { key: "is_consumer", label: "Consumidor final", kind: "bool", col: 3 },
  { key: "ipi_base_total_items", label: "IPI: total itens", kind: "bool", col: 3 }, { key: "ipi_base_subtract_discount", label: "IPI: − desconto", kind: "bool", col: 3 }, { key: "ipi_base_add_freight", label: "IPI: + frete", kind: "bool", col: 3 }, { key: "ipi_base_add_expenses", label: "IPI: + despesas", kind: "bool", col: 3 },
  { key: "icms_base_total_items", label: "ICMS: total itens", kind: "bool", col: 3 }, { key: "icms_base_subtract_discount", label: "ICMS: − desconto", kind: "bool", col: 3 }, { key: "icms_base_add_freight", label: "ICMS: + frete", kind: "bool", col: 3 }, { key: "icms_base_add_ipi", label: "ICMS: + IPI", kind: "bool", col: 3 }, { key: "icms_base_add_expenses", label: "ICMS: + despesas", kind: "bool", col: 3 },
  { key: "pis_cofins_base_total_items", label: "PIS/COF: total itens", kind: "bool", col: 3 }, { key: "pis_cofins_base_subtract_discount", label: "PIS/COF: − desconto", kind: "bool", col: 3 }, { key: "pis_cofins_base_add_freight", label: "PIS/COF: + frete", kind: "bool", col: 3 }, { key: "pis_cofins_base_add_insurance", label: "PIS/COF: + seguro", kind: "bool", col: 3 }, { key: "pis_cofins_base_add_expenses", label: "PIS/COF: + despesas", kind: "bool", col: 3 },
  { key: "csll_base_total_items", label: "CSLL: total itens", kind: "bool", col: 3 }, { key: "csll_base_subtract_discount", label: "CSLL: − desconto", kind: "bool", col: 3 }, { key: "csll_base_add_freight", label: "CSLL: + frete", kind: "bool", col: 3 },
  { key: "ir_base_total_items", label: "IR: total itens", kind: "bool", col: 3 }, { key: "ir_base_subtract_discount", label: "IR: − desconto", kind: "bool", col: 3 }, { key: "ir_base_add_freight", label: "IR: + frete", kind: "bool", col: 3 },
];

export function Vcli0530Page(): JSX.Element {
  const [tab, setTab] = useState<Tab>("nf");
  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VCLI0530 — Apoio de Cliente (Fiscal)</span>
      </div></header>
      <div className="fsc-actionbar"><div className="fsc-action-group"><span className="fsc-action-label">Tipos fiscais</span></div><div className="fsc-action-group"><span className="fsc-action-label">Relatório</span><ExportButton title="VCLI0530 — Apoio de Cliente (Fiscal)" filename="vcli0530" /></div></div>

      <div className="fsc-body">
        <div className="fsc-card">
          <div className="fsc-tabs">
            <button className={`fsc-tab ${tab === "nf" ? "active" : ""}`} onClick={() => setTab("nf")}>Tipo de NF de Saída</button>
            <button className={`fsc-tab ${tab === "imposto" ? "active" : ""}`} onClick={() => setTab("imposto")}>Tipo de Imposto</button>
          </div>
          {tab === "nf" && <SupportCrud resource="invoice-types" fields={NF_FIELDS}
            columns={[{ key: "description", label: "Descrição" }, { key: "type", label: "Natureza" }, { key: "model_nf", label: "Modelo" }, { key: "generates_revenue", label: "Receita", kind: "bool" }]} />}
          {tab === "imposto" && <SupportCrud resource="tax-types" fields={TAX_FIELDS}
            columns={[{ key: "description", label: "Descrição" }, { key: "is_consumer", label: "Consumidor", kind: "bool" }]} />}
        </div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Apoio fiscal: <strong>{tab}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}

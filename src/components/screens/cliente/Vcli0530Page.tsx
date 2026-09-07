import { useState } from "react";
import { SupportCrud, type FieldSpec } from "./SupportCrud";
import { ExportButton } from "@/components/ui/ExportButton";

type Tab = "nf" | "imposto";

/** Quais impostos o tipo de nota leva para a NF-e. */
const IMPOSTOS_NFE = ["ICMS", "IPI", "PIS", "COFINS", "ICMS_IPI", "TODOS"];

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

  // ── Escrituração: onde a nota aparece nos livros e nas obrigações ────────
  { key: "description_nf", label: "Descrição impressa na nota", col: 6 },
  { key: "impostos_nfe", label: "Impostos que vão na NF-e", kind: "select", options: IMPOSTOS_NFE, col: 3 },
  { key: "lista_valor_contabil", label: "Lista o valor contábil", kind: "bool", col: 3 },
  { key: "lista_registro_saida", label: "Lista no registro de saída", kind: "bool", col: 3 },
  { key: "lista_icms_ipi", label: "Lista no livro de ICMS/IPI", kind: "bool", col: 3 },
  { key: "sintegra_sped_fiscal", label: "Entra no SINTEGRA / SPED Fiscal", kind: "bool", col: 3 },
  { key: "sisdeclara", label: "Entra no Sisdeclara", kind: "bool", col: 3 },

  // ── Cálculos especiais de ICMS e benefícios ─────────────────────────────
  { key: "calc_reducao", label: "Calcula redução de base", kind: "bool", col: 3 },
  { key: "calc_imp_ibpt", label: "Calcula impostos pela IBPT", kind: "bool", col: 3 },
  { key: "cred_presumido_icms", label: "Crédito presumido de ICMS", kind: "bool", col: 3 },
  { key: "desc_icms_licitacoes", label: "Desconta ICMS em licitações", kind: "bool", col: 3 },
  { key: "vlr_agregado_base_subst", label: "Valor agregado na base da ST", kind: "bool", col: 3 },
  { key: "icms_st_ult_entrada", label: "ICMS-ST pela última entrada", kind: "bool", col: 3 },
  { key: "comp_ress_ret_st", label: "Compensa/ressarce ICMS-ST retido", kind: "bool", col: 3 },
  { key: "ciap", label: "Controla CIAP", kind: "bool", col: 3 },
  { key: "calc_fomentar", label: "Calcula Fomentar", kind: "bool", col: 3 },
  { key: "excecao_fomentar", label: "Exceção do Fomentar", kind: "bool", col: 3 },

  // ── Comportamento no pedido e no faturamento ────────────────────────────
  { key: "busca_tipo_nf", label: "Busca o tipo de NF automaticamente", kind: "bool", col: 3 },
  { key: "complemento_itens", label: "Aceita complemento de itens", kind: "bool", col: 3 },
  { key: "somente_consulta_lotes", label: "Somente consulta de lotes", kind: "bool", col: 3 },
  { key: "contrato_facon", label: "Contrato de facção", kind: "bool", col: 3 },
  { key: "ipi_transfer_sales_table_id", label: "Tabela de venda p/ transferência de IPI", kind: "number", col: 4 },

  // ── Dispositivo legal por imposto (o enquadramento que sai na nota) ──────
  { key: "dispositivo_legal_icms_id", label: "Dispositivo legal — ICMS", kind: "number", col: 3 },
  { key: "hierarchy_icms", label: "Hierarquia — ICMS", col: 3, placeholder: "Art. 1º, § 2º" },
  { key: "dispositivo_legal_icms_st_id", label: "Dispositivo legal — ICMS-ST", kind: "number", col: 3 },
  { key: "hierarchy_icms_st", label: "Hierarquia — ICMS-ST", col: 3 },
  { key: "dispositivo_legal_ipi_id", label: "Dispositivo legal — IPI", kind: "number", col: 3 },
  { key: "hierarchy_ipi", label: "Hierarquia — IPI", col: 3 },
  { key: "dispositivo_legal_pis_id", label: "Dispositivo legal — PIS", kind: "number", col: 3 },
  { key: "hierarchy_pis", label: "Hierarquia — PIS", col: 3 },
  { key: "dispositivo_legal_cofins_id", label: "Dispositivo legal — COFINS", kind: "number", col: 3 },
  { key: "hierarchy_cofins", label: "Hierarquia — COFINS", col: 3 },

  // ── Códigos exigidos pela nota ──────────────────────────────────────────
  { key: "cod_beneficio_fiscal", label: "Código do benefício fiscal", col: 3, placeholder: "cBenef" },
  { key: "cod_motivo_rest_comp_icms_st", label: "Motivo da restituição do ICMS-ST", col: 4 },
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
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Cliente</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Apoio de Cliente (Fiscal)</span><span className="erp-crumb-code">VCLI0530</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>
      <div className="erp-toolbar"><div className="erp-tgroup"><span className="erp-tgroup-label">Tipos fiscais</span></div><div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span><ExportButton title="VCLI0530 — Apoio de Cliente (Fiscal)" filename="vcli0530" /></div></div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Apoio de Cliente</button></div>
          <div className="erp-detail-body">
        <div className="erp-fieldset">
          <div className="erp-tabs">
            <button className={`erp-tab ${tab === "nf" ? "active" : ""}`} onClick={() => setTab("nf")}>Tipo de NF de Saída</button>
            <button className={`erp-tab ${tab === "imposto" ? "active" : ""}`} onClick={() => setTab("imposto")}>Tipo de Imposto</button>
          </div>
          {tab === "nf" && <SupportCrud resource="invoice-types" fields={NF_FIELDS}
            columns={[{ key: "description", label: "Descrição" }, { key: "type", label: "Natureza" }, { key: "model_nf", label: "Modelo" }, { key: "generates_revenue", label: "Receita", kind: "bool" }]} />}
          {tab === "imposto" && <SupportCrud resource="tax-types" fields={TAX_FIELDS}
            columns={[{ key: "description", label: "Descrição" }, { key: "is_consumer", label: "Consumidor", kind: "bool" }]} />}
        </div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Apoio fiscal: <strong>{tab}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

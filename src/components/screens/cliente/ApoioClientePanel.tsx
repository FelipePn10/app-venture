import { useEffect, useState } from "react";
import { SupportCrud, type FieldSpec } from "./SupportCrud";
import { listSupport, postSupport } from "@/services/customerService";
import { errMessage, type Obj } from "@/services/fiscalShared";

/*
 * Cadastros de apoio do cliente (botão da VCLI0500): região, segmento, tipos de
 * contato e de cliente, portador e grupo de portadores, tipo de NF de saída e
 * tipo de imposto. Eram as telas VCLI0510 e VCLI0530 — nove cadastrinhos que
 * só interessam a quem está cadastrando cliente, como já é no fornecedor.
 */

type Tab = "regiao" | "segmento" | "tcontato" | "tcliente" | "portador" | "grupo" | "nf" | "imposto";
const ABAS: { id: Tab; label: string }[] = [
  { id: "regiao", label: "Região" }, { id: "segmento", label: "Segmento" }, { id: "tcontato", label: "Tipo de contato" },
  { id: "tcliente", label: "Tipo de cliente" }, { id: "portador", label: "Portador" }, { id: "grupo", label: "Grupo de portadores" },
  { id: "nf", label: "Tipo de NF de saída" }, { id: "imposto", label: "Tipo de imposto" },
];

/** Quais impostos o tipo de nota leva para a NF-e. */
const IMPOSTOS_NFE = ["ICMS", "IPI", "PIS", "COFINS", "ICMS_IPI", "TODOS"];

const NF_TYPES = ["VENDA", "DEVOLUCAO", "REMESSA", "REMESSA_CONSIGNACAO", "REMESSA_ARMAZENAGEM", "REMESSA_BENEFICIAMENTO", "RETORNO_BENEFICIAMENTO", "SIMPLES_REMESSA", "TRANSFERENCIA", "VENDA_CONSIGNACAO", "COMPLEMENTAR_ICM", "COMPLEMENTAR_IPI", "DEMONSTRACAO", "EMPRESTIMO", "FATURAMENTO_ANTECIPADO", "PRESTACAO_SERVICOS", "OUTROS"];

const NF_FIELDS: FieldSpec[] = [
  { key: "description", label: "Descrição", col: 5, required: true },
  { key: "type", label: "Natureza", kind: "select", options: NF_TYPES, col: 4, required: true, padrao: "VENDA" },
  { key: "stock_movement", label: "Estoque", kind: "select", options: ["ATUALIZA", "NAO_ATUALIZA", "TRANSFERENCIA_EXTERNA"], col: 3, required: true, padrao: "ATUALIZA" },
  { key: "icms_type", label: "Situação ICMS", kind: "select", options: ["TRIBUTADO", "ISENTO", "OUTROS"], col: 3, required: true, padrao: "TRIBUTADO" },
  { key: "icms_pct", label: "% ICMS", kind: "number", col: 2 }, { key: "icms_reduction_pct", label: "% Red. ICMS", kind: "number", col: 2 },
  { key: "ipi_pct", label: "% IPI", kind: "number", col: 2 }, { key: "pis_pct", label: "% PIS", kind: "number", col: 2 }, { key: "cofins_pct", label: "% COFINS", kind: "number", col: 2 },
  { key: "issqn_pct", label: "% ISSQN", kind: "number", col: 2 }, { key: "ir_pct", label: "% IR", kind: "number", col: 2 }, { key: "csll_pct", label: "% CSLL", kind: "number", col: 2 }, { key: "inss_pct", label: "% INSS", kind: "number", col: 2 },
  { key: "generates_revenue", label: "Gera receita", kind: "bool", padrao: true, col: 3 }, { key: "updates_inventory", label: "Atualiza estoque", kind: "bool", padrao: true, col: 3 },
  { key: "generates_financial_title", label: "Gera título", kind: "bool", padrao: true, col: 3 }, { key: "considers_goals", label: "Conta metas", kind: "bool", col: 3 },
  { key: "calc_substitution_tax", label: "Calc. ICMS-ST", kind: "bool", col: 3 }, { key: "calc_icms_deferral", label: "Calc. diferimento", kind: "bool", col: 3 },
  { key: "calc_pis_cofins", label: "Calc. PIS/COFINS", kind: "bool", col: 3 }, { key: "calc_difal", label: "Calc. DIFAL", kind: "bool", padrao: true, col: 3 },
  { key: "requires_sales_order", label: "Exige pedido", kind: "bool", col: 3 }, { key: "lists_fiscal_books", label: "Livros fiscais", kind: "bool", padrao: true, col: 3 },
  { key: "baixa_pedido", label: "Baixa pedido", kind: "bool", padrao: true, col: 3 }, { key: "gera_titulo_dev", label: "Título devolução", kind: "bool", col: 3 }, { key: "exige_suframa", label: "Exige SUFRAMA", kind: "bool", col: 3 },
  { key: "model_nf", label: "Modelo NF", kind: "select", options: ["55", "65"], col: 2, padrao: "55" },
  { key: "cst_icms", label: "CST ICMS", col: 2 }, { key: "csosn_icms", label: "CSOSN", col: 2 }, { key: "cst_ipi", label: "CST IPI", col: 2 }, { key: "cst_pis", label: "CST PIS", col: 2 }, { key: "cst_cofins", label: "CST COFINS", col: 2 },
  { key: "ir_pct_presumption", label: "% Presunção IR", kind: "number", col: 3 }, { key: "csll_pct_presumption", label: "% Presunção CSLL", kind: "number", col: 3 },

  // ── Escrituração: onde a nota aparece nos livros e nas obrigações ────────
  { key: "description_nf", label: "Descrição impressa na nota", col: 6 },
  { key: "impostos_nfe", label: "Impostos que vão na NF-e", kind: "select", options: IMPOSTOS_NFE, col: 3 },
  { key: "lista_valor_contabil", label: "Lista o valor contábil", kind: "bool", col: 3 },
  { key: "lista_registro_saida", label: "Lista no registro de saída", kind: "bool", col: 3 },
  { key: "lista_icms_ipi", label: "Lista no livro de ICMS/IPI", kind: "bool", col: 3 },
  { key: "sintegra_sped_fiscal", label: "Entra no SINTEGRA / SPED Fiscal", kind: "bool", padrao: true, col: 3 },
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

export function ApoioClientePanel(): JSX.Element {
  const [tab, setTab] = useState<Tab>("regiao");
  const [member, setMember] = useState({ carrier_group_code: "", carrier_code: "" });
  const [grupos, setGrupos] = useState<Obj[]>([]);
  const [portadores, setPortadores] = useState<Obj[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // O vínculo portador ↔ grupo escolhe nas listas (antes pedia os dois códigos).
  useEffect(() => {
    if (tab !== "grupo") return;
    void Promise.all([listSupport("carrier-groups"), listSupport("carriers")]).then(([g, p]) => { setGrupos(g); setPortadores(p); }).catch(() => undefined);
  }, [tab]);

  async function addMember() {
    if (!member.carrier_group_code || !member.carrier_code) { setFeedback({ type: "error", message: "Escolha o grupo e o portador." }); return; }
    setBusy(true); setFeedback(null);
    try { await postSupport("carrier-groups/members", { carrier_group_code: Number(member.carrier_group_code), carrier_code: Number(member.carrier_code) }); setMember({ carrier_group_code: "", carrier_code: "" }); setFeedback({ type: "success", message: "Portador vinculado ao grupo." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-fieldset">
      <div className="erp-tabs">
        {ABAS.map((a) => <button key={a.id} className={`erp-tab ${tab === a.id ? "active" : ""}`} onClick={() => setTab(a.id)}>{a.label}</button>)}
      </div>

          {tab === "regiao" && <SupportCrud resource="regions"
            editable
            fields={[{ key: "description", label: "Descrição", col: 6, required: true }, { key: "uf", label: "UF", col: 2, required: true }, { key: "city", label: "Cidade", col: 4, required: true }]}
            columns={[{ key: "description", label: "Descrição" }, { key: "uf", label: "UF" }, { key: "city", label: "Cidade" }]} />}

          {tab === "segmento" && <SupportCrud resource="market-segments"
            editable
            fields={[{ key: "description", label: "Descrição", col: 5, required: true }, { key: "parent_code", label: "Pai (cód.)", kind: "number", col: 2 }, { key: "has_pis_cofins_retention", label: "Retém PIS/COFINS", kind: "bool", col: 3 }, { key: "retention_indicator", label: "Indicador retenção", col: 2 }]}
            columns={[{ key: "description", label: "Descrição" }, { key: "has_pis_cofins_retention", label: "Retém", kind: "bool" }, { key: "retention_indicator", label: "Indicador" }]} />}

          {tab === "tcontato" && <SupportCrud resource="contact-types"
            editable
            fields={[{ key: "description", label: "Descrição", col: 10, required: true }]}
            columns={[{ key: "description", label: "Descrição" }]} />}

          {tab === "tcliente" && <SupportCrud resource="customer-types"
            editable
            fields={[{ key: "code", label: "Código", kind: "number", col: 2, required: true }, { key: "description", label: "Descrição", col: 4, required: true }, { key: "category", label: "Categoria", kind: "select", options: ["NORMAL", "CONSUMIDOR"], col: 3 }, { key: "delivery_days", label: "Dias entrega", kind: "number", col: 2 }]}
            columns={[{ key: "description", label: "Descrição" }, { key: "category", label: "Categoria" }, { key: "delivery_days", label: "Dias entrega", kind: "number" }]} />}

          {tab === "portador" && <SupportCrud resource="carriers"
            editable
            fields={[
              { key: "description", label: "Descrição", col: 5, required: true },
              { key: "billing_type", label: "Cobrança", kind: "select", options: ["CARTEIRA", "COBRANCA_ESCRITURAL", "BOLETO"], col: 3 },
              { key: "uses_credit_limit", label: "Usa limite crédito", kind: "bool", col: 2 },
              { key: "consider_available", label: "Considera disponível", kind: "bool", col: 2 },
              { key: "postpone_due_date", label: "Adia p/ dia útil", kind: "bool", col: 3 },
              { key: "receipt_days", label: "Dias recebimento", kind: "number", col: 2 },
              { key: "payment_days", label: "Dias compensação", kind: "number", col: 2 },
            ]}
            columns={[{ key: "description", label: "Descrição" }, { key: "billing_type", label: "Cobrança" }, { key: "uses_credit_limit", label: "Limite", kind: "bool" }]} />}

          {tab === "grupo" && (
            <>
              <SupportCrud resource="carrier-groups"
                editable
                fields={[{ key: "description", label: "Descrição", col: 10, required: true }]}
                columns={[{ key: "description", label: "Descrição" }]} />
              <div className="erp-fieldset-body" style={{ borderTop: "1px solid #e2e8e4" }}>
                {feedback && <div className={`erp-feedback ${feedback.type}`} style={{ marginBottom: 10 }}>{feedback.message}</div>}
                <div className="erp-results-bar"><div className="erp-results-bar-left"><span className="erp-results-bar-label">Vincular portador ao grupo</span></div>
                  <select className="erp-input" style={{ width: 200, height: 30 }} aria-label="Grupo" value={member.carrier_group_code} onChange={(e) => setMember((p) => ({ ...p, carrier_group_code: e.target.value }))}>
                    <option value="">Grupo…</option>{grupos.map((g) => <option key={String(g.code)} value={String(g.code)}>{String(g.description ?? g.code)}</option>)}
                  </select>
                  <select className="erp-input" style={{ width: 200, height: 30 }} aria-label="Portador" value={member.carrier_code} onChange={(e) => setMember((p) => ({ ...p, carrier_code: e.target.value }))}>
                    <option value="">Portador…</option>{portadores.map((c) => <option key={String(c.code)} value={String(c.code)}>{String(c.description ?? c.code)}</option>)}
                  </select>
                  <button className="erp-btn erp-btn-primary" onClick={() => void addMember()} disabled={busy}>+ Vincular</button>
                </div>
              </div>
            </>
          )}
          {tab === "nf" && <SupportCrud resource="invoice-types" fields={NF_FIELDS}
            columns={[{ key: "description", label: "Descrição" }, { key: "type", label: "Natureza", kind: "enum" }, { key: "model_nf", label: "Modelo" }, { key: "generates_revenue", label: "Receita", kind: "bool" }]} />}
          {tab === "imposto" && <SupportCrud resource="tax-types" fields={TAX_FIELDS}
            columns={[{ key: "description", label: "Descrição" }, { key: "is_consumer", label: "Consumidor", kind: "bool" }]} />}
    </div>
  );
}

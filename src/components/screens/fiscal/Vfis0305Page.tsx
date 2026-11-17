import { SupportCrud, type FieldSpec } from "@/components/screens/cliente/SupportCrud";
import { ExportButton } from "@/components/ui/ExportButton";

/*
 * VFIS0305 — Tipos de Nota Fiscal. Saiu dos cadastros de apoio do cliente:
 * é cadastro fiscal (faturamento do pedido, nota avulsa, VFIS0320/0325/0360,
 * pedido de compra e fornecedor). A rota continua em
 * /api/customers/support/invoice-types; gravar exige o módulo Fiscal.
 *
 * Só aparecem os campos que mudam a nota. Alíquotas, CSTs e enquadramentos vêm
 * das regras da VFIS0320 — mostrá-los aqui fazia o usuário configurar em dois
 * lugares e valer só um. Os campos antigos saíram do banco na v1.20.0.
 */

const NF_TYPES = ["VENDA", "DEVOLUCAO", "REMESSA", "REMESSA_CONSIGNACAO", "REMESSA_ARMAZENAGEM", "REMESSA_BENEFICIAMENTO", "RETORNO_BENEFICIAMENTO", "SIMPLES_REMESSA", "TRANSFERENCIA", "VENDA_CONSIGNACAO", "COMPLEMENTAR_ICM", "COMPLEMENTAR_IPI", "DEMONSTRACAO", "EMPRESTIMO", "FATURAMENTO_ANTECIPADO", "PRESTACAO_SERVICOS", "OUTROS"];

const CAMPOS: FieldSpec[] = [
  { key: "description", label: "Descrição", col: 6, required: true },
  { key: "type", label: "Natureza", kind: "select", options: NF_TYPES, col: 3, required: true, padrao: "VENDA" },
  { key: "stock_movement", label: "Estoque", kind: "select", options: ["ATUALIZA", "NAO_ATUALIZA", "TRANSFERENCIA_EXTERNA"], col: 3, required: true, padrao: "ATUALIZA" },
  { key: "generates_financial_title", label: "Gera título a receber", kind: "bool", padrao: true, col: 3 },
  { key: "generates_revenue", label: "Entra como receita", kind: "bool", padrao: true, col: 3 },
  { key: "updates_inventory", label: "Movimenta estoque", kind: "bool", padrao: true, col: 3 },
  { key: "baixa_pedido", label: "Baixa o pedido de venda", kind: "bool", padrao: true, col: 3 },
  { key: "requires_sales_order", label: "Só com pedido de venda", kind: "bool", col: 3 },
  { key: "icms_type", label: "ICMS", kind: "select", options: ["TRIBUTADO", "ISENTO", "OUTROS"], col: 3, required: true, padrao: "TRIBUTADO" },
  { key: "icms_reduction_pct", label: "% redução da base do ICMS", kind: "number", col: 3 },
  { key: "calc_substitution_tax", label: "Calcula ICMS-ST", kind: "bool", col: 3 },
  { key: "calc_icms_deferral", label: "Calcula diferimento", kind: "bool", col: 3 },
  { key: "calc_pis_cofins", label: "Calcula PIS/COFINS", kind: "bool", col: 3 },
  { key: "calc_difal", label: "Calcula DIFAL", kind: "bool", padrao: true, col: 3 },
  { key: "exige_suframa", label: "Exige SUFRAMA do cliente", kind: "bool", col: 3,
    dica: "Para o tipo de nota de venda à Zona Franca de Manaus / áreas de livre comércio: a nota deste tipo só é gerada se o cliente tiver inscrição SUFRAMA válida (VCLI0500 → Fiscal). Não é obrigatório: deixe desligado nos demais tipos." },
];


export function Vfis0305Page(): JSX.Element {
  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Tipos de Nota Fiscal</span><span className="erp-crumb-code">VFIS0305</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>
      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0305 — Tipos de Nota Fiscal" filename="vfis0305" />
        </div>
      </div>
      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Tipos de nota</button></div>
          <div className="erp-detail-body">
            <div className="erp-note" style={{ marginBottom: 12 }}>
              O tipo de nota decide se a saída gera título, movimenta estoque, baixa o pedido e entra como receita, e liga ou desliga ST, diferimento, PIS/COFINS e DIFAL no cálculo.
              Alíquotas, CST e benefícios vêm das regras da <strong>VFIS0320 — Regras de ICMS/IPI</strong>, que podem ser filtradas por tipo de nota.
            </div>
            <SupportCrud resource="invoice-types" fields={CAMPOS} editable deletable inativavel
              columns={[{ key: "description", label: "Descrição" }, { key: "type", label: "Natureza", kind: "enum" }, { key: "generates_financial_title", label: "Título", kind: "bool" },
                { key: "updates_inventory", label: "Estoque", kind: "bool" }, { key: "generates_revenue", label: "Receita", kind: "bool" }]} />
          </div>
        </section>
      </div>
    </div>
  );
}

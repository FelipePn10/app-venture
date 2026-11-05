import { useCallback, useEffect, useState } from "react";
import { errMessage } from "@/services/fiscalShared";
import { loadItems } from "@/services/lookups";

export type Feedback = { type: "success" | "error" | "info"; message: string } | null;

/** Número no formato brasileiro, com as casas pedidas. */
export const num = (n?: number, casas = 2) =>
  (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: Math.max(casas, 4) });
export const qtd = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
export const reais = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
/** Data sem hora chega como meia-noite em UTC: convertida, cairia no dia anterior. */
export const dataBR = (iso?: string) => {
  if (!iso) return "—";
  const soData = /^(\d{4})-(\d{2})-(\d{2})(T00:00:00(\.0+)?Z)?$/.exec(iso);
  return soData ? `${soData[3]}/${soData[2]}/${soData[1]}` : new Date(iso).toLocaleDateString("pt-BR");
};
/** Data de hoje no relógio de quem usa: em UTC, depois das 21h já seria amanhã. */
export const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export const inicioDoMes = () => `${hoje().slice(0, 7)}-01`;

export const MOVEMENT_LABEL: Record<string, string> = {
  IN: "Entrada", OUT: "Saída", TRANSFER_IN: "Transferência (entrada)", TRANSFER_OUT: "Transferência (saída)",
  ADJUSTMENT: "Ajuste", TRANSF_ENDERECO: "Transferência entre endereços",
  EP: "Entrada de produção", EPP: "Entrada de produção planejada", EPE: "Excedente de produção",
  REP: "Requisição planejada", ENTRADA: "Entrada", SAIDA: "Saída", AJUSTE_CUSTO: "Ajuste de custo",
};
export const REFERENCE_LABEL: Record<string, string> = {
  FRETE_COMPRA: "CT-e de frete", FRETE_COMPRA_ESTORNO: "Estorno de frete", NFE_DEVOLUCAO: "Devolução de compra",
  CONSIGNACAO: "Consignação", TRANSF_CNPJ: "Transferência entre CNPJs", MANUAL: "Manual", SALES_ORDER: "Pedido de venda", PURCHASE_ORDER: "Pedido de compra", PRODUCTION_ORDER: "Ordem de produção",
  SHIPMENT: "Expedição", NF_ENTRADA: "Nota de entrada", NF_SAIDA: "Nota de saída", NF_SAIDA_CANCELADA: "Nota de saída cancelada",
  INVENTORY: "Inventário", CONTAGEM_CICLICA: "Contagem cíclica", TRANSFERENCIA: "Transferência", TRANSITO: "Envio em trânsito", ESTORNO: "Estorno",
  REQUISICAO_MATERIAL: "Requisição ao almoxarifado", QUALITY_LOT: "Lote de inspeção", ONDA_SEPARACAO: "Onda de separação",
  DEMANDA_INDEPENDENTE: "Demanda independente", PRODUCTION_ORDER_TRANSFER: "Transferência para a ordem de produção",
  ASSISTENCIA_OS: "Ordem de serviço", SERVICE_ORDER: "Ordem de serviço", DEVOLUCAO_VENDA: "Devolução de venda", FISCAL_EXIT: "Nota de saída",
  IMPLANTACAO_LOTE: "Implantação de lote", RETRABALHO: "Retrabalho", PRODUCTION_SCRAP: "Refugo de produção",
  PRODUCTION_SCRAP_REVERSAL: "Estorno de refugo", PRODUCTION_SCRAP_REVERSED: "Refugo estornado",
};

export const RESERVA_LABEL: Record<string, string> = { ACTIVE: "Ativa", CONSUMED: "Consumida", CANCELLED: "Liberada" };

/** Movimento que pode ser estornado na tela: manual, transferência ou entrega de requisição, e ainda não estornado. */
export function estornavel(m: { reference_type?: string; reversed_by_movement_id?: number; reverses_movement_id?: number; movement_type: string }) {
  if (m.reversed_by_movement_id || m.reverses_movement_id) return false;
  const ref = m.reference_type ?? "";
  if (ref === "REQUISICAO_MATERIAL") return m.movement_type === "OUT";
  return (ref === "" || ref === "MANUAL" || ref === "TRANSFERENCIA") &&
    ["IN", "OUT", "TRANSFER_IN", "TRANSFER_OUT", "ADJUSTMENT", "ENTRADA", "SAIDA"].includes(m.movement_type);
}

/** Executa uma ação da aba com ocupado/feedback de erro padronizados. */
export function useAcao() {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  return { busy, feedback, setFeedback, run };
}

/** Unidade de estoque do item (vem do cadastro, pelo lookup de itens). */
export function useUnidadeDoItem(itemCode: string | number | undefined): string {
  const [uom, setUom] = useState("");
  useEffect(() => {
    let vivo = true;
    if (!itemCode) { setUom(""); return; }
    loadItems().then((opts) => {
      const o = opts.find((x) => String(x.code) === String(itemCode));
      if (vivo) setUom(o?.sub ?? "");
    }).catch(() => { if (vivo) setUom(""); });
    return () => { vivo = false; };
  }, [itemCode]);
  return uom;
}

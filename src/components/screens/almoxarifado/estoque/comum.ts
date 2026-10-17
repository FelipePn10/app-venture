import { useCallback, useEffect, useState } from "react";
import { errMessage } from "@/services/fiscalShared";
import { loadItems } from "@/services/lookups";

export type Feedback = { type: "success" | "error" | "info"; message: string } | null;

/** Número no formato brasileiro, com as casas pedidas. */
export const num = (n?: number, casas = 2) =>
  (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: Math.max(casas, 4) });
export const qtd = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
export const reais = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dataBR = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");
export const hoje = () => new Date().toISOString().slice(0, 10);
export const inicioDoMes = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };

export const MOVEMENT_LABEL: Record<string, string> = {
  IN: "Entrada", OUT: "Saída", TRANSFER_IN: "Transferência (entrada)", TRANSFER_OUT: "Transferência (saída)",
  ADJUSTMENT: "Ajuste", TRANSF_ENDERECO: "Transferência entre endereços",
  EP: "Entrada de produção", EPP: "Entrada de produção planejada", EPE: "Excedente de produção",
  REP: "Requisição planejada", ENTRADA: "Entrada", SAIDA: "Saída", AJUSTE_CUSTO: "Ajuste de custo",
};
export const REFERENCE_LABEL: Record<string, string> = {
  FRETE_COMPRA: "CT-e de frete", FRETE_COMPRA_ESTORNO: "Estorno de frete", NFE_DEVOLUCAO: "Devolução de compra",
  MANUAL: "Manual", SALES_ORDER: "Pedido de venda", PURCHASE_ORDER: "Pedido de compra", PRODUCTION_ORDER: "Ordem de produção",
  SHIPMENT: "Expedição", NF_ENTRADA: "Nota de entrada", NF_SAIDA: "Nota de saída", NF_SAIDA_CANCELADA: "Nota de saída cancelada",
  INVENTORY: "Inventário", CONTAGEM_CICLICA: "Contagem cíclica", TRANSFERENCIA: "Transferência", ESTORNO: "Estorno",
  REQUISICAO_MATERIAL: "Requisição ao almoxarifado",
};

/** Movimento que pode ser estornado na tela: manual ou transferência, e ainda não estornado. */
export function estornavel(m: { reference_type?: string; reversed_by_movement_id?: number; reverses_movement_id?: number; movement_type: string }) {
  if (m.reversed_by_movement_id || m.reverses_movement_id) return false;
  const ref = m.reference_type ?? "";
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

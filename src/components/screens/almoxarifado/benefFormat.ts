import { situacaoOF, type Tom } from "../planejamento/planFormat";
import type { LookupLoader } from "@/services/lookups";
import { listSalesOrdersByCustomer } from "@/services/salesOrderService";
import { httpClient, unwrapArray, unwrapObject, parseNum, parseStr } from "@/services/fiscalShared";

/**
 * Peças comuns das telas de beneficiamento (VBEN0100, VBEN0200, VBEN0300).
 *
 * Quantidade e valor do material do cliente são STRING de ponta a ponta: vão
 * para documento fiscal, e passar por `number` no envio perderia casa decimal.
 * `number` aqui é só para exibir e comparar.
 */

/** "1.234,5" ou "1234.5" → "1234.5"; vazio fica vazio. */
export function paraApi(texto: string | undefined | null): string {
  const t = String(texto ?? "").trim().replace(/\s/g, "");
  if (!t) return "";
  return t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
}

/** Valor da API ("1234.5") no formato de digitação ("1234,5"). */
export function paraCampo(valor: string | undefined | null): string {
  return valor ? String(valor).replace(".", ",") : "";
}

export const n = (v: string | number | undefined | null): number => {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
};

/** Situação da remessa como selo: a cor acompanha o texto, nunca o substitui. */
export function situacaoRemessa(status: string, bloqueada: boolean, notaPendente?: string | null): { rotulo: string; tom: Tom } {
  // O saldo baixa ao criar a nota, mas o material só sai com a autorização.
  if (notaPendente === "REJECTED") return { rotulo: "Nota rejeitada", tom: "danger" };
  if (notaPendente === "DRAFT") return { rotulo: "Nota em rascunho", tom: "warn" };
  if (notaPendente === "AGUARDANDO_AUTORIZACAO") return { rotulo: "Nota na SEFAZ", tom: "info" };
  if (bloqueada && status !== "ENCERRADA" && status !== "CANCELADA") return { rotulo: "Bloqueada", tom: "danger" };
  switch (status) {
    case "ABERTA": return { rotulo: "Aberta", tom: "info" };
    case "PARCIAL": return { rotulo: "Retorno parcial", tom: "warn" };
    case "ENCERRADA": return { rotulo: "Encerrada", tom: "ok" };
    case "CANCELADA": return { rotulo: "Cancelada", tom: "muted" };
    default: return { rotulo: status, tom: "muted" };
  }
}

/** O prazo fiscal de retorno dito em texto que diz o que fazer, não só o número. */
export function prazo(dias: number | null | undefined, status?: string): { texto: string; tom: Tom } {
  if (status === "ENCERRADA" || status === "CANCELADA" || dias === null || dias === undefined) return { texto: "—", tom: "muted" };
  if (dias < 0) return { texto: `${Math.abs(dias)} dia(s) em atraso`, tom: "danger" };
  if (dias === 0) return { texto: "vence hoje", tom: "danger" };
  if (dias <= 5) return { texto: `${dias} dia(s)`, tom: "warn" };
  return { texto: `${dias} dia(s)`, tom: "ok" };
}

/** Classe de célula da grade para o prazo (vermelho vencido, âmbar vencendo). */
export function classeDoPrazo(tom: Tom): string {
  return tom === "danger" ? "erp-cell-danger" : tom === "warn" ? "erp-cell-warn" : "";
}

/** Dias até uma data "só dia", contados a partir de hoje (fuso local). */
export function diasAte(dia: string | null | undefined, hoje: string): number | null {
  if (!dia) return null;
  const alvo = Date.parse(`${dia.slice(0, 10)}T00:00:00Z`);
  const base = Date.parse(`${hoje}T00:00:00Z`);
  if (Number.isNaN(alvo) || Number.isNaN(base)) return null;
  return Math.round((alvo - base) / 86400000);
}

const STATUS_PEDIDO: Record<string, string> = {
  R: "rascunho", P: "pedido", A: "em análise", OA: "orçamento em análise", OF: "orçamento", F: "faturado", CANCELLED: "cancelado",
};

/**
 * Pedidos de venda DO CLIENTE da remessa, para a busca do pedido de
 * beneficiamento. Oferecer pedido de outro cliente é oferecer um erro: o
 * servidor recusa o vínculo. Cancelado e faturado também ficam de fora.
 */
export function pedidosDoCliente(cliente: number): LookupLoader {
  return async () => {
    if (!cliente) return [];
    return (await listSalesOrdersByCustomer(cliente))
      .filter((o) => o.code && o.status !== "CANCELLED" && o.status !== "F")
      .map((o) => ({
        code: o.code ?? 0,
        label: `Pedido ${o.order_number || o.code}`,
        sub: [o.status ? STATUS_PEDIDO[o.status] ?? o.status : "", o.emission_date ? String(o.emission_date).slice(0, 10).split("-").reverse().join("/") : ""]
          .filter(Boolean).join(" · ") || undefined,
      }));
  };
}

/**
 * Ordens de fabricação pelo NÚMERO da OF (o que está no papel da fábrica), com o
 * item e a situação. O valor gravado é o id interno da ordem.
 */
export const ordensDeFabricacao: LookupLoader = async () => {
  const { data } = await httpClient.get<unknown>("/api/production-order/list");
  const out: { code: number; displayCode: string; label: string }[] = [];
  for (const raw of unwrapArray(data)) {
    const o = unwrapObject(raw);
    if (!o) continue;
    const id = parseNum(o, "id", "ID");
    if (!id) continue;
    const numero = parseNum(o, "order_number", "OrderNumber") || id;
    const status = parseStr(o, "status", "Status");
    out.push({
      code: id,
      displayCode: `OF ${numero}`,
      label: [`item ${parseStr(o, "item_code", "ItemCode") || "—"}`, status ? situacaoOF(status).rotulo : ""].filter(Boolean).join(" · "),
    });
  }
  return out.sort((a, b) => b.code - a.code);
};

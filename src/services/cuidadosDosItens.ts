import { httpClient } from "@/services/httpClient";
import { aoInvalidarListas } from "@/services/lookupInvalidation";

/** Cuidado cadastrado no item (VENT0200 › Estoque e compras › Armazenagem e segurança). */
export interface CuidadoDoItem { item: string; name: string; hazardous: boolean; un_number?: string; hazard_class?: string; storage_conditions?: string }

let cache: Promise<Map<string, CuidadoDoItem>> | null = null;
aoInvalidarListas(() => { cache = null; });

/** Só os itens com cuidado cadastrado, por código em maiúsculas. */
export function cuidadosDosItens(): Promise<Map<string, CuidadoDoItem>> {
  cache ??= httpClient.get<CuidadoDoItem[]>("/api/items/governanca/cuidados")
    .then((r) => new Map((Array.isArray(r.data) ? r.data : []).map((c) => [c.item.toUpperCase(), c])))
    .catch(() => { cache = null; return new Map<string, CuidadoDoItem>(); });
  return cache;
}

/** "PRODUTO PERIGOSO · ONU 1263 · classe 3 — Armazenar: local ventilado". */
export function textoDoCuidado(c: CuidadoDoItem): string {
  const partes: string[] = [];
  if (c.hazardous) partes.push(["PRODUTO PERIGOSO", c.un_number && `ONU ${c.un_number}`, c.hazard_class && `classe ${c.hazard_class}`].filter(Boolean).join(" · "));
  if (c.storage_conditions) partes.push(`Armazenar: ${c.storage_conditions}`);
  return partes.join(" — ");
}

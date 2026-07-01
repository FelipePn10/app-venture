import { httpClient, unwrapArray, parseStr, parseNum, unwrapObject } from '@/services/fiscalShared';

/**
 * Mapas id→nome para clientes e fornecedores, usados para exibir nomes em telas
 * que só recebem o ID (ex.: relatórios de aging detalhado). Resultado em cache
 * por sessão para evitar refetch.
 */

type NameMap = Map<number, string>;

let customersCache: Promise<NameMap> | null = null;
let suppliersCache: Promise<NameMap> | null = null;

function buildMap(raw: unknown): NameMap {
  const map: NameMap = new Map();
  for (const item of unwrapArray(raw)) {
    const o = unwrapObject(item);
    if (!o) continue;
    const id = parseNum(o, 'id', 'code', 'codigo');
    const name = parseStr(o, 'name', 'nome', 'trade_name', 'razao_social', 'razaoSocial');
    if (id !== undefined && name) map.set(id, name);
  }
  return map;
}

export function getCustomerNames(): Promise<NameMap> {
  if (!customersCache) {
    customersCache = httpClient
      .get<unknown>('/api/customers/')
      .then((r) => buildMap(r.data))
      .catch(() => new Map<number, string>());
  }
  return customersCache;
}

export function getSupplierNames(): Promise<NameMap> {
  if (!suppliersCache) {
    suppliersCache = httpClient
      .get<unknown>('/api/suppliers/')
      .then((r) => buildMap(r.data))
      .catch(() => new Map<number, string>());
  }
  return suppliersCache;
}

/** Invalida os caches (ex.: após mudança de ambiente/login). */
export function resetLookupNames(): void {
  customersCache = null;
  suppliersCache = null;
}

import { httpClient, unwrapArray, unwrapObject, parseNum, parseStr } from '@/services/fiscalShared';
import { listCustomers } from '@/services/customerService';
import { listItems } from '@/services/itemService';
import { listSalesOrders } from '@/services/salesOrderService';
import { listSuppliers } from '@/services/supplierService';
import { listRepresentatives } from '@/services/representativeService';

/**
 * Fontes de dados para o componente <LookupField>: em vez de o usuário digitar
 * o ID de cliente/estabelecimento/item/depósito de cabeça, ele escolhe de uma
 * lista pesquisável dos registros cadastrados.
 *
 * Cada loader devolve `LookupOption[]` já normalizado e é cacheado por sessão
 * (a primeira abertura busca; as seguintes reusam). Falha de rede → lista vazia
 * (o campo continua utilizável e o usuário vê "nenhum registro").
 */
export interface LookupOption {
  code: number;
  /** Rótulo principal (nome/descrição). */
  label: string;
  /** Linha secundária opcional (documento, UM, cidade…). */
  sub?: string;
}

export type LookupLoader = () => Promise<LookupOption[]>;

/** Cacheia o resultado de um loader; reset via {@link resetLookups}. */
function cached(fn: LookupLoader): LookupLoader {
  let promise: Promise<LookupOption[]> | null = null;
  const wrapped = () => (promise ??= fn().catch(() => []));
  caches.push(() => { promise = null; });
  return wrapped;
}
const caches: Array<() => void> = [];

/** Invalida todos os caches de lookup (ex.: troca de ambiente/login). */
export function resetLookups(): void {
  for (const reset of caches) reset();
}

/** GET genérico defensivo para endpoints sem serviço dedicado. */
async function loadEndpoint(
  path: string,
  labelKeys: string[],
  subKeys: string[] = [],
): Promise<LookupOption[]> {
  const { data } = await httpClient.get<unknown>(path);
  const out: LookupOption[] = [];
  for (const raw of unwrapArray(data)) {
    const o = unwrapObject(raw);
    if (!o) continue;
    const code = parseNum(o, 'code', 'codigo', 'id');
    if (code === undefined) continue;
    const label = parseStr(o, ...labelKeys) || `#${code}`;
    const sub = subKeys.length ? parseStr(o, ...subKeys) || undefined : undefined;
    out.push({ code, label, sub });
  }
  return out.sort((a, b) => a.code - b.code);
}

export const loadCustomers = cached(async () =>
  (await listCustomers()).map((c) => ({
    code: c.code ?? 0,
    label: c.name || c.trade_name || `Cliente ${c.code}`,
    sub: c.document_number || c.trade_name || undefined,
  })).filter((o) => o.code),
);

export const loadItems = cached(async () =>
  (await listItems()).map((i) => ({
    code: i.code ?? 0,
    label: i.description || `Item ${i.code}`,
    sub: i.uom || undefined,
  })).filter((o) => o.code),
);

export const loadEstablishments = cached(() =>
  loadEndpoint('/api/enterprise', ['nome_fantasia', 'razao_social', 'name', 'nome'], ['cnpj', 'matriz_cnpj', 'municipio']),
);

export const loadWarehouses = cached(() =>
  loadEndpoint('/api/warehouse', ['descricao', 'nome', 'name', 'description'], ['tipo', 'type']),
);

export const loadSuppliers = cached(async () =>
  (await listSuppliers()).map((s) => ({
    code: s.code ?? 0,
    label: s.name || s.trade_name || `Fornecedor ${s.code}`,
    sub: s.document_number || s.trade_name || undefined,
  })).filter((o) => o.code),
);

export const loadRepresentatives = cached(async () =>
  (await listRepresentatives()).map((r) => ({
    code: r.code ?? 0,
    label: r.name || `Representante ${r.code}`,
    sub: r.document_number || r.state || undefined,
  })).filter((o) => o.code),
);

export const loadSalesOrders = cached(async () =>
  (await listSalesOrders()).map((o) => ({
    code: o.code ?? 0,
    label: `Pedido ${o.code}`,
    sub: o.customer_code ? `Cliente ${o.customer_code}` : undefined,
  })).filter((o) => o.code),
);

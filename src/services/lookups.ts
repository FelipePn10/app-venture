import { httpClient, unwrapArray, unwrapObject, parseNum, parseStr } from '@/services/fiscalShared';
import { listCustomers } from '@/services/customerService';
import { listItems } from '@/services/itemService';
import { listSalesOrders } from '@/services/salesOrderService';
import { listSuppliers } from '@/services/supplierService';
import { listRepresentatives } from '@/services/representativeService';
import { listarGrupos, listarModificadores } from '@/services/pdmService';
import { listMachines } from '@/services/machineService';

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
    const code = parseNum(o, 'code', 'codigo', 'Code', 'id', 'ID');
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

export const loadMachines = cached(async () =>
  (await listMachines()).map((m) => ({
    code: m.code,
    label: m.name || `Máquina ${m.code}`,
    sub: m.is_active ? 'Ativa' : 'Inativa',
  })).filter((o) => o.code),
);

export const loadEstablishments = cached(() =>
  loadEndpoint('/api/enterprise', ['nome_fantasia', 'razao_social', 'name', 'nome'], ['cnpj', 'matriz_cnpj', 'municipio']),
);

/**
 * Grupos e modificadores do PDM — pré-requisitos do cadastro de item: sem eles
 * o `POST /api/items/create` é recusado. O modificador é identificado por `id`
 * (gerado pelo backend), não por `code`; o grupo usa `code` informado.
 */
export const loadPdmGroups = cached(async () =>
  (await listarGrupos()).map((g) => ({
    code: g.code,
    label: g.description || `Grupo ${g.code}`,
  })).filter((o) => o.code),
);

export const loadPdmModifiers = cached(async () =>
  (await listarModificadores()).map((m) => ({
    code: m.id ?? 0,
    label: m.description || `Modificador ${m.id}`,
  })).filter((o) => o.code),
);

/** Só itens marcados como **Item Base** podem ser pai de genérico/configurado. */
export const loadBaseItems = cached(async () =>
  (await listItems())
    .filter((i) => i.nature === 2)
    .map((i) => ({ code: i.code ?? 0, label: i.description || `Item ${i.code}`, sub: i.uom || undefined }))
    .filter((o) => o.code),
);

// A rota de listagem é `/api/warehouse/list`; `/api/warehouse` (sem sufixo) é
// 404 e deixava todo campo de almoxarifado abrindo vazio.
export const loadWarehouses = cached(() =>
  loadEndpoint('/api/warehouse/list', ['descricao', 'nome', 'name', 'description'], ['tipo', 'type']),
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

/**
 * Cadastros de apoio comerciais (`/api/customers/support/*`). O backend serializa
 * essas entidades sem tags JSON, por isso os campos chegam em PascalCase.
 */
export const loadCarriers = cached(() =>
  loadEndpoint('/api/customers/support/carriers', ['Description', 'description'], ['BillingType', 'billing_type']),
);

export const loadPaymentConditions = cached(() =>
  loadEndpoint('/api/customers/support/payment-conditions', ['Description', 'description'], ['AnalysisType', 'analysis_type']),
);

export const loadSalesTables = cached(() =>
  loadEndpoint('/api/customers/support/sales-tables', ['Description', 'description'], ['TableType', 'table_type']),
);

export const loadSalesDivisions = cached(() =>
  loadEndpoint('/api/sales-division/list', ['description', 'Description']),
);

export const loadSalesOrders = cached(async () =>
  (await listSalesOrders()).map((o) => ({
    code: o.code ?? 0,
    label: `Pedido ${o.code}`,
    sub: o.customer_code ? `Cliente ${o.customer_code}` : undefined,
  })).filter((o) => o.code),
);

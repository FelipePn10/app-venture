import { httpClient, unwrapArray, unwrapObject, parseNum, parseStr } from '@/services/fiscalShared';
import { listCustomers } from '@/services/customerService';
import { listItems } from '@/services/itemService';
import { listSalesOrders } from '@/services/salesOrderService';
import { listSuppliers } from '@/services/supplierService';
import { listRepresentatives, listRepresentativeSalesPlans } from '@/services/representativeService';
import { listarGrupos, listarModificadores } from '@/services/pdmService';
import { listMachines } from '@/services/machineService';
import { listConsumers, listCalls as listConsumerCalls } from '@/services/consumerServiceService';
import { listRecurringSales } from '@/services/recurringSalesService';
import { listCalls as listTechnicalCalls } from '@/services/technicalAssistanceService';
import { listEmployees } from '@/services/employeeService';
import { listOperations } from '@/services/manufacturingRoutingService';
import { listCrpPlans } from '@/services/crpService';

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
  code: string | number;
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
  return out.sort((a, b) => String(a.code).localeCompare(String(b.code), 'pt-BR', { numeric: true }));
}

export const loadCustomers = cached(async () =>
  (await listCustomers()).map((c) => ({
    code: c.code ?? 0,
    label: c.name || c.trade_name || `Cliente ${c.code}`,
    sub: c.document_number || c.trade_name || undefined,
  })).filter((o) => o.code),
);

export const loadConsumers = cached(async () =>
  (await listConsumers()).map((consumer) => ({
    code: consumer.code ?? 0,
    label: consumer.name || `Consumidor ${consumer.code}`,
    sub: consumer.cpf || consumer.cnpj || consumer.city || undefined,
  })).filter((option) => option.code),
);

export const loadEmployees = cached(async () =>
  (await listEmployees()).filter((employee) => employee.situation !== 'INACTIVE').map((employee) => ({
    code: employee.code,
    label: employee.name || `Funcionário ${employee.code}`,
    sub: employee.role || undefined,
  })),
);

export const loadRecurringSales = cached(async () =>
  (await listRecurringSales()).map((sale) => ({
    code: sale.code ?? 0,
    label: `Venda recorrente ${sale.code}`,
    sub: `Cliente ${sale.customer_code} · Item ${sale.item_code}`,
  })).filter((option) => option.code),
);

export const loadRecurringAdjustments = cached(async () =>
  (await listRecurringSales({ movement_type: 'ADJUSTMENT', active: true })).map((sale) => ({
    code: sale.code ?? 0,
    label: `Reajuste da venda recorrente ${sale.source_recurring_sale_code ?? sale.code}`,
    sub: `Cliente ${sale.customer_code} · Item ${sale.item_code}`,
  })).filter((option) => option.code),
);

export const loadMarketSegments = cached(() =>
  loadEndpoint('/api/customers/support/market-segments', ['description', 'Description', 'name', 'Name']),
);

export const loadSalesPlans = cached(async () =>
  (await listRepresentativeSalesPlans()).map((code) => ({ code, label: `Plano de vendas ${code}` })),
);

export const loadRepresentativeInterestClassifications = cached(() =>
  loadEndpoint('/api/representatives/interest-classifications', ['description', 'Description', 'code', 'Code'], ['mask_description', 'MaskDescription', 'mask', 'Mask']),
);

export const loadTechnicalAssistanceCalls = cached(async () =>
  (await listTechnicalCalls()).map((call) => ({
    code: call.code ?? 0,
    label: `Chamado ${call.call_number ?? call.code}`,
    sub: [call.subject, call.consumer_name].filter(Boolean).join(' · ') || undefined,
  })).filter((option) => option.code),
);

export const loadConsumerServiceCalls = cached(async () =>
  (await listConsumerCalls()).map((call) => ({
    code: call.code ?? 0,
    label: `Chamado ${call.code}`,
    sub: call.subject || undefined,
  })).filter((option) => option.code),
);

export const loadItems = cached(async () =>
  (await listItems()).map((i) => ({
    code: i.code ?? '',
    label: i.description || `Item ${i.code}`,
    sub: i.uom || undefined,
  })).filter((o) => o.code),
);

/** Máscaras configuradas (códigos comerciais variantes) disponíveis no tenant. */
export const loadItemMasks = cached(async () => {
  const { data } = await httpClient.get<unknown>('/api/items/with-masks');
  const masks = new Set<string>();
  const collect = (value: unknown): void => {
    if (typeof value === 'string' && value.trim()) { masks.add(value.trim()); return; }
    if (Array.isArray(value)) { value.forEach(collect); return; }
    if (!value || typeof value !== 'object') return;
    const o = value as Record<string, unknown>;
    for (const key of ['mask', 'Mask', 'masks', 'Masks', 'item_masks', 'ItemMasks', 'configured_masks']) {
      if (o[key] !== undefined) collect(o[key]);
    }
    for (const key of ['data', 'items', 'results', 'records']) {
      if (o[key] !== undefined) collect(o[key]);
    }
  };
  collect(data);
  return [...masks].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((mask) => ({ code: mask, label: mask }));
});

/** Classificações de item (código comercial) disponíveis no tenant. */
export const loadItemClassifications = cached(async () => {
  const { data } = await httpClient.get<unknown>('/api/items/classifications/masks');
  const seen = new Map<string, LookupOption>();
  for (const raw of unwrapArray(data)) {
    const o = unwrapObject(raw);
    const code = parseStr(o, 'code', 'Code', 'mask', 'Mask');
    if (!code) continue;
    const label = parseStr(o, 'description', 'Description', 'mask_description', 'MaskDescription') || code;
    if (!seen.has(code)) seen.set(code, { code, label });
  }
  return [...seen.values()].sort((a, b) => String(a.code).localeCompare(String(b.code), 'pt-BR', { numeric: true }));
});

/** Características do configurador (código + descrição). */
export const loadCharacteristics = cached(async () => {
  const { data } = await httpClient.get<unknown>('/api/configurator/characteristics');
  const seen = new Map<number, LookupOption>();
  for (const raw of unwrapArray(data)) {
    const o = unwrapObject(raw);
    const id = parseNum(o, 'id', 'ID', 'code', 'Code');
    if (!id) continue;
    const code = parseStr(o, 'code', 'Code');
    const label = [code, parseStr(o, 'description', 'Description')].filter(Boolean).join(' — ') || `Característica ${id}`;
    if (!seen.has(id)) seen.set(id, { code: id, label });
  }
  return [...seen.values()].sort((a, b) => String(a.code).localeCompare(String(b.code), 'pt-BR', { numeric: true }));
});


export const loadMachines = cached(async () =>
  (await listMachines()).map((m) => ({
    code: m.code,
    label: m.name || `Máquina ${m.code}`,
    sub: m.is_active ? 'Ativa' : 'Inativa',
  })).filter((o) => o.code),
);

/** Operações da biblioteca de roteiro de fabricação. */
export const loadOperations = cached(async () =>
  (await listOperations()).map((o) => ({
    code: o.id ?? 0,
    label: o.name || `Operação ${o.id}`,
    sub: o.origin || undefined,
  })).filter((o) => o.code),
);

/** Planos MRP (CRP) disponíveis para o modal da VPRO0200. */
export const loadCrpPlans = cached(async () =>
  (await listCrpPlans()).map((p) => ({
    code: p.plan_code,
    label: p.name ? `${p.plan_code} · ${p.name}` : `Plano ${p.plan_code}`,
    sub: p.calculated ? `${p.total_entries ?? 0} registro(s) calculado(s)` : 'Ainda não calculado',
  })).filter((o) => o.code),
);

export const loadEstablishments = cached(() =>
  loadEndpoint('/api/enterprise/list', ['nome_fantasia', 'razao_social', 'name', 'nome'], ['cnpj', 'matriz_cnpj', 'municipio']),
);

/**
 * Classificações fiscais (mestre fiscal) usadas nas abas Contábil e Fiscal do
 * item — o usuário escolhe da lista em vez de decorar o código.
 */
export const loadFiscalClassifications = cached(async () => {
  const { listFiscalClassifications } = await import('@/services/fiscalAdvancedService');
  const rows = await listFiscalClassifications();
  return rows.map((c) => ({
    code: String(c.code),
    label: c.description ? `${c.code} · ${c.description}` : String(c.code),
    sub: c.ncm ? `NCM ${c.ncm}` : undefined,
  })).filter((o) => o.code);
});

/**
 * Empresa padrão da operação: quando a instalação tem uma única empresa, ela é
 * assumida sozinha e o usuário não precisa (nem deve) digitar o código. Com mais
 * de uma, devolve `undefined` e a tela oferece a escolha em uma lista.
 */
export async function defaultEnterprise(): Promise<LookupOption | undefined> {
  const options = await loadEstablishments();
  return options.length === 1 ? options[0] : undefined;
}

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
    .map((i) => ({ code: i.code ?? '', label: i.description || `Item ${i.code}`, sub: i.uom || undefined }))
    .filter((o) => o.code),
);

// A rota de listagem é `/api/warehouse/list`; `/api/warehouse` (sem sufixo) é
// 404 e deixava todo campo de almoxarifado abrindo vazio.
export const loadWarehouses = cached(async () => {
  const { data } = await httpClient.get<unknown>('/api/warehouse/list');
  const out: LookupOption[] = [];
  for (const raw of unwrapArray(data)) {
    const o = unwrapObject(raw);
    if (!o) continue;
    const id = parseNum(o, 'id', 'ID');
    if (!id) continue;
    const code = parseStr(o, 'code', 'Code');
    const desc = parseStr(o, 'description', 'Description', 'descricao', 'nome', 'name');
    const label = code ? `${code} · ${desc || ''}`.replace(/ · $/, '') : (desc || `Almoxarifado ${id}`);
    out.push({ code: id, label, sub: desc || code });
  }
  return out.sort((a, b) => Number(a.code) - Number(b.code));
});

export const loadWorkCenters = cached(() =>
  loadEndpoint('/api/standard-cost/work-centers?limit=500', ['name', 'Name', 'description', 'Description'], ['description', 'Description']),
);

export const loadSuppliers = cached(async () =>
  (await listSuppliers()).map((s) => ({
    code: s.code ?? 0,
    label: s.name || s.trade_name || `Fornecedor ${s.code}`,
    sub: s.document_number || s.trade_name || undefined,
  })).filter((o) => o.code),
);

export const loadRepresentatives = cached(async () =>
  (await listRepresentatives({ active_status: 'ACTIVE' })).filter((r) => r.is_active !== false && !r.is_blocked).map((r) => ({
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

export const loadSalesPricePolicies = cached(() =>
  loadEndpoint('/api/customers/support/sales-price-policies/', ['description', 'Description'], ['policy_scope', 'PolicyScope']),
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

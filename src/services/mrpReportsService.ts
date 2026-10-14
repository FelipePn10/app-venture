import { httpClient, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Relatórios operacionais do MRP (`/api/mrp-reports`). Todos GET, tenant-aware,
 * retornam JSON e aceitam filtros por item, plano, período e (quando aplicável)
 * almoxarifado. Valores inválidos → HTTP 400.
 *
 * Filtros comuns adicionais: `classification_mask_code` + `classification_code`
 * (aceita `%` hierárquico), `order_by_1`, `order_by_2`, `break_by`, `item_type`,
 * `only_available`.
 *
 * Como as respostas têm layout variável (linhas + totais), cada função devolve um
 * `MrpReport` normalizado: `rows` (primeira coleção encontrada) + `totals` + o `raw`.
 */
export type ReportParams = Record<string, string | number | boolean | undefined>;

export interface MrpReport {
  rows: Obj[];
  totals: Obj | null;
  raw: Obj;
}

/** Aceita array puro, `{ rows|items|details|data: [...] , totals? }` ou objeto simples. */
function toReport(data: unknown): MrpReport {
  if (Array.isArray(data)) return { rows: data.map((r) => unwrapObject(r)), totals: null, raw: {} };
  const o = unwrapObject(data);
  const preferred = ['rows', 'Rows', 'items', 'Items', 'details', 'Details', 'lines', 'Lines', 'data', 'Data', 'result', 'Result'];
  let arrKey = preferred.find((k) => Array.isArray(o[k]));
  if (!arrKey) arrKey = Object.keys(o).find((k) => Array.isArray(o[k]) && k.toLowerCase() !== 'totals');
  const rows = arrKey ? (o[arrKey] as unknown[]).map((r) => unwrapObject(r)) : [];
  const rawTotals = o['totals'] ?? o['Totals'];
  const totals = rawTotals && typeof rawTotals === 'object' ? unwrapObject(rawTotals) : null;
  return { rows, totals, raw: o };
}

/** Remove chaves vazias/undefined para não enviar filtros em branco. */
function clean(params: ReportParams): Obj {
  const out: Obj = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    out[k] = v;
  }
  return out;
}

/**
 * Perfil MRP. `layout=ANALITICO|SINTETICO`, `position=CALCULATION|CURRENT`,
 * `include_sales_orders`, `only_with_message`, `only_stock_without_reason`.
 * O analítico acrescenta linhas `row_type=DETALHE` com origem e quantidade.
 */
export async function reportProfile(params: ReportParams & { plan_code: number }): Promise<MrpReport> {
  const { data } = await httpClient.get('/api/mrp-reports/profile', { params: clean(params) });
  return toReport(data);
}

/**
 * Disponibilidade. Informe `sales_orders=1001,1002` **ou** `item_code` com
 * `quantity`. `layout=AMBOS|NECESSIDADES|ITENS_PEDIDO`. Consolida estoque,
 * ordens planejadas/firmes e demanda.
 */
export async function reportAvailability(params: ReportParams = {}): Promise<MrpReport> {
  const { data } = await httpClient.get('/api/mrp-reports/availability', { params: clean(params) });
  return toReport(data);
}

/**
 * Necessidades agrupadas. `periods` recebe exatamente seis intervalos
 * `início|fim` separados por vírgula, refletidos em `period_values`.
 */
export async function reportGroupedNeeds(params: ReportParams & { plan_code: number }): Promise<MrpReport> {
  const { data } = await httpClient.get('/api/mrp-reports/grouped-needs', { params: clean(params) });
  return toReport(data);
}

/**
 * Explosão multinível de um item (aplica perdas e validade da estrutura, interrompe
 * ciclos). `explosion_option=SIMPLES|CUSTO|SALDO|SALDO_DEM`,
 * `list_mode=TODOS|FILHOS_IMEDIATOS`, `description_type=TECNICA|RESUMIDA`,
 * `consider_item_warehouses`, `production_orders`, `loads`; `quantity` e `at=YYYY-MM-DD`.
 */
export async function reportExplosion(itemCode: string, params: ReportParams = {}): Promise<MrpReport> {
  const { data } = await httpClient.get(`/api/mrp-reports/explosion/${itemCode}`, { params: clean({ quantity: 1, ...params }) });
  return toReport(data);
}

/**
 * Ponto de reposição. `planning_type=REORDER_POINT|KANBAN`, período, `only_available`,
 * `order_position=LIBERADOS|LIBERADOS_E_BLOQUEADOS`. Usa saldo disponível, segurança,
 * máximo e consumo médio; percorre estruturas dos pedidos selecionados.
 */
export async function reportReorderPoint(params: ReportParams = {}): Promise<MrpReport> {
  const { data } = await httpClient.get('/api/mrp-reports/reorder-point', { params: clean(params) });
  return toReport(data);
}

/** Situação de cobertura: CRITICO (vermelho), ATENCAO (amarelo) ou OK. */
export type CoverageStatus = 'CRITICO' | 'ATENCAO' | 'OK';
/**
 * Linha do monitor de cobertura de materiais (`/api/mrp-reports/coverage`):
 * até quando o estoque cobre (`days_of_supply`), até quando estoque + ordens
 * firmes cobrem (`receipt_days_of_supply`) e o farol do item. Vazio nos dias =
 * cobre todo o horizonte do plano.
 */
export interface CoverageRow {
  item_code: string;
  description: string;
  uom?: string;
  item_type: string;
  planner_code?: number;
  planner_name?: string;
  status: CoverageStatus;
  reason: string;
  stock: number;
  safety_stock: number;
  demand: number;
  firm_supply: number;
  planned_supply: number;
  first_need_date?: string;
  stock_shortage_date?: string;
  days_of_supply?: number;
  firm_shortage_date?: string;
  receipt_days_of_supply?: number;
  firm_shortage_qty: number;
  min_projected: number;
  planned_orders: number;
  first_planned_start?: string;
}
const numOu = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : Number(v));
export async function getCoverage(planCode: number, params: ReportParams = {}): Promise<CoverageRow[]> {
  const { data } = await httpClient.get('/api/mrp-reports/coverage', { params: clean({ plan_code: planCode, ...params }) });
  return toReport(data).rows.map((o) => ({
    item_code: String(o['item_code'] ?? ''), description: String(o['description'] ?? ''), uom: (o['uom'] as string) || undefined,
    item_type: String(o['item_type'] ?? ''), planner_code: numOu(o['planner_code']), planner_name: (o['planner_name'] as string) || undefined,
    status: (String(o['status'] ?? 'OK') as CoverageStatus), reason: String(o['reason'] ?? ''),
    stock: Number(o['stock'] ?? 0), safety_stock: Number(o['safety_stock'] ?? 0), demand: Number(o['demand'] ?? 0),
    firm_supply: Number(o['firm_supply'] ?? 0), planned_supply: Number(o['planned_supply'] ?? 0),
    first_need_date: (o['first_need_date'] as string) || undefined,
    stock_shortage_date: (o['stock_shortage_date'] as string) || undefined, days_of_supply: numOu(o['days_of_supply']),
    firm_shortage_date: (o['firm_shortage_date'] as string) || undefined, receipt_days_of_supply: numOu(o['receipt_days_of_supply']),
    firm_shortage_qty: Number(o['firm_shortage_qty'] ?? 0), min_projected: Number(o['min_projected'] ?? 0),
    planned_orders: Number(o['planned_orders'] ?? 0), first_planned_start: (o['first_planned_start'] as string) || undefined,
  }));
}

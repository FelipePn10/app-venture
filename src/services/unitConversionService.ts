import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Unidades de medida e conversões (VSUP0110).
 *
 *  - catálogo de unidades da empresa (`/api/units-of-measure`), com sinônimos
 *    (o "UND"/"PÇ" que chega no XML) e conversões padrão (mesma grandeza:
 *    KG↔G, M↔MM);
 *  - conversões do item (`/api/item-conversions`) em fração exata, com
 *    vigência, histórico, impacto, cobertura e simulador do caminho.
 *
 * Os números exatos chegam como texto (decimal); a tela mostra com `numero()`.
 */

const str = (o: Obj, k: string) => parseStr(o, k);
const num = (o: Obj, k: string) => parseNum(o, k);
const optStr = (o: Obj, k: string) => { const v = o?.[k]; return v == null || v === '' ? undefined : String(v); };
const lista = (o: Obj, k: string): string[] => (Array.isArray(o?.[k]) ? (o[k] as unknown[]).map(String) : []);

export const DIMENSOES = ['CONTAGEM', 'COMPRIMENTO', 'MASSA', 'AREA', 'VOLUME', 'TEMPO', 'OUTRA'] as const;
export const ROTULO_DIMENSAO: Record<string, string> = {
  CONTAGEM: 'Contagem', COMPRIMENTO: 'Comprimento', MASSA: 'Massa', AREA: 'Área', VOLUME: 'Volume', TEMPO: 'Tempo', OUTRA: 'Outra',
};

// ── Catálogo ──
export interface Unidade {
  id: number; code: string; description: string; dimension: string; fiscal_code: string;
  decimals: number; is_system: boolean; is_active: boolean;
}
function parseUnidade(raw: unknown): Unidade {
  const o = unwrapObject(raw);
  return {
    id: num(o, 'id'), code: str(o, 'code'), description: str(o, 'description'), dimension: str(o, 'dimension'),
    fiscal_code: str(o, 'fiscal_code'), decimals: num(o, 'decimals'), is_system: parseBool(o, 'is_system'), is_active: parseBool(o, 'is_active'),
  };
}
export async function listarUnidades(incluirInativas = false): Promise<Unidade[]> {
  const { data } = await httpClient.get('/api/units-of-measure', { params: incluirInativas ? { include_inactive: true } : undefined });
  return unwrapArray(data).map(parseUnidade);
}
export interface UnidadeForm { code: string; description: string; dimension: string; fiscal_code?: string; decimals: number }
export async function criarUnidade(dto: UnidadeForm): Promise<Unidade> {
  const { data } = await httpClient.post('/api/units-of-measure', dto);
  cacheUnidades = null;
  return parseUnidade(data);
}
export async function alterarUnidade(code: string, dto: UnidadeForm): Promise<Unidade> {
  const { data } = await httpClient.put(`/api/units-of-measure/${encodeURIComponent(code)}`, dto);
  cacheUnidades = null;
  return parseUnidade(data);
}
export async function ativarUnidade(code: string, ativa: boolean): Promise<void> {
  await httpClient.post(`/api/units-of-measure/${encodeURIComponent(code)}/${ativa ? 'activate' : 'deactivate'}`);
  cacheUnidades = null;
}

/**
 * Lista das unidades ativas, compartilhada pelas telas (cadastro do item,
 * estrutura, nota de entrada). Sem conexão ou sem permissão, as telas usam a
 * lista fixa que tinham antes.
 */
let cacheUnidades: Promise<Unidade[]> | null = null;
let cacheLidoEm = 0;
/** O cache vale 30 s: o bastante para as telas abertas juntas não repetirem a consulta. */
const VALIDADE_CACHE_MS = 30_000;
/**
 * `fresco`: a janela voltou ao foco e o catálogo pode ter mudado noutra janela
 * (cada janela tem a própria memória). Relê, mas os vários campos da tela que
 * pedem no mesmo foco dividem uma leitura só.
 */
export function carregarUnidades(fresco = false): Promise<Unidade[]> {
  const validade = fresco ? 1_000 : VALIDADE_CACHE_MS;
  if (!cacheUnidades || Date.now() - cacheLidoEm > validade) {
    cacheLidoEm = Date.now();
    cacheUnidades = listarUnidades().catch((e) => { cacheUnidades = null; throw e; });
  }
  return cacheUnidades;
}
export function esquecerUnidades(): void { cacheUnidades = null; }

// ── Sinônimos ──
export interface Sinonimo { id: number; alias: string; unit_code: string; supplier_code?: number; supplier_name?: string; is_system: boolean }
function parseSinonimo(raw: unknown): Sinonimo {
  const o = unwrapObject(raw);
  return {
    id: num(o, 'id'), alias: str(o, 'alias'), unit_code: str(o, 'unit_code'),
    supplier_code: o?.supplier_code != null ? Number(o.supplier_code) : undefined, supplier_name: optStr(o, 'supplier_name'),
    is_system: parseBool(o, 'is_system'),
  };
}
export async function listarSinonimos(): Promise<Sinonimo[]> {
  const { data } = await httpClient.get('/api/units-of-measure/aliases');
  return unwrapArray(data).map(parseSinonimo);
}
export async function criarSinonimo(dto: { alias: string; unit_code: string; supplier_code?: number }): Promise<Sinonimo> {
  const { data } = await httpClient.post('/api/units-of-measure/aliases', dto);
  return parseSinonimo(data);
}
export async function excluirSinonimo(id: number): Promise<void> {
  await httpClient.delete(`/api/units-of-measure/aliases/${id}`);
}

// ── Conversões padrão ──
export interface ConversaoPadrao {
  id: number; from_uom: string; to_uom: string; from_quantity: string; to_quantity: string;
  factor: string; inverse_factor: string; dimension: string; is_system: boolean;
}
function parsePadrao(raw: unknown): ConversaoPadrao {
  const o = unwrapObject(raw);
  return {
    id: num(o, 'id'), from_uom: str(o, 'from_uom'), to_uom: str(o, 'to_uom'), from_quantity: str(o, 'from_quantity'),
    to_quantity: str(o, 'to_quantity'), factor: str(o, 'factor'), inverse_factor: str(o, 'inverse_factor'),
    dimension: str(o, 'dimension'), is_system: parseBool(o, 'is_system'),
  };
}
export async function listarConversoesPadrao(): Promise<ConversaoPadrao[]> {
  const { data } = await httpClient.get('/api/units-of-measure/standard-conversions');
  return unwrapArray(data).map(parsePadrao);
}
export async function salvarConversaoPadrao(dto: { from_uom: string; to_uom: string; from_quantity: string; to_quantity: string }): Promise<ConversaoPadrao> {
  const { data } = await httpClient.post('/api/units-of-measure/standard-conversions', dto);
  return parsePadrao(data);
}
export async function excluirConversaoPadrao(id: number): Promise<void> {
  await httpClient.delete(`/api/units-of-measure/standard-conversions/${id}`);
}

// ── Conversões do item ──
export const TIPOS_TOLERANCIA = ['VALUE', 'PERCENT'] as const;
export const ROTULO_TOLERANCIA: Record<string, string> = { VALUE: 'Valor (na unidade)', PERCENT: 'Percentual' };
export const ROTULO_SITUACAO: Record<string, string> = { VIGENTE: 'Vigente', FUTURA: 'Futura', ENCERRADA: 'Encerrada' };
export const ROTULO_ORIGEM_CADASTRO: Record<string, string> = {
  MANUAL: 'Digitada', NOTA_FISCAL: 'Memorizada da nota', PEDIDO_COMPRA: 'Do pedido de compra', IMPORTACAO: 'Importada',
};

export interface ConversaoItem {
  id: number; item_code: string; item_name?: string; mask?: string;
  from_uom: string; to_uom: string; from_quantity: string; to_quantity: string;
  factor_exact: string; inverse_factor: string;
  rounding_percent: number; tolerance_value: number; tolerance_type: string;
  valid_from: string; valid_to?: string; situation: string; origin: string; notes?: string;
  updated_at: string; warnings: string[];
}
function parseConversao(raw: unknown): ConversaoItem {
  const o = unwrapObject(raw);
  return {
    id: num(o, 'id'), item_code: str(o, 'item_code'), item_name: optStr(o, 'item_name'), mask: optStr(o, 'mask'),
    from_uom: str(o, 'from_uom'), to_uom: str(o, 'to_uom'), from_quantity: str(o, 'from_quantity'), to_quantity: str(o, 'to_quantity'),
    factor_exact: str(o, 'factor_exact') || str(o, 'factor'), inverse_factor: str(o, 'inverse_factor'),
    rounding_percent: num(o, 'rounding_percent'), tolerance_value: num(o, 'tolerance_value'), tolerance_type: str(o, 'tolerance_type') || 'VALUE',
    valid_from: str(o, 'valid_from'), valid_to: optStr(o, 'valid_to'), situation: str(o, 'situation'), origin: str(o, 'origin'),
    notes: optStr(o, 'notes'), updated_at: str(o, 'updated_at'), warnings: lista(o, 'warnings'),
  };
}
const rotaItem = (item: string) => `/api/item-conversions/item/${encodeURIComponent(item)}`;

export async function listarConversoes(item: string, todasAsVersoes = false): Promise<ConversaoItem[]> {
  const { data } = await httpClient.get(todasAsVersoes ? `${rotaItem(item)}/versions` : rotaItem(item));
  return unwrapArray(data).map(parseConversao);
}
export interface NovaConversao {
  item_code: string; mask?: string; from_uom: string; to_uom: string;
  from_quantity: string; to_quantity: string; factor: string;
  rounding_percent: string; tolerance_value: string; tolerance_type: string;
  valid_from?: string; notes?: string;
}
export async function criarConversao(dto: NovaConversao): Promise<ConversaoItem> {
  const { data } = await httpClient.post('/api/item-conversions', dto);
  return parseConversao(data);
}
export interface AlteracaoConversao {
  from_quantity?: string; to_quantity?: string;
  rounding_percent?: string; tolerance_value?: string; tolerance_type?: string;
  notes?: string; valid_from?: string; reason?: string;
}
export async function alterarConversao(id: number, dto: AlteracaoConversao): Promise<ConversaoItem> {
  const { data } = await httpClient.put(`/api/item-conversions/${id}`, dto);
  return parseConversao(data);
}
export async function excluirConversao(id: number, motivo: string): Promise<void> {
  await httpClient.delete(`/api/item-conversions/${id}`, { params: { reason: motivo } });
}

export interface Impacto {
  structure_lines: number; structure_lines_stale: number; open_purchase_lines: number;
  pending_entry_lines: number; supplier_links: number; approved_entries_in_month: number; messages: string[];
}
export async function impactoDaConversao(id: number): Promise<Impacto> {
  const { data } = await httpClient.get(`/api/item-conversions/${id}/impact`);
  const o = unwrapObject(data);
  return {
    structure_lines: num(o, 'structure_lines'), structure_lines_stale: num(o, 'structure_lines_stale'),
    open_purchase_lines: num(o, 'open_purchase_lines'), pending_entry_lines: num(o, 'pending_entry_lines'),
    supplier_links: num(o, 'supplier_links'), approved_entries_in_month: num(o, 'approved_entries_in_month'), messages: lista(o, 'messages'),
  };
}

export interface Evento {
  id: number; action: string; reason?: string; created_by_name?: string; created_at: string;
  before?: Record<string, unknown>; after?: Record<string, unknown>;
}
export async function historicoDoItem(item: string): Promise<Evento[]> {
  const { data } = await httpClient.get(`${rotaItem(item)}/history`);
  return unwrapArray(data).map((raw) => {
    const o = unwrapObject(raw);
    return {
      id: num(o, 'id'), action: str(o, 'action'), reason: optStr(o, 'reason'), created_by_name: optStr(o, 'created_by_name'),
      created_at: str(o, 'created_at'),
      before: (o?.before as Record<string, unknown>) ?? undefined, after: (o?.after as Record<string, unknown>) ?? undefined,
    };
  });
}

export interface LinhaCobertura { role: string; unit: string; status: string; factor?: string; explanation?: string; source?: string; occurrences?: number }
export interface Cobertura { item_code: string; item_name?: string; stock_unit: string; accepts_fractional: boolean; rows: LinhaCobertura[]; missing: number }
export async function coberturaDoItem(item: string): Promise<Cobertura> {
  const { data } = await httpClient.get(`${rotaItem(item)}/coverage`);
  const o = unwrapObject(data);
  return {
    item_code: str(o, 'item_code'), item_name: optStr(o, 'item_name'), stock_unit: str(o, 'stock_unit'),
    accepts_fractional: parseBool(o, 'accepts_fractional'), missing: num(o, 'missing'),
    rows: unwrapArray(o?.rows).map((r) => {
      const x = unwrapObject(r);
      return {
        role: str(x, 'role'), unit: str(x, 'unit'), status: str(x, 'status'), factor: optStr(x, 'factor'),
        explanation: optStr(x, 'explanation'), source: optStr(x, 'source'), occurrences: num(x, 'occurrences') || undefined,
      };
    }),
  };
}

export interface PassoSimulacao { from_uom: string; to_uom: string; factor: string; source: string; inverted: boolean }
export interface Simulacao {
  from_uom: string; to_uom: string; quantity: string; converted: string; rounded?: string; factor: string;
  explanation: string; source: string; steps: PassoSimulacao[]; date: string; rounding_note?: string;
}
export async function simular(p: { item: string; from: string; to: string; qty: string; lot?: string; date?: string; mask?: string }): Promise<Simulacao> {
  const params: Record<string, string> = { item: p.item, from: p.from, to: p.to, qty: p.qty };
  if (p.lot) params.lot = p.lot;
  if (p.date) params.date = p.date;
  if (p.mask) params.mask = p.mask;
  const { data } = await httpClient.get('/api/item-conversions/simulate', { params });
  const o = unwrapObject(data);
  return {
    from_uom: str(o, 'from_uom'), to_uom: str(o, 'to_uom'), quantity: str(o, 'quantity'), converted: str(o, 'converted'),
    rounded: optStr(o, 'rounded'), factor: str(o, 'factor'), explanation: str(o, 'explanation'), source: str(o, 'source'),
    date: str(o, 'date'), rounding_note: optStr(o, 'rounding_note'),
    steps: unwrapArray(o?.steps).map((s) => {
      const x = unwrapObject(s);
      return { from_uom: str(x, 'from_uom'), to_uom: str(x, 'to_uom'), factor: str(x, 'factor'), source: str(x, 'source'), inverted: parseBool(x, 'inverted') };
    }),
  };
}

// ── Conversão por lote ──
export interface ConversaoLote { id: number; lot: string; from_uom: string; to_uom: string; from_quantity: string; to_quantity: string; factor: string; notes?: string; updated_at: string; warnings: string[] }
function parseLote(raw: unknown): ConversaoLote {
  const o = unwrapObject(raw);
  return {
    id: num(o, 'id'), lot: str(o, 'lot'), from_uom: str(o, 'from_uom'), to_uom: str(o, 'to_uom'),
    from_quantity: str(o, 'from_quantity'), to_quantity: str(o, 'to_quantity'), factor: str(o, 'factor'),
    notes: optStr(o, 'notes'), updated_at: str(o, 'updated_at'), warnings: lista(o, 'warnings'),
  };
}
export async function listarLotes(item: string): Promise<ConversaoLote[]> {
  const { data } = await httpClient.get(`${rotaItem(item)}/lots`);
  return unwrapArray(data).map(parseLote);
}
export async function salvarLote(dto: { item_code: string; lot: string; from_uom: string; to_uom: string; from_quantity: string; to_quantity: string; notes?: string }): Promise<ConversaoLote> {
  const { data } = await httpClient.post('/api/item-conversions/lots', dto);
  return parseLote(data);
}
export async function excluirLote(id: number, motivo: string): Promise<void> {
  await httpClient.delete(`/api/item-conversions/lots/${id}`, { params: { reason: motivo } });
}

// ── Formatação ──
/** Número decimal (texto exato do servidor) em pt-BR, sem zeros à direita. */
export function numero(v: string | number | undefined, casas = 6): string {
  if (v === undefined || v === '') return '';
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString('pt-BR', { maximumFractionDigits: casas });
}
/** "1 UN = 3 M2 · 1 M2 = 0,333333 UN" — a mesma conversão nos dois sentidos. */
export function ambosOsSentidos(de: string, para: string, qtdDe: string | number, qtdPara: string | number): string {
  const a = Number(qtdDe), b = Number(qtdPara);
  if (!de || !para || !(a > 0) || !(b > 0)) return '';
  const direto = a === 1 ? `1 ${de} = ${numero(b)} ${para}` : `${numero(a)} ${de} = ${numero(b)} ${para}`;
  return `${direto}  ·  1 ${para} = ${numero(a / b, 8)} ${de}`;
}

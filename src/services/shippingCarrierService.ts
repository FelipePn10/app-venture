import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/shipping-carriers';

/**
 * Cadastro de transportadora — `/api/shipping-carriers`.
 *
 * A transportadora CONTINUA sendo um fornecedor (o frete é pago pelo contas a
 * pagar de sempre); aqui fica o perfil de transporte que faltava: habilitação na
 * ANTT, modal, tabela de frete, seguro, frota/motoristas, regiões atendidas com
 * prazo e as ocorrências de entrega.
 *
 * Atenção ao vocabulário deste ERP: `carrier_code` do pedido/orçamento e a tela
 * de portadores apontam para `carriers`, que é o **portador financeiro**
 * (carteira, limite de crédito, dias de recebimento) — coisa diferente da
 * transportadora.
 */

export const CARRIER_MODALS = [
  { value: 'RODOVIARIO', label: 'Rodoviário' },
  { value: 'AEREO', label: 'Aéreo' },
  { value: 'MARITIMO', label: 'Marítimo' },
  { value: 'FERROVIARIO', label: 'Ferroviário' },
  { value: 'DUTOVIARIO', label: 'Dutoviário' },
  { value: 'MULTIMODAL', label: 'Multimodal' },
] as const;

/** Categorias da ANTL/ANTT: empresa, cooperativa e autônomo. */
export const CARRIER_SHIPPER_TYPES = [
  { value: 'ETC', label: 'ETC — Empresa de Transporte de Carga' },
  { value: 'CTC', label: 'CTC — Cooperativa de Transporte de Carga' },
  { value: 'TAC', label: 'TAC — Transportador Autônomo' },
] as const;

/** Tipos de frete aceitos como padrão da transportadora. */
export const CARRIER_FREIGHT_TYPES = ['CIF', 'FOB', 'TERCEIROS', 'SEM_FRETE'] as const;

/** MDF-e tpRod: tipo de rodado do veículo. */
export const WHEEL_TYPES = [
  { value: '01', label: '01 — Truck' }, { value: '02', label: '02 — Toco' }, { value: '03', label: '03 — Cavalo mecânico' },
  { value: '04', label: '04 — VAN' }, { value: '05', label: '05 — Utilitário' }, { value: '06', label: '06 — Outros' },
] as const;

/** MDF-e tpCar: tipo de carroceria. */
export const BODY_TYPES = [
  { value: '00', label: '00 — Não aplicável' }, { value: '01', label: '01 — Aberta' }, { value: '02', label: '02 — Fechada/baú' },
  { value: '03', label: '03 — Granelera' }, { value: '04', label: '04 — Porta-contêiner' }, { value: '05', label: '05 — Sider' },
] as const;

/** MDF-e tpProp: proprietário do veículo quando não é da própria transportadora. */
export const OWNER_TYPES = [
  { value: '0', label: 'TAC agregado' }, { value: '1', label: 'TAC independente' }, { value: '2', label: 'Outros' },
] as const;

export const CNH_CATEGORIES = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'] as const;

export interface VehicleTypeDTO {
  id?: number;
  code: string;
  description: string;
  wheel_type?: string;
  body_type?: string;
  axles?: number;
  capacity_kg?: number;
  capacity_m3?: number;
  is_active?: boolean;
  /** Veículos que usam o tipo: tipo em uso não se exclui. */
  in_use?: number;
}

export interface OccurrenceTypeDTO {
  id?: number;
  code: string;
  description: string;
  /** Pesa contra a transportadora na avaliação (avaria sim; reentrega a pedido do cliente não). */
  counts_as_failure?: boolean;
  is_active?: boolean;
  in_use?: number;
}

export interface CarrierUsageDTO {
  documents: { document: string; total: number; open: number }[];
  can_delete: boolean;
  can_deactivate: boolean;
}

export function carrierModalLabel(value?: string): string {
  return CARRIER_MODALS.find((m) => m.value === value)?.label ?? (value || '—');
}

export interface CarrierVehicleDTO {
  id?: number;
  plate: string;
  description?: string;
  vehicle_type?: string;
  axles?: number;
  capacity_kg?: number;
  capacity_m3?: number;
  antt_owner?: string;
  driver_name?: string;
  driver_document?: string;
  driver_license?: string;
  vehicle_type_id?: number;
  plate_state?: string;
  renavam?: string;
  tare_kg?: number;
  wheel_type?: string;
  body_type?: string;
  owner_type?: string;
  driver_cnh_category?: string;
  driver_cnh_expiry?: string;
  is_active?: boolean;
}

export interface CarrierServiceAreaDTO {
  id?: number;
  state?: string;
  city?: string;
  postal_code_from?: string;
  postal_code_to?: string;
  lead_days?: number;
  min_value?: number;
  kg_rate?: number;
  pct_value?: number;
  is_active?: boolean;
}

export interface CarrierPerformanceDTO {
  occurrences: number;
  /** Ocorrências cujo tipo pesa contra a transportadora. */
  failures: number;
  average_delay_days: number;
  total_cost_impact: number;
  last_occurrence_date?: string;
  since: string;
}

export interface ShippingCarrierDTO {
  id?: number;
  supplier_code: number;
  supplier_name?: string;
  supplier_document?: string;
  /** 8 dígitos; sem ele o CT-e rodoviário é rejeitado na SEFAZ. */
  antt_rntrc?: string;
  antt_expiry?: string;
  shipper_type?: string;
  shipper_type_label?: string;
  modal: string;
  modal_label?: string;
  issues_cte?: boolean;
  default_freight_type?: string;
  freight_min_value?: number;
  freight_kg_rate?: number;
  freight_pct_value?: number;
  gris_pct?: number;
  toll_per_100kg?: number;
  insurance_company?: string;
  insurance_policy?: string;
  insurance_expiry?: string;
  insurance_coverage?: number;
  average_lead_days?: number;
  tracking_url?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
  /** kg por m³ do peso cubado (rodoviário costuma usar 300); 0 cobra só o peso real. */
  cubage_factor?: number;
  /** Taxa fixa por embarque (despacho/emissão do CT-e). */
  dispatch_fee?: number;
  accepts_dangerous_goods?: boolean;
  is_active?: boolean;
  /** O que não impede gravar mas impede transportar (habilitação/seguro vencido, frota vazia…). */
  alerts?: string[];
  vehicles?: CarrierVehicleDTO[];
  service_areas?: CarrierServiceAreaDTO[];
  performance?: CarrierPerformanceDTO;
}

export interface CarrierOccurrenceDTO {
  id?: number;
  carrier_id?: number;
  occurrence_date: string;
  occurrence_type: string;
  sales_order_code?: number;
  /** Código do romaneio (o que a VEXP0100 mostra). */
  shipment_code?: number;
  delay_days?: number;
  cost_impact?: number;
  description?: string;
}

/** Frete aberto em componentes: mostrar só o total esconde o que o usuário questiona. */
export interface FreightQuoteDTO {
  carrier_id: number;
  supplier_code: number;
  supplier_name: string;
  modal: string;
  modal_label: string;
  service_area_id?: number;
  service_area: string;
  charged_weight_kg: number;
  cubed_weight_applied: boolean;
  dispatch_fee_value: number;
  weight_value: number;
  ad_valorem_value: number;
  gris_value: number;
  toll_value: number;
  minimum_applied: boolean;
  total: number;
  lead_days: number;
  estimated_delivery: string;
  alerts: string[];
  /** Impede esta carga (RNTRC/seguro vencido, acima da cobertura, sem veículo que comporte): fica fora de "mais barata/rápida". */
  blocking: string[];
}

export interface FreightComparisonDTO {
  destination: string;
  weight_kg: number;
  cargo_value: number;
  cheapest_carrier_id?: number;
  fastest_carrier_id?: number;
  quotes: FreightQuoteDTO[];
  not_served_by: string[];
}

const optStr = (o: Obj, ...keys: string[]) => parseStr(o, ...keys) || undefined;
const optNum = (o: Obj, ...keys: string[]) => parseNum(o, ...keys) || undefined;

function parseVehicle(raw: unknown): CarrierVehicleDTO {
  const o = unwrapObject(raw);
  return {
    id: optNum(o, 'id', 'ID'),
    plate: parseStr(o, 'plate', 'Plate'),
    description: optStr(o, 'description', 'Description'),
    vehicle_type: optStr(o, 'vehicle_type', 'VehicleType'),
    axles: optNum(o, 'axles', 'Axles'),
    capacity_kg: parseNum(o, 'capacity_kg', 'CapacityKg'),
    capacity_m3: parseNum(o, 'capacity_m3', 'CapacityM3'),
    antt_owner: optStr(o, 'antt_owner', 'ANTTOwner'),
    driver_name: optStr(o, 'driver_name', 'DriverName'),
    driver_document: optStr(o, 'driver_document', 'DriverDocument'),
    driver_license: optStr(o, 'driver_license', 'DriverLicense'),
    vehicle_type_id: optNum(o, 'vehicle_type_id'),
    plate_state: optStr(o, 'plate_state'),
    renavam: optStr(o, 'renavam'),
    tare_kg: parseNum(o, 'tare_kg'),
    wheel_type: optStr(o, 'wheel_type'),
    body_type: optStr(o, 'body_type'),
    owner_type: optStr(o, 'owner_type'),
    driver_cnh_category: optStr(o, 'driver_cnh_category'),
    driver_cnh_expiry: optStr(o, 'driver_cnh_expiry'),
    is_active: parseBool(o, 'is_active', 'IsActive'),
  };
}

function parseArea(raw: unknown): CarrierServiceAreaDTO {
  const o = unwrapObject(raw);
  return {
    id: optNum(o, 'id', 'ID'),
    state: optStr(o, 'state', 'State'),
    city: optStr(o, 'city', 'City'),
    postal_code_from: optStr(o, 'postal_code_from', 'PostalCodeFrom'),
    postal_code_to: optStr(o, 'postal_code_to', 'PostalCodeTo'),
    lead_days: parseNum(o, 'lead_days', 'LeadDays'),
    min_value: parseNum(o, 'min_value', 'MinValue'),
    kg_rate: parseNum(o, 'kg_rate', 'KgRate'),
    pct_value: parseNum(o, 'pct_value', 'PctValue'),
    is_active: parseBool(o, 'is_active', 'IsActive'),
  };
}

function parseCarrier(raw: unknown): ShippingCarrierDTO {
  const o = unwrapObject(raw);
  const vehicles = o['vehicles'] ?? o['Vehicles'];
  const areas = o['service_areas'] ?? o['ServiceAreas'];
  const alerts = o['alerts'] ?? o['Alertas'];
  const perf = o['performance'] ?? o['Desempenho'];
  const out: ShippingCarrierDTO = {
    id: optNum(o, 'id', 'ID'),
    supplier_code: parseNum(o, 'supplier_code', 'SupplierCode'),
    supplier_name: optStr(o, 'supplier_name', 'SupplierName'),
    supplier_document: optStr(o, 'supplier_document', 'SupplierDocument'),
    antt_rntrc: optStr(o, 'antt_rntrc', 'ANTTRNTRC'),
    antt_expiry: optStr(o, 'antt_expiry', 'ANTTExpiry'),
    shipper_type: optStr(o, 'shipper_type', 'ShipperType'),
    shipper_type_label: optStr(o, 'shipper_type_label', 'ShipperTypeLabel'),
    modal: parseStr(o, 'modal', 'Modal') || 'RODOVIARIO',
    modal_label: optStr(o, 'modal_label', 'ModalLabel'),
    issues_cte: parseBool(o, 'issues_cte', 'IssuesCTe'),
    default_freight_type: optStr(o, 'default_freight_type', 'DefaultFreightType'),
    freight_min_value: parseNum(o, 'freight_min_value', 'FreightMinValue'),
    freight_kg_rate: parseNum(o, 'freight_kg_rate', 'FreightKgRate'),
    freight_pct_value: parseNum(o, 'freight_pct_value', 'FreightPctValue'),
    gris_pct: parseNum(o, 'gris_pct', 'GrisPct'),
    toll_per_100kg: parseNum(o, 'toll_per_100kg', 'TollPer100Kg'),
    insurance_company: optStr(o, 'insurance_company', 'InsuranceCompany'),
    insurance_policy: optStr(o, 'insurance_policy', 'InsurancePolicy'),
    insurance_expiry: optStr(o, 'insurance_expiry', 'InsuranceExpiry'),
    insurance_coverage: parseNum(o, 'insurance_coverage', 'InsuranceCoverage'),
    average_lead_days: optNum(o, 'average_lead_days', 'AverageLeadDays'),
    tracking_url: optStr(o, 'tracking_url', 'TrackingURL'),
    contact_name: optStr(o, 'contact_name', 'ContactName'),
    contact_phone: optStr(o, 'contact_phone', 'ContactPhone'),
    contact_email: optStr(o, 'contact_email', 'ContactEmail'),
    notes: optStr(o, 'notes', 'Notes'),
    cubage_factor: parseNum(o, 'cubage_factor'),
    dispatch_fee: parseNum(o, 'dispatch_fee'),
    accepts_dangerous_goods: parseBool(o, 'accepts_dangerous_goods'),
    is_active: parseBool(o, 'is_active', 'IsActive'),
    alerts: Array.isArray(alerts) ? alerts.map(String) : [],
    vehicles: Array.isArray(vehicles) ? vehicles.map(parseVehicle) : [],
    service_areas: Array.isArray(areas) ? areas.map(parseArea) : [],
  };
  if (perf && typeof perf === 'object') {
    const p = unwrapObject(perf);
    out.performance = {
      occurrences: parseNum(p, 'occurrences', 'Ocorrencias'),
      failures: parseNum(p, 'failures'),
      average_delay_days: parseNum(p, 'average_delay_days', 'AtrasoMedio'),
      total_cost_impact: parseNum(p, 'total_cost_impact', 'CustoTotal'),
      last_occurrence_date: optStr(p, 'last_occurrence_date', 'UltimaData'),
      since: parseStr(p, 'since', 'Desde'),
    };
  }
  return out;
}

function parseOccurrence(raw: unknown): CarrierOccurrenceDTO {
  const o = unwrapObject(raw);
  return {
    id: optNum(o, 'id', 'ID'),
    carrier_id: optNum(o, 'carrier_id', 'CarrierID'),
    occurrence_date: parseStr(o, 'occurrence_date', 'OccurrenceDate'),
    occurrence_type: parseStr(o, 'occurrence_type', 'OccurrenceType'),
    sales_order_code: optNum(o, 'sales_order_code', 'SalesOrderCode'),
    shipment_code: optNum(o, 'shipment_code'),
    delay_days: parseNum(o, 'delay_days', 'DelayDays'),
    cost_impact: parseNum(o, 'cost_impact', 'CostImpact'),
    description: optStr(o, 'description', 'Description'),
  };
}

function parseQuote(raw: unknown): FreightQuoteDTO {
  const o = unwrapObject(raw);
  const alerts = o['alerts'] ?? o['Alertas'];
  return {
    carrier_id: parseNum(o, 'carrier_id', 'CarrierID'),
    supplier_code: parseNum(o, 'supplier_code', 'SupplierCode'),
    supplier_name: parseStr(o, 'supplier_name', 'SupplierName'),
    modal: parseStr(o, 'modal', 'Modal'),
    modal_label: parseStr(o, 'modal_label', 'ModalLabel'),
    service_area_id: optNum(o, 'service_area_id', 'RegiaoID'),
    service_area: parseStr(o, 'service_area', 'RegiaoDescricao'),
    charged_weight_kg: parseNum(o, 'charged_weight_kg'),
    cubed_weight_applied: parseBool(o, 'cubed_weight_applied'),
    dispatch_fee_value: parseNum(o, 'dispatch_fee_value'),
    weight_value: parseNum(o, 'weight_value', 'ValorPorPeso'),
    ad_valorem_value: parseNum(o, 'ad_valorem_value', 'ValorAdValorem'),
    gris_value: parseNum(o, 'gris_value', 'ValorGris'),
    toll_value: parseNum(o, 'toll_value', 'ValorPedagio'),
    minimum_applied: parseBool(o, 'minimum_applied', 'PisoAplicado'),
    total: parseNum(o, 'total', 'Total'),
    lead_days: parseNum(o, 'lead_days', 'PrazoDias'),
    estimated_delivery: parseStr(o, 'estimated_delivery', 'PrevisaoEntrega'),
    alerts: Array.isArray(alerts) ? alerts.map(String) : [],
    blocking: Array.isArray(o['blocking']) ? (o['blocking'] as unknown[]).map(String) : [],
  };
}

export async function listShippingCarriers(filtros?: { q?: string; uf?: string; modal?: string; onlyActive?: boolean }): Promise<ShippingCarrierDTO[]> {
  const params: Record<string, string> = {};
  if (filtros?.q) params.q = filtros.q;
  if (filtros?.uf) params.uf = filtros.uf;
  if (filtros?.modal) params.modal = filtros.modal;
  if (filtros?.onlyActive) params.only_active = 'true';
  const { data } = await httpClient.get(BASE, { params });
  return unwrapArray(data).map(parseCarrier);
}

export async function getShippingCarrier(id: number): Promise<ShippingCarrierDTO> {
  const { data } = await httpClient.get(`${BASE}/${id}`);
  return parseCarrier(data);
}

/** "Este fornecedor já é transportadora?" — usado pela tela de fornecedor. */
export async function getShippingCarrierBySupplier(supplierCode: number): Promise<ShippingCarrierDTO> {
  const { data } = await httpClient.get(`${BASE}/supplier/${supplierCode}`);
  return parseCarrier(data);
}

/** Frota e regiões são enviadas inteiras: o backend substitui o que está gravado. */
export async function createShippingCarrier(dto: ShippingCarrierDTO): Promise<ShippingCarrierDTO> {
  const { data } = await httpClient.post(BASE, dto);
  return parseCarrier(data);
}

export async function updateShippingCarrier(id: number, dto: ShippingCarrierDTO): Promise<ShippingCarrierDTO> {
  const { data } = await httpClient.put(`${BASE}/${id}`, dto);
  return parseCarrier(data);
}

export async function setShippingCarrierStatus(id: number, isActive: boolean): Promise<void> {
  await httpClient.patch(`${BASE}/${id}/status`, { is_active: isActive });
}

/** Onde a transportadora está gravada — a tela consulta antes de oferecer excluir ou inativar. */
export async function getShippingCarrierUsage(id: number): Promise<CarrierUsageDTO> {
  const { data } = await httpClient.get(`${BASE}/${id}/usage`);
  const o = unwrapObject(data);
  const docs = o['documents'];
  return {
    documents: Array.isArray(docs) ? docs.map((d) => {
      const x = unwrapObject(d);
      return { document: parseStr(x, 'document'), total: parseNum(x, 'total'), open: parseNum(x, 'open') };
    }) : [],
    can_delete: parseBool(o, 'can_delete'),
    can_deactivate: parseBool(o, 'can_deactivate'),
  };
}

/** Só apaga transportadora nunca usada; com histórico, o caminho é inativar. */
export async function deleteShippingCarrier(id: number): Promise<void> {
  await httpClient.delete(`${BASE}/${id}`);
}

// ─── Cadastros de apoio ───────────────────────────────────────────────────────

function parseVehicleType(raw: unknown): VehicleTypeDTO {
  const o = unwrapObject(raw);
  return {
    id: optNum(o, 'id'), code: parseStr(o, 'code'), description: parseStr(o, 'description'),
    wheel_type: optStr(o, 'wheel_type'), body_type: optStr(o, 'body_type'), axles: optNum(o, 'axles'),
    capacity_kg: parseNum(o, 'capacity_kg'), capacity_m3: parseNum(o, 'capacity_m3'),
    is_active: parseBool(o, 'is_active'), in_use: parseNum(o, 'in_use'),
  };
}

function parseOccurrenceType(raw: unknown): OccurrenceTypeDTO {
  const o = unwrapObject(raw);
  return {
    id: optNum(o, 'id'), code: parseStr(o, 'code'), description: parseStr(o, 'description'),
    counts_as_failure: parseBool(o, 'counts_as_failure'), is_active: parseBool(o, 'is_active'), in_use: parseNum(o, 'in_use'),
  };
}

export async function listVehicleTypes(): Promise<VehicleTypeDTO[]> {
  const { data } = await httpClient.get(`${BASE}/vehicle-types`);
  return unwrapArray(data).map(parseVehicleType);
}

export async function saveVehicleType(dto: VehicleTypeDTO): Promise<void> {
  if (dto.id) await httpClient.put(`${BASE}/vehicle-types/${dto.id}`, dto);
  else await httpClient.post(`${BASE}/vehicle-types`, dto);
}

export async function deleteVehicleType(id: number): Promise<void> {
  await httpClient.delete(`${BASE}/vehicle-types/${id}`);
}

/** A empresa sem nenhum tipo recebe os padrões (atraso, avaria, extravio…) na primeira consulta. */
export async function listOccurrenceTypes(): Promise<OccurrenceTypeDTO[]> {
  const { data } = await httpClient.get(`${BASE}/occurrence-types`);
  return unwrapArray(data).map(parseOccurrenceType);
}

export async function saveOccurrenceType(dto: OccurrenceTypeDTO): Promise<void> {
  if (dto.id) await httpClient.put(`${BASE}/occurrence-types/${dto.id}`, dto);
  else await httpClient.post(`${BASE}/occurrence-types`, dto);
}

export async function deleteOccurrenceType(id: number): Promise<void> {
  await httpClient.delete(`${BASE}/occurrence-types/${id}`);
}

export async function listCarrierOccurrences(id: number, limit = 100): Promise<CarrierOccurrenceDTO[]> {
  const { data } = await httpClient.get(`${BASE}/${id}/occurrences`, { params: { limit: String(limit) } });
  return unwrapArray(data).map(parseOccurrence);
}

export async function createCarrierOccurrence(id: number, dto: CarrierOccurrenceDTO): Promise<CarrierOccurrenceDTO> {
  const { data } = await httpClient.post(`${BASE}/${id}/occurrences`, dto);
  return parseOccurrence(data);
}

/**
 * Compara o frete das transportadoras ativas que atendem o destino: a mais
 * barata primeiro e a mais rápida marcada. Quem não atende volta em
 * `not_served_by` — é informação, não erro.
 */
export async function quoteFreight(params: { uf?: string; city?: string; cep?: string; weightKg?: number; volumeM3?: number; cargoValue?: number; baseDate?: string; dangerous?: boolean }): Promise<FreightComparisonDTO> {
  const query: Record<string, string> = {};
  if (params.dangerous) query.dangerous = 'true';
  if (params.uf) query.uf = params.uf;
  if (params.city) query.city = params.city;
  if (params.cep) query.cep = params.cep;
  if (params.weightKg !== undefined) query.weight_kg = String(params.weightKg);
  if (params.volumeM3 !== undefined) query.volume_m3 = String(params.volumeM3);
  if (params.cargoValue !== undefined) query.cargo_value = String(params.cargoValue);
  if (params.baseDate) query.base_date = params.baseDate;
  const { data } = await httpClient.get(`${BASE}/quote`, { params: query });
  const o = unwrapObject(data);
  const quotes = o['quotes'] ?? o['Cotacoes'];
  const notServed = o['not_served_by'] ?? o['NaoAtendem'];
  return {
    destination: parseStr(o, 'destination', 'Destino'),
    weight_kg: parseNum(o, 'weight_kg', 'PesoKg'),
    cargo_value: parseNum(o, 'cargo_value', 'ValorCarga'),
    cheapest_carrier_id: optNum(o, 'cheapest_carrier_id', 'MaisBarata'),
    fastest_carrier_id: optNum(o, 'fastest_carrier_id', 'MaisRapida'),
    quotes: Array.isArray(quotes) ? quotes.map(parseQuote) : [],
    not_served_by: Array.isArray(notServed) ? notServed.map(String) : [],
  };
}

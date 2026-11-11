import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';
import { downloadBlob } from '@/services/fileDownload';

const BASE = '/api/shipments';

/**
 * Romaneio de Expedição — `/api/shipments` (migrations 000146/000167/000169).
 * Padrão outbound delivery (SAP): separação → conferência → packing → despacho.
 * A baixa de estoque é FISCAL (NF-e de saída); o romaneio apenas RESERVA.
 *
 * Status: OPEN → SEPARATED → CONFERRED → SHIPPED (CANCELLED).
 * `created_by`/`updated_by` vêm do JWT (nunca do corpo).
 *
 * ⚠️ A build demo (localhost:5072) é anterior à migration 000169: `/separate`,
 * `/{code}/items/confer`, `/transport`, `/volumes`, `/events`, `/nfe-link` retornam
 * 404. `auto-fill/*`, `export/pdf|xlsx`, filtros de `GET /` e o CRUD base funcionam.
 * O serviço segue a DOC (contrato de produção).
 */
export type ShipmentRefType = 'SALES_ORDER' | 'PURCHASE_ORDER' | 'PRODUCTION_ORDER';
export const REFERENCE_TYPES: ShipmentRefType[] = ['SALES_ORDER', 'PURCHASE_ORDER', 'PRODUCTION_ORDER'];

export type FreightModality = 'CIF' | 'FOB' | 'TERCEIROS' | 'SEM_FRETE';
export const FREIGHT_MODALITIES: FreightModality[] = ['CIF', 'FOB', 'TERCEIROS', 'SEM_FRETE'];

export type PackageType = 'CAIXA' | 'PALLET' | 'FARDO' | 'ENGRADADO' | 'BOBINA' | 'SACO' | 'TAMBOR' | 'AMARRADO';
export const PACKAGE_TYPES: PackageType[] = ['CAIXA', 'PALLET', 'FARDO', 'ENGRADADO', 'BOBINA', 'SACO', 'TAMBOR', 'AMARRADO'];

export interface ShipmentDTO {
  code?: number;
  id?: number;
  reference_type?: ShipmentRefType;
  sales_order_code?: number;
  purchase_order_code?: number;
  production_order_code?: number;
  carrier_code?: number;
  status?: string;
  total_volumes?: number;
  total_net_weight?: number;
  total_gross_weight?: number;
  total_cubage_m3?: number;
  freight_modality?: FreightModality;
  freight_value?: number;
  insurance_value?: number;
  vehicle_plate?: string;
  driver_name?: string;
  driver_document?: string;
  antt_code?: string;
  seals?: string;
  estimated_delivery?: string;
  fiscal_exit_id?: number;
  nfe_number?: string;
  nfe_key?: string;
  notes?: string;
}

export interface ShipmentItemDTO {
  id?: number;
  item_code: string;
  quantity: number;
  conferred_qty?: number;
  is_conferred?: boolean;
  has_divergence?: boolean;
  unit_net_weight?: number;
  unit_gross_weight?: number;
  warehouse_id?: number;
}

export interface ShipmentVolumeDTO {
  id?: number;
  volume_number: number;
  package_type: PackageType;
  net_weight?: number;
  gross_weight?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  cubage_m3?: number;
  marking?: string;
  contents?: string;
}

export interface ShipmentEventDTO {
  event: string;
  note?: string;
  created_by?: string;
  created_at?: string;
}

export interface TransportDTO {
  freight_modality?: FreightModality;
  freight_value?: number;
  insurance_value?: number;
  vehicle_plate?: string;
  driver_name?: string;
  driver_document?: string;
  antt_code?: string;
  seals?: string;
  estimated_delivery?: string;
}

export interface ShipmentFilter {
  status?: string;
  carrier_code?: number;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

function parseShipment(raw: unknown): ShipmentDTO {
  const o = unwrapObject(raw);
  return {
    code: parseNum(o, 'code', 'Code'),
    id: parseNum(o, 'id', 'ID'),
    reference_type: (parseStr(o, 'reference_type', 'ReferenceType') || undefined) as ShipmentRefType | undefined,
    sales_order_code: parseNum(o, 'sales_order_code', 'SalesOrderCode') || undefined,
    purchase_order_code: parseNum(o, 'purchase_order_code', 'PurchaseOrderCode') || undefined,
    production_order_code: parseNum(o, 'production_order_code', 'ProductionOrderCode') || undefined,
    carrier_code: parseNum(o, 'carrier_code', 'CarrierCode') || undefined,
    status: parseStr(o, 'status', 'Status'),
    total_volumes: parseNum(o, 'total_volumes', 'TotalVolumes'),
    total_net_weight: parseNum(o, 'total_net_weight', 'total_weight', 'TotalNetWeight'),
    total_gross_weight: parseNum(o, 'total_gross_weight', 'TotalGrossWeight'),
    total_cubage_m3: parseNum(o, 'total_cubage_m3', 'TotalCubageM3'),
    freight_modality: (parseStr(o, 'freight_modality', 'FreightModality') || undefined) as FreightModality | undefined,
    freight_value: parseNum(o, 'freight_value', 'FreightValue'),
    insurance_value: parseNum(o, 'insurance_value', 'InsuranceValue'),
    vehicle_plate: parseStr(o, 'vehicle_plate', 'VehiclePlate') || undefined,
    driver_name: parseStr(o, 'driver_name', 'DriverName') || undefined,
    antt_code: parseStr(o, 'antt_code', 'AnttCode') || undefined,
    seals: parseStr(o, 'seals', 'Seals') || undefined,
    estimated_delivery: parseStr(o, 'estimated_delivery', 'EstimatedDelivery') || undefined,
    nfe_number: parseStr(o, 'nfe_number', 'NfeNumber') || undefined,
    nfe_key: parseStr(o, 'nfe_key', 'NfeKey') || undefined,
  };
}
function parseItem(raw: unknown): ShipmentItemDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID', 'shipment_item_id'),
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    quantity: parseNum(o, 'quantity', 'Quantity'),
    conferred_qty: parseNum(o, 'conferred_qty', 'ConferredQty'),
    is_conferred: parseBool(o, 'is_conferred', 'IsConferred'),
    has_divergence: parseBool(o, 'has_divergence', 'HasDivergence'),
    unit_net_weight: parseNum(o, 'unit_net_weight', 'UnitNetWeight') || undefined,
    unit_gross_weight: parseNum(o, 'unit_gross_weight', 'UnitGrossWeight') || undefined,
    warehouse_id: parseNum(o, 'warehouse_id', 'WarehouseID') || undefined,
  };
}
function parseVolume(raw: unknown): ShipmentVolumeDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    volume_number: parseNum(o, 'volume_number', 'VolumeNumber'),
    package_type: (parseStr(o, 'package_type', 'PackageType') || 'CAIXA') as PackageType,
    net_weight: parseNum(o, 'net_weight', 'NetWeight') || undefined,
    gross_weight: parseNum(o, 'gross_weight', 'GrossWeight') || undefined,
    length_cm: parseNum(o, 'length_cm', 'LengthCm') || undefined,
    width_cm: parseNum(o, 'width_cm', 'WidthCm') || undefined,
    height_cm: parseNum(o, 'height_cm', 'HeightCm') || undefined,
    cubage_m3: parseNum(o, 'cubage_m3', 'CubageM3') || undefined,
    marking: parseStr(o, 'marking', 'Marking') || undefined,
    contents: parseStr(o, 'contents', 'Contents') || undefined,
  };
}
function parseEvent(raw: unknown): ShipmentEventDTO {
  const o = unwrapObject(raw);
  return {
    event: parseStr(o, 'event', 'Event'),
    note: parseStr(o, 'note', 'Note') || undefined,
    created_by: parseStr(o, 'created_by', 'CreatedBy') || undefined,
    created_at: parseStr(o, 'created_at', 'CreatedAt') || undefined,
  };
}

// ── Cadastro, itens, detalhe ──
export async function listShipments(filter?: ShipmentFilter): Promise<ShipmentDTO[]> {
  const { data } = await httpClient.get(`${BASE}/`, { params: filter });
  return unwrapArray(data).map(parseShipment);
}
/** Detalhe cru (compat). */
export async function getShipment(code: number): Promise<Obj> {
  const { data } = await httpClient.get(`${BASE}/${code}`);
  return unwrapObject(data);
}
/** Detalhe tipado: cabeçalho + itens + volumes (quando presentes). */
export async function getShipmentDetail(code: number): Promise<{ shipment: ShipmentDTO; items: ShipmentItemDTO[]; volumes: ShipmentVolumeDTO[] }> {
  const { data } = await httpClient.get(`${BASE}/${code}`);
  const o = unwrapObject(data);
  const shipment = parseShipment(o['shipment'] ?? o['Shipment'] ?? o);
  return {
    shipment,
    items: unwrapArray(o['items'] ?? o['Items']).map(parseItem),
    volumes: unwrapArray(o['volumes'] ?? o['Volumes']).map(parseVolume),
  };
}
export async function createShipment(dto: ShipmentDTO): Promise<ShipmentDTO> {
  const { data } = await httpClient.post(`${BASE}/`, dto);
  return parseShipment(data);
}
export async function addShipmentItem(code: number, item: ShipmentItemDTO): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${code}/items`, item);
  return unwrapObject(data);
}
export async function conferItem(code: number, itemId: number, conferredQty: number): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/${code}/items/confer`, { item_id: itemId, conferred_qty: conferredQty });
  return unwrapObject(data);
}

// ── Ciclo de vida ──
export async function separateShipment(code: number): Promise<void> {
  await httpClient.post(`${BASE}/${code}/separate`, {});
}
export async function conferShipment(code: number): Promise<void> {
  await httpClient.post(`${BASE}/${code}/confer`, {});
}
export async function shipShipment(code: number, acceptDivergences = false): Promise<void> {
  await httpClient.post(`${BASE}/${code}/ship`, { accept_divergences: acceptDivergences });
}
export async function cancelShipment(code: number, reason?: string): Promise<void> {
  await httpClient.post(`${BASE}/${code}/cancel`, { reason: reason ?? '' });
}

// ── Transporte, volumes, NF-e, auditoria ──
export async function updateTransport(code: number, dto: TransportDTO): Promise<void> {
  await httpClient.put(`${BASE}/${code}/transport`, dto);
}
export async function addVolume(code: number, vol: ShipmentVolumeDTO): Promise<ShipmentVolumeDTO> {
  const { data } = await httpClient.post(`${BASE}/${code}/volumes`, vol);
  return parseVolume(data);
}
export async function listVolumes(code: number): Promise<ShipmentVolumeDTO[]> {
  const { data } = await httpClient.get(`${BASE}/${code}/volumes`);
  return unwrapArray(data).map(parseVolume);
}
export async function deleteVolume(code: number, volumeId: number): Promise<void> {
  await httpClient.delete(`${BASE}/${code}/volumes/${volumeId}`);
}
export async function linkNfe(code: number, dto: { fiscal_exit_id?: number; nfe_number?: string; nfe_key?: string }): Promise<void> {
  await httpClient.post(`${BASE}/${code}/nfe-link`, dto);
}
export async function listEvents(code: number): Promise<ShipmentEventDTO[]> {
  const { data } = await httpClient.get(`${BASE}/${code}/events`);
  return unwrapArray(data).map(parseEvent);
}

// ── Auto-fill ──
export async function autoFillSalesOrder(salesOrderCode: number): Promise<ShipmentDTO> {
  const { data } = await httpClient.post(`${BASE}/auto-fill/sales-order`, { sales_order_code: salesOrderCode });
  return parseShipment(data);
}
export async function autoFillPurchaseOrder(purchaseOrderCode: number): Promise<ShipmentDTO> {
  const { data } = await httpClient.post(`${BASE}/auto-fill/purchase-order`, { purchase_order_code: purchaseOrderCode });
  return parseShipment(data);
}
export async function autoFillProductionOrder(productionOrderCode: number): Promise<ShipmentDTO> {
  const { data } = await httpClient.post(`${BASE}/auto-fill/production-order`, { production_order_code: productionOrderCode });
  return parseShipment(data);
}

// ── Exportação (download binário autenticado) ──
async function downloadExport(code: number, fmt: 'pdf' | 'xlsx'): Promise<void> {
  const { data } = await httpClient.get(`${BASE}/${code}/export/${fmt}`, { responseType: 'blob' });
  downloadBlob(data as Blob, `romaneio_${code}.${fmt}`);
}
export const exportShipmentPdf = (code: number) => downloadExport(code, 'pdf');
export const exportShipmentXlsx = (code: number) => downloadExport(code, 'xlsx');

// ── Cargas (agrupam romaneios para veículo, rota e caixa de despacho) ──
// Eram as rotinas genéricas VEXP0110/VPLC0200 e VEXP0120/VPLC0211; agora são a
// aba Cargas da VEXP0100.
export type LoadStatus = 'PLANNED' | 'RELEASED' | 'LOADING' | 'LOADED' | 'SHIPPED' | 'CANCELLED';
export const LOAD_STATUS_LABEL: Record<LoadStatus, string> = {
  PLANNED: 'Planejada', RELEASED: 'Liberada', LOADING: 'Carregando', LOADED: 'Carregada', SHIPPED: 'Despachada', CANCELLED: 'Cancelada',
};
export interface LoadDTO {
  code: number; status: LoadStatus; description?: string; carrier_code?: number; vehicle_plate?: string; driver_name?: string;
  driver_document?: string; route_code?: string; origin?: string; destination?: string; dispatch_box_code?: string;
  planned_ship_date?: string; estimated_delivery?: string; notes?: string;
  total_shipments: number; total_fiscal_notes: number; total_volumes: number; total_gross_weight: number;
  shipments: { shipment_code: number; sequence: number }[];
  fiscal_notes: { fiscal_exit_id: number; nfe_number?: number; shipment_code?: number }[];
  instructions: DeliveryInstructionDTO[];
}
export interface DeliveryInstructionDTO { id?: number; load_code?: number; customer_id?: number; title: string; instruction: string; priority: number; active?: boolean }
export interface DispatchBoxDTO { code: string; description?: string; zone?: string; active: boolean; current_load?: number }

function parseLoad(raw: unknown): LoadDTO {
  const o = unwrapObject(raw);
  const s = (k: string) => parseStr(o, k) || undefined;
  return {
    code: parseNum(o, 'code'), status: (parseStr(o, 'status') || 'PLANNED') as LoadStatus, description: s('description'),
    carrier_code: parseNum(o, 'carrier_code') || undefined, vehicle_plate: s('vehicle_plate'), driver_name: s('driver_name'),
    driver_document: s('driver_document'), route_code: s('route_code'), origin: s('origin'), destination: s('destination'),
    dispatch_box_code: s('dispatch_box_code'), planned_ship_date: s('planned_ship_date')?.slice(0, 10),
    estimated_delivery: s('estimated_delivery')?.slice(0, 10), notes: s('notes'),
    total_shipments: parseNum(o, 'total_shipments'), total_fiscal_notes: parseNum(o, 'total_fiscal_notes'),
    total_volumes: parseNum(o, 'total_volumes'), total_gross_weight: parseNum(o, 'total_gross_weight'),
    shipments: unwrapArray(o['shipments']).map(unwrapObject).map((x) => ({ shipment_code: parseNum(x, 'shipment_code'), sequence: parseNum(x, 'sequence') })),
    fiscal_notes: unwrapArray(o['fiscal_notes']).map(unwrapObject).map((x) => ({ fiscal_exit_id: parseNum(x, 'fiscal_exit_id'), nfe_number: parseNum(x, 'nfe_number') || undefined, shipment_code: parseNum(x, 'shipment_code') || undefined })),
    instructions: unwrapArray(o['instructions']).map(parseInstruction),
  };
}
function parseInstruction(raw: unknown): DeliveryInstructionDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id') || undefined, load_code: parseNum(o, 'load_code') || undefined, customer_id: parseNum(o, 'customer_id') || undefined,
    title: parseStr(o, 'title'), instruction: parseStr(o, 'instruction'), priority: parseNum(o, 'priority'), active: o['active'] !== false,
  };
}
export async function listLoads(status?: string): Promise<LoadDTO[]> {
  const { data } = await httpClient.get(`${BASE}/loads`, { params: status ? { status } : undefined });
  return unwrapArray(data).map(parseLoad);
}
export async function getLoad(code: number): Promise<LoadDTO> {
  const { data } = await httpClient.get(`${BASE}/loads/${code}`);
  return parseLoad(data);
}
export async function createLoad(dto: Partial<LoadDTO>): Promise<LoadDTO> {
  const vazio = (v?: string) => (v && v.trim() ? v.trim() : undefined);
  const { data } = await httpClient.post(`${BASE}/loads`, {
    description: vazio(dto.description), carrier_code: dto.carrier_code || undefined, vehicle_plate: vazio(dto.vehicle_plate),
    driver_name: vazio(dto.driver_name), driver_document: vazio(dto.driver_document), route_code: vazio(dto.route_code),
    origin: vazio(dto.origin), destination: vazio(dto.destination), dispatch_box_code: vazio(dto.dispatch_box_code),
    planned_ship_date: vazio(dto.planned_ship_date), estimated_delivery: vazio(dto.estimated_delivery), notes: vazio(dto.notes),
  });
  return parseLoad(data);
}
export async function addShipmentToLoad(loadCode: number, shipmentCode: number, sequence: number): Promise<void> {
  await httpClient.post(`${BASE}/loads/${loadCode}/shipments`, { shipment_code: shipmentCode, sequence });
}
export async function removeShipmentFromLoad(loadCode: number, shipmentCode: number): Promise<void> {
  await httpClient.delete(`${BASE}/loads/${loadCode}/shipments/${shipmentCode}`);
}
export async function addFiscalNoteToLoad(loadCode: number, fiscalExitId: number, sequence: number, shipmentCode?: number): Promise<void> {
  await httpClient.post(`${BASE}/loads/${loadCode}/fiscal-notes`, { fiscal_exit_id: fiscalExitId, sequence, shipment_code: shipmentCode });
}
export type LoadAction = 'release' | 'start-loading' | 'finish-loading' | 'ship' | 'cancel';
export async function advanceLoad(loadCode: number, action: LoadAction): Promise<void> {
  await httpClient.post(`${BASE}/loads/${loadCode}/${action}`, {});
}
export async function assignBoxToLoad(loadCode: number, boxCode: string): Promise<void> {
  await httpClient.post(`${BASE}/loads/${loadCode}/box`, { box_code: boxCode });
}
/** Romaneio → carga em que está (o romaneio não traz a carga; o monitor de separação traz). */
export async function shipmentsInLoads(): Promise<Map<number, number>> {
  const { data } = await httpClient.get(`${BASE}/loads/separation-monitor`);
  const out = new Map<number, number>();
  for (const r of unwrapArray(data).map(unwrapObject)) {
    if (parseStr(r, 'load_status') !== 'CANCELLED') out.set(parseNum(r, 'shipment_code'), parseNum(r, 'load_code'));
  }
  return out;
}
export async function listDeliveryInstructions(loadCode: number): Promise<DeliveryInstructionDTO[]> {
  const { data } = await httpClient.get(`${BASE}/delivery-instructions`, { params: { load_code: loadCode, active_only: true } });
  return unwrapArray(data).map(parseInstruction);
}
export async function createDeliveryInstruction(dto: DeliveryInstructionDTO): Promise<void> {
  await httpClient.post(`${BASE}/delivery-instructions`, { load_code: dto.load_code, customer_id: dto.customer_id || undefined, title: dto.title.trim(), instruction: dto.instruction.trim(), priority: dto.priority || 0 });
}
export async function listDispatchBoxes(): Promise<DispatchBoxDTO[]> {
  const { data } = await httpClient.get(`${BASE}/dispatch-boxes`, { params: { active_only: true } });
  return unwrapArray(data).map(unwrapObject).map((o) => ({
    code: parseStr(o, 'code'), description: parseStr(o, 'description') || undefined, zone: parseStr(o, 'zone') || undefined,
    active: o['active'] !== false, current_load: parseNum(o, 'current_load') || undefined,
  }));
}
export async function createDispatchBox(dto: { code: string; description?: string; zone?: string }): Promise<void> {
  await httpClient.post(`${BASE}/dispatch-boxes`, { code: dto.code.trim(), description: dto.description?.trim() || undefined, zone: dto.zone?.trim() || undefined });
}

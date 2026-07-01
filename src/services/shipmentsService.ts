import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

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
  item_code: number;
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
    item_code: parseNum(o, 'item_code', 'ItemCode'),
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
  const url = URL.createObjectURL(data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `romaneio_${code}.${fmt}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
export const exportShipmentPdf = (code: number) => downloadExport(code, 'pdf');
export const exportShipmentXlsx = (code: number) => downloadExport(code, 'xlsx');

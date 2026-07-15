import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject, currentUserId, type Obj } from '@/services/fiscalShared';

const BASE = '/api/quality';

/**
 * Qualidade (Produção §6) — `/api/quality`.
 *
 * Estrutura: **Planos de inspeção** (o que inspecionar e quando: RECEBIMENTO/PROCESSO/
 * EXPEDICAO) → **Características** (pontos medidos, com nominal/tolerâncias) →
 * **Registros** (resultado real por OF/lote, com medições) → **Não-conformidades (NC)**
 * quando algo sai fora do padrão, acompanhadas até a **disposição**.
 *
 * Rotas: planos `/plans`(+`/{id}`, DELETE `/{id}`, `/by-item/{itemCode}`);
 * `/characteristics`; registros `/records`(+`/{id}`, `/by-order/{id}`, `/by-item/{id}`);
 * NCs `/non-conformances`(+`/open`, `/{id}`, `/by-item/{id}`, `/{id}/disposition`).
 * Escritas exigem `created_by` (uuid) — preenchido por `currentUserId()`.
 */

export type PointType = 'RECEBIMENTO' | 'PROCESSO' | 'EXPEDICAO';
export const POINT_TYPES: PointType[] = ['RECEBIMENTO', 'PROCESSO', 'EXPEDICAO'];

export type QualityResult = 'APROVADO' | 'REJEITADO' | 'CONDICIONAL' | 'PENDENTE';
export const QUALITY_RESULTS: QualityResult[] = ['APROVADO', 'REJEITADO', 'CONDICIONAL', 'PENDENTE'];

export type NCSeverity = 'CRITICA' | 'MAIOR' | 'MENOR' | 'OBSERVACAO';
export const NC_SEVERITIES: NCSeverity[] = ['CRITICA', 'MAIOR', 'MENOR', 'OBSERVACAO'];

export type NCDisposition = 'SUCATA' | 'RETRABALHO' | 'APROVADO_CONDICIONAL' | 'DEVOLVIDO';
export const NC_DISPOSITIONS: NCDisposition[] = ['SUCATA', 'RETRABALHO', 'APROVADO_CONDICIONAL', 'DEVOLVIDO'];

export interface CharacteristicDTO {
  id?: number;
  plan_id?: number;
  name: string;
  nominal?: number | null;
  tolerance_upper?: number | null;
  tolerance_lower?: number | null;
  unit?: string | null;
  is_critical?: boolean;
}

export interface InspectionPlanDTO {
  id?: number;
  item_code: number;
  route_operation_id?: number | null;
  point_type: PointType;
  description: string;
  sample_size: number;
  acceptance_level: number;
  instructions?: string | null;
  is_active?: boolean;
  characteristics?: CharacteristicDTO[];
}

export interface MeasurementDTO {
  characteristic_id: number;
  measured_value: number;
  is_conformant: boolean;
}

export interface QualityRecordDTO {
  id?: number;
  plan_id: number;
  production_order_id?: number | null;
  lot?: string | null;
  item_code: number;
  inspected_qty: number;
  approved_qty: number;
  rejected_qty: number;
  result: QualityResult;
  inspector_id?: number | null;
  notes?: string | null;
  measurements?: MeasurementDTO[];
}

export interface NonConformanceDTO {
  id?: number;
  quality_record_id?: number | null;
  production_order_id?: number | null;
  item_code: number;
  lot?: string | null;
  nonconform_qty: number;
  description: string;
  severity: NCSeverity;
  disposition?: string | null;
  status?: string;
}

function parseCharacteristic(raw: unknown): CharacteristicDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    plan_id: parseNum(o, 'plan_id', 'PlanID') || undefined,
    name: parseStr(o, 'name', 'Name'),
    nominal: parseNum(o, 'nominal', 'Nominal'),
    tolerance_upper: parseNum(o, 'tolerance_upper', 'ToleranceUpper'),
    tolerance_lower: parseNum(o, 'tolerance_lower', 'ToleranceLower'),
    unit: parseStr(o, 'unit', 'Unit') || null,
    is_critical: parseBool(o, 'is_critical', 'IsCritical'),
  };
}

function parsePlan(raw: unknown): InspectionPlanDTO {
  const o = unwrapObject(raw);
  const chars = o['characteristics'] ?? o['Characteristics'];
  return {
    id: parseNum(o, 'id', 'ID'),
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    route_operation_id: parseNum(o, 'route_operation_id', 'RouteOperationID') || null,
    point_type: (parseStr(o, 'point_type', 'PointType') || 'PROCESSO') as PointType,
    description: parseStr(o, 'description', 'Description'),
    sample_size: parseNum(o, 'sample_size', 'SampleSize'),
    acceptance_level: parseNum(o, 'acceptance_level', 'AcceptanceLevel'),
    instructions: parseStr(o, 'instructions', 'Instructions') || null,
    is_active: parseBool(o, 'is_active', 'IsActive'),
    characteristics: Array.isArray(chars) ? chars.map(parseCharacteristic) : undefined,
  };
}

function parseRecord(raw: unknown): QualityRecordDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    plan_id: parseNum(o, 'plan_id', 'PlanID'),
    production_order_id: parseNum(o, 'production_order_id', 'ProductionOrderID') || null,
    lot: parseStr(o, 'lot', 'Lot') || null,
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    inspected_qty: parseNum(o, 'inspected_qty', 'InspectedQty'),
    approved_qty: parseNum(o, 'approved_qty', 'ApprovedQty'),
    rejected_qty: parseNum(o, 'rejected_qty', 'RejectedQty'),
    result: (parseStr(o, 'result', 'Result') || 'PENDENTE') as QualityResult,
    inspector_id: parseNum(o, 'inspector_id', 'InspectorID') || null,
    notes: parseStr(o, 'notes', 'Notes') || null,
  };
}

function parseNC(raw: unknown): NonConformanceDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    quality_record_id: parseNum(o, 'quality_record_id', 'QualityRecordID') || null,
    production_order_id: parseNum(o, 'production_order_id', 'ProductionOrderID') || null,
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    lot: parseStr(o, 'lot', 'Lot') || null,
    nonconform_qty: parseNum(o, 'nonconform_qty', 'NonConformQty'),
    description: parseStr(o, 'description', 'Description'),
    severity: (parseStr(o, 'severity', 'Severity') || 'MENOR') as NCSeverity,
    disposition: parseStr(o, 'disposition', 'Disposition') || null,
    status: parseStr(o, 'status', 'Status') || undefined,
  };
}

// ─── Planos de inspeção ────────────────────────────────────────────────────────

export async function getPlan(id: number): Promise<InspectionPlanDTO> {
  const { data } = await httpClient.get(`${BASE}/plans/${id}`);
  return parsePlan(data);
}
export async function listPlansByItem(itemCode: number): Promise<InspectionPlanDTO[]> {
  const { data } = await httpClient.get(`${BASE}/plans/by-item/${itemCode}`);
  return unwrapArray(data).map(parsePlan);
}
export async function createPlan(dto: InspectionPlanDTO): Promise<InspectionPlanDTO> {
  const { data } = await httpClient.post(`${BASE}/plans`, { ...dto, created_by: currentUserId() });
  return parsePlan(data);
}
export async function deactivatePlan(id: number): Promise<void> {
  await httpClient.delete(`${BASE}/plans/${id}`);
}
export async function addCharacteristic(dto: CharacteristicDTO): Promise<CharacteristicDTO> {
  const { data } = await httpClient.post(`${BASE}/characteristics`, dto);
  return parseCharacteristic(data);
}

// ─── Registros de inspeção ─────────────────────────────────────────────────────

export async function getRecord(id: number): Promise<QualityRecordDTO> {
  const { data } = await httpClient.get(`${BASE}/records/${id}`);
  return parseRecord(data);
}
export async function listRecordsByOrder(orderId: number): Promise<QualityRecordDTO[]> {
  const { data } = await httpClient.get(`${BASE}/records/by-order/${orderId}`);
  return unwrapArray(data).map(parseRecord);
}
export async function listRecordsByItem(itemCode: number): Promise<QualityRecordDTO[]> {
  const { data } = await httpClient.get(`${BASE}/records/by-item/${itemCode}`);
  return unwrapArray(data).map(parseRecord);
}
export async function createRecord(dto: QualityRecordDTO): Promise<QualityRecordDTO> {
  const { data } = await httpClient.post(`${BASE}/records`, { ...dto, created_by: currentUserId() });
  return parseRecord(data);
}

// ─── Não-conformidades ─────────────────────────────────────────────────────────

export async function listOpenNCs(): Promise<NonConformanceDTO[]> {
  const { data } = await httpClient.get(`${BASE}/non-conformances/open`);
  return unwrapArray(data).map(parseNC);
}
export async function getNC(id: number): Promise<NonConformanceDTO> {
  const { data } = await httpClient.get(`${BASE}/non-conformances/${id}`);
  return parseNC(data);
}
export async function listNCsByItem(itemCode: number): Promise<NonConformanceDTO[]> {
  const { data } = await httpClient.get(`${BASE}/non-conformances/by-item/${itemCode}`);
  return unwrapArray(data).map(parseNC);
}
export async function createNC(dto: NonConformanceDTO): Promise<NonConformanceDTO> {
  const { data } = await httpClient.post(`${BASE}/non-conformances`, { ...dto, created_by: currentUserId() });
  return parseNC(data);
}
export async function dispositionNC(id: number, disposition: NCDisposition): Promise<Obj> {
  const { data } = await httpClient.post(`${BASE}/non-conformances/${id}/disposition`, { disposition, disposed_by: currentUserId() });
  return unwrapObject(data);
}

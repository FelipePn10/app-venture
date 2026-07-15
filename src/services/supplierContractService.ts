import { httpClient, parseStr, parseNum, currentUserId, unwrapArray, unwrapObject } from '@/services/fiscalShared';

/**
 * Contratos de Fornecedores (`/api/procurement/supplier-contracts`, backend real).
 * Capa (número, status, vigência, moeda, índice de reajuste) + linhas com quantidade
 * contratada/consumida, preço e pedido mínimo. `saldo = contratada − consumida`.
 *
 * Regras do backend: consumir saldo (`/consume`) só em contrato **ACTIVE** e não pode
 * exceder o saldo. Status: DRAFT | ACTIVE | SUSPENDED | CLOSED | CANCELLED.
 * Não existe "tipo de contrato" nem "cancelamento de item" — a baixa de saldo é o
 * `/consume` e o encerramento é uma mudança de status.
 */
const BASE = '/api/procurement/supplier-contracts';

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'CANCELLED';
export const CONTRACT_STATUSES: ContractStatus[] = ['DRAFT', 'ACTIVE', 'SUSPENDED', 'CLOSED', 'CANCELLED'];

export interface ContractItem {
  id?: number;
  item_code: number;
  mask?: string;
  unit?: string;
  contracted_qty: number;
  consumed_qty?: number;
  remaining_qty?: number;
  unit_price: number;
  min_order_qty?: number;
  notes?: string;
}
export interface SupplierContract {
  id?: number;
  enterprise_code: number;
  supplier_code: number;
  contract_number: string;
  description?: string;
  status: ContractStatus;
  currency: string;
  valid_from: string;
  valid_to?: string;
  price_index?: string;
  notes?: string;
  items?: ContractItem[];
}

function parseItem(raw: unknown): ContractItem {
  const o = unwrapObject(raw);
  const contracted = parseNum(o, 'contracted_qty', 'ContractedQty');
  const consumed = parseNum(o, 'consumed_qty', 'ConsumedQty');
  const remaining = parseNum(o, 'remaining_qty', 'RemainingQty') || Math.max(contracted - consumed, 0);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    unit: parseStr(o, 'unit', 'Unit') || undefined,
    contracted_qty: contracted,
    consumed_qty: consumed,
    remaining_qty: remaining,
    unit_price: parseNum(o, 'unit_price', 'UnitPrice'),
    min_order_qty: parseNum(o, 'min_order_qty', 'MinOrderQty'),
    notes: parseStr(o, 'notes', 'Notes') || undefined,
  };
}
function parseContract(raw: unknown): SupplierContract {
  const o = unwrapObject(raw);
  const items = o['items'] ?? o['Items'];
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    enterprise_code: parseNum(o, 'enterprise_code', 'EnterpriseCode'),
    supplier_code: parseNum(o, 'supplier_code', 'SupplierCode'),
    contract_number: parseStr(o, 'contract_number', 'ContractNumber'),
    description: parseStr(o, 'description', 'Description') || undefined,
    status: (parseStr(o, 'status', 'Status') || 'DRAFT') as ContractStatus,
    currency: parseStr(o, 'currency', 'Currency') || 'BRL',
    valid_from: parseStr(o, 'valid_from', 'ValidFrom') || undefined,
    valid_to: parseStr(o, 'valid_to', 'ValidTo') || undefined,
    price_index: parseStr(o, 'price_index', 'PriceIndex') || undefined,
    notes: parseStr(o, 'notes', 'Notes') || undefined,
    items: Array.isArray(items) ? items.map(parseItem) : [],
  } as SupplierContract;
}

export async function listContracts(): Promise<SupplierContract[]> {
  const { data } = await httpClient.get(BASE);
  return unwrapArray(data).map(parseContract);
}
export async function getContract(id: number): Promise<SupplierContract> {
  const { data } = await httpClient.get(`${BASE}/${id}`);
  return parseContract(data);
}
export async function createContract(dto: SupplierContract): Promise<SupplierContract> {
  const body = {
    enterprise_code: dto.enterprise_code,
    supplier_code: dto.supplier_code,
    contract_number: dto.contract_number,
    description: dto.description ?? null,
    status: dto.status,
    currency: dto.currency,
    valid_from: dto.valid_from,
    valid_to: dto.valid_to ?? null,
    price_index: dto.price_index ?? null,
    notes: dto.notes ?? null,
    items: (dto.items ?? []).map((i) => ({
      item_code: i.item_code,
      mask: i.mask ?? '',
      unit: i.unit ?? null,
      contracted_qty: i.contracted_qty,
      unit_price: i.unit_price,
      min_order_qty: i.min_order_qty ?? 0,
      notes: i.notes ?? null,
    })),
    created_by: currentUserId(),
  };
  const { data } = await httpClient.post(BASE, body);
  return parseContract(data);
}
/** Muda o status do contrato (encerrar/cancelar/suspender/ativar). */
export async function updateContractStatus(id: number, status: ContractStatus): Promise<SupplierContract> {
  const { data } = await httpClient.patch(`${BASE}/${id}/status`, { status });
  return parseContract(data);
}
/** Consome saldo de uma linha (só em contrato ACTIVE; não pode exceder o saldo). */
export async function consumeContract(id: number, itemCode: number, quantity: number, mask = ''): Promise<SupplierContract> {
  const { data } = await httpClient.post(`${BASE}/${id}/consume`, { item_code: itemCode, mask, quantity });
  return parseContract(data);
}

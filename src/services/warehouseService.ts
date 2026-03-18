import { httpClient } from '@/services/httpClient';
import type { LookupEntity, WarehousePayload, WarehouseResponse } from '@/types/warehouse';

const WAREHOUSE_ENDPOINT = import.meta.env.VITE_WAREHOUSE_ENDPOINT ?? '/almoxarifados';
const CUSTOMER_LOOKUP_PATH = import.meta.env.VITE_CUSTOMER_LOOKUP_PATH ?? '/clientes';
const SUPPLIER_LOOKUP_PATH = import.meta.env.VITE_SUPPLIER_LOOKUP_PATH ?? '/fornecedores';
const ESTABLISHMENT_LOOKUP_PATH = import.meta.env.VITE_ESTABLISHMENT_LOOKUP_PATH ?? '/estabelecimentos';

function mapLookupEntity(value: unknown): LookupEntity | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Record<string, unknown>;
  const codigo = source.codigo ?? source.code ?? source.id;
  const nome = source.nome ?? source.name ?? source.razaoSocial ?? source.descricao;

  if (codigo == null || nome == null) {
    return null;
  }

  return {
    codigo: String(codigo),
    nome: String(nome),
  };
}

function mapWarehouseResponse(data: WarehouseResponse): WarehouseResponse {
  return {
    ...data,
    clientes: Array.isArray(data.clientes) ? data.clientes.map(mapLookupEntity).filter(Boolean) as LookupEntity[] : [],
    fornecedores: Array.isArray(data.fornecedores) ? data.fornecedores.map(mapLookupEntity).filter(Boolean) as LookupEntity[] : [],
  };
}

export async function saveWarehouse(payload: WarehousePayload): Promise<WarehouseResponse> {
  const response = await httpClient.post<WarehouseResponse>(WAREHOUSE_ENDPOINT, payload);
  return mapWarehouseResponse(response.data);
}

export async function fetchWarehouseByCode(codigo: string): Promise<WarehouseResponse | null> {
  const trimmedCode = codigo.trim();
  if (!trimmedCode) {
    return null;
  }

  const response = await httpClient.get<WarehouseResponse>(`${WAREHOUSE_ENDPOINT}/${encodeURIComponent(trimmedCode)}`);
  return mapWarehouseResponse(response.data);
}

export async function lookupCustomer(codigo: string): Promise<LookupEntity> {
  const response = await httpClient.get<unknown>(`${CUSTOMER_LOOKUP_PATH}/${encodeURIComponent(codigo.trim())}`);
  const item = mapLookupEntity(response.data);
  if (!item) {
    throw new Error('Cliente retornado pelo backend em formato inválido.');
  }
  return item;
}

export async function lookupSupplier(codigo: string): Promise<LookupEntity> {
  const response = await httpClient.get<unknown>(`${SUPPLIER_LOOKUP_PATH}/${encodeURIComponent(codigo.trim())}`);
  const item = mapLookupEntity(response.data);
  if (!item) {
    throw new Error('Fornecedor retornado pelo backend em formato inválido.');
  }
  return item;
}

export async function validateEstablishment(codigo: string): Promise<LookupEntity> {
  const response = await httpClient.get<unknown>(`${ESTABLISHMENT_LOOKUP_PATH}/${encodeURIComponent(codigo.trim())}`);
  const item = mapLookupEntity(response.data);
  if (!item) {
    throw new Error('Estabelecimento retornado pelo backend em formato inválido.');
  }
  return item;
}

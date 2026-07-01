import { httpClient } from '@/services/httpClient';
import { parseStr, parseNum, parseBool, unwrapObject, type Obj } from '@/services/fiscalShared';
import type { LookupEntity, WarehousePayload, WarehouseResponse } from '@/types/warehouse';

/**
 * Armazém / Almoxarifado — `/api/warehouse`.
 *
 * A tela VENT0800 trabalha com campos em português (codigo/descricao/localizacao/
 * tipo/disponivel). O backend usa code/description/location/type/disposition, com
 * `location`/`type` em enums maiúsculos. Este serviço faz a tradução em ambos os
 * sentidos para manter a tela inalterada. Os enums seguem `WarehouseType`
 * (NORMAL / LINHA DE PRODUÇÃO) e `LocationType` (INTERNO / EXTERNO / INSPECAO /
 * REJEICAO / RESERVA / TRANSITO / ESPECIAL).
 */

const BASE = '/api/warehouse';
const CUSTOMER_PATH = '/api/customers';
const SUPPLIER_PATH = '/api/suppliers';

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function toLocationEnum(loc: string): string {
  return stripAccents(loc).toUpperCase().replace(/\s+/g, '_');
}
function fromLocationEnum(loc: string): string {
  const map: Record<string, string> = {
    INTERNO: 'Interno', EXTERNO: 'Externo', INSPECAO: 'Inspeção', REJEICAO: 'Rejeição',
    RESERVA: 'Reserva', TRANSITO: 'Trânsito', ESPECIAL: 'Especial', EXPEDICAO: 'Expedição',
    ASSISTENCIA_TECNICA: 'Assistência Técnica',
  };
  return map[loc.toUpperCase()] ?? loc;
}
function toTypeEnum(tipo: string): string {
  return stripAccents(tipo).toLowerCase().startsWith('linha') ? 'LINHA DE PRODUÇÃO' : 'NORMAL';
}
function fromTypeEnum(type: string): string {
  return stripAccents(type).toLowerCase().startsWith('linha') ? 'Linha de Produção' : 'Normal';
}

function toBackendPayload(p: WarehousePayload): Record<string, unknown> {
  return {
    code: p.codigo,
    description: p.descricao,
    location: toLocationEnum(p.localizacao),
    type: toTypeEnum(p.tipo),
    disposition: p.disponivel,
    reservations_allowed: true,
    observation: p.observacao || undefined,
  };
}

function fromBackend(raw: unknown, fallback?: WarehousePayload): WarehouseResponse {
  const o: Obj = unwrapObject(raw);
  return {
    codigo: parseStr(o, 'code', 'Code') || fallback?.codigo || '',
    descricao: parseStr(o, 'description', 'Description') || fallback?.descricao || '',
    localizacao: fromLocationEnum(parseStr(o, 'location', 'Location')) || fallback?.localizacao || 'Interno',
    tipo: fromTypeEnum(parseStr(o, 'type', 'Type')) || fallback?.tipo || 'Normal',
    disponivel: o['disposition'] !== undefined ? parseBool(o, 'disposition', 'Disposition') : (fallback?.disponivel ?? true),
    almoxExpedicao: fallback?.almoxExpedicao ?? '',
    cliente: fallback?.cliente ?? '',
    estabelecimento: fallback?.estabelecimento ?? '',
    fornecedor: fallback?.fornecedor ?? '',
    observacao: parseStr(o, 'observation', 'Observation') || fallback?.observacao || '',
    clientes: fallback?.clientes ?? [],
    fornecedores: fallback?.fornecedores ?? [],
    id: parseNum(o, 'id', 'ID') || undefined,
  };
}

export async function saveWarehouse(payload: WarehousePayload): Promise<WarehouseResponse> {
  const response = await httpClient.post(`${BASE}/create`, toBackendPayload(payload));
  return fromBackend(response.data, payload);
}

export async function fetchWarehouseByCode(codigo: string): Promise<WarehouseResponse | null> {
  const trimmed = codigo.trim();
  if (!trimmed) return null;
  const response = await httpClient.get(`${BASE}/${encodeURIComponent(trimmed)}`);
  if (!response.data) return null;
  return fromBackend(response.data);
}

async function lookupEntity(base: string, codigo: string, kind: string): Promise<LookupEntity> {
  const response = await httpClient.get<unknown>(`${base}/${encodeURIComponent(codigo.trim())}`);
  const o = unwrapObject(response.data);
  const cod = parseStr(o, 'code', 'Code', 'id', 'ID');
  const nome = parseStr(o, 'name', 'Name', 'razao_social', 'description');
  if (!cod) throw new Error(`${kind} retornado pelo backend em formato inválido.`);
  return { codigo: cod, nome };
}

export async function lookupCustomer(codigo: string): Promise<LookupEntity> {
  return lookupEntity(CUSTOMER_PATH, codigo, 'Cliente');
}
export async function lookupSupplier(codigo: string): Promise<LookupEntity> {
  return lookupEntity(SUPPLIER_PATH, codigo, 'Fornecedor');
}
export async function validateEstablishment(codigo: string): Promise<LookupEntity> {
  // O backend não expõe um cadastro de estabelecimentos separado; valida via empresa/armazém.
  return lookupEntity(BASE, codigo, 'Estabelecimento');
}

import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/location';

// ─── Países ─────────────────────────────────────────────────────────────────

export interface CountryDTO {
  sigla: string;
  name: string;
  ddi?: string;
  bacen_code?: string;
  sis_comex?: string;
  is_active?: boolean;
}

function parseCountry(raw: unknown): CountryDTO {
  const o = unwrapObject(raw);
  return {
    sigla: parseStr(o, 'sigla', 'Sigla'),
    name: parseStr(o, 'name', 'Name'),
    ddi: parseStr(o, 'ddi', 'Ddi', 'DDI'),
    bacen_code: parseStr(o, 'bacen_code', 'BacenCode'),
    sis_comex: parseStr(o, 'sis_comex', 'SisComex'),
    is_active: parseBool(o, 'is_active', 'IsActive'),
  };
}

export async function listCountries(includeInactive = false): Promise<CountryDTO[]> {
  const { data } = await httpClient.get(`${BASE}/countries/`, includeInactive ? { params: { only_active: 'false' } } : undefined);
  return unwrapArray(data).map(parseCountry);
}
export async function createCountry(dto: CountryDTO): Promise<CountryDTO> {
  const { data } = await httpClient.post(`${BASE}/countries/`, dto);
  return parseCountry(data);
}
export async function updateCountry(dto: CountryDTO): Promise<CountryDTO> {
  const { data } = await httpClient.put(`${BASE}/countries/`, dto);
  return parseCountry(data);
}
export async function getCountryUfs(sigla: string): Promise<UfDTO[]> {
  const { data } = await httpClient.get(`${BASE}/countries/${encodeURIComponent(sigla)}/ufs`);
  return unwrapArray(data).map(parseUf);
}

// ─── UFs ────────────────────────────────────────────────────────────────────

export interface UfDTO {
  sigla: string;
  name: string;
  country_id?: number;
  ibge_code?: string;
  is_active?: boolean;
}

function parseUf(raw: unknown): UfDTO {
  const o = unwrapObject(raw);
  return {
    sigla: parseStr(o, 'sigla', 'Sigla'),
    name: parseStr(o, 'name', 'Name'),
    country_id: parseNum(o, 'country_id', 'CountryId', 'CountryID'),
    ibge_code: parseStr(o, 'ibge_code', 'IbgeCode'),
    is_active: parseBool(o, 'is_active', 'IsActive'),
  };
}

export async function listUfs(includeInactive = false): Promise<UfDTO[]> {
  const { data } = await httpClient.get(`${BASE}/ufs/`, includeInactive ? { params: { only_active: 'false' } } : undefined);
  return unwrapArray(data).map(parseUf);
}
export async function createUf(dto: UfDTO): Promise<UfDTO> {
  const { data } = await httpClient.post(`${BASE}/ufs/`, dto);
  return parseUf(data);
}
export async function updateUf(dto: UfDTO): Promise<UfDTO> {
  const { data } = await httpClient.put(`${BASE}/ufs/`, dto);
  return parseUf(data);
}

import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject } from '@/services/fiscalShared';

/**
 * Localização — UFs e Países (`/api/location`, backend real).
 * O backend mantém **Países** e **UFs** (com IBGE); **não** há cadastro de municípios/
 * cidades — por isso esta camada cobre UF e País (a antiga "cidade" não existe no ERP).
 */
const UFS = '/api/location/ufs';
const COUNTRIES = '/api/location/countries';

export interface UF {
  id?: number;
  sigla: string;
  name: string;
  country_sigla: string;
  ibge_code?: string;
}
export interface Country {
  id?: number;
  sigla: string;
  name: string;
}

function parseUF(raw: unknown): UF {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    sigla: parseStr(o, 'sigla', 'Sigla'),
    name: parseStr(o, 'name', 'Name'),
    country_sigla: parseStr(o, 'country_sigla', 'CountrySigla'),
    ibge_code: parseStr(o, 'ibge_code', 'IBGECode') || undefined,
  };
}
function parseCountry(raw: unknown): Country {
  const o = unwrapObject(raw);
  return { id: parseNum(o, 'id', 'ID') || undefined, sigla: parseStr(o, 'sigla', 'Sigla'), name: parseStr(o, 'name', 'Name') };
}

// ── UFs ──
export async function listUFs(): Promise<UF[]> {
  const { data } = await httpClient.get(`${UFS}/`);
  return unwrapArray(data).map(parseUF);
}
export async function getUF(sigla: string): Promise<UF> {
  const { data } = await httpClient.get(`${UFS}/${sigla}`);
  return parseUF(data);
}
export async function createUF(dto: UF): Promise<UF> {
  const { data } = await httpClient.post(`${UFS}/`, { sigla: dto.sigla, name: dto.name, country_sigla: dto.country_sigla, ibge_code: dto.ibge_code || null });
  return parseUF(data);
}
export async function updateUF(dto: UF): Promise<UF> {
  const { data } = await httpClient.put(`${UFS}/`, { id: dto.id, sigla: dto.sigla, name: dto.name, country_sigla: dto.country_sigla, ibge_code: dto.ibge_code || null });
  return parseUF(data);
}

// ── Países ──
export async function listCountries(): Promise<Country[]> {
  const { data } = await httpClient.get(`${COUNTRIES}/`);
  return unwrapArray(data).map(parseCountry);
}
export async function listUFsByCountry(sigla: string): Promise<UF[]> {
  const { data } = await httpClient.get(`${COUNTRIES}/${sigla}/ufs`);
  return unwrapArray(data).map(parseUF);
}
export async function createCountry(dto: Country): Promise<Country> {
  const { data } = await httpClient.post(`${COUNTRIES}/`, { sigla: dto.sigla, name: dto.name });
  return parseCountry(data);
}

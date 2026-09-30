import { httpClient, parseStr, parseNum, parseBool, unwrapArray, type Obj } from '@/services/fiscalShared';

const BASE = '/api/fiscal/tabelas';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NcmTaxTable {
  ncm: string;
  aliq_ipi: number;
  aliq_pis: number;
  aliq_cofins: number;
  cst_pis: string;
  cst_cofins: string;
  cst_ipi: string;
  description?: string;
  is_active?: boolean;
}

export interface IcmsInterno {
  uf: string;
  aliq_icms: number;
  aliq_fcp: number;
}

export interface IcmsInterestadual {
  origin_uf: string;
  destination_uf: string;
  aliq_icms: number;
}

// ─── Parsers ────────────────────────────────────────────────────────────────

function parseNcm(raw: unknown): NcmTaxTable | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Obj;
  const ncm = parseStr(o, 'ncm', 'Ncm', 'NCM');
  if (!ncm) return null;
  return {
    ncm,
    aliq_ipi: parseNum(o, 'aliq_ipi', 'AliqIpi'),
    aliq_pis: parseNum(o, 'aliq_pis', 'AliqPis'),
    aliq_cofins: parseNum(o, 'aliq_cofins', 'AliqCofins'),
    cst_pis: parseStr(o, 'cst_pis', 'CstPis'),
    cst_cofins: parseStr(o, 'cst_cofins', 'CstCofins'),
    cst_ipi: parseStr(o, 'cst_ipi', 'CstIpi'),
    description: parseStr(o, 'description', 'Description'),
    is_active: parseBool(o, 'is_active', 'IsActive'),
  };
}

// ─── NCM (IPI/PIS/COFINS) ───────────────────────────────────────────────────

export async function listNcmTaxes(): Promise<NcmTaxTable[]> {
  const { data } = await httpClient.get(`${BASE}/ncm`);
  return unwrapArray(data).map(parseNcm).filter((x): x is NcmTaxTable => x !== null);
}

export async function upsertNcmTax(dto: NcmTaxTable): Promise<NcmTaxTable> {
  const { data } = await httpClient.post(`${BASE}/ncm`, dto);
  return parseNcm(data) ?? dto;
}

export async function deleteNcmTax(ncm: string): Promise<void> {
  await httpClient.delete(`${BASE}/ncm/${encodeURIComponent(ncm)}`);
}

// ─── ICMS interno (GET returns a map { "SP": { ICMS, FCP } }) ────────────────

export async function listIcmsInterno(): Promise<IcmsInterno[]> {
  const { data } = await httpClient.get(`${BASE}/icms-interno`);
  if (!data || typeof data !== 'object') return [];
  const map = data as Obj;
  const rows: IcmsInterno[] = [];
  for (const uf of Object.keys(map)) {
    const v = map[uf];
    if (v && typeof v === 'object') {
      const o = v as Obj;
      rows.push({ uf, aliq_icms: parseNum(o, 'ICMS', 'icms', 'aliq_icms'), aliq_fcp: parseNum(o, 'FCP', 'fcp', 'aliq_fcp') });
    } else {
      rows.push({ uf, aliq_icms: Number(v) || 0, aliq_fcp: 0 });
    }
  }
  return rows.sort((a, b) => a.uf.localeCompare(b.uf));
}

export async function upsertIcmsInterno(dto: IcmsInterno): Promise<void> {
  await httpClient.post(`${BASE}/icms-interno`, dto);
}

// ─── ICMS interestadual (GET returns a map { "PR_SP": 0.12 }) ────────────────

export async function listIcmsInterestadual(): Promise<IcmsInterestadual[]> {
  const { data } = await httpClient.get(`${BASE}/icms-interestadual`);
  if (!data || typeof data !== 'object') return [];
  const map = data as Obj;
  const rows: IcmsInterestadual[] = [];
  for (const key of Object.keys(map)) {
    // Backend keys come as 4-char concatenations (e.g. "PRSP") — the doc shows
    // an underscored "PR_SP" form, so we tolerate both.
    let origin_uf: string;
    let destination_uf: string;
    if (key.includes('_')) {
      [origin_uf, destination_uf] = key.split('_');
    } else {
      origin_uf = key.slice(0, 2);
      destination_uf = key.slice(2);
    }
    rows.push({ origin_uf, destination_uf: destination_uf ?? '', aliq_icms: Number(map[key]) || 0 });
  }
  return rows.sort((a, b) => `${a.origin_uf}${a.destination_uf}`.localeCompare(`${b.origin_uf}${b.destination_uf}`));
}

export async function upsertIcmsInterestadual(dto: IcmsInterestadual): Promise<void> {
  await httpClient.post(`${BASE}/icms-interestadual`, dto);
}

/**
 * As 27 unidades federativas. Domínio fechado: UF é campo de duas letras que a
 * tela oferecia como texto livre, e "Sp", "sp" ou "SPO" gravavam uma alíquota que
 * nenhuma nota encontrava depois — a consulta procura por "SP".
 */
export const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
] as const;
export type UF = (typeof UFS)[number];

/** Nome do estado, para a lista não ser só duas letras. */
export const UF_NAMES: Record<UF, string> = {
  AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapá', BA: 'Bahia',
  CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MG: 'Minas Gerais', MS: 'Mato Grosso do Sul', MT: 'Mato Grosso',
  PA: 'Pará', PB: 'Paraíba', PE: 'Pernambuco', PI: 'Piauí', PR: 'Paraná',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RO: 'Rondônia', RR: 'Roraima',
  RS: 'Rio Grande do Sul', SC: 'Santa Catarina', SE: 'Sergipe',
  SP: 'São Paulo', TO: 'Tocantins',
};

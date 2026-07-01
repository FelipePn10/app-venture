import { httpClient, parseStr, parseNum, unwrapObject, type Obj } from '@/services/fiscalShared';

const BASE = '/api/fiscal/config';

// ─── Types ──────────────────────────────────────────────────────────────────

/** `"1"` Simples · `"2"` Lucro Presumido · `"3"` Lucro Real */
export type RegimeTributario = '1' | '2' | '3';
export type FocusAmbiente = 'homologacao' | 'producao';

export interface FiscalConfig {
  cnpj_empresa: string;
  razao_social: string;
  ie_empresa?: string;
  regime_tributario: RegimeTributario;
  uf_empresa: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  codigo_municipio?: string;
  cep?: string;
  telefone?: string;
  icms_interno_aliquota: number;
  icms_diferimento_percentual: number;
  focus_nfe_token?: string;
  focus_nfe_ambiente: FocusAmbiente;
  juros_mes: number;
  multa_atraso: number;
  vencimento_icms_dia: number;
  vencimento_ipi_dia: number;
  vencimento_pis_cofins_dia: number;
}

// ─── Parser ─────────────────────────────────────────────────────────────────

function parseConfig(raw: unknown): FiscalConfig {
  const o: Obj = unwrapObject(raw);
  const regime = parseStr(o, 'regime_tributario', 'RegimeTributario') || '3';
  const amb = parseStr(o, 'focus_nfe_ambiente', 'FocusNfeAmbiente') || 'homologacao';
  return {
    cnpj_empresa: parseStr(o, 'cnpj_empresa', 'CnpjEmpresa'),
    razao_social: parseStr(o, 'razao_social', 'RazaoSocial'),
    ie_empresa: parseStr(o, 'ie_empresa', 'IeEmpresa'),
    regime_tributario: (['1', '2', '3'].includes(regime) ? regime : '3') as RegimeTributario,
    uf_empresa: parseStr(o, 'uf_empresa', 'UfEmpresa'),
    logradouro: parseStr(o, 'logradouro', 'Logradouro'),
    numero: parseStr(o, 'numero', 'Numero'),
    complemento: parseStr(o, 'complemento', 'Complemento'),
    bairro: parseStr(o, 'bairro', 'Bairro'),
    municipio: parseStr(o, 'municipio', 'Municipio'),
    codigo_municipio: parseStr(o, 'codigo_municipio', 'CodigoMunicipio'),
    cep: parseStr(o, 'cep', 'Cep'),
    telefone: parseStr(o, 'telefone', 'Telefone'),
    icms_interno_aliquota: parseNum(o, 'icms_interno_aliquota', 'IcmsInternoAliquota'),
    icms_diferimento_percentual: parseNum(o, 'icms_diferimento_percentual', 'IcmsDiferimentoPercentual'),
    focus_nfe_token: parseStr(o, 'focus_nfe_token', 'FocusNfeToken'),
    focus_nfe_ambiente: (amb === 'producao' ? 'producao' : 'homologacao') as FocusAmbiente,
    juros_mes: parseNum(o, 'juros_mes', 'JurosMes'),
    multa_atraso: parseNum(o, 'multa_atraso', 'MultaAtraso'),
    vencimento_icms_dia: parseNum(o, 'vencimento_icms_dia', 'VencimentoIcmsDia'),
    vencimento_ipi_dia: parseNum(o, 'vencimento_ipi_dia', 'VencimentoIpiDia'),
    vencimento_pis_cofins_dia: parseNum(o, 'vencimento_pis_cofins_dia', 'VencimentoPisCofinsDia'),
  };
}

// ─── API ────────────────────────────────────────────────────────────────────

export async function getFiscalConfig(): Promise<FiscalConfig> {
  const { data } = await httpClient.get(BASE);
  return parseConfig(data);
}

export async function updateFiscalConfig(cfg: FiscalConfig): Promise<FiscalConfig> {
  const { data } = await httpClient.put(BASE, cfg);
  return parseConfig(data);
}

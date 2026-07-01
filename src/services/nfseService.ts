import { httpClient, parseStr, parseNum, parseBool, unwrapArray, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/fiscal/nfse';

export interface NfseDTO {
  id?: number;
  numero_rps: number;
  serie_rps: string;
  tipo_rps: number;
  data_emissao: string;
  natureza_operacao: number;
  optante_simples: boolean;
  tomador_cnpj_cpf: string;
  tomador_razao_social: string;
  tomador_email?: string;
  tomador_codigo_municipio: string;
  tomador_uf: string;
  item_lista_servico: string;
  codigo_tributario_municipio: string;
  discriminacao: string;
  codigo_municipio: string;
  valor_servicos: number;
  valor_deducoes: number;
  aliquota_iss: number;
  iss_retido: boolean;
  status?: string;
  valor_iss?: number;
  valor_liquido?: number;
  numero_nfse?: string;
  codigo_verificacao?: string;
}

function parseNfse(raw: unknown): NfseDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    numero_rps: parseNum(o, 'numero_rps', 'NumeroRps'),
    serie_rps: parseStr(o, 'serie_rps', 'SerieRps'),
    tipo_rps: parseNum(o, 'tipo_rps', 'TipoRps'),
    data_emissao: parseStr(o, 'data_emissao', 'DataEmissao'),
    natureza_operacao: parseNum(o, 'natureza_operacao', 'NaturezaOperacao'),
    optante_simples: parseBool(o, 'optante_simples', 'OptanteSimples'),
    tomador_cnpj_cpf: parseStr(o, 'tomador_cnpj_cpf', 'TomadorCnpjCpf'),
    tomador_razao_social: parseStr(o, 'tomador_razao_social', 'TomadorRazaoSocial'),
    tomador_email: parseStr(o, 'tomador_email', 'TomadorEmail'),
    tomador_codigo_municipio: parseStr(o, 'tomador_codigo_municipio', 'TomadorCodigoMunicipio'),
    tomador_uf: parseStr(o, 'tomador_uf', 'TomadorUf'),
    item_lista_servico: parseStr(o, 'item_lista_servico', 'ItemListaServico'),
    codigo_tributario_municipio: parseStr(o, 'codigo_tributario_municipio', 'CodigoTributarioMunicipio'),
    discriminacao: parseStr(o, 'discriminacao', 'Discriminacao'),
    codigo_municipio: parseStr(o, 'codigo_municipio', 'CodigoMunicipio'),
    valor_servicos: parseNum(o, 'valor_servicos', 'ValorServicos'),
    valor_deducoes: parseNum(o, 'valor_deducoes', 'ValorDeducoes'),
    aliquota_iss: parseNum(o, 'aliquota_iss', 'AliquotaIss'),
    iss_retido: parseBool(o, 'iss_retido', 'IssRetido'),
    status: parseStr(o, 'status', 'Status'),
    valor_iss: parseNum(o, 'valor_iss', 'ValorIss'),
    valor_liquido: parseNum(o, 'valor_liquido', 'ValorLiquido'),
    numero_nfse: parseStr(o, 'numero_nfse', 'NumeroNfse'),
    codigo_verificacao: parseStr(o, 'codigo_verificacao', 'CodigoVerificacao'),
  };
}

export async function listNfse(): Promise<NfseDTO[]> {
  const { data } = await httpClient.get(`${BASE}/list`);
  return unwrapArray(data).map(parseNfse);
}
export async function getNfse(code: number): Promise<NfseDTO> {
  const { data } = await httpClient.get(`${BASE}/${code}`);
  return parseNfse(data);
}
export async function createNfse(dto: NfseDTO): Promise<NfseDTO> {
  const { data } = await httpClient.post(`${BASE}/create`, dto);
  return parseNfse(data);
}
export async function authorizeNfse(code: number): Promise<NfseDTO> {
  const { data } = await httpClient.post(`${BASE}/${code}/authorize`, {});
  return parseNfse(data);
}
export async function cancelNfse(code: number, justificativa: string): Promise<NfseDTO> {
  const { data } = await httpClient.post(`${BASE}/${code}/cancel`, { justificativa });
  return parseNfse(data);
}

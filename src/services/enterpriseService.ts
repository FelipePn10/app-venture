import { httpClient, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/enterprise';

/**
 * Cadastro de Empresa (VEMP0100) — o único lugar da identificação (CNPJ, razão
 * social, IE, regime, endereço). `POST /create` cria a empresa com ela numa
 * transação; `/identificacao` lê e altera a da empresa em que se está.
 */
export interface EnterpriseDTO {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  inscricao_estadual?: string;
  regime_tributario: string; // "1" Simples, "2" Lucro Presumido, "3" Lucro Real
  uf: string;
  municipio?: string;
  codigo_municipio?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  telefone?: string;
  email?: string;
}

/** Cria a empresa (código livre), vincula quem cria como ADMIN e grava a identidade fiscal. */
export async function createEnterprise(dto: EnterpriseDTO): Promise<Record<string, unknown>> {
  const { data } = await httpClient.post(`${BASE}/create`, dto);
  return unwrapObject(data);
}

/** Identificação da empresa em que se está (404 enquanto não houver). */
export async function getIdentificacao(): Promise<EnterpriseDTO | null> {
  try {
    const { data } = await httpClient.get(`${BASE}/identificacao`);
    const o = unwrapObject(data) as Record<string, unknown>;
    const str = (k: string) => (o[k] == null ? '' : String(o[k]));
    return {
      cnpj: str('cnpj'), razao_social: str('razao_social'), nome_fantasia: str('nome_fantasia'), inscricao_estadual: str('inscricao_estadual'),
      regime_tributario: str('regime_tributario') || '3', uf: str('uf'), municipio: str('municipio'), codigo_municipio: str('codigo_municipio'),
      cep: str('cep'), logradouro: str('logradouro'), numero: str('numero'), complemento: str('complemento'), bairro: str('bairro'),
      telefone: str('telefone'), email: str('email'),
    };
  } catch (e) {
    if ((e as { response?: { status?: number } })?.response?.status === 404) return null;
    throw e;
  }
}

/** Altera a identificação da empresa em que se está (só ADMIN). */
export async function updateIdentificacao(dto: EnterpriseDTO): Promise<void> {
  await httpClient.put(`${BASE}/identificacao`, dto);
}

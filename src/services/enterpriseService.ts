import { httpClient, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/enterprise';

/**
 * Cadastro de Empresa (matriz/filiais). O backend expõe apenas `POST /create`
 * (sem GET/list), então a tela trabalha em modo formulário.
 */
export interface EnterpriseDTO {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  regime_tributario: string; // "1" Simples, "2" Lucro Presumido, "3" Lucro Real
  uf: string;
  municipio?: string;
  codigo_municipio?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  telefone?: string;
  matriz_cnpj?: string;
}

/** Admin do seed; o backend exige `created_by` não-vazio na criação da empresa. */
const SYS_USER = '00000000-0000-0000-0000-000000000001';

export async function createEnterprise(dto: EnterpriseDTO): Promise<Record<string, unknown>> {
  const { data } = await httpClient.post(`${BASE}/create`, { created_by: SYS_USER, ...dto });
  return unwrapObject(data);
}

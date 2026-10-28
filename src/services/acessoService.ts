import { httpClient } from '@/services/fiscalShared';

// Perfis de acesso da empresa: permissão por módulo × ação. O backend recusa
// (403) o que o perfil não permite; o desktop usa as permissões para não
// oferecer no menu a rotina que o usuário não pode abrir.
const BASE = '/api/acesso';

export type AcaoAcesso = 'LER' | 'INCLUIR_ALTERAR' | 'EXCLUIR' | 'APROVAR' | 'AUTORIZAR' | 'EXECUTAR';

export interface ModuloAcesso { modulo: string; nome: string; acoes: AcaoAcesso[]; }
export interface PermissaoAcesso { modulo: string; acao: AcaoAcesso; }

export interface MinhasPermissoes {
  papel: string;
  /** Verdadeiro quando o usuário tem perfil na empresa: só vale o que os perfis permitem. */
  restrito: boolean;
  perfis: string[];
  permissoes: PermissaoAcesso[];
  modulos: ModuloAcesso[];
}

export interface PerfilAcesso {
  id: number;
  nome: string;
  descricao?: string;
  ativo: boolean;
  usuarios: number;
  permissoes: PermissaoAcesso[];
  updated_at: string;
}

export interface PerfilAcessoDTO { nome: string; descricao?: string; ativo: boolean; permissoes: PermissaoAcesso[]; }

export interface UsuarioAcesso { user_id: string; nome: string; email: string; papel: string; ativo: boolean; perfis: number[]; }

export const ROTULO_ACAO: Record<AcaoAcesso, string> = {
  LER: 'Consultar', INCLUIR_ALTERAR: 'Incluir/alterar', EXCLUIR: 'Excluir',
  APROVAR: 'Aprovar', AUTORIZAR: 'Autorizar (SEFAZ)', EXECUTAR: 'Executar cálculos',
};

export async function minhasPermissoes(): Promise<MinhasPermissoes> {
  const { data } = await httpClient.get(`${BASE}/minhas-permissoes`);
  return data as MinhasPermissoes;
}
export async function catalogoAcesso(): Promise<ModuloAcesso[]> {
  const { data } = await httpClient.get(`${BASE}/catalogo`);
  return data as ModuloAcesso[];
}
export async function listarPerfis(): Promise<PerfilAcesso[]> {
  const { data } = await httpClient.get(`${BASE}/perfis`);
  return data as PerfilAcesso[];
}
export async function criarPerfil(dto: PerfilAcessoDTO): Promise<PerfilAcesso> {
  const { data } = await httpClient.post(`${BASE}/perfis`, dto);
  return data as PerfilAcesso;
}
export async function atualizarPerfil(id: number, dto: PerfilAcessoDTO): Promise<PerfilAcesso> {
  const { data } = await httpClient.put(`${BASE}/perfis/${id}`, dto);
  return data as PerfilAcesso;
}
export async function excluirPerfil(id: number): Promise<void> {
  await httpClient.delete(`${BASE}/perfis/${id}`);
}
export async function listarUsuariosAcesso(): Promise<UsuarioAcesso[]> {
  const { data } = await httpClient.get(`${BASE}/usuarios`);
  return data as UsuarioAcesso[];
}
export async function definirPerfisDoUsuario(userId: string, perfis: number[]): Promise<void> {
  await httpClient.put(`${BASE}/usuarios/${userId}/perfis`, { perfis });
}

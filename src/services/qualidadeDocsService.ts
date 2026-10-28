import { httpClient } from '@/services/fiscalShared';
import { downloadResponse } from '@/services/fileDownload';

// Certificado de qualidade ao cliente e documentos controlados da qualidade.
const CERT = '/api/quality/certificados';
const DOC = '/api/quality/documentos';

export interface CaracResumo {
  nome: string; tipo: string; nominal?: string; minimo?: string; maximo?: string; unidade?: string; n: number;
  medido_minimo?: string; medido_maximo?: string; media?: string; nao_conformes: number; instrumentos?: string[]; critica: boolean;
}
export interface LoteResumo {
  id: number; numero: number; origem: string; decisao: string; concessao: boolean; tratamento?: string; qtd_aproveitada: string;
  decidido_em: string; amostra?: string; caracteristicas: CaracResumo[];
}
export interface Certificado {
  id: number; numero: number; customer_code?: number; fiscal_exit_id?: number; sales_order_code?: number; item_code: number; mask: string;
  lote?: string; quantidade: number; corrida?: string; certificado_usina?: string; lotes_inspecao: number[]; observacoes?: string;
  status: 'EMITIDO' | 'CANCELADO'; motivo_cancelamento?: string; emitido_em: string;
  conteudo: {
    empresa: { nome: string; cnpj?: string }; cliente?: { codigo?: number; nome: string; cnpj?: string };
    item_code: number; item_nome: string; lote?: string; corrida?: string; certificado_usina?: string; quantidade: string;
    nf?: { numero: number; serie: string; data: string }; pedido_venda?: number; lotes: LoteResumo[]; observacoes?: string;
  };
}
export interface EmissaoDTO {
  item_code: number; mask?: string; lote?: string; quantidade: string; lotes_inspecao?: number[];
  customer_code?: number; fiscal_exit_id?: number; sales_order_code?: number; observacoes?: string;
}

export async function listarCertificados(f: { item?: number; cliente?: number; status?: string } = {}): Promise<Certificado[]> {
  const params: Record<string, string> = {};
  if (f.item) params.item = String(f.item);
  if (f.cliente) params.cliente = String(f.cliente);
  if (f.status) params.status = f.status;
  const { data } = await httpClient.get(CERT, { params });
  return (data ?? []) as Certificado[];
}
export async function emitirCertificado(dto: EmissaoDTO): Promise<Certificado> {
  const { data } = await httpClient.post(CERT, dto);
  return data as Certificado;
}
export async function cancelarCertificado(id: number, motivo: string): Promise<Certificado> {
  const { data } = await httpClient.post(`${CERT}/${id}/cancelar`, { motivo });
  return data as Certificado;
}
export async function baixarPdfCertificado(id: number, numero: number): Promise<void> {
  const resp = await httpClient.get(`${CERT}/${id}/pdf`, { responseType: 'blob' });
  downloadResponse(resp.data as Blob, resp.headers as Record<string, unknown>, `certificado-${numero}.pdf`);
}

export type TipoDocumento = 'IT' | 'PROCEDIMENTO' | 'FORMULARIO' | 'PLANO_INSPECAO' | 'ESPECIFICACAO' | 'OUTRO';
export interface RevisaoDoc {
  id: number; revisao: number; status: 'RASCUNHO' | 'VIGENTE' | 'OBSOLETA'; descricao_mudanca: string; conteudo?: string;
  arquivo_nome?: string; tem_arquivo: boolean; elaborado_por: string; elaborado_em: string; aprovado_por?: string; vigente_desde?: string; obsoleta_em?: string;
}
export interface DocumentoQ {
  id: number; codigo: string; titulo: string; tipo: TipoDocumento; item_code?: number; area?: string; ativo: boolean;
  vigente?: RevisaoDoc; rascunho?: RevisaoDoc; revisoes?: RevisaoDoc[];
}

export async function listarDocumentos(f: { tipo?: string; item?: number; busca?: string } = {}): Promise<DocumentoQ[]> {
  const params: Record<string, string> = {};
  if (f.tipo) params.tipo = f.tipo;
  if (f.item) params.item = String(f.item);
  if (f.busca) params.busca = f.busca;
  const { data } = await httpClient.get(DOC, { params });
  return (data ?? []) as DocumentoQ[];
}
export async function obterDocumento(id: number): Promise<DocumentoQ> {
  const { data } = await httpClient.get(`${DOC}/${id}`);
  return data as DocumentoQ;
}
export async function salvarDocumento(id: number | null, dto: { codigo: string; titulo: string; tipo: string; item_code?: number; area?: string; ativo?: boolean }): Promise<DocumentoQ> {
  const { data } = id ? await httpClient.put(`${DOC}/${id}`, dto) : await httpClient.post(DOC, dto);
  return data as DocumentoQ;
}
export async function gravarRascunho(id: number, dto: { descricao_mudanca: string; conteudo?: string; arquivo_nome?: string; arquivo_tipo?: string; arquivo_base64?: string }): Promise<DocumentoQ> {
  const { data } = await httpClient.put(`${DOC}/${id}/rascunho`, dto);
  return data as DocumentoQ;
}
export async function aprovarDocumento(id: number): Promise<DocumentoQ> {
  const { data } = await httpClient.post(`${DOC}/${id}/aprovar`, {});
  return data as DocumentoQ;
}
export async function descartarRascunho(id: number): Promise<DocumentoQ> {
  const { data } = await httpClient.delete(`${DOC}/${id}/rascunho`);
  return data as DocumentoQ;
}
export async function baixarArquivoRevisao(rev: RevisaoDoc): Promise<void> {
  const resp = await httpClient.get(`${DOC}/revisoes/${rev.id}/arquivo`, { responseType: 'blob' });
  downloadResponse(resp.data as Blob, resp.headers as Record<string, unknown>, rev.arquivo_nome || `revisao-${rev.revisao}`);
}

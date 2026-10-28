import { httpClient, parseBool, parseNum, parseStr, unwrapArray, unwrapObject } from '@/services/fiscalShared';
import type { PlanoAmostragem } from '@/services/amostragemService';

// Lote de inspeção (módulo de qualidade): recebimento, processo e final num só
// objeto — características do plano, amostragem NBR 5426, resultados por
// unidade da amostra e decisão de uso que move o estoque.
const BASE = '/api/quality/lotes';

export type OrigemLote = 'RECEBIMENTO' | 'PROCESSO' | 'FINAL' | 'DEVOLUCAO' | 'MANUAL';
export type StatusLote = 'ABERTO' | 'DECIDIDO' | 'CANCELADO';

export interface CaracteristicaLote {
  id: number;
  sequencia: number;
  nome: string;
  tipo: 'VARIAVEL' | 'ATRIBUTO' | 'ESTRUTURA';
  obrigatoria: boolean;
  critica: boolean;
  nominal?: number;
  minimo?: number;
  maximo?: number;
  unidade?: string;
  instrumento?: string;
}

export interface ResultadoLote {
  id: number;
  characteristic_id: number;
  amostra_indice: number;
  valor?: number;
  atributo?: string;
  conforme: boolean;
  observacao?: string;
  instrument_id?: number;
}

export interface DecisaoLote {
  decisao: 'ACEITO' | 'ACEITO_COM_RESTRICAO' | 'REJEITADO' | 'PARCIAL';
  qtd_aceita: number;
  qtd_restrita: number;
  qtd_retrabalho: number;
  qtd_rejeitada: number;
  qtd_sucata: number;
  destino_aceito?: number;
  destino_restrito?: number;
  destino_retrabalho?: number;
  destino_rejeitado?: number;
  destino_sucata?: number;
  tratamento?: string;
  nao_conformes?: number;
  aceito_amostragem?: boolean;
  afeta_iqf: boolean;
  motivo?: string;
  decided_at: string;
}

export interface AvaliacaoLote {
  nao_conformes: number;
  critica_reprovada: boolean;
  completa: boolean;
  faltantes?: string[];
  aceito_pela_amostragem: boolean;
  ac: number;
  re: number;
}

export interface LoteInspecao {
  id: number;
  numero: number;
  origem: OrigemLote;
  status: StatusLote;
  item_code: number;
  mask: string;
  lote?: string;
  serie?: string;
  quantidade: number;
  warehouse_id?: number;
  supplier_code?: number;
  purchase_order_code?: number;
  fiscal_entry_code?: number;
  production_order_id?: number;
  route_operation_id?: number;
  sampling_procedure_id?: number;
  chave_amostragem?: string;
  plano?: PlanoAmostragem;
  pulado: boolean;
  certificado?: string;
  observacoes?: string;
  motivo_cancelamento?: string;
  caracteristicas: CaracteristicaLote[];
  resultados: ResultadoLote[];
  decisao?: DecisaoLote;
  avaliacao?: AvaliacaoLote;
  relatorios_fornecedor?: number[];
  created_at: string;
}

export interface FiltroLotes { status?: string; origem?: string; item?: number; fornecedor?: number; ordem?: number; }

export interface ResultadoDTO { characteristic_id: number; amostra_indice: number; valor?: string; conforme?: boolean; observacao?: string; instrument_id?: number; }

export interface DecisaoDTO {
  qtd_aceita: string;
  qtd_restrita: string;
  qtd_retrabalho: string;
  qtd_rejeitada: string;
  qtd_sucata: string;
  destino_aceito?: number;
  destino_restrito?: number;
  destino_retrabalho?: number;
  destino_rejeitado?: number;
  destino_sucata?: number;
  tratamento?: string;
  afeta_iqf: boolean;
  producao_irregular?: boolean;
  motivo?: string;
}

export interface AberturaDTO {
  origem: OrigemLote;
  item_code: number;
  quantidade: string;
  warehouse_id?: number;
  supplier_code?: number;
  lote?: string;
  certificado?: string;
  observacoes?: string;
}

// Quantidades vão como texto: o backend usa decimal e não perde a fração.
export async function listarLotes(f: FiltroLotes = {}): Promise<LoteInspecao[]> {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== '' && v !== 0) params[k] = String(v);
  const { data } = await httpClient.get(BASE, { params });
  return (data ?? []) as LoteInspecao[];
}
export async function obterLote(id: number): Promise<LoteInspecao> {
  const { data } = await httpClient.get(`${BASE}/${id}`);
  return data as LoteInspecao;
}
export async function abrirLote(dto: AberturaDTO): Promise<LoteInspecao> {
  const { data } = await httpClient.post(BASE, dto);
  return data as LoteInspecao;
}
export async function gravarResultados(id: number, resultados: ResultadoDTO[]): Promise<LoteInspecao> {
  const { data } = await httpClient.post(`${BASE}/${id}/resultados`, { resultados });
  return data as LoteInspecao;
}
export async function decidirLote(id: number, dto: DecisaoDTO): Promise<LoteInspecao> {
  const { data } = await httpClient.post(`${BASE}/${id}/decisao`, dto);
  return data as LoteInspecao;
}
/** Vincula ao lote um laudo do fornecedor (cadastro item × fornecedor). */
export async function vincularLaudo(id: number, qualityReportId: number): Promise<LoteInspecao> {
  const { data } = await httpClient.post(`${BASE}/${id}/laudos`, { quality_report_id: qualityReportId });
  return data as LoteInspecao;
}
export async function desvincularLaudo(id: number, qualityReportId: number): Promise<void> {
  await httpClient.delete(`${BASE}/${id}/laudos/${qualityReportId}`);
}
export async function cancelarLote(id: number, motivo: string): Promise<LoteInspecao> {
  const { data } = await httpClient.post(`${BASE}/${id}/cancelar`, { motivo });
  return data as LoteInspecao;
}

export interface AlmoxDestino { id: number; codigo: string; descricao: string; localizacao: string; disponivel: boolean; }

/** Almoxarifados com id, localização e disposição — para os destinos da decisão. */
export async function almoxarifadosParaDecisao(): Promise<AlmoxDestino[]> {
  const { data } = await httpClient.get<unknown>('/api/warehouse/list');
  const out: AlmoxDestino[] = [];
  for (const raw of unwrapArray(data)) {
    const o = unwrapObject(raw);
    if (!o) continue;
    const id = parseNum(o, 'id', 'ID');
    if (!id) continue;
    out.push({
      id, codigo: parseStr(o, 'code', 'Code'), descricao: parseStr(o, 'description', 'Description'),
      // A API devolve "INSPEÇÃO"/"REJEIÇÃO"; compara-se sem acento.
      localizacao: parseStr(o, 'location', 'Location').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase(),
      disponivel: parseBool(o, 'disposition', 'Disposition'),
    });
  }
  return out.sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true }));
}

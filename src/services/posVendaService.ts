import { httpClient } from '@/services/fiscalShared';

// Pós-venda (Fase 3.1): perfil de pós-venda do item, número de série e base
// instalada; séries das linhas da NF de saída.
const BASE = '/api/pos-venda';

export type SituacaoSerie = 'EM_ESTOQUE' | 'NO_CLIENTE' | 'EM_ASSISTENCIA' | 'BAIXADO';

export interface RegraGarantia {
  garantia_meses: number; garantia_inicio: 'VENDA' | 'INSTALACAO'; cobre_pecas: boolean; cobre_mao_obra: boolean; cobre_deslocamento: boolean; dias_do_item?: number;
}
export interface PerfilPosVenda {
  garantia?: RegraGarantia;
  item_code: number; item_codigo?: string; item_nome?: string; controla_serie: boolean; mascara_serie_id?: number; observacoes?: string; updated_at?: string;
}
export interface Serie {
  id: number; item_code: number; item_codigo?: string; item_nome?: string; mask?: string; numero_serie: string; situacao: SituacaoSerie; origem: string;
  warehouse_id?: number; lote?: string; production_order_id?: number; fiscal_entry_id?: number; fiscal_exit_id?: number; numero_nf?: number;
  customer_code?: number; cliente_nome?: string; data_venda?: string; data_instalacao?: string; local_instalacao?: string; observacoes?: string;
  garantia_estendida_ate?: string; garantia_estendida_motivo?: string;
  created_at: string; updated_at: string;
}
export interface EventoSerie {
  id: number; evento: string; situacao_antes?: string; situacao_depois: string; customer_code?: number; warehouse_id?: number;
  referencia_tipo?: string; referencia_id?: number; motivo?: string; ocorrido_em: string;
}
export interface CadastroSeriesDTO {
  /** Código de negócio do item (o da tela). */
  item_code: string; mask?: string; series: string[]; situacao: 'EM_ESTOQUE' | 'NO_CLIENTE'; origem?: string; warehouse_id?: number;
  lote?: string; customer_code?: number; data_venda?: string; data_instalacao?: string; local_instalacao?: string; observacoes?: string;
}
export interface LinhaNotaComSerie { fiscal_exit_item_id: number; item_code: number; quantidade: string | number; series: Serie[] }

export const ROTULO_SITUACAO: Record<SituacaoSerie, string> = {
  EM_ESTOQUE: 'Em estoque', NO_CLIENTE: 'No cliente', EM_ASSISTENCIA: 'Em assistência', BAIXADO: 'Baixada',
};
export const ROTULO_EVENTO: Record<string, string> = {
  CADASTRO: 'Cadastro', PRODUCAO: 'Produção', VENDA: 'Venda', ESTORNO_VENDA: 'Estorno da venda', INSTALACAO: 'Instalação',
  TRANSFERENCIA: 'Transferência de cliente', BAIXA: 'Baixa', CORRECAO: 'Correção', GARANTIA_ESTENDIDA: 'Garantia estendida',
  ASSISTENCIA: 'Entrada na assistência', RETORNO_ASSISTENCIA: 'Retorno da assistência', DEVOLUCAO_VENDA: 'Devolução de venda',
};

export async function listarPerfis(): Promise<PerfilPosVenda[]> {
  const { data } = await httpClient.get(`${BASE}/perfis`);
  return (data ?? []) as PerfilPosVenda[];
}
export async function obterPerfil(item: string): Promise<PerfilPosVenda> {
  const { data } = await httpClient.get(`${BASE}/perfis/${encodeURIComponent(item)}`);
  return data as PerfilPosVenda;
}
export async function salvarPerfil(item: string, dto: { controla_serie: boolean; mascara_serie_id?: number; observacoes?: string } & Partial<RegraGarantia>): Promise<PerfilPosVenda> {
  const { data } = await httpClient.put(`${BASE}/perfis/${encodeURIComponent(item)}`, dto);
  return data as PerfilPosVenda;
}

export async function listarSeries(f: { item?: string; cliente?: number; situacao?: string; busca?: string; limite?: number } = {}): Promise<Serie[]> {
  const params: Record<string, string> = {};
  if (f.item) params.item = f.item;
  if (f.cliente) params.cliente = String(f.cliente);
  if (f.situacao) params.situacao = f.situacao;
  if (f.busca) params.busca = f.busca;
  if (f.limite) params.limite = String(f.limite);
  const { data } = await httpClient.get(`${BASE}/series`, { params });
  return (data ?? []) as Serie[];
}
export async function cadastrarSeries(dto: CadastroSeriesDTO): Promise<Serie[]> {
  const { data } = await httpClient.post(`${BASE}/series`, dto);
  return (data ?? []) as Serie[];
}
export async function obterSerie(id: number): Promise<Serie & { historico: EventoSerie[] }> {
  const { data } = await httpClient.get(`${BASE}/series/${id}`);
  return data as Serie & { historico: EventoSerie[] };
}
export async function instalarSerie(id: number, dto: { data: string; local?: string }) {
  const { data } = await httpClient.post(`${BASE}/series/${id}/instalacao`, dto);
  return data as Serie & { historico: EventoSerie[] };
}
export async function transferirSerie(id: number, dto: { customer_code: number; motivo: string }) {
  const { data } = await httpClient.post(`${BASE}/series/${id}/transferencia`, dto);
  return data as Serie & { historico: EventoSerie[] };
}
export async function baixarSerie(id: number, motivo: string) {
  const { data } = await httpClient.post(`${BASE}/series/${id}/baixa`, { motivo });
  return data as Serie & { historico: EventoSerie[] };
}

export async function seriesDaNota(exitId: number): Promise<LinhaNotaComSerie[]> {
  const { data } = await httpClient.get(`/api/fiscal/exits/${exitId}/series`);
  return (data ?? []) as LinhaNotaComSerie[];
}
export async function definirSeriesDaLinha(exitId: number, itemId: number, series: number[]): Promise<LinhaNotaComSerie[]> {
  const { data } = await httpClient.put(`/api/fiscal/exits/${exitId}/itens/${itemId}/series`, { series });
  return (data ?? []) as LinhaNotaComSerie[];
}

/** Uma série por linha, ou separadas por vírgula/ponto e vírgula. */
export function lerSeries(texto: string): string[] {
  return texto.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
}

export interface Garantia {
  origem: string; inicio_em?: string; ate?: string; em_garantia: boolean; estendida: boolean;
  cobre_pecas: boolean; cobre_mao_obra: boolean; cobre_deslocamento: boolean; motivo: string;
  regra: RegraGarantia; serie?: Serie; nota?: { fiscal_exit_id: number; numero_nf: number; emissao: string }; avisos?: string[];
}
/** Garantia do produto no atendimento: série (base instalada) > NF do cliente > data informada. */
export async function consultarGarantia(f: { item: string; serie?: string; cliente?: number; nf?: number; data_compra?: string }): Promise<Garantia> {
  const params: Record<string, string> = { item: f.item };
  if (f.serie) params.serie = f.serie;
  if (f.cliente) params.cliente = String(f.cliente);
  if (f.nf) params.nf = String(f.nf);
  if (f.data_compra) params.data_compra = f.data_compra;
  const { data } = await httpClient.get(`${BASE}/garantia`, { params });
  return data as Garantia;
}
export async function estenderGarantia(id: number, dto: { ate: string; motivo: string }) {
  const { data } = await httpClient.post(`${BASE}/series/${id}/garantia-estendida`, dto);
  return data as Serie & { historico: EventoSerie[] };
}
export const ROTULO_ORIGEM_GARANTIA: Record<string, string> = { SERIE: 'pela série (base instalada)', NF: 'pela NF de venda', INFORMADA: 'pela data informada' };

// ─── Ordem de serviço (Fase 3.3) ─────────────────────────────────────────────

export type SituacaoOS = 'ABERTA' | 'AGENDADA' | 'EM_EXECUCAO' | 'CONCLUIDA' | 'FATURADA' | 'CANCELADA';
export const ROTULO_SITUACAO_OS: Record<SituacaoOS, string> = {
  ABERTA: 'Aberta', AGENDADA: 'Agendada', EM_EXECUCAO: 'Em execução', CONCLUIDA: 'Concluída', FATURADA: 'Faturada', CANCELADA: 'Cancelada',
};
export const ROTULO_DESPESA: Record<string, string> = { KM: 'Quilometragem', HOSPEDAGEM: 'Hospedagem', ALIMENTACAO: 'Alimentação', PEDAGIO: 'Pedágio', OUTROS: 'Outros' };
type Num = string | number;
export interface ParametrosOS {
  custo_hora: Num; preco_hora: Num; custo_km: Num; preco_km: Num; warehouse_id?: number; item_servico: string; item_servico_nome?: string;
}
export interface OrdemServico {
  id: number; numero: number; call_code: number; call_number?: number; call_item_code?: number; serie_id?: number; numero_serie?: string;
  item_code?: string; item_nome?: string; customer_code: number; cliente_nome?: string; local: 'CLIENTE' | 'FABRICA'; situacao: SituacaoOS;
  tecnico_code?: number; tecnico_nome?: string; agendada_para?: string; iniciada_em?: string; concluida_em?: string;
  em_garantia: boolean; cobre_pecas: boolean; cobre_mao_obra: boolean; cobre_deslocamento: boolean;
  defeito_constatado?: string; solucao?: string; observacoes?: string; motivo_cancelamento?: string; sales_order_code?: number;
  created_at: string; updated_at: string;
}
export interface HoraOS { id: number; tecnico_code?: number; data: string; tipo: 'TRABALHO' | 'DESLOCAMENTO'; horas: Num; custo_hora: Num; preco_hora: Num; cobrado: boolean; observacao?: string }
export interface PecaOS { id: number; item_code: string; item_nome?: string; quantidade: Num; warehouse_id: number; custo_unitario: Num; preco_unitario: Num; cobrado: boolean; stock_movement_id?: number; observacao?: string }
export interface DespesaOS { id: number; tipo: string; quantidade: Num; custo: Num; preco: Num; cobrado: boolean; observacao?: string }
export interface EventoOS { id: number; evento: string; de?: string; para?: string; detalhe?: string; ocorrido_em: string }
export interface TotaisOS {
  custo_horas: Num; custo_pecas: Num; custo_despesas: Num; custo_total: Num; a_cobrar: Num; custo_garantia: Num; horas_trabalho: Num; horas_deslocamento: Num;
}
export interface OrdemServicoCompleta extends OrdemServico { horas: HoraOS[]; pecas: PecaOS[]; despesas: DespesaOS[]; eventos: EventoOS[]; totais: TotaisOS }

export async function parametrosOS(): Promise<ParametrosOS> {
  const { data } = await httpClient.get(`${BASE}/os-parametros`);
  return data as ParametrosOS;
}
export async function salvarParametrosOS(dto: ParametrosOS): Promise<ParametrosOS> {
  const { data } = await httpClient.put(`${BASE}/os-parametros`, dto);
  return data as ParametrosOS;
}
export async function listarOS(f: { situacao?: string; cliente?: number; chamado?: number; tecnico?: number } = {}): Promise<OrdemServico[]> {
  const params: Record<string, string> = {};
  if (f.situacao) params.situacao = f.situacao;
  if (f.cliente) params.cliente = String(f.cliente);
  if (f.chamado) params.chamado = String(f.chamado);
  if (f.tecnico) params.tecnico = String(f.tecnico);
  const { data } = await httpClient.get(`${BASE}/os`, { params });
  return (data ?? []) as OrdemServico[];
}
export async function abrirOS(dto: { call_code: number; call_item_code?: number; local: 'CLIENTE' | 'FABRICA'; tecnico_code?: number; agendada_para?: string; observacoes?: string }) {
  const { data } = await httpClient.post(`${BASE}/os`, dto);
  return data as OrdemServicoCompleta;
}
export async function obterOS(id: number): Promise<OrdemServicoCompleta> {
  const { data } = await httpClient.get(`${BASE}/os/${id}`);
  return data as OrdemServicoCompleta;
}
/** Ação da OS: agenda, inicio, conclusao, reabertura, cancelamento, faturamento, horas, pecas, despesas. */
export async function acaoOS(id: number, acao: string, corpo: object = {}): Promise<OrdemServicoCompleta> {
  const { data } = await httpClient.post(`${BASE}/os/${id}/${acao}`, corpo);
  return data as OrdemServicoCompleta;
}
export async function removerLancamentoOS(id: number, tipo: 'horas' | 'pecas' | 'despesas', lancamento: number): Promise<OrdemServicoCompleta> {
  const { data } = await httpClient.delete(`${BASE}/os/${id}/${tipo}/${lancamento}`);
  return data as OrdemServicoCompleta;
}

// ─── SLA da assistência (Fase 3.4) ───────────────────────────────────────────

export type SituacaoPrazo = 'SEM_PRAZO' | 'NO_PRAZO' | 'EM_RISCO' | 'VENCIDO' | 'CUMPRIDO' | 'ESTOURADO' | 'PAUSADO';
export const ROTULO_PRAZO: Record<SituacaoPrazo, string> = {
  SEM_PRAZO: 'Sem prazo', NO_PRAZO: 'No prazo', EM_RISCO: 'Em risco', VENCIDO: 'Vencido', CUMPRIDO: 'Cumprido', ESTOURADO: 'Cumprido com atraso',
  PAUSADO: 'Pausado (aguardando cliente)',
};
export const ROTULO_PRIORIDADE: Record<string, string> = { LOW: 'Baixa', NORMAL: 'Normal', HIGH: 'Alta', CRITICAL: 'Crítica' };
export interface RegraSLA {
  id: number; prioridade: string; customer_code?: number; cliente_nome?: string; horas_resposta: string | number; horas_solucao: string | number;
  alerta_pct: number; horas_uteis: boolean; ativo: boolean; updated_at?: string;
}
export interface ChamadoSLA {
  call_code: number; call_number: number; customer_code: number; cliente_nome?: string; assunto: string; prioridade: string; status: string; aberto_em: string;
  resposta_ate?: string; respondido_em?: string; solucao_ate?: string; solucionado_em?: string; alerta_pct: number;
  situacao_resposta: SituacaoPrazo; situacao_solucao: SituacaoPrazo; cancelado: boolean;
  horas_uteis: boolean; pausado_desde?: string; horas_pausadas: string | number;
}
export interface PainelSLA {
  resumo: { abertos: number; em_risco: number; vencidos: number; cumpridos: number; estourados: number; pausados: number };
  chamados: ChamadoSLA[];
}
export async function regrasSLA(): Promise<RegraSLA[]> {
  const { data } = await httpClient.get(`${BASE}/sla/regras`);
  return (data ?? []) as RegraSLA[];
}
export async function salvarRegraSLA(id: number | undefined, dto: { prioridade: string; customer_code?: number; horas_resposta: string; horas_solucao: string; alerta_pct: number; horas_uteis: boolean; ativo: boolean }): Promise<RegraSLA> {
  const { data } = id ? await httpClient.put(`${BASE}/sla/regras/${id}`, dto) : await httpClient.post(`${BASE}/sla/regras`, dto);
  return data as RegraSLA;
}
export async function excluirRegraSLA(id: number): Promise<void> {
  await httpClient.delete(`${BASE}/sla/regras/${id}`);
}
export async function painelSLA(f: { situacao?: string; cliente?: number; dias?: number } = {}): Promise<PainelSLA> {
  const params: Record<string, string> = {};
  if (f.situacao) params.situacao = f.situacao;
  if (f.cliente) params.cliente = String(f.cliente);
  if (f.dias) params.dias = String(f.dias);
  const { data } = await httpClient.get(`${BASE}/sla/painel`, { params });
  return data as PainelSLA;
}

// ─── Indicadores, CAPA do chamado e recuperação (Fase 3.5) ───────────────────

export interface GrupoCusto { chave: string; descricao: string; os: number; custo_garantia: Num; cobrado: Num }
export interface ConfiabilidadeItem {
  item_code: string; item_nome: string; em_campo: number; falharam_no_periodo: number; falhas_totais: number; dias_em_campo: Num; taxa_falha?: Num; mtbf_dias?: Num;
}
export interface IndicadoresPosVenda {
  periodo: { De: string; Ate: string };
  resumo: { chamados: number; os_concluidas: number; custo_garantia: Num; cobrado: Num; reclamado_fornecedor: Num; recuperado_fornecedor: Num; custo_liquido: Num; mttr_horas?: Num; chamados_com_capa: number };
  sla: { com_prazo: number; resposta_avaliada: number; resposta_cumprida: number; solucao_avaliada: number; solucao_cumprida: number; resposta_pct?: Num; solucao_pct?: Num };
  por_item: GrupoCusto[]; por_defeito: GrupoCusto[]; por_lote: GrupoCusto[]; confiabilidade: ConfiabilidadeItem[];
}
export async function indicadoresPosVenda(f: { de?: string; ate?: string } = {}): Promise<IndicadoresPosVenda> {
  const params: Record<string, string> = {};
  if (f.de) params.de = f.de;
  if (f.ate) params.ate = f.ate;
  const { data } = await httpClient.get(`${BASE}/indicadores`, { params });
  return data as IndicadoresPosVenda;
}
export async function abrirCapaDoChamado(callCode: number, dto: { call_item_code?: number; metodo: string; responsavel?: string; prazo?: string }) {
  const { data } = await httpClient.post(`${BASE}/chamados/${callCode}/capa`, dto);
  return data as { id: number; numero: number; titulo: string };
}

export type SituacaoRecuperacao = 'RECLAMADA' | 'ACEITA' | 'RECUSADA' | 'RECUPERADA';
export const ROTULO_RECUPERACAO: Record<SituacaoRecuperacao, string> = { RECLAMADA: 'Reclamada', ACEITA: 'Aceita', RECUSADA: 'Recusada', RECUPERADA: 'Recuperada' };
export const ROTULO_FORMA: Record<string, string> = { NOTA_CREDITO: 'Nota de crédito', DEBITO: 'Débito em título', REPOSICAO: 'Reposição da peça', DESCONTO: 'Desconto em compra' };
export interface Recuperacao {
  id: number; numero: number; supplier_code: number; fornecedor_nome?: string; os_id?: number; os_numero?: number; call_code?: number; call_number?: number;
  item_code?: string; item_nome?: string; capa_id?: number; motivo: string; valor_reclamado: Num; valor_recuperado: Num; situacao: SituacaoRecuperacao;
  forma?: string; documento?: string; resposta?: string; recuperado_em?: string; created_at: string;
}
export async function listarRecuperacoes(f: { situacao?: string; fornecedor?: number; os?: number } = {}): Promise<Recuperacao[]> {
  const params: Record<string, string> = {};
  if (f.situacao) params.situacao = f.situacao;
  if (f.fornecedor) params.fornecedor = String(f.fornecedor);
  if (f.os) params.os = String(f.os);
  const { data } = await httpClient.get(`${BASE}/recuperacoes`, { params });
  return (data ?? []) as Recuperacao[];
}
export async function abrirRecuperacao(dto: { supplier_code: number; os_id?: number; call_code?: number; motivo: string; valor_reclamado: string }): Promise<Recuperacao> {
  const { data } = await httpClient.post(`${BASE}/recuperacoes`, dto);
  return data as Recuperacao;
}
export async function mudarRecuperacao(id: number, dto: { situacao: string; resposta?: string; valor_recuperado?: string; forma?: string; documento?: string; recuperado_em?: string }): Promise<Recuperacao> {
  const { data } = await httpClient.post(`${BASE}/recuperacoes/${id}/situacao`, dto);
  return data as Recuperacao;
}

// Expediente das horas úteis: intervalos HH:MM por dia da semana (0 = domingo).
export interface HorarioSLA { dia_semana: number; inicio: string; fim: string; }
export interface ExpedienteSLA { padrao: boolean; intervalos: HorarioSLA[]; }
export async function expedienteSLA(): Promise<ExpedienteSLA> {
  const { data } = await httpClient.get(`${BASE}/sla/expediente`);
  return data as ExpedienteSLA;
}
export async function salvarExpedienteSLA(intervalos: HorarioSLA[]): Promise<ExpedienteSLA> {
  const { data } = await httpClient.put(`${BASE}/sla/expediente`, { intervalos });
  return data as ExpedienteSLA;
}

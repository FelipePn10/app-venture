import { httpClient, unwrapArray, unwrapObject } from '@/services/fiscalShared';

/**
 * Beneficiamento — material do cliente em poder da empresa.
 *
 * O cliente manda matéria-prima por NF-e de remessa (CFOP 5901), a empresa
 * processa e devolve na MESMA nota em que fatura o serviço: CFOP 5124 para a
 * industrialização e 5902 para o material voltando. Sobra e sucata devolvidas
 * saem por 5903.
 *
 * Base: `/api/customer-material`.
 *
 * Não confundir com `thirdPartyServiceService` (VTER*), que é o sentido OPOSTO:
 * nós mandando operação de roteiro para fora (galvanização, têmpera, zincagem).
 *
 * Quantidades e valores são STRING de ponta a ponta. Este material alimenta
 * documento fiscal, e passar por `number` perderia centavo — a nota de retorno
 * sairia divergente da de entrada e a SEFAZ recusaria.
 */

const BASE = '/api/customer-material';

/** Situação da remessa. Derivada do saldo pelo backend, nunca digitada. */
export const REMITTANCE_STATUS = ['ABERTA', 'PARCIAL', 'ENCERRADA', 'CANCELADA'] as const;
export type RemittanceStatus = (typeof REMITTANCE_STATUS)[number];

/**
 * Movimentos que a tela pode lançar. `RECEIPT` NÃO entra: a entrada nasce do
 * recebimento da remessa, e o backend recusa criá-la por aqui — aceitá-la
 * permitiria inflar o saldo do cliente sem nota que o sustente.
 */
export const MOVEMENT_TYPES = ['RETURN', 'LEFTOVER', 'SCRAP', 'ADJUSTMENT'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const SCRAP_DESTINATIONS = ['CLIENTE', 'DESCARTE', 'RETENCAO', 'OUTRA'] as const;
export type ScrapDestination = (typeof SCRAP_DESTINATIONS)[number];

export interface RemittanceItemDTO {
  id: number;
  line_number: number;
  /** Código do item COMO VEIO na nota do cliente. */
  customer_item_code: string;
  item_code?: number | null;
  description: string;
  /** NCM da entrada; o retorno sai com o mesmo. */
  ncm: string;
  cst?: string | null;
  uom: string;
  qty_invoiced: string;
  qty_received: string;
  qty_returned: string;
  qty_leftover: string;
  qty_scrapped: string;
  /** Saldo do cliente em poder da empresa. Calculado pelo banco. */
  balance_qty: string;
  /** Negativo quando chegou menos do que a nota diz. */
  divergence_qty: string;
  divergence_reason?: string | null;
  unit_value: string;
  warehouse_id?: number | null;
  address?: string | null;
}

export interface RemittanceDTO {
  id: number;
  customer_code: number;
  nfe_number: number;
  nfe_series: string;
  nfe_key?: string | null;
  cfop: string;
  issue_date: string;
  received_at: string;
  fiscal_return_deadline: string;
  /** Negativo quando o prazo já passou. Vem do servidor, não do relógio local. */
  dias_para_o_prazo: number;
  total_value: string;
  status: RemittanceStatus;
  sales_order_code?: number | null;
  blocked: boolean;
  block_reason?: string | null;
  close_reason?: string | null;
  notes?: string | null;
  saldo_total: string;
  itens: RemittanceItemDTO[];
}

export interface MovementDTO {
  id: number;
  remittance_item_id: number;
  movement_type: MovementType;
  quantity: string;
  unit_value: string;
  cfop?: string | null;
  production_order_id?: number | null;
  fiscal_exit_id?: number | null;
  scrap_destination?: ScrapDestination | null;
  reason?: string | null;
  created_at: string;
  /**
   * Estorno: preenchido quando a NF-e que documentou o movimento foi cancelada. O
   * movimento continua no razão e a quantidade voltou ao saldo do cliente —
   * esconder a linha faria a conferência não fechar com o que o cliente enviou.
   */
  reversed_at?: string | null;
  reversal_reason?: string | null;
}

export interface BalanceDTO {
  customer_code: number;
  customer_name: string;
  customer_item_code: string;
  item_code?: number | null;
  description: string;
  uom: string;
  balance: string;
  remessas_abertas: number;
  prazo_mais_proximo?: string | null;
}

export interface NewRemittanceItem {
  line_number?: number;
  customer_item_code: string;
  item_code?: number | null;
  description: string;
  ncm: string;
  cst?: string | null;
  uom: string;
  qty_invoiced: string;
  /** Vazio = vale a quantidade da nota. */
  qty_received?: string;
  unit_value?: string;
  /** Obrigatório quando o conferido difere da nota. */
  divergence_reason?: string | null;
  warehouse_id?: number | null;
  address?: string | null;
}

export interface NewRemittance {
  customer_code: number;
  nfe_number: number;
  nfe_series?: string;
  nfe_key?: string | null;
  cfop?: string;
  issue_date: string;
  received_at?: string;
  /** Vazio = 30 dias após a emissão, o prazo fiscal da operação. */
  fiscal_return_deadline?: string;
  total_value?: string;
  sales_order_code?: number | null;
  notes?: string | null;
  itens: NewRemittanceItem[];
}

export interface RemittanceFilter {
  customer_code?: number;
  nfe_number?: number;
  sales_order_code?: number;
  status?: RemittanceStatus[];
  blocked?: boolean;
  with_balance?: boolean;
  /** Remessas cujo prazo fiscal vence até esta data (AAAA-MM-DD). */
  due_until?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface NewMovement {
  movement_type: MovementType;
  quantity: string;
  unit_value?: string;
  /** Vazio = o backend aplica 5902 no retorno e 5903 em sobra e sucata. */
  cfop?: string | null;
  production_order_id?: number | null;
  fiscal_exit_id?: number | null;
  /** Obrigatório em sucata. */
  scrap_destination?: ScrapDestination | null;
  /** Obrigatório em ajuste. */
  reason?: string | null;
  /**
   * Chave de idempotência. Repetir a mesma requisição devolve o movimento
   * original em vez de baixar o saldo duas vezes — é o que protege a tela de um
   * duplo clique ou de um reenvio por timeout.
   */
  idempotency_key: string;
}

/** Uma linha de material que a nota devolve. */
export interface DevolucaoNaNota {
  remittance_item_id: number;
  quantity: string;
  /** RETURN (5902), LEFTOVER ou SCRAP (5903). Vazio vale como RETURN. */
  movement_type?: MovementType;
}

export interface DestinatarioDaNota {
  cnpj: string;
  razao_social: string;
  inscricao_estadual?: string;
  uf: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  codigo_municipio?: string;
  cep?: string;
  email?: string;
  telefone?: string;
}

export interface PedidoDeFaturamento {
  servico: {
    codigo_item?: string;
    descricao: string;
    unidade?: string;
    quantidade: string;
    valor_unitario: string;
  };
  devolucoes: DevolucaoNaNota[];
  /**
   * Opcional, e normalmente ausente: o servidor resolve o destinatário pelo cadastro
   * do cliente da remessa, pelo mesmo caminho da nota de venda. Informar aqui é
   * exceção — serve para uma nota que precisa de endereço diferente do cadastro.
   */
  destinatario?: DestinatarioDaNota;
  /** Vazio usa a série 1, a da operação. */
  serie?: string;
  /** Vazio usa hoje. */
  data_emissao?: string;
}

export interface LinhaDaNota {
  sequencia: number;
  descricao: string;
  ncm: string;
  cfop: string;
  cst_icms: string;
  unidade: string;
  quantidade: string;
  valor_unitario: string;
  valor_total: string;
  cst_pis?: string | null;
  valor_pis: string;
  cst_cofins?: string | null;
  valor_cofins: string;
}

export interface FaturamentoDTO {
  fiscal_exit_id: number;
  numero_nf: number;
  serie: string;
  natureza_operacao: string;
  /** Texto do diferimento que vai nos dados adicionais da nota. */
  observacao: string;
  valor_servico: string;
  valor_material: string;
  valor_total: string;
  valor_pis: string;
  valor_cofins: string;
  /** O que continua em poder da empresa depois desta nota. */
  saldo_restante: string;
  linhas: LinhaDaNota[];
}

/**
 * Fatura o beneficiamento: cria a nota que cobra o serviço (CFOP 5124) e devolve o
 * material do cliente (5902, ou 5903 em sobra e sucata), e baixa o saldo.
 *
 * A nota nasce em RASCUNHO. Transmitir é passo separado, e o backend confere antes
 * se o saldo já foi baixado — nota autorizada sem baixa deixaria material que saiu
 * fiscalmente aparecendo como presente.
 *
 * O CFOP e os CST não são escolhidos aqui: o servidor aplica as regras que a
 * contadora definiu.
 */
export async function faturarBeneficiamento(
  remittanceId: number,
  payload: PedidoDeFaturamento,
): Promise<FaturamentoDTO> {
  const { data } = await httpClient.post(`${BASE}/${remittanceId}/invoice`, payload);
  return unwrapObject(data) as unknown as FaturamentoDTO;
}

function query(filter: RemittanceFilter): string {
  const params = new URLSearchParams();
  if (filter.customer_code) params.set('customer_code', String(filter.customer_code));
  if (filter.nfe_number) params.set('nfe_number', String(filter.nfe_number));
  if (filter.sales_order_code) params.set('sales_order_code', String(filter.sales_order_code));
  if (filter.status?.length) params.set('status', filter.status.join(','));
  if (filter.blocked) params.set('blocked', 'true');
  if (filter.with_balance) params.set('with_balance', 'true');
  if (filter.due_until) params.set('due_until', filter.due_until);
  if (filter.q?.trim()) params.set('q', filter.q.trim());
  if (filter.limit) params.set('limit', String(filter.limit));
  if (filter.offset) params.set('offset', String(filter.offset));
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}

export async function listRemittances(filter: RemittanceFilter = {}): Promise<RemittanceDTO[]> {
  const { data } = await httpClient.get(`${BASE}${query(filter)}`);
  return unwrapArray(data) as unknown as RemittanceDTO[];
}

export async function getRemittance(id: number): Promise<RemittanceDTO> {
  const { data } = await httpClient.get(`${BASE}/${id}`);
  return unwrapObject(data) as unknown as RemittanceDTO;
}

export async function receiveRemittance(payload: NewRemittance): Promise<RemittanceDTO> {
  const { data } = await httpClient.post(BASE, payload);
  return unwrapObject(data) as unknown as RemittanceDTO;
}

/** Saldo de terceiros agregado por cliente e item — a visão do inventário. */
export async function listBalance(filter: {
  customer_code?: number;
  customer_item_code?: string;
  item_code?: number;
  q?: string;
} = {}): Promise<BalanceDTO[]> {
  const params = new URLSearchParams();
  if (filter.customer_code) params.set('customer_code', String(filter.customer_code));
  if (filter.customer_item_code?.trim()) params.set('customer_item_code', filter.customer_item_code.trim());
  if (filter.item_code) params.set('item_code', String(filter.item_code));
  if (filter.q?.trim()) params.set('q', filter.q.trim());
  const texto = params.toString();
  const { data } = await httpClient.get(`${BASE}/balance${texto ? `?${texto}` : ''}`);
  return unwrapArray(data) as unknown as BalanceDTO[];
}

export async function listMovements(itemId: number): Promise<MovementDTO[]> {
  const { data } = await httpClient.get(`${BASE}/items/${itemId}/movements`);
  return unwrapArray(data) as unknown as MovementDTO[];
}

export async function createMovement(itemId: number, payload: NewMovement): Promise<MovementDTO> {
  const { data } = await httpClient.post(`${BASE}/items/${itemId}/movements`, payload);
  return unwrapObject(data) as unknown as MovementDTO;
}

export async function blockRemittance(id: number, reason: string): Promise<void> {
  await httpClient.post(`${BASE}/${id}/block`, { reason });
}

export async function unblockRemittance(id: number): Promise<void> {
  await httpClient.post(`${BASE}/${id}/unblock`, {});
}

/** Encerrar com saldo remanescente exige motivo: é exceção aprovada. */
export async function closeRemittance(id: number, reason: string): Promise<void> {
  await httpClient.post(`${BASE}/${id}/close`, { reason });
}

/**
 * Gera a chave de idempotência de um lançamento. Determinística no conteúdo, para
 * que um duplo clique produza a MESMA chave e o backend devolva o movimento
 * original em vez de baixar o saldo de novo. Inclui a janela de tempo em minutos
 * para que um lançamento legítimo do mesmo valor, minutos depois, seja aceito.
 */
export function movementKey(itemId: number, tipo: MovementType, quantidade: string): string {
  const janela = Math.floor(Date.now() / 60000);
  return `${itemId}-${tipo}-${quantidade}-${janela}`;
}

/** Rótulos em português para os enums do backend. */
export const MOVEMENT_LABELS: Record<MovementType, string> = {
  RETURN: 'Retorno com faturamento',
  LEFTOVER: 'Sobra devolvida',
  SCRAP: 'Sucata',
  ADJUSTMENT: 'Ajuste',
};

export const SCRAP_LABELS: Record<ScrapDestination, string> = {
  CLIENTE: 'Devolvida ao cliente',
  DESCARTE: 'Descarte autorizado',
  RETENCAO: 'Retida pela empresa',
  OUTRA: 'Outra destinação',
};

export const STATUS_LABELS: Record<RemittanceStatus, string> = {
  ABERTA: 'Aberta',
  PARCIAL: 'Retorno parcial',
  ENCERRADA: 'Encerrada',
  CANCELADA: 'Cancelada',
};

/**
 * Um evento do histórico da remessa, como o backend grava por trigger (migração
 * 000371). `before`/`after` são o registro inteiro em JSON: a tela escolhe o que
 * mostrar, e um campo novo na tabela aparece no histórico sem mexer aqui.
 */
export interface AuditEventDTO {
  id: number;
  entity_type: string;
  entity_id: number;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_fields?: string[];
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  actor_id?: string | null;
  actor_name?: string | null;
  actor_email?: string | null;
  occurred_at: string;
}

export async function listRemittanceAudit(id: number, limit?: number): Promise<AuditEventDTO[]> {
  const sufixo = limit && limit > 0 ? `?limit=${limit}` : '';
  const { data } = await httpClient.get(`${BASE}/${id}/audit${sufixo}`);
  return unwrapArray(data) as unknown as AuditEventDTO[];
}

/**
 * Devolve ao saldo do cliente o que uma nota de retorno baixou. O cancelamento da
 * NF-e já faz isso sozinho; esta chamada conclui o caso em que o cancelamento
 * passou na SEFAZ e o estorno falhou no meio. Repetir não devolve duas vezes.
 */
export async function estornarNotaBeneficiamento(
  fiscalExitId: number,
  reason: string,
): Promise<{ reversed: number; movements: MovementDTO[] }> {
  const { data } = await httpClient.post(`${BASE}/notes/${fiscalExitId}/reverse`, { reason });
  const corpo = unwrapObject(data) as unknown as { reversed?: number; movements?: MovementDTO[] };
  return { reversed: corpo.reversed ?? 0, movements: corpo.movements ?? [] };
}

/** Nome da tabela → o que a pessoa chama aquilo. */
export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  customer_material_remittances: 'Remessa',
  customer_material_items: 'Linha da remessa',
  customer_material_movements: 'Movimento',
};

export const AUDIT_ACTION_LABELS: Record<AuditEventDTO['action'], string> = {
  INSERT: 'Inclusão',
  UPDATE: 'Alteração',
  DELETE: 'Exclusão',
};

/**
 * Campos que a auditoria mostra por nome próprio. O que não está aqui aparece com
 * o nome da coluna — melhor um nome técnico do que esconder a alteração.
 */
export const AUDIT_FIELD_LABELS: Record<string, string> = {
  description: 'Descrição',
  ncm: 'NCM',
  cst: 'CST',
  uom: 'Unidade',
  item_code: 'Item interno',
  customer_item_code: 'Código no cliente',
  qty_invoiced: 'Qtd. da nota',
  qty_received: 'Qtd. recebida',
  qty_returned: 'Qtd. retornada',
  qty_leftover: 'Sobra devolvida',
  qty_scrapped: 'Sucata',
  balance_qty: 'Saldo',
  divergence_qty: 'Divergência',
  divergence_reason: 'Motivo da divergência',
  unit_value: 'Valor unitário',
  total_value: 'Valor total',
  status: 'Situação',
  blocked: 'Bloqueada',
  block_reason: 'Motivo do bloqueio',
  closed_at: 'Encerrada em',
  closed_by: 'Encerrada por',
  close_reason: 'Motivo do encerramento',
  fiscal_return_deadline: 'Prazo fiscal',
  sales_order_code: 'Pedido de venda',
  warehouse_id: 'Almoxarifado',
  address: 'Endereço',
  notes: 'Observação',
  nfe_number: 'Nº da NF-e',
  nfe_series: 'Série',
  nfe_key: 'Chave da NF-e',
  cfop: 'CFOP',
  quantity: 'Quantidade',
  movement_type: 'Tipo de movimento',
  reason: 'Motivo',
  scrap_destination: 'Destinação da sucata',
  fiscal_exit_id: 'Nota de retorno',
  reversed_at: 'Estornado em',
  reversed_by: 'Estornado por',
  reversal_reason: 'Motivo do estorno',
};

export function auditFieldLabel(campo: string): string {
  return AUDIT_FIELD_LABELS[campo] ?? campo;
}

/** Valor vazio no histórico é "—": distingue campo apagado de campo em branco. */
export function auditValue(estado: Record<string, unknown> | null | undefined, campo: string): string {
  if (!estado) return '—';
  const v = estado[campo];
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  return String(v);
}

/**
 * Os campos que valem mostrar num evento. Em alteração são os que mudaram; em
 * inclusão e exclusão, o que identifica o registro — o JSON inteiro numa tabela
 * de histórico não se lê.
 */
export function auditChangedFields(evento: AuditEventDTO): string[] {
  if (evento.action === 'UPDATE') return evento.changed_fields ?? [];
  const estado = evento.after ?? evento.before ?? {};
  const resumo: Record<string, string[]> = {
    customer_material_remittances: ['nfe_number', 'nfe_series', 'status', 'total_value'],
    customer_material_items: ['customer_item_code', 'description', 'ncm', 'qty_received'],
    customer_material_movements: ['movement_type', 'quantity', 'cfop'],
  };
  return (resumo[evento.entity_type] ?? Object.keys(estado)).filter((c) => c in estado);
}

/**
 * Rótulos em português para os enums técnicos usados pelo ERP. As telas devem
 * usar `enumLabel(value)` para nunca exibir o valor cru em inglês (ex.: "OPEN",
 * "APPROVED", "SHORTAGE") ao usuário. A função retorna o próprio valor quando não
 * há tradução conhecida, mantendo o fluxo funcional sem expor inglês.
 */

const LABELS: Record<string, string> = {
  // Situações genéricas
  DRAFT: 'Rascunho', OPEN: 'Aberto', CLOSED: 'Encerrado', PENDING: 'Pendente',
  ACTIVE: 'Ativo', INACTIVE: 'Inativo', APPROVED: 'Aprovado', REJECTED: 'Rejeitado',
  CANCELLED: 'Cancelado', OBSOLETE: 'Obsoleto', DONE: 'Concluído',
  IN_PROGRESS: 'Em andamento', SCHEDULED: 'Programado', ARRIVED: 'Recebido',
  IN_CONFERENCE: 'Em conferência', RELEASED: 'Liberado', BLOCKED: 'Bloqueado',
  MANUAL_RELEASED: 'Liberado manualmente', CONFERRED: 'Conferido',
  NOT_ANALYZED: 'Não analisado', ANALYZED: 'Analisado', NOT_CONFERRED: 'Não conferido',
  DIVERGENT: 'Divergente', SUSPENDED: 'Suspenso', PARTIAL: 'Parcial',
  ATTENDED: 'Atendido', NATIONALIZED: 'Nacionalizado',

  // Movimentos / direções
  IN: 'Entrada', OUT: 'Saída', INBOUND: 'Entrada', OUTBOUND: 'Saída',
  SHIPMENT: 'Remessa', RETURN: 'Retorno', RECEIPT: 'Recebimento', ADJUSTMENT: 'Ajuste',
  TRANSFER_IN: 'Transferência (entrada)', TRANSFER_OUT: 'Transferência (saída)',

  // Fornecedores / contratos / avisos
  NORMAL: 'Normal', TRANSPORTADORA: 'Transportadora', TRANSP_REDESP: 'Transportadora/Redespacho',
  REDESPACHO: 'Redespacho',
  SHORTAGE: 'Falta', EXCESS: 'Excesso', DAMAGE: 'Avaria', WRONG_ITEM: 'Item errado',
  PRICE: 'Preço', DOCUMENT: 'Documento', LATE: 'Atraso', OTHER: 'Outro',
  ACCEPTED: 'Aceito', PARTIAL_RETURN: 'Devolução parcial', FULL_RETURN: 'Devolução total',
  WAIVED: 'Dispensado', SUPPLIER_DEBIT: 'Débito ao fornecedor',

  // Tipos de corte / planos
  LINEAR_1D: 'Linear (1D)', GUILLOTINE_2D: 'Guilhotina (2D)', TRUE_SHAPE_2D: 'Forma real (2D)',
  PLANNED: 'Planejado', FIRM: 'Firme', PLANNING_DATA: 'Dados de planejamento',
  PLANNER_DATA: 'Dados do planejador', EQUAL: 'Igual', DIFFERENT: 'Diferente',
  RANGE: 'Faixa', GREATER: 'Maior', LESS: 'Menor', NOT_IN: 'Não está em',

  // Frequências / períodos
  DAILY: 'Diário', WEEKLY: 'Semanal', MONTHLY: 'Mensal', CUSTOM_DAYS: 'Dias personalizados',
  WEEK: 'Semanal', MONTH: 'Mensal', YEARLY: 'Anual', QUARTERLY: 'Trimestral',

  // Inspeção / tolerâncias
  ITEM: 'Item', CLASSIFICATION: 'Classificação',
  RECEIVING_INSPECTION: 'Inspeção de recebimento', RECEIVING_NOTICE: 'Aviso de recebimento',
  SUPPLIER_EVALUATION: 'Avaliação de fornecedor', APPROVAL_LIMIT: 'Limite de aprovação',
  SUPPLIER_CONTRACT: 'Contrato de fornecedor', RECEIVING_CHECKLIST: 'Checklist de recebimento',
  RECEIVING_LABEL: 'Etiqueta de recebimento', SUPPLIER_EDI: 'EDI de fornecedor',
  IMPORT_PROCESS: 'Processo de importação',
  QUANTITY: 'Quantidade', ITEM_PRICE: 'Preço do item', PRODUCTS_TOTAL: 'Total do produto',
  ALL: 'Todos', ENTRY_INVOICE: 'Nota de entrada',
  PERCENT: 'Percentual', FIXED: 'Fixo', WARN: 'Alertar', BLOCK: 'Bloquear', ALLOW: 'Permitir',
  VALUE: 'Valor', WEIGHT: 'Peso',

  // Atendimento / SAC
  ORDER: 'Pedido', DISCONTINUED_ORDER: 'Pedido descontinuado',
  TECHNICAL_VISIT: 'Visita técnica', RESCHEDULE: 'Reprogramar', WAIT: 'Aguardar',

  // Pedido de venda
  R: 'Rascunho', P: 'Confirmado', A: 'Em análise', OA: 'Orçamento em análise',
  OF: 'Orçamento', F: 'Faturado',

  // Operadores / tipos de valor
  '==': 'Igual (==)', '!=': 'Diferente (!=)', '>': 'Maior (>)', '<': 'Menor (<)',
  '>=': 'Maior ou igual (>=)', '<=': 'Menor ou igual (<=)',
  STRING: 'Texto', NUMBER: 'Número', BOOL: 'Sim/Não', DATE: 'Data',

  // Alçadas / parâmetros / EDI de compras
  GLOBAL: 'Global', SUPPLIER: 'Fornecedor', COST_CENTER: 'Centro de custo', CATEGORY: 'Categoria',
  PURCHASE_TABLE: 'Tabela de compra', PURCHASE_ORDER: 'Pedido de compra', QUOTATION: 'Cotação',
  REQUISITION: 'Requisição', INSPECTION: 'Inspeção',
  CONTRACT: 'Contrato', NF_ENTRY: 'Nota de entrada', RECEIVING: 'Recebimento',
  PO_CONFIRMATION: 'Confirmação de pedido', ASN: 'Aviso de remessa', INVOICE: 'Nota fiscal',
  FOB: 'FOB', CIF: 'CIF', FREIGHT: 'Frete',
  ADVANCE_VALUE: 'Valor de adiantamento', FREIGHT_TYPE: 'Tipo de frete',
  JSON: 'JSON',

  // Máscaras de lote / série
  SUPRIMENTOS: 'Suprimentos', PRODUCAO: 'Produção', VENDAS: 'Vendas',
  EXPEDICAO: 'Expedição', GERAL: 'Geral',
  CARACTER: 'Texto fixo', DATA: 'Data', SEQ_NUMERICA: 'Sequência numérica', SEQ_CARACTER: 'Sequência alfabética',

  // Manutenção / paradas de máquina
  MAINTENANCE: 'Manutenção', BREAKDOWN: 'Quebra', SETUP: 'Preparação', QUALITY: 'Qualidade',
};

export function enumLabel(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const text = String(value);
  if (text === 'true') return 'Sim';
  if (text === 'false') return 'Não';
  return LABELS[text] ?? text;
}

/** Rótulos para listas de opções (ex.: `<option value={v}>{enumLabel(v)}</option>`). */
export function enumOption(value: string): { value: string; label: string } {
  return { value, label: enumLabel(value) };
}

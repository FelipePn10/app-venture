import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';

/**
 * Estoque e Almoxarifado — movimentos, saldos, reservas, inventário, tipos de
 * movimento, ATP, genealogia de lote e consumo médio (ROP).
 * Bases: `/api/stock/*` e `/api/estoque/tipos-movimento`.
 */

/**
 * Os tipos que a apuração de saldo reconhece. Precisa bater com
 * `entity.TipoMovimentoValido` no backend: um tipo fora da lista é recusado com
 * 422 — antes era aceito e gravava um movimento que NÃO mexia no saldo.
 * `ADJUST` estava aqui e não existe no backend; o correto é `ADJUSTMENT`.
 * `TRANSF_ENDERECO` não entra: tem rotina própria (transferirEntreEnderecos).
 */
export const MOVEMENT_TYPES = ['IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT'] as const;

export interface MovementDTO {
  /** Data do documento (AAAA-MM-DD). Vazia = hoje. */
  movement_date?: string;
  id?: number;
  item_code: string;
  mask?: string;
  warehouse_id: number;
  movement_type: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  reference_type?: string;
  reference_code?: number;
  lot?: string;
  /** Endereço dentro do almoxarifado; vazio = almoxarifado sem endereçamento. */
  address?: string;
  /** Destino, apenas em transferência interna entre endereços. */
  address_to?: string;
  created_at?: string;
  notes?: string;
  /** Sigla do tipo de movimento do cadastro (VEST0200): decide direção, centro de custo e custo. */
  movement_type_code?: string;
  /** Centro de custo da saída (consumo interno, requisição). */
  cost_center_code?: number;
  /** Este movimento estorna outro / foi estornado por outro. */
  reverses_movement_id?: number;
  reversed_by_movement_id?: number;
}

export interface BalanceDTO {
  id?: number;
  item_code: string;
  mask?: string;
  warehouse_id: number;
  quantity: number;
  reserved_qty: number;
  available_qty: number;
  minimum_stock?: number;
  maximum_stock?: number;
  safety_stock?: number;
  avg_cost?: number;
  last_cost?: number;
  total_cost?: number;
}

export interface AtpDTO {
  item_code: string;
  mask?: string;
  total_on_hand: number;
  total_reserved: number;
  total_available: number;
  /** Saldo em inspeção, rejeição ou almoxarifado indisponível: existe, mas não pode ser prometido. */
  total_not_available: number;
  warehouses: Obj[];
}

export interface ReservationDTO {
  id?: number;
  item_code: string;
  mask?: string;
  warehouse_id: number;
  quantity: number;
  reference_type?: string;
  reference_code?: number;
  /** A linha específica do documento que originou a reserva. */
  reference_item_code?: number;
  /** Quando a reserva passa a valer e quando expira sozinha. */
  reservation_date?: string;
  expiration_date?: string;
  notes?: string;
  status?: string;
}

export interface InventoryDTO {
  id?: number;
  code?: number;
  warehouse_id: number;
  description?: string;
  status?: string;
  total_items?: number;
  counted_items?: number;
  start_date?: string;
  notes?: string;
  /** Inventário parcial: só estes itens (códigos). Vazio = almoxarifado inteiro. */
  item_codes?: string[];
  adjustment_value?: number;
  /** Bloqueia a movimentação dos itens até o inventário terminar. */
  blocks_movements?: boolean;
  /** Quem conta não vê o saldo do sistema enquanto a contagem durar. */
  blind_count?: boolean;
  approval_mode?: "NUNCA" | "FORA_TOLERANCIA" | "SEMPRE";
  tolerance_pct?: number;
  tolerance_value?: number;
  close_reason?: string;
}

/** Tipo de movimento (VEST0200). As flags governam o lançamento manual. */
export interface MovementTypeDTO {
  id?: number;
  sigla: string;
  description: string;
  tipo?: string;
  usage_type?: string;
  entry_exit?: 'ENTRADA' | 'SAIDA' | 'AMBOS' | 'TRANSFERENCIA' | string;
  considers_consumption?: boolean;
  updates_avg_cost?: boolean;
  is_adjustment?: boolean;
  updates_cycle_count?: boolean;
  shows_in_summary?: boolean;
  entry_order?: boolean;
  exit_order?: boolean;
  generates_fci_movement?: boolean;
  requires_cost_center?: boolean;
  allows_manual?: boolean;
  is_active?: boolean;
}

export interface LotBalanceDTO {
  id?: number;
  item_code: string;
  warehouse_id?: number;
  lot: string;
  mask?: string;
  quantity: number;
  last_cost?: number;
  status_code?: string;
  grade?: string;
  expires_at?: string;
}

export interface ConsumptionAvgDTO {
  item_code: string;
  avg_monthly_consumption: number;
  total_consumed: number;
  window_months: number;
  calculated_at?: string;
}

function parseMovement(raw: unknown): MovementDTO {
  const o = unwrapObject(raw);
  return {
    movement_date: parseStr(o, 'movement_date') || undefined,
    id: parseNum(o, 'id', 'ID'),
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    warehouse_id: parseNum(o, 'warehouse_id', 'WarehouseID'),
    movement_type: parseStr(o, 'movement_type', 'MovementType'),
    quantity: parseNum(o, 'quantity', 'Quantity'),
    unit_price: parseNum(o, 'unit_price', 'UnitPrice'),
    total_price: parseNum(o, 'total_price', 'TotalPrice'),
    reference_type: parseStr(o, 'reference_type', 'ReferenceType') || undefined,
    reference_code: parseNum(o, 'reference_code', 'ReferenceCode') || undefined,
    lot: parseStr(o, 'lot', 'Lot') || undefined,
    // O endereço é informado no lançamento; sem lê-lo de volta a grade não
    // conseguia mostrar onde o material entrou ou saiu.
    address: parseStr(o, 'address', 'Address') || undefined,
    address_to: parseStr(o, 'address_to', 'AddressTo') || undefined,
    created_at: parseStr(o, 'created_at', 'CreatedAt') || undefined,
    notes: parseStr(o, 'notes', 'Notes') || undefined,
    movement_type_code: parseStr(o, 'movement_type_code') || undefined,
    cost_center_code: parseNum(o, 'cost_center_code') || undefined,
    reverses_movement_id: parseNum(o, 'reverses_movement_id') || undefined,
    reversed_by_movement_id: parseNum(o, 'reversed_by_movement_id') || undefined,
  };
}
function parseBalance(raw: unknown): BalanceDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    warehouse_id: parseNum(o, 'warehouse_id', 'WarehouseID'),
    quantity: parseNum(o, 'quantity', 'Quantity'),
    reserved_qty: parseNum(o, 'reserved_qty', 'ReservedQty'),
    available_qty: parseNum(o, 'available_qty', 'AvailableQty'),
    minimum_stock: parseNum(o, 'minimum_stock', 'MinimumStock'),
    maximum_stock: parseNum(o, 'maximum_stock', 'MaximumStock'),
    safety_stock: parseNum(o, 'safety_stock', 'SafetyStock'),
    avg_cost: parseNum(o, 'avg_cost', 'AvgCost'),
    last_cost: parseNum(o, 'last_cost', 'LastCost'),
    total_cost: parseNum(o, 'total_cost', 'TotalCost'),
  };
}
function parseReservation(raw: unknown): ReservationDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    warehouse_id: parseNum(o, 'warehouse_id', 'WarehouseID'),
    quantity: parseNum(o, 'quantity', 'Quantity'),
    reference_type: parseStr(o, 'reference_type', 'ReferenceType') || undefined,
    reference_code: parseNum(o, 'reference_code', 'ReferenceCode') || undefined,
    reference_item_code: parseNum(o, 'reference_item_code', 'ReferenceItemCode') || undefined,
    reservation_date: parseStr(o, 'reservation_date', 'ReservationDate') || undefined,
    expiration_date: parseStr(o, 'expiration_date', 'ExpirationDate') || undefined,
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    notes: parseStr(o, 'notes', 'Notes') || undefined,
    status: parseStr(o, 'status', 'Status') || undefined,
  };
}
function parseInventory(raw: unknown): InventoryDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    code: parseNum(o, 'code', 'Code') || undefined,
    warehouse_id: parseNum(o, 'warehouse_id', 'WarehouseID'),
    description: parseStr(o, 'description', 'Description') || undefined,
    status: parseStr(o, 'status', 'Status') || undefined,
    total_items: parseNum(o, 'total_items', 'TotalItems'),
    counted_items: parseNum(o, 'counted_items', 'CountedItems'),
    start_date: parseStr(o, 'start_date') || undefined,
    adjustment_value: parseNum(o, 'adjustment_value') || undefined,
    blocks_movements: Boolean(o['blocks_movements']),
    blind_count: Boolean(o['blind_count']),
    approval_mode: (parseStr(o, 'approval_mode') || 'NUNCA') as InventoryDTO['approval_mode'],
    tolerance_pct: o['tolerance_pct'] != null ? parseNum(o, 'tolerance_pct') : undefined,
    tolerance_value: o['tolerance_value'] != null ? parseNum(o, 'tolerance_value') : undefined,
    close_reason: parseStr(o, 'close_reason') || undefined,
  };
}
function parseMovType(raw: unknown): MovementTypeDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    sigla: parseStr(o, 'sigla', 'Sigla', 'abbreviation'),
    description: parseStr(o, 'description', 'descricao', 'Description'),
    tipo: parseStr(o, 'tipo', 'Tipo', 'type') || undefined,
    usage_type: parseStr(o, 'usage_type') || undefined,
    entry_exit: parseStr(o, 'entry_exit') || undefined,
    considers_consumption: o['considers_consumption'] === true,
    updates_avg_cost: o['updates_avg_cost'] === true,
    is_adjustment: o['is_adjustment'] === true,
    updates_cycle_count: o['updates_cycle_count'] === true,
    shows_in_summary: o['shows_in_summary'] === true,
    entry_order: o['entry_order'] === true,
    exit_order: o['exit_order'] === true,
    generates_fci_movement: o['generates_fci_movement'] === true,
    requires_cost_center: o['requires_cost_center'] === true,
    allows_manual: o['allows_manual'] !== false,
    is_active: o['is_active'] !== false,
  };
}
function parseLot(raw: unknown): LotBalanceDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    warehouse_id: parseNum(o, 'warehouse_id', 'WarehouseID') || undefined,
    lot: parseStr(o, 'lot', 'Lot'),
    quantity: parseNum(o, 'quantity', 'Quantity'),
    last_cost: parseNum(o, 'last_cost', 'LastCost') || undefined,
    mask: parseStr(o, 'mask') || undefined,
    status_code: parseStr(o, 'status_code') || undefined,
    grade: parseStr(o, 'grade') || undefined,
    expires_at: parseStr(o, 'expires_at') || undefined,
  };
}
function parseConsumption(raw: unknown): ConsumptionAvgDTO {
  const o = unwrapObject(raw);
  return {
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    avg_monthly_consumption: parseNum(o, 'avg_monthly_consumption', 'AvgMonthlyConsumption'),
    total_consumed: parseNum(o, 'total_consumed', 'TotalConsumed'),
    window_months: parseNum(o, 'window_months', 'WindowMonths'),
    calculated_at: parseStr(o, 'calculated_at', 'CalculatedAt') || undefined,
  };
}

// ── §1 Movimentos ──
/** Movimentos do mais recente ao mais antigo, por página. */
export async function listMovements(pagina: { limit?: number; offset?: number } = {}): Promise<MovementDTO[]> {
  const { data } = await httpClient.get('/api/stock/movements/list', { params: pagina });
  return unwrapArray(data).map(parseMovement);
}
export async function listMovementsByItem(itemCode: string): Promise<MovementDTO[]> {
  const { data } = await httpClient.get(`/api/stock/movements/item/${itemCode}`);
  return unwrapArray(data).map(parseMovement);
}
export async function createMovement(dto: MovementDTO): Promise<MovementDTO> {
  const { data } = await httpClient.post('/api/stock/movements/create', dto);
  return parseMovement(data);
}

// ── §2 Saldos ──
export async function listBalances(): Promise<BalanceDTO[]> {
  const { data } = await httpClient.get('/api/stock/balances/list');
  return unwrapArray(data).map(parseBalance);
}
export async function listBalancesByItem(itemCode: string): Promise<BalanceDTO[]> {
  const { data } = await httpClient.get(`/api/stock/balances/item/${itemCode}`);
  return unwrapArray(data).map(parseBalance);
}
export async function getAtp(itemCode: string, mask?: string): Promise<AtpDTO> {
  const { data } = await httpClient.get(`/api/stock/balances/atp/${itemCode}`, { params: mask ? { mask } : undefined });
  const o = unwrapObject(data);
  return {
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    mask: parseStr(o, 'mask', 'Mask') || undefined,
    total_on_hand: parseNum(o, 'total_on_hand', 'TotalOnHand'),
    total_reserved: parseNum(o, 'total_reserved', 'TotalReserved'),
    total_available: parseNum(o, 'total_available', 'TotalAvailable'),
    total_not_available: parseNum(o, 'total_not_available'),
    warehouses: unwrapArray(o['warehouses'] ?? o['Warehouses']).map(unwrapObject),
  };
}

// ── §3 Reservas ──
export async function createReservation(dto: ReservationDTO): Promise<ReservationDTO> {
  const { data } = await httpClient.post('/api/stock/reservations/create', dto);
  return parseReservation(data);
}
export async function listReservations(filtro: { itemCode?: string; soAtivas?: boolean } = {}): Promise<ReservationDTO[]> {
  const { data } = await httpClient.get('/api/stock/reservations/list', {
    params: { item_code: filtro.itemCode || undefined, active: filtro.soAtivas ? 'true' : undefined },
  });
  return unwrapArray(data).map(parseReservation);
}
export async function releaseReservation(id: number): Promise<void> {
  await httpClient.patch(`/api/stock/reservations/${id}/release`, {});
}
export async function consumeReservation(id: number): Promise<void> {
  await httpClient.patch(`/api/stock/reservations/${id}/consume`, {});
}

// ── §4 Inventário ──
// Contrato canônico do inventário. `/api/stock/inventories` ainda responde por
// compatibilidade, mas é a rota antiga; usamos `/api/inventory`.
const INVENTORY = '/api/inventory';

export async function listInventories(): Promise<InventoryDTO[]> {
  const { data } = await httpClient.get(`${INVENTORY}/`);
  return unwrapArray(data).map(parseInventory);
}
export async function getInventory(id: number): Promise<InventoryDTO> {
  const { data } = await httpClient.get(`${INVENTORY}/${id}`);
  return parseInventory(data);
}
export async function createInventory(dto: InventoryDTO): Promise<InventoryDTO> {
  const { data } = await httpClient.post(`${INVENTORY}/`, dto);
  return parseInventory(data);
}
export interface InventoryCloseResult { adjustments: number; surplus_qty: number; shortage_qty: number; adjusted_value: number; uncounted_zeroed: number; pending_approval: boolean }
/**
 * Fecha o inventário lançando o ajuste de cada diferença (contado − foto da
 * abertura) ao custo médio. `zerarNaoContados` fecha mesmo com item sem
 * contagem, tratando-o como zero; sem ele, item sem contagem impede.
 */
export async function closeInventory(id: number, zerarNaoContados = false, reason?: string): Promise<InventoryCloseResult> {
  const { data } = await httpClient.post(`${INVENTORY}/${id}/close`, { zerar_nao_contados: zerarNaoContados, reason: reason || undefined });
  const o = unwrapObject(data);
  return {
    adjustments: parseNum(o, 'adjustments'), surplus_qty: parseNum(o, 'surplus_qty'), shortage_qty: parseNum(o, 'shortage_qty'),
    adjusted_value: parseNum(o, 'adjusted_value'), uncounted_zeroed: parseNum(o, 'uncounted_zeroed'),
    pending_approval: Boolean(o['pending_approval']),
  };
}
/** Encerra a contagem: as diferenças aparecem e o inventário vai para a conferência. */
export async function finishInventoryCount(id: number): Promise<InventoryDTO> {
  const { data } = await httpClient.post(`${INVENTORY}/${id}/finish-count`, {});
  return parseInventory(data);
}
/** Devolve linhas à contagem. Sem linhas, as fora da tolerância. */
export async function recountInventory(id: number, lineIds?: number[]): Promise<number> {
  const { data } = await httpClient.post(`${INVENTORY}/${id}/recount`, { line_ids: lineIds });
  return parseNum(unwrapObject(data), 'lines');
}
export async function countInventoryItem(dto: { inventory_id: number; item_code: string; warehouse_id: number; address?: string; lot?: string; counted_qty: number; adjustment_type?: string; adjustment_reason?: string }): Promise<Obj> {
  const { data } = await httpClient.post(`${INVENTORY}/count`, dto);
  return unwrapObject(data);
}
/**
 * Aplica o acerto de inventário. `adjustment_type` é obrigatório no backend
 * (`IN`, `OUT` ou `NONE`) — sem ele a chamada volta 422 e o ajuste não acontece.
 * O motivo é o que a auditoria lê depois para saber por que o saldo mudou sem
 * nota nem produção.
 */
export async function adjustInventoryItem(dto: { inventory_id: number; item_code: string; warehouse_id: number; adjustment_type: string; adjustment_reason?: string }): Promise<Obj> {
  const { data } = await httpClient.post(`${INVENTORY}/adjust`, dto);
  return unwrapObject(data);
}
export async function listInventoryItems(id: number): Promise<Obj[]> {
  const { data } = await httpClient.get(`${INVENTORY}/${id}/items`);
  return unwrapArray(data).map(unwrapObject);
}

// ── Fechamento de estoque ──
export interface FechamentoDTO {
  id: number; competence: string; status: string; total_value: number; recalculated_items: number;
  variance_value: number; journal_posted: boolean; closed_at: string; reopen_reason?: string;
}
export interface ResultadoFechamentoDTO {
  competence: string; simulation: boolean; items_in_snapshot: number; total_value: number; recalculated_items: number;
  changed_movements: number; recalc_variance: number; negative_stock_variance: number; journal_posted: boolean;
  production_consumption: number; production_delivery: number; production_absorbed: number; production_variance: number;
  obsolete_provision: number; obsolete_provision_change: number;
  blocking: string[]; warnings: string[];
}
function parseResultadoFechamento(raw: unknown): ResultadoFechamentoDTO {
  const o = unwrapObject(raw);
  const textos = (k: string) => (Array.isArray(o[k]) ? (o[k] as unknown[]).map(String) : []);
  return {
    competence: parseStr(o, 'competence'), simulation: Boolean(o['simulation']), items_in_snapshot: parseNum(o, 'items_in_snapshot'),
    total_value: parseNum(o, 'total_value'), recalculated_items: parseNum(o, 'recalculated_items'), changed_movements: parseNum(o, 'changed_movements'),
    recalc_variance: parseNum(o, 'recalc_variance'), negative_stock_variance: parseNum(o, 'negative_stock_variance'),
    production_consumption: parseNum(o, 'production_consumption'), production_delivery: parseNum(o, 'production_delivery'),
    production_absorbed: parseNum(o, 'production_absorbed'), production_variance: parseNum(o, 'production_variance'),
    obsolete_provision: parseNum(o, 'obsolete_provision'), obsolete_provision_change: parseNum(o, 'obsolete_provision_change'),
    journal_posted: Boolean(o['journal_posted']), blocking: textos('blocking'), warnings: textos('warnings'),
  };
}
export async function listFechamentos(): Promise<FechamentoDTO[]> {
  const { data } = await httpClient.get('/api/stock/closings');
  return unwrapArray(data).map((raw) => {
    const o = unwrapObject(raw);
    return {
      id: parseNum(o, 'id'), competence: parseStr(o, 'competence'), status: parseStr(o, 'status'), total_value: parseNum(o, 'total_value'),
      recalculated_items: parseNum(o, 'recalculated_items'), variance_value: parseNum(o, 'variance_value'), journal_posted: Boolean(o['journal_posted']),
      closed_at: parseStr(o, 'closed_at'), reopen_reason: parseStr(o, 'reopen_reason') || undefined,
    };
  });
}
export async function simularFechamento(competence: string): Promise<ResultadoFechamentoDTO> {
  const { data } = await httpClient.post('/api/stock/closings/simulate', { competence });
  return parseResultadoFechamento(data);
}
export async function fecharMesEstoque(competence: string): Promise<ResultadoFechamentoDTO> {
  const { data } = await httpClient.post('/api/stock/closings', { competence });
  return parseResultadoFechamento(data);
}
export async function reabrirMesEstoque(id: number, reason: string): Promise<void> {
  await httpClient.post(`/api/stock/closings/${id}/reopen`, { reason });
}

// ── Conferência do saldo ──
export type InconsistenciaTipo = "SALDO_X_MOVIMENTOS" | "LOTE_X_SALDO" | "RESERVADO_X_RESERVAS";
export interface InconsistenciaDTO {
  kind: InconsistenciaTipo; item_code: string; business_code: string; name: string; mask: string; warehouse_id: number;
  recorded_qty: number; expected_qty: number; difference_qty: number;
}
export async function listInconsistencias(filtro: { warehouseId?: number; itemCode?: string } = {}): Promise<InconsistenciaDTO[]> {
  const { data } = await httpClient.get('/api/stock/inconsistencies', {
    params: { warehouse_id: filtro.warehouseId || undefined, item_code: filtro.itemCode || undefined },
  });
  return unwrapArray(data).map((raw) => {
    const o = unwrapObject(raw);
    return {
      kind: parseStr(o, 'kind') as InconsistenciaTipo, item_code: parseStr(o, 'item_code'), business_code: parseStr(o, 'business_code'),
      name: parseStr(o, 'name'), mask: parseStr(o, 'mask'), warehouse_id: parseNum(o, 'warehouse_id'),
      recorded_qty: parseNum(o, 'recorded_qty'), expected_qty: parseNum(o, 'expected_qty'), difference_qty: parseNum(o, 'difference_qty'),
    };
  });
}
export async function acertarInconsistencia(dto: { kind: InconsistenciaTipo; item_code: string; mask: string; warehouse_id: number; reason: string }): Promise<void> {
  await httpClient.post('/api/stock/inconsistencies/fix', dto);
}

// ── §5 Tipos de movimento ──
export async function listMovementTypes(): Promise<MovementTypeDTO[]> {
  const { data } = await httpClient.get('/api/estoque/tipos-movimento/');
  return unwrapArray(data).map(parseMovType);
}
export async function getMovementTypeBySigla(sigla: string): Promise<MovementTypeDTO> {
  const { data } = await httpClient.get(`/api/estoque/tipos-movimento/sigla/${sigla}`);
  return parseMovType(data);
}
export async function createMovementType(dto: MovementTypeDTO): Promise<MovementTypeDTO> {
  const { data } = await httpClient.post('/api/estoque/tipos-movimento/', dto);
  return parseMovType(data);
}
/** Altera o tipo (a sigla não muda). Manda todas as flags: ausente vira falso no backend. */
export async function updateMovementType(dto: MovementTypeDTO): Promise<MovementTypeDTO> {
  const { data } = await httpClient.put('/api/estoque/tipos-movimento/', dto);
  return parseMovType(data);
}

// ── §7 Lotes / genealogia ──
/**
 * Registra a rastreabilidade do lote de matéria-prima. `received_at` é a data em
 * que o material entrou (YYYY-MM-DD): é dela que sai a idade do lote no PEPS e a
 * resposta para "de que remessa veio essa peça?" numa auditoria.
 */
export async function registerLot(dto: { item_code: string; lot: string; heat_number?: string; certificate?: string; supplier_code?: number; received_at?: string; expires_at?: string; notes?: string }): Promise<Obj> {
  const { data } = await httpClient.post('/api/stock/lots/register', dto);
  return unwrapObject(data);
}

// ── §7.1 Endereçamento e separação ──
export interface SaldoEnderecoDTO {
  item_code: string;
  warehouse_id: number;
  address: string;
  lot: string;
  quantity: number;
  last_cost: number;
}

export interface LinhaSeparacaoDTO {
  lot: string;
  address: string;
  warehouse_id: number;
  heat_number: string | null;
  certificate: string | null;
  expires_at: string | null;
  received_at: string | null;
  available_qty: number;
  suggested_qty: number;
  zone: string;
  /** Ordem física do endereço na rota de separação. */
  pick_sequence: number;
}

export interface SugestaoSeparacaoDTO {
  item_code: string;
  rule: string;
  required_qty: number;
  covered_qty: number;
  missing_qty: number;
  expired_skipped: number;
  blocked_skipped: number;
  lines: LinhaSeparacaoDTO[];
}

/**
 * Move material entre endereços do mesmo almoxarifado. É UM movimento com
 * origem e destino — dois movimentos espelhados dobrariam a quantidade nos
 * relatórios de giro. O lote acompanha o material.
 */
export async function transferirEntreEnderecos(dto: {
  item_code: string; warehouse_id: number; address_from: string; address_to: string;
  quantity: number; mask?: string; lot?: string; notes?: string;
}): Promise<Obj> {
  const { data } = await httpClient.post('/api/stock/separation/transfer', dto);
  return unwrapObject(data);
}

export interface SugestaoGuardaDTO {
  address: string;
  zone: string;
  reason: string;
  current_qty: number;
  capacity: number | null;
  fits: boolean;
  pick_sequence: number;
}

export interface ItemABCDTO {
  item_code: string;
  abc_class: string;
  consumption_value: number;
  share_pct: number;
  cumulative_pct: number;
}

export interface ResumoABCDTO {
  window_months: number;
  total_value: number;
  classified: number;
  cut_a_pct: number;
  cut_b_pct: number;
  items: ItemABCDTO[];
}

/**
 * Onde guardar o material recebido. A ordem das sugestões é endereço fixo do
 * item → consolidação com o saldo que já está lá → endereço vazio da zona →
 * qualquer um com espaço. Endereço bloqueado nunca aparece.
 */
export async function sugerirGuarda(
  itemCode: string, quantidade: number, warehouseId: number, zona = '', mask = '',
): Promise<SugestaoGuardaDTO[]> {
  const params: Record<string, string> = { qty: String(quantidade), warehouse_id: String(warehouseId) };
  if (zona) params.zone = zona;
  if (mask) params.mask = mask;
  const { data } = await httpClient.get(`/api/stock/putaway/suggest/${itemCode}`, { params });
  return unwrapArray(data).map((raw) => {
    const o = unwrapObject(raw);
    return {
      address: parseStr(o, 'address', 'Address'),
      zone: parseStr(o, 'zone', 'Zone'),
      reason: parseStr(o, 'reason', 'Motivo'),
      current_qty: parseNum(o, 'current_qty', 'SaldoAtual'),
      capacity: (o as Record<string, unknown>).capacity == null ? null : parseNum(o, 'capacity', 'Capacidade'),
      fits: (o as Record<string, unknown>).fits !== false,
      pick_sequence: parseNum(o, 'pick_sequence', 'PickSeq'),
    };
  });
}

/**
 * Recalcula a curva ABC pelo VALOR consumido na janela — mil parafusos baratos
 * não são um item A. Grava a classe no item, que passa a governar a frequência
 * da contagem cíclica.
 */
export async function apurarCurvaABC(janelaMeses = 12, corteA = 80, corteB = 95): Promise<ResumoABCDTO> {
  const { data } = await httpClient.post('/api/stock/abc/recalc', {
    window_months: janelaMeses, cut_a_pct: corteA, cut_b_pct: corteB,
  });
  const o = unwrapObject(data);
  return {
    window_months: parseNum(o, 'window_months', 'JanelaMeses'),
    total_value: parseNum(o, 'total_value', 'ValorTotal'),
    classified: parseNum(o, 'classified', 'Classificados'),
    cut_a_pct: parseNum(o, 'cut_a_pct', 'CorteA'),
    cut_b_pct: parseNum(o, 'cut_b_pct', 'CorteB'),
    items: unwrapArray((o as Record<string, unknown>).items).map((raw) => {
      const i = unwrapObject(raw);
      return {
        item_code: parseStr(i, 'item_code', 'ItemCode'),
        abc_class: parseStr(i, 'abc_class', 'Classe'),
        consumption_value: parseNum(i, 'consumption_value', 'ValorConsumido'),
        share_pct: parseNum(i, 'share_pct', 'ParticipacaoPct'),
        cumulative_pct: parseNum(i, 'cumulative_pct', 'AcumuladoPct'),
      };
    }),
  };
}

export interface LinhaOndaDTO {
  id: number;
  item_code: string;
  lot: string;
  address: string;
  zone: string;
  pick_sequence: number;
  quantity: number;
  picked_qty: number;
  heat_number: string | null;
  expires_at: string | null;
  reference_type: string | null;
  reference_code: number | null;
}

export interface OndaDTO {
  id: number;
  code: number;
  warehouse_id: number;
  status: string;
  rule: string;
  lines: LinhaOndaDTO[];
  missing: { item_code: string; quantity: number }[];
}

function parseOnda(raw: unknown): OndaDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID'),
    code: parseNum(o, 'code', 'Code'),
    warehouse_id: parseNum(o, 'warehouse_id', 'WarehouseID'),
    status: parseStr(o, 'status', 'Status'),
    rule: parseStr(o, 'rule', 'Rule'),
    lines: unwrapArray((o as Record<string, unknown>).lines).map((raw2) => {
      const l = unwrapObject(raw2);
      return {
        id: parseNum(l, 'id', 'ID'),
        item_code: parseStr(l, 'item_code', 'ItemCode'),
        lot: parseStr(l, 'lot', 'Lot'),
        address: parseStr(l, 'address', 'Address'),
        zone: parseStr(l, 'zone', 'Zone'),
        pick_sequence: parseNum(l, 'pick_sequence', 'PickSequence'),
        quantity: parseNum(l, 'quantity', 'Quantity'),
        picked_qty: parseNum(l, 'picked_qty', 'PickedQty'),
        heat_number: parseStr(l, 'heat_number', 'HeatNumber') || null,
        expires_at: parseStr(l, 'expires_at', 'ExpiresAt') || null,
        reference_type: parseStr(l, 'reference_type', 'ReferenceType') || null,
        reference_code: parseNum(l, 'reference_code', 'ReferenceCode') || null,
      };
    }),
    missing: unwrapArray((o as Record<string, unknown>).missing).map((raw2) => {
      const m = unwrapObject(raw2);
      return { item_code: parseStr(m, 'item_code', 'ItemCode'), quantity: parseNum(m, 'quantity', 'Quantity') };
    }),
  };
}

/**
 * Cria a onda: agrupa várias necessidades numa caminhada só e RESERVA o que
 * alocou no endereço/lote — sem a reserva, duas ondas mandam o separador ao
 * mesmo endereço atrás da mesma peça. A onda nasce mesmo faltando saldo; o que
 * não coube vem em `missing`.
 */
export async function criarOndaSeparacao(dto: {
  warehouse_id: number; rule?: string;
  lines: { item_code: string; quantity: string; mask?: string; reference_type?: string; reference_code?: number }[];
}): Promise<OndaDTO> {
  const { data } = await httpClient.post('/api/stock/waves', dto);
  return parseOnda(data);
}

/** Encerra a onda com o que foi separado. Linha de pedido não baixa: a saída é da nota fiscal. */
export async function confirmarOndaSeparacao(code: number, lines: { id: number; picked_qty: string }[]): Promise<OndaDTO> {
  const { data } = await httpClient.post(`/api/stock/waves/${code}/confirm`, { lines });
  return parseOnda(data);
}

export async function listarOndas(status?: string): Promise<OndaDTO[]> {
  const { data } = await httpClient.get('/api/stock/waves/', { params: status ? { status } : undefined });
  return unwrapArray(data).map(parseOnda);
}

export interface LinhaPedidoOndaDTO { item_code: string; mask: string; quantity: string; reference_code: number; }
/** O que falta separar do pedido neste almoxarifado. */
export async function linhasDoPedidoParaOnda(pedido: number, warehouseId: number): Promise<LinhaPedidoOndaDTO[]> {
  const { data } = await httpClient.get(`/api/stock/waves/order-lines/${pedido}`, { params: { warehouse_id: warehouseId } });
  return unwrapArray(data).map((r) => {
    const o = unwrapObject(r);
    return { item_code: parseStr(o, 'item_code'), mask: parseStr(o, 'mask'), quantity: parseStr(o, 'quantity'), reference_code: parseNum(o, 'reference_code') };
  });
}
export async function linhasDaCargaParaOnda(carga: number, warehouseId: number): Promise<LinhaPedidoOndaDTO[]> {
  const { data } = await httpClient.get(`/api/stock/waves/load-lines/${carga}`, { params: { warehouse_id: warehouseId } });
  return unwrapArray(data).map((r) => {
    const o = unwrapObject(r);
    return { item_code: parseStr(o, 'item_code'), mask: parseStr(o, 'mask'), quantity: parseStr(o, 'quantity'), reference_code: parseNum(o, 'reference_code') };
  });
}

// ── Coletor ──
export interface LeituraDTO {
  kind: 'ITEM' | 'ENDERECO'; item_code?: string; name?: string; uom?: string; lot?: string; expires_at?: string;
  quantity?: number; address?: string; warehouse_id?: number; blocked?: boolean;
}
/** O que o leitor de código de barras leu: item, lote ou endereço. */
export async function resolverLeitura(code: string, warehouseId?: number): Promise<LeituraDTO> {
  const { data } = await httpClient.get('/api/stock/scan', { params: { code, warehouse_id: warehouseId || undefined } });
  const o = unwrapObject(data);
  return {
    kind: parseStr(o, 'kind') as LeituraDTO['kind'], item_code: parseStr(o, 'item_code') || undefined, name: parseStr(o, 'name') || undefined,
    uom: parseStr(o, 'uom') || undefined, lot: parseStr(o, 'lot') || undefined, expires_at: parseStr(o, 'expires_at') || undefined,
    quantity: o['quantity'] != null ? parseNum(o, 'quantity') : undefined, address: parseStr(o, 'address') || undefined,
    warehouse_id: parseNum(o, 'warehouse_id') || undefined, blocked: o['blocked'] === true,
  };
}

// ── Transferência em duas etapas ──
export interface TransitoDTO {
  id: number; code: number; item_code: string; lot?: string; from_warehouse_id: number; transit_warehouse_id: number; to_warehouse_id: number;
  quantity: number; received_qty: number; returned_qty: number; lost_qty: number; status: string; expected_date?: string; created_at?: string;
}
function parseTransito(raw: unknown): TransitoDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id'), code: parseNum(o, 'code'), item_code: parseStr(o, 'item_code'), lot: parseStr(o, 'lot') || undefined,
    from_warehouse_id: parseNum(o, 'from_warehouse_id'), transit_warehouse_id: parseNum(o, 'transit_warehouse_id'), to_warehouse_id: parseNum(o, 'to_warehouse_id'),
    quantity: parseNum(o, 'quantity'), received_qty: parseNum(o, 'received_qty'), returned_qty: parseNum(o, 'returned_qty'), lost_qty: parseNum(o, 'lost_qty'),
    status: parseStr(o, 'status'), expected_date: parseStr(o, 'expected_date') || undefined, created_at: parseStr(o, 'created_at') || undefined,
  };
}
export async function listarTransitos(soAbertos: boolean): Promise<TransitoDTO[]> {
  const { data } = await httpClient.get('/api/stock/transit', { params: soAbertos ? { open: 'true' } : undefined });
  return unwrapArray(data).map(parseTransito);
}
export async function enviarParaTransito(dto: {
  item_code: string; from_warehouse_id: number; to_warehouse_id: number; transit_warehouse_id?: number; quantity: string;
  lot?: string; from_address?: string; expected_date?: string; notes?: string;
}): Promise<TransitoDTO> {
  const { data } = await httpClient.post('/api/stock/transit', dto);
  return parseTransito(data);
}
export async function baixarTransito(id: number, dto: { action: 'RECEBER' | 'DEVOLVER' | 'PERDA'; quantity: string; address?: string; reason?: string }): Promise<TransitoDTO> {
  const { data } = await httpClient.post(`/api/stock/transit/${id}/settle`, dto);
  return parseTransito(data);
}

/** Devolve o reservado sem mexer no estoque físico. */
export async function cancelarOndaSeparacao(code: number): Promise<OndaDTO> {
  const { data } = await httpClient.post(`/api/stock/waves/${code}/cancel`, {});
  return parseOnda(data);
}

/** Saldo quebrado por endereço — responde "onde está", não só "quanto tem". */
export async function listarSaldoPorEndereco(warehouseId?: number, itemCode?: string): Promise<SaldoEnderecoDTO[]> {
  const params: Record<string, string> = {};
  if (warehouseId) params.warehouse_id = String(warehouseId);
  if (itemCode) params.item_code = itemCode;
  const { data } = await httpClient.get('/api/stock/balances/by-address', { params });
  return unwrapArray(data).map((raw) => {
    const o = unwrapObject(raw);
    return {
      item_code: parseStr(o, 'item_code', 'ItemCode'),
      warehouse_id: parseNum(o, 'warehouse_id', 'WarehouseID'),
      address: parseStr(o, 'address', 'Address'),
      lot: parseStr(o, 'lot', 'Lot'),
      quantity: parseNum(o, 'quantity', 'Quantity'),
      last_cost: parseNum(o, 'last_cost', 'LastCost'),
    };
  });
}

/**
 * Sugestão de separação: de qual lote e endereço tirar. `rule` FEFO (padrão,
 * vence antes sai antes) ou FIFO. Lote vencido nunca é sugerido — vem contado
 * em `expired_skipped` para a tela avisar.
 */
export async function sugerirSeparacao(
  itemCode: string, quantidade: number, warehouseId?: number, regra: 'FEFO' | 'FIFO' = 'FEFO', mask = '',
): Promise<SugestaoSeparacaoDTO> {
  const params: Record<string, string> = { qty: String(quantidade), rule: regra };
  if (warehouseId) params.warehouse_id = String(warehouseId);
  if (mask) params.mask = mask;
  const { data } = await httpClient.get(`/api/stock/separation/suggest/${itemCode}`, { params });
  const o = unwrapObject(data);
  return {
    item_code: parseStr(o, 'item_code', 'ItemCode'),
    rule: parseStr(o, 'rule', 'Regra') || 'FEFO',
    required_qty: parseNum(o, 'required_qty', 'Necessario'),
    covered_qty: parseNum(o, 'covered_qty', 'Atendido'),
    missing_qty: parseNum(o, 'missing_qty', 'EmFalta'),
    expired_skipped: parseNum(o, 'expired_skipped', 'VencidosFora'),
    blocked_skipped: parseNum(o, 'blocked_skipped', 'BloqueadosFora'),
    lines: unwrapArray((o as Record<string, unknown>).lines).map((raw) => {
      const l = unwrapObject(raw);
      return {
        lot: parseStr(l, 'lot', 'Lot'),
        address: parseStr(l, 'address', 'Address'),
        warehouse_id: parseNum(l, 'warehouse_id', 'WarehouseID'),
        heat_number: parseStr(l, 'heat_number', 'HeatNumber') || null,
        certificate: parseStr(l, 'certificate', 'Certificate') || null,
        expires_at: parseStr(l, 'expires_at', 'ExpiresAt') || null,
        received_at: parseStr(l, 'received_at', 'ReceivedAt') || null,
        available_qty: parseNum(l, 'available_qty', 'Disponivel'),
        suggested_qty: parseNum(l, 'suggested_qty', 'Sugerido'),
        zone: parseStr(l, 'zone', 'Zone'),
        pick_sequence: parseNum(l, 'pick_sequence', 'PickSequence'),
      };
    }),
  };
}
export async function listLotsByItem(itemCode: string): Promise<LotBalanceDTO[]> {
  const { data } = await httpClient.get(`/api/stock/lots/item/${itemCode}`);
  return unwrapArray(data).map(parseLot);
}
export interface SituacaoLoteDTO { code: string; description: string; allows_issue: boolean; allows_transfer: boolean; counts_available: boolean; is_active: boolean }
export async function listSituacoesLote(): Promise<SituacaoLoteDTO[]> {
  const { data } = await httpClient.get('/api/stock/lot-statuses');
  return unwrapArray(data).map((raw) => {
    const o = unwrapObject(raw);
    return {
      code: parseStr(o, 'code'), description: parseStr(o, 'description'), allows_issue: Boolean(o['allows_issue']),
      allows_transfer: Boolean(o['allows_transfer']), counts_available: Boolean(o['counts_available']), is_active: Boolean(o['is_active']),
    };
  });
}
export async function salvarSituacaoLote(dto: SituacaoLoteDTO): Promise<void> {
  await httpClient.put('/api/stock/lot-statuses', dto);
}
export interface ParametrosEstoqueDTO {
  expired_lot_action: "BLOQUEAR" | "AVISAR"; retroactive_months: string; tolerance_a: string; tolerance_b: string; tolerance_c: string;
  obsolete_days: string; obsolete_provision_pct: string; consignment_warehouse_id: string; consignment_days: string;
}
export async function getParametrosEstoque(): Promise<ParametrosEstoqueDTO> {
  const { data } = await httpClient.get('/api/stock/parameters');
  const o = unwrapObject(data);
  const t = (k: string) => (o[k] == null ? "" : String(o[k]));
  return {
    expired_lot_action: parseStr(o, 'expired_lot_action') === 'AVISAR' ? 'AVISAR' : 'BLOQUEAR', retroactive_months: t('retroactive_months'),
    tolerance_a: t('tolerance_a'), tolerance_b: t('tolerance_b'), tolerance_c: t('tolerance_c'),
    obsolete_days: t('obsolete_days'), obsolete_provision_pct: t('obsolete_provision_pct'),
    consignment_warehouse_id: t('consignment_warehouse_id'), consignment_days: t('consignment_days'),
  };
}
export async function salvarParametrosEstoque(p: ParametrosEstoqueDTO): Promise<void> {
  const numero = (v: string, rotulo: string) => {
    const n = Number(v.trim().replace(",", "."));
    if (!Number.isFinite(n)) throw new Error(`${rotulo}: informe um número.`);
    return n;
  };
  const inteiro = (v: string, rotulo: string) => (v.trim() === "" ? null : Math.trunc(numero(v, rotulo)));
  const decimal = (v: string, rotulo: string) => (v.trim() === "" ? null : String(numero(v, rotulo)));
  await httpClient.put('/api/stock/parameters', {
    expired_lot_action: p.expired_lot_action, retroactive_months: inteiro(p.retroactive_months, "Meses retroativos"),
    tolerance_a: decimal(p.tolerance_a, "Tolerância A"), tolerance_b: decimal(p.tolerance_b, "Tolerância B"), tolerance_c: decimal(p.tolerance_c, "Tolerância C"),
    obsolete_days: inteiro(p.obsolete_days, "Obsoleto após"), obsolete_provision_pct: decimal(p.obsolete_provision_pct, "Provisão"),
    consignment_warehouse_id: inteiro(p.consignment_warehouse_id, "Almoxarifado de consignação"), consignment_days: inteiro(p.consignment_days, "Prazo da consignação"),
  });
}
export interface MotivoDivergenciaDTO { code: string; description: string; is_active: boolean }
export async function listarMotivosDivergencia(): Promise<MotivoDivergenciaDTO[]> {
  const { data } = await httpClient.get('/api/stock/discrepancy-reasons');
  return unwrapArray(data).map((r) => { const o = unwrapObject(r); return { code: parseStr(o, 'code'), description: parseStr(o, 'description'), is_active: Boolean(o['is_active']) }; });
}
export async function salvarMotivoDivergencia(dto: MotivoDivergenciaDTO): Promise<void> {
  await httpClient.put('/api/stock/discrepancy-reasons', dto);
}
export interface CartaoKanbanDTO {
  id: number; item_code: string; name: string; warehouse_id?: number; card_count: number; quantity_per_card: number; reorder_point: number;
  container_type?: string; status: string; available_qty: number; manufactured: boolean;
}
const parseCartao = (r: unknown): CartaoKanbanDTO => {
  const o = unwrapObject(r);
  return {
    id: parseNum(o, 'id'), item_code: parseStr(o, 'item_code'), name: parseStr(o, 'name'), warehouse_id: o['warehouse_id'] != null ? parseNum(o, 'warehouse_id') : undefined,
    card_count: parseNum(o, 'card_count'), quantity_per_card: parseNum(o, 'quantity_per_card'), reorder_point: parseNum(o, 'reorder_point'),
    container_type: parseStr(o, 'container_type') || undefined, status: parseStr(o, 'status'), available_qty: parseNum(o, 'available_qty'), manufactured: Boolean(o['manufactured']),
  };
};
export async function listarCartoesKanban(): Promise<CartaoKanbanDTO[]> {
  const { data } = await httpClient.get('/api/stock/kanban');
  return unwrapArray(data).map(parseCartao);
}
export async function salvarCartaoKanban(dto: { id?: number; item_code: string; warehouse_id?: number; card_count: number; quantity_per_card: string; reorder_point: string; container_type?: string; status: string }): Promise<void> {
  await httpClient.put('/api/stock/kanban', dto);
}
export async function acionarCartaoKanban(id: number, cards: number): Promise<void> {
  await httpClient.post(`/api/stock/kanban/${id}/trigger`, { cards });
}
export interface IdadeLoteDTO { item_code: string; business_code: string; name: string; lot: string; warehouse_id: number; quantity: number; value: number; received_at?: string; age_days?: number }
export async function getIdadeDosLotes(almox?: number): Promise<IdadeLoteDTO[]> {
  const { data } = await httpClient.get('/api/stock/aging/lots', { params: { warehouse_id: almox || undefined } });
  return unwrapArray(data).map((r) => {
    const o = unwrapObject(r);
    return {
      item_code: parseStr(o, 'item_code'), business_code: parseStr(o, 'business_code'), name: parseStr(o, 'name'), lot: parseStr(o, 'lot'),
      warehouse_id: parseNum(o, 'warehouse_id'), quantity: parseNum(o, 'quantity'), value: parseNum(o, 'value'),
      received_at: parseStr(o, 'received_at') || undefined, age_days: o['age_days'] != null ? parseNum(o, 'age_days') : undefined,
    };
  });
}
export interface NiveisDTO { daily_consumption: number; lead_time_days: number; safety_days: number; safety_qty: number; minimum_qty: number; maximum_qty: number }
export async function sugerirNiveis(itemCode: string, almox?: number, mask?: string): Promise<NiveisDTO> {
  const { data } = await httpClient.get('/api/stock/replenishment/suggest-levels', { params: { item_code: itemCode, warehouse_id: almox || undefined, mask: mask || undefined } });
  const o = unwrapObject(data);
  return {
    daily_consumption: parseNum(o, 'daily_consumption'), lead_time_days: parseNum(o, 'lead_time_days'), safety_days: parseNum(o, 'safety_days'),
    safety_qty: parseNum(o, 'safety_qty'), minimum_qty: parseNum(o, 'minimum_qty'), maximum_qty: parseNum(o, 'maximum_qty'),
  };
}
export interface ControleItemDTO { controls_lot: boolean; controls_address: boolean; lot_issue_rule: "FEFO" | "FIFO" }
export async function getControleDoItem(itemCode: string): Promise<ControleItemDTO> {
  const { data } = await httpClient.get(`/api/stock/item-control/${encodeURIComponent(itemCode)}`);
  const o = unwrapObject(data);
  return { controls_lot: Boolean(o['controls_lot']), controls_address: Boolean(o['controls_address']), lot_issue_rule: parseStr(o, 'lot_issue_rule') === 'FIFO' ? 'FIFO' : 'FEFO' };
}
export async function salvarControleDoItem(itemCode: string, dto: ControleItemDTO): Promise<void> {
  await httpClient.put(`/api/stock/item-control/${encodeURIComponent(itemCode)}`, dto);
}
export async function mudarSituacaoDoLote(dto: { item_code: string; mask?: string; lot: string; status_code?: string; grade?: string; reason: string }): Promise<void> {
  await httpClient.post('/api/stock/lots/status', dto);
}
export async function implantarLote(dto: { item_code: string; warehouse_id: number; address?: string; lot: string; quantity: number }): Promise<void> {
  await httpClient.post('/api/stock/lots/implant', { ...dto, quantity: String(dto.quantity) });
}
export async function getLotGenealogy(itemCode: string, lot: string): Promise<Obj> {
  const { data } = await httpClient.get(`/api/stock/lots/genealogy/${itemCode}/${encodeURIComponent(lot)}`);
  return unwrapObject(data);
}

// ── §8 Consumo médio (ROP) ──
export async function recalcConsumptionAverage(itemCode?: string): Promise<Obj> {
  const { data } = await httpClient.post('/api/stock/consumption-average/recalc', itemCode ? { item_code: itemCode } : {});
  return unwrapObject(data);
}
export async function getConsumptionAverage(itemCode: string): Promise<ConsumptionAvgDTO> {
  const { data } = await httpClient.get(`/api/stock/consumption-average/${itemCode}`);
  return parseConsumption(data);
}

// ── §9 Operações (transferência, estorno, kardex, posição, reposição, análise) ──

export async function transferirEntreAlmoxarifados(dto: {
  item_code: string; from_warehouse_id: number; to_warehouse_id: number; quantity: string;
  lot?: string; from_address?: string; to_address?: string; notes?: string;
}): Promise<{ saida: MovementDTO; entrada: MovementDTO }> {
  const { data } = await httpClient.post('/api/stock/transfers', dto);
  const o = unwrapObject(data);
  return { saida: parseMovement(o['saida']), entrada: parseMovement(o['entrada']) };
}

/** Estorna um movimento manual ou uma transferência (as duas pernas). Motivo obrigatório. */
export async function estornarMovimento(id: number, reason: string): Promise<MovementDTO[]> {
  const { data } = await httpClient.post(`/api/stock/movements/${id}/reverse`, { reason });
  return unwrapArray(data).map(parseMovement);
}

export interface KardexLinhaDTO {
  /** Data do documento (AAAA-MM-DD): a que vale para o saldo. */
  movement_date: string;
  movement_id: number; date: string; movement_type: string; movement_type_code?: string;
  reference_type?: string; reference_code?: number; warehouse_id: number; lot?: string; address?: string;
  in_qty: number; out_qty: number; balance_qty: number; unit_cost: number; value: number; balance_value: number;
  cost_center_code?: number; reversed: boolean; is_reversal: boolean; notes?: string;
}
export interface KardexDTO {
  item_code: string; business_code: string; name: string; uom: string; from: string; to: string;
  opening_qty: number; opening_value: number; total_in: number; total_out: number;
  closing_qty: number; closing_value: number; lines: KardexLinhaDTO[];
}
/** Extrato do item: saldo anterior, cada movimento com saldo acumulado (qtd e valor) e saldo final. */
export async function getKardex(itemCode: string, filtros: { warehouse_id?: number; from?: string; to?: string } = {}): Promise<KardexDTO> {
  const params: Record<string, string | number> = {};
  if (filtros.warehouse_id) params.warehouse_id = filtros.warehouse_id;
  if (filtros.from) params.from = filtros.from;
  if (filtros.to) params.to = filtros.to;
  const { data } = await httpClient.get(`/api/stock/kardex/${encodeURIComponent(itemCode)}`, { params });
  const o = unwrapObject(data);
  return {
    item_code: parseStr(o, 'item_code'), business_code: parseStr(o, 'business_code'), name: parseStr(o, 'name'), uom: parseStr(o, 'uom'),
    from: parseStr(o, 'from'), to: parseStr(o, 'to'),
    opening_qty: parseNum(o, 'opening_qty'), opening_value: parseNum(o, 'opening_value'),
    total_in: parseNum(o, 'total_in'), total_out: parseNum(o, 'total_out'),
    closing_qty: parseNum(o, 'closing_qty'), closing_value: parseNum(o, 'closing_value'),
    lines: unwrapArray(o['lines']).map((r) => {
      const l = unwrapObject(r);
      return {
        movement_id: parseNum(l, 'movement_id'), date: parseStr(l, 'date'), movement_date: parseStr(l, 'movement_date'), movement_type: parseStr(l, 'movement_type'),
        movement_type_code: parseStr(l, 'movement_type_code') || undefined, reference_type: parseStr(l, 'reference_type') || undefined,
        reference_code: parseNum(l, 'reference_code') || undefined, warehouse_id: parseNum(l, 'warehouse_id'),
        lot: parseStr(l, 'lot') || undefined, address: parseStr(l, 'address') || undefined,
        in_qty: parseNum(l, 'in_qty'), out_qty: parseNum(l, 'out_qty'), balance_qty: parseNum(l, 'balance_qty'),
        unit_cost: parseNum(l, 'unit_cost'), value: parseNum(l, 'value'), balance_value: parseNum(l, 'balance_value'),
        cost_center_code: parseNum(l, 'cost_center_code') || undefined, reversed: l['reversed'] === true,
        is_reversal: l['is_reversal'] === true, notes: parseStr(l, 'notes') || undefined,
      };
    }),
  };
}

export interface PosicaoDTO {
  item_code: string; business_code: string; name: string; uom: string; warehouse_id: number;
  quantity: number; value: number; avg_cost: number; alt_uom?: string; alt_quantity?: number;
}
/** Saldo por item e almoxarifado ao fim do dia (posição em data), com a 2ª unidade quando há conversão. */
export async function getPosicaoEmData(date?: string, warehouseId?: number): Promise<PosicaoDTO[]> {
  const params: Record<string, string | number> = {};
  if (date) params.date = date;
  if (warehouseId) params.warehouse_id = warehouseId;
  const { data } = await httpClient.get('/api/stock/position', { params });
  return unwrapArray(data).map((r) => {
    const o = unwrapObject(r);
    return {
      item_code: parseStr(o, 'item_code'), business_code: parseStr(o, 'business_code'), name: parseStr(o, 'name'), uom: parseStr(o, 'uom'),
      warehouse_id: parseNum(o, 'warehouse_id'), quantity: parseNum(o, 'quantity'), value: parseNum(o, 'value'), avg_cost: parseNum(o, 'avg_cost'),
      alt_uom: parseStr(o, 'alt_uom') || undefined, alt_quantity: o['alt_quantity'] != null ? parseNum(o, 'alt_quantity') : undefined,
    };
  });
}

export interface ReposicaoDTO {
  item_code: string; mask: string; business_code: string; name: string; uom: string; on_hand: number; reserved: number; on_order: number;
  projected: number; reorder_point: number; safety_stock: number; minimum_lot: number; multiple_lot: number;
  avg_monthly_consumption: number; suggested_qty: number; reason: string;
  warehouse_id?: number; source_type: OrigemReposicao; source_warehouse_id?: number; retained: number; requested: number; maximum: number; warning?: string;
}
export type OrigemReposicao = 'COMPRA' | 'TRANSFERENCIA' | 'PRODUCAO';
/** Itens no ponto de pedido (ou abaixo do mínimo), já descontado o que está pedido. */
export async function getReposicao(): Promise<ReposicaoDTO[]> {
  const { data } = await httpClient.get('/api/stock/replenishment');
  return unwrapArray(data).map((r) => {
    const o = unwrapObject(r);
    return {
      item_code: parseStr(o, 'item_code'), business_code: parseStr(o, 'business_code'), name: parseStr(o, 'name'), uom: parseStr(o, 'uom'),
      on_hand: parseNum(o, 'on_hand'), reserved: parseNum(o, 'reserved'), on_order: parseNum(o, 'on_order'), projected: parseNum(o, 'projected'),
      reorder_point: parseNum(o, 'reorder_point'), safety_stock: parseNum(o, 'safety_stock'), minimum_lot: parseNum(o, 'minimum_lot'),
      multiple_lot: parseNum(o, 'multiple_lot'), avg_monthly_consumption: parseNum(o, 'avg_monthly_consumption'),
      mask: parseStr(o, 'mask'), suggested_qty: parseNum(o, 'suggested_qty'), reason: parseStr(o, 'reason'),
      warehouse_id: parseNum(o, 'warehouse_id') || undefined, source_type: parseStr(o, 'source_type') as OrigemReposicao,
      source_warehouse_id: parseNum(o, 'source_warehouse_id') || undefined, retained: parseNum(o, 'retained'), requested: parseNum(o, 'requested'),
      maximum: parseNum(o, 'maximum'), warning: parseStr(o, 'warning') || undefined,
    };
  });
}
export interface LinhaReposicaoDTO { item_code: string; mask?: string; warehouse_id?: number; source_type: OrigemReposicao; source_warehouse_id?: number; quantity: string; }
export interface ResultadoReposicaoDTO { purchase_requisition_code?: number; transfer_requisition_codes: number[]; planned_order_codes: number[]; }
/** Gera os documentos das sugestões aceitas: compra, ordem de reposição e ordem planejada. */
export async function gerarReposicao(lines: LinhaReposicaoDTO[]): Promise<ResultadoReposicaoDTO> {
  const { data } = await httpClient.post('/api/stock/replenishment/generate', { lines });
  const o = unwrapObject(data);
  return {
    purchase_requisition_code: parseNum(o, 'purchase_requisition_code') || undefined,
    transfer_requisition_codes: unwrapArray(o['transfer_requisition_codes']).map(Number),
    planned_order_codes: unwrapArray(o['planned_order_codes']).map(Number),
  };
}
export interface PoliticaReposicaoDTO {
  id?: number; item_code: string | number; mask?: string; warehouse_id: number; minimum_qty?: string; maximum_qty?: string; safety_qty?: string;
  source_type: OrigemReposicao; source_warehouse_id?: number; is_active: boolean;
}
export async function listarPoliticasReposicao(): Promise<PoliticaReposicaoDTO[]> {
  const { data } = await httpClient.get('/api/stock/replenishment/policies');
  return unwrapArray(data).map((r) => {
    const o = unwrapObject(r);
    const num = (k: string) => (o[k] == null ? undefined : String(o[k]));
    return {
      id: parseNum(o, 'id'), item_code: parseStr(o, 'item_code'), mask: parseStr(o, 'mask'), warehouse_id: parseNum(o, 'warehouse_id'),
      minimum_qty: num('minimum_qty'), maximum_qty: num('maximum_qty'), safety_qty: num('safety_qty'),
      source_type: parseStr(o, 'source_type') as OrigemReposicao, source_warehouse_id: parseNum(o, 'source_warehouse_id') || undefined,
      is_active: o['is_active'] !== false,
    };
  });
}
export async function salvarPoliticaReposicao(p: PoliticaReposicaoDTO): Promise<void> {
  await httpClient.put('/api/stock/replenishment/policies', p);
}
export async function excluirPoliticaReposicao(id: number): Promise<void> {
  await httpClient.delete(`/api/stock/replenishment/policies/${id}`);
}
export interface GrupoAcuracidadeDTO { key: string; counts: number; hits: number; line_accuracy_pct: number; value_accuracy_pct?: number; divergent_value: number; }
export interface RecorrenteDTO { item_code?: string; business_code?: string; name?: string; warehouse_id?: number; address?: string; counts: number; misses: number; divergent_value: number; }
export interface AcuracidadeDTO { total: GrupoAcuracidadeDTO; by_month: GrupoAcuracidadeDTO[]; by_class: GrupoAcuracidadeDTO[]; recurring_items: RecorrenteDTO[]; recurring_addresses: RecorrenteDTO[]; }
function parseGrupoAcuracidade(raw: unknown): GrupoAcuracidadeDTO {
  const o = unwrapObject(raw);
  return {
    key: parseStr(o, 'key'), counts: parseNum(o, 'counts'), hits: parseNum(o, 'hits'), line_accuracy_pct: parseNum(o, 'line_accuracy_pct'),
    value_accuracy_pct: o['value_accuracy_pct'] != null ? parseNum(o, 'value_accuracy_pct') : undefined, divergent_value: parseNum(o, 'divergent_value'),
  };
}
function parseRecorrente(raw: unknown): RecorrenteDTO {
  const o = unwrapObject(raw);
  return {
    item_code: parseStr(o, 'item_code') || undefined, business_code: parseStr(o, 'business_code') || undefined, name: parseStr(o, 'name') || undefined,
    warehouse_id: parseNum(o, 'warehouse_id') || undefined, address: parseStr(o, 'address') || undefined,
    counts: parseNum(o, 'counts'), misses: parseNum(o, 'misses'), divergent_value: parseNum(o, 'divergent_value'),
  };
}
/** Acuracidade das contagens encerradas. */
export async function getAcuracidade(filtro: { months: number; warehouse_id?: number; tol_a?: string; tol_b?: string; tol_c?: string }): Promise<AcuracidadeDTO> {
  const { data } = await httpClient.get('/api/stock/accuracy', { params: filtro });
  const o = unwrapObject(data);
  return {
    total: parseGrupoAcuracidade(o['total']), by_month: unwrapArray(o['by_month']).map(parseGrupoAcuracidade), by_class: unwrapArray(o['by_class']).map(parseGrupoAcuracidade),
    recurring_items: unwrapArray(o['recurring_items']).map(parseRecorrente), recurring_addresses: unwrapArray(o['recurring_addresses']).map(parseRecorrente),
  };
}
export interface FaixaIdadeDTO { range: string; items: number; value: number; value_pct: number; }
/** Saldo agrupado pelo tempo desde o último movimento real. */
export async function getIdadeDoEstoque(): Promise<FaixaIdadeDTO[]> {
  const { data } = await httpClient.get('/api/stock/aging');
  return unwrapArray(data).map((r) => {
    const o = unwrapObject(r);
    return { range: parseStr(o, 'range'), items: parseNum(o, 'items'), value: parseNum(o, 'value'), value_pct: parseNum(o, 'value_pct') };
  });
}

export interface AnaliseDTO {
  item_code: string; business_code: string; name: string; uom: string; quantity: number; value: number;
  consumed_qty: number; consumed_value: number; avg_monthly_consumption: number; coverage_months?: number;
  turnover?: number; last_movement_at?: string; idle_days?: number; idle: boolean; abc_class?: string;
  open_demand: number; shortage: number; provision_value: number;
}
/** Giro, cobertura, consumo e itens parados. */
export async function getAnaliseEstoque(months = 6, idleDays = 90): Promise<AnaliseDTO[]> {
  const { data } = await httpClient.get('/api/stock/analysis', { params: { months, idle_days: idleDays } });
  return unwrapArray(data).map((r) => {
    const o = unwrapObject(r);
    return {
      item_code: parseStr(o, 'item_code'), business_code: parseStr(o, 'business_code'), name: parseStr(o, 'name'), uom: parseStr(o, 'uom'),
      quantity: parseNum(o, 'quantity'), value: parseNum(o, 'value'), consumed_qty: parseNum(o, 'consumed_qty'),
      consumed_value: parseNum(o, 'consumed_value'), avg_monthly_consumption: parseNum(o, 'avg_monthly_consumption'),
      coverage_months: o['coverage_months'] != null ? parseNum(o, 'coverage_months') : undefined,
      turnover: o['turnover'] != null ? parseNum(o, 'turnover') : undefined,
      last_movement_at: parseStr(o, 'last_movement_at') || undefined,
      idle_days: o['idle_days'] != null ? parseNum(o, 'idle_days') : undefined, idle: o['idle'] === true,
      open_demand: parseNum(o, 'open_demand'), shortage: parseNum(o, 'shortage'), provision_value: parseNum(o, 'provision_value'),
      abc_class: parseStr(o, 'abc_class') || undefined,
    };
  });
}

export interface LoteAVencerDTO { item_code: string; business_code: string; name: string; lot: string; warehouse_id: number; quantity: number; expires_at: string; days_to_expire: number; expired: boolean; }
export async function getLotesAVencer(days = 30): Promise<LoteAVencerDTO[]> {
  const { data } = await httpClient.get('/api/stock/lots/expiring', { params: { days } });
  return unwrapArray(data).map((r) => {
    const o = unwrapObject(r);
    return {
      item_code: parseStr(o, 'item_code'), business_code: parseStr(o, 'business_code'), name: parseStr(o, 'name'), lot: parseStr(o, 'lot'),
      warehouse_id: parseNum(o, 'warehouse_id'), quantity: parseNum(o, 'quantity'), expires_at: parseStr(o, 'expires_at'),
      days_to_expire: parseNum(o, 'days_to_expire'), expired: o['expired'] === true,
    };
  });
}

// ── §10 Requisição ao almoxarifado ──
export interface RequisicaoItemDTO { id?: number; sequence?: number; item_code: string | number; mask?: string; quantity: number; issued_qty?: number; reserved_qty?: number; notes?: string; }
export interface RequisicaoDTO {
  id?: number; code?: number; warehouse_id: number; kind?: string; destination_warehouse_id?: number; requester_name?: string; requester_employee_code?: number;
  cost_center_code?: number; needed_date?: string; status?: string; notes?: string; created_at?: string; items: RequisicaoItemDTO[];
}
function parseRequisicao(raw: unknown): RequisicaoDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id'), code: parseNum(o, 'code'), warehouse_id: parseNum(o, 'warehouse_id'),
    kind: parseStr(o, 'kind') || undefined, destination_warehouse_id: parseNum(o, 'destination_warehouse_id') || undefined,
    requester_name: parseStr(o, 'requester_name') || undefined, requester_employee_code: parseNum(o, 'requester_employee_code') || undefined,
    cost_center_code: parseNum(o, 'cost_center_code') || undefined, needed_date: parseStr(o, 'needed_date') || undefined,
    status: parseStr(o, 'status'), notes: parseStr(o, 'notes') || undefined, created_at: parseStr(o, 'created_at') || undefined,
    items: unwrapArray(o['items']).map((r) => {
      const l = unwrapObject(r);
      return { id: parseNum(l, 'id'), sequence: parseNum(l, 'sequence'), item_code: parseStr(l, 'item_code'), mask: parseStr(l, 'mask') || undefined,
        quantity: parseNum(l, 'quantity'), issued_qty: parseNum(l, 'issued_qty'), reserved_qty: parseNum(l, 'reserved_qty'), notes: parseStr(l, 'notes') || undefined };
    }),
  };
}
const REQ = '/api/stock/material-requisitions';
export async function listarRequisicoes(status?: string): Promise<RequisicaoDTO[]> {
  const { data } = await httpClient.get(`${REQ}/`, { params: status ? { status } : undefined });
  return unwrapArray(data).map(parseRequisicao);
}
export async function criarRequisicao(dto: RequisicaoDTO): Promise<RequisicaoDTO> {
  const { data } = await httpClient.post(`${REQ}/`, {
    ...dto, items: dto.items.map((i) => ({ item_code: i.item_code, mask: i.mask ?? '', quantity: String(i.quantity), notes: i.notes })),
  });
  return parseRequisicao(data);
}
export async function atenderRequisicao(id: number, lines: { item_id: number; quantity: number; lot?: string; address?: string; destination_address?: string; via_transit?: boolean; transit_warehouse_id?: number }[]): Promise<RequisicaoDTO> {
  const { data } = await httpClient.post(`${REQ}/${id}/issue`, { lines: lines.map((l) => ({ ...l, quantity: String(l.quantity) })) });
  return parseRequisicao(data);
}
export async function cancelarRequisicao(id: number): Promise<void> {
  await httpClient.post(`${REQ}/${id}/cancel`, {});
}

// ── Limite de ajuste por perfil ──
export interface ToleranciaPerfilDTO { profile_id: number; profile_name: string; max_document_value: string; max_line_value: string }
export async function listarToleranciasPerfil(): Promise<ToleranciaPerfilDTO[]> {
  const { data } = await httpClient.get('/api/stock/inventory-tolerances');
  return unwrapArray(data).map((r) => {
    const o = unwrapObject(r);
    const v = (k: string) => (o[k] == null ? "" : String(o[k]));
    return { profile_id: parseNum(o, 'profile_id'), profile_name: parseStr(o, 'profile_name'), max_document_value: v('max_document_value'), max_line_value: v('max_line_value') };
  });
}
export async function salvarToleranciaPerfil(t: ToleranciaPerfilDTO): Promise<void> {
  const v = (s: string) => (s.trim() === "" ? undefined : s.trim().replace(",", "."));
  await httpClient.put('/api/stock/inventory-tolerances', { profile_id: t.profile_id, max_document_value: v(t.max_document_value), max_line_value: v(t.max_line_value) });
}
export async function excluirToleranciaPerfil(perfil: number): Promise<void> {
  await httpClient.delete(`/api/stock/inventory-tolerances/${perfil}`);
}

// ── Cadernos de contagem ──
export interface CadernoDTO { number: number; warehouse_id: number; lines: number; counted_lines: number; print_count: number; printed_at?: string; status: string }
function parseCaderno(raw: unknown): CadernoDTO {
  const o = unwrapObject(raw);
  return { number: parseNum(o, 'number'), warehouse_id: parseNum(o, 'warehouse_id'), lines: parseNum(o, 'lines'), counted_lines: parseNum(o, 'counted_lines'),
    print_count: parseNum(o, 'print_count'), printed_at: parseStr(o, 'printed_at') || undefined, status: parseStr(o, 'status') };
}
export async function listarCadernos(inventario: number): Promise<CadernoDTO[]> {
  const { data } = await httpClient.get(`${INVENTORY}/${inventario}/notebooks`);
  return unwrapArray(data).map(parseCaderno);
}
export async function gerarCadernos(inventario: number, linhas: number): Promise<CadernoDTO[]> {
  const { data } = await httpClient.post(`${INVENTORY}/${inventario}/notebooks`, { lines_per_notebook: linhas });
  return unwrapArray(data).map(parseCaderno);
}
export async function marcarCadernoImpresso(inventario: number, numero: number): Promise<void> {
  await httpClient.post(`${INVENTORY}/${inventario}/notebooks/${numero}/printed`, {});
}

// ── Consignação ──
export interface ConsignacaoDTO {
  id: number; direction: 'SAIDA' | 'ENTRADA'; partner_code: number; partner_name: string; item_code: string; business_code: string; item_name: string;
  mask: string; lot?: string; warehouse_id?: number; quantity: number; settled_qty: number; returned_qty: number; unit_value: number;
  document?: string; issue_date: string; due_date?: string; status: string;
}
export async function listarConsignacoes(direcao: string, abertas: boolean): Promise<ConsignacaoDTO[]> {
  const { data } = await httpClient.get('/api/stock/consignments', { params: { direction: direcao || undefined, open: abertas } });
  return unwrapArray(data).map((r) => {
    const o = unwrapObject(r);
    return {
      id: parseNum(o, 'id'), direction: parseStr(o, 'direction') as ConsignacaoDTO['direction'], partner_code: parseNum(o, 'partner_code'), partner_name: parseStr(o, 'partner_name'),
      item_code: parseStr(o, 'item_code'), business_code: parseStr(o, 'business_code'), item_name: parseStr(o, 'item_name'), mask: parseStr(o, 'mask'),
      lot: parseStr(o, 'lot') || undefined, warehouse_id: parseNum(o, 'warehouse_id') || undefined, quantity: parseNum(o, 'quantity'), settled_qty: parseNum(o, 'settled_qty'),
      returned_qty: parseNum(o, 'returned_qty'), unit_value: parseNum(o, 'unit_value'), document: parseStr(o, 'document') || undefined,
      issue_date: parseStr(o, 'issue_date'), due_date: parseStr(o, 'due_date') || undefined, status: parseStr(o, 'status'),
    };
  });
}
export async function receberConsignacao(dto: { supplier_code: number; item_code: string; quantity: string; unit_value: string; document?: string; issue_date: string; due_date?: string; lot?: string; mask?: string }): Promise<void> {
  await httpClient.post('/api/stock/consignments', dto);
}
export async function devolverConsignacao(id: number, quantity: string, document?: string): Promise<void> {
  await httpClient.post(`/api/stock/consignments/${id}/return`, { quantity, document });
}
export async function consumirConsignacao(id: number, quantity: string, warehouse_id: number, document?: string): Promise<void> {
  await httpClient.post(`/api/stock/consignments/${id}/consume`, { quantity, warehouse_id, document });
}

// ── Transferência entre CNPJs ──
export interface TransferenciaCnpjDTO { id: number; origin_name: string; destination_name: string; nfe_key: string; status: string; created_at: string; received_at?: string }
export async function listarTransferenciasCnpj(): Promise<TransferenciaCnpjDTO[]> {
  const { data } = await httpClient.get('/api/stock/cnpj-transfers');
  return unwrapArray(data).map((r) => {
    const o = unwrapObject(r);
    return { id: parseNum(o, 'id'), origin_name: parseStr(o, 'origin_name'), destination_name: parseStr(o, 'destination_name'), nfe_key: parseStr(o, 'nfe_key'),
      status: parseStr(o, 'status'), created_at: parseStr(o, 'created_at'), received_at: parseStr(o, 'received_at') || undefined };
  });
}

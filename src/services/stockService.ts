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
  quantity: number;
  last_cost?: number;
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
export async function listMovements(): Promise<MovementDTO[]> {
  const { data } = await httpClient.get('/api/stock/movements/list');
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
export interface InventoryCloseResult { adjustments: number; surplus_qty: number; shortage_qty: number; adjusted_value: number; uncounted_zeroed: number; }
/**
 * Fecha o inventário lançando o ajuste de cada diferença (contado − foto da
 * abertura) ao custo médio. `zerarNaoContados` fecha mesmo com item sem
 * contagem, tratando-o como zero; sem ele, item sem contagem impede.
 */
export async function closeInventory(id: number, zerarNaoContados = false): Promise<InventoryCloseResult> {
  const { data } = await httpClient.post(`${INVENTORY}/${id}/close`, { zerar_nao_contados: zerarNaoContados });
  const o = unwrapObject(data);
  return {
    adjustments: parseNum(o, 'adjustments'), surplus_qty: parseNum(o, 'surplus_qty'), shortage_qty: parseNum(o, 'shortage_qty'),
    adjusted_value: parseNum(o, 'adjusted_value'), uncounted_zeroed: parseNum(o, 'uncounted_zeroed'),
  };
}
export async function countInventoryItem(dto: { inventory_id: number; item_code: string; warehouse_id: number; counted_qty: number; adjustment_type?: string; adjustment_reason?: string }): Promise<Obj> {
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
  code: number; warehouse_id: number; rule?: 'FEFO' | 'FIFO';
  lines: { item_code: string; quantity: number; mask?: string; reference_type?: string; reference_code?: number }[];
}): Promise<OndaDTO> {
  const { data } = await httpClient.post('/api/stock/waves', dto);
  return parseOnda(data);
}

/** Baixa o estoque do que foi separado e libera as reservas. */
export async function confirmarOndaSeparacao(code: number): Promise<OndaDTO> {
  const { data } = await httpClient.post(`/api/stock/waves/${code}/confirm`, {});
  return parseOnda(data);
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
  movement_id: number; date: string; movement_type: string; movement_type_code?: string;
  reference_type?: string; reference_code?: number; warehouse_id: number; lot?: string; address?: string;
  in_qty: number; out_qty: number; balance_qty: number; unit_cost: number; value: number; balance_value: number;
  cost_center_code?: number; reversed: boolean; is_reversal: boolean; notes?: string;
}
export interface KardexDTO {
  item_code: number; business_code: string; name: string; uom: string; from: string; to: string;
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
    item_code: parseNum(o, 'item_code'), business_code: parseStr(o, 'business_code'), name: parseStr(o, 'name'), uom: parseStr(o, 'uom'),
    from: parseStr(o, 'from'), to: parseStr(o, 'to'),
    opening_qty: parseNum(o, 'opening_qty'), opening_value: parseNum(o, 'opening_value'),
    total_in: parseNum(o, 'total_in'), total_out: parseNum(o, 'total_out'),
    closing_qty: parseNum(o, 'closing_qty'), closing_value: parseNum(o, 'closing_value'),
    lines: unwrapArray(o['lines']).map((r) => {
      const l = unwrapObject(r);
      return {
        movement_id: parseNum(l, 'movement_id'), date: parseStr(l, 'date'), movement_type: parseStr(l, 'movement_type'),
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
  item_code: number; business_code: string; name: string; uom: string; warehouse_id: number;
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
      item_code: parseNum(o, 'item_code'), business_code: parseStr(o, 'business_code'), name: parseStr(o, 'name'), uom: parseStr(o, 'uom'),
      warehouse_id: parseNum(o, 'warehouse_id'), quantity: parseNum(o, 'quantity'), value: parseNum(o, 'value'), avg_cost: parseNum(o, 'avg_cost'),
      alt_uom: parseStr(o, 'alt_uom') || undefined, alt_quantity: o['alt_quantity'] != null ? parseNum(o, 'alt_quantity') : undefined,
    };
  });
}

export interface ReposicaoDTO {
  item_code: number; business_code: string; name: string; uom: string; on_hand: number; reserved: number; on_order: number;
  projected: number; reorder_point: number; safety_stock: number; minimum_lot: number; multiple_lot: number;
  avg_monthly_consumption: number; suggested_qty: number; reason: string;
}
/** Itens no ponto de pedido (ou abaixo do mínimo), já descontado o que está pedido. */
export async function getReposicao(): Promise<ReposicaoDTO[]> {
  const { data } = await httpClient.get('/api/stock/replenishment');
  return unwrapArray(data).map((r) => {
    const o = unwrapObject(r);
    return {
      item_code: parseNum(o, 'item_code'), business_code: parseStr(o, 'business_code'), name: parseStr(o, 'name'), uom: parseStr(o, 'uom'),
      on_hand: parseNum(o, 'on_hand'), reserved: parseNum(o, 'reserved'), on_order: parseNum(o, 'on_order'), projected: parseNum(o, 'projected'),
      reorder_point: parseNum(o, 'reorder_point'), safety_stock: parseNum(o, 'safety_stock'), minimum_lot: parseNum(o, 'minimum_lot'),
      multiple_lot: parseNum(o, 'multiple_lot'), avg_monthly_consumption: parseNum(o, 'avg_monthly_consumption'),
      suggested_qty: parseNum(o, 'suggested_qty'), reason: parseStr(o, 'reason'),
    };
  });
}
/** Gera a requisição de compra (VSUP0300) com as sugestões escolhidas. */
export async function gerarRequisicaoDeCompra(items: { item_code: number; quantity: number }[], notes?: string): Promise<Obj> {
  const { data } = await httpClient.post('/api/stock/replenishment/purchase-requisition', { items, notes });
  return unwrapObject(data);
}

export interface AnaliseDTO {
  item_code: number; business_code: string; name: string; uom: string; quantity: number; value: number;
  consumed_qty: number; consumed_value: number; avg_monthly_consumption: number; coverage_months?: number;
  turnover?: number; last_movement_at?: string; idle_days?: number; idle: boolean; abc_class?: string;
}
/** Giro, cobertura, consumo e itens parados. */
export async function getAnaliseEstoque(months = 6, idleDays = 90): Promise<AnaliseDTO[]> {
  const { data } = await httpClient.get('/api/stock/analysis', { params: { months, idle_days: idleDays } });
  return unwrapArray(data).map((r) => {
    const o = unwrapObject(r);
    return {
      item_code: parseNum(o, 'item_code'), business_code: parseStr(o, 'business_code'), name: parseStr(o, 'name'), uom: parseStr(o, 'uom'),
      quantity: parseNum(o, 'quantity'), value: parseNum(o, 'value'), consumed_qty: parseNum(o, 'consumed_qty'),
      consumed_value: parseNum(o, 'consumed_value'), avg_monthly_consumption: parseNum(o, 'avg_monthly_consumption'),
      coverage_months: o['coverage_months'] != null ? parseNum(o, 'coverage_months') : undefined,
      turnover: o['turnover'] != null ? parseNum(o, 'turnover') : undefined,
      last_movement_at: parseStr(o, 'last_movement_at') || undefined,
      idle_days: o['idle_days'] != null ? parseNum(o, 'idle_days') : undefined, idle: o['idle'] === true,
      abc_class: parseStr(o, 'abc_class') || undefined,
    };
  });
}

export interface LoteAVencerDTO { item_code: number; business_code: string; name: string; lot: string; warehouse_id: number; quantity: number; expires_at: string; days_to_expire: number; expired: boolean; }
export async function getLotesAVencer(days = 30): Promise<LoteAVencerDTO[]> {
  const { data } = await httpClient.get('/api/stock/lots/expiring', { params: { days } });
  return unwrapArray(data).map((r) => {
    const o = unwrapObject(r);
    return {
      item_code: parseNum(o, 'item_code'), business_code: parseStr(o, 'business_code'), name: parseStr(o, 'name'), lot: parseStr(o, 'lot'),
      warehouse_id: parseNum(o, 'warehouse_id'), quantity: parseNum(o, 'quantity'), expires_at: parseStr(o, 'expires_at'),
      days_to_expire: parseNum(o, 'days_to_expire'), expired: o['expired'] === true,
    };
  });
}

// ── §10 Requisição ao almoxarifado ──
export interface RequisicaoItemDTO { id?: number; sequence?: number; item_code: string | number; mask?: string; quantity: number; issued_qty?: number; notes?: string; }
export interface RequisicaoDTO {
  id?: number; code?: number; warehouse_id: number; requester_name?: string; requester_employee_code?: number;
  cost_center_code?: number; needed_date?: string; status?: string; notes?: string; created_at?: string; items: RequisicaoItemDTO[];
}
function parseRequisicao(raw: unknown): RequisicaoDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id'), code: parseNum(o, 'code'), warehouse_id: parseNum(o, 'warehouse_id'),
    requester_name: parseStr(o, 'requester_name') || undefined, requester_employee_code: parseNum(o, 'requester_employee_code') || undefined,
    cost_center_code: parseNum(o, 'cost_center_code') || undefined, needed_date: parseStr(o, 'needed_date') || undefined,
    status: parseStr(o, 'status'), notes: parseStr(o, 'notes') || undefined, created_at: parseStr(o, 'created_at') || undefined,
    items: unwrapArray(o['items']).map((r) => {
      const l = unwrapObject(r);
      return { id: parseNum(l, 'id'), sequence: parseNum(l, 'sequence'), item_code: parseNum(l, 'item_code'), mask: parseStr(l, 'mask') || undefined,
        quantity: parseNum(l, 'quantity'), issued_qty: parseNum(l, 'issued_qty'), notes: parseStr(l, 'notes') || undefined };
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
export async function atenderRequisicao(id: number, lines: { item_id: number; quantity: number; lot?: string; address?: string }[]): Promise<RequisicaoDTO> {
  const { data } = await httpClient.post(`${REQ}/${id}/issue`, { lines: lines.map((l) => ({ ...l, quantity: String(l.quantity) })) });
  return parseRequisicao(data);
}
export async function cancelarRequisicao(id: number): Promise<void> {
  await httpClient.post(`${REQ}/${id}/cancel`, {});
}

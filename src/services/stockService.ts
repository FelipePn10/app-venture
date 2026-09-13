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
}

export interface MovementTypeDTO {
  id?: number;
  sigla: string;
  description: string;
  tipo?: string;
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
  };
}
function parseMovType(raw: unknown): MovementTypeDTO {
  const o = unwrapObject(raw);
  return {
    id: parseNum(o, 'id', 'ID') || undefined,
    sigla: parseStr(o, 'sigla', 'Sigla', 'abbreviation'),
    description: parseStr(o, 'description', 'descricao', 'Description'),
    tipo: parseStr(o, 'tipo', 'Tipo', 'type') || undefined,
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
export async function closeInventory(id: number): Promise<void> {
  await httpClient.post(`${INVENTORY}/${id}/close`, {});
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

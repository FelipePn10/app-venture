import { httpClient } from '@/services/httpClient';

const BASE = '/api/suprimento/pedido-compra';

export interface PedidoCompraDTO {
  pedido?: string;
  tipo: string;
  nroTalao: string;
  fornecedor: string;
  emissao: string;
  tabPrecos: string;
  moeda: string;
  dataMoeda: string;
  tipoNF: string;
  tipoSolc: string;
  ctaFin: string;
  tpFrete: string;
  tpValor: string;
  vlrFrete: number;
  transp: string;
  pagamento: string;
  dataBase: string;
  dataVcto: string;
  itens: PedidoCompraItemDTO[];
}

export interface PedidoCompraItemDTO {
  seq: number;
  item: string;
  quantidade: number;
  valorUnit: number;
  um: string;
}

export interface PedidoCompraResponse {
  pedido: string;
  tipo: string;
  nroTalao: string;
  alcada: string;
  fornecedor: string;
  fornecedorNome: string;
  emissao: string;
  status: string;
  tabPrecos: string;
  moeda: string;
  tipoNF: string;
  tpFrete: string;
  vlrFrete: number;
  transp: string;
  pagamento: string;
  totalBruto: number;
  totalLiquido: number;
  itens: PedidoCompraItemResponse[];
}

export interface PedidoCompraItemResponse {
  seq: number;
  item: string;
  descricao: string;
  quantidade: number;
  valorUnit: number;
  valorTotal: number;
  um: string;
}

function parseStr(raw: unknown, ...keys: string[]): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number') return String(raw);
  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    for (const k of keys) { const v = r[k]; if (typeof v === 'string') return v; if (typeof v === 'number') return String(v); }
  }
  return '';
}

function parseNum(raw: unknown, ...keys: string[]): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') { const n = Number(raw); return isNaN(n) ? 0 : n; }
  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    for (const k of keys) { const v = r[k]; if (typeof v === 'number') return v; if (typeof v === 'string') { const n = Number(v); return isNaN(n) ? 0 : n; } }
  }
  return 0;
}

function parseItemCompra(raw: unknown): PedidoCompraItemResponse {
  return {
    seq: parseNum(raw, 'seq', 'Seq', 'SEQ'),
    item: parseStr(raw, 'item', 'Item', 'COD_ITEM'),
    descricao: parseStr(raw, 'descricao', 'Descricao', 'NOM_ITEM'),
    quantidade: parseNum(raw, 'quantidade', 'Quantidade', 'QTD'),
    valorUnit: parseNum(raw, 'valorUnit', 'ValorUnit', 'VLR_UNIT'),
    valorTotal: parseNum(raw, 'valorTotal', 'ValorTotal', 'VLR_TOTAL'),
    um: parseStr(raw, 'um', 'UM', 'UNID_MEDIDA'),
  };
}

function parsePedidoCompra(raw: unknown): PedidoCompraResponse {
  return {
    pedido: parseStr(raw, 'pedido', 'Pedido', 'NUM_PEDIDO'),
    tipo: parseStr(raw, 'tipo', 'Tipo', 'TIPO'),
    nroTalao: parseStr(raw, 'nroTalao', 'NroTalao', 'NUM_TALAO'),
    alcada: parseStr(raw, 'alcada', 'Alcada', 'ALCADA'),
    fornecedor: parseStr(raw, 'fornecedor', 'Fornecedor', 'COD_FORN'),
    fornecedorNome: parseStr(raw, 'fornecedorNome', 'nome', 'NOM_FORN'),
    emissao: parseStr(raw, 'emissao', 'Emissao', 'DAT_EMISSAO'),
    status: parseStr(raw, 'status', 'Status', 'STATUS'),
    tabPrecos: parseStr(raw, 'tabPrecos', 'TabPrecos', 'TAB_PRECOS'),
    moeda: parseStr(raw, 'moeda', 'Moeda', 'MOEDA'),
    tipoNF: parseStr(raw, 'tipoNF', 'TipoNF', 'TIPO_NF'),
    tpFrete: parseStr(raw, 'tpFrete', 'TpFrete', 'TP_FRETE'),
    vlrFrete: parseNum(raw, 'vlrFrete', 'VlrFrete', 'VLR_FRETE'),
    transp: parseStr(raw, 'transp', 'Transp', 'COD_TRANSP'),
    pagamento: parseStr(raw, 'pagamento', 'Pagamento', 'COND_PAGTO'),
    totalBruto: parseNum(raw, 'totalBruto', 'TotalBruto', 'VLR_BRUTO'),
    totalLiquido: parseNum(raw, 'totalLiquido', 'TotalLiquido', 'VLR_LIQUIDO'),
    itens: Array.isArray((raw as any)?.itens ?? (raw as any)?.Itens)
      ? ((raw as any)?.itens ?? (raw as any)?.Itens).map(parseItemCompra)
      : [],
  };
}

function unwrapArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).data)) return (raw as any).data;
  return [];
}

export async function criarPedidoCompra(dto: PedidoCompraDTO): Promise<PedidoCompraResponse> {
  const { data } = await httpClient.post(BASE, dto);
  return parsePedidoCompra(data);
}

export async function atualizarPedidoCompra(pedido: string, dto: Partial<PedidoCompraDTO>): Promise<PedidoCompraResponse> {
  const { data } = await httpClient.put(`${BASE}/${pedido}`, dto);
  return parsePedidoCompra(data);
}

export async function buscarPedidoCompra(pedido: string): Promise<PedidoCompraResponse | null> {
  try {
    const { data } = await httpClient.get(`${BASE}/${pedido}`);
    return parsePedidoCompra(data);
  } catch { return null; }
}

export async function listarPedidosCompra(filters?: Record<string, string>): Promise<PedidoCompraResponse[]> {
  const { data } = await httpClient.get(BASE, { params: filters });
  return unwrapArray(data).map(parsePedidoCompra);
}

export async function excluirPedidoCompra(pedido: string): Promise<void> {
  await httpClient.delete(`${BASE}/${pedido}`);
}

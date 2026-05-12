import { httpClient } from '@/services/httpClient';

const BASE = '/api/pdv/pedido';

export interface PedidoVendaDTO {
  pedido?: string;
  origem: string;
  emissao: string;
  pedidoRep: string;
  dataEntrega: string;
  firme: boolean;
  nfce: boolean;
  dataDig: string;
  ordemCompra: string;
  cliente: string;
  estabFatura: string;
  estabCobranca: string;
  estabEntrega: string;
  representante: string;
  divisaoVenda: string;
  comissao: number;
  tipoImposto: string;
  tipoNF: string;
  tabelaVenda: string;
  condPagto: string;
  portador: string;
  itens: PedidoItemDTO[];
}

export interface PedidoItemDTO {
  seq: number;
  item: string;
  mascaraId: string;
  quantidade: number;
  valorUnit: number;
  tabelaVenda: string;
  tipoNF: string;
}

export interface PedidoVendaResponse {
  status: string;
  liberacao: string;
  pedido: string;
  origem: string;
  emissao: string;
  pedidoRep: string;
  dataEntrega: string;
  dataDig: string;
  ordemCompra: string;
  cliente: string;
  clienteNome: string;
  estabFatura: string;
  estabCobranca: string;
  estabEntrega: string;
  representante: string;
  divisaoVenda: string;
  comissao: number;
  tipoImposto: string;
  tipoNF: string;
  tabelaVenda: string;
  condPagto: string;
  portador: string;
  totalBruto: number;
  totalLiquido: number;
  totalLiqSt: number;
  totalComIpiSt: number;
  itens: PedidoItemResponse[];
}

export interface PedidoItemResponse {
  seq: number;
  item: string;
  descricao: string;
  mascaraId: string;
  um: string;
  quantidade: number;
  valorUnit: number;
  valorTotal: number;
  tipoNF: string;
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


function parsePedidoItem(raw: unknown): PedidoItemResponse {
  return {
    seq: parseNum(raw, 'seq', 'Seq', 'SEQ_ITEM'),
    item: parseStr(raw, 'item', 'Item', 'COD_ITEM'),
    descricao: parseStr(raw, 'descricao', 'Descricao', 'NOM_ITEM'),
    mascaraId: parseStr(raw, 'mascaraId', 'MascaraId', 'COD_MASCARA'),
    um: parseStr(raw, 'um', 'UM', 'UNID_MEDIDA'),
    quantidade: parseNum(raw, 'quantidade', 'Quantidade', 'QTD'),
    valorUnit: parseNum(raw, 'valorUnit', 'ValorUnit', 'VLR_UNIT'),
    valorTotal: parseNum(raw, 'valorTotal', 'ValorTotal', 'VLR_TOTAL'),
    tipoNF: parseStr(raw, 'tipoNF', 'TipoNF', 'TIPO_NF'),
  };
}

function parsePedido(raw: unknown): PedidoVendaResponse {
  return {
    status: parseStr(raw, 'status', 'Status', 'STATUS'),
    liberacao: parseStr(raw, 'liberacao', 'Liberacao', 'LIBERACAO'),
    pedido: parseStr(raw, 'pedido', 'Pedido', 'NUM_PEDIDO'),
    origem: parseStr(raw, 'origem', 'Origem', 'ORIGEM'),
    emissao: parseStr(raw, 'emissao', 'Emissao', 'DAT_EMISSAO'),
    pedidoRep: parseStr(raw, 'pedidoRep', 'PedidoRep', 'PEDIDO_REP'),
    dataEntrega: parseStr(raw, 'dataEntrega', 'DataEntrega', 'DAT_ENTREGA'),
    dataDig: parseStr(raw, 'dataDig', 'DataDig', 'DAT_DIG'),
    ordemCompra: parseStr(raw, 'ordemCompra', 'OrdemCompra', 'ORDEM_COMPRA'),
    cliente: parseStr(raw, 'cliente', 'Cliente', 'COD_CLIENTE'),
    clienteNome: parseStr(raw, 'clienteNome', 'nome', 'NOM_CLIENTE'),
    estabFatura: parseStr(raw, 'estabFatura', 'EstabFatura', 'COD_ESTAB_FAT'),
    estabCobranca: parseStr(raw, 'estabCobranca', 'EstabCobranca', 'COD_ESTAB_COB'),
    estabEntrega: parseStr(raw, 'estabEntrega', 'EstabEntrega', 'COD_ESTAB_ENT'),
    representante: parseStr(raw, 'representante', 'Representante', 'COD_REP'),
    divisaoVenda: parseStr(raw, 'divisaoVenda', 'DivisaoVenda', 'DIV_VENDA'),
    comissao: parseNum(raw, 'comissao', 'Comissao', 'PER_COMISSAO'),
    tipoImposto: parseStr(raw, 'tipoImposto', 'TipoImposto', 'TIPO_IMPOSTO'),
    tipoNF: parseStr(raw, 'tipoNF', 'TipoNF', 'TIPO_NF'),
    tabelaVenda: parseStr(raw, 'tabelaVenda', 'TabelaVenda', 'TABELA_VENDA'),
    condPagto: parseStr(raw, 'condPagto', 'CondPagto', 'COND_PAGTO'),
    portador: parseStr(raw, 'portador', 'Portador', 'COD_PORTADOR'),
    totalBruto: parseNum(raw, 'totalBruto', 'TotalBruto', 'VLR_BRUTO'),
    totalLiquido: parseNum(raw, 'totalLiquido', 'TotalLiquido', 'VLR_LIQUIDO'),
    totalLiqSt: parseNum(raw, 'totalLiqSt', 'TotalLiqSt', 'VLR_LIQ_ST'),
    totalComIpiSt: parseNum(raw, 'totalComIpiSt', 'TotalComIpiSt', 'VLR_COM_IPI_ST'),
    itens: Array.isArray((raw as any)?.itens ?? (raw as any)?.Itens)
      ? ((raw as any)?.itens ?? (raw as any)?.Itens).map(parsePedidoItem)
      : [],
  };
}

function unwrapArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).data)) return (raw as any).data;
  return [];
}

export async function criarPedido(dto: PedidoVendaDTO): Promise<PedidoVendaResponse> {
  const { data } = await httpClient.post(BASE, dto);
  return parsePedido(data);
}

export async function atualizarPedido(pedido: string, dto: Partial<PedidoVendaDTO>): Promise<PedidoVendaResponse> {
  const { data } = await httpClient.put(`${BASE}/${pedido}`, dto);
  return parsePedido(data);
}

export async function buscarPedido(pedido: string): Promise<PedidoVendaResponse | null> {
  try {
    const { data } = await httpClient.get(`${BASE}/${pedido}`);
    return parsePedido(data);
  } catch { return null; }
}

export async function listarPedidos(filters?: Record<string, string>): Promise<PedidoVendaResponse[]> {
  const { data } = await httpClient.get(BASE, { params: filters });
  return unwrapArray(data).map(parsePedido);
}

export async function excluirPedido(pedido: string): Promise<void> {
  await httpClient.delete(`${BASE}/${pedido}`);
}

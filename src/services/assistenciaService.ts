import { httpClient } from '@/services/httpClient';

const BASE = '/api/assistencia';

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface ChamadoDTO {
  chamado?: number;
  data: string;
  cliente: string;
  estabFatura: string;
  assTecnico: string;
  tipo: string;
  motivo: string;
  solucao: string;
  status: string;
  fechado: boolean;
  itens: ChamadoItemDTO[];
}

export interface ChamadoItemDTO {
  item: string;
  nfs: string;
  nfe: string;
  nfRevenda: string;
  dataNF: string;
  loteSerieFilho: string;
  loteSeriePai: string;
  quantidade: number;
  valor: number;
  motivoDefeitoAlegado: string;
  defeitoAlegado: string;
  motivoDefeitoConstatado: string;
  defeitoConstatado: string;
  observacao: string;
  itemPai: string;
  mascara: string;
}

export interface ChamadoResponse {
  chamado: number;
  data: string;
  cliente: string;
  clienteNome: string;
  estabFatura: string;
  assTecnico: string;
  assTecnicoNome: string;
  tipo: string;
  motivo: string;
  solucao: string;
  status: string;
  fechado: boolean;
  itens: ChamadoItemResponse[];
}

export interface ChamadoItemResponse {
  item: string;
  itemDescricao: string;
  nfs: string;
  nfe: string;
  nfRevenda: string;
  dataNF: string;
  loteSerieFilho: string;
  loteSeriePai: string;
  quantidade: number;
  valor: number;
  motivoDefeitoAlegado: string;
  defeitoAlegado: string;
  motivoDefeitoConstatado: string;
  defeitoConstatado: string;
  observacao: string;
  itemPai: string;
  mascara: string;
}

export interface ChamadoFilter {
  chamados?: string;
  dataInicio?: string;
  dataFim?: string;
  cliente?: string;
  atendente?: string;
  cidade?: string;
  uf?: string;
  item?: string;
  status?: string;
}

// ─── Defensive parsers ────────────────────────────────────────────────────────

function parseStr(raw: unknown, ...keys: string[]): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number') return String(raw);
  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    for (const k of keys) {
      const v = r[k];
      if (typeof v === 'string') return v;
      if (typeof v === 'number') return String(v);
    }
  }
  return '';
}

function parseNum(raw: unknown, ...keys: string[]): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') { const n = Number(raw); return isNaN(n) ? 0 : n; }
  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    for (const k of keys) {
      const v = r[k];
      if (typeof v === 'number') return v;
      if (typeof v === 'string') { const n = Number(v); return isNaN(n) ? 0 : n; }
    }
  }
  return 0;
}

function parseBool(raw: unknown, ...keys: string[]): boolean {
  if (raw === null || raw === undefined) return false;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw === 'true' || raw === 'S' || raw === '1';
  if (typeof raw === 'number') return raw === 1;
  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    for (const k of keys) {
      const v = r[k];
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') return v === 'true' || v === 'S' || v === '1';
      if (typeof v === 'number') return v === 1;
    }
  }
  return false;
}

function parseChamadoItem(raw: unknown): ChamadoItemResponse {
  return {
    item: parseStr(raw, 'item', 'Item', 'COD_ITEM'),
    itemDescricao: parseStr(raw, 'itemDescricao', 'descricao', 'Descricao', 'NOM_ITEM'),
    nfs: parseStr(raw, 'nfs', 'NFS', 'NUM_NFS'),
    nfe: parseStr(raw, 'nfe', 'NFE', 'NUM_NFE'),
    nfRevenda: parseStr(raw, 'nfRevenda', 'NF_REVENDA', 'NUM_NF_REVENDA'),
    dataNF: parseStr(raw, 'dataNF', 'DataNF', 'DAT_NF'),
    loteSerieFilho: parseStr(raw, 'loteSerieFilho', 'LoteSerieFilho', 'NUM_SERIE_FILHO'),
    loteSeriePai: parseStr(raw, 'loteSeriePai', 'LoteSeriePai', 'NUM_SERIE_PAI'),
    quantidade: parseNum(raw, 'quantidade', 'Quantidade', 'QTD'),
    valor: parseNum(raw, 'valor', 'Valor', 'VLR_UNIT'),
    motivoDefeitoAlegado: parseStr(raw, 'motivoDefeitoAlegado', 'MotivoDefeitoAlegado'),
    defeitoAlegado: parseStr(raw, 'defeitoAlegado', 'DefeitoAlegado'),
    motivoDefeitoConstatado: parseStr(raw, 'motivoDefeitoConstatado', 'MotivoDefeitoConstatado'),
    defeitoConstatado: parseStr(raw, 'defeitoConstatado', 'DefeitoConstatado'),
    observacao: parseStr(raw, 'observacao', 'Observacao', 'OBS'),
    itemPai: parseStr(raw, 'itemPai', 'ItemPai', 'COD_ITEM_PAI'),
    mascara: parseStr(raw, 'mascara', 'Mascara', 'COD_MASCARA'),
  };
}

function parseChamado(raw: unknown): ChamadoResponse {
  return {
    chamado: parseNum(raw, 'chamado', 'Chamado', 'NUM_CHAMADO'),
    data: parseStr(raw, 'data', 'Data', 'DAT_CHAMADO'),
    cliente: parseStr(raw, 'cliente', 'Cliente', 'COD_CLIENTE'),
    clienteNome: parseStr(raw, 'clienteNome', 'ClienteNome', 'NOM_CLIENTE'),
    estabFatura: parseStr(raw, 'estabFatura', 'EstabFatura', 'COD_ESTAB'),
    assTecnico: parseStr(raw, 'assTecnico', 'AssTecnico', 'COD_ASS_TEC'),
    assTecnicoNome: parseStr(raw, 'assTecnicoNome', 'AssTecnicoNome', 'NOM_ASS_TEC'),
    tipo: parseStr(raw, 'tipo', 'Tipo', 'TIPO_CHAMADO'),
    motivo: parseStr(raw, 'motivo', 'Motivo', 'MOTIVO_CHAMADO'),
    solucao: parseStr(raw, 'solucao', 'Solucao', 'SOLUCAO'),
    status: parseStr(raw, 'status', 'Status', 'STATUS_CHAMADO'),
    fechado: parseBool(raw, 'fechado', 'Fechado', 'FLG_FECHADO'),
    itens: Array.isArray((raw as any)?.itens ?? (raw as any)?.Itens)
      ? ((raw as any)?.itens ?? (raw as any)?.Itens).map(parseChamadoItem)
      : [],
  };
}

function unwrapArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).data)) return (raw as any).data;
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).items)) return (raw as any).items;
  return [];
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function criarChamado(dto: ChamadoDTO): Promise<ChamadoResponse> {
  const { data } = await httpClient.post(BASE, dto);
  return parseChamado(data);
}

export async function atualizarChamado(chamado: number, dto: Partial<ChamadoDTO>): Promise<ChamadoResponse> {
  const { data } = await httpClient.put(`${BASE}/${chamado}`, dto);
  return parseChamado(data);
}

export async function buscarChamado(chamado: number): Promise<ChamadoResponse | null> {
  try {
    const { data } = await httpClient.get(`${BASE}/${chamado}`);
    return parseChamado(data);
  } catch {
    return null;
  }
}

export async function listarChamados(filters: ChamadoFilter): Promise<ChamadoResponse[]> {
  const { data } = await httpClient.get(BASE, { params: filters });
  return unwrapArray(data).map(parseChamado);
}

export async function excluirChamado(chamado: number): Promise<void> {
  await httpClient.delete(`${BASE}/${chamado}`);
}

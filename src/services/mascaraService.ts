import { httpClient } from '@/services/httpClient';

const BASE = '/api/mascara-config';

export interface MascaraGeracaoDTO {
  item: string;
  caracteristicas: MascaraCaracteristicaDTO[];
}

export interface MascaraCaracteristicaDTO {
  seq: number;
  caracteristica: string;
  variavel: string;
}

export interface MascaraResponse {
  mascara: string;
  item: string;
  descricao: string;
  caracteristicas: string;
}

// ─── Defensive parser ─────────────────────────────────────────────────────────

type Obj = Record<string, unknown>;

function pick<T>(obj: Obj, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
}

function parseStr(obj: Obj, ...keys: string[]): string {
  const v = pick<unknown>(obj, ...keys);
  return v != null ? String(v) : '';
}

function parseMascara(raw: unknown): MascaraResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Obj;

  return {
    mascara: parseStr(obj, 'mascara', 'Mascara', 'MASCARA'),
    item: parseStr(obj, 'item', 'Item', 'ITEM'),
    descricao: parseStr(obj, 'descricao', 'Descricao', 'DESCRICAO'),
    caracteristicas: parseStr(obj, 'caracteristicas', 'Caracteristicas', 'CARACTERISTICAS'),
  };
}

function unwrapArray(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Obj;
    for (const key of ['data', 'items', 'mascaras', 'results', 'list']) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
    const msg = pick<string>(obj, 'message', 'error', 'msg');
    if (msg) throw new Error(msg);
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function gerarMascaras(dto: MascaraGeracaoDTO): Promise<MascaraResponse[]> {
  const response = await httpClient.post<unknown>(`${BASE}/gerar`, dto);

  const arr = unwrapArray(response.data);
  if (!arr) return [];

  const result: MascaraResponse[] = [];
  for (const item of arr) {
    const m = parseMascara(item);
    if (m) result.push(m);
  }
  return result;
}

// ─── Mock data — configured items with "Escolha" characteristics ─────────────

export const MOCK_ITENS_CONFIGURADOS = [
  { value: 'ITEM001', label: 'Cadeira Executiva (ITEM001)' },
  { value: 'ITEM002', label: 'Mesa de Escritório (ITEM002)' },
  { value: 'ITEM003', label: 'Armário Modulado (ITEM003)' },
  { value: 'ITEM004', label: 'Painel Divisório (ITEM004)' },
];

export const MOCK_CARACTERISTICAS_POR_ITEM: Record<string, Array<{ caracteristica: string; variaveis: string[] }>> = {
  ITEM001: [
    { caracteristica: 'Cor do Estofado', variaveis: ['Preto', 'Azul', 'Cinza', 'Vermelho'] },
    { caracteristica: 'Tipo de Braço', variaveis: ['Com Braço', 'Sem Braço'] },
    { caracteristica: 'Tipo de Base', variaveis: ['Giratória', 'Fixa', '4 Pontas'] },
  ],
  ITEM002: [
    { caracteristica: 'Cor do Tampo', variaveis: ['Branco', 'Carvalho', 'Cinza', 'Preto'] },
    { caracteristica: 'Tamanho', variaveis: ['1.20m', '1.40m', '1.60m', '1.80m'] },
    { caracteristica: 'Formato', variaveis: ['Retangular', 'Canto', 'Redondo'] },
  ],
  ITEM003: [
    { caracteristica: 'Cor do Armário', variaveis: ['Branco', 'Carvalho', 'Preto'] },
    { caracteristica: 'Número de Portas', variaveis: ['2 Portas', '3 Portas', '4 Portas'] },
    { caracteristica: 'Tipo de Puxador', variaveis: ['Alumínio', 'Plástico', 'Inox'] },
  ],
  ITEM004: [
    { caracteristica: 'Cor do Painel', variaveis: ['Branco', 'Cinza', 'Azul'] },
    { caracteristica: 'Altura', variaveis: ['1.20m', '1.60m', '2.00m'] },
    { caracteristica: 'Revestimento', variaveis: ['Melamínico', 'Tecido', 'Laminado'] },
  ],
};

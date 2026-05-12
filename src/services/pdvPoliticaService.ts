import { httpClient } from '@/services/httpClient';

const BASE_DESCONTO = '/api/politica-desconto';
const BASE_FRETE = '/api/politica-frete';

// ─── Politica Desconto ──────────────────────────────────────────────────────────

export interface PoliticaDescontoDTO {
  prioridade?: number;
  sequencia?: number;
  validade_inicial?: string;
  validade_final?: string;
  tipo?: 'Informação' | 'Escolha' | 'Opcional';
  permite_alterar_descontos?: boolean;
  usada_politica_comissoes?: boolean;
  politicas_aplicadas_itens?: boolean;
  permite_valores_maiores?: boolean;
  opcao_prazo_medio?: boolean;
  opcao_tipo_representante?: boolean;
}

export interface PoliticaDescontoResponse {
  prioridade: number;
  sequencia: number;
  validade_inicial: string;
  validade_final: string;
  tipo: string;
  permite_alterar_descontos: boolean;
  usada_politica_comissoes: boolean;
  politicas_aplicadas_itens: boolean;
  permite_valores_maiores: boolean;
  opcao_prazo_medio: boolean;
  opcao_tipo_representante: boolean;
}

export interface PoliticaLinhaDTO {
  linha: number;
  inicio: number;
  fim: number;
  permite_valores_maiores: boolean;
}

export interface GeracaoAutomaticaDTO {
  sequencia: number;
  descricao: string;
  tipo: 'Percentual' | 'Valor';
  valor_minimo: number;
  valor_maximo: number;
  default_valor: number;
}

// ─── Politica Frete ────────────────────────────────────────────────────────────

export interface PoliticaFreteDTO {
  prioridade?: number;
  sequencia?: number;
  validade_inicial?: string;
  validade_final?: string;
  tipo_dado?: string[];
}

export interface PoliticaFreteLinhaDTO {
  linha: number;
  inicio: number;
  fim: number;
  transportadora: string;
  seguro_valor: number;
  seguro_tipo: 'Percentual' | 'Valor';
  seguro_aplicacao: 'Valor da Nota' | 'Valor Mercadoria';
  pedagio_valor: number;
  pedagio_tipo: 'Percentual' | 'Valor';
  pedagio_aplicacao: 'Valor da Nota' | 'Valor Mercadoria';
  valor_excedente_valor: number;
  valor_excedente_tipo: 'Percentual' | 'Valor';
  valor_excedente_aplicacao: 'Valor da Nota' | 'Valor Mercadoria';
  peso_excedente_valor: number;
  peso_excedente_tipo: 'Percentual' | 'Valor';
  peso_excedente_aplicacao: 'Valor da Nota' | 'Valor Mercadoria';
  valor_ate: number;
  peso_ate: number;
  valor_frete_valor: number;
  valor_frete_tipo: 'Percentual' | 'Valor';
  valor_frete_aplicacao: 'Valor da Nota' | 'Valor Mercadoria';
  excedente: boolean;
  valor_base: number;
  peso_base: number;
}

export interface PoliticaFreteResponse {
  prioridade: number;
  sequencia: number;
  validade_inicial: string;
  validade_final: string;
  tipo_dado: string[];
  linhas: PoliticaFreteLinhaDTO[];
}

// ─── Parsers ───────────────────────────────────────────────────────────────────

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
  if (typeof raw === 'number') return raw !== 0;
  if (typeof raw === 'string') {
    const lower = raw.toLowerCase();
    return lower === 'true' || lower === '1' || lower === 's' || lower === 'sim' || lower === 'yes';
  }
  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    for (const k of keys) {
      const v = r[k];
      if (typeof v === 'boolean') return v;
      if (typeof v === 'number') return v !== 0;
      if (typeof v === 'string') {
        const l = v.toLowerCase();
        return l === 'true' || l === '1' || l === 's' || l === 'sim' || l === 'yes';
      }
    }
  }
  return false;
}

function unwrapArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).data)) return (raw as any).data;
  return [];
}

function parsePoliticaDesconto(raw: unknown): PoliticaDescontoResponse {
  return {
    prioridade: parseNum(raw, 'prioridade', 'Prioridade', 'PRIORIDADE'),
    sequencia: parseNum(raw, 'sequencia', 'Sequencia', 'SEQUENCIA'),
    validade_inicial: parseStr(raw, 'validade_inicial', 'ValidadeInicial', 'DAT_INICIAL'),
    validade_final: parseStr(raw, 'validade_final', 'ValidadeFinal', 'DAT_FINAL'),
    tipo: parseStr(raw, 'tipo', 'Tipo', 'TIPO'),
    permite_alterar_descontos: parseBool(raw, 'permite_alterar_descontos', 'PermiteAlterarDescontos'),
    usada_politica_comissoes: parseBool(raw, 'usada_politica_comissoes', 'UsadaPoliticaComissoes'),
    politicas_aplicadas_itens: parseBool(raw, 'politicas_aplicadas_itens', 'PoliticasAplicadasItens'),
    permite_valores_maiores: parseBool(raw, 'permite_valores_maiores', 'PermiteValoresMaiores'),
    opcao_prazo_medio: parseBool(raw, 'opcao_prazo_medio', 'OpcaoPrazoMedio'),
    opcao_tipo_representante: parseBool(raw, 'opcao_tipo_representante', 'OpcaoTipoRepresentante'),
  };
}

function parsePoliticaLinha(raw: unknown): PoliticaLinhaDTO {
  return {
    linha: parseNum(raw, 'linha', 'Linha', 'LINHA'),
    inicio: parseNum(raw, 'inicio', 'Inicio', 'INICIO'),
    fim: parseNum(raw, 'fim', 'Fim', 'FIM'),
    permite_valores_maiores: parseBool(raw, 'permite_valores_maiores', 'PermiteValoresMaiores'),
  };
}

function parseGeracaoAutomatica(raw: unknown): GeracaoAutomaticaDTO {
  return {
    sequencia: parseNum(raw, 'sequencia', 'Sequencia', 'SEQUENCIA'),
    descricao: parseStr(raw, 'descricao', 'Descricao', 'DESCRICAO'),
    tipo: parseStr(raw, 'tipo', 'Tipo', 'TIPO') as 'Percentual' | 'Valor',
    valor_minimo: parseNum(raw, 'valor_minimo', 'ValorMinimo', 'VLR_MINIMO'),
    valor_maximo: parseNum(raw, 'valor_maximo', 'ValorMaximo', 'VLR_MAXIMO'),
    default_valor: parseNum(raw, 'default_valor', 'DefaultValor', 'VLR_DEFAULT'),
  };
}

// ─── Politica Desconto API ─────────────────────────────────────────────────────

export async function criarPoliticaDesconto(dto: PoliticaDescontoDTO): Promise<PoliticaDescontoResponse> {
  const { data } = await httpClient.post(BASE_DESCONTO, dto);
  return parsePoliticaDesconto(data);
}

export async function atualizarPoliticaDesconto(sequencia: number, dto: Partial<PoliticaDescontoDTO>): Promise<PoliticaDescontoResponse> {
  const { data } = await httpClient.put(`${BASE_DESCONTO}/${sequencia}`, dto);
  return parsePoliticaDesconto(data);
}

export async function buscarPoliticaDesconto(sequencia: number): Promise<PoliticaDescontoResponse | null> {
  try {
    const { data } = await httpClient.get(`${BASE_DESCONTO}/${sequencia}`);
    return parsePoliticaDesconto(data);
  } catch { return null; }
}

export async function listarPoliticaDesconto(filters?: Record<string, string>): Promise<PoliticaDescontoResponse[]> {
  const { data } = await httpClient.get(BASE_DESCONTO, { params: filters });
  return unwrapArray(data).map(parsePoliticaDesconto);
}

export async function excluirPoliticaDesconto(sequencia: number): Promise<void> {
  await httpClient.delete(`${BASE_DESCONTO}/${sequencia}`);
}

// ─── Politica Desconto Linhas API ──────────────────────────────────────────────

export async function listarLinhasPolitica(sequenciaPolitica: number): Promise<PoliticaLinhaDTO[]> {
  const { data } = await httpClient.get(`${BASE_DESCONTO}/${sequenciaPolitica}/linhas`);
  return unwrapArray(data).map(parsePoliticaLinha);
}

export async function salvarLinhaPolitica(sequenciaPolitica: number, dto: PoliticaLinhaDTO): Promise<PoliticaLinhaDTO> {
  const { data } = await httpClient.post(`${BASE_DESCONTO}/${sequenciaPolitica}/linhas`, dto);
  return parsePoliticaLinha(data);
}

// ─── Politica Desconto Geracao Automatica API ──────────────────────────────────

export async function listarGeracaoAutomatica(sequenciaPolitica: number): Promise<GeracaoAutomaticaDTO[]> {
  const { data } = await httpClient.get(`${BASE_DESCONTO}/${sequenciaPolitica}/geracao-automatica`);
  return unwrapArray(data).map(parseGeracaoAutomatica);
}

export async function salvarGeracaoAutomatica(sequenciaPolitica: number, dto: GeracaoAutomaticaDTO): Promise<GeracaoAutomaticaDTO> {
  const { data } = await httpClient.post(`${BASE_DESCONTO}/${sequenciaPolitica}/geracao-automatica`, dto);
  return parseGeracaoAutomatica(data);
}

// ─── Politica Frete API ────────────────────────────────────────────────────────

function parsePoliticaFrete(raw: unknown): PoliticaFreteResponse {
  return {
    prioridade: parseNum(raw, 'prioridade', 'Prioridade', 'PRIORIDADE'),
    sequencia: parseNum(raw, 'sequencia', 'Sequencia', 'SEQUENCIA'),
    validade_inicial: parseStr(raw, 'validade_inicial', 'ValidadeInicial', 'DAT_INICIAL'),
    validade_final: parseStr(raw, 'validade_final', 'ValidadeFinal', 'DAT_FINAL'),
    tipo_dado: Array.isArray((raw as any)?.tipo_dado) ? (raw as any).tipo_dado : [],
    linhas: [],
  };
}

function parsePoliticaFreteLinha(raw: unknown): PoliticaFreteLinhaDTO {
  return {
    linha: parseNum(raw, 'linha', 'Linha', 'LINHA'),
    inicio: parseNum(raw, 'inicio', 'Inicio', 'INICIO'),
    fim: parseNum(raw, 'fim', 'Fim', 'FIM'),
    transportadora: parseStr(raw, 'transportadora', 'Transportadora', 'COD_TRANSP'),
    seguro_valor: parseNum(raw, 'seguro_valor', 'SeguroValor', 'VLR_SEGURO'),
    seguro_tipo: (parseStr(raw, 'seguro_tipo', 'SeguroTipo', 'TIPO_SEGURO') || 'Percentual') as 'Percentual' | 'Valor',
    seguro_aplicacao: (parseStr(raw, 'seguro_aplicacao', 'SeguroAplicacao', 'APLIC_SEGURO') || 'Valor da Nota') as 'Valor da Nota' | 'Valor Mercadoria',
    pedagio_valor: parseNum(raw, 'pedagio_valor', 'PedagioValor', 'VLR_PEDAGIO'),
    pedagio_tipo: (parseStr(raw, 'pedagio_tipo', 'PedagioTipo', 'TIPO_PEDAGIO') || 'Percentual') as 'Percentual' | 'Valor',
    pedagio_aplicacao: (parseStr(raw, 'pedagio_aplicacao', 'PedagioAplicacao', 'APLIC_PEDAGIO') || 'Valor da Nota') as 'Valor da Nota' | 'Valor Mercadoria',
    valor_excedente_valor: parseNum(raw, 'valor_excedente_valor', 'ValorExcedenteValor', 'VLR_EXCED'),
    valor_excedente_tipo: (parseStr(raw, 'valor_excedente_tipo', 'ValorExcedenteTipo', 'TIPO_EXCED') || 'Percentual') as 'Percentual' | 'Valor',
    valor_excedente_aplicacao: (parseStr(raw, 'valor_excedente_aplicacao', 'ValorExcedenteAplicacao', 'APLIC_EXCED') || 'Valor da Nota') as 'Valor da Nota' | 'Valor Mercadoria',
    peso_excedente_valor: parseNum(raw, 'peso_excedente_valor', 'PesoExcedenteValor', 'VLR_PESO_EXC'),
    peso_excedente_tipo: (parseStr(raw, 'peso_excedente_tipo', 'PesoExcedenteTipo', 'TIPO_PESO_EXC') || 'Percentual') as 'Percentual' | 'Valor',
    peso_excedente_aplicacao: (parseStr(raw, 'peso_excedente_aplicacao', 'PesoExcedenteAplicacao', 'APLIC_PESO_EXC') || 'Valor da Nota') as 'Valor da Nota' | 'Valor Mercadoria',
    valor_ate: parseNum(raw, 'valor_ate', 'ValorAte', 'VLR_ATE'),
    peso_ate: parseNum(raw, 'peso_ate', 'PesoAte', 'PESO_ATE'),
    valor_frete_valor: parseNum(raw, 'valor_frete_valor', 'ValorFreteValor', 'VLR_FRETE'),
    valor_frete_tipo: (parseStr(raw, 'valor_frete_tipo', 'ValorFreteTipo', 'TIPO_FRETE') || 'Percentual') as 'Percentual' | 'Valor',
    valor_frete_aplicacao: (parseStr(raw, 'valor_frete_aplicacao', 'ValorFreteAplicacao', 'APLIC_FRETE') || 'Valor da Nota') as 'Valor da Nota' | 'Valor Mercadoria',
    excedente: parseBool(raw, 'excedente', 'Excedente', 'EXCEDENTE'),
    valor_base: parseNum(raw, 'valor_base', 'ValorBase', 'VLR_BASE'),
    peso_base: parseNum(raw, 'peso_base', 'PesoBase', 'PESO_BASE'),
  };
}

export async function criarPoliticaFrete(dto: PoliticaFreteDTO): Promise<PoliticaFreteResponse> {
  const { data } = await httpClient.post(BASE_FRETE, dto);
  return parsePoliticaFrete(data);
}

export async function atualizarPoliticaFrete(sequencia: number, dto: Partial<PoliticaFreteDTO>): Promise<PoliticaFreteResponse> {
  const { data } = await httpClient.put(`${BASE_FRETE}/${sequencia}`, dto);
  return parsePoliticaFrete(data);
}

export async function buscarPoliticaFrete(sequencia: number): Promise<PoliticaFreteResponse | null> {
  try {
    const { data } = await httpClient.get(`${BASE_FRETE}/${sequencia}`);
    return parsePoliticaFrete(data);
  } catch { return null; }
}

export async function listarPoliticaFrete(filters?: Record<string, string>): Promise<PoliticaFreteResponse[]> {
  const { data } = await httpClient.get(BASE_FRETE, { params: filters });
  return unwrapArray(data).map(parsePoliticaFrete);
}

export async function excluirPoliticaFrete(sequencia: number): Promise<void> {
  await httpClient.delete(`${BASE_FRETE}/${sequencia}`);
}

export async function listarLinhasPoliticaFrete(sequenciaPolitica: number): Promise<PoliticaFreteLinhaDTO[]> {
  const { data } = await httpClient.get(`${BASE_FRETE}/${sequenciaPolitica}/linhas`);
  return unwrapArray(data).map(parsePoliticaFreteLinha);
}

export async function salvarLinhaPoliticaFrete(sequenciaPolitica: number, dto: PoliticaFreteLinhaDTO): Promise<PoliticaFreteLinhaDTO> {
  const { data } = await httpClient.post(`${BASE_FRETE}/${sequenciaPolitica}/linhas`, dto);
  return parsePoliticaFreteLinha(data);
}

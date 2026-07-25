import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/forecast';

/**
 * Previsão Estatística (§7): aplica modelos e retorna o de menor MAPE.
 * `period` é rótulo da observação (aceita string "YYYY-MM" ou número); os modelos
 * operam sobre a série `quantity` na ordem enviada.
 */
export interface HistoryPoint {
  period: string;
  quantity: number;
}

export interface ForecastResult {
  item_code: number;
  /** Modelo escolhido: AUTO, MOVING_AVERAGE, EXP_SMOOTHING ou HOLT_WINTERS. */
  model: string;
  /** Erro percentual absoluto médio (`mape_pct` no backend). */
  mape_pct: number;
  /** Quantidade prevista por período futuro, na ordem. */
  forecasts: number[];
  /** Resultado de cada modelo — o backend só preenche quando `model` é AUTO. */
  all_models: { model: string; mape_pct: number; forecasts: number[] }[];
}

export interface ForecastRequest {
  item_code: number;
  history: HistoryPoint[];
  /** Quantos períodos futuros prever (`periods` no backend). */
  periods: number;
  model?: 'AUTO' | 'MOVING_AVERAGE' | 'EXP_SMOOTHING' | 'HOLT_WINTERS';
  ma_window?: number;
  alpha?: number;
  beta?: number;
  gamma?: number;
  season_len?: number;
}

/**
 * `POST /api/forecast/statistical`.
 *
 * A resposta é `{ item_code, result: {model, mape_pct, forecasts}, all_models }`
 * — o resultado vem ANINHADO em `result` e `forecasts` é uma lista de números
 * (uma quantidade por período futuro), não de objetos. `unwrapObject` não serve
 * aqui: ele trataria `result` como envelope e descartaria `item_code`.
 */
export async function statisticalForecast(req: ForecastRequest): Promise<ForecastResult> {
  const { data } = await httpClient.post(`${BASE}/statistical`, req);
  const root = (data ?? {}) as Record<string, unknown>;
  const parseModel = (raw: unknown) => {
    const r = unwrapObject(raw);
    return {
      model: parseStr(r, 'model', 'Model'),
      mape_pct: parseNum(r, 'mape_pct', 'MAPE', 'Mape'),
      forecasts: unwrapArray(r['forecasts'] ?? r['Forecasts']).map((v) => Number(v) || 0),
    };
  };
  const result = parseModel(root['result'] ?? root['Result']);
  return {
    item_code: parseNum(root, 'item_code', 'ItemCode'),
    ...result,
    all_models: unwrapArray(root['all_models'] ?? root['All']).map(parseModel),
  };
}

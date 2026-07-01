import { httpClient, parseStr, parseNum, unwrapArray, unwrapObject } from '@/services/fiscalShared';

const BASE = '/api/forecast';

/**
 * Previsão Estatística (§7): aplica modelos e retorna o de menor MAPE.
 * ⚠️ A build demo atual espera `period` como int (rejeita string); a doc usa
 * string "YYYY-MM" — mantemos string conforme a doc (contrato de produção).
 */
export interface HistoryPoint {
  period: string;
  quantity: number;
}

export interface ForecastResult {
  item_code: number;
  model_used: string;
  mape: number;
  forecasts: HistoryPoint[];
}

export interface ForecastRequest {
  item_code: number;
  history: HistoryPoint[];
  periods_ahead: number;
}

export async function statisticalForecast(req: ForecastRequest): Promise<ForecastResult> {
  const { data } = await httpClient.post(`${BASE}/statistical`, req);
  const o = unwrapObject(data);
  const fc = unwrapArray(o['forecasts'] ?? o['Forecasts']).map((raw) => {
    const p = unwrapObject(raw);
    return { period: parseStr(p, 'period', 'Period'), quantity: parseNum(p, 'quantity', 'Quantity') };
  });
  return {
    item_code: parseNum(o, 'item_code', 'ItemCode'),
    model_used: parseStr(o, 'model_used', 'ModelUsed'),
    mape: parseNum(o, 'mape', 'Mape', 'MAPE'),
    forecasts: fc,
  };
}

import { httpClient } from "@/services/httpClient";

const BASE = "/api/consumo-medio";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalcularConsumoMedioDTO {
  itens: string[];
  tipo_item: "codigo" | "descricao";
  classificacao: string;
  mes_inicial: number;
  ano_inicial: number;
  mes_final: number;
  ano_final: number;
  fornecedores: string[];
  tipo_fornecedor: "codigo" | "descricao";
  considerar_pedidos_venda: boolean;
  considerar_receita: boolean;
  desconsiderar_estoque: boolean;
}

export interface ConsumoMedioResult {
  item_code: number;
  item_description: string;
  month: number;
  year: number;
  consumo: number;
  unidade: string;
}

export interface CalcularConsumoMedioResponse {
  resultados: ConsumoMedioResult[];
  total_items: number;
  periodo_inicial: string;
  periodo_final: string;
}

// ─── Defensive parser ─────────────────────────────────────────────────────────
// The Go backend may return any of these field-name conventions:
//   snake_case  → item_code, item_description, month, year, consumo, unidade
//   camelCase   → itemCode, itemDescription, month, year, consumo, unidade
//   PascalCase  → ItemCode, ItemDescription, Month, Year, Consumo, Unidade

type Obj = Record<string, unknown>;

function pick<T>(obj: Obj, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
}

function parseNum(obj: Obj, ...keys: string[]): number | undefined {
  const v = pick<unknown>(obj, ...keys);
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

function parseStr(obj: Obj, ...keys: string[]): string {
  const v = pick<unknown>(obj, ...keys);
  return v != null ? String(v) : "";
}

function parseConsumoMedioResult(raw: unknown): ConsumoMedioResult | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Obj;

  const item_code = parseNum(
    obj,
    "item_code",
    "itemCode",
    "ItemCode",
    "codigo",
    "Codigo",
  );
  if (item_code === undefined) return null;

  return {
    item_code,
    item_description: parseStr(
      obj,
      "item_description",
      "itemDescription",
      "ItemDescription",
      "descricao",
      "Descricao",
      "description",
      "Description",
    ),
    month: parseNum(obj, "month", "Month", "mes", "Mes") ?? 0,
    year: parseNum(obj, "year", "Year", "ano", "Ano") ?? 0,
    consumo:
      parseNum(obj, "consumo", "Consumo", "consumption", "Consumption") ?? 0,
    unidade: parseStr(
      obj,
      "unidade",
      "Unidade",
      "unit",
      "Unit",
      "unidade_medida",
      "UnidadeMedida",
    ),
  };
}

function unwrapArray(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const obj = raw as Obj;
    for (const key of [
      "data",
      "items",
      "resultados",
      "results",
      "list",
      "consumos",
    ]) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
    const msg = pick<string>(obj, "message", "error", "msg", "erro");
    if (msg) throw new Error(msg);
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function calcularConsumoMedio(
  dto: CalcularConsumoMedioDTO,
): Promise<CalcularConsumoMedioResponse> {
  const response = await httpClient.post<unknown>(`${BASE}/calcular`, dto);

  console.debug("[consumoMedio] calcularConsumoMedio raw:", response.data);

  // Try direct array response
  const arr = unwrapArray(response.data);
  if (arr) {
    const resultados: ConsumoMedioResult[] = [];
    for (const item of arr) {
      const parsed = parseConsumoMedioResult(item);
      if (parsed) {
        resultados.push(parsed);
      } else {
        console.debug("[consumoMedio] could not parse item:", item);
      }
    }

    return {
      resultados,
      total_items: resultados.length,
      periodo_inicial: `${String(dto.mes_inicial).padStart(2, "0")}/${dto.ano_inicial}`,
      periodo_final: `${String(dto.mes_final).padStart(2, "0")}/${dto.ano_final}`,
    };
  }

  // Try object response with nested data
  if (response.data && typeof response.data === "object") {
    const obj = response.data as Obj;

    const resultadosArr = unwrapArray(obj.resultados ?? obj.data ?? obj.items);
    if (resultadosArr) {
      const resultados: ConsumoMedioResult[] = [];
      for (const item of resultadosArr) {
        const parsed = parseConsumoMedioResult(item);
        if (parsed) resultados.push(parsed);
      }

      return {
        resultados,
        total_items:
          parseNum(obj, "total_items", "totalItems", "TotalItems", "total") ??
          resultados.length,
        periodo_inicial:
          parseStr(
            obj,
            "periodo_inicial",
            "periodoInicial",
            "PeriodoInicial",
          ) || `${String(dto.mes_inicial).padStart(2, "0")}/${dto.ano_inicial}`,
        periodo_final:
          parseStr(obj, "periodo_final", "periodoFinal", "PeriodoFinal") ||
          `${String(dto.mes_final).padStart(2, "0")}/${dto.ano_final}`,
      };
    }
  }

  console.debug(
    "[consumoMedio] calcularConsumoMedio: could not parse response",
  );
  return {
    resultados: [],
    total_items: 0,
    periodo_inicial: `${String(dto.mes_inicial).padStart(2, "0")}/${dto.ano_inicial}`,
    periodo_final: `${String(dto.mes_final).padStart(2, "0")}/${dto.ano_final}`,
  };
}

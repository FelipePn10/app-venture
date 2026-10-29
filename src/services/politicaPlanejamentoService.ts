import { httpClient } from "@/services/httpClient";

// Política de planejamento por item ou classificação (VPLA0310). Campo vazio
// herda: item → classificação mais profunda do item → parâmetros 46 a 49.
const BASE = "/api/planning-policy";

export type Estrategia = "CONSUMO" | "SOB_ENCOMENDA";
export type Escopo = "ITEM" | "CLASSIFICACAO";

export const ESTRATEGIAS: { id: Estrategia; rotulo: string; ajuda: string }[] = [
  { id: "CONSUMO", rotulo: "Consumo pela venda", ajuda: "O pedido de venda consome a previsão e a demanda de estoque: planeja-se o maior dos dois, nunca a soma." },
  { id: "SOB_ENCOMENDA", rotulo: "Sob encomenda", ajuda: "Só o pedido de venda gera necessidade. Previsão e demanda de estoque do item não entram no MRP (amostra, feira e outras finalidades continuam)." },
];
export const estrategiaDe = (e?: string) => ESTRATEGIAS.find((x) => x.id === e);

export interface Politica {
  id: number;
  escopo: Escopo;
  item_business_code?: string;
  item_name?: string;
  classification_id?: number;
  classification_code?: string;
  classification_label?: string;
  estrategia?: Estrategia;
  consumo_dias_antes?: number;
  consumo_dias_depois?: number;
  horizonte_firme_dias?: number;
  tempo_seguranca_dias?: number;
  observacao?: string;
  updated_at: string;
}

export interface PoliticaDTO {
  item_code?: string;
  classification_id?: number;
  estrategia?: Estrategia;
  consumo_dias_antes?: number;
  consumo_dias_depois?: number;
  horizonte_firme_dias?: number;
  tempo_seguranca_dias?: number;
  observacao?: string;
}

export interface PoliticaEfetiva {
  item_business_code: string;
  item_name: string;
  estrategia: Estrategia;
  estrategia_descricao: string;
  consumo_dias_antes: number;
  consumo_dias_depois: number;
  horizonte_firme_dias: number;
  tempo_seguranca_dias: number;
  /** De onde veio cada valor: "do item", "da classificação X" ou "parâmetro da empresa". */
  origem: { estrategia: string; janela: string; horizonte_firme: string; tempo_seguranca: string };
}

const lista = <T,>(d: unknown): T[] => (Array.isArray(d) ? (d as T[]) : []);

export async function listarPoliticas(f: { escopo?: Escopo | ""; busca?: string } = {}): Promise<Politica[]> {
  const params: Record<string, string> = {};
  if (f.escopo) params.escopo = f.escopo;
  if (f.busca?.trim()) params.busca = f.busca.trim();
  const { data } = await httpClient.get(`${BASE}/`, { params });
  return lista<Politica>(data);
}
export async function criarPolitica(dto: PoliticaDTO): Promise<Politica> {
  const { data } = await httpClient.post(`${BASE}/`, dto);
  return data as Politica;
}
export async function alterarPolitica(id: number, dto: PoliticaDTO): Promise<Politica> {
  const { data } = await httpClient.put(`${BASE}/${id}`, dto);
  return data as Politica;
}
export async function excluirPolitica(id: number): Promise<void> {
  await httpClient.delete(`${BASE}/${id}`);
}
export async function politicaEfetiva(item: string): Promise<PoliticaEfetiva> {
  const { data } = await httpClient.get(`${BASE}/efetiva`, { params: { item } });
  return data as PoliticaEfetiva;
}

/** Classificações de item da empresa (id interno, código e caminho), para escolher o escopo. */
export async function listarClassificacoes(): Promise<{ code: number; label: string; sub?: string }[]> {
  const { data } = await httpClient.get("/api/items/classifications/");
  return lista<{ id: number; code: string; mask: string; description: string; full_description?: string }>(data)
    .map((c) => ({ code: c.id, label: `${c.code} — ${c.full_description || c.description}`, sub: c.mask }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { numeric: true }));
}

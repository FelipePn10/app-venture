import { httpClient } from "@/services/httpClient";

// Demanda independente (VPLA0102): o que se quer produzir ou comprar sem pedido
// de venda — para estoque, amostra, feira, consumo interno, assistência,
// projeto ou antecipação de venda. Quantidades vão e voltam como texto decimal.
const BASE = "/api/independent-demand";

export type Motivo =
  | "ESTOQUE" | "REPOSICAO" | "ANTECIPACAO_VENDA"
  | "AMOSTRA" | "FEIRA" | "CONSUMO_INTERNO" | "ASSISTENCIA" | "PROJETO";
export type Situacao = "ABERTA" | "ENCERRADA" | "CANCELADA";
export type Posicao = "ABERTA" | "PARCIAL" | "ATENDIDA" | "CONSUMIDA" | "VENCIDA" | "SOB_ENCOMENDA" | Situacao;

/** Família: VENDA = o pedido de venda consome; FINALIDADE = sai do estoque para o uso. */
export const MOTIVOS: { id: Motivo; rotulo: string; familia: "VENDA" | "FINALIDADE"; ajuda: string }[] = [
  { id: "ESTOQUE", rotulo: "Produção para estoque", familia: "VENDA", ajuda: "Fabricar antes da venda. O pedido que chegar consome esta demanda em vez de somar." },
  { id: "REPOSICAO", rotulo: "Reposição de estoque", familia: "VENDA", ajuda: "Repor o que saiu. O pedido de venda consome esta demanda." },
  { id: "ANTECIPACAO_VENDA", rotulo: "Antecipação de venda", familia: "VENDA", ajuda: "Venda esperada (campanha, cliente que ainda vai pedir). O pedido consome esta demanda." },
  { id: "AMOSTRA", rotulo: "Amostra / protótipo", familia: "FINALIDADE", ajuda: "Peças que saem do estoque para amostra. Atendida pela saída; a venda não consome." },
  { id: "FEIRA", rotulo: "Feira / demonstração", familia: "FINALIDADE", ajuda: "Peças para exposição. Atendida pela saída do estoque." },
  { id: "CONSUMO_INTERNO", rotulo: "Consumo interno", familia: "FINALIDADE", ajuda: "Uso da própria fábrica. Atendida pela saída do estoque." },
  { id: "ASSISTENCIA", rotulo: "Assistência / peça de reposição", familia: "FINALIDADE", ajuda: "Peças para assistência técnica. Atendida pela saída do estoque." },
  { id: "PROJETO", rotulo: "Projeto / obra", familia: "FINALIDADE", ajuda: "Material de um projeto ou obra (informe qual). Atendida pela saída do estoque." },
];
export const motivoDe = (m?: string) => MOTIVOS.find((x) => x.id === m);

export interface OrdemDaDemanda {
  planned_order_code?: number;
  production_order_id?: number;
  order_number?: number;
  status: string;
  quantidade: string;
  planejada: string;
  produzida: string;
}

export interface Demanda {
  code_demand: number;
  item_code: number;
  item_business_code: string;
  item_name: string;
  mask?: string;
  cost_center_code?: number;
  quantity: string;
  demand_date: string;
  created_at?: string;
  motivo: Motivo;
  motivo_descricao: string;
  familia: "VENDA" | "FINALIDADE";
  warehouse_id?: number;
  /** "código — descrição" do almoxarifado de destino. */
  warehouse_nome?: string;
  customer_code?: number;
  customer_nome?: string;
  projeto?: string;
  prioridade: number;
  observacao?: string;
  programacao?: string;
  situacao: Situacao;
  encerrada_em?: string;
  motivo_encerramento?: string;
  posicao: Posicao;
  consumida: string;
  atendida: string;
  a_planejar: string;
  /** O que as ordens ligadas (não canceladas) cobrem. */
  coberta: string;
  /** O que o MRP vai planejar e nenhuma ordem ligada cobre: o que "Gerar OF agora" oferece. */
  sem_ordem: string;
  vence_em?: string;
  ordens?: OrdemDaDemanda[];
  /** As linhas de pedido que consumiram a demanda (rastreio). */
  consumo?: ConsumoDaVenda[];
}

export interface ConsumoDaVenda { pedido: number; sequencia: number; cliente?: string; data: string; quantidade: string }

/** Visão do consumo do item: previsão por semana, demandas de expectativa de venda e vendas. */
export interface ConsumoDoItem {
  item_business_code: string;
  item_name: string;
  estrategia: string;
  consumo_dias_antes: number;
  consumo_dias_depois: number;
  sob_encomenda: boolean;
  previsoes: { mask?: string; semana: string; quantidade: string; consumida: string; resto: string; consumo?: ConsumoDaVenda[] }[];
  demandas: { code_demand: number; mask?: string; motivo: string; data: string; quantidade: string; consumida: string; a_planejar: string; posicao: string; consumo?: ConsumoDaVenda[] }[];
  vendas: { pedido: number; sequencia: number; cliente?: string; mask?: string; data: string; quantidade: string; consumiu: string; acima: string }[];
  total_expectativa: string;
  total_consumido: string;
  total_a_planejar: string;
  total_vendido: string;
  total_acima: string;
}

/** Na alteração, campo omitido fica como está: para limpar, mande 0 (almoxarifado, cliente) ou "" (projeto, observação). */
export interface DemandaDTO {
  code_demand?: number;
  item_code: string;
  mask?: string;
  cost_center_code?: number;
  quantity: string;
  demand_date: string;
  motivo: Motivo;
  warehouse_id?: number;
  customer_code?: number;
  projeto?: string;
  prioridade?: number;
  observacao?: string;
  entregas?: number;
  intervalo_dias?: number;
}

export interface FiltroDemanda { item?: string; motivo?: string; situacao?: string; de?: string; ate?: string }

/** "1.234,5" ou "1234.5" → "1234.5"; vazio fica vazio. */
export function decimalParaApi(texto: string): string {
  const t = texto.trim().replace(/\s/g, "");
  if (!t) return "";
  return t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
}

const texto = (v: unknown) => (v == null ? "0" : String(v));
const lista = <T,>(d: unknown): T[] => (Array.isArray(d) ? (d as T[]) : []);
function norm(d: Demanda): Demanda {
  return {
    ...d, quantity: texto(d.quantity), consumida: texto(d.consumida), atendida: texto(d.atendida), a_planejar: texto(d.a_planejar),
    coberta: texto(d.coberta), sem_ordem: texto(d.sem_ordem),
    demand_date: (d.demand_date ?? "").slice(0, 10), vence_em: d.vence_em ? d.vence_em.slice(0, 10) : undefined,
    ordens: (d.ordens ?? []).map((o) => ({ ...o, quantidade: texto(o.quantidade), planejada: texto(o.planejada), produzida: texto(o.produzida) })),
    consumo: (d.consumo ?? []).map((c) => ({ ...c, quantidade: texto(c.quantidade), data: (c.data ?? "").slice(0, 10) })),
  };
}

export async function listarDemandas(f: FiltroDemanda = {}): Promise<Demanda[]> {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(f)) if (v) params[k] = v;
  // Sem situação o servidor devolve só as abertas (o desktop antigo não filtra).
  if (!f.situacao) params.situacao = "TODAS";
  const { data } = await httpClient.get(`${BASE}/list`, { params });
  return lista<Demanda>(data).map(norm);
}
export async function consumoDoItem(item: string): Promise<ConsumoDoItem> {
  const { data } = await httpClient.get(`${BASE}/consumo`, { params: { item } });
  const c = data as ConsumoDoItem;
  return { ...c, previsoes: c.previsoes ?? [], demandas: c.demandas ?? [], vendas: c.vendas ?? [] };
}
export async function obterDemanda(code: number): Promise<Demanda> {
  const { data } = await httpClient.get(`${BASE}/get-by-code/${code}`);
  return norm(data as Demanda);
}
/** Cria a demanda — ou as entregas da programação (entregas > 1). */
export async function criarDemanda(dto: DemandaDTO): Promise<Demanda[]> {
  const { data } = await httpClient.post(`${BASE}/`, dto);
  return lista<Demanda>(data).map(norm);
}
export async function alterarDemanda(code: number, dto: DemandaDTO): Promise<Demanda> {
  const { data } = await httpClient.put(`${BASE}/update/${code}`, dto);
  return norm(data as Demanda);
}
export async function cancelarDemanda(code: number, motivo: string): Promise<Demanda> {
  const { data } = await httpClient.post(`${BASE}/${code}/cancelar`, { motivo });
  return norm(data as Demanda);
}
export async function encerrarDemanda(code: number, motivo: string): Promise<Demanda> {
  const { data } = await httpClient.post(`${BASE}/${code}/encerrar`, { motivo });
  return norm(data as Demanda);
}
export async function atenderDemanda(code: number, dto: { quantidade: string; warehouse_id: number; movement_type_code: string; observacao?: string }): Promise<Demanda> {
  const { data } = await httpClient.post(`${BASE}/${code}/atender`, dto);
  return norm(data as Demanda);
}
export async function gerarOFDaDemanda(code: number, dto: { quantidade?: string; start_date?: string; end_date?: string; priority?: string; notes?: string }): Promise<Demanda> {
  const { data } = await httpClient.post(`${BASE}/${code}/gerar-of`, dto);
  return norm(data as Demanda);
}

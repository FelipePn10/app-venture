import { type ProductionOrderDTO, type ProductionOrderOrigin } from "@/services/productionOrderService";

/** Identificação da OF (VPRO0900): textos e árvore, sem componente. */

/** Código do item que o usuário conhece (o de negócio), com o nome. */
export function itemDaOF(o: ProductionOrderDTO): { codigo: string; nome: string } {
  return { codigo: o.origin?.item_business_code || o.item_code, nome: o.origin?.item_name ?? "" };
}

/** "Pedido 1203 · Demanda 88" — de onde vem a necessidade (na cadeia, a do produto final). */
export function origemDaNecessidade(x?: ProductionOrderOrigin): string {
  if (!x) return "";
  const partes: string[] = [];
  if (x.sales_orders.length) partes.push(`${x.sales_orders.length > 1 ? "Pedidos" : "Pedido"} ${x.sales_orders.join(", ")}`);
  if (x.demands.length) partes.push(`${x.demands.length > 1 ? "Demandas" : "Demanda"} ${x.demands.join(", ")}`);
  return partes.join(" · ");
}

/** "↳ para OF 239 · RN-01001" — a OF (ou planejada) que usa a peça desta. */
export function destinoDaPeca(x?: ProductionOrderOrigin): string {
  if (!x || x.level === 0) return "";
  const pai = x.parent_order_id ? `OF ${x.parent_order_id}` : x.parent_planned_order ? `planejada ${x.parent_planned_order}` : "";
  return pai ? `↳ para ${pai}${x.parent_item ? ` · ${x.parent_item}` : ""}` : "";
}

/** Tudo o que a busca da lista deve achar: cliente, projeto, pedido, demanda, OF pai. */
export function textoDeBusca(o: ProductionOrderDTO): string {
  const x = o.origin;
  if (!x) return "";
  return [
    x.item_business_code, x.item_name, x.customer_code, x.customer_name, x.project_code, x.project_name,
    ...x.sales_orders.map((p) => `pedido ${p} ${p}`), ...x.demands.map((d) => `demanda ${d} ${d}`),
    x.parent_order_id ? `of ${x.parent_order_id}` : "", x.parent_item, x.root_order_id ? `of ${x.root_order_id}` : "", x.root_item,
  ].filter(Boolean).join(" ");
}

/** Linha da lista em árvore: uma OF (com o nível) ou o cabeçalho de um grupo. */
export type LinhaDaArvore =
  | { tipo: "of"; o: ProductionOrderDTO; nivel: number }
  | { tipo: "grupo"; chave: string; titulo: string; detalhe: string; quantidade: number };

/** Grupo da OF sem OF pai na lista: o pedido, senão a demanda, senão o projeto. */
function grupoDaOF(o: ProductionOrderDTO): { chave: string; titulo: string; detalhe: string } | null {
  const x = o.origin;
  if (!x) return null;
  const cliente = x.customer_name ?? "";
  if (x.sales_orders.length) return { chave: `p${x.sales_orders[0]}`, titulo: `Pedido ${x.sales_orders[0]}`, detalhe: [cliente, x.project_code ? `Projeto ${x.project_code}` : ""].filter(Boolean).join(" · ") };
  if (x.demands.length) return { chave: `d${x.demands[0]}`, titulo: `Demanda ${x.demands[0]}`, detalhe: [cliente, x.project_code ? `Projeto ${x.project_code}` : ""].filter(Boolean).join(" · ") };
  if (x.project_code) return { chave: `j${x.project_code}`, titulo: `Projeto ${x.project_code}`, detalhe: [x.project_name !== x.project_code ? x.project_name : "", cliente].filter(Boolean).join(" · ") };
  return null;
}

/**
 * Árvore: agrupada pelo pedido de venda (senão a demanda, senão o projeto)
 * que a ordem atende; dentro do grupo, a OF do produto final com as OFs dos
 * componentes fabricados para ela penduradas, cada nível na ordem em que
 * começa. OF cuja pai não está na lista (filtro) fica no topo do grupo. OF sem
 * pedido, demanda nem projeto vai para o fim, sem grupo.
 */
export function emArvore(lista: ProductionOrderDTO[]): LinhaDaArvore[] {
  const porId = new Map(lista.filter((o) => o.id).map((o) => [o.id as number, o]));
  const filhas = new Map<number, ProductionOrderDTO[]>();
  const raizes: ProductionOrderDTO[] = [];
  for (const o of lista) {
    const pai = o.origin?.parent_order_id;
    if (pai && porId.has(pai) && pai !== o.id) {
      const l = filhas.get(pai) ?? [];
      l.push(o);
      filhas.set(pai, l);
    } else raizes.push(o);
  }
  const ordem = (a: ProductionOrderDTO, b: ProductionOrderDTO) =>
    (a.start_date ?? "9999").localeCompare(b.start_date ?? "9999") || (a.id ?? 0) - (b.id ?? 0);
  const visitadas = new Set<number>();
  const descer = (o: ProductionOrderDTO, nivel: number, out: LinhaDaArvore[]) => {
    if (o.id && visitadas.has(o.id)) return; // elo circular não trava a tela
    if (o.id) visitadas.add(o.id);
    out.push({ tipo: "of", o, nivel });
    for (const f of (o.id ? filhas.get(o.id) : undefined)?.sort(ordem) ?? []) descer(f, nivel + 1, out);
  };
  const grupos = new Map<string, { titulo: string; detalhe: string; raizes: ProductionOrderDTO[] }>();
  const soltas: ProductionOrderDTO[] = [];
  for (const r of raizes.sort(ordem)) {
    const g = grupoDaOF(r);
    if (!g) { soltas.push(r); continue; }
    const atual = grupos.get(g.chave) ?? { titulo: g.titulo, detalhe: g.detalhe, raizes: [] };
    atual.raizes.push(r);
    grupos.set(g.chave, atual);
  }
  const out: LinhaDaArvore[] = [];
  for (const [chave, g] of grupos) {
    const corpo: LinhaDaArvore[] = [];
    for (const r of g.raizes) descer(r, 0, corpo);
    out.push({ tipo: "grupo", chave, titulo: g.titulo, detalhe: g.detalhe, quantidade: corpo.length }, ...corpo);
  }
  if (soltas.length && grupos.size) out.push({ tipo: "grupo", chave: "-", titulo: "Sem pedido, demanda ou projeto", detalhe: "", quantidade: soltas.length });
  for (const r of soltas) descer(r, 0, out);
  return out;
}

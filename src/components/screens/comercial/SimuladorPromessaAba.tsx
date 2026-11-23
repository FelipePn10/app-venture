import { useState } from "react";
import { simularPromessa, type Promessa } from "@/services/gestaoService";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems } from "@/services/lookups";
import { Aviso, Painel, Selo, Vazio } from "../planejamento/planUi";
import { data, num, type Tom } from "../planejamento/planFormat";
import { useAcao } from "../planejamento/planHooks";

/**
 * Visão "Simular pelo estoque" da VDPR0100: "se o cliente pedir isto hoje, quando eu
 * entrego?". Olha o estoque livre, o que já vai entrar (OF e compra), e o que
 * faltar é fabricado ou comprado pelo lead time — descendo a estrutura. Nada é
 * gravado nem reservado: é uma consulta para o vendedor responder na hora.
 */
const ORIGEM: Record<string, { rotulo: string; tom: Tom }> = {
  ESTOQUE: { rotulo: "Do estoque", tom: "ok" }, ENTRADA_PREVISTA: { rotulo: "Entrada prevista", tom: "info" },
  NOVA_PRODUCAO: { rotulo: "Fabricar", tom: "warn" }, NOVA_COMPRA: { rotulo: "Comprar", tom: "warn" },
};
interface Linha { item_code: string; quantity: string }

function Arvore({ p, nivel = 0 }: { p: Promessa; nivel?: number }): JSX.Element {
  const o = ORIGEM[p.source] ?? { rotulo: p.source, tom: "muted" as Tom };
  return (<>
    <tr>
      <td style={{ paddingLeft: 8 + nivel * 18 }}>{nivel > 0 ? "↳ " : ""}<strong>{p.item_code}</strong></td>
      <td className="num">{num(p.quantity)}</td><td><Selo tom={o.tom}>{o.rotulo}</Selo></td>
      <td><strong>{data(p.promised_date)}</strong></td>
      <td className="erp-text-muted" style={{ fontSize: 12 }}>{p.explanation.join(" · ")}</td>
    </tr>
    {p.components.map((c, i) => <Arvore key={`${c.item_code}-${i}`} p={c} nivel={nivel + 1} />)}
  </>);
}

export function SimuladorPromessaAba(): JSX.Element {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [linhas, setLinhas] = useState<Linha[]>([{ item_code: "", quantity: "1" }]);
  const [res, setRes] = useState<Promessa[] | null>(null);

  const simular = () => void run(async () => {
    const validas = linhas.filter((l) => l.item_code && Number(l.quantity.replace(",", ".")) > 0).map((l) => ({ ...l, quantity: l.quantity.replace(",", ".") }));
    if (!validas.length) { setFeedback({ type: "error", message: "Informe ao menos um item com quantidade." }); return; }
    setRes(await simularPromessa(validas));
  });
  const ultima = res?.reduce<string>((m, p) => (p.promised_date > m ? p.promised_date : m), "");
  const set = (i: number, l: Partial<Linha>) => { setLinhas((x) => x.map((y, j) => (j === i ? { ...y, ...l } : y))); setRes(null); };

  return (
          <div className="erp-detail-body">
            <Aviso feedback={feedback} busy={busy} />
            <Painel titulo="O que o cliente quer" sub="os itens disputam o mesmo estoque, na ordem da lista"
              acoes={<><button className="erp-btn erp-btn-sm" onClick={() => setLinhas((x) => [...x, { item_code: "", quantity: "1" }])}>+ Item</button>
                <button className="erp-btn erp-btn-primary erp-btn-sm" onClick={simular} disabled={busy}>Simular</button></>}>
              {linhas.map((l, i) => (
                <div key={i} className="erp-fieldset-body" style={{ padding: 0, alignItems: "flex-end" }}>
                  <div className="erp-field erp-c8"><label className="erp-label">Item</label>
                    <LookupField value={l.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(c) => set(i, { item_code: c ? String(c) : "" })} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label" htmlFor={`pr-q-${i}`}>Quantidade</label>
                    <input id={`pr-q-${i}`} className="erp-input" inputMode="decimal" value={l.quantity} onChange={(e) => set(i, { quantity: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") simular(); }} /></div>
                  <div className="erp-field erp-c1">{linhas.length > 1 && <button className="erp-btn erp-btn-ghost erp-btn-sm" aria-label="Remover item" onClick={() => { setLinhas((x) => x.filter((_, j) => j !== i)); setRes(null); }}>✕</button>}</div>
                </div>
              ))}
            </Painel>
            {!res ? <Vazio titulo="Monte o cenário e simule" texto="A data conta dias úteis: a fila dos centros do roteiro, o prazo de fabricação e o prazo de compra do fornecedor de cada item. Para reservar capacidade de tanque de verdade, use a visão Reserva de tanque." /> : (<>
              {ultima && (
                <div className="erp-fieldset" style={{ borderColor: "var(--v-green, #3d7a3d)" }}>
                  <div className="vpl-panel-body" style={{ fontSize: 15 }}>Dá para entregar tudo em <strong>{data(ultima)}</strong>.</div>
                </div>
              )}
              <Painel titulo="Como a data foi formada" flush>
                <table className="erp-grid">
                  <thead><tr><th>Item</th><th className="num">Qtd</th><th>De onde vem</th><th>Pronto em</th><th>Explicação</th></tr></thead>
                  <tbody>{res.map((p, i) => <Arvore key={`${p.item_code}-${i}`} p={p} />)}</tbody>
                </table>
              </Painel>
            </>)}
          </div>
  );
}

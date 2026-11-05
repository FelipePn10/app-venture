import { Fragment, useState } from "react";
import { cancelarOndaSeparacao, confirmarOndaSeparacao, criarOndaSeparacao, linhasDaCargaParaOnda, linhasDoPedidoParaOnda, listarOndas, type OndaDTO } from "@/services/stockService";
import { EntityName } from "@/components/ui/EntityName";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadSalesOrders } from "@/services/lookups";
import { qtd, useAcao, REFERENCE_LABEL } from "./comum";
import { FeedbackBox, Resumo } from "./ui";

type Linha = { item_code: string; quantity: string; mask?: string; pedido?: number };
const NOVA: Linha = { item_code: "", quantity: "" };
const SITUACAO: Record<string, string> = { ABERTA: "Aberta", SEPARADA: "Separada", CANCELADA: "Cancelada" };

/**
 * Onda de separação: várias necessidades numa caminhada só. Com pedido, a onda
 * usa a reserva dele e não baixa o estoque (a saída é da nota fiscal); sem
 * pedido, a confirmação baixa o que foi separado.
 */
const REGRA: Record<string, string> = { ITEM: "de cada item", FEFO: "FEFO", FIFO: "FIFO" };

export function OndasSecao({ almox }: { almox: number }) {
  const [regra, setRegra] = useState("");
  const [carga, setCarga] = useState("");
  const { busy, feedback, setFeedback, run } = useAcao();
  const [linhas, setLinhas] = useState<Linha[]>([{ ...NOVA }]);
  const [pedido, setPedido] = useState<number | undefined>();
  const [onda, setOnda] = useState<OndaDTO | null>(null);
  const [separado, setSeparado] = useState<Record<number, string>>({});
  const [lista, setLista] = useState<OndaDTO[]>([]);

  const abrir = (o: OndaDTO) => { setOnda(o); setSeparado(Object.fromEntries(o.lines.map((l) => [l.id, String(l.quantity)]))); };
  const trazerPedido = () => run(async () => {
    if (!pedido || !almox) { setFeedback({ type: "error", message: "Escolha o almoxarifado (acima) e o pedido." }); return; }
    const r = await linhasDoPedidoParaOnda(pedido, almox);
    if (r.length === 0) { setFeedback({ type: "error", message: "O pedido não tem nada a separar neste almoxarifado." }); return; }
    setLinhas((p) => [...p.filter((l) => l.item_code), ...r.map((l) => ({ item_code: l.item_code, quantity: l.quantity, mask: l.mask, pedido: l.reference_code }))]);
    setPedido(undefined);
  });
  const trazerCarga = () => run(async () => {
    const numero = Number(carga);
    if (!numero || !almox) { setFeedback({ type: "error", message: "Escolha o almoxarifado (acima) e informe a carga." }); return; }
    const r = await linhasDaCargaParaOnda(numero, almox);
    if (r.length === 0) { setFeedback({ type: "error", message: "A carga não tem nada a separar neste almoxarifado." }); return; }
    setLinhas((p) => [...p.filter((l) => l.item_code), ...r.map((l) => ({ item_code: l.item_code, quantity: l.quantity, mask: l.mask, pedido: l.reference_code }))]);
    setCarga("");
  });
  const gerarOnda = () => run(async () => {
    const validas = linhas.filter((l) => l.item_code && Number(l.quantity.replace(",", ".")) > 0);
    if (!almox || validas.length === 0) { setFeedback({ type: "error", message: "Escolha o almoxarifado (acima) e ao menos um item com quantidade." }); return; }
    const r = await criarOndaSeparacao({
      warehouse_id: almox, rule: regra,
      lines: validas.map((l) => ({
        item_code: l.item_code, quantity: l.quantity.replace(",", "."), mask: l.mask,
        reference_type: l.pedido ? "SALES_ORDER" : undefined, reference_code: l.pedido,
      })),
    });
    abrir(r);
    setLinhas([{ ...NOVA }]);
    setFeedback(r.missing.length ? { type: "error", message: `Onda ${r.code} criada com falta em ${r.missing.length} item(ns).` } : { type: "success", message: `Onda ${r.code}: ${r.lines.length} parada(s) na caminhada.` });
  });
  const encerrar = (confirmar: boolean) => run(async () => {
    if (!onda) return;
    if (confirmar && onda.lines.some((l) => { const q = Number((separado[l.id] ?? "").replace(",", ".")); return !Number.isFinite(q) || q < 0 || q > l.quantity; })) {
      setFeedback({ type: "error", message: "Revise o separado: cada parada aceita de zero até a quantidade pedida." });
      return;
    }
    const r = confirmar
      ? await confirmarOndaSeparacao(onda.code, onda.lines.map((l) => ({ id: l.id, picked_qty: (separado[l.id] ?? "0").replace(",", ".") })))
      : await cancelarOndaSeparacao(onda.code);
    setOnda({ ...r, missing: [] });
    const curto = r.lines.filter((l) => l.picked_qty < l.quantity).length;
    setFeedback({ type: "success", message: !confirmar ? `Onda ${r.code} cancelada: o reservado voltou.` : curto ? `Onda ${r.code} separada com falta em ${curto} parada(s).` : `Onda ${r.code} separada.` });
    if (lista.length) setLista(await listarOndas());
  });

  return (<>
    <FeedbackBox feedback={feedback} />
    <div className="erp-fieldset"><div className="erp-fieldset-head">Onda de separação (várias necessidades numa caminhada)</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c6"><label className="erp-label">Trazer do pedido de venda</label>
        <LookupField value={pedido} loader={loadSalesOrders} entityLabel="pedido" clearable onChange={(c) => setPedido(c ? Number(c) : undefined)} /></div>
      <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn" onClick={trazerPedido} disabled={busy}>Trazer itens</button></div>
      <div className="erp-field erp-c2"><label className="erp-label">Trazer da carga</label><input className="erp-input num" value={carga} onChange={(e) => setCarga(e.target.value)} /></div>
      <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn" onClick={trazerCarga} disabled={busy}>Trazer carga</button></div>
      <div className="erp-field erp-c3"><label className="erp-label">Regra da onda</label>
        <select className="erp-input" value={regra} onChange={(e) => setRegra(e.target.value)}>
          <option value="">Regra de cada item</option><option value="FEFO">Vence primeiro (FEFO)</option><option value="FIFO">Entrou primeiro (FIFO)</option></select></div>
      {linhas.map((l, i) => (
        <Fragment key={i}>
          <div className="erp-field erp-c6"><label className="erp-label">{i === 0 ? "Item" : ""}</label>
            <LookupField value={l.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(c) => setLinhas((p) => p.map((x, j) => (j === i ? { ...x, item_code: String(c ?? "") } : x)))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">{i === 0 ? "Quantidade" : ""}</label>
            <input className="erp-input num" value={l.quantity} onChange={(e) => setLinhas((p) => p.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} /></div>
          <div className="erp-field erp-c2" style={{ alignSelf: "center" }}>{l.pedido ? <small><EntityName code={l.pedido} loader={loadSalesOrders} prefix="Pedido" showCode={false} /></small> : null}</div>
          <div className="erp-field erp-c2" style={{ alignSelf: "end" }}>{linhas.length > 1 && <button className="erp-btn erp-btn-sm" onClick={() => setLinhas((p) => p.filter((_, j) => j !== i))}>Remover</button>}</div>
        </Fragment>
      ))}
      <div className="erp-field erp-c12" style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <button className="erp-btn" onClick={() => setLinhas((p) => [...p, { ...NOVA }])}>+ Item</button>
        <button className="erp-btn erp-btn-primary" onClick={gerarOnda} disabled={busy}>Gerar onda</button>
        <button className="erp-btn" onClick={() => run(async () => { setLista(await listarOndas()); })} disabled={busy}>Consultar ondas</button>
      </div>
      {lista.length > 0 && (
        <div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Onda</th><th>Situação</th><th>Regra</th><th className="num">Paradas</th><th></th></tr></thead>
            <tbody>{lista.map((o) => (
              <tr key={o.id}><td><strong>{o.code}</strong></td><td>{SITUACAO[o.status] ?? o.status}</td><td>{REGRA[o.rule] ?? o.rule}</td><td className="num">{o.lines.length}</td>
                <td><button className="erp-btn erp-btn-sm" onClick={() => abrir(o)}>Abrir</button></td></tr>))}</tbody>
          </table>
        </div>
      )}
      {onda && (
        <div className="erp-field erp-c12">
          <div><Resumo>Onda <strong>{onda.code}</strong> · {SITUACAO[onda.status] ?? onda.status} · regra {REGRA[onda.rule] ?? onda.rule} · {onda.lines.length} parada(s)
            {onda.missing.length > 0 && <> · <strong>falta:</strong> {onda.missing.map((m, i) => <span key={m.item_code}>{i > 0 && ", "}<EntityName code={m.item_code} loader={loadItems} prefix="Item" showCode={false} /> ({qtd(m.quantity)})</span>)}</>}</Resumo></div>
          <table className="erp-grid">
            <thead><tr><th>Rota</th><th>Endereço</th><th>Item</th><th>Lote</th><th>Corrida</th><th className="num">Quantidade</th><th className="num">Separado</th><th>Origem</th></tr></thead>
            <tbody>{onda.lines.map((l) => (
              <tr key={l.id}><td className="num">{l.pick_sequence || "—"}</td><td><strong>{l.address || "—"}</strong></td>
                <td><EntityName code={l.item_code} loader={loadItems} prefix="Item" /></td><td>{l.lot || "—"}</td><td>{l.heat_number ?? "—"}</td>
                <td className="num">{qtd(l.quantity)}</td>
                <td className="num">{onda.status === "ABERTA"
                  ? <input className="erp-input num" style={{ maxWidth: 110 }} aria-label={`Separado no endereço ${l.address}`} value={separado[l.id] ?? ""} onChange={(e) => setSeparado((p) => ({ ...p, [l.id]: e.target.value }))} />
                  : qtd(l.picked_qty)}</td>
                <td>{l.reference_type === "SALES_ORDER" && l.reference_code
                  ? <EntityName code={l.reference_code} loader={loadSalesOrders} prefix="Pedido" showCode={false} />
                  : l.reference_type ? `${REFERENCE_LABEL[l.reference_type] ?? "Documento"} ${l.reference_code ?? ""}` : "—"}</td></tr>))}</tbody>
          </table>
          {onda.status === "ABERTA" && (
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              <button className="erp-btn erp-btn-primary" onClick={() => encerrar(true)} disabled={busy}>Confirmar separação</button>
              <button className="erp-btn" onClick={() => encerrar(false)} disabled={busy}>Cancelar onda</button>
            </div>
          )}
        </div>
      )}
    </div></div>
  </>);
}

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  baixarTransito, confirmarOndaSeparacao, countInventoryItem, listarOndas, listarSaldoPorEndereco, listarTransitos, listInventories, resolverLeitura, transferirEntreEnderecos,
  type InventoryDTO, type LeituraDTO, type OndaDTO, type SaldoEnderecoDTO, type TransitoDTO,
} from "@/services/stockService";
import { listCycleCounts, transitionCycleCount, type CycleCount } from "@/services/notificationService";
import { getOrderDetail, receiveOrder, type PurchaseOrderDTO, type PurchaseOrderItemDTO } from "@/services/purchaseOrderService";
import { Code128Barcode } from "@/components/ui/Code128Barcode";
import { EntityName } from "@/components/ui/EntityName";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadWarehouseAddresses, loadWarehouses } from "@/services/lookups";
import { dataBR, qtd, useAcao } from "./estoque/comum";
import { FeedbackBox } from "./estoque/ui";

type Modo = "consultar" | "separar" | "contar" | "mover" | "receber" | "compra" | "ciclica" | "etiquetas";
const MODOS: { id: Modo; label: string; dica: string }[] = [
  { id: "consultar", label: "Consultar", dica: "Leia um item, lote ou endereço para ver o saldo" },
  { id: "separar", label: "Separar", dica: "Siga as paradas da onda, lendo endereço e item" },
  { id: "contar", label: "Contar", dica: "Leia endereço e item e digite o que contou" },
  { id: "mover", label: "Mover", dica: "Leia item, endereço de origem e endereço de destino" },
  { id: "receber", label: "Receber", dica: "Leia o item do envio em trânsito que chegou a este almoxarifado" },
  { id: "compra", label: "Receber compra", dica: "Informe o pedido de compra, leia o item e digite o que chegou" },
  { id: "ciclica", label: "Contagem cíclica", dica: "Escolha a contagem programada e digite o que contou" },
  { id: "etiquetas", label: "Etiquetas", dica: "Imprima as etiquetas de endereço e de item" },
];
const CHAVE_ALMOX = "vest0150.almox";
const CHAVE_ONDA = "vest0150.onda.";
const grande = { fontSize: 22, height: 52 } as const;

function lerGuardado(chave: string): string | null {
  try { return localStorage.getItem(chave); } catch { return null; }
}
function guardar(chave: string, valor: string | null) {
  try { if (valor === null) localStorage.removeItem(chave); else localStorage.setItem(chave, valor); } catch { /* sem armazenamento, segue sem guardar */ }
}

/** Campo do leitor: o leitor digita o código e manda Enter. Fica sempre pronto para a próxima leitura. */
function CampoLeitura({ rotulo, onLer, disabled }: { rotulo: string; onLer: (codigo: string) => void; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [valor, setValor] = useState("");
  useEffect(() => { if (!disabled) ref.current?.focus(); }, [rotulo, disabled]);
  return (
    <div className="erp-field erp-c12"><label className="erp-label">{rotulo}</label>
      <input ref={ref} className="erp-input" style={grande} aria-label={rotulo} value={valor} disabled={disabled} autoComplete="off"
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || !valor.trim()) return;
          e.preventDefault();
          onLer(valor.trim());
          setValor("");
        }} /></div>
  );
}

function CampoQuantidade({ rotulo, inicial, onConfirmar }: { rotulo: string; inicial: string; onConfirmar: (q: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [valor, setValor] = useState(inicial);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  const enviar = () => { if (Number(valor.replace(",", ".")) >= 0 && valor.trim()) onConfirmar(valor.replace(",", ".")); };
  return (
    <div className="erp-field erp-c12"><label className="erp-label">{rotulo}</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input ref={ref} className="erp-input num" style={grande} aria-label={rotulo} inputMode="decimal" value={valor}
          onChange={(e) => setValor(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") enviar(); }} />
        <button className="erp-btn erp-btn-primary" style={grande} onClick={enviar}>Confirmar</button>
      </div></div>
  );
}

const Destaque = ({ children }: { children: ReactNode }) => <div className="erp-field erp-c12" style={{ fontSize: 20, fontWeight: 600 }}>{children}</div>;

function Consultar({ almox, ler }: { almox: number; ler: (c: string) => Promise<LeituraDTO | null> }) {
  const { feedback, run } = useAcao();
  const [lida, setLida] = useState<LeituraDTO | null>(null);
  const [saldos, setSaldos] = useState<SaldoEnderecoDTO[]>([]);
  const consultar = (c: string) => run(async () => {
    const l = await ler(c);
    if (!l) return;
    setLida(l);
    const todos = await listarSaldoPorEndereco(almox || l.warehouse_id, l.item_code);
    setSaldos(l.kind === "ENDERECO" ? todos.filter((s) => s.address === l.address) : todos);
  });
  return (<>
    <FeedbackBox feedback={feedback} />
    <CampoLeitura rotulo="Leia o código" onLer={consultar} />
    {lida && <Destaque>{lida.kind === "ENDERECO" ? `Endereço ${lida.address}${lida.blocked ? " (bloqueado)" : ""}` : lida.name}{lida.lot ? ` · lote ${lida.lot}` : ""}{lida.expires_at ? ` · validade ${dataBR(lida.expires_at)}` : ""}</Destaque>}
    {lida && (
      <div className="erp-field erp-c12"><table className="erp-grid">
        <thead><tr><th>Endereço</th><th>Item</th><th>Lote</th><th className="num">Quantidade</th></tr></thead>
        <tbody>
          {saldos.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Sem saldo.</td></tr>}
          {saldos.map((s, i) => <tr key={i}><td>{s.address || "—"}</td><td><EntityName code={s.item_code} loader={loadItems} prefix="Item" /></td><td>{s.lot || "—"}</td><td className="num">{qtd(s.quantity)}</td></tr>)}
        </tbody>
      </table></div>
    )}
  </>);
}

function Separar({ almox, ler, erro }: { almox: number; ler: (c: string) => Promise<LeituraDTO | null>; erro: (m: string) => void }) {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [ondas, setOndas] = useState<OndaDTO[]>([]);
  const [onda, setOnda] = useState<OndaDTO | null>(null);
  const [feito, setFeito] = useState<Record<number, string>>({});
  const [etapa, setEtapa] = useState<"endereco" | "item" | "quantidade">("endereco");

  const carregar = useCallback(() => run(async () => { setOndas((await listarOndas("ABERTA")).filter((o) => o.warehouse_id === almox)); }), [run, almox]);
  useEffect(() => { void carregar(); }, [carregar]);

  const parada = onda?.lines.find((l) => feito[l.id] === undefined);
  const inicio = (l?: { address: string }) => (l?.address ? "endereco" : "item");
  const abrir = (o: OndaDTO) => {
    let salvo: Record<number, string> = {};
    try { salvo = JSON.parse(lerGuardado(CHAVE_ONDA + o.code) ?? "{}"); } catch { salvo = {}; }
    setOnda(o); setFeito(salvo);
    setEtapa(inicio(o.lines.find((l) => salvo[l.id] === undefined)));
  };
  const anotar = (id: number, q: string) => {
    const novo = { ...feito, [id]: q };
    setFeito(novo);
    guardar(CHAVE_ONDA + onda!.code, JSON.stringify(novo));
    setEtapa(inicio(onda!.lines.find((l) => novo[l.id] === undefined)));
  };
  const lerParada = (c: string) => run(async () => {
    if (!parada) return;
    const l = await ler(c);
    if (!l) return;
    if (etapa === "endereco") {
      if (l.kind !== "ENDERECO" || l.address !== parada.address) { erro(`Endereço errado: vá até ${parada.address}.`); return; }
      setEtapa("item");
      return;
    }
    if (l.kind !== "ITEM" || l.item_code !== parada.item_code) { erro("Item errado para esta parada."); return; }
    if (parada.lot && l.lot && l.lot !== parada.lot) { erro(`Lote errado: a separação pede o lote ${parada.lot}.`); return; }
    setEtapa("quantidade");
  });
  const concluir = () => run(async () => {
    if (!onda) return;
    const r = await confirmarOndaSeparacao(onda.code, onda.lines.map((l) => ({ id: l.id, picked_qty: feito[l.id] ?? "0" })));
    guardar(CHAVE_ONDA + onda.code, null);
    setOnda(null); setFeito({});
    setOndas((await listarOndas("ABERTA")).filter((o) => o.warehouse_id === almox));
    setFeedback({ type: "success", message: `Onda ${r.code} separada.` });
  });

  return (<>
    <FeedbackBox feedback={feedback} />
    {!onda && (
      <div className="erp-field erp-c12"><table className="erp-grid">
        <thead><tr><th>Onda</th><th className="num">Paradas</th><th></th></tr></thead>
        <tbody>
          {ondas.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhuma onda aberta neste almoxarifado.</td></tr>}
          {ondas.map((o) => <tr key={o.id}><td><strong>{o.code}</strong></td><td className="num">{o.lines.length}</td><td><button className="erp-btn erp-btn-primary" onClick={() => abrir(o)}>Separar</button></td></tr>)}
        </tbody>
      </table></div>
    )}
    {onda && parada && (<>
      <Destaque>Parada {Object.keys(feito).length + 1} de {onda.lines.length}: {parada.address || "sem endereço"}{parada.lot ? ` · lote ${parada.lot}` : ""}</Destaque>
      <Destaque><EntityName code={parada.item_code} loader={loadItems} prefix="Item" /> · {qtd(parada.quantity)}</Destaque>
      {etapa !== "quantidade"
        ? <CampoLeitura rotulo={etapa === "endereco" ? "Leia o endereço" : "Leia o item"} onLer={lerParada} disabled={busy} />
        : <CampoQuantidade key={parada.id} rotulo="Quantidade separada" inicial={String(parada.quantity)} onConfirmar={(q) => {
          if (Number(q) > parada.quantity) { erro(`Esta parada pede só ${qtd(parada.quantity)}.`); return; }
          anotar(parada.id, q);
        }} />}
      <div className="erp-field erp-c12"><button className="erp-btn" onClick={() => anotar(parada.id, "0")}>Não encontrei</button></div>
    </>)}
    {onda && !parada && (<>
      <Destaque>Todas as paradas foram lidas.</Destaque>
      <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" style={grande} onClick={concluir} disabled={busy}>Concluir separação</button></div>
    </>)}
  </>);
}

function Contar({ almox, ler }: { almox: number; ler: (c: string) => Promise<LeituraDTO | null> }) {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [inventarios, setInventarios] = useState<InventoryDTO[]>([]);
  const [inv, setInv] = useState<InventoryDTO | null>(null);
  const [endereco, setEndereco] = useState("");
  const [item, setItem] = useState<LeituraDTO | null>(null);

  const carregar = useCallback(() => run(async () => { setInventarios((await listInventories()).filter((i) => i.status === "OPEN" && i.warehouse_id === almox)); }), [run, almox]);
  useEffect(() => { void carregar(); }, [carregar]);

  const lerCodigo = (c: string) => run(async () => {
    const l = await ler(c);
    if (!l) return;
    if (l.kind === "ENDERECO") { setEndereco(l.address ?? ""); setItem(null); return; }
    setItem(l);
  });
  const contar = (q: string) => run(async () => {
    await countInventoryItem({ inventory_id: inv!.id!, item_code: item!.item_code!, warehouse_id: almox, address: endereco, lot: item!.lot ?? "", counted_qty: Number(q) });
    setFeedback({ type: "success", message: `Contado: ${item!.name} = ${q.replace(".", ",")}.` });
    setItem(null);
  });

  return (<>
    <FeedbackBox feedback={feedback} />
    {!inv && (
      <div className="erp-field erp-c12"><table className="erp-grid">
        <thead><tr><th>Inventário</th><th>Descrição</th><th></th></tr></thead>
        <tbody>
          {inventarios.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhum inventário em contagem neste almoxarifado.</td></tr>}
          {inventarios.map((i) => <tr key={i.id}><td><strong>{i.code}</strong></td><td>{i.description}</td><td><button className="erp-btn erp-btn-primary" onClick={() => setInv(i)}>Contar</button></td></tr>)}
        </tbody>
      </table></div>
    )}
    {inv && (<>
      <Destaque>Inventário {inv.code} · endereço {endereco || "não lido"}{item ? ` · ${item.name}${item.lot ? ` · lote ${item.lot}` : ""}` : ""}</Destaque>
      {item
        ? <CampoQuantidade key={item.item_code} rotulo="Quantidade contada" inicial={item.quantity != null ? String(item.quantity) : ""} onConfirmar={contar} />
        : <CampoLeitura rotulo="Leia o endereço ou o item" onLer={lerCodigo} disabled={busy} />}
    </>)}
  </>);
}

function Mover({ almox, ler, erro }: { almox: number; ler: (c: string) => Promise<LeituraDTO | null>; erro: (m: string) => void }) {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [item, setItem] = useState<LeituraDTO | null>(null);
  const [de, setDe] = useState("");
  const [para, setPara] = useState("");
  const [lote, setLote] = useState("");
  const rotulo = !item ? "Leia o item" : !de ? "Leia o endereço de origem" : "Leia o endereço de destino";
  const lerCodigo = (c: string) => run(async () => {
    const l = await ler(c);
    if (!l) return;
    if (!item) { if (l.kind !== "ITEM") { erro("Leia o item primeiro."); return; } setItem(l); return; }
    if (l.kind !== "ENDERECO") { erro("Leia um endereço."); return; }
    if (!de) { setDe(l.address ?? ""); return; }
    if (l.address === de) { erro("O destino é igual à origem."); return; }
    setPara(l.address ?? "");
  });
  const mover = (q: string) => run(async () => {
    await transferirEntreEnderecos({ item_code: item!.item_code!, warehouse_id: almox, address_from: de, address_to: para, quantity: Number(q), lot: item!.lot || lote.trim() || undefined });
    setFeedback({ type: "success", message: `${q.replace(".", ",")} de ${de} para ${para}.` });
    setItem(null); setDe(""); setPara(""); setLote("");
  });
  return (<>
    <FeedbackBox feedback={feedback} />
    <Destaque>{item?.name ?? "Item não lido"}{de ? ` · de ${de}` : ""}{para ? ` · para ${para}` : ""}</Destaque>
    {para && !item?.lot && (
      <div className="erp-field"><label className="erp-label">Lote (se o saldo tiver lote)</label>
        <input className="erp-input" value={lote} onChange={(e) => setLote(e.target.value)} /></div>
    )}
    {para ? <CampoQuantidade rotulo="Quantidade" inicial="" onConfirmar={mover} /> : <CampoLeitura rotulo={rotulo} onLer={lerCodigo} disabled={busy} />}
  </>);
}

function ContagemCiclica({ almox }: { almox: number }) {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [lista, setLista] = useState<CycleCount[]>([]);
  const [atual, setAtual] = useState<CycleCount | null>(null);

  const carregar = useCallback(() => run(async () => {
    setLista((await listCycleCounts(200)).filter((c) => c.warehouse_id === almox && (c.state === "PROGRAMADA" || c.state === "EM_CONTAGEM")));
  }), [run, almox]);
  useEffect(() => { void carregar(); }, [carregar]);

  const contar = (q: string) => run(async () => {
    if (atual!.state === "PROGRAMADA") await transitionCycleCount(atual!.id, "EM_CONTAGEM");
    await transitionCycleCount(atual!.id, "CONCLUIDA", q);
    setAtual(null);
    setLista((await listCycleCounts(200)).filter((c) => c.warehouse_id === almox && (c.state === "PROGRAMADA" || c.state === "EM_CONTAGEM")));
    setFeedback({ type: "success", message: `Contagem registrada: ${q.replace(".", ",")}.` });
  });

  return (<>
    <FeedbackBox feedback={feedback} />
    {!atual && (
      <div className="erp-field erp-c12"><table className="erp-grid">
        <thead><tr><th>Item</th><th>Endereço</th><th>Lote</th><th>Programada</th><th></th></tr></thead>
        <tbody>
          {lista.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhuma contagem programada neste almoxarifado.</td></tr>}
          {lista.map((c) => <tr key={c.id}><td>{c.item_code}</td><td>{c.address || "—"}</td><td>{c.lot_code || "—"}</td><td>{c.scheduled_for?.slice(0, 10).split("-").reverse().join("/")}</td>
            <td><button className="erp-btn erp-btn-primary" onClick={() => setAtual(c)} disabled={busy}>Contar</button></td></tr>)}
        </tbody>
      </table></div>
    )}
    {atual && (<>
      <Destaque>Item {atual.item_code}{atual.address ? ` · endereço ${atual.address}` : ""}{atual.lot_code ? ` · lote ${atual.lot_code}` : ""}</Destaque>
      <CampoQuantidade key={atual.id} rotulo="Quantidade contada" inicial="" onConfirmar={contar} />
    </>)}
  </>);
}

function ReceberCompra({ almox, ler, erro }: { almox: number; ler: (c: string) => Promise<LeituraDTO | null>; erro: (m: string) => void }) {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [pedido, setPedido] = useState<PurchaseOrderDTO | null>(null);
  const [linha, setLinha] = useState<PurchaseOrderItemDTO | null>(null);
  const [lote, setLote] = useState("");
  const pendente = (l: PurchaseOrderItemDTO) => l.requested_qty - (l.received_qty ?? 0);

  const lerPedido = (c: string) => run(async () => {
    const numero = Number(c.trim());
    if (!numero) { erro("Digite o número do pedido."); return; }
    setPedido(await getOrderDetail(numero));
  });
  const lerItem = (c: string) => run(async () => {
    const l = await ler(c);
    if (!l) return;
    const achada = (pedido!.items ?? []).find((x) => x.item_code === l.item_code && pendente(x) > 0);
    if (!achada) { erro("Este item não tem saldo a receber neste pedido."); return; }
    setLote(l.lot ?? "");
    setLinha(achada);
  });
  const receber = (q: string) => run(async () => {
    await receiveOrder(pedido!.code!, [{ purchase_order_item_code: linha!.code!, quantity: Number(q), warehouse_id: almox, lot: lote.trim() || undefined }]);
    setLinha(null); setLote("");
    setPedido(await getOrderDetail(pedido!.code!));
    setFeedback({ type: "success", message: `Recebido: ${q.replace(".", ",")}.` });
  });

  return (<>
    <FeedbackBox feedback={feedback} />
    <Destaque>{pedido ? `Pedido ${pedido.code}${linha ? ` · ${linha.item_code} · falta ${String(pendente(linha)).replace(".", ",")}` : ""}` : "Pedido não informado"}</Destaque>
    {!pedido && <CampoLeitura rotulo="Número do pedido de compra" onLer={lerPedido} disabled={busy} />}
    {pedido && !linha && <CampoLeitura rotulo="Leia o item" onLer={lerItem} disabled={busy} />}
    {linha && (<>
      <div className="erp-field"><label className="erp-label">Lote</label><input className="erp-input" value={lote} onChange={(e) => setLote(e.target.value)} /></div>
      <CampoQuantidade key={linha.code} rotulo="Quantidade recebida" inicial="" onConfirmar={receber} />
    </>)}
  </>);
}

function Receber({ almox, ler, erro }: { almox: number; ler: (c: string) => Promise<LeituraDTO | null>; erro: (m: string) => void }) {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [envios, setEnvios] = useState<TransitoDTO[]>([]);
  const [envio, setEnvio] = useState<TransitoDTO | null>(null);
  const [endereco, setEndereco] = useState("");
  const pendente = (t: TransitoDTO) => t.quantity - t.received_qty - t.returned_qty - t.lost_qty;

  const carregar = useCallback(() => run(async () => { setEnvios((await listarTransitos(true)).filter((t) => t.to_warehouse_id === almox)); }), [run, almox]);
  useEffect(() => { void carregar(); }, [carregar]);

  const lerCodigo = (c: string) => run(async () => {
    const l = await ler(c);
    if (!l) return;
    if (l.kind === "ENDERECO") { setEndereco(l.address ?? ""); return; }
    const achado = envios.find((t) => t.item_code === l.item_code && (!l.lot || !t.lot || l.lot === t.lot));
    if (!achado) { erro("Este item não tem envio em trânsito para este almoxarifado."); return; }
    setEnvio(achado);
  });
  const receber = (q: string) => run(async () => {
    const r = await baixarTransito(envio!.id, { action: "RECEBER", quantity: q, address: endereco || undefined });
    setEnvio(null);
    setEnvios((await listarTransitos(true)).filter((t) => t.to_warehouse_id === almox));
    setFeedback({ type: "success", message: `Envio ${r.code} recebido: ${q.replace(".", ",")}.` });
  });

  return (<>
    <FeedbackBox feedback={feedback} />
    <Destaque>{envio ? `Envio ${envio.code}` : `${envios.length} envio(s) a caminho`}{endereco ? ` · endereço ${endereco}` : ""}</Destaque>
    {envio
      ? <CampoQuantidade key={envio.id} rotulo="Quantidade recebida" inicial={String(pendente(envio))} onConfirmar={receber} />
      : <CampoLeitura rotulo="Leia o endereço de chegada ou o item" onLer={lerCodigo} disabled={busy} />}
    {!envio && envios.length > 0 && (
      <div className="erp-field erp-c12"><table className="erp-grid">
        <thead><tr><th>Envio</th><th>Item</th><th>Lote</th><th className="num">A receber</th></tr></thead>
        <tbody>{envios.map((t) => <tr key={t.id}><td><strong>{t.code}</strong></td><td><EntityName code={t.item_code} loader={loadItems} prefix="Item" /></td><td>{t.lot || "—"}</td><td className="num">{qtd(pendente(t))}</td></tr>)}</tbody>
      </table></div>
    )}
  </>);
}

function Etiquetas({ almox }: { almox: number }) {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [codigos, setCodigos] = useState<{ valor: string; texto: string }[]>([]);
  const [item, setItem] = useState("");
  const enderecos = () => run(async () => {
    const lista = await loadWarehouseAddresses(almox)();
    if (lista.length === 0) { setFeedback({ type: "error", message: "Este almoxarifado não tem endereços cadastrados." }); return; }
    setCodigos((p) => [...p, ...lista.map((a) => ({ valor: String(a.code), texto: `Endereço ${a.code}` }))]);
  });
  return (<>
    <style>{`@media print { body * { visibility: hidden; } .etiquetas-coletor, .etiquetas-coletor * { visibility: visible; } .etiquetas-coletor { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
    <FeedbackBox feedback={feedback} />
    <div className="erp-field erp-c6"><label className="erp-label">Item</label>
      <LookupField value={item || undefined} loader={loadItems} entityLabel="item" onChange={(c) => setItem(String(c ?? ""))} /></div>
    <div className="erp-field erp-c6" style={{ display: "flex", flexDirection: "row", alignItems: "end", gap: 8 }}>
      <button className="erp-btn" disabled={!item} onClick={() => { setCodigos((p) => [...p, { valor: item, texto: `Item ${item}` }]); setItem(""); }}>Adicionar item</button>
      <button className="erp-btn" onClick={enderecos} disabled={busy || !almox}>Endereços do almoxarifado</button>
      <button className="erp-btn erp-btn-primary" onClick={() => window.print()} disabled={codigos.length === 0}>Imprimir</button>
      <button className="erp-btn" onClick={() => setCodigos([])} disabled={codigos.length === 0}>Limpar</button>
    </div>
    <div className="erp-field erp-c12 etiquetas-coletor" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
      {codigos.map((c, i) => <div key={`${c.valor}-${i}`} style={{ breakInside: "avoid", textAlign: "center" }}><div>{c.texto}</div><Code128Barcode value={c.valor} /></div>)}
    </div>
  </>);
}

/**
 * Coletor de estoque para leitor de código de barras. O leitor USB ou Bluetooth
 * funciona como teclado: lê o código e manda Enter. Letras e campos grandes, e o
 * cursor volta sozinho ao campo de leitura para o operador não tocar no teclado.
 */
export function Vest0150Page() {
  const [modo, setModo] = useState<Modo>("consultar");
  const [almox, setAlmox] = useState(() => Number(lerGuardado(CHAVE_ALMOX)) || 0);
  const [aviso, setAviso] = useState("");

  const erro = useCallback((m: string) => {
    setAviso(m);
    try {
      const som = new AudioContext();
      const osc = som.createOscillator();
      osc.connect(som.destination); osc.frequency.value = 220; osc.start(); osc.stop(som.currentTime + 0.25);
    } catch { /* sem som, o aviso na tela basta */ }
  }, []);
  const ler = useCallback(async (codigo: string) => {
    setAviso("");
    return resolverLeitura(codigo, almox || undefined);
  }, [almox]);

  return (
    <div className="erp-screen" style={{ gridTemplateRows: "auto 1fr auto" }}>
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Almoxarifado</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Coletor de estoque</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>
      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs" role="tablist">
            {MODOS.map((m) => <button key={m.id} role="tab" aria-selected={modo === m.id} className={`erp-tab${modo === m.id ? " active" : ""}`} onClick={() => { setModo(m.id); setAviso(""); }} title={m.dica}>{m.label}</button>)}
          </div>
          <div className="erp-detail-body">
            <div className="erp-fieldset"><div className="erp-fieldset-body">
              <div className="erp-field erp-c6"><label className="erp-label erp-req">Almoxarifado</label>
                <LookupField value={almox || undefined} loader={loadWarehouses} entityLabel="almoxarifado" onChange={(c) => { const n = c ? Number(c) : 0; setAlmox(n); guardar(CHAVE_ALMOX, n ? String(n) : null); }} /></div>
              {aviso && <div className="erp-field erp-c12" role="alert" style={{ color: "var(--v-err)", fontSize: 20, fontWeight: 600 }}>{aviso}</div>}
              {modo === "etiquetas" ? <Etiquetas almox={almox} />
                : !almox && modo !== "consultar" ? <div className="erp-field erp-c12 erp-hint">Escolha o almoxarifado para começar.</div>
                  : modo === "consultar" ? <Consultar almox={almox} ler={ler} />
                    : modo === "separar" ? <Separar key={almox} almox={almox} ler={ler} erro={erro} />
                      : modo === "contar" ? <Contar key={almox} almox={almox} ler={ler} />
                        : modo === "receber" ? <Receber key={almox} almox={almox} ler={ler} erro={erro} />
                        : modo === "compra" ? <ReceberCompra key={almox} almox={almox} ler={ler} erro={erro} />
                        : modo === "ciclica" ? <ContagemCiclica key={almox} almox={almox} />
                        : <Mover key={almox} almox={almox} ler={ler} erro={erro} />}
            </div></div>
          </div>
        </section>
      </div>
      <footer className="erp-statusbar"><span>{MODOS.find((m) => m.id === modo)?.dica}</span></footer>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import {
  type ContratoVenda, type SituacaoContrato, ROTULO_SITUACAO_CONTRATO,
  chamarContrato, criarContrato, listarContratos, mudarSituacaoContrato, obterContrato, programarContrato, removerParcelaContrato,
} from "@/services/contratoVendaService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadCustomers, loadItems } from "@/services/lookups";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Num = string | number;
const brl = (v?: Num) => Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const qtd = (v?: Num) => Number(v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
const dataBR = (s?: string) => (s ? new Date(s.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR") : "—");
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const num = (s: string) => s.replace(",", ".");
const COR: Record<SituacaoContrato, string> = { RASCUNHO: "erp-badge-blue", ATIVO: "erp-badge-green", ENCERRADO: "erp-badge-gray", CANCELADO: "erp-badge-gray" };
type LinhaNova = { item?: string; quantidade: string; preco: string };

/**
 * VVND0710 — Contrato de Venda. Acordo de fornecimento com o cliente: itens com
 * quantidade e preço fixados, teto de valor opcional, vigência e programação
 * de entregas. Os pedidos de chamada nascem do contrato, pelo preço dele, e
 * consomem o saldo — como o contrato de quantidade/valor do SAP SD.
 */
export function Vvnd0710Page(): JSX.Element {
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const [lista, setLista] = useState<ContratoVenda[]>([]);
  const [aberto, setAberto] = useState<ContratoVenda | null>(null);
  const hoje = new Date();
  const [novo, setNovo] = useState({ cliente: undefined as number | undefined, descricao: "", ini: iso(hoje), fim: iso(new Date(hoje.getFullYear() + 1, hoje.getMonth(), hoje.getDate())), teto: "", alertaPct: "20", alertaDias: "30" });
  const [linhas, setLinhas] = useState<LinhaNova[]>([{ quantidade: "", preco: "" }]);
  const [parcela, setParcela] = useState({ item: 0, data: iso(hoje), quantidade: "" });
  const [chamada, setChamada] = useState<{ data: string; qtds: Record<number, string>; parcelas: Record<number, number | undefined> }>({ data: iso(hoje), qtds: {}, parcelas: {} });
  const [motivo, setMotivo] = useState("");

  const recarregar = useCallback(async () => {
    try { setLista(await listarContratos()); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); }
  }, []);
  useEffect(() => { void recarregar(); }, [recarregar]);

  async function rodar(fn: () => Promise<ContratoVenda>, ok: string) {
    setBusy(true); setFeedback(null);
    try { setAberto(await fn()); await recarregar(); setFeedback({ type: "success", message: ok }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function criar() {
    if (!novo.cliente) { setFeedback({ type: "error", message: "Escolha o cliente." }); return; }
    const itens = linhas.filter((l) => l.item && l.quantidade).map((l) => ({ item_code: l.item!, quantidade: num(l.quantidade), preco_unitario: num(l.preco || "0") }));
    await rodar(() => criarContrato({ customer_code: novo.cliente!, descricao: novo.descricao, vigencia_inicio: novo.ini, vigencia_fim: novo.fim,
      valor_contratado: novo.teto ? num(novo.teto) : undefined, alerta_saldo_pct: Number(novo.alertaPct), alerta_dias: Number(novo.alertaDias), itens }), "Contrato criado em rascunho: ative-o para receber pedidos de chamada.");
    setLinhas([{ quantidade: "", preco: "" }]);
  }

  async function chamar(c: ContratoVenda) {
    const ls = c.itens.filter((it) => Number(num(chamada.qtds[it.id] ?? "")) > 0)
      .map((it) => ({ contrato_item_id: it.id, quantidade: num(chamada.qtds[it.id]), parcela_id: chamada.parcelas[it.id] }));
    setBusy(true); setFeedback(null);
    try {
      const r = await chamarContrato(c.id, { data_entrega: chamada.data, linhas: ls });
      setAberto(r.contrato); setChamada({ data: chamada.data, qtds: {}, parcelas: {} }); await recarregar();
      setFeedback({ type: "success", message: `Pedido de venda ${r.order_number} gerado em rascunho (${brl(r.total)}) pelo preço do contrato.` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const c = aberto;
  // Item da parcela: o escolhido ou, sem escolha, o primeiro do contrato aberto.
  const itemParcela = c?.itens.some((it) => it.id === parcela.item) ? parcela.item : (c?.itens[0]?.id ?? 0);
  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Comercial</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Contrato de Venda</span><span className="erp-crumb-code">VVND0710</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>
      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Consulta</span><button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Atualizar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span><ExportButton title="VVND0710 — Contrato de Venda" filename="vvnd0710" /></div>
      </div>
      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            <div className="erp-fieldset"><div className="erp-fieldset-head">Novo contrato</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c4"><label className="erp-label erp-req">Cliente</label>
                <LookupField value={novo.cliente} loader={loadCustomers} entityLabel="cliente" placeholder="Selecionar" onChange={(v) => setNovo((x) => ({ ...x, cliente: v ?? undefined }))} /></div>
              <div className="erp-field erp-c8"><label className="erp-label erp-req">Descrição</label><input className="erp-input" id="ct-descricao" value={novo.descricao} onChange={(e) => setNovo((x) => ({ ...x, descricao: e.target.value }))} placeholder="Ex.: fornecimento anual de chapas" /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Vigência de</label><input className="erp-input" type="date" value={novo.ini} onChange={(e) => setNovo((x) => ({ ...x, ini: e.target.value }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">até</label><input className="erp-input" type="date" value={novo.fim} onChange={(e) => setNovo((x) => ({ ...x, fim: e.target.value }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Teto em valor</label><input className="erp-input" inputMode="decimal" value={novo.teto} onChange={(e) => setNovo((x) => ({ ...x, teto: e.target.value }))} placeholder="sem teto" /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Alertar com saldo abaixo de (%)</label><input className="erp-input" inputMode="numeric" value={novo.alertaPct} onChange={(e) => setNovo((x) => ({ ...x, alertaPct: e.target.value }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Alertar vencimento com (dias)</label><input className="erp-input" inputMode="numeric" value={novo.alertaDias} onChange={(e) => setNovo((x) => ({ ...x, alertaDias: e.target.value }))} /></div>
              {linhas.map((l, i) => (<div key={i} className="erp-field erp-c12" style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flex: 3 }}><label className="erp-label">Item</label>
                  <LookupField<string> value={l.item} loader={loadItems} entityLabel="item" placeholder="Selecionar item" onChange={(v) => setLinhas((ls) => ls.map((x, j) => (j === i ? { ...x, item: v ?? undefined } : x)))} /></div>
                <div style={{ flex: 1 }}><label className="erp-label">Quantidade</label><input className="erp-input ct-qtd" inputMode="decimal" value={l.quantidade} onChange={(e) => setLinhas((ls) => ls.map((x, j) => (j === i ? { ...x, quantidade: e.target.value } : x)))} /></div>
                <div style={{ flex: 1 }}><label className="erp-label">Preço fixado</label><input className="erp-input ct-preco" inputMode="decimal" value={l.preco} onChange={(e) => setLinhas((ls) => ls.map((x, j) => (j === i ? { ...x, preco: e.target.value } : x)))} /></div>
              </div>))}
              <div className="erp-field erp-c12" style={{ display: "flex", gap: 8 }}>
                <button className="erp-btn" onClick={() => setLinhas((ls) => [...ls, { quantidade: "", preco: "" }])}>+ Item</button>
                <button className="erp-btn erp-btn-primary" id="ct-criar" disabled={busy || !novo.cliente || !novo.descricao.trim()} onClick={() => void criar()}>Criar contrato</button>
              </div>
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Contratos — <span style={{ fontWeight: 400, opacity: 0.65 }}>{lista.length}</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                <table className="erp-grid" id="ct-lista">
                  <thead><tr><th>Nº</th><th>Cliente</th><th>Descrição</th><th>Vigência</th><th>Teto</th><th>Consumido</th><th>Situação</th><th style={{ width: 80 }} /></tr></thead>
                  <tbody>
                    {lista.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhum contrato.</td></tr>}
                    {lista.map((x) => (
                      <tr key={x.id}><td style={{ fontWeight: 600 }}>{x.numero}</td><td>{x.cliente_nome || x.customer_code}</td><td>{x.descricao}</td>
                        <td>{dataBR(x.vigencia_inicio)} a {dataBR(x.vigencia_fim)}</td><td>{x.valor_contratado ? brl(x.valor_contratado) : "—"}</td><td>{brl(x.valor_consumido)}</td>
                        <td><span className={`erp-badge ${COR[x.situacao]}`}>{ROTULO_SITUACAO_CONTRATO[x.situacao]}</span></td>
                        <td><button className="erp-btn erp-btn-sm" onClick={() => void obterContrato(x.id).then(setAberto).catch((e) => setFeedback({ type: "error", message: errMessage(e) }))}>Abrir</button></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div></div>

            {c && (
              <div className="erp-fieldset" id="ct-detalhe"><div className="erp-fieldset-head">Contrato {c.numero} — {c.cliente_nome || c.customer_code} · {c.descricao}</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c12" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <span><span className={`erp-badge ${COR[c.situacao]}`}>{ROTULO_SITUACAO_CONTRATO[c.situacao]}</span></span>
                  <span>Vigência {dataBR(c.vigencia_inicio)} a {dataBR(c.vigencia_fim)}</span>
                  <span>Consumido: <strong>{brl(c.valor_consumido)}</strong>{c.valor_contratado ? ` de ${brl(c.valor_contratado)}` : ""}</span>
                  {c.motivo_encerramento && <span>Motivo: {c.motivo_encerramento}</span>}
                </div>
                <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                  <table className="erp-grid" id="ct-itens">
                    <thead><tr><th>Item</th><th>Contratado</th><th>Preço</th><th>Consumido</th><th>Saldo</th>{c.situacao === "ATIVO" && <><th>Chamar</th><th>Parcela</th></>}</tr></thead>
                    <tbody>{c.itens.map((it) => (
                      <tr key={it.id}><td>{it.item_code} · {it.item_nome}</td><td>{qtd(it.quantidade)}</td><td>{brl(it.preco_unitario)}</td><td>{qtd(it.consumido)}</td><td><strong>{qtd(it.saldo)}</strong></td>
                        {c.situacao === "ATIVO" && <>
                          <td><input className="erp-input ct-chamar" style={{ width: 90 }} inputMode="decimal" value={chamada.qtds[it.id] ?? ""} onChange={(e) => setChamada((x) => ({ ...x, qtds: { ...x.qtds, [it.id]: e.target.value } }))} /></td>
                          <td><select className="erp-input" value={chamada.parcelas[it.id] ?? ""} onChange={(e) => {
                            const pid = e.target.value ? Number(e.target.value) : undefined; const p = c.programacao.find((x) => x.id === pid);
                            setChamada((x) => ({ ...x, parcelas: { ...x.parcelas, [it.id]: pid }, qtds: p ? { ...x.qtds, [it.id]: String(p.quantidade) } : x.qtds, data: p ? p.data_prevista.slice(0, 10) : x.data }));
                          }}>
                            <option value="">—</option>{c.programacao.filter((p) => p.contrato_item_id === it.id && !p.sales_order_code).map((p) => <option key={p.id} value={p.id}>{dataBR(p.data_prevista)} · {qtd(p.quantidade)}</option>)}
                          </select></td>
                        </>}</tr>
                    ))}</tbody>
                  </table>
                </div>
                {c.situacao === "ATIVO" && (
                  <div className="erp-field erp-c12" style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <div><label className="erp-label">Entrega</label><input className="erp-input" type="date" value={chamada.data} onChange={(e) => setChamada((x) => ({ ...x, data: e.target.value }))} /></div>
                    <button className="erp-btn erp-btn-primary" id="ct-chamar" disabled={busy} onClick={() => void chamar(c)}>Gerar pedido de chamada</button>
                    <small>O pedido nasce em rascunho, pelo preço do contrato; a quantidade e o teto são conferidos contra o saldo.</small>
                  </div>
                )}

                <div className="erp-field erp-c12"><div className="erp-fieldset-head" style={{ padding: 0, border: 0 }}>Programação de entregas</div></div>
                <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                  <table className="erp-grid" id="ct-programacao">
                    <thead><tr><th>Data</th><th>Item</th><th>Quantidade</th><th>Pedido</th><th style={{ width: 80 }} /></tr></thead>
                    <tbody>
                      {c.programacao.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Sem programação.</td></tr>}
                      {c.programacao.map((p) => (
                        <tr key={p.id}><td>{dataBR(p.data_prevista)}</td><td>{p.item_code}</td><td>{qtd(p.quantidade)}</td><td>{p.sales_order_code ?? "a chamar"}</td>
                          <td>{!p.sales_order_code && <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => void rodar(() => removerParcelaContrato(c.id, p.id), "Parcela removida.")}>Remover</button>}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(c.situacao === "RASCUNHO" || c.situacao === "ATIVO") && (
                  <div className="erp-field erp-c12" style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <div><label className="erp-label">Item</label><select className="erp-input" value={itemParcela} onChange={(e) => setParcela((p) => ({ ...p, item: Number(e.target.value) }))}>
                      {c.itens.map((it) => <option key={it.id} value={it.id}>{it.item_code} · {it.item_nome}</option>)}</select></div>
                    <div><label className="erp-label">Data</label><input className="erp-input" type="date" value={parcela.data} onChange={(e) => setParcela((p) => ({ ...p, data: e.target.value }))} /></div>
                    <div><label className="erp-label">Quantidade</label><input className="erp-input" id="ct-parcela-qtd" inputMode="decimal" value={parcela.quantidade} onChange={(e) => setParcela((p) => ({ ...p, quantidade: e.target.value }))} /></div>
                    <button className="erp-btn" id="ct-programar" disabled={busy || !parcela.quantidade || !itemParcela} onClick={() => void rodar(() => programarContrato(c.id, { contrato_item_id: itemParcela, data: parcela.data, quantidade: num(parcela.quantidade) }), "Parcela programada.").then(() => setParcela((p) => ({ ...p, quantidade: "" })))}>Programar</button>
                  </div>
                )}

                <div className="erp-field erp-c12" style={{ display: "flex", gap: 8 }}>
                  {c.situacao === "RASCUNHO" && <button className="erp-btn erp-btn-primary" id="ct-ativar" disabled={busy} onClick={() => void rodar(() => mudarSituacaoContrato(c.id, "ATIVO"), "Contrato ativo.")}>Ativar</button>}
                  {(c.situacao === "RASCUNHO" || c.situacao === "ATIVO") && (<>
                    <input className="erp-input" style={{ maxWidth: 320 }} placeholder="motivo (encerrar ou cancelar)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                    {c.situacao === "ATIVO" && <button className="erp-btn" disabled={busy || !motivo.trim()} onClick={() => void rodar(() => mudarSituacaoContrato(c.id, "ENCERRADO", motivo), "Contrato encerrado.").then(() => setMotivo(""))}>Encerrar</button>}
                    <button className="erp-btn erp-btn-danger" disabled={busy || !motivo.trim()} onClick={() => void rodar(() => mudarSituacaoContrato(c.id, "CANCELADO", motivo), "Contrato cancelado.").then(() => setMotivo(""))}>Cancelar</button>
                  </>)}
                </div>
              </div></div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

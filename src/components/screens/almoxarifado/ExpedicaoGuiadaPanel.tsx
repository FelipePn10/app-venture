import { useCallback, useEffect, useState } from "react";
import {
  cotarFreteOnline, executarAcaoDoFluxo, fluxoDoPedido, rastrearCarga, statusIntegracoes,
  type AcaoFluxo, type EventoRastreio, type FluxoExpedicao, type OfertaFrete, type RomaneioNoFluxo,
} from "@/services/gestaoService";
import { previaFaturamentoPedido } from "@/services/faturamentoPedidoService";
import { httpClient } from "@/services/fiscalShared";
import { conferItem, getShipmentDetail, type ShipmentItemDTO } from "@/services/shipmentsService";
import { LookupField } from "@/components/ui/LookupField";
import { loadSalesOrders } from "@/services/lookups";
import { confirmar } from "@/components/ui/dialogos";
import { Aviso, Kpis, Painel, Selo, Vazio } from "../planejamento/planUi";
import { data, dataHora, hojeISO, num } from "../planejamento/planFormat";
import { useAcao } from "../planejamento/planHooks";
import { reais } from "../gestao/gestaoFmt";

/**
 * Aba "Por pedido (guiado)" da VEXP0100: do pedido de venda ao caminhão, um passo de
 * cada vez — montar o romaneio, separar, conferir, emitir e transmitir a NF-e
 * e despachar. O backend diz qual é o próximo passo; a tela só o executa.
 * Com o hub de frete configurado, cota a carga e rastreia pela chave da NF-e.
 */
const ETAPA: Record<string, string> = { SEPARACAO: "Separação", CONFERENCIA: "Conferência", NFE: "NF-e", DESPACHO: "Despacho" };
const SITUACAO: Record<string, string> = { DRAFT: "Rascunho", OPEN: "Aberto", SEPARATED: "Separado", CONFERRED: "Conferido", SHIPPED: "Despachado", CANCELLED: "Cancelado" };

interface NotaForm { serie: string; data_emissao: string; cfop: string; natureza_operacao: string }

export function ExpedicaoGuiadaPanel(): JSX.Element {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [pedido, setPedido] = useState<number | undefined>();
  const [fluxo, setFluxo] = useState<FluxoExpedicao | null>(null);
  const [nota, setNota] = useState<NotaForm | null>(null);
  const [frete, setFrete] = useState<Record<number, OfertaFrete[]>>({});
  const [rastreio, setRastreio] = useState<Record<number, EventoRastreio[]>>({});
  const [freteLigado, setFreteLigado] = useState<boolean | null>(null);
  useEffect(() => { void statusIntegracoes().then((s) => setFreteLigado(s.freight)).catch(() => setFreteLigado(null)); }, []);
  // Conferência: os itens de cada romaneio no passo "Conferir" e o que foi contado.
  const [itensConf, setItensConf] = useState<Record<number, ShipmentItemDTO[]>>({});
  const [contado, setContado] = useState<Record<number, string>>({});

  const carregar = useCallback(async (code = pedido) => {
    if (!code) return;
    const f = await fluxoDoPedido(code);
    setFluxo(f);
    const aConferir = f.shipments.filter((s) => s.next_action?.code === "CONFERIR");
    const det = await Promise.all(aConferir.map((s) => getShipmentDetail(s.code)));
    setItensConf(Object.fromEntries(aConferir.map((s, i) => [s.code, det[i].items])));
  }, [pedido]);

  const escolher = (c?: number) => {
    setPedido(c); setFluxo(null); setFrete({}); setRastreio({}); setNota(null);
    if (c) void run(async () => {
      await carregar(c);
      const p = await previaFaturamentoPedido(c).catch(() => null);
      setNota({ serie: "1", data_emissao: hojeISO(), cfop: p?.cfop_sugerido ?? "", natureza_operacao: p?.natureza_sugerida ?? "Venda de produção do estabelecimento" });
    });
  };

  const executar = (a: AcaoFluxo, romaneio?: number) => void run(async () => {
    if (a.code === "CONFERIR" && romaneio) {
      for (const it of itensConf[romaneio] ?? []) {
        if (it.is_conferred || !it.id) continue;
        const q = Number((contado[it.id] ?? String(it.quantity)).replace(",", "."));
        if (!(q >= 0)) { setFeedback({ type: "error", message: `Quantidade contada inválida no item ${it.item_code}.` }); return; }
        await conferItem(romaneio, it.id, q);
      }
      await executarAcaoDoFluxo(a);
    } else if (a.code === "MONTAR_ROMANEIO") {
      await httpClient.post(a.path, { sales_order_code: pedido });
    } else if (a.code === "EMITIR_NFE") {
      if (!nota?.cfop || !nota.natureza_operacao) { setFeedback({ type: "error", message: "Informe o CFOP e a natureza da operação da NF-e." }); return; }
      await httpClient.post(a.path, { ...nota, valor_frete: "0", valor_seguro: "0", valor_desconto: "0" });
    } else if (a.code === "DESPACHAR") {
      try { await executarAcaoDoFluxo(a); } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (!/diverg/i.test(msg)) throw e;
        if (!(await confirmar({ titulo: "Despachar com divergência", mensagem: `${msg}\n\nDespachar mesmo assim?`, rotulo: "Despachar", tom: "perigo" }))) return;
        await httpClient.post(a.path, { accept_divergences: true });
      }
    } else {
      await executarAcaoDoFluxo(a);
    }
    await carregar();
    setFeedback({ type: "success", message: `${a.description}: feito.` });
  });

  const cotar = (r: RomaneioNoFluxo) => void run(async () => { setFrete((f) => ({ ...f, [r.code]: [] })); const o = await cotarFreteOnline(r.code); setFrete((f) => ({ ...f, [r.code]: o })); if (!o.length) setFeedback({ type: "info", message: "Nenhuma transportadora atende esse trecho com os volumes informados." }); });
  const rastrear = (r: RomaneioNoFluxo) => void run(async () => { const e = await rastrearCarga(r.code); setRastreio((x) => ({ ...x, [r.code]: e })); if (!e.length) setFeedback({ type: "info", message: "A transportadora ainda não registrou ocorrência para esta nota." }); });

  const BotaoAcao = ({ a, primario, romaneio }: { a: AcaoFluxo; primario?: boolean; romaneio?: number }) => (
    <button className={`erp-btn ${primario ? "erp-btn-primary" : "erp-btn-sm"}`} onClick={() => executar(a, romaneio)} disabled={busy}>{a.description} →</button>
  );

  return (
        <section className="erp-detail-panel">
          <div className="erp-detail-body">
            <div className="erp-fieldset"><div className="erp-fieldset-body">
              <div className="erp-field erp-c6"><label className="erp-label">Pedido de venda</label>
                <LookupField value={pedido} loader={loadSalesOrders} entityLabel="pedido de venda" placeholder="Escolha o pedido" onChange={(c) => escolher(c ? Number(c) : undefined)} /></div>
              <div className="erp-field erp-c6" style={{ flexDirection: "row", alignItems: "flex-end" }}>
                <button className="erp-btn" onClick={() => void run(() => carregar())} disabled={busy || !pedido}>Atualizar</button></div>
            </div></div>
            <Aviso feedback={feedback} busy={busy} />
            {!pedido ? <Vazio titulo="Escolha o pedido de venda" texto="A tela mostra cada romaneio do pedido com as etapas feitas e o próximo passo. Os passos que pedem estoque (separação) e nota (NF-e) passam pelas mesmas regras da aba Romaneios e da NF-e de saída (VFIS0200)." />
              : !fluxo ? <Vazio titulo="Lendo o pedido…" /> : (<>
                <Kpis itens={[
                  { label: "Falta expedir", value: num(fluxo.pending_to_ship), hint: "saldo do pedido ainda sem despacho", tom: fluxo.pending_to_ship > 0 ? "warn" : "ok" },
                  { label: "Em romaneio aberto", value: num(fluxo.in_open_shipments), tom: "info" },
                  { label: "Romaneios", value: String(fluxo.shipments.length), hint: `${fluxo.shipments.filter((s) => s.status === "SHIPPED").length} despachado(s)`, tom: "info" },
                ]} />
                {/* O passo do pedido só aparece quando não é o mesmo de um romaneio (montar o romaneio, por exemplo). */}
                {fluxo.next_action && !fluxo.shipments.some((r) => r.next_action?.path === fluxo.next_action?.path) && (
                  <div className="erp-fieldset" style={{ borderColor: "var(--v-green, #3d7a3d)" }}>
                    <div className="vpl-panel-body" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ flex: 1 }}><strong>Próximo passo do pedido:</strong> {fluxo.next_action.description}</span>
                      <BotaoAcao a={fluxo.next_action} primario />
                    </div>
                  </div>
                )}
                {fluxo.shipments.length === 0 && !fluxo.next_action && <Vazio titulo="Pedido sem saldo a expedir" />}
                {fluxo.shipments.map((r) => {
                  const emitir = r.next_action?.code === "EMITIR_NFE";
                  return (
                    <Painel key={r.code} titulo={`Romaneio ${r.code}`}
                      sub={`${SITUACAO[r.status] ?? r.status}${r.nfe_number ? ` · NF-e ${r.nfe_number}${r.nfe_status ? ` (${r.nfe_status === "AUTHORIZED" ? "autorizada" : r.nfe_status.toLowerCase()})` : ""}` : ""}`}
                      acoes={<>
                        <button className="erp-btn erp-btn-sm" onClick={() => cotar(r)} disabled={busy || freteLigado === false} title={freteLigado === false ? "Frete Rápido desligado neste servidor (Integrações na VFIN0100)" : "Cotar a carga nas transportadoras (Frete Rápido)"}>Cotar frete</button>
                        <button className="erp-btn erp-btn-sm" onClick={() => rastrear(r)} disabled={busy || !r.nfe_number || freteLigado === false} title={freteLigado === false ? "Frete Rápido desligado neste servidor" : r.nfe_number ? "Ocorrências da transportadora pela chave da NF-e" : "Disponível depois da NF-e"}>Rastrear</button>
                      </>}>
                      <div className="vpl-steps" style={{ marginBottom: 10 }}>
                        {r.steps.map((e, i) => (
                          <div key={e.name} className={`vpl-step${e.state === "FEITA" ? " done" : e.state === "ATUAL" ? " current" : ""}`} title={e.at ? dataHora(e.at) : undefined}>
                            <span className="vpl-step-dot">{e.state === "FEITA" ? "✓" : i + 1}</span>{ETAPA[e.name] ?? e.name}
                          </div>
                        ))}
                      </div>
                      {r.next_action?.code === "CONFERIR" && (itensConf[r.code]?.length ?? 0) > 0 && (
                        <table className="erp-grid" style={{ marginBottom: 8 }}>
                          <thead><tr><th>Item</th><th className="num">No romaneio</th><th className="num" style={{ width: 160 }}>Contado</th><th /></tr></thead>
                          <tbody>{itensConf[r.code].map((it) => {
                            const v = it.id ? contado[it.id] ?? String(it.quantity) : "";
                            const diverge = Number(v.replace(",", ".")) !== it.quantity;
                            return (
                              <tr key={it.id}>
                                <td>{it.item_code}</td><td className="num">{num(it.quantity)}</td>
                                <td className="num">{it.is_conferred ? num(it.conferred_qty ?? 0) : (
                                  <input className="erp-input num" inputMode="decimal" aria-label={`Quantidade contada do item ${it.item_code}`} value={v}
                                    onChange={(e) => it.id && setContado((c) => ({ ...c, [it.id as number]: e.target.value }))} />)}</td>
                                <td>{it.is_conferred ? <Selo tom="ok">Conferido</Selo> : diverge ? <Selo tom="warn">Diverge</Selo> : null}</td>
                              </tr>
                            );
                          })}</tbody>
                        </table>
                      )}
                      {emitir && nota && (
                        <div className="erp-fieldset-body" style={{ padding: 0, marginBottom: 8 }}>
                          <div className="erp-field erp-c2"><label className="erp-label" htmlFor={`nf-serie-${r.code}`}>Série</label>
                            <input id={`nf-serie-${r.code}`} className="erp-input" value={nota.serie} onChange={(e) => setNota({ ...nota, serie: e.target.value })} /></div>
                          <div className="erp-field erp-c3"><label className="erp-label" htmlFor={`nf-data-${r.code}`}>Emissão</label>
                            <input id={`nf-data-${r.code}`} className="erp-input" type="date" value={nota.data_emissao} onChange={(e) => setNota({ ...nota, data_emissao: e.target.value })} /></div>
                          <div className="erp-field erp-c2"><label className="erp-label erp-req" htmlFor={`nf-cfop-${r.code}`}>CFOP</label>
                            <input id={`nf-cfop-${r.code}`} className="erp-input" maxLength={4} value={nota.cfop} onChange={(e) => setNota({ ...nota, cfop: e.target.value.replace(/\D/g, "") })} /></div>
                          <div className="erp-field erp-c5"><label className="erp-label erp-req" htmlFor={`nf-nat-${r.code}`}>Natureza da operação</label>
                            <input id={`nf-nat-${r.code}`} className="erp-input" value={nota.natureza_operacao} onChange={(e) => setNota({ ...nota, natureza_operacao: e.target.value })} /></div>
                        </div>
                      )}
                      {r.next_action ? <BotaoAcao a={r.next_action} primario romaneio={r.code} /> : <Selo tom="ok">Despachado</Selo>}
                      {frete[r.code]?.length ? (
                        <table className="erp-grid" style={{ marginTop: 10 }}>
                          <thead><tr><th>Transportadora</th><th>Serviço</th><th className="num">Prazo</th><th>Previsão</th><th className="num">Frete</th></tr></thead>
                          <tbody>{frete[r.code].map((o, i) => (
                            <tr key={`${o.carrier_document}-${o.service}-${i}`}>
                              <td>{i === 0 && <Selo tom="ok">Mais barato</Selo>} {o.carrier}</td><td>{o.service}</td><td className="num">{o.delivery_days} dia(s)</td>
                              <td>{data(o.estimated_date)}</td><td className="num"><strong>{reais(o.price)}</strong></td>
                            </tr>
                          ))}</tbody>
                        </table>
                      ) : null}
                      {rastreio[r.code]?.length ? (
                        <div style={{ marginTop: 10 }}>
                          {rastreio[r.code].map((e, i) => (
                            <div key={i} className="vpl-record"><div className="vpl-record-main">
                              <div className="vpl-record-title">{e.status}</div>
                              <div className="vpl-record-sub">{dataHora(e.at)}{e.place ? ` · ${e.place}` : ""}</div>
                            </div></div>
                          ))}
                        </div>
                      ) : null}
                    </Painel>
                  );
                })}
              </>)}
          </div>
        </section>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { abrirPortal, baixarDocumento, definirEmpresaDoLink, pedirDeNovo, type NotaPortal, type PedidoPortal, type ResumoPortal, type TituloPortal } from "./portalService";
import "./portal.css";

/**
 * Portal do Cliente (fase 0): o cliente da empresa abre o link que recebeu do
 * vendedor e acompanha os pedidos (o que está acontecendo, itens, entrega,
 * pagamento), baixa a DANFE e o XML das notas e pede de novo um pedido — que
 * chega à empresa como rascunho, com aviso, para ela confirmar.
 */
const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const qtd = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
// As datas do pedido são de calendário: o dia vem nos 10 primeiros caracteres.
// Converter pelo fuso do navegador mostrava 21/11 para um pedido de 22/11.
const dia = (iso?: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
// Basta uma linha sem preço para o total ainda não valer.
const aConfirmar = (p: PedidoPortal) => p.lines.some((l) => l.to_be_priced);

type Aba = "pedidos" | "financeiro" | "notas";
type Filtro = "andamento" | "faturados" | "todos";
type Tom = "ok" | "info" | "warn" | "err" | "mut";

const FRETE: Record<string, string> = { CIF: "Por conta da empresa (CIF)", FOB: "Por conta do cliente (FOB)", C: "Por conta da empresa (CIF)", F: "Por conta do cliente (FOB)" };
const ROMANEIO: Record<string, string> = { OPEN: "Em separação", SEPARATED: "Separado", CONFERRED: "Conferido, pronto para sair", SHIPPED: "Despachado" };
const TITULO: Record<string, { rotulo: string; tom: Tom }> = {
  RECEBIDO: { rotulo: "Pago", tom: "ok" }, PENDENTE: { rotulo: "A vencer", tom: "info" }, APROVADO: { rotulo: "A vencer", tom: "info" },
  VENCIDO: { rotulo: "Vencido", tom: "err" }, PARCIAL: { rotulo: "Pago em parte", tom: "warn" },
};

const despachado = (p: PedidoPortal) => p.shipments.find((e) => e.status === "SHIPPED" && e.shipped_at);
const notaAutorizada = (p: PedidoPortal) => p.invoices.find((n) => n.status === "AUTHORIZED");
const entregue = (p: PedidoPortal) => p.lines.length > 0 && p.lines.every((l) => l.delivered >= l.quantity);
const atrasado = (p: PedidoPortal) => ["P", "A"].includes(p.status) && !!p.delivery_date && p.delivery_date.slice(0, 10) < hoje();

/** Frase do que está acontecendo com o pedido, na língua do cliente. */
function andamento(p: PedidoPortal, empresa: string): { titulo: string; detalhe: string; tom: Tom; etapa: number } {
  const nf = notaAutorizada(p);
  const saiu = despachado(p);
  if (p.status === "CANCELLED") return { titulo: "Não confirmado", detalhe: `A ${empresa} não confirmou este pedido. Fale com o seu vendedor para saber o motivo.`, tom: "mut", etapa: -1 };
  if (p.status === "R") return { titulo: "Aguardando confirmação", detalhe: `A ${empresa} recebeu o pedido e vai confirmar itens, preço e prazo com você.`, tom: "warn", etapa: 0 };
  if (p.status === "A") return { titulo: "Em análise", detalhe: `A ${empresa} está analisando o pedido (crédito e condições) antes de confirmar.`, tom: "info", etapa: -1 };
  if (p.status === "P") {
    return atrasado(p)
      ? { titulo: "Confirmado — prazo vencido", detalhe: `A entrega estava prevista para ${dia(p.delivery_date)}. Fale com a ${empresa} para o novo prazo.`, tom: "err", etapa: 1 }
      : { titulo: "Confirmado, em preparação", detalhe: `Entrega prevista para ${dia(p.delivery_date)}.`, tom: "info", etapa: 1 };
  }
  if (saiu) return { titulo: entregue(p) ? "Entregue" : "Despachado", detalhe: `Saiu em ${dia(saiu.shipped_at)}${saiu.carrier ? ` pela ${saiu.carrier}` : ""}${nf ? ` com a NF-e ${nf.number}` : ""}.`, tom: "ok", etapa: 3 };
  return { titulo: "Faturado", detalhe: nf ? `NF-e ${nf.number} emitida em ${dia(nf.issued_at)}.${nf.documents_available ? " Abra o pedido para baixar a nota (PDF) e o XML." : ""}` : "Pedido faturado.", tom: "ok", etapa: 2 };
}
const ETAPAS = ["Confirmado", "Em preparação", "Faturado", "Despachado"];

function Copiar({ texto, rotulo }: { texto: string; rotulo: string }): JSX.Element {
  const [ok, setOk] = useState(false);
  return <button className="portal-btn sec portal-btn-sm" onClick={() => void navigator.clipboard?.writeText(texto).then(() => { setOk(true); window.setTimeout(() => setOk(false), 1500); })}>{ok ? "Copiado" : rotulo}</button>;
}

export function PortalPage(): JSX.Element {
  const { token = "", empresa: empresaDoLink } = useParams<{ token: string; empresa?: string }>();
  const [dados, setDados] = useState<ResumoPortal | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tom: "ok" | "err"; texto: string } | null>(null);
  const [aba, setAba] = useState<Aba>("pedidos");
  const [filtro, setFiltro] = useState<Filtro>("andamento");
  const [aberto, setAberto] = useState<number | null>(null);
  const [repetir, setRepetir] = useState<PedidoPortal | null>(null);
  const [obs, setObs] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [baixando, setBaixando] = useState<string | null>(null);
  const [novoPedido, setNovoPedido] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    try { await definirEmpresaDoLink(empresaDoLink); setDados(await abrirPortal(token)); setErro(null); } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível abrir o portal."); }
  }, [token, empresaDoLink]);
  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { document.title = dados ? `${dados.company} — Portal do cliente` : "Portal do cliente"; }, [dados]);

  const pedidos = useMemo(() => (dados?.orders ?? []).filter((p) =>
    filtro === "todos" || (filtro === "faturados" ? p.status === "F" : p.status !== "F" && p.status !== "CANCELLED")), [dados, filtro]);
  const emAndamento = (dados?.orders ?? []).filter((p) => p.status !== "F" && p.status !== "CANCELLED");
  const proxima = emAndamento.map((p) => p.delivery_date).filter((d): d is string => !!d && d.slice(0, 10) >= hoje()).sort()[0];
  const titulos = useMemo(() => (dados?.orders ?? []).flatMap((p) => p.installments.map((t) => ({ ...t, pedido: p.number })))
    .sort((a, b) => a.due_date.localeCompare(b.due_date)), [dados]);
  const notas = useMemo(() => (dados?.orders ?? []).flatMap((p) => p.invoices.map((n) => ({ ...n, pedido: p.number })))
    .sort((a, b) => b.issued_at.localeCompare(a.issued_at)), [dados]);

  const baixar = async (n: NotaPortal, tipo: "danfe" | "xml") => {
    setBaixando(`${n.id}-${tipo}`);
    try { await baixarDocumento(token, n, tipo); } catch (e) { setAviso({ tom: "err", texto: e instanceof Error ? e.message : "Não foi possível baixar." }); }
    finally { setBaixando(null); }
  };
  const confirmarRepeticao = async () => {
    if (!repetir) return;
    setEnviando(true);
    try {
      const r = await pedirDeNovo(token, repetir.code, obs);
      setNovoPedido(r.order_number);
      const completo = r.skipped.length === 0;
      setAviso({ tom: "ok", texto: `Recebemos seu pedido nº ${r.order_number}. A ${dados?.company ?? "empresa"} já foi avisada e vai ${completo ? "confirmar o pedido, o preço e o prazo" : "conferir os itens e o preço de hoje e confirmar o pedido e o prazo"} com você.` });
      setRepetir(null); setObs(""); setAba("pedidos"); setFiltro("andamento");
      await carregar();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setAviso({ tom: "err", texto: e instanceof Error ? e.message : "Não foi possível enviar o pedido." });
      setRepetir(null);
    } finally { setEnviando(false); }
  };

  if (erro) {
    return (
      <div className="portal"><div className="portal-top"><div className="portal-top-in"><div className="portal-marca"><b>V</b>Portal do cliente</div></div></div>
        <main className="portal-main"><div className="portal-cartao portal-vazio"><h2>Link indisponível</h2><p>{erro.charAt(0).toUpperCase() + erro.slice(1)}.</p></div></main></div>
    );
  }
  if (!dados) {
    return <div className="portal"><div className="portal-top"><div className="portal-top-in"><div className="portal-marca"><b>V</b>Portal do cliente</div><h1>Carregando seus pedidos…</h1></div></div></div>;
  }
  const empresa = dados.company;

  const Notas = ({ lista }: { lista: (NotaPortal & { pedido?: number })[] }) => (
    <div className="portal-notas">
      {lista.map((n) => (
        <div key={n.id} className="portal-nota">
          <div className="portal-nota-info">
            <div><span className={`portal-selo ${n.status === "AUTHORIZED" ? "ok" : "mut"}`}>{n.status === "AUTHORIZED" ? "NF-e autorizada" : "NF-e cancelada"}</span>
              <strong> Nº {n.number}{n.series ? ` · série ${n.series}` : ""}</strong></div>
            <div className="portal-sub">Emitida em {dia(n.issued_at)} · {reais(n.value)}{n.pedido ? ` · pedido ${n.pedido}` : ""}</div>
            {n.key && <code className="portal-chave">{n.key}</code>}
          </div>
          <div className="portal-nota-acoes">
            {n.status === "AUTHORIZED" && (n.documents_available ? (<>
              <button className="portal-btn portal-btn-sm" disabled={baixando === `${n.id}-danfe`} onClick={() => void baixar(n, "danfe")}>{baixando === `${n.id}-danfe` ? "Baixando…" : "Baixar DANFE (PDF)"}</button>
              <button className="portal-btn sec portal-btn-sm" disabled={baixando === `${n.id}-xml`} onClick={() => void baixar(n, "xml")}>{baixando === `${n.id}-xml` ? "Baixando…" : "Baixar XML"}</button>
            </>) : <span className="portal-sub">PDF e XML ainda não disponíveis — peça à {empresa}.</span>)}
            {n.key && <Copiar texto={n.key} rotulo="Copiar chave" />}
          </div>
        </div>
      ))}
    </div>
  );

  const Titulos = ({ lista }: { lista: (TituloPortal & { pedido?: number })[] }) => (
    <div className="portal-tabela-rolagem"><table className="portal-tabela">
      <thead><tr><th>Parcela</th><th>Vencimento</th><th className="num">Valor</th><th className="num">A pagar</th><th>Situação</th><th /></tr></thead>
      <tbody>{lista.map((t, i) => {
        const vencido = t.balance > 0 && t.due_date.slice(0, 10) < hoje();
        const s = vencido ? TITULO.VENCIDO : TITULO[t.status] ?? { rotulo: t.status, tom: "mut" as Tom };
        return (
          <tr key={i}>
            <td>{t.document}{t.installment ? ` (${t.installment})` : ""}{t.pedido ? <div className="portal-sub">pedido {t.pedido}</div> : null}</td>
            <td>{dia(t.due_date)}</td><td className="num">{reais(t.value)}</td><td className="num">{t.balance > 0 ? <strong>{reais(t.balance)}</strong> : "—"}</td>
            <td><span className={`portal-selo ${s.tom}`}>{s.rotulo}</span></td>
            <td className="portal-acoes-linha">
              {t.balance > 0 && t.pix_copy_paste && <Copiar texto={t.pix_copy_paste} rotulo="Copiar PIX" />}
              {t.balance > 0 && t.digitable_line && <Copiar texto={t.digitable_line} rotulo="Copiar boleto" />}
            </td>
          </tr>
        );
      })}</tbody>
    </table></div>
  );

  return (
    <div className="portal">
      <header className="portal-top">
        <div className="portal-top-in">
          <div className="portal-marca"><b>V</b>{empresa} · Portal do cliente</div>
          <h1>Olá, {dados.customer}</h1>
          <p>Aqui você acompanha seus pedidos com a {empresa}: o andamento, a entrega, as notas fiscais e os pagamentos.</p>
        </div>
      </header>
      <main className="portal-main">
        <section className="portal-resumo" aria-label="Resumo">
          <button className="portal-kpi" onClick={() => { setAba("pedidos"); setFiltro("andamento"); }}><span>Pedidos em andamento</span><strong>{emAndamento.length}</strong><em>{reais(emAndamento.reduce((t, p) => t + p.total, 0))}</em></button>
          <div className="portal-kpi"><span>Próxima entrega prevista</span><strong>{proxima ? dia(proxima) : "—"}</strong><em>{proxima ? "pedido confirmado" : "nenhuma agendada"}</em></div>
          <button className="portal-kpi" onClick={() => setAba("financeiro")}><span>A pagar</span><strong>{reais(dados.open_balance)}</strong><em className={dados.overdue_balance > 0 ? "err" : ""}>{dados.overdue_balance > 0 ? `${reais(dados.overdue_balance)} vencido` : "nada vencido"}</em></button>
          <button className="portal-kpi" onClick={() => setAba("notas")}><span>Notas fiscais</span><strong>{notas.filter((n) => n.status === "AUTHORIZED").length}</strong><em>PDF e XML para baixar</em></button>
        </section>

        {aviso && <div className={`portal-aviso ${aviso.tom}`} role={aviso.tom === "err" ? "alert" : "status"}>{aviso.texto}<button className="portal-fechar" aria-label="Fechar aviso" onClick={() => setAviso(null)}>×</button></div>}

        <nav className="portal-abas" role="tablist">
          {([["pedidos", "Pedidos"], ["financeiro", "Financeiro"], ["notas", "Notas fiscais"]] as [Aba, string][]).map(([id, r]) => (
            <button key={id} role="tab" aria-selected={aba === id} className={`portal-aba${aba === id ? " ativa" : ""}`} onClick={() => setAba(id)}>{r}</button>
          ))}
        </nav>

        {aba === "pedidos" && (<>
          <div className="portal-filtros" role="tablist" aria-label="Filtro dos pedidos">
            {([["andamento", `Em andamento (${emAndamento.length})`], ["faturados", "Faturados"], ["todos", "Todos"]] as [Filtro, string][]).map(([id, r]) => (
              <button key={id} role="tab" aria-selected={filtro === id} className={`portal-chip${filtro === id ? " ativo" : ""}`} onClick={() => setFiltro(id)}>{r}</button>
            ))}
          </div>
          {pedidos.length === 0 && <div className="portal-cartao portal-vazio"><h2>Nenhum pedido aqui</h2><p>{filtro === "andamento" ? "Você não tem pedidos em andamento agora. Em Faturados estão os pedidos já entregues — dá para pedir de novo por lá." : "Ainda não há pedidos nesta lista."}</p></div>}
          {pedidos.map((p) => {
            const a = andamento(p, empresa);
            const abrir = aberto === p.code;
            return (
              <article key={p.code} className={`portal-cartao portal-pedido${novoPedido === p.number ? " novo" : ""}`}>
                <button className="portal-pedido-cab" onClick={() => setAberto(abrir ? null : p.code)} aria-expanded={abrir}>
                  <div className="portal-pedido-id">
                    <div className="portal-pedido-num">Pedido {p.number}{novoPedido === p.number && <span className="portal-selo warn"> novo</span>}</div>
                    <div className="portal-sub">{p.customer_po ? `Seu pedido ${p.customer_po} · ` : ""}emitido em {dia(p.issued_at)} · {p.lines.length} item(ns)</div>
                  </div>
                  <div className="portal-pedido-estado">
                    <span className={`portal-selo ${a.tom}`}>{a.titulo}</span>
                    {p.status !== "CANCELLED" && <strong className="portal-valor">{aConfirmar(p) ? "Valor a confirmar" : reais(p.total)}</strong>}
                  </div>
                  <span className="portal-seta" aria-hidden>{abrir ? "▴" : "▾"}</span>
                </button>
                <p className="portal-frase">{a.detalhe}</p>
                {p.status !== "R" && p.status !== "CANCELLED" && (
                  <div className="portal-etapas" aria-label="Andamento do pedido">
                    {ETAPAS.map((e, i) => <div key={e} className={`portal-etapa${i <= a.etapa ? " feita" : ""}`}>{e}</div>)}
                  </div>
                )}
                {abrir && (
                  <div className="portal-corpo">
                    <section>
                      <h3>Resumo</h3>
                      <dl className="portal-dados">
                        <div><dt>Entrega prevista</dt><dd>{dia(p.delivery_date)}{atrasado(p) ? " (vencida)" : ""}</dd></div>
                        <div><dt>Pagamento</dt><dd>{p.payment_terms || "—"}</dd></div>
                        <div><dt>Frete</dt><dd>{p.freight ? FRETE[p.freight] ?? p.freight : "—"}</dd></div>
                        <div><dt>Transportadora</dt><dd>{p.carrier || p.shipments.find((e) => e.carrier)?.carrier || "—"}</dd></div>
                        <div className="largo"><dt>Entregar em</dt><dd>{p.delivery_address || "Endereço do cadastro"}</dd></div>
                        {p.note && <div className="largo"><dt>Observação</dt><dd>{p.note}</dd></div>}
                      </dl>
                    </section>
                    <section>
                      <h3>Itens</h3>
                      {aConfirmar(p) && <p className="portal-sub">Estes são os itens que você pediu. A {empresa} confere o preço de hoje e o prazo e confirma com você.</p>}
                      <div className="portal-tabela-rolagem"><table className="portal-tabela">
                        <thead><tr><th>Item</th><th className="num">Pedido</th><th className="num">Entregue</th><th className="num">Preço unit.</th><th className="num">Total</th></tr></thead>
                        <tbody>{p.lines.map((l, i) => (
                          <tr key={`${l.item}-${i}`}>
                            <td><strong>{l.item}</strong> {l.description}{l.mask ? <div className="portal-sub">{l.mask}</div> : null}</td>
                            <td className="num">{qtd(l.quantity)}{l.uom ? ` ${l.uom}` : ""}</td>
                            <td className="num">{l.delivered >= l.quantity ? <span className="portal-ok">✓ {qtd(l.delivered)}</span> : qtd(l.delivered)}</td>
                            <td className="num">{l.to_be_priced ? "a confirmar" : reais(l.unit_price)}</td><td className="num">{l.to_be_priced ? "—" : reais(l.total)}</td>
                          </tr>
                        ))}</tbody>
                        <tfoot><tr><td colSpan={4}>Total do pedido</td><td className="num"><strong>{aConfirmar(p) ? "a confirmar" : reais(p.total)}</strong></td></tr></tfoot>
                      </table></div>
                    </section>
                    <section>
                      <h3>Notas fiscais</h3>
                      {p.invoices.length ? <Notas lista={p.invoices} /> : <p className="portal-sub">A nota fiscal aparece aqui quando o pedido for faturado.</p>}
                    </section>
                    <section>
                      <h3>Pagamento</h3>
                      {p.installments.length ? <Titulos lista={p.installments} /> : <p className="portal-sub">As parcelas aparecem aqui depois do faturamento{p.payment_terms ? ` (${p.payment_terms})` : ""}.</p>}
                    </section>
                    {p.shipments.length > 0 && (
                      <section>
                        <h3>Entrega</h3>
                        <ul className="portal-entregas">
                          {p.shipments.map((e) => (
                            <li key={e.shipment}><strong>{ROMANEIO[e.status] ?? e.status}</strong>{e.shipped_at ? ` em ${dia(e.shipped_at)}` : ""}{e.carrier ? ` · ${e.carrier}` : ""}{e.invoice_number ? ` · NF-e ${e.invoice_number}` : ""}</li>
                          ))}
                        </ul>
                      </section>
                    )}
                    {p.status !== "R" && p.status !== "CANCELLED" && (
                      <div className="portal-acoes">
                        <span className="portal-sub">Quer os mesmos itens de novo? A {empresa} confirma o preço de hoje e o prazo com você.</span>
                        <button className="portal-btn" onClick={() => { setRepetir(p); setObs(""); }}>Pedir de novo</button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </>)}

        {aba === "financeiro" && (
          <div className="portal-cartao portal-secao">
            <h3>Parcelas dos seus pedidos</h3>
            {titulos.length ? <Titulos lista={titulos} /> : <p className="portal-sub">Nenhuma parcela por enquanto.</p>}
            <p className="portal-sub">O boleto e o PIX aparecem aqui quando a {empresa} emitir a cobrança. Pagamento feito leva até um dia útil para aparecer como pago.</p>
          </div>
        )}

        {aba === "notas" && (
          <div className="portal-cartao portal-secao">
            <h3>Notas fiscais</h3>
            {notas.length ? <Notas lista={notas} /> : <p className="portal-sub">Nenhuma nota fiscal emitida ainda.</p>}
          </div>
        )}

        <p className="portal-rodape">Este link é pessoal e vale até {dia(dados.link_expires_at)}. Não o compartilhe. Dúvidas: fale com o seu vendedor na {empresa}. · VentureERP</p>
      </main>

      {repetir && (
        <div className="portal-modal-fundo" role="dialog" aria-modal="true" aria-labelledby="portal-repetir" onClick={(e) => { if (e.target === e.currentTarget && !enviando) setRepetir(null); }}>
          <div className="portal-modal">
            <h3 id="portal-repetir">Pedir de novo o pedido {repetir.number}</h3>
            <p className="portal-sub">Vamos enviar à {empresa} um pedido com os mesmos itens e quantidades. Ela confirma o preço de hoje e o prazo com você antes de produzir ou faturar.</p>
            <ul className="portal-lista">
              {repetir.lines.map((l, i) => <li key={i}><strong>{qtd(l.quantity)}{l.uom ? ` ${l.uom}` : ""}</strong> × {l.item} {l.description}</li>)}
            </ul>
            <label className="portal-label" htmlFor="portal-obs">Alguma observação? (opcional)</label>
            <textarea id="portal-obs" placeholder="Ex.: preciso até dia 15; entregar na filial; mudar a quantidade do item X…" maxLength={500} value={obs} onChange={(e) => setObs(e.target.value)} />
            <div className="portal-acoes">
              <button className="portal-btn sec" onClick={() => setRepetir(null)} disabled={enviando}>Voltar</button>
              <button className="portal-btn" onClick={() => void confirmarRepeticao()} disabled={enviando}>{enviando ? "Enviando…" : "Enviar pedido à empresa"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

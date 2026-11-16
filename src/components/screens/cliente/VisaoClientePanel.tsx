import { useEffect, useState } from "react";
import { getCustomerOverview, type CustomerOverview } from "@/services/customerService";
import { errMessage } from "@/services/fiscalShared";
import { money, dataBR } from "./formato";
import "@/styles/cliente-credito.css";

/*
 * Visão 360 do cliente (VCLI0500): carteira, produção, financeiro, crédito e
 * alertas num só lugar, para quem atende o cliente não precisar abrir cinco
 * telas antes de responder.
 */

const COR = { vencido: "var(--v-err)", aVencer: "#d4b02a", pedidos: "var(--v-info)", livre: "var(--v-ok)" };
const pct = (v?: number) => (v == null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const compacto = (v: number) => v.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

function situacao(o: CustomerOverview): { tom: string; texto: string } {
  if (o.credit_limit <= 0) return { tom: "info", texto: "Sem limite definido" };
  if (o.credit_used > o.credit_limit) return { tom: "err", texto: "Limite excedido" };
  if (o.overdue_receivables > 0) return { tom: "warn", texto: "Com títulos vencidos" };
  if (o.credit_used >= o.credit_limit * 0.8) return { tom: "warn", texto: "Perto do limite" };
  return { tom: "ok", texto: "Crédito saudável" };
}

function SaudeDoCredito({ o }: { o: CustomerOverview }): JSX.Element {
  const st = situacao(o);
  const vencido = Math.max(0, o.overdue_receivables);
  const aVencer = Math.max(0, o.open_receivables - vencido);
  const pedidos = Math.max(0, o.open_orders_value);
  const livre = Math.max(0, o.credit_available);
  const escala = Math.max(o.credit_limit, o.credit_used, 1);
  const w = (v: number) => `${(v / escala) * 100}%`;
  const excedido = o.credit_limit > 0 && o.credit_available < 0;

  return (
    <div className="cc-card">
      <div className="cc-saude-topo">
        <div>
          <div className="cc-card-title" style={{ marginBottom: 4 }}>{excedido ? "Excedido em" : "Crédito disponível"}</div>
          <div className="cc-reco-valor" style={{ color: excedido ? "var(--v-err)" : undefined }}>
            {o.credit_limit > 0 ? money(Math.abs(o.credit_available)) : "—"}
          </div>
          <div style={{ marginTop: 6 }}><span className={`cc-pilula ${st.tom}`}>{st.texto}</span></div>
        </div>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="cc-kv"><span>Limite de crédito</span><b>{o.credit_limit > 0 ? money(o.credit_limit) : "não definido"}</b></div>
          <div className="cc-kv"><span>Em uso (títulos em aberto + pedidos não faturados)</span><b className={excedido ? "err" : ""}>{money(o.credit_used)}</b></div>
          {o.group_members > 1 && <div className="cc-kv"><span>Exposição do grupo econômico ({o.group_members} CNPJs com a mesma raiz)</span><b>{money(o.group_exposure)}</b></div>}
          <div className="cc-kv"><span>Participação no contas a receber da empresa</span><b>{pct(o.concentration_pct)}</b></div>
        </div>
      </div>
      {(o.credit_limit > 0 || o.credit_used > 0) && <>
        <div className="cc-pilha" role="img" aria-label={`Uso do crédito: vencido ${money(vencido)}, a vencer ${money(aVencer)}, pedidos ${money(pedidos)}, disponível ${money(livre)}`}>
          <span style={{ width: w(vencido), background: COR.vencido }} title={`Vencido: ${money(vencido)}`} />
          <span style={{ width: w(aVencer), background: COR.aVencer }} title={`A vencer: ${money(aVencer)}`} />
          <span style={{ width: w(pedidos), background: COR.pedidos }} title={`Pedidos em carteira: ${money(pedidos)}`} />
          <span style={{ width: w(livre), background: COR.livre }} title={`Disponível: ${money(livre)}`} />
          {o.credit_limit > 0 && excedido && <div className="cc-pilha-limite" style={{ left: w(o.credit_limit) }} title={`Limite: ${money(o.credit_limit)}`} />}
        </div>
        <div className="cc-legenda">
          <span><i style={{ background: COR.vencido }} />Títulos vencidos<b>{money(vencido)}</b></span>
          <span><i style={{ background: COR.aVencer }} />Títulos a vencer<b>{money(aVencer)}</b></span>
          <span><i style={{ background: COR.pedidos }} />Pedidos não faturados<b>{money(pedidos)}</b></span>
          {o.credit_limit > 0 && <span><i style={{ background: COR.livre }} />Disponível<b>{money(livre)}</b></span>}
          {excedido && <span><i style={{ background: "var(--v-text)", width: 3 }} />Limite</span>}
        </div>
      </>}
    </div>
  );
}

function Faturamento({ o }: { o: CustomerOverview }): JSX.Element {
  const maior = Math.max(1, ...o.billing_by_month.map((m) => m.value));
  const comValor = o.billing_by_month.filter((m) => m.value > 0).length;
  const media = comValor ? o.billed_12m / 12 : 0;
  return (
    <div className="cc-card">
      <div className="cc-row">
        <div className="cc-card-title" style={{ margin: 0 }}>Faturamento dos últimos 12 meses</div>
        <div className="cc-spacer" />
        <span className="cc-muted">Total <strong>{money(o.billed_12m)}</strong> · média mensal <strong>{money(media)}</strong></span>
      </div>
      {comValor === 0
        ? <div className="cc-muted" style={{ padding: "26px 0", textAlign: "center" }}>Nenhuma nota faturada para este cliente nos últimos 12 meses.</div>
        : <div className="cc-grafico" role="img" aria-label="Faturamento mensal dos últimos 12 meses">
          {o.billing_by_month.map((m) => (
            <div key={m.month} className="cc-grafico-col" title={`${m.month.slice(5)}/${m.month.slice(0, 4)}: ${money(m.value)}`}>
              {m.value > 0 && <span className="cc-grafico-val">{compacto(m.value)}</span>}
              <div className={`cc-grafico-barra${m.value > 0 ? "" : " zero"}`} style={{ height: m.value > 0 ? `${Math.max(3, (m.value / maior) * 100)}%` : 2 }} />
              <span className="cc-grafico-mes">{m.month.slice(5)}/{m.month.slice(2, 4)}</span>
            </div>
          ))}
        </div>}
    </div>
  );
}

export function VisaoClientePanel({ code }: { code: number }): JSX.Element {
  const [o, setO] = useState<CustomerOverview | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let vivo = true;
    setO(null); setErro("");
    getCustomerOverview(code).then((r) => { if (vivo) setO(r); }).catch((e) => { if (vivo) setErro(errMessage(e, "Não foi possível montar a visão do cliente.")); });
    return () => { vivo = false; };
  }, [code]);

  if (erro) return <div className="erp-feedback error">{erro}</div>;
  if (!o) return <div className="erp-note">Carregando…</div>;

  return (
    <div style={{ padding: "2px 0 8px" }}>
      {o.alerts.length > 0 && (
        <div className="cc-alertas" style={{ marginBottom: 14 }}>
          {o.alerts.map((a) => <div key={a} className="erp-feedback warn">{a}</div>)}
        </div>
      )}

      <SaudeDoCredito o={o} />

      <div className="cc-grid" style={{ marginTop: 14 }}>
        <div className="cc-card">
          <div className="cc-card-title">Como o cliente paga</div>
          <div className="cc-kv"><span>Pago em dia</span><b className={o.on_time_pct != null && o.on_time_pct < 70 ? "err" : ""}>{pct(o.on_time_pct)}</b></div>
          <div className="cc-kv"><span>Atraso médio</span><b>{o.avg_delay_days.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dia(s)</b></div>
          <div className="cc-kv"><span>Maior atraso</span><b>{o.max_delay_days} dia(s)</b></div>
          <div className="cc-kv"><span>Vencido em aberto</span><b className={o.overdue_receivables > 0 ? "err" : "ok"}>{o.overdue_receivables > 0 ? `${money(o.overdue_receivables)} · há ${o.max_open_overdue_days} dia(s)` : "nada vencido"}</b></div>
        </div>
        <div className="cc-card">
          <div className="cc-card-title">Comercial</div>
          <div className="cc-kv"><span>Pedidos em carteira</span><b>{o.open_orders} · {money(o.open_orders_value)}</b></div>
          <div className="cc-kv"><span>Orçamentos abertos</span><b>{o.open_quotations}</b></div>
          <div className="cc-kv"><span>Último pedido</span><b>{dataBR(o.last_order_date)}</b></div>
          <div className="cc-kv"><span>Última nota fiscal</span><b>{dataBR(o.last_invoice_date)}</b></div>
        </div>
        <div className="cc-card">
          <div className="cc-card-title">Produção e serviços</div>
          <div className="cc-kv"><span>OPs em fabricação</span><b>{o.production_orders_in_progress}</b></div>
          <div className="cc-kv"><span>Ordens de serviço abertas</span><b>{o.open_service_orders}</b></div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}><Faturamento o={o} /></div>
    </div>
  );
}

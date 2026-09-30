import { useState, useCallback } from "react";
import { type BalanceDTO, listBalance } from "@/services/customerMaterialService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadCustomers } from "@/services/lookups";

/**
 * VBEN0200 — Estoque de terceiros: o que é do cliente e está aqui.
 *
 * Tela NOVA, ao lado do estoque próprio (VEST0100) e sem alterá-lo. A separação é
 * exigência do cliente: material próprio e de terceiro não se misturam, e cada um
 * soma no seu lugar. Um total único dos dois seria número sem significado —
 * metade dele não pertence à empresa.
 *
 * O saldo é agregado por cliente proprietário e pelo código do item COMO ELE
 * APARECE na nota do cliente, porque é com esse código que o retorno fiscal sai.
 *
 * A ordenação é pelo prazo fiscal mais próximo: a pergunta que a conferência faz
 * não é "quanto tem", é "o que precisa voltar primeiro".
 */

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

/** Soma em string para não perder casa decimal no caminho. */
function somar(valores: string[]): string {
  const total = valores.reduce((acc, v) => acc + Number(v || 0), 0);
  return Number.isFinite(total) ? String(Number(total.toFixed(6))) : "—";
}

/** Dias até o prazo, a partir da data que o servidor mandou. */
function diasAte(data: string | null | undefined): number | null {
  if (!data) return null;
  const alvo = Date.parse(`${data}T00:00:00Z`);
  if (Number.isNaN(alvo)) return null;
  const hojeUTC = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.round((alvo - hojeUTC) / 86400000);
}

function textoDoPrazo(data: string | null | undefined): string {
  const dias = diasAte(data);
  if (dias === null) return "—";
  if (dias < 0) return `${data} · ${Math.abs(dias)} dia(s) em atraso`;
  if (dias === 0) return `${data} · vence hoje`;
  return `${data} · em ${dias} dia(s)`;
}

function classeDoPrazo(data: string | null | undefined): string {
  const dias = diasAte(data);
  if (dias === null) return "";
  if (dias < 0) return "erp-cell-danger";
  if (dias <= 5) return "erp-cell-warn";
  return "";
}

export function Vben0200Page(): JSX.Element {
  const [saldos, setSaldos] = useState<BalanceDTO[]>([]);
  const [filtro, setFiltro] = useState({ customer_code: 0, customer_item_code: "", q: "" });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [consultado, setConsultado] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const consultar = () => run(async () => {
    const lista = await listBalance({
      customer_code: filtro.customer_code || undefined,
      customer_item_code: filtro.customer_item_code || undefined,
      q: filtro.q || undefined,
    });
    setSaldos(lista);
    setConsultado(true);
    if (lista.length === 0) {
      setFeedback({ type: "info", message: "Nenhum material de terceiro em poder da empresa com este filtro." });
    }
  });

  // Agrupa por cliente para a leitura ser "o que é de cada um", que é como a
  // conferência e a devolução acontecem na prática.
  const porCliente = saldos.reduce<Record<string, BalanceDTO[]>>((acc, s) => {
    const chave = `${s.customer_code}|${s.customer_name}`;
    (acc[chave] ??= []).push(s);
    return acc;
  }, {});

  const atrasados = saldos.filter((s) => (diasAte(s.prazo_mais_proximo) ?? 1) < 0).length;
  const proximos = saldos.filter((s) => {
    const d = diasAte(s.prazo_mais_proximo);
    return d !== null && d >= 0 && d <= 5;
  }).length;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Almoxarifado</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Estoque de Terceiros — Material do Cliente</span>
          <span className="erp-crumb-code">VBEN0200</span>
        </nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Dados</span>
          <button className="erp-btn" onClick={consultar} disabled={busy}>Consultar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VBEN0200 — Estoque de Terceiros" filename="vben0200" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Material do Cliente em Poder da Empresa</button></div>
          <div className="erp-detail-body">

            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            <div className="erp-fieldset"><div className="erp-fieldset-head">Consultar</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c4"><label className="erp-label">Cliente proprietário</label>
                <LookupField value={filtro.customer_code || undefined} loader={loadCustomers} entityLabel="cliente"
                  onChange={(code) => setFiltro((p) => ({ ...p, customer_code: code ? Number(code) : 0 }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Código do item na nota do cliente</label>
                <input className="erp-input" value={filtro.customer_item_code}
                  onChange={(e) => setFiltro((p) => ({ ...p, customer_item_code: e.target.value }))} /></div>
              <div className="erp-field erp-c5"><label className="erp-label">Buscar por código ou descrição</label>
                <input className="erp-input" value={filtro.q}
                  onChange={(e) => setFiltro((p) => ({ ...p, q: e.target.value }))} /></div>
              <div className="erp-field erp-c12">
                <span className="erp-hint">
                  Este é o material que pertence ao cliente e está fisicamente aqui. Ele NÃO
                  entra na valoração do estoque da empresa, no custeio nem no líquido do MRP —
                  não é nosso. O estoque próprio continua em VEST0100.
                </span>
              </div>
            </div></div>

            {consultado && saldos.length > 0 && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">
                Resumo — {saldos.length} item(ns) de {Object.keys(porCliente).length} cliente(s)
                {atrasados > 0 && ` · ${atrasados} com prazo VENCIDO`}
                {proximos > 0 && ` · ${proximos} vencendo em até 5 dias`}
              </div><div className="erp-fieldset-body">
                <div className="erp-field erp-c12">
                  <span className="erp-hint">
                    Ordenado pelo prazo fiscal mais próximo: o que precisa voltar primeiro
                    aparece primeiro. Devolver após o prazo expõe a operação fiscalmente.
                  </span>
                </div>
              </div></div>
            )}

            {Object.entries(porCliente).map(([chave, itens]) => {
              const [codigo, nome] = chave.split("|");
              return (
                <div className="erp-fieldset" key={chave}>
                  <div className="erp-fieldset-head">
                    Cliente {codigo}{nome ? ` — ${nome}` : ""} · {itens.length} item(ns)
                  </div>
                  <div className="erp-fieldset-body"><div className="erp-field erp-c12">
                    <table className="erp-grid">
                      <thead><tr>
                        <th>Item na nota do cliente</th><th>Descrição</th><th>Item interno</th>
                        <th>UM</th><th>Saldo aqui</th><th>Remessas</th><th>Prazo mais próximo</th>
                      </tr></thead>
                      <tbody>
                        {itens.map((s) => (
                          <tr key={`${s.customer_code}-${s.customer_item_code}`}>
                            <td>{s.customer_item_code}</td>
                            <td>{s.description}</td>
                            <td>{s.item_code ?? "—"}</td>
                            <td>{s.uom}</td>
                            <td><strong>{s.balance}</strong></td>
                            <td>{s.remessas_abertas}</td>
                            <td className={classeDoPrazo(s.prazo_mais_proximo)}>{textoDoPrazo(s.prazo_mais_proximo)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot><tr>
                        <td colSpan={4}><strong>Total deste cliente</strong></td>
                        <td><strong>{somar(itens.map((i) => i.balance))}</strong></td>
                        <td colSpan={2}>
                          <span className="erp-hint">
                            A soma vale por unidade de medida; itens em UM diferentes não se somam.
                          </span>
                        </td>
                      </tr></tfoot>
                    </table>
                  </div></div>
                </div>
              );
            })}

            {consultado && saldos.length === 0 && (
              <div className="erp-fieldset"><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <span className="erp-hint">
                  Nada em poder da empresa com este filtro. Um saldo zerado significa que todo o
                  material recebido já voltou ao cliente — por retorno com faturamento, sobra ou
                  sucata devolvida.
                </span>
              </div></div></div>
            )}

          </div>
        </section>
      </div>
    </div>
  );
}

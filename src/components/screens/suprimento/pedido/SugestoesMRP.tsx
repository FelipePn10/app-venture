import { Fragment, useCallback, useEffect, useState } from "react";
import { approveSuggestion, listSuggestions, rejectSuggestion, type SuggestionDTO } from "@/services/purchaseOrderService";
import { errMessage, parseNum, parseStr } from "@/services/fiscalShared";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadSuppliers } from "@/services/lookups";
import { enumLabel } from "@/utils/enumLabels";

type Feedback = { type: "success" | "error" | "info"; message: string };
const num = (v?: number) => (v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 });

/**
 * Sugestões de compra do MRP (ordens planejadas de compra ainda não firmes).
 * Aprovar gera o pedido com o fornecedor escolhido na lista; o pedido passa
 * pela alçada como qualquer outro.
 */
export function SugestoesMRP({ onFeedback, onPedidoGerado }: { onFeedback: (f: Feedback) => void; onPedidoGerado: (code: number, aviso: Feedback) => void }): JSX.Element {
  const [lista, setLista] = useState<SuggestionDTO[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [aprovando, setAprovando] = useState<{ code: number; fornecedor?: number; preco: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [nomeItem, setNomeItem] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    setCarregando(true);
    try { setLista(await listSuggestions()); } catch (e) { onFeedback({ type: "error", message: errMessage(e) }); } finally { setCarregando(false); }
  }, [onFeedback]);
  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => {
    void loadItems().then((o) => setNomeItem(Object.fromEntries(o.map((x) => [String(x.code), x.label])))).catch(() => undefined);
  }, []);

  async function gerar() {
    if (!aprovando) return;
    if (!aprovando.fornecedor) { onFeedback({ type: "error", message: "Escolha o fornecedor." }); return; }
    const preco = Number(aprovando.preco);
    if (aprovando.preco.trim() === "" || !(preco >= 0)) { onFeedback({ type: "error", message: "Informe o preço unitário." }); return; }
    setBusy(true);
    try {
      const o = await approveSuggestion(aprovando.code, { supplier_code: aprovando.fornecedor, unit_price: preco });
      const code = parseNum(o, "code", "Code");
      const status = parseStr(o, "status", "Status");
      setAprovando(null);
      const aviso: Feedback = status === "APPROVED"
        ? { type: "success", message: `Sugestão aprovada: pedido gerado e aprovado.` }
        : status === "REQUESTED"
          ? { type: "info", message: `Sugestão aprovada: o pedido ficou acima da alçada do comprador e aguarda "Autorizar alçada".` }
          : { type: "info", message: `Sugestão aprovada: o pedido ficou em rascunho — confira os itens e aprove.` };
      await carregar();
      // O pedido gerado abre na hora; o aviso vai junto para não ser trocado
      // pelo "pedido aberto".
      if (code) onPedidoGerado(code, aviso); else onFeedback(aviso);
    } catch (e) { onFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function rejeitar(code: number) {
    setBusy(true);
    try { await rejectSuggestion(code); onFeedback({ type: "success", message: "Sugestão rejeitada." }); await carregar(); }
    catch (e) { onFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-detail-body" data-testid="sugestoes-mrp">
      <div className="erp-fieldset">
        <div className="erp-fieldset-head">Sugestões de compra do MRP ({lista.length})</div>
        <div className="erp-fieldset-body">
          <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
            <table className="erp-grid">
              <thead><tr><th>Sugestão</th><th>Item</th><th className="num">Quantidade</th><th>Necessidade</th><th>Situação</th><th /></tr></thead>
              <tbody>
                {carregando && <tr><td colSpan={6} className="erp-grid-empty"><span className="erp-spin" /> Carregando…</td></tr>}
                {!carregando && lista.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhuma sugestão de compra em aberto.</td></tr>}
                {!carregando && lista.map((s) => (
                  <Fragment key={s.code}>
                    <tr>
                      <td>{s.code}</td>
                      <td><strong>{s.item_code}</strong>{nomeItem[s.item_code] && <><br /><small>{nomeItem[s.item_code]}</small></>}</td>
                      <td className="num">{num(s.quantity)}</td>
                      <td>{(s.need_date ?? "").slice(0, 10).split("-").reverse().join("/") || "—"}</td>
                      <td>{enumLabel(s.status)}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="erp-btn erp-btn-primary erp-btn-sm" disabled={busy} onClick={() => setAprovando({ code: s.code, preco: "" })}>Aprovar</button>{" "}
                        <button className="erp-btn erp-btn-danger erp-btn-sm" disabled={busy} onClick={() => void rejeitar(s.code)}>Rejeitar</button>
                      </td>
                    </tr>
                    {aprovando?.code === s.code && (
                      <tr><td colSpan={6}>
                        <div className="pdc-inline" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
                          <div style={{ minWidth: 280, flex: 1 }}><label className="erp-label erp-req">Fornecedor</label>
                            <LookupField value={aprovando.fornecedor} loader={loadSuppliers} entityLabel="fornecedor" placeholder="Quem vende"
                              onChange={(c) => setAprovando((a) => (a ? { ...a, fornecedor: c ? Number(c) : undefined } : a))} /></div>
                          <div style={{ width: 150 }}><label className="erp-label erp-req">Preço unitário</label>
                            <input className="erp-input num" type="number" step="0.0001" min="0" value={aprovando.preco}
                              onChange={(e) => setAprovando((a) => (a ? { ...a, preco: e.target.value } : a))} /></div>
                          <button className="erp-btn erp-btn-primary" disabled={busy} onClick={() => void gerar()}>Gerar pedido</button>
                          <button className="erp-btn" onClick={() => setAprovando(null)}>Desistir</button>
                        </div>
                      </td></tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

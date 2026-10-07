import { Fragment, useCallback, useEffect, useState } from "react";
import { listFollowUp, type LinhaEmAberto, type SituacaoAcompanhamento } from "@/services/purchaseOrderService";
import { errMessage } from "@/services/fiscalShared";
import { LookupField } from "@/components/ui/LookupField";
import { loadSuppliers } from "@/services/lookups";
import { FollowupLinha } from "./FollowupLinha";

const num = (v?: number) => (v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
const dataBR = (s?: string) => (s ? s.split("-").reverse().join("/") : "—");

const FILTROS: Array<{ v: SituacaoAcompanhamento; rotulo: string }> = [
  { v: "ATRASADAS", rotulo: "Atrasadas" },
  { v: "PROXIMOS_7", rotulo: "Chegam em 7 dias" },
  { v: "SEM_PROMESSA", rotulo: "Sem data confirmada" },
  { v: "TODAS", rotulo: "Todas em aberto" },
];

/**
 * Acompanhamento de entregas: o que os fornecedores ainda devem, com os dias de
 * atraso pela data prometida (ou, sem promessa, pela pedida). O comprador
 * registra o contato na própria linha — a data prometida passa a valer aqui e
 * na previsão de pagamentos.
 */
export function AcompanhamentoEntregas({ onAbrirPedido }: { onAbrirPedido: (code: number) => void }): JSX.Element {
  const [situacao, setSituacao] = useState<SituacaoAcompanhamento>("ATRASADAS");
  const [fornecedor, setFornecedor] = useState<number | undefined>();
  const [linhas, setLinhas] = useState<LinhaEmAberto[]>([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [aberta, setAberta] = useState<number | null>(null);
  const [aviso, setAviso] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try { setLinhas(await listFollowUp(situacao, fornecedor)); } catch (e) { setErro(errMessage(e)); } finally { setCarregando(false); }
  }, [situacao, fornecedor]);
  useEffect(() => { void carregar(); }, [carregar]);

  return (
    <div className="erp-detail-body" data-testid="acompanhamento-entregas">
      <div className="erp-fieldset">
        <div className="erp-fieldset-head">Acompanhamento de entregas</div>
        <div className="erp-fieldset-body">
          <div className="erp-field erp-c6">
            <label className="erp-label">Mostrar</label>
            <div className="pdc-inline" style={{ padding: 0 }}>
              {FILTROS.map((f) => (
                <button key={f.v} className={`erp-btn erp-btn-sm${situacao === f.v ? " erp-btn-dark" : ""}`} onClick={() => setSituacao(f.v)}>{f.rotulo}</button>
              ))}
            </div>
          </div>
          <div className="erp-field erp-c4">
            <label className="erp-label">Fornecedor</label>
            <LookupField value={fornecedor} loader={loadSuppliers} entityLabel="fornecedor" placeholder="Todos" clearable
              onChange={(c) => setFornecedor(c ? Number(c) : undefined)} />
          </div>
          <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
            <button className="erp-btn" onClick={() => void carregar()} disabled={carregando}>Atualizar</button>
          </div>
          {erro && <div className="erp-field erp-c12"><div className="erp-feedback error">{erro}</div></div>}
          {aviso && <div className="erp-field erp-c12"><div className="erp-feedback success">{aviso}</div></div>}
          <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
            <table className="erp-grid">
              <thead>
                <tr>
                  <th>Pedido</th><th>Fornecedor</th><th>Item</th><th className="num">Saldo</th>
                  <th>Pedida</th><th>Prometida</th><th>Atraso</th><th>Último contato</th><th />
                </tr>
              </thead>
              <tbody>
                {carregando && <tr><td colSpan={9} className="erp-grid-empty"><span className="erp-spin" /> Carregando…</td></tr>}
                {!carregando && linhas.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">Nada nesta situação.</td></tr>}
                {!carregando && linhas.map((l) => (
                  <Fragment key={l.line_code}>
                    <tr className={aberta === l.line_code ? "erp-row-sel" : undefined}>
                      <td><button className="erp-btn erp-btn-sm" onClick={() => onAbrirPedido(l.purchase_order_code)}>Nº {l.order_number}</button> <small>linha {l.sequence}</small></td>
                      <td>{l.supplier_name || `Fornecedor ${l.supplier_code}`}</td>
                      <td><strong>{l.item_code}</strong><br /><small>{l.item_name}</small></td>
                      <td className="num">{num(l.saldo)}</td>
                      <td>{dataBR(l.delivery_date)}</td>
                      <td>{dataBR(l.promised_date)}</td>
                      <td>{l.dias_atraso > 0
                        ? <span className="erp-badge erp-badge-red">{l.dias_atraso} dia{l.dias_atraso === 1 ? "" : "s"}</span>
                        : l.data_prevista ? <span className="erp-badge erp-badge-green">em dia</span> : <span className="erp-badge erp-badge-gray">sem data</span>}</td>
                      <td>{l.ultimo_contato
                        ? <small>{dataBR(l.ultimo_contato.registrado_em.slice(0, 10))} · {l.ultimo_contato.contato ?? l.ultimo_contato.registrado_por ?? ""}{l.ultimo_contato.observacao ? ` — ${l.ultimo_contato.observacao}` : ""}</small>
                        : <small className="pdc-hint">nenhum</small>}</td>
                      <td><button className="erp-btn erp-btn-sm" onClick={() => { setAviso(""); setAberta(aberta === l.line_code ? null : l.line_code); }}>
                        {aberta === l.line_code ? "Fechar" : "Registrar contato"}</button></td>
                    </tr>
                    {aberta === l.line_code && (
                      <tr><td colSpan={9}>
                        <FollowupLinha code={l.purchase_order_code} lineCode={l.line_code} promessaAtual={l.promised_date}
                          onFechar={() => setAberta(null)}
                          onSalvo={(f) => { setAviso(`Contato registrado${f.data_prometida ? `; entrega prometida para ${dataBR(f.data_prometida)}` : ""}.`); void carregar(); }} />
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

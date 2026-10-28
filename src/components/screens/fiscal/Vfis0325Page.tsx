import { useState } from "react";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadCustomers, loadInvoiceTypesById, loadItems } from "@/services/lookups";
import { FINALIDADES_COMPRA } from "@/services/customerService";
import { simularTributacao, type SimulacaoResultado } from "@/services/tributacaoService";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
interface Linha { item_code?: string; ncm: string; origem: string; quantidade: number; valor_unitario: number; }

const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n?: number) => `${(n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%`;
const LINHA_VAZIA: Linha = { ncm: "", origem: "0", quantidade: 1, valor_unitario: 0 };
const REGIMES: Record<string, string> = { SIMPLES: "Simples Nacional", PRESUMIDO: "Lucro Presumido", REAL: "Lucro Real" };
const DESTINATARIOS: Record<string, string> = { contribuinte: "Contribuinte", nao_contribuinte: "Não contribuinte", pessoa_fisica: "Pessoa física" };
const ORIGENS_MERCADORIA: { value: string; label: string }[] = [
  { value: "0", label: "0 — Nacional" },
  { value: "1", label: "1 — Estrangeira, importação direta" },
  { value: "2", label: "2 — Estrangeira, mercado interno" },
  { value: "3", label: "3 — Nacional, importação acima de 40%" },
  { value: "4", label: "4 — Nacional, processo produtivo básico" },
  { value: "5", label: "5 — Nacional, importação até 40%" },
  { value: "6", label: "6 — Estrangeira sem similar, importação direta" },
  { value: "7", label: "7 — Estrangeira sem similar, mercado interno" },
  { value: "8", label: "8 — Nacional, importação acima de 70%" },
];
const ORIGENS_FINALIDADE: Record<string, string> = { INFORMADA: "informada aqui", PEDIDO: "do pedido", CLIENTE: "do cadastro do cliente", DEDUZIDA: "deduzida pela inscrição estadual" };

/**
 * Simulador de tributação: calcula ICMS, IPI, PIS/COFINS, ST e DIFAL de uma
 * venda exatamente como a NF-e vai calcular — sem gravar nada. Serve para o
 * contador conferir a parametrização de cada cenário antes de faturar.
 */
export function Vfis0325Page(): JSX.Element {
  const [cliente, setCliente] = useState<number | undefined>();
  const [uf, setUf] = useState("");
  const [ie, setIe] = useState("");
  const [finalidade, setFinalidade] = useState("");
  const [tipoNota, setTipoNota] = useState<number | undefined>();
  const [linhas, setLinhas] = useState<Linha[]>([{ ...LINHA_VAZIA }]);
  const [resultado, setResultado] = useState<SimulacaoResultado | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const setLinha = (i: number, patch: Partial<Linha>) => { setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l))); setResultado(null); };

  async function simular() {
    if (!cliente && uf.trim().length !== 2) { setFeedback({ type: "error", message: "Informe o cliente ou a UF de destino." }); return; }
    if (linhas.some((l) => !l.item_code && !l.ncm.trim())) { setFeedback({ type: "error", message: "Cada linha precisa do item ou do NCM." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const r = await simularTributacao({
        customer_code: cliente, uf_destino: uf.trim() || undefined, ie_destinatario: ie.trim() || undefined,
        finalidade_compra: finalidade || undefined, invoice_type_id: tipoNota,
        itens: linhas.map((l) => ({ item_code: l.item_code, ncm: l.ncm.trim() || undefined, origem_mercadoria: l.item_code ? undefined : l.origem, quantidade: l.quantidade, valor_unitario: l.valor_unitario })),
      });
      setResultado(r);
      setFeedback(r.pendencias.some((p) => p.nivel === "IMPEDE")
        ? { type: "error", message: "Esta venda não seria transmitida: veja as pendências." }
        : { type: "success", message: "Simulação concluída. Nada foi gravado." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e, "Não foi possível simular.") }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Simulador de Tributação</span><span className="erp-crumb-code">VFIS0325</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void simular()} disabled={busy}>{busy ? "Calculando..." : "Simular"}</button>
          <button className="erp-btn" onClick={() => { setLinhas([{ ...LINHA_VAZIA }]); setResultado(null); setFeedback(null); }} disabled={busy}>Limpar</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0325 — Simulador de Tributação" filename="vfis0325" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Simulação</button></div>
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
            {!resultado && !feedback && (
              <div className="erp-note">
                Monte uma venda — cliente (ou UF e inscrição estadual), finalidade e itens — e clique em <strong>Simular</strong>.
                O sistema calcula ICMS, IPI, PIS/COFINS, ST e DIFAL exatamente como a nota fiscal vai calcular e mostra qual
                regra de Parâmetros ICMS/IPI foi usada em cada item. Nada é gravado.
              </div>
            )}

            <div className="erp-fieldset"><div className="erp-fieldset-head">Venda — <span style={{ fontWeight: 400, opacity: 0.65 }}>com o cliente, UF e IE vêm do cadastro; o que você digitar aqui prevalece</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c4"><label className="erp-label">Cliente</label>
                <LookupField value={cliente} loader={loadCustomers} entityLabel="cliente" placeholder="Opcional" clearable onChange={(c) => { setCliente(c ? Number(c) : undefined); setResultado(null); }} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">UF de destino</label>
                <input className="erp-input" maxLength={2} value={uf} placeholder="do cliente" onChange={(e) => { setUf(e.target.value.toUpperCase()); setResultado(null); }} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">IE do destinatário</label>
                <input className="erp-input" value={ie} placeholder="vazio = não contribuinte" onChange={(e) => { setIe(e.target.value); setResultado(null); }} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Finalidade da compra</label>
                <select className="erp-input" value={finalidade} onChange={(e) => { setFinalidade(e.target.value); setResultado(null); }}>
                  {FINALIDADES_COMPRA.map((f) => <option key={f.value} value={f.value}>{f.value === "" ? "Do cliente / deduzir" : f.label}</option>)}
                </select></div>
              <div className="erp-field erp-c2"><label className="erp-label">Tipo de nota</label>
                <LookupField value={tipoNota} loader={loadInvoiceTypesById} entityLabel="tipo de nota" placeholder="Nenhum" clearable onChange={(c) => { setTipoNota(c ? Number(c) : undefined); setResultado(null); }} /></div>
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Itens</div><div className="erp-fieldset-body">
              {linhas.map((l, i) => (
                <div key={i} style={{ display: "contents" }}>
                  <div className="erp-field erp-c4"><label className="erp-label">Item</label>
                    <LookupField<string> value={l.item_code} loader={loadItems} entityLabel="item" placeholder="ou informe o NCM" clearable onChange={(c) => setLinha(i, { item_code: c ? String(c) : undefined })} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">NCM</label>
                    <input className="erp-input" value={l.ncm} placeholder="do item" onChange={(e) => setLinha(i, { ncm: e.target.value })} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Origem</label>
                    <select className="erp-input" value={l.origem} title="Usada quando a linha não tem item; com item, vale a origem do cadastro" onChange={(e) => setLinha(i, { origem: e.target.value })}>
                      {ORIGENS_MERCADORIA.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                  <div className="erp-field erp-c1"><label className="erp-label">Quantidade</label>
                    <input className="erp-input num" type="number" step="0.0001" value={l.quantidade} onChange={(e) => setLinha(i, { quantidade: Number(e.target.value) })} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Valor unitário</label>
                    <input className="erp-input num" type="number" step="0.01" value={l.valor_unitario} onChange={(e) => setLinha(i, { valor_unitario: Number(e.target.value) })} /></div>
                  <div className="erp-field erp-c1" style={{ alignSelf: "flex-end" }}>
                    <button className="erp-btn erp-btn-danger erp-btn-sm" disabled={linhas.length === 1} onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))}>Remover</button></div>
                </div>
              ))}
              <div className="erp-field erp-c12"><button className="erp-btn erp-btn-sm" onClick={() => setLinhas((ls) => [...ls, { ...LINHA_VAZIA }])}>+ Linha</button></div>
            </div></div>

            {resultado && (
              <>
                <div className="erp-fieldset"><div className="erp-fieldset-head">Cenário que valeu</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c12"><p className="erp-note">
                    Empresa no <strong>{REGIMES[resultado.regime] ?? resultado.regime}</strong> ({resultado.uf_origem}) vendendo para{" "}
                    <strong>{DESTINATARIOS[resultado.tipo_destinatario] ?? resultado.tipo_destinatario}</strong> em {resultado.uf_destino}
                    {resultado.finalidade_compra ? <> — finalidade <strong>{FINALIDADES_COMPRA.find((f) => f.value === resultado.finalidade_compra)?.label}</strong> ({ORIGENS_FINALIDADE[resultado.origem_finalidade] ?? resultado.origem_finalidade})</> : " — finalidade deduzida pela inscrição estadual"}.
                    {" "}{resultado.consumidor_final ? "Consumidor final." : "Não é consumidor final."}
                    {resultado.tipo_nota && <> Tipo de nota: {resultado.tipo_nota}.</>}
                    {resultado.exige_regra && " A empresa exige regra de ICMS/IPI em toda linha."}
                  </p></div>
                  {resultado.pendencias.map((p, i) => (
                    <div key={i} className="erp-field erp-c12"><div className={`erp-feedback ${p.nivel === "IMPEDE" ? "error" : "info"}`}>{p.nivel === "IMPEDE" ? "Impede: " : "Atenção: "}{p.mensagem}</div></div>
                  ))}
                </div></div>

                <div className="erp-fieldset"><div className="erp-fieldset-head">Tributação por linha — <span style={{ fontWeight: 400, opacity: 0.65 }}>total da nota {money(resultado.valor_total_nota)}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                  <table className="erp-grid">
                    <thead><tr>
                      <th>#</th><th>NCM</th><th>Regra</th><th className="num">Produtos</th><th>CST/CSOSN</th><th className="num">Base ICMS</th><th className="num">ICMS</th>
                      <th className="num">Diferido</th><th className="num">ICMS-ST</th><th className="num">IPI</th><th className="num">PIS</th><th className="num">COFINS</th><th className="num">DIFAL + FCP</th>
                    </tr></thead>
                    <tbody>
                      {resultado.itens.map((l) => (
                        <tr key={l.sequencia}>
                          <td>{l.sequencia}</td>
                          <td>{l.ncm || <span className="erp-badge erp-badge-red">sem NCM</span>}</td>
                          <td>{l.regra_icms_ipi_id ? `nº ${l.regra_icms_ipi_id}` : <span className="erp-badge">geral</span>}</td>
                          <td className="num">{money(l.valor_produtos)}</td>
                          <td>{l.cst_icms}{l.valor_credito_simples > 0 && <span className="erp-hint"> crédito {pct(l.aliq_credito_simples_pct)} = {money(l.valor_credito_simples)}</span>}</td>
                          <td className="num">{money(l.base_icms)}{l.icms_reducao_base_pct > 0 && <span className="erp-hint"> (red. {pct(l.icms_reducao_base_pct)})</span>}</td>
                          <td className="num">{pct(l.aliq_icms_pct)} = {money(l.valor_icms)}</td>
                          <td className="num">{l.valor_icms_diferido > 0 ? `${pct(l.icms_diferimento_pct)} = ${money(l.valor_icms_diferido)}` : "—"}</td>
                          <td className="num">{l.valor_icms_st > 0 ? `MVA ${pct(l.mva_pct)}: ${money(l.valor_icms_st)}` : "—"}</td>
                          <td className="num">{l.cst_ipi} · {pct(l.aliq_ipi_pct)} = {money(l.valor_ipi)}</td>
                          <td className="num">{l.cst_pis} · {money(l.valor_pis)}</td>
                          <td className="num">{l.cst_cofins} · {money(l.valor_cofins)}</td>
                          <td className="num">{l.valor_difal + l.valor_fcp_uf_dest > 0 ? money(l.valor_difal + l.valor_fcp_uf_dest) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {resultado.itens.map((l) => l.notas.length > 0 && (
                    <div key={`n-${l.sequencia}`} className="erp-note"><strong>Linha {l.sequencia}:</strong> {l.notas.join("; ")}.</div>
                  ))}
                </div></div></div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

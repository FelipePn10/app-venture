import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Frete, type FretePayload, type TipoRateioFrete, ROTULO_RATEIO,
  listarFretes, obterFrete, criarFrete, atualizarFrete, importarFreteXml, lancarFrete, cancelarFrete, payloadDoFrete,
} from "@/services/freteCompraService";
import { errMessage } from "@/services/fiscalShared";

/**
 * Frete sobre compras (VFIS0210 › Fretes). O CT-e da transportadora entra pelo
 * XML (as notas citadas no CT-e já vêm ligadas) ou à mão; ao ser lançado, o
 * frete é rateado entre os itens das notas, complementa o custo do estoque
 * (o que já foi consumido vai para despesa), gera o título da transportadora e
 * é contabilizado. Cancelar desfaz tudo enquanto o título não foi pago.
 */

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
export interface EntradaParaFrete { id: number; numero_nf: number; serie: string; razao_social_emitente: string; valor_total: number; status: string }

const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dataBR = (iso?: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
const hoje = () => new Date().toISOString().slice(0, 10);
const em30dias = () => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); };
const ROTULO_STATUS: Record<string, string> = { PENDENTE: "Pendente", LANCADO: "Lançado", CANCELADO: "Cancelado" };

function statusPill(s: string): JSX.Element {
  const cls = s === "LANCADO" ? "erp-badge-green" : s === "CANCELADO" ? "erp-badge-red" : "erp-badge-amber";
  return <span className={`erp-badge ${cls}`}>{ROTULO_STATUS[s] ?? s}</span>;
}

function novoPayload(): FretePayload {
  return {
    numero: 0, serie: "1", data_emissao: hoje(), cnpj_transportadora: "", nome_transportadora: "", cfop: "",
    valor_frete: 0, base_icms: 0, aliq_icms: 0, valor_icms: 0, credita_icms: true, tipo_rateio: "VALOR",
    data_vencimento: em30dias(), notas_ids: [],
  };
}

export function FretesCompraPanel({ entradas, onFeedback, onAbrirEntrada }: {
  entradas: EntradaParaFrete[];
  onFeedback: (f: Feedback) => void;
  onAbrirEntrada: (id: number) => void;
}): JSX.Element {
  const [lista, setLista] = useState<Frete[]>([]);
  const [filtro, setFiltro] = useState("");
  const [sel, setSel] = useState<Frete | null>(null);
  const [form, setForm] = useState<FretePayload | null>(null); // edição (novo ou pendente)
  const [vencXml, setVencXml] = useState(em30dias());
  const [rateioXml, setRateioXml] = useState<TipoRateioFrete>("VALOR");
  const [notaParaLigar, setNotaParaLigar] = useState("");
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const recarregar = useCallback(async (status: string) => {
    try { setLista(await listarFretes(status)); }
    catch (e) { onFeedback({ type: "error", message: errMessage(e, "Falha ao listar os fretes.") }); }
  }, [onFeedback]);
  useEffect(() => { void recarregar(filtro); }, [recarregar, filtro]);

  const aprovadas = entradas.filter((e) => ["APPROVED", "WRITTEN_OFF"].includes((e.status || "").toUpperCase()));
  const setF = <K extends keyof FretePayload>(k: K, v: FretePayload[K]) => setForm((p) => (p ? { ...p, [k]: v } : p));

  async function abrir(id: number) {
    setBusy(true); onFeedback(null);
    try { const f = await obterFrete(id); setSel(f); setForm(f.status === "PENDENTE" ? payloadDoFrete(f) : null); setMotivo(""); }
    catch (e) { onFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function importar(arquivos: FileList | null) {
    const arq = arquivos?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!arq) return;
    setBusy(true); onFeedback(null);
    try {
      const f = await importarFreteXml(arq, { data_vencimento: vencXml, tipo_rateio: rateioXml });
      setSel(f); setForm(payloadDoFrete(f)); await recarregar(filtro);
      onFeedback({
        type: f.notas.length ? "success" : "info",
        message: f.notas.length
          ? `CT-e ${f.numero} importado e ligado a ${f.notas.length} nota(s). Confira o rateio e lance.`
          : `CT-e ${f.numero} importado, mas nenhuma das notas citadas está aprovada no sistema. Ligue as notas abaixo antes de lançar.`,
      });
    } catch (e) { onFeedback({ type: "error", message: errMessage(e, "Falha ao importar o XML do CT-e.") }); }
    finally { setBusy(false); }
  }

  function validar(p: FretePayload): string | null {
    if (!p.numero || p.numero <= 0) return "Informe o número do CT-e.";
    if (p.cnpj_transportadora.replace(/\D/g, "").length !== 14) return "CNPJ da transportadora deve ter 14 dígitos.";
    if (!p.nome_transportadora.trim()) return "Informe o nome da transportadora.";
    if (!(p.valor_frete > 0)) return "Informe o valor do frete.";
    if (p.valor_icms < 0 || p.valor_icms > p.valor_frete) return "ICMS do frete inválido.";
    if (!p.data_emissao || !p.data_vencimento) return "Informe a emissão e o vencimento.";
    if (p.notas_ids.length === 0) return "Ligue ao menos uma nota de entrada aprovada.";
    return null;
  }

  async function salvar() {
    if (!form) return;
    const erro = validar(form);
    if (erro) { onFeedback({ type: "error", message: erro }); return; }
    setBusy(true); onFeedback(null);
    try {
      const payload = { ...form, cnpj_transportadora: form.cnpj_transportadora.replace(/\D/g, ""), cfop: form.cfop || undefined };
      const f = sel ? await atualizarFrete(sel.id, payload) : await criarFrete(payload);
      setSel(f); setForm(payloadDoFrete(f)); await recarregar(filtro);
      onFeedback({ type: "success", message: `CT-e ${f.numero} gravado. Custo que vai ao estoque: ${money(f.custo_frete)}.` });
    } catch (e) { onFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function lancar() {
    if (!sel) return;
    setBusy(true); onFeedback(null);
    try {
      const f = await lancarFrete(sel.id);
      setSel(f); setForm(null); await recarregar(filtro);
      const estoque = f.alocacoes.reduce((s, a) => s + a.valor_estoque, 0);
      const despesa = f.alocacoes.reduce((s, a) => s + a.valor_despesa, 0);
      onFeedback({ type: "success", message: `Frete lançado: ${money(estoque)} no custo do estoque${despesa > 0 ? ` e ${money(despesa)} em despesa (mercadoria já consumida)` : ""}; título ${f.conta_pagar_id ? `#${f.conta_pagar_id} ` : ""}gerado para a transportadora.` });
    } catch (e) { onFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function cancelar() {
    if (!sel) return;
    if (motivo.trim().length < 10) { onFeedback({ type: "error", message: "Informe o motivo do cancelamento (pelo menos 10 caracteres)." }); return; }
    setBusy(true); onFeedback(null);
    try {
      const f = await cancelarFrete(sel.id, motivo.trim());
      setSel(f); setForm(null); setMotivo(""); await recarregar(filtro);
      onFeedback({ type: "success", message: `CT-e ${f.numero} cancelado${sel.status === "LANCADO" ? ": custo do estoque, título e contabilização estornados" : ""}.` });
    } catch (e) { onFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  function ligarNota() {
    const id = Number(notaParaLigar);
    if (!form || !id || form.notas_ids.includes(id)) return;
    setF("notas_ids", [...form.notas_ids, id]); setNotaParaLigar("");
  }

  const notaPorId = new Map(aprovadas.map((e) => [e.id, e]));
  const notasDoForm = form ? form.notas_ids.map((id) => sel?.notas.find((n) => n.fiscal_entry_id === id) ?? (notaPorId.get(id) ? {
    fiscal_entry_id: id, numero_nf: notaPorId.get(id)!.numero_nf, serie: notaPorId.get(id)!.serie,
    emitente: notaPorId.get(id)!.razao_social_emitente, valor_total: notaPorId.get(id)!.valor_total, status: notaPorId.get(id)!.status,
  } : { fiscal_entry_id: id, numero_nf: 0, serie: "", emitente: `Entrada #${id}`, valor_total: 0, status: "" })) : [];
  const editavel = form !== null && (!sel || sel.status === "PENDENTE");

  return (
    <>
      <div className="erp-fieldset">
        <div className="erp-fieldset-head">Frete sobre compras — <span style={{ fontWeight: 400, opacity: 0.65 }}>CT-e da transportadora que trouxe a mercadoria</span></div>
        <div className="erp-fieldset-body">
          <div className="erp-field erp-c3"><label className="erp-label">Vencimento do título</label>
            <input className="erp-input" type="date" value={vencXml} onChange={(e) => setVencXml(e.target.value)} /></div>
          <div className="erp-field erp-c3"><label className="erp-label">Rateio entre os itens</label>
            <select className="erp-input" value={rateioXml} onChange={(e) => setRateioXml(e.target.value as TipoRateioFrete)}>
              {Object.entries(ROTULO_RATEIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div className="erp-field erp-c6" style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
            <button className="erp-btn erp-btn-primary" onClick={() => fileRef.current?.click()} disabled={busy}>Importar XML do CT-e…</button>
            <input ref={fileRef} type="file" accept=".xml,application/xml,text/xml" hidden onChange={(e) => void importar(e.target.files)} />
            <button className="erp-btn erp-btn-new" onClick={() => { setSel(null); setForm(novoPayload()); onFeedback(null); }} disabled={busy}>+ CT-e manual</button>
          </div>
        </div>
      </div>

      {form && editavel && (
        <div className="erp-fieldset">
          <div className="erp-fieldset-head">{sel ? `CT-e ${sel.numero}/${sel.serie}` : "Novo CT-e"} {sel && statusPill(sel.status)}</div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Número</label>
              <input className="erp-input num" type="number" min={1} value={form.numero || ""} onChange={(e) => setF("numero", Number(e.target.value))} /></div>
            <div className="erp-field erp-c1"><label className="erp-label">Série</label>
              <input className="erp-input" value={form.serie} maxLength={3} onChange={(e) => setF("serie", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Emissão</label>
              <input className="erp-input" type="date" value={form.data_emissao} onChange={(e) => setF("data_emissao", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label erp-req">CNPJ da transportadora</label>
              <input className="erp-input" value={form.cnpj_transportadora} onChange={(e) => setF("cnpj_transportadora", e.target.value)} /></div>
            <div className="erp-field erp-c4"><label className="erp-label erp-req">Transportadora</label>
              <input className="erp-input" value={form.nome_transportadora} onChange={(e) => setF("nome_transportadora", e.target.value)} /></div>

            <div className="erp-field erp-c2"><label className="erp-label erp-req">Valor do frete</label>
              <input className="erp-input num" type="number" step="0.01" min="0" value={form.valor_frete || ""} onChange={(e) => setF("valor_frete", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Base do ICMS</label>
              <input className="erp-input num" type="number" step="0.01" min="0" value={form.base_icms || ""} onChange={(e) => setF("base_icms", Number(e.target.value))} /></div>
            <div className="erp-field erp-c1"><label className="erp-label">Alíq. %</label>
              <input className="erp-input num" type="number" step="0.01" min="0" value={form.aliq_icms || ""} onChange={(e) => setF("aliq_icms", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">ICMS</label>
              <input className="erp-input num" type="number" step="0.01" min="0" value={form.valor_icms || ""} onChange={(e) => setF("valor_icms", Number(e.target.value))} /></div>
            <div className="erp-field erp-c1"><label className="erp-label">CFOP</label>
              <input className="erp-input" value={form.cfop ?? ""} maxLength={4} onChange={(e) => setF("cfop", e.target.value.replace(/\D/g, ""))} /></div>
            <div className="erp-field erp-c2" style={{ alignSelf: "end" }}>
              <label title="Sem crédito, o ICMS do frete vai para o custo"><input type="checkbox" checked={form.credita_icms} onChange={(e) => setF("credita_icms", e.target.checked)} /> Credita o ICMS</label></div>
            <div className="erp-field erp-c2"><label className="erp-label">Vai ao custo</label>
              <input className="erp-input num" readOnly value={money(form.valor_frete - (form.credita_icms ? form.valor_icms : 0))} /></div>

            <div className="erp-field erp-c3"><label className="erp-label">Rateio</label>
              <select className="erp-input" value={form.tipo_rateio} onChange={(e) => setF("tipo_rateio", e.target.value as TipoRateioFrete)}>
                {Object.entries(ROTULO_RATEIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
            <div className="erp-field erp-c3"><label className="erp-label erp-req">Vencimento do título</label>
              <input className="erp-input" type="date" value={form.data_vencimento} onChange={(e) => setF("data_vencimento", e.target.value)} /></div>
            <div className="erp-field erp-c6"><label className="erp-label">Observação</label>
              <input className="erp-input" value={form.observacao ?? ""} onChange={(e) => setF("observacao", e.target.value)} /></div>

            <div className="erp-field erp-c12">
              <div className="erp-fieldset-head" style={{ marginTop: 8 }}>Notas transportadas</div>
              <table className="erp-grid">
                <thead><tr><th>NF-e</th><th>Emitente</th><th style={{ textAlign: "right" }}>Total</th><th style={{ width: 90 }}></th></tr></thead>
                <tbody>
                  {notasDoForm.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhuma nota ligada — o frete é rateado entre os itens das notas ligadas.</td></tr>}
                  {notasDoForm.map((n) => (
                    <tr key={n.fiscal_entry_id}>
                      <td><button className="erp-btn erp-btn-sm" onClick={() => onAbrirEntrada(n.fiscal_entry_id)}>{n.numero_nf ? `${n.numero_nf}/${n.serie}` : `#${n.fiscal_entry_id}`}</button></td>
                      <td>{n.emitente}</td>
                      <td style={{ textAlign: "right" }}>{money(n.valor_total)}</td>
                      <td><button className="erp-btn erp-btn-sm" onClick={() => setF("notas_ids", form.notas_ids.filter((x) => x !== n.fiscal_entry_id))}>Remover</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <select className="erp-input" value={notaParaLigar} onChange={(e) => setNotaParaLigar(e.target.value)} style={{ maxWidth: 480 }}>
                  <option value="">— ligar nota de entrada aprovada —</option>
                  {aprovadas.filter((e) => !form.notas_ids.includes(e.id)).map((e) => (
                    <option key={e.id} value={e.id}>{e.numero_nf}/{e.serie} — {e.razao_social_emitente} — {money(e.valor_total)}</option>
                  ))}
                </select>
                <button className="erp-btn" onClick={ligarNota} disabled={!notaParaLigar}>Ligar</button>
              </div>
            </div>

            <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{sel ? "Gravar alterações" : "Gravar CT-e"}</button>
              {sel && sel.status === "PENDENTE" && <button className="erp-btn erp-btn-primary" onClick={() => void lancar()} disabled={busy}
                title="Rateia, complementa o custo do estoque, gera o título e contabiliza">Lançar frete</button>}
              <button className="erp-btn" onClick={() => { setForm(null); setSel(null); }} disabled={busy}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {sel && !editavel && (
        <div className="erp-fieldset">
          <div className="erp-fieldset-head">CT-e {sel.numero}/{sel.serie} — {sel.nome_transportadora} {statusPill(sel.status)}</div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c12">
              <div className="erp-metrics">
                <div className="erp-metric"><div className="erp-metric-label">Frete</div><div className="erp-metric-value">{money(sel.valor_frete)}</div></div>
                <div className="erp-metric"><div className="erp-metric-label">ICMS {sel.credita_icms ? "creditado" : "(ao custo)"}</div><div className="erp-metric-value">{money(sel.valor_icms)}</div></div>
                <div className="erp-metric"><div className="erp-metric-label">Custo rateado</div><div className="erp-metric-value">{money(sel.custo_frete)}</div></div>
                <div className="erp-metric"><div className="erp-metric-label">Título</div><div className="erp-metric-value">{sel.conta_pagar_id ? `#${sel.conta_pagar_id}` : "—"} · vence {dataBR(sel.data_vencimento)}</div></div>
              </div>
              {sel.cancel_reason && <div className="erp-feedback info" style={{ marginTop: 8 }}>Cancelado em {dataBR(sel.cancelado_em)}: {sel.cancel_reason}</div>}
            </div>
            {sel.alocacoes.length > 0 && (
              <div className="erp-field erp-c12">
                <div className="erp-fieldset-head" style={{ marginTop: 8 }}>Rateio ({ROTULO_RATEIO[sel.tipo_rateio] ?? sel.tipo_rateio})</div>
                <table className="erp-grid">
                  <thead><tr><th>Item</th><th style={{ textAlign: "right" }}>Frete</th><th style={{ textAlign: "right" }}>No custo do estoque</th><th style={{ textAlign: "right" }}>Despesa (já consumido)</th></tr></thead>
                  <tbody>
                    {sel.alocacoes.map((a) => (
                      <tr key={a.fiscal_entry_item_id}>
                        <td>{a.item_code ? `${a.item_code} — ` : ""}{a.descricao}</td>
                        <td style={{ textAlign: "right" }}>{money(a.valor)}</td>
                        <td style={{ textAlign: "right" }}>{money(a.valor_estoque)}</td>
                        <td style={{ textAlign: "right" }}>{money(a.valor_despesa)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {sel.status !== "CANCELADO" && (
              <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8, alignItems: "flex-end", marginTop: 10 }}>
                <input className="erp-input" style={{ maxWidth: 420 }} placeholder="Motivo do cancelamento" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                <button className="erp-btn erp-btn-danger" onClick={() => void cancelar()} disabled={busy}>Cancelar CT-e</button>
              </div>
            )}
            <div className="erp-field erp-c12"><button className="erp-btn" onClick={() => setSel(null)}>Fechar</button></div>
          </div>
        </div>
      )}

      <div className="erp-fieldset">
        <div className="erp-fieldset-head">CT-e de frete — <span style={{ fontWeight: 400, opacity: 0.65 }}>{lista.length}</span></div>
        <div className="erp-fieldset-body">
          <div className="erp-field erp-c3"><label className="erp-label">Situação</label>
            <select className="erp-input" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(ROTULO_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div className="erp-field erp-c12">
            <table className="erp-grid">
              <thead><tr><th>CT-e</th><th>Transportadora</th><th>Emissão</th><th style={{ textAlign: "right" }}>Frete</th><th style={{ textAlign: "right" }}>ICMS</th><th>Notas</th><th>Situação</th><th style={{ width: 80 }}></th></tr></thead>
              <tbody>
                {lista.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhum CT-e de frete.</td></tr>}
                {lista.map((f) => (
                  <tr key={f.id} onDoubleClick={() => void abrir(f.id)}>
                    <td style={{ fontWeight: 600 }}>{f.numero}/{f.serie}</td>
                    <td>{f.nome_transportadora}</td>
                    <td>{dataBR(f.data_emissao)}</td>
                    <td style={{ textAlign: "right" }}>{money(f.valor_frete)}</td>
                    <td style={{ textAlign: "right" }}>{money(f.valor_icms)}</td>
                    <td>{f.notas.map((n) => n.numero_nf).join(", ") || "—"}</td>
                    <td>{statusPill(f.status)}</td>
                    <td><button className="erp-btn erp-btn-sm" onClick={() => void abrir(f.id)}>Abrir</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

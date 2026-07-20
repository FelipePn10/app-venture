import { useState, useCallback, useEffect } from "react";
import {
  type FiscalEntry, type CreateEntryDTO, type EntryItemDTO,
  listEntries, createEntry, importNfeByKey, approveEntry, uploadNfeXml,
} from "@/services/nfeService";
import { errMessage } from "@/services/fiscalShared";
import { validateCNPJOrCPF } from "@/utils/validation";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Mode = "list" | "manual" | "import" | "xml";

const today = () => new Date().toISOString().slice(0, 10);
const round = (n: number) => Number(n.toFixed(2));
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY_ITEM: EntryItemDTO = {
  sequence: 1, item_code: 0, ncm: "", cfop: "1101", quantity: 1, unit_price: 0, total_price: 0,
  base_icms: 0, aliq_icms: 0, valor_icms: 0, base_ipi: 0, aliq_ipi: 0, valor_ipi: 0,
  valor_pis: 0, valor_cofins: 0, cst_icms: "00", cst_ipi: "50", cst_pis: "01", cst_cofins: "01",
  gera_credito_icms: true, gera_credito_ipi: true, gera_credito_pis: true, gera_credito_cofins: true,
};

const EMPTY_FORM: CreateEntryDTO = {
  numero_nf: 0, serie: "001", modelo: "55", data_emissao: today(), data_entrada: today(),
  cnpj_emitente: "", razao_social_emitente: "", ie_emitente: "", uf_emitente: "",
  valor_produtos: 0, valor_frete: 0, valor_seguro: 0, valor_desconto: 0,
  valor_ipi: 0, valor_icms: 0, valor_pis: 0, valor_cofins: 0, valor_total: 0,
  tipo_documento: "NF-e", itens: [{ ...EMPTY_ITEM }],
};

function statusPill(status: string): JSX.Element {
  const s = status.toLowerCase();
  const cls = s.includes("aprovad") ? "erp-badge-green" : s.includes("pendente") ? "erp-badge-amber" : "erp-badge-gray";
  return <span className={`erp-badge ${cls}`}>{status || "—"}</span>;
}

export function Vfis0210Page(): JSX.Element {
  const [mode, setMode] = useState<Mode>("list");
  const [list, setList] = useState<FiscalEntry[]>([]);
  const [form, setForm] = useState<CreateEntryDTO>(EMPTY_FORM);
  const [accessKey, setAccessKey] = useState("");
  const [xmlContent, setXmlContent] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listEntries()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar NF-e de entrada.") }); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof CreateEntryDTO>(k: K, v: CreateEntryDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };

  // Recalcula todos os totais a partir do form informado (função pura, sem closure stale).
  function withTotals(b: CreateEntryDTO): CreateEntryDTO {
    const valor_produtos = round(b.itens.reduce((s, it) => s + it.total_price, 0));
    const valor_ipi = round(b.itens.reduce((s, it) => s + (it.valor_ipi ?? 0), 0));
    const valor_icms = round(b.itens.reduce((s, it) => s + (it.valor_icms ?? 0), 0));
    const valor_pis = round(b.itens.reduce((s, it) => s + (it.valor_pis ?? 0), 0));
    const valor_cofins = round(b.itens.reduce((s, it) => s + (it.valor_cofins ?? 0), 0));
    const valor_total = round(valor_produtos + valor_ipi + b.valor_frete + b.valor_seguro - b.valor_desconto);
    return { ...b, valor_produtos, valor_ipi, valor_icms, valor_pis, valor_cofins, valor_total };
  }

  function setItem(idx: number, patch: Partial<EntryItemDTO>) {
    setForm((p) => withTotals({
      ...p,
      itens: p.itens.map((it, i) => {
        if (i !== idx) return it;
        const m = { ...it, ...patch };
        m.total_price = round(m.quantity * m.unit_price);
        return m;
      }),
    }));
  }
  function addItem() { setForm((p) => withTotals({ ...p, itens: [...p.itens, { ...EMPTY_ITEM, sequence: p.itens.length + 1 }] })); }
  function removeItem(idx: number) { setForm((p) => withTotals({ ...p, itens: p.itens.filter((_, i) => i !== idx).map((it, i) => ({ ...it, sequence: i + 1 })) })); }

  function novoManual() { setForm({ ...EMPTY_FORM, itens: [{ ...EMPTY_ITEM }] }); setMode("manual"); setFeedback(null); }

  async function salvarManual() {
    if (!form.numero_nf || !form.cnpj_emitente.trim() || !form.uf_emitente.trim()) {
      setFeedback({ type: "error", message: "Número da NF, CNPJ e UF do emitente são obrigatórios." }); return;
    }
    if (!validateCNPJOrCPF(form.cnpj_emitente)) {
      setFeedback({ type: "error", message: "CNPJ/CPF do emitente inválido (dígito verificador não confere)." }); return;
    }
    setBusy(true); setFeedback(null);
    try {
      const created = await createEntry(form);
      setFeedback({ type: "success", message: `Entrada ${created?.numero_nf ?? form.numero_nf} lançada (pendente).` });
      setMode("list"); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function importar() {
    if (accessKey.trim().length !== 44) { setFeedback({ type: "error", message: "A chave de acesso deve ter exatamente 44 dígitos." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const e = await importNfeByKey(accessKey.trim());
      setFeedback({ type: "success", message: `NF-e ${e?.numero_nf ?? ""} importada e estoque movimentado.` });
      setAccessKey(""); setMode("list"); await reload();
    } catch (err) { setFeedback({ type: "error", message: errMessage(err) }); } finally { setBusy(false); }
  }

  async function enviarXml() {
    if (!xmlContent.trim()) { setFeedback({ type: "error", message: "Cole o conteúdo do XML da NF-e." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const e = await uploadNfeXml(xmlContent.trim());
      setFeedback({ type: "success", message: `NF-e ${e?.numero_nf ?? ""} importada a partir do XML.` });
      setXmlContent(""); setMode("list"); await reload();
    } catch (err) { setFeedback({ type: "error", message: errMessage(err) }); } finally { setBusy(false); }
  }

  async function aprovar(id: number) {
    setBusy(true); setFeedback(null);
    try { await approveEntry(id); setFeedback({ type: "success", message: `Entrada ${id} aprovada. Conta a pagar gerada.` }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">NF-e de Entrada</span><span className="erp-crumb-code">VFIS0210</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={novoManual} disabled={busy}>+ Lançamento manual</button>
          <button className="erp-btn" onClick={() => { setMode("import"); setFeedback(null); }} disabled={busy}>Importar por chave</button>
          <button className="erp-btn" onClick={() => { setMode("xml"); setFeedback(null); }} disabled={busy}>Importar XML</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Visão</span>
          <button className="erp-btn" onClick={() => { setMode("list"); void reload(); }} disabled={busy}>Listagem</button>
        </div>
        {mode === "manual" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Ações</span>
            <button className="erp-btn erp-btn-primary" onClick={() => void salvarManual()} disabled={busy}>{busy ? "Salvando..." : "Lançar Entrada"}</button>
          </div>
        )}
        {mode === "import" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Ações</span>
            <button className="erp-btn erp-btn-primary" onClick={() => void importar()} disabled={busy}>{busy ? "Importando..." : "Importar NF-e"}</button>
          </div>
        )}
        {mode === "xml" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Ações</span>
            <button className="erp-btn erp-btn-primary" onClick={() => void enviarXml()} disabled={busy}>{busy ? "Enviando..." : "Enviar XML"}</button>
          </div>
        )}
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0210 — NF-e de Entrada" filename="vfis0210" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">NF-e de Entrada</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        {mode === "list" && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Entradas   — <span style={{fontWeight:400,opacity:0.65}}>{list.length} NF-e</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead><tr><th>#</th><th>Emitente</th><th>Status</th><th>Total</th><th>Entrada</th><th style={{ width: 120 }}>Ações</th></tr></thead>
                  <tbody>
                    {list.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhuma NF-e de entrada.</td></tr>}
                    {list.map((nf) => (
                      <tr key={nf.id}>
                        <td style={{ fontWeight: 600 }}>{nf.numero_nf}</td>
                        <td>{nf.razao_social_emitente}<br /><small style={{ color: "#8aa894" }}>{nf.cnpj_emitente}</small></td>
                        <td>{statusPill(nf.status)}</td>
                        <td>{money(nf.valor_total)}</td>
                        <td>{nf.data_entrada?.slice(0, 10) || "—"}</td>
                        <td>{nf.status.toLowerCase().includes("pendente") && <button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => void aprovar(nf.id)}>Aprovar</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          </>
        )}

        {mode === "import" && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Importar por chave   — <span style={{fontWeight:400,opacity:0.65}}>Consulta a Focus NF-e, baixa o XML e movimenta o estoque</span></div><div className="erp-fieldset-body">
                
                  <div className="erp-field erp-c12">
                    <label className="erp-label erp-req">Chave de Acesso (44 dígitos)</label>
                    <input className="erp-input" value={accessKey} maxLength={44}
                      placeholder="35260512345678000100550010000012341123456789"
                      onChange={(e) => setAccessKey(e.target.value.replace(/\D/g, ""))} />
                    <span className="erp-field-hint">{accessKey.length}/44 dígitos. Requer token Focus NF-e configurado em VFIS0100.</span>
                  </div>
                
              </div>
            </div>
          </>
        )}

        {mode === "xml" && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Importar XML   — <span style={{fontWeight:400,opacity:0.65}}>Cole o XML (nfeProc) recebido da SEFAZ — os campos são extraídos automaticamente</span></div><div className="erp-fieldset-body">
                
                  <div className="erp-field erp-c12">
                    <label className="erp-label erp-req">Conteúdo do XML</label>
                    <textarea className="erp-textarea" rows={12} value={xmlContent}
                      placeholder={'<?xml version="1.0" encoding="UTF-8"?><nfeProc>...</nfeProc>'}
                      onChange={(e) => { setXmlContent(e.target.value); setFeedback(null); }} />
                    <span className="erp-field-hint">{xmlContent.length} caracteres.</span>
                  </div>
                
              </div>
            </div>
          </>
        )}

        {mode === "manual" && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Cabeçalho   — <span style={{fontWeight:400,opacity:0.65}}>Impostos informados pelo emitente</span></div><div className="erp-fieldset-body">
                
                  <div className="erp-field erp-c2"><label className="erp-label erp-req">Número NF</label>
                    <input className="erp-input num" type="number" value={form.numero_nf || ""} onChange={(e) => setF("numero_nf", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c1"><label className="erp-label">Série</label>
                    <input className="erp-input" value={form.serie} onChange={(e) => setF("serie", e.target.value)} /></div>
                  <div className="erp-field erp-c1"><label className="erp-label">Modelo</label>
                    <input className="erp-input" value={form.modelo} onChange={(e) => setF("modelo", e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Emissão</label>
                    <input className="erp-input" type="date" value={form.data_emissao} onChange={(e) => setF("data_emissao", e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Entrada</label>
                    <input className="erp-input" type="date" value={form.data_entrada} onChange={(e) => setF("data_entrada", e.target.value)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Tipo Doc.</label>
                    <input className="erp-input" value={form.tipo_documento} onChange={(e) => setF("tipo_documento", e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label erp-req">CNPJ Emitente</label>
                    <input className="erp-input" value={form.cnpj_emitente} onChange={(e) => setF("cnpj_emitente", e.target.value)} />
                    {form.cnpj_emitente.trim() && (
                      <span className="erp-field-hint" style={{ color: validateCNPJOrCPF(form.cnpj_emitente) ? "#1e6030" : "#b91c1c" }}>
                        {validateCNPJOrCPF(form.cnpj_emitente) ? "✓ válido" : "✗ inválido"}
                      </span>
                    )}</div>
                  <div className="erp-field erp-c5"><label className="erp-label">Razão Social Emitente</label>
                    <input className="erp-input" value={form.razao_social_emitente} onChange={(e) => setF("razao_social_emitente", e.target.value)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">IE Emitente</label>
                    <input className="erp-input" value={form.ie_emitente ?? ""} onChange={(e) => setF("ie_emitente", e.target.value)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label erp-req">UF Emitente</label>
                    <input className="erp-input" maxLength={2} value={form.uf_emitente} onChange={(e) => setF("uf_emitente", e.target.value.toUpperCase())} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Frete</label>
                    <input className="erp-input num" type="number" step="0.01" value={form.valor_frete}
                      onChange={(e) => setForm((p) => withTotals({ ...p, valor_frete: Number(e.target.value) }))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Seguro</label>
                    <input className="erp-input num" type="number" step="0.01" value={form.valor_seguro}
                      onChange={(e) => setForm((p) => withTotals({ ...p, valor_seguro: Number(e.target.value) }))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Desconto</label>
                    <input className="erp-input num" type="number" step="0.01" value={form.valor_desconto}
                      onChange={(e) => setForm((p) => withTotals({ ...p, valor_desconto: Number(e.target.value) }))} /></div>
                
              </div>
            </div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Itens   — <span style={{fontWeight:400,opacity:0.65}}>Total NF: R$ {money(form.valor_total)}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead><tr><th>Seq</th><th>Item</th><th>NCM</th><th>CFOP</th><th>Qtd</th><th>Unit.</th>
                    <th>Total</th><th>ICMS</th><th>IPI</th><th style={{ width: 50 }}></th></tr></thead>
                  <tbody>
                    {form.itens.map((it, idx) => (
                      <tr key={idx}>
                        <td>{it.sequence}</td>
                        <td><input className="erp-input" style={{ height: 30, width: 70 }} type="number" value={it.item_code || ""} onChange={(e) => setItem(idx, { item_code: Number(e.target.value) })} /></td>
                        <td><input className="erp-input" style={{ height: 30, width: 100 }} value={it.ncm} onChange={(e) => setItem(idx, { ncm: e.target.value })} /></td>
                        <td><input className="erp-input" style={{ height: 30, width: 70 }} value={it.cfop} onChange={(e) => setItem(idx, { cfop: e.target.value })} /></td>
                        <td><input className="erp-input num" style={{ height: 30, width: 60 }} type="number" value={it.quantity} onChange={(e) => setItem(idx, { quantity: Number(e.target.value) })} /></td>
                        <td><input className="erp-input num" style={{ height: 30, width: 80 }} type="number" step="0.01" value={it.unit_price} onChange={(e) => setItem(idx, { unit_price: Number(e.target.value) })} /></td>
                        <td>{money(it.total_price)}</td>
                        <td><input className="erp-input num" style={{ height: 30, width: 70 }} type="number" step="0.01" value={it.valor_icms} onChange={(e) => setItem(idx, { valor_icms: Number(e.target.value) })} /></td>
                        <td><input className="erp-input num" style={{ height: 30, width: 70 }} type="number" step="0.01" value={it.valor_ipi} onChange={(e) => setItem(idx, { valor_ipi: Number(e.target.value) })} /></td>
                        <td><button className="erp-btn erp-btn-sm erp-btn erp-btn-danger erp-btn-sm" onClick={() => removeItem(idx)} disabled={form.itens.length === 1}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="erp-fieldset-body" style={{ paddingTop: 12 }}>
                <button className="erp-btn" onClick={addItem}>+ Adicionar item</button>
              </div>
            </div>
            </div>
          </>
        )}
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}>
          <div className="erp-status-item">Entradas: <strong>{list.length}</strong></div>
          <div className="erp-status-item">Pendentes: <strong>{list.filter((n) => n.status.toLowerCase().includes("pendente")).length}</strong></div>
        </div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

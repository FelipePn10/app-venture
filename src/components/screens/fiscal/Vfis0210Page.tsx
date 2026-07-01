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
  const cls = s.includes("aprovad") ? "fsc-pill-green" : s.includes("pendente") ? "fsc-pill-amber" : "fsc-pill-gray";
  return <span className={`fsc-pill ${cls}`}>{status || "—"}</span>;
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
    <div className="fsc-root">
      <header className="fsc-topbar">
        <div className="fsc-topbar-left">
          <div className="fsc-logo">
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
              <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
              <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
              <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
              <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
            </svg>
          </div>
          <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
          <span className="fsc-screen-title">VFIS0210 — NF-e de Entrada</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={novoManual} disabled={busy}>+ Lançamento manual</button>
          <button className="fsc-btn fsc-btn-ghost" onClick={() => { setMode("import"); setFeedback(null); }} disabled={busy}>Importar por chave</button>
          <button className="fsc-btn fsc-btn-ghost" onClick={() => { setMode("xml"); setFeedback(null); }} disabled={busy}>Importar XML</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Visão</span>
          <button className="fsc-btn fsc-btn-ghost" onClick={() => { setMode("list"); void reload(); }} disabled={busy}>Listagem</button>
        </div>
        {mode === "manual" && (
          <div className="fsc-action-group">
            <span className="fsc-action-label">Ações</span>
            <button className="fsc-btn fsc-btn-primary" onClick={() => void salvarManual()} disabled={busy}>{busy ? "Salvando..." : "Lançar Entrada"}</button>
          </div>
        )}
        {mode === "import" && (
          <div className="fsc-action-group">
            <span className="fsc-action-label">Ações</span>
            <button className="fsc-btn fsc-btn-primary" onClick={() => void importar()} disabled={busy}>{busy ? "Importando..." : "Importar NF-e"}</button>
          </div>
        )}
        {mode === "xml" && (
          <div className="fsc-action-group">
            <span className="fsc-action-label">Ações</span>
            <button className="fsc-btn fsc-btn-primary" onClick={() => void enviarXml()} disabled={busy}>{busy ? "Enviando..." : "Enviar XML"}</button>
          </div>
        )}
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VFIS0210 — NF-e de Entrada" filename="vfis0210" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        {mode === "list" && (
          <>
            <div className="fsc-section-banner">
              <span className="fsc-section-banner-pill">Entradas</span>
              <div className="fsc-section-banner-line" />
              <span className="fsc-section-banner-hint">{list.length} NF-e</span>
            </div>
            <div className="fsc-card">
              <div className="fsc-results-wrap">
                <table className="fsc-table">
                  <thead><tr><th>#</th><th>Emitente</th><th>Status</th><th className="fsc-num">Total</th><th>Entrada</th><th style={{ width: 120 }}>Ações</th></tr></thead>
                  <tbody>
                    {list.length === 0 && <tr><td colSpan={6} className="fsc-empty">Nenhuma NF-e de entrada.</td></tr>}
                    {list.map((nf) => (
                      <tr key={nf.id}>
                        <td style={{ fontWeight: 600 }}>{nf.numero_nf}</td>
                        <td>{nf.razao_social_emitente}<br /><small style={{ color: "#8aa894" }}>{nf.cnpj_emitente}</small></td>
                        <td>{statusPill(nf.status)}</td>
                        <td className="fsc-num">{money(nf.valor_total)}</td>
                        <td>{nf.data_entrada?.slice(0, 10) || "—"}</td>
                        <td>{nf.status.toLowerCase().includes("pendente") && <button className="fsc-action-btn fsc-edit-btn" onClick={() => void aprovar(nf.id)}>Aprovar</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {mode === "import" && (
          <>
            <div className="fsc-section-banner">
              <span className="fsc-section-banner-pill">Importar por chave</span>
              <div className="fsc-section-banner-line" />
              <span className="fsc-section-banner-hint">Consulta a Focus NF-e, baixa o XML e movimenta o estoque</span>
            </div>
            <div className="fsc-card">
              <div className="fsc-card-body">
                <div className="fsc-grid">
                  <div className="fsc-field fsc-col-12">
                    <label className="fsc-label fsc-label-req">Chave de Acesso (44 dígitos)</label>
                    <input className="fsc-input" value={accessKey} maxLength={44}
                      placeholder="35260512345678000100550010000012341123456789"
                      onChange={(e) => setAccessKey(e.target.value.replace(/\D/g, ""))} />
                    <span className="fsc-field-hint">{accessKey.length}/44 dígitos. Requer token Focus NF-e configurado em VFIS0100.</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {mode === "xml" && (
          <>
            <div className="fsc-section-banner">
              <span className="fsc-section-banner-pill">Importar XML</span>
              <div className="fsc-section-banner-line" />
              <span className="fsc-section-banner-hint">Cole o XML (nfeProc) recebido da SEFAZ — os campos são extraídos automaticamente</span>
            </div>
            <div className="fsc-card">
              <div className="fsc-card-body">
                <div className="fsc-grid">
                  <div className="fsc-field fsc-col-12">
                    <label className="fsc-label fsc-label-req">Conteúdo do XML</label>
                    <textarea className="fsc-textarea" rows={12} value={xmlContent}
                      placeholder={'<?xml version="1.0" encoding="UTF-8"?><nfeProc>...</nfeProc>'}
                      onChange={(e) => { setXmlContent(e.target.value); setFeedback(null); }} />
                    <span className="fsc-field-hint">{xmlContent.length} caracteres.</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {mode === "manual" && (
          <>
            <div className="fsc-section-banner">
              <span className="fsc-section-banner-pill">Cabeçalho</span>
              <div className="fsc-section-banner-line" />
              <span className="fsc-section-banner-hint">Impostos informados pelo emitente</span>
            </div>
            <div className="fsc-card">
              <div className="fsc-card-body">
                <div className="fsc-grid">
                  <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Número NF</label>
                    <input className="fsc-input fsc-input-right" type="number" value={form.numero_nf || ""} onChange={(e) => setF("numero_nf", Number(e.target.value))} /></div>
                  <div className="fsc-field fsc-col-1"><label className="fsc-label">Série</label>
                    <input className="fsc-input" value={form.serie} onChange={(e) => setF("serie", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-1"><label className="fsc-label">Modelo</label>
                    <input className="fsc-input" value={form.modelo} onChange={(e) => setF("modelo", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Emissão</label>
                    <input className="fsc-input" type="date" value={form.data_emissao} onChange={(e) => setF("data_emissao", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Entrada</label>
                    <input className="fsc-input" type="date" value={form.data_entrada} onChange={(e) => setF("data_entrada", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Tipo Doc.</label>
                    <input className="fsc-input" value={form.tipo_documento} onChange={(e) => setF("tipo_documento", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">CNPJ Emitente</label>
                    <input className="fsc-input" value={form.cnpj_emitente} onChange={(e) => setF("cnpj_emitente", e.target.value)} />
                    {form.cnpj_emitente.trim() && (
                      <span className="fsc-field-hint" style={{ color: validateCNPJOrCPF(form.cnpj_emitente) ? "#1e6030" : "#b91c1c" }}>
                        {validateCNPJOrCPF(form.cnpj_emitente) ? "✓ válido" : "✗ inválido"}
                      </span>
                    )}</div>
                  <div className="fsc-field fsc-col-5"><label className="fsc-label">Razão Social Emitente</label>
                    <input className="fsc-input" value={form.razao_social_emitente} onChange={(e) => setF("razao_social_emitente", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">IE Emitente</label>
                    <input className="fsc-input" value={form.ie_emitente ?? ""} onChange={(e) => setF("ie_emitente", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">UF Emitente</label>
                    <input className="fsc-input" maxLength={2} value={form.uf_emitente} onChange={(e) => setF("uf_emitente", e.target.value.toUpperCase())} /></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Frete</label>
                    <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.valor_frete}
                      onChange={(e) => setForm((p) => withTotals({ ...p, valor_frete: Number(e.target.value) }))} /></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Seguro</label>
                    <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.valor_seguro}
                      onChange={(e) => setForm((p) => withTotals({ ...p, valor_seguro: Number(e.target.value) }))} /></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Desconto</label>
                    <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.valor_desconto}
                      onChange={(e) => setForm((p) => withTotals({ ...p, valor_desconto: Number(e.target.value) }))} /></div>
                </div>
              </div>
            </div>

            <div className="fsc-section-banner">
              <span className="fsc-section-banner-pill">Itens</span>
              <div className="fsc-section-banner-line" />
              <span className="fsc-section-banner-hint">Total NF: R$ {money(form.valor_total)}</span>
            </div>
            <div className="fsc-card">
              <div className="fsc-results-wrap">
                <table className="fsc-table">
                  <thead><tr><th>Seq</th><th>Item</th><th>NCM</th><th>CFOP</th><th className="fsc-num">Qtd</th><th className="fsc-num">Unit.</th>
                    <th className="fsc-num">Total</th><th className="fsc-num">ICMS</th><th className="fsc-num">IPI</th><th style={{ width: 50 }}></th></tr></thead>
                  <tbody>
                    {form.itens.map((it, idx) => (
                      <tr key={idx}>
                        <td>{it.sequence}</td>
                        <td><input className="fsc-input" style={{ height: 30, width: 70 }} type="number" value={it.item_code || ""} onChange={(e) => setItem(idx, { item_code: Number(e.target.value) })} /></td>
                        <td><input className="fsc-input" style={{ height: 30, width: 100 }} value={it.ncm} onChange={(e) => setItem(idx, { ncm: e.target.value })} /></td>
                        <td><input className="fsc-input" style={{ height: 30, width: 70 }} value={it.cfop} onChange={(e) => setItem(idx, { cfop: e.target.value })} /></td>
                        <td><input className="fsc-input fsc-input-right" style={{ height: 30, width: 60 }} type="number" value={it.quantity} onChange={(e) => setItem(idx, { quantity: Number(e.target.value) })} /></td>
                        <td><input className="fsc-input fsc-input-right" style={{ height: 30, width: 80 }} type="number" step="0.01" value={it.unit_price} onChange={(e) => setItem(idx, { unit_price: Number(e.target.value) })} /></td>
                        <td className="fsc-num">{money(it.total_price)}</td>
                        <td><input className="fsc-input fsc-input-right" style={{ height: 30, width: 70 }} type="number" step="0.01" value={it.valor_icms} onChange={(e) => setItem(idx, { valor_icms: Number(e.target.value) })} /></td>
                        <td><input className="fsc-input fsc-input-right" style={{ height: 30, width: 70 }} type="number" step="0.01" value={it.valor_ipi} onChange={(e) => setItem(idx, { valor_ipi: Number(e.target.value) })} /></td>
                        <td><button className="fsc-action-btn fsc-delete-btn" onClick={() => removeItem(idx)} disabled={form.itens.length === 1}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="fsc-card-body" style={{ paddingTop: 12 }}>
                <button className="fsc-btn fsc-btn-ghost" onClick={addItem}>+ Adicionar item</button>
              </div>
            </div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left">
          <div className="fsc-footer-stat">Entradas: <strong>{list.length}</strong></div>
          <div className="fsc-footer-stat">Pendentes: <strong>{list.filter((n) => n.status.toLowerCase().includes("pendente")).length}</strong></div>
        </div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}

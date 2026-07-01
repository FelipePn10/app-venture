import { useState, useCallback, useEffect } from "react";
import {
  type FiscalExit, type CreateExitDTO, type ExitItemDTO, type TipoPessoa,
  listExits, createExit, authorizeExit, cancelExit, cartaCorrecaoExit, getExitStatus, listCartasCorrecao,
} from "@/services/nfeService";
import { errMessage, type Obj, parseStr, parseNum } from "@/services/fiscalShared";
import { validateCNPJOrCPF } from "@/utils/validation";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Mode = "list" | "create";

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_ITEM: ExitItemDTO = {
  sequence: 1, item_code: 0, ncm: "", cfop: "", quantidade: 1,
  unit_price: 0, total_price: 0, origem_mercadoria: "0", description: "",
};

const EMPTY_FORM: CreateExitDTO = {
  numero_nf: 0, serie: "001", data_emissao: today(), data_saida: today(),
  cnpj_destinatario: "", razao_social_destinatario: "", ie_destinatario: "",
  uf_destinatario: "", tipo_pessoa: "J", cfop: "6101", natureza_operacao: "Venda de mercadoria",
  valor_produtos: 0, valor_frete: 0, valor_seguro: 0, valor_desconto: 0,
  itens: [{ ...EMPTY_ITEM }],
};

const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function statusPill(status: string): JSX.Element {
  const s = status.toLowerCase();
  const cls = s.includes("autoriz") ? "fsc-pill-green"
    : s.includes("cancel") ? "fsc-pill-red"
    : s.includes("rejeit") || s.includes("erro") ? "fsc-pill-amber"
    : s.includes("process") ? "fsc-pill-blue" : "fsc-pill-gray";
  return <span className={`fsc-pill ${cls}`}>{status || "—"}</span>;
}

export function Vfis0200Page(): JSX.Element {
  const [mode, setMode] = useState<Mode>("list");
  const [list, setList] = useState<FiscalExit[]>([]);
  const [form, setForm] = useState<CreateExitDTO>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<FiscalExit | null>(null);
  const [cceView, setCceView] = useState<{ id: number; list: Obj[] } | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listExits()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar NF-e de saída.") }); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  function novo() { setForm({ ...EMPTY_FORM, itens: [{ ...EMPTY_ITEM }] }); setMode("create"); setFeedback(null); }

  const setF = <K extends keyof CreateExitDTO>(k: K, v: CreateExitDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };

  function setItem(idx: number, patch: Partial<ExitItemDTO>) {
    setForm((p) => {
      const itens = p.itens.map((it, i) => {
        if (i !== idx) return it;
        const merged = { ...it, ...patch };
        merged.total_price = Number((merged.quantidade * merged.unit_price).toFixed(2));
        return merged;
      });
      const valor_produtos = Number(itens.reduce((s, it) => s + it.total_price, 0).toFixed(2));
      return { ...p, itens, valor_produtos };
    });
  }
  function addItem() { setForm((p) => ({ ...p, itens: [...p.itens, { ...EMPTY_ITEM, sequence: p.itens.length + 1 }] })); }
  function removeItem(idx: number) {
    setForm((p) => {
      const itens = p.itens.filter((_, i) => i !== idx).map((it, i) => ({ ...it, sequence: i + 1 }));
      const valor_produtos = Number(itens.reduce((s, it) => s + it.total_price, 0).toFixed(2));
      return { ...p, itens, valor_produtos };
    });
  }

  async function salvar() {
    if (!form.numero_nf || !form.cnpj_destinatario.trim() || !form.uf_destinatario.trim()) {
      setFeedback({ type: "error", message: "Número da NF, CNPJ e UF do destinatário são obrigatórios." }); return;
    }
    if (!validateCNPJOrCPF(form.cnpj_destinatario)) {
      setFeedback({ type: "error", message: "CNPJ/CPF do destinatário inválido (dígito verificador não confere)." }); return;
    }
    if (form.itens.length === 0 || form.itens.some((i) => !i.ncm.trim() || !i.cfop.trim())) {
      setFeedback({ type: "error", message: "Cada item precisa de NCM e CFOP." }); return;
    }
    setBusy(true); setFeedback(null);
    try {
      const created = await createExit(form);
      setLastCreated(created);
      setFeedback({
        type: "success",
        message: `NF-e ${created?.numero_nf ?? form.numero_nf} criada em rascunho. `
          + `Impostos calculados — ICMS R$ ${money(created?.valor_icms)} • IPI R$ ${money(created?.valor_ipi)} `
          + `• PIS R$ ${money(created?.valor_pis)} • COFINS R$ ${money(created?.valor_cofins)} • Total R$ ${money(created?.valor_total)}.`,
      });
      setMode("list");
      await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function verCces(id: number) {
    setBusy(true); setFeedback(null);
    try { setCceView({ id, list: await listCartasCorrecao(id) }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function autorizar(code: number) {
    setBusy(true); setFeedback(null);
    try { await authorizeExit(code); setFeedback({ type: "success", message: `NF-e ${code} enviada para autorização.` }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function cancelar(code: number) {
    const j = window.prompt("Justificativa do cancelamento (mín. 15 caracteres):");
    if (j === null) return;
    if (j.trim().length < 15) { setFeedback({ type: "error", message: "A justificativa deve ter no mínimo 15 caracteres." }); return; }
    setBusy(true); setFeedback(null);
    try { await cancelExit(code, j.trim()); setFeedback({ type: "success", message: `NF-e ${code} cancelada.` }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function cce(code: number) {
    const t = window.prompt("Texto da Carta de Correção (mín. 15 caracteres):");
    if (t === null) return;
    if (t.trim().length < 15) { setFeedback({ type: "error", message: "O texto deve ter no mínimo 15 caracteres." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await cartaCorrecaoExit(code, t.trim());
      setFeedback({ type: "success", message: `CC-e emitida para NF-e ${code}.` });
      if (cceView?.id === code) setCceView({ id: code, list: await listCartasCorrecao(code) });
    }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function consultarStatus(id: number) {
    setBusy(true); setFeedback(null);
    try {
      const st = await getExitStatus(id) as { status?: string };
      setFeedback({ type: "info", message: `Status SEFAZ da NF-e ${id}: ${st?.status ?? "desconhecido"}.` });
      await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
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
          <span className="fsc-screen-title">VFIS0200 — NF-e de Saída</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={novo} disabled={busy}>+ Nova NF-e</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Visão</span>
          <button className="fsc-btn fsc-btn-ghost" onClick={() => { setMode("list"); void reload(); }} disabled={busy}>Listagem</button>
        </div>
        {mode === "create" && (
          <div className="fsc-action-group">
            <span className="fsc-action-label">Ações</span>
            <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>
              {busy ? <><div className="fsc-spinner" />Salvando...</> : "Criar Rascunho"}
            </button>
          </div>
        )}
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VFIS0200 — NF-e de Saída" filename="vfis0200" />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        {mode === "list" && (
          <>
            {lastCreated && (
              <div className="fsc-metrics">
                <div className="fsc-metric"><div className="fsc-metric-label">Última NF-e ({lastCreated.numero_nf})</div><div className="fsc-metric-value">{money(lastCreated.valor_total)}</div></div>
                <div className="fsc-metric"><div className="fsc-metric-label">ICMS</div><div className="fsc-metric-value">{money(lastCreated.valor_icms)}</div></div>
                <div className="fsc-metric"><div className="fsc-metric-label">IPI</div><div className="fsc-metric-value">{money(lastCreated.valor_ipi)}</div></div>
                <div className="fsc-metric"><div className="fsc-metric-label">PIS</div><div className="fsc-metric-value">{money(lastCreated.valor_pis)}</div></div>
                <div className="fsc-metric"><div className="fsc-metric-label">COFINS</div><div className="fsc-metric-value">{money(lastCreated.valor_cofins)}</div></div>
              </div>
            )}
            {cceView && (
              <div className="fsc-card" style={{ marginBottom: 12 }}>
                <div className="fsc-card-header">
                  <div className="fsc-card-header-left"><span className="fsc-card-title">CC-e da NF-e {cceView.id}</span></div>
                  <button className="fsc-btn fsc-btn-ghost" onClick={() => setCceView(null)}>Fechar</button>
                </div>
                <div className="fsc-results-wrap">
                  <table className="fsc-table">
                    <thead><tr><th style={{ width: 50 }}>Seq</th><th>Texto da correção</th><th>Status</th><th>Data</th></tr></thead>
                    <tbody>
                      {cceView.list.length === 0 && <tr><td colSpan={4} className="fsc-empty">Nenhuma CC-e emitida para esta NF-e.</td></tr>}
                      {cceView.list.map((c, i) => (
                        <tr key={i}>
                          <td>{parseNum(c, "numero_seq", "NumeroSeq") ?? i + 1}</td>
                          <td>{parseStr(c, "texto_correcao", "TextoCorrecao")}</td>
                          <td>{statusPill(parseStr(c, "status", "Status"))}</td>
                          <td>{(parseStr(c, "created_at", "CreatedAt") || "").slice(0, 10) || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="fsc-section-banner">
              <span className="fsc-section-banner-pill">Notas Fiscais</span>
              <div className="fsc-section-banner-line" />
              <span className="fsc-section-banner-hint">{list.length} NF-e</span>
            </div>
            <div className="fsc-card">
              <div className="fsc-results-wrap">
                <table className="fsc-table">
                  <thead>
                    <tr><th>#</th><th>Série</th><th>Destinatário</th><th>Status</th><th className="fsc-num">Total</th><th>Emissão</th><th style={{ width: 280 }}>Ações</th></tr>
                  </thead>
                  <tbody>
                    {list.length === 0 && <tr><td colSpan={7} className="fsc-empty">Nenhuma NF-e de saída.</td></tr>}
                    {list.map((nf) => {
                      const s = nf.status.toLowerCase();
                      const isDraft = s.includes("rascunho");
                      const isAuth = s.includes("autoriz");
                      return (
                        <tr key={nf.id}>
                          <td style={{ fontWeight: 600 }}>{nf.numero_nf}</td>
                          <td>{nf.serie}</td>
                          <td>{nf.razao_social_destinatario}<br /><small style={{ color: "#8aa894" }}>{nf.cnpj_destinatario}</small></td>
                          <td>{statusPill(nf.status)}</td>
                          <td className="fsc-num">{money(nf.valor_total)}</td>
                          <td>{nf.data_emissao?.slice(0, 10) || "—"}</td>
                          <td>
                            {isDraft && <button className="fsc-action-btn fsc-edit-btn" onClick={() => void autorizar(nf.id)}>Autorizar</button>}
                            {isAuth && <button className="fsc-action-btn fsc-edit-btn" onClick={() => void cce(nf.id)}>Nova CC-e</button>}
                            {isAuth && <button className="fsc-action-btn fsc-edit-btn" onClick={() => void verCces(nf.id)}>Ver CC-e</button>}
                            {isAuth && <button className="fsc-action-btn fsc-delete-btn" onClick={() => void cancelar(nf.id)}>Cancelar</button>}
                            <button className="fsc-action-btn fsc-edit-btn" onClick={() => void consultarStatus(nf.id)}>Status</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {mode === "create" && (
          <>
            <div className="fsc-section-banner">
              <span className="fsc-section-banner-pill">Cabeçalho</span>
              <div className="fsc-section-banner-line" />
              <span className="fsc-section-banner-hint">Os impostos são calculados ao criar</span>
            </div>
            <div className="fsc-card">
              <div className="fsc-card-body">
                <div className="fsc-grid">
                  <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Número NF</label>
                    <input className="fsc-input fsc-input-right" type="number" value={form.numero_nf || ""} onChange={(e) => setF("numero_nf", Number(e.target.value))} /></div>
                  <div className="fsc-field fsc-col-1"><label className="fsc-label fsc-label-req">Série</label>
                    <input className="fsc-input" value={form.serie} onChange={(e) => setF("serie", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">CFOP</label>
                    <input className="fsc-input" value={form.cfop} onChange={(e) => setF("cfop", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Emissão</label>
                    <input className="fsc-input" type="date" value={form.data_emissao} onChange={(e) => setF("data_emissao", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label">Saída</label>
                    <input className="fsc-input" type="date" value={form.data_saida} onChange={(e) => setF("data_saida", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-1"><label className="fsc-label">Pessoa</label>
                    <select className="fsc-select" value={form.tipo_pessoa} onChange={(e) => setF("tipo_pessoa", e.target.value as TipoPessoa)}>
                      <option value="J">J</option><option value="F">F</option></select></div>
                  <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">CNPJ/CPF Destinatário</label>
                    <input className="fsc-input" value={form.cnpj_destinatario} onChange={(e) => setF("cnpj_destinatario", e.target.value)} />
                    {form.cnpj_destinatario.trim() && (
                      <span className="fsc-field-hint" style={{ color: validateCNPJOrCPF(form.cnpj_destinatario) ? "#1e6030" : "#b91c1c" }}>
                        {validateCNPJOrCPF(form.cnpj_destinatario) ? "✓ válido" : "✗ inválido"}
                      </span>
                    )}</div>
                  <div className="fsc-field fsc-col-5"><label className="fsc-label">Razão Social Destinatário</label>
                    <input className="fsc-input" value={form.razao_social_destinatario} onChange={(e) => setF("razao_social_destinatario", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">IE Destinatário</label>
                    <input className="fsc-input" value={form.ie_destinatario ?? ""} placeholder="ISENTO se não-contrib." onChange={(e) => setF("ie_destinatario", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">UF Destino</label>
                    <input className="fsc-input" maxLength={2} value={form.uf_destinatario} onChange={(e) => setF("uf_destinatario", e.target.value.toUpperCase())} /></div>
                  <div className="fsc-field fsc-col-6"><label className="fsc-label">Natureza da Operação</label>
                    <input className="fsc-input" value={form.natureza_operacao} onChange={(e) => setF("natureza_operacao", e.target.value)} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Frete</label>
                    <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.valor_frete} onChange={(e) => setF("valor_frete", Number(e.target.value))} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Seguro</label>
                    <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.valor_seguro} onChange={(e) => setF("valor_seguro", Number(e.target.value))} /></div>
                  <div className="fsc-field fsc-col-2"><label className="fsc-label">Desconto</label>
                    <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.valor_desconto} onChange={(e) => setF("valor_desconto", Number(e.target.value))} /></div>
                </div>
              </div>
            </div>

            <div className="fsc-section-banner">
              <span className="fsc-section-banner-pill">Itens</span>
              <div className="fsc-section-banner-line" />
              <span className="fsc-section-banner-hint">Produtos: R$ {money(form.valor_produtos)}</span>
            </div>
            <div className="fsc-card">
              <div className="fsc-results-wrap">
                <table className="fsc-table">
                  <thead>
                    <tr><th style={{ width: 40 }}>Seq</th><th>Cód. Item</th><th>NCM</th><th>CFOP</th><th>Origem</th><th>Descrição</th>
                      <th className="fsc-num">Qtd</th><th className="fsc-num">Unit.</th><th className="fsc-num">Total</th><th style={{ width: 60 }}></th></tr>
                  </thead>
                  <tbody>
                    {form.itens.map((it, idx) => (
                      <tr key={idx}>
                        <td>{it.sequence}</td>
                        <td><input className="fsc-input" style={{ height: 30, width: 80 }} type="number" value={it.item_code || ""} onChange={(e) => setItem(idx, { item_code: Number(e.target.value) })} /></td>
                        <td><input className="fsc-input" style={{ height: 30, width: 100 }} value={it.ncm} onChange={(e) => setItem(idx, { ncm: e.target.value })} /></td>
                        <td><input className="fsc-input" style={{ height: 30, width: 70 }} value={it.cfop} onChange={(e) => setItem(idx, { cfop: e.target.value })} /></td>
                        <td><input className="fsc-input" style={{ height: 30, width: 50 }} value={it.origem_mercadoria} onChange={(e) => setItem(idx, { origem_mercadoria: e.target.value })} /></td>
                        <td><input className="fsc-input" style={{ height: 30, minWidth: 140 }} value={it.description} onChange={(e) => setItem(idx, { description: e.target.value })} /></td>
                        <td><input className="fsc-input fsc-input-right" style={{ height: 30, width: 70 }} type="number" value={it.quantidade} onChange={(e) => setItem(idx, { quantidade: Number(e.target.value) })} /></td>
                        <td><input className="fsc-input fsc-input-right" style={{ height: 30, width: 90 }} type="number" step="0.01" value={it.unit_price} onChange={(e) => setItem(idx, { unit_price: Number(e.target.value) })} /></td>
                        <td className="fsc-num">{money(it.total_price)}</td>
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
          <div className="fsc-footer-stat">NF-e: <strong>{list.length}</strong></div>
          <div className="fsc-footer-stat">Autorizadas: <strong>{list.filter((n) => n.status.toLowerCase().includes("autoriz")).length}</strong></div>
        </div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}

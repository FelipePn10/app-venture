import { useState, useCallback, useEffect } from "react";
import {
  type FiscalExit, type CreateExitDTO, type ExitItemDTO, type TipoPessoa, type PreviaNFe,
  listExits, createExit, authorizeExit, cancelExit, cartaCorrecaoExit, getExitStatus, listCartasCorrecao,
  previewExit,
} from "@/services/nfeService";
import { errMessage, type Obj, parseStr, parseNum } from "@/services/fiscalShared";
import { validateCNPJOrCPF } from "@/utils/validation";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Mode = "list" | "create";

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_ITEM: ExitItemDTO = {
  sequence: 1, item_code: "", ncm: "", cfop: "", quantidade: 1,
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

/**
 * Situação da nota. O backend responde o enum em inglês (DRAFT, AUTHORIZED,
 * CANCELLED, REJECTED, AGUARDANDO_AUTORIZACAO); a tela lia só o texto em
 * português e por isso o botão "Autorizar" nunca aparecia em nota nova, e uma
 * nota apenas AGUARDANDO_AUTORIZACAO já era tratada como autorizada (com
 * cancelamento e CC-e liberados).
 */
type SituacaoNF = "rascunho" | "aguardando" | "autorizada" | "cancelada" | "rejeitada" | "outra";

function situacaoDaNota(status: string): SituacaoNF {
  const s = (status || "").trim().toUpperCase();
  if (s === "DRAFT" || s.includes("RASCUNHO")) return "rascunho";
  if (s.startsWith("AGUARDANDO")) return "aguardando";
  if (s === "AUTHORIZED" || s.includes("AUTORIZADA")) return "autorizada";
  if (s === "CANCELLED" || s === "CANCELED" || s.includes("CANCELAD")) return "cancelada";
  if (s === "REJECTED" || s.includes("REJEIT")) return "rejeitada";
  return "outra";
}

const ROTULO_SITUACAO: Record<SituacaoNF, string> = {
  rascunho: "Rascunho",
  aguardando: "Aguardando autorização",
  autorizada: "Autorizada",
  cancelada: "Cancelada",
  rejeitada: "Rejeitada",
  outra: "—",
};

function statusPill(status: string): JSX.Element {
  const sit = situacaoDaNota(status);
  const cls = sit === "autorizada" ? "erp-badge-green"
    : sit === "cancelada" ? "erp-badge-red"
    : sit === "rejeitada" ? "erp-badge-amber"
    : sit === "aguardando" ? "erp-badge-blue" : "erp-badge-gray";
  return <span className={`erp-badge ${cls}`}>{sit === "outra" ? (status || "—") : ROTULO_SITUACAO[sit]}</span>;
}

const dataBR = (iso?: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

export function Vfis0200Page(): JSX.Element {
  const [mode, setMode] = useState<Mode>("list");
  const [list, setList] = useState<FiscalExit[]>([]);
  const [form, setForm] = useState<CreateExitDTO>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<FiscalExit | null>(null);
  const [cceView, setCceView] = useState<{ id: number; list: Obj[] } | null>(null);
  const [previa, setPrevia] = useState<PreviaNFe | null>(null);
  const [verPayload, setVerPayload] = useState(false);
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
    if (!form.cnpj_destinatario.trim() || !form.uf_destinatario.trim()) {
      setFeedback({ type: "error", message: "CNPJ e UF do destinatário são obrigatórios." }); return;
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

  async function abrirPrevia(id: number) {
    setBusy(true); setFeedback(null); setVerPayload(false);
    try { setPrevia(await previewExit(id)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  /**
   * Autorizar transmite a nota de verdade. Antes de mandar, a tela roda a
   * conferência: com pendência que impede, a emissão nem sai; com pendência de
   * atenção, o usuário confirma sabendo o que está aceitando.
   *
   * Nota autorizada não se corrige — só cancelamento (com prazo e justificativa)
   * ou carta de correção. É por isso que a confirmação é explícita.
   */
  async function autorizar(code: number) {
    setBusy(true); setFeedback(null);
    try {
      const conferida = await previewExit(code);
      if (!conferida.pode_autorizar) {
        setPrevia(conferida);
        setFeedback({
          type: "error",
          message: `A NF-e ${conferida.numero_nf} não pode ser emitida: ${conferida.pendencias.filter((p) => p.nivel === "IMPEDE").length} pendência(s) impedem a transmissão. Veja a prévia.`,
        });
        return;
      }
      const atencoes = conferida.pendencias.filter((p) => p.nivel === "ATENCAO");
      const resumo = atencoes.length
        ? `\n\nAtenção:\n${atencoes.map((p) => `• ${p.mensagem}`).join("\n")}`
        : "";
      const ok = window.confirm(
        `Emitir a NF-e ${conferida.numero_nf > 0 ? `${conferida.numero_nf}/${conferida.serie}` : "(número atribuído na emissão)"} para ${conferida.destinatario.nome} `
        + `no valor de R$ ${money(conferida.totais.valor_total_nf)}?\n\n`
        + `Ambiente: ${conferida.ambiente.toUpperCase()}. Nota autorizada só se desfaz por cancelamento.${resumo}`,
      );
      if (!ok) return;
      await authorizeExit(code);
      setPrevia(null);
      setFeedback({ type: "success", message: `NF-e ${code} enviada para autorização.` });
      await reload();
    }
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
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">NF-e de Saída</span><span className="erp-crumb-code">VFIS0200</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Nova NF-e</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Visão</span>
          <button className="erp-btn" onClick={() => { setMode("list"); void reload(); }} disabled={busy}>Listagem</button>
        </div>
        {mode === "create" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Ações</span>
            <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>
              {busy ? <><div className="erp-spin" />Salvando...</> : "Criar Rascunho"}
            </button>
          </div>
        )}
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0200 — NF-e de Saída" filename="vfis0200" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">NF-e de Saída</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        {mode === "list" && (
          <>
            {lastCreated && (
              <div className="erp-metrics">
                <div className="erp-metric"><div className="erp-metric-label">Última NF-e ({lastCreated.numero_nf})</div><div className="erp-metric-value">{money(lastCreated.valor_total)}</div></div>
                <div className="erp-metric"><div className="erp-metric-label">ICMS</div><div className="erp-metric-value">{money(lastCreated.valor_icms)}</div></div>
                <div className="erp-metric"><div className="erp-metric-label">IPI</div><div className="erp-metric-value">{money(lastCreated.valor_ipi)}</div></div>
                <div className="erp-metric"><div className="erp-metric-label">PIS</div><div className="erp-metric-value">{money(lastCreated.valor_pis)}</div></div>
                <div className="erp-metric"><div className="erp-metric-label">COFINS</div><div className="erp-metric-value">{money(lastCreated.valor_cofins)}</div></div>
              </div>
            )}
            {cceView && (
              <div className="erp-fieldset" style={{ marginBottom: 12 }}>
                <div className="erp-card-header">
                  <div className="erp-card-header-left"><span className="erp-card-title">CC-e da NF-e {cceView.id}</span></div>
                  <button className="erp-btn" onClick={() => setCceView(null)}>Fechar</button>
                </div>
                <div className="erp-fieldset-body">
                  <table className="erp-grid">
                    <thead><tr><th style={{ width: 50 }}>Seq</th><th>Texto da correção</th><th>Status</th><th>Data</th></tr></thead>
                    <tbody>
                      {cceView.list.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhuma CC-e emitida para esta NF-e.</td></tr>}
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
            <div className="erp-fieldset"><div className="erp-fieldset-head">Notas Fiscais   — <span style={{fontWeight:400,opacity:0.65}}>{list.length} NF-e</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead>
                    <tr><th>#</th><th>Série</th><th>Destinatário</th><th>Status</th><th>Total</th><th>Emissão</th><th style={{ width: 280 }}>Ações</th></tr>
                  </thead>
                  <tbody>
                    {list.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhuma NF-e de saída.</td></tr>}
                    {list.map((nf) => {
                      const sit = situacaoDaNota(nf.status);
                      const isDraft = sit === "rascunho" || sit === "aguardando";
                      const isAuth = sit === "autorizada";
                      return (
                        <tr key={nf.id}>
                          <td style={{ fontWeight: 600 }}>{nf.numero_nf}</td>
                          <td>{nf.serie}</td>
                          <td>{nf.razao_social_destinatario}<br /><small style={{ color: "#8aa894" }}>{nf.cnpj_destinatario}</small></td>
                          <td>{statusPill(nf.status)}</td>
                          <td>{money(nf.valor_total)}</td>
                          <td>{nf.data_emissao?.slice(0, 10) || "—"}</td>
                          <td>
                            {isDraft && <button className="erp-btn erp-btn-sm erp-btn-primary" onClick={() => void abrirPrevia(nf.id)}>Prévia</button>}
                            {isDraft && <button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => void autorizar(nf.id)}>Autorizar</button>}
                            {isAuth && <button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => void cce(nf.id)}>Nova CC-e</button>}
                            {isAuth && <button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => void verCces(nf.id)}>Ver CC-e</button>}
                            {isAuth && <button className="erp-btn erp-btn-sm erp-btn erp-btn-danger erp-btn-sm" onClick={() => void cancelar(nf.id)}>Cancelar</button>}
                            <button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => void consultarStatus(nf.id)}>Status</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          </>
        )}

        {mode === "create" && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Cabeçalho   — <span style={{fontWeight:400,opacity:0.65}}>Os impostos são calculados ao criar</span></div><div className="erp-fieldset-body">
                
                  <div className="erp-field erp-c2"><label className="erp-label">Número NF</label>
                    <input className="erp-input num" type="number" value={form.numero_nf || ""} onChange={(e) => setF("numero_nf", Number(e.target.value))} />
                    <span className="erp-hint">Deixe em branco: o sistema usa o próximo número da sequência da empresa. Informe à mão só para retomar uma numeração existente.</span></div>
                  <div className="erp-field erp-c1"><label className="erp-label erp-req">Série</label>
                    <input className="erp-input" value={form.serie} onChange={(e) => setF("serie", e.target.value)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label erp-req">CFOP</label>
                    <input className="erp-input" value={form.cfop} onChange={(e) => setF("cfop", e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Emissão</label>
                    <input className="erp-input" type="date" value={form.data_emissao} onChange={(e) => setF("data_emissao", e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Saída</label>
                    <input className="erp-input" type="date" value={form.data_saida} onChange={(e) => setF("data_saida", e.target.value)} /></div>
                  <div className="erp-field erp-c1"><label className="erp-label">Pessoa</label>
                    <select className="erp-input" value={form.tipo_pessoa} onChange={(e) => setF("tipo_pessoa", e.target.value as TipoPessoa)}>
                      <option value="J">J</option><option value="F">F</option></select></div>
                  <div className="erp-field erp-c3"><label className="erp-label erp-req">CNPJ/CPF Destinatário</label>
                    <input className="erp-input" value={form.cnpj_destinatario} onChange={(e) => setF("cnpj_destinatario", e.target.value)} />
                    {form.cnpj_destinatario.trim() && (
                      <span className="erp-field-hint" style={{ color: validateCNPJOrCPF(form.cnpj_destinatario) ? "#1e6030" : "#b91c1c" }}>
                        {validateCNPJOrCPF(form.cnpj_destinatario) ? "✓ válido" : "✗ inválido"}
                      </span>
                    )}</div>
                  <div className="erp-field erp-c5"><label className="erp-label">Razão Social Destinatário</label>
                    <input className="erp-input" value={form.razao_social_destinatario} onChange={(e) => setF("razao_social_destinatario", e.target.value)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">IE Destinatário</label>
                    <input className="erp-input" value={form.ie_destinatario ?? ""} placeholder="ISENTO se não-contrib." onChange={(e) => setF("ie_destinatario", e.target.value)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label erp-req">UF Destino</label>
                    <input className="erp-input" maxLength={2} value={form.uf_destinatario} onChange={(e) => setF("uf_destinatario", e.target.value.toUpperCase())} /></div>
                  <div className="erp-field erp-c6"><label className="erp-label">Natureza da Operação</label>
                    <input className="erp-input" value={form.natureza_operacao} onChange={(e) => setF("natureza_operacao", e.target.value)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Frete</label>
                    <input className="erp-input num" type="number" step="0.01" value={form.valor_frete} onChange={(e) => setF("valor_frete", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Seguro</label>
                    <input className="erp-input num" type="number" step="0.01" value={form.valor_seguro} onChange={(e) => setF("valor_seguro", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Desconto</label>
                    <input className="erp-input num" type="number" step="0.01" value={form.valor_desconto} onChange={(e) => setF("valor_desconto", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Carga de expedição</label>
                    <input className="erp-input num" type="number" value={form.shipment_load_code ?? ""}
                      onChange={(e) => setF("shipment_load_code", e.target.value ? Number(e.target.value) : undefined)} />
                    <span className="erp-hint">Preenchido sozinho quando a nota nasce do romaneio; informe aqui só na emissão avulsa.</span></div>
                
              </div>
            </div>

            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Destinatário: cliente e endereço   — <span style={{fontWeight:400,opacity:0.65}}>A NF-e exige o endereço completo do destinatário</span></div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label">Cliente (cód.)</label>
                  <input className="erp-input num" type="number" value={form.customer_code ?? ""}
                    onChange={(e) => setF("customer_code", e.target.value ? Number(e.target.value) : undefined)} />
                  <span className="erp-hint">Informando o cliente, o sistema completa nome, CNPJ, IE e o endereço pelo cadastro (entrega, ou cobrança na falta dele) e resolve a condição de pagamento.</span></div>
                <div className="erp-field erp-c12">
                  <p className="erp-note">
                    Os campos abaixo só precisam ser preenchidos numa entrega pontual em endereço
                    diferente do cadastro. O que você digitar aqui prevalece; o que ficar em branco
                    é completado pelo cadastro do cliente. Use a Prévia para conferir o resultado
                    antes de emitir.
                  </p>
                </div>
                <div className="erp-field erp-c4"><label className="erp-label">Logradouro</label>
                  <input className="erp-input" value={form.dest_logradouro ?? ""}
                    onChange={(e) => setF("dest_logradouro", e.target.value || undefined)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Número</label>
                  <input className="erp-input" value={form.dest_numero ?? ""}
                    onChange={(e) => setF("dest_numero", e.target.value || undefined)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Complemento</label>
                  <input className="erp-input" value={form.dest_complemento ?? ""}
                    onChange={(e) => setF("dest_complemento", e.target.value || undefined)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Bairro</label>
                  <input className="erp-input" value={form.dest_bairro ?? ""}
                    onChange={(e) => setF("dest_bairro", e.target.value || undefined)} /></div>
                <div className="erp-field erp-c4"><label className="erp-label">Município</label>
                  <input className="erp-input" value={form.dest_municipio ?? ""}
                    onChange={(e) => setF("dest_municipio", e.target.value || undefined)} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">CEP</label>
                  <input className="erp-input" value={form.dest_cep ?? ""}
                    onChange={(e) => setF("dest_cep", e.target.value || undefined)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">E-mail</label>
                  <input className="erp-input" value={form.dest_email ?? ""}
                    onChange={(e) => setF("dest_email", e.target.value || undefined)} />
                  <span className="erp-hint">Por onde o cliente recebe a nota.</span></div>
                <div className="erp-field erp-c3"><label className="erp-label">Telefone</label>
                  <input className="erp-input" value={form.dest_telefone ?? ""}
                    onChange={(e) => setF("dest_telefone", e.target.value || undefined)} /></div>
              </div>
            </div>

            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Cupom fiscal substituído   — <span style={{fontWeight:400,opacity:0.65}}>Preencha só quando esta nota substitui um cupom emitido no balcão</span></div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label">Número do cupom</label>
                  <input className="erp-input" value={form.fiscal_coupon_number ?? ""}
                    onChange={(e) => setF("fiscal_coupon_number", e.target.value || undefined)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Data do cupom</label>
                  <input className="erp-input" type="date" value={form.fiscal_coupon_date ?? ""}
                    onChange={(e) => setF("fiscal_coupon_date", e.target.value || undefined)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Série do ECF</label>
                  <input className="erp-input" value={form.fiscal_coupon_ecf_serial ?? ""}
                    onChange={(e) => setF("fiscal_coupon_ecf_serial", e.target.value || undefined)} /></div>
                <div className="erp-field erp-c12">
                  <p className="erp-note">
                    O cliente compra no balcão, leva o cupom e depois pede a nota. Registrar
                    número, data e ECF do cupom aqui é o que amarra os dois documentos para a
                    fiscalização — sem isso, a mesma venda aparece duas vezes.
                  </p>
                </div>
              </div>
            </div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Itens   — <span style={{fontWeight:400,opacity:0.65}}>Produtos: R$ {money(form.valor_produtos)}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead>
                    <tr><th style={{ width: 40 }}>Seq</th><th>Cód. Item</th><th>NCM</th><th>CFOP</th><th>Origem</th><th>Descrição</th>
                      <th>Qtd</th><th>Unit.</th><th>Total</th><th style={{ width: 60 }}></th></tr>
                  </thead>
                  <tbody>
                    {form.itens.map((it, idx) => (
                      <tr key={idx}>
                        <td>{it.sequence}</td>
                        <td><input className="erp-input" style={{ height: 30, width: 80 }}  value={it.item_code || ""} onChange={(e) => setItem(idx, { item_code: e.target.value })} /></td>
                        <td><input className="erp-input" style={{ height: 30, width: 100 }} value={it.ncm} onChange={(e) => setItem(idx, { ncm: e.target.value })} /></td>
                        <td><input className="erp-input" style={{ height: 30, width: 70 }} value={it.cfop} onChange={(e) => setItem(idx, { cfop: e.target.value })} /></td>
                        <td><input className="erp-input" style={{ height: 30, width: 50 }} value={it.origem_mercadoria} onChange={(e) => setItem(idx, { origem_mercadoria: e.target.value })} /></td>
                        <td><input className="erp-input" style={{ height: 30, minWidth: 140 }} value={it.description} onChange={(e) => setItem(idx, { description: e.target.value })} /></td>
                        <td><input className="erp-input num" style={{ height: 30, width: 70 }} type="number" value={it.quantidade} onChange={(e) => setItem(idx, { quantidade: Number(e.target.value) })} /></td>
                        <td><input className="erp-input num" style={{ height: 30, width: 90 }} type="number" step="0.01" value={it.unit_price} onChange={(e) => setItem(idx, { unit_price: Number(e.target.value) })} /></td>
                        <td>{money(it.total_price)}</td>
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

      {previa && (
        <div className="erp-modal-backdrop" onClick={() => setPrevia(null)}>
          <div className="erp-modal erp-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="erp-modal-head">
              <div>
                <strong>
                  Prévia da NF-e{" "}
                  {previa.numero_nf > 0
                    ? `${previa.numero_nf}${previa.serie ? `/${previa.serie}` : ""}`
                    : "— ainda sem número"}
                </strong>
                <div className="erp-hint" style={{ marginTop: 2 }}>
                  {previa.natureza_operacao} · CFOP {previa.cfop} · {previa.tipo_operacao}
                  {previa.consumidor_final ? " · consumidor final" : ""}
                  {" · emissão "}{dataBR(previa.data_emissao)}
                  {previa.sales_order_code ? ` · pedido ${previa.sales_order_code}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className={`erp-badge ${previa.ambiente.toLowerCase().startsWith("prod") ? "erp-badge-green" : "erp-badge-amber"}`}>
                  {previa.ambiente.toLowerCase().startsWith("prod") ? "PRODUÇÃO" : "HOMOLOGAÇÃO"}
                </span>
                <button className="erp-btn" onClick={() => setPrevia(null)}>Fechar</button>
              </div>
            </div>

            <div className="erp-modal-body">
              {/* Conferência primeiro: é o que decide se dá para emitir. */}
              <div className="erp-fieldset" style={{ marginBottom: 12 }}>
                <div className="erp-fieldset-head">
                  Conferência   — <span style={{ fontWeight: 400, opacity: 0.65 }}>
                    {previa.pendencias.length === 0
                      ? "nenhuma pendência: a nota está pronta para emitir"
                      : `${previa.pendencias.filter((p) => p.nivel === "IMPEDE").length} impedem · ${previa.pendencias.filter((p) => p.nivel === "ATENCAO").length} de atenção`}
                  </span>
                </div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c12">
                    {previa.pendencias.length === 0 && (
                      <div className="erp-feedback success">
                        Emitente, destinatário, itens, impostos e pagamento conferidos. Nada impede a emissão.
                      </div>
                    )}
                    {previa.pendencias.length > 0 && (
                      <table className="erp-grid">
                        <thead><tr><th style={{ width: 110 }}>Nível</th><th>O que está pendente</th><th>Como resolver</th></tr></thead>
                        <tbody>
                          {previa.pendencias.map((p, i) => (
                            <tr key={i}>
                              <td>
                                <span className={`erp-badge ${p.nivel === "IMPEDE" ? "erp-badge-red" : "erp-badge-amber"}`}>
                                  {p.nivel === "IMPEDE" ? "Impede" : "Atenção"}
                                </span>
                              </td>
                              <td>{p.mensagem}</td>
                              <td style={{ opacity: 0.8 }}>{p.como_resolver}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              <div className="erp-fieldset" style={{ marginBottom: 12 }}>
                <div className="erp-fieldset-head">Emitente e destinatário</div>
                <div className="erp-fieldset-body">
                  {([["Emitente", previa.emitente], ["Destinatário", previa.destinatario]] as const).map(([rotulo, parte]) => (
                    <div className="erp-field erp-c6" key={rotulo}>
                      <label className="erp-label">{rotulo}</label>
                      <div className="erp-note" style={{ lineHeight: 1.6 }}>
                        <strong>{parte.nome || <em style={{ color: "#b4472f" }}>— sem nome —</em>}</strong><br />
                        {parte.documento || <em style={{ color: "#b4472f" }}>— sem CNPJ/CPF —</em>}
                        {parte.ie ? ` · IE ${parte.ie}` : " · sem IE"}<br />
                        {parte.logradouro || <em style={{ color: "#b4472f" }}>— sem logradouro —</em>}
                        {parte.numero ? `, ${parte.numero}` : ""}
                        {parte.complemento ? ` — ${parte.complemento}` : ""}<br />
                        {parte.bairro || <em style={{ color: "#b4472f" }}>— sem bairro —</em>}
                        {" · "}
                        {parte.municipio || <em style={{ color: "#b4472f" }}>— sem município —</em>}
                        {parte.uf ? `/${parte.uf}` : ""}
                        {parte.codigo_municipio ? ` (IBGE ${parte.codigo_municipio})` : ""}<br />
                        CEP {parte.cep || <em style={{ color: "#b4472f" }}>—</em>}
                        {parte.email ? ` · ${parte.email}` : ""}
                        {parte.telefone ? ` · ${parte.telefone}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="erp-fieldset" style={{ marginBottom: 12 }}>
                <div className="erp-fieldset-head">
                  Itens   — <span style={{ fontWeight: 400, opacity: 0.65 }}>{previa.itens.length} linha(s)</span>
                </div>
                <div className="erp-fieldset-body"><div className="erp-field erp-c12">
                  <table className="erp-grid">
                    <thead>
                      <tr>
                        <th style={{ width: 34 }}>#</th><th>Descrição</th><th>NCM</th><th>CFOP</th>
                        <th className="num">Qtd</th><th className="num">Unit.</th><th className="num">Total</th>
                        <th>CST ICMS</th><th className="num">ICMS</th><th className="num">IPI</th>
                        <th className="num">ICMS-ST</th><th className="num">PIS</th><th className="num">COFINS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previa.itens.length === 0 && (
                        <tr><td colSpan={13} className="erp-grid-empty">Esta nota não tem itens — inclua os produtos antes de emitir.</td></tr>
                      )}
                      {previa.itens.map((it) => (
                        <tr key={it.sequence}>
                          <td>{it.sequence}</td>
                          <td>{it.descricao || `Item ${it.item_code ?? ""}`}</td>
                          <td>{it.ncm || <span className="erp-badge erp-badge-red">sem NCM</span>}</td>
                          <td>{it.cfop || <span className="erp-badge erp-badge-red">sem CFOP</span>}</td>
                          <td className="num">{it.quantidade}</td>
                          <td className="num">{money(it.valor_unitario)}</td>
                          <td className="num">{money(it.valor_total)}</td>
                          <td>{it.cst_icms || "—"}</td>
                          <td className="num">{money(it.valor_icms)}</td>
                          <td className="num">{money(it.valor_ipi)}</td>
                          <td className="num">{it.valor_icms_st > 0 ? money(it.valor_icms_st) : "—"}</td>
                          <td className="num">{money(it.valor_pis)}</td>
                          <td className="num">{money(it.valor_cofins)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div></div>
              </div>

              <div className="erp-fieldset" style={{ marginBottom: 12 }}>
                <div className="erp-fieldset-head">Totais</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c12">
                    <div className="erp-metrics">
                      <div className="erp-metric"><div className="erp-metric-label">Produtos</div><div className="erp-metric-value">{money(previa.totais.valor_produtos)}</div></div>
                      <div className="erp-metric"><div className="erp-metric-label">IPI</div><div className="erp-metric-value">{money(previa.totais.valor_ipi)}</div></div>
                      <div className="erp-metric"><div className="erp-metric-label">ICMS-ST</div><div className="erp-metric-value">{money(previa.totais.valor_icms_st)}</div></div>
                      <div className="erp-metric"><div className="erp-metric-label">Frete</div><div className="erp-metric-value">{money(previa.totais.valor_frete)}</div></div>
                      <div className="erp-metric"><div className="erp-metric-label">Desconto</div><div className="erp-metric-value">{money(previa.totais.valor_desconto)}</div></div>
                      <div className="erp-metric"><div className="erp-metric-label">Total da NF-e</div><div className="erp-metric-value">{money(previa.totais.valor_total_nf)}</div></div>
                    </div>
                  </div>
                  <div className="erp-field erp-c12">
                    <p className="erp-note">{previa.totais.conferencia}</p>
                  </div>
                </div>
              </div>

              <div className="erp-fieldset" style={{ marginBottom: 12 }}>
                <div className="erp-fieldset-head">
                  Pagamento   — <span style={{ fontWeight: 400, opacity: 0.65 }}>
                    {previa.pagamento.condicao_descricao || previa.pagamento.origem}
                  </span>
                </div>
                <div className="erp-fieldset-body"><div className="erp-field erp-c12">
                  <table className="erp-grid">
                    <thead><tr><th style={{ width: 50 }}>Parc.</th><th>Descrição</th><th className="num">%</th><th className="num">Valor</th><th>Vencimento</th><th>Forma na NF-e</th></tr></thead>
                    <tbody>
                      {previa.pagamento.parcelas.map((parc) => (
                        <tr key={parc.numero}>
                          <td>{parc.numero}</td>
                          <td>{parc.descricao}{parc.estimado ? " (vencimento projetado)" : ""}</td>
                          <td className="num">{parc.percentual.toFixed(2)}</td>
                          <td className="num">{money(parc.valor)}</td>
                          <td>{dataBR(parc.vencimento)}</td>
                          <td>{parc.forma_pagamento_nf}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="erp-note" style={{ marginTop: 8 }}>
                    Estas parcelas viram as duplicatas da NF-e e os títulos do contas a receber —
                    origem: {previa.pagamento.origem}.
                    {previa.pagamento.aviso ? ` ${previa.pagamento.aviso}` : ""}
                  </p>
                </div></div>
              </div>

              <div className="erp-fieldset">
                <div className="erp-card-header">
                  <div className="erp-card-header-left"><span className="erp-card-title">Documento que será transmitido</span></div>
                  <button className="erp-btn erp-btn-sm" onClick={() => setVerPayload((v) => !v)}>
                    {verPayload ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                {verPayload && (
                  <div className="erp-fieldset-body"><div className="erp-field erp-c12">
                    <pre className="erp-note" style={{ maxHeight: 280, overflow: "auto", fontSize: 11, whiteSpace: "pre" }}>
                      {previa.payload_enviado}
                    </pre>
                  </div></div>
                )}
              </div>
            </div>

            <div className="erp-modal-actions">
              <button className="erp-btn" onClick={() => setPrevia(null)}>Fechar</button>
              <button
                className="erp-btn erp-btn-primary"
                disabled={busy || !previa.pode_autorizar}
                title={previa.pode_autorizar ? "" : "Resolva as pendências que impedem a emissão"}
                onClick={() => void autorizar(previa.fiscal_exit_id)}
              >
                {busy ? <><div className="erp-spin" />Emitindo...</> : "Emitir NF-e"}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}>
          <div className="erp-status-item">NF-e: <strong>{list.length}</strong></div>
          <div className="erp-status-item">Autorizadas: <strong>{list.filter((n) => n.status.toLowerCase().includes("autoriz")).length}</strong></div>
        </div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

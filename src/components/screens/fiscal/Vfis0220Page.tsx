import { useState, useCallback, useEffect } from "react";
import {
  type Cte, type CreateCteDTO, type CteEmissionData, type TipoRateio,
  CTE_TOMADORES, CTE_TIPOS, listCtes, createCte, authorizeCte,
} from "@/services/nfeService";
import { enumLabel } from "@/utils/enumLabels";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const today = () => new Date().toISOString().slice(0, 10);
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Dados de emissão vazios. O CT-e pode ser gravado só como registro local (para
 * apropriar o frete), mas a autorização na SEFAZ exige o trajeto e as partes —
 * é por isso que o formulário os pede em um bloco próprio, marcado como
 * opcional até a hora de autorizar.
 */
const EMISSAO_VAZIA: CteEmissionData = {
  natureza_operacao: "Prestação de serviço de transporte",
  tipo_cte: 0, tipo_servico: 0, modal: "01", tomador_servico: 3,
  uf_inicio: "", municipio_inicio: "", uf_fim: "", municipio_fim: "",
  remetente: {}, destinatario: {},
  produto_predominante: "", valor_carga: 0, rntrc: "",
};

const EMPTY: CreateCteDTO = {
  numero_cte: 0, serie: "001", data_emissao: today(), data_entrada: today(),
  cnpj_emitente: "", razao_social_emitente: "", uf_emitente: "", cfop: "1352",
  valor_frete: 0, valor_seguro: 0, valor_outros: 0, valor_total: 0,
  valor_icms: 0, base_icms: 0, aliq_icms: 0, cst_icms: "00", tipo_rateio: "VALOR",
};

export function Vfis0220Page(): JSX.Element {
  const [mode, setMode] = useState<"list" | "create">("list");
  const [list, setList] = useState<Cte[]>([]);
  const [form, setForm] = useState<CreateCteDTO>(EMPTY);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const [emissao, setEmissao] = useState<CteEmissionData>({ ...EMISSAO_VAZIA });
  const [comEmissao, setComEmissao] = useState(false);
  const [selecionado, setSelecionado] = useState<number | null>(null);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listCtes()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar CT-e.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof CreateCteDTO>(k: K, v: CreateCteDTO[K]) => {
    setForm((p) => {
      const next = { ...p, [k]: v };
      next.valor_total = Number((next.valor_frete + next.valor_seguro + next.valor_outros).toFixed(2));
      return next;
    });
    setFeedback(null);
  };

  function novo() {
    setForm(EMPTY); setEmissao({ ...EMISSAO_VAZIA }); setComEmissao(false);
    setMode("create"); setFeedback(null);
  }

  const setE = <K extends keyof CteEmissionData>(k: K, v: CteEmissionData[K]) => {
    setEmissao((p) => ({ ...p, [k]: v })); setFeedback(null);
  };
  const setParte = (parte: "remetente" | "destinatario", campo: string, valor: string) => {
    setEmissao((p) => ({ ...p, [parte]: { ...p[parte], [campo]: valor } })); setFeedback(null);
  };

  /** Envia à SEFAZ o CT-e selecionado na lista. */
  async function autorizar() {
    if (!selecionado) { setFeedback({ type: "error", message: "Escolha o CT-e na lista." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const c = await authorizeCte(selecionado);
      setFeedback({ type: "success", message: `CT-e ${c.numero_cte} enviado à SEFAZ (${enumLabel(c.status)}).` });
      await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function salvar() {
    if (!form.numero_cte || !form.cnpj_emitente.trim() || !form.uf_emitente.trim()) {
      setFeedback({ type: "error", message: "Número, CNPJ e UF do emitente são obrigatórios." }); return;
    }
    setBusy(true); setFeedback(null);
    try {
      if (comEmissao && (!emissao.uf_inicio || !emissao.municipio_inicio || !emissao.uf_fim || !emissao.municipio_fim)) {
        setFeedback({ type: "error", message: "Para autorizar na SEFAZ, informe origem e destino do trajeto." });
        setBusy(false); return;
      }
      const c = await createCte({ ...form, emission_data: comEmissao ? emissao : undefined });
      setFeedback({ type: "success", message: `CT-e ${c?.numero_cte ?? form.numero_cte} registrado.` });
      setMode("list"); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">CT-e (Conhecimento de Transporte)</span><span className="erp-crumb-code">VFIS0220</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Novo CT-e</button>
          <button className="erp-btn" onClick={() => { setMode("list"); void reload(); }} disabled={busy}>Listagem</button>
        </div>
        {mode === "create" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Ações</span>
            <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : "Registrar CT-e"}</button>
          </div>
        )}
        {mode === "list" && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">SEFAZ</span>
            <button className="erp-btn erp-btn-dark" onClick={() => void autorizar()} disabled={busy || !selecionado}>Autorizar na SEFAZ</button>
          </div>
        )}
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0220 — CT-e (Conhecimento de Transporte)" filename="vfis0220" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">CT-e</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        {mode === "list" ? (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Conhecimentos   — <span style={{fontWeight:400,opacity:0.65}}>{list.length} CT-e • escolha um para autorizar na SEFAZ</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead><tr><th>#</th><th>Série</th><th>Transportadora</th><th>UF</th><th>Rateio</th><th>Frete</th><th>Total</th><th>Emissão</th><th>Situação</th></tr></thead>
                  <tbody>
                    {list.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">Nenhum CT-e registrado.</td></tr>}
                    {list.map((c) => (
                      <tr key={c.id} className={selecionado === c.id ? "erp-row-sel" : ""}
                        style={{ cursor: "pointer" }} onClick={() => setSelecionado(c.id)}>
                        <td style={{ fontWeight: 600 }}>{c.numero_cte}</td>
                        <td>{c.serie || "—"}</td>
                        <td>{c.razao_social_emitente}<br /><small style={{ color: "#8aa894" }}>{c.cnpj_emitente}</small></td>
                        <td>{c.uf_emitente || "—"}</td>
                        <td>{c.tipo_rateio || "—"}</td>
                        <td>{money(c.valor_frete)}</td>
                        <td>{money(c.valor_total)}</td>
                        <td>{c.data_emissao?.slice(0, 10) || "—"}</td>
                        <td>{c.status ? enumLabel(c.status) : "Registro local"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          </>
        ) : (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Dados do CT-e   — <span style={{fontWeight:400,opacity:0.65}}>Total: R$ {money(form.valor_total)}</span></div><div className="erp-fieldset-body">
                
                  <div className="erp-field erp-c2"><label className="erp-label erp-req">Número CT-e</label>
                    <input className="erp-input num" type="number" value={form.numero_cte || ""} onChange={(e) => setF("numero_cte", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c1"><label className="erp-label">Série</label>
                    <input className="erp-input" value={form.serie} onChange={(e) => setF("serie", e.target.value)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">CFOP</label>
                    <input className="erp-input" value={form.cfop} onChange={(e) => setF("cfop", e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Emissão</label>
                    <input className="erp-input" type="date" value={form.data_emissao} onChange={(e) => setF("data_emissao", e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Entrada</label>
                    <input className="erp-input" type="date" value={form.data_entrada} onChange={(e) => setF("data_entrada", e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label erp-req">CNPJ Emitente</label>
                    <input className="erp-input" value={form.cnpj_emitente} onChange={(e) => setF("cnpj_emitente", e.target.value)} /></div>
                  <div className="erp-field erp-c5"><label className="erp-label">Razão Social (Transportadora)</label>
                    <input className="erp-input" value={form.razao_social_emitente} onChange={(e) => setF("razao_social_emitente", e.target.value)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label erp-req">UF Emitente</label>
                    <input className="erp-input" maxLength={2} value={form.uf_emitente} onChange={(e) => setF("uf_emitente", e.target.value.toUpperCase())} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Tipo Rateio</label>
                    <select className="erp-input" value={form.tipo_rateio} onChange={(e) => setF("tipo_rateio", e.target.value as TipoRateio)}>
                      <option value="VALOR">VALOR</option><option value="PESO">PESO</option></select></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Frete</label>
                    <input className="erp-input num" type="number" step="0.01" value={form.valor_frete} onChange={(e) => setF("valor_frete", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Seguro</label>
                    <input className="erp-input num" type="number" step="0.01" value={form.valor_seguro} onChange={(e) => setF("valor_seguro", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Outros</label>
                    <input className="erp-input num" type="number" step="0.01" value={form.valor_outros} onChange={(e) => setF("valor_outros", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Base ICMS</label>
                    <input className="erp-input num" type="number" step="0.01" value={form.base_icms} onChange={(e) => setF("base_icms", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Alíq. ICMS</label>
                    <input className="erp-input num" type="number" step="0.0001" value={form.aliq_icms} onChange={(e) => setF("aliq_icms", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Valor ICMS</label>
                    <input className="erp-input num" type="number" step="0.01" value={form.valor_icms} onChange={(e) => setF("valor_icms", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">CST ICMS</label>
                    <input className="erp-input" value={form.cst_icms} onChange={(e) => setF("cst_icms", e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">NF-e Entrada vinculada (ID)</label>
                    <input className="erp-input num" type="number" value={form.fiscal_entry_id ?? ""} onChange={(e) => setF("fiscal_entry_id", e.target.value ? Number(e.target.value) : undefined)} /></div>
                
              </div>
            </div>

            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Dados de emissão (SEFAZ)</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c12">
                  <label className="erp-check">
                    <input type="checkbox" checked={comEmissao} onChange={(e) => setComEmissao(e.target.checked)} />
                    Preencher os dados de emissão para autorizar na SEFAZ
                  </label>
                  <span className="erp-hint">
                    Sem eles o CT-e vale como registro local — dá para apropriar o frete, mas a
                    autorização é recusada. O emitente vem da configuração fiscal da empresa.
                  </span>
                </div>

                {comEmissao && (<>
                  <div className="erp-field erp-c4"><label className="erp-label">Natureza da operação</label>
                    <input className="erp-input" value={emissao.natureza_operacao ?? ""} onChange={(e) => setE("natureza_operacao", e.target.value)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Finalidade</label>
                    <select className="erp-input" value={emissao.tipo_cte ?? 0} onChange={(e) => setE("tipo_cte", Number(e.target.value))}>
                      {CTE_TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Tomador do serviço</label>
                    <select className="erp-input" value={emissao.tomador_servico ?? 3} onChange={(e) => setE("tomador_servico", Number(e.target.value))}>
                      {CTE_TOMADORES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select></div>
                  <div className="erp-field erp-c2"><label className="erp-label">RNTRC</label>
                    <input className="erp-input" value={emissao.rntrc ?? ""} onChange={(e) => setE("rntrc", e.target.value)} /></div>

                  <div className="erp-field erp-c4"><label className="erp-label erp-req">Município de início</label>
                    <input className="erp-input" value={emissao.municipio_inicio} onChange={(e) => setE("municipio_inicio", e.target.value)} /></div>
                  <div className="erp-field erp-c1"><label className="erp-label erp-req">UF</label>
                    <input className="erp-input" maxLength={2} value={emissao.uf_inicio} onChange={(e) => setE("uf_inicio", e.target.value.toUpperCase())} /></div>
                  <div className="erp-field erp-c4"><label className="erp-label erp-req">Município de fim</label>
                    <input className="erp-input" value={emissao.municipio_fim} onChange={(e) => setE("municipio_fim", e.target.value)} /></div>
                  <div className="erp-field erp-c1"><label className="erp-label erp-req">UF</label>
                    <input className="erp-input" maxLength={2} value={emissao.uf_fim} onChange={(e) => setE("uf_fim", e.target.value.toUpperCase())} /></div>

                  <div className="erp-field erp-c4"><label className="erp-label">Produto predominante</label>
                    <input className="erp-input" value={emissao.produto_predominante ?? ""} onChange={(e) => setE("produto_predominante", e.target.value)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Valor da carga</label>
                    <input className="erp-input num" type="number" step="0.01" value={emissao.valor_carga ?? 0} onChange={(e) => setE("valor_carga", Number(e.target.value))} /></div>

                  <div className="erp-field erp-c12"><label className="erp-label">Remetente (quem entrega a carga ao transportador)</label></div>
                  <div className="erp-field erp-c3"><label className="erp-label">CNPJ/CPF</label>
                    <input className="erp-input" value={emissao.remetente.cnpj ?? ""} onChange={(e) => setParte("remetente", "cnpj", e.target.value)} /></div>
                  <div className="erp-field erp-c5"><label className="erp-label">Nome</label>
                    <input className="erp-input" value={emissao.remetente.nome ?? ""} onChange={(e) => setParte("remetente", "nome", e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Município</label>
                    <input className="erp-input" value={emissao.remetente.municipio ?? ""} onChange={(e) => setParte("remetente", "municipio", e.target.value)} /></div>
                  <div className="erp-field erp-c1"><label className="erp-label">UF</label>
                    <input className="erp-input" maxLength={2} value={emissao.remetente.uf ?? ""} onChange={(e) => setParte("remetente", "uf", e.target.value.toUpperCase())} /></div>

                  <div className="erp-field erp-c12"><label className="erp-label">Destinatário (quem recebe a carga)</label></div>
                  <div className="erp-field erp-c3"><label className="erp-label">CNPJ/CPF</label>
                    <input className="erp-input" value={emissao.destinatario.cnpj ?? ""} onChange={(e) => setParte("destinatario", "cnpj", e.target.value)} /></div>
                  <div className="erp-field erp-c5"><label className="erp-label">Nome</label>
                    <input className="erp-input" value={emissao.destinatario.nome ?? ""} onChange={(e) => setParte("destinatario", "nome", e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Município</label>
                    <input className="erp-input" value={emissao.destinatario.municipio ?? ""} onChange={(e) => setParte("destinatario", "municipio", e.target.value)} /></div>
                  <div className="erp-field erp-c1"><label className="erp-label">UF</label>
                    <input className="erp-input" maxLength={2} value={emissao.destinatario.uf ?? ""} onChange={(e) => setParte("destinatario", "uf", e.target.value.toUpperCase())} /></div>
                </>)}
              </div>
            </div>
          </>
        )}
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">CT-e: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

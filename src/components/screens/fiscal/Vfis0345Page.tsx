import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type ApuracaoCIAP, type BemCIAP, type ParametrosCIAP,
  apurarCIAP, apuracoesCIAP, atualizarBemCIAP, baixarBemCIAP, bensCIAP, criarBemCIAP, excluirBemCIAP, fecharCIAP,
  parametrosCIAP, previaCIAP, salvarParametrosCIAP,
} from "@/services/ciapService";
import { type AccountDTO, type AccountingPlanDTO, listAccounts, listPlans } from "@/services/accountingService";
import { type CentroDeCusto, listarCentros } from "@/services/costCenterGestaoService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { useAuthStore } from "@/store/authStore";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Aba = "apuracao" | "bens" | "parametros";
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const TIPO_MOV: Record<string, string> = {
  SI: "Saldo inicial", IM: "Imobilização", BA: "Fim das parcelas", AT: "Alienação/transferência", PE: "Perecimento/extravio", OT: "Outras saídas",
};
const BAIXAS = [["AT", "Alienação ou transferência"], ["PE", "Perecimento, extravio ou deterioração"], ["OT", "Outras saídas"]];
const num = (s?: string | null) => Number(s ?? 0);
const moeda = (s?: string | null) => num(s).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dataBR = (s?: string | null) => (s ? new Date(`${s.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—");
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

type FormBem = { codigo: string; descricao: string; funcao: string; vida: string; conta: string; centro: string; entrada: string; op: string; st: string; frete: string; difal: string; parcelas: string };
const BEM_VAZIO: FormBem = { codigo: "", descricao: "", funcao: "", vida: "", conta: "", centro: "", entrada: "", op: "", st: "", frete: "", difal: "", parcelas: "" };

/**
 * VFIS0345 — CIAP (Controle de Crédito do ICMS do Ativo Permanente). O ICMS do
 * bem do ativo não é creditado de uma vez na nota: entra aqui e é apropriado em
 * parcelas mensais, pelo índice das saídas tributadas; a EFD leva o Bloco G e o
 * crédito no E111 da apuração do ICMS.
 */
export function Vfis0345Page(): JSX.Element {
  const isAdmin = useAuthStore((s) => s.user?.role?.toUpperCase() === "ADMIN");
  const [aba, setAba] = useState<Aba>("apuracao");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const [contas, setContas] = useState<AccountDTO[]>([]);
  const [centros, setCentros] = useState<CentroDeCusto[]>([]);

  useEffect(() => {
    listarCentros().then(setCentros).catch(() => setCentros([]));
    listPlans().then(async (ps: AccountingPlanDTO[]) => {
      const ativo = ps.find((p) => p.status === "A") ?? ps[0];
      if (ativo?.id) setContas((await listAccounts(ativo.id)).filter((c) => c.is_analytic));
    }).catch(() => setContas([]));
  }, []);

  // ─── Apuração ───────────────────────────────────────────────────────────────
  const agora = new Date();
  const [ano, setAno] = useState(agora.getFullYear());
  const [mes, setMes] = useState(agora.getMonth() + 1);
  const [apur, setApur] = useState<ApuracaoCIAP | null>(null);
  const [historico, setHistorico] = useState<ApuracaoCIAP[]>([]);
  const [trib, setTrib] = useState("");
  const [total, setTotal] = useState("");
  const carregarApuracao = useCallback(async () => {
    setBusy(true); setFeedback(null);
    try {
      const a = await previaCIAP(ano, mes);
      setApur(a);
      setTrib(a.saidas_informadas ? moeda(a.saidas_trib_exp) : "");
      setTotal(a.saidas_informadas ? moeda(a.saidas_total) : "");
      setHistorico(await apuracoesCIAP(ano));
    } catch (e) { setApur(null); setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, [ano, mes]);
  useEffect(() => { if (aba === "apuracao") void carregarApuracao(); }, [aba, carregarApuracao]);

  async function simular() {
    setBusy(true); setFeedback(null);
    try { setApur(await previaCIAP(ano, mes, trib, total)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function apurar() {
    setBusy(true); setFeedback(null);
    try {
      const a = await apurarCIAP(ano, mes, trib, total);
      setApur(a); setHistorico(await apuracoesCIAP(ano));
      setFeedback({ type: "success", message: `CIAP de ${MESES[mes - 1]}/${ano} apurado: crédito de R$ ${moeda(a.icms_apropriado)}.` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function fechar(f: boolean) {
    setBusy(true); setFeedback(null);
    try {
      await fecharCIAP(ano, mes, f);
      await carregarApuracao();
      setFeedback({ type: "success", message: f ? "Mês fechado: a apuração não muda mais." : "Mês reaberto." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  // ─── Bens ───────────────────────────────────────────────────────────────────
  const [bens, setBens] = useState<BemCIAP[]>([]);
  const [form, setForm] = useState<FormBem>(BEM_VAZIO);
  const [editId, setEditId] = useState<number | null>(null);
  const [baixa, setBaixa] = useState<{ id: number; tipo: string; data: string; motivo: string } | null>(null);
  const [busca, setBusca] = useState("");
  const carregarBens = useCallback(async () => {
    setBusy(true);
    try { setBens(await bensCIAP()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  useEffect(() => { if (aba === "bens") void carregarBens(); }, [aba, carregarBens]);
  const emEdicao = bens.find((b) => b.id === editId);
  const valoresTravados = !!emEdicao && (emEdicao.origem !== "MANUAL" || emEdicao.parcelas_usadas > 0);
  const setF = <K extends keyof FormBem>(k: K, v: string) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  function novoBem() { setForm(BEM_VAZIO); setEditId(null); setBaixa(null); setFeedback(null); }
  function editarBem(b: BemCIAP) {
    setForm({ codigo: b.codigo, descricao: b.descricao, funcao: b.funcao ?? "", vida: b.vida_util_meses ? String(b.vida_util_meses) : "",
      conta: b.conta_ativo_id ? String(b.conta_ativo_id) : "", centro: b.cost_center_id ? String(b.cost_center_id) : "", entrada: b.data_entrada,
      op: moeda(b.icms_op), st: moeda(b.icms_st), frete: moeda(b.icms_frete), difal: moeda(b.icms_difal), parcelas: String(b.numero_parcelas) });
    setEditId(b.id); setBaixa(null); setFeedback(null);
  }
  async function salvarBem() {
    if (!form.codigo.trim() || !form.descricao.trim()) { setFeedback({ type: "error", message: "Informe o código e a descrição do bem." }); return; }
    setBusy(true); setFeedback(null);
    const dto = { codigo: form.codigo.trim(), descricao: form.descricao.trim(), funcao: form.funcao, vida_util_meses: Number(form.vida) || 0,
      conta_ativo_id: form.conta ? Number(form.conta) : null, cost_center_id: form.centro ? Number(form.centro) : null,
      data_entrada: form.entrada, icms_op: form.op, icms_st: form.st, icms_frete: form.frete, icms_difal: form.difal, numero_parcelas: Number(form.parcelas) || 0 };
    try {
      if (editId != null) await atualizarBemCIAP(editId, dto); else await criarBemCIAP(dto);
      novoBem(); await carregarBens();
      setFeedback({ type: "success", message: `Bem ${dto.codigo} salvo no CIAP.` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function confirmarBaixa() {
    if (!baixa) return;
    if (!baixa.motivo.trim()) { setFeedback({ type: "error", message: "Informe o motivo da baixa." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await baixarBemCIAP(baixa.id, baixa.tipo, baixa.data, baixa.motivo);
      setBaixa(null); await carregarBens();
      setFeedback({ type: "success", message: "Bem baixado do CIAP: deixa de apropriar as parcelas restantes." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function excluir(b: BemCIAP) {
    setBusy(true); setFeedback(null);
    try { await excluirBemCIAP(b.id); await carregarBens(); setFeedback({ type: "success", message: `Bem ${b.codigo} excluído.` }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  const bensFiltrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return bens.filter((b) => !t || b.codigo.toLowerCase().includes(t) || b.descricao.toLowerCase().includes(t) || (b.documento ?? "").toLowerCase().includes(t));
  }, [bens, busca]);

  // ─── Parâmetros ─────────────────────────────────────────────────────────────
  const [par, setPar] = useState<ParametrosCIAP>({ codigo_ajuste: "", conta_ativo_id: null, numero_parcelas: 48 });
  useEffect(() => { if (aba === "parametros") parametrosCIAP().then(setPar).catch((e) => setFeedback({ type: "error", message: errMessage(e) })); }, [aba]);
  async function salvarPar() {
    setBusy(true); setFeedback(null);
    try { setPar(await salvarParametrosCIAP(par)); setFeedback({ type: "success", message: "Parâmetros do CIAP salvos." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const situacao: Record<string, [string, string]> = { ATIVO: ["Ativo", "erp-badge-green"], BAIXADO: ["Baixado", "erp-badge-gray"], ENCERRADO: ["Encerrado", "erp-badge-blue"] };
  const campo = (k: keyof FormBem, rotulo: string, cls: string, extra?: { tipo?: string; travado?: boolean; placeholder?: string; req?: boolean }) => (
    <div className={`erp-field ${cls}`}><label className={`erp-label${extra?.req ? " erp-req" : ""}`}>{rotulo}</label>
      <input className="erp-input" type={extra?.tipo ?? "text"} inputMode={extra?.tipo ? undefined : undefined} value={form[k]} placeholder={extra?.placeholder}
        disabled={extra?.travado} onChange={(e) => setF(k, e.target.value)} /></div>
  );

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">CIAP — Crédito do ICMS do Ativo</span><span className="erp-crumb-code">VFIS0345</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        {aba === "apuracao" && (<>
          <div className="erp-tgroup"><span className="erp-tgroup-label">Apuração</span>
            <button className="erp-btn" onClick={() => void simular()} disabled={busy || !!apur?.fechada}>Calcular</button>
            <button className="erp-btn erp-btn-primary" onClick={() => void apurar()} disabled={busy || !!apur?.fechada}>Apurar e gravar</button>
            {apur?.gravada && (apur.fechada
              ? <button className="erp-btn" onClick={() => void fechar(false)} disabled={busy || !isAdmin} title={isAdmin ? undefined : "Só o administrador reabre"}>Reabrir mês</button>
              : <button className="erp-btn" onClick={() => void fechar(true)} disabled={busy}>Fechar mês</button>)}
          </div>
        </>)}
        {aba === "bens" && (
          <div className="erp-tgroup"><span className="erp-tgroup-label">Bens</span>
            <button className="erp-btn" onClick={novoBem} disabled={busy}>+ Bem manual</button>
            <button className="erp-btn erp-btn-primary" onClick={() => void salvarBem()} disabled={busy}>{editId != null ? "Salvar bem" : "Incluir bem"}</button></div>
        )}
        {aba === "parametros" && (
          <div className="erp-tgroup"><span className="erp-tgroup-label">Parâmetros</span>
            <button className="erp-btn erp-btn-primary" onClick={() => void salvarPar()} disabled={busy}>Salvar parâmetros</button></div>
        )}
        <div className="erp-tspacer" /><div className="erp-tgroup"><ExportButton title="VFIS0345 — CIAP" filename="vfis0345" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <section className="erp-detail-panel">
          <div className="erp-tabs">
            <button className={`erp-tab ${aba === "apuracao" ? "active" : ""}`} onClick={() => setAba("apuracao")}>Apuração do mês</button>
            <button className={`erp-tab ${aba === "bens" ? "active" : ""}`} onClick={() => setAba("bens")}>Bens</button>
            <button className={`erp-tab ${aba === "parametros" ? "active" : ""}`} onClick={() => setAba("parametros")}>Parâmetros</button>
          </div>
          <div className="erp-detail-body">

          {aba === "apuracao" && (<>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Mês — <span style={{ fontWeight: 400, opacity: 0.65 }}>{apur?.gravada ? (apur.fechada ? "apurado e fechado" : `apurado em ${apur.apurado_em ? new Date(apur.apurado_em).toLocaleString("pt-BR") : ""}`) : "prévia (ainda não gravada)"}</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label">Ano</label>
                <input className="erp-input num" type="number" value={ano} onChange={(e) => setAno(Number(e.target.value) || agora.getFullYear())} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Mês</label>
                <select className="erp-input" value={mes} onChange={(e) => setMes(Number(e.target.value))}>{MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
              <div className="erp-field erp-c3"><label className="erp-label">Saídas tributadas e exportação</label>
                <input className="erp-input num" inputMode="decimal" value={trib} placeholder={apur ? moeda(apur.sugerido_trib_exp) : ""} disabled={!!apur?.fechada} onChange={(e) => setTrib(e.target.value)} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Total de saídas</label>
                <input className="erp-input num" inputMode="decimal" value={total} placeholder={apur ? moeda(apur.sugerido_total) : ""} disabled={!!apur?.fechada} onChange={(e) => setTotal(e.target.value)} /></div>
              <div className="erp-field erp-c12"><span className="erp-field-hint">Em branco, valem as saídas das NF-e autorizadas do mês (linha com ICMS destacado ou CFOP 7 = tributada/exportação), mostradas em cinza. Ajuste quando a legislação da UF excluir operações do cálculo.</span></div>
            </div></div>

            {apur && (<>
              <div className="erp-fieldset"><div className="erp-fieldset-head">G110 — crédito do mês</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <table className="erp-grid"><tbody>
                  <tr><td>Saldo inicial do CIAP (bens anteriores ao mês)</td><td className="num">{moeda(apur.saldo_inicial)}</td></tr>
                  <tr><td>Soma das parcelas do mês</td><td className="num">{moeda(apur.soma_parcelas)}</td></tr>
                  <tr><td>Saídas tributadas e de exportação ÷ total de saídas</td><td className="num">{moeda(apur.saidas_trib_exp)} ÷ {moeda(apur.saidas_total)}</td></tr>
                  <tr><td>Índice de participação</td><td className="num">{num(apur.indice).toLocaleString("pt-BR", { minimumFractionDigits: 8, maximumFractionDigits: 8 })}</td></tr>
                  <tr><td style={{ fontWeight: 700 }}>ICMS a apropriar na apuração (E111)</td><td className="num" style={{ fontWeight: 700 }}>{moeda(apur.icms_apropriado)}</td></tr>
                </tbody></table>
              </div></div></div>
              <div className="erp-fieldset"><div className="erp-fieldset-head">G125 — movimentos — <span style={{ fontWeight: 400, opacity: 0.65 }}>{apur.movimentos?.length ?? 0}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                <table className="erp-grid">
                  <thead><tr><th>Bem</th><th>Descrição</th><th>Movimento</th><th>Data</th><th className="num">Parcela</th><th className="num">Valor da parcela</th></tr></thead>
                  <tbody>
                    {(apur.movimentos ?? []).length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum bem apropriando neste mês.</td></tr>}
                    {(apur.movimentos ?? []).map((m) => (
                      <tr key={`${m.bem_id}-${m.tipo_mov}`}>
                        <td style={{ fontWeight: 600 }}>{m.codigo}</td><td>{m.descricao}</td><td>{m.tipo_mov} — {TIPO_MOV[m.tipo_mov]}</td>
                        <td>{dataBR(m.data)}</td><td className="num">{m.numero_parcela ? `${m.numero_parcela}` : "—"}</td>
                        <td className="num">{m.numero_parcela ? moeda(m.valor_parcela) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div></div></div>
            </>)}

            <div className="erp-fieldset"><div className="erp-fieldset-head">Apurações de {ano}</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>Mês</th><th className="num">Parcelas</th><th className="num">Índice</th><th className="num">Crédito</th><th>Saídas</th><th>Situação</th></tr></thead>
                <tbody>
                  {historico.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum mês apurado neste ano.</td></tr>}
                  {historico.map((h) => (
                    <tr key={h.mes} style={{ cursor: "pointer" }} onClick={() => setMes(h.mes)}>
                      <td>{MESES[h.mes - 1]}</td><td className="num">{moeda(h.soma_parcelas)}</td>
                      <td className="num">{num(h.indice).toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 8 })}</td>
                      <td className="num">{moeda(h.icms_apropriado)}</td><td>{h.saidas_informadas ? "informadas" : "das NF-e"}</td>
                      <td>{h.fechada ? <span className="erp-badge erp-badge-gray">Fechado</span> : <span className="erp-badge erp-badge-green">Aberto</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div></div>
          </>)}

          {aba === "bens" && (<>
            <div className="erp-fieldset"><div className="erp-fieldset-head">{editId != null ? `Bem ${form.codigo}` : "Bem manual — anterior ao sistema ou sem nota no sistema"}{valoresTravados && <span style={{ fontWeight: 400, opacity: 0.65 }}> — valores e entrada não mudam (bem da nota ou já com parcela)</span>}</div><div className="erp-fieldset-body">
              {campo("codigo", "Código (controle patrimonial)", "erp-c3", { req: true })}
              {campo("descricao", "Descrição", "erp-c5", { req: true })}
              {campo("funcao", "Função na atividade", "erp-c4", { placeholder: "ex.: usinagem de peças" })}
              <div className="erp-field erp-c4"><label className="erp-label">Conta contábil do ativo</label>
                <select className="erp-input" value={form.conta} onChange={(e) => setF("conta", e.target.value)}>
                  <option value="">— a dos parâmetros —</option>{contas.map((c) => <option key={c.id} value={String(c.id)}>{c.account_number} — {c.description}</option>)}
                </select></div>
              <div className="erp-field erp-c4"><label className="erp-label">Centro de custo de uso</label>
                <select className="erp-input" value={form.centro} onChange={(e) => setF("centro", e.target.value)}>
                  <option value="">—</option>{centros.filter((c) => c.is_active).map((c) => <option key={c.id} value={String(c.id)}>{c.codigo} — {c.descricao}</option>)}
                </select></div>
              {campo("vida", "Vida útil (meses)", "erp-c2", { tipo: "number" })}
              {campo("parcelas", "Parcelas", "erp-c2", { tipo: "number", travado: valoresTravados, placeholder: "48" })}
              {campo("entrada", "Entrada", "erp-c2", { tipo: "date", travado: valoresTravados, req: true })}
              {campo("op", "ICMS da operação", "erp-c2", { travado: valoresTravados })}
              {campo("st", "ICMS-ST", "erp-c2", { travado: valoresTravados })}
              {campo("frete", "ICMS do frete", "erp-c2", { travado: valoresTravados })}
              {campo("difal", "ICMS diferencial de alíquota", "erp-c2", { travado: valoresTravados })}
            </div></div>

            {baixa && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Baixar o bem do CIAP</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c4"><label className="erp-label">Tipo</label>
                  <select className="erp-input" value={baixa.tipo} onChange={(e) => setBaixa({ ...baixa, tipo: e.target.value })}>{BAIXAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                <div className="erp-field erp-c2"><label className="erp-label">Data</label><input className="erp-input" type="date" value={baixa.data} onChange={(e) => setBaixa({ ...baixa, data: e.target.value })} /></div>
                <div className="erp-field erp-c4"><label className="erp-label erp-req">Motivo</label><input className="erp-input" value={baixa.motivo} onChange={(e) => setBaixa({ ...baixa, motivo: e.target.value })} /></div>
                <div className="erp-field erp-c2" style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <button className="erp-btn erp-btn-primary" onClick={() => void confirmarBaixa()} disabled={busy}>Baixar</button>
                  <button className="erp-btn" onClick={() => setBaixa(null)} disabled={busy}>Cancelar</button></div>
                <div className="erp-field erp-c12"><span className="erp-field-hint">Antes do fim das parcelas, o bem que sai deixa de apropriar o restante (LC 87/1996, art. 20, § 5º, V). No mês da baixa, o bem não apropria parcela.</span></div>
              </div></div>
            )}

            <div className="erp-fieldset"><div className="erp-fieldset-head">Bens no CIAP — <span style={{ fontWeight: 400, opacity: 0.65 }}>os da nota de entrada aprovada com CFOP de ativo (x551/x406) entram sozinhos</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c6"><label className="erp-label">Buscar</label><input className="erp-input" value={busca} placeholder="código, descrição ou nota" onChange={(e) => setBusca(e.target.value)} /></div>
              <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                <table className="erp-grid">
                  <thead><tr><th>Código</th><th>Descrição</th><th>Origem</th><th>Entrada</th><th className="num">ICMS total</th><th className="num">Parcela</th><th className="num">Apropriadas</th><th>Conta</th><th>Situação</th><th style={{ width: 170 }}>Ações</th></tr></thead>
                  <tbody>
                    {bensFiltrados.length === 0 && <tr><td colSpan={10} className="erp-grid-empty">{bens.length === 0 ? "Nenhum bem no CIAP." : "Nenhum bem para a busca."}</td></tr>}
                    {bensFiltrados.map((b) => (
                      <tr key={b.id} style={b.situacao === "BAIXADO" ? { opacity: 0.6 } : undefined}>
                        <td style={{ fontWeight: 600 }}>{b.codigo}</td><td>{b.descricao}</td>
                        <td>{b.origem === "MANUAL" ? "Manual" : b.documento ?? "Nota"}</td><td>{dataBR(b.data_entrada)}</td>
                        <td className="num">{moeda(b.total)}</td><td className="num">{moeda(b.valor_parcela)}</td>
                        <td className="num">{b.parcelas_usadas}/{b.numero_parcelas}</td>
                        <td>{b.conta ?? <span className="erp-badge erp-badge-amber" title="A EFD exige a conta do ativo (0300/COD_CTA)">sem conta</span>}</td>
                        <td><span className={`erp-badge ${situacao[b.situacao]?.[1] ?? ""}`}>{situacao[b.situacao]?.[0] ?? b.situacao}</span>{b.data_baixa ? <small> {b.tipo_baixa} em {dataBR(b.data_baixa)}</small> : null}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="erp-btn erp-btn-sm" onClick={() => editarBem(b)}>Editar</button>{" "}
                          {b.situacao === "ATIVO" && <button className="erp-btn erp-btn-sm" onClick={() => setBaixa({ id: b.id, tipo: "AT", data: hoje(), motivo: "" })}>Baixar</button>}{" "}
                          {b.origem === "MANUAL" && b.parcelas_usadas === 0 && isAdmin && <button className="erp-btn erp-btn-sm" onClick={() => void excluir(b)}>Excluir</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div></div>
          </>)}

          {aba === "parametros" && (
            <div className="erp-fieldset"><div className="erp-fieldset-head">Parâmetros do CIAP</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c3"><label className="erp-label">Código de ajuste do crédito (E111)</label>
                <input className="erp-input" maxLength={8} value={par.codigo_ajuste ?? ""} placeholder="UF02xxxx" onChange={(e) => setPar({ ...par, codigo_ajuste: e.target.value.toUpperCase() })} /></div>
              <div className="erp-field erp-c5"><label className="erp-label">Conta do ativo padrão (bens da nota)</label>
                <select className="erp-input" value={par.conta_ativo_id ? String(par.conta_ativo_id) : ""} onChange={(e) => setPar({ ...par, conta_ativo_id: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">—</option>{contas.map((c) => <option key={c.id} value={String(c.id)}>{c.account_number} — {c.description}</option>)}
                </select></div>
              <div className="erp-field erp-c2"><label className="erp-label">Parcelas</label>
                <input className="erp-input num" type="number" value={par.numero_parcelas} onChange={(e) => setPar({ ...par, numero_parcelas: Number(e.target.value) || 0 })} /></div>
              <div className="erp-field erp-c12"><span className="erp-field-hint">O código de ajuste é o de "outros créditos" da tabela 5.1.1 da UF da empresa (8 caracteres, o 4º é 2) — escolha o da sua UF na VFIS0510 ou confirme com o contador. Sem ele, o crédito do CIAP fica fora do E111 e a EFD avisa. 48 parcelas é a regra da LC 87/1996; mude só se a legislação da UF mandar.</span></div>
            </div></div>
          )}
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Bens: <strong>{bens.length}</strong></div>
        {apur && <div className="erp-status-item">Crédito de {MESES[mes - 1]}: <strong>R$ {moeda(apur.icms_apropriado)}</strong></div>}
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type EstadoDoItem, type EventoAmostragem, type PlanoAmostragem, type PlanoDoLote, type ProcedimentoAmostragem, type ProcedimentoAmostragemDTO,
  type Severidade, type TabelasAmostragem, type TipoProcedimento,
  calcularAmostragem, estadosAmostragem, eventosAmostragem, liberarSuspensaoAmostragem, listarProcedimentosAmostragem, planoDoLote,
  rotuloDaChave, salvarProcedimentoAmostragem, tabelasAmostragem,
} from "@/services/amostragemService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { useAcessoStore } from "@/store/acessoStore";
import { useAuthStore } from "@/store/authStore";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Aba = "calculadora" | "procedimentos" | "severidade";

const ROTULO_SEV: Record<Severidade, [string, string]> = {
  NORMAL: ["Normal", "erp-badge-blue"], APERTADA: ["Apertada", "erp-badge-amber"], ATENUADA: ["Atenuada", "erp-badge-green"],
};
const ROTULO_TIPO: Record<TipoProcedimento, string> = { NORMA: "NBR 5426", FIXO: "Plano fixo", CEM: "100 %" };
const ROTULO_EVENTO: Record<string, string> = { TROCA: "Troca", SUSPENSAO: "Suspensão", LIBERACAO: "Liberação" };
const dataHora = (s?: string) => (s ? new Date(s).toLocaleString("pt-BR") : "—");
const nqaBR = (s?: string) => (s ?? "").replace(".", ",");
const inteiro = (s: string) => {
  const n = Number(s.trim());
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

const VAZIO: ProcedimentoAmostragemDTO = { codigo: "", descricao: "", tipo: "NORMA", nivel: "II", nqa: "1.0", permite_atenuada: false, ativo: true };
type FormProc = { id: number | null; dto: ProcedimentoAmostragemDTO; amostra: string; ac: string; re: string; skipApos: string; skipFreq: string };
const formDe = (p?: ProcedimentoAmostragem): FormProc => p
  ? {
    id: p.id,
    dto: { codigo: p.codigo, descricao: p.descricao, tipo: p.tipo, nivel: p.nivel || "II", nqa: p.nqa || "1.0", permite_atenuada: p.permite_atenuada, ativo: p.ativo },
    amostra: p.amostra_fixa ? String(p.amostra_fixa) : "", ac: p.ac_fixo != null ? String(p.ac_fixo) : "", re: p.re_fixo != null ? String(p.re_fixo) : "",
    skipApos: p.skip_lot.apos_aceitos ? String(p.skip_lot.apos_aceitos) : "", skipFreq: p.skip_lot.frequencia ? String(p.skip_lot.frequencia) : "",
  }
  : { id: null, dto: { ...VAZIO }, amostra: "", ac: "", re: "", skipApos: "", skipFreq: "" };

export function Vins0110Page(): JSX.Element {
  const isAdmin = useAuthStore((s) => s.user?.role?.toUpperCase() === "ADMIN");
  const acesso = useAcessoStore((s) => s.acesso);
  // Liberar a suspensão é ação APROVAR do módulo Qualidade; sem perfil vale o papel.
  const podeLiberar = !acesso?.restrito || acesso.permissoes.some((p) => p.modulo === "qualidade" && p.acao === "APROVAR") || isAdmin;

  const [aba, setAba] = useState<Aba>("calculadora");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const [tabelas, setTabelas] = useState<TabelasAmostragem | null>(null);

  const [calc, setCalc] = useState({ lote: "1000", nivel: "II", nqa: "1.0", severidade: "NORMAL" as Severidade });
  const [plano, setPlano] = useState<PlanoAmostragem | null>(null);
  const [comparativo, setComparativo] = useState<Partial<Record<Severidade, PlanoAmostragem>>>({});

  const [procs, setProcs] = useState<ProcedimentoAmostragem[]>([]);
  const [form, setForm] = useState<FormProc>(formDe());

  const [filtroItem, setFiltroItem] = useState("");
  const [estados, setEstados] = useState<EstadoDoItem[]>([]);
  const [eventos, setEventos] = useState<EventoAmostragem[]>([]);
  const [liberando, setLiberando] = useState<EstadoDoItem | null>(null);
  const [motivo, setMotivo] = useState("");
  // Simulação do próximo lote do item: plano pela severidade corrente.
  const [simula, setSimula] = useState<{ e: EstadoDoItem; qtd: string; r?: PlanoDoLote } | null>(null);

  useEffect(() => {
    tabelasAmostragem().then(setTabelas).catch((e) => setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar as tabelas da norma.") }));
  }, []);

  const recarregar = useCallback(async () => {
    setBusy(true);
    try {
      if (aba === "procedimentos") setProcs(await listarProcedimentosAmostragem());
      if (aba === "severidade") {
        const item = inteiro(filtroItem) ?? 0;
        const [e, ev] = await Promise.all([estadosAmostragem(item), eventosAmostragem(item)]);
        setEstados(e); setEventos(ev);
        if (procs.length === 0) setProcs(await listarProcedimentosAmostragem());
      }
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar a amostragem.") });
    } finally { setBusy(false); }
  }, [aba, filtroItem, procs.length]);
  useEffect(() => { void recarregar(); }, [aba]); // eslint-disable-line react-hooks/exhaustive-deps

  async function calcular() {
    const lote = inteiro(calc.lote);
    if (!lote || lote < 2) { setFeedback({ type: "error", message: "Informe o tamanho do lote em unidades inteiras (mínimo 2)." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const [p, n, a, t] = await Promise.all([
        calcularAmostragem(lote, calc.nivel, calc.nqa, calc.severidade),
        calcularAmostragem(lote, calc.nivel, calc.nqa, "NORMAL"),
        calcularAmostragem(lote, calc.nivel, calc.nqa, "APERTADA"),
        calcularAmostragem(lote, calc.nivel, calc.nqa, "ATENUADA"),
      ]);
      setPlano(p); setComparativo({ NORMAL: n, APERTADA: a, ATENUADA: t });
    } catch (e) { setPlano(null); setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function gravarProcedimento() {
    const f = form;
    const dto: ProcedimentoAmostragemDTO = { ...f.dto };
    if (dto.tipo === "FIXO") {
      dto.amostra_fixa = inteiro(f.amostra);
      dto.ac_fixo = f.ac.trim() === "" ? undefined : Number(f.ac);
      dto.re_fixo = f.re.trim() === "" ? undefined : Number(f.re);
    }
    if (dto.tipo !== "CEM" && (f.skipApos.trim() || f.skipFreq.trim())) {
      dto.skip_apos = Number(f.skipApos) || 0;
      dto.skip_frequencia = Number(f.skipFreq) || 0;
    }
    setBusy(true); setFeedback(null);
    try {
      const p = await salvarProcedimentoAmostragem(f.id, dto);
      setFeedback({ type: "success", message: `Procedimento ${p.codigo} gravado.` });
      setForm(formDe());
      setProcs(await listarProcedimentosAmostragem());
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function simular() {
    if (!simula) return;
    setBusy(true); setFeedback(null);
    try {
      const t = simula.qtd.trim();
      const qtd = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
      const r = await planoDoLote(simula.e.procedure_id, simula.e.item_code, simula.e.chave, qtd);
      setSimula((x) => (x ? { ...x, r } : x));
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function liberar() {
    if (!liberando) return;
    setBusy(true); setFeedback(null);
    try {
      await liberarSuspensaoAmostragem(liberando.procedure_id, liberando.item_code, liberando.chave, motivo);
      setFeedback({ type: "success", message: `Inspeção do item ${liberando.item_code} (${rotuloDaChave(liberando.chave)}) liberada; recomeça em apertada.` });
      setLiberando(null); setMotivo("");
      await recarregar();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const nomeProc = useMemo(() => Object.fromEntries(procs.map((p) => [p.id, p.codigo])), [procs]);
  const suspensos = estados.filter((e) => e.estado.suspensa).length;
  const setDto = (patch: Partial<ProcedimentoAmostragemDTO>) => setForm((f) => ({ ...f, dto: { ...f.dto, ...patch } }));

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Inspeção</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Amostragem NBR 5426</span><span className="erp-crumb-code">VINS0110</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Consulta</span>
          <button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Atualizar</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VINS0110 — Amostragem NBR 5426" filename="vins0110" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs">
            <button className={`erp-tab ${aba === "calculadora" ? "active" : ""}`} onClick={() => setAba("calculadora")}>Calculadora</button>
            <button className={`erp-tab ${aba === "procedimentos" ? "active" : ""}`} onClick={() => setAba("procedimentos")}>Procedimentos</button>
            <button className={`erp-tab ${aba === "severidade" ? "active" : ""}`} onClick={() => setAba("severidade")}>Severidade por item{suspensos > 0 ? ` (${suspensos} suspensos)` : ""}</button>
          </div>
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            {aba === "calculadora" && (
              <>
                <div className="erp-fieldset"><div className="erp-fieldset-head">Plano de amostragem simples</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c3"><label className="erp-label erp-req">Tamanho do lote (unidades)</label>
                    <input className="erp-input" inputMode="numeric" value={calc.lote} onChange={(e) => setCalc((c) => ({ ...c, lote: e.target.value }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Nível</label>
                    <select className="erp-input" value={calc.nivel} onChange={(e) => setCalc((c) => ({ ...c, nivel: e.target.value }))}>
                      {(tabelas?.niveis ?? ["II"]).map((n) => <option key={n} value={n}>{n}</option>)}
                    </select></div>
                  <div className="erp-field erp-c2"><label className="erp-label">NQA (%)</label>
                    <select className="erp-input" value={calc.nqa} onChange={(e) => setCalc((c) => ({ ...c, nqa: e.target.value }))}>
                      {(tabelas?.nqas ?? ["1.0"]).map((n) => <option key={n} value={n}>{nqaBR(n)}</option>)}
                    </select></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Severidade</label>
                    <select className="erp-input" value={calc.severidade} onChange={(e) => setCalc((c) => ({ ...c, severidade: e.target.value as Severidade }))}>
                      {(tabelas?.severidades ?? ["NORMAL"]).map((s) => <option key={s} value={s}>{ROTULO_SEV[s][0]}</option>)}
                    </select></div>
                  <div className="erp-field erp-c2"><label className="erp-label">&nbsp;</label>
                    <button className="erp-btn erp-btn-primary" onClick={() => void calcular()} disabled={busy}>Calcular</button></div>
                </div></div>
                {plano && (
                  <div className="erp-fieldset"><div className="erp-fieldset-head">Resultado</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                    <p style={{ margin: "0 0 8px" }}>
                      Letra-código <b>{plano.letra}</b>{plano.letra_da_tabela !== plano.letra ? <> (a seta da tabela leva ao plano da letra <b>{plano.letra_da_tabela}</b>)</> : null}:
                      inspecionar <b>{plano.n}</b> {plano.cem_por_cento ? "(o lote inteiro: a amostra alcança o lote)" : "unidades"}; aceitar com até <b>{plano.ac}</b> não conforme(s), recusar com <b>{plano.re}</b> ou mais.
                    </p>
                    <table className="erp-grid">
                      <thead><tr><th>Severidade</th><th>Letra da tabela</th><th className="num">Amostra (n)</th><th className="num">Ac</th><th className="num">Re</th></tr></thead>
                      <tbody>
                        {(["NORMAL", "APERTADA", "ATENUADA"] as Severidade[]).map((s) => {
                          const p = comparativo[s];
                          return p ? (
                            <tr key={s} style={s === plano.severidade ? { fontWeight: 600 } : undefined}>
                              <td><span className={`erp-badge ${ROTULO_SEV[s][1]}`}>{ROTULO_SEV[s][0]}</span></td>
                              <td>{p.letra_da_tabela}</td><td className="num">{p.n}{p.cem_por_cento ? " (100 %)" : ""}</td><td className="num">{p.ac}</td><td className="num">{p.re}</td>
                            </tr>
                          ) : null;
                        })}
                      </tbody>
                    </table>
                  </div></div></div>
                )}
                <div className="erp-fieldset"><div className="erp-fieldset-head">Como funciona</div><div className="erp-fieldset-body"><div className="erp-field erp-c12"><small>
                  Tabelas 1, 2-A, 2-B e 2-C da NBR 5426 (= ISO 2859-1). O nível II é o padrão da norma; S1 a S4 são para ensaios caros ou destrutivos.
                  A severidade muda sozinha por item e fornecedor: 2 lotes recusados em até 5 → apertada; 5 aceitos seguidos em apertada → normal;
                  pontuação de troca ≥ 30 com a atenuada autorizada no procedimento → atenuada; uma recusa em atenuada → normal.
                  Com 5 recusas acumuladas em apertada a inspeção é suspensa até a liberação.
                </small></div></div></div>
              </>
            )}

            {aba === "procedimentos" && (
              <>
                <div className="erp-fieldset"><div className="erp-fieldset-head">{form.id ? `Alterar ${form.dto.codigo}` : "Novo procedimento"}</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label>
                    <input className="erp-input" maxLength={20} value={form.dto.codigo} onChange={(e) => setDto({ codigo: e.target.value })} /></div>
                  <div className="erp-field erp-c5"><label className="erp-label erp-req">Descrição</label>
                    <input className="erp-input" value={form.dto.descricao} onChange={(e) => setDto({ descricao: e.target.value })} placeholder="Ex.: Recebimento de chapas — NQA 1,0" /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Tipo</label>
                    <select className="erp-input" value={form.dto.tipo} onChange={(e) => setDto({ tipo: e.target.value as TipoProcedimento })}>
                      <option value="NORMA">Pela NBR 5426 (nível + NQA)</option>
                      <option value="FIXO">Plano fixo da empresa (n, Ac, Re)</option>
                      <option value="CEM">Inspeção 100 %</option>
                    </select></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Situação</label>
                    <select className="erp-input" value={form.dto.ativo ? "1" : "0"} onChange={(e) => setDto({ ativo: e.target.value === "1" })}>
                      <option value="1">Ativo</option><option value="0">Inativo</option>
                    </select></div>
                  {form.dto.tipo === "NORMA" && (<>
                    <div className="erp-field erp-c2"><label className="erp-label">Nível</label>
                      <select className="erp-input" value={form.dto.nivel} onChange={(e) => setDto({ nivel: e.target.value })}>
                        {(tabelas?.niveis ?? ["II"]).map((n) => <option key={n} value={n}>{n}</option>)}
                      </select></div>
                    <div className="erp-field erp-c2"><label className="erp-label">NQA (%)</label>
                      <select className="erp-input" value={form.dto.nqa} onChange={(e) => setDto({ nqa: e.target.value })}>
                        {(tabelas?.nqas ?? ["1.0"]).map((n) => <option key={n} value={n}>{nqaBR(n)}</option>)}
                      </select></div>
                    <div className="erp-field erp-c4"><label className="erp-label">&nbsp;</label>
                      <label className="erp-check"><input type="checkbox" checked={form.dto.permite_atenuada} onChange={(e) => setDto({ permite_atenuada: e.target.checked })} /> Permitir inspeção atenuada</label></div>
                  </>)}
                  {form.dto.tipo === "FIXO" && (<>
                    <div className="erp-field erp-c2"><label className="erp-label erp-req">Amostra (n)</label>
                      <input className="erp-input" inputMode="numeric" value={form.amostra} onChange={(e) => setForm((f) => ({ ...f, amostra: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label erp-req">Ac</label>
                      <input className="erp-input" inputMode="numeric" value={form.ac} onChange={(e) => setForm((f) => ({ ...f, ac: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label erp-req">Re</label>
                      <input className="erp-input" inputMode="numeric" value={form.re} onChange={(e) => setForm((f) => ({ ...f, re: e.target.value }))} /></div>
                  </>)}
                  {form.dto.tipo !== "CEM" && (<>
                    <div className="erp-field erp-c2"><label className="erp-label">Skip-lot após</label>
                      <input className="erp-input" inputMode="numeric" placeholder="lotes aceitos" value={form.skipApos} onChange={(e) => setForm((f) => ({ ...f, skipApos: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Inspecionar 1 a cada</label>
                      <input className="erp-input" inputMode="numeric" placeholder="lotes" value={form.skipFreq} onChange={(e) => setForm((f) => ({ ...f, skipFreq: e.target.value }))} /></div>
                  </>)}
                  <div className="erp-field erp-c12" style={{ display: "flex", gap: 8 }}>
                    <button className="erp-btn erp-btn-primary" onClick={() => void gravarProcedimento()} disabled={busy}>Gravar</button>
                    {form.id && <button className="erp-btn" onClick={() => setForm(formDe())} disabled={busy}>Novo</button>}
                  </div>
                  <div className="erp-field erp-c12"><small>
                    O skip-lot é regra da empresa (a norma do skip-lot é a ISO 2859-3): depois de N lotes aceitos seguidos, só 1 a cada K é inspecionado; uma recusa volta a inspecionar todo lote. Nunca vale em apertada.
                    A amostragem pela norma conta unidades: para lote em kg ou metro, use plano fixo ou 100 %.
                  </small></div>
                </div></div>
                <div className="erp-fieldset"><div className="erp-fieldset-head">Procedimentos — <span style={{ fontWeight: 400, opacity: 0.65 }}>{procs.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                  <table className="erp-grid">
                    <thead><tr><th>Código</th><th>Descrição</th><th>Tipo</th><th>Critério</th><th>Atenuada</th><th>Skip-lot</th><th>Situação</th><th style={{ width: 150 }}>Ações</th></tr></thead>
                    <tbody>
                      {procs.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhum procedimento cadastrado.</td></tr>}
                      {procs.map((p) => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>{p.codigo}</td>
                          <td>{p.descricao}</td>
                          <td>{ROTULO_TIPO[p.tipo]}</td>
                          <td>{p.tipo === "NORMA" ? `Nível ${p.nivel}, NQA ${nqaBR(p.nqa)}` : p.tipo === "FIXO" ? `n ${p.amostra_fixa}, Ac ${p.ac_fixo}, Re ${p.re_fixo}` : "Lote inteiro"}</td>
                          <td>{p.tipo === "NORMA" ? (p.permite_atenuada ? "Sim" : "Não") : "—"}</td>
                          <td>{p.skip_lot.apos_aceitos ? `após ${p.skip_lot.apos_aceitos}, 1 a cada ${p.skip_lot.frequencia}` : "—"}</td>
                          <td><span className={`erp-badge ${p.ativo ? "erp-badge-green" : "erp-badge-gray"}`}>{p.ativo ? "Ativo" : "Inativo"}</span></td>
                          <td><button className="erp-btn erp-btn-sm" onClick={() => setForm(formDe(p))}>Alterar</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div></div></div>
              </>
            )}

            {aba === "severidade" && (
              <>
                <div className="erp-fieldset"><div className="erp-fieldset-head">Filtro</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c3"><label className="erp-label">Item</label>
                    <input className="erp-input" inputMode="numeric" placeholder="todos" value={filtroItem} onChange={(e) => setFiltroItem(e.target.value)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">&nbsp;</label>
                    <button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Consultar</button></div>
                </div></div>
                {liberando && (
                  <div className="erp-fieldset"><div className="erp-fieldset-head">Liberar a inspeção do item {liberando.item_code} — {rotuloDaChave(liberando.chave)}</div><div className="erp-fieldset-body">
                    <div className="erp-field erp-c12"><small>5 lotes foram recusados em apertada. Libere só depois que a ação do fornecedor (8D, troca de processo…) for aceita; a inspeção recomeça em apertada.</small></div>
                    <div className="erp-field erp-c8"><label className="erp-label erp-req">Ação que justifica a liberação</label>
                      <input className="erp-input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: 8D nº 12 aceito em 21/10" /></div>
                    <div className="erp-field erp-c4" style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                      <button className="erp-btn erp-btn-primary" onClick={() => void liberar()} disabled={busy || !motivo.trim()}>Liberar</button>
                      <button className="erp-btn" onClick={() => { setLiberando(null); setMotivo(""); }} disabled={busy}>Cancelar</button>
                    </div>
                  </div></div>
                )}
                {simula && (
                  <div className="erp-fieldset"><div className="erp-fieldset-head">Próximo lote do item {simula.e.item_code} — {rotuloDaChave(simula.e.chave)} · {simula.e.procedure_codigo}</div><div className="erp-fieldset-body">
                    <div className="erp-field erp-c3"><label className="erp-label erp-req">Quantidade do lote</label>
                      <input className="erp-input" inputMode="decimal" value={simula.qtd} onChange={(ev) => setSimula((x) => (x ? { ...x, qtd: ev.target.value, r: undefined } : x))} /></div>
                    <div className="erp-field erp-c9" style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                      <button className="erp-btn erp-btn-primary" onClick={() => void simular()} disabled={busy || !simula.qtd.trim()}>Calcular</button>
                      <button className="erp-btn" onClick={() => setSimula(null)} disabled={busy}>Fechar</button>
                    </div>
                    {simula.r && (
                      <div className="erp-field erp-c12"><p style={{ margin: 0 }}>
                        {!simula.r.inspecionar ? "Skip-lot: este lote seria liberado sem amostra."
                          : <>Severidade {simula.r.plano.severidade?.toLowerCase()}, letra {simula.r.plano.letra || "—"}: inspecionar <b>{simula.r.plano.n}</b>{simula.r.plano.cem_por_cento ? " (100 %)" : ""}, aceitar com até <b>{simula.r.plano.ac}</b> e recusar com <b>{simula.r.plano.re}</b> não conforme(s).</>}
                        {simula.r.suspensa && <> <span className="erp-badge erp-badge-red">Inspeção suspensa — o lote não pode ser aceito pela norma até a liberação</span></>}
                      </p></div>
                    )}
                  </div></div>
                )}
                <div className="erp-fieldset"><div className="erp-fieldset-head">Severidade corrente — <span style={{ fontWeight: 400, opacity: 0.65 }}>{estados.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                  <table className="erp-grid">
                    <thead><tr><th>Item</th><th>Unidade de controle</th><th>Procedimento</th><th>Severidade</th><th>Últimos lotes</th><th className="num">Pontuação</th><th className="num">Recusas em apertada</th><th className="num">Aceitos seguidos</th><th>Atualizado</th><th style={{ width: 150 }}>Ações</th></tr></thead>
                    <tbody>
                      {estados.length === 0 && <tr><td colSpan={10} className="erp-grid-empty">Nenhum lote registrado ainda.</td></tr>}
                      {estados.map((e) => (
                        <tr key={`${e.procedure_id}-${e.item_code}-${e.chave}`}>
                          <td style={{ fontWeight: 600 }}>{e.item_code}</td>
                          <td>{rotuloDaChave(e.chave)}</td>
                          <td>{e.procedure_codigo}</td>
                          <td>
                            <span className={`erp-badge ${ROTULO_SEV[e.estado.severidade][1]}`}>{ROTULO_SEV[e.estado.severidade][0]}</span>
                            {e.estado.suspensa && <> <span className="erp-badge erp-badge-red">Suspensa</span></>}
                          </td>
                          <td title="✔ aceito · ✖ recusado, do mais antigo ao mais recente">{(e.estado.ultimos ?? []).map((ok) => (ok ? "✔" : "✖")).join(" ") || "—"}</td>
                          <td className="num">{e.estado.pontuacao}</td>
                          <td className="num">{e.estado.recusas_em_apertada}</td>
                          <td className="num">{e.estado.aceitos_seguidos}</td>
                          <td><small>{dataHora(e.updated_at)}</small></td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            <button className="erp-btn erp-btn-sm" title="Plano do próximo lote pela severidade corrente" onClick={() => setSimula({ e, qtd: "" })}>Simular</button>
                            {e.estado.suspensa && podeLiberar && <> <button className="erp-btn erp-btn-sm" onClick={() => { setLiberando(e); setMotivo(""); }}>Liberar</button></>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div></div></div>
                <div className="erp-fieldset"><div className="erp-fieldset-head">Histórico de trocas — <span style={{ fontWeight: 400, opacity: 0.65 }}>{eventos.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                  <table className="erp-grid">
                    <thead><tr><th>Quando</th><th>Item</th><th>Unidade</th><th>Procedimento</th><th>Evento</th><th>De → Para</th><th>Motivo</th><th>Referência</th></tr></thead>
                    <tbody>
                      {eventos.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhuma troca de severidade.</td></tr>}
                      {eventos.map((ev) => (
                        <tr key={ev.id}>
                          <td><small>{dataHora(ev.created_at)}</small></td>
                          <td>{ev.item_code}</td>
                          <td>{rotuloDaChave(ev.chave)}</td>
                          <td>{nomeProc[ev.procedure_id] ?? ev.procedure_id}</td>
                          <td><span className={`erp-badge ${ev.evento === "SUSPENSAO" ? "erp-badge-red" : ev.evento === "LIBERACAO" ? "erp-badge-green" : "erp-badge-gray"}`}>{ROTULO_EVENTO[ev.evento] ?? ev.evento}</span></td>
                          <td>{ROTULO_SEV[ev.de]?.[0] ?? ev.de} → {ROTULO_SEV[ev.para]?.[0] ?? ev.para}</td>
                          <td>{ev.motivo}</td>
                          <td>{ev.referencia ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div></div></div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type AprovacaoRequisicao, type CentroDeCusto, type NoCentro, type OrcamentoCentro, type TipoCentro, type UsuarioDaEmpresa,
  aprovacoes as listarAprovacoes, arvore as carregarArvore, decidirAprovacao, listarCentros, listarUsuarios,
  orcamento as carregarOrcamento, salvarGestao, salvarOrcamento,
} from "@/services/costCenterGestaoService";
import { type UsoCostCenterResumo, createCostCenter, deleteCostCenter, updateCostCenter, usoCostCenter } from "@/services/costCenterService";
import { type PlanoConta, listPlanoContas } from "@/services/financialService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { useAuthStore } from "@/store/authStore";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Aba = "cadastro" | "orcamento" | "arvore" | "aprovacoes";

const TIPOS: Array<{ v: TipoCentro; l: string; ajuda: string }> = [
  { v: "PRODUCTIVE", l: "Produtivo", ajuda: "Produz diretamente o produto (corte, usinagem, montagem). Recebe rateio de absorção quando “Recebe rateio” está marcado." },
  { v: "AUXILIARY", l: "Auxiliar/Apoio", ajuda: "Apoia a produção (PCP, qualidade, almoxarifado, manutenção). Não recebe rateio de absorção." },
  { v: "ADMINISTRATIVE", l: "Administrativo", ajuda: "Área administrativa (financeiro, RH, TI). Só rateios primários." },
  { v: "COMMERCIAL", l: "Comercial/Vendas", ajuda: "Gestão comercial (vendas, marketing). Só rateios primários." },
];
const rotuloTipo = (t: string) => TIPOS.find((x) => x.v === t)?.l ?? t;
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const primeiroDoMes = () => `${hojeISO().slice(0, 8)}01`;
const dataBR = (s?: string | null) => (s ? new Date(`${s.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—");
const valor = (s?: string | number | null) => Number(s ?? 0);
const moeda = (s?: string | number | null) => valor(s).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// "1.234,56" ou "1234.56" → "1234.56" (decimal com ponto, como o backend lê).
const paraDecimal = (s: string) => { const t = s.trim(); if (t === "") return "0"; return t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t; };
const paraTela = (s: string) => (valor(s) === 0 ? "" : valor(s).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

type Form = {
  codigo: string; descricao: string; tipo: TipoCentro; parent: string; isRatio: boolean; inicio: string; fim: string; ativo: boolean;
  responsavel: string; aprovador: string; aprovaRequisicoes: boolean; conta: string;
};
const VAZIO = (): Form => ({
  codigo: "", descricao: "", tipo: "PRODUCTIVE", parent: "", isRatio: false, inicio: primeiroDoMes(), fim: "", ativo: true,
  responsavel: "", aprovador: "", aprovaRequisicoes: false, conta: "",
});

/**
 * VCTB0102 — o cadastro único de centro de custo. Junta o que estava em duas
 * telas (VCTB0102 e VFIN0130) e acrescenta a gestão: código da empresa,
 * responsável, aprovador das requisições, conta contábil padrão, orçamento
 * mensal × realizado e a árvore consolidada.
 */
export function Vctb0102Page(): JSX.Element {
  const isAdmin = useAuthStore((s) => s.user?.role?.toUpperCase() === "ADMIN");
  const usuarioAtual = useAuthStore((s) => s.user?.id);
  const [aba, setAba] = useState<Aba>("cadastro");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const [centros, setCentros] = useState<CentroDeCusto[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioDaEmpresa[]>([]);
  const [contas, setContas] = useState<PlanoConta[]>([]);

  const recarregar = useCallback(async () => {
    try { setCentros(await listarCentros()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar os centros de custo.") }); }
  }, []);
  useEffect(() => {
    void recarregar();
    listarUsuarios().then(setUsuarios).catch(() => setUsuarios([]));
    listPlanoContas().then(setContas).catch(() => setContas([]));
  }, [recarregar]);

  // Profundidade de cada centro na árvore (para recuar na lista).
  const porCode = useMemo(() => new Map(centros.map((c) => [c.code, c])), [centros]);
  const profundidade = useCallback((c: CentroDeCusto) => {
    let n = 0; let p = c.parent_code;
    while (p != null && n < 20) { const pai = porCode.get(p); if (!pai) break; n++; p = pai.parent_code; }
    return n;
  }, [porCode]);
  const ordenados = useMemo(() => {
    // Em árvore: cada pai seguido dos filhos, pelo código da empresa.
    const filhos = new Map<number | null, CentroDeCusto[]>();
    for (const c of centros) {
      const k = c.parent_code != null && porCode.has(c.parent_code) ? c.parent_code : null;
      filhos.set(k, [...(filhos.get(k) ?? []), c]);
    }
    const out: CentroDeCusto[] = [];
    const visitar = (k: number | null, n: number) => {
      for (const c of (filhos.get(k) ?? []).sort((a, b) => a.codigo.localeCompare(b.codigo))) {
        out.push(c); if (n < 20) visitar(c.code, n + 1);
      }
    };
    visitar(null, 0);
    return out;
  }, [centros, porCode]);

  // ─── Cadastro ───────────────────────────────────────────────────────────────
  const [form, setForm] = useState<Form>(VAZIO());
  const [editCode, setEditCode] = useState<number | null>(null);
  const [uso, setUso] = useState<UsoCostCenterResumo | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [busca, setBusca] = useState("");
  const [inativos, setInativos] = useState(false);
  const travado = editCode != null && (uso?.em_uso ?? true);
  const setF = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };

  function novo() { setForm(VAZIO()); setEditCode(null); setUso(null); setConfirmarExclusao(false); setFeedback(null); }
  async function editar(c: CentroDeCusto) {
    setForm({
      codigo: c.codigo, descricao: c.descricao, tipo: c.tipo, parent: c.parent_code != null ? String(c.parent_code) : "", isRatio: c.is_ratio,
      inicio: c.start_date.slice(0, 10), fim: c.end_date ? c.end_date.slice(0, 10) : "", ativo: c.is_active,
      responsavel: c.responsavel_id ?? "", aprovador: c.aprovador_id ?? "", aprovaRequisicoes: c.aprova_requisicoes, conta: c.conta_padrao_id ? String(c.conta_padrao_id) : "",
    });
    setEditCode(c.code); setUso(null); setConfirmarExclusao(false); setFeedback(null);
    try { setUso(await usoCostCenter(c.code)); } catch { setUso(null); }
  }

  // O centro-pai não pode ser o próprio centro nem um descendente dele.
  const descendentes = useMemo(() => {
    const s = new Set<number>();
    if (editCode == null) return s;
    const visitar = (code: number) => { for (const c of centros) if (c.parent_code === code && !s.has(c.code)) { s.add(c.code); visitar(c.code); } };
    visitar(editCode);
    return s;
  }, [centros, editCode]);

  function conferir(): string | null {
    if (!form.codigo.trim()) return "Informe o código do centro de custo.";
    if (!form.descricao.trim()) return "Informe a descrição.";
    if (!form.inicio) return "Informe a data de início.";
    if ((editCode == null || !travado) && !form.inicio.endsWith("-01")) return "A data de início é o 1º dia do mês.";
    if (form.fim && form.fim < form.inicio) return "A data de fim não pode ser anterior à de início.";
    if (form.aprovaRequisicoes && !form.aprovador) return "Para aprovar as requisições do centro, escolha o aprovador.";
    const outro = centros.find((c) => c.codigo.trim().toUpperCase() === form.codigo.trim().toUpperCase() && c.code !== editCode);
    if (outro) return `Já existe o centro ${outro.codigo} — ${outro.descricao}.`;
    return null;
  }

  async function salvar() {
    const erro = conferir();
    if (erro) { setFeedback({ type: "error", message: erro }); return; }
    setBusy(true); setFeedback(null);
    const gestao = {
      codigo: form.codigo.trim(), responsavel_id: form.responsavel || null, aprovador_id: form.aprovador || null,
      aprova_requisicoes: form.aprovaRequisicoes, conta_padrao_id: form.conta ? Number(form.conta) : null,
    };
    try {
      let code = editCode;
      if (code == null) {
        const criado = await createCostCenter({
          code: 0, description: form.descricao.trim(), parent_code: form.parent ? Number(form.parent) : undefined, type: form.tipo,
          is_ratio: form.isRatio, start_date: form.inicio, end_date: form.fim || undefined, created_by: usuarioAtual ?? "",
        });
        code = criado.code;
      } else {
        await updateCostCenter(code, {
          description: form.descricao.trim(), parent_code: form.parent ? Number(form.parent) : undefined, type: form.tipo,
          is_ratio: form.isRatio, start_date: form.inicio, end_date: form.fim || undefined, is_active: form.ativo,
        });
      }
      const salvo = await salvarGestao(code, gestao);
      await recarregar();
      await editar({ ...salvo, start_date: salvo.start_date ?? form.inicio });
      setFeedback({ type: "success", message: `Centro de custo ${salvo.codigo} — ${salvo.descricao} salvo.` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function excluir() {
    if (editCode == null) return;
    if (!confirmarExclusao) { setConfirmarExclusao(true); return; }
    setBusy(true); setFeedback(null);
    try {
      await deleteCostCenter(editCode);
      const codigo = form.codigo;
      novo(); await recarregar();
      setFeedback({ type: "success", message: `Centro de custo ${codigo} excluído.` });
    } catch (e) { setConfirmarExclusao(false); setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const listaFiltrada = ordenados.filter((c) => {
    if (!inativos && !c.is_active) return false;
    const t = busca.trim().toLowerCase();
    return !t || c.codigo.toLowerCase().includes(t) || c.descricao.toLowerCase().includes(t) || (c.responsavel ?? "").toLowerCase().includes(t);
  });

  // ─── Orçamento ──────────────────────────────────────────────────────────────
  const [ano, setAno] = useState(new Date().getFullYear());
  const [orc, setOrc] = useState<OrcamentoCentro[]>([]);
  const [celulas, setCelulas] = useState<Record<string, string>>({});
  const carregarOrc = useCallback(async () => {
    setBusy(true);
    try {
      const o = await carregarOrcamento(ano);
      setOrc(o);
      const m: Record<string, string> = {};
      for (const l of o) l.orcado.forEach((v, i) => { m[`${l.cost_center_id}:${i + 1}`] = paraTela(v); });
      setCelulas(m);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, [ano]);
  useEffect(() => { if (aba === "orcamento") void carregarOrc(); }, [aba, carregarOrc]);

  async function gravarOrcamento() {
    const linhas: Array<{ cost_center_id: number; mes: number; valor: string }> = [];
    for (const l of orc) {
      for (let mes = 1; mes <= 12; mes++) {
        const txt = celulas[`${l.cost_center_id}:${mes}`] ?? "";
        const novoValor = paraDecimal(txt);
        if (Number.isNaN(Number(novoValor))) { setFeedback({ type: "error", message: `Valor inválido em ${l.codigo} / ${MESES[mes - 1]}: ${txt}` }); return; }
        if (Number(novoValor) !== valor(l.orcado[mes - 1])) linhas.push({ cost_center_id: l.cost_center_id, mes, valor: novoValor });
      }
    }
    if (linhas.length === 0) { setFeedback({ type: "info", message: "Nenhum valor alterado." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const o = await salvarOrcamento(ano, linhas);
      setOrc(o);
      setFeedback({ type: "success", message: `${linhas.length} mês(es) de orçamento gravado(s).` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  const orcOrdenado = useMemo(() => {
    const ordem = new Map(ordenados.map((c, i) => [c.id, i]));
    return [...orc].sort((a, b) => (ordem.get(a.cost_center_id) ?? 0) - (ordem.get(b.cost_center_id) ?? 0));
  }, [orc, ordenados]);

  // ─── Árvore ─────────────────────────────────────────────────────────────────
  const [mesArvore, setMesArvore] = useState(new Date().getMonth() + 1);
  const [nos, setNos] = useState<NoCentro[]>([]);
  const carregarNos = useCallback(async () => {
    setBusy(true);
    try { setNos(await carregarArvore(ano, mesArvore)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, [ano, mesArvore]);
  useEffect(() => { if (aba === "arvore") void carregarNos(); }, [aba, carregarNos]);
  const linhasArvore = useMemo(() => {
    const out: Array<{ n: NoCentro; nivel: number }> = [];
    const visitar = (ns: NoCentro[], nivel: number) => { for (const n of ns) { out.push({ n, nivel }); visitar(n.filhos ?? [], nivel + 1); } };
    visitar(nos, 0);
    return out;
  }, [nos]);

  // ─── Aprovações ─────────────────────────────────────────────────────────────
  const [aprov, setAprov] = useState<AprovacaoRequisicao[]>([]);
  const [statusAprov, setStatusAprov] = useState("PENDENTE");
  const [minhas, setMinhas] = useState(true);
  const [motivo, setMotivo] = useState<Record<number, string>>({});
  const carregarAprov = useCallback(async () => {
    setBusy(true);
    try { setAprov(await listarAprovacoes({ status: statusAprov, minhas })); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, [statusAprov, minhas]);
  useEffect(() => { if (aba === "aprovacoes") void carregarAprov(); }, [aba, carregarAprov]);
  async function decidir(a: AprovacaoRequisicao, aprovar: boolean) {
    if (!aprovar && !(motivo[a.id] ?? "").trim()) { setFeedback({ type: "error", message: "Informe o motivo da reprovação." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await decidirAprovacao(a.id, aprovar, motivo[a.id] ?? "");
      setFeedback({ type: "success", message: `Requisição ${a.requisition_code} ${aprovar ? "aprovada" : "reprovada"} no centro ${a.centro_codigo}.` });
      await carregarAprov();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const tipoAtual = TIPOS.find((t) => t.v === form.tipo);
  const statusAprovRotulo: Record<string, [string, string]> = {
    PENDENTE: ["Pendente", "erp-badge-amber"], APROVADA: ["Aprovada", "erp-badge-green"], REPROVADA: ["Reprovada", "erp-badge-red"],
  };

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Contabilidade</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Centros de Custo</span><span className="erp-crumb-code">VCTB0102</span></nav>
        <div className="erp-titlebar-spacer" /><span className="erp-titlebar-meta">{centros.length} centro(s)</span>
      </header>

      <div className="erp-toolbar">
        {aba === "cadastro" && (<>
          <div className="erp-tgroup"><span className="erp-tgroup-label">Cadastro</span>
            <button className="erp-btn" onClick={novo} disabled={busy}>+ Novo centro</button></div>
          <div className="erp-tgroup"><span className="erp-tgroup-label">Ações</span>
            <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editCode != null ? "Salvar alteração" : "Cadastrar"}</button>
            {editCode != null && isAdmin && (
              <button className="erp-btn" onClick={() => void excluir()} disabled={busy || travado}
                title={travado ? "Centro em uso: desative em vez de excluir" : undefined}>{confirmarExclusao ? "Confirmar exclusão" : "Excluir"}</button>
            )}</div>
        </>)}
        {aba === "orcamento" && (
          <div className="erp-tgroup"><span className="erp-tgroup-label">Orçamento</span>
            <button className="erp-btn erp-btn-primary" onClick={() => void gravarOrcamento()} disabled={busy}>Gravar orçamento</button>
            <button className="erp-btn" onClick={() => void carregarOrc()} disabled={busy}>Recarregar</button></div>
        )}
        <div className="erp-tspacer" /><div className="erp-tgroup"><ExportButton title="VCTB0102 — Centros de Custo" filename="vctb0102" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <section className="erp-detail-panel">
          <div className="erp-tabs">
            <button className={`erp-tab ${aba === "cadastro" ? "active" : ""}`} onClick={() => setAba("cadastro")}>Cadastro</button>
            <button className={`erp-tab ${aba === "orcamento" ? "active" : ""}`} onClick={() => setAba("orcamento")}>Orçamento</button>
            <button className={`erp-tab ${aba === "arvore" ? "active" : ""}`} onClick={() => setAba("arvore")}>Árvore e realizado</button>
            <button className={`erp-tab ${aba === "aprovacoes" ? "active" : ""}`} onClick={() => setAba("aprovacoes")}>Aprovações de requisição</button>
          </div>
          <div className="erp-detail-body">

          {aba === "cadastro" && (<>
            <div className="erp-fieldset"><div className="erp-fieldset-head">{editCode != null ? `Centro ${form.codigo}` : "Novo centro de custo"}{travado && <span style={{ fontWeight: 400, opacity: 0.65 }}> — em uso: tipo, centro-pai, rateio e início não mudam</span>}</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label>
                <input className="erp-input" value={form.codigo} maxLength={50} placeholder="CC-FAB-CORTE" onChange={(e) => setF("codigo", e.target.value.toUpperCase())} /></div>
              <div className="erp-field erp-c5"><label className="erp-label erp-req">Descrição</label>
                <input className="erp-input" value={form.descricao} onChange={(e) => setF("descricao", e.target.value)} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Centro-pai</label>
                <select className="erp-input" value={form.parent} disabled={travado} onChange={(e) => setF("parent", e.target.value)}>
                  <option value="">— raiz —</option>
                  {ordenados.filter((c) => c.code !== editCode && !descendentes.has(c.code) && c.is_active).map((c) => (
                    <option key={c.code} value={String(c.code)}>{"  ".repeat(profundidade(c))}{c.codigo} — {c.descricao}</option>))}
                </select></div>
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Tipo</label>
                <select className="erp-input" value={form.tipo} disabled={travado} onChange={(e) => setF("tipo", e.target.value as TipoCentro)}>
                  {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select></div>
              {tipoAtual && <div className="erp-field erp-c12"><span className="erp-field-hint">{tipoAtual.ajuda}</span></div>}
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Início</label>
                <input className="erp-input" type="date" value={form.inicio} disabled={travado} onChange={(e) => setF("inicio", e.target.value)} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Fim</label>
                <input className="erp-input" type="date" value={form.fim} onChange={(e) => setF("fim", e.target.value)} /></div>
              <div className="erp-field erp-c3" style={{ display: "flex", alignItems: "flex-end" }}><label className="erp-check">
                <input type="checkbox" checked={form.isRatio} disabled={travado} onChange={(e) => setF("isRatio", e.target.checked)} /> Recebe rateio de absorção</label></div>
              {editCode != null && <div className="erp-field erp-c2" style={{ display: "flex", alignItems: "flex-end" }}><label className="erp-check">
                <input type="checkbox" checked={form.ativo} onChange={(e) => setF("ativo", e.target.checked)} /> Ativo</label></div>}
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Gestão — <span style={{ fontWeight: 400, opacity: 0.65 }}>quem responde pelo centro e quem aprova as requisições</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c3"><label className="erp-label">Responsável</label>
                <select className="erp-input" value={form.responsavel} onChange={(e) => setF("responsavel", e.target.value)}>
                  <option value="">—</option>{usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select></div>
              <div className="erp-field erp-c3"><label className="erp-label">Aprovador</label>
                <select className="erp-input" value={form.aprovador} onChange={(e) => setF("aprovador", e.target.value)}>
                  <option value="">—</option>{usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select></div>
              <div className="erp-field erp-c3" style={{ display: "flex", alignItems: "flex-end" }}><label className="erp-check" title="A requisição de compra com item deste centro só vira pedido depois que o aprovador aprovar.">
                <input type="checkbox" checked={form.aprovaRequisicoes} onChange={(e) => setF("aprovaRequisicoes", e.target.checked)} /> Aprova as requisições de compra</label></div>
              <div className="erp-field erp-c3"><label className="erp-label">Conta contábil padrão</label>
                <select className="erp-input" value={form.conta} onChange={(e) => setF("conta", e.target.value)} title="Vale na nota de entrada quando o item tem este centro e nenhuma conta">
                  <option value="">—</option>{contas.map((p) => <option key={p.id} value={String(p.id)}>{p.codigo} — {p.descricao}</option>)}
                </select></div>
              {uso?.em_uso && <div className="erp-field erp-c12"><span className="erp-field-hint">Em uso: {uso.usos.map((u) => `${u.onde} (${u.quantidade})`).join(", ")}.</span></div>}
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Centros de custo — <span style={{ fontWeight: 400, opacity: 0.65 }}>{listaFiltrada.length}</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c6"><label className="erp-label">Buscar</label>
                <input className="erp-input" value={busca} placeholder="código, descrição ou responsável" onChange={(e) => setBusca(e.target.value)} /></div>
              <div className="erp-field erp-c3" style={{ display: "flex", alignItems: "flex-end" }}><label className="erp-check">
                <input type="checkbox" checked={inativos} onChange={(e) => setInativos(e.target.checked)} /> Mostrar inativos</label></div>
              <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                <table className="erp-grid">
                  <thead><tr><th>Código</th><th>Descrição</th><th>Tipo</th><th>Vigência</th><th>Responsável</th><th>Aprovação</th><th>Situação</th><th style={{ width: 80 }}>Ações</th></tr></thead>
                  <tbody>
                    {listaFiltrada.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">{centros.length === 0 ? "Nenhum centro de custo cadastrado." : "Nenhum centro para o filtro."}</td></tr>}
                    {listaFiltrada.map((c) => (
                      <tr key={c.code} style={c.is_active ? undefined : { opacity: 0.55 }} className={c.code === editCode ? "erp-row-selected" : undefined}>
                        <td style={{ fontWeight: 600, paddingLeft: 8 + profundidade(c) * 16 }}>{c.codigo}</td>
                        <td>{c.descricao}</td><td>{rotuloTipo(c.tipo)}</td>
                        <td><small>{dataBR(c.start_date)}{c.end_date ? ` a ${dataBR(c.end_date)}` : ""}</small></td>
                        <td>{c.responsavel || "—"}</td>
                        <td>{c.aprova_requisicoes ? <span className="erp-badge erp-badge-blue" title={`Aprovador: ${c.aprovador ?? ""}`}>{c.aprovador || "sim"}</span> : "—"}</td>
                        <td>{c.is_active ? <span className="erp-badge erp-badge-green">Ativo</span> : <span className="erp-badge erp-badge-gray">Inativo</span>}</td>
                        <td><button className="erp-btn erp-btn-sm" onClick={() => void editar(c)}>Editar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div></div>
          </>)}

          {aba === "orcamento" && (
            <div className="erp-fieldset"><div className="erp-fieldset-head">Orçamento mensal × realizado — <span style={{ fontWeight: 400, opacity: 0.65 }}>o realizado vem do contas a pagar (rateio do título), pela data de emissão</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label">Ano</label>
                <input className="erp-input num" type="number" value={ano} onChange={(e) => setAno(Number(e.target.value) || new Date().getFullYear())} /></div>
              <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                <table className="erp-grid">
                  <thead><tr><th>Centro</th>{MESES.map((m) => <th key={m} className="num">{m}</th>)}<th className="num">Orçado</th><th className="num">Realizado</th></tr></thead>
                  <tbody>
                    {orcOrdenado.length === 0 && <tr><td colSpan={15} className="erp-grid-empty">Nenhum centro de custo.</td></tr>}
                    {orcOrdenado.map((l) => {
                      const totalOrc = l.orcado.reduce((s, v) => s + valor(v), 0);
                      const totalReal = l.realizado.reduce((s, v) => s + valor(v), 0);
                      const c = centros.find((x) => x.id === l.cost_center_id);
                      return (
                        <tr key={l.cost_center_id}>
                          <td style={{ fontWeight: 600, whiteSpace: "nowrap", paddingLeft: 8 + (c ? profundidade(c) : 0) * 16 }} title={l.descricao}>{l.codigo}</td>
                          {MESES.map((m, i) => {
                            const real = valor(l.realizado[i]); const orcado = valor(l.orcado[i]);
                            const estourou = orcado > 0 && real > orcado;
                            return (
                              <td key={m} style={{ minWidth: 92 }}>
                                <input className="erp-input num" style={{ height: 26, padding: "0 4px" }} inputMode="decimal" aria-label={`Orçado ${l.codigo} ${m}`}
                                  value={celulas[`${l.cost_center_id}:${i + 1}`] ?? ""} onChange={(e) => setCelulas((x) => ({ ...x, [`${l.cost_center_id}:${i + 1}`]: e.target.value }))} />
                                {real > 0 && <small style={{ display: "block", textAlign: "right", color: estourou ? "var(--v-err)" : undefined }}>{moeda(real)}</small>}
                              </td>
                            );
                          })}
                          <td className="num">{moeda(totalOrc)}</td>
                          <td className="num" style={{ color: totalOrc > 0 && totalReal > totalOrc ? "var(--v-err)" : undefined }}>{moeda(totalReal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <small>Digite o orçado de cada mês; embaixo, em menor, o realizado (em vermelho quando passou do orçado). O alerta “Orçamento do centro de custo estourado” avisa no mês corrente.</small>
              </div>
            </div></div>
          )}

          {aba === "arvore" && (
            <div className="erp-fieldset"><div className="erp-fieldset-head">Árvore consolidada — <span style={{ fontWeight: 400, opacity: 0.65 }}>cada centro soma os filhos</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label">Ano</label>
                <input className="erp-input num" type="number" value={ano} onChange={(e) => setAno(Number(e.target.value) || new Date().getFullYear())} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Mês</label>
                <select className="erp-input" value={mesArvore} onChange={(e) => setMesArvore(Number(e.target.value))}>
                  <option value={0}>Ano todo</option>{MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select></div>
              <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                <table className="erp-grid">
                  <thead><tr><th>Centro</th><th>Descrição</th><th>Responsável</th><th className="num">Orçado (próprio)</th><th className="num">Realizado (próprio)</th><th className="num">Orçado consolidado</th><th className="num">Realizado consolidado</th><th className="num">% usado</th></tr></thead>
                  <tbody>
                    {linhasArvore.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhum centro de custo.</td></tr>}
                    {linhasArvore.map(({ n, nivel }) => {
                      const pct = valor(n.orcado_consolidado) > 0 ? (valor(n.realizado_consolidado) / valor(n.orcado_consolidado)) * 100 : null;
                      return (
                        <tr key={n.id} style={n.is_active ? undefined : { opacity: 0.55 }}>
                          <td style={{ fontWeight: nivel === 0 ? 700 : 600, paddingLeft: 8 + nivel * 18 }}>{n.codigo}</td>
                          <td>{n.descricao}</td><td>{n.responsavel || "—"}</td>
                          <td className="num">{moeda(n.orcado)}</td><td className="num">{moeda(n.realizado)}</td>
                          <td className="num" style={{ fontWeight: 600 }}>{moeda(n.orcado_consolidado)}</td>
                          <td className="num" style={{ fontWeight: 600 }}>{moeda(n.realizado_consolidado)}</td>
                          <td className="num">{pct == null ? "—" : n.estourado
                            ? <span className="erp-badge erp-badge-red">{pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% — estourado</span>
                            : `${pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div></div>
          )}

          {aba === "aprovacoes" && (
            <div className="erp-fieldset"><div className="erp-fieldset-head">Requisições de compra pelo aprovador do centro</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c3"><label className="erp-label">Situação</label>
                <select className="erp-input" value={statusAprov} onChange={(e) => setStatusAprov(e.target.value)}>
                  <option value="PENDENTE">Pendentes</option><option value="APROVADA">Aprovadas</option><option value="REPROVADA">Reprovadas</option><option value="">Todas</option>
                </select></div>
              <div className="erp-field erp-c3" style={{ display: "flex", alignItems: "flex-end" }}><label className="erp-check">
                <input type="checkbox" checked={minhas} onChange={(e) => setMinhas(e.target.checked)} /> Só as que eu aprovo</label></div>
              <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                <table className="erp-grid">
                  <thead><tr><th>Requisição</th><th>Centro</th><th>Desde</th><th>Situação</th><th>Motivo</th><th style={{ width: 220 }}>Decisão</th></tr></thead>
                  <tbody>
                    {aprov.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhuma requisição nesta situação.</td></tr>}
                    {aprov.map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600 }}>{a.requisition_code}</td>
                        <td>{a.centro_codigo} — {a.centro_descricao}</td>
                        <td><small>{new Date(a.criado_em).toLocaleString("pt-BR")}</small></td>
                        <td><span className={`erp-badge ${statusAprovRotulo[a.status]?.[1] ?? ""}`}>{statusAprovRotulo[a.status]?.[0] ?? a.status}</span></td>
                        <td>{a.pode_decidir
                          ? <input className="erp-input" style={{ height: 26 }} placeholder="motivo (obrigatório para reprovar)" value={motivo[a.id] ?? ""} onChange={(e) => setMotivo((m) => ({ ...m, [a.id]: e.target.value }))} />
                          : (a.justificativa ?? "—")}</td>
                        <td>{a.pode_decidir ? (<>
                          <button className="erp-btn erp-btn-sm erp-btn-primary" onClick={() => void decidir(a, true)} disabled={busy}>Aprovar</button>{" "}
                          <button className="erp-btn erp-btn-sm" onClick={() => void decidir(a, false)} disabled={busy}>Reprovar</button>
                        </>) : a.status === "PENDENTE" ? <small>aguardando o aprovador</small> : <small>{a.decidido_em ? new Date(a.decidido_em).toLocaleString("pt-BR") : ""}</small>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <small>A requisição com item de centro que aprova requisições só vira pedido de compra depois de aprovada aqui. Quem pediu a requisição não a aprova.</small>
              </div>
            </div></div>
          )}
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Centros: <strong>{centros.length}</strong></div>
        <div className="erp-status-item">Ativos: <strong>{centros.filter((c) => c.is_active).length}</strong></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

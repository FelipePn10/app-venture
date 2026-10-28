import { useState, useCallback, useEffect } from "react";
import {
  type PlanoConta, type PlanoContaDTO, type PlanoTipo, type PlanoNatureza, type UsoCadastroResumo,
  listPlanoContasCadastro, createPlanoConta, updatePlanoConta, deletePlanoConta, usoPlanoConta,
} from "@/services/financialService";
import { errMessage } from "@/services/fiscalShared";
import { useAuthStore } from "@/store/authStore";
import { ExportButton } from "@/components/ui/ExportButton";
import { enumLabel } from "@/utils/enumLabels";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const TIPOS: PlanoTipo[] = ["RECEITA", "DESPESA", "ATIVO", "PASSIVO", "PATRIMONIO"];
const EMPTY: PlanoContaDTO = { codigo: "", descricao: "", tipo: "RECEITA", natureza: "CREDITO", parent_code: "", nivel: 1 };

function textoDoUso(uso: UsoCadastroResumo): string {
  return uso.usos.map((u) => `${u.onde} (${u.quantidade})`).join(", ");
}

export function Vfin0120Page(): JSX.Element {
  // Excluir é só do ADMIN (o backend recusa os demais com 403).
  const isAdmin = useAuthStore((state) => state.user?.role?.toUpperCase() === "ADMIN");
  const [form, setForm] = useState<PlanoContaDTO>(EMPTY);
  const [list, setList] = useState<PlanoConta[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  // Conta em edição (null = nova) e o uso dela: em uso, só descrição e situação mudam.
  const [editId, setEditId] = useState<number | null>(null);
  const [ativa, setAtiva] = useState(true);
  const [exigeCentro, setExigeCentro] = useState(false);
  const [uso, setUso] = useState<UsoCadastroResumo | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const travado = editId != null && (uso?.em_uso ?? true);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listPlanoContasCadastro()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar plano de contas.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof PlanoContaDTO>(k: K, v: PlanoContaDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };

  function novo() { setForm(EMPTY); setEditId(null); setAtiva(true); setUso(null); setConfirmarExclusao(false); setFeedback(null); }

  async function editar(c: PlanoConta) {
    setForm({ codigo: c.codigo, descricao: c.descricao, tipo: c.tipo, natureza: c.natureza, parent_code: c.parent_code ?? "", nivel: c.nivel });
    setEditId(c.id); setAtiva(c.is_active !== false); setExigeCentro(c.exige_centro_custo === true); setUso(null); setConfirmarExclusao(false); setFeedback(null);
    try { setUso(await usoPlanoConta(c.id)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Não foi possível conferir onde a conta é usada.") }); }
  }

  async function salvar() {
    if (!form.codigo.trim() || !form.descricao.trim()) { setFeedback({ type: "error", message: "Código e Descrição são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const parent_code = form.parent_code?.trim() || undefined;
      if (editId != null) {
        await updatePlanoConta(editId, { codigo: form.codigo.trim(), descricao: form.descricao, tipo: form.tipo, natureza: form.natureza, parent_code, is_active: ativa, exige_centro_custo: exigeCentro });
        setFeedback({ type: "success", message: `Conta ${form.codigo} alterada.` });
      } else {
        const nivel = form.codigo.split(".").length;
        await createPlanoConta({ ...form, nivel, parent_code });
        setFeedback({ type: "success", message: `Conta ${form.codigo} cadastrada.` });
        setForm(EMPTY);
      }
      await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function excluir() {
    if (editId == null) return;
    if (!confirmarExclusao) { setConfirmarExclusao(true); return; }
    setBusy(true); setFeedback(null);
    try {
      await deletePlanoConta(editId);
      const codigo = form.codigo;
      novo();
      setFeedback({ type: "success", message: `Conta ${codigo} excluída.` });
      await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); setConfirmarExclusao(false); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Financeiro</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Plano de Contas</span><span className="erp-crumb-code">VFIN0120</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Nova Conta</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editId != null ? "Salvar alteração" : "Salvar"}</button>
          {editId != null && (
            <button className="erp-btn erp-btn-danger" onClick={() => void excluir()} disabled={!isAdmin || busy || uso == null || uso.em_uso}
              title={!isAdmin ? "Somente administradores excluem" : uso?.em_uso ? "Em uso: desative a conta em vez de excluir" : "Excluir a conta"}>
              {confirmarExclusao ? "Confirmar exclusão" : "Excluir"}
            </button>
          )}
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIN0120 — Plano de Contas" filename="plano-de-contas" disabled={busy} />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Plano de Contas</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        {editId != null && uso?.em_uso && (
          <div className="erp-feedback info">
            Conta em uso em {textoDoUso(uso)}. Só a descrição e a situação podem mudar, e ela não pode ser excluída —
            para outra classificação, cadastre uma conta nova e desative esta.
          </div>
        )}
        {confirmarExclusao && <div className="erp-feedback error">Clique em "Confirmar exclusão" para excluir a conta {form.codigo}. Não há como desfazer.</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head">{editId != null ? `Alterando a conta ${form.codigo}` : "Dados"}</div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label>
              <input className="erp-input" value={form.codigo} placeholder="3.1.01" disabled={travado} onChange={(e) => setF("codigo", e.target.value)} /></div>
            <div className="erp-field erp-c6"><label className="erp-label erp-req">Descrição</label>
              <input className="erp-input" value={form.descricao} onChange={(e) => setF("descricao", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Código Pai</label>
              <input className="erp-input" value={form.parent_code ?? ""} placeholder="3.1" disabled={travado} onChange={(e) => setF("parent_code", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Tipo</label>
              <select className="erp-input" value={form.tipo} disabled={travado} onChange={(e) => setF("tipo", e.target.value as PlanoTipo)}>
                {TIPOS.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
            <div className="erp-field erp-c2"><label className="erp-label">Natureza</label>
              <select className="erp-input" value={form.natureza} disabled={travado} onChange={(e) => setF("natureza", e.target.value as PlanoNatureza)}>
                <option value="CREDITO">CRÉDITO</option><option value="DEBITO">DÉBITO</option></select></div>
            {editId != null && (<>
              <div className="erp-field erp-c2"><label className="erp-label">Situação</label>
                <select className="erp-input" value={ativa ? "S" : "N"} onChange={(e) => { setAtiva(e.target.value === "S"); setFeedback(null); }}>
                  <option value="S">Ativa</option><option value="N">Inativa</option></select></div>
              <div className="erp-field erp-c4" style={{ display: "flex", alignItems: "flex-end" }}>
                <label className="erp-check" title="O rateio do título a pagar e o item da nota de entrada nesta conta não são aceitos sem centro de custo (VCTB0102).">
                  <input type="checkbox" checked={exigeCentro} onChange={(e) => { setExigeCentro(e.target.checked); setFeedback(null); }} /> Exige centro de custo</label></div>
            </>)}
          
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Plano de contas — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Código</th><th>Descrição</th><th>Tipo</th><th>Natureza</th><th>Nível</th><th>Situação</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhuma conta cadastrada.</td></tr>}
              {list.map((c) => (
                <tr key={c.id} onClick={() => void editar(c)} className={editId === c.id ? "erp-row-sel" : undefined}
                  style={{ cursor: "pointer", opacity: c.is_active === false ? 0.55 : 1 }} title="Clique para alterar ou excluir">
                  <td style={{ fontWeight: 600, paddingLeft: 12 + (c.nivel ?? 1) * 8 }}>{c.codigo}</td>
                  <td>{c.descricao}</td><td><span className="erp-badge erp-badge-gray">{c.tipo}</span></td>
                  <td>{c.natureza}</td><td>{c.nivel ?? "—"}</td>
                  <td>{c.is_active === false ? <span className="erp-badge erp-badge-gray">Inativa</span> : "Ativa"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Contas: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

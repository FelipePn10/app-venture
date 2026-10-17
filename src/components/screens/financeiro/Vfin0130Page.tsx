import { useState, useCallback, useEffect } from "react";
import {
  type CentroCusto, type CentroCustoDTO, type UsoCadastroResumo,
  listCentrosCustoCadastro, createCentroCusto, updateCentroCusto, deleteCentroCusto, usoCentroCusto,
} from "@/services/financialService";
import { errMessage } from "@/services/fiscalShared";
import { useAuthStore } from "@/store/authStore";
import { ExportButton } from "@/components/ui/ExportButton";
import { enumLabel } from "@/utils/enumLabels";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const TIPOS = ["PRODUTIVO", "ADMINISTRATIVO", "COMERCIAL", "AUXILIAR"];
const EMPTY: CentroCustoDTO = { codigo: "", descricao: "", tipo: "PRODUTIVO" };

export function Vfin0130Page(): JSX.Element {
  // Excluir é só do ADMIN (o backend recusa os demais com 403).
  const isAdmin = useAuthStore((state) => state.user?.role?.toUpperCase() === "ADMIN");
  const [form, setForm] = useState<CentroCustoDTO>(EMPTY);
  const [list, setList] = useState<CentroCusto[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  // Centro em edição (null = novo) e o uso dele: em uso, só descrição e situação mudam.
  const [editId, setEditId] = useState<number | null>(null);
  const [ativo, setAtivo] = useState(true);
  const [uso, setUso] = useState<UsoCadastroResumo | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const travado = editId != null && (uso?.em_uso ?? true);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listCentrosCustoCadastro()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar centros de custo.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof CentroCustoDTO>(k: K, v: CentroCustoDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };

  function novo() { setForm(EMPTY); setEditId(null); setAtivo(true); setUso(null); setConfirmarExclusao(false); setFeedback(null); }

  async function editar(c: CentroCusto) {
    setForm({ codigo: c.codigo, descricao: c.descricao, tipo: c.tipo });
    setEditId(c.id); setAtivo(c.is_active !== false); setUso(null); setConfirmarExclusao(false); setFeedback(null);
    try { setUso(await usoCentroCusto(c.id)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Não foi possível conferir onde o centro é usado.") }); }
  }

  async function salvar() {
    if (!form.codigo.trim() || !form.descricao.trim()) { setFeedback({ type: "error", message: "Código e Descrição são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (editId != null) {
        await updateCentroCusto(editId, { ...form, is_active: ativo });
        setFeedback({ type: "success", message: `Centro de custo ${form.codigo} alterado.` });
      } else {
        await createCentroCusto(form);
        setFeedback({ type: "success", message: `Centro de custo ${form.codigo} cadastrado.` });
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
      await deleteCentroCusto(editId);
      const codigo = form.codigo;
      novo();
      setFeedback({ type: "success", message: `Centro de custo ${codigo} excluído.` });
      await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); setConfirmarExclusao(false); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Financeiro</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Centros de Custo</span><span className="erp-crumb-code">VFIN0130</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Novo Centro</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editId != null ? "Salvar alteração" : "Salvar"}</button>
          {editId != null && (
            <button className="erp-btn erp-btn-danger" onClick={() => void excluir()} disabled={!isAdmin || busy || uso == null || uso.em_uso}
              title={!isAdmin ? "Somente administradores excluem" : uso?.em_uso ? "Em uso: desative o centro em vez de excluir" : "Excluir o centro"}>
              {confirmarExclusao ? "Confirmar exclusão" : "Excluir"}
            </button>
          )}
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIN0130 — Centros de Custo" filename="centros-de-custo" disabled={busy} />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Centros de Custo</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        {editId != null && uso?.em_uso && (
          <div className="erp-feedback info">
            Centro em uso em {uso.usos.map((u) => `${u.onde} (${u.quantidade})`).join(", ")}. Só a descrição e a situação podem mudar,
            e ele não pode ser excluído — desative-o para que não seja mais escolhido.
          </div>
        )}
        {confirmarExclusao && <div className="erp-feedback error">Clique em "Confirmar exclusão" para excluir o centro {form.codigo}. Não há como desfazer.</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head">{editId != null ? `Alterando o centro ${form.codigo}` : "Dados"}</div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c3"><label className="erp-label erp-req">Código</label>
              <input className="erp-input" value={form.codigo} placeholder="CC-001" disabled={travado} onChange={(e) => setF("codigo", e.target.value)} /></div>
            <div className="erp-field erp-c6"><label className="erp-label erp-req">Descrição</label>
              <input className="erp-input" value={form.descricao} onChange={(e) => setF("descricao", e.target.value)} /></div>
            <div className="erp-field erp-c3"><label className="erp-label">Tipo</label>
              <select className="erp-input" value={form.tipo} disabled={travado} onChange={(e) => setF("tipo", e.target.value)}>
                {TIPOS.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}</select></div>
            {editId != null && (
              <div className="erp-field erp-c2"><label className="erp-label">Situação</label>
                <select className="erp-input" value={ativo ? "S" : "N"} onChange={(e) => { setAtivo(e.target.value === "S"); setFeedback(null); }}>
                  <option value="S">Ativo</option><option value="N">Inativo</option></select></div>
            )}
          
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Centros de custo — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Código</th><th>Descrição</th><th>Tipo</th><th>Situação</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhum centro cadastrado.</td></tr>}
              {list.map((c) => (
                <tr key={c.id} onClick={() => void editar(c)} className={editId === c.id ? "erp-row-sel" : undefined}
                  style={{ cursor: "pointer", opacity: c.is_active === false ? 0.55 : 1 }} title="Clique para alterar ou excluir">
                  <td style={{ fontWeight: 600 }}>{c.codigo}</td><td>{c.descricao}</td>
                  <td><span className="erp-badge erp-badge-gray">{c.tipo}</span></td>
                  <td>{c.is_active === false ? <span className="erp-badge erp-badge-gray">Inativo</span> : "Ativo"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Centros: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

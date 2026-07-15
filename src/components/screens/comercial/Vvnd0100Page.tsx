import { useState, useEffect, useCallback, useMemo } from "react";
import {
  type SalesDivisionDTO,
  DIVISION_ANALYSIS,
  listSalesDivisions, createSalesDivision, updateSalesDivision, deleteSalesDivision,
} from "@/services/salesDivisionService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const EMPTY: SalesDivisionDTO = { code: 0, description: "", commercial_analysis: "FREE", financial_analysis: "FREE", consider_mrp: true };
const analysisLabel = (v?: string) => DIVISION_ANALYSIS.find((a) => a.value === v)?.label ?? v ?? "—";

export function Vvnd0100Page(): JSX.Element {
  const [list, setList] = useState<SalesDivisionDTO[]>([]);
  const [form, setForm] = useState<SalesDivisionDTO>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listSalesDivisions()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar divisões de vendas.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const set = <K extends keyof SalesDivisionDTO>(k: K, v: SalesDivisionDTO[K]) => setForm((p) => ({ ...p, [k]: v }));

  function novo() { setForm(EMPTY); setEditing(false); setFeedback(null); }
  function editar(d: SalesDivisionDTO) { setForm({ ...d }); setEditing(true); setFeedback(null); }

  async function salvar() {
    if (!form.code) { setFeedback({ type: "error", message: "Código é obrigatório (maior que zero)." }); return; }
    if (!form.description.trim()) { setFeedback({ type: "error", message: "Descrição é obrigatória." }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (editing) await updateSalesDivision(form.code, form); else await createSalesDivision(form);
      setFeedback({ type: "success", message: `Divisão ${form.code} salva.` }); novo(); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function remover(code: number) {
    setBusy(true); setFeedback(null);
    try { await deleteSalesDivision(code); setFeedback({ type: "success", message: `Divisão ${code} excluída.` }); if (form.code === code) novo(); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((d) => String(d.code).includes(q) || d.description.toLowerCase().includes(q));
  }, [list, search]);

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Divisão de Vendas</span>
          <span className="erp-crumb-code">VVND0100</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Equipe / região / unidade associável ao pedido</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className="erp-btn erp-btn-primary" onClick={novo} disabled={busy}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Nova divisão
          </button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Registro</span>
          <button className="erp-btn erp-btn-dark" onClick={() => void salvar()} disabled={busy}>{busy && <span className="erp-spin" />}{editing ? "Atualizar" : "Salvar"}</button>
          {editing && <button className="erp-btn erp-btn-danger" onClick={() => void remover(form.code)} disabled={busy}>Excluir</button>}
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VVND0100 — Divisão de Vendas" filename="vvnd0100" /></div>
      </div>

      <div className="erp-content">
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

      <div className="erp-main">
        <aside className="erp-list-panel">
          <div className="erp-panel-head">
            <span className="erp-panel-title">Divisões</span>
            <span className="erp-count">{visible.length}</span>
            <div className="erp-panel-head-spacer" />
            <input className="erp-search" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="erp-list">
            {visible.length === 0 && <div className="erp-list-empty">Nenhuma divisão cadastrada.</div>}
            {visible.map((d) => (
              <div key={d.code} className={`erp-list-row${editing && form.code === d.code ? " sel" : ""}`} onClick={() => editar(d)}>
                <span className="erp-list-code">#{d.code}</span>
                <span className="erp-list-sub">{d.description}</span>
                <div className="erp-list-meta">
                  <span className="erp-badge draft">{analysisLabel(d.commercial_analysis)}</span>
                  {d.consider_mrp && <span className="erp-badge ok">MRP</span>}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">{editing ? `Editando divisão #${form.code}` : "Nova divisão"}</button></div>
          <div className="erp-detail-body">
            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Identificação</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label erp-req">Código</label><input className="erp-input num" type="number" value={form.code || ""} disabled={editing} onChange={(e) => set("code", Number(e.target.value))} /></div>
                <div className="erp-field erp-c9"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Ex.: Vendas Sudeste" /></div>
              </div>
            </div>
            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Parâmetros de análise</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c4"><label className="erp-label">Análise comercial</label>
                  <select className="erp-input" value={form.commercial_analysis ?? "FREE"} onChange={(e) => set("commercial_analysis", e.target.value as SalesDivisionDTO["commercial_analysis"])}>{DIVISION_ANALYSIS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}</select></div>
                <div className="erp-field erp-c4"><label className="erp-label">Análise financeira</label>
                  <select className="erp-input" value={form.financial_analysis ?? "FREE"} onChange={(e) => set("financial_analysis", e.target.value as SalesDivisionDTO["financial_analysis"])}>{DIVISION_ANALYSIS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}</select></div>
                <div className="erp-field erp-c4">
                  <label className="erp-label">Planejamento</label>
                  <label className="erp-check"><input type="checkbox" checked={!!form.consider_mrp} onChange={(e) => set("consider_mrp", e.target.checked)} /><span>Considera MRP</span></label>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      </div>
      <footer className="erp-statusbar">
        <div className="erp-status-item">Divisões: <strong>{list.length}</strong></div>
        {editing && <div className="erp-status-item">Editando: <strong>#{form.code}</strong></div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

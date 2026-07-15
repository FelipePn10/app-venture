import { useState, useCallback } from "react";
import { type ItemRule, type ItemRuleCondition, listItemRules, createItemRule, updateItemRule, deleteItemRule } from "@/services/itensConfigService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const OPERATORS = ["EQUAL", "DIFFERENT", "GREATER", "LESS", "IN", "NOT_IN"];
const SITUATIONS = ["ATIVO", "INATIVO"];
const EMPTY = (item: number): ItemRule => ({ item_code: item, target_table: "", target_field: "", content: "", formula: "", description: "", situation: "ATIVO", conditions: [] });

export function Vite0118Page(): JSX.Element {
  const [item, setItem] = useState("");
  const [rules, setRules] = useState<ItemRule[]>([]);
  const [form, setForm] = useState<ItemRule>(EMPTY(0));
  const [editId, setEditId] = useState<number | null>(null);
  const [cond, setCond] = useState<ItemRuleCondition>({ characteristic_id: 0, operator: "EQUAL", variable_id: undefined });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  const setF = <K extends keyof ItemRule>(k: K, v: ItemRule[K]) => setForm((p) => ({ ...p, [k]: v }));

  const carregar = () => run(async () => { const it = Number(item); if (!it) { setFeedback({ type: "error", message: "Informe o item." }); return; } setRules(await listItemRules(it)); setForm(EMPTY(it)); });
  const novo = () => { const it = Number(item) || 0; setForm(EMPTY(it)); setEditId(null); };
  const selecionar = (r: ItemRule) => { setForm({ ...r }); setEditId(r.id ?? null); };
  const addCond = () => { if (!cond.characteristic_id) { setFeedback({ type: "error", message: "Informe a característica da condição." }); return; } setForm((p) => ({ ...p, conditions: [...p.conditions, cond] })); setCond({ characteristic_id: 0, operator: "EQUAL", variable_id: undefined }); };

  const salvar = () => run(async () => {
    const it = Number(item); if (!it) { setFeedback({ type: "error", message: "Informe o item." }); return; }
    if (!form.target_table.trim() || !form.target_field.trim()) { setFeedback({ type: "error", message: "Tabela e campo de destino são obrigatórios." }); return; }
    const dto = { ...form, item_code: it };
    if (editId) { await updateItemRule(editId, dto); setFeedback({ type: "success", message: `Regra ${editId} atualizada.` }); }
    else { const r = await createItemRule(dto); setFeedback({ type: "success", message: `Regra ${r.id ?? ""} criada.` }); }
    setRules(await listItemRules(it)); novo();
  });
  const remover = (id?: number) => { if (!id) return; void run(async () => { await deleteItemRule(id); setRules(await listItemRules(Number(item))); novo(); setFeedback({ type: "success", message: `Regra ${id} removida.` }); }); };

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Engenharia</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Regras de Itens Configurados</span><span className="erp-crumb-code">VITE0118</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">{rules.length} regra(s)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Item</span>
          <input className="erp-tinput" style={{ width: 110 }} type="number" value={item} onChange={(e) => setItem(e.target.value)} />
          <button className="erp-btn erp-btn-dark" onClick={() => void carregar()} disabled={busy}>{busy && <span className="erp-spin" />}Carregar</button>
          <button className="erp-btn" onClick={novo} disabled={busy}>Nova regra</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VITE0118 — Regras de Itens Configurados" filename="vite0118" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Regras do item</span><span className="erp-count">{rules.length}</span></div>
            <div className="erp-list">
              {rules.length === 0 && <div className="erp-list-empty">Informe o item e clique em <strong>Carregar</strong>.</div>}
              {rules.map((r) => (
                <div key={r.id} className={`erp-list-row${editId === r.id ? " erp-row-sel" : ""}`} onClick={() => selecionar(r)}>
                  <span className="erp-list-code">{r.target_table}.{r.target_field}</span>
                  <span className="erp-list-sub">{r.description || r.content || "—"} · {r.situation}</span>
                  <div className="erp-list-meta"><button className="erp-btn erp-btn-danger erp-btn-sm" style={{ marginLeft: "auto" }} onClick={(e) => { e.stopPropagation(); remover(r.id); }} disabled={busy}>Excluir</button></div>
                </div>
              ))}
            </div>
          </aside>

          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">{editId ? `Editar regra ${editId}` : "Nova regra"}</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Destino e conteúdo</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c3"><label className="erp-label erp-req">Tabela destino</label><input className="erp-input" value={form.target_table} onChange={(e) => setF("target_table", e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label erp-req">Campo destino</label><input className="erp-input" value={form.target_field} onChange={(e) => setF("target_field", e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Situação</label><select className="erp-input" value={form.situation} onChange={(e) => setF("situation", e.target.value)}>{SITUATIONS.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Conteúdo</label><input className="erp-input" value={form.content} onChange={(e) => setF("content", e.target.value)} /></div>
                  <div className="erp-field erp-c6"><label className="erp-label">Fórmula</label><input className="erp-input" value={form.formula} onChange={(e) => setF("formula", e.target.value)} /></div>
                  <div className="erp-field erp-c6"><label className="erp-label">Descrição</label><input className="erp-input" value={form.description} onChange={(e) => setF("description", e.target.value)} /></div>
                </div>
              </div>

              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Condições ({form.conditions.length}) — característica ∘ operador ∘ variável</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c3"><label className="erp-label">Característica (id)</label><input className="erp-input num" type="number" value={cond.characteristic_id || ""} onChange={(e) => setCond((c) => ({ ...c, characteristic_id: Number(e.target.value) }))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Operador</label><select className="erp-input" value={cond.operator} onChange={(e) => setCond((c) => ({ ...c, operator: e.target.value }))}>{OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Variável (id)</label><input className="erp-input num" type="number" value={cond.variable_id || ""} onChange={(e) => setCond((c) => ({ ...c, variable_id: Number(e.target.value) || undefined }))} /></div>
                  <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={addCond}>+ condição</button></div>
                  {form.conditions.length > 0 && (
                    <div className="erp-field erp-c12"><table className="erp-grid">
                      <thead><tr><th>Característica</th><th>Operador</th><th>Variável</th><th></th></tr></thead>
                      <tbody>{form.conditions.map((c, i) => <tr key={i}><td>{c.characteristic_id}</td><td>{c.operator}</td><td>{c.variable_id ?? "—"}</td><td><button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => setForm((p) => ({ ...p, conditions: p.conditions.filter((_, idx) => idx !== i) }))}>Remover</button></td></tr>)}</tbody>
                    </table></div>
                  )}
                  <div className="erp-field erp-c12" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{editId ? "Atualizar regra" : "Criar regra"}</button></div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Regras: <strong>{rules.length}</strong></div>
        {item ? <div className="erp-status-item">Item: <strong>#{item}</strong></div> : null}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

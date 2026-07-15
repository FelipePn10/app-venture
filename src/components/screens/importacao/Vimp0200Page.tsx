import { useState, useCallback } from "react";
import {
  type ImportStatus, type ApportionBasis,
  listImportProcesses, getImportProcess, createImportProcess, recomputeImportProcess, updateImportProcessStatus,
} from "@/services/procurementService";
import { errMessage, parseStr, parseNum, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const BASES: ApportionBasis[] = ["VALUE", "WEIGHT", "QUANTITY"];
const STATUSES: ImportStatus[] = ["OPEN", "NATIONALIZED", "CANCELLED"];
const CAPA_INI = { enterprise_code: "1", supplier_code: "", reference: "", incoterm: "", currency: "USD", exchange_rate: "5", apportion_basis: "VALUE" as ApportionBasis };
const ITEM_INI = { item_code: "", mask: "", quantity: "", weight: "", fob_unit_price: "" };
const EXP_INI = { expense_type: "FREIGHT", amount: "", in_item_cost: true };

export function Vimp0200Page(): JSX.Element {
  const [list, setList] = useState<Obj[]>([]);
  const [detalhe, setDetalhe] = useState<Obj | null>(null);
  const [capa, setCapa] = useState({ ...CAPA_INI });
  const [itemForm, setItemForm] = useState({ ...ITEM_INI });
  const [items, setItems] = useState<Obj[]>([]);
  const [expForm, setExpForm] = useState({ ...EXP_INI });
  const [expenses, setExpenses] = useState<Obj[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const setC = useCallback(<K extends keyof typeof capa>(k: K, v: string) => setCapa((c) => ({ ...c, [k]: v })), []);
  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregar = () => run(async () => { setList(await listImportProcesses()); });
  const abrir = (id: number) => run(async () => { setDetalhe(await getImportProcess(id)); });
  const addItem = () => { const item_code = Number(itemForm.item_code); if (!item_code) { setFeedback({ type: "error", message: "Item obrigatório." }); return; } setItems((a) => [...a, { item_code, mask: itemForm.mask.trim(), quantity: Number(itemForm.quantity) || 0, weight: Number(itemForm.weight) || 0, fob_unit_price: Number(itemForm.fob_unit_price) || 0 }]); setItemForm({ ...ITEM_INI }); };
  const addExp = () => { const amount = Number(expForm.amount); if (!amount) { setFeedback({ type: "error", message: "Valor da despesa obrigatório." }); return; } setExpenses((a) => [...a, { expense_type: expForm.expense_type.trim(), amount, in_item_cost: expForm.in_item_cost }]); setExpForm({ ...EXP_INI }); };

  const criar = () => run(async () => {
    if (items.length === 0) { setFeedback({ type: "error", message: "Inclua ao menos um item." }); return; }
    const p = await createImportProcess({
      enterprise_code: Number(capa.enterprise_code) || 1, supplier_code: Number(capa.supplier_code) || null,
      reference: capa.reference.trim() || null, incoterm: capa.incoterm.trim() || null, currency: capa.currency.trim() || "USD",
      exchange_rate: Number(capa.exchange_rate) || 1, apportion_basis: capa.apportion_basis, items, expenses,
    });
    setDetalhe(p); setFeedback({ type: "success", message: `Processo de importação criado (#${p.id ?? p.ID}).` });
    setCapa({ ...CAPA_INI }); setItems([]); setExpenses([]); setList(await listImportProcesses());
  });
  const recompute = () => { const id = parseNum(detalhe ?? {}, "id", "ID"); if (!id) return; void run(async () => { setDetalhe(await recomputeImportProcess(id)); setFeedback({ type: "success", message: "Custo nacionalizado recalculado." }); }); };
  const mudarStatus = (status: ImportStatus) => { const id = parseNum(detalhe ?? {}, "id", "ID"); if (!id) return; void run(async () => { setDetalhe(await updateImportProcessStatus(id, status)); setList(await listImportProcesses()); setFeedback({ type: "success", message: `Processo → ${status}.` }); }); };

  const detItems = detalhe ? (((detalhe.items ?? detalhe.Items) as Obj[]) ?? []) : [];

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Importação</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Console de Processos de Importação</span><span className="erp-crumb-code">VIMP0200</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">custo nacionalizado (landed)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Processos</span><button className="erp-btn erp-btn-dark" onClick={() => void carregar()} disabled={busy}>{busy && <span className="erp-spin" />}Listar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Novo</span><button className="erp-btn erp-btn-primary" onClick={() => void criar()} disabled={busy}>Criar processo</button></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VIMP0200 — Console de Importação" filename="vimp0200" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Processos</span><span className="erp-count">{list.length}</span></div>
            <div className="erp-list">
              {list.length === 0 && <div className="erp-list-empty">Clique em <strong>Listar</strong>.</div>}
              {list.map((p, i) => { const id = parseNum(p, "id", "ID"); return (
                <div key={i} className={`erp-list-row${parseNum(detalhe ?? {}, "id", "ID") === id ? " erp-row-sel" : ""}`} onClick={() => void abrir(id)}>
                  <span className="erp-list-code">#{id}</span>
                  <span className="erp-list-sub">{parseStr(p, "currency", "Currency")} · {parseStr(p, "status", "Status")}</span>
                </div>
              ); })}
            </div>
          </aside>

          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">Processo de importação</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Capa</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c2"><label className="erp-label">Empresa</label><input className="erp-input num" type="number" value={capa.enterprise_code} onChange={(e) => setC("enterprise_code", e.target.value)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Fornecedor</label><input className="erp-input num" type="number" value={capa.supplier_code} onChange={(e) => setC("supplier_code", e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Referência (DI/DUIMP)</label><input className="erp-input" value={capa.reference} onChange={(e) => setC("reference", e.target.value)} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Incoterm</label><input className="erp-input" value={capa.incoterm} onChange={(e) => setC("incoterm", e.target.value)} /></div>
                  <div className="erp-field erp-c1"><label className="erp-label">Moeda</label><input className="erp-input" value={capa.currency} onChange={(e) => setC("currency", e.target.value)} /></div>
                  <div className="erp-field erp-c1"><label className="erp-label">Câmbio</label><input className="erp-input num" type="number" value={capa.exchange_rate} onChange={(e) => setC("exchange_rate", e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Base de rateio</label><select className="erp-input" value={capa.apportion_basis} onChange={(e) => setC("apportion_basis", e.target.value)}>{BASES.map((b) => <option key={b} value={b}>{b}</option>)}</select></div>
                </div>
              </div>

              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Itens ({items.length})</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c2"><label className="erp-label erp-req">Item</label><input className="erp-input num" type="number" value={itemForm.item_code} onChange={(e) => setItemForm((f) => ({ ...f, item_code: e.target.value }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Qtde</label><input className="erp-input num" type="number" value={itemForm.quantity} onChange={(e) => setItemForm((f) => ({ ...f, quantity: e.target.value }))} /></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Peso</label><input className="erp-input num" type="number" value={itemForm.weight} onChange={(e) => setItemForm((f) => ({ ...f, weight: e.target.value }))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">FOB unit.</label><input className="erp-input num" type="number" value={itemForm.fob_unit_price} onChange={(e) => setItemForm((f) => ({ ...f, fob_unit_price: e.target.value }))} /></div>
                  <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={addItem}>+ item</button></div>
                  {items.length > 0 && <div className="erp-field erp-c12"><table className="erp-grid"><thead><tr><th>Item</th><th>Qtde</th><th>Peso</th><th>FOB</th></tr></thead><tbody>{items.map((it, i) => <tr key={i}><td>{String(it.item_code)}</td><td>{String(it.quantity)}</td><td>{String(it.weight)}</td><td>{String(it.fob_unit_price)}</td></tr>)}</tbody></table></div>}
                </div>
              </div>

              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Despesas ({expenses.length})</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c3"><label className="erp-label">Tipo</label><input className="erp-input" value={expForm.expense_type} onChange={(e) => setExpForm((f) => ({ ...f, expense_type: e.target.value }))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Valor</label><input className="erp-input num" type="number" value={expForm.amount} onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))} /></div>
                  <div className="erp-field erp-c3" style={{ alignSelf: "flex-end" }}><label className="erp-check"><input type="checkbox" checked={expForm.in_item_cost} onChange={(e) => setExpForm((f) => ({ ...f, in_item_cost: e.target.checked }))} /> No custo do item</label></div>
                  <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={addExp}>+ despesa</button></div>
                  {expenses.length > 0 && <div className="erp-field erp-c12"><table className="erp-grid"><thead><tr><th>Tipo</th><th>Valor</th><th>Rateia</th></tr></thead><tbody>{expenses.map((ex, i) => <tr key={i}><td>{String(ex.expense_type)}</td><td>{String(ex.amount)}</td><td>{ex.in_item_cost ? "Sim" : "Não"}</td></tr>)}</tbody></table></div>}
                </div>
              </div>

              {detalhe && (
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Processo #{String(detalhe.id ?? detalhe.ID)} — {parseStr(detalhe, "status", "Status")}
                    <span style={{ float: "right", display: "flex", gap: 6 }}>
                      <button className="erp-btn erp-btn-sm" onClick={recompute} disabled={busy}>Recalcular landed</button>
                      {STATUSES.map((s) => <button key={s} className="erp-btn erp-btn-sm" onClick={() => mudarStatus(s)} disabled={busy}>{s}</button>)}
                    </span>
                  </div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c12"><table className="erp-grid"><thead><tr><th>Item</th><th>Qtde</th><th>FOB unit.</th><th>Custo nacionalizado (unit.)</th></tr></thead>
                      <tbody>{detItems.length === 0 ? <tr><td colSpan={4} className="erp-grid-empty">sem itens</td></tr> : detItems.map((it, i) => <tr key={i}><td>{String(it.item_code ?? it.ItemCode)}</td><td>{String(it.quantity ?? it.Quantity)}</td><td>{String(it.fob_unit_price ?? it.FobUnitPrice)}</td><td><strong>{String(it.landed_unit_cost ?? it.LandedUnitCost ?? "—")}</strong></td></tr>)}</tbody>
                    </table></div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Processos: <strong>{list.length}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

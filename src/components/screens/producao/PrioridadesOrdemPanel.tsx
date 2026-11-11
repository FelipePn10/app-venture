import { useState, useEffect, useCallback } from "react";
import { type OrderPriorityDTO, listOrderPriorities, createOrderPriority } from "@/services/orderPriorityService";
import { errMessage } from "@/services/fiscalShared";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const EMPTY: OrderPriorityDTO = { priority: "", description: "", interval_start: 0, interval_end: 0 };

/*
 * Faixas de prioridade das ordens (era a VPRI0100): mostradas nos Parâmetros da
 * VPRO0210. O MRP classifica cada ordem planejada pela quantidade.
 */
export function PrioridadesOrdemPanel(): JSX.Element {
  const [list, setList] = useState<OrderPriorityDTO[]>([]);
  const [form, setForm] = useState<OrderPriorityDTO>(EMPTY);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listOrderPriorities()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar prioridades.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  async function salvar() {
    if (!form.priority.trim()) { setFeedback({ type: "error", message: "Prioridade é obrigatória." }); return; }
    // O backend exige start < end estritamente (create_order_priority.go).
    if (form.interval_end <= form.interval_start) {
      setFeedback({ type: "error", message: "A quantidade máxima deve ser maior que a mínima." }); return;
    }
    // …e recusa faixas sobrepostas. Avisa aqui para não gastar um round-trip.
    const overlap = list.find((p) => form.interval_start <= p.interval_end && form.interval_end >= p.interval_start);
    if (overlap) {
      setFeedback({ type: "error", message: `Faixa sobrepõe "${overlap.priority}" (${overlap.interval_start}–${overlap.interval_end}). As faixas de quantidade não podem se cruzar.` });
      return;
    }
    setBusy(true); setFeedback(null);
    try { await createOrderPriority(form); setFeedback({ type: "success", message: `Prioridade ${form.priority} criada.` }); setForm(EMPTY); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <>
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Prioridade das ordens — <span style={{fontWeight:400,opacity:0.65}}>faixas de quantidade</span></div><div className="erp-fieldset-body">
          <div className="erp-field erp-c12">
            <div className="erp-note">
              O MRP classifica cada ordem planejada pela <strong>quantidade</strong> que ela pede:
              a ordem recebe a prioridade cuja faixa contém essa quantidade
              (ex.: de <em>1</em> a <em>10</em> peças → <em>Normal</em>; de <em>11</em> a <em>100</em> → <em>Alta</em>).
              As faixas <strong>não podem se sobrepor</strong> e o valor é em <strong>unidades do item</strong> — não em dias.
            </div>
          </div>
          <div className="erp-field erp-c3"><label className="erp-label erp-req">Prioridade</label>
            <input className="erp-input" value={form.priority} placeholder="Ex.: Urgente, Alta, Normal" onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} /></div>
          <div className="erp-field erp-c5"><label className="erp-label">Descrição</label>
            <input className="erp-input" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Qtd. mínima da ordem</label>
            <input className="erp-input num" type="number" min={0} value={form.interval_start} onChange={(e) => setForm((p) => ({ ...p, interval_start: Number(e.target.value) }))} />
            <span className="erp-hint">Em unidades do item (inclusive)</span></div>
          <div className="erp-field erp-c2"><label className="erp-label">Qtd. máxima da ordem</label>
            <input className="erp-input num" type="number" min={0} value={form.interval_end} onChange={(e) => setForm((p) => ({ ...p, interval_end: Number(e.target.value) }))} />
            <span className="erp-hint">Em unidades do item (inclusive)</span></div>
          <div className="erp-field erp-c12" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>Adicionar faixa</button></div>
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Faixas cadastradas</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Prioridade</th><th>Descrição</th><th>Qtd. de</th><th>Qtd. até</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhuma prioridade cadastrada.</td></tr>}
              {list.slice().sort((a, b) => a.interval_start - b.interval_start).map((p, i) => (
                <tr key={`${p.priority}-${p.interval_start}-${i}`}><td style={{ fontWeight: 600 }}>{p.priority}</td><td>{p.description}</td><td>{p.interval_start}</td><td>{p.interval_end}</td></tr>
              ))}
            </tbody>
          </table>
        </div></div></div>
    </>
  );
}

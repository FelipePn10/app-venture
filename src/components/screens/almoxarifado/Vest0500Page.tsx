import { useEffect, useState } from 'react';
import { errMessage } from '@/services/fiscalShared';
import { createCycleCount, listCycleCounts, transitionCycleCount, type CycleCount } from '@/services/notificationService';
import { LookupField } from '@/components/ui/LookupField';
import { loadItems, loadItemMasks, loadWarehouses } from '@/services/lookups';

type Feedback = { type: 'success' | 'error' | 'info'; message: string } | null;
const LABEL: Record<CycleCount['state'], string> = { PROGRAMADA: 'Programada', EM_CONTAGEM: 'Em contagem', DIVERGENTE: 'Divergente', CONCLUIDA: 'Concluída', APROVADA: 'Aprovada', CANCELADA: 'Cancelada' };
const ORIGIN_LABEL: Record<CycleCount['origin'], string> = { MANUAL: 'Manual extraordinária', POLITICA_ITEM: 'Automática pela política do item' };

function localDate(value: string): string { const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleString('pt-BR'); }
function nextStates(state: CycleCount['state']): CycleCount['state'][] {
  return ({ PROGRAMADA: ['EM_CONTAGEM', 'CANCELADA'], EM_CONTAGEM: ['DIVERGENTE', 'CONCLUIDA', 'CANCELADA'], DIVERGENTE: ['CONCLUIDA', 'CANCELADA'], CONCLUIDA: ['APROVADA'], APROVADA: [], CANCELADA: [] } as Record<CycleCount['state'], CycleCount['state'][]>)[state];
}

/** VEST0500 — execução das contagens cuja política é definida no cadastro do item. */
export function Vest0500Page(): JSX.Element {
  const [rows, setRows] = useState<CycleCount[]>([]);
  const [selected, setSelected] = useState<CycleCount | null>(null);
  const [form, setForm] = useState({ warehouse_id: '', warehouse_address_id: '', item_code: '', mask: '', lot_code: '', scheduled_for: '' });
  const [transition, setTransition] = useState({ state: '' as CycleCount['state'] | '', counted_quantity: '', reason: '' });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  async function run(work: () => Promise<void>) { setBusy(true); setFeedback(null); try { await work(); } catch (error) { setFeedback({ type: 'error', message: errMessage(error, 'Não foi possível concluir a operação.') }); } finally { setBusy(false); } }
  async function load() { const data = await listCycleCounts(); setRows(data); if (selected) setSelected(data.find((item) => item.id === selected.id) ?? null); }
  // A lista inicial é carregada uma vez; o botão Atualizar controla as demais cargas.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void run(load); }, []);

  async function schedule() {
    if (!Number(form.warehouse_id) || !form.item_code.trim() || !form.scheduled_for) { setFeedback({ type: 'error', message: 'Almoxarifado, item e data programada são obrigatórios.' }); return; }
    await run(async () => {
      await createCycleCount({ warehouse_id: Number(form.warehouse_id), warehouse_address_id: form.warehouse_address_id ? Number(form.warehouse_address_id) : undefined, item_code: form.item_code.trim().toUpperCase(), mask: form.mask.trim(), lot_code: form.lot_code.trim(), scheduled_for: new Date(form.scheduled_for).toISOString() });
      setForm({ warehouse_id: '', warehouse_address_id: '', item_code: '', mask: '', lot_code: '', scheduled_for: '' }); await load();
      setFeedback({ type: 'success', message: 'Contagem manual extraordinária programada.' });
    });
  }

  async function applyTransition() {
    if (!selected || !transition.state) return;
    if (['DIVERGENTE', 'CONCLUIDA'].includes(transition.state) && !transition.counted_quantity.trim()) { setFeedback({ type: 'error', message: 'Informe a quantidade contada para concluir a conferência.' }); return; }
    await run(async () => { const updated = await transitionCycleCount(selected.id, transition.state as CycleCount['state'], transition.counted_quantity, transition.reason); setSelected(updated); setTransition({ state: '', counted_quantity: '', reason: '' }); await load(); setFeedback({ type: 'success', message: `Contagem alterada para ${LABEL[updated.state]}.` }); });
  }

  return <div className="erp-screen">
    <header className="erp-titlebar"><div className="erp-brand"><div className="erp-brand-logo">V</div></div><nav className="erp-crumbs"><span className="erp-crumb-mut">Almoxarifado</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Programação e Execução de Contagem Cíclica</span><span className="erp-crumb-code">VEST0500</span></nav><div className="erp-titlebar-spacer"/><span className="erp-titlebar-meta">{rows.length} contagem(ns)</span></header>
    <div className="erp-toolbar"><div className="erp-tgroup"><button className="erp-btn erp-btn-dark" onClick={() => void run(load)} disabled={busy}>{busy && <span className="erp-spin"/>}Atualizar</button></div></div>
    <div className="erp-content">
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
      <div className="erp-note"><strong>Diferença para o cadastro do item:</strong> no item você define a política e o intervalo. O sistema cria automaticamente as ocorrências recorrentes. Nesta rotina o almoxarifado executa essas ocorrências; a programação manual abaixo serve somente para uma conferência extraordinária.</div>
      <div className="erp-main"><aside className="erp-list-panel"><div className="erp-panel-head"><span className="erp-panel-title">Contagens programadas</span><span className="erp-count">{rows.length}</span></div><div className="erp-list">{rows.length === 0 && <div className="erp-list-empty">Nenhuma contagem encontrada.</div>}{rows.map((item) => <button type="button" key={item.id} className={`erp-list-row ${selected?.id === item.id ? 'active' : ''}`} onClick={() => { setSelected(item); setTransition({ state: '', counted_quantity: item.counted_quantity ?? '', reason: '' }); }}><span className="erp-list-code">{item.item_code}</span><span className="erp-list-sub">{LABEL[item.state]} · {ORIGIN_LABEL[item.origin]} · {localDate(item.scheduled_for)}</span></button>)}</div></aside>
        <section className="erp-detail-panel"><div className="erp-tabs"><button className="erp-tab active">Programar e conferir</button></div><div className="erp-detail-body">
          <div className="erp-fieldset"><div className="erp-fieldset-head">Programação manual extraordinária</div><div className="erp-fieldset-body">
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Almoxarifado</label><LookupField value={form.warehouse_id ? Number(form.warehouse_id) : undefined} loader={loadWarehouses} entityLabel="almoxarifado" onChange={(code) => setForm({ ...form, warehouse_id: code ? String(code) : '' })}/></div>
            <div className="erp-field erp-c2"><label className="erp-label">Endereço (id)</label><input className="erp-input num" type="number" min={1} value={form.warehouse_address_id} onChange={(e) => setForm({ ...form, warehouse_address_id: e.target.value })}/><span className="erp-field-hint">Opcional. Identificador do endereço físico dentro do almoxarifado (WMS).</span></div>
            <div className="erp-field erp-c3"><label className="erp-label erp-req">Item</label><LookupField value={form.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(code) => setForm({ ...form, item_code: code ? String(code) : '' })}/></div>
            <div className="erp-field erp-c2"><label className="erp-label">Máscara</label><LookupField value={form.mask || undefined} loader={loadItemMasks} entityLabel="máscara" onChange={(code) => setForm({ ...form, mask: code ? String(code) : '' })}/></div>
            <div className="erp-field erp-c3"><label className="erp-label">Lote</label><input className="erp-input" value={form.lot_code} onChange={(e) => setForm({ ...form, lot_code: e.target.value })}/></div>
            <div className="erp-field erp-c4"><label className="erp-label erp-req">Data e horário programados</label><input className="erp-input" type="datetime-local" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })}/></div>
            <div className="erp-field erp-c8" style={{ justifyContent: 'flex-end' }}><button className="erp-btn erp-btn-primary" onClick={() => void schedule()} disabled={busy}>Programar contagem manual</button></div>
          </div></div>
          {selected && <div className="erp-fieldset"><div className="erp-fieldset-head">Conferência do item {selected.item_code}</div><div className="erp-fieldset-body">
            <div className="erp-field erp-c3"><label className="erp-label">Situação atual</label><div className="erp-kpi-value">{LABEL[selected.state]}</div></div>
            <div className="erp-field erp-c3"><label className="erp-label">Origem</label><div className="erp-kpi-value">{ORIGIN_LABEL[selected.origin]}</div>{selected.origin === 'POLITICA_ITEM' && selected.policy_days && <span className="erp-field-hint">Intervalo configurado: {selected.policy_days} dia(s).</span>}</div>
            <div className="erp-field erp-c3"><label className="erp-label">Quantidade esperada</label><div className="erp-kpi-value">{selected.expected_quantity ?? 'Será apurada ao iniciar'}</div></div>
            <div className="erp-field erp-c3"><label className="erp-label">Quantidade contada</label><div className="erp-kpi-value">{selected.counted_quantity ?? '—'}</div></div>
            <div className="erp-field erp-c3"><label className="erp-label">Divergência</label><div className="erp-kpi-value">{selected.divergence_quantity ?? '—'}</div></div>
            <div className="erp-field erp-c3"><label className="erp-label erp-req">Próxima etapa</label><select className="erp-input" value={transition.state} onChange={(e) => setTransition({ ...transition, state: e.target.value as CycleCount['state'] })}><option value="">Selecione…</option>{nextStates(selected.state).map((state) => <option key={state} value={state}>{LABEL[state]}</option>)}</select></div>
            <div className="erp-field erp-c3"><label className="erp-label">Quantidade física</label><input className="erp-input num" inputMode="decimal" value={transition.counted_quantity} onChange={(e) => setTransition({ ...transition, counted_quantity: e.target.value })}/><span className="erp-field-hint">Use vírgula ou ponto conforme aceito pelo backend.</span></div>
            <div className="erp-field erp-c4"><label className="erp-label">Motivo/observação</label><input className="erp-input" value={transition.reason} onChange={(e) => setTransition({ ...transition, reason: e.target.value })}/></div>
            <div className="erp-field erp-c2" style={{ justifyContent: 'flex-end' }}><button className="erp-btn erp-btn-primary" onClick={() => void applyTransition()} disabled={busy || !transition.state}>Confirmar etapa</button></div>
          </div></div>}
        </div></section>
      </div>
    </div>
    <footer className="erp-statusbar"><div className="erp-status-item">Programadas: <strong>{rows.filter((item) => item.state === 'PROGRAMADA').length}</strong></div><div className="erp-status-item">Divergentes: <strong>{rows.filter((item) => item.state === 'DIVERGENTE').length}</strong></div><div className="erp-status-spacer"/><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span></footer>
  </div>;
}

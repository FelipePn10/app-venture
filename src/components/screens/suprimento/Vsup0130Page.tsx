import { EntityName } from "@/components/ui/EntityName";
import { LaudosVinculoPanel } from "./LaudosVinculoPanel";
import { useRef, useState } from "react";
import {
  type ItemSupplierDTO, type ItemSupplierBlockEvent, type ItemSupplierSituacao,
  listItemSuppliers, upsertItemSupplier, deleteItemSupplier,
  blockItemSupplier, unblockItemSupplier, clearLearnedItemSupplier, listItemSupplierBlockHistory,
} from "@/services/purchasingMasterService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { confirmar, pedirTexto } from "@/components/ui/dialogos";
import { loadItems, loadSuppliers } from "@/services/lookups";

type FeedbackState = { type: "success" | "error" | "info" | "warn"; message: string } | null;
const EMPTY: ItemSupplierDTO = { item_code: "", supplier_code: 0, ranking: 1 };

const SITUACAO: Record<ItemSupplierSituacao, { rotulo: string; classe: string }> = {
  VIGENTE: { rotulo: "Vigente", classe: "ok" },
  BLOQUEADO: { rotulo: "Bloqueado", classe: "err" },
  VENCIDO: { rotulo: "Vencido", classe: "warn" },
  FUTURO: { rotulo: "Ainda não vigente", classe: "info" },
};

const numOuVazio = (v: string): number | undefined => (v.trim() === "" ? undefined : Number(v.replace(",", ".")));
const dataBR = (iso?: string): string => (iso ? new Date(iso).toLocaleString("pt-BR") : "");

export function Vsup0130Page(): JSX.Element {
  const [item, setItem] = useState<string | undefined>(undefined);
  const [list, setList] = useState<ItemSupplierDTO[]>([]);
  const [form, setForm] = useState<ItemSupplierDTO>(EMPTY);
  const [historico, setHistorico] = useState<ItemSupplierBlockEvent[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  // Item cuja lista está na tela (null = ainda não carregou). Separa "item sem
  // fornecedor" de "não carregado"; o pedido conta para descartar resposta
  // atrasada de um item anterior.
  const [carregado, setCarregado] = useState<string | null>(null);
  const pedido = useRef(0);

  async function carregar(manter?: number, codigo: string | undefined = item) {
    if (!codigo) { setFeedback({ type: "error", message: "Selecione o item." }); return; }
    const meu = ++pedido.current;
    setBusy(true);
    try {
      const l = await listItemSuppliers(codigo);
      if (meu !== pedido.current) return;
      setList(l);
      setCarregado(codigo);
      const sel = manter ? l.find((x) => x.id === manter) : undefined;
      if (sel) await selecionar(sel); else if (manter) setForm(EMPTY);
    } catch (e) {
      if (meu === pedido.current) setFeedback({ type: "error", message: errMessage(e) });
    } finally { if (meu === pedido.current) setBusy(false); }
  }
  async function selecionar(s: ItemSupplierDTO) {
    setForm({ ...s });
    setHistorico([]);
    if (s.id) {
      try { setHistorico(await listItemSupplierBlockHistory(s.id)); } catch { /* histórico é complementar */ }
    }
  }
  const setF = <K extends keyof ItemSupplierDTO>(k: K, v: ItemSupplierDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };

  async function salvar() {
    if (!item || !form.supplier_code) { setFeedback({ type: "error", message: "Item e fornecedor são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const salvo = await upsertItemSupplier({ ...form, item_code: item });
      setFeedback({ type: "success", message: "Vínculo salvo." });
      await carregar(salvo.id);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function remover(s: ItemSupplierDTO) {
    if (!s.id) return;
    const ok = await confirmar({
      titulo: "Excluir vínculo",
      mensagem: "O fornecedor deixa de ser fonte deste item. Se chegar nova nota fiscal dele com este item, o vínculo volta sozinho. Para impedir as compras deste fornecedor e manter o histórico, use Bloquear.",
      assunto: `Fornecedor ${s.supplier_code}`, rotulo: "Excluir", tom: "perigo",
    });
    if (!ok) return;
    setBusy(true); setFeedback(null);
    try { await deleteItemSupplier(s.id); if (form.id === s.id) setForm(EMPTY); await carregar(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function alternarBloqueio() {
    if (!form.id) return;
    const bloquear = !form.blocked;
    const motivo = await pedirTexto({
      titulo: bloquear ? "Bloquear fornecedor deste item" : "Desbloquear fornecedor deste item",
      mensagem: bloquear
        ? "Bloqueado, o fornecedor não é sugerido pelo planejamento e não pode entrar em pedido de compra nem em remessa ao terceiro deste item. O histórico fica guardado."
        : "O fornecedor volta a ser fonte deste item.",
      assunto: `Fornecedor ${form.supplier_code}`,
      rotulo: "Motivo", multilinha: true, minimo: 3,
      rotuloConfirmar: bloquear ? "Bloquear" : "Desbloquear",
    });
    if (motivo === null) return;
    setBusy(true); setFeedback(null);
    try {
      await (bloquear ? blockItemSupplier(form.id, motivo) : unblockItemSupplier(form.id, motivo));
      setFeedback({ type: "success", message: bloquear ? "Fornecedor bloqueado para este item." : "Fornecedor desbloqueado." });
      await carregar(form.id);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function limparAprendido() {
    if (!form.id) return;
    const ok = await confirmar({
      titulo: "Limpar identificação do fornecedor",
      mensagem: "Apaga o código e a descrição que a entrada de nota fiscal ligou a este item. A próxima nota deste fornecedor com esse código volta a pedir a escolha do item.",
      assunto: [form.supplier_item_code, form.supplier_item_desc].filter(Boolean).join(" — "),
      rotulo: "Limpar", tom: "aviso",
    });
    if (!ok) return;
    setBusy(true); setFeedback(null);
    try { await clearLearnedItemSupplier(form.id); setFeedback({ type: "success", message: "Identificação limpa." }); await carregar(form.id); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const cotaTotal = list.filter((s) => s.quota_percent).reduce((t, s) => t + (s.quota_percent ?? 0), 0);
  const vigentes = list.filter((s) => (s.situacao ?? "VIGENTE") === "VIGENTE").length;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Suprimento</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Fornecedor Preferencial por Item</span>
          <span className="erp-crumb-code">VSUP0130</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Sem fornecedor vigente o item não pode ser comprado nem enviado ao terceiro</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Item</span>
          <div className="erp-tlookup"><LookupField value={item} loader={loadItems} entityLabel="item" placeholder="Selecionar item" onChange={(c) => { setItem(c); setList([]); setForm(EMPTY); setHistorico([]); setCarregado(null); setFeedback(null); pedido.current++; if (c) void carregar(undefined, c); }} /></div>
          <button className="erp-btn erp-btn-dark" onClick={() => void carregar()} disabled={busy || !item}>{busy && <span className="erp-spin" />}Carregar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VSUP0130 — Fornecedor Preferencial por Item" filename="vsup0130" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        {carregado && carregado === item && vigentes === 0 && (
          <div className="erp-feedback warn">{list.length === 0 ? "Item sem fornecedor" : "Nenhum fornecedor vigente"}: o item não pode entrar em pedido de compra nem em remessa ao terceiro, e o planejamento não sabe de quem comprar. Vincule um fornecedor ao lado.</div>
        )}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head">
              <span className="erp-panel-title">Fornecedores do item</span>
              <span className="erp-count">{list.length}</span>
            </div>
            <div className="erp-list">
              {list.length === 0 && (carregado
                ? <div className="erp-list-empty">Nenhum fornecedor vinculado a este item.</div>
                : <div className="erp-list-empty">Selecione um item.</div>)}
              {[...list].sort((a, b) => Number(!!b.is_preferred) - Number(!!a.is_preferred) || a.ranking - b.ranking).map((s) => {
                const sit = SITUACAO[s.situacao ?? "VIGENTE"];
                return (
                  <div key={s.id} className={`erp-list-row${form.id === s.id ? " sel" : ""}`} onClick={() => void selecionar(s)}>
                    <span className="erp-list-code"><EntityName code={s.supplier_code} loader={loadSuppliers} /></span>
                    <span className="erp-list-sub">{s.supplier_item_desc || s.supplier_item_code || "—"}</span>
                    <div className="erp-list-meta">
                      {s.is_preferred ? <span className="erp-badge ok">Preferencial</span> : <span className="erp-badge draft">Ranking {s.ranking}</span>}
                      {sit.rotulo !== "Vigente" && <span className={`erp-badge ${sit.classe}`}>{sit.rotulo}</span>}
                      {s.mask ? <span className="erp-badge info" title="Vale só para esta máscara do item">Máscara {s.mask}</span> : null}
                      {s.quota_percent ? <span className="erp-badge info">Cota {s.quota_percent}%</span> : null}
                      {s.lead_time_days ? <span className="erp-badge draft">{s.lead_time_days} dias</span> : null}
                      <button className="erp-btn erp-btn-danger erp-btn-sm" style={{ marginLeft: "auto" }} onClick={(e) => { e.stopPropagation(); void remover(s); }} disabled={busy}>Excluir</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">{form.id ? "Vínculo do fornecedor" : "Vincular fornecedor"}</button>{form.id ? <button className="erp-tab" onClick={() => { setForm(EMPTY); setHistorico([]); }}>+ Novo vínculo</button> : null}</div>
            <div className="erp-detail-body">
              {form.blocked && (
                <div className="erp-feedback error">Bloqueado{form.blocked_at ? ` em ${dataBR(form.blocked_at)}` : ""}: {form.blocked_reason}</div>
              )}
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Vínculo item × fornecedor</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c6">
                    <label className="erp-label erp-req">Fornecedor</label>
                    <LookupField value={form.supplier_code || undefined} loader={loadSuppliers} entityLabel="fornecedor" placeholder="Selecionar fornecedor" disabled={!!form.id} onChange={(c) => setF("supplier_code", c ?? 0)} />
                    {form.id ? <span className="erp-field-hint">Para outro fornecedor, use <strong>+ Novo vínculo</strong>.{form.mask ? ` Vale só para a máscara ${form.mask}.` : ""}</span> : null}
                  </div>
                  <div className="erp-field erp-c2"><label className="erp-label" title="Ordem de preferência entre os fornecedores do item. 1 = o primeiro.">Ranking</label><input className="erp-input num" type="number" min={1} step={1} value={form.ranking} onChange={(e) => setF("ranking", Math.max(1, Math.trunc(Number(e.target.value) || 1)))} /></div>
                  <div className="erp-field erp-c4"><label className="erp-check" style={{ marginTop: 22 }}><input type="checkbox" checked={!!form.is_preferred} onChange={(e) => { setF("is_preferred", e.target.checked); if (e.target.checked) setF("ranking", 1); }} /> Fornecedor preferencial</label></div>
                </div>
              </div>

              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Política de compra deste fornecedor</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c3">
                    <label className="erp-label">Prazo de entrega (dias)</label>
                    <input className="erp-input num" type="number" min={0} step={1} value={form.lead_time_days ?? ""} onChange={(e) => { const v = numOuVazio(e.target.value); setF("lead_time_days", v === undefined ? undefined : Math.max(0, Math.trunc(v))); }} />
                    <span className="erp-field-hint">Vazio: vale o prazo de compra do item.</span>
                  </div>
                  <div className="erp-field erp-c3">
                    <label className="erp-label">Quantidade mínima</label>
                    <input className="erp-input num" type="number" min={0} step="any" value={form.min_order_qty ?? ""} onChange={(e) => setF("min_order_qty", numOuVazio(e.target.value))} />
                    <span className="erp-field-hint">Na unidade de estoque do item.</span>
                  </div>
                  <div className="erp-field erp-c3">
                    <label className="erp-label">Múltiplo de compra</label>
                    <input className="erp-input num" type="number" min={0} step="any" value={form.order_multiple ?? ""} onChange={(e) => setF("order_multiple", numOuVazio(e.target.value))} />
                    <span className="erp-field-hint">A sugestão de compra arredonda para cima.</span>
                  </div>
                  <div className="erp-field erp-c3">
                    <label className="erp-label" title="Com cota, cada necessidade vai inteira para o fornecedor mais atrasado em relação à sua cota; ao longo do tempo as compras se repartem pelos percentuais.">Cota da compra (%)</label>
                    <input className="erp-input num" type="number" min={0} max={100} step="any" value={form.quota_percent ?? ""} onChange={(e) => setF("quota_percent", numOuVazio(e.target.value))} />
                    <span className="erp-field-hint">Vazio: fora da divisão entre fornecedores.</span>
                  </div>
                </div>
              </div>

              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Vigência</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c3"><label className="erp-label">Válido de</label><input className="erp-input" type="date" value={form.valid_from ?? ""} onChange={(e) => setF("valid_from", e.target.value || undefined)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Válido até</label><input className="erp-input" type="date" value={form.valid_until ?? ""} onChange={(e) => setF("valid_until", e.target.value || undefined)} /></div>
                  <div className="erp-field erp-c6"><span className="erp-field-hint" style={{ marginTop: 22, display: "block" }}>Fora da vigência o fornecedor não é fonte do item. Em branco: sem limite.</span></div>
                </div>
              </div>

              <div className="erp-fieldset">
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c12" style={{ display: "flex", gap: 8 }}>
                    <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy && <span className="erp-spin" />}Salvar vínculo</button>
                    {form.id ? <button className={`erp-btn ${form.blocked ? "" : "erp-btn-danger"}`} onClick={() => void alternarBloqueio()} disabled={busy}>{form.blocked ? "Desbloquear" : "Bloquear"}</button> : null}
                  </div>
                </div>
              </div>

              {form.id ? (
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Identificação na nota do fornecedor</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c3"><label className="erp-label">Código no fornecedor</label><input className="erp-input" value={form.supplier_item_code ?? ""} readOnly /></div>
                    <div className="erp-field erp-c7"><label className="erp-label">Descrição no fornecedor</label><input className="erp-input" value={form.supplier_item_desc ?? ""} readOnly /></div>
                    <div className="erp-field erp-c2"><button className="erp-btn" style={{ marginTop: 22 }} onClick={() => void limparAprendido()} disabled={busy || (!form.supplier_item_code && !form.supplier_item_desc)}>Limpar</button></div>
                    <div className="erp-field erp-c12"><span className="erp-field-hint">Preenchidos pela entrada de nota fiscal quando a nota é ligada ao item: as próximas notas deste fornecedor já chegam com o item certo.</span></div>
                  </div>
                </div>
              ) : null}

              {form.id && historico.length > 0 ? (
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Histórico de bloqueio</div>
                  <div className="erp-fieldset-body">
                    <table className="erp-table">
                      <thead><tr><th>Quando</th><th>Ação</th><th>Motivo</th></tr></thead>
                      <tbody>{historico.map((h) => <tr key={h.id}><td>{dataBR(h.created_at)}</td><td>{h.action === "BLOQUEIO" ? "Bloqueio" : "Desbloqueio"}</td><td>{h.reason}</td></tr>)}</tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {form.id ? <LaudosVinculoPanel vinculoId={form.id} /> : null}
            </div>
          </section>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Fornecedores: <strong>{list.length}</strong></div>
        <div className="erp-status-item">Vigentes: <strong>{vigentes}</strong></div>
        {cotaTotal > 0 ? <div className="erp-status-item">Cota distribuída: <strong>{cotaTotal}%</strong></div> : null}
        {item ? <div className="erp-status-item">Item: <strong>#{item}</strong></div> : null}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

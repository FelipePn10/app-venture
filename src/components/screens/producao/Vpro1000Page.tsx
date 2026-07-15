import { useState, useCallback, useEffect } from "react";
import {
  type ToolDTO, type ToolSerialDTO, type ToolSheetDTO, type ToolSheetOperationDTO, type ToolLifeType, type ToolStatus,
  TOOL_LIFE_TYPES, TOOL_STATUSES,
  listTools, listToolsNeedingReplacement, createTool, deactivateTool, resetToolLife,
  listSerials, createSerial, updateSerial,
  listSheetOrders, getSheet, assignSerial, substituteSerial, listSubstitutions,
} from "@/services/toolingService";
import { errMessage, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type View = "sheet" | "tools";

const statusBadge = (s?: ToolStatus) => {
  const map: Record<string, string> = { ATIVA: "ok", MANUTENCAO: "warn", INATIVA: "err" };
  return <span className={`erp-badge ${map[s ?? ""] ?? "info"}`}>{s ?? "—"}</span>;
};
const EMPTY_TOOL: ToolDTO = { name: "", tool_type: "", life_type: "GOLPES", life_limit: 0, cost: 0 };

export function Vpro1000Page(): JSX.Element {
  const [view, setView] = useState<View>("sheet");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  // ── ficha ──
  const [orderQuery, setOrderQuery] = useState("");
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof listSheetOrders>>>([]);
  const [sheet, setSheet] = useState<ToolSheetDTO | null>(null);
  const [tools, setTools] = useState<ToolDTO[]>([]);
  const [serialCache, setSerialCache] = useState<Record<number, ToolSerialDTO[]>>({});
  const [opEdit, setOpEdit] = useState<Record<number, { toolId?: number; serialId?: number; reason?: string }>>({});
  const [subs, setSubs] = useState<Obj[]>([]);

  // ── ferramentas ──
  const [toolForm, setToolForm] = useState<ToolDTO>(EMPTY_TOOL);
  const [onlyReplacement, setOnlyReplacement] = useState(false);
  const [selTool, setSelTool] = useState<ToolDTO | null>(null);
  const [serials, setSerials] = useState<ToolSerialDTO[]>([]);
  const [serialForm, setSerialForm] = useState<ToolSerialDTO>({ serial_number: "", status: "ATIVA", location: "" });

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregarTools = useCallback(() => run(async () => { setTools(await listTools()); }), [run]);
  useEffect(() => { void carregarTools(); }, [carregarTools]);

  // ── ficha handlers ──
  const buscarOrdens = () => run(async () => {
    const list = await listSheetOrders(orderQuery || undefined);
    setOrders(list);
    setFeedback({ type: "info", message: `${list.length} ordem(ns) elegível(is) (OFC excluídas).` });
  });
  const abrirFicha = (orderId?: number) => { if (!orderId) return; void run(async () => {
    const s = await getSheet(orderId); setSheet(s); setOpEdit({}); setSubs([]);
  }); };
  const carregarSeriais = (toolId: number) => run(async () => {
    if (!serialCache[toolId]) setSerialCache((p) => ({ ...p, [toolId]: [] }));
    const list = await listSerials(toolId);
    setSerialCache((p) => ({ ...p, [toolId]: list }));
  });
  const setOp = (opId: number, patch: Partial<{ toolId: number; serialId: number; reason: string }>) =>
    setOpEdit((p) => ({ ...p, [opId]: { ...p[opId], ...patch } }));

  const vincular = (op: ToolSheetOperationDTO) => run(async () => {
    const ed = opEdit[op.operation_id!] ?? {};
    const toolId = ed.toolId ?? op.tool_id;
    const serialId = ed.serialId;
    if (!toolId || !serialId) { setFeedback({ type: "error", message: "Selecione ferramenta e série." }); return; }
    await assignSerial(op.operation_id!, toolId, serialId);
    setFeedback({ type: "success", message: `Série vinculada à operação ${op.sequence ?? op.operation_id}.` });
    if (sheet?.order?.order_id) abrirFicha(sheet.order.order_id);
  });
  const substituir = (op: ToolSheetOperationDTO) => run(async () => {
    const ed = opEdit[op.operation_id!] ?? {};
    const toolId = ed.toolId ?? op.tool_id;
    if (!toolId || !ed.serialId) { setFeedback({ type: "error", message: "Selecione a nova série." }); return; }
    await substituteSerial(op.operation_id!, toolId, ed.serialId, ed.reason);
    setFeedback({ type: "success", message: `Série substituída na operação ${op.sequence ?? op.operation_id} (histórico guardado).` });
    if (sheet?.order?.order_id) abrirFicha(sheet.order.order_id);
  });
  const verHistorico = (op: ToolSheetOperationDTO) => run(async () => {
    setSubs(await listSubstitutions(op.operation_id!, op.tool_id));
    setFeedback({ type: "info", message: `Histórico da operação ${op.sequence ?? op.operation_id}.` });
  });

  // ── ferramentas handlers ──
  const listarTools = () => run(async () => {
    setTools(onlyReplacement ? await listToolsNeedingReplacement() : await listTools());
  });
  const gravarTool = () => run(async () => {
    if (!toolForm.name.trim()) { setFeedback({ type: "error", message: "Informe o nome da ferramenta." }); return; }
    await createTool(toolForm); setToolForm(EMPTY_TOOL);
    setFeedback({ type: "success", message: "Ferramenta cadastrada (código gerado)." });
    setTools(await listTools());
  });
  const selecionarTool = (t: ToolDTO) => { setSelTool(t); void run(async () => { setSerials(t.id ? await listSerials(t.id) : []); }); };
  const zerarVida = (t: ToolDTO) => { if (!t.id) return; void run(async () => {
    await resetToolLife(t.id!); setFeedback({ type: "success", message: `Vida útil da ferramenta ${t.code ?? t.id} zerada.` });
    setTools(await listTools());
  }); };
  const inativarTool = (t: ToolDTO) => { if (!t.id) return; void run(async () => {
    await deactivateTool(t.id!); setFeedback({ type: "success", message: `Ferramenta ${t.code ?? t.id} inativada.` });
    setSelTool(null); setTools(await listTools());
  }); };
  const gravarSerial = () => run(async () => {
    if (!selTool?.id) return;
    if (!serialForm.serial_number.trim()) { setFeedback({ type: "error", message: "Informe o número de série." }); return; }
    await createSerial(selTool.id, serialForm); setSerialForm({ serial_number: "", status: "ATIVA", location: "" });
    setFeedback({ type: "success", message: "Série cadastrada." });
    setSerials(await listSerials(selTool.id));
  });
  const trocarStatusSerial = (s: ToolSerialDTO, status: ToolStatus) => { if (!s.id || !selTool?.id) return; void run(async () => {
    await updateSerial(s.id!, { ...s, status });
    setSerials(await listSerials(selTool.id!));
  }); };

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Produção &amp; Chão de Fábrica</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Ficha de Produção da Ferramenta</span>
          <span className="erp-crumb-code">VPRO1000</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Vínculo de série por operação · cadastro de ferramentas e vida útil</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className={`erp-btn${view === "sheet" ? " erp-btn-dark" : ""}`} onClick={() => setView("sheet")} disabled={busy}>Ficha de Produção</button>
          <button className={`erp-btn${view === "tools" ? " erp-btn-dark" : ""}`} onClick={() => setView("tools")} disabled={busy}>Cadastro de Ferramentas</button>
        </div>
        {view === "sheet" && sheet?.order?.order_id && <><span style={{ color: "var(--v-text-3)" }}>|</span><div className="erp-tgroup"><button className="erp-btn" onClick={() => abrirFicha(sheet.order!.order_id)} disabled={busy}>Atualiza</button></div></>}
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VPRO1000 — Ficha de Produção da Ferramenta" filename="vpro1000" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

        {view === "sheet" && (
          <>
            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Selecionar ordem (ordens tipo OFC são excluídas)</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c6"><label className="erp-label">Filtrar por nº / item</label><input className="erp-input" value={orderQuery} onChange={(e) => setOrderQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") buscarOrdens(); }} /></div>
                <div className="erp-field erp-c6" style={{ flexDirection: "row", alignItems: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={buscarOrdens} disabled={busy}>{busy && <span className="erp-spin" />}Buscar ordens</button></div>
                {orders.length > 0 && (
                  <div className="erp-field erp-c12">
                    <div className="erp-grid-wrap"><table className="erp-grid">
                      <thead><tr><th className="num">Nº</th><th>Tipo</th><th className="num">Item</th><th>Máscara</th><th className="num">Qtd</th><th style={{ width: 90 }}></th></tr></thead>
                      <tbody>{orders.map((o) => (
                        <tr key={o.order_id} className={sheet?.order?.order_id === o.order_id ? "erp-row-sel" : ""}>
                          <td className="num">{o.order_number ?? o.order_id}</td><td>{o.order_type || "—"}</td><td className="num">{o.item_code ?? "—"}</td><td>{o.mask || "—"}</td><td className="num">{o.planned_qty ?? "—"}</td>
                          <td><button className="erp-btn erp-btn-sm" onClick={() => abrirFicha(o.order_id)} disabled={busy}>Abrir</button></td>
                        </tr>
                      ))}</tbody>
                    </table></div>
                  </div>
                )}
              </div>
            </div>

            {sheet?.order && (
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Ficha da ordem {sheet.order.order_number ?? sheet.order.order_id} — item {sheet.order.item_code} {sheet.order.mask ? `(${sheet.order.mask})` : ""}</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c3"><label className="erp-label">Tipo</label><input className="erp-input" readOnly value={sheet.order.order_type ?? "—"} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Qtd planejada</label><input className="erp-input num" readOnly value={sheet.order.planned_qty ?? "—"} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Início</label><input className="erp-input" readOnly value={sheet.order.start_date?.slice(0, 10) ?? "—"} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Fim</label><input className="erp-input" readOnly value={sheet.order.end_date?.slice(0, 10) ?? "—"} /></div>
                </div>
              </div>
            )}

            {sheet?.operations && sheet.operations.length > 0 && (
              <div className="erp-grid-wrap">
                <table className="erp-grid">
                  <thead><tr><th className="num">Seq</th><th>Operação</th><th>Recurso</th><th>Ferramenta / Série atual</th><th>Trocar para</th><th style={{ width: 210 }}>Ações</th></tr></thead>
                  <tbody>
                    {sheet.operations.map((op) => {
                      const ed = opEdit[op.operation_id!] ?? {};
                      const toolId = ed.toolId ?? op.tool_id;
                      const cache = toolId ? serialCache[toolId] : undefined;
                      return (
                        <tr key={op.operation_id}>
                          <td className="num">{op.sequence ?? "—"}</td>
                          <td>{op.description || "—"}</td>
                          <td>{op.resource_name || op.resource_code || "—"}</td>
                          <td>{op.tool_name || (op.tool_id ? `Ferr. ${op.tool_id}` : "—")}{op.serial_number ? ` · ${op.serial_number}` : ""}</td>
                          <td>
                            <div style={{ display: "flex", gap: 4, flexDirection: "column" }}>
                              <select className="erp-tselect" value={toolId ?? ""} onChange={(e) => { const t = Number(e.target.value); setOp(op.operation_id!, { toolId: t, serialId: undefined }); if (t) carregarSeriais(t); }}>
                                <option value="">— ferramenta —</option>{tools.map((t) => <option key={t.id} value={t.id}>{t.code ?? t.id} · {t.name}</option>)}
                              </select>
                              <select className="erp-tselect" value={ed.serialId ?? ""} onChange={(e) => setOp(op.operation_id!, { serialId: e.target.value ? Number(e.target.value) : undefined })} disabled={!toolId}>
                                <option value="">— série —</option>{(cache ?? []).map((s) => <option key={s.id} value={s.id}>{s.serial_number} ({s.status})</option>)}
                              </select>
                              <input className="erp-input" placeholder="Motivo (substituição)" value={ed.reason ?? ""} onChange={(e) => setOp(op.operation_id!, { reason: e.target.value })} />
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              <button className="erp-btn erp-btn-primary erp-btn-sm" onClick={() => vincular(op)} disabled={busy}>Vincular</button>
                              <button className="erp-btn erp-btn-sm" onClick={() => substituir(op)} disabled={busy || !op.serial_id}>Substituir</button>
                              <button className="erp-btn erp-btn-sm" onClick={() => verHistorico(op)} disabled={busy}>Histórico</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {subs.length > 0 && (
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Histórico de substituições de série</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c12"><div className="erp-grid-wrap"><table className="erp-grid">
                    <thead><tr>{Object.keys(subs[0]).map((k) => <th key={k}>{k}</th>)}</tr></thead>
                    <tbody>{subs.map((r, i) => <tr key={i}>{Object.values(r).map((v, j) => <td key={j}>{v == null ? "—" : String(v)}</td>)}</tr>)}</tbody>
                  </table></div></div>
                </div>
              </div>
            )}
          </>
        )}

        {view === "tools" && (
          <div className="erp-main">
            <div className="erp-list-panel">
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Nova ferramenta (código gerado automaticamente)</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c6"><label className="erp-label erp-req">Nome</label><input className="erp-input" value={toolForm.name} onChange={(e) => setToolForm((p) => ({ ...p, name: e.target.value }))} /></div>
                  <div className="erp-field erp-c6"><label className="erp-label">Tipo</label><input className="erp-input" value={toolForm.tool_type ?? ""} onChange={(e) => setToolForm((p) => ({ ...p, tool_type: e.target.value }))} placeholder="MATRIZ, MOLDE…" /></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Vida (tipo)</label>
                    <select className="erp-tselect" value={toolForm.life_type} onChange={(e) => setToolForm((p) => ({ ...p, life_type: e.target.value as ToolLifeType }))}>{TOOL_LIFE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                  </div>
                  <div className="erp-field erp-c4"><label className="erp-label">Limite de vida</label><input className="erp-input num" type="number" value={toolForm.life_limit || ""} onChange={(e) => setToolForm((p) => ({ ...p, life_limit: Number(e.target.value) }))} /></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Custo</label><input className="erp-input num" type="number" value={toolForm.cost || ""} onChange={(e) => setToolForm((p) => ({ ...p, cost: Number(e.target.value) }))} /></div>
                  <div className="erp-field erp-c12" style={{ flexDirection: "row" }}><button className="erp-btn erp-btn-primary" onClick={gravarTool} disabled={busy}>Cadastrar ferramenta</button></div>
                </div>
              </div>
              <div className="erp-toolbar" style={{ borderRadius: 0 }}>
                <div className="erp-tgroup" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <input id="onlyrep" className="erp-check" type="checkbox" checked={onlyReplacement} onChange={(e) => setOnlyReplacement(e.target.checked)} />
                  <label htmlFor="onlyrep" className="erp-tgroup-label">Só as que precisam de troca</label>
                  <button className="erp-btn" onClick={listarTools} disabled={busy}>Atualizar</button>
                </div>
              </div>
              <div className="erp-grid-wrap">
                <table className="erp-grid">
                  <thead><tr><th>Código</th><th>Nome</th><th>Tipo</th><th className="num">Vida (uso/limite)</th><th>Status</th></tr></thead>
                  <tbody>
                    {tools.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhuma ferramenta.</td></tr>}
                    {tools.map((t) => (
                      <tr key={t.id} onClick={() => selecionarTool(t)} className={selTool?.id === t.id ? "erp-row-sel" : ""} style={{ cursor: "pointer" }}>
                        <td>{t.code ?? t.id}</td><td>{t.name}</td><td>{t.tool_type || "—"}</td>
                        <td className="num">{(t.life_used ?? 0)} / {t.life_limit ?? "—"} {t.life_type ?? ""}</td><td>{statusBadge(t.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="erp-detail-panel">
              {selTool ? (
                <>
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">{selTool.code ?? selTool.id} — {selTool.name} {statusBadge(selTool.status)}</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8 }}>
                        <button className="erp-btn" onClick={() => zerarVida(selTool)} disabled={busy}>Zerar vida útil</button>
                        <button className="erp-btn erp-btn-danger" onClick={() => inativarTool(selTool)} disabled={busy}>Inativar ferramenta</button>
                      </div>
                    </div>
                  </div>
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Nova série (cópia física)</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c4"><label className="erp-label erp-req">Nº série</label><input className="erp-input" value={serialForm.serial_number} onChange={(e) => setSerialForm((p) => ({ ...p, serial_number: e.target.value }))} /></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Status</label><select className="erp-tselect" value={serialForm.status} onChange={(e) => setSerialForm((p) => ({ ...p, status: e.target.value as ToolStatus }))}>{TOOL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                      <div className="erp-field erp-c3"><label className="erp-label">Localização</label><input className="erp-input" value={serialForm.location ?? ""} onChange={(e) => setSerialForm((p) => ({ ...p, location: e.target.value }))} /></div>
                      <div className="erp-field erp-c2" style={{ flexDirection: "row", alignItems: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={gravarSerial} disabled={busy}>Add</button></div>
                    </div>
                  </div>
                  <div className="erp-grid-wrap">
                    <table className="erp-grid">
                      <thead><tr><th>Nº série</th><th>Status</th><th>Localização</th><th className="num">Uso</th><th style={{ width: 160 }}></th></tr></thead>
                      <tbody>
                        {serials.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhuma série.</td></tr>}
                        {serials.map((s) => (
                          <tr key={s.id}><td>{s.serial_number}</td><td>{statusBadge(s.status)}</td><td>{s.location || "—"}</td><td className="num">{s.life_used ?? 0}</td>
                            <td><select className="erp-tselect" value={s.status} onChange={(e) => trocarStatusSerial(s, e.target.value as ToolStatus)}>{TOOL_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}</select></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="erp-fieldset"><div className="erp-fieldset-body"><p style={{ padding: 12, color: "var(--v-text-3)" }}>Selecione uma ferramenta para gerenciar as séries.</p></div></div>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="erp-statusbar">
        {view === "sheet" && <div className="erp-status-item">{sheet?.operations ? <>Operações: <strong>{sheet.operations.length}</strong></> : "Nenhuma ficha carregada"}</div>}
        {view === "tools" && <div className="erp-status-item">Ferramentas: <strong>{tools.length}</strong>{selTool && <> · Séries: <strong>{serials.length}</strong></>}</div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

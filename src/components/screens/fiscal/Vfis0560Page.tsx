import { useState, useCallback, useEffect } from "react";
import {
  type NotaEspecialDTO,
  listNotasEspeciais, createNotaEspecial, updateNotaEspecial, emitirNotaEspecial, cancelarNotaEspecial,
} from "@/services/fiscalAdvancedService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { confirmar } from "@/components/ui/dialogos";
import { loadIcmsApuracaoLinesById, loadIcmsAdjustmentCodesById } from "@/services/lookups";

/*
 * VFIS0560 — Notas especiais de ajuste: os ajustes da apuração do ICMS do mês
 * (crédito ou débito, conforme o código da tabela 5.1.1) que o SPED leva ao E111.
 * A nota nasce em rascunho; só depois de **Emitir** ela entra na apuração.
 * Nota complementar de ICMS é NF-e: emite-se na VFIS0200, não aqui. Itens, CFOP,
 * valor total e "gera resumo" saíram: nada os usava.
 */

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const currentPeriod = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
// Dia LOCAL: toISOString() dá o dia em UTC, que já é amanhã depois das 21h.
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

const EMPTY: NotaEspecialDTO = {
  empresa_id: 1, purpose: "AJUSTE", issue_date: todayIso(), period: currentPeriod(),
  total_icms: 0, observation: "",
};

const SITUACAO: Record<string, { rotulo: string; cls: string }> = {
  RASCUNHO: { rotulo: "Rascunho — fora do SPED", cls: "erp-badge-amber" },
  EMITIDA: { rotulo: "Emitida — no SPED (E111)", cls: "erp-badge-green" },
  CANCELADA: { rotulo: "Cancelada", cls: "erp-badge-red" },
};
function situacao(s?: string): JSX.Element {
  const x = SITUACAO[(s ?? "").toUpperCase()] ?? { rotulo: s || "—", cls: "" };
  return <span className={`erp-badge ${x.cls}`}>{x.rotulo}</span>;
}

export function Vfis0560Page(): JSX.Element {
  const [form, setForm] = useState<NotaEspecialDTO>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [list, setList] = useState<NotaEspecialDTO[]>([]);
  const [periodFilter, setPeriodFilter] = useState(currentPeriod());
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async (period: string) => {
    if (!/^\d{4}-\d{2}$/.test(period)) { setFeedback({ type: "error", message: "Informe o período no formato AAAA-MM." }); return; }
    setBusy(true);
    try { setList(await listNotasEspeciais({ period })); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar as notas especiais.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(currentPeriod()); }, [reload]);

  const setF = <K extends keyof NotaEspecialDTO>(k: K, v: NotaEspecialDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  function novo() { setForm({ ...EMPTY, issue_date: todayIso(), period: currentPeriod() }); setEditId(null); setFeedback(null); }
  function edit(n: NotaEspecialDTO) { setForm({ ...n }); setEditId(n.id ?? null); setFeedback(null); }

  async function salvar() {
    if (!/^\d{4}-\d{2}$/.test(form.period)) { setFeedback({ type: "error", message: "O período deve estar no formato AAAA-MM." }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (editId !== null) { await updateNotaEspecial({ ...form, id: editId }); setFeedback({ type: "success", message: `Nota ${editId} alterada (continua em rascunho).` }); }
      else { await createNotaEspecial(form); setFeedback({ type: "success", message: "Nota criada em rascunho. Emita-a para entrar na apuração do mês." }); }
      novo(); await reload(periodFilter);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function mudar(n: NotaEspecialDTO, acao: "emitir" | "cancelar") {
    if (!n.id) return;
    const ok = await confirmar(acao === "emitir"
      ? { titulo: `Emitir a nota ${n.id}`, mensagem: `O ajuste de R$ ${money(n.total_icms)} entra na apuração de ${n.period} e vai ao SPED (E111). Depois de emitida, a nota não se altera.`, rotulo: "Emitir" }
      : { titulo: `Cancelar a nota ${n.id}`, mensagem: "A nota sai da apuração e do SPED. Não se desfaz.", rotulo: "Cancelar nota", tom: "perigo" });
    if (!ok) return;
    setBusy(true); setFeedback(null);
    try {
      if (acao === "emitir") await emitirNotaEspecial(n.id); else await cancelarNotaEspecial(n.id);
      setFeedback({ type: "success", message: acao === "emitir" ? `Nota ${n.id} emitida: entra no SPED de ${n.period}.` : `Nota ${n.id} cancelada.` });
      if (editId === n.id) novo();
      await reload(periodFilter);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Notas Especiais de Ajuste</span><span className="erp-crumb-code">VFIS0560</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={novo} disabled={busy}>+ Novo ajuste</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Período</span>
          <input className="erp-input" style={{ width: 110, height: 32 }} value={periodFilter} placeholder="AAAA-MM" onChange={(e) => setPeriodFilter(e.target.value)} />
          <button className="erp-btn" onClick={() => void reload(periodFilter)} disabled={busy}>Filtrar</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : editId !== null ? "Salvar alteração" : "Salvar rascunho"}</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0560 — Notas Especiais de Ajuste" filename="vfis0560" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Ajustes da apuração do ICMS</button></div>
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
            <div className="erp-fieldset"><div className="erp-fieldset-head">{editId !== null ? `Alterando a nota ${editId} (rascunho)` : "Novo ajuste (rascunho)"}</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c12"><p className="erp-note" style={{ margin: 0 }}>
                Lance aqui o ajuste da apuração do ICMS do mês que não vem de nota fiscal (estorno de crédito, crédito outorgado, ajuste de débito).
                O <strong>código de ajuste</strong> (tabela 5.1.1, cadastrada na VFIS0510) diz se é crédito ou débito. O rascunho não conta: <strong>Emita</strong> a nota para ela entrar na apuração e no SPED (E111).
              </p></div>
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Período</label>
                <input className="erp-input" value={form.period} placeholder="AAAA-MM" onChange={(e) => setF("period", e.target.value)} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Data</label>
                <input className="erp-input" type="date" value={(form.issue_date || "").slice(0, 10)} onChange={(e) => setF("issue_date", e.target.value)} /></div>
              <div className="erp-field erp-c4" title="Código da tabela 5.1.1 da UF (cadastre na VFIS0510). Vai ao SPED no E111 e define se o ajuste é crédito ou débito."><label className="erp-label erp-label-tip">Código de ajuste</label>
                <LookupField value={form.adjustment_code_id ?? undefined} loader={loadIcmsAdjustmentCodesById}
                  entityLabel="código de ajuste" placeholder="Buscar o código (5.1.1)" allowManualCode={false} clearable
                  dica="Código da tabela 5.1.1 da UF (cadastre na VFIS0510). Vai ao SPED no E111 e define se o ajuste é crédito ou débito."
                  onChange={(c) => setF("adjustment_code_id", c ? Number(c) : undefined)} /></div>
              <div className="erp-field erp-c4" title="Opcional. Sem código de ajuste na nota, vale o código da linha de apuração (cadastrada na VFIS0510)."><label className="erp-label erp-label-tip">Linha de apuração</label>
                <LookupField value={form.icms_apuracao_line_id ?? undefined} loader={loadIcmsApuracaoLinesById}
                  entityLabel="linha da apuração" placeholder="Buscar a linha" allowManualCode={false} clearable
                  dica="Opcional. Sem código de ajuste na nota, vale o código da linha de apuração (cadastrada na VFIS0510)."
                  onChange={(c) => setF("icms_apuracao_line_id", c ? Number(c) : undefined)} /></div>
              <div className="erp-field erp-c3"><label className="erp-label erp-req">Valor do ICMS do ajuste</label>
                <input className="erp-input num" type="number" step="0.01" min="0" value={form.total_icms} onChange={(e) => setF("total_icms", Number(e.target.value))} /></div>
              <div className="erp-field erp-c9"><label className="erp-label">Descrição do ajuste</label>
                <input className="erp-input" value={form.observation ?? ""} placeholder="Ex.: estorno de crédito de mercadoria perdida (vai ao SPED)" onChange={(e) => setF("observation", e.target.value)} /></div>
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Ajustes de {periodFilter} — <span style={{ fontWeight: 400, opacity: 0.65 }}>{list.length}</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead><tr><th>#</th><th>Período</th><th>Descrição</th><th>Situação</th><th className="num">ICMS do ajuste</th><th style={{ width: 230 }}>Ações</th></tr></thead>
                  <tbody>
                    {list.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum ajuste neste período.</td></tr>}
                    {list.map((n) => {
                      const rascunho = (n.status ?? "").toUpperCase() === "RASCUNHO";
                      const cancelada = (n.status ?? "").toUpperCase() === "CANCELADA";
                      return (
                        <tr key={n.id}>
                          <td>{n.id}</td><td style={{ fontWeight: 600 }}>{n.period}</td><td>{n.observation || "—"}</td><td>{situacao(n.status)}</td>
                          <td className="num">{money(n.total_icms)}</td>
                          <td><div style={{ display: "flex", gap: 6 }}>
                            {rascunho && <button className="erp-btn erp-btn-sm" onClick={() => edit(n)} disabled={busy}>Alterar</button>}
                            {rascunho && <button className="erp-btn erp-btn-sm erp-btn-primary" onClick={() => void mudar(n, "emitir")} disabled={busy}>Emitir</button>}
                            {!cancelada && <button className="erp-btn erp-btn-sm" onClick={() => void mudar(n, "cancelar")} disabled={busy}>Cancelar</button>}
                          </div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div></div>
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div style={{ display: "contents" }}><div className="erp-status-item">Ajustes: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

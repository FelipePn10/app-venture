import { useCallback, useEffect, useState } from "react";
import { computeScorecard, createHomologation, generateSupplierItems, listSupplierHomologations, listSupplierScorecards } from "@/services/procurementService";
import { errMessage, parseNum, parseStr, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadSuppliers } from "@/services/lookups";
import { hojeLocal } from "@/utils/dataLocal";
import { confirmar } from "@/components/ui/dialogos";

/*
 * VAVF0300 — Avaliação de Fornecedores: uma ficha por fornecedor com o IQF
 * (qualidade 40% + entrega 30% + comercial 20% + atendimento 10%, calculados do
 * histórico real de inspeções e entregas) e a homologação. Juntou a rotina
 * genérica VAVF0300, o "envio" de IQF (VAVF0204, que só gravava o cálculo) e a
 * homologação (VAVF0203).
 */
type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type Aba = "iqf" | "homologacao";
const pct = (n?: number) => `${(n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const data = (s: string) => (s ? s.slice(0, 10).split("-").reverse().join("/") : "—");
const inicioDoAno = () => `${hojeLocal().slice(0, 4)}-01-01`;
const SITUACAO: Record<string, string> = { HOMOLOGATED: "Homologado", CONDITIONAL: "Condicional", REJECTED: "Reprovado" };

export function Vavf0300Page(): JSX.Element {
  const [fornecedor, setFornecedor] = useState<number | undefined>();
  const [aba, setAba] = useState<Aba>("iqf");
  const [scorecards, setScorecards] = useState<Obj[]>([]);
  const [homologacoes, setHomologacoes] = useState<Obj[]>([]);
  const [periodo, setPeriodo] = useState({ de: inicioDoAno(), ate: hojeLocal() });
  const [notas, setNotas] = useState({ comercial: "100", atendimento: "100" });
  const [calculo, setCalculo] = useState<Obj | null>(null);
  const [hom, setHom] = useState({ homologado: "80", condicional: "60", status: "", categoria: "", validade: "", obs: "" });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  const carregar = useCallback((s?: number) => run(async () => {
    if (!s) { setScorecards([]); setHomologacoes([]); return; }
    const [sc, hm] = await Promise.all([listSupplierScorecards(s), listSupplierHomologations(s)]);
    setScorecards(sc); setHomologacoes(hm);
  }), [run]);
  useEffect(() => { setCalculo(null); void carregar(fornecedor); }, [fornecedor, carregar]);

  const calcular = (gravar: boolean) => run(async () => {
    if (!fornecedor || !periodo.de || !periodo.ate || periodo.ate < periodo.de) { setFeedback({ type: "error", message: "Escolha o fornecedor e um período válido." }); return; }
    const r = await computeScorecard({ supplier_code: fornecedor, period_start: periodo.de, period_end: periodo.ate, commercial_score: Number(notas.comercial) || 0, service_score: Number(notas.atendimento) || 0, persist: gravar });
    setCalculo(r);
    if (gravar) { setScorecards(await listSupplierScorecards(fornecedor)); setFeedback({ type: "success", message: "IQF gravado no histórico do fornecedor." }); }
  });
  const homologar = () => run(async () => {
    if (!fornecedor) { setFeedback({ type: "error", message: "Escolha o fornecedor." }); return; }
    const h = Number(hom.homologado), c = Number(hom.condicional);
    if (Number.isNaN(h) || Number.isNaN(c) || c > h) { setFeedback({ type: "error", message: "O mínimo para condicional não pode passar do mínimo para homologar." }); return; }
    await createHomologation({ supplier_code: fornecedor, period_start: periodo.de, period_end: periodo.ate, homologated_min: h, conditional_min: c,
      status: hom.status, category: hom.categoria.trim() || null, valid_until: hom.validade || null, notes: hom.obs.trim() || null });
    setHomologacoes(await listSupplierHomologations(fornecedor));
    setFeedback({ type: "success", message: "Homologação registrada." });
  });
  const gerarItens = async () => {
    if (!fornecedor || !(await confirmar({ titulo: "Gerar itens do fornecedor", mensagem: "Cria o vínculo item × fornecedor (VSUP0130) de todos os itens já comprados dele. Vínculos existentes ficam como estão.", rotulo: "Gerar" }))) return;
    void run(async () => { const r = await generateSupplierItems(fornecedor); setFeedback({ type: "success", message: `Vínculos gerados: ${parseNum(r, "created", "generated", "count")}.` }); });
  };

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Inspeção</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Avaliação de Fornecedores</span><span className="erp-crumb-code">VAVF0300</span></nav>
        <div className="erp-titlebar-spacer" /><span className="erp-titlebar-meta">qualidade 40 · entrega 30 · comercial 20 · atendimento 10</span>
      </header>
      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Fornecedor</span>
          <div className="erp-tlookup" style={{ minWidth: 320 }}><LookupField value={fornecedor} loader={loadSuppliers} entityLabel="fornecedor" placeholder="Escolha o fornecedor" clearable onChange={(c) => setFornecedor(c ? Number(c) : undefined)} /></div></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VAVF0300 — Avaliação de Fornecedores" filename="vavf0300" /></div>
      </div>
      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <section className="erp-detail-panel">
          <div className="erp-tabs">
            <button className={`erp-tab${aba === "iqf" ? " active" : ""}`} onClick={() => setAba("iqf")}>IQF ({scorecards.length})</button>
            <button className={`erp-tab${aba === "homologacao" ? " active" : ""}`} onClick={() => setAba("homologacao")}>Homologação ({homologacoes.length})</button>
          </div>
          <div className="erp-detail-body">
            {!fornecedor && <div className="erp-list-empty">Escolha o fornecedor na barra.</div>}
            {fornecedor && <div className="erp-fieldset"><div className="erp-fieldset-head">Período avaliado</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c3"><label className="erp-label erp-req">De</label><input className="erp-input" type="date" value={periodo.de} onChange={(e) => setPeriodo((p) => ({ ...p, de: e.target.value }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label erp-req">Até</label><input className="erp-input" type="date" value={periodo.ate} onChange={(e) => setPeriodo((p) => ({ ...p, ate: e.target.value }))} /></div>
            </div></div>}

            {fornecedor && aba === "iqf" && <>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Calcular o IQF</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label">Nota comercial (0 a 100)</label><input className="erp-input num" inputMode="numeric" value={notas.comercial} onChange={(e) => setNotas((n) => ({ ...n, comercial: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Nota de atendimento (0 a 100)</label><input className="erp-input num" inputMode="numeric" value={notas.atendimento} onChange={(e) => setNotas((n) => ({ ...n, atendimento: e.target.value }))} /></div>
                <div className="erp-field erp-c6" style={{ flexDirection: "row", gap: 8, alignItems: "flex-end", justifyContent: "flex-end" }}>
                  <button className="erp-btn" onClick={() => void calcular(false)} disabled={busy}>Calcular (prévia)</button>
                  <button className="erp-btn erp-btn-primary" onClick={() => void calcular(true)} disabled={busy}>Calcular e gravar</button></div>
                <div className="erp-field erp-c12"><span className="erp-field-hint">Qualidade e entrega vêm do histórico do período (peças aprovadas na inspeção e recebimentos no prazo); comercial e atendimento são as notas informadas.</span></div>
                {calculo && <div className="erp-field erp-c12"><table className="erp-grid"><thead><tr><th className="num">Qualidade</th><th className="num">Entrega</th><th className="num">Comercial</th><th className="num">Atendimento</th><th className="num">IQF</th></tr></thead>
                  <tbody><tr><td className="num">{pct(parseNum(calculo, "quality_score"))}</td><td className="num">{pct(parseNum(calculo, "delivery_score"))}</td><td className="num">{pct(parseNum(calculo, "commercial_score"))}</td><td className="num">{pct(parseNum(calculo, "service_score"))}</td><td className="num" style={{ fontWeight: 700 }}>{pct(parseNum(calculo, "overall_score"))}</td></tr></tbody></table></div>}
              </div></div>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Histórico do IQF</div><div className="erp-fieldset-body"><div className="erp-field erp-c12"><table className="erp-grid">
                <thead><tr><th>Período</th><th className="num">Qualidade</th><th className="num">Entrega</th><th className="num">Comercial</th><th className="num">Atendimento</th><th className="num">IQF</th></tr></thead>
                <tbody>
                  {scorecards.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum IQF gravado.</td></tr>}
                  {scorecards.map((s, i) => <tr key={i}><td>{data(parseStr(s, "period_start"))} a {data(parseStr(s, "period_end"))}</td><td className="num">{pct(parseNum(s, "quality_score"))}</td><td className="num">{pct(parseNum(s, "delivery_score"))}</td><td className="num">{pct(parseNum(s, "commercial_score"))}</td><td className="num">{pct(parseNum(s, "service_score"))}</td><td className="num" style={{ fontWeight: 700 }}>{pct(parseNum(s, "overall_score"))}</td></tr>)}
                </tbody>
              </table></div></div></div>
            </>}

            {fornecedor && aba === "homologacao" && <>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Nova homologação</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c2"><label className="erp-label">Homologa a partir de (IQF)</label><input className="erp-input num" inputMode="decimal" value={hom.homologado} onChange={(e) => setHom((h) => ({ ...h, homologado: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Condicional a partir de</label><input className="erp-input num" inputMode="decimal" value={hom.condicional} onChange={(e) => setHom((h) => ({ ...h, condicional: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Situação</label><select className="erp-input" value={hom.status} onChange={(e) => setHom((h) => ({ ...h, status: e.target.value }))}><option value="">Pelo IQF do período</option><option value="HOMOLOGATED">Homologado</option><option value="CONDITIONAL">Condicional</option><option value="REJECTED">Reprovado</option></select></div>
                <div className="erp-field erp-c2"><label className="erp-label">Categoria</label><input className="erp-input" maxLength={20} placeholder="A, B, C…" value={hom.categoria} onChange={(e) => setHom((h) => ({ ...h, categoria: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Válida até</label><input className="erp-input" type="date" value={hom.validade} onChange={(e) => setHom((h) => ({ ...h, validade: e.target.value }))} /></div>
                <div className="erp-field erp-c9"><label className="erp-label">Observação</label><input className="erp-input" value={hom.obs} onChange={(e) => setHom((h) => ({ ...h, obs: e.target.value }))} /></div>
                <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void homologar()} disabled={busy}>Registrar homologação</button></div>
              </div></div>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Homologações do fornecedor</div><div className="erp-fieldset-body"><div className="erp-field erp-c12"><table className="erp-grid">
                <thead><tr><th>Decidida em</th><th>Situação</th><th className="num">IQF</th><th>Categoria</th><th>Válida até</th><th>Observação</th></tr></thead>
                <tbody>
                  {homologacoes.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhuma homologação.</td></tr>}
                  {homologacoes.map((h, i) => <tr key={i}><td>{data(parseStr(h, "decided_at"))}</td><td>{SITUACAO[parseStr(h, "status")] ?? parseStr(h, "status")}</td><td className="num">{h.iqf_score != null ? pct(parseNum(h, "iqf_score")) : "—"}</td><td>{parseStr(h, "category") || "—"}</td><td>{data(parseStr(h, "valid_until"))}</td><td>{parseStr(h, "notes") || "—"}</td></tr>)}
                </tbody>
              </table></div>
              <div className="erp-field erp-c12"><button className="erp-btn erp-btn-sm" onClick={() => void gerarItens()} disabled={busy}>Gerar os vínculos item × fornecedor pelo histórico de compras</button></div>
              </div></div>
            </>}
          </div>
        </section>
      </div>
      <footer className="erp-statusbar"><div className="erp-status-item">IQF gravados: <strong>{scorecards.length}</strong></div><div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span></footer>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import {
  type Calibracao, type CalibracaoDTO, type Impacto, type Instrumento, type InstrumentoDTO,
  baixarInstrumento, impactoDoInstrumento, listarInstrumentos, obterInstrumento, registrarCalibracao, salvarInstrumento,
} from "@/services/metrologiaService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const dataBR = (s?: string) => (s ? new Date(s.length === 10 ? `${s}T12:00:00` : s).toLocaleDateString("pt-BR") : "—");
const hojeISO = () => new Date().toISOString().slice(0, 10);
const num = (s: string) => { const t = s.trim(); return t === "" ? undefined : t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t; };
const situacao = (i: Instrumento): [string, string] => {
  if (i.status === "BAIXADO") return ["Baixado", "erp-badge-gray"];
  if (i.status === "BLOQUEADO") return ["Bloqueado", "erp-badge-red"];
  if (!i.proxima_calibracao) return ["Sem calibração", "erp-badge-red"];
  const dias = Math.floor((new Date(`${i.proxima_calibracao.slice(0, 10)}T12:00:00`).getTime() - Date.now()) / 86400000);
  if (dias < 0) return ["Vencido", "erp-badge-red"];
  if (dias <= 30) return [`Vence em ${dias + 1} dia(s)`, "erp-badge-amber"];
  return ["Em dia", "erp-badge-green"];
};
const VAZIO: InstrumentoDTO & { id: number | null } = { id: null, codigo: "", descricao: "", grupo: "", frequencia_dias: 180 };

export function Vins0600Page(): JSX.Element {
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const [filtro, setFiltro] = useState({ situacao: "", grupo: "" });
  const [lista, setLista] = useState<Instrumento[]>([]);
  const [form, setForm] = useState<typeof VAZIO & { resolucaoTxt: string; emaTxt: string }>({ ...VAZIO, resolucaoTxt: "", emaTxt: "" });
  const [aberto, setAberto] = useState<(Instrumento & { calibracoes: Calibracao[] }) | null>(null);
  const [cal, setCal] = useState({ data: hojeISO(), executor: "INTERNO", laboratorio: "", certificado: "", erro: "", incerteza: "", resultado: "", ajustado: false, obs: "" });
  const [impacto, setImpacto] = useState<{ desde?: string; lotes: Impacto[]; consulta?: boolean } | null>(null);
  const [desdeImpacto, setDesdeImpacto] = useState("");
  const [motivoBaixa, setMotivoBaixa] = useState("");

  const recarregar = useCallback(async () => {
    setBusy(true);
    try { setLista(await listarInstrumentos({ situacao: filtro.situacao, grupo: filtro.grupo })); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar os instrumentos.") }); }
    finally { setBusy(false); }
  }, [filtro]);
  useEffect(() => { void recarregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function abrir(id: number) {
    setBusy(true); setFeedback(null); setImpacto(null);
    try {
      const i = await obterInstrumento(id);
      setAberto(i);
      setForm({ id: i.id, codigo: i.codigo, descricao: i.descricao, grupo: i.grupo, fabricante: i.fabricante, numero_serie: i.numero_serie, faixa: i.faixa,
        unidade: i.unidade, localizacao: i.localizacao, frequencia_dias: i.frequencia_dias,
        resolucaoTxt: i.resolucao != null ? String(i.resolucao).replace(".", ",") : "", emaTxt: i.ema != null ? String(i.ema).replace(".", ",") : "" });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function consultarImpacto() {
    if (!aberto) return;
    setBusy(true); setFeedback(null);
    try { setImpacto({ desde: desdeImpacto || undefined, lotes: await impactoDoInstrumento(aberto.id, desdeImpacto), consulta: true }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function gravar() {
    setBusy(true); setFeedback(null);
    try {
      const { id, resolucaoTxt, emaTxt, ...dto } = form;
      const i = await salvarInstrumento(id, { ...dto, resolucao: num(resolucaoTxt), ema: num(emaTxt), frequencia_dias: Number(dto.frequencia_dias) });
      await recarregar(); await abrir(i.id);
      // Depois de abrir: abrir() limpa o aviso anterior.
      setFeedback({ type: "success", message: `Instrumento ${i.codigo} gravado.` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function calibrar() {
    if (!aberto) return;
    const dto: CalibracaoDTO = {
      data: cal.data, executor: cal.executor, laboratorio: cal.laboratorio || undefined, certificado: cal.certificado || undefined,
      erro_encontrado: num(cal.erro), incerteza: num(cal.incerteza), resultado: cal.resultado || undefined, ajustado: cal.ajustado, observacoes: cal.obs || undefined,
    };
    setBusy(true); setFeedback(null);
    try {
      const r = await registrarCalibracao(aberto.id, dto);
      await recarregar(); await abrir(aberto.id);
      if (r.calibracao.resultado === "REPROVADO") {
        setImpacto({ desde: r.impacto_desde, lotes: r.impacto ?? [] });
        setFeedback({ type: "error", message: `Calibração REPROVADA: o instrumento ${r.instrumento.codigo} foi bloqueado. Veja abaixo os lotes medidos com ele desde a última calibração aprovada.` });
      } else {
        setFeedback({ type: "success", message: `Calibração aprovada. Próxima em ${dataBR(r.calibracao.proxima)}.` });
      }
      setCal((c) => ({ ...c, erro: "", incerteza: "", certificado: "", obs: "", resultado: "" }));
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function baixar() {
    if (!aberto) return;
    setBusy(true); setFeedback(null);
    try {
      await baixarInstrumento(aberto.id, motivoBaixa);
      setFeedback({ type: "success", message: `Instrumento ${aberto.codigo} baixado.` });
      setAberto(null); setMotivoBaixa(""); await recarregar();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const f = (k: keyof typeof form, rotulo: string, cls = "erp-c3", tipo = "text") => (
    <div className={`erp-field ${cls}`}><label className="erp-label">{rotulo}</label>
      <input className="erp-input" type={tipo} value={(form[k] as string | number | undefined) ?? ""} onChange={(e) => setForm((x) => ({ ...x, [k]: e.target.value }))} /></div>
  );

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Inspeção</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Metrologia</span><span className="erp-crumb-code">VINS0600</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>
      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Consulta</span><button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Atualizar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Instrumento</span>
          <button className="erp-btn erp-btn-new" onClick={() => { setAberto(null); setForm({ ...VAZIO, resolucaoTxt: "", emaTxt: "" }); }}>Novo instrumento</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span><ExportButton title="VINS0600 — Metrologia" filename="vins0600" /></div>
      </div>
      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            <div className="erp-fieldset"><div className="erp-fieldset-head">Instrumentos — <span style={{ fontWeight: 400, opacity: 0.65 }}>{lista.length}</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c3"><label className="erp-label">Situação</label>
                <select className="erp-input" value={filtro.situacao} onChange={(e) => setFiltro((x) => ({ ...x, situacao: e.target.value }))}>
                  <option value="">Todos</option><option value="VENCIDOS">Vencidos / sem calibração</option><option value="A_VENCER">A vencer em 30 dias</option><option value="BLOQUEADOS">Bloqueados</option>
                </select></div>
              <div className="erp-field erp-c3"><label className="erp-label">Grupo</label>
                <input className="erp-input" value={filtro.grupo} onChange={(e) => setFiltro((x) => ({ ...x, grupo: e.target.value }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">&nbsp;</label><button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Consultar</button></div>
              <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                <table className="erp-grid">
                  <thead><tr><th>Código</th><th>Descrição</th><th>Grupo</th><th className="num">EMA</th><th>Frequência</th><th>Última</th><th>Próxima</th><th>Situação</th><th style={{ width: 80 }} /></tr></thead>
                  <tbody>
                    {lista.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">Nenhum instrumento.</td></tr>}
                    {lista.map((i) => { const [s, c] = situacao(i); return (
                      <tr key={i.id}><td style={{ fontWeight: 600 }}>{i.codigo}</td><td>{i.descricao}</td><td>{i.grupo}</td>
                        <td className="num">{i.ema != null ? `${String(i.ema).replace(".", ",")} ${i.unidade ?? ""}` : "—"}</td><td>{i.frequencia_dias} dias</td>
                        <td>{dataBR(i.ultima_calibracao)}</td><td>{dataBR(i.proxima_calibracao)}</td><td><span className={`erp-badge ${c}`}>{s}</span></td>
                        <td><button className="erp-btn erp-btn-sm" onClick={() => void abrir(i.id)}>Abrir</button></td></tr>
                    ); })}
                  </tbody>
                </table>
              </div>
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">{form.id ? `Instrumento ${form.codigo}` : "Novo instrumento"}</div><div className="erp-fieldset-body">
              {f("codigo", "Código", "erp-c2")}{f("descricao", "Descrição", "erp-c4")}
              <div className="erp-field erp-c3"><label className="erp-label">Grupo (o do roteiro de inspeção)</label>
                <input className="erp-input" value={form.grupo} onChange={(e) => setForm((x) => ({ ...x, grupo: e.target.value }))} placeholder="Ex.: PAQUIMETRO" /></div>
              {f("frequencia_dias", "Frequência (dias)", "erp-c3", "number")}
              {f("faixa", "Faixa", "erp-c2")}
              <div className="erp-field erp-c2"><label className="erp-label">Resolução</label><input className="erp-input" inputMode="decimal" value={form.resolucaoTxt} onChange={(e) => setForm((x) => ({ ...x, resolucaoTxt: e.target.value }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Erro máximo admissível</label><input className="erp-input" inputMode="decimal" value={form.emaTxt} onChange={(e) => setForm((x) => ({ ...x, emaTxt: e.target.value }))} /></div>
              {f("unidade", "Unidade", "erp-c1")}{f("fabricante", "Fabricante", "erp-c2")}{f("numero_serie", "Nº de série", "erp-c2")}{f("localizacao", "Localização", "erp-c1")}
              <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" onClick={() => void gravar()} disabled={busy || !form.codigo || !form.grupo}>Gravar instrumento</button></div>
            </div></div>

            {aberto && aberto.status !== "BAIXADO" && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Registrar calibração</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c2"><label className="erp-label">Data</label><input className="erp-input" type="date" value={cal.data} onChange={(e) => setCal((c) => ({ ...c, data: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Executor</label>
                  <select className="erp-input" value={cal.executor} onChange={(e) => setCal((c) => ({ ...c, executor: e.target.value }))}><option value="INTERNO">Interno</option><option value="EXTERNO">Laboratório externo</option></select></div>
                <div className="erp-field erp-c3"><label className="erp-label">Laboratório</label><input className="erp-input" value={cal.laboratorio} onChange={(e) => setCal((c) => ({ ...c, laboratorio: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Certificado</label><input className="erp-input" value={cal.certificado} onChange={(e) => setCal((c) => ({ ...c, certificado: e.target.value }))} /></div>
                <div className="erp-field erp-c1"><label className="erp-label">Erro</label><input className="erp-input" inputMode="decimal" value={cal.erro} onChange={(e) => setCal((c) => ({ ...c, erro: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Incerteza (U)</label><input className="erp-input" inputMode="decimal" value={cal.incerteza} onChange={(e) => setCal((c) => ({ ...c, incerteza: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Resultado (sem erro/EMA)</label>
                  <select className="erp-input" value={cal.resultado} onChange={(e) => setCal((c) => ({ ...c, resultado: e.target.value }))}><option value="">calculado pelo erro</option><option value="APROVADO">Aprovado</option><option value="REPROVADO">Reprovado</option></select></div>
                <div className="erp-field erp-c3"><label className="erp-check"><input type="checkbox" checked={cal.ajustado} onChange={(e) => setCal((c) => ({ ...c, ajustado: e.target.checked }))} /> Instrumento ajustado</label></div>
                <div className="erp-field erp-c6"><label className="erp-label">Observações</label><input className="erp-input" value={cal.obs} onChange={(e) => setCal((c) => ({ ...c, obs: e.target.value }))} /></div>
                <div className="erp-field erp-c12" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button className="erp-btn erp-btn-primary" onClick={() => void calibrar()} disabled={busy}>Registrar calibração</button>
                  <small>Com erro e EMA, o sistema decide: aprovado se |erro| + incerteza ≤ EMA. Reprovado bloqueia o instrumento.</small>
                </div>
              </div></div>
            )}

            {aberto && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Lotes medidos com o instrumento</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label">Desde (vazio = desde o início)</label><input className="erp-input" type="date" value={desdeImpacto} onChange={(e) => setDesdeImpacto(e.target.value)} /></div>
                <div className="erp-field erp-c9" style={{ display: "flex", alignItems: "flex-end" }}><button className="erp-btn" onClick={() => void consultarImpacto()} disabled={busy}>Consultar lotes</button></div>
              </div></div>
            )}

            {impacto && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">{impacto.consulta ? "Lotes medidos" : "Impacto da reprovação — lotes medidos"} desde {impacto.desde && !impacto.desde.startsWith("0001") ? dataBR(impacto.desde) : "o início"}</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead><tr><th>Lote</th><th>Item</th><th>Situação</th><th>Decisão</th><th className="num">Medições</th><th>Última medição</th></tr></thead>
                  <tbody>
                    {impacto.lotes.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum lote medido com o instrumento no período.</td></tr>}
                    {impacto.lotes.map((x) => <tr key={x.lote_id}><td>{x.lote_numero}</td><td>{x.item_code}</td><td>{x.status.toLowerCase()}</td><td>{x.decisao?.toLowerCase() ?? "—"}</td><td className="num">{x.medicoes}</td><td>{dataBR(x.ultima_medicao)}</td></tr>)}
                  </tbody>
                </table>
                <small>Reavalie esses lotes (remedição, contato com o cliente) e, se for o caso, abra uma CAPA na VINS0500.</small>
              </div></div></div>
            )}

            {aberto && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Calibrações de {aberto.codigo}</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead><tr><th>Data</th><th>Executor</th><th>Certificado</th><th className="num">Erro</th><th className="num">U</th><th className="num">EMA</th><th>Resultado</th><th>Próxima</th></tr></thead>
                  <tbody>
                    {aberto.calibracoes.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhuma calibração.</td></tr>}
                    {aberto.calibracoes.map((c) => (
                      <tr key={c.id}><td>{dataBR(c.data)}</td><td>{c.executor === "EXTERNO" ? c.laboratorio ?? "externo" : "interno"}</td><td>{c.certificado ?? "—"}</td>
                        <td className="num">{c.erro_encontrado ?? "—"}</td><td className="num">{c.incerteza ?? "—"}</td><td className="num">{c.ema ?? "—"}</td>
                        <td><span className={`erp-badge ${c.resultado === "APROVADO" ? "erp-badge-green" : "erp-badge-red"}`}>{c.resultado.toLowerCase()}</span>{c.ajustado ? " (ajustado)" : ""}</td>
                        <td>{dataBR(c.proxima)}</td></tr>
                    ))}
                  </tbody>
                </table>
                {aberto.status !== "BAIXADO" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <input className="erp-input" placeholder="motivo da baixa (quebrado, perdido…)" value={motivoBaixa} onChange={(e) => setMotivoBaixa(e.target.value)} />
                    <button className="erp-btn erp-btn-danger" disabled={busy || !motivoBaixa.trim()} onClick={() => void baixar()}>Baixar</button>
                  </div>
                )}
              </div></div></div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type AliquotasIBSCBS, type CFOPClassTrib, type ClassificacaoIBSCBS, type ModoReforma, type ModoReformaInfo,
  excluirAliquotas, excluirCFOP, listarAliquotas, listarCFOP, listarClassificacoes, obterModo, salvarAliquotas, salvarCFOP, salvarModo,
} from "@/services/reformaTributariaService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { useAuthStore } from "@/store/authStore";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Aba = "aliquotas" | "cfop" | "tabela";

const SO_ADMIN = "Somente o administrador altera a parametrização da reforma tributária.";
const pct = (n: number | null | undefined) => (n == null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%`);
const ROTULO_FONTE: Record<string, string> = { EMPRESA: "Cadastro da empresa", LEI: "Lei (LC 214/2025)", PENDENTE: "Pendente" };
const BADGE_FONTE: Record<string, string> = { EMPRESA: "erp-badge-blue", LEI: "erp-badge-green", PENDENTE: "erp-badge-red" };

const ALIQ_VAZIA = { ano: new Date().getFullYear() + 1, ibs_uf: "", ibs_mun: "", cbs: "", fundamento: "" };

export function Vfis0670Page(): JSX.Element {
  const isAdmin = useAuthStore((state) => state.user?.role?.toUpperCase() === "ADMIN");
  const [aba, setAba] = useState<Aba>("aliquotas");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const [aliquotas, setAliquotas] = useState<AliquotasIBSCBS[]>([]);
  const [formAliq, setFormAliq] = useState(ALIQ_VAZIA);

  const [cfops, setCfops] = useState<CFOPClassTrib[]>([]);
  const [formCfop, setFormCfop] = useState({ cfop: "", cclass_trib: "", observacao: "" });

  const [tabela, setTabela] = useState<ClassificacaoIBSCBS[]>([]);
  const [filtroCst, setFiltroCst] = useState("");
  const [modo, setModo] = useState<ModoReformaInfo | null>(null);
  const [formModo, setFormModo] = useState<{ modo: ModoReforma; motivo: string }>({ modo: "AUTOMATICO", motivo: "" });
  const [busca, setBusca] = useState("");

  const recarregar = useCallback(async () => {
    setBusy(true);
    try {
      const [a, c, t, m] = await Promise.all([listarAliquotas(), listarCFOP(), listarClassificacoes(), obterModo()]);
      setAliquotas(a); setCfops(c); setTabela(t); setModo(m);
      setFormModo({ modo: m.modo, motivo: m.motivo ?? "" });
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar a parametrização da reforma tributária.") });
    } finally { setBusy(false); }
  }, []);
  useEffect(() => { void recarregar(); }, [recarregar]);

  const csts = useMemo(() => {
    const m = new Map<string, string>();
    tabela.forEach((c) => m.set(c.cst, c.cst_descricao));
    return [...m.entries()].sort();
  }, [tabela]);
  const tabelaFiltrada = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return tabela.filter((c) => (!filtroCst || c.cst === filtroCst) &&
      (!b || c.cclass_trib.startsWith(b) || c.descricao.toLowerCase().includes(b)));
  }, [tabela, filtroCst, busca]);
  const descricaoDe = (codigo: string) => tabela.find((c) => c.cclass_trib === codigo)?.descricao;
  const pendentes = aliquotas.filter((a) => a.fonte === "PENDENTE" && a.ano <= new Date().getFullYear() + 1);

  function editarAno(a: AliquotasIBSCBS) {
    setFormAliq({ ano: a.ano, ibs_uf: a.ibs_uf == null ? "" : String(a.ibs_uf), ibs_mun: a.ibs_mun == null ? "" : String(a.ibs_mun),
      cbs: a.cbs == null ? "" : String(a.cbs), fundamento: a.fonte === "EMPRESA" ? a.fundamento : "" });
    setFeedback(null);
  }

  async function gravarAno() {
    const n = (v: string) => Number(v.replace(",", "."));
    if ([formAliq.ibs_uf, formAliq.ibs_mun, formAliq.cbs].some((v) => v.trim() === "" || Number.isNaN(n(v)))) {
      setFeedback({ type: "error", message: "Informe as três alíquotas (IBS estadual, IBS municipal e CBS), em %." }); return;
    }
    setBusy(true); setFeedback(null);
    try {
      await salvarAliquotas(formAliq.ano, { ibs_uf: n(formAliq.ibs_uf), ibs_mun: n(formAliq.ibs_mun), cbs: n(formAliq.cbs), fundamento: formAliq.fundamento.trim() });
      setFeedback({ type: "success", message: `Alíquotas de ${formAliq.ano} gravadas.` });
      setFormAliq(ALIQ_VAZIA); await recarregar();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function voltarParaLei(ano: number) {
    setBusy(true); setFeedback(null);
    try {
      await excluirAliquotas(ano);
      setFeedback({ type: "success", message: `O cadastro de ${ano} foi removido; o ano volta a seguir a lei (ou fica pendente).` });
      await recarregar();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function gravarModo() {
    setBusy(true); setFeedback(null);
    try {
      await salvarModo(formModo.modo, formModo.motivo.trim());
      setFeedback({ type: "success", message: formModo.modo === "AUTOMATICO"
        ? "As notas voltam a sair com o modelo atual e o grupo IBS/CBS."
        : "As notas passam a sair só com o modelo atual (sem o grupo IBS/CBS)." });
      await recarregar();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function gravarCfop() {
    setBusy(true); setFeedback(null);
    try {
      await salvarCFOP(formCfop.cfop.trim(), formCfop.cclass_trib.trim(), formCfop.observacao.trim());
      setFeedback({ type: "success", message: `CFOP ${formCfop.cfop} passa a usar o cClassTrib ${formCfop.cclass_trib}.` });
      setFormCfop({ cfop: "", cclass_trib: "", observacao: "" }); await recarregar();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function removerCfop(cfop: string) {
    setBusy(true); setFeedback(null);
    try {
      await excluirCFOP(cfop);
      setFeedback({ type: "success", message: `CFOP ${cfop} volta a usar a classificação fiscal do item.` });
      await recarregar();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Reforma Tributária (IBS/CBS)</span><span className="erp-crumb-code">VFIS0670</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Consulta</span>
          <button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>{busy ? "Carregando..." : "Atualizar"}</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0670 — Reforma Tributária (IBS/CBS)" filename="vfis0670" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs">
            <button className={`erp-tab ${aba === "aliquotas" ? "active" : ""}`} onClick={() => setAba("aliquotas")}>Alíquotas por ano</button>
            <button className={`erp-tab ${aba === "cfop" ? "active" : ""}`} onClick={() => setAba("cfop")}>cClassTrib por CFOP</button>
            <button className={`erp-tab ${aba === "tabela" ? "active" : ""}`} onClick={() => setAba("tabela")}>Tabela oficial</button>
          </div>
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
            {!isAdmin && <div className="erp-feedback info">{SO_ADMIN} Você pode consultar normalmente.</div>}

            {aba === "aliquotas" && (<>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Modelo de tributação na NF-e — <span style={{ fontWeight: 400, opacity: 0.65 }}>{modo?.modo === "SOMENTE_ATUAL" ? "só o modelo atual" : "automático"}</span></div><div className="erp-fieldset-body">
                <div className="erp-field erp-c12"><small>
                  Automático: a nota sai com o modelo atual (ICMS, IPI, PIS/COFINS) e, no regime normal, também com o grupo IBS/CBS — os dois juntos, como a legislação exige desde 2026.
                  Só o modelo atual: a nota sai sem o grupo IBS/CBS; use apenas se a SEFAZ ou a Focus recusarem o grupo novo, enquanto o motivo é resolvido.
                </small></div>
                {modo?.modo === "SOMENTE_ATUAL" && <div className="erp-field erp-c12"><div className="erp-feedback error">As notas estão saindo sem o grupo IBS/CBS. Motivo: {modo.motivo}</div></div>}
                <div className="erp-field erp-c4"><label className="erp-label">Modo</label>
                  <select className="erp-input" value={formModo.modo} onChange={(e) => setFormModo((p) => ({ ...p, modo: e.target.value as ModoReforma }))} disabled={!isAdmin}>
                    <option value="AUTOMATICO">Automático (modelo atual + IBS/CBS)</option>
                    <option value="SOMENTE_ATUAL">Só o modelo atual</option>
                  </select></div>
                <div className="erp-field erp-c6"><label className={`erp-label${formModo.modo === "SOMENTE_ATUAL" ? " erp-req" : ""}`}>Motivo</label>
                  <input className="erp-input" value={formModo.motivo} onChange={(e) => setFormModo((p) => ({ ...p, motivo: e.target.value }))} placeholder="Ex.: rejeição da SEFAZ no grupo IBS/CBS" disabled={!isAdmin} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">&nbsp;</label>
                  <button className="erp-btn erp-btn-primary" onClick={() => void gravarModo()} disabled={busy || !isAdmin} title={isAdmin ? undefined : SO_ADMIN}>Gravar modo</button></div>
              </div></div>
              {pendentes.length > 0 && (
                <div className="erp-feedback error">
                  {pendentes.map((p) => `${p.ano}: ${p.pendencia}`).join(" · ")}
                </div>
              )}
              <div className="erp-fieldset"><div className="erp-fieldset-head">Como funciona</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <small>
                  Sem cadastro, vale a lei: 2026 com CBS 0,9% e IBS estadual 0,1%; 2027 e 2028 com IBS estadual 0,05% e municipal 0,05%.
                  A CBS de 2027 em diante é a alíquota de referência fixada pela União menos 0,1 ponto (LC 214/2025, art. 347): cadastre-a com o
                  fundamento antes da primeira nota do ano — sem ela a NF-e é recusada antes de ir à SEFAZ.
                </small>
              </div></div></div>

              <div className="erp-fieldset"><div className="erp-fieldset-head">Cadastrar ou alterar um ano</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Ano</label>
                  <input className="erp-input num" type="number" min={2026} step={1} value={formAliq.ano} onChange={(e) => setFormAliq((p) => ({ ...p, ano: Number(e.target.value) }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label erp-req">IBS estadual (%)</label>
                  <input className="erp-input num" inputMode="decimal" value={formAliq.ibs_uf} onChange={(e) => setFormAliq((p) => ({ ...p, ibs_uf: e.target.value }))} placeholder="0,05" /></div>
                <div className="erp-field erp-c2"><label className="erp-label erp-req">IBS municipal (%)</label>
                  <input className="erp-input num" inputMode="decimal" value={formAliq.ibs_mun} onChange={(e) => setFormAliq((p) => ({ ...p, ibs_mun: e.target.value }))} placeholder="0,05" /></div>
                <div className="erp-field erp-c2"><label className="erp-label erp-req">CBS (%)</label>
                  <input className="erp-input num" inputMode="decimal" value={formAliq.cbs} onChange={(e) => setFormAliq((p) => ({ ...p, cbs: e.target.value }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label erp-req">Fundamento</label>
                  <input className="erp-input" value={formAliq.fundamento} onChange={(e) => setFormAliq((p) => ({ ...p, fundamento: e.target.value }))} placeholder="Resolução / ato que fixou a alíquota" /></div>
                <div className="erp-field erp-c12">
                  <button className="erp-btn erp-btn-primary" onClick={() => void gravarAno()} disabled={busy || !isAdmin} title={isAdmin ? undefined : SO_ADMIN}>Gravar alíquotas</button>
                </div>
              </div></div>

              <div className="erp-fieldset"><div className="erp-fieldset-head">Transição — <span style={{ fontWeight: 400, opacity: 0.65 }}>{aliquotas.length} anos</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead><tr><th>Ano</th><th>IBS estadual</th><th>IBS municipal</th><th>CBS</th><th>Origem</th><th>Fundamento</th><th style={{ width: 170 }}>Ações</th></tr></thead>
                  <tbody>
                    {aliquotas.map((a) => (
                      <tr key={a.ano}>
                        <td style={{ fontWeight: 600 }}>{a.ano}</td>
                        <td>{pct(a.ibs_uf)}</td><td>{pct(a.ibs_mun)}</td><td>{pct(a.cbs)}</td>
                        <td><span className={`erp-badge ${BADGE_FONTE[a.fonte] ?? "erp-badge-gray"}`}>{ROTULO_FONTE[a.fonte] ?? a.fonte}</span></td>
                        <td><small>{a.pendencia ?? a.fundamento}</small></td>
                        <td>
                          <button className="erp-btn erp-btn-sm" onClick={() => editarAno(a)} disabled={!isAdmin}>Editar</button>{" "}
                          {a.fonte === "EMPRESA" && <button className="erp-btn erp-btn-sm" onClick={() => void voltarParaLei(a.ano)} disabled={busy || !isAdmin}>Remover</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div></div></div>
            </>)}

            {aba === "cfop" && (<>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Padrão da operação</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <small>
                  Ordem usada em cada linha da NF-e: o cClassTrib informado na linha › o do CFOP (aqui) › o da classificação fiscal do item ›
                  tributação integral (000001). Use o CFOP para operações que não são venda comum: bonificação, transferência, exportação, remessa.
                </small>
              </div></div></div>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Vincular CFOP</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c2"><label className="erp-label erp-req">CFOP de saída</label>
                  <input className="erp-input num" maxLength={5} value={formCfop.cfop} onChange={(e) => setFormCfop((p) => ({ ...p, cfop: e.target.value }))} placeholder="5910" /></div>
                <div className="erp-field erp-c3"><label className="erp-label erp-req">cClassTrib</label>
                  <input className="erp-input num" list="vfis0670-classtrib" maxLength={6} value={formCfop.cclass_trib} onChange={(e) => setFormCfop((p) => ({ ...p, cclass_trib: e.target.value }))} placeholder="410001" />
                  <datalist id="vfis0670-classtrib">{tabela.filter((c) => c.aceita_nfe && c.suportado_emissao).map((c) => <option key={c.cclass_trib} value={c.cclass_trib}>{c.descricao.slice(0, 90)}</option>)}</datalist>
                </div>
                <div className="erp-field erp-c7"><label className="erp-label">Observação</label>
                  <input className="erp-input" value={formCfop.observacao} onChange={(e) => setFormCfop((p) => ({ ...p, observacao: e.target.value }))} /></div>
                {formCfop.cclass_trib.length === 6 && (
                  <div className="erp-field erp-c12"><small>{descricaoDe(formCfop.cclass_trib) ?? "Código fora da tabela oficial."}</small></div>
                )}
                <div className="erp-field erp-c12">
                  <button className="erp-btn erp-btn-primary" onClick={() => void gravarCfop()} disabled={busy || !isAdmin} title={isAdmin ? undefined : SO_ADMIN}>Gravar vínculo</button>
                </div>
              </div></div>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Vínculos — <span style={{ fontWeight: 400, opacity: 0.65 }}>{cfops.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead><tr><th>CFOP</th><th>cClassTrib</th><th>Descrição</th><th>Observação</th><th style={{ width: 160 }}>Ações</th></tr></thead>
                  <tbody>
                    {cfops.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum CFOP vinculado: todas as linhas seguem a classificação fiscal do item.</td></tr>}
                    {cfops.map((c) => (
                      <tr key={c.cfop}>
                        <td style={{ fontWeight: 600 }}>{c.cfop}</td><td>{c.cclass_trib}</td><td><small>{c.descricao}</small></td><td><small>{c.observacao}</small></td>
                        <td>
                          <button className="erp-btn erp-btn-sm" onClick={() => setFormCfop({ cfop: c.cfop, cclass_trib: c.cclass_trib, observacao: c.observacao ?? "" })} disabled={!isAdmin}>Editar</button>{" "}
                          <button className="erp-btn erp-btn-sm" onClick={() => void removerCfop(c.cfop)} disabled={busy || !isAdmin}>Remover</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div></div></div>
            </>)}

            {aba === "tabela" && (<>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Filtro — <span style={{ fontWeight: 400, opacity: 0.65 }}>{tabela[0]?.versao_tabela ?? ""}</span></div><div className="erp-fieldset-body">
                <div className="erp-field erp-c5"><label className="erp-label">CST</label>
                  <select className="erp-input" value={filtroCst} onChange={(e) => setFiltroCst(e.target.value)}>
                    <option value="">Todos</option>
                    {csts.map(([cst, nome]) => <option key={cst} value={cst}>{cst} — {nome}</option>)}
                  </select></div>
                <div className="erp-field erp-c7"><label className="erp-label">Código ou texto</label>
                  <input className="erp-input" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="ex.: exportação, 200030" /></div>
              </div></div>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Classificações admitidas na NF-e — <span style={{ fontWeight: 400, opacity: 0.65 }}>{tabelaFiltrada.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead><tr><th>cClassTrib</th><th>CST</th><th>Descrição</th><th>Tributa</th><th>Redução IBS/CBS</th><th>Vigência</th><th>Emissão</th></tr></thead>
                  <tbody>
                    {tabelaFiltrada.map((c) => (
                      <tr key={c.cclass_trib}>
                        <td style={{ fontWeight: 600 }}>{c.cclass_trib}</td>
                        <td>{c.cst}</td>
                        <td><small>{c.descricao}</small>{c.url_legislacao && <> · <a href={c.url_legislacao} target="_blank" rel="noreferrer">lei</a></>}</td>
                        <td>{c.exige_tributacao ? <span className="erp-badge erp-badge-green">Sim</span> : <span className="erp-badge erp-badge-gray">Não</span>}</td>
                        <td>{c.reducao_aliquota ? `${pct(c.perc_reducao_ibs)} / ${pct(c.perc_reducao_cbs)}` : "—"}</td>
                        <td><small>{c.vigencia_inicio}{c.vigencia_fim ? ` a ${c.vigencia_fim}` : ""}</small>{!c.vigente_hoje && <> <span className="erp-badge erp-badge-red">fora</span></>}</td>
                        <td>{c.suportado_emissao ? <span className="erp-badge erp-badge-green">Suportado</span> : <span className="erp-badge erp-badge-gray" title="Exige grupos (diferimento, monofásico, crédito, ajuste ou alíquota fixa) que a emissão ainda não preenche">Ainda não</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div></div></div>
            </>)}
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div style={{ display: "contents" }}>
          <div className="erp-status-item">CFOPs vinculados: <strong>{cfops.length}</strong></div>
          <div className="erp-status-item">Anos pendentes: <strong>{pendentes.length}</strong></div>
        </div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

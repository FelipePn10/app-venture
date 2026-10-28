import { useState, useCallback, useEffect, useMemo } from "react";
import {
  type Cfop, type CfopDTOComSituacao, type CfopUtilization, type CfopIndOperacao, type CfopTipoUtil,
  listCfops, createCfop, updateCfop,
} from "@/services/fiscalSupportService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { enumLabel } from "@/utils/enumLabels";
import { useAuthStore } from "@/store/authStore";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const UTIL: CfopUtilization[] = ["INDUSTRIALIZACAO_COMERCIO", "IMOBILIZADO", "USO_CONSUMO"];
const IND: CfopIndOperacao[] = ["NORMAL", "ENERGIA_ELETRICA", "TELECOMUNICACAO"];
const TIPO: CfopTipoUtil[] = ["NORMAL", "VENDA_COMERCIAL_EXPORTADORA", "COMPRA_FIM_ESPECIFICO_EXPORTACAO", "EXPORTACAO"];
const EMPTY: CfopDTOComSituacao = {
  code: 0, description: "", utilization: "INDUSTRIALIZACAO_COMERCIO",
  ind_operacao: "NORMAL", tipo_utilizacao: "NORMAL", difal: false, doacao: false, is_active: true,
};
type Sentido = "" | "ENTRADA" | "SAIDA";
const POR_PAGINA = 50;
const dataBR = (s?: string) => (s ? new Date(`${s.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "");
const vigente = (c: Cfop) => !c.fim_vigencia || c.fim_vigencia.slice(0, 10) >= new Date().toISOString().slice(0, 10);
/** Indicadores da tabela oficial que mudam o que a nota exige. */
const INDICADORES: Array<{ campo: keyof Cfop; rotulo: string; ajuda: string }> = [
  { campo: "ind_devol", rotulo: "Devolução", ajuda: "A nota precisa referenciar o documento devolvido." },
  { campo: "ind_retor", rotulo: "Retorno", ajuda: "Retorno de mercadoria remetida (industrialização, conserto, demonstração…)." },
  { campo: "ind_remes", rotulo: "Remessa", ajuda: "Remessa de mercadoria." },
  { campo: "ind_anula", rotulo: "Anulação", ajuda: "Anulação de valor relativo a operação anterior." },
  { campo: "ind_comunica", rotulo: "Comunicação", ajuda: "Prestação de serviço de comunicação." },
  { campo: "ind_transp", rotulo: "Transporte", ajuda: "Prestação de serviço de transporte." },
  { campo: "ind_comb", rotulo: "Combustível", ajuda: "Operação com combustível." },
];

export function Vfis0300Page(): JSX.Element {
  const [form, setForm] = useState<CfopDTOComSituacao>(EMPTY);
  const [aberto, setAberto] = useState<Cfop | null>(null);
  const [busca, setBusca] = useState("");
  const [sentido, setSentido] = useState<Sentido>("");
  const [inativos, setInativos] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [editing, setEditing] = useState(false);
  const [list, setList] = useState<Cfop[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  // O CFOP é um cadastro só para todas as empresas do banco: quem altera muda
  // para todas. Por isso só o perfil ADMIN inclui ou altera; os demais consultam.
  const isAdmin = useAuthStore((state) => state.user?.role?.toUpperCase() === "ADMIN");
  const SO_ADMIN = "O CFOP vale para todas as empresas: só o perfil ADMIN altera.";

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listCfops(inativos)); return true; }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar CFOPs.") }); return false; }
    finally { setBusy(false); }
  }, [inativos]);
  useEffect(() => { void reload(); }, [reload]);

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase().replace(/\./g, "");
    return list.filter((c) => {
      const d = String(c.code)[0];
      if (sentido === "ENTRADA" && !["1", "2", "3"].includes(d)) return false;
      if (sentido === "SAIDA" && !["5", "6", "7"].includes(d)) return false;
      return !t || String(c.code).startsWith(t) || c.description.toLowerCase().includes(t);
    });
  }, [list, busca, sentido]);
  useEffect(() => { setPagina(0); }, [busca, sentido, inativos]);
  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const daPagina = filtrados.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);

  const setF = <K extends keyof CfopDTOComSituacao>(k: K, v: CfopDTOComSituacao[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  function novo() { setForm(EMPTY); setEditing(false); setAberto(null); setFeedback(null); }
  function edit(c: Cfop) {
    setForm({ id: c.id, code: c.code, description: c.description, utilization: c.utilization, ind_operacao: c.ind_operacao,
      tipo_utilizacao: c.tipo_utilizacao, difal: c.difal, doacao: c.doacao, is_active: c.is_active !== false });
    setAberto(c); setEditing(true); setFeedback(null);
  }

  async function salvar() {
    if (!form.code || !form.description.trim()) { setFeedback({ type: "error", message: "Código e Descrição são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const msg = editing ? `CFOP ${form.code} atualizado.` : `CFOP ${form.code} cadastrado.`;
      if (editing) await updateCfop(form); else await createCfop(form);
      // novo() limpa o aviso: a confirmação vem depois dele, senão sumia na hora.
      novo();
      // Se a lista não recarregar, o erro dela fica na tela (com o registro já gravado).
      if (await reload()) setFeedback({ type: "success", message: msg });
      else setFeedback({ type: "error", message: `${msg} Mas a lista não pôde ser atualizada — recarregue a tela.` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">CFOPs / Naturezas de Operação</span><span className="erp-crumb-code">VFIS0300</span></nav>
        <div className="erp-titlebar-spacer" /><span className="erp-titlebar-meta">{list.length} CFOP(s)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Cadastro</span><button className="erp-btn erp-btn-primary" onClick={novo} disabled={busy || !isAdmin} title={isAdmin ? undefined : SO_ADMIN}>+ Novo CFOP</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Ações</span><button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy || !isAdmin} title={isAdmin ? undefined : SO_ADMIN}>{busy ? "Salvando..." : editing ? "Atualizar" : "Salvar"}</button></div>
        <div className="erp-tspacer" /><div className="erp-tgroup"><ExportButton title="VFIS0300 — CFOPs / Naturezas de Operação" filename="vfis0300" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        {!isAdmin && <div className="erp-feedback info">{SO_ADMIN} Você pode consultar e usar os CFOPs normalmente.</div>}
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">CFOPs</button></div>
          <div className="erp-detail-body">
            <div className="erp-fieldset"><div className="erp-fieldset-head">{editing ? `Editando CFOP ${form.code}` : "Novo CFOP"}</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label><input className="erp-input num" type="number" value={form.code || ""} disabled={editing} onChange={(e) => setF("code", Number(e.target.value))} /></div>
              <div className="erp-field erp-c10"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={form.description} onChange={(e) => setF("description", e.target.value)} /></div>
              <div className="erp-field erp-c4"><label className="erp-label">Utilização</label><select className="erp-input" value={form.utilization} onChange={(e) => setF("utilization", e.target.value as CfopUtilization)}>{UTIL.map((u) => <option key={u} value={u}>{enumLabel(u)}</option>)}</select></div>
              <div className="erp-field erp-c4"><label className="erp-label">Ind. Operação</label><select className="erp-input" value={form.ind_operacao} onChange={(e) => setF("ind_operacao", e.target.value as CfopIndOperacao)}>{IND.map((u) => <option key={u} value={u}>{enumLabel(u)}</option>)}</select></div>
              <div className="erp-field erp-c4"><label className="erp-label">Tipo Utilização</label><select className="erp-input" value={form.tipo_utilizacao} onChange={(e) => setF("tipo_utilizacao", e.target.value as CfopTipoUtil)}>{TIPO.map((u) => <option key={u} value={u}>{enumLabel(u)}</option>)}</select></div>
              <div className="erp-field erp-c3"><label className="erp-label">DIFAL</label><div className="erp-toggle-row"><label className="erp-toggle"><input type="checkbox" checked={form.difal} onChange={(e) => setF("difal", e.target.checked)} /><div className="erp-toggle-track" /><div className="erp-toggle-thumb" /></label><span className="erp-toggle-label">{form.difal ? "Sim" : "Não"}</span></div></div>
              <div className="erp-field erp-c3"><label className="erp-label">Doação</label><div className="erp-toggle-row"><label className="erp-toggle"><input type="checkbox" checked={form.doacao} onChange={(e) => setF("doacao", e.target.checked)} /><div className="erp-toggle-track" /><div className="erp-toggle-thumb" /></label><span className="erp-toggle-label">{form.doacao ? "Sim" : "Não"}</span></div></div>
              {editing && <div className="erp-field erp-c3"><label className="erp-label">Situação</label><div className="erp-toggle-row"><label className="erp-toggle"><input type="checkbox" checked={form.is_active !== false} onChange={(e) => setF("is_active", e.target.checked)} /><div className="erp-toggle-track" /><div className="erp-toggle-thumb" /></label><span className="erp-toggle-label">{form.is_active !== false ? "Ativo" : "Inativo (a nota não aceita)"}</span></div></div>}
              {aberto?.oficial && (
                <div className="erp-field erp-c12">
                  <p style={{ margin: 0 }}>
                    <span className="erp-badge erp-badge-green">Tabela oficial</span>{" "}
                    Vigência: {dataBR(aberto.inicio_vigencia) || "—"} {aberto.fim_vigencia ? `a ${dataBR(aberto.fim_vigencia)}` : "em diante"}
                    {aberto.ind_nfe === false && <> · <span className="erp-badge erp-badge-red">não permitido em NF-e</span></>}
                    {INDICADORES.filter((x) => aberto[x.campo]).map((x) => <span key={x.campo} className="erp-badge erp-badge-blue" title={x.ajuda} style={{ marginLeft: 4 }}>{x.rotulo}</span>)}
                  </p>
                  {aberto.description_full && <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}><small>{aberto.description_full}</small></p>}
                </div>
              )}
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">CFOPs — <span style={{ fontWeight: 400, opacity: 0.65 }}>{filtrados.length} de {list.length}</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c5"><label className="erp-label">Buscar</label><input className="erp-input" value={busca} placeholder="código (5101, 51…) ou parte da descrição" onChange={(e) => setBusca(e.target.value)} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Sentido</label>
                <select className="erp-input" value={sentido} onChange={(e) => setSentido(e.target.value as Sentido)}>
                  <option value="">Entradas e saídas</option><option value="ENTRADA">Entradas (1, 2, 3)</option><option value="SAIDA">Saídas (5, 6, 7)</option>
                </select></div>
              <div className="erp-field erp-c4" style={{ display: "flex", alignItems: "flex-end" }}><label className="erp-check"><input type="checkbox" checked={inativos} onChange={(e) => setInativos(e.target.checked)} /> Mostrar inativos</label></div>
              <div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead><tr><th style={{ width: 80 }}>Código</th><th>Descrição</th><th>Utilização</th><th>Vigência</th><th>Indicadores</th><th>DIFAL</th><th style={{ width: 80 }}>Ações</th></tr></thead>
                  <tbody>
                    {daPagina.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">{list.length === 0 ? "Nenhum CFOP cadastrado." : "Nenhum CFOP para o filtro."}</td></tr>}
                    {daPagina.map((c) => (
                      <tr key={c.code} style={c.is_active === false ? { opacity: 0.55 } : undefined}>
                        <td style={{ fontWeight: 600 }}>{c.code}</td>
                        <td>{c.description}{!c.oficial && <span className="erp-badge erp-badge-amber" title="Código fora da tabela oficial do Portal da NF-e" style={{ marginLeft: 4 }}>fora da tabela</span>}</td>
                        <td>{enumLabel(c.utilization)}</td>
                        <td>{c.oficial ? (vigente(c) ? (c.fim_vigencia ? `até ${dataBR(c.fim_vigencia)}` : `desde ${dataBR(c.inicio_vigencia)}`) : <span className="erp-badge erp-badge-red">encerrado em {dataBR(c.fim_vigencia)}</span>) : "—"}</td>
                        <td>{c.ind_nfe === false && <span className="erp-badge erp-badge-red">sem NF-e</span>}{INDICADORES.filter((x) => c[x.campo]).map((x) => <span key={x.campo} className="erp-badge erp-badge-blue" title={x.ajuda} style={{ marginLeft: 4 }}>{x.rotulo}</span>)}</td>
                        <td>{c.difal ? <span className="erp-badge info">Sim</span> : <span className="erp-badge">Não</span>}</td>
                        <td><button className="erp-btn erp-btn-sm" onClick={() => edit(c)}>Editar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {paginas > 1 && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                    <button className="erp-btn erp-btn-sm" disabled={pagina === 0} onClick={() => setPagina((x) => x - 1)}>‹ Anterior</button>
                    <small>Página {pagina + 1} de {paginas}</small>
                    <button className="erp-btn erp-btn-sm" disabled={pagina + 1 >= paginas} onClick={() => setPagina((x) => x + 1)}>Próxima ›</button>
                  </div>
                )}
              </div>
            </div></div>
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">CFOPs: <strong>{list.length}</strong></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

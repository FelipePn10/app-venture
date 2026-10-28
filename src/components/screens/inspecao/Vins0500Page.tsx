import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type AcaoPendente, type Capa, type Membro, type MetodoCapa, type NCResumo, type OrigemCapa, type Problema, type Usuario,
  CATEGORIAS_ISHIKAWA, ETAPAS_8D, ETAPAS_SIMPLES,
  abrirCapa, acoesPendentes, adicionarAcao, analisarCapa, atualizarAcao, avancarCapa, cancelarCapa, encerrarCapa,
  listarCapas, listarNCs, obterCapa, usuariosDaEmpresa,
} from "@/services/capaService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { useAcessoStore } from "@/store/acessoStore";
import { useAuthStore } from "@/store/authStore";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Aba = "ncs" | "capas" | "acoes";

const ROTULO_ORIGEM: Record<OrigemCapa, string> = {
  NC: "Não conformidade", RECLAMACAO_CLIENTE: "Reclamação de cliente", FORNECEDOR: "Fornecedor", AUDITORIA: "Auditoria", INTERNA: "Interna",
};
const ROTULO_SEV: Record<string, string> = { CRITICA: "erp-badge-red", MAIOR: "erp-badge-amber", MENOR: "erp-badge-blue", OBSERVACAO: "erp-badge-gray" };
const ROTULO_ACAO: Record<string, string> = { CONTENCAO: "Contenção", CORRETIVA: "Corretiva", PREVENTIVA: "Preventiva" };
const ROTULO_STATUS_ACAO: Record<string, [string, string]> = {
  PENDENTE: ["Pendente", "erp-badge-amber"], EM_ANDAMENTO: ["Em andamento", "erp-badge-blue"],
  CONCLUIDA: ["Concluída", "erp-badge-green"], CANCELADA: ["Cancelada", "erp-badge-gray"],
};
const PROBLEMA_CAMPOS: [keyof Problema, string][] = [
  ["o_que", "O quê (defeito)"], ["onde", "Onde"], ["quando", "Quando"], ["quem", "Quem detectou"],
  ["quanto", "Quanto (qtd / frequência)"], ["como", "Como aparece"], ["por_que_detectou", "Como foi detectado"],
];
const dataBR = (s?: string) => (s ? new Date(s.length === 10 ? `${s}T12:00:00` : s).toLocaleDateString("pt-BR") : "—");
const dataHora = (s?: string) => (s ? new Date(s).toLocaleString("pt-BR") : "—");
const hojeISO = () => new Date().toISOString().slice(0, 10);
const problemaVazio = (): Problema => ({ o_que: "", onde: "", quando: "", quem: "", quanto: "", como: "", por_que_detectou: "" });

type Analise = {
  problema: Problema; contencao: string; metodo: string; porques: string[]; ishikawa: Record<string, string>;
  causa: string; escape: string; prevencao: string; equipe: Membro[];
};
const analiseDe = (c: Capa): Analise => ({
  problema: { ...problemaVazio(), ...c.problema }, contencao: c.contencao_dispensada ?? "", metodo: c.metodo_causa ?? "",
  porques: [...c.cinco_porques, "", "", "", "", ""].slice(0, Math.max(5, c.cinco_porques.length)),
  ishikawa: Object.fromEntries(CATEGORIAS_ISHIKAWA.map(([k]) => [k, (c.ishikawa[k] ?? []).join("\n")])),
  causa: c.causa_raiz ?? "", escape: c.ponto_de_escape ?? "", prevencao: c.prevencao ?? "", equipe: c.equipe.map((m) => ({ ...m })),
});

export function Vins0500Page(): JSX.Element {
  const isAdmin = useAuthStore((s) => s.user?.role?.toUpperCase() === "ADMIN");
  const acesso = useAcessoStore((s) => s.acesso);
  const pode = (acao: string) => !acesso?.restrito || isAdmin || acesso.permissoes.some((p) => p.modulo === "qualidade" && p.acao === acao);

  const [aba, setAba] = useState<Aba>("ncs");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [ncs, setNcs] = useState<NCResumo[]>([]);
  const [filtroNC, setFiltroNC] = useState({ abertas: true, semCapa: false });
  const [marcadas, setMarcadas] = useState<number[]>([]);
  const [capas, setCapas] = useState<Capa[]>([]);
  const [filtroCapa, setFiltroCapa] = useState({ status: "ABERTA", minhas: false, atrasadas: false });
  const [pendentes, setPendentes] = useState<AcaoPendente[]>([]);
  const [aberta, setAberta] = useState<Capa | null>(null);
  const [an, setAn] = useState<Analise | null>(null);
  const [nova, setNova] = useState<{ mostrar: boolean; metodo: MetodoCapa; origem: OrigemCapa; titulo: string; prazo: string; fornecedor: string; cliente: string }>({
    mostrar: false, metodo: "8D", origem: "NC", titulo: "", prazo: "", fornecedor: "", cliente: "",
  });
  const [acao, setAcao] = useState({ tipo: "CORRETIVA", descricao: "", responsavel: "", prazo: hojeISO() });
  const [evidencias, setEvidencias] = useState<Record<number, string>>({});
  const [enc, setEnc] = useState({ verificacao: "", licoes: "" });
  const [motivoCancel, setMotivoCancel] = useState("");

  const nome = useMemo(() => Object.fromEntries(usuarios.map((u) => [u.user_id, u.nome])), [usuarios]);

  const recarregar = useCallback(async () => {
    setBusy(true);
    try {
      if (aba === "ncs") setNcs(await listarNCs({ abertas: filtroNC.abertas, semCapa: filtroNC.semCapa }));
      if (aba === "capas") setCapas(await listarCapas(filtroCapa));
      if (aba === "acoes") setPendentes(await acoesPendentes(false));
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar.") });
    } finally { setBusy(false); }
  }, [aba, filtroNC, filtroCapa]);
  useEffect(() => { void recarregar(); }, [aba]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { usuariosDaEmpresa().then(setUsuarios).catch(() => setUsuarios([])); }, []);

  function mostrar(c: Capa) { setAberta(c); setAn(analiseDe(c)); setEvidencias({}); setEnc({ verificacao: "", licoes: "" }); }

  async function abrir(id: number) {
    setBusy(true); setFeedback(null);
    try { mostrar(await obterCapa(id)); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function executar(fn: () => Promise<Capa>, msg: (c: Capa) => string) {
    setBusy(true); setFeedback(null);
    try {
      const c = await fn();
      mostrar(c);
      // A lista ao lado (NCs com a CAPA, CAPAs, ações) muda junto.
      await recarregar();
      setFeedback({ type: "success", message: msg(c) });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function criar() {
    await executar(() => abrirCapa({
      metodo: nova.metodo, origem: nova.origem, titulo: nova.titulo, prazo: nova.prazo || undefined,
      ncs: nova.origem === "NC" ? marcadas : undefined,
      supplier_code: Number(nova.fornecedor) || undefined, customer_code: Number(nova.cliente) || undefined,
    }), (c) => `CAPA ${c.numero} aberta (${c.metodo}).`);
    setNova((n) => ({ ...n, mostrar: false, titulo: "" }));
    setMarcadas([]);
  }

  async function gravarAnalise() {
    if (!aberta || !an) return;
    await executar(() => analisarCapa(aberta.id, {
      problema: an.problema, contencao_dispensada: an.contencao, metodo_causa: an.metodo || undefined,
      cinco_porques: an.porques.filter((p) => p.trim()),
      ishikawa: Object.fromEntries(Object.entries(an.ishikawa).map(([k, v]) => [k, v.split("\n").map((x) => x.trim()).filter(Boolean)]).filter(([, v]) => (v as string[]).length)),
      causa_raiz: an.causa, ponto_de_escape: an.escape, prevencao: an.prevencao,
      equipe: aberta.metodo === "8D" ? an.equipe.filter((m) => m.user_id) : undefined,
    }), () => "Análise gravada.");
  }

  const etapas = aberta?.metodo === "SIMPLES" ? ETAPAS_SIMPLES : ETAPAS_8D;
  const idx = aberta ? etapas.indexOf(aberta.etapa) : -1;
  const chegou = (e: string) => aberta?.status !== "ABERTA" || etapas.indexOf(e) <= idx;
  const editavel = aberta?.status === "ABERTA";
  const final = aberta && aberta.etapa === etapas[etapas.length - 1];
  const setProb = (k: keyof Problema, v: string) => setAn((a) => (a ? { ...a, problema: { ...a.problema, [k]: v } } : a));
  const userSelect = (valor: string, onChange: (v: string) => void, disabled = false) => (
    <select className="erp-input" value={valor} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      {usuarios.map((u) => <option key={u.user_id} value={u.user_id}>{u.nome}</option>)}
    </select>
  );

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Inspeção</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Não conformidades e CAPA/8D</span><span className="erp-crumb-code">VINS0500</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Consulta</span>
          <button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Atualizar</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">CAPA</span>
          <button className="erp-btn erp-btn-new" onClick={() => setNova((n) => ({ ...n, mostrar: !n.mostrar, origem: marcadas.length ? "NC" : n.origem }))}>Nova CAPA</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VINS0500 — Não conformidades e CAPA" filename="vins0500" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs">
            <button className={`erp-tab ${aba === "ncs" ? "active" : ""}`} onClick={() => setAba("ncs")}>Não conformidades</button>
            <button className={`erp-tab ${aba === "capas" ? "active" : ""}`} onClick={() => setAba("capas")}>CAPAs</button>
            <button className={`erp-tab ${aba === "acoes" ? "active" : ""}`} onClick={() => setAba("acoes")}>Minhas ações</button>
          </div>
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            {nova.mostrar && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Nova CAPA</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c2"><label className="erp-label">Método</label>
                  <select className="erp-input" value={nova.metodo} onChange={(e) => setNova((n) => ({ ...n, metodo: e.target.value as MetodoCapa }))}>
                    <option value="8D">8D (D0 a D8)</option><option value="SIMPLES">Simples (análise → ação → verificação)</option>
                  </select></div>
                <div className="erp-field erp-c3"><label className="erp-label">Origem</label>
                  <select className="erp-input" value={nova.origem} onChange={(e) => setNova((n) => ({ ...n, origem: e.target.value as OrigemCapa }))}>
                    {Object.entries(ROTULO_ORIGEM).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
                <div className="erp-field erp-c5"><label className="erp-label erp-req">Título</label>
                  <input className="erp-input" value={nova.titulo} onChange={(e) => setNova((n) => ({ ...n, titulo: e.target.value }))} placeholder="Ex.: Rebarba na furação do suporte" /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Prazo</label>
                  <input className="erp-input" type="date" value={nova.prazo} onChange={(e) => setNova((n) => ({ ...n, prazo: e.target.value }))} /></div>
                {nova.origem === "FORNECEDOR" && <div className="erp-field erp-c2"><label className="erp-label erp-req">Fornecedor</label>
                  <input className="erp-input" inputMode="numeric" value={nova.fornecedor} onChange={(e) => setNova((n) => ({ ...n, fornecedor: e.target.value }))} /></div>}
                {nova.origem === "RECLAMACAO_CLIENTE" && <div className="erp-field erp-c2"><label className="erp-label erp-req">Cliente</label>
                  <input className="erp-input" inputMode="numeric" value={nova.cliente} onChange={(e) => setNova((n) => ({ ...n, cliente: e.target.value }))} /></div>}
                {nova.origem === "NC" && <div className="erp-field erp-c12"><small>NCs marcadas na aba "Não conformidades": {marcadas.length ? marcadas.join(", ") : "nenhuma — marque ao menos uma"}.</small></div>}
                <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" onClick={() => void criar()} disabled={busy || !nova.titulo.trim()}>Abrir CAPA</button></div>
              </div></div>
            )}

            {aba === "ncs" && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Não conformidades — <span style={{ fontWeight: 400, opacity: 0.65 }}>{ncs.length}</span></div><div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-check"><input type="checkbox" checked={filtroNC.abertas} onChange={(e) => setFiltroNC((f) => ({ ...f, abertas: e.target.checked }))} /> Só abertas</label></div>
                <div className="erp-field erp-c3"><label className="erp-check"><input type="checkbox" checked={filtroNC.semCapa} onChange={(e) => setFiltroNC((f) => ({ ...f, semCapa: e.target.checked }))} /> Só sem CAPA</label></div>
                <div className="erp-field erp-c2"><button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Consultar</button></div>
                <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                  <table className="erp-grid">
                    <thead><tr><th style={{ width: 30 }} /><th>Nº</th><th>Item</th><th>Lote de inspeção</th><th className="num">Qtd</th><th>Descrição</th><th>Severidade</th><th>Disposição</th><th>CAPA</th><th>Data</th></tr></thead>
                    <tbody>
                      {ncs.length === 0 && <tr><td colSpan={10} className="erp-grid-empty">Nenhuma não conformidade.</td></tr>}
                      {ncs.map((n) => (
                        <tr key={n.id}>
                          <td><input type="checkbox" checked={marcadas.includes(n.id)} onChange={(e) => setMarcadas((m) => (e.target.checked ? [...m, n.id] : m.filter((x) => x !== n.id)))} /></td>
                          <td style={{ fontWeight: 600 }}>{n.code}</td>
                          <td>{n.item_code}</td>
                          <td>{n.lote_numero ? `Lote ${n.lote_numero}${n.supplier_code ? ` · forn. ${n.supplier_code}` : ""}` : n.production_order_id ? `OP ${n.production_order_id}` : "—"}</td>
                          <td className="num">{Number(n.nonconform_qty).toLocaleString("pt-BR")}</td>
                          <td>{n.description}</td>
                          <td><span className={`erp-badge ${ROTULO_SEV[n.severity] ?? "erp-badge-gray"}`}>{n.severity}</span></td>
                          <td>{n.disposition ?? (n.is_open ? "aberta" : "—")}</td>
                          <td>{n.capa_numeros.length ? n.capa_numeros.map((num, i) => <button key={num} className="erp-btn erp-btn-sm" onClick={() => void abrir(n.capas[i])}>CAPA {num}</button>) : "—"}</td>
                          <td><small>{dataBR(n.created_at)}</small></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div></div>
            )}

            {aba === "capas" && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">CAPAs — <span style={{ fontWeight: 400, opacity: 0.65 }}>{capas.length}</span></div><div className="erp-fieldset-body">
                <div className="erp-field erp-c2"><select className="erp-input" value={filtroCapa.status} onChange={(e) => setFiltroCapa((f) => ({ ...f, status: e.target.value }))}>
                  <option value="">Todas</option><option value="ABERTA">Abertas</option><option value="ENCERRADA">Encerradas</option><option value="CANCELADA">Canceladas</option>
                </select></div>
                <div className="erp-field erp-c2"><label className="erp-check"><input type="checkbox" checked={filtroCapa.minhas} onChange={(e) => setFiltroCapa((f) => ({ ...f, minhas: e.target.checked }))} /> Minhas</label></div>
                <div className="erp-field erp-c2"><label className="erp-check"><input type="checkbox" checked={filtroCapa.atrasadas} onChange={(e) => setFiltroCapa((f) => ({ ...f, atrasadas: e.target.checked }))} /> Atrasadas</label></div>
                <div className="erp-field erp-c2"><button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Consultar</button></div>
                <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                  <table className="erp-grid">
                    <thead><tr><th>Nº</th><th>Título</th><th>Método</th><th>Origem</th><th>Etapa</th><th>Responsável</th><th>Prazo</th><th>Situação</th><th style={{ width: 80 }}>Ações</th></tr></thead>
                    <tbody>
                      {capas.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">Nenhuma CAPA.</td></tr>}
                      {capas.map((c) => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600 }}>{c.numero}</td><td>{c.titulo}</td><td>{c.metodo}</td><td>{ROTULO_ORIGEM[c.origem]}</td>
                          <td>{c.etapa}{c.ciclo > 1 ? ` (ciclo ${c.ciclo})` : ""}</td><td>{nome[c.responsavel] ?? "—"}</td><td>{dataBR(c.prazo)}</td>
                          <td><span className={`erp-badge ${c.status === "ABERTA" ? "erp-badge-amber" : c.status === "ENCERRADA" ? "erp-badge-green" : "erp-badge-gray"}`}>{c.status.toLowerCase()}</span></td>
                          <td><button className="erp-btn erp-btn-sm" onClick={() => void abrir(c.id)}>Abrir</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div></div>
            )}

            {aba === "acoes" && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Minhas ações pendentes — <span style={{ fontWeight: 400, opacity: 0.65 }}>{pendentes.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead><tr><th>CAPA</th><th>Tipo</th><th>Ação</th><th>Prazo</th><th>Situação</th><th style={{ width: 80 }} /></tr></thead>
                  <tbody>
                    {pendentes.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhuma ação pendente.</td></tr>}
                    {pendentes.map((p) => (
                      <tr key={p.id}>
                        <td>{p.capa_numero} — {p.capa_titulo}</td><td>{ROTULO_ACAO[p.tipo]}</td><td>{p.descricao}</td>
                        <td>{dataBR(p.prazo)} {p.atrasada && <span className="erp-badge erp-badge-red">atrasada</span>}</td>
                        <td>{ROTULO_STATUS_ACAO[p.status][0]}</td>
                        <td><button className="erp-btn erp-btn-sm" onClick={() => void abrir(p.capa_id)}>Abrir</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div></div></div>
            )}

            {aberta && an && (
              <>
                <div className="erp-fieldset"><div className="erp-fieldset-head">CAPA {aberta.numero} — {aberta.titulo}</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                  <p style={{ margin: 0 }}>
                    {aberta.metodo} · {ROTULO_ORIGEM[aberta.origem]} · responsável <b>{nome[aberta.responsavel] ?? "—"}</b> · prazo {dataBR(aberta.prazo)}
                    {aberta.ncs.length ? <> · NCs {aberta.ncs.join(", ")}</> : null}{aberta.ciclo > 1 ? <> · <b>ciclo {aberta.ciclo}</b> (a ação anterior foi ineficaz)</> : null}
                  </p>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", margin: "8px 0" }}>
                    {etapas.map((e, i) => (
                      <span key={e} className={`erp-badge ${aberta.status === "ENCERRADA" || i < idx ? "erp-badge-green" : i === idx && aberta.status === "ABERTA" ? "erp-badge-amber" : "erp-badge-gray"}`}>{e}</span>
                    ))}
                    <span className={`erp-badge ${aberta.status === "ENCERRADA" ? "erp-badge-green" : aberta.status === "CANCELADA" ? "erp-badge-gray" : "erp-badge-blue"}`}>{aberta.status.toLowerCase()}</span>
                  </div>
                  {editavel && <p style={{ margin: 0 }}>Etapa atual: <b>{aberta.nome_etapa}</b>.{aberta.pendencias?.length ? <> Falta: {aberta.pendencias.join("; ")}.</> : null}</p>}
                </div></div></div>

                {aberta.metodo === "8D" && chegou("D1") && (
                  <div className="erp-fieldset"><div className="erp-fieldset-head">D1 — Equipe</div><div className="erp-fieldset-body">
                    {an.equipe.map((m, i) => (
                      <div key={i} className="erp-field erp-c4" style={{ display: "flex", gap: 4 }}>
                        {userSelect(m.user_id, (v) => setAn((a) => a && { ...a, equipe: a.equipe.map((x, j) => (j === i ? { ...x, user_id: v } : x)) }), !editavel)}
                        <select className="erp-input" disabled={!editavel} value={m.papel} onChange={(e) => setAn((a) => a && { ...a, equipe: a.equipe.map((x, j) => (j === i ? { ...x, papel: e.target.value as Membro["papel"] } : x)) })}>
                          <option value="LIDER">Líder</option><option value="MEMBRO">Membro</option><option value="PATROCINADOR">Patrocinador</option>
                        </select>
                      </div>
                    ))}
                    {editavel && <div className="erp-field erp-c2"><button className="erp-btn" onClick={() => setAn((a) => a && { ...a, equipe: [...a.equipe, { user_id: "", papel: a.equipe.length ? "MEMBRO" : "LIDER" }] })}>+ Pessoa</button></div>}
                  </div></div>
                )}

                {(aberta.metodo === "SIMPLES" || chegou("D2")) && (
                  <div className="erp-fieldset"><div className="erp-fieldset-head">{aberta.metodo === "8D" ? "D2 — Descrição do problema (5W2H)" : "Problema"}</div><div className="erp-fieldset-body">
                    {PROBLEMA_CAMPOS.map(([k, r]) => (
                      <div key={k} className={`erp-field ${k === "o_que" ? "erp-c12" : "erp-c4"}`}><label className="erp-label">{r}</label>
                        <input className="erp-input" disabled={!editavel} value={an.problema[k]} onChange={(e) => setProb(k, e.target.value)} /></div>
                    ))}
                  </div></div>
                )}

                {aberta.metodo === "8D" && chegou("D3") && (
                  <div className="erp-fieldset"><div className="erp-fieldset-head">D3 — Contenção</div><div className="erp-fieldset-body">
                    <div className="erp-field erp-c12"><small>Registre a contenção como ação do tipo "Contenção" abaixo, ou justifique por que não é necessária.</small></div>
                    <div className="erp-field erp-c12"><label className="erp-label">Contenção não necessária porque</label>
                      <input className="erp-input" disabled={!editavel} value={an.contencao} onChange={(e) => setAn((a) => a && { ...a, contencao: e.target.value })} /></div>
                  </div></div>
                )}

                {(aberta.metodo === "SIMPLES" || chegou("D4")) && (
                  <div className="erp-fieldset"><div className="erp-fieldset-head">{aberta.metodo === "8D" ? "D4 — Causa raiz e ponto de escape" : "Causa raiz"}</div><div className="erp-fieldset-body">
                    <div className="erp-field erp-c3"><label className="erp-label">Método</label>
                      <select className="erp-input" disabled={!editavel} value={an.metodo} onChange={(e) => setAn((a) => a && { ...a, metodo: e.target.value })}>
                        <option value="">—</option><option value="5PORQUES">5 porquês</option><option value="ISHIKAWA">Ishikawa (6M)</option>
                      </select></div>
                    {an.metodo === "5PORQUES" && an.porques.map((p, i) => (
                      <div key={i} className="erp-field erp-c12"><label className="erp-label">{i + 1}º por quê</label>
                        <input className="erp-input" disabled={!editavel} value={p} onChange={(e) => setAn((a) => a && { ...a, porques: a.porques.map((x, j) => (j === i ? e.target.value : x)) })} /></div>
                    ))}
                    {an.metodo === "ISHIKAWA" && CATEGORIAS_ISHIKAWA.map(([k, r]) => (
                      <div key={k} className="erp-field erp-c4"><label className="erp-label">{r} (uma causa por linha)</label>
                        <textarea className="erp-input" rows={3} disabled={!editavel} value={an.ishikawa[k] ?? ""} onChange={(e) => setAn((a) => a && { ...a, ishikawa: { ...a.ishikawa, [k]: e.target.value } })} /></div>
                    ))}
                    <div className="erp-field erp-c12"><label className="erp-label">Causa raiz</label>
                      <input className="erp-input" disabled={!editavel} value={an.causa} onChange={(e) => setAn((a) => a && { ...a, causa: e.target.value })} /></div>
                    {aberta.metodo === "8D" && <div className="erp-field erp-c12"><label className="erp-label">Ponto de escape (por que o controle não detectou)</label>
                      <input className="erp-input" disabled={!editavel} value={an.escape} onChange={(e) => setAn((a) => a && { ...a, escape: e.target.value })} /></div>}
                  </div></div>
                )}

                {aberta.metodo === "8D" && chegou("D7") && (
                  <div className="erp-fieldset"><div className="erp-fieldset-head">D7 — Prevenção da recorrência</div><div className="erp-fieldset-body">
                    <div className="erp-field erp-c12"><label className="erp-label">O que muda para não acontecer de novo (plano de inspeção, IT, dispositivo à prova de erro)</label>
                      <input className="erp-input" disabled={!editavel} value={an.prevencao} onChange={(e) => setAn((a) => a && { ...a, prevencao: e.target.value })} /></div>
                  </div></div>
                )}

                {editavel && (
                  <div className="erp-field erp-c12" style={{ display: "flex", gap: 8, margin: "8px 0" }}>
                    <button className="erp-btn erp-btn-primary" onClick={() => void gravarAnalise()} disabled={busy}>Gravar análise</button>
                    {!final && <button className="erp-btn" onClick={() => void executar(() => avancarCapa(aberta.id), (c) => `Avançou para ${c.nome_etapa}.`)} disabled={busy}>Concluir etapa e avançar</button>}
                  </div>
                )}

                <div className="erp-fieldset"><div className="erp-fieldset-head">Ações</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                    <table className="erp-grid">
                      <thead><tr><th>Tipo</th><th>Ação</th><th>Responsável</th><th>Prazo</th><th>Situação</th><th>Evidência</th><th style={{ width: 220 }} /></tr></thead>
                      <tbody>
                        {aberta.acoes.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhuma ação.</td></tr>}
                        {aberta.acoes.map((x) => (
                          <tr key={x.id} style={x.ciclo !== aberta.ciclo ? { opacity: 0.55 } : undefined}>
                            <td>{ROTULO_ACAO[x.tipo]}{x.ciclo !== aberta.ciclo ? ` (ciclo ${x.ciclo})` : ""}</td><td>{x.descricao}</td><td>{nome[x.responsavel] ?? "—"}</td><td>{dataBR(x.prazo)}</td>
                            <td><span className={`erp-badge ${ROTULO_STATUS_ACAO[x.status][1]}`}>{ROTULO_STATUS_ACAO[x.status][0]}</span></td>
                            <td>{x.evidencia ?? (editavel && x.ciclo === aberta.ciclo && (x.status === "PENDENTE" || x.status === "EM_ANDAMENTO")
                              ? <input className="erp-input" placeholder="evidência" value={evidencias[x.id] ?? ""} onChange={(e) => setEvidencias((m) => ({ ...m, [x.id]: e.target.value }))} /> : "—")}</td>
                            <td>{editavel && x.ciclo === aberta.ciclo && (x.status === "PENDENTE" || x.status === "EM_ANDAMENTO") && (
                              <div style={{ display: "flex", gap: 4 }}>
                                {x.status === "PENDENTE" && <button className="erp-btn erp-btn-sm" onClick={() => void executar(() => atualizarAcao(aberta.id, x.id, { status: "EM_ANDAMENTO" }), () => "Ação em andamento.")}>Iniciar</button>}
                                <button className="erp-btn erp-btn-sm" onClick={() => void executar(() => atualizarAcao(aberta.id, x.id, { status: "CONCLUIDA", evidencia: evidencias[x.id] }), () => "Ação concluída.")}>Concluir</button>
                              </div>
                            )}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {editavel && (<>
                    <div className="erp-field erp-c2"><label className="erp-label">Tipo</label>
                      <select className="erp-input" value={acao.tipo} onChange={(e) => setAcao((a) => ({ ...a, tipo: e.target.value }))}>
                        <option value="CONTENCAO">Contenção</option><option value="CORRETIVA">Corretiva</option><option value="PREVENTIVA">Preventiva</option>
                      </select></div>
                    <div className="erp-field erp-c4"><label className="erp-label">Ação</label>
                      <input className="erp-input" value={acao.descricao} onChange={(e) => setAcao((a) => ({ ...a, descricao: e.target.value }))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Responsável</label>{userSelect(acao.responsavel, (v) => setAcao((a) => ({ ...a, responsavel: v })))}</div>
                    <div className="erp-field erp-c2"><label className="erp-label">Prazo</label>
                      <input className="erp-input" type="date" value={acao.prazo} onChange={(e) => setAcao((a) => ({ ...a, prazo: e.target.value }))} /></div>
                    <div className="erp-field erp-c1"><label className="erp-label">&nbsp;</label>
                      <button className="erp-btn" disabled={busy || !acao.descricao.trim() || !acao.responsavel}
                        onClick={() => void executar(() => adicionarAcao(aberta.id, acao), () => "Ação incluída.").then(() => setAcao((a) => ({ ...a, descricao: "" })))}>Incluir</button></div>
                  </>)}
                </div></div>

                {editavel && final && (
                  <div className="erp-fieldset"><div className="erp-fieldset-head">{aberta.metodo === "8D" ? "D8 — Encerramento e eficácia" : "Verificação de eficácia"}</div><div className="erp-fieldset-body">
                    <div className="erp-field erp-c8"><label className="erp-label erp-req">Como a eficácia foi verificada</label>
                      <input className="erp-input" value={enc.verificacao} onChange={(e) => setEnc((x) => ({ ...x, verificacao: e.target.value }))} placeholder="Ex.: 3 lotes seguintes sem o defeito" /></div>
                    <div className="erp-field erp-c4"><label className="erp-label">Lições aprendidas</label>
                      <input className="erp-input" value={enc.licoes} onChange={(e) => setEnc((x) => ({ ...x, licoes: e.target.value }))} /></div>
                    {!pode("APROVAR") && <div className="erp-field erp-c12"><div className="erp-feedback info">Encerrar a CAPA exige a permissão Aprovar da Qualidade.</div></div>}
                    <div className="erp-field erp-c12" style={{ display: "flex", gap: 8 }}>
                      <button className="erp-btn erp-btn-primary" disabled={busy || !enc.verificacao.trim() || !pode("APROVAR")}
                        onClick={() => void executar(() => encerrarCapa(aberta.id, true, enc.verificacao, enc.licoes || undefined), (c) => `CAPA ${c.numero} encerrada: ação eficaz.`)}>Eficaz — encerrar</button>
                      <button className="erp-btn erp-btn-danger" disabled={busy || !enc.verificacao.trim() || !pode("APROVAR")}
                        onClick={() => void executar(() => encerrarCapa(aberta.id, false, enc.verificacao), (c) => `Ineficaz: a CAPA ${c.numero} voltou para ${c.nome_etapa} (ciclo ${c.ciclo}).`)}>Ineficaz — voltar à causa raiz</button>
                    </div>
                  </div></div>
                )}

                {aberta.status !== "ABERTA" && aberta.verificacao && (
                  <div className="erp-fieldset"><div className="erp-fieldset-head">Encerramento</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                    {aberta.eficaz ? "Eficaz" : "—"}: {aberta.verificacao}{aberta.licoes ? <> · Lições: {aberta.licoes}</> : null} · {dataHora(aberta.closed_at)}
                  </div></div></div>
                )}

                {editavel && (
                  <div className="erp-fieldset"><div className="erp-fieldset-head">Cancelar a CAPA</div><div className="erp-fieldset-body">
                    <div className="erp-field erp-c8"><input className="erp-input" placeholder="motivo" value={motivoCancel} onChange={(e) => setMotivoCancel(e.target.value)} /></div>
                    <div className="erp-field erp-c2"><button className="erp-btn erp-btn-danger" disabled={busy || !motivoCancel.trim() || !pode("EXCLUIR")}
                      onClick={() => void executar(() => cancelarCapa(aberta.id, motivoCancel), (c) => `CAPA ${c.numero} cancelada.`)}>Cancelar CAPA</button></div>
                  </div></div>
                )}

                <div className="erp-fieldset"><div className="erp-fieldset-head">Histórico</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                  <table className="erp-grid">
                    <thead><tr><th>Quando</th><th>Evento</th><th>De → Para</th><th>Detalhe</th><th>Quem</th></tr></thead>
                    <tbody>
                      {(aberta.eventos ?? []).map((ev) => (
                        <tr key={ev.id}><td><small>{dataHora(ev.created_at)}</small></td><td>{ev.evento.toLowerCase().replace("_", " ")}</td>
                          <td>{ev.de || ev.para ? `${ev.de ?? ""} → ${ev.para ?? ""}` : "—"}</td><td>{ev.detalhe ?? "—"}</td><td>{ev.ator ? nome[ev.ator] ?? "—" : "—"}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div></div></div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

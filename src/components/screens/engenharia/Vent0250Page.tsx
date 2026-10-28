import { useCallback, useEffect, useState } from "react";
import {
  type EventoItem, type PainelItem, type ParametrosGov, type Pendente, type RegraCampo, type StatusCadastro, type UsoItem, type Visao,
  ROTULO_STATUS, ROTULO_VISAO, VISOES,
  estornarVisao, historicoItem, liberarVisao, mudarStatusItem, painelItem, parametrosGovernanca, pendentesDeCadastro,
  regrasDeCampo, salvarParametrosGovernanca, salvarRegraDeCampo, usoItem,
} from "@/services/itemGovernancaService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems } from "@/services/lookups";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const dataHora = (s?: string) => (s ? new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");
const COR: Record<StatusCadastro, string> = { EM_CADASTRO: "erp-badge-amber", LIBERADO: "erp-badge-green", BLOQUEADO: "erp-badge-red", DESCONTINUADO: "erp-badge-gray" };
const valor = (v: unknown) => (v === undefined || v === null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));
const ROTULO_EVENTO: Record<string, string> = { CRIACAO: "Criação", ALTERACAO: "Alteração", STATUS: "Status", LIBERACAO: "Liberação", ESTORNO_LIBERACAO: "Estorno da liberação" };

/**
 * VENT0250 — Governança do Cadastro. O cadastro do item como no SAP MDG e no
 * ciclo de vida da Oracle: cada área (engenharia, fiscal, suprimentos,
 * planejamento, comercial, custos) libera a sua visão quando os campos dela
 * estão completos; o item em cadastro, bloqueado ou descontinuado não entra
 * em documento novo; o descontinuado aponta o substituto; toda alteração fica
 * no histórico campo a campo.
 */
export function Vent0250Page(): JSX.Element {
  const [aba, setAba] = useState<"item" | "pendentes" | "regras">("item");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const [codigo, setCodigo] = useState<string | undefined>(undefined);
  const [painel, setPainel] = useState<PainelItem | null>(null);
  const [historico, setHistorico] = useState<EventoItem[]>([]);
  const [uso, setUso] = useState<UsoItem | null>(null);
  const [mud, setMud] = useState({ status: "BLOQUEADO" as StatusCadastro, motivo: "", substituto: undefined as string | undefined });
  const [estorno, setEstorno] = useState({ visao: "" as Visao | "", motivo: "" });
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [par, setPar] = useState<ParametrosGov | null>(null);
  const [regras, setRegras] = useState<RegraCampo[]>([]);

  const abrir = useCallback(async (c: string) => {
    setBusy(true); setFeedback(null);
    try {
      const [p, h, u] = await Promise.all([painelItem(c), historicoItem(c), usoItem(c)]);
      setPainel(p); setHistorico(h); setUso(u);
      setMud({ status: p.status === "LIBERADO" ? "BLOQUEADO" : "LIBERADO", motivo: "", substituto: undefined });
    } catch (e) { setPainel(null); setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  useEffect(() => { if (codigo) void abrir(codigo); }, [codigo, abrir]);
  useEffect(() => {
    if (aba === "pendentes") pendentesDeCadastro().then(setPendentes).catch((e) => setFeedback({ type: "error", message: errMessage(e) }));
    if (aba === "regras") {
      parametrosGovernanca().then(setPar).catch((e) => setFeedback({ type: "error", message: errMessage(e) }));
      regrasDeCampo().then(setRegras).catch((e) => setFeedback({ type: "error", message: errMessage(e) }));
    }
  }, [aba]);

  async function acao(fn: () => Promise<PainelItem>, ok: string) {
    if (!codigo) return;
    setBusy(true); setFeedback(null);
    try { await fn(); await abrir(codigo); setFeedback({ type: "success", message: ok }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); setBusy(false); }
  }

  const opcoesStatus: StatusCadastro[] = painel
    ? ({ EM_CADASTRO: ["BLOQUEADO", "DESCONTINUADO"], LIBERADO: ["BLOQUEADO", "DESCONTINUADO"], BLOQUEADO: ["LIBERADO", "DESCONTINUADO"], DESCONTINUADO: ["LIBERADO"] } as Record<StatusCadastro, StatusCadastro[]>)[painel.status]
    : [];

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Engenharia</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Governança do Cadastro</span><span className="erp-crumb-code">VENT0250</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>
      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Visão</span>
          <button className={`erp-btn ${aba === "item" ? "erp-btn-primary" : ""}`} onClick={() => setAba("item")}>Item</button>
          <button className={`erp-btn ${aba === "pendentes" ? "erp-btn-primary" : ""}`} onClick={() => setAba("pendentes")}>Em cadastro</button>
          <button className={`erp-btn ${aba === "regras" ? "erp-btn-primary" : ""}`} onClick={() => setAba("regras")}>Parâmetros e regras</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span><ExportButton title="VENT0250 — Governança do Cadastro" filename="vent0250" /></div>
      </div>
      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            {aba === "item" && (<>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Item</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c5"><label className="erp-label">Item</label>
                  <LookupField<string> value={codigo} loader={loadItems} entityLabel="item" placeholder="Selecionar item" onChange={(c) => setCodigo(c ?? undefined)} /></div>
                {painel && (
                  <div className="erp-field erp-c7" style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }} id="gov-situacao">
                    <span><span className={`erp-badge ${COR[painel.status]}`}>{ROTULO_STATUS[painel.status]}</span></span>
                    <span>{painel.codigo} · {painel.nome} · <strong>{painel.tipo_nome}</strong></span>
                    {painel.motivo && <span>Motivo: <strong>{painel.motivo}</strong></span>}
                    {painel.substituto && <span>Substituto: <strong>{painel.substituto}</strong></span>}
                  </div>
                )}
              </div></div>

              {painel && (<>
                <div className="erp-fieldset"><div className="erp-fieldset-head">Visões do cadastro — {painel.exige_liberacao ? "a empresa exige a liberação das áreas" : "liberação opcional (o item novo já nasce liberado)"}</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                    <table className="erp-grid" id="gov-visoes">
                      <thead><tr><th>Visão</th><th>Exigida</th><th>Pendências</th><th>Liberada</th><th style={{ width: 120 }} /></tr></thead>
                      <tbody>
                        {painel.visoes.map((v) => (
                          <tr key={v.visao}><td style={{ fontWeight: 600 }}>{ROTULO_VISAO[v.visao]}</td><td>{v.exigida ? "Sim" : "Não"}</td>
                            <td>{v.pendencias.length === 0 ? <span className="erp-badge erp-badge-green">Completa</span> : v.pendencias.map((p) => p.rotulo).join(", ")}</td>
                            <td>{v.liberada ? `${v.liberada.nome || "—"} em ${dataHora(v.liberada.em)}` : "—"}</td>
                            <td>{!v.liberada
                              ? <button className="erp-btn erp-btn-sm" disabled={busy || v.pendencias.length > 0} onClick={() => void acao(() => liberarVisao(painel.codigo, v.visao), `Visão ${ROTULO_VISAO[v.visao].toLowerCase()} liberada.`)}>Liberar</button>
                              : <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => setEstorno({ visao: v.visao, motivo: "" })}>Estornar</button>}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {estorno.visao && (
                    <div className="erp-field erp-c12" style={{ display: "flex", gap: 8 }}>
                      <input className="erp-input" placeholder={`motivo do estorno da visão ${ROTULO_VISAO[estorno.visao].toLowerCase()}`} value={estorno.motivo} onChange={(e) => setEstorno((x) => ({ ...x, motivo: e.target.value }))} />
                      <button className="erp-btn" disabled={busy || !estorno.motivo.trim()} onClick={() => { const v = estorno.visao as Visao; setEstorno({ visao: "", motivo: "" }); void acao(() => estornarVisao(painel.codigo, v, estorno.motivo), "Liberação estornada."); }}>Confirmar estorno</button>
                      <button className="erp-btn" onClick={() => setEstorno({ visao: "", motivo: "" })}>Cancelar</button>
                    </div>
                  )}
                  <div className="erp-field erp-c12"><small>Cada visão é liberada por quem aprova no módulo da área (perfis de acesso). Com a última visão exigida liberada, o item em cadastro fica liberado.</small></div>
                </div></div>

                <div className="erp-fieldset"><div className="erp-fieldset-head">Status do cadastro</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c3"><label className="erp-label">Novo status</label>
                    <select className="erp-input" id="gov-novo-status" value={mud.status} onChange={(e) => setMud((m) => ({ ...m, status: e.target.value as StatusCadastro }))}>
                      {opcoesStatus.map((s) => <option key={s} value={s}>{ROTULO_STATUS[s]}</option>)}</select></div>
                  <div className="erp-field erp-c5"><label className="erp-label erp-req">Motivo</label><input className="erp-input" id="gov-motivo" value={mud.motivo} onChange={(e) => setMud((m) => ({ ...m, motivo: e.target.value }))} placeholder="Ex.: fora de linha, defeito de fornecedor, revisão de engenharia" /></div>
                  {mud.status === "DESCONTINUADO" && (
                    <div className="erp-field erp-c4"><label className="erp-label">Item substituto</label>
                      <LookupField<string> value={mud.substituto} loader={loadItems} entityLabel="item" placeholder="Sem substituto" onChange={(c) => setMud((m) => ({ ...m, substituto: c ?? undefined }))} /></div>
                  )}
                  <div className="erp-field erp-c12">
                    <button className="erp-btn erp-btn-primary" id="gov-mudar-status" disabled={busy || !mud.motivo.trim() || opcoesStatus.length === 0}
                      onClick={() => void acao(() => mudarStatusItem(painel.codigo, { status: mud.status, de: painel.status, motivo: mud.motivo, substituto: mud.substituto }), `Item ${ROTULO_STATUS[mud.status].toLowerCase()}.`)}>Gravar status</button>
                    {" "}<small>Bloqueado, descontinuado ou em cadastro: o item não entra em pedido, orçamento, requisição, OF ou NF nova. Documento já aberto segue.</small>
                  </div>
                  {uso && (
                    <div className="erp-field erp-c12" id="gov-uso" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <span>Saldo em estoque: <strong>{Number(uso.saldo).toLocaleString("pt-BR")}</strong></span>
                      <span>Pedidos de venda abertos: <strong>{uso.pedidos_venda_abertos}</strong></span>
                      <span>Pedidos de compra abertos: <strong>{uso.pedidos_compra_abertos}</strong></span>
                      <span>OFs abertas: <strong>{uso.ordens_fabricacao_abertas}</strong></span>
                      <span>Componente de: <strong>{uso.estruturas_pai.length ? uso.estruturas_pai.join(", ") : "nenhuma estrutura"}</strong></span>
                    </div>
                  )}
                </div></div>

                <div className="erp-fieldset"><div className="erp-fieldset-head">Histórico do cadastro — <span style={{ fontWeight: 400, opacity: 0.65 }}>{historico.length}</span></div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                    <table className="erp-grid" id="gov-historico">
                      <thead><tr><th>Quando</th><th>Quem</th><th>Evento</th><th>Campo</th><th>Antes</th><th>Depois</th><th>Motivo</th></tr></thead>
                      <tbody>
                        {historico.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Sem histórico.</td></tr>}
                        {historico.map((h) => (
                          <tr key={h.id}><td>{dataHora(h.ocorrido_em)}</td><td>{h.nome || "—"}</td><td>{ROTULO_EVENTO[h.evento] ?? h.evento}</td>
                            <td>{h.campo ? (ROTULO_VISAO[h.campo as Visao] ?? h.campo) : "—"}</td>
                            <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>{valor(h.antes)}</td>
                            <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>{valor(h.depois)}</td><td>{h.motivo ?? "—"}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div></div>
              </>)}
            </>)}

            {aba === "pendentes" && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Itens em cadastro — <span style={{ fontWeight: 400, opacity: 0.65 }}>{pendentes.length}</span></div><div className="erp-fieldset-body">
                <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                  <table className="erp-grid" id="gov-pendentes">
                    <thead><tr><th>Item</th><th>Desde</th><th>Visões que faltam</th><th style={{ width: 80 }} /></tr></thead>
                    <tbody>
                      {pendentes.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhum item aguardando liberação.</td></tr>}
                      {pendentes.map((p) => (
                        <tr key={p.item_code}><td>{p.codigo} · {p.nome}</td><td>{dataHora(p.alterado_em)}</td>
                          <td>{p.faltam.map((v) => ROTULO_VISAO[v]).join(", ") || "—"}</td>
                          <td><button className="erp-btn erp-btn-sm" onClick={() => { setAba("item"); setCodigo(p.codigo); }}>Abrir</button></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div></div>
            )}

            {aba === "regras" && par && (<>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Liberação do cadastro</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c12"><label><input type="checkbox" id="gov-exige" checked={par.exige_liberacao} onChange={(e) => setPar({ ...par, exige_liberacao: e.target.checked })} /> Item novo nasce <strong>em cadastro</strong> e só entra em documento depois que as áreas liberarem</label></div>
                <div className="erp-field erp-c12" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {VISOES.map((v) => (
                    <label key={v}><input type="checkbox" checked={par.visoes.includes(v)} onChange={(e) => setPar({ ...par, visoes: e.target.checked ? [...par.visoes, v] : par.visoes.filter((x) => x !== v) })} /> {ROTULO_VISAO[v]}</label>
                  ))}
                </div>
                <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" id="gov-salvar-par" disabled={busy} onClick={() => { setBusy(true); salvarParametrosGovernanca(par).then((p) => { setPar(p); setFeedback({ type: "success", message: "Parâmetros salvos." }); }).catch((e) => setFeedback({ type: "error", message: errMessage(e) })).finally(() => setBusy(false)); }}>Salvar</button>
                  {" "}<small>Itens que já existem continuam liberados.</small></div>
              </div></div>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Campos obrigatórios por visão</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                  <table className="erp-grid" id="gov-regras">
                    <thead><tr><th>Visão</th><th>Campo</th><th>Vale para</th><th>Padrão</th><th>Obrigatório</th><th /></tr></thead>
                    <tbody>
                      {regras.map((r) => (
                        <tr key={r.campo}><td>{ROTULO_VISAO[r.visao]}</td><td>{r.rotulo}</td>
                          <td>{r.tipos?.length ? r.tipos.map((t) => ["fabricado", "comprado", "de terceiro", "serviço"][t]).join(", ") : "todos"}</td>
                          <td>{r.padrao ? "Sim" : "Não"}</td>
                          <td><input type="checkbox" checked={r.obrigatorio} disabled={busy} onChange={(e) => { setBusy(true); salvarRegraDeCampo(r.campo, e.target.checked).then(setRegras).catch((er) => setFeedback({ type: "error", message: errMessage(er) })).finally(() => setBusy(false)); }} /></td>
                          <td>{r.ajustado && <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => { setBusy(true); salvarRegraDeCampo(r.campo, null).then(setRegras).catch((er) => setFeedback({ type: "error", message: errMessage(er) })).finally(() => setBusy(false)); }}>Voltar ao padrão</button>}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div></div>
            </>)}
          </div>
        </section>
      </div>
    </div>
  );
}

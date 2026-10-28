import { useCallback, useEffect, useState } from "react";
import {
  type NivelAprovacao, type PoliticaAprovacao, type SolicitacaoAprovacao,
  aprovarSolicitacao, listarPoliticasAprovacao, listarSolicitacoes, obterSolicitacao, reprovarSolicitacao, salvarPoliticaAprovacao,
} from "@/services/aprovacaoService";
import { obterParametrosComerciais, salvarParametrosComerciais } from "@/services/parametrosComerciaisService";
import { type PerfilAcesso, type UsuarioAcesso, listarPerfis, listarUsuariosAcesso } from "@/services/acessoService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { useAuthStore } from "@/store/authStore";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Aba = "pendentes" | "historico" | "politicas";
// O backend manda o valor como decimal exato (texto); a tela só formata.
const money = (n?: number | string) => Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataHora = (s?: string) => (s ? new Date(s).toLocaleString("pt-BR") : "—");
const ROTULO_STATUS: Record<string, [string, string]> = {
  PENDENTE: ["Pendente", "erp-badge-amber"], APROVADA: ["Aprovada", "erp-badge-green"],
  REPROVADA: ["Reprovada", "erp-badge-red"], CANCELADA: ["Cancelada", "erp-badge-gray"],
};
const ROTULO_EVENTO: Record<string, string> = {
  SOLICITADA: "Solicitada", APROVADA_NIVEL: "Aprovou o nível", APROVADA: "Aprovou (final)", REPROVADA: "Reprovou", CANCELADA: "Cancelou",
};

type NivelForm = { valor_ate: string; aprovador: string };
const nivelParaForm = (n: NivelAprovacao): NivelForm => ({
  valor_ate: n.valor_ate == null ? "" : String(n.valor_ate),
  aprovador: n.perfil_id ? `perfil:${n.perfil_id}` : n.user_id ? `usuario:${n.user_id}` : "",
});

export function Vapr0100Page(): JSX.Element {
  const isAdmin = useAuthStore((state) => state.user?.role?.toUpperCase() === "ADMIN");
  const [aba, setAba] = useState<Aba>("pendentes");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const [lista, setLista] = useState<SolicitacaoAprovacao[]>([]);
  const [aberta, setAberta] = useState<SolicitacaoAprovacao | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [politicas, setPoliticas] = useState<PoliticaAprovacao[]>([]);
  const [perfis, setPerfis] = useState<PerfilAcesso[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioAcesso[]>([]);
  // Alçada de desconto da linha do pedido (vazio = sem limite).
  const [alcada, setAlcada] = useState("");
  const [edicao, setEdicao] = useState<Record<string, { ativa: boolean; segregacao: boolean; descricao: string; niveis: NivelForm[] }>>({});

  const recarregar = useCallback(async () => {
    setBusy(true);
    try {
      setLista(await listarSolicitacoes(aba === "pendentes" ? "PENDENTE" : ""));
      if (isAdmin && aba === "politicas") {
        const [p, pf, us, pc] = await Promise.all([listarPoliticasAprovacao(), listarPerfis(), listarUsuariosAcesso(), obterParametrosComerciais()]);
        setPoliticas(p); setPerfis(pf); setUsuarios(us);
        setAlcada(pc.desconto_max_pct == null ? "" : String(pc.desconto_max_pct).replace(".", ","));
        setEdicao(Object.fromEntries(p.map((x) => [x.tipo, {
          ativa: x.existe ? x.ativa : false, segregacao: x.segregacao, descricao: x.descricao ?? "",
          niveis: x.niveis.length ? x.niveis.map(nivelParaForm) : [{ valor_ate: "", aprovador: "" }],
        }])));
      }
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar as aprovações.") });
    } finally { setBusy(false); }
  }, [aba, isAdmin]);
  useEffect(() => { void recarregar(); }, [recarregar]);

  async function abrir(s: SolicitacaoAprovacao) {
    setBusy(true); setJustificativa("");
    try { setAberta(await obterSolicitacao(s.id)); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function decidir(aprovar: boolean) {
    if (!aberta) return;
    setBusy(true); setFeedback(null);
    try {
      const r = aprovar ? await aprovarSolicitacao(aberta.id, justificativa) : await reprovarSolicitacao(aberta.id, justificativa);
      setFeedback({ type: "success", message: r.status === "APROVADA"
        ? `Aprovação nº ${r.id} concluída: o documento foi liberado.`
        : r.status === "REPROVADA" ? `Aprovação nº ${r.id} reprovada.` : `Nível aprovado; segue para o nível ${r.nivel_atual} de ${r.niveis_exigidos}.` });
      setAberta(null); await recarregar();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  function mudarNivel(tipo: string, idx: number, campo: keyof NivelForm, valor: string) {
    setEdicao((e) => ({ ...e, [tipo]: { ...e[tipo], niveis: e[tipo].niveis.map((n, i) => (i === idx ? { ...n, [campo]: valor } : n)) } }));
  }

  async function gravarPolitica(tipo: string) {
    const e = edicao[tipo];
    const niveis: NivelAprovacao[] = e.niveis.map((n) => {
      const [kind, id] = n.aprovador.split(":");
      return {
        valor_ate: n.valor_ate.trim() === "" ? null : Number(n.valor_ate.replace(",", ".")),
        perfil_id: kind === "perfil" ? Number(id) : null,
        user_id: kind === "usuario" ? id : null,
      };
    });
    setBusy(true); setFeedback(null);
    try {
      await salvarPoliticaAprovacao(tipo, { descricao: e.descricao.trim() || undefined, ativa: e.ativa, segregacao: e.segregacao, niveis });
      setFeedback({ type: "success", message: "Política de aprovação gravada." });
      await recarregar();
    } catch (err) { setFeedback({ type: "error", message: errMessage(err) }); } finally { setBusy(false); }
  }

  async function gravarAlcada() {
    const v = alcada.trim().replace(",", ".");
    if (v !== "" && !/^\d+(\.\d{1,2})?$/.test(v)) {
      setFeedback({ type: "error", message: "Informe a alçada em % (ex.: 10 ou 7,5) ou deixe vazio para sem limite." });
      return;
    }
    setBusy(true); setFeedback(null);
    try {
      const r = await salvarParametrosComerciais({ desconto_max_pct: v === "" ? null : v });
      setAlcada(r.desconto_max_pct == null ? "" : String(r.desconto_max_pct).replace(".", ","));
      setFeedback({ type: "success", message: r.desconto_max_pct == null ? "Alçada removida: o desconto da linha não tem limite." : `Alçada gravada: desconto acima de ${String(r.desconto_max_pct).replace(".", ",")}% vai à aprovação.` });
    } catch (err) { setFeedback({ type: "error", message: errMessage(err) }); } finally { setBusy(false); }
  }

  const pendentesMinhas = lista.filter((s) => s.status === "PENDENTE" && s.posso_aprovar).length;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Plataforma</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Aprovações</span><span className="erp-crumb-code">VAPR0100</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Consulta</span>
          <button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Atualizar</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VAPR0100 — Aprovações" filename="vapr0100" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs">
            <button className={`erp-tab ${aba === "pendentes" ? "active" : ""}`} onClick={() => setAba("pendentes")}>Pendentes{pendentesMinhas > 0 ? ` (${pendentesMinhas} minhas)` : ""}</button>
            <button className={`erp-tab ${aba === "historico" ? "active" : ""}`} onClick={() => setAba("historico")}>Histórico</button>
            {isAdmin && <button className={`erp-tab ${aba === "politicas" ? "active" : ""}`} onClick={() => setAba("politicas")}>Políticas de alçada</button>}
          </div>
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            {(aba === "pendentes" || aba === "historico") && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">{aba === "pendentes" ? "Aguardando aprovação" : "Todas as solicitações"} — <span style={{ fontWeight: 400, opacity: 0.65 }}>{lista.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead><tr><th>Nº</th><th>Tipo</th><th>Documento</th><th className="num">Valor</th><th>Motivo</th><th>Solicitante</th><th>Nível</th><th>Situação</th><th style={{ width: 110 }}>Ações</th></tr></thead>
                  <tbody>
                    {lista.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">{aba === "pendentes" ? "Nada aguardando aprovação." : "Nenhuma solicitação."}</td></tr>}
                    {lista.map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>{s.id}</td>
                        <td><small>{s.tipo_nome}</small></td>
                        <td>{s.documento_codigo}</td>
                        <td className="num">{money(s.valor)}</td>
                        <td><small>{s.descricao}</small></td>
                        <td><small>{s.solicitante_nome}<br />{dataHora(s.created_at)}</small></td>
                        <td>{s.status === "PENDENTE" ? `${s.nivel_atual} de ${s.niveis_exigidos}` : `${s.niveis_exigidos}`}</td>
                        <td>
                          <span className={`erp-badge ${ROTULO_STATUS[s.status]?.[1] ?? "erp-badge-gray"}`}>{ROTULO_STATUS[s.status]?.[0] ?? s.status}</span>
                          {s.status === "PENDENTE" && (s.posso_aprovar
                            ? <><br /><small style={{ color: "var(--v-ok, #2e7d32)" }}>sua vez</small></>
                            : <><br /><small style={{ opacity: 0.7 }}>{s.motivo_bloqueio}</small></>)}
                        </td>
                        <td><button className={`erp-btn erp-btn-sm ${s.posso_aprovar ? "erp-btn-primary" : ""}`} onClick={() => void abrir(s)}>{s.posso_aprovar ? "Decidir" : "Ver"}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div></div></div>
            )}

            {isAdmin && aba === "politicas" && politicas.map((p) => {
              const e = edicao[p.tipo];
              if (!e) return null;
              return (
                <div className="erp-fieldset" key={p.tipo}><div className="erp-fieldset-head">{p.nome}{!p.existe && <span style={{ fontWeight: 400, opacity: 0.65 }}>{p.tipo === "PEDIDO_POLITICA_COMERCIAL" ? " — sem política: desconto acima da alçada é recusado" : " — sem política: a liberação segue manual"}</span>}</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c2"><label className="erp-label">Situação</label>
                    <select className="erp-input" value={e.ativa ? "1" : "0"} onChange={(ev) => setEdicao((x) => ({ ...x, [p.tipo]: { ...e, ativa: ev.target.value === "1" } }))}>
                      <option value="1">Ativa</option><option value="0">Inativa</option></select></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Segregação de funções</label>
                    <select className="erp-input" value={e.segregacao ? "1" : "0"} onChange={(ev) => setEdicao((x) => ({ ...x, [p.tipo]: { ...e, segregacao: ev.target.value === "1" } }))}>
                      <option value="1">Quem pede não aprova; um nível por pessoa</option><option value="0">Sem segregação</option></select></div>
                  <div className="erp-field erp-c6"><label className="erp-label">Descrição</label>
                    <input className="erp-input" value={e.descricao} onChange={(ev) => setEdicao((x) => ({ ...x, [p.tipo]: { ...e, descricao: ev.target.value } }))} /></div>
                  {p.tipo === "PEDIDO_POLITICA_COMERCIAL" && (
                    <div className="erp-field erp-c12" style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                      <div><label className="erp-label">Alçada de desconto da linha do pedido (%)</label>
                        <input className="erp-input num" inputMode="decimal" placeholder="sem limite" style={{ width: 140 }} value={alcada} onChange={(ev) => setAlcada(ev.target.value)} /></div>
                      <button className="erp-btn" onClick={() => void gravarAlcada()} disabled={busy}>Gravar alçada</button>
                      <small style={{ flexBasis: "100%" }}>Desconto acima da alçada bloqueia o pedido até a aprovação abaixo. Sem política ativa, a linha acima da alçada é recusada. As políticas comerciais (VPDV0108) que exigem aprovação também caem aqui.</small>
                    </div>
                  )}
                  <div className="erp-field erp-c12">
                    <table className="erp-grid">
                      <thead><tr><th style={{ width: 60 }}>Nível</th><th>Encerra até (R$)</th><th>Aprovador</th><th style={{ width: 90 }} /></tr></thead>
                      <tbody>
                        {e.niveis.map((n, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td><input className="erp-input num" inputMode="decimal" placeholder={i === e.niveis.length - 1 ? "sem teto" : "valor"} value={n.valor_ate} onChange={(ev) => mudarNivel(p.tipo, i, "valor_ate", ev.target.value)} /></td>
                            <td>
                              <select className="erp-input" value={n.aprovador} onChange={(ev) => mudarNivel(p.tipo, i, "aprovador", ev.target.value)}>
                                <option value="">— escolha —</option>
                                <optgroup label="Perfil de acesso">{perfis.map((pf) => <option key={pf.id} value={`perfil:${pf.id}`}>{pf.nome}</option>)}</optgroup>
                                <optgroup label="Usuário">{usuarios.map((u) => <option key={u.user_id} value={`usuario:${u.user_id}`}>{u.nome || u.email}</option>)}</optgroup>
                              </select>
                            </td>
                            <td><button className="erp-btn erp-btn-sm" disabled={e.niveis.length === 1} onClick={() => setEdicao((x) => ({ ...x, [p.tipo]: { ...e, niveis: e.niveis.filter((_, k) => k !== i) } }))}>Remover</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <small>O valor do documento define até que nível vai: acima do teto do nível 1, precisa do nível 1 e do 2, e assim por diante. Só o último nível fica sem teto.</small>
                  </div>
                  <div className="erp-field erp-c12">
                    <button className="erp-btn" disabled={e.niveis.length >= 9} onClick={() => setEdicao((x) => ({ ...x, [p.tipo]: { ...e, niveis: [...e.niveis, { valor_ate: "", aprovador: "" }] } }))}>+ Nível</button>{" "}
                    <button className="erp-btn erp-btn-primary" onClick={() => void gravarPolitica(p.tipo)} disabled={busy}>Gravar política</button>
                  </div>
                </div></div>
              );
            })}
          </div>
        </section>
      </div>

      {aberta && (
        <div className="erp-modal-backdrop" onClick={() => setAberta(null)}>
          <div className="erp-modal" onClick={(ev) => ev.stopPropagation()} style={{ maxWidth: 820 }}>
            <div className="erp-modal-head">
              <div><strong>Aprovação nº {aberta.id} — {aberta.tipo_nome}</strong><br />
                <small>Documento {aberta.documento_codigo} · {money(aberta.valor)} · {aberta.descricao}</small></div>
              <button className="erp-btn" onClick={() => setAberta(null)}>Fechar</button>
            </div>
            <div className="erp-modal-body">
              <table className="erp-grid">
                <thead><tr><th>Quando</th><th>Quem</th><th>O quê</th><th>Nível</th><th>Justificativa</th></tr></thead>
                <tbody>
                  {(aberta.eventos ?? []).map((ev, i) => (
                    <tr key={i}><td><small>{dataHora(ev.created_at)}</small></td><td>{ev.ator_nome}</td><td>{ROTULO_EVENTO[ev.evento] ?? ev.evento}</td><td>{ev.nivel ?? "—"}</td><td><small>{ev.justificativa}</small></td></tr>
                  ))}
                </tbody>
              </table>
              {aberta.status === "PENDENTE" && (
                aberta.posso_aprovar ? (
                  <div style={{ marginTop: 12 }}>
                    <label className="erp-label">Justificativa (obrigatória para reprovar)</label>
                    <textarea className="erp-input" rows={3} value={justificativa} onChange={(ev) => setJustificativa(ev.target.value)} />
                  </div>
                ) : <div className="erp-feedback info" style={{ marginTop: 12 }}>{aberta.motivo_bloqueio}</div>
              )}
            </div>
            {aberta.status === "PENDENTE" && aberta.posso_aprovar && (
              <div className="erp-modal-actions">
                <button className="erp-btn" onClick={() => void decidir(false)} disabled={busy}>Reprovar</button>
                <button className="erp-btn erp-btn-primary" onClick={() => void decidir(true)} disabled={busy}>Aprovar nível {aberta.nivel_atual}</button>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="erp-statusbar">
        <div style={{ display: "contents" }}>
          <div className="erp-status-item">Aguardando você: <strong>{pendentesMinhas}</strong></div>
        </div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

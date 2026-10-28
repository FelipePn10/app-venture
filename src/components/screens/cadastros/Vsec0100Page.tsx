import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  type SituacaoTrocaSenha, type SolicitacaoTrocaSenha,
  REGRAS_SENHA, SITUACAO_TROCA_SENHA,
  approvePasswordChange, completePasswordChange, listPasswordChangeRequests, myPasswordChangeRequests,
  rejectPasswordChange, requestPasswordChange, solicitacaoAtiva,
} from "@/services/passwordChangeService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { useAuthStore } from "@/store/authStore";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type Aba = "pendentes" | "historico";

const dataHora = (s?: string) => (s ? new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");
const hora = (s?: string) => (s ? new Date(s).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—");

function Situacao({ status }: { status: SituacaoTrocaSenha }): JSX.Element {
  const s = SITUACAO_TROCA_SENHA[status] ?? { rotulo: "—", badge: "erp-badge-gray" };
  return <span className={`erp-badge ${s.badge}`}>{s.rotulo}</span>;
}

/** O que aconteceu com a solicitação, em uma linha. */
function detalheDecisao(s: SolicitacaoTrocaSenha): string {
  switch (s.status) {
    case "APPROVED": return `Aprovada por ${s.approved_by_name ?? "administrador"} em ${dataHora(s.approved_at)} · válida até ${hora(s.expires_at)}`;
    case "REJECTED": return `Rejeitada por ${s.rejected_by_name ?? "administrador"} em ${dataHora(s.rejected_at)}${s.rejection_reason ? ` — ${s.rejection_reason}` : ""}`;
    case "USED": return `Senha trocada em ${dataHora(s.used_at)}`;
    case "EXPIRED": return `Aprovada por ${s.approved_by_name ?? "administrador"}; não foi usada dentro do prazo`;
    default: return "Aguardando um administrador";
  }
}

/** Contagem regressiva até o fim do prazo da aprovação. */
function useRestante(expiraEm?: string): number {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!expiraEm) return undefined;
    const t = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [expiraEm]);
  return expiraEm ? Math.max(0, new Date(expiraEm).getTime() - agora) : 0;
}

/** A API escreve as mensagens em minúscula; na tela começam com maiúscula. */
const frase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const mmss = (ms: number) => {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

/**
 * VSEC0100 — Troca de Senha. Todo usuário solicita e conclui a própria troca;
 * o administrador aprova ou rejeita as dos colegas. Nenhum identificador interno
 * aparece: a solicitação é reconhecida por quem pediu, quando e por quê.
 */
export function Vsec0100Page(): JSX.Element {
  const navigate = useNavigate();
  const isAdmin = useAuthStore((state) => state.user?.role?.toUpperCase() === "ADMIN");
  const clearAuthData = useAuthStore((state) => state.clearAuthData);
  const [minhas, setMinhas] = useState<SolicitacaoTrocaSenha[]>([]);
  const [empresa, setEmpresa] = useState<SolicitacaoTrocaSenha[]>([]);
  const [aba, setAba] = useState<Aba>("pendentes");
  const [filtro, setFiltro] = useState<"" | SituacaoTrocaSenha>("");
  const [motivo, setMotivo] = useState("");
  const [senhas, setSenhas] = useState({ atual: "", nova: "", confirmacao: "" });
  const [mostrar, setMostrar] = useState(false);
  const [rejeitando, setRejeitando] = useState<{ id: string; motivo: string } | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [trocada, setTrocada] = useState(false);

  const carregar = useCallback(async () => {
    setBusy(true);
    try {
      setMinhas(await myPasswordChangeRequests());
      if (isAdmin) setEmpresa(await listPasswordChangeRequests(aba === "pendentes" ? "PENDING" : filtro));
    } catch (e) {
      setFeedback({ type: "error", message: frase(errMessage(e, "Não foi possível carregar as solicitações de troca de senha.")) });
    } finally { setBusy(false); }
  }, [isAdmin, aba, filtro]);
  useEffect(() => { void carregar(); }, [carregar]);

  const ativa = solicitacaoAtiva(minhas);
  const ultima = minhas[0];
  const restante = useRestante(ativa?.status === "APPROVED" ? ativa.expires_at : undefined);
  const aprovadaValida = ativa?.status === "APPROVED" && restante > 0;
  const regras = useMemo(() => REGRAS_SENHA.map((r) => ({ rotulo: r.rotulo, ok: r.ok(senhas.nova) })), [senhas.nova]);
  const diferente = senhas.nova !== "" && senhas.nova !== senhas.atual;
  const confere = senhas.confirmacao !== "" && senhas.confirmacao === senhas.nova;
  const podeConcluir = aprovadaValida && senhas.atual !== "" && regras.every((r) => r.ok) && diferente && confere;

  async function executar(fn: () => Promise<void>) {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: frase(errMessage(e)) }); } finally { setBusy(false); }
  }

  const solicitar = () => executar(async () => {
    await requestPasswordChange(motivo.trim());
    setMotivo("");
    setFeedback({ type: "success", message: "Solicitação registrada. Assim que um administrador aprovar, volte a esta tela para definir a nova senha." });
    await carregar();
  });

  const concluir = () => executar(async () => {
    if (!ativa) return;
    await completePasswordChange(ativa.id, senhas.atual, senhas.nova, senhas.confirmacao);
    setSenhas({ atual: "", nova: "", confirmacao: "" });
    setTrocada(true);
    setFeedback({ type: "success", message: "Senha alterada. Por segurança, todas as sessões abertas foram encerradas — entre novamente com a nova senha." });
    window.setTimeout(() => { clearAuthData(); navigate("/login", { replace: true }); }, 3500);
  });

  const aprovar = (s: SolicitacaoTrocaSenha) => executar(async () => {
    await approvePasswordChange(s.id);
    setFeedback({ type: "success", message: `Troca de senha de ${s.user_name ?? s.user_email} aprovada. A pessoa tem 15 minutos para concluir.` });
    await carregar();
  });

  const confirmarRejeicao = () => executar(async () => {
    if (!rejeitando) return;
    const alvo = empresa.find((s) => s.id === rejeitando.id);
    await rejectPasswordChange(rejeitando.id, rejeitando.motivo.trim());
    setRejeitando(null);
    setFeedback({ type: "success", message: `Solicitação de ${alvo?.user_name ?? "usuário"} rejeitada.` });
    await carregar();
  });

  const pendentes = aba === "pendentes" ? empresa.length : undefined;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Plataforma</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Troca de Senha</span><span className="erp-crumb-code">VSEC0100</span>
        </nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Consulta</span>
          <button className="erp-btn" onClick={() => void carregar()} disabled={busy}>{busy && <span className="erp-spin" />}Atualizar</button>
        </div>
        {isAdmin && (
          <div className="erp-tgroup">
            <span className="erp-tgroup-label">Relatório</span>
            <ExportButton title="VSEC0100 — Troca de Senha" filename="vsec0100" />
          </div>
        )}
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`} role={feedback.type === "error" ? "alert" : undefined}>{feedback.message}</div>}

            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Minha senha</div>
              <div className="erp-fieldset-body">
                {trocada && (
                  <div className="erp-field erp-c12"><p className="erp-note">Redirecionando para o login…</p></div>
                )}
                {!trocada && !ativa && (
                  <>
                    <div className="erp-field erp-c12">
                      <p className="erp-note">
                        A troca passa por aprovação: você solicita, um <strong>administrador da empresa</strong> aprova e você
                        define a nova senha em até <strong>15 minutos</strong>. Ao concluir, todas as sessões abertas são encerradas.
                      </p>
                      {ultima && (
                        <p className="erp-note" style={{ marginTop: 6 }}>
                          Última solicitação, de {dataHora(ultima.created_at)}: <Situacao status={ultima.status} /> {detalheDecisao(ultima)}.
                        </p>
                      )}
                    </div>
                    <div className="erp-field erp-c9">
                      <label className="erp-label">Motivo <span style={{ fontWeight: 400, textTransform: "none" }}>(opcional — ajuda o administrador a decidir)</span></label>
                      <input className="erp-input" value={motivo} maxLength={500} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: primeira troca, suspeita de que a senha foi vista" />
                    </div>
                    <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}>
                      <button className="erp-btn erp-btn-primary" onClick={solicitar} disabled={busy}>Solicitar troca de senha</button>
                    </div>
                  </>
                )}

                {!trocada && ativa?.status === "PENDING" && (
                  <div className="erp-field erp-c12">
                    <p className="erp-note">
                      <Situacao status="PENDING" /> Solicitada em {dataHora(ativa.created_at)}{ativa.reason ? ` — “${ativa.reason}”` : ""}.
                      {" "}Um administrador da empresa precisa aprovar. Depois da aprovação, clique em <strong>Atualizar</strong> e defina a nova senha.
                    </p>
                  </div>
                )}

                {!trocada && ativa?.status === "APPROVED" && (
                  <>
                    <div className="erp-field erp-c12">
                      {aprovadaValida ? (
                        <p className="erp-note">
                          <Situacao status="APPROVED" /> por {ativa.approved_by_name ?? "administrador"}. Defina a nova senha em{" "}
                          <em>{mmss(restante)}</em> — depois disso a aprovação expira e é preciso solicitar de novo.
                        </p>
                      ) : (
                        <div className="erp-feedback warn">A aprovação expirou sem uso. Clique em <strong>Atualizar</strong> e faça uma nova solicitação.</div>
                      )}
                    </div>
                    {aprovadaValida && (
                      <>
                        <div className="erp-field erp-c4">
                          <label className="erp-label erp-req">Senha atual</label>
                          <input className="erp-input" type={mostrar ? "text" : "password"} autoComplete="current-password" value={senhas.atual} onChange={(e) => setSenhas((s) => ({ ...s, atual: e.target.value }))} />
                        </div>
                        <div className="erp-field erp-c4">
                          <label className="erp-label erp-req">Nova senha</label>
                          <input className="erp-input" type={mostrar ? "text" : "password"} autoComplete="new-password" maxLength={128} value={senhas.nova} onChange={(e) => setSenhas((s) => ({ ...s, nova: e.target.value }))} />
                        </div>
                        <div className="erp-field erp-c4">
                          <label className="erp-label erp-req">Confirmar nova senha</label>
                          <input className="erp-input" type={mostrar ? "text" : "password"} autoComplete="new-password" maxLength={128} value={senhas.confirmacao} onChange={(e) => setSenhas((s) => ({ ...s, confirmacao: e.target.value }))} />
                        </div>
                        <div className="erp-field erp-c8">
                          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 12 }} aria-label="Requisitos da nova senha">
                            {[...regras, { rotulo: "Diferente da senha atual", ok: diferente }, { rotulo: "Confirmação igual à nova senha", ok: confere }].map((r) => (
                              <li key={r.rotulo} style={{ color: r.ok ? "var(--v-ok)" : "var(--v-text-muted)" }}>{r.ok ? "✓" : "○"} {r.rotulo}</li>
                            ))}
                          </ul>
                          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, marginTop: 8 }}>
                            <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} /> Mostrar senhas
                          </label>
                        </div>
                        <div className="erp-field erp-c4" style={{ justifyContent: "flex-end" }}>
                          <button className="erp-btn erp-btn-primary" onClick={concluir} disabled={busy || !podeConcluir}>Trocar senha</button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Aprovação das solicitações da empresa</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c12">
                    <div className="erp-tabs">
                      <button className={`erp-tab ${aba === "pendentes" ? "active" : ""}`} onClick={() => setAba("pendentes")}>
                        Aguardando aprovação{pendentes ? ` (${pendentes})` : ""}
                      </button>
                      <button className={`erp-tab ${aba === "historico" ? "active" : ""}`} onClick={() => setAba("historico")}>Histórico</button>
                    </div>
                  </div>
                  {aba === "historico" && (
                    <div className="erp-field erp-c3">
                      <label className="erp-label">Situação</label>
                      <select className="erp-input" value={filtro} onChange={(e) => setFiltro(e.target.value as "" | SituacaoTrocaSenha)}>
                        <option value="">Todas</option>
                        {(Object.keys(SITUACAO_TROCA_SENHA) as SituacaoTrocaSenha[]).map((k) => <option key={k} value={k}>{SITUACAO_TROCA_SENHA[k].rotulo}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="erp-field erp-c12">
                    <table className="erp-grid">
                      <thead><tr><th>Usuário</th><th>Solicitada em</th><th>Motivo</th><th>Situação</th><th style={{ width: 190 }}>Ações</th></tr></thead>
                      <tbody>
                        {empresa.length === 0 && (
                          <tr><td colSpan={5} className="erp-grid-empty">{aba === "pendentes" ? "Nenhuma solicitação aguardando aprovação." : "Nenhuma solicitação nesta situação."}</td></tr>
                        )}
                        {empresa.map((s) => (
                          <tr key={s.id}>
                            <td><strong>{s.user_name || "—"}</strong><br /><small>{s.user_email}</small></td>
                            <td>{dataHora(s.created_at)}</td>
                            <td><small>{s.reason || "—"}</small></td>
                            <td><Situacao status={s.status} /><br /><small style={{ opacity: 0.75 }}>{detalheDecisao(s)}</small></td>
                            <td>
                              {s.status !== "PENDING" ? <small style={{ opacity: 0.6 }}>—</small>
                                : s.own ? <small style={{ opacity: 0.75 }}>Sua solicitação: outro administrador decide</small>
                                : rejeitando?.id === s.id ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <input className="erp-input" autoFocus placeholder="Motivo da rejeição" maxLength={500} value={rejeitando.motivo} onChange={(e) => setRejeitando({ id: s.id, motivo: e.target.value })} />
                                    <div style={{ display: "flex", gap: 4 }}>
                                      <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={confirmarRejeicao} disabled={busy || rejeitando.motivo.trim().length < 3}>Confirmar</button>
                                      <button className="erp-btn erp-btn-sm" onClick={() => setRejeitando(null)} disabled={busy}>Cancelar</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", gap: 4 }}>
                                    <button className="erp-btn erp-btn-primary erp-btn-sm" onClick={() => aprovar(s)} disabled={busy}>Aprovar</button>
                                    <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => setRejeitando({ id: s.id, motivo: "" })} disabled={busy}>Rejeitar</button>
                                  </div>
                                )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Aprovação válida por <strong>15 min</strong> e de uso único</div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

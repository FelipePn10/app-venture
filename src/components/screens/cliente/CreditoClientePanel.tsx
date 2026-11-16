import { Fragment, useCallback, useEffect, useState } from "react";
import {
  suggestCredit, setCreditLimit, listCreditReviews,
  type CreditSuggestion, type CreditReview, type CreditFactor,
} from "@/services/customerService";
import { errMessage } from "@/services/fiscalShared";
import { money, dataBR, diasAte, grupoDoFator, problemaDoLimite, comparadoAoRecomendado, type GrupoFator } from "./formato";
import "@/styles/cliente-credito.css";

/*
 * Pasta Crédito da VCLI0500. O limite não é digitado: o sistema calcula score,
 * classe de risco e limite pelo histórico de pagamento do cliente (e do grupo
 * econômico) e pelos dados da Receita, e explica cada fator. Quem aprova
 * escolhe seguir a recomendação ou gravar outro valor com justificativa, e
 * tudo fica na trilha.
 */

const CLASSE_TOM: Record<string, string> = { A: "ok", B: "ok", C: "info", D: "warn", E: "err" };
const CLASSE_TEXTO: Record<string, string> = {
  A: "risco muito baixo", B: "risco baixo", C: "risco moderado", D: "risco alto: todo pedido passa pela análise de crédito",
  E: "risco muito alto: todo pedido passa pela análise de crédito",
};
const ORIGEM: Record<string, string> = { CADASTRO: "Cadastro", REVISAO: "Revisão", LEGADO: "Limite antigo" };

export function ClasseBadge({ classe }: { classe?: string }): JSX.Element {
  if (!classe) return <span className="erp-badge gray">sem análise</span>;
  return <span className={`erp-badge ${CLASSE_TOM[classe] ?? "info"}`}>Classe {classe}</span>;
}

/* Faixas das classes como o servidor calcula (classFor). */
const FAIXAS = [
  { de: 0, ate: 350, cor: "var(--v-err)", classe: "E" }, { de: 350, ate: 500, cor: "#d9822b", classe: "D" },
  { de: 500, ate: 650, cor: "#d4b02a", classe: "C" }, { de: 650, ate: 800, cor: "#6aa84f", classe: "B" },
  { de: 800, ate: 1000, cor: "var(--v-ok)", classe: "A" },
];

function EscalaScore({ score }: { score: number }): JSX.Element {
  const pos = Math.max(0, Math.min(1000, score)) / 10;
  return (
    <div className="cc-escala" role="img" aria-label={`Score ${score} de 1000`}>
      <div className="cc-escala-barra">
        {FAIXAS.map((f) => <span key={f.classe} style={{ width: `${(f.ate - f.de) / 10}%`, background: f.cor }} title={`Classe ${f.classe}: ${f.de} a ${f.ate}`} />)}
        <div className="cc-escala-marca" style={{ left: `${pos}%` }} />
      </div>
      <div className="cc-escala-rotulos">
        {FAIXAS.map((f) => <span key={f.classe} style={{ left: `${(f.de + f.ate) / 20}%` }}>{f.classe}</span>)}
      </div>
    </div>
  );
}

const GRUPOS: { id: GrupoFator; titulo: string; cor: string }[] = [
  { id: "bloqueio", titulo: "Bloqueios — impedem crédito a prazo", cor: "var(--v-err)" },
  { id: "contra", titulo: "Pesou contra", cor: "#d9822b" },
  { id: "favor", titulo: "Pesou a favor", cor: "var(--v-ok)" },
  { id: "info", titulo: "Observações", cor: "var(--v-info)" },
];

/** Fatores agrupados pelo que fizeram com o score. */
export function FatoresCredito({ factors }: { factors: CreditFactor[] }): JSX.Element {
  const lista = factors.filter((f) => f.code !== "BASE_DO_LIMITE");
  return (
    <>
      {GRUPOS.map((g) => {
        const itens = lista.filter((f) => grupoDoFator(f) === g.id);
        if (itens.length === 0) return null;
        return (
          <div key={g.id} className="cc-grupo">
            <div className={`cc-grupo-titulo ${g.id}`}>{g.titulo}</div>
            {itens.map((f, i) => (
              <div key={`${f.code}-${i}`} className="cc-fator">
                <div className="cc-fator-nome">{f.label}</div>
                <div className="cc-fator-det">{f.detail}</div>
                <div className="cc-fator-pts">
                  {f.max_points > 0 ? <>
                    {f.points} de {f.max_points} pts
                    <div className="cc-mini"><span style={{ width: `${Math.max(0, Math.min(100, (f.points / f.max_points) * 100))}%`, background: g.cor }} /></div>
                  </> : f.points !== 0 ? `${f.points > 0 ? "+" : ""}${f.points} pts` : f.blocking ? "bloqueia" : ""}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

function fraseDaRecomendacao(s: CreditSuggestion): string {
  const nomes = (g: GrupoFator) => s.factors.filter((f) => f.code !== "BASE_DO_LIMITE" && grupoDoFator(f) === g).map((f) => f.label.toLowerCase());
  if (s.hard_stop) {
    return `O sistema recomenda não conceder crédito a prazo: ${nomes("bloqueio").join(", ")}. Enquanto isso, todo pedido a prazo passa pela análise de crédito.`;
  }
  const base = s.has_history ? "no histórico de pagamento do cliente" : "nos dados cadastrais (o cliente ainda não tem histórico de pagamento suficiente)";
  const grupo = s.group_members.length > 1 ? ` somado a ${s.group_members.length - 1} outro(s) estabelecimento(s) do mesmo grupo econômico` : "";
  const favor = nomes("favor"), contra = nomes("contra");
  return [
    `Calculado com base ${base}${grupo}.`,
    favor.length ? `Pesou a favor: ${favor.join(", ")}.` : "",
    contra.length ? `Pesou contra: ${contra.join(", ")}.` : "",
  ].filter(Boolean).join(" ");
}

/** Card da recomendação e card dos fatores, lado a lado. */
/** pessoaFisica: CPF não é consultado na Receita, então não há aviso de consulta indisponível. */
export function ExplicacaoDoLimite({ s, pessoaFisica = false }: { s: CreditSuggestion; pessoaFisica?: boolean }): JSX.Element {
  const calc = s.factors.find((f) => f.code === "BASE_DO_LIMITE");
  return (
    <div className="cc-grid-2">
      <div className={`cc-card cc-reco${s.hard_stop ? " bloqueio" : ""}`}>
        <div className="cc-card-title">Limite recomendado pelo sistema</div>
        <div className="cc-reco-valor">{money(s.suggested_limit)}</div>
        <div className="cc-row" style={{ marginTop: 8 }}>
          <ClasseBadge classe={s.risk_class} />
          <span className="cc-muted">{CLASSE_TEXTO[s.risk_class] ?? ""} · score {s.score} de 1000</span>
        </div>
        <EscalaScore score={s.score} />
        <div className="cc-frase">{fraseDaRecomendacao(s)}</div>
        {calc?.detail && <div className="cc-calc"><strong>Conta do valor:</strong> {calc.detail}.</div>}
        <div className="cc-muted" style={{ marginTop: 10 }}>Se aprovada hoje, vale até <strong>{dataBR(s.expires_at)}</strong>; depois disso o limite precisa de nova análise.</div>
        {s.deteriorating && <div className="erp-feedback warn" style={{ marginTop: 10 }}>Os pagamentos recentes pioraram em relação ao histórico do cliente.</div>}
        {!s.registration_checked && !pessoaFisica && <div className="erp-feedback info" style={{ marginTop: 10 }}>A Receita não respondeu agora: a análise usou os dados já gravados no cadastro.</div>}
      </div>
      <div className="cc-card">
        <div className="cc-card-title">Por que esse valor</div>
        <FatoresCredito factors={s.factors} />
      </div>
    </div>
  );
}

interface DecisaoProps {
  s: CreditSuggestion;
  isAdmin: boolean;
  /** Limite gravado hoje; ausente no cadastro novo. */
  limiteAtual?: number;
  seguir: boolean;
  onSeguir: (seguir: boolean) => void;
  valor: string;
  onValor: (v: string) => void;
  motivo: string;
  onMotivo: (v: string) => void;
}

/** "Seguir a recomendação" ou "Definir outro valor", com o que será gravado. */
export function DecisaoDoLimite({ s, isAdmin, limiteAtual, seguir, onSeguir, valor, onValor, motivo, onMotivo }: DecisaoProps): JSX.Element {
  const num = seguir ? s.suggested_limit : Number(valor.replace(",", "."));
  const comparacao = !seguir && valor !== "" ? comparadoAoRecomendado(num, s.suggested_limit) : null;
  const precisaMotivo = !seguir && valor !== "" && num !== s.suggested_limit;
  const tamMotivo = [...motivo.trim()].length;
  const problema = !seguir && valor !== "" ? problemaDoLimite({ sugerido: s.suggested_limit, maxSemAdmin: s.max_without_admin, hardStop: s.hard_stop, isAdmin, valor: num, motivo }) : null;

  const alcada = isAdmin
    ? "Como administrador, você pode aprovar qualquer valor; a diferença e a justificativa ficam na trilha."
    : s.hard_stop
      ? "Há bloqueio: só um administrador pode liberar limite acima de zero."
      : s.max_without_admin <= 0
        ? "A recomendação é zero: só um administrador pode liberar limite acima de zero."
      : `Sem administrador, você pode aprovar até ${money(s.max_without_admin)}. Valores menores que o recomendado são sempre permitidos.`;

  return (
    <div className="cc-card">
      <div className="cc-card-title">Sua decisão</div>
      <div className="cc-opcoes" role="radiogroup" aria-label="Limite a gravar">
        <label className={`cc-opcao${seguir ? " ativa" : ""}`}>
          <input type="radio" name="decisao-limite" checked={seguir} onChange={() => onSeguir(true)} />
          <div>
            <div className="cc-opcao-titulo">Seguir a recomendação · {money(s.suggested_limit)}</div>
            <div className="cc-opcao-desc">Não precisa justificar. Fica na trilha como aprovado conforme a análise.</div>
          </div>
        </label>
        <label className={`cc-opcao${!seguir ? " ativa" : ""}`}>
          <input type="radio" name="decisao-limite" checked={!seguir} onChange={() => onSeguir(false)} />
          <div>
            <div className="cc-opcao-titulo">Definir outro valor</div>
            <div className="cc-opcao-desc">Exige justificativa, registrada com seu usuário. {isAdmin ? "" : s.max_without_admin > 0 ? `Você aprova até ${money(s.max_without_admin)}; acima disso, só um administrador.` : "Com recomendação zero, só um administrador libera limite."}</div>
          </div>
        </label>
      </div>

      {!seguir && (
        <div className="cc-outro">
          <div>
            <label className="erp-label erp-req" htmlFor="limite-outro">Limite a gravar (R$)</label>
            <input id="limite-outro" className="erp-input num" type="number" step="0.01" min="0" value={valor} onChange={(e) => onValor(e.target.value)} autoFocus />
            {comparacao && <span className={`cc-chip ${num > s.suggested_limit ? "acima" : "abaixo"}`}>{comparacao}</span>}
            <div className="cc-muted" style={{ marginTop: 8, fontSize: 11.5 }}>{alcada}</div>
          </div>
          <div>
            <label className={`erp-label${precisaMotivo ? " erp-req" : ""}`} htmlFor="limite-motivo">Justificativa</label>
            <textarea id="limite-motivo" className="erp-input" rows={3} style={{ height: 76, resize: "vertical" }} value={motivo} onChange={(e) => onMotivo(e.target.value)}
              placeholder="Ex.: garantia real apresentada; balanço 2025 analisado pela diretoria; cliente pediu limite menor…" />
            {precisaMotivo && <div className={`cc-contador${tamMotivo >= 15 ? " ok" : ""}`}>{tamMotivo >= 15 ? "✓ justificativa suficiente" : `${tamMotivo} de 15 caracteres mínimos`}</div>}
          </div>
        </div>
      )}

      {problema && !(precisaMotivo && tamMotivo < 15) && <div className="erp-feedback error" style={{ marginTop: 12 }}>{problema}</div>}

      {(seguir || valor !== "") && !problema && (
        <div className="cc-resumo">
          Ao gravar: limite {limiteAtual != null ? <>passa de <strong>{money(limiteAtual)}</strong> para </> : "de "}<strong>{money(num)}</strong>,
          classe <strong>{s.risk_class || "—"}</strong>, válido até <strong>{dataBR(s.expires_at)}</strong>.{" "}
          {num === s.suggested_limit ? "Registrado como seguindo a recomendação." : "Registrado como decisão diferente da recomendação, com a sua justificativa."}
        </div>
      )}
    </div>
  );
}

interface Props {
  code: number;
  currentLimit?: number;
  riskClass?: string;
  expiresAt?: string;
  expired?: boolean;
  isAdmin: boolean;
  pessoaFisica?: boolean;
  onSaved: () => void;
}

export function CreditoClientePanel({ code, currentLimit, riskClass, expiresAt, expired, isAdmin, pessoaFisica, onSaved }: Props): JSX.Element {
  const [sug, setSug] = useState<CreditSuggestion | null>(null);
  const [seguir, setSeguir] = useState(true);
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [trilha, setTrilha] = useState<CreditReview[]>([]);
  const [aberta, setAberta] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const carregarTrilha = useCallback(async () => {
    try { setTrilha(await listCreditReviews(code)); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); }
  }, [code]);
  useEffect(() => { void carregarTrilha(); setSug(null); setSeguir(true); setValor(""); setMotivo(""); }, [carregarTrilha]);

  async function analisar() {
    setBusy(true); setFeedback(null);
    try {
      const s = await suggestCredit({ code });
      setSug(s); setSeguir(true); setValor(String(s.suggested_limit)); setMotivo("");
    } catch (e) { setFeedback({ type: "error", message: errMessage(e, "Não foi possível analisar o crédito.") }); }
    finally { setBusy(false); }
  }

  const num = seguir || !sug ? sug?.suggested_limit ?? 0 : Number(valor.replace(",", "."));
  const problema = sug && !seguir
    ? (valor === "" ? "Informe o limite (zero ou mais)." : problemaDoLimite({ sugerido: sug.suggested_limit, maxSemAdmin: sug.max_without_admin, hardStop: sug.hard_stop, isAdmin, valor: num, motivo }))
    : null;

  async function gravar() {
    if (!sug) return;
    if (problema) { setFeedback({ type: "error", message: problema }); return; }
    setBusy(true); setFeedback(null);
    try {
      await setCreditLimit(code, num, seguir ? "" : motivo.trim());
      setFeedback({ type: "success", message: num === sug.suggested_limit ? "Limite recomendado gravado." : "Limite gravado com a justificativa na trilha de crédito." });
      setSug(null); setValor(""); setMotivo("");
      await carregarTrilha(); onSaved();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); }
  }

  const ultima = trilha[0];
  const dias = expiresAt ? diasAte(expiresAt) : null;
  const validade = !expiresAt ? "sem validade" : expired || (dias != null && dias < 0) ? `vencido desde ${dataBR(expiresAt)}`
    : dias === 0 ? "vence hoje" : `vence em ${dias} dia(s)`;

  return (
    <div style={{ padding: "2px 0 8px" }}>
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

      <div className="cc-card">
        <div className="cc-atual">
          <div className="cc-atual-item"><div className="cc-label">Limite atual</div><div className="cc-valor">{money(currentLimit)}</div></div>
          <div className="cc-atual-item"><div className="cc-label">Classe de risco</div><div className="cc-valor" style={{ fontSize: 15 }}><ClasseBadge classe={riskClass} /></div></div>
          <div className="cc-atual-item">
            <div className="cc-label">Validade</div>
            <div className="cc-valor" style={{ fontSize: 17, color: expired ? "var(--v-err)" : undefined }}>{dataBR(expiresAt)}</div>
            <div className="cc-sub">{validade}</div>
          </div>
          {ultima && <div className="cc-atual-item">
            <div className="cc-label">Última decisão</div>
            <div className="cc-valor" style={{ fontSize: 15 }}>{ORIGEM[ultima.origin] ?? ultima.origin} em {dataBR(ultima.created_at)}</div>
            <div className="cc-sub">{ultima.origin === "LEGADO" ? "sem análise do sistema" : ultima.deviates ? "diferente da recomendação" : "seguiu a recomendação"}{ultima.created_by_name && ultima.origin !== "LEGADO" ? ` · por ${ultima.created_by_name}` : ""}</div>
          </div>}
          <div className="cc-spacer" />
          <button className="erp-btn erp-btn-primary" onClick={() => void analisar()} disabled={busy}>{busy && !sug ? "Analisando…" : sug ? "Refazer análise" : "Fazer nova análise"}</button>
        </div>
        {ultima?.origin === "LEGADO" && !sug && (
          <div className="erp-feedback warn" style={{ marginTop: 12 }}>
            Este limite veio do cadastro antigo e nunca passou pela análise do sistema. Faça a análise até {dataBR(expiresAt)}: depois disso os pedidos a prazo vão para a análise de crédito.
          </div>
        )}
        <div className="cc-muted" style={{ marginTop: 10, fontSize: 11.5 }}>
          Na confirmação, o pedido a prazo vai para a análise de crédito quando: o limite está vencido; a classe é D ou E; o limite é zero; ou o cliente (ou o grupo econômico) tem título vencido além da tolerância.
        </div>
      </div>

      {sug && <>
        <div style={{ marginTop: 14 }}><ExplicacaoDoLimite s={sug} pessoaFisica={pessoaFisica} /></div>
        <div style={{ marginTop: 14 }}>
          <DecisaoDoLimite s={sug} isAdmin={isAdmin} limiteAtual={currentLimit} seguir={seguir}
            onSeguir={(v) => { setSeguir(v); if (v) { setValor(String(sug.suggested_limit)); setMotivo(""); } }}
            valor={valor} onValor={setValor} motivo={motivo} onMotivo={setMotivo} />
          <div className="cc-row" style={{ marginTop: 12 }}>
            <div className="cc-spacer" />
            <button className="erp-btn" onClick={() => { setSug(null); setFeedback(null); }} disabled={busy}>Cancelar</button>
            <button className="erp-btn erp-btn-primary" onClick={() => void gravar()} disabled={busy || !!problema}>{busy ? "Gravando…" : "Gravar limite"}</button>
          </div>
        </div>
      </>}

      <div className="cc-card" style={{ marginTop: 14 }}>
        <div className="cc-card-title">Trilha de crédito · quem decidiu o quê</div>
        <table className="erp-grid">
          <thead><tr><th>Data</th><th>Quem</th><th>Origem</th><th style={{ textAlign: "right" }}>Recomendado</th><th style={{ textAlign: "right" }}>Aprovado</th><th>Score / classe</th><th>Validade</th><th>Justificativa</th><th /></tr></thead>
          <tbody>
            {trilha.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">Nenhuma análise gravada.</td></tr>}
            {trilha.map((r) => (
              <Fragment key={r.id}>
                <tr>
                  <td>{new Date(r.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td>{r.origin === "LEGADO" ? <span className="cc-muted">migração</span> : r.created_by_name || "—"}</td>
                  <td>{ORIGEM[r.origin] ?? r.origin}</td>
                  <td style={{ textAlign: "right" }}>{money(r.suggested_limit)}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    {money(r.approved_limit)}
                    {r.deviates && <div><span className={`cc-chip ${r.approved_limit > r.suggested_limit ? "acima" : "abaixo"}`}>{comparadoAoRecomendado(r.approved_limit, r.suggested_limit)}</span></div>}
                  </td>
                  <td>{r.score} · <ClasseBadge classe={r.risk_class} /></td>
                  <td>{dataBR(r.expires_at)}</td>
                  <td style={{ maxWidth: 320 }}>{r.reason ?? <span className="cc-muted">—</span>}</td>
                  <td>{r.factors.length > 0 && <button className="erp-btn erp-btn-sm" onClick={() => setAberta(aberta === r.id ? null : r.id)}>{aberta === r.id ? "Ocultar" : "Ver fatores"}</button>}</td>
                </tr>
                {aberta === r.id && <tr><td colSpan={9} style={{ background: "var(--v-surface-2)" }}><div style={{ padding: "4px 8px" }}><FatoresCredito factors={r.factors} /></div></td></tr>}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

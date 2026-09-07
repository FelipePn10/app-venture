import { useCallback, useEffect, useState } from "react";
import {
  type Restriction, type RestrictionDominant, type RestrictionDeterminant,
  type RestrictionReason, type RestrictionOperator,
  RESTRICTION_OPERATORS, RESTRICTION_CONNECTORS,
  type RestrictionEvaluation,
  listRestrictionsByItem, createRestriction, deactivateRestriction,
  listRestrictionReasons, createRestrictionReason, evaluateRestrictions,
  precedenciaEmPalavras,
} from "@/services/configuratorRestrictionService";
import { type CfgItemCharacteristic, listItemQuestions } from "@/services/configuratorCfgService";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadCustomers } from "@/services/lookups";
import { errMessage } from "@/services/fiscalShared";

/**
 * Restrições e dependências (FENG0116 no FoccoERP).
 *
 * É aqui que se ensina ao configurador quais combinações existem de verdade.
 * A regra se lê como uma frase: SE a COR for igual a PRETO E a LARGURA
 * pertencer a 400,450 ENTÃO a PROFUNDIDADE é inválida. Escrever isso em
 * formulário — com as perguntas do próprio item nos selects — é bem menos
 * sujeito a erro do que digitar códigos numa grade, que é o que os ERPs de
 * mercado ainda pedem.
 */
type Props = { aviso: (tipo: "success" | "error", msg: string) => void; itemCode: string; onItemChange: (c: string) => void };

/**
 * Os quatro motivos que o mercado usa (é a classificação do FoccoERP):
 * comercial = não vale a pena vender, técnica = não é possível fazer,
 * processo = a fábrica não tem capacidade, global = vale por qualquer motivo.
 * Ficam como sugestão de cadastro para a empresa não começar do zero.
 */
const MOTIVOS_SUGERIDOS = [
  "Comercial — combinação inviável para o negócio",
  "Técnica — combinação impossível de produzir",
  "Processo — a fábrica não tem capacidade para esta combinação",
  "Global — combinação bloqueada por qualquer motivo",
];

const DOMINANTE_VAZIA: RestrictionDominant = { question_id: 0, operator: "EQUAL", condition_type: "AND", answer_value: "", sequence: 1 };
const DETERMINANTE_VAZIA: RestrictionDeterminant = { question_id: 0, operator: "INVALID", answer_value: "" };

export function RestricoesTab({ aviso, itemCode, onItemChange }: Props): JSX.Element {
  const [perguntas, setPerguntas] = useState<CfgItemCharacteristic[]>([]);
  const [regras, setRegras] = useState<Restriction[]>([]);
  const [motivos, setMotivos] = useState<RestrictionReason[]>([]);
  const [motivo, setMotivo] = useState<string>("");
  const [novoMotivo, setNovoMotivo] = useState("");
  const [ses, setSes] = useState<RestrictionDominant[]>([{ ...DOMINANTE_VAZIA }]);
  const [entaos, setEntaos] = useState<RestrictionDeterminant[]>([{ ...DETERMINANTE_VAZIA }]);
  const [cliente, setCliente] = useState<number | undefined>(undefined);
  const [auditoria, setAuditoria] = useState<RestrictionEvaluation | null>(null);
  const [respostasAudit, setRespostasAudit] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);

  const executar = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { aviso("error", errMessage(e)); } finally { setBusy(false); }
  }, [aviso]);

  const carregar = useCallback((code: string) => executar(async () => {
    if (!code.trim()) { setPerguntas([]); setRegras([]); return; }
    const [qs, rs, ms] = await Promise.all([
      listItemQuestions(code.trim()),
      listRestrictionsByItem(code.trim()),
      listRestrictionReasons(),
    ]);
    setPerguntas(qs); setRegras(rs); setMotivos(ms);
  }), [executar]);

  // O item escolhido é compartilhado entre as abas: ao entrar aqui já vindo de
  // outra etapa, carrega sozinho em vez de exigir que o usuário reescolha.
  useEffect(() => { void carregar(itemCode); }, [itemCode, carregar]);

  const nomeDaPergunta = (id: number) =>
    perguntas.find((p) => p.characteristic_id === id)?.characteristic_name ?? `pergunta ${id}`;

  const rotuloOperador = (op: RestrictionOperator) =>
    RESTRICTION_OPERATORS.find((o) => o.value === op)?.label ?? op;

  function gravar() {
    if (!itemCode.trim()) { aviso("error", "Escolha o item."); return; }
    const condicoes = ses.filter((d) => d.question_id > 0);
    const consequencias = entaos.filter((d) => d.question_id > 0);
    if (condicoes.length === 0) { aviso("error", "Informe ao menos uma condição (SE)."); return; }
    if (consequencias.length === 0) { aviso("error", "Informe ao menos uma consequência (ENTÃO)."); return; }
    void executar(async () => {
      await createRestriction({
        itemCode: itemCode.trim(),
        customerCode: cliente,
        reasonCode: Number(motivo) || undefined,
        dominants: condicoes.map((d, i) => ({ ...d, sequence: i + 1 })),
        determinants: consequencias,
      });
      aviso("success", "Restrição cadastrada. O configurador já passa a respeitá-la.");
      setSes([{ ...DOMINANTE_VAZIA }]);
      setEntaos([{ ...DETERMINANTE_VAZIA }]);
      await carregar(itemCode);
    });
  }

  return (
    <section className="erp-detail-panel">
      <div className="erp-tabs"><button className="erp-tab active">Restrições e dependências</button></div>
      <div className="erp-detail-body">

        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Item</div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c4">
              <label className="erp-label erp-req">Item configurável</label>
              <LookupField
                value={itemCode || undefined}
                onChange={(code) => { const c = code ? String(code) : ""; onItemChange(c); void carregar(c); }}
                loader={loadItems}
                entityLabel="item"
                placeholder="Escolher o item…"
              />
            </div>
            <div className="erp-field erp-c4">
              <label className="erp-label">Motivo da restrição</label>
              <select className="erp-input" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                <option value="">Sem motivo</option>
                {motivos.map((m) => <option key={m.code} value={m.code}>{m.description}</option>)}
              </select>
              <span className="cfgw-hint">Explica ao vendedor por que a combinação não existe.</span>
            </div>
            <div className="erp-field erp-c4">
              <label className="erp-label">Cadastrar motivo</label>
              <div className="cfgw-inline">
                <input className="erp-input" value={novoMotivo} placeholder="Ex.: Sem viabilidade técnica"
                  onChange={(e) => setNovoMotivo(e.target.value)} />
                <button className="erp-btn erp-btn-sm" disabled={busy || !novoMotivo.trim()}
                  onClick={() => void executar(async () => {
                    const m = await createRestrictionReason(novoMotivo.trim());
                    setNovoMotivo(""); setMotivos(await listRestrictionReasons()); setMotivo(String(m.code));
                  })}>Incluir</button>
              </div>
              {motivos.length === 0 && (
                <div className="cfgw-sugestoes">
                  <span className="cfgw-hint">Sugestões:</span>
                  {MOTIVOS_SUGERIDOS.map((m) => (
                    <button className="erp-btn erp-btn-sm" key={m} onClick={() => setNovoMotivo(m)}>{m.split(" — ")[0]}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="erp-field erp-c4">
              <label className="erp-label">Vale só para o cliente</label>
              <LookupField
                value={cliente}
                onChange={(c) => setCliente(c ? Number(c) : undefined)}
                loader={loadCustomers}
                entityLabel="cliente"
                placeholder="Opcional — em branco vale para todos"
                clearable
              />
              <span className="cfgw-hint">
                Uma regra de cliente vence a regra geral do item: é assim que se libera
                uma combinação para um cliente sem abrir para o resto.
              </span>
            </div>
          </div>
        </div>

        <div className="erp-fieldset">
          <div className="erp-fieldset-head">SE — condições</div>
          <div className="erp-fieldset-body">
            {ses.map((d, i) => (
              <div className="erp-field erp-c12 cfgw-clause" key={`se-${i}`}>
                <span className="cfgw-keyword">{i === 0 ? "SE" : ""}</span>
                {i > 0 && (
                  <select className="erp-input erp-input-sm cfgw-conn" value={d.condition_type}
                    onChange={(e) => setSes((l) => l.map((x, k) => k === i ? { ...x, condition_type: e.target.value as "AND" | "OR" } : x))}>
                    {RESTRICTION_CONNECTORS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                )}
                <select className="erp-input" value={d.question_id || ""}
                  onChange={(e) => setSes((l) => l.map((x, k) => k === i ? { ...x, question_id: Number(e.target.value) } : x))}>
                  <option value="">a pergunta…</option>
                  {perguntas.map((p) => <option key={p.id} value={p.characteristic_id}>{p.characteristic_name}</option>)}
                </select>
                <select className="erp-input cfgw-op" value={d.operator}
                  onChange={(e) => setSes((l) => l.map((x, k) => k === i ? { ...x, operator: e.target.value as RestrictionOperator } : x))}>
                  {RESTRICTION_OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input className="erp-input" placeholder="PT   ou   400,450" value={d.answer_value}
                  onChange={(e) => setSes((l) => l.map((x, k) => k === i ? { ...x, answer_value: e.target.value.toUpperCase() } : x))} />
                <button className="erp-btn erp-btn-danger erp-btn-sm" disabled={ses.length === 1}
                  onClick={() => setSes((l) => l.filter((_, k) => k !== i))}>×</button>
              </div>
            ))}
            <div className="erp-field erp-c12 cfgw-actions">
              <button className="erp-btn erp-btn-sm" onClick={() => setSes((l) => [...l, { ...DOMINANTE_VAZIA, sequence: l.length + 1 }])}>
                + outra condição
              </button>
              <span className="cfgw-hint">Para “pertence a”, separe as respostas por vírgula.</span>
            </div>
          </div>
        </div>

        <div className="erp-fieldset">
          <div className="erp-fieldset-head">ENTÃO — consequências</div>
          <div className="erp-fieldset-body">
            {entaos.map((d, i) => (
              <div className="erp-field erp-c12 cfgw-clause" key={`entao-${i}`}>
                <span className="cfgw-keyword">{i === 0 ? "ENTÃO" : "E"}</span>
                <select className="erp-input" value={d.question_id || ""}
                  onChange={(e) => setEntaos((l) => l.map((x, k) => k === i ? { ...x, question_id: Number(e.target.value) } : x))}>
                  <option value="">a pergunta…</option>
                  {perguntas.map((p) => <option key={p.id} value={p.characteristic_id}>{p.characteristic_name}</option>)}
                </select>
                <select className="erp-input cfgw-op" value={d.operator}
                  onChange={(e) => setEntaos((l) => l.map((x, k) => k === i ? { ...x, operator: e.target.value as RestrictionOperator } : x))}>
                  {RESTRICTION_OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input className="erp-input" placeholder="resposta (vazio para “inválida”)" value={d.answer_value ?? ""}
                  onChange={(e) => setEntaos((l) => l.map((x, k) => k === i ? { ...x, answer_value: e.target.value.toUpperCase() } : x))} />
                <button className="erp-btn erp-btn-danger erp-btn-sm" disabled={entaos.length === 1}
                  onClick={() => setEntaos((l) => l.filter((_, k) => k !== i))}>×</button>
              </div>
            ))}
            <div className="erp-field erp-c12 cfgw-actions">
              <button className="erp-btn erp-btn-sm" onClick={() => setEntaos((l) => [...l, { ...DETERMINANTE_VAZIA }])}>
                + outra consequência
              </button>
              <button className="erp-btn erp-btn-primary" onClick={gravar} disabled={busy || !itemCode}>
                Cadastrar restrição
              </button>
            </div>
          </div>
        </div>

        {perguntas.length > 0 && (
          <div className="erp-fieldset">
            <div className="erp-fieldset-head">Auditoria — por que uma pergunta some?</div>
            <div className="erp-fieldset-body">
              <div className="erp-field erp-c12"><span className="cfgw-hint">
                Responda como o vendedor responderia e veja qual regra dispara. É a resposta
                para a pergunta que mais aparece no dia a dia: “por que esta opção sumiu?”.
              </span></div>
              {perguntas.map((p) => (
                <div className="erp-field erp-c3" key={`audit-${p.id}`}>
                  <label className="erp-label">{p.characteristic_name}</label>
                  <input className="erp-input" value={respostasAudit[p.characteristic_id] ?? ""}
                    placeholder="resposta (código)"
                    onChange={(e) => setRespostasAudit((r) => ({ ...r, [p.characteristic_id]: e.target.value.toUpperCase() }))} />
                </div>
              ))}
              <div className="erp-field erp-c12 cfgw-actions">
                <button className="erp-btn erp-btn-dark" disabled={busy}
                  onClick={() => void executar(async () => {
                    const respostas = Object.fromEntries(
                      Object.entries(respostasAudit).filter(([, v]) => v.trim()).map(([k, v]) => [Number(k), v]),
                    );
                    setAuditoria(await evaluateRestrictions(itemCode.trim(), respostas, cliente));
                  })}>Conferir combinação</button>
                {auditoria && <button className="erp-btn erp-btn-sm" onClick={() => setAuditoria(null)}>Limpar</button>}
              </div>

              {auditoria && (
                <div className="erp-field erp-c12">
                  {auditoria.restriction_code === 0 ? (
                    <div className="erp-feedback success">
                      Nenhuma restrição se aplica a esta combinação — ela pode ser vendida e produzida.
                    </div>
                  ) : (
                    <div className="erp-feedback info">
                      A restrição <strong>#{auditoria.restriction_code}</strong> disparou.
                      {auditoria.invalid_question_ids.length > 0 && (
                        <> Some(m) da tela: <strong>{auditoria.invalid_question_ids.map(nomeDaPergunta).join(", ")}</strong>.</>
                      )}
                      {Object.keys(auditoria.locked_values).length > 0 && (
                        <> Respondida(s) automaticamente: {Object.entries(auditoria.locked_values)
                          .map(([q, v]) => `${nomeDaPergunta(Number(q))} = ${v}`).join("; ")}.</>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Restrições do item ({regras.length})</div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>Código</th><th>Regra</th><th>Situação</th><th /></tr></thead>
                <tbody>
                  {regras.length === 0 && (
                    <tr><td colSpan={4} className="erp-grid-empty">
                      {itemCode ? "Nenhuma restrição cadastrada para este item." : "Escolha o item."}
                    </td></tr>
                  )}
                  {regras.map((r) => (
                    <tr key={r.code}>
                      <td>#{r.code}</td>
                      <td className="cfgw-rule">
                        {r.dominants.length === 0 && r.determinants.length === 0
                          ? <em>regra sem condições — abra para conferir</em>
                          : (
                            <>
                              <strong>SE</strong>{" "}
                              {r.dominants.map((d, i) => (
                                <span key={i}>
                                  {i > 0 && <strong> {d.condition_type === "OR" ? "OU" : "E"} </strong>}
                                  {nomeDaPergunta(d.question_id)} {rotuloOperador(d.operator)} <code>{d.answer_value || "—"}</code>
                                </span>
                              ))}
                              {" "}<strong>ENTÃO</strong>{" "}
                              {r.determinants.map((d, i) => (
                                <span key={i}>
                                  {i > 0 && <strong> e </strong>}
                                  {nomeDaPergunta(d.question_id)} {rotuloOperador(d.operator)}{d.answer_value ? <> <code>{d.answer_value}</code></> : null}
                                </span>
                              ))}
                            </>
                          )}
                      </td>
                      <td>
                        {r.situation === "ACTIVE" ? "Ativa" : "Inativa"}
                        <span className="cfgw-hint">{precedenciaEmPalavras(r)}</span>
                      </td>
                      <td className="cfgw-rowactions">
                        {r.situation === "ACTIVE" && (
                          <button className="erp-btn erp-btn-danger erp-btn-sm"
                            onClick={() => void executar(async () => { await deactivateRestriction(r.code); await carregar(itemCode); })}>
                            Inativar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

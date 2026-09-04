import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyConfiguration,
  loadConfiguratorPanel,
  ConfiguratorRestrictionError,
  type ConfiguratorAnswerInput,
  type ConfiguratorApplyResult,
  type ConfiguratorPanel,
  type ConfiguratorQuestion,
  type ConfiguratorViolation,
} from "@/services/structureConfiguratorService";
import { errMessage } from "@/services/fiscalShared";

/**
 * Painel do botão "Configurador" da Estrutura de Produto (VENT0210).
 *
 * O configurador não é uma tela: é este painel, aberto de dentro da estrutura,
 * como no FoccoERP. Ele responde as perguntas do item, valida as restrições e
 * dependências, gera a máscara e devolve a estrutura já com as quantidades das
 * fórmulas avaliadas. A configuração gravada é a que passa a valer para o MRP,
 * o custo e as ordens.
 */

type Props = {
  itemCode: string;
  itemName?: string;
  /** Aplica a máscara configurada na estrutura e recarrega os componentes. */
  onUseMask: (mask: string) => void;
  onClose: () => void;
};

/** Uma resposta em edição; escolha múltipla guarda várias variáveis. */
type Draft = { variableIds: number[]; value: string };

function emptyDraft(): Draft {
  return { variableIds: [], value: "" };
}

/** Monta o payload de respostas a partir do rascunho da tela. */
function toAnswers(questions: ConfiguratorQuestion[], drafts: Record<number, Draft>): ConfiguratorAnswerInput[] {
  const answers: ConfiguratorAnswerInput[] = [];
  for (const q of questions) {
    const draft = drafts[q.characteristic_id];
    if (!draft) continue;
    if (draft.variableIds.length > 0) {
      // Escolha múltipla repete a mesma característica com variáveis diferentes.
      for (const variableId of draft.variableIds) {
        answers.push({ characteristic_id: q.characteristic_id, variable_id: variableId, value: "" });
      }
      continue;
    }
    if (draft.value.trim()) {
      answers.push({ characteristic_id: q.characteristic_id, variable_id: null, value: draft.value.trim() });
    }
  }
  return answers;
}

/** Perguntas obrigatórias ainda sem resposta. */
function pendingRequired(questions: ConfiguratorQuestion[], drafts: Record<number, Draft>): ConfiguratorQuestion[] {
  return questions.filter((q) => {
    if (!q.required) return false;
    const draft = drafts[q.characteristic_id];
    return !draft || (draft.variableIds.length === 0 && !draft.value.trim());
  });
}

export function StructureConfiguratorPanel({ itemCode, itemName, onUseMask, onClose }: Props): JSX.Element {
  const [panel, setPanel] = useState<ConfiguratorPanel | null>(null);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [violations, setViolations] = useState<ConfiguratorViolation[]>([]);
  const [result, setResult] = useState<ConfiguratorApplyResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    loadConfiguratorPanel(itemCode)
      .then((data) => {
        if (cancelled) return;
        setPanel(data);
        // Pré-carrega as respostas marcadas como padrão no cadastro.
        const initial: Record<number, Draft> = {};
        for (const q of data.questions) {
          const def = q.options.find((o) => o.is_default);
          initial[q.characteristic_id] = def ? { variableIds: [def.variable_id], value: "" } : emptyDraft();
        }
        setDrafts(initial);
      })
      .catch((e) => { if (!cancelled) setError(errMessage(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [itemCode]);

  const questions = useMemo(() => panel?.questions ?? [], [panel]);
  const pending = useMemo(() => pendingRequired(questions, drafts), [questions, drafts]);
  const violatedIds = useMemo(
    () => new Set(violations.map((v) => v.characteristic_id)),
    [violations],
  );

  const setDraft = useCallback((characteristicId: number, next: Draft) => {
    setDrafts((prev) => ({ ...prev, [characteristicId]: next }));
    // Qualquer alteração invalida o resultado anterior.
    setResult(null);
    setViolations([]);
  }, []);

  const run = useCallback(async (persist: boolean) => {
    if (!panel) return;
    setBusy(true); setError(""); setViolations([]);
    try {
      const answers = toAnswers(questions, drafts);
      if (answers.length === 0) {
        setError("Responda ao menos uma característica para configurar o item.");
        return;
      }
      const missing = pendingRequired(questions, drafts);
      if (persist && missing.length > 0) {
        setError(`Responda as perguntas obrigatórias antes de gravar: ${missing.map((q) => q.description).join(", ")}.`);
        return;
      }
      setResult(await applyConfiguration(itemCode, answers, persist));
    } catch (e) {
      if (e instanceof ConfiguratorRestrictionError) {
        setViolations(e.violations);
        setError(e.violations.length
          ? "A combinação escolhida é proibida pelas restrições cadastradas. Ajuste as perguntas destacadas."
          : e.message);
        return;
      }
      setError(errMessage(e));
    } finally {
      setBusy(false);
    }
  }, [panel, questions, drafts, itemCode]);

  const renderInput = (q: ConfiguratorQuestion): JSX.Element => {
    const draft = drafts[q.characteristic_id] ?? emptyDraft();
    if (q.allows_multiple && q.options.length > 0) {
      return (
        <div className="cfg-checks">
          {q.options.map((o) => {
            const checked = draft.variableIds.includes(o.variable_id);
            return (
              <label className="cfg-check" key={o.variable_id}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => setDraft(q.characteristic_id, {
                    variableIds: checked
                      ? draft.variableIds.filter((id) => id !== o.variable_id)
                      : [...draft.variableIds, o.variable_id],
                    value: "",
                  })}
                />
                {o.description || o.code}
              </label>
            );
          })}
        </div>
      );
    }
    if (q.options.length > 0) {
      return (
        <select
          className="cfg-input"
          value={draft.variableIds[0] ?? ""}
          onChange={(e) => setDraft(q.characteristic_id, {
            variableIds: e.target.value ? [Number(e.target.value)] : [],
            value: "",
          })}
        >
          <option value="">Selecione…</option>
          {q.options.map((o) => (
            <option key={o.variable_id} value={o.variable_id}>{o.description || o.code}</option>
          ))}
        </select>
      );
    }
    if (q.type === "OPCAO") {
      return (
        <select
          className="cfg-input"
          value={draft.value}
          onChange={(e) => setDraft(q.characteristic_id, { variableIds: [], value: e.target.value })}
        >
          <option value="">Selecione…</option>
          <option value="S">{q.option_true || "Sim"}</option>
          <option value="N">{q.option_false || "Não"}</option>
        </select>
      );
    }
    if (q.type === "INF_NUMERICA") {
      return (
        <input
          className="cfg-input num"
          type="number"
          value={draft.value}
          min={q.num_min}
          max={q.num_max}
          step={q.num_multiple || "any"}
          placeholder={q.num_min != null && q.num_max != null ? `Entre ${q.num_min} e ${q.num_max}` : "Informe o valor"}
          onChange={(e) => setDraft(q.characteristic_id, { variableIds: [], value: e.target.value })}
        />
      );
    }
    return (
      <input
        className="cfg-input"
        value={draft.value}
        placeholder={q.mask ? `Máscara: ${q.mask}` : "Informe o valor"}
        onChange={(e) => setDraft(q.characteristic_id, { variableIds: [], value: e.target.value })}
      />
    );
  };

  return (
    <div className="cfg-backdrop" role="dialog" aria-modal="true" aria-label="Configurador do produto">
      <style>{CFG_STYLES}</style>
      <div className="cfg-modal">

        <header className="cfg-head">
          <div>
            <div className="cfg-head-title">Configurador do produto</div>
            <div className="cfg-head-sub">
              {itemCode}{itemName || panel?.item_name ? ` — ${itemName || panel?.item_name}` : ""}
            </div>
          </div>
          <div className="cfg-head-right">
            {panel?.restrictions_enabled && <span className="cfg-chip">Restrições ativas</span>}
            <button className="cfg-btn cfg-btn-ghost" onClick={onClose} aria-label="Fechar">Fechar</button>
          </div>
        </header>

        <div className="cfg-body">
          {loading && <div className="cfg-note">Carregando as perguntas do item…</div>}

          {!loading && panel && !panel.configurable && (
            <div className="cfg-note">
              {panel.message || "Este item não tem características cadastradas, então não há o que configurar. Cadastre as características do item antes de usar o configurador."}
            </div>
          )}

          {error && <div className="cfg-alert err">{error}</div>}

          {violations.length > 0 && (
            <div className="cfg-alert err">
              <strong>Restrições violadas</strong>
              <ul>{violations.map((v, i) => <li key={i}>{v.message}</li>)}</ul>
            </div>
          )}

          {!loading && panel?.configurable && (
            <div className="cfg-split">

              {/* PERGUNTAS */}
              <section className="cfg-card">
                <div className="cfg-card-head">
                  Perguntas do item
                  <span className="cfg-count">{questions.length}</span>
                </div>
                <div className="cfg-card-body">
                  {questions.map((q) => (
                    <div className={`cfg-field${violatedIds.has(q.characteristic_id) ? " violated" : ""}`} key={q.characteristic_id}>
                      <label className="cfg-label">
                        {q.description || q.code}
                        {q.required && <span className="cfg-req"> *</span>}
                        <span className="cfg-type">{q.type_label}</span>
                        {q.used_by_formula && <span className="cfg-chip sm">Usada em fórmula</span>}
                      </label>
                      {renderInput(q)}
                    </div>
                  ))}
                  {questions.length === 0 && <div className="cfg-empty">Nenhuma pergunta cadastrada para este item.</div>}
                </div>
              </section>

              {/* RESULTADO E FÓRMULAS */}
              <aside className="cfg-side">

                {result && (
                  <section className="cfg-card">
                    <div className="cfg-card-head">
                      Configuração {result.persisted ? "gravada" : "simulada"}
                    </div>
                    <div className="cfg-card-body">
                      <div className="cfg-mask">{result.mask || "—"}</div>
                      {(result.warnings ?? []).map((w, i) => <div className="cfg-alert warn" key={i}>{w}</div>)}
                      {result.variables && Object.keys(result.variables).length > 0 && (
                        <>
                          <div className="cfg-sub">Valores que alimentam as fórmulas</div>
                          <table className="cfg-table">
                            <tbody>
                              {Object.entries(result.variables).map(([name, value]) => (
                                <tr key={name}><td>{name}</td><td className="num">{value}</td></tr>
                              ))}
                            </tbody>
                          </table>
                        </>
                      )}
                      {result.structure && (
                        <>
                          <div className="cfg-sub">
                            Estrutura resolvida — {result.structure.total_nodes} componente(s) em {result.structure.total_levels} nível(is)
                          </div>
                          <table className="cfg-table">
                            <thead><tr><th>Componente</th><th className="num">Qtde.</th><th>UM</th></tr></thead>
                            <tbody>
                              {result.structure.components.map((node, i) => {
                                const c = node.component as Record<string, unknown>;
                                return (
                                  <tr key={i}>
                                    <td>{String(c["child_item_code"] ?? "")} — {String(c["child_description"] ?? "")}</td>
                                    <td className="num">{String(c["effective_quantity"] ?? c["quantity"] ?? "")}</td>
                                    <td>{String(c["unit_of_measurement"] ?? "")}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </>
                      )}
                      {result.persisted && result.mask && (
                        <button className="cfg-btn cfg-btn-primary cfg-w100" onClick={() => onUseMask(result.mask)}>
                          Usar esta configuração na estrutura
                        </button>
                      )}
                    </div>
                  </section>
                )}

                {panel.formulas.length > 0 && (
                  <section className="cfg-card">
                    <div className="cfg-card-head">
                      Quantidades por fórmula
                      <span className="cfg-count">{panel.formulas.length}</span>
                    </div>
                    <div className="cfg-card-body">
                      {panel.formulas.map((f) => (
                        <div className="cfg-formula" key={f.child_code}>
                          <div className="cfg-formula-item">{f.child_code} — {f.child_description}</div>
                          <code className="cfg-formula-exp">{f.formula}</code>
                          <div className="cfg-formula-meta">
                            Unidade {f.unit_of_measurement} · {f.quantity_scale} casa(s) · arredondamento {f.quantity_rounding || "padrão"}
                            {f.variables.length > 0 && ` · usa ${f.variables.join(", ")}`}
                          </div>
                        </div>
                      ))}
                      {(panel.missing_formula_variables ?? []).length > 0 && (
                        <div className="cfg-alert warn">
                          Sem pergunta cadastrada para: {(panel.missing_formula_variables ?? []).join(", ")}. Enquanto faltar,
                          a fórmula que depende dessas variáveis não consegue calcular a quantidade.
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {panel.masks.length > 0 && (
                  <section className="cfg-card">
                    <div className="cfg-card-head">
                      Configurações já geradas
                      <span className="cfg-count">{panel.masks.length}</span>
                    </div>
                    <div className="cfg-card-body">
                      <table className="cfg-table">
                        <thead><tr><th>Máscara</th><th>Origem</th><th /></tr></thead>
                        <tbody>
                          {panel.masks.map((m) => (
                            <tr key={m.id}>
                              <td>{m.mask}</td>
                              <td>{m.answered ? "Configurador" : "Propagação"}</td>
                              <td><button className="cfg-btn cfg-btn-sm" onClick={() => onUseMask(m.mask)}>Usar</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </aside>
            </div>
          )}
        </div>

        {!loading && panel?.configurable && (
          <footer className="cfg-foot">
            <span className="cfg-foot-hint">
              {pending.length > 0
                ? `${pending.length} pergunta(s) obrigatória(s) sem resposta.`
                : "Simule para conferir a máscara antes de gravar."}
            </span>
            <div className="cfg-foot-actions">
              <button className="cfg-btn" onClick={() => void run(false)} disabled={busy}>
                {busy ? "Processando…" : "Simular"}
              </button>
              <button className="cfg-btn cfg-btn-primary" onClick={() => void run(true)} disabled={busy || pending.length > 0}>
                Gravar configuração
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}

const CFG_STYLES = `
.cfg-backdrop { position: fixed; inset: 0; z-index: 21000; display: grid; place-items: center; padding: 20px; background: rgba(13,31,20,.5); }
.cfg-modal { display: flex; flex-direction: column; width: min(1080px, 96vw); max-height: 92vh; background: #fff; border: 1px solid #cadfc4; border-radius: 12px; box-shadow: 0 18px 44px rgba(13,31,20,.28); overflow: hidden; font-family: 'Inter', sans-serif; color: #1c2b22; }
.cfg-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 13px 18px; background: #16281d; color: #dff0e2; flex-shrink: 0; }
.cfg-head-title { font-size: 13px; font-weight: 600; }
.cfg-head-sub { font-size: 11.5px; color: #8fb79c; margin-top: 2px; }
.cfg-head-right { display: flex; align-items: center; gap: 8px; }
.cfg-body { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 18px; background: #f4f8f2; display: flex; flex-direction: column; gap: 12px; }
.cfg-split { display: grid; grid-template-columns: minmax(0,1.15fr) minmax(0,1fr); gap: 12px; align-items: start; }
@media (max-width: 900px) { .cfg-split { grid-template-columns: 1fr; } }
.cfg-side { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.cfg-card { background: #fff; border: 1px solid #dbe8d5; border-radius: 10px; overflow: hidden; min-width: 0; }
.cfg-card-head { display: flex; align-items: center; gap: 8px; padding: 9px 14px; background: #fafcf9; border-bottom: 1px solid #edf5e8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: #253a2d; }
.cfg-count { font-size: 10.5px; font-weight: 600; color: #2f7d47; background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 10px; padding: 1px 7px; }
.cfg-card-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 11px; }
.cfg-field { display: flex; flex-direction: column; gap: 5px; padding: 9px 10px; border: 1px solid #edf5e8; border-radius: 8px; background: #fcfefb; }
.cfg-field.violated { border-color: #e3a0a0; background: #fff6f6; }
.cfg-label { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 11.5px; font-weight: 600; color: #33473a; }
.cfg-req { color: #c84040; }
.cfg-type { font-size: 10px; font-weight: 500; color: #7a9a84; background: #f0f6ec; border-radius: 8px; padding: 1px 6px; }
.cfg-chip { font-size: 10.5px; font-weight: 500; color: #2f7d47; background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 10px; padding: 2px 8px; }
.cfg-chip.sm { font-size: 9.5px; padding: 1px 6px; }
.cfg-input { height: 32px; border: 1.5px solid #d4e8cc; border-radius: 7px; background: #fff; padding: 0 9px; font-family: 'Inter', sans-serif; font-size: 12.5px; color: #1c2b22; outline: none; width: 100%; }
.cfg-input:focus { border-color: #2f7d47; box-shadow: 0 0 0 2px rgba(62,150,84,.1); }
.cfg-input.num { text-align: right; }
.cfg-checks { display: flex; flex-wrap: wrap; gap: 8px 14px; }
.cfg-check { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #33473a; }
.cfg-empty, .cfg-note { padding: 14px; text-align: center; font-size: 12.5px; color: #6b7d71; background: #fff; border: 1px dashed #cadfc4; border-radius: 10px; }
.cfg-alert { border-radius: 8px; padding: 9px 12px; font-size: 12px; line-height: 1.5; }
.cfg-alert.err { background: #fff0f0; border: 1px solid #f0c8c8; color: #8e2f2f; }
.cfg-alert.warn { background: #fff8e8; border: 1px solid #f0d99a; color: #7a5a10; }
.cfg-alert ul { margin: 6px 0 0 16px; }
.cfg-mask { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 15px; font-weight: 600; color: #1e6030; background: #eef7ea; border: 1px solid #c4dfc8; border-radius: 8px; padding: 9px 12px; text-align: center; overflow-wrap: anywhere; }
.cfg-sub { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #6b7d71; }
.cfg-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.cfg-table th { text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: #6b7d71; padding: 5px 8px; border-bottom: 1.5px solid #dbe8d5; }
.cfg-table td { padding: 5px 8px; border-bottom: 1px solid #f0f6ec; overflow-wrap: anywhere; }
.cfg-table .num { text-align: right; }
.cfg-formula { display: flex; flex-direction: column; gap: 3px; padding: 9px 10px; border: 1px solid #edf5e8; border-radius: 8px; background: #fcfefb; }
.cfg-formula-item { font-size: 12px; font-weight: 600; color: #33473a; }
.cfg-formula-exp { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; color: #1e6030; background: #f0f6ec; border-radius: 6px; padding: 4px 7px; overflow-wrap: anywhere; }
.cfg-formula-meta { font-size: 10.5px; color: #7a9a84; }
.cfg-foot { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 11px 18px; background: #fafcf9; border-top: 1px solid #dbe8d5; flex-shrink: 0; flex-wrap: wrap; }
.cfg-foot-hint { font-size: 11.5px; color: #6b7d71; }
.cfg-foot-actions { display: flex; gap: 8px; }
.cfg-btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 13px; border: 1.5px solid #d4e8d0; border-radius: 7px; background: #fff; font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 500; color: #46574c; cursor: pointer; white-space: nowrap; }
.cfg-btn:hover:not(:disabled) { background: #f0f8ec; border-color: #a9b6ac; }
.cfg-btn:disabled { opacity: .5; cursor: not-allowed; }
.cfg-btn-primary { background: #16281d; border-color: #16281d; color: #dff0e2; }
.cfg-btn-primary:hover:not(:disabled) { background: #1e3728; }
.cfg-btn-ghost { background: transparent; border-color: rgba(255,255,255,.25); color: #dff0e2; }
.cfg-btn-ghost:hover:not(:disabled) { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.4); }
.cfg-btn-sm { height: 26px; padding: 0 9px; font-size: 11.5px; }
.cfg-w100 { width: 100%; justify-content: center; }
`;

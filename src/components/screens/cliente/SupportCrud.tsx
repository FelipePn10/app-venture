import { useState, useEffect, useCallback } from "react";
import { enumLabel } from "@/utils/enumLabels";
import { listSupport, createSupport, updateSupport, deleteSupport, setSupportActive } from "@/services/customerService";
import { confirmar } from "@/components/ui/dialogos";
import { errMessage, parseStr, parseNum, parseBool, type Obj } from "@/services/fiscalShared";

/**
 * CRUD genérico para os cadastros de apoio de cliente
 * (`/api/customers/support/{resource}`), dirigido por especificação de campos.
 * Renderiza um formulário (criar/editar) + tabela de registros. É embutido nos
 * cadastros de apoio do cliente (VCLI0500), da condição de pagamento (VFIN0110) e do
 * cabeçalho das tabelas de venda (VCST0202).
 */

export interface FieldSpec {
  key: string;
  label: string;
  col?: number;
  required?: boolean;
  /** "date": campo de data; envia o dia como data e hora UTC (AAAA-MM-DDT00:00:00Z), que é o que a API espera nesses cadastros. */
  kind?: "text" | "number" | "bool" | "select" | "textarea" | "date";
  options?: string[];
  placeholder?: string;
  /** Valor do campo em cadastro novo. */
  padrao?: boolean | string;
}

export interface ColumnSpec {
  key: string;
  label: string;
  kind?: "bool" | "number" | "enum";
}

interface Props {
  resource: string;
  fields: FieldSpec[];
  columns: ColumnSpec[];
  title?: string;
  editable?: boolean;
  /** Mostra "Excluir" (o backend recusa o registro em uso e diz onde). */
  deletable?: boolean;
  /** O cadastro tem situação: mostra inativos e o botão Inativar/Reativar. */
  inativavel?: boolean;
  /**
   * Campos que a tela não mostra, mas o servidor regrava por inteiro na
   * alteração: vão com o valor que o registro já tinha, para não serem zerados.
   */
  preservar?: string[];
}

type FormState = Record<string, unknown>;

function initForm(fields: FieldSpec[]): FormState {
  const f: FormState = {};
  for (const fs of fields) f[fs.key] = fs.padrao ?? (fs.kind === "bool" ? false : "");
  return f;
}

export function SupportCrud({ resource, fields, columns, title, editable = false, deletable = false, inativavel = false, preservar = [] }: Props): JSX.Element {
  const [list, setList] = useState<Obj[]>([]);
  const [form, setForm] = useState<FormState>(() => initForm(fields));
  const [editingCode, setEditingCode] = useState<number | null>(null);
  const [original, setOriginal] = useState<Obj | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listSupport(resource, inativavel)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar registros.") }); }
    finally { setBusy(false); }
  }, [resource, inativavel]);
  useEffect(() => { void reload(); }, [reload]);

  function set(key: string, value: unknown) { setForm((p) => ({ ...p, [key]: value })); setFeedback(null); }
  function novo() { setForm(initForm(fields)); setEditingCode(null); setOriginal(null); setFeedback(null); }

  function buildPayload(): FormState {
    const out: FormState = {};
    if (original) for (const k of preservar) if (original[k] !== undefined && original[k] !== null) out[k] = original[k];
    for (const fs of fields) {
      const v = form[fs.key];
      if (fs.kind === "number") out[fs.key] = v === "" || v === undefined ? undefined : Number(v);
      else if (fs.kind === "bool") out[fs.key] = !!v;
      else if (fs.kind === "date") out[fs.key] = v ? `${String(v).slice(0, 10)}T00:00:00Z` : undefined;
      else out[fs.key] = v === "" ? undefined : v;
    }
    return out;
  }

  async function salvar() {
    for (const fs of fields) {
      if (fs.required && (form[fs.key] === "" || form[fs.key] === undefined)) {
        setFeedback({ type: "error", message: `${fs.label} é obrigatório.` });
        return;
      }
    }
    setBusy(true); setFeedback(null);
    try {
      const payload = buildPayload();
      if (editingCode !== null) await updateSupport(resource, { ...payload, code: editingCode });
      else await createSupport(resource, payload);
      setFeedback({ type: "success", message: editingCode !== null ? "Registro atualizado." : "Registro criado." });
      novo();
      await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); }
  }

  async function excluir(rec: Obj) {
    const code = parseNum(rec, "code", "Code");
    if (!code) return;
    const ok = await confirmar({ titulo: "Excluir registro", mensagem: inativavel ? "Só é possível excluir o que nunca foi usado; em uso, inative." : "Só é possível excluir o que nunca foi usado.", assunto: `${code} — ${parseStr(rec, "description", "Description")}`, rotulo: "Excluir", tom: "perigo" });
    if (!ok) return;
    setBusy(true); setFeedback(null);
    try { await deleteSupport(resource, code); if (editingCode === code) novo(); setFeedback({ type: "success", message: "Registro excluído." }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); }
  }

  async function alternarSituacao(rec: Obj) {
    const code = parseNum(rec, "code", "Code");
    if (!code) return;
    const ativo = rec["is_active"] !== false;
    setBusy(true); setFeedback(null);
    try {
      await setSupportActive(resource, code, !ativo);
      setFeedback({ type: "success", message: ativo ? "Registro inativado: não aparece mais para escolha, o histórico continua." : "Registro reativado." });
      await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); }
  }

  function edit(rec: Obj) {
    const f: FormState = {};
    for (const fs of fields) {
      const pascal = fs.key.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
      f[fs.key] = fs.kind === "bool" ? parseBool(rec, fs.key, pascal)
        : fs.kind === "number" ? (parseNum(rec, fs.key, pascal) || "")
        : fs.kind === "date" ? parseStr(rec, fs.key, pascal).slice(0, 10)
        : parseStr(rec, fs.key, pascal);
    }
    setForm(f);
    setOriginal(rec);
    setEditingCode(parseNum(rec, "code", "Code", "id", "ID") || null);
    setFeedback(null);
  }

  return (
    <div className="erp-fieldset">
      {title && <div className="erp-fieldset-head">{title}</div>}
      <div className="erp-fieldset-body">
        {feedback && <div className="erp-field erp-c12"><div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div></div>}

        {fields.map((fs) => (
          <div key={fs.key} className={`erp-field erp-c${fs.col ?? 4}`}>
            <label className={`erp-label ${fs.required ? "erp-req" : ""}`}>{fs.label}</label>
            {fs.kind === "bool" ? (
              <div className="erp-toggle-row">
                <label className="erp-toggle">
                  <input type="checkbox" checked={!!form[fs.key]} onChange={(e) => set(fs.key, e.target.checked)} />
                  <div className="erp-toggle-track" /><div className="erp-toggle-thumb" />
                </label>
                <span className="erp-toggle-label">{form[fs.key] ? "Sim" : "Não"}</span>
              </div>
            ) : fs.kind === "select" ? (
              <select className="erp-input" value={String(form[fs.key] ?? "")} onChange={(e) => set(fs.key, e.target.value)}>
                <option value="">—</option>
                {(fs.options ?? []).map((o) => <option key={o} value={o}>{enumLabel(o)}</option>)}
              </select>
            ) : fs.kind === "textarea" ? (
              <textarea className="erp-textarea" value={String(form[fs.key] ?? "")} placeholder={fs.placeholder} onChange={(e) => set(fs.key, e.target.value)} />
            ) : (
              <input
                className={`erp-input ${fs.kind === "number" ? "num" : ""}`}
                type={fs.kind === "number" ? "number" : fs.kind === "date" ? "date" : "text"}
                value={String(form[fs.key] ?? "")}
                placeholder={fs.placeholder}
                onChange={(e) => set(fs.key, e.target.value)}
              />
            )}
          </div>
        ))}
        <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>
            {busy ? "..." : editingCode !== null ? "Atualizar" : "Adicionar"}
          </button>
          {editingCode !== null && <button className="erp-btn" onClick={novo} disabled={busy}>Cancelar edição</button>}
        </div>

        <div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead>
              <tr>
                {columns.map((c) => <th key={c.key}>{c.label}</th>)}
                {inativavel && <th>Situação</th>}
                {(editable || deletable) && <th style={{ width: inativavel ? 220 : 140 }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={columns.length + (editable || deletable ? 1 : 0) + (inativavel ? 1 : 0)} className="erp-grid-empty">Nenhum registro cadastrado.</td></tr>}
              {list.map((rec, i) => (
                <tr key={i} style={rec["is_active"] === false ? { opacity: 0.6 } : undefined}>
                  {columns.map((c) => (
                    <td key={c.key}>
                      {c.kind === "bool" ? (parseBool(rec, c.key) ? "Sim" : "Não") : c.kind === "number" ? parseNum(rec, c.key) : c.kind === "enum" ? enumLabel(parseStr(rec, c.key)) : parseStr(rec, c.key)}
                    </td>
                  ))}
                  {inativavel && <td>{rec["is_active"] === false ? <span className="erp-badge gray">Inativo</span> : <span className="erp-badge ok">Ativo</span>}</td>}
                  {(editable || deletable) && <td><div style={{ display: "flex", gap: 6 }}>
                    {editable && <button className="erp-btn erp-btn-sm" onClick={() => edit(rec)}>Editar</button>}
                    {inativavel && <button className="erp-btn erp-btn-sm" onClick={() => void alternarSituacao(rec)} disabled={busy}>{rec["is_active"] === false ? "Reativar" : "Inativar"}</button>}
                    {deletable && <button className="erp-btn erp-btn-sm" onClick={() => void excluir(rec)} disabled={busy}>Excluir</button>}
                  </div></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

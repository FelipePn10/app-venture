import { useState, useEffect, useCallback } from "react";
import { listSupport, createSupport, updateSupport } from "@/services/customerService";
import { errMessage, parseStr, parseNum, parseBool, type Obj } from "@/services/fiscalShared";

/**
 * CRUD genérico para os cadastros de apoio de cliente
 * (`/api/customers/support/{resource}`), dirigido por especificação de campos.
 * Renderiza um formulário (criar/editar) + tabela de registros. É embutido nas
 * abas das telas VCLI0510/0520/0530.
 */

export interface FieldSpec {
  key: string;
  label: string;
  col?: number;
  required?: boolean;
  kind?: "text" | "number" | "bool" | "select" | "textarea";
  options?: string[];
  placeholder?: string;
}

export interface ColumnSpec {
  key: string;
  label: string;
  kind?: "bool" | "number";
}

interface Props {
  resource: string;
  fields: FieldSpec[];
  columns: ColumnSpec[];
  title?: string;
}

type FormState = Record<string, unknown>;

function initForm(fields: FieldSpec[]): FormState {
  const f: FormState = {};
  for (const fs of fields) f[fs.key] = fs.kind === "bool" ? false : "";
  return f;
}

export function SupportCrud({ resource, fields, columns, title }: Props): JSX.Element {
  const [list, setList] = useState<Obj[]>([]);
  const [form, setForm] = useState<FormState>(() => initForm(fields));
  const [editingCode, setEditingCode] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listSupport(resource)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar registros.") }); }
    finally { setBusy(false); }
  }, [resource]);
  useEffect(() => { void reload(); }, [reload]);

  function set(key: string, value: unknown) { setForm((p) => ({ ...p, [key]: value })); setFeedback(null); }
  function novo() { setForm(initForm(fields)); setEditingCode(null); setFeedback(null); }

  function buildPayload(): FormState {
    const out: FormState = {};
    for (const fs of fields) {
      const v = form[fs.key];
      if (fs.kind === "number") out[fs.key] = v === "" || v === undefined ? undefined : Number(v);
      else if (fs.kind === "bool") out[fs.key] = !!v;
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

  function edit(rec: Obj) {
    const f: FormState = {};
    for (const fs of fields) {
      f[fs.key] = fs.kind === "bool" ? parseBool(rec, fs.key) : (rec[fs.key] ?? "");
    }
    setForm(f);
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
                {(fs.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : fs.kind === "textarea" ? (
              <textarea className="erp-textarea" value={String(form[fs.key] ?? "")} placeholder={fs.placeholder} onChange={(e) => set(fs.key, e.target.value)} />
            ) : (
              <input
                className={`erp-input ${fs.kind === "number" ? "num" : ""}`}
                type={fs.kind === "number" ? "number" : "text"}
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
                <th style={{ width: 70 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={columns.length + 1} className="erp-grid-empty">Nenhum registro cadastrado.</td></tr>}
              {list.map((rec, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.key}>
                      {c.kind === "bool" ? (parseBool(rec, c.key) ? "Sim" : "Não") : c.kind === "number" ? parseNum(rec, c.key) : parseStr(rec, c.key)}
                    </td>
                  ))}
                  <td><button className="erp-btn erp-btn-sm" onClick={() => edit(rec)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

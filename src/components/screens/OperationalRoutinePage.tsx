import { useMemo, useState } from "react";
import { ExportButton } from "@/components/ui/ExportButton";
import { currentUserId, errMessage, httpClient, unwrapObject, type Obj } from "@/services/fiscalShared";
import { useAuthStore } from "@/store/authStore";

export type RoutineField = {
  name: string;
  label: string;
  type?: "text" | "password" | "number" | "date" | "datetime-local" | "checkbox" | "textarea" | "json" | "file-text" | "file-base64";
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | boolean;
  help?: string;
  accept?: string;
};

export type RoutineOperation = {
  label: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  fields?: RoutineField[];
  query?: string[];
  adminOnly?: boolean;
  destructive?: boolean;
  submitLabel?: string;
  downloadFilename?: string;
};

export type OperationalRoutine = {
  code: string;
  title: string;
  description: string;
  guidance: string;
  operations: RoutineOperation[];
};

function roleFromToken(token: string | null): string | undefined {
  const payload = token?.split('.')[1];
  if (!payload) return undefined;
  try {
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>;
    const role = claims.role ?? claims.perfil ?? claims.type;
    return typeof role === 'string' ? role.toUpperCase() : undefined;
  } catch { return undefined; }
}

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

const ENUM_OPTIONS: Record<string, string[]> = {
  status: ["DRAFT", "ACTIVE", "INACTIVE", "SCHEDULED", "ARRIVED", "IN_CONFERENCE", "RELEASED", "BLOCKED", "CANCELLED", "APPROVED", "OBSOLETE"],
  direction: ["INBOUND", "OUTBOUND"], message_type: ["PO_CONFIRMATION", "ASN", "INVOICE"],
  apportion_basis: ["VALUE", "QUANTITY", "WEIGHT"], value_type: ["PERCENT", "FIXED", "TEXT", "NUMBER", "BOOLEAN"],
  tolerance_type: ["QUANTITY", "ITEM_PRICE", "TOTAL_VALUE"], applies_to: ["INVOICE", "RECEIVING_NOTICE", "ALL"], action: ["WARN", "BLOCK", "ALLOW"],
  bom_type: ["EBOM", "MBOM"], movement_type: ["SHIPMENT", "RETURN", "RECEIPT", "ADJUSTMENT"],
  part_type: ["CARACTER", "DATA", "SEQ_NUMERICA", "SEQ_CARACTER"],
  type: ["CAMPO", "DESENHO", "ESCOLHA", "FORMULA", "INF_CARACTER", "INF_NUMERICA", "ESCOLHA_MULT"],
};

const LABELS: Record<string, string> = {
  id: "Código", item_code: "Item", supplier_code: "Fornecedor", purchase_order_code: "Pedido de compra",
  purchase_order_item_code: "Linha do pedido", enterprise_code: "Empresa", warehouse_id: "Almoxarifado",
  description: "Descrição", notes: "Observações", status: "Situação", mask: "Máscara", quantity: "Quantidade",
  code: "Código", sequence: "Sequência", starts_at: "Início", ends_at: "Fim", start_from: "Iniciar em",
  valid_from: "Vigência inicial", valid_to: "Vigência final", reference_date: "Data de referência",
  __body: "Dados da operação",
};

function humanLabel(key: string): string {
  return LABELS[key] ?? key.split("_").map((part) => part ? part[0].toUpperCase() + part.slice(1) : part).join(" ");
}

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

function updateNested(root: unknown, path: Array<string | number>, value: unknown): unknown {
  const next = clone(root);
  let cursor = next as Record<string | number, unknown>;
  path.slice(0, -1).forEach((part) => { cursor = cursor[part] as Record<string | number, unknown>; });
  cursor[path[path.length - 1]] = value;
  return next;
}

function PayloadNode({ name, value, path, root, onChange }: { name: string; value: unknown; path: Array<string | number>; root: unknown; onChange: (next: unknown) => void }): JSX.Element {
  if (Array.isArray(value)) return <div className="fsc-col-12" style={{ border: "1px solid #dbe5df", borderRadius: 6, padding: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><strong className="fsc-label">{humanLabel(name)} ({value.length})</strong>
      <button type="button" className="fsc-btn fsc-btn-ghost fsc-btn-sm" onClick={() => onChange(updateNested(root, path, [...value, value.length ? clone(value[0]) : {}]))}>+ Adicionar</button></div>
    {value.length === 0 && <div className="fsc-empty">Nenhum registro. Clique em Adicionar.</div>}
    {value.map((item, index) => <div key={index} className="fsc-card" style={{ marginBottom: 8 }}><div className="fsc-card-body">
      <div style={{ display: "flex", justifyContent: "space-between" }}><span className="fsc-action-label">{humanLabel(name)} {index + 1}</span><button type="button" className="fsc-btn fsc-btn-ghost fsc-btn-sm" onClick={() => onChange(updateNested(root, path, value.filter((_, itemIndex) => itemIndex !== index)))}>Remover</button></div>
      <PayloadNode name={String(index)} value={item} path={[...path, index]} root={root} onChange={onChange}/>
    </div></div>)}
  </div>;
  if (value && typeof value === "object") return <div className="fsc-grid" style={{ width: "100%" }}>{Object.entries(value as Obj).map(([key, child]) => <PayloadNode key={key} name={key} value={child} path={[...path, key]} root={root} onChange={onChange}/>)}</div>;
  const options = ENUM_OPTIONS[name];
  return <div className="fsc-field fsc-col-3"><label className="fsc-label">{humanLabel(name)}</label>
    {typeof value === "boolean" ? <label className="fsc-label" style={{ display: "flex", gap: 7, alignItems: "center", minHeight: 30 }}><input type="checkbox" checked={value} onChange={(event) => onChange(updateNested(root, path, event.target.checked))}/> Sim</label>
      : options ? <select className="fsc-input" value={String(value ?? "")} onChange={(event) => onChange(updateNested(root, path, event.target.value))}><option value="">Selecione…</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
      : <input className={`fsc-input ${typeof value === "number" ? "fsc-input-right" : ""}`} type={typeof value === "number" ? "number" : name.includes("date") || name.endsWith("_on") ? "date" : "text"} value={String(value ?? "")} onChange={(event) => onChange(updateNested(root, path, typeof value === "number" ? Number(event.target.value) : event.target.value))}/>} 
  </div>;
}

function StructuredPayloadEditor({ raw, onChange }: { raw: string; onChange: (raw: string) => void }): JSX.Element {
  let parsed: unknown;
  try { parsed = JSON.parse(raw || "{}"); } catch { return <div className="fsc-feedback error">O modelo desta operação contém dados inválidos.</div>; }
  return <PayloadNode name="dados" value={parsed} path={[]} root={parsed} onChange={(next) => onChange(JSON.stringify(next))}/>;
}

function initialValues(operation: RoutineOperation): Record<string, string | boolean> {
  return Object.fromEntries((operation.fields ?? []).map((field) => [field.name, field.defaultValue ?? (field.type === "checkbox" ? false : field.type === "json" ? field.placeholder ?? "{}" : "")]));
}

function normalizeValue(field: RoutineField, raw: string | boolean): unknown {
  if (field.type === "checkbox") return Boolean(raw);
  if (field.type === "number") return raw === "" ? undefined : Number(raw);
  if (field.type === "json") {
    if (!String(raw).trim()) return undefined;
    return JSON.parse(String(raw).split("UUID_DO_USUARIO").join(currentUserId()));
  }
  if (field.type === "datetime-local" && raw) return new Date(String(raw)).toISOString();
  return raw === "" ? undefined : raw;
}

function displayRows(raw: unknown): Obj[] {
  if (Array.isArray(raw)) return raw.filter((item): item is Obj => Boolean(item) && typeof item === "object");
  if (raw && typeof raw === "object") {
    const source = raw as Obj;
    for (const key of ["data", "items", "results", "list", "records", "rows", "content"]) {
      const array = source[key];
      if (Array.isArray(array)) return array.filter((item): item is Obj => Boolean(item) && typeof item === "object");
    }
  }
  const object = unwrapObject(raw);
  return Object.keys(object).length ? [object] : [];
}

function cell(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function OperationalRoutinePage({ routine }: { routine: OperationalRoutine }): JSX.Element {
  const token = useAuthStore((state) => state.token);
  const userRole = useAuthStore((state) => state.user?.role)?.toUpperCase() ?? roleFromToken(token);
  const [operationIndex, setOperationIndex] = useState(0);
  const operation = routine.operations[operationIndex];
  const [valuesByOperation, setValuesByOperation] = useState<Record<number, Record<string, string | boolean>>>({});
  const values = valuesByOperation[operationIndex] ?? initialValues(operation);
  const [result, setResult] = useState<unknown>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => displayRows(result), [result]);
  const columns = useMemo(() => {
    const keys = new Set<string>();
    rows.slice(0, 20).forEach((row) => Object.keys(row).slice(0, 10).forEach((key) => keys.add(key)));
    return [...keys].slice(0, 10);
  }, [rows]);

  const setValue = (name: string, value: string | boolean) => {
    setValuesByOperation((current) => ({ ...current, [operationIndex]: { ...values, [name]: value } }));
  };

  const execute = async () => {
    if (operation.adminOnly && userRole !== "ADMIN") {
      setFeedback({ type: "error", message: "Esta operação exige o perfil ADMIN." });
      return;
    }
    setBusy(true); setFeedback(null);
    try {
      let path = operation.path;
      const body: Record<string, unknown> = {};
      const params: Record<string, unknown> = {};
      for (const field of operation.fields ?? []) {
        const raw = values[field.name] ?? "";
        if (field.required && (raw === "" || raw == null)) throw new Error(`O campo ${field.label} é obrigatório.`);
        const value = normalizeValue(field, raw);
        const token = `{${field.name}}`;
        if (path.includes(token)) path = path.split(token).join(encodeURIComponent(String(value ?? "")));
        else if (operation.query?.includes(field.name)) {
          if (value !== undefined) params[field.name] = value;
        } else if (field.name === "__body" && value && typeof value === "object") Object.assign(body, value);
        else if (value !== undefined) body[field.name] = value;
      }
      if (operation.destructive && !window.confirm(`Confirma a operação “${operation.label}”?`)) return;
      const response = await httpClient.request({ method: operation.method, url: path, params, data: operation.method === "GET" ? undefined : body, responseType: operation.downloadFilename ? "blob" : "json" });
      if (operation.downloadFilename) {
        const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a"); anchor.href = url; anchor.download = operation.downloadFilename; anchor.click();
        URL.revokeObjectURL(url);
        setResult({ arquivo: operation.downloadFilename, tamanho_bytes: blob.size });
        setFeedback({ type: "success", message: `${operation.label} concluída; arquivo gerado.` });
        return;
      }
      setResult(response.data);
      setFeedback({ type: "success", message: `${operation.label} concluída com sucesso.` });
    } catch (error) {
      setFeedback({ type: "error", message: errMessage(error) });
    } finally { setBusy(false); }
  };

  return <div className="fsc-root">
    <header className="fsc-topbar"><div className="fsc-topbar-left">
      <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18"><rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,.9)"/><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,.4)"/><rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,.4)"/><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,.7)"/></svg></div>
      <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
      <span className="fsc-screen-title">{routine.code} — {routine.title}</span>
    </div></header>
    <div className="fsc-actionbar">
      <div className="fsc-action-group"><span className="fsc-action-label">Operação</span>
        <select className="fsc-input" value={operationIndex} onChange={(event) => { setOperationIndex(Number(event.target.value)); setResult(null); setFeedback(null); }}>
          {routine.operations.map((item, index) => <option key={`${item.method}-${item.path}`} value={index}>{item.label}</option>)}
        </select>
      </div>
      <div className="fsc-action-group"><button className="fsc-btn fsc-btn-primary" onClick={execute} disabled={busy || (operation.adminOnly && userRole !== "ADMIN")} title={operation.adminOnly && userRole !== "ADMIN" ? "Operação exclusiva do perfil ADMIN" : undefined}>{busy ? "Processando…" : operation.submitLabel ?? operation.label}</button></div>
      <div className="fsc-action-group"><ExportButton title={`${routine.code} — ${routine.title}`} filename={routine.code.toLowerCase()} /></div>
    </div>
    <div className="fsc-body">
      {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
      <div className="fsc-section-banner"><span className="fsc-section-banner-pill">{operation.label}</span><div className="fsc-section-banner-line"/><span className="fsc-section-banner-hint">{operation.method} {operation.path}{operation.adminOnly ? " · requer administrador" : ""}</span></div>
      <div className="fsc-card"><div className="fsc-card-body">
        <p style={{ marginTop: 0, color: "var(--fsc-text-muted, #64748b)", fontSize: 12 }}>{routine.description} {routine.guidance}</p>
        <div className="fsc-grid">{(operation.fields ?? []).map((field) => <div className={`fsc-field ${field.type === "textarea" || field.type === "json" || field.type === "file-text" || field.type === "file-base64" ? "fsc-col-12" : "fsc-col-3"}`} key={field.name}>
          <label className={`fsc-label ${field.required ? "fsc-label-req" : ""}`}>{field.label}</label>
          {field.type === "checkbox" ? <label className="fsc-label" style={{ display: "flex", gap: 7, alignItems: "center", minHeight: 30 }}><input type="checkbox" checked={Boolean(values[field.name])} onChange={(event) => setValue(field.name, event.target.checked)}/> Sim</label>
            : field.type === "json" ? <StructuredPayloadEditor raw={String(values[field.name] || field.placeholder || "{}")} onChange={(next) => setValue(field.name, next)}/>
            : field.type === "file-text" ? <input className="fsc-input" type="file" accept={field.accept} onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) { setValue(field.name, ""); return; }
              const reader = new FileReader();
              reader.onload = () => setValue(field.name, String(reader.result ?? ""));
              reader.onerror = () => setFeedback({ type: "error", message: `Não foi possível ler o arquivo ${file.name}.` });
              reader.readAsText(file);
            }}/>
            : field.type === "file-base64" ? <input className="fsc-input" type="file" accept={field.accept} onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) { setValue(field.name, ""); return; }
              const reader = new FileReader();
              reader.onload = () => setValue(field.name, String(reader.result ?? "").split(",", 2)[1] ?? "");
              reader.onerror = () => setFeedback({ type: "error", message: `Não foi possível ler o arquivo ${file.name}.` });
              reader.readAsDataURL(file);
            }}/>
            : field.type === "textarea" ? <textarea className="fsc-input" rows={3} value={String(values[field.name] ?? "")} placeholder={field.placeholder} onChange={(event) => setValue(field.name, event.target.value)}/>
            : <input className={`fsc-input ${field.type === "number" ? "fsc-input-right" : ""}`} type={field.type ?? "text"} value={String(values[field.name] ?? "")} placeholder={field.placeholder} onChange={(event) => setValue(field.name, event.target.value)}/>} 
          {field.help && <span style={{ fontSize: 10, color: "#64748b" }}>{field.help}</span>}
        </div>)}</div>
        {(operation.fields ?? []).length === 0 && <div className="fsc-empty">Esta operação não exige parâmetros.</div>}
      </div></div>
      <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Resultado ({rows.length})</span><div className="fsc-section-banner-line"/></div>
      <div className="fsc-card"><div className="fsc-results-wrap"><table className="fsc-table"><thead><tr>{columns.map((column) => <th key={column}>{column.split("_").join(" ")}</th>)}</tr></thead><tbody>
        {rows.length === 0 && <tr><td className="fsc-empty">Execute uma operação para visualizar o resultado.</td></tr>}
        {rows.map((row, index) => <tr key={String(row.id ?? row.code ?? index)}>{columns.map((column) => <td key={column} title={cell(row[column])}>{cell(row[column]).slice(0, 100)}</td>)}</tr>)}
      </tbody></table></div></div>
    </div>
    <footer className="fsc-footer"><div className="fsc-footer-left"><div className="fsc-footer-stat">Registros: <strong>{rows.length}</strong></div></div><div className="fsc-footer-stat">GRUPO VENTURE LTDA</div></footer>
  </div>;
}

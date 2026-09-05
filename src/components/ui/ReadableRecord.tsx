import { fieldLabel } from "@/utils/fieldLabels";
import { enumLabel } from "@/utils/enumLabels";

/**
 * Mostra um registro vindo da API como tabela legível, no lugar do JSON cru.
 *
 * Serve para os retornos que a tela não modela campo a campo (genealogia de
 * lote, programa de corte, resultado de pipeline). O usuário do ERP não lê
 * JSON: aqui ele vê rótulo em português e valor formatado, com listas
 * viradas em sub-tabelas.
 */

type Props = {
  value: unknown;
  /** Título opcional acima da tabela. */
  title?: string;
  /** Texto quando não há nada a mostrar. */
  emptyLabel?: string;
};

const DATA_ISO = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?)?/;

/** Formata um valor escalar para leitura. */
function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return String(value);
  const text = String(value);
  if (DATA_ISO.test(text)) {
    const d = new Date(text);
    if (!Number.isNaN(d.getTime())) {
      return text.length > 10
        ? d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
        : d.toLocaleDateString("pt-BR");
    }
  }
  // Enums em caixa alta ganham rótulo em português.
  if (/^[A-Z][A-Z0-9_]{2,}$/.test(text)) return enumLabel(text);
  return text;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === "object" && !Array.isArray(v);

/** Uma lista de objetos vira tabela com uma coluna por campo. */
function ObjectTable({ rows }: { rows: Record<string, unknown>[] }): JSX.Element {
  const colunas = [...new Set(rows.flatMap((r) => Object.keys(r)))]
    .filter((k) => rows.some((r) => !isObject(r[k]) && !Array.isArray(r[k])));
  return (
    <div className="erp-grid-wrap">
      <table className="erp-grid">
        <thead><tr>{colunas.map((c) => <th key={c}>{fieldLabel(c)}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{colunas.map((c) => <td key={c}>{formatValue(r[c])}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Node({ name, value, level }: { name: string; value: unknown; level: number }): JSX.Element | null {
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    const objetos = value.filter(isObject);
    return (
      <div className="erp-fieldset" style={{ marginTop: 8 }}>
        <div className="erp-fieldset-head">{fieldLabel(name)} ({value.length})</div>
        <div className="erp-fieldset-body">
          {objetos.length === value.length
            ? <ObjectTable rows={objetos} />
            : <div>{value.map((v) => formatValue(v)).join(", ")}</div>}
          {/* campos aninhados que a tabela não cobre */}
          {objetos.map((o, i) => (
            <div key={i}>
              {Object.entries(o)
                .filter(([, v]) => Array.isArray(v) || isObject(v))
                .map(([k, v]) => <Node key={k} name={k} value={v} level={level + 1} />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isObject(value)) {
    const escalares = Object.entries(value).filter(([, v]) => !Array.isArray(v) && !isObject(v));
    const compostos = Object.entries(value).filter(([, v]) => Array.isArray(v) || isObject(v));
    return (
      <>
        {escalares.length > 0 && (
          <div className="erp-grid-wrap">
            <table className="erp-grid">
              <tbody>
                {escalares.map(([k, v]) => (
                  <tr key={k}>
                    <th style={{ width: "38%", textAlign: "left" }}>{fieldLabel(k)}</th>
                    <td>{formatValue(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {compostos.map(([k, v]) => <Node key={k} name={k} value={v} level={level + 1} />)}
      </>
    );
  }

  return (
    <div className="erp-grid-wrap">
      <table className="erp-grid"><tbody>
        <tr><th style={{ width: "38%", textAlign: "left" }}>{fieldLabel(name)}</th><td>{formatValue(value)}</td></tr>
      </tbody></table>
    </div>
  );
}

export function ReadableRecord({ value, title, emptyLabel = "Nada a exibir." }: Props): JSX.Element {
  const vazio = value === null || value === undefined
    || (Array.isArray(value) && value.length === 0)
    || (isObject(value) && Object.keys(value).length === 0);
  if (vazio) return <div className="erp-grid-empty">{emptyLabel}</div>;
  return (
    <>
      {title && <div className="erp-fieldset-head">{title}</div>}
      <Node name={title ?? "dados"} value={value} level={0} />
    </>
  );
}

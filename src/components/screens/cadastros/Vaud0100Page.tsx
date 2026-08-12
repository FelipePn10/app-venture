import { useMemo, useState } from "react";
import { listAuditLog } from "@/services/auditLogService";
import { errMessage, type Obj } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Cadastrou", CREATED: "Cadastrou", INSERT: "Cadastrou",
  UPDATE: "Alterou", UPDATED: "Alterou", EDIT: "Alterou",
  DELETE: "Excluiu", DELETED: "Excluiu", REMOVE: "Excluiu",
  CANCEL: "Cancelou", CANCELLED: "Cancelou", APPROVE: "Aprovou", APPROVED: "Aprovou",
  REJECT: "Rejeitou", REJECTED: "Rejeitou", START: "Iniciou", STARTED: "Iniciou",
  COMPLETE: "Concluiu", COMPLETED: "Concluiu", CLOSE: "Encerrou", CLOSED: "Encerrou",
  LOGIN: "Entrou no sistema", LOGOUT: "Saiu do sistema", EXPORT: "Exportou relatório",
  ACTIVATE: "Ativou", DEACTIVATE: "Inativou", BLOCK: "Bloqueou", UNBLOCK: "Desbloqueou",
};

const ENTITY_LABELS: Record<string, string> = {
  ITEM: "Item", ITEMS: "Item", PRODUCT: "Produto", CUSTOMER: "Cliente",
  SUPPLIER: "Fornecedor", USER: "Usuário", ENTERPRISE: "Empresa",
  PRODUCTION_ORDER: "Ordem de produção", SALES_ORDER: "Pedido de venda",
  PURCHASE_ORDER: "Pedido de compra", SALES_QUOTATION: "Orçamento de venda",
  STOCK: "Estoque", INVENTORY: "Estoque", FISCAL_ENTRY: "Nota fiscal de entrada",
  FISCAL_EXIT: "Nota fiscal de saída", ACCOUNT_PAYABLE: "Conta a pagar",
  ACCOUNT_RECEIVABLE: "Conta a receber", INDUSTRIAL_CALENDAR: "Calendário industrial",
};

const FRIENDLY_KEYS: Record<string, string> = {
  status: "Situação", situation: "Situação", name: "Nome", description: "Descrição",
  code: "Código", quantity: "Quantidade", amount: "Valor", value: "Valor",
  reason: "Motivo", notes: "Observações", email: "E-mail", role: "Perfil",
};

function pick(row: Obj, ...keys: string[]): unknown {
  for (const key of keys) if (row[key] != null && row[key] !== "") return row[key];
  return undefined;
}

function text(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function normalize(value: unknown): string {
  return text(value).trim().toUpperCase().replace(/[ .-]+/g, "_");
}

function friendlyAction(row: Obj): string {
  const raw = pick(row, "action", "Action", "event", "Event", "operation", "Operation");
  const key = normalize(raw);
  return ACTION_LABELS[key] ?? (raw ? text(raw).replace(/_/g, " ").toLocaleLowerCase("pt-BR") : "Registrou uma ação");
}

function friendlyEntity(row: Obj): string {
  const raw = pick(row, "entity", "Entity", "entity_type", "EntityType", "resource", "Resource", "table", "Table");
  const key = normalize(raw);
  if (ENTITY_LABELS[key]) return ENTITY_LABELS[key];
  if (!raw) return "Sistema";
  const value = text(raw).replace(/_/g, " ").toLocaleLowerCase("pt-BR");
  return value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1);
}

function friendlyDate(row: Obj): string {
  const raw = pick(row, "created_at", "CreatedAt", "timestamp", "Timestamp", "date", "Date", "occurred_at", "OccurredAt");
  if (!raw) return "—";
  const date = new Date(text(raw));
  return Number.isNaN(date.getTime()) ? text(raw) : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
}

function friendlyUser(row: Obj): string {
  return text(pick(row, "user_name", "UserName", "username", "Username", "user", "User", "actor_name", "ActorName", "email", "Email"));
}

function friendlyReference(row: Obj): string {
  const value = pick(row, "entity_code", "EntityCode", "reference", "Reference", "code", "Code", "record_code", "RecordCode", "entity_id", "EntityID", "record_id", "RecordID");
  return value == null || value === "" ? "—" : text(value);
}

function summary(row: Obj): string {
  const explicit = pick(row, "description", "Description", "message", "Message", "summary", "Summary");
  if (explicit && typeof explicit !== "object") return text(explicit);
  return `${friendlyAction(row)} ${friendlyEntity(row).toLocaleLowerCase("pt-BR")}`;
}

function details(row: Obj): Array<{ label: string; value: string }> {
  const source = pick(row, "changes", "Changes", "details", "Details", "payload", "Payload", "data", "Data");
  if (!source || typeof source !== "object" || Array.isArray(source)) return [];
  return Object.entries(source as Obj)
    .filter(([key]) => !/(password|token|secret|authorization)/i.test(key))
    .map(([key, value]) => ({ label: FRIENDLY_KEYS[key.toLowerCase()] ?? key.replace(/_/g, " "), value: text(value) }));
}

/** VAUD0100 — histórico imutável de ações, exclusivo para administradores. */
export function Vaud0100Page(): JSX.Element {
  const [rows, setRows] = useState<Obj[]>([]);
  const [selected, setSelected] = useState<Obj | null>(null);
  const [filtros, setFiltros] = useState({ entity: "", action: "", user: "" });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  async function carregar() {
    setBusy(true); setFeedback(null); setSelected(null);
    try {
      const params: Obj = {};
      if (filtros.entity.trim()) params.entity = filtros.entity.trim();
      if (filtros.action.trim()) params.action = filtros.action.trim();
      if (filtros.user.trim()) params.user = filtros.user.trim();
      setRows(await listAuditLog(params));
    } catch (e) { setFeedback({ type: "error", message: errMessage(e, "Não foi possível consultar o histórico de alterações.") }); }
    finally { setBusy(false); }
  }

  const selectedDetails = useMemo(() => selected ? details(selected) : [], [selected]);
  const exportTable = () => ({
    columns: ["Quando", "Quem", "O que aconteceu", "Onde", "Referência"],
    rows: rows.map((row) => [friendlyDate(row), friendlyUser(row), summary(row), friendlyEntity(row), friendlyReference(row)]),
  });

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Cadastros &amp; Plataforma</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Histórico de Alterações</span><span className="erp-crumb-code">VAUD0100</span>
        </nav>
        <div className="erp-titlebar-spacer" /><span className="erp-titlebar-meta">{rows.length} registro(s)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Onde</span><input aria-label="Filtrar pelo cadastro ou processo" className="erp-tinput" placeholder="Ex.: Item" value={filtros.entity} onChange={(e) => setFiltros((f) => ({ ...f, entity: e.target.value }))} />
          <span className="erp-tgroup-label">Ação</span><input aria-label="Filtrar pela ação realizada" className="erp-tinput" placeholder="Ex.: Alterou" value={filtros.action} onChange={(e) => setFiltros((f) => ({ ...f, action: e.target.value }))} />
          <span className="erp-tgroup-label">Usuário</span><input aria-label="Filtrar pelo usuário" className="erp-tinput" placeholder="Nome ou e-mail" value={filtros.user} onChange={(e) => setFiltros((f) => ({ ...f, user: e.target.value }))} />
          <button className="erp-btn erp-btn-dark" onClick={() => void carregar()} disabled={busy}>{busy && <span className="erp-spin" />}Consultar</button>
        </div>
        <div className="erp-tspacer" /><div className="erp-tgroup"><ExportButton title="Histórico de Alterações" filename="historico-alteracoes" build={exportTable} /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-note"><strong>Para que serve:</strong> veja quem realizou uma ação, quando ela aconteceu e qual cadastro ou processo foi afetado. Este histórico é somente para consulta e não pode ser alterado.</div>
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Atividades registradas</button></div>
          <div className="erp-detail-body">
            <div className="erp-grid-wrap"><table className="erp-grid">
              <thead><tr><th>Quando</th><th>Quem</th><th>O que aconteceu</th><th>Onde</th><th>Referência</th><th>Ações</th></tr></thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhuma atividade carregada. Ajuste os filtros, se necessário, e clique em Consultar.</td></tr>}
                {rows.map((row, index) => <tr key={text(pick(row, "id", "ID")) + index}>
                  <td style={{ whiteSpace: "nowrap" }}>{friendlyDate(row)}</td><td>{friendlyUser(row)}</td>
                  <td><strong>{summary(row)}</strong></td><td>{friendlyEntity(row)}</td><td>{friendlyReference(row)}</td>
                  <td><button className="erp-btn erp-btn-sm" onClick={() => setSelected(row)}>Ver detalhes</button></td>
                </tr>)}
              </tbody>
            </table></div>
          </div>
        </section>
      </div>

      {selected && <div role="dialog" aria-modal="true" aria-labelledby="audit-detail-title" className="erp-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
        <div className="erp-modal" style={{ width: "min(620px, 92vw)" }}>
          <div className="erp-modal-head"><div><strong id="audit-detail-title">Detalhes da atividade</strong><div className="erp-field-hint">Informações adicionais para conferência e suporte</div></div><button className="erp-btn erp-btn-sm" onClick={() => setSelected(null)}>Fechar</button></div>
          <div className="erp-modal-body">
            <dl className="erp-audit-details">
              <div><dt>Quando</dt><dd>{friendlyDate(selected)}</dd></div><div><dt>Quem</dt><dd>{friendlyUser(selected)}</dd></div>
              <div><dt>Acontecimento</dt><dd>{summary(selected)}</dd></div><div><dt>Cadastro ou processo</dt><dd>{friendlyEntity(selected)}</dd></div>
              <div><dt>Referência</dt><dd>{friendlyReference(selected)}</dd></div>
              {selectedDetails.map((item, index) => <div key={`${item.label}-${index}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
            </dl>
            {selectedDetails.length === 0 && <div className="erp-note">Este registro não possui informações adicionais para exibição.</div>}
          </div>
        </div>
      </div>}

      <footer className="erp-statusbar"><div className="erp-status-item">Atividades: <strong>{rows.length}</strong></div><div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span></footer>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { ExportButton } from "@/components/ui/ExportButton";
import { currentUserId, errMessage, httpClient, unwrapObject, type Obj } from "@/services/fiscalShared";
import { downloadBlob } from "@/services/fileDownload";
import { useAuthStore } from "@/store/authStore";
import { LookupField } from "@/components/ui/LookupField";
import { loadConsumerServiceCalls, loadCustomers, loadEmployees, loadItems, loadMachines, loadMarketSegments, loadRecurringAdjustments, loadRecurringSales, loadRepresentativeInterestClassifications, loadRepresentatives, loadSalesOrders, loadSalesPlans, loadSalesPricePolicies, loadSalesTables, loadSuppliers, loadTechnicalAssistanceCalls, loadWarehouses, loadPdmGroups, loadCharacteristics, loadOperations, loadCarriers, type LookupLoader } from "@/services/lookups";
import { listNotificationUsers } from "@/services/notificationService";

export type RoutineField = {
  name: string;
  label: string;
  type?: "text" | "password" | "number" | "date" | "datetime-local" | "checkbox" | "textarea" | "json" | "file-text" | "file-base64" | "file-upload";
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | boolean;
  help?: string;
  accept?: string;
  /** Opções fixas exibidas como caixa de seleção (substitui o texto livre). */
  options?: string[];
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
  /** Consulta executada após uma escrita para exibir o estado persistido. */
  resultPath?: string;
  /** Envia chave única para operações transacionais/reexecutáveis. */
  idempotent?: boolean;
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
  currency: ["BRL", "USD", "EUR"], currency_code: ["BRL", "USD", "EUR"],
  status: ["PENDENTE", "APROVADO", "REJEITADO", "EXPIRADO", "DRAFT", "ACTIVE", "INACTIVE", "SCHEDULED", "ARRIVED", "IN_CONFERENCE", "RELEASED", "BLOCKED", "CANCELLED", "APPROVED", "OBSOLETE"],
  direction: ["INBOUND", "OUTBOUND"], message_type: ["PO_CONFIRMATION", "ASN", "INVOICE"],
  apportion_basis: ["VALUE", "QUANTITY", "WEIGHT"], value_type: ["PERCENT", "FIXED", "TEXT", "NUMBER", "BOOLEAN"],
  tolerance_type: ["QUANTITY", "ITEM_PRICE", "TOTAL_VALUE"], applies_to: ["INVOICE", "RECEIVING_NOTICE", "ALL"],
  bom_type: ["EBOM", "MBOM"], movement_type: ["SHIPMENT", "RETURN", "RECEIPT", "ADJUSTMENT"],
  part_type: ["CARACTER", "DATA", "SEQ_NUMERICA", "SEQ_CARACTER"],
  type: ["CAMPO", "DESENHO", "ESCOLHA", "FORMULA", "INF_CARACTER", "INF_NUMERICA", "ESCOLHA_MULT"],
  cost_source: ["STANDARD_TOTAL", "STANDARD_MATERIAL", "AVERAGE", "LAST_PURCHASE"],
  policy_scope: ["PREC", "FPPV"], policy_types: ["FREIGHT", "PRICE", "DISCOUNT"],
  attribute: ["customer_code", "item_code"], operator: ["==", "!=", ">", ">=", "<", "<="],
  situation: ["OPEN", "CLOSED", "PENDING", "DISCONTINUED_ORDER", "TECHNICAL_VISIT", "OTHER", "ORDER"],
  action: ["RESCHEDULE", "BLOCK", "WAIT", "RELEASE", "WARN", "ALLOW"],
  commercial_analysis_status: ["NOT_ANALYZED", "APPROVED", "REJECTED"],
  financial_analysis_status: ["NOT_ANALYZED", "APPROVED", "REJECTED"],
  release_status: ["BLOCKED", "MANUAL_RELEASED", "RELEASED"],
  conference_status: ["PENDING", "CONFERRED", "DIVERGENT"],
  freight_type: ["FIXED", "PERCENT"],
  scope: ["GLOBAL", "SUPPLIER", "COST_CENTER", "CATEGORY"],
  domain: ["PURCHASE_TABLE", "PURCHASE_ORDER", "QUOTATION", "REQUISITION", "RECEIVING_NOTICE", "INSPECTION", "SUPPLIER_EVALUATION", "CONTRACT", "SUPPLIER", "NF_ENTRY"],
  application: ["SUPRIMENTOS", "PRODUCAO", "VENDAS", "EXPEDICAO", "GERAL"],
  classification_type: ["ITEM", "CLASSIFICACAO", "FORNECEDOR", "CLIENTE"],
  downtime_type: ["MAINTENANCE", "BREAKDOWN", "SETUP", "QUALITY"],
};

const LABELS: Record<string, string> = {
  id: "Código", item_code: "Item", supplier_code: "Fornecedor", purchase_order_code: "Pedido de compra",
  purchase_order_item_code: "Linha do pedido", enterprise_code: "Empresa", warehouse_id: "Almoxarifado",
  description: "Descrição", notes: "Observações", status: "Situação", mask: "Máscara", quantity: "Quantidade",
  code: "Código", sequence: "Sequência", starts_at: "Início", ends_at: "Fim", start_from: "Iniciar em",
  valid_from: "Vigência inicial", valid_to: "Vigência final", reference_date: "Data de referência",
  __body: "Dados da operação",
  order_code: "Ordem", schedule_date: "Data da programação", start_time: "Início", end_time: "Fim",
  planned_qty: "Quantidade planejada", produced_qty: "Quantidade produzida", production_time: "Tempo de produção",
  priority: "Prioridade", bom_type: "Tipo de estrutura", created_by: "Usuário responsável",
  emission_date: "Data de emissão", delivery_date: "Data de entrega", delivery_date_firm: "Data de entrega confirmada",
  digit_date: "Data de digitação", customer_code: "Cliente", order_number: "Número do pedido",
  currency: "Moeda", currency_code: "Moeda", is_active: "Ativo", is_blocked: "Bloqueado",
  is_firm: "Confirmado", is_nfce: "NFC-e", requested_qty: "Quantidade solicitada",
  unit_price: "Preço unitário", attended_qty: "Quantidade atendida", cancelled_qty: "Quantidade cancelada",
  total_gross: "Total bruto", total_net: "Total líquido", payment_term_code: "Condição de pagamento",
  sales_table_code: "Tabela de venda", price_table_code: "Tabela de venda", policy_code: "Política comercial",
  commercial_analysis_status: "Situação da análise comercial", commission_pct: "Comissão (%)", additional_days: "Dias adicionais",
  financial_analysis_status: "Situação da análise financeira", release_status: "Situação da liberação",
  attended_reason: "Motivo do atendimento", attended_at: "Atendido em", delay_reason: "Motivo do atraso", delay_action: "Ação para o atraso",
  conference_status: "Situação da conferência", created_at: "Criado em", updated_at: "Atualizado em",
  updated_by: "Usuário que atualizou", representative_code: "Representante",
  sales_plan_code: "Plano de vendas", segment_code: "Segmento",
  market_segment_code: "Segmento de mercado", item_classification_code: "Classificação do item",
  is_primary: "Principal", is_default: "Padrão", postal_code: "CEP", city: "Cidade", state: "UF",
  street: "Logradouro", street_number: "Número", district: "Bairro",
  product_line_id: "Linha de produto", item_mask: "Máscara do item",
  block_reason: "Motivo do bloqueio", cancel_reason: "Motivo do cancelamento", balance: "Saldo", reason: "Motivo", action: "Ação",
  legacy_item_code: "Código anterior do item", new_date: "Nova data", old_date: "Data anterior",
  sales_order_code: "Pedido de venda", call_number: "Número do chamado", consumer_code: "Consumidor",
  call_type_code: "Tipo de chamado", contacted_at: "Data do contato", contact_type: "Tipo de contato",
  next_return_at: "Próximo retorno", user_code: "Usuário responsável", file_name: "Nome do arquivo",
  file_path: "Local do arquivo", content_type: "Tipo do arquivo", observation: "Observação",
  cost_source: "Fonte de custo", policy_scope: "Abrangência da política", policy_types: "Tipos da política",
  markup_pct: "Acréscimo (%)", margin_pct: "Margem (%)", max_margin_pct: "Margem máxima (%)",
  ideal_margin_pct: "Margem ideal (%)", margin_step_pct: "Intervalo de margem (%)",
  expenses_pct: "Despesas (%)", taxes_pct: "Impostos (%)", freight_pct: "Frete (%)",
  discount_pct: "Desconto (%)", min_margin_pct: "Margem mínima (%)",
  max_discount_pct: "Desconto máximo (%)", incidences_json: "Regras de incidência",
  name: "Nome", attribute: "Campo avaliado", operator: "Operador", value: "Valor", person_type: "Tipo de pessoa",
  call_code: "Chamado", direction: "Direção", in_warranty: "Em garantia",
  defect_group_code: "Grupo de defeito", defect_reason_code: "Motivo do defeito",
  responsible_user_code: "Usuário responsável", position: "Posição", situation: "Situação",
  opened_at: "Aberto em", return_date: "Data de retorno", visit_requested_date: "Data solicitada para visita",
  visit_returned_date: "Data do retorno da visita", sale_store_code: "Loja da venda",
  establishment_code: "Estabelecimento", technician_description: "Descrição do técnico",
  symptoms: "Sintomas", forwarded_store_code: "Loja encaminhada", subject: "Assunto", solution: "Solução",
  checklist_code: "Lista de verificação", returns: "Retornos", attachments: "Anexos",
  checklist_items: "Itens da lista de verificação", is_done: "Concluído", done_at: "Concluído em",
  phone_type: "Tipo de telefone", number: "Número", contact_code: "Contato", email: "E-mail", role: "Função",
  zip_code: "CEP", address: "Endereço", address_number: "Número", complement: "Complemento",
  knowledge_code: "Como conheceu", rg: "RG", cpf: "CPF", cnpj: "CNPJ", state_registration: "Inscrição estadual",
  // Roteiros / operações (VENT0115, VENT0202)
  is_standard: "Padrão", alternative: "Alternativa", route_id: "Roteiro", operation_id: "Operação",
  operation_code: "Código da operação", operation_name: "Nome da operação", standard_time: "Tempo padrão",
  setup_time: "Tempo de preparação", eff_time: "Tempo efetivo", effective_setup: "Preparação efetiva",
  effective_setup_time: "Preparação efetiva", effective_std_time: "Tempo padrão efetivo",
  effective_time: "Tempo efetivo", network: "Rede", operations: "Operações", resources: "Recursos",
  route: "Roteiro", critical_path: "Caminho crítico", total_hours: "Total (horas)",
  lead_time_hours: "Lead time (horas)", crew_size: "Equipe", labor_hours: "Horas de mão de obra",
  move_hours: "Horas de movimentação", queue_hours: "Horas de fila", run_base_qty: "Quantidade base",
  run_hours: "Horas de processamento", setup_hours: "Horas de preparação", work_center_id: "Centro de trabalho",
  work_center: "Centro de trabalho", overlap_pct: "Sobreposição (%)", predecessor_id: "Predecessora",
  successor_id: "Sucessora",
  // Máscaras de lote / série e expedição
  application: "Aplicação", classification_type: "Tipo de classificação", part_type: "Tipo de parte",
  date_format: "Formato de data", lot_mask_id: "Máscara de lote", size: "Tamanho",
  zero_on_year_change: "Zerar na virada de ano", current_value: "Valor atual",
  load_code: "Carga", carrier_code: "Transportadora", dispatch_box_code: "Caixa de despacho", box_code: "Caixa",
  shipment_code: "Romaneio", fiscal_exit_id: "Saída fiscal", nfe_number: "Número da NF-e", nfe_key: "Chave da NF-e",
  zone: "Zona", planned_ship_date: "Previsão de despacho", estimated_delivery: "Previsão de entrega",
  vehicle_plate: "Placa", driver_name: "Motorista", driver_document: "Documento do motorista",
  route_code: "Rota", origin: "Origem", destination: "Destino", active_only: "Somente ativas",
  // APS / produção
  resource_group_id: "Grupo de recurso", calendar_id: "Calendário", location: "Localização",
  is_critical: "Crítico", machine_cost_center_id: "Centro de custo da máquina", labor_cost_center_id: "Centro de custo da mão de obra",
  capacity_hours: "Horas de capacidade", order_ids: "Ordens", machine_ids: "Máquinas",
  work_center_ids: "Centros de trabalho", operation_ids: "Operações", resource_id: "Recurso",
  cost_center_id: "Centro de custo", function_name: "Função", is_supervisor: "Supervisor", is_manager: "Gerente",
  service_code: "Serviço", service_type: "Tipo de serviço", frequency_value: "Valor da frequência", frequency_unit: "Unidade da frequência",
  max_tolerance: "Tolerância máxima", implemented_on: "Implementado em", responsible_employee_ids: "Responsáveis",
  usage_description: "Uso", preparation_time: "Tempo de preparação", preparation_time_unit: "Unidade do tempo de preparação",
  brand: "Marca", is_preferred: "Preferencial", special_values: "Campos especiais", numeric_value: "Valor numérico",
  lot_return_mode: "Modo de retorno do lote", auto_issue_lots: "Baixa automática de lotes", movement_from: "Movimento de",
  movement_to: "Movimento até", stock_uom: "UM de estoque", controls_lot: "Controla lote", controls_address: "Controla endereço",
  inventory_group_type: "Tipo de grupo de inventário", automatic_issue_type: "Tipo de baixa automática", line_warehouse_id: "Almoxarifado da linha",
  is_wms: "WMS", intermediate_out_warehouse_id: "Almoxarifado intermediário de saída",
  employee_id: "Funcionário", contact_id: "Contato", function_id: "Função", service_id: "Serviço", field_id: "Campo",
  machine_id: "Máquina", weekday: "Dia da semana", start: "Início", end: "Fim", intervals: "Intervalos",
  downtime_type: "Tipo de parada",
};

const VALUE_LABELS: Record<string, string> = {
  DRAFT: "Rascunho", ACTIVE: "Ativo", INACTIVE: "Inativo", SCHEDULED: "Programado",
  ARRIVED: "Recebido", IN_CONFERENCE: "Em conferência", RELEASED: "Liberado", BLOCKED: "Bloqueado",
  CANCELLED: "Cancelado", APPROVED: "Aprovado", OBSOLETE: "Obsoleto", PLANNED: "Planejado",
  EBOM: "Estrutura de engenharia (EBOM)", MBOM: "Estrutura de fabricação (MBOM)",
  PENDENTE: "Pendente", APROVADO: "Aprovado", REJEITADO: "Rejeitado", EXPIRADO: "Expirado",
  INBOUND: "Entrada", OUTBOUND: "Saída", WARN: "Alertar", BLOCK: "Bloquear", ALLOW: "Permitir",
  CONFERRED: "Conferido", NOT_ANALYZED: "Não analisado", ANALYZED: "Analisado", NOT_CONFERRED: "Não conferido",
  MONTH: "Mensal", WEEK: "Semanal", CUSTOM: "Personalizado",
  STANDARD_TOTAL: "Custo padrão total", STANDARD_MATERIAL: "Custo padrão de materiais",
  AVERAGE: "Custo médio", LAST_PURCHASE: "Último custo de compra", CUSTOMER: "Cliente",
  ITEM: "Item", GENERAL: "Geral", FREIGHT: "Frete", PRICE: "Preço", DISCOUNT: "Desconto",
  R: "Rascunho", P: "Confirmado", A: "Em análise", OA: "Orçamento em análise", OF: "Orçamento", F: "Faturado",
  REJECTED: "Rejeitado", PENDING: "Pendente", DIVERGENT: "Divergente",
  MANUAL_RELEASED: "Liberado manualmente",
  DISCONTINUED_ORDER: "Pedido descontinuado", TECHNICAL_VISIT: "Visita técnica", OTHER: "Outro",
  OPEN: "Aberto", RESCHEDULE: "Reprogramar", WAIT: "Aguardar",
};

const AUDIT_FIELDS = new Set(["created_by", "updated_by", "approved_by_id", "user_id", "user_uuid"]);

const ENUM_WORDS: Record<string, string> = {
  OPEN: "Aberto", CLOSED: "Encerrado", PENDING: "Pendente", DONE: "Concluído", IN: "Entrada", OUT: "Saída",
  PROGRESS: "andamento", CONFERENCE: "conferência", RECEIVING: "recebimento", NOTICE: "aviso", RETURN: "retorno",
  SHIPMENT: "remessa", RECEIPT: "recebimento", ADJUSTMENT: "ajuste", VALUE: "valor", QUANTITY: "quantidade",
  WEIGHT: "peso", FIXED: "fixo", TEXT: "texto", NUMBER: "número", BOOLEAN: "sim/não", ALL: "todos",
  PREVENTIVE: "preventivo", MONTHLY: "mensal", DAILY: "diário", WEEKLY: "semanal", HOUR: "hora", DAY: "dia",
};
function valueLabel(value: string): string {
  if (value === "true") return "Sim";
  if (value === "false") return "Não";
  if (VALUE_LABELS[value]) return VALUE_LABELS[value];
  if (/^[A-Z][A-Z0-9_]*$/.test(value) && value.includes("_")) {
    return value.split("_").map((word) => ENUM_WORDS[word] ?? word.toLocaleLowerCase("pt-BR")).join(" ").replace(/^./, (c) => c.toUpperCase());
  }
  return ENUM_WORDS[value] ?? value;
}

function isDateField(name: string): boolean { return name.includes("date") || name.endsWith("_on"); }
function isDateTimeField(name: string): boolean { return name.endsWith("_time") || name.endsWith("_at") || name === "starts_at" || name === "ends_at"; }

function lookupFor(name: string, label = ""): LookupLoader | undefined {
  const key = `${name} ${label}`.toLowerCase();
  if (/chamado do consumidor|consumer.?service.?call/.test(key)) return loadConsumerServiceCalls;
  if (/chamado de assistência|technical.?assistance.?call/.test(key)) return loadTechnicalAssistanceCalls;
  if (/user_code|responsible_user|usuário responsável|funcionário/.test(key)) return loadEmployees;
  if (/item.?classification|classificação do item/.test(key)) return loadRepresentativeInterestClassifications;
  if (/venda recorrente|recurring.?sale/.test(key)) return loadRecurringSales;
  if (/movimento de reajuste|recurring.?adjustment/.test(key)) return loadRecurringAdjustments;
  if (/market.?segment|segmento de mercado/.test(key)) return loadMarketSegments;
  if (/sales.?plan|plano de vendas?/.test(key)) return loadSalesPlans;
  if (/sales.?price.?polic|política comercial|política de preço/.test(key)) return loadSalesPricePolicies;
  if (/sales.?table|price.?table|tabela de venda|tabela de preço|^table$|^tabela$/.test(key)) return loadSalesTables;
  if (/sales.?order|pedido de venda|^code pedido$/.test(key)) return loadSalesOrders;
  if (/machine|máquina/.test(key)) return loadMachines;
  if (/operação|operation/.test(key)) return loadOperations;
  if (/grupo pdm|pdm|grupo/.test(key)) return loadPdmGroups;
  if (/característica|characteristic/.test(key)) return loadCharacteristics;
  if (/item.?classification|classificação do item/.test(key)) return loadRepresentativeInterestClassifications;
  if (/item|produto|componente/.test(key)) return loadItems;
  if (/supplier|fornecedor/.test(key)) return loadSuppliers;
  if (/representative|representante/.test(key)) return loadRepresentatives;
  if (/customer|cliente/.test(key)) return loadCustomers;
  if (/warehouse|almoxarifado|depósito/.test(key)) return loadWarehouses;
  if (/carrier|transportadora/.test(key)) return loadCarriers;
  return undefined;
}

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
  if (AUDIT_FIELDS.has(name)) return <></>;
  if (Array.isArray(value)) return <div className="erp-field erp-c12" style={{ border: "1px solid #dbe5df", borderRadius: 6, padding: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><strong className="erp-label">{humanLabel(name)} ({value.length})</strong>
      <button type="button" className="erp-btn erp-btn-sm" onClick={() => onChange(updateNested(root, path, [...value, value.length ? clone(value[0]) : {}]))}>+ Adicionar</button></div>
    {value.length === 0 && <div className="erp-grid-empty">Nenhum registro. Clique em Adicionar.</div>}
    {value.map((item, index) => <div key={index} className="erp-fieldset" style={{ marginBottom: 8 }}><div className="erp-fieldset-body">
      <div className="erp-field erp-c12" style={{ flexDirection: "row", justifyContent: "space-between" }}><span className="erp-tgroup-label">{humanLabel(name)} {index + 1}</span><button type="button" className="erp-btn erp-btn-sm" onClick={() => onChange(updateNested(root, path, value.filter((_, itemIndex) => itemIndex !== index)))}>Remover</button></div>
      <PayloadNode name={String(index)} value={item} path={[...path, index]} root={root} onChange={onChange}/>
    </div></div>)}
  </div>;
  if (value && typeof value === "object") return <div className="erp-field erp-c12" style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 10 }}>{Object.entries(value as Obj).map(([key, child]) => <PayloadNode key={key} name={key} value={child} path={[...path, key]} root={root} onChange={onChange}/>)}</div>;
  const options = ENUM_OPTIONS[name];
  const lookup = typeof value === "number" ? lookupFor(name) : undefined;
  return <div className="erp-field erp-c3"><label className="erp-label">{humanLabel(name)}</label>
    {typeof value === "boolean" ? <label className="erp-label" style={{ display: "flex", gap: 7, alignItems: "center", minHeight: 30 }}><input type="checkbox" checked={value} onChange={(event) => onChange(updateNested(root, path, event.target.checked))}/> Sim</label>
      : lookup ? <LookupField value={Number(value) || undefined} onChange={(code) => onChange(updateNested(root, path, code ?? 0))} loader={lookup} entityLabel={humanLabel(name).toLowerCase()} placeholder={`Pesquisar ${humanLabel(name).toLowerCase()}…`}/>
      : options ? <select className="erp-input" value={String(value ?? "")} onChange={(event) => onChange(updateNested(root, path, event.target.value))}><option value="">Selecione…</option>{options.map((option) => <option key={option} value={option}>{valueLabel(option)}</option>)}</select>
      : <input className={`erp-input ${typeof value === "number" ? "num" : ""}`} type={typeof value === "number" ? "number" : isDateTimeField(name) ? "datetime-local" : isDateField(name) ? "date" : "text"} value={isDateTimeField(name) ? String(value ?? "").replace(/Z$/, "").slice(0, 16) : String(value ?? "")} onChange={(event) => onChange(updateNested(root, path, typeof value === "number" ? Number(event.target.value) : isDateTimeField(name) && event.target.value ? new Date(event.target.value).toISOString() : event.target.value))}/>}
    {isDateField(name) && <span className="erp-field-hint">Formato: dia/mês/ano.</span>}
    {isDateTimeField(name) && <span className="erp-field-hint">Informe dia, mês, ano e horário.</span>}
  </div>;
}

function StructuredPayloadEditor({ raw, onChange }: { raw: string; onChange: (raw: string) => void }): JSX.Element {
  let parsed: unknown;
  try { parsed = JSON.parse(raw || "{}"); } catch { return <div className="erp-feedback error">O modelo desta operação contém dados inválidos.</div>; }
  return <PayloadNode name="dados" value={parsed} path={[]} root={parsed} onChange={(next) => onChange(JSON.stringify(next))}/>;
}

type RoutineValue = string | boolean | File;

function initialValues(operation: RoutineOperation): Record<string, RoutineValue> {
  return Object.fromEntries((operation.fields ?? []).map((field) => [field.name, field.defaultValue ?? (field.type === "checkbox" ? false : field.type === "json" ? field.placeholder ?? "{}" : "")]));
}

function normalizeValue(field: RoutineField, raw: RoutineValue): unknown {
  if (field.type === "file-upload") return raw instanceof File ? raw : undefined;
  if (field.type === "checkbox") return Boolean(raw);
  if (field.type === "number") return raw === "" ? undefined : Number(raw);
  if (field.type === "json") {
    if (!String(raw).trim()) return undefined;
    return JSON.parse(String(raw).split("UUID_DO_USUARIO").join(currentUserId()));
  }
  if (field.type === "datetime-local" && raw) return new Date(String(raw)).toISOString();
  return raw === "" ? undefined : raw;
}

function validateStructuredChoices(value: unknown, path: string[] = []): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateStructuredChoices(item, [...path, String(index + 1)]));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Obj)) {
    if ((key === "status" || key === "situation" || key === "action") && String(child ?? "").trim() === "") {
      throw new Error(`Selecione uma opção válida para ${humanLabel(key).toLowerCase()}.`);
    }
    validateStructuredChoices(child, [...path, key]);
  }
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
  if (Array.isArray(value)) {
    const attachments = value.map(unwrapObject).filter((item) => item.file_name || item.FileName);
    if (attachments.length === value.length && attachments.length > 0) return attachments.map((item) => `${String(item.file_name ?? item.FileName)} (anexo ${String(item.id ?? item.code ?? item.ID ?? item.Code ?? "")})`).join("; ");
    return value.map(cell).join("; ");
  }
  if (typeof value === "object") return Object.entries(value as Obj).map(([key, child]) => `${humanLabel(key)}: ${cell(child)}`).join("; ");
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(text)) {
    const date = new Date(text.length === 10 ? `${text}T00:00:00` : text);
    if (!Number.isNaN(date.getTime())) return text.includes('T') ? date.toLocaleString('pt-BR') : date.toLocaleDateString('pt-BR');
  }
  return valueLabel(text);
}

async function enrichResult(raw: unknown): Promise<unknown> {
  const serialized = JSON.stringify(raw ?? null);
  const needsUsers = /"(?:created_by|updated_by)"\s*:/.test(serialized);
  const needsCustomers = /"customer_code"\s*:/.test(serialized);
  if (!needsUsers && !needsCustomers) return raw;
  const [users, customers] = await Promise.all([
    needsUsers ? listNotificationUsers().catch(() => []) : [],
    needsCustomers ? loadCustomers().catch(() => []) : [],
  ]);
  const names = new Map(users.map((user) => [user.id.toLowerCase(), user.name]));
  const customerNames = new Map(customers.map((customer) => [Number(customer.code), customer.label]));
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value as Obj).map(([key, child]) => {
      if ((key === "created_by" || key === "updated_by") && typeof child === "string") return [key, names.get(child.toLowerCase()) || "Usuário não localizado"];
      if (key === "customer_code" && typeof child === "number") return [key, customerNames.get(child) ? `${customerNames.get(child)} (${child})` : child];
      return [key, visit(child)];
    }));
  };
  return visit(raw);
}

export function OperationalRoutinePage({ routine }: { routine: OperationalRoutine }): JSX.Element {
  const token = useAuthStore((state) => state.token);
  const userRole = useAuthStore((state) => state.user?.role)?.toUpperCase() ?? roleFromToken(token);
  const preferredOperation = Math.max(0, routine.operations.findIndex((candidate) => candidate.method === "GET"));
  const [operationIndex, setOperationIndex] = useState(preferredOperation);
  const operation = routine.operations[operationIndex];
  const [valuesByOperation, setValuesByOperation] = useState<Record<number, Record<string, RoutineValue>>>({});
  const values = valuesByOperation[operationIndex] ?? initialValues(operation);
  const [result, setResult] = useState<unknown>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setOperationIndex(preferredOperation); setValuesByOperation({}); setResult(null); setFeedback(null);
  }, [routine.code, preferredOperation]);

  // Consultas de listagem sem campos obrigatórios são carregadas automaticamente
  // ao abrir a tela — isso garante que o resultado (e a exportação) já estejam
  // disponíveis sem exigir um clique manual em "Consultar".
  const autoLoaded = useRef<string | null>(null);
  useEffect(() => {
    const op = routine.operations[preferredOperation];
    if (!op || op.method !== "GET") return;
    if (autoLoaded.current === routine.code) return;
    if ((op.fields ?? []).some((f) => f.required && f.type !== "json")) return;
    autoLoaded.current = routine.code;
    void execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routine.code, preferredOperation]);

  const rows = useMemo(() => displayRows(result), [result]);
  const columns = useMemo(() => {
    const keys = new Set<string>();
    rows.slice(0, 20).forEach((row) => Object.keys(row).slice(0, 10).forEach((key) => keys.add(key)));
    return [...keys].slice(0, 10);
  }, [rows]);

  const setValue = (name: string, value: RoutineValue) => {
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
        if (field.type === "json") validateStructuredChoices(value);
        const token = `{${field.name}}`;
        if (path.includes(token)) path = path.split(token).join(encodeURIComponent(String(value ?? "")));
        else if (operation.query?.includes(field.name)) {
          if (value !== undefined) params[field.name] = value;
        } else if (field.name === "__body" && value && typeof value === "object") Object.assign(body, value);
        else if (value !== undefined) body[field.name] = value;
      }
      if (operation.destructive && !window.confirm(`Confirma a operação “${operation.label}”?`)) return;
      const upload = (operation.fields ?? []).find((field) => field.type === "file-upload");
      let requestData: unknown = body;
      if (upload) {
        const file = values[upload.name];
        if (!(file instanceof File)) throw new Error(`O campo ${upload.label} é obrigatório.`);
        const form = new FormData();
        form.append(upload.name, file, file.name);
        requestData = form;
      }
      const response = await httpClient.request({ method: operation.method, url: path, params, data: operation.method === "GET" ? undefined : requestData, headers: operation.idempotent ? { "Idempotency-Key": crypto.randomUUID() } : undefined, responseType: operation.downloadFilename ? "blob" : "json" });
      if (operation.downloadFilename) {
        const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
        // A confirmação do download é global (<DownloadNotice>); aqui fica só o
        // resultado com nome e tamanho, que é informação, não aviso.
        downloadBlob(blob, operation.downloadFilename);
        setResult({ arquivo: operation.downloadFilename, tamanho_bytes: blob.size });
        return;
      }
      let responseResult = response.data;
      if (operation.resultPath) {
        let resultPath = operation.resultPath;
        for (const field of operation.fields ?? []) {
          const token = `{${field.name}}`;
          if (resultPath.includes(token)) resultPath = resultPath.split(token).join(encodeURIComponent(String(normalizeValue(field, values[field.name] ?? "") ?? "")));
        }
        const persisted = await httpClient.get(resultPath);
        const state = unwrapObject(persisted.data);
        responseResult = {
          resultado: `${operation.label} confirmada no pedido`,
          code: state.code,
          order_number: state.order_number,
          status: state.status,
          ...(operation.label === "Analisar" ? {
            commercial_analysis_status: state.commercial_analysis_status,
            financial_analysis_status: state.financial_analysis_status,
            release_status: state.release_status,
          } : {}),
          ...(operation.label === "Atender" ? { attended_reason: state.attended_reason, attended_at: state.attended_at } : {}),
          ...(operation.label === "Conferir" ? { conference_status: state.conference_status } : {}),
          ...(operation.label === "Motivo de atraso" ? { delay_reason: state.delay_reason, delay_action: state.delay_action } : {}),
          updated_at: state.updated_at,
        };
      } else if (responseResult == null || responseResult === "") {
        responseResult = { resultado: "Operação concluída e confirmada pelo servidor" };
      }
      setResult(await enrichResult(responseResult));
      setFeedback({ type: "success", message: `${operation.label} concluída com sucesso.` });
    } catch (error) {
      setFeedback({ type: "error", message: errMessage(error) });
    } finally { setBusy(false); }
  };

  return <div className="erp-screen">
    <header className="erp-titlebar">
      <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
      <nav className="erp-crumbs"><span className="erp-crumb-mut">Rotinas</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">{routine.title}</span><span className="erp-crumb-code">{routine.code}</span></nav>
      <div className="erp-titlebar-spacer"/><span className="erp-titlebar-meta">{rows.length} registro(s)</span>
    </header>
    <div className="erp-toolbar">
      <div className="erp-tgroup"><span className="erp-tgroup-label">Operação</span>
        <select className="erp-tselect" value={operationIndex} onChange={(event) => { setOperationIndex(Number(event.target.value)); setResult(null); setFeedback(null); }}>
          {routine.operations.map((item, index) => <option key={`${item.method}-${item.path}`} value={index}>{item.label}</option>)}
        </select>
      </div>
      <div className="erp-tgroup"><button className="erp-btn erp-btn-primary" onClick={execute} disabled={busy || (operation.adminOnly && userRole !== "ADMIN")} title={operation.adminOnly && userRole !== "ADMIN" ? "Operação exclusiva do perfil ADMIN" : undefined}>{busy ? "Processando…" : operation.submitLabel ?? operation.label}</button></div>
      <div className="erp-tspacer"/><div className="erp-tgroup"><ExportButton title={`${routine.code} — ${routine.title}`} filename={routine.code.toLowerCase()} build={() => ({ columns: columns.map(humanLabel), rows: rows.map((row) => columns.map((column) => cell(row[column]))), subtitle: operation.label })} /></div>
    </div>
    <div className="erp-content">
      <section className="erp-detail-panel">
        <div className="erp-tabs"><button className="erp-tab active">{operation.label}</button></div>
        <div className="erp-detail-body">
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
      <div className="erp-fieldset"><div className="erp-fieldset-head">{operation.label}{operation.adminOnly ? " — requer administrador" : ""}</div><div className="erp-fieldset-body">
        <div className="erp-field erp-c12"><p style={{ margin: 0, color: "var(--v-muted, #64748b)", fontSize: 12 }}>{routine.description} {routine.guidance}</p></div>
        {(operation.fields ?? []).filter((field) => !AUDIT_FIELDS.has(field.name)).map((field) => <div className={`erp-field ${field.type === "textarea" || field.type === "json" || field.type === "file-text" || field.type === "file-base64" ? "erp-c12" : "erp-c3"}`} key={field.name}>
          <label className={`erp-label ${field.required ? "erp-req" : ""}`}>{field.label}</label>
          {field.type === "checkbox" ? <label className="erp-label" style={{ display: "flex", gap: 7, alignItems: "center", minHeight: 30 }}><input type="checkbox" checked={Boolean(values[field.name])} onChange={(event) => setValue(field.name, event.target.checked)}/> Sim</label>
            : field.type === "json" ? <StructuredPayloadEditor raw={String(values[field.name] || field.placeholder || "{}")} onChange={(next) => setValue(field.name, next)}/>
            : field.type === "file-upload" ? <input className="erp-input" type="file" accept={field.accept} onChange={(event) => setValue(field.name, event.target.files?.[0] ?? "")}/>
            : field.type === "file-text" ? <input className="erp-input" type="file" accept={field.accept} onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) { setValue(field.name, ""); return; }
              const reader = new FileReader();
              reader.onload = () => setValue(field.name, String(reader.result ?? ""));
              reader.onerror = () => setFeedback({ type: "error", message: `Não foi possível ler o arquivo ${file.name}.` });
              reader.readAsText(file);
            }}/>
            : field.type === "file-base64" ? <input className="erp-input" type="file" accept={field.accept} onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) { setValue(field.name, ""); return; }
              const reader = new FileReader();
              reader.onload = () => setValue(field.name, String(reader.result ?? "").split(",", 2)[1] ?? "");
              reader.onerror = () => setFeedback({ type: "error", message: `Não foi possível ler o arquivo ${file.name}.` });
              reader.readAsDataURL(file);
            }}/>
            : field.type === "textarea" ? <textarea className="erp-input" rows={3} value={String(values[field.name] ?? "")} placeholder={field.placeholder} onChange={(event) => setValue(field.name, event.target.value)}/>
            : field.options ? <select className="erp-input" value={String(values[field.name] ?? "")} onChange={(event) => setValue(field.name, event.target.value)}><option value="">Selecione…</option>{field.options.map((option) => <option key={option} value={option}>{valueLabel(option)}</option>)}</select>
            : lookupFor(field.name, field.label) ? <LookupField value={Number(values[field.name]) || undefined} onChange={(code) => setValue(field.name, code ? String(code) : "")} loader={lookupFor(field.name, field.label)!} entityLabel={field.label.toLowerCase()} placeholder={`Pesquisar ${field.label.toLowerCase()}…`}/>
            : <input className={`erp-input ${field.type === "number" ? "num" : ""}`} type={field.type ?? "text"} value={String(values[field.name] ?? "")} placeholder={field.placeholder} onChange={(event) => setValue(field.name, event.target.value)}/>}
          {field.help && <span className="erp-field-hint">{field.help}</span>}
          {(field.type === "date" || field.type === "datetime-local") && <span className="erp-field-hint">Formato: dia/mês/ano{field.type === "datetime-local" ? " e hora" : ""}.</span>}
        </div>)}
        {(operation.fields ?? []).length === 0 && <div className="erp-field erp-c12"><div className="erp-grid-empty">Esta operação não exige parâmetros.</div></div>}
      </div></div>
      <div className="erp-fieldset"><div className="erp-fieldset-head">Resultado ({rows.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12"><table className="erp-grid"><thead><tr>{columns.map((column) => <th key={column}>{humanLabel(column)}</th>)}</tr></thead><tbody>
        {rows.length === 0 && <tr><td className="erp-grid-empty">Execute uma operação para visualizar o resultado.</td></tr>}
        {rows.map((row, index) => <tr key={String(row.id ?? row.code ?? index)}>{columns.map((column) => <td key={column} title={cell(row[column])}>{cell(row[column]).slice(0, 100)}</td>)}</tr>)}
      </tbody></table></div></div></div>
        </div>
      </section>
    </div>
    <footer className="erp-statusbar"><div className="erp-status-item">Registros: <strong>{rows.length}</strong></div><div className="erp-status-spacer"/><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span></footer>
  </div>;
}

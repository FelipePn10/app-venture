#!/usr/bin/env node
/**
 * Teste de contrato — Orçamento de Venda (VVND0300/VVND0310) × backend Go
 * ---------------------------------------------------------------------------
 * Compara o serviço do front-end com o CÓDIGO-FONTE do backend, sem precisar de
 * servidor no ar. Falha quando:
 *
 *  1. um campo do DTO do front não existe em nenhum DTO/entidade do backend
 *     (foi exatamente assim que `sales_table_code`, `freight_check`,
 *     `retention_value`, `icms_pct` e `attended_count` ficaram anos mandando
 *     dados que o backend ignorava em silêncio);
 *  2. um campo devolvido pelo backend não é lido por nenhum parser do front;
 *  3. um filtro de listagem do front não é lido pelo handler;
 *  4. uma rota do grupo `/api/sales-quotation` não é consumida pelo serviço —
 *     ou o serviço chama uma rota que não existe;
 *  5. as constantes de status/tipo/liberação/frete divergem das do backend.
 *
 * Uso:
 *   node scripts/validate-sales-quotation-contract.mjs [caminho-do-backend]
 *   VENTURE_BACKEND_ROOT=/caminho node scripts/validate-sales-quotation-contract.mjs
 *
 * Sem o backend disponível o script termina com aviso e código 0 (para não
 * quebrar CI de máquinas que só têm o front).
 */
import fs from 'node:fs';
import path from 'node:path';

const BACKEND = process.argv[2] ?? process.env.VENTURE_BACKEND_ROOT ?? '/home/felipepanosso/GolandProjects/panossoerp';
const FRONT = path.resolve(new URL('..', import.meta.url).pathname);

if (!fs.existsSync(path.join(BACKEND, 'api/api.go'))) {
  console.warn(`⚠ backend não encontrado em ${BACKEND} — contrato não verificado.`);
  process.exit(0);
}

const failures = [];
const checks = [];
function check(label, fn) {
  try {
    const detail = fn();
    checks.push({ label, ok: true, detail: detail ?? '' });
  } catch (e) {
    checks.push({ label, ok: false, detail: e.message });
    failures.push(`${label}: ${e.message}`);
  }
}
function assertSubset(actual, allowed, what) {
  const extra = [...actual].filter((f) => !allowed.has(f));
  if (extra.length) throw new Error(`${what} não existe(m) no backend: ${extra.join(', ')}`);
  return `${actual.size} campo(s) conferido(s)`;
}

const read = (rel) => fs.readFileSync(path.join(BACKEND, rel), 'utf8');
const readFront = (rel) => fs.readFileSync(path.join(FRONT, rel), 'utf8');

// ─── Extratores Go ───────────────────────────────────────────────────────────

/** Nomes JSON dos campos de uma struct Go (ignora `json:"-"`). */
function goJsonFields(src, structName) {
  const match = src.match(new RegExp(`type\\s+${structName}\\s+struct\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!match) throw new Error(`struct ${structName} não encontrada no backend`);
  const out = new Set();
  for (const tag of match[1].matchAll(/json:"([^"]+)"/g)) {
    const name = tag[1].split(',')[0];
    if (name && name !== '-') out.add(name);
  }
  if (!out.size) throw new Error(`struct ${structName} não expõe tags json`);
  return out;
}

/** Valores de um bloco `const (...)` Go, por prefixo do nome da constante. */
function goConstValues(src, namePrefix) {
  const out = new Set();
  for (const m of src.matchAll(new RegExp(`${namePrefix}\\w*\\s+\\w+\\s*=\\s*"([^"]+)"`, 'g'))) out.add(m[1]);
  return out;
}

// ─── Extratores TypeScript ───────────────────────────────────────────────────

/** Campos declarados numa `interface X { ... }`. */
function tsInterfaceFields(src, name) {
  const match = src.match(new RegExp(`export interface ${name}\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!match) throw new Error(`interface ${name} não encontrada no serviço`);
  const out = new Set();
  for (const line of match[1].split('\n')) {
    const field = line.match(/^\s{2}(\w+)\??:/);
    if (field) out.add(field[1]);
  }
  return out;
}

/** Chaves lidas por um parser (`parseNum(o, 'campo', 'Campo')` → `campo`). */
function tsParserKeys(src, fnName) {
  const match = src.match(new RegExp(`function ${fnName}\\(raw: unknown\\)[\\s\\S]*?\\n\\}`));
  if (!match) throw new Error(`parser ${fnName} não encontrado`);
  const out = new Set();
  for (const m of match[0].matchAll(/(?:parseNum|parseStr|parseBool|optNum|optStr|optDate)\(o,\s*'([^']+)'/g)) out.add(m[1]);
  for (const m of match[0].matchAll(/o\['(\w+)'\]/g)) out.add(m[1]);
  return out;
}

// ─── Fontes ──────────────────────────────────────────────────────────────────

const goResponse = read('internal/application/dto/response/sales_quotation_response.go');
const goRequest = read('internal/application/dto/request/sales_quotation_dto.go');
const goConfig = read('internal/domain/sales_quotation/entity/configuration.go');
const goEntity = read('internal/domain/sales_quotation/entity/sales_quotation.go');
const goHandler = read('internal/interfaces/http/handler/sales_quotation_handler.go');
const goRules = read('internal/application/usecase/sales_quotation_uc/configuration_uc.go');
const goApi = read('api/api.go');
const goDivisionReq = read('internal/application/dto/request/sales_division_dto_request.go');
const goDivisionRes = read('internal/application/dto/response/sales_division_response.go');

const service = readFront('src/services/salesQuotationService.ts');
const divisionService = readFront('src/services/salesDivisionService.ts');

const quotationResponseFields = goJsonFields(goResponse, 'SalesQuotationResponse');
const itemResponseFields = goJsonFields(goResponse, 'SalesQuotationItemResponse');
const reportFields = goJsonFields(goResponse, 'SalesQuotationReportResponse');
const createFields = goJsonFields(goRequest, 'CreateSalesQuotationDTO');
const updateFields = goJsonFields(goRequest, 'UpdateSalesQuotationDTO');
const createItemFields = goJsonFields(goRequest, 'CreateSalesQuotationItemDTO');
const updateItemFields = goJsonFields(goRequest, 'UpdateSalesQuotationItemDTO');
const paramsRequestFields = goJsonFields(goRequest, 'SaveSalesQuotationParametersDTO');
const paramsEntityFields = goJsonFields(goConfig, 'Parameters');
const commissionRequestFields = goJsonFields(goRequest, 'SaveCommissionPatternDTO');
const commissionEntityFields = goJsonFields(goConfig, 'CommissionPattern');
const reasonRequestFields = goJsonFields(goRequest, 'SaveCancellationReasonDTO');
const reasonEntityFields = goJsonFields(goConfig, 'CancellationReason');
const eventFields = goJsonFields(goConfig, 'Event');
const attachmentFields = goJsonFields(goConfig, 'Attachment');

const union = (...sets) => new Set(sets.flatMap((s) => [...s]));

// ─── 1. Campos enviados pelo front existem no backend ────────────────────────

check('SalesQuotationDTO ⊆ Create ∪ Update ∪ Response', () =>
  assertSubset(tsInterfaceFields(service, 'SalesQuotationDTO'),
    union(createFields, updateFields, quotationResponseFields, new Set(['items'])),
    'campos da capa'));

check('SalesQuotationItemDTO ⊆ CreateItem ∪ UpdateItem ∪ ItemResponse', () =>
  assertSubset(tsInterfaceFields(service, 'SalesQuotationItemDTO'),
    union(createItemFields, updateItemFields, itemResponseFields),
    'campos do item'));

check('SalesQuotationReportDTO ⊆ ReportResponse', () =>
  assertSubset(tsInterfaceFields(service, 'SalesQuotationReportDTO'), reportFields, 'campos do relatório'));

check('SalesQuotationParametersDTO ⊆ SaveParameters ∪ Parameters', () =>
  assertSubset(tsInterfaceFields(service, 'SalesQuotationParametersDTO'),
    union(paramsRequestFields, paramsEntityFields), 'campos de parâmetros'));

check('CommissionPatternDTO ⊆ SaveCommissionPattern ∪ CommissionPattern', () =>
  assertSubset(tsInterfaceFields(service, 'CommissionPatternDTO'),
    union(commissionRequestFields, commissionEntityFields), 'campos do padrão de comissão'));

check('CancellationReasonDTO ⊆ SaveCancellationReason ∪ CancellationReason', () =>
  assertSubset(tsInterfaceFields(service, 'CancellationReasonDTO'),
    union(reasonRequestFields, reasonEntityFields), 'campos do motivo'));

check('QuotationEventDTO ⊆ Event', () =>
  assertSubset(tsInterfaceFields(service, 'QuotationEventDTO'), eventFields, 'campos do evento'));

check('QuotationAttachmentDTO ⊆ Attachment', () =>
  assertSubset(tsInterfaceFields(service, 'QuotationAttachmentDTO'), attachmentFields, 'campos do anexo'));

check('SalesDivisionDTO ⊆ Create ∪ Update ∪ Response', () =>
  assertSubset(tsInterfaceFields(divisionService, 'SalesDivisionDTO'),
    union(goJsonFields(goDivisionReq, 'CreateSalesDivisionDTO'),
      goJsonFields(goDivisionReq, 'UpdateSalesDivisionDTO'),
      goJsonFields(goDivisionRes, 'SalesDivisionResponse')),
    'campos da divisão de vendas'));

// ─── 2. Campos devolvidos pelo backend são lidos pelo front ──────────────────

/** Metadados de auditoria que a UI não consome. */
const IGNORED_RESPONSE = new Set(['created_at', 'updated_at', 'created_by', 'uploaded_by', 'enterprise_code']);

function assertParsed(backendFields, parserKeys, what) {
  const missing = [...backendFields].filter((f) => !parserKeys.has(f) && !IGNORED_RESPONSE.has(f));
  if (missing.length) throw new Error(`${what} devolvido(s) pelo backend e não lido(s): ${missing.join(', ')}`);
  return `${backendFields.size} campo(s) conferido(s)`;
}

check('parseQuotation lê toda a resposta da capa', () =>
  assertParsed(quotationResponseFields, tsParserKeys(service, 'parseQuotation'), 'campo(s) da capa'));
check('parseItem lê toda a resposta do item', () =>
  assertParsed(itemResponseFields, tsParserKeys(service, 'parseItem'), 'campo(s) do item'));
check('parseReport lê todo o relatório', () =>
  assertParsed(reportFields, tsParserKeys(service, 'parseReport'), 'campo(s) do relatório'));
check('parseParameters lê todos os parâmetros', () =>
  assertParsed(paramsEntityFields, tsParserKeys(service, 'parseParameters'), 'parâmetro(s)'));
check('parseCommissionPattern lê o padrão inteiro', () =>
  assertParsed(commissionEntityFields, tsParserKeys(service, 'parseCommissionPattern'), 'campo(s) do padrão'));
check('parseCancellationReason lê o motivo inteiro', () =>
  assertParsed(reasonEntityFields, tsParserKeys(service, 'parseCancellationReason'), 'campo(s) do motivo'));
check('parseEvent lê o evento inteiro', () =>
  assertParsed(eventFields, tsParserKeys(service, 'parseEvent'), 'campo(s) do evento'));
check('parseAttachment lê o anexo inteiro', () =>
  assertParsed(attachmentFields, tsParserKeys(service, 'parseAttachment'), 'campo(s) do anexo'));

// ─── 3. Filtros de listagem batem com o handler ──────────────────────────────

check('SalesQuotationListFilters ⊆ query params do handler', () => {
  const accepted = new Set([...goHandler.matchAll(/q\.Get\("([^"]+)"\)/g)].map((m) => m[1]));
  return assertSubset(tsInterfaceFields(service, 'SalesQuotationListFilters'), accepted, 'filtros');
});

check('filterParams envia só query params aceitos', () => {
  const accepted = new Set([...goHandler.matchAll(/q\.Get\("([^"]+)"\)/g)].map((m) => m[1]));
  const body = service.match(/function filterParams[\s\S]*?\n\}/)[0];
  const sent = new Set([...body.matchAll(/params\.(\w+)\s*=/g)].map((m) => m[1]));
  return assertSubset(sent, accepted, 'query params');
});

// ─── 4. Rotas ────────────────────────────────────────────────────────────────

check('rotas do backend × chamadas do serviço', () => {
  const block = goApi.match(/r\.Route\("\/api\/sales-quotation",[\s\S]*?\n\t\t\}\)/);
  if (!block) throw new Error('grupo /api/sales-quotation não encontrado em api.go');

  // Sub-rota aninhada `r.Route("/items", ...)` precisa do prefixo.
  const itemsBlock = block[0].match(/r\.Route\("\/items",[\s\S]*?\n\t\t\t\}\)/);
  const backendRoutes = new Set();
  const collect = (src, prefix) => {
    for (const m of src.matchAll(/\.(Get|Post|Put|Patch|Delete)\("([^"]*)"/g)) {
      backendRoutes.add(`${m[1].toUpperCase()} /api/sales-quotation${prefix}${m[2]}`);
    }
  };
  collect(itemsBlock ? block[0].replace(itemsBlock[0], '') : block[0], '');
  if (itemsBlock) collect(itemsBlock[0], '/items');

  const frontRoutes = new Set();
  for (const m of service.matchAll(/httpClient\.(get|post|put|patch|delete)(?:<[^>]*>)?\(\s*`([^`]+)`/g)) {
    const url = m[2]
      .replace('${BASE}', '/api/sales-quotation')
      .replace(/\$\{code\}/g, '{code}')
      .replace(/\$\{itemCode\}/g, '{itemCode}')
      .replace(/\$\{attachmentID\}/g, '{attachmentID}');
    frontRoutes.add(`${m[1].toUpperCase()} ${url}`);
  }

  const ghosts = [...frontRoutes].filter((r) => !backendRoutes.has(r));
  if (ghosts.length) throw new Error(`serviço chama rota inexistente: ${ghosts.join(' | ')}`);
  const unused = [...backendRoutes].filter((r) => !frontRoutes.has(r));
  if (unused.length) throw new Error(`rota do backend sem consumo no front: ${unused.join(' | ')}`);
  return `${backendRoutes.size} rota(s) cobertas`;
});

// ─── 5. Enums ────────────────────────────────────────────────────────────────

function tsListValues(src, constName) {
  const match = src.match(new RegExp(`export const ${constName}[^=]*=\\s*\\[([\\s\\S]*?)\\];`));
  if (!match) throw new Error(`constante ${constName} não encontrada`);
  const body = match[1];
  const objectValues = [...body.matchAll(/value:\s*'([^']+)'/g)].map((m) => m[1]);
  if (objectValues.length) return new Set(objectValues);
  return new Set([...body.matchAll(/'([^']+)'/g)].map((m) => m[1]));
}

function assertSameSet(a, b, what) {
  const missing = [...a].filter((v) => !b.has(v));
  const extra = [...b].filter((v) => !a.has(v));
  if (missing.length || extra.length) {
    throw new Error(`${what} divergente(s) — faltando no front: [${missing.join(', ')}]; sobrando no front: [${extra.join(', ')}]`);
  }
  return `${a.size} valor(es)`;
}

check('status do orçamento', () =>
  assertSameSet(goConstValues(goEntity, 'SalesQuotationStatus'), tsListValues(service, 'QUOTATION_STATUS'), 'status'));
check('tipos de orçamento', () =>
  assertSameSet(goConstValues(goEntity, 'SalesQuotationType'), tsListValues(service, 'QUOTATION_TYPES'), 'tipos'));
check('situações de liberação', () =>
  assertSameSet(goConstValues(goEntity, 'SalesQuotationRelease'), tsListValues(service, 'RELEASE_STATUS'), 'liberações'));
check('status de item', () => {
  const body = service.match(/ITEM_STATUS_LABEL[^=]*=\s*\{([\s\S]*?)\};/)[1];
  const labelled = new Set([...body.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]));
  return assertSameSet(goConstValues(goEntity, 'SalesQuotationItemStatus'), labelled, 'status de item');
});

check('tipos de frete aceitos', () => {
  const cases = goRules.match(/case ("FOB[\s\S]*?):\n/g) ?? [];
  const backendTypes = new Set();
  for (const c of cases) for (const m of c.matchAll(/"([^"]+)"/g)) backendTypes.add(m[1]);
  for (const m of goRules.matchAll(/case (?:"CIF CONTRAT\.")[^\n]*:/g)) for (const v of m[0].matchAll(/"([^"]+)"/g)) backendTypes.add(v[1]);
  for (const m of goRules.matchAll(/case "(CONVENIO)"/g)) backendTypes.add(m[1]);
  if (backendTypes.size < 8) throw new Error(`não foi possível extrair os tipos de frete do backend (achei ${backendTypes.size})`);
  return assertSameSet(backendTypes, tsListValues(service, 'FREIGHT_TYPES'), 'tipos de frete');
});

check('transições manuais de status', () => {
  const uc = read('internal/application/usecase/sales_quotation_uc/sales_quotation_uc.go');
  const fn = uc.match(/func validManualTransition[\s\S]*?\n\}/)[0];
  // O backend recusa explicitamente estes destinos em qualquer transição manual.
  const forbidden = ['CANCELLED', 'ATTENDED', 'EXPIRED'];
  const tsBlock = service.match(/QUOTATION_STATUS_TRANSITIONS[^=]*=\s*\{([\s\S]*?)\};/)[1];
  const offered = new Set([...tsBlock.matchAll(/'([^']+)'/g)].map((m) => m[1]));
  const leaked = forbidden.filter((s) => offered.has(s));
  if (leaked.length) throw new Error(`front oferece transição proibida: ${leaked.join(', ')}`);
  if (!fn.includes('SalesQuotationStatusVentureBudget')) throw new Error('backend mudou as transições — revise QUOTATION_STATUS_TRANSITIONS');
  return `${offered.size} destino(s) ofertado(s)`;
});

// ─── 6. Migration 000241 (fonte da verdade dos CHECKs) ───────────────────────

const migration = read('migrations/000241_sales_quotation_completion.up.sql');
const eventMigrationPath = path.join(BACKEND, 'migrations/000318_sales_quotation_item_events.up.sql');
const eventMigration = fs.existsSync(eventMigrationPath) ? fs.readFileSync(eventMigrationPath, 'utf8') : migration;

/** Valores de um `CHECK (coluna IN ('a','b',...))` da migration. */
function migrationCheckValues(column) {
  const source = column === 'event_type' ? eventMigration : migration;
  const m = source.match(new RegExp(`${column} IN \\(([^)]*)\\)`));
  if (!m) throw new Error(`CHECK de ${column} não encontrado na migration 000241`);
  return new Set([...m[1].matchAll(/'([^']+)'/g)].map((v) => v[1]));
}

check('status × CHECK da migration 000241', () =>
  assertSameSet(migrationCheckValues('status'), tsListValues(service, 'QUOTATION_STATUS'), 'status'));

check('tipos de evento × CHECK vigente', () => {
  const body = service.match(/EVENT_TYPE_LABEL[^=]*=\s*\{([\s\S]*?)\};/)[1];
  const labelled = new Set([...body.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]));
  return assertSameSet(migrationCheckValues('event_type'), labelled, 'tipos de evento');
});

check('status padrão de novo orçamento', () => {
  const dbDefault = migration.match(/ALTER COLUMN status SET DEFAULT '([^']+)'/)?.[1];
  const uc = read('internal/application/usecase/sales_quotation_uc/sales_quotation_uc.go');
  const ucDefault = uc.match(/status := entity\.SalesQuotationStatus(\w+)/)?.[1];
  const front = readFront('src/components/screens/comercial/Vvnd0300Page.tsx');
  const frontDefault = front.match(/EMPTY_QUOTATION[\s\S]*?status: "([^"]+)"/)?.[1];
  if (dbDefault !== frontDefault) throw new Error(`banco usa '${dbDefault}' e a tela cria com '${frontDefault}'`);
  if (ucDefault !== 'VentureBudget') throw new Error(`use case mudou o padrão (${ucDefault}) — revise a tela`);
  return `'${dbDefault}'`;
});

check('teto de anexo × CHECK da migration 000241', () => {
  const dbMax = Number(migration.match(/file_size <= (\d+)/)[1]);
  const ts = service.match(/MAX_ATTACHMENT_BYTES = ([^;]+);/)[1];
  const front = Function(`"use strict";return (${ts.replace(/\s/g, '')})`)();
  if (dbMax !== front) throw new Error(`banco ${dbMax} × front ${front}`);
  return `${dbMax} bytes`;
});

check('unicidade de sequência de item é tratada pelo front', () => {
  const base = read('migrations/000188_sales_quotation.up.sql');
  if (!/UNIQUE \(sales_quotation_code, sequence\)/.test(base)) return 'sem UNIQUE — tratamento desnecessário';
  if (!service.includes('isDuplicateSequenceError')) throw new Error('UNIQUE(orçamento, sequência) existe mas o front não trata a colisão');
  const screen = readFront('src/components/screens/comercial/Vvnd0300Page.tsx');
  if (!screen.includes('isDuplicateSequenceError')) throw new Error('a tela não usa o retry de sequência');
  return 'retry de sequência presente';
});

check('descancelamento reusa o motivo do cancelamento', () => {
  const repo = read('internal/infrastructure/repository/sales_quotation/repository.go');
  const uncancel = repo.match(/func \(r \*Repository\) Uncancel[\s\S]*?\n\}\n/)[0];
  const bound = /cancellation_reason_code=\$3/.test(uncancel);
  if (!bound) return 'backend não amarra mais o motivo — a trava do front pode ser afrouxada';
  if (!service.includes('findReasonByDescription')) throw new Error('backend exige o motivo original e o front não resolve o código');
  const screen = readFront('src/components/screens/comercial/Vvnd0300Page.tsx');
  if (!screen.includes('cancelledWith')) throw new Error('a tela deixa escolher motivo livre no descancelamento');
  return 'motivo travado na tela';
});

// ─── 7. Tipos de item (ItemType ganhou SERVICO na v1.1.0) ────────────────────

check('tipos de item do cadastro (VITM0100)', () => {
  const go = read('internal/domain/enums/types/ItemType.go');
  const backendTypes = new Set([...go.matchAll(/return "(\w+)"/g)].map((m) => m[1]).filter((v) => v !== 'UNKNOWN'));
  const screen = readFront('src/components/screens/engenharia/Vent0200Page.tsx');
  const block = screen.match(/const TIPOS_ITEM[^=]*=\s*\[([\s\S]*?)\];/)?.[1];
  if (!block) throw new Error('TIPOS_ITEM não encontrado na tela de cadastro de item');
  const front = new Set([...block.matchAll(/value:\s*"(\w+)"/g)].map((m) => m[1]));
  return assertSameSet(backendTypes, front, 'tipos de item');
});

check('limite de anexo', () => {
  const go = goConfig.match(/MaxAttachmentSize int64 = ([^\n]+)/)[1];
  const ts = service.match(/MAX_ATTACHMENT_BYTES = ([^;]+);/)[1];
  const evaluate = (expr) => Function(`"use strict";return (${expr.replace(/\s/g, '')})`)();
  if (evaluate(go) !== evaluate(ts)) throw new Error(`backend ${go} × front ${ts}`);
  return `${evaluate(ts)} bytes`;
});

// ─── Relatório ───────────────────────────────────────────────────────────────

const width = Math.max(...checks.map((c) => c.label.length));
for (const c of checks) {
  console.log(`${c.ok ? '✓' : '✗'} ${c.label.padEnd(width)}  ${c.detail}`);
}
console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} verificações de contrato passaram.`);
if (failures.length) {
  console.error(`\n${failures.length} divergência(s) entre front-end e backend.`);
  process.exit(1);
}

#!/usr/bin/env node
/**
 * Auditoria de deriva front-end → backend
 * ---------------------------------------------------------------------------
 * Complementa `audit-api-route-coverage.mjs`, que olha o sentido inverso
 * (rota do backend sem consumidor no front). Aqui procuramos o que o FRONT
 * inventou e o backend nunca teve:
 *
 *   A. ROTAS FANTASMA — `httpClient.get('/api/...')` para um caminho que não
 *      existe no `api.go`. Sintoma de serviço escrito contra documentação e
 *      nunca exercitado, ou de rota renomeada no backend.
 *   B. CAMPOS FANTASMA — chave lida por `parseNum/parseStr/parseBool/pick` que
 *      não aparece em NENHUMA tag `json:"..."` nem em nome de campo de struct
 *      do backend. Foi assim que `sales_table_code`, `freight_check`,
 *      `retention_value`, `icms_pct` e `attended_count` passaram despercebidos.
 *
 * O resultado é um RELATÓRIO — nem toda ocorrência é bug (há campo calculado no
 * front e endpoint de outro serviço). Use `--fail-on-ghost-routes` para travar
 * CI apenas no item A, que é objetivo.
 *
 * Uso:
 *   node scripts/audit-frontend-drift.mjs [caminho-do-backend] [--json] [--fail-on-ghost-routes]
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import process from 'node:process';

const BACKEND = resolve(process.argv[2]?.startsWith('-') ? '' : process.argv[2] ?? process.env.VENTURE_BACKEND_ROOT ?? '/home/felipepanosso/GolandProjects/panossoerp');
const AS_JSON = process.argv.includes('--json');
const FAIL_ON_GHOST = process.argv.includes('--fail-on-ghost-routes');

if (!existsSync(join(BACKEND, 'api/api.go'))) {
  console.warn(`⚠ backend não encontrado em ${BACKEND} — auditoria não executada.`);
  process.exit(0);
}

// ─── Universo do backend ─────────────────────────────────────────────────────

const goFiles = [];
(function walkGo(dir) {
  for (const name of readdirSync(dir)) {
    if (['vendor', '.git', 'node_modules'].includes(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walkGo(path);
    else if (name.endsWith('.go')) goFiles.push(path);
  }
})(join(BACKEND, 'internal'));
goFiles.push(join(BACKEND, 'api/api.go'));

/**
 * Toda chave que o backend pode emitir, em dois conjuntos separados de propósito:
 *
 *  - `jsonTags`  — nomes de tag `json:"..."`, o contrato explícito;
 *  - `goFields`  — nomes de campo Go, que structs SEM tag serializam em PascalCase.
 *
 * Manter separado importa: o `goFields` é um universo enorme (todo campo de todo
 * struct do backend) e um PascalCase coincidente de um struct sem relação nenhuma
 * mascara um snake_case errado. Foi assim que `planned_orders` passou batido na
 * primeira varredura — só apareceu ao investigar o `firm_orders` vizinho.
 */
const jsonTags = new Set();
const goFields = new Set();
for (const file of goFiles) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/json:"([^"]+)"/g)) {
    const key = m[1].split(',')[0];
    if (key && key !== '-') jsonTags.add(key);
  }
  for (const m of src.matchAll(/^\t([A-Z]\w*)\s+[\w*[\].]/gm)) goFields.add(m[1]);
}
const backendKeys = new Set([...jsonTags, ...goFields]);

/** `orders_planned` → `OrdersPlanned` (o PascalCase natural daquele snake_case). */
const toPascal = (snake) => snake.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');

// Rotas registradas (mesma varredura do audit-api-route-coverage.mjs).
const apiLines = readFileSync(join(BACKEND, 'api/api.go'), 'utf8').split(/\r?\n/);
const braces = (line) => {
  const clean = line.replace(/"(?:\\.|[^"\\])*"/g, '""').replace(/\/\/.*$/, '');
  return [...clean].reduce((t, c) => t + (c === '{' ? 1 : c === '}' ? -1 : 0), 0);
};
const routeStack = [];
const backendRoutes = new Set();
function addMountedHandlerRoutes(prefix, handlerVariable) {
  const stem = handlerVariable.replace(/Handler$/, '').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  const handlerDir = join(BACKEND, 'internal/interfaces/http/handler');
  const file = readdirSync(handlerDir).find((name) => name === `${stem}.go`);
  if (!file) return;
  const source = readFileSync(join(handlerDir, file), 'utf8');
  for (const mounted of source.matchAll(/\br\.(Get|Post|Put|Patch|Delete)\("([^"]+)"/g)) {
    backendRoutes.add(`${mounted[1].toUpperCase()} ${normalize(`${prefix}${mounted[2]}`)}`);
  }
}
let depth = 0;
for (const line of apiLines) {
  while (routeStack.length && depth < routeStack.at(-1).depth) routeStack.pop();
  const route = line.match(/r\.Route\("([^"]+)",\s*func\(r chi\.Router\)\s*\{/);
  if (route) {
    const prefix = route[1].startsWith('/api/') ? route[1] : `${routeStack.map((e) => e.path).join('')}${route[1]}`;
    routeStack.push({ path: route[1], full: prefix, depth: depth + braces(line) });
  }
  const method = line.match(/\br(?:\.With\(.*\))?\.(Get|Post|Put|Patch|Delete)\("([^"]+)"/);
  if (method) {
    const raw = method[2];
    const prefix = routeStack.length ? routeStack.at(-1).full : '';
    backendRoutes.add(`${method[1].toUpperCase()} ${normalize(raw.startsWith('/api/') || raw.startsWith('/users') ? raw : `${prefix}${raw}`)}`);
  }
  const mount = line.match(/r\.Mount\("\/",\s*([A-Za-z]\w*Handler)\.Routes\(\)\)/);
  if (mount && routeStack.length) addMountedHandlerRoutes(routeStack.at(-1).full, mount[1]);
  depth += braces(line);
}

function normalize(p) {
  return p
    .replace(/\$\{[^{}]*\}/g, '{}')         // template literal simples do TS
    .replace(/\{[A-Za-z_][\w]*\}/g, '{}')   // parâmetro chi
    .replace(/\/+$/, '') || '/';
}

/**
 * Caminho chamado pelo front, pronto para comparação. Interpolação com ternário
 * (`${qs ? '?'+qs : ''}`) não fecha no regex simples: nesses casos devolvemos o
 * prefixo estático e comparamos por prefixo, para não acusar falso positivo.
 */
function frontPath(raw) {
  const withoutQuery = raw.split('?')[0];
  let normalized = normalize(withoutQuery)
    // `${q}` colado no fim de um segmento é query string montada no serviço.
    .replace(/([^/]){\}$/, '$1');
  const cut = normalized.indexOf('${');
  return cut >= 0
    ? { path: normalize(normalized.slice(0, cut)).replace(/\/$/, ''), prefix: true }
    : { path: normalized, prefix: false };
}

/**
 * Casamento ESTRITO: literal com literal, e `{}` do front só com parâmetro do
 * backend. É o que vale para a maioria das chamadas.
 */
function routeMatchesStrict(frontRoute, backendRoute) {
  const [fMethod, fPath] = frontRoute.split(' ');
  const [bMethod, bPath] = backendRoute.split(' ');
  if (fMethod !== bMethod) return false;
  const f = fPath.split('/'), b = bPath.split('/');
  if (f.length !== b.length) return false;
  return f.every((seg, i) => seg === b[i] || b[i] === '{}');
}

/**
 * Casamento FROUXO: aceita UMA interpolação do front caindo sobre um segmento
 * literal do backend — o caso legítimo de `\`${BASE}/${segmento}\`` onde a
 * variável percorre uma lista de nomes de relatório. Mais de uma substituição
 * costuma ser coincidência (foi assim que `/{}/export/{}` casou por engano com
 * `/loads/{}/shipments`), então o limite é proposital.
 */
function routeMatchesLoose(frontRoute, backendRoute) {
  const [fMethod, fPath] = frontRoute.split(' ');
  const [bMethod, bPath] = backendRoute.split(' ');
  if (fMethod !== bMethod) return false;
  const f = fPath.split('/'), b = bPath.split('/');
  if (f.length !== b.length) return false;
  let substitutions = 0;
  for (let i = 0; i < f.length; i++) {
    if (f[i] === b[i] || b[i] === '{}') continue;
    if (f[i] === '{}') { substitutions++; continue; }
    return false;
  }
  return substitutions === 1;
}

// ─── Universo do front-end ───────────────────────────────────────────────────

const serviceDir = resolve('src/services');
const services = readdirSync(serviceDir).filter((f) => f.endsWith('.ts')).map((f) => ({
  name: f, src: readFileSync(join(serviceDir, f), 'utf8'),
}));

/** Resolve `${BASE}` e outros const string do próprio arquivo. */
function expandConstants(src) {
  let out = src;
  for (const m of src.matchAll(/const\s+([A-Z][A-Z0-9_]*)\s*=\s*['"]([^'"]+)['"]/g)) {
    out = out.split('${' + m[1] + '}').join(m[2]);
  }
  return out;
}

const ghostRoutes = [];
const suspectRoutes = [];
const ghostFields = [];
const suspectFields = [];

/** Campos que o front calcula/normaliza sozinho e não espera do backend. */
const LOCAL_ONLY = new Set(['data', 'result', 'item', 'record', 'value', 'items', 'results', 'list', 'records', 'rows', 'content', 'message', 'error', 'msg']);

for (const { name, src } of services) {
  const expanded = expandConstants(src);

  // A. rotas
  for (const m of expanded.matchAll(/httpClient\.(get|post|put|patch|delete)(?:<[^>]*>)?\(\s*[`'"]([^`'"]+)[`'"]/g)) {
    const method = m[1].toUpperCase();
    const { path, prefix } = frontPath(m[2]);
    if (!path.startsWith('/')) continue;
    const front = `${method} ${path}`;
    if (prefix) {
      if (![...backendRoutes].some((r) => r.startsWith(front))) ghostRoutes.push({ service: name, route: `${front}…` });
      continue;
    }
    if ([...backendRoutes].some((r) => routeMatchesStrict(front, r))) continue;
    const loose = [...backendRoutes].find((r) => routeMatchesLoose(front, r));
    if (loose) suspectRoutes.push({ service: name, route: front, candidate: loose });
    else ghostRoutes.push({ service: name, route: front });
  }

  // B. campos
  const seen = new Set();
  for (const m of expanded.matchAll(/(?:parseNum|parseStr|parseBool|parseDate|pick(?:<[^>]*>)?)\(\s*\w+\s*,\s*((?:'[^']+'\s*,?\s*)+)\)/g)) {
    const keys = [...m[1].matchAll(/'([^']+)'/g)].map((k) => k[1]);
    if (keys.some((k) => LOCAL_ONLY.has(k))) continue;
    const key = keys[0];
    if (seen.has(key)) continue;

    // Contrato explícito: alguma variante bate com uma tag json.
    if (keys.some((k) => jsonTags.has(k))) continue;

    seen.add(key);
    // Struct sem tag json serializa em PascalCase — legítimo, mas só quando o
    // PascalCase lido é o do PRÓPRIO snake_case (senão é coincidência com outro struct).
    const pascalHit = keys.find((k) => goFields.has(k) && keys.some((s) => toPascal(s) === k));
    if (pascalHit) suspectFields.push({ service: name, variants: keys.join(' | '), pascal: pascalHit });
    else ghostFields.push({ service: name, field: key, variants: keys.join(' | ') });
  }
}

// ─── Relatório ───────────────────────────────────────────────────────────────

if (AS_JSON) {
  console.log(JSON.stringify({
    backend_routes: backendRoutes.size, backend_keys: backendKeys.size,
    services: services.length, ghost_routes: ghostRoutes, suspect_routes: suspectRoutes, ghost_fields: ghostFields,
  }, null, 2));
} else {
  console.log(`Backend: ${backendRoutes.size} rotas, ${backendKeys.size} chaves conhecidas.`);
  console.log(`Front-end: ${services.length} serviços auditados.\n`);

  console.log(`── A. Rotas chamadas pelo front que não existem no backend (${ghostRoutes.length}) ──`);
  if (!ghostRoutes.length) console.log('   nenhuma.');
  const byService = new Map();
  for (const g of ghostRoutes) byService.set(g.service, [...(byService.get(g.service) ?? []), g.route]);
  for (const [service, routes] of [...byService].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`   ${service} (${routes.length})`);
    for (const r of routes) console.log(`      ${r}`);
  }

  console.log(`\n── A2. Interpolação caindo em segmento literal — conferir manualmente (${suspectRoutes.length}) ──`);
  if (!suspectRoutes.length) console.log("   nenhuma.");
  for (const s of suspectRoutes) console.log(`   ${s.service}: ${s.route}  →  candidato ${s.candidate}`);

  console.log(`\n── B. Campos lidos pelo front e ausentes no backend (${ghostFields.length}) ──`);
  if (!ghostFields.length) console.log('   nenhum.');
  const fieldsByService = new Map();
  for (const g of ghostFields) fieldsByService.set(g.service, [...(fieldsByService.get(g.service) ?? []), g.variants]);
  for (const [service, fields] of [...fieldsByService].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`   ${service} (${fields.length})`);
    for (const f of fields) console.log(`      ${f}`);
  }

  console.log(`\n── B2. Só casa em PascalCase — struct sem tag json (${suspectFields.length}) ──`);
  if (!suspectFields.length) console.log('   nenhum.');
  const sf = new Map();
  for (const g of suspectFields) sf.set(g.service, [...(sf.get(g.service) ?? []), g.variants]);
  for (const [service, fields] of [...sf].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`   ${service} (${fields.length}): ${fields.join(', ')}`);
  }
}

if (FAIL_ON_GHOST && ghostRoutes.length) {
  console.error(`\n${ghostRoutes.length} rota(s) fantasma.`);
  process.exit(1);
}

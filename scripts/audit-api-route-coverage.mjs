import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';

const backendRoot = resolve(process.argv[2] ?? process.env.VENTURE_BACKEND_ROOT ?? '');
if (!backendRoot || backendRoot === process.cwd()) {
  console.error('Uso: node scripts/audit-api-route-coverage.mjs /caminho/do/backend');
  process.exit(2);
}

const api = readFileSync(join(backendRoot, 'api/api.go'), 'utf8').split(/\r?\n/);
const routeStack = [];
const endpoints = [];
const topGroups = new Set();
let depth = 0;

const braces = (line) => {
  const clean = line.replace(/"(?:\\.|[^"\\])*"/g, '""').replace(/\/\/.*$/, '');
  return [...clean].reduce((total, char) => total + (char === '{' ? 1 : char === '}' ? -1 : 0), 0);
};

for (const line of api) {
  while (routeStack.length && depth < routeStack.at(-1).depth) routeStack.pop();
  const route = line.match(/r\.Route\("([^"]+)",\s*func\(r chi\.Router\)\s*\{/);
  if (route) {
    if (route[1].startsWith('/api/')) topGroups.add(route[1]);
    const prefix = route[1].startsWith('/api/') ? route[1] : `${routeStack.map((entry) => entry.path).join('')}${route[1]}`;
    routeStack.push({ path: route[1].startsWith('/api/') ? route[1] : route[1], full: prefix, depth: depth + braces(line) });
  }
  const method = line.match(/\br(?:\.With\(.*\))?\.(Get|Post|Put|Patch|Delete)\("([^"]+)"/);
  if (method) {
    const raw = method[2];
    const prefix = routeStack.length ? routeStack.at(-1).full : '';
    endpoints.push({ method: method[1].toUpperCase(), path: raw.startsWith('/api/') ? raw : `${prefix}${raw}` });
  }
  depth += braces(line);
}

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'dist', 'target', '.git'].includes(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(ts|tsx|mjs)$/.test(name)) files.push({ path, content: readFileSync(path, 'utf8') });
  }
};
walk(resolve('src')); walk(resolve('scripts'));

const groups = [...topGroups, '/api/audit-log'];
const normalize = (value) => value.replace(/\$\{[^}]+\}|\{[A-Za-z_][A-Za-z0-9_]*\}/g, '{}').replace(/\/$/, '');
const expandLocalConstants = (content) => {
  const constants = new Map();
  for (const match of content.matchAll(/const\s+([A-Z][A-Z0-9_]*)\s*=\s*['"]([^'"]+)['"]/g)) constants.set(match[1], match[2]);
  let expanded = content;
  for (const [name, value] of constants) expanded = expanded.split(`\${${name}}`).join(value);
  return expanded;
};
const technical = endpoints.filter((endpoint) => endpoint.path === '/health' || endpoint.path.startsWith('/health/') || endpoint.path === '/metrics');
/**
 * Um caminho do front com `{}` casa qualquer segmento do endpoint. Serve para
 * CRUDs genéricos, onde o recurso é uma variável e não um literal.
 */
function contentCobreComCuringa(content, endpointPath) {
  const segmentos = endpointPath.split('/').filter(Boolean);
  if (segmentos.length < 2) return false;
  for (let i = 1; i < segmentos.length; i += 1) {
    const comCuringa = '/' + segmentos.map((s, n) => (n === i ? '{}' : s)).join('/');
    if (content.includes(comCuringa)) return true;
  }
  return false;
}

const missing = [];
for (const endpoint of endpoints) {
  if (technical.includes(endpoint)) continue;
  const group = groups.filter((candidate) => endpoint.path.startsWith(candidate)).sort((a, b) => b.length - a.length)[0] ?? `/${endpoint.path.split('/').filter(Boolean).slice(0, 2).join('/')}`;
  const candidates = files.filter((file) => file.content.includes(group));
  const full = normalize(endpoint.path);
  const suffix = normalize(endpoint.path.slice(group.length)) || '/';
  const covered = candidates.some((file) => {
    const content = normalize(expandLocalConstants(file.content));
    if (content.includes(full) || (suffix !== '/' && (content.includes(suffix) || content.includes(suffix.slice(1))))) return true;
    // Caminho montado em runtime: `${SUPPORT}/${resource}/${code}` normaliza
    // para `/api/customers/support/{}/{}` e cobre todos os recursos de apoio.
    // Sem isso o relatório acusava como ausente cada PUT que passa por um CRUD
    // genérico — e a lista de "faltando" enchia de falso positivo.
    return contentCobreComCuringa(content, full);
  });
  if (!covered) missing.push(endpoint);
}

const uniqueMissing = [...new Map(missing.map((item) => [`${item.method} ${item.path}`, item])).values()];
console.log(JSON.stringify({ endpoints: endpoints.length, technical_excluded: technical.length, potential_missing: uniqueMissing.length, missing: uniqueMissing }, null, 2));
if (process.argv.includes('--fail-on-missing') && uniqueMissing.length) process.exit(1);

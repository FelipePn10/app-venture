import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const hostPath = resolve(root, 'src/components/screens/ScreenHostPage.tsx');
const host = readFileSync(hostPath, 'utf8');
const auth = readFileSync(resolve(root, 'src/services/authService.ts'), 'utf8');
const catalog = readFileSync(resolve(root, 'src/types/erpScreen.ts'), 'utf8');
const routines = readFileSync(resolve(root, 'src/components/screens/operationalRoutines.ts'), 'utf8');
const help = readFileSync(resolve(root, 'HELP_TELAS_ERP.md'), 'utf8');

const imports = new Map();
for (const match of host.matchAll(/import \{ (\w+) \} from "(\.\/[^";]+)";/g)) {
  imports.set(match[1], resolve(root, 'src/components/screens', `${match[2].slice(2)}.tsx`));
}

const registered = new Set();
for (const match of host.matchAll(/^\s*[A-Z][A-Z0-9]+:\s*<(\w+)\b/gm)) registered.add(match[1]);

const forbidden = [
  { pattern: /\bMOCK_[A-Z0-9_]+\b/, label: 'constante MOCK_' },
  { pattern: /\b[A-Z0-9_]+_MOCK\b/, label: 'constante _MOCK' },
  { pattern: /await new Promise\([^\n]*setTimeout/, label: 'espera simulando chamada remota' },
  { pattern: /\/\/\s*Simulate API call/i, label: 'chamada de API simulada' },
  { pattern: /(?:será|sera) implementad[ao]/i, label: 'função declarada como não implementada' },
  { pattern: /\bmock(?:Results?|Rows?|Data|List|Itens|Pedidos|Cargas)\b/i, label: 'dados nomeados como mock' },
];

const failures = [];
for (const component of registered) {
  const file = imports.get(component);
  if (!file) continue;
  const source = readFileSync(file, 'utf8');
  for (const rule of forbidden) {
    if (rule.pattern.test(source)) failures.push(`${component} (${file.replace(`${root}/`, '')}): ${rule.label}`);
  }
}

const productionFiles = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.(ts|tsx)$/.test(name)) productionFiles.push(path);
  }
};
walk(resolve(root, 'src'));
for (const file of productionFiles) {
  const source = readFileSync(file, 'utf8');
  for (const rule of forbidden) {
    if (rule.pattern.test(source)) failures.push(`${file.replace(`${root}/`, '')}: ${rule.label}`);
  }
}

if (/VITE0129:\s*<Vite0129Page/.test(host)) failures.push('VITE0129 ainda aponta para a implementação simulada');
if (/VIMP010[12]:\s*<Vimp010[12]Page/.test(host)) failures.push('rotina de importação ainda aponta para implementação simulada');
if (/USE_MOCK_AUTH|simulateLogin|mock-jwt-token/.test(auth)) failures.push('autenticação simulada ainda disponível');

const catalogCodes = new Set([...catalog.matchAll(/code:\s*["']([A-Z][A-Z0-9]+)["']/g)].map((match) => match[1]));
const explicitCodes = new Set([...host.matchAll(/^\s*([A-Z][A-Z0-9]+):\s*</gm)].map((match) => match[1]));
const operationalCodes = new Set([...routines.matchAll(/^\s*([A-Z][A-Z0-9]+):\s*routine\(/gm)].map((match) => match[1]));
for (const match of routines.matchAll(/alias\(["']([A-Z][A-Z0-9]+)["'],\s*["'][^"']+["'],\s*["']([A-Z][A-Z0-9]+)["']\)/g)) {
  operationalCodes.add(match[1]);
  if (!operationalCodes.has(match[2])) failures.push(`${match[1]}: alias aponta para rotina operacional inexistente ${match[2]}`);
}
for (const code of catalogCodes) {
  if (!explicitCodes.has(code) && !operationalCodes.has(code)) failures.push(`${code}: tela consta no catálogo, mas cai em "Tela ainda não implementada"`);
  if (!new RegExp(`\\b${code}\\b`).test(help)) failures.push(`${code}: tela consta no catálogo, mas não aparece no HELP_TELAS_ERP.md`);
}

if (failures.length) {
  console.error(`Telas registradas com simulação (${failures.length}):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`Sem mocks em ${productionFiles.length} arquivos de produção; ${catalogCodes.size} telas do catálogo possuem implementação registrada.`);

#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const COMPONENTS = join(ROOT, 'src/components');
const files = [];
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
  const path = join(dir, entry.name);
  if (entry.isDirectory()) walk(path);
  else if (/\.tsx?$/.test(entry.name)) files.push(path);
});
walk(COMPONENTS);

const errors = [];
let assistedCodeFields = 0;
const add = (file, rule, excerpt) => errors.push(`${relative(ROOT, file)} — ${rule}: ${excerpt.trim().slice(0, 150)}`);

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const lines = source.split(/\r?\n/);
  lines.forEach((line) => {
    if (!line.trim().startsWith('//') && /POST\s+\/api\/|GET\s+\/api\/|PUT\s+\/api\/|DELETE\s+\/api\//i.test(line)) add(file, 'rota HTTP visível', line);
    if (/UUID_DO_USUARIO|UUID do usu[aá]rio/i.test(line) && !file.endsWith('OperationalRoutinePage.tsx') && !file.endsWith('operationalRoutines.ts')) add(file, 'UUID solicitado ao operador', line);
    if (/>\s*(DRAFT|APPROVED|OBSOLETE|PLANNED|ACTIVE|INACTIVE|CANCELLED)\s*</.test(line)) add(file, 'situação em inglês visível', line);
    if (/placeholder=["'][^"']*\b(PENDING|APPROVED|CANCELLED|YYYY|SEARCH|SELECT)\b/i.test(line)) add(file, 'exemplo em inglês visível', line);
  });

  const manualCode = /<label[^>]*>[^<]*(Item|Máquina|Fornecedor|Cliente|Almoxarifado)[^<]*<\/label>[\s\S]{0,350}<input[^>]+type=["']number["']/gi;
  for (const match of source.matchAll(manualCode)) {
    const block = match[0];
    if (!/LookupField/.test(block) && !/readOnly/.test(block)) assistedCodeFields += 1;
  }
}

const host = readFileSync(join(COMPONENTS, 'screens/ScreenHostPage.tsx'), 'utf8');
if (!host.includes('<EntityLookupAssist')) errors.push('ScreenHostPage.tsx — assistência global de pesquisa não está registrada.');

const lookups = readFileSync(join(ROOT, 'src/services/lookups.ts'), 'utf8');
if (lookups.includes("loadEndpoint('/api/enterprise',")) {
  errors.push('src/services/lookups.ts — rota inexistente: use /api/enterprise/list no seletor de empresas.');
}

if (errors.length) {
  console.error(`Auditoria de usabilidade encontrou ${errors.length} problema(s):\n`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Auditoria de usabilidade aprovada em ${files.length} arquivo(s): sem rotas HTTP visíveis, UUID manual ou situações inglesas conhecidas. ${assistedCodeFields} campo(s) numérico(s) legado(s) recebem lupa pela assistência global.`);

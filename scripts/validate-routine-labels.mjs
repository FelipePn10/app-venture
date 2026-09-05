#!/usr/bin/env node
/**
 * Trava as três regressões de usabilidade das rotinas operacionais:
 *   1. todo campo lido do backend tem tradução (senão a tela mostra inglês);
 *   2. nenhuma data ISO cai em campo de texto;
 *   3. duas operações da mesma rotina nunca têm o mesmo nome no menu.
 *
 * Rode com: npm run test:rotulos
 */
import fs from 'node:fs';

const checks = [];
function check(name, condition, detail = '') {
  checks.push(name);
  console.log(`✓ ${name}`);
  if (!condition) {
    console.error(`\n✖ Falhou: ${name}${detail ? `\n${detail}` : ''}`);
    process.exit(1);
  }
}

const page = fs.readFileSync('src/components/screens/OperationalRoutinePage.tsx', 'utf8');
const routines = fs.readFileSync('src/components/screens/operationalRoutines.ts', 'utf8');

// ── 1. Dicionário de rótulos ────────────────────────────────────────────────
const dicionario = fs.readFileSync('src/utils/fieldLabels.ts', 'utf8');
const start = dicionario.indexOf('export const FIELD_LABELS: Record<string, string> = {');
const block = dicionario.slice(start, dicionario.indexOf('\n};', start));
const labels = new Set([...block.matchAll(/(?:^|[{,\s])([a-z0-9_]+)\s*:\s*"/g)].map((m) => m[1]));
const keys = new Set([...routines.matchAll(/"([a-z][a-z0-9_]{2,})"\s*:/g)].map((m) => m[1]));
const untranslated = [...keys].filter((k) => !labels.has(k));
check(
  `todos os ${keys.size} campos das rotinas têm rótulo em português`,
  untranslated.length === 0,
  `  sem tradução em LABELS: ${untranslated.join(', ')}`,
);

// ── 2. Datas ISO ────────────────────────────────────────────────────────────
// A tela decide pelo valor: qualquer ISO-8601 vira seletor de data/hora.
check(
  'campos de data são detectados pelo valor, não só pelo nome',
  /const ISO_DATE_TIME =/.test(page) && /isIsoDateTime\(value\)/.test(page),
);
const isoFields = [...routines.matchAll(/"([a-z][a-z0-9_]*)"\s*:\s*"(\d{4}-\d{2}-\d{2}T[\d:]+Z?)"/g)];
check(
  `${isoFields.length} campo(s) ISO nas rotinas usam seletor de data/hora`,
  isoFields.length > 0,
);

// ── 3. Nomes de operação ────────────────────────────────────────────────────
const DEFAULTS = { list: 'Consultar', create: 'Cadastrar', remove: 'Desativar / excluir' };
const ops = new Map();
let current = null;
for (const line of routines.split('\n')) {
  const m = line.match(/routine\("(V[A-Z]{3}\d{4})"/);
  if (m) { current = m[1]; ops.set(current, []); }
  if (!current) continue;
  for (const l of line.matchAll(/label:\s*"([^"]+)"\s*,\s*method:/g)) ops.get(current).push(l[1]);
  for (const h of line.matchAll(/(?:^|[\s,([])(list|create|remove)\(((?:[^()']|'[^']*'|\([^)]*\))*)\)/g)) {
    const own = [...h[2].matchAll(/"([^"]+)"\s*$/g)];
    ops.get(current).push(own.length ? own[own.length - 1][1] : DEFAULTS[h[1]]);
  }
}
const duplicated = [];
for (const [code, list] of ops) {
  const seen = new Map();
  for (const l of list) seen.set(l, (seen.get(l) ?? 0) + 1);
  const dups = [...seen].filter(([, n]) => n > 1);
  if (dups.length) duplicated.push(`${code}: ${dups.map(([l, n]) => `"${l}" ×${n}`).join(', ')}`);
}
check(
  `as ${ops.size} rotinas não repetem nomes de operação`,
  duplicated.length === 0,
  duplicated.map((d) => `  ${d}`).join('\n'),
);

// ── 4. Nada de JSON cru nem "(id)" na interface ─────────────────────────────
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

function telas(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const f = path.join(dir, e);
    if (statSync(f).isDirectory()) out.push(...telas(f));
    else if (f.endsWith('.tsx')) out.push(f);
  }
  return out;
}
const arquivos = telas('src/components/screens');
const comJson = arquivos.filter((f) => /JSON\.stringify\([^)]*null,\s*2\)/.test(fs.readFileSync(f, 'utf8')));
check(
  `nenhuma das ${arquivos.length} telas despeja JSON cru`,
  comJson.length === 0,
  comJson.map((f) => `  ${f}`).join('\n'),
);
const comId = arquivos.filter((f) => /label">[^<]*\(id\)|tgroup-label">[^<]*\(id\)/.test(fs.readFileSync(f, 'utf8')));
check(
  'nenhum rótulo de campo mostra "(id)" ao usuário',
  comId.length === 0,
  comId.map((f) => `  ${f}`).join('\n'),
);

console.log(`\n${checks.length}/${checks.length} validações de rótulos das rotinas aprovadas.`);

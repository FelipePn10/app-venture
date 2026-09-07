#!/usr/bin/env node
/**
 * Varredura de rotas — exercita contra um ambiente vivo tudo que o front chama
 * por GET e reprova duas coisas que teste estático não pega:
 *
 *   - **5xx**: validação devolvida como erro de servidor. Foi assim que
 *     "ano 1 inválido" virava 500 genérico no Gantt do APS, e que
 *     `item.is_active` (coluna que não existe) derrubava as classificações de
 *     interesse do representante.
 *   - **resposta em inglês**: mensagem não traduzida chegando ao usuário.
 *
 * Uso:
 *   TOK_FILE=/caminho/token API_URL=http://localhost:5070 \
 *     node scripts/audit-route-sweep.mjs
 *
 * Sem TOK_FILE, faz login com EMAIL/PASSWORD.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const API = process.env.API_URL ?? 'http://localhost:5070';
const TOKEN = await (async () => {
  if (process.env.TOK_FILE) return readFileSync(process.env.TOK_FILE, 'utf8').trim();
  const r = await fetch(`${API}${process.env.LOGIN_PATH ?? '/users/login'}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.EMAIL, password: process.env.PASSWORD }),
  });
  if (!r.ok) throw new Error(`login falhou (${r.status}) — informe TOK_FILE ou EMAIL/PASSWORD`);
  return (await r.json()).token;
})();

const files = [];
(function w(d){for(const n of readdirSync(d)){const p=join(d,n);if(statSync(p).isDirectory())w(p);else if(/\.ts$/.test(n))files.push(p);}})(resolve('src/services'));

const rotas = new Set();
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  // Quase todo serviço declara `const BASE = '/api/...'` e monta a URL com
  // template. Sem resolver a constante, dois terços das rotas ficavam de fora.
  const base = src.match(/const\s+BASE\s*=\s*['"`]([^'"`]+)['"`]/)?.[1] ?? '';
  const resolve1 = (u) => u.replace(/\$\{BASE\}/g, base);
  for (const m of src.matchAll(/httpClient\.get\s*(?:<[^>]*>)?\s*\(\s*[`'"]([^`'"]+)[`'"]/g)) rotas.add(resolve1(m[1]));
  for (const m of src.matchAll(/method:\s*['"]GET['"][^}]*?path:\s*['"]([^'"]+)['"]/g)) rotas.add(m[1]);
}
// As rotinas operacionais também declaram caminhos GET.
{
  const src = readFileSync(resolve('src/components/screens/operationalRoutines.ts'), 'utf8');
  for (const m of src.matchAll(/(?:list|remove)\(\s*["'`]([^"'`]+)["'`]/g)) rotas.add(m[1]);
  for (const m of src.matchAll(/method:\s*"GET",\s*path:\s*"([^"]+)"/g)) rotas.add(m[1]);
}

// substitui interpolações por valores plausíveis já existentes no dev
const SUBS = { itemCode:'900001', code:'1', id:'1', supplierCode:'1', customerCode:'1', warehouseId:'1',
  parentItemCode:'900001', orderId:'1', varId:'1', setId:'1', priceID:'1', attachmentID:'1', status:'OPEN',
  quotationCode:'1', routeId:'1', opId:'1', serialId:'1', toolLinkId:'1', charLinkId:'1', revId:'1', distId:'1',
  partId:'1', langId:'1', recvId:'1', resourceId:'1', productionOrderID:'1', supplierScorecardId:'1' };

const concretas = [...rotas]
  .map((r) => r.replace(/\$\{[^}]*\}|\{[a-zA-Z_]+\}/g, (t) => {
      const nome = t.replace(/[${}]/g, '').replace(/^encodeURIComponent\(|\)$/g, '').trim();
      const chave = Object.keys(SUBS).find((k) => nome.toLowerCase().includes(k.toLowerCase()));
      return chave ? SUBS[chave] : '1';
    }))
  .filter((r) => r.startsWith('/') && !r.includes('${'));

const INGLES = /\b(invalid|not found|failed|error occurred|unauthorized|forbidden|missing|required field|internal server error|cannot|unable to|does not exist|already exists|bad request|unexpected)\b/i;

const cincoXX = [], ingles = [];
let ok = 0;
for (const rota of [...new Set(concretas)].sort()) {
  try {
    const r = await fetch(API + rota, { headers: { Authorization: `Bearer ${TOKEN}` } });
    const txt = (await r.text()).slice(0, 400);
    if (r.status >= 500) cincoXX.push(`${r.status} ${rota} :: ${txt.slice(0,150)}`);
    else if (INGLES.test(txt) && txt.length < 400) ingles.push(`${r.status} ${rota} :: ${txt.slice(0,150)}`);
    else ok++;
  } catch (e) { cincoXX.push(`ERRO ${rota} :: ${e.message}`); }
}
console.log(`rotas exercitadas: ${new Set(concretas).size} | limpas: ${ok}`);
console.log(`\n── 5xx (${cincoXX.length}) ──`); cincoXX.forEach((l)=>console.log('  '+l));
console.log(`\n── resposta com inglês (${ingles.length}) ──`); ingles.forEach((l)=>console.log('  '+l));


if (cincoXX.length > 0) {
  console.error(`\n✗ ${cincoXX.length} rota(s) respondendo 5xx.`);
  process.exit(1);
}
if (ingles.length > 0) {
  console.error(`\n✗ ${ingles.length} resposta(s) em inglês.`);
  process.exit(1);
}
console.log('\nTodas as rotas responderam sem 5xx e em português.');

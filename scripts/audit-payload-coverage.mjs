#!/usr/bin/env node
/**
 * Auditoria de payload: o que o front manda × o que o backend aceita
 * ---------------------------------------------------------------------------
 * `audit-frontend-drift.mjs` olha o que o front **lê** das respostas. Aqui
 * olhamos o outro lado — o que o front **escreve** nas requisições — e o que o
 * backend aceita e ninguém preenche:
 *
 *   A. CHAVE DESCARTADA — chave enviada num corpo de POST/PUT/PATCH que não
 *      existe em nenhuma tag `json:"..."` de DTO de request. O Go ignora chave
 *      desconhecida em silêncio: a requisição volta 200/201 e o dado
 *      simplesmente não foi gravado. É o bug mais caro do conjunto, porque não
 *      dá erro em lugar nenhum.
 *
 *   B. CAMPO ÓRFÃO — campo que o backend aceita num DTO de request e que
 *      NENHUM serviço do front envia. Nem todo caso é falha (há campo
 *      preenchido pelo JWT ou por outro fluxo), mas é a lista onde moram as
 *      telas incompletas.
 *
 * Uso:
 *   node scripts/audit-payload-coverage.mjs [caminho-do-backend] [--json]
 *   node scripts/audit-payload-coverage.mjs --fail-on-dropped   # trava só o item A
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const BACKEND = resolve(
  args.find((a) => !a.startsWith('-')) ??
  process.env.VENTURE_BACKEND_ROOT ??
  '/home/felipepanosso/GolandProjects/panossoerp-ajustes',
);
const AS_JSON = args.includes('--json');
const FAIL_ON_DROPPED = args.includes('--fail-on-dropped');

if (!existsSync(join(BACKEND, 'api/api.go'))) {
  console.warn(`⚠ backend não encontrado em ${BACKEND} — auditoria não executada.`);
  process.exit(0);
}

// ─── O que o backend aceita ──────────────────────────────────────────────────

/** Todos os arquivos .go de um diretório, recursivamente. */
function goFiles(dir) {
  const out = [];
  (function walk(d) {
    if (!existsSync(d)) return;
    for (const name of readdirSync(d)) {
      if (['vendor', '.git', 'node_modules'].includes(name)) continue;
      const path = join(d, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith('.go') && !name.endsWith('_test.go')) out.push(path);
    }
  })(dir);
  return out;
}

/**
 * Tags aceitas em corpo de requisição. Vêm dos DTOs de request e também dos
 * value objects que eles aninham (peso, dimensões, endereço…), por isso o
 * domínio inteiro entra no universo — um campo aninhado é tão aceito quanto um
 * de primeiro nível.
 */
const aceitas = new Map(); // tag -> Set(arquivo)
const TAG = /json:"([^",]+)/g;
// Para o item A o universo é o backend inteiro: uma tag declarada em qualquer
// struct significa que a chave existe no vocabulário do sistema. Restringir a
// `dto/request` produzia falso positivo em massa — o DTO real do endpoint pode
// morar em outro pacote.
for (const file of goFiles(join(BACKEND, 'internal'))) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(TAG)) {
    const tag = m[1].trim();
    if (!tag || tag === '-') continue;
    if (!aceitas.has(tag)) aceitas.set(tag, new Set());
    aceitas.get(tag).add(basename(file));
  }
}

/** Campos de request que ninguém preenche pelo corpo (vêm do JWT ou da URL). */
const naoVemDoCorpo = new Set();
for (const file of goFiles(join(BACKEND, 'internal/application/dto/request'))) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/(\w+)\s+[^\n`]+`json:"-"/g)) naoVemDoCorpo.add(m[1]);
}

// ─── O que o front envia ─────────────────────────────────────────────────────

const frontFiles = [];
(function walkTs(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walkTs(path);
    else if (/\.tsx?$/.test(name)) frontFiles.push(path);
  }
})(resolve('src'));

/**
 * Chaves de objeto que aparecem depois de um post/put/patch. Regex é
 * aproximação, mas o corpo dessas chamadas é sempre um literal no serviço —
 * e é justamente onde a chave errada se esconde.
 */
const enviadas = new Map(); // chave -> Set("arquivo:linha")
const CHAMADA = /httpClient\.(post|put|patch)\s*(<[^>]*>)?\s*\(/g;

for (const file of frontFiles) {
  const src = readFileSync(file, 'utf8');
  const rel = file.replace(resolve('.') + '/', '');
  for (const call of src.matchAll(CHAMADA)) {
    // Recorta os argumentos da chamada e fica com o segundo — o corpo. O
    // terceiro é o objeto de opções do axios (`params`, `headers`), que não vai
    // no corpo e não pode entrar na conta.
    let i = call.index + call[0].length;
    let profundidade = 1;
    const inicio = i;
    const virgulas = [];
    for (; i < src.length && profundidade > 0; i++) {
      const c = src[i];
      if ('([{'.includes(c)) profundidade++;
      else if (')]}'.includes(c)) { profundidade--; if (profundidade === 0) break; }
      else if (c === ',' && profundidade === 1) virgulas.push(i);
    }
    if (virgulas.length === 0) continue;
    const corpo = src.slice(virgulas[0] + 1, virgulas[1] ?? i).trim();
    let literal = corpo;
    let linha = src.slice(0, virgulas[0]).split('\n').length;
    if (!literal.startsWith('{')) {
      // Muitos serviços montam o corpo numa variável antes de enviar. Sem
      // seguir a declaração, metade dos payloads do sistema ficava fora da
      // auditoria — justamente os maiores, que é onde a chave errada se esconde.
      const nome = literal.match(/^[A-Za-z_$][\w$]*$/)?.[0];
      if (!nome) continue;
      const decl = new RegExp(`(?:const|let|var)\\s+${nome}\\s*(?::[^=]+)?=\\s*\\{`);
      const m = decl.exec(src);
      if (!m) continue;
      let j = m.index + m[0].length - 1, d2 = 0;
      const ini = j;
      for (; j < src.length; j++) {
        const c = src[j];
        if ('([{'.includes(c)) d2++;
        else if (')]}'.includes(c)) { d2--; if (d2 === 0) { j++; break; } }
      }
      literal = src.slice(ini, j);
      linha = src.slice(0, ini).split('\n').length;
    }
    const corpoFinal = literal;
    for (const k of corpoFinal.matchAll(/(?:^|[\s{,])['"]?([a-z][a-z0-9_]{2,})['"]?\s*:/gm)) {
      enviadas.set(k[1], (enviadas.get(k[1]) ?? new Set()).add(`${rel}:${linha}`));
    }
  }
}

// ─── Cruzamento ──────────────────────────────────────────────────────────────

/** Chaves que o front usa como opção do axios, não como campo do corpo. */
const OPCOES_DO_CLIENTE = new Set([
  'params', 'headers', 'timeout', 'signal', 'responseType', 'baseURL',
  'onUploadProgress', 'onDownloadProgress', 'validateStatus', 'withCredentials',
  'transformRequest', 'transformResponse', 'maxRedirects', 'auth', 'data',
  // Palavras da linguagem que o recorte por regex captura em ternário
  // (`x == null ? undefined : y`) e que não são chave de objeto.
  'undefined', 'null', 'true', 'false',
]);

const descartadas = [...enviadas.entries()]
  .filter(([k]) => !aceitas.has(k) && !OPCOES_DO_CLIENTE.has(k))
  .map(([k, onde]) => ({ chave: k, ocorrencias: [...onde].sort() }))
  .sort((a, b) => b.ocorrencias.length - a.ocorrencias.length);

// Item B é o contrário: só o que é de fato entrada de requisição conta, senão
// o relatório vira a lista de todo campo de todo struct do sistema.
const aceitasNoCorpo = new Map();
for (const file of goFiles(join(BACKEND, 'internal/application/dto/request'))) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(TAG)) {
    const tag = m[1].trim();
    if (!tag || tag === '-') continue;
    if (!aceitasNoCorpo.has(tag)) aceitasNoCorpo.set(tag, new Set());
    aceitasNoCorpo.get(tag).add(basename(file));
  }
}

/**
 * Para o item B o critério é mais conservador: a chave é órfã quando não
 * aparece em NENHUM lugar do front — nem enviada, nem lida, nem citada num
 * exemplo de rotina. Payload montado na tela e repassado por uma função de
 * serviço não é rastreável por regex, e acusar esses casos encheria o relatório
 * de falso positivo. Se a chave não existe no código, ela seguramente não é
 * preenchida por ninguém.
 */
const textoDoFront = frontFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
const citada = (chave) => new RegExp(`\\b${chave}\\b`).test(textoDoFront);

const orfaos = [...aceitasNoCorpo.entries()]
  .filter(([k]) => !enviadas.has(k) && !citada(k))
  .map(([k, arquivos]) => ({ chave: k, dtos: [...arquivos].sort() }))
  .filter((o) => o.dtos.some((d) => !d.startsWith('vo_') ))
  .sort((a, b) => a.chave.localeCompare(b.chave));

if (AS_JSON) {
  console.log(JSON.stringify({ descartadas, orfaos_total: orfaos.length, orfaos }, null, 2));
} else {
  console.log(`Auditoria de payload — backend: ${BACKEND}`);
  console.log('─'.repeat(78));
  console.log(`\n── A. Chaves enviadas que o backend descarta em silêncio (${descartadas.length}) ──`);
  if (descartadas.length === 0) console.log('   nenhuma.');
  for (const d of descartadas.slice(0, 40)) {
    console.log(`   ${d.chave}  →  ${d.ocorrencias.slice(0, 3).join(' · ')}${d.ocorrencias.length > 3 ? ` (+${d.ocorrencias.length - 3})` : ''}`);
  }
  console.log(`\n── B. Campos que o backend aceita e o front nunca envia (${orfaos.length}) ──`);
  console.log('   (relatório: há campo preenchido pelo JWT, pela URL ou por outro fluxo)');
  for (const o of orfaos.slice(0, 60)) {
    console.log(`   ${o.chave.padEnd(40)} ${o.dtos.slice(0, 2).join(', ')}`);
  }
  if (orfaos.length > 60) console.log(`   … e mais ${orfaos.length - 60}.`);
}

// ─── C. Chave certa no lugar errado ──────────────────────────────────────────
//
// A verificação A é conservadora de propósito: uma chave declarada em qualquer
// DTO passa. Isso deixa escapar o caso pior de todos — a chave existe no
// sistema, mas não no DTO **daquele** endpoint. Foi assim que o vencimento do
// fornecedor ia com `payment_condition_code` onde o DTO pede
// `payment_condition_id`, e a condição de pagamento nunca era gravada.
//
// Aqui a checagem é por par de nomes quase iguais: `x_code` enviado onde só
// existe `x_id` (e vice-versa) na vizinhança do mesmo conceito.
const parecidas = [];
for (const [chave, onde] of enviadas) {
  const alternativa = chave.endsWith('_code') ? chave.replace(/_code$/, '_id')
    : chave.endsWith('_id') ? chave.replace(/_id$/, '_code') : null;
  if (!alternativa || !aceitasNoCorpo.has(alternativa) || aceitasNoCorpo.has(chave)) continue;
  parecidas.push({ chave, alternativa, ocorrencias: [...onde].sort() });
}

if (!AS_JSON) {
  console.log(`\n── C. Enviada com o nome vizinho do que o DTO aceita (${parecidas.length}) ──`);
  if (parecidas.length === 0) console.log('   nenhuma.');
  for (const p of parecidas) {
    console.log(`   ${p.chave} → o DTO aceita ${p.alternativa}  ·  ${p.ocorrencias.slice(0, 2).join(' · ')}`);
  }
}

// O item C é lista de revisão, não trava: há endpoint cujo struct de request
// mora no próprio handler e não em `dto/request`, e essas chaves aparecem aqui
// sem serem erro. Vale a conferência manual — foi assim que `mask_id` (o DTO
// pede `lot_mask_id`) apareceu.

if (FAIL_ON_DROPPED && descartadas.length > 0) {
  console.error(`\n✗ ${descartadas.length} chave(s) enviadas e descartadas pelo backend.`);
  process.exit(1);
}

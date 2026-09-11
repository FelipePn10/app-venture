#!/usr/bin/env node
/**
 * Auditoria de isolamento multiempresa.
 *
 * Varredura estática de SQL não serve aqui: metade das queries `.sql` do sqlc
 * é código morto (o repositório de almoxarifado, por exemplo, monta o SQL na
 * mão *com* o filtro, enquanto `warehouse.sql` segue sem ele). Quem responde
 * ao usuário é a rota, então é a rota que precisa ser exercitada.
 *
 * O critério é a **sobreposição de registros**: a mesma rota é chamada pelas
 * duas empresas e o teste reprova quando um registro idêntico aparece nas duas
 * respostas. Duas empresas distintas não têm registro em comum — se têm, uma
 * está enxergando o dado da outra.
 *
 * Contar registros da sonda não serviria: ela passa a ter auditoria própria no
 * instante em que alguém exercita a API com ela, e o teste começaria a acusar
 * o dado legítimo dela mesma. Comparar identidade não tem esse problema.
 *
 * Só escapam as rotas de dado global declaradas em GLOBAIS — cada uma com o
 * motivo escrito, para que a isenção seja decisão revisada e não esquecimento.
 *
 * A sonda é uma empresa de teste que não possui nada. No dev ela é criada uma
 * vez (nunca em produção — é um usuário ADMIN de verdade):
 *
 *   INSERT INTO enterprise (id, code, name, created_by)
 *     VALUES (99, 9099, 'Empresa Sonda (auditoria)', <uuid de um usuário>);
 *   INSERT INTO users (id, name, email, password, role, is_active, auth_version)
 *     SELECT '00000000-0000-0000-0000-0000000000aa', 'Sonda', 'espiao@rival.local',
 *            password, 'ADMIN', true, auth_version
 *       FROM users WHERE email = 'admin@venturerp.local';
 *   INSERT INTO user_enterprises (user_id, enterprise_id, role)
 *     VALUES ('00000000-0000-0000-0000-0000000000aa', 99, 'ADMIN');
 *
 * Uso:
 *   API_URL=http://localhost:5070 \
 *   EMAIL_A=admin@venturerp.local SENHA_A=... \
 *   EMAIL_B=espiao@rival.local    SENHA_B=... \
 *     node scripts/audit-tenant-isolation.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const API = process.env.API_URL ?? 'http://localhost:5070';

/**
 * A API limita 50 req/s por IP com rajada de 100, e a varredura dispara umas
 * seiscentas. Sem ritmo, o 429 chegava no lugar da resposta — e como o script
 * contava resposta-não-ok junto com "isolada", o placar dizia 275 rotas limpas
 * quando quase todas nem haviam sido exercitadas. Passo fixo mais reenvio com
 * espera crescente: o resultado deixa de depender do limitador.
 */
const PASSO_MS = Number(process.env.PASSO_MS ?? 30);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function busca(rota, token, tentativa = 0) {
  await espera(PASSO_MS);
  const r = await fetch(API + rota, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 429 && tentativa < 5) {
    await espera(250 * 2 ** tentativa);
    return busca(rota, token, tentativa + 1);
  }
  return r;
}

/**
 * Rotas que servem dado global por natureza — tabela fiscal, domínio fechado,
 * catálogo do produto. Não pertencem a empresa nenhuma, então voltar preenchido
 * para a sonda é o comportamento correto.
 */
const GLOBAIS = [
  [/^\/api\/fiscal-classification/,        'NCM/CFOP são tabela da Receita, iguais para todo mundo'],
  [/^\/api\/fiscal\/tabelas\/ncm/,         'tabela NCM nacional'],
  [/^\/api\/fiscal\/tabelas\/icms-interno/, 'alíquotas de ICMS interno por UF — legislação, não cadastro'],
  [/^\/api\/fiscal\/tabelas\/icms-interestadual/, 'alíquotas interestaduais — legislação'],
  [/^\/api\/cfop/,                         'idem CFOP'],
  [/^\/api\/units/,                        'unidades de medida são domínio fechado do sistema'],
  [/^\/api\/location\/ufs/,                'UFs do Brasil'],
  [/^\/api\/location\/cities/,             'municípios IBGE'],
  [/^\/api\/location\/countries/,          'países'],
  [/^\/api\/notifications\/events/,        'catálogo de eventos do produto: o que o sistema sabe notificar'],
  [/^\/api\/screens/,                      'catálogo de telas do próprio produto'],
  [/^\/api\/health/,                       'sonda de saúde'],
  [/^\/api\/version/,                      'versão do servidor'],
  [/^\/users\/me/,                         'dados do próprio usuário autenticado'],
];

async function entrar(email, senha) {
  const r = await fetch(`${API}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha }),
  });
  if (!r.ok) throw new Error(`login de ${email} falhou (${r.status})`);
  return (await r.json()).token;
}

/** Descobre as rotas GET a partir dos serviços do front — mesma fonte do audit:rotas. */
function rotasDoFront() {
  const arquivos = [];
  (function anda(d) {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) anda(p);
      else if (/\.ts$/.test(n)) arquivos.push(p);
    }
  })(resolve('src/services'));

  const rotas = new Set();
  for (const f of arquivos) {
    const src = readFileSync(f, 'utf8');
    const base = src.match(/const\s+BASE\s*=\s*['"`]([^'"`]+)['"`]/)?.[1] ?? '';
    for (const m of src.matchAll(/httpClient\.get\s*(?:<[^>]*>)?\s*\(\s*[`'"]([^`'"]+)[`'"]/g)) {
      rotas.add(m[1].replace(/\$\{BASE\}/g, base));
    }
  }
  return [...rotas].filter((r) => r.startsWith('/')).sort();
}

/** Um caminho tem parâmetro a resolver? */
const temParametro = (r) => /\$\{[^}]*\}|\{[a-zA-Z_]+\}/.test(r);

/**
 * Extrai identificadores de uma resposta de listagem. É o que permite exercitar
 * as rotas de detalhe: chutar `1` devolvia 404 em 270 das 297 rotas, e o teste
 * contava esse 404 como "isolada" — cobertura que não existia.
 */
function identificadores(corpo) {
  const linhas = Array.isArray(corpo) ? corpo
    : ['data', 'items', 'results', 'rows', 'content'].map((k) => corpo?.[k]).find(Array.isArray) ?? [];
  const achados = {};
  for (const linha of linhas.slice(0, 5)) {
    if (!linha || typeof linha !== 'object') continue;
    for (const [k, v] of Object.entries(linha)) {
      if (v === null || typeof v === 'object') continue;
      if (/^(id|code|codigo|.*_id|.*_code)$/i.test(k)) (achados[k] ??= []).push(String(v));
    }
  }
  return achados;
}

/**
 * Um agregado zerado não é registro. Sem esta checagem o relatório de chamados
 * — que devolve oito contadores em zero para quem não tem chamado nenhum —
 * era acusado de vazar, quando na verdade filtra a empresa corretamente.
 */
function agregadoVazio(obj) {
  const vals = Object.entries(obj)
    .filter(([k]) => !['message', 'status', 'success'].includes(k))
    .map(([, v]) => v);
  if (!vals.length) return true;
  // O relatório de orçamentos devolve os totais como texto ("0"), não número —
  // sem tratar isso um agregado zerado passava por registro.
  const zerado = (v) => v === 0 || v === null || v === '' || v === false ||
    (typeof v === 'string' && /^-?0(\.0+)?$/.test(v.trim())) ||
    (Array.isArray(v) && v.length === 0);
  return vals.every(zerado);
}

/**
 * Eco não é divulgação: `/characteristics/1/items` devolve
 * `{characteristic_id: 1, item_codes: null}` mesmo para quem não tem nada, e o
 * `1` veio da própria URL de quem perguntou. Só conta o que a rota acrescentou.
 */
function semEco(corpo, rota) {
  const daURL = new Set(rota.split('/').filter(Boolean));
  return Object.fromEntries(
    Object.entries(corpo).filter(([, v]) => !daURL.has(String(v))),
  );
}

/** Os registros que a resposta carrega, cada um serializado para comparação. */
function registros(corpo, rota = '') {
  const lista = (v) => v.map((r) => JSON.stringify(r));
  if (Array.isArray(corpo)) return lista(corpo);
  if (!corpo || typeof corpo !== 'object') return [];
  for (const chave of ['data', 'items', 'results', 'rows', 'content']) {
    const v = corpo[chave];
    if (Array.isArray(v)) return lista(v);
    if (v && typeof v === 'object') return agregadoVazio(v) ? [] : [JSON.stringify(v)];
  }
  // objeto único devolvido na raiz (um GET /{code}, por exemplo)
  const semRuido = semEco(corpo, rota);
  return agregadoVazio(semRuido) ? [] : [JSON.stringify(semRuido)];
}

const tokenA = await entrar(process.env.EMAIL_A ?? 'admin@venturerp.local', process.env.SENHA_A ?? 'VentureDev@2026');
const tokenB = await entrar(process.env.EMAIL_B ?? 'espiao@rival.local', process.env.SENHA_B ?? 'VentureDev@2026');

const todas = rotasDoFront();
// Primeira passada: as rotas sem parâmetro. Além de serem testadas, elas
// alimentam o dicionário de identificadores reais usado na segunda passada.
// O dicionário é por rota de origem, não global: `id` colhido do audit-log
// (349) e `code` colhido do configurador ("ALTURA") viravam parâmetro de
// qualquer rota, e o resultado era 404 em quase tudo. Cada rota de detalhe usa
// o identificador da sua própria listagem irmã.
const porListagem = new Map();
for (const rota of todas.filter((r) => !temParametro(r))) {
  try {
    const r = await busca(rota, tokenA);
    if (!r.ok) continue;
    const corpo = await r.json().catch(() => null);
    if (!corpo) continue;
    const achados = identificadores(corpo);
    if (Object.keys(achados).length) porListagem.set(rota, achados);
  } catch { /* rota fora do ar não alimenta o dicionário */ }
}

/** Quantos segmentos iniciais duas rotas têm em comum. */
function prefixoComum(a, b) {
  const sa = a.split('/'), sb = b.split('/');
  let n = 0;
  while (n < sa.length && n < sb.length && sa[n] === sb[n]) n++;
  return n;
}

/** Resolve `${x}`/`{x}` com o identificador real da listagem mais próxima. */
function concretiza(rota) {
  const base = rota.split(/\$\{|\{/)[0];
  const candidatas = [...porListagem.keys()]
    .map((l) => ({ l, n: prefixoComum(base, l) }))
    .filter((c) => c.n >= 3) // pelo menos "", "api", "<recurso>"
    .sort((x, y) => y.n - x.n);

  return rota.replace(/\$\{[^}]*\}|\{[a-zA-Z_]+\}/g, (t) => {
    const nome = t.replace(/[${}]/g, '').replace(/^encodeURIComponent\(|\)$/g, '').trim().toLowerCase();
    for (const { l } of candidatas) {
      const achados = porListagem.get(l);
      const exato = Object.keys(achados).find((k) => k.toLowerCase() === nome);
      if (exato) return achados[exato][0];
      const parcial = Object.keys(achados).find((k) => {
        const kk = k.toLowerCase().replace(/_/g, ''), nn = nome.replace(/_/g, '');
        return kk.includes(nn) || nn.includes(kk);
      });
      if (parcial) return achados[parcial][0];
      // A listagem irmã existe mas não expõe a chave pedida: `id` costuma servir.
      if (achados.id) return achados.id[0];
    }
    return '1';
  });
}

const rotas = [...new Set(todas.map(concretiza))].filter((r) => !r.includes('${')).sort();
console.log(`listagens que renderam identificadores: ${porListagem.size}`);
const vazamentos = [];
const isentas = [];
let limpas = 0, semDadoEmA = 0;
// Resposta com erro não é resposta isolada. Somar as duas coisas no mesmo
// contador escondia quantas rotas o teste de fato conseguiu exercitar.
const falhas = [];

for (const rota of rotas) {
  const global = GLOBAIS.find(([re]) => re.test(rota));
  if (global) { isentas.push(rota); continue; }
  try {
    const ra = await busca(rota, tokenA);
    const rb = await busca(rota, tokenB);
    if (!ra.ok || !rb.ok) { falhas.push(`${rota} :: dona=${ra.status} sonda=${rb.status}`); continue; }
    const [ca, cb] = [await ra.json().catch(() => null), await rb.json().catch(() => null)];
    const daDona = registros(ca, rota);
    const daSonda = new Set(registros(cb, rota));
    // Sem dado na empresa dona, a rota não prova nada nesta rodada.
    if (daDona.length === 0) { semDadoEmA++; continue; }
    const comuns = daDona.filter((r) => daSonda.has(r));
    if (comuns.length) {
      vazamentos.push({ rota, na: daDona.length, nb: daSonda.size, comuns: comuns.length, amostra: comuns[0].slice(0, 160) });
    } else limpas++;
  } catch (e) { falhas.push(`${rota} :: ${e.message}`); }
}

console.log(`rotas GET exercitadas: ${rotas.length} | isoladas: ${limpas} | sem dado na empresa dona: ${semDadoEmA} | não responderam: ${falhas.length} | globais isentas: ${isentas.length}`);
if (process.env.VERBOSE && falhas.length) {
  console.log(`\n── não responderam (${falhas.length}) ──`);
  falhas.forEach((f) => console.log('  ' + f));
}
if (vazamentos.length) {
  console.log(`\n── VAZAMENTO ENTRE EMPRESAS (${vazamentos.length}) ──`);
  for (const v of vazamentos) console.log(`  ${v.rota}\n      dona=${v.na} · sonda=${v.nb} · ${v.comuns} registro(s) IDÊNTICO(S) nas duas\n      ${v.amostra}`);
  console.error(`\n✗ ${vazamentos.length} rota(s) entregam dado de outra empresa.`);
  process.exit(1);
}
console.log('\nNenhuma rota entregou dado de outra empresa.');

#!/usr/bin/env node
/**
 * Ida e volta: o que o front lê, ele consegue gravar de volta?
 *
 * As auditorias estáticas (audit:payload, audit:drift) comparam *nomes* de
 * campo entre TypeScript e Go. Elas não pegam o defeito que mais apareceu neste
 * sistema: o campo tem o nome certo dos dois lados, a requisição volta 200, e
 * mesmo assim o valor não foi gravado. Foi assim que o fornecedor sumia da
 * listagem ao ser editado (`is_active` chegava como `false` porque a tela não
 * mandava o campo) e que `priority_override` era gravado e nunca lido de volta.
 *
 * O teste aqui é de idempotência, que não depende de adivinhar payload:
 *
 *     PUT(GET(x))  ==  GET(x)
 *
 * Lê o registro, devolve exatamente o que leu e lê de novo. Se algum campo
 * mudou de valor sozinho, o caminho de escrita está descartando ou reescrevendo
 * dado — que é o bug, independentemente do status devolvido.
 *
 * Uso: API_URL=... EMAIL=... SENHA=... node scripts/audit-roundtrip.mjs
 */
const API = process.env.API_URL ?? 'http://localhost:5070';
const PASSO_MS = Number(process.env.PASSO_MS ?? 40);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Cada entrada é uma entidade que o front lê e grava. `chave` extrai o
 * identificador da linha listada; `detalhe` monta a rota de leitura; `escrita`
 * diz por onde a tela grava. Acrescentar uma entidade aqui amplia a cobertura.
 */
const ENTIDADES = [
  // O fornecedor grava em PUT /api/suppliers com o código no corpo, não na URL.
  { nome: 'Fornecedor',            lista: '/api/suppliers',            chave: (r) => r.code, detalhe: (k) => `/api/suppliers/${k}`,            escrita: () => '/api/suppliers' },
  { nome: 'Máquina',               lista: '/api/machine/list',         chave: (r) => r.code, detalhe: (k) => `/api/machine/${k}`,              escrita: (k) => `/api/machine/${k}` },
  { nome: 'Tipo de máquina',       lista: '/api/machine/types/list',   chave: (r) => r.code, detalhe: (k) => `/api/machine/types/${k}`,        escrita: (k) => `/api/machine/types/${k}` },
  { nome: 'Motivo de restrição',   lista: '/api/restriction-reason/list', chave: (r) => r.code, detalhe: (k) => `/api/restriction-reason/${k}`, escrita: (k) => `/api/restriction-reason/${k}` },
  { nome: 'Conjunto (configurador)', lista: '/api/configurator/sets',  chave: (r) => r.id,   detalhe: (k) => `/api/configurator/sets/${k}`,    escrita: (k) => `/api/configurator/sets/${k}` },
  { nome: 'Característica',        lista: '/api/configurator/characteristics', chave: (r) => r.id, detalhe: (k) => `/api/configurator/characteristics/${k}`, escrita: (k) => `/api/configurator/characteristics/${k}` },
  { nome: 'Almoxarifado',          lista: '/api/warehouse/list',       chave: (r) => r.code, detalhe: (k) => `/api/warehouse/${k}`,            escrita: null },
];

/**
 * Campos que costumam ser exigidos pelo backend e por isso entram no corpo
 * mínimo — sem eles a gravação seria recusada por validação, e o teste mediria
 * a validação em vez de medir a perda de campo.
 */
const OBRIGATORIOS = new Set(['code', 'id', 'name', 'description', 'type', 'situation', 'char_type', 'receiving_type']);

/** Campos que mudam sozinhos por natureza e não indicam perda de dado. */
const VOLATEIS = /^(updated_at|updated_by|last_update|atualizado_em|version)$/i;

async function req(metodo, rota, token, corpo) {
  await espera(PASSO_MS);
  return fetch(API + rota, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
}

/** Diferenças de valor entre dois objetos, ignorando o que é volátil. */
function diferencas(antes, depois, prefixo = '') {
  const saida = [];
  for (const [k, v] of Object.entries(antes ?? {})) {
    if (VOLATEIS.test(k)) continue;
    const w = depois?.[k];
    const caminho = prefixo + k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      saida.push(...diferencas(v, w, caminho + '.'));
    } else if (JSON.stringify(v) !== JSON.stringify(w)) {
      saida.push(`${caminho}: ${JSON.stringify(v)} → ${JSON.stringify(w)}`);
    }
  }
  return saida;
}

const token = await (async () => {
  const r = await fetch(`${API}/users/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.EMAIL ?? 'admin@venturerp.local', password: process.env.SENHA ?? 'VentureDev@2026' }),
  });
  if (!r.ok) throw new Error(`login falhou (${r.status})`);
  return (await r.json()).token;
})();

const perdas = [], riscos = [], semDados = [], semEscrita = [];
let aprovadas = 0;

for (const e of ENTIDADES) {
  if (!e.escrita) { semEscrita.push(`${e.nome} — só leitura no front`); continue; }
  const rl = await req('GET', e.lista, token);
  if (!rl.ok) { semDados.push(`${e.nome} — listagem respondeu ${rl.status}`); continue; }
  const corpo = await rl.json().catch(() => null);
  const linhas = Array.isArray(corpo) ? corpo
    : ['data', 'items', 'results'].map((k) => corpo?.[k]).find(Array.isArray) ?? [];
  if (!linhas.length) { semDados.push(`${e.nome} — sem registro no ambiente`); continue; }

  const chave = e.chave(linhas[0]);
  const rAntes = await req('GET', e.detalhe(chave), token);
  if (!rAntes.ok) { semDados.push(`${e.nome} — detalhe respondeu ${rAntes.status}`); continue; }
  const antes = await rAntes.json();

  const rPut = await req('PUT', e.escrita(chave), token, antes);
  if (!rPut.ok) {
    const txt = (await rPut.text()).slice(0, 180);
    perdas.push({ nome: e.nome, chave, tipo: `gravação recusou o que a leitura devolveu (${rPut.status})`, itens: [txt] });
    continue;
  }

  const rDepois = await req('GET', e.detalhe(chave), token);
  const depois = await rDepois.json();
  const dif = diferencas(antes, depois);
  if (dif.length) {
    perdas.push({ nome: e.nome, chave, tipo: 'campo alterado ao regravar o mesmo conteúdo', itens: dif });
    continue;
  }

  // Segunda prova, a que realmente pega o defeito histórico: gravar só o
  // essencial. Campo que a tela não enviou tem de ficar como estava. Foi a
  // ausência de `is_active` no corpo que desativava o fornecedor e o fazia
  // sumir da listagem — o DTO recebia `bool` e o zero-value virava `false`.
  const minimo = Object.fromEntries(
    Object.entries(antes).filter(([k, v]) =>
      k === 'code' || k === 'id' || k === 'name' || k === 'description' ||
      (typeof v !== 'boolean' && v !== null && !Array.isArray(v) && typeof v !== 'object' && OBRIGATORIOS.has(k))),
  );
  const rMin = await req('PUT', e.escrita(chave), token, minimo);
  if (rMin.ok) {
    const rFinal = await req('GET', e.detalhe(chave), token);
    const final = await rFinal.json();
    const perdidos = diferencas(antes, final);
    if (perdidos.length) {
      // Isto NÃO é prova de bug na tela: é a tolerância da API. A tela de tipo
      // de máquina, por exemplo, carrega o registro e reenvia todos os campos,
      // então na prática nada se perde. Vira defeito no dia em que alguém criar
      // uma tela de edição parcial, uma integração ou um PATCH — e aí o campo
      // some sem erro. Por isso entra como risco, e não como falha.
      riscos.push({ nome: e.nome, chave, itens: perdidos });
      // devolve o estado original para não deixar o ambiente sujo
      await req('PUT', e.escrita(chave), token, antes);
    }
  }
  aprovadas++;
}

console.log(`entidades verificadas: ${ENTIDADES.length} | idempotentes: ${aprovadas} | sem dado: ${semDados.length} | só leitura: ${semEscrita.length}`);
if (semDados.length) { console.log('\n── não deu para exercitar ──'); semDados.forEach((s) => console.log('  ' + s)); }
if (riscos.length) {
  console.log(`\n── RISCO: campo sobrescrito quando o corpo o omite (${riscos.length}) ──`);
  console.log('   (o backend recebe `bool` puro: ausente e false são indistinguíveis)');
  for (const r of riscos) {
    console.log(`  ${r.nome} (chave ${r.chave})`);
    r.itens.forEach((i) => console.log('      ' + i));
  }
}
if (perdas.length) {
  console.log(`\n── PERDA NA IDA E VOLTA (${perdas.length}) ──`);
  for (const p of perdas) {
    console.log(`  ${p.nome} (chave ${p.chave}) — ${p.tipo}`);
    p.itens.forEach((i) => console.log('      ' + i));
  }
  console.error(`\n✗ ${perdas.length} entidade(s) não sobrevivem a uma regravação idêntica.`);
  process.exit(1);
}
console.log('\nToda entidade exercitada sobreviveu à regravação sem perder campo.');

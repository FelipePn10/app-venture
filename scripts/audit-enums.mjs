/**
 * Auditoria de enums: compara os valores literais que o front envia com os
 * rótulos do enum correspondente no Postgres.
 *
 * Foi assim que `INJECT` (o backend só aceita `INJECTION`) passou despercebido:
 * `tsc` valida o tipo do literal, não o conteúdo. Um valor fora do enum só
 * falha na gravação, em produção, com a mensagem genérica do banco.
 *
 * Uso: PG_ENUMS=/tmp/pgenums.txt node scripts/audit-enums.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

const enums = new Map();
for (const linha of readFileSync(process.env.PG_ENUMS ?? '/tmp/pgenums.txt', 'utf8').split('\n')) {
  const [nome, valores] = linha.split('=');
  if (nome && valores) enums.set(nome.trim(), new Set(valores.trim().split(',')));
}

const arquivos = [];
(function anda(dir) {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) anda(p);
    else if (/\.tsx?$/.test(nome)) arquivos.push(p);
  }
})(resolve('src'));

/**
 * Arrays de literais maiúsculos do front — `['A', 'B']` ou `[{value:'A'},…]`.
 * São os candidatos a valor de enum.
 */
/**
 * Extrai listas de valores do front. Duas formas:
 *   const X = ['A', 'B'] as const;
 *   const X = [{ value: 'A', label: 'a' }, …] as const;
 *
 * Quando a lista é de objetos, só `value:` conta — a versão anterior lia também
 * os rótulos ("E", "OU") e acusava falso positivo. E o corpo é lido com
 * contagem de colchetes, para não invadir a declaração seguinte.
 */
function listasDoArquivo(src) {
  const inicio = /(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*(?::[^=]+)?=\s*\[/g;
  const out = [];
  for (const m of src.matchAll(inicio)) {
    let nivel = 1;
    let i = m.index + m[0].length;
    while (i < src.length && nivel > 0) {
      if (src[i] === '[') nivel += 1;
      else if (src[i] === ']') nivel -= 1;
      i += 1;
    }
    const corpo = src.slice(m.index + m[0].length, i - 1);
    const temObjetos = /\bvalue\s*:/.test(corpo);
    const padrao = temObjetos
      ? /\bvalue\s*:\s*['"]([^'"]+)['"]/g
      : /['"]([A-Z][A-Z0-9_]{1,40})['"]/g;
    const valores = [...new Set([...corpo.matchAll(padrao)].map((x) => x[1]))]
      .filter((v) => /^[A-Z][A-Z0-9_]*$/.test(v));
    if (valores.length >= 2) out.push({ nome: m[1], valores });
  }
  return out;
}

/**
 * Listas já conferidas contra a coluna real — o pareamento automático errou o
 * enum. Cada entrada diz por que o valor é válido. Sem isso o relatório fica
 * cheio de ruído e ninguém olha mais para ele.
 */
const CONFERIDAS = new Map([
  ['SCHEDULE_STATUS', 'machine_schedules.status é varchar sem constraint; o default é SCHEDULED'],
  ['TIME_UNITS', 'route_operations.time_unit é varchar; o backend valida MIN/HORA/DIA'],
  ['OPERATORS', 'operadores da regra de classificação, não do configurador'],
  ['STATUSES', 'status de BOM e de processo de importação são text, não procurement_record_status'],
  ['TIPOS', 'tipos de dispositivo legal (ICMS/IPI/LAUDO/PIS/COFINS), não impostos da NF-e'],
  ['RULE_TYPES', 'tipos de regra do MRP, não operadores de restrição'],
  ['CONTRACT_STATUSES', 'supplier_contracts.status é text; ACTIVE/SUSPENDED são aceitos'],
  ['RESTRICTION_CONNECTORS', 'envia AND/OR; E/OU são apenas rótulos'],
  ['OP_ORIGINS', 'INTERNA/EXTERNA/TERCEIROS conferem com operation_origin_enum'],
  ['FREIGHT_MODALITIES', 'shipments.freight_modality é varchar sem constraint; não é table_composition_enum'],
]);

const achados = [];
for (const arquivo of arquivos) {
  const src = readFileSync(arquivo, 'utf8');
  for (const { nome, valores } of listasDoArquivo(src)) {
    // Só comparamos quando a lista casa *bem* com um enum: pelo menos metade
    // dos valores presentes. Abaixo disso não é o mesmo domínio.
    let melhor = null;
    for (const [enumNome, conjunto] of enums) {
      const cobertos = valores.filter((v) => conjunto.has(v)).length;
      const razao = cobertos / valores.length;
      if (cobertos < 2 || razao < 0.5) continue;
      if (!melhor || razao > melhor.razao || (razao === melhor.razao && conjunto.size < melhor.tamanho)) {
        melhor = { enumNome, razao, tamanho: conjunto.size, conjunto };
      }
    }
    if (!melhor || melhor.razao === 1) continue;
    if (CONFERIDAS.has(nome)) continue;
    achados.push({
      arquivo: basename(arquivo), lista: nome, enumBanco: melhor.enumNome,
      fora: valores.filter((v) => !melhor.conjunto.has(v)),
      aceitos: [...melhor.conjunto],
    });
  }
}

console.log('Auditoria de enums — front × Postgres');
console.log('─'.repeat(78));
if (achados.length === 0) console.log('\nNenhum valor fora do enum do banco.');
for (const a of achados) {
  console.log(`\n✗ ${a.arquivo} · ${a.lista}  →  enum ${a.enumBanco}`);
  console.log(`   fora do enum: ${a.fora.join(', ')}`);
  console.log(`   o banco aceita: ${a.aceitos.join(', ')}`);
}
console.log(`\n${achados.length} lista(s) com valor fora do enum (${CONFERIDAS.size} já conferidas e dispensadas).`);
if (process.argv.includes('--fail') && achados.length) process.exit(1);

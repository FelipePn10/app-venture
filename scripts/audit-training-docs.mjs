#!/usr/bin/env node
/**
 * Auditoria do material de treinamento
 * ---------------------------------------------------------------------------
 * O material é escrito à mão a partir do HELP_TELAS_ERP.md e envelhece junto
 * com o sistema. Este script confere, de forma mecânica, três coisas que o
 * revisor humano erra com facilidade:
 *
 *   1. **Códigos de tela que não existem** no catálogo (`ERP_SCREENS`) ou que
 *      existem no catálogo mas não têm implementação registrada.
 *   2. **Ordem de pré-requisitos**: uma tela citada como passo de exercício
 *      antes da tela que a alimenta (ex.: item antes do PDM).
 *   3. **Valores de enum** que a documentação afirma e o backend não aceita.
 *   4. **Ordem da máscara configurada**: o aluno aprende a gerar e persistir
 *      a máscara antes de chegar à estrutura/BOM que a consome.
 *
 * Uso:  node scripts/audit-training-docs.mjs
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const raiz = resolve(new URL('..', import.meta.url).pathname);
const dirTreino = join(raiz, '.ai/treinamento');

const catalogo = readFileSync(join(raiz, 'src/types/erpScreen.ts'), 'utf8');
const host = readFileSync(join(raiz, 'src/components/screens/ScreenHostPage.tsx'), 'utf8');
// Metade das telas não tem componente próprio: elas entram no `SCREEN_REGISTRY`
// pelo spread de `OPERATIONAL_ROUTINES`, renderizadas por `OperationalRoutinePage`.
// Ignorar esse arquivo faria o auditor acusar ~500 telas "sem implementação".
const rotinas = readFileSync(join(raiz, 'src/components/screens/operationalRoutines.ts'), 'utf8');

const existentes = new Set([...catalogo.matchAll(/code:\s*["']([A-Z][A-Z0-9]+)["']/g)].map((m) => m[1]));
const registradas = new Set([
  ...[...host.matchAll(/^\s*([A-Z][A-Z0-9]+):\s*</gm)].map((m) => m[1]),
  ...[...rotinas.matchAll(/^\s*([A-Z][A-Z0-9]+):\s*routine\(/gm)].map((m) => m[1]),
]);

const problemas = [];
const aviso = (arquivo, linha, tipo, msg) => problemas.push({ arquivo, linha, tipo, msg });

/**
 * Enums fechados do backend. A doc citava listas inventadas (`CX`, `Kanban`,
 * `Simples/Conjunto`…) que faziam o aluno procurar opção inexistente na tela.
 */
const ENUMS_PROIBIDOS = [
  { re: /\b(?:`|\b)(?:CX|GL|PAR)\b(?:`|\b)/, ctx: /unidade|medida|\bUM\b/i, msg: 'unidade de medida inexistente (válidas: MM CM M IN KG M2 M3 UN MICROMETRO TONELADA)' },
  { re: /\bMPS\b/, ctx: /tipo de planejamento|tipo mrp|tipo_mrp/i, msg: 'tipo de planejamento inexistente (válidos: NORMAL_MRP, PROJETO)' },
  { re: /\bCarro a Carro\b|\bProtótipo\b/, ctx: /tipo de planejamento|tipo mrp/i, msg: 'tipo de planejamento inexistente (válidos: NORMAL_MRP, PROJETO)' },
  { re: /\bSubconjunto\b/, ctx: /estrutura/i, msg: 'tipo de estrutura inexistente (válidos: INDUSTRIAL, COMERCIAL)' },
  { re: /\bTerceirizado\b/, ctx: /tipo/i, msg: 'rótulo divergente da tela — o enum é DE_TERCEIRO ("De terceiro")' },
];

/**
 * Pré-requisitos duros: gravar A exige que B já exista. Se um documento
 * apresenta A antes de B, o aluno trava.
 */
const PRE_REQUISITOS = [
  { tela: 'VENT0200', exige: ['VITE0114', 'VITE0115'], porque: 'o item guarda ponteiro para Grupo e Modificador PDM; sem eles a gravação é recusada' },
];

const arquivos = [];
for (const dia of readdirSync(dirTreino)) {
  const d = join(dirTreino, dia);
  if (dia.startsWith('_') || dia === 'pdf' || !existsSync(d)) continue;
  let entradas;
  try { entradas = readdirSync(d); } catch { continue; }
  for (const f of entradas) if (f.endsWith('.md')) arquivos.push(join(d, f));
}
const readme = join(dirTreino, 'README.md');
if (existsSync(readme)) arquivos.push(readme);

for (const caminho of arquivos) {
  const rel = caminho.replace(`${raiz}/`, '');
  const texto = readFileSync(caminho, 'utf8');
  const linhas = texto.split('\n');

  // ── 1. Códigos de tela ────────────────────────────────────────────────────
  const vistos = new Map();          // código → primeira linha em que aparece
  linhas.forEach((l, i) => {
    if (/^\s*(?:[|>]\s*)?(?:#{1,6}\s*)?(?:⚠️|✔|✖)?\s*(?:Rotas?|Backend):/i.test(l)) return;
    for (const m of l.matchAll(/\bV[A-Z]{2,4}\d{4}\b/g)) {
      const code = m[0];
      if (!vistos.has(code)) vistos.set(code, i + 1);
      if (!existentes.has(code)) aviso(rel, i + 1, 'tela-inexistente', `${code} não existe no catálogo ERP_SCREENS`);
      else if (!registradas.has(code)) aviso(rel, i + 1, 'tela-sem-implementacao', `${code} está no catálogo mas não tem tela registrada`);
    }
  });

  // ── 2. Ordem de pré-requisitos ────────────────────────────────────────────
  // Só interessa onde a tela é ENSINADA (tem seção própria) — uma citação de
  // passagem ("digite VENT0200 para navegar", "corrija a aba do VENT0200")
  // não estabelece ordem didática e não deve gerar alarme.
  const ensinadas = new Map();
  linhas.forEach((l, i) => {
    const h = l.match(/^#{1,4}\s+.*?\b(V[A-Z]{2,4}\d{4})\b/);
    if (h && !ensinadas.has(h[1])) ensinadas.set(h[1], i + 1);
  });

  for (const { tela, exige, porque } of PRE_REQUISITOS) {
    if (!ensinadas.has(tela)) continue;          // o documento não ensina esta tela
    const ondeTela = ensinadas.get(tela);
    for (const dep of exige) {
      const ondeDep = ensinadas.get(dep);
      if (ondeDep === undefined) {
        // A dependência não é ensinada aqui: só é problema se o documento não
        // avisar, em algum lugar, que ela é pré-requisito.
        const avisa = new RegExp(`${dep}[\\s\\S]{0,400}?pr[ée]-?requisito|pr[ée]-?requisito[\\s\\S]{0,400}?${dep}`, 'i').test(texto);
        if (!avisa) aviso(rel, ondeTela, 'pre-requisito-nao-sinalizado', `ensina ${tela} sem citar ${dep} como pré-requisito — ${porque}`);
      } else if (ondeDep > ondeTela) {
        aviso(rel, ondeTela, 'ordem-invertida', `${tela} é ensinado na linha ${ondeTela}, ANTES de ${dep} (linha ${ondeDep}) — ${porque}`);
      }
    }
  }

  // ── 3. Enums ──────────────────────────────────────────────────────────────
  linhas.forEach((l, i) => {
    for (const { re, ctx, msg } of ENUMS_PROIBIDOS) {
      if (re.test(l) && ctx.test(l)) aviso(rel, i + 1, 'enum-invalido', msg);
    }
  });

  // ── 4. Máscara configurada antes da BOM ──────────────────────────────────
  // Menções em índices e tabelas não bastam: procuramos uma instrução prática
  // de gerar/persistir e exigimos que ela venha antes da primeira seção de BOM.
  if (rel.includes('dia-1-fundacao')) {
    const ondeBom = texto.search(/^(?:# PARTE \d+ — Estrutura de produto|### D2 — Estrutura de produto|### B1\. Estrutura de Produto).*$/mi);
    if (ondeBom >= 0) {
      const instrucaoMascara = texto.search(/VITE0313[\s\S]{0,600}?(?:persist(?:a|ir|ida)|gravar|salvar)/i);
      // No manual a advertência fica logo dentro da abertura do bloco da BOM,
      // antes do Passo 1; por isso aceitamos uma pequena margem após o título.
      const ensinaMascara = instrucaoMascara >= 0 && instrucaoMascara <= ondeBom + 1_000;
      if (!ensinaMascara) {
        const linha = texto.slice(0, ondeBom).split('\n').length;
        aviso(rel, linha, 'mascara-fora-de-ordem', 'ensina a estrutura/BOM antes de ensinar a gerar e persistir a máscara na VITE0313');
      }
    }
  }
}

// ── Relatório ───────────────────────────────────────────────────────────────
const porTipo = new Map();
for (const p of problemas) {
  if (!porTipo.has(p.tipo)) porTipo.set(p.tipo, []);
  porTipo.get(p.tipo).push(p);
}

console.log(`\nAuditoria do material de treinamento — ${arquivos.length} arquivo(s)\n${'─'.repeat(78)}`);
if (!problemas.length) {
  console.log('Nada a corrigir.\n');
} else {
  for (const [tipo, lista] of [...porTipo].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n── ${tipo} (${lista.length}) ──`);
    const únicos = new Map();
    for (const p of lista) {
      const k = `${p.arquivo}|${p.msg}`;
      if (!únicos.has(k)) únicos.set(k, { ...p, vezes: 1 });
      else únicos.get(k).vezes++;
    }
    for (const p of únicos.values()) {
      console.log(`   ${p.arquivo}:${p.linha}${p.vezes > 1 ? ` (+${p.vezes - 1})` : ''}`);
      console.log(`      ${p.msg}`);
    }
  }
  console.log(`\n${'─'.repeat(78)}\n${problemas.length} ocorrência(s).\n`);
}
process.exit(problemas.length ? 1 : 0);

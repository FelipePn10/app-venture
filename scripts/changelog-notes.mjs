#!/usr/bin/env node
// Extrai a seção do CHANGELOG correspondente a uma tag (ex.: v1.0.3) para usar
// como corpo da GitHub Release — que é o texto exibido no painel "Novidades".
// Nunca sai com código de erro: em qualquer falha, imprime um texto padrão para
// não quebrar o pipeline de release.
import { readFileSync } from 'node:fs';

const FALLBACK = 'Consulte o CHANGELOG e a documentação da versão antes de instalar.';
const tag = (process.argv[2] ?? '').trim();

function extract() {
  if (!tag) return FALLBACK;
  const md = readFileSync('CHANGELOG.md', 'utf8');
  const lines = md.split('\n');
  const wanted = tag.replace(/^v/, '');

  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^##\s+\[v?([^\]]+)\]/);
    if (m && m[1].replace(/^v/, '') === wanted) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return FALLBACK;

  const body = [];
  for (let i = start; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) break;
    body.push(lines[i]);
  }
  const text = body.join('\n').trim();
  return text || FALLBACK;
}

try {
  process.stdout.write(`${extract()}\n`);
} catch {
  process.stdout.write(`${FALLBACK}\n`);
}

#!/usr/bin/env node
// Extrai a seção do CHANGELOG correspondente a uma tag (ex.: v1.0.3) para usar
// como corpo da GitHub Release — que é o texto exibido no painel "Novidades".
// Nunca sai com código de erro: em qualquer falha, imprime um texto padrão para
// não quebrar o pipeline de release.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const FALLBACK = 'Consulte o CHANGELOG e a documentação da versão antes de instalar.';
const tag = (process.argv[2] ?? '').trim();

export function extractReleaseNotes(requestedTag, markdown) {
  const tag = (requestedTag ?? '').trim();
  if (!tag) return FALLBACK;
  const lines = markdown.split('\n');
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
    // Títulos internos ("## Novidades", "## Melhorias" etc.) fazem parte das
    // notas. Somente o cabeçalho da próxima versão encerra a seção atual.
    if (/^##\s+\[v?[^\]]+\]/.test(lines[i])) break;
    body.push(lines[i]);
  }
  const text = body.join('\n').trim();
  return text || FALLBACK;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const markdown = readFileSync('CHANGELOG.md', 'utf8');
    process.stdout.write(`${extractReleaseNotes(tag, markdown)}\n`);
  } catch {
    process.stdout.write(`${FALLBACK}\n`);
  }
}

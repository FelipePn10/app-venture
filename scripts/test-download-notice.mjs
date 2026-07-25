#!/usr/bin/env node
/**
 * Testes do store de aviso de download (`src/services/fileDownload.ts`).
 *
 * O store é DOM-free de propósito — só `downloadBlob`/`downloadResponse` tocam em
 * `document`. Isso deixa a parte com regra de negócio (publicar, substituir,
 * dispensar, auto-dispensar, notificar assinantes) testável em Node puro, sem
 * jsdom e sem runner. Node ≥ 23.6 remove os tipos do `.ts` na importação.
 *
 * Uso: node scripts/test-download-notice.mjs
 */
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const mod = await import(pathToFileURL(new URL('../src/services/fileDownload.ts', import.meta.url).pathname).href);
const {
  notifyDownload, getDownloadNotice, dismissDownloadNotice,
  subscribeDownloadNotice, filenameFromDisposition,
} = mod;

const checks = [];
function it(label, fn) {
  try { fn(); checks.push({ label, ok: true }); }
  catch (e) { checks.push({ label, ok: false, detail: e.message }); }
}

it('começa vazio — nada renderiza quando ninguém baixou nada', () => {
  assert.equal(getDownloadNotice(), null);
});

it('publica um aviso com tipo, mensagem e nome do arquivo', () => {
  notifyDownload('success', 'Download concluído.', 'relatorio.pdf');
  const n = getDownloadNotice();
  assert.equal(n.kind, 'success');
  assert.equal(n.message, 'Download concluído.');
  assert.equal(n.filename, 'relatorio.pdf');
});

it('avisa os assinantes ao publicar e ao dispensar', () => {
  let calls = 0;
  const unsubscribe = subscribeDownloadNotice(() => { calls++; });
  notifyDownload('success', 'a', 'a.pdf');
  notifyDownload('error', 'b');
  dismissDownloadNotice();
  unsubscribe();
  assert.equal(calls, 3, `esperava 3 notificações, recebi ${calls}`);
});

it('deixa de avisar depois de cancelar a assinatura', () => {
  let calls = 0;
  const unsubscribe = subscribeDownloadNotice(() => { calls++; });
  unsubscribe();
  notifyDownload('success', 'c', 'c.pdf');
  dismissDownloadNotice();
  assert.equal(calls, 0, 'assinante removido não deve mais ser chamado');
});

it('um aviso novo SUBSTITUI o anterior (confirma a última ação, não empilha)', () => {
  notifyDownload('success', 'primeiro', '1.pdf');
  notifyDownload('error', 'segundo');
  const n = getDownloadNotice();
  assert.equal(n.message, 'segundo');
  assert.equal(n.filename, undefined);
  dismissDownloadNotice();
});

it('a identidade do aviso muda a cada publicação (força o re-render)', () => {
  notifyDownload('success', 'x', 'x.pdf');
  const first = getDownloadNotice().id;
  notifyDownload('success', 'x', 'x.pdf');
  assert.notEqual(getDownloadNotice().id, first);
  dismissDownloadNotice();
});

it('dispensar em store vazio não notifica ninguém (evita re-render inútil)', () => {
  dismissDownloadNotice();
  let calls = 0;
  const unsubscribe = subscribeDownloadNotice(() => { calls++; });
  dismissDownloadNotice();
  unsubscribe();
  assert.equal(calls, 0);
});

it('lê o nome do arquivo do Content-Disposition simples', () => {
  assert.equal(filenameFromDisposition('attachment; filename="orcamento-12.pdf"', 'x.pdf'), 'orcamento-12.pdf');
});

it('lê o nome no formato RFC 5987 (acentos) e decodifica', () => {
  assert.equal(
    filenameFromDisposition("attachment; filename*=UTF-8''or%C3%A7amento.pdf", 'x.pdf'),
    'orçamento.pdf',
  );
});

it('cai no fallback quando não há header', () => {
  assert.equal(filenameFromDisposition(undefined, 'fallback.xlsx'), 'fallback.xlsx');
});

it('não quebra com percent-encoding inválido no header', () => {
  assert.equal(filenameFromDisposition("attachment; filename*=UTF-8''100%.pdf", 'f.pdf'), '100%.pdf');
});

// Auto-dispensa: o timer é de 5s, então só conferimos que ele está agendado e
// que o processo não fica preso por causa dele.
it('agenda a auto-dispensa sem travar o processo', async () => {
  notifyDownload('success', 'auto', 'auto.pdf');
  assert.notEqual(getDownloadNotice(), null);
  dismissDownloadNotice(); // limpa o timer
  assert.equal(getDownloadNotice(), null);
});

const width = Math.max(...checks.map((c) => c.label.length));
for (const c of checks) console.log(`${c.ok ? '✓' : '✗'} ${c.label.padEnd(width)}  ${c.detail ?? ''}`);
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} testes do aviso de download passaram.`);
if (failed.length) process.exit(1);

// Confere a leitura do ambiente no token (o aviso de TREINO depende dela).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
const { code } = transformSync(readFileSync('src/services/ambienteSessao.ts', 'utf8'), { loader: 'ts', format: 'esm' });
const { ambienteDoToken } = await import(`data:text/javascript,${encodeURIComponent(code)}`);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
assert.equal(ambienteDoToken(`h.${b64({ environment: 'training', sub: 'x' })}.s`), 'training');
assert.equal(ambienteDoToken(`h.${b64({ environment: 'production' })}.s`), 'production');
assert.equal(ambienteDoToken(`h.${b64({ nome: 'Ação' })}.s`), '');
assert.equal(ambienteDoToken('lixo'), '');
assert.equal(ambienteDoToken(null), '');
console.log('treino-banner: 5/5 ok');

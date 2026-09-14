import assert from 'node:assert/strict';
import fs from 'node:fs';
import { extractReleaseNotes } from './changelog-notes.mjs';

const config = JSON.parse(fs.readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url)));
const packageInfo = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));
const cargo = fs.readFileSync(new URL('../src-tauri/Cargo.toml', import.meta.url), 'utf8');

assert.equal(config.version, packageInfo.version, 'package.json e tauri.conf.json devem usar a mesma versão');
assert.match(cargo, new RegExp(`\\[package\\][\\s\\S]*?version = "${packageInfo.version.replaceAll('.', '\\.')}"`));
assert.deepEqual(config.bundle.targets, ['nsis']);
assert.equal(config.bundle.createUpdaterArtifacts, true);
assert.ok(config.plugins.updater.pubkey.length > 100, 'chave pública do updater ausente');
assert.deepEqual(config.plugins.updater.endpoints, ['https://github.com/FelipePn10/app-venture/releases/latest/download/latest.json']);
assert.ok(!config.plugins.updater.pubkey.includes('PRIVATE'), 'configuração contém material privado');

const changelog = fs.readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
// Valide a seção publicada mais recente — no `make release` o cabeçalho da nova
// versão já foi promovido de Unreleased quando isto roda, então esta é a seção
// que vai virar as notas do release. A ordem importa: enquanto a validação vinha
// ANTES da promoção, ela conferia a versão anterior e deixava passar notas
// inválidas na nova, quebrando o pipeline com a tag já publicada.
const latestReleasedVersion = changelog.match(/^## \[v?([^\]]+)\]/m)?.[1];
assert.ok(latestReleasedVersion, 'CHANGELOG não possui nenhuma versão publicada');
const releaseNotes = extractReleaseNotes(`v${latestReleasedVersion}`, changelog);
assert.match(releaseNotes, /^## (Novidades|Melhorias|Correções)/m, 'notas da versão não foram extraídas');
assert.doesNotMatch(releaseNotes, /Consulte o CHANGELOG/, 'extrator retornou texto genérico');

console.log('Configuração de versionamento/updater validada.');

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
// Durante `make release`, os manifestos recebem a nova versão antes de o cabeçalho
// correspondente ser promovido de Unreleased. Valide a seção publicada mais
// recente para que o teste cubra o extrator sem bloquear essa etapa intermediária.
const latestReleasedVersion = changelog.match(/^## \[v?([^\]]+)\]/m)?.[1];
assert.ok(latestReleasedVersion, 'CHANGELOG não possui nenhuma versão publicada');
const releaseNotes = extractReleaseNotes(`v${latestReleasedVersion}`, changelog);
assert.match(releaseNotes, /^## (Novidades|Melhorias|Correções)/m, 'notas da versão não foram extraídas');
assert.doesNotMatch(releaseNotes, /Consulte o CHANGELOG/, 'extrator retornou texto genérico');

console.log('Configuração de versionamento/updater validada.');

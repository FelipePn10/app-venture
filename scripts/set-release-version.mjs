import fs from 'node:fs';
import path from 'node:path';

const version = (process.argv[2] ?? '').replace(/^v/, '');
if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error('uso: node scripts/set-release-version.mjs 1.2.3');
  process.exit(2);
}

const root = path.resolve(import.meta.dirname, '..');
const updateJSON = (relativePath, mutate) => {
  const file = path.join(root, relativePath);
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  mutate(value);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};

updateJSON('package.json', (value) => { value.version = version; });
updateJSON('package-lock.json', (value) => {
  value.version = version;
  if (value.packages?.['']) value.packages[''].version = version;
});
updateJSON('src-tauri/tauri.conf.json', (value) => { value.version = version; });

// Os arquivos Rust são editados por regex, então precisam tolerar CRLF: o
// runner Windows faz checkout com \r\n e um padrão preso a \n simplesmente não
// casa — a substituição virava um no-op SILENCIOSO. Isso passou despercebido
// porque o release.sh sincroniza no Linux e commita os arquivos já corretos,
// deixando a re-sincronização do runner sem nada para fazer. Só apareceu ao
// taggear direto, sem o commit de bump (v1.1.1-rc.1).
for (const relativePath of ['src-tauri/Cargo.toml', 'src-tauri/Cargo.lock']) {
  const file = path.join(root, relativePath);
  const content = fs.readFileSync(file, 'utf8');
  const pattern = relativePath.endsWith('Cargo.toml')
    ? /(\[package\][\s\S]*?\r?\nversion = ")[^"]+("\r?\n)/
    : /(name = "erp_venture_desktop"\r?\nversion = ")[^"]+("\r?\n)/;
  const updated = content.replace(pattern, `$1${version}$2`);
  // Falha alto: sem isto, uma regex que deixa de casar volta a passar batido.
  if (updated === content && !pattern.test(content)) {
    console.error(`set-release-version: não encontrei a versão em ${relativePath} — padrão não casou.`);
    process.exit(1);
  }
  fs.writeFileSync(file, updated);
}

console.log(`Versão desktop sincronizada em ${version}.`);

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

for (const relativePath of ['src-tauri/Cargo.toml', 'src-tauri/Cargo.lock']) {
  const file = path.join(root, relativePath);
  let content = fs.readFileSync(file, 'utf8');
  if (relativePath.endsWith('Cargo.toml')) {
    content = content.replace(/(\[package\][\s\S]*?\nversion = ")[^"]+("\n)/, `$1${version}$2`);
  } else {
    content = content.replace(/(name = "erp_venture_desktop"\nversion = ")[^"]+("\n)/, `$1${version}$2`);
  }
  fs.writeFileSync(file, content);
}

console.log(`Versão desktop sincronizada em ${version}.`);

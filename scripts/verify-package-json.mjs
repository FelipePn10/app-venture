import { readFileSync } from 'node:fs';

const file = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
JSON.parse(file);
console.log('package.json válido');

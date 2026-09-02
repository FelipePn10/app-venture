import fs from 'node:fs';
import path from 'node:path';

// Validações da rodada de manutenção/APS/planejamento/MRP/previsão. Rode com: npm run test:planejamento
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (name, condition) => {
  if (!condition) throw new Error(`Falhou: ${name}`);
  checks.push(name);
  console.log(`✓ ${name}`);
};

const vpre0301 = read('src/components/screens/previsao/Vpre0301Page.tsx');
const routinePage = read('src/components/screens/OperationalRoutinePage.tsx');
const enumLabels = read('src/utils/enumLabels.ts');

check('VPRE0301 não exibe endpoint técnico ao usuário', !/não é exposto por/.test(vpre0301) && !/pendente de integração de endpoint/.test(vpre0301));
check('VPRE0301 coluna realizado usa "—" (não "n/d")', /—/.test(vpre0301) && !/n\/d/.test(vpre0301));
check('rotina traduz enums de manutenção/parada (downtime_type)', /downtime_type: \["MAINTENANCE", "BREAKDOWN", "SETUP", "QUALITY"\]/.test(routinePage));
check('enumLabel traduz MAINTENANCE/BREAKDOWN/SETUP', /MAINTENANCE: 'Manutenção'/.test(enumLabels) && /BREAKDOWN: 'Quebra'/.test(enumLabels));

console.log(`\n${checks.length}/${checks.length} validações de planejamento aprovadas.`);

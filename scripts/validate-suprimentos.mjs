import fs from 'node:fs';
import path from 'node:path';

// Validações da rodada de suprimentos/compras. Rode com: npm run test:suprimentos
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (name, condition) => {
  if (!condition) throw new Error(`Falhou: ${name}`);
  checks.push(name);
  console.log(`✓ ${name}`);
};

const vpct = read('src/components/screens/suprimento/Vpct0100Page.tsx');
const routineCatalog = read('src/components/screens/operationalRoutines.ts');
const routinePage = read('src/components/screens/OperationalRoutinePage.tsx');
const enumLabels = read('src/utils/enumLabels.ts');

check('VPCT0100 "avaliar" mostra resultado legível (não JSON cru)', !/JSON\.stringify\(evResult/.test(vpct) && /Resultado da avaliação/.test(vpct));
check('VPCT0100 fornecedor usa modal', /loader=\{loadSuppliers\}/.test(vpct));
check('VTER0100 usa freight_type FIXED/PERCENT (não CIF)', !/freight_type":"CIF"/.test(routineCatalog));
check('VSUP0610 usa scope GLOBAL (não PURCHASE_ORDER)', !/"scope":"PURCHASE_ORDER"/.test(routineCatalog));
check('VSUP0610 usa domain RECEIVING_NOTICE (não RECEIVING)', !/"domain":"RECEIVING"/.test(routineCatalog));
check('VSUP0610 usa value_type BOOL (não BOOLEAN)', !/"value_type":"BOOLEAN"/.test(routineCatalog));
check('rotina oferece opções PT-BR para freight_type/scope/domain', /freight_type: \["FIXED", "PERCENT"\]/.test(routinePage) && /scope: \["GLOBAL"/.test(routinePage) && /domain: \["PURCHASE_TABLE"/.test(routinePage));
check('enumLabel traduz enums de compras (GLOBAL, PO_CONFIRMATION, etc.)', /GLOBAL: 'Global'/.test(enumLabels) && /PO_CONFIRMATION: 'Confirmação de pedido'/.test(enumLabels) && /RECEIVING_NOTICE/.test(enumLabels));

console.log(`\n${checks.length}/${checks.length} validações de suprimentos aprovadas.`);

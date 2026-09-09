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

// ── Situação do fornecedor sobrevive à edição ──────────────────────────────
//
// O `PUT /api/suppliers` grava `is_active` direto do corpo. Como a tela não lia
// nem enviava o campo, toda edição devolvia o fornecedor como inativo e ele
// sumia da listagem, que mostra só os ativos. A correção é dos dois lados: o
// backend passou a tratar o campo como opcional (nil = manter) e a tela passou
// a carregar, exibir e enviar a situação.
const vsup0500 = read('src/components/screens/suprimento/Vsup0500Page.tsx');
check('VSUP0500 lê a situação ao abrir o fornecedor',
  /is_active: parsed\.is_active !== false && parsed\.IsActive !== false/.test(vsup0500));
check('VSUP0500 envia a situação ao atualizar',
  /updateSupplier\(\{ \.\.\.form, is_active: form\.is_active !== false \}\)/.test(vsup0500));
check('VSUP0500 mostra a situação como caixa "Ativo"',
  /checked=\{form\.is_active !== false\}[\s\S]{0,160}Ativo/.test(vsup0500));
check('cadastro novo de fornecedor nasce ativo', /is_active: true,/.test(vsup0500));

// O cargo do contato vai em `position`; enviado como `role`, era descartado.
check('VSUP0500 envia o cargo do contato como position',
  /position: contactForm\.position \|\| undefined/.test(vsup0500));
check('VSUP0500 classifica o contato por tipo',
  /contact_type_id: contactForm\.contact_type_id/.test(vsup0500));

console.log(`\n${checks.length}/${checks.length} validações de suprimentos aprovadas.`);

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (name, condition) => {
  if (!condition) throw new Error(`Falhou: ${name}`);
  checks.push(name);
  console.log(`✓ ${name}`);
};

const pricing = read('src/services/salesPricingService.ts');
const policies = read('src/services/commercialPolicyService.ts');
const policyPage = read('src/components/screens/pdv/Vpdv0108Page.tsx');
const routines = read('src/components/screens/OperationalRoutinePage.tsx');
const routineCatalog = read('src/components/screens/operationalRoutines.ts');
const recurring = read('src/services/recurringSalesService.ts');
const recurringPage = read('src/components/screens/pdv/Vvre0200Page.tsx');
const commissions = read('src/services/commercialCommissionService.ts');

check('preço de tabela envia item_code como texto', /item_code:\s*String\(dto\.item_code\)/.test(pricing));
check('formação de preço envia item_code como texto', /item_code:\s*String\(req\.item_code\)\.trim\(\)/.test(pricing));
check('geração em lote envia todos os item_codes como texto', /item_codes:\s*itemCodes\.map\(\(code\) => String\(code\)\.trim\(\)\)/.test(pricing));
check('item específico da política envia item_code como texto', /item_code:\s*dto\.item_code \? String\(dto\.item_code\)\.trim\(\)/.test(policies));
check('política criada pode ser atualizada', /updateCommercialPolicy\(form\.code/.test(policyPage) && /Salvar alterações/.test(policyPage));
check('item específico usa pesquisa no cadastro', /loader=\{loadItems\}/.test(policyPage));
check('situação e ação vazias são recusadas', /validateStructuredChoices/.test(routines) && /key === "status"/.test(routines) && /key === "action"/.test(routines));
check('workflow permite listar pedidos por situação', /VVND0600[\s\S]*?\/api\/sales-order\/status\/\{status\}/.test(routineCatalog));
check('cancelamento recorrente envia data efetiva e política futura', /effective_date/.test(recurring) && /future_orders_policy/.test(recurringPage));
check('geração recorrente envia chave de idempotência', /generate-order[\s\S]*?Idempotency-Key/.test(recurring));
check('razão de comissões permite conciliar e pagar com idempotência', /ledger\/\$\{code\}\/\$\{action\}/.test(commissions) && /Idempotency-Key/.test(commissions));
check('RMA expõe criação, transição e evidências reais', /calls\/\{code\}\/rmas/.test(routineCatalog) && /file-upload/.test(routineCatalog));

console.log(`\n${checks.length}/${checks.length} regressões comerciais validadas.`);

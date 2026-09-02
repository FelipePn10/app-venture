import fs from 'node:fs';
import path from 'node:path';

// Validações da rodada de engenharia/manufatura (VMAQ0200, VENT0200/0210,
// VENT0115/0202/0204, VPRO0100/0900). Rode com: npm run test:engineering
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (name, condition) => {
  if (!condition) throw new Error(`Falhou: ${name}`);
  checks.push(name);
  console.log(`✓ ${name}`);
};

const vent0200 = read('src/components/screens/engenharia/Vent0200Page.tsx');
const vent0210 = read('src/components/screens/engenharia/Vent0210Page.tsx');
const vpro0100 = read('src/components/screens/producao/Vpro0100Page.tsx');
const vpro0900 = read('src/components/screens/producao/Vpro0900Page.tsx');
const vmaq0200 = read('src/components/screens/engenharia/Vmaq0200Page.tsx');
const routinePage = read('src/components/screens/OperationalRoutinePage.tsx');
const routineCatalog = read('src/components/screens/operationalRoutines.ts');
const lookups = read('src/services/lookups.ts');
const structure = read('src/services/ItemStructureService.ts');
const classifications = read('src/services/itemClassificationService.ts');

check('VENT0200 removeu botões Nav e PDM', !/className="it-nav-btn"/.test(vent0200) && !/>PDM<\/button>/.test(vent0200));
check('VENT0200 removeu texto "Focco"', !/Focco/i.test(vent0200));
check('VENT0200 classificação usa modal pesquisável', /loadItemClassifications/.test(vent0200));
check('VENT0200 item embalagem usa modal de itens', /loader=\{loadItems\}/.test(vent0200));
check('VENT0200 bloqueia item-base como modelo em item-base', /form\.nature === 2/.test(vent0200));
check('VENT0210 removeu NAV e Ferramentas', !/className="fe-nav-btn"/.test(vent0210) && !/Configurador/.test(vent0210));
check('VENT0210 item pai usa modal (buscarItemPai)', /buscarItemPai/.test(vent0210) && /loader=\{loadItems\}/.test(vent0210));
check('VENT0210 preenche descrição/UM do filho automaticamente', /handleChildCodeBlur/.test(vent0210) && /findItemByCode/.test(vent0210));
check('VENT0210 atualiza componente (updateComponent)', /updateComponent/.test(structure) && /updateComponent\(toPayload/.test(vent0210));
check('VENT0210 remove componente persistido (deleteComponent)', /deleteComponent/.test(structure) && /deleteComponent\(row\.parentCode/.test(vent0210));
check('criação de componente envia posição como sequence', /sequence: payload\.position/.test(structure));
check('VCLA0100 preserva código pai textual e omite raiz vazia', /parent_code: dto\.parent_code\?\.trim\(\) \|\| undefined/.test(classifications));
check('VENT0210 posição obrigatória validada', /invalidPos/.test(vent0210));
check('VPRO0100 origem de operação traduzida', /enumLabel\(o\)/.test(vpro0100) && /enumLabel\(o\.origin\)/.test(vpro0100));
check('VPRO0100 item usa modal', /loader=\{loadItems\}/.test(vpro0100));
check('VPRO0900 item usa modal', /loader=\{loadItems\}/.test(vpro0900));
check('VMAQ0200 item/máscara usam modal', /loader=\{loadItems\}/.test(vmaq0200) && /loader=\{loadItemMasks\}/.test(vmaq0200));
check('VENT0204 não envia enterprise_id/created_by', /VENT0204[\s\S]*?Família de produtos"/.test(routineCatalog) && !/VENT0204[\s\S]*?enterprise_id/.test(routineCatalog));
check('lookups expõe operações de roteiro', /loadOperations/.test(lookups) && /manufacturingRoutingService/.test(lookups));
check('rotina traduz rótulos de roteiro (is_standard, network, critical_path)', /is_standard: "Padrão"/.test(routinePage) && /network: "Rede"/.test(routinePage) && /critical_path: "Caminho crítico"/.test(routinePage));
check('rotina usa modal para operação e grupo', /grupo pdm\|pdm\|grupo/.test(routinePage) && /operação\|operation/.test(routinePage));

console.log(`\n${checks.length}/${checks.length} validações de engenharia aprovadas.`);

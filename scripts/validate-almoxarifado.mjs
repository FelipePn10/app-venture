import fs from 'node:fs';
import path from 'node:path';

// Validações da rodada de almoxarifado/estoque. Rode com: npm run test:almoxarifado
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (name, condition) => {
  if (!condition) throw new Error(`Falhou: ${name}`);
  checks.push(name);
  console.log(`✓ ${name}`);
};

const vest0500 = read('src/components/screens/almoxarifado/Vest0500Page.tsx');
const vent0800 = read('src/components/screens/almoxarifado/Vent0800Page.tsx');
const routineCatalog = read('src/components/screens/operationalRoutines.ts');
const routinePage = read('src/components/screens/OperationalRoutinePage.tsx');
const enumLabels = read('src/utils/enumLabels.ts');

check('VEST0500 item/almoxarifado/máscara usam modal', /loader=\{loadItems\}/.test(vest0500) && /loader=\{loadWarehouses\}/.test(vest0500) && /loader=\{loadItemMasks\}/.test(vest0500));
check('VEST0500 esclarece campo Endereço', /WMS/.test(vest0500));
check('VENT0800 removeu header Nav/Ferramentas', !/className="al-nav-btn"/.test(vent0800) && !/>Ajuda</.test(vent0800) && !/>Atalhos</.test(vent0800));
check('VENT0800 mantém carregar almoxarifado pelo código', /handleLoadWarehouseByCode/.test(vent0800));
check('VEST0300 usa application SUPRIMENTOS (não RECEIVING)', !/"application":"RECEIVING"/.test(routineCatalog) && /"application":"SUPRIMENTOS"/.test(routineCatalog));
check('VEST0300 operações têm nomes distintos (sem 2 "Cadastrar")', /Cadastrar máscara/.test(routineCatalog) && /Gerar código de lote/.test(routineCatalog));
check('VEXP0120 operações têm nomes distintos (instrução × caixa)', /Consultar instruções de entrega/.test(routineCatalog) && /Consultar caixas de despacho/.test(routineCatalog));
check('rotina traduz rótulos de lote/expedição (date_format, lot_mask_id, etc.)', /date_format: "Formato de data"/.test(routinePage) && /lot_mask_id: "Máscara de lote"/.test(routinePage) && /planned_ship_date/.test(routinePage));
check('rotina oferece enum application em PT-BR', /application: \["SUPRIMENTOS"/.test(routinePage));
check('enumLabel traduz SUPRIMENTOS/PRODUCAO/EXPEDICAO e tipos de parte', /SUPRIMENTOS: 'Suprimentos'/.test(enumLabels) && /SEQ_NUMERICA: 'Sequência numérica'/.test(enumLabels));

console.log(`\n${checks.length}/${checks.length} validações de almoxarifado aprovadas.`);

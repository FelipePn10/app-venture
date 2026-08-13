import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const operational = read('src/components/screens/operationalRoutines.ts');
const itemScreen = read('src/components/screens/engenharia/Vent0200Page.tsx');
const itemService = read('src/services/itemService.ts');
const production = read('src/services/productionOrderService.ts');
const calendar = read('src/services/industrialCalendarService.ts');
const supplier = read('src/services/purchasingMasterService.ts');
const customer = read('src/components/screens/cliente/Vcli0500Page.tsx');
const fiscalMaster = read('src/services/fiscalAdvancedService.ts');
const fiscalMasterScreen = read('src/components/screens/fiscal/Vfis0350Page.tsx');
const source = [operational, itemScreen, itemService, production, calendar, supplier, customer, fiscalMaster, fiscalMasterScreen].join('\n');
const failures = [];

const forbid = (pattern, message) => { if (pattern.test(source)) failures.push(message); };
const requireText = (text, message) => { if (!source.includes(text)) failures.push(message); };

forbid(/legacy_(?:code|item_code|item_base_cod)/, 'campos legacy não podem aparecer no frontend');
forbid(/(?:🔍|🔎)/u, 'lupa em emoji encontrada');
forbid(/code:\s*Number\(form\.code\)/, 'cadastro do item ainda converte o código para número');
forbid(/\{[^{}]*name:\s*["']item_code["'][^{}]*type:\s*["']number["'][^{}]*\}/, 'rotina genérica ainda restringe item_code a número');
forbid(/\{[^{}]*name:\s*["']item_(?:from|to)["'][^{}]*type:\s*["']number["'][^{}]*\}/, 'filtro de faixa de itens ainda restringe código a número');

requireText('code: form.code.trim().toUpperCase()', 'cadastro não normaliza o código comercial');
requireText('fiscal_effective?: ItemFiscalEffective', 'resposta fiscal efetiva do item não está tipada');
requireText("'HERDADO' | 'SOBRESCRITO'", 'origem dos valores fiscais não está controlada');
requireText("'/api/production-order/scanner/tokens'", 'criação de token do scanner ausente');
requireText("'/api/production-order/scanner/scan'", 'leitura do scanner ausente');
requireText('barcode_value', 'barcode_value não é utilizado');
requireText("`${BASE}/generate`", 'geração automática do calendário ausente');
requireText("'/api/item-suppliers/search'", 'busca de item-fornecedor ausente');
requireText('/quality-reports', 'rotas de laudos do fornecedor ausentes');
requireText('default_calculate_pis_cofins', 'padrões do mestre fiscal não estão integrados');
requireText('Herdar do mestre fiscal', 'cadastro do item não oferece herança fiscal');

if (failures.length) {
  console.error(`Ajustes operacionais inválidos (${failures.length}):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('Ajustes operacionais validados: códigos, calendário, fiscal, scanner, fornecedores, laudos e ícones.');

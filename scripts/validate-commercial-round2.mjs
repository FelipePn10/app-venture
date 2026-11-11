import fs from 'node:fs';
import path from 'node:path';

// Validações da 2ª rodada (30/08/2026) — garantem que as correções de frontend
// das telas comerciais permaneçam presentes. Rode com: npm run test:commercial-round2
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (name, condition) => {
  if (!condition) throw new Error(`Falhou: ${name}`);
  checks.push(name);
  console.log(`✓ ${name}`);
};

const pricing = read('src/services/salesPricingService.ts');
const routinePage = read('src/components/screens/OperationalRoutinePage.tsx')
  + read('src/utils/fieldLabels.ts');
const routineCatalog = read('src/components/screens/operationalRoutines.ts');
const vvnd0200 = read('src/components/screens/comercial/Vvnd0200Page.tsx');
const vvnd0300 = read('src/components/screens/comercial/Vvnd0300Page.tsx');
const vvnd0400 = read('src/components/screens/comercial/Vvnd0400Page.tsx');
const vsac = read('src/components/screens/comercial/Vsac0100Page.tsx');
// A VEXR0100 virou a aba Entrega do pedido (VVND0200): a prévia mora no painel.
const vexr = read('src/components/screens/comercial/ReprogramacaoEntregaPanel.tsx');
const vpdv0108 = read('src/components/screens/pdv/Vpdv0108Page.tsx');
const vpdv0111 = read('src/components/screens/pdv/Vpdv0111Page.tsx');
const vvre = read('src/components/screens/pdv/Vvre0200Page.tsx');
const lookups = read('src/services/lookups.ts');
const exportButton = read('src/components/ui/ExportButton.tsx');
const enumLabels = read('src/utils/enumLabels.ts');

check('resolve-by-item normaliza reference_date para AAAA-MM-DD', /referenceDate\s*\.slice\(0,\s*10\)/.test(pricing));
check('rotina carrega listagem GET automaticamente', /autoLoaded/.test(routinePage) && /method\s*!==\s*"GET"/.test(routinePage));
check('rotina exporta o resultado (build) mesmo sem tabela visível', /build=\{\(\)\s*=>\s*\(\{[\s\S]*columns:\s*columns\.map\(humanLabel\)/.test(routinePage));
check('VVND0200 usa busca canônica com filtros de situação/análise/conferência', /\$\{BASE\}\/search/.test(read('src/services/salesOrderService.ts')) && /commercial_analysis_status/.test(vvnd0200) && /conference_status/.test(vvnd0200));
check('VVND0200 mantém filtro por situação', /status: filterStatus/.test(vvnd0200));
check('complementos do representante na VVND0400 (planos + classificações)', /interest-classifications/.test(read('src/services/representativeService.ts')) && /ComplementosRepresentantePanel/.test(read('src/components/screens/comercial/Vvnd0400Page.tsx')));
check('VGAR0211 lista anexos do chamado para o modal', /calls\/\{code\}\/attachments"[\s\S]*?method:\s*"GET"/.test(routineCatalog) || /Listar anexos do chamado/.test(routineCatalog));
check('VVND0200 filtra cliente por modal pesquisável', /loadCustomers/.test(vvnd0200) && /filterCustomer \? Number\(filterCustomer\)/.test(vvnd0200));
check('VVND0200 exporta a lista de pedidos (build)', /build=\{\(\)\s*=>\s*\(\{/.test(vvnd0200) && /visibleOrders\.map/.test(vvnd0200));
check('VVND0300 remove tabela duplicada da capa (sem loadSalesTables)', /loadSalesTables/.test(vvnd0300) === false && /price_table_code: tableCode/.test(vvnd0300));
check('VVND0300 comissão herdada do representante e não editável', /selecionarRepresentante/.test(vvnd0300) && /readOnly title="Comissão herdada do vínculo do representante/.test(vvnd0300));
check('VVND0300 exporta a lista de orçamentos (build)', /build=\{\(\)\s*=>\s*\(\{/.test(vvnd0300) && /visible\.map/.test(vvnd0300));
check('VVND0400 exporta lista e relatório individual', /relatorioIndividual/.test(vvnd0400) && /reportRows/.test(vvnd0400) && /build=\{\(\)\s*=>\s*/.test(vvnd0400));
check('VSAC0100 traduz situação (DISCONTINUED_ORDER)', /SITUATION_META/.test(vsac) && /DISCONTINUED_ORDER/.test(vsac) && /Pedido descontinuado/.test(vsac));
check('VSAC0100 exporta chamados/consumidores (build)', /build=\{\(\)\s*=>\s*view === "calls"/.test(vsac));
check('Aba Entrega do pedido (ex-VEXR0100) exporta a prévia de reprogramação (build)', /build=\{\(\)\s*=>\s*\(\{/.test(vexr) && /itemPlans\.map/.test(vexr));
check('VPDV0108 usa modal pesquisável para máscara', /loadItemMasks/.test(vpdv0108) && /loader=\{loadItemMasks\}/.test(vpdv0108));
check('VPDV0111 permite atualizar política após criada', /updateCommercialPolicy\(form\.code/.test(vpdv0111) && /Salvar alterações/.test(vpdv0111) && /setForm\(p\)/.test(vpdv0111));
check('VVRE0200 exporta recorrências e permite cancelar', /build=\{\(\)\s*=>\s*\(\{/.test(vvre) && /rows\.map/.test(vvre) && /can_cancel === false/.test(vvre));
check('lookups expõe máscaras de item (loadItemMasks)', /loadItemMasks/.test(lookups) && /with-masks/.test(lookups));
check('lookups expõe classificações de item', /loadItemClassifications/.test(lookups) && /items\/classifications\/masks/.test(lookups));
check('lookups expõe características do configurador', /loadCharacteristics/.test(lookups) && /configurator\/characteristics/.test(lookups));
check('exportação cai para listas .erp-list quando não há .erp-grid', /scrapeList/.test(exportButton) && /erp-list-row/.test(exportButton));
check('utilitário enumLabel traduz enums para PT-BR', /enumLabel/.test(enumLabels) && /DISCONTINUED_ORDER/.test(enumLabels) && /Pedido descontinuado/.test(enumLabels));

console.log(`\n${checks.length}/${checks.length} validações da 2ª rodada aprovadas.`);

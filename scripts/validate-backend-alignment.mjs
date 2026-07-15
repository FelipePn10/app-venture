import { readFileSync } from 'node:fs';
import process from 'node:process';

const routines = readFileSync(new URL('../src/components/screens/operationalRoutines.ts', import.meta.url), 'utf8');
const screens = readFileSync(new URL('../src/types/erpScreen.ts', import.meta.url), 'utf8');
const host = readFileSync(new URL('../src/components/screens/ScreenHostPage.tsx', import.meta.url), 'utf8');
const help = readFileSync(new URL('../HELP_TELAS_ERP.md', import.meta.url), 'utf8');
const fiscalConfigService = readFileSync(new URL('../src/services/fiscalConfigService.ts', import.meta.url), 'utf8');
const fiscalConfigScreen = readFileSync(new URL('../src/components/screens/fiscal/Vfis0100Page.tsx', import.meta.url), 'utf8');
const routeSources = `${routines}\n${fiscalConfigService}`;

const codes = [
  'VSUP0600', 'VAVF0300', 'VSUP0610', 'VSUP0620', 'VIMP0300', 'VAVF0203',
  'VIMP0200',
  'VPDC0210', 'VSUP0630', 'VSUP0640', 'VSUP0650',
  'VCFG0100', 'VCFG0200', 'VCFG0300', 'VCFG0400', 'VCFG0500', 'VCFG0600',
  'VTER0100', 'VTER0200', 'VTER0300', 'VTER0400',
  'VAPS0100', 'VAPS0200', 'VAPS0300', 'VAPS0400', 'VAPS0500', 'VAPS0600',
  'VENG0300', 'VENG0400', 'VMRP0200', 'VEST0300',
  'VSEC0100', 'VPLA0300', 'VRES0100', 'VFIS0600', 'VFIS0610', 'VADM0100', 'VEXP0110', 'VEXP0120',
  'VCLI0117', 'VCLI0202', 'VIMP0102', 'VGAR0211',
  'VENG0500', 'VMAQ0300', 'VCAL0200', 'VPRO1100', 'VVND0600', 'VSAC0200', 'VREP0600', 'VEST0400',
  'VFIN0600', 'VFIN0610', 'VFIN0620',
  'VVND0610',
  'VSUP0660', 'VSUP0670', 'VSUP0680',
  'VENG0600', 'VENG0610', 'VCLI0600', 'VCTB0600',
  'VFIS0620', 'VFIS0630', 'VFIS0640', 'VFIS0120',
  'VFIS0660', 'VUTL0560',
];

const requiredPaths = [
  '/api/procurement/records', '/api/procurement/purchase-movements',
  '/api/procurement/receiving-inspection-routes', '/api/procurement/receiving-inspection-orders',
  '/api/procurement/supplier-scorecards', '/api/procurement/approval-limits',
  '/api/procurement/edi-messages', '/api/procurement/import-processes',
  '/api/procurement/parameters', '/api/procurement/supplier-homologations',
  '/api/purchase-order/consultation', '/approve', '/authorize', '/receipts',
  '/api/purchase-order-tolerances/',
  '/api/configurator/sets', '/api/configurator/variables/', '/api/configurator/characteristics',
  '/api/configurator/item-characteristics/', '/api/configurator/generate-mask',
  '/api/configurator/description-types', '/api/configurator/item-descriptions',
  '/api/configurator/equivalent-rules', '/api/configurator/item-rules',
  '/api/third-party-services/prices', '/api/third-party-services/cost',
  '/api/third-party-services/orders', '/api/third-party-services/global-conversions',
  '/api/aps/resource-groups', '/api/aps/machine-calendars', '/api/aps/machine-downtimes',
  '/sequencing-profile', '/industrial-profile', '/api/aps/sequence/view', '/api/aps/sequence/settings',
  '/api/bom-headers/', '/api/drawings/', '/api/planning/run-pipeline', '/api/lot-masks/',
  '/api/password-change-requests/', '/api/planning-params/', '/api/restriction-reason/',
  '/api/fiscal/sped/efd', '/api/fiscal/entries/import-nfe/', '/api/audit-log',
  '/api/fiscal/config/branding', '/api/fiscal/config/logo',
  '/api/financial/adiantamentos/', '/api/financial/cnab/remessa-240', '/api/financial/conciliacao/',
  '/api/recurring-sales/{code}/recalculate-adjustment',
  '/api/suppliers/support/parameters/', '/api/suppliers/contacts/phones', '/api/suppliers/contacts/emails',
  '/api/item-suppliers/supplier/', '/quality-reports', '/api/purchase-price-tables/sources',
  '/api/purchase-price-tables/items/copy-adjustments', '/api/purchase-price-tables/sources/apply', '/candidates',
  '/api/routing/route-operations/{routeId}/network', '/api/routing/tools/serials/',
  '/api/customers/support/sales-tables/prices/', '/price-history', '/generate-prices', '/api/accounting/sped/ecd/',
  '/api/fiscal/manifestacao', '/api/fiscal/inutilizacao', '/api/fiscal/ibpt/import', '/api/fiscal/ibpt/lookup',
  '/api/fiscal/exits/from-load', '/danfe', '/api/fiscal/tabelas/ncm/',
  '/api/fiscal/support/dispositivos-legais/', '/api/fiscal/support/cfops/', '/api/fiscal/support/parametros-icms-ipi/',
  '/api/fiscal/support/motivos-transferencia-dapi/', '/api/fiscal/support/codigos-ajuste-apuracao-icms/',
  '/api/fiscal/support/codigos-ajuste-icms/', '/api/fiscal/support/linhas-apuracao-icms/',
  '/api/fiscal/support/lancamentos-resumo-icms/', '/api/fiscal/support/apuracao-simples-nacional/',
  '/api/location/ufs/', '/api/customers/support/regions/',
];

const failures = [];
for (const [index, match] of [...routines.matchAll(/json\('([^']*)'\)/g)].entries()) {
  try { JSON.parse(match[1]); } catch (error) { failures.push(`payload de exemplo ${index + 1} inválido: ${error.message}`); }
}
for (const code of codes) {
  if (!routines.includes(`${code}: routine(`)) failures.push(`${code}: configuração ausente`);
  if (!screens.includes(`code: "${code}"`)) failures.push(`${code}: catálogo ausente`);
  if (!help.includes(`### ${code} —`)) failures.push(`${code}: manual ausente no HELP`);
}
for (const path of requiredPaths) {
  if (!routeSources.includes(path)) failures.push(`${path}: rota não declarada`);
}
if (!host.includes('OPERATIONAL_ROUTINES') || !host.includes('OperationalRoutinePage')) {
  failures.push('registro dinâmico das rotinas ausente no ScreenHost');
}
if (!routines.includes('VPDC0200: routine("VPDC0200"') || !routines.includes('/api/purchase-order/create')) failures.push('VPDC0200 ainda não possui rotina própria para o pedido de compra real');
if (!fiscalConfigService.includes('new FormData()') || !fiscalConfigService.includes("body.append('logo'")) failures.push('branding fiscal não usa multipart/FormData');
if (!fiscalConfigService.includes('MAX_BRANDING_LOGO_BYTES = 2 * 1024 * 1024')) failures.push('limite de 2 MB do branding ausente');
if (!fiscalConfigScreen.includes('Preview persistido') || !fiscalConfigScreen.includes('getFiscalBrandingLogo')) failures.push('preview persistido do logo ausente');

if (failures.length) {
  console.error(`Falha de alinhamento (${failures.length}):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`Alinhamento validado: ${codes.length} rotinas e ${requiredPaths.length} grupos de rotas.`);

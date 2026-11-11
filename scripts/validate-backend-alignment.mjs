import { readFileSync, readdirSync } from 'node:fs';
import process from 'node:process';

const routines = readFileSync(new URL('../src/components/screens/operationalRoutines.ts', import.meta.url), 'utf8');
const screens = readFileSync(new URL('../src/types/erpScreen.ts', import.meta.url), 'utf8');
const host = readFileSync(new URL('../src/components/screens/ScreenHostPage.tsx', import.meta.url), 'utf8');
const help = readFileSync(new URL('../HELP_TELAS_ERP.md', import.meta.url), 'utf8');
const fiscalConfigService = readFileSync(new URL('../src/services/fiscalConfigService.ts', import.meta.url), 'utf8');
const fiscalConfigScreen = readFileSync(new URL('../src/components/screens/fiscal/Vfis0100Page.tsx', import.meta.url), 'utf8');
// Telas que deixaram de ser rotina de JSON cru e ganharam tela própria: a
// garantia passa a ser a tela registrada no ScreenHost e o serviço que ela usa
// falar com a rota real.
const dedicated = {
  VFIN0600: { page: 'Vfin0600Page', service: 'adiantamentoService.ts', path: '/api/financial/adiantamentos' },
  VFIN0620: { page: 'Vfin0620Page', service: 'financialService.ts', path: '/conciliacao/' , base: '/api/financial' },
  VFIN0610: { page: 'Vfin0610Page', service: 'financialService.ts', path: '/cnab/remessa-240', base: '/api/financial' },
  VAVF0300: { page: 'Vavf0300Page', service: 'procurementService.ts', path: '/supplier-scorecards', base: '/api/procurement' },
};
// O serviço monta `${BASE}/...`: a rota do grupo conta como declarada quando
// o serviço da tela própria usa a base (e, na conciliação, o trecho da rota).
const dedicatedPaths = Object.values(dedicated)
  .filter((d) => readFileSync(new URL(`../src/services/${d.service}`, import.meta.url), 'utf8').includes(d.path))
  .map((d) => (d.base ? `${d.base}${d.path}` : `${d.path}/`)).join('\n');
// A VFIS0640 também abre o DANFE, pelo mesmo serviço da nota.
const danfePath = readFileSync(new URL('../src/services/nfeService.ts', import.meta.url), 'utf8').includes('/danfe') ? '/danfe' : '';
// As rotinas genéricas que viraram tela própria saíram do catálogo de rotinas:
// a rota conta como declarada quando o serviço de alguma tela a usa.
const servicesDir = new URL('../src/services/', import.meta.url);
const allServices = readdirSync(servicesDir).filter((f) => f.endsWith('.ts'))
  .map((f) => {
    const src = readFileSync(new URL(f, servicesDir), 'utf8');
    // `${BASE}/x` com BASE = '/api/y' vira '/api/y/x', para a busca por trecho.
    const bases = Object.fromEntries([...src.matchAll(/const ([A-Z_]+)\s*=\s*'(\/api[^']*)'/g)].map((m) => [m[1], m[2]]));
    return src.replace(/\$\{([A-Z_]+)\}/g, (all, k) => bases[k] ?? all);
  }).join('\n');
const routeSources = `${routines}\n${fiscalConfigService}\n${dedicatedPaths}\n${danfePath}\n${allServices}`;


const codes = [
  'VAVF0300', 'VIMP0200', 'VCFG0100',       'VGAR0211', 'VFIN0600', 'VFIN0610', 'VFIN0620',
    ];

const requiredPaths = [
  '/api/procurement/records', '/api/procurement/purchase-movements',
  '/api/procurement/receiving-inspection-routes', '/api/procurement/receiving-inspection-orders',
  '/api/procurement/supplier-scorecards', '/api/procurement/approval-limits',
  '/api/procurement/edi-messages', '/api/procurement/import-processes',
  // Parâmetros genéricos de compras saíram: nenhum fluxo os lia.
  '/api/procurement/supplier-homologations',
  '/api/purchase-order/consultation', '/approve', '/authorize', '/receipts',
  '/api/purchase-order-tolerances/',
  '/api/configurator/sets', '/api/configurator/variables/', '/api/configurator/characteristics',
  '/api/configurator/item-characteristics/', '/api/configurator/generate-mask',
  // Descrições configuradas e regras equivalentes não alimentam nenhum fluxo: saíram com a VCFG0500/0600.
  // Regras de itens configurados (cfg_item_rules) idem.
  '/api/third-party-services/prices', '/api/third-party-services/cost',
  '/api/third-party-services/orders', '/api/third-party-services/global-conversions',
  '/api/aps/resource-groups', '/api/aps/machine-calendars', '/api/aps/machine-downtimes',
  // A visão tabular do sequenciamento (VAPS0600) virou o quadro da VPRO0210.
  '/sequencing-profile', '/industrial-profile', '/api/aps/sequence/events/export', '/api/aps/sequence/settings',
  '/api/bom-headers/', '/api/drawings/', '/api/planning/run-pipeline', '/api/lot-masks/',
  '/api/planning-params/', '/api/restriction-reason/',
  '/api/fiscal/entries/import-key', '/api/audit-log',
  '/api/fiscal/config/branding', '/api/fiscal/config/logo',
  '/api/financial/adiantamentos/', '/api/financial/cnab/remessa-240', '/api/financial/conciliacao/',
  '/recalculate-adjustment',
  '/api/suppliers/contacts/phones', '/api/suppliers/contacts/emails',
  '/quality-reports', '/api/purchase-price-tables/sources',
  '/api/purchase-price-tables/items/copy-adjustments', '/api/purchase-price-tables/sources/apply',
  // A rede de precedência (VENG0600) é a aba Dependências da VENT0202 (`/routes/{id}/edges`, mesmo handler).
  '/edges', '/api/routing/tools/serials/',
  '/api/customers/support/sales-tables/prices/', '/price-history', '/generate-prices', '/api/accounting/sped/ecd/',
  '/api/fiscal/manifestacao', '/api/fiscal/inutilizacao', '/api/fiscal/ibpt/import', '/api/fiscal/ibpt/lookup',
  '/api/fiscal/exits/from-load', '/danfe', '/api/fiscal/tabelas/ncm/',
  '/api/fiscal/support/dispositivos-legais/', '/api/fiscal/support/cfops/', '/api/fiscal/support/parametros-icms-ipi/',
  '/api/fiscal/support/motivos-transferencia-dapi/', '/api/fiscal/support/codigos-ajuste-apuracao-icms/',
  '/api/fiscal/support/codigos-ajuste-icms/', '/api/fiscal/support/linhas-apuracao-icms/',
  '/api/fiscal/support/lancamentos-resumo-icms/', '/api/fiscal/support/apuracao-simples-nacional/',
  // UF e região (VUTL0560): a UF é a VLOC0100; a região é cadastro de apoio do cliente (VCLI0510).
  '/api/location/ufs/',
];

const failures = [];
for (const [index, match] of [...routines.matchAll(/json\('([^']*)'\)/g)].entries()) {
  try { JSON.parse(match[1]); } catch (error) { failures.push(`payload de exemplo ${index + 1} inválido: ${error.message}`); }
}
for (const code of codes) {
  const own = dedicated[code];
  if (own) {
    if (!host.includes(`${code}: <${own.page} />`)) failures.push(`${code}: tela própria ${own.page} não registrada no ScreenHost`);
    const svc = readFileSync(new URL(`../src/services/${own.service}`, import.meta.url), 'utf8');
    if (!svc.includes(own.path)) failures.push(`${code}: ${own.service} não usa ${own.path}`);
  } else if (!routines.includes(`${code}: routine(`)) failures.push(`${code}: configuração ausente`);
  if (!screens.includes(`code: "${code}"`)) failures.push(`${code}: catálogo ausente`);
  if (!help.includes(`### ${code} —`)) failures.push(`${code}: manual ausente no HELP`);
}
for (const path of requiredPaths) {
  if (!routeSources.includes(path)) failures.push(`${path}: rota não declarada`);
}
// Troca de senha tem tela própria (VSEC0100).
const passwordService = readFileSync(new URL('../src/services/passwordChangeService.ts', import.meta.url), 'utf8');
if (!host.includes('VSEC0100: <Vsec0100Page />')) failures.push('VSEC0100: tela própria de troca de senha ausente');
if (!passwordService.includes("'/api/password-change-requests'") || !passwordService.includes('/mine')) failures.push('/api/password-change-requests: rota não declarada');
if (!screens.includes('code: "VSEC0100"')) failures.push('VSEC0100: catálogo ausente');
if (!host.includes('OPERATIONAL_ROUTINES') || !host.includes('OperationalRoutinePage')) {
  failures.push('registro dinâmico das rotinas ausente no ScreenHost');
}
// A checagem antiga exigia a rotina de JSON cru para VPDC0200 — que era o
// avanço possível na época. Agora a tela é própria, e o que precisa ser
// garantido é que ela existe e fala com o endpoint real.
const pedidoCompra = readFileSync(new URL('../src/components/screens/suprimento/Vpdc0200Page.tsx', import.meta.url), 'utf8');
if (!host.includes('VPDC0200: <Vpdc0200Page />')) failures.push('VPDC0200 não está registrada no ScreenHost');
if (!pedidoCompra.includes('createOrder') || !pedidoCompra.includes('addOrderItem')) {
  failures.push('a tela de pedido de compra não usa o serviço real de pedido');
}
// VFIS0600 deixou de ser rotina de JSON cru: a EFD é gerada das próprias notas.
const spedService = readFileSync(new URL('../src/services/spedEfdService.ts', import.meta.url), 'utf8');
if (!host.includes('VFIS0600: <Vfis0600Page />')) failures.push('VFIS0600 não está registrada no ScreenHost');
if (!spedService.includes('/api/fiscal/sped/efd/automatico')) failures.push('a tela da EFD não usa a geração automática');
if (!screens.includes('code: "VFIS0600"') || !help.includes('### VFIS0600 —')) failures.push('VFIS0600: catálogo ou manual ausente');
if (!fiscalConfigService.includes('new FormData()') || !fiscalConfigService.includes("body.append('logo'")) failures.push('branding fiscal não usa multipart/FormData');
if (!fiscalConfigService.includes('MAX_BRANDING_LOGO_BYTES = 2 * 1024 * 1024')) failures.push('limite de 2 MB do branding ausente');
if (!fiscalConfigScreen.includes('Preview persistido') || !fiscalConfigScreen.includes('getFiscalBrandingLogo')) failures.push('preview persistido do logo ausente');

if (failures.length) {
  console.error(`Falha de alinhamento (${failures.length}):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`Alinhamento validado: ${codes.length} rotinas e ${requiredPaths.length} grupos de rotas.`);

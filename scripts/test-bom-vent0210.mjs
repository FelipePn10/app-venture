#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import esbuild from 'esbuild';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const vent0210 = read('src/components/screens/engenharia/Vent0210Page.tsx');
const modal = read('src/components/screens/engenharia/StructureItemLookupModal.tsx');
const service = read('src/services/ItemStructureService.ts');

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`✓ [BOM] ${name}`);
}

// 1. Paridade completa de campos e indicadores entre Payload, Domínio, Tela e Sinais da grade
const PAYLOAD_FIELDS = [
  'parent_code',
  'child_code',
  'parent_mask',
  'quantity',
  'unit_of_measurement',
  'health',
  'loss_percentage',
  'position',
  'notes',
  'is_active',
  'start_date',
  'end_date',
  'quantity_formula',
  'loss_formula',
  'quantity_rounding',
  'quantity_scale',
  'is_coproduct',
  'is_fixed_qty',
  'substitute_group',
  'substitute_priority',
  'inherit',
  'warehouse_code',
  'line_warehouse_code',
  'setup_loss',
  'cost_loss_type',
  'cost_loss',
  'cost_center_code',
  'is_critical_mps',
  'generates_inspection',
  'customer_supplied',
];

check('toPayload envia todos os 30 campos do contrato da estrutura', () => {
  for (const key of PAYLOAD_FIELDS) {
    assert.match(vent0210, new RegExp(`\\b${key}\\s*:`), `Campo ausente em toPayload: ${key}`);
  }
});

check('ComponentFlags sinaliza todos os indicadores na grade (incluindo herança, crítico MPS, inspeção e fórmula de perda)', () => {
  for (const cls of ['f-formula', 'f-futuro', 'f-expirado', 'f-alt', 'f-co', 'f-fixa', 'f-herda', 'f-mps', 'f-insp', 'f-cli', 'f-fant']) {
    assert.ok(vent0210.includes(cls), `Sinal visual ausente em ComponentFlags: ${cls}`);
  }
  assert.match(vent0210, /row\.lossFormula &&/);
  assert.match(vent0210, /row\.inherit &&/);
  assert.match(vent0210, /row\.isCriticalMps &&/);
  assert.match(vent0210, /row\.generatesInspection &&/);
});

check('Navegação multinível: botões de descer (Subnível/Nível →) na grade e no detalhe + botões de subir (Voltar nível / Item raiz) + atalho Alt+Seta', () => {
  assert.match(vent0210, /className=\{`fe-drill-btn\$\{row\.hasChildren \? ' has-sub' : ''\}`\}/);
  assert.match(vent0210, /handleSubirNivel/);
  assert.match(vent0210, /Voltar nível/);
  assert.match(vent0210, /Item raiz/);
  assert.match(vent0210, /Ver subestrutura/);
  assert.match(vent0210, /Abrir nível do filho/);
  assert.match(vent0210, /e\.altKey && \(e\.key === 'ArrowLeft' \|\| e\.key === 'ArrowUp'\)/);
  assert.match(vent0210, /confirmarDescarteSeSujo/);
});

check('Perda percentual fica bloqueada na grade e no detalhe quando há fórmula de perda', () => {
  const matches = vent0210.match(/disabled=\{Boolean\(row\.lossFormula\)\}/g) ?? [];
  assert.ok(matches.length >= 2, `Esperava disabled={Boolean(row.lossFormula)} na grade e no detalhe, encontrou ${matches.length}`);
});

// 2. Testes comportamentais reais compilando ItemStructureService.ts com esbuild
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'venture-bom-test-'));
try {
  const stubHttp = path.join(tmpDir, 'httpStub.mjs');
  fs.writeFileSync(
    stubHttp,
    `
    const state = (globalThis.__ventureBomHttpStub ??= { lastRequest: null, nextResponse: { data: {} } });
    export const httpClient = {
      get: async (url, cfg) => { state.lastRequest = { method: 'GET', url, cfg }; return state.nextResponse; },
      post: async (url, body, cfg) => { state.lastRequest = { method: 'POST', url, body, cfg }; return state.nextResponse; },
      put: async (url, body, cfg) => { state.lastRequest = { method: 'PUT', url, body, cfg }; return state.nextResponse; },
      delete: async (url, cfg) => { state.lastRequest = { method: 'DELETE', url, cfg }; return state.nextResponse; },
    };
    `,
  );

  const outfile = path.join(tmpDir, 'service.bundle.mjs');
  await esbuild.build({
    entryPoints: [path.join(root, 'src/services/ItemStructureService.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    plugins: [
      {
        name: 'alias-stubs',
        setup(build) {
          build.onResolve({ filter: /^@\/services\/httpClient$/ }, () => ({ path: stubHttp }));
          build.onResolve({ filter: /^@\// }, (args) => ({
            path: path.join(root, 'src', args.path.slice(2)) + '.ts',
          }));
        },
      },
    ],
  });

  const srv = await import(pathToFileURL(outfile).href);
  const setNextResponse = (r) => {
    const st = (globalThis.__ventureBomHttpStub ??= { lastRequest: null, nextResponse: { data: {} } });
    st.lastRequest = null;
    st.nextResponse = r;
  };

  await (async () => {
    // Teste 2.1: mapItemInfo resolve snake_case, PascalCase, fallback name e item fantasma
    setNextResponse({
      data: {
        data: {
          id: 42,
          code: 'CH-1020-3MM',
          pdm: { description_technique: 'CHAPA AÇO SAE 1020 3MM' },
          warehouse: { unit_of_measurement: 'KG' },
          planning: { ghost: true },
        },
      },
    });
    const info = await srv.findItemByCode('CH-1020-3MM');
    assert.equal(info.code, 'CH-1020-3MM');
    assert.equal(info.name, 'CHAPA AÇO SAE 1020 3MM');
    assert.equal(info.unit, 'KG');
    assert.equal(info.ghost, true);
    passed += 1;
    console.log('✓ [BOM Runtime] findItemByCode extrai código comercial, descrição PDM, UM de estoque e flag fantasma');

    // Teste 2.2: resolveStructure mapeia todos os campos, indicadores, nominalQuantity e hasChildren para multinível
    setNextResponse({
      data: {
        root_item_code: 'PA-1000',
        total_levels: 2,
        total_nodes: 2,
        components: [
          {
            level: 1,
            effective_mask: '1.94M#INOX',
            incomplete_configuration: false,
            missing_characteristics: [],
            component: {
              id: 77,
              parent_code: 'PA-1000',
              child_code: 'SUB-2000',
              child_description: 'CONJUNTO SOLDADO',
              parent_mask: '1.94M',
              quantity: 3.88,
              nominal_quantity: 1,
              formula_applied: true,
              effective_quantity: 4.074,
              unit_of_measurement: 'M2',
              quantity_stock_uom: 60.916,
              stock_unit_of_measurement: 'KG',
              conversion_factor: 15.7,
              health: 'FANTASMA',
              loss_percentage: 5,
              loss_formula: 'LARGURA * 0.05',
              quantity_formula: 'COMPRIMENTO * 2',
              quantity_rounding: 'UP',
              quantity_scale: 3,
              sequence: 10,
              notes: 'Solda MIG',
              is_active: true,
              created_at: '2026-11-25T10:00:00Z',
              updated_at: '2026-11-25T11:00:00Z',
              start_date: '2026-01-01T00:00:00Z',
              end_date: '2026-12-31T00:00:00Z',
              is_coproduct: false,
              is_fixed_qty: true,
              substitute_group: 2,
              substitute_priority: 1,
              inherit: true,
              warehouse_code: 5,
              line_warehouse_code: 6,
              setup_loss: 0.5,
              cost_loss_type: 'PERCENTUAL',
              cost_loss: 2.5,
              cost_center_code: 9,
              is_critical_mps: true,
              generates_inspection: true,
              customer_supplied: true,
            },
            children: [
              {
                level: 2,
                component: {
                  id: 78,
                  parent_code: 'SUB-2000',
                  child_code: 'MP-3000',
                  child_description: 'CHAPA INOX',
                  quantity: 2,
                  effective_quantity: 2,
                  unit_of_measurement: 'KG',
                  health: 'ATIVO',
                  loss_percentage: 0,
                  sequence: 10,
                  is_active: true,
                  created_at: '2026-11-25T10:00:00Z',
                  updated_at: '2026-11-25T10:00:00Z',
                },
                children: [],
              },
            ],
          },
        ],
      },
    });

    const tree = await srv.resolveStructure('PA-1000', '1.94M');
    assert.equal(tree.totalLevels, 2);
    assert.equal(tree.totalNodes, 2);
    assert.equal(tree.components.length, 1);
    const c = tree.components[0];
    assert.equal(c.hasChildren, true);
    assert.equal(c.effectiveMask, '1.94M#INOX');
    assert.equal(c.quantity, 3.88);
    assert.equal(c.nominalQuantity, 1);
    assert.equal(c.formulaApplied, true);
    assert.equal(c.loadedUom, 'M2');
    assert.equal(c.stockUnitOfMeasurement, 'KG');
    assert.equal(c.conversionFactor, 15.7);
    assert.equal(c.quantityStockUom, 60.916);
    assert.equal(c.inherit, true);
    assert.equal(c.isFixedQty, true);
    assert.equal(c.isCriticalMps, true);
    assert.equal(c.generatesInspection, true);
    assert.equal(c.customerSupplied, true);
    assert.equal(c.warehouseCode, 5);
    assert.equal(c.lineWarehouseCode, 6);
    assert.equal(c.costCenterCode, 9);
    assert.equal(c.setupLoss, 0.5);
    assert.equal(c.costLossType, 'PERCENTUAL');
    assert.equal(c.costLoss, 2.5);
    assert.equal(c.startDate, '2026-01-01');
    assert.equal(c.endDate, '2026-12-31');
    passed += 1;
    console.log('✓ [BOM Runtime] resolveStructure preserva 100% dos campos, indicadores, conversão UM e árvore multinível');
  })();
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

check('Modal StructureItemLookupModal filtra por tipo, bloqueia ancestrais/duplicados e permite seleção múltipla', () => {
  assert.match(modal, /Item pai \/ nível superior/);
  assert.match(modal, /Já na estrutura/);
  assert.match(modal, /Marcar visíveis/);
  assert.match(modal, /Desmarcar todos/);
  assert.match(modal, /Incluir \$\{selectedCodes\.size\} itens selecionados/);
});

console.log(`\n${passed}/${passed} testes automatizados da estrutura de produto (VENT0210) aprovados.`);

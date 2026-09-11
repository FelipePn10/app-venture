#!/usr/bin/env node
/**
 * Trava a rodada de cobertura: campos que o backend aceitava e nenhuma tela
 * preenchia. Cada verificação aqui corresponde a um dado que era digitado e
 * jogado fora, ou que sequer podia ser informado.
 */
import { readFileSync } from 'node:fs';

const checks = [];
function check(name, condition) {
  checks.push(name);
  if (!condition) throw new Error(`Falhou: ${name}`);
  console.log(`✓ ${name}`);
}
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// ── Chaves que iam para o lixo ──────────────────────────────────────────────
check('horizonte da manutenção vai na query, não no corpo',
  /params: \{ horizon_days: horizonDays \}/.test(read('src/services/preventiveMaintenanceService.ts')));
check('geração de lote usa lot_mask_id', /lot_mask_id: maskId/.test(read('src/services/lotMaskService.ts')));
check('vencimento do fornecedor usa payment_condition_id',
  /payment_condition_id: dueForm\.payment_condition_code/.test(read('src/components/screens/suprimento/Vsup0500Page.tsx')));

// ── Tipo de nota fiscal (VCLI0530) ─────────────────────────────────────────
const nf = read('src/components/screens/cliente/Vcli0530Page.tsx');
for (const campo of ['lista_valor_contabil', 'sintegra_sped_fiscal', 'calc_fomentar', 'ciap',
                     'dispositivo_legal_icms_id', 'hierarchy_icms', 'cod_beneficio_fiscal', 'impostos_nfe']) {
  check(`tipo de NF coleta ${campo}`, nf.includes(campo));
}

// ── Parâmetros ICMS/IPI (VFIS0320) ─────────────────────────────────────────
const params = read('src/components/screens/fiscal/Vfis0320Page.tsx');
check('parâmetros fiscais têm blocos por assunto', /const BLOCOS/.test(params) && /"especiais"/.test(params));
check('parâmetros fiscais editam o registro inteiro', /setForm\(\{ \.\.\.p, ncm_code/.test(params));
for (const campo of ['icms_red_pct_contrib', 'icms_subst_pct_contrib', 'bc_icms_st_modality',
                     'icms_difal_type', 'ipi_red_pct_contrib', 'uses_icms_zona_franca', 'fcp_st_partilha_pct']) {
  check(`parâmetros fiscais coletam ${campo}`, params.includes(campo));
}

// ── Classificação fiscal (VFIS0350) ────────────────────────────────────────
const clas = read('src/components/screens/fiscal/Vfis0350Page.tsx');
check('classificação separa PIS/COFINS normal, consumo, retenção e redução',
  ['cst_pis_saida', 'pis_consumo_pct', 'pis_retencao_pct', 'pis_reducao_pct',
   'cst_cofins_saida', 'cofins_consumo_pct', 'cofins_retencao_pct'].every((c) => clas.includes(c)));

// ── Item (VENT0200) ────────────────────────────────────────────────────────
const item = read('src/components/screens/engenharia/Vent0200Page.tsx');
// A tela passou a aceitar altura decimal (c2b77bd) e troca Number por
// parseDecimal; o que importa é a regra — só envia com as medidas completas.
check('item envia as dimensões só quando completas',
  /(?:Number|parseDecimal)\(form\.dimLength\) > 0 && (?:Number|parseDecimal)\(form\.dimWidth\) > 0/.test(item));
check('item coleta tanque, checklist de recebimento e safra',
  /tank_code: optionalNumber\(form\.tanque\)/.test(item)
  && /receiving_checklist: form\.checklistRecebimento/.test(item)
  && /harvest: form\.controlaSafra/.test(item));

// ── Pedido de venda (VVND0200) ─────────────────────────────────────────────
const venda = read('src/components/screens/comercial/Vvnd0200Page.tsx');
check('pedido de venda coleta o indicador de presença da NF-e', /PRESENCE_INDICATORS/.test(venda));
check('pedido de venda coleta transporte, peso e volume',
  /volume_quantity/.test(venda) && /gross_weight/.test(venda) && /freight_type/.test(venda));
check('pedido de venda coleta projeto', /project_code/.test(venda) && /project_name/.test(venda));
check('item do pedido coleta lote, tipo de NF e peso unitário',
  /newItem\.lot/.test(venda) && /newItem\.nf_type/.test(venda) && /unit_weight_gross/.test(venda));

// ── Pedido de compra (VPDC0200) ────────────────────────────────────────────
const compra = read('src/components/screens/suprimento/Vpdc0200Page.tsx');
check('pedido de compra detalha o frete', /FREIGHT_VALUE_TYPES/.test(compra) && /FREIGHT_VALUE_MODES/.test(compra));
check('pedido de compra trata redespacho e talão',
  /redispatch_freight_type/.test(compra) && /talao_number/.test(compra));
check('item de compra tem utilização e classificação fiscal',
  /UTILIZATION_TYPES/.test(compra) && /fiscal_classification_code/.test(compra));

// ── Plano de corte (VCUT0100) ──────────────────────────────────────────────
const corte = read('src/components/screens/producao/Vcut0100Page.tsx');
check('plano de corte coleta a fita de borda',
  /edge_top/.test(corte) && /band_item_code/.test(corte) && /band_cost_per_m/.test(corte));
check('plano de corte calcula os metros de fita', /function metrosDeFita/.test(corte));

// ── Metas de venda (VVND0500) ──────────────────────────────────────────────
const metas = read('src/components/screens/comercial/Vvnd0500Page.tsx');
check('metas têm os três patamares e o saldo',
  /PATAMARES/.test(metas) && /upsertGroupTarget/.test(metas) && /upsertGoalBalance/.test(metas));

// ── Reserva de estoque (VEST0100) ──────────────────────────────────────────
const estoque = read('src/components/screens/almoxarifado/Vest0100Page.tsx');
check('reserva coleta vigência e documento de origem',
  /reservation_date/.test(estoque) && /expiration_date/.test(estoque) && /reference_item_code/.test(estoque));

// ── NFS-e ──────────────────────────────────────────────────────────────────
const nfse = read('src/components/screens/fiscal/Vnfs0100Page.tsx');
check('NFS-e coleta o endereço do tomador',
  ['tomador_logradouro', 'tomador_numero', 'tomador_bairro', 'tomador_cep'].every((c) => nfse.includes(c)));

console.log(`\n${checks.length}/${checks.length} validações de cobertura aprovadas.`);

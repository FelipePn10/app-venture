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
const routinePage = read('src/components/screens/OperationalRoutinePage.tsx')
  + read('src/utils/fieldLabels.ts');
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

// ── Endereçamento, FEFO e rastreabilidade (migração 344) ────────────────────
// O sistema sabia QUANTO havia, não ONDE. Sem endereço no saldo e no movimento
// não há separação, FEFO nem contagem por endereço — era a maior lacuna do
// módulo diante do Focco (FEST0332) e do SAP (bin).
const vest0100 = read('src/components/screens/almoxarifado/Vest0100Page.tsx');
const stockSvc = read('src/services/stockService.ts');

check('movimento de estoque carrega o endereço', /address\?: string/.test(stockSvc) && /movForm\.address/.test(vest0100));
check('lote carrega validade (é ela que ordena o FEFO)', /expires_at\?: string/.test(stockSvc) && /lotForm\.expires_at/.test(vest0100));
check('serviço consome a sugestão de separação', /\/api\/stock\/separation\/suggest\//.test(stockSvc));
check('serviço consome o saldo por endereço', /\/api\/stock\/balances\/by-address/.test(stockSvc));
check('tela oferece FEFO e FIFO', /FEFO — vence antes, sai antes/.test(vest0100) && /FIFO — entrou antes, sai antes/.test(vest0100));
check('separação mostra corrida e certificado (rastreabilidade metalúrgica)', /heat_number/.test(vest0100) && /certificate/.test(vest0100));
check('separação avisa o que faltou e os lotes vencidos', /missing_qty/.test(vest0100) && /expired_skipped/.test(vest0100));
check('saldo por endereço é exibido por endereço/lote', /saldoEndereco\.map/.test(vest0100));

check('serviço consome a transferência entre endereços', /\/api\/stock\/separation\/transfer/.test(stockSvc));
check('tela transfere entre endereços', /transferirEntreEnderecos/.test(vest0100) && /address_from/.test(vest0100) && /address_to/.test(vest0100));

// ── Putaway, picking por rota e curva ABC (migração 346) ────────────────────
check('serviço consome a sugestão de guarda (putaway)', /\/api\/stock\/putaway\/suggest\//.test(stockSvc));
check('serviço consome a apuração da curva ABC', /\/api\/stock\/abc\/recalc/.test(stockSvc));
check('tela sugere onde guardar e explica o porquê', /sugerirOndeGuardar/.test(vest0100) && /g\.reason/.test(vest0100));
check('separação sai na ordem da rota do galpão', /pick_sequence/.test(stockSvc) && /l\.pick_sequence/.test(vest0100));
check('separação avisa saldo em endereço bloqueado', /blocked_skipped/.test(stockSvc) && /blocked_skipped/.test(vest0100));
check('tela mostra a curva ABC com participação e acumulado', /cumulative_pct/.test(vest0100) && /share_pct/.test(vest0100));
check('tela explica que a classe governa a contagem cíclica', /governa a frequência da contagem/.test(vest0100));

// ── Onda de separação e reserva por endereço (migração 347) ─────────────────
check('serviço cria, confirma e cancela a onda', /\/api\/stock\/waves/.test(stockSvc)
  && /confirmarOndaSeparacao/.test(stockSvc) && /cancelarOndaSeparacao/.test(stockSvc));
check('tela gera a onda e mostra a caminhada', /gerarOnda/.test(vest0100) && /parada\(s\)/.test(vest0100));
check('tela mostra o que faltou na onda', /onda\.missing/.test(vest0100));
check('contagem cíclica expõe o endereço contado', /address\?: string/.test(read('src/services/notificationService.ts')));

// ── Guarda: a lista de tipos de movimento do front tem que existir no backend ──
// `ADJUST` estava na lista e não existe lá; desde a validação do tipo isso passou
// a ser 422, e antes gravava um movimento que não mexia no saldo.
{
  const backendRoot = process.env.VENTURE_BACKEND_ROOT ?? '/home/felipepanosso/GolandProjects/panossoerp-ajustes';
  const entidade = fs.readFileSync(`${backendRoot}/internal/domain/stock/entity/stock_entity.go`, 'utf8');
  const bloco = entidade.slice(entidade.indexOf('func TipoMovimentoValido'), entidade.indexOf('type StockMovement struct'));
  const aceitos = new Set([...bloco.matchAll(/MovementType(\w+)|"([A-Z_]+)"/g)].map((m) => m[2]).filter(Boolean));
  for (const [, nome] of entidade.matchAll(/MovementType(\w+)\s+=\s+"([A-Z_]+)"/g)) aceitos.add(nome);
  for (const m of entidade.matchAll(/MovementType\w+\s+=\s+"([A-Z_]+)"/g)) aceitos.add(m[1]);
  const doFront = [...(stockSvc.match(/MOVEMENT_TYPES = \[([^\]]+)\]/)?.[1] ?? '').matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
  const fora = doFront.filter((t) => !aceitos.has(t));
  check(`tipos de movimento do front existem no backend (${doFront.join(', ')})`, fora.length === 0);
}

// ── Achados da simulação manual pela tela (12/09/2026) ──────────────────────
// Só apareceram usando a tela de verdade: o endereço era digitado à mão embora
// seja cadastro, e o backend gravava o endereço sem nunca devolvê-lo — a grade
// não tinha como mostrar onde o material entrou ou saiu.
const lookups = read('src/services/lookups.ts');
check('endereço usa modal de busca, não digitação livre',
  /loadWarehouseAddresses/.test(lookups) && /loader=\{loadWarehouseAddresses/.test(vest0100));
check('origem e destino da transferência também usam modal',
  (vest0100.match(/loader=\{loadWarehouseAddresses/g) ?? []).length >= 3);
check('serviço lê o endereço de volta do movimento', /address: parseStr\(o, 'address', 'Address'\)/.test(stockSvc));
check('grade de movimentos mostra o endereço (e origem → destino)',
  /<th>Endereço<\/th>/.test(vest0100) && /address_to \? `\$\{l?m?\.?address\}/.test(vest0100.replace(/\s+/g, ' ')) || /→/.test(vest0100));

console.log(`\n${checks.length}/${checks.length} validações de almoxarifado aprovadas.`);

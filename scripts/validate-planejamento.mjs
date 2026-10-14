import fs from 'node:fs';
import path from 'node:path';

// Validações da rodada de manutenção/APS/planejamento/MRP/previsão. Rode com: npm run test:planejamento
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (name, condition) => {
  if (!condition) throw new Error(`Falhou: ${name}`);
  checks.push(name);
  console.log(`✓ ${name}`);
};

const vpre0301 = read('src/components/screens/previsao/Vpre0301Page.tsx');
const routinePage = read('src/components/screens/OperationalRoutinePage.tsx')
  + read('src/utils/fieldLabels.ts');
const enumLabels = read('src/utils/enumLabels.ts');

check('VPRE0301 não exibe endpoint técnico ao usuário', !/não é exposto por/.test(vpre0301) && !/pendente de integração de endpoint/.test(vpre0301));
check('VPRE0301 coluna realizado usa "—" (não "n/d")', /—/.test(vpre0301) && !/n\/d/.test(vpre0301));
check('rotina traduz enums de manutenção/parada (downtime_type)', /downtime_type: \["MAINTENANCE", "BREAKDOWN", "SETUP", "QUALITY"\]/.test(routinePage));
check('enumLabel traduz MAINTENANCE/BREAKDOWN/SETUP', /MAINTENANCE: 'Manutenção'/.test(enumLabels) && /BREAKDOWN: 'Quebra'/.test(enumLabels));

// Contrato do rastreamento (pegging) e da comparação de cenário: todo campo que
// a tela lê precisa existir no JSON do backend — campo renomeado lá viraria
// coluna vazia aqui, sem erro nenhum. Lido do código Go, sem subir a API.
const BACKEND = process.env.VENTURE_BACKEND_ROOT ?? '/home/felipepanosso/GolandProjects/panossoerp-ajustes';
if (!fs.existsSync(path.join(BACKEND, 'go.mod'))) {
  console.log(`(contrato do rastreamento não conferido: backend não encontrado em ${BACKEND}; use VENTURE_BACKEND_ROOT)`);
} else {
  const goFile = (rel) => fs.readFileSync(path.join(BACKEND, rel), 'utf8');
  // Tags json de uma struct Go (inclui as de structs embutidas pelo nome).
  const tags = (src, nome) => {
    const m = src.match(new RegExp(`type ${nome} struct \\{([\\s\\S]*?)\\n\\}`));
    if (!m) throw new Error(`struct ${nome} não encontrada no backend`);
    return new Set([...m[1].matchAll(/json:"([a-z0-9_]+)/g)].map((x) => x[1]));
  };
  // Campos que um leitor do front lê: parseStr(o, 'x'), parseNum(o, 'x'), o['x'], n('x').
  const lidos = (src, nomeFuncao) => {
    const i = src.search(new RegExp(`(function|const) ${nomeFuncao}\\b`));
    if (i < 0) throw new Error(`${nomeFuncao} não encontrado no front`);
    const resto = src.slice(i + 1);
    const j = resto.search(/\n(export )?(async )?(function|const|interface|type) /);
    const bloco = src.slice(i, j < 0 ? undefined : i + 1 + j);
    const campos = [...bloco.matchAll(/(?:parse(?:Str|Num|Bool)\(\w+, |\w\[|\bn\()'([a-z][a-z0-9_]*)'/g)].map((x) => x[1]);
    return [...new Set(campos)];
  };
  const mrp = read('src/services/mrpService.ts');
  const planning = read('src/services/planningService.ts');
  const peg = goFile('internal/application/usecase/mrp_calculation_uc/pegging_uc.go');
  const ent = goFile('internal/domain/mrp_calculation/entity/mrp_calculation_entity.go');
  const exc = goFile('internal/application/dto/response/mrp_calculation_response.go');
  const cen = goFile('internal/application/usecase/planning_uc/scenario_compare.go');
  const casos = [
    ['ponta do vínculo (parseEnd)', lidos(mrp, 'parseEnd'), tags(peg, 'PeggingEnd')],
    ['nó da cadeia (parseNode)', lidos(mrp, 'parseNode'), tags(peg, 'PeggingNode')],
    ['origem (parseRoot)', lidos(mrp, 'parseRoot'), tags(peg, 'PeggingRoot')],
    ['atendimento do pedido (getSalesOrderPegging)', lidos(mrp, 'getSalesOrderPegging'), new Set([...tags(peg, 'SalesOrderChain'), ...tags(ent, 'SalesOrderPlan')])],
    ['exceção (parseException)', lidos(mrp, 'parseException'), tags(exc, 'MRPExceptionMessageResponse')],
    ['resumo do cenário (parseSummary)', lidos(planning, 'parseSummary'), tags(cen, 'PlanSummary')],
  ];
  for (const [nome, campos, doBackend] of casos) {
    const faltam = campos.filter((c) => !doBackend.has(c));
    check(`contrato ${nome}: ${campos.length} campo(s) lidos existem no backend${faltam.length ? ` — faltam ${faltam.join(', ')}` : ''}`, campos.length > 0 && faltam.length === 0);
  }
  check('rastreamento lê o atraso (late, late_reason, chain_late)', ['late', 'late_reason'].every((c) => lidos(mrp, 'parseNode').includes(c)) && lidos(mrp, 'parseRoot').includes('chain_late'));
  check('exceção lê os pedidos afetados', lidos(mrp, 'parseException').includes('affected_demands'));
  check('cenário lê roots_late', lidos(planning, 'parseSummary').includes('roots_late'));
}

console.log(`\n${checks.length}/${checks.length} validações de planejamento aprovadas.`);

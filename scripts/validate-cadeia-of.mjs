import fs from 'node:fs';
import path from 'node:path';

// Cadeia OF filha → OF pai (a bucha fabricada para o RN): o front lê os avisos
// do início, o reservado para a OF e a cadeia. Campo renomeado no backend
// viraria coluna vazia aqui sem erro nenhum — o contrato é lido do código Go,
// sem subir a API. Rode com: npm run test:cadeia-of
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (name, condition) => {
  if (!condition) throw new Error(`Falhou: ${name}`);
  checks.push(name);
  console.log(`✓ ${name}`);
};

const servico = read('src/services/productionOrderService.ts');
const tela = read('src/components/screens/producao/Vpro0900Page.tsx');
const abas = read('src/components/screens/producao/of/OfTabs.tsx');
const params = read('src/components/screens/planejamento/Vpln0100Page.tsx');

// Bloco de uma função do serviço e os campos que ela lê.
const bloco = (src, nome) => {
  const i = src.search(new RegExp(`(function|const) ${nome}\\b`));
  if (i < 0) throw new Error(`${nome} não encontrado no front`);
  const resto = src.slice(i + 1);
  const j = resto.search(/\n(export )?(async )?(function|const|interface|type) /);
  return src.slice(i, j < 0 ? undefined : i + 1 + j);
};
const lidos = (src, nome) => [...new Set([...bloco(src, nome).matchAll(/(?:parse(?:Str|Num|Bool)\(\w+, |\w\[|lista\()'([a-z][a-z0-9_]*)'/g)].map((x) => x[1]))];

check('o início da OF lê os avisos do servidor', lidos(servico, 'parseOrder').includes('warnings'));
check('a disponibilidade lê o reservado para a OF', lidos(servico, 'parseAvailability').includes('reserved_for_order'));
check('a tela usa a resposta do início (não descarta os avisos)', /startProductionOrder\(id\)/.test(tela) && /r\.warnings/.test(tela));
check('o início confirma com componente fabricado ainda não pronto', /filhasAbertas\.length \? setConfirmarInicio|filhasAbertas\.length \?/.test(tela));
check('a aba Materiais mostra a coluna do reservado', /Reservado para esta OF/.test(abas) && /reserved_for_order/.test(abas));
check('o resumo mostra a cadeia e abre a OF ligada', /CadeiaPainel/.test(abas) && /onAbrirOF=/.test(tela));
check('OF filha cancelada não conta como pendente', /'CANCELLED'\]\.includes/.test(bloco(servico, 'filhaPendente')));
check('parâmetro 52 tem só as opções que o servidor aceita', /52: \[/.test(params) && ['NAO', 'AVISAR', 'BLOQUEAR'].every((v) => params.includes(`valor: "${v}"`)));

const BACKEND = process.env.VENTURE_BACKEND_ROOT ?? '/home/felipepanosso/GolandProjects/panossoerp-ajustes';
if (!fs.existsSync(path.join(BACKEND, 'go.mod'))) {
  console.log(`(contrato não conferido: backend não encontrado em ${BACKEND}; use VENTURE_BACKEND_ROOT)`);
} else {
  const go = (rel) => fs.readFileSync(path.join(BACKEND, rel), 'utf8');
  const tags = (src, nome) => {
    const m = src.match(new RegExp(`type ${nome} struct \\{([\\s\\S]*?)\\n\\}`));
    if (!m) throw new Error(`struct ${nome} não encontrada no backend`);
    return new Set([...m[1].matchAll(/json:"([a-z0-9_]+)/g)].map((x) => x[1]));
  };
  const resp = go('internal/application/dto/response/production_order_response.go');
  const disp = go('internal/application/usecase/production_order_uc/material_availability_uc.go');
  const rota = go('api/api.go');
  check('a rota da cadeia existe no backend', /Get\("\/\{id\}\/chain"/.test(rota));
  const casos = [
    ['ordem da cadeia (parseChainOrder)', lidos(servico, 'parseChainOrder'), tags(resp, 'ProductionChainOrder')],
    ['cadeia (getProductionChain)', lidos(servico, 'getProductionChain'), new Set([...tags(resp, 'ProductionChainResponse'), ...tags(resp, 'ProductionChainSalesOrder')])],
    ['linha da disponibilidade (parseAvailability)', lidos(servico, 'parseAvailability'),
      new Set([...tags(disp, 'MaterialAvailabilityLine'), ...tags(disp, 'MaterialAvailabilitySummary')])],
    ['avisos do início (parseOrder)', ['warnings'], tags(resp, 'ProductionOrderResponse')],
  ];
  for (const [nome, campos, doBackend] of casos) {
    const faltam = campos.filter((c) => !doBackend.has(c));
    check(`contrato ${nome}: ${campos.length} campo(s) lidos existem no backend${faltam.length ? ` — faltam ${faltam.join(', ')}` : ''}`, campos.length > 0 && faltam.length === 0);
  }
}

console.log(`\n${checks.length}/${checks.length} validações da cadeia de OF aprovadas.`);

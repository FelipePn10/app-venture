import fs from 'node:fs';
import path from 'node:path';

// Validações da rodada de engenharia/manufatura (VMAQ0200, VENT0200/0210,
// VENT0115/0202/0204, VPRO0900). Rode com: npm run test:engineering
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (name, condition) => {
  if (!condition) throw new Error(`Falhou: ${name}`);
  checks.push(name);
  console.log(`✓ ${name}`);
};

const vent0200 = read('src/components/screens/engenharia/Vent0200Page.tsx');
const vent0210 = read('src/components/screens/engenharia/Vent0210Page.tsx');
const roteiro = read('src/components/screens/engenharia/RoteiroFabricacaoPage.tsx');
const vpro0900 = read('src/components/screens/producao/Vpro0900Page.tsx');
const vmaq0200 = read('src/components/screens/engenharia/Vmaq0200Page.tsx');
const routinePage = read('src/components/screens/OperationalRoutinePage.tsx')
  + read('src/utils/fieldLabels.ts');
const routineCatalog = read('src/components/screens/operationalRoutines.ts');
const lookups = read('src/services/lookups.ts');
const structure = read('src/services/ItemStructureService.ts');
const classifications = read('src/services/itemClassificationService.ts');

check('VENT0200 removeu botões Nav e PDM', !/className="it-nav-btn"/.test(vent0200) && !/>PDM<\/button>/.test(vent0200));
check('VENT0200 removeu texto "Focco"', !/Focco/i.test(vent0200));
check('VENT0200 classificação usa modal pesquisável', /loadItemClassifications/.test(vent0200));
check('VENT0200 item embalagem usa modal de itens', /loader=\{loadItems\}/.test(vent0200));
check('VENT0210 removeu NAV e Ferramentas', !/className="fe-nav-btn"/.test(vent0210));
check('VENT0210 item pai usa modal (buscarItemPai)', /buscarItemPai/.test(vent0210) && /loader=\{loadItems\}/.test(vent0210));
check('VENT0210 preenche descrição/UM do filho automaticamente', /handleChildCodeBlur/.test(vent0210) && /findItemByCode/.test(vent0210));
check('VENT0210 atualiza componente (updateComponent)', /updateComponent/.test(structure) && /updateComponent\(toPayload/.test(vent0210));
check('VENT0210 remove componente persistido (deleteComponent)', /deleteComponent/.test(structure) && /deleteComponent\(row\.parentCode/.test(vent0210));
check('criação de componente envia posição como sequence', /sequence: payload\.position/.test(structure));
check('VCLA0100 preserva código pai textual e omite raiz vazia', /parent_code: dto\.parent_code\?\.trim\(\) \|\| undefined/.test(classifications));
check('VENT0210 posição obrigatória validada', /invalidPos/.test(vent0210));
check('Roteiro: origem de operação traduzida', /enumLabel\(o\)/.test(roteiro) && /enumLabel\(o\.origin\)/.test(roteiro));
check('Roteiro: item usa modal', /loader=\{loadItems\}/.test(roteiro));
check('VPRO0900 item usa modal', /loader=\{loadItems\}/.test(vpro0900));
check('VMAQ0200 item/máscara usam modal', /loader=\{loadItems\}/.test(vmaq0200) && /loader=\{loadItemMasks\}/.test(vmaq0200));
check('VENT0204 não envia enterprise_id/created_by', /VENT0204[\s\S]*?Família de produtos"/.test(routineCatalog) && !/VENT0204[\s\S]*?enterprise_id/.test(routineCatalog));
check('lookups expõe operações de roteiro', /loadOperations/.test(lookups) && /manufacturingRoutingService/.test(lookups));
check('rotina traduz rótulos de roteiro (is_standard, network, critical_path)', /is_standard: "Padrão"/.test(routinePage) && /network: "Rede"/.test(routinePage) && /critical_path: "Caminho crítico"/.test(routinePage));
check('rotina usa modal para operação e grupo', /grupo pdm\|pdm\|grupo/.test(routinePage) && /operação\|operation/.test(routinePage));

// ── Configurador embutido na estrutura (verificar.md) ────────────────────────
const cfgService = read('src/services/structureConfiguratorService.ts');
const cfgPanel = read('src/components/screens/engenharia/StructureConfiguratorPanel.tsx');
const vcfg0100 = read('src/components/screens/engenharia/Vcfg0100Page.tsx');
const host = read('src/components/screens/ScreenHostPage.tsx');
const catalogo = read('src/types/erpScreen.ts');

check('configurador consome o painel da estrutura', cfgService.includes('/configurator`') && cfgService.includes('loadConfiguratorPanel'));
check('configurador aplica a configuração', /configurator\/apply/.test(cfgService));
check('configurador trata restrições (422) em PT-BR', /RESTRICAO_DE_CONFIGURACAO/.test(cfgService) && /ConfiguratorRestrictionError/.test(cfgService));
check('VENT0210 abre o configurador por botão', /StructureConfiguratorPanel/.test(vent0210) && /setConfiguradorAberto\(true\)/.test(vent0210));
check('VENT0210 aplica a máscara configurada na estrutura', /handleUsarMascaraConfigurada/.test(vent0210));
check('painel mostra as fórmulas de quantidade', /Quantidades por fórmula/.test(cfgPanel) && /formula/.test(cfgPanel));
check('painel destaca perguntas usadas em fórmula', /used_by_formula/.test(cfgPanel));
check('VCFG0100 não gera mais máscara (foi para a estrutura)', !/generateMask/.test(vcfg0100) && /VENT0210/.test(vcfg0100));

// ── Telas unificadas ────────────────────────────────────────────────────────
check('roteiro centralizado em VENT0115/VENT0202', /RoteiroFabricacaoPage code="VENT0115"/.test(host) && /RoteiroFabricacaoPage code="VENT0202"/.test(host));
for (const code of ['VPRO0100', 'VSUP0510', 'VCON0100']) {
  check(`${code} saiu do catálogo`, !catalogo.includes(`code: "${code}"`));
  check(`${code} explica para onde foi`, new RegExp(`${code}: \\{`).test(host));
}
check('VSUP0500 absorveu os cadastros de apoio', /Cadastros de apoio/.test(read('src/components/screens/suprimento/Vsup0500Page.tsx')));

// ── Estrutura de produto: campos que o banco já tinha e a tela não expunha ──
const estruturaSrv = read('src/services/ItemStructureService.ts');
check('serviço lê parent_code/child_code (nome atual da API)',
  /r\.parent_code \?\? r\.parent_item_code/.test(estruturaSrv) && /r\.child_code \?\? r\.child_item_code/.test(estruturaSrv));
check('serviço lê a posição de "sequence"', /r\.sequence \?\? r\.position/.test(estruturaSrv));
for (const campo of ['startDate', 'endDate', 'quantityFormula', 'lossFormula', 'quantityRounding', 'quantityScale', 'isCoproduct', 'isFixedQty', 'substituteGroup', 'substitutePriority', 'inherit']) {
  check(`estrutura mapeia ${campo}`, new RegExp(`${campo}:`).test(estruturaSrv));
}
check('VENT0210 envia vigência, fórmula e alternativos ao salvar',
  /start_date:\s+row\.startDate/.test(vent0210) && /quantity_formula:\s+row\.quantityFormula/.test(vent0210)
  && /substitute_group:\s+row\.substituteGroup/.test(vent0210));
check('VENT0210 valida vigência, fórmula e alternativos antes de gravar', /function listarProblemas/.test(vent0210));
check('VENT0210 sinaliza fórmula/vigência/alternativo na grade', /ComponentFlags/.test(vent0210));
check('VENT0210 permite selecionar a linha clicando em qualquer campo',
  !/onClick=\{\(e\) => e\.stopPropagation\(\)\}/.test(vent0210));

// ── Consumo, custo e rastreabilidade da estrutura ───────────────────────────
for (const campo of ['warehouseCode', 'lineWarehouseCode', 'setupLoss', 'costLossType', 'costLoss', 'costCenterCode', 'isCriticalMps', 'generatesInspection']) {
  check(`estrutura mapeia ${campo}`, new RegExp(`${campo}:`).test(estruturaSrv));
}
check('VENT0210 envia consumo e custo ao salvar',
  /warehouse_code:\s+row\.warehouseCode/.test(vent0210) && /cost_loss_type:\s+row\.costLossType/.test(vent0210)
  && /is_critical_mps:\s+row\.isCriticalMps/.test(vent0210));
check('VENT0210 tem a seção "Consumo e custo"', /Consumo e custo/.test(vent0210));

// ── Simulação de fórmula: conferir antes de gravar ──────────────────────────
const simulador = read('src/components/screens/engenharia/StructureFormulaTester.tsx');
check('serviço simula fórmula pelo backend', /simulate-formula/.test(estruturaSrv) && /export async function simulateFormula/.test(estruturaSrv));
check('simulador extrai as variáveis da própria fórmula', /match\(\/\[A-Z_\]/.test(simulador));
check('simulador mostra arredondamento, perda e consumo por ordem',
  /rounded_result/.test(simulador) && /quantity_with_loss/.test(simulador) && /quantity_per_order/.test(simulador));
check('simulador deixa claro que não grava nada', /Nada é gravado aqui/.test(simulador));
check('VENT0210 abre o simulador a partir da fórmula',
  /StructureFormulaTester/.test(vent0210) && /setSimulando\(true\)/.test(vent0210));

// ── Histórico da estrutura: quem alterou o quê ──────────────────────────────
const historico = read('src/components/screens/engenharia/StructureHistoryPanel.tsx');
check('serviço lê o histórico da estrutura', /export async function listStructureHistory/.test(estruturaSrv) && /\/history/.test(estruturaSrv));
check('histórico traduz a ação para PT-BR', /Incluído/.test(historico) && /Alterado/.test(historico) && /Excluído/.test(historico));
check('histórico mostra antes e depois de cada campo', /cfg-before/.test(historico) && /cfg-after/.test(historico));
check('histórico formata a data em pt-BR', /toLocaleString\("pt-BR"\)/.test(historico));
check('VENT0210 abre o histórico por botão', /StructureHistoryPanel/.test(vent0210) && /setHistoricoAberto\(true\)/.test(vent0210));

// ── Item base e configurado ao mesmo tempo (VENT0200) ──────────────────────
check('VENT0200 trata natureza como marcadores combináveis', /const MARCADORES/.test(vent0200) && !/const NATUREZAS/.test(vent0200));
for (const flag of ['isBase', 'isConfigured', 'isGeneric', 'isPrototype', 'isTool', 'isProcessItem']) {
  check(`VENT0200 tem o marcador ${flag}`, new RegExp(`${flag}[:"]`).test(vent0200));
}
check('VENT0200 não usa mais um select exclusivo de natureza', !/setField\("nature"/.test(vent0200));
check('VENT0200 envia os marcadores ao backend',
  /is_base: form\.isBase/.test(vent0200) && /is_configured: form\.isConfigured/.test(vent0200)
  && /is_process_item: form\.isProcessItem/.test(vent0200));
check('VENT0200 ainda deriva `nature` para o contrato antigo', /natureDosMarcadores\(form\)/.test(vent0200));
check('VENT0200 permite item-base usar outro item-base como modelo',
  !/Indisponível para item-base/.test(vent0200));
// `parseBool` nunca devolve undefined — devolve `false` quando a chave falta.
// Por isso `is_base ?? nature === 2` nunca caía na natureza, e a lista vinha
// vazia em qualquer base anterior à migração dos marcadores.
check('lookup de item-base aceita os dois sinais (is_base OU nature 2)',
  /Boolean\(i\.is_base\) \|\| i\.nature === 2/.test(lookups));
check('lookup de item-base não devolve lista vazia quando ninguém está marcado',
  /marcados\.length > 0 \? marcados : todos/.test(lookups));
check('serviço de itens lê os marcadores', /is_base: parseBool/.test(read('src/services/itemService.ts')));
check('VITM0100 mostra os marcadores combinados', /naturezaLegivel/.test(read('src/components/screens/engenharia/Vitm0100Page.tsx')));

// ── Conferência e produtividade na estrutura ───────────────────────────────
check('VENT0210 lista TODOS os problemas, não só o primeiro', /function listarProblemas/.test(vent0210) && /problemas\.push\(/.test(vent0210));
check('VENT0210 tem o botão Conferir', /handleConferir/.test(vent0210) && />\s*Conferir\s*</.test(vent0210));
check('VENT0210 mostra a lista de problemas ao barrar a gravação', /setProblemas\(erros\)/.test(vent0210));
check('VENT0210 copia e cola fórmula entre componentes', /formulaCopiada/.test(vent0210) && /Fórmula colada/.test(vent0210));
check('painéis da engenharia fecham com Esc',
  /useEscapeToClose/.test(read('src/components/screens/engenharia/StructureConfiguratorPanel.tsx'))
  && /useEscapeToClose/.test(simulador) && /useEscapeToClose/.test(historico));

// ── VENT0200: abrir item para alterar ───────────────────────────────────────
check('VENT0200 abre item existente para alteração', /async function abrirItem/.test(vent0200) && /itemEmEdicao/.test(vent0200));
check('VENT0200 grava alteração com PUT', /updateItem\(itemEmEdicao/.test(vent0200));
check('VENT0200 trava o código durante a alteração', /readOnly=\{Boolean\(itemEmEdicao\)\}/.test(vent0200));
check('VENT0200 volta para cadastro novo', /function handleNovoItem/.test(vent0200));
check('VENT0200 reaproveita um mapeamento único de pastas', /function pastasParaFormulario/.test(vent0200));
check('VENT0200 não tem mais botão sem ação', !/<button className="it-btn it-btn-ghost">/.test(vent0200));
check('serviço de itens expõe a alteração', /export async function updateItem/.test(read('src/services/itemService.ts')));

// ── Configurador de produto (PDM) ───────────────────────────────────────────
const cfgShell = read('src/components/screens/engenharia/Vcfg0100Page.tsx');
const cfgConjuntos = read('src/components/screens/engenharia/configurador/ConjuntosTab.tsx');
const cfgPerguntas = read('src/components/screens/engenharia/configurador/PerguntasTab.tsx');
const cfgItem = read('src/components/screens/engenharia/configurador/PerguntasDoItemTab.tsx');
const cfgMascara = read('src/components/screens/engenharia/configurador/GerarMascaraTab.tsx');
const cfgRestricoes = read('src/components/screens/engenharia/configurador/RestricoesTab.tsx');

check('VCFG0100 segue a ordem do cadastro em 5 passos',
  /respostas → perguntas → perguntas do item → restrições → máscara/.test(cfgShell)
  && ['conjuntos', 'perguntas', 'item', 'restricoes', 'mascara'].every((a) => cfgShell.includes(`"${a}"`)));
check('VCFG0100 mantém o item entre as abas', /const \[itemCode, setItemCode\]/.test(cfgShell));
check('conjuntos mostram como a resposta compõe a máscara', /mask_composition/.test(cfgConjuntos) && /cfgw-preview/.test(cfgConjuntos));
check('perguntas expõem tipo, conjunto, limites e fórmula',
  /AJUDA_TIPO/.test(cfgPerguntas) && /num_min/.test(cfgPerguntas) && /formula/.test(cfgPerguntas));
check('perguntas avisam onde já estão em uso', /listCharacteristicItems/.test(cfgPerguntas) && /Onde é usada/.test(cfgPerguntas));
check('perguntas do item numeram de 10 em 10', /const PASSO = 10/.test(cfgItem) && /Renumerar de 10 em 10/.test(cfgItem));
check('perguntas do item reordenam e definem resposta padrão',
  /function mover/.test(cfgItem) && /default_variable_id/.test(cfgItem));
check('máscara se monta enquanto o usuário responde', /const previa = useMemo/.test(cfgMascara) && /Máscara em formação/.test(cfgMascara));
check('máscara distingue simular de gravar', /persistir/.test(cfgMascara) && /foi só uma simulação/.test(cfgMascara));
check('geração em lote exige recorte de respostas', /generateMasksBatch/.test(cfgMascara) && /recorte/.test(cfgMascara));
check('restrições são escritas como frase SE/ENTÃO',
  /cfgw-keyword/.test(cfgRestricoes) && /RESTRICTION_OPERATORS/.test(cfgRestricoes) && /ENTÃO/.test(cfgRestricoes));
check('restrições listam a regra em português', /rotuloOperador/.test(cfgRestricoes) && /nomeDaPergunta/.test(cfgRestricoes));
check('restrições têm motivo cadastrável', /createRestrictionReason/.test(cfgRestricoes));

const cfgSrv = read('src/services/configuratorCfgService.ts');
const restrSrv = read('src/services/configuratorRestrictionService.ts');
check('serviço do configurador altera pergunta, resposta e vínculo',
  /updateCharacteristic/.test(cfgSrv) && /updateVariable/.test(cfgSrv) && /updateItemCharacteristic/.test(cfgSrv));
check('serviço do configurador gera máscara individual e em lote',
  /generateMaskTyped/.test(cfgSrv) && /generateMasksBatch/.test(cfgSrv));
check('serviço de restrições usa os sete operadores do mercado',
  ['EQUAL', 'DIFFERENT', 'GREATER', 'LESS', 'BELONGS', 'NOT_BELONGS', 'INVALID'].every((o) => restrSrv.includes(`'${o}'`)));
check('rotina crua de restrição usa o corpo real da API',
  /"dominants":\[\{"question_id"/.test(routineCatalog) && !/"attribute":"customer_code"/.test(routineCatalog));
check('rotinas cruas apontam para a tela guiada', /use a VCFG0100/.test(routineCatalog));
check('máscara barra medida fora do limite antes de gerar', /informe um valor entre/.test(cfgMascara));
check('máscara mostra o código configurado completo', /Código configurado/.test(cfgMascara));

// ── Roteiro de fabricação e roteiro padrão ─────────────────────────────────
const roteiroSrv = read('src/services/manufacturingRoutingService.ts');
const custoPanel = read('src/components/screens/engenharia/roteiro/RoteiroCustoPanel.tsx');

for (const campo of ['run_time', 'labor_time', 'run_base_qty', 'queue_time', 'wait_time', 'move_time', 'crew_size', 'time_unit']) {
  check(`roteiro mapeia ${campo}`, new RegExp(`${campo}[?]?:`).test(roteiroSrv));
}
check('roteiro mapeia os tempos já resolvidos pelo backend', /OperationTimeBreakdown/.test(roteiroSrv) && /parseBreakdown/.test(roteiroSrv));
check('roteiro mapeia terceirização', /supplier_id/.test(roteiroSrv) && /service_item_code/.test(roteiroSrv) && /third_party_remittance/.test(roteiroSrv));
check('roteiro mapeia a vigência', /valid_from/.test(roteiroSrv) && /valid_to/.test(roteiroSrv));
check('tela do roteiro expõe o modelo de tempo', /Peças por ciclo/.test(roteiro) && /Preparação \(por lote\)/.test(roteiro) && /Operadores/.test(roteiro));
check('tela do roteiro separa tempos que não ocupam a máquina', /Fila/.test(roteiro) && /Movimentação/.test(roteiro));
check('tela do roteiro trata terceirização por origem', /opForm\.origin !== "INTERNA"/.test(roteiro) && /Item de serviço/.test(roteiro));
check('tela do roteiro usa lookup de centro, ferramenta e fornecedor',
  /loadWorkCenters/.test(roteiro) && /loadTools/.test(roteiro) && /loadSuppliers/.test(roteiro)
  && !/Ferramenta \(ID\)/.test(roteiro) && !/Centro \(ID\)/.test(roteiro));
check('tela do roteiro tem vigência', /Início da vigência/.test(roteiro));
check('roteiro copia para outro item com rede de dependências',
  /async function copiarRoteiro/.test(roteiro) && /equivalencia/.test(roteiro) && /createEdge\(novo\.id/.test(roteiro));
check('custo do roteiro simula por tamanho de lote',
  /RoteiroCustoPanel/.test(roteiro) && /Tamanho do lote/.test(custoPanel));
check('custo do roteiro separa máquina de mão de obra',
  /machine_cost_per_hour/.test(custoPanel) && /labor_cost_per_hour/.test(custoPanel));
check('custo do roteiro mostra o custo por peça', /Custo por peça/.test(custoPanel));
check('custo do roteiro avisa quando falta tarifa', /sem tarifa de hora-máquina/.test(custoPanel));
check('serviço de custo padrão expõe as duas tarifas',
  /machine_cost_per_hour/.test(read('src/services/standardCostService.ts')));

// ── Roteiro de inspeção ────────────────────────────────────────────────────
const inspecao = read('src/components/screens/inspecao/Vins0200Page.tsx');
check('inspeção coleta o plano de amostragem completo',
  /Aceita até/.test(inspecao) && /Rejeita a partir de/.test(inspecao) && /Como amostrar/.test(inspecao));
check('inspeção barra plano incoerente', /function problemasDaEtapa/.test(inspecao) && /tolerância está invertida/.test(inspecao));
check('inspeção registra instrumento, norma e referência',
  /INSTRUMENTOS/.test(inspecao) && /Norma/.test(inspecao) && /Referência/.test(inspecao));
check('inspeção aceita atributos na etapa por atributo', /stepForm\.kind === "ATTRIBUTE"/.test(inspecao) && /Atributos a conferir/.test(inspecao));
check('inspeção descreve o plano em português', /function planoEmPalavras/.test(inspecao));
check('inspeção reordena as etapas', /function moverEtapa/.test(inspecao));
check('inspeção envia manuseio e armazenagem', /handling_type/.test(inspecao) && /storage_type/.test(inspecao));
check('inspeção não descarta mais os atributos', !/attributes: \[\] \}\)\)/.test(inspecao));

// ── Restrições (equivalente ao FENG0116) ──────────────────────────────────
check('restrições auditam por que a pergunta some',
  /evaluateRestrictions/.test(cfgRestricoes) && /por que uma pergunta some/.test(cfgRestricoes));
check('restrições explicam a precedência entre regras',
  /precedenciaEmPalavras/.test(restrSrv) && /precedenciaEmPalavras/.test(cfgRestricoes));
check('restrições aceitam escopo por cliente', /customerCode/.test(restrSrv) && /Vale só para o cliente/.test(cfgRestricoes));
check('restrições sugerem os motivos de mercado', /MOTIVOS_SUGERIDOS/.test(cfgRestricoes));
check('auditoria devolve perguntas invalidadas e travadas',
  /invalid_question_ids/.test(restrSrv) && /locked_values/.test(restrSrv));

// ── VENT0200: o que a aba coleta precisa chegar ao backend ────────────────
check('item envia lote mínimo, múltiplo e estoque de segurança',
  /minimum_lot: Number\(form\.lotMinimo\)/.test(vent0200)
  && /multiple_lot: Number\(form\.lotMultiplo\)/.test(vent0200)
  && /safety_stock: Number\(form\.estoqueSeguranca\)/.test(vent0200));
check('item envia crítico, exclusivo e curva ABC',
  /critical: form\.critico/.test(vent0200) && /exclusive: form\.exclusivo/.test(vent0200)
  && /abc_class: form\.curvaAbc/.test(vent0200));
// A curva ABC só aceita A, B ou C. Ligada a um lookup de classificação, mandava
// o código do cadastro e o backend recusava a gravação com "classe ABC inválida".
check('curva ABC é um select de A/B/C, não um lookup de classificação',
  /value="A"/.test(vent0200) && /value="B"/.test(vent0200) && /value="C"/.test(vent0200)
  && !/curvaAbc[\s\S]{0,200}loadItemClassifications/.test(vent0200));
check('item monta o ponto de pedido só quando a conta fecha',
  /function montarPontoDePedido/.test(vent0200) && /TR <= 0 \|\| CM <= 0 \|\| CR <= 0/.test(vent0200));
check('item mostra o ponto de pedido calculado', /function calcularPontoDePedido/.test(vent0200) && /Ponto de pedido/.test(vent0200));
check('item envia a pasta de suprimentos completa',
  /purchase_uom: form\.umSuprimentos/.test(vent0200) && /warehouse_code: optionalNumber\(form\.almoxSuprimentos\)/.test(vent0200));
check('item lê o planejamento de volta ao abrir',
  /lotMinimo: numText\(planning/.test(vent0200) && /reorder_point/.test(vent0200));

console.log(`\n${checks.length}/${checks.length} validações de engenharia aprovadas.`);

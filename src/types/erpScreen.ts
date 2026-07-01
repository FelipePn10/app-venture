export type ErpModule =
  | 'comercial'
  | 'financeiro'
  | 'fiscal'
  | 'contabilidade'
  | 'cadastros'
  | 'engenharia'
  | 'producao'
  | 'almoxarifado'
  | 'planejamento'
  | 'assistencia'
  | 'garantia'
  | 'cliente'
  | 'custo'
  | 'pdv'
  | 'manutencao'
  | 'suprimento'
  | 'importacao'
  | 'inspecao';

export type ParentCategory = 'comercial_vendas' | 'industrial_producao' | 'administrativo_financeiro';

export interface ParentMeta {
  label: string;
  modules: ErpModule[];
}

export const PARENT_CATEGORIES: Record<ParentCategory, ParentMeta> = {
  comercial_vendas: {
    label: 'Comercial & Vendas',
    modules: ['comercial', 'pdv', 'assistencia', 'garantia', 'cliente', 'custo'],
  },
  industrial_producao: {
    label: 'Industrial & Produção',
    modules: ['engenharia', 'producao', 'manutencao', 'planejamento', 'suprimento', 'almoxarifado', 'importacao', 'inspecao'],
  },
  administrativo_financeiro: {
    label: 'Administrativo & Financeiro',
    modules: ['financeiro', 'fiscal', 'contabilidade', 'cadastros'],
  },
};

export const PARENT_ORDER: ParentCategory[] = [
  'comercial_vendas',
  'industrial_producao',
  'administrativo_financeiro',
];

export interface ModuleMeta {
  label: string;
  color: string;
  bgColor: string;
}

export const MODULE_META: Record<ErpModule, ModuleMeta> = {
  comercial:     { label: 'Comercial',           color: '#2563eb', bgColor: '#eff6ff' },
  financeiro:    { label: 'Financeiro',          color: '#059669', bgColor: '#ecfdf5' },
  fiscal:        { label: 'Fiscal',              color: '#0d9488', bgColor: '#f0fdfa' },
  contabilidade: { label: 'Contabilidade',       color: '#6d28d9', bgColor: '#f5f3ff' },
  engenharia:    { label: 'Engenharia',          color: '#d97706', bgColor: '#fffbeb' },
  producao:      { label: 'Produção',             color: '#c2410c', bgColor: '#fff7ed' },
  almoxarifado:  { label: 'Almoxarifado',        color: '#b45309', bgColor: '#fef3c7' },
  planejamento:  { label: 'Planejamento',        color: '#0e7490', bgColor: '#ecfeff' },
  assistencia:   { label: 'Assistência Técnica', color: '#dc2626', bgColor: '#fef2f2' },
  garantia:      { label: 'Garantia',            color: '#9333ea', bgColor: '#faf5ff' },
  cliente:       { label: 'Cliente',             color: '#0891b2', bgColor: '#ecfeff' },
  custo:         { label: 'Custos / Precificação', color: '#ea580c', bgColor: '#fff7ed' },
  pdv:           { label: 'PDV / Pedidos',       color: '#4f46e5', bgColor: '#eef2ff' },
  manutencao:    { label: 'Manutenção',          color: '#be123c', bgColor: '#fff1f2' },
  suprimento:    { label: 'Suprimento',          color: '#15803d', bgColor: '#f0fdf4' },
  importacao:    { label: 'Importação',          color: '#0369a1', bgColor: '#f0f9ff' },
  inspecao:      { label: 'Inspeção',            color: '#a21caf', bgColor: '#fdf4ff' },
  cadastros:     { label: 'Cadastros & Plataforma', color: '#475569', bgColor: '#f8fafc' },
};

export interface ErpScreen {
  code: string;
  title: string;
  description: string;
  module: ErpModule;
}

export const ERP_SCREENS: ErpScreen[] = [
  // ── Comercial
  {
    code: "VENT0100",
    title: "Consulta de Pedido de Venda",
    description: "Consultar todos os pedidos de vendas.",
    module: "comercial",
  },
  // ── Produção
  {
    code: "VPRO0100",
    title: "Roteiro de Fabricação",
    description: "Cadastrar operações, roteiros, rede de dependências e calcular lead time via CPM.",
    module: "producao",
  },
  {
    code: "VPRO0200",
    title: "CRP — Capacity Requirements Planning",
    description: "Calcular carga por centro de trabalho/dia e identificar sobrecargas de um plano MRP.",
    module: "producao",
  },
  {
    code: "VPRO0210",
    title: "APS — Sequenciamento / Gantt",
    description: "Sequenciar ordens em capacidade finita (EDD) e visualizar o Gantt por ordem/centro.",
    module: "producao",
  },
  {
    code: "VPRO0300",
    title: "Custo Padrão",
    description: "Calcular o custo padrão (material + operação + overhead) com rollup multinível.",
    module: "producao",
  },
  {
    code: "VPRO0400",
    title: "Qualidade — Pontos de Inspeção",
    description: "Cadastrar pontos de inspeção (recebimento/processo/final) e registrar laudos.",
    module: "producao",
  },
  {
    code: "VPRO0500",
    title: "Manutenção Preventiva",
    description: "Planos de manutenção e ordens (PLANNED→IN_PROGRESS→DONE); horas descontadas no CRP.",
    module: "producao",
  },
  {
    code: "VPRO0600",
    title: "Previsão Estatística",
    description: "Prever demanda com modelos estatísticos (Holt-Winters, suavização, média móvel) — menor MAPE.",
    module: "producao",
  },
  {
    code: "VPRO0700",
    title: "Alertas de Exceções MRP",
    description: "Consolidar e notificar exceções do MRP via webhook e/ou e-mail.",
    module: "producao",
  },
  {
    code: "VPRO0800",
    title: "Restrições e Configurador",
    description: "Definir regras de validade de combinações de atributos e avaliá-las com um contexto.",
    module: "producao",
  },
  {
    code: "VPRO0900",
    title: "Ordem de Produção",
    description: "Gerir a OF: ciclo OPEN→IN_PROGRESS→COMPLETED→CLOSED, apontamentos, consumos (OUT), conclusão (IN+lote), custo real e sucata.",
    module: "producao",
  },
  // ── Contabilidade
  {
    code: "VCTB0102",
    title: "Cadastro de Centro de Custo",
    description: "Cadastrar e vincular centros de custo às empresas.",
    module: "contabilidade",
  },

  // ── Engenharia / PDM
  {
    code: "VPME0102",
    title: "Parâmetros de Promessa de Entrega",
    description: "Configurar os parâmetros globais do módulo de promessa de entrega.",
    module: "engenharia",
  },
  {
    code: "VPME0102ITE",
    title: "Calendário de Promessa de Entrega por Item",
    description: "Cadastrar dias úteis e não úteis para enchimento de tanques por item e máscara.",
    module: "engenharia",
  },
  {
    code: "VMAQ0101",
    title: "Tipos de Máquina",
    description: "Cadastrar categorias de equipamento (corte, dobra, solda, pintura, torno…).",
    module: "engenharia",
  },
  {
    code: "VMAQ0200",
    title: "Máquinas, Tempos e Cálculo",
    description: "Cadastrar máquinas (capacidade/eficiência), tempos por item × máquina, agenda e calcular o tempo de produção (ciclos, setup, gargalo).",
    module: "engenharia",
  },
  {
    code: "VENT0108",
    title: "Calendário Financeiro",
    description: "Manutenção dos dias não úteis do calendário financeiro.",
    module: "engenharia",
  },
  {
    code: "VENT0200",
    title: "Cadastro de Itens",
    description: "Cadastro e manutenção de itens do estoque.",
    module: "engenharia",
  },
  {
    code: "VENT0210",
    title: "Cadastro de Estrutura de Produtos",
    description: "Realize o cadastro das estruturas dos produtos.",
    module: "engenharia",
  },
  {
    code: "VENT0204",
    title: "Cadastro de Grupo",
    description: "Cadastro e manutenção de grupos do PDM.",
    module: "engenharia",
  },
  {
    code: "VENT0115",
    title: "Cadastro de Roteiro Padrão",
    description: "Cadastrar roteiros padrão para agilizar o cadastro dos roteiros de fabricação.",
    module: "engenharia",
  },
  {
    code: "VENT0202",
    title: "Cadastro do Roteiro de Fabricação",
    description: "Cadastrar operações e roteiros padrões na sequência de fabricação.",
    module: "engenharia",
  },
  {
    code: "VENT0363",
    title: "Relatório de Tempo de Centro de Trabalho",
    description: "Listar os tempos de fabricação por centro de trabalho.",
    module: "engenharia",
  },

  // ── Almoxarifado
  {
    code: "VENT0800",
    title: "Cadastro de Almoxarifado",
    description: "Cadastrar almoxarifados e configurações de estoque.",
    module: "almoxarifado",
  },

  // ── Planejamento
  {
    code: "VPLA0102",
    title: "Cadastro de Demandas Independentes",
    description: "Cadastrar demandas independentes para o Cálculo do Planejamento.",
    module: "planejamento",
  },

  // ── Previsão de Vendas
  {
    code: "VPRE0101",
    title: "Tabela de Apropriação",
    description: "Determinar o percentual de acomodação dos itens nos dias da semana.",
    module: "planejamento",
  },
  {
    code: "VPRE0102",
    title: "Bloqueio de Previsão de Vendas",
    description: "Informar períodos em que as previsões de venda devem estar bloqueadas.",
    module: "planejamento",
  },
  {
    code: "VPRE0201",
    title: "Cadastro da Previsão de Vendas",
    description: "Cadastrar a previsão de vendas manualmente e dar manutenção nas previsões geradas.",
    module: "planejamento",
  },
  {
    code: "VPRE0251",
    title: "Geração de Previsão de Vendas",
    description: "Gerar previsão de vendas com base no histórico de pedidos e/ou faturamento.",
    module: "planejamento",
  },
  {
    code: "VPRE0301",
    title: "Listagem Vendas Previsto X Realizado",
    description: "Listar e comparar a previsão de vendas com o realizado por período.",
    module: "planejamento",
  },

  // ── Assistência Técnica
  {
    code: "VASS0201",
    title: "Cadastro de Chamado de Assistência Técnica",
    description: "Cadastrar um chamado de assistência técnica para atender o cliente.",
    module: "assistencia",
  },
  {
    code: "VASS0402",
    title: "Consulta de Assistência Técnica",
    description: "Consultar as principais informações de um chamado de assistência técnica.",
    module: "assistencia",
  },

  // ── Garantia
  {
    code: "VGAR0211",
    title: "Gerar Pedido de Devolução",
    description: "Gerar os pedidos de devolução.",
    module: "garantia",
  },

  // ── Cliente
  {
    code: "VCLI0202",
    title: "Cadastro de Percentuais de Frete Por Cliente",
    description: "Cadastrar percentuais de frete por cliente e estabelecimentos.",
    module: "cliente",
  },

  // ── Custos
  {
    code: "VCST0202",
    title: "Precificação de Produtos",
    description: "Criar simulação e formar diversos preços de venda.",
    module: "custo",
  },
  {
    code: "VCUS0100",
    title: "Custos — Centro, Compra, Alocação e Overhead",
    description: "Custo/hora por centro de trabalho, custo de compra por item, base de alocação, overhead e rollup do custo padrão.",
    module: "custo",
  },

  // ── PDV
  {
    code: "VPDV0200",
    title: "Cadastro de Pedido de Venda",
    description: "Cadastrar Pedidos de Venda e receber pedidos importados.",
    module: "pdv",
  },
  {
    code: "VPDV0253",
    title: "Console de Acompanhamento de Pedidos",
    description: "Visão completa dos pedidos de venda em aberto e sua situação.",
    module: "pdv",
  },

  // ── Manutenção
  {
    code: "VMAN0202",
    title: "Apontamento de Ordens de Serviço de Manutenção",
    description: "Realizar movimentações das ordens de serviço de manutenções.",
    module: "manutencao",
  },
  {
    code: "VMAN0401",
    title: "Consulta Ordens de Serviço",
    description: "Listar as ordens de serviço de manutenção realizadas.",
    module: "manutencao",
  },

  // ── Suprimento
  {
    code: "VPDC0200",
    title: "Cadastro de Pedido de Compra",
    description: "Gerar o pedido de compra e enviá-lo ao fornecedor.",
    module: "suprimento",
  },

  // ── Assistência Técnica (Chamados)
  {
    code: "VATC0280",
    title: "Cadastro de Chamados",
    description: "Cadastrar chamados com dados do consumidor, tipo, garantia, motivo, responsável e posição.",
    module: "assistencia",
  },
  {
    code: "VATC0480",
    title: "Consulta de Chamados",
    description: "Consultar chamados cadastrados por diversos filtros como tipo, data, grupo, motivo, consumidor, responsável e situação.",
    module: "assistencia",
  },
  {
    code: "VATC0380",
    title: "Relatório de Chamados",
    description: "Listar chamados com opções de filtro por data, UF, cidade, consumidor, responsável, tipo, grupo, motivo, posição e situação.",
    module: "assistencia",
  },

  // ── Cliente
  {
    code: "VCLI0117",
    title: "Cadastro de Permissões e Restrições de Venda",
    description: "Restringir ou permitir a venda de itens ou classificação fiscal para clientes, estabelecimentos ou representantes.",
    module: "cliente",
  },
  {
    code: "VCLI0500",
    title: "Cadastro de Cliente",
    description: "Cadastrar clientes (matriz/filiais), dados fiscais, apoios vinculados, endereços, contatos e bloqueio/desbloqueio.",
    module: "cliente",
  },
  {
    code: "VCLI0510",
    title: "Apoio de Cliente — Básico",
    description: "Manter os cadastros de apoio básicos: região, segmento de mercado, tipo de contato, tipo de cliente, portador e grupo de portadores.",
    module: "cliente",
  },
  {
    code: "VCLI0520",
    title: "Apoio de Cliente — Comercial",
    description: "Manter condições de pagamento (com parcelas) e tabelas de vendas usadas pelo pedido de venda.",
    module: "cliente",
  },
  {
    code: "VCLI0530",
    title: "Apoio de Cliente — Fiscal",
    description: "Manter tipos de nota fiscal de saída e tipos de imposto (composição de base de cálculo) padrão do cliente.",
    module: "cliente",
  },

  // ── Planejamento
  {
    code: "VPLC0211",
    title: "Cadastro de Orientações de Entrega",
    description: "Incluir informações no romaneio de entrega para orientar o motorista em outras atividades.",
    module: "planejamento",
  },
  {
    code: "VPLC0200",
    title: "Montagem de Carga",
    description: "Selecionar pedidos e gerar cargas para faturamento, etiquetas e emissão de notas fiscais por carga.",
    module: "planejamento",
  },

  // ── PDV
  {
    code: "VPDV0108",
    title: "Cadastro de Política Comercial de Descontos",
    description: "Cadastrar políticas comerciais de descontos com prioridades, sequências e validade.",
    module: "pdv",
  },
  {
    code: "VPDV0111",
    title: "Cadastro de Política Comercial de Fretes",
    description: "Determinar valor do frete/seguro com base em critérios definidos pela transportadora.",
    module: "pdv",
  },
  {
    code: "VVRE0200",
    title: "Console de Vendas Recorrentes",
    description: "Visualizar histórico de recorrências ativas e inativas para um cliente/estabelecimento.",
    module: "pdv",
  },
  {
    code: "VRE0203",
    title: "Consulta de Comissões Futuras",
    description: "Apresentar projeção de recorrências de comissão ativas para um período futuro.",
    module: "pdv",
  },

  // ── Engenharia
  {
    code: "VENG0204",
    title: "Cadastro de Regras de Variáveis Equivalentes",
    description: "Cadastrar regras para itens configurados conforme a configuração do item pai.",
    module: "engenharia",
  },
  {
    code: "VITE0313",
    title: "Geração de Máscara para Itens Configurados",
    description: "Gerar combinações válidas de itens configurados para novas máscaras.",
    module: "engenharia",
  },
  {
    code: "VITE0114",
    title: "Cadastro de Grupos (PDM)",
    description: "Cadastrar grupos para a Padronização da Descrição dos Materiais.",
    module: "engenharia",
  },
  {
    code: "VITE0115",
    title: "Cadastro de Modificadores (PDM)",
    description: "Cadastrar modificadores referentes aos grupos do PDM.",
    module: "engenharia",
  },
  {
    code: "VITE0116",
    title: "Cadastro de Atributos (PDM)",
    description: "Cadastrar atributos ligados a um determinado modificador do PDM.",
    module: "engenharia",
  },
  {
    code: "VITE0118",
    title: "Cadastro de Regras de Itens Configurados",
    description: "Cadastrar regras para itens configurados e definir onde estas regras devem ser executadas.",
    module: "engenharia",
  },
  {
    code: "VITE0129",
    title: "Replicação de Parâmetros de Itens Configurados",
    description: "Atualizar pastas configuradas do cadastro do item conforme regras cadastradas.",
    module: "engenharia",
  },

  // ── Suprimento (Contratos)
  {
    code: "VCON0200",
    title: "Cadastro de Contratos de Fornecedores",
    description: "Cadastrar contratos com fornecedores para acompanhamento de quantidades contratadas e recebidas.",
    module: "suprimento",
  },
  {
    code: "VCON0100",
    title: "Cadastro de Tipos de Contratos",
    description: "Cadastrar os tipos de contratos com fornecedores.",
    module: "suprimento",
  },
  {
    code: "VCON0400",
    title: "Consulta de Contratos de Fornecedores",
    description: "Visualizar dados referentes aos contratos de fornecedores.",
    module: "suprimento",
  },
  {
    code: "VCON0202",
    title: "Cancelamento de Itens do Contrato",
    description: "Cancelar ou descancelar itens de um contrato que não têm pedido de compra associado.",
    module: "suprimento",
  },
  {
    code: "VAVR0200",
    title: "Cadastro de Aviso de Recebimento",
    description: "Reunir informações cadastrais referentes ao cadastro de fornecedores e transportadoras.",
    module: "suprimento",
  },
  {
    code: "VVOR0202",
    title: "Cadastro de Itens por Fornecedor",
    description: "Configurar o cadastro de itens personalizados para cada fornecedor.",
    module: "suprimento",
  },

  // ── Contabilidade / Utilitários
  {
    code: "VUTL0555",
    title: "Cadastro de UFs e Cidades",
    description: "Cadastrar os Municípios e suas respectivas Unidades Federativas.",
    module: "contabilidade",
  },

  // ── Importação
  {
    code: "VIMP0200",
    title: "Console de Processos de Importação",
    description: "Manutenção e acompanhamento dos processos de importação, centralizando informações em um único local.",
    module: "importacao",
  },
  {
    code: "VIMP0102",
    title: "Tipos de Conhecimentos de Transporte",
    description: "Cadastrar e gerenciar os tipos de conhecimento de transporte para processos de importação.",
    module: "importacao",
  },
  {
    code: "VIMP0101",
    title: "Status Logístico da Carga",
    description: "Cadastrar e gerenciar os status logísticos da carga de importação.",
    module: "importacao",
  },

  // ── Inspeção
  {
    code: "VINS0106",
    title: "Cadastro de Ocorrências",
    description: "Cadastrar ocorrências para itens na inspeção.",
    module: "inspecao",
  },
  {
    code: "VINS0400",
    title: "Consulta de Ocorrências / Ordens de Inspeção",
    description: "Consultar ocorrências cadastradas e ordens de inspeção detalhadas.",
    module: "inspecao",
  },
  {
    code: "VINS0105",
    title: "Cadastro de Tipos de Ocorrências",
    description: "Cadastrar os tipos de ocorrências para inspeção.",
    module: "inspecao",
  },
  {
    code: "VINS0313",
    title: "Consulta de Inspeções de Recebimento",
    description: "Gerar relatório em Excel com os dados das inspeções de recebimento.",
    module: "inspecao",
  },
  {
    code: "VINS0200",
    title: "Cadastro do Roteiro de Inspeção",
    description: "Cadastrar o roteiro de inspeção para itens que serão inspecionados.",
    module: "inspecao",
  },
  {
    code: "VINS0201",
    title: "Manutenção das Ordens de Inspeções",
    description: "Mostrar e gerenciar ordens que podem ser inspecionadas ou analisadas.",
    module: "inspecao",
  },
  {
    code: "VINS0206",
    title: "Exclusão de Ordens de Inspeção",
    description: "Excluir ordens de inspeção geradas.",
    module: "inspecao",
  },
  {
    code: "VINS0211",
    title: "Cadastro de Tipos de Roteiro de Inspeção",
    description: "Cadastrar os tipos de roteiros de inspeção.",
    module: "inspecao",
  },

  // ── Avaliação de Fornecedores
  {
    code: "VAVF0105",
    title: "Cadastro de Tipos de Abono para Divergências",
    description: "Justificar e abonar divergências para fornecedores na geração do IQF.",
    module: "inspecao",
  },
  {
    code: "VAVF0101",
    title: "Cadastro de Parâmetros de Avaliação de Fornecedores",
    description: "Cadastrar pesos, notas e intervalos de avaliação para o IQF dos fornecedores.",
    module: "inspecao",
  },
  {
    code: "VAVF0204",
    title: "Envio de IQF aos Fornecedores",
    description: "Calcular e enviar o IQF aos fornecedores com layout de e-mail personalizado.",
    module: "inspecao",
  },

  // ── Fiscal & Financeiro
  {
    code: "VFIN0100",
    title: "Contas Bancárias",
    description: "Cadastrar contas bancárias com saldo inicial e chave PIX.",
    module: "financeiro",
  },
  {
    code: "VFIN0110",
    title: "Condições de Pagamento",
    description: "Cadastrar condições de pagamento (parcelas em dias) do módulo financeiro.",
    module: "financeiro",
  },
  {
    code: "VFIN0120",
    title: "Plano de Contas",
    description: "Manter o plano de contas (tipo/natureza, hierarquia).",
    module: "financeiro",
  },
  {
    code: "VFIN0130",
    title: "Centros de Custo",
    description: "Cadastrar centros de custo.",
    module: "financeiro",
  },
  {
    code: "VFIN0200",
    title: "Contas a Pagar",
    description: "Lançar, aprovar, baixar e cancelar contas a pagar; aging.",
    module: "financeiro",
  },
  {
    code: "VFIN0210",
    title: "Contas a Receber",
    description: "Lançar, baixar e cancelar contas a receber; aging.",
    module: "financeiro",
  },
  {
    code: "VFIN0300",
    title: "Fluxo de Caixa e Saldos",
    description: "Extrato realizado, projeção de caixa e saldos das contas.",
    module: "financeiro",
  },
  {
    code: "VFIN0400",
    title: "Apuração de Impostos",
    description: "Apurar ICMS/IPI/PIS/COFINS por competência.",
    module: "financeiro",
  },
  {
    code: "VFIN0500",
    title: "Relatórios Fiscais e Financeiros",
    description: "Relatórios R01–R19 (livros, DRE, aging, curva ABC, produtos).",
    module: "financeiro",
  },
  {
    code: "VFIS0100",
    title: "Configuração Fiscal",
    description: "Configurar emitente, endereço, Focus NF-e, alíquotas e vencimentos.",
    module: "fiscal",
  },
  {
    code: "VFIS0110",
    title: "Tabelas Tributárias",
    description: "Manter tabelas NCM (IPI/PIS/COFINS) e ICMS interno/interestadual.",
    module: "fiscal",
  },
  {
    code: "VFIS0200",
    title: "NF-e de Saída",
    description: "Emitir NF-e de saída: rascunho, autorização, CC-e, cancelamento, status.",
    module: "fiscal",
  },
  {
    code: "VFIS0210",
    title: "NF-e de Entrada",
    description: "Lançar/importar NF-e de entrada (XML ou chave) e aprovar.",
    module: "fiscal",
  },
  {
    code: "VFIS0220",
    title: "CT-e (Conhecimento de Transporte)",
    description: "Registrar CT-e e ratear frete vinculado à NF-e de entrada.",
    module: "fiscal",
  },
  {
    code: "VFIS0300",
    title: "CFOPs e Naturezas de Operação",
    description: "Manter CFOPs e suas classificações de utilização.",
    module: "fiscal",
  },
  {
    code: "VFIS0310",
    title: "Dispositivos Legais",
    description: "Cadastrar dispositivos legais (ICMS/IPI/PIS/COFINS/laudo).",
    module: "fiscal",
  },
  {
    code: "VFIS0320",
    title: "Parâmetros ICMS/IPI",
    description: "Parâmetros básicos de ICMS/IPI por NCM/Item, UF e operação.",
    module: "fiscal",
  },
  {
    code: "VFIS0330",
    title: "Redução / Substituição / Diferimento de ICMS",
    description: "Parametrização avançada de ICMS por item/NCM/UF/cliente (hierarquia).",
    module: "fiscal",
  },
  {
    code: "VFIS0340",
    title: "Apuração do Simples Nacional",
    description: "Apuração mensal do Simples Nacional por anexo.",
    module: "fiscal",
  },
  {
    code: "VFIS0350",
    title: "Classificações Fiscais",
    description: "Cadastro de classificação fiscal de mercadorias (NCM/CEST), idiomas e atributos de exportação.",
    module: "fiscal",
  },
  {
    code: "VFIS0360",
    title: "Tipos de Operação de Entrada",
    description: "Natureza fiscal das compras, grupos de estado e validação UF×natureza.",
    module: "fiscal",
  },
  {
    code: "VFIS0500",
    title: "Motivos de Transferência DAPI",
    description: "Cadastrar motivos de transferência usados na DAPI.",
    module: "fiscal",
  },
  {
    code: "VFIS0510",
    title: "Códigos de Ajuste de Apuração ICMS (5.1.1)",
    description: "Códigos de ajuste de apuração ICMS do SPED Fiscal por UF.",
    module: "fiscal",
  },
  {
    code: "VFIS0520",
    title: "Códigos de Ajuste ICMS (5.2/5.3/5.6/5.7)",
    description: "Códigos de ajuste ICMS para benefícios, incentivos e estornos.",
    module: "fiscal",
  },
  {
    code: "VFIS0530",
    title: "Linhas de Apuração de ICMS",
    description: "Linhas do bloco E do SPED Fiscal (apuração de ICMS).",
    module: "fiscal",
  },
  {
    code: "VFIS0540",
    title: "Lançamentos Resumo de ICMS",
    description: "Resumo de ICMS por período/UF/CFOP e notas vinculadas (+ adicionais C197).",
    module: "fiscal",
  },
  {
    code: "VFIS0550",
    title: "Restituição / Ressarcimento de ICMS ST",
    description: "Pedidos de restituição/ressarcimento/complementação de ICMS ST.",
    module: "fiscal",
  },
  {
    code: "VFIS0560",
    title: "Notas Especiais de Ajuste",
    description: "Notas complementares e de ajuste de apuração de ICMS (com itens).",
    module: "fiscal",
  },

  // ── Cadastros & Plataforma / Contabilidade / NFS-e (novas)
  {
    code: "VEMP0100",
    title: "Cadastro de Empresa",
    description: "Cadastrar empresa (CNPJ, inscrições, regime tributário, endereço SEFAZ); matriz/filiais.",
    module: "cadastros",
  },
  {
    code: "VFUN0100",
    title: "Cadastro de Funcionário",
    description: "Cadastrar, editar e desativar funcionários (função, situação, flags).",
    module: "cadastros",
  },
  {
    code: "VLOC0100",
    title: "Localização (Países e UFs)",
    description: "Manter países e UFs (base para endereços e regras fiscais).",
    module: "cadastros",
  },
  {
    code: "VCLA0100",
    title: "Classificação de Itens",
    description: "Manter máscaras de classificação e a árvore de classificações de itens.",
    module: "cadastros",
  },
  {
    code: "VCAL0100",
    title: "Calendário Industrial",
    description: "Cadastrar dias úteis/não úteis da fábrica, consumidos pelo planejamento.",
    module: "cadastros",
  },
  {
    code: "VPRI0100",
    title: "Prioridade de Ordens",
    description: "Cadastrar níveis de prioridade usados pelo APS no sequenciamento.",
    module: "cadastros",
  },
  {
    code: "VCTB0200",
    title: "Contabilidade (SPED ECD)",
    description: "Plano de contas, contas contábeis, lançamentos e balancete (escrituração).",
    module: "contabilidade",
  },
  {
    code: "VNFS0100",
    title: "NFS-e (Nota Fiscal de Serviço)",
    description: "Emitir, autorizar e cancelar NFS-e (modelo ABRASF via Focus), com cálculo de ISS.",
    module: "fiscal",
  },

  // ── Estoque / Almoxarifado
  {
    code: "VEST0100",
    title: "Estoque — Movimentos, Saldos, ATP, Reservas, Lotes",
    description: "Lançar movimentos, consultar saldos/ATP, criar reservas, registrar lotes (genealogia) e consumo médio (ROP).",
    module: "almoxarifado",
  },
  {
    code: "VEST0200",
    title: "Inventário e Tipos de Movimento",
    description: "Criar inventário, contar, ajustar diferenças e fechar; CRUD dos tipos de movimento de estoque.",
    module: "almoxarifado",
  },
  // ── Vendas & Expedição (novas)
  {
    code: "VEXP0100",
    title: "Expedição / Romaneio",
    description: "Montar romaneio de expedição: itens, conferência e despacho (OPEN→SEPARATED→CONFERRED→SHIPPED).",
    module: "almoxarifado",
  },
  {
    code: "VVND0100",
    title: "Divisão de Vendas",
    description: "Cadastrar divisões de vendas (equipe/região/unidade) associáveis ao pedido.",
    module: "comercial",
  },
  {
    code: "VVND0200",
    title: "Pedido de Venda",
    description: "Gerir pedidos de venda: capa, itens, confirmação (crédito/reserva/demanda), bloqueio e cancelamento (R→P→F).",
    module: "comercial",
  },
  {
    code: "VEXR0100",
    title: "Reprogramação de Entrega",
    description: "Registrar e consultar reprogramações de data de entrega por pedido (data original × nova × motivo).",
    module: "comercial",
  },
];

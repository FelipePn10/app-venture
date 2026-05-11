export type ErpModule =
  | 'comercial'
  | 'financeiro'
  | 'contabilidade'
  | 'engenharia'
  | 'almoxarifado'
  | 'planejamento';

export interface ModuleMeta {
  label: string;
  color: string;
  bgColor: string;
}

export const MODULE_META: Record<ErpModule, ModuleMeta> = {
  comercial:     { label: 'Comercial',     color: '#2563eb', bgColor: '#eff6ff' },
  financeiro:    { label: 'Financeiro',    color: '#059669', bgColor: '#ecfdf5' },
  contabilidade: { label: 'Contabilidade', color: '#7c3aed', bgColor: '#f5f3ff' },
  engenharia:    { label: 'Engenharia',    color: '#d97706', bgColor: '#fffbeb' },
  almoxarifado:  { label: 'Almoxarifado',  color: '#b45309', bgColor: '#fef3c7' },
  planejamento:  { label: 'Planejamento',  color: '#0e7490', bgColor: '#ecfeff' },
};

export const MODULE_ORDER: ErpModule[] = [
  'comercial',
  'financeiro',
  'contabilidade',
  'engenharia',
  'almoxarifado',
  'planejamento',
];

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
  {
    code: "FCOM0100",
    title: "Painel Comercial",
    description: "Visão inicial de negociações e propostas.",
    module: "comercial",
  },

  // ── Financeiro
  {
    code: "FFIN0300",
    title: "Resumo Financeiro",
    description: "Acompanhamento consolidado de indicadores financeiros.",
    module: "financeiro",
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
];

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
  // ── Módulos de plataforma / novos (backend recém-exposto)
  {
    code: "VPCT0100",
    title: "Tolerâncias de Pedido de Compra",
    description: "Faixas de tolerância (quantidade/preço/total) por operação e fornecedor, com ação BLOCK/WARN, e avaliação.",
    module: "suprimento",
  },
  {
    code: "VDES0100",
    title: "Desenhos Técnicos",
    description: "Cadastrar desenhos (código/dígito/formato), revisões com vigência/aprovação e características.",
    module: "engenharia",
  },
  {
    code: "VTPS0100",
    title: "Serviços de Terceiros",
    description: "Preços de serviço por item×fornecedor×operação e ordens de serviço (OF→requisição→OC).",
    module: "suprimento",
  },
  {
    code: "VCFG0100",
    title: "Configurador de Produto",
    description: "Conjuntos, variáveis e características do configurador cfg_*; vincular características ao item e gerar a máscara.",
    module: "engenharia",
  },
  {
    code: "VPLN0100",
    title: "Pipeline de Planejamento (MRP→CRP→APS)",
    description: "Executar MRP, CRP e APS num único disparo com parecer de viabilidade, e manter parâmetros de planejamento.",
    module: "planejamento",
  },
  {
    code: "VRES0100",
    title: "Motivos de Restrição",
    description: "Cadastrar os motivos usados nas restrições/dependências do configurador.",
    module: "producao",
  },
  {
    code: "VBOM0100",
    title: "Cabeçalhos de Estrutura (BOM)",
    description: "Versão, tipo (EBOM/MBOM) e status (DRAFT→APPROVED→OBSOLETE) da estrutura por item.",
    module: "engenharia",
  },
  {
    code: "VLOT0100",
    title: "Máscaras de Lote/Série",
    description: "Compor o número de lote/série por partes (caractere/data/sequencial) e gerar o próximo lote.",
    module: "almoxarifado",
  },
  {
    code: "VAUD0100",
    title: "Log de Auditoria",
    description: "Consultar os eventos de auditoria do sistema (somente ADMIN).",
    module: "cadastros",
  },
  {
    code: "VUSR0100",
    title: "Solicitações de Troca de Senha",
    description: "Solicitar, aprovar, concluir ou rejeitar solicitações de troca de senha de usuários.",
    module: "cadastros",
  },
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
    code: "VCUT0100",
    title: "Plano de Corte",
    description: "Otimizar aproveitamento de matéria-prima (nesting 1D/2D/true-shape): demanda, estoque, otimizar, firmar (baixa + retalhos), programa, agenda e export SVG/DXF/PDF.",
    module: "producao",
  },
  {
    code: "VPRO0900",
    title: "Ordem de Produção",
    description: "Gerir a OF: ciclo OPEN→IN_PROGRESS→COMPLETED→CLOSED, apontamentos, consumos (OUT), conclusão (IN+lote), custo real e sucata.",
    module: "producao",
  },
  {
    code: "VPRO1000",
    title: "Ficha de Produção da Ferramenta",
    description: "Vincular a série física de ferramenta em cada operação da OF (substituição com histórico) e cadastrar ferramentas/séries com vida útil.",
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
    code: "VITM0100",
    title: "Item & Prontidão para o MRP",
    description: "Listar itens, cadastrar (pastas PDM/Almox/Engenharia/Planejamento) e validar a prontidão para o MRP (checklist de BOM/roteiro/fornecedor/conversão) + estrutura.",
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
  {
    code: "VMRP0100",
    title: "MRP — Planejamento de Materiais",
    description: "Rodar o MRP por plano, analisar sugestões de ordens, firmar (→ Ordem Planejada/OF), perfil MRP por item, exceções e regras configuradas.",
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
  {
    code: "VSUP0500",
    title: "Cadastro de Fornecedor",
    description: "Cadastrar fornecedores/transportadoras: dados, endereço, pastas (telefones/emails/vencimentos/contatos/empresas), SEFAZ, auto-fill CNPJ e bloqueio.",
    module: "suprimento",
  },
  {
    code: "VSUP0510",
    title: "Apoio de Fornecedores",
    description: "Cadastros de apoio do fornecedor: tipos de fornecedor (kind), tipos de contato e parâmetros por empresa.",
    module: "suprimento",
  },
  {
    code: "VSUP0110",
    title: "Conversão de UM por Item",
    description: "Cadastrar fatores de conversão entre unidades de medida de um item (ex.: 1 CX = 12 UN) para o pedido de compra.",
    module: "suprimento",
  },
  {
    code: "VSUP0120",
    title: "Tabela de Preço de Compra",
    description: "Cadastrar tabelas de preço de compra (genéricas ou por fornecedor) com vigência, moeda e itens.",
    module: "suprimento",
  },
  {
    code: "VSUP0130",
    title: "Fornecedor Preferencial por Item",
    description: "Vincular fornecedores a um item com ranking de preferência, código/descrição/UM do item no fornecedor e lead time.",
    module: "suprimento",
  },
  {
    code: "VSUP0200",
    title: "Pedido de Compra",
    description: "Gerir pedidos de compra (capa + itens com preço/IPI/UM resolvidos), cancelar, e aprovar/rejeitar sugestões de compra do MRP.",
    module: "suprimento",
  },
  {
    code: "VSUP0300",
    title: "Solicitação de Compra",
    description: "Registrar solicitações de compra (itens com saldo/atendimento) e gerar pedidos agrupando por fornecedor.",
    module: "suprimento",
  },
  {
    code: "VSUP0400",
    title: "Cotação de Compra",
    description: "Liberar itens para cotação, registrar preços por fornecedor, selecionar o vencedor e gerar pedidos.",
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
    title: "Recarga de Descrições de Itens Configurados",
    description: "Recarregar e renderizar descrições configuradas usando as regras vigentes.",
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
    title: "Baixa de Saldo / Cancelamento do Contrato",
    description: "Consumir saldo de linhas do contrato (baixa) e cancelar o contrato via status.",
    module: "suprimento",
  },
  {
    code: "VAVR0200",
    title: "Aviso de Recebimento",
    description: "Agendar doca, informar itens esperados, acompanhar conferência e tratar divergências antes da entrada fiscal.",
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
    title: "Cadastro de UFs e Países",
    description: "Cadastrar Unidades Federativas (com código IBGE) e Países. Municípios não têm cadastro próprio no backend.",
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
    title: "Conhecimentos de Transporte (CT-e)",
    description: "Cadastrar, consultar e autorizar conhecimentos de transporte (CT-e) vinculáveis às entradas e processos de importação.",
    module: "importacao",
  },
  {
    code: "VIMP0101",
    title: "Status Logístico da Carga",
    description: "Acompanhar o status logístico dos processos de importação (OPEN → NATIONALIZED → CANCELLED).",
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
    title: "Tratamento das Ordens de Inspeção",
    description: "Analisar quantidades inspecionadas e efetivar a destinação física (aprovado/rejeitado/retrabalho).",
    module: "inspecao",
  },

  // ── Avaliação de Fornecedores
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
    code: "VFIN0600",
    title: "Adiantamentos de Clientes e Fornecedores",
    description: "Registrar, consultar e aplicar antecipações em contas a pagar ou receber.",
    module: "financeiro",
  },
  {
    code: "VFIN0610",
    title: "Remessa Bancária CNAB 240",
    description: "Gerar arquivo de remessa CNAB 240 para envio ao banco.",
    module: "financeiro",
  },
  {
    code: "VFIN0620",
    title: "Conciliação Bancária por OFX",
    description: "Importar extrato OFX real e conciliar movimentos da conta bancária.",
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
    code: "VVND0300",
    title: "Orçamento de Venda",
    description: "Registrar propostas comerciais (capa + itens), acompanhar carteira, cancelar/descancelar/atender e converter o saldo aberto em pedido de venda.",
    module: "comercial",
  },
  {
    code: "VVND0400",
    title: "Representantes",
    description: "Cadastrar vendedores/gerentes/prepostos: dados, documento, território, comissão, tipos, pastas (empresas, telefones, e-mails), bloqueio, relatório cadastral e ficha de acompanhamento.",
    module: "comercial",
  },
  {
    code: "VVND0500",
    title: "Metas de Vendas",
    description: "Definir metas comerciais por período, representante e cliente (valor/quantidade), acompanhar previsto × realizado, premiação e saldos excedentes.",
    module: "comercial",
  },
  {
    code: "VSAC0100",
    title: "Atendimento ao Consumidor (SAC)",
    description: "Centralizar consumidores finais, chamados de SAC (recebido/efetuado/garantia), reclamações com sintomas, visitas técnicas, retornos e indicadores.",
    module: "comercial",
  },
  {
    code: "VDPR0100",
    title: "Promessa de Entrega — Ocupação e Reservas",
    description: "Consultar ocupação diária de tanque/setor, criar/simular reserva comercial de capacidade, expirar reservas vencidas e reprogramar datas de entrega em lote.",
    module: "comercial",
  },
  {
    code: "VEXR0100",
    title: "Reprogramação de Entrega",
    description: "Registrar e consultar reprogramações de data de entrega por pedido (data original × nova × motivo).",
    module: "comercial",
  },
  // ── Fechamento funcional 2026: compras, configurador, terceiros, APS e engenharia
  { code: "VSUP0600", title: "Inspeção de Recebimento", description: "Roteiros, ordens, resultados, análise e destinação de inspeções de compra.", module: "inspecao" },
  { code: "VAVF0300", title: "Scorecard e IQF do Fornecedor", description: "Cálculo automático, lançamento manual e histórico do IQF.", module: "inspecao" },
  { code: "VSUP0610", title: "Alçadas e Parâmetros de Compras", description: "Limites de aprovação e parâmetros operacionais de suprimentos.", module: "suprimento" },
  { code: "VSUP0620", title: "EDI de Fornecedores", description: "Confirmações eletrônicas de pedidos e divergências de quantidade, preço e prazo.", module: "suprimento" },
  { code: "VIMP0300", title: "Importação e Custo Nacionalizado", description: "Processos, despesas, rateio e recálculo do custo de importação.", module: "importacao" },
  { code: "VAVF0203", title: "Homologação de Fornecedores", description: "Faixas, validade e geração de vínculos de itens do fornecedor.", module: "inspecao" },
  { code: "VPDC0210", title: "Consulta, Aprovação e Recebimento de Pedidos", description: "Consulta operacional, alçada e recebimento físico do pedido de compra.", module: "suprimento" },
  { code: "VCFG0100", title: "Conjuntos e Variáveis do Configurador", description: "Conjuntos de respostas, variáveis, máscaras e traduções.", module: "engenharia" },
  { code: "VCFG0200", title: "Características do Configurador", description: "Tipos, fórmulas, limites, idiomas e itens de recebimento.", module: "engenharia" },
  { code: "VCFG0300", title: "Características por Item", description: "Ordenação e comportamento das características de cada item configurável.", module: "engenharia" },
  { code: "VCFG0400", title: "Geração de Máscaras Configuradas", description: "Geração individual ou cartesiana de máscaras por respostas.", module: "engenharia" },
  { code: "VCFG0500", title: "Descrições Configuradas", description: "Tipos, linhas e renderização de descrições de itens configurados.", module: "engenharia" },
  { code: "VCFG0600", title: "Regras do Configurador", description: "Regras equivalentes pai-filho e regras de preenchimento do item.", module: "engenharia" },
  { code: "VTER0100", title: "Preços de Serviços de Terceiros", description: "Preços, vigência, fórmula, reajuste, cópia e histórico.", module: "suprimento" },
  { code: "VTER0200", title: "Ordens de Serviço de Terceiros", description: "Geração pela OF e acompanhamento de requisição, compra e execução.", module: "suprimento" },
  { code: "VTER0300", title: "Remessas e Retornos de Terceiros", description: "Movimentos de remessa, retorno, recebimento e ajuste.", module: "suprimento" },
  { code: "VTER0400", title: "Conversões Globais de Terceiros", description: "Fatores globais de conversão de unidades para terceiros.", module: "suprimento" },
  { code: "VAPS0100", title: "Grupos e Parâmetros de Recursos APS", description: "Agrupamento, capacidade, calendário e criticidade de recursos.", module: "producao" },
  { code: "VAPS0200", title: "Calendários de Máquinas", description: "Intervalos semanais de disponibilidade para capacidade finita.", module: "producao" },
  { code: "VAPS0300", title: "Paradas de Máquinas", description: "Indisponibilidades planejadas e emergenciais de recursos.", module: "manutencao" },
  { code: "VAPS0400", title: "Perfil de Operadores APS", description: "Contatos, funções, supervisão e centros de custo de operadores.", module: "producao" },
  { code: "VAPS0500", title: "Perfil Industrial de Máquinas", description: "Preparação, responsáveis, serviços, itens e campos especiais.", module: "producao" },
  { code: "VAPS0600", title: "Cálculo e Consulta do Sequenciamento APS", description: "Cálculo, recursos, visão, exportação e parâmetros do sequenciamento.", module: "producao" },
  { code: "VENG0300", title: "Cabeçalho e Revisão de Estrutura BOM", description: "Versão, efetividade e status da estrutura do produto.", module: "engenharia" },
  { code: "VENG0400", title: "Desenhos e Revisões", description: "Desenhos, revisões, distribuição, características e parâmetros fabris.", module: "engenharia" },
  { code: "VMRP0200", title: "Pipeline MRP → CRP → APS", description: "Execução coordenada do planejamento de materiais, capacidade e sequência.", module: "planejamento" },
  { code: "VEST0300", title: "Máscaras de Lote e Série", description: "Composição e geração automática de códigos de lote e série.", module: "almoxarifado" },
  { code: "VSUP0630", title: "Tolerâncias de Pedido de Compra", description: "Faixas e ações para desvios de quantidade, preço e prazo.", module: "suprimento" },
  { code: "VSUP0640", title: "Registros Operacionais de Compras", description: "Ocorrências normalizadas de compra, recebimento e inspeção.", module: "suprimento" },
  { code: "VSUP0650", title: "Histórico de Movimentos de Compra", description: "Rastreabilidade consolidada de movimentos por fornecedor e item.", module: "suprimento" },
  { code: "VSEC0100", title: "Solicitação e Aprovação de Troca de Senha", description: "Fluxo seguro de solicitação, aprovação e conclusão da troca de senha.", module: "cadastros" },
  { code: "VPLA0300", title: "Parâmetros do Planejamento", description: "Parâmetros numerados consumidos pelo MRP e planejamento industrial.", module: "planejamento" },
  { code: "VRES0100", title: "Motivos de Restrição", description: "Cadastro de motivos usados nas restrições comerciais e de configuração.", module: "comercial" },
  { code: "VEXP0110", title: "Gestão de Cargas de Expedição", description: "Montagem, liberação, carregamento e despacho de cargas.", module: "almoxarifado" },
  { code: "VEXP0120", title: "Instruções e Caixas de Despacho", description: "Orientações de entrega e posições físicas da expedição.", module: "almoxarifado" },
  { code: "VENG0500", title: "Estruturas Avançadas", description: "Manutenção, explosão e onde-usado de estruturas.", module: "engenharia" },
  { code: "VMAQ0300", title: "Tempos e Programação de Máquina", description: "Tempos produtivos e agenda da máquina.", module: "engenharia" },
  { code: "VCAL0200", title: "Dias Úteis Prometidos por Item", description: "Calendário mensal efetivo da promessa do item.", module: "planejamento" },
  { code: "VPRO1100", title: "Estoque da Manufatura", description: "Parâmetros de lotes, baixas e endereçamento produtivo.", module: "producao" },
  { code: "VVND0600", title: "Workflow do Pedido de Venda", description: "Análise, atendimento, conferência e atrasos.", module: "comercial" },
  { code: "VVND0610", title: "Reajuste de Venda Recorrente", description: "Recalcular e justificar o reajuste de um contrato recorrente.", module: "comercial" },
  { code: "VSUP0660", title: "Parâmetros e Contatos do Fornecedor", description: "Configurar regras do fornecedor e complementar contatos persistidos.", module: "suprimento" },
  { code: "VSUP0670", title: "Itens e Qualidade do Fornecedor", description: "Consultar itens e anexar relatórios de qualidade ao vínculo com o fornecedor.", module: "suprimento" },
  { code: "VSUP0680", title: "Fontes de Preços de Compra", description: "Selecionar fontes, candidatos e ajustes para tabelas de preços de compra.", module: "suprimento" },
  { code: "VENG0600", title: "Rede de Precedência do Roteiro", description: "Manter dependências e sobreposição entre operações do roteiro.", module: "engenharia" },
  { code: "VENG0610", title: "Seriais Físicos de Ferramentas", description: "Consultar e manter instâncias serializadas de ferramentas.", module: "engenharia" },
  { code: "VCLI0600", title: "Manutenção Avançada de Preços de Venda", description: "Consultar histórico, alterar linhas e gerar preços por política.", module: "comercial" },
  { code: "VCTB0600", title: "SPED ECD", description: "Gerar o arquivo da Escrituração Contábil Digital.", module: "contabilidade" },
  { code: "VFIS0620", title: "Manifestação e Inutilização de NF-e", description: "Transmitir eventos fiscais de destinatário e faixas inutilizadas.", module: "fiscal" },
  { code: "VFIS0630", title: "Tabela IBPT", description: "Importar a tabela oficial e consultar carga tributária por NCM e UF.", module: "fiscal" },
  { code: "VFIS0640", title: "Faturamento de Carga e DANFE", description: "Gerar NF-e a partir da carga e consultar documentos autorizados.", module: "fiscal" },
  { code: "VFIS0120", title: "Exclusão de Tributação NCM", description: "Remover tributação NCM obsoleta de forma controlada.", module: "fiscal" },
  { code: "VFIS0660", title: "Consultas de Parâmetros Fiscais", description: "Consultar cadastros fiscais por chaves e filtros específicos.", module: "fiscal" },
  { code: "VUTL0560", title: "Consulta de UF e Região", description: "Localizar UF e região comercial por suas chaves.", module: "contabilidade" },
  { code: "VSAC0200", title: "Relatórios e Anexos do Atendimento", description: "Etiquetas, relatórios e documentos do chamado.", module: "assistencia" },
  { code: "VREP0600", title: "Complementos do Representante", description: "Segmentos, planos, interesses e correspondência.", module: "comercial" },
  { code: "VEST0400", title: "Consultas de Estoque por Almoxarifado", description: "Movimentos e saldos persistidos por almoxarifado.", module: "almoxarifado" },
  { code: "VFIS0600", title: "SPED EFD ICMS/IPI", description: "Geração do arquivo da Escrituração Fiscal Digital.", module: "fiscal" },
  { code: "VFIS0610", title: "Importação de NF-e por Chave", description: "Importação da NF-e de compra, baixa do pedido e entrada em estoque.", module: "fiscal" },
  { code: "VADM0100", title: "Trilha de Auditoria", description: "Consulta administrativa de alterações por usuário, rota e período.", module: "cadastros" },
];

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
  | 'inspecao'
  | 'beneficiamento';

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
    modules: ['engenharia', 'producao', 'manutencao', 'planejamento', 'suprimento', 'almoxarifado', 'beneficiamento', 'importacao', 'inspecao'],
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
  beneficiamento: { label: 'Beneficiamento',     color: '#4d7c0f', bgColor: '#f7fee7' },
  cadastros:     { label: 'Cadastros & Plataforma', color: '#475569', bgColor: '#f8fafc' },
};

export interface ErpScreen {
  code: string;
  title: string;
  description: string;
  module: ErpModule;
}

/**
 * Rotinas que o perfil **OPERATOR** — o posto de trabalho — pode abrir.
 *
 * O backend já recusa o resto (o perfil só tem leitura e `production:report`),
 * mas oferecer 209 rotinas a quem pode usar cinco é oferecer 204 becos sem
 * saída: o operador clica em Financeiro e recebe "usuário não autorizado", sem
 * entender se errou ou se o sistema quebrou. O menu mostra o que ele faz.
 *
 * Esta lista acompanha o escopo do perfil no backend
 * (`internal/interfaces/middleware/permissions.go`): apontar produção, ver a
 * ordem em que vai apontar e registrar parada de máquina.
 */
export const SHOP_FLOOR_SCREENS: readonly string[] = [
  'VPRO0900', // Ordem de Fabricação — apontamento de etapa, produção e consumo
  'VPRO1200', // Parada de Máquina — o operador registra a parada do próprio posto
  'VPRO1000', // Ficha de Ferramenta — conferir a ferramenta antes de produzir
];

/**
 * Módulo do menu → módulo de permissão do backend (`internal/domain/acesso`).
 * Com perfil de acesso na empresa, o menu só mostra a rotina cujo módulo o
 * perfil pode consultar.
 */
export const MODULO_DE_PERMISSAO: Record<string, string> = {
  comercial: 'comercial', cliente: 'comercial', pdv: 'comercial',
  suprimento: 'suprimentos', importacao: 'suprimentos',
  inspecao: 'qualidade',
  almoxarifado: 'estoque',
  // As rotinas de beneficiamento saíram do Almoxarifado para uma pasta própria
  // e continuam sob a mesma permissão de estoque no backend.
  beneficiamento: 'estoque',
  engenharia: 'engenharia',
  planejamento: 'planejamento',
  producao: 'producao',
  manutencao: 'manutencao',
  assistencia: 'assistencia', garantia: 'assistencia',
  fiscal: 'fiscal',
  financeiro: 'financeiro',
  contabilidade: 'contabilidade',
  custo: 'custos',
  cadastros: 'cadastros',
};

/** Rotinas de uso pessoal que todo usuário abre, com qualquer perfil. */
export const ROTINAS_PESSOAIS: readonly string[] = ['VSEC0100', 'VNOT0100', 'VAPR0100'];

/** Permissões do perfil, como o menu precisa (módulos que o usuário consulta). */
export interface AcessoDoMenu { restrito: boolean; permissoes: { modulo: string; acao: string }[] }

/** As rotinas que o perfil enxerga. Perfis de escritório sem perfil de acesso enxergam tudo. */
export function screensForRole(screens: ErpScreen[], role?: string, acesso?: AcessoDoMenu | null): ErpScreen[] {
  if ((role ?? '').toUpperCase() === 'OPERATOR') {
    return screens.filter((screen) => SHOP_FLOOR_SCREENS.includes(screen.code));
  }
  if (!acesso?.restrito || (role ?? '').toUpperCase() === 'ADMIN') return screens;
  const consulta = new Set(acesso.permissoes.filter((p) => p.acao === 'LER').map((p) => p.modulo));
  return screens.filter((screen) => ROTINAS_PESSOAIS.includes(screen.code) || consulta.has(MODULO_DE_PERMISSAO[screen.module] ?? ''));
}

export const ERP_SCREENS: ErpScreen[] = [
  // ── Módulos de plataforma / novos (backend recém-exposto)
  {
    code: "VPCT0100",
    title: "Parâmetros de Compras",
    description: "Tolerâncias de quantidade, preço e total (bloqueio ou alerta) e alçadas de aprovação do pedido de compra.",
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
    code: "VPLN0100",
    title: "Pipeline de Planejamento (MRP→CRP→APS)",
    description: "Executar MRP, CRP e APS num único disparo com parecer de viabilidade, e manter parâmetros de planejamento.",
    module: "planejamento",
  },
  {
    code: "VLOT0100",
    title: "Máscaras de Lote/Série",
    description: "Compor o número de lote/série por partes (caractere/data/sequencial) e gerar o próximo lote.",
    module: "almoxarifado",
  },
  {
    code: "VAUD0100",
    title: "Histórico de Alterações",
    description: "Consultar quem realizou cada ação, quando aconteceu e qual cadastro ou processo foi afetado (somente ADMIN).",
    module: "cadastros",
  },
  {
    code: "VNOT0100",
    title: "Central de Alertas",
    description: "Configurar alertas internos, assinaturas, resumos por e-mail, histórico de entregas e reenvios.",
    module: "cadastros",
  },
  {
    code: "VEST0500",
    title: "Programação e Execução de Contagem Cíclica",
    description: "Executar a política definida no item: programar conferências, registrar quantidades, tratar divergências e aprovar.",
    module: "almoxarifado",
  },
  // ── Comercial
  // ── Produção
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
    code: "VPRO0500",
    title: "Manutenção Preventiva",
    description: "Planos de manutenção por máquina, geração das ordens, início e conclusão com as horas de parada (descontadas da capacidade) e ordens por centro de trabalho.",
    module: "manutencao",
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
    title: "Centros de Custo",
    description: "Cadastro único de centros de custo: hierarquia, responsável, aprovador de requisições, conta padrão, orçamento × realizado e árvore consolidada.",
    module: "contabilidade",
  },

  // ── Engenharia / PDM
  {
    code: "VPME0102ITE",
    title: "Calendário de Promessa de Entrega por Item",
    description: "Cadastrar dias úteis e não úteis para enchimento de tanques por item e máscara.",
    module: "engenharia",
  },
  {
    code: "VMAQ0200",
    title: "Máquinas, Tempos e Cálculo",
    description: "Cadastrar máquinas (capacidade/eficiência), tempos por item × máquina, agenda e calcular o tempo de produção (ciclos, setup, gargalo).",
    module: "engenharia",
  },
  {
    code: "VENT0200",
    title: "Cadastro de Itens",
    description: "Cadastro e manutenção de itens do estoque.",
    module: "engenharia",
  },
  {
    code: "VENT0250",
    title: "Governança do Cadastro",
    description: "Liberação do cadastro do item por área, campos obrigatórios, bloqueio, descontinuação com substituto e histórico campo a campo.",
    module: "engenharia",
  },
  {
    code: "VENT0210",
    title: "Cadastro de Estrutura de Produtos",
    description: "Realize o cadastro das estruturas dos produtos.",
    module: "engenharia",
  },
  {
    code: "VENT0202",
    title: "Roteiro de Fabricação",
    description: "Roteiros dos itens, modelos de roteiro e biblioteca de operações: etapas, centros, tempos, dependências, materiais por etapa, custo e tempo real.",
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
    title: "Demanda Independente",
    description: "Produzir ou comprar sem pedido de venda (estoque, reposição, amostra, feira, consumo interno, assistência, projeto, antecipação de venda): programação de entregas, consumo pela venda, atendimento pela saída e OF direta.",
    module: "planejamento",
  },
  {
    code: "VPLA0310",
    title: "Política de Planejamento por Item",
    description: "Estratégia (consumo pela venda ou sob encomenda), janela de consumo, horizonte firme e tempo de segurança por item ou por classificação; o que não for definido segue os parâmetros da empresa.",
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
    code: "VPRE0201",
    title: "Previsão de Vendas",
    description: "Lançar, gerar (histórico ou estatística) e comparar com o realizado a previsão de vendas; apropriação e bloqueio.",
    module: "planejamento",
  },

  // ── Assistência Técnica

  // ── Garantia
  {
    code: "VGAR0211",
    title: "Gerar Pedido de Devolução",
    description: "Gerar os pedidos de devolução.",
    module: "garantia",
  },

  // ── Cliente

  // ── Custos
  {
    code: "VCST0202",
    title: "Tabelas de Venda e Preços por Item",
    description: "Criar tabelas de venda, vincular itens, manter preços, unidades, vigência e políticas comerciais.",
    module: "comercial",
  },
  {
    code: "VCUS0200",
    title: "Margem de Contribuição",
    description: "Quanto sobra de cada venda depois de impostos, custo, despesas e do descasamento de caixa; parâmetros do mês e apuração por item e cliente.",
    module: "custo",
  },
  {
    code: "VCUS0100",
    title: "Custos — Centro, Compra, Alocação e Overhead",
    description: "Custo/hora por centro de trabalho, custo de compra por item, base de alocação, overhead e rollup do custo padrão.",
    module: "custo",
  },

  // ── PDV

  // ── Manutenção

  // ── Suprimento
  {
    code: "VPDC0200",
    title: "Pedido de Compra",
    description: "Pedido de compra completo: capa, itens, alçada, PDF e envio ao fornecedor por e-mail, acompanhamento de entregas, histórico de preço, notas por linha, previsão de pagamentos e sugestões do MRP.",
    module: "suprimento",
  },
  {
    code: "VSUP0500",
    title: "Cadastro de Fornecedor",
    description: "Cadastrar fornecedores/transportadoras: dados, endereço, pastas (telefones/emails/vencimentos/contatos/empresas), SEFAZ, auto-fill CNPJ e bloqueio.",
    module: "suprimento",
  },
  {
    code: "VSUP0110",
    title: "Unidades e Conversões",
    description: "Catálogo de unidades da empresa, sinônimos da nota fiscal, conversões padrão e conversões do item (1 CX = 12 UN, 3 M2 = 1 chapa) com vigência, encadeamento, cobertura, simulador, fator por lote e histórico.",
    module: "suprimento",
  },
  {
    code: "VSUP0120",
    title: "Tabela de Preço de Compra",
    description: "Cadastrar tabelas de preço de compra (genéricas ou por fornecedor) com vigência, moeda e itens.",
    module: "suprimento",
  },
  {
    code: "VSUP0140",
    title: "Cadastro de Transportadora",
    description: "Cadastrar o perfil de transporte do fornecedor transportadora: RNTRC/ANTT, modal, tabela de frete, seguro, frota com motorista, regiões atendidas com prazo, ocorrências de entrega e cotação comparativa de frete.",
    module: "suprimento",
  },
  {
    code: "VSUP0130",
    title: "Fornecedor Preferencial por Item",
    description: "Vincular fornecedores a um item com ranking de preferência, código/descrição/UM do item no fornecedor e lead time.",
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
    code: "VATC0100",
    title: "Base Instalada",
    description: "Equipamentos por número de série: onde estão, em que nota foram vendidos, instalação, transferência, baixa e histórico.",
    module: "assistencia",
  },
  {
    code: "VATC0300",
    title: "Ordem de Serviço",
    description: "Atendimento do chamado no cliente ou na fábrica: agenda, técnico, horas, peças do estoque, despesas, garantia e faturamento.",
    module: "assistencia",
  },
  {
    code: "VATC0310",
    title: "SLA da Assistência",
    description: "Prazo de resposta e de solução do chamado por prioridade e por cliente; painel de chamados em risco e vencidos.",
    module: "assistencia",
  },
  {
    code: "VATC0320",
    title: "Recuperação junto ao Fornecedor",
    description: "Cobrar do fornecedor o custo da garantia de componente com falha: reclamação, aceite ou recusa e ressarcimento.",
    module: "assistencia",
  },
  {
    code: "VATC0400",
    title: "Indicadores do Pós-venda",
    description: "Custo da garantia por item, defeito e lote, recuperado de fornecedores, taxa de falha, MTBF, SLA cumprido e tempo de atendimento.",
    module: "assistencia",
  },
  {
    code: "VATC0280",
    title: "Cadastro de Chamados",
    description: "Cadastrar chamados com dados do consumidor, tipo, garantia, motivo, responsável e posição.",
    module: "assistencia",
  },

  // ── Cliente
  {
    code: "VCLI0500",
    title: "Cadastro de Cliente",
    description: "Cadastrar clientes (matriz/filiais), dados fiscais, apoios vinculados, endereços, contatos e bloqueio/desbloqueio.",
    module: "cliente",
  },

  // ── Planejamento

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

  // ── Engenharia
  {
    code: "VITE0116",
    title: "Padrão Descritivo (PDM)",
    description: "Modificadores de cada grupo e modelo de atributos que gera a descrição técnica do item.",
    module: "engenharia",
  },

  // ── Suprimento (Contratos)
  {
    code: "VCON0200",
    title: "Contratos de Fornecedores",
    description: "Cadastrar contratos com fornecedores para acompanhamento de quantidades contratadas e recebidas.",
    module: "suprimento",
  },
  {
    code: "VAVR0200",
    title: "Aviso de Recebimento",
    description: "Agendar doca, informar itens esperados, acompanhar conferência e tratar divergências antes da entrada fiscal.",
    module: "suprimento",
  },

  // ── Contabilidade / Utilitários

  // ── Importação
  {
    code: "VIMP0200",
    title: "Console de Processos de Importação",
    description: "Manutenção e acompanhamento dos processos de importação, centralizando informações em um único local.",
    module: "importacao",
  },

  // ── Inspeção
  {
    code: "VINS0700",
    title: "Certificados de Qualidade",
    description: "Certificado ao cliente com lote, corrida, certificado da usina e o resumo das medições dos lotes de inspeção aprovados (PDF).",
    module: "inspecao",
  },
  {
    code: "VINS0800",
    title: "Documentos da Qualidade",
    description: "Instruções de trabalho, procedimentos e formulários com revisão, aprovação por quem não elaborou e histórico de revisões obsoletas.",
    module: "inspecao",
  },
  {
    code: "VINS0600",
    title: "Metrologia",
    description: "Instrumentos de medição, calibrações com resultado pelo erro máximo admissível, vencimentos e impacto da calibração reprovada.",
    module: "inspecao",
  },
  {
    code: "VINS0500",
    title: "Não conformidades e CAPA/8D",
    description: "Não conformidades com lote de inspeção, CAPA pelo 8D ou simples (5 porquês, Ishikawa), ações com responsável e prazo e verificação de eficácia.",
    module: "inspecao",
  },
  {
    code: "VINS0300",
    title: "Lotes de Inspeção",
    description: "Lote único de inspeção (recebimento, processo, final): resultados por unidade da amostra, avaliação NBR 5426 e decisão de uso que libera o estoque.",
    module: "inspecao",
  },
  {
    code: "VINS0110",
    title: "Amostragem NBR 5426",
    description: "Calculadora da norma, procedimentos de amostragem e severidade (normal, apertada, atenuada) por item e fornecedor.",
    module: "inspecao",
  },
  {
    code: "VINS0200",
    title: "Cadastro do Roteiro de Inspeção",
    description: "Roteiro de inspeção de recebimento por item ou classificação e planos de inspeção de processo e final com as características a medir.",
    module: "inspecao",
  },

  // ── Avaliação de Fornecedores

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
    description: "A condição de pagamento única (parcelas com percentual e evento) usada por cliente, fornecedor, orçamento, pedido e faturamento.",
    module: "financeiro",
  },
  {
    code: "VFIN0120",
    title: "Plano de Contas Gerencial",
    description: "O plano gerencial (títulos, DRE e rateio), com a conta contábil vinculada a cada conta.",
    module: "financeiro",
  },
  {
    code: "VFIN0200",
    title: "Contas a Pagar",
    description: "Lançar, aprovar, baixar e cancelar contas a pagar; rateio e visão por plano de contas; aging.",
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
    module: "fiscal",
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
    description: "Emitir NF-e de saída (avulsa ou faturando o pedido de venda): rascunho, prévia, autorização, CC-e, cancelamento.",
    module: "fiscal",
  },
  {
    code: "VFIS0210",
    title: "NF-e de Entrada",
    description: "Importar o XML da NF-e de entrada, conciliar itens com o cadastro, plano de contas por item, parcelas e aprovar.",
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
    code: "VFIS0325",
    title: "Simulador de Tributação",
    description: "Calcular ICMS, IPI, PIS/COFINS, ST e DIFAL de uma venda como a NF-e vai calcular, por cliente, UF, finalidade e tipo de nota — sem gravar nada.",
    module: "fiscal",
  },
  {
    code: "VFIS0340",
    title: "Apuração do Simples Nacional",
    description: "Apuração mensal do Simples Nacional por anexo.",
    module: "fiscal",
  },
  {
    code: "VFIS0345",
    title: "CIAP — Crédito do ICMS do Ativo",
    description: "Bens do ativo imobilizado, parcelas mensais do crédito de ICMS pelo índice das saídas, Bloco G da EFD e crédito no E111.",
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
    code: "VFIS0510",
    title: "Tabelas da Apuração de ICMS",
    description: "Códigos de ajuste (5.1.1 e 5.2 a 5.7), linhas de apuração e motivos de transferência DAPI.",
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
    title: "Central de Estoque",
    description: "Posição e ATP por situação, extrato (kardex), lançamentos com tipo e centro de custo, transferências, requisições ao almoxarifado, reservas, separação, lotes, reposição e análises (giro, cobertura, parados).",
    module: "almoxarifado",
  },
  {
    code: "VEST0200",
    title: "Inventário e Tipos de Movimento",
    description: "Inventário físico com foto do saldo, contagem e recontagem, diferenças valorizadas e fechamento que lança os ajustes; tipos de movimento com as regras do lançamento manual.",
    module: "almoxarifado",
  },
  {
    code: "VEST0150",
    title: "Coletor de Estoque",
    description: "Tela para leitor de código de barras: consulta, separação de ondas, contagem de inventário, movimentação entre endereços e etiquetas.",
    module: "almoxarifado",
  },
  // ── Vendas & Expedição (novas)
  {
    code: "VEXP0100",
    title: "Expedição / Romaneio",
    description: "Romaneios (separação, conferência, volumes e despacho) e cargas: montar com os romaneios prontos, caixa de despacho, orientações ao motorista, faturar e despachar.",
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
    description: "Registrar propostas comerciais (capa + itens), acompanhar carteira, liberar/bloquear, cancelar/descancelar com motivo, atender, anexar documentos, gerar DAV/Pré-Venda e converter o saldo aberto em pedido de venda.",
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
  // ── Fechamento funcional 2026: compras, configurador, terceiros, APS e engenharia
  { code: "VAVF0300", title: "Avaliação de Fornecedores", description: "IQF calculado do histórico, histórico de avaliações e homologação do fornecedor.", module: "inspecao" },
  { code: "VCFG0100", title: "Conjuntos e Variáveis do Configurador", description: "Conjuntos de respostas, variáveis, máscaras e traduções.", module: "engenharia" },
  // Beneficiamento — material do cliente em poder da empresa. Telas NOVAS: o
  // estoque próprio (VEST0100) segue como está. Prefixo VBEN, e não VTER, porque
  // VTER* é o sentido oposto (serviço que MANDAMOS para fora).
  { code: "VBEN0100", title: "Beneficiamento — Remessas e Retorno Fiscal", description: "Receber a NF-e de remessa do cliente (CFOP 5901) ligada ao pedido de beneficiamento, acompanhar o saldo por linha, lançar retorno, sobra e sucata, e faturar numa nota única o serviço (5124) e a devolução do material (5902/5903), com histórico e auditoria.", module: "beneficiamento" },
  { code: "VBEN0200", title: "Estoque de Terceiros — Material do Cliente", description: "Inventário do material que pertence ao cliente e está em poder da empresa, ordenado pelo prazo fiscal de retorno, e a movimentação de entrada e saída no período. Não entra na valoração do estoque próprio.", module: "beneficiamento" },
  { code: "VBEN0300", title: "Horas de Beneficiamento", description: "Horas trabalhadas nas ordens de fabricação de beneficiamento, por cliente e pedido: apontamentos e horas lançadas nas operações do roteiro.", module: "beneficiamento" },
  { code: "VSEC0100", title: "Troca de Senha", description: "Solicitar a troca da própria senha, acompanhar a aprovação e definir a nova senha; o administrador aprova ou rejeita as solicitações da empresa.", module: "cadastros" },
  { code: "VPRO1200", title: "Parada de Máquina", description: "Terminal de chão de fábrica: registrar que a máquina parou e que voltou, sem digitar horário.", module: "producao" },
  { code: "VVND0700", title: "Devolução de Venda", description: "Devolução do cliente pela NF de venda: NF-e de entrada própria ou NF do cliente, estoque de volta, abatimento, crédito, comissão e séries.", module: "comercial" },
  { code: "VVND0710", title: "Contrato de Venda", description: "Contrato de fornecimento com o cliente: itens com preço fixado, teto, vigência, programação e pedidos de chamada pelo saldo.", module: "comercial" },
  { code: "VAPR0100", title: "Aprovações", description: "Solicitações por alçada (crédito do pedido, política comercial do orçamento) e políticas de aprovação.", module: "cadastros" },
  { code: "VADM0200", title: "Perfis de Acesso", description: "Perfis da empresa com permissão por módulo e ação, e os perfis de cada usuário.", module: "cadastros" },
  { code: "VFIS0670", title: "Reforma Tributária (IBS/CBS)", description: "Alíquotas de IBS e CBS por ano, cClassTrib padrão por CFOP e tabela oficial de classificação tributária.", module: "fiscal" },
  { code: "VFIS0600", title: "SPED EFD ICMS/IPI", description: "EFD do mês gerada das notas de entrada, saída e CT-e, com a apuração do ICMS e do IPI.", module: "fiscal" },

];

export interface ErpScreen {
  code: string;
  title: string;
  description: string;
}

export const ERP_SCREENS: ErpScreen[] = [
  {
    code: "VENT0200",
    title: "Cadastro de Itens",
    description: "Cadastro e manutenção de itens do estoque.",
  },
    {
    code: "VENT0210",
    title: "Cadastro de Estrutura De Produtos",
    description: "Realize o cadastro das estruturas dos produtos",
  },
  {
    code: "VENT0204",
    title: "Cadastro de Grupo",
    description: "Cadastro e manutenção de grupos do pdm.",
  },
  {
    code: "VENT0100",
    title: "Consulta de pedido de venda",
    description: "Consultar todos os pedidos de vendas",
  },
  {
    code: "VENT0800",
    title: "Cadastro de Almoxarifado",
    description: "Cadastrar almoxarifado",
  },
  {
    code: "FCOM0100",
    title: "Painel Comercial",
    description: "Visão inicial de negociações e propostas.",
  },
  {
    code: "FFIN0300",
    title: "Resumo Financeiro",
    description: "Acompanhamento consolidado de indicadores financeiros.",
  },
];

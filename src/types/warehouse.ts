export interface LookupEntity {
  codigo: string;
  nome: string;
}

export interface WarehousePayload {
  codigo: string;
  descricao: string;
  localizacao: string;
  tipo: string;
  disponivel: boolean;
  almoxExpedicao: string;
  cliente: string;
  estabelecimento: string;
  fornecedor: string;
  observacao: string;
  clientes: LookupEntity[];
  fornecedores: LookupEntity[];
}

export interface WarehouseResponse extends WarehousePayload {
  id?: string | number;
}

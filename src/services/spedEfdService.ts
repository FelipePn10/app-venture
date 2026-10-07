import { httpClient, parseNum, parseStr, unwrapArray, unwrapObject } from '@/services/fiscalShared';

/** EFD ICMS/IPI do mês gerada das próprias notas do sistema. */

export interface SpedEfdPedido {
  ano: number;
  mes: number;
  /** 0 original, 1 substituta. */
  finalidade: '0' | '1';
  perfil: 'A' | 'B' | 'C';
  /** 0 industrial ou equiparado, 1 outros. */
  ind_atividade: '0' | '1';
  contribuinte_ipi?: boolean;
  contabilista_nome: string;
  contabilista_cpf: string;
  contabilista_crc?: string;
  contabilista_cnpj?: string;
  saldo_credor_anterior_icms: number;
  saldo_credor_anterior_ipi: number;
  cod_receita_icms?: string;
  /** AAAA-MM-DD; vazio usa o dia da configuração fiscal no mês seguinte. */
  vencimento_icms?: string;
  /** Bloco H: data do inventário (AAAA-MM-DD; em geral 31/12, na EFD de fevereiro). Vazio = sem inventário. */
  inventario_data?: string;
  /** 01 final do período, 02 mudança de tributação, 03 baixa cadastral, 04 regime de pagamento, 05 determinação dos fiscos, 06 ST. */
  inventario_motivo?: string;
}

export interface SpedEfdResumo {
  entradas: number;
  saidas: number;
  canceladas: number;
  fretes: number;
  participantes: number;
  itens: number;
  icms_debitos: number;
  icms_creditos: number;
  icms_recolher: number;
  icms_saldo_credor: number;
  ipi_debitos: number;
  ipi_creditos: number;
  linhas: number;
  itens_inventario: number;
  valor_inventario: number;
}

export interface SpedEfdResultado {
  arquivo: string;
  nome_arquivo: string;
  resumo: SpedEfdResumo;
  avisos: string[];
}

export async function gerarEfdAutomatica(p: SpedEfdPedido): Promise<SpedEfdResultado> {
  const { data } = await httpClient.post('/api/fiscal/sped/efd/automatico', p, { timeout: 120000 });
  const o = unwrapObject(data);
  const r = unwrapObject(o['resumo']);
  const n = (k: string) => parseNum(r, k);
  return {
    arquivo: parseStr(o, 'arquivo'),
    nome_arquivo: parseStr(o, 'nome_arquivo') || 'EFD_ICMS_IPI.txt',
    avisos: unwrapArray(o['avisos']).map(String),
    resumo: {
      entradas: n('entradas'), saidas: n('saidas'), canceladas: n('canceladas'), fretes: n('fretes'),
      participantes: n('participantes'), itens: n('itens'),
      icms_debitos: n('icms_debitos'), icms_creditos: n('icms_creditos'), icms_recolher: n('icms_recolher'),
      icms_saldo_credor: n('icms_saldo_credor'), ipi_debitos: n('ipi_debitos'), ipi_creditos: n('ipi_creditos'),
      linhas: n('linhas'), itens_inventario: n('itens_inventario'), valor_inventario: n('valor_inventario'),
    },
  };
}

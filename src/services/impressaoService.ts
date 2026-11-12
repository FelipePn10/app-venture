import { downloadResponse } from '@/services/fileDownload';
import { httpClient } from '@/services/fiscalShared';

/**
 * Documentos impressos — `/api/impressao/*`.
 *
 * Cada documento tem o layout próprio no backend (pedido de venda, proposta,
 * espelho da NF de entrada, títulos, plano de materiais, capacidade,
 * programação, kardex, custo de produção, romaneio, cotação). Aqui só se pede
 * o PDF e se dispara o download com o aviso de conclusão.
 *
 * Com `responseType: 'blob'` o corpo de erro também chega como Blob: o erro é
 * relido como JSON para a tela mostrar a mensagem do backend.
 */

const BASE = '/api/impressao';

type Params = Record<string, string | number | boolean | undefined | null>;

function limpar(params?: Params): Record<string, string> | undefined {
  if (!params) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || v === false) continue;
    out[k] = String(v);
  }
  return out;
}

async function mensagemDoBlob(e: unknown): Promise<Error> {
  const data = (e as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text()) as { error?: string; message?: string };
      const msg = parsed.error ?? parsed.message;
      if (msg) return new Error(msg);
    } catch {
      /* corpo não era JSON: cai no erro original */
    }
  }
  return e instanceof Error ? e : new Error('Não foi possível gerar o PDF.');
}

/** Baixa um PDF do backend; devolve o nome do arquivo salvo. */
export async function baixarPdf(path: string, fallback: string, params?: Params): Promise<string> {
  try {
    const resp = await httpClient.get(path, { params: limpar(params), responseType: 'blob' });
    return downloadResponse(resp.data as Blob, resp.headers as Record<string, unknown>, fallback);
  } catch (e) {
    throw await mensagemDoBlob(e);
  }
}

/** AAAA-MM-DD a partir de Date ou string já nesse formato. */
const dia = (v?: string | Date | null): string | undefined => {
  if (!v) return undefined;
  if (typeof v === 'string') return v.slice(0, 10);
  return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
};

// ── Comercial ───────────────────────────────────────────────────────────────
export const imprimirPedidoVenda = (code: number) => baixarPdf(`${BASE}/pedido-venda/${code}`, `pedido-venda-${code}.pdf`);
export const imprimirProposta = (code: number) => baixarPdf(`${BASE}/proposta/${code}`, `proposta-${code}.pdf`);

// ── Fiscal / suprimentos ────────────────────────────────────────────────────
export const imprimirEspelhoEntrada = (id: number) => baixarPdf(`${BASE}/nota-entrada/${id}`, `nf-entrada-${id}.pdf`);
/** Sem fornecedor: mapa comparativo; com fornecedor: a solicitação para ele. */
export const imprimirCotacao = (code: number, fornecedor?: number) =>
  baixarPdf(`${BASE}/cotacao/${code}`, fornecedor ? `cotacao-${code}-fornecedor-${fornecedor}.pdf` : `mapa-cotacao-${code}.pdf`, { fornecedor });

// ── Financeiro ──────────────────────────────────────────────────────────────
export interface FiltroTitulosPdf {
  parte?: number;
  nota?: number;
  de?: string | Date | null;
  ate?: string | Date | null;
  abertos?: boolean;
}
export const imprimirContasReceber = (f: FiltroTitulosPdf = {}) =>
  baixarPdf(`${BASE}/contas-receber`, 'contas-a-receber.pdf', { cliente: f.parte, nota: f.nota, de: dia(f.de), ate: dia(f.ate), abertos: f.abertos });
export const imprimirContasPagar = (f: FiltroTitulosPdf = {}) =>
  baixarPdf(`${BASE}/contas-pagar`, 'contas-a-pagar.pdf', { fornecedor: f.parte, nota: f.nota, de: dia(f.de), ate: dia(f.ate), abertos: f.abertos });

// ── Planejamento e produção ─────────────────────────────────────────────────
export const imprimirPlanoMateriais = (plano: number) => baixarPdf(`${BASE}/plano-materiais/${plano}`, `plano-materiais-${plano}.pdf`);
export const imprimirCapacidade = (plano: number) => baixarPdf(`${BASE}/capacidade/${plano}`, `capacidade-plano-${plano}.pdf`);
export const imprimirProgramacao = (f: { de?: string | Date | null; ate?: string | Date | null; grupo?: number | null } = {}) =>
  baixarPdf(`${BASE}/programacao`, 'programacao-producao.pdf', { de: dia(f.de), ate: dia(f.ate), grupo: f.grupo });
export const imprimirCustoProducao = (f: { ordens?: number[]; de?: string | Date | null; ate?: string | Date | null } = {}) =>
  baixarPdf(`${BASE}/custo-producao`, 'custo-producao.pdf', { ordens: f.ordens?.join(','), de: dia(f.de), ate: dia(f.ate) });

// ── Estoque e expedição ─────────────────────────────────────────────────────
export const imprimirKardex = (f: { item?: string; deposito?: number | null; de?: string | Date | null; ate?: string | Date | null } = {}) =>
  baixarPdf(`${BASE}/kardex`, 'kardex.pdf', { item: f.item?.trim(), deposito: f.deposito, de: dia(f.de), ate: dia(f.ate) });
export const imprimirRomaneio = (code: number) => baixarPdf(`${BASE}/romaneio/${code}`, `romaneio-${code}.pdf`);

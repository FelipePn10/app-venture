import axios from 'axios';
import { parseNum, parseStr, unwrapArray, unwrapObject, type Obj } from '@/services/fiscalShared';
import { carregarCatalogo, urlDaApiAtiva } from '@/services/tenantDirectory';

/**
 * Cliente HTTP do Portal do Cliente: sem sessão de usuário do ERP — a credencial
 * é o token do link, que vai no caminho. Instância própria para não levar o
 * token de quem estiver logado no mesmo navegador.
 */
const portal = axios.create({ timeout: 20000, headers: { 'Content-Type': 'application/json' } });
// O cliente abre o link num navegador qualquer, sem empresa escolhida: a API vem
// da empresa escrita no link, procurada no catálogo publicado (nunca um endereço
// livre no link — isso deixaria montar um portal falso com a cara do ERP).
let apiDoLink: string | null = null;
export async function definirEmpresaDoLink(empresa?: string): Promise<void> {
  apiDoLink = null;
  if (!empresa || import.meta.env.DEV) return;
  const t = (await carregarCatalogo()).tenants.find((x) => x.id === empresa);
  if (!t) throw new Error('link inválido ou vencido: peça um novo à empresa');
  apiDoLink = t.apiUrl;
}
portal.interceptors.request.use((c) => { c.baseURL = apiDoLink || urlDaApiAtiva() || undefined; return c; });
portal.interceptors.response.use((r) => r, (e) => {
  const corpo = e?.response?.data;
  const msg = typeof corpo === 'string' ? corpo : corpo?.error ?? corpo?.message;
  if (typeof msg === 'string' && msg.trim()) e.message = msg.trim();
  return Promise.reject(e);
});

export interface LinhaPortal { item: string; description: string; mask?: string; uom?: string; quantity: number; delivered: number; unit_price: number; total: number; delivery_date?: string; to_be_priced?: boolean }
export interface NotaPortal { id: number; number: number; series?: string; key: string; issued_at: string; value: number; status: string; documents_available: boolean }
export interface TituloPortal { document: string; installment?: string; due_date: string; value: number; balance: number; status: string; digitable_line?: string; pix_copy_paste?: string }
export interface EntregaPortal { shipment: number; status: string; shipped_at?: string; carrier?: string; invoice_number?: number }
export interface PedidoPortal {
  code: number; number: number; status: string; issued_at?: string; delivery_date?: string; total: number; customer_po?: string; origin?: string;
  payment_terms?: string; freight?: string; carrier?: string; delivery_address?: string; note?: string;
  lines: LinhaPortal[]; invoices: NotaPortal[]; installments: TituloPortal[]; shipments: EntregaPortal[];
}
export interface ResumoPortal { company: string; customer: string; link_expires_at: string; orders: PedidoPortal[]; open_balance: number; overdue_balance: number }

const n = (o: Obj, k: string) => Number(parseStr(o, k) || 0);
const s_ = (o: Obj, k: string) => parseStr(o, k) || undefined;
const lista = (v: unknown) => unwrapArray(v ?? []).map(unwrapObject);

export async function abrirPortal(token: string): Promise<ResumoPortal> {
  const o = unwrapObject((await portal.get(`/api/portal/${encodeURIComponent(token)}`)).data);
  return {
    company: parseStr(o, 'company'), customer: parseStr(o, 'customer'), link_expires_at: parseStr(o, 'link_expires_at'),
    open_balance: n(o, 'open_balance'), overdue_balance: n(o, 'overdue_balance'),
    orders: lista(o.orders).map((p) => ({
      code: parseNum(p, 'code'), number: parseNum(p, 'number'), status: parseStr(p, 'status'), issued_at: s_(p, 'issued_at'),
      delivery_date: s_(p, 'delivery_date'), total: n(p, 'total'), customer_po: s_(p, 'customer_po'), origin: s_(p, 'origin'),
      payment_terms: s_(p, 'payment_terms'), freight: s_(p, 'freight'), carrier: s_(p, 'carrier'), delivery_address: s_(p, 'delivery_address'), note: s_(p, 'note'),
      lines: lista(p.lines).map((l) => ({ item: parseStr(l, 'item'), description: parseStr(l, 'description'), mask: s_(l, 'mask'), uom: s_(l, 'uom'),
        quantity: n(l, 'quantity'), delivered: n(l, 'delivered'), unit_price: n(l, 'unit_price'), total: n(l, 'total'), delivery_date: s_(l, 'delivery_date'), to_be_priced: l.to_be_priced === true })),
      invoices: lista(p.invoices).map((x) => ({ id: parseNum(x, 'id'), number: parseNum(x, 'number'), series: s_(x, 'series'), key: parseStr(x, 'key'),
        issued_at: parseStr(x, 'issued_at'), value: n(x, 'value'), status: parseStr(x, 'status'), documents_available: x.documents_available === true })),
      installments: lista(p.installments).map((t) => ({ document: parseStr(t, 'document'), installment: s_(t, 'installment'), due_date: parseStr(t, 'due_date'),
        value: n(t, 'value'), balance: n(t, 'balance'), status: parseStr(t, 'status'), digitable_line: s_(t, 'digitable_line'), pix_copy_paste: s_(t, 'pix_copy_paste') })),
      shipments: lista(p.shipments).map((e) => ({ shipment: parseNum(e, 'shipment'), status: parseStr(e, 'status'), shipped_at: s_(e, 'shipped_at'),
        carrier: s_(e, 'carrier'), invoice_number: parseNum(e, 'invoice_number') || undefined })),
    })),
  };
}

/** Baixa a DANFE (pdf) ou o XML da nota; o erro vem como mensagem legível. */
export async function baixarDocumento(token: string, nota: NotaPortal, tipo: 'danfe' | 'xml'): Promise<void> {
  try {
    const r = await portal.get(`/api/portal/${encodeURIComponent(token)}/notas/${nota.id}/${tipo}`, { responseType: 'blob', timeout: 60000 });
    const url = URL.createObjectURL(r.data as Blob);
    const a = document.createElement('a');
    a.href = url; a.download = `NF-e ${nota.number}.${tipo === 'xml' ? 'xml' : 'pdf'}`; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (e) {
    const blob = (e as { response?: { data?: Blob } })?.response?.data;
    if (blob instanceof Blob) {
      try { const j = JSON.parse(await blob.text()) as { error?: string }; if (j.error) throw new Error(j.error); } catch (x) { if (x instanceof Error && x.message) throw x; }
    }
    throw new Error('Não foi possível baixar o documento agora. Tente de novo em instantes.');
  }
}

export async function pedirDeNovo(token: string, pedido: number, note: string): Promise<{ order_number: number; lines: number; skipped: string[] }> {
  const o = unwrapObject((await portal.post(`/api/portal/${encodeURIComponent(token)}/pedidos/${pedido}/repetir`, { note })).data);
  return { order_number: parseNum(o, 'order_number'), lines: parseNum(o, 'lines'), skipped: unwrapArray(o.skipped ?? []).map(String) };
}

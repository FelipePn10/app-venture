import { httpClient, unwrapObject, parseStr } from '@/services/fiscalShared';
import { invalidarListas } from '@/services/lookupInvalidation';
import { CHAVE_NOME_CLIENTE, nomeClientePreferido, type NomeCliente } from '@/utils/nomeCliente';

/**
 * Preferências de exibição do usuário (`/api/acesso/minhas-preferencias`).
 *
 * Gravadas no servidor (valem em qualquer computador) e espelhadas no
 * armazenamento local: cada rotina abre na própria janela, e todas leem o
 * mesmo armazenamento. Ao mudar, `invalidarListas` faz cada janela recarregar
 * os campos de busca já com o nome novo.
 */

export { nomeClientePreferido, nomeDoCliente, type NomeCliente } from '@/utils/nomeCliente';

const BASE = '/api/acesso/minhas-preferencias';

function guardarLocal(v: NomeCliente): boolean {
  const antes = nomeClientePreferido();
  try { localStorage.setItem(CHAVE_NOME_CLIENTE, v); } catch { /* sem armazenamento: vale a partir da próxima leitura do servidor */ }
  return antes !== v;
}

/** Lê a preferência do servidor e atualiza as listas se ela mudou. */
export async function sincronizarPreferencias(): Promise<NomeCliente> {
  const { data } = await httpClient.get(BASE);
  const v: NomeCliente = parseStr(unwrapObject(data), 'customer_name_display') === 'FANTASIA' ? 'FANTASIA' : 'RAZAO_SOCIAL';
  if (guardarLocal(v)) invalidarListas();
  return v;
}

/** Grava a preferência no servidor e recarrega os campos de busca abertos. */
export async function definirNomeCliente(v: NomeCliente): Promise<void> {
  await httpClient.put(BASE, { customer_name_display: v });
  guardarLocal(v);
  invalidarListas();
}

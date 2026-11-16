/** Nome do cliente nas buscas: razão social ou fantasia, pela preferência do usuário. */

export type NomeCliente = 'RAZAO_SOCIAL' | 'FANTASIA';

export const CHAVE_NOME_CLIENTE = 'venture:pref:nome-cliente';

/** O que os campos de cliente mostram como nome. Sem preferência: razão social. */
export function nomeClientePreferido(): NomeCliente {
  try {
    return localStorage.getItem(CHAVE_NOME_CLIENTE) === 'FANTASIA' ? 'FANTASIA' : 'RAZAO_SOCIAL';
  } catch {
    return 'RAZAO_SOCIAL';
  }
}

/**
 * Nome do cliente conforme a preferência; sem o preferido, o outro. `outro` é o
 * nome que não foi escolhido, para aparecer como detalhe e entrar na busca.
 */
export function nomeDoCliente(c: { name?: string; trade_name?: string }, fallback = ''): { nome: string; outro: string } {
  const razao = (c.name ?? '').trim();
  const fantasia = (c.trade_name ?? '').trim();
  const [principal, secundario] = nomeClientePreferido() === 'FANTASIA' ? [fantasia, razao] : [razao, fantasia];
  const nome = principal || secundario || fallback;
  return { nome, outro: nome === secundario || secundario === principal ? '' : secundario };
}

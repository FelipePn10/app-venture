// Nome do cliente nas buscas: razão social ou fantasia, pela preferência.
const mem = new Map();
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) };
const { nomeDoCliente, nomeClientePreferido, CHAVE_NOME_CLIENTE } = await import('../src/utils/nomeCliente.ts');

const falhar = (m) => { throw new Error(m); };
const c = { name: 'METALURGICA EXEMPLO LTDA', trade_name: 'Exemplo' };

if (nomeClientePreferido() !== 'RAZAO_SOCIAL') falhar('padrão deve ser razão social');
let r = nomeDoCliente(c);
if (r.nome !== c.name || r.outro !== 'Exemplo') falhar(`razão social: ${JSON.stringify(r)}`);

localStorage.setItem(CHAVE_NOME_CLIENTE, 'FANTASIA');
r = nomeDoCliente(c);
if (r.nome !== 'Exemplo' || r.outro !== c.name) falhar(`fantasia: ${JSON.stringify(r)}`);
r = nomeDoCliente({ name: 'SEM FANTASIA LTDA', trade_name: '  ' });
if (r.nome !== 'SEM FANTASIA LTDA' || r.outro !== '') falhar(`sem fantasia cai na razão social: ${JSON.stringify(r)}`);
r = nomeDoCliente({ name: 'IGUAL', trade_name: 'IGUAL' });
if (r.outro !== '') falhar('nomes iguais não repetem no detalhe');
r = nomeDoCliente({}, 'Cliente 9');
if (r.nome !== 'Cliente 9') falhar('sem nome usa o fallback');

globalThis.localStorage = { getItem: () => { throw new Error('bloqueado'); } };
if (nomeClientePreferido() !== 'RAZAO_SOCIAL') falhar('armazenamento bloqueado volta ao padrão');
console.log('nome do cliente: ok');

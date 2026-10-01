#!/usr/bin/env node
/**
 * Testes da descoberta de empresa por e-mail (`src/services/tenantDirectory.ts`).
 *
 * O módulo lê `import.meta.env`, que só existe depois da substituição do vite.
 * Em vez de importar o `.ts` cru, cada cenário é compilado com esbuild aplicando
 * as MESMAS substituições do build — é o que torna o teste fiel ao artefato
 * publicado, inclusive no caso em que o endereço vem fixado no build.
 *
 * `window.localStorage` e `fetch` são substituídos por dublês, para que o
 * comportamento sem rede e com disco bloqueado seja exercitado de verdade.
 *
 * Uso: node scripts/test-tenant-directory.mjs
 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const FONTE = new URL('../src/services/tenantDirectory.ts', import.meta.url).pathname;
const TMP = mkdtempSync(join(tmpdir(), 'tenant-dir-'));
let bundleSeq = 0;

/** Compila o módulo com as substituições do vite e devolve o módulo importado. */
async function carregarModulo({ apiUrl = '', diretorioUrl = 'https://catalogo.test/tenants.json', dev = false } = {}) {
  const saida = join(TMP, `bundle-${bundleSeq++}.mjs`);
  await build({
    entryPoints: [FONTE],
    outfile: saida,
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    logLevel: 'silent',
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
      'import.meta.env.VITE_TENANT_DIRECTORY_URL': JSON.stringify(diretorioUrl),
      'import.meta.env.DEV': JSON.stringify(dev),
    },
  });
  // `?v=` evita o cache de módulos entre cenários.
  return import(`${pathToFileURL(saida).href}?v=${bundleSeq}`);
}

/** Disco em memória, com a opção de falhar como janela privada falha. */
function instalarDisco({ bloqueado = false, inicial = {} } = {}) {
  const dados = new Map(Object.entries(inicial));
  const storage = {
    getItem(k) {
      if (bloqueado) throw new Error('site data bloqueado');
      return dados.has(k) ? dados.get(k) : null;
    },
    setItem(k, v) {
      if (bloqueado) throw new Error('site data bloqueado');
      dados.set(k, String(v));
    },
    removeItem(k) {
      if (bloqueado) throw new Error('site data bloqueado');
      dados.delete(k);
    },
  };
  globalThis.window = { localStorage: storage };
  return dados;
}

function instalarRede(resposta) {
  const chamadas = [];
  globalThis.fetch = async (url) => {
    chamadas.push(String(url));
    if (resposta === 'falha') throw new Error('sem rede');
    if (resposta === 'erro-http') return { ok: false, status: 503, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => resposta };
  };
  return chamadas;
}

const CATALOGO = {
  defaultApiUrl: 'https://api.venturerp.com',
  tenants: [
    {
      id: 'usimac',
      name: 'Usimac Usinagem',
      apiUrl: 'https://usimac.api.venturerp.com',
      emailDomains: ['usimacusinagem.com.br'],
    },
    {
      id: 'tecnofer',
      name: 'Tecnofer',
      apiUrl: 'https://api.venturerp.com',
      emailDomains: ['tecnofer.com.br'],
    },
  ],
};

const checks = [];
async function it(label, fn) {
  try {
    await fn();
    checks.push({ label, ok: true });
  } catch (e) {
    checks.push({ label, ok: false, detail: e.message });
  }
}

// ── domínio → empresa ────────────────────────────────────────────────────────

await it('e-mail da Usimac vai para a API da Usimac', async () => {
  instalarDisco();
  instalarRede(CATALOGO);
  const m = await carregarModulo();
  const r = await m.resolverTenantPorEmail('compras@usimacusinagem.com.br');
  assert.equal(r.apiUrl, 'https://usimac.api.venturerp.com');
  assert.equal(r.tenant.id, 'usimac');
  assert.equal(r.fixadoNoBuild, false);
});

await it('maiúsculas e espaços no e-mail não mudam o destino', async () => {
  instalarDisco();
  instalarRede(CATALOGO);
  const m = await carregarModulo();
  const r = await m.resolverTenantPorEmail('  COMPRAS@UsimacUsinagem.COM.BR  ');
  assert.equal(r.tenant.id, 'usimac');
});

await it('subdomínio do e-mail ainda casa com o domínio da empresa', async () => {
  instalarDisco();
  instalarRede(CATALOGO);
  const m = await carregarModulo();
  const r = await m.resolverTenantPorEmail('nfe@mail.usimacusinagem.com.br');
  assert.equal(r.tenant.id, 'usimac');
});

await it('entre dois domínios que casam, vence o mais específico', async () => {
  instalarDisco();
  instalarRede({
    defaultApiUrl: 'https://api.venturerp.com',
    tenants: [
      { id: 'grupo', name: 'Grupo', apiUrl: 'https://grupo.api.venturerp.com', emailDomains: ['grupo.com.br'] },
      { id: 'filial', name: 'Filial', apiUrl: 'https://filial.api.venturerp.com', emailDomains: ['fab.grupo.com.br'] },
    ],
  });
  const m = await carregarModulo();
  const r = await m.resolverTenantPorEmail('pessoa@fab.grupo.com.br');
  assert.equal(r.tenant.id, 'filial', 'o domínio genérico capturou o específico');
});

await it('domínio desconhecido cai no servidor padrão, sem erro', async () => {
  instalarDisco();
  instalarRede(CATALOGO);
  const m = await carregarModulo();
  const r = await m.resolverTenantPorEmail('alguem@empresa-nova.com.br');
  assert.equal(r.apiUrl, 'https://api.venturerp.com');
  assert.equal(r.tenant, null);
});

await it('e-mail sem @ não derruba a resolução', async () => {
  instalarDisco();
  instalarRede(CATALOGO);
  const m = await carregarModulo();
  const r = await m.resolverTenantPorEmail('felipe');
  assert.equal(r.apiUrl, 'https://api.venturerp.com');
  assert.equal(r.tenant, null);
});

// ── endereço fixado no build ─────────────────────────────────────────────────

await it('endereço fixado no build vence o catálogo (demo/treinamento)', async () => {
  instalarDisco();
  const chamadas = instalarRede(CATALOGO);
  const m = await carregarModulo({ apiUrl: 'https://dev-api.venturerp.com' });
  const r = await m.resolverTenantPorEmail('compras@usimacusinagem.com.br');
  assert.equal(r.apiUrl, 'https://dev-api.venturerp.com');
  assert.equal(r.fixadoNoBuild, true);
  assert.equal(chamadas.length, 0, 'não deveria nem buscar o catálogo');
});

await it('com endereço fixado, gravar a empresa ativa é inócuo', async () => {
  const disco = instalarDisco();
  instalarRede(CATALOGO);
  const m = await carregarModulo({ apiUrl: 'https://dev-api.venturerp.com' });
  m.definirTenantAtivo(await m.resolverTenantPorEmail('compras@usimacusinagem.com.br'));
  assert.equal(disco.has('erp-tenant-ativo'), false);
  assert.equal(m.urlDaApiAtiva(), 'https://dev-api.venturerp.com');
});

// ── catálogo hostil ou corrompido ────────────────────────────────────────────

await it('recusa endereço que não seja https', async () => {
  instalarDisco();
  instalarRede({
    defaultApiUrl: 'https://api.venturerp.com',
    tenants: [{ id: 'x', name: 'X', apiUrl: 'http://api.venturerp.com', emailDomains: ['x.com.br'] }],
  });
  const m = await carregarModulo();
  const r = await m.resolverTenantPorEmail('a@x.com.br');
  assert.equal(r.tenant, null, 'um endereço http foi aceito');
  assert.equal(r.apiUrl, 'https://api.venturerp.com');
});

await it('recusa endereço com caminho, credencial ou query', async () => {
  for (const ruim of [
    'https://api.venturerp.com/roubado',
    'https://usuario:senha@api.venturerp.com',
    'https://api.venturerp.com/?x=1',
  ]) {
    instalarDisco();
    instalarRede({
      defaultApiUrl: 'https://api.venturerp.com',
      tenants: [{ id: 'x', name: 'X', apiUrl: ruim, emailDomains: ['x.com.br'] }],
    });
    const m = await carregarModulo();
    const r = await m.resolverTenantPorEmail('a@x.com.br');
    assert.equal(r.tenant, null, `endereço aceito indevidamente: ${ruim}`);
  }
});

await it('catálogo sem nada aproveitável cai na lista embutida', async () => {
  instalarDisco();
  instalarRede({ lixo: true });
  const m = await carregarModulo();
  const r = await m.resolverTenantPorEmail('compras@usimacusinagem.com.br');
  assert.equal(r.apiUrl, 'https://usimac.api.venturerp.com', 'a lista embutida não foi usada');
});

// ── rede e disco indisponíveis ───────────────────────────────────────────────

await it('sem rede e sem cache, a lista embutida responde', async () => {
  instalarDisco();
  instalarRede('falha');
  const m = await carregarModulo();
  const r = await m.resolverTenantPorEmail('compras@usimacusinagem.com.br');
  assert.equal(r.apiUrl, 'https://usimac.api.venturerp.com');
});

await it('erro HTTP no catálogo não impede o login', async () => {
  instalarDisco();
  instalarRede('erro-http');
  const m = await carregarModulo();
  const r = await m.resolverTenantPorEmail('alguem@desconhecida.com.br');
  assert.equal(r.apiUrl, 'https://api.venturerp.com');
});

await it('sem rede, o catálogo guardado no disco prevalece sobre o embutido', async () => {
  const guardado = {
    buscadoEm: Date.now() - 10 * 24 * 60 * 60 * 1000, // vencido: força buscar
    catalogo: {
      defaultApiUrl: 'https://api.venturerp.com',
      tenants: [
        { id: 'usimac', name: 'Usimac', apiUrl: 'https://novo.api.venturerp.com', emailDomains: ['usimacusinagem.com.br'] },
      ],
    },
  };
  instalarDisco({ inicial: { 'erp-tenant-catalogo': JSON.stringify(guardado) } });
  instalarRede('falha');
  const m = await carregarModulo();
  const r = await m.resolverTenantPorEmail('compras@usimacusinagem.com.br');
  assert.equal(r.apiUrl, 'https://novo.api.venturerp.com', 'ignorou o catálogo guardado');
});

await it('catálogo recente no disco evita ida à rede', async () => {
  const guardado = { buscadoEm: Date.now(), catalogo: CATALOGO };
  instalarDisco({ inicial: { 'erp-tenant-catalogo': JSON.stringify(guardado) } });
  const chamadas = instalarRede(CATALOGO);
  const m = await carregarModulo();
  await m.resolverTenantPorEmail('compras@usimacusinagem.com.br');
  assert.equal(chamadas.length, 0, 'buscou o catálogo tendo cópia recente');
});

await it('disco bloqueado (janela privada) não impede resolver a empresa', async () => {
  instalarDisco({ bloqueado: true });
  instalarRede(CATALOGO);
  const m = await carregarModulo();
  const r = await m.resolverTenantPorEmail('compras@usimacusinagem.com.br');
  assert.equal(r.apiUrl, 'https://usimac.api.venturerp.com');
  // Gravar também não pode explodir.
  m.definirTenantAtivo(r);
});

// ── empresa ativa gravada ────────────────────────────────────────────────────

await it('grava e relê a empresa ativa, e é ela que o cliente HTTP usa', async () => {
  instalarDisco();
  instalarRede(CATALOGO);
  const m = await carregarModulo();
  const r = await m.resolverTenantPorEmail('compras@usimacusinagem.com.br');
  m.definirTenantAtivo(r);
  assert.equal(m.lerTenantAtivo().name, 'Usimac Usinagem');
  assert.equal(m.urlDaApiAtiva(), 'https://usimac.api.venturerp.com');
});

await it('empresa ativa adulterada no disco é descartada', async () => {
  instalarDisco({
    inicial: {
      'erp-tenant-ativo': JSON.stringify({ id: 'x', name: 'X', apiUrl: 'http://servidor-do-atacante.test' }),
    },
  });
  instalarRede(CATALOGO);
  const m = await carregarModulo();
  assert.equal(m.lerTenantAtivo(), null, 'endereço adulterado foi aceito');
  // O que importa não é o valor devolvido, é que NÃO seja o do atacante: o
  // descarte tem de levar ao padrão seguro, nunca ao host gravado no disco.
  const destino = m.urlDaApiAtiva();
  assert.ok(!destino.includes('atacante'), 'o cliente HTTP usaria o endereço adulterado');
  assert.equal(destino, 'https://api.venturerp.com');
});

await it('esquecer a empresa ativa volta o app ao estado inicial', async () => {
  instalarDisco();
  instalarRede(CATALOGO);
  const m = await carregarModulo();
  m.definirTenantAtivo(await m.resolverTenantPorEmail('compras@usimacusinagem.com.br'));
  m.esquecerTenantAtivo();
  assert.equal(m.lerTenantAtivo(), null);
  // Sem empresa gravada, produção volta ao padrão do catálogo — não a vazio,
  // que mandaria as requisições para a própria origem do WebView.
  assert.equal(m.urlDaApiAtiva(), 'https://api.venturerp.com');
});

await it('barra final no endereço do catálogo não gera // nas requisições', async () => {
  instalarDisco();
  instalarRede({
    defaultApiUrl: 'https://api.venturerp.com/',
    tenants: [
      { id: 'usimac', name: 'Usimac', apiUrl: 'https://usimac.api.venturerp.com/', emailDomains: ['usimacusinagem.com.br'] },
    ],
  });
  const m = await carregarModulo();
  const r = await m.resolverTenantPorEmail('compras@usimacusinagem.com.br');
  assert.equal(r.apiUrl, 'https://usimac.api.venturerp.com');
});

// ── atualização de quem já estava logado ─────────────────────────────────────

await it('sessão antiga sem empresa gravada não fica sem endereço em produção', async () => {
  // É o cenário da atualização: o app novo abre com a sessão da versão anterior,
  // que nunca gravou empresa. Vazio aqui mandaria tudo para a origem do WebView.
  instalarDisco();
  instalarRede(CATALOGO);
  const m = await carregarModulo({ dev: false });
  assert.equal(m.lerTenantAtivo(), null);
  assert.equal(m.urlDaApiAtiva(), 'https://api.venturerp.com');
});

await it('no servidor de desenvolvimento, sem empresa gravada, usa a mesma origem', async () => {
  // Cair no padrão aqui faria o desenvolvimento conversar com produção.
  instalarDisco();
  instalarRede(CATALOGO);
  const m = await carregarModulo({ dev: true });
  assert.equal(m.urlDaApiAtiva(), '');
});

await it('padrão do catálogo guardado prevalece sobre o embutido', async () => {
  const guardado = {
    buscadoEm: Date.now(),
    catalogo: { defaultApiUrl: 'https://novo-padrao.venturerp.com', tenants: [] },
  };
  instalarDisco({ inicial: { 'erp-tenant-catalogo': JSON.stringify(guardado) } });
  instalarRede(CATALOGO);
  const m = await carregarModulo({ dev: false });
  assert.equal(m.urlDaApiAtiva(), 'https://novo-padrao.venturerp.com');
});

await it('empresa gravada vence o padrão', async () => {
  instalarDisco();
  instalarRede(CATALOGO);
  const m = await carregarModulo({ dev: false });
  m.definirTenantAtivo(await m.resolverTenantPorEmail('compras@usimacusinagem.com.br'));
  assert.equal(m.urlDaApiAtiva(), 'https://usimac.api.venturerp.com');
});

// ── o catálogo que vamos publicar de verdade ─────────────────────────────────

await it('portal/tenants.json é aceito pelo validador do app', async () => {
  const bruto = JSON.parse(readFileSync(new URL('../portal/tenants.json', import.meta.url), 'utf8'));
  instalarDisco();
  const chamadas = instalarRede(bruto);
  const m = await carregarModulo();
  // Todo tenant declarado precisa ser alcançável pelo seu próprio domínio; um
  // apiUrl recusado pelo validador faria o cliente cair no servidor da outra
  // empresa sem nenhum aviso.
  for (const tenant of bruto.tenants) {
    for (const dominio of tenant.emailDomains) {
      const r = await m.resolverTenantPorEmail(`pessoa@${dominio}`);
      assert.equal(r.tenant?.id, tenant.id, `o catálogo publicado não resolve ${dominio}`);
      assert.equal(r.apiUrl, tenant.apiUrl.replace(/\/+$/, ''));
    }
  }
  assert.ok(chamadas.length > 0);
  const padrao = await m.resolverTenantPorEmail('alguem@dominio-nao-listado.test');
  assert.equal(padrao.apiUrl, bruto.defaultApiUrl.replace(/\/+$/, ''), 'defaultApiUrl foi recusado');
});

// ── relatório ────────────────────────────────────────────────────────────────

let falhas = 0;
for (const c of checks) {
  if (c.ok) {
    console.log(`  ✓ ${c.label}`);
  } else {
    falhas++;
    console.log(`  ✗ ${c.label}\n      ${c.detail}`);
  }
}
console.log(`\n${checks.length - falhas}/${checks.length} verificações passaram`);
process.exit(falhas === 0 ? 0 : 1);

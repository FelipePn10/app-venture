/**
 * Descoberta da empresa a partir do e-mail.
 *
 * O instalador é um só para todos os clientes. Quem decide a qual servidor o app
 * se conecta é o domínio do e-mail digitado no login: `usimacusinagem.com.br` vai
 * para a API da Usimac, e assim por diante. Antes disso o endereço da API era
 * fixado no build, então cada cliente exigiria um instalador próprio.
 *
 * O catálogo é um JSON publicado em domínio da Venture. Ele é buscado no primeiro
 * login, guardado no disco e revalidado de tempo em tempo; se a rede falhar, vale
 * a cópia guardada e, na falta dela, a lista embutida no app. Assim um cliente
 * novo entra publicando uma linha no catálogo, sem nova versão do desktop.
 *
 * Domínio desconhecido NÃO é erro: cai no servidor padrão do catálogo. É o que
 * mantém funcionando quem já usava o sistema antes desta mudança.
 */

const DIRECTORY_URL = (
  import.meta.env.VITE_TENANT_DIRECTORY_URL ?? 'https://app.venturerp.com/tenants.json'
).trim();

/** Endereço fixado no build. Quando presente, manda em tudo: é como os ambientes
 *  de desenvolvimento, demonstração e treinamento apontam para o servidor deles. */
const PINNED_API_URL = import.meta.env.VITE_API_URL?.trim() ?? '';

const ACTIVE_TENANT_KEY = 'erp-tenant-ativo';
const DIRECTORY_CACHE_KEY = 'erp-tenant-catalogo';
/** Revalida uma vez por dia; o catálogo muda quando entra cliente, não por hora. */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 6000;

export interface Tenant {
  /** Identificador curto e estável, usado em log e em suporte (ex.: "usimac"). */
  id: string;
  /** Nome que a pessoa reconhece, mostrado na tela de login. */
  name: string;
  /** Raiz da API desta empresa (sem barra no fim). */
  apiUrl: string;
  /** Domínios de e-mail que levam a esta empresa. */
  emailDomains: string[];
}

export interface TenantDirectory {
  tenants: Tenant[];
  /** Usado quando o domínio digitado não está em nenhum tenant. */
  defaultApiUrl: string;
}

/**
 * Lista embutida: vale só na primeira abertura de uma máquina sem rede até o
 * catálogo publicado. Manter curta de propósito — a fonte de verdade é o JSON
 * publicado, não este arquivo.
 */
const FALLBACK_DIRECTORY: TenantDirectory = {
  defaultApiUrl: 'https://api.venturerp.com',
  tenants: [
    {
      id: 'usimac',
      name: 'Usimac Usinagem',
      apiUrl: 'https://usimac.api.venturerp.com',
      emailDomains: ['usimacusinagem.com.br'],
    },
  ],
};

function lerLocal(chave: string): string | null {
  try {
    return window.localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravarLocal(chave: string, valor: string): void {
  try {
    window.localStorage.setItem(chave, valor);
  } catch {
    /* janela privada ou site data bloqueado: seguir sem cache */
  }
}

function apagarLocal(chave: string): void {
  try {
    window.localStorage.removeItem(chave);
  } catch {
    /* idem */
  }
}

/** Remove a barra final para que a junção com o caminho não gere `//`. */
function normalizarUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/**
 * Só `https` é aceito, e só host — nada de caminho, usuário ou porta exótica.
 * O catálogo vem da rede: sem esta conferência, um catálogo adulterado poderia
 * apontar o app para um servidor que coleta senhas.
 */
function urlDeApiValida(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    if (parsed.search || parsed.hash) return false;
    return parsed.pathname === '/' || parsed.pathname === '';
  } catch {
    return false;
  }
}

function tenantValido(valor: unknown): valor is Tenant {
  if (!valor || typeof valor !== 'object') return false;
  const t = valor as Record<string, unknown>;
  if (typeof t.id !== 'string' || !t.id.trim()) return false;
  if (typeof t.name !== 'string' || !t.name.trim()) return false;
  if (typeof t.apiUrl !== 'string' || !urlDeApiValida(t.apiUrl)) return false;
  if (!Array.isArray(t.emailDomains)) return false;
  return t.emailDomains.every((d) => typeof d === 'string' && d.includes('.'));
}

function catalogoValido(valor: unknown): TenantDirectory | null {
  if (!valor || typeof valor !== 'object') return null;
  const bruto = valor as Record<string, unknown>;
  const lista = Array.isArray(bruto.tenants) ? bruto.tenants.filter(tenantValido) : [];
  const padrao =
    typeof bruto.defaultApiUrl === 'string' && urlDeApiValida(bruto.defaultApiUrl)
      ? normalizarUrl(bruto.defaultApiUrl)
      : '';
  if (!padrao && lista.length === 0) return null;
  return {
    defaultApiUrl: padrao || FALLBACK_DIRECTORY.defaultApiUrl,
    tenants: lista.map((t) => ({
      id: t.id.trim(),
      name: t.name.trim(),
      apiUrl: normalizarUrl(t.apiUrl),
      emailDomains: t.emailDomains.map((d) => d.trim().toLowerCase()).filter(Boolean),
    })),
  };
}

let catalogoEmMemoria: TenantDirectory | null = null;
let buscaEmAndamento: Promise<TenantDirectory> | null = null;

interface CatalogoGuardado {
  buscadoEm: number;
  catalogo: TenantDirectory;
}

function lerCatalogoGuardado(): CatalogoGuardado | null {
  const bruto = lerLocal(DIRECTORY_CACHE_KEY);
  if (!bruto) return null;
  try {
    const parsed = JSON.parse(bruto) as Partial<CatalogoGuardado>;
    const catalogo = catalogoValido(parsed.catalogo);
    if (!catalogo || typeof parsed.buscadoEm !== 'number') return null;
    return { buscadoEm: parsed.buscadoEm, catalogo };
  } catch {
    return null;
  }
}

async function buscarCatalogoPublicado(): Promise<TenantDirectory | null> {
  if (!DIRECTORY_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resposta = await fetch(DIRECTORY_URL, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!resposta.ok) return null;
    return catalogoValido(await resposta.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Devolve o catálogo em vigor. Ordem: cópia recente no disco → catálogo
 * publicado → cópia velha no disco → lista embutida. A rede nunca é caminho
 * obrigatório para a tela de login funcionar.
 */
export async function carregarCatalogo(forcar = false): Promise<TenantDirectory> {
  if (catalogoEmMemoria && !forcar) return catalogoEmMemoria;

  const guardado = lerCatalogoGuardado();
  if (!forcar && guardado && Date.now() - guardado.buscadoEm < CACHE_TTL_MS) {
    catalogoEmMemoria = guardado.catalogo;
    return catalogoEmMemoria;
  }

  buscaEmAndamento ??= (async () => {
    const publicado = await buscarCatalogoPublicado();
    if (publicado) {
      gravarLocal(DIRECTORY_CACHE_KEY, JSON.stringify({ buscadoEm: Date.now(), catalogo: publicado }));
      return publicado;
    }
    return guardado?.catalogo ?? FALLBACK_DIRECTORY;
  })();

  try {
    catalogoEmMemoria = await buscaEmAndamento;
  } finally {
    buscaEmAndamento = null;
  }
  return catalogoEmMemoria;
}

/** Extrai o domínio de um e-mail. Devolve vazio se não houver um. */
export function dominioDoEmail(email: string): string {
  const partes = email.trim().toLowerCase().split('@');
  if (partes.length !== 2) return '';
  return partes[1].trim();
}

/**
 * Casa o domínio com o tenant mais específico. `mail.usimacusinagem.com.br`
 * casa com `usimacusinagem.com.br`, e entre dois domínios que servem o mesmo
 * e-mail vence o mais longo — senão um domínio genérico capturaria um específico.
 */
export function acharTenantPorDominio(catalogo: TenantDirectory, dominio: string): Tenant | null {
  if (!dominio) return null;
  let escolhido: Tenant | null = null;
  let tamanhoEscolhido = -1;
  for (const tenant of catalogo.tenants) {
    for (const candidato of tenant.emailDomains) {
      const casa = dominio === candidato || dominio.endsWith(`.${candidato}`);
      if (casa && candidato.length > tamanhoEscolhido) {
        escolhido = tenant;
        tamanhoEscolhido = candidato.length;
      }
    }
  }
  return escolhido;
}

export interface TenantResolvido {
  /** Nulo quando o domínio não está no catálogo e caiu no servidor padrão. */
  tenant: Tenant | null;
  apiUrl: string;
  /** Verdadeiro quando o endereço vem do build, não do catálogo. */
  fixadoNoBuild: boolean;
}

/**
 * Resolve para onde o login deve ir. Não lança: um catálogo inalcançável ou um
 * domínio fora dele ainda produzem um endereço utilizável.
 */
export async function resolverTenantPorEmail(email: string): Promise<TenantResolvido> {
  if (PINNED_API_URL) {
    return { tenant: null, apiUrl: normalizarUrl(PINNED_API_URL), fixadoNoBuild: true };
  }
  // Servidor de desenvolvimento (dev:demo, dev:training…): o proxy do vite já
  // aponta para o backend certo. Consultar o catálogo aqui gravaria o endereço
  // padrão — o de produção — e o login da demo iria parar em produção.
  if (import.meta.env.DEV) {
    return { tenant: null, apiUrl: '', fixadoNoBuild: true };
  }
  const catalogo = await carregarCatalogo();
  const tenant = acharTenantPorDominio(catalogo, dominioDoEmail(email));
  return {
    tenant,
    apiUrl: tenant ? tenant.apiUrl : catalogo.defaultApiUrl,
    fixadoNoBuild: false,
  };
}

interface TenantAtivoGuardado {
  id: string | null;
  name: string | null;
  apiUrl: string;
}

/** Guarda a escolha para que as próximas aberturas já saibam o servidor. */
export function definirTenantAtivo(resolvido: TenantResolvido): void {
  if (resolvido.fixadoNoBuild) {
    // Sem escolha a guardar — e uma escolha antiga não pode continuar valendo.
    apagarLocal(ACTIVE_TENANT_KEY);
    return;
  }
  const valor: TenantAtivoGuardado = {
    id: resolvido.tenant?.id ?? null,
    name: resolvido.tenant?.name ?? null,
    apiUrl: resolvido.apiUrl,
  };
  gravarLocal(ACTIVE_TENANT_KEY, JSON.stringify(valor));
}

export function lerTenantAtivo(): TenantAtivoGuardado | null {
  const bruto = lerLocal(ACTIVE_TENANT_KEY);
  if (!bruto) return null;
  try {
    const parsed = JSON.parse(bruto) as Partial<TenantAtivoGuardado>;
    // Revalida na leitura: um endereço gravado por uma versão anterior, ou
    // adulterado no disco, não deve virar destino das requisições.
    if (typeof parsed.apiUrl !== 'string' || !urlDeApiValida(parsed.apiUrl)) return null;
    return {
      id: typeof parsed.id === 'string' ? parsed.id : null,
      name: typeof parsed.name === 'string' ? parsed.name : null,
      apiUrl: normalizarUrl(parsed.apiUrl),
    };
  } catch {
    return null;
  }
}

export function esquecerTenantAtivo(): void {
  apagarLocal(ACTIVE_TENANT_KEY);
}

/**
 * Endereço que o cliente HTTP deve usar agora — síncrono, porque toda requisição
 * passa por aqui e não pode esperar a rede.
 *
 * A ordem existe por causa de um caso concreto de atualização: quem já estava
 * logado quando a versão nova chegou tem sessão gravada e NENHUMA empresa
 * gravada, porque a empresa só passa a ser registrada no login. Devolver vazio
 * nesse caso mandaria as requisições para a própria origem do WebView e o app
 * quebraria inteiro até a pessoa sair e entrar de novo. O endereço padrão
 * embutido cobre exatamente essa janela — é o mesmo servidor que a versão
 * anterior tinha fixado no build.
 */
export function urlDaApiAtiva(): string {
  if (PINNED_API_URL) return normalizarUrl(PINNED_API_URL);

  // No servidor de desenvolvimento, vazio é o certo: as chamadas vão para a
  // mesma origem e o proxy do vite as encaminha. Vem ANTES da empresa gravada:
  // uma escolha antiga no armazenamento (ex.: a API de produção) mandaria a demo
  // conversar com produção — e o CORS devolveria "Network Error".
  if (import.meta.env.DEV) return '';

  const ativo = lerTenantAtivo();
  if (ativo) return ativo.apiUrl;

  // Em produção, o catálogo guardado é preferido ao embutido: se o padrão mudou,
  // a última cópia conhecida é mais atual que a compilada no app.
  const guardado = lerCatalogoGuardado();
  return guardado?.catalogo.defaultApiUrl ?? FALLBACK_DIRECTORY.defaultApiUrl;
}

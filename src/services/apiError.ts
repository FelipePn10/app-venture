import axios from 'axios';

/**
 * Camada central de humanização de erros da API.
 *
 * Objetivo: NENHUM erro cru de banco/HTTP deve chegar à interface. O backend
 * (Go + Postgres) frequentemente vaza mensagens como
 *   `creating sales order: ERROR: insert or update on table "sales_orders"
 *    violates foreign key constraint "fk_so_payment_term" (SQLSTATE 23503)`
 * — isso precisa virar algo que o operador de chão de fábrica entenda:
 *   `Condição de pagamento inválida: selecione uma condição de pagamento
 *    cadastrada antes de salvar.`
 *
 * A função pública é {@link humanizeApiError}. `errMessage` (fiscalShared)
 * delega para cá, então toda tela que já usa `errMessage` ganha as traduções
 * automaticamente.
 */

/** Nomes amigáveis (pt-BR) para tokens que aparecem em colunas/constraints. */
const FIELD_LEXICON: Array<[RegExp, string]> = [
  [/payment[_-]?term/i, 'condição de pagamento'],
  [/price[_-]?table|sales[_-]?table|tabela[_-]?venda/i, 'tabela de preço'],
  [/customer|cliente/i, 'cliente'],
  [/supplier|fornecedor|vendor/i, 'fornecedor'],
  [/representative|representante|rep\b/i, 'representante'],
  [/carrier|transportadora/i, 'transportadora'],
  [/enterprise|establishment|estabelec/i, 'estabelecimento/empresa'],
  [/warehouse|deposito|almox/i, 'depósito'],
  [/sales[_-]?order/i, 'pedido de venda'],
  [/purchase[_-]?order/i, 'pedido de compra'],
  [/production[_-]?order/i, 'ordem de produção'],
  [/cost[_-]?center|centro[_-]?custo/i, 'centro de custo'],
  [/tax|imposto|icms|ipi|cfop|ncm/i, 'dados fiscais'],
  [/currency|moeda/i, 'moeda'],
  [/item|produto|product/i, 'item/produto'],
  [/unit|medida|uom/i, 'unidade de medida'],
  [/account|conta|ledger/i, 'conta contábil'],
  [/user|usuario/i, 'usuário'],
  [/city|cidade|municipio/i, 'cidade'],
  [/mask|mascara/i, 'máscara'],
  [/division|divisao/i, 'divisão de venda'],
  [/channel|canal/i, 'canal de venda'],
];

/** Deriva um rótulo pt-BR a partir de um nome de constraint/coluna cru. */
function humanizeToken(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw
    .replace(/^fk[_-]?/i, '')
    .replace(/_fkey$|_key$|_pkey$|_check$|_unique$/i, '')
    .replace(/^(so|po|nf|oc)[_-]/i, '');
  for (const [pattern, label] of FIELD_LEXICON) {
    if (pattern.test(cleaned)) return label;
  }
  return undefined;
}

/**
 * Extrai um SQLSTATE (`(SQLSTATE 23503)`) de uma mensagem crua do Postgres,
 * junto com o nome da constraint (`"fk_so_payment_term"`) e a coluna do
 * detalhe (`Key (payment_term_code)=(5) is not present...`), se houver.
 */
function parsePostgresError(text: string): {
  sqlstate?: string;
  constraint?: string;
  column?: string;
} | null {
  if (!/SQLSTATE|ERROR:|violates|duplicate key|null value/i.test(text)) return null;
  const sqlstate = text.match(/SQLSTATE\s+([0-9A-Z]{5})/i)?.[1]?.toUpperCase();
  const constraint = text.match(/constraint\s+"([^"]+)"/i)?.[1];
  // `Key (col)=(...)` ou `column "col"`
  const column =
    text.match(/Key\s+\(([^)]+)\)=/i)?.[1] ??
    text.match(/column\s+"([^"]+)"/i)?.[1];
  return { sqlstate, constraint, column };
}

/** Traduz um erro cru do Postgres para pt-BR; retorna undefined se não reconhecer. */
function translatePostgres(text: string): string | undefined {
  const pg = parsePostgresError(text);
  if (!pg) return undefined;
  const label =
    humanizeToken(pg.constraint) ?? humanizeToken(pg.column) ?? 'referência';

  switch (pg.sqlstate) {
    case '23503': // foreign_key_violation
      return `${capitalize(label)} inválido(a): selecione um registro de ${label} já cadastrado antes de salvar. Se o cadastro não existe, crie-o primeiro.`;
    case '23505': // unique_violation
      return `Já existe um registro com esse valor de ${label}. Use um valor diferente ou edite o registro existente.`;
    case '23502': // not_null_violation
      return `O campo ${label} é obrigatório e não pode ficar em branco.`;
    case '23514': // check_violation
      return `Valor inválido para ${label}: o valor informado não é permitido por uma regra do sistema.`;
    case '23P01': // exclusion_violation
      return `Conflito de ${label} com um registro existente. Ajuste os valores e tente novamente.`;
    default:
      // SQLSTATE desconhecido, mas claramente um erro de banco: não vaze o cru.
      return `Não foi possível concluir a operação por uma restrição de ${label}. Verifique os dados e tente novamente.`;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Mensagens por status HTTP quando o corpo não traz nada útil. */
function messageForStatus(status: number): string {
  if (status === 400) return 'Requisição inválida. Verifique os dados informados.';
  if (status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
  if (status === 403) return 'Você não tem permissão para executar esta ação.';
  if (status === 404) return 'Registro não encontrado. Ele pode ter sido removido ou alterado.';
  if (status === 409) return 'Conflito: este registro foi alterado por outra operação. Recarregue e tente novamente.';
  if (status === 422) return 'Dados inválidos. Revise os campos destacados e tente novamente.';
  if (status === 429) return 'Muitas requisições em pouco tempo. Aguarde alguns instantes e tente novamente.';
  if (status >= 500) return 'O servidor encontrou um problema ao processar a solicitação. Tente novamente; se persistir, contate o suporte.';
  return 'Não foi possível concluir a operação. Tente novamente.';
}

/** Extrai a string de erro mais específica do corpo da resposta. */
function rawFromBody(data: unknown): string | undefined {
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    const candidate = o.message ?? o.error ?? o.detail ?? o.Message ?? o.Error;
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    // Erros de validação em lista: { errors: { campo: "msg" } } ou [ "msg" ]
    if (o.errors) {
      const errs = o.errors;
      if (Array.isArray(errs) && typeof errs[0] === 'string') return errs.join(' ');
      if (errs && typeof errs === 'object') {
        const first = Object.values(errs as Record<string, unknown>).find(
          (v) => typeof v === 'string',
        );
        if (typeof first === 'string') return first;
      }
    }
  }
  return undefined;
}

/**
 * Converte qualquer erro (axios, Error, string) em uma mensagem pt-BR legível
 * para o usuário final. Nunca retorna SQLSTATE, nome de constraint ou stack.
 */
export function humanizeApiError(e: unknown, fallback = 'Ocorreu um erro inesperado. Tente novamente.'): string {
  if (axios.isAxiosError(e)) {
    // Sem resposta = rede/timeout/servidor fora.
    if (!e.response) {
      if (e.code === 'ECONNABORTED') {
        return 'O servidor demorou demais para responder. Verifique sua conexão e tente novamente.';
      }
      return 'Não foi possível conectar ao servidor. Verifique sua conexão de rede e se o serviço está no ar.';
    }

    const raw = rawFromBody(e.response.data);
    if (raw) {
      // 1) Tenta traduzir erro cru de banco.
      const translated = translatePostgres(raw);
      if (translated) return translated;
      // 2) Se o backend vazou um erro técnico (Go wrapping, "ERROR:", SQLSTATE),
      //    não mostra o cru — usa a mensagem por status.
      if (looksTechnical(raw)) return messageForStatus(e.response.status);
      // 3) Mensagem de negócio legível vinda do backend: mantém.
      return raw;
    }
    return messageForStatus(e.response.status);
  }

  if (e instanceof Error && e.message) {
    if (looksTechnical(e.message)) return fallback;
    return e.message;
  }
  if (typeof e === 'string' && e.trim()) {
    return looksTechnical(e) ? (translatePostgres(e) ?? fallback) : e.trim();
  }
  return fallback;
}

/** Heurística: a string parece um erro técnico/cru que não deve ir à tela? */
function looksTechnical(text: string): boolean {
  return /SQLSTATE|ERROR:|panic:|goroutine|nil pointer|violates|pq:|sql: |\bat 0x|undefined \(|Traceback/i.test(
    text,
  );
}

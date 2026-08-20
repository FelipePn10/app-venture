import type { ErpScreen } from "@/types/erpScreen";

const MAX_RESULTS = 30;

export function normalizeScreenSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function words(value: string): string[] {
  return normalizeScreenSearch(value).split(" ").filter(Boolean);
}

function tokenMatch(haystack: string[], token: string): boolean {
  return haystack.some((word) => word === token || (token.length >= 3 && word.startsWith(token)));
}

function scoreScreen(screen: ErpScreen, rawQuery: string): number | null {
  const query = normalizeScreenSearch(rawQuery);
  if (!query) return null;

  const compactQuery = query.replace(/ /g, "");
  const code = normalizeScreenSearch(screen.code).replace(/ /g, "");
  const title = normalizeScreenSearch(screen.title);
  const description = normalizeScreenSearch(screen.description);
  const queryTokens = words(query);
  const titleTokens = words(title);
  const descriptionTokens = words(description);
  const searchableTokens = [...titleTokens, ...descriptionTokens];
  const looksLikeCode = /[a-z]/.test(compactQuery) && /\d/.test(compactQuery);

  if (code === compactQuery) return 0;
  if (code.startsWith(compactQuery)) return 10 + (code.length - compactQuery.length);
  if (compactQuery.length >= 3 && code.includes(compactQuery)) return 25 + code.indexOf(compactQuery);

  // Uma consulta com formato de código não deve trazer telas apenas porque a
  // descrição contém um fragmento semelhante.
  if (looksLikeCode) return null;

  if (title === query) return 40;
  if (title.startsWith(`${query} `) || title.startsWith(query)) return 50;
  if (titleTokens.includes(query)) return 60;
  if (queryTokens.every((token) => tokenMatch(titleTokens, token))) {
    const exact = queryTokens.filter((token) => titleTokens.includes(token)).length;
    return 70 + (queryTokens.length - exact) * 3 + Math.max(0, titleTokens.length - queryTokens.length);
  }
  if (query.length >= 3 && title.includes(query)) return 100 + title.indexOf(query);

  // Algumas telas usam siglas no título (por exemplo, NF-e) e o nome por
  // extenso na descrição. Permitir que as palavras se completem entre ambos.
  if (queryTokens.every((token) => tokenMatch(searchableTokens, token))) {
    return 120 + Math.max(0, searchableTokens.length - queryTokens.length);
  }

  if (queryTokens.every((token) => tokenMatch(descriptionTokens, token))) {
    const exact = queryTokens.filter((token) => descriptionTokens.includes(token)).length;
    return 140 + (queryTokens.length - exact) * 3;
  }
  if (query.length >= 4 && description.includes(query)) return 180 + description.indexOf(query);
  return null;
}

export function searchErpScreens(screens: ErpScreen[], query: string, limit = MAX_RESULTS): ErpScreen[] {
  const ranked = screens
    .map((screen, index) => ({ screen, index, score: scoreScreen(screen, query) }))
    .filter((entry): entry is { screen: ErpScreen; index: number; score: number } => entry.score !== null)
    .sort((a, b) => a.score - b.score
      || a.screen.code.localeCompare(b.screen.code, "pt-BR", { numeric: true })
      || a.index - b.index);

  // Um código representa uma única rotina. Além de manter a lista limpa, esta
  // defesa evita repetir resultados caso uma fonte futura cadastre a mesma tela.
  const seenCodes = new Set<string>();
  const results: ErpScreen[] = [];
  for (const { screen } of ranked) {
    const code = screen.code.toLocaleUpperCase("pt-BR");
    if (seenCodes.has(code)) continue;
    seenCodes.add(code);
    results.push(screen);
    if (results.length === limit) break;
  }
  return results;
}

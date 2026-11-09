import { useEffect, useState } from 'react';
import { carregarUnidades, type Unidade } from '@/services/unitConversionService';

/**
 * O catálogo, recarregado quando a janela volta ao foco: cada tela é uma
 * janela com a própria memória, e a unidade cadastrada na VSUP0110 não
 * aparecia no cadastro do item já aberto.
 */
function useCatalogo(): Unidade[] | null {
  const [catalogo, setCatalogo] = useState<Unidade[] | null>(null);
  useEffect(() => {
    let vivo = true;
    const ler = (fresco: boolean) => { carregarUnidades(fresco).then((u) => { if (vivo) setCatalogo(u); }).catch(() => { /* fica a lista de reserva */ }); };
    const aoFocar = () => ler(true);
    ler(false);
    window.addEventListener('focus', aoFocar);
    return () => { vivo = false; window.removeEventListener('focus', aoFocar); };
  }, []);
  return catalogo;
}

/**
 * Códigos das unidades ativas do catálogo da empresa (VSUP0110 › Unidades).
 *
 * Enquanto carrega — ou se o catálogo não responder — vale `reserva`, a lista
 * fixa que a tela usava antes. `atual` (o valor já gravado no registro) entra
 * sempre na lista: unidade desativada depois de usada não pode sumir do
 * campo e trocar o valor sem ninguém perceber.
 */
export function useUnidades(reserva: readonly string[], ...atual: (string | undefined | null)[]): string[] {
  const catalogo = useCatalogo();
  // Em ordem alfabética: a ordem do banco (por grandeza) misturava M2, CM e BARRA.
  const base = catalogo ? catalogo.filter((u) => u.is_active).map((u) => u.code).sort((a, b) => a.localeCompare(b)) : [...reserva];
  const extras = atual.map((a) => (a ?? '').trim().toUpperCase()).filter((a) => a && !base.includes(a));
  return [...base, ...extras];
}

/** O catálogo completo (código, descrição, grandeza) para os campos que mostram a descrição. */
export function useCatalogoDeUnidades(): Unidade[] {
  const catalogo = useCatalogo();
  return catalogo ? catalogo.filter((x) => x.is_active) : [];
}

/** Código → "CÓDIGO — descrição", para mostrar a unidade pelo nome ("GL — Galão"). */
export function useRotulosDeUnidades(): Record<string, string> {
  const catalogo = useCatalogo();
  const out: Record<string, string> = {};
  for (const x of catalogo ?? []) out[x.code] = x.description && x.description !== x.code ? `${x.code} — ${x.description}` : x.code;
  return out;
}

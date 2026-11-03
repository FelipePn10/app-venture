import { isTauri } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';

/**
 * Quando as listas dos campos de busca deixam de valer.
 *
 * Cada rotina do ERP abre na própria janela do Tauri, e cada janela tem a sua
 * memória: o cadastro gravado na VENT0200 zerava as listas memorizadas só na
 * janela da VENT0200. Na VBEN0100, já aberta, o item novo não aparecia em
 * "Item do cadastro" até fechar a rotina — e o usuário concluía que o cadastro
 * não tinha sido gravado. Por isso a invalidação é avisada a todas as janelas.
 *
 * A geração resolve o outro lado: o campo já montado guardava a lista que
 * carregou e só recarregava se ela estivesse vazia. Agora ele compara a geração
 * com a da sua carga e busca de novo ao abrir.
 */
const EVENTO = 'erp:lookups-invalidated';
const ORIGEM = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random());

let geracao = 0;
const ouvintes: Array<() => void> = [];

/** Muda a cada invalidação, nesta janela ou em outra. */
export function geracaoDasListas(): number {
  return geracao;
}

/** Registra quem limpa a memória local das listas. */
export function aoInvalidarListas(limpar: () => void): void {
  ouvintes.push(limpar);
}

function invalidarAqui(): void {
  geracao++;
  for (const limpar of ouvintes) limpar();
}

/** Invalida nesta janela e avisa as demais. */
export function invalidarListas(): void {
  invalidarAqui();
  if (!isTauri()) return;
  void emit(EVENTO, { origem: ORIGEM }).catch(() => {});
}

if (isTauri()) {
  void listen<{ origem?: string }>(EVENTO, (evento) => {
    if (evento.payload?.origem === ORIGEM) return;
    invalidarAqui();
  }).catch(() => {});
}

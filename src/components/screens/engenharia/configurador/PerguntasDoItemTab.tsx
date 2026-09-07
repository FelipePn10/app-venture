import { useCallback, useEffect, useState } from "react";
import {
  type CfgCharacteristic, type CfgItemCharacteristic, type CfgVariable,
  listCharacteristics, listItemQuestions, addItemCharacteristic,
  updateItemCharacteristic, removeItemCharacteristic, listSetVariables,
} from "@/services/configuratorCfgService";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems } from "@/services/lookups";
import { enumLabel } from "@/utils/enumLabels";

/**
 * Perguntas de um item, na ordem em que serão feitas (FENG0107 no FoccoERP).
 *
 * A ordem não é cosmética: o configurador responde as perguntas em sequência e
 * usa as respostas já dadas para eliminar as opções seguintes. Por isso as
 * sequências andam de 10 em 10 — sobra espaço para encaixar uma pergunta nova
 * no meio sem renumerar o que já está em uso.
 */
type Props = {
  aviso: (tipo: "success" | "error", msg: string) => void;
  itemCode: string;
  onItemChange: (code: string) => void;
};

const PASSO = 10;

export function PerguntasDoItemTab({ aviso, itemCode, onItemChange }: Props): JSX.Element {
  const [perguntas, setPerguntas] = useState<CfgItemCharacteristic[]>([]);
  const [catalogo, setCatalogo] = useState<CfgCharacteristic[]>([]);
  const [aVincular, setAVincular] = useState("");
  const [respostas, setRespostas] = useState<Record<number, CfgVariable[]>>({});
  const [busy, setBusy] = useState(false);

  const executar = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { aviso("error", (e as Error).message); } finally { setBusy(false); }
  }, [aviso]);

  const carregar = useCallback((code: string) => executar(async () => {
    if (!code.trim()) { setPerguntas([]); return; }
    const [lista, todas] = await Promise.all([listItemQuestions(code.trim()), listCharacteristics()]);
    setPerguntas(lista);
    setCatalogo(todas);
    // Carrega as respostas possíveis das perguntas de escolha para permitir
    // definir a resposta padrão sem sair da tela.
    const mapa: Record<number, CfgVariable[]> = {};
    await Promise.all(lista.map(async (p) => {
      const def = todas.find((c) => c.id === p.characteristic_id);
      if (def?.set_id) mapa[p.characteristic_id] = await listSetVariables(def.set_id);
    }));
    setRespostas(mapa);
  }), [executar]);

  // O item escolhido é compartilhado entre as abas: ao entrar aqui já vindo de
  // outra etapa, carrega sozinho em vez de exigir que o usuário reescolha.
  useEffect(() => { void carregar(itemCode); }, [itemCode, carregar]);

  function vincular() {
    const id = Number(aVincular);
    if (!itemCode.trim()) { aviso("error", "Escolha o item antes de vincular perguntas."); return; }
    if (!id) { aviso("error", "Escolha a pergunta que será vinculada."); return; }
    if (perguntas.some((p) => p.characteristic_id === id)) {
      aviso("error", "Esta pergunta já está vinculada ao item.");
      return;
    }
    const proxima = (perguntas.length ? Math.max(...perguntas.map((p) => p.sequence)) : 0) + PASSO;
    void executar(async () => {
      await addItemCharacteristic(itemCode.trim(), id, proxima);
      aviso("success", `Pergunta vinculada na sequência ${proxima}.`);
      await carregar(itemCode);
    });
  }

  /** Troca a posição com o vizinho e regrava as duas sequências. */
  function mover(indice: number, direcao: -1 | 1) {
    const destino = indice + direcao;
    if (destino < 0 || destino >= perguntas.length) return;
    const a = perguntas[indice];
    const b = perguntas[destino];
    void executar(async () => {
      await updateItemCharacteristic(a.id, { ...a, sequence: b.sequence });
      await updateItemCharacteristic(b.id, { ...b, sequence: a.sequence });
      await carregar(itemCode);
    });
  }

  /** Renumera tudo de 10 em 10, devolvendo espaço para encaixes futuros. */
  function renumerar() {
    void executar(async () => {
      for (let i = 0; i < perguntas.length; i++) {
        const desejada = (i + 1) * PASSO;
        if (perguntas[i].sequence !== desejada) {
          await updateItemCharacteristic(perguntas[i].id, { ...perguntas[i], sequence: desejada });
        }
      }
      aviso("success", "Sequências renumeradas de 10 em 10.");
      await carregar(itemCode);
    });
  }

  function definirPadrao(p: CfgItemCharacteristic, variableId: number | undefined) {
    void executar(async () => {
      await updateItemCharacteristic(p.id, { ...p, default_variable_id: variableId });
      await carregar(itemCode);
    });
  }

  const naoVinculadas = catalogo.filter((c) => !perguntas.some((p) => p.characteristic_id === c.id));

  return (
    <section className="erp-detail-panel">
      <div className="erp-tabs"><button className="erp-tab active">Perguntas do item</button></div>
      <div className="erp-detail-body">

        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Item configurável</div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c4">
              <label className="erp-label erp-req">Item</label>
              <LookupField
                value={itemCode || undefined}
                onChange={(code) => { const c = code ? String(code) : ""; onItemChange(c); void carregar(c); }}
                loader={loadItems}
                entityLabel="item"
                placeholder="Escolher o item configurável…"
              />
              <span className="cfgw-hint">Marque o item como “Configurado” na VENT0200 para que ele apareça no configurador.</span>
            </div>
            <div className="erp-field erp-c5">
              <label className="erp-label">Vincular pergunta</label>
              <select className="erp-input" value={aVincular} onChange={(e) => setAVincular(e.target.value)} disabled={!itemCode}>
                <option value="">Selecione…</option>
                {naoVinculadas.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.description}</option>)}
              </select>
            </div>
            <div className="erp-field erp-c3 cfgw-actions">
              <button className="erp-btn erp-btn-primary" onClick={vincular} disabled={busy || !itemCode || !aVincular}>Vincular</button>
              <button className="erp-btn" onClick={() => void carregar(itemCode)} disabled={busy || !itemCode}>Recarregar</button>
            </div>
          </div>
        </div>

        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Ordem das perguntas ({perguntas.length})</div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead>
                  <tr><th>Seq.</th><th>Código</th><th>Pergunta</th><th>Tipo</th><th>Máscara</th><th>Resposta padrão</th><th /></tr>
                </thead>
                <tbody>
                  {perguntas.length === 0 && (
                    <tr><td colSpan={7} className="erp-grid-empty">
                      {itemCode ? "Este item ainda não tem perguntas. Vincule a primeira acima." : "Escolha o item."}
                    </td></tr>
                  )}
                  {perguntas.map((p, i) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.sequence}</td>
                      <td>{p.characteristic_code}</td>
                      <td>{p.characteristic_name}</td>
                      <td>{enumLabel(p.characteristic_type)}</td>
                      <td><code className="cfgw-chip">{p.characteristic_mask || p.characteristic_code}</code></td>
                      <td>
                        {respostas[p.characteristic_id]?.length ? (
                          <select className="erp-input erp-input-sm" value={p.default_variable_id ?? ""}
                            onChange={(e) => definirPadrao(p, Number(e.target.value) || undefined)}>
                            <option value="">sem padrão</option>
                            {respostas[p.characteristic_id].map((v) => (
                              <option key={v.id} value={v.id}>{v.code} — {v.description}</option>
                            ))}
                          </select>
                        ) : "—"}
                      </td>
                      <td className="cfgw-rowactions">
                        <button className="erp-btn erp-btn-sm" title="Subir" disabled={busy || i === 0} onClick={() => mover(i, -1)}>↑</button>
                        <button className="erp-btn erp-btn-sm" title="Descer" disabled={busy || i === perguntas.length - 1} onClick={() => mover(i, 1)}>↓</button>
                        <button className="erp-btn erp-btn-danger erp-btn-sm" title="Desvincular"
                          onClick={() => void executar(async () => { await removeItemCharacteristic(p.id); await carregar(itemCode); })}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {perguntas.length > 1 && (
              <div className="erp-field erp-c12 cfgw-actions">
                <button className="erp-btn" onClick={renumerar} disabled={busy}>Renumerar de 10 em 10</button>
                <span className="cfgw-hint">
                  Espaçar as sequências deixa lugar para encaixar uma pergunta nova entre duas existentes.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

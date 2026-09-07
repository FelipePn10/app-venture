import { useEffect, useState } from "react";
import { listStructureHistory, type StructureHistoryEntry } from "@/services/ItemStructureService";
import { errMessage } from "@/services/fiscalShared";
import { CFG_STYLES } from "./StructureConfiguratorPanel";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";

/**
 * Quem mexeu na estrutura, o que mudou e quando.
 *
 * Estrutura de produto é o documento mais disputado da engenharia: quando o
 * custo do produto muda de um dia para o outro, a primeira pergunta é sempre
 * "quem alterou?". FoccoERP responde isso só por relatório; aqui a resposta
 * está na própria tela, componente a componente, com o antes e o depois.
 */
type Props = { itemCode: string; onClose: () => void };

const ACAO_ROTULO: Record<StructureHistoryEntry["action"], string> = {
  INCLUSAO: "Incluído",
  ALTERACAO: "Alterado",
  EXCLUSAO: "Excluído",
};

function quando(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("pt-BR");
}

export function StructureHistoryPanel({ itemCode, onClose }: Props): JSX.Element {
  useEscapeToClose(onClose);
  const [entradas, setEntradas] = useState<StructureHistoryEntry[]>([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await listStructureHistory(itemCode, 200);
        if (vivo) setEntradas(r);
      } catch (e) {
        if (vivo) setErro(errMessage(e));
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => { vivo = false; };
  }, [itemCode]);

  return (
    <>
      <style>{CFG_STYLES}</style>
      <div className="cfg-backdrop" role="dialog" aria-modal="true" aria-label="Histórico da estrutura">
      <div className="cfg-modal" style={{ width: "min(920px, 96vw)" }}>
        <header className="cfg-head">
          <div>
            <div className="cfg-head-title">Histórico da estrutura</div>
            <div className="cfg-head-sub">Item {itemCode} — alterações mais recentes primeiro</div>
          </div>
          <button className="cfg-btn cfg-btn-ghost" onClick={onClose}>Fechar</button>
        </header>

        <div className="cfg-body">
          {carregando && <div className="cfg-empty">Carregando…</div>}
          {erro && <div className="cfg-alert err">{erro}</div>}
          {!carregando && !erro && entradas.length === 0 && (
            <div className="cfg-empty">Nenhuma alteração registrada para esta estrutura.</div>
          )}

          {entradas.map((e) => (
            <section className="cfg-card" key={e.id}>
              <div className="cfg-card-head">
                <span className={`cfg-tag a-${e.action.toLowerCase()}`}>{ACAO_ROTULO[e.action] ?? e.action}</span>
                {" "}componente {e.child_code}
                <span className="cfg-card-meta">{e.changed_by_name || "—"} · {quando(e.changed_at)}</span>
              </div>
              <div className="cfg-card-body">
                {e.changes.length === 0 ? (
                  <div className="cfg-empty">Sem campos comparáveis.</div>
                ) : (
                  <table className="cfg-table">
                    <thead>
                      <tr><th>Campo</th><th>Antes</th><th>Depois</th></tr>
                    </thead>
                    <tbody>
                      {e.changes.map((c, i) => (
                        <tr key={`${e.id}-${i}`}>
                          <td>{c.field}</td>
                          <td className="cfg-before">{c.before || "—"}</td>
                          <td className="cfg-after">{c.after || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}

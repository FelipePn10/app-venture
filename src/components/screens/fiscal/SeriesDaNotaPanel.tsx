import { useCallback, useEffect, useState } from "react";
import { type LinhaNotaComSerie, type Serie, definirSeriesDaLinha, listarSeries, seriesDaNota } from "@/services/posVendaService";
import { errMessage } from "@/services/fiscalShared";

/**
 * Números de série das linhas da NF de saída (item que controla série,
 * VATC0110). A prévia impede a transmissão enquanto cada linha não tiver uma
 * série por unidade; autorizada a nota, as séries vão para o cliente na Base
 * Instalada (VATC0100) e saem no infAdProd do item.
 */
export function SeriesDaNotaPanel({ exitId, editavel, onMudou }: { exitId: number; editavel: boolean; onMudou: () => void }): JSX.Element | null {
  const [linhas, setLinhas] = useState<LinhaNotaComSerie[]>([]);
  const [disponiveis, setDisponiveis] = useState<Record<number, Serie[]>>({});
  const [marcadas, setMarcadas] = useState<Record<number, number[]>>({});
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const ls = await seriesDaNota(exitId);
      setLinhas(ls);
      setMarcadas(Object.fromEntries(ls.map((l) => [l.fiscal_exit_item_id, l.series.map((s) => s.id)])));
      const porItem: Record<number, Serie[]> = {};
      for (const l of ls) {
        const livres = editavel ? await listarSeries({ item: String(l.item_code), situacao: "EM_ESTOQUE", limite: 500 }) : [];
        // As já escolhidas nesta linha entram na lista mesmo que outra consulta as filtre.
        const vistos = new Set(livres.map((s) => s.id));
        porItem[l.fiscal_exit_item_id] = [...l.series.filter((s) => !vistos.has(s.id)), ...livres];
      }
      setDisponiveis(porItem);
      setErro("");
    } catch (e) { setErro(errMessage(e, "Falha ao carregar os números de série da nota.")); }
  }, [exitId, editavel]);
  useEffect(() => { void carregar(); }, [carregar]);

  if (linhas.length === 0 && !erro) return null;

  const alternar = (linha: number, id: number) => setMarcadas((m) => {
    const atual = m[linha] ?? [];
    return { ...m, [linha]: atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id] };
  });

  async function gravar(l: LinhaNotaComSerie) {
    setBusy(true);
    try { await definirSeriesDaLinha(exitId, l.fiscal_exit_item_id, marcadas[l.fiscal_exit_item_id] ?? []); await carregar(); onMudou(); }
    catch (e) { setErro(errMessage(e)); } finally { setBusy(false); }
  }

  return (
    <div className="erp-fieldset">
      <div className="erp-fieldset-head">Números de série — <span style={{ fontWeight: 400, opacity: 0.65 }}>uma série por unidade, das que estão em estoque</span></div>
      <div className="erp-fieldset-body">
        {erro && <div className="erp-field erp-c12"><div className="erp-feedback error">{erro}</div></div>}
        {linhas.map((l) => {
          const qtd = Number(l.quantidade);
          const sel = marcadas[l.fiscal_exit_item_id] ?? [];
          const lista = disponiveis[l.fiscal_exit_item_id] ?? [];
          const ok = sel.length === qtd && l.series.length === qtd;
          return (
            <div key={l.fiscal_exit_item_id} className="erp-field erp-c12">
              <label className="erp-label">
                Item {l.item_code} · {qtd} unidade(s) · escolhidas {sel.length}{" "}
                <span className={`erp-badge ${ok ? "erp-badge-green" : "erp-badge-red"}`}>{ok ? "completo" : "falta série"}</span>
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 140, overflowY: "auto" }}>
                {lista.length === 0 && <small>Nenhuma série deste item em estoque. Cadastre em VATC0100 — Base Instalada ou entregue a OF com as séries.</small>}
                {lista.map((s) => (
                  <label key={s.id} className="erp-check" style={{ minWidth: 150 }}>
                    <input type="checkbox" checked={sel.includes(s.id)} disabled={!editavel || busy} onChange={() => alternar(l.fiscal_exit_item_id, s.id)} />
                    {" "}{s.numero_serie}{s.lote ? ` · lote ${s.lote}` : ""}
                  </label>
                ))}
              </div>
              {editavel && (
                <button className="erp-btn erp-btn-sm" style={{ marginTop: 6 }} disabled={busy || sel.length > qtd} onClick={() => void gravar(l)}>
                  {sel.length > qtd ? `Marque no máximo ${qtd}` : "Gravar séries da linha"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { simulateFormula, type FormulaSimulation, type QuantityRounding } from "@/services/ItemStructureService";
import { errMessage } from "@/services/fiscalShared";
import { CFG_STYLES } from "./StructureConfiguratorPanel";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";

/**
 * Conferência da fórmula de quantidade antes de gravar.
 *
 * Uma fórmula errada na estrutura não avisa: ela vira necessidade errada no
 * MRP, e o erro só aparece quando já custou compra ou produção. Aqui o usuário
 * responde as perguntas, vê o número que sairia — já com arredondamento, perda
 * e perda de preparação — e só então salva. Nem FoccoERP nem SAP oferecem essa
 * conferência na própria tela de estrutura.
 */
type Props = {
  formula: string;
  rounding: QuantityRounding;
  scale: number;
  lossPercentage: number;
  setupLoss: number;
  onClose: () => void;
};

const num = (v: number): string =>
  Number.isFinite(v) ? v.toLocaleString("pt-BR", { maximumFractionDigits: 6 }) : "—";

export function StructureFormulaTester({ formula, rounding, scale, lossPercentage, setupLoss, onClose }: Props): JSX.Element {
  useEscapeToClose(onClose);
  // As variáveis saem da própria fórmula: o usuário responde só o que ela usa.
  const variaveis = useMemo(
    () => [...new Set(formula.toUpperCase().match(/[A-Z_][A-Z0-9_]*/g) ?? [])],
    [formula],
  );
  const [valores, setValores] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<FormulaSimulation | null>(null);
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  async function simular() {
    setBusy(true); setErro(""); setResultado(null);
    try {
      const numericos: Record<string, number> = {};
      for (const [k, v] of Object.entries(valores)) {
        if (v.trim()) numericos[k] = Number(v);
      }
      setResultado(await simulateFormula({
        formula,
        quantity_rounding: rounding,
        quantity_scale: scale,
        loss_percentage: lossPercentage,
        setup_loss: setupLoss,
        variables: numericos,
      }));
    } catch (e) {
      setErro(errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <style>{CFG_STYLES}</style>
      <div className="cfg-backdrop" role="dialog" aria-modal="true" aria-label="Simular fórmula">
      <div className="cfg-modal" style={{ width: "min(720px, 96vw)" }}>
        <header className="cfg-head">
          <div>
            <div className="cfg-head-title">Simular a fórmula</div>
            <div className="cfg-head-sub">Confira a quantidade resultante antes de gravar</div>
          </div>
          <button className="cfg-btn cfg-btn-ghost" onClick={onClose}>Fechar</button>
        </header>

        <div className="cfg-body">
          <section className="cfg-card">
            <div className="cfg-card-head">Fórmula</div>
            <div className="cfg-card-body">
              <code className="cfg-formula-exp">{formula}</code>
            </div>
          </section>

          <section className="cfg-card">
            <div className="cfg-card-head">Respostas <span className="cfg-count">{variaveis.length}</span></div>
            <div className="cfg-card-body">
              {variaveis.length === 0 && <div className="cfg-empty">Esta fórmula não usa variáveis.</div>}
              {variaveis.map((v) => (
                <div className="cfg-field" key={v}>
                  <label className="cfg-label">{v}</label>
                  <input className="cfg-input num" type="number" step="any"
                    value={valores[v] ?? ""}
                    onChange={(e) => setValores((p) => ({ ...p, [v]: e.target.value }))}/>
                </div>
              ))}
            </div>
          </section>

          {erro && <div className="cfg-alert err">{erro}</div>}

          {resultado && !resultado.valid && (
            <div className="cfg-alert warn">
              {resultado.explanation}
              {resultado.error ? ` (${resultado.error})` : ""}
            </div>
          )}

          {resultado?.valid && (
            <section className="cfg-card">
              <div className="cfg-card-head">Quantidade resultante</div>
              <div className="cfg-card-body">
                <table className="cfg-table">
                  <tbody>
                    <tr><td>Resultado da fórmula</td><td className="num">{num(resultado.raw_result)}</td></tr>
                    <tr><td>Depois do arredondamento</td><td className="num">{num(resultado.rounded_result)}</td></tr>
                    <tr><td>Com a perda de {lossPercentage}%</td><td className="num">{num(resultado.quantity_with_loss)}</td></tr>
                    <tr>
                      <th style={{ textAlign: "left" }}>Consumo por ordem</th>
                      <th className="num">{num(resultado.quantity_per_order)}</th>
                    </tr>
                  </tbody>
                </table>
                <span className="cfg-formula-meta">{resultado.explanation}</span>
              </div>
            </section>
          )}
        </div>

        <footer className="cfg-foot">
          <span className="cfg-foot-hint">Nada é gravado aqui.</span>
          <div className="cfg-foot-actions">
            <button className="cfg-btn cfg-btn-primary" onClick={() => void simular()} disabled={busy}>
              {busy ? "Calculando…" : "Simular"}
            </button>
          </div>
        </footer>
      </div>
    </div>
    </>
  );
}

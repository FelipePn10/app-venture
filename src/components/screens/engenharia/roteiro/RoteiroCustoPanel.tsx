import { useEffect, useMemo, useState } from "react";
import type { RouteOperationDTO } from "@/services/manufacturingRoutingService";
import { type WorkCenterCost, listWorkCenterCosts } from "@/services/standardCostService";
import { errMessage } from "@/services/fiscalShared";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";

/**
 * Tempo e custo do roteiro para um tamanho de lote.
 *
 * É a pergunta que a engenharia faz o tempo todo e que nenhum ERP responde na
 * própria tela do roteiro: "quanto custa e quanto demora fabricar 50?".
 * FoccoERP, SAP e TOTVS respondem por relatório, depois de gravar. Aqui a conta
 * aparece enquanto o roteiro está sendo montado, operação a operação — e é o
 * único lugar onde um `run_base_qty` errado aparece antes de virar prejuízo.
 *
 * A conta segue o modelo de tempo do backend:
 *
 *   preparação (por lote) + máquina × (lote ÷ base) + fila + espera + movimentação
 *
 * O custo separa máquina de mão de obra porque as tarifas são diferentes e a
 * equipe pode ter mais de um operador na mesma máquina.
 */
type Props = {
  operacoes: RouteOperationDTO[];
  nomeDaOperacao: (id: number) => string;
  onClose: () => void;
};

type Linha = {
  sequencia: number;
  nome: string;
  centro?: number;
  horasMaquina: number;
  horasMaoDeObra: number;
  horasParadas: number;
  custoMaquina: number;
  custoMaoDeObra: number;
  custoTerceiro: number;
};

const brl = (v: number): string => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const horas = (v: number): string => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} h`;

export function RoteiroCustoPanel({ operacoes, nomeDaOperacao, onClose }: Props): JSX.Element {
  useEscapeToClose(onClose);
  const [lote, setLote] = useState("1");
  const [tarifas, setTarifas] = useState<WorkCenterCost[]>([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await listWorkCenterCosts();
        if (vivo) setTarifas(r);
      } catch (e) {
        if (vivo) setErro(errMessage(e));
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => { vivo = false; };
  }, []);

  const quantidade = Math.max(1, Number(lote) || 1);

  const linhas = useMemo<Linha[]>(() => operacoes.map((ro) => {
    const t = ro.eff_time;
    // Sem o detalhamento resolvido, cai no tempo achatado — que é como o
    // cadastro antigo ficou e continua valendo.
    const base = Math.max(1, t?.run_base_qty ?? ro.run_base_qty ?? 1);
    const ciclos = quantidade / base;
    const equipe = Math.max(1, t?.crew_size ?? ro.crew_size ?? 1);

    const setup = t?.setup_hours ?? ro.effective_setup ?? ro.setup_time ?? 0;
    const maquina = (t?.run_hours ?? ro.effective_std_time ?? ro.standard_time ?? 0) * ciclos;
    const maoDeObraUnit = t?.labor_hours ?? 0;
    const maoDeObra = (maoDeObraUnit > 0 ? maoDeObraUnit * ciclos : maquina) * equipe;
    const paradas = (t?.queue_hours ?? 0) + (t?.wait_hours ?? 0) + (t?.move_hours ?? 0);

    const tarifa = tarifas.find((c) => c.work_center_id === ro.work_center_id);
    const taxaMaquina = tarifa?.machine_cost_per_hour ?? tarifa?.cost_per_hour ?? 0;
    const taxaMaoDeObra = tarifa?.labor_cost_per_hour ?? 0;

    const horasMaquina = setup + maquina;
    return {
      sequencia: ro.sequence,
      nome: ro.operation_name || nomeDaOperacao(ro.operation_id),
      centro: ro.work_center_id,
      horasMaquina,
      horasMaoDeObra: maoDeObra,
      horasParadas: paradas,
      custoMaquina: horasMaquina * taxaMaquina,
      custoMaoDeObra: maoDeObra * taxaMaoDeObra,
      custoTerceiro: (ro.cost_per_unit ?? 0) * quantidade,
    };
  }), [operacoes, quantidade, tarifas, nomeDaOperacao]);

  const total = linhas.reduce((acc, l) => ({
    horasMaquina: acc.horasMaquina + l.horasMaquina,
    horasMaoDeObra: acc.horasMaoDeObra + l.horasMaoDeObra,
    horasParadas: acc.horasParadas + l.horasParadas,
    custo: acc.custo + l.custoMaquina + l.custoMaoDeObra + l.custoTerceiro,
  }), { horasMaquina: 0, horasMaoDeObra: 0, horasParadas: 0, custo: 0 });

  const semTarifa = linhas.some((l) => l.custoMaquina === 0 && l.custoMaoDeObra === 0 && l.custoTerceiro === 0);

  return (
    <div className="rot-backdrop" role="dialog" aria-modal="true" aria-label="Tempo e custo do roteiro">
      <div className="rot-modal">
        <header className="rot-head">
          <div>
            <div className="rot-head-title">Tempo e custo do roteiro</div>
            <div className="rot-head-sub">Simulação por tamanho de lote — nada é gravado</div>
          </div>
          <button className="erp-btn erp-btn-sm" onClick={onClose}>Fechar</button>
        </header>

        <div className="rot-body">
          <div className="rot-lote">
            <label className="erp-label">Tamanho do lote</label>
            <input className="erp-input num" type="number" min={1} step={1} value={lote}
              onChange={(e) => setLote(e.target.value)} />
            <span className="rot-hint">
              A preparação é cobrada uma vez por lote; o tempo de máquina acompanha a quantidade.
            </span>
          </div>

          {erro && <div className="erp-feedback error">{erro}</div>}
          {carregando && <div className="erp-grid-empty">Carregando tarifas de hora-máquina…</div>}

          <table className="erp-grid">
            <thead>
              <tr>
                <th>Seq.</th><th>Operação</th><th>Centro</th>
                <th className="num">Máquina</th><th className="num">Mão de obra</th><th className="num">Paradas</th>
                <th className="num">Custo</th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Roteiro sem operações.</td></tr>}
              {linhas.map((l) => (
                <tr key={l.sequencia}>
                  <td style={{ fontWeight: 600 }}>{l.sequencia}</td>
                  <td>{l.nome}</td>
                  <td>{l.centro ?? "—"}</td>
                  <td className="num">{horas(l.horasMaquina)}</td>
                  <td className="num">{horas(l.horasMaoDeObra)}</td>
                  <td className="num">{l.horasParadas ? horas(l.horasParadas) : "—"}</td>
                  <td className="num">{brl(l.custoMaquina + l.custoMaoDeObra + l.custoTerceiro)}</td>
                </tr>
              ))}
            </tbody>
            {linhas.length > 0 && (
              <tfoot>
                <tr>
                  <th colSpan={3} style={{ textAlign: "left" }}>Total do lote de {quantidade}</th>
                  <th className="num">{horas(total.horasMaquina)}</th>
                  <th className="num">{horas(total.horasMaoDeObra)}</th>
                  <th className="num">{total.horasParadas ? horas(total.horasParadas) : "—"}</th>
                  <th className="num">{brl(total.custo)}</th>
                </tr>
                <tr>
                  <td colSpan={6} style={{ textAlign: "right" }}>Custo por peça</td>
                  <td className="num" style={{ fontWeight: 700 }}>{brl(total.custo / quantidade)}</td>
                </tr>
              </tfoot>
            )}
          </table>

          {semTarifa && !carregando && (
            <div className="erp-feedback info">
              Alguma operação está sem tarifa de hora-máquina cadastrada e entrou no cálculo com custo zero.
              Cadastre o custo/hora do centro de trabalho para o total fechar.
            </div>
          )}
        </div>
      </div>

      <style>{ROT_STYLES}</style>
    </div>
  );
}

const ROT_STYLES = `
.rot-backdrop { position: fixed; inset: 0; z-index: 70; background: rgba(12,22,16,.5); display: flex; align-items: center; justify-content: center; padding: 24px; }
.rot-modal { width: min(1000px, 96vw); max-height: 90vh; display: flex; flex-direction: column; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 18px 48px rgba(0,0,0,.28); }
.rot-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 13px 18px; background: #16281d; color: #dff0e2; }
.rot-head-title { font-size: 14px; font-weight: 700; }
.rot-head-sub { font-size: 11.5px; opacity: .75; }
.rot-body { padding: 16px 18px; overflow: auto; display: flex; flex-direction: column; gap: 14px; }
.rot-lote { display: flex; flex-direction: column; gap: 4px; max-width: 260px; }
.rot-hint { font-size: 10.5px; color: #7a9a84; line-height: 1.4; }
.rot-body .erp-grid .num { text-align: right; }
`;

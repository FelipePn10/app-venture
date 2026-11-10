import type { OperationDTO, RouteDetail, RouteOperationDTO } from "@/services/manufacturingRoutingService";
import { EntityName } from "@/components/ui/EntityName";
import { loadSuppliers } from "@/services/lookups";
import { ehTerceiro, duracao, num, pecas, rotuloBase } from "./roteiroUtils";

type Props = {
  detail: RouteDetail;
  etapas: RouteOperationDTO[];
  ops: OperationDTO[];
  lote: number;
  somenteLeitura?: boolean;
  onAbrir: (ro: RouteOperationDTO) => void;
  onNova: () => void;
  onRemover: (ro: RouteOperationDTO) => void;
};

/**
 * O roteiro desenhado como ele acontece: cartões na ordem, com a cor dizendo
 * onde a etapa corre (verde na fábrica, âmbar no terceiro, cinza fantasma) e o
 * número que o planejador procura — quanto ENTRA em cada etapa para o lote
 * fechar. Embaixo, a grade com os números para quem quer conferir.
 */
export function FluxoDoRoteiro({ detail, etapas, ops, lote, somenteLeitura, onAbrir, onNova, onRemover }: Props): JSX.Element {
  const origem = (ro: RouteOperationDTO) => ro.origin ?? ops.find((o) => o.id === ro.operation_id)?.origin;
  const paralelo = detail.edges.length > 0;

  return (
    <>
      <div className="rot-fluxo" role="list" aria-label="Etapas do roteiro">
        {etapas.map((ro, i) => {
          const terceiro = ehTerceiro(origem(ro));
          const fantasma = ro.situation === "FANTASMA" || ro.situation === "INATIVA";
          const cls = fantasma ? "fantasma" : terceiro ? "terceiro" : "interna";
          const t = ro.eff_time;
          return (
            <div key={ro.id ?? i} className="rot-fluxo-item" role="listitem">
              {i > 0 && <span className="rot-fluxo-seta" aria-hidden>{paralelo ? "⋯" : "→"}</span>}
              <button className={`rot-etapa ${cls}${ro.missing_measure ? " alerta" : ""}`} onClick={() => onAbrir(ro)}
                title="Abrir a etapa para editar tempos, centros, ferramentas, documentos e inspeção">
                <span className="rot-etapa-seq">{ro.sequence}</span>
                <span className="rot-etapa-nome">{ro.operation_name}</span>
                <span className="rot-etapa-onde">
                  {terceiro
                    ? <>{(ro.supplier_id ?? ro.effective_supplier_id) ? <EntityName code={ro.supplier_id ?? ro.effective_supplier_id} loader={loadSuppliers} showCode={false} /> : "fornecedor não definido"} · {ro.effective_lead_time_days ?? "?"} dias</>
                    : (ro.work_center_name || "sem centro")}
                </span>
                {!terceiro && (
                  <span className="rot-etapa-tempo">
                    {t?.setup_hours ? `prep. ${duracao(t.setup_hours)} · ` : ""}{duracao(t?.run_hours)}
                    {(t?.run_base_qty ?? 1) !== 1 ? ` / ${num(t?.run_base_qty)}` : ""} {ro.effective_time_basis && ro.effective_time_basis !== "PECA" ? rotuloBase(ro.effective_time_basis, ro.effective_time_basis_attribute) : ""}
                  </span>
                )}
                <span className="rot-etapa-rodape">
                  <span>entra <strong>{pecas((ro.input_qty ?? 1) * lote, lote >= 100 ? 0 : 2)}</strong></span>
                  {(ro.effective_scrap_pct ?? 0) > 0 && <span className="rot-tag refugo">refugo {num(ro.effective_scrap_pct)}%</span>}
                  {ro.inspection_required && <span className="rot-tag insp">inspeção</span>}
                  {fantasma && <span className="rot-tag">{ro.situation === "FANTASMA" ? "fantasma" : "inativa"}</span>}
                  {ro.missing_measure && <span className="rot-tag erro">sem medida</span>}
                </span>
              </button>
            </div>
          );
        })}
        {!somenteLeitura && (
          <div className="rot-fluxo-item">
            {etapas.length > 0 && <span className="rot-fluxo-seta" aria-hidden>→</span>}
            <button className="rot-etapa nova" onClick={onNova}>
              <span className="rot-etapa-mais">+</span>
              <span>{etapas.length === 0 ? "Incluir a primeira etapa" : "Incluir etapa"}</span>
            </button>
          </div>
        )}
      </div>
      {paralelo && (
        <p className="erp-note" style={{ margin: "0 0 10px" }}>
          Este roteiro tem rede de dependências: a ordem dos cartões é a da sequência, mas o que roda em paralelo e o
          que sobrepõe está na aba <strong>Dependências</strong>.
        </p>
      )}

      <div className="erp-fieldset">
        <div className="erp-fieldset-head">Números das etapas — <span style={{ fontWeight: 400, opacity: .65 }}>para o lote de {num(lote, 0)} peça(s) boas</span></div>
        <div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr>
              <th style={{ width: 50 }}>Seq</th><th>Operação</th><th>Onde</th>
              <th className="num">Preparação</th><th className="num">Máquina / ciclo</th><th className="num">Ciclo produz</th>
              <th className="num">Refugo</th><th className="num">Entra</th><th className="rot-acoes-th" aria-label="Ações" />
            </tr></thead>
            <tbody>
              {etapas.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">Nenhuma etapa ainda.</td></tr>}
              {etapas.map((ro) => {
                const terceiro = ehTerceiro(origem(ro));
                return (
                  <tr key={ro.id} className={terceiro ? "fsc-rot-terceiro" : undefined}>
                    <td style={{ fontWeight: 700 }}>{ro.sequence}</td>
                    <td>{ro.operation_name}</td>
                    <td>{terceiro ? `terceiro · ${ro.effective_lead_time_days ?? "?"} dias` : (ro.work_center_name || "—")}</td>
                    <td className="num">{terceiro ? "—" : duracao(ro.eff_time?.setup_hours)}</td>
                    <td className="num">{terceiro ? "—" : duracao(ro.eff_time?.run_hours)}</td>
                    <td className="num">{terceiro ? "—" : `${num(ro.eff_time?.run_base_qty ?? 1)} ${ro.effective_time_basis && ro.effective_time_basis !== "PECA" ? rotuloBase(ro.effective_time_basis, ro.effective_time_basis_attribute).replace("por ", "") : "pç"}`}</td>
                    <td className="num">{(ro.effective_scrap_pct ?? 0) > 0 ? `${num(ro.effective_scrap_pct)}%` : "—"}</td>
                    <td className="num">{pecas((ro.input_qty ?? 1) * lote)}</td>
                    <td>
                      <div className="rot-acoes">
                        <button className="erp-btn erp-btn-sm" onClick={() => onAbrir(ro)}>Abrir</button>
                        {!somenteLeitura && <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => onRemover(ro)}>Remover</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div></div>
      </div>
    </>
  );
}

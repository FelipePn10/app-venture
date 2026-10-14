import { useEffect, useState } from "react";
import {
  type InterFactoryDTO, type ProductionPlanDTO, createProductionPlan, getInterFactories, setInterFactories,
} from "@/services/productionPlanService";
import { abrangenciaDo, demandasIndependentes } from "./planos";
import { Aviso, Painel, Selo, Vazio } from "../planUi";
import { dataHora } from "../planFormat";
import { useAcao } from "../planHooks";

type Abrangencia = "todos" | "classificacao" | "ordem";
const NOVO = { code: "", name: "", abrangencia: "todos" as Abrangencia, classification: "", class_item_codes: "", order_item_code: "" };


/**
 * Planos que o MRP roda e as empresas inter-fábrica de cada um. A lista abria
 * vazia até alguém clicar "Listar planos"; agora carrega sozinha, mostra quando
 * cada plano foi calculado e escolher um plano aqui troca o plano da tela toda.
 */
export function PlanosTab({ planos, plano, onEscolher, onRecarregar }: {
  planos: ProductionPlanDTO[];
  plano?: number;
  onEscolher: (code: number) => void;
  onRecarregar: () => Promise<void>;
}): JSX.Element {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [novo, setNovo] = useState(NOVO);
  const [inter, setInter] = useState<InterFactoryDTO[]>([]);
  const [interForm, setInterForm] = useState({ code: "", autoRelease: false });

  useEffect(() => {
    if (!plano) { setInter([]); return; }
    let vivo = true;
    getInterFactories(plano).then((l) => { if (vivo) setInter(l); }).catch(() => { if (vivo) setInter([]); });
    return () => { vivo = false; };
  }, [plano]);

  const criar = () => run(async () => {
    const code = Number(novo.code);
    if (!code || code <= 0) { setFeedback({ type: "error", message: "Informe um código de plano positivo." }); return; }
    if (!novo.name.trim()) { setFeedback({ type: "error", message: "Informe o nome do plano." }); return; }
    if (novo.abrangencia === "classificacao" && !novo.classification.trim()) { setFeedback({ type: "error", message: "Informe a classificação a que o plano se aplica." }); return; }
    if (novo.abrangencia === "ordem" && !Number(novo.order_item_code)) { setFeedback({ type: "error", message: "Informe o item da ordem." }); return; }
    await createProductionPlan({
      code, name: novo.name.trim(), planning_types: ["MRP"],
      classification: novo.abrangencia === "classificacao" ? novo.classification.trim() : undefined,
      class_item_codes: novo.abrangencia === "classificacao" && novo.class_item_codes.trim() ? novo.class_item_codes.trim() : undefined,
      order_item_code: novo.abrangencia === "ordem" ? Number(novo.order_item_code) : undefined,
    });
    setNovo(NOVO);
    await onRecarregar();
    onEscolher(code);
    setFeedback({ type: "success", message: `Plano ${code} criado e selecionado. Rode o MRP na barra acima.` });
  });

  const salvarInter = (lista: InterFactoryDTO[], msg: string) => run(async () => {
    if (!plano) return;
    setInter(await setInterFactories(plano, lista));
    setFeedback({ type: "success", message: msg });
  });
  const associar = () => {
    const code = Number(interForm.code);
    if (!code) { setFeedback({ type: "error", message: "Informe o código da empresa de origem." }); return; }
    if (inter.some((f) => f.source_enterprise_code === code)) { setFeedback({ type: "error", message: "Essa empresa já está associada ao plano." }); return; }
    setInterForm({ code: "", autoRelease: false });
    void salvarInter([...inter, { source_enterprise_code: code, auto_release: interForm.autoRelease }], `Empresa ${code} associada ao plano ${plano}.`);
  };

  return (
    <>
      <Aviso feedback={feedback} busy={busy} />
      <Painel titulo="Planos de produção" sub={`${planos.length} plano(s)`} flush
        acoes={<button className="erp-btn erp-btn-sm" onClick={() => void run(onRecarregar)} disabled={busy}>Atualizar</button>}>
        {planos.length === 0
          ? <Vazio titulo="Nenhum plano cadastrado" texto="Crie o primeiro plano abaixo. O MRP sempre roda sobre um plano." />
          : (
            <table className="erp-grid">
              <thead><tr><th>Plano</th><th>Abrangência</th><th>Demandas independentes</th><th>Modos</th><th>Último cálculo</th><th>Situação</th><th /></tr></thead>
              <tbody>{planos.map((p) => (
                <tr key={p.code} className={`vpl-click${plano === p.code ? " erp-row-sel" : ""}`} onClick={() => onEscolher(p.code)}>
                  <td className="vpl-strong">{p.code} · {p.name}</td>
                  <td>{abrangenciaDo(p)}</td>
                  <td>{demandasIndependentes(p.independent_demands)}</td>
                  <td>{(p.planning_types ?? []).join(", ") || "—"}</td>
                  <td>{p.last_calculated_at ? dataHora(p.last_calculated_at) : <span className="erp-text-muted">Nunca calculado</span>}</td>
                  <td>{p.is_active ? <Selo tom="ok">Ativo</Selo> : <Selo tom="muted">Inativo</Selo>}</td>
                  <td className="vpl-actions">{plano === p.code ? <Selo tom="info">Em uso na tela</Selo> : <button className="erp-btn erp-btn-sm" onClick={(e) => { e.stopPropagation(); onEscolher(p.code); }}>Usar este plano</button>}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
      </Painel>

      <div className="vpl-cols">
        <Painel titulo="Novo plano">
          <div className="erp-fieldset-body" style={{ padding: 0 }}>
            <div className="erp-field erp-c4"><label className="erp-label erp-req" htmlFor="pl-code">Código</label>
              <input id="pl-code" className="erp-input num" type="number" min={1} value={novo.code} onChange={(e) => setNovo((p) => ({ ...p, code: e.target.value }))} /></div>
            <div className="erp-field erp-c8"><label className="erp-label erp-req" htmlFor="pl-name">Nome</label>
              <input id="pl-name" className="erp-input" value={novo.name} onChange={(e) => setNovo((p) => ({ ...p, name: e.target.value }))} /></div>
            <div className="erp-field erp-c12"><label className="erp-label" htmlFor="pl-abr">Abrangência</label>
              <select id="pl-abr" className="erp-input" value={novo.abrangencia} onChange={(e) => setNovo((p) => ({ ...p, abrangencia: e.target.value as Abrangencia }))}>
                <option value="todos">Todos os itens</option><option value="classificacao">Uma classificação</option><option value="ordem">Um item de ordem</option>
              </select></div>
            {novo.abrangencia === "classificacao" && (<>
              <div className="erp-field erp-c5"><label className="erp-label erp-req" htmlFor="pl-class">Classificação</label>
                <input id="pl-class" className="erp-input" value={novo.classification} onChange={(e) => setNovo((p) => ({ ...p, classification: e.target.value }))} /></div>
              <div className="erp-field erp-c7"><label className="erp-label" htmlFor="pl-class-it">Itens da classificação</label>
                <input id="pl-class-it" className="erp-input" placeholder="100,101,102 — vazio pega todos" value={novo.class_item_codes} onChange={(e) => setNovo((p) => ({ ...p, class_item_codes: e.target.value }))} /></div>
            </>)}
            {novo.abrangencia === "ordem" && (
              <div className="erp-field erp-c6"><label className="erp-label erp-req" htmlFor="pl-ordem">Item da ordem</label>
                <input id="pl-ordem" className="erp-input num" type="number" value={novo.order_item_code} onChange={(e) => setNovo((p) => ({ ...p, order_item_code: e.target.value }))} />
                <span className="erp-hint">Não combina com filtro de classificação.</span></div>
            )}
            <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" style={{ alignSelf: "flex-start" }} onClick={() => void criar()} disabled={busy}>Criar plano</button></div>
          </div>
        </Painel>

        <Painel titulo="Empresas inter-fábrica" sub={plano ? `plano ${plano}` : "escolha um plano"}>
          {!plano ? <p className="erp-hint">Escolha um plano para ver as empresas de origem.</p> : (<>
            <p className="erp-note" style={{ marginBottom: 12 }}>Ordens <strong>inter-fábrica</strong> destas empresas entram como demanda no plano {plano}.</p>
            <div className="vpl-filters">
              <div className="erp-field"><label className="erp-label" htmlFor="if-code">Empresa de origem (código)</label>
                <input id="if-code" className="erp-input num" type="number" value={interForm.code} onChange={(e) => setInterForm((s) => ({ ...s, code: e.target.value }))} /></div>
              <label className="erp-check"><input type="checkbox" checked={interForm.autoRelease} onChange={(e) => setInterForm((s) => ({ ...s, autoRelease: e.target.checked }))} />Liberação automática</label>
              <button className="erp-btn erp-btn-primary" onClick={associar} disabled={busy}>Associar</button>
            </div>
            {inter.length > 0 ? (
              <table className="erp-grid" style={{ marginTop: 12 }}>
                <thead><tr><th>Empresa de origem</th><th>Liberação automática</th><th /></tr></thead>
                <tbody>{inter.map((f) => (
                  <tr key={f.source_enterprise_code}>
                    <td className="vpl-strong">{f.source_enterprise_code}</td><td>{f.auto_release ? "Sim" : "Não"}</td>
                    <td className="vpl-actions"><button className="erp-btn erp-btn-sm erp-btn-danger" disabled={busy}
                      onClick={() => void salvarInter(inter.filter((x) => x.source_enterprise_code !== f.source_enterprise_code), `Empresa ${f.source_enterprise_code} removida do plano ${plano}.`)}>Remover</button></td>
                  </tr>
                ))}</tbody>
              </table>
            ) : <p className="erp-hint" style={{ marginTop: 10 }}>Nenhuma empresa associada.</p>}
          </>)}
        </Painel>
      </div>
    </>
  );
}

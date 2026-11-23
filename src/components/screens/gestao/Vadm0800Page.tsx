import { useCallback, useEffect, useMemo, useState } from "react";
import { painelImplantacao, type PainelImplantacao } from "@/services/gestaoService";
import { ExportButton } from "@/components/ui/ExportButton";
import { Abas, Aviso, Cabecalho, Kpis, Painel, Progresso, Rodape, Selo, Vazio, type Aba } from "../planejamento/planUi";
import { useAcao } from "../planejamento/planHooks";
import { abrirTela } from "./gestaoFmt";

/**
 * Painel de Implantação (VADM0800): o placar do que falta cadastrar para a
 * empresa rodar o ERP inteiro. Cada verificação diz quantos registros estão
 * pendentes, como corrigir e abre a tela que corrige.
 */
type Filtro = "pendentes" | "todos";

export function Vadm0800Page(): JSX.Element {
  const { busy, feedback, run } = useAcao();
  const [painel, setPainel] = useState<PainelImplantacao | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("pendentes");
  const [area, setArea] = useState<string>("");

  const carregar = useCallback(async () => { setPainel(await painelImplantacao()); }, []);
  useEffect(() => { void run(carregar); }, [run, carregar]);

  const areas = useMemo(() => {
    const m = new Map<string, { total: number; prontos: number }>();
    for (const i of painel?.items ?? []) {
      const a = m.get(i.area) ?? { total: 0, prontos: 0 };
      a.total += 1; if (i.ready) a.prontos += 1; m.set(i.area, a);
    }
    return [...m.entries()];
  }, [painel]);

  const visiveis = useMemo(() => (painel?.items ?? [])
    .filter((i) => filtro === "todos" || !i.ready)
    .filter((i) => !area || i.area === area)
    .sort((a, b) => Number(a.ready) - Number(b.ready) || b.weight - a.weight || b.pending - a.pending), [painel, filtro, area]);

  const pendentes = (painel?.items ?? []).filter((i) => !i.ready).length;
  const ABAS: Aba<Filtro>[] = [
    { id: "pendentes", label: "O que falta", contador: pendentes, alerta: true },
    { id: "todos", label: "Todas as verificações", contador: painel?.items.length },
  ];
  const tomGeral = !painel ? "muted" : painel.percent >= 90 ? "ok" : painel.percent >= 60 ? "warn" : "danger";

  return (
    <div className="erp-screen">
      <Cabecalho modulo="Cadastros" titulo="Painel de Implantação" codigo="VADM0800" />
      <div className="erp-toolbar vpl-toolbar">
        <div className="erp-tgroup"><button className="erp-btn erp-btn-primary" onClick={() => void run(carregar)} disabled={busy}>Atualizar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Área</span>
          <select className="erp-input" style={{ width: 200 }} value={area} onChange={(e) => setArea(e.target.value)} aria-label="Filtrar por área">
            <option value="">Todas as áreas</option>
            {areas.map(([a]) => <option key={a} value={a}>{a}</option>)}
          </select></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VADM0800 — Painel de Implantação" filename="vadm0800" build={() => ({
          columns: ["Área", "Verificação", "Pendentes", "Universo", "Pronto (%)", "Como corrigir", "Tela"],
          rows: visiveis.map((i) => [i.area, i.title, String(i.pending), String(i.total), String(i.percent), i.how_to_fix, `${i.screen} ${i.screen_name}`]),
        })} /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-detail-body">
            <Aviso feedback={feedback} busy={busy} />
            {!painel ? <Vazio titulo="Carregando o placar…" /> : (<>
              <Kpis itens={[
                { label: "Implantação", value: `${painel.percent}%`, hint: "ponderada pela importância de cada verificação", tom: tomGeral },
                { label: "Verificações prontas", value: `${painel.ready_count} de ${painel.total_count}`, tom: "info" },
                { label: "Faltando", value: String(pendentes), hint: pendentes ? "clique em uma linha para abrir a tela que corrige" : "tudo pronto", tom: pendentes ? "warn" : "ok" },
              ]} />
              <div className="vpl-cols wide-left">
                <div>
                  <Abas abas={ABAS} ativa={filtro} onChange={setFiltro} />
                  {visiveis.length === 0
                    ? <Vazio titulo={filtro === "pendentes" ? "Nada pendente aqui" : "Nenhuma verificação"} texto={filtro === "pendentes" ? "Todas as verificações desta área estão prontas." : undefined} />
                    : visiveis.map((i) => (
                      <div key={i.key} className="vpl-record">
                        <div className="vpl-record-main">
                          <div className="vpl-record-title">
                            <Selo tom={i.ready ? "ok" : i.weight >= 3 ? "danger" : "warn"}>{i.ready ? "Pronto" : `${i.pending} pendente(s)`}</Selo>{" "}
                            {i.title}
                          </div>
                          <div className="vpl-record-sub">{i.area}{i.total > 0 ? ` · ${i.total - i.pending} de ${i.total} certo(s)` : ""}</div>
                          {!i.ready && <p className="erp-note" style={{ margin: "6px 0 0" }}>{i.how_to_fix}</p>}
                          {i.total > 0 && <Progresso valor={i.total - i.pending} total={i.total} tom={i.ready ? undefined : "warn"} />}
                        </div>
                        <div className="vpl-record-actions">
                          {i.screen && <button className="erp-btn erp-btn-sm" onClick={() => abrirTela(i.screen)} title={`Abrir ${i.screen} — ${i.screen_name}`}>Abrir {i.screen}</button>}
                        </div>
                      </div>
                    ))}
                </div>
                <Painel titulo="Por área" sub="verificações prontas">
                  {areas.map(([a, v]) => (
                    <button key={a} type="button" onClick={() => setArea(area === a ? "" : a)} aria-pressed={area === a}
                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "7px 8px", border: 0, borderRadius: 6, cursor: "pointer", textAlign: "left",
                        background: area === a ? "var(--v-surface-2, #f1f5f9)" : "transparent", font: "inherit" }}>
                      <strong style={{ minWidth: 110, fontSize: 12.5 }}>{a}</strong>
                      <span style={{ flex: 1 }}><Progresso valor={v.prontos} total={v.total} tom={v.prontos === v.total ? undefined : "warn"} /></span>
                      <span className="erp-text-muted" style={{ fontSize: 11.5 }}>{v.prontos}/{v.total}</span>
                    </button>
                  ))}
                </Painel>
              </div>
            </>)}
          </div>
        </section>
      </div>
      <Rodape>
        <div className="erp-status-item">Implantação: <strong>{painel ? `${painel.percent}%` : "—"}</strong></div>
        <div className="erp-status-item">Faltando: <strong>{pendentes}</strong></div>
      </Rodape>
    </div>
  );
}

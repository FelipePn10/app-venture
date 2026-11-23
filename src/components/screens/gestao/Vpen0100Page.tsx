import { useCallback, useEffect, useMemo, useState } from "react";
import { pendenciasDoDia, type Pendencia, type Severidade } from "@/services/gestaoService";
import { Aviso, Cabecalho, Kpis, Painel, Rodape, Selo, Vazio } from "../planejamento/planUi";
import { data, num, type Tom } from "../planejamento/planFormat";
import { useAcao } from "../planejamento/planHooks";
import { abrirTela, reais } from "./gestaoFmt";

/**
 * Central de Pendências (VPEN0100): o que o perfil do usuário tem a resolver
 * hoje, agrupado por área e ordenado pela gravidade. O backend só devolve o
 * que tem quantidade e o que o perfil pode ver; cada cartão abre a tela que resolve.
 */
const SEVERIDADE: Record<Severidade, { rotulo: string; tom: Tom; ordem: number }> = {
  ALTA: { rotulo: "Urgente", tom: "danger", ordem: 0 }, MEDIA: { rotulo: "Atenção", tom: "warn", ordem: 1 }, BAIXA: { rotulo: "Rotina", tom: "info", ordem: 2 },
};
const ATUALIZAR_MS = 5 * 60 * 1000;

export function Vpen0100Page(): JSX.Element {
  const { busy, feedback, run } = useAcao();
  const [lista, setLista] = useState<Pendencia[] | null>(null);
  const [lidoEm, setLidoEm] = useState<Date | null>(null);

  const carregar = useCallback(async () => { setLista(await pendenciasDoDia()); setLidoEm(new Date()); }, []);
  useEffect(() => {
    void run(carregar);
    const t = window.setInterval(() => void run(carregar), ATUALIZAR_MS);
    return () => window.clearInterval(t);
  }, [run, carregar]);

  const porArea = useMemo(() => {
    const m = new Map<string, Pendencia[]>();
    for (const p of [...(lista ?? [])].sort((a, b) => SEVERIDADE[a.severity].ordem - SEVERIDADE[b.severity].ordem || b.count - a.count)) {
      m.set(p.area, [...(m.get(p.area) ?? []), p]);
    }
    return [...m.entries()].sort((a, b) => SEVERIDADE[a[1][0].severity].ordem - SEVERIDADE[b[1][0].severity].ordem);
  }, [lista]);
  const conta = (s: Severidade) => (lista ?? []).filter((p) => p.severity === s).reduce((t, p) => t + p.count, 0);

  return (
    <div className="erp-screen">
      <Cabecalho modulo="Início" titulo="Central de Pendências" codigo="VPEN0100" meta={lidoEm ? `atualizado às ${lidoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : undefined} />
      <div className="erp-toolbar vpl-toolbar">
        <div className="erp-tgroup"><button className="erp-btn erp-btn-primary" onClick={() => void run(carregar)} disabled={busy}>Atualizar</button></div>
        <span className="erp-hint">Atualiza sozinha a cada 5 minutos.</span>
      </div>
      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-detail-body">
            <Aviso feedback={feedback} busy={busy} />
            {lista === null ? <Vazio titulo="Lendo as pendências…" /> : lista.length === 0
              ? <Vazio titulo="Nada pendente para o seu perfil" texto="Quando aparecer OF atrasada, nota a conferir, título vencido ou peça parada no terceiro, ela entra aqui." />
              : (<>
                <Kpis itens={[
                  { label: "Urgentes", value: num(conta("ALTA"), 0), tom: conta("ALTA") ? "danger" : "ok" },
                  { label: "Atenção", value: num(conta("MEDIA"), 0), tom: conta("MEDIA") ? "warn" : "ok" },
                  { label: "Rotina", value: num(conta("BAIXA"), 0), tom: "info" },
                ]} />
                <div className="vpl-cols">
                  {porArea.map(([area, itens]) => (
                    <Painel key={area} titulo={area} sub={`${itens.reduce((t, p) => t + p.count, 0)} registro(s)`}>
                      {itens.map((p) => {
                        const s = SEVERIDADE[p.severity];
                        return (
                          <div key={p.key} className="vpl-record">
                            <div className="vpl-record-main">
                              <div className="vpl-record-title"><Selo tom={s.tom}>{s.rotulo}</Selo> <strong>{num(p.count, 0)}</strong> · {p.title}</div>
                              <div className="vpl-record-sub">
                                {p.value ? `${reais(p.value)} · ` : ""}{p.oldest ? `mais antiga de ${data(p.oldest)}` : ""}
                              </div>
                            </div>
                            <div className="vpl-record-actions">
                              {p.screen && <button className="erp-btn erp-btn-sm" onClick={() => abrirTela(p.screen)}>Resolver em {p.screen}</button>}
                            </div>
                          </div>
                        );
                      })}
                    </Painel>
                  ))}
                </div>
              </>)}
          </div>
        </section>
      </div>
      <Rodape><div className="erp-status-item">Pendências: <strong>{(lista ?? []).reduce((t, p) => t + p.count, 0)}</strong></div></Rodape>
    </div>
  );
}

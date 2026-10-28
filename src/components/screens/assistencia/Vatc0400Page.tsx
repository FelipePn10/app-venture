import { useCallback, useEffect, useState } from "react";
import { type GrupoCusto, type IndicadoresPosVenda, indicadoresPosVenda } from "@/services/posVendaService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Num = string | number;
const brl = (v?: Num) => Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (v?: Num, casas = 1) => (v === undefined || v === null ? "—" : Number(v).toLocaleString("pt-BR", { maximumFractionDigits: casas }));
const pct = (v?: Num) => (v === undefined || v === null ? "—" : `${num(v, 2)}%`);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function Cartao({ titulo, valor, sub, id }: { titulo: string; valor: string; sub?: string; id?: string }): JSX.Element {
  return (
    <div className="erp-field erp-c3" id={id}>
      <div style={{ border: "1px solid var(--v-border, #ddd)", borderRadius: 6, padding: "10px 12px" }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>{titulo}</div>
        <div style={{ fontSize: 20, fontWeight: 600 }}>{valor}</div>
        {sub && <div style={{ fontSize: 12, opacity: 0.7 }}>{sub}</div>}
      </div>
    </div>
  );
}

function TabelaCusto({ titulo, linhas, rotulo }: { titulo: string; linhas: GrupoCusto[]; rotulo: string }): JSX.Element {
  return (
    <div className="erp-field erp-c4" style={{ overflowX: "auto" }}>
      <label className="erp-label">{titulo}</label>
      <table className="erp-grid">
        <thead><tr><th>{rotulo}</th><th>OS</th><th>Garantia</th><th>Cobrado</th></tr></thead>
        <tbody>
          {linhas.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Sem OS no período.</td></tr>}
          {linhas.map((g) => (
            <tr key={`${g.chave}-${g.descricao}`}><td>{g.chave && g.chave !== g.descricao ? `${g.chave} · ` : ""}{g.descricao}</td><td>{g.os}</td><td>{brl(g.custo_garantia)}</td><td>{brl(g.cobrado)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * VATC0400 — Indicadores do Pós-venda. Custo da garantia (o que a empresa
 * absorve) por item, defeito e lote; quanto foi recuperado dos fornecedores;
 * taxa de falha e MTBF da base instalada; cumprimento do SLA e tempo médio de
 * atendimento. É o painel de garantia do SAP CS/Oracle Service para decidir
 * onde agir na engenharia, na qualidade e nas compras.
 */
export function Vatc0400Page(): JSX.Element {
  const hoje = new Date();
  const [periodo, setPeriodo] = useState({ de: iso(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 89)), ate: iso(hoje) });
  const [dados, setDados] = useState<IndicadoresPosVenda | null>(null);
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  const consultar = useCallback(async () => {
    setBusy(true); setErro("");
    try { setDados(await indicadoresPosVenda(periodo)); } catch (e) { setErro(errMessage(e, "Falha ao calcular os indicadores.")); } finally { setBusy(false); }
  }, [periodo]);
  useEffect(() => { void consultar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const r = dados?.resumo;
  const s = dados?.sla;
  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Assistência</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Indicadores do Pós-venda</span><span className="erp-crumb-code">VATC0400</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>
      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Consulta</span><button className="erp-btn" onClick={() => void consultar()} disabled={busy}>Atualizar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span><ExportButton title="VATC0400 — Indicadores do Pós-venda" filename="vatc0400" /></div>
      </div>
      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-detail-body">
            {erro && <div className="erp-feedback error">{erro}</div>}
            <div className="erp-fieldset"><div className="erp-fieldset-head">Período</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label">De</label><input className="erp-input" type="date" value={periodo.de} onChange={(e) => setPeriodo((p) => ({ ...p, de: e.target.value }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Até</label><input className="erp-input" type="date" value={periodo.ate} onChange={(e) => setPeriodo((p) => ({ ...p, ate: e.target.value }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">&nbsp;</label><button className="erp-btn erp-btn-primary" onClick={() => void consultar()} disabled={busy}>Calcular</button></div>
            </div></div>

            {r && s && dados && (<>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Resumo</div><div className="erp-fieldset-body">
                <Cartao id="ind-garantia" titulo="Custo da garantia" valor={brl(r.custo_garantia)} sub={`${r.os_concluidas} OS concluída(s)`} />
                <Cartao id="ind-recuperado" titulo="Recuperado de fornecedores" valor={brl(r.recuperado_fornecedor)} sub={`reclamado ${brl(r.reclamado_fornecedor)}`} />
                <Cartao id="ind-liquido" titulo="Custo líquido da garantia" valor={brl(r.custo_liquido)} />
                <Cartao titulo="Cobrado dos clientes" valor={brl(r.cobrado)} />
                <Cartao titulo="Chamados no período" valor={String(r.chamados)} sub={`${r.chamados_com_capa} com CAPA`} />
                <Cartao titulo="Tempo médio de atendimento" valor={r.mttr_horas !== undefined ? `${num(r.mttr_horas)} h` : "—"} sub="início → conclusão da OS" />
                <Cartao id="ind-sla-resp" titulo="SLA de resposta cumprido" valor={pct(s.resposta_pct)} sub={`${s.resposta_cumprida} de ${s.resposta_avaliada} prazos decididos`} />
                <Cartao titulo="SLA de solução cumprido" valor={pct(s.solucao_pct)} sub={`${s.solucao_cumprida} de ${s.solucao_avaliada} prazos decididos`} />
              </div></div>

              <div className="erp-fieldset"><div className="erp-fieldset-head">Custo da garantia</div><div className="erp-fieldset-body">
                <TabelaCusto titulo="Por item" rotulo="Item" linhas={dados.por_item} />
                <TabelaCusto titulo="Por defeito" rotulo="Motivo do defeito" linhas={dados.por_defeito} />
                <TabelaCusto titulo="Por lote" rotulo="Lote" linhas={dados.por_lote} />
              </div></div>

              <div className="erp-fieldset"><div className="erp-fieldset-head">Confiabilidade da base instalada</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                  <table className="erp-grid" id="ind-confiabilidade">
                    <thead><tr><th>Item</th><th>Em campo</th><th>Falharam no período</th><th>Taxa de falha</th><th>Falhas (total)</th><th>Dias em campo</th><th>MTBF (dias)</th></tr></thead>
                    <tbody>
                      {dados.confiabilidade.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhum item com série vendida.</td></tr>}
                      {dados.confiabilidade.map((c) => (
                        <tr key={c.item_code}><td>{c.item_code} · {c.item_nome}</td><td>{c.em_campo}</td><td>{c.falharam_no_periodo}</td><td>{pct(c.taxa_falha)}</td>
                          <td>{c.falhas_totais}</td><td>{num(c.dias_em_campo, 0)}</td><td>{num(c.mtbf_dias)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="erp-field erp-c12"><small>Taxa de falha: séries que tiveram chamado no período ÷ séries no cliente. MTBF: dias de operação de todas as séries (da instalação, ou da venda) ÷ falhas registradas. Custo da garantia: horas, peças e despesas não cobradas das OS concluídas no período, pelo custo.</small></div>
              </div></div>
            </>)}
          </div>
        </section>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import {
  type OrdemServico, type OrdemServicoCompleta, type ParametrosOS, type SituacaoOS, ROTULO_DESPESA, ROTULO_SITUACAO_OS,
  abrirOS, acaoOS, listarOS, obterOS, parametrosOS, removerLancamentoOS, salvarParametrosOS, abrirCapaDoChamado, abrirRecuperacao,
} from "@/services/posVendaService";
import { type TACallDTO, getCall } from "@/services/technicalAssistanceService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadCustomers, loadEmployees, loadItems, loadSuppliers, loadTechnicalAssistanceCalls, loadWarehouses } from "@/services/lookups";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Num = string | number;
const brl = (v?: Num) => Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const qtd = (v?: Num) => Number(v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
const dataHora = (s?: string) => (s ? new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");
const dataBR = (s?: string) => (s ? new Date(s.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR") : "—");
const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const COR: Record<SituacaoOS, string> = {
  ABERTA: "erp-badge-blue", AGENDADA: "erp-badge-blue", EM_EXECUCAO: "erp-badge-amber", CONCLUIDA: "erp-badge-green", FATURADA: "erp-badge-green", CANCELADA: "erp-badge-gray",
};
const PARAMETROS_VAZIOS: ParametrosOS = { custo_hora: "", preco_hora: "", custo_km: "", preco_km: "", item_servico: "" };
const ABERTURA_VAZIA = { chamado: undefined as number | undefined, item: undefined as number | undefined, local: "CLIENTE" as "CLIENTE" | "FABRICA",
  tecnico: undefined as number | undefined, agenda: "", obs: "" };

function cobertura(o: OrdemServico): string {
  if (!o.em_garantia) return "Fora da garantia — tudo é cobrado";
  const cobre = [o.cobre_pecas && "peças", o.cobre_mao_obra && "mão de obra", o.cobre_deslocamento && "deslocamento"].filter(Boolean).join(", ");
  return `Em garantia — cobre ${cobre || "nada"}`;
}

/**
 * VATC0300 — Ordem de Serviço. O atendimento do chamado no cliente (técnico
 * de campo) ou na fábrica (o equipamento entra na assistência): agenda,
 * técnico, horas, peças do estoque, despesas de viagem, defeito constatado e
 * solução. A garantia do item do chamado decide o que é cobrado; o
 * faturamento gera o pedido de venda do que o cliente paga. Equivale à OS do
 * SIGATEC (TOTVS) e à ordem de serviço do Customer Service do SAP.
 */
export function Vatc0300Page(): JSX.Element {
  const [aba, setAba] = useState<"ordens" | "parametros">("ordens");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const [filtro, setFiltro] = useState({ situacao: "", cliente: undefined as number | undefined, tecnico: undefined as number | undefined });
  const [lista, setLista] = useState<OrdemServico[]>([]);
  const [aberta, setAberta] = useState<OrdemServicoCompleta | null>(null);
  const [nova, setNova] = useState({ ...ABERTURA_VAZIA });
  const [chamado, setChamado] = useState<TACallDTO | null>(null);
  const [par, setPar] = useState<ParametrosOS>(PARAMETROS_VAZIOS);

  const [agenda, setAgenda] = useState({ quando: "", tecnico: undefined as number | undefined });
  const [hora, setHora] = useState({ data: hojeISO(), tipo: "TRABALHO", horas: "", obs: "" });
  const [peca, setPeca] = useState({ item: undefined as string | undefined, quantidade: "1", almox: undefined as number | undefined, preco: "" });
  const [despesa, setDespesa] = useState({ tipo: "KM", quantidade: "", custo: "", preco: "", obs: "" });
  const [conclusao, setConclusao] = useState({ defeito: "", solucao: "" });
  const [motivo, setMotivo] = useState("");
  const [capaMetodo, setCapaMetodo] = useState("8D");
  const [rec, setRec] = useState({ fornecedor: undefined as number | undefined, valor: "", motivo: "" });

  async function abrirCapa(os: OrdemServicoCompleta) {
    setBusy(true); setFeedback(null);
    try {
      const c = await abrirCapaDoChamado(os.call_code, { call_item_code: os.call_item_code, metodo: capaMetodo });
      setFeedback({ type: "success", message: `CAPA ${c.numero} aberta como reclamação do cliente (VINS0500).` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function cobrarFornecedor(os: OrdemServicoCompleta) {
    if (!rec.fornecedor) return;
    setBusy(true); setFeedback(null);
    try {
      const r = await abrirRecuperacao({ supplier_code: rec.fornecedor, os_id: os.id, motivo: rec.motivo || os.defeito_constatado || "Falha em garantia",
        valor_reclamado: (rec.valor || String(os.totais.custo_garantia)).replace(",", ".") });
      setRec({ fornecedor: undefined, valor: "", motivo: "" });
      setFeedback({ type: "success", message: `Reclamação ${r.numero} aberta ao fornecedor (VATC0320).` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const recarregar = useCallback(async () => {
    setBusy(true);
    try { setLista(await listarOS({ situacao: filtro.situacao, cliente: filtro.cliente, tecnico: filtro.tecnico })); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao consultar as ordens de serviço.") }); }
    finally { setBusy(false); }
  }, [filtro]);
  useEffect(() => { void recarregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (aba === "parametros") parametrosOS().then((p) => setPar({ ...PARAMETROS_VAZIOS, ...p })).catch((e) => setFeedback({ type: "error", message: errMessage(e) }));
  }, [aba]);
  useEffect(() => {
    setChamado(null);
    if (nova.chamado) getCall(nova.chamado).then(setChamado).catch(() => setChamado(null));
  }, [nova.chamado]);

  function mostrar(o: OrdemServicoCompleta) {
    setAberta(o);
    setAgenda({ quando: o.agendada_para ? o.agendada_para.slice(0, 16) : "", tecnico: o.tecnico_code });
    setConclusao({ defeito: o.defeito_constatado ?? "", solucao: o.solucao ?? "" });
  }

  async function abrir(id: number) {
    setBusy(true);
    try { mostrar(await obterOS(id)); setMotivo(""); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function executar(fn: () => Promise<OrdemServicoCompleta>, ok: string, depois?: () => void) {
    setBusy(true); setFeedback(null);
    try { mostrar(await fn()); depois?.(); await recarregar(); setFeedback({ type: "success", message: ok }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function criar() {
    if (!nova.chamado) { setFeedback({ type: "error", message: "Escolha o chamado." }); return; }
    await executar(() => abrirOS({ call_code: nova.chamado!, call_item_code: nova.item, local: nova.local, tecnico_code: nova.tecnico,
      agendada_para: nova.agenda || undefined, observacoes: nova.obs || undefined }), "Ordem de serviço aberta.", () => setNova({ ...ABERTURA_VAZIA }));
  }

  async function salvarParametros() {
    setBusy(true); setFeedback(null);
    try { setPar({ ...PARAMETROS_VAZIOS, ...(await salvarParametrosOS(par)) }); setFeedback({ type: "success", message: "Parâmetros da OS salvos." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const o = aberta;
  const lanca = o && (o.situacao === "EM_EXECUCAO" || o.situacao === "CONCLUIDA");
  const pecaCobrada = o ? !(o.em_garantia && o.cobre_pecas) : false;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Assistência</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Ordem de Serviço</span><span className="erp-crumb-code">VATC0300</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>
      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Visão</span>
          <button className={`erp-btn ${aba === "ordens" ? "erp-btn-primary" : ""}`} onClick={() => setAba("ordens")}>Ordens</button>
          <button className={`erp-btn ${aba === "parametros" ? "erp-btn-primary" : ""}`} onClick={() => setAba("parametros")}>Parâmetros</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Consulta</span><button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Atualizar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span><ExportButton title="VATC0300 — Ordem de Serviço" filename="vatc0300" /></div>
      </div>
      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            {aba === "parametros" && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Parâmetros da OS — <span style={{ fontWeight: 400, opacity: 0.65 }}>valores sugeridos nos lançamentos</span></div><div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label">Custo da hora do técnico</label><input className="erp-input" inputMode="decimal" value={par.custo_hora} onChange={(e) => setPar((p) => ({ ...p, custo_hora: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Preço da hora cobrada</label><input className="erp-input" inputMode="decimal" value={par.preco_hora} onChange={(e) => setPar((p) => ({ ...p, preco_hora: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Custo do km</label><input className="erp-input" inputMode="decimal" value={par.custo_km} onChange={(e) => setPar((p) => ({ ...p, custo_km: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Preço do km cobrado</label><input className="erp-input" inputMode="decimal" value={par.preco_km} onChange={(e) => setPar((p) => ({ ...p, preco_km: e.target.value }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label">Almoxarifado das peças</label>
                  <LookupField value={par.warehouse_id} loader={loadWarehouses} entityLabel="almoxarifado" placeholder="Selecionar" onChange={(c) => setPar((p) => ({ ...p, warehouse_id: c ?? undefined }))} /></div>
                <div className="erp-field erp-c5"><label className="erp-label">Item de serviço (mão de obra e despesas no pedido)</label>
                  <LookupField<string> value={par.item_servico || undefined} loader={loadItems} entityLabel="item" placeholder="Selecionar item de serviço" onChange={(c) => setPar((p) => ({ ...p, item_servico: c ?? "" }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">&nbsp;</label><button className="erp-btn erp-btn-primary" onClick={() => void salvarParametros()} disabled={busy}>Salvar parâmetros</button></div>
                <div className="erp-field erp-c12"><small>Cada lançamento pode ter outro valor. O item de serviço entra no pedido do faturamento com o total das horas e despesas cobradas; as peças cobradas entram como itens próprios e saem do estoque pela NF do pedido.</small></div>
              </div></div>
            )}

            {aba === "ordens" && (<>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Abrir OS a partir do chamado</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label erp-req">Chamado</label>
                  <LookupField value={nova.chamado} loader={loadTechnicalAssistanceCalls} entityLabel="chamado" placeholder="Selecionar" onChange={(c) => setNova((x) => ({ ...x, chamado: c ?? undefined, item: undefined }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label">Item do chamado (decide a garantia)</label>
                  <select className="erp-input" id="os-item-chamado" value={nova.item ?? ""} onChange={(e) => setNova((x) => ({ ...x, item: e.target.value ? Number(e.target.value) : undefined }))}>
                    <option value="">Sem item — atendimento cobrado</option>
                    {(chamado?.items ?? []).map((it) => <option key={it.code} value={it.code}>{it.item_code}{it.serial_number ? ` · série ${it.serial_number}` : ""} · {it.in_warranty ? "em garantia" : "fora da garantia"}</option>)}
                  </select></div>
                <div className="erp-field erp-c2"><label className="erp-label">Onde</label>
                  <select className="erp-input" id="os-local" value={nova.local} onChange={(e) => setNova((x) => ({ ...x, local: e.target.value as "CLIENTE" | "FABRICA" }))}>
                    <option value="CLIENTE">No cliente (campo)</option><option value="FABRICA">Na fábrica (RMA)</option></select></div>
                <div className="erp-field erp-c3"><label className="erp-label">Técnico</label>
                  <LookupField value={nova.tecnico} loader={loadEmployees} entityLabel="técnico" placeholder="Definir depois" onChange={(c) => setNova((x) => ({ ...x, tecnico: c ?? undefined }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Agendar para</label><input className="erp-input" type="datetime-local" value={nova.agenda} onChange={(e) => setNova((x) => ({ ...x, agenda: e.target.value }))} /></div>
                <div className="erp-field erp-c7"><label className="erp-label">Observações</label><input className="erp-input" value={nova.obs} onChange={(e) => setNova((x) => ({ ...x, obs: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">&nbsp;</label><button className="erp-btn erp-btn-primary" onClick={() => void criar()} disabled={busy || !nova.chamado}>Abrir OS</button></div>
              </div></div>

              <div className="erp-fieldset"><div className="erp-fieldset-head">Ordens de serviço — <span style={{ fontWeight: 400, opacity: 0.65 }}>{lista.length}</span></div><div className="erp-fieldset-body">
                <div className="erp-field erp-c2"><label className="erp-label">Situação</label>
                  <select className="erp-input" value={filtro.situacao} onChange={(e) => setFiltro((f) => ({ ...f, situacao: e.target.value }))}>
                    <option value="">Todas</option>{(Object.keys(ROTULO_SITUACAO_OS) as SituacaoOS[]).map((s) => <option key={s} value={s}>{ROTULO_SITUACAO_OS[s]}</option>)}
                  </select></div>
                <div className="erp-field erp-c4"><label className="erp-label">Cliente</label>
                  <LookupField value={filtro.cliente} loader={loadCustomers} entityLabel="cliente" placeholder="Todos" onChange={(c) => setFiltro((f) => ({ ...f, cliente: c ?? undefined }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label">Técnico</label>
                  <LookupField value={filtro.tecnico} loader={loadEmployees} entityLabel="técnico" placeholder="Todos" onChange={(c) => setFiltro((f) => ({ ...f, tecnico: c ?? undefined }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">&nbsp;</label><button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Consultar</button></div>
                <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                  <table className="erp-grid">
                    <thead><tr><th>OS</th><th>Chamado</th><th>Cliente</th><th>Equipamento</th><th>Onde</th><th>Técnico</th><th>Agenda</th><th>Garantia</th><th>Situação</th><th style={{ width: 80 }} /></tr></thead>
                    <tbody>
                      {lista.length === 0 && <tr><td colSpan={10} className="erp-grid-empty">Nenhuma ordem de serviço com esse filtro.</td></tr>}
                      {lista.map((x) => (
                        <tr key={x.id}><td style={{ fontWeight: 600 }}>{x.numero}</td><td>{x.call_number ?? x.call_code}</td><td>{x.cliente_nome || x.customer_code}</td>
                          <td>{x.item_code ? `${x.item_code} · ${x.item_nome ?? ""}` : "—"}{x.numero_serie ? ` (série ${x.numero_serie})` : ""}</td>
                          <td>{x.local === "FABRICA" ? "Fábrica" : "Cliente"}</td><td>{x.tecnico_nome || "—"}</td><td>{dataHora(x.agendada_para)}</td>
                          <td>{x.em_garantia ? "Sim" : "Não"}</td><td><span className={`erp-badge ${COR[x.situacao]}`}>{ROTULO_SITUACAO_OS[x.situacao]}</span></td>
                          <td><button className="erp-btn erp-btn-sm" onClick={() => void abrir(x.id)}>Abrir</button></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div></div>

              {o && (
                <div className="erp-fieldset" id="os-detalhe"><div className="erp-fieldset-head">OS {o.numero} — chamado {o.call_number ?? o.call_code} · {o.cliente_nome || o.customer_code}</div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c12" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span><span className={`erp-badge ${COR[o.situacao]}`}>{ROTULO_SITUACAO_OS[o.situacao]}</span></span>
                    <span>Onde: <strong>{o.local === "FABRICA" ? "na fábrica" : "no cliente"}</strong></span>
                    <span>Equipamento: <strong>{o.item_code ? `${o.item_code} · ${o.item_nome ?? ""}` : "—"}</strong>{o.numero_serie ? ` · série ${o.numero_serie}` : ""}</span>
                    <span>Técnico: <strong>{o.tecnico_nome || "—"}</strong></span>
                    <span>Início: <strong>{dataHora(o.iniciada_em)}</strong> · conclusão <strong>{dataHora(o.concluida_em)}</strong></span>
                    {o.sales_order_code && <span>Pedido de venda: <strong>{o.sales_order_code}</strong></span>}
                  </div>
                  <div className="erp-field erp-c12"><div className={`erp-feedback ${o.em_garantia ? "success" : "info"}`}>{cobertura(o)}</div></div>

                  {(o.situacao === "ABERTA" || o.situacao === "AGENDADA") && (<>
                    <div className="erp-field erp-c3"><label className="erp-label">Agendar para</label><input className="erp-input" type="datetime-local" value={agenda.quando} onChange={(e) => setAgenda((a) => ({ ...a, quando: e.target.value }))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Técnico</label>
                      <LookupField value={agenda.tecnico} loader={loadEmployees} entityLabel="técnico" placeholder="Selecionar" onChange={(c) => setAgenda((a) => ({ ...a, tecnico: c ?? undefined }))} /></div>
                    <div className="erp-field erp-c6" style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                      <button className="erp-btn" disabled={busy || !agenda.quando} onClick={() => void executar(() => acaoOS(o.id, "agenda", { quando: agenda.quando, tecnico_code: agenda.tecnico }), "Atendimento agendado.")}>Agendar</button>
                      <button className="erp-btn erp-btn-primary" id="os-iniciar" disabled={busy || (!agenda.tecnico && !o.tecnico_code)} onClick={() => void executar(() => acaoOS(o.id, "inicio", { tecnico_code: agenda.tecnico }), o.local === "FABRICA" ? "OS em execução: o equipamento entrou na assistência." : "OS em execução.")}>Iniciar atendimento</button>
                    </div>
                  </>)}

                  <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                    <table className="erp-grid">
                      <thead><tr><th>Lançamento</th><th>Descrição</th><th>Quantidade</th><th>Custo</th><th>Preço</th><th>Cobrado</th><th style={{ width: 70 }} /></tr></thead>
                      <tbody>
                        {o.horas.length + o.pecas.length + o.despesas.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhum lançamento.</td></tr>}
                        {o.horas.map((h) => (
                          <tr key={`h${h.id}`}><td>Hora — {h.tipo === "DESLOCAMENTO" ? "deslocamento" : "trabalho"}</td><td>{dataBR(h.data)}{h.observacao ? ` · ${h.observacao}` : ""}</td>
                            <td>{qtd(h.horas)} h</td><td>{brl(Number(h.horas) * Number(h.custo_hora))}</td><td>{h.cobrado ? brl(Number(h.horas) * Number(h.preco_hora)) : "—"}</td><td>{h.cobrado ? "Sim" : "Garantia"}</td>
                            <td>{lanca && <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => void executar(() => removerLancamentoOS(o.id, "horas", h.id), "Hora removida.")}>Remover</button>}</td></tr>
                        ))}
                        {o.pecas.map((p) => (
                          <tr key={`p${p.id}`}><td>Peça</td><td>{p.item_code} · {p.item_nome}{p.stock_movement_id ? " · saiu do estoque" : " · sai pela NF do faturamento"}</td>
                            <td>{qtd(p.quantidade)}</td><td>{brl(Number(p.quantidade) * Number(p.custo_unitario))}</td><td>{p.cobrado ? brl(Number(p.quantidade) * Number(p.preco_unitario)) : "—"}</td><td>{p.cobrado ? "Sim" : "Garantia"}</td>
                            <td>{lanca && <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => void executar(() => removerLancamentoOS(o.id, "pecas", p.id), p.stock_movement_id ? "Peça removida e devolvida ao estoque." : "Peça removida.")}>Remover</button>}</td></tr>
                        ))}
                        {o.despesas.map((d) => (
                          <tr key={`d${d.id}`}><td>Despesa — {ROTULO_DESPESA[d.tipo] ?? d.tipo}</td><td>{d.observacao ?? "—"}</td>
                            <td>{qtd(d.quantidade)}{d.tipo === "KM" ? " km" : ""}</td><td>{brl(Number(d.quantidade) * Number(d.custo))}</td><td>{d.cobrado ? brl(Number(d.quantidade) * Number(d.preco)) : "—"}</td><td>{d.cobrado ? "Sim" : "Garantia"}</td>
                            <td>{lanca && <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => void executar(() => removerLancamentoOS(o.id, "despesas", d.id), "Despesa removida.")}>Remover</button>}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="erp-field erp-c12" id="os-totais" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span>Horas: <strong>{qtd(o.totais.horas_trabalho)} h</strong> + deslocamento <strong>{qtd(o.totais.horas_deslocamento)} h</strong></span>
                    <span>Custo total: <strong>{brl(o.totais.custo_total)}</strong></span>
                    <span>Custo da garantia: <strong>{brl(o.totais.custo_garantia)}</strong></span>
                    <span>A cobrar do cliente: <strong>{brl(o.totais.a_cobrar)}</strong></span>
                  </div>

                  {lanca && o.situacao === "EM_EXECUCAO" && (<>
                    <div className="erp-field erp-c12"><div className="erp-fieldset-head" style={{ padding: 0, border: 0 }}>Apontar horas</div></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Data</label><input className="erp-input" type="date" value={hora.data} onChange={(e) => setHora((x) => ({ ...x, data: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Tipo</label>
                      <select className="erp-input" value={hora.tipo} onChange={(e) => setHora((x) => ({ ...x, tipo: e.target.value }))}><option value="TRABALHO">Trabalho</option><option value="DESLOCAMENTO">Deslocamento</option></select></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Horas</label><input className="erp-input" id="os-horas" inputMode="decimal" value={hora.horas} onChange={(e) => setHora((x) => ({ ...x, horas: e.target.value }))} placeholder="Ex.: 1,5" /></div>
                    <div className="erp-field erp-c4"><label className="erp-label">Observação</label><input className="erp-input" value={hora.obs} onChange={(e) => setHora((x) => ({ ...x, obs: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">&nbsp;</label><button className="erp-btn" id="os-add-hora" disabled={busy || !hora.horas} onClick={() => void executar(() => acaoOS(o.id, "horas", { data: hora.data, tipo: hora.tipo, horas: hora.horas.replace(",", "."), observacao: hora.obs || undefined }), "Horas apontadas.", () => setHora((x) => ({ ...x, horas: "", obs: "" })))}>Apontar</button></div>

                    <div className="erp-field erp-c12"><div className="erp-fieldset-head" style={{ padding: 0, border: 0 }}>Peça {pecaCobrada ? "(cobrada — sai do estoque pela NF do faturamento)" : "(garantia — sai do estoque agora)"}</div></div>
                    <div className="erp-field erp-c4"><label className="erp-label">Item</label>
                      <LookupField<string> value={peca.item} loader={loadItems} entityLabel="item" placeholder="Selecionar peça" onChange={(c) => setPeca((x) => ({ ...x, item: c ?? undefined }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Quantidade</label><input className="erp-input" id="os-peca-qtd" inputMode="decimal" value={peca.quantidade} onChange={(e) => setPeca((x) => ({ ...x, quantidade: e.target.value }))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Almoxarifado</label>
                      <LookupField value={peca.almox} loader={loadWarehouses} entityLabel="almoxarifado" placeholder="O dos parâmetros" onChange={(c) => setPeca((x) => ({ ...x, almox: c ?? undefined }))} /></div>
                    {pecaCobrada && <div className="erp-field erp-c2"><label className="erp-label erp-req">Preço unitário</label><input className="erp-input" id="os-peca-preco" inputMode="decimal" value={peca.preco} onChange={(e) => setPeca((x) => ({ ...x, preco: e.target.value }))} /></div>}
                    <div className="erp-field erp-c1"><label className="erp-label">&nbsp;</label><button className="erp-btn" id="os-add-peca" disabled={busy || !peca.item || !peca.quantidade || (pecaCobrada && !peca.preco)} onClick={() => void executar(() => acaoOS(o.id, "pecas", { item_code: peca.item, quantidade: peca.quantidade.replace(",", "."), warehouse_id: peca.almox, preco_unitario: pecaCobrada ? peca.preco.replace(",", ".") : "0" }), "Peça lançada.", () => setPeca((x) => ({ ...x, item: undefined, quantidade: "1", preco: "" })))}>Lançar</button></div>

                    <div className="erp-field erp-c12"><div className="erp-fieldset-head" style={{ padding: 0, border: 0 }}>Despesa</div></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Tipo</label>
                      <select className="erp-input" value={despesa.tipo} onChange={(e) => setDespesa((x) => ({ ...x, tipo: e.target.value }))}>{Object.entries(ROTULO_DESPESA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                    <div className="erp-field erp-c2"><label className="erp-label">{despesa.tipo === "KM" ? "Km rodados" : "Quantidade"}</label><input className="erp-input" id="os-desp-qtd" inputMode="decimal" value={despesa.quantidade} onChange={(e) => setDespesa((x) => ({ ...x, quantidade: e.target.value }))} placeholder={despesa.tipo === "KM" ? "" : "1"} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">{despesa.tipo === "KM" ? "Custo do km" : "Valor gasto"}</label><input className="erp-input" inputMode="decimal" value={despesa.custo} onChange={(e) => setDespesa((x) => ({ ...x, custo: e.target.value }))} placeholder={despesa.tipo === "KM" ? "o dos parâmetros" : ""} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Preço cobrado</label><input className="erp-input" inputMode="decimal" value={despesa.preco} onChange={(e) => setDespesa((x) => ({ ...x, preco: e.target.value }))} placeholder={despesa.tipo === "KM" ? "o dos parâmetros" : "o valor gasto"} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Observação</label><input className="erp-input" value={despesa.obs} onChange={(e) => setDespesa((x) => ({ ...x, obs: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">&nbsp;</label><button className="erp-btn" id="os-add-despesa" disabled={busy || (despesa.tipo === "KM" ? !despesa.quantidade : !despesa.custo)} onClick={() => void executar(() => acaoOS(o.id, "despesas", {
                      tipo: despesa.tipo, quantidade: (despesa.quantidade || "1").replace(",", "."), custo: despesa.custo ? despesa.custo.replace(",", ".") : undefined,
                      preco: despesa.preco ? despesa.preco.replace(",", ".") : undefined, observacao: despesa.obs || undefined }), "Despesa lançada.", () => setDespesa((x) => ({ ...x, quantidade: "", custo: "", preco: "", obs: "" })))}>Lançar</button></div>

                    <div className="erp-field erp-c6"><label className="erp-label erp-req">Defeito constatado</label><textarea className="erp-input" id="os-defeito" rows={2} value={conclusao.defeito} onChange={(e) => setConclusao((c) => ({ ...c, defeito: e.target.value }))} /></div>
                    <div className="erp-field erp-c6"><label className="erp-label erp-req">Solução aplicada</label><textarea className="erp-input" id="os-solucao" rows={2} value={conclusao.solucao} onChange={(e) => setConclusao((c) => ({ ...c, solucao: e.target.value }))} /></div>
                    <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" id="os-concluir" disabled={busy || !conclusao.defeito.trim() || !conclusao.solucao.trim()} onClick={() => void executar(() => acaoOS(o.id, "conclusao", { defeito_constatado: conclusao.defeito, solucao: conclusao.solucao }), o.local === "FABRICA" ? "OS concluída: o equipamento voltou ao cliente." : "OS concluída.")}>Concluir OS</button></div>
                  </>)}

                  {o.situacao === "CONCLUIDA" && (
                    <div className="erp-field erp-c12" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span>Defeito: <strong>{o.defeito_constatado}</strong> · solução: <strong>{o.solucao}</strong></span>
                      <button className="erp-btn erp-btn-primary" id="os-faturar" disabled={busy || !Number(o.totais.a_cobrar)} onClick={() => void executar(() => acaoOS(o.id, "faturamento"), "Pedido de venda gerado com o que a OS cobra.")}>Faturar {brl(o.totais.a_cobrar)}</button>
                      {!Number(o.totais.a_cobrar) && <small>Tudo coberto pela garantia: não há o que faturar.</small>}
                    </div>
                  )}

                  {(o.situacao === "CONCLUIDA" || o.situacao === "ABERTA" || o.situacao === "AGENDADA" || o.situacao === "EM_EXECUCAO") && (
                    <div className="erp-field erp-c12" style={{ display: "flex", gap: 8 }}>
                      <input className="erp-input" placeholder="motivo (para reabrir ou cancelar)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                      {o.situacao === "CONCLUIDA" && <button className="erp-btn" disabled={busy || !motivo.trim()} onClick={() => void executar(() => acaoOS(o.id, "reabertura", { motivo }), "OS reaberta.", () => setMotivo(""))}>Reabrir</button>}
                      {o.situacao !== "CONCLUIDA" && <button className="erp-btn erp-btn-danger" disabled={busy || !motivo.trim()} onClick={() => void executar(() => acaoOS(o.id, "cancelamento", { motivo }), "OS cancelada.", () => setMotivo(""))}>Cancelar OS</button>}
                    </div>
                  )}

                  {(o.situacao === "CONCLUIDA" || o.situacao === "FATURADA") && (<>
                    <div className="erp-field erp-c12"><div className="erp-fieldset-head" style={{ padding: 0, border: 0 }}>Qualidade e fornecedor</div></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Método da CAPA</label>
                      <select className="erp-input" value={capaMetodo} onChange={(e) => setCapaMetodo(e.target.value)}><option value="8D">8D</option><option value="SIMPLES">Simples</option></select></div>
                    <div className="erp-field erp-c3"><label className="erp-label">&nbsp;</label><button className="erp-btn" id="os-abrir-capa" disabled={busy} onClick={() => void abrirCapa(o)}>Abrir CAPA da reclamação</button></div>
                    <div className="erp-field erp-c7" />
                    <div className="erp-field erp-c4"><label className="erp-label">Cobrar a garantia do fornecedor</label>
                      <LookupField value={rec.fornecedor} loader={loadSuppliers} entityLabel="fornecedor" placeholder="Fornecedor do componente" onChange={(c) => setRec((x) => ({ ...x, fornecedor: c ?? undefined }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Valor</label><input className="erp-input" id="os-rec-valor" inputMode="decimal" value={rec.valor} onChange={(e) => setRec((x) => ({ ...x, valor: e.target.value }))} placeholder={String(Number(o.totais.custo_garantia).toFixed(2))} /></div>
                    <div className="erp-field erp-c4"><label className="erp-label">Motivo</label><input className="erp-input" value={rec.motivo} onChange={(e) => setRec((x) => ({ ...x, motivo: e.target.value }))} placeholder={o.defeito_constatado ?? ""} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">&nbsp;</label><button className="erp-btn" id="os-cobrar-fornecedor" disabled={busy || !rec.fornecedor} onClick={() => void cobrarFornecedor(o)}>Cobrar do fornecedor</button></div>
                  </>)}

                  <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                    <table className="erp-grid">
                      <thead><tr><th>Quando</th><th>Evento</th><th>De → Para</th><th>Detalhe</th></tr></thead>
                      <tbody>
                        {o.eventos.map((ev) => (
                          <tr key={ev.id}><td>{dataHora(ev.ocorrido_em)}</td><td>{ev.evento === "ABERTURA" ? "Abertura" : "Mudança de situação"}</td>
                            <td>{ev.de ? `${ROTULO_SITUACAO_OS[ev.de as SituacaoOS] ?? ev.de} → ` : ""}{ev.para ? ROTULO_SITUACAO_OS[ev.para as SituacaoOS] ?? ev.para : ""}</td><td>{ev.detalhe ?? "—"}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div></div>
              )}
            </>)}
          </div>
        </section>
      </div>
    </div>
  );
}

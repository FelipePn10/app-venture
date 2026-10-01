import { useState, useCallback, Fragment } from "react";
import {
  type RemittanceDTO, type RemittanceItemDTO, type MovementDTO,
  type MovementType, type ScrapDestination, type NewRemittanceItem,
  MOVEMENT_TYPES, MOVEMENT_LABELS, SCRAP_DESTINATIONS, SCRAP_LABELS, STATUS_LABELS,
  listRemittances, getRemittance, receiveRemittance, listMovements, createMovement,
  blockRemittance, unblockRemittance, closeRemittance, movementKey,
  faturarBeneficiamento, type FaturamentoDTO, type DevolucaoNaNota,
  listRemittanceAudit, type AuditEventDTO, AUDIT_ENTITY_LABELS, AUDIT_ACTION_LABELS,
  auditFieldLabel, auditValue, auditChangedFields,
} from "@/services/customerMaterialService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadCustomers } from "@/services/lookups";

/**
 * VBEN0100 — Beneficiamento: remessas do cliente e retorno fiscal.
 *
 * Tela NOVA. Nada do que a Tecnofer já usa muda: o material de terceiro tem razão
 * próprio, separado do estoque da empresa.
 *
 * O cliente manda matéria-prima por NF-e de remessa (CFOP 5901), a empresa
 * processa e devolve na MESMA nota em que fatura o serviço — CFOP 5124 para a
 * industrialização e 5902 para o material voltando. Sobra e sucata devolvidas
 * saem por 5903, e o CFOP é aplicado pelo servidor: quem lança escolhe o TIPO do
 * movimento, não o código fiscal.
 */

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

const LINHA_VAZIA: NewRemittanceItem = {
  customer_item_code: "", description: "", ncm: "", cst: "050", uom: "PC",
  qty_invoiced: "", qty_received: "", unit_value: "",
};

/** Hoje em AAAA-MM-DD, para pré-preencher datas sem depender de biblioteca. */
function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Traduz o prazo em texto que diz o que fazer, não só o número. */
function textoDoPrazo(dias: number, status: string): string {
  if (status === "ENCERRADA" || status === "CANCELADA") return "—";
  if (dias < 0) return `${Math.abs(dias)} dia(s) em atraso`;
  if (dias === 0) return "vence hoje";
  return `${dias} dia(s)`;
}

function classeDoPrazo(dias: number, status: string): string {
  if (status === "ENCERRADA" || status === "CANCELADA") return "";
  if (dias < 0) return "erp-cell-danger";
  if (dias <= 5) return "erp-cell-warn";
  return "";
}

export function Vben0100Page(): JSX.Element {
  const [remessas, setRemessas] = useState<RemittanceDTO[]>([]);
  const [selecionada, setSelecionada] = useState<RemittanceDTO | null>(null);
  const [movimentos, setMovimentos] = useState<Record<number, MovementDTO[]>>({});
  const [itemAberto, setItemAberto] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const [filtro, setFiltro] = useState({
    customer_code: 0, nfe_number: "", status: "", with_balance: false,
    blocked: false, due_until: "", q: "",
  });

  const [capa, setCapa] = useState({
    customer_code: 0, nfe_number: "", nfe_series: "1", nfe_key: "",
    issue_date: hoje(), received_at: hoje(), fiscal_return_deadline: "",
    total_value: "", sales_order_code: "", notes: "",
  });
  const [linhas, setLinhas] = useState<NewRemittanceItem[]>([{ ...LINHA_VAZIA }]);

  const [mov, setMov] = useState<{
    tipo: MovementType; quantidade: string; destino: ScrapDestination | ""; motivo: string; of: string;
  }>({ tipo: "RETURN", quantidade: "", destino: "", motivo: "", of: "" });

  const [motivoBloqueio, setMotivoBloqueio] = useState("");
  // Histórico e auditoria da remessa. Carrega sob demanda: a trilha guarda o
  // registro inteiro a cada alteração e não é o que se olha toda hora.
  const [historico, setHistorico] = useState<AuditEventDTO[] | null>(null);
  const [motivoEncerramento, setMotivoEncerramento] = useState("");

  // Faturamento. O painel abre a partir da remessa selecionada e propõe devolver o
  // saldo inteiro de cada linha — que é o caso comum no fechamento do pedido.
  const [faturando, setFaturando] = useState(false);
  const [notaEmitida, setNotaEmitida] = useState<FaturamentoDTO | null>(null);
  const [servico, setServico] = useState({
    codigo_item: "", descricao: "SERVICO INDUSTRIALIZACAO", unidade: "PC",
    quantidade: "1", valor_unitario: "",
  });
  const [aDevolver, setADevolver] = useState<Record<number, { qtd: string; tipo: MovementType }>>({});
  const [serie, setSerie] = useState("1");

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregar = () => run(async () => {
    setRemessas(await listRemittances({
      customer_code: filtro.customer_code || undefined,
      nfe_number: filtro.nfe_number ? Number(filtro.nfe_number) : undefined,
      status: filtro.status ? [filtro.status as RemittanceDTO["status"]] : undefined,
      with_balance: filtro.with_balance || undefined,
      blocked: filtro.blocked || undefined,
      due_until: filtro.due_until || undefined,
      q: filtro.q || undefined,
    }));
  });

  const abrir = (id: number) => run(async () => {
    const remessa = await getRemittance(id);
    setSelecionada(remessa);
    setItemAberto(null);
    setMovimentos({});
    setHistorico(null);
    setFaturando(false);
    setNotaEmitida(null);
    // Propõe devolver o saldo inteiro: é o que acontece no fechamento do pedido, e
    // digitar linha por linha o que já está na tela é trabalho sem ganho.
    setADevolver(Object.fromEntries(
      remessa.itens
        .filter((i) => Number(i.balance_qty) > 0)
        .map((i) => [i.id, { qtd: i.balance_qty, tipo: "RETURN" as MovementType }]),
    ));
  });

  const recarregarSelecionada = async () => {
    if (!selecionada) return;
    const atual = await getRemittance(selecionada.id);
    if (historico) setHistorico(await listRemittanceAudit(selecionada.id));
    setSelecionada(atual);
    setRemessas(await listRemittances({
      customer_code: filtro.customer_code || undefined,
      with_balance: filtro.with_balance || undefined,
    }));
  };

  const verTrilha = (itemId: number) => run(async () => {
    setItemAberto(itemAberto === itemId ? null : itemId);
    if (!movimentos[itemId]) {
      const lista = await listMovements(itemId);
      setMovimentos((p) => ({ ...p, [itemId]: lista }));
    }
  });

  const verHistorico = () => run(async () => {
    if (!selecionada) return;
    if (historico) { setHistorico(null); return; }
    setHistorico(await listRemittanceAudit(selecionada.id));
  });

  const adicionarLinha = () => setLinhas((p) => [...p, { ...LINHA_VAZIA }]);
  const removerLinha = (i: number) => setLinhas((p) => (p.length === 1 ? p : p.filter((_, idx) => idx !== i)));
  const mudarLinha = (i: number, campo: keyof NewRemittanceItem, valor: string) =>
    setLinhas((p) => p.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));

  const receber = () => run(async () => {
    if (!capa.customer_code) { setFeedback({ type: "error", message: "Informe o cliente proprietário do material." }); return; }
    if (!capa.nfe_number) { setFeedback({ type: "error", message: "Informe o número da NF-e de remessa." }); return; }

    const criada = await receiveRemittance({
      customer_code: capa.customer_code,
      nfe_number: Number(capa.nfe_number),
      nfe_series: capa.nfe_series || undefined,
      nfe_key: capa.nfe_key.trim() || null,
      issue_date: capa.issue_date,
      received_at: capa.received_at || undefined,
      fiscal_return_deadline: capa.fiscal_return_deadline || undefined,
      total_value: capa.total_value || undefined,
      sales_order_code: capa.sales_order_code ? Number(capa.sales_order_code) : null,
      notes: capa.notes.trim() || null,
      itens: linhas.map((l, i) => ({
        ...l,
        line_number: i + 1,
        qty_received: l.qty_received?.trim() ? l.qty_received : undefined,
        unit_value: l.unit_value?.trim() ? l.unit_value : undefined,
        divergence_reason: l.divergence_reason?.trim() ? l.divergence_reason : null,
      })),
    });

    // O bloqueio automático não é erro: material sem pedido ou com conferência
    // divergente entra retido de propósito, e a pessoa precisa saber disso agora.
    setFeedback(criada.blocked
      ? { type: "info", message: `Remessa ${criada.nfe_number} registrada e BLOQUEADA: ${criada.block_reason}. Regularize antes de produzir.` }
      : { type: "success", message: `Remessa ${criada.nfe_number} registrada. Prazo de retorno: ${criada.fiscal_return_deadline}.` });

    setLinhas([{ ...LINHA_VAZIA }]);
    setCapa((p) => ({ ...p, nfe_number: "", nfe_key: "", total_value: "", notes: "" }));
    setRemessas(await listRemittances({ customer_code: filtro.customer_code || undefined }));
    void abrir(criada.id);
  });

  const lancar = (item: RemittanceItemDTO) => run(async () => {
    if (!mov.quantidade.trim()) { setFeedback({ type: "error", message: "Informe a quantidade do movimento." }); return; }
    if (mov.tipo === "SCRAP" && !mov.destino) { setFeedback({ type: "error", message: "Sucata exige destinação." }); return; }
    if (mov.tipo === "ADJUSTMENT" && !mov.motivo.trim()) { setFeedback({ type: "error", message: "Ajuste exige justificativa." }); return; }

    await createMovement(item.id, {
      movement_type: mov.tipo,
      quantity: mov.quantidade.trim(),
      scrap_destination: mov.tipo === "SCRAP" ? (mov.destino as ScrapDestination) : null,
      reason: mov.motivo.trim() || null,
      production_order_id: mov.of ? Number(mov.of) : null,
      // A chave é derivada do conteúdo: um duplo clique produz a mesma e o
      // servidor devolve o movimento original em vez de baixar o saldo de novo.
      idempotency_key: movementKey(item.id, mov.tipo, mov.quantidade.trim()),
    });

    setMov({ tipo: "RETURN", quantidade: "", destino: "", motivo: "", of: "" });
    setMovimentos((p) => { const proximo = { ...p }; delete proximo[item.id]; return proximo; });
    if (itemAberto === item.id) setMovimentos((p) => ({ ...p, [item.id]: [] }));
    await recarregarSelecionada();
    setFeedback({ type: "success", message: `${MOVEMENT_LABELS[mov.tipo]} registrado para ${item.customer_item_code}.` });
  });

  const bloquear = () => { const r = selecionada; if (!r) return; void run(async () => {
    if (!motivoBloqueio.trim()) { setFeedback({ type: "error", message: "Informe o motivo do bloqueio." }); return; }
    await blockRemittance(r.id, motivoBloqueio.trim());
    setMotivoBloqueio("");
    await recarregarSelecionada();
    setFeedback({ type: "success", message: "Remessa bloqueada. O material não pode ir para a produção." });
  }); };

  const liberar = () => { const r = selecionada; if (!r) return; void run(async () => {
    await unblockRemittance(r.id);
    await recarregarSelecionada();
    setFeedback({ type: "success", message: "Remessa liberada para produção." });
  }); };

  const encerrar = () => { const r = selecionada; if (!r) return; void run(async () => {
    await closeRemittance(r.id, motivoEncerramento.trim());
    setMotivoEncerramento("");
    await recarregarSelecionada();
    setFeedback({ type: "success", message: "Remessa encerrada." });
  }); };

  const faturar = () => { const r = selecionada; if (!r) return; void run(async () => {
    if (!servico.valor_unitario.trim()) {
      setFeedback({ type: "error", message: "Informe o valor do serviço de beneficiamento." }); return;
    }
    const devolucoes: DevolucaoNaNota[] = Object.entries(aDevolver)
      .filter(([, v]) => v.qtd.trim() && Number(v.qtd) > 0)
      .map(([id, v]) => ({ remittance_item_id: Number(id), quantity: v.qtd.trim(), movement_type: v.tipo }));
    if (devolucoes.length === 0) {
      setFeedback({ type: "error", message: "A nota de beneficiamento devolve o material do cliente junto com o serviço: informe o que retorna." });
      return;
    }

    // O destinatário NÃO é montado aqui. O servidor resolve pelo cadastro do
    // cliente da remessa, pelo mesmo caminho da nota de venda — é o que evita o
    // mesmo cliente sair com endereço diferente em cada tipo de nota.
    const nota = await faturarBeneficiamento(r.id, {
      servico: { ...servico, codigo_item: servico.codigo_item.trim() || undefined },
      devolucoes,
      serie: serie.trim() || undefined,
    });
    setNotaEmitida(nota);
    setFaturando(false);
    await recarregarSelecionada();
    setFeedback({
      type: "success",
      message: `Nota ${nota.numero_nf}/${nota.serie} criada em rascunho. Saldo restante: ${nota.saldo_restante}. Transmita pela tela fiscal.`,
    });
  }); };

  const temSaldo = selecionada ? Number(selecionada.saldo_total) > 0 : false;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Almoxarifado</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Beneficiamento — Remessas e Retorno Fiscal</span>
          <span className="erp-crumb-code">VBEN0100</span>
        </nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Dados</span>
          <button className="erp-btn" onClick={carregar} disabled={busy}>Consultar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VBEN0100 — Remessas de Beneficiamento" filename="vben0100" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Remessas e Retorno Fiscal</button></div>
          <div className="erp-detail-body">

            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            {/* ── Filtro ── */}
            <div className="erp-fieldset"><div className="erp-fieldset-head">Consultar</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c3"><label className="erp-label">Cliente</label>
                <LookupField value={filtro.customer_code || undefined} loader={loadCustomers} entityLabel="cliente"
                  onChange={(code) => setFiltro((p) => ({ ...p, customer_code: code ? Number(code) : 0 }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">NF-e de remessa</label>
                <input className="erp-input" type="number" value={filtro.nfe_number}
                  onChange={(e) => setFiltro((p) => ({ ...p, nfe_number: e.target.value }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Situação</label>
                <select className="erp-input" value={filtro.status} onChange={(e) => setFiltro((p) => ({ ...p, status: e.target.value }))}>
                  <option value="">Todas</option>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select></div>
              <div className="erp-field erp-c2"><label className="erp-label">Vencendo até</label>
                <input className="erp-input" type="date" value={filtro.due_until}
                  onChange={(e) => setFiltro((p) => ({ ...p, due_until: e.target.value }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Item (código ou descrição)</label>
                <input className="erp-input" value={filtro.q} onChange={(e) => setFiltro((p) => ({ ...p, q: e.target.value }))} /></div>
              <div className="erp-field erp-c3">
                <label className="erp-label">
                  <input type="checkbox" checked={filtro.with_balance}
                    onChange={(e) => setFiltro((p) => ({ ...p, with_balance: e.target.checked }))} /> Só com material aqui
                </label>
                <label className="erp-label">
                  <input type="checkbox" checked={filtro.blocked}
                    onChange={(e) => setFiltro((p) => ({ ...p, blocked: e.target.checked }))} /> Só bloqueadas
                </label>
              </div>
            </div></div>

            {/* ── Lista ── */}
            <div className="erp-fieldset"><div className="erp-fieldset-head">Remessas ({remessas.length})</div>
              <div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead><tr>
                    <th>NF-e</th><th>Cliente</th><th>Pedido</th><th>Emissão</th>
                    <th>Prazo de retorno</th><th>Falta</th><th>Situação</th><th>Saldo aqui</th><th></th>
                  </tr></thead>
                  <tbody>
                    {remessas.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">Nenhuma remessa. Clique em Consultar.</td></tr>}
                    {remessas.map((r) => (
                      <tr key={r.id} className={selecionada?.id === r.id ? "erp-row-sel" : ""}>
                        <td>{r.nfe_number}/{r.nfe_series}</td>
                        <td><EntityName code={r.customer_code} loader={loadCustomers} prefix="Cliente" /></td>
                        <td>{r.sales_order_code ?? <span title="Material sem pedido cadastrado">— </span>}</td>
                        <td>{r.issue_date}</td>
                        <td>{r.fiscal_return_deadline}</td>
                        <td className={classeDoPrazo(r.dias_para_o_prazo, r.status)}>{textoDoPrazo(r.dias_para_o_prazo, r.status)}</td>
                        <td>{STATUS_LABELS[r.status]}{r.blocked && " · BLOQUEADA"}</td>
                        <td>{r.saldo_total}</td>
                        <td><button className="erp-btn" onClick={() => void abrir(r.id)} disabled={busy}>Abrir</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div></div></div>

            {/* ── Detalhe ── */}
            {selecionada && (
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">
                  NF-e {selecionada.nfe_number}/{selecionada.nfe_series} · {STATUS_LABELS[selecionada.status]}
                  {selecionada.blocked && ` · BLOQUEADA: ${selecionada.block_reason}`}
                </div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c12">
                    <table className="erp-grid">
                      <thead><tr>
                        <th>Linha</th><th>Item do cliente</th><th>Descrição</th><th>NCM</th><th>UM</th>
                        <th>Nota</th><th>Conferido</th><th>Devolvido</th><th>Sobra</th><th>Sucata</th>
                        <th>Saldo aqui</th><th>Divergência</th><th></th>
                      </tr></thead>
                      <tbody>
                        {selecionada.itens.map((item) => (
                          <Fragment key={item.id}>
                            <tr>
                              <td>{item.line_number}</td>
                              <td>{item.customer_item_code}</td>
                              <td>{item.description}</td>
                              <td>{item.ncm}</td>
                              <td>{item.uom}</td>
                              <td>{item.qty_invoiced}</td>
                              <td>{item.qty_received}</td>
                              <td>{item.qty_returned}</td>
                              <td>{item.qty_leftover}</td>
                              <td>{item.qty_scrapped}</td>
                              <td><strong>{item.balance_qty}</strong></td>
                              <td className={Number(item.divergence_qty) !== 0 ? "erp-cell-warn" : ""}>
                                {Number(item.divergence_qty) === 0 ? "—" : `${item.divergence_qty} (${item.divergence_reason ?? "sem motivo"})`}
                              </td>
                              <td><button className="erp-btn" onClick={() => void verTrilha(item.id)} disabled={busy}>
                                {itemAberto === item.id ? "Fechar" : "Movimentar"}</button></td>
                            </tr>

                            {itemAberto === item.id && (
                              <tr>
                                <td colSpan={13}>
                                  {/* Lançamento */}
                                  <div className="erp-fieldset"><div className="erp-fieldset-head">
                                    Lançar movimento — {item.customer_item_code} (saldo {item.balance_qty} {item.uom})
                                  </div><div className="erp-fieldset-body">
                                    <div className="erp-field erp-c3"><label className="erp-label erp-req">Tipo</label>
                                      <select className="erp-input" value={mov.tipo}
                                        onChange={(e) => setMov((p) => ({ ...p, tipo: e.target.value as MovementType }))}>
                                        {MOVEMENT_TYPES.map((t) => <option key={t} value={t}>{MOVEMENT_LABELS[t]}</option>)}
                                      </select></div>
                                    <div className="erp-field erp-c2"><label className="erp-label erp-req">Quantidade</label>
                                      <input className="erp-input" value={mov.quantidade}
                                        onChange={(e) => setMov((p) => ({ ...p, quantidade: e.target.value }))} /></div>
                                    {mov.tipo === "SCRAP" && (
                                      <div className="erp-field erp-c3"><label className="erp-label erp-req">Destinação da sucata</label>
                                        <select className="erp-input" value={mov.destino}
                                          onChange={(e) => setMov((p) => ({ ...p, destino: e.target.value as ScrapDestination }))}>
                                          <option value="">Selecione…</option>
                                          {SCRAP_DESTINATIONS.map((d) => <option key={d} value={d}>{SCRAP_LABELS[d]}</option>)}
                                        </select></div>
                                    )}
                                    <div className="erp-field erp-c2"><label className="erp-label">Ordem de fabricação</label>
                                      <input className="erp-input" type="number" value={mov.of}
                                        onChange={(e) => setMov((p) => ({ ...p, of: e.target.value }))} /></div>
                                    <div className="erp-field erp-c4">
                                      <label className={`erp-label${mov.tipo === "ADJUSTMENT" ? " erp-req" : ""}`}>
                                        {mov.tipo === "ADJUSTMENT" ? "Justificativa" : "Observação"}
                                      </label>
                                      <input className="erp-input" value={mov.motivo}
                                        onChange={(e) => setMov((p) => ({ ...p, motivo: e.target.value }))} /></div>
                                    <div className="erp-field erp-c2" style={{ alignSelf: "end" }}>
                                      <button className="erp-btn erp-btn-primary" onClick={() => void lancar(item)}
                                        disabled={busy || selecionada.blocked}>Lançar</button></div>
                                    <div className="erp-field erp-c12">
                                      <span className="erp-hint">
                                        O CFOP é aplicado pelo sistema: 5902 no retorno com o faturamento do serviço,
                                        5903 em sobra e sucata devolvidas. O apontamento de produção deste material
                                        reporta só horas — o item volta fiscalmente ao cliente.
                                      </span>
                                    </div>
                                  </div></div>

                                  {/* Trilha */}
                                  <div className="erp-fieldset"><div className="erp-fieldset-head">Movimentos do item</div>
                                    <div className="erp-fieldset-body"><div className="erp-field erp-c12">
                                      <table className="erp-grid">
                                        <thead><tr><th>Quando</th><th>Tipo</th><th>Quantidade</th><th>CFOP</th><th>Destinação</th><th>OF</th><th>Observação</th></tr></thead>
                                        <tbody>
                                          {(movimentos[item.id] ?? []).length === 0 && (
                                            <tr><td colSpan={7} className="erp-grid-empty">Nenhum movimento neste item.</td></tr>
                                          )}
                                          {(movimentos[item.id] ?? []).map((m) => (
                                            <tr key={m.id} className={m.reversed_at ? "erp-row-muted" : undefined}>
                                              <td>{m.created_at.slice(0, 16).replace("T", " ")}</td>
                                              <td>
                                                {MOVEMENT_LABELS[m.movement_type]}
                                                {m.reversed_at && <> — <strong>estornado</strong></>}
                                              </td>
                                              <td>{m.quantity}</td>
                                              <td>{m.cfop ?? "—"}</td>
                                              <td>{m.scrap_destination ? SCRAP_LABELS[m.scrap_destination] : "—"}</td>
                                              <td>{m.production_order_id ?? "—"}</td>
                                              {/* Estornado explica por que o saldo não bate com a soma dos
                                                  movimentos: a quantidade voltou ao cliente. */}
                                              <td>{m.reversal_reason ?? m.reason ?? "—"}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div></div></div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* ── Faturar o beneficiamento ── */}
                  <div className="erp-field erp-c12">
                    {!faturando && !notaEmitida && (
                      <button className="erp-btn erp-btn-primary" onClick={() => setFaturando(true)}
                        disabled={busy || selecionada.blocked || !temSaldo}
                        title={selecionada.blocked
                          ? "Remessa bloqueada: regularize antes de faturar"
                          : !temSaldo ? "Não há material do cliente para devolver" : ""}>
                        Faturar beneficiamento
                      </button>
                    )}
                    {!temSaldo && !notaEmitida && (
                      <span className="erp-hint">
                        Todo o material desta remessa já voltou ao cliente — não há o que faturar.
                      </span>
                    )}
                  </div>

                  {faturando && (
                    <div className="erp-fieldset"><div className="erp-fieldset-head">
                      Faturar o beneficiamento — nota com serviço (CFOP 5124) e devolução do material
                    </div><div className="erp-fieldset-body">
                      <div className="erp-field erp-c4"><label className="erp-label erp-req">Descrição do serviço</label>
                        <input className="erp-input" value={servico.descricao}
                          onChange={(e) => setServico((p) => ({ ...p, descricao: e.target.value }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Código do serviço</label>
                        <input className="erp-input" value={servico.codigo_item} placeholder="25xxxxxx"
                          onChange={(e) => setServico((p) => ({ ...p, codigo_item: e.target.value }))} /></div>
                      <div className="erp-field erp-c1"><label className="erp-label">UM</label>
                        <input className="erp-input" value={servico.unidade}
                          onChange={(e) => setServico((p) => ({ ...p, unidade: e.target.value }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label erp-req">Quantidade</label>
                        <input className="erp-input" value={servico.quantidade}
                          onChange={(e) => setServico((p) => ({ ...p, quantidade: e.target.value }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label erp-req">Valor do serviço</label>
                        <input className="erp-input" value={servico.valor_unitario}
                          onChange={(e) => setServico((p) => ({ ...p, valor_unitario: e.target.value }))} /></div>
                      <div className="erp-field erp-c1"><label className="erp-label">Série</label>
                        <input className="erp-input" value={serie}
                          onChange={(e) => setSerie(e.target.value)} /></div>

                      <div className="erp-field erp-c12">
                        <table className="erp-grid">
                          <thead><tr>
                            <th>Item do cliente</th><th>Descrição</th><th>UM</th>
                            <th>Saldo aqui</th><th>Devolver nesta nota</th><th>Como</th>
                          </tr></thead>
                          <tbody>
                            {selecionada.itens.filter((i) => Number(i.balance_qty) > 0).map((item) => (
                              <tr key={item.id}>
                                <td>{item.customer_item_code}</td>
                                <td>{item.description}</td>
                                <td>{item.uom}</td>
                                <td>{item.balance_qty}</td>
                                <td><input className="erp-input" value={aDevolver[item.id]?.qtd ?? ""}
                                  onChange={(e) => setADevolver((p) => ({
                                    ...p, [item.id]: { qtd: e.target.value, tipo: p[item.id]?.tipo ?? "RETURN" },
                                  }))} /></td>
                                <td><select className="erp-input" value={aDevolver[item.id]?.tipo ?? "RETURN"}
                                  onChange={(e) => setADevolver((p) => ({
                                    ...p, [item.id]: { qtd: p[item.id]?.qtd ?? "", tipo: e.target.value as MovementType },
                                  }))}>
                                  <option value="RETURN">Processado — CFOP 5902</option>
                                  <option value="LEFTOVER">Sobra — CFOP 5903</option>
                                  <option value="SCRAP">Sucata — CFOP 5903</option>
                                </select></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="erp-field erp-c12">
                        <span className="erp-hint">
                          A nota sai com ICMS zero nas duas pontas — diferimento (CST 051) na linha do
                          serviço, pela Portaria CAT 22/2007, e suspensão (CST 050) no material que
                          volta. PIS 0,65% e COFINS 3% incidem só sobre o serviço. O CFOP e os CST são
                          aplicados pelo sistema; a nota nasce em rascunho e é transmitida pela tela
                          fiscal, que confere antes se o saldo foi baixado.
                        </span>
                      </div>

                      <div className="erp-field erp-c3">
                        <button className="erp-btn erp-btn-primary" onClick={faturar} disabled={busy}>
                          Gerar nota
                        </button></div>
                      <div className="erp-field erp-c3">
                        <button className="erp-btn" onClick={() => setFaturando(false)} disabled={busy}>
                          Cancelar
                        </button></div>
                    </div></div>
                  )}

                  {notaEmitida && (
                    <div className="erp-fieldset"><div className="erp-fieldset-head">
                      Nota {notaEmitida.numero_nf}/{notaEmitida.serie} criada em rascunho
                    </div><div className="erp-fieldset-body">
                      <div className="erp-field erp-c12">
                        <table className="erp-grid">
                          <thead><tr>
                            <th>#</th><th>Descrição</th><th>NCM</th><th>CFOP</th><th>CST ICMS</th>
                            <th>UM</th><th>Qtd.</th><th>Valor unit.</th><th>Total</th>
                            <th>PIS</th><th>COFINS</th>
                          </tr></thead>
                          <tbody>
                            {notaEmitida.linhas.map((l) => (
                              <tr key={l.sequencia}>
                                <td>{l.sequencia}</td><td>{l.descricao}</td><td>{l.ncm}</td>
                                <td><strong>{l.cfop}</strong></td><td>{l.cst_icms}</td>
                                <td>{l.unidade}</td><td>{l.quantidade}</td>
                                <td>{l.valor_unitario}</td><td>{l.valor_total}</td>
                                <td>{l.cst_pis ? `${l.valor_pis} (CST ${l.cst_pis})` : "—"}</td>
                                <td>{l.cst_cofins ? `${l.valor_cofins} (CST ${l.cst_cofins})` : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot><tr>
                            <td colSpan={8}><strong>Total da nota</strong></td>
                            <td><strong>{notaEmitida.valor_total}</strong></td>
                            <td>{notaEmitida.valor_pis}</td>
                            <td>{notaEmitida.valor_cofins}</td>
                          </tr></tfoot>
                        </table>
                      </div>
                      <div className="erp-field erp-c12">
                        <span className="erp-hint">
                          Serviço {notaEmitida.valor_servico} + material {notaEmitida.valor_material}.
                          Saldo do cliente ainda em poder da empresa: <strong>{notaEmitida.saldo_restante}</strong>.
                          <br />Dados adicionais da nota: {notaEmitida.observacao}
                          <br />A nota está em <strong>rascunho</strong>. Transmita pela tela fiscal para
                          autorizar na SEFAZ.
                        </span>
                      </div>
                      <div className="erp-field erp-c3">
                        <button className="erp-btn" onClick={() => setNotaEmitida(null)}>Fechar</button></div>
                    </div></div>
                  )}

                  {/* Ações da remessa */}
                  <div className="erp-field erp-c4"><label className="erp-label">Motivo do bloqueio</label>
                    <input className="erp-input" value={motivoBloqueio} onChange={(e) => setMotivoBloqueio(e.target.value)} /></div>
                  <div className="erp-field erp-c2" style={{ alignSelf: "end" }}>
                    {selecionada.blocked
                      ? <button className="erp-btn" onClick={liberar} disabled={busy}>Liberar material</button>
                      : <button className="erp-btn erp-btn-danger" onClick={bloquear} disabled={busy}>Bloquear material</button>}
                  </div>
                  <div className="erp-field erp-c4">
                    <label className={`erp-label${temSaldo ? " erp-req" : ""}`}>
                      Motivo do encerramento {temSaldo && `(saldo de ${selecionada.saldo_total} ainda aqui)`}
                    </label>
                    <input className="erp-input" value={motivoEncerramento}
                      onChange={(e) => setMotivoEncerramento(e.target.value)} /></div>
                  <div className="erp-field erp-c2" style={{ alignSelf: "end" }}>
                    <button className="erp-btn" onClick={encerrar}
                      disabled={busy || selecionada.status === "ENCERRADA"}>Encerrar remessa</button></div>

                  {/* ── Histórico e auditoria ── */}
                  <div className="erp-field erp-c3">
                    <button className="erp-btn" onClick={verHistorico} disabled={busy}>
                      {historico ? "Ocultar histórico" : "Histórico e auditoria"}
                    </button>
                  </div>

                  {historico && (
                    <div className="erp-field erp-c12">
                      <table className="erp-grid">
                        <thead><tr>
                          <th>Data e hora</th><th>Usuário</th><th>Operação</th><th>Registro</th>
                          <th>Campo</th><th>Antes</th><th>Depois</th><th>Motivo</th>
                        </tr></thead>
                        <tbody>
                          {historico.length === 0 && (
                            <tr><td colSpan={8}>Sem alterações registradas.</td></tr>
                          )}
                          {historico.map((ev) => {
                            const campos = auditChangedFields(ev);
                            // Um evento pode ter mudado vários campos: uma linha por
                            // campo, porque "antes e depois" de dois campos na mesma
                            // linha não se lê.
                            const linhasDoEvento = campos.length > 0 ? campos : [""];
                            return linhasDoEvento.map((campo, i) => (
                              <tr key={`${ev.id}-${campo || i}`}>
                                {i === 0 && (
                                  <Fragment>
                                    <td rowSpan={linhasDoEvento.length}>
                                      {new Date(ev.occurred_at).toLocaleString("pt-BR")}
                                    </td>
                                    <td rowSpan={linhasDoEvento.length}>
                                      {ev.actor_name ?? ev.actor_email ?? "—"}
                                    </td>
                                    <td rowSpan={linhasDoEvento.length}>{AUDIT_ACTION_LABELS[ev.action]}</td>
                                    <td rowSpan={linhasDoEvento.length}>
                                      {AUDIT_ENTITY_LABELS[ev.entity_type] ?? ev.entity_type} #{ev.entity_id}
                                    </td>
                                  </Fragment>
                                )}
                                <td>{campo ? auditFieldLabel(campo) : "—"}</td>
                                <td>{campo ? auditValue(ev.before, campo) : "—"}</td>
                                <td>{campo ? auditValue(ev.after, campo) : "—"}</td>
                                {i === 0 && (
                                  <td rowSpan={linhasDoEvento.length}>{ev.reason ?? "—"}</td>
                                )}
                              </tr>
                            ));
                          })}
                        </tbody>
                      </table>
                      <span className="erp-hint">
                        A trilha é gravada pelo banco e não pode ser alterada nem apagada por
                        ninguém — é ela que responde ao cliente em divergência de saldo. Sem
                        usuário significa alteração feita fora do sistema, por manutenção.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Receber nova remessa ── */}
            <div className="erp-fieldset"><div className="erp-fieldset-head">Receber NF-e de remessa do cliente</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label erp-req">Cliente proprietário</label>
                  <LookupField value={capa.customer_code || undefined} loader={loadCustomers} entityLabel="cliente"
                    onChange={(code) => setCapa((p) => ({ ...p, customer_code: code ? Number(code) : 0 }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label erp-req">NF-e</label>
                  <input className="erp-input" type="number" value={capa.nfe_number}
                    onChange={(e) => setCapa((p) => ({ ...p, nfe_number: e.target.value }))} /></div>
                <div className="erp-field erp-c1"><label className="erp-label">Série</label>
                  <input className="erp-input" value={capa.nfe_series}
                    onChange={(e) => setCapa((p) => ({ ...p, nfe_series: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Emissão</label>
                  <input className="erp-input" type="date" value={capa.issue_date}
                    onChange={(e) => setCapa((p) => ({ ...p, issue_date: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Recebimento</label>
                  <input className="erp-input" type="date" value={capa.received_at}
                    onChange={(e) => setCapa((p) => ({ ...p, received_at: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Prazo de retorno</label>
                  <input className="erp-input" type="date" value={capa.fiscal_return_deadline}
                    onChange={(e) => setCapa((p) => ({ ...p, fiscal_return_deadline: e.target.value }))} /></div>

                <div className="erp-field erp-c3"><label className="erp-label">Pedido de beneficiamento</label>
                  <input className="erp-input" type="number" value={capa.sales_order_code}
                    onChange={(e) => setCapa((p) => ({ ...p, sales_order_code: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Valor total da nota</label>
                  <input className="erp-input" value={capa.total_value}
                    onChange={(e) => setCapa((p) => ({ ...p, total_value: e.target.value }))} /></div>
                <div className="erp-field erp-c7"><label className="erp-label">Chave de acesso (44 dígitos)</label>
                  <input className="erp-input" value={capa.nfe_key}
                    onChange={(e) => setCapa((p) => ({ ...p, nfe_key: e.target.value }))} /></div>

                <div className="erp-field erp-c12">
                  <span className="erp-hint">
                    Sem prazo informado, o sistema usa 30 dias após a emissão. Sem pedido de
                    beneficiamento, a remessa entra bloqueada: o material não pode ir para a
                    produção antes da regularização.
                  </span>
                </div>

                <div className="erp-field erp-c12">
                  <table className="erp-grid">
                    <thead><tr>
                      <th>#</th><th>Item do cliente</th><th>Descrição</th><th>NCM</th><th>CST</th><th>UM</th>
                      <th>Qtd. da nota</th><th>Qtd. conferida</th><th>Valor unitário</th><th>Motivo da divergência</th><th></th>
                    </tr></thead>
                    <tbody>
                      {linhas.map((l, i) => {
                        const divergente = !!l.qty_received?.trim() && l.qty_received !== l.qty_invoiced;
                        return (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td><input className="erp-input" value={l.customer_item_code}
                              onChange={(e) => mudarLinha(i, "customer_item_code", e.target.value)} /></td>
                            <td><input className="erp-input" value={l.description}
                              onChange={(e) => mudarLinha(i, "description", e.target.value)} /></td>
                            <td><input className="erp-input" value={l.ncm}
                              onChange={(e) => mudarLinha(i, "ncm", e.target.value)} /></td>
                            <td><input className="erp-input" value={l.cst ?? ""}
                              onChange={(e) => mudarLinha(i, "cst", e.target.value)} /></td>
                            <td><input className="erp-input" value={l.uom}
                              onChange={(e) => mudarLinha(i, "uom", e.target.value)} /></td>
                            <td><input className="erp-input" value={l.qty_invoiced}
                              onChange={(e) => mudarLinha(i, "qty_invoiced", e.target.value)} /></td>
                            <td><input className="erp-input" value={l.qty_received ?? ""} placeholder="= nota"
                              onChange={(e) => mudarLinha(i, "qty_received", e.target.value)} /></td>
                            <td><input className="erp-input" value={l.unit_value ?? ""}
                              onChange={(e) => mudarLinha(i, "unit_value", e.target.value)} /></td>
                            <td><input className={`erp-input${divergente && !l.divergence_reason?.trim() ? " erp-input-invalid" : ""}`}
                              value={l.divergence_reason ?? ""} disabled={!divergente}
                              placeholder={divergente ? "obrigatório" : "—"}
                              onChange={(e) => mudarLinha(i, "divergence_reason", e.target.value)} /></td>
                            <td><button className="erp-btn" onClick={() => removerLinha(i)}
                              disabled={busy || linhas.length === 1}>Remover</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="erp-field erp-c3"><button className="erp-btn" onClick={adicionarLinha} disabled={busy}>Adicionar item</button></div>
                <div className="erp-field erp-c3"><button className="erp-btn erp-btn-primary" onClick={receber} disabled={busy}>Receber remessa</button></div>
              </div></div>

          </div>
        </section>
      </div>
    </div>
  );
}

import { rotuloDaNota } from "@/services/nfeService";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type RemittanceDTO, type RemittanceItemDTO, type MovementDTO, type MovementType, type ScrapDestination,
  type NewRemittanceItem, type FaturamentoDTO, type DevolucaoNaNota, type AuditEventDTO,
  type PropostaDeFaturamentoDTO, type LinhaDoPedidoDTO,
  MOVEMENT_TYPES, MOVEMENT_LABELS, SCRAP_DESTINATIONS, SCRAP_LABELS,
  listRemittances, getRemittance, receiveRemittance, listMovements, createMovement,
  blockRemittance, unblockRemittance, closeRemittance, movementKey,
  faturarBeneficiamento, getInvoiceProposal, linkSalesOrder, discardBeneficiamentoNote,
  listRemittanceAudit, AUDIT_ENTITY_LABELS, AUDIT_ACTION_LABELS,
  auditFieldLabel, auditValue, auditChangedFields,
} from "@/services/customerMaterialService";
import { authorizeExit } from "@/services/nfeService";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { type LookupOption, loadCustomers, loadSalesOrders, loadItems } from "@/services/lookups";
import { getItem } from "@/services/itemService";
import { errMessage } from "@/services/fiscalShared";
import { hojeLocal } from "@/utils/dataLocal";
import { type Aba, Abas, Aviso, Cabecalho, Detalhe, Kpis, Painel, Rodape, Selo, Vazio } from "../planejamento/planUi";
import { data, dataHora, normalizar, num } from "../planejamento/planFormat";
import { useAcao } from "../planejamento/planHooks";
import { n, ordensDeFabricacao, paraApi, paraCampo, pedidosDoCliente, prazo, situacaoRemessa } from "./benefFormat";

/**
 * VBEN0100 — Beneficiamento: remessas do cliente e retorno fiscal.
 *
 * O cliente manda o material por NF-e de remessa (CFOP 5901), a empresa processa
 * e devolve na MESMA nota em que fatura o serviço: 5124 para a industrialização e
 * 5902 para o material voltando (sobra e sucata devolvidas, 5903). O material de
 * terceiro tem razão próprio, separado do estoque da empresa.
 *
 * A remessa é ligada ao PEDIDO DE VENDA de beneficiamento: o recebimento confere
 * o pedido (do mesmo cliente, aberto) e o faturamento traz o serviço da linha do
 * pedido e o dá por atendido quando a nota é autorizada.
 */

type AbaRemessa = "itens" | "faturar" | "historico";
type Filtro = "abertas" | "bloqueadas" | "vencendo" | "encerradas" | "";

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "abertas", rotulo: "Com material aqui" },
  { id: "vencendo", rotulo: "Prazo até 5 dias" },
  { id: "bloqueadas", rotulo: "Bloqueadas" },
  { id: "encerradas", rotulo: "Encerradas" },
  { id: "", rotulo: "Todas" },
];

type LinhaRemessa = NewRemittanceItem & { uid: number; carregando?: boolean; aviso?: string };

let proximaLinha = 1;
const linhaVazia = (): LinhaRemessa => ({
  uid: proximaLinha++, customer_item_code: "", description: "", ncm: "", cst: "050", uom: "UN",
  qty_invoiced: "", qty_received: "", unit_value: "",
});

/** A chave de acesso carrega o CNPJ do emitente, a série e o número da nota. */
function numeroESerieDaChave(chave: string): { numero: string; serie: string } | null {
  if (chave.length !== 44) return null;
  return { numero: String(Number(chave.slice(25, 34))), serie: String(Number(chave.slice(22, 25))) };
}

const moedaBR = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CAPA_VAZIA = () => ({
  customer_code: 0, nfe_number: "", nfe_series: "1", nfe_key: "",
  issue_date: hojeLocal(), received_at: hojeLocal(), fiscal_return_deadline: "",
  total_value: "", sales_order_code: 0, notes: "",
});

const fechada = (r: RemittanceDTO) => r.status === "ENCERRADA" || r.status === "CANCELADA";

/** Nota ainda não autorizada: a remessa pode estar sem saldo, mas o material está aqui. */
const notaPendente = (r: RemittanceDTO): boolean => !!r.pending_exit;

const temDivergencia = (item: RemittanceItemDTO): boolean => n(item.divergence_qty) !== 0;

/** O número do pedido é o que o cliente conhece; o código fica como reserva. */
function numeroDoPedido(r: RemittanceDTO): number | null {
  return r.sales_order_number ?? r.sales_order_code ?? null;
}

/** Em tela estreita a grade rola, e o botão da linha continua à vista. */
const COLUNA_FIXA = { position: "sticky", right: 0, background: "var(--v-surface)" } as const;

/** O código interno do pedido não diz nada a quem lê: mostra o número, como no resto da tela. */
function valorDoHistorico(estado: Record<string, unknown> | null | undefined, campo: string): JSX.Element | string {
  if (!campo) return "—";
  if (campo === "sales_order_code" && estado?.sales_order_code != null) {
    return <EntityName code={Number(estado.sales_order_code)} loader={loadSalesOrders} showCode={false} />;
  }
  return auditValue(estado, campo);
}

export function Vben0100Page(): JSX.Element {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [lista, setLista] = useState<RemittanceDTO[]>([]);
  const [cliente, setCliente] = useState<number | undefined>();
  const [filtro, setFiltro] = useState<Filtro>("abertas");
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<RemittanceDTO | null>(null);
  const [aba, setAba] = useState<AbaRemessa>("itens");

  // Modais
  const [receber, setReceber] = useState<{ capa: ReturnType<typeof CAPA_VAZIA>; linhas: LinhaRemessa[] } | null>(null);
  const [vincular, setVincular] = useState<{ pedido?: number } | null>(null);
  const [bloquear, setBloquear] = useState<{ motivo: string } | null>(null);
  const [descartar, setDescartar] = useState<{ motivo: string } | null>(null);
  const [encerrar, setEncerrar] = useState<{ motivo: string } | null>(null);
  const [ofs, setOfs] = useState<Record<number, string>>({});
  const [mov, setMov] = useState<{
    item: RemittanceItemDTO; tipo: MovementType; quantidade: string; destino: ScrapDestination | ""; motivo: string; of?: number;
    historico: MovementDTO[] | null;
  } | null>(null);

  // Faturamento e histórico, carregados quando a aba abre.
  const [proposta, setProposta] = useState<PropostaDeFaturamentoDTO | null>(null);
  const [linhaPedido, setLinhaPedido] = useState<number | null>(null);
  const [servico, setServico] = useState({ codigo_item: "", descricao: "", unidade: "", quantidade: "", valor_unitario: "" });
  const [aDevolver, setADevolver] = useState<Record<number, { qtd: string; tipo: MovementType }>>({});
  const [serie, setSerie] = useState("1");
  const [nota, setNota] = useState<FaturamentoDTO | null>(null);
  const [historico, setHistorico] = useState<AuditEventDTO[] | null>(null);

  const listar = useCallback(async () => {
    setLista(await listRemittances({ customer_code: cliente, limit: 500 }));
  }, [cliente]);

  useEffect(() => { void run(listar); }, [run, listar]);

  // Um loader por cliente: o campo carrega a lista uma vez por montagem.
  const clienteDoRecebimento = receber?.capa.customer_code ?? 0;
  const pedidosDoRecebimento = useMemo(() => pedidosDoCliente(clienteDoRecebimento), [clienteDoRecebimento]);
  const pedidosDaRemessa = useMemo(() => pedidosDoCliente(sel?.customer_code ?? 0), [sel?.customer_code]);

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim());
    return lista.filter((r) => {
      if (filtro === "abertas" && !notaPendente(r) && (fechada(r) || n(r.saldo_total) <= 0)) return false;
      if (filtro === "bloqueadas" && !(r.blocked && !fechada(r))) return false;
      if (filtro === "vencendo" && (fechada(r) || r.dias_para_o_prazo > 5)) return false;
      if (filtro === "encerradas" && (!fechada(r) || notaPendente(r))) return false;
      if (!termo) return true;
      return normalizar(`${r.nfe_number} ${numeroDoPedido(r) ?? ""} ${r.itens.map((i) => `${i.customer_item_code} ${i.description}`).join(" ")}`).includes(termo);
    });
  }, [lista, filtro, busca]);

  const kpis = useMemo(() => {
    const vivas = lista.filter((r) => !fechada(r));
    return {
      comMaterial: lista.filter((r) => notaPendente(r) || (!fechada(r) && n(r.saldo_total) > 0)).length,
      bloqueadas: vivas.filter((r) => r.blocked).length,
      vencidas: vivas.filter((r) => r.dias_para_o_prazo < 0).length,
      vencendo: vivas.filter((r) => r.dias_para_o_prazo >= 0 && r.dias_para_o_prazo <= 5).length,
    };
  }, [lista]);

  const abrir = (id: number, abaInicial: AbaRemessa = "itens") => run(async () => {
    const r = await getRemittance(id);
    setSel(r); setAba(abaInicial); setProposta(null); setNota(null); setHistorico(null);
  });

  /** Recarrega a remessa aberta e a lista depois de uma operação. */
  const recarregar = async (id: number) => {
    const [r] = await Promise.all([getRemittance(id), listar()]);
    setSel(r);
    return r;
  };

  // A proposta é refeita ao abrir a aba: o saldo do pedido muda com outras notas.
  const carregarProposta = useCallback(async (id: number) => {
    const p = await getInvoiceProposal(id);
    setProposta(p);
    setLinhaPedido(p.servico.sales_order_item_code ?? null);
    setServico({
      codigo_item: p.servico.codigo_item ?? "", descricao: p.servico.descricao ?? "", unidade: p.servico.unidade ?? "",
      quantidade: paraCampo(p.servico.quantidade), valor_unitario: paraCampo(p.servico.valor_unitario),
    });
    setADevolver(Object.fromEntries(p.devolucoes.map((d) => [d.remittance_item_id, { qtd: paraCampo(d.quantity), tipo: (d.movement_type ?? "RETURN") as MovementType }])));
  }, []);

  useEffect(() => {
    if (!sel) return;
    if (aba === "faturar" && !proposta && !nota) void run(() => carregarProposta(sel.id));
    if (aba === "historico" && !historico) void run(async () => setHistorico(await listRemittanceAudit(sel.id)));
  }, [aba, sel, proposta, nota, historico, run, carregarProposta]);

  const escolherLinha = (l: LinhaDoPedidoDTO) => {
    setLinhaPedido(l.code);
    setServico({ codigo_item: l.item_business_code, descricao: l.description, unidade: l.uom, quantidade: paraCampo(l.balance_qty), valor_unitario: paraCampo(l.unit_price) });
  };

  // ── Recebimento: o que o cliente já mandou e o que o cadastro já sabe ──────

  // O material que este cliente já mandou: o código dele, a descrição e o NCM da
  // nota se repetem de uma remessa para a outra e não precisam ser redigitados.
  const historicoDoCliente = useRef(new Map<string, RemittanceItemDTO>());
  const materiaisDoCliente = useMemo(() => async (): Promise<LookupOption[]> => {
    historicoDoCliente.current = new Map();
    if (!clienteDoRecebimento) return [];
    const remessas = await listRemittances({ customer_code: clienteDoRecebimento, limit: 200 });
    for (const r of remessas) {
      for (const i of r.itens ?? []) {
        if (i.customer_item_code && !historicoDoCliente.current.has(i.customer_item_code)) historicoDoCliente.current.set(i.customer_item_code, i);
      }
    }
    return [...historicoDoCliente.current.values()].map((i) => ({
      code: i.customer_item_code, label: i.description, sub: [i.ncm && `NCM ${i.ncm}`, i.uom].filter(Boolean).join(" · ") || undefined,
    }));
  }, [clienteDoRecebimento]);

  const mudarLinha = (uid: number, patch: Partial<LinhaRemessa>) =>
    setReceber((r) => r && ({ ...r, linhas: r.linhas.map((l) => (l.uid === uid ? { ...l, ...patch } : l)) }));

  // Só a resposta da última escolha da linha vale: a lenta não sobrescreve a seguinte.
  const ultimaBusca = useRef<Record<number, number>>({});

  /** Código do cliente já conhecido: traz o que veio na última remessa dele. */
  const escolherMaterialDoCliente = (uid: number, code?: string) => {
    const conhecido = code ? historicoDoCliente.current.get(code) : undefined;
    setFeedback(null);
    if (!conhecido) { mudarLinha(uid, { customer_item_code: code ?? "" }); return; }
    mudarLinha(uid, {
      customer_item_code: conhecido.customer_item_code, description: conhecido.description, ncm: conhecido.ncm,
      cst: conhecido.cst ?? "050", uom: conhecido.uom, unit_value: paraCampo(conhecido.unit_value),
      item_code: conhecido.item_code ?? null, aviso: "",
    });
  };

  /** Item do cadastro: traz descrição, NCM, unidade e origem; o histórico do cliente completa o código dele. */
  const escolherItemInterno = async (uid: number, code?: string) => {
    const esta = (ultimaBusca.current[uid] ?? 0) + 1;
    ultimaBusca.current[uid] = esta;
    setFeedback(null);
    if (!code) { mudarLinha(uid, { item_code: null, carregando: false, aviso: "" }); return; }
    mudarLinha(uid, { item_code: code, carregando: true, aviso: "" });
    try {
      const item = await getItem(code);
      if (ultimaBusca.current[uid] !== esta) return;
      const fiscal = item.fiscal_effective?.purchase ?? item.fiscal_effective?.sale;
      const ncm = (fiscal?.ncm ?? "").replace(/\D/g, "");
      const jaVeio = [...historicoDoCliente.current.values()].find((i) => String(i.item_code ?? "") === code);
      setReceber((r) => r && ({ ...r, linhas: r.linhas.map((l) => (l.uid !== uid ? l : {
        ...l,
        customer_item_code: l.customer_item_code || jaVeio?.customer_item_code || code,
        description: item.description ?? l.description,
        ncm: ncm || l.ncm,
        uom: fiscal?.unit || item.uom || l.uom,
        cst: `${fiscal?.origin ?? 0}50`,
        unit_value: l.unit_value || paraCampo(jaVeio?.unit_value),
        carregando: false,
        aviso: ncm ? "" : "Sem NCM no cadastro do item: informe como consta na nota.",
      })) }));
    } catch (e) {
      if (ultimaBusca.current[uid] === esta) mudarLinha(uid, { carregando: false, aviso: errMessage(e, "Não foi possível buscar os dados do item: preencha à mão.") });
    }
  };

  /** Colada a chave, número e série não são digitados de novo. */
  const mudarChaveDaRemessa = (texto: string) => {
    const chave = texto.replace(/\D/g, "").slice(0, 44);
    const lida = numeroESerieDaChave(chave);
    setReceber((r) => r && ({ ...r, capa: { ...r.capa, nfe_key: chave, ...(lida ? { nfe_number: lida.numero, nfe_series: lida.serie } : {}) } }));
  };

  /** Primeiro problema do recebimento, em português e apontando a linha. */
  const conferirRecebimento = (capa: ReturnType<typeof CAPA_VAZIA>, linhas: LinhaRemessa[]): string => {
    if (!capa.customer_code) return "Informe o cliente proprietário do material.";
    if (!capa.nfe_number) return "Informe o número da NF-e de remessa.";
    if (capa.nfe_key && capa.nfe_key.length !== 44) return `A chave de acesso tem 44 dígitos; esta tem ${capa.nfe_key.length}.`;
    if (!capa.issue_date) return "Informe a data de emissão da nota.";
    if (capa.received_at && capa.received_at < capa.issue_date) return "O recebimento não pode ser anterior à emissão da nota.";
    if (capa.fiscal_return_deadline && capa.fiscal_return_deadline < capa.issue_date) return "O prazo de retorno não pode ser anterior à emissão da nota.";
    for (const [i, l] of linhas.entries()) {
      const qual = `Linha ${i + 1}:`;
      if (!l.customer_item_code.trim()) return `${qual} informe o item do cliente ou escolha o item do cadastro.`;
      if (!l.description.trim()) return `${qual} informe a descrição.`;
      if (l.ncm.length !== 8) return `${qual} o NCM tem 8 dígitos, como consta na nota.`;
      if (!l.uom.trim()) return `${qual} informe a unidade.`;
      const qtd = paraApi(l.qty_invoiced);
      if (!qtd || !Number.isFinite(Number(qtd)) || Number(qtd) <= 0) return `${qual} a quantidade da nota precisa ser maior que zero.`;
      const conferida = paraApi(l.qty_received);
      if (conferida && (!Number.isFinite(Number(conferida)) || Number(conferida) < 0)) return `${qual} a quantidade conferida não é válida.`;
      if (conferida && Number(conferida) !== Number(qtd) && !l.divergence_reason?.trim()) return `${qual} a quantidade conferida difere da nota: informe o motivo.`;
      const valor = paraApi(l.unit_value);
      if (valor && (!Number.isFinite(Number(valor)) || Number(valor) < 0)) return `${qual} o valor unitário não é válido.`;
    }
    return "";
  };

  // ── Ações ──────────────────────────────────────────────────────────────────

  const confirmarRecebimento = () => {
    if (!receber) return;
    const { capa, linhas } = receber;
    const problema = conferirRecebimento(capa, linhas);
    if (problema) { setFeedback({ type: "error", message: problema }); return; }
    void run(async () => {
      const criada = await receiveRemittance({
        customer_code: capa.customer_code,
        nfe_number: Number(capa.nfe_number),
        nfe_series: capa.nfe_series || undefined,
        nfe_key: capa.nfe_key || null,
        issue_date: capa.issue_date,
        received_at: capa.received_at || undefined,
        fiscal_return_deadline: capa.fiscal_return_deadline || undefined,
        total_value: paraApi(capa.total_value) || undefined,
        sales_order_code: capa.sales_order_code || null,
        notes: capa.notes.trim() || null,
        itens: linhas.map((l, i) => ({
          customer_item_code: l.customer_item_code.trim(),
          description: l.description.trim(),
          ncm: l.ncm,
          cst: l.cst,
          uom: l.uom.trim(),
          line_number: i + 1,
          qty_invoiced: paraApi(l.qty_invoiced),
          qty_received: paraApi(l.qty_received) || undefined,
          unit_value: paraApi(l.unit_value) || undefined,
          divergence_reason: l.divergence_reason?.trim() || null,
          item_code: l.item_code || null,
        })),
      });
      setReceber(null);
      await listar();
      setSel(criada); setAba("itens"); setProposta(null); setNota(null); setHistorico(null);
      // O bloqueio automático não é erro: material sem pedido ou com conferência
      // divergente entra retido de propósito, e a pessoa precisa saber disso agora.
      setFeedback(criada.blocked
        ? { type: "info", message: `Remessa ${criada.nfe_number} registrada e BLOQUEADA: ${criada.block_reason}. Regularize antes de produzir.` }
        : { type: "success", message: `Remessa ${criada.nfe_number} registrada. Prazo de retorno: ${data(criada.fiscal_return_deadline)}.` });
    });
  };

  const confirmarVinculo = () => {
    if (!sel || !vincular?.pedido) { setFeedback({ type: "error", message: "Escolha o pedido de beneficiamento." }); return; }
    const pedido = vincular.pedido;
    void run(async () => {
      const antes = sel.blocked;
      const r = await linkSalesOrder(sel.id, pedido);
      setVincular(null); setSel(r); setProposta(null);
      await listar();
      setFeedback({ type: "success", message: antes && !r.blocked
        ? "Pedido vinculado e material liberado para a produção."
        : "Pedido de beneficiamento vinculado à remessa." });
    });
  };

  const transmitir = () => {
    const pendente = sel?.pending_exit;
    if (!sel || !pendente) return;
    void run(async () => {
      try {
        const autorizada = await authorizeExit(pendente.id);
        setNota(null); setProposta(null); setHistorico(null);
        await recarregar(sel.id);
        // A SEFAZ pode não ter respondido, ou os efeitos da nota podem ter ficado pendentes.
        const avisos = (autorizada.warnings ?? []).map((a) => a.charAt(0).toUpperCase() + a.slice(1)).join(" ");
        setFeedback(autorizada.status === "AUTHORIZED" && !avisos
          ? { type: "success", message: `${rotuloDaNota(autorizada)} autorizada pela SEFAZ.` }
          : { type: "info", message: avisos || `${rotuloDaNota(autorizada)} ainda não foi autorizada. Consulte a situação na tela de notas fiscais de saída.` });
      } catch (erro) {
        // A rejeição grava o motivo na nota: recarrega para o painel mostrá-lo.
        await recarregar(sel.id);
        throw erro;
      }
    });
  };

  const confirmarDescarte = () => {
    const pendente = sel?.pending_exit;
    if (!sel || !pendente || !descartar) return;
    if (descartar.motivo.trim().length < 15) { setFeedback({ type: "error", message: "Descreva o motivo com pelo menos 15 caracteres." }); return; }
    void run(async () => {
      await discardBeneficiamentoNote(pendente.id, descartar.motivo.trim());
      setDescartar(null); setNota(null); setProposta(null); setHistorico(null);
      await recarregar(sel.id);
      setFeedback({ type: "success", message: `Nota descartada. O saldo voltou para o cliente.` });
    });
  };

  const confirmarBloqueio = () => {
    if (!sel || !bloquear) return;
    if (!bloquear.motivo.trim()) { setFeedback({ type: "error", message: "Informe o motivo do bloqueio." }); return; }
    void run(async () => {
      await blockRemittance(sel.id, bloquear.motivo.trim());
      setBloquear(null); await recarregar(sel.id);
      setFeedback({ type: "success", message: "Remessa bloqueada. O material não pode ir para a produção." });
    });
  };

  const liberar = () => {
    if (!sel) return;
    void run(async () => {
      await unblockRemittance(sel.id);
      await recarregar(sel.id);
      setFeedback({ type: "success", message: "Remessa liberada para a produção." });
    });
  };

  const confirmarEncerramento = () => {
    if (!sel || !encerrar) return;
    void run(async () => {
      await closeRemittance(sel.id, encerrar.motivo.trim());
      setEncerrar(null); await recarregar(sel.id);
      setFeedback({ type: "success", message: "Remessa encerrada." });
    });
  };

  const abrirMovimento = (item: RemittanceItemDTO) => {
    setMov({ item, tipo: "RETURN", quantidade: "", destino: "", motivo: "", historico: null });
    void run(async () => {
      const [historicoDoItem, ordens] = await Promise.all([listMovements(item.id), ordensDeFabricacao()]);
      setOfs(Object.fromEntries(ordens.map((o) => [o.code, String(o.displayCode ?? o.code)])));
      setMov((m) => (m && m.item.id === item.id ? { ...m, historico: historicoDoItem } : m));
    });
  };

  const lancar = () => {
    if (!sel || !mov) return;
    const quantidade = paraApi(mov.quantidade);
    if (!quantidade) { setFeedback({ type: "error", message: "Informe a quantidade do movimento." }); return; }
    if (mov.tipo === "SCRAP" && !mov.destino) { setFeedback({ type: "error", message: "Sucata exige destinação." }); return; }
    if (mov.tipo === "ADJUSTMENT" && !mov.motivo.trim()) { setFeedback({ type: "error", message: "Ajuste exige justificativa." }); return; }
    void run(async () => {
      await createMovement(mov.item.id, {
        movement_type: mov.tipo,
        quantity: quantidade,
        scrap_destination: mov.tipo === "SCRAP" ? (mov.destino as ScrapDestination) : null,
        reason: mov.motivo.trim() || null,
        production_order_id: mov.of ?? null,
        // A chave é derivada do conteúdo: um duplo clique produz a mesma e o
        // servidor devolve o movimento original em vez de baixar o saldo de novo.
        idempotency_key: movementKey(mov.item.id, mov.tipo, quantidade),
      });
      const r = await recarregar(sel.id);
      const item = r.itens.find((i) => i.id === mov.item.id) ?? mov.item;
      setMov({ item, tipo: "RETURN", quantidade: "", destino: "", motivo: "", historico: await listMovements(item.id) });
      setProposta(null); setHistorico(null);
      setFeedback({ type: "success", message: `${MOVEMENT_LABELS[mov.tipo]} registrado para ${item.customer_item_code}.` });
    });
  };

  const faturar = () => {
    if (!sel) return;
    const devolucoes: DevolucaoNaNota[] = Object.entries(aDevolver)
      .filter(([, v]) => n(paraApi(v.qtd)) > 0)
      .map(([id, v]) => ({ remittance_item_id: Number(id), quantity: paraApi(v.qtd), movement_type: v.tipo }));
    if (devolucoes.length === 0) {
      setFeedback({ type: "error", message: "A nota de beneficiamento devolve o material do cliente junto com o serviço: informe o que retorna." });
      return;
    }
    if (!proposta?.sales_order && !paraApi(servico.valor_unitario)) {
      setFeedback({ type: "error", message: "Informe o valor do serviço de beneficiamento." });
      return;
    }
    void run(async () => {
      // O destinatário não é montado aqui: o servidor resolve pelo cadastro do
      // cliente da remessa, pelo mesmo caminho da nota de venda.
      const emitida = await faturarBeneficiamento(sel.id, {
        servico: {
          codigo_item: servico.codigo_item.trim() || undefined,
          descricao: servico.descricao.trim() || undefined,
          unidade: servico.unidade.trim() || undefined,
          quantidade: paraApi(servico.quantidade) || undefined,
          valor_unitario: paraApi(servico.valor_unitario) || undefined,
          sales_order_item_code: linhaPedido,
        },
        devolucoes,
        serie: serie.trim() || undefined,
      });
      setNota(emitida); setProposta(null); setHistorico(null);
      await recarregar(sel.id);
      setFeedback({ type: "success", message: `Nota criada em rascunho. Use Transmitir para enviar à SEFAZ.` });
    });
  };

  // ── Derivados da remessa aberta ───────────────────────────────────────────

  const situacao = sel ? situacaoRemessa(sel.status, sel.blocked, sel.pending_exit?.status) : null;
  const prazoSel = sel ? prazo(sel.dias_para_o_prazo, sel.status) : null;
  const temSaldo = sel ? n(sel.saldo_total) > 0 : false;
  const somaItens = (campo: keyof RemittanceItemDTO) => (sel ? sel.itens.reduce((s, i) => s + n(i[campo] as string), 0) : 0);
  const valorServico = n(paraApi(servico.quantidade)) * n(paraApi(servico.valor_unitario));
  const ABAS: Aba<AbaRemessa>[] = [
    { id: "itens", label: "Itens e movimentos", contador: sel?.itens.length ?? 0 },
    { id: "faturar", label: "Faturamento", hint: "Nota com o serviço (5124) e a devolução do material (5902/5903)", desabilitada: !sel || fechada(sel) },
    { id: "historico", label: "Histórico e auditoria" },
  ];

  return (
    <div className="erp-screen">
      <Cabecalho modulo="Almoxarifado" titulo="Beneficiamento — Remessas e Retorno Fiscal" codigo="VBEN0100" />

      <div className="erp-toolbar vpl-toolbar">
        <button className="erp-btn erp-btn-new" onClick={() => { setFeedback(null); setReceber({ capa: { ...CAPA_VAZIA(), customer_code: cliente ?? 0 }, linhas: [linhaVazia()] }); }} disabled={busy}>+ Receber remessa</button>
        <div className="erp-tgroup"><button className="erp-btn" onClick={() => void run(async () => { await listar(); if (sel) setSel(await getRemittance(sel.id)); })} disabled={busy}>Atualizar</button></div>
        <div className="erp-tgroup" style={{ minWidth: 280 }}><span className="erp-tgroup-label">Cliente</span>
          <div style={{ flex: 1 }}><LookupField value={cliente} loader={loadCustomers} entityLabel="cliente" placeholder="Todos os clientes" clearable onChange={(c) => setCliente(c ? Number(c) : undefined)} /></div></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VBEN0100 — Remessas de Beneficiamento" filename="vben0100" build={() => ({
          columns: ["NF-e", "Cliente", "Pedido", "Emissão", "Prazo de retorno", "Falta", "Situação", "Saldo aqui"],
          rows: visiveis.map((r) => [`${r.nfe_number}/${r.nfe_series}`, r.customer_name || String(r.customer_code), numeroDoPedido(r) ? String(numeroDoPedido(r)) : "—",
            data(r.issue_date), data(r.fiscal_return_deadline), prazo(r.dias_para_o_prazo, r.status).texto, situacaoRemessa(r.status, r.blocked, r.pending_exit?.status).rotulo, num(fechada(r) ? 0 : n(r.saldo_total), 4)]),
        })} /></div>
      </div>

      <div className="erp-content">
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head">
              <span className="erp-panel-title">Remessas</span><span className="erp-count">{visiveis.length}</span>
              <div className="erp-panel-head-spacer" />
              <input className="erp-search" placeholder="NF-e, pedido ou item…" aria-label="Buscar remessa" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <div className="vpl-list-filters">
              {FILTROS.map((f) => <button key={f.id || "todas"} type="button" className={`erp-chip${filtro === f.id ? " active" : ""}`} onClick={() => setFiltro(f.id)}>{f.rotulo}</button>)}
            </div>
            <div className="erp-list">
              {visiveis.length === 0 && <div className="erp-list-empty">{lista.length ? "Nenhuma remessa com esse filtro." : "Nenhuma remessa recebida."}</div>}
              {visiveis.map((r) => {
                const s = situacaoRemessa(r.status, r.blocked, r.pending_exit?.status);
                const p = prazo(r.dias_para_o_prazo, r.status);
                return (
                  <div key={r.id} className={`erp-list-row${sel?.id === r.id ? " sel" : ""}`} onClick={() => void abrir(r.id)}
                    role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") void abrir(r.id); }}>
                    <span className="erp-list-code">NF-e {r.nfe_number}/{r.nfe_series}</span>
                    <span className="erp-list-sub"><EntityName code={r.customer_code} loader={loadCustomers} prefix="Cliente" /></span>
                    <span className="vpl-list-row-right"><Selo tom={s.tom}>{s.rotulo}</Selo></span>
                    <div className="erp-list-meta" style={{ width: "100%" }}>
                      <span className="erp-text-muted" style={{ fontSize: 11.5 }}>{numeroDoPedido(r) ? `Pedido ${numeroDoPedido(r)}` : "Sem pedido"} · prazo {data(r.fiscal_return_deadline)}</span>
                      <div style={{ flex: 1 }} />
                      {p.tom === "danger" || p.tom === "warn" ? <Selo tom={p.tom}>{p.texto}</Selo> : <span className="erp-list-money" title="Saldo do cliente aqui">{num(n(r.saldo_total), 4)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="erp-detail-panel">
            {!sel ? (
              <div className="erp-detail-body"><Aviso feedback={feedback} busy={busy} />
                <Kpis itens={[
                  { label: "Com material aqui", value: num(kpis.comMaterial, 0), hint: "remessas com saldo do cliente", tom: "info", onClick: () => setFiltro("abertas") },
                  { label: "Bloqueadas", value: num(kpis.bloqueadas, 0), hint: "sem pedido ou com divergência", tom: kpis.bloqueadas ? "warn" : "ok", onClick: () => setFiltro("bloqueadas") },
                  { label: "Prazo vencido", value: num(kpis.vencidas, 0), hint: "retorno fiscal em atraso", tom: kpis.vencidas ? "danger" : "ok", onClick: () => setFiltro("vencendo") },
                  { label: "Vencendo", value: num(kpis.vencendo, 0), hint: "em até 5 dias", tom: kpis.vencendo ? "warn" : "ok", onClick: () => setFiltro("vencendo") },
                ]} />
                <Vazio titulo="Escolha uma remessa na lista" texto={<>Receba a <strong>NF-e de remessa do cliente</strong> (CFOP 5901) ligada ao <strong>pedido de beneficiamento</strong>. A produção aponta só as horas, e o faturamento sai numa nota única: o <strong>serviço</strong> (5124) e a <strong>devolução do material</strong> (5902).</>}
                  acao={<button className="erp-btn erp-btn-primary" onClick={() => setReceber({ capa: { ...CAPA_VAZIA(), customer_code: cliente ?? 0 }, linhas: [linhaVazia()] })}>+ Receber remessa</button>} />
              </div>
            ) : (<>
              <div style={{ padding: "14px 16px 0" }}>
                <div className="vpl-record">
                  <div className="vpl-record-main">
                    <div className="vpl-record-title">NF-e {sel.nfe_number}/{sel.nfe_series} {situacao && <Selo tom={situacao.tom}>{situacao.rotulo}</Selo>} {prazoSel && prazoSel.tom !== "muted" && <Selo tom={prazoSel.tom} title="Prazo fiscal de retorno">{prazoSel.texto}</Selo>}</div>
                    <div className="vpl-record-sub"><EntityName code={sel.customer_code} loader={loadCustomers} prefix="Cliente" /> · {numeroDoPedido(sel) ? `Pedido ${numeroDoPedido(sel)}` : "sem pedido de beneficiamento"} · emitida em {data(sel.issue_date)}</div>
                  </div>
                  <div className="vpl-record-actions">
                    {!fechada(sel) && temSaldo && !sel.blocked && <button className="erp-btn erp-btn-primary" onClick={() => setAba("faturar")} disabled={busy}>Faturar</button>}
                    {!fechada(sel) && !sel.pending_exit && <button className="erp-btn" onClick={() => { setFeedback(null); setVincular({ pedido: sel.sales_order_code ?? undefined }); }} disabled={busy}
                      title="Liga a remessa ao pedido de venda de beneficiamento do cliente">{sel.sales_order_code ? "Trocar pedido" : "Vincular pedido"}</button>}
                    {!fechada(sel) && (sel.blocked
                      ? <button className="erp-btn" onClick={liberar} disabled={busy}>Liberar material</button>
                      : <button className="erp-btn erp-btn-danger" onClick={() => { setFeedback(null); setBloquear({ motivo: "" }); }} disabled={busy}>Bloquear</button>)}
                    {!fechada(sel) && <button className="erp-btn erp-btn-danger" onClick={() => { setFeedback(null); setEncerrar({ motivo: "" }); }} disabled={busy}>Encerrar</button>}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 10 }}><Abas abas={ABAS} ativa={aba} onChange={setAba} /></div>
              <div className="erp-detail-body">
                <Aviso feedback={feedback} busy={busy} />

                {sel.pending_exit && (
                  <Painel titulo={`Nota pendente — ${situacao?.rotulo ?? ""}`} sub="o material só sai da empresa com a autorização"
                    acoes={sel.pending_exit.status === "AGUARDANDO_AUTORIZACAO" ? undefined : (<>
                      <button className="erp-btn erp-btn-sm erp-btn-primary" onClick={transmitir} disabled={busy}>{busy && <span className="erp-spin" />}Transmitir</button>
                      <button className="erp-btn erp-btn-sm erp-btn-danger" onClick={() => { setFeedback(null); setDescartar({ motivo: "" }); }} disabled={busy}>Descartar nota</button>
                    </>)}>
                    {sel.pending_exit.status === "REJECTED" && sel.pending_exit.rejection_reason
                      ? <p className="erp-note"><strong>Motivo da rejeição:</strong> {sel.pending_exit.rejection_reason.replace(/\.\s*$/, "")}. A nota guarda os dados de quando foi criada: se a correção foi no cadastro do cliente, no cBenef ou no texto legal, descarte a nota e fature de novo.</p>
                      : sel.pending_exit.status === "AGUARDANDO_AUTORIZACAO"
                        ? <p className="erp-note">A SEFAZ ainda não respondeu. Consulte a situação na tela de notas fiscais de saída.</p>
                        : <p className="erp-note">O saldo já está reservado para esta nota. Transmita para autorizar, ou descarte para devolver o saldo ao cliente.</p>}
                  </Painel>
                )}

                {aba === "itens" && (<>
                  <Kpis itens={[
                    { label: "Recebido", value: num(somaItens("qty_received"), 4), hint: `nota: ${num(somaItens("qty_invoiced"), 4)}` },
                    { label: "Devolvido", value: num(somaItens("qty_returned"), 4), hint: `sobra ${num(somaItens("qty_leftover"), 4)} · sucata ${num(somaItens("qty_scrapped"), 4)}` },
                    { label: fechada(sel) ? "Saldo ao encerrar" : "Saldo do cliente aqui", value: num(n(sel.saldo_total), 4), tom: temSaldo ? "info" : "ok" },
                    { label: "Prazo de retorno", value: data(sel.fiscal_return_deadline), hint: prazoSel?.texto, tom: prazoSel?.tom === "muted" ? undefined : prazoSel?.tom },
                  ]} />
                  {sel.blocked && <div className="erp-feedback error" role="status">Bloqueada: {sel.block_reason}. O material não pode ir para a produção nem ser faturado.</div>}
                  <Painel titulo="Itens da nota do cliente" sub="o código e o NCM saem iguais na devolução" flush>
                    <table className="erp-grid">
                      <thead><tr>
                        <th>#</th><th>Item do cliente</th><th>Descrição</th><th>NCM</th><th>UM</th>
                        <th className="num">Nota</th><th className="num">Conferido</th><th className="num">Devolvido</th><th className="num">Sobra</th><th className="num">Sucata</th>
                        <th className="num">Saldo aqui</th>{sel.itens.some(temDivergencia) && <th>Divergência</th>}<th style={{ position: "sticky", right: 0 }}></th>
                      </tr></thead>
                      <tbody>
                        {sel.itens.map((item) => (
                          <tr key={item.id}>
                            <td>{item.line_number}</td>
                            <td>{item.customer_item_code}</td>
                            <td>{item.description}</td>
                            <td>{item.ncm}</td>
                            <td>{item.uom}</td>
                            <td className="num">{num(n(item.qty_invoiced), 4)}</td>
                            <td className="num">{num(n(item.qty_received), 4)}</td>
                            <td className="num">{num(n(item.qty_returned), 4)}</td>
                            <td className="num">{num(n(item.qty_leftover), 4)}</td>
                            <td className="num">{num(n(item.qty_scrapped), 4)}</td>
                            <td className="num"><strong>{num(n(item.balance_qty), 4)}</strong></td>
                            {sel.itens.some(temDivergencia) && (
                              <td className={temDivergencia(item) ? "erp-cell-warn" : ""}>
                                {temDivergencia(item) ? `${num(n(item.divergence_qty), 4)} (${item.divergence_reason ?? "sem motivo"})` : "—"}
                              </td>
                            )}
                            <td style={COLUNA_FIXA}><button className="erp-btn erp-btn-sm" onClick={() => abrirMovimento(item)} disabled={busy}>Movimentos</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Painel>
                  <Painel titulo="Dados da remessa">
                    <Detalhe itens={[
                      { label: "Cliente", value: <EntityName code={sel.customer_code} loader={loadCustomers} prefix="Cliente" />, forte: true },
                      { label: "Pedido de beneficiamento", value: numeroDoPedido(sel) ? `Pedido ${numeroDoPedido(sel)}` : "—" },
                      { label: "CFOP da remessa", value: sel.cfop },
                      { label: "Emissão", value: data(sel.issue_date) },
                      { label: "Recebimento", value: data(sel.received_at) },
                      { label: "Valor da nota", value: num(n(sel.total_value), 2) },
                      { label: "Chave de acesso", value: sel.nfe_key || "—" },
                      { label: "Observação", value: sel.notes || "—" },
                      ...(sel.close_reason ? [{ label: "Motivo do encerramento", value: sel.close_reason }] : []),
                    ]} />
                  </Painel>
                </>)}

                {aba === "faturar" && (nota ? (
                  <Painel titulo="Nota criada em rascunho" sub={nota.natureza_operacao}
                    acoes={<button className="erp-btn erp-btn-sm" onClick={() => setNota(null)}>Novo faturamento</button>}>
                    <Kpis itens={[
                      { label: "Serviço (cobrado)", value: num(n(nota.valor_servico), 2), hint: "vira duplicata e receita", tom: "info" },
                      { label: "Material devolvido", value: num(n(nota.valor_material), 2), hint: "volta ao cliente, não é cobrado" },
                      { label: "Total da nota", value: num(n(nota.valor_total), 2) },
                      { label: "Saldo ainda aqui", value: num(n(nota.saldo_restante), 4), tom: n(nota.saldo_restante) > 0 ? "warn" : "ok" },
                    ]} />
                    <table className="erp-grid">
                      <thead><tr><th>#</th><th>Descrição</th><th>NCM</th><th>CFOP</th><th>CST ICMS</th><th>UM</th><th className="num">Qtd.</th><th className="num">Valor unit.</th><th className="num">Total</th><th className="num">PIS</th><th className="num">COFINS</th></tr></thead>
                      <tbody>{nota.linhas.map((l) => (
                        <tr key={l.sequencia}><td>{l.sequencia}</td><td>{l.descricao}</td><td>{l.ncm}</td><td><strong>{l.cfop}</strong></td><td>{l.cst_icms}</td><td>{l.unidade}</td>
                          <td className="num">{num(n(l.quantidade), 4)}</td><td className="num">{num(n(l.valor_unitario), 4)}</td><td className="num">{num(n(l.valor_total), 2)}</td>
                          <td className="num">{l.cst_pis ? num(n(l.valor_pis), 2) : "—"}</td><td className="num">{l.cst_cofins ? num(n(l.valor_cofins), 2) : "—"}</td></tr>
                      ))}</tbody>
                    </table>
                    <p className="erp-note" style={{ marginTop: 10 }}>Dados adicionais: {nota.observacao}<br />A nota está em <strong>rascunho</strong>: use <strong>Transmitir</strong>, acima, ou a tela de notas fiscais de saída. Ao ser autorizada, a linha do pedido é dada por atendida e a cobrança considera <strong>só o serviço</strong>.</p>
                  </Painel>
                ) : !proposta ? <Vazio titulo="Carregando o faturamento…" /> : (<>
                  {proposta.aviso && <div className="erp-feedback info" role="status">{proposta.aviso.charAt(0).toUpperCase() + proposta.aviso.slice(1)}</div>}
                  {proposta.sales_order ? (
                    <Painel titulo={`Pedido de beneficiamento ${proposta.sales_order.order_number}`} sub="escolha a linha do serviço que esta nota fatura" flush>
                      <table className="erp-grid">
                        <thead><tr><th></th><th>Linha</th><th>Serviço</th><th>UM</th><th className="num">Pedida</th><th className="num">Atendida</th><th className="num">Em outra nota</th><th className="num">Saldo</th><th className="num">Preço</th></tr></thead>
                        <tbody>{proposta.sales_order.lines.map((l) => {
                          const aberta = n(l.balance_qty) > 0 && l.status !== "CANCELLED";
                          return (
                            <tr key={l.code} className={aberta ? undefined : "erp-row-muted"} onClick={() => aberta && escolherLinha(l)} style={{ cursor: aberta ? "pointer" : undefined }}>
                              <td><input type="radio" name="linha-pedido" aria-label={`Linha ${l.sequence}`} checked={linhaPedido === l.code} disabled={!aberta} onChange={() => escolherLinha(l)} /></td>
                              <td>{l.sequence}</td><td>{l.item_business_code} — {l.description}</td><td>{l.uom || "—"}</td>
                              <td className="num">{num(n(l.requested_qty), 4)}</td><td className="num">{num(n(l.attended_qty), 4)}</td>
                              <td className="num">{n(l.in_draft_qty) > 0 ? num(n(l.in_draft_qty), 4) : "—"}</td>
                              <td className="num"><strong>{num(n(l.balance_qty), 4)}</strong></td><td className="num">{num(n(l.unit_price), 4)}</td>
                            </tr>
                          );
                        })}</tbody>
                      </table>
                    </Painel>
                  ) : (
                    <Painel titulo="Remessa sem pedido de beneficiamento" acoes={<button className="erp-btn erp-btn-sm" onClick={() => setVincular({})} disabled={busy}>Vincular pedido</button>}>
                      <p className="erp-note">Sem pedido, o serviço é informado à mão e nenhum pedido é dado por atendido. Vincule o pedido de venda do cliente para o serviço vir da linha do pedido.</p>
                    </Painel>
                  )}

                  <Painel titulo="Serviço — CFOP 5124" sub={valorServico > 0 ? `valor do serviço: ${num(valorServico, 2)}` : undefined}>
                    <div className="erp-fieldset-body" style={{ padding: 0 }}>
                      <div className="erp-field erp-c5"><label className="erp-label erp-req" htmlFor="ben-serv-desc">Descrição do serviço</label>
                        <input id="ben-serv-desc" className="erp-input" value={servico.descricao} placeholder={proposta.sales_order ? "da linha do pedido" : "SERVICO INDUSTRIALIZACAO"} onChange={(e) => setServico((p) => ({ ...p, descricao: e.target.value }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label" htmlFor="ben-serv-cod">Código do serviço</label>
                        <input id="ben-serv-cod" className="erp-input" value={servico.codigo_item} onChange={(e) => setServico((p) => ({ ...p, codigo_item: e.target.value }))} /></div>
                      <div className="erp-field erp-c1"><label className="erp-label" htmlFor="ben-serv-um">UM</label>
                        <input id="ben-serv-um" className="erp-input" value={servico.unidade} onChange={(e) => setServico((p) => ({ ...p, unidade: e.target.value }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label erp-req" htmlFor="ben-serv-qtd">Quantidade</label>
                        <input id="ben-serv-qtd" className="erp-input num" inputMode="decimal" value={servico.quantidade} onChange={(e) => setServico((p) => ({ ...p, quantidade: e.target.value }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label erp-req" htmlFor="ben-serv-vlr">Valor unitário</label>
                        <input id="ben-serv-vlr" className="erp-input num" inputMode="decimal" value={servico.valor_unitario} onChange={(e) => setServico((p) => ({ ...p, valor_unitario: e.target.value }))} /></div>
                    </div>
                  </Painel>

                  <Painel titulo="Devolução do material — CFOP 5902 / 5903" sub="proposta: o saldo inteiro de cada linha" flush>
                    <table className="erp-grid">
                      <thead><tr><th>Item do cliente</th><th>Descrição</th><th>UM</th><th className="num">Saldo aqui</th><th>Devolver nesta nota</th><th>Como</th></tr></thead>
                      <tbody>
                        {sel.itens.filter((i) => n(i.balance_qty) > 0).map((item) => (
                          <tr key={item.id}>
                            <td>{item.customer_item_code}</td><td>{item.description}</td><td>{item.uom}</td>
                            <td className="num">{num(n(item.balance_qty), 4)}</td>
                            <td><input className="erp-cell-input num" inputMode="decimal" aria-label={`Devolver ${item.customer_item_code}`} value={aDevolver[item.id]?.qtd ?? ""}
                              onChange={(e) => setADevolver((p) => ({ ...p, [item.id]: { qtd: e.target.value, tipo: p[item.id]?.tipo ?? "RETURN" } }))} /></td>
                            <td><select className="erp-cell-input" style={{ minWidth: 175 }} aria-label={`Como devolver ${item.customer_item_code}`} value={aDevolver[item.id]?.tipo ?? "RETURN"}
                              onChange={(e) => setADevolver((p) => ({ ...p, [item.id]: { qtd: p[item.id]?.qtd ?? "", tipo: e.target.value as MovementType } }))}>
                              <option value="RETURN">Processado — 5902</option>
                              <option value="LEFTOVER">Sobra — 5903</option>
                              <option value="SCRAP">Sucata — 5903</option>
                            </select></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Painel>

                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <label className="erp-label" htmlFor="ben-serie" style={{ margin: 0 }}>Série</label>
                    <input id="ben-serie" className="erp-input" style={{ width: 70 }} value={serie} onChange={(e) => setSerie(e.target.value)} />
                    <span className="erp-field-hint" style={{ flex: 1 }}>ICMS diferido no serviço e suspenso no material; PIS e COFINS só sobre o serviço. CFOP e tributação vêm das regras fiscais. A cobrança (duplicata e conta a receber) é só do serviço.</span>
                    <button className="erp-btn erp-btn-primary" onClick={faturar} disabled={busy || sel.blocked}>{busy && <span className="erp-spin" />}Gerar nota</button>
                  </div>
                </>))}

                {aba === "historico" && (
                  <Painel titulo="Histórico e auditoria" sub="registro permanente: não pode ser alterado nem apagado" flush>
                    {!historico ? <Vazio titulo="Carregando…" /> : historico.length === 0 ? <Vazio titulo="Sem alterações registradas" /> : (
                      <table className="erp-grid">
                        <thead><tr><th>Data e hora</th><th>Usuário</th><th>Operação</th><th>Registro</th><th>Campo</th><th>Antes</th><th>Depois</th><th>Motivo</th></tr></thead>
                        <tbody>
                          {historico.map((ev, indice) => {
                            const campos = auditChangedFields(ev);
                            // Uma linha por campo: "antes e depois" de dois campos na mesma linha não se lê.
                            const linhas = campos.length > 0 ? campos : [""];
                            return linhas.map((campo, i) => (
                              <tr key={`${ev.id}-${campo || i}`} style={{ background: indice % 2 ? "var(--v-surface-2)" : "var(--v-surface)" }}>
                                {i === 0 && (<Fragment>
                                  <td rowSpan={linhas.length}>{dataHora(ev.occurred_at)}</td>
                                  <td rowSpan={linhas.length}>{ev.actor_name ?? ev.actor_email ?? "—"}</td>
                                  <td rowSpan={linhas.length}>{AUDIT_ACTION_LABELS[ev.action]}</td>
                                  <td rowSpan={linhas.length}>{AUDIT_ENTITY_LABELS[ev.entity_type] ?? "Registro"}</td>
                                </Fragment>)}
                                <td>{campo ? auditFieldLabel(campo) : "—"}</td>
                                <td>{valorDoHistorico(ev.before, campo)}</td>
                                <td>{valorDoHistorico(ev.after, campo)}</td>
                                {i === 0 && <td rowSpan={linhas.length}>{ev.reason ?? "—"}</td>}
                              </tr>
                            ));
                          })}
                        </tbody>
                      </table>
                    )}
                  </Painel>
                )}
              </div>
            </>)}
          </section>
        </div>
      </div>

      <Rodape>
        <div className="erp-status-item">Com material aqui: <strong>{kpis.comMaterial}</strong></div>
        {kpis.vencidas > 0 && <div className="erp-status-item">Prazo vencido: <strong>{kpis.vencidas}</strong></div>}
        {sel && <div className="erp-status-item">Remessa: <strong>NF-e {sel.nfe_number}/{sel.nfe_series}</strong></div>}
      </Rodape>

      {receber && (
        <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ben-receber" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setReceber(null); }}>
          <div className="erp-modal" style={{ width: "min(1280px, 97vw)" }}>
            <div className="erp-modal-head"><div><strong id="ben-receber">Receber NF-e de remessa do cliente</strong>
              <div className="erp-field-hint">CFOP 5901. Sem pedido de beneficiamento a remessa entra bloqueada; sem prazo informado, vale 30 dias após a emissão.</div></div>
              <button className="erp-btn erp-btn-sm" onClick={() => setReceber(null)} disabled={busy}>Fechar</button></div>
            <div className="erp-modal-body">
              
              <div className="erp-fieldset-body" style={{ padding: 0 }}>
                <div className="erp-field erp-c5"><label className="erp-label erp-req">Cliente proprietário</label>
                  <LookupField value={receber.capa.customer_code || undefined} loader={loadCustomers} entityLabel="cliente"
                    onChange={(c) => setReceber((r) => r && ({ ...r, capa: { ...r.capa, customer_code: c ? Number(c) : 0, sales_order_code: 0 } }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label">Pedido de beneficiamento</label>
                  <LookupField key={receber.capa.customer_code} value={receber.capa.sales_order_code || undefined} loader={pedidosDoRecebimento}
                    entityLabel="pedido do cliente" placeholder={receber.capa.customer_code ? "Selecionar…" : "Escolha o cliente antes"} disabled={!receber.capa.customer_code} clearable
                    onChange={(c) => setReceber((r) => r && ({ ...r, capa: { ...r.capa, sales_order_code: c ? Number(c) : 0 } }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label erp-req" htmlFor="ben-nfe">NF-e</label>
                  <input id="ben-nfe" className="erp-input num" inputMode="numeric" value={receber.capa.nfe_number} onChange={(e) => setReceber((r) => r && ({ ...r, capa: { ...r.capa, nfe_number: e.target.value.replace(/\D/g, "") } }))} /></div>
                <div className="erp-field erp-c1"><label className="erp-label" htmlFor="ben-serie-r">Série</label>
                  <input id="ben-serie-r" className="erp-input" value={receber.capa.nfe_series} onChange={(e) => setReceber((r) => r && ({ ...r, capa: { ...r.capa, nfe_series: e.target.value } }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label erp-req" htmlFor="ben-emissao">Emissão</label>
                  <input id="ben-emissao" className="erp-input" type="date" value={receber.capa.issue_date} onChange={(e) => setReceber((r) => r && ({ ...r, capa: { ...r.capa, issue_date: e.target.value } }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label" htmlFor="ben-receb">Recebimento</label>
                  <input id="ben-receb" className="erp-input" type="date" value={receber.capa.received_at} onChange={(e) => setReceber((r) => r && ({ ...r, capa: { ...r.capa, received_at: e.target.value } }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label" htmlFor="ben-prazo">Prazo de retorno</label>
                  <input id="ben-prazo" className="erp-input" type="date" value={receber.capa.fiscal_return_deadline} onChange={(e) => setReceber((r) => r && ({ ...r, capa: { ...r.capa, fiscal_return_deadline: e.target.value } }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label" htmlFor="ben-valor">Valor total da nota</label>
                  <input id="ben-valor" className="erp-input num" inputMode="decimal" value={receber.capa.total_value} onChange={(e) => setReceber((r) => r && ({ ...r, capa: { ...r.capa, total_value: e.target.value } }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label" htmlFor="ben-chave">Chave de acesso (44 dígitos)</label>
                  <input id="ben-chave" className="erp-input" inputMode="numeric" value={receber.capa.nfe_key} onChange={(e) => mudarChaveDaRemessa(e.target.value)} />
                  <span className="erp-hint">Colada a chave, número e série se preenchem sozinhos.</span></div>
                <div className="erp-field erp-c12"><label className="erp-label" htmlFor="ben-obs">Observação</label>
                  <input id="ben-obs" className="erp-input" value={receber.capa.notes} onChange={(e) => setReceber((r) => r && ({ ...r, capa: { ...r.capa, notes: e.target.value } }))} /></div>
              </div>
              <div className="erp-fieldset" style={{ marginTop: 12 }}>
                <div className="erp-fieldset-head vpl-panel-head"><span className="vpl-panel-head-title">Itens da nota<span className="vpl-panel-head-sub">confira item a item; conferido diferente da nota exige motivo</span></span>
                  <span className="vpl-panel-head-actions"><button className="erp-btn erp-btn-sm" onClick={() => setReceber((r) => r && ({ ...r, linhas: [...r.linhas, linhaVazia()] }))} disabled={busy}>+ Item</button></span></div>
                <div className="vpl-panel-body flush">
                  <table className="erp-grid erp-nota-itens">
                    <colgroup>
                      <col style={{ width: 30 }} /><col /><col style={{ width: 160 }} /><col /><col style={{ width: 92 }} /><col style={{ width: 54 }} /><col style={{ width: 50 }} />
                      <col style={{ width: 82 }} /><col style={{ width: 82 }} /><col style={{ width: 88 }} /><col style={{ width: 40 }} />
                    </colgroup>
                    <thead><tr><th>#</th><th>Item do cadastro</th><th>Item do cliente</th><th>Descrição</th><th>NCM</th><th>CST</th><th>UM</th><th className="num">Qtd. nota</th><th className="num">Conferida</th><th className="num">Valor unit.</th><th></th></tr></thead>
                    <tbody>
                      {receber.linhas.map((l, i) => {
                        const mudar = (campo: keyof NewRemittanceItem, valor: string | number | null) => mudarLinha(l.uid, { [campo]: valor });
                        const divergente = !!paraApi(l.qty_received) && n(paraApi(l.qty_received)) !== n(paraApi(l.qty_invoiced));
                        return (
                          <Fragment key={l.uid}>
                          <tr>
                            <td>{i + 1}</td>
                            <td><LookupField<string> value={l.item_code ? String(l.item_code) : undefined} loader={loadItems} entityLabel="item" placeholder="Buscar item" allowManualCode={false} clearable
                              onChange={(c) => void escolherItemInterno(l.uid, c ? String(c) : undefined)} />
                              {l.carregando && <span className="erp-nota-aviso"><span className="erp-spin" /> Buscando os dados do item…</span>}
                              {l.aviso && <span className="erp-nota-aviso">{l.aviso}</span>}</td>
                            <td><LookupField<string> key={receber.capa.customer_code} value={l.customer_item_code || undefined} loader={materiaisDoCliente} entityLabel="material deste cliente" placeholder="Buscar" clearable textoLivre
                              onChange={(c) => escolherMaterialDoCliente(l.uid, c ? String(c) : undefined)} /></td>
                            <td><input className="erp-cell-input" aria-label="Descrição" value={l.description} onChange={(e) => mudar("description", e.target.value)} /></td>
                            <td><input className="erp-cell-input" aria-label="NCM" inputMode="numeric" value={l.ncm} onChange={(e) => mudar("ncm", e.target.value.replace(/\D/g, "").slice(0, 8))} /></td>
                            <td><input className="erp-cell-input" aria-label="CST" maxLength={3} value={l.cst ?? ""} onChange={(e) => mudar("cst", e.target.value.replace(/\D/g, ""))} /></td>
                            <td><input className="erp-cell-input" aria-label="Unidade" value={l.uom} onChange={(e) => mudar("uom", e.target.value.toUpperCase())} /></td>
                            <td><input className="erp-cell-input num" aria-label="Quantidade da nota" inputMode="decimal" value={l.qty_invoiced} onChange={(e) => mudar("qty_invoiced", e.target.value)} /></td>
                            <td><input className="erp-cell-input num" aria-label="Quantidade conferida" inputMode="decimal" placeholder="= nota" value={l.qty_received ?? ""} onChange={(e) => mudar("qty_received", e.target.value)} /></td>
                            <td><input className="erp-cell-input num" aria-label="Valor unitário" inputMode="decimal" value={l.unit_value ?? ""} onChange={(e) => mudar("unit_value", e.target.value)} /></td>
                            <td><button className="erp-btn erp-btn-sm" onClick={() => setReceber((r) => r && ({ ...r, linhas: r.linhas.length === 1 ? r.linhas : r.linhas.filter((x) => x.uid !== l.uid) }))}
                              disabled={busy || receber.linhas.length === 1} aria-label={`Remover item ${i + 1}`}>×</button></td>
                          </tr>
                          {/* Só existe quando há divergência: o motivo é obrigatório nesse caso e não ocupa coluna nos demais. */}
                          {divergente && (
                            <tr>
                              <td></td>
                              <td colSpan={10}><input className={`erp-cell-input${!l.divergence_reason?.trim() ? " erp-input-invalid" : ""}`} aria-label="Motivo da divergência"
                                value={l.divergence_reason ?? ""} placeholder="Motivo da divergência (obrigatório)" onChange={(e) => mudar("divergence_reason", e.target.value)} /></td>
                            </tr>
                          )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <span className="erp-field-hint">Escolha o item do cadastro para trazer descrição, NCM e unidade, ou o material que este cliente já mandou para repetir os dados da última remessa. O item do cadastro é opcional: ligue-o quando for componente &quot;fornecido pelo cliente&quot; na estrutura do produto. Soma dos itens: R$ {moedaBR(receber.linhas.reduce((s, l) => s + n(paraApi(l.qty_invoiced)) * n(paraApi(l.unit_value)), 0))}.</span>
            </div>
            <div className="erp-modal-actions">
              {feedback?.type === "error" && <div className="erp-feedback error" role="alert" style={{ flex: 1, margin: 0, padding: "6px 10px" }}>{feedback.message}</div>}
              <button className="erp-btn" onClick={() => setReceber(null)} disabled={busy}>Cancelar</button>
              <button className="erp-btn erp-btn-primary" onClick={confirmarRecebimento} disabled={busy}>{busy && <span className="erp-spin" />}Receber remessa</button>
            </div>
          </div>
        </div>
      )}

      {descartar && sel?.pending_exit && (
        <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ben-descartar" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setDescartar(null); }}>
          <div className="erp-modal" style={{ width: "min(560px, 94vw)" }}>
            <div className="erp-modal-head"><div><strong id="ben-descartar">Descartar a nota pendente</strong>
              <div className="erp-field-hint">A nota é cancelada no sistema e o saldo volta para o cliente. Ela não chegou a ser autorizada, então nada é enviado à SEFAZ.</div></div>
              <button className="erp-btn erp-btn-sm" onClick={() => setDescartar(null)} disabled={busy}>Fechar</button></div>
            <div className="erp-modal-body">
              <Aviso feedback={feedback} busy={busy} />
              <div className="erp-field erp-c12"><label className="erp-label erp-req" htmlFor="ben-descartar-motivo">Motivo</label>
                <textarea id="ben-descartar-motivo" className="erp-input" rows={3} value={descartar.motivo} onChange={(e) => setDescartar({ motivo: e.target.value })} /></div>
            </div>
            <div className="erp-modal-actions">
              <button className="erp-btn" onClick={() => setDescartar(null)} disabled={busy}>Cancelar</button>
              <button className="erp-btn erp-btn-danger" onClick={confirmarDescarte} disabled={busy}>{busy && <span className="erp-spin" />}Descartar nota</button>
            </div>
          </div>
        </div>
      )}

      {vincular && sel && (
        <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ben-vincular" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setVincular(null); }}>
          <div className="erp-modal" style={{ width: "min(560px, 94vw)" }}>
            <div className="erp-modal-head"><div><strong id="ben-vincular">Pedido de beneficiamento da NF-e {sel.nfe_number}</strong>
              <div className="erp-field-hint">Só aparecem pedidos abertos do cliente dono do material. Se a remessa estava bloqueada por falta de pedido, o material é liberado.</div></div>
              <button className="erp-btn erp-btn-sm" onClick={() => setVincular(null)} disabled={busy}>Fechar</button></div>
            <div className="erp-modal-body">
              <Aviso feedback={feedback} busy={busy} />
              <div className="erp-field erp-c12"><label className="erp-label erp-req">Pedido de venda</label>
                <LookupField value={vincular.pedido} loader={pedidosDaRemessa} entityLabel="pedido do cliente" clearable
                  onChange={(c) => setVincular({ pedido: c ? Number(c) : undefined })} /></div>
            </div>
            <div className="erp-modal-actions">
              <button className="erp-btn" onClick={() => setVincular(null)} disabled={busy}>Cancelar</button>
              <button className="erp-btn erp-btn-primary" onClick={confirmarVinculo} disabled={busy || !vincular.pedido}>{busy && <span className="erp-spin" />}Vincular</button>
            </div>
          </div>
        </div>
      )}

      {bloquear && sel && (
        <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ben-bloquear" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setBloquear(null); }}>
          <div className="erp-modal" style={{ width: "min(520px, 94vw)" }}>
            <div className="erp-modal-head"><div><strong id="ben-bloquear">Bloquear a NF-e {sel.nfe_number}</strong>
              <div className="erp-field-hint">Material bloqueado não vai para a produção e não é faturado até ser liberado.</div></div>
              <button className="erp-btn erp-btn-sm" onClick={() => setBloquear(null)} disabled={busy}>Fechar</button></div>
            <div className="erp-modal-body">
              <Aviso feedback={feedback} busy={busy} />
              <div className="erp-field erp-c12"><label className="erp-label erp-req" htmlFor="ben-bloq-mot">Motivo</label>
                <input id="ben-bloq-mot" className="erp-input" autoFocus value={bloquear.motivo} onChange={(e) => setBloquear({ motivo: e.target.value })} /></div>
            </div>
            <div className="erp-modal-actions">
              <button className="erp-btn" onClick={() => setBloquear(null)} disabled={busy}>Cancelar</button>
              <button className="erp-btn erp-btn-danger" onClick={confirmarBloqueio} disabled={busy}>{busy && <span className="erp-spin" />}Bloquear</button>
            </div>
          </div>
        </div>
      )}

      {encerrar && sel && (
        <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ben-encerrar" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setEncerrar(null); }}>
          <div className="erp-modal" style={{ width: "min(520px, 94vw)" }}>
            <div className="erp-modal-head"><div><strong id="ben-encerrar">Encerrar a NF-e {sel.nfe_number}</strong>
              <div className="erp-field-hint">{temSaldo ? `Ainda há ${num(n(sel.saldo_total), 4)} do cliente aqui: encerrar com saldo é exceção e exige motivo.` : "Todo o material já voltou ao cliente."}</div></div>
              <button className="erp-btn erp-btn-sm" onClick={() => setEncerrar(null)} disabled={busy}>Fechar</button></div>
            <div className="erp-modal-body">
              <Aviso feedback={feedback} busy={busy} />
              <div className="erp-field erp-c12"><label className={`erp-label${temSaldo ? " erp-req" : ""}`} htmlFor="ben-enc-mot">Motivo do encerramento</label>
                <input id="ben-enc-mot" className="erp-input" autoFocus value={encerrar.motivo} onChange={(e) => setEncerrar({ motivo: e.target.value })} /></div>
            </div>
            <div className="erp-modal-actions">
              <button className="erp-btn" onClick={() => setEncerrar(null)} disabled={busy}>Cancelar</button>
              <button className="erp-btn erp-btn-danger" onClick={confirmarEncerramento} disabled={busy}>{busy && <span className="erp-spin" />}Encerrar remessa</button>
            </div>
          </div>
        </div>
      )}

      {mov && sel && (
        <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ben-mov" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setMov(null); }}>
          <div className="erp-modal" style={{ width: "min(900px, 96vw)" }}>
            <div className="erp-modal-head"><div><strong id="ben-mov">Movimentos — {mov.item.customer_item_code} · {mov.item.description}</strong>
              <div className="erp-field-hint">Saldo aqui: {num(n(mov.item.balance_qty), 4)} {mov.item.uom}. O CFOP é aplicado pelo sistema: 5902 no retorno e 5903 em sobra e sucata devolvidas.</div></div>
              <button className="erp-btn erp-btn-sm" onClick={() => setMov(null)} disabled={busy}>Fechar</button></div>
            <div className="erp-modal-body">
              <Aviso feedback={feedback} busy={busy} />
              {!fechada(sel) && (
                <div className="erp-fieldset-body" style={{ padding: 0 }}>
                  <div className="erp-field erp-c3"><label className="erp-label erp-req" htmlFor="ben-mov-tipo">Tipo</label>
                    <select id="ben-mov-tipo" className="erp-input" value={mov.tipo} onChange={(e) => setMov((m) => m && ({ ...m, tipo: e.target.value as MovementType }))}>
                      {MOVEMENT_TYPES.map((t) => <option key={t} value={t}>{MOVEMENT_LABELS[t]}</option>)}
                    </select></div>
                  <div className="erp-field erp-c2"><label className="erp-label erp-req" htmlFor="ben-mov-qtd">Quantidade</label>
                    <input id="ben-mov-qtd" className="erp-input num" inputMode="decimal" value={mov.quantidade} onChange={(e) => setMov((m) => m && ({ ...m, quantidade: e.target.value }))} /></div>
                  {mov.tipo === "SCRAP" && (
                    <div className="erp-field erp-c3"><label className="erp-label erp-req" htmlFor="ben-mov-dest">Destinação da sucata</label>
                      <select id="ben-mov-dest" className="erp-input" value={mov.destino} onChange={(e) => setMov((m) => m && ({ ...m, destino: e.target.value as ScrapDestination }))}>
                        <option value="">Selecione…</option>
                        {SCRAP_DESTINATIONS.map((d) => <option key={d} value={d}>{SCRAP_LABELS[d]}</option>)}
                      </select></div>
                  )}
                  <div className="erp-field erp-c4"><label className="erp-label">Ordem de fabricação</label>
                    <LookupField value={mov.of} loader={ordensDeFabricacao} entityLabel="ordem de fabricação" allowManualCode={false} clearable
                      onChange={(c) => setMov((m) => m && ({ ...m, of: c ? Number(c) : undefined }))} /></div>
                  <div className="erp-field erp-c12"><label className={`erp-label${mov.tipo === "ADJUSTMENT" ? " erp-req" : ""}`} htmlFor="ben-mov-mot">{mov.tipo === "ADJUSTMENT" ? "Justificativa" : "Observação"}</label>
                    <input id="ben-mov-mot" className="erp-input" value={mov.motivo} onChange={(e) => setMov((m) => m && ({ ...m, motivo: e.target.value }))} /></div>
                </div>
              )}
              <div className="erp-fieldset" style={{ marginTop: 12 }}>
                <div className="erp-fieldset-head">Movimentos do item</div>
                <div className="vpl-panel-body flush">
                  {!mov.historico ? <Vazio titulo="Carregando…" /> : mov.historico.length === 0 ? <Vazio titulo="Nenhum movimento neste item" /> : (
                    <table className="erp-grid">
                      <thead><tr><th>Quando</th><th>Tipo</th><th className="num">Quantidade</th><th>CFOP</th><th>Destinação</th><th>OF</th><th>Observação</th></tr></thead>
                      <tbody>{mov.historico.map((m) => (
                        <tr key={m.id} className={m.reversed_at ? "erp-row-muted" : undefined}>
                          <td>{dataHora(m.created_at)}</td>
                          <td>{MOVEMENT_LABELS[m.movement_type]}{m.reversed_at && <> — <strong>estornado</strong></>}</td>
                          <td className="num">{num(n(m.quantity), 4)}</td><td>{m.cfop ?? "—"}</td>
                          <td>{m.scrap_destination ? SCRAP_LABELS[m.scrap_destination] : "—"}</td>
                          <td>{m.production_order_id ? (ofs[m.production_order_id] ?? `#${m.production_order_id}`) : "—"}</td>
                          {/* O estornado explica por que o saldo não bate com a soma: a quantidade voltou ao cliente. */}
                          <td>{m.reversal_reason ?? m.reason ?? "—"}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
            <div className="erp-modal-actions">
              <button className="erp-btn" onClick={() => setMov(null)} disabled={busy}>Fechar</button>
              {!fechada(sel) && <button className="erp-btn erp-btn-primary" onClick={lancar} disabled={busy || sel.blocked} title={sel.blocked ? "Remessa bloqueada" : undefined}>{busy && <span className="erp-spin" />}Lançar movimento</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

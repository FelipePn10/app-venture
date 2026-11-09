import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type BalanceDTO, type MovementReportDTO, type MovementType,
  MOVEMENT_LABELS, SCRAP_LABELS, listBalance, listMovementReport,
} from "@/services/customerMaterialService";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadCustomers } from "@/services/lookups";
import { hojeLocal } from "@/utils/dataLocal";
import { type Aba, Abas, Aviso, Cabecalho, Kpis, Painel, Rodape, Selo, Vazio } from "../planejamento/planUi";
import { data, dataHora, num } from "../planejamento/planFormat";
import { useAcao } from "../planejamento/planHooks";
import { classeDoPrazo, diasAte, n, prazo } from "./benefFormat";

/**
 * VBEN0200 — Estoque de terceiros: o que é do cliente e está aqui.
 *
 * Ao lado do estoque próprio (VEST0100) e sem se misturar a ele: um total único
 * dos dois seria número sem significado — metade não pertence à empresa.
 *
 * Duas visões, os dois relatórios do beneficiamento:
 *  - **Inventário**: o saldo atual por cliente e pelo código do item COMO ELE
 *    APARECE na nota do cliente (é com esse código que o retorno sai), ordenado
 *    pelo prazo fiscal — a pergunta é "o que precisa voltar primeiro".
 *  - **Movimentação**: entrada (recebimento) e saída (retorno, sobra, sucata,
 *    ajuste) no período, com a nota do cliente e a nota de saída.
 */

type AbaEstoque = "inventario" | "movimentacao";
type TipoFiltro = "" | "ENTRADA" | "SAIDA" | MovementType;

const SAIDAS: MovementType[] = ["RETURN", "LEFTOVER", "SCRAP", "ADJUSTMENT"];

/** Teto do relatório de movimentos no servidor. */
const LIMITE_MOVIMENTOS = 5000;

/** Primeiro dia do mês corrente: o período padrão da movimentação. */
function inicioDoMes(): string {
  return `${hojeLocal().slice(0, 7)}-01`;
}

const STATUS_NOTA: Record<string, string> = {
  DRAFT: "rascunho", AGUARDANDO_AUTORIZACAO: "aguardando SEFAZ", AUTHORIZED: "autorizada", CANCELLED: "cancelada", REJECTED: "rejeitada",
};

export function Vben0200Page(): JSX.Element {
  const { busy, feedback, run } = useAcao();
  const [aba, setAba] = useState<AbaEstoque>("inventario");
  const [cliente, setCliente] = useState<number | undefined>();
  const [busca, setBusca] = useState("");

  const [saldos, setSaldos] = useState<BalanceDTO[] | null>(null);
  const [movs, setMovs] = useState<MovementReportDTO[] | null>(null);
  const [periodo, setPeriodo] = useState({ de: inicioDoMes(), ate: hojeLocal() });
  const [tipo, setTipo] = useState<TipoFiltro>("");
  const [estornados, setEstornados] = useState(false);

  // A resposta atrasada de uma consulta anterior não pode trocar a tela pelo
  // resultado de outro cliente.
  const ultimaConsulta = useRef(0);

  const consultarSaldo = useCallback(async () => {
    const estaConsulta = ++ultimaConsulta.current;
    const resposta = await listBalance({ customer_code: cliente, q: busca.trim() || undefined });
    if (estaConsulta === ultimaConsulta.current) setSaldos(resposta);
  }, [cliente, busca]);

  const consultarMovimentos = useCallback(async () => {
    const tipos = tipo === "ENTRADA" ? ["RECEIPT" as const] : tipo === "SAIDA" ? SAIDAS : tipo ? [tipo] : undefined;
    const estaConsulta = ++ultimaConsulta.current;
    const resposta = await listMovementReport({
      customer_code: cliente, from: periodo.de || undefined, to: periodo.ate || undefined,
      types: tipos, include_reversed: estornados, q: busca.trim() || undefined, limit: LIMITE_MOVIMENTOS,
    });
    if (estaConsulta === ultimaConsulta.current) setMovs(resposta);
  }, [cliente, periodo, tipo, estornados, busca]);

  // A troca de cliente refaz a consulta da aba aberta; a busca por texto, não —
  // ela espera o Consultar, para não consultar a cada letra.
  useEffect(() => {
    if (aba === "inventario") void run(consultarSaldo);
    else void run(consultarMovimentos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, cliente]);

  const consultar = () => void run(aba === "inventario" ? consultarSaldo : consultarMovimentos);

  const hoje = hojeLocal();
  const porCliente = useMemo(() => {
    const grupos = new Map<number, { nome: string; itens: BalanceDTO[] }>();
    for (const s of saldos ?? []) {
      const g = grupos.get(s.customer_code) ?? { nome: s.customer_name, itens: [] };
      g.itens.push(s);
      grupos.set(s.customer_code, g);
    }
    return [...grupos.entries()];
  }, [saldos]);

  const kpiSaldo = useMemo(() => {
    const lista = saldos ?? [];
    const dias = lista.map((s) => diasAte(s.prazo_mais_proximo, hoje));
    return {
      itens: lista.length,
      clientes: porCliente.length,
      vencidos: dias.filter((d) => d !== null && d < 0).length,
      vencendo: dias.filter((d) => d !== null && d >= 0 && d <= 5).length,
    };
  }, [saldos, porCliente, hoje]);

  const kpiMov = useMemo(() => {
    const vivos = (movs ?? []).filter((m) => !m.reversed_at);
    return {
      entradas: vivos.filter((m) => m.movement_type === "RECEIPT").length,
      saidas: vivos.filter((m) => m.movement_type !== "RECEIPT").length,
      valorEntrada: vivos.filter((m) => m.movement_type === "RECEIPT").reduce((s, m) => s + n(m.quantity) * n(m.unit_value), 0),
      valorSaida: vivos.filter((m) => m.movement_type !== "RECEIPT").reduce((s, m) => s + n(m.quantity) * n(m.unit_value), 0),
      estornados: (movs ?? []).length - vivos.length,
    };
  }, [movs]);

  const ABAS: Aba<AbaEstoque>[] = [
    { id: "inventario", label: "Inventário (saldo atual)", contador: saldos?.length },
    { id: "movimentacao", label: "Movimentação (entrada e saída)", contador: movs?.length },
  ];

  return (
    <div className="erp-screen">
      <Cabecalho modulo="Almoxarifado" titulo="Estoque de Terceiros — Material do Cliente" codigo="VBEN0200" />

      <div className="erp-toolbar vpl-toolbar">
        <div className="erp-tgroup"><button className="erp-btn erp-btn-primary" onClick={consultar} disabled={busy}>Consultar</button></div>
        <div className="erp-tgroup" style={{ minWidth: 280 }}><span className="erp-tgroup-label">Cliente</span>
          <div style={{ flex: 1 }}><LookupField value={cliente} loader={loadCustomers} entityLabel="cliente" placeholder="Todos os clientes" clearable onChange={(c) => setCliente(c ? Number(c) : undefined)} /></div></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Item</span>
          <input className="erp-input" style={{ width: 200 }} placeholder="código ou descrição" aria-label="Buscar item" value={busca}
            onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") consultar(); }} /></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup">
          {aba === "inventario"
            ? <ExportButton title="VBEN0200 — Inventário de Material de Terceiros" filename="vben0200-inventario" build={() => ({
              columns: ["Cliente", "Item na nota do cliente", "Descrição", "Item interno", "UM", "Saldo aqui", "Remessas", "Prazo mais próximo"],
              rows: (saldos ?? []).map((s) => [`${s.customer_code} ${s.customer_name}`, s.customer_item_code, s.description, s.item_code ? String(s.item_code) : "—", s.uom,
                num(n(s.balance), 4), String(s.remessas_abertas), data(s.prazo_mais_proximo)]),
            })} />
            : <ExportButton title="VBEN0200 — Movimentação de Material de Terceiros" filename="vben0200-movimentacao" build={() => ({
              columns: ["Data", "Tipo", "Cliente", "NF-e do cliente", "Item do cliente", "Descrição", "NCM", "UM", "Quantidade", "Valor unit.", "CFOP", "Nota de saída", "OF", "Observação"],
              rows: (movs ?? []).map((m) => [dataHora(m.created_at), `${MOVEMENT_LABELS[m.movement_type]}${m.reversed_at ? " (estornado)" : ""}`, `${m.customer_code} ${m.customer_name}`,
                `${m.nfe_number}/${m.nfe_series}`, m.customer_item_code, m.description, m.ncm, m.uom, num(n(m.quantity), 4), num(n(m.unit_value), 4), m.cfop ?? "—",
                m.exit_nf_number ? `${m.exit_nf_number}/${m.exit_nf_series ?? ""}` : "—", m.production_order_number ? `OF ${m.production_order_number}` : "—", m.reversal_reason ?? m.reason ?? ""]),
            })} />}
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div style={{ marginTop: 10 }}><Abas abas={ABAS} ativa={aba} onChange={setAba} /></div>
          <div className="erp-detail-body">
            <Aviso feedback={feedback} busy={busy} />

            {aba === "inventario" && (<>
              <Kpis itens={[
                { label: "Itens com saldo", value: num(kpiSaldo.itens, 0), hint: `de ${kpiSaldo.clientes} cliente(s)`, tom: "info" },
                { label: "Prazo vencido", value: num(kpiSaldo.vencidos, 0), hint: "retorno fiscal em atraso", tom: kpiSaldo.vencidos ? "danger" : "ok" },
                { label: "Vencendo", value: num(kpiSaldo.vencendo, 0), hint: "em até 5 dias", tom: kpiSaldo.vencendo ? "warn" : "ok" },
              ]} />
              <p className="erp-note">Material que pertence ao cliente e está fisicamente aqui. Ele <strong>não</strong> entra na valoração do estoque da empresa, no custo nem no MRP. A ordem é pelo prazo de retorno: o que precisa voltar primeiro aparece primeiro.</p>
              {saldos === null ? <Vazio titulo="Carregando…" />
                : saldos.length === 0 ? <Vazio titulo="Nada do cliente em poder da empresa" texto="Saldo zerado significa que todo o material recebido já voltou ao cliente — por retorno, sobra ou sucata devolvida." />
                  : porCliente.map(([codigo, g]) => (
                    <Painel key={codigo} titulo={`Cliente ${codigo}${g.nome ? ` — ${g.nome}` : ""}`} sub={`${g.itens.length} item(ns)`} flush>
                      <table className="erp-grid">
                        <thead><tr><th>Item na nota do cliente</th><th>Descrição</th><th>Item interno</th><th>UM</th><th className="num">Saldo aqui</th><th className="num">Remessas</th><th>Prazo mais próximo</th></tr></thead>
                        <tbody>{g.itens.map((s) => {
                          const p = prazo(diasAte(s.prazo_mais_proximo, hoje));
                          return (
                            <tr key={`${s.customer_code}-${s.customer_item_code}-${s.uom}`}>
                              <td>{s.customer_item_code}</td><td>{s.description}</td><td>{s.item_code ?? "—"}</td><td>{s.uom}</td>
                              <td className="num"><strong>{num(n(s.balance), 4)}</strong></td><td className="num">{s.remessas_abertas}</td>
                              <td className={classeDoPrazo(p.tom)}>{data(s.prazo_mais_proximo)}{p.texto !== "—" ? ` · ${p.texto}` : ""}</td>
                            </tr>
                          );
                        })}</tbody>
                      </table>
                    </Painel>
                  ))}
            </>)}

            {aba === "movimentacao" && (<>
              <div className="erp-fieldset-body" style={{ padding: 0, marginBottom: 10 }}>
                <div className="erp-field erp-c2"><label className="erp-label" htmlFor="ben-de">De</label>
                  <input id="ben-de" className="erp-input" type="date" value={periodo.de} onChange={(e) => setPeriodo((p) => ({ ...p, de: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label" htmlFor="ben-ate">Até</label>
                  <input id="ben-ate" className="erp-input" type="date" value={periodo.ate} onChange={(e) => setPeriodo((p) => ({ ...p, ate: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label" htmlFor="ben-tipo">Movimento</label>
                  <select id="ben-tipo" className="erp-input" value={tipo} onChange={(e) => setTipo(e.target.value as TipoFiltro)}>
                    <option value="">Entradas e saídas</option>
                    <option value="ENTRADA">Só entradas (recebimento)</option>
                    <option value="SAIDA">Só saídas</option>
                    {SAIDAS.map((t) => <option key={t} value={t}>{MOVEMENT_LABELS[t]}</option>)}
                  </select></div>
                <div className="erp-field erp-c3" style={{ alignSelf: "end" }}>
                  <label className="erp-label" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="checkbox" checked={estornados} onChange={(e) => setEstornados(e.target.checked)} /> Mostrar estornados</label></div>
                <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={consultar} disabled={busy}>Consultar</button></div>
              </div>
              <Kpis itens={[
                { label: "Entradas", value: num(kpiMov.entradas, 0), hint: `valor ${num(kpiMov.valorEntrada, 2)}`, tom: "info" },
                { label: "Saídas", value: num(kpiMov.saidas, 0), hint: `valor ${num(kpiMov.valorSaida, 2)}` },
                ...(estornados ? [{ label: "Estornados", value: num(kpiMov.estornados, 0), hint: "nota de saída cancelada", tom: kpiMov.estornados ? "warn" as const : "ok" as const }] : []),
              ]} />
              {(movs?.length ?? 0) >= LIMITE_MOVIMENTOS && <p className="erp-note">Mostrando só os <strong>{num(LIMITE_MOVIMENTOS, 0)} movimentos mais recentes</strong>: os totais acima e a exportação ficam incompletos. Reduza o período para ver tudo.</p>}
              {movs === null ? <Vazio titulo="Carregando…" /> : movs.length === 0 ? <Vazio titulo="Nenhum movimento no período" texto="Ajuste o período, o cliente ou o tipo de movimento." /> : (
                <Painel titulo="Movimentos" sub="mais recentes primeiro" flush>
                  <table className="erp-grid">
                    <thead><tr><th>Data</th><th>Tipo</th><th>Cliente</th><th>NF-e do cliente</th><th>Item do cliente</th><th>Descrição</th><th>UM</th><th className="num">Quantidade</th><th>CFOP</th><th>Nota de saída</th><th>OF</th><th>Observação</th></tr></thead>
                    <tbody>{movs.map((m) => (
                      <tr key={`${m.movement_type}-${m.id}`} className={m.reversed_at ? "erp-row-muted" : undefined}>
                        <td>{m.movement_type === "RECEIPT" ? data(m.created_at) : dataHora(m.created_at)}</td>
                        <td><Selo tom={m.movement_type === "RECEIPT" ? "info" : m.movement_type === "ADJUSTMENT" ? "warn" : "ok"}>{MOVEMENT_LABELS[m.movement_type]}</Selo>{m.reversed_at && <> <strong>estornado</strong></>}</td>
                        <td>{m.customer_name || m.customer_code}</td>
                        <td>{m.nfe_number}/{m.nfe_series}</td>
                        <td>{m.customer_item_code}</td><td>{m.description}</td><td>{m.uom}</td>
                        <td className="num">{m.movement_type === "RECEIPT" ? "+" : "−"}{num(n(m.quantity), 4)}</td>
                        <td>{m.cfop ?? "—"}</td>
                        <td>{m.exit_nf_number ? `${m.exit_nf_number}/${m.exit_nf_series ?? ""}${m.exit_nf_status ? ` · ${STATUS_NOTA[m.exit_nf_status] ?? m.exit_nf_status.toLowerCase()}` : ""}` : "—"}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{m.production_order_number ? `OF ${m.production_order_number}` : "—"}</td>
                        <td>{m.reversal_reason ?? (m.scrap_destination ? SCRAP_LABELS[m.scrap_destination] : null) ?? m.reason ?? "—"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </Painel>
              )}
            </>)}
          </div>
        </section>
      </div>

      <Rodape>
        {aba === "inventario"
          ? <div className="erp-status-item">Itens com saldo: <strong>{kpiSaldo.itens}</strong></div>
          : <div className="erp-status-item">Movimentos: <strong>{movs?.length ?? 0}</strong></div>}
      </Rodape>
    </div>
  );
}

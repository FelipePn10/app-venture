import { type AppointmentDTO, type ConsumptionDTO, type MaterialAvailability, type MaterialDTO, type ProductionOrderDTO } from "@/services/productionOrderService";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadItems, loadWarehouses } from "@/services/lookups";
import { CuidadosDosItens } from "@/components/system/CuidadosDosItens";
import { Painel, Selo, Vazio } from "../../planejamento/planUi";
import { data, num } from "../../planejamento/planFormat";
import { SITUACAO_FALTA } from "./operacao";
import { type MaterialDaOF } from "./materiais";
import { type MaterialForm } from "./OfTabs";

/**
 * Materiais da OF: tudo o que a ordem consome, da estrutura do item, numa
 * lista só — em que etapa entra, quanto por peça, previsto, já saiu, falta
 * sair, se há saldo e se a baixa é automática. Embaixo, o que se lança à mão
 * (consumo extra ou perda, retorno de sucata) e o histórico desses lançamentos.
 */
export function MateriaisOFTab(p: {
  of: ProductionOrderDTO; busy: boolean; gestor: boolean;
  linhas: MaterialDaOF[]; disponibilidade: MaterialAvailability | null;
  cons: ConsumptionDTO; setCons: (f: (p: ConsumptionDTO) => ConsumptionDTO) => void; onConsumir: () => void; onRetornarSucata: () => void;
  apontamentos: AppointmentDTO[]; consumos: ConsumptionDTO[];
  form: MaterialForm; setForm: (f: (p: MaterialForm) => MaterialForm) => void;
  onIncluir: () => void; onAlocar: (m: MaterialDTO) => void; onSucata: (m: MaterialDTO) => void;
}): JSX.Element {
  const { of, busy, linhas, disponibilidade } = p;
  const emProducao = of.status === "IN_PROGRESS";
  const sit = disponibilidade && disponibilidade.status !== "SEM_LISTA" ? SITUACAO_FALTA[disponibilidade.status] : undefined;
  const aSair = linhas.filter((l) => l.falta > 0).length;
  return (<>
    <CuidadosDosItens codigos={linhas.map((l) => l.material.item_code)} contexto="nos materiais desta ordem" />
    <Painel titulo="Materiais da ordem" flush
      sub={linhas.length ? `${linhas.length} item(ns) da estrutura · ${aSair ? `${aSair} ainda a sair` : "tudo já saiu"}${disponibilidade?.missing_items ? ` · ${disponibilidade.missing_items} sem saldo suficiente` : ""}` : undefined}
      acoes={sit ? <Selo tom={sit.tom}>{sit.rotulo}</Selo> : undefined}>
      {linhas.length === 0 ? <Vazio titulo="Nenhum material na ordem" texto="O item não tem estrutura. Inclua abaixo os materiais que a ordem consome." /> : (
        <table className="erp-grid">
          <thead><tr><th>Item</th><th className="num">Etapa</th><th className="num">Por peça</th><th className="num">Previsto</th><th className="num">Já saiu</th><th className="num">Falta sair</th>
            <th className="num" title="Saldo livre para esta OF depois das ordens que começam antes (e o que foi reservado para ela)">Disponível</th><th>Almoxarifado</th><th>Baixa</th>{p.gestor && <th />}</tr></thead>
          <tbody>{linhas.map((l) => (
            <tr key={l.id}>
              <td className="vpl-strong">{l.codigo}{l.nome && <span className="vpl-sub">{l.nome}</span>}{l.substitui && <span className="vpl-sub">substitui {l.substitui}</span>}</td>
              <td className="num">{l.etapa ?? "—"}</td>
              <td className="num">{num(l.porPeca)} {l.unidade}</td>
              <td className="num">{num(l.previsto)} {l.unidade}</td>
              <td className="num">{l.saiu ? num(l.saiu) : "—"}</td>
              <td className="num">{l.falta > 0 ? num(l.falta) : <Selo tom="ok">Saiu</Selo>}</td>
              <td className="num">{l.falta > 0 ? (l.faltaSaldo > 0 ? <strong className="vpl-tom-danger" title={`Faltam ${num(l.faltaSaldo)} no estoque`}>{num(l.disponivel)} · falta {num(l.faltaSaldo)}</strong> : num(l.disponivel)) : "—"}
                {l.falta > 0 && l.reservado > 0 && <span className="vpl-sub" title="Peça fabricada pela OF do componente, guardada para esta ordem">{num(l.reservado)} reservado para esta OF</span>}
                {l.falta > 0 && l.comprometido > 0 && <span className="vpl-sub" title="O que as ordens que começam antes vão consumir">{num(l.comprometido)} para OFs da frente</span>}</td>
              <td>{l.almoxarifado ? <EntityName code={l.almoxarifado} loader={loadWarehouses} prefix="Depósito" showCode={false} /> : "—"}</td>
              <td title={l.automatica ? "Sai sozinho no apontamento (proporcional) e na entrega final" : "Sai pela requisição ou pelo consumo lançado abaixo"}>{l.automatica ? "Automática" : "Manual"}</td>
              {p.gestor && <td className="vpl-actions">
                <button className="erp-btn erp-btn-sm" onClick={() => p.onAlocar(l.material)} disabled={busy} title="Escolhe os lotes pela data e pelo código do lote">Lotes</button>
                <button className="erp-btn erp-btn-sm" onClick={() => p.onSucata(l.material)} disabled={busy}>Sucata</button>
              </td>}
            </tr>
          ))}</tbody>
        </table>
      )}
    </Painel>
    <p className="erp-hint">A lista vem da estrutura do item quando a ordem é criada (com as trocas feitas depois). O de baixa <strong>automática</strong> sai sozinho ao apontar e na entrega final — não é preciso lançar.</p>

    <div className="vpl-cols">
      <Painel titulo="Consumo extra ou perda" sub="só o que a baixa automática não cobre">
        <div className="erp-fieldset-body" style={{ padding: 0 }}>
          <div className="erp-field erp-c6"><label className="erp-label erp-req">Insumo</label>
            <LookupField value={p.cons.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(c) => p.setCons((x) => ({ ...x, item_code: String(c ?? "") }))} /></div>
          <div className="erp-field erp-c6"><label className="erp-label erp-req" htmlFor="co-qtd">Quantidade</label>
            <input id="co-qtd" className="erp-input num" type="number" min={0} value={p.cons.consumed_qty || ""} onChange={(e) => p.setCons((x) => ({ ...x, consumed_qty: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c6"><label className="erp-label erp-req">Depósito</label>
            <LookupField value={p.cons.warehouse_id || undefined} loader={loadWarehouses} entityLabel="depósito" onChange={(c) => p.setCons((x) => ({ ...x, warehouse_id: c ? Number(c) : undefined }))} /></div>
          <div className="erp-field erp-c6"><label className="erp-label" htmlFor="co-data">Data</label>
            <input id="co-data" className="erp-input" type="date" value={p.cons.consumption_date ?? ""} onChange={(e) => p.setCons((x) => ({ ...x, consumption_date: e.target.value }))} /></div>
          <div className="erp-field erp-c12"><label className="erp-label" htmlFor="co-ap">Apontamento</label>
            <select id="co-ap" className="erp-input" value={p.cons.appointment_id ?? ""} onChange={(e) => p.setCons((x) => ({ ...x, appointment_id: e.target.value ? Number(e.target.value) : undefined }))}>
              <option value="">Para a ordem inteira</option>
              {p.apontamentos.filter((a) => a.id).map((a) => <option key={a.id} value={a.id}>{`#${a.id} · ${num(a.produced_qty ?? 0)} peça(s)${a.appointment_date ? ` · ${data(a.appointment_date)}` : ""}`}</option>)}
            </select></div>
          <div className="erp-field erp-c12"><span className="erp-hint">Material fora da lista, perda além da prevista ou material de baixa manual. Se o item está na lista com baixa automática, o que sair aqui é descontado da próxima baixa — nunca sai duas vezes.</span></div>
          <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8 }}>
            <button className="erp-btn erp-btn-primary" onClick={p.onConsumir} disabled={busy || !emProducao}>Registrar consumo</button>
            <button className="erp-btn" onClick={p.onRetornarSucata} disabled={busy} title="Devolve o item informado ao estoque como sucata (entrada valorizada)">Retornar como sucata</button>
          </div>
        </div>
      </Painel>

      <Painel titulo="Lançado à mão" sub={`${p.consumos.length} lançamento(s)`} flush>
        {p.consumos.length === 0 ? <Vazio titulo="Nada lançado à mão" texto="Os consumos extras e perdas aparecem aqui. A baixa automática aparece na coluna Já saiu." /> : (
          <table className="erp-grid">
            <thead><tr><th>Data</th><th>Insumo</th><th className="num">Qtd.</th><th>Depósito</th><th>Lote</th><th>Apontamento</th></tr></thead>
            <tbody>{p.consumos.map((c) => (
              <tr key={c.id}>
                <td>{data(c.consumption_date)}</td><td className="vpl-strong">{c.item_code}</td><td className="num">{num(c.consumed_qty)}</td>
                <td>{c.warehouse_id ? <EntityName code={c.warehouse_id} loader={loadWarehouses} prefix="Depósito" showCode={false} /> : "—"}</td>
                <td>{c.lot || "—"}</td><td>{c.appointment_id ? `#${c.appointment_id}` : "Ordem inteira"}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Painel>
    </div>

    {p.gestor && <Painel titulo="Incluir ou trocar material" sub="material fora da estrutura ou substituto">
      <div className="erp-fieldset-body" style={{ padding: 0 }}>
        <div className="erp-field erp-c4"><label className="erp-label erp-req">Item</label>
          <LookupField value={p.form.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(c) => p.setForm((m) => ({ ...m, item_code: String(c ?? "") }))} /></div>
        <div className="erp-field erp-c2"><label className="erp-label erp-req" htmlFor="mt-qtd">Quantidade</label>
          <input id="mt-qtd" className="erp-input num" type="number" min={0} value={p.form.quantity} onChange={(e) => p.setForm((m) => ({ ...m, quantity: e.target.value }))} /></div>
        <div className="erp-field erp-c3"><label className="erp-label">Depósito</label>
          <LookupField value={p.form.warehouse_id} loader={loadWarehouses} entityLabel="depósito" clearable onChange={(c) => p.setForm((m) => ({ ...m, warehouse_id: c ? Number(c) : undefined }))} /></div>
        <div className="erp-field erp-c3"><label className="erp-label">Substitui o item</label>
          <LookupField value={p.form.substituted_item_code || undefined} loader={loadItems} entityLabel="item" placeholder="Nenhum — material a mais" clearable
            onChange={(c) => p.setForm((m) => ({ ...m, substituted_item_code: c ? String(c) : "" }))} /></div>
        <div className="erp-field erp-c12" style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <label className="erp-check"><input type="checkbox" checked={p.form.automatic_issue} onChange={(e) => p.setForm((m) => ({ ...m, automatic_issue: e.target.checked }))} />Baixa automática (sai no apontamento e na entrega)</label>
          <button className="erp-btn erp-btn-primary" onClick={p.onIncluir} disabled={busy}>Incluir material</button>
        </div>
      </div>
    </Painel>}
  </>);
}

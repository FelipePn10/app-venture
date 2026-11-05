import { useCallback, useEffect, useState } from "react";
import {
  getControleDoItem, getLotGenealogy, implantarLote, listLotsByItem, listSituacoesLote, mudarSituacaoDoLote, registerLot, salvarControleDoItem,
  type ControleItemDTO, type LotBalanceDTO, type SituacaoLoteDTO,
} from "@/services/stockService";
import { type Obj } from "@/services/fiscalShared";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { ReadableRecord } from "@/components/ui/ReadableRecord";
import { loadSuppliers, loadWarehouseAddresses, loadWarehouses } from "@/services/lookups";
import { pedirTexto } from "@/components/ui";
import { dataBR, hoje, qtd, useAcao } from "./comum";
import { FeedbackBox } from "./ui";

/** Lotes: controle do item, registro, implantação, situação, saldo por lote e genealogia. */
export function LotesTab({ itemCode }: { itemCode: string }) {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [lots, setLots] = useState<LotBalanceDTO[]>([]);
  const [genealogy, setGenealogy] = useState<Obj | null>(null);
  const [f, setF] = useState({ lot: "", heat_number: "", certificate: "", supplier_code: "", received_at: "", expires_at: "" });

  const [controle, setControle] = useState<ControleItemDTO>({ controls_lot: false, controls_address: false, lot_issue_rule: "FEFO" });
  const [situacoes, setSituacoes] = useState<SituacaoLoteDTO[]>([]);
  const [imp, setImp] = useState({ warehouse_id: 0, address: "", lot: "", quantity: "" });

  const carregarItem = useCallback(() => run(async () => {
    setSituacoes(await listSituacoesLote());
    if (!itemCode) return;
    setControle(await getControleDoItem(itemCode)); setLots(await listLotsByItem(itemCode)); setGenealogy(null);
  }), [run, itemCode]);
  useEffect(() => { void carregarItem(); }, [carregarItem]);

  const salvarControle = () => run(async () => {
    if (!itemCode) { setFeedback({ type: "error", message: "Selecione o item na barra superior." }); return; }
    await salvarControleDoItem(itemCode, controle);
    setFeedback({ type: "success", message: "Controle do item salvo." });
  });
  const implantar = () => run(async () => {
    const q = Number(imp.quantity.replace(",", "."));
    if (!itemCode || !imp.warehouse_id || !imp.lot.trim() || !(q > 0)) { setFeedback({ type: "error", message: "Item, almoxarifado, lote e quantidade são obrigatórios." }); return; }
    await implantarLote({ item_code: itemCode, warehouse_id: imp.warehouse_id, address: imp.address || undefined, lot: imp.lot.trim(), quantity: q });
    setImp((p) => ({ ...p, lot: "", quantity: "" }));
    setLots(await listLotsByItem(itemCode));
    setFeedback({ type: "success", message: "Lote implantado. O saldo do almoxarifado não mudou." });
  });
  const mudarSituacao = async (l: LotBalanceDTO, codigo: string) => {
    const motivo = await pedirTexto({ titulo: "Mudar situação do lote", assunto: `Lote ${l.lot}`, rotulo: "Motivo da mudança", minimo: 5 });
    if (!motivo) return;
    await run(async () => {
      await mudarSituacaoDoLote({ item_code: itemCode, mask: l.mask, lot: l.lot, status_code: codigo || undefined, grade: l.grade, reason: motivo });
      setLots(await listLotsByItem(itemCode));
      setFeedback({ type: "success", message: `Situação do lote ${l.lot} alterada.` });
    });
  };
  const mudarGrau = async (l: LotBalanceDTO, grau: string) => {
    const motivo = await pedirTexto({ titulo: "Mudar grau do lote", assunto: `Lote ${l.lot}`, rotulo: "Motivo da mudança", minimo: 5 });
    if (!motivo) return;
    await run(async () => {
      await mudarSituacaoDoLote({ item_code: itemCode, mask: l.mask, lot: l.lot, status_code: l.status_code || undefined, grade: grau || undefined, reason: motivo });
      setLots(await listLotsByItem(itemCode));
      setFeedback({ type: "success", message: `Grau do lote ${l.lot} alterado.` });
    });
  };
  const situacaoAtiva = situacoes.filter((x) => x.is_active);

  const consultar = () => run(async () => {
    if (!itemCode) { setFeedback({ type: "error", message: "Selecione o item na barra superior." }); return; }
    setLots(await listLotsByItem(itemCode)); setGenealogy(null);
  });
  const registrar = () => run(async () => {
    if (!itemCode || !f.lot.trim()) { setFeedback({ type: "error", message: "Item (barra superior) e lote são obrigatórios." }); return; }
    await registerLot({ item_code: itemCode, lot: f.lot.trim(), heat_number: f.heat_number || undefined, certificate: f.certificate || undefined,
      supplier_code: f.supplier_code ? Number(f.supplier_code) : undefined, received_at: f.received_at || undefined, expires_at: f.expires_at || undefined });
    setFeedback({ type: "success", message: `Lote ${f.lot} registrado.` });
    setLots(await listLotsByItem(itemCode));
  });
  const verGenealogia = (lot: string) => run(async () => { setGenealogy(await getLotGenealogy(itemCode, lot)); });

  return (<>
    <FeedbackBox feedback={feedback} />
    {itemCode && <div className="erp-fieldset"><div className="erp-fieldset-head">Controle do item</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c3" style={{ alignSelf: "center" }}><label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={controle.controls_lot} onChange={(e) => setControle((p) => ({ ...p, controls_lot: e.target.checked }))} /> Controla lote</label></div>
      <div className="erp-field erp-c3" style={{ alignSelf: "center" }}><label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={controle.controls_address} onChange={(e) => setControle((p) => ({ ...p, controls_address: e.target.checked }))} /> Controla endereço</label></div>
      <div className="erp-field erp-c3"><label className="erp-label">Baixa automática do lote</label>
        <select className="erp-input" value={controle.lot_issue_rule} onChange={(e) => setControle((p) => ({ ...p, lot_issue_rule: e.target.value as ControleItemDTO["lot_issue_rule"] }))}>
          <option value="FEFO">O que vence primeiro (FEFO)</option><option value="FIFO">O que chegou primeiro (FIFO)</option></select></div>
      <div className="erp-field erp-c3" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={salvarControle} disabled={busy}>Salvar controle</button></div>
      <div className="erp-field erp-c12"><span className="erp-hint">Com o controle ligado, lançamentos, requisições e transferências digitados exigem o lote e o endereço. NF-e e apontamento baixam automaticamente.</span></div>
    </div></div>}
    <div className="erp-fieldset"><div className="erp-fieldset-head">Registrar lote{itemCode ? ` do item ${itemCode}` : ""}</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c2"><label className="erp-label erp-req">Lote</label><input className="erp-input" value={f.lot} onChange={(e) => setF((p) => ({ ...p, lot: e.target.value }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Corrida</label><input className="erp-input" value={f.heat_number} onChange={(e) => setF((p) => ({ ...p, heat_number: e.target.value }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Certificado</label><input className="erp-input" value={f.certificate} onChange={(e) => setF((p) => ({ ...p, certificate: e.target.value }))} /></div>
      <div className="erp-field erp-c3"><label className="erp-label">Fornecedor</label>
        <LookupField value={Number(f.supplier_code) || undefined} loader={loadSuppliers} entityLabel="fornecedor" clearable onChange={(c) => setF((p) => ({ ...p, supplier_code: c ? String(c) : "" }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Recebido em</label><input className="erp-input" type="date" value={f.received_at} onChange={(e) => setF((p) => ({ ...p, received_at: e.target.value }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label">Validade</label><input className="erp-input" type="date" value={f.expires_at} onChange={(e) => setF((p) => ({ ...p, expires_at: e.target.value }))} /><small className="erp-hint">Ordena o FEFO.</small></div>
      <div className="erp-field erp-c12" style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <button className="erp-btn erp-btn-primary" onClick={registrar} disabled={busy}>Registrar lote</button>
        <button className="erp-btn" onClick={consultar} disabled={busy}>Saldos por lote</button>
      </div>
    </div></div>
    <div className="erp-fieldset"><div className="erp-fieldset-head">Saldos por lote ({lots.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
      <table className="erp-grid">
        <thead><tr><th>Lote</th><th>Almoxarifado</th><th className="num">Quantidade</th><th>Validade</th><th>Situação</th><th>Grau</th><th></th></tr></thead>
        <tbody>
          {lots.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Sem lotes. Lotes vencidos ou a vencer estão em Análises.</td></tr>}
          {lots.map((l, i) => <tr key={i}><td>{l.lot}</td><td>{l.warehouse_id ? <EntityName code={l.warehouse_id} loader={loadWarehouses} prefix="Almox." /> : "—"}</td><td className="num">{qtd(l.quantity)}</td>
            <td>{l.expires_at ? <>{dataBR(l.expires_at)}{l.expires_at.slice(0, 10) < hoje() && <span className="erp-badge erp-badge-red" style={{ marginLeft: 6 }}>Vencido</span>}</> : "—"}</td>
            <td><select className="erp-input" aria-label={`Situação do lote ${l.lot}`} value={l.status_code ?? ""} disabled={busy} onChange={(e) => void mudarSituacao(l, e.target.value)}>
              <option value="">Liberado</option>{situacaoAtiva.map((x) => <option key={x.code} value={x.code}>{x.description}</option>)}</select></td>
            <td><input className="erp-input" style={{ maxWidth: 90 }} aria-label={`Grau do lote ${l.lot}`} defaultValue={l.grade ?? ""} disabled={busy} onBlur={(e) => { if (e.target.value.trim() !== (l.grade ?? "")) void mudarGrau(l, e.target.value.trim()); }} /></td>
            <td><button className="erp-btn erp-btn-sm" onClick={() => verGenealogia(l.lot)} disabled={busy}>Genealogia</button></td></tr>)}
        </tbody>
      </table>
    </div></div></div>
    {itemCode && <div className="erp-fieldset"><div className="erp-fieldset-head">Implantar lote em saldo sem lote</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c3"><label className="erp-label erp-req">Almoxarifado</label>
        <LookupField value={imp.warehouse_id || undefined} loader={loadWarehouses} entityLabel="almoxarifado" onChange={(c) => setImp((p) => ({ ...p, warehouse_id: c ? Number(c) : 0, address: "" }))} /></div>
      <div className="erp-field erp-c3"><label className="erp-label">Endereço</label>
        <LookupField value={imp.address || undefined} loader={loadWarehouseAddresses(imp.warehouse_id || undefined)} entityLabel="endereço" placeholder="Sem endereço" clearable onChange={(c) => setImp((p) => ({ ...p, address: c ? String(c) : "" }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label erp-req">Lote</label><input className="erp-input" value={imp.lot} onChange={(e) => setImp((p) => ({ ...p, lot: e.target.value }))} /></div>
      <div className="erp-field erp-c2"><label className="erp-label erp-req">Quantidade</label><input className="erp-input num" value={imp.quantity} onChange={(e) => setImp((p) => ({ ...p, quantity: e.target.value }))} /></div>
      <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn" onClick={implantar} disabled={busy}>Implantar</button></div>
    </div></div>}
    {genealogy && <div className="erp-fieldset"><div className="erp-fieldset-head">Genealogia</div><div className="erp-fieldset-body"><ReadableRecord value={genealogy} emptyLabel="Sem genealogia para este lote." /></div></div>}
  </>);
}

import { useCallback, useEffect, useState } from "react";
import { excluirPoliticaReposicao, listarPoliticasReposicao, salvarPoliticaReposicao, sugerirNiveis, type OrigemReposicao, type PoliticaReposicaoDTO } from "@/services/stockService";
import { EntityName } from "@/components/ui/EntityName";
import { LookupField } from "@/components/ui/LookupField";
import { loadItemMasks, loadItems, loadWarehouses } from "@/services/lookups";
import { useAcao } from "./comum";
import { FeedbackBox } from "./ui";

const VAZIA: PoliticaReposicaoDTO = { item_code: "", mask: "", warehouse_id: 0, minimum_qty: "", maximum_qty: "", safety_qty: "", source_type: "COMPRA", is_active: true };
const NOME: Record<OrigemReposicao, string> = { COMPRA: "Compra", TRANSFERENCIA: "Transferência", PRODUCAO: "Produção" };
const herda = (v?: string) => (v === undefined || v === "" ? "Do item" : v.replace(".", ","));

/**
 * Mínimo e máximo do item em cada almoxarifado e de onde vem a reposição. Campo
 * vazio herda do cadastro do item. Item com política só é planejado nos
 * almoxarifados dela.
 */
export function PoliticasReposicao() {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [lista, setLista] = useState<PoliticaReposicaoDTO[]>([]);
  const [f, setF] = useState<PoliticaReposicaoDTO>({ ...VAZIA });
  const set = <K extends keyof PoliticaReposicaoDTO>(k: K, v: PoliticaReposicaoDTO[K]) => setF((p) => ({ ...p, [k]: v }));

  const carregar = useCallback(() => run(async () => { setLista(await listarPoliticasReposicao()); }), [run]);
  useEffect(() => { void carregar(); }, [carregar]);

  const salvar = () => run(async () => {
    if (!f.item_code || !f.warehouse_id) { setFeedback({ type: "error", message: "Escolha o item e o almoxarifado." }); return; }
    if (f.source_type === "TRANSFERENCIA" && !f.source_warehouse_id) { setFeedback({ type: "error", message: "Escolha de qual almoxarifado vem a transferência." }); return; }
    await salvarPoliticaReposicao({ ...f, source_warehouse_id: f.source_type === "TRANSFERENCIA" ? f.source_warehouse_id : undefined });
    setF({ ...VAZIA });
    setLista(await listarPoliticasReposicao());
    setFeedback({ type: "success", message: "Política salva." });
  });
  const sugerir = () => run(async () => {
    if (!f.item_code) { setFeedback({ type: "error", message: "Escolha o item." }); return; }
    const n = await sugerirNiveis(String(f.item_code), f.warehouse_id || undefined, f.mask);
    if (!(n.daily_consumption > 0)) { setFeedback({ type: "info", message: "Este item não teve consumo nos últimos 6 meses: informe os níveis à mão." }); return; }
    const texto = (v: number) => String(v).replace(".", ",");
    setF((p) => ({ ...p, minimum_qty: texto(n.minimum_qty), safety_qty: texto(n.safety_qty), maximum_qty: texto(n.maximum_qty) }));
    setFeedback({ type: "info", message: `Sugestão pelo consumo: ${texto(n.daily_consumption)} por dia, prazo de ${n.lead_time_days} dia(s) e ${n.safety_days} dias de segurança. Confira e salve.` });
  });
  const excluir = (p: PoliticaReposicaoDTO) => run(async () => {
    await excluirPoliticaReposicao(p.id!);
    setLista(await listarPoliticasReposicao());
    setFeedback({ type: "success", message: "Política excluída: o item volta a seguir o cadastro." });
  });
  const numero = (k: "minimum_qty" | "maximum_qty" | "safety_qty", rotulo: string) => (
    <div className="erp-field erp-c2"><label className="erp-label">{rotulo}</label>
      <input className="erp-input num" placeholder="Do item" value={f[k] ?? ""} onChange={(e) => set(k, e.target.value)} /></div>
  );

  return (<>
    <FeedbackBox feedback={feedback} />
    <div className="erp-fieldset"><div className="erp-fieldset-head">Política por almoxarifado ({lista.length})</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c4"><label className="erp-label erp-req">Item</label>
        <LookupField disabled={Boolean(f.id)} value={f.item_code || undefined} loader={loadItems} entityLabel="item" onChange={(c) => set("item_code", String(c ?? ""))} /></div>
      <div className="erp-field erp-c4"><label className="erp-label">Máscara</label>
        <LookupField disabled={Boolean(f.id)} value={f.mask || undefined} loader={loadItemMasks} entityLabel="máscara" onChange={(c) => set("mask", String(c ?? ""))} />
        <span className="erp-field-hint">Vazia vale para o item. Com máscara, só o saldo dela conta.</span></div>
      <div className="erp-field erp-c4"><label className="erp-label erp-req">Almoxarifado</label>
        <LookupField disabled={Boolean(f.id)} value={f.warehouse_id || undefined} loader={loadWarehouses} entityLabel="almoxarifado" onChange={(c) => set("warehouse_id", c ? Number(c) : 0)} />
        {Boolean(f.id) && <span className="erp-field-hint">Item, máscara e almoxarifado identificam a política: para mudá-los, crie outra.</span>}</div>
      <div className="erp-field erp-c4"><label className="erp-label erp-req">Origem da reposição</label>
        <select className="erp-input" value={f.source_type} onChange={(e) => set("source_type", e.target.value as OrigemReposicao)}>
          <option value="COMPRA">Compra</option><option value="TRANSFERENCIA">Transferência de outro almoxarifado</option><option value="PRODUCAO">Produção</option>
        </select></div>
      {numero("minimum_qty", "Mínimo")}{numero("maximum_qty", "Máximo")}{numero("safety_qty", "Segurança")}
      {f.source_type === "TRANSFERENCIA" && (
        <div className="erp-field erp-c4"><label className="erp-label erp-req">Vem do almoxarifado</label>
          <LookupField value={f.source_warehouse_id} loader={loadWarehouses} entityLabel="almoxarifado de origem" onChange={(c) => set("source_warehouse_id", c ? Number(c) : undefined)} /></div>
      )}
      <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={f.is_active} onChange={(e) => set("is_active", e.target.checked)} /> Ativa</label></div>
      <div className="erp-field erp-c12" style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <button className="erp-btn erp-btn-primary" onClick={salvar} disabled={busy}>Salvar política</button>
        <button className="erp-btn" onClick={sugerir} disabled={busy}>Sugerir pelo consumo</button>
        <button className="erp-btn" onClick={() => setF({ ...VAZIA })} disabled={busy}>Limpar</button>
      </div>
      <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
        <table className="erp-grid">
          <thead><tr><th>Item</th><th>Máscara</th><th>Almoxarifado</th><th className="num">Mínimo</th><th className="num">Máximo</th><th className="num">Segurança</th><th>Origem</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">Nenhuma política: a reposição segue o cadastro de cada item.</td></tr>}
            {lista.map((p) => (
              <tr key={p.id}>
                <td><EntityName code={p.item_code} loader={loadItems} prefix="Item" /></td>
                <td>{p.mask || "—"}</td>
                <td><EntityName code={p.warehouse_id} loader={loadWarehouses} prefix="Almox." /></td>
                <td className="num">{herda(p.minimum_qty)}</td><td className="num">{herda(p.maximum_qty)}</td><td className="num">{herda(p.safety_qty)}</td>
                <td>{NOME[p.source_type]}{p.source_warehouse_id ? <> de <EntityName code={p.source_warehouse_id} loader={loadWarehouses} prefix="Almox." /></> : null}</td>
                <td>{p.is_active ? "Ativa" : "Inativa"}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  <button className="erp-btn erp-btn-sm" onClick={() => setF({ ...p })}>Editar</button>
                  <button className="erp-btn erp-btn-sm erp-btn-danger" onClick={() => excluir(p)} disabled={busy}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div></div>
  </>);
}

import { useState } from "react";
import { type PriceTableItemDTO, applyPurchasePriceSources, copyPriceAdjustments, listPurchasePriceSources } from "@/services/purchasingMasterService";
import { errMessage, parseNum, parseStr } from "@/services/fiscalShared";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadItems, loadSuppliers } from "@/services/lookups";
import { hojeLocal } from "@/utils/dataLocal";

/*
 * Dentro da tabela de preço aberta na VSUP0120: buscar os preços praticados nos
 * pedidos e nas notas de entrada de um período e levá-los para a tabela, e
 * copiar os descontos/acréscimos de um item da tabela para outro. Era a rotina
 * genérica VSUP0680.
 */

interface Fonte { tipo: string; id: number; doc: number; data: string; fornecedor: number; item: number; um: string; preco: number }
const chave = (f: Fonte) => `${f.tipo}:${f.id}`;
const ORIGENS = [{ v: "BOTH", l: "Pedidos e notas" }, { v: "PURCHASE_ORDER", l: "Pedidos de compra" }, { v: "ENTRY_INVOICE", l: "Notas de entrada" }];
const inicioDoMes = () => `${hojeLocal().slice(0, 8)}01`;

export function PrecosDasComprasPanel({ tableCode, items, aoAtualizar }: { tableCode: number; items: PriceTableItemDTO[]; aoAtualizar: () => Promise<void> }): JSX.Element {
  const [filtro, setFiltro] = useState({ de: inicioDoMes(), ate: hojeLocal(), fornecedor: undefined as number | undefined, origem: "BOTH" });
  const [fontes, setFontes] = useState<Fonte[] | null>(null);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [sobrescrever, setSobrescrever] = useState(false);
  const [copia, setCopia] = useState({ de: 0, para: 0, modo: "REPLACE" });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const run = async (fn: () => Promise<void>) => { setBusy(true); setFeedback(null); try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); } };

  const buscar = () => run(async () => {
    setFontes((await listPurchasePriceSources({ start: filtro.de, end: filtro.ate, supplier_code: filtro.fornecedor, table_code: tableCode, source: filtro.origem })).map((o) => ({ tipo: parseStr(o, "source_type"), id: parseNum(o, "source_id"), doc: parseNum(o, "document_code"), data: parseStr(o, "document_date"), fornecedor: parseNum(o, "supplier_code"), item: parseNum(o, "item_code"), um: parseStr(o, "uom"), preco: parseNum(o, "unit_price") })));
    setMarcadas(new Set());
  });
  const aplicar = () => run(async () => {
    const sel = (fontes ?? []).filter((f) => marcadas.has(chave(f)));
    if (sel.length === 0) { setFeedback({ type: "error", message: "Marque os preços que vão para a tabela." }); return; }
    const n = await applyPurchasePriceSources(tableCode, sobrescrever, sel.map((f) => ({ source_type: f.tipo, source_id: f.id })));
    await aoAtualizar(); setMarcadas(new Set());
    setFeedback({ type: "success", message: `${n} preço(s) levado(s) para a tabela.${sobrescrever ? "" : " Itens que já tinham preço ficaram como estavam."}` });
  });
  const copiar = () => run(async () => {
    if (!copia.de || !copia.para || copia.de === copia.para) { setFeedback({ type: "error", message: "Escolha o item de origem e um item de destino diferente." }); return; }
    await copyPriceAdjustments(copia.de, copia.para, copia.modo as "REPLACE" | "ADD");
    await aoAtualizar(); setFeedback({ type: "success", message: "Descontos e acréscimos copiados." });
  });
  const todas = (fontes ?? []).length > 0 && (fontes ?? []).every((f) => marcadas.has(chave(f)));
  const opcaoItem = (it: PriceTableItemDTO) => <option key={it.id} value={it.id}>{it.item_code}{it.supplier_code ? ` · forn. ${it.supplier_code}` : ""} · {it.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</option>;

  return (
    <>
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
      <div className="erp-fieldset"><div className="erp-fieldset-head">Buscar preços das compras</div><div className="erp-fieldset-body">
        <div className="erp-field erp-c2"><label className="erp-label erp-req">De</label><input className="erp-input" type="date" value={filtro.de} onChange={(e) => setFiltro((f) => ({ ...f, de: e.target.value }))} /></div>
        <div className="erp-field erp-c2"><label className="erp-label erp-req">Até</label><input className="erp-input" type="date" value={filtro.ate} onChange={(e) => setFiltro((f) => ({ ...f, ate: e.target.value }))} /></div>
        <div className="erp-field erp-c3"><label className="erp-label">Fornecedor</label><LookupField value={filtro.fornecedor} loader={loadSuppliers} entityLabel="fornecedor" clearable placeholder="Todos" onChange={(c) => setFiltro((f) => ({ ...f, fornecedor: c ? Number(c) : undefined }))} /></div>
        <div className="erp-field erp-c3"><label className="erp-label">Origem</label><select className="erp-input" value={filtro.origem} onChange={(e) => setFiltro((f) => ({ ...f, origem: e.target.value }))}>{ORIGENS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
        <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-dark" onClick={() => void buscar()} disabled={busy}>Buscar</button></div>
        {fontes && <>
          <div className="erp-field erp-c12" style={{ maxHeight: 320, overflow: "auto" }}><table className="erp-grid">
            <thead><tr><th style={{ width: 30 }}><input type="checkbox" aria-label="Marcar todos" checked={todas} onChange={(e) => setMarcadas(e.target.checked ? new Set(fontes.map(chave)) : new Set())} /></th><th>Documento</th><th>Data</th><th>Fornecedor</th><th>Item</th><th>UM</th><th className="num">Preço</th></tr></thead>
            <tbody>
              {fontes.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhuma compra com preço no período.</td></tr>}
              {fontes.map((f) => (
                <tr key={chave(f)}>
                  <td><input type="checkbox" aria-label={`Marcar ${f.item}`} checked={marcadas.has(chave(f))} onChange={(e) => setMarcadas((s) => { const n = new Set(s); if (e.target.checked) n.add(chave(f)); else n.delete(chave(f)); return n; })} /></td>
                  <td>{f.tipo === "PURCHASE_ORDER" ? "Pedido" : "NF"} {f.doc}</td><td>{f.data.slice(0, 10).split("-").reverse().join("/")}</td>
                  <td><EntityName code={f.fornecedor} loader={loadSuppliers} showCode={false} /></td><td><EntityName code={String(f.item)} loader={loadItems} /></td>
                  <td>{f.um || "—"}</td><td className="num">{f.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <div className="erp-field erp-c8"><label className="erp-check"><input type="checkbox" checked={sobrescrever} onChange={(e) => setSobrescrever(e.target.checked)} /> Substituir o preço de itens que já estão na tabela</label></div>
          <div className="erp-field erp-c4" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void aplicar()} disabled={busy || marcadas.size === 0}>Levar {marcadas.size || ""} para a tabela</button></div>
        </>}
      </div></div>
      {items.length > 1 && (
        <div className="erp-fieldset"><div className="erp-fieldset-head">Copiar descontos e acréscimos entre itens</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c4"><label className="erp-label">Copiar de</label><select className="erp-input" value={copia.de || ""} onChange={(e) => setCopia((c) => ({ ...c, de: Number(e.target.value) }))}><option value="">Escolha…</option>{items.map(opcaoItem)}</select></div>
          <div className="erp-field erp-c4"><label className="erp-label">Para</label><select className="erp-input" value={copia.para || ""} onChange={(e) => setCopia((c) => ({ ...c, para: Number(e.target.value) }))}><option value="">Escolha…</option>{items.map(opcaoItem)}</select></div>
          <div className="erp-field erp-c2"><label className="erp-label">Modo</label><select className="erp-input" value={copia.modo} onChange={(e) => setCopia((c) => ({ ...c, modo: e.target.value }))}><option value="REPLACE">Substituir</option><option value="ADD">Acrescentar</option></select></div>
          <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={() => void copiar()} disabled={busy}>Copiar</button></div>
        </div></div>
      )}
    </>
  );
}

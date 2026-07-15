import { useState, useCallback } from "react";
import { type SupplierContract, type ContractItem, type ContractStatus, CONTRACT_STATUSES, createContract } from "@/services/supplierContractService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const CAPA_INICIAL = { enterprise_code: "1", supplier_code: "", contract_number: "", description: "", status: "DRAFT" as ContractStatus, currency: "BRL", valid_from: "", valid_to: "", price_index: "", notes: "" };
const ITEM_INICIAL = { item_code: "", mask: "", unit: "", contracted_qty: "", unit_price: "", min_order_qty: "" };

export function Vcon0200Page(): JSX.Element {
  const [capa, setCapa] = useState({ ...CAPA_INICIAL });
  const [itemForm, setItemForm] = useState({ ...ITEM_INICIAL });
  const [items, setItems] = useState<ContractItem[]>([]);
  const [criado, setCriado] = useState<SupplierContract | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const setC = useCallback(<K extends keyof typeof capa>(k: K, v: string) => setCapa((c) => ({ ...c, [k]: v })), []);

  const addItem = () => {
    const item_code = Number(itemForm.item_code);
    const contracted_qty = Number(itemForm.contracted_qty);
    if (!item_code) { setFeedback({ type: "error", message: "Item é obrigatório." }); return; }
    if (!contracted_qty || contracted_qty <= 0) { setFeedback({ type: "error", message: "Quantidade contratada deve ser positiva." }); return; }
    setItems((a) => [...a, { item_code, mask: itemForm.mask.trim(), unit: itemForm.unit.trim() || undefined, contracted_qty, unit_price: Number(itemForm.unit_price) || 0, min_order_qty: Number(itemForm.min_order_qty) || 0 }]);
    setItemForm({ ...ITEM_INICIAL });
    setFeedback(null);
  };
  const removeItem = (i: number) => setItems((a) => a.filter((_, idx) => idx !== i));
  const limpar = () => { setCapa({ ...CAPA_INICIAL }); setItems([]); setCriado(null); };

  const salvar = () => {
    if (!capa.supplier_code || !capa.contract_number.trim() || !capa.valid_from) { setFeedback({ type: "error", message: "Fornecedor, número do contrato e início da vigência são obrigatórios." }); return; }
    if (items.length === 0) { setFeedback({ type: "error", message: "Inclua ao menos uma linha (item)." }); return; }
    void (async () => {
      setBusy(true); setFeedback(null);
      try {
        const c = await createContract({
          enterprise_code: Number(capa.enterprise_code) || 1,
          supplier_code: Number(capa.supplier_code),
          contract_number: capa.contract_number.trim(),
          description: capa.description.trim() || undefined,
          status: capa.status,
          currency: capa.currency.trim() || "BRL",
          valid_from: capa.valid_from,
          valid_to: capa.valid_to || undefined,
          price_index: capa.price_index.trim() || undefined,
          notes: capa.notes.trim() || undefined,
          items,
        });
        setCriado(c);
        setFeedback({ type: "success", message: `Contrato ${c.contract_number} criado (nº interno ${c.id ?? "—"}, ${(c.items ?? []).length} linha(s)).` });
      } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
    })();
  };

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VCON0200 — Cadastro de Contratos de Fornecedores</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Contrato</span>
          <button className="fsc-btn fsc-btn-primary" onClick={salvar} disabled={busy}>{busy ? "..." : "Criar contrato"}</button>
          <button className="fsc-btn fsc-btn-ghost" onClick={limpar} disabled={busy}>Limpar</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VCON0200 — Contratos de Fornecedores" filename="vcon0200" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Capa do contrato</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Empresa</label><input className="fsc-input fsc-input-right" type="number" value={capa.enterprise_code} onChange={(e) => setC("enterprise_code", e.target.value)} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Fornecedor</label><input className="fsc-input fsc-input-right" type="number" value={capa.supplier_code} onChange={(e) => setC("supplier_code", e.target.value)} /></div>
          <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Número do contrato</label><input className="fsc-input" value={capa.contract_number} onChange={(e) => setC("contract_number", e.target.value)} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Status</label>
            <select className="fsc-input" value={capa.status} onChange={(e) => setC("status", e.target.value)}>{CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
          <div className="fsc-field fsc-col-3"><label className="fsc-label">Descrição</label><input className="fsc-input" value={capa.description} onChange={(e) => setC("description", e.target.value)} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Moeda</label><input className="fsc-input" value={capa.currency} onChange={(e) => setC("currency", e.target.value)} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Vigência de</label><input className="fsc-input" type="date" value={capa.valid_from} onChange={(e) => setC("valid_from", e.target.value)} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Vigência até</label><input className="fsc-input" type="date" value={capa.valid_to} onChange={(e) => setC("valid_to", e.target.value)} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Índice reajuste</label><input className="fsc-input" value={capa.price_index} onChange={(e) => setC("price_index", e.target.value)} /></div>
          <div className="fsc-field fsc-col-4"><label className="fsc-label">Observações</label><input className="fsc-input" value={capa.notes} onChange={(e) => setC("notes", e.target.value)} /></div>
        </div></div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Linhas do contrato ({items.length})</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Item</label><input className="fsc-input fsc-input-right" type="number" value={itemForm.item_code} onChange={(e) => setItemForm((f) => ({ ...f, item_code: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Máscara</label><input className="fsc-input" value={itemForm.mask} onChange={(e) => setItemForm((f) => ({ ...f, mask: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-1"><label className="fsc-label">UM</label><input className="fsc-input" value={itemForm.unit} onChange={(e) => setItemForm((f) => ({ ...f, unit: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Qtd contratada</label><input className="fsc-input fsc-input-right" type="number" value={itemForm.contracted_qty} onChange={(e) => setItemForm((f) => ({ ...f, contracted_qty: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Preço unit.</label><input className="fsc-input fsc-input-right" type="number" value={itemForm.unit_price} onChange={(e) => setItemForm((f) => ({ ...f, unit_price: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Pedido mín.</label><input className="fsc-input fsc-input-right" type="number" value={itemForm.min_order_qty} onChange={(e) => setItemForm((f) => ({ ...f, min_order_qty: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-1" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-primary" style={{ width: "100%" }} onClick={addItem}>+</button></div>
        </div>
        {items.length > 0 && (
          <table className="fsc-table" style={{ marginTop: 10 }}>
            <thead><tr><th className="fsc-num">Item</th><th>Máscara</th><th>UM</th><th className="fsc-num">Qtd contratada</th><th className="fsc-num">Preço</th><th className="fsc-num">Pedido mín.</th><th></th></tr></thead>
            <tbody>{items.map((it, i) => <tr key={i}><td className="fsc-num">{it.item_code}</td><td>{it.mask || "—"}</td><td>{it.unit || "—"}</td><td className="fsc-num">{it.contracted_qty}</td><td className="fsc-num">{it.unit_price}</td><td className="fsc-num">{it.min_order_qty}</td><td><button className="fsc-btn fsc-btn-ghost" onClick={() => removeItem(i)}>Remover</button></td></tr>)}</tbody>
          </table>
        )}
        </div></div>

        {criado && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Contrato criado</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
              <div className="fsc-field fsc-col-3"><label className="fsc-label">Nº interno</label><input className="fsc-input fsc-input-right" value={criado.id ?? "—"} readOnly /></div>
              <div className="fsc-field fsc-col-3"><label className="fsc-label">Número</label><input className="fsc-input" value={criado.contract_number} readOnly /></div>
              <div className="fsc-field fsc-col-3"><label className="fsc-label">Status</label><input className="fsc-input" value={criado.status} readOnly /></div>
              <div className="fsc-field fsc-col-3"><label className="fsc-label">Linhas</label><input className="fsc-input fsc-input-right" value={(criado.items ?? []).length} readOnly /></div>
            </div></div></div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Linhas: <strong>{items.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}

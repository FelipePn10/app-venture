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
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Suprimento</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Cadastro de Contratos de Fornecedores</span><span className="erp-crumb-code">VCON0200</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Contrato</span>
          <button className="erp-btn erp-btn-primary" onClick={salvar} disabled={busy}>{busy ? "..." : "Criar contrato"}</button>
          <button className="erp-btn" onClick={limpar} disabled={busy}>Limpar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VCON0200 — Contratos de Fornecedores" filename="vcon0200" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Cadastro de Contratos de F</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="erp-fieldset"><div className="erp-fieldset-head">Capa do contrato</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label">Empresa</label><input className="erp-input num" type="number" value={capa.enterprise_code} onChange={(e) => setC("enterprise_code", e.target.value)} /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Fornecedor</label><input className="erp-input num" type="number" value={capa.supplier_code} onChange={(e) => setC("supplier_code", e.target.value)} /></div>
          <div className="erp-field erp-c3"><label className="erp-label erp-req">Número do contrato</label><input className="erp-input" value={capa.contract_number} onChange={(e) => setC("contract_number", e.target.value)} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Status</label>
            <select className="erp-input" value={capa.status} onChange={(e) => setC("status", e.target.value)}>{CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
          <div className="erp-field erp-c3"><label className="erp-label">Descrição</label><input className="erp-input" value={capa.description} onChange={(e) => setC("description", e.target.value)} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Moeda</label><input className="erp-input" value={capa.currency} onChange={(e) => setC("currency", e.target.value)} /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Vigência de</label><input className="erp-input" type="date" value={capa.valid_from} onChange={(e) => setC("valid_from", e.target.value)} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Vigência até</label><input className="erp-input" type="date" value={capa.valid_to} onChange={(e) => setC("valid_to", e.target.value)} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Índice reajuste</label><input className="erp-input" value={capa.price_index} onChange={(e) => setC("price_index", e.target.value)} /></div>
          <div className="erp-field erp-c4"><label className="erp-label">Observações</label><input className="erp-input" value={capa.notes} onChange={(e) => setC("notes", e.target.value)} /></div>
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Linhas do contrato ({items.length})</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Item</label><input className="erp-input num" type="number" value={itemForm.item_code} onChange={(e) => setItemForm((f) => ({ ...f, item_code: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Máscara</label><input className="erp-input" value={itemForm.mask} onChange={(e) => setItemForm((f) => ({ ...f, mask: e.target.value }))} /></div>
          <div className="erp-field erp-c1"><label className="erp-label">UM</label><input className="erp-input" value={itemForm.unit} onChange={(e) => setItemForm((f) => ({ ...f, unit: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Qtd contratada</label><input className="erp-input num" type="number" value={itemForm.contracted_qty} onChange={(e) => setItemForm((f) => ({ ...f, contracted_qty: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Preço unit.</label><input className="erp-input num" type="number" value={itemForm.unit_price} onChange={(e) => setItemForm((f) => ({ ...f, unit_price: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Pedido mín.</label><input className="erp-input num" type="number" value={itemForm.min_order_qty} onChange={(e) => setItemForm((f) => ({ ...f, min_order_qty: e.target.value }))} /></div>
          <div className="erp-field erp-c1" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={addItem}>+</button></div>
        
        {items.length > 0 && (
          <table className="erp-grid" style={{ marginTop: 10 }}>
            <thead><tr><th>Item</th><th>Máscara</th><th>UM</th><th>Qtd contratada</th><th>Preço</th><th>Pedido mín.</th><th></th></tr></thead>
            <tbody>{items.map((it, i) => <tr key={i}><td>{it.item_code}</td><td>{it.mask || "—"}</td><td>{it.unit || "—"}</td><td>{it.contracted_qty}</td><td>{it.unit_price}</td><td>{it.min_order_qty}</td><td><button className="erp-btn" onClick={() => removeItem(i)}>Remover</button></td></tr>)}</tbody>
          </table>
        )}
        </div></div>

        {criado && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Contrato criado</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c3"><label className="erp-label">Nº interno</label><input className="erp-input num" value={criado.id ?? "—"} readOnly /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Número</label><input className="erp-input" value={criado.contract_number} readOnly /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Status</label><input className="erp-input" value={criado.status} readOnly /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Linhas</label><input className="erp-input num" value={(criado.items ?? []).length} readOnly /></div>
            </div></div>
          </>
        )}
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Linhas: <strong>{items.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

import { EntityName } from "@/components/ui/EntityName";
import { SelectUnidade } from "@/components/ui/SelectUnidade";
import { useState, useCallback, useEffect } from "react";
import { type SupplierContract, type ContractItem, type ContractStatus, CONTRACT_STATUSES, createContract, listContracts, getContract, consumeContract, updateContractStatus } from "@/services/supplierContractService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { enumLabel } from "@/utils/enumLabels";
import { LookupField } from "@/components/ui/LookupField";
import { confirmar } from "@/components/ui/dialogos";
import { loadItems, loadItemMasks, loadSuppliers } from "@/services/lookups";

/*
 * VCON0200 — Contratos de fornecedores: lista, cadastro, consulta do saldo por
 * linha, baixa de saldo e mudança de situação. Juntou a consulta (VCON0400) e a
 * baixa/cancelamento (VCON0202). A baixa de uma linha é o consumo de saldo (só em
 * contrato Ativo, sem passar do saldo); encerrar é mudar a situação.
 */

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const CAPA_INICIAL = { supplier_code: "", contract_number: "", description: "", status: "DRAFT" as ContractStatus, currency: "BRL", valid_from: "", valid_to: "", price_index: "", notes: "" };
const ITEM_INICIAL = { item_code: "", mask: "", unit: "", contracted_qty: "", unit_price: "", min_order_qty: "" };
const d10 = (s?: string) => (s ? s.slice(0, 10).split("-").reverse().join("/") : "—");
const num = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });

export function Vcon0200Page(): JSX.Element {
  const [contratos, setContratos] = useState<SupplierContract[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<"" | ContractStatus>("");
  const [aberto, setAberto] = useState<SupplierContract | null>(null);
  const [novoStatus, setNovoStatus] = useState<ContractStatus>("ACTIVE");
  const [baixa, setBaixa] = useState<{ item_code: string; mask: string; qtd: string } | null>(null);
  const [capa, setCapa] = useState({ ...CAPA_INICIAL });
  const [itemForm, setItemForm] = useState({ ...ITEM_INICIAL });
  const [items, setItems] = useState<ContractItem[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  const carregar = useCallback(() => run(async () => { setContratos(await listContracts()); }), [run]);
  useEffect(() => { void carregar(); }, [carregar]);

  const setC = <K extends keyof typeof capa>(k: K, v: string) => setCapa((c) => ({ ...c, [k]: v }));
  const novo = () => { setAberto(null); setBaixa(null); setCapa({ ...CAPA_INICIAL }); setItems([]); setItemForm({ ...ITEM_INICIAL }); setFeedback(null); };
  const abrir = (id?: number) => { if (!id) return; void run(async () => { const c = await getContract(id); setAberto(c); setNovoStatus(c.status); setBaixa(null); }); };

  const addItem = () => {
    const item_code = itemForm.item_code.trim();
    const contracted_qty = Number(itemForm.contracted_qty);
    if (!item_code) { setFeedback({ type: "error", message: "Item é obrigatório." }); return; }
    if (!contracted_qty || contracted_qty <= 0) { setFeedback({ type: "error", message: "Quantidade contratada deve ser positiva." }); return; }
    setItems((a) => [...a, { item_code, mask: itemForm.mask.trim(), unit: itemForm.unit.trim() || undefined, contracted_qty, unit_price: Number(itemForm.unit_price) || 0, min_order_qty: Number(itemForm.min_order_qty) || 0 }]);
    setItemForm({ ...ITEM_INICIAL }); setFeedback(null);
  };

  const criar = () => {
    if (!capa.supplier_code || !capa.contract_number.trim() || !capa.valid_from) { setFeedback({ type: "error", message: "Fornecedor, número do contrato e início da vigência são obrigatórios." }); return; }
    if (items.length === 0) { setFeedback({ type: "error", message: "Inclua ao menos uma linha (item)." }); return; }
    void run(async () => {
      const c = await createContract({
        enterprise_code: 0, // a empresa vem do login no servidor
        supplier_code: Number(capa.supplier_code), contract_number: capa.contract_number.trim(), description: capa.description.trim() || undefined,
        status: capa.status, currency: capa.currency.trim() || "BRL", valid_from: capa.valid_from, valid_to: capa.valid_to || undefined,
        price_index: capa.price_index.trim() || undefined, notes: capa.notes.trim() || undefined, items,
      });
      setContratos(await listContracts());
      if (c.id) { const full = await getContract(c.id); setAberto(full); setNovoStatus(full.status); }
      setFeedback({ type: "success", message: `Contrato ${c.contract_number} criado com ${(c.items ?? []).length} linha(s).` });
    });
  };

  const mudarStatus = async () => {
    if (!aberto?.id || novoStatus === aberto.status) return;
    if ((novoStatus === "CANCELLED" || novoStatus === "CLOSED") && !(await confirmar({ titulo: novoStatus === "CANCELLED" ? "Cancelar contrato" : "Encerrar contrato", mensagem: "O saldo que restou deixa de poder ser consumido.", assunto: aberto.contract_number, rotulo: enumLabel(novoStatus), tom: "perigo" }))) return;
    void run(async () => {
      // A resposta da mudança de situação e da baixa não traz o contrato inteiro.
      await updateContractStatus(aberto.id!, novoStatus);
      const c = await getContract(aberto.id!);
      setAberto(c); setContratos(await listContracts());
      setFeedback({ type: "success", message: `Contrato ${c.contract_number}: ${enumLabel(c.status)}.` });
    });
  };
  const baixar = () => {
    if (!aberto?.id || !baixa) return;
    const q = Number(baixa.qtd.replace(",", "."));
    if (!q || q <= 0) { setFeedback({ type: "error", message: "Quantidade a baixar deve ser positiva." }); return; }
    void run(async () => {
      await consumeContract(aberto.id!, baixa.item_code, q, baixa.mask);
      setAberto(await getContract(aberto.id!)); setBaixa(null);
      setFeedback({ type: "success", message: `Baixado ${num(q)} do item ${baixa.item_code}.` });
    });
  };

  const filtrados = filtroStatus ? contratos.filter((c) => c.status === filtroStatus) : contratos;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Suprimento</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Contratos de Fornecedores</span><span className="erp-crumb-code">VCON0200</span></nav>
        <div className="erp-titlebar-spacer" /><span className="erp-titlebar-meta">{contratos.length} contrato(s)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Contratos</span>
          <button className="erp-btn erp-btn-dark" onClick={() => void carregar()} disabled={busy}>{busy && <span className="erp-spin" />}Atualizar</button>
          <button className="erp-btn erp-btn-primary" onClick={novo} disabled={busy}>Novo contrato</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Situação</span>
          <select className="erp-input" style={{ height: 32 }} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as "" | ContractStatus)}>
            <option value="">Todas</option>{CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{enumLabel(s)}</option>)}</select></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VCON0200 — Contratos de Fornecedores" filename="vcon0200" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">Contratos</span><span className="erp-count">{filtrados.length}</span></div>
            <div className="erp-list">
              {filtrados.length === 0 && <div className="erp-list-empty">Nenhum contrato.</div>}
              {filtrados.map((c) => (
                <div key={c.id} className={`erp-list-row${aberto?.id === c.id ? " sel" : ""}`} onClick={() => abrir(c.id)}>
                  <span className="erp-list-code">{c.contract_number}</span>
                  <span className="erp-list-sub"><EntityName code={c.supplier_code} loader={loadSuppliers} showCode={false} /> · {enumLabel(c.status)} · {d10(c.valid_from)} a {d10(c.valid_to)}</span>
                </div>
              ))}
            </div>
          </aside>

          <section className="erp-detail-panel">
            {aberto ? (
              <>
                <div className="erp-tabs"><button className="erp-tab active">Contrato {aberto.contract_number}</button></div>
                <div className="erp-detail-body">
                  <div className="erp-fieldset"><div className="erp-fieldset-head">Capa</div><div className="erp-fieldset-body">
                    <div className="erp-field erp-c4"><label className="erp-label">Fornecedor</label><div className="erp-input" style={{ display: "flex", alignItems: "center" }}><EntityName code={aberto.supplier_code} loader={loadSuppliers} /></div></div>
                    <div className="erp-field erp-c4"><label className="erp-label">Descrição</label><input className="erp-input" value={aberto.description ?? ""} readOnly /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Vigência</label><input className="erp-input" value={`${d10(aberto.valid_from)} a ${d10(aberto.valid_to)}`} readOnly /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Moeda</label><input className="erp-input" value={aberto.currency} readOnly /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Situação</label>
                      <select className="erp-input" value={novoStatus} onChange={(e) => setNovoStatus(e.target.value as ContractStatus)}>{CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{enumLabel(s)}</option>)}</select></div>
                    <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void mudarStatus()} disabled={busy || novoStatus === aberto.status}>Mudar situação</button></div>
                  </div></div>
                  <div className="erp-fieldset"><div className="erp-fieldset-head">Linhas e saldo</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                    <table className="erp-grid">
                      <thead><tr><th>Item</th><th>Máscara</th><th>UM</th><th className="num">Contratada</th><th className="num">Consumida</th><th className="num">Saldo</th><th className="num">Preço</th><th /></tr></thead>
                      <tbody>
                        {(aberto.items ?? []).length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Sem linhas.</td></tr>}
                        {(aberto.items ?? []).map((it, i) => (
                          <tr key={i} className={baixa?.item_code === it.item_code && baixa?.mask === (it.mask ?? "") ? "erp-row-sel" : ""}>
                            <td><EntityName code={it.item_code} loader={loadItems} prefix="Item" /></td><td>{it.mask || "—"}</td><td>{it.unit || "—"}</td>
                            <td className="num">{num(it.contracted_qty)}</td><td className="num">{num(it.consumed_qty)}</td>
                            <td className="num" style={{ fontWeight: 600 }}>{num(it.remaining_qty)}</td><td className="num">{num(it.unit_price)}</td>
                            <td>{aberto.status === "ACTIVE" && (it.remaining_qty ?? 0) > 0 && <button className="erp-btn erp-btn-sm" onClick={() => setBaixa({ item_code: it.item_code, mask: it.mask ?? "", qtd: "" })} disabled={busy}>Baixar saldo</button>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {aberto.status !== "ACTIVE" && <span className="erp-hint">A baixa de saldo só vale para contrato Ativo.</span>}
                  </div>
                  {baixa && <>
                    <div className="erp-field erp-c4"><label className="erp-label">Item</label><input className="erp-input" value={`${baixa.item_code}${baixa.mask ? ` / ${baixa.mask}` : ""}`} readOnly /></div>
                    <div className="erp-field erp-c3"><label className="erp-label erp-req">Quantidade a baixar</label><input className="erp-input num" inputMode="decimal" value={baixa.qtd} onChange={(e) => setBaixa((b) => (b ? { ...b, qtd: e.target.value } : b))} /></div>
                    <div className="erp-field erp-c5" style={{ justifyContent: "flex-end", flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
                      <button className="erp-btn erp-btn-primary" onClick={baixar} disabled={busy}>Confirmar baixa</button>
                      <button className="erp-btn" onClick={() => setBaixa(null)} disabled={busy}>Cancelar</button></div>
                  </>}
                  </div></div>
                </div>
              </>
            ) : (
              <>
                <div className="erp-tabs"><button className="erp-tab active">Novo contrato</button></div>
                <div className="erp-detail-body">
                  <div className="erp-fieldset"><div className="erp-fieldset-head">Capa do contrato</div><div className="erp-fieldset-body">
                    <div className="erp-field erp-c4"><label className="erp-label erp-req">Fornecedor</label><LookupField value={capa.supplier_code ? Number(capa.supplier_code) : undefined} loader={loadSuppliers} entityLabel="fornecedor" onChange={(c) => setC("supplier_code", c ? String(c) : "")} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label erp-req">Número do contrato</label><input className="erp-input" value={capa.contract_number} onChange={(e) => setC("contract_number", e.target.value)} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Situação</label>
                      <select className="erp-input" value={capa.status} onChange={(e) => setC("status", e.target.value)}>{CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{enumLabel(s)}</option>)}</select></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Descrição</label><input className="erp-input" value={capa.description} onChange={(e) => setC("description", e.target.value)} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Moeda</label><input className="erp-input" value={capa.currency} onChange={(e) => setC("currency", e.target.value)} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label erp-req">Vigência de</label><input className="erp-input" type="date" value={capa.valid_from} onChange={(e) => setC("valid_from", e.target.value)} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Vigência até</label><input className="erp-input" type="date" value={capa.valid_to} onChange={(e) => setC("valid_to", e.target.value)} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Índice reajuste</label><input className="erp-input" value={capa.price_index} onChange={(e) => setC("price_index", e.target.value)} /></div>
                    <div className="erp-field erp-c4"><label className="erp-label">Observações</label><input className="erp-input" value={capa.notes} onChange={(e) => setC("notes", e.target.value)} /></div>
                  </div></div>

                  <div className="erp-fieldset"><div className="erp-fieldset-head">Linhas do contrato ({items.length})</div><div className="erp-fieldset-body">
                    <div className="erp-field erp-c2"><label className="erp-label erp-req">Item</label><LookupField value={itemForm.item_code} loader={loadItems} entityLabel="item" onChange={(c) => setItemForm((f) => ({ ...f, item_code: String(c ?? "") }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Máscara</label><LookupField value={itemForm.mask} loader={loadItemMasks} entityLabel="máscara" onChange={(c) => setItemForm((f) => ({ ...f, mask: c ? String(c) : "" }))} /></div>
                    <div className="erp-field erp-c1"><label className="erp-label">UM</label><SelectUnidade aria-label="Unidade" compacto value={itemForm.unit} onChange={(u) => setItemForm((f) => ({ ...f, unit: u }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label erp-req">Qtd contratada</label><input className="erp-input num" type="number" value={itemForm.contracted_qty} onChange={(e) => setItemForm((f) => ({ ...f, contracted_qty: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Preço unit.</label><input className="erp-input num" type="number" value={itemForm.unit_price} onChange={(e) => setItemForm((f) => ({ ...f, unit_price: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Pedido mín.</label><input className="erp-input num" type="number" value={itemForm.min_order_qty} onChange={(e) => setItemForm((f) => ({ ...f, min_order_qty: e.target.value }))} /></div>
                    <div className="erp-field erp-c1" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" style={{ width: "100%" }} onClick={addItem} aria-label="Incluir linha">+</button></div>
                    {items.length > 0 && (
                      <div className="erp-field erp-c12"><table className="erp-grid">
                        <thead><tr><th>Item</th><th>Máscara</th><th>UM</th><th className="num">Qtd contratada</th><th className="num">Preço</th><th className="num">Pedido mín.</th><th /></tr></thead>
                        <tbody>{items.map((it, i) => <tr key={i}><td><EntityName code={it.item_code} loader={loadItems} prefix="Item" /></td><td>{it.mask || "—"}</td><td>{it.unit || "—"}</td><td className="num">{it.contracted_qty}</td><td className="num">{it.unit_price}</td><td className="num">{it.min_order_qty}</td><td><button className="erp-btn erp-btn-sm erp-btn-danger" onClick={() => setItems((a) => a.filter((_, j) => j !== i))}>Remover</button></td></tr>)}</tbody>
                      </table></div>
                    )}
                    <div className="erp-field erp-c12" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={criar} disabled={busy}>Criar contrato</button></div>
                  </div></div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Contratos: <strong>{contratos.length}</strong></div>
        {aberto && <div className="erp-status-item">Aberto: <strong>{aberto.contract_number}</strong> · {(aberto.items ?? []).length} linha(s)</div>}
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

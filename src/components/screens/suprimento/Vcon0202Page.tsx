import { useState, useCallback } from "react";
import { type SupplierContract, getContract, consumeContract, updateContractStatus } from "@/services/supplierContractService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const num = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });

/**
 * VCON0202 — Baixa de saldo / cancelamento do contrato. O backend não tem "cancelamento
 * de item" avulso: a baixa de uma linha é o **consumo de saldo** (`/consume`, só em
 * contrato ACTIVE, não excede o saldo) e o encerramento é a mudança de status
 * (→ CANCELLED / CLOSED).
 */
export function Vcon0202Page(): JSX.Element {
  const [contractId, setContractId] = useState("");
  const [contrato, setContrato] = useState<SupplierContract | null>(null);
  const [sel, setSel] = useState<{ item_code: number; mask: string } | null>(null);
  const [qtd, setQtd] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const abrir = () => { const id = Number(contractId); if (!id) { setFeedback({ type: "error", message: "Informe o nº interno do contrato." }); return; } void run(async () => { setContrato(await getContract(id)); setSel(null); }); };
  const baixar = () => { if (!contrato?.id || !sel) return; const q = Number(qtd); if (!q || q <= 0) { setFeedback({ type: "error", message: "Quantidade a baixar deve ser positiva." }); return; }
    void run(async () => { const c = await consumeContract(contrato.id!, sel.item_code, q, sel.mask); setContrato(c); setQtd(""); setSel(null); setFeedback({ type: "success", message: `Baixado ${q} do item ${sel.item_code}.` }); }); };
  const cancelar = () => { if (!contrato?.id) return; void run(async () => { const c = await updateContractStatus(contrato.id!, "CANCELLED"); setContrato(c); setFeedback({ type: "success", message: `Contrato ${c.contract_number} cancelado.` }); }); };

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Suprimento</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Baixa de Saldo / Cancelamento do Contrato</span><span className="erp-crumb-code">VCON0202</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Contrato (nº interno)</span>
          <input className="erp-input num" style={{ width: 90, height: 32 }} type="number" value={contractId} onChange={(e) => setContractId(e.target.value)} />
          <button className="erp-btn erp-btn-primary" onClick={abrir} disabled={busy}>Abrir</button></div>
        {contrato && <div className="erp-tgroup"><button className="erp-btn erp-btn-danger" onClick={cancelar} disabled={busy}>Cancelar contrato</button></div>}
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VCON0202 — Baixa de Saldo do Contrato" filename="vcon0202" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Baixa de Saldo</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="erp-feedback info" style={{ marginBottom: 12 }}>A baixa de item é o <strong>consumo de saldo</strong> (só em contrato <strong>ACTIVE</strong>, sem exceder o saldo). O encerramento é feito pelo status (Cancelar contrato).</div>

        {contrato && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">{contrato.contract_number} — {contrato.status} — <span style={{fontWeight:400,opacity:0.65}}>fornecedor {contrato.supplier_code}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>Item</th><th>Máscara</th><th>Contratada</th><th>Consumida</th><th>Saldo</th><th></th></tr></thead>
                <tbody>
                  {(contrato.items ?? []).length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Sem linhas.</td></tr>}
                  {(contrato.items ?? []).map((it, i) => (
                    <tr key={i} className={sel?.item_code === it.item_code && sel?.mask === (it.mask ?? "") ? "erp-row-sel" : ""}>
                      <td>{it.item_code}</td><td>{it.mask || "—"}</td><td>{num(it.contracted_qty)}</td><td>{num(it.consumed_qty)}</td>
                      <td style={{ fontWeight: 600 }}>{num(it.remaining_qty)}</td>
                      <td><button className="erp-btn" onClick={() => setSel({ item_code: it.item_code, mask: it.mask ?? "" })} disabled={busy}>Selecionar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div></div>

            {sel && (
              <div className="erp-fieldset"><div className="erp-fieldset-head"></div><div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label">Item selecionado</label><input className="erp-input" value={`${sel.item_code}${sel.mask ? ` / ${sel.mask}` : ""}`} readOnly /></div>
                <div className="erp-field erp-c3"><label className="erp-label erp-req">Quantidade a baixar</label><input className="erp-input num" type="number" value={qtd} onChange={(e) => setQtd(e.target.value)} /></div>
                <div className="erp-field erp-c3" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={baixar} disabled={busy}>Baixar saldo</button></div>
              </div></div>
            )}
          </>
        )}
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Linhas: <strong>{contrato?.items?.length ?? 0}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

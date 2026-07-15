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
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VCON0202 — Baixa de Saldo / Cancelamento do Contrato</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Contrato (nº interno)</span>
          <input className="fsc-input fsc-input-right" style={{ width: 90, height: 32 }} type="number" value={contractId} onChange={(e) => setContractId(e.target.value)} />
          <button className="fsc-btn fsc-btn-primary" onClick={abrir} disabled={busy}>Abrir</button></div>
        {contrato && <div className="fsc-action-group"><button className="fsc-btn fsc-btn-danger" onClick={cancelar} disabled={busy}>Cancelar contrato</button></div>}
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VCON0202 — Baixa de Saldo do Contrato" filename="vcon0202" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}
        <div className="fsc-feedback info" style={{ marginBottom: 12 }}>A baixa de item é o <strong>consumo de saldo</strong> (só em contrato <strong>ACTIVE</strong>, sem exceder o saldo). O encerramento é feito pelo status (Cancelar contrato).</div>

        {contrato && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">{contrato.contract_number} — {contrato.status}</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">fornecedor {contrato.supplier_code}</span></div>
            <div className="fsc-card"><div className="fsc-results-wrap">
              <table className="fsc-table">
                <thead><tr><th className="fsc-num">Item</th><th>Máscara</th><th className="fsc-num">Contratada</th><th className="fsc-num">Consumida</th><th className="fsc-num">Saldo</th><th></th></tr></thead>
                <tbody>
                  {(contrato.items ?? []).length === 0 && <tr><td colSpan={6} className="fsc-empty">Sem linhas.</td></tr>}
                  {(contrato.items ?? []).map((it, i) => (
                    <tr key={i} className={sel?.item_code === it.item_code && sel?.mask === (it.mask ?? "") ? "fsc-row-selected" : ""}>
                      <td className="fsc-num">{it.item_code}</td><td>{it.mask || "—"}</td><td className="fsc-num">{num(it.contracted_qty)}</td><td className="fsc-num">{num(it.consumed_qty)}</td>
                      <td className="fsc-num" style={{ fontWeight: 600 }}>{num(it.remaining_qty)}</td>
                      <td><button className="fsc-btn fsc-btn-ghost" onClick={() => setSel({ item_code: it.item_code, mask: it.mask ?? "" })} disabled={busy}>Selecionar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div>

            {sel && (
              <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
                <div className="fsc-field fsc-col-3"><label className="fsc-label">Item selecionado</label><input className="fsc-input" value={`${sel.item_code}${sel.mask ? ` / ${sel.mask}` : ""}`} readOnly /></div>
                <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Quantidade a baixar</label><input className="fsc-input fsc-input-right" type="number" value={qtd} onChange={(e) => setQtd(e.target.value)} /></div>
                <div className="fsc-field fsc-col-3" style={{ alignSelf: "end" }}><button className="fsc-btn fsc-btn-primary" onClick={baixar} disabled={busy}>Baixar saldo</button></div>
              </div></div></div>
            )}
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Linhas: <strong>{contrato?.items?.length ?? 0}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}

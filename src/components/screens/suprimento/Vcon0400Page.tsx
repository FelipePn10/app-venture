import { useState, useCallback } from "react";
import { type SupplierContract, type ContractStatus, CONTRACT_STATUSES, listContracts, getContract, updateContractStatus } from "@/services/supplierContractService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const d10 = (s?: string) => s?.slice(0, 10) ?? "—";
const num = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });

export function Vcon0400Page(): JSX.Element {
  const [contratos, setContratos] = useState<SupplierContract[]>([]);
  const [detalhe, setDetalhe] = useState<SupplierContract | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<"" | ContractStatus>("");
  const [novoStatus, setNovoStatus] = useState<ContractStatus>("ACTIVE");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregar = () => run(async () => { setContratos(await listContracts()); });
  const abrir = (id?: number) => { if (!id) return; void run(async () => { setDetalhe(await getContract(id)); }); };
  const mudarStatus = () => { if (!detalhe?.id) return; void run(async () => {
    const c = await updateContractStatus(detalhe.id!, novoStatus);
    setDetalhe(c); setContratos(await listContracts());
    setFeedback({ type: "success", message: `Contrato ${c.contract_number} → ${c.status}.` });
  }); };

  const filtrados = filtroStatus ? contratos.filter((c) => c.status === filtroStatus) : contratos;

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VCON0400 — Consulta de Contratos de Fornecedores</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Contratos</span>
          <button className="fsc-btn fsc-btn-primary" onClick={carregar} disabled={busy}>Listar</button></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Status</span>
          <select className="fsc-input" style={{ height: 32 }} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as "" | ContractStatus)}>
            <option value="">todos</option>{CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VCON0400 — Consulta de Contratos" filename="vcon0400" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Contratos ({filtrados.length})</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th className="fsc-num">Nº interno</th><th>Número</th><th className="fsc-num">Fornecedor</th><th>Status</th><th>Vigência</th><th>Moeda</th><th></th></tr></thead>
            <tbody>
              {filtrados.length === 0 && <tr><td colSpan={7} className="fsc-empty">Nenhum contrato. Clique em Listar.</td></tr>}
              {filtrados.map((c) => (
                <tr key={c.id} className={detalhe?.id === c.id ? "fsc-row-selected" : ""}>
                  <td className="fsc-num" style={{ fontWeight: 600 }}>{c.id}</td><td>{c.contract_number}</td><td className="fsc-num">{c.supplier_code}</td>
                  <td>{c.status}</td><td>{d10(c.valid_from)} → {d10(c.valid_to)}</td><td>{c.currency}</td>
                  <td><button className="fsc-btn fsc-btn-ghost" onClick={() => abrir(c.id)} disabled={busy}>Abrir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>

        {detalhe && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Contrato {detalhe.contract_number} — {detalhe.status}</span><div className="fsc-section-banner-line" />
              <span className="fsc-action-label">Novo status</span>
              <select className="fsc-input" style={{ height: 28, width: 130 }} value={novoStatus} onChange={(e) => setNovoStatus(e.target.value as ContractStatus)}>{CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
              <button className="fsc-btn fsc-btn-primary fsc-btn-sm" onClick={mudarStatus} disabled={busy}>Aplicar</button></div>
            <div className="fsc-card"><div className="fsc-results-wrap">
              <table className="fsc-table">
                <thead><tr><th className="fsc-num">Item</th><th>Máscara</th><th>UM</th><th className="fsc-num">Contratada</th><th className="fsc-num">Consumida</th><th className="fsc-num">Saldo</th><th className="fsc-num">Preço</th></tr></thead>
                <tbody>
                  {(detalhe.items ?? []).length === 0 && <tr><td colSpan={7} className="fsc-empty">Sem linhas.</td></tr>}
                  {(detalhe.items ?? []).map((it, i) => (
                    <tr key={i}><td className="fsc-num">{it.item_code}</td><td>{it.mask || "—"}</td><td>{it.unit || "—"}</td>
                      <td className="fsc-num">{num(it.contracted_qty)}</td><td className="fsc-num">{num(it.consumed_qty)}</td>
                      <td className="fsc-num" style={{ fontWeight: 600 }}>{num(it.remaining_qty)}</td><td className="fsc-num">{num(it.unit_price)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div></div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Contratos: <strong>{contratos.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}

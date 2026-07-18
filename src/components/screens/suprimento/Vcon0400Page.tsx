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
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Suprimento</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Consulta de Contratos de Fornecedores</span><span className="erp-crumb-code">VCON0400</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Contratos</span>
          <button className="erp-btn erp-btn-primary" onClick={carregar} disabled={busy}>Listar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Status</span>
          <select className="erp-input" style={{ height: 32 }} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as "" | ContractStatus)}>
            <option value="">todos</option>{CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VCON0400 — Consulta de Contratos" filename="vcon0400" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Consulta de Contratos de F</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="erp-fieldset"><div className="erp-fieldset-head">Contratos ({filtrados.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Nº interno</th><th>Número</th><th>Fornecedor</th><th>Status</th><th>Vigência</th><th>Moeda</th><th></th></tr></thead>
            <tbody>
              {filtrados.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhum contrato. Clique em Listar.</td></tr>}
              {filtrados.map((c) => (
                <tr key={c.id} className={detalhe?.id === c.id ? "erp-row-sel" : ""}>
                  <td style={{ fontWeight: 600 }}>{c.id}</td><td>{c.contract_number}</td><td>{c.supplier_code}</td>
                  <td>{c.status}</td><td>{d10(c.valid_from)} → {d10(c.valid_to)}</td><td>{c.currency}</td>
                  <td><button className="erp-btn" onClick={() => abrir(c.id)} disabled={busy}>Abrir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div></div>

        {detalhe && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">Contrato {detalhe.contract_number} — {detalhe.status} <span className="erp-tgroup-label">Novo status</span> <select className="erp-input" style={{ height: 28, width: 130 }} value={novoStatus} onChange={(e) => setNovoStatus(e.target.value as ContractStatus)}>{CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select> <button className="erp-btn erp-btn-primary erp-btn-sm" onClick={mudarStatus} disabled={busy}>Aplicar</button></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>Item</th><th>Máscara</th><th>UM</th><th>Contratada</th><th>Consumida</th><th>Saldo</th><th>Preço</th></tr></thead>
                <tbody>
                  {(detalhe.items ?? []).length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Sem linhas.</td></tr>}
                  {(detalhe.items ?? []).map((it, i) => (
                    <tr key={i}><td>{it.item_code}</td><td>{it.mask || "—"}</td><td>{it.unit || "—"}</td>
                      <td>{num(it.contracted_qty)}</td><td>{num(it.consumed_qty)}</td>
                      <td style={{ fontWeight: 600 }}>{num(it.remaining_qty)}</td><td>{num(it.unit_price)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div></div></div>
          </>
        )}
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Contratos: <strong>{contratos.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

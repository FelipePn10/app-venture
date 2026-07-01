import { useState, useCallback, useEffect } from "react";
import { type ContaBancaria, type ContaBancariaDTO, listContasBancarias, createContaBancaria } from "@/services/financialService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY: ContaBancariaDTO = {
  banco: "", agencia: "", conta: "", digito: "", descricao: "", titular: "",
  saldo_inicial: 0, chave_pix: "", tipo_chave_pix: "",
};

export function Vfin0100Page(): JSX.Element {
  const [form, setForm] = useState<ContaBancariaDTO>(EMPTY);
  const [list, setList] = useState<ContaBancaria[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listContasBancarias()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar contas bancárias.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const setF = <K extends keyof ContaBancariaDTO>(k: K, v: ContaBancariaDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };

  async function salvar() {
    if (!form.banco.trim() || !form.conta.trim() || !form.descricao.trim()) {
      setFeedback({ type: "error", message: "Banco, Conta e Descrição são obrigatórios." }); return;
    }
    setBusy(true); setFeedback(null);
    try {
      await createContaBancaria(form);
      setFeedback({ type: "success", message: `Conta "${form.descricao}" cadastrada.` });
      setForm(EMPTY); await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="fsc-root">
      <header className="fsc-topbar">
        <div className="fsc-topbar-left">
          <div className="fsc-logo">
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
              <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
              <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
              <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
              <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
            </svg>
          </div>
          <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
          <span className="fsc-screen-title">VFIN0100 — Contas Bancárias</span>
        </div>
      </header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group">
          <span className="fsc-action-label">Cadastro</span>
          <button className="fsc-btn fsc-btn-new" onClick={() => { setForm(EMPTY); setFeedback(null); }} disabled={busy}>+ Nova Conta</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Ações</span>
          <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : "Salvar"}</button>
        </div>
        <div className="fsc-action-group">
          <span className="fsc-action-label">Relatório</span>
          <ExportButton title="VFIN0100 — Contas Bancárias" filename="contas-bancarias" disabled={busy} />
        </div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Dados da conta</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <div className="fsc-grid">
            <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Banco</label>
              <input className="fsc-input" value={form.banco} placeholder="341" onChange={(e) => setF("banco", e.target.value)} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Agência</label>
              <input className="fsc-input" value={form.agencia} onChange={(e) => setF("agencia", e.target.value)} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Conta</label>
              <input className="fsc-input" value={form.conta} onChange={(e) => setF("conta", e.target.value)} /></div>
            <div className="fsc-field fsc-col-1"><label className="fsc-label">Dígito</label>
              <input className="fsc-input" value={form.digito ?? ""} onChange={(e) => setF("digito", e.target.value)} /></div>
            <div className="fsc-field fsc-col-5"><label className="fsc-label fsc-label-req">Descrição</label>
              <input className="fsc-input" value={form.descricao} placeholder="Conta Principal Itaú" onChange={(e) => setF("descricao", e.target.value)} /></div>
            <div className="fsc-field fsc-col-6"><label className="fsc-label">Titular</label>
              <input className="fsc-input" value={form.titular ?? ""} onChange={(e) => setF("titular", e.target.value)} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Saldo Inicial</label>
              <input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.saldo_inicial ?? 0} onChange={(e) => setF("saldo_inicial", Number(e.target.value))} /></div>
            <div className="fsc-field fsc-col-2"><label className="fsc-label">Tipo Chave PIX</label>
              <select className="fsc-select" value={form.tipo_chave_pix ?? ""} onChange={(e) => setF("tipo_chave_pix", e.target.value)}>
                <option value="">—</option><option value="cnpj">CNPJ</option><option value="cpf">CPF</option>
                <option value="email">E-mail</option><option value="telefone">Telefone</option><option value="aleatoria">Aleatória</option></select></div>
            <div className="fsc-field fsc-col-4"><label className="fsc-label">Chave PIX</label>
              <input className="fsc-input" value={form.chave_pix ?? ""} onChange={(e) => setF("chave_pix", e.target.value)} /></div>
          </div>
        </div></div>

        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Contas cadastradas</span><div className="fsc-section-banner-line" /><span className="fsc-section-banner-hint">{list.length}</span></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th>Banco</th><th>Agência</th><th>Conta</th><th>Descrição</th><th>Titular</th><th className="fsc-num">Saldo Atual</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="fsc-empty">Nenhuma conta cadastrada.</td></tr>}
              {list.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.banco}</td><td>{c.agencia}</td><td>{c.conta}{c.digito ? `-${c.digito}` : ""}</td>
                  <td>{c.descricao}</td><td>{c.titular || "—"}</td>
                  <td className="fsc-num">{money(c.saldo_atual ?? c.saldo_inicial)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Contas: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}

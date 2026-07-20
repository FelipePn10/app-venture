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
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Financeiro</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Contas Bancárias</span><span className="erp-crumb-code">VFIN0100</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={() => { setForm(EMPTY); setFeedback(null); }} disabled={busy}>+ Nova Conta</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Salvando..." : "Salvar"}</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIN0100 — Contas Bancárias" filename="contas-bancarias" disabled={busy} />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Contas Bancárias</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="erp-fieldset"><div className="erp-fieldset-head">Dados da conta</div><div className="erp-fieldset-body">
          
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Banco</label>
              <input className="erp-input" value={form.banco} placeholder="341" onChange={(e) => setF("banco", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Agência</label>
              <input className="erp-input" value={form.agencia} onChange={(e) => setF("agencia", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label erp-req">Conta</label>
              <input className="erp-input" value={form.conta} onChange={(e) => setF("conta", e.target.value)} /></div>
            <div className="erp-field erp-c1"><label className="erp-label">Dígito</label>
              <input className="erp-input" value={form.digito ?? ""} onChange={(e) => setF("digito", e.target.value)} /></div>
            <div className="erp-field erp-c5"><label className="erp-label erp-req">Descrição</label>
              <input className="erp-input" value={form.descricao} placeholder="Conta Principal Itaú" onChange={(e) => setF("descricao", e.target.value)} /></div>
            <div className="erp-field erp-c6"><label className="erp-label">Titular</label>
              <input className="erp-input" value={form.titular ?? ""} onChange={(e) => setF("titular", e.target.value)} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Saldo Inicial</label>
              <input className="erp-input num" type="number" step="0.01" value={form.saldo_inicial ?? 0} onChange={(e) => setF("saldo_inicial", Number(e.target.value))} /></div>
            <div className="erp-field erp-c2"><label className="erp-label">Tipo Chave PIX</label>
              <select className="erp-input" value={form.tipo_chave_pix ?? ""} onChange={(e) => setF("tipo_chave_pix", e.target.value)}>
                <option value="">—</option><option value="cnpj">CNPJ</option><option value="cpf">CPF</option>
                <option value="email">E-mail</option><option value="telefone">Telefone</option><option value="aleatoria">Aleatória</option></select></div>
            <div className="erp-field erp-c4"><label className="erp-label">Chave PIX</label>
              <input className="erp-input" value={form.chave_pix ?? ""} onChange={(e) => setF("chave_pix", e.target.value)} /></div>
          
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Contas cadastradas — <span style={{fontWeight:400,opacity:0.65}}>{list.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Banco</th><th>Agência</th><th>Conta</th><th>Descrição</th><th>Titular</th><th>Saldo Atual</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhuma conta cadastrada.</td></tr>}
              {list.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.banco}</td><td>{c.agencia}</td><td>{c.conta}{c.digito ? `-${c.digito}` : ""}</td>
                  <td>{c.descricao}</td><td>{c.titular || "—"}</td>
                  <td>{money(c.saldo_atual ?? c.saldo_inicial)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Contas: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

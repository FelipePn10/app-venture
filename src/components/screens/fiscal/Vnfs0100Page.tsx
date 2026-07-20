import { useState, useEffect, useCallback } from "react";
import { type NfseDTO, listNfse, createNfse, authorizeNfse, cancelNfse } from "@/services/nfseService";
import { errMessage } from "@/services/fiscalShared";
import { validateCNPJOrCPF } from "@/utils/validation";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type Mode = "list" | "create";
const today = () => new Date().toISOString().slice(0, 10);
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const EMPTY: NfseDTO = {
  numero_rps: 0, serie_rps: "1", tipo_rps: 1, data_emissao: today(), natureza_operacao: 1, optante_simples: false,
  tomador_cnpj_cpf: "", tomador_razao_social: "", tomador_email: "", tomador_codigo_municipio: "", tomador_uf: "",
  item_lista_servico: "", codigo_tributario_municipio: "", discriminacao: "", codigo_municipio: "",
  valor_servicos: 0, valor_deducoes: 0, aliquota_iss: 0.05, iss_retido: false,
};

function statusPill(s?: string) {
  const v = (s || "").toUpperCase();
  if (v.includes("AUTORIZ")) return <span className="erp-badge ok">Autorizada</span>;
  if (v.includes("CANCEL")) return <span className="erp-badge err">Cancelada</span>;
  return <span className="erp-badge erp-badge-gray">{s || "Rascunho"}</span>;
}

export function Vnfs0100Page(): JSX.Element {
  const [mode, setMode] = useState<Mode>("list");
  const [list, setList] = useState<NfseDTO[]>([]);
  const [form, setForm] = useState<NfseDTO>(EMPTY);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try { setList(await listNfse()); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao listar NFS-e.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  function setF<K extends keyof NfseDTO>(k: K, v: NfseDTO[K]) { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); }

  async function salvar() {
    if (!form.numero_rps || !form.tomador_razao_social.trim() || !form.valor_servicos) { setFeedback({ type: "error", message: "RPS, tomador e valor dos serviços são obrigatórios." }); return; }
    if (form.tomador_cnpj_cpf.trim() && !validateCNPJOrCPF(form.tomador_cnpj_cpf)) { setFeedback({ type: "error", message: "CNPJ/CPF do tomador inválido." }); return; }
    setBusy(true); setFeedback(null);
    try { const r = await createNfse(form); setFeedback({ type: "success", message: `NFS-e (RPS ${form.numero_rps}) criada. ISS: ${money(r.valor_iss)} · Líquido: ${money(r.valor_liquido)}` }); setForm(EMPTY); setMode("list"); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function autorizar(id: number) {
    setBusy(true); setFeedback(null);
    try { await authorizeNfse(id); setFeedback({ type: "success", message: `NFS-e ${id} enviada para autorização.` }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function cancelar(id: number) {
    const j = window.prompt("Justificativa do cancelamento (mín. 15 caracteres):");
    if (j === null) return;
    if (j.trim().length < 15) { setFeedback({ type: "error", message: "Justificativa deve ter ao menos 15 caracteres." }); return; }
    setBusy(true); setFeedback(null);
    try { await cancelNfse(id, j.trim()); setFeedback({ type: "success", message: `NFS-e ${id} cancelada.` }); await reload(); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">NFS-e (Nota Fiscal de Serviço)</span><span className="erp-crumb-code">VNFS0100</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">NFS-e</span>
          <button className="erp-btn erp-btn-new" onClick={() => { setMode("create"); setForm(EMPTY); }} disabled={busy}>+ Nova</button>
          <button className="erp-btn" onClick={() => { setMode("list"); void reload(); }} disabled={busy}>Listagem</button>
          {mode === "create" && <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "..." : "Emitir (rascunho)"}</button>}</div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VNFS0100 — NFS-e" filename="vnfs0100" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">NFS-e</button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        {mode === "list" && (
          <div className="erp-fieldset"><div className="erp-fieldset-head"></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
            <table className="erp-grid">
              <thead><tr><th>RPS</th><th>Tomador</th><th>Serviços</th><th>ISS</th><th>Status</th><th style={{ width: 160 }}>Ações</th></tr></thead>
              <tbody>
                {list.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhuma NFS-e.</td></tr>}
                {list.map((n) => (
                  <tr key={n.id}><td style={{ fontWeight: 600 }}>{n.numero_rps}</td><td>{n.tomador_razao_social}</td>
                    <td>{money(n.valor_servicos)}</td><td>{money(n.valor_iss)}</td><td>{statusPill(n.status)}</td>
                    <td>{n.id && <>
                      <button className="erp-btn erp-btn-sm erp-btn erp-btn-sm" onClick={() => void autorizar(n.id!)}>Autorizar</button>
                      <button className="erp-btn erp-btn-sm erp-btn erp-btn-danger erp-btn-sm" onClick={() => void cancelar(n.id!)}>Cancelar</button></>}</td></tr>
                ))}
              </tbody>
            </table>
          </div></div></div>
        )}

        {mode === "create" && (
          <>
            <div className="erp-fieldset"><div className="erp-fieldset-head">RPS</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Nº RPS</label><input className="erp-input num" type="number" value={form.numero_rps || ""} onChange={(e) => setF("numero_rps", Number(e.target.value))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Série</label><input className="erp-input" value={form.serie_rps} onChange={(e) => setF("serie_rps", e.target.value)} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Emissão</label><input className="erp-input" type="date" value={form.data_emissao} onChange={(e) => setF("data_emissao", e.target.value)} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Optante Simples</label><div className="erp-toggle-row"><label className="erp-toggle"><input type="checkbox" checked={form.optante_simples} onChange={(e) => setF("optante_simples", e.target.checked)} /><div className="erp-toggle-track" /><div className="erp-toggle-thumb" /></label><span className="erp-toggle-label">{form.optante_simples ? "Sim" : "Não"}</span></div></div>
              <div className="erp-field erp-c3"><label className="erp-label">Cód. município (prestador)</label><input className="erp-input" value={form.codigo_municipio} placeholder="4106902" onChange={(e) => setF("codigo_municipio", e.target.value)} /></div>
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Tomador</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c3"><label className="erp-label">CNPJ/CPF</label><input className="erp-input" value={form.tomador_cnpj_cpf} onChange={(e) => setF("tomador_cnpj_cpf", e.target.value)} /></div>
              <div className="erp-field erp-c5"><label className="erp-label erp-req">Razão social</label><input className="erp-input" value={form.tomador_razao_social} onChange={(e) => setF("tomador_razao_social", e.target.value)} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Cód. município</label><input className="erp-input" value={form.tomador_codigo_municipio} onChange={(e) => setF("tomador_codigo_municipio", e.target.value)} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">UF</label><input className="erp-input" maxLength={2} value={form.tomador_uf} onChange={(e) => setF("tomador_uf", e.target.value.toUpperCase())} /></div>
              <div className="erp-field erp-c6"><label className="erp-label">E-mail</label><input className="erp-input" value={form.tomador_email ?? ""} onChange={(e) => setF("tomador_email", e.target.value)} /></div>
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Serviço</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label">Item lista serviço</label><input className="erp-input" value={form.item_lista_servico} placeholder="14.01" onChange={(e) => setF("item_lista_servico", e.target.value)} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">Cód. trib. município</label><input className="erp-input" value={form.codigo_tributario_municipio} onChange={(e) => setF("codigo_tributario_municipio", e.target.value)} /></div>
              <div className="erp-field erp-c8"><label className="erp-label">Discriminação</label><input className="erp-input" value={form.discriminacao} onChange={(e) => setF("discriminacao", e.target.value)} /></div>
              <div className="erp-field erp-c3"><label className="erp-label erp-req">Valor serviços</label><input className="erp-input num" type="number" step="0.01" value={form.valor_servicos || ""} onChange={(e) => setF("valor_servicos", Number(e.target.value))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Deduções</label><input className="erp-input num" type="number" step="0.01" value={form.valor_deducoes || ""} onChange={(e) => setF("valor_deducoes", Number(e.target.value))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Alíquota ISS (ratio)</label><input className="erp-input num" type="number" step="0.0001" value={form.aliquota_iss} onChange={(e) => setF("aliquota_iss", Number(e.target.value))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">ISS retido</label><div className="erp-toggle-row"><label className="erp-toggle"><input type="checkbox" checked={form.iss_retido} onChange={(e) => setF("iss_retido", e.target.checked)} /><div className="erp-toggle-track" /><div className="erp-toggle-thumb" /></label><span className="erp-toggle-label">{form.iss_retido ? "Sim" : "Não"}</span></div></div>
            </div></div>
          </>
        )}
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">NFS-e: <strong>{list.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

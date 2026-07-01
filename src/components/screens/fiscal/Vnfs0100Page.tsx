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
  if (v.includes("AUTORIZ")) return <span className="fsc-pill fsc-pill-green">Autorizada</span>;
  if (v.includes("CANCEL")) return <span className="fsc-pill fsc-pill-red">Cancelada</span>;
  return <span className="fsc-pill fsc-pill-gray">{s || "Rascunho"}</span>;
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
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VNFS0100 — NFS-e (Nota Fiscal de Serviço)</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">NFS-e</span>
          <button className="fsc-btn fsc-btn-new" onClick={() => { setMode("create"); setForm(EMPTY); }} disabled={busy}>+ Nova</button>
          <button className="fsc-btn fsc-btn-ghost" onClick={() => { setMode("list"); void reload(); }} disabled={busy}>Listagem</button>
          {mode === "create" && <button className="fsc-btn fsc-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "..." : "Emitir (rascunho)"}</button>}</div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VNFS0100 — NFS-e" filename="vnfs0100" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        {mode === "list" && (
          <div className="fsc-card"><div className="fsc-results-wrap">
            <table className="fsc-table">
              <thead><tr><th className="fsc-num">RPS</th><th>Tomador</th><th className="fsc-num">Serviços</th><th className="fsc-num">ISS</th><th>Status</th><th style={{ width: 160 }}>Ações</th></tr></thead>
              <tbody>
                {list.length === 0 && <tr><td colSpan={6} className="fsc-empty">Nenhuma NFS-e.</td></tr>}
                {list.map((n) => (
                  <tr key={n.id}><td className="fsc-num" style={{ fontWeight: 600 }}>{n.numero_rps}</td><td>{n.tomador_razao_social}</td>
                    <td className="fsc-num">{money(n.valor_servicos)}</td><td className="fsc-num">{money(n.valor_iss)}</td><td>{statusPill(n.status)}</td>
                    <td>{n.id && <>
                      <button className="fsc-action-btn fsc-edit-btn" onClick={() => void autorizar(n.id!)}>Autorizar</button>
                      <button className="fsc-action-btn fsc-delete-btn" onClick={() => void cancelar(n.id!)}>Cancelar</button></>}</td></tr>
                ))}
              </tbody>
            </table>
          </div></div>
        )}

        {mode === "create" && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">RPS</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
              <div className="fsc-field fsc-col-2"><label className="fsc-label fsc-label-req">Nº RPS</label><input className="fsc-input fsc-input-right" type="number" value={form.numero_rps || ""} onChange={(e) => setF("numero_rps", Number(e.target.value))} /></div>
              <div className="fsc-field fsc-col-2"><label className="fsc-label">Série</label><input className="fsc-input" value={form.serie_rps} onChange={(e) => setF("serie_rps", e.target.value)} /></div>
              <div className="fsc-field fsc-col-2"><label className="fsc-label">Emissão</label><input className="fsc-input" type="date" value={form.data_emissao} onChange={(e) => setF("data_emissao", e.target.value)} /></div>
              <div className="fsc-field fsc-col-3"><label className="fsc-label">Optante Simples</label><div className="fsc-toggle-row"><label className="fsc-toggle"><input type="checkbox" checked={form.optante_simples} onChange={(e) => setF("optante_simples", e.target.checked)} /><div className="fsc-toggle-track" /><div className="fsc-toggle-thumb" /></label><span className="fsc-toggle-label">{form.optante_simples ? "Sim" : "Não"}</span></div></div>
              <div className="fsc-field fsc-col-3"><label className="fsc-label">Cód. município (prestador)</label><input className="fsc-input" value={form.codigo_municipio} placeholder="4106902" onChange={(e) => setF("codigo_municipio", e.target.value)} /></div>
            </div></div></div>

            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Tomador</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
              <div className="fsc-field fsc-col-3"><label className="fsc-label">CNPJ/CPF</label><input className="fsc-input" value={form.tomador_cnpj_cpf} onChange={(e) => setF("tomador_cnpj_cpf", e.target.value)} /></div>
              <div className="fsc-field fsc-col-5"><label className="fsc-label fsc-label-req">Razão social</label><input className="fsc-input" value={form.tomador_razao_social} onChange={(e) => setF("tomador_razao_social", e.target.value)} /></div>
              <div className="fsc-field fsc-col-2"><label className="fsc-label">Cód. município</label><input className="fsc-input" value={form.tomador_codigo_municipio} onChange={(e) => setF("tomador_codigo_municipio", e.target.value)} /></div>
              <div className="fsc-field fsc-col-2"><label className="fsc-label">UF</label><input className="fsc-input" maxLength={2} value={form.tomador_uf} onChange={(e) => setF("tomador_uf", e.target.value.toUpperCase())} /></div>
              <div className="fsc-field fsc-col-6"><label className="fsc-label">E-mail</label><input className="fsc-input" value={form.tomador_email ?? ""} onChange={(e) => setF("tomador_email", e.target.value)} /></div>
            </div></div></div>

            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Serviço</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
              <div className="fsc-field fsc-col-2"><label className="fsc-label">Item lista serviço</label><input className="fsc-input" value={form.item_lista_servico} placeholder="14.01" onChange={(e) => setF("item_lista_servico", e.target.value)} /></div>
              <div className="fsc-field fsc-col-2"><label className="fsc-label">Cód. trib. município</label><input className="fsc-input" value={form.codigo_tributario_municipio} onChange={(e) => setF("codigo_tributario_municipio", e.target.value)} /></div>
              <div className="fsc-field fsc-col-8"><label className="fsc-label">Discriminação</label><input className="fsc-input" value={form.discriminacao} onChange={(e) => setF("discriminacao", e.target.value)} /></div>
              <div className="fsc-field fsc-col-3"><label className="fsc-label fsc-label-req">Valor serviços</label><input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.valor_servicos || ""} onChange={(e) => setF("valor_servicos", Number(e.target.value))} /></div>
              <div className="fsc-field fsc-col-3"><label className="fsc-label">Deduções</label><input className="fsc-input fsc-input-right" type="number" step="0.01" value={form.valor_deducoes || ""} onChange={(e) => setF("valor_deducoes", Number(e.target.value))} /></div>
              <div className="fsc-field fsc-col-3"><label className="fsc-label">Alíquota ISS (ratio)</label><input className="fsc-input fsc-input-right" type="number" step="0.0001" value={form.aliquota_iss} onChange={(e) => setF("aliquota_iss", Number(e.target.value))} /></div>
              <div className="fsc-field fsc-col-3"><label className="fsc-label">ISS retido</label><div className="fsc-toggle-row"><label className="fsc-toggle"><input type="checkbox" checked={form.iss_retido} onChange={(e) => setF("iss_retido", e.target.checked)} /><div className="fsc-toggle-track" /><div className="fsc-toggle-thumb" /></label><span className="fsc-toggle-label">{form.iss_retido ? "Sim" : "Não"}</span></div></div>
            </div></div></div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">NFS-e: <strong>{list.length}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}

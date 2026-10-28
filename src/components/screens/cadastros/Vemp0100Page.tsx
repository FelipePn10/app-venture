import { useCallback, useEffect, useState } from "react";
import { type EnterpriseDTO, createEnterprise, getIdentificacao, updateIdentificacao } from "@/services/enterpriseService";
import { errMessage } from "@/services/fiscalShared";
import { validateCNPJOrCPF } from "@/utils/validation";
import { ExportButton } from "@/components/ui/ExportButton";
import { useAuthStore } from "@/store/authStore";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type Aba = "atual" | "nova";
const EMPTY: EnterpriseDTO = {
  cnpj: "", razao_social: "", nome_fantasia: "", inscricao_estadual: "",
  regime_tributario: "3", uf: "", municipio: "", codigo_municipio: "", cep: "", logradouro: "", numero: "", complemento: "", bairro: "", telefone: "", email: "",
};
const REGIMES = [{ v: "1", l: "1 — Simples Nacional" }, { v: "2", l: "2 — Lucro Presumido" }, { v: "3", l: "3 — Lucro Real" }];

// Os dois primeiros dígitos do código IBGE do município são o código da UF. Um
// código de outra UF passa na NF-e, mas sai errado no CT-e, na NFS-e e no SPED.
// O backend confere a mesma regra; aqui ela só avisa antes de salvar.
const PREFIXO_IBGE_DA_UF: Record<string, string> = {
  RO: "11", AC: "12", AM: "13", RR: "14", PA: "15", AP: "16", TO: "17",
  MA: "21", PI: "22", CE: "23", RN: "24", PB: "25", PE: "26", AL: "27", SE: "28", BA: "29",
  MG: "31", ES: "32", RJ: "33", SP: "35", PR: "41", SC: "42", RS: "43",
  MS: "50", MT: "51", GO: "52", DF: "53",
};
function erroDoCodigoIBGE(codigo: string, uf: string): string | null {
  const c = codigo.trim();
  if (c === "" || /^0+$/.test(c)) return null;
  if (!/^\d{7}$/.test(c)) return "O código IBGE do município tem 7 dígitos (ex.: 4106902 = Curitiba).";
  const prefixo = PREFIXO_IBGE_DA_UF[uf.trim().toUpperCase()];
  if (prefixo && !c.startsWith(prefixo)) return `O código IBGE ${c} não é de município do ${uf.toUpperCase()} (os do ${uf.toUpperCase()} começam com ${prefixo}).`;
  return null;
}

/**
 * VEMP0100 — o único lugar da identificação da empresa (CNPJ, razão social, IE,
 * regime, endereço). A configuração fiscal (VFIS0100) mostra esses dados só
 * para leitura e cuida das alíquotas, vencimentos e Focus NF-e.
 */
export function Vemp0100Page(): JSX.Element {
  const isAdmin = useAuthStore((s) => s.user?.role?.toUpperCase() === "ADMIN");
  const [aba, setAba] = useState<Aba>("atual");
  const [form, setForm] = useState<EnterpriseDTO>(EMPTY);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [semIdentificacao, setSemIdentificacao] = useState(false);
  function setF<K extends keyof EnterpriseDTO>(k: K, v: EnterpriseDTO[K]) { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); }

  const carregar = useCallback(async () => {
    setBusy(true); setFeedback(null);
    try {
      const d = await getIdentificacao();
      setSemIdentificacao(d == null);
      setForm(d ? { ...EMPTY, ...d } : EMPTY);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar a identificação da empresa.") }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { if (aba === "atual") void carregar(); else { setForm(EMPTY); setFeedback(null); } }, [aba, carregar]);

  function conferir(): string | null {
    if (!form.cnpj.trim() || !form.razao_social.trim() || !form.uf.trim()) return "CNPJ, Razão Social e UF são obrigatórios.";
    if (!validateCNPJOrCPF(form.cnpj)) return "CNPJ inválido (dígito verificador não confere).";
    return erroDoCodigoIBGE(form.codigo_municipio ?? "", form.uf);
  }

  async function salvar() {
    const erro = conferir();
    if (erro) { setFeedback({ type: "error", message: erro }); return; }
    setBusy(true); setFeedback(null);
    try {
      if (aba === "atual") {
        await updateIdentificacao(form);
        await carregar();
        setFeedback({ type: "success", message: "Identificação da empresa salva. A configuração fiscal (VFIS0100) já usa estes dados." });
      } else {
        const r = await createEnterprise(form);
        const codigo = r.code ?? (r.data as Record<string, unknown> | undefined)?.code;
        setForm(EMPTY);
        setFeedback({ type: "success", message: `Empresa ${codigo ?? ""} cadastrada com a identificação; você foi vinculado como administrador. Entre nela para completar os parâmetros fiscais (VFIS0100).` });
      }
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const erroIBGE = erroDoCodigoIBGE(form.codigo_municipio ?? "", form.uf);
  const ibgeVazio = !(form.codigo_municipio ?? "").trim() || /^0+$/.test((form.codigo_municipio ?? "").trim());
  const campo = (k: keyof EnterpriseDTO, rotulo: string, cls: string, extra?: { req?: boolean; placeholder?: string; maxLength?: number; upper?: boolean }) => (
    <div className={`erp-field ${cls}`}><label className={`erp-label${extra?.req ? " erp-req" : ""}`}>{rotulo}</label>
      <input className="erp-input" value={(form[k] as string | undefined) ?? ""} placeholder={extra?.placeholder} maxLength={extra?.maxLength} disabled={!isAdmin}
        onChange={(e) => setF(k, (extra?.upper ? e.target.value.toUpperCase() : e.target.value) as EnterpriseDTO[typeof k])} /></div>
  );

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Cadastros & Plataforma</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Cadastro de Empresa</span><span className="erp-crumb-code">VEMP0100</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy || !isAdmin} title={isAdmin ? undefined : "Somente administradores alteram a identificação da empresa"}>
            {busy ? "..." : aba === "atual" ? "Salvar Identificação" : "Cadastrar Empresa"}</button>
          {aba === "atual"
            ? <button className="erp-btn" onClick={() => void carregar()} disabled={busy}>Recarregar</button>
            : <button className="erp-btn" onClick={() => { setForm(EMPTY); setFeedback(null); }} disabled={busy}>Limpar</button>}
        </div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VEMP0100 — Cadastro de Empresa" filename="vemp0100" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs">
            <button className={`erp-tab ${aba === "atual" ? "active" : ""}`} onClick={() => setAba("atual")}>Empresa atual</button>
            <button className={`erp-tab ${aba === "nova" ? "active" : ""}`} onClick={() => setAba("nova")}>Nova empresa</button>
          </div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        {!isAdmin && <div className="erp-feedback info">A identificação da empresa é mantida pelo administrador. Você pode consultar.</div>}
        {aba === "atual" && semIdentificacao && <div className="erp-feedback info">Esta empresa ainda não tem identificação: preencha e salve.</div>}
        {aba === "nova" && <div className="erp-feedback info">A nova empresa nasce com esta identificação e com os parâmetros fiscais padrão. O token Focus NF-e de produção é gravado pela Venture ERP.</div>}

        <div className="erp-fieldset"><div className="erp-fieldset-head">Identificação</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c3"><label className="erp-label erp-req">CNPJ</label><input className="erp-input" value={form.cnpj} disabled={!isAdmin} onChange={(e) => setF("cnpj", e.target.value)} />
            {form.cnpj.trim() && <span className="erp-field-hint" style={{ color: validateCNPJOrCPF(form.cnpj) ? "#1e6030" : "#b91c1c" }}>{validateCNPJOrCPF(form.cnpj) ? "✓ válido" : "✗ inválido"}</span>}</div>
          {campo("razao_social", "Razão Social", "erp-c6", { req: true })}
          {campo("nome_fantasia", "Nome Fantasia", "erp-c3")}
          {campo("inscricao_estadual", "Inscrição Estadual", "erp-c3")}
          <div className="erp-field erp-c4"><label className="erp-label erp-req">Regime Tributário</label><select className="erp-input" value={form.regime_tributario} disabled={!isAdmin} onChange={(e) => setF("regime_tributario", e.target.value)}>{REGIMES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</select></div>
          {campo("telefone", "Telefone", "erp-c2", { placeholder: "41999990000" })}
          {campo("email", "E-mail", "erp-c3")}
        </div></div>

        <div className="erp-fieldset"><div className="erp-fieldset-head">Endereço (SEFAZ) — <span style={{fontWeight:400,opacity:0.65}}>Necessário para emissão de NF-e</span></div><div className="erp-fieldset-body">
          {campo("logradouro", "Logradouro", "erp-c6")}
          {campo("numero", "Número", "erp-c2")}
          {campo("complemento", "Complemento", "erp-c4")}
          {campo("bairro", "Bairro", "erp-c4")}
          {campo("municipio", "Município", "erp-c4")}
          <div className="erp-field erp-c2"><label className="erp-label">Cód. IBGE</label>
            <input className="erp-input" value={form.codigo_municipio ?? ""} placeholder="4106902" inputMode="numeric" disabled={!isAdmin}
              title="Código IBGE do município da empresa (7 dígitos). Sai na NF-e, no CT-e, na NFS-e e no SPED."
              onChange={(e) => setF("codigo_municipio", e.target.value.replace(/\D/g, "").slice(0, 7))} />
            {erroIBGE ? <span className="erp-hint" style={{ color: "var(--v-err)" }}>{erroIBGE}</span>
              : ibgeVazio ? <span className="erp-hint" style={{ color: "var(--v-warn)" }}>Obrigatório para a NF-e sair com o município certo — consulte em ibge.gov.br.</span> : null}</div>
          {campo("uf", "UF", "erp-c2", { req: true, maxLength: 2, upper: true })}
          {campo("cep", "CEP", "erp-c2", { placeholder: "80000000" })}
        </div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Regime: <strong>{REGIMES.find((r) => r.v === form.regime_tributario)?.l ?? "—"}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

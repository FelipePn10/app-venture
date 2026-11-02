import { useEffect, useState } from "react";
import { type AccountingPlanDTO, listPlans } from "@/services/accountingService";
import { type FiscalConfig, getFiscalConfig } from "@/services/fiscalConfigService";
import { errMessage } from "@/services/fiscalShared";
import { gerarEcd } from "@/services/accountingService";
import { useAuthStore } from "@/store/authStore";
import { documentoComMascara } from "@/utils/documentoFiscal";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const digitos = (s?: string) => (s ?? "").replace(/\D/g, "");

/**
 * VCTB0600 — SPED ECD.
 *
 * A identificação da empresa vem da Configuração Fiscal e os lançamentos do
 * plano contábil; aqui só se escolhe o plano e o período e se informa o que é
 * próprio do livro.
 */
export function Vctb0600Page(): JSX.Element {
  const isAdmin = useAuthStore((s) => s.user?.role?.toUpperCase() === "ADMIN");
  const ano = new Date().getFullYear() - 1;
  const [planos, setPlanos] = useState<AccountingPlanDTO[]>([]);
  const [plano, setPlano] = useState("");
  const [de, setDe] = useState(`${ano}-01-01`);
  const [ate, setAte] = useState(`${ano}-12-31`);
  const [cfg, setCfg] = useState<FiscalConfig | null>(null);
  const [email, setEmail] = useState("");
  const [nire, setNire] = useState("");
  const [numeroLivro, setNumeroLivro] = useState("1");
  const [descricaoLivro, setDescricaoLivro] = useState("LIVRO DIARIO GERAL");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [p, c] = await Promise.all([listPlans(), getFiscalConfig()]);
        setPlanos(p); setCfg(c);
        const ativo = p.find((x) => x.status === "A") ?? p[0];
        if (ativo?.id) setPlano(String(ativo.id));
      } catch (e) { setFeedback({ type: "error", message: errMessage(e, "Não foi possível carregar os dados da escrituração.") }); }
    })();
  }, []);

  const faltaNaEmpresa = cfg ? [
    !digitos(cfg.cnpj_empresa) && "CNPJ", !cfg.razao_social && "razão social", !cfg.uf_empresa && "UF", !cfg.codigo_municipio && "código do município",
    !digitos(cfg.cep) && "CEP", !cfg.logradouro && "logradouro",
  ].filter(Boolean) as string[] : [];

  async function gerar() {
    if (!cfg) return;
    if (faltaNaEmpresa.length) { setFeedback({ type: "error", message: `Falta na Configuração Fiscal (VFIS0100): ${faltaNaEmpresa.join(", ")}.` }); return; }
    if (!plano) { setFeedback({ type: "error", message: planos.length ? "Escolha o plano contábil." : "Ainda não há plano contábil: cadastre em VCTB0200." }); return; }
    if (!de || !ate || ate < de) { setFeedback({ type: "error", message: "Confira o período: o fim não pode ser anterior ao início." }); return; }
    if (!nire.trim()) { setFeedback({ type: "error", message: "Informe o NIRE da empresa, como consta na Junta Comercial." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const data = await gerarEcd({
        plan_id: Number(plano), from: de, to: ate,
        empresa: {
          CNPJ: digitos(cfg.cnpj_empresa), CPF: "", Nome: cfg.razao_social, UF: cfg.uf_empresa, Email: email.trim(), IE: digitos(cfg.ie_empresa),
          CodigoMunicipio: digitos(cfg.codigo_municipio), CEP: digitos(cfg.cep), Endereco: cfg.logradouro ?? "", Numero: cfg.numero ?? "", Complemento: cfg.complemento ?? "",
          Bairro: cfg.bairro ?? "", Fone: digitos(cfg.telefone), NIRE: digitos(nire), IndSitAtiv: "0", IndNireCert: "0", IndGrandePorte: "0", IndEscCons: "N", TipoECD: "0",
          HashECDSub: "", NumOrd: numeroLivro, NomeAudi: "", IndSitEsp: "0",
        },
        livros: [{
          NumOrd: numeroLivro, NatLivro: "G", NumLiv: numeroLivro, DescLiv: descricaoLivro.trim(), CodHash: "", NumHash: "",
          PerIni: `${de}T00:00:00Z`, PerFin: `${ate}T23:59:59Z`, CodHashAnt: "", NumHashAnt: "",
        }],
      });
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url; a.download = `SPED_ECD_${de.slice(0, 4)}.txt`; a.click();
      URL.revokeObjectURL(url);
      setFeedback({ type: "success", message: "Arquivo da ECD gerado. Valide no programa da Receita (PGE) antes de transmitir." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e, "Não foi possível gerar a ECD.") }); }
    finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Contabilidade</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">SPED ECD</span><span className="erp-crumb-code">VCTB0600</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>
      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void gerar()} disabled={busy || !cfg || !isAdmin} title={!isAdmin ? "Requer administrador" : undefined}>{busy && <span className="erp-spin" />}Gerar arquivo</button>
        </div>
      </div>
      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Escrituração</button></div>
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`} role={feedback.type === "error" ? "alert" : undefined}>{feedback.message}</div>}
            {faltaNaEmpresa.length > 0 && <div className="erp-feedback info">Complete a Configuração Fiscal (VFIS0100) antes de gerar: {faltaNaEmpresa.join(", ")}.</div>}

            <div className="erp-fieldset"><div className="erp-fieldset-head">Período</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c6"><label className="erp-label erp-req" htmlFor="ecd-plano">Plano contábil</label>
                <select id="ecd-plano" className="erp-input" value={plano} onChange={(e) => setPlano(e.target.value)}>
                  <option value="">Selecione</option>
                  {planos.map((p) => <option key={p.id} value={String(p.id)}>{p.plan_number} — {p.description}</option>)}
                </select></div>
              <div className="erp-field erp-c3"><label className="erp-label erp-req" htmlFor="ecd-de">De</label><input id="ecd-de" className="erp-input" type="date" value={de} onChange={(e) => setDe(e.target.value)} /></div>
              <div className="erp-field erp-c3"><label className="erp-label erp-req" htmlFor="ecd-ate">Até</label><input id="ecd-ate" className="erp-input" type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Empresa e livro</div><div className="erp-fieldset-body">
              {cfg && <div className="erp-field erp-c12"><dl className="erp-dados">
                <dt>Razão social</dt><dd>{cfg.razao_social || "Não informada"}</dd>
                <dt>CNPJ</dt><dd>{documentoComMascara(digitos(cfg.cnpj_empresa))}</dd>
                <dt>Município</dt><dd>{[cfg.municipio, cfg.uf_empresa].filter(Boolean).join("/") || "Não informado"}</dd>
              </dl></div>}
              <div className="erp-field erp-c3"><label className="erp-label erp-req" htmlFor="ecd-nire">NIRE</label><input id="ecd-nire" className="erp-input" inputMode="numeric" value={nire} onChange={(e) => setNire(e.target.value)} /></div>
              <div className="erp-field erp-c4"><label className="erp-label" htmlFor="ecd-email">E-mail da contabilidade</label><input id="ecd-email" className="erp-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="erp-field erp-c1"><label className="erp-label" htmlFor="ecd-livro">Livro</label><input id="ecd-livro" className="erp-input num" inputMode="numeric" value={numeroLivro} onChange={(e) => setNumeroLivro(digitos(e.target.value) || "1")} /></div>
              <div className="erp-field erp-c4"><label className="erp-label" htmlFor="ecd-desc">Descrição do livro</label><input id="ecd-desc" className="erp-input" value={descricaoLivro} onChange={(e) => setDescricaoLivro(e.target.value)} /></div>
            </div></div>
          </div>
        </section>
      </div>
      <footer className="erp-statusbar"><div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span></footer>
    </div>
  );
}

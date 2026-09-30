import { useState, useCallback, useEffect, useMemo } from "react";
import {
  type NcmTaxTable,
  type IcmsInterno,
  type IcmsInterestadual,
  UFS, UF_NAMES,
  listNcmTaxes, upsertNcmTax, deleteNcmTax,
  listIcmsInterno, upsertIcmsInterno,
  listIcmsInterestadual, upsertIcmsInterestadual,
} from "@/services/taxTableService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadNcmTables } from "@/services/lookups";

/**
 * VFIS0110 — Tabelas Tributárias.
 *
 * Três tabelas que alimentam a apuração de TODA nota: NCM (IPI/PIS/COFINS), ICMS
 * interno por UF e ICMS interestadual por par origem→destino.
 *
 * ── O que estava quebrado no layout ──
 * `erp-fieldset-body` é uma grade de 12 colunas. A tela tinha um
 * `erp-fieldset-body` DENTRO de outro para envolver a tabela: o de dentro virava
 * um item da grade sem `erp-cN`, e a tabela era comprimida a 1/12 da largura.
 * Havia também duas barras de abas empilhadas — uma com uma aba única inútil
 * acima das abas de verdade.
 *
 * ── Alíquotas em percentual ──
 * O backend guarda FRAÇÃO (0,0165 para 1,65%), como o resto do domínio fiscal. A
 * tela mostrava a fração crua: quem preenchia lia "0.0165" e digitava "1.65",
 * gravando 165%. Agora os campos são em percentual e a conversão acontece na
 * borda — o valor gravado continua sendo fração.
 */

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Tab = "ncm" | "interno" | "interestadual";

const EMPTY_NCM: NcmTaxTable = {
  ncm: "", aliq_ipi: 0, aliq_pis: 0.0165, aliq_cofins: 0.076,
  cst_pis: "01", cst_cofins: "01", cst_ipi: "50", description: "",
};
const EMPTY_INTERNO: IcmsInterno = { uf: "", aliq_icms: 0, aliq_fcp: 0 };
const EMPTY_INTER: IcmsInterestadual = { origin_uf: "", destination_uf: "", aliq_icms: 0 };

/** Fração → percentual para exibir. 0,0165 vira "1,65". */
function pct(fracao: number | undefined): string {
  if (fracao === undefined || fracao === null || Number.isNaN(fracao)) return "";
  const valor = fracao * 100;
  return Number.isInteger(valor) ? String(valor) : String(Number(valor.toFixed(6)));
}

/** Percentual digitado → fração para gravar. Aceita vírgula. */
function fracao(percentual: string): number {
  const limpo = percentual.replace(",", ".").trim();
  if (limpo === "") return 0;
  const n = Number(limpo);
  return Number.isFinite(n) ? n / 100 : 0;
}

/** NCM tem 8 dígitos. Só dígitos entram: máscara e ponto vêm da planilha e o
 *  backend compara o texto cru com o NCM do item. */
function somenteDigitos(texto: string, maximo: number): string {
  return texto.replace(/\D/g, "").slice(0, maximo);
}

/** Campo de percentual: sufixo visível e domínio numérico. */
function CampoPercentual({ label, valor, onChange, hint, obrigatorio }: {
  label: string; valor: number; onChange: (fracaoNova: number) => void; hint?: string; obrigatorio?: boolean;
}): JSX.Element {
  return (
    <>
      <label className={`erp-label${obrigatorio ? " erp-req" : ""}`}>{label} (%)</label>
      <input className="erp-input num" type="number" step="0.0001" min="0" max="100"
        value={pct(valor)} onChange={(e) => onChange(fracao(e.target.value))} />
      {hint && <span className="erp-hint">{hint}</span>}
    </>
  );
}

/** Seleção de UF: domínio fechado com o nome do estado ao lado das duas letras. */
function CampoUF({ label, valor, onChange, obrigatorio }: {
  label: string; valor: string; onChange: (uf: string) => void; obrigatorio?: boolean;
}): JSX.Element {
  return (
    <>
      <label className={`erp-label${obrigatorio ? " erp-req" : ""}`}>{label}</label>
      <select className="erp-input" value={valor} onChange={(e) => onChange(e.target.value)}>
        <option value="">— selecione —</option>
        {UFS.map((uf) => <option key={uf} value={uf}>{uf} — {UF_NAMES[uf]}</option>)}
      </select>
    </>
  );
}

export function Vfis0110Page(): JSX.Element {
  const [tab, setTab] = useState<Tab>("ncm");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);

  const [ncms, setNcms] = useState<NcmTaxTable[]>([]);
  const [internos, setInternos] = useState<IcmsInterno[]>([]);
  const [inters, setInters] = useState<IcmsInterestadual[]>([]);

  const [ncmForm, setNcmForm] = useState<NcmTaxTable>(EMPTY_NCM);
  const [internoForm, setInternoForm] = useState<IcmsInterno>(EMPTY_INTERNO);
  const [interForm, setInterForm] = useState<IcmsInterestadual>(EMPTY_INTER);

  // Busca nas listas: a tabela de NCM de uma indústria passa de centena de linhas,
  // e rolar procurando um código é onde se erra a alíquota que se vai conferir.
  const [buscaNcm, setBuscaNcm] = useState("");
  const [buscaUf, setBuscaUf] = useState("");

  const reload = useCallback(async () => {
    setBusy(true);
    try {
      const [a, b, c] = await Promise.all([listNcmTaxes(), listIcmsInterno(), listIcmsInterestadual()]);
      setNcms(a); setInternos(b); setInters(c);
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar as tabelas tributárias.") });
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const ncmsFiltrados = useMemo(() => {
    const termo = buscaNcm.trim().toLowerCase();
    if (!termo) return ncms;
    return ncms.filter((n) =>
      n.ncm.includes(termo) || (n.description ?? "").toLowerCase().includes(termo));
  }, [ncms, buscaNcm]);

  const intersFiltrados = useMemo(() => {
    const termo = buscaUf.trim().toUpperCase();
    if (!termo) return inters;
    return inters.filter((i) => i.origin_uf.includes(termo) || i.destination_uf.includes(termo));
  }, [inters, buscaUf]);

  async function saveNcm() {
    const codigo = ncmForm.ncm.trim();
    if (!codigo) { setFeedback({ type: "error", message: "Informe o NCM." }); return; }
    // 8 dígitos é o tamanho do NCM. Gravar com 6 ou 4 faz a nota sair com
    // classificação incompleta e a SEFAZ rejeitar — melhor barrar aqui.
    if (codigo.length !== 8) {
      setFeedback({ type: "error", message: `O NCM tem 8 dígitos; foram informados ${codigo.length}.` });
      return;
    }
    setBusy(true); setFeedback(null);
    try {
      await upsertNcmTax({ ...ncmForm, ncm: codigo });
      setFeedback({ type: "success", message: `NCM ${codigo} salvo.` });
      setNcmForm(EMPTY_NCM);
      await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function removeNcm(ncm: string) {
    if (!window.confirm(`Desativar a tributação do NCM ${ncm}?\n\nNotas novas com este NCM passam a sair sem IPI, PIS e COFINS configurados.`)) return;
    setBusy(true); setFeedback(null);
    try {
      await deleteNcmTax(ncm);
      setFeedback({ type: "success", message: `NCM ${ncm} desativado.` });
      await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  /** Carrega o formulário com uma linha existente, para conferir e corrigir. */
  function editarNcm(n: NcmTaxTable) {
    setNcmForm({ ...n });
    setFeedback({ type: "info", message: `NCM ${n.ncm} carregado para alteração. Salvar substitui a tributação atual.` });
  }

  async function saveInterno() {
    if (!internoForm.uf.trim()) { setFeedback({ type: "error", message: "Selecione a UF." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await upsertIcmsInterno(internoForm);
      setFeedback({ type: "success", message: `ICMS interno de ${internoForm.uf} salvo.` });
      setInternoForm(EMPTY_INTERNO);
      await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function saveInter() {
    if (!interForm.origin_uf.trim() || !interForm.destination_uf.trim()) {
      setFeedback({ type: "error", message: "Selecione a UF de origem e a de destino." }); return;
    }
    // Origem igual ao destino é operação interna, e a alíquota dela vive na outra
    // aba. Aceitar aqui criaria duas fontes de verdade para o mesmo imposto.
    if (interForm.origin_uf === interForm.destination_uf) {
      setFeedback({ type: "error", message: `Origem e destino são ${interForm.origin_uf}: operação dentro do estado usa a aba ICMS Interno.` });
      return;
    }
    setBusy(true); setFeedback(null);
    try {
      await upsertIcmsInterestadual(interForm);
      setFeedback({ type: "success", message: `ICMS ${interForm.origin_uf}→${interForm.destination_uf} salvo.` });
      setInterForm(EMPTY_INTER);
      await reload();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const rotuloDaAba: Record<Tab, string> = {
    ncm: "NCM — IPI, PIS e COFINS",
    interno: "ICMS Interno por UF",
    interestadual: "ICMS Interestadual",
  };

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Tabelas Tributárias</span>
          <span className="erp-crumb-code">VFIS0110</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">{rotuloDaAba[tab]}</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Dados</span>
          <button className="erp-btn" onClick={() => void reload()} disabled={busy}>
            {busy ? <><span className="erp-spin" />Carregando…</> : "Recarregar"}
          </button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VFIS0110 — Tabelas Tributárias" filename="vfis0110"
            subtitle={rotuloDaAba[tab]} meta={{ aba: rotuloDaAba[tab] }} />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          {/* Uma única barra de abas. A tela tinha duas empilhadas: uma com uma aba
              só, decorativa, acima das abas de verdade. */}
          <div className="erp-tabs" role="tablist" aria-label="Tabelas tributárias">
            {(Object.keys(rotuloDaAba) as Tab[]).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t}
                className={`erp-tab${tab === t ? " active" : ""}`}
                onClick={() => { setTab(t); setFeedback(null); }}>
                {rotuloDaAba[t]}
              </button>
            ))}
          </div>

          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            {tab === "ncm" && (
              <>
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">
                    Tributação por NCM
                    <span style={{ fontWeight: 400, opacity: 0.65 }}>
                      {ncmForm.ncm ? ` — alterando ${ncmForm.ncm}` : " — novo registro"}
                    </span>
                  </div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c3">
                      <label className="erp-label erp-req">NCM</label>
                      <LookupField value={ncmForm.ncm || undefined} loader={loadNcmTables}
                        entityLabel="NCM já cadastrado" placeholder="Buscar ou digitar o NCM"
                        onChange={(code) => {
                          const escolhido = String(code ?? "");
                          const existente = ncms.find((n) => n.ncm === escolhido);
                          setNcmForm(existente ? { ...existente } : { ...EMPTY_NCM, ncm: escolhido });
                        }} />
                      <span className="erp-hint">
                        8 dígitos. Escolher um NCM já cadastrado carrega a tributação atual para conferência.
                      </span>
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label erp-req">NCM (digitar)</label>
                      <input className="erp-input" value={ncmForm.ncm} placeholder="84714900" inputMode="numeric"
                        onChange={(e) => setNcmForm((p) => ({ ...p, ncm: somenteDigitos(e.target.value, 8) }))} />
                      <span className="erp-hint">{ncmForm.ncm.length}/8 dígitos</span>
                    </div>
                    <div className="erp-field erp-c7">
                      <label className="erp-label">Descrição da mercadoria</label>
                      <input className="erp-input" value={ncmForm.description ?? ""}
                        placeholder="O que este NCM classifica — ajuda quem confere a nota"
                        onChange={(e) => setNcmForm((p) => ({ ...p, description: e.target.value }))} />
                    </div>

                    <div className="erp-field erp-c2">
                      <CampoPercentual label="Alíquota IPI" valor={ncmForm.aliq_ipi}
                        onChange={(v) => setNcmForm((p) => ({ ...p, aliq_ipi: v }))} />
                    </div>
                    <div className="erp-field erp-c2">
                      <CampoPercentual label="Alíquota PIS" valor={ncmForm.aliq_pis}
                        onChange={(v) => setNcmForm((p) => ({ ...p, aliq_pis: v }))}
                        hint="Cumulativo 0,65% · não cumulativo 1,65%" />
                    </div>
                    <div className="erp-field erp-c2">
                      <CampoPercentual label="Alíquota COFINS" valor={ncmForm.aliq_cofins}
                        onChange={(v) => setNcmForm((p) => ({ ...p, aliq_cofins: v }))}
                        hint="Cumulativo 3,00% · não cumulativo 7,60%" />
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label">CST IPI</label>
                      <input className="erp-input" value={ncmForm.cst_ipi} maxLength={2}
                        onChange={(e) => setNcmForm((p) => ({ ...p, cst_ipi: somenteDigitos(e.target.value, 2) }))} />
                      <span className="erp-hint">50 saída tributada · 51 isenta · 53 suspensão</span>
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label">CST PIS</label>
                      <input className="erp-input" value={ncmForm.cst_pis} maxLength={2}
                        onChange={(e) => setNcmForm((p) => ({ ...p, cst_pis: somenteDigitos(e.target.value, 2) }))} />
                      <span className="erp-hint">01 tributado · 06 alíquota zero · 07 isento</span>
                    </div>
                    <div className="erp-field erp-c2">
                      <label className="erp-label">CST COFINS</label>
                      <input className="erp-input" value={ncmForm.cst_cofins} maxLength={2}
                        onChange={(e) => setNcmForm((p) => ({ ...p, cst_cofins: somenteDigitos(e.target.value, 2) }))} />
                      <span className="erp-hint">Acompanha o CST do PIS</span>
                    </div>

                    <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8 }}>
                      <button className="erp-btn erp-btn-primary" onClick={() => void saveNcm()} disabled={busy}>
                        {ncmForm.ncm && ncms.some((n) => n.ncm === ncmForm.ncm) ? "Salvar alteração" : "Cadastrar NCM"}
                      </button>
                      <button className="erp-btn" onClick={() => { setNcmForm(EMPTY_NCM); setFeedback(null); }} disabled={busy}>
                        Limpar
                      </button>
                    </div>
                  </div>
                </div>

                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">
                    NCMs cadastrados
                    <span style={{ fontWeight: 400, opacity: 0.65 }}>
                      {` — ${ncmsFiltrados.length}${buscaNcm ? ` de ${ncms.length}` : ""}`}
                    </span>
                  </div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c4">
                      <label className="erp-label">Buscar por NCM ou descrição</label>
                      <input className="erp-input" value={buscaNcm} placeholder="8471 ou monitor"
                        onChange={(e) => setBuscaNcm(e.target.value)} />
                    </div>
                    {/* A tabela ocupa a linha inteira da grade. Sem `erp-c12` ela é
                        comprimida em uma coluna de doze — era o layout quebrado. */}
                    <div className="erp-field erp-c12">
                      <table className="erp-grid">
                        <thead>
                          <tr>
                            <th>NCM</th><th>Descrição</th>
                            <th className="num">IPI</th><th className="num">PIS</th><th className="num">COFINS</th>
                            <th>CST IPI/PIS/COFINS</th><th style={{ width: 160 }}>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ncmsFiltrados.length === 0 && (
                            <tr><td colSpan={7} className="erp-grid-empty">
                              {ncms.length === 0
                                ? "Nenhum NCM cadastrado. Sem tributação por NCM, a nota sai sem IPI, PIS e COFINS."
                                : "Nenhum NCM corresponde à busca."}
                            </td></tr>
                          )}
                          {ncmsFiltrados.map((n) => (
                            <tr key={n.ncm}>
                              <td style={{ fontWeight: 600 }}>{n.ncm}</td>
                              <td>{n.description || "—"}</td>
                              <td className="num">{pct(n.aliq_ipi)}%</td>
                              <td className="num">{pct(n.aliq_pis)}%</td>
                              <td className="num">{pct(n.aliq_cofins)}%</td>
                              <td>{n.cst_ipi}/{n.cst_pis}/{n.cst_cofins}</td>
                              <td style={{ display: "flex", gap: 6 }}>
                                <button className="erp-btn erp-btn-sm" onClick={() => editarNcm(n)} disabled={busy}>Alterar</button>
                                <button className="erp-btn erp-btn-sm erp-btn-danger" onClick={() => void removeNcm(n.ncm)} disabled={busy}>Desativar</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

            {tab === "interno" && (
              <>
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">ICMS dentro do estado</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c4">
                      <CampoUF label="UF" valor={internoForm.uf} obrigatorio
                        onChange={(uf) => {
                          const existente = internos.find((i) => i.uf === uf);
                          setInternoForm(existente ? { ...existente } : { ...EMPTY_INTERNO, uf });
                        }} />
                      <span className="erp-hint">Escolher uma UF já cadastrada carrega as alíquotas atuais.</span>
                    </div>
                    <div className="erp-field erp-c3">
                      <CampoPercentual label="Alíquota ICMS" valor={internoForm.aliq_icms}
                        onChange={(v) => setInternoForm((p) => ({ ...p, aliq_icms: v }))}
                        hint="Alíquota interna do estado (SP 18%)" />
                    </div>
                    <div className="erp-field erp-c3">
                      <CampoPercentual label="Alíquota FCP" valor={internoForm.aliq_fcp}
                        onChange={(v) => setInternoForm((p) => ({ ...p, aliq_fcp: v }))}
                        hint="Fundo de Combate à Pobreza; 0 quando o estado não cobra" />
                    </div>
                    <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}>
                      <button className="erp-btn erp-btn-primary" style={{ width: "100%" }}
                        onClick={() => void saveInterno()} disabled={busy}>Salvar UF</button>
                    </div>
                  </div>
                </div>

                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">
                    UFs cadastradas<span style={{ fontWeight: 400, opacity: 0.65 }}>{` — ${internos.length} de 27`}</span>
                  </div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c12">
                      <table className="erp-grid">
                        <thead><tr><th>UF</th><th>Estado</th><th className="num">ICMS</th><th className="num">FCP</th><th style={{ width: 100 }}>Ações</th></tr></thead>
                        <tbody>
                          {internos.length === 0 && (
                            <tr><td colSpan={5} className="erp-grid-empty">
                              Nenhuma UF cadastrada. Sem a alíquota interna, a nota do próprio estado sai sem ICMS.
                            </td></tr>
                          )}
                          {internos.map((i) => (
                            <tr key={i.uf}>
                              <td style={{ fontWeight: 600 }}>{i.uf}</td>
                              <td>{UF_NAMES[i.uf as keyof typeof UF_NAMES] ?? "—"}</td>
                              <td className="num">{pct(i.aliq_icms)}%</td>
                              <td className="num">{pct(i.aliq_fcp)}%</td>
                              <td><button className="erp-btn erp-btn-sm" disabled={busy}
                                onClick={() => setInternoForm({ ...i })}>Alterar</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

            {tab === "interestadual" && (
              <>
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">ICMS entre estados</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c3">
                      <CampoUF label="UF de origem" valor={interForm.origin_uf} obrigatorio
                        onChange={(uf) => setInterForm((p) => ({ ...p, origin_uf: uf }))} />
                      <span className="erp-hint">Onde a mercadoria sai — normalmente a UF do emitente.</span>
                    </div>
                    <div className="erp-field erp-c3">
                      <CampoUF label="UF de destino" valor={interForm.destination_uf} obrigatorio
                        onChange={(uf) => {
                          const existente = inters.find((i) => i.origin_uf === interForm.origin_uf && i.destination_uf === uf);
                          setInterForm((p) => existente ? { ...existente } : { ...p, destination_uf: uf });
                        }} />
                    </div>
                    <div className="erp-field erp-c3">
                      <CampoPercentual label="Alíquota ICMS" valor={interForm.aliq_icms}
                        onChange={(v) => setInterForm((p) => ({ ...p, aliq_icms: v }))}
                        hint="Regra geral: 12% entre estados do Sul/Sudeste, 7% para Norte/Nordeste/CO e ES" />
                    </div>
                    <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}>
                      <button className="erp-btn erp-btn-primary" style={{ width: "100%" }}
                        onClick={() => void saveInter()} disabled={busy}>Salvar alíquota</button>
                    </div>
                  </div>
                </div>

                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">
                    Pares origem → destino
                    <span style={{ fontWeight: 400, opacity: 0.65 }}>
                      {` — ${intersFiltrados.length}${buscaUf ? ` de ${inters.length}` : ""}`}
                    </span>
                  </div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c3">
                      <label className="erp-label">Filtrar por UF</label>
                      <input className="erp-input" value={buscaUf} placeholder="SP" maxLength={2}
                        onChange={(e) => setBuscaUf(e.target.value.toUpperCase())} />
                      <span className="erp-hint">Mostra os pares em que a UF é origem ou destino.</span>
                    </div>
                    <div className="erp-field erp-c12">
                      <table className="erp-grid">
                        <thead><tr><th>Origem</th><th>Destino</th><th className="num">Alíquota ICMS</th><th style={{ width: 100 }}>Ações</th></tr></thead>
                        <tbody>
                          {intersFiltrados.length === 0 && (
                            <tr><td colSpan={4} className="erp-grid-empty">
                              {inters.length === 0
                                ? "Nenhuma alíquota interestadual cadastrada. Venda para fora do estado sai sem ICMS."
                                : "Nenhum par corresponde ao filtro."}
                            </td></tr>
                          )}
                          {intersFiltrados.map((i) => (
                            <tr key={`${i.origin_uf}_${i.destination_uf}`}>
                              <td style={{ fontWeight: 600 }}>{i.origin_uf}</td>
                              <td style={{ fontWeight: 600 }}>{i.destination_uf}</td>
                              <td className="num">{pct(i.aliq_icms)}%</td>
                              <td><button className="erp-btn erp-btn-sm" disabled={busy}
                                onClick={() => setInterForm({ ...i })}>Alterar</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">NCMs: <strong>{ncms.length}</strong></div>
        <div className="erp-status-item">UFs internas: <strong>{internos.length}</strong></div>
        <div className="erp-status-item">Interestaduais: <strong>{inters.length}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { type ConversaoItem, type Cobertura, type Simulacao, type Unidade, simular, numero } from "@/services/unitConversionService";
import { errMessage } from "@/services/fiscalShared";
import { OpcoesDeUnidade } from "./Vsup0110Catalogo";

const ROTULO_FONTE: Record<string, string> = {
  LOTE: "lote", ITEM_MASCARA: "item (máscara)", ITEM: "item", SEGUNDA_UNIDADE: "segunda unidade do item",
  EMBALAGEM: "embalagem do item", PADRAO: "padrão da empresa",
};
const decLivre = (s: string) => (s.includes(",") ? s.trim().replace(/\./g, "").replace(",", ".") : s.trim());

// ── Fração exata ─────────────────────────────────────────────────────────────
// O teste antes de gravar é feito na tela, sem ponto flutuante: 1/3 × 3 tem de
// dar 1, senão a pessoa desconfia de uma conversão certa.
interface Frac { n: bigint; d: bigint }
function frac(s: string): Frac | null {
  const t = decLivre(s);
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const [i, f = ""] = t.split(".");
  const out = { n: BigInt(i + f), d: 10n ** BigInt(f.length) };
  return out.n > 0n ? out : null;
}
const mul = (a: Frac, b: Frac): Frac => ({ n: a.n * b.n, d: a.d * b.d });
const div = (a: Frac, b: Frac): Frac => ({ n: a.n * b.d, d: a.d * b.n });
const inteiro = (a: Frac) => a.n % a.d === 0n;
/** Formata em pt-BR com até `casas` decimais (arredonda metade para cima). */
function br(a: Frac, casas = 8): string {
  const esc = 10n ** BigInt(casas);
  const q = (a.n * esc * 2n + a.d) / (2n * a.d);
  const int = (q / esc).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const dec = (q % esc).toString().padStart(casas, "0").replace(/0+$/, "");
  return dec ? `${int},${dec}` : int;
}
const arredondar = (a: Frac): bigint => (a.n * 2n + a.d) / (2n * a.d);

export interface RascunhoConversao { from_uom: string; to_uom: string; from_quantity: string; to_quantity: string }
interface Params { from: string; to: string; qty: string; date: string; lot: string; mask: string }

interface Props {
  item: string;
  unidades: Unidade[];
  estoque: string;
  aceitaFracao: boolean;
  conversoes: ConversaoItem[];
  cobertura: Cobertura | null;
  aviso: (t: "success" | "error" | "info", m: string) => void;
  aoUsarNoCadastro: (r: RascunhoConversao) => void;
}

/**
 * Simulador em três partes: as conversões que o item já tem (prontas para
 * testar, sem escolher unidade de novo), o teste de uma conversão antes de
 * gravá-la (comparando com o que o sistema faz hoje) e o passo a passo.
 */
export function AbaSimulador({ item, unidades, estoque, aceitaFracao, conversoes, cobertura, aviso, aoUsarNoCadastro }: Props): JSX.Element {
  const [p, setP] = useState<Params>({ from: "", to: estoque, qty: "1", date: "", lot: "", mask: "" });
  const [res, setRes] = useState<Simulacao | null>(null);
  const [busy, setBusy] = useState(false);
  const detalhe = useRef<HTMLDivElement>(null);
  useEffect(() => { setP((x) => ({ ...x, to: x.to || estoque })); }, [estoque]);

  async function rodar(params = p) {
    if (!params.from || !params.to) { aviso("error", "Informe as duas unidades."); return; }
    setBusy(true); setRes(null);
    try {
      setRes(await simular({ item, from: params.from, to: params.to, qty: decLivre(params.qty) || "1", date: params.date || undefined, lot: params.lot.trim() || undefined, mask: params.mask.trim() || undefined }));
    } catch (e) { aviso("error", errMessage(e)); } finally { setBusy(false); }
  }
  function detalhar(x: Partial<Params>) {
    const novo = { ...p, lot: "", date: "", mask: "", ...x };
    setP(novo); void rodar(novo);
    detalhe.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Conversões que o item tem hoje: as cadastradas na VSUP0110 e as que vêm do
  // cadastro do item (segunda unidade, embalagem) ou da padrão da empresa.
  const linhas = useMemo(() => {
    const out: { chave: string; de: string; para: string; titulo: string; fonte: string; mask?: string; date?: string; situacao?: string }[] = [];
    const pares = new Set<string>();
    for (const c of conversoes) {
      if (c.situation === "ENCERRADA") continue;
      pares.add([c.from_uom, c.to_uom].sort().join("|") + (c.mask ?? ""));
      out.push({
        chave: `c${c.id}`, de: c.from_uom, para: c.to_uom, mask: c.mask || undefined,
        titulo: `${numero(c.from_quantity)} ${c.from_uom} = ${numero(c.to_quantity)} ${c.to_uom}`,
        fonte: c.mask ? `cadastrada aqui (máscara ${c.mask})` : "cadastrada aqui",
        date: c.situation === "FUTURA" ? c.valid_from.slice(0, 10) : undefined, situacao: c.situation,
      });
    }
    for (const r of cobertura?.rows ?? []) {
      if (r.status !== "OK" || !cobertura || r.unit === cobertura.stock_unit) continue;
      const k = [r.unit, cobertura.stock_unit].sort().join("|");
      if (pares.has(k)) continue;
      pares.add(k);
      out.push({
        chave: `u${r.unit}`, de: r.unit, para: cobertura.stock_unit,
        titulo: r.factor ? `1 ${r.unit} = ${numero(r.factor, 8)} ${cobertura.stock_unit}` : `${r.unit} → ${cobertura.stock_unit}`,
        fonte: r.source ? ROTULO_FONTE[r.source] ?? r.source : "caminho",
      });
    }
    return out;
  }, [conversoes, cobertura]);

  return (
    <>
      <div className="erp-fieldset">
        <div className="erp-fieldset-head">
          Conversões do item
          <span style={{ fontWeight: 400, opacity: .7, marginLeft: 8 }}>— troque a quantidade para ver quanto dá; ⇄ inverte o sentido</span>
        </div>
        <div className="erp-grid-wrap">
          <table className="erp-grid">
            <thead><tr><th>Conversão</th><th>De onde vem</th><th className="num" style={{ width: 130 }}>Quantidade</th><th>Dá</th><th /></tr></thead>
            <tbody>
              {linhas.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">O item ainda não converte para outra unidade. Teste uma conversão abaixo antes de cadastrá-la.</td></tr>}
              {linhas.map((l) => <LinhaTeste key={l.chave} item={item} linha={l} aoDetalhar={detalhar} />)}
            </tbody>
          </table>
        </div>
      </div>

      <TesteAntesDeGravar item={item} unidades={unidades} estoque={estoque} aceitaFracao={aceitaFracao} aoUsarNoCadastro={aoUsarNoCadastro} />

      <div className="erp-fieldset" ref={detalhe}>
        <div className="erp-fieldset-head">Passo a passo <span style={{ fontWeight: 400, opacity: .7, marginLeft: 8 }}>— qualquer par de unidades, numa data, num lote ou numa máscara</span></div>
        <div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label">Quantidade</label><input className="erp-input num" value={p.qty} onChange={(e) => setP((x) => ({ ...x, qty: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">De</label><select className="erp-input" value={p.from} onChange={(e) => setP((x) => ({ ...x, from: e.target.value }))}><OpcoesDeUnidade unidades={unidades} /></select></div>
          <div className="erp-field erp-c2"><label className="erp-label">Para</label><select className="erp-input" value={p.to} onChange={(e) => setP((x) => ({ ...x, to: e.target.value }))}><OpcoesDeUnidade unidades={unidades} /></select></div>
          <div className="erp-field erp-c2"><label className="erp-label">Na data</label><input className="erp-input" type="date" value={p.date} onChange={(e) => setP((x) => ({ ...x, date: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Lote</label><input className="erp-input" value={p.lot} onChange={(e) => setP((x) => ({ ...x, lot: e.target.value }))} placeholder="opcional" /></div>
          <div className="erp-field erp-c1"><label className="erp-label">Máscara</label><input className="erp-input" value={p.mask} onChange={(e) => setP((x) => ({ ...x, mask: e.target.value }))} placeholder="opcional" /></div>
          <div className="erp-field erp-c1" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void rodar()} disabled={busy}>{busy && <span className="erp-spin" />}Converter</button></div>
          {res && (
            <div className="erp-field erp-c12">
              <div className="erp-metric" style={{ marginBottom: 8 }}>
                <span className="erp-metric-label">Resultado</span>
                <span className="erp-metric-value">{numero(res.quantity)} {res.from_uom} = {numero(res.rounded ?? res.converted)} {res.to_uom}</span>
              </div>
              {res.rounded && <div className="erp-hint">Sem arredondar: {numero(res.converted, 10)} {res.to_uom}. {res.rounding_note}</div>}
              <div className="erp-note">{res.explanation}</div>
              {res.steps.length > 0 && (
                <div className="erp-grid-wrap" style={{ marginTop: 8 }}>
                  <table className="erp-grid">
                    <thead><tr><th>#</th><th>Passo</th><th className="num">Fator</th><th>Cadastro</th></tr></thead>
                    <tbody>{res.steps.map((s, i) => (
                      <tr key={i}><td>{i + 1}</td><td>{s.from_uom} → {s.to_uom}{s.inverted ? " (pela inversa)" : ""}</td><td className="num">{numero(s.factor, 10)}</td><td>{ROTULO_FONTE[s.source] ?? s.source}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/** Uma conversão do item com a quantidade editável e o resultado calculado pelo servidor (mesma regra das notas e pedidos). */
function LinhaTeste({ item, linha, aoDetalhar }: {
  item: string;
  linha: { de: string; para: string; titulo: string; fonte: string; mask?: string; date?: string; situacao?: string };
  aoDetalhar: (x: Partial<Params>) => void;
}): JSX.Element {
  const [qty, setQty] = useState("1");
  const [invertido, setInvertido] = useState(false);
  const [res, setRes] = useState<Simulacao | null>(null);
  const [erro, setErro] = useState("");
  const de = invertido ? linha.para : linha.de, para = invertido ? linha.de : linha.para;
  useEffect(() => {
    const q = decLivre(qty);
    if (!frac(q)) { setRes(null); setErro(q ? "quantidade inválida" : ""); return; }
    let vivo = true;
    const t = setTimeout(() => {
      simular({ item, from: de, to: para, qty: q, date: linha.date, mask: linha.mask })
        .then((r) => { if (vivo) { setRes(r); setErro(""); } })
        .catch((e) => { if (vivo) { setRes(null); setErro(errMessage(e)); } });
    }, 300);
    return () => { vivo = false; clearTimeout(t); };
  }, [item, qty, de, para, linha.date, linha.mask]);
  return (
    <tr>
      <td><strong>{linha.titulo}</strong>{linha.situacao === "FUTURA" && <span className="erp-badge info" style={{ marginLeft: 6 }}>vale de {linha.date?.split("-").reverse().join("/")}</span>}</td>
      <td>{linha.fonte}</td>
      <td className="num">
        <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
          <input className="erp-cell-input num" style={{ width: 80 }} aria-label={`Quantidade em ${de}`} value={qty} onChange={(e) => setQty(e.target.value)} />
          <span>{de}</span>
        </span>
      </td>
      <td>
        {res && <><strong>{numero(res.rounded ?? res.converted, 8)} {para}</strong>{res.rounded && <small style={{ display: "block", color: "var(--v-text-muted)" }}>sem arredondar {numero(res.converted, 8)}</small>}</>}
        {erro && <small style={{ color: "var(--v-err)" }}>{erro}</small>}
      </td>
      <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
        <button className="erp-btn erp-btn-sm" title="Inverter o sentido" aria-label="Inverter o sentido" onClick={() => setInvertido((v) => !v)}>⇄</button>{" "}
        <button className="erp-btn erp-btn-sm" onClick={() => aoDetalhar({ from: de, to: para, qty: decLivre(qty) || "1", date: linha.date ?? "", mask: linha.mask ?? "" })}>Passo a passo</button>
      </td>
    </tr>
  );
}

/** Testa a conversão que a pessoa pensa em cadastrar, sem gravar nada. */
function TesteAntesDeGravar({ item, unidades, estoque, aceitaFracao, aoUsarNoCadastro }: {
  item: string; unidades: Unidade[]; estoque: string; aceitaFracao: boolean; aoUsarNoCadastro: (r: RascunhoConversao) => void;
}): JSX.Element {
  const [t, setT] = useState({ qDe: "1", de: "", qPara: "", para: estoque, qtd: "100" });
  const [hoje, setHoje] = useState<{ res?: Simulacao; erro?: string } | null>(null);
  useEffect(() => { setT((x) => ({ ...x, para: x.para || estoque })); }, [estoque]);

  const fDe = frac(t.qDe), fPara = frac(t.qPara), fQtd = frac(t.qtd);
  const valido = !!(t.de && t.para && t.de !== t.para && fDe && fPara);
  const resultado = valido && fQtd ? mul(fQtd, div(fPara!, fDe!)) : null;
  const inversa = valido ? div(fDe!, fPara!) : null;

  // O que o sistema faz hoje com o mesmo par (para comparar).
  useEffect(() => {
    const q = decLivre(t.qtd);
    if (!t.de || !t.para || t.de === t.para || !frac(q)) { setHoje(null); return; }
    let vivo = true;
    const h = setTimeout(() => {
      simular({ item, from: t.de, to: t.para, qty: q })
        .then((r) => { if (vivo) setHoje({ res: r }); })
        .catch((e) => { if (vivo) setHoje({ erro: errMessage(e) }); });
    }, 300);
    return () => { vivo = false; clearTimeout(h); };
  }, [item, t.de, t.para, t.qtd]);

  let comparacao: JSX.Element | null = null;
  if (resultado && hoje?.res) {
    const atual = frac(hoje.res.converted);
    const igual = atual && atual.n * resultado.d === resultado.n * atual.d;
    comparacao = igual
      ? <div className="erp-feedback success"><span>Igual ao que o sistema já faz hoje ({hoje.res.explanation}). Não precisa cadastrar.</span></div>
      : <div className="erp-feedback info"><span>Hoje o sistema converte {numero(hoje.res.quantity)} {t.de} em <strong>{numero(hoje.res.converted, 8)} {t.para}</strong> ({hoje.res.explanation}). Com esta conversão passaria a dar <strong>{br(resultado)} {t.para}</strong> — a conversão cadastrada aqui ganha.</span></div>;
  } else if (resultado && hoje?.erro) {
    comparacao = <div className="erp-note">Hoje o item não converte {t.de} em {t.para}: esta seria a primeira conversão do par.</div>;
  }
  const naoFraciona = resultado && t.para === estoque && !aceitaFracao && !inteiro(resultado);

  return (
    <div className="erp-fieldset">
      <div className="erp-fieldset-head">Testar uma conversão antes de gravar <span style={{ fontWeight: 400, opacity: .7, marginLeft: 8 }}>— nada é gravado</span></div>
      <div className="erp-fieldset-body">
        <div className="erp-field erp-c1"><label className="erp-label">Quantidade</label><input className="erp-input num" value={t.qDe} onChange={(e) => setT((x) => ({ ...x, qDe: e.target.value }))} /></div>
        <div className="erp-field erp-c3"><label className="erp-label">Unidade</label><select className="erp-input" value={t.de} onChange={(e) => setT((x) => ({ ...x, de: e.target.value }))}><OpcoesDeUnidade unidades={unidades} /></select></div>
        <div className="erp-field erp-c2"><label className="erp-label">equivale a</label><input className="erp-input num" value={t.qPara} placeholder="ex.: 12" onChange={(e) => setT((x) => ({ ...x, qPara: e.target.value }))} /></div>
        <div className="erp-field erp-c3"><label className="erp-label">Unidade</label><select className="erp-input" value={t.para} onChange={(e) => setT((x) => ({ ...x, para: e.target.value }))}><OpcoesDeUnidade unidades={unidades} /></select></div>
        <div className="erp-field erp-c3"><label className="erp-label">Testar com</label>
          <span style={{ display: "flex", gap: 6, alignItems: "center" }}><input className="erp-input num" value={t.qtd} onChange={(e) => setT((x) => ({ ...x, qtd: e.target.value }))} /><span>{t.de || "—"}</span></span></div>
        {valido && resultado && (
          <div className="erp-field erp-c12">
            <div className="erp-metric" style={{ marginBottom: 6 }}>
              <span className="erp-metric-label">Daria</span>
              <span className="erp-metric-value">{br(fQtd!)} {t.de} = {br(resultado)} {t.para}</span>
            </div>
            <div className="erp-hint">Nos dois sentidos: 1 {t.de} = {br(div(fPara!, fDe!), 10)} {t.para} · 1 {t.para} = {br(inversa!, 10)} {t.de}</div>
            {naoFraciona && <div className="erp-feedback warn" style={{ marginTop: 6 }}><span>O item não aceita fração em {estoque}: {br(resultado)} seria arredondado para {arredondar(resultado).toString()} e só passa se a sobra couber no arredondamento e na tolerância da conversão.</span></div>}
            <div style={{ marginTop: 6 }}>{comparacao}</div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
              <button className="erp-btn erp-btn-primary" onClick={() => aoUsarNoCadastro({ from_uom: t.de, to_uom: t.para, from_quantity: t.qDe, to_quantity: t.qPara })}>Levar para o cadastro</button>
            </div>
          </div>
        )}
        {!valido && <div className="erp-field erp-c12"><span className="erp-hint">Escreva a conversão como está no documento (ex.: 1 CX = 12 UN) e a quantidade de um caso real, como a de uma nota.</span></div>}
      </div>
    </div>
  );
}

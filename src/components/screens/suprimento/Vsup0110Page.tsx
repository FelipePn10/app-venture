import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type ConversaoItem, type Cobertura, type ConversaoLote, type Evento, type Unidade,
  TIPOS_TOLERANCIA, ROTULO_TOLERANCIA, ROTULO_SITUACAO, ROTULO_ORIGEM_CADASTRO,
  listarConversoes, criarConversao, alterarConversao, excluirConversao, impactoDaConversao,
  coberturaDoItem, listarLotes, salvarLote, excluirLote, historicoDoItem,
  listarUnidades, ambosOsSentidos, numero,
} from "@/services/unitConversionService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems } from "@/services/lookups";
import { confirmar, pedirTexto } from "@/components/ui/dialogos";
import { AbaUnidades, AbaSinonimos, AbaConversoesPadrao, OpcoesDeUnidade } from "./Vsup0110Catalogo";
import { AbaSimulador, type RascunhoConversao } from "./Vsup0110Simulador";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type Aba = "conversoes" | "cobertura" | "simulador" | "lotes" | "historico" | "unidades" | "sinonimos" | "padrao";
const ABAS_DO_ITEM: Aba[] = ["conversoes", "cobertura", "simulador", "lotes", "historico"];

const hoje = () => new Date().toLocaleDateString("sv-SE"); // AAAA-MM-DD no fuso local
const dataBR = (iso?: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");
const dec = (s: string) => s.trim().replace(/\./g, "").replace(",", ".");
const decLivre = (s: string) => (s.includes(",") ? dec(s) : s.trim());

const ROTULO_PAPEL: Record<string, string> = {
  ESTOQUE: "Estoque", COMPRA: "Compra", COMPRA_CONTABIL: "Compra (fiscal)", VENDA: "Venda", SECUNDARIA: "Segunda unidade",
  ESTRUTURA: "Estrutura (consumo)", EMBALAGEM: "Embalagem (GTIN)", FORNECEDOR: "Vínculo com fornecedor", PEDIDO: "Pedido de compra", NOTA: "Nota de entrada",
};
const STATUS_COBERTURA: Record<string, { rotulo: string; cor: string }> = {
  BASE: { rotulo: "Unidade de estoque", cor: "info" }, OK: { rotulo: "Converte", cor: "ok" },
  SEM_CONVERSAO: { rotulo: "Sem conversão", cor: "err" }, FORA_DO_CATALOGO: { rotulo: "Fora do catálogo", cor: "warn" },
};
const ROTULO_ACAO: Record<string, string> = { CRIADA: "Criada", ALTERADA: "Alterada", NOVA_VIGENCIA: "Nova vigência", EXCLUIDA: "Excluída" };

interface FormConversao {
  from_uom: string; to_uom: string; from_quantity: string; to_quantity: string;
  rounding_percent: string; tolerance_value: string; tolerance_type: string;
  valid_from: string; notes: string;
  /** Máscara do configurador: vazio = vale para o item todo. */
  mask: string;
  /** Na alteração: corrigir a versão (cadastro errado) ou abrir nova vigência. */
  modo: "corrigir" | "nova_vigencia";
}
const FORM_VAZIO: FormConversao = {
  from_uom: "", to_uom: "", from_quantity: "1", to_quantity: "", rounding_percent: "0", tolerance_value: "0", tolerance_type: "VALUE",
  valid_from: "", notes: "", mask: "", modo: "corrigir",
};

/** a/b ≠ c/d sem cair no erro de ponto flutuante (0,1 × 3 ≠ 0,3). */
function fracaoMudou(qDe: string, qPara: string, deAtual: string, paraAtual: string): boolean {
  const a = Number(qDe) * Number(paraAtual), b = Number(qPara) * Number(deAtual);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return true;
  return Math.abs(a - b) > 1e-9 * Math.max(Math.abs(a), Math.abs(b), 1);
}

export function Vsup0110Page(): JSX.Element {
  const [item, setItem] = useState<string | undefined>(undefined);
  const [aba, setAbaAtual] = useState<Aba>("conversoes");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [versaoCatalogo, setVersaoCatalogo] = useState(0);

  const [conversoes, setConversoes] = useState<ConversaoItem[]>([]);
  const [todasVersoes, setTodasVersoes] = useState(false);
  const [explicarVersoes, setExplicarVersoes] = useState(false);
  const [cobertura, setCobertura] = useState<Cobertura | null>(null);
  const [form, setForm] = useState<FormConversao>(FORM_VAZIO);
  const [editando, setEditando] = useState<ConversaoItem | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);

  /** Trocar de aba limpa a mensagem da ação anterior ("Conversão gravada" no simulador confundia). */
  const setAba = useCallback((a: Aba) => { setAbaAtual(a); setFeedback(null); }, []);
  const aviso = useCallback((type: "success" | "error" | "info", message: string) => setFeedback({ type, message }), []);

  useEffect(() => {
    listarUnidades(true).then(setUnidades).catch((e) => aviso("error", errMessage(e)));
  }, [versaoCatalogo, aviso]);

  const carregarItem = useCallback(async (codigo: string | undefined, versoes = todasVersoes) => {
    if (!codigo) return;
    setBusy(true);
    try {
      const [lista, cob] = await Promise.all([listarConversoes(codigo, versoes), coberturaDoItem(codigo)]);
      setConversoes(lista); setCobertura(cob);
    } catch (e) { aviso("error", errMessage(e)); } finally { setBusy(false); }
  }, [todasVersoes, aviso]);

  useEffect(() => {
    setConversoes([]); setCobertura(null); setEditando(null); setForm(FORM_VAZIO); setAvisos([]); setFeedback(null);
    void carregarItem(item);
  }, [item]); // eslint-disable-line react-hooks/exhaustive-deps

  const setF = <K extends keyof FormConversao>(k: K, v: FormConversao[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };

  const unidadeEstoque = cobertura?.stock_unit ?? "";
  const qDe = decLivre(form.from_quantity), qPara = decLivre(form.to_quantity);
  const previa = ambosOsSentidos(form.from_uom, form.to_uom, qDe, qPara);
  const mudouFracao = !!editando && fracaoMudou(qDe, qPara, editando.from_quantity, editando.to_quantity);

  /** Avisa quando o par não toca nenhuma unidade que o item usa. */
  const alertaDePar = useMemo(() => {
    if (!cobertura || !form.from_uom || !form.to_uom) return "";
    const usadas = new Set(cobertura.rows.map((r) => r.unit));
    if (usadas.has(form.from_uom) || usadas.has(form.to_uom)) return "";
    return `Nenhum cadastro deste item usa ${form.from_uom} ou ${form.to_uom} ainda (estoque, compra, venda, segunda unidade, embalagem, estrutura, pedidos, notas). A conversão vale mesmo assim — a nota ou o pedido que chegar em ${form.from_uom} já converte. Se o item é comprado ou vendido nessa unidade, informe-a também no cadastro do item (unidade de compra ou de venda) para a compra e a venda já sugerirem.`;
  }, [cobertura, form.from_uom, form.to_uom]);

  function prepararNova(de = "", para = unidadeEstoque, r?: RascunhoConversao) {
    setEditando(null); setAvisos([]);
    setForm({ ...FORM_VAZIO, from_uom: de, to_uom: para, ...(r ? { from_quantity: r.from_quantity, to_quantity: r.to_quantity } : {}) });
    setAba("conversoes");
  }
  function editar(c: ConversaoItem) {
    setEditando(c); setAvisos([]);
    setForm({
      from_uom: c.from_uom, to_uom: c.to_uom, from_quantity: c.from_quantity, to_quantity: c.to_quantity,
      rounding_percent: String(c.rounding_percent), tolerance_value: String(c.tolerance_value), tolerance_type: c.tolerance_type || "VALUE",
      valid_from: hoje(), notes: c.notes ?? "", mask: c.mask ?? "", modo: "corrigir",
    });
  }

  /** Mostra o que depende da conversão e pede confirmação; devolve false se a pessoa desistiu. */
  async function conferirImpacto(c: ConversaoItem, acao: string): Promise<boolean> {
    const imp = await impactoDaConversao(c.id);
    if (!imp.messages.length) return true;
    return confirmar({
      titulo: `${acao} a conversão?`, assunto: `${c.from_uom} → ${c.to_uom}`, tom: "aviso", rotulo: acao,
      mensagem: imp.messages.join("\n"),
    });
  }

  async function salvar() {
    if (!item) { aviso("error", "Selecione o item."); return; }
    if (!form.from_uom || !form.to_uom || !(Number(qDe) > 0) || !(Number(qPara) > 0)) { aviso("error", "Informe as duas unidades e as duas quantidades (maiores que zero)."); return; }
    setBusy(true); setFeedback(null);
    try {
      let salva: ConversaoItem;
      if (editando) {
        let motivo = "";
        if (mudouFracao) {
          if (!(await conferirImpacto(editando, form.modo === "nova_vigencia" ? "Abrir nova vigência" : "Corrigir"))) return;
          const r = await pedirTexto({
            titulo: "Motivo da alteração", assunto: `${editando.from_uom} → ${editando.to_uom}`, rotulo: "Motivo",
            mensagem: form.modo === "nova_vigencia"
              ? `A versão atual fica encerrada em ${dataBR(form.valid_from)} − 1 dia e a nova passa a valer em ${dataBR(form.valid_from)}. Notas e movimentos anteriores continuam com o fator antigo.`
              : "A versão é corrigida no lugar: vale para o passado também. Use quando o cadastro estava errado; se o material ou o fornecedor mudou, prefira abrir nova vigência.",
            minimo: 5, multilinha: true, rotuloConfirmar: "Gravar",
          });
          if (r === null) return;
          motivo = r;
        }
        salva = await alterarConversao(editando.id, {
          from_quantity: qDe, to_quantity: qPara,
          rounding_percent: decLivre(form.rounding_percent) || "0", tolerance_value: decLivre(form.tolerance_value) || "0", tolerance_type: form.tolerance_type,
          notes: form.notes.trim() || undefined,
          valid_from: mudouFracao && form.modo === "nova_vigencia" ? form.valid_from : undefined,
          reason: motivo || undefined,
        });
      } else {
        salva = await criarConversao({
          item_code: item, mask: form.mask.trim() || undefined, from_uom: form.from_uom, to_uom: form.to_uom, from_quantity: qDe, to_quantity: qPara,
          factor: String(Number(qPara) / Number(qDe)),
          rounding_percent: decLivre(form.rounding_percent) || "0", tolerance_value: decLivre(form.tolerance_value) || "0", tolerance_type: form.tolerance_type,
          valid_from: form.valid_from || undefined, notes: form.notes.trim() || undefined,
        });
      }
      setAvisos(salva.warnings);
      aviso("success", `Conversão gravada: ${ambosOsSentidos(salva.from_uom, salva.to_uom, salva.from_quantity, salva.to_quantity)}`);
      setEditando(null); setForm(FORM_VAZIO);
      await carregarItem(item);
    } catch (e) { aviso("error", errMessage(e)); } finally { setBusy(false); }
  }

  async function remover(c: ConversaoItem) {
    try {
      if (!(await conferirImpacto(c, "Excluir"))) return;
      const motivo = await pedirTexto({
        titulo: "Excluir a conversão?", assunto: `${c.from_uom} → ${c.to_uom}`, rotulo: "Motivo da exclusão", minimo: 5, multilinha: true,
        mensagem: "A conversão deixa de valer. Compra, estrutura, ordem e nota que dependem dela passam a pedir a conversão que falta.",
        rotuloConfirmar: "Excluir conversão",
      });
      if (motivo === null) return;
      setBusy(true);
      await excluirConversao(c.id, motivo);
      if (editando?.id === c.id) { setEditando(null); setForm(FORM_VAZIO); }
      aviso("success", "Conversão excluída.");
      await carregarItem(item);
    } catch (e) { aviso("error", errMessage(e)); } finally { setBusy(false); }
  }

  const abaDoItem = ABAS_DO_ITEM.includes(aba);
  const faltando = cobertura?.missing ?? 0;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Suprimento</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Unidades e Conversões</span>
          <span className="erp-crumb-code">VSUP0110</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        {unidadeEstoque && <span className="erp-titlebar-meta">Estoque em {unidadeEstoque}</span>}
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Item</span>
          <div className="erp-tlookup"><LookupField value={item} loader={loadItems} entityLabel="item" placeholder="Selecionar item" onChange={(c) => setItem(c ? String(c) : undefined)} /></div>
          <button className="erp-btn erp-btn-dark" onClick={() => void carregarItem(item)} disabled={busy || !item}>{busy && <span className="erp-spin" />}Atualizar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VSUP0110 — Unidades e Conversões" filename="vsup0110" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
        {/* Os avisos da gravação ficam junto da confirmação: no pé do formulário ninguém os via. */}
        {avisos.length > 0 && abaDoItem && (
          <div className="erp-feedback info">
            <strong>Atenção:</strong><ul style={{ margin: "4px 0 0 18px" }}>{avisos.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </div>
        )}
        <section className="erp-detail-panel" style={{ flex: 1 }}>
          <div className="erp-tabs">
            <button className={`erp-tab${aba === "conversoes" ? " active" : ""}`} onClick={() => setAba("conversoes")}>Conversões do item ({conversoes.length})</button>
            <button className={`erp-tab${aba === "cobertura" ? " active" : ""}`} onClick={() => setAba("cobertura")}>Cobertura{faltando > 0 && <span className="erp-badge err" style={{ marginLeft: 6 }}>{faltando}</span>}</button>
            <button className={`erp-tab${aba === "simulador" ? " active" : ""}`} onClick={() => setAba("simulador")}>Simulador</button>
            <button className={`erp-tab${aba === "lotes" ? " active" : ""}`} onClick={() => setAba("lotes")}>Por lote</button>
            <button className={`erp-tab${aba === "historico" ? " active" : ""}`} onClick={() => setAba("historico")}>Histórico</button>
            <span style={{ flex: 1 }} />
            <button className={`erp-tab${aba === "unidades" ? " active" : ""}`} onClick={() => setAba("unidades")}>Unidades</button>
            <button className={`erp-tab${aba === "sinonimos" ? " active" : ""}`} onClick={() => setAba("sinonimos")}>Sinônimos</button>
            <button className={`erp-tab${aba === "padrao" ? " active" : ""}`} onClick={() => setAba("padrao")}>Conversões padrão</button>
          </div>
          <div className="erp-detail-body">
            {abaDoItem && !item && (
              <div className="erp-grid-empty" style={{ padding: 24 }}>
                Selecione um item para ver e cadastrar as conversões dele. O catálogo de unidades, os sinônimos e as
                conversões padrão (que valem para todos os itens) ficam nas abas à direita.
              </div>
            )}

            {aba === "conversoes" && item && (
              <>
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">
                    Conversões cadastradas
                    <span style={{ flex: 1 }} />
                    <button className="erp-btn erp-btn-sm" onClick={() => prepararNova()} disabled={busy}>Nova conversão</button>
                  </div>
                  {/* Filtro fora do cabeçalho (que é todo em maiúsculas) e explicação por clique:
                      o title não aparece na janela do app desktop. */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "8px 12px" }}>
                    <div className="erp-chips" role="radiogroup" aria-label="Quais conversões mostrar">
                      <button type="button" role="radio" aria-checked={!todasVersoes} className={`erp-chip${!todasVersoes ? " active" : ""}`}
                        onClick={() => { if (todasVersoes) { setTodasVersoes(false); void carregarItem(item, false); } }}>Em vigor e futuras</button>
                      <button type="button" role="radio" aria-checked={todasVersoes} className={`erp-chip${todasVersoes ? " active" : ""}`}
                        onClick={() => { if (!todasVersoes) { setTodasVersoes(true); void carregarItem(item, true); } }}>Todas, com as encerradas</button>
                    </div>
                    <button type="button" className="erp-btn erp-btn-sm" aria-expanded={explicarVersoes} onClick={() => setExplicarVersoes((v) => !v)}>
                      {explicarVersoes ? "Fechar explicação" : "O que são as encerradas?"}
                    </button>
                  </div>
                  {explicarVersoes && (
                    <div className="erp-feedback info" style={{ margin: "0 12px 8px" }}><span>
                      Quando o fator muda por <strong>nova vigência</strong> (outro fornecedor, outra embalagem, outro material), a conversão
                      antiga não é apagada: ela fica <strong>encerrada</strong> na véspera da nova. Notas, pedidos e movimentos daquele período
                      usaram o fator dela, então ela continua guardada para consulta e não pode ser alterada. "Em vigor e futuras" mostra só o
                      que vale hoje e o que já está programado; "Todas" inclui esse histórico.
                    </span></div>
                  )}
                  <div className="erp-grid-wrap">
                    <table className="erp-grid">
                      <thead><tr><th>Conversão</th><th>Leitura inversa</th><th>Vigência</th><th>Situação</th><th>Origem</th><th>Arredondamento</th><th /></tr></thead>
                      <tbody>
                        {conversoes.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhuma conversão própria. O item ainda usa as conversões padrão da empresa — veja a aba Cobertura.</td></tr>}
                        {conversoes.map((c) => (
                          <tr key={c.id} className={editando?.id === c.id ? "sel" : undefined}>
                            <td><strong>{numero(c.from_quantity)} {c.from_uom} = {numero(c.to_quantity)} {c.to_uom}</strong>{c.mask && <span className="erp-badge info" style={{ marginLeft: 6 }}>máscara {c.mask}</span>}</td>
                            <td>1 {c.to_uom} = {numero(c.inverse_factor, 8)} {c.from_uom}</td>
                            <td>{c.valid_from <= "2000-01-01" ? "desde sempre" : `de ${dataBR(c.valid_from)}`}{c.valid_to ? ` até ${dataBR(c.valid_to)}` : ""}</td>
                            <td><span className={`erp-badge ${c.situation === "VIGENTE" ? "ok" : c.situation === "FUTURA" ? "info" : "draft"}`}>{ROTULO_SITUACAO[c.situation] ?? c.situation}</span></td>
                            <td>{ROTULO_ORIGEM_CADASTRO[c.origin] ?? c.origin}</td>
                            <td>{c.rounding_percent || c.tolerance_value ? `${numero(c.rounding_percent)}% + ${numero(c.tolerance_value)}${c.tolerance_type === "PERCENT" ? "%" : ""}` : "—"}</td>
                            <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                              {c.situation !== "ENCERRADA" && <>
                                <button className="erp-btn erp-btn-sm" onClick={() => editar(c)} disabled={busy}>Alterar</button>{" "}
                                <button className="erp-btn erp-btn-sm erp-btn-danger" onClick={() => void remover(c)} disabled={busy}>Excluir</button>
                              </>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">
                    {editando ? `Alterando ${editando.from_uom} → ${editando.to_uom}${editando.mask ? ` (máscara ${editando.mask})` : ""}` : "Nova conversão"}
                    {cobertura && <span style={{ fontWeight: 400, opacity: .7, marginLeft: 8 }}>— o item é estocado em {cobertura.stock_unit}{cobertura.accepts_fractional ? "" : " e não aceita fração"}</span>}
                  </div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c2"><label className="erp-label erp-req">Quantidade</label>
                      <input className="erp-input num" value={form.from_quantity} onChange={(e) => setF("from_quantity", e.target.value)} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label erp-req">Unidade</label>
                      <select className="erp-input" value={form.from_uom} disabled={!!editando} onChange={(e) => setF("from_uom", e.target.value)}><OpcoesDeUnidade unidades={unidades} /></select></div>
                    <div className="erp-field erp-c2"><label className="erp-label erp-req">equivale a</label>
                      <input className="erp-input num" value={form.to_quantity} onChange={(e) => setF("to_quantity", e.target.value)} placeholder="ex.: 6000" /></div>
                    <div className="erp-field erp-c3"><label className="erp-label erp-req">Unidade</label>
                      <select className="erp-input" value={form.to_uom} disabled={!!editando} onChange={(e) => setF("to_uom", e.target.value)}><OpcoesDeUnidade unidades={unidades} /></select></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Máscara</label>
                      <input className="erp-input" value={form.mask} disabled={!!editando} placeholder="Todas" onChange={(e) => setF("mask", e.target.value)} />
                      <span className="erp-field-hint">só para uma variante do configurador</span></div>
                    {!editando && (
                      <div className="erp-field erp-c2"><label className="erp-label">Vale a partir de</label>
                        <input className="erp-input" type="date" value={form.valid_from} onChange={(e) => setF("valid_from", e.target.value)} />
                        <span className="erp-field-hint">vazio = desde sempre</span></div>
                    )}
                    <div className="erp-field erp-c12"><span className="erp-hint">
                      Escreva como está no documento: <strong>1 BR = 6000 MM</strong>, <strong>1 CX = 12 UN</strong>, <strong>3 M2 = 1 UN</strong>.
                      A fração fica exata (1/3 continua 1/3) e vale nos dois sentidos — não cadastre a inversa.
                    </span></div>

                    {editando && mudouFracao && (
                      <div className="erp-field erp-c12">
                        <div className="erp-fieldset" style={{ margin: 0 }}>
                          <div className="erp-fieldset-body">
                            <label className="erp-check erp-c6"><input type="radio" checked={form.modo === "corrigir"} onChange={() => setF("modo", "corrigir")} />
                              <span><strong>Corrigir esta versão</strong> — o cadastro estava errado; vale também para o passado.</span></label>
                            <label className="erp-check erp-c6"><input type="radio" checked={form.modo === "nova_vigencia"} onChange={() => setF("modo", "nova_vigencia")} />
                              <span><strong>Nova vigência</strong> — mudou o material, a embalagem ou o fornecedor; o passado mantém o fator antigo.</span></label>
                            {form.modo === "nova_vigencia" && (
                              <div className="erp-field erp-c3"><label className="erp-label erp-req">A partir de</label>
                                <input className="erp-input" type="date" value={form.valid_from} onChange={(e) => setF("valid_from", e.target.value)} /></div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="erp-field erp-c2"><label className="erp-label">Arredondamento (%)</label>
                      <input className="erp-input num" value={form.rounding_percent} onChange={(e) => setF("rounding_percent", e.target.value)} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Tolerância</label>
                      <input className="erp-input num" value={form.tolerance_value} onChange={(e) => setF("tolerance_value", e.target.value)} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Tolerância em</label>
                      <select className="erp-input" value={form.tolerance_type} onChange={(e) => setF("tolerance_type", e.target.value)}>
                        {TIPOS_TOLERANCIA.map((t) => <option key={t} value={t}>{ROTULO_TOLERANCIA[t]}</option>)}
                      </select></div>
                    <div className="erp-field erp-c6"><label className="erp-label">Observação</label>
                      <input className="erp-input" value={form.notes} onChange={(e) => setF("notes", e.target.value)} placeholder="ex.: medido no lote 2311; conforme catálogo do fornecedor" /></div>
                    <div className="erp-field erp-c12"><p className="erp-note">
                      Para item que <strong>não aceita fração</strong>, a conversão arredonda para o inteiro mais próximo e só é aceita se a
                      sobra couber no arredondamento mais a tolerância. Com tudo em zero, só passa conversão que dê inteiro exato.
                    </p></div>

                    {previa && <div className="erp-field erp-c12"><div className="erp-note"><strong>Vai gravar:</strong> {previa}</div></div>}
                    {alertaDePar && <div className="erp-field erp-c12"><div className="erp-feedback info">{alertaDePar}</div></div>}
                    <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 6, justifyContent: "flex-end" }}>
                      {editando && <button className="erp-btn" onClick={() => { setEditando(null); setForm(FORM_VAZIO); }} disabled={busy}>Cancelar</button>}
                      <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{editando ? "Salvar alteração" : "Gravar conversão"}</button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {aba === "cobertura" && item && <AbaCobertura cobertura={cobertura} aoCadastrar={(u) => prepararNova(u, unidadeEstoque)} />}
            {aba === "simulador" && item && <AbaSimulador item={item} unidades={unidades} estoque={unidadeEstoque} aceitaFracao={cobertura?.accepts_fractional ?? true}
              conversoes={conversoes} cobertura={cobertura} aviso={aviso} aoUsarNoCadastro={(r) => prepararNova(r.from_uom, r.to_uom, r)} />}
            {aba === "lotes" && item && <AbaLotes item={item} unidades={unidades} estoque={unidadeEstoque} aviso={aviso} />}
            {aba === "historico" && item && <AbaHistorico item={item} aviso={aviso} />}
            {aba === "unidades" && <AbaUnidades aviso={aviso} aoMudar={() => setVersaoCatalogo((v) => v + 1)} />}
            {aba === "sinonimos" && <AbaSinonimos aviso={aviso} unidades={unidades} />}
            {aba === "padrao" && <AbaConversoesPadrao aviso={aviso} unidades={unidades} />}
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Conversões: <strong>{conversoes.length}</strong></div>
        {cobertura && <div className="erp-status-item">Unidades sem conversão: <strong>{faltando}</strong></div>}
        {item ? <div className="erp-status-item">Item: <strong>{item}</strong></div> : null}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

/** Cada unidade em que o item aparece e se ela chega à unidade de estoque. */
function AbaCobertura({ cobertura, aoCadastrar }: { cobertura: Cobertura | null; aoCadastrar: (unidade: string) => void }): JSX.Element {
  if (!cobertura) return <div className="erp-grid-empty">Carregando…</div>;
  return (
    <div className="erp-fieldset">
      <div className="erp-fieldset-head">
        Onde o item aparece em outra unidade
        {cobertura.missing > 0
          ? <span className="erp-badge err" style={{ marginLeft: 8 }}>{cobertura.missing} sem conversão</span>
          : <span className="erp-badge ok" style={{ marginLeft: 8 }}>tudo converte</span>}
      </div>
      <div className="erp-grid-wrap">
        <table className="erp-grid">
          <thead><tr><th>Onde</th><th>Unidade</th><th>Situação</th><th>Para {cobertura.stock_unit}</th><th>Como</th><th /></tr></thead>
          <tbody>
            {cobertura.rows.map((r, i) => {
              const st = STATUS_COBERTURA[r.status] ?? { rotulo: r.status, cor: "draft" };
              return (
                <tr key={`${r.role}-${r.unit}-${i}`}>
                  <td>{ROTULO_PAPEL[r.role] ?? r.role}{r.occurrences ? ` (${r.occurrences})` : ""}</td>
                  <td><strong>{r.unit}</strong></td>
                  <td><span className={`erp-badge ${st.cor}`}>{st.rotulo}</span></td>
                  <td>{r.factor ? `1 ${r.unit} = ${numero(r.factor, 8)} ${cobertura.stock_unit}` : "—"}</td>
                  <td>{r.explanation ?? ""}</td>
                  <td style={{ textAlign: "right" }}>
                    {r.status === "SEM_CONVERSAO" && <button className="erp-btn erp-btn-sm erp-btn-primary" onClick={() => aoCadastrar(r.unit)}>Cadastrar conversão</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="erp-fieldset-body">
        <p className="erp-note erp-c12">
          A cobertura junta o cadastro do item (estoque, compra, venda, segunda unidade) com o uso real: linhas de
          estrutura, vínculos com fornecedor, pedidos e notas. <strong>Sem conversão</strong> é unidade que algum processo
          vai precisar converter e hoje não consegue; <strong>fora do catálogo</strong> é texto que não é unidade cadastrada.
        </p>
      </div>
    </div>
  );
}

/** Fator medido de um lote (chapa pesada na balança, bobina com metragem do certificado). */
function AbaLotes({ item, unidades, estoque, aviso }: { item: string; unidades: Unidade[]; estoque: string; aviso: (t: "success" | "error" | "info", m: string) => void }): JSX.Element {
  const [lista, setLista] = useState<ConversaoLote[]>([]);
  const [f, setF] = useState({ lot: "", from_uom: estoque, from_quantity: "1", to_uom: "", to_quantity: "", notes: "" });
  const [busy, setBusy] = useState(false);
  // A unidade de estoque chega depois (cobertura): preenche se ainda vazio.
  useEffect(() => { setF((x) => ({ ...x, from_uom: x.from_uom || estoque })); }, [estoque]);
  const carregar = useCallback(async () => {
    try { setLista(await listarLotes(item)); } catch (e) { aviso("error", errMessage(e)); }
  }, [item, aviso]);
  useEffect(() => { void carregar(); }, [carregar]);
  async function salvar() {
    if (!f.lot.trim() || !f.from_uom || !f.to_uom || !(Number(decLivre(f.from_quantity)) > 0) || !(Number(decLivre(f.to_quantity)) > 0)) { aviso("error", "Informe o lote, as unidades e as quantidades."); return; }
    setBusy(true);
    try {
      const s = await salvarLote({ item_code: item, lot: f.lot.trim(), from_uom: f.from_uom, to_uom: f.to_uom, from_quantity: decLivre(f.from_quantity), to_quantity: decLivre(f.to_quantity), notes: f.notes.trim() || undefined });
      aviso("success", `Lote ${s.lot}: ${ambosOsSentidos(s.from_uom, s.to_uom, s.from_quantity, s.to_quantity)}${s.warnings.length ? ` — ${s.warnings.join(" ")}` : ""}`);
      setF((x) => ({ ...x, lot: "", to_quantity: "", notes: "" }));
      await carregar();
    } catch (e) { aviso("error", errMessage(e)); } finally { setBusy(false); }
  }
  async function remover(l: ConversaoLote) {
    const motivo = await pedirTexto({ titulo: "Excluir o fator do lote?", assunto: `Lote ${l.lot}`, rotulo: "Motivo", minimo: 5, rotuloConfirmar: "Excluir", mensagem: "O lote volta a usar a conversão do item." });
    if (motivo === null) return;
    setBusy(true);
    try { await excluirLote(l.id, motivo); await carregar(); aviso("success", "Fator do lote excluído."); } catch (e) { aviso("error", errMessage(e)); } finally { setBusy(false); }
  }
  return (
    <>
      <div className="erp-fieldset">
        <div className="erp-fieldset-head">Fator medido de um lote</div>
        <div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Lote</label><input className="erp-input" value={f.lot} onChange={(e) => setF((x) => ({ ...x, lot: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Quantidade</label><input className="erp-input num" value={f.from_quantity} onChange={(e) => setF((x) => ({ ...x, from_quantity: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Unidade</label><select className="erp-input" value={f.from_uom} onChange={(e) => setF((x) => ({ ...x, from_uom: e.target.value }))}><OpcoesDeUnidade unidades={unidades} /></select></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">equivale a</label><input className="erp-input num" value={f.to_quantity} onChange={(e) => setF((x) => ({ ...x, to_quantity: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Unidade</label><select className="erp-input" value={f.to_uom} onChange={(e) => setF((x) => ({ ...x, to_uom: e.target.value }))}><OpcoesDeUnidade unidades={unidades} /></select></div>
          <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>Gravar</button></div>
          <div className="erp-field erp-c12"><label className="erp-label">Observação</label><input className="erp-input" value={f.notes} onChange={(e) => setF((x) => ({ ...x, notes: e.target.value }))} placeholder="ex.: pesado na recepção; certificado 4471" /></div>
          <div className="erp-field erp-c12"><p className="erp-note">
            O fator do lote vale mais que o do item para movimentos daquele lote. Use quando o real difere do nominal:
            a chapa de 3 mm que veio com 3,15 mm, a bobina com metragem no certificado.
          </p></div>
        </div>
      </div>
      <div className="erp-fieldset">
        <div className="erp-fieldset-head">Lotes com fator próprio ({lista.length})</div>
        <div className="erp-grid-wrap">
          <table className="erp-grid">
            <thead><tr><th>Lote</th><th>Conversão</th><th>Observação</th><th>Atualizado</th><th /></tr></thead>
            <tbody>
              {lista.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum lote com fator próprio.</td></tr>}
              {lista.map((l) => (
                <tr key={l.id}>
                  <td><strong>{l.lot}</strong></td>
                  <td>{numero(l.from_quantity)} {l.from_uom} = {numero(l.to_quantity)} {l.to_uom}</td>
                  <td>{l.notes ?? ""}</td>
                  <td>{dataBR(l.updated_at)}</td>
                  <td style={{ textAlign: "right" }}><button className="erp-btn erp-btn-sm erp-btn-danger" disabled={busy} onClick={() => void remover(l)}>Excluir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function resumoDoEstado(d?: Record<string, unknown>): string {
  if (!d) return "";
  const de = d.from_uom, para = d.to_uom, qd = d.from_quantity, qp = d.to_quantity;
  const partes = [de && para ? `${numero(String(qd ?? 1))} ${de} = ${numero(String(qp ?? ""))} ${para}` : ""];
  if (d.valid_from) partes.push(`desde ${dataBR(String(d.valid_from))}`);
  if (d.valid_to) partes.push(`até ${dataBR(String(d.valid_to))}`);
  if (d.lot) partes.push(`lote ${d.lot}`);
  return partes.filter(Boolean).join(" · ");
}

function AbaHistorico({ item, aviso }: { item: string; aviso: (t: "success" | "error" | "info", m: string) => void }): JSX.Element {
  const [lista, setLista] = useState<Evento[]>([]);
  useEffect(() => { historicoDoItem(item).then(setLista).catch((e) => aviso("error", errMessage(e))); }, [item, aviso]);
  return (
    <div className="erp-fieldset">
      <div className="erp-fieldset-head">Quem mudou o quê ({lista.length})</div>
      <div className="erp-grid-wrap">
        <table className="erp-grid">
          <thead><tr><th>Quando</th><th>Quem</th><th>O quê</th><th>Antes</th><th>Depois</th><th>Motivo</th></tr></thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Sem alterações registradas.</td></tr>}
            {lista.map((ev) => (
              <tr key={ev.id}>
                <td style={{ whiteSpace: "nowrap" }}>{new Date(ev.created_at).toLocaleString("pt-BR")}</td>
                <td>{ev.created_by_name ?? ""}</td>
                <td>{ROTULO_ACAO[ev.action] ?? ev.action}</td>
                <td>{resumoDoEstado(ev.before)}</td>
                <td>{resumoDoEstado(ev.after)}</td>
                <td>{ev.reason ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

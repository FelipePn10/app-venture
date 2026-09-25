import { useEffect, useMemo, useState } from "react";
import { type ItemConversionDTO, type ConversionResult, CONVERSION_TOLERANCE_TYPES, listItemConversions, upsertItemConversion, deleteItemConversion, convertItem } from "@/services/purchasingMasterService";
import { enumLabel } from "@/utils/enumLabels";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems } from "@/services/lookups";
import { getItem, type ItemDTO } from "@/services/itemService";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
// Valores aceitos por TypeUnitOfMeasurementItem no backend.
const UNITS = ["UN", "PC", "PAR", "CX", "KG", "TONELADA", "L", "GL", "M", "M2", "M3", "MM", "CM", "IN", "MICROMETRO"] as const;
function UnitOptions(): JSX.Element {
  return <><option value="">Selecione a unidade</option>{UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</>;
}
const EMPTY: ItemConversionDTO = {
  item_code: "", from_uom: "", to_uom: "", factor: 1,
  rounding_percent: 0, tolerance_value: 0, tolerance_type: "PERCENT",
};

const numero = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 6 });

/**
 * A mesma conversão lida nos dois sentidos.
 *
 * "1 BARRA = 6000 MM" é o número que está na nota do fornecedor; "1 MM =
 * 0,000166667 BARRA" é o mesmo fato e ninguém confere de cabeça. A tela
 * mostrava só um lado, e era por isso que se cadastrava invertido.
 */
function ambosOsSentidos(de: string, para: string, fator: number): string {
  if (!de || !para || !Number.isFinite(fator) || fator <= 0) return "";
  return `1 ${de} = ${numero(fator)} ${para}  ·  1 ${para} = ${numero(1 / fator)} ${de}`;
}

export function Vsup0110Page(): JSX.Element {
  const [item, setItem] = useState<string | undefined>(undefined);
  const [list, setList] = useState<ItemConversionDTO[]>([]);
  const [form, setForm] = useState<ItemConversionDTO>(EMPTY);
  const [conv, setConv] = useState({ from: "", to: "", qty: "1" });
  const [convResult, setConvResult] = useState<ConversionResult | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  /** Linha em edição; nulo = cadastrando uma nova. O POST é upsert por item+UMs. */
  const [editando, setEditando] = useState<number | null>(null);
  const [confirmacao, setConfirmacao] = useState<{ id: number; rotulo: string } | null>(null);
  /**
   * As unidades do próprio item. Sem elas a tela aceita qualquer par de UMs, e
   * conversão entre duas unidades que o item nunca usa é dado morto — ninguém
   * descobre até o MRP pedir a conversão que falta.
   */
  const [dadosDoItem, setDadosDoItem] = useState<ItemDTO | null>(null);
  useEffect(() => {
    let vivo = true;
    setDadosDoItem(null);
    if (!item) return;
    void getItem(String(item)).then((d) => { if (vivo) setDadosDoItem(d); }).catch(() => { /* a tela funciona sem isso */ });
    return () => { vivo = false; };
  }, [item]);

  /** Avisa quando o par cadastrado não toca nenhuma unidade do item. */
  const alertaDeUnidade = useMemo(() => {
    const usadas = [dadosDoItem?.uom, dadosDoItem?.purchase_uom].filter(Boolean) as string[];
    if (!usadas.length || !form.from_uom || !form.to_uom) return "";
    if (usadas.includes(form.from_uom) || usadas.includes(form.to_uom)) return "";
    return `Este item usa ${usadas.join(" e ")}. Uma conversão entre ${form.from_uom} e ${form.to_uom} não será aplicada em compra nem em estoque — confira se é isso mesmo.`;
  }, [dadosDoItem, form.from_uom, form.to_uom]);

  async function carregar() {
    if (!item) { setFeedback({ type: "error", message: "Selecione o item." }); return; }
    setBusy(true); setFeedback(null);
    try { setList(await listItemConversions(item)); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  const setF = <K extends keyof ItemConversionDTO>(k: K, v: ItemConversionDTO[K]) => { setForm((p) => ({ ...p, [k]: v })); setFeedback(null); };
  async function salvar() {
    if (!item || !form.from_uom.trim() || !form.to_uom.trim() || !Number.isFinite(form.factor) || form.factor <= 0) { setFeedback({ type: "error", message: "Item, UMs e fator são obrigatórios." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await upsertItemConversion({ ...form, item_code: item });
      setForm(EMPTY); setEditando(null);
      setFeedback({ type: "success", message: `Conversão salva: ${ambosOsSentidos(form.from_uom, form.to_uom, form.factor)}` });
      await carregar();
    }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }
  async function remover(id: number) {
    setBusy(true); setFeedback(null);
    try {
      await deleteItemConversion(id);
      if (editando === id) { setEditando(null); setForm(EMPTY); }
      setFeedback({ type: "success", message: "Conversão excluída." });
      await carregar();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  /** Traz a linha para o formulário: o POST é upsert pela chave item + UMs. */
  function editar(c: ItemConversionDTO) {
    setForm({ ...c, item_code: String(item ?? "") });
    setEditando(c.id ?? null);
    setFeedback(null);
  }
  async function converter() {
    if (!item || !conv.from || !conv.to) { setFeedback({ type: "error", message: "Informe item, de e para." }); return; }
    setBusy(true); setFeedback(null);
    try { setConvResult(await convertItem(item, conv.from, conv.to, Number(conv.qty) || 1)); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Suprimento</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Conversão de UM por Item</span>
          <span className="erp-crumb-code">VSUP0110</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">1 {form.from_uom || "UM"} = {form.factor} {form.to_uom || "UM"}</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Item</span>
          <div className="erp-tlookup"><LookupField value={item} loader={loadItems} entityLabel="item" placeholder="Selecionar item" onChange={(c) => { setItem(c); setList([]); setConvResult(null); }} /></div>
          <button className="erp-btn erp-btn-dark" onClick={() => void carregar()} disabled={busy}>{busy && <span className="erp-spin" />}Carregar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VSUP0110 — Conversão de UM por Item" filename="vsup0110" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head">
              <span className="erp-panel-title">Conversões do item</span>
              <span className="erp-count">{list.length}</span>
            </div>
            <div className="erp-list">
              {list.length === 0 && <div className="erp-list-empty">Selecione um item e clique em <strong>Carregar</strong>.</div>}
              {list.map((c) => (
                <div key={c.id} className={`erp-list-row${editando === c.id ? " sel" : ""}`} style={{ cursor: "default" }}>
                  <span className="erp-list-code">{c.from_uom}→{c.to_uom}</span>
                  <span className="erp-list-sub">{ambosOsSentidos(c.from_uom, c.to_uom, c.factor)}{c.rounding_percent ? ` · arred. ${c.rounding_percent}%` : ""}</span>
                  <div className="erp-list-meta" style={{ gap: 6 }}>
                    <button className="erp-btn erp-btn-sm" style={{ marginLeft: "auto" }} onClick={() => editar(c)} disabled={busy}>Editar</button>
                    <button className="erp-btn erp-btn-danger erp-btn-sm"
                      onClick={() => c.id && setConfirmacao({ id: c.id, rotulo: `${c.from_uom} → ${c.to_uom}` })} disabled={busy}>Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">Conversões de unidade</button></div>
            <div className="erp-detail-body">
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">
                  {editando ? "Alterando conversão" : "Nova conversão"}
                  {dadosDoItem && (
                    <span style={{ fontWeight: 400, opacity: .7, marginLeft: 8 }}>
                      — o item usa {[dadosDoItem.uom && `${dadosDoItem.uom} em estoque`, dadosDoItem.purchase_uom && `${dadosDoItem.purchase_uom} na compra`].filter(Boolean).join(" e ") || "unidade não informada"}
                    </span>
                  )}
                </div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c3"><label className="erp-label erp-req">De (UM)</label><select className="erp-input" aria-label="De (UM)" value={form.from_uom} onChange={(e) => setF("from_uom", e.target.value)}><UnitOptions /></select></div>
                  <div className="erp-field erp-c3"><label className="erp-label erp-req">Para (UM)</label><select className="erp-input" aria-label="Para (UM)" value={form.to_uom} onChange={(e) => setF("to_uom", e.target.value)}><UnitOptions /></select></div>
                  <div className="erp-field erp-c3"><label className="erp-label erp-req">Fator</label><input className="erp-input num" type="number" step="0.0001" value={form.factor} onChange={(e) => setF("factor", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Arredondamento (%)</label><input className="erp-input num" type="number" step="0.01" min="0" value={form.rounding_percent ?? 0} onChange={(e) => setF("rounding_percent", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Tolerância</label><input className="erp-input num" type="number" step="0.0001" min="0" value={form.tolerance_value ?? 0} onChange={(e) => setF("tolerance_value", Number(e.target.value))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Tolerância em</label>
                    <select className="erp-input" value={form.tolerance_type ?? "PERCENT"} onChange={(e) => setF("tolerance_type", e.target.value)}>
                      {CONVERSION_TOLERANCE_TYPES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}
                    </select></div>
                  <div className="erp-field erp-c12">
                    <p className="erp-note">
                      Para item que <strong>não aceita fração</strong>, a conversão arredonda para o inteiro mais
                      próximo e só é aceita se a sobra couber no arredondamento mais a tolerância. Com os três
                      campos em zero, qualquer conversão que não dê inteiro exato é recusada.
                    </p>
                  </div>
                  {form.from_uom && form.to_uom && form.factor > 0 && (
                    <div className="erp-field erp-c12">
                      <div className="erp-note"><strong>Vai gravar:</strong> {ambosOsSentidos(form.from_uom, form.to_uom, form.factor)}</div>
                    </div>
                  )}
                  {alertaDeUnidade && (
                    <div className="erp-field erp-c12"><div className="erp-feedback error">{alertaDeUnidade}</div></div>
                  )}
                  <div className="erp-field erp-c3" style={{ justifyContent: "flex-end", flexDirection: "row", gap: 6 }}>
                    {editando && <button className="erp-btn" onClick={() => { setEditando(null); setForm(EMPTY); }} disabled={busy}>Cancelar</button>}
                    <button className="erp-btn erp-btn-primary" style={{ flex: 1 }} onClick={() => void salvar()} disabled={busy}>{editando ? "Salvar alteração" : "Salvar conversão"}</button>
                  </div>
                </div>
              </div>
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Resolver conversão</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c2"><label className="erp-label">De</label><select className="erp-input" aria-label="De na simulação" value={conv.from} onChange={(e) => setConv((p) => ({ ...p, from: e.target.value }))}><UnitOptions /></select></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Para</label><select className="erp-input" aria-label="Para na simulação" value={conv.to} onChange={(e) => setConv((p) => ({ ...p, to: e.target.value }))}><UnitOptions /></select></div>
                  <div className="erp-field erp-c2"><label className="erp-label">Qtde</label><input className="erp-input num" type="number" value={conv.qty} onChange={(e) => setConv((p) => ({ ...p, qty: e.target.value }))} /></div>
                  <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={() => void converter()} disabled={busy}>Converter</button></div>
                  <div className="erp-field erp-c6">
                    <label className="erp-label">Resultado</label>
                    <input className="erp-input" readOnly
                      value={convResult
                        ? `${numero(convResult.quantity)} ${convResult.from_uom} = ${numero(convResult.converted_qty)} ${convResult.to_uom}`
                        : ""} />
                    {convResult && <span className="erp-hint">Fator aplicado: 1 {convResult.from_uom} = {numero(convResult.factor)} {convResult.to_uom}.</span>}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        aberto={!!confirmacao}
        titulo="Excluir a conversão?"
        assunto={confirmacao?.rotulo}
        mensagem="A conversão deixa de existir para este item. Compra, estrutura, ordem e custo que dependem dela passam a falhar por conversão ausente — e o erro aparece no próximo cálculo, não agora."
        rotuloConfirmar="Excluir conversão"
        onConfirmar={() => { const id = confirmacao?.id; setConfirmacao(null); if (id) void remover(id); }}
        onCancelar={() => setConfirmacao(null)}
      />

      <footer className="erp-statusbar">
        <div className="erp-status-item">Conversões: <strong>{list.length}</strong></div>
        {item ? <div className="erp-status-item">Item: <strong>#{item}</strong></div> : null}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

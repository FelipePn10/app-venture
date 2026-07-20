import { useState, useCallback } from "react";
import {
  type ItemDTO, type ActivationReadiness,
  listItems, getActivationReadiness, createItem,
} from "@/services/itemService";
import { resolveStructure, type StructureComponent } from "@/services/ItemStructureService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

const NATURE_LABEL: Record<number, string> = { 0: "Genérico", 1: "Configurado", 2: "Item Base" };
const TYPE_MRP = [{ value: 0, label: "NORMAL_MRP" }, { value: 1, label: "PROJETO" }];
const ENG_TYPES = [{ value: 0, label: "FABRICADO" }, { value: 1, label: "COMPRADO" }, { value: 2, label: "DE_TERCEIRO" }];
const STRUCTS = [{ value: 0, label: "INDUSTRIAL" }, { value: 1, label: "COMERCIAL" }];
const USE_TYPES = [{ value: 0, label: "INDUSTRIALIZAÇÃO" }, { value: 1, label: "CONSUMO" }, { value: 2, label: "IMOBILIZADO" }];

const EMPTY_NEW = {
  code: "", nature: 2, item_base_code: "", group_code: "", modifier_code: "",
  uom: "UN", minimum_stock: "0", eng_type: 0, type_struct: 0,
  weight_net: "0", type_mrp: 0, llc: "2", type_of_use: 0,
};

export function Vitm0100Page(): JSX.Element {
  const [items, setItems] = useState<ItemDTO[]>([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<ItemDTO | null>(null);
  const [readiness, setReadiness] = useState<ActivationReadiness | null>(null);
  const [bom, setBom] = useState<StructureComponent[]>([]);
  const [nf, setNf] = useState({ ...EMPTY_NEW });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const listar = () => run(async () => { setItems(await listItems()); });

  const abrir = (it: ItemDTO) => { const c = it.code; if (!c) return; void run(async () => {
    setSelected(it);
    setReadiness(await getActivationReadiness(c));
    try { const s = await resolveStructure(c); setBom(s.components); } catch { setBom([]); }
  }); };

  const criar = () => run(async () => {
    if (!nf.code || !nf.group_code || !nf.modifier_code || (nf.nature !== 2 && !nf.item_base_code)) { setFeedback({ type: "error", message: "Código, grupo, modificador e item-base (para itens não-base) são obrigatórios." }); return; }
    const dto = {
      code: Number(nf.code),
      nature: Number(nf.nature),
      situation: 0,
      health: "ATIVO",
      pdm: { group_code: Number(nf.group_code), modifier_code: Number(nf.modifier_code), attributes: [], description_technique: "" },
      warehouse: { warehouse_code: 1, unit_of_measurement: nf.uom, automatic_low: false, minimum_stock: Number(nf.minimum_stock) || 0 },
      engineering: { ...(nf.nature !== 2 ? { item_base_cod: Number(nf.item_base_code) } : {}), type: nf.eng_type, type_struct: nf.type_struct, oem: false, weight: { gross: Number(nf.weight_net) || 0, net: Number(nf.weight_net) || 0, unit: "KG" } },
      planning: { type_mrp: nf.type_mrp, llc: Number(nf.llc), ghost: false },
      supplies: { type_of_use: nf.type_of_use },
    };
    const created = await createItem(dto);
    setFeedback({ type: "success", message: `Item ${created.code ?? ""} criado.` });
    setNf({ ...EMPTY_NEW });
    setItems(await listItems());
  });

  const filtered = filter.trim()
    ? items.filter((i) => String(i.code).includes(filter.trim()) || (i.description ?? "").toLowerCase().includes(filter.trim().toLowerCase()))
    : items;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Engenharia</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Item &amp; Prontidão para o MRP</span><span className="erp-crumb-code">VITM0100</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Itens</span>
          <button className="erp-btn" onClick={listar} disabled={busy}>Listar</button>
          <input className="erp-input" style={{ width: 200, height: 32 }} value={filter} placeholder="filtrar código/descrição" onChange={(e) => setFilter(e.target.value)} /></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VITM0100 — Itens" filename="vitm0100" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Item &amp; Prontidão para </button></div>
          <div className="erp-detail-body">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        {/* Cadastro rápido */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Cadastro rápido de item (pastas PDM/Almox/Eng/Planej.)</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c1"><label className="erp-label">Código</label><input className="erp-input num" type="number" value={nf.code} onChange={(e) => setNf((p) => ({ ...p, code: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Natureza</label><select className="erp-input" value={nf.nature} onChange={(e) => setNf((p) => ({ ...p, nature: Number(e.target.value) }))}>{[0, 1, 2].map((n) => <option key={n} value={n}>{NATURE_LABEL[n]}</option>)}</select></div>
          {nf.nature !== 2 && <div className="erp-field erp-c1"><label className="erp-label erp-req">Item-base</label><input className="erp-input num" type="number" value={nf.item_base_code} onChange={(e) => setNf((p) => ({ ...p, item_base_code: e.target.value }))} /></div>}
          <div className="erp-field erp-c1"><label className="erp-label erp-req">Grupo</label><input className="erp-input num" type="number" value={nf.group_code} onChange={(e) => setNf((p) => ({ ...p, group_code: e.target.value }))} /></div>
          <div className="erp-field erp-c1"><label className="erp-label erp-req">Modif.</label><input className="erp-input num" type="number" value={nf.modifier_code} onChange={(e) => setNf((p) => ({ ...p, modifier_code: e.target.value }))} /></div>
          <div className="erp-field erp-c1"><label className="erp-label">UM estoque</label><input className="erp-input" value={nf.uom} onChange={(e) => setNf((p) => ({ ...p, uom: e.target.value.toUpperCase() }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Tipo eng.</label><select className="erp-input" value={nf.eng_type} onChange={(e) => setNf((p) => ({ ...p, eng_type: Number(e.target.value) }))}>{ENG_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          <div className="erp-field erp-c2"><label className="erp-label">Estrutura</label><select className="erp-input" value={nf.type_struct} onChange={(e) => setNf((p) => ({ ...p, type_struct: Number(e.target.value) }))}>{STRUCTS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          <div className="erp-field erp-c2"><label className="erp-label">Tipo MRP</label><select className="erp-input" value={nf.type_mrp} onChange={(e) => setNf((p) => ({ ...p, type_mrp: Number(e.target.value) }))}>{TYPE_MRP.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          <div className="erp-field erp-c2"><label className="erp-label">Uso</label><select className="erp-input" value={nf.type_of_use} onChange={(e) => setNf((p) => ({ ...p, type_of_use: Number(e.target.value) }))}>{USE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          <div className="erp-field erp-c1"><label className="erp-label">LLC</label><input className="erp-input num" type="number" value={nf.llc} onChange={(e) => setNf((p) => ({ ...p, llc: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Estoque mín.</label><input className="erp-input num" type="number" value={nf.minimum_stock} onChange={(e) => setNf((p) => ({ ...p, minimum_stock: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Peso líq.</label><input className="erp-input num" type="number" value={nf.weight_net} onChange={(e) => setNf((p) => ({ ...p, weight_net: e.target.value }))} /></div>
          <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" onClick={criar} disabled={busy}>Criar item</button>
            <span style={{ marginLeft: 12, fontSize: 11, color: "#8aa894" }}>LLC 1 = produto final · 2–8 = intermediários · 9 = matéria-prima</span></div>
        </div></div>

        {/* Lista */}
        <div className="erp-fieldset"><div className="erp-fieldset-head">Itens ({filtered.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Código</th><th>Descrição técnica</th><th>Natureza</th><th>Tipo</th><th>LLC</th><th>Tipo MRP</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhum item. Clique em Listar.</td></tr>}
              {filtered.slice(0, 200).map((i) => (
                <tr key={i.code} className={selected?.code === i.code ? "erp-row-sel" : ""}>
                  <td>{i.code}</td><td>{i.description ?? "—"}</td>
                  <td>{i.nature != null ? NATURE_LABEL[i.nature] ?? i.nature : "—"}</td>
                  <td>{i.eng_type ?? "—"}</td><td>{i.llc ?? "—"}</td><td>{i.type_mrp ?? "—"}</td><td>{i.situation ?? "—"}</td>
                  <td><button className="erp-btn" onClick={() => abrir(i)} disabled={busy}>Prontidão</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
        </div>

        {/* Prontidão + BOM */}
        {selected && (
          <>
            {readiness && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Prontidão do item {selected.code} — {selected.description ?? ""}</div><div className="erp-fieldset-body">
                <div className={`erp-feedback ${readiness.ready ? "success" : "error"}`} style={{ marginBottom: 10 }}>
                  {readiness.ready ? "✅ Item pronto para o MRP" : "⚠️ Item NÃO está pronto para o MRP"} · tipo: <strong>{readiness.item_type ?? "—"}</strong>
                </div>
                {readiness.issues.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: "#b91c1c" }}>Pendências (bloqueiam):</div>
                    <ul style={{ margin: "4px 0 0 18px", fontSize: 12 }}>{readiness.issues.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                )}
                {readiness.warnings.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12, color: "#b45309" }}>Alertas:</div>
                    <ul style={{ margin: "4px 0 0 18px", fontSize: 12 }}>{readiness.warnings.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                )}
                {readiness.ready && readiness.issues.length === 0 && readiness.warnings.length === 0 && <div style={{ fontSize: 12, color: "#8aa894" }}>Sem pendências nem alertas.</div>}
              </div></div>
            )}

            <div className="erp-fieldset"><div className="erp-fieldset-head">Estrutura / BOM ({bom.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead><tr><th>Pai</th><th>Filho</th><th>Descrição</th><th>Qtd</th><th>% Perda</th></tr></thead>
                <tbody>
                  {bom.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Sem estrutura (item comprado/matéria-prima, ou sem BOM cadastrada).</td></tr>}
                  {bom.map((c, i) => <tr key={i}><td>{c.parentCode}</td><td>{c.childCode}</td><td>{c.childDescription}</td><td>{c.quantity}</td><td>{c.lossPercentage}</td></tr>)}
                </tbody>
              </table>
            </div></div>
            </div>
          </>
        )}
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Itens: <strong>{items.length}</strong></div>{selected && <div className="erp-status-item">Selecionado: <strong>{selected.code}</strong></div>}</div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

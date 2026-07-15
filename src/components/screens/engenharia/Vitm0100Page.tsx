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
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VITM0100 — Item &amp; Prontidão para o MRP</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Itens</span>
          <button className="fsc-btn fsc-btn-ghost" onClick={listar} disabled={busy}>Listar</button>
          <input className="fsc-input" style={{ width: 200, height: 32 }} value={filter} placeholder="filtrar código/descrição" onChange={(e) => setFilter(e.target.value)} /></div>
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VITM0100 — Itens" filename="vitm0100" /></div>
      </div>

      <div className="fsc-body">
        {feedback && <div className={`fsc-feedback ${feedback.type}`}>{feedback.message}</div>}

        {/* Cadastro rápido */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Cadastro rápido de item (pastas PDM/Almox/Eng/Planej.)</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body"><div className="fsc-grid">
          <div className="fsc-field fsc-col-1"><label className="fsc-label">Código</label><input className="fsc-input fsc-input-right" type="number" value={nf.code} onChange={(e) => setNf((p) => ({ ...p, code: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Natureza</label><select className="fsc-input" value={nf.nature} onChange={(e) => setNf((p) => ({ ...p, nature: Number(e.target.value) }))}>{[0, 1, 2].map((n) => <option key={n} value={n}>{NATURE_LABEL[n]}</option>)}</select></div>
          {nf.nature !== 2 && <div className="fsc-field fsc-col-1"><label className="fsc-label fsc-label-req">Item-base</label><input className="fsc-input fsc-input-right" type="number" value={nf.item_base_code} onChange={(e) => setNf((p) => ({ ...p, item_base_code: e.target.value }))} /></div>}
          <div className="fsc-field fsc-col-1"><label className="fsc-label fsc-label-req">Grupo</label><input className="fsc-input fsc-input-right" type="number" value={nf.group_code} onChange={(e) => setNf((p) => ({ ...p, group_code: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-1"><label className="fsc-label fsc-label-req">Modif.</label><input className="fsc-input fsc-input-right" type="number" value={nf.modifier_code} onChange={(e) => setNf((p) => ({ ...p, modifier_code: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-1"><label className="fsc-label">UM estoque</label><input className="fsc-input" value={nf.uom} onChange={(e) => setNf((p) => ({ ...p, uom: e.target.value.toUpperCase() }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Tipo eng.</label><select className="fsc-input" value={nf.eng_type} onChange={(e) => setNf((p) => ({ ...p, eng_type: Number(e.target.value) }))}>{ENG_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Estrutura</label><select className="fsc-input" value={nf.type_struct} onChange={(e) => setNf((p) => ({ ...p, type_struct: Number(e.target.value) }))}>{STRUCTS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Tipo MRP</label><select className="fsc-input" value={nf.type_mrp} onChange={(e) => setNf((p) => ({ ...p, type_mrp: Number(e.target.value) }))}>{TYPE_MRP.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Uso</label><select className="fsc-input" value={nf.type_of_use} onChange={(e) => setNf((p) => ({ ...p, type_of_use: Number(e.target.value) }))}>{USE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          <div className="fsc-field fsc-col-1"><label className="fsc-label">LLC</label><input className="fsc-input fsc-input-right" type="number" value={nf.llc} onChange={(e) => setNf((p) => ({ ...p, llc: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Estoque mín.</label><input className="fsc-input fsc-input-right" type="number" value={nf.minimum_stock} onChange={(e) => setNf((p) => ({ ...p, minimum_stock: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-2"><label className="fsc-label">Peso líq.</label><input className="fsc-input fsc-input-right" type="number" value={nf.weight_net} onChange={(e) => setNf((p) => ({ ...p, weight_net: e.target.value }))} /></div>
          <div className="fsc-field fsc-col-12"><button className="fsc-btn fsc-btn-primary" onClick={criar} disabled={busy}>Criar item</button>
            <span style={{ marginLeft: 12, fontSize: 11, color: "#8aa894" }}>LLC 1 = produto final · 2–8 = intermediários · 9 = matéria-prima</span></div>
        </div></div></div>

        {/* Lista */}
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Itens ({filtered.length})</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-results-wrap">
          <table className="fsc-table">
            <thead><tr><th className="fsc-num">Código</th><th>Descrição técnica</th><th>Natureza</th><th>Tipo</th><th className="fsc-num">LLC</th><th>Tipo MRP</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} className="fsc-empty">Nenhum item. Clique em Listar.</td></tr>}
              {filtered.slice(0, 200).map((i) => (
                <tr key={i.code} className={selected?.code === i.code ? "fsc-row-selected" : ""}>
                  <td className="fsc-num">{i.code}</td><td>{i.description ?? "—"}</td>
                  <td>{i.nature != null ? NATURE_LABEL[i.nature] ?? i.nature : "—"}</td>
                  <td>{i.eng_type ?? "—"}</td><td className="fsc-num">{i.llc ?? "—"}</td><td>{i.type_mrp ?? "—"}</td><td>{i.situation ?? "—"}</td>
                  <td><button className="fsc-btn fsc-btn-ghost" onClick={() => abrir(i)} disabled={busy}>Prontidão</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>

        {/* Prontidão + BOM */}
        {selected && (
          <>
            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Prontidão do item {selected.code} — {selected.description ?? ""}</span><div className="fsc-section-banner-line" /></div>
            {readiness && (
              <div className="fsc-card"><div className="fsc-card-body">
                <div className={`fsc-feedback ${readiness.ready ? "success" : "error"}`} style={{ marginBottom: 10 }}>
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

            <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Estrutura / BOM ({bom.length})</span><div className="fsc-section-banner-line" /></div>
            <div className="fsc-card"><div className="fsc-results-wrap">
              <table className="fsc-table">
                <thead><tr><th className="fsc-num">Pai</th><th className="fsc-num">Filho</th><th>Descrição</th><th className="fsc-num">Qtd</th><th className="fsc-num">% Perda</th></tr></thead>
                <tbody>
                  {bom.length === 0 && <tr><td colSpan={5} className="fsc-empty">Sem estrutura (item comprado/matéria-prima, ou sem BOM cadastrada).</td></tr>}
                  {bom.map((c, i) => <tr key={i}><td className="fsc-num">{c.parentCode}</td><td className="fsc-num">{c.childCode}</td><td>{c.childDescription}</td><td className="fsc-num">{c.quantity}</td><td className="fsc-num">{c.lossPercentage}</td></tr>)}
                </tbody>
              </table>
            </div></div>
          </>
        )}
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Itens: <strong>{items.length}</strong></div>{selected && <div className="fsc-footer-stat">Selecionado: <strong>{selected.code}</strong></div>}</div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}

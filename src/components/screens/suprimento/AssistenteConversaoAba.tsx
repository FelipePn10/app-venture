import { useEffect, useState } from "react";
import { aplicarConversao, simularConversao, type Formato, type MedidasDaPeca, type ResultadoAssistente } from "@/services/gestaoService";
import { Aviso, Kpis, Painel, Selo, Vazio } from "../planejamento/planUi";
import { num } from "../planejamento/planFormat";
import { useAcao } from "../planejamento/planHooks";

/**
 * Aba "Assistente por medidas" da VSUP0110: a partir das medidas da peça e do
 * material, calcula o peso e sugere as conversões UN↔KG, UN↔MM e UN↔M2 do
 * item — e o lote múltiplo que evita sobra fracionada no planejamento.
 * Simula primeiro; grava só o que for marcado.
 */
const FORMATOS: { id: Formato; rotulo: string; campos: (keyof MedidasDaPeca)[] }[] = [
  { id: "CHAPA", rotulo: "Chapa", campos: ["length_mm", "width_mm", "thickness_mm"] },
  { id: "BARRA_REDONDA", rotulo: "Barra redonda", campos: ["length_mm", "diameter_mm"] },
  { id: "BARRA_QUADRADA", rotulo: "Barra quadrada", campos: ["length_mm", "side_mm"] },
  { id: "BARRA_SEXTAVADA", rotulo: "Barra sextavada", campos: ["length_mm", "side_mm"] },
  { id: "TUBO_REDONDO", rotulo: "Tubo redondo", campos: ["length_mm", "diameter_mm", "thickness_mm"] },
  { id: "TUBO_RETANGULAR", rotulo: "Tubo retangular", campos: ["length_mm", "width_mm", "side_mm", "thickness_mm"] },
  { id: "KG_POR_METRO", rotulo: "Perfil (kg por metro)", campos: ["length_mm", "kg_per_meter"] },
];
const ROTULO: Partial<Record<keyof MedidasDaPeca, string>> = {
  length_mm: "Comprimento (mm)", width_mm: "Largura (mm)", thickness_mm: "Espessura / parede (mm)", diameter_mm: "Diâmetro externo (mm)",
  side_mm: "Lado / entre faces (mm)", kg_per_meter: "Peso por metro (kg/m)",
};
const MATERIAIS = [["ACO", "Aço carbono (7,85)"], ["INOX", "Inox (7,93)"], ["ALUMINIO", "Alumínio (2,70)"], ["LATAO", "Latão (8,50)"], ["COBRE", "Cobre (8,96)"], ["FERRO_FUNDIDO", "Ferro fundido (7,20)"]];
const chave = (s: { from_uom: string; to_uom: string }) => `${s.from_uom}>${s.to_uom}`;
const dec = (v?: string) => (v ?? "").replace(",", ".");

export function AssistenteConversaoAba({ item, onGravado }: { item: string; onGravado?: () => void }): JSX.Element {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [m, setM] = useState<MedidasDaPeca>({ item_code: item, shape: "CHAPA", material: "ACO", length_mm: "" });
  useEffect(() => { setM((x) => ({ ...x, item_code: item })); setRes(null); }, [item]);
  const [res, setRes] = useState<ResultadoAssistente | null>(null);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [lote, setLote] = useState(false);
  const formato = FORMATOS.find((f) => f.id === m.shape) ?? FORMATOS[0];
  const enviar = (): MedidasDaPeca => {
    const out: MedidasDaPeca = { ...m };
    for (const k of Object.keys(ROTULO) as (keyof MedidasDaPeca)[]) (out as unknown as Record<string, string | undefined>)[k] = formato.campos.includes(k) ? dec(m[k] as string) || undefined : undefined;
    if (m.density) out.density = dec(m.density);
    return out;
  };

  const simular = () => void run(async () => {
    if (!m.item_code) { setFeedback({ type: "error", message: "Escolha o item." }); return; }
    const r = await simularConversao(enviar()); setRes(r);
    setMarcadas(new Set(r.suggestions.filter((s) => !s.warning && s.current_factor === undefined).map(chave)));
    setLote(r.multiple_lot > 0);
  });
  const aplicar = () => void run(async () => {
    if (!marcadas.size && !lote) { setFeedback({ type: "error", message: "Marque ao menos uma sugestão para gravar." }); return; }
    const r = await aplicarConversao(enviar(), [...marcadas], lote); setRes(r);
    onGravado?.();
    setFeedback({ type: "success", message: `Gravado: ${r.suggestions.filter((s) => s.applied).map((s) => `${s.from_uom}→${s.to_uom}`).join(", ") || "nenhuma conversão"}${r.multiple_lot_applied ? " e o lote múltiplo" : ""}.` });
  });
  const set = (k: keyof MedidasDaPeca, v: string) => { setM((x) => ({ ...x, [k]: v })); setRes(null); };

  return (<>
            <div className="erp-fieldset"><div className="erp-fieldset-body">
              <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <button className="erp-btn erp-btn-primary" onClick={simular} disabled={busy}>Calcular</button>
                <button className="erp-btn" onClick={aplicar} disabled={busy || !res}>Gravar o que está marcado</button>
                <span className="erp-hint">Calcula o peso pelas medidas e sugere as conversões; nada é gravado até você marcar e clicar em gravar.</span>
              </div>
            </div></div>
            <Aviso feedback={feedback} busy={busy} />
            <div className="vpl-cols">
              <Painel titulo="A peça">
                <div className="erp-fieldset-body" style={{ padding: 0 }}>
                  <div className="erp-field erp-c6"><label className="erp-label" htmlFor="as-fmt">Formato</label>
                    <select id="as-fmt" className="erp-input" value={m.shape} onChange={(e) => set("shape", e.target.value)}>
                      {FORMATOS.map((f) => <option key={f.id} value={f.id}>{f.rotulo}</option>)}
                    </select></div>
                  {m.shape !== "KG_POR_METRO" && (
                    <div className="erp-field erp-c6"><label className="erp-label" htmlFor="as-mat">Material (g/cm³)</label>
                      <select id="as-mat" className="erp-input" value={m.material ?? ""} onChange={(e) => set("material", e.target.value)}>
                        {MATERIAIS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                        <option value="">Outro (informe a densidade)</option>
                      </select></div>
                  )}
                  {m.shape !== "KG_POR_METRO" && !m.material && (
                    <div className="erp-field erp-c6"><label className="erp-label erp-req" htmlFor="as-den">Densidade (g/cm³)</label>
                      <input id="as-den" className="erp-input" inputMode="decimal" value={m.density ?? ""} onChange={(e) => set("density", e.target.value)} /></div>
                  )}
                  {formato.campos.map((k) => (
                    <div key={k} className="erp-field erp-c6"><label className="erp-label erp-req" htmlFor={`as-${k}`}>{ROTULO[k]}</label>
                      <input id={`as-${k}`} className="erp-input" inputMode="decimal" value={(m[k] as string) ?? ""} onChange={(e) => set(k, e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") simular(); }} /></div>
                  ))}
                </div>
              </Painel>
              <Painel titulo="Resultado">
                {!res ? <Vazio titulo="Informe as medidas e calcule" texto="Nada é gravado até você marcar as sugestões e clicar em gravar." /> : (<>
                  <Kpis itens={[
                    { label: "Peso da peça", value: `${num(res.weight_kg, 4)} kg`, hint: res.formula, tom: "info" },
                    { label: "Lote múltiplo sugerido", value: res.multiple_lot > 0 ? num(res.multiple_lot, 0) : "—", hint: res.multiple_lot_explanation, tom: "info" },
                  ]} />
                  {res.suggestions.map((s) => (
                    <label key={chave(s)} className="vpl-record" style={{ cursor: "pointer" }}>
                      <input type="checkbox" checked={marcadas.has(chave(s))} onChange={() => setMarcadas((x) => { const n = new Set(x); if (n.has(chave(s))) n.delete(chave(s)); else n.add(chave(s)); return n; })} style={{ marginRight: 10 }} />
                      <div className="vpl-record-main">
                        <div className="vpl-record-title">1 {s.from_uom} = <strong>{num(s.factor, 6)}</strong> {s.to_uom} {s.applied && <Selo tom="ok">Gravada</Selo>}</div>
                        <div className="vpl-record-sub">{s.explanation}{s.current_factor !== undefined ? ` · hoje o item usa ${num(s.current_factor, 6)}` : " · o item ainda não tem esta conversão"}</div>
                        {s.warning && <div className="vpl-record-sub" style={{ color: "var(--v-warn, #b45309)" }}>{s.warning}</div>}
                      </div>
                    </label>
                  ))}
                  {res.multiple_lot > 0 && (
                    <label className="erp-check" style={{ marginTop: 8 }}><input type="checkbox" checked={lote} onChange={(e) => setLote(e.target.checked)} /> Gravar o lote múltiplo no planejamento do item</label>
                  )}
                </>)}
              </Painel>
            </div>
  </>);
}

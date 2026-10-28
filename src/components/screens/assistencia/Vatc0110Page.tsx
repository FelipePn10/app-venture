import { useCallback, useEffect, useState } from "react";
import { type PerfilPosVenda, listarPerfis, obterPerfil, salvarPerfil } from "@/services/posVendaService";
import { type LotMask, listLotMasks } from "@/services/lotMaskService";
import { errMessage } from "@/services/fiscalShared";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems } from "@/services/lookups";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

/**
 * VATC0110 — Pós-venda do Item. O que o pós-venda precisa saber de cada item:
 * se ele é rastreado por número de série (equipamento) e com que máscara a
 * série nasce na entrega da ordem de produção. Item sem série (peça sob
 * encomenda) segue rastreado pela nota e pelo lote.
 */
export function Vatc0110Page(): JSX.Element {
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const [perfis, setPerfis] = useState<PerfilPosVenda[]>([]);
  const [mascaras, setMascaras] = useState<LotMask[]>([]);
  const [item, setItem] = useState<string | undefined>();
  const VAZIO = { controla_serie: false, mascara_serie_id: "", observacoes: "", garantia_meses: "0", garantia_inicio: "VENDA" as "VENDA" | "INSTALACAO", cobre_pecas: true, cobre_mao_obra: true, cobre_deslocamento: false, dias_do_item: 0 };
  const [form, setForm] = useState(VAZIO);

  const recarregar = useCallback(async () => {
    try { setPerfis(await listarPerfis()); } catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar os perfis.") }); }
  }, []);
  useEffect(() => {
    void recarregar();
    listLotMasks(true).then(setMascaras).catch(() => setMascaras([]));
  }, [recarregar]);

  async function abrir(codigo?: string) {
    setItem(codigo); setFeedback(null);
    if (!codigo) { setForm(VAZIO); return; }
    setBusy(true);
    try {
      const p = await obterPerfil(codigo);
      const g = p.garantia;
      setForm({ controla_serie: p.controla_serie, mascara_serie_id: p.mascara_serie_id ? String(p.mascara_serie_id) : "", observacoes: p.observacoes ?? "",
        garantia_meses: String(g?.garantia_meses ?? 0), garantia_inicio: g?.garantia_inicio ?? "VENDA", cobre_pecas: g?.cobre_pecas ?? true,
        cobre_mao_obra: g?.cobre_mao_obra ?? true, cobre_deslocamento: g?.cobre_deslocamento ?? false, dias_do_item: g?.dias_do_item ?? 0 });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function gravar() {
    if (!item) { setFeedback({ type: "error", message: "Escolha o item." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const p = await salvarPerfil(item, { controla_serie: form.controla_serie, mascara_serie_id: form.mascara_serie_id ? Number(form.mascara_serie_id) : undefined, observacoes: form.observacoes || undefined,
        garantia_meses: Number(form.garantia_meses) || 0, garantia_inicio: form.garantia_inicio, cobre_pecas: form.cobre_pecas, cobre_mao_obra: form.cobre_mao_obra, cobre_deslocamento: form.cobre_deslocamento });
      await recarregar();
      setFeedback({ type: "success", message: p.controla_serie
        ? `Item ${p.item_codigo || item} passa a ser rastreado por número de série${p.mascara_serie_id ? ", gerado pela máscara na entrega da OF" : ": informe as séries na entrega da OF"}.`
        : `Item ${p.item_codigo || item} sem controle de série.` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const nomeMascara = (id?: number) => mascaras.find((m) => m.id === id)?.description ?? (id ? `máscara ${id}` : "—");

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Assistência</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Pós-venda do Item</span><span className="erp-crumb-code">VATC0110</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>
      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Consulta</span><button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Atualizar</button></div>
      </div>
      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
            <div className="erp-fieldset"><div className="erp-fieldset-head">Perfil de pós-venda</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c5"><label className="erp-label erp-req">Item</label>
                <LookupField<string> value={item} loader={loadItems} entityLabel="item" placeholder="Selecionar item" onChange={(c) => void abrir(c ?? undefined)} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">&nbsp;</label>
                <label className="erp-check"><input type="checkbox" checked={form.controla_serie} disabled={!item} onChange={(e) => setForm((f) => ({ ...f, controla_serie: e.target.checked }))} /> Controla número de série</label></div>
              <div className="erp-field erp-c4"><label className="erp-label">Máscara da série (VLOT0100)</label>
                <select className="erp-input" value={form.mascara_serie_id} disabled={!form.controla_serie} onChange={(e) => setForm((f) => ({ ...f, mascara_serie_id: e.target.value }))}>
                  <option value="">Sem máscara: a série é informada na entrega</option>
                  {mascaras.map((m) => <option key={m.id} value={m.id}>{m.description || `Máscara ${m.id}`}</option>)}
                </select></div>
              <div className="erp-field erp-c2"><label className="erp-label">Garantia (meses)</label>
                <input className="erp-input num" type="number" min={0} max={240} value={form.garantia_meses} disabled={!item} onChange={(e) => setForm((f) => ({ ...f, garantia_meses: e.target.value }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">A garantia conta</label>
                <select className="erp-input" value={form.garantia_inicio} disabled={!item} onChange={(e) => setForm((f) => ({ ...f, garantia_inicio: e.target.value as "VENDA" | "INSTALACAO" }))}>
                  <option value="VENDA">da venda (data da NF)</option><option value="INSTALACAO">da instalação (se registrada)</option></select></div>
              <div className="erp-field erp-c7"><label className="erp-label">Cobertura</label>
                <div style={{ display: "flex", gap: 16 }}>
                  <label className="erp-check"><input type="checkbox" checked={form.cobre_pecas} disabled={!item} onChange={(e) => setForm((f) => ({ ...f, cobre_pecas: e.target.checked }))} /> Peças</label>
                  <label className="erp-check"><input type="checkbox" checked={form.cobre_mao_obra} disabled={!item} onChange={(e) => setForm((f) => ({ ...f, cobre_mao_obra: e.target.checked }))} /> Mão de obra</label>
                  <label className="erp-check"><input type="checkbox" checked={form.cobre_deslocamento} disabled={!item} onChange={(e) => setForm((f) => ({ ...f, cobre_deslocamento: e.target.checked }))} /> Deslocamento do técnico</label>
                </div></div>
              {item && Number(form.garantia_meses) === 0 && (
                <div className="erp-field erp-c12"><small>{form.dias_do_item > 0 ? `Sem meses no perfil, vale o tempo de garantia do cadastro do item: ${form.dias_do_item} dias.` : "Sem prazo: o item não tem garantia."}</small></div>
              )}
              <div className="erp-field erp-c12"><label className="erp-label">Observações</label>
                <input className="erp-input" value={form.observacoes} disabled={!item} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} /></div>
              <div className="erp-field erp-c12" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="erp-btn erp-btn-primary" onClick={() => void gravar()} disabled={busy || !item}>Gravar perfil</button>
                <small>Com série, cada unidade entregue pela OF ganha um número; a NF de saída exige a série e a leva ao cliente (VATC0100 — Base Instalada).</small>
              </div>
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Itens com perfil — <span style={{ fontWeight: 400, opacity: 0.65 }}>{perfis.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
              <table className="erp-grid">
                <thead><tr><th>Item</th><th>Descrição</th><th>Número de série</th><th>Máscara</th><th>Garantia</th><th style={{ width: 80 }} /></tr></thead>
                <tbody>
                  {perfis.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum item com perfil de pós-venda.</td></tr>}
                  {perfis.map((p) => (
                    <tr key={p.item_code}><td style={{ fontWeight: 600 }}>{p.item_codigo || p.item_code}</td><td>{p.item_nome || "—"}</td>
                      <td><span className={`erp-badge ${p.controla_serie ? "erp-badge-green" : "erp-badge-gray"}`}>{p.controla_serie ? "Controla" : "Não controla"}</span></td>
                      <td>{p.controla_serie ? nomeMascara(p.mascara_serie_id) : "—"}</td>
                      <td>{p.garantia?.garantia_meses ? `${p.garantia.garantia_meses} meses da ${p.garantia.garantia_inicio === "INSTALACAO" ? "instalação" : "venda"}` : p.garantia?.dias_do_item ? `${p.garantia.dias_do_item} dias (cadastro do item)` : "sem garantia"}</td>
                      <td><button className="erp-btn erp-btn-sm" onClick={() => void abrir(p.item_codigo || String(p.item_code))}>Abrir</button></td></tr>
                  ))}
                </tbody>
              </table>
            </div></div></div>
          </div>
        </section>
      </div>
    </div>
  );
}

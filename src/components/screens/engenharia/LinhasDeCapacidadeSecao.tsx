import { useCallback, useEffect, useState } from "react";
import { listarLinhasDeCapacidade, salvarLinhaDeCapacidade, type LinhaDeCapacidade } from "@/services/deliveryPromiseService";
import { humanizeApiError } from "@/services/apiError";

const VAZIA: LinhaDeCapacidade = { code: 0, description: "", daily_capacity: 0, uom: "UN", is_active: true };

/**
 * Tanques / linhas de capacidade da promessa de entrega: pintura, galvanização,
 * montagem. O item aponta para uma delas (VENT0200 › Planejamento) e a ocupação
 * usa a capacidade diária cadastrada aqui.
 */
export function LinhasDeCapacidadeSecao(): JSX.Element {
  const [linhas, setLinhas] = useState<LinhaDeCapacidade[]>([]);
  const [form, setForm] = useState<LinhaDeCapacidade>(VAZIA);
  const [aviso, setAviso] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const carregar = useCallback(async () => { try { setLinhas(await listarLinhasDeCapacidade()); } catch (e) { setAviso({ tipo: "error", texto: humanizeApiError(e) }); } }, []);
  useEffect(() => { void carregar(); }, [carregar]);
  const gravar = async (l: LinhaDeCapacidade, msg: string) => {
    setBusy(true); setAviso(null);
    try { await salvarLinhaDeCapacidade(l); setForm(VAZIA); setAviso({ tipo: "success", texto: msg }); await carregar(); }
    catch (e) { setAviso({ tipo: "error", texto: humanizeApiError(e) }); } finally { setBusy(false); }
  };
  const proximo = linhas.reduce((m, l) => Math.max(m, l.code), 0) + 1;
  return (
    <div className="erp-fieldset" id="linhas-capacidade" style={{ marginTop: 16 }}>
      <div className="erp-fieldset-head">Tanques / linhas de capacidade</div>
      <div className="erp-fieldset-body">
        <div className="erp-field erp-c12"><small className="erp-hint">Cada linha tem a sua capacidade por dia. O item escolhe a linha em VENT0200 › Planejamento, e a ocupação da promessa de entrega usa esta capacidade.</small></div>
        {aviso && <div className={`erp-field erp-c12 erp-feedback ${aviso.tipo}`}>{aviso.texto}</div>}
        <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
          <table className="erp-grid">
            <thead><tr><th className="num">Código</th><th>Descrição</th><th className="num">Capacidade/dia</th><th>Unidade</th><th>Situação</th><th /></tr></thead>
            <tbody>
              {linhas.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhuma linha cadastrada.</td></tr>}
              {linhas.map((l) => (
                <tr key={l.code}>
                  <td className="num">{l.code}</td><td>{l.description}</td><td className="num">{l.daily_capacity.toLocaleString("pt-BR")}</td><td>{l.uom}</td>
                  <td>{l.is_active ? "Ativa" : "Desativada"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="erp-btn erp-btn-sm" onClick={() => setForm(l)}>Alterar</button>{" "}
                    <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => void gravar({ ...l, is_active: !l.is_active }, l.is_active ? "Linha desativada." : "Linha reativada.")}>{l.is_active ? "Desativar" : "Reativar"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label><input className="erp-input num" type="number" min={1} id="linha-codigo" value={form.code || ""} placeholder={String(proximo)} onChange={(e) => setForm((f) => ({ ...f, code: Number(e.target.value) }))} /></div>
        <div className="erp-field erp-c4"><label className="erp-label erp-req">Descrição</label><input className="erp-input" maxLength={120} id="linha-descricao" value={form.description} placeholder="Ex.: Linha de pintura a pó" onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
        <div className="erp-field erp-c2"><label className="erp-label erp-req">Capacidade por dia</label><input className="erp-input num" type="number" min={0} id="linha-capacidade" value={form.daily_capacity || ""} onChange={(e) => setForm((f) => ({ ...f, daily_capacity: Number(e.target.value) }))} /></div>
        <div className="erp-field erp-c2"><label className="erp-label">Unidade</label><input className="erp-input" maxLength={20} value={form.uom} onChange={(e) => setForm((f) => ({ ...f, uom: e.target.value.toUpperCase() }))} /></div>
        <div className="erp-field erp-c2" style={{ alignSelf: "end" }}>
          <button className="erp-btn erp-btn-primary" id="linha-gravar" disabled={busy} onClick={() => void gravar({ ...form, code: form.code || proximo }, "Linha gravada.")}>Gravar linha</button>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { getParametrosEstoque, listarMotivosDivergencia, listSituacoesLote, salvarMotivoDivergencia, salvarParametrosEstoque, salvarSituacaoLote, type MotivoDivergenciaDTO, type ParametrosEstoqueDTO, type SituacaoLoteDTO } from "@/services/stockService";
import { LookupField } from "@/components/ui/LookupField";
import { loadWarehouses } from "@/services/lookups";
import { ToleranciasPerfil } from "./ToleranciasPerfil";
import { useAcao } from "./comum";
import { FeedbackBox } from "./ui";

const VAZIA: SituacaoLoteDTO = { code: "", description: "", allows_issue: false, allows_transfer: true, counts_available: false, is_active: true };
const PARAM_VAZIO: ParametrosEstoqueDTO = { expired_lot_action: "BLOQUEAR", retroactive_months: "", tolerance_a: "", tolerance_b: "", tolerance_c: "", obsolete_days: "", obsolete_provision_pct: "", consignment_warehouse_id: "", consignment_days: "" };
const MOTIVO_VAZIO: MotivoDivergenciaDTO = { code: "", description: "", is_active: true };
const simNao = (v: boolean) => (v ? "Sim" : "Não");

/**
 * Situações de lote da empresa (quarentena, reprovado, reservado para cliente…)
 * e o que cada uma permite. Lote sem situação está liberado. A situação do lote
 * é trocada em VEST0100 › Lotes.
 */
export function SituacoesLoteAba() {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [lista, setLista] = useState<SituacaoLoteDTO[]>([]);
  const [f, setF] = useState<SituacaoLoteDTO>({ ...VAZIA });
  const [param, setParam] = useState<ParametrosEstoqueDTO>({ ...PARAM_VAZIO });
  const [motivos, setMotivos] = useState<MotivoDivergenciaDTO[]>([]);
  const [m, setM] = useState<MotivoDivergenciaDTO>({ ...MOTIVO_VAZIO });
  const setP = <K extends keyof ParametrosEstoqueDTO>(k: K, v: ParametrosEstoqueDTO[K]) => setParam((p) => ({ ...p, [k]: v }));
  const set = <K extends keyof SituacaoLoteDTO>(k: K, v: SituacaoLoteDTO[K]) => setF((p) => ({ ...p, [k]: v }));

  const carregar = useCallback(() => run(async () => {
    setLista(await listSituacoesLote());
    setParam(await getParametrosEstoque());
    setMotivos(await listarMotivosDivergencia());
  }), [run]);
  useEffect(() => { void carregar(); }, [carregar]);

  const salvar = () => run(async () => {
    if (!f.code.trim() || !f.description.trim()) { setFeedback({ type: "error", message: "Código e descrição são obrigatórios." }); return; }
    await salvarSituacaoLote(f);
    setF({ ...VAZIA }); setLista(await listSituacoesLote());
    setFeedback({ type: "success", message: "Situação salva." });
  });
  const salvarParametros = () => run(async () => {
    await salvarParametrosEstoque(param);
    setFeedback({ type: "success", message: "Parâmetros de estoque salvos." });
  });
  const salvarMotivo = () => run(async () => {
    if (!m.code.trim() || !m.description.trim()) { setFeedback({ type: "error", message: "Código e descrição são obrigatórios." }); return; }
    await salvarMotivoDivergencia(m);
    setM({ ...MOTIVO_VAZIO }); setMotivos(await listarMotivosDivergencia());
    setFeedback({ type: "success", message: "Motivo salvo." });
  });
  const campo = (k: keyof ParametrosEstoqueDTO, rotulo: string, dica?: string) => (
    <div className="erp-field erp-c2"><label className="erp-label">{rotulo}</label>
      <input className="erp-input num" value={param[k]} onChange={(e) => setP(k, e.target.value as never)} />{dica && <span className="erp-field-hint">{dica}</span>}</div>
  );
  const marca = (k: "allows_issue" | "allows_transfer" | "counts_available" | "is_active", rotulo: string) => (
    <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={f[k]} onChange={(e) => set(k, e.target.checked)} /> {rotulo}</label>
  );

  return (<>
    <FeedbackBox feedback={feedback} />
    <div className="erp-fieldset"><div className="erp-fieldset-head">Parâmetros de estoque</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c6"><label className="erp-label">O que fazer com o lote vencido</label>
        <select className="erp-input" value={param.expired_lot_action} onChange={(e) => setP("expired_lot_action", e.target.value as ParametrosEstoqueDTO["expired_lot_action"])}>
          <option value="BLOQUEAR">Bloquear a saída e tirar do disponível</option><option value="AVISAR">Permitir a saída</option></select>
        <span className="erp-field-hint">Com o bloqueio, o descarte é feito por ajuste e a transferência para a quarentena continua permitida.</span></div>
      {campo("retroactive_months", "Meses retroativos", "Vazio não limita; 0 só aceita o mês atual.")}
      {campo("tolerance_a", "Tolerância classe A (%)")}{campo("tolerance_b", "Tolerância classe B (%)")}{campo("tolerance_c", "Tolerância classe C (%)", "Vale para acuracidade e inventário sem tolerância própria.")}
      {campo("obsolete_days", "Obsoleto após (dias)")}{campo("obsolete_provision_pct", "Provisão (% do valor)", "Base do valor em risco em Análises e do lançamento no fechamento.")}
      <div className="erp-field erp-c4"><label className="erp-label">Almoxarifado de consignação</label>
        <LookupField value={param.consignment_warehouse_id || undefined} loader={loadWarehouses} entityLabel="almoxarifado" onChange={(c) => setP("consignment_warehouse_id", String(c ?? ""))} />
        <span className="erp-field-hint">Sem disponibilidade: a mercadoria com o cliente não entra na promessa.</span></div>
      {campo("consignment_days", "Prazo da consignação (dias)", "Vazio não controla vencimento.")}
      <div className="erp-field erp-c2" style={{ alignSelf: "center" }}><button className="erp-btn erp-btn-primary" onClick={salvarParametros} disabled={busy}>Salvar parâmetros</button></div>
    </div></div>
    <ToleranciasPerfil />
    <div className="erp-fieldset"><div className="erp-fieldset-head">Motivos de divergência ({motivos.length})</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label><input className="erp-input" maxLength={20} value={m.code} onChange={(e) => setM((p) => ({ ...p, code: e.target.value }))} /></div>
      <div className="erp-field erp-c6"><label className="erp-label erp-req">Descrição</label><input className="erp-input" maxLength={120} placeholder="Erro de contagem" value={m.description} onChange={(e) => setM((p) => ({ ...p, description: e.target.value }))} /></div>
      <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={m.is_active} onChange={(e) => setM((p) => ({ ...p, is_active: e.target.checked }))} /> Ativo</label></div>
      <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={salvarMotivo} disabled={busy}>Salvar motivo</button></div>
      <div className="erp-field erp-c12"><table className="erp-grid">
        <thead><tr><th>Código</th><th>Descrição</th><th>Ativo</th><th></th></tr></thead>
        <tbody>
          {motivos.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhum motivo cadastrado. O motivo do acerto segue livre.</td></tr>}
          {motivos.map((x) => <tr key={x.code}><td><strong>{x.code}</strong></td><td>{x.description}</td><td>{simNao(x.is_active)}</td><td><button className="erp-btn erp-btn-sm" onClick={() => setM({ ...x })}>Editar</button></td></tr>)}
        </tbody>
      </table></div>
    </div></div>
    <div className="erp-fieldset"><div className="erp-fieldset-head">{lista.some((s) => s.code === f.code) ? "Alterar situação" : "Nova situação"}</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label><input className="erp-input" maxLength={20} value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} /></div>
      <div className="erp-field erp-c4"><label className="erp-label erp-req">Descrição</label><input className="erp-input" placeholder="Em quarentena" value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
      <div className="erp-field erp-c4" style={{ gap: 4 }}>{marca("allows_issue", "Permite saída")}{marca("allows_transfer", "Permite transferência")}{marca("counts_available", "Conta no disponível para venda")}{marca("is_active", "Ativa")}</div>
      <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={salvar} disabled={busy}>Salvar situação</button></div>
    </div></div>
    <div className="erp-fieldset"><div className="erp-fieldset-head">Situações ({lista.length})</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
      <table className="erp-grid">
        <thead><tr><th>Código</th><th>Descrição</th><th>Saída</th><th>Transferência</th><th>No disponível</th><th>Ativa</th><th></th></tr></thead>
        <tbody>
          {lista.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhuma situação. Sem situação, todo lote está liberado.</td></tr>}
          {lista.map((s) => <tr key={s.code}><td><strong>{s.code}</strong></td><td>{s.description}</td><td>{simNao(s.allows_issue)}</td><td>{simNao(s.allows_transfer)}</td><td>{simNao(s.counts_available)}</td><td>{simNao(s.is_active)}</td>
            <td><button className="erp-btn erp-btn-sm" onClick={() => setF({ ...s })} disabled={busy}>Alterar</button></td></tr>)}
        </tbody>
      </table>
    </div></div></div>
  </>);
}

import { useCallback, useEffect, useState } from "react";
import { errMessage } from "@/services/fiscalShared";
import { createApprovalLimit, listApprovalLimits } from "@/services/procurementService";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadSuppliers } from "@/services/lookups";
import { hojeLocal } from "@/utils/dataLocal";
import { useAuthStore } from "@/store/authStore";

/*
 * Alçadas de aprovação do pedido de compra (aba da VPCT0100 — Parâmetros de
 * Compras). É a regra que a aprovação do pedido consulta: até "aprova sozinho"
 * o pedido passa, acima precisa da autorização superior, acima de "bloqueia" nem
 * ela libera. Vale a do fornecedor; sem ela, a geral. A regra mais nova vigente
 * substitui a anterior. Era a rotina genérica VSUP0610.
 */

interface Alcada { id: number; scope: string; scope_ref?: string; currency: string; auto_approve_max: string; block_above?: string; valid_from: string; valid_to?: string; notes?: string; is_active: boolean }
const brl = (v?: string) => (v === undefined || v === "" ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

export function AlcadasCompraPanel(): JSX.Element {
  const isAdmin = useAuthStore((s) => s.user?.role?.toUpperCase() === "ADMIN");
  const [lista, setLista] = useState<Alcada[]>([]);
  const [form, setForm] = useState({ fornecedor: undefined as number | undefined, aprova: "", bloqueia: "", de: hojeLocal(), ate: "", obs: "" });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const carregar = useCallback(async () => {
    setLista((await listApprovalLimits()).map((o) => ({
      id: Number(o.id), scope: String(o.scope ?? ""), scope_ref: o.scope_ref ? String(o.scope_ref) : undefined, currency: String(o.currency ?? "BRL"),
      auto_approve_max: String(o.auto_approve_max ?? "0"), block_above: o.block_above != null ? String(o.block_above) : undefined,
      valid_from: String(o.valid_from ?? "").slice(0, 10), valid_to: o.valid_to ? String(o.valid_to).slice(0, 10) : undefined,
      notes: o.notes ? String(o.notes) : undefined, is_active: o.is_active !== false,
    })));
  }, []);
  useEffect(() => { void carregar().catch((e) => setFeedback({ type: "error", message: errMessage(e) })); }, [carregar]);

  const gravar = async () => {
    const aprova = form.aprova.replace(",", ".").trim(); const bloqueia = form.bloqueia.replace(",", ".").trim();
    if (!aprova || Number.isNaN(Number(aprova))) { setFeedback({ type: "error", message: "Informe até quanto o pedido aprova sozinho." }); return; }
    if (bloqueia && Number(bloqueia) < Number(aprova)) { setFeedback({ type: "error", message: "O valor de bloqueio não pode ser menor que o de aprovação automática." }); return; }
    setBusy(true); setFeedback(null);
    try {
      await createApprovalLimit({
        scope: form.fornecedor ? "SUPPLIER" : "GLOBAL", scope_ref: form.fornecedor ? String(form.fornecedor) : null, currency: "BRL",
        auto_approve_max: aprova, block_above: bloqueia || null, valid_from: form.de, valid_to: form.ate || null, notes: form.obs.trim() || null,
      });
      setForm({ fornecedor: undefined, aprova: "", bloqueia: "", de: hojeLocal(), ate: "", obs: "" });
      await carregar(); setFeedback({ type: "success", message: "Alçada gravada. Ela passa a valer para os pedidos aprovados daqui em diante." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  };

  return (
    <div className="erp-detail-body">
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
      <div className="erp-fieldset"><div className="erp-fieldset-head">Nova alçada</div><div className="erp-fieldset-body">
        <div className="erp-field erp-c4"><label className="erp-label">Fornecedor</label><LookupField value={form.fornecedor} loader={loadSuppliers} entityLabel="fornecedor" clearable placeholder="Todos (alçada geral)" onChange={(c) => setForm((f) => ({ ...f, fornecedor: c ? Number(c) : undefined }))} /></div>
        <div className="erp-field erp-c2"><label className="erp-label erp-req">Aprova sozinho até (R$)</label><input className="erp-input num" inputMode="decimal" value={form.aprova} onChange={(e) => setForm((f) => ({ ...f, aprova: e.target.value }))} /></div>
        <div className="erp-field erp-c2"><label className="erp-label">Bloqueia acima de (R$)</label><input className="erp-input num" inputMode="decimal" value={form.bloqueia} onChange={(e) => setForm((f) => ({ ...f, bloqueia: e.target.value }))} /></div>
        <div className="erp-field erp-c2"><label className="erp-label">Vale de</label><input className="erp-input" type="date" value={form.de} onChange={(e) => setForm((f) => ({ ...f, de: e.target.value }))} /></div>
        <div className="erp-field erp-c2"><label className="erp-label">Até</label><input className="erp-input" type="date" value={form.ate} onChange={(e) => setForm((f) => ({ ...f, ate: e.target.value }))} /></div>
        <div className="erp-field erp-c9"><label className="erp-label">Observação</label><input className="erp-input" value={form.obs} onChange={(e) => setForm((f) => ({ ...f, obs: e.target.value }))} /></div>
        <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void gravar()} disabled={busy || !isAdmin} title={isAdmin ? undefined : "Somente o administrador cadastra alçadas"}>Gravar alçada</button></div>
        <div className="erp-field erp-c12"><span className="erp-field-hint">Pedido até o valor de aprovação passa direto; acima, precisa da autorização superior; acima do bloqueio, nem ela libera. Sem alçada cadastrada, o pedido aprova sem controle.</span></div>
      </div></div>
      <div className="erp-fieldset"><div className="erp-fieldset-head">Alçadas cadastradas <span className="erp-count">{lista.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
        <table className="erp-grid">
          <thead><tr><th>Vale para</th><th className="num">Aprova sozinho até</th><th className="num">Bloqueia acima de</th><th>Vigência</th><th>Observação</th></tr></thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhuma alçada: os pedidos aprovam sem controle de valor.</td></tr>}
            {lista.map((a) => (
              <tr key={a.id}>
                <td>{a.scope === "SUPPLIER" && a.scope_ref ? <EntityName code={Number(a.scope_ref)} loader={loadSuppliers} showCode={false} /> : a.scope === "GLOBAL" ? "Todos os fornecedores" : `${a.scope} ${a.scope_ref ?? ""}`}</td>
                <td className="num">{brl(a.auto_approve_max)}</td><td className="num">{brl(a.block_above)}</td>
                <td>{a.valid_from.split("-").reverse().join("/")}{a.valid_to ? ` a ${a.valid_to.split("-").reverse().join("/")}` : " em diante"}</td>
                <td>{a.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div></div>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { type RestrictionReason, listRestrictionReasons, createRestrictionReason, updateRestrictionReason, deleteRestrictionReason } from "@/services/restrictionReasonService";
import { type Restriction, listRestrictionsByCustomer } from "@/services/configuratorRestrictionService";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { confirmar } from "@/components/ui/dialogos";
import { loadCustomers, loadItems } from "@/services/lookups";
import { errMessage } from "@/services/fiscalShared";

type Aviso = (tipo: "success" | "error", msg: string) => void;

/*
 * Cadastro de apoio da aba Restrições da VCFG0100: os motivos de restrição (era a
 * VRES0100). Renomear, inativar ou excluir; incluir continua no próprio formulário
 * da regra.
 */
export function MotivosRestricaoPanel({ aviso, onMudou }: { aviso: Aviso; onMudou: () => void }): JSX.Element {
  const [lista, setLista] = useState<RestrictionReason[]>([]);
  const [edit, setEdit] = useState<RestrictionReason | null>(null);
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { aviso("error", errMessage(e)); } finally { setBusy(false); } }, [aviso]);
  const carregar = useCallback(() => run(async () => { setLista(await listRestrictionReasons()); }), [run]);
  useEffect(() => { void carregar(); }, [carregar]);

  const gravar = () => run(async () => {
    if (!edit || !edit.description.trim()) { aviso("error", "Descreva o motivo."); return; }
    if (edit.code) await updateRestrictionReason(edit.code, { ...edit, description: edit.description.trim() });
    else await createRestrictionReason({ ...edit, description: edit.description.trim() });
    setEdit(null); setLista(await listRestrictionReasons()); onMudou(); aviso("success", "Motivo gravado.");
  });
  const excluir = async (m: RestrictionReason) => {
    if (!m.code || !(await confirmar({ titulo: "Excluir motivo", mensagem: "Regras que usam o motivo ficam sem ele. Para só tirar da lista, inative.", assunto: m.description, rotulo: "Excluir", tom: "perigo" }))) return;
    void run(async () => { await deleteRestrictionReason(m.code!); setLista(await listRestrictionReasons()); onMudou(); });
  };

  return (
    <div className="erp-fieldset"><div className="erp-fieldset-head">Motivos de restrição <span className="erp-count">{lista.length}</span></div><div className="erp-fieldset-body">
      {edit && <>
        <div className="erp-field erp-c7"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
        <div className="erp-field erp-c2"><label className="erp-label">Situação</label><select className="erp-input" value={edit.situation} onChange={(e) => setEdit({ ...edit, situation: e.target.value })}><option value="ACTIVE">Ativo</option><option value="INACTIVE">Inativo</option></select></div>
        <div className="erp-field erp-c3 cfgw-actions" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={() => void gravar()} disabled={busy}>Gravar</button><button className="erp-btn" onClick={() => setEdit(null)} disabled={busy}>Cancelar</button></div>
      </>}
      <div className="erp-field erp-c12"><table className="erp-grid">
        <thead><tr><th>Motivo</th><th style={{ width: 90 }}>Situação</th><th style={{ width: 150 }} /></tr></thead>
        <tbody>
          {lista.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhum motivo.</td></tr>}
          {lista.map((m) => <tr key={m.code}><td>{m.description}</td><td>{m.situation === "INACTIVE" || m.situation === "INATIVO" ? "Inativo" : "Ativo"}</td>
            <td className="cfgw-rowactions"><button className="erp-btn erp-btn-sm" onClick={() => setEdit({ ...m })} disabled={busy}>Editar</button><button className="erp-btn erp-btn-sm erp-btn-danger" onClick={() => void excluir(m)} disabled={busy}>Excluir</button></td></tr>)}
        </tbody>
      </table>
      {!edit && <button className="erp-btn erp-btn-sm" style={{ marginTop: 6 }} onClick={() => setEdit({ description: "", situation: "ACTIVE" })}>+ Motivo</button>}</div>
    </div></div>
  );
}

/* Consulta das restrições de venda de um cliente (era a VCLI0117). */
export function RestricoesDoClientePanel({ aviso }: { aviso: Aviso }): JSX.Element {
  const [cliente, setCliente] = useState<number | undefined>();
  const [regras, setRegras] = useState<Restriction[] | null>(null);
  const escolher = (c?: number) => {
    setCliente(c); setRegras(null);
    if (c) listRestrictionsByCustomer(c).then(setRegras).catch((e) => aviso("error", errMessage(e)));
  };
  return (
    <div className="erp-fieldset"><div className="erp-fieldset-head">Restrições de um cliente</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c6"><label className="erp-label">Cliente</label><LookupField value={cliente} loader={loadCustomers} entityLabel="cliente" clearable onChange={(c) => escolher(c ? Number(c) : undefined)} /></div>
      {regras && <div className="erp-field erp-c12"><table className="erp-grid">
        <thead><tr><th>Regra</th><th>Item</th><th>Situação</th></tr></thead>
        <tbody>
          {regras.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhuma restrição própria deste cliente.</td></tr>}
          {regras.map((r) => <tr key={r.code}><td>{r.code}</td><td>{r.item_code ? <EntityName code={String(r.item_code)} loader={loadItems} /> : "—"}</td><td>{r.situation === "ACTIVE" ? "Ativa" : "Inativa"}</td></tr>)}
        </tbody>
      </table><span className="cfgw-hint">Para ver ou mudar as condições, escolha o item no topo desta aba.</span></div>}
    </div></div>
  );
}

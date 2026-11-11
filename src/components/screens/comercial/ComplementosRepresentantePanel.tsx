import { useEffect, useState } from "react";
import { type RepresentativeDTO, addRepresentativeFolder, listInterestClassifications, listRepresentativeSalesPlans } from "@/services/representativeService";
import { errMessage, type Obj } from "@/services/fiscalShared";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadMarketSegments } from "@/services/lookups";

/*
 * Aba Complementos do representante na VVND0400 (era a VREP0600): segmentos de
 * mercado, planos de venda, interesses (classificações de item), endereços de
 * correspondência e as contas da contabilização da comissão.
 */
type Aviso = (f: { type: "success" | "error"; message: string }) => void;

export function ComplementosRepresentantePanel({ rep, aoMudar, aviso }: { rep: RepresentativeDTO; aoMudar: () => Promise<void>; aviso: Aviso }): JSX.Element {
  const code = rep.code!;
  const [planos, setPlanos] = useState<number[]>([]);
  const [classes, setClasses] = useState<{ code: number; description: string }[]>([]);
  const [segmento, setSegmento] = useState<number | undefined>();
  const [plano, setPlano] = useState("");
  const [interesse, setInteresse] = useState("");
  const [end, setEnd] = useState({ postal_code: "", street: "", street_number: "", district: "", city: "", state: "", is_default: false });
  const [conta, setConta] = useState({ event_type: "GENERATED", debit_account_code: "", debit_cost_center_code: "", credit_account_code: "", credit_cost_center_code: "", history_code: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listRepresentativeSalesPlans().then(setPlanos).catch(() => setPlanos([]));
    listInterestClassifications().then(setClasses).catch(() => setClasses([]));
  }, []);

  const incluir = async (pasta: Parameters<typeof addRepresentativeFolder>[0], corpo: Obj, ok: string) => {
    setBusy(true);
    try { await addRepresentativeFolder(pasta, { representative_code: code, is_active: true, ...corpo }); await aoMudar(); aviso({ type: "success", message: ok }); }
    catch (e) { aviso({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  };
  const num = (v: string) => (v.trim() ? Number(v) : null);

  return (
    <>
      <div className="erp-fieldset"><div className="erp-fieldset-head">Segmentos de mercado</div><div className="erp-fieldset-body">
        <div className="erp-field erp-c6"><LookupField value={segmento} loader={loadMarketSegments} entityLabel="segmento" clearable onChange={(c) => setSegmento(c ? Number(c) : undefined)} /></div>
        <div className="erp-field erp-c2"><button className="erp-btn erp-btn-primary" disabled={busy || !segmento} onClick={() => void incluir("segments", { market_segment_code: segmento }, "Segmento vinculado.").then(() => setSegmento(undefined))}>Vincular</button></div>
        <div className="erp-field erp-c12">{rep.segments?.length ? rep.segments.map((s) => <span key={s.id} className="erp-badge" style={{ marginRight: 6 }}><EntityName code={s.market_segment_code} loader={loadMarketSegments} showCode={false} /></span>) : <span className="erp-hint">Nenhum segmento.</span>}</div>
      </div></div>

      <div className="erp-fieldset"><div className="erp-fieldset-head">Planos de venda e interesses</div><div className="erp-fieldset-body">
        <div className="erp-field erp-c3"><label className="erp-label">Plano de venda (código)</label><input className="erp-input num" inputMode="numeric" list="rep-planos" value={plano} onChange={(e) => setPlano(e.target.value)} /><datalist id="rep-planos">{planos.map((p) => <option key={p} value={p} />)}</datalist></div>
        <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn" disabled={busy || !Number(plano)} onClick={() => void incluir("sales-plans", { sales_plan_code: Number(plano) }, "Plano de venda vinculado.").then(() => setPlano(""))}>Vincular plano</button></div>
        <div className="erp-field erp-c4"><label className="erp-label">Interesse (classificação de item)</label>
          {classes.length ? <select className="erp-input" value={interesse} onChange={(e) => setInteresse(e.target.value)}><option value="">Escolha…</option>{classes.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.description}</option>)}</select>
            : <input className="erp-input num" inputMode="numeric" placeholder="Código da classificação" value={interesse} onChange={(e) => setInteresse(e.target.value)} />}</div>
        <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn" disabled={busy || !Number(interesse)} onClick={() => void incluir("interests", { item_classification_code: Number(interesse) }, "Interesse vinculado.").then(() => setInteresse(""))}>Vincular interesse</button></div>
        <div className="erp-field erp-c12"><span className="erp-hint">Planos: {rep.sales_plans?.length ? rep.sales_plans.map((p) => p.sales_plan_code).join(", ") : "nenhum"} · Interesses: {rep.interests?.length ? rep.interests.map((i) => classes.find((c) => c.code === i.item_classification_code)?.description ?? i.item_classification_code).join(", ") : "nenhum"}</span></div>
      </div></div>

      <div className="erp-fieldset"><div className="erp-fieldset-head">Endereços de correspondência</div><div className="erp-fieldset-body">
        <div className="erp-field erp-c2"><label className="erp-label">CEP</label><input className="erp-input" value={end.postal_code} onChange={(e) => setEnd((x) => ({ ...x, postal_code: e.target.value.replace(/\D/g, "") }))} /></div>
        <div className="erp-field erp-c5"><label className="erp-label erp-req">Logradouro</label><input className="erp-input" value={end.street} onChange={(e) => setEnd((x) => ({ ...x, street: e.target.value }))} /></div>
        <div className="erp-field erp-c1"><label className="erp-label">Nº</label><input className="erp-input" value={end.street_number} onChange={(e) => setEnd((x) => ({ ...x, street_number: e.target.value }))} /></div>
        <div className="erp-field erp-c4"><label className="erp-label">Bairro</label><input className="erp-input" value={end.district} onChange={(e) => setEnd((x) => ({ ...x, district: e.target.value }))} /></div>
        <div className="erp-field erp-c4"><label className="erp-label erp-req">Cidade</label><input className="erp-input" value={end.city} onChange={(e) => setEnd((x) => ({ ...x, city: e.target.value }))} /></div>
        <div className="erp-field erp-c1"><label className="erp-label erp-req">UF</label><input className="erp-input" maxLength={2} value={end.state} onChange={(e) => setEnd((x) => ({ ...x, state: e.target.value.toUpperCase() }))} /></div>
        <div className="erp-field erp-c3"><label className="erp-check" style={{ marginTop: 22 }}><input type="checkbox" checked={end.is_default} onChange={(e) => setEnd((x) => ({ ...x, is_default: e.target.checked }))} /> Principal</label></div>
        <div className="erp-field erp-c4" style={{ justifyContent: "flex-end" }}><button className="erp-btn" disabled={busy || !end.street.trim() || !end.city.trim() || end.state.length !== 2}
          onClick={() => void incluir("correspondence-addresses", { ...end }, "Endereço incluído.").then(() => setEnd({ postal_code: "", street: "", street_number: "", district: "", city: "", state: "", is_default: false }))}>Incluir endereço</button></div>
        <div className="erp-field erp-c12">{rep.correspondence_addresses?.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{rep.correspondence_addresses.map((a) => <li key={a.id}>{a.full_address || [a.street, a.street_number, a.district, a.city && `${a.city}/${a.state}`].filter(Boolean).join(", ")}{a.is_default ? " (principal)" : ""}</li>)}</ul> : <span className="erp-hint">Nenhum endereço de correspondência.</span>}</div>
      </div></div>

      <div className="erp-fieldset"><div className="erp-fieldset-head">Contabilização da comissão (da empresa atual)</div><div className="erp-fieldset-body">
        <div className="erp-field erp-c3"><label className="erp-label">Evento</label><select className="erp-input" value={conta.event_type} onChange={(e) => setConta((c) => ({ ...c, event_type: e.target.value }))}><option value="GENERATED">Comissão gerada</option><option value="REVERSED">Comissão estornada</option></select></div>
        <div className="erp-field erp-c2"><label className="erp-label">Conta débito</label><input className="erp-input num" inputMode="numeric" value={conta.debit_account_code} onChange={(e) => setConta((c) => ({ ...c, debit_account_code: e.target.value }))} /></div>
        <div className="erp-field erp-c2"><label className="erp-label">C. custo débito</label><input className="erp-input num" inputMode="numeric" value={conta.debit_cost_center_code} onChange={(e) => setConta((c) => ({ ...c, debit_cost_center_code: e.target.value }))} /></div>
        <div className="erp-field erp-c2"><label className="erp-label">Conta crédito</label><input className="erp-input num" inputMode="numeric" value={conta.credit_account_code} onChange={(e) => setConta((c) => ({ ...c, credit_account_code: e.target.value }))} /></div>
        <div className="erp-field erp-c2"><label className="erp-label">C. custo crédito</label><input className="erp-input num" inputMode="numeric" value={conta.credit_cost_center_code} onChange={(e) => setConta((c) => ({ ...c, credit_cost_center_code: e.target.value }))} /></div>
        <div className="erp-field erp-c1"><label className="erp-label">Histórico</label><input className="erp-input num" inputMode="numeric" value={conta.history_code} onChange={(e) => setConta((c) => ({ ...c, history_code: e.target.value }))} /></div>
        <div className="erp-field erp-c12" style={{ justifyContent: "flex-end" }}><button className="erp-btn" disabled={busy}
          onClick={() => void incluir("accounting", { event_type: conta.event_type, debit_account_code: num(conta.debit_account_code), debit_cost_center_code: num(conta.debit_cost_center_code), credit_account_code: num(conta.credit_account_code), credit_cost_center_code: num(conta.credit_cost_center_code), history_code: num(conta.history_code) }, "Contabilização gravada.")}>Gravar contabilização</button></div>
        <div className="erp-field erp-c12"><span className="erp-hint">As contas da comissão gerada aparecem no relatório de representantes.</span></div>
      </div></div>
    </>
  );
}

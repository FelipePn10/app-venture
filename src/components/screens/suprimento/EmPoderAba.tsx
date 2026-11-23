import { useCallback, useEffect, useMemo, useState } from "react";
import { emPoderDeTerceiros, gerarNFeRemessa, type EmPoder, type NFeRemessaDTO } from "@/services/gestaoService";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadSuppliers } from "@/services/lookups";
import { useAuthStore } from "@/store/authStore";
import { Aviso, Kpis, Painel, Selo, Vazio } from "../planejamento/planUi";
import { data, hojeISO, num } from "../planejamento/planFormat";
import { useAcao } from "../planejamento/planHooks";
import { reais } from "../gestao/gestaoFmt";

/**
 * Aba "Em poder de terceiros" da VTPS0100: o que as ordens de serviço deixaram com
 * cada fornecedor (industrialização por encomenda), com valor, dias fora e o
 * prazo legal de retorno (180 dias). Daqui sai a NF-e de remessa (CFOP 5901/6901)
 * da OS; o retorno (5902) entra pela nota do fornecedor.
 */
const NOVA: NFeRemessaDTO = { quantity: "", data_emissao: hojeISO(), serie: "1" };

export function EmPoderAba({ onAbrirOrdens }: { onAbrirOrdens?: () => void }): JSX.Element {
  const { busy, feedback, setFeedback, run } = useAcao();
  const admin = (useAuthStore((s) => s.user?.role) ?? "").toUpperCase() === "ADMIN";
  const [fornecedor, setFornecedor] = useState<number | undefined>();
  const [soVencidos, setSoVencidos] = useState(false);
  const [linhas, setLinhas] = useState<EmPoder[] | null>(null);
  const [sel, setSel] = useState<EmPoder | null>(null);
  const [form, setForm] = useState<NFeRemessaDTO>(NOVA);

  const carregar = useCallback(async () => { setLinhas(await emPoderDeTerceiros({ supplier_code: fornecedor, only_overdue: soVencidos })); }, [fornecedor, soVencidos]);
  useEffect(() => { void run(carregar); }, [run, carregar]);

  const porFornecedor = useMemo(() => {
    const m = new Map<number, { nome: string; itens: EmPoder[] }>();
    for (const l of linhas ?? []) { const g = m.get(l.supplier_code) ?? { nome: l.supplier_name, itens: [] }; g.itens.push(l); m.set(l.supplier_code, g); }
    return [...m.entries()];
  }, [linhas]);
  const total = (linhas ?? []).reduce((t, l) => t + l.value, 0);
  const vencidas = (linhas ?? []).filter((l) => l.overdue).length;
  const prazoLegal = (linhas ?? []).filter((l) => l.legal_deadline_near || l.legal_deadline_passed).length;

  const emitir = () => sel && void run(async () => {
    if (!form.quantity || Number(form.quantity.replace(",", ".")) <= 0) { setFeedback({ type: "error", message: "Informe a quantidade remetida." }); return; }
    const nf = await gerarNFeRemessa(sel.service_order_id, { ...form, quantity: form.quantity.replace(",", "."), unit_value: form.unit_value?.replace(",", ".") || undefined });
    setFeedback({ type: "success", message: `NF-e de remessa ${nf.numero_nf ?? nf.id} criada como rascunho. Confira e transmita na VFIS0200.` });
    setSel(null); setForm(NOVA); await carregar();
  });

  return (<>
            <div className="erp-fieldset"><div className="erp-fieldset-body">
              <div className="erp-field erp-c5"><label className="erp-label">Fornecedor</label>
                <LookupField value={fornecedor} loader={loadSuppliers} entityLabel="fornecedor" clearable placeholder="Todos" onChange={(c) => setFornecedor(c ? Number(c) : undefined)} /></div>
              <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}>
                <label className="erp-check"><input type="checkbox" checked={soVencidos} onChange={(e) => setSoVencidos(e.target.checked)} /> Só os atrasados</label></div>
              <div className="erp-field erp-c4" style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "flex-end" }}>
                <ExportButton title="VTPS0100 — Em poder de terceiros" filename="vtps0100-em-poder" build={() => ({
          columns: ["Fornecedor", "OS", "OF", "Item", "Remetido", "Retornado", "Com o terceiro", "Valor", "1ª remessa", "Previsto", "Dias fora", "Prazo legal"],
          rows: (linhas ?? []).map((l) => [`${l.supplier_code} ${l.supplier_name}`, String(l.service_order_code), String(l.production_order_id), `${l.item_business_code || l.item_code} ${l.item_name}`,
            num(l.remitted), num(l.returned + l.received), num(l.in_hands), num(l.value), data(l.first_remittance), data(l.due_date), String(l.days_in_hands), data(l.legal_deadline)]),
        })} /></div>
            </div></div>
            <Aviso feedback={feedback} busy={busy} />
            <Kpis itens={[
              { label: "Valor com terceiros", value: reais(total), hint: "pelo custo médio do item", tom: "info" },
              { label: "OS atrasadas", value: String(vencidas), hint: "passaram da data prevista", tom: vencidas ? "danger" : "ok" },
              { label: "Prazo legal", value: String(prazoLegal), hint: "vencido ou a 30 dias dos 180 dias", tom: prazoLegal ? "warn" : "ok" },
            ]} />
            {sel && (
              <Painel titulo={`NF-e de remessa — OS ${sel.service_order_code}`} sub={`${sel.supplier_name} · ${sel.item_business_code || sel.item_code} ${sel.item_name}`}
                acoes={<><button className="erp-btn erp-btn-primary erp-btn-sm" onClick={emitir} disabled={busy}>Gerar NF-e (rascunho)</button><button className="erp-btn erp-btn-sm" onClick={() => setSel(null)}>Fechar</button></>}>
                <div className="erp-fieldset-body" style={{ padding: 0 }}>
                  <div className="erp-field erp-c3"><label className="erp-label erp-req" htmlFor="rem-qtd">Quantidade</label>
                    <input id="rem-qtd" className="erp-input" inputMode="decimal" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label" htmlFor="rem-vu">Valor unitário</label>
                    <input id="rem-vu" className="erp-input" inputMode="decimal" placeholder="custo médio" value={form.unit_value ?? ""} onChange={(e) => setForm({ ...form, unit_value: e.target.value })} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label" htmlFor="rem-data">Emissão</label>
                    <input id="rem-data" className="erp-input" type="date" value={form.data_emissao} onChange={(e) => setForm({ ...form, data_emissao: e.target.value })} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label" htmlFor="rem-serie">Série</label>
                    <input id="rem-serie" className="erp-input" value={form.serie ?? ""} onChange={(e) => setForm({ ...form, serie: e.target.value })} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label" htmlFor="rem-icms">CST ICMS / CSOSN</label>
                    <input id="rem-icms" className="erp-input" placeholder="50 (ou 900 no Simples)" value={form.cst_icms ?? ""} onChange={(e) => setForm({ ...form, cst_icms: e.target.value })} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label" htmlFor="rem-ipi">CST IPI</label>
                    <input id="rem-ipi" className="erp-input" placeholder="55" value={form.cst_ipi ?? ""} onChange={(e) => setForm({ ...form, cst_ipi: e.target.value })} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label" htmlFor="rem-pis">CST PIS/COFINS</label>
                    <input id="rem-pis" className="erp-input" placeholder="49" value={form.cst_pis_cofins ?? ""} onChange={(e) => setForm({ ...form, cst_pis_cofins: e.target.value })} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label" htmlFor="rem-cbenef">cBenef</label>
                    <input id="rem-cbenef" className="erp-input" placeholder="se a UF exigir" value={form.cbenef ?? ""} onChange={(e) => setForm({ ...form, cbenef: e.target.value })} /></div>
                  <div className="erp-field erp-c12"><label className="erp-label" htmlFor="rem-texto">Texto legal (dados adicionais)</label>
                    <input id="rem-texto" className="erp-input" placeholder="dispositivo da suspensão do ICMS no RICMS da sua UF" value={form.texto_legal ?? ""} onChange={(e) => setForm({ ...form, texto_legal: e.target.value })} />
                    <span className="erp-hint">Deixe os CSTs vazios para o padrão; confirme a tributação com a contabilidade.</span></div>
                </div>
              </Painel>
            )}
            {linhas === null ? <Vazio titulo="Carregando…" /> : linhas.length === 0
              ? <Vazio titulo="Nada com terceiros" texto="Peças remetidas para industrialização pela OS de terceiro (aba Ordens de serviço) aparecem aqui até voltarem." />
              : porFornecedor.map(([codigo, g]) => (
                <Painel key={codigo} titulo={`${codigo} — ${g.nome}`} sub={reais(g.itens.reduce((t, l) => t + l.value, 0))} flush>
                  <table className="erp-grid">
                    <thead><tr><th>OS</th><th>Item</th><th className="num">Remetido</th><th className="num">Voltou</th><th className="num">Com o terceiro</th><th className="num">Valor</th><th>Previsto</th><th className="num">Dias fora</th><th>Prazo legal</th><th /></tr></thead>
                    <tbody>{g.itens.map((l) => (
                      <tr key={`${l.service_order_id}-${l.item_code}`} className={sel?.service_order_id === l.service_order_id ? "erp-row-sel" : undefined}>
                        <td><button className="erp-btn erp-btn-ghost erp-btn-sm" onClick={onAbrirOrdens} title="Ver as ordens de serviço">{l.service_order_code}</button></td>
                        <td>{l.item_business_code || l.item_code} {l.item_name}</td>
                        <td className="num">{num(l.remitted)}</td><td className="num">{num(l.returned + l.received)}</td><td className="num"><strong>{num(l.in_hands)}</strong></td>
                        <td className="num">{reais(l.value)}</td>
                        <td className={l.overdue ? "erp-cell-danger" : undefined}>{data(l.due_date)}</td><td className="num">{l.days_in_hands}</td>
                        <td>{data(l.legal_deadline)} {l.legal_deadline_passed ? <Selo tom="danger">Vencido</Selo> : l.legal_deadline_near ? <Selo tom="warn">Perto</Selo> : null}</td>
                        <td>{admin && <button className="erp-btn erp-btn-sm" onClick={() => { setSel(l); setForm({ ...NOVA, quantity: String(l.in_hands) }); }}>NF-e de remessa</button>}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </Painel>
              ))}
  </>);
}

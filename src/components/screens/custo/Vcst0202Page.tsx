import { useState, useCallback } from "react";
import {
  type SalesTableDTO, type SalesTablePriceDTO, type SalesPricePolicyDTO,
  listSalesTables, createSalesTable, listSalesTablePrices, createSalesTablePrice, deleteSalesTablePrice,
  formSalesPrice, generateSalesTablePrices, listSalesPricePolicies, createSalesPricePolicy,
} from "@/services/salesPricingService";
import { errMessage, parseNum, unwrapObject } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadSalesPricePolicies, loadSalesTables } from "@/services/lookups";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type View = "tables" | "formation" | "policies";
const iso = (d: string) => (d ? `${d}T00:00:00Z` : undefined);
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY_TABLE: SalesTableDTO = { description: "", price_formation: "INFORMADO", decimal_places: 2, composition: "FOB", table_type: "NORMAL", base_date: "PEDIDO", tolerance_min_pct: 0, tolerance_max_pct: 10 };
const EMPTY_PRICE: SalesTablePriceDTO = { item_code: "", price: 0, ume: "UN", umc: "UN", situation: "ATIVO", blocked: false };
const EMPTY_POLICY: SalesPricePolicyDTO = { description: "", cost_source: "STANDARD_TOTAL", policy_scope: "PREC", priority: 10, sequence: 10, margin_pct: 20, taxes_pct: 12, commission_pct: 5 };
const COST_SOURCE_LABELS: Record<string, string> = {
  STANDARD_TOTAL: "Custo padrão total",
  STANDARD_MATERIAL: "Custo padrão de materiais",
  AVERAGE: "Custo médio",
  LAST_PURCHASE: "Último custo de compra",
};

export function Vcst0202Page(): JSX.Element {
  const [view, setView] = useState<View>("tables");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const [tables, setTables] = useState<SalesTableDTO[]>([]);
  const [tableForm, setTableForm] = useState<SalesTableDTO>(EMPTY_TABLE);
  const [tValidFrom, setTValidFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [tValidTo, setTValidTo] = useState(`${new Date().getFullYear()}-12-31`);
  const [selTable, setSelTable] = useState<SalesTableDTO | null>(null);
  const [prices, setPrices] = useState<SalesTablePriceDTO[]>([]);
  const [priceForm, setPriceForm] = useState<SalesTablePriceDTO>(EMPTY_PRICE);

  // formação
  const [fTable, setFTable] = useState("");
  const [fPolicy, setFPolicy] = useState("");
  const [fItem, setFItem] = useState("");
  const [fCost, setFCost] = useState("100");
  const [fMargin, setFMargin] = useState("20");
  const [fTaxes, setFTaxes] = useState("12");
  const [fResult, setFResult] = useState<Record<string, unknown> | null>(null);
  const [genItems, setGenItems] = useState("");

  // políticas
  const [policies, setPolicies] = useState<SalesPricePolicyDTO[]>([]);
  const [policyForm, setPolicyForm] = useState<SalesPricePolicyDTO>(EMPTY_POLICY);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregarTabelas = () => run(async () => { setTables(await listSalesTables()); });
  const gravarTabela = () => run(async () => {
    if (!tableForm.description.trim()) { setFeedback({ type: "error", message: "Informe a descrição." }); return; }
    await createSalesTable({ ...tableForm, validity_start: iso(tValidFrom), validity_end: iso(tValidTo) });
    setTableForm(EMPTY_TABLE); setFeedback({ type: "success", message: "Tabela de venda criada." });
    setTables(await listSalesTables());
  });
  const abrirTabela = (t: SalesTableDTO) => { setSelTable(t); void run(async () => { setPrices(t.code ? await listSalesTablePrices(t.code) : []); }); };
  const gravarPreco = () => run(async () => {
    if (!selTable?.code) return;
    if (!priceForm.item_code.trim()) { setFeedback({ type: "error", message: "Informe o item." }); return; }
    if (!(priceForm.price > 0)) { setFeedback({ type: "error", message: "O preço precisa ser maior que zero." }); return; }
    await createSalesTablePrice(selTable.code, priceForm); setPriceForm(EMPTY_PRICE);
    setFeedback({ type: "success", message: "Preço incluído." });
    setPrices(await listSalesTablePrices(selTable.code));
  });
  const removerPreco = (id?: number) => { if (!id || !selTable?.code) return; void run(async () => {
    await deleteSalesTablePrice(id); setPrices(await listSalesTablePrices(selTable.code!));
  }); };

  const calcularFormacao = () => run(async () => {
    if (!fTable || !fItem) { setFeedback({ type: "error", message: "Informe tabela e item." }); return; }
    const r = await formSalesPrice({ sales_table_code: Number(fTable), policy_code: fPolicy ? Number(fPolicy) : undefined, item_code: fItem, base_cost: Number(fCost), margin_pct: Number(fMargin), taxes_pct: Number(fTaxes) });
    setFResult(unwrapObject(r) as Record<string, unknown>);
    setFeedback({ type: "success", message: `Preço sugerido: R$ ${money(parseNum(unwrapObject(r), "suggested_price", "SuggestedPrice"))}.` });
  });
  const gerarPrecos = () => run(async () => {
    if (!fTable || !fPolicy) { setFeedback({ type: "error", message: "Informe tabela e política." }); return; }
    const items = genItems.split(",").map((s) => s.trim()).filter(Boolean);
    if (items.length === 0) { setFeedback({ type: "error", message: "Liste os itens (separados por vírgula)." }); return; }
    const r = await generateSalesTablePrices(Number(fTable), Number(fPolicy), items, undefined, "Reprecificação VCST0202");
    const o = unwrapObject(r);
    setFeedback({ type: "success", message: `Preços gerados: ${(o["generated"] as unknown[])?.length ?? 0}; avisos: ${(o["warnings"] as unknown[])?.length ?? 0}.` });
  });

  const carregarPoliticas = () => run(async () => { setPolicies(await listSalesPricePolicies()); });
  const gravarPolitica = () => run(async () => {
    if (!policyForm.description.trim()) { setFeedback({ type: "error", message: "Informe a descrição." }); return; }
    await createSalesPricePolicy({ ...policyForm, validity_start: iso(tValidFrom), validity_end: iso(tValidTo) });
    setPolicyForm(EMPTY_POLICY); setFeedback({ type: "success", message: "Política de formação criada." });
    setPolicies(await listSalesPricePolicies());
  });

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Comercial &amp; Vendas</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Tabelas de Venda e Preços por Item</span>
          <span className="erp-crumb-code">VCST0202</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Criar tabela · vincular itens · formar preços · políticas</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <button className={`erp-btn${view === "tables" ? " erp-btn-dark" : ""}`} onClick={() => setView("tables")} disabled={busy}>Tabelas &amp; Preços</button>
          <button className={`erp-btn${view === "formation" ? " erp-btn-dark" : ""}`} onClick={() => setView("formation")} disabled={busy}>Formação de Preço</button>
          <button className={`erp-btn${view === "policies" ? " erp-btn-dark" : ""}`} onClick={() => setView("policies")} disabled={busy}>Políticas</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VCST0202 — Tabelas de venda e preços por item" filename="vcst0202" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}

        {view === "tables" && (
          <div className="erp-main vcst-tables-main">
            <div className="erp-list-panel">
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Nova tabela de venda</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c8"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={tableForm.description} onChange={(e) => setTableForm((p) => ({ ...p, description: e.target.value }))} /></div>
                  <div className="erp-field erp-c4"><label className="erp-label">Casas decimais</label><input className="erp-input num" type="number" value={tableForm.decimal_places} onChange={(e) => setTableForm((p) => ({ ...p, decimal_places: Number(e.target.value) }))} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Formação do preço</label><select className="erp-tselect" value={tableForm.price_formation} onChange={(e) => setTableForm((p) => ({ ...p, price_formation: e.target.value }))}><option value="INFORMADO">Preço informado manualmente</option><option value="CUSTO_MEDIO">Custo médio</option><option value="CUSTO_STANDARD_TOTAL">Custo padrão total</option><option value="CUSTO_STANDARD_MATERIAL">Custo padrão de materiais</option><option value="INFORMADO_SEM_ICMS">Preço informado sem ICMS</option><option value="MAT_OPER">Materiais e operações</option><option value="TABELA_CUSTO">Tabela de custo</option><option value="TRANSFERENCIA_IPI">Transferência com IPI</option><option value="TRANSFERENCIA_UF">Transferência entre estados</option></select></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Composição</label><select className="erp-tselect" value={tableForm.composition} onChange={(e) => setTableForm((p) => ({ ...p, composition: e.target.value }))}><option value="FOB">FOB</option><option value="CIF">CIF</option></select></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Válida de</label><input className="erp-input" type="date" value={tValidFrom} onChange={(e) => setTValidFrom(e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label">Válida até</label><input className="erp-input" type="date" value={tValidTo} onChange={(e) => setTValidTo(e.target.value)} /></div>
                  <div className="erp-field erp-c12" style={{ flexDirection: "row" }}><button className="erp-btn erp-btn-primary" onClick={gravarTabela} disabled={busy}>Criar tabela</button><button className="erp-btn" style={{ marginLeft: 8 }} onClick={carregarTabelas} disabled={busy}>Atualizar lista</button></div>
                </div>
              </div>
              <div className="erp-grid-wrap">
                <table className="erp-grid">
                  <thead><tr><th className="num">Código</th><th>Descrição</th><th>Comp.</th><th className="num">Dec.</th><th>Ativa</th></tr></thead>
                  <tbody>
                    {tables.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Clique em <strong>Atualizar lista</strong>.</td></tr>}
                    {tables.map((t) => (
                      <tr key={t.code} onClick={() => abrirTabela(t)} className={selTable?.code === t.code ? "erp-row-sel" : ""} style={{ cursor: "pointer" }}>
                        <td className="num">{t.code}</td><td>{t.description}</td><td>{t.composition || "—"}</td><td className="num">{t.decimal_places}</td><td>{t.is_active === false ? "" : <span className="erp-badge ok">Ativa</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="erp-detail-panel">
              {selTable ? (
                <>
                  <div className="erp-fieldset">
                    <div className="erp-fieldset-head">Tabela {selTable.code} — {selTable.description}</div>
                    <div className="erp-fieldset-body">
                      <div className="erp-field erp-c4"><label className="erp-label erp-req">Item</label><LookupField value={priceForm.item_code} loader={loadItems} entityLabel="item" onChange={(code) => setPriceForm((p) => ({ ...p, item_code: String(code ?? "") }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label erp-req">Preço de venda</label><input className="erp-input num" type="number" min="0.01" step="0.0001" value={priceForm.price || ""} onChange={(e) => setPriceForm((p) => ({ ...p, price: Number(e.target.value) }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Unidade de venda</label><input className="erp-input" value={priceForm.ume ?? ""} onChange={(e) => setPriceForm((p) => ({ ...p, ume: e.target.value.toUpperCase() }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Unidade comercial</label><input className="erp-input" value={priceForm.umc ?? ""} onChange={(e) => setPriceForm((p) => ({ ...p, umc: e.target.value.toUpperCase() }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Preço convertido</label><input className="erp-input num" type="number" min="0" step="0.0001" value={priceForm.price_conv ?? ""} placeholder="Igual ao preço" onChange={(e) => setPriceForm((p) => ({ ...p, price_conv: e.target.value ? Number(e.target.value) : undefined }))} /></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Situação</label><select className="erp-input" value={priceForm.situation ?? "ATIVO"} onChange={(e) => setPriceForm((p) => ({ ...p, situation: e.target.value }))}><option value="ATIVO">Ativo</option><option value="PROMOCIONAL">Promocional</option><option value="INATIVO">Inativo</option></select></div>
                      <div className="erp-field erp-c2"><label className="erp-label">Disponibilidade</label><label className="erp-check"><input type="checkbox" checked={!!priceForm.blocked} onChange={(e) => setPriceForm((p) => ({ ...p, blocked: e.target.checked }))} /><span>Bloquear este preço</span></label></div>
                      <div className="erp-field erp-c5"><label className="erp-label">Fórmula/referência</label><input className="erp-input" value={priceForm.formula ?? ""} onChange={(e) => setPriceForm((p) => ({ ...p, formula: e.target.value }))} /></div>
                      <div className="erp-field erp-c5"><label className="erp-label">Observação comercial</label><input className="erp-input" value={priceForm.observation ?? ""} onChange={(e) => setPriceForm((p) => ({ ...p, observation: e.target.value }))} /></div>
                      <div className="erp-field erp-c2" style={{ flexDirection: "row", alignItems: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={gravarPreco} disabled={busy}>Incluir item na tabela</button></div>
                      <div className="erp-field erp-c12"><span className="erp-field-hint">Aqui ficam preço, unidades, conversão e disponibilidade comercial. NCM, tributação, garantia, devolução e dados fiscais pertencem ao cadastro mestre do item, pois são usados por todas as tabelas e documentos.</span></div>
                    </div>
                  </div>
                  <div className="erp-grid-wrap">
                    <table className="erp-grid">
                      <thead><tr><th className="num">ID</th><th>Item</th><th className="num">Preço</th><th>UM</th><th>Situação</th><th style={{ width: 70 }}></th></tr></thead>
                      <tbody>
                        {prices.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Sem preços.</td></tr>}
                        {prices.map((pr) => (
                          <tr key={pr.id}><td className="num">{pr.id}</td><td>{pr.item_code}</td><td className="num">{money(pr.price)}</td><td>{pr.ume || "—"}</td><td>{pr.situation || "—"}</td>
                            <td><button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => removerPreco(pr.id)} disabled={busy}>Excluir</button></td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : <div className="erp-detail-empty"><div className="erp-detail-empty-title">Nenhuma tabela selecionada</div><div className="erp-detail-empty-sub">Selecione uma tabela na lista para gerenciar os preços.</div></div>}
            </div>
          </div>
        )}

        {view === "formation" && (
          <>
            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Formação de preço (custo + margem/cargas, ou por política)</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c3"><label className="erp-label erp-req">Tabela de venda</label><LookupField value={fTable} loader={loadSalesTables} entityLabel="tabela de venda" onChange={(code) => setFTable(String(code ?? ""))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Política comercial</label><LookupField value={fPolicy} loader={loadSalesPricePolicies} entityLabel="política comercial" placeholder="Opcional" onChange={(code) => setFPolicy(String(code ?? ""))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label erp-req">Item</label><LookupField value={fItem} loader={loadItems} entityLabel="item" onChange={(code) => setFItem(String(code ?? ""))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Custo base</label><input className="erp-input num" type="number" value={fCost} onChange={(e) => setFCost(e.target.value)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Margem %</label><input className="erp-input num" type="number" value={fMargin} onChange={(e) => setFMargin(e.target.value)} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Impostos %</label><input className="erp-input num" type="number" value={fTaxes} onChange={(e) => setFTaxes(e.target.value)} /></div>
                <div className="erp-field erp-c6" style={{ flexDirection: "row", alignItems: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={calcularFormacao} disabled={busy}>Calcular preço sugerido</button></div>
              </div>
              {fResult && <div className="erp-feedback info" style={{ margin: "0 14px 12px" }}><strong>Resultado da formação:</strong> preço sugerido R$ {money(parseNum(fResult, "suggested_price", "SuggestedPrice"))}, custo base R$ {money(parseNum(fResult, "base_cost", "BaseCost"))}, margem de contribuição {parseNum(fResult, "contribution_margin_pct", "ContributionMarginPct").toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%.</div>}
            </div>
            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Gerar preços em lote (upsert + histórico)</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c9"><label className="erp-label">Itens (separados por vírgula)</label><input className="erp-input" value={genItems} onChange={(e) => setGenItems(e.target.value)} placeholder="1001, 1002, 1003" /></div>
                <div className="erp-field erp-c3" style={{ flexDirection: "row", alignItems: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={gerarPrecos} disabled={busy}>Gerar preços</button></div>
                <p style={{ fontSize: 12, color: "var(--v-text-3)", padding: "0 0 4px" }}>Os preços são calculados com a tabela, a política e a fonte de custo configuradas acima.</p>
              </div>
            </div>
          </>
        )}

        {view === "policies" && (
          <>
            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Nova política de formação de preço</div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c6"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={policyForm.description} onChange={(e) => setPolicyForm((p) => ({ ...p, description: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Fonte de custo</label><select className="erp-tselect" value={policyForm.cost_source} onChange={(e) => setPolicyForm((p) => ({ ...p, cost_source: e.target.value }))}>{Object.entries(COST_SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                <div className="erp-field erp-c3"><label className="erp-label">Prioridade</label><input className="erp-input num" type="number" value={policyForm.priority} onChange={(e) => setPolicyForm((p) => ({ ...p, priority: Number(e.target.value) }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Margem %</label><input className="erp-input num" type="number" value={policyForm.margin_pct} onChange={(e) => setPolicyForm((p) => ({ ...p, margin_pct: Number(e.target.value) }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Impostos %</label><input className="erp-input num" type="number" value={policyForm.taxes_pct} onChange={(e) => setPolicyForm((p) => ({ ...p, taxes_pct: Number(e.target.value) }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Comissão %</label><input className="erp-input num" type="number" value={policyForm.commission_pct} onChange={(e) => setPolicyForm((p) => ({ ...p, commission_pct: Number(e.target.value) }))} /></div>
                <div className="erp-field erp-c3" style={{ flexDirection: "row", alignItems: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={gravarPolitica} disabled={busy}>Criar política</button></div>
              </div>
            </div>
            <div className="erp-toolbar" style={{ borderRadius: 0 }}><div className="erp-tgroup"><button className="erp-btn" onClick={carregarPoliticas} disabled={busy}>Atualizar lista</button></div></div>
            <div className="erp-grid-wrap">
              <table className="erp-grid">
                <thead><tr><th className="num">Código</th><th>Descrição</th><th>Fonte custo</th><th className="num">Margem</th><th className="num">Impostos</th><th className="num">Comissão</th></tr></thead>
                <tbody>
                  {policies.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Clique em <strong>Atualizar lista</strong>.</td></tr>}
                  {policies.map((p) => (
                    <tr key={p.code}><td className="num">{p.code}</td><td>{p.description}</td><td>{COST_SOURCE_LABELS[p.cost_source ?? ""] ?? p.cost_source ?? "—"}</td><td className="num">{p.margin_pct ?? 0}%</td><td className="num">{p.taxes_pct ?? 0}%</td><td className="num">{p.commission_pct ?? 0}%</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <footer className="erp-statusbar">
        {view === "tables" && <div className="erp-status-item">Tabelas: <strong>{tables.length}</strong>{selTable && <> · Preços: <strong>{prices.length}</strong></>}</div>}
        {view === "policies" && <div className="erp-status-item">Políticas: <strong>{policies.length}</strong></div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

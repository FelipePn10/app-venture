import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CARRIER_FREIGHT_TYPES,
  CARRIER_MODALS,
  CARRIER_OCCURRENCE_TYPES,
  CARRIER_SHIPPER_TYPES,
  carrierModalLabel,
  createCarrierOccurrence,
  createShippingCarrier,
  getShippingCarrier,
  listCarrierOccurrences,
  listShippingCarriers,
  quoteFreight,
  setShippingCarrierStatus,
  updateShippingCarrier,
  type CarrierOccurrenceDTO,
  type CarrierServiceAreaDTO,
  type CarrierVehicleDTO,
  type FreightComparisonDTO,
  type ShippingCarrierDTO,
} from "@/services/shippingCarrierService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { loadSuppliers } from "@/services/lookups";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type DetailTab = "dados" | "frota" | "regioes" | "ocorrencias";

const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dataBR = (iso?: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
const hoje = () => new Date().toISOString().slice(0, 10);

const VAZIO: ShippingCarrierDTO = {
  supplier_code: 0, modal: "RODOVIARIO", issues_cte: true, is_active: true,
  freight_min_value: 0, freight_kg_rate: 0, freight_pct_value: 0, gris_pct: 0,
  toll_per_100kg: 0, insurance_coverage: 0, vehicles: [], service_areas: [],
};

const VEICULO_VAZIO: CarrierVehicleDTO = { plate: "", capacity_kg: 0, capacity_m3: 0, is_active: true };
const REGIAO_VAZIA: CarrierServiceAreaDTO = { lead_days: 0, min_value: 0, kg_rate: 0, pct_value: 0, is_active: true };

/**
 * VSUP0140 — Cadastro de Transportadora.
 *
 * A transportadora é um fornecedor (o frete é pago pelo contas a pagar de
 * sempre); esta tela guarda o que faltava para operar frete: habilitação na
 * ANTT, modal, tabela de frete, seguro, frota com motorista, regiões atendidas
 * com prazo e as ocorrências de entrega que formam a avaliação.
 *
 * Não confundir com o cadastro de PORTADOR (`carriers`), que é financeiro:
 * carteira, limite de crédito e dias de recebimento.
 */
export function Vsup0140Page(): JSX.Element {
  const [lista, setLista] = useState<ShippingCarrierDTO[]>([]);
  const [selecionada, setSelecionada] = useState<ShippingCarrierDTO | null>(null);
  const [form, setForm] = useState<ShippingCarrierDTO>(VAZIO);
  const [criando, setCriando] = useState(false);
  const [tab, setTab] = useState<DetailTab>("dados");
  const [busca, setBusca] = useState({ q: "", uf: "", modal: "", onlyActive: false });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [ocorrencias, setOcorrencias] = useState<CarrierOccurrenceDTO[]>([]);
  const [novaOcorrencia, setNovaOcorrencia] = useState<CarrierOccurrenceDTO>({
    occurrence_date: hoje(), occurrence_type: "ATRASO", delay_days: 0, cost_impact: 0,
  });
  const [cotacao, setCotacao] = useState<FreightComparisonDTO | null>(null);
  const [carga, setCarga] = useState({ uf: "", cep: "", peso: "100", volume: "", valor: "10000" });
  const [confirmarSituacao, setConfirmarSituacao] = useState<ShippingCarrierDTO | null>(null);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  const carregarLista = useCallback(async () => {
    setLista(await listShippingCarriers({
      q: busca.q || undefined, uf: busca.uf || undefined,
      modal: busca.modal || undefined, onlyActive: busca.onlyActive,
    }));
  }, [busca]);

  useEffect(() => { void run(carregarLista); }, [run, carregarLista]);

  const abrir = (id?: number) => { if (!id) return; void run(async () => {
    const detalhe = await getShippingCarrier(id);
    setSelecionada(detalhe); setForm({ ...detalhe }); setCriando(false); setTab("dados");
    setOcorrencias(await listCarrierOccurrences(id).catch(() => []));
  }); };

  const nova = () => { setCriando(true); setSelecionada(null); setForm({ ...VAZIO }); setOcorrencias([]); setTab("dados"); setFeedback(null); };

  const setF = <K extends keyof ShippingCarrierDTO>(k: K, v: ShippingCarrierDTO[K]) => setForm((p) => ({ ...p, [k]: v }));

  const salvar = () => run(async () => {
    if (!form.supplier_code) { setFeedback({ type: "error", message: "Informe o fornecedor que é a transportadora." }); return; }
    const salva = criando || !form.id
      ? await createShippingCarrier(form)
      : await updateShippingCarrier(form.id, form);
    setSelecionada(salva); setForm({ ...salva }); setCriando(false);
    await carregarLista();
    setFeedback({
      type: salva.alerts && salva.alerts.length > 0 ? "info" : "success",
      message: salva.alerts && salva.alerts.length > 0
        ? `Transportadora gravada com pendências: ${salva.alerts.join("; ")}.`
        : "Transportadora gravada.",
    });
  });

  const mudarSituacao = () => { const alvo = confirmarSituacao; setConfirmarSituacao(null); if (!alvo?.id) return; void run(async () => {
    await setShippingCarrierStatus(alvo.id!, !alvo.is_active);
    await carregarLista();
    if (selecionada?.id === alvo.id) abrir(alvo.id);
    setFeedback({ type: "success", message: alvo.is_active ? "Transportadora inativada." : "Transportadora reativada." });
  }); };

  // ─── Frota e regiões: grades editadas na memória e gravadas com a capa ──────
  const addVeiculo = () => setF("vehicles", [...(form.vehicles ?? []), { ...VEICULO_VAZIO }]);
  const setVeiculo = (idx: number, campo: keyof CarrierVehicleDTO, valor: string | number | boolean) =>
    setF("vehicles", (form.vehicles ?? []).map((v, i) => (i === idx ? { ...v, [campo]: valor } : v)));
  const delVeiculo = (idx: number) => setF("vehicles", (form.vehicles ?? []).filter((_, i) => i !== idx));

  const addRegiao = () => setF("service_areas", [...(form.service_areas ?? []), { ...REGIAO_VAZIA }]);
  const setRegiao = (idx: number, campo: keyof CarrierServiceAreaDTO, valor: string | number | boolean) =>
    setF("service_areas", (form.service_areas ?? []).map((a, i) => (i === idx ? { ...a, [campo]: valor } : a)));
  const delRegiao = (idx: number) => setF("service_areas", (form.service_areas ?? []).filter((_, i) => i !== idx));

  const lancarOcorrencia = () => { const id = selecionada?.id; if (!id) return; void run(async () => {
    await createCarrierOccurrence(id, novaOcorrencia);
    setOcorrencias(await listCarrierOccurrences(id));
    const detalhe = await getShippingCarrier(id);
    setSelecionada(detalhe);
    setNovaOcorrencia({ occurrence_date: hoje(), occurrence_type: "ATRASO", delay_days: 0, cost_impact: 0 });
    setFeedback({ type: "success", message: "Ocorrência registrada — entra na avaliação da transportadora." });
  }); };

  const cotar = () => run(async () => {
    if (!carga.uf && !carga.cep) { setFeedback({ type: "error", message: "Informe a UF ou o CEP do destino." }); return; }
    setCotacao(await quoteFreight({
      uf: carga.uf || undefined, cep: carga.cep || undefined,
      weightKg: Number(carga.peso) || 0,
      volumeM3: carga.volume ? Number(carga.volume) : undefined,
      cargoValue: Number(carga.valor) || 0,
    }));
  });

  const visiveis = useMemo(() => lista, [lista]);
  const pendencias = form.alerts ?? selecionada?.alerts ?? [];

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Suprimento</span>
          <span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Cadastro de Transportadora</span>
          <span className="erp-crumb-code">VSUP0140</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">Transportadora é fornecedor — portador financeiro é outro cadastro</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={nova} disabled={busy}>+ Nova transportadora</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Filtrar</span>
          <input className="erp-input" style={{ width: 190 }} placeholder="nome, CNPJ ou RNTRC" value={busca.q}
            onChange={(e) => setBusca((p) => ({ ...p, q: e.target.value }))} />
          <input className="erp-input" style={{ width: 70 }} placeholder="UF" maxLength={2} value={busca.uf}
            onChange={(e) => setBusca((p) => ({ ...p, uf: e.target.value.toUpperCase() }))} />
          <select className="erp-input erp-tselect" style={{ width: 150 }} value={busca.modal}
            onChange={(e) => setBusca((p) => ({ ...p, modal: e.target.value }))}>
            <option value="">Todos os modais</option>
            {CARRIER_MODALS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <label className="erp-check">
            <input type="checkbox" checked={busca.onlyActive} onChange={(e) => setBusca((p) => ({ ...p, onlyActive: e.target.checked }))} />
            só ativas
          </label>
          <button className="erp-btn erp-btn-dark" onClick={() => void run(carregarLista)} disabled={busy}>{busy && <span className="erp-spin" />}Buscar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VSUP0140 — Cadastro de Transportadora" filename="vsup0140" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head">
              <span className="erp-panel-title">Transportadoras</span>
              <span className="erp-count">{visiveis.length}</span>
            </div>
            <div className="erp-list">
              {visiveis.length === 0 && (
                <div className="erp-list-empty">
                  Nenhuma transportadora cadastrada.<br />
                  Use <strong>+ Nova transportadora</strong> e escolha um fornecedor já cadastrado.
                </div>
              )}
              {visiveis.map((c) => (
                <div key={c.id} className={`erp-list-row${selecionada?.id === c.id ? " sel" : ""}`} onClick={() => abrir(c.id)}>
                  <span className="erp-list-code">#{c.supplier_code}</span>
                  <span className="erp-list-sub">{c.supplier_name || "—"}</span>
                  <div className="erp-list-meta">
                    <span className="erp-badge info">{carrierModalLabel(c.modal)}</span>
                    {c.antt_rntrc && <span className="erp-badge draft">RNTRC {c.antt_rntrc}</span>}
                    {!c.is_active && <span className="erp-badge err">Inativa</span>}
                    {(c.alerts?.length ?? 0) > 0 && <span className="erp-badge warn">{c.alerts!.length} pendência(s)</span>}
                    <span className="erp-list-money" style={{ marginLeft: "auto" }}>{c.service_areas?.length ?? 0} região(ões)</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="erp-detail-panel">
            {criando || selecionada ? (
              <>
                <div className="erp-tabs">
                  <button className={`erp-tab${tab === "dados" ? " active" : ""}`} onClick={() => setTab("dados")}>
                    {criando ? "Nova transportadora" : "Dados e tabela de frete"}
                  </button>
                  <button className={`erp-tab${tab === "frota" ? " active" : ""}`} onClick={() => setTab("frota")}>Frota ({form.vehicles?.length ?? 0})</button>
                  <button className={`erp-tab${tab === "regioes" ? " active" : ""}`} onClick={() => setTab("regioes")}>Regiões ({form.service_areas?.length ?? 0})</button>
                  {!criando && <button className={`erp-tab${tab === "ocorrencias" ? " active" : ""}`} onClick={() => setTab("ocorrencias")}>Ocorrências ({ocorrencias.length})</button>}
                </div>

                <div className="erp-detail-body">
                  {pendencias.length > 0 && (
                    <div className="erp-note">
                      <strong>Pendências que impedem transportar:</strong>
                      <ul style={{ margin: "6px 0 0 18px" }}>
                        {pendencias.map((a) => <li key={a}>{a}</li>)}
                      </ul>
                    </div>
                  )}

                  {tab === "dados" && (
                    <>
                      <div className="erp-fieldset">
                        <div className="erp-fieldset-head">
                          Identificação e habilitação
                          {selecionada && <span className={`erp-badge ${selecionada.is_active ? "ok" : "err"}`}>{selecionada.is_active ? "Ativa" : "Inativa"}</span>}
                        </div>
                        <div className="erp-fieldset-body">
                          <div className="erp-field erp-c4">
                            <label className="erp-label erp-req">Fornecedor (transportadora)</label>
                            <LookupField value={form.supplier_code || undefined} loader={loadSuppliers} entityLabel="fornecedor"
                              disabled={!criando && !!form.id}
                              onChange={(c) => setF("supplier_code", Number(c) || 0)} />
                            <small className="erp-hint">A transportadora é um fornecedor: é por ele que o frete é pago.</small>
                          </div>
                          <div className="erp-field erp-c2">
                            <label className="erp-label">RNTRC (8 dígitos)</label>
                            <input className="erp-input num" value={form.antt_rntrc ?? ""} onChange={(e) => setF("antt_rntrc", e.target.value)} />
                            <small className="erp-hint">Sem RNTRC válido o CT-e rodoviário é rejeitado.</small>
                          </div>
                          <div className="erp-field erp-c2">
                            <label className="erp-label">Validade do RNTRC</label>
                            <input className="erp-input" type="date" value={form.antt_expiry ?? ""} onChange={(e) => setF("antt_expiry", e.target.value)} />
                          </div>
                          <div className="erp-field erp-c2">
                            <label className="erp-label">Categoria ANTT</label>
                            <select className="erp-input" value={form.shipper_type ?? ""} onChange={(e) => setF("shipper_type", e.target.value || undefined)}>
                              <option value="">—</option>
                              {CARRIER_SHIPPER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.value}</option>)}
                            </select>
                            <small className="erp-hint">{CARRIER_SHIPPER_TYPES.find((t) => t.value === form.shipper_type)?.label ?? "ETC empresa · CTC cooperativa · TAC autônomo"}</small>
                          </div>
                          <div className="erp-field erp-c2">
                            <label className="erp-label">Modal</label>
                            <select className="erp-input" value={form.modal} onChange={(e) => setF("modal", e.target.value)}>
                              {CARRIER_MODALS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                          </div>
                          <div className="erp-field erp-c3">
                            <label className="erp-check">
                              <input type="checkbox" checked={form.issues_cte !== false} onChange={(e) => setF("issues_cte", e.target.checked)} />
                              Emite CT-e
                            </label>
                            <small className="erp-hint">Rodoviária que emite CT-e precisa de RNTRC.</small>
                          </div>
                          <div className="erp-field erp-c3">
                            <label className="erp-label">Tipo de frete padrão</label>
                            <select className="erp-input" value={form.default_freight_type ?? ""} onChange={(e) => setF("default_freight_type", e.target.value || undefined)}>
                              <option value="">—</option>
                              {CARRIER_FREIGHT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div className="erp-field erp-c3">
                            <label className="erp-label">Prazo médio (dias)</label>
                            <input className="erp-input num" type="number" min="0" value={form.average_lead_days ?? ""} onChange={(e) => setF("average_lead_days", e.target.value ? Number(e.target.value) : undefined)} />
                            <small className="erp-hint">Usado quando a região não tem prazo próprio.</small>
                          </div>
                          <div className="erp-field erp-c3">
                            <label className="erp-label">Rastreamento (URL)</label>
                            <input className="erp-input" value={form.tracking_url ?? ""} onChange={(e) => setF("tracking_url", e.target.value)} />
                          </div>
                          <div className="erp-field erp-c4"><label className="erp-label">Contato</label><input className="erp-input" value={form.contact_name ?? ""} onChange={(e) => setF("contact_name", e.target.value)} /></div>
                          <div className="erp-field erp-c4"><label className="erp-label">Telefone</label><input className="erp-input" value={form.contact_phone ?? ""} onChange={(e) => setF("contact_phone", e.target.value)} /></div>
                          <div className="erp-field erp-c4"><label className="erp-label">E-mail</label><input className="erp-input" value={form.contact_email ?? ""} onChange={(e) => setF("contact_email", e.target.value)} /></div>
                        </div>
                      </div>

                      <div className="erp-fieldset">
                        <div className="erp-fieldset-head">Tabela de frete padrão</div>
                        <div className="erp-fieldset-body">
                          <div className="erp-field erp-c12">
                            <small className="erp-hint">
                              Cada componente existe porque é cobrado separadamente na praça: peso, ad valorem sobre a
                              mercadoria, GRIS (gerenciamento de risco), pedágio por fração de 100 kg e um piso.
                              A região atendida pode ter tabela própria, e ela prevalece sobre esta.
                            </small>
                          </div>
                          <div className="erp-field erp-c3"><label className="erp-label">Piso (R$)</label><input className="erp-input num" type="number" step="0.01" min="0" value={form.freight_min_value ?? 0} onChange={(e) => setF("freight_min_value", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c3"><label className="erp-label">R$ por kg</label><input className="erp-input num" type="number" step="0.000001" min="0" value={form.freight_kg_rate ?? 0} onChange={(e) => setF("freight_kg_rate", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c3"><label className="erp-label">Ad valorem %</label><input className="erp-input num" type="number" step="0.01" min="0" max="100" value={form.freight_pct_value ?? 0} onChange={(e) => setF("freight_pct_value", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c3"><label className="erp-label">GRIS %</label><input className="erp-input num" type="number" step="0.01" min="0" max="100" value={form.gris_pct ?? 0} onChange={(e) => setF("gris_pct", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c3"><label className="erp-label">Pedágio / 100 kg</label><input className="erp-input num" type="number" step="0.01" min="0" value={form.toll_per_100kg ?? 0} onChange={(e) => setF("toll_per_100kg", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c3"><label className="erp-label">Seguradora</label><input className="erp-input" value={form.insurance_company ?? ""} onChange={(e) => setF("insurance_company", e.target.value)} /></div>
                          <div className="erp-field erp-c2"><label className="erp-label">Apólice</label><input className="erp-input" value={form.insurance_policy ?? ""} onChange={(e) => setF("insurance_policy", e.target.value)} /></div>
                          <div className="erp-field erp-c2"><label className="erp-label">Validade do seguro</label><input className="erp-input" type="date" value={form.insurance_expiry ?? ""} onChange={(e) => setF("insurance_expiry", e.target.value)} /></div>
                          <div className="erp-field erp-c2"><label className="erp-label">Cobertura (R$)</label><input className="erp-input num" type="number" step="0.01" min="0" value={form.insurance_coverage ?? 0} onChange={(e) => setF("insurance_coverage", Number(e.target.value))} /></div>
                          <div className="erp-field erp-c12"><label className="erp-label">Observações</label><input className="erp-input" value={form.notes ?? ""} onChange={(e) => setF("notes", e.target.value)} /></div>
                        </div>
                      </div>

                      {selecionada?.performance && (
                        <div className="erp-fieldset">
                          <div className="erp-fieldset-head">Avaliação (últimos 12 meses)</div>
                          <div className="erp-fieldset-body">
                            <div className="erp-field erp-c3"><label className="erp-label">Ocorrências</label><input className="erp-input num" value={selecionada.performance.occurrences} readOnly /></div>
                            <div className="erp-field erp-c3"><label className="erp-label">Atraso médio (dias)</label><input className="erp-input num" value={selecionada.performance.average_delay_days} readOnly /></div>
                            <div className="erp-field erp-c3"><label className="erp-label">Custo das ocorrências</label><input className="erp-input num" value={money(selecionada.performance.total_cost_impact)} readOnly /></div>
                            <div className="erp-field erp-c3"><label className="erp-label">Última ocorrência</label><input className="erp-input" value={dataBR(selecionada.performance.last_occurrence_date)} readOnly /></div>
                          </div>
                        </div>
                      )}

                      <div className="erp-fieldset">
                        <div className="erp-fieldset-body">
                          <div className="erp-field erp-c3"><button className="erp-btn erp-btn-primary" onClick={salvar} disabled={busy}>{criando || !form.id ? "Cadastrar" : "Gravar alterações"}</button></div>
                          {selecionada && (
                            <div className="erp-field erp-c3">
                              <button className={`erp-btn ${selecionada.is_active ? "erp-btn-danger" : ""}`} onClick={() => setConfirmarSituacao(selecionada)} disabled={busy}>
                                {selecionada.is_active ? "Inativar" : "Reativar"}
                              </button>
                            </div>
                          )}
                          <div className="erp-field erp-c6">
                            <small className="erp-hint">Gravar envia frota e regiões junto: a grade da tela é o que fica gravado.</small>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {tab === "frota" && (
                    <div className="erp-fieldset">
                      <div className="erp-fieldset-head">Frota e motoristas</div>
                      <div className="erp-fieldset-body">
                        <div className="erp-field erp-c12">
                          <small className="erp-hint">
                            O CT-e e o MDF-e pedem placa; a capacidade é o que permite dizer se a carga cabe antes de
                            fechar a expedição. Aceita placa antiga (AAA9999) e Mercosul (AAA9A99).
                          </small>
                        </div>
                        <div className="erp-field erp-c12">
                          <div className="erp-grid-wrap">
                            <table className="erp-grid">
                              <thead>
                                <tr>
                                  <th style={{ width: 110 }}>Placa</th><th>Descrição</th><th style={{ width: 120 }}>Tipo</th>
                                  <th className="num" style={{ width: 80 }}>Eixos</th><th className="num" style={{ width: 120 }}>Cap. kg</th>
                                  <th className="num" style={{ width: 110 }}>Cap. m³</th><th style={{ width: 150 }}>Motorista</th>
                                  <th style={{ width: 90 }}>Ativo</th><th style={{ width: 90 }} />
                                </tr>
                              </thead>
                              <tbody>
                                {(form.vehicles?.length ?? 0) === 0 && <tr><td colSpan={9} className="erp-grid-empty">Nenhum veículo cadastrado.</td></tr>}
                                {(form.vehicles ?? []).map((v, idx) => (
                                  <tr key={v.id ?? `novo-${idx}`}>
                                    <td><input className="erp-cell-input" value={v.plate} placeholder="AAA1A23" onChange={(e) => setVeiculo(idx, "plate", e.target.value.toUpperCase())} /></td>
                                    <td><input className="erp-cell-input" value={v.description ?? ""} onChange={(e) => setVeiculo(idx, "description", e.target.value)} /></td>
                                    <td><input className="erp-cell-input" value={v.vehicle_type ?? ""} placeholder="TRUCK, CARRETA…" onChange={(e) => setVeiculo(idx, "vehicle_type", e.target.value.toUpperCase())} /></td>
                                    <td><input className="erp-cell-input num" type="number" min="2" max="12" value={v.axles ?? ""} onChange={(e) => setVeiculo(idx, "axles", Number(e.target.value))} /></td>
                                    <td><input className="erp-cell-input num" type="number" step="0.001" min="0" value={v.capacity_kg ?? 0} onChange={(e) => setVeiculo(idx, "capacity_kg", Number(e.target.value))} /></td>
                                    <td><input className="erp-cell-input num" type="number" step="0.001" min="0" value={v.capacity_m3 ?? 0} onChange={(e) => setVeiculo(idx, "capacity_m3", Number(e.target.value))} /></td>
                                    <td><input className="erp-cell-input" value={v.driver_name ?? ""} onChange={(e) => setVeiculo(idx, "driver_name", e.target.value)} /></td>
                                    <td><input type="checkbox" checked={v.is_active !== false} onChange={(e) => setVeiculo(idx, "is_active", e.target.checked)} /></td>
                                    <td><button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => delVeiculo(idx)} disabled={busy}>Remover</button></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div className="erp-field erp-c3"><button className="erp-btn" onClick={addVeiculo} disabled={busy}>+ Veículo</button></div>
                        <div className="erp-field erp-c3"><button className="erp-btn erp-btn-primary" onClick={salvar} disabled={busy}>Gravar</button></div>
                      </div>
                    </div>
                  )}

                  {tab === "regioes" && (
                    <div className="erp-fieldset">
                      <div className="erp-fieldset-head">Regiões atendidas</div>
                      <div className="erp-fieldset-body">
                        <div className="erp-field erp-c12">
                          <small className="erp-hint">
                            É o que responde &quot;esta transportadora entrega neste CEP, em quantos dias e por quanto&quot;.
                            A faixa de CEP é mais específica que a UF e prevalece; valores em branco caem na tabela da capa.
                          </small>
                        </div>
                        <div className="erp-field erp-c12">
                          <div className="erp-grid-wrap">
                            <table className="erp-grid">
                              <thead>
                                <tr>
                                  <th style={{ width: 70 }}>UF</th><th>Cidade</th>
                                  <th style={{ width: 110 }}>CEP de</th><th style={{ width: 110 }}>CEP até</th>
                                  <th className="num" style={{ width: 90 }}>Prazo</th><th className="num" style={{ width: 110 }}>Piso R$</th>
                                  <th className="num" style={{ width: 110 }}>R$/kg</th><th className="num" style={{ width: 90 }}>%</th>
                                  <th style={{ width: 80 }}>Ativa</th><th style={{ width: 90 }} />
                                </tr>
                              </thead>
                              <tbody>
                                {(form.service_areas?.length ?? 0) === 0 && <tr><td colSpan={10} className="erp-grid-empty">Nenhuma região cadastrada — sem isso o prazo de entrega não pode ser calculado.</td></tr>}
                                {(form.service_areas ?? []).map((a, idx) => (
                                  <tr key={a.id ?? `nova-${idx}`}>
                                    <td><input className="erp-cell-input" maxLength={2} value={a.state ?? ""} onChange={(e) => setRegiao(idx, "state", e.target.value.toUpperCase())} /></td>
                                    <td><input className="erp-cell-input" value={a.city ?? ""} onChange={(e) => setRegiao(idx, "city", e.target.value)} /></td>
                                    <td><input className="erp-cell-input num" value={a.postal_code_from ?? ""} placeholder="01000000" onChange={(e) => setRegiao(idx, "postal_code_from", e.target.value)} /></td>
                                    <td><input className="erp-cell-input num" value={a.postal_code_to ?? ""} placeholder="01999999" onChange={(e) => setRegiao(idx, "postal_code_to", e.target.value)} /></td>
                                    <td><input className="erp-cell-input num" type="number" min="0" value={a.lead_days ?? 0} onChange={(e) => setRegiao(idx, "lead_days", Number(e.target.value))} /></td>
                                    <td><input className="erp-cell-input num" type="number" step="0.01" min="0" value={a.min_value ?? 0} onChange={(e) => setRegiao(idx, "min_value", Number(e.target.value))} /></td>
                                    <td><input className="erp-cell-input num" type="number" step="0.000001" min="0" value={a.kg_rate ?? 0} onChange={(e) => setRegiao(idx, "kg_rate", Number(e.target.value))} /></td>
                                    <td><input className="erp-cell-input num" type="number" step="0.01" min="0" max="100" value={a.pct_value ?? 0} onChange={(e) => setRegiao(idx, "pct_value", Number(e.target.value))} /></td>
                                    <td><input type="checkbox" checked={a.is_active !== false} onChange={(e) => setRegiao(idx, "is_active", e.target.checked)} /></td>
                                    <td><button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => delRegiao(idx)} disabled={busy}>Remover</button></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div className="erp-field erp-c3"><button className="erp-btn" onClick={addRegiao} disabled={busy}>+ Região</button></div>
                        <div className="erp-field erp-c3"><button className="erp-btn erp-btn-primary" onClick={salvar} disabled={busy}>Gravar</button></div>
                      </div>
                    </div>
                  )}

                  {tab === "ocorrencias" && selecionada && (
                    <div className="erp-fieldset">
                      <div className="erp-fieldset-head">Ocorrências de entrega</div>
                      <div className="erp-fieldset-body">
                        <div className="erp-field erp-c12">
                          <small className="erp-hint">
                            É a memória que transforma &quot;essa transportadora atrasa&quot; em número — e é ela que alimenta
                            a avaliação mostrada na aba de dados.
                          </small>
                        </div>
                        <div className="erp-field erp-c2"><label className="erp-label">Data</label><input className="erp-input" type="date" value={novaOcorrencia.occurrence_date} onChange={(e) => setNovaOcorrencia((p) => ({ ...p, occurrence_date: e.target.value }))} /></div>
                        <div className="erp-field erp-c2">
                          <label className="erp-label">Tipo</label>
                          <select className="erp-input" value={novaOcorrencia.occurrence_type} onChange={(e) => setNovaOcorrencia((p) => ({ ...p, occurrence_type: e.target.value }))}>
                            {CARRIER_OCCURRENCE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                          </select>
                        </div>
                        <div className="erp-field erp-c2"><label className="erp-label">Pedido</label><input className="erp-input num" type="number" value={novaOcorrencia.sales_order_code ?? ""} onChange={(e) => setNovaOcorrencia((p) => ({ ...p, sales_order_code: e.target.value ? Number(e.target.value) : undefined }))} /></div>
                        <div className="erp-field erp-c1"><label className="erp-label">Atraso (d)</label><input className="erp-input num" type="number" min="0" value={novaOcorrencia.delay_days ?? 0} onChange={(e) => setNovaOcorrencia((p) => ({ ...p, delay_days: Number(e.target.value) }))} /></div>
                        <div className="erp-field erp-c2"><label className="erp-label">Custo (R$)</label><input className="erp-input num" type="number" step="0.01" min="0" value={novaOcorrencia.cost_impact ?? 0} onChange={(e) => setNovaOcorrencia((p) => ({ ...p, cost_impact: Number(e.target.value) }))} /></div>
                        <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={lancarOcorrencia} disabled={busy}>Registrar</button></div>
                        <div className="erp-field erp-c12"><label className="erp-label">Descrição</label><input className="erp-input" value={novaOcorrencia.description ?? ""} onChange={(e) => setNovaOcorrencia((p) => ({ ...p, description: e.target.value }))} /></div>

                        <div className="erp-field erp-c12">
                          <div className="erp-grid-wrap">
                            <table className="erp-grid">
                              <thead><tr><th style={{ width: 120 }}>Data</th><th style={{ width: 170 }}>Tipo</th><th className="num" style={{ width: 100 }}>Pedido</th><th className="num" style={{ width: 90 }}>Atraso</th><th className="num" style={{ width: 120 }}>Custo</th><th>Descrição</th></tr></thead>
                              <tbody>
                                {ocorrencias.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhuma ocorrência registrada.</td></tr>}
                                {ocorrencias.map((o) => (
                                  <tr key={o.id}>
                                    <td>{dataBR(o.occurrence_date)}</td>
                                    <td>{o.occurrence_type.replace(/_/g, " ")}</td>
                                    <td className="num">{o.sales_order_code ?? "—"}</td>
                                    <td className="num">{o.delay_days ?? 0}</td>
                                    <td className="num">{money(o.cost_impact)}</td>
                                    <td>{o.description || "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="erp-detail-body">
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">Cotação comparativa de frete</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c12">
                      <small className="erp-hint">
                        Responde a pergunta da expedição: quem leva, por quanto e em quantos dias. Compara todas as
                        transportadoras ativas que atendem o destino, com o frete aberto em componentes.
                      </small>
                    </div>
                    <div className="erp-field erp-c1"><label className="erp-label">UF</label><input className="erp-input" maxLength={2} value={carga.uf} onChange={(e) => setCarga((p) => ({ ...p, uf: e.target.value.toUpperCase() }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">CEP</label><input className="erp-input num" value={carga.cep} onChange={(e) => setCarga((p) => ({ ...p, cep: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Peso (kg)</label><input className="erp-input num" type="number" step="0.001" min="0" value={carga.peso} onChange={(e) => setCarga((p) => ({ ...p, peso: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Volume (m³)</label><input className="erp-input num" type="number" step="0.001" min="0" value={carga.volume} onChange={(e) => setCarga((p) => ({ ...p, volume: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Valor da carga</label><input className="erp-input num" type="number" step="0.01" min="0" value={carga.valor} onChange={(e) => setCarga((p) => ({ ...p, valor: e.target.value }))} /></div>
                    <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-dark" onClick={cotar} disabled={busy}>Cotar frete</button></div>

                    {cotacao && (
                      <div className="erp-field erp-c12">
                        <div className="erp-grid-wrap">
                          <table className="erp-grid">
                            <thead>
                              <tr>
                                <th>Transportadora</th><th style={{ width: 150 }}>Região</th>
                                <th className="num" style={{ width: 110 }}>Peso</th><th className="num" style={{ width: 110 }}>Ad valorem</th>
                                <th className="num" style={{ width: 100 }}>GRIS</th><th className="num" style={{ width: 100 }}>Pedágio</th>
                                <th className="num" style={{ width: 120 }}>Total</th><th className="num" style={{ width: 80 }}>Prazo</th>
                                <th style={{ width: 130 }}>Previsão</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cotacao.quotes.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">Nenhuma transportadora ativa atende este destino.</td></tr>}
                              {cotacao.quotes.map((q) => (
                                <tr key={q.carrier_id}>
                                  <td>
                                    {q.supplier_name}
                                    {cotacao.cheapest_carrier_id === q.carrier_id && <span className="erp-badge ok" style={{ marginLeft: 6 }}>mais barata</span>}
                                    {cotacao.fastest_carrier_id === q.carrier_id && <span className="erp-badge info" style={{ marginLeft: 6 }}>mais rápida</span>}
                                    {q.alerts.length > 0 && <span className="erp-badge warn" style={{ marginLeft: 6 }}>{q.alerts.length} pendência(s)</span>}
                                  </td>
                                  <td>{q.service_area}</td>
                                  <td className="num">{money(q.weight_value)}</td>
                                  <td className="num">{money(q.ad_valorem_value)}</td>
                                  <td className="num">{money(q.gris_value)}</td>
                                  <td className="num">{money(q.toll_value)}</td>
                                  <td className="num"><strong>{money(q.total)}</strong>{q.minimum_applied && <span className="erp-badge draft" style={{ marginLeft: 4 }}>piso</span>}</td>
                                  <td className="num">{q.lead_days}d</td>
                                  <td>{dataBR(q.estimated_delivery)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {cotacao.not_served_by.length > 0 && (
                          <small className="erp-hint" style={{ marginTop: 6 }}>
                            Não atendem: {cotacao.not_served_by.join(" · ")}
                          </small>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="erp-detail-empty">
                  <div className="erp-detail-empty-title">Nenhuma transportadora selecionada</div>
                  <div className="erp-detail-empty-sub">Escolha uma transportadora na lista ao lado para ver frota, regiões e ocorrências, ou use a cotação acima para comparar frete.</div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <ConfirmDialog
        aberto={confirmarSituacao !== null}
        titulo={confirmarSituacao?.is_active ? "Inativar transportadora" : "Reativar transportadora"}
        assunto={confirmarSituacao ? `${confirmarSituacao.supplier_name ?? ""} (fornecedor ${confirmarSituacao.supplier_code})` : ""}
        mensagem={confirmarSituacao?.is_active
          ? "A transportadora deixa de aparecer na cotação de frete. O cadastro de fornecedor e os pedidos já emitidos não mudam."
          : "A transportadora volta a aparecer na cotação de frete."}
        rotuloConfirmar={confirmarSituacao?.is_active ? "Inativar" : "Reativar"}
        onConfirmar={mudarSituacao}
        onCancelar={() => setConfirmarSituacao(null)}
      />

      <footer className="erp-statusbar">
        <div className="erp-status-item">Transportadoras: <strong>{visiveis.length}</strong></div>
        {selecionada && <div className="erp-status-item">Selecionada: <strong>{selecionada.supplier_name}</strong> · {carrierModalLabel(selecionada.modal)}</div>}
        {cotacao && <div className="erp-status-item">Cotação: <strong>{cotacao.quotes.length}</strong> opção(ões) para {cotacao.destination}</div>}
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

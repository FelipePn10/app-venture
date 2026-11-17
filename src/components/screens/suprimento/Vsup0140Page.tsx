import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  BODY_TYPES,
  CARRIER_FREIGHT_TYPES,
  CARRIER_MODALS,
  CARRIER_SHIPPER_TYPES,
  CNH_CATEGORIES,
  OWNER_TYPES,
  WHEEL_TYPES,
  deleteOccurrenceType,
  deleteShippingCarrier,
  deleteVehicleType,
  getShippingCarrierUsage,
  listOccurrenceTypes,
  listVehicleTypes,
  saveOccurrenceType,
  saveVehicleType,
  type CarrierUsageDTO,
  type OccurrenceTypeDTO,
  type VehicleTypeDTO,
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
import { hojeLocal } from "@/utils/dataLocal";
import { useAuthStore } from "@/store/authStore";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
type DetailTab = "dados" | "frota" | "regioes" | "ocorrencias";
/** Cadastros de apoio da transportadora, todos nesta tela. */
type ApoioTab = "veiculos" | "ocorrencias";
const TIPO_VEICULO_VAZIO: VehicleTypeDTO = { code: "", description: "", is_active: true };
const TIPO_OCORRENCIA_VAZIO: OccurrenceTypeDTO = { code: "", description: "", counts_as_failure: true, is_active: true };
const rotulo = (lista: readonly { value: string; label: string }[], v?: string) => lista.find((x) => x.value === v)?.label ?? "—";

const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dataBR = (iso?: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
const hoje = () => hojeLocal();

const VAZIO: ShippingCarrierDTO = {
  supplier_code: 0, modal: "RODOVIARIO", issues_cte: true, is_active: true,
  freight_min_value: 0, freight_kg_rate: 0, freight_pct_value: 0, gris_pct: 0,
  toll_per_100kg: 0, insurance_coverage: 0, vehicles: [], service_areas: [],
  // Sempre enviados: sem eles o backend entende que é a tela antiga e mantém o gravado.
  cubage_factor: 0, dispatch_fee: 0, accepts_dangerous_goods: false,
};

const VEICULO_VAZIO: CarrierVehicleDTO = { plate: "", capacity_kg: 0, capacity_m3: 0, tare_kg: 0, is_active: true };
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
  /** Excluir (transportadora e apoio) é só do administrador, como no backend. */
  const isAdmin = useAuthStore((st) => st.user?.role?.toUpperCase() === "ADMIN");
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
  const [carga, setCarga] = useState({ uf: "", cidade: "", cep: "", peso: "100", volume: "", valor: "10000" });
  const [confirmarSituacao, setConfirmarSituacao] = useState<ShippingCarrierDTO | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState<ShippingCarrierDTO | null>(null);
  /** Onde a transportadora aberta está gravada: decide se Excluir/Inativar aparecem. */
  const [uso, setUso] = useState<CarrierUsageDTO | null>(null);
  /** Veículo cujos dados do MDF-e e do motorista estão abertos abaixo da grade. */
  const [veiculoAberto, setVeiculoAberto] = useState<number | null>(null);
  const [perigoso, setPerigoso] = useState(false);

  // ── Cadastros de apoio ────────────────────────────────────────────────────
  const [apoio, setApoio] = useState(false);
  const [apoioTab, setApoioTab] = useState<ApoioTab>("veiculos");
  const [tiposVeiculo, setTiposVeiculo] = useState<VehicleTypeDTO[]>([]);
  const [tiposOcorrencia, setTiposOcorrencia] = useState<OccurrenceTypeDTO[]>([]);
  const [tipoVeiculo, setTipoVeiculo] = useState<VehicleTypeDTO>(TIPO_VEICULO_VAZIO);
  const [tipoOcorrencia, setTipoOcorrencia] = useState<OccurrenceTypeDTO>(TIPO_OCORRENCIA_VAZIO);
  const [confirmarApoio, setConfirmarApoio] = useState<{ tipo: ApoioTab; id: number; nome: string } | null>(null);

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

  const carregarApoio = useCallback(async () => {
    const [v, o] = await Promise.all([listVehicleTypes(), listOccurrenceTypes()]);
    setTiposVeiculo(v); setTiposOcorrencia(o);
  }, []);
  // A frota e as ocorrências escolhem do apoio, então ele é carregado já na abertura.
  useEffect(() => { void run(carregarApoio); }, [run, carregarApoio]);

  const salvarTipoVeiculo = () => run(async () => {
    if (!tipoVeiculo.code.trim() || !tipoVeiculo.description.trim()) { setFeedback({ type: "error", message: "Informe código e descrição do tipo de veículo." }); return; }
    await saveVehicleType(tipoVeiculo);
    setTipoVeiculo(TIPO_VEICULO_VAZIO); await carregarApoio();
    setFeedback({ type: "success", message: "Tipo de veículo gravado." });
  });
  const salvarTipoOcorrencia = () => run(async () => {
    if (!tipoOcorrencia.code.trim() || !tipoOcorrencia.description.trim()) { setFeedback({ type: "error", message: "Informe código e descrição do tipo de ocorrência." }); return; }
    await saveOccurrenceType(tipoOcorrencia);
    setTipoOcorrencia(TIPO_OCORRENCIA_VAZIO); await carregarApoio();
    setFeedback({ type: "success", message: "Tipo de ocorrência gravado." });
  });
  const excluirApoio = () => { const alvo = confirmarApoio; setConfirmarApoio(null); if (!alvo) return; void run(async () => {
    if (alvo.tipo === "veiculos") await deleteVehicleType(alvo.id); else await deleteOccurrenceType(alvo.id);
    await carregarApoio();
    setFeedback({ type: "success", message: `${alvo.nome} excluído.` });
  }); };

  const abrir = (id?: number) => { if (!id) return; void run(async () => {
    const detalhe = await getShippingCarrier(id);
    setSelecionada(detalhe); setForm({ ...detalhe }); setCriando(false); setTab("dados"); setVeiculoAberto(null); setApoio(false);
    setOcorrencias(await listCarrierOccurrences(id).catch(() => []));
    setUso(await getShippingCarrierUsage(id).catch(() => null));
  }); };

  const nova = () => { setCriando(true); setSelecionada(null); setForm({ ...VAZIO }); setOcorrencias([]); setUso(null); setVeiculoAberto(null); setApoio(false); setTab("dados"); setFeedback(null); };
  /** Fecha a transportadora aberta e devolve a tela à comparação de frete. */
  const fecharDetalhe = () => { setCriando(false); setSelecionada(null); setForm({ ...VAZIO }); setOcorrencias([]); setUso(null); setVeiculoAberto(null); setTab("dados"); setFeedback(null); };

  const setF = <K extends keyof ShippingCarrierDTO>(k: K, v: ShippingCarrierDTO[K]) => setForm((p) => ({ ...p, [k]: v }));

  const salvar = () => run(async () => {
    if (!form.supplier_code) { setFeedback({ type: "error", message: "Informe o fornecedor que é a transportadora." }); return; }
    const salva = criando || !form.id
      ? await createShippingCarrier(form)
      : await updateShippingCarrier(form.id, form);
    setSelecionada(salva); setForm({ ...salva }); setCriando(false);
    if (salva.id) setUso(await getShippingCarrierUsage(salva.id).catch(() => null));
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

  const excluir = () => { const alvo = confirmarExclusao; setConfirmarExclusao(null); if (!alvo?.id) return; void run(async () => {
    await deleteShippingCarrier(alvo.id!);
    fecharDetalhe(); await carregarLista();
    setFeedback({ type: "success", message: "Transportadora excluída." });
  }); };

  /** "2 cargas (1 em aberto), 3 notas fiscais" — o que trava excluir ou inativar. */
  const usoTexto = (u: CarrierUsageDTO | null, somenteAbertos = false) => (u?.documents ?? [])
    .filter((d) => (somenteAbertos ? d.open : d.total) > 0)
    .map((d) => somenteAbertos ? `${d.open} ${d.document}` : `${d.total} ${d.document}${d.open ? ` (${d.open} em aberto)` : ""}`)
    .join(", ");

  // ─── Frota e regiões: grades editadas na memória e gravadas com a capa ──────
  const addVeiculo = () => setF("vehicles", [...(form.vehicles ?? []), { ...VEICULO_VAZIO }]);
  const setVeiculo = (idx: number, campo: keyof CarrierVehicleDTO, valor: string | number | boolean | undefined) =>
    setF("vehicles", (form.vehicles ?? []).map((v, i) => (i === idx ? { ...v, [campo]: valor } : v)));
  const delVeiculo = (idx: number) => { setVeiculoAberto(null); setF("vehicles", (form.vehicles ?? []).filter((_, i) => i !== idx)); };
  /** Escolher o tipo traz rodado, carroceria, eixos e capacidade do cadastro de apoio (o que já foi digitado fica). */
  const escolherTipo = (idx: number, id?: number) => {
    const t = tiposVeiculo.find((x) => x.id === id);
    setF("vehicles", (form.vehicles ?? []).map((v, i) => i !== idx ? v : {
      ...v, vehicle_type_id: id, vehicle_type: t?.code ?? v.vehicle_type,
      wheel_type: v.wheel_type || t?.wheel_type, body_type: v.body_type || t?.body_type, axles: v.axles || t?.axles,
      capacity_kg: v.capacity_kg || t?.capacity_kg, capacity_m3: v.capacity_m3 || t?.capacity_m3,
    }));
  };

  const addRegiao = () => setF("service_areas", [...(form.service_areas ?? []), { ...REGIAO_VAZIA }]);
  const setRegiao = (idx: number, campo: keyof CarrierServiceAreaDTO, valor: string | number | boolean | undefined) =>
    setF("service_areas", (form.service_areas ?? []).map((a, i) => (i === idx ? { ...a, [campo]: valor } : a)));
  /**
   * Campo numérico da região em branco significa "usa a tabela de frete da
   * transportadora", não zero. `Number("")` devolve 0, então limpar o campo
   * gravava um zero explícito e a região passava a cobrar nada em vez de herdar
   * o padrão — diferença que só aparecia na cotação.
   */
  const numeroOuHerda = (v: string): number | undefined => (v.trim() === "" ? undefined : Number(v));
  const delRegiao = (idx: number) => setF("service_areas", (form.service_areas ?? []).filter((_, i) => i !== idx));

  /**
   * O tipo que vai gravado é o que o select mostra: se o tipo guardado no
   * formulário foi inativado ou excluído no apoio, vale o primeiro ativo —
   * antes a tela exibia um e enviava outro, e o backend recusava.
   */
  const tiposAtivos = tiposOcorrencia.filter((t) => t.is_active);
  const tipoEscolhido = tiposAtivos.some((t) => t.code === novaOcorrencia.occurrence_type)
    ? novaOcorrencia.occurrence_type : (tiposAtivos[0]?.code ?? "");

  const lancarOcorrencia = () => { const id = selecionada?.id; if (!id) return; void run(async () => {
    if (!tipoEscolhido) { setFeedback({ type: "error", message: "Cadastre um tipo de ocorrência ativo em Cadastros de apoio." }); return; }
    await createCarrierOccurrence(id, { ...novaOcorrencia, occurrence_type: tipoEscolhido });
    setOcorrencias(await listCarrierOccurrences(id));
    const detalhe = await getShippingCarrier(id);
    setSelecionada(detalhe);
    setNovaOcorrencia({ occurrence_date: hoje(), occurrence_type: "ATRASO", delay_days: 0, cost_impact: 0 });
    setUso(await getShippingCarrierUsage(id).catch(() => null));
    setFeedback({ type: "success", message: "Ocorrência registrada — entra na avaliação da transportadora." });
  }); };

  const cotar = () => run(async () => {
    if (!carga.uf && !carga.cep) { setFeedback({ type: "error", message: "Informe a UF ou o CEP do destino." }); return; }
    setCotacao(await quoteFreight({
      uf: carga.uf || undefined, city: carga.cidade || undefined, cep: carga.cep || undefined,
      weightKg: Number(carga.peso) || 0,
      volumeM3: carga.volume ? Number(carga.volume) : undefined,
      cargoValue: Number(carga.valor) || 0,
      dangerous: perigoso,
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
          <button className={`erp-btn${apoio ? " erp-btn-primary" : ""}`} onClick={() => { setApoio((v) => !v); setFeedback(null); if (!apoio) void run(carregarApoio); }} disabled={busy}>
            Cadastros de apoio
          </button>
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

        {apoio && (
          <section className="erp-detail-panel">
            <div className="erp-tabs">
              <button className={`erp-tab${apoioTab === "veiculos" ? " active" : ""}`} onClick={() => setApoioTab("veiculos")}>Tipos de veículo ({tiposVeiculo.length})</button>
              <button className={`erp-tab${apoioTab === "ocorrencias" ? " active" : ""}`} onClick={() => setApoioTab("ocorrencias")}>Tipos de ocorrência ({tiposOcorrencia.length})</button>
            </div>
            <div className="erp-detail-body">
              {apoioTab === "veiculos" && (<>
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">{tipoVeiculo.id ? `Editando o tipo ${tipoVeiculo.code}` : "Novo tipo de veículo"}</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c12"><small className="erp-hint">Escolhido na frota, o tipo preenche rodado, carroceria, eixos e capacidade do veículo — os códigos que o MDF-e pede. O código não muda depois de criado.</small></div>
                    <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label><input className="erp-input" maxLength={20} value={tipoVeiculo.code} disabled={!!tipoVeiculo.id} onChange={(e) => setTipoVeiculo((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="TRUCK" /></div>
                    <div className="erp-field erp-c4"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={tipoVeiculo.description} onChange={(e) => setTipoVeiculo((p) => ({ ...p, description: e.target.value }))} /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Rodado (MDF-e)</label><select className="erp-input" value={tipoVeiculo.wheel_type ?? ""} onChange={(e) => setTipoVeiculo((p) => ({ ...p, wheel_type: e.target.value || undefined }))}><option value="">—</option>{WHEEL_TYPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></div>
                    <div className="erp-field erp-c3"><label className="erp-label">Carroceria (MDF-e)</label><select className="erp-input" value={tipoVeiculo.body_type ?? ""} onChange={(e) => setTipoVeiculo((p) => ({ ...p, body_type: e.target.value || undefined }))}><option value="">—</option>{BODY_TYPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Eixos</label><input className="erp-input num" type="number" min="2" max="12" value={tipoVeiculo.axles ?? ""} onChange={(e) => setTipoVeiculo((p) => ({ ...p, axles: e.target.value ? Number(e.target.value) : undefined }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Capacidade kg</label><input className="erp-input num" type="number" min="0" step="0.001" value={tipoVeiculo.capacity_kg ?? 0} onChange={(e) => setTipoVeiculo((p) => ({ ...p, capacity_kg: Number(e.target.value) }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Capacidade m³</label><input className="erp-input num" type="number" min="0" step="0.001" value={tipoVeiculo.capacity_m3 ?? 0} onChange={(e) => setTipoVeiculo((p) => ({ ...p, capacity_m3: Number(e.target.value) }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-check"><input type="checkbox" checked={tipoVeiculo.is_active !== false} onChange={(e) => setTipoVeiculo((p) => ({ ...p, is_active: e.target.checked }))} />Ativo</label></div>
                    <div className="erp-field erp-c4" style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
                      <button className="erp-btn erp-btn-primary" onClick={salvarTipoVeiculo} disabled={busy}>{tipoVeiculo.id ? "Gravar alterações" : "Cadastrar"}</button>
                      {tipoVeiculo.id && <button className="erp-btn" onClick={() => setTipoVeiculo(TIPO_VEICULO_VAZIO)} disabled={busy}>Cancelar</button>}
                    </div>
                  </div>
                </div>
                <div className="erp-grid-wrap"><table className="erp-grid">
                  <thead><tr><th>Código</th><th>Descrição</th><th>Rodado</th><th>Carroceria</th><th className="num">Eixos</th><th className="num">Cap. kg</th><th className="num">Cap. m³</th><th className="num">Veículos</th><th>Situação</th><th style={{ width: 150 }} /></tr></thead>
                  <tbody>
                    {tiposVeiculo.length === 0 && <tr><td colSpan={10} className="erp-grid-empty">Nenhum tipo de veículo cadastrado.</td></tr>}
                    {tiposVeiculo.map((t) => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600 }}>{t.code}</td><td>{t.description}</td>
                        <td>{rotulo(WHEEL_TYPES, t.wheel_type)}</td><td>{rotulo(BODY_TYPES, t.body_type)}</td>
                        <td className="num">{t.axles ?? "—"}</td><td className="num">{t.capacity_kg ?? 0}</td><td className="num">{t.capacity_m3 ?? 0}</td>
                        <td className="num">{t.in_use ?? 0}</td>
                        <td>{t.is_active ? <span className="erp-badge ok">Ativo</span> : <span className="erp-badge err">Inativo</span>}</td>
                        <td>
                          <button className="erp-btn erp-btn-sm" onClick={() => setTipoVeiculo({ ...t })} disabled={busy}>Editar</button>{" "}
                          <button className="erp-btn erp-btn-sm erp-btn-danger" disabled={busy || !isAdmin || (t.in_use ?? 0) > 0} title={!isAdmin ? "Somente o administrador" : (t.in_use ?? 0) > 0 ? "Em uso na frota: inative em vez de excluir" : undefined} onClick={() => setConfirmarApoio({ tipo: "veiculos", id: t.id!, nome: `Tipo de veículo ${t.code}` })}>Excluir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </>)}

              {apoioTab === "ocorrencias" && (<>
                <div className="erp-fieldset">
                  <div className="erp-fieldset-head">{tipoOcorrencia.id ? `Editando o tipo ${tipoOcorrencia.code}` : "Novo tipo de ocorrência"}</div>
                  <div className="erp-fieldset-body">
                    <div className="erp-field erp-c12"><small className="erp-hint">&quot;Conta como falha&quot; decide se a ocorrência pesa contra a transportadora na avaliação: avaria e extravio pesam; reentrega a pedido do cliente e elogio não. O código fica gravado nas ocorrências e não muda depois de criado.</small></div>
                    <div className="erp-field erp-c3"><label className="erp-label erp-req">Código</label><input className="erp-input" maxLength={40} value={tipoOcorrencia.code} disabled={!!tipoOcorrencia.id} onChange={(e) => setTipoOcorrencia((p) => ({ ...p, code: e.target.value.toUpperCase().replace(/\s+/g, "_") }))} placeholder="AVARIA" /></div>
                    <div className="erp-field erp-c5"><label className="erp-label erp-req">Descrição</label><input className="erp-input" value={tipoOcorrencia.description} onChange={(e) => setTipoOcorrencia((p) => ({ ...p, description: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-check"><input type="checkbox" checked={tipoOcorrencia.counts_as_failure !== false} onChange={(e) => setTipoOcorrencia((p) => ({ ...p, counts_as_failure: e.target.checked }))} />Conta como falha</label></div>
                    <div className="erp-field erp-c2"><label className="erp-check"><input type="checkbox" checked={tipoOcorrencia.is_active !== false} onChange={(e) => setTipoOcorrencia((p) => ({ ...p, is_active: e.target.checked }))} />Ativo</label></div>
                    <div className="erp-field erp-c4" style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
                      <button className="erp-btn erp-btn-primary" onClick={salvarTipoOcorrencia} disabled={busy}>{tipoOcorrencia.id ? "Gravar alterações" : "Cadastrar"}</button>
                      {tipoOcorrencia.id && <button className="erp-btn" onClick={() => setTipoOcorrencia(TIPO_OCORRENCIA_VAZIO)} disabled={busy}>Cancelar</button>}
                    </div>
                  </div>
                </div>
                <div className="erp-grid-wrap"><table className="erp-grid">
                  <thead><tr><th>Código</th><th>Descrição</th><th>Conta como falha</th><th className="num">Ocorrências</th><th>Situação</th><th style={{ width: 150 }} /></tr></thead>
                  <tbody>
                    {tiposOcorrencia.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum tipo de ocorrência cadastrado.</td></tr>}
                    {tiposOcorrencia.map((t) => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600 }}>{t.code}</td><td>{t.description}</td>
                        <td>{t.counts_as_failure ? "Sim" : "Não"}</td><td className="num">{t.in_use ?? 0}</td>
                        <td>{t.is_active ? <span className="erp-badge ok">Ativo</span> : <span className="erp-badge err">Inativo</span>}</td>
                        <td>
                          <button className="erp-btn erp-btn-sm" onClick={() => setTipoOcorrencia({ ...t })} disabled={busy}>Editar</button>{" "}
                          <button className="erp-btn erp-btn-sm erp-btn-danger" disabled={busy || !isAdmin || (t.in_use ?? 0) > 0} title={!isAdmin ? "Somente o administrador" : (t.in_use ?? 0) > 0 ? "Já usado em ocorrências: inative em vez de excluir" : undefined} onClick={() => setConfirmarApoio({ tipo: "ocorrencias", id: t.id!, nome: `Tipo de ocorrência ${t.code}` })}>Excluir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </>)}
            </div>
          </section>
        )}

        {!apoio && (
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
                  <div className="erp-list-meta" style={{ flexWrap: "wrap", rowGap: 4 }}>
                    <span className="erp-badge info">{carrierModalLabel(c.modal)}</span>
                    {c.antt_rntrc && <span className="erp-badge draft">RNTRC {c.antt_rntrc}</span>}
                    {!c.is_active && <span className="erp-badge err">Inativa</span>}
                    {(c.alerts?.length ?? 0) > 0 && <span className="erp-badge warn">{c.alerts!.length} pendência(s)</span>}
                    <span className="erp-list-money" style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>{c.service_areas?.length ?? 0} região(ões)</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="erp-detail-panel">
            {criando || selecionada ? (
              <>
                <div className="erp-tabs">
                  {/*
                    A comparação de frete só aparece quando nenhuma transportadora
                    está aberta, e nada limpava a seleção: quem abrisse uma
                    transportadora ficava sem caminho de volta para a cotação.
                  */}
                  <button className="erp-tab" onClick={fecharDetalhe} title="Voltar para a comparação de frete">
                    ← Comparar frete
                  </button>
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
                              disabled={!criando && !!form.id && (uso === null || uso.documents.length > 0)}
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
                            <label className="erp-label">Prazo médio (dias úteis)</label>
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
                          <div className="erp-field erp-c3">
                            <label className="erp-label">Fator de cubagem (kg/m³)</label>
                            <input className="erp-input num" type="number" step="0.001" min="0" value={form.cubage_factor ?? 0} onChange={(e) => setF("cubage_factor", Number(e.target.value))} />
                            <small className="erp-hint">Cobra pelo maior entre peso real e volume × fator (rodoviário: 300). 0 = só peso real.</small>
                          </div>
                          <div className="erp-field erp-c3">
                            <label className="erp-label">Taxa de despacho (R$)</label>
                            <input className="erp-input num" type="number" step="0.01" min="0" value={form.dispatch_fee ?? 0} onChange={(e) => setF("dispatch_fee", Number(e.target.value))} />
                            <small className="erp-hint">Por embarque, somada ao frete (taxa de CT-e/despacho).</small>
                          </div>
                          <div className="erp-field erp-c3">
                            <label className="erp-check"><input type="checkbox" checked={!!form.accepts_dangerous_goods} onChange={(e) => setF("accepts_dangerous_goods", e.target.checked)} />Aceita produto perigoso</label>
                            <small className="erp-hint">Sem isso, fica fora da cotação de carga perigosa.</small>
                          </div>
                          <div className="erp-field erp-c12"><label className="erp-label">Observações</label><input className="erp-input" value={form.notes ?? ""} onChange={(e) => setF("notes", e.target.value)} /></div>
                        </div>
                      </div>

                      {selecionada?.performance && (
                        <div className="erp-fieldset">
                          <div className="erp-fieldset-head">Avaliação (últimos 12 meses)</div>
                          <div className="erp-fieldset-body">
                            <div className="erp-field erp-c2"><label className="erp-label">Ocorrências</label><input className="erp-input num" value={selecionada.performance.occurrences} readOnly /></div>
                            <div className="erp-field erp-c2"><label className="erp-label">Falhas</label><input className="erp-input num" value={selecionada.performance.failures} readOnly /></div>
                            <div className="erp-field erp-c2"><label className="erp-label">Atraso médio (dias)</label><input className="erp-input num" value={selecionada.performance.average_delay_days} readOnly /></div>
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
                              <button className={`erp-btn ${selecionada.is_active ? "erp-btn-danger" : ""}`} onClick={() => setConfirmarSituacao(selecionada)}
                                disabled={busy || (selecionada.is_active && uso !== null && !uso.can_deactivate)}
                                title={selecionada.is_active && uso && !uso.can_deactivate ? `Em uso: ${usoTexto(uso, true)}` : undefined}>
                                {selecionada.is_active ? "Inativar" : "Reativar"}
                              </button>
                            </div>
                          )}
                          {selecionada && uso?.can_delete && isAdmin && (
                            <div className="erp-field erp-c3">
                              <button className="erp-btn erp-btn-danger" onClick={() => setConfirmarExclusao(selecionada)} disabled={busy}>Excluir</button>
                            </div>
                          )}
                          <div className="erp-field erp-c12">
                            <small className="erp-hint">
                              Gravar envia frota e regiões junto: a grade da tela é o que fica gravado.
                              {uso && uso.documents.length > 0 && <> Em uso em {usoTexto(uso)}: o fornecedor não pode ser trocado e a transportadora não pode ser excluída{!uso.can_deactivate && <>; inativar só depois de concluir ou trocar a transportadora em {usoTexto(uso, true)}</>}.</>}
                            </small>
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
                                  <th style={{ width: 105 }}>Placa</th><th style={{ width: 60 }}>UF</th><th style={{ width: 150 }}>Tipo</th>
                                  <th className="num" style={{ width: 65 }}>Eixos</th><th className="num" style={{ width: 105 }}>Cap. kg</th>
                                  <th className="num" style={{ width: 95 }}>Cap. m³</th><th className="num" style={{ width: 95 }}>Tara kg</th><th>Motorista</th>
                                  <th style={{ width: 60 }}>Ativo</th><th style={{ width: 165 }} />
                                </tr>
                              </thead>
                              <tbody>
                                {(form.vehicles?.length ?? 0) === 0 && <tr><td colSpan={10} className="erp-grid-empty">Nenhum veículo cadastrado.</td></tr>}
                                {(form.vehicles ?? []).map((v, idx) => (
                                  <tr key={v.id ?? `novo-${idx}`} className={veiculoAberto === idx ? "sel" : undefined}>
                                    <td><input className="erp-cell-input" value={v.plate} placeholder="AAA1A23" onChange={(e) => setVeiculo(idx, "plate", e.target.value.toUpperCase())} /></td>
                                    <td><input className="erp-cell-input" maxLength={2} value={v.plate_state ?? ""} onChange={(e) => setVeiculo(idx, "plate_state", e.target.value.toUpperCase())} /></td>
                                    <td>
                                      <select className="erp-cell-input" value={v.vehicle_type_id ?? ""} onChange={(e) => escolherTipo(idx, e.target.value ? Number(e.target.value) : undefined)}>
                                        <option value="">{v.vehicle_type && !v.vehicle_type_id ? v.vehicle_type : "—"}</option>
                                        {tiposVeiculo.filter((t) => t.is_active || t.id === v.vehicle_type_id).map((t) => <option key={t.id} value={t.id}>{t.code}</option>)}
                                      </select>
                                    </td>
                                    <td><input className="erp-cell-input num" type="number" min="2" max="12" value={v.axles ?? ""} onChange={(e) => setVeiculo(idx, "axles", e.target.value ? Number(e.target.value) : undefined)} /></td>
                                    <td><input className="erp-cell-input num" type="number" step="0.001" min="0" value={v.capacity_kg ?? 0} onChange={(e) => setVeiculo(idx, "capacity_kg", Number(e.target.value))} /></td>
                                    <td><input className="erp-cell-input num" type="number" step="0.001" min="0" value={v.capacity_m3 ?? 0} onChange={(e) => setVeiculo(idx, "capacity_m3", Number(e.target.value))} /></td>
                                    <td><input className="erp-cell-input num" type="number" step="0.001" min="0" value={v.tare_kg ?? 0} onChange={(e) => setVeiculo(idx, "tare_kg", Number(e.target.value))} /></td>
                                    <td><input className="erp-cell-input" value={v.driver_name ?? ""} onChange={(e) => setVeiculo(idx, "driver_name", e.target.value)} /></td>
                                    <td><input type="checkbox" checked={v.is_active !== false} onChange={(e) => setVeiculo(idx, "is_active", e.target.checked)} /></td>
                                    <td>
                                      <button className="erp-btn erp-btn-sm" onClick={() => setVeiculoAberto(veiculoAberto === idx ? null : idx)} disabled={busy}>{veiculoAberto === idx ? "Fechar" : "Detalhes"}</button>{" "}
                                      <button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => delVeiculo(idx)} disabled={busy}>Remover</button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        {veiculoAberto !== null && form.vehicles?.[veiculoAberto] && (() => {
                          const v = form.vehicles[veiculoAberto]; const idx = veiculoAberto;
                          return (
                            <div className="erp-field erp-c12">
                              <div className="erp-fieldset">
                                <div className="erp-fieldset-head">Veículo {v.plate || "novo"} — dados do MDF-e e do motorista</div>
                                <div className="erp-fieldset-body">
                                  <div className="erp-field erp-c4"><label className="erp-label">Descrição</label><input className="erp-input" value={v.description ?? ""} onChange={(e) => setVeiculo(idx, "description", e.target.value)} /></div>
                                  <div className="erp-field erp-c2"><label className="erp-label">RENAVAM</label><input className="erp-input num" maxLength={11} value={v.renavam ?? ""} onChange={(e) => setVeiculo(idx, "renavam", e.target.value.replace(/\D/g, ""))} /></div>
                                  <div className="erp-field erp-c3"><label className="erp-label">Rodado</label><select className="erp-input" value={v.wheel_type ?? ""} onChange={(e) => setVeiculo(idx, "wheel_type", e.target.value)}><option value="">—</option>{WHEEL_TYPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></div>
                                  <div className="erp-field erp-c3"><label className="erp-label">Carroceria</label><select className="erp-input" value={v.body_type ?? ""} onChange={(e) => setVeiculo(idx, "body_type", e.target.value)}><option value="">—</option>{BODY_TYPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></div>
                                  <div className="erp-field erp-c3"><label className="erp-label">Proprietário</label><select className="erp-input" value={v.owner_type ?? ""} onChange={(e) => setVeiculo(idx, "owner_type", e.target.value)}><option value="">Frota da transportadora</option>{OWNER_TYPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></div>
                                  <div className="erp-field erp-c3"><label className={`erp-label${v.owner_type === "0" || v.owner_type === "1" ? " erp-req" : ""}`}>RNTRC do proprietário</label><input className="erp-input num" value={v.antt_owner ?? ""} onChange={(e) => setVeiculo(idx, "antt_owner", e.target.value)} /><small className="erp-hint">Obrigatório para veículo de TAC.</small></div>
                                  <div className="erp-field erp-c3"><label className="erp-label">CPF do motorista</label><input className="erp-input num" value={v.driver_document ?? ""} onChange={(e) => setVeiculo(idx, "driver_document", e.target.value)} /></div>
                                  <div className="erp-field erp-c3"><label className="erp-label">Nº da CNH</label><input className="erp-input num" value={v.driver_license ?? ""} onChange={(e) => setVeiculo(idx, "driver_license", e.target.value)} /></div>
                                  <div className="erp-field erp-c2"><label className="erp-label">Categoria</label><select className="erp-input" value={v.driver_cnh_category ?? ""} onChange={(e) => setVeiculo(idx, "driver_cnh_category", e.target.value)}><option value="">—</option>{CNH_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                                  <div className="erp-field erp-c3"><label className="erp-label">Validade da CNH</label><input className="erp-input" type="date" value={v.driver_cnh_expiry ?? ""} onChange={(e) => setVeiculo(idx, "driver_cnh_expiry", e.target.value)} /><small className="erp-hint">Vencida ou a vencer em 30 dias vira pendência.</small></div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                        <div className="erp-field erp-c12">
                          <small className="erp-hint">Veículo em carga ou romaneio ainda não expedido não pode ser removido nem inativado — o documento ficaria sem veículo.</small>
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
                                  <th className="num" style={{ width: 90 }} title="Dias úteis">Prazo (úteis)</th><th className="num" style={{ width: 110 }}>Piso R$</th>
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
                                    <td><input className="erp-cell-input num" type="number" min="0" value={a.lead_days ?? ""} placeholder="—" onChange={(e) => setRegiao(idx, "lead_days", numeroOuHerda(e.target.value))} /></td>
                                    <td><input className="erp-cell-input num" type="number" step="0.01" min="0" value={a.min_value ?? ""} placeholder="padrão" onChange={(e) => setRegiao(idx, "min_value", numeroOuHerda(e.target.value))} /></td>
                                    <td><input className="erp-cell-input num" type="number" step="0.000001" min="0" value={a.kg_rate ?? ""} placeholder="padrão" onChange={(e) => setRegiao(idx, "kg_rate", numeroOuHerda(e.target.value))} /></td>
                                    <td><input className="erp-cell-input num" type="number" step="0.01" min="0" max="100" value={a.pct_value ?? ""} placeholder="padrão" onChange={(e) => setRegiao(idx, "pct_value", numeroOuHerda(e.target.value))} /></td>
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
                          <select className="erp-input" value={tipoEscolhido} onChange={(e) => setNovaOcorrencia((p) => ({ ...p, occurrence_type: e.target.value }))}>
                            {tiposAtivos.map((t) => <option key={t.code} value={t.code}>{t.description}</option>)}
                          </select>
                        </div>
                        <div className="erp-field erp-c1"><label className="erp-label">Romaneio</label><input className="erp-input num" type="number" value={novaOcorrencia.shipment_code ?? ""} onChange={(e) => setNovaOcorrencia((p) => ({ ...p, shipment_code: e.target.value ? Number(e.target.value) : undefined }))} /></div>
                        <div className="erp-field erp-c1"><label className="erp-label">Pedido</label><input className="erp-input num" type="number" value={novaOcorrencia.sales_order_code ?? ""} onChange={(e) => setNovaOcorrencia((p) => ({ ...p, sales_order_code: e.target.value ? Number(e.target.value) : undefined }))} /></div>
                        <div className="erp-field erp-c1"><label className="erp-label">Atraso (d)</label><input className="erp-input num" type="number" min="0" value={novaOcorrencia.delay_days ?? 0} onChange={(e) => setNovaOcorrencia((p) => ({ ...p, delay_days: Number(e.target.value) }))} /></div>
                        <div className="erp-field erp-c2"><label className="erp-label">Custo (R$)</label><input className="erp-input num" type="number" step="0.01" min="0" value={novaOcorrencia.cost_impact ?? 0} onChange={(e) => setNovaOcorrencia((p) => ({ ...p, cost_impact: Number(e.target.value) }))} /></div>
                        <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={lancarOcorrencia} disabled={busy}>Registrar</button></div>
                        <div className="erp-field erp-c12"><label className="erp-label">Descrição</label><input className="erp-input" value={novaOcorrencia.description ?? ""} onChange={(e) => setNovaOcorrencia((p) => ({ ...p, description: e.target.value }))} /></div>

                        <div className="erp-field erp-c12">
                          <div className="erp-grid-wrap">
                            <table className="erp-grid">
                              <thead><tr><th style={{ width: 120 }}>Data</th><th style={{ width: 170 }}>Tipo</th><th className="num" style={{ width: 100 }}>Pedido</th><th className="num" style={{ width: 100 }}>Romaneio</th><th className="num" style={{ width: 90 }}>Atraso</th><th className="num" style={{ width: 120 }}>Custo</th><th>Descrição</th></tr></thead>
                              <tbody>
                                {ocorrencias.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhuma ocorrência registrada.</td></tr>}
                                {ocorrencias.map((o) => (
                                  <tr key={o.id}>
                                    <td>{dataBR(o.occurrence_date)}</td>
                                    <td>{tiposOcorrencia.find((t) => t.code === o.occurrence_type)?.description ?? o.occurrence_type.replace(/_/g, " ")}</td>
                                    <td className="num">{o.sales_order_code ?? "—"}</td>
                                    <td className="num">{o.shipment_code ?? "—"}</td>
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
                        transportadoras ativas que atendem o destino, com o frete aberto em componentes. Com o CEP a UF
                        é deduzida; a cidade escolhe a região própria da cidade, quando a transportadora tem. O prazo é
                        em dias úteis e o frete não inclui ICMS.
                      </small>
                    </div>
                    <div className="erp-field erp-c1"><label className="erp-label">UF</label><input className="erp-input" maxLength={2} value={carga.uf} onChange={(e) => setCarga((p) => ({ ...p, uf: e.target.value.toUpperCase() }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Cidade</label><input className="erp-input" value={carga.cidade} onChange={(e) => setCarga((p) => ({ ...p, cidade: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">CEP</label><input className="erp-input num" value={carga.cep} onChange={(e) => setCarga((p) => ({ ...p, cep: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Peso (kg)</label><input className="erp-input num" type="number" step="0.001" min="0" value={carga.peso} onChange={(e) => setCarga((p) => ({ ...p, peso: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Volume (m³)</label><input className="erp-input num" type="number" step="0.001" min="0" value={carga.volume} onChange={(e) => setCarga((p) => ({ ...p, volume: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">Valor da carga</label><input className="erp-input num" type="number" step="0.01" min="0" value={carga.valor} onChange={(e) => setCarga((p) => ({ ...p, valor: e.target.value }))} /></div>
                    <div className="erp-field erp-c2"><label className="erp-check"><input type="checkbox" checked={perigoso} onChange={(e) => setPerigoso(e.target.checked)} />Produto perigoso</label></div>
                    <div className="erp-field erp-c1" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-dark" onClick={cotar} disabled={busy}>Cotar</button></div>

                    {cotacao && (
                      <div className="erp-field erp-c12">
                        <div className="erp-grid-wrap">
                          <table className="erp-grid">
                            <thead>
                              <tr>
                                <th>Transportadora</th><th style={{ width: 150 }}>Região</th>
                                <th className="num" style={{ width: 110 }}>Peso cobrado</th><th className="num" style={{ width: 110 }}>Frete peso</th><th className="num" style={{ width: 110 }}>Ad valorem</th>
                                <th className="num" style={{ width: 100 }}>GRIS</th><th className="num" style={{ width: 100 }}>Pedágio</th><th className="num" style={{ width: 100 }}>Despacho</th>
                                <th className="num" style={{ width: 120 }}>Total</th><th className="num" style={{ width: 90 }} title="Dias úteis">Prazo (úteis)</th>
                                <th style={{ width: 130 }}>Previsão</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cotacao.quotes.length === 0 && <tr><td colSpan={11} className="erp-grid-empty">Nenhuma transportadora ativa atende este destino.</td></tr>}
                              {cotacao.quotes.map((q) => (
                                <Fragment key={q.carrier_id}>
                                <tr style={q.blocking.length > 0 ? { opacity: 0.75 } : undefined}>
                                  <td>
                                    {q.supplier_name}
                                    {cotacao.cheapest_carrier_id === q.carrier_id && <span className="erp-badge ok" style={{ marginLeft: 6 }}>mais barata</span>}
                                    {cotacao.fastest_carrier_id === q.carrier_id && <span className="erp-badge info" style={{ marginLeft: 6 }}>mais rápida</span>}
                                    {q.blocking.length > 0 && <span className="erp-badge err" style={{ marginLeft: 6 }}>não pode levar</span>}
                                  </td>
                                  <td>{q.service_area}</td>
                                  <td className="num">{q.charged_weight_kg.toLocaleString("pt-BR")} kg{q.cubed_weight_applied && <span className="erp-badge draft" style={{ marginLeft: 4 }} title="Volume × fator de cubagem passou do peso real">cubado</span>}</td>
                                  <td className="num">{money(q.weight_value)}</td>
                                  <td className="num">{money(q.ad_valorem_value)}</td>
                                  <td className="num">{money(q.gris_value)}</td>
                                  <td className="num">{money(q.toll_value)}</td>
                                  <td className="num">{money(q.dispatch_fee_value)}</td>
                                  <td className="num"><strong>{money(q.total)}</strong>{q.minimum_applied && <span className="erp-badge draft" style={{ marginLeft: 4 }} title="O total dos componentes ficou abaixo do frete mínimo">piso</span>}</td>
                                  <td className="num">{q.lead_days}d</td>
                                  <td>{dataBR(q.estimated_delivery)}</td>
                                </tr>
                                {(q.blocking.length > 0 || q.alerts.length > 0) && (
                                  <tr>
                                    <td colSpan={11} style={{ paddingTop: 0, fontSize: 11.5 }}>
                                      {q.blocking.map((a) => <div key={`b${a}`} style={{ color: "var(--v-err)" }}>⛔ {a}</div>)}
                                      {q.alerts.map((a) => <div key={`a${a}`} style={{ color: "var(--v-warn)" }}>⚠ {a}</div>)}
                                    </td>
                                  </tr>
                                )}
                                </Fragment>
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
        )}
      </div>

      <ConfirmDialog
        aberto={confirmarExclusao !== null}
        titulo="Excluir transportadora"
        assunto={confirmarExclusao ? `${confirmarExclusao.supplier_name ?? ""} (fornecedor ${confirmarExclusao.supplier_code})` : ""}
        mensagem="O perfil de transporte, a frota e as regiões são apagados. O cadastro de fornecedor continua. Só é possível porque a transportadora nunca foi usada em documento."
        rotuloConfirmar="Excluir"
        onConfirmar={excluir}
        onCancelar={() => setConfirmarExclusao(null)}
      />
      <ConfirmDialog
        aberto={confirmarApoio !== null}
        titulo="Excluir cadastro de apoio"
        assunto={confirmarApoio?.nome ?? ""}
        mensagem="O cadastro é apagado. Se estiver em uso, o sistema recusa — nesse caso, inative-o."
        rotuloConfirmar="Excluir"
        onConfirmar={excluirApoio}
        onCancelar={() => setConfirmarApoio(null)}
      />
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

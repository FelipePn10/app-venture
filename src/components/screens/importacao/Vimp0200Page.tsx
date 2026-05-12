import { useState, useCallback, useEffect } from "react";
import {
  type ConhecimentoTransporteResponse,
  type ContainerResponse,
  type CanalAduaneiro,
  type TipoRegime,
  type ModalTransporte,
  listConhecimentosTransporte,
} from "@/services/importacaoService";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_REGIME: TipoRegime[] = [
  "Regime Comum",
  "Entreposto Aduaneiro",
  "Admissão Temporária",
  "Depósito Afiançado",
  "Drawback Suspensão",
  "Drawback Isenção",
];

const CANAIS_ADUANEIROS: CanalAduaneiro[] = ["Verde", "Amarelo", "Vermelho", "Cinza"];

const CANAL_COLORS: Record<CanalAduaneiro, string> = {
  Verde: "#2a8040",
  Amarelo: "#b08000",
  Vermelho: "#c84040",
  Cinza: "#6a6a6a",
};

const CANAL_BG: Record<CanalAduaneiro, string> = {
  Verde: "#e8f5e0",
  Amarelo: "#fff8e0",
  Vermelho: "#fff0f0",
  Cinza: "#f0f0f0",
};

const EMPRESAS_MOCK = ["01 - VENTURE S.A.", "02 - VENTURE IND. LTDA", "03 - VENTURE COMERCIAL"];
const RESPONSAVEIS_MOCK = ["Carlos Silva", "Ana Oliveira", "Roberto Lima", "Juliana Costa"];
const STATUS_MOCK = ["Aguardando Embarque", "Em Trânsito", "Desembaraçando", "Desembaraçado", "Cancelado"];
const FORNECEDORES_MOCK = ["FORN001 - Global Trade Corp", "FORN002 - Asia Supplies Ltd", "FORN003 - EuroParts GmbH"];
const MOEDAS_MOCK = ["USD", "EUR", "GBP", "CNY", "BRL"];
const MODAIS: ModalTransporte[] = ["Aéreo", "Aquaviário", "Ferroviário", "Rodoviário", "Outros"];

// ─── Types ────────────────────────────────────────────────────────────────────

type AbaAtiva = "info" | "pedidos" | "nf" | "contas" | "transporte" | "custos" | "anexos";
type SubAbaCustos = "consolidado" | "porItem";
type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface PedidoCompraRow { pedido: string; fornecedor: string; data: string; valorTotal: number; moeda: string; }
interface NotaFiscalRow { numero: string; serie: string; data: string; valor: number; chave: string; }
interface ContaPagarRow { titulo: string; fornecedor: string; vencimento: string; valor: number; situacao: string; }
interface CustoConsolidadoRow { fornecedor: string; valorFob: number; frete: number; seguro: number; total: number; }
interface CustoItemRow { item: string; descricao: string; quantidade: number; valorUnit: number; valorTotal: number; }
interface AnexoRow { nome: string; tipo: string; tamanho: string; data: string; }

interface FormProcesso {
  empresa: string;
  codigo: string;
  dataAbertura: string;
  responsavel: string;
  status: string;
  tipoRegime: TipoRegime;
  dtInicioRegime: string;
  dtLimiteRegime: string;
  dtEncerramentoRegime: string;
  canalAduaneiro: CanalAduaneiro;
  fornecedor: string;
  moeda: string;
}

const FORM_INICIAL: FormProcesso = {
  empresa: "", codigo: "", dataAbertura: "", responsavel: "", status: "",
  tipoRegime: "Regime Comum", dtInicioRegime: "", dtLimiteRegime: "", dtEncerramentoRegime: "",
  canalAduaneiro: "Verde", fornecedor: "", moeda: "",
};

interface LateralMenuItem { id: AbaAtiva; label: string; }

const LATERAL_ITEMS: LateralMenuItem[] = [
  { id: "info", label: "Informações do Processo" },
  { id: "pedidos", label: "Pedidos de Compra" },
  { id: "nf", label: "Notas Fiscais Entrada" },
  { id: "contas", label: "Contas a Pagar" },
  { id: "transporte", label: "Dados de Transporte" },
  { id: "custos", label: "Custos" },
  { id: "anexos", label: "Anexos" },
];

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const MOCK_PEDIDOS: PedidoCompraRow[] = [
  { pedido: "PC001234", fornecedor: "Global Trade Corp", data: "2026-01-15", valorTotal: 45000.00, moeda: "USD" },
  { pedido: "PC001235", fornecedor: "Asia Supplies Ltd", data: "2026-02-10", valorTotal: 32000.50, moeda: "USD" },
  { pedido: "PC001236", fornecedor: "EuroParts GmbH", data: "2026-03-05", valorTotal: 18700.00, moeda: "EUR" },
];

const MOCK_NF: NotaFiscalRow[] = [
  { numero: "000123456", serie: "1", data: "2026-02-20", valor: 45200.00, chave: "3526..." },
  { numero: "000123457", serie: "1", data: "2026-03-12", valor: 32100.00, chave: "3527..." },
];

const MOCK_CONTAS: ContaPagarRow[] = [
  { titulo: "TIT-0001", fornecedor: "Global Trade Corp", vencimento: "2026-04-15", valor: 22500.00, situacao: "Pendente" },
  { titulo: "TIT-0002", fornecedor: "Global Trade Corp", vencimento: "2026-05-15", valor: 22500.00, situacao: "Pendente" },
  { titulo: "TIT-0003", fornecedor: "Asia Supplies Ltd", vencimento: "2026-04-30", valor: 32000.50, situacao: "Pago" },
];

const MOCK_CUSTO_CONSOLIDADO: CustoConsolidadoRow[] = [
  { fornecedor: "Global Trade Corp", valorFob: 45000.00, frete: 2500.00, seguro: 450.00, total: 47950.00 },
  { fornecedor: "Asia Supplies Ltd", valorFob: 32000.50, frete: 1800.00, seguro: 320.00, total: 34120.50 },
  { fornecedor: "EuroParts GmbH", valorFob: 18700.00, frete: 1200.00, seguro: 187.00, total: 20087.00 },
];

const MOCK_CUSTO_ITEMS: CustoItemRow[] = [
  { item: "ITEM-001", descricao: "Componente Eletrônico A", quantidade: 500, valorUnit: 50.00, valorTotal: 25000.00 },
  { item: "ITEM-002", descricao: "Componente Eletrônico B", quantidade: 200, valorUnit: 100.00, valorTotal: 20000.00 },
  { item: "ITEM-003", descricao: "Sensor Industrial C", quantidade: 100, valorUnit: 320.01, valorTotal: 32000.50 },
  { item: "ITEM-004", descricao: "Atuador D", quantidade: 50, valorUnit: 374.00, valorTotal: 18700.00 },
];

const MOCK_ANEXOS: AnexoRow[] = [
  { nome: "invoice_001234.pdf", tipo: "PDF", tamanho: "245 KB", data: "2026-01-20" },
  { nome: "packing_list.xlsx", tipo: "XLSX", tamanho: "128 KB", data: "2026-01-20" },
  { nome: "bill_of_lading.pdf", tipo: "PDF", tamanho: "512 KB", data: "2026-02-05" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Vimp0200Page(): JSX.Element {
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("info");
  const [subAbaCustos, setSubAbaCustos] = useState<SubAbaCustos>("consolidado");
  const [form, setForm] = useState<FormProcesso>(FORM_INICIAL);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Grid states
  const [pedidos, setPedidos] = useState<PedidoCompraRow[]>([]);
  const [loadedPedidos, setLoadedPedidos] = useState(false);
  const [nfRows, setNfRows] = useState<NotaFiscalRow[]>([]);
  const [loadedNf, setLoadedNf] = useState(false);
  const [contas, setContas] = useState<ContaPagarRow[]>([]);
  const [loadedContas, setLoadedContas] = useState(false);
  const [conhecimentos, setConhecimentos] = useState<ConhecimentoTransporteResponse[]>([]);
  const [loadedConhecimentos, setLoadedConhecimentos] = useState(false);
  const [containersMap, setContainersMap] = useState<Record<string, ContainerResponse[]>>({});
  const [kExpanded, setKExpanded] = useState<string | null>(null);
  const [custosConsolidado, setCustosConsolidado] = useState<CustoConsolidadoRow[]>([]);
  const [custosItens, setCustosItens] = useState<CustoItemRow[]>([]);
  const [anexos, setAnexos] = useState<AnexoRow[]>([]);

  // Form state for pedidos
  const [novoPedido, setNovoPedido] = useState<PedidoCompraRow>({ pedido: "", fornecedor: "", data: "", valorTotal: 0, moeda: "USD" });
  const [editPedidoIdx, setEditPedidoIdx] = useState<number | null>(null);

  // Form state for NF
  const [novoNf, setNovoNf] = useState<NotaFiscalRow>({ numero: "", serie: "1", data: "", valor: 0, chave: "" });

  // Form state for Contas
  const [novaConta, setNovaConta] = useState<ContaPagarRow>({ titulo: "", fornecedor: "", vencimento: "", valor: 0, situacao: "Pendente" });

  // Conhecimento logístico form
  const [novoConhecimento, setNovoConhecimento] = useState({ numero: "", modal: "Aquaviário" as ModalTransporte, transportador: "", dataEmissao: "" });
  const [novoContainerFor, setNovoContainerFor] = useState<string | null>(null);
  const [novoContainer, setNovoContainer] = useState({ codigo: "", tipo: "", peso: "" });

  // Load mock data on first mount
  useEffect(() => {
    if (!loadedPedidos) { setPedidos(MOCK_PEDIDOS); setLoadedPedidos(true); }
    if (!loadedNf) { setNfRows(MOCK_NF); setLoadedNf(true); }
    if (!loadedContas) { setContas(MOCK_CONTAS); setLoadedContas(true); }
    if (!loadedConhecimentos) {
      const load = async () => {
        try {
          const data = await listConhecimentosTransporte();
          if (data.length) {
            setConhecimentos(data);
          } else {
            setConhecimentos([
              { numero: "CONH-0001", data_emissao: "2026-01-20", modal: "Aquaviário", armador_transportador: "Maersk Line", data_prevista_chegada: "2026-03-15", data_efetiva_chegada: "2026-03-18", local_origem: "Shanghai", local_destino: "Santos" },
              { numero: "CONH-0002", data_emissao: "2026-02-05", modal: "Aéreo", armador_transportador: "LATAM Cargo", data_prevista_chegada: "2026-02-20", data_efetiva_chegada: null, local_origem: "Frankfurt", local_destino: "Viracopos" },
            ]);
          }
        } catch {
          setConhecimentos([
            { numero: "CONH-0001", data_emissao: "2026-01-20", modal: "Aquaviário", armador_transportador: "Maersk Line", data_prevista_chegada: "2026-03-15", data_efetiva_chegada: "2026-03-18", local_origem: "Shanghai", local_destino: "Santos" },
            { numero: "CONH-0002", data_emissao: "2026-02-05", modal: "Aéreo", armador_transportador: "LATAM Cargo", data_prevista_chegada: "2026-02-20", data_efetiva_chegada: null, local_origem: "Frankfurt", local_destino: "Viracopos" },
          ]);
        }
        setContainersMap({
          "CONH-0001": [{ codigo: "MEDU1234567", tipo: "40GP", peso_bruto: 12500, volume: 67.5 }],
          "CONH-0002": [{ codigo: "AKE12345AB", tipo: "ULD", peso_bruto: 3500, volume: 10.2 }],
        });
        setLoadedConhecimentos(true);
      };
      load();
    }
    if (custosConsolidado.length === 0) setCustosConsolidado(MOCK_CUSTO_CONSOLIDADO);
    if (custosItens.length === 0) setCustosItens(MOCK_CUSTO_ITEMS);
    if (anexos.length === 0) setAnexos(MOCK_ANEXOS);
  }, [loadedPedidos, loadedNf, loadedContas, loadedConhecimentos]);

  const setField = useCallback(
    <K extends keyof FormProcesso>(key: K, value: FormProcesso[K]) => {
      setForm((p) => ({ ...p, [key]: value }));
      setFeedback(null);
    },
    [],
  );

  function handleNovoProcesso() {
    setForm(FORM_INICIAL);
    setFeedback(null);
    setAbaAtiva("info");
  }

  function handleSalvar() {
    if (!form.empresa || !form.codigo || !form.dataAbertura) {
      setFeedback({ type: "error", message: "Empresa, Código e Data de Abertura são obrigatórios." });
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    setTimeout(() => {
      setFeedback({ type: "success", message: `Processo ${form.codigo} salvo com sucesso.` });
      setIsSaving(false);
    }, 800);
  }

  function handleLimpar() {
    handleNovoProcesso();
    setPedidos([]);
    setNfRows([]);
    setContas([]);
    setConhecimentos([]);
    setContainersMap({});
    setCustosConsolidado([]);
    setCustosItens([]);
    setAnexos([]);
  }

  // ── Pedidos helpers
  function handleAddPedido() {
    if (!novoPedido.pedido.trim()) return;
    if (editPedidoIdx !== null) {
      setPedidos((p) => p.map((r, i) => (i === editPedidoIdx ? { ...novoPedido } : r)));
      setEditPedidoIdx(null);
    } else {
      setPedidos((p) => [...p, { ...novoPedido }]);
    }
    setNovoPedido({ pedido: "", fornecedor: "", data: "", valorTotal: 0, moeda: "USD" });
    setFeedback(null);
  }

  function handleEditPedido(idx: number) {
    setNovoPedido({ ...pedidos[idx] });
    setEditPedidoIdx(idx);
  }

  function handleRemovePedido(idx: number) {
    setPedidos((p) => p.filter((_, i) => i !== idx));
    if (editPedidoIdx === idx) { setNovoPedido({ pedido: "", fornecedor: "", data: "", valorTotal: 0, moeda: "USD" }); setEditPedidoIdx(null); }
  }

  // ── NF helpers
  function handleAddNf() {
    if (!novoNf.numero.trim()) return;
    setNfRows((p) => [...p, { ...novoNf }]);
    setNovoNf({ numero: "", serie: "1", data: "", valor: 0, chave: "" });
  }

  function handleRemoveNf(idx: number) {
    setNfRows((p) => p.filter((_, i) => i !== idx));
  }

  // ── Contas helpers
  function handleAddConta() {
    if (!novaConta.titulo.trim()) return;
    setContas((p) => [...p, { ...novaConta }]);
    setNovaConta({ titulo: "", fornecedor: "", vencimento: "", valor: 0, situacao: "Pendente" });
  }

  function handleRemoveConta(idx: number) {
    setContas((p) => p.filter((_, i) => i !== idx));
  }

  // ── Transporte helpers
  function toggleExpandConhecimento(numero: string) {
    setKExpanded((p) => (p === numero ? null : numero));
  }

  function handleAddConhecimento() {
    if (!novoConhecimento.numero.trim()) return;
    setConhecimentos((p) => [...p, {
      numero: novoConhecimento.numero,
      data_emissao: novoConhecimento.dataEmissao || "2026-01-01",
      modal: novoConhecimento.modal,
      armador_transportador: novoConhecimento.transportador || null,
      data_prevista_chegada: null,
      data_efetiva_chegada: null,
    }]);
    setNovoConhecimento({ numero: "", modal: "Aquaviário", transportador: "", dataEmissao: "" });
  }

  function handleRemoveConhecimento(numero: string) {
    setConhecimentos((p) => p.filter((c) => c.numero !== numero));
    setContainersMap((p) => { const n = { ...p }; delete n[numero]; return n; });
  }

  function handleAddContainer(conhecimentoNumero: string) {
    if (!novoContainer.codigo.trim()) return;
    setContainersMap((p) => ({
      ...p,
      [conhecimentoNumero]: [...(p[conhecimentoNumero] || []), { codigo: novoContainer.codigo, tipo: novoContainer.tipo || null, peso_bruto: Number(novoContainer.peso) || null, volume: null }],
    }));
    setNovoContainer({ codigo: "", tipo: "", peso: "" });
    setNovoContainerFor(null);
  }

  function handleRemoveContainer(conhecimentoNumero: string, containerCodigo: string) {
    setContainersMap((p) => ({
      ...p,
      [conhecimentoNumero]: (p[conhecimentoNumero] || []).filter((c) => c.codigo !== containerCodigo),
    }));
  }

  // ── Anexos helpers
  function handleAddAnexo() {
    const nome = prompt("Nome do arquivo:");
    if (!nome) return;
    setAnexos((p) => [...p, { nome, tipo: nome.split(".").pop()?.toUpperCase() || "OUTRO", tamanho: "—", data: new Date().toISOString().substring(0, 10) }]);
  }

  function handleRemoveAnexo(idx: number) {
    setAnexos((p) => p.filter((_, i) => i !== idx));
  }

  function formatDateBR(iso: string): string {
    if (!iso || iso.length < 10) return "—";
    const [y, m, d] = iso.substring(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .imp-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .imp-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .imp-topbar-left { display: flex; align-items: center; gap: 10px; }
        .imp-logo {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .imp-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .imp-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .imp-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        /* ── MAIN LAYOUT ── */
        .imp-main {
          flex: 1; display: flex; overflow: hidden;
        }

        /* ── LATERAL MENU ── */
        .imp-lateral {
          width: 240px; background: #fff; flex-shrink: 0;
          border-right: 1px solid #dbe8d5; display: flex; flex-direction: column;
          overflow-y: auto;
        }
        .imp-lateral::-webkit-scrollbar { width: 4px; }
        .imp-lateral::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }
        .imp-lateral-header {
          padding: 14px 16px; border-bottom: 1px solid #edf5e8;
          font-size: 10px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 1px;
        }
        .imp-lateral-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px; font-size: 13px; color: #4a6a5a;
          cursor: pointer; transition: background 0.12s, color 0.12s;
          border-left: 3px solid transparent;
        }
        .imp-lateral-item:hover { background: #f4faf2; color: #1a3a28; }
        .imp-lateral-item.active {
          background: #eef7ea; color: #1a4a2a; font-weight: 600;
          border-left-color: #3e9654;
        }
        .imp-lateral-item-icon { width: 16px; height: 16px; flex-shrink: 0; }

        /* ── CONTENT ── */
        .imp-content {
          flex: 1; padding: 16px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 0;
        }
        .imp-content::-webkit-scrollbar { width: 5px; }
        .imp-content::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        /* ── SECTION BANNER ── */
        .imp-section-banner {
          display: flex; align-items: center; gap: 10px; padding: 14px 0 8px;
        }
        .imp-section-banner:first-child { padding-top: 0; }
        .imp-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .imp-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .imp-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        /* ── CARD ── */
        .imp-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .imp-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .imp-card-header-left { display: flex; align-items: center; gap: 8px; }
        .imp-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .imp-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .imp-card-body { padding: 18px 18px; }

        /* ── GRID ── */
        .imp-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .imp-col-2  { grid-column: span 2; }
        .imp-col-3  { grid-column: span 3; }
        .imp-col-4  { grid-column: span 4; }
        .imp-col-5  { grid-column: span 5; }
        .imp-col-6  { grid-column: span 6; }
        .imp-col-8  { grid-column: span 8; }
        .imp-col-12 { grid-column: span 12; }

        /* ── FIELDS ── */
        .imp-field { display: flex; flex-direction: column; gap: 5px; }
        .imp-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .imp-label-req { color: #c84040; font-size: 12px; line-height: 1; }
        .imp-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .imp-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .imp-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .imp-input:disabled { background: #f0f4ee; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }
        .imp-input[type="date"] { cursor: pointer; }

        .imp-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .imp-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .imp-field-hint  { font-size: 11px; color: #7a9c84; margin-top: 2px; line-height: 1.45; }

        /* ── CANAL BADGE ── */
        .imp-canal-badge {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 11px; font-weight: 600; border-radius: 12px; padding: 2px 8px;
        }

        /* ── SECTION SEPARATOR ── */
        .imp-section-sep { height: 1px; background: #edf5e8; margin: 20px 0; }
        .imp-section-label {
          font-size: 10px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: #a0b8a8; margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px;
        }
        .imp-section-label::after { content: ''; flex: 1; height: 1px; background: #e8f0e4; }

        /* ── SUB TABS ── */
        .imp-subtabs {
          display: flex; gap: 0; border-bottom: 1px solid #edf5e8;
          margin-bottom: 14px;
        }
        .imp-subtab {
          padding: 8px 18px; font-size: 12px; font-weight: 500;
          color: #6a8a74; cursor: pointer; border: none; background: transparent;
          border-bottom: 2px solid transparent; font-family: 'Inter', sans-serif;
          transition: color 0.13s, border-color 0.13s;
        }
        .imp-subtab:hover { color: #2a4a35; }
        .imp-subtab.active { color: #162e20; border-bottom-color: #3e9654; font-weight: 600; }

        /* ── TABLE ── */
        .imp-table-wrap { overflow-x: auto; }
        .imp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .imp-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .imp-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .imp-table tbody tr:hover { background: #eef9f0; }
        .imp-table tbody tr.expandable { cursor: pointer; }
        .imp-table .total-row { background: #f4f9f2; font-weight: 700; border-top: 2px solid #dbe8d5; }
        .imp-table .total-row td { color: #1a2e22; font-weight: 700; }
        .imp-table .sub-row { background: #fafdf8; }
        .imp-table .sub-row td { padding-left: 28px; font-size: 12px; color: #5a7a6a; }

        /* ── TABLE ACTIONS ── */
        .imp-action-btn {
          background: transparent; border: none; cursor: pointer; font-size: 12px;
          padding: 3px 8px; border-radius: 5px; font-family: 'Inter', sans-serif;
          transition: background 0.12s, color 0.12s; margin: 0 2px;
        }
        .imp-edit-btn { color: #4a7a9a; }
        .imp-edit-btn:hover { background: #e8f4fc; color: #2a5a7a; }
        .imp-remove-btn { color: #c89090; }
        .imp-remove-btn:hover { background: #fdecea; color: #b94040; }
        .imp-add-btn {
          background: #eef9f0; color: #1a6030; border: 1px solid #b4d8b8;
          font-weight: 600; font-size: 11.5px; height: 28px; padding: 0 10px;
          border-radius: 7px; cursor: pointer; font-family: 'Inter', sans-serif;
          transition: background 0.12s;
        }
        .imp-add-btn:hover { background: #dff5e4; border-color: #88c898; }

        /* ── ADD ROW BAR ── */
        .imp-add-bar {
          display: flex; align-items: flex-end; gap: 10px;
          padding: 14px 18px; border-top: 1px solid #edf5e8;
          background: #fafcf9; flex-wrap: wrap;
        }
        .imp-add-bar .imp-input { width: auto; min-width: 120px; }
        .imp-add-bar .imp-select { width: auto; min-width: 140px; }

        /* ── FEEDBACK ── */
        .imp-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: impFadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .imp-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .imp-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .imp-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        /* ── FOOTER ── */
        .imp-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .imp-footer-left { display: flex; align-items: center; gap: 20px; }
        .imp-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .imp-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes impSpin { to { transform: rotate(360deg); } }
        .imp-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: impSpin 0.65s linear infinite;
        }
        .imp-spinner-dark {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid #d4e8cc; border-top-color: #3e9654;
          border-radius: 50%; animation: impSpin 0.65s linear infinite;
        }
        @keyframes impFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="imp-root">
        <header className="imp-topbar">
          <div className="imp-topbar-left">
            <div className="imp-logo">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="imp-app-name">
              Venture<span className="imp-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="imp-screen-title">VIMP0200 — Console de Processos de Importação</span>
          </div>
        </header>

        <div className="imp-main">
          {/* ── LATERAL MENU ── */}
          <nav className="imp-lateral">
            <div className="imp-lateral-header">Processo</div>
            {LATERAL_ITEMS.map((item) => (
              <div
                key={item.id}
                className={`imp-lateral-item${abaAtiva === item.id ? " active" : ""}`}
                onClick={() => setAbaAtiva(item.id)}
              >
                <span className="imp-lateral-item-icon">
                  {item.id === "info" && <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>}
                  {item.id === "pedidos" && <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 3h12v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M5 3V2a1 1 0 011-1h4a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.4"/></svg>}
                  {item.id === "nf" && <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>}
                  {item.id === "contas" && <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>}
                  {item.id === "transporte" && <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="6" width="12" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/><circle cx="5" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="11" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.2"/></svg>}
                  {item.id === "custos" && <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M4 14c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>}
                  {item.id === "anexos" && <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 4h3M10 8h3M10 12h3M3 4h5M3 8h5M3 12h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>}
                </span>
                {item.label}
              </div>
            ))}
          </nav>

          {/* ── CONTENT AREA ── */}
          <div className="imp-content">
            {feedback && (
              <div className={`imp-feedback ${feedback.type}`}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  {feedback.type === "success"
                    ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    : feedback.type === "error"
                      ? <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4" /><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round" /></>
                      : <><circle cx="8" cy="8" r="6" stroke="#4a90d9" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="#4a90d9" strokeWidth="1.4" strokeLinecap="round" /></>
                  }
                </svg>
                {feedback.message}
              </div>
            )}

            {/* ═══════════════════ TAB: INFORMAÇÕES DO PROCESSO ═══════════════════ */}
            {abaAtiva === "info" && (
              <>
                <div className="imp-section-banner">
                  <span className="imp-section-banner-pill">Informações do Processo</span>
                  <div className="imp-section-banner-line" />
                  <span className="imp-section-banner-hint">Preencha os dados do processo de importação</span>
                </div>

                <div className="imp-card">
                  <div className="imp-card-header">
                    <div className="imp-card-header-left">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="#3e9654" strokeWidth="1.4"/>
                        <path d="M8 7v4M8 5.5h.01" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                      <span className="imp-card-title">Dados do Processo</span>
                    </div>
                    <span className="imp-card-badge">{form.codigo || "Novo"}</span>
                  </div>
                  <div className="imp-card-body">
                    <div className="imp-section-label">Identificação</div>
                    <div className="imp-grid">
                      <div className="imp-field imp-col-3">
                        <label className="imp-label">Empresa <span className="imp-label-req">*</span></label>
                        <select className="imp-select" value={form.empresa} onChange={(e) => setField("empresa", e.target.value)}>
                          <option value="">Selecione...</option>
                          {EMPRESAS_MOCK.map((e) => <option key={e} value={e}>{e}</option>)}
                        </select>
                      </div>
                      <div className="imp-field imp-col-2">
                        <label className="imp-label">Código <span className="imp-label-req">*</span></label>
                        <input className="imp-input" placeholder="Ex: IMP0001" value={form.codigo} onChange={(e) => setField("codigo", e.target.value)} />
                      </div>
                      <div className="imp-field imp-col-3">
                        <label className="imp-label">Data Abertura <span className="imp-label-req">*</span></label>
                        <input type="date" className="imp-input" value={form.dataAbertura} onChange={(e) => setField("dataAbertura", e.target.value)} />
                      </div>
                      <div className="imp-field imp-col-2">
                        <label className="imp-label">Responsável</label>
                        <select className="imp-select" value={form.responsavel} onChange={(e) => setField("responsavel", e.target.value)}>
                          <option value="">Selecione...</option>
                          {RESPONSAVEIS_MOCK.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="imp-field imp-col-2">
                        <label className="imp-label">Status</label>
                        <select className="imp-select" value={form.status} onChange={(e) => setField("status", e.target.value)}>
                          <option value="">Selecione...</option>
                          {STATUS_MOCK.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="imp-section-sep" />
                    <div className="imp-section-label">Regime Aduaneiro</div>
                    <div className="imp-grid">
                      <div className="imp-field imp-col-4">
                        <label className="imp-label">Tipo de Regime</label>
                        <select className="imp-select" value={form.tipoRegime} onChange={(e) => setField("tipoRegime", e.target.value as TipoRegime)}>
                          {TIPOS_REGIME.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="imp-field imp-col-2">
                        <label className="imp-label">Dt. Início Regime</label>
                        <input type="date" className="imp-input" value={form.dtInicioRegime} onChange={(e) => setField("dtInicioRegime", e.target.value)} />
                      </div>
                      <div className="imp-field imp-col-2">
                        <label className="imp-label">Dt. Limite Regime</label>
                        <input type="date" className="imp-input" value={form.dtLimiteRegime} onChange={(e) => setField("dtLimiteRegime", e.target.value)} />
                        <span className="imp-field-hint">Opcional</span>
                      </div>
                      <div className="imp-field imp-col-2">
                        <label className="imp-label">Dt. Encerramento</label>
                        <input type="date" className="imp-input" value={form.dtEncerramentoRegime} onChange={(e) => setField("dtEncerramentoRegime", e.target.value)} />
                        <span className="imp-field-hint">Opcional</span>
                      </div>
                      <div className="imp-field imp-col-2">
                        <label className="imp-label">Canal Aduaneiro</label>
                        <select
                          className="imp-select"
                          value={form.canalAduaneiro}
                          onChange={(e) => setField("canalAduaneiro", e.target.value as CanalAduaneiro)}
                          style={{ backgroundColor: CANAL_BG[form.canalAduaneiro], borderColor: CANAL_COLORS[form.canalAduaneiro], color: CANAL_COLORS[form.canalAduaneiro], fontWeight: 600 }}
                        >
                          {CANAIS_ADUANEIROS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="imp-section-sep" />
                    <div className="imp-section-label">Comercial</div>
                    <div className="imp-grid">
                      <div className="imp-field imp-col-3">
                        <label className="imp-label">Fornecedor</label>
                        <select className="imp-select" value={form.fornecedor} onChange={(e) => setField("fornecedor", e.target.value)}>
                          <option value="">Selecione...</option>
                          {FORNECEDORES_MOCK.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div className="imp-field imp-col-2">
                        <label className="imp-label">Moeda</label>
                        <select className="imp-select" value={form.moeda} onChange={(e) => setField("moeda", e.target.value)}>
                          <option value="">Selecione...</option>
                          {MOEDAS_MOCK.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ═══════════════════ TAB: PEDIDOS DE COMPRA ═══════════════════ */}
            {abaAtiva === "pedidos" && (
              <>
                <div className="imp-section-banner">
                  <span className="imp-section-banner-pill">Pedidos de Compra Vinculados</span>
                  <div className="imp-section-banner-line" />
                  <span className="imp-section-banner-hint">{pedidos.length} pedido(s) de compra vinculado(s)</span>
                </div>
                <div className="imp-card">
                  <div className="imp-table-wrap">
                    <table className="imp-table">
                      <thead>
                        <tr>
                          <th style={{width:120}}>Pedido</th><th>Fornecedor</th>
                          <th style={{width:120}}>Data</th><th style={{width:140}}>Valor Total</th>
                          <th style={{width:80}}>Moeda</th><th style={{width:130}}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pedidos.map((p, i) => (
                          <tr key={i}>
                            <td style={{fontWeight:600,color:"#1a4a2a"}}>{p.pedido}</td>
                            <td>{p.fornecedor}</td>
                            <td>{formatDateBR(p.data)}</td>
                            <td style={{fontWeight:600}}>{p.moeda} {p.valorTotal.toFixed(2)}</td>
                            <td>{p.moeda}</td>
                            <td>
                              <button className="imp-action-btn imp-edit-btn" onClick={() => handleEditPedido(i)}>Editar</button>
                              <button className="imp-action-btn imp-remove-btn" onClick={() => handleRemovePedido(i)}>Remover</button>
                            </td>
                          </tr>
                        ))}
                        {pedidos.length === 0 && (
                          <tr><td colSpan={6} style={{textAlign:"center",padding:"28px 12px",color:"#96b8a0",fontSize:"12.5px"}}>Nenhum pedido de compra vinculado.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="imp-add-bar">
                    <div className="imp-field" style={{minWidth:120}}>
                      <label className="imp-label">Pedido</label>
                      <input className="imp-input" placeholder="Ex: PC001234" value={novoPedido.pedido} onChange={(e) => setNovoPedido((p) => ({...p, pedido: e.target.value}))} />
                    </div>
                    <div className="imp-field" style={{minWidth:180}}>
                      <label className="imp-label">Fornecedor</label>
                      <input className="imp-input" placeholder="Fornecedor" value={novoPedido.fornecedor} onChange={(e) => setNovoPedido((p) => ({...p, fornecedor: e.target.value}))} />
                    </div>
                    <div className="imp-field" style={{minWidth:130}}>
                      <label className="imp-label">Data</label>
                      <input type="date" className="imp-input" value={novoPedido.data} onChange={(e) => setNovoPedido((p) => ({...p, data: e.target.value}))} />
                    </div>
                    <div className="imp-field" style={{minWidth:120}}>
                      <label className="imp-label">Valor</label>
                      <input type="number" className="imp-input" placeholder="0.00" value={novoPedido.valorTotal || ""} onChange={(e) => setNovoPedido((p) => ({...p, valorTotal: Number(e.target.value)}))} />
                    </div>
                    <div className="imp-field" style={{minWidth:80}}>
                      <label className="imp-label">Moeda</label>
                      <select className="imp-select" value={novoPedido.moeda} onChange={(e) => setNovoPedido((p) => ({...p, moeda: e.target.value}))}>
                        {MOEDAS_MOCK.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <button className="imp-add-btn" onClick={handleAddPedido} style={{marginBottom:0,alignSelf:"flex-end"}}>
                      {editPedidoIdx !== null ? "Atualizar" : "Adicionar"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ═══════════════════ TAB: NOTAS FISCAIS ENTRADA ═══════════════════ */}
            {abaAtiva === "nf" && (
              <>
                <div className="imp-section-banner">
                  <span className="imp-section-banner-pill">Notas Fiscais de Entrada</span>
                  <div className="imp-section-banner-line" />
                  <span className="imp-section-banner-hint">{nfRows.length} nota(s) fiscal(is) vinculada(s)</span>
                </div>
                <div className="imp-card">
                  <div className="imp-table-wrap">
                    <table className="imp-table">
                      <thead>
                        <tr>
                          <th style={{width:120}}>Número</th><th style={{width:60}}>Série</th>
                          <th style={{width:120}}>Data</th><th style={{width:140}}>Valor</th>
                          <th>Chave NFe</th><th style={{width:100}}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nfRows.map((nf, i) => (
                          <tr key={i}>
                            <td style={{fontWeight:600,color:"#1a4a2a"}}>{nf.numero}</td>
                            <td>{nf.serie}</td>
                            <td>{formatDateBR(nf.data)}</td>
                            <td style={{fontWeight:600}}>R$ {nf.valor.toFixed(2)}</td>
                            <td style={{fontSize:12,color:"#7a8a7a",fontFamily:"monospace"}}>{nf.chave}</td>
                            <td><button className="imp-action-btn imp-remove-btn" onClick={() => handleRemoveNf(i)}>Remover</button></td>
                          </tr>
                        ))}
                        {nfRows.length === 0 && (
                          <tr><td colSpan={6} style={{textAlign:"center",padding:"28px 12px",color:"#96b8a0",fontSize:"12.5px"}}>Nenhuma nota fiscal vinculada.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="imp-add-bar">
                    <div className="imp-field" style={{minWidth:120}}>
                      <label className="imp-label">Número NF</label>
                      <input className="imp-input" placeholder="000123456" value={novoNf.numero} onChange={(e) => setNovoNf((p) => ({...p, numero: e.target.value}))} />
                    </div>
                    <div className="imp-field" style={{minWidth:80}}>
                      <label className="imp-label">Série</label>
                      <input className="imp-input" placeholder="1" value={novoNf.serie} onChange={(e) => setNovoNf((p) => ({...p, serie: e.target.value}))} />
                    </div>
                    <div className="imp-field" style={{minWidth:130}}>
                      <label className="imp-label">Data</label>
                      <input type="date" className="imp-input" value={novoNf.data} onChange={(e) => setNovoNf((p) => ({...p, data: e.target.value}))} />
                    </div>
                    <div className="imp-field" style={{minWidth:120}}>
                      <label className="imp-label">Valor</label>
                      <input type="number" className="imp-input" placeholder="0.00" value={novoNf.valor || ""} onChange={(e) => setNovoNf((p) => ({...p, valor: Number(e.target.value)}))} />
                    </div>
                    <div className="imp-field" style={{minWidth:240}}>
                      <label className="imp-label">Chave NFe</label>
                      <input className="imp-input" placeholder="3526..." value={novoNf.chave} onChange={(e) => setNovoNf((p) => ({...p, chave: e.target.value}))} />
                    </div>
                    <button className="imp-add-btn" onClick={handleAddNf} style={{marginBottom:0,alignSelf:"flex-end"}}>Novo</button>
                  </div>
                </div>
              </>
            )}

            {/* ═══════════════════ TAB: CONTAS A PAGAR ═══════════════════ */}
            {abaAtiva === "contas" && (
              <>
                <div className="imp-section-banner">
                  <span className="imp-section-banner-pill">Contas a Pagar</span>
                  <div className="imp-section-banner-line" />
                  <span className="imp-section-banner-hint">{contas.length} título(s) vinculado(s)</span>
                </div>
                <div className="imp-card">
                  <div className="imp-table-wrap">
                    <table className="imp-table">
                      <thead>
                        <tr>
                          <th style={{width:120}}>Título</th><th>Fornecedor</th>
                          <th style={{width:120}}>Vencimento</th><th style={{width:140}}>Valor</th>
                          <th style={{width:100}}>Situação</th><th style={{width:100}}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contas.map((c, i) => (
                          <tr key={i}>
                            <td style={{fontWeight:600,color:"#1a4a2a"}}>{c.titulo}</td>
                            <td>{c.fornecedor}</td>
                            <td>{formatDateBR(c.vencimento)}</td>
                            <td style={{fontWeight:600}}>R$ {c.valor.toFixed(2)}</td>
                            <td><span style={{color: c.situacao === "Pago" ? "#2a8040" : "#b08000", fontWeight:600,fontSize:12}}>{c.situacao}</span></td>
                            <td><button className="imp-action-btn imp-remove-btn" onClick={() => handleRemoveConta(i)}>Excluir</button></td>
                          </tr>
                        ))}
                        {contas.length === 0 && (
                          <tr><td colSpan={6} style={{textAlign:"center",padding:"28px 12px",color:"#96b8a0",fontSize:"12.5px"}}>Nenhum título vinculado.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="imp-add-bar">
                    <div className="imp-field" style={{minWidth:120}}>
                      <label className="imp-label">Título</label>
                      <input className="imp-input" placeholder="TIT-0001" value={novaConta.titulo} onChange={(e) => setNovaConta((p) => ({...p, titulo: e.target.value}))} />
                    </div>
                    <div className="imp-field" style={{minWidth:180}}>
                      <label className="imp-label">Fornecedor</label>
                      <input className="imp-input" placeholder="Fornecedor" value={novaConta.fornecedor} onChange={(e) => setNovaConta((p) => ({...p, fornecedor: e.target.value}))} />
                    </div>
                    <div className="imp-field" style={{minWidth:130}}>
                      <label className="imp-label">Vencimento</label>
                      <input type="date" className="imp-input" value={novaConta.vencimento} onChange={(e) => setNovaConta((p) => ({...p, vencimento: e.target.value}))} />
                    </div>
                    <div className="imp-field" style={{minWidth:120}}>
                      <label className="imp-label">Valor</label>
                      <input type="number" className="imp-input" placeholder="0.00" value={novaConta.valor || ""} onChange={(e) => setNovaConta((p) => ({...p, valor: Number(e.target.value)}))} />
                    </div>
                    <button className="imp-add-btn" onClick={handleAddConta} style={{marginBottom:0,alignSelf:"flex-end"}}>Adicionar Título</button>
                  </div>
                </div>
              </>
            )}

            {/* ═══════════════════ TAB: DADOS DE TRANSPORTE ═══════════════════ */}
            {abaAtiva === "transporte" && (
              <>
                <div className="imp-section-banner">
                  <span className="imp-section-banner-pill">Dados de Transporte</span>
                  <div className="imp-section-banner-line" />
                  <span className="imp-section-banner-hint">{conhecimentos.length} conhecimento(s) de transporte</span>
                </div>
                <div className="imp-card">
                  <div className="imp-table-wrap">
                    <table className="imp-table">
                      <thead>
                        <tr>
                          <th style={{width:30}}></th><th style={{width:130}}>Número</th>
                          <th style={{width:120}}>Data Emissão</th><th style={{width:120}}>Modal</th>
                          <th>Transportador</th><th style={{width:120}}>Prev. Chegada</th>
                          <th style={{width:120}}>Efet. Chegada</th><th style={{width:100}}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conhecimentos.map((k) => (
                          <>
                            <tr key={k.numero} className="expandable" onClick={() => toggleExpandConhecimento(k.numero)}>
                              <td style={{textAlign:"center"}}>
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{transform: kExpanded === k.numero ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s"}}>
                                  <path d="M3 1l4 4-4 4" stroke="#789a84" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </td>
                              <td style={{fontWeight:600,color:"#1a4a2a"}}>{k.numero}</td>
                              <td>{formatDateBR(k.data_emissao)}</td>
                              <td>{k.modal}</td>
                              <td>{k.armador_transportador || "—"}</td>
                              <td>{formatDateBR(k.data_prevista_chegada || "")}</td>
                              <td style={{color: k.data_efetiva_chegada ? "#243830" : "#96b8a0"}}>{k.data_efetiva_chegada ? formatDateBR(k.data_efetiva_chegada) : "—"}</td>
                              <td><button className="imp-action-btn imp-remove-btn" onClick={(e) => { e.stopPropagation(); handleRemoveConhecimento(k.numero); }}>Remover</button></td>
                            </tr>
                            {kExpanded === k.numero && (
                              <>
                                <tr className="sub-row">
                                  <td colSpan={8} style={{padding:"8px 18px"}}>
                                    <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                                      <span style={{fontSize:12}}><strong>Origem:</strong> {k.local_origem || "—"}</span>
                                      <span style={{fontSize:12}}><strong>Destino:</strong> {k.local_destino || "—"}</span>
                                      <span style={{fontSize:12}}><strong>Semana:</strong> {k.semana_carregamento || "—"}</span>
                                    </div>
                                    <div style={{marginTop:10,fontSize:12,fontWeight:600,color:"#2a4a35",textTransform:"uppercase",letterSpacing:"0.5px"}}>Containers</div>
                                    <table className="imp-table" style={{marginTop:6,fontSize:12}}>
                                      <thead>
                                        <tr>
                                          <th style={{width:140}}>Código</th><th style={{width:100}}>Tipo</th>
                                          <th style={{width:120}}>Peso Bruto (kg)</th><th style={{width:100}}>Volume (m³)</th>
                                          <th style={{width:80}}>Ações</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(containersMap[k.numero] || []).map((c) => (
                                          <tr key={c.codigo}>
                                            <td style={{fontWeight:600}}>{c.codigo}</td>
                                            <td>{c.tipo || "—"}</td>
                                            <td>{c.peso_bruto ? `${c.peso_bruto.toLocaleString()}` : "—"}</td>
                                            <td>{c.volume ? c.volume.toFixed(1) : "—"}</td>
                                            <td><button className="imp-action-btn imp-remove-btn" onClick={() => handleRemoveContainer(k.numero, c.codigo)}>Remover</button></td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    <div className="imp-add-bar" style={{marginTop:8,padding:"8px 0",borderTop:"1px solid #f0f6ec"}}>
                                      <div className="imp-field" style={{minWidth:130}}>
                                        <label className="imp-label">Código</label>
                                        <input className="imp-input" placeholder="MEDU1234567" value={novoContainerFor === k.numero ? novoContainer.codigo : ""} onFocus={() => setNovoContainerFor(k.numero)} onChange={(e) => { setNovoContainerFor(k.numero); setNovoContainer((p) => ({...p, codigo: e.target.value})); }} />
                                      </div>
                                      <div className="imp-field" style={{minWidth:100}}>
                                        <label className="imp-label">Tipo</label>
                                        <input className="imp-input" placeholder="40GP" value={novoContainerFor === k.numero ? novoContainer.tipo : ""} onFocus={() => setNovoContainerFor(k.numero)} onChange={(e) => { setNovoContainerFor(k.numero); setNovoContainer((p) => ({...p, tipo: e.target.value})); }} />
                                      </div>
                                      <div className="imp-field" style={{minWidth:100}}>
                                        <label className="imp-label">Peso</label>
                                        <input className="imp-input" placeholder="kg" value={novoContainerFor === k.numero ? novoContainer.peso : ""} onFocus={() => setNovoContainerFor(k.numero)} onChange={(e) => { setNovoContainerFor(k.numero); setNovoContainer((p) => ({...p, peso: e.target.value})); }} />
                                      </div>
                                      <button className="imp-add-btn" onClick={() => handleAddContainer(k.numero)} style={{alignSelf:"flex-end"}}>Adicionar Container</button>
                                    </div>
                                  </td>
                                </tr>
                              </>
                            )}
                          </>
                        ))}
                        {conhecimentos.length === 0 && (
                          <tr><td colSpan={8} style={{textAlign:"center",padding:"28px 12px",color:"#96b8a0",fontSize:"12.5px"}}>Nenhum conhecimento de transporte vinculado.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="imp-add-bar">
                    <div className="imp-field" style={{minWidth:130}}>
                      <label className="imp-label">Número</label>
                      <input className="imp-input" placeholder="CONH-0001" value={novoConhecimento.numero} onChange={(e) => setNovoConhecimento((p) => ({...p, numero: e.target.value}))} />
                    </div>
                    <div className="imp-field" style={{minWidth:140}}>
                      <label className="imp-label">Modal</label>
                      <select className="imp-select" value={novoConhecimento.modal} onChange={(e) => setNovoConhecimento((p) => ({...p, modal: e.target.value as ModalTransporte}))}>
                        {MODAIS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="imp-field" style={{minWidth:180}}>
                      <label className="imp-label">Transportador</label>
                      <input className="imp-input" placeholder="Maersk Line" value={novoConhecimento.transportador} onChange={(e) => setNovoConhecimento((p) => ({...p, transportador: e.target.value}))} />
                    </div>
                    <div className="imp-field" style={{minWidth:130}}>
                      <label className="imp-label">Data Emissão</label>
                      <input type="date" className="imp-input" value={novoConhecimento.dataEmissao} onChange={(e) => setNovoConhecimento((p) => ({...p, dataEmissao: e.target.value}))} />
                    </div>
                    <button className="imp-add-btn" onClick={handleAddConhecimento} style={{marginBottom:0,alignSelf:"flex-end"}}>Adicionar</button>
                  </div>
                </div>
              </>
            )}

            {/* ═══════════════════ TAB: CUSTOS ═══════════════════ */}
            {abaAtiva === "custos" && (
              <>
                <div className="imp-section-banner">
                  <span className="imp-section-banner-pill">Custos de Importação</span>
                  <div className="imp-section-banner-line" />
                  <span className="imp-section-banner-hint">Análise de custos do processo</span>
                </div>
                <div className="imp-card">
                  <div className="imp-subtabs">
                    <button className={`imp-subtab${subAbaCustos === "consolidado" ? " active" : ""}`} onClick={() => setSubAbaCustos("consolidado")}>Consolidado por Fornecedor</button>
                    <button className={`imp-subtab${subAbaCustos === "porItem" ? " active" : ""}`} onClick={() => setSubAbaCustos("porItem")}>Por Item</button>
                  </div>
                  {subAbaCustos === "consolidado" && (
                    <div className="imp-table-wrap">
                      <table className="imp-table">
                        <thead>
                          <tr>
                            <th>Fornecedor</th><th style={{width:150}}>Valor FOB</th>
                            <th style={{width:130}}>Frete</th><th style={{width:130}}>Seguro</th>
                            <th style={{width:150}}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {custosConsolidado.map((c, i) => (
                            <tr key={i}>
                              <td style={{fontWeight:600,color:"#1a4a2a"}}>{c.fornecedor}</td>
                              <td>R$ {c.valorFob.toFixed(2)}</td>
                              <td>R$ {c.frete.toFixed(2)}</td>
                              <td>R$ {c.seguro.toFixed(2)}</td>
                              <td style={{fontWeight:600}}>R$ {c.total.toFixed(2)}</td>
                            </tr>
                          ))}
                          <tr className="total-row">
                            <td style={{textAlign:"right"}}>Total Geral:</td>
                            <td>R$ {custosConsolidado.reduce((s,c) => s + c.valorFob, 0).toFixed(2)}</td>
                            <td>R$ {custosConsolidado.reduce((s,c) => s + c.frete, 0).toFixed(2)}</td>
                            <td>R$ {custosConsolidado.reduce((s,c) => s + c.seguro, 0).toFixed(2)}</td>
                            <td>R$ {custosConsolidado.reduce((s,c) => s + c.total, 0).toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                  {subAbaCustos === "porItem" && (
                    <div className="imp-table-wrap">
                      <table className="imp-table">
                        <thead>
                          <tr>
                            <th style={{width:100}}>Item</th><th>Descrição</th>
                            <th style={{width:100}}>Qtd.</th><th style={{width:140}}>Valor Unit.</th>
                            <th style={{width:140}}>Valor Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {custosItens.map((it, i) => (
                            <tr key={i}>
                              <td style={{fontWeight:600,color:"#1a4a2a"}}>{it.item}</td>
                              <td>{it.descricao}</td>
                              <td>{it.quantidade}</td>
                              <td>R$ {it.valorUnit.toFixed(2)}</td>
                              <td style={{fontWeight:600}}>R$ {it.valorTotal.toFixed(2)}</td>
                            </tr>
                          ))}
                          <tr className="total-row">
                            <td colSpan={2} style={{textAlign:"right"}}>Total Geral:</td>
                            <td>{custosItens.reduce((s,i) => s + i.quantidade, 0)}</td>
                            <td></td>
                            <td>R$ {custosItens.reduce((s,i) => s + i.valorTotal, 0).toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ═══════════════════ TAB: ANEXOS ═══════════════════ */}
            {abaAtiva === "anexos" && (
              <>
                <div className="imp-section-banner">
                  <span className="imp-section-banner-pill">Anexos do Processo</span>
                  <div className="imp-section-banner-line" />
                  <span className="imp-section-banner-hint">{anexos.length} arquivo(s) anexado(s)</span>
                </div>
                <div className="imp-card">
                  <div className="imp-table-wrap">
                    <table className="imp-table">
                      <thead>
                        <tr>
                          <th>Nome do Arquivo</th><th style={{width:80}}>Tipo</th>
                          <th style={{width:100}}>Tamanho</th><th style={{width:120}}>Data</th>
                          <th style={{width:100}}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {anexos.map((a, i) => (
                          <tr key={i}>
                            <td style={{fontWeight:600,color:"#1a4a2a"}}>{a.nome}</td>
                            <td><span style={{fontSize:11,background:"#e8f0fc",color:"#2a5080",padding:"2px 6px",borderRadius:4}}>{a.tipo}</span></td>
                            <td>{a.tamanho}</td>
                            <td>{formatDateBR(a.data)}</td>
                            <td><button className="imp-action-btn imp-remove-btn" onClick={() => handleRemoveAnexo(i)}>Remover</button></td>
                          </tr>
                        ))}
                        {anexos.length === 0 && (
                          <tr><td colSpan={5} style={{textAlign:"center",padding:"28px 12px",color:"#96b8a0",fontSize:"12.5px"}}>Nenhum anexo vinculado.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div style={{padding:"14px 18px",borderTop:"1px solid #edf5e8",display:"flex",alignItems:"center",gap:10}}>
                    <button className="imp-add-btn" onClick={handleAddAnexo}>+ Adicionar Anexo</button>
                    <span style={{fontSize:11,color:"#96b8a0"}}>Arraste arquivos ou clique para selecionar</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="imp-footer">
          <div className="imp-footer-left">
            <button className="imp-add-btn" onClick={handleNovoProcesso}>Novo Processo</button>
            <button
              style={{display:"inline-flex",alignItems:"center",gap:6,height:32,padding:"0 12px",background:"#162e20",color:"#dff0e2",border:"1.5px solid #162e20",borderRadius:7,fontFamily:"'Inter',sans-serif",fontSize:"12.5px",fontWeight:500,cursor:"pointer"}}
              onClick={() => void handleSalvar()}
              disabled={isSaving}
            >
              {isSaving
                ? <><div className="imp-spinner" />Salvando...</>
                : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>Salvar</>
              }
            </button>
            <button
              style={{display:"inline-flex",alignItems:"center",gap:6,height:32,padding:"0 12px",background:"transparent",color:"#b94040",border:"1.5px solid #f0c8c8",borderRadius:7,fontFamily:"'Inter',sans-serif",fontSize:"12.5px",fontWeight:500,cursor:"pointer"}}
              onClick={handleLimpar}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Limpar
            </button>
          </div>
          <div className="imp-footer-stat" style={{ gap: 8 }}>
            <span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>
      </div>
    </>
  );
}

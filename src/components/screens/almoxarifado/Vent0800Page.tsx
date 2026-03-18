import { useState, useCallback } from "react";
import axios from "axios";
import {
  fetchWarehouseByCode,
  lookupCustomer,
  lookupSupplier,
  saveWarehouse,
  validateEstablishment,
} from "@/services/warehouseService";
import type { LookupEntity, WarehousePayload } from "@/types/warehouse";

// ─── Types ────────────────────────────────────────────────────────────────────

type Localizacao =
  | "Interno"
  | "Externo"
  | "Assistência Técnica"
  | "Rejeição"
  | "Inspeção"
  | "Expedição"
  | "Reserva"
  | "Trânsito";

type TipoAlmoxarifado = "Normal" | "Linha de Produção";

type AbaAtiva = "dados" | "clientes" | "fornecedores";

type FeedbackState = {
  type: "success" | "error" | "info";
  message: string;
} | null;

interface FormAlmoxarifado {
  codigo: string;
  descricao: string;
  localizacao: Localizacao;
  tipo: TipoAlmoxarifado;
  disponivel: boolean;
  almoxExpedicao: string;
  cliente: string;
  estabelecimento: string;
  fornecedor: string;
  observacao: string;
}

interface VinculoRow {
  codigo: string;
  nome: string;
}

const LOCALIZACOES: Localizacao[] = [
  "Interno",
  "Externo",
  "Assistência Técnica",
  "Rejeição",
  "Inspeção",
  "Expedição",
  "Reserva",
  "Trânsito",
];

const TIPOS: TipoAlmoxarifado[] = ["Normal", "Linha de Produção"];

const LOCALIZACAO_INFO: Record<Localizacao, string> = {
  Interno: "Almoxarifado localizado dentro da empresa.",
  Externo:
    "Localizado no fornecedor. Requer cliente, estabelecimento e fornecedor vinculados.",
  "Assistência Técnica":
    "Não pode ser alterado manualmente. Exclusivo para itens de assistência técnica.",
  Rejeição: "Local onde ficam itens rejeitados aguardando troca ou devolução.",
  Inspeção:
    "Local de conferência de produtos recebidos antes de aprovação ou rejeição.",
  Expedição:
    "Local onde produtos prontos ficam até o momento de venda ou carregamento.",
  Reserva: "Almoxarifado para itens em reserva de estoque.",
  Trânsito:
    "Itens em trânsito entre almoxarifados. Requer cliente, estabelecimento e fornecedor.",
};

const formInicial: FormAlmoxarifado = {
  codigo: "",
  descricao: "",
  localizacao: "Interno",
  tipo: "Normal",
  disponivel: true,
  almoxExpedicao: "",
  cliente: "",
  estabelecimento: "",
  fornecedor: "",
  observacao: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localizacaoRequerVinculos(loc: Localizacao): boolean {
  return loc === "Externo" || loc === "Trânsito";
}

function localizacaoBloqueada(loc: Localizacao): boolean {
  return loc === "Assistência Técnica";
}

function normalizeErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const apiMessage =
      (error.response?.data as { message?: string; error?: string } | undefined)
        ?.message ??
      (error.response?.data as { message?: string; error?: string } | undefined)
        ?.error;

    if (apiMessage) {
      return apiMessage;
    }
  }

  return error instanceof Error ? error.message : fallback;
}

function buildWarehousePayload(
  form: FormAlmoxarifado,
  clientes: VinculoRow[],
  fornecedores: VinculoRow[],
): WarehousePayload {
  return {
    ...form,
    clientes,
    fornecedores,
  };
}

function mergeLookup(list: VinculoRow[], item: LookupEntity): VinculoRow[] {
  const filtered = list.filter((entry) => entry.codigo !== item.codigo);
  return [...filtered, item];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Vent0800Page(): JSX.Element {
  const [form, setForm] = useState<FormAlmoxarifado>(formInicial);
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("dados");
  const [clientes, setClientes] = useState<VinculoRow[]>([]);
  const [fornecedores, setFornecedores] = useState<VinculoRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  const [isSearchingCliente, setIsSearchingCliente] = useState(false);
  const [isSearchingFornecedor, setIsSearchingFornecedor] = useState(false);
  const [isSearchingEstabelecimento, setIsSearchingEstabelecimento] = useState(false);
  const [isSearchingExpedicao, setIsSearchingExpedicao] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [lookupHint, setLookupHint] = useState<string | null>(null);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormAlmoxarifado, string>>
  >({});
  const [novoCliente, setNovoCliente] = useState("");
  const [novoFornecedor, setNovoFornecedor] = useState("");

  const setField = useCallback(
    <K extends keyof FormAlmoxarifado>(key: K, value: FormAlmoxarifado[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
      setFeedback(null);
    },
    [],
  );

  function validate(): boolean {
    const e: Partial<Record<keyof FormAlmoxarifado, string>> = {};
    if (!form.codigo.trim()) e.codigo = "Código obrigatório.";
    if (/[^a-zA-Z0-9_-]/.test(form.codigo))
      e.codigo = "Evite caracteres especiais no código.";
    if (!form.descricao.trim()) e.descricao = "Descrição obrigatória.";
    if (localizacaoRequerVinculos(form.localizacao)) {
      if (!form.cliente.trim())
        e.cliente = "Cliente obrigatório para esta localização.";
      if (!form.estabelecimento.trim())
        e.estabelecimento = "Estabelecimento obrigatório.";
      if (!form.fornecedor.trim()) e.fornecedor = "Fornecedor obrigatório.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function applyWarehouseData(payload: WarehousePayload): void {
    setForm({
      codigo: payload.codigo ?? "",
      descricao: payload.descricao ?? "",
      localizacao: (payload.localizacao as Localizacao) ?? "Interno",
      tipo: (payload.tipo as TipoAlmoxarifado) ?? "Normal",
      disponivel: payload.disponivel ?? true,
      almoxExpedicao: payload.almoxExpedicao ?? "",
      cliente: payload.cliente ?? "",
      estabelecimento: payload.estabelecimento ?? "",
      fornecedor: payload.fornecedor ?? "",
      observacao: payload.observacao ?? "",
    });
    setClientes(payload.clientes ?? []);
    setFornecedores(payload.fornecedores ?? []);
  }

  async function handleSalvar() {
    if (!validate()) return;
    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await saveWarehouse(
        buildWarehousePayload(form, clientes, fornecedores),
      );
      applyWarehouseData(response);
      setFeedback({
        type: "success",
        message: `Almoxarifado ${response.codigo} salvo com sucesso no backend.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeErrorMessage(
          error,
          "Erro ao salvar no backend. Verifique a API e os campos obrigatórios.",
        ),
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleLimpar() {
    setForm(formInicial);
    setErrors({});
    setClientes([]);
    setFornecedores([]);
    setFeedback(null);
    setLookupHint(null);
    setAbaAtiva("dados");
  }

  async function handleLoadWarehouseByCode(code?: string) {
    const codigo = (code ?? form.codigo).trim();
    if (!codigo) {
      setErrors((prev) => ({ ...prev, codigo: "Informe um código para consultar." }));
      return;
    }

    setIsLoadingRecord(true);
    setFeedback(null);

    try {
      const warehouse = await fetchWarehouseByCode(codigo);
      if (!warehouse) {
        setFeedback({ type: "info", message: `Nenhum almoxarifado encontrado para ${codigo}.` });
        return;
      }
      applyWarehouseData(warehouse);
      setFeedback({ type: "info", message: `Registro ${codigo} carregado a partir do backend.` });
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeErrorMessage(error, "Não foi possível consultar o almoxarifado no backend."),
      });
    } finally {
      setIsLoadingRecord(false);
    }
  }

  async function handleLookupCliente(code?: string) {
    const codigo = (code ?? form.cliente ?? novoCliente).trim();
    if (!codigo) {
      setErrors((prev) => ({ ...prev, cliente: "Informe um código de cliente." }));
      return;
    }

    setIsSearchingCliente(true);
    try {
      const customer = await lookupCustomer(codigo);
      if (code == null || code === form.cliente) {
        setField("cliente", customer.codigo);
      }
      setClientes((prev) => mergeLookup(prev, customer));
      setLookupHint(`Cliente ${customer.codigo} — ${customer.nome} validado no backend.`);
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeErrorMessage(error, "Não foi possível localizar o cliente informado."),
      });
    } finally {
      setIsSearchingCliente(false);
    }
  }

  async function handleLookupFornecedor(code?: string) {
    const codigo = (code ?? form.fornecedor ?? novoFornecedor).trim();
    if (!codigo) {
      setErrors((prev) => ({ ...prev, fornecedor: "Informe um código de fornecedor." }));
      return;
    }

    setIsSearchingFornecedor(true);
    try {
      const supplier = await lookupSupplier(codigo);
      if (code == null || code === form.fornecedor) {
        setField("fornecedor", supplier.codigo);
      }
      setFornecedores((prev) => mergeLookup(prev, supplier));
      setLookupHint(`Fornecedor ${supplier.codigo} — ${supplier.nome} validado no backend.`);
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeErrorMessage(error, "Não foi possível localizar o fornecedor informado."),
      });
    } finally {
      setIsSearchingFornecedor(false);
    }
  }

  async function handleLookupEstabelecimento() {
    const codigo = form.estabelecimento.trim();
    if (!codigo) {
      setErrors((prev) => ({ ...prev, estabelecimento: "Informe um código de estabelecimento." }));
      return;
    }

    setIsSearchingEstabelecimento(true);
    try {
      const establishment = await validateEstablishment(codigo);
      setLookupHint(`Estabelecimento ${establishment.codigo} — ${establishment.nome} validado no backend.`);
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeErrorMessage(error, "Não foi possível validar o estabelecimento informado."),
      });
    } finally {
      setIsSearchingEstabelecimento(false);
    }
  }

  async function handleLookupExpedicao() {
    const codigo = form.almoxExpedicao.trim();
    if (!codigo) {
      setFeedback({ type: "error", message: "Informe o almoxarifado de expedição para consultar." });
      return;
    }

    setIsSearchingExpedicao(true);
    try {
      const warehouse = await fetchWarehouseByCode(codigo);
      if (!warehouse) {
        setFeedback({ type: "info", message: `Almoxarifado de expedição ${codigo} não encontrado.` });
        return;
      }
      setField("almoxExpedicao", warehouse.codigo);
      setLookupHint(`Almox. de expedição ${warehouse.codigo} — ${warehouse.descricao} validado no backend.`);
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeErrorMessage(error, "Não foi possível validar o almoxarifado de expedição."),
      });
    } finally {
      setIsSearchingExpedicao(false);
    }
  }

  async function adicionarCliente() {
    if (!novoCliente.trim()) return;
    await handleLookupCliente(novoCliente);
    setNovoCliente("");
  }

  async function adicionarFornecedor() {
    if (!novoFornecedor.trim()) return;
    await handleLookupFornecedor(novoFornecedor);
    setNovoFornecedor("");
  }

  const requerVinculos = localizacaoRequerVinculos(form.localizacao);
  const bloqueada = localizacaoBloqueada(form.localizacao);

  const ABAS: { id: AbaAtiva; label: string }[] = [
    { id: "dados", label: "Dados Gerais" },
    {
      id: "clientes",
      label: `Clientes${clientes.length > 0 ? ` (${clientes.length})` : ""}`,
    },
    {
      id: "fornecedores",
      label: `Fornecedores${fornecedores.length > 0 ? ` (${fornecedores.length})` : ""}`,
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .al-root {
          min-height: 100vh;
          background: #f0f4ee;
          font-family: 'Inter', sans-serif;
          color: #1a2e22;
          display: flex;
          flex-direction: column;
        }

        /* ── TOPBAR ── */
        .al-topbar {
          height: 52px;
          background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .al-topbar-left { display: flex; align-items: center; gap: 10px; }
        .al-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .al-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .al-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .al-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        /* ── ACTION BAR ── */
        .al-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .al-action-group {
          display: flex; align-items: center; gap: 2px;
          padding-right: 10px; margin-right: 6px;
          border-right: 1px solid #e8f0e4;
        }
        .al-action-group:last-child { border-right: none; }
        .al-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 6px; white-space: nowrap;
        }
        .al-nav-btn {
          width: 30px; height: 30px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          background: transparent; border: 1.5px solid #d4e8d0;
          cursor: pointer; color: #4a7060;
          transition: background 0.12s, border-color 0.12s;
        }
        .al-nav-btn:hover { background: #edf7ea; border-color: #a0c8a8; }
        .al-nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .al-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .al-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .al-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .al-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .al-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .al-btn-ghost:hover { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .al-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .al-btn-danger:hover { background: #fff0f0; border-color: #e09090; }
        .al-btn-sm {
          height: 30px; padding: 0 10px; font-size: 12px;
        }

        /* ── BODY ── */
        .al-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 14px; overflow-y: auto;
        }
        .al-body::-webkit-scrollbar { width: 5px; }
        .al-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        /* ── CARD ── */
        .al-card {
          background: #fff; border: 1px solid #dbe8d5; border-radius: 12px; overflow: hidden;
        }
        .al-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .al-card-header-left { display: flex; align-items: center; gap: 8px; }
        .al-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .al-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .al-card-body { padding: 20px 18px; }

        /* ── INFO BANNER ── */
        .al-info-banner {
          display: flex; align-items: flex-start; gap: 10px;
          background: #f0f8ff; border: 1px solid #c4d8f0;
          border-left: 3px solid #4a90d9; border-radius: 8px;
          padding: 10px 14px; margin-bottom: 20px;
          font-size: 12.5px; color: #1a4070; line-height: 1.55;
        }
        .al-warn-banner {
          display: flex; align-items: flex-start; gap: 10px;
          background: #fffbf0; border: 1px solid #f0dca0;
          border-left: 3px solid #e8b800; border-radius: 8px;
          padding: 10px 14px; margin-bottom: 20px;
          font-size: 12.5px; color: #5a4000; line-height: 1.55;
        }

        /* ── FIELD GRID ── */
        .al-grid {
          display: grid; grid-template-columns: repeat(12, 1fr);
          gap: 16px 14px; align-items: start;
        }
        .al-col-2  { grid-column: span 2; }
        .al-col-3  { grid-column: span 3; }
        .al-col-4  { grid-column: span 4; }
        .al-col-5  { grid-column: span 5; }
        .al-col-6  { grid-column: span 6; }
        .al-col-7  { grid-column: span 7; }
        .al-col-8  { grid-column: span 8; }
        .al-col-12 { grid-column: span 12; }

        .al-field { display: flex; flex-direction: column; gap: 5px; }

        .al-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .al-label-req { color: #c84040; font-size: 12px; line-height: 1; }

        .al-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .al-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .al-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .al-input:disabled { background: #f0f4ee; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }
        .al-input.has-error { border-color: #e05252; box-shadow: 0 0 0 2px rgba(224,82,82,0.1); }

        .al-textarea {
          width: 100%; min-height: 70px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 8px 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none; resize: vertical;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .al-textarea:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .al-textarea::placeholder { color: #b0c8b8; font-size: 12px; }

        .al-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .al-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .al-select:disabled { background-color: #f0f4ee; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }
        .al-select.has-error { border-color: #e05252; }

        .al-input-wrap { position: relative; display: flex; }
        .al-input-btn {
          height: 36px; width: 34px; flex-shrink: 0;
          background: #edf5ea; border: 1.5px solid #d4e8cc; border-left: none;
          border-radius: 0 7px 7px 0; display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #4a8060; transition: background 0.12s;
        }
        .al-input-btn:hover { background: #ddf0e0; }

        .al-field-error { font-size: 11px; color: #c84040; margin-top: 2px; display: flex; align-items: center; gap: 4px; }

        /* Toggle */
        .al-toggle-row { display: flex; align-items: center; gap: 10px; padding-top: 2px; }
        .al-toggle {
          position: relative; width: 38px; height: 20px; flex-shrink: 0; cursor: pointer;
        }
        .al-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .al-toggle-track {
          position: absolute; inset: 0; background: #d4e0d0; border-radius: 20px;
          transition: background 0.2s;
        }
        .al-toggle input:checked ~ .al-toggle-track { background: #3e9654; }
        .al-toggle-thumb {
          position: absolute; top: 3px; left: 3px; width: 14px; height: 14px;
          background: #fff; border-radius: 50%; transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .al-toggle input:checked ~ .al-toggle-thumb { transform: translateX(18px); }
        .al-toggle-label { font-size: 13px; color: #3a5a45; font-weight: 500; }
        .al-toggle-sub { font-size: 11.5px; color: #7a9c84; }

        /* Localização info box */
        .al-loc-info {
          margin-top: 6px; padding: 8px 12px;
          background: #f4f9f2; border: 1px solid #d4e8cc;
          border-radius: 7px; font-size: 12px; color: #3a5a45; line-height: 1.55;
        }

        /* ── ABAS ── */
        .al-tabs {
          display: flex; align-items: flex-end; gap: 0;
          border-bottom: 2px solid #dbe8d5;
          margin-bottom: 0; background: #fafcf9;
        }
        .al-tab {
          padding: 10px 20px; font-size: 12.5px; font-weight: 500;
          color: #6a8a74; cursor: pointer; border: none; background: transparent;
          border-bottom: 2px solid transparent; margin-bottom: -2px;
          transition: color 0.13s, border-color 0.13s; white-space: nowrap;
          font-family: 'Inter', sans-serif;
        }
        .al-tab:hover { color: #2a4a35; }
        .al-tab.active { color: #162e20; border-bottom-color: #3e9654; font-weight: 600; }
        .al-tab-body { padding: 20px 18px; }

        /* ── VINCULOS TABLE ── */
        .al-vinculos-head {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;
        }
        .al-vinculos-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.5px; }
        .al-vinculos-add { display: flex; align-items: center; gap: 8px; }

        .al-vinculos-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .al-vinculos-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5;
        }
        .al-vinculos-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; }
        .al-vinculos-table tbody tr:hover { background: #f4fbf2; }
        .al-vinculos-empty { text-align: center; padding: 32px 12px; color: #96b8a0; font-size: 12.5px; }

        .al-remove-btn {
          background: transparent; border: none; cursor: pointer; color: #c89090; padding: 3px 6px; border-radius: 5px;
          font-size: 12px; font-family: 'Inter', sans-serif;
          transition: background 0.12s, color 0.12s;
        }
        .al-remove-btn:hover { background: #fdecea; color: #b94040; }

        /* ── FEEDBACK ── */
        .al-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px;
          animation: alFadeIn 0.2s ease;
        }
        .al-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .al-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .al-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        /* ── FOOTER ── */
        .al-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .al-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .al-footer-stat strong { color: #1a2e22; font-weight: 600; }

        /* Spinner */
        @keyframes spin { to { transform: rotate(360deg); } }
        .al-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        @keyframes alFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

        /* Section divider */
        .al-section-sep {
          height: 1px; background: #edf5e8; margin: 20px 0;
        }
        .al-section-label {
          font-size: 10px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: #a0b8a8; margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px;
        }
        .al-section-label::after {
          content: ''; flex: 1; height: 1px; background: #e8f0e4;
        }
      `}</style>

      <div className="al-root">
        {/* TOPBAR */}
        <header className="al-topbar">
          <div className="al-topbar-left">
            <div className="al-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect
                  x="1.5"
                  y="1.5"
                  width="6"
                  height="6"
                  rx="1.2"
                  fill="rgba(255,255,255,0.9)"
                />
                <rect
                  x="10.5"
                  y="1.5"
                  width="6"
                  height="6"
                  rx="1.2"
                  fill="rgba(255,255,255,0.4)"
                />
                <rect
                  x="1.5"
                  y="10.5"
                  width="6"
                  height="6"
                  rx="1.2"
                  fill="rgba(255,255,255,0.4)"
                />
                <rect
                  x="10.5"
                  y="10.5"
                  width="6"
                  height="6"
                  rx="1.2"
                  fill="rgba(255,255,255,0.7)"
                />
              </svg>
            </div>
            <span className="al-app-name">
              Venture
              <span className="al-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="al-screen-title">
              VENT0800 — Cadastro de Almoxarifado
            </span>
          </div>
        </header>

        {/* ACTION BAR */}
        <div className="al-actionbar">
          <div className="al-action-group">
            <span className="al-action-label">Nav</span>
            <button className="al-nav-btn" title="Carregar registro" onClick={() => void handleLoadWarehouseByCode()} disabled={isLoadingRecord}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M9 2L3 6l6 4M2 2v8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button className="al-nav-btn" title="Limpar formulário" onClick={handleLimpar}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M8 2L4 6l4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button className="al-nav-btn" title="Consultar código digitado" onClick={() => void handleLoadWarehouseByCode()} disabled={isLoadingRecord}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M4 2l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button className="al-nav-btn" title="Atualizar do backend" onClick={() => void handleLoadWarehouseByCode()} disabled={isLoadingRecord}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M3 2l6 4-6 4M10 2v8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className="al-action-group">
            <span className="al-action-label">Ações</span>
            <button
              className="al-btn al-btn-primary"
              onClick={handleSalvar}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="al-spinner" />
                  Salvando...
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5 2v4h6V2M5 9h6"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                  Salvar
                </>
              )}
            </button>
            <button className="al-btn al-btn-danger" onClick={handleLimpar}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 3l10 10M13 3L3 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Limpar
            </button>
          </div>

          <div className="al-action-group">
            <span className="al-action-label">Ferramentas</span>
            <button className="al-btn al-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M8 7v4M8 5.5h.01"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              Ajuda
            </button>
            <button className="al-btn al-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle
                  cx="8"
                  cy="5"
                  r="3"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M2 14c0-3 2-5 6-5s6 2 6 5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              Atalhos
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="al-body">
          {/* Feedback */}
          {feedback && (
            <div className={`al-feedback ${feedback.type}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === "success" ? (
                  <path
                    d="M3 8l3.5 3.5L13 5"
                    stroke="#1e6030"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : feedback.type === "error" ? (
                  <>
                    <circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4" />
                    <path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <circle cx="8" cy="8" r="6" stroke="#4a90d9" strokeWidth="1.4" />
                    <path d="M8 7v4M8 5.5h.01" stroke="#4a90d9" strokeWidth="1.4" strokeLinecap="round" />
                  </>
                )}
              </svg>
              {feedback.message}
            </div>
          )}

          {lookupHint && <div className="al-feedback info">{lookupHint}</div>}

          {/* MAIN CARD */}
          <div className="al-card">
            <div className="al-card-header">
              <div className="al-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2 6l6-4 6 4v8a1 1 0 01-1 1H3a1 1 0 01-1-1V6z"
                    stroke="#3e9654"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6 15V9h4v6"
                    stroke="#3e9654"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="al-card-title">Cadastro de Almoxarifado</span>
              </div>
              <span className="al-card-badge">VENT0800</span>
            </div>

            {/* ABAS */}
            <div className="al-tabs">
              {ABAS.map((aba) => (
                <button
                  key={aba.id}
                  className={`al-tab${abaAtiva === aba.id ? " active" : ""}`}
                  onClick={() => setAbaAtiva(aba.id)}
                >
                  {aba.label}
                </button>
              ))}
            </div>

            {/* ── ABA: DADOS GERAIS ── */}
            {abaAtiva === "dados" && (
              <div className="al-tab-body">
                {/* Aviso assistência técnica */}
                {bloqueada && (
                  <div className="al-warn-banner">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 16 16"
                      fill="none"
                      style={{ flexShrink: 0, marginTop: 1 }}
                    >
                      <path
                        d="M8 2L1.5 13.5h13L8 2z"
                        stroke="#e8b800"
                        strokeWidth="1.4"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8 6v4M8 11.5h.01"
                        stroke="#e8b800"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span>
                      <strong>Assistência Técnica</strong> não pode ser alterada
                      manualmente. Somente itens de assistência técnica utilizam
                      esta localização.
                    </span>
                  </div>
                )}

                {/* Aviso externo/trânsito */}
                {requerVinculos && (
                  <div className="al-info-banner">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 16 16"
                      fill="none"
                      style={{ flexShrink: 0, marginTop: 1 }}
                    >
                      <circle
                        cx="8"
                        cy="8"
                        r="6"
                        stroke="#4a90d9"
                        strokeWidth="1.4"
                      />
                      <path
                        d="M8 7v4M8 5.5h.01"
                        stroke="#4a90d9"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span>
                      Para a localização <strong>{form.localizacao}</strong>, o
                      preenchimento de <strong>Cliente</strong>,{" "}
                      <strong>Estabelecimento</strong> e{" "}
                      <strong>Fornecedor</strong> é obrigatório. O cliente e o
                      estabelecimento informados devem possuir vínculo com o
                      fornecedor.
                    </span>
                  </div>
                )}

                <div className="al-grid">
                  {/* Código */}
                  <div className="al-field al-col-3">
                    <label className="al-label">
                      Código <span className="al-label-req">*</span>
                    </label>
                    <input
                      className={`al-input${errors.codigo ? " has-error" : ""}`}
                      value={form.codigo}
                      onChange={(e) =>
                        setField("codigo", e.target.value.toUpperCase())
                      }
                      placeholder="Ex: ALMOX01"
                      maxLength={20}
                    />
                    {errors.codigo && (
                      <span className="al-field-error">
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <circle
                            cx="6"
                            cy="6"
                            r="5"
                            stroke="#c84040"
                            strokeWidth="1.2"
                          />
                          <path
                            d="M6 4v2.5M6 8h.01"
                            stroke="#c84040"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                          />
                        </svg>
                        {errors.codigo}
                      </span>
                    )}
                  </div>

                  {/* Descrição */}
                  <div className="al-field al-col-9">
                    <label className="al-label">
                      Descrição <span className="al-label-req">*</span>
                    </label>
                    <input
                      className={`al-input${errors.descricao ? " has-error" : ""}`}
                      value={form.descricao}
                      onChange={(e) => setField("descricao", e.target.value)}
                      placeholder="Ex: Almoxarifado Principal"
                      maxLength={100}
                    />
                    {errors.descricao && (
                      <span className="al-field-error">
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <circle
                            cx="6"
                            cy="6"
                            r="5"
                            stroke="#c84040"
                            strokeWidth="1.2"
                          />
                          <path
                            d="M6 4v2.5M6 8h.01"
                            stroke="#c84040"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                          />
                        </svg>
                        {errors.descricao}
                      </span>
                    )}
                  </div>

                  {/* Localização */}
                  <div className="al-field al-col-4">
                    <label className="al-label">
                      Localização <span className="al-label-req">*</span>
                    </label>
                    <select
                      className={`al-select${errors.localizacao ? " has-error" : ""}`}
                      value={form.localizacao}
                      onChange={(e) =>
                        setField("localizacao", e.target.value as Localizacao)
                      }
                      disabled={bloqueada}
                    >
                      {LOCALIZACOES.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <div className="al-loc-info">
                      {LOCALIZACAO_INFO[form.localizacao]}
                    </div>
                  </div>

                  {/* Tipo */}
                  <div className="al-field al-col-3">
                    <label className="al-label">
                      Tipo <span className="al-label-req">*</span>
                    </label>
                    <select
                      className="al-select"
                      value={form.tipo}
                      onChange={(e) =>
                        setField("tipo", e.target.value as TipoAlmoxarifado)
                      }
                    >
                      {TIPOS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Almox. de Expedição */}
                  <div className="al-field al-col-4">
                    <label className="al-label">
                      Almoxarifado de Expedição
                    </label>
                    <div className="al-input-wrap">
                      <input
                        className="al-input"
                        style={{ borderRadius: "7px 0 0 7px" }}
                        value={form.almoxExpedicao}
                        onChange={(e) =>
                          setField("almoxExpedicao", e.target.value)
                        }
                        placeholder="Cód. do almox. de expedição"
                      />
                      <button
                        className="al-input-btn"
                        title="Buscar almoxarifado"
                        type="button"
                        onClick={() => void handleLookupExpedicao()}
                        disabled={isSearchingExpedicao}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <circle
                            cx="6.5"
                            cy="6.5"
                            r="4.5"
                            stroke="currentColor"
                            strokeWidth="1.4"
                          />
                          <path
                            d="M10 10l3.5 3.5"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                    <span
                      style={{ fontSize: 11, color: "#7a9c84", marginTop: 2 }}
                    >
                      Utilizado nas reservas de estoque para transferência ao
                      almoxarifado de expedição antes do faturamento.
                    </span>
                  </div>

                  {/* Disponível para planejamento */}
                  <div
                    className="al-field al-col-1"
                    style={{ justifyContent: "flex-end" }}
                  >
                    <label className="al-label">Disp. Plan.</label>
                    <div className="al-toggle-row" style={{ paddingTop: 8 }}>
                      <label className="al-toggle">
                        <input
                          type="checkbox"
                          checked={form.disponivel}
                          onChange={(e) =>
                            setField("disponivel", e.target.checked)
                          }
                        />
                        <div className="al-toggle-track" />
                        <div className="al-toggle-thumb" />
                      </label>
                      <div>
                        <span className="al-toggle-label">
                          {form.disponivel ? "Sim" : "Não"}
                        </span>
                        <div className="al-toggle-sub">
                          Cálculo de planejamento
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seção vinculos (apenas externo/trânsito) */}
                {requerVinculos && (
                  <>
                    <div className="al-section-sep" />
                    <div className="al-section-label">
                      Vínculos obrigatórios
                    </div>
                    <div className="al-grid">
                      <div className="al-field al-col-4">
                        <label className="al-label">
                          Cliente <span className="al-label-req">*</span>
                        </label>
                        <div className="al-input-wrap">
                          <input
                            className={`al-input${errors.cliente ? " has-error" : ""}`}
                            style={{ borderRadius: "7px 0 0 7px" }}
                            value={form.cliente}
                            onChange={(e) =>
                              setField("cliente", e.target.value)
                            }
                            placeholder="Código do cliente"
                          />
                          <button
                            className="al-input-btn"
                            title="Buscar cliente"
                            type="button"
                            onClick={() => void handleLookupCliente(form.cliente)}
                            disabled={isSearchingCliente}
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <circle
                                cx="6.5"
                                cy="6.5"
                                r="4.5"
                                stroke="currentColor"
                                strokeWidth="1.4"
                              />
                              <path
                                d="M10 10l3.5 3.5"
                                stroke="currentColor"
                                strokeWidth="1.4"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </div>
                        {errors.cliente && (
                          <span className="al-field-error">
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 12 12"
                              fill="none"
                            >
                              <circle
                                cx="6"
                                cy="6"
                                r="5"
                                stroke="#c84040"
                                strokeWidth="1.2"
                              />
                              <path
                                d="M6 4v2.5M6 8h.01"
                                stroke="#c84040"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                              />
                            </svg>
                            {errors.cliente}
                          </span>
                        )}
                      </div>

                      <div className="al-field al-col-4">
                        <label className="al-label">
                          Estabelecimento{" "}
                          <span className="al-label-req">*</span>
                        </label>
                        <div className="al-input-wrap">
                          <input
                            className={`al-input${errors.estabelecimento ? " has-error" : ""}`}
                            style={{ borderRadius: "7px 0 0 7px" }}
                            value={form.estabelecimento}
                            onChange={(e) =>
                              setField("estabelecimento", e.target.value)
                            }
                            placeholder="Código do estabelecimento"
                          />
                          <button
                            className="al-input-btn"
                            title="Buscar estabelecimento"
                            type="button"
                            onClick={() => void handleLookupEstabelecimento()}
                            disabled={isSearchingEstabelecimento}
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <circle
                                cx="6.5"
                                cy="6.5"
                                r="4.5"
                                stroke="currentColor"
                                strokeWidth="1.4"
                              />
                              <path
                                d="M10 10l3.5 3.5"
                                stroke="currentColor"
                                strokeWidth="1.4"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </div>
                        {errors.estabelecimento && (
                          <span className="al-field-error">
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 12 12"
                              fill="none"
                            >
                              <circle
                                cx="6"
                                cy="6"
                                r="5"
                                stroke="#c84040"
                                strokeWidth="1.2"
                              />
                              <path
                                d="M6 4v2.5M6 8h.01"
                                stroke="#c84040"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                              />
                            </svg>
                            {errors.estabelecimento}
                          </span>
                        )}
                      </div>

                      <div className="al-field al-col-4">
                        <label className="al-label">
                          Fornecedor <span className="al-label-req">*</span>
                        </label>
                        <div className="al-input-wrap">
                          <input
                            className={`al-input${errors.fornecedor ? " has-error" : ""}`}
                            style={{ borderRadius: "7px 0 0 7px" }}
                            value={form.fornecedor}
                            onChange={(e) =>
                              setField("fornecedor", e.target.value)
                            }
                            placeholder="Código do fornecedor"
                          />
                          <button
                            className="al-input-btn"
                            title="Buscar fornecedor"
                            type="button"
                            onClick={() => void handleLookupFornecedor(form.fornecedor)}
                            disabled={isSearchingFornecedor}
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <circle
                                cx="6.5"
                                cy="6.5"
                                r="4.5"
                                stroke="currentColor"
                                strokeWidth="1.4"
                              />
                              <path
                                d="M10 10l3.5 3.5"
                                stroke="currentColor"
                                strokeWidth="1.4"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </div>
                        {errors.fornecedor && (
                          <span className="al-field-error">
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 12 12"
                              fill="none"
                            >
                              <circle
                                cx="6"
                                cy="6"
                                r="5"
                                stroke="#c84040"
                                strokeWidth="1.2"
                              />
                              <path
                                d="M6 4v2.5M6 8h.01"
                                stroke="#c84040"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                              />
                            </svg>
                            {errors.fornecedor}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Observação */}
                <div className="al-section-sep" />
                <div className="al-grid">
                  <div className="al-field al-col-12">
                    <label className="al-label">Observação</label>
                    <textarea
                      className="al-textarea"
                      value={form.observacao}
                      onChange={(e) => setField("observacao", e.target.value)}
                      placeholder="Informações adicionais sobre o almoxarifado..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── ABA: CLIENTES ── */}
            {abaAtiva === "clientes" && (
              <div className="al-tab-body">
                <div className="al-vinculos-head">
                  <span className="al-vinculos-title">Clientes vinculados</span>
                  <div className="al-vinculos-add">
                    <input
                      className="al-input"
                      style={{ width: 180 }}
                      placeholder="Código do cliente"
                      value={novoCliente}
                      onChange={(e) => setNovoCliente(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && adicionarCliente()}
                    />
                    <button
                      className="al-btn al-btn-ghost al-btn-sm"
                      onClick={() => void adicionarCliente()}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M6 2v8M2 6h8"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      Adicionar
                    </button>
                  </div>
                </div>

                {clientes.length === 0 ? (
                  <div className="al-vinculos-empty">
                    Nenhum cliente vinculado. Adicione acima.
                  </div>
                ) : (
                  <table className="al-vinculos-table">
                    <thead>
                      <tr>
                        <th style={{ width: 120 }}>Código</th>
                        <th>Nome / Razão Social</th>
                        <th style={{ width: 80 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientes.map((c, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, color: "#1a4a2a" }}>
                            {c.codigo}
                          </td>
                          <td style={{ color: c.nome ? "#243830" : "#96b8a0" }}>
                            {c.nome || "—"}
                          </td>
                          <td>
                            <button
                              className="al-remove-btn"
                              onClick={() =>
                                setClientes((p) => p.filter((_, j) => j !== i))
                              }
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── ABA: FORNECEDORES ── */}
            {abaAtiva === "fornecedores" && (
              <div className="al-tab-body">
                <div className="al-vinculos-head">
                  <span className="al-vinculos-title">
                    Fornecedores vinculados
                  </span>
                  <div className="al-vinculos-add">
                    <input
                      className="al-input"
                      style={{ width: 180 }}
                      placeholder="Código do fornecedor"
                      value={novoFornecedor}
                      onChange={(e) => setNovoFornecedor(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && adicionarFornecedor()
                      }
                    />
                    <button
                      className="al-btn al-btn-ghost al-btn-sm"
                      onClick={() => void adicionarFornecedor()}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M6 2v8M2 6h8"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      Adicionar
                    </button>
                  </div>
                </div>

                {fornecedores.length === 0 ? (
                  <div className="al-vinculos-empty">
                    Nenhum fornecedor vinculado. Adicione acima.
                  </div>
                ) : (
                  <table className="al-vinculos-table">
                    <thead>
                      <tr>
                        <th style={{ width: 120 }}>Código</th>
                        <th>Nome / Razão Social</th>
                        <th style={{ width: 80 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fornecedores.map((f, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, color: "#1a4a2a" }}>
                            {f.codigo}
                          </td>
                          <td style={{ color: f.nome ? "#243830" : "#96b8a0" }}>
                            {f.nome || "—"}
                          </td>
                          <td>
                            <button
                              className="al-remove-btn"
                              onClick={() =>
                                setFornecedores((p) =>
                                  p.filter((_, j) => j !== i),
                                )
                              }
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <footer className="al-footer">
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div className="al-footer-stat">
              Código: <strong>{form.codigo || "—"}</strong>
            </div>
            <div className="al-footer-stat">
              Localização: <strong>{form.localizacao}</strong>
            </div>
            <div className="al-footer-stat">
              Tipo: <strong>{form.tipo}</strong>
            </div>
            <div className="al-footer-stat">
              Disp. Planejamento:{" "}
              <strong>{form.disponivel ? "Sim" : "Não"}</strong>
            </div>
          </div>
          <div className="al-footer-stat">
            Empresa: <strong>1 — GRUPO VENTURE LTDA</strong>
          </div>
        </footer>
      </div>
    </>
  );
}

import { useState, useCallback } from "react";
import axios from "axios";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChamadoForm {
  chamado: string;
  data_emissao: string;
  consumidor: string;
  tipo_chamado: string;
  ligacao: string;
  garantia: boolean;
  motivo: string;
  responsavel: string;
  posicao: string;
  situacao: string;
  data_solicitacao: string;
  data_retirada: string;
}

type ModoForm  = "novo" | "edicao";

type FeedbackState = {
  type: "success" | "error" | "info";
  message: string;
} | null;

interface ChamadoRow {
  chamado: string;
  data_emissao: string;
  consumidor: string;
  consumidorNome: string;
  tipo_chamado: string;
  situacao: string;
  posicao: string;
  responsavelNome: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_CHAMADO = [
  "Garantia",
  "Fora de Garantia",
  "Troca",
  "Conserto",
  "Revisão",
  "Recall",
];

const LIGACOES = [
  "Telefone",
  "E-mail",
  "Presencial",
  "Site",
  "WhatsApp",
  "Outros",
];

const MOTIVOS = [
  "Defeito de Fabricação",
  "Mau Uso",
  "Desgaste Natural",
  "Instalação Incorreta",
  "Transporte",
  "Outros",
];

const RESPONSAVEIS = [
  "Técnico A",
  "Técnico B",
  "Técnico C",
  "Supervisor D",
  "Analista E",
];

const POSICOES = ["Pendente", "Agendamento", "Resolvido"];

const SITUACOES = [
  "Pendente",
  "Em Análise",
  "Agendado",
  "Em Atendimento",
  "Vistoria",
  "Concluído",
  "Cancelado",
];

const FORM_INICIAL: ChamadoForm = {
  chamado: "",
  data_emissao: new Date().toISOString().slice(0, 10),
  consumidor: "",
  tipo_chamado: "",
  ligacao: "",
  garantia: false,
  motivo: "",
  responsavel: "",
  posicao: "",
  situacao: "",
  data_solicitacao: "",
  data_retirada: "",
};

const MOCK_CHAMADOS: ChamadoRow[] = [
  {
    chamado: "000415", data_emissao: "15/05/2026", consumidor: "001",
    consumidorNome: "SOHOME LTDA", tipo_chamado: "Garantia", situacao: "Pendente",
    posicao: "Pendente", responsavelNome: "Técnico A",
  },
  {
    chamado: "000416", data_emissao: "12/05/2026", consumidor: "002",
    consumidorNome: "ALFA S.A.", tipo_chamado: "Troca", situacao: "Concluído",
    posicao: "Resolvido", responsavelNome: "Técnico B",
  },
  {
    chamado: "000417", data_emissao: "10/05/2026", consumidor: "003",
    consumidorNome: "BETA LTDA", tipo_chamado: "Conserto", situacao: "Em Atendimento",
    posicao: "Agendamento", responsavelNome: "Técnico A",
  },
  {
    chamado: "000418", data_emissao: "08/05/2026", consumidor: "004",
    consumidorNome: "GAMA ME", tipo_chamado: "Garantia", situacao: "Vistoria",
    posicao: "Pendente", responsavelNome: "Técnico C",
  },
  {
    chamado: "000419", data_emissao: "05/05/2026", consumidor: "005",
    consumidorNome: "DELTA EIRELI", tipo_chamado: "Revisão", situacao: "Agendado",
    posicao: "Agendamento", responsavelNome: "Técnico B",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string }
      | undefined;
    const msg = data?.message ?? data?.error;
    if (msg) return msg;
  }
  return error instanceof Error ? error.message : fallback;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Vatc0280Page(): JSX.Element {
  // ── Form state
  const [form, setForm]               = useState<ChamadoForm>(FORM_INICIAL);
  const [modoForm, setModoForm]       = useState<ModoForm>("novo");
  const [chamadoEdit, setChamadoEdit] = useState<string | null>(null);
  const [errors, setErrors]           = useState<Partial<Record<keyof ChamadoForm, string>>>({});

  // ── Search state
  const [filtroChamado, setFiltroChamado]       = useState("");
  const [filtroDataEmissao, setFiltroDataEmissao] = useState("");
  const [filtroConsumidor, setFiltroConsumidor]   = useState("");
  const [resultados, setResultados]              = useState<ChamadoRow[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);

  // ── Loading / feedback
  const [isSaving,    setIsSaving]    = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [feedback,    setFeedback]    = useState<FeedbackState>(null);

  // ── Field setter
  const setField = useCallback(
    <K extends keyof ChamadoForm>(key: K, value: ChamadoForm[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
      setFeedback(null);
    },
    [],
  );

  // ── Validation
  function validate(): boolean {
    const e: Partial<Record<keyof ChamadoForm, string>> = {};
    if (!form.consumidor.trim()) e.consumidor = "Consumidor obrigatório.";
    if (!form.tipo_chamado) e.tipo_chamado = "Tipo de chamado obrigatório.";
    if (!form.motivo) e.motivo = "Motivo obrigatório.";
    if (!form.situacao) e.situacao = "Situação obrigatória.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const isVistoria = form.situacao === "Vistoria";

  // ── Load by chamado number
  async function handleCarregar() {
    if (!form.chamado.trim()) {
      setFeedback({ type: "info", message: "Informe o número do chamado." });
      return;
    }
    setIsLoading(true);
    setFeedback(null);
    try {
      await new Promise((r) => setTimeout(r, 600));
      const found = MOCK_CHAMADOS.find((c) => c.chamado === form.chamado.trim());
      if (found) {
        setForm({
          chamado: found.chamado,
          data_emissao: found.data_emissao.split("/").reverse().join("-"),
          consumidor: found.consumidor,
          tipo_chamado: found.tipo_chamado,
          ligacao: "Telefone",
          garantia: found.tipo_chamado === "Garantia",
          motivo: "Defeito de Fabricação",
          responsavel: found.responsavelNome,
          posicao: found.posicao,
          situacao: found.situacao,
          data_solicitacao: found.situacao === "Vistoria" ? "2026-05-10" : "",
          data_retirada: found.situacao === "Vistoria" ? "2026-05-20" : "",
        });
        setErrors({});
        setModoForm("edicao");
        setChamadoEdit(found.chamado);
        setFeedback({ type: "info", message: `Chamado ${found.chamado} — ${found.consumidorNome} carregado para edição.` });
      } else {
        setFeedback({ type: "info", message: `Chamado ${form.chamado.trim()} não encontrado.` });
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeErrorMessage(error, "Erro ao carregar chamado."),
      });
    } finally {
      setIsLoading(false);
    }
  }

  // ── Search
  async function handlePesquisar() {
    setIsSearching(true);
    setFeedback(null);
    try {
      await new Promise((r) => setTimeout(r, 500));
      let filtered = [...MOCK_CHAMADOS];
      if (filtroChamado.trim())
        filtered = filtered.filter((c) => c.chamado.includes(filtroChamado.trim()));
      if (filtroDataEmissao) {
        const fDate = filtroDataEmissao.split("-").reverse().join("/");
        filtered = filtered.filter((c) => c.data_emissao === fDate);
      }
      if (filtroConsumidor.trim())
        filtered = filtered.filter(
          (c) =>
            c.consumidor.includes(filtroConsumidor.trim()) ||
            c.consumidorNome.toUpperCase().includes(filtroConsumidor.trim().toUpperCase()),
        );
      setResultados(filtered);
      setMostrarResultados(true);
      if (filtered.length === 0) {
        setFeedback({ type: "info", message: "Nenhum chamado encontrado para os filtros informados." });
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeErrorMessage(error, "Erro ao pesquisar chamados."),
      });
    } finally {
      setIsSearching(false);
    }
  }

  // ── Select from list → load into form
  function handleSelectFromList(row: ChamadoRow) {
    setForm({
      chamado: row.chamado,
      data_emissao: row.data_emissao.split("/").reverse().join("-"),
      consumidor: row.consumidor,
      tipo_chamado: row.tipo_chamado,
      ligacao: "Telefone",
      garantia: row.tipo_chamado === "Garantia",
      motivo: "Defeito de Fabricação",
      responsavel: row.responsavelNome,
      posicao: row.posicao,
      situacao: row.situacao,
      data_solicitacao: row.situacao === "Vistoria" ? "2026-05-10" : "",
      data_retirada: row.situacao === "Vistoria" ? "2026-05-20" : "",
    });
    setFeedback(null);
    setErrors({});
    setModoForm("edicao");
    setChamadoEdit(row.chamado);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  // ── Save
  async function handleSalvar() {
    if (!validate()) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const newChamado = form.chamado || String(Math.floor(Math.random() * 90000) + 10000);
      if (!form.chamado) {
        setField("chamado", newChamado);
        setChamadoEdit(newChamado);
        setModoForm("edicao");
      }
      setFeedback({
        type: "success",
        message: `Chamado ${newChamado} salvo com sucesso.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeErrorMessage(error, "Erro ao salvar chamado."),
      });
    } finally {
      setIsSaving(false);
    }
  }

  // ── Novo Chamado
  function handleNovo() {
    setForm(FORM_INICIAL);
    setErrors({});
    setFeedback(null);
    setModoForm("novo");
    setChamadoEdit(null);
  }

  // ── Limpar
  function handleLimpar() {
    handleNovo();
    setMostrarResultados(false);
  }

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .atc-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        /* ── TOPBAR ── */
        .atc-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .atc-topbar-left { display: flex; align-items: center; gap: 10px; }
        .atc-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .atc-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .atc-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .atc-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        /* ── ACTION BAR ── */
        .atc-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .atc-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .atc-action-group:last-child { border-right: none; }
        .atc-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .atc-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .atc-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .atc-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .atc-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .atc-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .atc-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .atc-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .atc-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .atc-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .atc-btn-sm { height: 28px; padding: 0 9px; font-size: 12px; }
        .atc-btn-new {
          background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600;
        }
        .atc-btn-new:hover:not(:disabled) { background: #dff5e4; border-color: #88c898; }

        /* ── BODY ── */
        .atc-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .atc-body::-webkit-scrollbar { width: 5px; }
        .atc-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        /* ── SECTION BANNER ── */
        .atc-section-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 0 8px;
        }
        .atc-section-banner:first-child { padding-top: 0; }
        .atc-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .atc-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .atc-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        /* ── CARD ── */
        .atc-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .atc-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .atc-card-header-left { display: flex; align-items: center; gap: 8px; }
        .atc-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .atc-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .atc-card-body { padding: 18px; }

        /* ── MODO BADGES ── */
        .atc-modo-novo {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600; padding: 3px 10px;
          border-radius: 20px; background: #e8f5e0; color: #1e5818;
          border: 1px solid #a8d898;
        }
        .atc-modo-edicao {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600; padding: 3px 10px;
          border-radius: 20px; background: #fff8e0; color: #7a5200;
          border: 1px solid #e0c860;
        }
        .atc-modo-dot {
          width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
        }
        .atc-modo-novo  .atc-modo-dot { background: #3e9654; }
        .atc-modo-edicao .atc-modo-dot { background: #c8a020; }

        /* ── FILTER ROW ── */
        .atc-filter-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }

        /* ── GRID ── */
        .atc-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .atc-col-2  { grid-column: span 2; }
        .atc-col-3  { grid-column: span 3; }
        .atc-col-4  { grid-column: span 4; }
        .atc-col-5  { grid-column: span 5; }
        .atc-col-6  { grid-column: span 6; }
        .atc-col-8  { grid-column: span 8; }
        .atc-col-10 { grid-column: span 10; }
        .atc-col-12 { grid-column: span 12; }

        /* ── FIELDS ── */
        .atc-field { display: flex; flex-direction: column; gap: 5px; }
        .atc-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .atc-label-req { color: #c84040; font-size: 12px; line-height: 1; }
        .atc-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .atc-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .atc-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .atc-input:disabled { background: #f0f4ee; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }
        .atc-input.has-error { border-color: #e05252; box-shadow: 0 0 0 2px rgba(224,82,82,0.1); }
        .atc-input[type="date"] { cursor: pointer; }

        .atc-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .atc-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }

        .atc-input-wrap { position: relative; display: flex; }
        .atc-input-btn {
          height: 36px; padding: 0 10px; flex-shrink: 0;
          background: #edf5ea; border: 1.5px solid #d4e8cc; border-left: none;
          border-radius: 0 7px 7px 0; display: flex; align-items: center;
          justify-content: center; gap: 5px;
          cursor: pointer; color: #3a6048;
          font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 500;
          transition: background 0.12s; white-space: nowrap;
        }
        .atc-input-btn:hover { background: #ddf0e0; }
        .atc-input-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .atc-field-error { font-size: 11px; color: #c84040; margin-top: 2px; display: flex; align-items: center; gap: 4px; }
        .atc-field-hint  { font-size: 11px; color: #7a9c84; margin-top: 2px; line-height: 1.45; }

        /* ── TOGGLE ── */
        .atc-toggle-row { display: flex; align-items: center; gap: 10px; padding-top: 2px; }
        .atc-toggle { position: relative; width: 38px; height: 20px; flex-shrink: 0; cursor: pointer; }
        .atc-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .atc-toggle-track { position: absolute; inset: 0; background: #d4e0d0; border-radius: 20px; transition: background 0.2s; }
        .atc-toggle input:checked ~ .atc-toggle-track { background: #3e9654; }
        .atc-toggle-thumb {
          position: absolute; top: 3px; left: 3px; width: 14px; height: 14px;
          background: #fff; border-radius: 50%; transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .atc-toggle input:checked ~ .atc-toggle-thumb { transform: translateX(18px); }
        .atc-toggle-label { font-size: 13px; color: #3a5a45; font-weight: 500; }

        /* ── SECTION DIVIDER ── */
        .atc-section-sep   { height: 1px; background: #edf5e8; margin: 20px 0; }
        .atc-section-label {
          font-size: 10px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: #a0b8a8; margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px;
        }
        .atc-section-label::after { content: ''; flex: 1; height: 1px; background: #e8f0e4; }

        /* ── RESULTS TABLE ── */
        .atc-results-wrap { border-top: 1px solid #edf5e8; overflow-x: auto; }
        .atc-results-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4;
        }
        .atc-results-bar-left { display: flex; align-items: center; gap: 8px; }
        .atc-results-bar-label { font-size: 11px; font-weight: 600; color: #4a7060; text-transform: uppercase; letter-spacing: 0.5px; }
        .atc-results-hint { font-size: 11px; color: #96b8a0; }
        .atc-results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .atc-results-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .atc-results-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .atc-results-table tbody tr { cursor: pointer; transition: background 0.1s; }
        .atc-results-table tbody tr:hover { background: #eef9f0; }
        .atc-results-empty { text-align: center; padding: 28px 12px; color: #96b8a0; font-size: 12.5px; }

        .atc-tipo-badge {
          display: inline-flex; align-items: center;
          font-size: 11px; font-weight: 600; border-radius: 12px; padding: 2px 8px;
        }
        .atc-tipo-badge.garantia    { background: #e8f5e0; color: #2a6018; border: 1px solid #b4d898; }
        .atc-tipo-badge.troca       { background: #fdf0e8; color: #603000; border: 1px solid #e0b890; }
        .atc-tipo-badge.conserto    { background: #e8f0fc; color: #1a4080; border: 1px solid #a8c0e8; }
        .atc-tipo-badge.revisao     { background: #fdf8e8; color: #604800; border: 1px solid #e0d090; }
        .atc-tipo-badge.recall      { background: #fde8e8; color: #801a1a; border: 1px solid #e0a8a8; }
        .atc-tipo-badge.outros      { background: #f3f0fc; color: #402080; border: 1px solid #c0b0e0; }

        /* ── SITUACAO BADGE ── */
        .atc-sit-badge {
          display: inline-flex; align-items: center;
          font-size: 11px; font-weight: 600; border-radius: 12px; padding: 2px 8px;
        }
        .atc-sit-badge.pendente       { background: #fff0f0; color: #b91c1c; border: 1px solid #f0c0c0; }
        .atc-sit-badge.andamento      { background: #fff8f0; color: #b96c1c; border: 1px solid #f0d0a0; }
        .atc-sit-badge.concluido      { background: #f0faf2; color: #1e6030; border: 1px solid #b4dec0; }
        .atc-sit-badge.vistoria       { background: #f0f0ff; color: #1c2cb9; border: 1px solid #b0b0f0; }
        .atc-sit-badge.outros-status  { background: #f4f4f4; color: #505050; border: 1px solid #d0d0d0; }

        /* ── FEEDBACK ── */
        .atc-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: atcFadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .atc-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .atc-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .atc-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        /* ── FOOTER ── */
        .atc-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .atc-footer-left { display: flex; align-items: center; gap: 20px; }
        .atc-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .atc-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .atc-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        .atc-spinner-dark {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid #d4e8cc; border-top-color: #3e9654;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        @keyframes atcFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="atc-root">

        {/* ── TOPBAR ── */}
        <header className="atc-topbar">
          <div className="atc-topbar-left">
            <div className="atc-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="atc-app-name">
              Venture<span className="atc-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="atc-screen-title">VATC0280 — Cadastro de Chamados</span>
          </div>
        </header>

        {/* ── ACTION BAR ── */}
        <div className="atc-actionbar">
          <div className="atc-action-group">
            <span className="atc-action-label">Cadastro</span>
            <button
              className="atc-btn atc-btn-new"
              onClick={handleNovo}
              disabled={isSaving || isLoading}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Novo Chamado
            </button>
          </div>

          <div className="atc-action-group">
            <span className="atc-action-label">Ações</span>
            <button
              className="atc-btn atc-btn-primary"
              onClick={() => void handleSalvar()}
              disabled={isSaving || isLoading}
            >
              {isSaving
                ? <><div className="atc-spinner" />Salvando...</>
                : <>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                      <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    Salvar
                  </>
              }
            </button>
            <button
              className="atc-btn atc-btn-danger"
              onClick={handleLimpar}
              disabled={isSaving || isLoading}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Limpar
            </button>
          </div>

          <div className="atc-action-group">
            <button className="atc-btn atc-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Ajuda
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="atc-body">

          {/* Feedback */}
          {feedback && (
            <div className={`atc-feedback ${feedback.type}`}>
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

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* SEÇÃO 1 — PESQUISA                                         */}
          {/* ═══════════════════════════════════════════════════════════ */}

          <div className="atc-section-banner">
            <span className="atc-section-banner-pill">1 — Pesquisar</span>
            <div className="atc-section-banner-line" />
            <span className="atc-section-banner-hint">Filtre a lista e clique em um registro para carregá-lo no formulário abaixo</span>
          </div>

          <div className="atc-card">
            <div className="atc-card-header">
              <div className="atc-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4" />
                  <path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="atc-card-title">Pesquisa de Chamados</span>
              </div>
            </div>

            <div className="atc-card-body" style={{ paddingBottom: 14 }}>
              <div className="atc-filter-row">
                <div className="atc-field" style={{ flex: "0 0 140px" }}>
                  <label className="atc-label">Chamado</label>
                  <input
                    className="atc-input"
                    placeholder="Nº chamado"
                    value={filtroChamado}
                    onChange={(e) => setFiltroChamado(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void handlePesquisar()}
                  />
                </div>
                <div className="atc-field" style={{ flex: "0 0 165px" }}>
                  <label className="atc-label">Data Emissão</label>
                  <input
                    type="date"
                    className="atc-input"
                    value={filtroDataEmissao}
                    onChange={(e) => setFiltroDataEmissao(e.target.value)}
                  />
                </div>
                <div className="atc-field" style={{ flex: "0 0 220px" }}>
                  <label className="atc-label">Consumidor</label>
                  <input
                    className="atc-input"
                    placeholder="Código ou nome"
                    value={filtroConsumidor}
                    onChange={(e) => setFiltroConsumidor(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void handlePesquisar()}
                  />
                </div>
                <div style={{ alignSelf: "flex-end" }}>
                  <button
                    className="atc-btn atc-btn-ghost"
                    onClick={() => void handlePesquisar()}
                    disabled={isSearching}
                  >
                    {isSearching
                      ? <><div className="atc-spinner-dark" />Buscando...</>
                      : <>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                            <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          </svg>
                          Pesquisar
                        </>
                    }
                  </button>
                </div>
              </div>
            </div>

            {/* Results */}
            {mostrarResultados && (
              <div className="atc-results-wrap">
                <div className="atc-results-bar">
                  <div className="atc-results-bar-left">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span className="atc-results-bar-label">Resultados</span>
                    <span className="atc-card-badge">{resultados.length} registro(s)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="atc-results-hint">↓ Clique em um registro para carregar no formulário</span>
                    <button
                      className="atc-btn atc-btn-ghost atc-btn-sm"
                      onClick={() => setMostrarResultados(false)}
                    >
                      Fechar
                    </button>
                  </div>
                </div>

                {resultados.length === 0 ? (
                  <div className="atc-results-empty">Nenhum chamado encontrado para os filtros informados.</div>
                ) : (
                  <table className="atc-results-table">
                    <thead>
                      <tr>
                        <th style={{ width: 90 }}>Chamado</th>
                        <th style={{ width: 110 }}>Data Emissão</th>
                        <th>Consumidor</th>
                        <th style={{ width: 130 }}>Tipo</th>
                        <th style={{ width: 110 }}>Situação</th>
                        <th style={{ width: 110 }}>Posição</th>
                        <th>Responsável</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map((r) => {
                        const tipoClass =
                          r.tipo_chamado === "Garantia" ? "garantia"
                          : r.tipo_chamado === "Troca" ? "troca"
                          : r.tipo_chamado === "Conserto" ? "conserto"
                          : r.tipo_chamado === "Revisão" ? "revisao"
                          : r.tipo_chamado === "Recall" ? "recall"
                          : "outros";
                        const sitClass =
                          r.situacao === "Pendente" ? "pendente"
                          : r.situacao === "Vistoria" ? "vistoria"
                          : r.situacao === "Concluído" || r.situacao === "Cancelado" ? "concluido"
                          : "andamento";
                        return (
                          <tr key={r.chamado} onClick={() => handleSelectFromList(r)}>
                            <td style={{ fontWeight: 600, color: "#1a4a2a" }}>{r.chamado}</td>
                            <td style={{ fontSize: 12 }}>{r.data_emissao}</td>
                            <td>{r.consumidorNome}</td>
                            <td>
                              <span className={`atc-tipo-badge ${tipoClass}`}>{r.tipo_chamado}</span>
                            </td>
                            <td>
                              <span className={`atc-sit-badge ${sitClass}`}>{r.situacao}</span>
                            </td>
                            <td>{r.posicao}</td>
                            <td>{r.responsavelNome}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* SEÇÃO 2 — CRIAR / EDITAR                                   */}
          {/* ═══════════════════════════════════════════════════════════ */}

          <div className="atc-section-banner">
            <span className="atc-section-banner-pill">2 — Criar / Editar</span>
            <div className="atc-section-banner-line" />
            <span className="atc-section-banner-hint">
              {modoForm === "novo"
                ? "Preencha os campos e clique em Salvar para criar um novo chamado"
                : `Editando Chamado #${chamadoEdit ?? "?"} — clique em Novo Chamado para cancelar`}
            </span>
          </div>

          {/* ── MAIN FORM CARD ── */}
          <div className="atc-card">
            <div className="atc-card-header">
              <div className="atc-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="atc-card-title">Chamado</span>
              </div>
              {modoForm === "novo"
                ? <span className="atc-modo-novo"><span className="atc-modo-dot" />Novo Cadastro</span>
                : <span className="atc-modo-edicao"><span className="atc-modo-dot" />Editando Chamado #{chamadoEdit}</span>
              }
            </div>

            <div className="atc-card-body">
              <div className="atc-section-label">Dados do Chamado</div>
              <div className="atc-grid">

                {/* Chamado */}
                <div className="atc-field atc-col-2">
                  <label className="atc-label">Chamado</label>
                  <div className="atc-input-wrap">
                    <input
                      className="atc-input"
                      style={{ borderRadius: "7px 0 0 7px" }}
                      placeholder="Nº chamado"
                      value={form.chamado}
                      onChange={(e) => setField("chamado", e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void handleCarregar()}
                    />
                    <button
                      className="atc-input-btn"
                      title="Carregar Chamado"
                      type="button"
                      disabled={isLoading}
                      onClick={() => void handleCarregar()}
                    >
                      {isLoading
                        ? <div className="atc-spinner-dark" style={{ width: 12, height: 12 }} />
                        : <>
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                              <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            </svg>
                            Carregar
                          </>
                      }
                    </button>
                  </div>
                  <span className="atc-field-hint">Enter ou "Carregar" para buscar chamado existente.</span>
                </div>

                {/* Data Emissão */}
                <div className="atc-field atc-col-2">
                  <label className="atc-label">Data Emissão</label>
                  <input
                    type="date"
                    className="atc-input"
                    value={form.data_emissao}
                    onChange={(e) => setField("data_emissao", e.target.value)}
                  />
                </div>

                {/* Consumidor */}
                <div className="atc-field atc-col-4">
                  <label className="atc-label">Consumidor <span className="atc-label-req">*</span></label>
                  <input
                    className={`atc-input${errors.consumidor ? " has-error" : ""}`}
                    placeholder="Código ou nome do consumidor"
                    value={form.consumidor}
                    onChange={(e) => setField("consumidor", e.target.value)}
                  />
                  {errors.consumidor && (
                    <span className="atc-field-error">
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2" />
                        <path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                      {errors.consumidor}
                    </span>
                  )}
                </div>

                {/* Tipo Chamado */}
                <div className="atc-field atc-col-2">
                  <label className="atc-label">Tipo Chamado <span className="atc-label-req">*</span></label>
                  <select
                    className={`atc-select${errors.tipo_chamado ? " has-error" : ""}`}
                    value={form.tipo_chamado}
                    onChange={(e) => setField("tipo_chamado", e.target.value)}
                  >
                    <option value="">— Selecione —</option>
                    {TIPOS_CHAMADO.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {errors.tipo_chamado && (
                    <span className="atc-field-error">
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2" />
                        <path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                      {errors.tipo_chamado}
                    </span>
                  )}
                </div>

                {/* Ligação */}
                <div className="atc-field atc-col-2">
                  <label className="atc-label">Ligação</label>
                  <select
                    className="atc-select"
                    value={form.ligacao}
                    onChange={(e) => setField("ligacao", e.target.value)}
                  >
                    <option value="">— Selecione —</option>
                    {LIGACOES.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="atc-section-sep" />

              <div className="atc-grid">
                {/* Garantia */}
                <div className="atc-field atc-col-3">
                  <label className="atc-label">Garantia</label>
                  <div style={{ paddingTop: 6 }}>
                    <div className="atc-toggle-row">
                      <label className="atc-toggle">
                        <input
                          type="checkbox"
                          checked={form.garantia}
                          onChange={(e) => setField("garantia", e.target.checked)}
                        />
                        <div className="atc-toggle-track" />
                        <div className="atc-toggle-thumb" />
                      </label>
                      <div>
                        <span className="atc-toggle-label">
                          {form.garantia ? "Em Garantia" : "Fora de Garantia"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Motivo */}
                <div className="atc-field atc-col-3">
                  <label className="atc-label">Motivo <span className="atc-label-req">*</span></label>
                  <select
                    className={`atc-select${errors.motivo ? " has-error" : ""}`}
                    value={form.motivo}
                    onChange={(e) => setField("motivo", e.target.value)}
                  >
                    <option value="">— Selecione —</option>
                    {MOTIVOS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  {errors.motivo && (
                    <span className="atc-field-error">
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2" />
                        <path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                      {errors.motivo}
                    </span>
                  )}
                </div>

                {/* Responsável */}
                <div className="atc-field atc-col-3">
                  <label className="atc-label">Responsável</label>
                  <select
                    className="atc-select"
                    value={form.responsavel}
                    onChange={(e) => setField("responsavel", e.target.value)}
                  >
                    <option value="">— Selecione —</option>
                    {RESPONSAVEIS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Posição */}
                <div className="atc-field atc-col-3">
                  <label className="atc-label">Posição</label>
                  <select
                    className="atc-select"
                    value={form.posicao}
                    onChange={(e) => setField("posicao", e.target.value)}
                  >
                    <option value="">— Selecione —</option>
                    {POSICOES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="atc-section-sep" />

              <div className="atc-grid">
                {/* Situação */}
                <div className="atc-field atc-col-3">
                  <label className="atc-label">Situação <span className="atc-label-req">*</span></label>
                  <select
                    className={`atc-select${errors.situacao ? " has-error" : ""}`}
                    value={form.situacao}
                    onChange={(e) => setField("situacao", e.target.value)}
                  >
                    <option value="">— Selecione —</option>
                    {SITUACOES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {errors.situacao && (
                    <span className="atc-field-error">
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2" />
                        <path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                      {errors.situacao}
                    </span>
                  )}
                </div>

                {/* Data Solicitação - enabled only when Situação === Vistoria */}
                <div className="atc-field atc-col-2">
                  <label className="atc-label">Data Solicitação</label>
                  <input
                    type="date"
                    className="atc-input"
                    value={form.data_solicitacao}
                    onChange={(e) => setField("data_solicitacao", e.target.value)}
                    disabled={!isVistoria}
                  />
                  {!isVistoria && (
                    <span className="atc-field-hint">Disponível apenas para Situação "Vistoria".</span>
                  )}
                </div>

                {/* Data Retirada - enabled only when Situação === Vistoria */}
                <div className="atc-field atc-col-2">
                  <label className="atc-label">Data Retirada</label>
                  <input
                    type="date"
                    className="atc-input"
                    value={form.data_retirada}
                    onChange={(e) => setField("data_retirada", e.target.value)}
                    disabled={!isVistoria}
                  />
                  {!isVistoria && (
                    <span className="atc-field-hint">Disponível apenas para Situação "Vistoria".</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="atc-footer">
          <div className="atc-footer-left">
            <div className="atc-footer-stat">
              Chamado: <strong>{form.chamado || "—"}</strong>
            </div>
            <div className="atc-footer-stat">
              Tipo: <strong>{form.tipo_chamado || "—"}</strong>
            </div>
            <div className="atc-footer-stat">
              Garantia: <strong>{form.garantia ? "Sim" : "Não"}</strong>
            </div>
            <div className="atc-footer-stat">
              Situação: <strong>{form.situacao || "—"}</strong>
            </div>
            <div className="atc-footer-stat">
              Posição: <strong>{form.posicao || "—"}</strong>
            </div>
          </div>
          <div className="atc-footer-stat" style={{ gap: 8 }}>
            {modoForm === "novo"
              ? <span className="atc-modo-novo" style={{ fontSize: 11 }}><span className="atc-modo-dot" />Novo Cadastro</span>
              : <span className="atc-modo-edicao" style={{ fontSize: 11 }}><span className="atc-modo-dot" />Editando #{chamadoEdit}</span>
            }
            <span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>

      </div>
    </>
  );
}

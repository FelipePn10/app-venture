import { useState, useCallback } from "react";
import {
  type PoliticaFreteResponse,
  type PoliticaFreteLinhaDTO,
} from "@/services/pdvPoliticaService";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPO_DADO_OPCOES = [
  "Cliente", "Transportadora", "Cidade", "UF", "CEP", "Rota",
  "Veículo", "Carga Fracionada", "Capital", "Tipo Veículo", "Item", "Classificação do Item",
] as const;

const MAX_TIPO_DADO = 6;

const MOCK_POLITICAS_FRETE: PoliticaFreteResponse[] = [
  { prioridade: 1, sequencia: 50, validade_inicial: "2026-01-01", validade_final: "2026-12-31", tipo_dado: ["Cliente", "UF", "Cidade"], linhas: [] },
  { prioridade: 2, sequencia: 60, validade_inicial: "2026-06-01", validade_final: "", tipo_dado: ["Transportadora", "Rota", "Veículo"], linhas: [] },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type ModoForm = "novo" | "edicao";
type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface FormFrete {
  prioridade: string;
  sequencia: string;
  validade_inicial: string;
  validade_final: string;
  tipo_dado: string[];
}

const FORM_INICIAL: FormFrete = {
  prioridade: "",
  sequencia: "",
  validade_inicial: "",
  validade_final: "",
  tipo_dado: [],
};

const LINHA_FRETE_INICIAL: PoliticaFreteLinhaDTO = {
  linha: 1, inicio: 0, fim: 0, transportadora: "",
  seguro_valor: 0, seguro_tipo: "Percentual", seguro_aplicacao: "Valor da Nota",
  pedagio_valor: 0, pedagio_tipo: "Percentual", pedagio_aplicacao: "Valor da Nota",
  valor_excedente_valor: 0, valor_excedente_tipo: "Percentual", valor_excedente_aplicacao: "Valor da Nota",
  peso_excedente_valor: 0, peso_excedente_tipo: "Percentual", peso_excedente_aplicacao: "Valor da Nota",
  valor_ate: 0, peso_ate: 0,
  valor_frete_valor: 0, valor_frete_tipo: "Percentual", valor_frete_aplicacao: "Valor da Nota",
  excedente: false, valor_base: 0, peso_base: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateBR(iso: string): string {
  if (!iso || iso.length < 10) return "—";
  const [y, m, d] = iso.substring(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Vpdv0111Page(): JSX.Element {
  const [form, setForm] = useState<FormFrete>(FORM_INICIAL);
  const [modoForm, setModoForm] = useState<ModoForm>("novo");
  const [codigoEdit, setCodigoEdit] = useState<number | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormFrete, string>>>({});

  // Search
  const [filtroPrioridade, setFiltroPrioridade] = useState("");
  const [filtroSequencia, setFiltroSequencia] = useState("");
  const [filtroValidade, setFiltroValidade] = useState("");
  const [resultados, setResultados] = useState<PoliticaFreteResponse[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);

  // Modal
  const [showPoliticaModal, setShowPoliticaModal] = useState(false);
  const [linhasFrete, setLinhasFrete] = useState<PoliticaFreteLinhaDTO[]>([]);
  const [linhaForm, setLinhaForm] = useState<PoliticaFreteLinhaDTO>(LINHA_FRETE_INICIAL);

  // Loading / feedback
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const setField = useCallback(
    <K extends keyof FormFrete>(key: K, value: FormFrete[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
      setFeedback(null);
    },
    [],
  );

  function toggleTipoDado(dado: string) {
    setForm((prev) => {
      const current = prev.tipo_dado;
      if (current.includes(dado)) return { ...prev, tipo_dado: current.filter((d) => d !== dado) };
      if (current.length >= MAX_TIPO_DADO) {
        setFeedback({ type: "info", message: `Máximo de ${MAX_TIPO_DADO} tipos permitidos.` });
        return prev;
      }
      return { ...prev, tipo_dado: [...current, dado] };
    });
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormFrete, string>> = {};
    if (!form.prioridade.trim()) e.prioridade = "Prioridade obrigatória.";
    else if (isNaN(Number(form.prioridade)) || Number(form.prioridade) <= 0) e.prioridade = "Deve ser número positivo.";
    if (!form.sequencia.trim()) e.sequencia = "Sequência obrigatória.";
    else if (isNaN(Number(form.sequencia)) || Number(form.sequencia) <= 0) e.sequencia = "Deve ser número positivo.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handlePesquisar() {
    setIsSearching(true);
    setFeedback(null);
    try {
      await new Promise((r) => setTimeout(r, 600));
      let filtered = MOCK_POLITICAS_FRETE;
      if (filtroPrioridade) filtered = filtered.filter((p) => String(p.prioridade).includes(filtroPrioridade));
      if (filtroSequencia) filtered = filtered.filter((p) => String(p.sequencia).includes(filtroSequencia));
      if (filtroValidade) filtered = filtered.filter((p) => p.validade_inicial <= filtroValidade && (!p.validade_final || p.validade_final >= filtroValidade));
      setResultados(filtered);
      setMostrarResultados(true);
    } catch (error) {
      setFeedback({ type: "error", message: "Erro ao pesquisar." });
    } finally { setIsSearching(false); }
  }

  function handleSelectFromList(p: PoliticaFreteResponse) {
    setForm({
      prioridade: String(p.prioridade),
      sequencia: String(p.sequencia),
      validade_inicial: p.validade_inicial,
      validade_final: p.validade_final,
      tipo_dado: p.tipo_dado,
    });
    setModoForm("edicao");
    setCodigoEdit(p.sequencia);
    setErrors({});
  }

  async function handleSalvar() {
    if (!validate()) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      await new Promise((r) => setTimeout(r, 800));
      setFeedback({ type: "success", message: `Política de Frete Seq. ${form.sequencia} salva com sucesso.` });
    } catch (error) {
      setFeedback({ type: "error", message: "Erro ao salvar." });
    } finally { setIsSaving(false); }
  }

  function handleNovo() {
    setForm(FORM_INICIAL);
    setErrors({});
    setFeedback(null);
    setModoForm("novo");
    setCodigoEdit(null);
  }

  function handleLimpar() {
    handleNovo();
    setMostrarResultados(false);
    setLinhasFrete([]);
  }

  function addLinha() {
    setLinhasFrete((prev) => {
      const next = [...prev, linhaForm];
      setLinhaForm({ ...LINHA_FRETE_INICIAL, linha: next.length + 1 });
      return next;
    });
  }

  const TIPO_APLICACAO_OPTS = ["Percentual", "Valor"] as const;
  const APLICACAO_OPTS = ["Valor da Nota", "Valor Mercadoria"] as const;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .pdv2-root { min-height: 100vh; background: #f0f4ee; font-family: 'Inter', sans-serif; color: #1a2e22; display: flex; flex-direction: column; }
        .pdv2-topbar { height: 52px; background: #162e20; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; flex-shrink: 0; border-bottom: 1px solid rgba(62,150,84,0.15); }
        .pdv2-topbar-left { display: flex; align-items: center; gap: 10px; }
        .pdv2-logo-mark { width: 28px; height: 28px; background: #3e9654; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
        .pdv2-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .pdv2-app-sub { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .pdv2-screen-title { font-size: 12.5px; font-weight: 500; color: #5a9a6a; padding-left: 14px; margin-left: 14px; border-left: 1px solid rgba(255,255,255,0.08); }

        .pdv2-actionbar { background: #fff; border-bottom: 1px solid #dbe8d5; padding: 0 20px; display: flex; align-items: center; gap: 4px; height: 46px; flex-shrink: 0; }
        .pdv2-action-group { display: flex; align-items: center; gap: 4px; padding-right: 12px; margin-right: 8px; border-right: 1px solid #e8f0e4; }
        .pdv2-action-group:last-child { border-right: none; }
        .pdv2-action-label { font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap; }
        .pdv2-btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 1.5px solid transparent; border-radius: 7px; font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: background 0.13s, border-color 0.13s, color 0.13s; }
        .pdv2-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .pdv2-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .pdv2-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .pdv2-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .pdv2-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .pdv2-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .pdv2-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .pdv2-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .pdv2-btn-sm { height: 28px; padding: 0 9px; font-size: 12px; }
        .pdv2-btn-new { background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600; }
        .pdv2-btn-new:hover:not(:disabled) { background: #dff5e4; border-color: #88c898; }
        .pdv2-btn-accent { background: #fdf3e0; color: #6a4a10; border-color: #e0c890; font-weight: 500; }
        .pdv2-btn-accent:hover:not(:disabled) { background: #f8e8c0; border-color: #d0b870; }

        .pdv2-body { flex: 1; padding: 16px 20px; display: flex; flex-direction: column; gap: 0; overflow-y: auto; }
        .pdv2-body::-webkit-scrollbar { width: 5px; }
        .pdv2-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .pdv2-section-banner { display: flex; align-items: center; gap: 10px; padding: 14px 0 8px; }
        .pdv2-section-banner:first-child { padding-top: 0; }
        .pdv2-section-banner-pill { font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #5a8068; background: #e0ede0; border: 1px solid #c8dcc8; border-radius: 20px; padding: 3px 10px; white-space: nowrap; }
        .pdv2-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .pdv2-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .pdv2-card { background: #fff; border: 1px solid #dbe8d5; border-radius: 12px; overflow: hidden; margin-bottom: 14px; }
        .pdv2-card-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9; }
        .pdv2-card-header-left { display: flex; align-items: center; gap: 8px; }
        .pdv2-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .pdv2-card-badge { font-size: 10.5px; font-weight: 500; color: #3e9654; background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px; }
        .pdv2-card-body { padding: 18px 18px; }

        .pdv2-modo-novo { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; background: #e8f5e0; color: #1e5818; border: 1px solid #a8d898; }
        .pdv2-modo-edicao { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; background: #fff8e0; color: #7a5200; border: 1px solid #e0c860; }
        .pdv2-modo-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .pdv2-modo-novo .pdv2-modo-dot { background: #3e9654; }
        .pdv2-modo-edicao .pdv2-modo-dot { background: #c8a020; }

        .pdv2-filter-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }

        .pdv2-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .pdv2-col-2  { grid-column: span 2; }
        .pdv2-col-3  { grid-column: span 3; }
        .pdv2-col-4  { grid-column: span 4; }
        .pdv2-col-5  { grid-column: span 5; }
        .pdv2-col-6  { grid-column: span 6; }
        .pdv2-col-12 { grid-column: span 12; }

        .pdv2-field { display: flex; flex-direction: column; gap: 5px; }
        .pdv2-label { font-size: 10.5px; font-weight: 600; color: #5a8068; text-transform: uppercase; letter-spacing: 0.4px; display: flex; align-items: center; gap: 4px; }
        .pdv2-label-req { color: #c84040; font-size: 12px; line-height: 1; }
        .pdv2-input { width: 100%; height: 36px; background: #f8fbf6; border: 1.5px solid #d4e8cc; border-radius: 7px; padding: 0 10px; font-family: 'Inter', sans-serif; font-size: 13px; color: #1a2e22; outline: none; transition: border-color 0.13s, box-shadow 0.13s; }
        .pdv2-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .pdv2-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .pdv2-input:disabled { background: #f0f4ee; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }
        .pdv2-input.has-error { border-color: #e05252; box-shadow: 0 0 0 2px rgba(224,82,82,0.1); }
        .pdv2-input[type="date"] { cursor: pointer; }

        .pdv2-select { width: 100%; height: 36px; background: #f8fbf6; border: 1.5px solid #d4e8cc; border-radius: 7px; padding: 0 28px 0 10px; font-family: 'Inter', sans-serif; font-size: 13px; color: #1a2e22; outline: none; appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; transition: border-color 0.13s; }
        .pdv2-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }

        .pdv2-field-error { font-size: 11px; color: #c84040; margin-top: 2px; display: flex; align-items: center; gap: 4px; }
        .pdv2-field-hint { font-size: 11px; color: #7a9c84; margin-top: 2px; line-height: 1.45; }

        .pdv2-chip-group { display: flex; gap: 6px; flex-wrap: wrap; padding-top: 4px; }
        .pdv2-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 16px; cursor: pointer; border: 1.5px solid #d4e8cc; background: #f8fbf6; color: #4a7060; transition: all 0.13s; font-family: 'Inter', sans-serif; }
        .pdv2-chip:hover { background: #eef5ea; border-color: #b0d4b8; }
        .pdv2-chip.selected { background: #e8f5e0; color: #1e5818; border-color: #3e9654; font-weight: 600; }
        .pdv2-chip-limit { font-size: 11px; color: #96b8a0; align-self: center; }

        .pdv2-check-row { display: flex; align-items: center; gap: 8px; }
        .pdv2-check-row input[type="checkbox"] { width: 15px; height: 15px; accent-color: #3e9654; cursor: pointer; flex-shrink: 0; }
        .pdv2-check-row label { font-size: 13px; color: #3a5a45; cursor: pointer; font-weight: 500; }

        .pdv2-section-sep { height: 1px; background: #edf5e8; margin: 20px 0; }
        .pdv2-section-label { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #a0b8a8; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
        .pdv2-section-label::after { content: ''; flex: 1; height: 1px; background: #e8f0e4; }

        .pdv2-results-wrap { border-top: 1px solid #edf5e8; overflow-x: auto; }
        .pdv2-results-bar { display: flex; align-items: center; justify-content: space-between; padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4; }
        .pdv2-results-bar-left { display: flex; align-items: center; gap: 8px; }
        .pdv2-results-bar-label { font-size: 11px; font-weight: 600; color: #4a7060; text-transform: uppercase; letter-spacing: 0.5px; }
        .pdv2-results-hint { font-size: 11px; color: #96b8a0; }
        .pdv2-results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .pdv2-results-table th { background: #f4f9f2; padding: 8px 12px; text-align: left; font-size: 10.5px; font-weight: 700; color: #5a8068; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1.5px solid #dbe8d5; white-space: nowrap; }
        .pdv2-results-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .pdv2-results-table tbody tr { cursor: pointer; transition: background 0.1s; }
        .pdv2-results-table tbody tr:hover { background: #eef9f0; }
        .pdv2-results-empty { text-align: center; padding: 28px 12px; color: #96b8a0; font-size: 12.5px; }

        .pdv2-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 1000; display: flex; align-items: flex-start; justify-content: center; padding-top: 40px; overflow-y: auto; animation: pdv2FadeIn 0.15s ease; }
        .pdv2-modal { background: #fff; border-radius: 14px; width: 95%; max-width: 900px; max-height: 90vh; overflow-y: auto; border: 1px solid #dbe8d5; box-shadow: 0 20px 50px rgba(0,0,0,0.15); margin-bottom: 40px; }
        .pdv2-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid #edf5e8; background: #fafcf9; position: sticky; top: 0; z-index: 1; }
        .pdv2-modal-title { font-size: 13px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.5px; }
        .pdv2-modal-close { background: transparent; border: none; cursor: pointer; color: #96b8a0; padding: 4px 8px; border-radius: 4px; font-size: 18px; transition: background 0.12s, color 0.12s; }
        .pdv2-modal-close:hover { background: #f0f4ee; color: #5a8068; }
        .pdv2-modal-body { padding: 18px 20px; }
        .pdv2-modal-row { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; align-items: flex-end; }
        .pdv2-modal-row .pdv2-field { flex: 1; min-width: 80px; }

        .pdv2-frete-block { background: #f8fbf6; border: 1px solid #dbe8d5; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; }
        .pdv2-frete-block-title { font-size: 11px; font-weight: 700; color: #4a7060; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }

        .pdv2-feedback { display: flex; align-items: center; gap: 9px; padding: 11px 15px; border-radius: 9px; font-size: 13px; animation: pdv2FadeIn 0.2s ease; margin-bottom: 14px; }
        .pdv2-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .pdv2-feedback.error { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .pdv2-feedback.info { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        .pdv2-footer { background: #fff; border-top: 1px solid #dbe8d5; padding: 8px 20px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .pdv2-footer-left { display: flex; align-items: center; gap: 20px; }
        .pdv2-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .pdv2-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes pdv2Spin { to { transform: rotate(360deg); } }
        .pdv2-spinner { width: 14px; height: 14px; flex-shrink: 0; border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2; border-radius: 50%; animation: pdv2Spin 0.65s linear infinite; }
        .pdv2-spinner-dark { width: 14px; height: 14px; flex-shrink: 0; border: 2px solid #d4e8cc; border-top-color: #3e9654; border-radius: 50%; animation: pdv2Spin 0.65s linear infinite; }
        @keyframes pdv2FadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="pdv2-root">
        <header className="pdv2-topbar">
          <div className="pdv2-topbar-left">
            <div className="pdv2-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="pdv2-app-name">Venture<span className="pdv2-app-sub">ERP &amp; Soluções</span></span>
            <span className="pdv2-screen-title">VPDV0111 — Cadastro de Política Comercial de Fretes</span>
          </div>
        </header>

        <div className="pdv2-actionbar">
          <div className="pdv2-action-group">
            <span className="pdv2-action-label">Cadastro</span>
            <button className="pdv2-btn pdv2-btn-new" onClick={handleNovo} disabled={isSaving}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              Novo
            </button>
          </div>
          <div className="pdv2-action-group">
            <span className="pdv2-action-label">Ações</span>
            <button className="pdv2-btn pdv2-btn-primary" onClick={() => void handleSalvar()} disabled={isSaving}>
              {isSaving
                ? <><div className="pdv2-spinner" />Salvando...</>
                : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Salvar</>
              }
            </button>
            <button className="pdv2-btn pdv2-btn-danger" onClick={handleLimpar} disabled={isSaving}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Limpar
            </button>
          </div>
          <div className="pdv2-action-group">
            <button className="pdv2-btn pdv2-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Ajuda
            </button>
          </div>
          <div className="pdv2-action-group">
            <button className="pdv2-btn pdv2-btn-accent" onClick={() => { setShowPoliticaModal(true); setFeedback(null); }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2h8v8H2z" stroke="currentColor" strokeWidth="1.4" /><path d="M5 5h2M6 4v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
              Política
            </button>
          </div>
        </div>

        <div className="pdv2-body">
          {feedback && (
            <div className={`pdv2-feedback ${feedback.type}`}>
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

          {/* SEÇÃO 1 — PESQUISAR */}
          <div className="pdv2-section-banner">
            <span className="pdv2-section-banner-pill">1 — Pesquisar</span>
            <div className="pdv2-section-banner-line" />
            <span className="pdv2-section-banner-hint">Filtre e clique em um registro para carregar no formulário</span>
          </div>
          <div className="pdv2-card">
            <div className="pdv2-card-header">
              <div className="pdv2-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4" /><path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <span className="pdv2-card-title">Pesquisa de Políticas de Frete</span>
              </div>
            </div>
            <div className="pdv2-card-body" style={{ paddingBottom: 14 }}>
              <div className="pdv2-filter-row">
                <div className="pdv2-field" style={{ flex: "0 0 140px" }}>
                  <label className="pdv2-label">Prioridade</label>
                  <input className="pdv2-input" placeholder="Nº" value={filtroPrioridade} onChange={(e) => setFiltroPrioridade(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void handlePesquisar()} />
                </div>
                <div className="pdv2-field" style={{ flex: "0 0 140px" }}>
                  <label className="pdv2-label">Sequência</label>
                  <input className="pdv2-input" placeholder="Nº" value={filtroSequencia} onChange={(e) => setFiltroSequencia(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void handlePesquisar()} />
                </div>
                <div className="pdv2-field" style={{ flex: "0 0 180px" }}>
                  <label className="pdv2-label">Validade</label>
                  <input type="date" className="pdv2-input" value={filtroValidade} onChange={(e) => setFiltroValidade(e.target.value)} />
                </div>
                <div style={{ alignSelf: "flex-end" }}>
                  <button className="pdv2-btn pdv2-btn-ghost" onClick={() => void handlePesquisar()} disabled={isSearching}>
                    {isSearching
                      ? <><div className="pdv2-spinner-dark" />Buscando...</>
                      : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" /><path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Pesquisar</>
                    }
                  </button>
                </div>
              </div>
            </div>
            {mostrarResultados && (
              <div className="pdv2-results-wrap">
                <div className="pdv2-results-bar">
                  <div className="pdv2-results-bar-left">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" /></svg>
                    <span className="pdv2-results-bar-label">Resultados</span>
                    <span className="pdv2-card-badge">{resultados.length} registro(s)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="pdv2-results-hint">Clique para editar</span>
                    <button className="pdv2-btn pdv2-btn-ghost pdv2-btn-sm" onClick={() => setMostrarResultados(false)}>Fechar</button>
                  </div>
                </div>
                {resultados.length === 0 ? (
                  <div className="pdv2-results-empty">Nenhuma política encontrada.</div>
                ) : (
                  <table className="pdv2-results-table">
                    <thead>
                      <tr>
                        <th style={{ width: 90 }}>Prioridade</th>
                        <th style={{ width: 100 }}>Sequência</th>
                        <th style={{ width: 110 }}>Início</th>
                        <th style={{ width: 110 }}>Fim</th>
                        <th>Tipo de Dado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map((p) => (
                        <tr key={p.sequencia} onClick={() => handleSelectFromList(p)}>
                          <td style={{ fontWeight: 600, color: "#1a4a2a" }}>{p.prioridade}</td>
                          <td style={{ fontWeight: 600 }}>{p.sequencia}</td>
                          <td style={{ fontSize: 12 }}>{formatDateBR(p.validade_inicial)}</td>
                          <td style={{ fontSize: 12, color: p.validade_final ? "#243830" : "#96b8a0" }}>{p.validade_final ? formatDateBR(p.validade_final) : "Em aberto"}</td>
                          <td>{p.tipo_dado.join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* SEÇÃO 2 — CRIAR / EDITAR */}
          <div className="pdv2-section-banner">
            <span className="pdv2-section-banner-pill">2 — Criar / Editar</span>
            <div className="pdv2-section-banner-line" />
            <span className="pdv2-section-banner-hint">
              {modoForm === "novo" ? "Preencha os campos e clique em Salvar" : `Editando Seq. ${codigoEdit ?? "?"}`}
            </span>
          </div>
          <div className="pdv2-card">
            <div className="pdv2-card-header">
              <div className="pdv2-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <span className="pdv2-card-title">Política Comercial de Fretes</span>
              </div>
              {modoForm === "novo"
                ? <span className="pdv2-modo-novo"><span className="pdv2-modo-dot" />Novo Cadastro</span>
                : <span className="pdv2-modo-edicao"><span className="pdv2-modo-dot" />Editando Seq. #{codigoEdit}</span>
              }
            </div>
            <div className="pdv2-card-body">
              <div className="pdv2-section-label">Identificação</div>
              <div className="pdv2-grid">
                <div className="pdv2-field pdv2-col-2">
                  <label className="pdv2-label">Prioridade <span className="pdv2-label-req">*</span></label>
                  <input className={`pdv2-input${errors.prioridade ? " has-error" : ""}`} placeholder="Nº" type="number" value={form.prioridade} onChange={(e) => setField("prioridade", e.target.value)} />
                  {errors.prioridade && <span className="pdv2-field-error"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2" /><path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round" /></svg>{errors.prioridade}</span>}
                </div>
                <div className="pdv2-field pdv2-col-2">
                  <label className="pdv2-label">Sequência <span className="pdv2-label-req">*</span></label>
                  <input className={`pdv2-input${errors.sequencia ? " has-error" : ""}`} placeholder="Nº" type="number" value={form.sequencia} onChange={(e) => setField("sequencia", e.target.value)} />
                  {errors.sequencia && <span className="pdv2-field-error"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2" /><path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round" /></svg>{errors.sequencia}</span>}
                </div>
              </div>

              <div className="pdv2-section-sep" />
              <div className="pdv2-section-label">Validade</div>
              <div className="pdv2-grid">
                <div className="pdv2-field pdv2-col-3">
                  <label className="pdv2-label">Inicial</label>
                  <input type="date" className="pdv2-input" value={form.validade_inicial} onChange={(e) => setField("validade_inicial", e.target.value)} />
                </div>
                <div className="pdv2-field pdv2-col-3">
                  <label className="pdv2-label">Final</label>
                  <input type="date" className="pdv2-input" value={form.validade_final} onChange={(e) => setField("validade_final", e.target.value)} />
                </div>
              </div>

              <div className="pdv2-section-sep" />
              <div className="pdv2-section-label">Tipo de Dado da Política Comercial (máx. {MAX_TIPO_DADO})</div>
              <div className="pdv2-chip-group">
                {TIPO_DADO_OPCOES.map((dado) => (
                  <button
                    key={dado}
                    className={`pdv2-chip${form.tipo_dado.includes(dado) ? " selected" : ""}`}
                    onClick={() => toggleTipoDado(dado)}
                    type="button"
                  >
                    {form.tipo_dado.includes(dado) ? "✓ " : ""}{dado}
                  </button>
                ))}
                <span className="pdv2-chip-limit">{form.tipo_dado.length}/{MAX_TIPO_DADO} selecionados</span>
              </div>

              {/* Linhas Frete Summary */}
              {linhasFrete.length > 0 && (
                <>
                  <div className="pdv2-section-sep" />
                  <div className="pdv2-section-label">Linhas de Frete ({linhasFrete.length})</div>
                  <table className="pdv2-results-table" style={{ marginTop: 4 }}>
                    <thead><tr><th>Linha</th><th>Início</th><th>Fim</th><th>Transportadora</th><th>Vlr Frete</th><th>Exced.</th><th></th></tr></thead>
                    <tbody>
                      {linhasFrete.map((l, i) => (
                        <tr key={i}>
                          <td>{l.linha}</td><td>{l.inicio}</td><td>{l.fim}</td>
                          <td>{l.transportadora || "—"}</td>
                          <td>{l.valor_frete_valor} ({l.valor_frete_tipo})</td>
                          <td>{l.excedente ? "Sim" : "Não"}</td>
                          <td><button className="pdv2-btn pdv2-btn-ghost pdv2-btn-sm" onClick={() => setLinhasFrete((p) => p.filter((_, j) => j !== i))}>Remover</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>

        <footer className="pdv2-footer">
          <div className="pdv2-footer-left">
            <div className="pdv2-footer-stat">Prioridade: <strong>{form.prioridade || "—"}</strong></div>
            <div className="pdv2-footer-stat">Sequência: <strong>{form.sequencia || "—"}</strong></div>
            <div className="pdv2-footer-stat">Tipos: <strong>{form.tipo_dado.length}</strong></div>
          </div>
          <div className="pdv2-footer-stat" style={{ gap: 8 }}>
            {modoForm === "novo"
              ? <span className="pdv2-modo-novo" style={{ fontSize: 11 }}><span className="pdv2-modo-dot" />Novo Cadastro</span>
              : <span className="pdv2-modo-edicao" style={{ fontSize: 11 }}><span className="pdv2-modo-dot" />Editando #{codigoEdit}</span>
            }
            <span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>

        {/* ── MODAL: POLÍTICA FRETE ── */}
        {showPoliticaModal && (
          <div className="pdv2-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPoliticaModal(false); }}>
            <div className="pdv2-modal">
              <div className="pdv2-modal-header">
                <span className="pdv2-modal-title">Linhas da Política de Frete</span>
                <button className="pdv2-modal-close" onClick={() => setShowPoliticaModal(false)}>&times;</button>
              </div>
              <div className="pdv2-modal-body">
                {/* Linha básica */}
                <div className="pdv2-frete-block">
                  <div className="pdv2-frete-block-title">Dados da Linha</div>
                  <div className="pdv2-modal-row">
                    <div className="pdv2-field"><label className="pdv2-label">Linha</label><input type="number" className="pdv2-input" value={linhaForm.linha} onChange={(e) => setLinhaForm((p) => ({ ...p, linha: Number(e.target.value) }))} /></div>
                    <div className="pdv2-field"><label className="pdv2-label">Início</label><input type="number" className="pdv2-input" value={linhaForm.inicio} onChange={(e) => setLinhaForm((p) => ({ ...p, inicio: Number(e.target.value) }))} /></div>
                    <div className="pdv2-field"><label className="pdv2-label">Fim</label><input type="number" className="pdv2-input" value={linhaForm.fim} onChange={(e) => setLinhaForm((p) => ({ ...p, fim: Number(e.target.value) }))} /></div>
                    <div className="pdv2-field" style={{ flex: 2 }}><label className="pdv2-label">Transportadora</label><input className="pdv2-input" value={linhaForm.transportadora} onChange={(e) => setLinhaForm((p) => ({ ...p, transportadora: e.target.value }))} /></div>
                  </div>
                </div>

                {/* Seguro */}
                <div className="pdv2-frete-block">
                  <div className="pdv2-frete-block-title">Seguro</div>
                  <div className="pdv2-modal-row">
                    <div className="pdv2-field"><label className="pdv2-label">Valor</label><input type="number" step="0.01" className="pdv2-input" value={linhaForm.seguro_valor} onChange={(e) => setLinhaForm((p) => ({ ...p, seguro_valor: Number(e.target.value) }))} /></div>
                    <div className="pdv2-field"><label className="pdv2-label">Tipo</label><select className="pdv2-select" value={linhaForm.seguro_tipo} onChange={(e) => setLinhaForm((p) => ({ ...p, seguro_tipo: e.target.value as any }))}>{TIPO_APLICACAO_OPTS.map((t) => <option key={t}>{t}</option>)}</select></div>
                    <div className="pdv2-field"><label className="pdv2-label">Aplicação</label><select className="pdv2-select" value={linhaForm.seguro_aplicacao} onChange={(e) => setLinhaForm((p) => ({ ...p, seguro_aplicacao: e.target.value as any }))}>{APLICACAO_OPTS.map((t) => <option key={t}>{t}</option>)}</select></div>
                  </div>
                </div>

                {/* Pedágio */}
                <div className="pdv2-frete-block">
                  <div className="pdv2-frete-block-title">Pedágio</div>
                  <div className="pdv2-modal-row">
                    <div className="pdv2-field"><label className="pdv2-label">Valor</label><input type="number" step="0.01" className="pdv2-input" value={linhaForm.pedagio_valor} onChange={(e) => setLinhaForm((p) => ({ ...p, pedagio_valor: Number(e.target.value) }))} /></div>
                    <div className="pdv2-field"><label className="pdv2-label">Tipo</label><select className="pdv2-select" value={linhaForm.pedagio_tipo} onChange={(e) => setLinhaForm((p) => ({ ...p, pedagio_tipo: e.target.value as any }))}>{TIPO_APLICACAO_OPTS.map((t) => <option key={t}>{t}</option>)}</select></div>
                    <div className="pdv2-field"><label className="pdv2-label">Aplicação</label><select className="pdv2-select" value={linhaForm.pedagio_aplicacao} onChange={(e) => setLinhaForm((p) => ({ ...p, pedagio_aplicacao: e.target.value as any }))}>{APLICACAO_OPTS.map((t) => <option key={t}>{t}</option>)}</select></div>
                  </div>
                </div>

                {/* Valor Excedente */}
                <div className="pdv2-frete-block">
                  <div className="pdv2-frete-block-title">Valor Excedente</div>
                  <div className="pdv2-modal-row">
                    <div className="pdv2-field"><label className="pdv2-label">Valor</label><input type="number" step="0.01" className="pdv2-input" value={linhaForm.valor_excedente_valor} onChange={(e) => setLinhaForm((p) => ({ ...p, valor_excedente_valor: Number(e.target.value) }))} /></div>
                    <div className="pdv2-field"><label className="pdv2-label">Tipo</label><select className="pdv2-select" value={linhaForm.valor_excedente_tipo} onChange={(e) => setLinhaForm((p) => ({ ...p, valor_excedente_tipo: e.target.value as any }))}>{TIPO_APLICACAO_OPTS.map((t) => <option key={t}>{t}</option>)}</select></div>
                    <div className="pdv2-field"><label className="pdv2-label">Aplicação</label><select className="pdv2-select" value={linhaForm.valor_excedente_aplicacao} onChange={(e) => setLinhaForm((p) => ({ ...p, valor_excedente_aplicacao: e.target.value as any }))}>{APLICACAO_OPTS.map((t) => <option key={t}>{t}</option>)}</select></div>
                  </div>
                </div>

                {/* Peso Excedente */}
                <div className="pdv2-frete-block">
                  <div className="pdv2-frete-block-title">Peso Excedente</div>
                  <div className="pdv2-modal-row">
                    <div className="pdv2-field"><label className="pdv2-label">Valor</label><input type="number" step="0.01" className="pdv2-input" value={linhaForm.peso_excedente_valor} onChange={(e) => setLinhaForm((p) => ({ ...p, peso_excedente_valor: Number(e.target.value) }))} /></div>
                    <div className="pdv2-field"><label className="pdv2-label">Tipo</label><select className="pdv2-select" value={linhaForm.peso_excedente_tipo} onChange={(e) => setLinhaForm((p) => ({ ...p, peso_excedente_tipo: e.target.value as any }))}>{TIPO_APLICACAO_OPTS.map((t) => <option key={t}>{t}</option>)}</select></div>
                    <div className="pdv2-field"><label className="pdv2-label">Aplicação</label><select className="pdv2-select" value={linhaForm.peso_excedente_aplicacao} onChange={(e) => setLinhaForm((p) => ({ ...p, peso_excedente_aplicacao: e.target.value as any }))}>{APLICACAO_OPTS.map((t) => <option key={t}>{t}</option>)}</select></div>
                  </div>
                </div>

                {/* Valor até / Peso até */}
                <div className="pdv2-frete-block">
                  <div className="pdv2-frete-block-title">Limites</div>
                  <div className="pdv2-modal-row">
                    <div className="pdv2-field"><label className="pdv2-label">Valor Até</label><input type="number" step="0.01" className="pdv2-input" value={linhaForm.valor_ate} onChange={(e) => setLinhaForm((p) => ({ ...p, valor_ate: Number(e.target.value) }))} /></div>
                    <div className="pdv2-field"><label className="pdv2-label">Pesos Até</label><input type="number" step="0.01" className="pdv2-input" value={linhaForm.peso_ate} onChange={(e) => setLinhaForm((p) => ({ ...p, peso_ate: Number(e.target.value) }))} /></div>
                  </div>
                </div>

                {/* Valor Frete */}
                <div className="pdv2-frete-block">
                  <div className="pdv2-frete-block-title">Valor Frete</div>
                  <div className="pdv2-modal-row">
                    <div className="pdv2-field"><label className="pdv2-label">Valor</label><input type="number" step="0.01" className="pdv2-input" value={linhaForm.valor_frete_valor} onChange={(e) => setLinhaForm((p) => ({ ...p, valor_frete_valor: Number(e.target.value) }))} /></div>
                    <div className="pdv2-field"><label className="pdv2-label">Tipo</label><select className="pdv2-select" value={linhaForm.valor_frete_tipo} onChange={(e) => setLinhaForm((p) => ({ ...p, valor_frete_tipo: e.target.value as any }))}>{TIPO_APLICACAO_OPTS.map((t) => <option key={t}>{t}</option>)}</select></div>
                    <div className="pdv2-field"><label className="pdv2-label">Aplicação</label><select className="pdv2-select" value={linhaForm.valor_frete_aplicacao} onChange={(e) => setLinhaForm((p) => ({ ...p, valor_frete_aplicacao: e.target.value as any }))}>{APLICACAO_OPTS.map((t) => <option key={t}>{t}</option>)}</select></div>
                  </div>
                </div>

                {/* Excedente / Valor Base / Peso Base */}
                <div className="pdv2-frete-block">
                  <div className="pdv2-frete-block-title">Excedente</div>
                  <div className="pdv2-modal-row">
                    <div className="pdv2-field" style={{ flex: "0 0 auto" }}>
                      <div className="pdv2-check-row" style={{ paddingTop: 20 }}>
                        <input type="checkbox" id="pdv2-exc-cb" checked={linhaForm.excedente} onChange={(e) => setLinhaForm((p) => ({ ...p, excedente: e.target.checked }))} />
                        <label htmlFor="pdv2-exc-cb">Excedente</label>
                      </div>
                    </div>
                    <div className="pdv2-field"><label className="pdv2-label">Valor Base</label><input type="number" step="0.01" className="pdv2-input" value={linhaForm.valor_base} onChange={(e) => setLinhaForm((p) => ({ ...p, valor_base: Number(e.target.value) }))} /></div>
                    <div className="pdv2-field"><label className="pdv2-label">Peso Base</label><input type="number" step="0.01" className="pdv2-input" value={linhaForm.peso_base} onChange={(e) => setLinhaForm((p) => ({ ...p, peso_base: Number(e.target.value) }))} /></div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="pdv2-btn pdv2-btn-primary" onClick={addLinha}>Adicionar Linha</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

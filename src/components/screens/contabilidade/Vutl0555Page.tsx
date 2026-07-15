import { useState, useCallback, useEffect } from "react";
import {
  type CidadeDTO,
  type CidadeResponse,
  type TipoCidade,
  listCidades,
  createCidade,
  updateCidade,
  deleteCidade,
  getCidade,
} from "@/services/cidadeUfService";
import { humanizeApiError } from "@/services/apiError";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface FormCidade {
  codigo: string;
  cidade: string;
  ddd: string;
  tipo: TipoCidade;
  zf: boolean;
  gmb: string;
  ibge: string;
  cod_tom: string;
}

const FORM_INICIAL: FormCidade = {
  codigo: "", cidade: "", ddd: "", tipo: "Interior", zf: false,
  gmb: "", ibge: "", cod_tom: "",
};

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

// ─── Component ────────────────────────────────────────────────────────────────

export function Vutl0555Page(): JSX.Element {
  const [form, setForm] = useState<FormCidade>(FORM_INICIAL);
  const [editMode, setEditMode] = useState(false);
  const [list, setList] = useState<CidadeResponse[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Search filters
  const [filtroUf, setFiltroUf] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroCodigo, setFiltroCodigo] = useState("");
  const [mostrarResultados, setMostrarResultados] = useState(false);

  // DIME Modal
  const [showDime, setShowDime] = useState(false);
  const [dimeCidade, setDimeCidade] = useState("");
  const [dimeCodMun, setDimeCodMun] = useState("");

  useEffect(() => {
    if (!loaded) {
      (async () => {
        try {
          const data = await listCidades();
          setList(data);
        } catch (error) {
          setList([]);
          setFeedback({ type: "error", message: humanizeApiError(error, "Não foi possível carregar as cidades.") });
        }
        setLoaded(true);
      })();
    }
  }, [loaded]);

  const setField = useCallback(
    <K extends keyof FormCidade>(key: K, value: FormCidade[K]) => {
      setForm((p) => ({ ...p, [key]: value }));
      setFeedback(null);
    },
    [],
  );

  function handleNovo() {
    setForm(FORM_INICIAL);
    setEditMode(false);
    setFeedback(null);
    setMostrarResultados(false);
  }

  function handleLimpar() {
    handleNovo();
  }

  function handleEdit(cidade: CidadeResponse) {
    setForm({
      codigo: cidade.codigo,
      cidade: cidade.cidade,
      ddd: cidade.ddd,
      tipo: cidade.tipo as TipoCidade,
      zf: cidade.zf,
      gmb: cidade.gmb,
      ibge: cidade.ibge,
      cod_tom: cidade.cod_tom,
    });
    setEditMode(true);
    setFeedback(null);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  async function handleDelete(codigo: string) {
    setIsLoading(true);
    setFeedback(null);
    try {
      await deleteCidade(codigo);
      setList((p) => p.filter((c) => c.codigo !== codigo));
      setFeedback({ type: "success", message: `Cidade ${codigo} excluída.` });
    } catch (error) {
      setFeedback({ type: "error", message: humanizeApiError(error, `Não foi possível excluir a cidade ${codigo}.`) });
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePesquisar() {
    setIsSearching(true);
    try {
      let results = list;
      if (filtroUf) results = results.filter((c) => c.codigo.startsWith(filtroUf.toUpperCase()));
      if (filtroCidade) results = results.filter((c) => c.cidade.toLowerCase().includes(filtroCidade.toLowerCase()));
      if (filtroCodigo) results = results.filter((c) => c.codigo === filtroCodigo);
      setList(results);
      setMostrarResultados(true);
      if (results.length === 0) setFeedback({ type: "info", message: "Nenhuma cidade encontrada para os filtros informados." });
    } finally {
      setIsSearching(false);
    }
  }

  function handleSelectFromList(cidade: CidadeResponse) {
    handleEdit(cidade);
  }

  async function handleLoadByCode() {
    if (!form.codigo.trim()) return;
    setIsLoading(true);
    setFeedback(null);
    try {
      const c = await getCidade(form.codigo.trim());
      if (c) {
        handleEdit(c);
        setFeedback({ type: "info", message: `Cidade ${c.codigo} — ${c.cidade} carregada.` });
      } else setFeedback({ type: "info", message: `Cidade ${form.codigo} não encontrada.` });
    } catch (error) {
      setFeedback({ type: "error", message: humanizeApiError(error, "Erro ao consultar cidade.") });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSalvar() {
    if (!form.codigo.trim() || !form.cidade.trim()) {
      setFeedback({ type: "error", message: "Código e Cidade são obrigatórios." });
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    const dto: CidadeDTO = {
      codigo: form.codigo.trim(),
      cidade: form.cidade.trim(),
      ddd: form.ddd.trim(),
      tipo: form.tipo,
      zf: form.zf,
      gmb: form.gmb.trim(),
      ibge: form.ibge.trim(),
      cod_tom: form.cod_tom.trim(),
    };
    try {
      if (editMode) {
        await updateCidade(dto.codigo, dto);
        setList((p) => p.map((c) => (c.codigo === dto.codigo ? { ...dto } : c)));
        setFeedback({ type: "success", message: `Cidade ${dto.codigo} — ${dto.cidade} atualizada.` });
      } else {
        await createCidade(dto);
        setList((p) => [...p, { ...dto }]);
        setFeedback({ type: "success", message: `Cidade ${dto.codigo} — ${dto.cidade} cadastrada.` });
        setEditMode(true);
      }
    } catch (error) {
      setFeedback({ type: "error", message: humanizeApiError(error, `Não foi possível ${editMode ? "atualizar" : "cadastrar"} a cidade.`) });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .utl-root {
          min-height: 100vh; background: #dfe4e0;
          font-family: 'Inter', sans-serif; color: #1c2b22;
          display: flex; flex-direction: column;
        }

        .utl-topbar {
          height: 52px; background: #16281d;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .utl-topbar-left { display: flex; align-items: center; gap: 10px; }
        .utl-logo {
          width: 28px; height: 28px; background: #2f7d47;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .utl-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .utl-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #54655a; }
        .utl-screen-title {
          font-size: 12.5px; font-weight: 500; color: #3f8a58;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        /* ── ACTION BAR ── */
        .utl-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .utl-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .utl-action-group:last-child { border-right: none; }
        .utl-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #94a49a; margin-right: 4px; white-space: nowrap;
        }
        .utl-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .utl-btn-primary { background: #16281d; color: #dff0e2; border-color: #16281d; }
        .utl-btn-primary:hover:not(:disabled) { background: #1e3728; }
        .utl-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .utl-btn-ghost { background: transparent; color: #46574c; border-color: #d4e8d0; }
        .utl-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #a9b6ac; color: #1c2b22; }
        .utl-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .utl-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .utl-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .utl-btn-sm { height: 28px; padding: 0 9px; font-size: 12px; }
        .utl-btn-new {
          background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600;
        }
        .utl-btn-new:hover:not(:disabled) { background: #dff5e4; border-color: #88c898; }
        .utl-btn-dime {
          background: #e8f0fc; color: #276a3c; border-color: #a8c0e8; font-weight: 600;
        }
        .utl-btn-dime:hover:not(:disabled) { background: #dce8f8; border-color: #88a8d8; }

        /* ── BODY ── */
        .utl-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .utl-body::-webkit-scrollbar { width: 5px; }
        .utl-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        /* ── SECTION BANNER ── */
        .utl-section-banner {
          display: flex; align-items: center; gap: 10px; padding: 14px 0 8px;
        }
        .utl-section-banner:first-child { padding-top: 0; }
        .utl-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #6b7d71;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .utl-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .utl-section-banner-hint { font-size: 11px; color: #94a49a; white-space: nowrap; }

        /* ── CARD ── */
        .utl-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .utl-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .utl-card-header-left { display: flex; align-items: center; gap: 8px; }
        .utl-card-title { font-size: 12px; font-weight: 600; color: #253a2d; text-transform: uppercase; letter-spacing: 0.6px; }
        .utl-card-badge {
          font-size: 10.5px; font-weight: 500; color: #2f7d47;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .utl-card-body { padding: 18px 18px; }

        /* ── FILTER ROW ── */
        .utl-filter-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }

        /* ── GRID ── */
        .utl-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .utl-col-2  { grid-column: span 2; }
        .utl-col-3  { grid-column: span 3; }
        .utl-col-4  { grid-column: span 4; }
        .utl-col-5  { grid-column: span 5; }
        .utl-col-6  { grid-column: span 6; }
        .utl-col-12 { grid-column: span 12; }

        /* ── FIELDS ── */
        .utl-field { display: flex; flex-direction: column; gap: 5px; }
        .utl-label {
          font-size: 10.5px; font-weight: 600; color: #6b7d71;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .utl-label-req { color: #c84040; font-size: 12px; line-height: 1; }
        .utl-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1c2b22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .utl-input:focus { border-color: #2f7d47; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .utl-input::placeholder { color: #a9b6ac; font-size: 12px; }
        .utl-input:disabled { background: #dfe4e0; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }

        .utl-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1c2b22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .utl-select:focus { border-color: #2f7d47; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }

        .utl-input-wrap { position: relative; display: flex; }
        .utl-input-btn {
          height: 36px; padding: 0 10px; flex-shrink: 0;
          background: #edf5ea; border: 1.5px solid #d4e8cc; border-left: none;
          border-radius: 0 7px 7px 0; display: flex; align-items: center;
          justify-content: center; gap: 5px;
          cursor: pointer; color: #3a6048;
          font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 500;
          transition: background 0.12s; white-space: nowrap;
        }
        .utl-input-btn:hover { background: #ddf0e0; }
        .utl-input-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .utl-toggle-row { display: flex; align-items: center; gap: 10px; padding-top: 4px; }
        .utl-toggle { position: relative; width: 38px; height: 20px; flex-shrink: 0; cursor: pointer; }
        .utl-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .utl-toggle-track { position: absolute; inset: 0; background: #d4e0d0; border-radius: 20px; transition: background 0.2s; }
        .utl-toggle input:checked ~ .utl-toggle-track { background: #2f7d47; }
        .utl-toggle-thumb {
          position: absolute; top: 3px; left: 3px; width: 14px; height: 14px;
          background: #fff; border-radius: 50%; transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .utl-toggle input:checked ~ .utl-toggle-thumb { transform: translateX(18px); }
        .utl-toggle-label { font-size: 13px; color: #46574c; font-weight: 500; }

        .utl-field-hint  { font-size: 11px; color: #7a9c84; margin-top: 2px; line-height: 1.45; }

        /* ── RESULTS ── */
        .utl-results-wrap { border-top: 1px solid #edf5e8; overflow-x: auto; }
        .utl-results-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4;
        }
        .utl-results-bar-left { display: flex; align-items: center; gap: 8px; }
        .utl-results-bar-label { font-size: 11px; font-weight: 600; color: #46574c; text-transform: uppercase; letter-spacing: 0.5px; }
        .utl-results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .utl-results-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #6b7d71;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .utl-results-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #233029; vertical-align: middle; }
        .utl-results-table tbody tr { cursor: pointer; transition: background 0.1s; }
        .utl-results-table tbody tr:hover { background: #eef9f0; }
        .utl-results-empty { text-align: center; padding: 28px 12px; color: #94a49a; font-size: 12.5px; }

        .utl-action-btn {
          background: transparent; border: none; cursor: pointer; font-size: 12px;
          padding: 3px 8px; border-radius: 5px; font-family: 'Inter', sans-serif;
          transition: background 0.12s, color 0.12s; margin: 0 2px;
        }
        .utl-edit-btn { color: #4a7a9a; }
        .utl-edit-btn:hover { background: #e8f4fc; color: #2f7d47; }
        .utl-delete-btn { color: #c89090; }
        .utl-delete-btn:hover { background: #fdecea; color: #b94040; }

        /* ── FEEDBACK ── */
        .utl-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: utlFadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .utl-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .utl-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .utl-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        /* ── MODAL ── */
        .utl-modal-overlay {
          position: fixed; inset: 0; background: rgba(22,46,32,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; animation: utlFadeIn 0.15s ease;
        }
        .utl-modal {
          background: #fff; border-radius: 12px; width: 480px; max-width: 95vw;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18); overflow: hidden;
        }
        .utl-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .utl-modal-title { font-size: 13px; font-weight: 600; color: #1c2b22; }
        .utl-modal-close {
          background: transparent; border: none; cursor: pointer; color: #94a49a;
          font-size: 18px; line-height: 1; padding: 2px 6px; border-radius: 4px;
        }
        .utl-modal-close:hover { background: #dfe4e0; color: #46574c; }
        .utl-modal-body { padding: 20px; }
        .utl-modal-footer {
          display: flex; align-items: center; justify-content: flex-end; gap: 8px;
          padding: 14px 20px; border-top: 1px solid #edf5e8; background: #fafcf9;
        }

        /* ── FOOTER ── */
        .utl-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .utl-footer-left { display: flex; align-items: center; gap: 20px; }
        .utl-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6b7d71; }
        .utl-footer-stat strong { color: #1c2b22; font-weight: 600; }

        @keyframes utlSpin { to { transform: rotate(360deg); } }
        .utl-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: utlSpin 0.65s linear infinite;
        }
        .utl-spinner-dark {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid #d4e8cc; border-top-color: #2f7d47;
          border-radius: 50%; animation: utlSpin 0.65s linear infinite;
        }
        @keyframes utlFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="utl-root">
        {/* ── TOPBAR ── */}
        <header className="utl-topbar">
          <div className="utl-topbar-left">
            <div className="utl-logo">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="utl-app-name">
              Venture<span className="utl-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="utl-screen-title">VUTL0555 — Cadastro de UFs e Cidades</span>
          </div>
        </header>

        {/* ── ACTION BAR ── */}
        <div className="utl-actionbar">
          <div className="utl-action-group">
            <span className="utl-action-label">Cadastro</span>
            <button className="utl-btn utl-btn-new" onClick={handleNovo} disabled={isSaving || isLoading}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Novo
            </button>
          </div>
          <div className="utl-action-group">
            <span className="utl-action-label">Ações</span>
            <button className="utl-btn utl-btn-primary" onClick={() => void handleSalvar()} disabled={isSaving}>
              {isSaving
                ? <><div className="utl-spinner" />Salvando...</>
                : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>Salvar</>
              }
            </button>
            <button className="utl-btn utl-btn-danger" onClick={handleLimpar} disabled={isSaving || isLoading}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Limpar
            </button>
          </div>
          <div className="utl-action-group">
            <button className="utl-btn utl-btn-dime" onClick={() => setShowDime(true)}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.4" />
                <path d="M5 7h6M5 9h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              DIME
            </button>
            <button className="utl-btn utl-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Ajuda
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="utl-body">
          {feedback && (
            <div className={`utl-feedback ${feedback.type}`}>
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

          {/* ═══════════════════ SEÇÃO 1 — PESQUISAR ═══════════════════ */}
          <div className="utl-section-banner">
            <span className="utl-section-banner-pill">1 — Pesquisar</span>
            <div className="utl-section-banner-line" />
            <span className="utl-section-banner-hint">Filtre por UF, Cidade ou Código</span>
          </div>

          <div className="utl-card">
            <div className="utl-card-header">
              <div className="utl-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="#2f7d47" strokeWidth="1.4" />
                  <path d="M10 10l3.5 3.5" stroke="#2f7d47" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="utl-card-title">Pesquisa de Cidades</span>
              </div>
            </div>
            <div className="utl-card-body" style={{ paddingBottom: 14 }}>
              <div className="utl-filter-row">
                <div className="utl-field" style={{ flex: "0 0 120px" }}>
                  <label className="utl-label">UF</label>
                  <select className="utl-select" value={filtroUf} onChange={(e) => setFiltroUf(e.target.value)}>
                    <option value="">Todas</option>
                    {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
                <div className="utl-field" style={{ flex: "0 0 220px" }}>
                  <label className="utl-label">Cidade</label>
                  <input
                    className="utl-input"
                    placeholder="Nome da cidade"
                    value={filtroCidade}
                    onChange={(e) => setFiltroCidade(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void handlePesquisar()}
                  />
                </div>
                <div className="utl-field" style={{ flex: "0 0 120px" }}>
                  <label className="utl-label">Código</label>
                  <input
                    className="utl-input"
                    placeholder="Ex: 001"
                    value={filtroCodigo}
                    onChange={(e) => setFiltroCodigo(e.target.value)}
                  />
                </div>
                <div style={{ alignSelf: "flex-end" }}>
                  <button className="utl-btn utl-btn-ghost" onClick={() => void handlePesquisar()} disabled={isSearching}>
                    {isSearching
                      ? <><div className="utl-spinner-dark" />Buscando...</>
                      : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                          <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                          <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>Pesquisar</>
                    }
                  </button>
                </div>
              </div>
            </div>

            {/* Results */}
            {mostrarResultados && (
              <div className="utl-results-wrap">
                <div className="utl-results-bar">
                  <div className="utl-results-bar-left">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4h12M2 8h12M2 12h8" stroke="#6b7d71" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span className="utl-results-bar-label">Resultados</span>
                    <span className="utl-card-badge">{list.length} registro(s)</span>
                  </div>
                  <button className="utl-btn utl-btn-ghost utl-btn-sm" onClick={() => setMostrarResultados(false)}>Fechar</button>
                </div>
                {list.length === 0 ? (
                  <div className="utl-results-empty">Nenhuma cidade encontrada.</div>
                ) : (
                  <table className="utl-results-table">
                    <thead>
                      <tr>
                        <th style={{ width: 80 }}>Código</th>
                        <th>Cidade</th>
                        <th style={{ width: 70 }}>DDD</th>
                        <th style={{ width: 100 }}>Tipo</th>
                        <th style={{ width: 50 }}>ZF</th>
                        <th style={{ width: 80 }}>GMB</th>
                        <th style={{ width: 100 }}>IBGE</th>
                        <th style={{ width: 100 }}>Cód. TOM</th>
                        <th style={{ width: 140 }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((c) => (
                        <tr key={c.codigo} onClick={() => handleSelectFromList(c)}>
                          <td style={{ fontWeight: 600, color: "#1a4a2a" }}>{c.codigo}</td>
                          <td>{c.cidade}</td>
                          <td>{c.ddd}</td>
                          <td>
                            <span style={{
                              display:"inline-block",fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:12,
                              background: c.tipo === "Capital" ? "#e8f0fc" : "#e8f5e0",
                              color: c.tipo === "Capital" ? "#1a4080" : "#2a6018",
                              border: `1px solid ${c.tipo === "Capital" ? "#a8c0e8" : "#b4d898"}`,
                            }}>{c.tipo}</span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {c.zf
                              ? <span style={{ color: "#2a8040", fontWeight: 600, fontSize: 12 }}>Sim</span>
                              : <span style={{ color: "#94a49a", fontSize: 12 }}>Não</span>
                            }
                          </td>
                          <td>{c.gmb}</td>
                          <td style={{ fontSize: 12 }}>{c.ibge}</td>
                          <td style={{ fontSize: 12 }}>{c.cod_tom}</td>
                          <td>
                            <button className="utl-action-btn utl-edit-btn" onClick={(e) => { e.stopPropagation(); handleEdit(c); }}>Editar</button>
                            <button className="utl-action-btn utl-delete-btn" onClick={(e) => { e.stopPropagation(); void handleDelete(c.codigo); }}>Excluir</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* ═══════════════════ SEÇÃO 2 — CRIAR / EDITAR ═══════════════════ */}
          <div className="utl-section-banner">
            <span className="utl-section-banner-pill">2 — Criar / Editar</span>
            <div className="utl-section-banner-line" />
            <span className="utl-section-banner-hint">
              {editMode ? `Editando cidade ${form.codigo} — ${form.cidade}` : "Preencha os campos para cadastrar uma nova cidade"}
            </span>
          </div>

          <div className="utl-card">
            <div className="utl-card-header">
              <div className="utl-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#2f7d47" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M5 2v4h6V2M5 9h6" stroke="#2f7d47" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="utl-card-title">Cidade</span>
              </div>
              <span className="utl-card-badge">{editMode ? `Editando: ${form.codigo}` : "Novo"}</span>
            </div>
            <div className="utl-card-body">
              <div className="utl-grid">
                <div className="utl-field utl-col-2">
                  <label className="utl-label">Código <span className="utl-label-req">*</span></label>
                  <div className="utl-input-wrap">
                    <input
                      className="utl-input"
                      style={{ borderRadius: "7px 0 0 7px" }}
                      placeholder="Ex: 001"
                      value={form.codigo}
                      onChange={(e) => setField("codigo", e.target.value)}
                      disabled={editMode}
                      onKeyDown={(e) => e.key === "Enter" && void handleLoadByCode()}
                    />
                    <button className="utl-input-btn" title="Carregar por código" type="button" disabled={isLoading} onClick={() => void handleLoadByCode()}>
                      {isLoading
                        ? <div className="utl-spinner-dark" style={{ width: 12, height: 12 }} />
                        : <><svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                            <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          </svg>Carregar</>
                      }
                    </button>
                  </div>
                  <span className="utl-field-hint">Enter ou "Carregar" para buscar código existente.</span>
                </div>
                <div className="utl-field utl-col-5">
                  <label className="utl-label">Cidade <span className="utl-label-req">*</span></label>
                  <input className="utl-input" placeholder="Ex: São Paulo" value={form.cidade} onChange={(e) => setField("cidade", e.target.value)} />
                </div>
                <div className="utl-field utl-col-2">
                  <label className="utl-label">DDD</label>
                  <input className="utl-input" placeholder="Ex: 11" value={form.ddd} onChange={(e) => setField("ddd", e.target.value)} />
                </div>
                <div className="utl-field utl-col-3">
                  <label className="utl-label">Tipo</label>
                  <select className="utl-select" value={form.tipo} onChange={(e) => setField("tipo", e.target.value as TipoCidade)}>
                    <option value="Capital">Capital</option>
                    <option value="Interior">Interior</option>
                  </select>
                </div>
              </div>
              <div className="utl-grid" style={{ marginTop: 16 }}>
                <div className="utl-field utl-col-2">
                  <label className="utl-label">ZF</label>
                  <div className="utl-toggle-row">
                    <label className="utl-toggle">
                      <input type="checkbox" checked={form.zf} onChange={(e) => setField("zf", e.target.checked)} />
                      <div className="utl-toggle-track" />
                      <div className="utl-toggle-thumb" />
                    </label>
                    <span className="utl-toggle-label">{form.zf ? "Sim" : "Não"}</span>
                  </div>
                  <span className="utl-field-hint">Zona Franca</span>
                </div>
                <div className="utl-field utl-col-2">
                  <label className="utl-label">GMB</label>
                  <input className="utl-input" placeholder="Ex: 001" value={form.gmb} onChange={(e) => setField("gmb", e.target.value)} />
                </div>
                <div className="utl-field utl-col-2">
                  <label className="utl-label">IBGE</label>
                  <input className="utl-input" placeholder="Ex: 3550308" value={form.ibge} onChange={(e) => setField("ibge", e.target.value)} />
                </div>
                <div className="utl-field utl-col-2">
                  <label className="utl-label">Cód. TOM</label>
                  <input className="utl-input" placeholder="Ex: 001" value={form.cod_tom} onChange={(e) => setField("cod_tom", e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="utl-footer">
          <div className="utl-footer-left">
            <div className="utl-footer-stat">Cidade: <strong>{form.codigo || "—"}</strong></div>
            <div className="utl-footer-stat">Tipo: <strong>{form.tipo}</strong></div>
            <div className="utl-footer-stat">ZF: <strong>{form.zf ? "Sim" : "Não"}</strong></div>
          </div>
          <div className="utl-footer-stat" style={{ gap: 8 }}>
            <span style={{ color: "#a9b6ac", fontSize: 11 }}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>

        {/* ═══════════════════ DIME MODAL ═══════════════════ */}
        {showDime && (
          <div className="utl-modal-overlay" onClick={() => setShowDime(false)}>
            <div className="utl-modal" onClick={(e) => e.stopPropagation()}>
              <div className="utl-modal-header">
                <span className="utl-modal-title">DIME — Declaração de Importação</span>
                <button className="utl-modal-close" onClick={() => setShowDime(false)}>×</button>
              </div>
              <div className="utl-modal-body">
                <div className="utl-grid">
                  <div className="utl-field utl-col-6">
                    <label className="utl-label">Cidade</label>
                    <input className="utl-input" placeholder="Cidade" value={dimeCidade} onChange={(e) => setDimeCidade(e.target.value)} />
                  </div>
                  <div className="utl-field utl-col-6">
                    <label className="utl-label">Cód. Mun. SC</label>
                    <input className="utl-input" placeholder="Cód. Mun. SC" value={dimeCodMun} onChange={(e) => setDimeCodMun(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="utl-modal-footer">
                <button className="utl-btn utl-btn-ghost" onClick={() => setShowDime(false)}>Cancelar</button>
                <button className="utl-btn utl-btn-primary" onClick={() => { setFeedback({ type: "success", message: "Dados DIME aplicados." }); setShowDime(false); }}>Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

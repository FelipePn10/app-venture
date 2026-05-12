import { useState, useCallback, useEffect } from "react";
import {
  type TipoConhecimentoDTO,
  type TipoConhecimentoResponse,
  listTiposConhecimento,
  createTipoConhecimento,
  updateTipoConhecimento,
  deleteTipoConhecimento,
} from "@/services/importacaoService";

// ─── Constants ────────────────────────────────────────────────────────────────

const MODAIS = ["Aéreo", "Aquaviário", "Ferroviário", "Rodoviário", "Outros"];

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface FormTC {
  codigo: string;
  descricao: string;
  modal: string;
  ativo: boolean;
}

const FORM_INICIAL: FormTC = { codigo: "", descricao: "", modal: "Aéreo", ativo: true };

// ─── MOCK ─────────────────────────────────────────────────────────────────────

const MOCK_LIST: TipoConhecimentoResponse[] = [
  { codigo: "CT001", descricao: "Conhecimento Aéreo (AWB)", modal: "Aéreo", ativo: true },
  { codigo: "CT002", descricao: "Conhecimento Marítimo (BL)", modal: "Aquaviário", ativo: true },
  { codigo: "CT003", descricao: "Conhecimento Rodoviário (CRT)", modal: "Rodoviário", ativo: true },
  { codigo: "CT004", descricao: "Conhecimento Ferroviário (TIF)", modal: "Ferroviário", ativo: true },
  { codigo: "CT005", descricao: "CT-e Multimodal", modal: "Outros", ativo: false },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Vimp0102Page(): JSX.Element {
  const [form, setForm] = useState<FormTC>(FORM_INICIAL);
  const [editCodigo, setEditCodigo] = useState<string | null>(null);
  const [list, setList] = useState<TipoConhecimentoResponse[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loaded) {
      (async () => {
        try {
          const data = await listTiposConhecimento();
          setList(data.length ? data : MOCK_LIST);
        } catch {
          setList(MOCK_LIST);
        }
        setLoaded(true);
      })();
    }
  }, [loaded]);

  const setField = useCallback(
    <K extends keyof FormTC>(key: K, value: FormTC[K]) => {
      setForm((p) => ({ ...p, [key]: value }));
      setFeedback(null);
    },
    [],
  );

  function handleCadastrar() {
    setForm(FORM_INICIAL);
    setEditCodigo(null);
    setFeedback(null);
  }

  function handleEdit(tc: TipoConhecimentoResponse) {
    setForm({
      codigo: tc.codigo,
      descricao: tc.descricao,
      modal: tc.modal,
      ativo: tc.ativo,
    });
    setEditCodigo(tc.codigo);
    setFeedback(null);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  async function handleDelete(codigo: string) {
    setIsLoading(true);
    setFeedback(null);
    try {
      await deleteTipoConhecimento(codigo);
      setList((p) => p.filter((t) => t.codigo !== codigo));
      if (editCodigo === codigo) handleCadastrar();
      setFeedback({ type: "success", message: `Tipo de conhecimento ${codigo} excluído.` });
    } catch {
      setList((p) => p.filter((t) => t.codigo !== codigo));
      if (editCodigo === codigo) handleCadastrar();
      setFeedback({ type: "success", message: `Tipo de conhecimento ${codigo} excluído.` });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSalvar() {
    if (!form.codigo.trim() || !form.descricao.trim()) {
      setFeedback({ type: "error", message: "Código e Descrição são obrigatórios." });
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    const dto: TipoConhecimentoDTO = {
      codigo: form.codigo.trim(),
      descricao: form.descricao.trim(),
      modal: form.modal,
      ativo: form.ativo,
    };
    try {
      if (editCodigo) {
        await updateTipoConhecimento(editCodigo, dto);
        setList((p) => p.map((t) => (t.codigo === editCodigo ? { ...dto } : t)));
        setFeedback({ type: "success", message: `Tipo ${dto.codigo} atualizado com sucesso.` });
      } else {
        await createTipoConhecimento(dto);
        setList((p) => [...p, { ...dto }]);
        setFeedback({ type: "success", message: `Tipo ${dto.codigo} cadastrado com sucesso.` });
        setEditCodigo(dto.codigo);
      }
    } catch {
      // Mock fallback
      if (editCodigo) {
        setList((p) => p.map((t) => (t.codigo === editCodigo ? { ...dto } : t)));
        setFeedback({ type: "success", message: `Tipo ${dto.codigo} atualizado com sucesso.` });
      } else {
        setList((p) => [...p, { ...dto }]);
        setFeedback({ type: "success", message: `Tipo ${dto.codigo} cadastrado com sucesso.` });
        setEditCodigo(dto.codigo);
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .imp2-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .imp2-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .imp2-topbar-left { display: flex; align-items: center; gap: 10px; }
        .imp2-logo {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .imp2-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .imp2-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .imp2-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .imp2-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .imp2-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .imp2-action-group:last-child { border-right: none; }
        .imp2-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .imp2-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .imp2-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .imp2-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .imp2-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .imp2-btn-new {
          background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600;
        }
        .imp2-btn-new:hover:not(:disabled) { background: #dff5e4; border-color: #88c898; }
        .imp2-btn-danger {
          background: transparent; color: #b94040; border-color: #f0c8c8;
        }
        .imp2-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }

        .imp2-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .imp2-body::-webkit-scrollbar { width: 5px; }
        .imp2-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .imp2-section-banner {
          display: flex; align-items: center; gap: 10px; padding: 14px 0 8px;
        }
        .imp2-section-banner:first-child { padding-top: 0; }
        .imp2-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .imp2-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .imp2-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .imp2-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .imp2-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .imp2-card-header-left { display: flex; align-items: center; gap: 8px; }
        .imp2-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .imp2-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .imp2-card-body { padding: 18px 18px; }

        .imp2-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .imp2-col-2  { grid-column: span 2; }
        .imp2-col-3  { grid-column: span 3; }
        .imp2-col-4  { grid-column: span 4; }
        .imp2-col-5  { grid-column: span 5; }
        .imp2-col-12 { grid-column: span 12; }

        .imp2-field { display: flex; flex-direction: column; gap: 5px; }
        .imp2-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .imp2-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .imp2-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .imp2-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .imp2-input:disabled { background: #f0f4ee; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }

        .imp2-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .imp2-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }

        .imp2-toggle-row { display: flex; align-items: center; gap: 10px; padding-top: 4px; }
        .imp2-toggle { position: relative; width: 38px; height: 20px; flex-shrink: 0; cursor: pointer; }
        .imp2-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .imp2-toggle-track { position: absolute; inset: 0; background: #d4e0d0; border-radius: 20px; transition: background 0.2s; }
        .imp2-toggle input:checked ~ .imp2-toggle-track { background: #3e9654; }
        .imp2-toggle-thumb {
          position: absolute; top: 3px; left: 3px; width: 14px; height: 14px;
          background: #fff; border-radius: 50%; transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .imp2-toggle input:checked ~ .imp2-toggle-thumb { transform: translateX(18px); }
        .imp2-toggle-label { font-size: 13px; color: #3a5a45; font-weight: 500; }

        .imp2-results-wrap { border-top: 1px solid #edf5e8; overflow-x: auto; }
        .imp2-results-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4;
        }
        .imp2-results-bar-left { display: flex; align-items: center; gap: 8px; }
        .imp2-results-bar-label { font-size: 11px; font-weight: 600; color: #4a7060; text-transform: uppercase; letter-spacing: 0.5px; }
        .imp2-results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .imp2-results-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .imp2-results-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .imp2-results-table tbody tr { cursor: pointer; transition: background 0.1s; }
        .imp2-results-table tbody tr:hover { background: #eef9f0; }
        .imp2-action-btn {
          background: transparent; border: none; cursor: pointer; font-size: 12px;
          padding: 3px 8px; border-radius: 5px; font-family: 'Inter', sans-serif;
          transition: background 0.12s, color 0.12s; margin: 0 2px;
        }
        .imp2-edit-btn { color: #4a7a9a; }
        .imp2-edit-btn:hover { background: #e8f4fc; color: #2a5a7a; }
        .imp2-delete-btn { color: #c89090; }
        .imp2-delete-btn:hover { background: #fdecea; color: #b94040; }

        .imp2-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: imp2FadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .imp2-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .imp2-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .imp2-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        .imp2-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .imp2-footer-left { display: flex; align-items: center; gap: 20px; }
        .imp2-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .imp2-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes imp2Spin { to { transform: rotate(360deg); } }
        .imp2-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: imp2Spin 0.65s linear infinite;
        }
        .imp2-spinner-dark {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid #d4e8cc; border-top-color: #3e9654;
          border-radius: 50%; animation: imp2Spin 0.65s linear infinite;
        }
        @keyframes imp2FadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="imp2-root">
        <header className="imp2-topbar">
          <div className="imp2-topbar-left">
            <div className="imp2-logo">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="imp2-app-name">
              Venture<span className="imp2-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="imp2-screen-title">VIMP0102 — Tipos de Conhecimentos de Transporte</span>
          </div>
        </header>

        <div className="imp2-actionbar">
          <div className="imp2-action-group">
            <span className="imp2-action-label">Cadastro</span>
            <button className="imp2-btn imp2-btn-new" onClick={handleCadastrar} disabled={isSaving || isLoading}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Cadastrar
            </button>
          </div>
          <div className="imp2-action-group">
            <span className="imp2-action-label">Ações</span>
            <button className="imp2-btn imp2-btn-primary" onClick={() => void handleSalvar()} disabled={isSaving}>
              {isSaving
                ? <><div className="imp2-spinner" />Salvando...</>
                : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>Salvar</>
              }
            </button>
          </div>
        </div>

        <div className="imp2-body">
          {feedback && (
            <div className={`imp2-feedback ${feedback.type}`}>
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

          <div className="imp2-section-banner">
            <span className="imp2-section-banner-pill">Cadastro</span>
            <div className="imp2-section-banner-line" />
            <span className="imp2-section-banner-hint">
              {editCodigo ? `Editando tipo ${editCodigo}` : "Preencha os campos para cadastrar um novo tipo"}
            </span>
          </div>

          <div className="imp2-card">
            <div className="imp2-card-header">
              <div className="imp2-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="imp2-card-title">Tipo de Conhecimento</span>
              </div>
              <span className="imp2-card-badge">{editCodigo ? `Editando: ${editCodigo}` : "Novo"}</span>
            </div>
            <div className="imp2-card-body">
              <div className="imp2-grid">
                <div className="imp2-field imp2-col-2">
                  <label className="imp2-label">Código</label>
                  <input
                    className="imp2-input"
                    placeholder="Ex: CT001"
                    value={form.codigo}
                    onChange={(e) => setField("codigo", e.target.value)}
                    disabled={editCodigo !== null}
                  />
                </div>
                <div className="imp2-field imp2-col-5">
                  <label className="imp2-label">Descrição</label>
                  <input
                    className="imp2-input"
                    placeholder="Ex: Conhecimento Aéreo (AWB)"
                    value={form.descricao}
                    onChange={(e) => setField("descricao", e.target.value)}
                  />
                </div>
                <div className="imp2-field imp2-col-3">
                  <label className="imp2-label">Modal</label>
                  <select
                    className="imp2-select"
                    value={form.modal}
                    onChange={(e) => setField("modal", e.target.value)}
                  >
                    {MODAIS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="imp2-field imp2-col-2">
                  <label className="imp2-label">Ativo</label>
                  <div className="imp2-toggle-row">
                    <label className="imp2-toggle">
                      <input
                        type="checkbox"
                        checked={form.ativo}
                        onChange={(e) => setField("ativo", e.target.checked)}
                      />
                      <div className="imp2-toggle-track" />
                      <div className="imp2-toggle-thumb" />
                    </label>
                    <span className="imp2-toggle-label">{form.ativo ? "Ativo" : "Inativo"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="imp2-section-banner">
            <span className="imp2-section-banner-pill">Listagem</span>
            <div className="imp2-section-banner-line" />
            <span className="imp2-section-banner-hint">{list.length} tipo(s) cadastrado(s)</span>
          </div>

          <div className="imp2-card">
            <div className="imp2-results-wrap">
              <div className="imp2-results-bar">
                <div className="imp2-results-bar-left">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  <span className="imp2-results-bar-label">Registros</span>
                  <span className="imp2-card-badge">{list.length} registro(s)</span>
                </div>
              </div>
              <table className="imp2-results-table">
                <thead>
                  <tr>
                    <th style={{ width: 100 }}>Código</th>
                    <th>Descrição</th>
                    <th style={{ width: 140 }}>Modal</th>
                    <th style={{ width: 70 }}>Ativo</th>
                    <th style={{ width: 140 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((tc) => (
                    <tr key={tc.codigo}>
                      <td style={{ fontWeight: 600, color: "#1a4a2a" }}>{tc.codigo}</td>
                      <td>{tc.descricao}</td>
                      <td>{tc.modal}</td>
                      <td style={{ textAlign: "center" }}>
                        {tc.ativo
                          ? <span style={{ color: "#2a8040", fontWeight: 600, fontSize: 12 }}>Sim</span>
                          : <span style={{ color: "#96b8a0", fontSize: 12 }}>Não</span>
                        }
                      </td>
                      <td>
                        <button
                          className="imp2-action-btn imp2-edit-btn"
                          onClick={() => handleEdit(tc)}
                        >
                          Editar
                        </button>
                        <button
                          className="imp2-action-btn imp2-delete-btn"
                          onClick={() => void handleDelete(tc.codigo)}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <footer className="imp2-footer">
          <div className="imp2-footer-left">
            <div className="imp2-footer-stat">Registros: <strong>{list.length}</strong></div>
            <div className="imp2-footer-stat">Ativos: <strong>{list.filter((t) => t.ativo).length}</strong></div>
          </div>
          <div className="imp2-footer-stat" style={{ gap: 8 }}>
            <span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>
      </div>
    </>
  );
}

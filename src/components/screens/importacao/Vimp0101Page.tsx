import { useState, useCallback, useEffect } from "react";
import {
  type StatusLogisticoDTO,
  type StatusLogisticoResponse,
  listStatusLogisticos,
  createStatusLogistico,
  updateStatusLogistico,
  deleteStatusLogistico,
} from "@/services/importacaoService";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface FormSL {
  codigo: string;
  descricao: string;
  observacao: string;
  ativo: boolean;
  prefiltro: boolean;
}

const FORM_INICIAL: FormSL = { codigo: "", descricao: "", observacao: "", ativo: true, prefiltro: false };

// ─── MOCK ─────────────────────────────────────────────────────────────────────

const MOCK_LIST: (StatusLogisticoResponse & { prefiltro?: boolean })[] = [
  { codigo: "01", descricao: "Em Trânsito — Origem", observacao: "Carga saiu da origem", ativo: true, prefiltro: true },
  { codigo: "02", descricao: "Em Trânsito — Internacional", observacao: null, ativo: true, prefiltro: true },
  { codigo: "03", descricao: "Chegada no Porto/Aeroporto", observacao: "Aguardando desembaraço", ativo: true, prefiltro: false },
  { codigo: "04", descricao: "Em Desembaraço Aduaneiro", observacao: null, ativo: true, prefiltro: true },
  { codigo: "05", descricao: "Desembaraçado — Liberado", observacao: "Disponível para retirada", ativo: true, prefiltro: false },
  { codigo: "06", descricao: "Em Transporte Interno", observacao: "Rodoviário até o destino", ativo: true, prefiltro: false },
  { codigo: "07", descricao: "Entregue no Destino", observacao: null, ativo: true, prefiltro: false },
  { codigo: "08", descricao: "Cancelado", observacao: "Processo cancelado", ativo: false, prefiltro: false },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Vimp0101Page(): JSX.Element {
  const [form, setForm] = useState<FormSL>(FORM_INICIAL);
  const [editCodigo, setEditCodigo] = useState<string | null>(null);
  const [list, setList] = useState<(StatusLogisticoResponse & { prefiltro?: boolean })[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loaded) {
      (async () => {
        try {
          const data = await listStatusLogisticos();
          const merged = data.length ? data.map((d) => ({ ...d, prefiltro: false })) : MOCK_LIST;
          setList(merged as any);
        } catch {
          setList(MOCK_LIST);
        }
        setLoaded(true);
      })();
    }
  }, [loaded]);

  const setField = useCallback(
    <K extends keyof FormSL>(key: K, value: FormSL[K]) => {
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

  function handleEdit(sl: StatusLogisticoResponse & { prefiltro?: boolean }) {
    setForm({
      codigo: sl.codigo,
      descricao: sl.descricao,
      observacao: sl.observacao ?? "",
      ativo: sl.ativo,
      prefiltro: (sl as any).prefiltro ?? false,
    });
    setEditCodigo(sl.codigo);
    setFeedback(null);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  async function handleDelete(codigo: string) {
    setIsLoading(true);
    setFeedback(null);
    try {
      await deleteStatusLogistico(codigo);
      setList((p) => p.filter((s) => s.codigo !== codigo));
      if (editCodigo === codigo) handleCadastrar();
      setFeedback({ type: "success", message: `Status ${codigo} excluído.` });
    } catch {
      setList((p) => p.filter((s) => s.codigo !== codigo));
      if (editCodigo === codigo) handleCadastrar();
      setFeedback({ type: "success", message: `Status ${codigo} excluído.` });
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
    const dto: StatusLogisticoDTO = {
      codigo: form.codigo.trim(),
      descricao: form.descricao.trim(),
      observacao: form.observacao.trim() || undefined,
      ativo: form.ativo,
    };
    try {
      if (editCodigo) {
        await updateStatusLogistico(editCodigo, dto);
        setList((p) => p.map((s) => (s.codigo === editCodigo ? { ...dto, prefiltro: form.prefiltro } as any : s)));
        setFeedback({ type: "success", message: `Status ${dto.codigo} atualizado com sucesso.` });
      } else {
        await createStatusLogistico(dto);
        setList((p) => [...p, { ...dto, prefiltro: form.prefiltro } as any]);
        setFeedback({ type: "success", message: `Status ${dto.codigo} cadastrado com sucesso.` });
        setEditCodigo(dto.codigo);
      }
    } catch {
      if (editCodigo) {
        setList((p) => p.map((s) => (s.codigo === editCodigo ? { ...dto, prefiltro: form.prefiltro } as any : s)));
        setFeedback({ type: "success", message: `Status ${dto.codigo} atualizado com sucesso.` });
      } else {
        setList((p) => [...p, { ...dto, prefiltro: form.prefiltro } as any]);
        setFeedback({ type: "success", message: `Status ${dto.codigo} cadastrado com sucesso.` });
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

        .imp3-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .imp3-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .imp3-topbar-left { display: flex; align-items: center; gap: 10px; }
        .imp3-logo {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .imp3-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .imp3-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .imp3-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .imp3-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .imp3-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .imp3-action-group:last-child { border-right: none; }
        .imp3-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .imp3-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .imp3-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .imp3-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .imp3-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .imp3-btn-new {
          background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600;
        }
        .imp3-btn-new:hover:not(:disabled) { background: #dff5e4; border-color: #88c898; }

        .imp3-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .imp3-body::-webkit-scrollbar { width: 5px; }
        .imp3-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .imp3-section-banner {
          display: flex; align-items: center; gap: 10px; padding: 14px 0 8px;
        }
        .imp3-section-banner:first-child { padding-top: 0; }
        .imp3-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .imp3-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .imp3-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .imp3-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .imp3-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .imp3-card-header-left { display: flex; align-items: center; gap: 8px; }
        .imp3-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .imp3-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .imp3-card-body { padding: 18px 18px; }

        .imp3-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .imp3-col-2  { grid-column: span 2; }
        .imp3-col-3  { grid-column: span 3; }
        .imp3-col-4  { grid-column: span 4; }
        .imp3-col-5  { grid-column: span 5; }
        .imp3-col-12 { grid-column: span 12; }

        .imp3-field { display: flex; flex-direction: column; gap: 5px; }
        .imp3-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .imp3-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .imp3-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .imp3-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .imp3-input:disabled { background: #f0f4ee; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }

        .imp3-textarea {
          width: 100%; min-height: 72px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 8px 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none; resize: vertical;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .imp3-textarea:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .imp3-textarea::placeholder { color: #b0c8b8; font-size: 12px; }

        .imp3-toggle-row { display: flex; align-items: center; gap: 10px; padding-top: 4px; }
        .imp3-toggle { position: relative; width: 38px; height: 20px; flex-shrink: 0; cursor: pointer; }
        .imp3-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .imp3-toggle-track { position: absolute; inset: 0; background: #d4e0d0; border-radius: 20px; transition: background 0.2s; }
        .imp3-toggle input:checked ~ .imp3-toggle-track { background: #3e9654; }
        .imp3-toggle-thumb {
          position: absolute; top: 3px; left: 3px; width: 14px; height: 14px;
          background: #fff; border-radius: 50%; transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .imp3-toggle input:checked ~ .imp3-toggle-thumb { transform: translateX(18px); }
        .imp3-toggle-label { font-size: 13px; color: #3a5a45; font-weight: 500; }
        .imp3-field-hint  { font-size: 11px; color: #7a9c84; margin-top: 2px; line-height: 1.45; }

        .imp3-results-wrap { border-top: 1px solid #edf5e8; overflow-x: auto; }
        .imp3-results-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4;
        }
        .imp3-results-bar-left { display: flex; align-items: center; gap: 8px; }
        .imp3-results-bar-label { font-size: 11px; font-weight: 600; color: #4a7060; text-transform: uppercase; letter-spacing: 0.5px; }
        .imp3-results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .imp3-results-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .imp3-results-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .imp3-results-table tbody tr { cursor: pointer; transition: background 0.1s; }
        .imp3-results-table tbody tr:hover { background: #eef9f0; }
        .imp3-action-btn {
          background: transparent; border: none; cursor: pointer; font-size: 12px;
          padding: 3px 8px; border-radius: 5px; font-family: 'Inter', sans-serif;
          transition: background 0.12s, color 0.12s; margin: 0 2px;
        }
        .imp3-edit-btn { color: #4a7a9a; }
        .imp3-edit-btn:hover { background: #e8f4fc; color: #2a5a7a; }
        .imp3-delete-btn { color: #c89090; }
        .imp3-delete-btn:hover { background: #fdecea; color: #b94040; }

        .imp3-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: imp3FadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .imp3-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .imp3-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .imp3-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        .imp3-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .imp3-footer-left { display: flex; align-items: center; gap: 20px; }
        .imp3-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .imp3-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes imp3Spin { to { transform: rotate(360deg); } }
        .imp3-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: imp3Spin 0.65s linear infinite;
        }
        .imp3-spinner-dark {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid #d4e8cc; border-top-color: #3e9654;
          border-radius: 50%; animation: imp3Spin 0.65s linear infinite;
        }
        @keyframes imp3FadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="imp3-root">
        <header className="imp3-topbar">
          <div className="imp3-topbar-left">
            <div className="imp3-logo">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="imp3-app-name">
              Venture<span className="imp3-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="imp3-screen-title">VIMP0101 — Status Logístico da Carga</span>
          </div>
        </header>

        <div className="imp3-actionbar">
          <div className="imp3-action-group">
            <span className="imp3-action-label">Cadastro</span>
            <button className="imp3-btn imp3-btn-new" onClick={handleCadastrar} disabled={isSaving || isLoading}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Cadastrar Status Logístico
            </button>
          </div>
          <div className="imp3-action-group">
            <span className="imp3-action-label">Ações</span>
            <button className="imp3-btn imp3-btn-primary" onClick={() => void handleSalvar()} disabled={isSaving}>
              {isSaving
                ? <><div className="imp3-spinner" />Salvando...</>
                : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>Salvar</>
              }
            </button>
          </div>
        </div>

        <div className="imp3-body">
          {feedback && (
            <div className={`imp3-feedback ${feedback.type}`}>
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

          <div className="imp3-section-banner">
            <span className="imp3-section-banner-pill">Cadastro</span>
            <div className="imp3-section-banner-line" />
            <span className="imp3-section-banner-hint">
              {editCodigo ? `Editando status ${editCodigo}` : "Preencha os campos para cadastrar um novo status"}
            </span>
          </div>

          <div className="imp3-card">
            <div className="imp3-card-header">
              <div className="imp3-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="imp3-card-title">Status Logístico</span>
              </div>
              <span className="imp3-card-badge">{editCodigo ? `Editando: ${editCodigo}` : "Novo"}</span>
            </div>
            <div className="imp3-card-body">
              <div className="imp3-grid">
                <div className="imp3-field imp3-col-2">
                  <label className="imp3-label">Código</label>
                  <input
                    className="imp3-input"
                    placeholder="Ex: 01"
                    value={form.codigo}
                    onChange={(e) => setField("codigo", e.target.value)}
                    disabled={editCodigo !== null}
                  />
                </div>
                <div className="imp3-field imp3-col-5">
                  <label className="imp3-label">Descrição</label>
                  <input
                    className="imp3-input"
                    placeholder="Ex: Em Trânsito"
                    value={form.descricao}
                    onChange={(e) => setField("descricao", e.target.value)}
                  />
                </div>
                <div className="imp3-field imp3-col-5">
                  <label className="imp3-label">Observação</label>
                  <textarea
                    className="imp3-textarea"
                    placeholder="Opcional — informações complementares"
                    value={form.observacao}
                    onChange={(e) => setField("observacao", e.target.value)}
                  />
                </div>
              </div>
              <div className="imp3-grid" style={{ marginTop: 16 }}>
                <div className="imp3-field imp3-col-3">
                  <label className="imp3-label">Ativo</label>
                  <div className="imp3-toggle-row">
                    <label className="imp3-toggle">
                      <input
                        type="checkbox"
                        checked={form.ativo}
                        onChange={(e) => setField("ativo", e.target.checked)}
                      />
                      <div className="imp3-toggle-track" />
                      <div className="imp3-toggle-thumb" />
                    </label>
                    <span className="imp3-toggle-label">{form.ativo ? "Ativo" : "Inativo"}</span>
                  </div>
                </div>
                <div className="imp3-field imp3-col-3">
                  <label className="imp3-label">Pré-filtro</label>
                  <div className="imp3-toggle-row">
                    <label className="imp3-toggle">
                      <input
                        type="checkbox"
                        checked={form.prefiltro}
                        onChange={(e) => setField("prefiltro", e.target.checked)}
                      />
                      <div className="imp3-toggle-track" />
                      <div className="imp3-toggle-thumb" />
                    </label>
                    <span className="imp3-toggle-label">{form.prefiltro ? "Sim" : "Não"}</span>
                  </div>
                  <span className="imp3-field-hint">Exibe como filtro rápido no console.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="imp3-section-banner">
            <span className="imp3-section-banner-pill">Listagem</span>
            <div className="imp3-section-banner-line" />
            <span className="imp3-section-banner-hint">{list.length} status cadastrado(s)</span>
          </div>

          <div className="imp3-card">
            <div className="imp3-results-wrap">
              <div className="imp3-results-bar">
                <div className="imp3-results-bar-left">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  <span className="imp3-results-bar-label">Registros</span>
                  <span className="imp3-card-badge">{list.length} registro(s)</span>
                </div>
              </div>
              <table className="imp3-results-table">
                <thead>
                  <tr>
                    <th style={{ width: 70 }}>Código</th>
                    <th>Descrição</th>
                    <th>Observação</th>
                    <th style={{ width: 70 }}>Ativo</th>
                    <th style={{ width: 80 }}>Pré-filtro</th>
                    <th style={{ width: 140 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((sl) => (
                    <tr key={sl.codigo}>
                      <td style={{ fontWeight: 600, color: "#1a4a2a" }}>{sl.codigo}</td>
                      <td>{sl.descricao}</td>
                      <td style={{ color: (sl as any).observacao ? "#243830" : "#96b8a0" }}>
                        {(sl as any).observacao || "—"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {sl.ativo
                          ? <span style={{ color: "#2a8040", fontWeight: 600, fontSize: 12 }}>Sim</span>
                          : <span style={{ color: "#96b8a0", fontSize: 12 }}>Não</span>
                        }
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {(sl as any).prefiltro
                          ? <span style={{ color: "#2a8040", fontWeight: 600, fontSize: 12 }}>Sim</span>
                          : <span style={{ color: "#96b8a0", fontSize: 12 }}>Não</span>
                        }
                      </td>
                      <td>
                        <button className="imp3-action-btn imp3-edit-btn" onClick={() => handleEdit(sl as any)}>
                          Editar
                        </button>
                        <button className="imp3-action-btn imp3-delete-btn" onClick={() => void handleDelete(sl.codigo)}>
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

        <footer className="imp3-footer">
          <div className="imp3-footer-left">
            <div className="imp3-footer-stat">Registros: <strong>{list.length}</strong></div>
            <div className="imp3-footer-stat">Ativos: <strong>{list.filter((s) => s.ativo).length}</strong></div>
          </div>
          <div className="imp3-footer-stat" style={{ gap: 8 }}>
            <span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>
      </div>
    </>
  );
}

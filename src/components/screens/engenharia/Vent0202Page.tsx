import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoteiroFabForm {
  item: string;
  itemDesc: string;
  mascara: string;
  alternativo: string;
}

interface OperacaoFab {
  seq: number;
  operacao: string;
  operacaoDesc: string;
  centroTrabalho: string;
  ctDesc: string;
  tempoCorrigido: number;
  qtdHomens: number;
  origem: string;
  dataInicio: string;
  dataFim: string;
  roteiroPadrao: string;
  situacao: string;
  formula: string;
}

type FeedbackState = { type: "success" | "error"; message: string } | null;

const SITUACAO_OP = ["Aprovada", "Inativa", "Fantasma"];
const ORIGEM_OP = ["Interna", "Externa"];

const formInicial: RoteiroFabForm = { item:"", itemDesc:"", mascara:"", alternativo:"Padrão" };

const MOCK_OPERACOES: OperacaoFab[] = [
  { seq:10, operacao:"OP001", operacaoDesc:"Corte a Laser", centroTrabalho:"CT01", ctDesc:"Centro Corte", tempoCorrigido:0.75, qtdHomens:1, origem:"Interna", dataInicio:"01/01/2026", dataFim:"31/12/2026", roteiroPadrao:"RP001", situacao:"Aprovada", formula:"" },
  { seq:20, operacao:"OP002", operacaoDesc:"Dobra CNC", centroTrabalho:"CT02", ctDesc:"Centro Dobra", tempoCorrigido:0.50, qtdHomens:2, origem:"Interna", dataInicio:"01/01/2026", dataFim:"31/12/2026", roteiroPadrao:"RP001", situacao:"Aprovada", formula:"T*1.1" },
  { seq:30, operacao:"OP005", operacaoDesc:"Pintura Industrial", centroTrabalho:"CT05", ctDesc:"Pintura", tempoCorrigido:1.20, qtdHomens:1, origem:"Externa", dataInicio:"01/01/2026", dataFim:"31/12/2026", roteiroPadrao:"", situacao:"Aprovada", formula:"" },
];

function normalizeError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const resp = (error as any).response;
    if (resp?.data?.message) return String(resp.data.message);
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Vent0202Page(): JSX.Element {
  const [form, setForm] = useState<RoteiroFabForm>(formInicial);
  const [operacoes, setOperacoes] = useState<OperacaoFab[]>(MOCK_OPERACOES);
  const [errors, setErrors] = useState<Partial<Record<keyof RoteiroFabForm, string>>>({});
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showOpForm, setShowOpForm] = useState(false);
  const [novaOp, setNovaOp] = useState<OperacaoFab>({
    seq:0, operacao:"", operacaoDesc:"", centroTrabalho:"", ctDesc:"", tempoCorrigido:0, qtdHomens:1, origem:"Interna", dataInicio:new Date().toISOString().slice(0,10), dataFim:"31/12/2030", roteiroPadrao:"", situacao:"Aprovada", formula:"",
  });

  const setField = useCallback(<K extends keyof RoteiroFabForm>(key: K, value: RoteiroFabForm[K]) => {
    setForm(p => ({ ...p, [key]: value }));
    setErrors(p => ({ ...p, [key]: undefined }));
  }, []);

  function validate(): boolean {
    const e: Partial<Record<keyof RoteiroFabForm, string>> = {};
    if (!form.item.trim()) e.item = "Item obrigatório.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSalvar() {
    if (!validate()) return;
    setIsSaving(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      setFeedback({ type: "success", message: "Roteiro de fabricação salvo com sucesso." });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Falha ao salvar.") });
    } finally { setIsSaving(false); }
  }

  function handleNovo() { setForm(formInicial); setOperacoes([]); setErrors({}); setFeedback(null); }

  function addOperacao() {
    const newOp = { ...novaOp, seq: operacoes.length > 0 ? Math.max(...operacoes.map(o => o.seq)) + 10 : 10 };
    setOperacoes(p => [...p, newOp]);
    setNovaOp({ seq:0, operacao:"", operacaoDesc:"", centroTrabalho:"", ctDesc:"", tempoCorrigido:0, qtdHomens:1, origem:"Interna", dataInicio:new Date().toISOString().slice(0,10), dataFim:"31/12/2030", roteiroPadrao:"", situacao:"Aprovada", formula:"" });
    setShowOpForm(false);
  }

  function removeOperacao(seq: number) { setOperacoes(p => p.filter(o => o.seq !== seq)); }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .e2-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }
        .e2-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .e2-topbar-left { display: flex; align-items: center; gap: 10px; }
        .e2-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .e2-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .e2-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .e2-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }
        .e2-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .e2-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .e2-action-group:last-child { border-right: none; }
        .e2-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .e2-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .e2-bt-p { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .e2-bt-p:hover:not(:disabled) { background: #1e3a2a; }
        .e2-bt-p:disabled { opacity: 0.5; cursor: not-allowed; }
        .e2-bt-g { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .e2-bt-g:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .e2-bt-g:disabled { opacity: 0.5; cursor: not-allowed; }
        .e2-bt-d { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .e2-bt-d:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .e2-bt-sm { height: 28px; padding: 0 9px; font-size: 12px; }
        .e2-bt-n {
          background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600;
        }
        .e2-bt-n:hover:not(:disabled) { background: #dff5e4; border-color: #88c898; }
        .e2-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .e2-body::-webkit-scrollbar { width: 5px; }
        .e2-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }
        .e2-section-banner {
          display: flex; align-items: center; gap: 10px; padding: 14px 0 8px;
        }
        .e2-section-banner:first-child { padding-top: 0; }
        .e2-section-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .e2-section-line { flex: 1; height: 1px; background: #dbe8d5; }
        .e2-section-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }
        .e2-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .e2-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .e2-card-header-left { display: flex; align-items: center; gap: 8px; }
        .e2-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .e2-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .e2-card-body { padding: 18px 18px; }
        .e2-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .e2-g2  { grid-column: span 2; }
        .e2-g3  { grid-column: span 3; }
        .e2-g4  { grid-column: span 4; }
        .e2-g5  { grid-column: span 5; }
        .e2-g6  { grid-column: span 6; }
        .e2-g12 { grid-column: span 12; }
        .e2-field { display: flex; flex-direction: column; gap: 5px; }
        .e2-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .e2-label-req { color: #c84040; font-size: 12px; line-height: 1; }
        .e2-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .e2-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .e2-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .e2-input:disabled { background: #f0f4ee; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }
        .e2-input.has-err { border-color: #e05252; box-shadow: 0 0 0 2px rgba(224,82,82,0.1); }
        .e2-input[type="date"] { cursor: pointer; }
        .e2-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .e2-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .e2-field-err { font-size: 11px; color: #c84040; margin-top: 2px; display: flex; align-items: center; gap: 4px; }
        .e2-field-hint  { font-size: 11px; color: #7a9c84; margin-top: 2px; line-height: 1.45; }
        .e2-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
        .e2-tbl th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .e2-tbl td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .e2-tbl tbody tr { transition: background 0.1s; }
        .e2-tbl tbody tr:hover { background: #eef9f0; }
        .e2-fb {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: e2Fade 0.2s ease;
          margin-bottom: 14px;
        }
        .e2-fb.s { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .e2-fb.e { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .e2-ovl {
          position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100;
          display: flex; justify-content: center; align-items: center;
        }
        .e2-mod {
          background: #fff; border: 1px solid #dbe8d5; border-radius: 12px;
          width: 680px; max-height: 80vh; overflow-y: auto; padding: 24px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        }
        .e2-mod h3 { margin: 0 0 16px; font-size: 13px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .e2-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .e2-footer-stat { font-size: 11.5px; color: #6a8a74; display: flex; align-items: center; gap: 4px; }
        .e2-footer-stat strong { color: #1a2e22; font-weight: 600; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .e2-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        @keyframes e2Fade { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="e2-root">

        <header className="e2-topbar">
          <div className="e2-topbar-left">
            <div className="e2-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="e2-app-name">
              Venture<span className="e2-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="e2-screen-title">VENT0202 — Cadastro do Roteiro de Fabricação</span>
          </div>
        </header>

        <div className="e2-actionbar">
          <div className="e2-action-group">
            <span className="e2-action-label">Cadastro</span>
            <button className="e2-btn e2-bt-n" onClick={handleNovo} disabled={isSaving}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Novo
            </button>
          </div>
          <div className="e2-action-group">
            <span className="e2-action-label">Ações</span>
            <button className="e2-btn e2-bt-p" onClick={() => void handleSalvar()} disabled={isSaving}>
              {isSaving
                ? <><div className="e2-spinner" />Salvando...</>
                : <>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                      <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    Salvar
                  </>
              }
            </button>
          </div>
          <div className="e2-action-group">
            <button className="e2-btn e2-bt-g" onClick={() => setShowOpForm(true)}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Adicionar Operação
            </button>
          </div>
          <div className="e2-action-group">
            <button className="e2-btn e2-bt-g" onClick={() => alert("Roteiro Padrão - botão para copiar roteiro padrão")}>Roteiro Padrão</button>
          </div>
          <div className="e2-action-group">
            <button className="e2-btn e2-bt-g" onClick={() => alert("Configurador de validações")}>Configurador</button>
          </div>
        </div>

        <div className="e2-body">

          {feedback && (
            <div className={`e2-fb ${feedback.type === "success" ? "s" : "e"}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === "success"
                  ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  : <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4" /><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round" /></>
                }
              </svg>
              {feedback.message}
            </div>
          )}

          <div className="e2-section-banner">
            <span className="e2-section-pill">Dados do Roteiro</span>
            <div className="e2-section-line" />
            <span className="e2-section-hint">Preencha os campos obrigatórios marcados com *</span>
          </div>

          <div className="e2-card">
            <div className="e2-card-header">
              <div className="e2-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="e2-card-title">Roteiro de Fabricação</span>
              </div>
              {form.item && <span className="e2-card-badge">{form.item}</span>}
            </div>
            <div className="e2-card-body">
              <div className="e2-grid">
                <div className="e2-field e2-g3">
                  <label className="e2-label">Item <span className="e2-label-req">*</span></label>
                  <input className={`e2-input${errors.item ? " has-err" : ""}`} value={form.item} onChange={e => setField("item", e.target.value)} placeholder="Código do item" />
                  {errors.item && <span className="e2-field-err"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2" /><path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round" /></svg>{errors.item}</span>}
                </div>
                <div className="e2-field e2-g5">
                  <label className="e2-label">Descrição Item</label>
                  <input className="e2-input" value={form.itemDesc} onChange={e => setField("itemDesc", e.target.value)} disabled />
                </div>
                <div className="e2-field e2-g2">
                  <label className="e2-label">Máscara</label>
                  <input className="e2-input" value={form.mascara} onChange={e => setField("mascara", e.target.value)} placeholder="Configurado" />
                </div>
                <div className="e2-field e2-g2">
                  <label className="e2-label">Alternativo</label>
                  <input className="e2-input" value={form.alternativo} onChange={e => setField("alternativo", e.target.value)} disabled />
                </div>
              </div>
            </div>
          </div>

          <div className="e2-section-banner">
            <span className="e2-section-pill">Operações</span>
            <div className="e2-section-line" />
            <span className="e2-card-badge">{operacoes.length} operação(ões)</span>
          </div>

          <div className="e2-card">
            <div className="e2-card-header">
              <div className="e2-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M2 8h12M2 12h8" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="e2-card-title">Relação de Operações</span>
              </div>
            </div>
            <div style={{overflowX:"auto"}}>
              <table className="e2-tbl">
                <thead>
                  <tr>
                    <th>Seq</th><th>Operação</th><th>Descrição</th><th>Centro Trab.</th>
                    <th>Tempo Cor.</th><th>Qtd Homens</th><th>Origem</th>
                    <th>Roteiro Padrão</th><th>Situação</th><th>Fórmula</th><th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {operacoes.map(op => (
                    <tr key={op.seq}>
                      <td style={{fontWeight:600,color:"#1a4a2a"}}>{op.seq}</td>
                      <td>{op.operacao}</td>
                      <td>{op.operacaoDesc}</td>
                      <td>{op.centroTrabalho}</td>
                      <td>{op.tempoCorrigido.toFixed(2)}</td>
                      <td>{op.qtdHomens}</td>
                      <td>{op.origem}</td>
                      <td style={{color:op.roteiroPadrao?"#243830":"#96b8a0"}}>{op.roteiroPadrao || "—"}</td>
                      <td>{op.situacao}</td>
                      <td style={{color:op.formula?"#243830":"#96b8a0"}}>{op.formula || "—"}</td>
                      <td><button className="e2-btn e2-bt-d e2-bt-sm" onClick={() => removeOperacao(op.seq)}>Excluir</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <footer className="e2-footer">
          <div className="e2-footer-stat">
            Item: <strong>{form.item || "—"}</strong>
          </div>
          <div className="e2-footer-stat">
            Operações: <strong>{operacoes.length}</strong>
          </div>
          <div className="e2-footer-stat">
            <span style={{color:"#b0c8b8",fontSize:11}}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>
      </div>

      {showOpForm && (
        <div className="e2-ovl" onClick={e => { if (e.target === e.currentTarget) setShowOpForm(false); }}>
          <div className="e2-mod">
            <h3>Nova Operação</h3>
            <div className="e2-grid">
              <div className="e2-field e2-g6"><label className="e2-label">Operação</label><input className="e2-input" value={novaOp.operacao} onChange={e => setNovaOp(p => ({...p, operacao:e.target.value}))} /></div>
              <div className="e2-field e2-g6"><label className="e2-label">Descrição</label><input className="e2-input" value={novaOp.operacaoDesc} onChange={e => setNovaOp(p => ({...p, operacaoDesc:e.target.value}))} /></div>
              <div className="e2-field e2-g6"><label className="e2-label">Centro de Trabalho</label><input className="e2-input" value={novaOp.centroTrabalho} onChange={e => setNovaOp(p => ({...p, centroTrabalho:e.target.value}))} /></div>
              <div className="e2-field e2-g6"><label className="e2-label">Descrição CT</label><input className="e2-input" value={novaOp.ctDesc} onChange={e => setNovaOp(p => ({...p, ctDesc:e.target.value}))} /></div>
              <div className="e2-field e2-g3"><label className="e2-label">Tempo Corrigido</label><input className="e2-input" type="number" step="0.01" value={novaOp.tempoCorrigido} onChange={e => setNovaOp(p => ({...p, tempoCorrigido:Number(e.target.value)}))} /></div>
              <div className="e2-field e2-g3"><label className="e2-label">Qtd Homens</label><input className="e2-input" type="number" value={novaOp.qtdHomens} onChange={e => setNovaOp(p => ({...p, qtdHomens:Number(e.target.value)}))} /></div>
              <div className="e2-field e2-g4"><label className="e2-label">Origem</label><select className="e2-select" value={novaOp.origem} onChange={e => setNovaOp(p => ({...p, origem:e.target.value}))}>{ORIGEM_OP.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              <div className="e2-field e2-g4"><label className="e2-label">Situação</label><select className="e2-select" value={novaOp.situacao} onChange={e => setNovaOp(p => ({...p, situacao:e.target.value}))}>{SITUACAO_OP.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div className="e2-field e2-g4"><label className="e2-label">Roteiro Padrão</label><input className="e2-input" value={novaOp.roteiroPadrao} onChange={e => setNovaOp(p => ({...p, roteiroPadrao:e.target.value}))} /></div>
              <div className="e2-field e2-g4"><label className="e2-label">Fórmula</label><input className="e2-input" value={novaOp.formula} onChange={e => setNovaOp(p => ({...p, formula:e.target.value}))} placeholder="Ex: T*1.1" /></div>
              <div className="e2-field e2-g6"><label className="e2-label">Data Início</label><input className="e2-input" type="date" value={novaOp.dataInicio} onChange={e => setNovaOp(p => ({...p, dataInicio:e.target.value}))} /></div>
              <div className="e2-field e2-g6"><label className="e2-label">Data Fim</label><input className="e2-input" type="date" value={novaOp.dataFim} onChange={e => setNovaOp(p => ({...p, dataFim:e.target.value}))} /></div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:20,justifyContent:"flex-end"}}>
              <button className="e2-btn e2-bt-g" onClick={() => setShowOpForm(false)}>Cancelar</button>
              <button className="e2-btn e2-bt-p" onClick={addOperacao}>Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

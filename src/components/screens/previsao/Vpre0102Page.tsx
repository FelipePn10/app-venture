import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BloqueioItem {
  id: number;
  semanaIni: string;
  anoIni: string;
  semanaFin: string;
  anoFin: string;
}

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

let nextId = 1;

function parseSemanaAno(raw: string): { semana: number; ano: number } | null {
  const m = raw.match(/^(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const semana = parseInt(m[1], 10);
  const ano = parseInt(m[2], 10);
  if (semana < 1 || semana > 53) return null;
  return { semana, ano };
}

function formatSemanaAno(semana: string, ano: string): string {
  return `${semana.padStart(2, "0")}/${ano}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Vpre0102Page(): JSX.Element {
  const [semanaIni, setSemanaIni] = useState("");
  const [anoIni, setAnoIni]       = useState("");
  const [semanaFin, setSemanaFin] = useState("");
  const [anoFin, setAnoFin]       = useState("");
  const [bloqueios, setBloqueios] = useState<BloqueioItem[]>([]);
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [feedback, setFeedback]   = useState<FeedbackState>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  function validate(): boolean {
    const e: Record<string, string> = {};
    const ini = parseSemanaAno(`${semanaIni}/${anoIni}`);
    const fin = parseSemanaAno(`${semanaFin}/${anoFin}`);

    if (!semanaIni || !anoIni || !ini) e.ini = "Semana/Ano inicial inválido. Use o formato SS/AAAA.";
    if (!semanaFin || !anoFin || !fin) e.fin = "Semana/Ano final inválido. Use o formato SS/AAAA.";

    if (ini && fin) {
      const vIni = ini.ano * 100 + ini.semana;
      const vFin = fin.ano * 100 + fin.semana;
      if (vFin < vIni) e.fin = "Semana/Ano final deve ser igual ou posterior ao inicial.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleAdicionar() {
    if (!validate()) return;
    const novo: BloqueioItem = {
      id: nextId++,
      semanaIni,
      anoIni,
      semanaFin,
      anoFin,
    };
    setBloqueios((p) => [...p, novo]);
    setSemanaIni(""); setAnoIni(""); setSemanaFin(""); setAnoFin("");
    setErrors({});
    setFeedback({ type: "success", message: `Período ${formatSemanaAno(semanaIni, anoIni)} a ${formatSemanaAno(semanaFin, anoFin)} bloqueado com sucesso.` });
  }

  function handleRemover(id: number) {
    setBloqueios((p) => p.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
    setFeedback({ type: "info", message: "Bloqueio removido." });
  }

  function handleSalvar() {
    if (bloqueios.length === 0) {
      setFeedback({ type: "error", message: "Nenhum período de bloqueio para salvar." });
      return;
    }
    setFeedback({ type: "success", message: `${bloqueios.length} período(s) de bloqueio salvo(s) com sucesso.` });
  }

  function handleNovo() {
    setSemanaIni(""); setAnoIni(""); setSemanaFin(""); setAnoFin("");
    setErrors({});
    setFeedback(null);
    setBloqueios([]);
    setSelectedId(null);
  }

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .pre102-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .pre102-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 110px 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .pre102-topbar-left { display: flex; align-items: center; gap: 10px; }
        .pre102-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .pre102-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .pre102-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .pre102-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }
        .pre102-screen-badge {
          font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
          background: rgba(62,150,84,0.15); color: #7ecb8f;
          border: 1px solid rgba(62,150,84,0.25); border-radius: 5px;
          padding: 3px 8px;
        }

        .pre102-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .pre102-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .pre102-action-group:last-child { border-right: none; }
        .pre102-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .pre102-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .pre102-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .pre102-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .pre102-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .pre102-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .pre102-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; }
        .pre102-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .pre102-btn-new { background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600; }
        .pre102-btn-new:hover:not(:disabled) { background: #dff5e4; }
        .pre102-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .pre102-btn-danger:hover:not(:disabled) { background: #fff0f0; }

        .pre102-body {
          flex: 1; padding: 16px 20px;
          display: flex; flex-direction: column; overflow-y: auto;
        }
        .pre102-body::-webkit-scrollbar { width: 5px; }
        .pre102-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .pre102-section-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 0 8px;
        }
        .pre102-section-banner:first-child { padding-top: 0; }
        .pre102-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .pre102-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .pre102-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .pre102-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .pre102-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .pre102-card-header-left { display: flex; align-items: center; gap: 8px; }
        .pre102-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .pre102-card-body { padding: 18px 18px; }

        .pre102-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .pre102-col-2  { grid-column: span 2; }
        .pre102-col-3  { grid-column: span 3; }
        .pre102-col-4  { grid-column: span 4; }
        .pre102-col-6  { grid-column: span 6; }
        .pre102-col-12 { grid-column: span 12; }

        .pre102-field { display: flex; flex-direction: column; gap: 5px; }
        .pre102-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .pre102-label-req { color: #c84040; font-size: 12px; }
        .pre102-input-group { display: flex; align-items: center; gap: 6px; }
        .pre102-input-sep { font-size: 14px; font-weight: 600; color: #96b8a0; padding: 0 2px; }
        .pre102-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
          text-align: center; letter-spacing: 0.5px;
        }
        .pre102-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .pre102-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .pre102-input.has-error { border-color: #e05252; box-shadow: 0 0 0 2px rgba(224,82,82,0.1); }
        .pre102-input-sm { width: 80px; }
        .pre102-input-md { width: 100px; }

        .pre102-field-error { font-size: 11px; color: #c84040; margin-top: 2px; }
        .pre102-field-hint  { font-size: 11px; color: #7a9c84; margin-top: 2px; }

        .pre102-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; margin-bottom: 14px;
          animation: pre102FadeIn 0.2s ease;
        }
        .pre102-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .pre102-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .pre102-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        .pre102-table-wrap { overflow-x: auto; }
        .pre102-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .pre102-table th {
          background: #f4f9f2; padding: 8px 14px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .pre102-table td { padding: 10px 14px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .pre102-table tbody tr { cursor: pointer; transition: background 0.1s; }
        .pre102-table tbody tr:hover { background: #eef9f0; }
        .pre102-table tbody tr.selected { background: #dff5e4; }
        .pre102-table-empty { text-align: center; padding: 32px 12px; color: #96b8a0; font-size: 12.5px; }

        .pre102-period-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: #eef5ea; border: 1px solid #c4dfc8;
          border-radius: 6px; padding: 4px 10px;
          font-size: 12px; font-weight: 600; color: #1e5028;
        }
        .pre102-arrow { color: #96b8a0; }

        .pre102-remove-btn {
          background: transparent; border: none; cursor: pointer; color: #c89090;
          padding: 3px 6px; border-radius: 5px; font-size: 12px;
          transition: background 0.12s, color 0.12s; font-family: 'Inter', sans-serif;
        }
        .pre102-remove-btn:hover { background: #fdecea; color: #b94040; }

        .pre102-info-note {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 15px; background: #fffbf0;
          border: 1px solid #f0dca0; border-left: 3px solid #e8b800;
          border-radius: 8px; font-size: 12.5px; color: #5a4000; line-height: 1.55;
        }

        .pre102-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .pre102-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .pre102-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes pre102FadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="pre102-root">

        {/* ── TOPBAR ── */}
        <header className="pre102-topbar">
          <div className="pre102-topbar-left">
            <div className="pre102-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5"   width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5"  width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5"  width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="pre102-app-name">
              Venture <span className="pre102-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="pre102-screen-title">VPRE0102 — Cadastro de Bloqueio de Previsão de Vendas</span>
          </div>
          <span className="pre102-screen-badge">PLANEJAMENTO</span>
        </header>

        {/* ── ACTION BAR ── */}
        <div className="pre102-actionbar">
          <div className="pre102-action-group">
            <span className="pre102-action-label">Cadastro</span>
            <button type="button" className="pre102-btn pre102-btn-new" onClick={handleNovo}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Novo
            </button>
            <button type="button" className="pre102-btn pre102-btn-primary" onClick={handleSalvar}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Salvar
            </button>
          </div>
          <div className="pre102-action-group">
            <button type="button" className="pre102-btn pre102-btn-ghost">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M7 4.5v3M7 9.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Ajuda
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="pre102-body">

          {feedback && (
            <div className={`pre102-feedback ${feedback.type}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === "success"
                  ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  : feedback.type === "error"
                  ? <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4" /><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round" /></>
                  : <><circle cx="8" cy="8" r="6" stroke="#4a90d9" strokeWidth="1.4" /><path d="M8 5.5v3M8 10h.01" stroke="#4a90d9" strokeWidth="1.4" strokeLinecap="round" /></>
                }
              </svg>
              {feedback.message}
            </div>
          )}

          {/* ── NOTA INFORMATIVA ── */}
          <div className="pre102-info-note" style={{ marginBottom: 14 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M8 2L1.5 13.5h13L8 2z" stroke="#e8b800" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M8 6v4M8 11.5h.01" stroke="#e8b800" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span>
              Este programa possibilita informar um período em que as previsões de venda devem estar <strong>bloqueadas</strong>,
              impossibilitando que a mesma seja alterada.
            </span>
          </div>

          {/* ── SEÇÃO 1 — ADICIONAR PERÍODO ── */}
          <div className="pre102-section-banner">
            <span className="pre102-section-banner-pill">1 — Informar Período</span>
            <div className="pre102-section-banner-line" />
            <span className="pre102-section-banner-hint">Formato: SS/AAAA (ex: 05/2025)</span>
          </div>

          <div className="pre102-card">
            <div className="pre102-card-header">
              <div className="pre102-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="12" height="12" rx="2" stroke="#3e9654" strokeWidth="1.4" />
                  <path d="M5 8h6M8 5v6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="pre102-card-title">Período de Bloqueio</span>
              </div>
            </div>
            <div className="pre102-card-body">
              <div className="pre102-grid">

                {/* Semana/Ano Inicial */}
                <div className="pre102-field pre102-col-4">
                  <label className="pre102-label">
                    Semana/Ano Inicial <span className="pre102-label-req">*</span>
                  </label>
                  <div className="pre102-input-group">
                    <input
                      className={`pre102-input pre102-input-sm${errors.ini ? " has-error" : ""}`}
                      type="number" min="1" max="53"
                      placeholder="SS"
                      value={semanaIni}
                      onChange={(e) => setSemanaIni(e.target.value)}
                    />
                    <span className="pre102-input-sep">/</span>
                    <input
                      className={`pre102-input pre102-input-md${errors.ini ? " has-error" : ""}`}
                      type="number" min="2000" max="2099"
                      placeholder="AAAA"
                      value={anoIni}
                      onChange={(e) => setAnoIni(e.target.value)}
                    />
                  </div>
                  {errors.ini && <span className="pre102-field-error">⚠ {errors.ini}</span>}
                  <span className="pre102-field-hint">Selecionar a data inicial no formato SS/AAAA do período bloqueado.</span>
                </div>

                {/* Semana/Ano Final */}
                <div className="pre102-field pre102-col-4">
                  <label className="pre102-label">
                    Semana/Ano Final <span className="pre102-label-req">*</span>
                  </label>
                  <div className="pre102-input-group">
                    <input
                      className={`pre102-input pre102-input-sm${errors.fin ? " has-error" : ""}`}
                      type="number" min="1" max="53"
                      placeholder="SS"
                      value={semanaFin}
                      onChange={(e) => setSemanaFin(e.target.value)}
                    />
                    <span className="pre102-input-sep">/</span>
                    <input
                      className={`pre102-input pre102-input-md${errors.fin ? " has-error" : ""}`}
                      type="number" min="2000" max="2099"
                      placeholder="AAAA"
                      value={anoFin}
                      onChange={(e) => setAnoFin(e.target.value)}
                    />
                  </div>
                  {errors.fin && <span className="pre102-field-error">⚠ {errors.fin}</span>}
                  <span className="pre102-field-hint">Selecionar a data final no formato SS/AAAA do período bloqueado.</span>
                </div>

                {/* Botão Adicionar */}
                <div className="pre102-field pre102-col-2" style={{ justifyContent: "flex-end" }}>
                  <label className="pre102-label" style={{ visibility: "hidden" }}>.</label>
                  <button type="button" className="pre102-btn pre102-btn-primary" onClick={handleAdicionar}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── SEÇÃO 2 — LISTA DE BLOQUEIOS ── */}
          <div className="pre102-section-banner">
            <span className="pre102-section-banner-pill">2 — Períodos Bloqueados</span>
            <div className="pre102-section-banner-line" />
            <span className="pre102-section-banner-hint">{bloqueios.length} período(s) cadastrado(s)</span>
          </div>

          <div className="pre102-card">
            <div className="pre102-card-header">
              <div className="pre102-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect x="3" y="1" width="10" height="14" rx="1.5" stroke="#3e9654" strokeWidth="1.4" />
                  <path d="M6 5h4M6 8h4M6 11h2" stroke="#3e9654" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <span className="pre102-card-title">Lista de Bloqueios</span>
              </div>
            </div>
            <div className="pre102-table-wrap">
              <table className="pre102-table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>#</th>
                    <th>Semana/Ano Inicial</th>
                    <th>Semana/Ano Final</th>
                    <th>Período</th>
                    <th style={{ width: 100 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {bloqueios.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="pre102-table-empty">
                        Nenhum período de bloqueio cadastrado. Informe o período acima e clique em Adicionar.
                      </td>
                    </tr>
                  ) : bloqueios.map((b, i) => (
                    <tr
                      key={b.id}
                      className={selectedId === b.id ? "selected" : ""}
                      onClick={() => setSelectedId(b.id)}
                    >
                      <td style={{ color: "#96b8a0", fontSize: 12 }}>{i + 1}</td>
                      <td>
                        <strong style={{ fontVariantNumeric: "tabular-nums" }}>
                          {formatSemanaAno(b.semanaIni, b.anoIni)}
                        </strong>
                      </td>
                      <td>
                        <strong style={{ fontVariantNumeric: "tabular-nums" }}>
                          {formatSemanaAno(b.semanaFin, b.anoFin)}
                        </strong>
                      </td>
                      <td>
                        <span className="pre102-period-badge">
                          {formatSemanaAno(b.semanaIni, b.anoIni)}
                          <span className="pre102-arrow">→</span>
                          {formatSemanaAno(b.semanaFin, b.anoFin)}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button" className="pre102-remove-btn"
                          onClick={(e) => { e.stopPropagation(); handleRemover(b.id); }}
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="pre102-footer">
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div className="pre102-footer-stat">
              Bloqueios: <strong>{bloqueios.length}</strong>
            </div>
          </div>
          <div className="pre102-footer-stat" style={{ color: "#a0b8a8" }}>
            VPRE0102 · Planejamento
          </div>
        </footer>
      </div>
    </>
  );
}

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TabelaApropriacaoItem {
  id: number;
  item: string;
  descricao: string;
  seg: string;
  ter: string;
  qua: string;
  qui: string;
  sex: string;
}

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

let nextId = 1;

const DIAS: Array<{ key: keyof Omit<TabelaApropriacaoItem, "id" | "item" | "descricao">; label: string }> = [
  { key: "seg", label: "Segunda" },
  { key: "ter", label: "Terça" },
  { key: "qua", label: "Quarta" },
  { key: "qui", label: "Quinta" },
  { key: "sex", label: "Sexta" },
];

const FORM_VAZIO: Omit<TabelaApropriacaoItem, "id"> = {
  item: "",
  descricao: "",
  seg: "20",
  ter: "20",
  qua: "20",
  qui: "20",
  sex: "20",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function totalPercentual(row: Omit<TabelaApropriacaoItem, "id" | "item" | "descricao">): number {
  return (
    parseFloat(row.seg || "0") +
    parseFloat(row.ter || "0") +
    parseFloat(row.qua || "0") +
    parseFloat(row.qui || "0") +
    parseFloat(row.sex || "0")
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Vpre0101Page(): JSX.Element {
  const [tabelas, setTabelas]     = useState<TabelaApropriacaoItem[]>([]);
  const [form, setForm]           = useState(FORM_VAZIO);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [feedback, setFeedback]   = useState<FeedbackState>(null);

  function setField(key: keyof typeof FORM_VAZIO, val: string) {
    setForm((p) => ({ ...p, [key]: val }));
    setErrors((p) => ({ ...p, [key]: undefined as unknown as string }));
    setFeedback(null);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.item.trim()) e.item = "Código do item obrigatório.";

    const pcts = DIAS.map((d) => parseFloat(form[d.key] || "0"));
    const invalid = pcts.some((p) => isNaN(p) || p < 0 || p > 100);
    if (invalid) e.pcts = "Os percentuais devem ser valores entre 0 e 100.";

    const total = pcts.reduce((a, b) => a + b, 0);
    if (Math.abs(total - 100) > 0.01) e.pcts = `A soma dos percentuais deve ser 100%. Soma atual: ${total.toFixed(2)}%.`;

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleAdicionar() {
    if (!validate()) return;
    if (editingId !== null) {
      setTabelas((p) => p.map((t) => t.id === editingId ? { ...form, id: editingId } : t));
      setFeedback({ type: "success", message: `Item ${form.item} atualizado.` });
      setEditingId(null);
    } else {
      setTabelas((p) => [...p, { ...form, id: nextId++ }]);
      setFeedback({ type: "success", message: `Item ${form.item} adicionado à tabela de apropriação.` });
    }
    setForm(FORM_VAZIO);
    setErrors({});
  }

  function handleEditar(t: TabelaApropriacaoItem) {
    setForm({ item: t.item, descricao: t.descricao, seg: t.seg, ter: t.ter, qua: t.qua, qui: t.qui, sex: t.sex });
    setEditingId(t.id);
    setFeedback(null);
    setErrors({});
  }

  function handleRemover(id: number) {
    setTabelas((p) => p.filter((t) => t.id !== id));
    if (editingId === id) { setEditingId(null); setForm(FORM_VAZIO); }
    setFeedback({ type: "info", message: "Registro removido." });
  }

  function handleSalvar() {
    if (tabelas.length === 0) {
      setFeedback({ type: "error", message: "Nenhum item na tabela de apropriação para salvar." });
      return;
    }
    setFeedback({ type: "success", message: `Tabela de apropriação com ${tabelas.length} item(ns) salva com sucesso.` });
  }

  function handleNovo() {
    setForm(FORM_VAZIO);
    setEditingId(null);
    setErrors({});
    setFeedback(null);
    setTabelas([]);
  }

  const totalAtual = totalPercentual(form);
  const totalOk = Math.abs(totalAtual - 100) < 0.01;

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .pre101-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .pre101-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 110px 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .pre101-topbar-left { display: flex; align-items: center; gap: 10px; }
        .pre101-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .pre101-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .pre101-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .pre101-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }
        .pre101-screen-badge {
          font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
          background: rgba(62,150,84,0.15); color: #7ecb8f;
          border: 1px solid rgba(62,150,84,0.25); border-radius: 5px;
          padding: 3px 8px;
        }

        .pre101-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .pre101-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .pre101-action-group:last-child { border-right: none; }
        .pre101-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .pre101-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .pre101-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .pre101-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .pre101-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .pre101-btn-ghost:hover:not(:disabled) { background: #f0f8ec; }
        .pre101-btn-new { background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600; }
        .pre101-btn-new:hover:not(:disabled) { background: #dff5e4; }

        .pre101-body {
          flex: 1; padding: 16px 20px;
          display: flex; flex-direction: column; overflow-y: auto;
        }
        .pre101-body::-webkit-scrollbar { width: 5px; }
        .pre101-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .pre101-section-banner {
          display: flex; align-items: center; gap: 10px; padding: 14px 0 8px;
        }
        .pre101-section-banner:first-child { padding-top: 0; }
        .pre101-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .pre101-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .pre101-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .pre101-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .pre101-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .pre101-card-header-left { display: flex; align-items: center; gap: 8px; }
        .pre101-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .pre101-card-body { padding: 18px 18px; }

        .pre101-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .pre101-col-2  { grid-column: span 2; }
        .pre101-col-3  { grid-column: span 3; }
        .pre101-col-4  { grid-column: span 4; }
        .pre101-col-5  { grid-column: span 5; }
        .pre101-col-6  { grid-column: span 6; }
        .pre101-col-12 { grid-column: span 12; }

        .pre101-field { display: flex; flex-direction: column; gap: 5px; }
        .pre101-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .pre101-label-req { color: #c84040; font-size: 12px; }
        .pre101-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .pre101-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .pre101-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .pre101-input.has-error { border-color: #e05252; }
        .pre101-input-pct { text-align: right; }

        .pre101-field-error { font-size: 11px; color: #c84040; margin-top: 2px; }
        .pre101-field-hint  { font-size: 11px; color: #7a9c84; margin-top: 2px; }

        .pre101-pct-row {
          display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap;
        }
        .pre101-pct-field { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 80px; }
        .pre101-pct-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none; text-align: right;
          transition: border-color 0.13s;
        }
        .pre101-pct-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .pre101-pct-wrap { position: relative; }
        .pre101-pct-wrap::after {
          content: '%'; position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          font-size: 11px; color: #7a9c84; pointer-events: none;
        }

        .pre101-total-badge {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px;
        }
        .pre101-total-ok  { background: #e8f5e0; color: #1e5818; border: 1px solid #a8d898; }
        .pre101-total-err { background: #fff0f0; color: #a01818; border: 1px solid #f0a8a8; }

        .pre101-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; margin-bottom: 14px;
          animation: pre101FadeIn 0.2s ease;
        }
        .pre101-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .pre101-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .pre101-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        .pre101-table-wrap { overflow-x: auto; }
        .pre101-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .pre101-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .pre101-table th.num { text-align: right; }
        .pre101-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .pre101-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
        .pre101-table tbody tr:hover { background: #eef9f0; cursor: pointer; }
        .pre101-table-empty { text-align: center; padding: 32px 12px; color: #96b8a0; font-size: 12.5px; }

        .pre101-total-cell {
          font-weight: 700; font-size: 12px;
        }
        .pre101-total-ok-cell  { color: #2a6018; }
        .pre101-total-err-cell { color: #a01818; }

        .pre101-act-btn {
          background: none; border: 1px solid #d4e8cc; border-radius: 6px;
          cursor: pointer; padding: 3px 8px; font-size: 11px; color: #4a7060;
          font-family: 'Inter', sans-serif; transition: background 0.12s;
          margin-right: 4px;
        }
        .pre101-act-btn:hover { background: #eef9f0; }
        .pre101-act-btn.danger { color: #b94040; border-color: #f0c8c8; }
        .pre101-act-btn.danger:hover { background: #fdecea; }

        .pre101-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .pre101-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .pre101-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes pre101FadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="pre101-root">

        {/* ── TOPBAR ── */}
        <header className="pre101-topbar">
          <div className="pre101-topbar-left">
            <div className="pre101-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5"   width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5"  width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5"  width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="pre101-app-name">
              Venture <span className="pre101-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="pre101-screen-title">VPRE0101 — Manutenção da Tabela de Apropriação</span>
          </div>
          <span className="pre101-screen-badge">PLANEJAMENTO</span>
        </header>

        {/* ── ACTION BAR ── */}
        <div className="pre101-actionbar">
          <div className="pre101-action-group">
            <span className="pre101-action-label">Cadastro</span>
            <button type="button" className="pre101-btn pre101-btn-new" onClick={handleNovo}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Novo
            </button>
            <button type="button" className="pre101-btn pre101-btn-primary" onClick={handleSalvar}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Salvar
            </button>
          </div>
          <div className="pre101-action-group">
            <button type="button" className="pre101-btn pre101-btn-ghost">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M7 4.5v3M7 9.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Ajuda
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="pre101-body">

          {feedback && (
            <div className={`pre101-feedback ${feedback.type}`}>
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

          {/* ── SEÇÃO 1 — DADOS DO ITEM ── */}
          <div className="pre101-section-banner">
            <span className="pre101-section-banner-pill">{editingId !== null ? "Editando" : "1 — Novo Registro"}</span>
            <div className="pre101-section-banner-line" />
            <span className="pre101-section-banner-hint">
              Percentual de acomodação por dia da semana — soma deve ser 100%
            </span>
          </div>

          <div className="pre101-card">
            <div className="pre101-card-header">
              <div className="pre101-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2h12v12H2z" stroke="#3e9654" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M2 6h12M6 6v8" stroke="#3e9654" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <span className="pre101-card-title">Dados da Apropriação</span>
              </div>
              <span className={`pre101-total-badge ${totalOk ? "pre101-total-ok" : "pre101-total-err"}`}>
                Total: {totalAtual.toFixed(2)}%
              </span>
            </div>
            <div className="pre101-card-body">

              <div className="pre101-grid" style={{ marginBottom: 18 }}>
                <div className="pre101-field pre101-col-2">
                  <label className="pre101-label">Item <span className="pre101-label-req">*</span></label>
                  <input
                    className={`pre101-input${errors.item ? " has-error" : ""}`}
                    type="text" placeholder="Código..."
                    value={form.item}
                    onChange={(e) => setField("item", e.target.value)}
                  />
                  {errors.item && <span className="pre101-field-error">⚠ {errors.item}</span>}
                </div>
                <div className="pre101-field pre101-col-6">
                  <label className="pre101-label">Descrição</label>
                  <input
                    className="pre101-input"
                    type="text" placeholder="Descrição do item..."
                    value={form.descricao}
                    onChange={(e) => setField("descricao", e.target.value)}
                  />
                </div>
              </div>

              {/* Percentuais por dia */}
              <div className="pre101-pct-row">
                {DIAS.map((d) => (
                  <div key={d.key} className="pre101-pct-field">
                    <label className="pre101-label">{d.label}</label>
                    <div className="pre101-pct-wrap">
                      <input
                        className={`pre101-pct-input${errors.pcts ? " has-error" : ""}`}
                        type="number" min="0" max="100" step="0.01"
                        value={form[d.key]}
                        onChange={(e) => setField(d.key, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", flexDirection: "column", gap: 5, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="pre101-btn pre101-btn-primary"
                    onClick={handleAdicionar}
                  >
                    {editingId !== null ? "Atualizar" : "Adicionar"}
                  </button>
                </div>
              </div>

              {errors.pcts && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: "#fff0f0", border: "1px solid #f0c0c0", borderLeft: "3px solid #e05252", borderRadius: 7, fontSize: 12, color: "#b01818" }}>
                  ⚠ {errors.pcts}
                </div>
              )}

              <div style={{ marginTop: 12, fontSize: 11.5, color: "#7a9c84", lineHeight: 1.5 }}>
                A tabela de apropriação é utilizada para distribuir as necessidades de produção geradas a partir da previsão de vendas,
                determinando o percentual de acomodação dos itens nos dias da semana conforme quantidade total prevista.
              </div>
            </div>
          </div>

          {/* ── SEÇÃO 2 — TABELA ── */}
          <div className="pre101-section-banner">
            <span className="pre101-section-banner-pill">2 — Tabela de Apropriação</span>
            <div className="pre101-section-banner-line" />
            <span className="pre101-section-banner-hint">{tabelas.length} registro(s)</span>
          </div>

          <div className="pre101-card">
            <div className="pre101-card-header">
              <div className="pre101-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M2 8h12M2 12h8" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="pre101-card-title">Registros</span>
              </div>
            </div>
            <div className="pre101-table-wrap">
              <table className="pre101-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Descrição</th>
                    {DIAS.map((d) => (
                      <th key={d.key} className="num">{d.label}</th>
                    ))}
                    <th className="num">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tabelas.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="pre101-table-empty">
                        Nenhum item cadastrado. Preencha o formulário acima e clique em Adicionar.
                      </td>
                    </tr>
                  ) : tabelas.map((t) => {
                    const tot = totalPercentual(t);
                    const ok = Math.abs(tot - 100) < 0.01;
                    return (
                      <tr key={t.id} onClick={() => handleEditar(t)}>
                        <td><code style={{ background: "#edf5ea", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>{t.item}</code></td>
                        <td style={{ color: "#5a7870" }}>{t.descricao || "—"}</td>
                        {DIAS.map((d) => (
                          <td key={d.key} className="num">{parseFloat(t[d.key]).toFixed(2)}%</td>
                        ))}
                        <td className={`num pre101-total-cell ${ok ? "pre101-total-ok-cell" : "pre101-total-err-cell"}`}>
                          {tot.toFixed(2)}%
                        </td>
                        <td>
                          <button
                            type="button" className="pre101-act-btn danger"
                            onClick={(e) => { e.stopPropagation(); handleRemover(t.id); }}
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="pre101-footer">
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div className="pre101-footer-stat">
              Registros: <strong>{tabelas.length}</strong>
            </div>
            <div className="pre101-footer-stat">
              Item atual: <strong>{form.item || "—"}</strong>
            </div>
          </div>
          <div className="pre101-footer-stat" style={{ color: "#a0b8a8" }}>
            VPRE0101 · Planejamento
          </div>
        </footer>
      </div>
    </>
  );
}

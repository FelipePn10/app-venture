import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FreteForm {
  cliente: string;
  clienteNome: string;
  estabelecimento: string;
  estabNome: string;
  valorInicial: number;
  valorFinal: number;
  percentualFrete: number;
}

interface FreteRow extends FreteForm {
  id: number;
}

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

const formInicial: FreteForm = {
  cliente: "", clienteNome: "", estabelecimento: "", estabNome: "",
  valorInicial: 0, valorFinal: 0, percentualFrete: 0,
};

const MOCK_FRETES: FreteRow[] = [
  { id:1, cliente:"001", clienteNome:"SOHOME LTDA", estabelecimento:"01", estabNome:"Matriz SP", valorInicial:0, valorFinal:5000, percentualFrete:5.0 },
  { id:2, cliente:"001", clienteNome:"SOHOME LTDA", estabelecimento:"01", estabNome:"Matriz SP", valorInicial:5000.01, valorFinal:20000, percentualFrete:3.5 },
  { id:3, cliente:"002", clienteNome:"ALFA S.A.", estabelecimento:"", estabNome:"Todos", valorInicial:0, valorFinal:10000, percentualFrete:4.0 },
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

export function Vcli0202Page(): JSX.Element {
  const [form, setForm] = useState<FreteForm>(formInicial);
  const [rows, setRows] = useState<FreteRow[]>(MOCK_FRETES);
  const [errors, setErrors] = useState<Partial<Record<keyof FreteForm, string>>>({});
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const setField = useCallback(<K extends keyof FreteForm>(key: K, value: FreteForm[K]) => {
    setForm(p => ({ ...p, [key]: value }));
    setErrors(p => ({ ...p, [key]: undefined }));
    setFeedback(null);
  }, []);

  function validate(): boolean {
    const e: Partial<Record<keyof FreteForm, string>> = {};
    if (!form.cliente.trim()) e.cliente = "Campo obrigatório.";
    if (form.valorInicial < 0) e.valorInicial = "Valor inválido.";
    if (form.valorFinal <= form.valorInicial) e.valorFinal = "Deve ser maior que valor inicial.";
    if (form.percentualFrete <= 0) e.percentualFrete = "Deve ser maior que 0.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSalvar() {
    if (!validate()) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      await new Promise(r => setTimeout(r, 500));
      if (editingId !== null) {
        setRows(p => p.map(r => r.id === editingId ? { ...form, id: editingId } : r));
        setFeedback({ type: "success", message: "Registro atualizado com sucesso." });
      } else {
        const newRow: FreteRow = { ...form, id: Date.now() };
        setRows(p => [...p, newRow]);
        setFeedback({ type: "success", message: "Registro cadastrado com sucesso." });
      }
      handleNovo();
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Falha ao salvar.") });
    } finally { setIsSaving(false); }
  }

  function handleNovo() { setForm(formInicial); setEditingId(null); setErrors({}); setFeedback(null); }

  function handleEdit(row: FreteRow) {
    setForm({ cliente: row.cliente, clienteNome: row.clienteNome, estabelecimento: row.estabelecimento, estabNome: row.estabNome, valorInicial: row.valorInicial, valorFinal: row.valorFinal, percentualFrete: row.percentualFrete });
    setEditingId(row.id);
    setErrors({});
    setFeedback(null);
  }

  function handleExcluir(id: number) {
    setRows(p => p.filter(r => r.id !== id));
    setFeedback({ type: "success", message: "Registro excluído." });
    if (editingId === id) handleNovo();
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .cl-r{min-height:100vh;background:#f0f4ee;font-family:'Inter',sans-serif;color:#1a2e22;display:flex;flex-direction:column}

        .cl-tb{height:52px;background:#162e20;display:flex;align-items:center;justify-content:space-between;padding:0 20px;flex-shrink:0;border-bottom:1px solid rgba(62,150,84,0.15)}
        .cl-tbl{display:flex;align-items:center;gap:10px}
        .cl-lg{width:28px;height:28px;background:#3e9654;border-radius:6px;display:flex;align-items:center;justify-content:center}
        .cl-an{font-size:13px;font-weight:600;color:#e0f0e3;line-height:1.1}
        .cl-asb{display:block;font-size:9px;font-weight:400;color:#3d6b4d}
        .cl-st{font-size:12.5px;font-weight:500;color:#5a9a6a;padding-left:14px;margin-left:14px;border-left:1px solid rgba(255,255,255,0.08)}

        .cl-ab{background:#fff;border-bottom:1px solid #dbe8d5;padding:0 20px;display:flex;align-items:center;gap:4px;height:46px;flex-shrink:0}
        .cl-ag{display:flex;align-items:center;gap:4px;padding-right:12px;margin-right:8px;border-right:1px solid #e8f0e4}
        .cl-ag:last-child{border-right:none}
        .cl-al{font-size:9.5px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#96b8a0;margin-right:4px;white-space:nowrap}
        .cl-bt{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border:1.5px solid transparent;border-radius:7px;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background 0.13s,border-color 0.13s,color 0.13s}
        .cl-bt-p{background:#162e20;color:#dff0e2;border-color:#162e20}
        .cl-bt-p:hover:not(:disabled){background:#1e3a2a}
        .cl-bt-p:disabled{opacity:0.5;cursor:not-allowed}
        .cl-bt-g{background:transparent;color:#4a7060;border-color:#d4e8d0}
        .cl-bt-g:hover:not(:disabled){background:#f0f8ec;border-color:#b0d4b8;color:#1a3828}
        .cl-bt-g:disabled{opacity:0.5;cursor:not-allowed}
        .cl-bt-d{background:transparent;color:#b94040;border-color:#f0c8c8}
        .cl-bt-d:hover:not(:disabled){background:#fff0f0;border-color:#e09090}
        .cl-bt-s{height:28px;padding:0 9px;font-size:12px}
        .cl-bt-n{background:#eef9f0;color:#1a6030;border-color:#b4d8b8;font-weight:600}
        .cl-bt-n:hover:not(:disabled){background:#dff5e4;border-color:#88c898}

        .cl-by{flex:1;padding:16px 20px;display:flex;flex-direction:column;gap:0;overflow-y:auto}
        .cl-by::-webkit-scrollbar{width:5px}
        .cl-by::-webkit-scrollbar-thumb{background:#cce0c8;border-radius:4px}

        .cl-sb{display:flex;align-items:center;gap:10px;padding:14px 0 8px}
        .cl-sb:first-child{padding-top:0}
        .cl-sb-p{font-size:9.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#5a8068;background:#e0ede0;border:1px solid #c8dcc8;border-radius:20px;padding:3px 10px;white-space:nowrap}
        .cl-sb-l{flex:1;height:1px;background:#dbe8d5}
        .cl-sb-h{font-size:11px;color:#96b8a0;white-space:nowrap}

        .cl-c{background:#fff;border:1px solid #dbe8d5;border-radius:12px;overflow:hidden;margin-bottom:14px}
        .cl-ch{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid #edf5e8;background:#fafcf9}
        .cl-chl{display:flex;align-items:center;gap:8px}
        .cl-ct{font-size:12px;font-weight:600;color:#2a4a35;text-transform:uppercase;letter-spacing:0.6px}
        .cl-cbg{font-size:10.5px;font-weight:500;color:#3e9654;background:#eef5ea;border:1px solid #c4dfc8;border-radius:12px;padding:2px 8px}
        .cl-cb{padding:18px 18px}

        .cl-g{display:grid;grid-template-columns:repeat(12,1fr);gap:16px 14px;align-items:start}
        .cl-g2{grid-column:span 2}
        .cl-g3{grid-column:span 3}
        .cl-g4{grid-column:span 4}
        .cl-g5{grid-column:span 5}
        .cl-g6{grid-column:span 6}
        .cl-g7{grid-column:span 7}
        .cl-g8{grid-column:span 8}
        .cl-g10{grid-column:span 10}
        .cl-g12{grid-column:span 12}

        .cl-f{display:flex;flex-direction:column;gap:5px}
        .cl-l{font-size:10.5px;font-weight:600;color:#5a8068;text-transform:uppercase;letter-spacing:0.4px;display:flex;align-items:center;gap:4px}
        .cl-lr{color:#c84040;font-size:12px;line-height:1}
        .cl-in{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;transition:border-color 0.13s,box-shadow 0.13s}
        .cl-in:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .cl-in::placeholder{color:#b0c8b8;font-size:12px}
        .cl-in:disabled{background:#f0f4ee;color:#8aaa94;cursor:not-allowed;border-color:#e0ead8}
        .cl-in.has-e{border-color:#e05252;box-shadow:0 0 0 2px rgba(224,82,82,0.1)}
        .cl-se{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 28px 0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;transition:border-color 0.13s}
        .cl-se:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .cl-fe{font-size:11px;color:#c84040;margin-top:2px;display:flex;align-items:center;gap:4px}
        .cl-fh{font-size:11px;color:#7a9c84;margin-top:2px;line-height:1.45}

        .cl-rw{border-top:1px solid #edf5e8;overflow-x:auto}
        .cl-rb{display:flex;align-items:center;justify-content:space-between;padding:10px 18px;background:#f4f9f2;border-bottom:1px solid #e8f0e4}
        .cl-rbl{display:flex;align-items:center;gap:8px}
        .cl-rbl-l{font-size:11px;font-weight:600;color:#4a7060;text-transform:uppercase;letter-spacing:0.5px}
        .cl-rt{width:100%;border-collapse:collapse;font-size:13px}
        .cl-rt th{background:#f4f9f2;padding:8px 12px;text-align:left;font-size:10.5px;font-weight:700;color:#5a8068;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1.5px solid #dbe8d5;white-space:nowrap}
        .cl-rt td{padding:9px 12px;border-bottom:1px solid #f0f6ec;color:#243830;vertical-align:middle}
        .cl-rt tbody tr{transition:background 0.1s}
        .cl-rt tbody tr:hover{background:#f4fbf2}
        .cl-rem{text-align:center;padding:28px 12px;color:#96b8a0;font-size:12.5px}

        .cl-fb{display:flex;align-items:center;gap:9px;padding:11px 15px;border-radius:9px;font-size:13px;animation:clFdIn 0.2s ease;margin-bottom:14px}
        .cl-fb.s{background:#f0faf2;border:1px solid #b4dec0;color:#1e6030}
        .cl-fb.e{background:#fff5f5;border:1px solid #f8c0c0;border-left:3px solid #e05252;color:#b91c1c}
        .cl-fb.i{background:#f0f8ff;border:1px solid #c7def8;border-left:3px solid #4a90d9;color:#1a4070}

        .cl-ft{background:#fff;border-top:1px solid #dbe8d5;padding:8px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .cl-ftl{display:flex;align-items:center;gap:20px}
        .cl-fts{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#6a8a74}
        .cl-fts strong{color:#1a2e22;font-weight:600}

        .cl-mn{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:#e8f5e0;color:#1e5818;border:1px solid #a8d898}
        .cl-me{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:#fff8e0;color:#7a5200;border:1px solid #e0c860}
        .cl-md{width:6px;height:6px;border-radius:50%;flex-shrink:0}
        .cl-mn .cl-md{background:#3e9654}
        .cl-me .cl-md{background:#c8a020}

        .cl-rm{background:transparent;border:none;cursor:pointer;color:#c89090;padding:3px 6px;border-radius:5px;font-size:12px;font-family:'Inter',sans-serif;transition:background 0.12s,color 0.12s}
        .cl-rm:hover{background:#fdecea;color:#b94040}
        .cl-eb{background:transparent;border:none;cursor:pointer;color:#4a7060;padding:3px 6px;border-radius:5px;font-size:12px;font-family:'Inter',sans-serif;transition:background 0.12s,color 0.12s}
        .cl-eb:hover{background:#eef5ea;color:#2a6a3a}

        @keyframes clSpin{to{transform:rotate(360deg)}}
        .cl-sp{width:14px;height:14px;flex-shrink:0;border:2px solid rgba(223,240,226,0.3);border-top-color:#dff0e2;border-radius:50%;animation:clSpin 0.65s linear infinite}
        .cl-spd{width:14px;height:14px;flex-shrink:0;border:2px solid #d4e8cc;border-top-color:#3e9654;border-radius:50%;animation:clSpin 0.65s linear infinite}
        @keyframes clFdIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className="cl-r">
        <header className="cl-tb">
          <div className="cl-tbl">
            <div className="cl-lg">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="cl-an">Venture<span className="cl-asb">ERP &amp; Soluções</span></span>
            <span className="cl-st">VCLI0202 — Cadastro de Percentuais de Frete</span>
          </div>
        </header>

        <div className="cl-ab">
          <div className="cl-ag">
            <span className="cl-al">Cadastro</span>
            <button className="cl-bt cl-bt-n" onClick={handleNovo} disabled={isSaving}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              Novo
            </button>
          </div>
          <div className="cl-ag">
            <span className="cl-al">Ações</span>
            <button className="cl-bt cl-bt-p" onClick={() => void handleSalvar()} disabled={isSaving}>
              {isSaving ? <><div className="cl-sp" />Salvando...</> : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>Salvar</>}
            </button>
            {editingId && (
              <button className="cl-bt cl-bt-g" onClick={handleNovo} disabled={isSaving}>Cancelar Edição</button>
            )}
          </div>
          <div className="cl-ag">
            <button className="cl-bt cl-bt-g">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>Ajuda
            </button>
          </div>
        </div>

        <div className="cl-by">
          {feedback && (
            <div className={`cl-fb ${feedback.type === "success" ? "s" : feedback.type === "error" ? "e" : "i"}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === "success"
                  ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  : feedback.type === "error"
                    ? <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4"/><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round"/></>
                    : <><circle cx="8" cy="8" r="6" stroke="#4a90d9" strokeWidth="1.4"/><path d="M8 7v4M8 5.5h.01" stroke="#4a90d9" strokeWidth="1.4" strokeLinecap="round"/></>
                }
              </svg>
              {feedback.message}
            </div>
          )}

          <div className="cl-sb">
            <span className="cl-sb-p">1 — Cadastrar</span>
            <div className="cl-sb-l" />
            <span className="cl-sb-h">{editingId ? `Editando registro #${editingId}` : "Preencha os campos e clique em Salvar"}</span>
          </div>

          <div className="cl-c">
            <div className="cl-ch">
              <div className="cl-chl">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round"/><path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round"/></svg>
                <span className="cl-ct">Percentual de Frete</span>
              </div>
              {editingId !== null
                ? <span className="cl-me"><span className="cl-md" />Editando #{editingId}</span>
                : <span className="cl-mn"><span className="cl-md" />Novo Registro</span>
              }
            </div>
            <div className="cl-cb">
              <div className="cl-g">
                <div className="cl-f cl-g3">
                  <label className="cl-l">Cliente <span className="cl-lr">*</span></label>
                  <input className={`cl-in${errors.cliente ? " has-e" : ""}`} value={form.cliente} onChange={e => setField("cliente", e.target.value)} placeholder="Código do cliente"/>
                  {errors.cliente && <span className="cl-fe"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2"/><path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round"/></svg>{errors.cliente}</span>}
                </div>
                <div className="cl-f cl-g4">
                  <label className="cl-l">Nome Cliente</label>
                  <input className="cl-in" value={form.clienteNome} onChange={e => setField("clienteNome", e.target.value)} placeholder="Automático" disabled/>
                </div>
                <div className="cl-f cl-g2">
                  <label className="cl-l">Estabelecimento</label>
                  <input className="cl-in" value={form.estabelecimento} onChange={e => setField("estabelecimento", e.target.value)} placeholder="Todos se vazio"/>
                </div>
                <div className="cl-f cl-g3">
                  <label className="cl-l">Nome Estab.</label>
                  <input className="cl-in" value={form.estabNome} onChange={e => setField("estabNome", e.target.value)} placeholder="Automático" disabled/>
                </div>

                <div className="cl-f cl-g2">
                  <label className="cl-l">Valor Inicial (R$)</label>
                  <input type="number" step="0.01" className={`cl-in${errors.valorInicial ? " has-e" : ""}`} value={form.valorInicial} onChange={e => setField("valorInicial", Number(e.target.value))}/>
                  {errors.valorInicial && <span className="cl-fe"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2"/><path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round"/></svg>{errors.valorInicial}</span>}
                </div>
                <div className="cl-f cl-g2">
                  <label className="cl-l">Valor Final (R$)</label>
                  <input type="number" step="0.01" className={`cl-in${errors.valorFinal ? " has-e" : ""}`} value={form.valorFinal} onChange={e => setField("valorFinal", Number(e.target.value))}/>
                  {errors.valorFinal && <span className="cl-fe"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2"/><path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round"/></svg>{errors.valorFinal}</span>}
                </div>
                <div className="cl-f cl-g2">
                  <label className="cl-l">% Frete <span className="cl-lr">*</span></label>
                  <input type="number" step="0.01" className={`cl-in${errors.percentualFrete ? " has-e" : ""}`} value={form.percentualFrete} onChange={e => setField("percentualFrete", Number(e.target.value))}/>
                  {errors.percentualFrete && <span className="cl-fe"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2"/><path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round"/></svg>{errors.percentualFrete}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="cl-sb">
            <span className="cl-sb-p">2 — Cadastrados</span>
            <div className="cl-sb-l" />
            <span className="cl-sb-h">{rows.length} percentual(is) cadastrado(s)</span>
          </div>

          <div className="cl-c">
            <div className="cl-ch">
              <div className="cl-chl">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round"/></svg>
                <span className="cl-ct">Percentuais Cadastrados</span>
              </div>
              <span className="cl-cbg">{rows.length} registro(s)</span>
            </div>
            <div className="cl-rw">
              {rows.length === 0 ? (
                <div className="cl-rem">Nenhum percentual cadastrado.</div>
              ) : (
                <table className="cl-rt">
                  <thead>
                    <tr>
                      <th style={{width:90}}>Cliente</th><th>Nome</th><th style={{width:120}}>Estabelecimento</th>
                      <th style={{width:120}}>Valor Inicial</th><th style={{width:120}}>Valor Final</th>
                      <th style={{width:100}}>% Frete</th><th style={{width:120}}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.id}>
                        <td style={{fontWeight:600,color:"#1a4a2a"}}>{r.cliente}</td><td>{r.clienteNome}</td>
                        <td style={{color:r.estabelecimento?"#243830":"#96b8a0"}}>{r.estabelecimento || "Todos"}</td>
                        <td>R$ {r.valorInicial.toFixed(2)}</td><td>R$ {r.valorFinal.toFixed(2)}</td>
                        <td style={{fontWeight:600,color:"#2a6a3a"}}>{r.percentualFrete.toFixed(2)}%</td>
                        <td>
                          <button className="cl-eb" onClick={() => handleEdit(r)}>
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M1.5 8v2.5H4l7-7L8.5 1l-7 7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg> Editar
                          </button>
                          <button className="cl-rm" onClick={() => handleExcluir(r.id)}>
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M5 3V2h2v1M3 3v7a1 1 0 001 1h4a1 1 0 001-1V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg> Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <footer className="cl-ft">
          <div className="cl-ftl">
            <div className="cl-fts">Cliente: <strong>{form.cliente || "—"}</strong></div>
            <div className="cl-fts">Percentuais: <strong>{rows.length}</strong></div>
            <div className="cl-fts">Módulo: <strong>Cliente</strong></div>
          </div>
          <div className="cl-fts" style={{gap:8}}>
            {editingId !== null
              ? <span className="cl-me" style={{fontSize:11}}><span className="cl-md" />Editando #{editingId}</span>
              : <span className="cl-mn" style={{fontSize:11}}><span className="cl-md" />Novo Registro</span>
            }
            <span style={{color:"#b0c8b8",fontSize:11}}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>
      </div>
    </>
  );
}

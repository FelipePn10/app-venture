import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PedidoCompraForm {
  pedido: string;
  tipo: string;
  nroTalao: string;
  alcada: string;
  fornecedor: string;
  fornecedorNome: string;
  emissao: string;
  status: string;
  tabPrecos: string;
  moeda: string;
  dataMoeda: string;
  tipoNF: string;
  tipoSolc: string;
  ctaFin: string;
  tpFrete: string;
  tpValor: string;
  vlrFrete: number;
  transp: string;
  pagamento: string;
  dataBase: string;
  dataVcto: string;
  subsequente: boolean;
  tipoVcto: string;
  tipoPgto: string;
}

interface ItemCompra {
  seq: number;
  item: string;
  descricao: string;
  quantidade: number;
  valorUnit: number;
  valorTotal: number;
  um: string;
}

type AbaAtiva = "dados" | "transporte" | "vencimento" | "itens";
type FeedbackState = { type: "success" | "error"; message: string } | null;

const FRETE_OPTIONS = ["CIF", "FOB", "Sem Frete"];
const TIPO_VCTO = ["Fixo", "Posterga", "Antecipa", "Útil"];
const TIPO_PGTO = ["Mensal", "Semanal"];

const formInicial: PedidoCompraForm = {
  pedido:"", tipo:"OCL", nroTalao:"", alcada:"I", fornecedor:"", fornecedorNome:"",
  emissao:new Date().toISOString().slice(0,10), status:"Pendente", tabPrecos:"", moeda:"",
  dataMoeda:"", tipoNF:"", tipoSolc:"", ctaFin:"", tpFrete:"", tpValor:"Percentual",
  vlrFrete:0, transp:"", pagamento:"", dataBase:"", dataVcto:"Emissão", subsequente:false,
  tipoVcto:"Fixo", tipoPgto:"Mensal",
};

const MOCK_ITENS: ItemCompra[] = [
  { seq:1, item:"MP001", descricao:"Matéria-Prima A", quantidade:1000, valorUnit:5.50, valorTotal:5500.00, um:"KG" },
  { seq:2, item:"MP002", descricao:"Matéria-Prima B", quantidade:500, valorUnit:12.00, valorTotal:6000.00, um:"UN" },
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

export function Vpdc0200Page(): JSX.Element {
  const [form, setForm] = useState<PedidoCompraForm>(formInicial);
  const [itens, setItens] = useState<ItemCompra[]>(MOCK_ITENS);
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("dados");
  const [errors, setErrors] = useState<Partial<Record<keyof PedidoCompraForm, string>>>({});
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [novoItem, setNovoItem] = useState<ItemCompra>({ seq:0, item:"", descricao:"", quantidade:1, valorUnit:0, valorTotal:0, um:"UN" });

  const setField = useCallback(<K extends keyof PedidoCompraForm>(key: K, value: PedidoCompraForm[K]) => {
    setForm(p => ({ ...p, [key]: value }));
    setErrors(p => ({ ...p, [key]: undefined }));
    setFeedback(null);
  }, []);

  function validate(): boolean {
    const e: Partial<Record<keyof PedidoCompraForm, string>> = {};
    if (!form.fornecedor.trim()) e.fornecedor = "Fornecedor obrigatório.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSalvar() {
    if (!validate()) return;
    setIsSaving(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      setFeedback({ type: "success", message: "Pedido de compra salvo com sucesso." });
      if (!form.pedido) setField("pedido", String(Math.floor(Math.random() * 90000) + 10000));
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Falha ao salvar pedido.") });
    } finally { setIsSaving(false); }
  }

  function handleNovo() { setForm(formInicial); setItens([]); setErrors({}); setFeedback(null); }

  function addItem() {
    const item: ItemCompra = { ...novoItem, seq: itens.length + 1, valorTotal: novoItem.quantidade * novoItem.valorUnit };
    setItens(p => [...p, item]);
    setNovoItem({ seq:0, item:"", descricao:"", quantidade:1, valorUnit:0, valorTotal:0, um:"UN" });
    setShowItemForm(false);
  }

  function removeItem(seq: number) { setItens(p => p.filter(i => i.seq !== seq)); }

  const totalBruto = itens.reduce((s,i) => s + i.valorTotal, 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .sp-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .sp-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
        }
        .sp-topbar-left { display: flex; align-items: center; gap: 10px; }
        .sp-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .sp-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .sp-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .sp-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .sp-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .sp-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .sp-action-group:last-child { border-right: none; }
        .sp-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .sp-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .sp-bt-p { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .sp-bt-p:hover:not(:disabled) { background: #1e3a2a; }
        .sp-bt-p:disabled { opacity: 0.5; cursor: not-allowed; }
        .sp-bt-g { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .sp-bt-g:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .sp-bt-g:disabled { opacity: 0.5; cursor: not-allowed; }
        .sp-bt-d { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .sp-bt-d:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .sp-bt-n {
          background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600;
        }
        .sp-bt-n:hover:not(:disabled) { background: #dff5e4; border-color: #88c898; }
        .sp-bt-sm { height: 28px; padding: 0 9px; font-size: 12px; }

        .sp-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .sp-body::-webkit-scrollbar { width: 5px; }
        .sp-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .sp-section-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 0 8px;
        }
        .sp-section-banner:first-child { padding-top: 0; }
        .sp-section-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .sp-section-line { flex: 1; height: 1px; background: #dbe8d5; }
        .sp-section-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .sp-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .sp-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .sp-card-header-left { display: flex; align-items: center; gap: 8px; }
        .sp-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .sp-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .sp-card-body { padding: 18px 18px; }

        .sp-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .sp-g2  { grid-column: span 2; }
        .sp-g3  { grid-column: span 3; }
        .sp-g4  { grid-column: span 4; }
        .sp-g6  { grid-column: span 6; }
        .sp-g12 { grid-column: span 12; }

        .sp-field { display: flex; flex-direction: column; gap: 5px; }
        .sp-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .sp-label-req { color: #c84040; font-size: 12px; line-height: 1; }
        .sp-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .sp-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .sp-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .sp-input:disabled { background: #f0f4ee; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }
        .sp-input[type="date"] { cursor: pointer; }
        .sp-input.has-error { border-color: #e05252; box-shadow: 0 0 0 2px rgba(224,82,82,0.1); }

        .sp-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .sp-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }

        .sp-chk-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #3a5a45; padding-top: 2px; }
        .sp-chk { width: 15px; height: 15px; accent-color: #3e9654; cursor: pointer; }

        .sp-field-error { font-size: 11px; color: #c84040; margin-top: 2px; display: flex; align-items: center; gap: 4px; }

        .sp-section-sep { height: 1px; background: #edf5e8; margin: 20px 0; }
        .sp-section-label {
          font-size: 10px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: #a0b8a8; margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px;
        }
        .sp-section-label::after { content: ''; flex: 1; height: 1px; background: #e8f0e4; }

        .sp-tabs {
          display: flex; align-items: flex-end; gap: 0;
          border-bottom: 2px solid #dbe8d5; background: #fafcf9;
        }
        .sp-tab {
          padding: 10px 20px; font-size: 12.5px; font-weight: 500;
          color: #6a8a74; cursor: pointer; border: none; background: transparent;
          border-bottom: 2px solid transparent; margin-bottom: -2px;
          transition: color 0.13s, border-color 0.13s; white-space: nowrap;
          font-family: 'Inter', sans-serif;
        }
        .sp-tab:hover { color: #2a4a35; }
        .sp-tab-active { color: #162e20; border-bottom-color: #3e9654; font-weight: 600; }
        .sp-tab-body { padding: 20px 18px; }

        .sp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .sp-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .sp-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .sp-table tbody tr:hover { background: #eef9f0; }

        .sp-totals {
          display: flex; gap: 24px; flex-wrap: wrap;
          padding: 14px 18px; background: #f4f9f2; border-top: 1px solid #dbe8d5;
        }
        .sp-total-item { display: flex; flex-direction: column; gap: 2px; }
        .sp-total-item span:first-child { font-size: 10.5px; color: #8aaa94; text-transform: uppercase; letter-spacing: 0.4px; }
        .sp-total-item span:last-child { font-size: 16px; font-weight: 700; color: #1a4a2a; }

        .sp-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: spFadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .sp-fb-success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .sp-fb-error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }

        .sp-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.35);
          z-index: 100; display: flex; justify-content: center; align-items: center;
        }
        .sp-modal {
          background: #fff; border-radius: 12px; width: 520px; max-width: 95vw;
          max-height: 85vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          border: 1px solid #dbe8d5;
        }
        .sp-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
          position: sticky; top: 0; z-index: 1;
        }
        .sp-modal-title { font-size: 13px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .sp-modal-body { padding: 18px 20px; }

        .sp-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .sp-footer-left { display: flex; align-items: center; gap: 20px; }
        .sp-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .sp-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes sp-spin { to { transform: rotate(360deg); } }
        .sp-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: sp-spin 0.65s linear infinite;
        }
        @keyframes spFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="sp-root">

        <header className="sp-topbar">
          <div className="sp-topbar-left">
            <div className="sp-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="sp-app-name">
              Venture<span className="sp-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="sp-screen-title">VPDC0200 — Cadastro de Pedido de Compra</span>
          </div>
        </header>

        <div className="sp-actionbar">
          <div className="sp-action-group">
            <span className="sp-action-label">Pedido</span>
            <button className="sp-btn sp-bt-n" onClick={handleNovo} disabled={isSaving}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Novo
            </button>
            <button className="sp-btn sp-bt-p" onClick={handleSalvar} disabled={isSaving}>
              {isSaving
                ? <><div className="sp-spinner" />Salvando...</>
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
          <div className="sp-action-group">
            <span className="sp-action-label">Ações</span>
            <button className="sp-btn sp-bt-g" onClick={() => alert("Resumo do pedido")}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Resumo
            </button>
            <button className="sp-btn sp-bt-g" onClick={() => alert("Impressão do pedido")}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <rect x="3" y="6" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.4" />
                <path d="M5 6V3a1 1 0 011-1h4a1 1 0 011 1v3M4 10h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Impressão
            </button>
            <button className="sp-btn sp-bt-g" onClick={() => alert("Enviar e-mail")}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.4" />
                <path d="M2 5l6 4 6-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              E-mail
            </button>
            <button className="sp-btn sp-bt-g" onClick={() => alert("Anexos")}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M9 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6l-4-4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
              Anexos
            </button>
          </div>
          {abaAtiva === "itens" && (
            <div className="sp-action-group">
              <button className="sp-btn sp-bt-n" onClick={() => setShowItemForm(true)}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                + Item
              </button>
            </div>
          )}
        </div>

        <div className="sp-body">

          {feedback && (
            <div className={`sp-feedback ${feedback.type === "success" ? "sp-fb-success" : "sp-fb-error"}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === "success"
                  ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  : <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4" /><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round" /></>
                }
              </svg>
              {feedback.message}
            </div>
          )}

          <div className="sp-section-banner">
            <span className="sp-section-pill">
              {abaAtiva === "dados" ? "Dados Gerais" : abaAtiva === "transporte" ? "Transporte" : abaAtiva === "vencimento" ? "Vencimento" : "Itens"}
            </span>
            <div className="sp-section-line" />
            <span className="sp-section-hint">
              {form.pedido ? `Pedido #${form.pedido}` : "Novo Pedido"} — Status: {form.status}
            </span>
          </div>

          <div className="sp-card">
            {/* TABS */}
            <div className="sp-tabs">
              <button className={`sp-tab ${abaAtiva === "dados" ? "sp-tab-active" : ""}`} onClick={() => setAbaAtiva("dados")}>
                Dados Gerais
              </button>
              <button className={`sp-tab ${abaAtiva === "transporte" ? "sp-tab-active" : ""}`} onClick={() => setAbaAtiva("transporte")}>
                Transporte
              </button>
              <button className={`sp-tab ${abaAtiva === "vencimento" ? "sp-tab-active" : ""}`} onClick={() => setAbaAtiva("vencimento")}>
                Vencimento
              </button>
              <button className={`sp-tab ${abaAtiva === "itens" ? "sp-tab-active" : ""}`} onClick={() => setAbaAtiva("itens")}>
                Itens ({itens.length})
              </button>
            </div>

            {/* ABA: DADOS GERAIS */}
            {abaAtiva === "dados" && (
              <div className="sp-tab-body">
                <div className="sp-section-label">Identificação</div>
                <div className="sp-grid">
                  <div className="sp-field sp-g2">
                    <label className="sp-label">Pedido</label>
                    <input className="sp-input" value={form.pedido} disabled placeholder="Automático" />
                  </div>
                  <div className="sp-field sp-g2">
                    <label className="sp-label">Tipo</label>
                    <input className="sp-input" value={form.tipo} disabled />
                  </div>
                  <div className="sp-field sp-g2">
                    <label className="sp-label">Alçada</label>
                    <input className="sp-input" value={form.alcada} disabled />
                  </div>
                  <div className="sp-field sp-g2">
                    <label className="sp-label">Nro. Talão</label>
                    <input className="sp-input" value={form.nroTalao} onChange={e => setField("nroTalao", e.target.value)} />
                  </div>
                  <div className="sp-field sp-g2">
                    <label className="sp-label">Fornecedor <span className="sp-label-req">*</span></label>
                    <input className={`sp-input${errors.fornecedor ? " has-error" : ""}`} value={form.fornecedor} onChange={e => setField("fornecedor", e.target.value)} />
                    {errors.fornecedor && (
                      <span className="sp-field-error">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2" />
                          <path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                        {errors.fornecedor}
                      </span>
                    )}
                  </div>
                  <div className="sp-field sp-g2">
                    <label className="sp-label">Nome Fornecedor</label>
                    <input className="sp-input" value={form.fornecedorNome} disabled />
                  </div>
                </div>

                <div className="sp-section-sep" />

                <div className="sp-section-label">Datas e Status</div>
                <div className="sp-grid">
                  <div className="sp-field sp-g3">
                    <label className="sp-label">Emissão</label>
                    <input type="date" className="sp-input" value={form.emissao} onChange={e => setField("emissao", e.target.value)} />
                  </div>
                  <div className="sp-field sp-g3">
                    <label className="sp-label">Status</label>
                    <input className="sp-input" value={form.status} disabled />
                  </div>
                  <div className="sp-field sp-g3">
                    <label className="sp-label">Tab. Preços</label>
                    <input className="sp-input" value={form.tabPrecos} onChange={e => setField("tabPrecos", e.target.value)} />
                  </div>
                  <div className="sp-field sp-g3">
                    <label className="sp-label">Moeda</label>
                    <input className="sp-input" value={form.moeda} onChange={e => setField("moeda", e.target.value)} />
                  </div>
                </div>

                <div className="sp-section-sep" />

                <div className="sp-section-label">Documentos</div>
                <div className="sp-grid">
                  <div className="sp-field sp-g3">
                    <label className="sp-label">Tipo NF</label>
                    <input className="sp-input" value={form.tipoNF} onChange={e => setField("tipoNF", e.target.value)} />
                  </div>
                  <div className="sp-field sp-g3">
                    <label className="sp-label">Tipo Solc.</label>
                    <input className="sp-input" value={form.tipoSolc} onChange={e => setField("tipoSolc", e.target.value)} />
                  </div>
                  <div className="sp-field sp-g3">
                    <label className="sp-label">Cta. Fin.</label>
                    <input className="sp-input" value={form.ctaFin} onChange={e => setField("ctaFin", e.target.value)} />
                  </div>
                  <div className="sp-field sp-g3">
                    <label className="sp-label">Data Moeda</label>
                    <input type="date" className="sp-input" value={form.dataMoeda} onChange={e => setField("dataMoeda", e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* ABA: TRANSPORTE */}
            {abaAtiva === "transporte" && (
              <div className="sp-tab-body">
                <div className="sp-section-label">Dados do Transporte</div>
                <div className="sp-grid">
                  <div className="sp-field sp-g3">
                    <label className="sp-label">Tp. Frete</label>
                    <select className="sp-select" value={form.tpFrete} onChange={e => setField("tpFrete", e.target.value)}>
                      <option value="">Selecione...</option>
                      {FRETE_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="sp-field sp-g3">
                    <label className="sp-label">Tp. Valor</label>
                    <select className="sp-select" value={form.tpValor} onChange={e => setField("tpValor", e.target.value)}>
                      <option>Percentual</option><option>Valor</option>
                    </select>
                  </div>
                  <div className="sp-field sp-g3">
                    <label className="sp-label">Vlr. Frete</label>
                    <input type="number" step="0.01" className="sp-input" value={form.vlrFrete} onChange={e => setField("vlrFrete", Number(e.target.value))} />
                  </div>
                  <div className="sp-field sp-g3">
                    <label className="sp-label">Transportadora</label>
                    <input className="sp-input" value={form.transp} onChange={e => setField("transp", e.target.value)} />
                  </div>
                  <div className="sp-field sp-g3">
                    <label className="sp-label">Moeda Transp.</label>
                    <input className="sp-input" disabled />
                  </div>
                </div>
              </div>
            )}

            {/* ABA: VENCIMENTO */}
            {abaAtiva === "vencimento" && (
              <div className="sp-tab-body">
                <div className="sp-section-label">Vencimento e Pagamentos</div>
                <div className="sp-grid">
                  <div className="sp-field sp-g3">
                    <label className="sp-label">Pagamento</label>
                    <input className="sp-input" value={form.pagamento} onChange={e => setField("pagamento", e.target.value)} />
                  </div>
                  <div className="sp-field sp-g3">
                    <label className="sp-label">Data Base</label>
                    <input type="date" className="sp-input" value={form.dataBase} onChange={e => setField("dataBase", e.target.value)} />
                  </div>
                  <div className="sp-field sp-g3">
                    <label className="sp-label">Data Vcto.</label>
                    <select className="sp-select" value={form.dataVcto} onChange={e => setField("dataVcto", e.target.value)}>
                      <option>Emissão</option><option>Entrada</option><option>Digitação</option>
                    </select>
                  </div>
                  <div className="sp-field sp-g3">
                    <label className="sp-label">Tipo Vcto.</label>
                    <select className="sp-select" value={form.tipoVcto} onChange={e => setField("tipoVcto", e.target.value)}>
                      {TIPO_VCTO.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="sp-field sp-g3">
                    <label className="sp-label">Tipo Pgto.</label>
                    <select className="sp-select" value={form.tipoPgto} onChange={e => setField("tipoPgto", e.target.value)}>
                      {TIPO_PGTO.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="sp-field sp-g3" style={{justifyContent:"flex-end"}}>
                    <label className="sp-chk-row">
                      <input type="checkbox" className="sp-chk" checked={form.subsequente} onChange={e => setField("subsequente", e.target.checked)} />
                      Subsequente?
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ABA: ITENS */}
            {abaAtiva === "itens" && (
              <div className="sp-tab-body">
                <div className="sp-section-label">Itens do Pedido</div>
                <table className="sp-table">
                  <thead>
                    <tr>
                      <th>Seq</th><th>Item</th><th>Descrição</th><th style={{textAlign:"right"}}>Qtd</th>
                      <th>UM</th><th style={{textAlign:"right"}}>Vlr Unit.</th><th style={{textAlign:"right"}}>Vlr Total</th><th style={{width:80}}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map(item => (
                      <tr key={item.seq}>
                        <td>{item.seq}</td>
                        <td style={{fontWeight:600,color:"#1a4a2a"}}>{item.item}</td>
                        <td>{item.descricao}</td>
                        <td style={{textAlign:"right"}}>{item.quantidade}</td>
                        <td>{item.um}</td>
                        <td style={{textAlign:"right"}}>R$ {item.valorUnit.toFixed(2)}</td>
                        <td style={{textAlign:"right",fontWeight:600}}>R$ {item.valorTotal.toFixed(2)}</td>
                        <td>
                          <button className="sp-btn sp-bt-sm sp-bt-d sp-bt-sm" onClick={() => removeItem(item.seq)}>
                            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="sp-totals">
                  <div className="sp-total-item">
                    <span>Total Bruto</span>
                    <span>R$ {totalBruto.toFixed(2)}</span>
                  </div>
                  <div className="sp-total-item">
                    <span>Itens</span>
                    <span>{itens.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="sp-footer">
          <div className="sp-footer-left">
            <div className="sp-footer-stat">
              Pedido: <strong>{form.pedido || "—"}</strong>
            </div>
            <div className="sp-footer-stat">
              Status: <strong>{form.status}</strong>
            </div>
            <div className="sp-footer-stat">
              Itens: <strong>{itens.length}</strong>
            </div>
            <div className="sp-footer-stat">
              Total: <strong>R$ {totalBruto.toFixed(2)}</strong>
            </div>
          </div>
          <span style={{color:"#b0c8b8",fontSize:11}}>GRUPO VENTURE LTDA</span>
        </footer>

      </div>

      {showItemForm && (
        <div className="sp-overlay" onClick={e => { if (e.target === e.currentTarget) setShowItemForm(false); }}>
          <div className="sp-modal">
            <div className="sp-modal-header">
              <span className="sp-modal-title">Novo Item</span>
              <button className="sp-btn sp-bt-sm sp-bt-g" onClick={() => setShowItemForm(false)}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Cancelar
              </button>
            </div>
            <div className="sp-modal-body">
              <div className="sp-grid">
                <div className="sp-field sp-g6">
                  <label className="sp-label">Item</label>
                  <input className="sp-input" value={novoItem.item} onChange={e => setNovoItem(p => ({...p, item:e.target.value}))} />
                </div>
                <div className="sp-field sp-g6">
                  <label className="sp-label">Descrição</label>
                  <input className="sp-input" value={novoItem.descricao} onChange={e => setNovoItem(p => ({...p, descricao:e.target.value}))} />
                </div>
                <div className="sp-field sp-g3">
                  <label className="sp-label">Quantidade</label>
                  <input type="number" className="sp-input" value={novoItem.quantidade} onChange={e => setNovoItem(p => ({...p, quantidade:Number(e.target.value)}))} />
                </div>
                <div className="sp-field sp-g3">
                  <label className="sp-label">UM</label>
                  <input className="sp-input" value={novoItem.um} onChange={e => setNovoItem(p => ({...p, um:e.target.value}))} />
                </div>
                <div className="sp-field sp-g6">
                  <label className="sp-label">Valor Unitário</label>
                  <input type="number" step="0.01" className="sp-input" value={novoItem.valorUnit} onChange={e => setNovoItem(p => ({...p, valorUnit:Number(e.target.value)}))} />
                </div>
              </div>
              <div style={{display:"flex",gap:8,marginTop:20,justifyContent:"flex-end"}}>
                <button className="sp-btn sp-bt-g" onClick={() => setShowItemForm(false)}>Cancelar</button>
                <button className="sp-btn sp-bt-p" onClick={addItem}>Adicionar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

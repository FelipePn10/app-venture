import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PedidoVendaForm {
  status: string;
  liberacao: string;
  pedido: string;
  origem: string;
  emissao: string;
  pedidoRep: string;
  dataEntrega: string;
  firme: boolean;
  nfce: boolean;
  dataDig: string;
  ordemCompra: string;
  cliente: string;
  clienteNome: string;
  estabFatura: string;
  estabCobranca: string;
  estabEntrega: string;
  representante: string;
  plano: string;
  divisaoVenda: string;
  comissao: number;
  tipoImposto: string;
  indPresenca: string;
  canalVenda: string;
  tipoNF: string;
  tabelaVenda: string;
  condPagto: string;
  maisDias: string;
  portador: string;
  dataVenda: string;
}

interface PedidoItemForm {
  seq: number;
  item: string;
  descricao: string;
  mascaraId: string;
  um: string;
  quantidade: number;
  valorUnit: number;
  valorTotal: number;
  tipoNF: string;
}

type AbaAtiva = "dados" | "itens" | "totais";
type FeedbackState = { type: "success" | "error"; message: string } | null;

const STATUS_OPTIONS = ["(R) Rascunho", "(P) Pedido VentureWeb", "(A) Em Análise", "(F) Pedido VentureERP", "(OF) Orçamento VentureERP"];
const ORIGEM_OPTIONS = ["Normal", "Assistência", "Cópia", "Precificação", "Negociação", "Importado", "Reserva", "Inter-Fábrica"];
const PRESENCA_OPTIONS = ["Não se aplica", "Operação presencial", "Internet", "Teleatendimento", "Entrega domicílio", "Fora estabelecimento", "Outros"];

const formInicial: PedidoVendaForm = {
  status:"(R) Rascunho", liberacao:"Liberado", pedido:"", origem:"Normal",
  emissao:new Date().toISOString().slice(0,10), pedidoRep:"", dataEntrega:"", firme:false, nfce:false,
  dataDig:new Date().toISOString().slice(0,10), ordemCompra:"", cliente:"", clienteNome:"",
  estabFatura:"", estabCobranca:"", estabEntrega:"", representante:"", plano:"",
  divisaoVenda:"", comissao:5, tipoImposto:"", indPresenca:"Não se aplica", canalVenda:"",
  tipoNF:"", tabelaVenda:"", condPagto:"", maisDias:"", portador:"", dataVenda:"",
};

const MOCK_ITENS: PedidoItemForm[] = [
  { seq:1, item:"IT001", descricao:"Produto A - Modelo Standard", mascaraId:"", um:"UN", quantidade:10, valorUnit:150.00, valorTotal:1500.00, tipoNF:"5102" },
  { seq:2, item:"IT002", descricao:"Produto B - Premium", mascaraId:"MSK01", um:"UN", quantidade:5, valorUnit:320.00, valorTotal:1600.00, tipoNF:"5102" },
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

export function Vpdv0200Page(): JSX.Element {
  const [form, setForm] = useState<PedidoVendaForm>(formInicial);
  const [itens, setItens] = useState<PedidoItemForm[]>(MOCK_ITENS);
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("dados");
  const [errors, setErrors] = useState<Partial<Record<keyof PedidoVendaForm, string>>>({});
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [novoItem, setNovoItem] = useState<PedidoItemForm>({
    seq:0, item:"", descricao:"", mascaraId:"", um:"UN", quantidade:1, valorUnit:0, valorTotal:0, tipoNF:"",
  });

  const setField = useCallback(<K extends keyof PedidoVendaForm>(key: K, value: PedidoVendaForm[K]) => {
    setForm(p => ({ ...p, [key]: value }));
    setErrors(p => ({ ...p, [key]: undefined }));
    setFeedback(null);
  }, []);

  function validate(): boolean {
    const e: Partial<Record<keyof PedidoVendaForm, string>> = {};
    if (!form.cliente.trim()) e.cliente = "Campo obrigatório.";
    if (!form.tipoNF.trim()) e.tipoNF = "Campo obrigatório.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSalvar() {
    if (!validate()) return;
    setIsSaving(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      setFeedback({ type: "success", message: "Pedido de venda salvo com sucesso." });
      if (!form.pedido) setField("pedido", String(Math.floor(Math.random() * 900000) + 100000));
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Falha ao salvar pedido.") });
    } finally { setIsSaving(false); }
  }

  function handleNovo() { setForm(formInicial); setItens([]); setErrors({}); setFeedback(null); }

  function addItem() {
    const newSeq = itens.length + 1;
    const item: PedidoItemForm = { ...novoItem, seq: newSeq, valorTotal: novoItem.quantidade * novoItem.valorUnit };
    setItens(p => [...p, item]);
    setNovoItem({ seq:0, item:"", descricao:"", mascaraId:"", um:"UN", quantidade:1, valorUnit:0, valorTotal:0, tipoNF:"" });
    setShowItemForm(false);
  }

  function removeItem(seq: number) { setItens(p => p.filter(i => i.seq !== seq)); }

  const totalBruto = itens.reduce((s,i) => s + i.valorTotal, 0);
  const totalLiquido = totalBruto * 0.88;
  const pesoLiquido = itens.reduce((s,i) => s + i.quantidade * 2.5, 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .p2-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .p2-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .p2-topbar-left { display: flex; align-items: center; gap: 10px; }
        .p2-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .p2-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .p2-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .p2-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .p2-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .p2-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .p2-action-group:last-child { border-right: none; }
        .p2-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .p2-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .p2-bt-p { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .p2-bt-p:hover:not(:disabled) { background: #1e3a2a; }
        .p2-bt-p:disabled { opacity: 0.5; cursor: not-allowed; }
        .p2-bt-g { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .p2-bt-g:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .p2-bt-g:disabled { opacity: 0.5; cursor: not-allowed; }
        .p2-bt-d { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .p2-bt-d:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .p2-bt-sm { height: 28px; padding: 0 9px; font-size: 12px; }
        .p2-bt-n {
          background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600;
        }
        .p2-bt-n:hover:not(:disabled) { background: #dff5e4; border-color: #88c898; }

        .p2-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .p2-body::-webkit-scrollbar { width: 5px; }
        .p2-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .p2-section-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 0 8px;
        }
        .p2-section-banner:first-child { padding-top: 0; }
        .p2-section-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .p2-section-line { flex: 1; height: 1px; background: #dbe8d5; }
        .p2-section-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .p2-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .p2-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .p2-card-header-left { display: flex; align-items: center; gap: 8px; }
        .p2-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .p2-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .p2-card-body { padding: 18px 18px; }

        .p2-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .p2-g2  { grid-column: span 2; }
        .p2-g3  { grid-column: span 3; }
        .p2-g4  { grid-column: span 4; }
        .p2-g5  { grid-column: span 5; }
        .p2-g6  { grid-column: span 6; }
        .p2-g8  { grid-column: span 8; }
        .p2-g12 { grid-column: span 12; }

        .p2-field { display: flex; flex-direction: column; gap: 5px; }
        .p2-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .p2-label-req { color: #c84040; font-size: 12px; line-height: 1; }
        .p2-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .p2-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .p2-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .p2-input:disabled { background: #f0f4ee; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }
        .p2-input.has-err { border-color: #e05252; box-shadow: 0 0 0 2px rgba(224,82,82,0.1); }
        .p2-input[type="date"] { cursor: pointer; }

        .p2-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .p2-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }

        .p2-field-err { font-size: 11px; color: #c84040; margin-top: 2px; display: flex; align-items: center; gap: 4px; }
        .p2-field-hint  { font-size: 11px; color: #7a9c84; margin-top: 2px; line-height: 1.45; }

        .p2-tabs {
          display: flex; align-items: flex-end; gap: 0;
          border-bottom: 2px solid #dbe8d5; background: #fafcf9;
        }
        .p2-tab {
          padding: 10px 20px; font-size: 12.5px; font-weight: 500;
          color: #6a8a74; cursor: pointer; border: none; background: transparent;
          border-bottom: 2px solid transparent; margin-bottom: -2px;
          transition: color 0.13s, border-color 0.13s; white-space: nowrap;
          font-family: 'Inter', sans-serif;
        }
        .p2-tab:hover { color: #2a4a35; }
        .p2-tab.ac { color: #162e20; border-bottom-color: #3e9654; font-weight: 600; }

        .p2-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
        .p2-tbl th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .p2-tbl td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .p2-tbl tbody tr { transition: background 0.1s; }
        .p2-tbl tbody tr:hover { background: #eef9f0; }

        .p2-tots { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
        .p2-tot-card {
          background: #fafcf9; border: 1px solid #dbe8d5;
          border-radius: 9px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px;
        }
        .p2-tot-label { font-size: 10.5px; font-weight: 600; color: #7a9c84; text-transform: uppercase; letter-spacing: 0.4px; }
        .p2-tot-val { font-size: 18px; font-weight: 700; color: #1a2e22; }
        .p2-tot-val.g { color: #2a6a30; }

        .p2-fb {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: p2Fade 0.2s ease;
          margin-bottom: 14px;
        }
        .p2-fb.s { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .p2-fb.e { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }

        .p2-chk { display: flex; align-items: center; gap: 8px; padding-top: 28px; }
        .p2-chk input { width: 16px; height: 16px; accent-color: #3e9654; cursor: pointer; }
        .p2-chk span { font-size: 13px; color: #3a5a45; font-weight: 500; }

        .p2-ovl {
          position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100;
          display: flex; justify-content: center; align-items: center;
        }
        .p2-mod {
          background: #fff; border: 1px solid #dbe8d5; border-radius: 12px;
          width: 520px; max-height: 80vh; overflow-y: auto; padding: 24px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        }
        .p2-mod h3 { margin: 0 0 16px; font-size: 13px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }

        .p2-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .p2-footer-stat { font-size: 11.5px; color: #6a8a74; display: flex; align-items: center; gap: 4px; }
        .p2-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .p2-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        @keyframes p2Fade { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="p2-root">

        {/* ── TOPBAR ── */}
        <header className="p2-topbar">
          <div className="p2-topbar-left">
            <div className="p2-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="p2-app-name">
              Venture<span className="p2-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="p2-screen-title">VPDV0200 — Cadastro de Pedido de Venda</span>
          </div>
        </header>

        {/* ── ACTION BAR ── */}
        <div className="p2-actionbar">
          <div className="p2-action-group">
            <span className="p2-action-label">Cadastro</span>
            <button className="p2-btn p2-bt-n" onClick={handleNovo} disabled={isSaving}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Novo
            </button>
          </div>
          <div className="p2-action-group">
            <span className="p2-action-label">Ações</span>
            <button className="p2-btn p2-bt-p" onClick={() => void handleSalvar()} disabled={isSaving}>
              {isSaving
                ? <><div className="p2-spinner" />Salvando...</>
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
          {abaAtiva === "itens" && (
            <div className="p2-action-group">
              <button className="p2-btn p2-bt-g" onClick={() => setShowItemForm(true)}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                Adicionar Item
              </button>
            </div>
          )}
        </div>

        {/* ── TABS ── */}
        <div className="p2-tabs">
          <button className={`p2-tab${abaAtiva === "dados" ? " ac" : ""}`} onClick={() => setAbaAtiva("dados")}>Dados Gerais</button>
          <button className={`p2-tab${abaAtiva === "itens" ? " ac" : ""}`} onClick={() => setAbaAtiva("itens")}>Itens ({itens.length})</button>
          <button className={`p2-tab${abaAtiva === "totais" ? " ac" : ""}`} onClick={() => setAbaAtiva("totais")}>Totais</button>
        </div>

        {/* ── BODY ── */}
        <div className="p2-body">

          {/* Feedback */}
          {feedback && (
            <div className={`p2-fb ${feedback.type === "success" ? "s" : "e"}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === "success"
                  ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  : <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4" /><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round" /></>
                }
              </svg>
              {feedback.message}
            </div>
          )}

          {/* ═══ DADOS GERAIS ═══ */}
          {abaAtiva === "dados" && (
            <>
              <div className="p2-section-banner">
                <span className="p2-section-pill">Dados do Pedido</span>
                <div className="p2-section-line" />
                <span className="p2-section-hint">Preencha os campos obrigatórios marcados com *</span>
              </div>

              <div className="p2-card">
                <div className="p2-card-header">
                  <div className="p2-card-header-left">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" />
                      <path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span className="p2-card-title">Formulário do Pedido</span>
                  </div>
                  <span className="p2-card-badge">{form.pedido ? `#${form.pedido}` : "Novo"}</span>
                </div>

                <div className="p2-card-body">
                  <div className="p2-grid">

                    <div className="p2-field p2-g2">
                      <label className="p2-label">Status</label>
                      <select className="p2-select" value={form.status} onChange={e => setField("status", e.target.value)}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div className="p2-field p2-g2">
                      <label className="p2-label">Pedido</label>
                      <input className="p2-input" value={form.pedido} onChange={e => setField("pedido", e.target.value)} placeholder="Automático" />
                    </div>

                    <div className="p2-field p2-g2">
                      <label className="p2-label">Origem</label>
                      <select className="p2-select" value={form.origem} onChange={e => setField("origem", e.target.value)}>
                        {ORIGEM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>

                    <div className="p2-field p2-g2">
                      <label className="p2-label">Emissão</label>
                      <input type="date" className="p2-input" value={form.emissao} onChange={e => setField("emissao", e.target.value)} />
                    </div>

                    <div className="p2-field p2-g2">
                      <label className="p2-label">Data Entrega</label>
                      <input type="date" className="p2-input" value={form.dataEntrega} onChange={e => setField("dataEntrega", e.target.value)} />
                    </div>

                    <div className="p2-field p2-g2">
                      <label className="p2-label">Pedido Rep.</label>
                      <input className="p2-input" value={form.pedidoRep} onChange={e => setField("pedidoRep", e.target.value)} />
                    </div>

                    <div className="p2-field p2-g2">
                      <label className="p2-label">Data Dig.</label>
                      <input type="date" className="p2-input" value={form.dataDig} onChange={e => setField("dataDig", e.target.value)} />
                    </div>

                    <div className="p2-field p2-g2">
                      <label className="p2-label">Ordem Compra</label>
                      <input className="p2-input" value={form.ordemCompra} onChange={e => setField("ordemCompra", e.target.value)} />
                    </div>

                    <div className="p2-field p2-g4">
                      <label className="p2-label">Cliente <span className="p2-label-req">*</span></label>
                      <input className={`p2-input${errors.cliente ? " has-err" : ""}`} value={form.cliente} onChange={e => setField("cliente", e.target.value)} placeholder="Código do cliente" />
                      {errors.cliente && <span className="p2-field-err"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2" /><path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round" /></svg>{errors.cliente}</span>}
                    </div>

                    <div className="p2-field p2-g4">
                      <label className="p2-label">Nome Cliente</label>
                      <input className="p2-input" value={form.clienteNome} onChange={e => setField("clienteNome", e.target.value)} disabled />
                    </div>

                    <div className="p2-field p2-g2">
                      <label className="p2-label">Estab. Fatura</label>
                      <input className="p2-input" value={form.estabFatura} onChange={e => setField("estabFatura", e.target.value)} />
                    </div>

                    <div className="p2-field p2-g2">
                      <label className="p2-label">Estab. Cobrança</label>
                      <input className="p2-input" value={form.estabCobranca} onChange={e => setField("estabCobranca", e.target.value)} />
                    </div>

                    <div className="p2-field p2-g2">
                      <label className="p2-label">Estab. Entrega</label>
                      <input className="p2-input" value={form.estabEntrega} onChange={e => setField("estabEntrega", e.target.value)} />
                    </div>

                    <div className="p2-field p2-g2">
                      <label className="p2-label">Representante</label>
                      <input className="p2-input" value={form.representante} onChange={e => setField("representante", e.target.value)} />
                    </div>

                    <div className="p2-field p2-g2">
                      <label className="p2-label">Divisão Venda</label>
                      <input className="p2-input" value={form.divisaoVenda} onChange={e => setField("divisaoVenda", e.target.value)} />
                    </div>

                    <div className="p2-field p2-g2">
                      <label className="p2-label">Comissão (%)</label>
                      <input className="p2-input" type="number" step="0.01" value={form.comissao} onChange={e => setField("comissao", Number(e.target.value))} />
                    </div>

                    <div className="p2-field p2-g2">
                      <label className="p2-label">Tipo Imposto</label>
                      <input className="p2-input" value={form.tipoImposto} onChange={e => setField("tipoImposto", e.target.value)} />
                    </div>

                    <div className="p2-field p2-g2">
                      <label className="p2-label">Ind. Presença</label>
                      <select className="p2-select" value={form.indPresenca} onChange={e => setField("indPresenca", e.target.value)}>
                        {PRESENCA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>

                    <div className="p2-field p2-g2">
                      <label className="p2-label">Tipo NF Padrão <span className="p2-label-req">*</span></label>
                      <input className={`p2-input${errors.tipoNF ? " has-err" : ""}`} value={form.tipoNF} onChange={e => setField("tipoNF", e.target.value)} />
                      {errors.tipoNF && <span className="p2-field-err"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2" /><path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round" /></svg>{errors.tipoNF}</span>}
                    </div>

                    <div className="p2-field p2-g2">
                      <label className="p2-label">Tabela Venda</label>
                      <input className="p2-input" value={form.tabelaVenda} onChange={e => setField("tabelaVenda", e.target.value)} />
                    </div>

                    <div className="p2-field p2-g2">
                      <label className="p2-label">Cond. Pagto</label>
                      <input className="p2-input" value={form.condPagto} onChange={e => setField("condPagto", e.target.value)} />
                    </div>

                    <div className="p2-field p2-g2">
                      <label className="p2-label">Portador</label>
                      <input className="p2-input" value={form.portador} onChange={e => setField("portador", e.target.value)} />
                    </div>

                    <div className="p2-field p2-g2">
                      <label className="p2-label">Canal de Venda</label>
                      <input className="p2-input" value={form.canalVenda} onChange={e => setField("canalVenda", e.target.value)} />
                    </div>

                    <div className="p2-field p2-g2">
                      <label className="p2-label">+Dias</label>
                      <input className="p2-input" value={form.maisDias} onChange={e => setField("maisDias", e.target.value)} />
                    </div>

                    <div className="p2-field p2-g2">
                      <div className="p2-chk">
                        <input type="checkbox" checked={form.firme} onChange={e => setField("firme", e.target.checked)} />
                        <span>Firme</span>
                      </div>
                    </div>

                    <div className="p2-field p2-g2">
                      <div className="p2-chk">
                        <input type="checkbox" checked={form.nfce} onChange={e => setField("nfce", e.target.checked)} />
                        <span>NFC-e</span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </>
          )}

          {/* ═══ ITENS ═══ */}
          {abaAtiva === "itens" && (
            <>
              <div className="p2-section-banner">
                <span className="p2-section-pill">Itens do Pedido</span>
                <div className="p2-section-line" />
                <span className="p2-card-badge">{itens.length} item(ns)</span>
              </div>

              <div className="p2-card">
                <div className="p2-card-header">
                  <div className="p2-card-header-left">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4h12M2 8h12M2 12h8" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span className="p2-card-title">Relação de Itens</span>
                  </div>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table className="p2-tbl">
                    <thead>
                      <tr><th>Seq</th><th>Item</th><th>Descrição</th><th>Máscara</th><th>UM</th><th>Qtd</th><th>Vlr Unit</th><th>Vlr Total</th><th>Tipo NF</th><th>Ações</th></tr>
                    </thead>
                    <tbody>
                      {itens.map(item => (
                        <tr key={item.seq}>
                          <td style={{fontWeight:600,color:"#1a4a2a"}}>{item.seq}</td>
                          <td>{item.item}</td><td>{item.descricao}</td>
                          <td style={{color:item.mascaraId?"#243830":"#96b8a0"}}>{item.mascaraId || "—"}</td>
                          <td>{item.um}</td><td>{item.quantidade}</td>
                          <td style={{fontWeight:500}}>R$ {item.valorUnit.toFixed(2)}</td>
                          <td style={{fontWeight:600,color:"#1a6030"}}>R$ {item.valorTotal.toFixed(2)}</td>
                          <td>{item.tipoNF}</td>
                          <td>
                            <button className="p2-btn p2-bt-d p2-bt-sm" onClick={() => removeItem(item.seq)}>Excluir</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ═══ TOTAIS ═══ */}
          {abaAtiva === "totais" && (
            <>
              <div className="p2-section-banner">
                <span className="p2-section-pill">Totais do Pedido</span>
                <div className="p2-section-line" />
                <span className="p2-section-hint">Resumo financeiro e de peso</span>
              </div>

              <div className="p2-card">
                <div className="p2-card-header">
                  <div className="p2-card-header-left">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M2 13h12M3 10l3-5 2 3 3-6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="p2-card-title">Resumo</span>
                  </div>
                </div>
                <div className="p2-card-body">
                  <div className="p2-tots">
                    <div className="p2-tot-card">
                      <span className="p2-tot-label">Total de Itens</span>
                      <span className="p2-tot-val">{itens.length}</span>
                    </div>
                    <div className="p2-tot-card">
                      <span className="p2-tot-label">Peso Líquido (kg)</span>
                      <span className="p2-tot-val">{pesoLiquido.toFixed(2)}</span>
                    </div>
                    <div className="p2-tot-card">
                      <span className="p2-tot-label">Peso Bruto (kg)</span>
                      <span className="p2-tot-val">{(pesoLiquido * 1.15).toFixed(2)}</span>
                    </div>
                    <div className="p2-tot-card">
                      <span className="p2-tot-label">Total Bruto</span>
                      <span className="p2-tot-val g">R$ {totalBruto.toFixed(2)}</span>
                    </div>
                    <div className="p2-tot-card">
                      <span className="p2-tot-label">Total Líquido</span>
                      <span className="p2-tot-val g">R$ {totalLiquido.toFixed(2)}</span>
                    </div>
                    <div className="p2-tot-card">
                      <span className="p2-tot-label">C/ IPI C/ ST</span>
                      <span className="p2-tot-val g">R$ {(totalLiquido * 1.12).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── FOOTER ── */}
        <footer className="p2-footer">
          <div className="p2-footer-stat">
            Pedido: <strong>{form.pedido || "—"}</strong>
          </div>
          <div className="p2-footer-stat">
            Itens: <strong>{itens.length}</strong>
          </div>
          <div className="p2-footer-stat">
            {form.origem} <span style={{color:"#b0c8b8",fontSize:11}}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>
      </div>

      {/* ── MODAL: NOVO ITEM ── */}
      {showItemForm && (
        <div className="p2-ovl" onClick={e => { if (e.target === e.currentTarget) setShowItemForm(false); }}>
          <div className="p2-mod">
            <h3>Novo Item</h3>
            <div className="p2-grid">
              <div className="p2-field p2-g6"><label className="p2-label">Item</label><input className="p2-input" value={novoItem.item} onChange={e => setNovoItem(p => ({...p, item:e.target.value}))} /></div>
              <div className="p2-field p2-g6"><label className="p2-label">Descrição</label><input className="p2-input" value={novoItem.descricao} onChange={e => setNovoItem(p => ({...p, descricao:e.target.value}))} /></div>
              <div className="p2-field p2-g4"><label className="p2-label">Máscara ID</label><input className="p2-input" value={novoItem.mascaraId} onChange={e => setNovoItem(p => ({...p, mascaraId:e.target.value}))} /></div>
              <div className="p2-field p2-g2"><label className="p2-label">UM</label><input className="p2-input" value={novoItem.um} onChange={e => setNovoItem(p => ({...p, um:e.target.value}))} /></div>
              <div className="p2-field p2-g3"><label className="p2-label">Quantidade</label><input className="p2-input" type="number" value={novoItem.quantidade} onChange={e => setNovoItem(p => ({...p, quantidade:Number(e.target.value)}))} /></div>
              <div className="p2-field p2-g3"><label className="p2-label">Valor Unitário</label><input className="p2-input" type="number" step="0.01" value={novoItem.valorUnit} onChange={e => setNovoItem(p => ({...p, valorUnit:Number(e.target.value)}))} /></div>
              <div className="p2-field p2-g6"><label className="p2-label">Tipo NF</label><input className="p2-input" value={novoItem.tipoNF} onChange={e => setNovoItem(p => ({...p, tipoNF:e.target.value}))} /></div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:20,justifyContent:"flex-end"}}>
              <button className="p2-btn p2-bt-g" onClick={() => setShowItemForm(false)}>Cancelar</button>
              <button className="p2-btn p2-bt-p" onClick={addItem}>Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

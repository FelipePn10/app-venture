import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface ItemFornecedorRow {
  codItemFor: string;
  descItemFor: string;
  um: string;
  unidMedXml: string;
  fatConv: string;
  qtdeEmbalagem: string;
  preferencial: string;
  uf: string;
  classificacao: string;
  dataClas: string;
  nota: string;
  fatDireto: boolean;
  pedTerceiros: boolean;
  descAdic: string;
  codBarra: string;
  observacao: string;
  dtValidade: string;
  pdm: PdmAttrib[];
}

interface PdmAttrib {
  codigo: string;
  atributo: string;
  tamanho: string;
  ec: string;
  txtA: string;
  txtP: string;
  conteudo: string;
  abreviacoes: string;
}

interface QualidadeItem {
  campo: string;
  valor: string;
}

const ITENS_MOCK = [
  { code: "001", nome: "Parafuso M8" },
  { code: "002", nome: "Arruela 10mm" },
  { code: "003", nome: "Porca M8" },
];

const UM_OPTS = ["UN", "KG", "L", "M", "M2", "CX", "PC"];
const PREFERENCIAL_OPTS = ["Sem restrição", "Principal", "Secundário"];
const CLASS_OPTS = ["A", "B", "C"];
const DESC_ADIC_OPTS = ["Nenhuma", "Material reciclado", "Origem importada", "Produção local"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const resp = (error as Record<string, unknown>).response as Record<string, unknown> | undefined;
    if (resp?.data && typeof resp.data === "object") {
      const d = resp.data as Record<string, unknown>;
      if (typeof d.message === "string") return d.message;
    }
  }
  return error instanceof Error ? error.message : fallback;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Vvor0202Page(): JSX.Element {
  const [itemSel, setItemSel] = useState("");
  const [configurado, setConfigurado] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [rows, setRows] = useState<ItemFornecedorRow[]>([
    {
      codItemFor: "001F", descItemFor: "Parafuso M8 - SOHOME", um: "UN", unidMedXml: "UN", fatConv: "1.0000",
      qtdeEmbalagem: "100", preferencial: "Principal", uf: "SP", classificacao: "A", dataClas: "2025-01-10",
      nota: "N/A", fatDireto: true, pedTerceiros: false, descAdic: "Nenhuma", codBarra: "7891234567890",
      observacao: "Item padrão", dtValidade: "2026-01-10", pdm: [],
    },
    {
      codItemFor: "002F", descItemFor: "Arruela 10mm - ALFA", um: "KG", unidMedXml: "KG", fatConv: "0.5000",
      qtdeEmbalagem: "500", preferencial: "Sem restrição", uf: "RJ", classificacao: "B", dataClas: "2025-02-15",
      nota: "OK", fatDireto: false, pedTerceiros: true, descAdic: "Origem importada", codBarra: "7891234567891",
      observacao: "", dtValidade: "", pdm: [],
    },
    {
      codItemFor: "003F", descItemFor: "Porca M8 - BETA", um: "CX", unidMedXml: "UN", fatConv: "50.0000",
      qtdeEmbalagem: "200", preferencial: "Secundário", uf: "MG", classificacao: "A", dataClas: "2025-03-20",
      nota: "Prioridade", fatDireto: true, pedTerceiros: false, descAdic: "Produção local", codBarra: "7891234567892",
      observacao: "Contrato ativo", dtValidade: "2025-12-31", pdm: [],
    },
  ]);

  const [showQualidade, setShowQualidade] = useState(false);
  const [showPdm, setShowPdm] = useState(false);
  const [pdmRowIndex, setPdmRowIndex] = useState<number | null>(null);
  const [pdmGrupo, setPdmGrupo] = useState("");
  const [pdmModificador, setPdmModificador] = useState("");
  const [pdmAttrs, setPdmAttrs] = useState<PdmAttrib[]>([]);
  const [novoPdm, setNovoPdm] = useState<PdmAttrib>({ codigo: "", atributo: "", tamanho: "", ec: "", txtA: "", txtP: "", conteudo: "", abreviacoes: "" });

  const [qualidadeData] = useState<QualidadeItem[]>([
    { campo: "Certificação", valor: "ISO 9001" },
    { campo: "Rastreabilidade", valor: "Lote 2025/03" },
    { campo: "Validade Técnica", valor: "2026-06-30" },
    { campo: "Laudo Técnico", valor: "LT-2025-001" },
  ]);

  const setFieldRow = useCallback((rowIndex: number, key: keyof ItemFornecedorRow, value: string | boolean) => {
    setRows((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, [key]: value } : r)));
    setFeedback(null);
  }, []);

  async function handleConfigurar() {
    if (!itemSel.trim()) {
      setFeedback({ type: "error", message: "Selecione um item." });
      return;
    }
    setIsLoading(true);
    setFeedback(null);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const itemNome = ITENS_MOCK.find((i) => i.code === itemSel)?.nome ?? "Item";
      setConfigurado(`${itemSel} - ${itemNome}`);
      setFeedback({ type: "success", message: `Item ${itemSel} configurado.` });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao configurar.") });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSalvar() {
    setIsSaving(true);
    setFeedback(null);
    try {
      await new Promise((r) => setTimeout(r, 800));
      setFeedback({ type: "success", message: `${rows.length} item(ns) salvos com sucesso.` });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao salvar.") });
    } finally {
      setIsSaving(false);
    }
  }

  function handleLimpar() {
    setItemSel("");
    setConfigurado("");
    setRows([]);
    setFeedback(null);
  }

  function openPdm(idx: number) {
    setPdmRowIndex(idx);
    setPdmGrupo("");
    setPdmModificador("");
    setPdmAttrs(rows[idx].pdm);
    setNovoPdm({ codigo: "", atributo: "", tamanho: "", ec: "", txtA: "", txtP: "", conteudo: "", abreviacoes: "" });
    setShowPdm(true);
  }

  function addPdmAttr() {
    if (!novoPdm.codigo.trim()) return;
    setPdmAttrs((prev) => [...prev, { ...novoPdm }]);
    setNovoPdm({ codigo: "", atributo: "", tamanho: "", ec: "", txtA: "", txtP: "", conteudo: "", abreviacoes: "" });
  }

  function removePdmAttr(idx: number) {
    setPdmAttrs((prev) => prev.filter((_, i) => i !== idx));
  }

  function savePdm() {
    if (pdmRowIndex != null) {
      setRows((prev) => prev.map((r, i) => (i === pdmRowIndex ? { ...r, pdm: pdmAttrs } : r)));
    }
    setShowPdm(false);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .vor-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .vor-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .vor-topbar-left { display: flex; align-items: center; gap: 10px; }
        .vor-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .vor-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .vor-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .vor-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .vor-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .vor-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .vor-action-group:last-child { border-right: none; }
        .vor-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .vor-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .vor-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .vor-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .vor-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .vor-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .vor-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .vor-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .vor-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .vor-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .vor-btn-new {
          background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600;
        }
        .vor-btn-new:hover:not(:disabled) { background: #dff5e4; border-color: #88c898; }

        .vor-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .vor-body::-webkit-scrollbar { width: 5px; }
        .vor-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .vor-section-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 0 8px;
        }
        .vor-section-banner:first-child { padding-top: 0; }
        .vor-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .vor-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .vor-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .vor-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .vor-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .vor-card-header-left { display: flex; align-items: center; gap: 8px; }
        .vor-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .vor-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .vor-card-body { padding: 18px 18px; }

        .vor-filter-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }

        .vor-field { display: flex; flex-direction: column; gap: 5px; }
        .vor-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .vor-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .vor-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .vor-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .vor-input:disabled { background: #f0f4ee; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }
        .vor-input[type="date"] { cursor: pointer; }
        .vor-input.has-e { border-color: #e05252; }

        .vor-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .vor-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }

        .vor-toggle-row { display: flex; align-items: center; gap: 10px; padding-top: 2px; }
        .vor-toggle { position: relative; width: 38px; height: 20px; flex-shrink: 0; cursor: pointer; }
        .vor-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .vor-toggle-track { position: absolute; inset: 0; background: #d4e0d0; border-radius: 20px; transition: background 0.2s; }
        .vor-toggle input:checked ~ .vor-toggle-track { background: #3e9654; }
        .vor-toggle-thumb {
          position: absolute; top: 3px; left: 3px; width: 14px; height: 14px;
          background: #fff; border-radius: 50%; transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .vor-toggle input:checked ~ .vor-toggle-thumb { transform: translateX(18px); }
        .vor-toggle-label { font-size: 13px; color: #3a5a45; font-weight: 500; }

        .vor-input-wrap { position: relative; display: flex; }
        .vor-input-btn {
          height: 36px; padding: 0 12px; flex-shrink: 0;
          background: #edf5ea; border: 1.5px solid #d4e8cc; border-left: none;
          border-radius: 0 7px 7px 0; display: flex; align-items: center;
          justify-content: center; gap: 5px;
          cursor: pointer; color: #3a6048;
          font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 500;
          transition: background 0.12s; white-space: nowrap;
        }
        .vor-input-btn:hover { background: #ddf0e0; }

        .vor-rw { border-top: 1px solid #edf5e8; overflow-x: auto; }
        .vor-rb {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4;
        }
        .vor-rbl { display: flex; align-items: center; gap: 8px; }
        .vor-rbl-l { font-size: 11px; font-weight: 600; color: #4a7060; text-transform: uppercase; letter-spacing: 0.5px; }

        .vor-rt { width: 100%; border-collapse: collapse; font-size: 13px; }
        .vor-rt th {
          background: #f4f9f2; padding: 6px 8px; text-align: left;
          font-size: 10px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .vor-rt td { padding: 6px 8px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; font-size: 12px; }
        .vor-rem { text-align: center; padding: 28px 12px; color: #96b8a0; font-size: 12.5px; }

        .vor-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: vorFadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .vor-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .vor-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .vor-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        .vor-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .vor-footer-left { display: flex; align-items: center; gap: 20px; }
        .vor-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .vor-footer-stat strong { color: #1a2e22; font-weight: 600; }

        .vor-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.35);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; animation: vorFadeIn 0.15s ease;
        }
        .vor-modal {
          background: #fff; border-radius: 14px; max-width: 900px; width: 94%;
          max-height: 85vh; overflow-y: auto; box-shadow: 0 12px 40px rgba(0,0,0,0.18);
        }
        .vor-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .vor-modal-title { font-size: 13px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.5px; }
        .vor-modal-body { padding: 20px; }
        .vor-modal-close {
          background: transparent; border: none; cursor: pointer; color: #96b8a0;
          padding: 4px 8px; border-radius: 6px; font-size: 18px; line-height: 1;
        }
        .vor-modal-close:hover { background: #f0f4ee; color: #5a8068; }

        .vor-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .vor-col-3 { grid-column: span 3; }
        .vor-col-4 { grid-column: span 4; }
        .vor-col-6 { grid-column: span 6; }
        .vor-col-12 { grid-column: span 12; }

        @keyframes vorSpin { to { transform: rotate(360deg); } }
        .vor-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: vorSpin 0.65s linear infinite;
        }
        .vor-spinner-dark {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid #d4e8cc; border-top-color: #3e9654;
          border-radius: 50%; animation: vorSpin 0.65s linear infinite;
        }
        @keyframes vorFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="vor-root">
        {/* ── TOPBAR ── */}
        <header className="vor-topbar">
          <div className="vor-topbar-left">
            <div className="vor-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="vor-app-name">
              Venture<span className="vor-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="vor-screen-title">VVOR0202 — Cadastro de Itens por Fornecedor</span>
          </div>
        </header>

        {/* ── ACTION BAR ── */}
        <div className="vor-actionbar">
          <div className="vor-action-group">
            <span className="vor-action-label">Ações</span>
            <button className="vor-btn vor-btn-primary" onClick={() => void handleSalvar()} disabled={isSaving}>
              {isSaving
                ? <><div className="vor-spinner" />Salvando...</>
                : <>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                      <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    Salvar
                  </>
              }
            </button>
            <button className="vor-btn vor-btn-danger" onClick={handleLimpar} disabled={isSaving}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Limpar
            </button>
          </div>
          <div className="vor-action-group">
            <button className="vor-btn vor-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Ajuda
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="vor-body">
          {feedback && (
            <div className={`vor-feedback ${feedback.type}`}>
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

          {/* SEÇÃO 1 — SELEÇÃO DE ITEM */}
          <div className="vor-section-banner">
            <span className="vor-section-banner-pill">1 — Item</span>
            <div className="vor-section-banner-line" />
            <span className="vor-section-banner-hint">Selecione um item e clique em Configurar</span>
          </div>

          <div className="vor-card">
            <div className="vor-card-header">
              <div className="vor-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
                <span className="vor-card-title">Configuração do Item</span>
              </div>
            </div>
            <div className="vor-card-body" style={{ paddingBottom: 14 }}>
              <div className="vor-filter-row">
                <div className="vor-field" style={{ flex: "0 0 180px" }}>
                  <label className="vor-label">Item</label>
                  <div className="vor-input-wrap">
                    <select
                      className="vor-select"
                      style={{ borderRadius: "7px 0 0 7px" }}
                      value={itemSel}
                      onChange={(e) => setItemSel(e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {ITENS_MOCK.map((it) => (
                        <option key={it.code} value={it.code}>{it.code} - {it.nome}</option>
                      ))}
                    </select>
                    <button className="vor-input-btn" onClick={() => void handleConfigurar()} disabled={isLoading}>
                      {isLoading
                        ? <div className="vor-spinner-dark" style={{ width: 12, height: 12 }} />
                        : "Config."
                      }
                    </button>
                  </div>
                </div>
                <div className="vor-field" style={{ flex: "0 0 280px" }}>
                  <label className="vor-label">Configurado</label>
                  <input className="vor-input" value={configurado} placeholder="Nenhum" disabled />
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2 — GRID */}
          {rows.length > 0 && (
            <>
              <div className="vor-section-banner">
                <span className="vor-section-banner-pill">2 — Grid</span>
                <div className="vor-section-banner-line" />
                <span className="vor-section-banner-hint">{rows.length} item(ns) configurado(s)</span>
              </div>

              <div className="vor-card">
                <div className="vor-rw">
                  <table className="vor-rt">
                    <thead>
                      <tr>
                        <th style={{ width: 90 }}>Cód. Item For.</th>
                        <th style={{ width: 160 }}>Desc Item X Fornecedor</th>
                        <th style={{ width: 60 }}>UM</th>
                        <th style={{ width: 90 }}>Unid. Med. XML</th>
                        <th style={{ width: 70 }}>Fat. Conv.</th>
                        <th style={{ width: 100 }}>Qtde Embal.</th>
                        <th style={{ width: 100 }}>Preferencial</th>
                        <th style={{ width: 50 }}>UF</th>
                        <th style={{ width: 60 }}>Class.</th>
                        <th style={{ width: 80 }}>Data Clas.</th>
                        <th style={{ width: 50 }}>Nota</th>
                        <th style={{ width: 80 }}>Fat. Direto</th>
                        <th style={{ width: 90 }}>Ped. Terc.</th>
                        <th style={{ width: 100 }}>Desc. Adic.</th>
                        <th style={{ width: 100 }}>Cód. Barra</th>
                        <th style={{ width: 100 }}>Observação</th>
                        <th style={{ width: 90 }}>Dt. Validade</th>
                        <th style={{ width: 80 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, color: "#1a4a2a" }}>{r.codItemFor}</td>
                          <td>{r.descItemFor}</td>
                          <td>
                            <select className="vor-select" style={{ height: 28, fontSize: 11, padding: "0 22px 0 6px" }} value={r.um} onChange={(e) => setFieldRow(i, "um", e.target.value)}>
                              {UM_OPTS.map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </td>
                          <td><input className="vor-input" style={{ height: 28, fontSize: 11, padding: "0 6px" }} value={r.unidMedXml} onChange={(e) => setFieldRow(i, "unidMedXml", e.target.value)} /></td>
                          <td><input className="vor-input" style={{ height: 28, fontSize: 11, padding: "0 6px", width: 60 }} value={r.fatConv} onChange={(e) => setFieldRow(i, "fatConv", e.target.value)} /></td>
                          <td><input className="vor-input" style={{ height: 28, fontSize: 11, padding: "0 6px", width: 70 }} value={r.qtdeEmbalagem} onChange={(e) => setFieldRow(i, "qtdeEmbalagem", e.target.value)} /></td>
                          <td>
                            <select className="vor-select" style={{ height: 28, fontSize: 11, padding: "0 22px 0 6px" }} value={r.preferencial} onChange={(e) => setFieldRow(i, "preferencial", e.target.value)}>
                              {PREFERENCIAL_OPTS.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </td>
                          <td><input className="vor-input" style={{ height: 28, fontSize: 11, padding: "0 6px", width: 40 }} value={r.uf} onChange={(e) => setFieldRow(i, "uf", e.target.value)} /></td>
                          <td>
                            <select className="vor-select" style={{ height: 28, fontSize: 11, padding: "0 22px 0 6px" }} value={r.classificacao} onChange={(e) => setFieldRow(i, "classificacao", e.target.value)}>
                              {CLASS_OPTS.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          <td><input type="date" className="vor-input" style={{ height: 28, fontSize: 11, padding: "0 6px" }} value={r.dataClas} onChange={(e) => setFieldRow(i, "dataClas", e.target.value)} /></td>
                          <td><input className="vor-input" style={{ height: 28, fontSize: 11, padding: "0 6px", width: 40 }} value={r.nota} onChange={(e) => setFieldRow(i, "nota", e.target.value)} /></td>
                          <td style={{ textAlign: "center" }}>
                            <label className="vor-toggle" style={{ width: 32, height: 16 }}>
                              <input type="checkbox" checked={r.fatDireto} onChange={(e) => setFieldRow(i, "fatDireto", e.target.checked)} />
                              <div className="vor-toggle-track" />
                              <div className="vor-toggle-thumb" style={{ width: 10, height: 10, top: 3, left: 3 }} />
                            </label>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <label className="vor-toggle" style={{ width: 32, height: 16 }}>
                              <input type="checkbox" checked={r.pedTerceiros} onChange={(e) => setFieldRow(i, "pedTerceiros", e.target.checked)} />
                              <div className="vor-toggle-track" />
                              <div className="vor-toggle-thumb" style={{ width: 10, height: 10, top: 3, left: 3 }} />
                            </label>
                          </td>
                          <td>
                            <select className="vor-select" style={{ height: 28, fontSize: 11, padding: "0 22px 0 6px" }} value={r.descAdic} onChange={(e) => setFieldRow(i, "descAdic", e.target.value)}>
                              {DESC_ADIC_OPTS.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </td>
                          <td><input className="vor-input" style={{ height: 28, fontSize: 11, padding: "0 6px", width: 110 }} value={r.codBarra} onChange={(e) => setFieldRow(i, "codBarra", e.target.value)} /></td>
                          <td><input className="vor-input" style={{ height: 28, fontSize: 11, padding: "0 6px", width: 100 }} value={r.observacao} onChange={(e) => setFieldRow(i, "observacao", e.target.value)} /></td>
                          <td><input type="date" className="vor-input" style={{ height: 28, fontSize: 11, padding: "0 6px" }} value={r.dtValidade} onChange={(e) => setFieldRow(i, "dtValidade", e.target.value)} /></td>
                          <td>
                            <button className="vor-btn vor-btn-ghost" style={{ height: 26, fontSize: 11, padding: "0 7px" }} onClick={() => openPdm(i)}>PDM</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="vor-card-body" style={{ display: "flex", gap: 8, borderTop: "1px solid #edf5e8" }}>
                  <button className="vor-btn vor-btn-ghost" onClick={() => setShowQualidade(true)}>
                    Dados da Qualidade
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── FOOTER ── */}
        <footer className="vor-footer">
          <div className="vor-footer-left">
            <div className="vor-footer-stat">Itens: <strong>{rows.length}</strong></div>
            <div className="vor-footer-stat">Módulo: <strong>Suprimento</strong></div>
          </div>
          <div className="vor-footer-stat" style={{ gap: 8 }}>
            <span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>
      </div>

      {/* ── MODAL: DADOS DA QUALIDADE ── */}
      {showQualidade && (
        <div className="vor-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowQualidade(false)}>
          <div className="vor-modal">
            <div className="vor-modal-header">
              <span className="vor-modal-title">Dados da Qualidade</span>
              <button className="vor-modal-close" onClick={() => setShowQualidade(false)}>×</button>
            </div>
            <div className="vor-modal-body">
              <table className="vor-rt">
                <thead>
                  <tr>
                    <th>Campo</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {qualidadeData.map((q, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{q.campo}</td>
                      <td>{q.valor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PDM ── */}
      {showPdm && (
        <div className="vor-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowPdm(false)}>
          <div className="vor-modal" style={{ maxWidth: 1000 }}>
            <div className="vor-modal-header">
              <span className="vor-modal-title">PDM — Item {pdmRowIndex != null ? rows[pdmRowIndex].descItemFor : ""}</span>
              <button className="vor-modal-close" onClick={() => setShowPdm(false)}>×</button>
            </div>
            <div className="vor-modal-body">
              <div className="vor-grid">
                <div className="vor-field vor-col-6">
                  <label className="vor-label">Grupo</label>
                  <select className="vor-select" value={pdmGrupo} onChange={(e) => setPdmGrupo(e.target.value)}>
                    <option value="">Selecione...</option>
                    <option value="DIMENSIONAL">Dimensional</option>
                    <option value="VISUAL">Visual</option>
                    <option value="FUNCIONAL">Funcional</option>
                  </select>
                </div>
                <div className="vor-field vor-col-6">
                  <label className="vor-label">Modificador</label>
                  <select className="vor-select" value={pdmModificador} onChange={(e) => setPdmModificador(e.target.value)}>
                    <option value="">Selecione...</option>
                    <option value="PADRÃO">Padrão</option>
                    <option value="ESPECIAL">Especial</option>
                    <option value="CRÍTICO">Crítico</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
                <button className="vor-btn vor-btn-ghost" style={{ height: 28, fontSize: 11 }}>Cadastro de Grupos</button>
                <button className="vor-btn vor-btn-ghost" style={{ height: 28, fontSize: 11 }}>Cadastro de Modificadores</button>
                <button className="vor-btn vor-btn-ghost" style={{ height: 28, fontSize: 11 }}>Cadastro de Atributos</button>
              </div>

              <div className="vor-section-banner" style={{ paddingTop: 0 }}>
                <span className="vor-section-banner-pill">Atributos PDM</span>
                <div className="vor-section-banner-line" />
              </div>

              {/* Add PDM row */}
              <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div className="vor-field" style={{ flex: "0 0 60px" }}><label className="vor-label" style={{ fontSize: 9.5 }}>Cód.</label><input className="vor-input" style={{ height: 30, fontSize: 11, padding: "0 6px" }} value={novoPdm.codigo} onChange={(e) => setNovoPdm((p) => ({ ...p, codigo: e.target.value }))} /></div>
                <div className="vor-field" style={{ flex: "0 0 120px" }}><label className="vor-label" style={{ fontSize: 9.5 }}>Atributo</label><input className="vor-input" style={{ height: 30, fontSize: 11, padding: "0 6px" }} value={novoPdm.atributo} onChange={(e) => setNovoPdm((p) => ({ ...p, atributo: e.target.value }))} /></div>
                <div className="vor-field" style={{ flex: "0 0 70px" }}><label className="vor-label" style={{ fontSize: 9.5 }}>Tam.</label><input className="vor-input" style={{ height: 30, fontSize: 11, padding: "0 6px" }} value={novoPdm.tamanho} onChange={(e) => setNovoPdm((p) => ({ ...p, tamanho: e.target.value }))} /></div>
                <div className="vor-field" style={{ flex: "0 0 50px" }}><label className="vor-label" style={{ fontSize: 9.5 }}>E/C</label><input className="vor-input" style={{ height: 30, fontSize: 11, padding: "0 6px" }} value={novoPdm.ec} onChange={(e) => setNovoPdm((p) => ({ ...p, ec: e.target.value }))} /></div>
                <div className="vor-field" style={{ flex: "0 0 70px" }}><label className="vor-label" style={{ fontSize: 9.5 }}>Txt A.</label><input className="vor-input" style={{ height: 30, fontSize: 11, padding: "0 6px" }} value={novoPdm.txtA} onChange={(e) => setNovoPdm((p) => ({ ...p, txtA: e.target.value }))} /></div>
                <div className="vor-field" style={{ flex: "0 0 70px" }}><label className="vor-label" style={{ fontSize: 9.5 }}>Txt P.</label><input className="vor-input" style={{ height: 30, fontSize: 11, padding: "0 6px" }} value={novoPdm.txtP} onChange={(e) => setNovoPdm((p) => ({ ...p, txtP: e.target.value }))} /></div>
                <div className="vor-field" style={{ flex: "0 0 100px" }}><label className="vor-label" style={{ fontSize: 9.5 }}>Conteúdo</label><input className="vor-input" style={{ height: 30, fontSize: 11, padding: "0 6px" }} value={novoPdm.conteudo} onChange={(e) => setNovoPdm((p) => ({ ...p, conteudo: e.target.value }))} /></div>
                <div className="vor-field" style={{ flex: "0 0 100px" }}><label className="vor-label" style={{ fontSize: 9.5 }}>Abreviações</label><input className="vor-input" style={{ height: 30, fontSize: 11, padding: "0 6px" }} value={novoPdm.abreviacoes} onChange={(e) => setNovoPdm((p) => ({ ...p, abreviacoes: e.target.value }))} /></div>
                <button className="vor-btn vor-btn-primary" style={{ height: 30, fontSize: 11 }} onClick={addPdmAttr}>+ Adicionar</button>
              </div>

              {pdmAttrs.length === 0 ? (
                <div className="vor-rem">Nenhum atributo PDM cadastrado.</div>
              ) : (
                <table className="vor-rt">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Cód.</th>
                      <th>Atributo</th>
                      <th style={{ width: 60 }}>Tam.</th>
                      <th style={{ width: 50 }}>E/C</th>
                      <th>Txt A.</th>
                      <th>Txt P.</th>
                      <th>Conteúdo</th>
                      <th>Abreviações</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pdmAttrs.map((a, i) => (
                      <tr key={i}>
                        <td>{a.codigo}</td>
                        <td>{a.atributo}</td>
                        <td>{a.tamanho}</td>
                        <td>{a.ec}</td>
                        <td>{a.txtA}</td>
                        <td>{a.txtP}</td>
                        <td>{a.conteudo}</td>
                        <td>{a.abreviacoes}</td>
                        <td><button className="vor-btn vor-btn-danger" style={{ height: 24, fontSize: 10, padding: "0 6px" }} onClick={() => removePdmAttr(i)}>Rem.</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16, paddingTop: 16, borderTop: "1px solid #edf5e8" }}>
                <button className="vor-btn vor-btn-ghost" onClick={() => setShowPdm(false)}>Cancelar</button>
                <button className="vor-btn vor-btn-primary" onClick={savePdm}>Salvar PDM</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

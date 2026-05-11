import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Aba = "mensal" | "semanal";
type ModoForm = "novo" | "edicao";
type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface PrevisaoItem {
  id: number;
  item: string;
  descricao: string;
  unidade: string;
  aceitaFracionado: boolean;
  quantidade: number;
  semanas: number[];     // always 6 positions; empty weeks = 0
  qtdSemanas: number;    // 4, 5 or 6
}

interface ModalSemanalState {
  aberto: boolean;
  itemIdx: number;
  semanas: number[];
  qtdSemanas: number;
}

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

let nextId = 1;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function distribuirPorSemanas(qtd: number, qtdSemanas: number, aceitaFracionado: boolean): number[] {
  const base = aceitaFracionado
    ? qtd / qtdSemanas
    : Math.floor(qtd / qtdSemanas);

  const arr = new Array<number>(6).fill(0);
  let restante = qtd;
  for (let i = 0; i < qtdSemanas - 1; i++) {
    arr[i] = base;
    restante -= base;
  }
  arr[qtdSemanas - 1] = aceitaFracionado
    ? parseFloat(restante.toFixed(4))
    : Math.round(restante);
  return arr;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Vpre0201Page(): JSX.Element {
  const [aba, setAba]           = useState<Aba>("mensal");
  const [ano, setAno]           = useState(String(new Date().getFullYear()));
  const [mes, setMes]           = useState(String(new Date().getMonth() + 1));
  const [empresa, setEmpresa]   = useState("");
  const [itens, setItens]       = useState<PrevisaoItem[]>([]);
  const [, setModoForm] = useState<ModoForm>("novo");
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  // Form para adicionar/editar item na aba mensal
  const [formItem, setFormItem]           = useState("");
  const [formDesc, setFormDesc]           = useState("");
  const [formUnidade, setFormUnidade]     = useState("UN");
  const [formQtd, setFormQtd]             = useState("");
  const [formFracionado, setFormFracionado] = useState(false);
  const [formSemanas, setFormSemanas]     = useState("5");
  const [editingId, setEditingId]         = useState<number | null>(null);
  const [formErrors, setFormErrors]       = useState<Record<string, string>>({});

  // Modal de manutenção semanal
  const [modal, setModal] = useState<ModalSemanalState>({
    aberto: false, itemIdx: -1, semanas: [], qtdSemanas: 5,
  });
  const [modalErrors, setModalErrors] = useState("");

  const setFormField = useCallback((key: string, val: string | boolean) => {
    const setters: Record<string, (v: string | boolean) => void> = {
      item: (v) => setFormItem(v as string),
      desc: (v) => setFormDesc(v as string),
      unidade: (v) => setFormUnidade(v as string),
      qtd: (v) => setFormQtd(v as string),
      fracionado: (v) => setFormFracionado(v as boolean),
      semanas: (v) => setFormSemanas(v as string),
    };
    setters[key]?.(val);
    setFormErrors((p) => ({ ...p, [key]: undefined as unknown as string }));
    setFeedback(null);
  }, []);

  function validateForm(): boolean {
    const e: Record<string, string> = {};
    if (!formItem.trim()) e.item = "Código do item obrigatório.";
    const q = parseFloat(formQtd);
    if (!formQtd || isNaN(q) || q <= 0) e.qtd = "Quantidade deve ser um número positivo.";
    const s = parseInt(formSemanas, 10);
    if (isNaN(s) || s < 4 || s > 6) e.semanas = "Número de semanas deve ser entre 4 e 6.";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleAdicionarItem() {
    if (!validateForm()) return;
    const qtd = parseFloat(formQtd);
    const nSemanas = parseInt(formSemanas, 10);
    const semsDistrib = distribuirPorSemanas(qtd, nSemanas, formFracionado);

    const novo: PrevisaoItem = {
      id: editingId ?? nextId++,
      item: formItem.trim(),
      descricao: formDesc.trim(),
      unidade: formUnidade.trim() || "UN",
      aceitaFracionado: formFracionado,
      quantidade: qtd,
      semanas: semsDistrib,
      qtdSemanas: nSemanas,
    };

    if (editingId !== null) {
      setItens((p) => p.map((it) => it.id === editingId ? novo : it));
      setFeedback({ type: "success", message: `Item ${novo.item} atualizado.` });
      setEditingId(null);
    } else {
      setItens((p) => [...p, novo]);
      setFeedback({ type: "success", message: `Item ${novo.item} adicionado à previsão.` });
    }

    setFormItem(""); setFormDesc(""); setFormUnidade("UN"); setFormQtd("");
    setFormFracionado(false); setFormSemanas("5"); setFormErrors({});
    setModoForm("edicao");
  }

  function handleEditarItem(it: PrevisaoItem) {
    setFormItem(it.item);
    setFormDesc(it.descricao);
    setFormUnidade(it.unidade);
    setFormQtd(String(it.quantidade));
    setFormFracionado(it.aceitaFracionado);
    setFormSemanas(String(it.qtdSemanas));
    setEditingId(it.id);
    setFormErrors({});
    setFeedback(null);
    setAba("mensal");
  }

  function handleRemoverItem(id: number) {
    setItens((p) => p.filter((it) => it.id !== id));
    if (editingId === id) { setEditingId(null); setFormItem(""); }
    setFeedback({ type: "info", message: "Item removido da previsão." });
  }

  function handleAbrirModalSemanal(idx: number) {
    const it = itens[idx];
    setModal({ aberto: true, itemIdx: idx, semanas: [...it.semanas], qtdSemanas: it.qtdSemanas });
    setModalErrors("");
  }

  function handleSalvarModal() {
    const it = itens[modal.itemIdx];
    const total = modal.semanas.slice(0, modal.qtdSemanas).reduce((a, b) => a + b, 0);
    const diff = Math.abs(total - it.quantidade);
    if (!it.aceitaFracionado && diff > 0.01) {
      setModalErrors(`A soma das semanas (${total}) deve ser igual à quantidade mensal (${it.quantidade}).`);
      return;
    }
    setItens((p) => p.map((item, i) =>
      i === modal.itemIdx ? { ...item, semanas: [...modal.semanas] } : item
    ));
    setModal((p) => ({ ...p, aberto: false }));
    setFeedback({ type: "success", message: "Quantidades semanais atualizadas." });
  }

  function handleSalvar() {
    if (itens.length === 0) {
      setFeedback({ type: "error", message: "Nenhum item na previsão para salvar." });
      return;
    }
    setFeedback({ type: "success", message: `Previsão de ${MESES[parseInt(mes, 10) - 1]}/${ano} salva com sucesso (${itens.length} item(ns)).` });
  }

  function handleNovo() {
    setItens([]); setEditingId(null); setModoForm("novo");
    setFormItem(""); setFormDesc(""); setFormUnidade("UN"); setFormQtd("");
    setFormFracionado(false); setFormSemanas("5"); setFormErrors({});
    setFeedback(null);
  }

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .pre201-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .pre201-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 110px 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .pre201-topbar-left { display: flex; align-items: center; gap: 10px; }
        .pre201-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .pre201-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .pre201-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .pre201-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }
        .pre201-screen-badge {
          font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
          background: rgba(62,150,84,0.15); color: #7ecb8f;
          border: 1px solid rgba(62,150,84,0.25); border-radius: 5px;
          padding: 3px 8px;
        }

        .pre201-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .pre201-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .pre201-action-group:last-child { border-right: none; }
        .pre201-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .pre201-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .pre201-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .pre201-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .pre201-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .pre201-btn-ghost:hover:not(:disabled) { background: #f0f8ec; }
        .pre201-btn-new { background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600; }
        .pre201-btn-new:hover:not(:disabled) { background: #dff5e4; }

        .pre201-body {
          flex: 1; padding: 16px 20px;
          display: flex; flex-direction: column; overflow-y: auto;
        }
        .pre201-body::-webkit-scrollbar { width: 5px; }
        .pre201-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .pre201-section-banner {
          display: flex; align-items: center; gap: 10px; padding: 14px 0 8px;
        }
        .pre201-section-banner:first-child { padding-top: 0; }
        .pre201-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .pre201-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .pre201-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .pre201-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .pre201-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .pre201-card-header-left { display: flex; align-items: center; gap: 8px; }
        .pre201-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .pre201-card-body { padding: 18px; }

        .pre201-tabs-bar {
          display: flex; align-items: flex-end;
          border-bottom: 2px solid #dbe8d5; background: #fafcf9;
        }
        .pre201-tab {
          padding: 10px 20px; font-size: 12.5px; font-weight: 500;
          color: #6a8a74; cursor: pointer; border: none; background: transparent;
          border-bottom: 2px solid transparent; margin-bottom: -2px;
          transition: color 0.13s, border-color 0.13s; white-space: nowrap;
          font-family: 'Inter', sans-serif;
        }
        .pre201-tab:hover { color: #2a4a35; }
        .pre201-tab.active { color: #162e20; border-bottom-color: #3e9654; font-weight: 600; }
        .pre201-tab-body { padding: 18px; }

        .pre201-filter-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
        .pre201-filter-field { display: flex; flex-direction: column; gap: 5px; }
        .pre201-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .pre201-label-req { color: #c84040; font-size: 12px; }
        .pre201-input {
          height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .pre201-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .pre201-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .pre201-input.has-error { border-color: #e05252; }
        .pre201-select {
          height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none; appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
        }
        .pre201-select:focus { border-color: #3e9654; }
        .pre201-toggle-row { display: flex; align-items: center; gap: 8px; height: 36px; }
        .pre201-toggle { position: relative; width: 34px; height: 18px; flex-shrink: 0; cursor: pointer; }
        .pre201-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .pre201-toggle-track { position: absolute; inset: 0; background: #d4e0d0; border-radius: 20px; transition: background 0.2s; }
        .pre201-toggle input:checked ~ .pre201-toggle-track { background: #3e9654; }
        .pre201-toggle-thumb { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; background: #fff; border-radius: 50%; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
        .pre201-toggle input:checked ~ .pre201-toggle-thumb { transform: translateX(16px); }
        .pre201-toggle-label { font-size: 12.5px; color: #3a5a45; }

        .pre201-field-error { font-size: 11px; color: #c84040; margin-top: 2px; }
        .pre201-field-hint  { font-size: 11px; color: #7a9c84; margin-top: 2px; }

        .pre201-form-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 0; }
        .pre201-form-field { display: flex; flex-direction: column; gap: 5px; }

        .pre201-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; margin-bottom: 14px;
          animation: pre201FadeIn 0.2s ease;
        }
        .pre201-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .pre201-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .pre201-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        /* ── TABELA MENSAL / SEMANAL ── */
        .pre201-table-wrap { overflow-x: auto; }
        .pre201-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .pre201-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .pre201-table th.num { text-align: right; }
        .pre201-table th.sem-header { text-align: right; min-width: 90px; background: #eef9f0; color: #2a5838; }
        .pre201-table th.sem-empty { background: #f8f8f8; color: #ccc; min-width: 90px; }
        .pre201-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .pre201-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
        .pre201-table td.sem-cell { text-align: right; font-variant-numeric: tabular-nums; color: #1a4030; }
        .pre201-table td.sem-empty-cell { background: #f8f8f8; color: #ccc; text-align: right; }
        .pre201-table tbody tr:hover { background: #eef9f0; }
        .pre201-table-empty { text-align: center; padding: 32px 12px; color: #96b8a0; font-size: 12.5px; }

        .pre201-item-link {
          color: #2a6040; font-weight: 600; cursor: pointer; text-decoration: underline;
          text-underline-offset: 2px; font-size: 13px;
        }
        .pre201-item-link:hover { color: #1a4030; }

        .pre201-act-btn {
          background: none; border: 1px solid #d4e8cc; border-radius: 6px;
          cursor: pointer; padding: 3px 8px; font-size: 11px; color: #4a7060;
          font-family: 'Inter', sans-serif; transition: background 0.12s; margin-right: 4px;
        }
        .pre201-act-btn:hover { background: #eef9f0; }
        .pre201-act-btn.danger { color: #b94040; border-color: #f0c8c8; }
        .pre201-act-btn.danger:hover { background: #fdecea; }

        .pre201-obs-box {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 10px 14px; background: #f0f8ff;
          border: 1px solid #c7def8; border-left: 3px solid #4a90d9;
          border-radius: 8px; font-size: 12px; color: #1a4070; line-height: 1.55;
          margin-bottom: 14px;
        }

        /* ── MODAL ── */
        .pre201-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; animation: pre201FadeIn 0.15s ease;
        }
        .pre201-modal {
          background: #fff; border-radius: 14px; width: 640px; max-width: 92vw;
          display: flex; flex-direction: column;
          box-shadow: 0 8px 40px rgba(0,0,0,0.2);
        }
        .pre201-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; border-bottom: 1px solid #edf5e8;
        }
        .pre201-modal-title { font-size: 13.5px; font-weight: 600; color: #162e20; }
        .pre201-modal-close {
          background: none; border: none; cursor: pointer; color: #8aaa94;
          padding: 4px; border-radius: 6px; display: flex; align-items: center;
          transition: background 0.12s;
        }
        .pre201-modal-close:hover { background: #f0f4ee; color: #3a5a45; }
        .pre201-modal-body { padding: 20px; }
        .pre201-modal-footer {
          padding: 12px 20px; border-top: 1px solid #edf5e8;
          display: flex; justify-content: space-between; align-items: center; gap: 8px;
        }
        .pre201-modal-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .pre201-modal-field { display: flex; flex-direction: column; gap: 5px; }
        .pre201-modal-input {
          width: 100%; height: 38px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 14px; color: #1a2e22; outline: none; text-align: right;
          transition: border-color 0.13s;
        }
        .pre201-modal-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .pre201-modal-input:disabled { background: #f0f4f0; color: #b0c8b8; cursor: not-allowed; }
        .pre201-modal-total {
          padding: 12px 16px; background: #f4f9f2; border: 1px solid #dbe8d5;
          border-radius: 8px; display: flex; align-items: center; justify-content: space-between;
          font-size: 13px; margin-top: 16px;
        }
        .pre201-modal-err { font-size: 11.5px; color: #b91c1c; margin-top: 8px; }

        .pre201-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .pre201-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .pre201-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes pre201FadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="pre201-root">

        {/* ── TOPBAR ── */}
        <header className="pre201-topbar">
          <div className="pre201-topbar-left">
            <div className="pre201-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5"   width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5"  width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5"  width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="pre201-app-name">
              Venture <span className="pre201-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="pre201-screen-title">VPRE0201 — Cadastro da Previsão de Vendas</span>
          </div>
          <span className="pre201-screen-badge">PLANEJAMENTO</span>
        </header>

        {/* ── ACTION BAR ── */}
        <div className="pre201-actionbar">
          <div className="pre201-action-group">
            <span className="pre201-action-label">Cadastro</span>
            <button type="button" className="pre201-btn pre201-btn-new" onClick={handleNovo}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Nova Previsão
            </button>
            <button type="button" className="pre201-btn pre201-btn-primary" onClick={handleSalvar}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Salvar
            </button>
          </div>
          <div className="pre201-action-group">
            <button type="button" className="pre201-btn pre201-btn-ghost">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M7 4.5v3M7 9.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Ajuda
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="pre201-body">

          {feedback && (
            <div className={`pre201-feedback ${feedback.type}`}>
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

          {/* ── FILTROS ── */}
          <div className="pre201-section-banner">
            <span className="pre201-section-banner-pill">1 — Período</span>
            <div className="pre201-section-banner-line" />
            <span className="pre201-section-banner-hint">Selecione o mês e empresa</span>
          </div>

          <div className="pre201-card">
            <div className="pre201-card-body" style={{ paddingBottom: 14 }}>
              <div className="pre201-filter-row">
                <div className="pre201-filter-field">
                  <label className="pre201-label">Ano</label>
                  <input className="pre201-input" style={{ width: 100 }} type="number" min="2000" max="2099" value={ano} onChange={(e) => setAno(e.target.value)} />
                </div>
                <div className="pre201-filter-field">
                  <label className="pre201-label">Mês</label>
                  <select className="pre201-select" style={{ width: 160 }} value={mes} onChange={(e) => setMes(e.target.value)}>
                    {MESES.map((m, i) => (
                      <option key={i} value={String(i + 1)}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="pre201-filter-field">
                  <label className="pre201-label">Empresa</label>
                  <input className="pre201-input" style={{ width: 180 }} type="text" placeholder="Código ou nome..." value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* ── ADICIONAR ITEM ── */}
          <div className="pre201-section-banner">
            <span className="pre201-section-banner-pill">2 — {editingId !== null ? "Editar Item" : "Adicionar Item"}</span>
            <div className="pre201-section-banner-line" />
            <span className="pre201-section-banner-hint">A previsão é distribuída por semana conforme dias úteis do calendário industrial</span>
          </div>

          <div className="pre201-card">
            <div className="pre201-card-header">
              <div className="pre201-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3h10v10H3z" stroke="#3e9654" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M6 8h4M8 6v4" stroke="#3e9654" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <span className="pre201-card-title">Dados do Item</span>
              </div>
            </div>
            <div className="pre201-card-body">
              <div className="pre201-form-row">
                <div className="pre201-form-field">
                  <label className="pre201-label">Item <span className="pre201-label-req">*</span></label>
                  <input className={`pre201-input${formErrors.item ? " has-error" : ""}`} style={{ width: 120 }} type="text" placeholder="Código..." value={formItem} onChange={(e) => setFormField("item", e.target.value)} />
                  {formErrors.item && <span className="pre201-field-error">⚠ {formErrors.item}</span>}
                </div>
                <div className="pre201-form-field" style={{ flex: 1 }}>
                  <label className="pre201-label">Descrição</label>
                  <input className="pre201-input" style={{ width: "100%", minWidth: 200 }} type="text" placeholder="Descrição do item..." value={formDesc} onChange={(e) => setFormField("desc", e.target.value)} />
                </div>
                <div className="pre201-form-field">
                  <label className="pre201-label">Unidade</label>
                  <input className="pre201-input" style={{ width: 80 }} type="text" placeholder="UN" value={formUnidade} onChange={(e) => setFormField("unidade", e.target.value)} />
                </div>
                <div className="pre201-form-field">
                  <label className="pre201-label">Qtd. Mensal <span className="pre201-label-req">*</span></label>
                  <input className={`pre201-input${formErrors.qtd ? " has-error" : ""}`} style={{ width: 120 }} type="number" min="0" step="0.001" placeholder="0,000" value={formQtd} onChange={(e) => setFormField("qtd", e.target.value)} />
                  {formErrors.qtd && <span className="pre201-field-error">⚠ {formErrors.qtd}</span>}
                </div>
                <div className="pre201-form-field">
                  <label className="pre201-label">Semanas/Mês <span className="pre201-label-req">*</span></label>
                  <select className="pre201-select" style={{ width: 100 }} value={formSemanas} onChange={(e) => setFormField("semanas", e.target.value)}>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                  </select>
                  {formErrors.semanas && <span className="pre201-field-error">⚠ {formErrors.semanas}</span>}
                </div>
                <div className="pre201-form-field">
                  <label className="pre201-label">Aceita Fracionado</label>
                  <div className="pre201-toggle-row">
                    <label className="pre201-toggle">
                      <input type="checkbox" checked={formFracionado} onChange={(e) => setFormField("fracionado", e.target.checked)} />
                      <span className="pre201-toggle-track" />
                      <span className="pre201-toggle-thumb" />
                    </label>
                    <span className="pre201-toggle-label">{formFracionado ? "Sim" : "Não"}</span>
                  </div>
                </div>
                <div className="pre201-form-field">
                  <label className="pre201-label" style={{ visibility: "hidden" }}>.</label>
                  <button type="button" className="pre201-btn pre201-btn-primary" onClick={handleAdicionarItem}>
                    {editingId !== null ? "Atualizar" : "Adicionar"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── PREVISÃO ── */}
          <div className="pre201-section-banner">
            <span className="pre201-section-banner-pill">3 — Previsão: {MESES[parseInt(mes, 10) - 1]}/{ano}</span>
            <div className="pre201-section-banner-line" />
            <span className="pre201-section-banner-hint">{itens.length} item(ns)</span>
          </div>

          <div className="pre201-card">
            {/* TABS */}
            <div className="pre201-tabs-bar">
              <button type="button" className={`pre201-tab${aba === "mensal" ? " active" : ""}`} onClick={() => setAba("mensal")}>
                Pasta Mensal
              </button>
              <button type="button" className={`pre201-tab${aba === "semanal" ? " active" : ""}`} onClick={() => setAba("semanal")}>
                Pasta Semanal
              </button>
            </div>

            {/* ── ABA MENSAL ── */}
            {aba === "mensal" && (
              <div className="pre201-table-wrap">
                <table className="pre201-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Descrição</th>
                      <th>Unidade</th>
                      <th className="num">Qtd. Mensal</th>
                      <th>Semanas</th>
                      <th>Fracionado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="pre201-table-empty">
                          Nenhum item cadastrado. Adicione itens acima.
                        </td>
                      </tr>
                    ) : itens.map((it) => (
                      <tr key={it.id}>
                        <td><code style={{ background: "#edf5ea", padding: "2px 6px", borderRadius: 4, fontSize: 12, cursor: "pointer", color: "#1a5030" }}>{it.item}</code></td>
                        <td style={{ color: "#5a7870" }}>{it.descricao || "—"}</td>
                        <td style={{ color: "#7a9c84" }}>{it.unidade}</td>
                        <td className="num"><strong>{it.quantidade.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</strong></td>
                        <td style={{ color: "#4a7060" }}>{it.qtdSemanas}</td>
                        <td>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
                            background: it.aceitaFracionado ? "#e8f5e0" : "#f4f4f4",
                            color: it.aceitaFracionado ? "#2a6018" : "#6a8a74",
                            border: `1px solid ${it.aceitaFracionado ? "#b4d898" : "#dde8d8"}` }}>
                            {it.aceitaFracionado ? "Sim" : "Não"}
                          </span>
                        </td>
                        <td>
                          <button type="button" className="pre201-act-btn" onClick={() => handleEditarItem(it)}>Editar</button>
                          <button type="button" className="pre201-act-btn danger" onClick={() => handleRemoverItem(it.id)}>Remover</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── ABA SEMANAL ── */}
            {aba === "semanal" && (
              <>
                <div className="pre201-obs-box" style={{ margin: "14px 18px 0" }}>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="8" cy="8" r="6" stroke="#4a90d9" strokeWidth="1.4" />
                    <path d="M8 5.5v3M8 10h.01" stroke="#4a90d9" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  <span>
                    Esta tela apresenta <strong>6 colunas fixas</strong>. As colunas com cabeçalho correspondem às semanas do mês (varia de 4 a 6).
                    Não deve ser informada previsão nas colunas sem cabeçalho.
                    <strong> Dê duplo clique no código do item</strong> para abrir a janela de manutenção da quantidade semanal.
                  </span>
                </div>
                <div className="pre201-table-wrap" style={{ marginTop: 14 }}>
                  <table className="pre201-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Descrição</th>
                        <th className="num">Qtd. Mensal</th>
                        {[0, 1, 2, 3, 4, 5].map((i) => {
                          const maxSemanas = itens.length > 0 ? Math.max(...itens.map((it) => it.qtdSemanas)) : 5;
                          return i < maxSemanas
                            ? <th key={i} className="sem-header">Sem. {i + 1}</th>
                            : <th key={i} className="sem-empty">—</th>;
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {itens.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="pre201-table-empty">
                            Nenhum item cadastrado.
                          </td>
                        </tr>
                      ) : itens.map((it, idx) => (
                        <tr key={it.id}>
                          <td>
                            <span
                              className="pre201-item-link"
                              onDoubleClick={() => handleAbrirModalSemanal(idx)}
                              title="Duplo clique para manutenção semanal"
                            >
                              {it.item}
                            </span>
                          </td>
                          <td style={{ color: "#5a7870" }}>{it.descricao || "—"}</td>
                          <td className="num"><strong>{it.quantidade.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</strong></td>
                          {[0, 1, 2, 3, 4, 5].map((i) => {
                            const maxSemanas = Math.max(...itens.map((x) => x.qtdSemanas));
                            if (i >= maxSemanas) return <td key={i} className="sem-empty-cell">—</td>;
                            const val = it.semanas[i] ?? 0;
                            return (
                              <td key={i} className={i < it.qtdSemanas ? "sem-cell" : "sem-empty-cell"}>
                                {i < it.qtdSemanas ? val.toLocaleString("pt-BR", { minimumFractionDigits: 0 }) : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="pre201-footer">
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div className="pre201-footer-stat">Período: <strong>{MESES[parseInt(mes, 10) - 1]}/{ano}</strong></div>
            <div className="pre201-footer-stat">Itens: <strong>{itens.length}</strong></div>
            <div className="pre201-footer-stat">
              Total: <strong>{itens.reduce((a, it) => a + it.quantidade, 0).toLocaleString("pt-BR")}</strong>
            </div>
          </div>
          <div className="pre201-footer-stat" style={{ color: "#a0b8a8" }}>
            VPRE0201 · Planejamento
          </div>
        </footer>
      </div>

      {/* ── MODAL SEMANAL ── */}
      {modal.aberto && modal.itemIdx >= 0 && itens[modal.itemIdx] && (
        <div className="pre201-modal-overlay" onClick={() => setModal((p) => ({ ...p, aberto: false }))}>
          <div className="pre201-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pre201-modal-header">
              <span className="pre201-modal-title">
                Manutenção Semanal — Item {itens[modal.itemIdx].item}
              </span>
              <button type="button" className="pre201-modal-close" onClick={() => setModal((p) => ({ ...p, aberto: false }))}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="pre201-modal-body">
              <div style={{ marginBottom: 16, fontSize: 12.5, color: "#4a6a54", lineHeight: 1.6 }}>
                Qtd. Mensal: <strong>{itens[modal.itemIdx].quantidade}</strong>
                {" "}·{" "}
                {itens[modal.itemIdx].aceitaFracionado ? "Aceita fracionado" : "Arredondado (inteiro)"}.
                A última semana recebe o saldo.
              </div>
              <div className="pre201-modal-grid">
                {Array.from({ length: modal.qtdSemanas }, (_, i) => (
                  <div key={i} className="pre201-modal-field">
                    <label className="pre201-label">Semana {i + 1}</label>
                    <input
                      className="pre201-modal-input"
                      type="number" min="0" step={itens[modal.itemIdx].aceitaFracionado ? "0.001" : "1"}
                      value={modal.semanas[i] ?? 0}
                      onChange={(e) => {
                        const newSems = [...modal.semanas];
                        newSems[i] = parseFloat(e.target.value) || 0;
                        setModal((p) => ({ ...p, semanas: newSems }));
                        setModalErrors("");
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="pre201-modal-total">
                <span style={{ fontSize: 12.5, color: "#5a7870" }}>Soma das semanas:</span>
                <strong style={{ fontSize: 14, color: (() => {
                  const s = modal.semanas.slice(0, modal.qtdSemanas).reduce((a, b) => a + b, 0);
                  return Math.abs(s - itens[modal.itemIdx].quantidade) < 0.01 ? "#2a6018" : "#b01818";
                })() }}>
                  {modal.semanas.slice(0, modal.qtdSemanas).reduce((a, b) => a + b, 0).toLocaleString("pt-BR")}
                  {" "}/{" "}
                  {itens[modal.itemIdx].quantidade.toLocaleString("pt-BR")}
                </strong>
              </div>
              {modalErrors && <div className="pre201-modal-err">⚠ {modalErrors}</div>}
            </div>
            <div className="pre201-modal-footer">
              <button type="button" className="pre201-btn pre201-btn-ghost" onClick={() => {
                const it = itens[modal.itemIdx];
                const redistrib = distribuirPorSemanas(it.quantidade, it.qtdSemanas, it.aceitaFracionado);
                setModal((p) => ({ ...p, semanas: redistrib }));
                setModalErrors("");
              }}>
                Redistribuir Automaticamente
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="pre201-btn pre201-btn-ghost" onClick={() => setModal((p) => ({ ...p, aberto: false }))}>Cancelar</button>
                <button type="button" className="pre201-btn pre201-btn-primary" onClick={handleSalvarModal}>Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

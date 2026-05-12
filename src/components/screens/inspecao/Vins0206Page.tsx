import { useState, useCallback } from "react";
import {
  type OrdemInspecaoFilter,
} from "@/services/inspecaoService";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type TabAtiva = "ordens" | "exclusao";

interface OrdemRow {
  ordem: string;
  nro_nota: string;
  nro_aviso: string;
  data_entrada: string;
  item: string;
  quantidade: number;
  descricao: string;
  status: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "PEND_INSP", label: "Pendentes inspeção" },
  { value: "PEND_ANAL", label: "Pendentes análise" },
  { value: "SKIP", label: "Inspeção SKIP" },
];

const MOCK_ORDENS: OrdemRow[] = [
  { ordem: "OI-2501", nro_nota: "NF-1001", nro_aviso: "AV-2001", data_entrada: "2026-01-15", item: "I001", quantidade: 500, descricao: "Rolamento 6205-2RS", status: "PEND_INSP" },
  { ordem: "OI-2502", nro_nota: "NF-1002", nro_aviso: "AV-2002", data_entrada: "2026-01-16", item: "I002", quantidade: 1200, descricao: "Retentor 45x62x7", status: "PEND_ANAL" },
  { ordem: "OI-2503", nro_nota: "NF-1003", nro_aviso: "AV-2003", data_entrada: "2026-01-18", item: "I003", quantidade: 300, descricao: "Parafuso M10x50", status: "PEND_INSP" },
  { ordem: "OI-2504", nro_nota: "NF-1004", nro_aviso: "AV-2004", data_entrada: "2026-01-20", item: "I004", quantidade: 800, descricao: "Arruela M10 Zincada", status: "SKIP" },
  { ordem: "OI-2505", nro_nota: "NF-1005", nro_aviso: "AV-2005", data_entrada: "2026-01-22", item: "I005", quantidade: 1500, descricao: "Mola de compressão 25mm", status: "PEND_INSP" },
];

function normalizeError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const resp = (error as any).response;
    if (resp?.data?.message) return String(resp.data.message);
  }
  return error instanceof Error ? error.message : fallback;
}

export function Vins0206Page(): JSX.Element {
  const [tabAtiva, setTabAtiva] = useState<TabAtiva>("ordens");
  const [filtros, setFiltros] = useState<OrdemInspecaoFilter>({});
  const [rows, setRows] = useState<OrdemRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hasSearch, setHasSearch] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isLoading, setIsLoading] = useState(false);

  const setFilter = useCallback(<K extends keyof OrdemInspecaoFilter>(key: K, value: OrdemInspecaoFilter[K]) => {
    setFiltros(p => ({ ...p, [key]: value }));
  }, []);

  async function handlePesquisar() {
    setIsLoading(true);
    setFeedback(null);
    try {
      await new Promise(r => setTimeout(r, 800));
      setRows(MOCK_ORDENS);
      setHasSearch(true);
      setFeedback({ type: "info", message: `${MOCK_ORDENS.length} ordem(ns) encontrada(s).` });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao pesquisar ordens.") });
    } finally { setIsLoading(false); }
  }

  async function handleExcluir() {
    setFeedback(null);
    try {
      await new Promise(r => setTimeout(r, 600));
      setRows(p => p.filter(r => !selected.has(r.ordem)));
      setFeedback({ type: "success", message: `${selected.size} ordem(ns) excluída(s) com sucesso.` });
      setSelected(new Set());
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao excluir.") });
    }
  }

  function handleLimpar() { setFiltros({}); setRows([]); setHasSearch(false); setSelected(new Set()); setFeedback(null); }

  function toggleSelect(ordem: string) {
    setSelected(p => {
      const next = new Set(p);
      next.has(ordem) ? next.delete(ordem) : next.add(ordem);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map(r => r.ordem)));
  }

  const TABS: { id: TabAtiva; label: string }[] = [
    { id: "ordens", label: "Ordens de Inspeção" },
    { id: "exclusao", label: "Exclusão" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ins7-r{min-height:100vh;background:#f0f4ee;font-family:'Inter',sans-serif;color:#1a2e22;display:flex;flex-direction:column}

        .ins7-tb{height:52px;background:#162e20;display:flex;align-items:center;justify-content:space-between;padding:0 20px;flex-shrink:0;border-bottom:1px solid rgba(62,150,84,0.15)}
        .ins7-tbl{display:flex;align-items:center;gap:10px}
        .ins7-lg{width:28px;height:28px;background:#3e9654;border-radius:6px;display:flex;align-items:center;justify-content:center}
        .ins7-an{font-size:13px;font-weight:600;color:#e0f0e3;line-height:1.1}
        .ins7-asb{display:block;font-size:9px;font-weight:400;color:#3d6b4d}
        .ins7-st{font-size:12.5px;font-weight:500;color:#5a9a6a;padding-left:14px;margin-left:14px;border-left:1px solid rgba(255,255,255,0.08)}

        .ins7-ab{background:#fff;border-bottom:1px solid #dbe8d5;padding:0 20px;display:flex;align-items:center;gap:4px;height:46px;flex-shrink:0}
        .ins7-ag{display:flex;align-items:center;gap:4px;padding-right:12px;margin-right:8px;border-right:1px solid #e8f0e4}
        .ins7-ag:last-child{border-right:none}
        .ins7-al{font-size:9.5px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#96b8a0;margin-right:4px;white-space:nowrap}
        .ins7-bt{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border:1.5px solid transparent;border-radius:7px;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background 0.13s,border-color 0.13s,color 0.13s}
        .ins7-bt-p{background:#162e20;color:#dff0e2;border-color:#162e20}
        .ins7-bt-p:hover:not(:disabled){background:#1e3a2a}
        .ins7-bt-p:disabled{opacity:0.5;cursor:not-allowed}
        .ins7-bt-g{background:transparent;color:#4a7060;border-color:#d4e8d0}
        .ins7-bt-g:hover:not(:disabled){background:#f0f8ec;border-color:#b0d4b8;color:#1a3828}
        .ins7-bt-g:disabled{opacity:0.5;cursor:not-allowed}
        .ins7-bt-d{background:transparent;color:#b94040;border-color:#f0c8c8}
        .ins7-bt-d:hover:not(:disabled){background:#fff0f0;border-color:#e09090}
        .ins7-bt-sm{height:28px;padding:0 9px;font-size:12px}

        .ins7-by{flex:1;padding:16px 20px;display:flex;flex-direction:column;gap:0;overflow-y:auto}
        .ins7-by::-webkit-scrollbar{width:5px}
        .ins7-by::-webkit-scrollbar-thumb{background:#cce0c8;border-radius:4px}

        .ins7-sb{display:flex;align-items:center;gap:10px;padding:14px 0 8px}
        .ins7-sb:first-child{padding-top:0}
        .ins7-sb-p{font-size:9.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#5a8068;background:#e0ede0;border:1px solid #c8dcc8;border-radius:20px;padding:3px 10px;white-space:nowrap}
        .ins7-sb-l{flex:1;height:1px;background:#dbe8d5}
        .ins7-sb-h{font-size:11px;color:#96b8a0;white-space:nowrap}

        .ins7-c{background:#fff;border:1px solid #dbe8d5;border-radius:12px;overflow:hidden;margin-bottom:14px}
        .ins7-ch{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid #edf5e8;background:#fafcf9}
        .ins7-chl{display:flex;align-items:center;gap:8px}
        .ins7-ct{font-size:12px;font-weight:600;color:#2a4a35;text-transform:uppercase;letter-spacing:0.6px}
        .ins7-cbg{font-size:10.5px;font-weight:500;color:#3e9654;background:#eef5ea;border:1px solid #c4dfc8;border-radius:12px;padding:2px 8px}
        .ins7-cb{padding:18px 18px}

        .ins7-fr{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap}

        .ins7-f{display:flex;flex-direction:column;gap:5px}
        .ins7-l{font-size:10.5px;font-weight:600;color:#5a8068;text-transform:uppercase;letter-spacing:0.4px;display:flex;align-items:center;gap:4px}
        .ins7-in{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;transition:border-color 0.13s,box-shadow 0.13s}
        .ins7-in:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .ins7-in::placeholder{color:#b0c8b8;font-size:12px}
        .ins7-in[type="date"]{cursor:pointer}
        .ins7-se{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 28px 0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;transition:border-color 0.13s}
        .ins7-se:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .ins7-fh{font-size:11px;color:#7a9c84;margin-top:2px;line-height:1.45}

        .ins7-toggle-row{display:flex;align-items:center;gap:10px;padding-top:10px}
        .ins7-toggle{position:relative;width:38px;height:20px;flex-shrink:0;cursor:pointer}
        .ins7-toggle input{opacity:0;width:0;height:0;position:absolute}
        .ins7-toggle-track{position:absolute;inset:0;background:#d4e0d0;border-radius:20px;transition:background 0.2s}
        .ins7-toggle input:checked~.ins7-toggle-track{background:#3e9654}
        .ins7-toggle-thumb{position:absolute;top:3px;left:3px;width:14px;height:14px;background:#fff;border-radius:50%;transition:transform 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.15)}
        .ins7-toggle input:checked~.ins7-toggle-thumb{transform:translateX(18px)}
        .ins7-toggle-label{font-size:13px;color:#3a5a45;font-weight:500}

        .ins7-tabs{display:flex;align-items:flex-end;gap:0;border-bottom:2px solid #dbe8d5;background:#fafcf9}
        .ins7-tab{padding:10px 20px;font-size:12.5px;font-weight:500;color:#6a8a74;cursor:pointer;border:none;background:transparent;border-bottom:2px solid transparent;margin-bottom:-2px;transition:color 0.13s,border-color 0.13s;white-space:nowrap;font-family:'Inter',sans-serif}
        .ins7-tab:hover{color:#2a4a35}
        .ins7-tab.active{color:#162e20;border-bottom-color:#3e9654;font-weight:600}

        .ins7-rw{border-top:1px solid #edf5e8;overflow-x:auto}
        .ins7-rb{display:flex;align-items:center;justify-content:space-between;padding:10px 18px;background:#f4f9f2;border-bottom:1px solid #e8f0e4}
        .ins7-rbl{display:flex;align-items:center;gap:8px}
        .ins7-rbl-l{font-size:11px;font-weight:600;color:#4a7060;text-transform:uppercase;letter-spacing:0.5px}
        .ins7-rt{width:100%;border-collapse:collapse;font-size:13px}
        .ins7-rt th{background:#f4f9f2;padding:8px 12px;text-align:left;font-size:10.5px;font-weight:700;color:#5a8068;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1.5px solid #dbe8d5;white-space:nowrap}
        .ins7-rt td{padding:9px 12px;border-bottom:1px solid #f0f6ec;color:#243830;vertical-align:middle}
        .ins7-rt tbody tr{cursor:pointer;transition:background 0.1s}
        .ins7-rt tbody tr:hover{background:#eef9f0}
        .ins7-rem{text-align:center;padding:28px 12px;color:#96b8a0;font-size:12.5px}

        .ins7-fb{display:flex;align-items:center;gap:9px;padding:11px 15px;border-radius:9px;font-size:13px;animation:ins7FdIn 0.2s ease;margin-bottom:14px}
        .ins7-fb.s{background:#f0faf2;border:1px solid #b4dec0;color:#1e6030}
        .ins7-fb.e{background:#fff5f5;border:1px solid #f8c0c0;border-left:3px solid #e05252;color:#b91c1c}
        .ins7-fb.i{background:#f0f8ff;border:1px solid #c7def8;border-left:3px solid #4a90d9;color:#1a4070}

        .ins7-ft{background:#fff;border-top:1px solid #dbe8d5;padding:8px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .ins7-ftl{display:flex;align-items:center;gap:20px}
        .ins7-fts{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#6a8a74}
        .ins7-fts strong{color:#1a2e22;font-weight:600}

        .ins7-cb-chk{display:flex;align-items:center;gap:10px}
        .ins7-cb-chk input[type="checkbox"]{width:16px;height:16px;accent-color:#3e9654;cursor:pointer}

        @keyframes ins7Spin{to{transform:rotate(360deg)}}
        .ins7-sp{width:14px;height:14px;flex-shrink:0;border:2px solid rgba(223,240,226,0.3);border-top-color:#dff0e2;border-radius:50%;animation:ins7Spin 0.65s linear infinite}
        .ins7-spd{width:14px;height:14px;flex-shrink:0;border:2px solid #d4e8cc;border-top-color:#3e9654;border-radius:50%;animation:ins7Spin 0.65s linear infinite}
        @keyframes ins7FdIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}

        .ins7-status-badge{display:inline-flex;align-items:center;font-size:11px;font-weight:600;border-radius:12px;padding:2px 8px}
        .ins7-status-badge.pend_insp{background:#e8f0fc;color:#1a4080;border:1px solid #a8c0e8}
        .ins7-status-badge.pend_anal{background:#fdf8e8;color:#604800;border:1px solid #e0d090}
        .ins7-status-badge.skip{background:#f0f8ea;color:#2a6018;border:1px solid #b4d898}
      `}</style>

      <div className="ins7-r">
        <header className="ins7-tb">
          <div className="ins7-tbl">
            <div className="ins7-lg">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="ins7-an">Venture<span className="ins7-asb">ERP &amp; Soluções</span></span>
            <span className="ins7-st">VINS0206 — Exclusão de Ordens de Inspeção</span>
          </div>
        </header>

        <div className="ins7-ab">
          <div className="ins7-ag">
            <span className="ins7-al">Operação</span>
            <button className="ins7-bt ins7-bt-d" onClick={() => void handleExcluir()} disabled={selected.size === 0 || isLoading}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Excluir ({selected.size})
            </button>
          </div>
          <div className="ins7-ag">
            <span className="ins7-al">Ações</span>
            <button className="ins7-bt ins7-bt-d" onClick={handleLimpar} disabled={isLoading}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>Limpar
            </button>
          </div>
          <div className="ins7-ag">
            <button className="ins7-bt ins7-bt-g">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Ajuda
            </button>
          </div>
        </div>

        <div className="ins7-by">
          {feedback && (
            <div className={`ins7-fb ${feedback.type === "success" ? "s" : feedback.type === "error" ? "e" : "i"}`}>
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

          <div className="ins7-sb">
            <span className="ins7-sb-p">1 — Filtrar</span>
            <div className="ins7-sb-l" />
            <span className="ins7-sb-h">Preencha os filtros e clique em Pesquisar</span>
          </div>

          <div className="ins7-c">
            <div className="ins7-tabs">
              {TABS.map(t => (
                <button key={t.id} className={`ins7-tab${tabAtiva === t.id ? " active" : ""}`} onClick={() => setTabAtiva(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            {tabAtiva === "ordens" && (
              <div className="ins7-cb" style={{paddingBottom:14}}>
                <div className="ins7-fr">
                  <div className="ins7-f" style={{flex:"0 0 160px"}}>
                    <label className="ins7-l">Ordem Inspeção</label>
                    <input className="ins7-in" placeholder="Ex: OI-2501" value={filtros.ordem || ""} onChange={e => setFilter("ordem", e.target.value)} />
                  </div>
                  <div className="ins7-f" style={{flex:"0 0 180px"}}>
                    <label className="ins7-l">Nr. Nota(s)</label>
                    <input className="ins7-in" placeholder="Ex: NF-1001" value={filtros.nro_nota || ""} onChange={e => setFilter("nro_nota", e.target.value)} />
                  </div>
                  <div className="ins7-f" style={{flex:"0 0 220px"}}>
                    <label className="ins7-l">Fornecedor</label>
                    <input className="ins7-in" placeholder="Código ou nome" value={filtros.fornecedor || ""} onChange={e => setFilter("fornecedor", e.target.value)} />
                  </div>
                  <div className="ins7-f" style={{flex:"0 0 150px"}}>
                    <label className="ins7-l">Tipo</label>
                    <input className="ins7-in" placeholder="Ex: MP" value={filtros.tipo || ""} onChange={e => setFilter("tipo", e.target.value)} />
                  </div>
                </div>
                <div className="ins7-fr" style={{marginTop:12}}>
                  <div className="ins7-f" style={{flex:"0 0 160px"}}>
                    <label className="ins7-l">Itens</label>
                    <input className="ins7-in" placeholder="Ex: I001" value={filtros.itens || ""} onChange={e => setFilter("itens", e.target.value)} />
                  </div>
                  <div className="ins7-f" style={{flex:"0 0 160px"}}>
                    <label className="ins7-l">Class. Item</label>
                    <input className="ins7-in" placeholder="Ex: CLASSE-A" value={filtros.classificacao || ""} onChange={e => setFilter("classificacao", e.target.value)} />
                  </div>
                  <div className="ins7-f" style={{flex:"0 0 180px"}}>
                    <label className="ins7-l">Data de Entrada</label>
                    <input type="date" className="ins7-in" value={filtros.data_entrada || ""} onChange={e => setFilter("data_entrada", e.target.value)} />
                  </div>
                  <div className="ins7-f" style={{flex:"0 0 200px"}}>
                    <label className="ins7-l">Status</label>
                    <select className="ins7-se" value={filtros.status || ""} onChange={e => setFilter("status", e.target.value)}>
                      {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="ins7-f" style={{alignSelf:"flex-end", paddingTop:18}}>
                    <div className="ins7-cb-chk">
                      <input type="checkbox" checked={!!filtros.configurado} onChange={e => setFilter("configurado", e.target.checked)} />
                      <span className="ins7-toggle-label">Configurado</span>
                    </div>
                  </div>
                  <div style={{alignSelf:"flex-end"}}>
                    <button className="ins7-bt ins7-bt-g" onClick={() => void handlePesquisar()} disabled={isLoading}>
                      {isLoading ? <><div className="ins7-spd" />Buscando...</> : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" /><path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Pesquisar</>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tabAtiva === "exclusao" && (
              <div className="ins7-cb">
                <div className="ins7-fr">
                  <div className="ins7-toggle-row">
                    <label className="ins7-toggle">
                      <input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={toggleAll} />
                      <div className="ins7-toggle-track" /><div className="ins7-toggle-thumb" />
                    </label>
                    <span className="ins7-toggle-label">Excluir Ordem de Inspeção ({selected.size} de {rows.length} selecionadas)</span>
                  </div>
                  <button className="ins7-bt ins7-bt-d" onClick={() => void handleExcluir()} disabled={selected.size === 0}>
                    Confirmar Exclusão
                  </button>
                </div>
              </div>
            )}
          </div>

          {hasSearch && (
            <>
              <div className="ins7-sb">
                <span className="ins7-sb-p">2 — Resultados</span>
                <div className="ins7-sb-l" />
                <span className="ins7-sb-h">{rows.length} registro(s)</span>
              </div>
              <div className="ins7-c">
                <div className="ins7-rw">
                  <div className="ins7-rb">
                    <div className="ins7-rbl">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" /></svg>
                      <span className="ins7-rbl-l">Ordens de Inspeção</span>
                      <span className="ins7-cbg">{rows.length} registro(s)</span>
                    </div>
                  </div>
                  <table className="ins7-rt">
                    <thead>
                      <tr>
                        <th style={{width:50}}>
                          <input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={toggleAll} style={{accentColor:"#3e9654"}} />
                        </th>
                        <th style={{width:130}}>Ordem Insp.</th>
                        <th style={{width:110}}>Nt/Aviso</th>
                        <th style={{width:110}}>Data Entrada</th>
                        <th style={{width:100}}>Item</th>
                        <th style={{width:120}}>Quantidade</th>
                        <th>Descrição</th>
                        <th style={{width:130}}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(r => {
                        const statusClass = r.status === "PEND_INSP" ? "pend_insp" : r.status === "PEND_ANAL" ? "pend_anal" : "skip";
                        const statusLabel = r.status === "PEND_INSP" ? "Pend. Inspeção" : r.status === "PEND_ANAL" ? "Pend. Análise" : "SKIP";
                        return (
                          <tr key={r.ordem} onClick={() => toggleSelect(r.ordem)}>
                            <td>
                              <input type="checkbox" checked={selected.has(r.ordem)} readOnly style={{accentColor:"#3e9654"}} />
                            </td>
                            <td style={{fontWeight:600,color:"#1a4a2a"}}>{r.ordem}</td>
                            <td>{r.nro_nota} / {r.nro_aviso}</td>
                            <td>{new Date(r.data_entrada + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                            <td>{r.item}</td>
                            <td>{r.quantidade.toLocaleString()}</td>
                            <td>{r.descricao}</td>
                            <td><span className={`ins7-status-badge ${statusClass}`}>{statusLabel}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <footer className="ins7-ft">
          <div className="ins7-ftl">
            <div className="ins7-fts">Registros: <strong>{rows.length}</strong></div>
            <div className="ins7-fts">Selecionados: <strong>{selected.size}</strong></div>
            <div className="ins7-fts">Módulo: <strong>Inspeção</strong></div>
          </div>
          <div className="ins7-fts" style={{gap:8}}><span style={{color:"#b0c8b8",fontSize:11}}>GRUPO VENTURE LTDA</span></div>
        </footer>
      </div>
    </>
  );
}

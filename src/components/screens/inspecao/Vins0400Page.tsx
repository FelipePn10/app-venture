import { useState, useCallback } from "react";
import {
  type OcorrenciaFilter,
  type OrdemInspecaoFilter,
} from "@/services/inspecaoService";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type TabAtiva = "ocorrencias" | "ordens";
type ListarTipo = "AMBAS" | "FECHADAS" | "ABERTAS";

interface OcorrenciaRow {
  numero: string;
  data_ocorrencia: string;
  fornecedor: string;
  fornecedorNome: string;
  tipo_ocorrencia: string;
  item: string;
  fechamento: string;
}

interface OrdemRow {
  ordem: string;
  nro_nota: string;
  fornecedor: string;
  itens: string;
  classificacao: string;
  data_entrada: string;
  status: string;
}

const MOCK_OCORRENCIAS: OcorrenciaRow[] = [
  { numero: "OC-1001", data_ocorrencia: "2026-01-15", fornecedor: "001", fornecedorNome: "FORNECEDOR A S.A.", tipo_ocorrencia: "NC", item: "I001", fechamento: "APR" },
  { numero: "OC-1002", data_ocorrencia: "2026-02-10", fornecedor: "002", fornecedorNome: "FORNECEDOR B LTDA", tipo_ocorrencia: "DI", item: "I002", fechamento: "" },
  { numero: "OC-1003", data_ocorrencia: "2026-03-05", fornecedor: "001", fornecedorNome: "FORNECEDOR A S.A.", tipo_ocorrencia: "AV", item: "I003", fechamento: "REP" },
  { numero: "OC-1004", data_ocorrencia: "2026-04-12", fornecedor: "003", fornecedorNome: "FORNECEDOR C ME", tipo_ocorrencia: "DQ", item: "I004", fechamento: "APR" },
];

const MOCK_ORDENS: OrdemRow[] = [
  { ordem: "OI-2501", nro_nota: "NF-1001", fornecedor: "001", itens: "I001, I002", classificacao: "CLASSE-A", data_entrada: "2026-01-15", status: "PEND_INSP" },
  { ordem: "OI-2502", nro_nota: "NF-1002", fornecedor: "002", itens: "I003", classificacao: "CLASSE-B", data_entrada: "2026-01-16", status: "PEND_ANAL" },
  { ordem: "OI-2503", nro_nota: "NF-1003", fornecedor: "003", itens: "I004, I005", classificacao: "CLASSE-A", data_entrada: "2026-01-18", status: "APR" },
];

const LISTAR_OPTIONS: { value: ListarTipo; label: string }[] = [
  { value: "AMBAS", label: "Ambas" },
  { value: "FECHADAS", label: "Fechadas" },
  { value: "ABERTAS", label: "Abertas" },
];

function normalizeError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const resp = (error as any).response;
    if (resp?.data?.message) return String(resp.data.message);
  }
  return error instanceof Error ? error.message : fallback;
}

export function Vins0400Page(): JSX.Element {
  const [tabAtiva, setTabAtiva] = useState<TabAtiva>("ocorrencias");
  const [filtrosOc, setFiltrosOc] = useState<OcorrenciaFilter>({ listar: "AMBAS" });
  const [filtrosOrd, setFiltrosOrd] = useState<OrdemInspecaoFilter>({});
  const [rowsOc, setRowsOc] = useState<OcorrenciaRow[]>([]);
  const [rowsOrd, setRowsOrd] = useState<OrdemRow[]>([]);
  const [hasSearchOc, setHasSearchOc] = useState(false);
  const [hasSearchOrd, setHasSearchOrd] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSearching, setIsSearching] = useState(false);

  const setFilterOc = useCallback(<K extends keyof OcorrenciaFilter>(key: K, value: OcorrenciaFilter[K]) => {
    setFiltrosOc(p => ({ ...p, [key]: value }));
  }, []);

  const setFilterOrd = useCallback(<K extends keyof OrdemInspecaoFilter>(key: K, value: OrdemInspecaoFilter[K]) => {
    setFiltrosOrd(p => ({ ...p, [key]: value }));
  }, []);

  async function handlePesquisarOc() {
    setIsSearching(true); setFeedback(null);
    try { await new Promise(r => setTimeout(r, 600)); setRowsOc(MOCK_OCORRENCIAS); setHasSearchOc(true); }
    catch (error) { setFeedback({ type: "error", message: normalizeError(error, "Erro na consulta.") }); }
    finally { setIsSearching(false); }
  }

  async function handlePesquisarOrd() {
    setIsSearching(true); setFeedback(null);
    try { await new Promise(r => setTimeout(r, 600)); setRowsOrd(MOCK_ORDENS); setHasSearchOrd(true); }
    catch (error) { setFeedback({ type: "error", message: normalizeError(error, "Erro na consulta.") }); }
    finally { setIsSearching(false); }
  }

  function handleLimpar() {
    setFiltrosOc({ listar: "AMBAS" }); setFiltrosOrd({});
    setRowsOc([]); setRowsOrd([]); setHasSearchOc(false); setHasSearchOrd(false);
    setFeedback(null);
  }

  const TABS: { id: TabAtiva; label: string }[] = [
    { id: "ocorrencias", label: "Ocorrências" },
    { id: "ordens", label: "Ordens de Inspeção" },
  ];

  const fechamentoLabel = (f: string) => f === "APR" ? "Aprovado" : f === "REP" ? "Reprovado" : f === "DEV" ? "Devolvido" : "Aberto";
  const statusLabel = (s: string) => s === "PEND_INSP" ? "Pend. Inspeção" : s === "PEND_ANAL" ? "Pend. Análise" : s === "APR" ? "Aprovado" : s;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ins3-r{min-height:100vh;background:#f0f4ee;font-family:'Inter',sans-serif;color:#1a2e22;display:flex;flex-direction:column}

        .ins3-tb{height:52px;background:#162e20;display:flex;align-items:center;justify-content:space-between;padding:0 20px;flex-shrink:0;border-bottom:1px solid rgba(62,150,84,0.15)}
        .ins3-tbl{display:flex;align-items:center;gap:10px}
        .ins3-lg{width:28px;height:28px;background:#3e9654;border-radius:6px;display:flex;align-items:center;justify-content:center}
        .ins3-an{font-size:13px;font-weight:600;color:#e0f0e3;line-height:1.1}
        .ins3-asb{display:block;font-size:9px;font-weight:400;color:#3d6b4d}
        .ins3-st{font-size:12.5px;font-weight:500;color:#5a9a6a;padding-left:14px;margin-left:14px;border-left:1px solid rgba(255,255,255,0.08)}

        .ins3-ab{background:#fff;border-bottom:1px solid #dbe8d5;padding:0 20px;display:flex;align-items:center;gap:4px;height:46px;flex-shrink:0}
        .ins3-ag{display:flex;align-items:center;gap:4px;padding-right:12px;margin-right:8px;border-right:1px solid #e8f0e4}
        .ins3-ag:last-child{border-right:none}
        .ins3-al{font-size:9.5px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#96b8a0;margin-right:4px;white-space:nowrap}
        .ins3-bt{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border:1.5px solid transparent;border-radius:7px;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background 0.13s,border-color 0.13s,color 0.13s}
        .ins3-bt-p{background:#162e20;color:#dff0e2;border-color:#162e20}
        .ins3-bt-p:hover:not(:disabled){background:#1e3a2a}
        .ins3-bt-p:disabled{opacity:0.5;cursor:not-allowed}
        .ins3-bt-g{background:transparent;color:#4a7060;border-color:#d4e8d0}
        .ins3-bt-g:hover:not(:disabled){background:#f0f8ec;border-color:#b0d4b8;color:#1a3828}
        .ins3-bt-g:disabled{opacity:0.5;cursor:not-allowed}
        .ins3-bt-d{background:transparent;color:#b94040;border-color:#f0c8c8}
        .ins3-bt-d:hover:not(:disabled){background:#fff0f0;border-color:#e09090}

        .ins3-by{flex:1;padding:16px 20px;display:flex;flex-direction:column;gap:0;overflow-y:auto}
        .ins3-by::-webkit-scrollbar{width:5px}
        .ins3-by::-webkit-scrollbar-thumb{background:#cce0c8;border-radius:4px}

        .ins3-sb{display:flex;align-items:center;gap:10px;padding:14px 0 8px}
        .ins3-sb:first-child{padding-top:0}
        .ins3-sb-p{font-size:9.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#5a8068;background:#e0ede0;border:1px solid #c8dcc8;border-radius:20px;padding:3px 10px;white-space:nowrap}
        .ins3-sb-l{flex:1;height:1px;background:#dbe8d5}
        .ins3-sb-h{font-size:11px;color:#96b8a0;white-space:nowrap}

        .ins3-c{background:#fff;border:1px solid #dbe8d5;border-radius:12px;overflow:hidden;margin-bottom:14px}
        .ins3-ch{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid #edf5e8;background:#fafcf9}
        .ins3-chl{display:flex;align-items:center;gap:8px}
        .ins3-ct{font-size:12px;font-weight:600;color:#2a4a35;text-transform:uppercase;letter-spacing:0.6px}
        .ins3-cbg{font-size:10.5px;font-weight:500;color:#3e9654;background:#eef5ea;border:1px solid #c4dfc8;border-radius:12px;padding:2px 8px}
        .ins3-cb{padding:18px 18px}

        .ins3-tabs{display:flex;align-items:flex-end;gap:0;border-bottom:2px solid #dbe8d5;background:#fafcf9}
        .ins3-tab{padding:10px 20px;font-size:12.5px;font-weight:500;color:#6a8a74;cursor:pointer;border:none;background:transparent;border-bottom:2px solid transparent;margin-bottom:-2px;transition:color 0.13s,border-color 0.13s;white-space:nowrap;font-family:'Inter',sans-serif}
        .ins3-tab:hover{color:#2a4a35}
        .ins3-tab.active{color:#162e20;border-bottom-color:#3e9654;font-weight:600}

        .ins3-fr{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap}
        .ins3-f{display:flex;flex-direction:column;gap:5px}
        .ins3-l{font-size:10.5px;font-weight:600;color:#5a8068;text-transform:uppercase;letter-spacing:0.4px;display:flex;align-items:center;gap:4px}
        .ins3-in{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;transition:border-color 0.13s,box-shadow 0.13s}
        .ins3-in:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .ins3-in::placeholder{color:#b0c8b8;font-size:12px}
        .ins3-in[type="date"]{cursor:pointer}
        .ins3-se{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 28px 0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;transition:border-color 0.13s}
        .ins3-se:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .ins3-fh{font-size:11px;color:#7a9c84;margin-top:2px;line-height:1.45}

        .ins3-rw{border-top:1px solid #edf5e8;overflow-x:auto}
        .ins3-rb{display:flex;align-items:center;justify-content:space-between;padding:10px 18px;background:#f4f9f2;border-bottom:1px solid #e8f0e4}
        .ins3-rbl{display:flex;align-items:center;gap:8px}
        .ins3-rbl-l{font-size:11px;font-weight:600;color:#4a7060;text-transform:uppercase;letter-spacing:0.5px}
        .ins3-rt{width:100%;border-collapse:collapse;font-size:13px}
        .ins3-rt th{background:#f4f9f2;padding:8px 12px;text-align:left;font-size:10.5px;font-weight:700;color:#5a8068;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1.5px solid #dbe8d5;white-space:nowrap}
        .ins3-rt td{padding:9px 12px;border-bottom:1px solid #f0f6ec;color:#243830;vertical-align:middle}
        .ins3-rt tbody tr{cursor:pointer;transition:background 0.1s}
        .ins3-rt tbody tr:hover{background:#eef9f0}
        .ins3-rem{text-align:center;padding:28px 12px;color:#96b8a0;font-size:12.5px}

        .ins3-fb{display:flex;align-items:center;gap:9px;padding:11px 15px;border-radius:9px;font-size:13px;animation:ins3FdIn 0.2s ease;margin-bottom:14px}
        .ins3-fb.s{background:#f0faf2;border:1px solid #b4dec0;color:#1e6030}
        .ins3-fb.e{background:#fff5f5;border:1px solid #f8c0c0;border-left:3px solid #e05252;color:#b91c1c}
        .ins3-fb.i{background:#f0f8ff;border:1px solid #c7def8;border-left:3px solid #4a90d9;color:#1a4070}

        .ins3-ft{background:#fff;border-top:1px solid #dbe8d5;padding:8px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .ins3-ftl{display:flex;align-items:center;gap:20px}
        .ins3-fts{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#6a8a74}
        .ins3-fts strong{color:#1a2e22;font-weight:600}

        @keyframes ins3Spin{to{transform:rotate(360deg)}}
        .ins3-sp{width:14px;height:14px;flex-shrink:0;border:2px solid rgba(223,240,226,0.3);border-top-color:#dff0e2;border-radius:50%;animation:ins3Spin 0.65s linear infinite}
        .ins3-spd{width:14px;height:14px;flex-shrink:0;border:2px solid #d4e8cc;border-top-color:#3e9654;border-radius:50%;animation:ins3Spin 0.65s linear infinite}
        @keyframes ins3FdIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className="ins3-r">
        <header className="ins3-tb">
          <div className="ins3-tbl">
            <div className="ins3-lg">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="ins3-an">Venture<span className="ins3-asb">ERP &amp; Soluções</span></span>
            <span className="ins3-st">VINS0400 — Consulta de Ocorrências / Ordens de Inspeção</span>
          </div>
        </header>

        <div className="ins3-ab">
          <div className="ins3-ag">
            <span className="ins3-al">Ações</span>
            <button className="ins3-bt ins3-bt-d" onClick={handleLimpar}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>Limpar
            </button>
          </div>
          <div className="ins3-ag">
            <button className="ins3-bt ins3-bt-g">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Ajuda
            </button>
          </div>
        </div>

        <div className="ins3-by">
          {feedback && (
            <div className={`ins3-fb ${feedback.type === "success" ? "s" : feedback.type === "error" ? "e" : "i"}`}>
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

          <div className="ins3-sb">
            <span className="ins3-sb-p">1 — Filtrar</span>
            <div className="ins3-sb-l" />
            <span className="ins3-sb-h">Selecione a aba e preencha os filtros</span>
          </div>

          <div className="ins3-c">
            <div className="ins3-tabs">
              {TABS.map(t => (
                <button key={t.id} className={`ins3-tab${tabAtiva === t.id ? " active" : ""}`} onClick={() => setTabAtiva(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Aba Ocorrências */}
            {tabAtiva === "ocorrencias" && (
              <div className="ins3-cb" style={{paddingBottom:14}}>
                <div className="ins3-fr">
                  <div className="ins3-f" style={{flex:"0 0 160px"}}>
                    <label className="ins3-l">Número</label>
                    <input className="ins3-in" placeholder="Ex: OC-1001" value={filtrosOc.numero || ""} onChange={e => setFilterOc("numero", e.target.value)} />
                  </div>
                  <div className="ins3-f" style={{flex:"0 0 200px"}}>
                    <label className="ins3-l">Tipo de Ocorrência</label>
                    <input className="ins3-in" placeholder="Código ou descrição" value={filtrosOc.tipo_ocorrencia || ""} onChange={e => setFilterOc("tipo_ocorrencia", e.target.value)} />
                  </div>
                  <div className="ins3-f" style={{flex:"0 0 220px"}}>
                    <label className="ins3-l">Fornecedor</label>
                    <input className="ins3-in" placeholder="Código ou nome" value={filtrosOc.fornecedor || ""} onChange={e => setFilterOc("fornecedor", e.target.value)} />
                  </div>
                  <div className="ins3-f" style={{flex:"0 0 180px"}}>
                    <label className="ins3-l">Centro de Custo</label>
                    <input className="ins3-in" placeholder="Ex: 100" value={filtrosOc.centro_custo || ""} onChange={e => setFilterOc("centro_custo", e.target.value)} />
                  </div>
                </div>
                <div className="ins3-fr" style={{marginTop:12}}>
                  <div className="ins3-f" style={{flex:"0 0 180px"}}>
                    <label className="ins3-l">Data Início</label>
                    <input type="date" className="ins3-in" value={filtrosOc.data_inicio || ""} onChange={e => setFilterOc("data_inicio", e.target.value)} />
                  </div>
                  <div className="ins3-f" style={{flex:"0 0 180px"}}>
                    <label className="ins3-l">Data Fim</label>
                    <input type="date" className="ins3-in" value={filtrosOc.data_fim || ""} onChange={e => setFilterOc("data_fim", e.target.value)} />
                  </div>
                  <div className="ins3-f" style={{flex:"0 0 160px"}}>
                    <label className="ins3-l">Tipo</label>
                    <input className="ins3-in" placeholder="Ex: NC" value={filtrosOc.tipo || ""} onChange={e => setFilterOc("tipo", e.target.value)} />
                  </div>
                  <div className="ins3-f" style={{flex:"0 0 160px"}}>
                    <label className="ins3-l">Listar</label>
                    <select className="ins3-se" value={filtrosOc.listar || "AMBAS"} onChange={e => setFilterOc("listar", e.target.value as ListarTipo)}>
                      {LISTAR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div style={{alignSelf:"flex-end"}}>
                    <button className="ins3-bt ins3-bt-g" onClick={() => void handlePesquisarOc()} disabled={isSearching}>
                      {isSearching ? <><div className="ins3-spd" />Buscando...</> : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" /><path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Pesquisar</>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Aba Ordens de Inspeção */}
            {tabAtiva === "ordens" && (
              <div className="ins3-cb" style={{paddingBottom:14}}>
                <div className="ins3-fr">
                  <div className="ins3-f" style={{flex:"0 0 160px"}}>
                    <label className="ins3-l">Ordem Inspeção</label>
                    <input className="ins3-in" placeholder="Ex: OI-2501" value={filtrosOrd.ordem || ""} onChange={e => setFilterOrd("ordem", e.target.value)} />
                  </div>
                  <div className="ins3-f" style={{flex:"0 0 180px"}}>
                    <label className="ins3-l">Nro. Nota</label>
                    <input className="ins3-in" placeholder="Ex: NF-1001" value={filtrosOrd.nro_nota || ""} onChange={e => setFilterOrd("nro_nota", e.target.value)} />
                  </div>
                  <div className="ins3-f" style={{flex:"0 0 220px"}}>
                    <label className="ins3-l">Fornecedor</label>
                    <input className="ins3-in" placeholder="Código ou nome" value={filtrosOrd.fornecedor || ""} onChange={e => setFilterOrd("fornecedor", e.target.value)} />
                  </div>
                  <div className="ins3-f" style={{flex:"0 0 160px"}}>
                    <label className="ins3-l">Itens</label>
                    <input className="ins3-in" placeholder="Ex: I001" value={filtrosOrd.itens || ""} onChange={e => setFilterOrd("itens", e.target.value)} />
                  </div>
                </div>
                <div className="ins3-fr" style={{marginTop:12}}>
                  <div className="ins3-f" style={{flex:"0 0 160px"}}>
                    <label className="ins3-l">Class. Item</label>
                    <input className="ins3-in" placeholder="Ex: CLASSE-A" value={filtrosOrd.classificacao || ""} onChange={e => setFilterOrd("classificacao", e.target.value)} />
                  </div>
                  <div className="ins3-f" style={{flex:"0 0 180px"}}>
                    <label className="ins3-l">Data de Entrada</label>
                    <input type="date" className="ins3-in" value={filtrosOrd.data_entrada || ""} onChange={e => setFilterOrd("data_entrada", e.target.value)} />
                  </div>
                  <div className="ins3-f" style={{flex:"0 0 160px"}}>
                    <label className="ins3-l">Status</label>
                    <input className="ins3-in" placeholder="Ex: PEND_INSP" value={filtrosOrd.status || ""} onChange={e => setFilterOrd("status", e.target.value)} />
                  </div>
                  <div style={{alignSelf:"flex-end"}}>
                    <button className="ins3-bt ins3-bt-g" onClick={() => void handlePesquisarOrd()} disabled={isSearching}>
                      {isSearching ? <><div className="ins3-spd" />Buscando...</> : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" /><path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Pesquisar</>}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results - Ocorrências */}
          {hasSearchOc && tabAtiva === "ocorrencias" && (
            <>
              <div className="ins3-sb">
                <span className="ins3-sb-p">2 — Resultados (Ocorrências)</span>
                <div className="ins3-sb-l" />
                <span className="ins3-sb-h">{rowsOc.length} ocorrência(s)</span>
              </div>
              <div className="ins3-c">
                <div className="ins3-rw">
                  <div className="ins3-rb">
                    <div className="ins3-rbl">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" /></svg>
                      <span className="ins3-rbl-l">Ocorrências Encontradas</span>
                      <span className="ins3-cbg">{rowsOc.length} registro(s)</span>
                    </div>
                  </div>
                  <table className="ins3-rt">
                    <thead>
                      <tr>
                        <th style={{width:130}}>Número</th><th style={{width:130}}>Data</th><th>Fornecedor</th>
                        <th style={{width:180}}>Tipo Ocorrência</th><th style={{width:100}}>Item</th><th style={{width:120}}>Fechamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rowsOc.map(r => (
                        <tr key={r.numero}>
                          <td style={{fontWeight:600,color:"#1a4a2a"}}>{r.numero}</td>
                          <td>{new Date(r.data_ocorrencia + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                          <td>{r.fornecedorNome}</td>
                          <td>{r.tipo_ocorrencia}</td>
                          <td>{r.item}</td>
                          <td>{fechamentoLabel(r.fechamento)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Results - Ordens */}
          {hasSearchOrd && tabAtiva === "ordens" && (
            <>
              <div className="ins3-sb">
                <span className="ins3-sb-p">2 — Resultados (Ordens de Inspeção)</span>
                <div className="ins3-sb-l" />
                <span className="ins3-sb-h">{rowsOrd.length} ordem(ns)</span>
              </div>
              <div className="ins3-c">
                <div className="ins3-rw">
                  <div className="ins3-rb">
                    <div className="ins3-rbl">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" /></svg>
                      <span className="ins3-rbl-l">Ordens Encontradas</span>
                      <span className="ins3-cbg">{rowsOrd.length} registro(s)</span>
                    </div>
                  </div>
                  <table className="ins3-rt">
                    <thead>
                      <tr>
                        <th style={{width:140}}>Ordem Insp.</th><th style={{width:120}}>Nro. Nota</th><th style={{width:100}}>Fornecedor</th>
                        <th>Itens</th><th style={{width:120}}>Class. Item</th><th style={{width:120}}>Data Entrada</th><th style={{width:130}}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rowsOrd.map(r => (
                        <tr key={r.ordem}>
                          <td style={{fontWeight:600,color:"#1a4a2a"}}>{r.ordem}</td><td>{r.nro_nota}</td><td>{r.fornecedor}</td>
                          <td>{r.itens}</td><td>{r.classificacao}</td>
                          <td>{new Date(r.data_entrada + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                          <td>{statusLabel(r.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <footer className="ins3-ft">
          <div className="ins3-ftl">
            <div className="ins3-fts">Ocorrências: <strong>{rowsOc.length}</strong></div>
            <div className="ins3-fts">Ordens: <strong>{rowsOrd.length}</strong></div>
            <div className="ins3-fts">Módulo: <strong>Inspeção</strong></div>
          </div>
          <div className="ins3-fts" style={{gap:8}}><span style={{color:"#b0c8b8",fontSize:11}}>GRUPO VENTURE LTDA</span></div>
        </footer>
      </div>
    </>
  );
}

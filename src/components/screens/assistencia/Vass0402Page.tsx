import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FiltrosConsulta {
  chamados: string;
  dataChamadoInicio: string;
  dataChamadoFim: string;
  clientes: string;
  tipoCliente: string;
  atendentes: string;
  tipoAtendente: string;
  cidades: string;
  tipoCidade: string;
  ufs: string;
  tipoUf: string;
  item: string;
  tipoItem: string;
  status: string;
}

interface ChamadoRow {
  chamado: string;
  data: string;
  cliente: string;
  clienteNome: string;
  assTecnico: string;
  tipo: string;
  motivo: string;
  status: string;
  fechado: string;
  cidade: string;
}

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

const TIPO_OPTIONS = ["Código", "Descrição"];
const STATUS_OPTIONS_FILTER = ["Todos", "Pendente", "Atendido por Pedido", "Atendido por Pedido Pendente NFE", "Atendido por Pedido NFE", "Atendido Manual"];

const filtrosIniciais: FiltrosConsulta = {
  chamados: "", dataChamadoInicio: "", dataChamadoFim: "", clientes: "", tipoCliente: "Código",
  atendentes: "", tipoAtendente: "Código", cidades: "", tipoCidade: "Código",
  ufs: "", tipoUf: "Código", item: "", tipoItem: "Código", status: "Todos",
};

const MOCK_CHAMADOS: ChamadoRow[] = [
  { chamado:"000415", data:"15/05/2026", cliente:"001", clienteNome:"SOHOME LTDA", assTecnico:"AT001", tipo:"Garantia", motivo:"Defeito de Fabricação", status:"Pendente", fechado:"Não", cidade:"São Paulo" },
  { chamado:"000416", data:"12/05/2026", cliente:"002", clienteNome:"ALFA S.A.", assTecnico:"AT002", tipo:"Troca", motivo:"Mau Uso", status:"Atendido Manual", fechado:"Sim", cidade:"Campinas" },
  { chamado:"000417", data:"10/05/2026", cliente:"003", clienteNome:"BETA LTDA", assTecnico:"AT001", tipo:"Conserto", motivo:"Desgaste Natural", status:"Atendido por Pedido", fechado:"Sim", cidade:"Rio de Janeiro" },
  { chamado:"000418", data:"08/05/2026", cliente:"004", clienteNome:"GAMA ME", assTecnico:"AT003", tipo:"Garantia", motivo:"Instalação Incorreta", status:"Pendente", fechado:"Não", cidade:"Curitiba" },
  { chamado:"000419", data:"05/05/2026", cliente:"005", clienteNome:"DELTA EIRELI", assTecnico:"AT002", tipo:"Revisão", motivo:"Transporte", status:"Atendido por Pedido NFE", fechado:"Sim", cidade:"Belo Horizonte" },
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

export function Vass0402Page(): JSX.Element {
  const [filtros, setFiltros] = useState<FiltrosConsulta>(filtrosIniciais);
  const [rows, setRows] = useState<ChamadoRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const setFilter = useCallback(<K extends keyof FiltrosConsulta>(key: K, value: FiltrosConsulta[K]) => {
    setFiltros(prev => ({ ...prev, [key]: value }));
  }, []);

  async function handleConsultar() {
    setIsSearching(true);
    setFeedback(null);
    try {
      await new Promise(r => setTimeout(r, 600));
      setRows(MOCK_CHAMADOS);
      setHasSearched(true);
      setFeedback({ type: "success", message: `${MOCK_CHAMADOS.length} chamado(s) encontrado(s).` });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro na consulta.") });
    } finally { setIsSearching(false); }
  }

  function handleLimpar() {
    setFiltros(filtrosIniciais);
    setRows([]);
    setFeedback(null);
    setHasSearched(false);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .as-r{min-height:100vh;background:#f0f4ee;font-family:'Inter',sans-serif;color:#1a2e22;display:flex;flex-direction:column}

        .as-tb{height:52px;background:#162e20;display:flex;align-items:center;justify-content:space-between;padding:0 20px;flex-shrink:0;border-bottom:1px solid rgba(62,150,84,0.15)}
        .as-tbl{display:flex;align-items:center;gap:10px}
        .as-lg{width:28px;height:28px;background:#3e9654;border-radius:6px;display:flex;align-items:center;justify-content:center}
        .as-an{font-size:13px;font-weight:600;color:#e0f0e3;line-height:1.1}
        .as-asb{display:block;font-size:9px;font-weight:400;color:#3d6b4d}
        .as-st{font-size:12.5px;font-weight:500;color:#5a9a6a;padding-left:14px;margin-left:14px;border-left:1px solid rgba(255,255,255,0.08)}

        .as-ab{background:#fff;border-bottom:1px solid #dbe8d5;padding:0 20px;display:flex;align-items:center;gap:4px;height:46px;flex-shrink:0}
        .as-ag{display:flex;align-items:center;gap:4px;padding-right:12px;margin-right:8px;border-right:1px solid #e8f0e4}
        .as-ag:last-child{border-right:none}
        .as-al{font-size:9.5px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#96b8a0;margin-right:4px;white-space:nowrap}
        .as-bt{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border:1.5px solid transparent;border-radius:7px;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background 0.13s,border-color 0.13s,color 0.13s}
        .as-bt-p{background:#162e20;color:#dff0e2;border-color:#162e20}
        .as-bt-p:hover:not(:disabled){background:#1e3a2a}
        .as-bt-p:disabled{opacity:0.5;cursor:not-allowed}
        .as-bt-g{background:transparent;color:#4a7060;border-color:#d4e8d0}
        .as-bt-g:hover:not(:disabled){background:#f0f8ec;border-color:#b0d4b8;color:#1a3828}
        .as-bt-g:disabled{opacity:0.5;cursor:not-allowed}
        .as-bt-d{background:transparent;color:#b94040;border-color:#f0c8c8}
        .as-bt-d:hover:not(:disabled){background:#fff0f0;border-color:#e09090}
        .as-bt-s{height:28px;padding:0 9px;font-size:12px}
        .as-bt-n{background:#eef9f0;color:#1a6030;border-color:#b4d8b8;font-weight:600}
        .as-bt-n:hover:not(:disabled){background:#dff5e4;border-color:#88c898}

        .as-by{flex:1;padding:16px 20px;display:flex;flex-direction:column;gap:0;overflow-y:auto}
        .as-by::-webkit-scrollbar{width:5px}
        .as-by::-webkit-scrollbar-thumb{background:#cce0c8;border-radius:4px}

        .as-sb{display:flex;align-items:center;gap:10px;padding:14px 0 8px}
        .as-sb:first-child{padding-top:0}
        .as-sb-p{font-size:9.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#5a8068;background:#e0ede0;border:1px solid #c8dcc8;border-radius:20px;padding:3px 10px;white-space:nowrap}
        .as-sb-l{flex:1;height:1px;background:#dbe8d5}
        .as-sb-h{font-size:11px;color:#96b8a0;white-space:nowrap}

        .as-c{background:#fff;border:1px solid #dbe8d5;border-radius:12px;overflow:hidden;margin-bottom:14px}
        .as-ch{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid #edf5e8;background:#fafcf9}
        .as-chl{display:flex;align-items:center;gap:8px}
        .as-ct{font-size:12px;font-weight:600;color:#2a4a35;text-transform:uppercase;letter-spacing:0.6px}
        .as-cbg{font-size:10.5px;font-weight:500;color:#3e9654;background:#eef5ea;border:1px solid #c4dfc8;border-radius:12px;padding:2px 8px}
        .as-cb{padding:18px 18px}

        .as-fr{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap}

        .as-g{display:grid;grid-template-columns:repeat(12,1fr);gap:16px 14px;align-items:start}
        .as-g2{grid-column:span 2}
        .as-g3{grid-column:span 3}
        .as-g4{grid-column:span 4}
        .as-g5{grid-column:span 5}
        .as-g6{grid-column:span 6}
        .as-g7{grid-column:span 7}
        .as-g8{grid-column:span 8}
        .as-g10{grid-column:span 10}
        .as-g12{grid-column:span 12}

        .as-f{display:flex;flex-direction:column;gap:5px}
        .as-l{font-size:10.5px;font-weight:600;color:#5a8068;text-transform:uppercase;letter-spacing:0.4px;display:flex;align-items:center;gap:4px}
        .as-lr{color:#c84040;font-size:12px;line-height:1}
        .as-in{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;transition:border-color 0.13s,box-shadow 0.13s}
        .as-in:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .as-in::placeholder{color:#b0c8b8;font-size:12px}
        .as-in:disabled{background:#f0f4ee;color:#8aaa94;cursor:not-allowed;border-color:#e0ead8}
        .as-in.has-e{border-color:#e05252;box-shadow:0 0 0 2px rgba(224,82,82,0.1)}
        .as-in[type="date"]{cursor:pointer}
        .as-se{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 28px 0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;transition:border-color 0.13s}
        .as-se:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .as-fe{font-size:11px;color:#c84040;margin-top:2px;display:flex;align-items:center;gap:4px}
        .as-fh{font-size:11px;color:#7a9c84;margin-top:2px;line-height:1.45}

        .as-rw{border-top:1px solid #edf5e8;overflow-x:auto}
        .as-rb{display:flex;align-items:center;justify-content:space-between;padding:10px 18px;background:#f4f9f2;border-bottom:1px solid #e8f0e4}
        .as-rbl{display:flex;align-items:center;gap:8px}
        .as-rbl-l{font-size:11px;font-weight:600;color:#4a7060;text-transform:uppercase;letter-spacing:0.5px}
        .as-rt{width:100%;border-collapse:collapse;font-size:13px}
        .as-rt th{background:#f4f9f2;padding:8px 12px;text-align:left;font-size:10.5px;font-weight:700;color:#5a8068;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1.5px solid #dbe8d5;white-space:nowrap}
        .as-rt td{padding:9px 12px;border-bottom:1px solid #f0f6ec;color:#243830;vertical-align:middle}
        .as-rt tbody tr{cursor:pointer;transition:background 0.1s}
        .as-rt tbody tr:hover{background:#eef9f0}
        .as-rem{text-align:center;padding:28px 12px;color:#96b8a0;font-size:12.5px}

        .as-fb{display:flex;align-items:center;gap:9px;padding:11px 15px;border-radius:9px;font-size:13px;animation:asFdIn 0.2s ease;margin-bottom:14px}
        .as-fb.s{background:#f0faf2;border:1px solid #b4dec0;color:#1e6030}
        .as-fb.e{background:#fff5f5;border:1px solid #f8c0c0;border-left:3px solid #e05252;color:#b91c1c}
        .as-fb.i{background:#f0f8ff;border:1px solid #c7def8;border-left:3px solid #4a90d9;color:#1a4070}

        .as-ft{background:#fff;border-top:1px solid #dbe8d5;padding:8px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .as-ftl{display:flex;align-items:center;gap:20px}
        .as-fts{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#6a8a74}
        .as-fts strong{color:#1a2e22;font-weight:600}

        @keyframes asSpin{to{transform:rotate(360deg)}}
        .as-sp{width:14px;height:14px;flex-shrink:0;border:2px solid rgba(223,240,226,0.3);border-top-color:#dff0e2;border-radius:50%;animation:asSpin 0.65s linear infinite}
        .as-spd{width:14px;height:14px;flex-shrink:0;border:2px solid #d4e8cc;border-top-color:#3e9654;border-radius:50%;animation:asSpin 0.65s linear infinite}
        @keyframes asFdIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className="as-r">
        <header className="as-tb">
          <div className="as-tbl">
            <div className="as-lg">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="as-an">Venture<span className="as-asb">ERP &amp; Soluções</span></span>
            <span className="as-st">VASS0402 — Consulta de Assistência Técnica</span>
          </div>
        </header>

        <div className="as-ab">
          <div className="as-ag">
            <span className="as-al">Consulta</span>
            <button className="as-bt as-bt-p" onClick={handleConsultar} disabled={isSearching}>
              {isSearching ? <><div className="as-sp" />Consultando...</> : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/><path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>Consultar</>}
            </button>
          </div>
          <div className="as-ag">
            <span className="as-al">Ações</span>
            <button className="as-bt as-bt-d" onClick={handleLimpar} disabled={isSearching}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Limpar
            </button>
          </div>
          <div className="as-ag">
            <button className="as-bt as-bt-g">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>Ajuda
            </button>
          </div>
        </div>

        <div className="as-by">
          {feedback && (
            <div className={`as-fb ${feedback.type === "success" ? "s" : feedback.type === "error" ? "e" : "i"}`}>
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

          <div className="as-sb">
            <span className="as-sb-p">1 — Filtrar</span>
            <div className="as-sb-l" />
            <span className="as-sb-h">Preencha os campos e clique em Consultar</span>
          </div>

          <div className="as-c">
            <div className="as-ch">
              <div className="as-chl">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4"/><path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round"/></svg>
                <span className="as-ct">Filtros de Consulta</span>
              </div>
            </div>
            <div className="as-cb" style={{paddingBottom:14}}>
              <div className="as-g">
                <div className="as-f as-g4">
                  <label className="as-l">Chamado(s)</label>
                  <input className="as-in" value={filtros.chamados} onChange={e => setFilter("chamados", e.target.value)} placeholder="Número(s) do chamado"/>
                </div>
                <div className="as-f as-g2">
                  <label className="as-l">Data Início</label>
                  <input type="date" className="as-in" value={filtros.dataChamadoInicio} onChange={e => setFilter("dataChamadoInicio", e.target.value)}/>
                </div>
                <div className="as-f as-g2">
                  <label className="as-l">Data Fim</label>
                  <input type="date" className="as-in" value={filtros.dataChamadoFim} onChange={e => setFilter("dataChamadoFim", e.target.value)}/>
                </div>
                <div className="as-f as-g3">
                  <label className="as-l">Status</label>
                  <select className="as-se" value={filtros.status} onChange={e => setFilter("status", e.target.value)}>
                    {STATUS_OPTIONS_FILTER.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="as-f as-g3">
                  <label className="as-l">Cliente(s)</label>
                  <input className="as-in" value={filtros.clientes} onChange={e => setFilter("clientes", e.target.value)} placeholder="Código/Nome"/>
                </div>
                <div className="as-f as-g2">
                  <label className="as-l">Tipo Cliente</label>
                  <select className="as-se" value={filtros.tipoCliente} onChange={e => setFilter("tipoCliente", e.target.value)}>
                    {TIPO_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="as-f as-g3">
                  <label className="as-l">Atendente(s)</label>
                  <input className="as-in" value={filtros.atendentes} onChange={e => setFilter("atendentes", e.target.value)} placeholder="Código/Nome"/>
                </div>
                <div className="as-f as-g2">
                  <label className="as-l">Tipo Atendente</label>
                  <select className="as-se" value={filtros.tipoAtendente} onChange={e => setFilter("tipoAtendente", e.target.value)}>
                    {TIPO_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="as-f as-g3">
                  <label className="as-l">Cidade(s)</label>
                  <input className="as-in" value={filtros.cidades} onChange={e => setFilter("cidades", e.target.value)} placeholder="Código/Nome"/>
                </div>
                <div className="as-f as-g2">
                  <label className="as-l">Tipo Cidade</label>
                  <select className="as-se" value={filtros.tipoCidade} onChange={e => setFilter("tipoCidade", e.target.value)}>
                    {TIPO_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="as-f as-g2">
                  <label className="as-l">UF(s)</label>
                  <input className="as-in" value={filtros.ufs} onChange={e => setFilter("ufs", e.target.value)} placeholder="Sigla(s)"/>
                </div>
                <div className="as-f as-g2">
                  <label className="as-l">Tipo UF</label>
                  <select className="as-se" value={filtros.tipoUf} onChange={e => setFilter("tipoUf", e.target.value)}>
                    {TIPO_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="as-f as-g3">
                  <label className="as-l">Item</label>
                  <input className="as-in" value={filtros.item} onChange={e => setFilter("item", e.target.value)} placeholder="Código/Nome"/>
                </div>
                <div className="as-f as-g2">
                  <label className="as-l">Tipo Item</label>
                  <select className="as-se" value={filtros.tipoItem} onChange={e => setFilter("tipoItem", e.target.value)}>
                    {TIPO_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {hasSearched && (
            <>
              <div className="as-sb">
                <span className="as-sb-p">2 — Resultados</span>
                <div className="as-sb-l" />
                <span className="as-sb-h">{rows.length} chamado(s) encontrado(s)</span>
              </div>
              <div className="as-c">
                <div className="as-rw">
                  <div className="as-rb">
                    <div className="as-rbl">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round"/></svg>
                      <span className="as-rbl-l">Resultados</span>
                      <span className="as-cbg">{rows.length} registro(s)</span>
                    </div>
                  </div>
                  {rows.length === 0 ? (
                    <div className="as-rem">Nenhum chamado encontrado para os filtros informados.</div>
                  ) : (
                    <table className="as-rt">
                      <thead>
                        <tr>
                          <th style={{width:90}}>Chamado</th><th style={{width:100}}>Data</th><th style={{width:70}}>Cliente</th><th>Nome</th>
                          <th style={{width:100}}>Ass. Técnico</th><th style={{width:90}}>Tipo</th><th>Motivo</th><th style={{width:110}}>Status</th>
                          <th style={{width:70}}>Fechado</th><th style={{width:110}}>Cidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i}>
                            <td style={{fontWeight:600,color:"#1a4a2a"}}>#{r.chamado}</td><td style={{fontSize:12}}>{r.data}</td>
                            <td>{r.cliente}</td><td>{r.clienteNome}</td><td>{r.assTecnico}</td><td>{r.tipo}</td><td>{r.motivo}</td>
                            <td><span style={{display:"inline-flex",alignItems:"center",fontSize:11,fontWeight:600,borderRadius:12,padding:"2px 8px",background:r.status.toLowerCase().includes("pendente")?"#fef3c7":"#f0fae8",color:r.status.toLowerCase().includes("pendente")?"#92400e":"#1e6030",border:`1px solid ${r.status.toLowerCase().includes("pendente")?"#e0d090":"#b4dec0"}`}}>{r.status}</span></td>
                            <td><span style={{display:"inline-flex",alignItems:"center",fontSize:11,fontWeight:600,borderRadius:12,padding:"2px 8px",background:r.fechado==="Sim"?"#e8f0fc":"#f8f8f8",color:r.fechado==="Sim"?"#1a4080":"#96b8a0",border:`1px solid ${r.fechado==="Sim"?"#a8c0e8":"#e0e8e0"}`}}>{r.fechado}</span></td>
                            <td>{r.cidade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <footer className="as-ft">
          <div className="as-ftl">
            <div className="as-fts">Chamados: <strong>{rows.length}</strong></div>
            <div className="as-fts">Módulo: <strong>Assistência Técnica</strong></div>
          </div>
          <div className="as-fts" style={{gap:8}}>
            <span style={{color:"#b0c8b8",fontSize:11}}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>
      </div>
    </>
  );
}

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AcompanhamentoRow {
  pedido: string;
  cliente: string;
  clienteNome: string;
  dataEntrega: string;
  posicao: string;
  setor: string;
  prazo: "verde" | "amarelo" | "vermelho";
  status: string;
  itens: number;
}

interface ItemRow {
  numero: number;
  item: string;
  descricao: string;
  dataEntrega: string;
  posicao: string;
  prazo: string;
}

type FeedbackState = { type: "success" | "error"; message: string } | null;

const MOCK_PEDIDOS: AcompanhamentoRow[] = [
  { pedido:"000123", cliente:"001", clienteNome:"SOHOME LTDA", dataEntrega:"20/06/2026", posicao:"Aguardando Liberação", setor:"Comercial", prazo:"verde", status:"Aberto", itens:5 },
  { pedido:"000124", cliente:"002", clienteNome:"ALFA S.A.", dataEntrega:"15/06/2026", posicao:"Em Produção", setor:"Fábrica", prazo:"amarelo", status:"Em Andamento", itens:3 },
  { pedido:"000125", cliente:"003", clienteNome:"BETA LTDA", dataEntrega:"10/06/2026", posicao:"Em Separação", setor:"Almoxarifado", prazo:"vermelho", status:"Atrasado", itens:8 },
  { pedido:"000126", cliente:"004", clienteNome:"GAMA ME", dataEntrega:"25/06/2026", posicao:"Expedição", setor:"Logística", prazo:"verde", status:"Em Transporte", itens:12 },
  { pedido:"000127", cliente:"005", clienteNome:"DELTA EIRELI", dataEntrega:"05/06/2026", posicao:"Entregue", setor:"Cliente", prazo:"verde", status:"Atendido", itens:2 },
];

const MOCK_ITENS: ItemRow[] = [
  { numero:1, item:"IT001", descricao:"Produto A - Standard", dataEntrega:"20/06/2026", posicao:"Em Produção", prazo:"verde" },
  { numero:2, item:"IT002", descricao:"Produto B - Premium", dataEntrega:"18/06/2026", posicao:"Estoque", prazo:"verde" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Vpdv0253Page(): JSX.Element {
  const [filtroPedido, setFiltroPedido] = useState("");
  const [filtroDataEntrega, setFiltroDataEntrega] = useState("");
  const [exibirAtendidos, setExibirAtendidos] = useState(false);
  const [rows, setRows] = useState<AcompanhamentoRow[]>(MOCK_PEDIDOS);
  const [selectedPedido, setSelectedPedido] = useState<AcompanhamentoRow | null>(null);
  const [view, setView] = useState<"pedidos" | "itens" | "historicos">("pedidos");
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  function handleConsultar() {
    let filtered = MOCK_PEDIDOS;
    if (filtroPedido) filtered = filtered.filter(r => r.pedido.includes(filtroPedido));
    if (!exibirAtendidos) filtered = filtered.filter(r => r.status !== "Atendido");
    setRows(filtered);
    setFeedback({ type: "success", message: `${filtered.length} pedido(s) encontrado(s).` });
  }

  function openPedido(pedido: AcompanhamentoRow) { setSelectedPedido(pedido); setView("itens"); }

  const countPorStatus: Record<string, number> = {};
  rows.forEach(r => { countPorStatus[r.posicao] = (countPorStatus[r.posicao] || 0) + 1; });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .p5-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .p5-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .p5-topbar-left { display: flex; align-items: center; gap: 10px; }
        .p5-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .p5-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .p5-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .p5-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .p5-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .p5-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .p5-action-group:last-child { border-right: none; }
        .p5-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .p5-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .p5-bt-p { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .p5-bt-p:hover:not(:disabled) { background: #1e3a2a; }
        .p5-bt-p:disabled { opacity: 0.5; cursor: not-allowed; }
        .p5-bt-g { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .p5-bt-g:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .p5-bt-g:disabled { opacity: 0.5; cursor: not-allowed; }
        .p5-bt-sm { height: 28px; padding: 0 9px; font-size: 12px; }

        .p5-input {
          height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .p5-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .p5-input::placeholder { color: #b0c8b8; font-size: 12px; }

        .p5-chk { display: flex; align-items: center; gap: 6px; }
        .p5-chk input { width: 16px; height: 16px; accent-color: #3e9654; cursor: pointer; }
        .p5-chk span { font-size: 12.5px; color: #3a5a45; font-weight: 500; white-space: nowrap; }

        .p5-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .p5-body::-webkit-scrollbar { width: 5px; }
        .p5-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .p5-section-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 0 8px;
        }
        .p5-section-banner:first-child { padding-top: 0; }
        .p5-section-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .p5-section-line { flex: 1; height: 1px; background: #dbe8d5; }
        .p5-section-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .p5-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .p5-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .p5-card-header-left { display: flex; align-items: center; gap: 8px; }
        .p5-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .p5-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }

        .p5-pos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; margin-bottom: 16px; }
        .p5-pos-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 10px; padding: 14px 16px; display: flex;
          flex-direction: column; gap: 4px; border-top: 3px solid #3e9654;
        }
        .p5-pos-label { font-size: 10.5px; font-weight: 600; color: #5a8068; text-transform: uppercase; letter-spacing: 0.5px; }
        .p5-pos-val { font-size: 26px; font-weight: 700; color: #1a2e22; }

        .p5-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
        .p5-tbl th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .p5-tbl td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .p5-tbl tbody tr { cursor: pointer; transition: background 0.1s; }
        .p5-tbl tbody tr:hover { background: #eef9f0; }

        .p5-dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
        .p5-dot-g { background: #22c55e; }
        .p5-dot-y { background: #eab308; }
        .p5-dot-r { background: #ef4444; }

        .p5-fb {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: p5Fade 0.2s ease;
          margin-bottom: 14px;
        }
        .p5-fb.s { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .p5-fb.e { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }

        .p5-bcrumb {
          font-size: 12.5px; color: #6a8a74; padding: 8px 0; display: flex; align-items: center; gap: 6px;
        }
        .p5-bcrumb button { background: none; border: none; color: #3e9654; cursor: pointer; font-size: 12.5px; font-family: 'Inter', sans-serif; font-weight: 500; }
        .p5-bcrumb button:hover { text-decoration: underline; }

        .p5-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .p5-footer-stat { font-size: 11.5px; color: #6a8a74; display: flex; align-items: center; gap: 4px; }
        .p5-footer-stat strong { color: #1a2e22; font-weight: 600; }

        .p5-filter-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }

        @keyframes p5Fade { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="p5-root">

        {/* ── TOPBAR ── */}
        <header className="p5-topbar">
          <div className="p5-topbar-left">
            <div className="p5-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="p5-app-name">
              Venture<span className="p5-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="p5-screen-title">VPDV0253 — Console de Acompanhamento de Pedidos</span>
          </div>
        </header>

        {/* ── ACTION BAR ── */}
        <div className="p5-actionbar">
          <div className="p5-action-group">
            <span className="p5-action-label">Filtros</span>
            <input type="text" className="p5-input" style={{width:140}} value={filtroPedido} onChange={e => setFiltroPedido(e.target.value)} placeholder="Pedido #" />
            <input type="date" className="p5-input" style={{width:150}} value={filtroDataEntrega} onChange={e => setFiltroDataEntrega(e.target.value)} />
            <div className="p5-chk">
              <input type="checkbox" checked={exibirAtendidos} onChange={e => setExibirAtendidos(e.target.checked)} />
              <span>Exibir Atendidos</span>
            </div>
          </div>
          <div className="p5-action-group">
            <button className="p5-btn p5-bt-p" onClick={handleConsultar}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Consultar
            </button>
          </div>
          {selectedPedido && (
            <div className="p5-action-group">
              <button className="p5-btn p5-bt-g" onClick={() => { setSelectedPedido(null); setView("pedidos"); }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Voltar
              </button>
            </div>
          )}
        </div>

        {/* ── BODY ── */}
        <div className="p5-body">

          {/* Feedback */}
          {feedback && (
            <div className={`p5-fb ${feedback.type === "success" ? "s" : "e"}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === "success"
                  ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  : <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4" /><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round" /></>
                }
              </svg>
              {feedback.message}
            </div>
          )}

          {!selectedPedido ? (
            <>
              {/* ── POSITION CARDS ── */}
              <div className="p5-pos-grid">
                {Object.entries(countPorStatus).map(([posicao, count]) => (
                  <div className="p5-pos-card" key={posicao}>
                    <span className="p5-pos-label">{posicao}</span>
                    <span className="p5-pos-val">{count}</span>
                  </div>
                ))}
              </div>

              {/* ── PEDIDOS TABLE ── */}
              <div className="p5-section-banner">
                <span className="p5-section-pill">Pedidos em Acompanhamento</span>
                <div className="p5-section-line" />
                <span className="p5-card-badge">{rows.length} registro(s)</span>
              </div>

              <div className="p5-card">
                <div className="p5-card-header">
                  <div className="p5-card-header-left">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4h12M2 8h12M2 12h8" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span className="p5-card-title">Resultados</span>
                  </div>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table className="p5-tbl">
                    <thead>
                      <tr><th>Pedido</th><th>Cliente</th><th>Data Entrega</th><th>Posição</th><th>Setor</th><th>Prazo</th><th>Status</th><th>Itens</th><th>Ações</th></tr>
                    </thead>
                    <tbody>
                      {rows.map(r => (
                        <tr key={r.pedido}>
                          <td style={{fontWeight:600,color:"#1a4a2a"}}>#{r.pedido}</td>
                          <td>{r.clienteNome}</td>
                          <td>{r.dataEntrega}</td>
                          <td>{r.posicao}</td>
                          <td>{r.setor}</td>
                          <td><span className={`p5-dot p5-dot-${r.prazo === "verde" ? "g" : r.prazo === "amarelo" ? "y" : "r"}`} title={r.prazo === "verde" ? "No prazo" : r.prazo === "amarelo" ? "Atenção" : "Atrasado"} /></td>
                          <td>{r.status}</td>
                          <td style={{fontWeight:600,color:"#1a4a2a"}}>{r.itens}</td>
                          <td style={{display:"flex",gap:4}}>
                            <button className="p5-btn p5-bt-g p5-bt-sm" onClick={() => openPedido(r)}>Itens</button>
                            <button className="p5-btn p5-bt-g p5-bt-sm" onClick={() => { setSelectedPedido(r); setView("historicos"); }}>Hist.</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ── BREADCRUMB ── */}
              <div className="p5-bcrumb">
                <button onClick={() => { setSelectedPedido(null); setView("pedidos"); }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{verticalAlign:"middle",marginRight:3}}>
                    <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Pedidos
                </button>
                <span style={{color:"#b0c8b8"}}>/</span>
                <span style={{fontWeight:600,color:"#2a4a35"}}>#{selectedPedido.pedido} — {selectedPedido.clienteNome}</span>
              </div>

              {view === "itens" && (
                <div className="p5-card">
                  <div className="p5-card-header">
                    <div className="p5-card-header-left">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M2 4h12M2 8h12M2 12h8" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                      <span className="p5-card-title">Itens do Pedido #{selectedPedido.pedido}</span>
                    </div>
                    <span className="p5-card-badge">{MOCK_ITENS.length} itens</span>
                  </div>
                  <div style={{overflowX:"auto"}}>
                    <table className="p5-tbl">
                      <thead><tr><th>Nº</th><th>Item</th><th>Descrição</th><th>Data Entrega</th><th>Posição</th><th>Prazo</th></tr></thead>
                      <tbody>
                        {MOCK_ITENS.map(item => (
                          <tr key={item.numero}>
                            <td style={{fontWeight:600,color:"#1a4a2a"}}>{item.numero}</td>
                            <td>{item.item}</td><td>{item.descricao}</td>
                            <td>{item.dataEntrega}</td><td>{item.posicao}</td>
                            <td><span className={`p5-dot p5-dot-${item.prazo === "verde" ? "g" : item.prazo === "amarelo" ? "y" : "r"}`} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {view === "historicos" && (
                <div className="p5-card">
                  <div className="p5-card-header">
                    <div className="p5-card-header-left">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="#3e9654" strokeWidth="1.4" />
                        <path d="M8 5v3.5M8 10.5h.01" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                      <span className="p5-card-title">Históricos — Pedido #{selectedPedido.pedido}</span>
                    </div>
                  </div>
                  <div style={{overflowX:"auto"}}>
                    <table className="p5-tbl">
                      <thead><tr><th>Data/Hora</th><th>Usuário</th><th>Operação</th><th>Posição Anterior</th><th>Posição Nova</th></tr></thead>
                      <tbody>
                        <tr><td>10/05/2026 14:30</td><td>operador1</td><td>Liberação Comercial</td><td>Aguardando</td><td>Liberado Comercial</td></tr>
                        <tr><td>12/05/2026 09:15</td><td>sistema</td><td>Envio para Produção</td><td>Liberado Comercial</td><td>Em Produção</td></tr>
                        <tr><td>15/05/2026 16:45</td><td>operador2</td><td>Atualização Prazo</td><td>Em Produção</td><td>Em Produção</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── FOOTER ── */}
        <footer className="p5-footer">
          <div className="p5-footer-stat">
            Pedidos: <strong>{rows.length}</strong>
          </div>
          <div className="p5-footer-stat">
            <span style={{color:"#b0c8b8",fontSize:11}}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>
      </div>
    </>
  );
}

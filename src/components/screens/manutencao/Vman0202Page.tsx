import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrdemRow {
  ordem: string;
  recurso: string;
  recursoDesc: string;
  dtSolicitacao: string;
  dtFechamento: string;
  manutencao: string;
  situacao: string;
  urgente: boolean;
  finalizada: boolean;
}

interface Apontamento {
  id: number;
  executor: string;
  dataInicio: string;
  horaInicio: string;
  dataFim: string;
  horaFim: string;
  tempoHoras: number;
  diagnostico: string;
  efeito: string;
  causa: string;
}

interface Consumo {
  id: number;
  item: string;
  itemDesc: string;
  um: string;
  mascaraId: string;
  almox: string;
  quantidadeTotal: number;
  quantidadeRequisitada: number;
  final: boolean;
}

interface Gasto {
  id: number;
  data: string;
  fornecedor: string;
  nfEntrada: string;
  valorTotal: number;
}

type FeedbackState = { type: "success" | "error"; message: string } | null;

const MOCK_ORDENS: OrdemRow[] = [
  { ordem:"OS0001", recurso:"MAQ01", recursoDesc:"Prensa Hidráulica 500T", dtSolicitacao:"05/05/2026", dtFechamento:"", manutencao:"Corretiva", situacao:"Liberada", urgente:true, finalizada:false },
  { ordem:"OS0002", recurso:"MAQ02", recursoDesc:"Centro Usinagem CNC", dtSolicitacao:"01/05/2026", dtFechamento:"03/05/2026", manutencao:"Preventiva", situacao:"Firme", urgente:false, finalizada:true },
  { ordem:"OS0003", recurso:"MAQ03", recursoDesc:"Compressor 200HP", dtSolicitacao:"08/05/2026", dtFechamento:"", manutencao:"Corretiva", situacao:"Liberada", urgente:false, finalizada:false },
];

const MOCK_APONTAMENTOS: Apontamento[] = [
  { id:1, executor:"FUN001 - João Silva", dataInicio:"05/05/2026", horaInicio:"08:00", dataFim:"05/05/2026", horaFim:"12:00", tempoHoras:4, diagnostico:"Vazamento hidráulico na mangueira principal", efeito:"Parada de máquina", causa:"Desgaste da mangueira" },
];

const MOCK_CONSUMOS: Consumo[] = [
  { id:1, item:"MP001", itemDesc:"Mangueira Hidráulica 1\"", um:"M", mascaraId:"", almox:"ALM01", quantidadeTotal:3, quantidadeRequisitada:2, final:false },
  { id:2, item:"MP002", itemDesc:"Óleo Hidráulico ISO 68", um:"L", mascaraId:"", almox:"ALM01", quantidadeTotal:20, quantidadeRequisitada:20, final:true },
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

export function Vman0202Page(): JSX.Element {
  const [ordens] = useState<OrdemRow[]>(MOCK_ORDENS);
  const [selectedOrdem, setSelectedOrdem] = useState<OrdemRow | null>(null);
  const [apontamentos] = useState<Apontamento[]>(MOCK_APONTAMENTOS);
  const [consumos, setConsumos] = useState<Consumo[]>(MOCK_CONSUMOS);
  const [gastos] = useState<Gasto[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [view, setView] = useState<"ordens" | "detalhe">("ordens");

  function openOrdem(ordem: OrdemRow) {
    if (ordem.finalizada) {
      setFeedback({ type: "error", message: "A ordem selecionada se encontra finalizada." });
      return;
    }
    setSelectedOrdem(ordem);
    setView("detalhe");
    setFeedback(null);
  }

  async function handleSalvarApontamento() {
    setIsSaving(true);
    try {
      await new Promise(r => setTimeout(r, 500));
      setFeedback({ type: "success", message: "Apontamento salvo com sucesso." });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Falha ao salvar.") });
    } finally { setIsSaving(false); }
  }

  function requisitarConsumo(id: number) {
    setConsumos(p => p.map(c => c.id === id ? { ...c, quantidadeRequisitada: c.quantidadeTotal, final: true } : c));
    setFeedback({ type: "success", message: "Consumo requisitado com sucesso." });
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .m2-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .m2-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
        }
        .m2-topbar-left { display: flex; align-items: center; gap: 10px; }
        .m2-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .m2-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .m2-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .m2-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .m2-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .m2-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .m2-action-group:last-child { border-right: none; }
        .m2-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .m2-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .m2-bt-p { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .m2-bt-p:hover:not(:disabled) { background: #1e3a2a; }
        .m2-bt-p:disabled { opacity: 0.5; cursor: not-allowed; }
        .m2-bt-g { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .m2-bt-g:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .m2-bt-g:disabled { opacity: 0.5; cursor: not-allowed; }
        .m2-bt-d { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .m2-bt-d:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .m2-bt-sm { height: 28px; padding: 0 9px; font-size: 12px; }

        .m2-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .m2-body::-webkit-scrollbar { width: 5px; }
        .m2-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .m2-section-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 0 8px;
        }
        .m2-section-banner:first-child { padding-top: 0; }
        .m2-section-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .m2-section-line { flex: 1; height: 1px; background: #dbe8d5; }
        .m2-section-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .m2-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .m2-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .m2-card-header-left { display: flex; align-items: center; gap: 8px; }
        .m2-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .m2-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .m2-card-body { padding: 18px 18px; }

        .m2-section-label {
          font-size: 10px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: #a0b8a8; margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px;
        }
        .m2-section-label::after { content: ''; flex: 1; height: 1px; background: #e8f0e4; }
        .m2-section-sep { height: 1px; background: #edf5e8; margin: 20px 0; }

        .m2-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .m2-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .m2-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .m2-table tbody tr { cursor: pointer; transition: background 0.1s; }
        .m2-table tbody tr:hover { background: #eef9f0; }
        .m2-table-no-hover tbody tr { cursor: default; }
        .m2-table-no-hover tbody tr:hover { background: transparent; }
        .m2-tb-empty { text-align: center; padding: 28px 12px; color: #96b8a0; font-size: 12.5px; }

        .m2-badge {
          display: inline-flex; align-items: center;
          font-size: 11px; font-weight: 600; border-radius: 12px; padding: 2px 8px;
        }
        .m2-bd-urgente { background: #fee2e2; color: #991b1b; border: 1px solid #f8b0b0; }
        .m2-bd-liberada { background: #e8f5e0; color: #2a6018; border: 1px solid #b4d898; }
        .m2-bd-firme { background: #e8f0fc; color: #1a4080; border: 1px solid #a8c0e8; }

        .m2-field { display: flex; flex-direction: column; gap: 5px; }
        .m2-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .m2-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .m2-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .m2-input::placeholder { color: #b0c8b8; font-size: 12px; }

        .m2-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .m2-g4 { grid-column: span 4; }

        .m2-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: m2FadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .m2-fb-success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .m2-fb-error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }

        .m2-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .m2-footer-left { display: flex; align-items: center; gap: 20px; }
        .m2-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .m2-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes m2-spin { to { transform: rotate(360deg); } }
        .m2-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: m2-spin 0.65s linear infinite;
        }
        @keyframes m2FadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="m2-root">

        <header className="m2-topbar">
          <div className="m2-topbar-left">
            <div className="m2-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="m2-app-name">
              Venture<span className="m2-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="m2-screen-title">VMAN0202 — Apontamento de Ordens de Serviço de Manutenção</span>
          </div>
        </header>

        <div className="m2-actionbar">
          {view === "detalhe" && (
            <div className="m2-action-group">
              <button
                className="m2-btn m2-bt-g"
                onClick={() => { setView("ordens"); setSelectedOrdem(null); }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M13 8H3M6 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Voltar
              </button>
            </div>
          )}
          {view === "detalhe" && (
            <div className="m2-action-group">
              <span className="m2-action-label">Apontamento</span>
              <button
                className="m2-btn m2-bt-p"
                onClick={handleSalvarApontamento}
                disabled={isSaving}
              >
                {isSaving
                  ? <><div className="m2-spinner" />Salvando...</>
                  : <>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                        <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                      Salvar Apontamento
                    </>
                }
              </button>
            </div>
          )}
        </div>

        <div className="m2-body">

          {feedback && (
            <div className={`m2-feedback ${feedback.type === "success" ? "m2-fb-success" : "m2-fb-error"}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === "success"
                  ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  : <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4" /><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round" /></>
                }
              </svg>
              {feedback.message}
            </div>
          )}

          {view === "ordens" && (
            <>
              <div className="m2-section-banner">
                <span className="m2-section-pill">1 — Ordens de Serviço</span>
                <div className="m2-section-line" />
                <span className="m2-section-hint">Clique em uma ordem para abrir os detalhes e realizar apontamentos</span>
              </div>

              <div className="m2-card">
                <div className="m2-card-header">
                  <div className="m2-card-header-left">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4h12M2 8h12M2 12h8" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span className="m2-card-title">Ordens de Serviço</span>
                  </div>
                  <span className="m2-card-badge">{ordens.length} ordens</span>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table className="m2-table">
                    <thead>
                      <tr>
                        <th>Ordem</th><th>Recurso</th><th>Dt. Solicitação</th><th>Dt. Fechamento</th>
                        <th>Manutenção</th><th>Situação</th><th>Urgente</th><th>Finalizada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordens.map(o => (
                        <tr key={o.ordem} onClick={() => openOrdem(o)}>
                          <td style={{fontWeight:600,color:"#1a4a2a"}}>{o.ordem}</td>
                          <td>{o.recursoDesc}</td>
                          <td>{o.dtSolicitacao}</td>
                          <td style={{color: o.dtFechamento ? "#243830" : "#96b8a0"}}>{o.dtFechamento || "—"}</td>
                          <td>{o.manutencao}</td>
                          <td>
                            <span className={`m2-badge ${o.situacao === "Liberada" ? "m2-bd-liberada" : "m2-bd-firme"}`}>
                              {o.situacao}
                            </span>
                          </td>
                          <td>
                            {o.urgente
                              ? <span className="m2-badge m2-bd-urgente">Sim</span>
                              : <span style={{color:"#96b8a0"}}>Não</span>
                            }
                          </td>
                          <td style={{color: o.finalizada ? "#2a8040" : "#96b8a0", fontWeight: o.finalizada ? 600 : 400}}>
                            {o.finalizada ? "Sim" : "Não"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {view === "detalhe" && selectedOrdem && (
            <>
              <div className="m2-section-banner">
                <span className="m2-section-pill">2 — Detalhe da Ordem</span>
                <div className="m2-section-line" />
                <span className="m2-section-hint">Ordem: {selectedOrdem.ordem} — {selectedOrdem.recursoDesc}</span>
              </div>

              <div className="m2-card">
                <div className="m2-card-header">
                  <div className="m2-card-header-left">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" />
                      <path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span className="m2-card-title">Ordem: {selectedOrdem.ordem} - {selectedOrdem.recursoDesc}</span>
                  </div>
                  <span className="m2-card-badge">{selectedOrdem.situacao}</span>
                </div>

                <div className="m2-card-body">

                  <div className="m2-section-label">Bloco de Apontamentos</div>
                  <table className="m2-table m2-table-no-hover">
                    <thead>
                      <tr>
                        <th>Executor</th><th>Data Início</th><th>Hora Início</th>
                        <th>Data Fim</th><th>Hora Fim</th><th>Tempo (h)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apontamentos.map(a => (
                        <tr key={a.id}>
                          <td style={{fontWeight:500}}>{a.executor}</td><td>{a.dataInicio}</td><td>{a.horaInicio}</td>
                          <td>{a.dataFim}</td><td>{a.horaFim}</td><td style={{fontWeight:600,color:"#1a4a2a"}}>{a.tempoHoras}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {apontamentos[0] && (
                    <>
                      <div className="m2-section-sep" />
                      <div className="m2-section-label">Diagnóstico</div>
                      <div className="m2-grid">
                        <div className="m2-field m2-g4">
                          <label className="m2-label">Diagnóstico</label>
                          <input className="m2-input" value={apontamentos[0].diagnostico} readOnly />
                        </div>
                        <div className="m2-field m2-g4">
                          <label className="m2-label">Efeito</label>
                          <input className="m2-input" value={apontamentos[0].efeito} readOnly />
                        </div>
                        <div className="m2-field m2-g4">
                          <label className="m2-label">Causa</label>
                          <input className="m2-input" value={apontamentos[0].causa} readOnly />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="m2-section-sep" />

                  <div className="m2-section-label">Consumos</div>
                  <table className="m2-table m2-table-no-hover">
                    <thead>
                      <tr>
                        <th>Item</th><th>Descrição</th><th>UM</th>
                        <th style={{textAlign:"right"}}>Qtd Total</th><th style={{textAlign:"right"}}>Qtd Requisitada</th>
                        <th style={{textAlign:"right"}}>Qtd Pendente</th><th>Final</th><th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consumos.map(c => (
                        <tr key={c.id}>
                          <td style={{fontWeight:600,color:"#1a4a2a"}}>{c.item}</td><td>{c.itemDesc}</td><td>{c.um}</td>
                          <td style={{textAlign:"right"}}>{c.quantidadeTotal}</td>
                          <td style={{textAlign:"right"}}>{c.quantidadeRequisitada}</td>
                          <td style={{textAlign:"right"}}>{c.quantidadeTotal - c.quantidadeRequisitada}</td>
                          <td>
                            {c.final
                              ? <span style={{color:"#2a8040",fontWeight:600}}>Sim</span>
                              : <span style={{color:"#96b8a0"}}>Não</span>
                            }
                          </td>
                          <td>
                            {!c.final && (
                              <button className="m2-btn m2-bt-sm m2-bt-g" onClick={() => requisitarConsumo(c.id)}>
                                Requisitar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="m2-section-sep" />

                  <div className="m2-section-label">Gastos com Terceiros</div>
                  <table className="m2-table m2-table-no-hover">
                    <thead>
                      <tr>
                        <th>Data</th><th>Fornecedor</th><th>NF Entrada</th><th style={{textAlign:"right"}}>Valor Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gastos.map(g => (
                        <tr key={g.id}><td>{g.data}</td><td>{g.fornecedor}</td><td>{g.nfEntrada}</td><td style={{textAlign:"right"}}>R$ {g.valorTotal.toFixed(2)}</td></tr>
                      ))}
                      {gastos.length === 0 && (
                        <tr><td colSpan={4} className="m2-tb-empty">Nenhum gasto com terceiros registrado.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <footer className="m2-footer">
          <div className="m2-footer-left">
            <div className="m2-footer-stat">
              Ordens: <strong>{ordens.length}</strong>
            </div>
            <div className="m2-footer-stat">
              Visualização: <strong>{view === "ordens" ? "Lista" : selectedOrdem?.ordem ?? "—"}</strong>
            </div>
          </div>
          <span style={{color:"#b0c8b8",fontSize:11}}>GRUPO VENTURE LTDA</span>
        </footer>

      </div>
    </>
  );
}

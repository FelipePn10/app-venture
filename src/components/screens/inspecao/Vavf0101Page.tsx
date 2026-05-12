import { useState } from "react";
import {
  saveAvaliacaoFornecedor,
  type DimensaoDTO,
  type CriterioDTO,
  type IntervaloDTO,
} from "@/services/inspecaoService";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

const FORNECEDORES = [
  { value: "", label: "Selecione..." },
  { value: "001", label: "FORNECEDOR A S.A." },
  { value: "002", label: "FORNECEDOR B LTDA" },
  { value: "003", label: "FORNECEDOR C ME" },
];

const TIPOS_FORNECEDOR = [
  { value: "", label: "Selecione..." },
  { value: "NAC", label: "Nacional" },
  { value: "IMP", label: "Importado" },
  { value: "AMB", label: "Ambos" },
];

const TIPOS_UTILIZACAO = [
  { value: "", label: "Selecione..." },
  { value: "MP", label: "Matéria-Prima" },
  { value: "PA", label: "Produto Acabado" },
  { value: "SV", label: "Serviço" },
  { value: "ES", label: "Especial" },
];

const CRITERIO_TIPOS = [
  { value: "MAIOR_MELHOR", label: "Maior é Melhor" },
  { value: "MENOR_MELHOR", label: "Menor é Melhor" },
  { value: "NOMINAL_MELHOR", label: "Nominal é Melhor" },
];

function normalizeError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const resp = (error as any).response;
    if (resp?.data?.message) return String(resp.data.message);
  }
  return error instanceof Error ? error.message : fallback;
}

export function Vavf0101Page(): JSX.Element {
  const [fornecedor, setFornecedor] = useState("");
  const [tipoFornecedor, setTipoFornecedor] = useState("");
  const [tipoUtilizacao, setTipoUtilizacao] = useState("");
  const [dimensoes, setDimensoes] = useState<DimensaoDTO[]>([]);
  const [criterios, setCriterios] = useState<CriterioDTO[]>([]);
  const [intervalos, setIntervalos] = useState<IntervaloDTO[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);

  function addDimensao() {
    setDimensoes(p => [...p, { id: crypto.randomUUID(), descricao: "", peso: 0 }]);
  }

  function updateDimensao(id: string, field: keyof DimensaoDTO, value: string | number) {
    setDimensoes(p => p.map(d => d.id === id ? { ...d, [field]: value } : d));
  }

  function removeDimensao(id: string) { setDimensoes(p => p.filter(d => d.id !== id)); }

  function addCriterio() {
    setCriterios(p => [...p, { id: crypto.randomUUID(), descricao: "", peso: 0, tipo: "MAIOR_MELHOR" }]);
  }

  function updateCriterio(id: string, field: keyof CriterioDTO, value: string | number) {
    setCriterios(p => p.map(c => c.id === id ? { ...c, [field]: value } : c));
  }

  function removeCriterio(id: string) { setCriterios(p => p.filter(c => c.id !== id)); }

  function addIntervalo() {
    const nextSeq = intervalos.length + 1;
    setIntervalos(p => [...p, { sequencia: nextSeq, item: "", classificacao: "", fornecedor: "", valor_inicial: 0, valor_final: 0, conceito: 5 }]);
  }

  function updateIntervalo(index: number, field: keyof IntervaloDTO, value: string | number) {
    setIntervalos(p => p.map((iv, i) => i === index ? { ...iv, [field]: value } : iv));
  }

  function removeIntervalo(index: number) { setIntervalos(p => p.filter((_, i) => i !== index)); }

  async function handleSalvar() {
    if (!fornecedor) { setFeedback({ type: "error", message: "Fornecedor obrigatório." }); return; }
    setIsSaving(true); setFeedback(null);
    try {
      await saveAvaliacaoFornecedor({ fornecedor, tipo_fornecedor: tipoFornecedor, tipo_utilizacao: tipoUtilizacao, dimensoes, criterios, intervalos });
      setFeedback({ type: "success", message: "Parâmetros de avaliação salvos com sucesso." });
    } catch (error) { setFeedback({ type: "error", message: normalizeError(error, "Erro ao salvar.") }); }
    finally { setIsSaving(false); }
  }

  function handleNovo() {
    setFornecedor(""); setTipoFornecedor(""); setTipoUtilizacao("");
    setDimensoes([]); setCriterios([]); setIntervalos([]); setFeedback(null);
  }

  function handleLimpar() { handleNovo(); }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .avf2-r{min-height:100vh;background:#f0f4ee;font-family:'Inter',sans-serif;color:#1a2e22;display:flex;flex-direction:column}

        .avf2-tb{height:52px;background:#162e20;display:flex;align-items:center;justify-content:space-between;padding:0 20px;flex-shrink:0;border-bottom:1px solid rgba(62,150,84,0.15)}
        .avf2-tbl{display:flex;align-items:center;gap:10px}
        .avf2-lg{width:28px;height:28px;background:#3e9654;border-radius:6px;display:flex;align-items:center;justify-content:center}
        .avf2-an{font-size:13px;font-weight:600;color:#e0f0e3;line-height:1.1}
        .avf2-asb{display:block;font-size:9px;font-weight:400;color:#3d6b4d}
        .avf2-st{font-size:12.5px;font-weight:500;color:#5a9a6a;padding-left:14px;margin-left:14px;border-left:1px solid rgba(255,255,255,0.08)}

        .avf2-ab{background:#fff;border-bottom:1px solid #dbe8d5;padding:0 20px;display:flex;align-items:center;gap:4px;height:46px;flex-shrink:0}
        .avf2-ag{display:flex;align-items:center;gap:4px;padding-right:12px;margin-right:8px;border-right:1px solid #e8f0e4}
        .avf2-ag:last-child{border-right:none}
        .avf2-al{font-size:9.5px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#96b8a0;margin-right:4px;white-space:nowrap}
        .avf2-bt{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border:1.5px solid transparent;border-radius:7px;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background 0.13s,border-color 0.13s,color 0.13s}
        .avf2-bt-p{background:#162e20;color:#dff0e2;border-color:#162e20}
        .avf2-bt-p:hover:not(:disabled){background:#1e3a2a}
        .avf2-bt-p:disabled{opacity:0.5;cursor:not-allowed}
        .avf2-bt-g{background:transparent;color:#4a7060;border-color:#d4e8d0}
        .avf2-bt-g:hover:not(:disabled){background:#f0f8ec;border-color:#b0d4b8;color:#1a3828}
        .avf2-bt-g:disabled{opacity:0.5;cursor:not-allowed}
        .avf2-bt-d{background:transparent;color:#b94040;border-color:#f0c8c8}
        .avf2-bt-d:hover:not(:disabled){background:#fff0f0;border-color:#e09090}
        .avf2-bt-n{background:#eef9f0;color:#1a6030;border-color:#b4d8b8;font-weight:600}
        .avf2-bt-n:hover:not(:disabled){background:#dff5e4;border-color:#88c898}
        .avf2-bt-sm{height:28px;padding:0 9px;font-size:11px}

        .avf2-by{flex:1;padding:16px 20px;display:flex;flex-direction:column;gap:0;overflow-y:auto}
        .avf2-by::-webkit-scrollbar{width:5px}
        .avf2-by::-webkit-scrollbar-thumb{background:#cce0c8;border-radius:4px}

        .avf2-sb{display:flex;align-items:center;gap:10px;padding:14px 0 8px}
        .avf2-sb:first-child{padding-top:0}
        .avf2-sb-p{font-size:9.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#5a8068;background:#e0ede0;border:1px solid #c8dcc8;border-radius:20px;padding:3px 10px;white-space:nowrap}
        .avf2-sb-l{flex:1;height:1px;background:#dbe8d5}
        .avf2-sb-h{font-size:11px;color:#96b8a0;white-space:nowrap}

        .avf2-c{background:#fff;border:1px solid #dbe8d5;border-radius:12px;overflow:hidden;margin-bottom:14px}
        .avf2-ch{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid #edf5e8;background:#fafcf9}
        .avf2-chl{display:flex;align-items:center;gap:8px}
        .avf2-ct{font-size:12px;font-weight:600;color:#2a4a35;text-transform:uppercase;letter-spacing:0.6px}
        .avf2-cbg{font-size:10.5px;font-weight:500;color:#3e9654;background:#eef5ea;border:1px solid #c4dfc8;border-radius:12px;padding:2px 8px}
        .avf2-cb{padding:18px 18px}

        .avf2-g{display:grid;grid-template-columns:repeat(12,1fr);gap:16px 14px;align-items:start}
        .avf2-g2{grid-column:span 2}
        .avf2-g3{grid-column:span 3}
        .avf2-g4{grid-column:span 4}
        .avf2-g12{grid-column:span 12}

        .avf2-f{display:flex;flex-direction:column;gap:5px}
        .avf2-l{font-size:10.5px;font-weight:600;color:#5a8068;text-transform:uppercase;letter-spacing:0.4px;display:flex;align-items:center;gap:4px}
        .avf2-lr{color:#c84040;font-size:12px;line-height:1}
        .avf2-in{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;transition:border-color 0.13s,box-shadow 0.13s}
        .avf2-in:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .avf2-in::placeholder{color:#b0c8b8;font-size:12px}
        .avf2-in[type="number"]{-moz-appearance:textfield}
        .avf2-se{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 28px 0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;transition:border-color 0.13s}
        .avf2-se:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .avf2-fh{font-size:11px;color:#7a9c84;margin-top:2px;line-height:1.45}

        .avf2-rw{border-top:1px solid #edf5e8;overflow-x:auto}
        .avf2-rb{display:flex;align-items:center;justify-content:space-between;padding:10px 18px;background:#f4f9f2;border-bottom:1px solid #e8f0e4}
        .avf2-rbl{display:flex;align-items:center;gap:8px}
        .avf2-rbl-l{font-size:11px;font-weight:600;color:#4a7060;text-transform:uppercase;letter-spacing:0.5px}
        .avf2-rt{width:100%;border-collapse:collapse;font-size:13px}
        .avf2-rt th{background:#f4f9f2;padding:8px 12px;text-align:left;font-size:10.5px;font-weight:700;color:#5a8068;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1.5px solid #dbe8d5;white-space:nowrap}
        .avf2-rt td{padding:9px 12px;border-bottom:1px solid #f0f6ec;color:#243830;vertical-align:middle}
        .avf2-rt tbody tr:hover{background:#eef9f0}
        .avf2-rem{text-align:center;padding:28px 12px;color:#96b8a0;font-size:12.5px}

        .avf2-fb{display:flex;align-items:center;gap:9px;padding:11px 15px;border-radius:9px;font-size:13px;animation:avf2FdIn 0.2s ease;margin-bottom:14px}
        .avf2-fb.s{background:#f0faf2;border:1px solid #b4dec0;color:#1e6030}
        .avf2-fb.e{background:#fff5f5;border:1px solid #f8c0c0;border-left:3px solid #e05252;color:#b91c1c}
        .avf2-fb.i{background:#f0f8ff;border:1px solid #c7def8;border-left:3px solid #4a90d9;color:#1a4070}

        .avf2-sep{height:1px;background:#edf5e8;margin:20px 0}
        .avf2-sl{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#a0b8a8;margin-bottom:14px;display:flex;align-items:center;gap:8px}
        .avf2-sl::after{content:'';flex:1;height:1px;background:#e8f0e4}

        .avf2-ft{background:#fff;border-top:1px solid #dbe8d5;padding:8px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .avf2-ftl{display:flex;align-items:center;gap:20px}
        .avf2-fts{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#6a8a74}
        .avf2-fts strong{color:#1a2e22;font-weight:600}

        @keyframes avf2Spin{to{transform:rotate(360deg)}}
        .avf2-sp{width:14px;height:14px;flex-shrink:0;border:2px solid rgba(223,240,226,0.3);border-top-color:#dff0e2;border-radius:50%;animation:avf2Spin 0.65s linear infinite}
        .avf2-spd{width:14px;height:14px;flex-shrink:0;border:2px solid #d4e8cc;border-top-color:#3e9654;border-radius:50%;animation:avf2Spin 0.65s linear infinite}
        @keyframes avf2FdIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className="avf2-r">
        <header className="avf2-tb">
          <div className="avf2-tbl">
            <div className="avf2-lg">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="avf2-an">Venture<span className="avf2-asb">ERP &amp; Soluções</span></span>
            <span className="avf2-st">VAVF0101 — Cadastro de Parâmetros de Avaliação de Fornecedores</span>
          </div>
        </header>

        <div className="avf2-ab">
          <div className="avf2-ag">
            <span className="avf2-al">Cadastro</span>
            <button className="avf2-bt avf2-bt-n" onClick={handleNovo} disabled={isSaving}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>Novo
            </button>
          </div>
          <div className="avf2-ag">
            <span className="avf2-al">Ações</span>
            <button className="avf2-bt avf2-bt-p" onClick={() => void handleSalvar()} disabled={isSaving}>
              {isSaving ? <><div className="avf2-sp" />Salvando...</> : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Salvar</>}
            </button>
            <button className="avf2-bt avf2-bt-d" onClick={handleLimpar} disabled={isSaving}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>Limpar
            </button>
          </div>
          <div className="avf2-ag">
            <button className="avf2-bt avf2-bt-g">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Ajuda
            </button>
          </div>
        </div>

        <div className="avf2-by">
          {feedback && (
            <div className={`avf2-fb ${feedback.type === "success" ? "s" : feedback.type === "error" ? "e" : "i"}`}>
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

          <div className="avf2-sb">
            <span className="avf2-sb-p">Cadastro</span>
            <div className="avf2-sb-l" />
            <span className="avf2-sb-h">Configure os parâmetros de avaliação de fornecedores</span>
          </div>

          {/* Parâmetros */}
          <div className="avf2-c">
            <div className="avf2-ch">
              <div className="avf2-chl">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <span className="avf2-ct">Parâmetros</span>
              </div>
            </div>
            <div className="avf2-cb">
              <div className="avf2-g">
                <div className="avf2-f avf2-g4">
                  <label className="avf2-l">Fornecedor <span className="avf2-lr">*</span></label>
                  <select className="avf2-se" value={fornecedor} onChange={e => setFornecedor(e.target.value)}>
                    {FORNECEDORES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div className="avf2-f avf2-g4">
                  <label className="avf2-l">Tipo de Fornecedor</label>
                  <select className="avf2-se" value={tipoFornecedor} onChange={e => setTipoFornecedor(e.target.value)}>
                    {TIPOS_FORNECEDOR.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="avf2-f avf2-g4">
                  <label className="avf2-l">Tipo Utilização</label>
                  <select className="avf2-se" value={tipoUtilizacao} onChange={e => setTipoUtilizacao(e.target.value)}>
                    {TIPOS_UTILIZACAO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Dimensões */}
          <div className="avf2-sb">
            <span className="avf2-sb-p">Dimensões</span>
            <div className="avf2-sb-l" />
            <button className="avf2-bt avf2-bt-g avf2-bt-sm" onClick={addDimensao}>+ Adicionar</button>
          </div>

          <div className="avf2-c">
            <div className="avf2-rw">
              <div className="avf2-rb">
                <div className="avf2-rbl">
                  <span className="avf2-rbl-l">Dimensões de Avaliação</span>
                  <span className="avf2-cbg">{dimensoes.length} dimensão(ões)</span>
                </div>
              </div>
              <table className="avf2-rt">
                <thead><tr><th>Descrição</th><th style={{width:140}}>Peso</th><th style={{width:80}}>Ações</th></tr></thead>
                <tbody>
                  {dimensoes.length === 0 ? (
                    <tr><td colSpan={3} className="avf2-rem">Nenhuma dimensão cadastrada.</td></tr>
                  ) : dimensoes.map(d => (
                    <tr key={d.id}>
                      <td><input className="avf2-in" value={d.descricao} onChange={e => updateDimensao(d.id, "descricao", e.target.value)} placeholder="Descrição da dimensão" /></td>
                      <td><input className="avf2-in" type="number" value={d.peso} onChange={e => updateDimensao(d.id, "peso", Number(e.target.value))} placeholder="0.00" step="0.01" /></td>
                      <td><button className="avf2-bt avf2-bt-d avf2-bt-sm" onClick={() => removeDimensao(d.id)}>Remover</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Critérios */}
          <div className="avf2-sb">
            <span className="avf2-sb-p">Critérios</span>
            <div className="avf2-sb-l" />
            <button className="avf2-bt avf2-bt-g avf2-bt-sm" onClick={addCriterio}>+ Adicionar</button>
          </div>

          <div className="avf2-c">
            <div className="avf2-rw">
              <div className="avf2-rb">
                <div className="avf2-rbl">
                  <span className="avf2-rbl-l">Critérios de Avaliação</span>
                  <span className="avf2-cbg">{criterios.length} critério(s)</span>
                </div>
              </div>
              <table className="avf2-rt">
                <thead><tr><th>Descrição</th><th style={{width:120}}>Peso</th><th style={{width:180}}>Tipo</th><th style={{width:80}}>Ações</th></tr></thead>
                <tbody>
                  {criterios.length === 0 ? (
                    <tr><td colSpan={4} className="avf2-rem">Nenhum critério cadastrado.</td></tr>
                  ) : criterios.map(c => (
                    <tr key={c.id}>
                      <td><input className="avf2-in" value={c.descricao} onChange={e => updateCriterio(c.id, "descricao", e.target.value)} placeholder="Descrição do critério" /></td>
                      <td><input className="avf2-in" type="number" value={c.peso} onChange={e => updateCriterio(c.id, "peso", Number(e.target.value))} step="0.01" /></td>
                      <td>
                        <select className="avf2-se" value={c.tipo} onChange={e => updateCriterio(c.id, "tipo", e.target.value)}>
                          {CRITERIO_TIPOS.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                        </select>
                      </td>
                      <td><button className="avf2-bt avf2-bt-d avf2-bt-sm" onClick={() => removeCriterio(c.id)}>Remover</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Intervalos */}
          <div className="avf2-sb">
            <span className="avf2-sb-p">Intervalos</span>
            <div className="avf2-sb-l" />
            <button className="avf2-bt avf2-bt-g avf2-bt-sm" onClick={addIntervalo}>+ Adicionar</button>
          </div>

          <div className="avf2-c">
            <div className="avf2-rw">
              <div className="avf2-rb">
                <div className="avf2-rbl">
                  <span className="avf2-rbl-l">Intervalos de Conceito</span>
                  <span className="avf2-cbg">{intervalos.length} intervalo(s)</span>
                </div>
              </div>
              <table className="avf2-rt">
                <thead>
                  <tr>
                    <th style={{width:60}}>Seq</th><th>Item</th><th style={{width:140}}>Classificação</th>
                    <th style={{width:140}}>Fornecedor</th><th style={{width:140}}>Valor Inicial</th>
                    <th style={{width:140}}>Valor Final</th><th style={{width:100}}>Conceito</th><th style={{width:80}}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {intervalos.length === 0 ? (
                    <tr><td colSpan={8} className="avf2-rem">Nenhum intervalo cadastrado.</td></tr>
                  ) : intervalos.map((iv, i) => (
                    <tr key={i}>
                      <td style={{fontWeight:600,color:"#1a4a2a"}}>{iv.sequencia}</td>
                      <td><input className="avf2-in" value={iv.item} onChange={e => updateIntervalo(i, "item", e.target.value)} placeholder="Item" /></td>
                      <td><input className="avf2-in" value={iv.classificacao} onChange={e => updateIntervalo(i, "classificacao", e.target.value)} placeholder="Class." /></td>
                      <td><input className="avf2-in" value={iv.fornecedor} onChange={e => updateIntervalo(i, "fornecedor", e.target.value)} placeholder="Forn." /></td>
                      <td><input className="avf2-in" type="number" value={iv.valor_inicial} onChange={e => updateIntervalo(i, "valor_inicial", Number(e.target.value))} step="0.01" /></td>
                      <td><input className="avf2-in" type="number" value={iv.valor_final} onChange={e => updateIntervalo(i, "valor_final", Number(e.target.value))} step="0.01" /></td>
                      <td><input className="avf2-in" type="number" value={iv.conceito} onChange={e => updateIntervalo(i, "conceito", Math.min(10, Math.max(0, Number(e.target.value))))} min={0} max={10} /></td>
                      <td><button className="avf2-bt avf2-bt-d avf2-bt-sm" onClick={() => removeIntervalo(i)}>Remover</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <footer className="avf2-ft">
          <div className="avf2-ftl">
            <div className="avf2-fts">Dimensões: <strong>{dimensoes.length}</strong></div>
            <div className="avf2-fts">Critérios: <strong>{criterios.length}</strong></div>
            <div className="avf2-fts">Intervalos: <strong>{intervalos.length}</strong></div>
            <div className="avf2-fts">Módulo: <strong>Inspeção</strong></div>
          </div>
          <div className="avf2-fts" style={{gap:8}}><span style={{color:"#b0c8b8",fontSize:11}}>GRUPO VENTURE LTDA</span></div>
        </footer>
      </div>
    </>
  );
}

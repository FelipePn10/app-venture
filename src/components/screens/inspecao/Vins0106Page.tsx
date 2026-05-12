import { useState, useCallback } from "react";
import {
  createOcorrencia,
  type OcorrenciaDTO,
} from "@/services/inspecaoService";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface FormOcorrencia {
  numero: string;
  data_ocorrencia: string;
  fornecedor: string;
  tipo_ocorrencia: string;
  item: string;
  ordem_insp_processo: string;
  sequencia: string;
  exibir_dados_relatorio: boolean;
  abonado: boolean;
  motivo_abono: string;
  fechamento: string;
}

const FORNECEDORES = [
  { value: "001", label: "FORNECEDOR A S.A." },
  { value: "002", label: "FORNECEDOR B LTDA" },
  { value: "003", label: "FORNECEDOR C ME" },
];

const TIPOS_OCORRENCIA = [
  { value: "NC", label: "Não Conformidade" },
  { value: "DI", label: "Divergência de Item" },
  { value: "AV", label: "Avaria no Transporte" },
  { value: "DQ", label: "Desvio de Qualidade" },
];

const ITENS = [
  { value: "I001", label: "Rolamento 6205-2RS" },
  { value: "I002", label: "Retentor 45x62x7" },
  { value: "I003", label: "Parafuso M10x50" },
];

const ORDENS = [
  { value: "OI001", label: "OI-001" },
  { value: "OI002", label: "OI-002" },
  { value: "OI003", label: "OI-003" },
];

const FECHAMENTOS = [
  { value: "", label: "Selecione..." },
  { value: "APR", label: "Aprovado" },
  { value: "REP", label: "Reprovado" },
  { value: "DEV", label: "Devolvido" },
  { value: "RET", label: "Retrabalho" },
];

const FORM_INICIAL: FormOcorrencia = {
  numero: "",
  data_ocorrencia: "",
  fornecedor: "",
  tipo_ocorrencia: "",
  item: "",
  ordem_insp_processo: "",
  sequencia: "",
  exibir_dados_relatorio: true,
  abonado: false,
  motivo_abono: "",
  fechamento: "",
};

function normalizeError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const resp = (error as any).response;
    if (resp?.data?.message) return String(resp.data.message);
  }
  return error instanceof Error ? error.message : fallback;
}

export function Vins0106Page(): JSX.Element {
  const [form, setForm] = useState<FormOcorrencia>(FORM_INICIAL);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);

  const setField = useCallback(<K extends keyof FormOcorrencia>(key: K, value: FormOcorrencia[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFeedback(null);
  }, []);

  async function handleSalvar() {
    if (!form.fornecedor) { setFeedback({ type: "error", message: "Fornecedor obrigatório." }); return; }
    if (!form.tipo_ocorrencia) { setFeedback({ type: "error", message: "Tipo de ocorrência obrigatório." }); return; }
    setIsSaving(true);
    setFeedback(null);
    try {
      const dto: OcorrenciaDTO = {
        numero: form.numero.trim(),
        data_ocorrencia: form.data_ocorrencia,
        fornecedor: form.fornecedor,
        tipo_ocorrencia: form.tipo_ocorrencia,
        item: form.item,
        ordem_insp_processo: form.ordem_insp_processo,
        sequencia: form.sequencia.trim(),
        exibir_dados_relatorio: form.exibir_dados_relatorio,
        abonado: form.abonado,
        fechamento: form.fechamento || undefined,
        motivo_abono: form.abonado ? form.motivo_abono : undefined,
      };
      await createOcorrencia(dto);
      setFeedback({ type: "success", message: "Ocorrência salva com sucesso." });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao salvar ocorrência.") });
    } finally {
      setIsSaving(false);
    }
  }

  function handleNovo() { setForm(FORM_INICIAL); setFeedback(null); }
  function handleLimpar() { setForm(FORM_INICIAL); setFeedback(null); }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ins2-r{min-height:100vh;background:#f0f4ee;font-family:'Inter',sans-serif;color:#1a2e22;display:flex;flex-direction:column}

        .ins2-tb{height:52px;background:#162e20;display:flex;align-items:center;justify-content:space-between;padding:0 20px;flex-shrink:0;border-bottom:1px solid rgba(62,150,84,0.15)}
        .ins2-tbl{display:flex;align-items:center;gap:10px}
        .ins2-lg{width:28px;height:28px;background:#3e9654;border-radius:6px;display:flex;align-items:center;justify-content:center}
        .ins2-an{font-size:13px;font-weight:600;color:#e0f0e3;line-height:1.1}
        .ins2-asb{display:block;font-size:9px;font-weight:400;color:#3d6b4d}
        .ins2-st{font-size:12.5px;font-weight:500;color:#5a9a6a;padding-left:14px;margin-left:14px;border-left:1px solid rgba(255,255,255,0.08)}

        .ins2-ab{background:#fff;border-bottom:1px solid #dbe8d5;padding:0 20px;display:flex;align-items:center;gap:4px;height:46px;flex-shrink:0}
        .ins2-ag{display:flex;align-items:center;gap:4px;padding-right:12px;margin-right:8px;border-right:1px solid #e8f0e4}
        .ins2-ag:last-child{border-right:none}
        .ins2-al{font-size:9.5px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#96b8a0;margin-right:4px;white-space:nowrap}
        .ins2-bt{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border:1.5px solid transparent;border-radius:7px;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background 0.13s,border-color 0.13s,color 0.13s}
        .ins2-bt-p{background:#162e20;color:#dff0e2;border-color:#162e20}
        .ins2-bt-p:hover:not(:disabled){background:#1e3a2a}
        .ins2-bt-p:disabled{opacity:0.5;cursor:not-allowed}
        .ins2-bt-g{background:transparent;color:#4a7060;border-color:#d4e8d0}
        .ins2-bt-g:hover:not(:disabled){background:#f0f8ec;border-color:#b0d4b8;color:#1a3828}
        .ins2-bt-g:disabled{opacity:0.5;cursor:not-allowed}
        .ins2-bt-d{background:transparent;color:#b94040;border-color:#f0c8c8}
        .ins2-bt-d:hover:not(:disabled){background:#fff0f0;border-color:#e09090}
        .ins2-bt-n{background:#eef9f0;color:#1a6030;border-color:#b4d8b8;font-weight:600}
        .ins2-bt-n:hover:not(:disabled){background:#dff5e4;border-color:#88c898}

        .ins2-by{flex:1;padding:16px 20px;display:flex;flex-direction:column;gap:0;overflow-y:auto}
        .ins2-by::-webkit-scrollbar{width:5px}
        .ins2-by::-webkit-scrollbar-thumb{background:#cce0c8;border-radius:4px}

        .ins2-sb{display:flex;align-items:center;gap:10px;padding:14px 0 8px}
        .ins2-sb:first-child{padding-top:0}
        .ins2-sb-p{font-size:9.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#5a8068;background:#e0ede0;border:1px solid #c8dcc8;border-radius:20px;padding:3px 10px;white-space:nowrap}
        .ins2-sb-l{flex:1;height:1px;background:#dbe8d5}
        .ins2-sb-h{font-size:11px;color:#96b8a0;white-space:nowrap}

        .ins2-c{background:#fff;border:1px solid #dbe8d5;border-radius:12px;overflow:hidden;margin-bottom:14px}
        .ins2-ch{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid #edf5e8;background:#fafcf9}
        .ins2-chl{display:flex;align-items:center;gap:8px}
        .ins2-ct{font-size:12px;font-weight:600;color:#2a4a35;text-transform:uppercase;letter-spacing:0.6px}
        .ins2-cb{padding:18px 18px}

        .ins2-g{display:grid;grid-template-columns:repeat(12,1fr);gap:16px 14px;align-items:start}
        .ins2-g2{grid-column:span 2}
        .ins2-g3{grid-column:span 3}
        .ins2-g4{grid-column:span 4}
        .ins2-g6{grid-column:span 6}
        .ins2-g8{grid-column:span 8}
        .ins2-g12{grid-column:span 12}

        .ins2-f{display:flex;flex-direction:column;gap:5px}
        .ins2-l{font-size:10.5px;font-weight:600;color:#5a8068;text-transform:uppercase;letter-spacing:0.4px;display:flex;align-items:center;gap:4px}
        .ins2-lr{color:#c84040;font-size:12px;line-height:1}
        .ins2-in{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;transition:border-color 0.13s,box-shadow 0.13s}
        .ins2-in:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .ins2-in::placeholder{color:#b0c8b8;font-size:12px}
        .ins2-in.has-e{border-color:#e05252;box-shadow:0 0 0 2px rgba(224,82,82,0.1)}
        .ins2-in[type="date"]{cursor:pointer}
        .ins2-se{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 28px 0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;transition:border-color 0.13s}
        .ins2-se:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .ins2-fe{font-size:11px;color:#c84040;margin-top:2px;display:flex;align-items:center;gap:4px}
        .ins2-fh{font-size:11px;color:#7a9c84;margin-top:2px;line-height:1.45}

        .ins2-toggle-row{display:flex;align-items:center;gap:10px;padding-top:4px}
        .ins2-toggle{position:relative;width:38px;height:20px;flex-shrink:0;cursor:pointer}
        .ins2-toggle input{opacity:0;width:0;height:0;position:absolute}
        .ins2-toggle-track{position:absolute;inset:0;background:#d4e0d0;border-radius:20px;transition:background 0.2s}
        .ins2-toggle input:checked~.ins2-toggle-track{background:#3e9654}
        .ins2-toggle-thumb{position:absolute;top:3px;left:3px;width:14px;height:14px;background:#fff;border-radius:50%;transition:transform 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.15)}
        .ins2-toggle input:checked~.ins2-toggle-thumb{transform:translateX(18px)}
        .ins2-toggle-label{font-size:12px;color:#3a5a45;font-weight:500}

        .ins2-fb{display:flex;align-items:center;gap:9px;padding:11px 15px;border-radius:9px;font-size:13px;animation:ins2FdIn 0.2s ease;margin-bottom:14px}
        .ins2-fb.s{background:#f0faf2;border:1px solid #b4dec0;color:#1e6030}
        .ins2-fb.e{background:#fff5f5;border:1px solid #f8c0c0;border-left:3px solid #e05252;color:#b91c1c}
        .ins2-fb.i{background:#f0f8ff;border:1px solid #c7def8;border-left:3px solid #4a90d9;color:#1a4070}

        .ins2-ft{background:#fff;border-top:1px solid #dbe8d5;padding:8px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .ins2-ftl{display:flex;align-items:center;gap:20px}
        .ins2-fts{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#6a8a74}
        .ins2-fts strong{color:#1a2e22;font-weight:600}

        .ins2-sep{height:1px;background:#edf5e8;margin:20px 0}

        @keyframes ins2Spin{to{transform:rotate(360deg)}}
        .ins2-sp{width:14px;height:14px;flex-shrink:0;border:2px solid rgba(223,240,226,0.3);border-top-color:#dff0e2;border-radius:50%;animation:ins2Spin 0.65s linear infinite}
        .ins2-spd{width:14px;height:14px;flex-shrink:0;border:2px solid #d4e8cc;border-top-color:#3e9654;border-radius:50%;animation:ins2Spin 0.65s linear infinite}
        @keyframes ins2FdIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className="ins2-r">
        <header className="ins2-tb">
          <div className="ins2-tbl">
            <div className="ins2-lg">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="ins2-an">Venture<span className="ins2-asb">ERP &amp; Soluções</span></span>
            <span className="ins2-st">VINS0106 — Cadastro de Ocorrências</span>
          </div>
        </header>

        <div className="ins2-ab">
          <div className="ins2-ag">
            <span className="ins2-al">Cadastro</span>
            <button className="ins2-bt ins2-bt-n" onClick={handleNovo} disabled={isSaving}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>Novo
            </button>
          </div>
          <div className="ins2-ag">
            <span className="ins2-al">Ações</span>
            <button className="ins2-bt ins2-bt-p" onClick={() => void handleSalvar()} disabled={isSaving}>
              {isSaving ? <><div className="ins2-sp" />Salvando...</> : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Salvar</>}
            </button>
            <button className="ins2-bt ins2-bt-d" onClick={handleLimpar} disabled={isSaving}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>Limpar
            </button>
          </div>
          <div className="ins2-ag">
            <button className="ins2-bt ins2-bt-g">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Ajuda
            </button>
          </div>
        </div>

        <div className="ins2-by">
          {feedback && (
            <div className={`ins2-fb ${feedback.type === "success" ? "s" : feedback.type === "error" ? "e" : "i"}`}>
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

          <div className="ins2-sb">
            <span className="ins2-sb-p">Cadastro</span>
            <div className="ins2-sb-l" />
            <span className="ins2-sb-h">Preencha os campos e clique em Salvar</span>
          </div>

          <div className="ins2-c">
            <div className="ins2-ch">
              <div className="ins2-chl">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <span className="ins2-ct">Ocorrência</span>
              </div>
            </div>
            <div className="ins2-cb">
              <div className="ins2-g">
                <div className="ins2-f ins2-g2">
                  <label className="ins2-l">Número</label>
                  <input className="ins2-in" placeholder="Automático" value={form.numero} onChange={(e) => setField("numero", e.target.value)} disabled />
                  <span className="ins2-fh">Gerado automaticamente.</span>
                </div>
                <div className="ins2-f ins2-g2">
                  <label className="ins2-l">Data Ocorrência <span className="ins2-lr">*</span></label>
                  <input type="date" className="ins2-in" value={form.data_ocorrencia} onChange={(e) => setField("data_ocorrencia", e.target.value)} />
                </div>
                <div className="ins2-f ins2-g4">
                  <label className="ins2-l">Fornecedor <span className="ins2-lr">*</span></label>
                  <select className="ins2-se" value={form.fornecedor} onChange={(e) => setField("fornecedor", e.target.value)}>
                    <option value="">Selecione...</option>
                    {FORNECEDORES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div className="ins2-f ins2-g4">
                  <label className="ins2-l">Tipo de Ocorrência <span className="ins2-lr">*</span></label>
                  <select className="ins2-se" value={form.tipo_ocorrencia} onChange={(e) => setField("tipo_ocorrencia", e.target.value)}>
                    <option value="">Selecione...</option>
                    {TIPOS_OCORRENCIA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="ins2-sep" />

              <div className="ins2-g">
                <div className="ins2-f ins2-g4">
                  <label className="ins2-l">Item</label>
                  <select className="ins2-se" value={form.item} onChange={(e) => setField("item", e.target.value)}>
                    <option value="">Selecione...</option>
                    {ITENS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                </div>
                <div className="ins2-f ins2-g4">
                  <label className="ins2-l">Ordem Insp. Processo</label>
                  <select className="ins2-se" value={form.ordem_insp_processo} onChange={(e) => setField("ordem_insp_processo", e.target.value)}>
                    <option value="">Selecione...</option>
                    {ORDENS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="ins2-f ins2-g2">
                  <label className="ins2-l">Sequência</label>
                  <input className="ins2-in" placeholder="Ex: 001" value={form.sequencia} onChange={(e) => setField("sequencia", e.target.value)} />
                </div>
                <div className="ins2-f ins2-g2">
                  <label className="ins2-l">Fechamento</label>
                  <select className="ins2-se" value={form.fechamento} onChange={(e) => setField("fechamento", e.target.value)}>
                    {FECHAMENTOS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="ins2-sep" />

              <div className="ins2-g">
                <div className="ins2-f ins2-g4">
                  <label className="ins2-l">Exibir Dados no Relatório</label>
                  <div className="ins2-toggle-row">
                    <label className="ins2-toggle"><input type="checkbox" checked={form.exibir_dados_relatorio} onChange={(e) => setField("exibir_dados_relatorio", e.target.checked)} /><div className="ins2-toggle-track" /><div className="ins2-toggle-thumb" /></label>
                    <span className="ins2-toggle-label">{form.exibir_dados_relatorio ? "Sim" : "Não"}</span>
                  </div>
                </div>
                <div className="ins2-f ins2-g4">
                  <label className="ins2-l">Abonado</label>
                  <div className="ins2-toggle-row">
                    <label className="ins2-toggle"><input type="checkbox" checked={form.abonado} onChange={(e) => setField("abonado", e.target.checked)} /><div className="ins2-toggle-track" /><div className="ins2-toggle-thumb" /></label>
                    <span className="ins2-toggle-label">{form.abonado ? "Sim" : "Não"}</span>
                  </div>
                </div>
                {form.abonado && (
                  <div className="ins2-f ins2-g4">
                    <label className="ins2-l">Motivo do Abono <span className="ins2-lr">*</span></label>
                    <input className="ins2-in" placeholder="Descreva o motivo..." value={form.motivo_abono} onChange={(e) => setField("motivo_abono", e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="ins2-ft">
          <div className="ins2-ftl">
            <div className="ins2-fts">Módulo: <strong>Inspeção</strong></div>
            <div className="ins2-fts">Tela: <strong>VINS0106</strong></div>
          </div>
          <div className="ins2-fts" style={{gap:8}}><span style={{color:"#b0c8b8",fontSize:11}}>GRUPO VENTURE LTDA</span></div>
        </footer>
      </div>
    </>
  );
}

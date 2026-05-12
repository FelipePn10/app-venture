import { useState, useCallback } from "react";
import {
  createRoteiroInspecao,
  type RoteiroInspecaoDTO,
  type InspecaoSequenciaItem,
} from "@/services/inspecaoService";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface FormRoteiro {
  classificacao: string;
  item: string;
  almoxarifado: string;
  manuseio: string;
  armazenamento: string;
  tipo_roteiro: string;
  elaborado: string;
  data_cadastro: string;
  tipo_mercado: string;
  tipo: string;
  data_validade: string;
}

interface DetalheSequencia extends InspecaoSequenciaItem {
  especie_tipo: "valor" | "atributo" | "estrutura";
  cota_nominal: string;
  valor_maximo: string;
  valor_minimo: string;
  atributos: { descricao: string; status: string }[];
  grupo_instr?: string;
  tipo_amostra?: string;
  um?: string;
  norma?: string;
  referencia?: string;
  data_validade_det?: string;
  instrumentos: string[];
}

const CLASSIFICACOES = ["", "CLASSE-A", "CLASSE-B", "CLASSE-C"];
const ITENS_OPTS = ["", "I001 - Rolamento", "I002 - Retentor", "I003 - Parafuso", "I004 - Arruela", "I005 - Mola"];
const ALMOXARIFADOS = ["", "ALM-01 - Central", "ALM-02 - Produção", "ALM-03 - Terceiros"];
const MANUSEIOS = ["", "Manual", "Mecanizado", "Especial"];
const ARMAZENAMENTOS = ["", "Normal", "Refrigerado", "Controlado"];
const TIPOS_ROTEIRO = ["", "Normal", "Simplificada", "Restrita"];
const ELABORADOS = ["", "Engenharia", "Qualidade", "Produção"];
const TIPOS_MERCADO = ["", "Nacional", "Importado", "Ambos"];
const TIPOS = ["", "MP", "PA", "ES"];
const INSPECOES = ["", "Dimensional", "Visual", "Funcional", "Metalográfico"];
const FORMAS_APONTAMENTO = ["Todas as medições", "Por Intervalo um", "Por Intervalo vários", "Somente Status"];

const FORM_INICIAL: FormRoteiro = {
  classificacao: "", item: "", almoxarifado: "", manuseio: "", armazenamento: "",
  tipo_roteiro: "", elaborado: "", data_cadastro: "", tipo_mercado: "", tipo: "", data_validade: "",
};

function normalizeError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const resp = (error as any).response;
    if (resp?.data?.message) return String(resp.data.message);
  }
  return error instanceof Error ? error.message : fallback;
}

export function Vins0200Page(): JSX.Element {
  const [form, setForm] = useState<FormRoteiro>(FORM_INICIAL);
  const [sequencias, setSequencias] = useState<InspecaoSequenciaItem[]>([
    { sequencia: 1, inspecao: "Dimensional", especie: "Valor", apontamento: true, forma_apontamento: "Todas as medições", emite_etiqueta: false },
    { sequencia: 2, inspecao: "Visual", especie: "Atributo", apontamento: false, forma_apontamento: "Somente Status", emite_etiqueta: true },
  ]);
  const [modalOpen, setModalOpen] = useState(false);
  const [seqEdit, setSeqEdit] = useState<DetalheSequencia | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);

  const setField = useCallback(<K extends keyof FormRoteiro>(key: K, value: FormRoteiro[K]) => {
    setForm(p => ({ ...p, [key]: value }));
    setFeedback(null);
  }, []);

  function openDetalhes(seq: InspecaoSequenciaItem) {
    setSeqEdit({
      ...seq,
      especie_tipo: seq.especie === "Atributo" ? "atributo" : seq.especie === "Estrutura" ? "estrutura" : "valor",
      cota_nominal: "10.00",
      valor_maximo: "10.50",
      valor_minimo: "9.50",
      atributos: [{ descricao: "Cor", status: "Aprova" }, { descricao: "Acabamento", status: "Reprova" }],
      grupo_instr: seq.grupo_instr || "",
      tipo_amostra: seq.tipo_amostra || "",
      um: seq.um || "mm",
      norma: seq.norma || "",
      referencia: seq.referencia || "",
      data_validade_det: seq.data_validade || "",
      instrumentos: seq.instrumentos || [],
    });
    setModalOpen(true);
  }

  function saveDetalhes() {
    if (!seqEdit) return;
    setSequencias(p => p.map(s => s.sequencia === seqEdit.sequencia ? {
      ...s,
      inspecao: seqEdit.inspecao,
      especie: seqEdit.especie_tipo === "valor" ? "Valor" : seqEdit.especie_tipo === "atributo" ? "Atributo" : "Estrutura",
      apontamento: seqEdit.apontamento,
      forma_apontamento: seqEdit.forma_apontamento,
      emite_etiqueta: seqEdit.emite_etiqueta,
      grupo_instr: seqEdit.grupo_instr,
      tipo_amostra: seqEdit.tipo_amostra,
      um: seqEdit.um,
      norma: seqEdit.norma,
      referencia: seqEdit.referencia,
      data_validade: seqEdit.data_validade_det,
      instrumentos: seqEdit.instrumentos,
    } : s));
    setModalOpen(false);
    setFeedback({ type: "success", message: `Sequência ${seqEdit.sequencia} atualizada.` });
  }

  async function handleSalvar() {
    if (!form.classificacao) { setFeedback({ type: "error", message: "Classificação obrigatória." }); return; }
    setIsSaving(true); setFeedback(null);
    try {
      const dto: RoteiroInspecaoDTO = { ...form, data_cadastro: form.data_cadastro || undefined, data_validade: form.data_validade || undefined, sequencias: sequencias };
      await createRoteiroInspecao(dto);
      setFeedback({ type: "success", message: "Roteiro de inspeção salvo com sucesso." });
    } catch (error) { setFeedback({ type: "error", message: normalizeError(error, "Erro ao salvar.") }); }
    finally { setIsSaving(false); }
  }

  function handleNovo() { setForm(FORM_INICIAL); setFeedback(null); }
  function handleLimpar() { setForm(FORM_INICIAL); setSequencias([]); setFeedback(null); }

  function addSequencia() {
    const nextSeq = sequencias.length > 0 ? Math.max(...sequencias.map(s => s.sequencia)) + 1 : 1;
    setSequencias(p => [...p, { sequencia: nextSeq, inspecao: "", especie: "Valor", apontamento: false, forma_apontamento: "Todas as medições", emite_etiqueta: false }]);
  }

  function removeSequencia(seq: number) { setSequencias(p => p.filter(s => s.sequencia !== seq)); }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ins5-r{min-height:100vh;background:#f0f4ee;font-family:'Inter',sans-serif;color:#1a2e22;display:flex;flex-direction:column}

        .ins5-tb{height:52px;background:#162e20;display:flex;align-items:center;justify-content:space-between;padding:0 20px;flex-shrink:0;border-bottom:1px solid rgba(62,150,84,0.15)}
        .ins5-tbl{display:flex;align-items:center;gap:10px}
        .ins5-lg{width:28px;height:28px;background:#3e9654;border-radius:6px;display:flex;align-items:center;justify-content:center}
        .ins5-an{font-size:13px;font-weight:600;color:#e0f0e3;line-height:1.1}
        .ins5-asb{display:block;font-size:9px;font-weight:400;color:#3d6b4d}
        .ins5-st{font-size:12.5px;font-weight:500;color:#5a9a6a;padding-left:14px;margin-left:14px;border-left:1px solid rgba(255,255,255,0.08)}

        .ins5-ab{background:#fff;border-bottom:1px solid #dbe8d5;padding:0 20px;display:flex;align-items:center;gap:4px;height:46px;flex-shrink:0}
        .ins5-ag{display:flex;align-items:center;gap:4px;padding-right:12px;margin-right:8px;border-right:1px solid #e8f0e4}
        .ins5-ag:last-child{border-right:none}
        .ins5-al{font-size:9.5px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#96b8a0;margin-right:4px;white-space:nowrap}
        .ins5-bt{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border:1.5px solid transparent;border-radius:7px;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background 0.13s,border-color 0.13s,color 0.13s}
        .ins5-bt-p{background:#162e20;color:#dff0e2;border-color:#162e20}
        .ins5-bt-p:hover:not(:disabled){background:#1e3a2a}
        .ins5-bt-p:disabled{opacity:0.5;cursor:not-allowed}
        .ins5-bt-g{background:transparent;color:#4a7060;border-color:#d4e8d0}
        .ins5-bt-g:hover:not(:disabled){background:#f0f8ec;border-color:#b0d4b8;color:#1a3828}
        .ins5-bt-g:disabled{opacity:0.5;cursor:not-allowed}
        .ins5-bt-d{background:transparent;color:#b94040;border-color:#f0c8c8}
        .ins5-bt-d:hover:not(:disabled){background:#fff0f0;border-color:#e09090}
        .ins5-bt-n{background:#eef9f0;color:#1a6030;border-color:#b4d8b8;font-weight:600}
        .ins5-bt-n:hover:not(:disabled){background:#dff5e4;border-color:#88c898}

        .ins5-by{flex:1;padding:16px 20px;display:flex;flex-direction:column;gap:0;overflow-y:auto}
        .ins5-by::-webkit-scrollbar{width:5px}
        .ins5-by::-webkit-scrollbar-thumb{background:#cce0c8;border-radius:4px}

        .ins5-sb{display:flex;align-items:center;gap:10px;padding:14px 0 8px}
        .ins5-sb:first-child{padding-top:0}
        .ins5-sb-p{font-size:9.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#5a8068;background:#e0ede0;border:1px solid #c8dcc8;border-radius:20px;padding:3px 10px;white-space:nowrap}
        .ins5-sb-l{flex:1;height:1px;background:#dbe8d5}
        .ins5-sb-h{font-size:11px;color:#96b8a0;white-space:nowrap}

        .ins5-c{background:#fff;border:1px solid #dbe8d5;border-radius:12px;overflow:hidden;margin-bottom:14px}
        .ins5-ch{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid #edf5e8;background:#fafcf9}
        .ins5-chl{display:flex;align-items:center;gap:8px}
        .ins5-ct{font-size:12px;font-weight:600;color:#2a4a35;text-transform:uppercase;letter-spacing:0.6px}
        .ins5-cbg{font-size:10.5px;font-weight:500;color:#3e9654;background:#eef5ea;border:1px solid #c4dfc8;border-radius:12px;padding:2px 8px}
        .ins5-cb{padding:18px 18px}

        .ins5-g{display:grid;grid-template-columns:repeat(12,1fr);gap:16px 14px;align-items:start}
        .ins5-g2{grid-column:span 2}
        .ins5-g3{grid-column:span 3}
        .ins5-g4{grid-column:span 4}
        .ins5-g12{grid-column:span 12}

        .ins5-f{display:flex;flex-direction:column;gap:5px}
        .ins5-l{font-size:10.5px;font-weight:600;color:#5a8068;text-transform:uppercase;letter-spacing:0.4px;display:flex;align-items:center;gap:4px}
        .ins5-lr{color:#c84040;font-size:12px;line-height:1}
        .ins5-in{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;transition:border-color 0.13s,box-shadow 0.13s}
        .ins5-in:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .ins5-in::placeholder{color:#b0c8b8;font-size:12px}
        .ins5-in[type="date"]{cursor:pointer}
        .ins5-se{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 28px 0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;transition:border-color 0.13s}
        .ins5-se:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .ins5-fe{font-size:11px;color:#c84040;margin-top:2px;display:flex;align-items:center;gap:4px}
        .ins5-fh{font-size:11px;color:#7a9c84;margin-top:2px;line-height:1.45}

        .ins5-toggle-row{display:flex;align-items:center;gap:10px;padding-top:4px}
        .ins5-toggle{position:relative;width:38px;height:20px;flex-shrink:0;cursor:pointer}
        .ins5-toggle input{opacity:0;width:0;height:0;position:absolute}
        .ins5-toggle-track{position:absolute;inset:0;background:#d4e0d0;border-radius:20px;transition:background 0.2s}
        .ins5-toggle input:checked~.ins5-toggle-track{background:#3e9654}
        .ins5-toggle-thumb{position:absolute;top:3px;left:3px;width:14px;height:14px;background:#fff;border-radius:50%;transition:transform 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.15)}
        .ins5-toggle input:checked~.ins5-toggle-thumb{transform:translateX(18px)}
        .ins5-toggle-label{font-size:12px;color:#3a5a45;font-weight:500}

        .ins5-fb{display:flex;align-items:center;gap:9px;padding:11px 15px;border-radius:9px;font-size:13px;animation:ins5FdIn 0.2s ease;margin-bottom:14px}
        .ins5-fb.s{background:#f0faf2;border:1px solid #b4dec0;color:#1e6030}
        .ins5-fb.e{background:#fff5f5;border:1px solid #f8c0c0;border-left:3px solid #e05252;color:#b91c1c}
        .ins5-fb.i{background:#f0f8ff;border:1px solid #c7def8;border-left:3px solid #4a90d9;color:#1a4070}

        .ins5-rw{border-top:1px solid #edf5e8;overflow-x:auto}
        .ins5-rb{display:flex;align-items:center;justify-content:space-between;padding:10px 18px;background:#f4f9f2;border-bottom:1px solid #e8f0e4}
        .ins5-rbl{display:flex;align-items:center;gap:8px}
        .ins5-rbl-l{font-size:11px;font-weight:600;color:#4a7060;text-transform:uppercase;letter-spacing:0.5px}
        .ins5-rt{width:100%;border-collapse:collapse;font-size:13px}
        .ins5-rt th{background:#f4f9f2;padding:8px 12px;text-align:left;font-size:10.5px;font-weight:700;color:#5a8068;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1.5px solid #dbe8d5;white-space:nowrap}
        .ins5-rt td{padding:9px 12px;border-bottom:1px solid #f0f6ec;color:#243830;vertical-align:middle}
        .ins5-rt tbody tr:hover{background:#eef9f0}
        .ins5-rem{text-align:center;padding:28px 12px;color:#96b8a0;font-size:12.5px}

        .ins5-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:1000}
        .ins5-modal{background:#fff;border-radius:12px;width:720px;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.18)}
        .ins5-modal-h{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #dbe8d5;background:#fafcf9}
        .ins5-modal-ht{font-size:13px;font-weight:600;color:#1a2e22}
        .ins5-modal-b{padding:20px}
        .ins5-modal-f{display:flex;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid #edf5e8}

        .ins5-sep{height:1px;background:#edf5e8;margin:20px 0}
        .ins5-sl{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#a0b8a8;margin-bottom:14px;display:flex;align-items:center;gap:8px}
        .ins5-sl::after{content:'';flex:1;height:1px;background:#e8f0e4}

        .ins5-ft{background:#fff;border-top:1px solid #dbe8d5;padding:8px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .ins5-ftl{display:flex;align-items:center;gap:20px}
        .ins5-fts{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#6a8a74}
        .ins5-fts strong{color:#1a2e22;font-weight:600}

        @keyframes ins5Spin{to{transform:rotate(360deg)}}
        .ins5-sp{width:14px;height:14px;flex-shrink:0;border:2px solid rgba(223,240,226,0.3);border-top-color:#dff0e2;border-radius:50%;animation:ins5Spin 0.65s linear infinite}
        .ins5-spd{width:14px;height:14px;flex-shrink:0;border:2px solid #d4e8cc;border-top-color:#3e9654;border-radius:50%;animation:ins5Spin 0.65s linear infinite}
        @keyframes ins5FdIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className="ins5-r">
        <header className="ins5-tb">
          <div className="ins5-tbl">
            <div className="ins5-lg">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="ins5-an">Venture<span className="ins5-asb">ERP &amp; Soluções</span></span>
            <span className="ins5-st">VINS0200 — Cadastro do Roteiro de Inspeção de Recebimento</span>
          </div>
        </header>

        <div className="ins5-ab">
          <div className="ins5-ag">
            <span className="ins5-al">Cadastro</span>
            <button className="ins5-bt ins5-bt-n" onClick={handleNovo} disabled={isSaving}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>Novo
            </button>
          </div>
          <div className="ins5-ag">
            <span className="ins5-al">Ações</span>
            <button className="ins5-bt ins5-bt-p" onClick={() => void handleSalvar()} disabled={isSaving}>
              {isSaving ? <><div className="ins5-sp" />Salvando...</> : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Salvar</>}
            </button>
            <button className="ins5-bt ins5-bt-d" onClick={handleLimpar} disabled={isSaving}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>Limpar
            </button>
          </div>
          <div className="ins5-ag">
            <button className="ins5-bt ins5-bt-g">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Ajuda
            </button>
          </div>
        </div>

        <div className="ins5-by">
          {feedback && (
            <div className={`ins5-fb ${feedback.type === "success" ? "s" : feedback.type === "error" ? "e" : "i"}`}>
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

          <div className="ins5-sb">
            <span className="ins5-sb-p">Cadastro</span>
            <div className="ins5-sb-l" />
            <span className="ins5-sb-h">Preencha os campos e defina as sequências de inspeção</span>
          </div>

          {/* Main Form Card */}
          <div className="ins5-c">
            <div className="ins5-ch">
              <div className="ins5-chl">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <span className="ins5-ct">Roteiro de Inspeção</span>
              </div>
            </div>
            <div className="ins5-cb">
              <div className="ins5-g">
                <div className="ins5-f ins5-g4">
                  <label className="ins5-l">Classificação <span className="ins5-lr">*</span></label>
                  <select className="ins5-se" value={form.classificacao} onChange={e => setField("classificacao", e.target.value)}>
                    {CLASSIFICACOES.map(c => <option key={c} value={c}>{c || "Selecione..."}</option>)}
                  </select>
                </div>
                <div className="ins5-f ins5-g4">
                  <label className="ins5-l">Item</label>
                  <select className="ins5-se" value={form.item} onChange={e => setField("item", e.target.value)}>
                    {ITENS_OPTS.map(i => <option key={i} value={i}>{i || "Selecione..."}</option>)}
                  </select>
                </div>
                <div className="ins5-f ins5-g4">
                  <label className="ins5-l">Almoxarifado</label>
                  <select className="ins5-se" value={form.almoxarifado} onChange={e => setField("almoxarifado", e.target.value)}>
                    {ALMOXARIFADOS.map(a => <option key={a} value={a}>{a || "Selecione..."}</option>)}
                  </select>
                </div>
                <div className="ins5-f ins5-g3">
                  <label className="ins5-l">Manuseio</label>
                  <select className="ins5-se" value={form.manuseio} onChange={e => setField("manuseio", e.target.value)}>
                    {MANUSEIOS.map(m => <option key={m} value={m}>{m || "Selecione..."}</option>)}
                  </select>
                </div>
                <div className="ins5-f ins5-g3">
                  <label className="ins5-l">Armazenamento</label>
                  <select className="ins5-se" value={form.armazenamento} onChange={e => setField("armazenamento", e.target.value)}>
                    {ARMAZENAMENTOS.map(a => <option key={a} value={a}>{a || "Selecione..."}</option>)}
                  </select>
                </div>
                <div className="ins5-f ins5-g3">
                  <label className="ins5-l">Tipo de Roteiro</label>
                  <select className="ins5-se" value={form.tipo_roteiro} onChange={e => setField("tipo_roteiro", e.target.value)}>
                    {TIPOS_ROTEIRO.map(t => <option key={t} value={t}>{t || "Selecione..."}</option>)}
                  </select>
                </div>
                <div className="ins5-f ins5-g3">
                  <label className="ins5-l">Elaborado</label>
                  <select className="ins5-se" value={form.elaborado} onChange={e => setField("elaborado", e.target.value)}>
                    {ELABORADOS.map(e => <option key={e} value={e}>{e || "Selecione..."}</option>)}
                  </select>
                </div>
                <div className="ins5-f ins5-g2">
                  <label className="ins5-l">Data Cadastro</label>
                  <input type="date" className="ins5-in" value={form.data_cadastro} onChange={e => setField("data_cadastro", e.target.value)} />
                </div>
                <div className="ins5-f ins5-g2">
                  <label className="ins5-l">Tipo Mercado</label>
                  <select className="ins5-se" value={form.tipo_mercado} onChange={e => setField("tipo_mercado", e.target.value)}>
                    {TIPOS_MERCADO.map(t => <option key={t} value={t}>{t || "Selecione..."}</option>)}
                  </select>
                </div>
                <div className="ins5-f ins5-g2">
                  <label className="ins5-l">Tipo</label>
                  <select className="ins5-se" value={form.tipo} onChange={e => setField("tipo", e.target.value)}>
                    {TIPOS.map(t => <option key={t} value={t}>{t || "Selecione..."}</option>)}
                  </select>
                </div>
                <div className="ins5-f ins5-g2">
                  <label className="ins5-l">Data Validade</label>
                  <input type="date" className="ins5-in" value={form.data_validade} onChange={e => setField("data_validade", e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Sequências Grid */}
          <div className="ins5-sb">
            <span className="ins5-sb-p">Sequências</span>
            <div className="ins5-sb-l" />
            <button className="ins5-bt ins5-bt-g" onClick={addSequencia} style={{fontSize:11,height:28,padding:"0 9px"}}>
              + Adicionar
            </button>
          </div>

          <div className="ins5-c">
            <div className="ins5-rw">
              <div className="ins5-rb">
                <div className="ins5-rbl">
                  <span className="ins5-rbl-l">Sequências de Inspeção</span>
                  <span className="ins5-cbg">{sequencias.length} item(ns)</span>
                </div>
              </div>
              <table className="ins5-rt">
                <thead>
                  <tr>
                    <th style={{width:80}}>Sequência</th><th style={{width:180}}>Inspeção</th><th style={{width:140}}>Espécie</th>
                    <th style={{width:120}}>Apontamento</th><th style={{width:180}}>Form. Apontamento</th>
                    <th style={{width:120}}>Emite Etiqueta</th><th style={{width:100}}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sequencias.length === 0 ? (
                    <tr><td colSpan={7} className="ins5-rem">Nenhuma sequência cadastrada. Clique em "Adicionar".</td></tr>
                  ) : (
                    sequencias.map(s => (
                      <tr key={s.sequencia}>
                        <td style={{fontWeight:600,color:"#1a4a2a"}}>{s.sequencia}</td>
                        <td>{s.inspecao}</td><td>{s.especie}</td>
                        <td>{s.apontamento ? <span style={{color:"#2a8040",fontWeight:600}}>Sim</span> : <span style={{color:"#96b8a0"}}>Não</span>}</td>
                        <td>{s.forma_apontamento}</td>
                        <td>{s.emite_etiqueta ? <span style={{color:"#2a8040",fontWeight:600}}>Sim</span> : <span style={{color:"#96b8a0"}}>Não</span>}</td>
                        <td>
                          <div style={{display:"flex",gap:4}}>
                            <button className="ins5-bt ins5-bt-g" style={{height:26,padding:"0 8px",fontSize:11}} onClick={() => openDetalhes(s)}>Detalhes</button>
                            <button className="ins5-bt ins5-bt-d" style={{height:26,padding:"0 8px",fontSize:11}} onClick={() => removeSequencia(s.sequencia)}>Remover</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Detalhes */}
        {modalOpen && seqEdit && (
          <div className="ins5-modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="ins5-modal" onClick={e => e.stopPropagation()}>
              <div className="ins5-modal-h">
                <span className="ins5-modal-ht">Detalhes — Sequência {seqEdit.sequencia}</span>
                <button className="ins5-bt ins5-bt-d" style={{height:26}} onClick={() => setModalOpen(false)}>Fechar</button>
              </div>
              <div className="ins5-modal-b">
                <div className="ins5-sl">Identificação</div>
                <div className="ins5-g">
                  <div className="ins5-f ins5-g2">
                    <label className="ins5-l">Sequência</label>
                    <input className="ins5-in" value={seqEdit.sequencia} disabled />
                  </div>
                  <div className="ins5-f ins5-g4">
                    <label className="ins5-l">Inspeção</label>
                    <select className="ins5-se" value={seqEdit.inspecao} onChange={e => setSeqEdit({...seqEdit, inspecao: e.target.value})}>
                      {INSPECOES.map(i => <option key={i} value={i}>{i || "Selecione..."}</option>)}
                    </select>
                  </div>
                  <div className="ins5-f ins5-g4">
                    <label className="ins5-l">Forma Apontamento</label>
                    <select className="ins5-se" value={seqEdit.forma_apontamento} onChange={e => setSeqEdit({...seqEdit, forma_apontamento: e.target.value})}>
                      {FORMAS_APONTAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="ins5-f ins5-g2">
                    <label className="ins5-l">Apontamento</label>
                    <div className="ins5-toggle-row">
                      <label className="ins5-toggle"><input type="checkbox" checked={seqEdit.apontamento} onChange={e => setSeqEdit({...seqEdit, apontamento: e.target.checked})} /><div className="ins5-toggle-track" /><div className="ins5-toggle-thumb" /></label>
                      <span className="ins5-toggle-label">{seqEdit.apontamento ? "Sim" : "Não"}</span>
                    </div>
                  </div>
                </div>

                <div className="ins5-sep" />
                <div className="ins5-sl">Espécie</div>
                <div className="ins5-g">
                  <div className="ins5-f ins5-g12">
                    <div style={{display:"flex",gap:16}}>
                      {(["valor","atributo","estrutura"] as const).map(t => (
                        <label key={t} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13,fontWeight:500,color:"#243830"}}>
                          <input type="radio" name="especie" checked={seqEdit.especie_tipo === t} onChange={() => setSeqEdit({...seqEdit, especie_tipo: t})} style={{accentColor:"#3e9654"}} />
                          {t === "valor" ? "Valor" : t === "atributo" ? "Atributo" : "Estrutura"}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {seqEdit.especie_tipo === "valor" && (
                  <div className="ins5-g" style={{marginTop:12}}>
                    <div className="ins5-f ins5-g4">
                      <label className="ins5-l">Cota Nominal</label>
                      <input className="ins5-in" value={seqEdit.cota_nominal} onChange={e => setSeqEdit({...seqEdit, cota_nominal: e.target.value})} />
                    </div>
                    <div className="ins5-f ins5-g4">
                      <label className="ins5-l">Valor Máximo</label>
                      <input className="ins5-in" value={seqEdit.valor_maximo} onChange={e => setSeqEdit({...seqEdit, valor_maximo: e.target.value})} />
                    </div>
                    <div className="ins5-f ins5-g4">
                      <label className="ins5-l">Valor Mínimo</label>
                      <input className="ins5-in" value={seqEdit.valor_minimo} onChange={e => setSeqEdit({...seqEdit, valor_minimo: e.target.value})} />
                    </div>
                  </div>
                )}

                {seqEdit.especie_tipo === "atributo" && (
                  <div style={{marginTop:12}}>
                    <table className="ins5-rt">
                      <thead><tr><th>Descrição</th><th style={{width:140}}>Status</th></tr></thead>
                      <tbody>
                        {seqEdit.atributos.map((a, i) => (
                          <tr key={i}>
                            <td>
                              <input className="ins5-in" value={a.descricao} onChange={e => {
                                const attrs = [...seqEdit.atributos];
                                attrs[i] = {...a, descricao: e.target.value};
                                setSeqEdit({...seqEdit, atributos: attrs});
                              }} />
                            </td>
                            <td>
                              <select className="ins5-se" value={a.status} onChange={e => {
                                const attrs = [...seqEdit.atributos];
                                attrs[i] = {...a, status: e.target.value};
                                setSeqEdit({...seqEdit, atributos: attrs});
                              }}>
                                <option value="Aprova">Aprova</option>
                                <option value="Reprova">Reprova</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button className="ins5-bt ins5-bt-g" style={{marginTop:8,fontSize:11}} onClick={() => setSeqEdit({...seqEdit, atributos: [...seqEdit.atributos, {descricao:"",status:"Aprova"}]})}>
                      + Adicionar Atributo
                    </button>
                  </div>
                )}

                {seqEdit.especie_tipo === "estrutura" && (
                  <div style={{marginTop:12,padding:16,background:"#f8fbf6",border:"1px solid #d4e8cc",borderRadius:7,textAlign:"center",color:"#7a9c84",fontSize:13}}>
                    Configuração de estrutura (a ser expandida)
                  </div>
                )}

                <div className="ins5-sep" />
                <div className="ins5-sl">Informações Adicionais</div>
                <div className="ins5-g">
                  <div className="ins5-f ins5-g3">
                    <label className="ins5-l">Grupo de Instr.</label>
                    <input className="ins5-in" value={seqEdit.grupo_instr || ""} onChange={e => setSeqEdit({...seqEdit, grupo_instr: e.target.value})} />
                  </div>
                  <div className="ins5-f ins5-g3">
                    <label className="ins5-l">Tipo de Amostra</label>
                    <input className="ins5-in" value={seqEdit.tipo_amostra || ""} onChange={e => setSeqEdit({...seqEdit, tipo_amostra: e.target.value})} />
                  </div>
                  <div className="ins5-f ins5-g2">
                    <label className="ins5-l">UM</label>
                    <input className="ins5-in" value={seqEdit.um || ""} onChange={e => setSeqEdit({...seqEdit, um: e.target.value})} />
                  </div>
                  <div className="ins5-f ins5-g4">
                    <label className="ins5-l">Norma</label>
                    <input className="ins5-in" value={seqEdit.norma || ""} onChange={e => setSeqEdit({...seqEdit, norma: e.target.value})} />
                  </div>
                  <div className="ins5-f ins5-g4">
                    <label className="ins5-l">Referência</label>
                    <input className="ins5-in" value={seqEdit.referencia || ""} onChange={e => setSeqEdit({...seqEdit, referencia: e.target.value})} />
                  </div>
                  <div className="ins5-f ins5-g2">
                    <label className="ins5-l">Data Validade</label>
                    <input type="date" className="ins5-in" value={seqEdit.data_validade_det || ""} onChange={e => setSeqEdit({...seqEdit, data_validade_det: e.target.value})} />
                  </div>
                  <div className="ins5-f ins5-g4">
                    <label className="ins5-l">Emite Etiqueta</label>
                    <div className="ins5-toggle-row">
                      <label className="ins5-toggle"><input type="checkbox" checked={seqEdit.emite_etiqueta} onChange={e => setSeqEdit({...seqEdit, emite_etiqueta: e.target.checked})} /><div className="ins5-toggle-track" /><div className="ins5-toggle-thumb" /></label>
                      <span className="ins5-toggle-label">{seqEdit.emite_etiqueta ? "Sim" : "Não"}</span>
                    </div>
                  </div>
                </div>
                <div style={{marginTop:12}}>
                  <button className="ins5-bt ins5-bt-g" style={{fontSize:11}}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M5 7l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Instrumentos
                  </button>
                </div>
              </div>
              <div className="ins5-modal-f">
                <button className="ins5-bt ins5-bt-g" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button className="ins5-bt ins5-bt-p" onClick={saveDetalhes}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                  Salvar Detalhes
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="ins5-ft">
          <div className="ins5-ftl">
            <div className="ins5-fts">Sequências: <strong>{sequencias.length}</strong></div>
            <div className="ins5-fts">Módulo: <strong>Inspeção</strong></div>
          </div>
          <div className="ins5-fts" style={{gap:8}}><span style={{color:"#b0c8b8",fontSize:11}}>GRUPO VENTURE LTDA</span></div>
        </footer>
      </div>
    </>
  );
}

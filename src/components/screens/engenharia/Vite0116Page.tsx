import { useState, useCallback } from "react";
import {
  type GrupoPDM_Response,
  type ModificadorPDM_Response,
  type AtributoPDM_Response,
  type AtributoPDM_DTO,
} from "@/services/pdmService";

const MOCK_GRUPOS: GrupoPDM_Response[] = [
  { grupo_pdm: "GRP001", descricao: "Matérias-primas metálicas", abrev: "MPM", empresas: [{ empresa: "01" }] },
  { grupo_pdm: "GRP002", descricao: "Componentes plásticos", abrev: "CPL", empresas: [{ empresa: "01" }, { empresa: "02" }] },
  { grupo_pdm: "GRP003", descricao: "Parafusos e fixadores", abrev: "PFX", empresas: [{ empresa: "01" }] },
  { grupo_pdm: "GRP004", descricao: "Componentes eletrônicos", abrev: "CEL", empresas: [{ empresa: "02" }] },
  { grupo_pdm: "GRP005", descricao: "Embalagens", abrev: "EMB", empresas: [{ empresa: "01" }, { empresa: "03" }] },
];

const MOCK_MODIFICADORES: Record<string, ModificadorPDM_Response[]> = {
  GRP001: [
    { grupo_pdm: "GRP001", modificador: "01", descricao: "Aço Carbono", abreviacao: "AC", empresas: [{ empresa: "01" }] },
    { grupo_pdm: "GRP001", modificador: "02", descricao: "Aço Inox", abreviacao: "AI", empresas: [{ empresa: "01" }] },
    { grupo_pdm: "GRP001", modificador: "03", descricao: "Alumínio", abreviacao: "AL", empresas: [{ empresa: "01" }] },
  ],
  GRP002: [
    { grupo_pdm: "GRP002", modificador: "01", descricao: "Polipropileno", abreviacao: "PP", empresas: [{ empresa: "01" }] },
    { grupo_pdm: "GRP002", modificador: "02", descricao: "ABS", abreviacao: "ABS", empresas: [{ empresa: "02" }] },
  ],
  GRP003: [
    { grupo_pdm: "GRP003", modificador: "01", descricao: "Métrica", abreviacao: "M", empresas: [{ empresa: "01" }] },
  ],
  GRP004: [
    { grupo_pdm: "GRP004", modificador: "01", descricao: "Resistores", abreviacao: "RES", empresas: [{ empresa: "02" }] },
  ],
  GRP005: [
    { grupo_pdm: "GRP005", modificador: "01", descricao: "Papelão", abreviacao: "PAP", empresas: [{ empresa: "01" }] },
  ],
};

const MOCK_ATRIBUTOS: Record<string, AtributoPDM_Response[]> = {
  "GRP001-01": [
    { grupo_pdm: "GRP001", modificador: "01", seq: 1, atributo: 10, texto_ant: "", descricao: "Diâmetro externo", texto_post: "mm", tam: "Essencial", ec: "Essencial", empresas: [{ empresa: "01" }] },
    { grupo_pdm: "GRP001", modificador: "01", seq: 2, atributo: 20, texto_ant: "Ø", descricao: "Diâmetro interno", texto_post: "mm", tam: "Essencial", ec: "Complementar", empresas: [{ empresa: "01" }] },
    { grupo_pdm: "GRP001", modificador: "01", seq: 3, atributo: 30, texto_ant: "L", descricao: "Comprimento", texto_post: "mm", tam: "Essencial", ec: "Essencial", empresas: [{ empresa: "01" }] },
    { grupo_pdm: "GRP001", modificador: "01", seq: 4, atributo: 40, texto_ant: "", descricao: "Peso", texto_post: "kg", tam: "Complementar", ec: "Complementar", empresas: [{ empresa: "01" }] },
  ],
  "GRP001-02": [
    { grupo_pdm: "GRP001", modificador: "02", seq: 1, atributo: 10, texto_ant: "", descricao: "Bitola", texto_post: "mm", tam: "Essencial", ec: "Essencial", empresas: [{ empresa: "01" }] },
    { grupo_pdm: "GRP001", modificador: "02", seq: 2, atributo: 20, texto_ant: "", descricao: "Acabamento superficial", texto_post: "", tam: "Complementar", ec: "Complementar", empresas: [{ empresa: "01" }] },
  ],
  "GRP002-01": [
    { grupo_pdm: "GRP002", modificador: "01", seq: 1, atributo: 10, texto_ant: "", descricao: "Cor", texto_post: "", tam: "Essencial", ec: "Essencial", empresas: [{ empresa: "01" }] },
    { grupo_pdm: "GRP002", modificador: "01", seq: 2, atributo: 20, texto_ant: "", descricao: "Densidade", texto_post: "g/cm³", tam: "Complementar", ec: "Essencial", empresas: [{ empresa: "01" }] },
  ],
};

const MOCK_EMPRESAS = ["01 - Matriz", "02 - Filial SP", "03 - Filial RJ"];
const MOCK_ITENS = ["IB001 - Base Aço", "IB002 - Base Plástico", "IB003 - Base Alumínio"];

type ModoForm = "novo" | "edicao";
type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface FormAtributo {
  grupo_pdm: string;
  modificador: string;
  seq: number;
  atributo: number;
  texto_ant: string;
  descricao: string;
  texto_post: string;
  tam: "Essencial" | "Complementar";
  ec: "Essencial" | "Complementar";
}

interface EmpresaVinculoLocal { empresa: string; item_base: string; }

const FORM_INICIAL: FormAtributo = {
  grupo_pdm: "", modificador: "", seq: 0, atributo: 0,
  texto_ant: "", descricao: "", texto_post: "",
  tam: "Essencial", ec: "Essencial",
};

export function Vite0116Page(): JSX.Element {
  const [form, setForm] = useState<FormAtributo>(FORM_INICIAL);
  const [modoForm, setModoForm] = useState<ModoForm>("novo");
  const [seqEdit, setSeqEdit] = useState<number | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormAtributo, string>>>({});
  const [empresas, setEmpresas] = useState<EmpresaVinculoLocal[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemEmpresa, setItemEmpresa] = useState("");
  const [itemBase, setItemBase] = useState("");
  const [grupoFiltro, setGrupoFiltro] = useState("");
  const [modificadorFiltro, setModificadorFiltro] = useState("");
  const [modificadoresLista, setModificadoresLista] = useState<ModificadorPDM_Response[]>([]);
  const [atributosLista, setAtributosLista] = useState<AtributoPDM_Response[]>([]);
  const [clipboard, setClipboard] = useState<AtributoPDM_DTO[] | null>(null);
  const [clipboardOrigem, setClipboardOrigem] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const setField = useCallback(<K extends keyof FormAtributo>(key: K, value: FormAtributo[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setFeedback(null);
  }, []);

  const carregarModificadores = useCallback((grupo: string) => {
    if (!grupo) { setModificadoresLista([]); return; }
    setTimeout(() => { setModificadoresLista(MOCK_MODIFICADORES[grupo] ?? []); }, 200);
  }, []);

  const carregarAtributos = useCallback((grupo: string, mod: string) => {
    if (!grupo || !mod) { setAtributosLista([]); return; }
    const key = grupo + "-" + mod;
    setTimeout(() => { setAtributosLista(MOCK_ATRIBUTOS[key] ?? []); }, 200);
  }, []);

  function validate(): boolean {
    const e: Partial<Record<keyof FormAtributo, string>> = {};
    if (!form.grupo_pdm.trim()) e.grupo_pdm = "Grupo PDM obrigatório.";
    if (!form.modificador.trim()) e.modificador = "Modificador obrigatório.";
    if (!form.seq || form.seq <= 0) e.seq = "Sequência deve ser > 0.";
    if (!form.atributo || form.atributo <= 0) e.atributo = "Atributo deve ser > 0.";
    if (!form.descricao.trim()) e.descricao = "Descrição obrigatória.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSelectFromList(a: AtributoPDM_Response) {
    setForm({ grupo_pdm: a.grupo_pdm, modificador: a.modificador, seq: a.seq, atributo: a.atributo, texto_ant: a.texto_ant, descricao: a.descricao, texto_post: a.texto_post, tam: a.tam, ec: a.ec });
    setEmpresas(a.empresas.map((e) => ({ empresa: e.empresa, item_base: e.item_base ?? "" })));
    setFeedback(null); setErrors({}); setModoForm("edicao"); setSeqEdit(a.seq);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  function handleSalvar() {
    if (!validate()) return;
    setIsSaving(true); setFeedback(null);
    setTimeout(() => {
      setIsSaving(false);
      setFeedback({ type: "success", message: "Atributo seq." + form.seq + " salvo com sucesso." });
      carregarAtributos(form.grupo_pdm, form.modificador);
    }, 600);
  }

  function handleNovo() {
    setForm({ ...FORM_INICIAL, grupo_pdm: grupoFiltro, modificador: modificadorFiltro });
    setErrors({}); setFeedback(null); setEmpresas([]);
    setItemEmpresa(""); setItemBase(""); setModoForm("novo"); setSeqEdit(null);
  }

  function handleLimpar() { handleNovo(); }

  function handleCopiar() {
    if (!form.grupo_pdm.trim() || !form.modificador.trim()) {
      setFeedback({ type: "info", message: "Selecione Grupo e Modificador na pesquisa para copiar." });
      return;
    }
    const key = form.grupo_pdm + "-" + form.modificador;
    const attrs = MOCK_ATRIBUTOS[key] ?? [];
    if (attrs.length === 0) {
      setFeedback({ type: "info", message: "Nenhum atributo encontrado em " + key + " para copiar." });
      return;
    }
    const dtos: AtributoPDM_DTO[] = attrs.map((a) => ({
      grupo_pdm: a.grupo_pdm, modificador: a.modificador, seq: a.seq, atributo: a.atributo,
      texto_ant: a.texto_ant, descricao: a.descricao, texto_post: a.texto_post,
      tam: a.tam, ec: a.ec,
      empresas: a.empresas.map((e) => ({ empresa: e.empresa, item_base: e.item_base })),
    }));
    setClipboard(dtos); setClipboardOrigem(key);
    setFeedback({ type: "success", message: dtos.length + " atributo(s) copiados de " + key + "." });
  }

  function handleColar() {
    if (!clipboard) { setFeedback({ type: "info", message: "Nada na área de transferência. Use Copiar primeiro." }); return; }
    if (!form.grupo_pdm.trim() || !form.modificador.trim()) {
      setFeedback({ type: "info", message: "Selecione Grupo e Modificador na pesquisa para colar." });
      return;
    }
    const dest = form.grupo_pdm + "-" + form.modificador;
    if (dest === clipboardOrigem) { setFeedback({ type: "info", message: "Origem e destino são iguais." }); return; }
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      const novos: AtributoPDM_Response[] = clipboard.map((a) => ({
        grupo_pdm: form.grupo_pdm, modificador: form.modificador,
        seq: a.seq, atributo: a.atributo, texto_ant: a.texto_ant,
        descricao: a.descricao, texto_post: a.texto_post,
        tam: a.tam, ec: a.ec,
        empresas: a.empresas as any,
      }));
      MOCK_ATRIBUTOS[dest] = novos;
      setAtributosLista(novos);
      setFeedback({ type: "success", message: novos.length + " atributo(s) colados em " + dest + "." });
    }, 400);
  }

  function adicionarItem() {
    if (!itemEmpresa.trim()) return;
    setEmpresas((p) => [...p, { empresa: itemEmpresa.trim(), item_base: itemBase.trim() }]);
    setItemEmpresa(""); setItemBase(""); setShowItemModal(false);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        .pdm3-root{min-height:100vh;background:#f0f4f7;font-family:'Inter',sans-serif;color:#1a2533;display:flex;flex-direction:column}
        .pdm3-topbar{height:52px;background:#1a2738;display:flex;align-items:center;justify-content:space-between;padding:0 20px;flex-shrink:0;border-bottom:1px solid rgba(68,140,200,0.15)}
        .pdm3-topbar-left{display:flex;align-items:center;gap:10px}
        .pdm3-logo-mark{width:28px;height:28px;background:#3b82c4;border-radius:6px;display:flex;align-items:center;justify-content:center}
        .pdm3-app-name{font-size:13px;font-weight:600;color:#dce8f4;line-height:1.1}
        .pdm3-app-sub{display:block;font-size:9px;font-weight:400;color:#3d6080}
        .pdm3-screen-title{font-size:12.5px;font-weight:500;color:#5a96c0;padding-left:14px;margin-left:14px;border-left:1px solid rgba(255,255,255,0.08)}
        .pdm3-actionbar{background:#fff;border-bottom:1px solid #d5e0e8;padding:0 20px;display:flex;align-items:center;gap:4px;height:46px;flex-shrink:0}
        .pdm3-action-group{display:flex;align-items:center;gap:4px;padding-right:12px;margin-right:8px;border-right:1px solid #e4ecf2}
        .pdm3-action-group:last-child{border-right:none}
        .pdm3-action-label{font-size:9.5px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#90a8c0;margin-right:4px;white-space:nowrap}
        .pdm3-btn{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border:1.5px solid transparent;border-radius:7px;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background .13s,border-color .13s,color .13s}
        .pdm3-btn:disabled{opacity:.5;cursor:not-allowed}
        .pdm3-btn-primary{background:#1a2738;color:#d8e8f8;border-color:#1a2738}
        .pdm3-btn-primary:hover:not(:disabled){background:#233550}
        .pdm3-btn-ghost{background:transparent;color:#4a6880;border-color:#ccdce8}
        .pdm3-btn-ghost:hover:not(:disabled){background:#edf4fa;border-color:#a0c0d8;color:#1a3048}
        .pdm3-btn-danger{background:transparent;color:#b94040;border-color:#f0c8c8}
        .pdm3-btn-danger:hover:not(:disabled){background:#fff0f0;border-color:#e09090}
        .pdm3-btn-sm{height:28px;padding:0 9px;font-size:12px}
        .pdm3-btn-info{background:#edf4fa;color:#1a4880;border-color:#a8c8e0;font-weight:600}
        .pdm3-btn-info:hover:not(:disabled){background:#dce8f4;border-color:#80b0d8}
        .pdm3-btn-warn{background:#f8f4e0;color:#6a5400;border-color:#e0d080;font-weight:600}
        .pdm3-btn-warn:hover:not(:disabled){background:#f4ecc8;border-color:#d0c060}
        .pdm3-body{flex:1;padding:16px 20px;display:flex;flex-direction:column;gap:0;overflow-y:auto}
        .pdm3-body::-webkit-scrollbar{width:5px}
        .pdm3-body::-webkit-scrollbar-thumb{background:#c8d8e8;border-radius:4px}
        .pdm3-section-banner{display:flex;align-items:center;gap:10px;padding:14px 0 8px}
        .pdm3-section-banner:first-child{padding-top:0}
        .pdm3-section-banner-pill{font-size:9.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#4a7498;background:#dce8f4;border:1px solid #c0d4e8;border-radius:20px;padding:3px 10px;white-space:nowrap}
        .pdm3-section-banner-line{flex:1;height:1px;background:#d5e0e8}
        .pdm3-section-banner-hint{font-size:11px;color:#90a8c0;white-space:nowrap}
        .pdm3-card{background:#fff;border:1px solid #d5e0e8;border-radius:12px;overflow:hidden;margin-bottom:14px}
        .pdm3-card-header{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid #e8eff4;background:#f8fafc}
        .pdm3-card-header-left{display:flex;align-items:center;gap:8px}
        .pdm3-card-title{font-size:12px;font-weight:600;color:#2a3d54;text-transform:uppercase;letter-spacing:.6px}
        .pdm3-card-badge{font-size:10.5px;font-weight:500;color:#3b82c4;background:#edf4fa;border:1px solid #b8d0e8;border-radius:12px;padding:2px 8px}
        .pdm3-card-body{padding:18px 18px}
        .pdm3-modo-novo{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:#e0eef8;color:#1a4070;border:1px solid #90c0e8}
        .pdm3-modo-edicao{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:#f8f0e0;color:#7a5200;border:1px solid #e0c860}
        .pdm3-modo-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
        .pdm3-modo-novo .pdm3-modo-dot{background:#3b82c4}
        .pdm3-modo-edicao .pdm3-modo-dot{background:#c8a020}
        .pdm3-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:16px 14px;align-items:start}
        .pdm3-col-1{grid-column:span 1}.pdm3-col-2{grid-column:span 2}
        .pdm3-col-3{grid-column:span 3}.pdm3-col-4{grid-column:span 4}
        .pdm3-col-5{grid-column:span 5}.pdm3-col-6{grid-column:span 6}
        .pdm3-col-7{grid-column:span 7}.pdm3-col-8{grid-column:span 8}
        .pdm3-col-9{grid-column:span 9}.pdm3-col-10{grid-column:span 10}
        .pdm3-col-12{grid-column:span 12}
        .pdm3-field{display:flex;flex-direction:column;gap:5px}
        .pdm3-label{font-size:10.5px;font-weight:600;color:#546e88;text-transform:uppercase;letter-spacing:.4px;display:flex;align-items:center;gap:4px}
        .pdm3-label-req{color:#c84040;font-size:12px;line-height:1}
        .pdm3-input{width:100%;height:36px;background:#f4f8fc;border:1.5px solid #c8dae8;border-radius:7px;padding:0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2533;outline:none;transition:border-color .13s,box-shadow .13s}
        .pdm3-input:focus{border-color:#3b82c4;box-shadow:0 0 0 2px rgba(59,130,196,0.1)}
        .pdm3-input::placeholder{color:#a8c0d8;font-size:12px}
        .pdm3-input.has-error{border-color:#e05252;box-shadow:0 0 0 2px rgba(224,82,82,0.1)}
        .pdm3-input:disabled{background:#edf2f8;color:#90a8c0;cursor:not-allowed;border-color:#dce4f0}
        .pdm3-select{width:100%;height:36px;background:#f4f8fc;border:1.5px solid #c8dae8;border-radius:7px;padding:0 28px 0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2533;outline:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23708898' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;transition:border-color .13s}
        .pdm3-select:focus{border-color:#3b82c4;box-shadow:0 0 0 2px rgba(59,130,196,0.1)}
        .pdm3-field-error{font-size:11px;color:#c84040;margin-top:2px;display:flex;align-items:center;gap:4px}
        .pdm3-field-hint{font-size:11px;color:#7490a8;margin-top:2px;line-height:1.45}
        .pdm3-results-wrap{border-top:1px solid #e8eff4;overflow-x:auto;margin-top:14px}
        .pdm3-results-bar{display:flex;align-items:center;justify-content:space-between;padding:10px 18px;background:#f4f8fc;border-bottom:1px solid #e8eff4}
        .pdm3-results-bar-left{display:flex;align-items:center;gap:8px}
        .pdm3-results-bar-label{font-size:11px;font-weight:600;color:#4a6880;text-transform:uppercase;letter-spacing:.5px}
        .pdm3-results-hint{font-size:11px;color:#90a8c0}
        .pdm3-results-table{width:100%;border-collapse:collapse;font-size:13px}
        .pdm3-results-table th{background:#f4f8fc;padding:8px 12px;text-align:left;font-size:10.5px;font-weight:700;color:#546e88;text-transform:uppercase;letter-spacing:.5px;border-bottom:1.5px solid #d5e0e8;white-space:nowrap}
        .pdm3-results-table td{padding:9px 12px;border-bottom:1px solid #eef4f8;color:#203040;vertical-align:middle}
        .pdm3-results-table tbody tr{cursor:pointer;transition:background .1s}
        .pdm3-results-table tbody tr:hover{background:#edf4fa}
        .pdm3-results-empty{text-align:center;padding:28px 12px;color:#90a8c0;font-size:12.5px}
        .pdm3-feedback{display:flex;align-items:center;gap:9px;padding:11px 15px;border-radius:9px;font-size:13px;animation:pdm3FadeIn .2s ease;margin-bottom:14px}
        .pdm3-feedback.success{background:#f0faf4;border:1px solid #b4dcc4;color:#1e6030}
        .pdm3-feedback.error{background:#fff5f5;border:1px solid #f8c0c0;border-left:3px solid #e05252;color:#b91c1c}
        .pdm3-feedback.info{background:#f0f4ff;border:1px solid #c0d0f8;border-left:3px solid #4868c4;color:#1a3070}
        .pdm3-footer{background:#fff;border-top:1px solid #d5e0e8;padding:8px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .pdm3-footer-left{display:flex;align-items:center;gap:20px}
        .pdm3-footer-stat{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#6a84a0}
        .pdm3-footer-stat strong{color:#1a2533;font-weight:600}
        .pdm3-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;animation:pdm3FadeIn .15s ease}
        .pdm3-modal{background:#fff;border-radius:12px;width:440px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.2);overflow:hidden}
        .pdm3-modal-header{padding:14px 18px;border-bottom:1px solid #e8eff4;display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:600;color:#1a2738}
        .pdm3-modal-body{padding:20px 18px;display:flex;flex-direction:column;gap:14px}
        .pdm3-modal-footer{padding:12px 18px;border-top:1px solid #e8eff4;display:flex;justify-content:flex-end;gap:8px}
        .pdm3-check-group{display:flex;align-items:center;gap:18px;padding-top:4px}
        .pdm3-check-group label{font-size:12.5px;color:#304058;cursor:pointer;display:flex;align-items:center;gap:5px;user-select:none}
        .pdm3-checkbox{width:15px;height:15px;accent-color:#3b82c4;cursor:pointer}
        .pdm3-ec-badge{display:inline-flex;align-items:center;font-size:10.5px;font-weight:600;border-radius:12px;padding:2px 8px}
        .pdm3-ec-badge.essencial{background:#dcfce7;color:#166534;border:1px solid #86efac}
        .pdm3-ec-badge.complementar{background:#fef9c3;color:#854d0e;border:1px solid #fde047}
        .pdm3-tam-badge{display:inline-flex;align-items:center;font-size:10.5px;font-weight:600;border-radius:12px;padding:2px 8px}
        .pdm3-tam-badge.essencial{background:#e0f0ff;color:#0c3b5e;border:1px solid #90c8f0}
        .pdm3-tam-badge.complementar{background:#f3e8ff;color:#4a1578;border:1px solid #c4a8e8}
        .pdm3-clip-status{padding:6px 12px;border-radius:7px;font-size:12px;font-weight:500;display:flex;align-items:center;gap:7px}
        .pdm3-clip-status.active{background:#f0faf4;border:1px solid #b4dcc4;color:#166534}
        .pdm3-clip-status.empty{background:#f4f8fc;border:1px solid #d5e0e8;color:#7490a8}
        @keyframes spin{to{transform:rotate(360deg)}}
        .pdm3-spinner{width:14px;height:14px;flex-shrink:0;border:2px solid rgba(216,232,248,0.3);border-top-color:#d8e8f8;border-radius:50%;animation:spin .65s linear infinite}
        @keyframes pdm3FadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className="pdm3-root">
        <header className="pdm3-topbar">
          <div className="pdm3-topbar-left">
            <div className="pdm3-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="pdm3-app-name">Venture<span className="pdm3-app-sub">ERP &amp; Soluções</span></span>
            <span className="pdm3-screen-title">VITE0116 — Cadastro de Atributos (PDM)</span>
          </div>
        </header>

        <div className="pdm3-actionbar">
          <div className="pdm3-action-group">
            <span className="pdm3-action-label">Cadastro</span>
            <button className="pdm3-btn pdm3-btn-info" onClick={handleNovo} disabled={isSaving}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              Novo
            </button>
          </div>
          <div className="pdm3-action-group">
            <span className="pdm3-action-label">Ações</span>
            <button className="pdm3-btn pdm3-btn-primary" onClick={() => void handleSalvar()} disabled={isSaving}>
              {isSaving ? <><div className="pdm3-spinner" />Salvando...</> : <>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                Salvar
              </>}
            </button>
            <button className="pdm3-btn pdm3-btn-danger" onClick={handleLimpar} disabled={isSaving}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Limpar
            </button>
          </div>
          <div className="pdm3-action-group">
            <span className="pdm3-action-label">Copiar/Colar</span>
            <button className="pdm3-btn pdm3-btn-warn" onClick={handleCopiar} disabled={isSaving}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2.5" y="2" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M1 4v6a1 1 0 001 1h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
              Copiar
            </button>
            <button className="pdm3-btn pdm3-btn-warn" onClick={handleColar} disabled={isSaving || !clipboard}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 1h6a1 1 0 011 1v6" stroke="currentColor" strokeWidth="1.2" /><rect x="1" y="3" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" /></svg>
              Colar
            </button>
          </div>
          <div className="pdm3-action-group">
            <button className="pdm3-btn pdm3-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              Ajuda
            </button>
          </div>
        </div>

        <div className="pdm3-body">
          {feedback && (
            <div className={"pdm3-feedback " + feedback.type}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === "success" ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                 : feedback.type === "error" ? <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4" /><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round" /></>
                 : <><circle cx="8" cy="8" r="6" stroke="#4868c4" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="#4868c4" strokeWidth="1.4" strokeLinecap="round" /></>}
              </svg>
              {feedback.message}
            </div>
          )}

          {/* SEÇÃO 1 - PESQUISAR */}
          <div className="pdm3-section-banner">
            <span className="pdm3-section-banner-pill">1 — Pesquisar</span>
            <div className="pdm3-section-banner-line" />
            <span className="pdm3-section-banner-hint">Selecione Grupo e Modificador para listar atributos</span>
          </div>

          <div className="pdm3-card">
            <div className="pdm3-card-header">
              <div className="pdm3-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="#3b82c4" strokeWidth="1.4" /><path d="M10 10l3.5 3.5" stroke="#3b82c4" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <span className="pdm3-card-title">Pesquisa de Atributos PDM</span>
              </div>
              {clipboard && (
                <div className="pdm3-clip-status active">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2.5" y="2" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" /></svg>
                  {clipboard.length} atributo(s) em cópia
                </div>
              )}
            </div>
            <div className="pdm3-card-body" style={{ paddingBottom: 14 }}>
              <div className="pdm3-filter-row" style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
                <div className="pdm3-field" style={{ flex: "0 0 260px" }}>
                  <label className="pdm3-label">Grupo PDM</label>
                  <select className="pdm3-select" value={grupoFiltro} onChange={(e) => { setGrupoFiltro(e.target.value); carregarModificadores(e.target.value); setModificadorFiltro(""); setAtributosLista([]); }}>
                    <option value="">Selecione um grupo...</option>
                    {MOCK_GRUPOS.map((g) => <option key={g.grupo_pdm} value={g.grupo_pdm}>{g.grupo_pdm} — {g.descricao}</option>)}
                  </select>
                </div>
                <div className="pdm3-field" style={{ flex: "0 0 260px" }}>
                  <label className="pdm3-label">Modificador</label>
                  <select className="pdm3-select" value={modificadorFiltro} onChange={(e) => { setModificadorFiltro(e.target.value); carregarAtributos(grupoFiltro, e.target.value); }}>
                    <option value="">Selecione um modificador...</option>
                    {modificadoresLista.map((m) => <option key={m.modificador} value={m.modificador}>{m.modificador} — {m.descricao}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {grupoFiltro && modificadorFiltro && (
              <div className="pdm3-results-wrap">
                <div className="pdm3-results-bar">
                  <div className="pdm3-results-bar-left">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="#546e88" strokeWidth="1.4" strokeLinecap="round" /></svg>
                    <span className="pdm3-results-bar-label">Atributos de {grupoFiltro}-{modificadorFiltro}</span>
                    <span className="pdm3-card-badge">{atributosLista.length} registro(s)</span>
                  </div>
                  <span className="pdm3-results-hint">↓ Clique para carregar</span>
                </div>
                {atributosLista.length === 0 ? (
                  <div className="pdm3-results-empty">Nenhum atributo encontrado.</div>
                ) : (
                  <table className="pdm3-results-table">
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>Seq.</th>
                        <th style={{ width: 80 }}>Atributo</th>
                        <th style={{ width: 90 }}>Texto Ant.</th>
                        <th>Descrição</th>
                        <th style={{ width: 90 }}>Texto Post.</th>
                        <th style={{ width: 90 }}>TAM</th>
                        <th style={{ width: 90 }}>E/C</th>
                      </tr>
                    </thead>
                    <tbody>
                      {atributosLista.map((a) => (
                        <tr key={a.seq} onClick={() => handleSelectFromList(a)}>
                          <td style={{ fontWeight: 600, color: "#1a4070" }}>{a.seq}</td>
                          <td style={{ fontWeight: 600 }}>{a.atributo}</td>
                          <td style={{ color: a.texto_ant ? "#203040" : "#90a8c0" }}>{a.texto_ant || "—"}</td>
                          <td>{a.descricao}</td>
                          <td style={{ color: a.texto_post ? "#203040" : "#90a8c0" }}>{a.texto_post || "—"}</td>
                          <td><span className={"pdm3-tam-badge " + a.tam.toLowerCase()}>{a.tam === "Essencial" ? "Essencial" : "Compl."}</span></td>
                          <td><span className={"pdm3-ec-badge " + a.ec.toLowerCase()}>{a.ec === "Essencial" ? "Essencial" : "Compl."}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* SEÇÃO 2 - CRIAR/EDITAR */}
          <div className="pdm3-section-banner">
            <span className="pdm3-section-banner-pill">2 — Criar / Editar</span>
            <div className="pdm3-section-banner-line" />
            <span className="pdm3-section-banner-hint">{modoForm === "novo" ? "Preencha os campos e clique em Salvar" : "Editando seq. " + (seqEdit ?? "?")}</span>
          </div>

          <div className="pdm3-card">
            <div className="pdm3-card-header">
              <div className="pdm3-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3b82c4" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="#3b82c4" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <span className="pdm3-card-title">Atributo PDM</span>
              </div>
              {modoForm === "novo" ? <span className="pdm3-modo-novo"><span className="pdm3-modo-dot" />Novo Cadastro</span> : <span className="pdm3-modo-edicao"><span className="pdm3-modo-dot" />Editando seq. {seqEdit}</span>}
            </div>
            <div className="pdm3-card-body">
              <div className="pdm3-grid">
                <div className="pdm3-field pdm3-col-2">
                  <label className="pdm3-label">Grupo PDM <span className="pdm3-label-req">*</span></label>
                  <input className="pdm3-input" value={form.grupo_pdm} disabled style={{ color: form.grupo_pdm ? "#1a2533" : "#90a8c0" }} />
                </div>
                <div className="pdm3-field pdm3-col-2">
                  <label className="pdm3-label">Modificador <span className="pdm3-label-req">*</span></label>
                  <input className="pdm3-input" value={form.modificador} disabled style={{ color: form.modificador ? "#1a2533" : "#90a8c0" }} />
                </div>
                <div className="pdm3-field pdm3-col-1">
                  <label className="pdm3-label">Seq. <span className="pdm3-label-req">*</span></label>
                  <input type="number" className={"pdm3-input" + (errors.seq ? " has-error" : "")} placeholder="1" value={form.seq || ""} onChange={(e) => setField("seq", Number(e.target.value))} min={1} />
                  {errors.seq && <span className="pdm3-field-error"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2" /><path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round" /></svg>{errors.seq}</span>}
                </div>
                <div className="pdm3-field pdm3-col-1">
                  <label className="pdm3-label">Atributo <span className="pdm3-label-req">*</span></label>
                  <input type="number" className={"pdm3-input" + (errors.atributo ? " has-error" : "")} placeholder="10" value={form.atributo || ""} onChange={(e) => setField("atributo", Number(e.target.value))} min={1} />
                  {errors.atributo && <span className="pdm3-field-error"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2" /><path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round" /></svg>{errors.atributo}</span>}
                </div>
                <div className="pdm3-field pdm3-col-6">
                  <label className="pdm3-label">Descrição <span className="pdm3-label-req">*</span></label>
                  <input className={"pdm3-input" + (errors.descricao ? " has-error" : "")} placeholder="Ex: Diâmetro externo" value={form.descricao} onChange={(e) => setField("descricao", e.target.value)} maxLength={100} />
                  {errors.descricao && <span className="pdm3-field-error"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2" /><path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round" /></svg>{errors.descricao}</span>}
                </div>
                <div className="pdm3-field pdm3-col-3">
                  <label className="pdm3-label">Texto Ant.</label>
                  <input className="pdm3-input" placeholder='Ex: Ø ou " "' value={form.texto_ant} onChange={(e) => setField("texto_ant", e.target.value)} maxLength={20} />
                  <div className="pdm3-check-group">
                    <label><input type="checkbox" className="pdm3-checkbox" checked={form.texto_ant === " "} onChange={(e) => { if (e.target.checked) setField("texto_ant", " "); else if (form.texto_ant === " ") setField("texto_ant", ""); }} /> Espaço</label>
                    <label><input type="checkbox" className="pdm3-checkbox" checked={form.texto_ant === "  "} onChange={(e) => { if (e.target.checked) setField("texto_ant", "  "); else if (form.texto_ant === "  ") setField("texto_ant", ""); }} /> 2 Espaços</label>
                  </div>
                </div>
                <div className="pdm3-field pdm3-col-3">
                  <label className="pdm3-label">Texto Post.</label>
                  <input className="pdm3-input" placeholder='Ex: mm ou " "' value={form.texto_post} onChange={(e) => setField("texto_post", e.target.value)} maxLength={20} />
                  <div className="pdm3-check-group">
                    <label><input type="checkbox" className="pdm3-checkbox" checked={form.texto_post === " "} onChange={(e) => { if (e.target.checked) setField("texto_post", " "); else if (form.texto_post === " ") setField("texto_post", ""); }} /> Espaço</label>
                    <label><input type="checkbox" className="pdm3-checkbox" checked={form.texto_post === "  "} onChange={(e) => { if (e.target.checked) setField("texto_post", "  "); else if (form.texto_post === "  ") setField("texto_post", ""); }} /> 2 Espaços</label>
                  </div>
                </div>
                <div className="pdm3-field pdm3-col-2">
                  <label className="pdm3-label">TAM</label>
                  <select className="pdm3-select" value={form.tam} onChange={(e) => setField("tam", e.target.value as "Essencial" | "Complementar")}>
                    <option value="Essencial">Essencial</option>
                    <option value="Complementar">Complementar</option>
                  </select>
                </div>
                <div className="pdm3-field pdm3-col-2">
                  <label className="pdm3-label">E/C</label>
                  <select className="pdm3-select" value={form.ec} onChange={(e) => setField("ec", e.target.value as "Essencial" | "Complementar")}>
                    <option value="Essencial">Essencial</option>
                    <option value="Complementar">Complementar</option>
                  </select>
                </div>
                <div className="pdm3-field pdm3-col-2" style={{ alignSelf: "flex-end", paddingBottom: 2 }}>
                  <button className="pdm3-btn pdm3-btn-info pdm3-btn-sm" onClick={() => setShowItemModal(true)}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                    Item
                  </button>
                </div>
              </div>

              {empresas.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: "#546e88", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>Empresas vinculadas ({empresas.length})</div>
                  <table className="pdm3-results-table">
                    <thead><tr><th style={{ width: 50 }}>#</th><th>Empresa</th><th>Item Base</th><th style={{ width: 80 }}></th></tr></thead>
                    <tbody>
                      {empresas.map((e, i) => (
                        <tr key={i}>
                          <td style={{ color: "#90a8c0", fontSize: 12 }}>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{e.empresa}</td>
                          <td>{e.item_base || "—"}</td>
                          <td><button style={{ background: "transparent", border: "none", cursor: "pointer", color: "#c89090", fontSize: 12 }} onClick={() => setEmpresas((p) => p.filter((_, j) => j !== i))}>Remover</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="pdm3-footer">
          <div className="pdm3-footer-left">
            <div className="pdm3-footer-stat">Grupo: <strong>{form.grupo_pdm || "—"}</strong></div>
            <div className="pdm3-footer-stat">Mod: <strong>{form.modificador || "—"}</strong></div>
            <div className="pdm3-footer-stat">Seq: <strong>{form.seq || "—"}</strong></div>
            <div className="pdm3-footer-stat">Atributo: <strong>{form.atributo || "—"}</strong></div>
            <div className="pdm3-footer-stat">TAM: <strong>{form.tam}</strong></div>
            <div className="pdm3-footer-stat">E/C: <strong>{form.ec}</strong></div>
          </div>
          <div className="pdm3-footer-stat">
            {modoForm === "novo" ? <span className="pdm3-modo-novo" style={{ fontSize: 11 }}><span className="pdm3-modo-dot" />Novo Cadastro</span> : <span className="pdm3-modo-edicao" style={{ fontSize: 11 }}><span className="pdm3-modo-dot" />Editando seq. {seqEdit}</span>}
          </div>
        </footer>

        {/* ITEM MODAL */}
        {showItemModal && (
          <div className="pdm3-modal-overlay" onClick={() => setShowItemModal(false)}>
            <div className="pdm3-modal" onClick={(e) => e.stopPropagation()}>
              <div className="pdm3-modal-header">
                <span>Vincular Empresa / Item Base</span>
                <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#90a8c0" }} onClick={() => setShowItemModal(false)}>✕</button>
              </div>
              <div className="pdm3-modal-body">
                <div className="pdm3-field">
                  <label className="pdm3-label">Empresa <span className="pdm3-label-req">*</span></label>
                  <select className="pdm3-select" value={itemEmpresa} onChange={(e) => setItemEmpresa(e.target.value)}>
                    <option value="">Selecione...</option>
                    {MOCK_EMPRESAS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div className="pdm3-field">
                  <label className="pdm3-label">Item Base</label>
                  <select className="pdm3-select" value={itemBase} onChange={(e) => setItemBase(e.target.value)}>
                    <option value="">Selecione...</option>
                    {MOCK_ITENS.map((it) => <option key={it} value={it}>{it}</option>)}
                  </select>
                </div>
              </div>
              <div className="pdm3-modal-footer">
                <button className="pdm3-btn pdm3-btn-ghost pdm3-btn-sm" onClick={() => setShowItemModal(false)}>Cancelar</button>
                <button className="pdm3-btn pdm3-btn-primary pdm3-btn-sm" onClick={adicionarItem}>Adicionar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

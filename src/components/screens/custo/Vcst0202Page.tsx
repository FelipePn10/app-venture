import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PrecificacaoForm {
  codigo: string;
  descricao: string;
  empresa: string;
  revisoes: number;
  dataCadastro: string;
}

interface RevisaoForm {
  codigo: string;
  descricao: string;
  dataCadastro: string;
  dataValidade: string;
  ultimaAlteracao: string;
  ultimoCalculo: string;
  situacao: string;
  observacoes: string;
}

interface PrecificacaoItem {
  linha: number;
  codigo: string;
  descricao: string;
  mascaraId: string;
  quantidade: number;
  precoVenda: number;
  custo: number;
  margem: number;
  selected: boolean;
}

type AbaAtiva = "precificacoes" | "revisoes" | "itens" | "dadosGerais";
type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

const SITUACAO_OPTIONS = ["Aberta", "Fechada"];
const TIPO_FRETE = ["Cif-Contrat.", "Daf", "Cif-Próprio", "Fob-Contrat.", "Fob-Próprio", "Sem Frete", "Convenio", "Retira", "Cortesia", "Terceiros"];

const MOCK_PRECIF: PrecificacaoForm[] = [
  { codigo:"PR0001", descricao:"Precificação Tabela Verão 2026", empresa:"01", revisoes:3, dataCadastro:"10/01/2026" },
  { codigo:"PR0002", descricao:"Precificação Cliente ALFA", empresa:"01", revisoes:1, dataCadastro:"20/03/2026" },
  { codigo:"PR0003", descricao:"Precificação Exportação", empresa:"02", revisoes:2, dataCadastro:"05/04/2026" },
];

const MOCK_ITENS: PrecificacaoItem[] = [
  { linha:1, codigo:"IT001", descricao:"Produto A - Modelo Standard", mascaraId:"", quantidade:100, precoVenda:150.00, custo:85.00, margem:43.33, selected:false },
  { linha:2, codigo:"IT002", descricao:"Produto B - Modelo Premium", mascaraId:"MSK01", quantidade:50, precoVenda:320.00, custo:180.00, margem:43.75, selected:false },
  { linha:3, codigo:"IT003", descricao:"Produto C - Acessório", mascaraId:"", quantidade:200, precoVenda:45.00, custo:22.00, margem:51.11, selected:false },
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

export function Vcst0202Page(): JSX.Element {
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("precificacoes");
  const [precificacoes, setPrecificacoes] = useState<PrecificacaoForm[]>(MOCK_PRECIF);
  const [selectedPrecif, setSelectedPrecif] = useState<PrecificacaoForm | null>(null);
  const [revisaoForm, setRevisaoForm] = useState<RevisaoForm>({
    codigo:"", descricao:"", dataCadastro:new Date().toISOString().slice(0,10), dataValidade:"", ultimaAlteracao:"", ultimoCalculo:"", situacao:"Aberta", observacoes:"",
  });
  const [itens, setItens] = useState<PrecificacaoItem[]>(MOCK_ITENS);
  const [novoForm, setNovoForm] = useState<PrecificacaoForm>({ codigo:"", descricao:"", empresa:"01", revisoes:0, dataCadastro:new Date().toISOString().slice(0,10) });
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [cliente, setCliente] = useState("");
  const [tabelaVenda, setTabelaVenda] = useState("");
  const [tipoFrete, setTipoFrete] = useState("");
  const [condPagto, setCondPagto] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const [valorFrete, setValorFrete] = useState("0");
  const [valorSeguro, setValorSeguro] = useState("0");
  const [comissaoPadrao, setComissaoPadrao] = useState("5");
  const [prazoMedio] = useState("30");

  function toggleSelectAll() {
    const newVal = !selectAll;
    setSelectAll(newVal);
    setItens(p => p.map(i => ({ ...i, selected: newVal })));
  }
  function toggleItem(linha: number) {
    setItens(p => p.map(i => i.linha === linha ? { ...i, selected: !i.selected } : i));
    setSelectAll(false);
  }

  async function handleSalvarPrecificacao() {
    setIsSaving(true);
    try {
      await new Promise(r => setTimeout(r, 500));
      const newP: PrecificacaoForm = { ...novoForm, codigo: `PR${String(precificacoes.length + 1).padStart(4, "0")}`, revisoes:1, dataCadastro:new Date().toISOString().slice(0,10) };
      setPrecificacoes(p => [...p, newP]);
      setSelectedPrecif(newP);
      setAbaAtiva("revisoes");
      setFeedback({ type: "success", message: "Precificação criada com sucesso." });
      setNovoForm({ codigo:"", descricao:"", empresa:"01", revisoes:0, dataCadastro:new Date().toISOString().slice(0,10) });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Falha ao salvar.") });
    } finally { setIsSaving(false); }
  }

  async function handleCalcular() {
    setIsSaving(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      setFeedback({ type: "success", message: "Cálculo executado com sucesso." });
      setRevisaoForm(p => ({ ...p, ultimoCalculo: new Date().toLocaleString() }));
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Falha no cálculo.") });
    } finally { setIsSaving(false); }
  }

  async function handleGerarPedido() {
    const selected = itens.filter(i => i.selected);
    if (selected.length === 0) { setFeedback({ type: "error", message: "Selecione ao menos um item." }); return; }
    setIsSaving(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      setFeedback({ type: "success", message: `Pedido gerado com ${selected.length} item(ns).` });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Falha ao gerar pedido.") });
    } finally { setIsSaving(false); }
  }

  function openRevisoes(precif: PrecificacaoForm) {
    setSelectedPrecif(precif);
    setRevisaoForm({ codigo:"REV001", descricao:precif.descricao, dataCadastro:precif.dataCadastro, dataValidade:"31/12/2026", ultimaAlteracao:"", ultimoCalculo:"", situacao:"Aberta", observacoes:"" });
    setAbaAtiva("revisoes");
  }

  const totalBruto = itens.reduce((s,i) => s + i.precoVenda * i.quantidade, 0);
  const totalMargem = itens.reduce((s,i) => s + (i.precoVenda - i.custo) * i.quantidade, 0);
  const selectedCount = itens.filter(i => i.selected).length;

  const ABAS: { id: AbaAtiva; label: string }[] = [
    { id: "precificacoes", label: "Precificações" },
    { id: "revisoes", label: `Revisões${selectedPrecif ? " (1)" : ""}` },
    { id: "dadosGerais", label: "Dados Gerais" },
    { id: "itens", label: `Itens (${selectedCount})` },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .cs-r{min-height:100vh;background:#f0f4ee;font-family:'Inter',sans-serif;color:#1a2e22;display:flex;flex-direction:column}

        .cs-tb{height:52px;background:#162e20;display:flex;align-items:center;justify-content:space-between;padding:0 20px;flex-shrink:0;border-bottom:1px solid rgba(62,150,84,0.15)}
        .cs-tbl{display:flex;align-items:center;gap:10px}
        .cs-lg{width:28px;height:28px;background:#3e9654;border-radius:6px;display:flex;align-items:center;justify-content:center}
        .cs-an{font-size:13px;font-weight:600;color:#e0f0e3;line-height:1.1}
        .cs-asb{display:block;font-size:9px;font-weight:400;color:#3d6b4d}
        .cs-st{font-size:12.5px;font-weight:500;color:#5a9a6a;padding-left:14px;margin-left:14px;border-left:1px solid rgba(255,255,255,0.08)}

        .cs-ab{background:#fff;border-bottom:1px solid #dbe8d5;padding:0 20px;display:flex;align-items:center;gap:4px;height:46px;flex-shrink:0}
        .cs-ag{display:flex;align-items:center;gap:4px;padding-right:12px;margin-right:8px;border-right:1px solid #e8f0e4}
        .cs-ag:last-child{border-right:none}
        .cs-al{font-size:9.5px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#96b8a0;margin-right:4px;white-space:nowrap}
        .cs-bt{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border:1.5px solid transparent;border-radius:7px;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background 0.13s,border-color 0.13s,color 0.13s}
        .cs-bt-p{background:#162e20;color:#dff0e2;border-color:#162e20}
        .cs-bt-p:hover:not(:disabled){background:#1e3a2a}
        .cs-bt-p:disabled{opacity:0.5;cursor:not-allowed}
        .cs-bt-g{background:transparent;color:#4a7060;border-color:#d4e8d0}
        .cs-bt-g:hover:not(:disabled){background:#f0f8ec;border-color:#b0d4b8;color:#1a3828}
        .cs-bt-g:disabled{opacity:0.5;cursor:not-allowed}
        .cs-bt-d{background:transparent;color:#b94040;border-color:#f0c8c8}
        .cs-bt-d:hover:not(:disabled){background:#fff0f0;border-color:#e09090}
        .cs-bt-s{height:28px;padding:0 9px;font-size:12px}
        .cs-bt-n{background:#eef9f0;color:#1a6030;border-color:#b4d8b8;font-weight:600}
        .cs-bt-n:hover:not(:disabled){background:#dff5e4;border-color:#88c898}

        .cs-by{flex:1;padding:16px 20px;display:flex;flex-direction:column;gap:0;overflow-y:auto}
        .cs-by::-webkit-scrollbar{width:5px}
        .cs-by::-webkit-scrollbar-thumb{background:#cce0c8;border-radius:4px}

        .cs-sb{display:flex;align-items:center;gap:10px;padding:14px 0 8px}
        .cs-sb:first-child{padding-top:0}
        .cs-sb-p{font-size:9.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#5a8068;background:#e0ede0;border:1px solid #c8dcc8;border-radius:20px;padding:3px 10px;white-space:nowrap}
        .cs-sb-l{flex:1;height:1px;background:#dbe8d5}
        .cs-sb-h{font-size:11px;color:#96b8a0;white-space:nowrap}

        .cs-c{background:#fff;border:1px solid #dbe8d5;border-radius:12px;overflow:hidden;margin-bottom:14px}
        .cs-ch{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid #edf5e8;background:#fafcf9}
        .cs-chl{display:flex;align-items:center;gap:8px}
        .cs-ct{font-size:12px;font-weight:600;color:#2a4a35;text-transform:uppercase;letter-spacing:0.6px}
        .cs-cbg{font-size:10.5px;font-weight:500;color:#3e9654;background:#eef5ea;border:1px solid #c4dfc8;border-radius:12px;padding:2px 8px}
        .cs-cb{padding:18px 18px}

        .cs-g{display:grid;grid-template-columns:repeat(12,1fr);gap:16px 14px;align-items:start}
        .cs-g2{grid-column:span 2}
        .cs-g3{grid-column:span 3}
        .cs-g4{grid-column:span 4}
        .cs-g5{grid-column:span 5}
        .cs-g6{grid-column:span 6}
        .cs-g7{grid-column:span 7}
        .cs-g8{grid-column:span 8}
        .cs-g10{grid-column:span 10}
        .cs-g12{grid-column:span 12}

        .cs-f{display:flex;flex-direction:column;gap:5px}
        .cs-l{font-size:10.5px;font-weight:600;color:#5a8068;text-transform:uppercase;letter-spacing:0.4px;display:flex;align-items:center;gap:4px}
        .cs-lr{color:#c84040;font-size:12px;line-height:1}
        .cs-in{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;transition:border-color 0.13s,box-shadow 0.13s}
        .cs-in:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .cs-in::placeholder{color:#b0c8b8;font-size:12px}
        .cs-in:disabled{background:#f0f4ee;color:#8aaa94;cursor:not-allowed;border-color:#e0ead8}
        .cs-in.has-e{border-color:#e05252;box-shadow:0 0 0 2px rgba(224,82,82,0.1)}
        .cs-se{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 28px 0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;transition:border-color 0.13s}
        .cs-se:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .cs-fe{font-size:11px;color:#c84040;margin-top:2px;display:flex;align-items:center;gap:4px}
        .cs-fh{font-size:11px;color:#7a9c84;margin-top:2px;line-height:1.45}

        .cs-rw{border-top:1px solid #edf5e8;overflow-x:auto}
        .cs-rb{display:flex;align-items:center;justify-content:space-between;padding:10px 18px;background:#f4f9f2;border-bottom:1px solid #e8f0e4}
        .cs-rbl{display:flex;align-items:center;gap:8px}
        .cs-rbl-l{font-size:11px;font-weight:600;color:#4a7060;text-transform:uppercase;letter-spacing:0.5px}
        .cs-rt{width:100%;border-collapse:collapse;font-size:13px}
        .cs-rt th{background:#f4f9f2;padding:8px 12px;text-align:left;font-size:10.5px;font-weight:700;color:#5a8068;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1.5px solid #dbe8d5;white-space:nowrap}
        .cs-rt td{padding:9px 12px;border-bottom:1px solid #f0f6ec;color:#243830;vertical-align:middle}
        .cs-rt tbody tr{transition:background 0.1s}
        .cs-rt tbody tr:hover{background:#f4fbf2}
        .cs-rt tbody tr.cs-selected{background:#f0faf2}
        .cs-rem{text-align:center;padding:28px 12px;color:#96b8a0;font-size:12.5px}

        .cs-fb{display:flex;align-items:center;gap:9px;padding:11px 15px;border-radius:9px;font-size:13px;animation:csFdIn 0.2s ease;margin-bottom:14px}
        .cs-fb.s{background:#f0faf2;border:1px solid #b4dec0;color:#1e6030}
        .cs-fb.e{background:#fff5f5;border:1px solid #f8c0c0;border-left:3px solid #e05252;color:#b91c1c}
        .cs-fb.i{background:#f0f8ff;border:1px solid #c7def8;border-left:3px solid #4a90d9;color:#1a4070}

        .cs-ft{background:#fff;border-top:1px solid #dbe8d5;padding:8px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .cs-ftl{display:flex;align-items:center;gap:20px}
        .cs-fts{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#6a8a74}
        .cs-fts strong{color:#1a2e22;font-weight:600}

        .cs-ts{display:flex;align-items:flex-end;gap:0;border-bottom:2px solid #dbe8d5;background:#fafcf9}
        .cs-tab{padding:10px 20px;font-size:12.5px;font-weight:500;color:#6a8a74;cursor:pointer;border:none;background:transparent;border-bottom:2px solid transparent;margin-bottom:-2px;transition:color 0.13s,border-color 0.13s;white-space:nowrap;font-family:'Inter',sans-serif}
        .cs-tab:hover{color:#2a4a35}
        .cs-tab.active{color:#162e20;border-bottom-color:#3e9654;font-weight:600}
        .cs-tab:disabled{opacity:0.4;cursor:not-allowed}
        .cs-tby{padding:20px 18px}

        .cs-md{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:#e8f5e0;color:#1e5818;border:1px solid #a8d898}
        .cs-me{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:#fff8e0;color:#7a5200;border:1px solid #e0c860}
        .cs-md-d{width:6px;height:6px;border-radius:50%;flex-shrink:0}
        .cs-md .cs-md-d{background:#3e9654}
        .cs-me .cs-md-d{background:#c8a020}

        .cs-tt{display:flex;gap:24px;flex-wrap:wrap;padding:12px 18px;background:#f4f9f2;border-top:1px solid #dbe8d5}
        .cs-tti{display:flex;flex-direction:column;gap:2px}
        .cs-tti span:first-child{font-size:10.5px;color:#7a9c84;text-transform:uppercase;letter-spacing:0.4px;font-weight:600}
        .cs-tti span:last-child{font-size:15px;font-weight:700;color:#1a2e22}

        .cs-cb2{background:#f4f9f2;border:1px solid #dbe8d5;border-radius:7px;padding:4px 10px;font-size:11px;color:#1a2e22;display:inline-flex;align-items:center;gap:6px}

        @keyframes csSpin{to{transform:rotate(360deg)}}
        .cs-sp{width:14px;height:14px;flex-shrink:0;border:2px solid rgba(223,240,226,0.3);border-top-color:#dff0e2;border-radius:50%;animation:csSpin 0.65s linear infinite}
        .cs-spd{width:14px;height:14px;flex-shrink:0;border:2px solid #d4e8cc;border-top-color:#3e9654;border-radius:50%;animation:csSpin 0.65s linear infinite}
        @keyframes csFdIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className="cs-r">
        <header className="cs-tb">
          <div className="cs-tbl">
            <div className="cs-lg">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="cs-an">Venture<span className="cs-asb">ERP &amp; Soluções</span></span>
            <span className="cs-st">VCST0202 — Precificação de Produtos</span>
          </div>
        </header>

        <div className="cs-ab">
          {abaAtiva === "precificacoes" && (
            <div className="cs-ag">
              <span className="cs-al">Precificação</span>
              <button className="cs-bt cs-bt-n" onClick={handleSalvarPrecificacao} disabled={isSaving || !novoForm.descricao}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                Criar Precificação
              </button>
            </div>
          )}
          {abaAtiva === "revisoes" && (
            <div className="cs-ag">
              <span className="cs-al">Revisão</span>
              <button className="cs-bt cs-bt-p" onClick={handleCalcular} disabled={isSaving}>
                {isSaving ? <><div className="cs-sp" />Calculando...</> : "Calcular"}
              </button>
              <button className="cs-bt cs-bt-g" onClick={() => setAbaAtiva("dadosGerais")}>Dados Gerais</button>
              <button className="cs-bt cs-bt-g" onClick={() => setAbaAtiva("itens")}>Itens</button>
            </div>
          )}
          {(abaAtiva === "itens" || abaAtiva === "dadosGerais") && (
            <>
              <div className="cs-ag">
                <span className="cs-al">Operação</span>
                <button className="cs-bt cs-bt-p" onClick={handleGerarPedido} disabled={isSaving || selectedCount === 0}>
                  {isSaving ? <><div className="cs-sp" />Gerando...</> : <>Gerar Pedido ({selectedCount})</>}
                </button>
              </div>
              <div className="cs-ag">
                <span className="cs-al">Ações</span>
                <button className="cs-bt cs-bt-g" onClick={handleCalcular} disabled={isSaving}>Calcular</button>
              </div>
            </>
          )}
          <div className="cs-ag">
            <button className="cs-bt cs-bt-g">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>Ajuda
            </button>
          </div>
        </div>

        <div className="cs-by">
          {feedback && (
            <div className={`cs-fb ${feedback.type === "success" ? "s" : feedback.type === "error" ? "e" : "i"}`}>
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

          <div className="cs-sb">
            <span className="cs-sb-p">Precificação</span>
            <div className="cs-sb-l" />
            <span className="cs-sb-h">{abaAtiva === "precificacoes" ? "Crie ou selecione uma precificação" : abaAtiva === "revisoes" ? "Gerencie as revisões" : abaAtiva === "dadosGerais" ? "Configure dados gerais" : `Selecione itens (${selectedCount})`}</span>
          </div>

          <div className="cs-c">
            <div className="cs-ch">
              <div className="cs-chl">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round"/><path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round"/></svg>
                <span className="cs-ct">Precificação de Produtos</span>
              </div>
              <span className="cs-cbg">{precificacoes.length} precificação(ões)</span>
            </div>

            <div className="cs-ts">
              {ABAS.map(aba => (
                <button
                  key={aba.id}
                  className={`cs-tab${abaAtiva === aba.id ? " active" : ""}`}
                  onClick={() => setAbaAtiva(aba.id)}
                  disabled={aba.id === "revisoes" && !selectedPrecif}
                >
                  {aba.label}
                </button>
              ))}
            </div>

            {/* ABa: Precificações */}
            {abaAtiva === "precificacoes" && (
              <div className="cs-tby">
                <div className="cs-g" style={{marginBottom:18}}>
                  <div className="cs-f cs-g6">
                    <label className="cs-l">Descrição</label>
                    <input className="cs-in" value={novoForm.descricao} onChange={e => setNovoForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Descreva a precificação..."/>
                  </div>
                  <div className="cs-f cs-g2">
                    <label className="cs-l">Empresa</label>
                    <input className="cs-in" value={novoForm.empresa} onChange={e => setNovoForm(p => ({ ...p, empresa: e.target.value }))}/>
                  </div>
                </div>

                <div className="cs-rw">
                  <div className="cs-rb">
                    <div className="cs-rbl">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round"/></svg>
                      <span className="cs-rbl-l">Precificações Cadastradas</span>
                    </div>
                  </div>
                  {precificacoes.length === 0 ? (
                    <div className="cs-rem">Nenhuma precificação cadastrada.</div>
                  ) : (
                    <table className="cs-rt">
                      <thead>
                        <tr>
                          <th style={{width:100}}>Código</th><th>Descrição</th><th style={{width:100}}>Empresa</th>
                          <th style={{width:90}}>Revisões</th><th style={{width:120}}>Data Cadastro</th><th style={{width:100}}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {precificacoes.map(p => (
                          <tr key={p.codigo}>
                            <td style={{fontWeight:600,color:"#1a4a2a"}}>{p.codigo}</td><td>{p.descricao}</td>
                            <td>{p.empresa}</td><td>{p.revisoes}</td><td style={{fontSize:12}}>{p.dataCadastro}</td>
                            <td>
                              <button className="cs-bt cs-bt-s cs-bt-g" onClick={() => openRevisoes(p)}>
                                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M1.5 8v2.5H4l7-7L8.5 1l-7 7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                                Abrir
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* ABa: Revisões */}
            {abaAtiva === "revisoes" && selectedPrecif && (
              <div className="cs-tby">
                <div style={{marginBottom:14}}>
                  <span className="cs-cb2">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#3e9654" strokeWidth="1.2"/></svg>
                    {selectedPrecif.codigo}: {selectedPrecif.descricao}
                  </span>
                </div>
                <div className="cs-g">
                  <div className="cs-f cs-g2">
                    <label className="cs-l">Código Revisão</label>
                    <input className="cs-in" value={revisaoForm.codigo} onChange={e => setRevisaoForm(p => ({ ...p, codigo: e.target.value }))}/>
                  </div>
                  <div className="cs-f cs-g6">
                    <label className="cs-l">Descrição</label>
                    <input className="cs-in" value={revisaoForm.descricao} onChange={e => setRevisaoForm(p => ({ ...p, descricao: e.target.value }))}/>
                  </div>
                  <div className="cs-f cs-g2">
                    <label className="cs-l">Situação</label>
                    <select className="cs-se" value={revisaoForm.situacao} onChange={e => setRevisaoForm(p => ({ ...p, situacao: e.target.value }))}>
                      {SITUACAO_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="cs-f cs-g2">
                    <label className="cs-l">Data Validade</label>
                    <input type="date" className="cs-in" value={revisaoForm.dataValidade} onChange={e => setRevisaoForm(p => ({ ...p, dataValidade: e.target.value }))}/>
                  </div>
                  <div className="cs-f cs-g2">
                    <label className="cs-l">Data Cadastro</label>
                    <input className="cs-in" value={revisaoForm.dataCadastro} disabled/>
                  </div>
                  <div className="cs-f cs-g2">
                    <label className="cs-l">Último Cálculo</label>
                    <input className="cs-in" value={revisaoForm.ultimoCalculo} disabled/>
                  </div>
                  <div className="cs-f cs-g2">
                    <label className="cs-l">Última Alteração</label>
                    <input className="cs-in" value={revisaoForm.ultimaAlteracao} onChange={e => setRevisaoForm(p => ({ ...p, ultimaAlteracao: e.target.value }))} placeholder="Data/hora"/>
                  </div>
                  <div className="cs-f cs-g6">
                    <label className="cs-l">Observações</label>
                    <input className="cs-in" value={revisaoForm.observacoes} onChange={e => setRevisaoForm(p => ({ ...p, observacoes: e.target.value }))}/>
                  </div>
                </div>
              </div>
            )}

            {/* ABa: Dados Gerais */}
            {abaAtiva === "dadosGerais" && (
              <div className="cs-tby">
                <div className="cs-g">
                  <div className="cs-f cs-g3">
                    <label className="cs-l">Cliente</label>
                    <input className="cs-in" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Código"/>
                  </div>
                  <div className="cs-f cs-g3">
                    <label className="cs-l">Tabela de Venda</label>
                    <input className="cs-in" value={tabelaVenda} onChange={e => setTabelaVenda(e.target.value)} placeholder="Código"/>
                  </div>
                  <div className="cs-f cs-g3">
                    <label className="cs-l">Tipo de Frete</label>
                    <select className="cs-se" value={tipoFrete} onChange={e => setTipoFrete(e.target.value)}>
                      <option value="">Selecione...</option>
                      {TIPO_FRETE.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="cs-f cs-g3">
                    <label className="cs-l">Cond. Pagamento</label>
                    <input className="cs-in" value={condPagto} onChange={e => setCondPagto(e.target.value)} placeholder="Código"/>
                  </div>
                  <div className="cs-f cs-g2">
                    <label className="cs-l">Valor Frete (R$)</label>
                    <input type="number" step="0.01" className="cs-in" value={valorFrete} onChange={e => setValorFrete(e.target.value)}/>
                  </div>
                  <div className="cs-f cs-g2">
                    <label className="cs-l">Valor Seguro (R$)</label>
                    <input type="number" step="0.01" className="cs-in" value={valorSeguro} onChange={e => setValorSeguro(e.target.value)}/>
                  </div>
                  <div className="cs-f cs-g2">
                    <label className="cs-l">Comissão Padrão (%)</label>
                    <input type="number" step="0.01" className="cs-in" value={comissaoPadrao} onChange={e => setComissaoPadrao(e.target.value)}/>
                  </div>
                  <div className="cs-f cs-g2">
                    <label className="cs-l">Prazo Médio (dias)</label>
                    <input className="cs-in" value={prazoMedio} disabled/>
                  </div>
                </div>
              </div>
            )}

            {/* ABa: Itens */}
            {abaAtiva === "itens" && (
              <div className="cs-tby" style={{padding:0}}>
                <div className="cs-rw">
                  <div className="cs-rb">
                    <div className="cs-rbl">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round"/></svg>
                      <span className="cs-rbl-l">Itens da Precificação</span>
                      <span className="cs-cbg">{itens.length} item(ns)</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} style={{width:16,height:16,cursor:"pointer",accentColor:"#3e9654"}}/>
                      <span style={{fontSize:12,color:"#4a7060"}}>Selecionar Todos</span>
                    </div>
                  </div>
                  {itens.length === 0 ? (
                    <div className="cs-rem">Nenhum item na precificação.</div>
                  ) : (
                    <table className="cs-rt">
                      <thead>
                        <tr>
                          <th style={{width:40}}>Sel</th><th style={{width:60}}>Linha</th><th style={{width:100}}>Código</th><th>Descrição</th>
                          <th style={{width:100}}>Máscara</th><th style={{width:70}}>Qtd</th><th style={{width:130}}>Preço Venda (R$)</th>
                          <th style={{width:110}}>Custo (R$)</th><th style={{width:100}}>Margem (%)</th><th style={{width:140}}>Total Bruto (R$)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itens.map(item => (
                          <tr key={item.linha} className={item.selected ? "cs-selected" : ""}>
                            <td><input type="checkbox" checked={item.selected} onChange={() => toggleItem(item.linha)} style={{width:16,height:16,cursor:"pointer",accentColor:"#3e9654"}}/></td>
                            <td style={{color:"#96b8a0",fontSize:12}}>{item.linha}</td>
                            <td style={{fontWeight:600}}>{item.codigo}</td><td>{item.descricao}</td>
                            <td style={{color:item.mascaraId?"#243830":"#96b8a0"}}>{item.mascaraId || "—"}</td>
                            <td>{item.quantidade}</td><td>R$ {item.precoVenda.toFixed(2)}</td>
                            <td>R$ {item.custo.toFixed(2)}</td>
                            <td style={{fontWeight:600,color:"#2a6a3a"}}>{item.margem.toFixed(1)}%</td>
                            <td>R$ {(item.precoVenda * item.quantidade).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="cs-tt">
                  <div className="cs-tti"><span>Total Bruto</span><span>R$ {totalBruto.toFixed(2)}</span></div>
                  <div className="cs-tti"><span>Margem Total (R$)</span><span>R$ {totalMargem.toFixed(2)}</span></div>
                  <div className="cs-tti"><span>Margem (%)</span><span>{totalBruto > 0 ? ((totalMargem / totalBruto) * 100).toFixed(1) : 0}%</span></div>
                  <div className="cs-tti"><span>Selecionados</span><span>{selectedCount} itens</span></div>
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="cs-ft">
          <div className="cs-ftl">
            <div className="cs-fts">Precificações: <strong>{precificacoes.length}</strong></div>
            <div className="cs-fts">Itens: <strong>{itens.length}</strong></div>
            <div className="cs-fts">Selecionados: <strong>{selectedCount}</strong></div>
            <div className="cs-fts">Módulo: <strong>Custos</strong></div>
          </div>
          <div className="cs-fts" style={{gap:8}}>
            <span style={{color:"#b0c8b8",fontSize:11}}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>
      </div>
    </>
  );
}

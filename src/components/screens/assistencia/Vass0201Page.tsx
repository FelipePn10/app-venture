import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChamadoForm {
  chamado: string; data: string; cliente: string; clienteNome: string;
  estabFatura: string; estabFaturaNome: string; assTecnico: string; assTecnicoNome: string;
  tipo: string; motivo: string; solucao: string; status: string; fechado: boolean;
}
interface ChamadoItem {
  id: number; item: string; itemDesc: string; nfs: string; nfe: string; nfRevenda: string;
  dataNF: string; loteSerieFilho: string; loteSeriePai: string; quantidade: number; valor: number;
  motivoDefeitoAlegado: string; defeitoAlegado: string; motivoDefeitoConstatado: string;
  defeitoConstatado: string; observacao: string; itemPai: string; mascara: string;
}
type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

const STATUS_CHAMADO = ["Pendente","Atendido por Pedido","Atendido por Pedido Pendente NFE","Atendido por Pedido NFE","Atendido Manual"];
const TIPOS = ["Garantia","Fora de Garantia","Troca","Conserto","Revisão","Recall"];
const MOTIVOS = ["Defeito de Fabricação","Mau Uso","Desgaste Natural","Instalação Incorreta","Transporte","Outros"];

const formInicial: ChamadoForm = {
  chamado:"",data:new Date().toISOString().slice(0,10),cliente:"",clienteNome:"",
  estabFatura:"",estabFaturaNome:"",assTecnico:"",assTecnicoNome:"",
  tipo:"",motivo:"",solucao:"",status:"Pendente",fechado:false,
};

function normalizeError(e: unknown, fb: string): string {
  if (e && typeof e==="object" && "response" in e) {
    const r = (e as any).response; if (r?.data?.message) return String(r.data.message);
  }
  return e instanceof Error ? e.message : fb;
}

export function Vass0201Page(): JSX.Element {
  const [form, setForm] = useState<ChamadoForm>(formInicial);
  const [errors, setErrors] = useState<Partial<Record<keyof ChamadoForm,string>>>({});
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showItens, setShowItens] = useState(false);
  const [itens, setItens] = useState<ChamadoItem[]>([]);
  const [selItem, setSelItem] = useState<number|null>(null);

  const setF = useCallback(<K extends keyof ChamadoForm>(k:K, v:ChamadoForm[K])=>{
    setForm(p=>{
      const n={...p,[k]:v};
      if(k==="motivo" && v && n.status==="Pendente") n.status="Atendido Manual";
      return n;
    });
    setErrors(p=>({...p,[k]:undefined})); setFeedback(null);
  },[]);

  const motivoBloq = ["Atendido por Pedido","Atendido por Pedido Pendente NFE","Atendido por Pedido NFE"].includes(form.status);
  const fechadoOk = form.status!=="Pendente";

  function val(): boolean {
    const e: any={}; if(!form.cliente.trim()) e.cliente="Campo obrigatório."; if(!form.tipo.trim()) e.tipo="Campo obrigatório.";
    setErrors(e); return Object.keys(e).length===0;
  }
  async function salvar() { if(!val()) return; setIsSaving(true); setFeedback(null); try { await new Promise(r=>setTimeout(r,800)); setFeedback({type:"success",message:"Chamado salvo com sucesso."}); if(!form.chamado) setF("chamado",String(Math.floor(Math.random()*90000)+10000)); } catch(err){ setFeedback({type:"error",message:normalizeError(err,"Falha.")}); } finally { setIsSaving(false); } }
  function novo() { setForm(formInicial); setItens([]); setErrors({}); setFeedback(null); setShowItens(false); }
  function addItem() { const ni:ChamadoItem={id:Date.now(),item:"",itemDesc:"",nfs:"",nfe:"",nfRevenda:"",dataNF:"",loteSerieFilho:"",loteSeriePai:"",quantidade:1,valor:0,motivoDefeitoAlegado:form.motivo,defeitoAlegado:"",motivoDefeitoConstatado:"",defeitoConstatado:"",observacao:"",itemPai:"",mascara:""}; setItens(p=>[...p,ni]); setSelItem(itens.length); }
  function updItem(i:number,k:keyof ChamadoItem,v:any){ setItens(p=>p.map((it,x)=>x===i?{...it,[k]:v}:it)); }
  function delItem(i:number){ setItens(p=>p.filter((_,x)=>x!==i)); setSelItem(null); }

  return (<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      .r{min-height:100vh;background:#f0f4ee;font-family:'Inter',sans-serif;color:#1a2e22;display:flex;flex-direction:column}
      .tb{height:52px;background:#162e20;display:flex;align-items:center;justify-content:space-between;padding:0 20px;flex-shrink:0;border-bottom:1px solid rgba(62,150,84,0.15)}
      .tbl{display:flex;align-items:center;gap:10px}
      .lm{width:28px;height:28px;background:#3e9654;border-radius:6px;display:flex;align-items:center;justify-content:center}
      .an{font-size:13px;font-weight:600;color:#e0f0e3;line-height:1.1}
      .as{display:block;font-size:9px;font-weight:400;color:#3d6b4d}
      .st{font-size:12.5px;font-weight:500;color:#5a9a6a;padding-left:14px;margin-left:14px;border-left:1px solid rgba(255,255,255,0.08)}
      .ab{background:#fff;border-bottom:1px solid #dbe8d5;padding:0 20px;display:flex;align-items:center;gap:4px;height:46px;flex-shrink:0}
      .ag{display:flex;align-items:center;gap:4px;padding-right:12px;margin-right:8px;border-right:1px solid #e8f0e4}
      .ag:last-child{border-right:none}
      .al{font-size:9.5px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#96b8a0;margin-right:4px;white-space:nowrap}
      .bt{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border:1.5px solid transparent;border-radius:7px;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background .13s,border-color .13s}
      .bt-p{background:#162e20;color:#dff0e2;border-color:#162e20}.bt-p:hover:not(:disabled){background:#1e3a2a}.bt-p:disabled{opacity:.5;cursor:not-allowed}
      .bt-g{background:transparent;color:#4a7060;border-color:#d4e8d0}.bt-g:hover:not(:disabled){background:#f0f8ec;border-color:#b0d4b8;color:#1a3828}.bt-g:disabled{opacity:.5;cursor:not-allowed}
      .bt-d{background:transparent;color:#b94040;border-color:#f0c8c8}.bt-d:hover:not(:disabled){background:#fff0f0;border-color:#e09090}
      .bt-n{background:#eef9f0;color:#1a6030;border-color:#b4d8b8;font-weight:600}.bt-n:hover:not(:disabled){background:#dff5e4;border-color:#88c898}
      .bd{flex:1;padding:16px 20px;display:flex;flex-direction:column;gap:0;overflow-y:auto}
      .sb{display:flex;align-items:center;gap:10px;padding:14px 0 8px}.sb:first-child{padding-top:0}
      .sb-p{font-size:9.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#5a8068;background:#e0ede0;border:1px solid #c8dcc8;border-radius:20px;padding:3px 10px;white-space:nowrap}
      .sb-l{flex:1;height:1px;background:#dbe8d5}.sb-h{font-size:11px;color:#96b8a0;white-space:nowrap}
      .c{background:#fff;border:1px solid #dbe8d5;border-radius:12px;overflow:hidden;margin-bottom:14px}
      .ch{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid #edf5e8;background:#fafcf9}
      .chl{display:flex;align-items:center;gap:8px}.cht{font-size:12px;font-weight:600;color:#2a4a35;text-transform:uppercase;letter-spacing:0.6px}
      .cb{padding:18px}
      .g{display:grid;grid-template-columns:repeat(12,1fr);gap:16px 14px;align-items:start}
      .g2{grid-column:span 2}.g3{grid-column:span 3}.g4{grid-column:span 4}.g5{grid-column:span 5}.g6{grid-column:span 6}.g8{grid-column:span 8}.g10{grid-column:span 10}.g12{grid-column:span 12}
      .f{display:flex;flex-direction:column;gap:5px}
      .l{font-size:10.5px;font-weight:600;color:#5a8068;text-transform:uppercase;letter-spacing:0.4px;display:flex;align-items:center;gap:4px}
      .lr{color:#c84040;font-size:12px;line-height:1}
      .in{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;transition:border-color .13s}
      .in:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}.in:disabled{background:#f0f4ee;color:#8aaa94;cursor:not-allowed;border-color:#e0ead8}
      .in-err{border-color:#e05252;box-shadow:0 0 0 2px rgba(224,82,82,0.1)}
      .se{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 28px 0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center}.se:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
      .er{font-size:11px;color:#c84040;margin-top:2px;display:flex;align-items:center;gap:4px}
      .hi{font-size:11px;color:#7a9c84;margin-top:2px;line-height:1.45}
      .fb{display:flex;align-items:center;gap:9px;padding:11px 15px;border-radius:9px;font-size:13px;animation:fade .2s ease;margin-bottom:14px}
      .fb.success{background:#f0faf2;border:1px solid #b4dec0;color:#1e6030}.fb.error{background:#fff5f5;border:1px solid #f8c0c0;border-left:3px solid #e05252;color:#b91c1c}.fb.info{background:#f0f8ff;border:1px solid #c7def8;border-left:3px solid #4a90d9;color:#1a4070}
      .ft{background:#fff;border-top:1px solid #dbe8d5;padding:8px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;font-size:11.5px;color:#6a8a74}
      .tgl-row{display:flex;align-items:center;gap:10px;padding-top:2px}
      .tgl{position:relative;width:38px;height:20px;cursor:pointer}.tgl input{opacity:0;width:0;height:0;position:absolute}
      .tgl-tr{position:absolute;inset:0;background:#d4e0d0;border-radius:20px;transition:background .2s}
      .tgl input:checked~.tgl-tr{background:#3e9654}
      .tgl-th{position:absolute;top:3px;left:3px;width:14px;height:14px;background:#fff;border-radius:50%;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.15)}
      .tgl input:checked~.tgl-th{transform:translateX(18px)}
      .tgl-l{font-size:13px;color:#3a5a45;font-weight:500}
      .ovl{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:100;display:flex;justify-content:center;align-items:center}
      .mod{background:#fff;border-radius:12px;width:95%;max-width:1000px;max-height:85vh;overflow-y:auto;box-shadow:0 10px 40px rgba(0,0,0,.15)}
      .mh{background:#fafcf9;padding:12px 18px;border-bottom:1px solid #dbe8d5;display:flex;justify-content:space-between;align-items:center}
      .mht{font-size:13px;font-weight:600;color:#2a4a35}
      .mb{padding:18px}
      .tb-r{width:100%;border-collapse:collapse;font-size:13px}
      .tb-r th{background:#f4f9f2;padding:8px 10px;text-align:left;font-size:10.5px;font-weight:700;color:#5a8068;text-transform:uppercase;letter-spacing:.5px;border-bottom:1.5px solid #dbe8d5;white-space:nowrap}
      .tb-r td{padding:8px 10px;border-bottom:1px solid #f0f6ec;color:#243830}
      .tb-r tr{cursor:pointer;transition:background .1s}.tb-r tr:hover{background:#eef9f0}
      .tb-r tr.sel{background:#f0f8ea;border-left:3px solid #3e9654}
      .bt-sm{height:28px;padding:0 9px;font-size:12px;border-radius:6px;border:1.5px solid transparent;font-family:'Inter',sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-weight:500}
      @keyframes fade{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      @keyframes spin{to{transform:rotate(360deg)}}
      .sp{width:14px;height:14px;border:2px solid rgba(223,240,226,.3);border-top-color:#dff0e2;border-radius:50%;animation:spin .65s linear infinite}
      .sp-d{width:14px;height:14px;border:2px solid #d4e8cc;border-top-color:#3e9654;border-radius:50%;animation:spin .65s linear infinite}
    `}</style>
    <div className="r">
      <header className="tb"><div className="tbl"><div className="lm"><svg width="15" height="15" viewBox="0 0 18 18" fill="none"><rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,.9)"/><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,.4)"/><rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,.4)"/><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,.7)"/></svg></div><span className="an">Venture<span className="as">ERP &amp; Soluções</span></span><span className="st">VASS0201 — Cadastro de Chamado de Assistência</span></div></header>
      <div className="ab">
        <div className="ag"><span className="al">Chamado</span><button className="bt bt-n" onClick={novo} disabled={isSaving}><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>Novo</button></div>
        <div className="ag"><span className="al">Ações</span><button className="bt bt-p" onClick={salvar} disabled={isSaving}>{isSaving?<><div className="sp"/>Salvando...</>:<><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>Salvar</>}</button></div>
        <div className="ag"><button className="bt bt-g" onClick={()=>setShowItens(true)}><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>Itens ({itens.length})</button></div>
        <div className="ag"><button className="bt bt-g" onClick={()=>setFeedback({type:"info",message:"E-mail: Cliente notificado com sucesso."})}>E-mail</button><button className="bt bt-g" onClick={()=>setFeedback({type:"info",message:"Consulta Comercial aberta."})}>Consulta Comercial</button></div>
      </div>
      <div className="bd">
        {feedback && <div className={`fb ${feedback.type}`}>{feedback.message}</div>}
        <div className="sb"><span className="sb-p">1 — Dados do Chamado</span><div className="sb-l"/></div>
        <div className="c">
          <div className="ch"><div className="chl"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round"/><path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round"/></svg><span className="cht">Chamado</span></div></div>
          <div className="cb"><div className="g">
            <div className="f g2"><label className="l">Chamado</label><input className="in" value={form.chamado} onChange={e=>setF("chamado",e.target.value)} placeholder="Automático"/></div>
            <div className="f g2"><label className="l">Data</label><input className="in" type="date" value={form.data} onChange={e=>setF("data",e.target.value)}/></div>
            <div className="f g2"><label className="l">Cliente <span className="lr">*</span></label><input className={`in${errors.cliente?' in-err':''}`} value={form.cliente} onChange={e=>setF("cliente",e.target.value)} placeholder="Código"/>{errors.cliente&&<span className="er">{errors.cliente}</span>}</div>
            <div className="f g2"><label className="l">Nome Cliente</label><input className="in" value={form.clienteNome} onChange={e=>setF("clienteNome",e.target.value)} disabled/></div>
            <div className="f g2"><label className="l">Estab. Fatura</label><input className="in" value={form.estabFatura} onChange={e=>setF("estabFatura",e.target.value)} placeholder="Código"/></div>
            <div className="f g2"><label className="l">Nome Estab.</label><input className="in" value={form.estabFaturaNome} onChange={e=>setF("estabFaturaNome",e.target.value)} disabled/></div>
            <div className="f g2"><label className="l">Ass. Técnico</label><input className="in" value={form.assTecnico} onChange={e=>setF("assTecnico",e.target.value)} placeholder="Código"/></div>
            <div className="f g2"><label className="l">Nome Ass.</label><input className="in" value={form.assTecnicoNome} onChange={e=>setF("assTecnicoNome",e.target.value)} disabled/></div>
            <div className="f g2"><label className="l">Tipo <span className="lr">*</span></label><select className="se" value={form.tipo} onChange={e=>setF("tipo",e.target.value)}><option value="">Selecione...</option>{TIPOS.map(t=><option key={t} value={t}>{t}</option>)}</select>{errors.tipo&&<span className="er">{errors.tipo}</span>}</div>
            <div className="f g2"><label className="l">Motivo</label><select className="se" value={form.motivo} onChange={e=>setF("motivo",e.target.value)} disabled={motivoBloq}><option value="">Selecione...</option>{MOTIVOS.map(m=><option key={m} value={m}>{m}</option>)}</select>{motivoBloq&&<span className="hi">Bloqueado pelo status atual</span>}</div>
            <div className="f g4"><label className="l">Solução</label><input className="in" value={form.solucao} onChange={e=>setF("solucao",e.target.value)} placeholder="Descreva a solução..."/></div>
            <div className="f g2"><label className="l">Status</label><select className="se" value={form.status} onChange={e=>setF("status",e.target.value)}>{STATUS_CHAMADO.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            <div className="f g2"><label className="l">&nbsp;</label><div className="tgl-row"><label className={`tgl${!fechadoOk?' disabled':''}`} style={!fechadoOk?{opacity:.45,cursor:'not-allowed',pointerEvents:'none'}:{}}><input type="checkbox" checked={form.fechado} disabled={!fechadoOk} onChange={e=>setF("fechado",e.target.checked)}/><div className="tgl-tr"/><div className="tgl-th"/></label><span className="tgl-l">{form.fechado?'Fechado':'Aberto'}</span></div>{!fechadoOk&&<span className="hi">Disponível apenas quando chamado não estiver Pendente</span>}</div>
          </div></div>
        </div>

        {itens.length>0 && (<>
          <div className="sb"><span className="sb-p">2 — Itens do Chamado</span><div className="sb-l"/><span className="sb-h">{itens.length} item(ns)</span></div>
          <div className="c">
            <div className="ch"><div className="chl"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round"/></svg><span className="cht">Itens</span></div><button className="bt bt-g bt-sm" onClick={addItem}>+ Adicionar</button></div>
            <div style={{overflowX:"auto"}}>
              <table className="tb-r"><thead><tr><th>Item</th><th>Descrição</th><th>NFS</th><th>NFE</th><th>Qtd</th><th>Vlr Unit</th><th>Motivo</th><th>Defeito</th><th>Ações</th></tr></thead>
              <tbody>{itens.map((it,i)=><tr key={it.id} className={selItem===i?'sel':''} onClick={()=>setSelItem(i)}><td>{it.item||'-'}</td><td>{it.itemDesc||'-'}</td><td>{it.nfs||'-'}</td><td>{it.nfe||'-'}</td><td>{it.quantidade}</td><td>R$ {it.valor.toFixed(2)}</td><td>{it.motivoDefeitoAlegado||'-'}</td><td>{it.defeitoAlegado||'-'}</td><td><button className="bt bt-d bt-sm" onClick={e=>{e.stopPropagation();delItem(i)}}>Excluir</button></td></tr>)}</tbody></table>
            </div>
          </div>
        </>)}
      </div>
      <footer className="ft"><span>VentureERP — Módulo Assistência Técnica</span><span>{form.chamado?`Chamado #${form.chamado}`:'Novo Chamado'} | Status: {form.status}</span></footer>
    </div>

    {showItens && selItem!==null && itens[selItem] && (<div className="ovl" onClick={e=>{if(e.target===e.currentTarget)setShowItens(false)}}><div className="mod"><div className="mh"><span className="mht">Editar Item — #{itens[selItem].item||'Novo'}</span><div style={{display:'flex',gap:8}}><button className="bt bt-n bt-sm" onClick={addItem}>+ Novo Item</button><button className="bt bt-g bt-sm" onClick={()=>setShowItens(false)}>Fechar</button></div></div><div className="mb"><div className="g">
            <div className="f g3"><label className="l">Item</label><input className="in" value={itens[selItem].item} onChange={e=>updItem(selItem,'item',e.target.value)}/></div>
            <div className="f g3"><label className="l">Descrição</label><input className="in" value={itens[selItem].itemDesc} onChange={e=>updItem(selItem,'itemDesc',e.target.value)}/></div>
            <div className="f g2"><label className="l">NFS</label><input className="in" value={itens[selItem].nfs} onChange={e=>updItem(selItem,'nfs',e.target.value)}/></div>
            <div className="f g2"><label className="l">NFE</label><input className="in" value={itens[selItem].nfe} onChange={e=>updItem(selItem,'nfe',e.target.value)}/></div>
            <div className="f g2"><label className="l">NF Revenda</label><input className="in" value={itens[selItem].nfRevenda} onChange={e=>updItem(selItem,'nfRevenda',e.target.value)}/></div>
            <div className="f g2"><label className="l">Data NF</label><input className="in" type="date" value={itens[selItem].dataNF} onChange={e=>updItem(selItem,'dataNF',e.target.value)}/></div>
            <div className="f g2"><label className="l">Série Filho</label><input className="in" value={itens[selItem].loteSerieFilho} onChange={e=>updItem(selItem,'loteSerieFilho',e.target.value)}/></div>
            <div className="f g2"><label className="l">Série Pai</label><input className="in" value={itens[selItem].loteSeriePai} onChange={e=>updItem(selItem,'loteSeriePai',e.target.value)}/></div>
            <div className="f g2"><label className="l">Quantidade</label><input className="in" type="number" value={itens[selItem].quantidade} onChange={e=>updItem(selItem,'quantidade',Number(e.target.value))}/></div>
            <div className="f g2"><label className="l">Valor Unit.</label><input className="in" type="number" step="0.01" value={itens[selItem].valor} onChange={e=>updItem(selItem,'valor',Number(e.target.value))}/></div>
            <div className="f g2"><label className="l">Item Pai</label><input className="in" value={itens[selItem].itemPai} onChange={e=>updItem(selItem,'itemPai',e.target.value)}/></div>
            <div className="f g2"><label className="l">Máscara</label><input className="in" value={itens[selItem].mascara} onChange={e=>updItem(selItem,'mascara',e.target.value)}/></div>
            <div className="f g4"><label className="l">Motivo Def. Alegado</label><select className="se" value={itens[selItem].motivoDefeitoAlegado} onChange={e=>updItem(selItem,'motivoDefeitoAlegado',e.target.value)}><option value="">Selecione...</option>{MOTIVOS.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
            <div className="f g4"><label className="l">Defeito Alegado</label><input className="in" value={itens[selItem].defeitoAlegado} onChange={e=>updItem(selItem,'defeitoAlegado',e.target.value)}/></div>
            <div className="f g4"><label className="l">Motivo Def. Constatado</label><select className="se" value={itens[selItem].motivoDefeitoConstatado} onChange={e=>updItem(selItem,'motivoDefeitoConstatado',e.target.value)}><option value="">Selecione...</option>{MOTIVOS.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
            <div className="f g4"><label className="l">Defeito Constatado</label><input className="in" value={itens[selItem].defeitoConstatado} onChange={e=>updItem(selItem,'defeitoConstatado',e.target.value)}/></div>
            <div className="f g4"><label className="l">Observação</label><input className="in" value={itens[selItem].observacao} onChange={e=>updItem(selItem,'observacao',e.target.value)}/></div>
          </div></div></div></div>)}
    </>);
}

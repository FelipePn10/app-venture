import { useCallback, useEffect, useState } from "react";
import {
  type DevolucaoVenda, type ModoDevolucao, type PreviaDevolucao, type SituacaoDevolucao, MOTIVOS_DEVOLUCAO, ROTULO_MODO, ROTULO_SITUACAO_DEV,
  cancelarDevolucao, criarDevolucao, efetivarDevolucao, gerarNFDevolucao, listarDevolucoes, obterDevolucao, previaDevolucao,
} from "@/services/devolucaoVendaService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadFiscalExits, loadWarehouses } from "@/services/lookups";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Num = string | number;
const brl = (v?: Num) => Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const qtd = (v?: Num) => Number(v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
const COR: Record<SituacaoDevolucao, string> = { RASCUNHO: "erp-badge-blue", EMITIDA: "erp-badge-amber", EFETIVADA: "erp-badge-green", CANCELADA: "erp-badge-gray" };
type Escolha = { quantidade: string; series: number[] };

/**
 * VVND0700 — Devolução de Venda. Nasce da NF de saída autorizada e só devolve
 * o que foi vendido. Cliente não contribuinte: a empresa emite a NF-e de
 * entrada (transmitida na VFIS0200). Cliente contribuinte: registra-se a chave
 * da NF de devolução dele. A efetivação devolve o estoque pelo custo da saída,
 * abate os títulos em aberto, gera crédito do cliente com o que sobrar,
 * estorna a comissão e o imposto e devolve as séries ao estoque.
 */
export function Vvnd0700Page(): JSX.Element {
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const [nota, setNota] = useState<number | undefined>(undefined);
  const [previa, setPrevia] = useState<PreviaDevolucao | null>(null);
  const [escolha, setEscolha] = useState<Record<number, Escolha>>({});
  const [cab, setCab] = useState({ modo: "EMISSAO_PROPRIA" as ModoDevolucao, motivo: "DEFEITO", almox: undefined as number | undefined, chave: "", obs: "" });
  const [lista, setLista] = useState<DevolucaoVenda[]>([]);
  const [aberta, setAberta] = useState<DevolucaoVenda | null>(null);
  const [motivoCancel, setMotivoCancel] = useState("");

  const recarregar = useCallback(async () => {
    try { setLista(await listarDevolucoes()); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); }
  }, []);
  useEffect(() => { void recarregar(); }, [recarregar]);
  useEffect(() => {
    setPrevia(null); setEscolha({});
    if (!nota) return;
    previaDevolucao(nota).then(setPrevia).catch((e) => setFeedback({ type: "error", message: errMessage(e) }));
  }, [nota]);

  const marcar = (id: number, campo: Partial<Escolha>) => setEscolha((x) => ({ ...x, [id]: { quantidade: x[id]?.quantidade ?? "", series: x[id]?.series ?? [], ...campo } }));

  async function criar() {
    if (!previa) return;
    const itens = Object.entries(escolha)
      .filter(([, v]) => Number(v.quantidade.replace(",", ".")) > 0)
      .map(([id, v]) => ({ fiscal_exit_item_id: Number(id), quantidade: v.quantidade.replace(",", "."), series: v.series.length ? v.series : undefined }));
    if (!itens.length) { setFeedback({ type: "error", message: "Informe a quantidade devolvida de ao menos um item." }); return; }
    if (!cab.almox) { setFeedback({ type: "error", message: "Escolha o almoxarifado que recebe a mercadoria." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const d = await criarDevolucao({ fiscal_exit_id: previa.fiscal_exit_id, modo: cab.modo, motivo: cab.motivo, observacao: cab.obs || undefined, warehouse_id: cab.almox,
        nf_cliente_chave: cab.modo === "NF_CLIENTE" ? cab.chave : undefined, itens });
      setAberta(d); setNota(undefined); await recarregar();
      setFeedback({ type: "success", message: `Devolução ${d.numero} criada (${brl(d.valor_total)}).` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function acao(fn: () => Promise<DevolucaoVenda>, ok: string) {
    setBusy(true); setFeedback(null);
    try { setAberta(await fn()); await recarregar(); setFeedback({ type: "success", message: ok }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function efetivar(id: number) {
    setBusy(true); setFeedback(null);
    try {
      const r = await efetivarDevolucao(id);
      setAberta(r.devolucao); await recarregar();
      setFeedback({ type: "success", message: ["Devolução efetivada.", ...(r.avisos ?? [])].join(" ") });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const a = aberta;
  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Comercial</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Devolução de Venda</span><span className="erp-crumb-code">VVND0700</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>
      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Consulta</span><button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Atualizar</button></div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span><ExportButton title="VVND0700 — Devolução de Venda" filename="vvnd0700" /></div>
      </div>
      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            <div className="erp-fieldset"><div className="erp-fieldset-head">Nova devolução</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c4"><label className="erp-label erp-req">NF de venda</label>
                <LookupField value={nota} loader={loadFiscalExits} entityLabel="NF de saída" placeholder="Selecionar a NF autorizada" onChange={(c) => setNota(c ?? undefined)} /></div>
              <div className="erp-field erp-c4"><label className="erp-label">Documento da devolução</label>
                <select className="erp-input" id="dev-modo" value={cab.modo} onChange={(e) => setCab((c) => ({ ...c, modo: e.target.value as ModoDevolucao }))}>
                  {Object.entries(ROTULO_MODO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="erp-field erp-c2"><label className="erp-label">Motivo</label>
                <select className="erp-input" id="dev-motivo" value={cab.motivo} onChange={(e) => setCab((c) => ({ ...c, motivo: e.target.value }))}>
                  {Object.entries(MOTIVOS_DEVOLUCAO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="erp-field erp-c2"><label className="erp-label erp-req">Recebe no almoxarifado</label>
                <LookupField value={cab.almox} loader={loadWarehouses} entityLabel="almoxarifado" placeholder="Selecionar" onChange={(c) => setCab((x) => ({ ...x, almox: c ?? undefined }))} /></div>
              {cab.modo === "NF_CLIENTE" && (
                <div className="erp-field erp-c6"><label className="erp-label erp-req">Chave da NF de devolução do cliente</label>
                  <input className="erp-input" id="dev-chave" value={cab.chave} maxLength={60} onChange={(e) => setCab((c) => ({ ...c, chave: e.target.value }))} placeholder="44 dígitos" /></div>
              )}
              <div className="erp-field erp-c6"><label className="erp-label">Observação</label><input className="erp-input" value={cab.obs} onChange={(e) => setCab((c) => ({ ...c, obs: e.target.value }))} /></div>

              {previa && (
                <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                  <table className="erp-grid" id="dev-linhas">
                    <thead><tr><th>#</th><th>Item</th><th>Vendido</th><th>Já devolvido</th><th>Disponível</th><th>Preço</th><th>Devolver</th><th>Séries</th></tr></thead>
                    <tbody>
                      {previa.linhas.map((l) => (
                        <tr key={l.fiscal_exit_item_id}><td>{l.sequencia}</td><td>{l.item_code ? `${l.item_code} · ` : ""}{l.descricao}</td>
                          <td>{qtd(l.quantidade)}</td><td>{qtd(l.devolvida)}</td><td>{qtd(l.disponivel)}</td><td>{brl(l.valor_unitario)}</td>
                          <td><input className="erp-input" style={{ width: 90 }} inputMode="decimal" disabled={!Number(l.disponivel)} value={escolha[l.fiscal_exit_item_id]?.quantidade ?? ""}
                            onChange={(e) => marcar(l.fiscal_exit_item_id, { quantidade: e.target.value })} /></td>
                          <td>{l.controla_serie ? (l.series.length ? l.series.map((s) => (
                            <label key={s.id} style={{ marginRight: 8 }}><input type="checkbox" checked={escolha[l.fiscal_exit_item_id]?.series.includes(s.id) ?? false}
                              onChange={(e) => { const atual = escolha[l.fiscal_exit_item_id]?.series ?? []; const series = e.target.checked ? [...atual, s.id] : atual.filter((x) => x !== s.id); marcar(l.fiscal_exit_item_id, { series, quantidade: String(series.length) }); }} /> {s.numero}</label>
                          )) : "nenhuma com o cliente") : "—"}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" id="dev-criar" disabled={busy || !previa} onClick={() => void criar()}>Criar devolução</button>
                {" "}<small>Itens e impostos são proporcionais à quantidade devolvida; o CFOP de devolução é o da venda (5101 → 1201, 6102 → 2202…).</small></div>
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Devoluções — <span style={{ fontWeight: 400, opacity: 0.65 }}>{lista.length}</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                <table className="erp-grid" id="dev-lista">
                  <thead><tr><th>Nº</th><th>NF de venda</th><th>Cliente</th><th>Documento</th><th>Motivo</th><th>Valor</th><th>Situação</th><th style={{ width: 80 }} /></tr></thead>
                  <tbody>
                    {lista.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhuma devolução.</td></tr>}
                    {lista.map((x) => (
                      <tr key={x.id}><td style={{ fontWeight: 600 }}>{x.numero}</td><td>{x.numero_nf}</td><td>{x.cliente_nome || x.customer_code}</td><td>{ROTULO_MODO[x.modo]}</td>
                        <td>{MOTIVOS_DEVOLUCAO[x.motivo] ?? x.motivo}</td><td>{brl(x.valor_total)}</td><td><span className={`erp-badge ${COR[x.situacao]}`}>{ROTULO_SITUACAO_DEV[x.situacao]}</span></td>
                        <td><button className="erp-btn erp-btn-sm" onClick={() => void obterDevolucao(x.id).then(setAberta).catch((e) => setFeedback({ type: "error", message: errMessage(e) }))}>Abrir</button></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div></div>

            {a && (
              <div className="erp-fieldset" id="dev-detalhe"><div className="erp-fieldset-head">Devolução {a.numero} — NF {a.numero_nf} · {a.cliente_nome || a.customer_code}</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c12" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <span><span className={`erp-badge ${COR[a.situacao]}`}>{ROTULO_SITUACAO_DEV[a.situacao]}</span></span>
                  <span>{ROTULO_MODO[a.modo]}</span>
                  <span>Valor: <strong>{brl(a.valor_total)}</strong></span>
                  {a.situacao === "EFETIVADA" && <span>Abatido dos títulos: <strong>{brl(a.abatido)}</strong> · crédito do cliente: <strong>{brl(a.credito_cliente)}</strong></span>}
                  {a.nf_propria_id && <span>NF-e de entrada: <strong>id {a.nf_propria_id}</strong> ({a.nf_propria_status})</span>}
                  {a.nf_cliente_chave && <span>NF do cliente: <strong>{a.nf_cliente_chave}</strong></span>}
                </div>
                <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                  <table className="erp-grid">
                    <thead><tr><th>Item</th><th>CFOP</th><th>Quantidade</th><th>Produtos</th><th>ICMS</th><th>IPI</th><th>Total</th><th>Custo de volta ao estoque</th></tr></thead>
                    <tbody>{a.itens.map((it) => (
                      <tr key={it.id}><td>{it.item_code ? `${it.item_code} · ` : ""}{it.descricao}</td><td>{it.cfop}</td><td>{qtd(it.quantidade)}</td><td>{brl(it.valor_produtos)}</td>
                        <td>{brl(it.valor_icms)}</td><td>{brl(it.valor_ipi)}</td><td>{brl(it.valor_total)}</td><td>{it.custo_unitario !== undefined && it.custo_unitario !== null ? brl(it.custo_unitario) : "—"}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
                <div className="erp-field erp-c12" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {a.modo === "EMISSAO_PROPRIA" && a.situacao === "RASCUNHO" && !a.nf_propria_id && (
                    <button className="erp-btn erp-btn-primary" id="dev-gerar-nf" disabled={busy} onClick={() => void acao(() => gerarNFDevolucao(a.id), "NF-e de entrada gerada em rascunho: transmita na VFIS0200. Autorizada, a devolução é efetivada.")}>Gerar NF-e de entrada</button>
                  )}
                  {((a.modo === "NF_CLIENTE" && a.situacao === "RASCUNHO") || a.situacao === "EMITIDA") && (
                    <button className="erp-btn erp-btn-primary" id="dev-efetivar" disabled={busy} onClick={() => void efetivar(a.id)}>Efetivar devolução</button>
                  )}
                  {a.situacao !== "EFETIVADA" && a.situacao !== "CANCELADA" && (<>
                    <input className="erp-input" style={{ maxWidth: 320 }} placeholder="motivo do cancelamento" value={motivoCancel} onChange={(e) => setMotivoCancel(e.target.value)} />
                    <button className="erp-btn erp-btn-danger" disabled={busy || !motivoCancel.trim()} onClick={() => void acao(() => cancelarDevolucao(a.id, motivoCancel), "Devolução cancelada.").then(() => setMotivoCancel(""))}>Cancelar</button>
                  </>)}
                </div>
              </div></div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

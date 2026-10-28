import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type AlmoxDestino, type DecisaoDTO, type LoteInspecao, type OrigemLote, type ResultadoDTO,
  abrirLote, almoxarifadosParaDecisao, cancelarLote, decidirLote, desvincularLaudo, gravarResultados, listarLotes, obterLote, vincularLaudo,
} from "@/services/loteInspecaoService";
import {
  type ItemSupplierQualityReport, downloadItemSupplierQualityReport, listItemSupplierQualityReports, listItemSuppliers,
} from "@/services/purchasingMasterService";
import { rotuloDaChave } from "@/services/amostragemService";
import { type Instrumento, listarInstrumentos, normalizarGrupo } from "@/services/metrologiaService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { useAcessoStore } from "@/store/acessoStore";
import { useAuthStore } from "@/store/authStore";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

const ROTULO_ORIGEM: Record<OrigemLote, string> = {
  RECEBIMENTO: "Recebimento", PROCESSO: "Processo", FINAL: "Final", DEVOLUCAO: "Devolução", MANUAL: "Manual",
};
const ROTULO_DECISAO: Record<string, [string, string]> = {
  ACEITO: ["Aceito", "erp-badge-green"], ACEITO_COM_RESTRICAO: ["Aceito c/ restrição", "erp-badge-amber"],
  REJEITADO: ["Rejeitado", "erp-badge-red"], PARCIAL: ["Parcial", "erp-badge-amber"],
};
const TRATAMENTOS = [
  ["", "—"], ["SELECIONAR", "Selecionar (triagem)"], ["DEVOLVER", "Devolver ao fornecedor"], ["RETRABALHAR", "Retrabalhar"],
  ["SUCATEAR", "Sucatear"], ["CONCESSAO", "Concessão (aceitar com desvio)"],
];
const POR_PAGINA = 20;
const num = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 6 });
const dataHora = (s?: string) => (s ? new Date(s).toLocaleString("pt-BR") : "—");
// "1.234,5" e "8,25" (pt-BR) ou "8.25": com vírgula, o ponto é milhar; sem
// vírgula, o ponto é o decimal — senão "8.25" virava 825.
const textoNum = (s: string) => {
  const t = s.trim();
  return t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
};
const zero = (s: string) => (s.trim() === "" ? "0" : textoNum(s));

type Celula = { valor: string; conforme: "" | "S" | "N" };
type FormDecisao = {
  aceita: string; restrita: string; retrabalho: string; rejeitada: string; sucata: string;
  dAceito: string; dRestrito: string; dRetrabalho: string; dRejeitado: string; dSucata: string;
  tratamento: string; motivo: string; afetaIQF: boolean; producaoIrregular: boolean;
};
const decisaoVazia = (): FormDecisao => ({
  aceita: "", restrita: "", retrabalho: "", rejeitada: "", sucata: "", dAceito: "", dRestrito: "", dRetrabalho: "", dRejeitado: "", dSucata: "",
  tratamento: "", motivo: "", afetaIQF: true, producaoIrregular: false,
});

export function Vins0300Page(): JSX.Element {
  const isAdmin = useAuthStore((s) => s.user?.role?.toUpperCase() === "ADMIN");
  const acesso = useAcessoStore((s) => s.acesso);
  const pode = (acao: string) => !acesso?.restrito || isAdmin || acesso.permissoes.some((p) => p.modulo === "qualidade" && p.acao === acao);
  const podeDecidir = pode("APROVAR");

  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const [filtro, setFiltro] = useState({ status: "ABERTO", origem: "", item: "" });
  const [lista, setLista] = useState<LoteInspecao[]>([]);
  const [aberto, setAberto] = useState<LoteInspecao | null>(null);
  const [almox, setAlmox] = useState<AlmoxDestino[]>([]);
  // Instrumento usado por característica (metrologia): vai em cada resultado gravado.
  const [instrumentos, setInstrumentos] = useState<Instrumento[]>([]);
  const [instrPorCarac, setInstrPorCarac] = useState<Record<number, string>>({});
  const [celulas, setCelulas] = useState<Record<string, Celula>>({});
  const [pagina, setPagina] = useState(0);
  const [dec, setDec] = useState<FormDecisao>(decisaoVazia());
  const [motivoCancel, setMotivoCancel] = useState("");
  const [novo, setNovo] = useState<{ mostrar: boolean; origem: OrigemLote; item: string; quantidade: string; almox: string; fornecedor: string; lote: string }>({
    mostrar: false, origem: "MANUAL", item: "", quantidade: "", almox: "", fornecedor: "", lote: "",
  });

  const recarregar = useCallback(async () => {
    setBusy(true);
    try {
      setLista(await listarLotes({ status: filtro.status, origem: filtro.origem, item: Number(filtro.item) || undefined }));
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar os lotes de inspeção.") });
    } finally { setBusy(false); }
  }, [filtro]);
  useEffect(() => { void recarregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { almoxarifadosParaDecisao().then(setAlmox).catch(() => setAlmox([])); }, []);
  useEffect(() => { listarInstrumentos().then((l) => setInstrumentos(l.filter((i) => i.status === "ATIVO"))).catch(() => setInstrumentos([])); }, []);

  function carregarCelulas(l: LoteInspecao) {
    const m: Record<string, Celula> = {};
    for (const r of l.resultados) {
      m[`${r.characteristic_id}:${r.amostra_indice}`] = { valor: r.valor != null ? String(r.valor).replace(".", ",") : "", conforme: r.conforme ? "S" : "N" };
    }
    setCelulas(m);
    // Último instrumento usado em cada característica vira o padrão.
    const ins: Record<number, string> = {};
    for (const r of l.resultados) if (r.instrument_id) ins[r.characteristic_id] = String(r.instrument_id);
    setInstrPorCarac(ins);
  }

  async function abrir(id: number) {
    setBusy(true); setFeedback(null);
    try {
      const l = await obterLote(id);
      setAberto(l); carregarCelulas(l); setPagina(0); setDec(decisaoVazia()); setMotivoCancel("");
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  // Laudos do fornecedor do item (anexados no vínculo item × fornecedor, VSUP0670): os do fornecedor do lote, ou de
  // todos os fornecedores do item quando o lote não tem fornecedor.
  const [laudos, setLaudos] = useState<(ItemSupplierQualityReport & { fornecedor: number })[]>([]);
  const loteDosLaudos = aberto?.id;
  useEffect(() => {
    if (!aberto) { setLaudos([]); return; }
    let vivo = true;
    (async () => {
      const vinculos = (await listItemSuppliers(String(aberto.item_code))).filter((s) => s.id && (!aberto.supplier_code || s.supplier_code === aberto.supplier_code));
      const listas = await Promise.all(vinculos.map(async (s) => (await listItemSupplierQualityReports(s.id!)).map((q) => ({ ...q, fornecedor: s.supplier_code }))));
      if (vivo) setLaudos(listas.flat());
    })().catch(() => { if (vivo) setLaudos([]); });
    return () => { vivo = false; };
  }, [loteDosLaudos]); // eslint-disable-line react-hooks/exhaustive-deps

  async function alternarLaudo(q: ItemSupplierQualityReport, vinculado: boolean) {
    if (!aberto) return;
    setBusy(true); setFeedback(null);
    try {
      if (vinculado) {
        await desvincularLaudo(aberto.id, q.id);
        setAberto(await obterLote(aberto.id));
      } else {
        setAberto(await vincularLaudo(aberto.id, q.id));
      }
      setFeedback({ type: "success", message: vinculado ? `Laudo ${q.id} desvinculado do lote.` : `Laudo ${q.id} vinculado ao lote.` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const unidades = aberto ? (aberto.plano?.n ?? Math.max(1, Math.ceil(aberto.quantidade))) : 0;
  const paginas = Math.max(1, Math.ceil(unidades / POR_PAGINA));
  const daPagina = useMemo(() => {
    const ini = pagina * POR_PAGINA + 1;
    return Array.from({ length: Math.max(0, Math.min(POR_PAGINA, unidades - ini + 1)) }, (_, i) => ini + i);
  }, [pagina, unidades]);
  const conformeGravado = (cid: number, u: number) => aberto?.resultados.find((r) => r.characteristic_id === cid && r.amostra_indice === u)?.conforme;

  async function salvarResultados() {
    if (!aberto) return;
    const envio: ResultadoDTO[] = [];
    for (const c of aberto.caracteristicas) {
      const instrumento = instrPorCarac[c.id] ? Number(instrPorCarac[c.id]) : undefined;
      for (let u = 1; u <= unidades; u++) {
        const cel = celulas[`${c.id}:${u}`];
        if (!cel) continue;
        const atual = aberto.resultados.find((r) => r.characteristic_id === c.id && r.amostra_indice === u);
        if (c.tipo === "VARIAVEL") {
          if (cel.valor.trim() === "") continue;
          const v = textoNum(cel.valor);
          if (atual && atual.valor != null && Number(atual.valor) === Number(v)) continue;
          envio.push({ characteristic_id: c.id, amostra_indice: u, valor: v, conforme: cel.conforme === "" ? undefined : cel.conforme === "S", instrument_id: instrumento });
        } else {
          if (cel.conforme === "") continue;
          if (atual && atual.conforme === (cel.conforme === "S")) continue;
          envio.push({ characteristic_id: c.id, amostra_indice: u, conforme: cel.conforme === "S", instrument_id: instrumento });
        }
      }
    }
    if (envio.length === 0) { setFeedback({ type: "info", message: "Nenhum resultado novo ou alterado." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const l = await gravarResultados(aberto.id, envio);
      setAberto(l); carregarCelulas(l);
      setFeedback({ type: "success", message: `${envio.length} resultado(s) gravado(s). A conformidade das medidas é a dos limites do plano.` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  function preencher(tipo: "aceitar" | "rejeitar") {
    if (!aberto) return;
    const q = String(aberto.quantidade).replace(".", ",");
    setDec((d) => ({ ...decisaoVazia(), afetaIQF: d.afetaIQF, motivo: d.motivo, ...(tipo === "aceitar" ? { aceita: q } : { rejeitada: q, tratamento: "DEVOLVER" }) }));
  }

  async function decidir() {
    if (!aberto) return;
    const id = (s: string) => (s ? Number(s) : undefined);
    const dto: DecisaoDTO = {
      qtd_aceita: zero(dec.aceita), qtd_restrita: zero(dec.restrita), qtd_retrabalho: zero(dec.retrabalho), qtd_rejeitada: zero(dec.rejeitada), qtd_sucata: zero(dec.sucata),
      destino_aceito: id(dec.dAceito), destino_restrito: id(dec.dRestrito), destino_retrabalho: id(dec.dRetrabalho), destino_rejeitado: id(dec.dRejeitado),
      destino_sucata: id(dec.dSucata), tratamento: dec.tratamento || undefined, motivo: dec.motivo.trim() || undefined,
      afeta_iqf: dec.afetaIQF, producao_irregular: dec.producaoIrregular,
    };
    setBusy(true); setFeedback(null);
    try {
      const l = await decidirLote(aberto.id, dto);
      setAberto(l); carregarCelulas(l);
      setFeedback({ type: "success", message: `Lote ${l.numero}: decisão ${ROTULO_DECISAO[l.decisao?.decisao ?? ""]?.[0] ?? ""} registrada${aberto.warehouse_id ? " e o estoque saiu da inspeção" : ""}.` });
      await recarregar();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function cancelar() {
    if (!aberto) return;
    setBusy(true); setFeedback(null);
    try {
      const l = await cancelarLote(aberto.id, motivoCancel);
      setAberto(l);
      setFeedback({ type: "success", message: `Lote ${l.numero} cancelado.` });
      await recarregar();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function criar() {
    setBusy(true); setFeedback(null);
    try {
      const l = await abrirLote({
        origem: novo.origem, item_code: Number(novo.item), quantidade: textoNum(novo.quantidade),
        warehouse_id: novo.almox ? Number(novo.almox) : undefined, supplier_code: Number(novo.fornecedor) || undefined, lote: novo.lote.trim() || undefined,
      });
      setNovo((n) => ({ ...n, mostrar: false, item: "", quantidade: "", lote: "" }));
      await recarregar(); await abrir(l.id);
      // Depois de abrir: abrir() limpa o aviso anterior.
      setFeedback({ type: "success", message: `Lote de inspeção ${l.numero} aberto.` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const disponiveis = almox.filter((a) => a.disponivel && a.localizacao !== "INSPECAO" && a.localizacao !== "REJEICAO");
  const rejeicao = almox.filter((a) => a.localizacao === "REJEICAO" || !a.disponivel).filter((a) => a.localizacao !== "INSPECAO");
  const naoInspecao = almox.filter((a) => a.localizacao !== "INSPECAO");
  const inspecao = almox.filter((a) => a.localizacao === "INSPECAO");
  const nomeAlmox = (id?: number) => { const a = almox.find((x) => x.id === id); return a ? `${a.codigo} — ${a.descricao}` : id ? `#${id}` : "—"; };
  const selAlmox = (valor: string, onChange: (v: string) => void, opcoes: AlmoxDestino[]) => (
    <select className="erp-input" value={valor} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      {opcoes.map((a) => <option key={a.id} value={a.id}>{a.codigo} — {a.descricao}</option>)}
    </select>
  );
  const linhaDecisao = (rotulo: string, q: keyof FormDecisao, d: keyof FormDecisao, opcoes: AlmoxDestino[], semDestino?: string) => (
    <>
      <div className="erp-field erp-c2"><label className="erp-label">{rotulo}</label>
        <input className="erp-input" inputMode="decimal" value={dec[q] as string} onChange={(e) => setDec((x) => ({ ...x, [q]: e.target.value }))} /></div>
      <div className="erp-field erp-c4"><label className="erp-label">Destino {rotulo.toLowerCase()}{semDestino ? ` (${semDestino})` : ""}</label>
        {aberto?.warehouse_id ? selAlmox(dec[d] as string, (v) => setDec((x) => ({ ...x, [d]: v })), opcoes) : <input className="erp-input" disabled value="sem estoque retido" />}</div>
    </>
  );

  const av = aberto?.avaliacao;
  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Inspeção</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Lotes de Inspeção</span><span className="erp-crumb-code">VINS0300</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Consulta</span>
          <button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Atualizar</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Lote</span>
          <button className="erp-btn erp-btn-new" onClick={() => setNovo((n) => ({ ...n, mostrar: !n.mostrar }))} disabled={busy}>Novo lote manual</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VINS0300 — Lotes de Inspeção" filename="vins0300" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

            {novo.mostrar && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Novo lote manual</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c2"><label className="erp-label">Origem</label>
                  <select className="erp-input" value={novo.origem} onChange={(e) => setNovo((n) => ({ ...n, origem: e.target.value as OrigemLote }))}>
                    <option value="MANUAL">Manual</option><option value="RECEBIMENTO">Recebimento</option><option value="DEVOLUCAO">Devolução</option><option value="FINAL">Final</option>
                  </select></div>
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Item</label>
                  <input className="erp-input" inputMode="numeric" value={novo.item} onChange={(e) => setNovo((n) => ({ ...n, item: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label erp-req">Quantidade</label>
                  <input className="erp-input" inputMode="decimal" value={novo.quantidade} onChange={(e) => setNovo((n) => ({ ...n, quantidade: e.target.value }))} /></div>
                <div className="erp-field erp-c3"><label className="erp-label">Almoxarifado de inspeção</label>
                  {selAlmox(novo.almox, (v) => setNovo((n) => ({ ...n, almox: v })), inspecao)}</div>
                <div className="erp-field erp-c1"><label className="erp-label">Fornecedor</label>
                  <input className="erp-input" inputMode="numeric" value={novo.fornecedor} onChange={(e) => setNovo((n) => ({ ...n, fornecedor: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Lote / corrida</label>
                  <input className="erp-input" value={novo.lote} onChange={(e) => setNovo((n) => ({ ...n, lote: e.target.value }))} /></div>
                <div className="erp-field erp-c12" style={{ display: "flex", gap: 8 }}>
                  <button className="erp-btn erp-btn-primary" onClick={() => void criar()} disabled={busy || !novo.item || !novo.quantidade}>Abrir lote</button>
                  <small style={{ alignSelf: "center" }}>O lote copia o roteiro de inspeção do item e calcula a amostragem do procedimento. Com almoxarifado de inspeção, o material fica bloqueado até a decisão.</small>
                </div>
              </div></div>
            )}

            <div className="erp-fieldset"><div className="erp-fieldset-head">Lotes — <span style={{ fontWeight: 400, opacity: 0.65 }}>{lista.length}</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label">Situação</label>
                <select className="erp-input" value={filtro.status} onChange={(e) => setFiltro((f) => ({ ...f, status: e.target.value }))}>
                  <option value="">Todas</option><option value="ABERTO">Aberto</option><option value="DECIDIDO">Decidido</option><option value="CANCELADO">Cancelado</option>
                </select></div>
              <div className="erp-field erp-c2"><label className="erp-label">Origem</label>
                <select className="erp-input" value={filtro.origem} onChange={(e) => setFiltro((f) => ({ ...f, origem: e.target.value }))}>
                  <option value="">Todas</option>{Object.entries(ROTULO_ORIGEM).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div className="erp-field erp-c2"><label className="erp-label">Item</label>
                <input className="erp-input" inputMode="numeric" value={filtro.item} onChange={(e) => setFiltro((f) => ({ ...f, item: e.target.value }))} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">&nbsp;</label>
                <button className="erp-btn" onClick={() => void recarregar()} disabled={busy}>Consultar</button></div>
              <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                <table className="erp-grid">
                  <thead><tr><th>Nº</th><th>Origem</th><th>Item</th><th>Lote</th><th className="num">Quantidade</th><th>Fornecedor / OP</th><th>Amostragem</th><th>Situação</th><th>Aberto em</th><th style={{ width: 80 }}>Ações</th></tr></thead>
                  <tbody>
                    {lista.length === 0 && <tr><td colSpan={10} className="erp-grid-empty">Nenhum lote.</td></tr>}
                    {lista.map((l) => (
                      <tr key={l.id} style={aberto?.id === l.id ? { background: "var(--erp-row-selected, #eef6f0)" } : undefined}>
                        <td style={{ fontWeight: 600 }}>{l.numero}</td>
                        <td>{ROTULO_ORIGEM[l.origem]}</td>
                        <td>{l.item_code}</td>
                        <td>{l.lote ?? "—"}</td>
                        <td className="num">{num(l.quantidade)}</td>
                        <td>{l.supplier_code ? `Fornecedor ${l.supplier_code}` : l.production_order_id ? `OP ${l.production_order_id}` : "—"}</td>
                        <td>{l.pulado ? <span className="erp-badge erp-badge-blue">Skip-lot</span> : l.plano ? `n ${l.plano.n} · Ac ${l.plano.ac}` : "—"}</td>
                        <td>{l.status === "DECIDIDO" && l.decisao
                          ? <span className={`erp-badge ${ROTULO_DECISAO[l.decisao.decisao][1]}`}>{ROTULO_DECISAO[l.decisao.decisao][0]}</span>
                          : <span className={`erp-badge ${l.status === "ABERTO" ? "erp-badge-amber" : "erp-badge-gray"}`}>{l.status === "ABERTO" ? "Aberto" : "Cancelado"}</span>}</td>
                        <td><small>{dataHora(l.created_at)}</small></td>
                        <td><button className="erp-btn erp-btn-sm" onClick={() => void abrir(l.id)}>Abrir</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div></div>

            {aberto && (
              <>
                <div className="erp-fieldset"><div className="erp-fieldset-head">Lote {aberto.numero} — {ROTULO_ORIGEM[aberto.origem]} · item {aberto.item_code}</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                  <p style={{ margin: 0 }}>
                    Quantidade <b>{num(aberto.quantidade)}</b>{aberto.lote ? <> · lote/corrida <b>{aberto.lote}</b></> : null}
                    {aberto.warehouse_id ? <> · retido em <b>{nomeAlmox(aberto.warehouse_id)}</b></> : <> · sem estoque retido</>}
                    {aberto.chave_amostragem ? <> · {rotuloDaChave(aberto.chave_amostragem)}</> : null}
                  </p>
                  <p style={{ margin: "6px 0 0" }}>
                    {aberto.pulado ? "Skip-lot: o procedimento libera este lote sem amostra."
                      : aberto.plano ? <>Amostragem: letra {aberto.plano.letra || "—"}, severidade {aberto.plano.severidade?.toLowerCase()}, inspecionar <b>{aberto.plano.n}</b>{aberto.plano.cem_por_cento ? " (100 %)" : ""}, aceitar com até <b>{aberto.plano.ac}</b> não conforme(s).</>
                        : "Sem procedimento de amostragem: informe as unidades que inspecionar."}
                  </p>
                  {av && aberto.caracteristicas.length > 0 && (
                    <p style={{ margin: "6px 0 0" }}>
                      Avaliação: <b>{av.nao_conformes}</b> unidade(s) não conforme(s){av.critica_reprovada ? ", característica crítica reprovada" : ""} —{" "}
                      {!av.completa ? <span className="erp-badge erp-badge-gray">inspeção incompleta</span>
                        : av.aceito_pela_amostragem ? <span className="erp-badge erp-badge-green">aceito pela amostragem</span> : <span className="erp-badge erp-badge-red">recusado pela amostragem</span>}
                      {!av.completa && av.faltantes?.length ? <small> faltam: {av.faltantes.join("; ")}</small> : null}
                    </p>
                  )}
                </div></div></div>

                {aberto.caracteristicas.length > 0 && !aberto.pulado && (
                  <div className="erp-fieldset"><div className="erp-fieldset-head">Resultados — unidades {daPagina[0] ?? 0} a {daPagina[daPagina.length - 1] ?? 0} de {unidades}</div><div className="erp-fieldset-body">
                    <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                      <table className="erp-grid">
                        <thead><tr><th>Unidade</th>{aberto.caracteristicas.map((c) => (
                          <th key={c.id} title={c.instrumento ? `Instrumento: ${c.instrumento}` : undefined}>
                            {c.nome}{c.critica ? " ⚠" : ""}<br /><small style={{ fontWeight: 400 }}>{c.tipo === "VARIAVEL" ? `${c.minimo ?? "—"} a ${c.maximo ?? "—"} ${c.unidade ?? ""}` : "conforme?"}</small>
                            {c.instrumento && aberto.status === "ABERTO" && (
                              <select className="erp-input" aria-label={`Instrumento de ${c.nome}`} style={{ marginTop: 4, fontWeight: 400 }} value={instrPorCarac[c.id] ?? ""}
                                onChange={(e) => setInstrPorCarac((m) => ({ ...m, [c.id]: e.target.value }))}>
                                <option value="">instrumento ({normalizarGrupo(c.instrumento)})</option>
                                {instrumentos.filter((i) => i.grupo === normalizarGrupo(c.instrumento)).map((i) => <option key={i.id} value={i.id}>{i.codigo}</option>)}
                              </select>
                            )}
                          </th>))}</tr></thead>
                        <tbody>
                          {daPagina.map((u) => (
                            <tr key={u}>
                              <td style={{ fontWeight: 600 }}>{u}</td>
                              {aberto.caracteristicas.map((c) => {
                                const k = `${c.id}:${u}`;
                                const cel = celulas[k] ?? { valor: "", conforme: "" };
                                const gravado = conformeGravado(c.id, u);
                                const estilo = gravado === false ? { background: "#fde8e8" } : undefined;
                                return (
                                  <td key={c.id} style={estilo}>
                                    {c.tipo === "VARIAVEL"
                                      ? <input className="erp-input" style={{ minWidth: 80 }} inputMode="decimal" disabled={aberto.status !== "ABERTO"} value={cel.valor}
                                        onChange={(e) => setCelulas((m) => ({ ...m, [k]: { ...cel, valor: e.target.value } }))} />
                                      : <select className="erp-input" disabled={aberto.status !== "ABERTO"} value={cel.conforme}
                                        onChange={(e) => setCelulas((m) => ({ ...m, [k]: { ...cel, conforme: e.target.value as Celula["conforme"] } }))}>
                                        <option value="">—</option><option value="S">Conforme</option><option value="N">Não conforme</option>
                                      </select>}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="erp-field erp-c12" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button className="erp-btn" onClick={() => setPagina((p) => Math.max(0, p - 1))} disabled={pagina === 0}>‹ Anteriores</button>
                      <span>Página {pagina + 1} de {paginas}</span>
                      <button className="erp-btn" onClick={() => setPagina((p) => Math.min(paginas - 1, p + 1))} disabled={pagina >= paginas - 1}>Próximas ›</button>
                      {aberto.status === "ABERTO" && <button className="erp-btn erp-btn-primary" onClick={() => void salvarResultados()} disabled={busy}>Gravar resultados</button>}
                    </div>
                  </div></div>
                )}

                <div className="erp-fieldset"><div className="erp-fieldset-head">Laudos do fornecedor — <span style={{ fontWeight: 400, opacity: 0.65 }}>{aberto.relatorios_fornecedor?.length ?? 0} vinculado(s)</span></div><div className="erp-fieldset-body">
                  <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                    {laudos.length === 0 ? <p style={{ margin: 0 }}>Nenhum laudo cadastrado para {aberto.supplier_code ? `o fornecedor ${aberto.supplier_code} neste item` : "os fornecedores deste item"} (VSUP0670).</p> : (
                      <table className="erp-grid">
                        <thead><tr><th>Laudo</th><th>Fornecedor</th><th>Data</th><th>Situação</th><th>Arquivo</th><th>Observação</th><th /></tr></thead>
                        <tbody>
                          {laudos.map((q) => {
                            const vinculado = aberto.relatorios_fornecedor?.includes(q.id) ?? false;
                            return (
                              <tr key={q.id}>
                                <td>{q.id}{vinculado ? <span className="erp-badge erp-badge-green" style={{ marginLeft: 4 }}>vinculado</span> : null}</td>
                                <td>{q.fornecedor}</td>
                                <td>{q.registered_on ? new Date(`${q.registered_on.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—"}</td>
                                <td>{q.status}</td>
                                <td>{q.has_attachment ? <button type="button" className="erp-btn" onClick={() => { void downloadItemSupplierQualityReport(q.id, q.file_name || `laudo-${q.id}`).catch((e) => setFeedback({ type: "error", message: errMessage(e) })); }}>{q.file_name || "baixar"}</button> : "—"}</td>
                                <td>{q.notes || "—"}</td>
                                <td>{aberto.status === "ABERTO" && <button type="button" className="erp-btn" disabled={busy} onClick={() => void alternarLaudo(q, vinculado)}>{vinculado ? "Desvincular" : "Vincular"}</button>}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div></div>

                {aberto.status === "ABERTO" && (
                  <div className="erp-fieldset"><div className="erp-fieldset-head">Decisão de uso</div><div className="erp-fieldset-body">
                    {!podeDecidir && <div className="erp-field erp-c12"><div className="erp-feedback info">A decisão de uso exige a permissão Aprovar do módulo Qualidade.</div></div>}
                    <div className="erp-field erp-c12" style={{ display: "flex", gap: 8 }}>
                      <button className="erp-btn" onClick={() => preencher("aceitar")}>Aceitar tudo</button>
                      <button className="erp-btn" onClick={() => preencher("rejeitar")}>Rejeitar tudo</button>
                      <small style={{ alignSelf: "center" }}>As partes precisam somar {num(aberto.quantidade)}.</small>
                    </div>
                    {linhaDecisao("Aceita", "aceita", "dAceito", disponiveis)}
                    {linhaDecisao("Restrita", "restrita", "dRestrito", disponiveis)}
                    {linhaDecisao("Retrabalho", "retrabalho", "dRetrabalho", naoInspecao)}
                    {linhaDecisao("Rejeitada", "rejeitada", "dRejeitado", rejeicao)}
                    {linhaDecisao("Sucata", "sucata", "dSucata", naoInspecao, "vazio = baixa")}
                    <div className="erp-field erp-c3"><label className="erp-label">Tratamento</label>
                      <select className="erp-input" value={dec.tratamento} onChange={(e) => setDec((x) => ({ ...x, tratamento: e.target.value }))}>
                        {TRATAMENTOS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                      </select></div>
                    <div className="erp-field erp-c6"><label className="erp-label">Motivo</label>
                      <input className="erp-input" value={dec.motivo} onChange={(e) => setDec((x) => ({ ...x, motivo: e.target.value }))} placeholder="Obrigatório quando nem tudo é aceito sem restrição" /></div>
                    <div className="erp-field erp-c3"><label className="erp-label">&nbsp;</label>
                      <label className="erp-check"><input type="checkbox" checked={dec.afetaIQF} onChange={(e) => setDec((x) => ({ ...x, afetaIQF: e.target.checked }))} /> Conta no IQF do fornecedor</label></div>
                    <div className="erp-field erp-c12" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button className="erp-btn erp-btn-primary" onClick={() => void decidir()} disabled={busy || !podeDecidir}>Registrar decisão</button>
                      <label className="erp-check"><input type="checkbox" checked={dec.producaoIrregular} onChange={(e) => setDec((x) => ({ ...x, producaoIrregular: e.target.checked }))} /> Produção irregular (volta a atenuada para normal)</label>
                    </div>
                  </div></div>
                )}

                {aberto.status === "DECIDIDO" && aberto.decisao && (
                  <div className="erp-fieldset"><div className="erp-fieldset-head">Decisão de uso — <span className={`erp-badge ${ROTULO_DECISAO[aberto.decisao.decisao][1]}`}>{ROTULO_DECISAO[aberto.decisao.decisao][0]}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                    <table className="erp-grid">
                      <thead><tr><th>Parte</th><th className="num">Quantidade</th><th>Destino</th></tr></thead>
                      <tbody>
                        {([["Aceita", aberto.decisao.qtd_aceita, aberto.decisao.destino_aceito], ["Restrita", aberto.decisao.qtd_restrita, aberto.decisao.destino_restrito],
                          ["Retrabalho", aberto.decisao.qtd_retrabalho, aberto.decisao.destino_retrabalho], ["Rejeitada", aberto.decisao.qtd_rejeitada, aberto.decisao.destino_rejeitado],
                          ["Sucata", aberto.decisao.qtd_sucata, aberto.decisao.destino_sucata]] as [string, number, number | undefined][])
                          .filter(([, q]) => q > 0).map(([p, q, d]) => (
                            <tr key={p}><td>{p}</td><td className="num">{num(q)}</td><td>{aberto.warehouse_id ? (d ? nomeAlmox(d) : p === "Sucata" ? "baixada" : "—") : "—"}</td></tr>
                          ))}
                      </tbody>
                    </table>
                    <p style={{ margin: "8px 0 0" }}>
                      {aberto.decisao.tratamento ? <>Tratamento: <b>{aberto.decisao.tratamento.toLowerCase()}</b>. </> : null}
                      {aberto.decisao.motivo ? <>Motivo: {aberto.decisao.motivo}. </> : null}
                      Decidido em {dataHora(aberto.decisao.decided_at)}{aberto.decisao.afeta_iqf ? "" : " · fora do IQF"}.
                    </p>
                  </div></div></div>
                )}

                {aberto.status === "ABERTO" && (
                  <div className="erp-fieldset"><div className="erp-fieldset-head">Cancelar o lote</div><div className="erp-fieldset-body">
                    <div className="erp-field erp-c8"><label className="erp-label">Motivo</label>
                      <input className="erp-input" value={motivoCancel} onChange={(e) => setMotivoCancel(e.target.value)} placeholder="Só para lote cuja entrada foi estornada (ou sem estoque retido)" /></div>
                    <div className="erp-field erp-c2"><label className="erp-label">&nbsp;</label>
                      <button className="erp-btn erp-btn-danger" onClick={() => void cancelar()} disabled={busy || !motivoCancel.trim() || !pode("EXCLUIR")}>Cancelar lote</button></div>
                  </div></div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

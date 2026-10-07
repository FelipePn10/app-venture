import { useEffect, useState } from "react";
import { previaDevolucao, criarDevolucao, type DevolucaoPrevia, type EnderecoDevolucao } from "@/services/devolucaoCompraService";
import { authorizeExit, type FiscalExit } from "@/services/nfeService";
import { errMessage } from "@/services/fiscalShared";

/**
 * Devolução de compra a partir da nota de entrada aprovada. Cria a NF-e de
 * devolução (finalidade 4, CFOP de devolução da compra — 5201/5202, 6201/6202..., nota original referenciada) em
 * rascunho; autorizada — aqui ou em VFIS0200 — a mercadoria sai do estoque pelo
 * custo médio, o valor abate os títulos em aberto da nota e o que sobrar vira
 * crédito a receber do fornecedor (VFIN0210).
 */

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qtd = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
const hoje = () => new Date().toISOString().slice(0, 10);
const ROTULO_SITUACAO: Record<string, string> = {
  DRAFT: "rascunho", AGUARDANDO_AUTORIZACAO: "aguardando a SEFAZ", AUTHORIZED: "autorizada", REJECTED: "rejeitada", CANCELLED: "cancelada",
};

const CAMPOS_ENDERECO: Array<{ campo: keyof Omit<EnderecoDevolucao, "faltando">; rotulo: string; obrigatorio: boolean; max: number }> = [
  { campo: "logradouro", rotulo: "Logradouro", obrigatorio: true, max: 60 },
  { campo: "numero", rotulo: "Número", obrigatorio: true, max: 60 },
  { campo: "complemento", rotulo: "Complemento", obrigatorio: false, max: 60 },
  { campo: "bairro", rotulo: "Bairro", obrigatorio: true, max: 60 },
  { campo: "municipio", rotulo: "Município", obrigatorio: true, max: 60 },
  { campo: "codigo_municipio", rotulo: "Código IBGE do município", obrigatorio: true, max: 7 },
  { campo: "cep", rotulo: "CEP", obrigatorio: true, max: 9 },
];

export function DevolucaoCompraPanel({ entradaId, onFeedback, onFechar }: {
  entradaId: number;
  onFeedback: (f: Feedback) => void;
  onFechar: () => void;
}): JSX.Element {
  const [previa, setPrevia] = useState<DevolucaoPrevia | null>(null);
  const [quantidades, setQuantidades] = useState<Record<number, number>>({});
  const [dataEmissao, setDataEmissao] = useState(hoje());
  const [natureza, setNatureza] = useState("DEVOLUCAO DE COMPRA");
  const [criada, setCriada] = useState<FiscalExit | null>(null);
  const [endereco, setEndereco] = useState<EnderecoDevolucao | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let vivo = true;
    previaDevolucao(entradaId)
      .then((p) => { if (vivo) { setPrevia(p); setEndereco(p.endereco); } })
      .catch((e) => { if (vivo) onFeedback({ type: "error", message: errMessage(e, "Falha ao carregar o que pode ser devolvido.") }); });
    return () => { vivo = false; };
  }, [entradaId, onFeedback]);

  const itens = previa?.itens ?? [];
  const selecionados = itens.filter((i) => (quantidades[i.fiscal_entry_item_id] ?? 0) > 0);
  const totalEstimado = selecionados.reduce((s, i) => s + (quantidades[i.fiscal_entry_item_id] ?? 0) * i.valor_unitario, 0);
  const nadaDisponivel = itens.length > 0 && itens.every((i) => i.disponivel <= 0);

  // Campos que a NF-e exige do destinatário; o que o XML não trouxe fica destacado.
  const faltandoAgora = endereco ? CAMPOS_ENDERECO.filter((c) => c.obrigatorio && !endereco[c.campo].trim()).map((c) => c.rotulo) : [];
  const setEnd = (k: keyof Omit<EnderecoDevolucao, "faltando">, v: string) => setEndereco((e) => (e ? { ...e, [k]: v } : e));

  function setQtd(id: number, v: number) { setQuantidades((q) => ({ ...q, [id]: v })); }
  function devolverTudo() { setQuantidades(Object.fromEntries(itens.filter((i) => i.disponivel > 0).map((i) => [i.fiscal_entry_item_id, i.disponivel]))); }

  async function criar() {
    if (selecionados.length === 0) { onFeedback({ type: "error", message: "Informe a quantidade a devolver de ao menos um item." }); return; }
    const excedido = selecionados.find((i) => (quantidades[i.fiscal_entry_item_id] ?? 0) > i.disponivel + 1e-9);
    if (excedido) { onFeedback({ type: "error", message: `Item ${excedido.sequence} (${excedido.descricao}): só ${qtd(excedido.disponivel)} ainda pode ser devolvido.` }); return; }
    if (faltandoAgora.length) { onFeedback({ type: "error", message: `Complete o endereço do fornecedor: ${faltandoAgora.join(", ")}.` }); return; }
    setBusy(true); onFeedback(null);
    try {
      const nf = await criarDevolucao({
        fiscal_entry_id: entradaId, data_emissao: dataEmissao, natureza_operacao: natureza.trim() || undefined,
        itens: selecionados.map((i) => ({ fiscal_entry_item_id: i.fiscal_entry_item_id, quantidade: quantidades[i.fiscal_entry_item_id] })),
        ...(endereco ? {
          dest_logradouro: endereco.logradouro, dest_numero: endereco.numero, dest_complemento: endereco.complemento,
          dest_bairro: endereco.bairro, dest_municipio: endereco.municipio, dest_codigo_municipio: endereco.codigo_municipio, dest_cep: endereco.cep,
        } : {}),
      });
      setCriada(nf);
      onFeedback({ type: "success", message: `NF-e de devolução ${nf.numero_nf || nf.id} criada em rascunho (${money(nf.valor_total)}). Autorize para efetivar.` });
    } catch (e) { onFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function autorizar() {
    if (!criada) return;
    setBusy(true); onFeedback(null);
    try {
      const nf = await authorizeExit(criada.id);
      setCriada(nf);
      const st = (nf.status || "").toUpperCase();
      const avisos = nf.warnings?.length ? ` ${nf.warnings.join(" ")}` : "";
      onFeedback(st === "AUTHORIZED"
        ? { type: "success", message: `Devolução autorizada pela SEFAZ.${avisos}` }
        : { type: "info", message: `Situação na SEFAZ: ${ROTULO_SITUACAO[st] ?? nf.status}. Acompanhe em VFIS0200.${avisos}` });
    } catch (e) { onFeedback({ type: "error", message: errMessage(e, "A SEFAZ não autorizou a devolução.") }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-fieldset">
      <div className="erp-fieldset-head">Devolver ao fornecedor{previa ? ` — NF ${previa.numero_nf}/${previa.serie} · ${previa.fornecedor}` : ""}</div>
      <div className="erp-fieldset-body">
        <div className="erp-field erp-c12"><div className="erp-feedback info">
          A NF-e de devolução sai com o CFOP de devolução de cada item (coluna CFOP) e esta nota referenciada. Autorizada, a mercadoria sai do estoque pelo custo
          médio, o valor abate os títulos em aberto desta nota e o que sobrar vira crédito a receber do fornecedor.
          Cancelar a devolução (VFIS0200) desfaz tudo enquanto o crédito não foi recebido.
        </div></div>

        {!criada && <>
          <div className="erp-field erp-c3"><label className="erp-label erp-req">Emissão</label>
            <input className="erp-input" type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} /></div>
          <div className="erp-field erp-c6"><label className="erp-label">Natureza da operação</label>
            <input className="erp-input" value={natureza} maxLength={60} onChange={(e) => setNatureza(e.target.value)} /></div>
          <div className="erp-field erp-c3" style={{ alignSelf: "end" }}>
            <button className="erp-btn" onClick={devolverTudo} disabled={busy || nadaDisponivel}>Devolver tudo o que resta</button></div>

          {endereco && (
            <div className="erp-field erp-c12">
              <div className="erp-fieldset-head" style={{ marginTop: 4 }}>
                Endereço do fornecedor (destinatário){endereco.faltando.length > 0 && <span style={{ fontWeight: 400, color: "#b45309" }}> — o XML não trouxe: {endereco.faltando.join(", ")}</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 8 }}>
                {CAMPOS_ENDERECO.map((c) => (
                  <div key={c.campo}>
                    <label className={`erp-label ${c.obrigatorio ? "erp-req" : ""}`}>{c.rotulo}</label>
                    <input className="erp-input" value={endereco[c.campo]} maxLength={c.max}
                      style={c.obrigatorio && !endereco[c.campo].trim() ? { borderColor: "#d97706" } : undefined}
                      onChange={(e) => setEnd(c.campo, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="erp-field erp-c12">
            <table className="erp-grid">
              <thead><tr><th>#</th><th>Item</th><th>Un.</th><th style={{ textAlign: "right" }}>Comprado</th><th style={{ textAlign: "right" }}>Já devolvido</th><th style={{ textAlign: "right" }}>Disponível</th><th style={{ textAlign: "right" }}>Valor unit.</th><th>CFOP</th><th style={{ width: 130 }}>Devolver</th></tr></thead>
              <tbody>
                {!previa && <tr><td colSpan={9} className="erp-grid-empty">Carregando…</td></tr>}
                {previa && itens.length === 0 && <tr><td colSpan={9} className="erp-grid-empty">A nota não tem itens.</td></tr>}
                {itens.map((i) => (
                  <tr key={i.fiscal_entry_item_id}>
                    <td>{i.sequence}</td>
                    <td>{i.item_code ? `${i.item_code} — ` : ""}{i.descricao}</td>
                    <td>{i.uom ?? "—"}</td>
                    <td style={{ textAlign: "right" }}>{qtd(i.quantidade)}</td>
                    <td style={{ textAlign: "right" }}>{qtd(i.devolvida)}</td>
                    <td style={{ textAlign: "right" }}>{qtd(i.disponivel)}</td>
                    <td style={{ textAlign: "right" }}>{money(i.valor_unitario)}</td>
                    <td>{i.cfop_devolucao}</td>
                    <td><input className="erp-input num" type="number" min={0} max={i.disponivel} step="any" disabled={i.disponivel <= 0}
                      value={quantidades[i.fiscal_entry_item_id] ?? ""} onChange={(e) => setQtd(i.fiscal_entry_item_id, Number(e.target.value))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {nadaDisponivel && <div className="erp-feedback info" style={{ marginTop: 6 }}>Tudo desta nota já foi devolvido.</div>}
          </div>
          <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <span>Mercadoria a devolver: <strong>{money(totalEstimado)}</strong> <small style={{ opacity: 0.7 }}>(os impostos destacados entram proporcionalmente na NF-e)</small></span>
            <span style={{ flex: 1 }} />
            <button className="erp-btn erp-btn-primary" onClick={() => void criar()} disabled={busy || selecionados.length === 0}>Criar NF-e de devolução</button>
            <button className="erp-btn" onClick={onFechar} disabled={busy}>Fechar</button>
          </div>
        </>}

        {criada && (
          <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span>NF-e de devolução <strong>{criada.numero_nf || `#${criada.id}`}</strong> — {money(criada.valor_total)} — situação <strong>{ROTULO_SITUACAO[(criada.status || "").toUpperCase()] ?? criada.status}</strong></span>
            <span style={{ flex: 1 }} />
            {(criada.status || "").toUpperCase() !== "AUTHORIZED" && (
              <button className="erp-btn erp-btn-primary" onClick={() => void autorizar()} disabled={busy}>{busy ? "Enviando…" : "Autorizar na SEFAZ"}</button>
            )}
            <button className="erp-btn" onClick={onFechar} disabled={busy}>Fechar</button>
          </div>
        )}
      </div>
    </div>
  );
}

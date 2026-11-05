import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { gerarCadernos, listarCadernos, marcarCadernoImpresso, type CadernoDTO } from "@/services/stockService";
import { Code128Barcode } from "@/components/ui/Code128Barcode";
import { useAcao } from "./comum";
import { FeedbackBox } from "./ui";

type Linha = Record<string, unknown>;
const SITUACAO: Record<string, string> = { GERADO: "Gerado", IMPRESSO: "Impresso", EM_DIGITACAO: "Em digitação", DIGITADO: "Digitado" };
const texto = (l: Linha, k: string) => String(l[k] ?? "");

/**
 * Cadernos e etiquetas de contagem. O papel nunca leva o saldo: serve para contagem
 * cega, e a digitação continua na lista do inventário.
 */
export function CadernosInventario({ inventario, codigo, aberto, linhas }: { inventario: number; codigo: string | number; aberto: boolean; linhas: Linha[] }) {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [cadernos, setCadernos] = useState<CadernoDTO[]>([]);
  const [porCaderno, setPorCaderno] = useState("30");
  const [impressao, setImpressao] = useState<{ numero: number; tipo: "caderno" | "etiquetas" } | null>(null);
  const carregar = useCallback(() => run(async () => { setCadernos(await listarCadernos(inventario)); }), [run, inventario]);
  useEffect(() => { void carregar(); }, [carregar]);

  const gerar = () => run(async () => {
    setCadernos(await gerarCadernos(inventario, Number(porCaderno)));
    setFeedback({ type: "success", message: "Cadernos gerados. Recarregue o inventário para ver o caderno de cada linha." });
  });
  const imprimir = (numero: number, tipo: "caderno" | "etiquetas") => run(async () => {
    flushSync(() => setImpressao({ numero, tipo }));
    window.print();
    await marcarCadernoImpresso(inventario, numero);
    setImpressao(null);
    setCadernos(await listarCadernos(inventario));
  });
  const doCaderno = impressao ? linhas.filter((l) => Number(l["notebook_number"]) === impressao.numero) : [];

  return (
    <div className="erp-fieldset"><div className="erp-fieldset-head">Cadernos e etiquetas de contagem ({cadernos.length})</div><div className="erp-fieldset-body">
      <style>{`@media print { body * { visibility: hidden; } .impressao-inventario, .impressao-inventario * { visibility: visible; } .impressao-inventario { position: absolute; left: 0; top: 0; width: 100%; } .impressao-inventario th, .impressao-inventario td { border: 1px solid #000; padding: 6px; font-size: 11px; } }`}</style>
      <FeedbackBox feedback={feedback} />
      {aberto && <>
        <div className="erp-field erp-c2"><label className="erp-label">Linhas por caderno</label><input className="erp-input num" value={porCaderno} onChange={(e) => setPorCaderno(e.target.value)} /></div>
        <div className="erp-field erp-c4" style={{ alignSelf: "end" }}><button className="erp-btn" onClick={() => void gerar()} disabled={busy}>Gerar cadernos</button></div>
      </>}
      <div className="erp-field erp-c12"><table className="erp-grid">
        <thead><tr><th>Caderno</th><th className="num">Linhas</th><th className="num">Digitadas</th><th className="num">Impressões</th><th>Situação</th><th></th></tr></thead>
        <tbody>
          {cadernos.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum caderno gerado.</td></tr>}
          {cadernos.map((c) => (
            <tr key={c.number}><td>{c.number}</td><td className="num">{c.lines}</td><td className="num">{c.counted_lines}</td><td className="num">{c.print_count}</td><td>{SITUACAO[c.status] ?? c.status}</td>
              <td style={{ display: "flex", gap: 6 }}>
                <button className="erp-btn erp-btn-sm" onClick={() => void imprimir(c.number, "caderno")} disabled={busy}>Imprimir caderno</button>
                <button className="erp-btn erp-btn-sm" onClick={() => void imprimir(c.number, "etiquetas")} disabled={busy}>Imprimir etiquetas</button>
              </td></tr>
          ))}
        </tbody>
      </table></div>
      {impressao && <div className="impressao-inventario" style={{ background: "#fff", color: "#000" }}>
        {impressao.tipo === "caderno" ? <>
          <h3>Inventário {codigo} · Caderno {impressao.numero}</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th>Endereço</th><th>Item</th><th>Máscara</th><th>Lote</th><th style={{ width: 110 }}>Contagem</th><th style={{ width: 110 }}>Conferência</th></tr></thead>
            <tbody>{doCaderno.map((l) => <tr key={texto(l, "id")}><td>{texto(l, "address") || "—"}</td><td>{texto(l, "item_code")}</td><td>{texto(l, "mask")}</td><td>{texto(l, "lot")}</td><td></td><td></td></tr>)}</tbody>
          </table>
          <p>Contado por: ______________________ Data: ____/____/______</p>
        </> : <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {doCaderno.map((l) => <div key={texto(l, "id")} style={{ border: "1px solid #000", padding: 8, breakInside: "avoid", textAlign: "center" }}>
            <div>Inv. {codigo} · Caderno {impressao.numero}</div>
            <div>{texto(l, "address") || "Sem endereço"}{texto(l, "lot") ? ` · Lote ${texto(l, "lot")}` : ""}</div>
            <Code128Barcode value={texto(l, "item_code")} />
            <div>Quantidade: ____________</div>
          </div>)}
        </div>}
      </div>}
    </div></div>
  );
}

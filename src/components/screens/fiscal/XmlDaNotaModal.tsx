import { useMemo, useState } from "react";
import { downloadBlob } from "@/services/fileDownload";

export interface CampoDaNota { rotulo: string; valor: string; mono?: boolean }

/**
 * Indenta o XML só para leitura na tela. O que se copia e se baixa é o arquivo
 * original: o XML é assinado, e mexer nos espaços invalida a assinatura.
 */
function xmlIndentado(xml: string): string {
  let nivel = 0;
  const linhas = xml.replace(/>\s*</g, ">\n<").replace(/<([\w:.-]+)([^>\n]*)>\n<\/\1>/g, "<$1$2></$1>");
  return linhas.split("\n").map((linha) => {
    const fecha = /^<\//.test(linha);
    const abreEFecha = /^<[^!?/][^>]*>.*<\/[^>]+>$/.test(linha) || /\/>$/.test(linha) || /^<[!?]/.test(linha);
    if (fecha) nivel = Math.max(nivel - 1, 0);
    const out = "  ".repeat(nivel) + linha;
    if (!fecha && !abreEFecha) nivel++;
    return out;
  }).join("\n");
}

/** Janela com o XML autorizado da nota e o que a identifica, para copiar e repassar. */
export function XmlDaNotaModal({ titulo, campos, xml, arquivo, cancelamento, onFechar }: {
  titulo: string; campos: CampoDaNota[]; xml: string; arquivo: string;
  /** XML do evento de cancelamento, quando a nota foi cancelada. */
  cancelamento?: { xml: string; arquivo: string };
  onFechar: () => void;
}) {
  const [aviso, setAviso] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [verCancelamento, setVerCancelamento] = useState(false);
  const doc = verCancelamento && cancelamento ? cancelamento : { xml, arquivo };
  const legivel = useMemo(() => xmlIndentado(doc.xml), [doc.xml]);

  async function copiar(texto: string, oque: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setAviso({ type: "success", message: `${oque} copiado.` });
    } catch {
      setAviso({ type: "error", message: `Não foi possível copiar ${oque.toLowerCase()}: selecione o texto e use Ctrl+C.` });
    }
  }

  return (
    <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="xml-da-nota" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <div className="erp-modal erp-modal-lg" style={{ width: "min(960px, 96vw)" }}>
        <div className="erp-modal-head"><div><strong id="xml-da-nota">{titulo}</strong>
          <div className="erp-field-hint">O XML é o documento fiscal: nele estão as bases, alíquotas e valores de cada imposto. Copie ou baixe para conferir ou enviar a quem precisar.</div></div></div>
        <div className="erp-modal-body">
          {aviso && <div className={`erp-feedback ${aviso.type}`} style={{ marginBottom: 12 }}>{aviso.message}</div>}
          {campos.filter((c) => c.valor).map((c) => (
            <div key={c.rotulo} className="erp-field" style={{ marginBottom: 8 }}>
              <label>{c.rotulo}</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input className="erp-input" readOnly value={c.valor} onFocus={(e) => e.target.select()} style={c.mono ? { fontFamily: "var(--font-mono)" } : undefined} />
                <button className="erp-btn erp-btn-sm" onClick={() => void copiar(c.valor, c.rotulo)}>Copiar</button>
              </div>
            </div>
          ))}
          {cancelamento && (
            <div className="erp-tabs" style={{ marginBottom: 8 }}>
              <button className={`erp-tab${verCancelamento ? "" : " active"}`} onClick={() => setVerCancelamento(false)}>Nota autorizada</button>
              <button className={`erp-tab${verCancelamento ? " active" : ""}`} onClick={() => setVerCancelamento(true)}>Cancelamento</button>
            </div>
          )}
          <div className="erp-field">
            <label>{verCancelamento && cancelamento ? "XML do cancelamento" : "XML"}</label>
            <textarea className="erp-input" readOnly value={legivel} spellCheck={false} aria-label="XML da nota"
              style={{ width: "100%", height: "46vh", fontFamily: "var(--font-mono)", fontSize: 12, whiteSpace: "pre", overflow: "auto", resize: "vertical" }} />
          </div>
        </div>
        <div className="erp-modal-actions">
          <button className="erp-btn" onClick={() => void copiar(doc.xml, "XML")}>Copiar XML</button>
          <button className="erp-btn" onClick={() => downloadBlob(new Blob([doc.xml], { type: "application/xml" }), doc.arquivo)}>Baixar XML</button>
          <button className="erp-btn erp-btn-primary" onClick={onFechar}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

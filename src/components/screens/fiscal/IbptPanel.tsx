import { useState } from "react";
import { type IbptRate, type UF, UFS, importIbpt, lookupIbpt } from "@/services/taxTableService";
import { errMessage } from "@/services/fiscalShared";

/*
 * Aba IBPT da VFIS0110: importar o CSV oficial do IBPT por UF (administrador) e
 * consultar a carga tributária aproximada de um NCM — a que sai no rodapé da nota
 * (Lei 12.741). Era a rotina genérica VFIS0630.
 */
const pct = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const data = (s?: string) => (s ? s.slice(0, 10).split("-").reverse().join("/") : "—");

export function IbptPanel({ podeEditar }: { podeEditar: boolean }): JSX.Element {
  const [ufImp, setUfImp] = useState<UF>("PR");
  const [arquivo, setArquivo] = useState<File | undefined>();
  const [consulta, setConsulta] = useState<{ ncm: string; uf: UF }>({ ncm: "", uf: "PR" });
  const [taxa, setTaxa] = useState<IbptRate | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const run = async (fn: () => Promise<void>) => { setBusy(true); setFeedback(null); try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); } };

  const importar = () => run(async () => {
    if (!arquivo) { setFeedback({ type: "error", message: "Escolha o arquivo CSV do IBPT." }); return; }
    const n = await importIbpt(ufImp, await arquivo.text());
    setFeedback({ type: "success", message: `${n.toLocaleString("pt-BR")} linha(s) da tabela IBPT de ${ufImp} importada(s).` });
  });
  const consultar = () => run(async () => {
    const ncm = consulta.ncm.replace(/\D/g, "");
    if (ncm.length !== 8) { setFeedback({ type: "error", message: "O NCM tem 8 dígitos." }); return; }
    setTaxa(null); setTaxa(await lookupIbpt(ncm, consulta.uf));
  });

  return (
    <>
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
      <div className="erp-fieldset"><div className="erp-fieldset-head">Consultar carga tributária</div><div className="erp-fieldset-body">
        <div className="erp-field erp-c3"><label className="erp-label erp-req">NCM</label><input className="erp-input" inputMode="numeric" placeholder="8 dígitos" value={consulta.ncm} onChange={(e) => setConsulta((c) => ({ ...c, ncm: e.target.value }))} /></div>
        <div className="erp-field erp-c2"><label className="erp-label erp-req">UF</label><select className="erp-input" value={consulta.uf} onChange={(e) => setConsulta((c) => ({ ...c, uf: e.target.value as UF }))}>{UFS.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
        <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-dark" onClick={() => void consultar()} disabled={busy}>Consultar</button></div>
        {taxa && <div className="erp-field erp-c12"><table className="erp-grid">
          <thead><tr><th>NCM</th><th>Descrição</th><th className="num">Federal (nacional)</th><th className="num">Federal (importado)</th><th className="num">Estadual</th><th className="num">Municipal</th><th>Vigência</th><th>Versão</th></tr></thead>
          <tbody><tr><td>{taxa.ncm}{taxa.ex ? ` ex ${taxa.ex}` : ""}</td><td>{taxa.descricao}</td><td className="num">{pct(taxa.nacional_federal)}</td><td className="num">{pct(taxa.importado_federal)}</td><td className="num">{pct(taxa.estadual)}</td><td className="num">{pct(taxa.municipal)}</td><td>{data(taxa.vigencia_inicio)} a {data(taxa.vigencia_fim)}</td><td>{taxa.versao}</td></tr></tbody>
        </table></div>}
      </div></div>
      {podeEditar && (
        <div className="erp-fieldset"><div className="erp-fieldset-head">Importar tabela IBPT</div><div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label erp-req">UF</label><select className="erp-input" value={ufImp} onChange={(e) => setUfImp(e.target.value as UF)}>{UFS.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
          <div className="erp-field erp-c6"><label className="erp-label erp-req">Arquivo CSV oficial</label><input className="erp-input" type="file" accept=".csv,text/csv,text/plain" onChange={(e) => setArquivo(e.target.files?.[0])} /></div>
          <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void importar()} disabled={busy}>Importar</button></div>
          <div className="erp-field erp-c12"><span className="erp-field-hint">O CSV do IBPT/SCI, separado por ponto e vírgula, um por UF. Cada versão importada fica guardada; a consulta e a nota usam a vigente. Reimportar a mesma versão atualiza os valores.</span></div>
        </div></div>
      )}
    </>
  );
}

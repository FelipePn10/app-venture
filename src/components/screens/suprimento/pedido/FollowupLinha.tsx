import { useCallback, useEffect, useState } from "react";
import { addLineFollowup, listLineFollowups, type Followup } from "@/services/purchaseOrderService";
import { errMessage } from "@/services/fiscalShared";

const dataBR = (s?: string) => (s ? s.slice(0, 10).split("-").reverse().join("/") : "—");
const dataHora = (s: string) => {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

/**
 * Registro do contato com o fornecedor sobre a entrega de uma linha: a nova
 * data prometida (que passa a valer no acompanhamento e na previsão de
 * pagamento), com quem se falou e o que foi dito — e o histórico.
 */
export function FollowupLinha({ code, lineCode, promessaAtual, onSalvo, onFechar }: {
  code: number; lineCode: number; promessaAtual?: string; onSalvo: (f: Followup) => void; onFechar: () => void;
}): JSX.Element {
  const [data, setData] = useState(promessaAtual?.slice(0, 10) ?? "");
  const [contato, setContato] = useState("");
  const [obs, setObs] = useState("");
  const [hist, setHist] = useState<Followup[]>([]);
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(async () => {
    try { setHist(await listLineFollowups(code, lineCode)); } catch (e) { setErro(errMessage(e)); }
  }, [code, lineCode]);
  useEffect(() => { void carregar(); }, [carregar]);

  async function salvar() {
    if (!data && !contato.trim() && !obs.trim()) { setErro("Informe a data prometida, o contato ou uma observação."); return; }
    setBusy(true);
    setErro("");
    try {
      const f = await addLineFollowup(code, lineCode, { data_prometida: data, contato: contato.trim(), observacao: obs.trim() });
      setContato(""); setObs("");
      await carregar();
      onSalvo(f);
    } catch (e) { setErro(errMessage(e)); } finally { setBusy(false); }
  }

  return (
    <div className="pdc-followup" data-testid="followup-linha">
      <div className="pdc-inline" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
        <div><label className="erp-label">Data prometida</label>
          <input className="erp-input" type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
        <div><label className="erp-label">Falei com</label>
          <input className="erp-input" value={contato} maxLength={150} placeholder="Nome do contato" onChange={(e) => setContato(e.target.value)} /></div>
        <div style={{ flex: 1, minWidth: 220 }}><label className="erp-label">Observação</label>
          <input className="erp-input" value={obs} placeholder="O que o fornecedor disse" onChange={(e) => setObs(e.target.value)} /></div>
        <button className="erp-btn erp-btn-primary erp-btn-sm" disabled={busy} onClick={() => void salvar()}>Registrar contato</button>
        <button className="erp-btn erp-btn-sm" onClick={onFechar}>Fechar</button>
      </div>
      {erro && <div className="pdc-falta" style={{ padding: "0 8px 6px" }}>{erro}</div>}
      {hist.length > 0 && (
        <table className="erp-grid" style={{ margin: "0 8px 8px", width: "calc(100% - 16px)" }}>
          <thead><tr><th>Quando</th><th>Quem registrou</th><th>Prometido para</th><th>Contato</th><th>Observação</th></tr></thead>
          <tbody>
            {hist.map((f) => (
              <tr key={f.id}><td>{dataHora(f.registrado_em)}</td><td>{f.registrado_por ?? "—"}</td><td>{dataBR(f.data_prometida)}</td>
                <td>{f.contato ?? "—"}</td><td>{f.observacao ?? "—"}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

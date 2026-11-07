import { useEffect, useState } from "react";
import { listarSetores, responsaveisDoGrupo, salvarResponsaveisDoGrupo, type Setor } from "@/services/setorService";
import { errMessage } from "@/services/fiscalShared";

/**
 * Setor responsável pelo planejamento e pelas compras dos itens do grupo. O item
 * herda daqui; as pessoas ficam no setor (VNOT0100 › Setores).
 */
export function ResponsaveisDoGrupo({ grupo }: { grupo: number }): JSX.Element {
  const [setores, setSetores] = useState<Setor[]>([]);
  const [planejamento, setPlanejamento] = useState("");
  const [compras, setCompras] = useState("");
  const [aviso, setAviso] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let vivo = true;
    void Promise.all([listarSetores(), responsaveisDoGrupo(grupo)]).then(([s, r]) => {
      if (!vivo) return;
      setSetores(s); setPlanejamento(r.planning_department ?? ""); setCompras(r.purchasing_department ?? ""); setAviso(null);
    }).catch((e) => { if (vivo) setAviso({ tipo: "error", texto: errMessage(e) }); });
    return () => { vivo = false; };
  }, [grupo]);
  const ativos = setores.filter((s) => s.active);
  const pessoas = (codigo: string) => setores.find((s) => s.code === codigo)?.members.map((m) => m.name || m.email).join(", ") || "sem pessoas no setor";
  const gravar = async () => {
    setBusy(true); setAviso(null);
    try { await salvarResponsaveisDoGrupo(grupo, planejamento, compras); setAviso({ tipo: "success", texto: "Responsáveis gravados." }); }
    catch (e) { setAviso({ tipo: "error", texto: errMessage(e) }); } finally { setBusy(false); }
  };
  return (
    <div className="erp-fieldset" id="grupo-responsaveis"><div className="erp-fieldset-head">Responsáveis pelos itens do grupo</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c12"><small className="erp-hint">Os itens deste grupo herdam estes setores. Quem sai da empresa ou muda de área é trocado no setor (VNOT0100 › Setores), sem mexer no grupo nem nos itens.</small></div>
      {aviso && <div className={`erp-field erp-c12 erp-feedback ${aviso.tipo}`}>{aviso.texto}</div>}
      <div className="erp-field erp-c5"><label className="erp-label">Planejamento</label>
        <select className="erp-input" id="grupo-setor-planejamento" value={planejamento} onChange={(e) => setPlanejamento(e.target.value)}><option value="">Sem setor</option>{ativos.map((s) => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}</select>
        {planejamento && <small className="erp-hint">{pessoas(planejamento)}</small>}</div>
      <div className="erp-field erp-c5"><label className="erp-label">Compras</label>
        <select className="erp-input" id="grupo-setor-compras" value={compras} onChange={(e) => setCompras(e.target.value)}><option value="">Sem setor</option>{ativos.map((s) => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}</select>
        {compras && <small className="erp-hint">{pessoas(compras)}</small>}</div>
      <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" id="grupo-responsaveis-gravar" disabled={busy} onClick={() => void gravar()}>Gravar</button></div>
      {setores.length === 0 && <div className="erp-field erp-c12"><small className="erp-hint">Nenhum setor cadastrado: cadastre em VNOT0100 › Setores.</small></div>}
    </div></div>
  );
}

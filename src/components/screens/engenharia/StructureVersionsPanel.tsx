import { useCallback, useEffect, useState } from "react";
import { type BomChange, type BomVersion, bomVersionChanges, createBomVersion, listBomVersions, setBomVersionStatus } from "@/services/bomHeaderService";
import { errMessage } from "@/services/fiscalShared";
import { confirmar } from "@/components/ui/dialogos";
import { CFG_STYLES } from "./StructureConfiguratorPanel";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { hojeLocal } from "@/utils/dataLocal";

/**
 * Versões da estrutura (cabeçalho da BOM), no modelo do SAP e da revisão do
 * Protheus: rascunho → aprovada → obsoleta, uma aprovada por tipo. A MBOM
 * (fabricação) aprovada libera o item para produzir; a EBOM é a de engenharia.
 * Aprovar guarda a foto das linhas; "O que mudou" compara a foto com a estrutura
 * de agora. Era a VBOM0100, que só registrava um número sem efeito.
 */
type Props = { itemCode: string; itemName?: string; mask?: string; onClose: () => void };

const SITUACAO: Record<BomVersion["status"], { rotulo: string; classe: string }> = {
  DRAFT: { rotulo: "Rascunho", classe: "erp-badge draft" },
  APPROVED: { rotulo: "Aprovada", classe: "erp-badge ok" },
  OBSOLETE: { rotulo: "Obsoleta", classe: "erp-badge gray" },
};
const TIPO = { MBOM: "Fabricação (MBOM)", EBOM: "Engenharia (EBOM)" };
const data = (s?: string) => (s ? new Date(s).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—");
const MUDANCA = { INCLUIDO: "Incluído", REMOVIDO: "Removido", ALTERADO: "Alterado" };

export function StructureVersionsPanel({ itemCode, itemName, mask, onClose }: Props): JSX.Element {
  useEscapeToClose(onClose);
  const [versoes, setVersoes] = useState<BomVersion[]>([]);
  const [nova, setNova] = useState<{ tipo: "MBOM" | "EBOM"; vigencia: string }>({ tipo: "MBOM", vigencia: hojeLocal() });
  const [mudancas, setMudancas] = useState<{ versao: BomVersion; itens: BomChange[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "err"; msg: string } | null>(null);

  const daMascara = (v: BomVersion) => (v.mask ?? "") === (mask ?? "");
  const carregar = useCallback(async () => { setVersoes((await listBomVersions(itemCode)).filter(daMascara)); }, [itemCode, mask]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void carregar().catch((e) => setAviso({ tipo: "err", msg: errMessage(e) })); }, [carregar]);

  const run = async (fn: () => Promise<void>) => { setBusy(true); setAviso(null); try { await fn(); } catch (e) { setAviso({ tipo: "err", msg: errMessage(e) }); } finally { setBusy(false); } };
  const criar = () => run(async () => { const v = await createBomVersion(itemCode, nova.tipo, mask, nova.vigencia); await carregar(); setAviso({ tipo: "ok", msg: `Versão ${v.version} aberta como rascunho. Ajuste a estrutura e aprove.` }); });
  const aprovar = async (v: BomVersion) => {
    const anterior = versoes.find((x) => x.status === "APPROVED" && x.bom_type === v.bom_type);
    if (!(await confirmar({ titulo: `Aprovar a versão ${v.version}`, mensagem: `A estrutura de agora fica registrada nesta versão${anterior ? ` e a versão ${anterior.version} fica obsoleta` : ""}.${v.bom_type === "MBOM" ? " É esta que libera o item para produzir." : ""}`, assunto: `${TIPO[v.bom_type]} · versão ${v.version}`, rotulo: "Aprovar" }))) return;
    void run(async () => { await setBomVersionStatus(v.id, "APPROVED"); await carregar(); setAviso({ tipo: "ok", msg: `Versão ${v.version} aprovada.` }); });
  };
  const obsoletar = async (v: BomVersion) => {
    if (!(await confirmar({ titulo: v.status === "DRAFT" ? "Descartar rascunho" : "Tornar obsoleta", mensagem: v.status === "APPROVED" && v.bom_type === "MBOM" ? "Sem versão de fabricação aprovada, o item deixa de estar pronto para produzir." : "A versão não volta a valer.", assunto: `${TIPO[v.bom_type]} · versão ${v.version}`, rotulo: v.status === "DRAFT" ? "Descartar" : "Tornar obsoleta", tom: "perigo" }))) return;
    void run(async () => { await setBomVersionStatus(v.id, "OBSOLETE"); await carregar(); });
  };
  const verMudancas = (v: BomVersion) => run(async () => { setMudancas({ versao: v, itens: await bomVersionChanges(v.id) }); });

  return (
    <>
      <style>{CFG_STYLES}</style>
      <div className="cfg-backdrop" role="dialog" aria-modal="true" aria-label="Versões da estrutura">
        <div className="cfg-modal" style={{ width: "min(960px, 96vw)" }}>
          <header className="cfg-head">
            <div>
              <div className="cfg-head-title">Versões da estrutura</div>
              <div className="cfg-head-sub">Item {itemCode}{itemName ? ` — ${itemName}` : ""}{mask ? ` · máscara ${mask}` : ""}</div>
            </div>
            <button className="cfg-btn cfg-btn-ghost" onClick={onClose}>Fechar</button>
          </header>
          <div className="cfg-body">
            {aviso && <div className={`cfg-alert ${aviso.tipo}`}>{aviso.msg}</div>}
            <section className="cfg-card">
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                <label className="erp-label" style={{ display: "grid", gap: 4 }}>Tipo
                  <select className="erp-input" value={nova.tipo} onChange={(e) => setNova((n) => ({ ...n, tipo: e.target.value as "MBOM" | "EBOM" }))}><option value="MBOM">{TIPO.MBOM}</option><option value="EBOM">{TIPO.EBOM}</option></select></label>
                <label className="erp-label" style={{ display: "grid", gap: 4 }}>Vale a partir de
                  <input className="erp-input" type="date" value={nova.vigencia} onChange={(e) => setNova((n) => ({ ...n, vigencia: e.target.value }))} /></label>
                <button className="cfg-btn" onClick={() => void criar()} disabled={busy}>Abrir nova versão</button>
              </div>
              <p className="erp-hint" style={{ marginTop: 8 }}>A versão de <strong>fabricação</strong> aprovada é a que libera o item para produzir: depois que o item ganha a primeira versão, ele só produz com uma aprovada e vigente. Aprovar a nova torna a anterior obsoleta. Aprovada não volta a rascunho — para mudar, abra outra versão.</p>
            </section>
            <table className="erp-grid">
              <thead><tr><th>Versão</th><th>Tipo</th><th>Situação</th><th>Vale a partir de</th><th>Aprovada em</th><th style={{ width: 280 }} /></tr></thead>
              <tbody>
                {versoes.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Sem versões: a estrutura não está sob controle de versão.</td></tr>}
                {versoes.map((v) => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 700 }}>{v.version}</td><td>{TIPO[v.bom_type] ?? v.bom_type}</td>
                    <td><span className={SITUACAO[v.status]?.classe}>{SITUACAO[v.status]?.rotulo ?? v.status}</span></td>
                    <td>{data(v.valid_from)}</td><td>{v.approved_at ? new Date(v.approved_at).toLocaleString("pt-BR") : "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {v.status === "DRAFT" && <button className="erp-btn erp-btn-sm erp-btn-primary" disabled={busy} onClick={() => void aprovar(v)}>Aprovar</button>}{" "}
                      {v.status === "APPROVED" && <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => void verMudancas(v)}>O que mudou</button>}{" "}
                      {v.status !== "OBSOLETE" && <button className="erp-btn erp-btn-sm erp-btn-danger" disabled={busy} onClick={() => void obsoletar(v)}>{v.status === "DRAFT" ? "Descartar" : "Tornar obsoleta"}</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {mudancas && (
              <section className="cfg-card" style={{ marginTop: 10 }}>
                <div className="cfg-head-title" style={{ fontSize: 13 }}>Desde a aprovação da versão {mudancas.versao.version}</div>
                {mudancas.itens.length === 0 ? <div className="cfg-empty">A estrutura está igual à aprovada.</div> : (
                  <table className="erp-grid" style={{ marginTop: 6 }}>
                    <thead><tr><th>Seq.</th><th>Componente</th><th>Mudança</th><th>Detalhe</th></tr></thead>
                    <tbody>{mudancas.itens.map((m, i) => <tr key={i}><td>{m.sequence}</td><td>{m.child_code}{m.child_name ? ` — ${m.child_name}` : ""}</td><td>{MUDANCA[m.kind] ?? m.kind}</td><td>{m.detail}</td></tr>)}</tbody>
                  </table>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

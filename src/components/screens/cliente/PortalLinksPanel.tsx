import { useCallback, useEffect, useState } from "react";
import { criarLinkPortal, listarLinksPortal, revogarLinkPortal, type LinkPortal } from "@/services/gestaoService";
import { confirmar } from "@/components/ui/dialogos";
import { Aviso, Painel, Selo, Vazio } from "../planejamento/planUi";
import { dataHora, data } from "../planejamento/planFormat";
import { useAcao } from "../planejamento/planHooks";

/**
 * Aba "Portal do cliente" da VCLI0500: gera o link pessoal do cliente (vale X
 * dias, revogável), mostra o último acesso e revoga. O link completo só aparece
 * na hora de gerar — o banco guarda apenas o hash do token.
 */
export function PortalLinksPanel({ cliente }: { cliente: number }): JSX.Element {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [links, setLinks] = useState<LinkPortal[] | null>(null);
  const [dias, setDias] = useState(30);
  const [descricao, setDescricao] = useState("");
  const [novo, setNovo] = useState<LinkPortal | null>(null);

  const listar = useCallback(async () => { setLinks(await listarLinksPortal(cliente)); }, [cliente]);
  useEffect(() => { void run(listar); }, [run, listar]);

  const gerar = () => void run(async () => {
    const l = await criarLinkPortal(cliente, dias, descricao);
    setNovo(l); setDescricao(""); await listar();
  });
  const endereco = (l: LinkPortal) => l.url || `${window.location.origin}${window.location.pathname}#/portal/${l.token}`;
  const revogar = async (l: LinkPortal) => {
    if (!(await confirmar({ titulo: "Revogar o link do portal", mensagem: "Quem tiver este link deixa de acessar o portal na hora. Para voltar a dar acesso, gere um link novo.", rotulo: "Revogar", tom: "perigo" }))) return;
    void run(async () => { await revogarLinkPortal(l.id); await listar(); setFeedback({ type: "success", message: "Link revogado." }); });
  };
  const situacao = (l: LinkPortal) => l.revoked_at ? <Selo tom="muted">Revogado</Selo> : new Date(l.expires_at) < new Date() ? <Selo tom="warn">Vencido</Selo> : <Selo tom="ok">Ativo</Selo>;

  return (<>
    <Aviso feedback={feedback} busy={busy} />
    <Painel titulo="Gerar link de acesso" sub="o cliente vê os pedidos e notas dele e pode pedir de novo; o pedido chega como rascunho para o comercial confirmar">
      <div className="erp-fieldset-body" style={{ padding: 0 }}>
        <div className="erp-field erp-c3"><label className="erp-label" htmlFor="pl-dias">Vale por</label>
          <select id="pl-dias" className="erp-input" value={dias} onChange={(e) => setDias(Number(e.target.value))}>
            {[7, 30, 90, 180, 365].map((d) => <option key={d} value={d}>{d} dias</option>)}
          </select></div>
        <div className="erp-field erp-c6"><label className="erp-label" htmlFor="pl-desc">Para quem</label>
          <input id="pl-desc" className="erp-input" maxLength={120} placeholder="ex.: compras — Maria" value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
        <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={gerar} disabled={busy}>Gerar link</button></div>
      </div>
      {novo?.token && (
        <div className="erp-feedback success" style={{ marginTop: 10 }}>
          <div style={{ marginBottom: 6 }}>Link gerado. Copie e envie ao cliente — <strong>ele não aparece de novo</strong>.</div>
          <div style={{ display: "flex", gap: 6 }}>
            <input className="erp-input" readOnly value={endereco(novo)} onFocus={(e) => e.target.select()} style={{ fontFamily: "var(--font-mono)", fontSize: 12 }} />
            <button className="erp-btn erp-btn-sm" onClick={() => void navigator.clipboard?.writeText(endereco(novo)).then(() => setFeedback({ type: "success", message: "Link copiado." }))}>Copiar</button>
          </div>
        </div>
      )}
    </Painel>
    <Painel titulo="Links deste cliente" flush>
      {links === null ? <Vazio titulo="Carregando…" /> : links.length === 0 ? <Vazio titulo="Nenhum link gerado" texto="Gere um link acima e envie ao cliente por e-mail ou WhatsApp." /> : (
        <table className="erp-grid">
          <thead><tr><th>Para quem</th><th>Criado</th><th>Vale até</th><th>Último acesso</th><th className="num">Acessos</th><th>Situação</th><th /></tr></thead>
          <tbody>{links.map((l) => (
            <tr key={l.id}>
              <td>{l.description || "—"}</td><td>{data(l.created_at)}</td><td>{data(l.expires_at)}</td>
              <td>{l.last_access_at ? dataHora(l.last_access_at) : "nunca"}</td><td className="num">{l.access_count}</td><td>{situacao(l)}</td>
              <td>{!l.revoked_at && <button className="erp-btn erp-btn-sm erp-btn-danger" onClick={() => void revogar(l)} disabled={busy}>Revogar</button>}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </Painel>
  </>);
}

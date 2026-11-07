import { useCallback, useEffect, useState } from "react";
import { definirPessoasDoSetor, listarSetores, salvarSetor, type Setor } from "@/services/setorService";
import { listNotificationUsers, type NotificationUserRecipient } from "@/services/notificationService";
import { errMessage } from "@/services/fiscalShared";

/**
 * Setores e as pessoas de cada um. Os alertas podem ir para um setor, e o grupo
 * do PDM aponta para o setor responsável pelo planejamento e pelas compras dos
 * itens. Quem sai da empresa ou muda de área sai do setor; nenhum cadastro de
 * item ou de grupo precisa mudar.
 */
export function SetoresSecao(): JSX.Element {
  const [setores, setSetores] = useState<Setor[]>([]);
  const [usuarios, setUsuarios] = useState<NotificationUserRecipient[]>([]);
  const [form, setForm] = useState({ code: "", name: "", active: true });
  const [aberto, setAberto] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [aviso, setAviso] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const carregar = useCallback(async () => {
    try { setSetores(await listarSetores()); } catch (e) { setAviso({ tipo: "error", texto: errMessage(e) }); }
  }, []);
  useEffect(() => { void carregar(); void listNotificationUsers().then(setUsuarios).catch(() => setUsuarios([])); }, [carregar]);
  const executar = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true); setAviso(null);
    try { await fn(); setAviso({ tipo: "success", texto: ok }); await carregar(); } catch (e) { setAviso({ tipo: "error", texto: errMessage(e) }); } finally { setBusy(false); }
  };
  const abrirPessoas = (s: Setor) => { setAberto(s.code); setMarcados(s.members.map((m) => m.user_id)); };
  return (<>
    <div className="erp-fieldset" id="setores"><div className="erp-fieldset-head">Setores</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c12"><small className="erp-hint">O setor é usado como destinatário de alertas e como responsável, em cada grupo do PDM (VITE0114), pelo planejamento e pelas compras dos itens. Troque as pessoas aqui quando alguém sair ou mudar de área.</small></div>
      {aviso && <div className={`erp-field erp-c12 erp-feedback ${aviso.tipo}`}>{aviso.texto}</div>}
      <div className="erp-field erp-c3"><label className="erp-label erp-req">Código</label><input className="erp-input" id="setor-codigo" maxLength={60} value={form.code} placeholder="COMPRAS" onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} /></div>
      <div className="erp-field erp-c5"><label className="erp-label erp-req">Nome</label><input className="erp-input" id="setor-nome" maxLength={120} value={form.name} placeholder="Compras de aço" onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
      <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><label className="erp-check"><input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} /> Ativo</label></div>
      <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" id="setor-gravar" disabled={busy} onClick={() => void executar(async () => { await salvarSetor(form); setForm({ code: "", name: "", active: true }); }, "Setor gravado.")}>Gravar setor</button></div>
      <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
        <table className="erp-grid">
          <thead><tr><th>Código</th><th>Nome</th><th>Pessoas</th><th>Situação</th><th /></tr></thead>
          <tbody>
            {setores.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum setor cadastrado.</td></tr>}
            {setores.map((s) => (
              <tr key={s.code}>
                <td><strong>{s.code}</strong></td><td>{s.name}</td><td>{s.members.map((m) => m.name || m.email).join(", ") || "—"}</td>
                <td>{s.active ? "Ativo" : "Desativado"}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="erp-btn erp-btn-sm" onClick={() => setForm({ code: s.code, name: s.name, active: s.active })}>Alterar</button>{" "}
                  <button className="erp-btn erp-btn-sm" onClick={() => abrirPessoas(s)}>Pessoas</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div></div>
    {aberto && <div className="erp-fieldset" id="setor-pessoas"><div className="erp-fieldset-head">Pessoas do setor {aberto}</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c12" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 6 }}>
        {usuarios.filter((u) => u.active).map((u) => (
          <label key={u.id} className="erp-check"><input type="checkbox" checked={marcados.includes(u.id)} onChange={(e) => setMarcados((l) => (e.target.checked ? [...l, u.id] : l.filter((x) => x !== u.id)))} /> {u.name}</label>
        ))}
      </div>
      <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8 }}>
        <button className="erp-btn erp-btn-primary" id="setor-pessoas-gravar" disabled={busy} onClick={() => void executar(async () => { await definirPessoasDoSetor(aberto, marcados); setAberto(null); }, "Pessoas do setor gravadas.")}>Gravar pessoas</button>
        <button className="erp-btn" onClick={() => setAberto(null)}>Fechar</button>
      </div>
    </div></div>}
  </>);
}

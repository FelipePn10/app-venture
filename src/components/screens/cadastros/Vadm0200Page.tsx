import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type AcaoAcesso, type ModuloAcesso, type PerfilAcesso, type UsuarioAcesso, ROTULO_ACAO,
  atualizarPerfil, catalogoAcesso, criarPerfil, definirPerfisDoUsuario, excluirPerfil, listarPerfis, listarUsuariosAcesso,
} from "@/services/acessoService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";
import { useAuthStore } from "@/store/authStore";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Aba = "perfis" | "usuarios";
const ACOES: AcaoAcesso[] = ["LER", "INCLUIR_ALTERAR", "EXCLUIR", "APROVAR", "AUTORIZAR", "EXECUTAR"];
const chave = (modulo: string, acao: string) => `${modulo}:${acao}`;
const FORM_VAZIO = { id: 0, nome: "", descricao: "", ativo: true, marcadas: new Set<string>() };

export function Vadm0200Page(): JSX.Element {
  const isAdmin = useAuthStore((state) => state.user?.role?.toUpperCase() === "ADMIN");
  const [aba, setAba] = useState<Aba>("perfis");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [busy, setBusy] = useState(false);
  const [catalogo, setCatalogo] = useState<ModuloAcesso[]>([]);
  const [perfis, setPerfis] = useState<PerfilAcesso[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioAcesso[]>([]);
  const [form, setForm] = useState(FORM_VAZIO);
  const [vinculos, setVinculos] = useState<Record<string, number[]>>({});

  const recarregar = useCallback(async () => {
    if (!isAdmin) return;
    setBusy(true);
    try {
      const [c, p, u] = await Promise.all([catalogoAcesso(), listarPerfis(), listarUsuariosAcesso()]);
      setCatalogo(c); setPerfis(p); setUsuarios(u);
      setVinculos(Object.fromEntries(u.map((x) => [x.user_id, x.perfis])));
    } catch (e) {
      setFeedback({ type: "error", message: errMessage(e, "Falha ao carregar os perfis de acesso.") });
    } finally { setBusy(false); }
  }, [isAdmin]);
  useEffect(() => { void recarregar(); }, [recarregar]);

  const nomePerfil = useMemo(() => new Map(perfis.map((p) => [p.id, p.nome])), [perfis]);

  function editar(p: PerfilAcesso) {
    setForm({ id: p.id, nome: p.nome, descricao: p.descricao ?? "", ativo: p.ativo, marcadas: new Set(p.permissoes.map((x) => chave(x.modulo, x.acao))) });
    setFeedback(null);
  }

  function alternar(modulo: string, acao: AcaoAcesso) {
    setForm((f) => {
      const m = new Set(f.marcadas);
      const k = chave(modulo, acao);
      if (m.has(k)) {
        m.delete(k);
        // Sem consultar, nenhuma outra ação faz sentido no módulo.
        if (acao === "LER") ACOES.forEach((a) => m.delete(chave(modulo, a)));
      } else {
        m.add(k);
        m.add(chave(modulo, "LER"));
      }
      return { ...f, marcadas: m };
    });
  }

  function alternarModulo(mod: ModuloAcesso) {
    setForm((f) => {
      const m = new Set(f.marcadas);
      const todas = mod.acoes.every((a) => m.has(chave(mod.modulo, a)));
      mod.acoes.forEach((a) => (todas ? m.delete(chave(mod.modulo, a)) : m.add(chave(mod.modulo, a))));
      return { ...f, marcadas: m };
    });
  }

  async function gravarPerfil() {
    if (!form.nome.trim()) { setFeedback({ type: "error", message: "Informe o nome do perfil." }); return; }
    const permissoes = [...form.marcadas].map((k) => { const [modulo, acao] = k.split(":"); return { modulo, acao: acao as AcaoAcesso }; });
    const dto = { nome: form.nome.trim(), descricao: form.descricao.trim() || undefined, ativo: form.ativo, permissoes };
    setBusy(true); setFeedback(null);
    try {
      if (form.id) await atualizarPerfil(form.id, dto); else await criarPerfil(dto);
      setFeedback({ type: "success", message: `Perfil "${dto.nome}" gravado.` });
      setForm(FORM_VAZIO); await recarregar();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function removerPerfil(p: PerfilAcesso) {
    setBusy(true); setFeedback(null);
    try {
      await excluirPerfil(p.id);
      setFeedback({ type: "success", message: `Perfil "${p.nome}" excluído.` });
      if (form.id === p.id) setForm(FORM_VAZIO);
      await recarregar();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  async function gravarVinculo(u: UsuarioAcesso) {
    setBusy(true); setFeedback(null);
    try {
      await definirPerfisDoUsuario(u.user_id, vinculos[u.user_id] ?? []);
      setFeedback({ type: "success", message: (vinculos[u.user_id] ?? []).length === 0
        ? `${u.nome || u.email} ficou sem perfil: volta a valer só o papel (${u.papel}).`
        : `Perfis de ${u.nome || u.email} gravados.` });
      await recarregar();
    } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  const alternarVinculo = (userId: string, perfilId: number) => setVinculos((v) => {
    const atual = new Set(v[userId] ?? []);
    if (atual.has(perfilId)) atual.delete(perfilId); else atual.add(perfilId);
    return { ...v, [userId]: [...atual].sort((a, b) => a - b) };
  });
  const mudou = (u: UsuarioAcesso) => (vinculos[u.user_id] ?? []).join(",") !== u.perfis.join(",");

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Cadastros</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Perfis de Acesso</span><span className="erp-crumb-code">VADM0200</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Cadastro</span>
          <button className="erp-btn erp-btn-new" onClick={() => { setForm(FORM_VAZIO); setAba("perfis"); }} disabled={busy || !isAdmin}>+ Novo Perfil</button>
          <button className="erp-btn" onClick={() => void recarregar()} disabled={busy || !isAdmin}>Atualizar</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VADM0200 — Perfis de Acesso" filename="vadm0200" />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs">
            <button className={`erp-tab ${aba === "perfis" ? "active" : ""}`} onClick={() => setAba("perfis")}>Perfis</button>
            <button className={`erp-tab ${aba === "usuarios" ? "active" : ""}`} onClick={() => setAba("usuarios")}>Usuários</button>
          </div>
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
            {!isAdmin && <div className="erp-feedback info">Somente o administrador da empresa mantém os perfis de acesso.</div>}

            {isAdmin && aba === "perfis" && (<>
              <div className="erp-fieldset"><div className="erp-fieldset-head">Como funciona</div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <small>
                  O papel do usuário (Administrador, Usuário, Operador, Consulta) continua valendo. O perfil restringe dentro dele: quem tem
                  perfil nesta empresa só faz o que algum dos seus perfis permite; quem não tem perfil segue só com o papel. Administradores
                  não são restringidos. Pesquisar itens, clientes, fornecedores e outros cadastros de apoio é liberado para todos os perfis.
                </small>
              </div></div></div>

              <div className="erp-fieldset"><div className="erp-fieldset-head">{form.id ? `Editar perfil — ${form.nome}` : "Novo perfil"}</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c4"><label className="erp-label erp-req">Nome</label>
                  <input className="erp-input" maxLength={80} value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex.: Vendas, Faturamento, PCP" /></div>
                <div className="erp-field erp-c6"><label className="erp-label">Descrição</label>
                  <input className="erp-input" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} /></div>
                <div className="erp-field erp-c2"><label className="erp-label">Situação</label>
                  <select className="erp-input" value={form.ativo ? "1" : "0"} onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.value === "1" }))}>
                    <option value="1">Ativo</option><option value="0">Inativo</option>
                  </select></div>
                <div className="erp-field erp-c12">
                  <table className="erp-grid">
                    <thead><tr><th>Módulo</th>{ACOES.map((a) => <th key={a} style={{ textAlign: "center" }}>{ROTULO_ACAO[a]}</th>)}<th style={{ width: 90 }} /></tr></thead>
                    <tbody>
                      {catalogo.map((m) => (
                        <tr key={m.modulo}>
                          <td>{m.nome}</td>
                          {ACOES.map((a) => (
                            <td key={a} style={{ textAlign: "center" }}>
                              {m.acoes.includes(a)
                                ? <input type="checkbox" aria-label={`${m.nome} — ${ROTULO_ACAO[a]}`} checked={form.marcadas.has(chave(m.modulo, a))} onChange={() => alternar(m.modulo, a)} />
                                : <span style={{ opacity: 0.3 }}>—</span>}
                            </td>
                          ))}
                          <td><button className="erp-btn erp-btn-sm" onClick={() => alternarModulo(m)}>Tudo</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="erp-field erp-c12">
                  <button className="erp-btn erp-btn-primary" onClick={() => void gravarPerfil()} disabled={busy}>{form.id ? "Atualizar perfil" : "Gravar perfil"}</button>
                  {form.id > 0 && <> <button className="erp-btn" onClick={() => setForm(FORM_VAZIO)} disabled={busy}>Cancelar edição</button></>}
                </div>
              </div></div>

              <div className="erp-fieldset"><div className="erp-fieldset-head">Perfis da empresa — <span style={{ fontWeight: 400, opacity: 0.65 }}>{perfis.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead><tr><th>Perfil</th><th>Situação</th><th>Módulos</th><th className="num">Usuários</th><th style={{ width: 170 }}>Ações</th></tr></thead>
                  <tbody>
                    {perfis.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhum perfil: todos os usuários seguem só com o papel.</td></tr>}
                    {perfis.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.nome}{p.descricao && <><br /><small style={{ opacity: 0.7 }}>{p.descricao}</small></>}</td>
                        <td>{p.ativo ? <span className="erp-badge erp-badge-green">Ativo</span> : <span className="erp-badge erp-badge-gray">Inativo</span>}</td>
                        <td><small>{[...new Set(p.permissoes.map((x) => catalogo.find((m) => m.modulo === x.modulo)?.nome.split(" (")[0] ?? x.modulo))].join(", ") || "—"}</small></td>
                        <td className="num">{p.usuarios}</td>
                        <td>
                          <button className="erp-btn erp-btn-sm" onClick={() => editar(p)}>Editar</button>{" "}
                          <button className="erp-btn erp-btn-sm" onClick={() => void removerPerfil(p)} disabled={busy || p.usuarios > 0} title={p.usuarios > 0 ? "Retire o perfil dos usuários ou inative-o" : undefined}>Excluir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div></div></div>
            </>)}

            {isAdmin && aba === "usuarios" && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Usuários da empresa — <span style={{ fontWeight: 400, opacity: 0.65 }}>{usuarios.length}</span></div><div className="erp-fieldset-body"><div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead><tr><th>Usuário</th><th>Papel</th><th>Perfis</th><th style={{ width: 110 }}>Ações</th></tr></thead>
                  <tbody>
                    {usuarios.map((u) => (
                      <tr key={u.user_id}>
                        <td style={{ fontWeight: 600 }}>{u.nome || u.email}<br /><small style={{ opacity: 0.7 }}>{u.email}</small></td>
                        <td>{u.papel}{u.papel === "ADMIN" && <><br /><small style={{ opacity: 0.7 }}>não é restringido</small></>}</td>
                        <td>
                          {perfis.length === 0 && <small>Cadastre um perfil na aba Perfis.</small>}
                          {perfis.map((p) => (
                            <label key={p.id} style={{ marginRight: 14, whiteSpace: "nowrap", opacity: p.ativo ? 1 : 0.55 }}>
                              <input type="checkbox" checked={(vinculos[u.user_id] ?? []).includes(p.id)} onChange={() => alternarVinculo(u.user_id, p.id)} /> {p.nome}
                            </label>
                          ))}
                          {(vinculos[u.user_id] ?? []).length === 0 && perfis.length > 0 && <><br /><small style={{ opacity: 0.7 }}>Sem perfil: vale só o papel.</small></>}
                        </td>
                        <td><button className="erp-btn erp-btn-sm erp-btn-primary" onClick={() => void gravarVinculo(u)} disabled={busy || !mudou(u)}>Gravar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div></div></div>
            )}
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div style={{ display: "contents" }}>
          <div className="erp-status-item">Perfis: <strong>{perfis.length}</strong></div>
          <div className="erp-status-item">Usuários com perfil: <strong>{usuarios.filter((u) => u.perfis.length > 0).length}</strong></div>
          {form.id > 0 && <div className="erp-status-item">Editando: <strong>{nomePerfil.get(form.id)}</strong></div>}
        </div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

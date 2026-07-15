import { useState, useCallback } from "react";
import { type UF, type Country, listUFs, createUF, updateUF, listCountries, createCountry } from "@/services/cidadeUfService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const EMPTY: UF = { sigla: "", name: "", country_sigla: "BR", ibge_code: "" };

export function Vutl0555Page(): JSX.Element {
  const [ufs, setUfs] = useState<UF[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [form, setForm] = useState<UF>({ ...EMPTY });
  const [editing, setEditing] = useState(false);
  const [newCountry, setNewCountry] = useState({ sigla: "", name: "" });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);
  const setF = <K extends keyof UF>(k: K, v: UF[K]) => setForm((p) => ({ ...p, [k]: v }));

  const carregar = () => run(async () => { const [u, c] = await Promise.all([listUFs(), listCountries()]); setUfs(u); setCountries(c); });
  const novo = () => { setForm({ ...EMPTY }); setEditing(false); };
  const selecionar = (u: UF) => { setForm({ ...u }); setEditing(true); };

  const salvar = () => run(async () => {
    if (!form.sigla.trim() || !form.name.trim() || !form.country_sigla.trim()) { setFeedback({ type: "error", message: "Sigla, nome e país são obrigatórios." }); return; }
    if (editing) { await updateUF(form); setFeedback({ type: "success", message: `UF ${form.sigla} atualizada.` }); }
    else { await createUF(form); setFeedback({ type: "success", message: `UF ${form.sigla} criada.` }); }
    setUfs(await listUFs()); novo();
  });
  const criarPais = () => run(async () => {
    if (!newCountry.sigla.trim() || !newCountry.name.trim()) { setFeedback({ type: "error", message: "Sigla e nome do país são obrigatórios." }); return; }
    await createCountry(newCountry); setNewCountry({ sigla: "", name: "" }); setCountries(await listCountries()); setFeedback({ type: "success", message: "País criado." });
  });

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs">
          <span className="erp-crumb-mut">Contabilidade</span><span className="erp-crumb-sep">›</span>
          <span className="erp-crumb-cur">Cadastro de UFs e Países</span><span className="erp-crumb-code">VUTL0555</span>
        </nav>
        <div className="erp-titlebar-spacer" />
        <span className="erp-titlebar-meta">{ufs.length} UF(s)</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Localização</span>
          <button className="erp-btn erp-btn-dark" onClick={() => void carregar()} disabled={busy}>{busy && <span className="erp-spin" />}Carregar</button>
          <button className="erp-btn" onClick={novo} disabled={busy}>Nova UF</button></div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VUTL0555 — Cadastro de UFs e Países" filename="vutl0555" /></div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`}>{busy && <span className="erp-spin" />}{feedback.message}</div>}
        <div className="erp-main">
          <aside className="erp-list-panel">
            <div className="erp-panel-head"><span className="erp-panel-title">UFs</span><span className="erp-count">{ufs.length}</span></div>
            <div className="erp-list">
              {ufs.length === 0 && <div className="erp-list-empty">Clique em <strong>Carregar</strong>.</div>}
              {ufs.map((u) => (
                <div key={u.sigla} className={`erp-list-row${editing && form.sigla === u.sigla ? " erp-row-sel" : ""}`} onClick={() => selecionar(u)}>
                  <span className="erp-list-code">{u.sigla}</span>
                  <span className="erp-list-sub">{u.name} · {u.country_sigla}{u.ibge_code ? ` · IBGE ${u.ibge_code}` : ""}</span>
                </div>
              ))}
            </div>
          </aside>

          <section className="erp-detail-panel">
            <div className="erp-tabs"><button className="erp-tab active">{editing ? `Editar UF ${form.sigla}` : "Nova UF"}</button></div>
            <div className="erp-detail-body">
              <div className="erp-feedback info" style={{ margin: "0 0 12px" }}>O ERP cadastra <strong>UFs</strong> e <strong>Países</strong>. Municípios/cidades não têm cadastro próprio no backend.</div>
              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Unidade Federativa</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c2"><label className="erp-label erp-req">Sigla</label><input className="erp-input" maxLength={2} value={form.sigla} onChange={(e) => setF("sigla", e.target.value.toUpperCase())} /></div>
                  <div className="erp-field erp-c5"><label className="erp-label erp-req">Nome</label><input className="erp-input" value={form.name} onChange={(e) => setF("name", e.target.value)} /></div>
                  <div className="erp-field erp-c3"><label className="erp-label erp-req">País</label>
                    <select className="erp-input" value={form.country_sigla} onChange={(e) => setF("country_sigla", e.target.value)}>
                      <option value="BR">BR</option>{countries.map((c) => <option key={c.sigla} value={c.sigla}>{c.sigla}</option>)}
                    </select></div>
                  <div className="erp-field erp-c2"><label className="erp-label">IBGE</label><input className="erp-input" value={form.ibge_code} onChange={(e) => setF("ibge_code", e.target.value)} /></div>
                  <div className="erp-field erp-c12" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{editing ? "Atualizar UF" : "Criar UF"}</button></div>
                </div>
              </div>

              <div className="erp-fieldset">
                <div className="erp-fieldset-head">Países ({countries.length})</div>
                <div className="erp-fieldset-body">
                  <div className="erp-field erp-c2"><label className="erp-label">Sigla</label><input className="erp-input" value={newCountry.sigla} onChange={(e) => setNewCountry((c) => ({ ...c, sigla: e.target.value.toUpperCase() }))} /></div>
                  <div className="erp-field erp-c6"><label className="erp-label">Nome</label><input className="erp-input" value={newCountry.name} onChange={(e) => setNewCountry((c) => ({ ...c, name: e.target.value }))} /></div>
                  <div className="erp-field erp-c4" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={() => void criarPais()} disabled={busy}>Criar país</button></div>
                  {countries.length > 0 && <div className="erp-field erp-c12"><table className="erp-grid"><thead><tr><th>Sigla</th><th>Nome</th></tr></thead><tbody>{countries.map((c) => <tr key={c.sigla}><td>{c.sigla}</td><td>{c.name}</td></tr>)}</tbody></table></div>}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">UFs: <strong>{ufs.length}</strong></div>
        <div className="erp-status-item">Países: <strong>{countries.length}</strong></div>
        <div className="erp-status-spacer" />
        <span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

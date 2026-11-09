import { useEffect, useState } from "react";
import {
  DIMENSOES, ROTULO_DIMENSAO, type Unidade, type Sinonimo, type ConversaoPadrao,
  listarUnidades, criarUnidade, alterarUnidade, ativarUnidade, esquecerUnidades,
  listarSinonimos, criarSinonimo, excluirSinonimo,
  listarConversoesPadrao, salvarConversaoPadrao, excluirConversaoPadrao,
  ambosOsSentidos, numero,
} from "@/services/unitConversionService";
import { errMessage } from "@/services/fiscalShared";
import { LookupField } from "@/components/ui/LookupField";
import { loadSuppliers } from "@/services/lookups";
import { confirmar } from "@/components/ui/dialogos";

type Aviso = (tipo: "success" | "error" | "info", mensagem: string) => void;

function OpcoesDeUnidade({ unidades, vazio = "Selecione" }: { unidades: Unidade[]; vazio?: string }): JSX.Element {
  return (
    <>
      <option value="">{vazio}</option>
      {DIMENSOES.map((d) => {
        const doGrupo = unidades.filter((u) => u.dimension === d && u.is_active);
        if (!doGrupo.length) return null;
        return (
          <optgroup key={d} label={ROTULO_DIMENSAO[d]}>
            {doGrupo.map((u) => <option key={u.code} value={u.code}>{u.code} — {u.description}</option>)}
          </optgroup>
        );
      })}
    </>
  );
}
export { OpcoesDeUnidade };

const UNIDADE_VAZIA = { code: "", description: "", dimension: "CONTAGEM", fiscal_code: "", decimals: 4 };

/** Catálogo de unidades da empresa: o que pode aparecer em item, estrutura, compra e nota. */
export function AbaUnidades({ aviso, aoMudar }: { aviso: Aviso; aoMudar: () => void }): JSX.Element {
  const [lista, setLista] = useState<Unidade[]>([]);
  const [form, setForm] = useState(UNIDADE_VAZIA);
  const [editando, setEditando] = useState<string | null>(null);
  const [mostrarInativas, setMostrarInativas] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [busy, setBusy] = useState(false);

  async function carregar() {
    try { setLista(await listarUnidades(true)); } catch (e) { aviso("error", errMessage(e)); }
  }
  useEffect(() => { void carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function salvar() {
    if (!form.code.trim() || !form.description.trim()) { aviso("error", "Informe o código e a descrição da unidade."); return; }
    setBusy(true);
    try {
      const dto = { ...form, code: form.code.trim().toUpperCase(), fiscal_code: form.fiscal_code.trim().toUpperCase() || undefined };
      if (editando) await alterarUnidade(editando, dto); else await criarUnidade(dto);
      aviso("success", editando ? `Unidade ${editando} alterada.` : `Unidade ${dto.code} cadastrada.`);
      setForm(UNIDADE_VAZIA); setEditando(null); esquecerUnidades(); aoMudar();
      await carregar();
    } catch (e) { aviso("error", errMessage(e)); } finally { setBusy(false); }
  }
  async function alternar(u: Unidade) {
    if (u.is_active && !(await confirmar({
      titulo: "Desativar a unidade?", assunto: `${u.code} — ${u.description}`, tom: "aviso", rotulo: "Desativar",
      mensagem: "A unidade deixa de ser oferecida em cadastros novos. O sistema não deixa desativar unidade que algum item, estrutura ou conversão ainda usa.",
    }))) return;
    setBusy(true);
    try { await ativarUnidade(u.code, !u.is_active); esquecerUnidades(); aoMudar(); await carregar(); aviso("success", `Unidade ${u.code} ${u.is_active ? "desativada" : "reativada"}.`); }
    catch (e) { aviso("error", errMessage(e)); } finally { setBusy(false); }
  }

  const f = filtro.trim().toUpperCase();
  const visiveis = lista.filter((u) => (mostrarInativas || u.is_active) && (!f || u.code.includes(f) || u.description.toUpperCase().includes(f)));

  return (
    <>
      <div className="erp-fieldset">
        <div className="erp-fieldset-head">{editando ? `Alterando ${editando}` : "Nova unidade"}</div>
        <div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Código</label>
            <input className="erp-input" maxLength={10} value={form.code} disabled={!!editando} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))} placeholder="BR" /></div>
          <div className="erp-field erp-c4"><label className="erp-label erp-req">Descrição</label>
            <input className="erp-input" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Barra de 6 metros" /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Grandeza</label>
            <select className="erp-input" value={form.dimension} onChange={(e) => setForm((p) => ({ ...p, dimension: e.target.value }))}>
              {DIMENSOES.map((d) => <option key={d} value={d}>{ROTULO_DIMENSAO[d]}</option>)}
            </select></div>
          <div className="erp-field erp-c2"><label className="erp-label">Unidade na nota fiscal</label>
            <input className="erp-input" maxLength={6} value={form.fiscal_code} onChange={(e) => setForm((p) => ({ ...p, fiscal_code: e.target.value.toUpperCase() }))} placeholder="igual ao código" /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Casas decimais</label>
            <input className="erp-input num" type="number" min={0} max={6} value={form.decimals} onChange={(e) => setForm((p) => ({ ...p, decimals: Number(e.target.value) }))} /></div>
          <div className="erp-field erp-c12">
            <p className="erp-note">
              A <strong>grandeza</strong> decide quais conversões padrão valem para todos os itens (quilo e grama
              são massa; metro e milímetro, comprimento). Conversão entre grandezas diferentes — quilos de uma chapa
              em unidades — depende do item e é cadastrada na aba <strong>Conversões do item</strong>.
              A <strong>unidade na nota fiscal</strong> é a que vai no XML quando difere do código (até 6 caracteres).
            </p>
          </div>
          <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 6, justifyContent: "flex-end" }}>
            {editando && <button className="erp-btn" onClick={() => { setEditando(null); setForm(UNIDADE_VAZIA); }} disabled={busy}>Cancelar</button>}
            <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{editando ? "Salvar alteração" : "Cadastrar unidade"}</button>
          </div>
        </div>
      </div>
      <div className="erp-fieldset">
        <div className="erp-fieldset-head">
          Unidades da empresa ({visiveis.length})
          <input className="erp-input" style={{ marginLeft: 12, maxWidth: 220, height: 24 }} placeholder="Filtrar" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
          <label className="erp-check" style={{ marginLeft: 12, fontWeight: 400 }}><input type="checkbox" checked={mostrarInativas} onChange={(e) => setMostrarInativas(e.target.checked)} /> mostrar inativas</label>
        </div>
        <div className="erp-grid-wrap">
          <table className="erp-grid">
            <thead><tr><th>Código</th><th>Descrição</th><th>Grandeza</th><th>Na nota</th><th className="num">Decimais</th><th>Situação</th><th /></tr></thead>
            <tbody>
              {visiveis.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Nenhuma unidade.</td></tr>}
              {visiveis.map((u) => (
                <tr key={u.code}>
                  <td><strong>{u.code}</strong>{u.is_system && <span className="erp-badge draft" style={{ marginLeft: 6 }}>padrão</span>}</td>
                  <td>{u.description}</td>
                  <td>{ROTULO_DIMENSAO[u.dimension] ?? u.dimension}</td>
                  <td>{u.fiscal_code}</td>
                  <td className="num">{u.decimals}</td>
                  <td><span className={`erp-badge ${u.is_active ? "ok" : "err"}`}>{u.is_active ? "Ativa" : "Inativa"}</span></td>
                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    <button className="erp-btn erp-btn-sm" disabled={busy} onClick={() => { setEditando(u.code); setForm({ code: u.code, description: u.description, dimension: u.dimension, fiscal_code: u.fiscal_code, decimals: u.decimals }); }}>Editar</button>{" "}
                    <button className={`erp-btn erp-btn-sm${u.is_active ? " erp-btn-danger" : ""}`} disabled={busy} onClick={() => void alternar(u)}>{u.is_active ? "Desativar" : "Reativar"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/** Sinônimos: o texto que chega na nota (UND, PÇ, "Kg.") traduzido para o catálogo. */
export function AbaSinonimos({ aviso, unidades }: { aviso: Aviso; unidades: Unidade[] }): JSX.Element {
  const [lista, setLista] = useState<Sinonimo[]>([]);
  const [form, setForm] = useState<{ alias: string; unit_code: string; supplier_code?: number }>({ alias: "", unit_code: "" });
  const [busy, setBusy] = useState(false);
  async function carregar() {
    try { setLista(await listarSinonimos()); } catch (e) { aviso("error", errMessage(e)); }
  }
  useEffect(() => { void carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function salvar() {
    if (!form.alias.trim() || !form.unit_code) { aviso("error", "Informe o texto recebido e a unidade do catálogo."); return; }
    setBusy(true);
    try {
      const s = await criarSinonimo({ alias: form.alias.trim(), unit_code: form.unit_code, supplier_code: form.supplier_code });
      aviso("success", `"${s.alias}" passa a ser lido como ${s.unit_code}${s.supplier_code ? " nas notas deste fornecedor" : ""}.`);
      setForm({ alias: "", unit_code: "" });
      await carregar();
    } catch (e) { aviso("error", errMessage(e)); } finally { setBusy(false); }
  }
  async function remover(s: Sinonimo) {
    if (!(await confirmar({ titulo: "Excluir o sinônimo?", assunto: `${s.alias} → ${s.unit_code}`, tom: "perigo", rotulo: "Excluir", mensagem: "As próximas notas com esse texto voltam a chegar sem unidade reconhecida." }))) return;
    setBusy(true);
    try { await excluirSinonimo(s.id); await carregar(); aviso("success", "Sinônimo excluído."); } catch (e) { aviso("error", errMessage(e)); } finally { setBusy(false); }
  }
  return (
    <>
      <div className="erp-fieldset">
        <div className="erp-fieldset-head">Novo sinônimo</div>
        <div className="erp-fieldset-body">
          <div className="erp-field erp-c3"><label className="erp-label erp-req">Texto recebido</label>
            <input className="erp-input" maxLength={10} value={form.alias} onChange={(e) => setForm((p) => ({ ...p, alias: e.target.value }))} placeholder="UND, PÇ, Kg." /></div>
          <div className="erp-field erp-c3"><label className="erp-label erp-req">É a unidade</label>
            <select className="erp-input" value={form.unit_code} onChange={(e) => setForm((p) => ({ ...p, unit_code: e.target.value }))}><OpcoesDeUnidade unidades={unidades} /></select></div>
          <div className="erp-field erp-c4"><label className="erp-label">Só nas notas do fornecedor</label>
            <LookupField value={form.supplier_code} loader={loadSuppliers} entityLabel="fornecedor" placeholder="Todos os fornecedores" clearable onChange={(c) => setForm((p) => ({ ...p, supplier_code: c ? Number(c) : undefined }))} /></div>
          <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>Cadastrar</button></div>
          <div className="erp-field erp-c12">
            <p className="erp-note">
              Maiúsculas, acentos e pontuação não contam: "Kg.", "kg" e "KG" são o mesmo texto. Um sinônimo
              só de um fornecedor vale mais que o geral — útil quando um fornecedor chama de "PC" o que para os
              outros é "peça" e para ele é "pacote".
            </p>
          </div>
        </div>
      </div>
      <div className="erp-fieldset">
        <div className="erp-fieldset-head">Sinônimos ({lista.length})</div>
        <div className="erp-grid-wrap">
          <table className="erp-grid">
            <thead><tr><th>Texto recebido</th><th>Unidade</th><th>Fornecedor</th><th /></tr></thead>
            <tbody>
              {lista.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Nenhum sinônimo.</td></tr>}
              {lista.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.alias}</strong>{s.is_system && <span className="erp-badge draft" style={{ marginLeft: 6 }}>padrão</span>}</td>
                  <td>{s.unit_code}</td>
                  <td>{s.supplier_code ? `${s.supplier_code}${s.supplier_name ? ` — ${s.supplier_name}` : ""}` : "Todos"}</td>
                  <td style={{ textAlign: "right" }}><button className="erp-btn erp-btn-sm erp-btn-danger" disabled={busy} onClick={() => void remover(s)}>Excluir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/** Conversões padrão: valem para todos os itens, só dentro da mesma grandeza. */
export function AbaConversoesPadrao({ aviso, unidades }: { aviso: Aviso; unidades: Unidade[] }): JSX.Element {
  const [lista, setLista] = useState<ConversaoPadrao[]>([]);
  const [form, setForm] = useState({ from_uom: "", to_uom: "", from_quantity: "1", to_quantity: "" });
  const [busy, setBusy] = useState(false);
  async function carregar() {
    try { setLista(await listarConversoesPadrao()); } catch (e) { aviso("error", errMessage(e)); }
  }
  useEffect(() => { void carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const grandezaDe = unidades.find((u) => u.code === form.from_uom)?.dimension;
  const destinoPossivel = unidades.filter((u) => !grandezaDe || u.dimension === grandezaDe);
  async function salvar() {
    if (!form.from_uom || !form.to_uom || !(Number(form.from_quantity) > 0) || !(Number(form.to_quantity) > 0)) { aviso("error", "Informe as duas unidades e as duas quantidades."); return; }
    setBusy(true);
    try {
      await salvarConversaoPadrao({ ...form, from_quantity: form.from_quantity.replace(",", "."), to_quantity: form.to_quantity.replace(",", ".") });
      aviso("success", `Conversão padrão gravada: ${ambosOsSentidos(form.from_uom, form.to_uom, form.from_quantity.replace(",", "."), form.to_quantity.replace(",", "."))}`);
      setForm({ from_uom: "", to_uom: "", from_quantity: "1", to_quantity: "" });
      await carregar();
    } catch (e) { aviso("error", errMessage(e)); } finally { setBusy(false); }
  }
  async function remover(c: ConversaoPadrao) {
    if (!(await confirmar({ titulo: "Excluir a conversão padrão?", assunto: `${c.from_uom} → ${c.to_uom}`, tom: "perigo", rotulo: "Excluir", mensagem: "Itens que não têm conversão própria entre essas unidades deixam de converter." }))) return;
    setBusy(true);
    try { await excluirConversaoPadrao(c.id); await carregar(); aviso("success", "Conversão padrão excluída."); } catch (e) { aviso("error", errMessage(e)); } finally { setBusy(false); }
  }
  return (
    <>
      <div className="erp-fieldset">
        <div className="erp-fieldset-head">Nova conversão padrão <span style={{ fontWeight: 400, opacity: .7, marginLeft: 8 }}>— somente administrador</span></div>
        <div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Quantidade</label>
            <input className="erp-input num" value={form.from_quantity} onChange={(e) => setForm((p) => ({ ...p, from_quantity: e.target.value }))} /></div>
          <div className="erp-field erp-c3"><label className="erp-label erp-req">Unidade</label>
            <select className="erp-input" value={form.from_uom} onChange={(e) => setForm((p) => ({ ...p, from_uom: e.target.value, to_uom: "" }))}><OpcoesDeUnidade unidades={unidades} /></select></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req">equivale a</label>
            <input className="erp-input num" value={form.to_quantity} onChange={(e) => setForm((p) => ({ ...p, to_quantity: e.target.value }))} /></div>
          <div className="erp-field erp-c3"><label className="erp-label erp-req">Unidade</label>
            <select className="erp-input" value={form.to_uom} onChange={(e) => setForm((p) => ({ ...p, to_uom: e.target.value }))}><OpcoesDeUnidade unidades={destinoPossivel.filter((u) => u.code !== form.from_uom)} /></select></div>
          <div className="erp-field erp-c2" style={{ justifyContent: "flex-end" }}><button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>Gravar</button></div>
          {form.from_uom && form.to_uom && Number(form.to_quantity.replace(",", ".")) > 0 && (
            <div className="erp-field erp-c12"><div className="erp-note"><strong>Vai gravar:</strong> {ambosOsSentidos(form.from_uom, form.to_uom, form.from_quantity.replace(",", "."), form.to_quantity.replace(",", "."))}</div></div>
          )}
        </div>
      </div>
      <div className="erp-fieldset">
        <div className="erp-fieldset-head">Conversões padrão ({lista.length})</div>
        <div className="erp-grid-wrap">
          <table className="erp-grid">
            <thead><tr><th>Conversão</th><th>Grandeza</th><th className="num">Fator</th><th className="num">Inverso</th><th /></tr></thead>
            <tbody>
              {lista.length === 0 && <tr><td colSpan={5} className="erp-grid-empty">Nenhuma conversão padrão.</td></tr>}
              {lista.map((c) => (
                <tr key={c.id}>
                  <td>{numero(c.from_quantity)} {c.from_uom} = {numero(c.to_quantity)} {c.to_uom}{c.is_system && <span className="erp-badge draft" style={{ marginLeft: 6 }}>padrão</span>}</td>
                  <td>{ROTULO_DIMENSAO[c.dimension] ?? c.dimension}</td>
                  <td className="num">{numero(c.factor, 10)}</td>
                  <td className="num">{numero(c.inverse_factor, 10)}</td>
                  <td style={{ textAlign: "right" }}><button className="erp-btn erp-btn-sm erp-btn-danger" disabled={busy} onClick={() => void remover(c)}>Excluir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

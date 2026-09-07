import { useCallback, useEffect, useState } from "react";
import {
  type CfgSet, type CfgVariable,
  listSets, createSet, updateSet, deleteSet,
  listSetVariables, createVariable, updateVariable, deleteVariable,
} from "@/services/configuratorCfgService";

/**
 * Conjuntos e respostas (equivale ao FENG0101 do FoccoERP).
 *
 * Um conjunto agrupa as respostas possíveis de uma pergunta — "Cores de MDF",
 * "Espessuras de chapa". Cada resposta carrega o pedaço que ela contribui para
 * a máscara do item; a máscara é a concatenação desses pedaços na ordem das
 * perguntas. Mostrar isso montado, e não só o campo solto, é o que evita o
 * cadastro que só se descobre errado quando a máscara sai torta.
 */
type Props = { aviso: (tipo: "success" | "error", msg: string) => void };

const VAR_VAZIA: CfgVariable = { code: "", description: "", mask_composition: "" };

export function ConjuntosTab({ aviso }: Props): JSX.Element {
  const [sets, setSets] = useState<CfgSet[]>([]);
  const [selecionado, setSelecionado] = useState<CfgSet | null>(null);
  const [variaveis, setVariaveis] = useState<CfgVariable[]>([]);
  const [novoConjunto, setNovoConjunto] = useState("");
  const [form, setForm] = useState<CfgVariable>(VAR_VAZIA);
  const [editando, setEditando] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const executar = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { aviso("error", (e as Error).message); } finally { setBusy(false); }
  }, [aviso]);

  const carregar = useCallback(() => executar(async () => { setSets(await listSets()); }), [executar]);
  useEffect(() => { carregar(); }, [carregar]);

  function abrir(s: CfgSet) {
    setSelecionado(s);
    setEditando(null);
    setForm(VAR_VAZIA);
    void executar(async () => { setVariaveis(await listSetVariables(s.id!)); });
  }

  function recarregarVariaveis() {
    if (selecionado?.id) void executar(async () => { setVariaveis(await listSetVariables(selecionado.id!)); });
  }

  function gravarVariavel() {
    if (!selecionado?.id) { aviso("error", "Selecione um conjunto antes de cadastrar a resposta."); return; }
    if (!form.code.trim()) { aviso("error", "Informe o código da resposta."); return; }
    void executar(async () => {
      if (editando) {
        await updateVariable(editando, selecionado.id!, form);
        aviso("success", `Resposta ${form.code} alterada.`);
      } else {
        await createVariable(selecionado.id!, form);
        aviso("success", `Resposta ${form.code} incluída no conjunto ${selecionado.description}.`);
      }
      setForm(VAR_VAZIA);
      setEditando(null);
      setVariaveis(await listSetVariables(selecionado.id!));
    });
  }

  // Prévia do que a máscara receberia se todas as respostas do conjunto fossem
  // usadas em sequência — ajuda a enxergar comprimento e separador.
  const previa = variaveis
    .map((v) => (v.mask_composition || v.code || "?").trim())
    .filter(Boolean)
    .join("#");

  return (
    <div className="erp-main">
      <aside className="erp-list-panel">
        <div className="erp-panel-head">
          <span className="erp-panel-title">Conjuntos de resposta</span>
          <span className="erp-count">{sets.length}</span>
        </div>
        <div className="cfgw-inline">
          <input className="erp-input" placeholder="Ex.: Cores de MDF" value={novoConjunto}
            onChange={(e) => setNovoConjunto(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (novoConjunto.trim()) void executar(async () => { await createSet(novoConjunto.trim()); setNovoConjunto(""); setSets(await listSets()); }); } }} />
          <button className="erp-btn erp-btn-primary erp-btn-sm" disabled={busy || !novoConjunto.trim()}
            onClick={() => void executar(async () => { await createSet(novoConjunto.trim()); setNovoConjunto(""); setSets(await listSets()); })}>
            Incluir
          </button>
        </div>
        <div className="erp-list">
          {sets.length === 0 && <div className="erp-grid-empty">Nenhum conjunto cadastrado.</div>}
          {sets.map((s) => (
            <div key={s.id} className={`erp-list-row${selecionado?.id === s.id ? " erp-row-sel" : ""}`} onClick={() => abrir(s)}>
              <span className="erp-list-code">#{s.id}</span>
              <span className="erp-list-sub">{s.description}</span>
              <div className="erp-list-meta">
                <button className="erp-btn erp-btn-sm" title="Renomear"
                  onClick={(e) => { e.stopPropagation(); const nome = window.prompt("Novo nome do conjunto:", s.description); if (nome?.trim()) void executar(async () => { await updateSet(s.id!, nome.trim()); setSets(await listSets()); }); }}>✎</button>
                <button className="erp-btn erp-btn-danger erp-btn-sm" title="Desativar"
                  onClick={(e) => { e.stopPropagation(); void executar(async () => { await deleteSet(s.id!); setSets(await listSets()); if (selecionado?.id === s.id) { setSelecionado(null); setVariaveis([]); } }); }}>×</button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <section className="erp-detail-panel">
        <div className="erp-tabs">
          <button className="erp-tab active">
            {selecionado ? `Respostas de "${selecionado.description}"` : "Respostas"}
          </button>
        </div>
        <div className="erp-detail-body">
          <div className="erp-fieldset">
            <div className="erp-fieldset-head">{editando ? "Alterar resposta" : "Nova resposta"}</div>
            <div className="erp-fieldset-body">
              <div className="erp-field erp-c2">
                <label className="erp-label erp-req">Código</label>
                <input className="erp-input" value={form.code} placeholder="BR"
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
              </div>
              <div className="erp-field erp-c5">
                <label className="erp-label">Descrição</label>
                <input className="erp-input" value={form.description} placeholder="Branco TX"
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="erp-field erp-c2">
                <label className="erp-label">Compõe a máscara</label>
                <input className="erp-input" value={form.mask_composition ?? ""} placeholder="= código"
                  onChange={(e) => setForm((f) => ({ ...f, mask_composition: e.target.value.toUpperCase() }))} />
                <span className="cfgw-hint">Em branco usa o código.</span>
              </div>
              <div className="erp-field erp-c3 cfgw-actions">
                <button className="erp-btn erp-btn-primary" onClick={gravarVariavel} disabled={busy || !selecionado}>
                  {editando ? "Gravar alteração" : "Incluir resposta"}
                </button>
                {editando && (
                  <button className="erp-btn" onClick={() => { setEditando(null); setForm(VAR_VAZIA); }}>Cancelar</button>
                )}
              </div>

              <div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead>
                    <tr><th>#</th><th>Código</th><th>Descrição</th><th>Compõe a máscara</th><th /></tr>
                  </thead>
                  <tbody>
                    {variaveis.length === 0 && (
                      <tr><td colSpan={5} className="erp-grid-empty">
                        {selecionado ? "Este conjunto ainda não tem respostas." : "Selecione um conjunto à esquerda."}
                      </td></tr>
                    )}
                    {variaveis.map((v) => (
                      <tr key={v.id}>
                        <td>#{v.id}</td>
                        <td style={{ fontWeight: 600 }}>{v.code}</td>
                        <td>{v.description || "—"}</td>
                        <td><code className="cfgw-chip">{v.mask_composition || v.code}</code></td>
                        <td className="cfgw-rowactions">
                          <button className="erp-btn erp-btn-sm" onClick={() => { setEditando(v.id!); setForm({ ...v }); }}>Alterar</button>
                          <button className="erp-btn erp-btn-danger erp-btn-sm"
                            onClick={() => void executar(async () => { await deleteVariable(v.id!); recarregarVariaveis(); })}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {variaveis.length > 0 && (
                <div className="erp-field erp-c12">
                  <label className="erp-label">Como estas respostas apareceriam na máscara</label>
                  <code className="cfgw-preview">{previa}</code>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

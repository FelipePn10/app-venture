import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type CfgCharacteristic, type CfgSet, CHAR_TYPES,
  listCharacteristics, createCharacteristic, updateCharacteristic, deleteCharacteristic,
  listCharacteristicItems, listSets,
} from "@/services/configuratorCfgService";
import { enumLabel } from "@/utils/enumLabels";

/**
 * Perguntas do configurador — as características (FENG0102 no FoccoERP).
 *
 * A descrição da pergunta é o que o vendedor lê na hora de configurar o
 * produto: "Cor do painel", "Largura (mm)". O tipo decide como ela é
 * respondida, e a máscara decide o pedaço de código que a resposta empresta ao
 * item configurado.
 */
type Props = { aviso: (tipo: "success" | "error", msg: string) => void };

const VAZIA: CfgCharacteristic = {
  code: "", description: "", type: "ESCOLHA", is_required: true,
  mask: "", option_true: "SIM", option_false: "NAO",
};

/** O que cada tipo espera de quem responde — em português, na própria tela. */
const AJUDA_TIPO: Record<string, string> = {
  ESCOLHA: "Uma resposta de um conjunto. É o tipo mais usado: cor, acabamento, modelo.",
  ESCOLHA_MULT: "Várias respostas do mesmo conjunto — acessórios, opcionais.",
  FORMULA: "O valor sai de um cálculo sobre outras respostas, não de uma escolha.",
  DESENHO: "Aponta para um desenho técnico do cadastro de desenhos.",
  INF_CARACTER: "Texto livre, como uma gravação ou observação.",
  INF_NUMERICA: "Número digitado dentro de um mínimo e um máximo — medidas sob encomenda.",
  OPCAO: "Sim ou não. Use os rótulos abaixo para o que aparece na máscara.",
  CAMPO: "Puxa o valor de um campo do próprio cadastro do item.",
  SEQUENCIAL: "Numera automaticamente cada configuração gerada.",
};

/** Tipos em que faz sentido escolher um conjunto de respostas. */
const USA_CONJUNTO = new Set(["ESCOLHA", "ESCOLHA_MULT"]);

export function PerguntasTab({ aviso }: Props): JSX.Element {
  const [perguntas, setPerguntas] = useState<CfgCharacteristic[]>([]);
  const [conjuntos, setConjuntos] = useState<CfgSet[]>([]);
  const [form, setForm] = useState<CfgCharacteristic>(VAZIA);
  const [editando, setEditando] = useState<number | null>(null);
  const [usoDe, setUsoDe] = useState<{ id: number; itens: string[] } | null>(null);
  const [filtro, setFiltro] = useState("");
  const [busy, setBusy] = useState(false);

  const executar = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { aviso("error", (e as Error).message); } finally { setBusy(false); }
  }, [aviso]);

  const carregar = useCallback(() => executar(async () => {
    const [p, c] = await Promise.all([listCharacteristics(), listSets()]);
    setPerguntas(p); setConjuntos(c);
  }), [executar]);
  useEffect(() => { carregar(); }, [carregar]);

  const filtradas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return perguntas;
    return perguntas.filter((p) => p.code.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }, [perguntas, filtro]);

  function gravar() {
    if (!form.code.trim() || !form.description.trim()) {
      aviso("error", "Código e pergunta são obrigatórios.");
      return;
    }
    if (USA_CONJUNTO.has(form.type) && !form.set_id) {
      aviso("error", "Uma pergunta de escolha precisa de um conjunto de respostas.");
      return;
    }
    if (form.type === "INF_NUMERICA" && form.num_min != null && form.num_max != null && form.num_min > form.num_max) {
      aviso("error", "O mínimo não pode ser maior que o máximo.");
      return;
    }
    void executar(async () => {
      if (editando) {
        await updateCharacteristic(editando, form);
        aviso("success", `Pergunta ${form.code} alterada.`);
      } else {
        await createCharacteristic(form);
        aviso("success", `Pergunta ${form.code} cadastrada.`);
      }
      setForm(VAZIA); setEditando(null);
      setPerguntas(await listCharacteristics());
    });
  }

  function verUso(p: CfgCharacteristic) {
    void executar(async () => {
      const itens = await listCharacteristicItems(p.id!);
      setUsoDe({
        id: p.id!,
        itens: itens.map((i) => String(i["item_code"] ?? i["ItemCode"] ?? "?")),
      });
    });
  }

  const conjuntoDe = (id?: number) => conjuntos.find((c) => c.id === id)?.description;

  return (
    <section className="erp-detail-panel">
      <div className="erp-tabs"><button className="erp-tab active">Perguntas do configurador</button></div>
      <div className="erp-detail-body">

        <div className="erp-fieldset">
          <div className="erp-fieldset-head">{editando ? `Alterar a pergunta #${editando}` : "Nova pergunta"}</div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c2">
              <label className="erp-label erp-req">Código</label>
              <input className="erp-input" value={form.code} placeholder="LARGURA"
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
              <span className="cfgw-hint">Use o mesmo nome da variável se ela entrar em fórmula.</span>
            </div>
            <div className="erp-field erp-c4">
              <label className="erp-label erp-req">Pergunta</label>
              <input className="erp-input" value={form.description} placeholder="Largura (mm)"
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="erp-field erp-c3">
              <label className="erp-label">Tipo de resposta</label>
              <select className="erp-input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {CHAR_TYPES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}
              </select>
              <span className="cfgw-hint">{AJUDA_TIPO[form.type]}</span>
            </div>
            <div className="erp-field erp-c3">
              <label className="erp-label">Compõe a máscara com</label>
              <input className="erp-input" value={form.mask ?? ""} placeholder="LARG"
                onChange={(e) => setForm((f) => ({ ...f, mask: e.target.value.toUpperCase() }))} />
            </div>

            {USA_CONJUNTO.has(form.type) && (
              <div className="erp-field erp-c5">
                <label className="erp-label erp-req">Conjunto de respostas</label>
                <select className="erp-input" value={form.set_id ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, set_id: Number(e.target.value) || undefined }))}>
                  <option value="">Selecione…</option>
                  {conjuntos.map((c) => <option key={c.id} value={c.id}>{c.description}</option>)}
                </select>
              </div>
            )}

            {form.type === "INF_NUMERICA" && (
              <>
                <div className="erp-field erp-c2">
                  <label className="erp-label">Mínimo</label>
                  <input className="erp-input num" type="number" value={form.num_min ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, num_min: e.target.value === "" ? undefined : Number(e.target.value) }))} />
                </div>
                <div className="erp-field erp-c2">
                  <label className="erp-label">Máximo</label>
                  <input className="erp-input num" type="number" value={form.num_max ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, num_max: e.target.value === "" ? undefined : Number(e.target.value) }))} />
                </div>
              </>
            )}

            {form.type === "OPCAO" && (
              <>
                <div className="erp-field erp-c2">
                  <label className="erp-label">Rótulo do Sim</label>
                  <input className="erp-input" value={form.option_true ?? ""} onChange={(e) => setForm((f) => ({ ...f, option_true: e.target.value.toUpperCase() }))} />
                </div>
                <div className="erp-field erp-c2">
                  <label className="erp-label">Rótulo do Não</label>
                  <input className="erp-input" value={form.option_false ?? ""} onChange={(e) => setForm((f) => ({ ...f, option_false: e.target.value.toUpperCase() }))} />
                </div>
              </>
            )}

            {form.type === "FORMULA" && (
              <div className="erp-field erp-c6">
                <label className="erp-label">Fórmula</label>
                <input className="erp-input" value={form.formula ?? ""} placeholder="LARGURA*ALTURA/1000000"
                  onChange={(e) => setForm((f) => ({ ...f, formula: e.target.value.toUpperCase() }))} />
                <span className="cfgw-hint">As variáveis são os códigos das outras perguntas do item.</span>
              </div>
            )}

            <div className="erp-field erp-c3">
              <label className="erp-label">Marcadores</label>
              <div className="cfgw-checks">
                <label className="erp-check"><input type="checkbox" checked={!!form.is_required}
                  onChange={(e) => setForm((f) => ({ ...f, is_required: e.target.checked }))} /> Obrigatória</label>
                <label className="erp-check"><input type="checkbox" checked={!!form.affects_price}
                  onChange={(e) => setForm((f) => ({ ...f, affects_price: e.target.checked }))} /> Afeta o preço</label>
                <label className="erp-check"><input type="checkbox" checked={!!form.controls_goals}
                  onChange={(e) => setForm((f) => ({ ...f, controls_goals: e.target.checked }))} /> Controla metas</label>
              </div>
            </div>

            <div className="erp-field erp-c12 cfgw-actions">
              <button className="erp-btn erp-btn-primary" onClick={gravar} disabled={busy}>
                {editando ? "Gravar alteração" : "Cadastrar pergunta"}
              </button>
              {editando && <button className="erp-btn" onClick={() => { setEditando(null); setForm(VAZIA); }}>Cancelar</button>}
            </div>
          </div>
        </div>

        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Perguntas cadastradas ({filtradas.length})</div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c4">
              <label className="erp-label">Localizar</label>
              <input className="erp-input" value={filtro} placeholder="código ou texto da pergunta"
                onChange={(e) => setFiltro(e.target.value)} />
            </div>
            <div className="erp-field erp-c8 cfgw-actions">
              <button className="erp-btn" onClick={carregar} disabled={busy}>Recarregar</button>
            </div>
            <div className="erp-field erp-c12">
              <table className="erp-grid">
                <thead>
                  <tr><th>#</th><th>Código</th><th>Pergunta</th><th>Tipo</th><th>Conjunto</th><th>Máscara</th><th>Marcadores</th><th /></tr>
                </thead>
                <tbody>
                  {filtradas.length === 0 && <tr><td colSpan={8} className="erp-grid-empty">Nenhuma pergunta cadastrada.</td></tr>}
                  {filtradas.map((p) => (
                    <tr key={p.id} className={editando === p.id ? "erp-row-sel" : undefined}>
                      <td>#{p.id}</td>
                      <td style={{ fontWeight: 600 }}>{p.code}</td>
                      <td>{p.description}</td>
                      <td>{enumLabel(p.type)}</td>
                      <td>{conjuntoDe(p.set_id) ?? "—"}</td>
                      <td><code className="cfgw-chip">{p.mask || p.code}</code></td>
                      <td className="cfgw-flags">
                        {p.is_required && <span title="Obrigatória">obrigatória</span>}
                        {p.affects_price && <span title="Afeta o preço">preço</span>}
                        {p.type === "INF_NUMERICA" && (p.num_min != null || p.num_max != null) && (
                          <span title="Limites">{p.num_min ?? "—"}…{p.num_max ?? "—"}</span>
                        )}
                      </td>
                      <td className="cfgw-rowactions">
                        <button className="erp-btn erp-btn-sm" onClick={() => { setEditando(p.id!); setForm({ ...p }); }}>Alterar</button>
                        <button className="erp-btn erp-btn-sm" onClick={() => verUso(p)}>Onde é usada</button>
                        <button className="erp-btn erp-btn-danger erp-btn-sm"
                          onClick={() => void executar(async () => { await deleteCharacteristic(p.id!); setPerguntas(await listCharacteristics()); })}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {usoDe && (
              <div className="erp-field erp-c12">
                <div className="erp-feedback info">
                  {usoDe.itens.length === 0
                    ? "Esta pergunta ainda não está ligada a nenhum item — pode ser alterada à vontade."
                    : `Em uso nos itens: ${usoDe.itens.join(", ")}. Alterar agora muda o que já foi configurado.`}
                  <button className="erp-btn erp-btn-sm" style={{ marginLeft: 10 }} onClick={() => setUsoDe(null)}>Fechar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

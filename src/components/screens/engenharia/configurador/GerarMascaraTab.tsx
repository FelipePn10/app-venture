import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type CfgCharacteristic, type CfgGeneratedMask, type CfgItemCharacteristic, type CfgVariable,
  listCharacteristics, listItemQuestions, listSetVariables,
  generateMaskTyped, generateMasksBatch,
} from "@/services/configuratorCfgService";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems } from "@/services/lookups";
import { errMessage } from "@/services/fiscalShared";

/**
 * Responder as perguntas e gerar a máscara.
 *
 * A máscara é a parte variável do item: um único código de produto, muitas
 * combinações. Aqui ela se monta enquanto o usuário responde, pedaço a pedaço,
 * em vez de aparecer só depois de gravar — que é como FoccoERP e SAP fazem, e
 * é onde o erro de cadastro costuma passar despercebido.
 *
 * A geração em lote (produto cartesiano) cria de uma vez todas as combinações
 * de um recorte de respostas; as restrições cadastradas já removem as
 * combinações impossíveis do resultado.
 */
type Props = { aviso: (tipo: "success" | "error", msg: string) => void; itemCode: string; onItemChange: (c: string) => void };

type Pergunta = CfgItemCharacteristic & { definicao?: CfgCharacteristic; opcoes: CfgVariable[] };

export function GerarMascaraTab({ aviso, itemCode, onItemChange }: Props): JSX.Element {
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [resultado, setResultado] = useState<CfgGeneratedMask | null>(null);
  const [lote, setLote] = useState<CfgGeneratedMask[] | null>(null);
  const [recorte, setRecorte] = useState<Record<number, number[]>>({});
  const [persistir, setPersistir] = useState(false);
  const [busy, setBusy] = useState(false);

  const executar = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { aviso("error", errMessage(e)); } finally { setBusy(false); }
  }, [aviso]);

  const carregar = useCallback((code: string) => executar(async () => {
    setResultado(null); setLote(null); setRespostas({}); setRecorte({});
    if (!code.trim()) { setPerguntas([]); return; }
    const [lista, catalogo] = await Promise.all([listItemQuestions(code.trim()), listCharacteristics()]);
    const montadas: Pergunta[] = await Promise.all(lista.map(async (p) => {
      const definicao = catalogo.find((c) => c.id === p.characteristic_id);
      const opcoes = definicao?.set_id ? await listSetVariables(definicao.set_id) : [];
      return { ...p, definicao, opcoes };
    }));
    setPerguntas(montadas);
    // Respostas padrão já entram preenchidas, como no configurador do Focco.
    const iniciais: Record<number, string> = {};
    for (const p of montadas) {
      if (p.default_variable_id) iniciais[p.characteristic_id] = String(p.default_variable_id);
    }
    setRespostas(iniciais);
  }), [executar]);

  // O item escolhido é compartilhado entre as abas: ao entrar aqui já vindo de
  // outra etapa, carrega sozinho em vez de exigir que o usuário reescolha.
  useEffect(() => { void carregar(itemCode); }, [itemCode, carregar]);

  /**
   * Prévia local da máscara: o mesmo encadeamento que o backend faz, para o
   * usuário ver o código se formando antes de pedir a geração.
   */
  const previa = useMemo(() => {
    if (perguntas.length === 0) return "";
    return perguntas.map((p) => {
      const resposta = respostas[p.characteristic_id];
      if (!resposta) return "…";
      if (p.opcoes.length > 0) {
        const escolhida = p.opcoes.find((v) => String(v.id) === resposta);
        return escolhida ? (escolhida.mask_composition || escolhida.code) : "…";
      }
      return resposta;
    }).join("#");
  }, [perguntas, respostas]);

  const faltando = perguntas.filter((p) => p.definicao?.is_required !== false && !respostas[p.characteristic_id]);

  function gerar() {
    if (!itemCode.trim()) { aviso("error", "Escolha o item."); return; }
    const answers = perguntas
      .filter((p) => respostas[p.characteristic_id])
      .map((p) => (p.opcoes.length > 0
        ? { characteristic_id: p.characteristic_id, variable_id: Number(respostas[p.characteristic_id]) }
        : { characteristic_id: p.characteristic_id, value: respostas[p.characteristic_id] }));
    if (answers.length === 0) { aviso("error", "Responda ao menos uma pergunta."); return; }
    // Medida fora do limite é o erro clássico de produto sob medida: barra aqui
    // em vez de deixar virar uma ordem impossível de produzir.
    for (const p of perguntas) {
      const valor = respostas[p.characteristic_id];
      if (!valor || p.characteristic_type !== "INF_NUMERICA") continue;
      const numero = Number(valor);
      const { num_min: minimo, num_max: maximo } = p.definicao ?? {};
      if (Number.isNaN(numero)
        || (minimo != null && numero < minimo)
        || (maximo != null && numero > maximo)) {
        aviso("error", `${p.characteristic_name}: informe um valor entre ${minimo ?? "—"} e ${maximo ?? "—"}.`);
        return;
      }
    }
    void executar(async () => {
      const r = await generateMaskTyped(itemCode.trim(), answers, persistir);
      setResultado(r);
      aviso("success", persistir ? `Configuração ${r.mask} gravada para o item.` : `Máscara ${r.mask} gerada (não gravada).`);
    });
  }

  function gerarLote() {
    if (!itemCode.trim()) { aviso("error", "Escolha o item."); return; }
    const restrict = Object.entries(recorte)
      .filter(([, ids]) => ids.length > 0)
      .map(([id, ids]) => ({ characteristic_id: Number(id), variable_ids: ids }));
    if (restrict.length === 0) {
      aviso("error", "Escolha ao menos uma resposta por pergunta para limitar o lote — sem recorte o número de combinações explode.");
      return;
    }
    void executar(async () => {
      const r = await generateMasksBatch(itemCode.trim(), restrict, persistir);
      setLote(r);
      aviso("success", `${r.length} combinação(ões) válida(s) gerada(s).`);
    });
  }

  function alternarRecorte(charId: number, varId: number) {
    setRecorte((atual) => {
      const atuais = atual[charId] ?? [];
      return { ...atual, [charId]: atuais.includes(varId) ? atuais.filter((v) => v !== varId) : [...atuais, varId] };
    });
  }

  return (
    <section className="erp-detail-panel">
      <div className="erp-tabs"><button className="erp-tab active">Configurar e gerar máscara</button></div>
      <div className="erp-detail-body">

        <div className="erp-fieldset">
          <div className="erp-fieldset-head">Item</div>
          <div className="erp-fieldset-body">
            <div className="erp-field erp-c4">
              <label className="erp-label erp-req">Item configurável</label>
              <LookupField
                value={itemCode || undefined}
                onChange={(code) => { const c = code ? String(code) : ""; onItemChange(c); void carregar(c); }}
                loader={loadItems}
                entityLabel="item"
                placeholder="Escolher o item…"
              />
            </div>
            <div className="erp-field erp-c4" style={{ alignSelf: "flex-end" }}>
              <label className="erp-check">
                <input type="checkbox" checked={persistir} onChange={(e) => setPersistir(e.target.checked)} />
                Gravar a configuração no item
              </label>
              <span className="cfgw-hint">Sem marcar, a máscara é só uma simulação.</span>
            </div>
            <div className="erp-field erp-c4 cfgw-actions">
              <button className="erp-btn" onClick={() => void carregar(itemCode)} disabled={busy || !itemCode}>Recarregar perguntas</button>
            </div>
          </div>
        </div>

        {perguntas.length > 0 && (
          <div className="erp-fieldset">
            <div className="erp-fieldset-head">Respostas</div>
            <div className="erp-fieldset-body">
              {perguntas.map((p) => (
                <div className="erp-field erp-c4" key={p.id}>
                  <label className={`erp-label${p.definicao?.is_required !== false ? " erp-req" : ""}`}>
                    {p.sequence} · {p.characteristic_name}
                  </label>
                  {p.opcoes.length > 0 ? (
                    <select className="erp-input" value={respostas[p.characteristic_id] ?? ""}
                      onChange={(e) => setRespostas((r) => ({ ...r, [p.characteristic_id]: e.target.value }))}>
                      <option value="">Selecione…</option>
                      {p.opcoes.map((v) => <option key={v.id} value={v.id}>{v.code} — {v.description}</option>)}
                    </select>
                  ) : (
                    <input className={`erp-input${p.characteristic_type === "INF_NUMERICA" ? " num" : ""}`}
                      type={p.characteristic_type === "INF_NUMERICA" ? "number" : "text"}
                      min={p.definicao?.num_min} max={p.definicao?.num_max}
                      value={respostas[p.characteristic_id] ?? ""}
                      onChange={(e) => setRespostas((r) => ({ ...r, [p.characteristic_id]: e.target.value }))} />
                  )}
                  {p.definicao?.num_min != null && p.definicao?.num_max != null && (
                    <span className="cfgw-hint">Entre {p.definicao.num_min} e {p.definicao.num_max}.</span>
                  )}
                </div>
              ))}

              <div className="erp-field erp-c12">
                <label className="erp-label">Máscara em formação</label>
                <code className="cfgw-preview big">{previa || "—"}</code>
                {faltando.length > 0 && (
                  <span className="cfgw-hint">
                    Faltam responder: {faltando.map((p) => p.characteristic_name).join(", ")}.
                  </span>
                )}
              </div>

              <div className="erp-field erp-c12 cfgw-actions">
                <button className="erp-btn erp-btn-primary" onClick={gerar} disabled={busy}>
                  {persistir ? "Gerar e gravar" : "Gerar máscara"}
                </button>
              </div>

              {resultado && (
                <div className="erp-field erp-c12">
                  <table className="erp-grid">
                    <tbody>
                      <tr>
                        <td style={{ width: 180 }}>Código configurado</td>
                        <td><code className="cfgw-chip big">{itemCode} · {resultado.mask}</code></td>
                      </tr>
                      <tr><td>Máscara</td><td><code className="cfgw-chip">{resultado.mask}</code></td></tr>
                      <tr><td>Identificador</td><td><code className="cfgw-chip">{resultado.mask_hash}</code></td></tr>
                      <tr><td>Gravada no item</td><td>{resultado.persisted ? "Sim" : "Não — foi só uma simulação"}</td></tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {perguntas.some((p) => p.opcoes.length > 0) && (
          <div className="erp-fieldset">
            <div className="erp-fieldset-head">Geração em lote (todas as combinações)</div>
            <div className="erp-fieldset-body">
              {perguntas.filter((p) => p.opcoes.length > 0).map((p) => (
                <div className="erp-field erp-c6" key={`lote-${p.id}`}>
                  <label className="erp-label">{p.characteristic_name}</label>
                  <div className="cfgw-checks">
                    {p.opcoes.map((v) => (
                      <label className="erp-check" key={v.id}>
                        <input type="checkbox"
                          checked={(recorte[p.characteristic_id] ?? []).includes(v.id!)}
                          onChange={() => alternarRecorte(p.characteristic_id, v.id!)} />
                        {v.code}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <div className="erp-field erp-c12 cfgw-actions">
                <button className="erp-btn erp-btn-dark" onClick={gerarLote} disabled={busy}>Gerar combinações</button>
                <span className="cfgw-hint">As combinações barradas por restrição não entram no resultado.</span>
              </div>

              {lote && (
                <div className="erp-field erp-c12">
                  <table className="erp-grid">
                    <thead><tr><th>#</th><th>Máscara</th><th>Identificador</th></tr></thead>
                    <tbody>
                      {lote.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nenhuma combinação válida para este recorte.</td></tr>}
                      {lote.map((m, i) => (
                        <tr key={m.mask_hash || i}>
                          <td>{i + 1}</td>
                          <td><code className="cfgw-chip">{m.mask}</code></td>
                          <td>{m.mask_hash}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

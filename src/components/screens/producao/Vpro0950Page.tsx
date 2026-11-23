import { useEffect, useMemo, useRef, useState } from "react";
import { scanProductionOrder, type ProductionScanAction, type ProductionScanResult } from "@/services/productionOrderService";
import { listMaquinasDoPosto, loadEmployeesById, type MaquinaDoPosto } from "@/services/lookups";
import { LookupField } from "@/components/ui/LookupField";
import { errMessage } from "@/services/fiscalShared";
import { Cabecalho, Rodape, Selo } from "../planejamento/planUi";

/**
 * Apontamento no Posto (VPRO0950): a tela do tablet/celular do chão de fábrica.
 * O posto (aparelho, operador, máquina) fica guardado no aparelho; o operador lê
 * a etiqueta da etapa (QR/código de barras), ajusta as peças boas e o refugo com
 * botões grandes e aponta — três toques. A baixa automática do material aparece
 * na hora, para ninguém baixar de novo à mão.
 */
const CHAVE = "vpro0950-posto";
interface Posto { dispositivo: string; operador?: number; maquina?: number }
function lerPosto(): Posto {
  try { const p = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as Posto | null; if (p?.dispositivo) return p; } catch { /* sem armazenamento: posto novo */ }
  return { dispositivo: `tablet-${Math.random().toString(36).slice(2, 8)}` };
}
function gravarPosto(p: Posto) { try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch { /* sem armazenamento: vale até fechar */ } }
const dec = (v: number) => (Math.round(v * 1000) / 1000).toString();

function Contador({ rotulo, valor, onChange, tom }: { rotulo: string; valor: number; onChange: (v: number) => void; tom?: "danger" }): JSX.Element {
  const botao = { width: 64, height: 64, fontSize: 28, borderRadius: 14 } as const;
  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div className="erp-label" style={{ fontSize: 13 }}>{rotulo}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
        <button type="button" className="erp-btn" style={botao} aria-label={`Diminuir ${rotulo}`} onClick={() => onChange(Math.max(0, valor - 1))}>−</button>
        <input className="erp-input" inputMode="decimal" aria-label={rotulo} value={dec(valor)} style={{ height: 64, fontSize: 30, textAlign: "center", fontWeight: 700, color: tom === "danger" ? "var(--v-err)" : undefined }}
          onChange={(e) => { const n = Number(e.target.value.replace(",", ".")); if (!Number.isNaN(n) && n >= 0) onChange(n); }} />
        <button type="button" className="erp-btn" style={botao} aria-label={`Aumentar ${rotulo}`} onClick={() => onChange(valor + 1)}>+</button>
      </div>
    </div>
  );
}

export function Vpro0950Page(): JSX.Element {
  const [posto, setPosto] = useState<Posto>(lerPosto);
  const [maquinas, setMaquinas] = useState<MaquinaDoPosto[]>([]);
  const [config, setConfig] = useState(!posto.operador);
  const [token, setToken] = useState("");
  const [lido, setLido] = useState<ProductionScanResult | null>(null);
  const [boas, setBoas] = useState(1);
  const [refugo, setRefugo] = useState(0);
  const [motivo, setMotivo] = useState("");
  const [concluir, setConcluir] = useState(false);
  const [resultado, setResultado] = useState<ProductionScanResult | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const leitor = useRef<HTMLInputElement>(null);

  useEffect(() => { void listMaquinasDoPosto().then((m) => setMaquinas(m.filter((x) => x.is_active))).catch(() => setMaquinas([])); }, []);
  useEffect(() => { gravarPosto(posto); }, [posto]);
  useEffect(() => { if (!config && !lido) leitor.current?.focus(); }, [config, lido, resultado]);
  const maquina = useMemo(() => maquinas.find((m) => m.id === posto.maquina), [maquinas, posto.maquina]);

  const enviar = async (acao: ProductionScanAction) => {
    setBusy(true); setErro(null);
    try {
      const r = await scanProductionOrder({
        token: token.trim(), action: acao, idempotency_key: `${posto.dispositivo}-${crypto.randomUUID()}`, device_id: posto.dispositivo,
        employee_id: posto.operador, machine_id: posto.maquina,
        ...(acao === "APONTAR" ? { good_quantity: dec(boas), scrap_quantity: dec(refugo), scrap_reason: refugo > 0 && motivo.trim() ? motivo.trim() : undefined, complete_operation: concluir } : {}),
      });
      if (acao === "RESOLVER") { setLido(r); setResultado(null); setBoas(1); setRefugo(0); setMotivo(""); setConcluir(false); }
      else if (acao === "INICIAR") { setLido({ ...r }); }
      else { setResultado(r); setLido(null); setToken(""); }
    } catch (e) { setErro(errMessage(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="erp-screen">
      <Cabecalho modulo="Produção" titulo="Apontamento no Posto" codigo="VPRO0950"
        meta={<button className="erp-btn erp-btn-sm" onClick={() => setConfig((c) => !c)}>{config ? "Fechar posto" : "Posto"}</button>} />
      <div />
      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-detail-body" style={{ maxWidth: 820, margin: "0 auto", width: "100%" }}>
            {config && (
              <div className="erp-fieldset"><div className="erp-fieldset-head">Este posto</div><div className="erp-fieldset-body">
                <div className="erp-field erp-c4"><label className="erp-label" htmlFor="posto-disp">Aparelho</label>
                  <input id="posto-disp" className="erp-input" value={posto.dispositivo} onChange={(e) => setPosto((p) => ({ ...p, dispositivo: e.target.value }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label">Operador</label>
                  <LookupField value={posto.operador} loader={loadEmployeesById} entityLabel="operador" onChange={(c) => setPosto((p) => ({ ...p, operador: c ? Number(c) : undefined }))} /></div>
                <div className="erp-field erp-c4"><label className="erp-label" htmlFor="posto-maq">Máquina</label>
                  <select id="posto-maq" className="erp-input" value={posto.maquina ?? ""} onChange={(e) => setPosto((p) => ({ ...p, maquina: e.target.value ? Number(e.target.value) : undefined }))}>
                    <option value="">Sem máquina</option>
                    {maquinas.map((m) => <option key={m.id} value={m.id}>{m.code} · {m.name}</option>)}
                  </select></div>
                <div className="erp-field erp-c12" style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                  <button className="erp-btn erp-btn-primary" onClick={() => setConfig(false)} disabled={!posto.operador} title={posto.operador ? undefined : "Escolha o operador do posto"}>Pronto</button></div>
              </div></div>
            )}
            {erro && <div className="erp-feedback error" role="alert" style={{ fontSize: 15 }}>{erro}</div>}

            {!lido && (
              <div className="erp-fieldset"><div className="vpl-panel-body" style={{ textAlign: "center", padding: 28 }}>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Leia a etiqueta da etapa</div>
                <input ref={leitor} className="erp-input" aria-label="Código lido" placeholder="aponte o leitor ou digite o código" value={token}
                  style={{ height: 56, fontSize: 20, textAlign: "center" }} onChange={(e) => setToken(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && token.trim() && posto.operador) void enviar("RESOLVER"); }} />
                <button className="erp-btn erp-btn-primary" style={{ marginTop: 14, height: 52, fontSize: 17, padding: "0 28px" }} disabled={busy || !token.trim() || !posto.operador} onClick={() => void enviar("RESOLVER")}>Abrir</button>
                <div className="erp-hint" style={{ marginTop: 10 }}>{maquina ? `Máquina ${maquina.code} · ${maquina.name}` : "Sem máquina escolhida"}{posto.operador ? " · operador definido" : " · escolha o operador em Posto"}</div>
              </div></div>
            )}

            {lido && (
              <div className="erp-fieldset">
                <div className="erp-fieldset-head" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15 }}>
                  <span style={{ flex: 1 }}>OF {lido.order_number}</span>
                  <Selo tom={lido.status === "IN_PROGRESS" || lido.status === "EM_ANDAMENTO" ? "info" : "warn"}>{lido.status === "OPEN" ? "Não iniciada" : lido.status === "IN_PROGRESS" || lido.status === "EM_ANDAMENTO" ? "Em andamento" : lido.status}</Selo>
                  {lido.operation_status && <Selo tom="muted">Etapa: {lido.operation_status}</Selo>}
                </div>
                <div className="vpl-panel-body">
                  {lido.message && <p className="erp-note">{lido.message}</p>}
                  {lido.status === "OPEN" ? (
                    <button className="erp-btn erp-btn-primary" style={{ width: "100%", height: 64, fontSize: 19 }} disabled={busy} onClick={() => void enviar("INICIAR")}>Iniciar a OF</button>
                  ) : (<>
                    <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                      <Contador rotulo="Peças boas" valor={boas} onChange={setBoas} />
                      <Contador rotulo="Refugo" valor={refugo} onChange={setRefugo} tom="danger" />
                    </div>
                    {refugo > 0 && <input className="erp-input" style={{ marginTop: 12, height: 46 }} placeholder="Motivo do refugo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
                    <label className="erp-check" style={{ marginTop: 14, fontSize: 15 }}><input type="checkbox" checked={concluir} onChange={(e) => setConcluir(e.target.checked)} style={{ width: 22, height: 22 }} /> Esta etapa terminou</label>
                    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                      <button className="erp-btn" style={{ height: 64, fontSize: 17, flex: 1 }} disabled={busy} onClick={() => { setLido(null); setToken(""); }}>Cancelar</button>
                      <button className="erp-btn erp-btn-primary" style={{ height: 64, fontSize: 19, flex: 2 }} disabled={busy || (boas <= 0 && refugo <= 0)} onClick={() => void enviar("APONTAR")}>
                        {busy ? "Apontando…" : `Apontar ${dec(boas)} boa(s)${refugo > 0 ? ` e ${dec(refugo)} refugo` : ""}`}</button>
                    </div>
                  </>)}
                </div>
              </div>
            )}

            {resultado && (
              <div className="erp-fieldset" style={{ borderColor: "var(--v-green, #3d7a3d)" }}>
                <div className="erp-fieldset-head">Apontado na OF {resultado.order_number}</div>
                <div className="vpl-panel-body">
                  <p style={{ fontSize: 15, margin: "0 0 8px" }}>{resultado.message || (resultado.replayed ? "Esta leitura já tinha sido registrada." : "Apontamento registrado.")}</p>
                  {(resultado.auto_issues?.length ?? 0) > 0 ? (<>
                    <div className="erp-label">Material baixado do estoque agora (não baixe de novo):</div>
                    <ul style={{ margin: "6px 0 0", paddingLeft: 20, fontSize: 15 }}>
                      {resultado.auto_issues!.map((b, i) => <li key={i}><strong>{b.item_code}</strong>: {String(b.quantity).replace(".", ",")} (almoxarifado {b.warehouse_id})</li>)}
                    </ul>
                  </>) : <p className="erp-hint">Nenhum material com baixa automática nesta etapa.</p>}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      <Rodape><div className="erp-status-item">Posto: <strong>{posto.dispositivo}</strong></div>{maquina && <div className="erp-status-item">Máquina: <strong>{maquina.code}</strong></div>}</Rodape>
    </div>
  );
}

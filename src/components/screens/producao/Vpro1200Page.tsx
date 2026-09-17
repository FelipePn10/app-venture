import { useState, useCallback, useEffect, useRef } from "react";
import { type Machine, listMachines, DOWNTIME_TYPES } from "@/services/machineService";
import {
  machineStopStatus, openMachineStop, closeMachineStop, type MachineStop,
} from "@/services/apsService";
import { errMessage } from "@/services/fiscalShared";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

/**
 * VPRO1200 — Parada de Máquina (terminal de chão de fábrica).
 *
 * Fica aberta ao lado da máquina o turno inteiro e é lida de pé, a dois metros.
 * Por isso não se parece com o resto do sistema: não é um formulário que se
 * preenche, é um painel que se olha e um botão que se toca.
 *
 * A cor carrega o estado — máquina parada tinge o palco de âmbar. De longe
 * ninguém lê rótulo, lê cor.
 *
 * O cadastro completo (parada retroativa, correção, consulta por período)
 * continua na VMAQ0200, aba Paradas, que é a tela do PCP.
 */

/** Motivos mais frequentes primeiro: é o que o operador toca sem pensar. */
const ATALHOS = [
  { reason: "Troca de ferramenta", type: "UNPLANNED", ico: "🔧" },
  { reason: "Ajuste / regulagem", type: "UNPLANNED", ico: "🎛️" },
  { reason: "Falta de material", type: "UNPLANNED", ico: "📦" },
  { reason: "Quebra", type: "UNPLANNED", ico: "⚠️" },
  { reason: "Manutenção", type: "MAINTENANCE", ico: "🛠️" },
  { reason: "Parada programada", type: "PLANNED", ico: "🕑" },
] as const;

/** hh:mm:ss quando passa de uma hora; mm:ss no caso comum, que é o de minutos. */
function duracao(minutos: number): string {
  const total = Math.max(0, Math.floor(minutos * 60));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function Vpro1200Page(): JSX.Element {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineCode, setMachineCode] = useState(0);
  const [status, setStatus] = useState<MachineStop | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  /** Força o redesenho a cada segundo enquanto há parada aberta. */
  const [, setTick] = useState(0);
  const lidoEm = useRef<number>(Date.now());

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setFeedback(null);
    try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }, []);

  useEffect(() => { void run(async () => { setMachines(await listMachines()); }); }, [run]);

  const maquina = machines.find((m) => m.code === machineCode);
  const parada = status?.open === true;

  const consultar = useCallback((id: number) => run(async () => {
    const r = await machineStopStatus(id);
    lidoEm.current = Date.now();
    setStatus(r);
  }), [run]);

  // O relógio anda na tela; a fonte da verdade continua sendo o servidor — a
  // duração gravada é sempre a dele, nunca a contada aqui.
  useEffect(() => {
    if (!parada) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [parada]);

  const decorrido = parada && status ? status.minutes + (Date.now() - lidoEm.current) / 60000 : 0;

  const pararPor = (reason: string, type: string) => run(async () => {
    if (!maquina) throw new Error("Escolha a máquina deste posto.");
    const r = await openMachineStop(maquina.id, type, reason);
    lidoEm.current = Date.now();
    setStatus(r);
  });

  const voltar = () => run(async () => {
    if (!maquina) throw new Error("Escolha a máquina deste posto.");
    const r = await closeMachineStop(maquina.id);
    setStatus({ ...r, open: false });
    setFeedback({ type: "success", message: `Parada encerrada: ${duracao(r.minutes)}.` });
  });

  const motivoEmCurso = status?.reason
    || DOWNTIME_TYPES.find((t) => t.value === status?.downtime_type)?.label
    || "Parada";

  return (
    <div className="erp-screen">
      <header className="erp-screen-head">
        <div>
          <h1 className="erp-screen-title">Parada de Máquina</h1>
          <p className="erp-screen-sub">VPRO1200 · terminal de chão de fábrica</p>
        </div>
      </header>

      <div className="erp-content">
        <div className="fsc-term">
          {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

          <div className="fsc-term-bar">
            <label htmlFor="vpro1200-maquina">Posto</label>
            <select
              id="vpro1200-maquina"
              value={machineCode || ""}
              onChange={(e) => {
                const code = Number(e.target.value);
                setMachineCode(code); setStatus(null); setFeedback(null);
                const m = machines.find((x) => x.code === code);
                if (m) void consultar(m.id);
              }}
            >
              <option value="">Escolha a máquina deste posto</option>
              {machines.filter((m) => m.is_active).map((m) => (
                <option key={m.code} value={m.code}>{m.code} · {m.name}</option>
              ))}
            </select>
            {maquina && status && (
              <span className={`fsc-term-state${parada ? " parada" : ""}`}>
                {parada ? "Parada" : "Produzindo"}
              </span>
            )}
          </div>

          {!maquina && (
            <div className="fsc-term-empty">
              <span className="fsc-term-empty-ico" aria-hidden="true">🏭</span>
              <strong style={{ fontSize: 18, color: "var(--v-text-2)" }}>Escolha a máquina deste posto</strong>
              <span>Depois é só tocar no motivo quando ela parar. O horário é o de agora.</span>
            </div>
          )}

          {maquina && !status && (
            <div className="fsc-term-empty"><span>Consultando o estado da máquina…</span></div>
          )}

          {maquina && status && (
            <div className={`fsc-term-stage${parada ? " parada" : ""}`}>
              {parada ? (
                <>
                  <p className="fsc-term-machine">{maquina.name}</p>
                  <p className="fsc-term-clock" role="timer" aria-live="off">{duracao(decorrido)}</p>
                  <p className="fsc-term-reason">{motivoEmCurso}</p>
                  <button className="fsc-term-back" onClick={voltar} disabled={busy}>
                    Voltou a produzir
                  </button>
                </>
              ) : (
                <>
                  <p className="fsc-term-machine">{maquina.name}</p>
                  <p className="fsc-term-hint">Parou? Toque no motivo — não precisa digitar horário.</p>
                  <div className="fsc-term-grid">
                    {ATALHOS.map((a) => (
                      <button
                        key={a.reason}
                        className="fsc-term-tile"
                        onClick={() => pararPor(a.reason, a.type)}
                        disabled={busy}
                      >
                        <span className="fsc-term-tile-ico" aria-hidden="true">{a.ico}</span>
                        {a.reason}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

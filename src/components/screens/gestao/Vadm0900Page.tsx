import { useCallback, useEffect, useRef, useState } from "react";
import { pedirSimulacao, statusSimulacao, type StatusSimulacao } from "@/services/gestaoService";
import { confirmar } from "@/components/ui/dialogos";
import { Aviso, Cabecalho, Painel, Progresso, Rodape, Selo, Vazio } from "../planejamento/planUi";
import { dataHora, type Tom } from "../planejamento/planFormat";
import { useAcao } from "../planejamento/planHooks";

/**
 * Modo Simulação (VADM0900): copia o banco desta empresa para o ambiente de
 * treino. Lá a NF-e só vai para homologação e banco, WhatsApp e frete ficam
 * desligados: dá para testar um processo novo com os dados reais sem risco.
 */
const SITUACAO: Record<string, { rotulo: string; tom: Tom }> = {
  idle: { rotulo: "Nenhuma cópia em andamento", tom: "muted" }, queued: { rotulo: "Na fila", tom: "info" }, running: { rotulo: "Copiando", tom: "info" },
  succeeded: { rotulo: "Pronta", tom: "ok" }, failed: { rotulo: "Falhou", tom: "danger" },
};

export function Vadm0900Page(): JSX.Element {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [st, setSt] = useState<StatusSimulacao | null>(null);
  const timer = useRef<number>();

  const ler = useCallback(async () => { setSt(await statusSimulacao()); }, []);
  useEffect(() => { void run(ler); }, [run, ler]);
  const andando = st?.state === "queued" || st?.state === "running";
  useEffect(() => {
    if (!andando) return;
    timer.current = window.setInterval(() => { void ler().catch(() => undefined); }, 3000);
    return () => window.clearInterval(timer.current);
  }, [andando, ler]);

  const pedir = async () => {
    const ok = await confirmar({ titulo: "Copiar para o treino", mensagem: "O banco de treino atual será APAGADO e substituído por uma cópia dos dados de hoje desta empresa. Quem estiver usando o treino perde o que fez lá. A produção não é afetada.", rotulo: "Copiar agora", tom: "perigo" });
    if (!ok) return;
    void run(async () => { setSt(await pedirSimulacao()); setFeedback({ type: "info", message: "Pedido registrado. A cópia leva alguns minutos." }); });
  };
  const s = SITUACAO[st?.state ?? "idle"] ?? { rotulo: st?.state ?? "—", tom: "muted" as Tom };

  return (
    <div className="erp-screen">
      <Cabecalho modulo="Cadastros" titulo="Modo Simulação (treino)" codigo="VADM0900" />
      <div className="erp-toolbar vpl-toolbar">
        <div className="erp-tgroup"><button className="erp-btn erp-btn-primary" onClick={() => void pedir()} disabled={busy || andando}>Copiar dados de hoje para o treino</button></div>
        <div className="erp-tgroup"><button className="erp-btn" onClick={() => void run(ler)} disabled={busy}>Atualizar</button></div>
      </div>
      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-detail-body">
            <Aviso feedback={feedback} busy={busy} />
            {!st ? <Vazio titulo="Lendo a situação…" /> : (
              <div className="vpl-cols wide-left">
                <Painel titulo="Situação da cópia" acoes={<Selo tom={s.tom}>{s.rotulo}</Selo>}>
                  {andando && <Progresso valor={st.progress} total={100} />}
                  {st.message && <p className="erp-note">{st.message}</p>}
                  <p className="erp-text-muted" style={{ fontSize: 12 }}>
                    {st.requested_at ? `Pedida em ${dataHora(st.requested_at)}` : "Nenhuma cópia pedida ainda."}
                    {st.finished_at ? ` · concluída em ${dataHora(st.finished_at)}` : ""}
                  </p>
                  {st.state === "succeeded" && st.training_url && (
                    <p className="erp-note">Para entrar no treino, saia do sistema e, no login, escolha <strong>Tecnofer — Treino</strong> (mesmo usuário e senha da produção). Enquanto estiver no treino, uma faixa laranja "TREINO" fica na tela. Endereço: {st.training_url}.</p>
                  )}
                </Painel>
                <Painel titulo="O que muda na cópia">
                  <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, fontSize: 12.5 }}>
                    <li>A NF-e vai só para <strong>homologação</strong> (sem valor fiscal) e a busca automática de notas na SEFAZ fica desligada.</li>
                    <li>Avisos que estavam na fila de envio são <strong>cancelados</strong>; e-mail enviado do treino chega com "[TREINAMENTO - SEM VALOR]" no assunto.</li>
                    <li>Banco Inter, WhatsApp e hub de frete ficam <strong>desligados</strong> no treino.</li>
                    <li>O nome da empresa ganha <strong>[TREINO]</strong> na frente.</li>
                    <li>O que se faz no treino <strong>não volta</strong> para a produção.</li>
                    <li>O treino é uma cópia da <strong>Tecnofer</strong>: só os usuários da Tecnofer entram (no login, "Tecnofer — Treino"). Senhas e o token de produção da NF-e não são copiados.</li>
                  </ul>
                </Painel>
              </div>
            )}
          </div>
        </section>
      </div>
      <Rodape><div className="erp-status-item">Situação: <strong>{s.rotulo}</strong></div></Rodape>
    </div>
  );
}

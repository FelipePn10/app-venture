import { useEffect, useMemo, useState } from "react";
import { type MrpAlertResult, notifyMrpExceptions } from "@/services/mrpAlertsService";
import { type MrpException, getExceptions } from "@/services/mrpService";
import { type ProductionPlanDTO, listProductionPlans } from "@/services/productionPlanService";
import { ExportButton } from "@/components/ui/ExportButton";
import { tipoExcecao, tomDaExcecao } from "../planejamento/mrp/excecoes";
import { type Aba, Abas, Aviso, Cabecalho, Kpis, Painel, Rodape, Selo, Vazio } from "../planejamento/planUi";
import { dataHora, normalizar } from "../planejamento/planFormat";
import { useAcao } from "../planejamento/planHooks";

/**
 * Alertas de exceções do MRP.
 *
 * A tela só tinha "Notificar": para ver as exceções era preciso disparar o
 * aviso por webhook/e-mail. Agora a consulta é uma aba própria, que não envia
 * nada, e a notificação fica na outra, com os canais.
 */
type AbaAlertas = "excecoes" | "notificar";

export function Vpro0700Page(): JSX.Element {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [aba, setAba] = useState<AbaAlertas>("excecoes");
  const [planos, setPlanos] = useState<ProductionPlanDTO[]>([]);
  const [plano, setPlano] = useState<number | undefined>();
  const [excecoes, setExcecoes] = useState<MrpException[]>([]);
  const [tipo, setTipo] = useState("");
  const [busca, setBusca] = useState("");
  const [webhook, setWebhook] = useState("");
  const [emails, setEmails] = useState("");
  const [envio, setEnvio] = useState<MrpAlertResult | null>(null);

  useEffect(() => {
    void run(async () => {
      const l = await listProductionPlans();
      setPlanos(l);
      setPlano((p) => p ?? (l.find((x) => x.is_active) ?? l[0])?.code);
    });
  }, [run]);
  useEffect(() => { if (plano) void run(async () => { setExcecoes(await getExceptions(plano)); setTipo(""); }); }, [plano, run]);

  const tipos = useMemo(() => {
    const m = new Map<string, number>();
    excecoes.forEach((e) => m.set(e.message_type, (m.get(e.message_type) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [excecoes]);
  const visiveis = useMemo(() => {
    const q = normalizar(busca.trim());
    return excecoes.filter((e) => (!tipo || e.message_type === tipo) && (!q || normalizar(`${e.item_code} ${e.description}`).includes(q)));
  }, [excecoes, tipo, busca]);
  const urgentes = excecoes.filter((e) => tomDaExcecao(e.message_type) === "danger").length;

  const notificar = () => run(async () => {
    if (!plano) { setFeedback({ type: "error", message: "Escolha o plano." }); return; }
    const email_to = emails.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    const invalido = email_to.find((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
    if (invalido) { setFeedback({ type: "error", message: `E-mail inválido: ${invalido}` }); return; }
    if (webhook.trim() && !/^https?:\/\//i.test(webhook.trim())) { setFeedback({ type: "error", message: "O webhook precisa começar com http:// ou https://." }); return; }
    const r = await notifyMrpExceptions({ plan_code: plano, webhook_url: webhook.trim() || undefined, email_to: email_to.length ? email_to : undefined });
    setEnvio(r);
    const canais = [webhook.trim() && "webhook", email_to.length && `${email_to.length} e-mail(s)`].filter(Boolean).join(" e ");
    setFeedback({ type: "success", message: canais ? `${r.total} exceção(ões) enviada(s) por ${canais}.` : `${r.total} exceção(ões) consolidada(s); nenhum canal informado, nada foi enviado.` });
  });

  const ABAS: Aba<AbaAlertas>[] = [
    { id: "excecoes", label: "Exceções do plano", contador: excecoes.length, alerta: true },
    { id: "notificar", label: "Notificar", hint: "Enviar as exceções por webhook e/ou e-mail" },
  ];

  return (
    <div className="erp-screen">
      <Cabecalho modulo="Produção" titulo="Alertas de Exceções do MRP" codigo="VPRO0700" />
      <div className="erp-toolbar vpl-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Plano MRP</span>
          <select className="erp-tselect" style={{ width: 240 }} aria-label="Plano MRP" value={plano ?? ""} onChange={(e) => setPlano(Number(e.target.value) || undefined)}>
            {planos.length === 0 && <option value="">Nenhum plano</option>}
            {planos.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}
          </select>
          <button className="erp-btn" onClick={() => plano && void run(async () => { setExcecoes(await getExceptions(plano)); })} disabled={busy || !plano}>Atualizar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup"><ExportButton title="VPRO0700 — Alertas de Exceções do MRP" filename="vpro0700" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <Abas abas={ABAS} ativa={aba} onChange={setAba} />
          <div className="erp-detail-body">
            <Aviso feedback={feedback} busy={busy} />

            {aba === "excecoes" && (excecoes.length === 0 ? (
              <Painel titulo="Exceções"><Vazio titulo="Nenhuma exceção no último cálculo deste plano" texto="As exceções aparecem depois que o MRP do plano roda (VMRP0100 ou pipeline VPLN0100)." /></Painel>
            ) : (<>
              <Kpis itens={[
                { label: "Exceções", value: excecoes.length, hint: `${tipos.length} tipo(s)` },
                { label: "Pedem ação imediata", value: urgentes, tom: urgentes ? "danger" : "ok", hint: "acelerar ou antecipar ordens" },
                { label: "Itens afetados", value: new Set(excecoes.map((e) => e.item_code)).size },
              ]} />
              <Painel titulo="Filtros">
                <div className="vpl-filters">
                  <div className="erp-field vpl-grow"><label className="erp-label" htmlFor="al-busca">Item ou texto da mensagem</label>
                    <input id="al-busca" className="erp-input" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
                </div>
                <div className="erp-chips" style={{ marginTop: 10 }}>
                  <button type="button" className={`erp-chip${tipo === "" ? " active" : ""}`} onClick={() => setTipo("")}>Todas · {excecoes.length}</button>
                  {tipos.map(([t, n]) => <button key={t} type="button" className={`erp-chip${tipo === t ? " active" : ""}`} onClick={() => setTipo(t)}>{tipoExcecao(t)} · {n}</button>)}
                </div>
              </Painel>
              <Painel titulo="Exceções" sub={`${visiveis.length} de ${excecoes.length}`} flush>
                <table className="erp-grid">
                  <thead><tr><th>Item</th><th>Tipo</th><th>Mensagem</th></tr></thead>
                  <tbody>{visiveis.map((e, i) => (
                    <tr key={`${e.item_code}-${i}`}><td className="vpl-strong">{e.item_code}</td><td><Selo tom={tomDaExcecao(e.message_type)}>{tipoExcecao(e.message_type)}</Selo></td><td>{e.description}</td></tr>
                  ))}</tbody>
                </table>
              </Painel>
            </>))}

            {aba === "notificar" && (<>
              <Painel titulo="Canais" sub="vazios, as exceções só são consolidadas — nada é enviado">
                <div className="erp-fieldset-body" style={{ padding: 0 }}>
                  <div className="erp-field erp-c6"><label className="erp-label" htmlFor="al-webhook">Webhook</label>
                    <input id="al-webhook" className="erp-input" placeholder="https://chat.empresa.com/alertas-mrp" value={webhook} onChange={(e) => setWebhook(e.target.value)} /></div>
                  <div className="erp-field erp-c6"><label className="erp-label" htmlFor="al-emails">E-mails</label>
                    <input id="al-emails" className="erp-input" placeholder="pcp@empresa.com, gerencia@empresa.com" value={emails} onChange={(e) => setEmails(e.target.value)} />
                    <span className="erp-hint">Separe por vírgula. O envio usa o servidor de e-mail configurado na empresa.</span></div>
                  <div className="erp-field erp-c12"><button className="erp-btn erp-btn-primary" style={{ alignSelf: "flex-start" }} onClick={() => void notificar()} disabled={busy || !plano}>Notificar exceções do plano {plano ?? ""}</button></div>
                </div>
              </Painel>
              {envio && (
                <Painel titulo="Último envio" sub={dataHora(envio.generated_at)}>
                  <div className="erp-chips">{Object.entries(envio.by_type).map(([k, v]) => <span key={k} className="erp-chip">{tipoExcecao(k)} · {v}</span>)}</div>
                  <p className="erp-hint" style={{ marginTop: 8 }}>{envio.total} exceção(ões) no envio.</p>
                </Painel>
              )}
            </>)}
          </div>
        </section>
      </div>

      <Rodape>
        <div className="erp-status-item">Plano: <strong>{plano ?? "—"}</strong></div>
        <div className="erp-status-item">Exceções: <strong>{excecoes.length}</strong></div>
      </Rodape>
    </div>
  );
}

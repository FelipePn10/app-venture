import { useState } from "react";
import { processarRetorno, type ResultadoRetorno } from "@/services/gestaoService";
import { LookupField } from "@/components/ui/LookupField";
import { loadBankAccounts } from "@/services/lookups";
import { Aviso, Painel, Selo } from "../planejamento/planUi";
import { useAcao } from "../planejamento/planHooks";

/**
 * Aba "Retorno" da VFIN0610: lê o arquivo de retorno CNAB 240 do banco e baixa
 * os títulos liquidados (localizados pelo nosso número da remessa).
 */
export function RetornoCnabAba(): JSX.Element {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [conta, setConta] = useState<number | undefined>();
  const [arquivo, setArquivo] = useState<{ nome: string; conteudo: string } | null>(null);
  const [retorno, setRetorno] = useState<ResultadoRetorno | null>(null);

  const ler = async (f?: File | null) => { if (f) { setArquivo({ nome: f.name, conteudo: await f.text() }); setRetorno(null); } };
  const processar = () => void run(async () => {
    if (!conta) { setFeedback({ type: "error", message: "Escolha a conta bancária do retorno." }); return; }
    if (!arquivo) { setFeedback({ type: "error", message: "Escolha o arquivo de retorno (.ret / .txt) do banco." }); return; }
    const r = await processarRetorno(conta, arquivo.conteudo); setRetorno(r);
    setFeedback({ type: r.failures.length ? "error" : "success", message: `${r.settled.length} título(s) baixado(s)${r.failures.length ? ` · ${r.failures.length} falha(s)` : ""}.` });
  });

  return (<>
    <Aviso feedback={feedback} busy={busy} />
    <Painel titulo="Arquivo de retorno" sub="CNAB 240 do banco (liquidações e baixas)"
      acoes={<button className="erp-btn erp-btn-primary erp-btn-sm" onClick={processar} disabled={busy || !arquivo}>Processar retorno</button>}>
      <div className="erp-fieldset-body" style={{ padding: 0 }}>
        <div className="erp-field erp-c6"><label className="erp-label erp-req">Conta bancária</label>
          <LookupField value={conta} loader={loadBankAccounts} entityLabel="conta bancária" onChange={(c) => setConta(c ? Number(c) : undefined)} /></div>
        <div className="erp-field erp-c6"><label className="erp-label erp-req" htmlFor="ret-arq">Arquivo</label>
          <input id="ret-arq" className="erp-input" type="file" accept=".ret,.txt,.RET,.TXT" onChange={(e) => void ler(e.target.files?.[0])} />
          {arquivo && <span className="erp-hint">{arquivo.nome} · {arquivo.conteudo.split(/\r?\n/).filter(Boolean).length} linha(s)</span>}</div>
      </div>
      <p className="erp-note">Cada título é localizado pelo nosso número do boleto. Juros e multa que o banco informou entram como encargo; o título já baixado não baixa de novo.</p>
    </Painel>
    {retorno && (
      <div className="vpl-cols">
        <Painel titulo="Baixados" sub={String(retorno.settled.length)}>{retorno.settled.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{retorno.settled.map((s) => <li key={s}>{s}</li>)}</ul> : <span className="erp-text-muted">Nenhum.</span>}</Painel>
        <Painel titulo="Requer atenção" sub={String(retorno.not_found.length + retorno.failures.length)}>
          {retorno.not_found.map((s) => <div key={s}><Selo tom="warn">Não encontrado</Selo> {s}</div>)}
          {retorno.failures.map((s) => <div key={s}><Selo tom="danger">Falha</Selo> {s}</div>)}
          {retorno.already_settled.map((s) => <div key={s}><Selo tom="muted">Já baixado</Selo> {s}</div>)}
          {retorno.other_occurrences > 0 && <p className="erp-note">{retorno.other_occurrences} ocorrência(s) que não são liquidação (entrada confirmada, tarifa…).</p>}
          {!retorno.not_found.length && !retorno.failures.length && !retorno.already_settled.length && <span className="erp-text-muted">Nada.</span>}
        </Painel>
      </div>
    )}
  </>);
}

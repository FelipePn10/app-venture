import { useEffect, useMemo, useState } from "react";
import { type ContaBancaria, type ContaReceber, gerarRemessaCnab240, listContasBancarias, listContasReceber, saldoContaReceber } from "@/services/financialService";
import { getFiscalConfig } from "@/services/fiscalConfigService";
import { errMessage } from "@/services/fiscalShared";
import { getDestinatarioDaNota } from "@/services/nfeService";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadBankAccounts, loadCustomers } from "@/services/lookups";
import { useAuthStore } from "@/store/authStore";
import { nomeDoBanco } from "@/utils/bancos";
import { documentoComMascara } from "@/utils/documentoFiscal";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

const money = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dataBR = (iso?: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
const digitos = (s?: string) => (s ?? "").replace(/\D/g, "");

const ESPECIES = [
  { value: "02", label: "02 — Duplicata mercantil" },
  { value: "04", label: "04 — Duplicata de serviço" },
  { value: "12", label: "12 — Nota promissória" },
  { value: "17", label: "17 — Recibo" },
];

/**
 * VFIN0610 — Remessa bancária CNAB 240.
 *
 * Banco, agência e conta vêm da conta bancária escolhida; a empresa, da
 * Configuração Fiscal; e cada título, do contas a receber, com o pagador buscado
 * no cadastro do cliente. Só o que é combinado com o banco se digita aqui.
 */
export function Vfin0610Page(): JSX.Element {
  const isAdmin = useAuthStore((s) => s.user?.role?.toUpperCase() === "ADMIN");
  const [contaId, setContaId] = useState<number | undefined>();
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [empresa, setEmpresa] = useState<{ cnpj: string; nome: string } | null>(null);
  const [convenio, setConvenio] = useState("");
  const [agenciaDv, setAgenciaDv] = useState("");
  const [carteira, setCarteira] = useState("1");
  const [especie, setEspecie] = useState("02");
  const [nsa, setNsa] = useState(1);
  const [titulos, setTitulos] = useState<ContaReceber[] | null>(null);
  const [marcados, setMarcados] = useState<Set<number>>(new Set());
  const [busca, setBusca] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [c, cfg, abertos] = await Promise.all([listContasBancarias(), getFiscalConfig(), listContasReceber({ status: "PENDENTE" })]);
        setContas(c); setEmpresa({ cnpj: digitos(cfg.cnpj_empresa), nome: cfg.razao_social });
        setTitulos(abertos.filter((t) => t.cliente_id && saldoContaReceber(t) > 0));
      } catch (e) { setTitulos([]); setFeedback({ type: "error", message: errMessage(e, "Não foi possível carregar os dados da remessa.") }); }
    })();
  }, []);

  const conta = contas.find((c) => c.id === contaId);
  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (titulos ?? []).filter((t) => !q || t.numero_documento.toLowerCase().includes(q));
  }, [titulos, busca]);
  const escolhidos = (titulos ?? []).filter((t) => marcados.has(t.id));
  const totalEscolhido = escolhidos.reduce((s, t) => s + saldoContaReceber(t), 0);

  const alternar = (id: number) => setMarcados((m) => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function gerar() {
    if (!conta) { setFeedback({ type: "error", message: "Escolha a conta bancária da cobrança." }); return; }
    if (!empresa?.cnpj) { setFeedback({ type: "error", message: "A empresa ainda não tem CNPJ: preencha a Configuração Fiscal (VFIS0100)." }); return; }
    if (!convenio.trim()) { setFeedback({ type: "error", message: "Informe o convênio de cobrança combinado com o banco." }); return; }
    if (nsa < 1) { setFeedback({ type: "error", message: "O número da remessa precisa ser maior que zero." }); return; }
    if (escolhidos.length === 0) { setFeedback({ type: "error", message: "Marque ao menos um título." }); return; }
    setBusy(true); setFeedback(null);
    try {
      const clientes = new Map<number, Awaited<ReturnType<typeof getDestinatarioDaNota>>>();
      for (const code of new Set(escolhidos.map((t) => t.cliente_id as number))) clientes.set(code, await getDestinatarioDaNota(code));
      const linhas = escolhidos.map((t) => {
        const c = clientes.get(t.cliente_id as number)!;
        const e = c.enderecos.find((x) => x.tipo === "COBRANCA") ?? c.enderecos.find((x) => x.sugerido) ?? c.enderecos[0];
        const falta = [!c.documento && "CNPJ/CPF", !e?.logradouro && "endereço", !e?.municipio && "município", !e?.uf && "UF", !digitos(e?.cep) && "CEP"].filter(Boolean);
        if (falta.length) throw new Error(`O cliente ${c.nome} (título ${t.numero_documento}) está sem ${falta.join(", ")} no cadastro. Complete em VCLI0100 e gere de novo.`);
        return {
          nosso_numero: String(t.id), numero_documento: t.numero_documento, vencimento: t.data_vencimento.slice(0, 10), valor: saldoContaReceber(t),
          emissao: (t.data_emissao ?? t.data_vencimento).slice(0, 10), sacado_nome: c.nome, sacado_tipo: digitos(c.documento).length === 11 ? 1 : 2,
          sacado_documento: digitos(c.documento), sacado_endereco: [e!.logradouro, e!.numero].filter(Boolean).join(" "), sacado_bairro: e!.bairro,
          sacado_cidade: e!.municipio, sacado_uf: e!.uf, sacado_cep: digitos(e!.cep),
        };
      });
      const data = await gerarRemessaCnab240({
        config: {
          BankCode: conta.banco.padStart(3, "0"), BankName: (nomeDoBanco(conta.banco) || conta.descricao).toUpperCase(), CompanyName: empresa.nome, CompanyCNPJ: empresa.cnpj,
          Agencia: conta.agencia, AgenciaDV: agenciaDv.trim(), Conta: conta.conta, ContaDV: conta.digito, Convenio: convenio.trim(), SequenceNSA: nsa,
          Carteira: carteira.trim(), EspecieTitulo: especie, LayoutArquivo: "083", LayoutLote: "042",
        },
        titulos: linhas,
      });
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url; a.download = `remessa-${conta.banco}-${String(nsa).padStart(6, "0")}.rem`; a.click();
      URL.revokeObjectURL(url);
      setFeedback({ type: "success", message: `Remessa ${nsa} gerada com ${linhas.length} título(s), R$ ${money(totalEscolhido)}. Envie o arquivo ao banco. Na próxima, use o número ${nsa + 1}.` });
      setNsa(nsa + 1);
    } catch (e) { setFeedback({ type: "error", message: e instanceof Error && !("isAxiosError" in e) ? e.message : errMessage(e, "Não foi possível gerar a remessa.") }); }
    finally { setBusy(false); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Financeiro</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Remessa bancária CNAB 240</span><span className="erp-crumb-code">VFIN0610</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void gerar()} disabled={busy || !isAdmin} title={!isAdmin ? "Requer administrador" : undefined}>{busy && <span className="erp-spin" />}Gerar remessa</button>
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Remessa</button></div>
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`} role={feedback.type === "error" ? "alert" : undefined}>{feedback.message}</div>}
            {!isAdmin && <div className="erp-feedback info">Só um administrador pode gerar a remessa.</div>}

            <div className="erp-fieldset"><div className="erp-fieldset-head">Conta de cobrança</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c6"><label className="erp-label erp-req">Conta bancária</label>
                <LookupField value={contaId} loader={loadBankAccounts} entityLabel="conta bancária" placeholder="Buscar conta" allowManualCode={false}
                  onChange={(c) => { setContaId(c ? Number(c) : undefined); setFeedback(null); }} /></div>
              <div className="erp-field erp-c6"><label className="erp-label">Cedente</label>
                <div className="erp-input" style={{ display: "flex", alignItems: "center" }}>{empresa ? `${empresa.nome} — ${documentoComMascara(empresa.cnpj)}` : "Carregando…"}</div></div>
              {conta && <div className="erp-field erp-c12"><dl className="erp-dados">
                <dt>Banco</dt><dd>{conta.banco}{nomeDoBanco(conta.banco) ? ` — ${nomeDoBanco(conta.banco)}` : ""}</dd>
                <dt>Agência e conta</dt><dd>{conta.agencia} · {conta.conta}{conta.digito ? `-${conta.digito}` : ""}</dd>
              </dl></div>}
              <div className="erp-field erp-c3"><label className="erp-label erp-req" htmlFor="rem-convenio">Convênio</label>
                <input id="rem-convenio" className="erp-input" value={convenio} onChange={(e) => setConvenio(e.target.value)} /></div>
              <div className="erp-field erp-c1"><label className="erp-label" htmlFor="rem-agdv">Díg. ag.</label>
                <input id="rem-agdv" className="erp-input" maxLength={1} value={agenciaDv} onChange={(e) => setAgenciaDv(e.target.value)} /></div>
              <div className="erp-field erp-c2"><label className="erp-label" htmlFor="rem-carteira">Carteira</label>
                <input id="rem-carteira" className="erp-input" value={carteira} onChange={(e) => setCarteira(e.target.value)} /></div>
              <div className="erp-field erp-c4"><label className="erp-label" htmlFor="rem-especie">Espécie do título</label>
                <select id="rem-especie" className="erp-input" value={especie} onChange={(e) => setEspecie(e.target.value)}>
                  {ESPECIES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                </select></div>
              <div className="erp-field erp-c2"><label className="erp-label erp-req" htmlFor="rem-nsa">Nº da remessa</label>
                <input id="rem-nsa" className="erp-input num" type="number" min={1} value={nsa} onChange={(e) => setNsa(Number(e.target.value))} /></div>
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Títulos em aberto — <span style={{ fontWeight: 400, opacity: 0.65 }}>{escolhidos.length} marcado(s), R$ {money(totalEscolhido)}</span></div><div className="erp-fieldset-body">
              <div className="erp-field erp-c4"><label className="erp-label" htmlFor="rem-busca">Buscar documento</label>
                <input id="rem-busca" className="erp-input" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
              <div className="erp-field erp-c12">
                <table className="erp-grid">
                  <thead><tr><th style={{ width: 36 }}><input type="checkbox" aria-label="Marcar todos os títulos visíveis" checked={visiveis.length > 0 && visiveis.every((t) => marcados.has(t.id))}
                    onChange={(e) => setMarcados((m) => { const n = new Set(m); visiveis.forEach((t) => { if (e.target.checked) n.add(t.id); else n.delete(t.id); }); return n; })} /></th>
                    <th>Documento</th><th>Cliente</th><th>Emissão</th><th>Vencimento</th><th style={{ textAlign: "right" }}>Saldo</th></tr></thead>
                  <tbody>
                    {titulos === null && <tr><td colSpan={6} className="erp-grid-empty"><span className="erp-spin" /> Carregando…</td></tr>}
                    {titulos !== null && visiveis.length === 0 && <tr><td colSpan={6} className="erp-grid-empty">Nenhum título em aberto.</td></tr>}
                    {visiveis.map((t) => (
                      <tr key={t.id} onClick={() => alternar(t.id)} style={{ cursor: "pointer" }}>
                        <td><input type="checkbox" aria-label={`Marcar o título ${t.numero_documento}`} checked={marcados.has(t.id)} onChange={() => alternar(t.id)} onClick={(e) => e.stopPropagation()} /></td>
                        <td>{t.numero_documento}</td><td><EntityName code={t.cliente_id} loader={loadCustomers} /></td>
                        <td>{dataBR(t.data_emissao)}</td><td>{dataBR(t.data_vencimento)}</td><td style={{ textAlign: "right" }}>{money(saldoContaReceber(t))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div></div>
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div style={{ display: "contents" }}><div className="erp-status-item">Títulos marcados: <strong>{escolhidos.length}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

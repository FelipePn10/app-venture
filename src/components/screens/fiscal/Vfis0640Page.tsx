import { useEffect, useRef, useState } from "react";
import { type CfopSugerido, type DestinatarioDaNota, type FiscalExit, createExitFromLoad, getDestinatarioDaNota, getExitDocumentos, getClienteDaCarga } from "@/services/nfeService";
import { errMessage } from "@/services/fiscalShared";
import { LookupField } from "@/components/ui/LookupField";
import { loadCfops, loadCustomers, loadFiscalExits, loadShipmentLoads } from "@/services/lookups";
import { abrirDocumento } from "@/utils/abrirDocumento";
import { hojeLocal } from "@/utils/dataLocal";
import { documentoComMascara } from "@/utils/documentoFiscal";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

const numero = (s: string) => Number(s.replace(",", ".")) || 0;

/**
 * VFIS0640 — Faturamento fiscal da carga.
 *
 * Os itens e os preços vêm dos romaneios da carga, e o destinatário, do cadastro
 * do cliente: aqui só se escolhe a carga e se confere o que muda na nota.
 */
export function Vfis0640Page(): JSX.Element {
  const [carga, setCarga] = useState<number | undefined>();
  const [clienteCode, setClienteCode] = useState<number | undefined>();
  const [cliente, setCliente] = useState<DestinatarioDaNota | null>(null);
  const [enderecoIdx, setEnderecoIdx] = useState(0);
  const [serie, setSerie] = useState("1");
  const [emissao, setEmissao] = useState(hojeLocal());
  const [saida, setSaida] = useState(hojeLocal());
  const [cfop, setCfop] = useState("");
  const [cfopManual, setCfopManual] = useState(false);
  const [natureza, setNatureza] = useState("");
  const [frete, setFrete] = useState("");
  const [seguro, setSeguro] = useState("");
  const [desconto, setDesconto] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [criada, setCriada] = useState<FiscalExit | null>(null);
  const [notaDanfe, setNotaDanfe] = useState<number | undefined>();
  const ultimoCliente = useRef(0);

  const endereco = cliente?.enderecos[enderecoIdx];

  function aplicarSugestao(s?: CfopSugerido) {
    if (cfopManual || !s?.cfop) return;
    setCfop(s.cfop); setNatureza(s.natureza);
  }

  async function escolherCliente(code?: number) {
    const esta = ++ultimoCliente.current;
    setClienteCode(code); setCliente(null); setEnderecoIdx(0);
    if (!code) return;
    try {
      const d = await getDestinatarioDaNota(code);
      if (esta !== ultimoCliente.current) return;
      const idx = Math.max(d.enderecos.findIndex((e) => e.sugerido), 0);
      setCliente(d); setEnderecoIdx(idx);
      aplicarSugestao(d.enderecos[idx] ?? d.cfop_sem_endereco);
    } catch (e) {
      if (esta === ultimoCliente.current) setFeedback({ type: "error", message: errMessage(e, "Não foi possível ler o cadastro do cliente. Tente de novo.") });
    }
  }

  // A carga de um único cliente já diz para quem é a nota.
  useEffect(() => {
    if (!carga) return;
    let ativo = true;
    getClienteDaCarga(carga).then((c) => { if (ativo && c) void escolherCliente(c); }).catch(() => undefined);
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carga]);

  function conferir(): string {
    if (!carga) return "Escolha a carga.";
    if (!cliente) return "Escolha o cliente da nota.";
    if (cliente.bloqueado) return `O cliente ${cliente.nome} está bloqueado. Libere o cadastro antes de faturar.`;
    if (!cliente.documento) return `O cliente ${cliente.nome} está sem CNPJ/CPF no cadastro.`;
    if (!endereco) return `O cliente ${cliente.nome} está sem endereço no cadastro. Inclua o endereço antes de faturar.`;
    if (endereco.faltando.length) return `Falta no endereço do cliente: ${endereco.faltando.join(", ")}. Complete o cadastro antes de faturar.`;
    if (!emissao) return "Informe a data de emissão.";
    if (saida && saida < emissao) return "A data de saída não pode ser anterior à emissão.";
    if (!/^\d{4}$/.test(cfop)) return "Escolha o CFOP.";
    if (!natureza.trim()) return "Informe a natureza da operação.";
    return "";
  }

  async function criar() {
    const problema = conferir();
    if (problema) { setFeedback({ type: "error", message: problema }); return; }
    setBusy(true); setFeedback(null);
    try {
      const nota = await createExitFromLoad({
        load_code: carga!, serie: serie.trim() || "1", data_emissao: emissao, data_saida: saida || emissao,
        customer_code: clienteCode, cnpj_destinatario: cliente!.documento, razao_social_destinatario: cliente!.nome,
        ie_destinatario: cliente!.ie, uf_destinatario: endereco!.uf, tipo_pessoa: cliente!.tipo_pessoa,
        cfop, natureza_operacao: natureza.trim(),
        valor_frete: numero(frete), valor_seguro: numero(seguro), valor_desconto: numero(desconto),
      });
      setCriada(nota); setCarga(undefined);
      setFeedback({ type: "success", message: `Nota criada como rascunho com os itens da carga. Confira e transmita em Notas Fiscais de Saída (VFIS0200).` });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e, "Não foi possível criar a nota da carga.") }); }
    finally { setBusy(false); }
  }

  async function abrirDanfe() {
    if (!notaDanfe) { setFeedback({ type: "error", message: "Escolha a nota." }); return; }
    setFeedback(null);
    try {
      const { danfe_url } = await getExitDocumentos(notaDanfe);
      if (!danfe_url) { setFeedback({ type: "info", message: "O DANFE só existe depois que a SEFAZ autoriza a nota." }); return; }
      await abrirDocumento(danfe_url);
    } catch (e) { setFeedback({ type: "error", message: errMessage(e, "Não foi possível abrir o DANFE.") }); }
  }

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Faturamento de Carga e DANFE</span><span className="erp-crumb-code">VFIS0640</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void criar()} disabled={busy}>{busy ? "Criando…" : "Criar NF-e da carga"}</button>
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Faturar carga</button></div>
          <div className="erp-detail-body">
            {feedback && <div className={`erp-feedback ${feedback.type}`} role={feedback.type === "error" ? "alert" : undefined}>{feedback.message}</div>}

            <div className="erp-fieldset"><div className="erp-fieldset-head">Carga e destinatário</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c6"><label className="erp-label erp-req">Carga</label>
                <LookupField value={carga} loader={loadShipmentLoads} entityLabel="carga" placeholder="Buscar carga" allowManualCode={false}
                  onChange={(c) => { setCarga(c ? Number(c) : undefined); setCriada(null); setFeedback(null); }} />
                <span className="erp-hint">Os itens, as quantidades e os preços vêm dos romaneios da carga.</span></div>
              <div className="erp-field erp-c6"><label className="erp-label erp-req">Cliente</label>
                <LookupField value={clienteCode} loader={loadCustomers} entityLabel="cliente" placeholder="Buscar por nome, código ou CNPJ" allowManualCode={false}
                  onChange={(c) => { void escolherCliente(c ? Number(c) : undefined); setFeedback(null); }} /></div>
              {cliente && <div className="erp-field erp-c12"><dl className="erp-dados">
                <dt>Razão social</dt><dd>{cliente.nome}</dd>
                <dt>{cliente.tipo_pessoa === "F" ? "CPF" : "CNPJ"}</dt><dd>{documentoComMascara(cliente.documento)}</dd>
                <dt>Inscrição estadual</dt><dd>{cliente.ie || "Não informada"}</dd>
              </dl></div>}
              {cliente && cliente.enderecos.length > 0 && <div className="erp-field erp-c12"><label className="erp-label" htmlFor="carga-endereco">Endereço da nota</label>
                <select id="carga-endereco" className="erp-input" value={enderecoIdx} onChange={(e) => { const i = Number(e.target.value); setEnderecoIdx(i); aplicarSugestao(cliente.enderecos[i]); }}>
                  {cliente.enderecos.map((e, i) => <option key={i} value={i}>{[e.logradouro, e.numero, e.bairro, e.municipio, e.uf].filter(Boolean).join(", ")}</option>)}
                </select></div>}
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">Dados da nota</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c2"><label className="erp-label" htmlFor="carga-serie">Série</label>
                <input id="carga-serie" className="erp-input" value={serie} onChange={(e) => setSerie(e.target.value)} /></div>
              <div className="erp-field erp-c2"><label className="erp-label erp-req" htmlFor="carga-emissao">Emissão</label>
                <input id="carga-emissao" className="erp-input" type="date" value={emissao} onChange={(e) => setEmissao(e.target.value)} /></div>
              <div className="erp-field erp-c2"><label className="erp-label" htmlFor="carga-saida">Saída</label>
                <input id="carga-saida" className="erp-input" type="date" value={saida} onChange={(e) => setSaida(e.target.value)} /></div>
              <div className="erp-field erp-c6"><label className="erp-label erp-req">CFOP</label>
                <LookupField value={Number(cfop) || undefined} loader={loadCfops} entityLabel="CFOP" placeholder="Buscar CFOP" allowManualCode={false} clearable={cfopManual}
                  onChange={(c, op) => { setCfopManual(Boolean(c)); setCfop(c ? String(c) : ""); if (op?.label) setNatureza(op.label); }} /></div>
              <div className="erp-field erp-c6"><label className="erp-label erp-req" htmlFor="carga-natureza">Natureza da operação</label>
                <input id="carga-natureza" className="erp-input" value={natureza} onChange={(e) => setNatureza(e.target.value)} /></div>
              <div className="erp-field erp-c2"><label className="erp-label" htmlFor="carga-frete">Frete (R$)</label>
                <input id="carga-frete" className="erp-input num" type="number" min={0} step="0.01" value={frete} onChange={(e) => setFrete(e.target.value)} /></div>
              <div className="erp-field erp-c2"><label className="erp-label" htmlFor="carga-seguro">Seguro (R$)</label>
                <input id="carga-seguro" className="erp-input num" type="number" min={0} step="0.01" value={seguro} onChange={(e) => setSeguro(e.target.value)} /></div>
              <div className="erp-field erp-c2"><label className="erp-label" htmlFor="carga-desconto">Desconto (R$)</label>
                <input id="carga-desconto" className="erp-input num" type="number" min={0} step="0.01" value={desconto} onChange={(e) => setDesconto(e.target.value)} /></div>
            </div></div>

            <div className="erp-fieldset"><div className="erp-fieldset-head">DANFE de uma nota</div><div className="erp-fieldset-body">
              <div className="erp-field erp-c6"><label className="erp-label">NF-e de saída</label>
                <LookupField value={notaDanfe ?? criada?.id} loader={loadFiscalExits} entityLabel="NF-e" placeholder="Buscar nota" allowManualCode={false}
                  onChange={(c) => setNotaDanfe(c ? Number(c) : undefined)} /></div>
              <div className="erp-field erp-c3" style={{ alignSelf: "end" }}><button className="erp-btn" onClick={() => void abrirDanfe()}>Abrir DANFE</button></div>
            </div></div>
          </div>
        </section>
      </div>
    </div>
  );
}

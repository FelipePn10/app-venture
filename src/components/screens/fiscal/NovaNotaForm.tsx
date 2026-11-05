import { dataMaisDias } from "@/utils/planoParcelas";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type CfopSugerido, type CreateExitDTO, type DestinatarioDaNota, type EnderecoDoDestinatario, type FiscalExit, type TipoPessoa,
  createExit, getDestinatarioDaNota, sugerirCfopDaVenda,
} from "@/services/nfeService";
import { errMessage } from "@/services/fiscalShared";
import { FINALIDADES_COMPRA, lookupCnpj } from "@/services/customerService";
import { getItem } from "@/services/itemService";
import { findSalesTablesForItem } from "@/services/salesPricingService";
import { loadCfops, loadCustomers, loadInvoiceTypesById, loadItems, loadShipmentLoads } from "@/services/lookups";
import { UFS, UF_NAMES } from "@/services/taxTableService";
import { LookupField } from "@/components/ui/LookupField";
import { documentoComMascara } from "@/utils/documentoFiscal";
import { hojeLocal } from "@/utils/dataLocal";
import { validateCNPJOrCPF } from "@/utils/validation";

const money = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const round2 = (n: number) => Math.round(n * 100) / 100;
const digitos = (s: string) => s.replace(/\D/g, "");
const PRAZO_EMISSAO_DIAS = 30;
const numero = (s: string) => { const n = Number(s); return Number.isFinite(n) ? n : 0; };

const ROTULO_ENDERECO: Record<string, string> = { ENTREGA: "Entrega", COBRANCA: "Cobrança", COMERCIAL: "Comercial", OUTRO: "Outro" };

/** Origem da mercadoria: a tabela oficial da NF-e, em vez de um dígito digitado de cabeça. */
const ORIGENS: { value: string; label: string }[] = [
  { value: "0", label: "0 — Nacional" },
  { value: "1", label: "1 — Estrangeira, importação direta" },
  { value: "2", label: "2 — Estrangeira, mercado interno" },
  { value: "3", label: "3 — Nacional, conteúdo importado de 40% a 70%" },
  { value: "4", label: "4 — Nacional, processo produtivo básico" },
  { value: "5", label: "5 — Nacional, conteúdo importado até 40%" },
  { value: "6", label: "6 — Estrangeira, importação direta sem similar" },
  { value: "7", label: "7 — Estrangeira, mercado interno sem similar" },
  { value: "8", label: "8 — Nacional, conteúdo importado acima de 70%" },
];

/**
 * CFOP de venda ajustado à natureza do item: item comprado é revenda. A mesma
 * regra do faturamento do pedido; só nesse sentido, porque o cadastro pode não
 * dizer tudo sobre um item fabricado.
 */
function cfopDaLinha(cfop: string, comprado: boolean): string {
  if (!comprado || cfop.length !== 4) return cfop;
  const revenda: Record<string, string> = { "101": "102", "107": "108", "401": "403" };
  const r = revenda[cfop.slice(1)];
  return r ? cfop[0] + r : cfop;
}

interface Linha {
  uid: number;
  item_code: string;
  descricao: string;
  ncm: string;
  unidade: string;
  cfop: string;
  origem: string;
  quantidade: string;
  preco: string;
  lote: string;
  endereco: string;
  comprado: boolean;
  /** O usuário escolheu: a sugestão automática não sobrescreve mais. */
  cfopManual: boolean;
  precoManual: boolean;
  carregando: boolean;
  aviso: string;
}

interface Endereco { logradouro: string; numero: string; complemento: string; bairro: string; municipio: string; uf: string; cep: string; email: string; telefone: string }
const ENDERECO_VAZIO: Endereco = { logradouro: "", numero: "", complemento: "", bairro: "", municipio: "", uf: "", cep: "", email: "", telefone: "" };

function faltandoNoEndereco(e: Endereco): string[] {
  const campos: [string, string][] = [["logradouro", e.logradouro], ["número", e.numero], ["bairro", e.bairro], ["município", e.municipio], ["UF", e.uf], ["CEP", digitos(e.cep)]];
  return campos.filter(([, v]) => !v.trim()).map(([nome]) => nome);
}

function enderecoEmUmaLinha(e: Endereco): string {
  return [
    [e.logradouro, e.numero].filter(Boolean).join(", "), e.complemento, e.bairro,
    [e.municipio, e.uf].filter(Boolean).join(" / "), digitos(e.cep) ? `CEP ${digitos(e.cep).replace(/^(\d{5})(\d{3})$/, "$1-$2")}` : "",
  ].filter(Boolean).join(" — ");
}

interface Props {
  onCriada: (nota: FiscalExit) => void;
  onCancelar: () => void;
}

/**
 * Nova NF-e avulsa. O destinatário é UM campo: escolhido o cliente, o CNPJ, a IE
 * e o endereço vêm do cadastro; quem não tem cadastro preenche à mão. Escolhido o
 * item, a linha traz descrição, unidade, NCM, origem, CFOP e o preço da tabela.
 */
export function NovaNotaForm({ onCriada, onCancelar }: Props): JSX.Element {
  const [modo, setModo] = useState<"cadastro" | "avulso">("cadastro");
  const [cliente, setCliente] = useState<DestinatarioDaNota | null>(null);
  const [clienteCode, setClienteCode] = useState<number | undefined>();
  const [carregandoCliente, setCarregandoCliente] = useState(false);
  const [enderecoIdx, setEnderecoIdx] = useState(0);
  const [editandoEndereco, setEditandoEndereco] = useState(false);
  const [endereco, setEndereco] = useState<Endereco>(ENDERECO_VAZIO);
  const [avulso, setAvulso] = useState({ documento: "", nome: "", ie: "" });
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [avisoCnpj, setAvisoCnpj] = useState("");

  const [cfop, setCfop] = useState("5101");
  const [cfopManual, setCfopManual] = useState(false);
  // A resposta do item chega depois: ela precisa do CFOP de agora, não o do clique.
  const cfopAtual = useRef(cfop);
  cfopAtual.current = cfop;
  const [natureza, setNatureza] = useState("VENDA DE PRODUCAO DO ESTABELECIMENTO");
  const [naturezaManual, setNaturezaManual] = useState(false);
  const [sugestao, setSugestao] = useState<CfopSugerido | null>(null);

  const [capa, setCapa] = useState({ emissao: hojeLocal(), saida: hojeLocal(), finalidade: "", complementares: "" });
  const [tipoNota, setTipoNota] = useState<number | undefined>();
  const [tipoNotaManual, setTipoNotaManual] = useState(false);
  const [valores, setValores] = useState({ frete: "", seguro: "", desconto: "" });
  const [carga, setCarga] = useState<number | undefined>();
  const [temCupom, setTemCupom] = useState(false);
  const [cupom, setCupom] = useState({ numero: "", data: "", ecf: "" });

  const uidRef = useRef(1);
  const novaLinha = (): Linha => ({
    uid: uidRef.current++, item_code: "", descricao: "", ncm: "", unidade: "", cfop: "", origem: "0", quantidade: "1", preco: "", lote: "", endereco: "",
    comprado: false, cfopManual: false, precoManual: false, carregando: false, aviso: "",
  });
  const [linhas, setLinhas] = useState<Linha[]>(() => [novaLinha()]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Resposta atrasada de uma escolha anterior não pode sobrescrever a atual.
  const ultimoCliente = useRef(0);
  const ultimoItem = useRef<Record<number, number>>({});
  const ultimaSugestao = useRef(0);

  // O aviso fala do que estava preenchido: mudou algum dado, ele deixa de valer.
  useEffect(() => { setErro(""); }, [capa, valores, cupom, temCupom, avulso, tipoNota]);

  const setLinha = (uid: number, patch: Partial<Linha>) => { setLinhas((ls) => ls.map((l) => (l.uid === uid ? { ...l, ...patch } : l))); setErro(""); };

  /** A sugestão vale até o usuário escolher outro CFOP ou escrever outra natureza. */
  function aplicarSugestao(s: CfopSugerido) {
    setSugestao(s);
    if (naturezaManual === false) setNatureza(s.natureza);
    if (cfopManual) return;
    setCfop(s.cfop);
    setLinhas((ls) => ls.map((l) => (l.cfopManual || !l.descricao ? l : { ...l, cfop: cfopDaLinha(s.cfop, l.comprado) })));
  }

  function usarEnderecoDoCadastro(d: DestinatarioDaNota, idx: number) {
    const e: EnderecoDoDestinatario | undefined = d.enderecos[idx];
    setEnderecoIdx(idx);
    setEndereco({
      ...ENDERECO_VAZIO, email: d.email, telefone: d.telefone,
      ...(e ? { logradouro: e.logradouro, numero: e.numero, complemento: e.complemento, bairro: e.bairro, municipio: e.municipio, uf: e.uf, cep: e.cep } : {}),
    });
    // Cadastro sem endereço completo: os campos já abrem para não travar a nota.
    setEditandoEndereco(!e || e.faltando.length > 0);
    aplicarSugestao(e ?? d.cfop_sem_endereco);
  }

  async function escolherCliente(code?: number) {
    const esta = ++ultimoCliente.current;
    setClienteCode(code); setCliente(null); setErro("");
    if (!code) { setEndereco(ENDERECO_VAZIO); setEditandoEndereco(false); setSugestao(null); return; }
    setCarregandoCliente(true);
    try {
      const d = await getDestinatarioDaNota(code);
      if (esta !== ultimoCliente.current) return;
      setCliente(d);
      const sugerido = d.enderecos.findIndex((e) => e.sugerido);
      usarEnderecoDoCadastro(d, Math.max(sugerido, 0));
      if (!tipoNotaManual) setTipoNota(d.invoice_type_id);
      // O preço depende do cliente (tabela dele): refaz o que não foi digitado.
      linhas.forEach((l) => { if (l.item_code && !l.precoManual) void buscarPreco(l.uid, l.item_code, numero(l.quantidade), l.unidade, code); });
    } catch (e) {
      if (esta === ultimoCliente.current) setErro(errMessage(e, "Não foi possível ler o cadastro do cliente. Tente de novo."));
    } finally {
      if (esta === ultimoCliente.current) setCarregandoCliente(false);
    }
  }

  function trocarModo(novo: "cadastro" | "avulso") {
    setModo(novo); setErro(""); setAvisoCnpj(""); setSugestao(null);
    setEndereco(ENDERECO_VAZIO); setEditandoEndereco(novo === "avulso");
    if (novo === "avulso") { ultimoCliente.current++; setCliente(null); setClienteCode(undefined); setCarregandoCliente(false); }
    else setAvulso({ documento: "", nome: "", ie: "" });
  }

  const tipoPessoaAvulso: TipoPessoa = digitos(avulso.documento).length === 11 ? "F" : "J";

  // Sem cadastro, a UF e a IE digitadas decidem o CFOP.
  useEffect(() => {
    if (modo !== "avulso" || !endereco.uf) return;
    const esta = ++ultimaSugestao.current;
    sugerirCfopDaVenda(endereco.uf, avulso.ie, tipoPessoaAvulso)
      .then((s) => { if (esta === ultimaSugestao.current) aplicarSugestao(s); })
      .catch(() => undefined); // sem a sugestão, o usuário escolhe o CFOP
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, endereco.uf, avulso.ie, tipoPessoaAvulso]);

  /** Busca pelo CNPJ: se já é cliente, oferece o cadastro em vez de duplicar. */
  async function buscarCnpj() {
    const doc = digitos(avulso.documento);
    if (doc.length !== 14 || !validateCNPJOrCPF(doc)) { setAvisoCnpj("Digite um CNPJ válido para buscar."); return; }
    setBuscandoCnpj(true); setAvisoCnpj("");
    try {
      const r = await lookupCnpj(doc);
      const inscricao = r.state_registrations?.find((i) => i.enabled && (!r.address?.uf || i.uf === r.address.uf))?.number ?? r.state_registration ?? "";
      setAvulso((a) => ({ ...a, nome: a.nome || r.legal_name, ie: a.ie || inscricao }));
      setEndereco((e) => ({
        ...e, logradouro: e.logradouro || r.address?.street || "", numero: e.numero || r.address?.number || "", complemento: e.complemento || r.address?.complement || "",
        bairro: e.bairro || r.address?.neighborhood || "", municipio: e.municipio || r.address?.city || "", uf: e.uf || r.address?.uf || "",
        cep: e.cep || digitos(r.address?.zip_code ?? ""), email: e.email || r.email || "", telefone: e.telefone || r.phone || "",
      }));
    } catch (e) { setAvisoCnpj(errMessage(e, "Não foi possível consultar este CNPJ. Preencha os dados à mão.")); }
    finally { setBuscandoCnpj(false); }
  }

  const [clientes, setClientes] = useState<Awaited<ReturnType<typeof loadCustomers>>>([]);
  useEffect(() => { if (modo === "avulso") loadCustomers().then(setClientes).catch(() => undefined); }, [modo]);
  const clienteDoDocumento = useMemo(() => {
    const doc = digitos(avulso.documento);
    return doc.length >= 11 ? clientes.find((c) => digitos(c.sub ?? "") === doc && !c.inactive) : undefined;
  }, [clientes, avulso.documento]);

  async function buscarPreco(uid: number, itemCode: string, quantidade: number, unidade: string, customerCode: number | undefined) {
    try {
      const tabelas = await findSalesTablesForItem(itemCode, { customerCode, quantity: quantidade, unit: unidade, referenceDate: capa.emissao });
      const escolhida = tabelas.find((t) => t.autoSelected) ?? (tabelas.length === 1 ? tabelas[0] : undefined);
      setLinhas((ls) => ls.map((l) => {
        if (l.uid !== uid || l.item_code !== itemCode || l.precoManual) return l;
        if (escolhida) return { ...l, preco: String(escolhida.price.price) };
        return { ...l, preco: "", aviso: tabelas.length > 1 ? "O item está em mais de uma tabela de preço: informe o preço." : "Sem preço em tabela de venda: informe o preço." };
      }));
    } catch {
      setLinhas((ls) => ls.map((l) => (l.uid === uid && l.item_code === itemCode && !l.precoManual ? { ...l, aviso: "Não foi possível consultar a tabela de preço: informe o preço." } : l)));
    }
  }

  async function escolherItem(uid: number, code?: string) {
    const esta = (ultimoItem.current[uid] ?? 0) + 1;
    ultimoItem.current[uid] = esta;
    if (!code) { setLinha(uid, { item_code: "", descricao: "", ncm: "", unidade: "", cfop: "", origem: "0", preco: "", comprado: false, cfopManual: false, precoManual: false, carregando: false, aviso: "" }); return; }
    setLinha(uid, { item_code: code, carregando: true, aviso: "", precoManual: false, preco: "" });
    try {
      const item = await getItem(code);
      if (ultimoItem.current[uid] !== esta) return;
      const fiscal = item.fiscal_effective?.sale ?? item.fiscal_effective?.purchase;
      const comprado = item.eng_type === "COMPRADO" || item.eng_type === "DE_TERCEIRO";
      const unidade = fiscal?.unit || item.uom || "UN";
      const ncm = digitos(fiscal?.ncm ?? "");
      setLinha(uid, {
        descricao: item.description ?? "", unidade, ncm, comprado, origem: fiscal?.origin !== undefined ? String(fiscal.origin) : "0",
        cfop: cfopDaLinha(cfopAtual.current, comprado), cfopManual: false, carregando: false,
        aviso: ncm ? "" : "Sem NCM no cadastro do item: informe aqui ou complete em VENT0200, aba Contábil.",
      });
      const atual = linhas.find((l) => l.uid === uid);
      await buscarPreco(uid, code, numero(atual?.quantidade ?? "1"), unidade, clienteCode);
    } catch (e) {
      if (ultimoItem.current[uid] === esta) setLinha(uid, { carregando: false, aviso: errMessage(e, "Não foi possível buscar os dados do item: preencha à mão.") });
    }
  }

  function escolherCfop(code?: string | number, descricao?: string) {
    const novo = code ? String(code) : (sugestao?.cfop ?? "5101");
    setCfop(novo); setCfopManual(!!code); setErro("");
    if (!naturezaManual) setNatureza(code ? (descricao ?? natureza).toUpperCase() : (sugestao?.natureza ?? natureza));
    setLinhas((ls) => ls.map((l) => (l.cfopManual || !l.descricao ? l : { ...l, cfop: cfopDaLinha(novo, l.comprado) })));
  }

  const totalLinha = (l: Linha) => round2(numero(l.quantidade) * numero(l.preco));
  const produtos = useMemo(() => round2(linhas.reduce((s, l) => s + totalLinha(l), 0)), [linhas]);
  const totalNota = round2(produtos + numero(valores.frete) + numero(valores.seguro) - numero(valores.desconto));

  /** Primeiro problema, em português. A nota em rascunho não se edita: melhor avisar antes de criá-la. */
  function conferir(): string {
    if (modo === "cadastro") {
      if (!clienteCode || !cliente) return "Escolha o cliente da nota.";
      if (cliente.bloqueado) return "Este cliente está bloqueado no cadastro.";
      if (!validateCNPJOrCPF(digitos(cliente.documento))) return "O CNPJ ou CPF no cadastro deste cliente não é válido: corrija o cadastro do cliente antes de emitir.";
    } else {
      const doc = digitos(avulso.documento);
      if (!doc) return "Informe o CNPJ ou CPF do destinatário.";
      if (!validateCNPJOrCPF(doc)) return "O CNPJ ou CPF do destinatário não é válido: confira os dígitos.";
      if (!avulso.nome.trim()) return "Informe o nome ou a razão social do destinatário.";
    }
    const falta = faltandoNoEndereco(endereco);
    if (falta.length) return `Falta no endereço do destinatário: ${falta.join(", ")}. A SEFAZ recusa a nota sem esses dados.`;
    if (digitos(endereco.cep).length !== 8) return "O CEP do destinatário precisa ter 8 dígitos.";
    if (!/^\d{4}$/.test(cfop)) return "Escolha o CFOP da nota.";
    if (sugestao && cfop[0] !== sugestao.cfop[0] && cfop[0] !== "7") return `O CFOP ${cfop} da nota não combina com o destino: esta é uma operação ${sugestao.cfop[0] === "5" ? "dentro do estado (CFOP 5xxx)" : "para outro estado (CFOP 6xxx)"}.`;
    if (!natureza.trim()) return "Informe a natureza da operação.";
    if (!capa.emissao) return "Informe a data de emissão.";
    const hoje = hojeLocal();
    if (capa.emissao > hoje) return "A data de emissão não pode estar no futuro.";
    if (capa.emissao < dataMaisDias(hoje, -PRAZO_EMISSAO_DIAS)) return `A data de emissão tem mais de ${PRAZO_EMISSAO_DIAS} dias: a SEFAZ recusa nota com emissão muito atrasada.`;
    if (capa.saida && capa.saida < capa.emissao) return "A data de saída não pode ser anterior à data de emissão.";
    if (capa.saida && capa.saida > dataMaisDias(capa.emissao, PRAZO_EMISSAO_DIAS)) return `A data de saída não pode ser mais de ${PRAZO_EMISSAO_DIAS} dias depois da emissão.`;
    for (const [i, l] of linhas.entries()) {
      const n = i + 1;
      if (l.carregando) return `Aguarde: os dados do item da linha ${n} ainda estão chegando.`;
      if (!l.descricao.trim()) return `Linha ${n}: escolha o item ou escreva a descrição.`;
      if (digitos(l.ncm).length !== 8) return `Linha ${n}: o NCM precisa ter 8 dígitos.`;
      if (!/^\d{4}$/.test(l.cfop)) return `Linha ${n}: informe o CFOP com 4 dígitos.`;
      if (sugestao && l.cfop[0] !== sugestao.cfop[0] && l.cfop[0] !== "7") {
        const interna = sugestao.cfop[0] === "5";
        return `Linha ${n}: o CFOP ${l.cfop} não combina com o destino. Esta é uma operação ${interna ? "dentro do estado (CFOP 5xxx)" : "para outro estado (CFOP 6xxx)"}.`;
      }
      if (numero(l.quantidade) <= 0) return `Linha ${n}: informe a quantidade.`;
      if (numero(l.preco) <= 0) return `Linha ${n}: informe o preço unitário.`;
    }
    if (temCupom && !cupom.numero.trim()) return "Informe o número do cupom fiscal substituído.";
    if (totalNota <= 0) return "O total da nota precisa ser maior que zero: confira o desconto.";
    return "";
  }

  async function salvar() {
    const problema = conferir();
    if (problema) { setErro(problema); return; }
    const textoOuNada = (s: string) => s.trim() || undefined;
    const dto: CreateExitDTO = {
      data_emissao: capa.emissao, data_saida: capa.saida || capa.emissao,
      cnpj_destinatario: modo === "cadastro" ? cliente!.documento : digitos(avulso.documento),
      razao_social_destinatario: modo === "cadastro" ? cliente!.nome : avulso.nome.trim(),
      ie_destinatario: modo === "cadastro" ? cliente!.ie : avulso.ie.trim(),
      tipo_pessoa: modo === "cadastro" ? cliente!.tipo_pessoa : tipoPessoaAvulso,
      uf_destinatario: endereco.uf, customer_code: modo === "cadastro" ? clienteCode : undefined,
      dest_logradouro: endereco.logradouro.trim(), dest_numero: endereco.numero.trim(), dest_complemento: textoOuNada(endereco.complemento),
      dest_bairro: endereco.bairro.trim(), dest_municipio: endereco.municipio.trim(), dest_cep: digitos(endereco.cep),
      dest_email: textoOuNada(endereco.email), dest_telefone: textoOuNada(endereco.telefone),
      cfop, natureza_operacao: natureza.trim(), finalidade_compra: capa.finalidade || undefined, invoice_type_id: tipoNota,
      informacoes_complementares: textoOuNada(capa.complementares), shipment_load_code: carga,
      valor_produtos: produtos, valor_frete: numero(valores.frete), valor_seguro: numero(valores.seguro), valor_desconto: numero(valores.desconto),
      fiscal_coupon_number: temCupom ? textoOuNada(cupom.numero) : undefined,
      fiscal_coupon_date: temCupom ? textoOuNada(cupom.data) : undefined,
      fiscal_coupon_ecf_serial: temCupom ? textoOuNada(cupom.ecf) : undefined,
      itens: linhas.map((l, i) => ({
        sequence: i + 1, item_code: l.item_code || undefined, codigo_produto: l.item_code || undefined, ncm: digitos(l.ncm), cfop: l.cfop,
        quantity: numero(l.quantidade), unit_price: numero(l.preco), total_price: totalLinha(l),
        origem_mercadoria: l.origem, description: l.descricao.trim(), unidade_comercial: textoOuNada(l.unidade.toUpperCase()),
        lot: textoOuNada(l.lote),
        address: textoOuNada(l.endereco),
      })),
    };
    setSalvando(true); setErro("");
    try { onCriada(await createExit(dto)); }
    catch (e) { setErro(errMessage(e, "Não foi possível criar a nota. Tente de novo.")); }
    finally { setSalvando(false); }
  }

  const setE = (campo: keyof Endereco, valor: string) => { setEndereco((e) => ({ ...e, [campo]: valor })); setErro(""); };
  const faltaNoEndereco = faltandoNoEndereco(endereco);

  const camposDeEndereco = (
    <>
      <div className="erp-field erp-c5"><label className="erp-label erp-req" htmlFor="nf-logradouro">Logradouro</label>
        <input id="nf-logradouro" className="erp-input" value={endereco.logradouro} onChange={(e) => setE("logradouro", e.target.value)} /></div>
      <div className="erp-field erp-c2"><label className="erp-label erp-req" htmlFor="nf-numero">Número</label>
        <input id="nf-numero" className="erp-input" value={endereco.numero} placeholder="S/N" onChange={(e) => setE("numero", e.target.value)} /></div>
      <div className="erp-field erp-c2"><label className="erp-label" htmlFor="nf-compl">Complemento</label>
        <input id="nf-compl" className="erp-input" value={endereco.complemento} onChange={(e) => setE("complemento", e.target.value)} /></div>
      <div className="erp-field erp-c3"><label className="erp-label erp-req" htmlFor="nf-bairro">Bairro</label>
        <input id="nf-bairro" className="erp-input" value={endereco.bairro} onChange={(e) => setE("bairro", e.target.value)} /></div>
      <div className="erp-field erp-c4"><label className="erp-label erp-req" htmlFor="nf-municipio">Município</label>
        <input id="nf-municipio" className="erp-input" value={endereco.municipio} onChange={(e) => setE("municipio", e.target.value)} /></div>
      <div className="erp-field erp-c2"><label className="erp-label erp-req" htmlFor="nf-uf">UF</label>
        <select id="nf-uf" className="erp-input" value={endereco.uf} onChange={(e) => setE("uf", e.target.value)}>
          <option value="">Selecione</option>
          {UFS.map((uf) => <option key={uf} value={uf} title={UF_NAMES[uf]}>{uf}</option>)}
        </select></div>
      <div className="erp-field erp-c2"><label className="erp-label erp-req" htmlFor="nf-cep">CEP</label>
        <input id="nf-cep" className="erp-input" inputMode="numeric" maxLength={9} value={endereco.cep} onChange={(e) => setE("cep", e.target.value)} /></div>
      <div className="erp-field erp-c2"><label className="erp-label" htmlFor="nf-fone">Telefone</label>
        <input id="nf-fone" className="erp-input" value={endereco.telefone} onChange={(e) => setE("telefone", e.target.value)} /></div>
      <div className="erp-field erp-c2"><label className="erp-label" htmlFor="nf-email">E-mail</label>
        <input id="nf-email" className="erp-input" value={endereco.email} onChange={(e) => setE("email", e.target.value)} /></div>
    </>
  );

  return (
    <>
      <div className="erp-fieldset">
        <div className="erp-fieldset-head" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span>Destinatário</span>
          <div className="erp-nota-modo" role="radiogroup" aria-label="Origem do destinatário" style={{ fontWeight: 400 }}>
            <label><input type="radio" name="nf-modo" checked={modo === "cadastro"} onChange={() => trocarModo("cadastro")} />Cliente cadastrado</label>
            <label><input type="radio" name="nf-modo" checked={modo === "avulso"} onChange={() => trocarModo("avulso")} />Sem cadastro</label>
          </div>
        </div>
        <div className="erp-fieldset-body">
          {modo === "cadastro" ? (
            <>
              <div className="erp-field erp-c6"><label className="erp-label erp-req">Cliente</label>
                <LookupField value={clienteCode} loader={loadCustomers} entityLabel="cliente" placeholder="Buscar por nome, código ou CNPJ" allowManualCode={false}
                  onChange={(c) => void escolherCliente(c ? Number(c) : undefined)} /></div>
              {cliente && cliente.enderecos.length > 1 && (
                <div className="erp-field erp-c6"><label className="erp-label" htmlFor="nf-end">Endereço da nota</label>
                  <select id="nf-end" className="erp-input" value={enderecoIdx} onChange={(e) => usarEnderecoDoCadastro(cliente, Number(e.target.value))}>
                    {cliente.enderecos.map((e, i) => <option key={i} value={i}>{ROTULO_ENDERECO[e.tipo] ?? e.tipo}: {[e.logradouro, e.numero].filter(Boolean).join(", ") || "sem logradouro"} — {e.municipio || "sem município"}/{e.uf || "?"}</option>)}
                  </select></div>
              )}
              {carregandoCliente && <div className="erp-field erp-c12"><span className="erp-field-hint"><span className="erp-spin" /> Buscando os dados do cliente…</span></div>}
              {cliente && (
                <div className="erp-field erp-c12">
                  <dl className="erp-dados">
                    <dt>Razão social</dt><dd>{cliente.nome}</dd>
                    <dt>{cliente.tipo_pessoa === "F" ? "CPF" : "CNPJ"}</dt><dd>{documentoComMascara(cliente.documento)}</dd>
                    <dt>Inscrição estadual</dt><dd>{cliente.ie || (cliente.tipo_pessoa === "F" ? "Pessoa física" : "Não informada: a nota sai como não contribuinte")}</dd>
                    {!editandoEndereco && <><dt>Endereço</dt><dd>{enderecoEmUmaLinha(endereco)}</dd></>}
                    {!editandoEndereco && <><dt>Contato</dt><dd>{[endereco.email, endereco.telefone].filter(Boolean).join(" · ") || "Sem e-mail: o cliente não receberá a nota automaticamente"}</dd></>}
                  </dl>
                  <div style={{ marginTop: 8 }}>
                    {editandoEndereco
                      ? (cliente.enderecos.length > 0 && <button type="button" className="erp-btn erp-btn-sm" onClick={() => usarEnderecoDoCadastro(cliente, enderecoIdx)}>Voltar ao endereço do cadastro</button>)
                      : <button type="button" className="erp-btn erp-btn-sm" onClick={() => setEditandoEndereco(true)}>Alterar endereço só nesta nota</button>}
                  </div>
                </div>
              )}
              {cliente?.bloqueado && <div className="erp-field erp-c12"><div className="erp-feedback error">Este cliente está bloqueado no cadastro. Desbloqueie em VCLI0500 para emitir a nota.</div></div>}
              {cliente && editandoEndereco && faltaNoEndereco.length > 0 && (
                <div className="erp-field erp-c12"><div className="erp-feedback warn">
                  {cliente.enderecos.length === 0 ? "Este cliente não tem endereço cadastrado." : `Falta no cadastro: ${faltaNoEndereco.join(", ")}.`} Preencha abaixo para esta nota e, para as próximas, complete o cadastro em VCLI0500.
                </div></div>
              )}
              {cliente && editandoEndereco && camposDeEndereco}
            </>
          ) : (
            <>
              <div className="erp-field erp-c3"><label className="erp-label erp-req" htmlFor="nf-doc">CNPJ ou CPF</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input id="nf-doc" className="erp-input" value={avulso.documento} inputMode="numeric" onChange={(e) => { setAvulso((a) => ({ ...a, documento: e.target.value })); setAvisoCnpj(""); setErro(""); }} />
                  <button type="button" className="erp-btn erp-btn-sm" onClick={() => void buscarCnpj()} disabled={buscandoCnpj || digitos(avulso.documento).length !== 14}>{buscandoCnpj ? "Buscando…" : "Buscar"}</button>
                </div>
                {avulso.documento.trim() && !validateCNPJOrCPF(digitos(avulso.documento)) && <span className="erp-nota-aviso">Documento inválido: confira os dígitos.</span>}
                {avisoCnpj && <span className="erp-nota-aviso">{avisoCnpj}</span>}
              </div>
              <div className="erp-field erp-c6"><label className="erp-label erp-req" htmlFor="nf-nome">Nome ou razão social</label>
                <input id="nf-nome" className="erp-input" value={avulso.nome} onChange={(e) => setAvulso((a) => ({ ...a, nome: e.target.value }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label" htmlFor="nf-ie">Inscrição estadual</label>
                <input id="nf-ie" className="erp-input" value={avulso.ie} placeholder="ISENTO se não contribuinte" onChange={(e) => setAvulso((a) => ({ ...a, ie: e.target.value }))} /></div>
              {clienteDoDocumento && (
                <div className="erp-field erp-c12"><div className="erp-feedback info" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span>Este documento já é do cliente {clienteDoDocumento.code} — {clienteDoDocumento.label}.</span>
                  <button type="button" className="erp-btn erp-btn-sm" onClick={() => { const c = Number(clienteDoDocumento.code); trocarModo("cadastro"); void escolherCliente(c); }}>Usar o cadastro</button>
                </div></div>
              )}
              {camposDeEndereco}
            </>
          )}
        </div>
      </div>

      <div className="erp-fieldset">
        <div className="erp-fieldset-head">Itens — <span style={{ fontWeight: 400, opacity: 0.65 }}>escolha o item e o resto vem do cadastro; tudo pode ser ajustado na linha</span></div>
        <div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid erp-nota-itens">
            <thead>
              <tr><th style={{ width: 34 }}>Seq</th><th>Item e descrição</th><th style={{ width: 92 }}>NCM</th><th style={{ width: 54 }}>UN</th><th style={{ width: 62 }}>CFOP</th>
                <th style={{ width: 66 }}>Origem</th><th style={{ width: 84 }}>Lote</th><th style={{ width: 84 }}>Endereço</th><th className="num" style={{ width: 82 }}>Qtd</th><th className="num" style={{ width: 96 }}>Preço unit.</th><th className="num" style={{ width: 94 }}>Total</th><th style={{ width: 38 }}></th></tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={l.uid}>
                  <td style={{ lineHeight: "30px" }}>{i + 1}</td>
                  <td>
                    <LookupField<string> value={l.item_code || undefined} loader={loadItems} entityLabel="item" placeholder="Buscar item por código ou descrição" allowManualCode={false}
                      onChange={(c) => void escolherItem(l.uid, c ? String(c) : undefined)} />
                    <input className="erp-cell-input" aria-label={`Descrição da linha ${i + 1}`} placeholder="Descrição que sai na nota" value={l.descricao} onChange={(e) => setLinha(l.uid, { descricao: e.target.value, cfop: l.cfop || cfop })} />
                    {l.carregando && <span className="erp-field-hint"><span className="erp-spin" /> Buscando os dados do item…</span>}
                    {l.aviso && <span className="erp-nota-aviso">{l.aviso}</span>}
                  </td>
                  <td><input className="erp-cell-input" aria-label={`NCM da linha ${i + 1}`} inputMode="numeric" value={l.ncm} onChange={(e) => setLinha(l.uid, { ncm: digitos(e.target.value).slice(0, 8) })} /></td>
                  <td><input className="erp-cell-input" aria-label={`Unidade da linha ${i + 1}`} maxLength={6} value={l.unidade} onChange={(e) => setLinha(l.uid, { unidade: e.target.value.toUpperCase() })} /></td>
                  <td><input className="erp-cell-input" aria-label={`CFOP da linha ${i + 1}`} inputMode="numeric" value={l.cfop} onChange={(e) => setLinha(l.uid, { cfop: digitos(e.target.value).slice(0, 4), cfopManual: true })} /></td>
                  <td><select className="erp-cell-input" aria-label={`Origem da linha ${i + 1}`} value={l.origem} title={ORIGENS.find((o) => o.value === l.origem)?.label} onChange={(e) => setLinha(l.uid, { origem: e.target.value })}>
                    {ORIGENS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select></td>
                  <td><input className="erp-cell-input" aria-label={`Lote da linha ${i + 1}`} maxLength={50} value={l.lote} onChange={(e) => setLinha(l.uid, { lote: e.target.value })} /></td>
                  <td><input className="erp-cell-input" aria-label={`Endereço da linha ${i + 1}`} maxLength={100} value={l.endereco} onChange={(e) => setLinha(l.uid, { endereco: e.target.value })} /></td>
                  <td><input className="erp-cell-input num" aria-label={`Quantidade da linha ${i + 1}`} type="number" min="0" step="any" value={l.quantidade} onChange={(e) => setLinha(l.uid, { quantidade: e.target.value })} /></td>
                  <td><input className="erp-cell-input num" aria-label={`Preço da linha ${i + 1}`} type="number" min="0" step="any" value={l.preco} onChange={(e) => setLinha(l.uid, { preco: e.target.value, precoManual: true, aviso: l.aviso.includes("preço") ? "" : l.aviso })} /></td>
                  <td><div className="erp-nota-total">{money(totalLinha(l))}</div></td>
                  <td><button type="button" className="erp-btn erp-btn-danger erp-btn-sm" aria-label={`Remover a linha ${i + 1}`} title="Remover a linha" onClick={() => setLinhas((ls) => ls.filter((x) => x.uid !== l.uid))} disabled={linhas.length === 1}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ paddingTop: 10 }}><button type="button" className="erp-btn" onClick={() => setLinhas((ls) => [...ls, novaLinha()])}>+ Adicionar item</button></div>
        </div></div>
      </div>

      <div className="erp-fieldset">
        <div className="erp-fieldset-head">Dados da nota — <span style={{ fontWeight: 400, opacity: 0.65 }}>os impostos são calculados ao criar</span></div>
        <div className="erp-fieldset-body">
          <div className="erp-field erp-c5"><label className="erp-label erp-req">CFOP</label>
            <LookupField value={Number(cfop) || undefined} loader={loadCfops} entityLabel="CFOP" clearable={cfopManual}
              onChange={(c, o) => escolherCfop(c ?? undefined, o?.label)} />
            <span className="erp-hint">{cfopManual ? "Escolhido por você. Limpe o campo para voltar à sugestão." : "Sugerido pela UF e pela inscrição estadual do destinatário. Item comprado sai como revenda."}</span></div>
          <div className="erp-field erp-c7"><label className="erp-label erp-req" htmlFor="nf-natureza">Natureza da operação</label>
            <input id="nf-natureza" className="erp-input" value={natureza} onChange={(e) => { setNatureza(e.target.value); setNaturezaManual(true); setErro(""); }} /></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req" htmlFor="nf-emissao">Emissão</label>
            <input id="nf-emissao" className="erp-input" type="date" value={capa.emissao} onChange={(e) => setCapa((c) => ({ ...c, emissao: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label" htmlFor="nf-saida">Saída</label>
            <input id="nf-saida" className="erp-input" type="date" value={capa.saida} onChange={(e) => setCapa((c) => ({ ...c, saida: e.target.value }))} /></div>
          <div className="erp-field erp-c3"><span className="erp-label">Número e série</span>
            <p style={{ margin: "6px 0 0", fontSize: 13 }} title="A emissora dá o próximo número da série configurada para a empresa e a nota recebe esse número quando é autorizada.">Definidos na autorização</p></div>
          <div className="erp-field erp-c2"><label className="erp-label" htmlFor="nf-finalidade">Finalidade da compra</label>
            <select id="nf-finalidade" className="erp-input" value={capa.finalidade} onChange={(e) => setCapa((c) => ({ ...c, finalidade: e.target.value }))}>
              {FINALIDADES_COMPRA.map((f) => <option key={f.value} value={f.value}>{f.value === "" ? "A do cliente" : f.label}</option>)}
            </select></div>
          <div className="erp-field erp-c3"><label className="erp-label">Tipo de nota</label>
            <LookupField value={tipoNota} loader={loadInvoiceTypesById} entityLabel="tipo de nota" placeholder="Nenhum" clearable vazio="Nenhum tipo de nota cadastrado. Cadastre em VCLI0530, aba Tipo de NF de Saída." onChange={(c) => { setTipoNota(c ? Number(c) : undefined); setTipoNotaManual(true); }} /></div>
          <div className="erp-field erp-c2"><label className="erp-label" htmlFor="nf-frete">Frete</label>
            <input id="nf-frete" className="erp-input num" type="number" min="0" step="0.01" placeholder="0,00" value={valores.frete} onChange={(e) => setValores((v) => ({ ...v, frete: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label" htmlFor="nf-seguro">Seguro</label>
            <input id="nf-seguro" className="erp-input num" type="number" min="0" step="0.01" placeholder="0,00" value={valores.seguro} onChange={(e) => setValores((v) => ({ ...v, seguro: e.target.value }))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label" htmlFor="nf-desconto">Desconto</label>
            <input id="nf-desconto" className="erp-input num" type="number" min="0" step="0.01" placeholder="0,00" value={valores.desconto} onChange={(e) => setValores((v) => ({ ...v, desconto: e.target.value }))} /></div>
          <div className="erp-field erp-c6"><label className="erp-label">Carga de expedição</label>
            <LookupField value={carga} loader={loadShipmentLoads} entityLabel="carga" placeholder="Nenhuma" clearable allowManualCode={false} onChange={(c) => setCarga(c ? Number(c) : undefined)} /></div>
          <div className="erp-field erp-c12"><label className="erp-label" htmlFor="nf-compl-info">Informações complementares</label>
            <textarea id="nf-compl-info" className="erp-input" rows={2} maxLength={2000} value={capa.complementares} placeholder="Texto que sai no campo de informações complementares da NF-e"
              onChange={(e) => setCapa((c) => ({ ...c, complementares: e.target.value }))} />
            <span className="erp-hint">O sistema acrescenta sozinho o que a lei exige: no Simples Nacional, a identificação de optante e o crédito de ICMS; nos benefícios, a base legal cadastrada na regra de ICMS/IPI.</span></div>
          <div className="erp-field erp-c12"><label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={temCupom} onChange={(e) => setTemCupom(e.target.checked)} />Esta nota substitui um cupom fiscal emitido no balcão</label></div>
          {temCupom && (
            <>
              <div className="erp-field erp-c3"><label className="erp-label erp-req" htmlFor="nf-cupom">Número do cupom</label>
                <input id="nf-cupom" className="erp-input" value={cupom.numero} onChange={(e) => setCupom((c) => ({ ...c, numero: e.target.value }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label" htmlFor="nf-cupom-data">Data do cupom</label>
                <input id="nf-cupom-data" className="erp-input" type="date" value={cupom.data} onChange={(e) => setCupom((c) => ({ ...c, data: e.target.value }))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label" htmlFor="nf-cupom-ecf">Série do ECF</label>
                <input id="nf-cupom-ecf" className="erp-input" value={cupom.ecf} onChange={(e) => setCupom((c) => ({ ...c, ecf: e.target.value }))} /></div>
            </>
          )}
        </div>
      </div>

      <div className="erp-nota-acoes" role="region" aria-label="Totais e ações da nota">
        {erro && <div className="erp-nota-erro" role="alert">{erro}</div>}
        <span>Produtos <span className="erp-nota-valor">R$ {money(produtos)}</span></span>
        <span>Total sem impostos <span className="erp-nota-valor">R$ {money(totalNota)}</span></span>
        <div className="erp-nota-botoes">
          <button type="button" className="erp-btn" onClick={onCancelar} disabled={salvando}>Cancelar</button>
          <button type="button" className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={salvando}>{salvando && <span className="erp-spin" />}Criar rascunho</button>
        </div>
      </div>
    </>
  );
}

import { divergenciaDaChave, lerChaveNFe } from "@/utils/chaveNFe";
import { hojeLocal } from "@/utils/dataLocal";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { type EntradaDocumento, type EntradaManualItem, criarEntradaManual, sugerirItemDaEntrada, type SugestaoItemEntrada } from "@/services/nfeEntradaService";
import { getDadosFiscaisDoFornecedor, listSuppliers } from "@/services/supplierService";
import { codigoDaCondicao, lookupCnpj } from "@/services/customerService";
import { getFiscalConfig } from "@/services/fiscalConfigService";
import { errMessage } from "@/services/fiscalShared";
import { getItem } from "@/services/itemService";
import { UFS, UF_NAMES } from "@/services/taxTableService";
import { documentoComMascara } from "@/utils/documentoFiscal";
import { validateCNPJOrCPF } from "@/utils/validation";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadSuppliers, loadChartOfAccounts, loadFinancialCostCenters, loadEntryOperations, loadWarehouses } from "@/services/lookups";
import { paraCentavos, deCentavos } from "./entradaRateio";
import { PlanoParcelasEditor } from "@/components/ui/PlanoParcelasEditor";
import { type BlocoPlano, calcularPlano, dataMaisDias, planoParcelasIguais } from "@/utils/planoParcelas";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type Modo = "cadastro" | "avulso";

// Dia LOCAL: toISOString() dá o dia em UTC, que já é amanhã depois das 21h.
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const round = (n: number) => Number(n.toFixed(2));
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const digitos = (s: string) => s.replace(/\D/g, "");
const round4 = (n: number) => Number(n.toFixed(4));

/** Retenções na fonte (nota de serviço / prestação com retenção). */
const RETENCOES = [
  { campo: "valor_irrf", rotulo: "IRRF" },
  { campo: "valor_ret_pis", rotulo: "PIS retido" },
  { campo: "valor_ret_cofins", rotulo: "COFINS retida" },
  { campo: "valor_ret_csll", rotulo: "CSLL retida" },
  { campo: "valor_ret_prev", rotulo: "INSS retido" },
  { campo: "valor_iss_ret", rotulo: "ISS retido" },
] as const;
type CampoRetencao = (typeof RETENCOES)[number]["campo"];

const MODELOS = [
  { value: "55", label: "55 — NF-e" },
  { value: "65", label: "65 — NFC-e" },
  { value: "01", label: "1/1A — Nota em papel" },
  { value: "04", label: "4 — Nota de produtor" },
];

interface Linha extends EntradaManualItem {
  uid: number;
  cfopManual: boolean;
  carregando: boolean;
  aviso: string;
  /** Código que o fornecedor usa para o item, e o que já está memorizado no vínculo. */
  codigoFornecedor: string;
  codigoVinculado: string;
  /** Percentuais: 18 = 18%. Valem até a pessoa digitar o valor impresso na nota. */
  aliqIcms: number;
  aliqIpi: number;
  icmsManual: boolean;
  ipiManual: boolean;
  precoManual: boolean;
  origemPreco: string;
  semPrecoAnterior: boolean;
}

const novaLinha = (uid: number, cfop: string): Linha => ({
  uid, sequence: uid, ncm: "", cfop, quantity: 1, unit_price: 0, total_price: 0, valor_icms: 0, valor_ipi: 0,
  cfopManual: false, carregando: false, aviso: "", codigoFornecedor: "", codigoVinculado: "", aliqIcms: 0, aliqIpi: 0,
  icmsManual: false, ipiManual: false, precoManual: false, origemPreco: "", semPrecoAnterior: false,
});

/** O primeiro dígito do CFOP de entrada acompanha a origem: 1 no estado, 2 fora, 3 exterior. */
function cfopPelaOrigem(cfop: string, ufEmitente: string, ufEmpresa: string): string {
  if (cfop.length !== 4 || !ufEmitente || !ufEmpresa) return cfop;
  const digito = ufEmitente === "EX" ? "3" : ufEmitente === ufEmpresa ? "1" : "2";
  return digito + cfop.slice(1);
}

/** A chave de acesso carrega o CNPJ do emitente, o modelo, a série e o número da nota. */
interface Props {
  onCriada: (d: EntradaDocumento) => void;
  onFeedback: (f: FeedbackState) => void;
  onCancelar: () => void;
}

/**
 * Lançamento manual da nota de entrada (nota sem XML: modelo 1/1A, serviço
 * avulso, contingência). O emitente vem de um lugar só: do cadastro de
 * fornecedores ou, sem cadastro, do CNPJ consultado na Receita. O item escolhido
 * traz descrição, NCM e unidade, e o preço e os impostos saem como sugestão a
 * conferir com a nota (pedido em aberto, última compra e tabelas fiscais); o plano de contas e o almoxarifado são opcionais
 * aqui porque a conferência, logo depois, sugere e cobra o que faltar.
 */
export function EntradaManualForm({ onCriada, onFeedback, onCancelar }: Props): JSX.Element {
  const [modo, setModo] = useState<Modo>("cadastro");
  const [numero, setNumero] = useState<number>(0);
  const [serie, setSerie] = useState("1");
  const [modelo, setModelo] = useState("55");
  const [chave, setChave] = useState("");
  const [emissao, setEmissao] = useState(today());
  const [entrada, setEntrada] = useState(today());
  const [supplierCode, setSupplierCode] = useState<number | undefined>();
  const [cnpj, setCnpj] = useState("");
  const [razao, setRazao] = useState("");
  const [ie, setIe] = useState("");
  const [uf, setUf] = useState("");
  const [inativo, setInativo] = useState(false);
  const [carregandoFornecedor, setCarregandoFornecedor] = useState(false);
  const [jaCadastrado, setJaCadastrado] = useState<{ code: number; nome: string } | null>(null);
  const [ufEmpresa, setUfEmpresa] = useState("");
  const [frete, setFrete] = useState(0);
  const [seguro, setSeguro] = useState(0);
  const [desconto, setDesconto] = useState(0);
  const [icmsSt, setIcmsSt] = useState(0);
  const [outras, setOutras] = useState(0);
  const proximoUid = useRef(2);
  const [itens, setItens] = useState<Linha[]>([novaLinha(1, "1101")]);
  const [opNota, setOpNota] = useState<number | undefined>();
  const [temRetencao, setTemRetencao] = useState(false);
  const [retencoes, setRetencoes] = useState<Record<CampoRetencao, number>>({
    valor_irrf: 0, valor_ret_pis: 0, valor_ret_cofins: 0, valor_ret_csll: 0, valor_ret_prev: 0, valor_iss_ret: 0,
  });
  const [blocos, setBlocos] = useState<BlocoPlano[]>(() => planoParcelasIguais(1, 30));
  const [condicao, setCondicao] = useState<number | undefined>();
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");
  // Só a resposta da última escolha vale: a lenta não pode sobrescrever a seguinte.
  const ultimoFornecedor = useRef(0);
  const ultimoItem = useRef<Record<number, number>>({});

  useEffect(() => { getFiscalConfig().then((c) => setUfEmpresa((c.uf_empresa ?? "").toUpperCase())).catch(() => undefined); }, []);

  // A origem do emitente decide o primeiro dígito do CFOP de toda linha que a pessoa não alterou.
  useEffect(() => {
    setItens((xs) => xs.map((l) => (l.cfopManual ? l : { ...l, cfop: cfopPelaOrigem(l.cfop, uf, ufEmpresa) })));
  }, [uf, ufEmpresa]);

  const produtos = round(itens.reduce((s, it) => s + it.total_price, 0));
  const ipi = round(itens.reduce((s, it) => s + (it.valor_ipi || 0), 0));
  const icms = round(itens.reduce((s, it) => s + (it.valor_icms || 0), 0));
  const total = round(produtos + ipi + icmsSt + frete + seguro + outras - desconto);
  const totalRetencoes = temRetencao ? round(Object.values(retencoes).reduce((s, v) => s + (v || 0), 0)) : 0;
  // O fornecedor recebe o líquido; cada retenção vira título a recolher.
  const aPagar = round(total - totalRetencoes);
  const plano = useMemo(() => calcularPlano(blocos, paraCentavos(aPagar)), [blocos, aPagar]);
  const diasAteEntrega = emissao && entrada ? Math.max(0, Math.round((Date.parse(entrada) - Date.parse(emissao)) / 86_400_000)) : 0;

  // Trocou o fornecedor ou a UF: preço e impostos sugeridos eram de outra compra.
  useEffect(() => {
    if (carregandoFornecedor) return;
    for (const l of itens) if (l.item_code) void buscarSugestao(l.uid, l.item_code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierCode, uf, carregandoFornecedor]);

  function limparEmitente() {
    setSupplierCode(undefined); setCnpj(""); setRazao(""); setIe(""); setUf(""); setInativo(false); setAviso(""); setJaCadastrado(null);
  }

  function trocarModo(novo: Modo) {
    if (novo === modo) return;
    ultimoFornecedor.current += 1;
    limparEmitente(); setCarregandoFornecedor(false); setModo(novo); setErro("");
  }

  async function escolherFornecedor(code?: number) {
    const esta = ++ultimoFornecedor.current;
    limparEmitente(); setErro(""); setModo("cadastro");
    if (!code) { setCarregandoFornecedor(false); return; }
    setSupplierCode(code); setCarregandoFornecedor(true);
    try {
      const f = await getDadosFiscaisDoFornecedor(code);
      if (ultimoFornecedor.current !== esta) return;
      setCnpj(f.documento); setRazao(f.nome); setIe(f.ie); setUf(f.uf); setInativo(f.inativo);
      if (f.condicaoId) {
        const condicaoDoFornecedor = await codigoDaCondicao(f.condicaoId).catch(() => undefined);
        if (ultimoFornecedor.current === esta && condicaoDoFornecedor) setCondicao(condicaoDoFornecedor);
      }
    } catch (e) {
      if (ultimoFornecedor.current === esta) { setSupplierCode(undefined); setErro(errMessage(e, "Não foi possível buscar os dados do fornecedor.")); }
    } finally {
      if (ultimoFornecedor.current === esta) setCarregandoFornecedor(false);
    }
  }

  /** Sem cadastro: quem já é fornecedor é oferecido, senão o contas a pagar nasce sem vínculo; o resto vem da Receita. */
  async function buscarPorCnpj() {
    const d = digitos(cnpj);
    if (!validateCNPJOrCPF(d)) { setErro("O CNPJ ou CPF do emitente não é válido: confira os dígitos."); return; }
    setBusy(true); setAviso(""); setErro(""); setJaCadastrado(null);
    try {
      const cadastrado = (await listSuppliers(false)).find((s) => digitos(s.document_number || "") === d);
      if (cadastrado?.code) setJaCadastrado({ code: cadastrado.code, nome: cadastrado.name });
      if (d.length !== 14) return;
      try {
        const r = await lookupCnpj(d);
        setRazao((v) => v || r.legal_name);
        setUf((v) => v || r.address?.uf || "");
        const ieUf = r.state_registrations.find((x) => x.uf === (r.address?.uf ?? "") && x.enabled);
        setIe((v) => v || ieUf?.number || r.state_registration || "");
        if (!cadastrado) setAviso("Dados vindos da Receita. Cadastre o fornecedor para o contas a pagar nascer com ele e os vínculos dos itens serem memorizados.");
      } catch { setAviso("A consulta à Receita não respondeu: preencha a razão social e a UF."); }
    } catch (e) { setErro(errMessage(e, "Não foi possível consultar o CNPJ.")); }
    finally { setBusy(false); }
  }

  /** Colada a chave, número, série, modelo e CNPJ não são digitados de novo. */
  function mudarChave(texto: string) {
    const d = digitos(texto).slice(0, 44);
    setChave(d); setErro("");
    const lida = lerChaveNFe(d);
    if (!lida) return;
    setNumero(lida.numero); setSerie(lida.serie);
    if (MODELOS.some((m) => m.value === lida.modelo)) setModelo(lida.modelo);
    if (modo === "avulso" && !digitos(cnpj)) setCnpj(lida.cnpj);
  }

  function setLinha(uid: number, patch: Partial<Linha>) {
    setErro("");
    setItens((xs) => xs.map((it) => {
      if (it.uid !== uid) return it;
      const m = { ...it, ...patch };
      m.total_price = round(m.quantity * m.unit_price);
      // Imposto digitado é o da nota; sem ele, sai da alíquota sobre o valor da linha.
      if (m.icmsManual) m.aliqIcms = m.total_price > 0 ? round4((m.valor_icms / m.total_price) * 100) : 0;
      else m.valor_icms = round((m.total_price * m.aliqIcms) / 100);
      if (m.ipiManual) m.aliqIpi = m.total_price > 0 ? round4((m.valor_ipi / m.total_price) * 100) : 0;
      else m.valor_ipi = round((m.total_price * m.aliqIpi) / 100);
      return m;
    }));
  }

  /** O que veio da consulta não apaga o que a pessoa já digitou na linha. */
  function aplicarSugestao(uid: number, s: SugestaoItemEntrada) {
    setItens((xs) => xs.map((it) => {
      if (it.uid !== uid) return it;
      const m: Linha = { ...it, codigoVinculado: s.codigo_fornecedor ?? "" };
      if (!m.codigoFornecedor && s.codigo_fornecedor) m.codigoFornecedor = s.codigo_fornecedor;
      if (!m.cfopManual && s.cfop) m.cfop = s.cfop;
      if (!m.precoManual) {
        m.unit_price = s.preco_unitario ?? 0;
        m.origemPreco = s.origem_preco ?? "";
        m.semPrecoAnterior = s.preco_unitario === undefined;
      }
      if (!m.icmsManual) m.aliqIcms = s.aliq_icms ?? 0;
      if (!m.ipiManual) m.aliqIpi = s.aliq_ipi ?? 0;
      m.total_price = round(m.quantity * m.unit_price);
      if (!m.icmsManual) m.valor_icms = round((m.total_price * m.aliqIcms) / 100);
      if (!m.ipiManual) m.valor_ipi = round((m.total_price * m.aliqIpi) / 100);
      return m;
    }));
  }

  async function buscarSugestao(uid: number, code: string) {
    const esta = (ultimoItem.current[uid] ?? 0) + 1;
    ultimoItem.current[uid] = esta;
    try {
      const s = await sugerirItemDaEntrada({ supplier_code: supplierCode, item_code: code, uf_emitente: uf || undefined });
      if (ultimoItem.current[uid] === esta) aplicarSugestao(uid, s);
    } catch { /* A sugestão é só um ponto de partida: sem ela, a pessoa digita da nota. */ }
  }

  async function escolherItem(uid: number, code?: string) {
    if (!code) {
      ultimoItem.current[uid] = (ultimoItem.current[uid] ?? 0) + 1;
      setLinha(uid, { item_code: undefined, description: undefined, uom: undefined, ncm: "", carregando: false, aviso: "", codigoVinculado: "", origemPreco: "", semPrecoAnterior: false });
      return;
    }
    setLinha(uid, { item_code: code, carregando: true, aviso: "" });
    void buscarSugestao(uid, code);
    const esta = ultimoItem.current[uid];
    try {
      const item = await getItem(code);
      if (ultimoItem.current[uid] !== esta) return;
      // Na entrada vale a classificação de compra; a de venda é o plano B.
      const fiscal = item.fiscal_effective?.purchase ?? item.fiscal_effective?.sale;
      const ncm = digitos(fiscal?.ncm ?? "");
      setLinha(uid, {
        description: item.description, uom: fiscal?.unit || item.uom, ncm, carregando: false,
        aviso: ncm ? "" : "Sem NCM no cadastro do item: informe como consta na nota.",
      });
    } catch (e) {
      if (ultimoItem.current[uid] === esta) setLinha(uid, { carregando: false, aviso: errMessage(e, "Não foi possível buscar os dados do item: preencha à mão.") });
    }
  }

  /** O código impresso na nota leva ao nosso item pelo vínculo com o fornecedor. */
  async function resolverCodigoFornecedor(l: Linha) {
    const codigo = l.codigoFornecedor.trim();
    if (!codigo || l.item_code || !supplierCode) return;
    try {
      const s = await sugerirItemDaEntrada({ supplier_code: supplierCode, codigo_fornecedor: codigo, uf_emitente: uf || undefined });
      if (s.encontrado && s.item_code) { await escolherItem(l.uid, s.item_code); return; }
      setLinha(l.uid, { aviso: `O código ${codigo} ainda não está ligado a um item deste fornecedor: escolha o item e o vínculo fica memorizado.` });
    } catch (e) { setLinha(l.uid, { aviso: errMessage(e, "Não foi possível consultar o código do fornecedor.") }); }
  }

  /** Primeiro problema, em português e apontando a linha. */
  function conferir(): string {
    const doc = digitos(cnpj);
    if (modo === "cadastro" && !supplierCode) return "Escolha o fornecedor da nota.";
    if (!doc) return "Informe o CNPJ ou CPF do emitente.";
    if (!validateCNPJOrCPF(doc)) return modo === "cadastro"
      ? "O CNPJ ou CPF no cadastro deste fornecedor não é válido: corrija em VSUP0100 ou lance como \"Sem cadastro\"."
      : "O CNPJ ou CPF do emitente não é válido: confira os dígitos.";
    if (!razao.trim()) return "Informe a razão social do emitente.";
    if (!uf) return "Informe a UF do emitente: é ela que define o CFOP de entrada.";
    if (!numero) return "Informe o número da nota.";
    if (!emissao) return "Informe a data de emissão.";
    if (chave) {
      const divergencia = divergenciaDaChave(chave, { cnpj: doc, numero: Number(numero) || undefined, serie, modelo, uf, emissao });
      if (divergencia) return divergencia;
    }
    const hoje = hojeLocal();
    if (emissao > hoje) return "A data de emissão não pode estar no futuro.";
    if (entrada && entrada > hoje) return "A data de entrada não pode estar no futuro.";
    if (entrada && entrada < emissao) return "A data de entrada não pode ser anterior à emissão.";
    for (const [i, it] of itens.entries()) {
      const n = i + 1;
      if (!it.item_code) return `Linha ${n}: escolha o item do cadastro.`;
      if (it.ncm && digitos(it.ncm).length !== 8) return `Linha ${n}: o NCM tem 8 dígitos.`;
      if (!/^[123567]\d{3}$/.test(it.cfop)) return `Linha ${n}: o CFOP tem 4 dígitos e começa com 1, 2, 3, 5, 6 ou 7.`;
      if (it.quantity <= 0) return `Linha ${n}: a quantidade precisa ser maior que zero.`;
      if (it.unit_price < 0) return `Linha ${n}: o preço não pode ser negativo.`;
      if (it.valor_icms < 0 || it.valor_ipi < 0) return `Linha ${n}: ICMS e IPI não podem ser negativos.`;
    }
    if (frete < 0 || seguro < 0 || desconto < 0 || icmsSt < 0 || outras < 0) return "Frete, seguro, desconto, ICMS-ST e outras despesas não podem ser negativos.";
    if (total <= 0) return "O total da nota precisa ser maior que zero.";
    if (Object.values(retencoes).some((v) => v < 0) || totalRetencoes > total) return "As retenções não podem ser negativas nem maiores que o total da nota.";
    if (aPagar > 0 && plano.erro) return `Parcelamento: ${plano.erro}`;
    return "";
  }

  async function salvar() {
    const problema = conferir();
    if (problema) { setErro(problema); return; }
    const parcelas = aPagar > 0 ? plano.parcelas : [];
    setBusy(true); setErro(""); onFeedback(null);
    try {
      const d = await criarEntradaManual({
        chave_acesso: chave || undefined,
        numero_nf: numero, serie: serie.trim() || "1", modelo, data_emissao: emissao, data_entrada: entrada,
        supplier_code: supplierCode, cnpj_emitente: digitos(cnpj), razao_social_emitente: razao.trim(), ie_emitente: ie.trim() || undefined, uf_emitente: uf,
        valor_produtos: produtos, valor_frete: frete, valor_seguro: seguro, valor_desconto: desconto, valor_icms_st: icmsSt, valor_outras: outras,
        valor_ipi: ipi, valor_icms: icms, valor_pis: 0, valor_cofins: 0, valor_total: total, tipo_documento: "NFE",
        entry_operation_code: opNota, ...(temRetencao ? retencoes : {}),
        itens: itens.map((it, i) => ({
          item_code: it.item_code, supplier_item_code: it.codigoFornecedor.trim() || undefined,
          // Só o código novo é memorizado, e só para fornecedor cadastrado.
          lembrar_vinculo: Boolean(supplierCode && it.item_code && it.codigoFornecedor.trim() && it.codigoFornecedor.trim().toUpperCase() !== it.codigoVinculado.trim().toUpperCase()),
          description: it.description, uom: it.uom, cfop: it.cfop, quantity: it.quantity, unit_price: it.unit_price, total_price: it.total_price,
          valor_icms: it.valor_icms, valor_ipi: it.valor_ipi, plano_contas_id: it.plano_contas_id, centro_custo_id: it.centro_custo_id, warehouse_id: it.warehouse_id,
          // Alíquota em fração, derivada do valor: base × alíquota precisa dar o imposto da nota.
          sequence: i + 1, ncm: digitos(it.ncm),
          base_icms: it.valor_icms ? it.total_price : 0, aliq_icms: it.valor_icms && it.total_price ? it.valor_icms / it.total_price : 0,
          base_ipi: it.valor_ipi ? it.total_price : 0, aliq_ipi: it.valor_ipi && it.total_price ? it.valor_ipi / it.total_price : 0,
          valor_pis: 0, valor_cofins: 0,
          gera_credito_icms: it.valor_icms > 0, gera_credito_ipi: it.valor_ipi > 0, gera_credito_pis: false, gera_credito_cofins: false,
        })),
        parcelas: parcelas.map((p) => ({
          numero: p.numero, data_vencimento: dataMaisDias(emissao, p.dias), valor: deCentavos(p.valorCent),
          documento: parcelas.length > 1 ? `${numero}/${p.numero}` : String(numero), forma_pagamento: "BOLETO",
        })),
      });
      onCriada(d);
    } catch (e) { setErro(errMessage(e, "Não foi possível lançar a nota. Tente de novo.")); }
    finally { setBusy(false); }
  }

  const documentoValido = validateCNPJOrCPF(digitos(cnpj));
  const seletorDeUf = (
    <div className="erp-field erp-c2"><label className="erp-label erp-req" htmlFor="ent-uf">UF</label>
      <select id="ent-uf" className="erp-input" value={uf} onChange={(e) => { setUf(e.target.value); setErro(""); }}>
        <option value="">Selecione</option>
        {UFS.map((u) => <option key={u} value={u} title={UF_NAMES[u]}>{u}</option>)}
        <option value="EX">EX — Exterior</option>
      </select></div>
  );

  return (
    <>
      <div className="erp-fieldset">
        <div className="erp-fieldset-head" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span>Emitente</span>
          <div className="erp-nota-modo" role="radiogroup" aria-label="Origem do emitente">
            <label><input type="radio" name="ent-modo" checked={modo === "cadastro"} onChange={() => trocarModo("cadastro")} />Fornecedor cadastrado</label>
            <label><input type="radio" name="ent-modo" checked={modo === "avulso"} onChange={() => trocarModo("avulso")} />Sem cadastro</label>
          </div>
        </div>
        <div className="erp-fieldset-body">
          {modo === "cadastro" ? (
            <>
              <div className="erp-field erp-c6"><label className="erp-label erp-req">Fornecedor</label>
                <LookupField value={supplierCode} loader={loadSuppliers} entityLabel="fornecedor" placeholder="Buscar por nome, código ou CNPJ" allowManualCode={false}
                  onChange={(c) => void escolherFornecedor(c ? Number(c) : undefined)} /></div>
              {carregandoFornecedor && <div className="erp-field erp-c12"><span className="erp-field-hint"><span className="erp-spin" /> Buscando os dados do fornecedor…</span></div>}
              {supplierCode && !carregandoFornecedor && razao && (
                <>
                  <div className="erp-field erp-c12">
                    <dl className="erp-dados">
                      <dt>Razão social</dt><dd>{razao}</dd>
                      <dt>{digitos(cnpj).length === 11 ? "CPF" : "CNPJ"}</dt><dd>{documentoComMascara(cnpj)}</dd>
                      <dt>Inscrição estadual</dt><dd>{ie || "Não informada"}</dd>
                      {uf && <><dt>UF</dt><dd>{uf}</dd></>}
                    </dl>
                  </div>
                  {inativo && <div className="erp-field erp-c12"><div className="erp-feedback info">Este fornecedor está inativo no cadastro.</div></div>}
                  {!uf && (
                    <>
                      <div className="erp-field erp-c10"><div className="erp-feedback info">O cadastro deste fornecedor não tem endereço com UF. Informe aqui e complete o cadastro em VSUP0100.</div></div>
                      {seletorDeUf}
                    </>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <div className="erp-field erp-c4"><label className="erp-label erp-req" htmlFor="ent-doc">CNPJ/CPF</label>
                <input id="ent-doc" className="erp-input" inputMode="numeric" value={cnpj} onChange={(e) => { setCnpj(e.target.value); setJaCadastrado(null); setErro(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") void buscarPorCnpj(); }} />
                {cnpj.trim() && !documentoValido && <span className="erp-field-hint" style={{ color: "var(--v-err)" }}>Documento inválido: confira os dígitos.</span>}</div>
              <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button type="button" className="erp-btn" onClick={() => void buscarPorCnpj()} disabled={busy}>Buscar</button></div>
              <div className="erp-field erp-c6"><label className="erp-label erp-req" htmlFor="ent-razao">Razão social</label>
                <input id="ent-razao" className="erp-input" value={razao} onChange={(e) => { setRazao(e.target.value); setErro(""); }} /></div>
              <div className="erp-field erp-c4"><label className="erp-label" htmlFor="ent-ie">Inscrição estadual</label>
                <input id="ent-ie" className="erp-input" value={ie} onChange={(e) => setIe(e.target.value)} /></div>
              {seletorDeUf}
              {jaCadastrado && (
                <div className="erp-field erp-c12"><div className="erp-feedback info" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ flex: 1 }}>Este documento já é do fornecedor {jaCadastrado.code} — {jaCadastrado.nome}.</span>
                  <button type="button" className="erp-btn erp-btn-sm" onClick={() => void escolherFornecedor(jaCadastrado.code)}>Usar o cadastro</button>
                </div></div>
              )}
              {aviso && <div className="erp-field erp-c12"><div className="erp-feedback info">{aviso}</div></div>}
            </>
          )}
        </div>
      </div>

      <div className="erp-fieldset">
        <div className="erp-fieldset-head">Nota</div>
        <div className="erp-fieldset-body">
          <div className="erp-field erp-c6"><label className="erp-label" htmlFor="ent-chave">Chave de acesso</label>
            <input id="ent-chave" className="erp-input" inputMode="numeric" value={chave} onChange={(e) => mudarChave(e.target.value)} />
            <span className="erp-hint">Opcional. Colada a chave, número, série e modelo se preenchem sozinhos.</span></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req" htmlFor="ent-numero">Número</label>
            <input id="ent-numero" className="erp-input num" type="number" min={1} value={numero || ""} onChange={(e) => { setNumero(Number(e.target.value)); setErro(""); }} /></div>
          <div className="erp-field erp-c1"><label className="erp-label" htmlFor="ent-serie">Série</label>
            <input id="ent-serie" className="erp-input" maxLength={3} value={serie} onChange={(e) => setSerie(e.target.value)} /></div>
          <div className="erp-field erp-c3"><label className="erp-label" htmlFor="ent-modelo">Modelo</label>
            <select id="ent-modelo" className="erp-input" value={modelo} onChange={(e) => setModelo(e.target.value)}>
              {MODELOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select></div>
          <div className="erp-field erp-c2"><label className="erp-label erp-req" htmlFor="ent-emissao">Emissão</label>
            <input id="ent-emissao" className="erp-input" type="date" value={emissao} onChange={(e) => { setEmissao(e.target.value); setErro(""); }} /></div>
          <div className="erp-field erp-c2"><label className="erp-label" htmlFor="ent-entrada">Entrada</label>
            <input id="ent-entrada" className="erp-input" type="date" value={entrada} onChange={(e) => { setEntrada(e.target.value); setErro(""); }} /></div>
          <div className="erp-field erp-c4"><label className="erp-label">Operação de entrada</label>
            <LookupField value={opNota} loader={loadEntryOperations} entityLabel="operação de entrada" allowManualCode={false} placeholder="Definir na conferência"
              vazio="Nenhuma operação cadastrada. Cadastre em VFIS0360."
              onChange={(c) => setOpNota(c ? Number(c) : undefined)} /></div>
          <div className="erp-field erp-c2"><label className="erp-label" htmlFor="ent-frete">Frete</label>
            <input id="ent-frete" className="erp-input num" type="number" step="0.01" min="0" value={frete || ""} onChange={(e) => setFrete(Number(e.target.value))} /></div>
          <div className="erp-field erp-c1"><label className="erp-label" htmlFor="ent-seguro">Seguro</label>
            <input id="ent-seguro" className="erp-input num" type="number" step="0.01" min="0" value={seguro || ""} onChange={(e) => setSeguro(Number(e.target.value))} /></div>
          <div className="erp-field erp-c1"><label className="erp-label" htmlFor="ent-desconto">Desconto</label>
            <input id="ent-desconto" className="erp-input num" type="number" step="0.01" min="0" value={desconto || ""} onChange={(e) => setDesconto(Number(e.target.value))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label" htmlFor="ent-st">ICMS-ST</label>
            <input id="ent-st" className="erp-input num" type="number" step="0.01" min="0" value={icmsSt || ""} onChange={(e) => setIcmsSt(Number(e.target.value))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label" htmlFor="ent-outras">Outras despesas</label>
            <input id="ent-outras" className="erp-input num" type="number" step="0.01" min="0" value={outras || ""} onChange={(e) => setOutras(Number(e.target.value))} /></div>
          <div className="erp-field erp-c12"><label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={temRetencao} onChange={(e) => setTemRetencao(e.target.checked)} />Esta nota tem retenção na fonte</label></div>
          {temRetencao && RETENCOES.map((r) => (
            <div key={r.campo} className="erp-field erp-c2"><label className="erp-label" htmlFor={`ent-${r.campo}`}>{r.rotulo}</label>
              <input id={`ent-${r.campo}`} className="erp-input num" type="number" step="0.01" min="0" value={retencoes[r.campo] || ""}
                onChange={(e) => setRetencoes((x) => ({ ...x, [r.campo]: Number(e.target.value) || 0 }))} /></div>
          ))}
        </div>
      </div>

      <div className="erp-fieldset">
        <div className="erp-fieldset-head vpl-panel-head"><span className="vpl-panel-head-title">Itens</span>
          <span className="vpl-panel-head-actions"><button type="button" className="erp-btn erp-btn-sm" onClick={() => setItens((xs) => [...xs, novaLinha(proximoUid.current++, cfopPelaOrigem("1101", uf, ufEmpresa))])}>+ Item</button></span></div>
        <div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <table className="erp-grid erp-nota-itens">
            <colgroup>
              <col style={{ width: 32 }} /><col /><col style={{ width: 96 }} /><col style={{ width: 52 }} /><col style={{ width: 66 }} /><col style={{ width: 84 }} />
              <col style={{ width: 100 }} /><col style={{ width: 100 }} /><col style={{ width: 90 }} /><col style={{ width: 90 }} /><col style={{ width: 40 }} />
            </colgroup>
            <thead><tr><th>#</th><th>Item</th><th>NCM</th><th>UN</th><th>CFOP</th><th className="num">Qtd.</th><th className="num">Preço unit.</th><th className="num">Total</th><th className="num">ICMS</th><th className="num">IPI</th><th></th></tr></thead>
            <tbody>
              {itens.map((it, idx) => (
                <Fragment key={it.uid}>
                  <tr>
                    <td>{idx + 1}</td>
                    <td><LookupField<string> value={it.item_code} loader={loadItems} entityLabel="item" placeholder="Buscar item" allowManualCode={false}
                      onChange={(c) => void escolherItem(it.uid, c ? String(c) : undefined)} />
                      {it.carregando && <span className="erp-nota-aviso"><span className="erp-spin" /> Buscando os dados do item…</span>}
                      {it.aviso && <span className="erp-nota-aviso">{it.aviso}</span>}
                      {it.origemPreco && <span className="erp-field-hint">Preço sugerido: {it.origemPreco}. Confira com a nota.</span>}
                      {it.semPrecoAnterior && it.item_code && <span className="erp-field-hint">Sem compra anterior deste item: informe o preço da nota.</span>}</td>
                    <td><input className="erp-cell-input" aria-label={`NCM da linha ${idx + 1}`} inputMode="numeric" value={it.ncm} onChange={(e) => setLinha(it.uid, { ncm: digitos(e.target.value).slice(0, 8) })} /></td>
                    <td><input className="erp-cell-input" aria-label={`Unidade da linha ${idx + 1}`} value={it.uom ?? ""} onChange={(e) => setLinha(it.uid, { uom: e.target.value.toUpperCase() })} /></td>
                    <td><input className="erp-cell-input" aria-label={`CFOP da linha ${idx + 1}`} inputMode="numeric" value={it.cfop} onChange={(e) => setLinha(it.uid, { cfop: digitos(e.target.value).slice(0, 4), cfopManual: true })} /></td>
                    <td><input className="erp-cell-input num" aria-label={`Quantidade da linha ${idx + 1}`} type="number" min="0" step="any" value={it.quantity} onChange={(e) => setLinha(it.uid, { quantity: Number(e.target.value) })} /></td>
                    <td><input className="erp-cell-input num" aria-label={`Preço da linha ${idx + 1}`} type="number" min="0" step="0.01" value={it.unit_price || ""} onChange={(e) => setLinha(it.uid, { unit_price: Number(e.target.value), precoManual: true, origemPreco: "", semPrecoAnterior: false })} /></td>
                    <td className="erp-nota-total">{money(it.total_price)}</td>
                    <td><input className="erp-cell-input num" aria-label={`ICMS da linha ${idx + 1}`} type="number" min="0" step="0.01" value={it.valor_icms || ""} onChange={(e) => setLinha(it.uid, { valor_icms: Number(e.target.value), icmsManual: true })} /></td>
                    <td><input className="erp-cell-input num" aria-label={`IPI da linha ${idx + 1}`} type="number" min="0" step="0.01" value={it.valor_ipi || ""} onChange={(e) => setLinha(it.uid, { valor_ipi: Number(e.target.value), ipiManual: true })} /></td>
                    <td><button type="button" className="erp-btn erp-btn-sm" aria-label={`Remover a linha ${idx + 1}`} disabled={itens.length === 1} onClick={() => setItens((xs) => xs.filter((x) => x.uid !== it.uid))}>×</button></td>
                  </tr>
                  <tr>
                    <td></td>
                    <td colSpan={10}>
                      <div className="erp-entrada-contas">
                        <div><span className="erp-label">Código no fornecedor</span>
                          <input className="erp-cell-input" aria-label={`Código no fornecedor da linha ${idx + 1}`} value={it.codigoFornecedor} maxLength={60} placeholder="Como vem na nota"
                            onChange={(e) => setLinha(it.uid, { codigoFornecedor: e.target.value })}
                            onBlur={() => void resolverCodigoFornecedor(it)}
                            onKeyDown={(e) => { if (e.key === "Enter") void resolverCodigoFornecedor(it); }} /></div>
                        <div><span className="erp-label">ICMS %</span>
                          <input className="erp-cell-input num" aria-label={`Alíquota de ICMS da linha ${idx + 1}`} type="number" min="0" step="0.01" value={it.aliqIcms || ""}
                            onChange={(e) => setLinha(it.uid, { aliqIcms: Number(e.target.value), icmsManual: false })} /></div>
                        <div><span className="erp-label">IPI %</span>
                          <input className="erp-cell-input num" aria-label={`Alíquota de IPI da linha ${idx + 1}`} type="number" min="0" step="0.01" value={it.aliqIpi || ""}
                            onChange={(e) => setLinha(it.uid, { aliqIpi: Number(e.target.value), ipiManual: false })} /></div>
                        <div><span className="erp-label">Plano de contas</span>
                          <LookupField value={it.plano_contas_id} loader={loadChartOfAccounts} entityLabel="plano de contas" allowManualCode={false} placeholder="Sugerido na conferência"
                            onChange={(c) => setLinha(it.uid, { plano_contas_id: c ? Number(c) : undefined })} /></div>
                        <div><span className="erp-label">Centro de custo</span>
                          <LookupField value={it.centro_custo_id} loader={loadFinancialCostCenters} entityLabel="centro de custo" allowManualCode={false} placeholder="Opcional"
                            onChange={(c) => setLinha(it.uid, { centro_custo_id: c ? Number(c) : undefined })} /></div>
                        <div><span className="erp-label">Almoxarifado</span>
                          <LookupField value={it.warehouse_id} loader={loadWarehouses} entityLabel="almoxarifado" allowManualCode={false} placeholder="O do item"
                            onChange={(c) => setLinha(it.uid, { warehouse_id: c ? Number(c) : undefined })} /></div>
                      </div>
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>

      <div className="erp-fieldset">
        <div className="erp-fieldset-head">Pagamento</div>
        <div className="erp-fieldset-body"><div className="erp-field erp-c12">
          <PlanoParcelasEditor totalCent={paraCentavos(aPagar)} dataBase={emissao} blocos={blocos} onBlocos={setBlocos}
            condicao={condicao} onCondicao={setCondicao} diasAteEntrega={diasAteEntrega} onErro={setErro} />
        </div></div>
      </div>

      <div className="erp-nota-acoes" role="region" aria-label="Totais e ações da nota">
        {erro && <div className="erp-nota-erro" role="alert">{erro}</div>}
        <span>Produtos <span className="erp-nota-valor">R$ {money(produtos)}</span></span>
        <span>Total <span className="erp-nota-valor">R$ {money(total)}</span></span>
        {temRetencao && <span>A pagar ao fornecedor <span className="erp-nota-valor">R$ {money(aPagar)}</span></span>}
        <div className="erp-nota-botoes">
          <button type="button" className="erp-btn" onClick={onCancelar} disabled={busy}>Cancelar</button>
          <button type="button" className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy && <span className="erp-spin" />}Lançar e conferir</button>
        </div>
      </div>
    </>
  );
}

import { useState, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { createItem, updateItem, getItemTemplate } from "@/services/itemService";
import { listFiscalClassifications, type FiscalClassification } from "@/services/fiscalAdvancedService";
import { errMessage, parseBool, parseNum, parseStr, unwrapObject, type Obj } from "@/services/fiscalShared";
import { LookupField } from "@/components/ui/LookupField";
import { loadCapacityLines, loadPdmGroups, loadPdmModifiers, loadBaseItems, loadWarehouses, loadItems, loadFiscalClassifications, loadCustomers } from "@/services/lookups";
import { modificadoresDoGrupo, obterModeloPDM, previaDaDescricaoPDM, type ModeloPDM, type PreviaPDM } from "@/services/pdmService";
import { getControleDoItem, salvarControleDoItem } from "@/services/stockService";
import { obterPerfil, salvarPerfil } from "@/services/posVendaService";
import { listWhereUsed, type WhereUsedRow } from "@/services/ItemStructureService";
import { invalidarListas } from "@/services/lookupInvalidation";
import { atributosLivresDoItem, criarRevisaoDoItem, embalagensDoItem, impactoDaAlteracao, itensParecidos, nomesDeAtributosLivres, previaFiscalDoItem, prontidaoDoItem, revisoesDoItem, saldoDuasUnidades, salvarAtributosLivres, salvarEmbalagensDoItem, type AtributoLivre, type Candidato, type EmbalagemItem, type ImpactoAlteracao, type PreviaFiscal, type Prontidao, type RevisaoItem, type SaldoDuasUnidades } from "@/services/itemGovernancaService";
import { impostosDoItem, type SimulacaoResultado } from "@/services/tributacaoService";
import { responsaveisDoGrupo, type Responsaveis } from "@/services/setorService";

// ─── Enums (mirror do backend Go) ─────────────────────────────────────────────
//
// ⚠️ Estes valores são os aceitos por `internal/domain/enums/types`. Enviar
// qualquer outra string faz o `POST /api/items/create` devolver 400 — a UM, por
// exemplo, é validada por `TypeUnitOfMeasurementItem.IsValid()`.

type TypeSituationItem = "LINHA" | "PROMOCAO";
type Health = "ATIVO" | "INATIVO" | "FANTASMA";
type TypeUnitOfMeasurementItem =
  | "MM"
  | "CM"
  | "M"
  | "IN"
  | "KG"
  | "M2"
  | "M3"
  | "UN"
  | "MICROMETRO"
  | "TONELADA"
  | "L"
  | "CX"
  | "PC"
  | "GL"
  | "PAR";
type TypeItem = "FABRICADO" | "COMPRADO" | "DE_TERCEIRO" | "SERVICO";
type TypeStructItem = "INDUSTRIAL" | "COMERCIAL";
type TypePlanejamento = "NORMAL_MRP" | "PROJETO";
/** `ItemNature` — 0 Genérico, 1 Configurado, 2 Item Base. */
type ItemNature = 0 | 1 | 2;
type TypeTipoUtilizacao = "Industrialização" | "Consumo" | "Imobilizado";
type TypeVenda = "Venda" | "Revenda";
type OrigemItem =
  | ""
  | "0 - Nacional"
  | "1 - Estrangeira (Importação Direta)"
  | "2 - Estrangeira (Adquirida no Mercado Interno)"
  | "3 - Nacional, conteúdo de importação > 40% e ≤ 70%"
  | "4 - Nacional, produção conforme PPB"
  | "5 - Nacional, conteúdo de importação ≤ 40%"
  | "6 - Estrangeira (Importação Direta), sem similar nacional (CAMEX)"
  | "7 - Estrangeira (Mercado Interno), sem similar nacional (CAMEX)"
  | "8 - Nacional, conteúdo de importação > 70%";

type AbaAtiva =
  | "capa"
  | "estoque"
  | "engenharia"
  | "planejamento"
  | "comercial"
  | "contabil"
  | "prontidao";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface FormItem {
  // Capa
  code: string;
  name: string;
  description: string;
  complement: string;
  /**
   * `nature` continua existindo porque o backend antigo depende dela, mas quem
   * manda agora são os marcadores abaixo: um item pode ser base **e**
   * configurado ao mesmo tempo — é o caso de um modelo paramétrico que também
   * serve de molde para outros itens. Cada marcador é independente; `nature`
   * passou a ser só o resumo derivado deles.
   */
  nature: ItemNature;
  isBase: boolean;
  isConfigured: boolean;
  isGeneric: boolean;
  isPrototype: boolean;
  isTool: boolean;
  isProcessItem: boolean;
  isScrap: boolean;
  revision: string;
  previousCode: string;
  manufacturerName: string;
  manufacturerPartNumber: string;
  longDescription: string;
  descriptionEn: string;
  /** Valores do padrão descritivo, por nome do atributo. */
  pdmAttrs: Record<string, string>;
  groupID: string;
  modifierID: string;
  situation: TypeSituationItem;
  health: Health;
  observations: string;

  // Estoque (Almoxarifado)
  warehouseID: string;
  unitOfMeasurement: TypeUnitOfMeasurementItem;
  automaticLow: boolean;
  cyclicalCount: boolean;
  cyclicalCountDays: number;
  cyclicalCountMinStock: number;
  fractional: boolean;
  secondaryUom: string;
  secondaryFactor: string;
  maximumStock: string;
  controlsLot: boolean;
  controlsAddress: boolean;
  controlsSerial: boolean;
  lotIssueRule: "FEFO" | "FIFO";
  shelfLifeDays: string;
  minRemainingLifeDays: string;
  storageConditions: string;
  hazardous: boolean;
  unNumber: string;
  hazardClass: string;

  // Engenharia
  itemBaseCod: string;
  grossWeight: string;
  netWeight: string;
  cubicVolume: string;
  type: TypeItem;
  typeStruct: TypeStructItem;
  oem: boolean;
  /** Dimensões da embalagem, em milímetros — vão para o romaneio e o frete. */
  dimLength: string;
  dimWidth: string;
  dimHeight: string;
  requiresDrawing: boolean;
  cuttingGrain: "NONE" | "LENGTH" | "WIDTH";
  cuttingNoRotation: boolean;

  // Planejamento
  typePlanejamento: TypePlanejamento;
  /** Low Level Code: 1 = produto final, 2–8 intermediários, 9 = matéria-prima. */
  llc: string;
  lotMaximo: string;
  lotMinimo: string;
  lotMultiplo: string;
  estoqueSeguranca: string;
  tempoSeguranca: string;
  tempoReposicao: string;
  /** Consumo médio no período de cobertura — o CM do ponto de pedido. */
  consumoMedio: string;
  cobertura: string;
  /** Repor pelo ponto de pedido (consumo por dia trabalhado). */
  usaPontoDePedido: boolean;
  /** Curva ABC do item no planejamento: A, B ou C. Não é a classificação do
   * item — essa vive nas pastas Comercial e Contábil. */
  curvaAbc: string;
  /** Setor/tanque onde o item é produzido. */
  tanque: string;
  purchaseLeadTimeDays: string;
  manufacturingLeadTimeDays: string;
  materialIssueTiming: "PRODUCTION" | "REGISTRATION_RELEASE";
  productionReportingType: "OPERATION" | "ORDER";
  critico: boolean;
  exclusivo: boolean;
  /** O MRP considera o item. Ia sempre `true`: salvar reativava item desativado. */
  ativoPlanejamento: boolean;
  fantasma: boolean;
  obsPlanjamento: string;

  // Comercial
  descrComercial: string;
  almoxTransf: string;
  alterarDescrFat: boolean;
  emiteEtiquetas: boolean;
  montagemVolExp: boolean;
  embalagDif: boolean;
  retencaoPisCofins: boolean;
  tipoVenda: TypeVenda;
  multiploVenda: string;
  minVenda: string;
  embalagem: boolean;
  tempoGarantia: string;
  almoxAssTec: string;
  entregaEstimada: string;
  mobileEnabled: boolean;
  embExportacao: boolean;
  obsComercial: string;
  exclusiveCustomer: string;
  volumesPerUnit: string;

  // Contábil
  classifFiscVenda: string;
  classifFiscCompra: string;
  umVenda: string;
  origem: OrigemItem;
  cest: string;
  obsContabil: string;
  gtin: string;
  gtinTax: string;
  efdItemType: string;
  taxUnit: string;
  taxUnitFactor: string;
  exTipi: string;
  relevantScale: "" | "SIM" | "NAO";
  manufacturerCnpj: string;
  fciNumber: string;

  // Suprimentos
  umSuprimentos: TypeUnitOfMeasurementItem;
  almoxSuprimentos: string;
  /** Exige conferência documentada na entrada do material. */
  checklistRecebimento: boolean;
  /** Item controlado por safra (agro e alimentos). */
  controlaSafra: boolean;
  receiptRouting: "DIRETO" | "PADRAO" | "INSPECAO";
  requiresCertificate: boolean;
  overTolerance: string;
  underTolerance: string;
  tipoUtilizacao: TypeTipoUtilizacao;
  obsSuprimentos: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Níveis de embalagem: vão no uCom da nota, então cabem em 6 caracteres. */
const UNIDADES_EMBALAGEM = ["UN", "PCT", "CX", "FD", "SC", "RL", "BD", "KIT", "PL"];
const ROTULO_EMBALAGEM: Record<string, string> = { PCT: "PCT (pacote)", CX: "CX (caixa)", FD: "FD (fardo)", SC: "SC (saco)", RL: "RL (rolo)", BD: "BD (bandeja)", PL: "PL (palete)" };

const UNIDADES: TypeUnitOfMeasurementItem[] = [
  "UN",
  "KG",
  "M",
  "M2",
  "M3",
  "MM",
  "CM",
  "IN",
  "MICROMETRO",
  "TONELADA",
  "L",
  "CX",
  "PC",
  "GL",
  "PAR",
];
/** Tabela do TIPO_ITEM do Registro 0200 (Guia Prático EFD-ICMS/IPI). */
const TIPOS_EFD: [string, string][] = [
  ["00", "Mercadoria para revenda"], ["01", "Matéria-prima"], ["02", "Embalagem"], ["03", "Produto em processo"],
  ["04", "Produto acabado"], ["05", "Subproduto"], ["06", "Produto intermediário"], ["07", "Material de uso e consumo"],
  ["08", "Ativo imobilizado"], ["09", "Serviços"], ["10", "Outros insumos"], ["99", "Outras"],
];
const ROTEIROS: { value: FormItem["receiptRouting"]; label: string; hint: string }[] = [
  { value: "PADRAO", label: "Padrão", hint: "Segue a rota de inspeção, se houver uma ativa." },
  { value: "DIRETO", label: "Direto", hint: "Vai direto ao estoque, sem inspeção." },
  { value: "INSPECAO", label: "Inspeção obrigatória", hint: "Sem rota de inspeção ativa o recebimento é recusado." },
];
/** Rótulo em português ⇄ valor aceito pelo backend. */
const TIPOS_ITEM: { value: TypeItem; label: string; hint: string }[] = [
  { value: "FABRICADO", label: "Fabricado", hint: "Gera ordem de fabricação — exige estrutura (BOM) e roteiro" },
  { value: "COMPRADO", label: "Comprado", hint: "Gera ordem de compra — exige fornecedor preferencial" },
  { value: "DE_TERCEIRO", label: "De terceiro", hint: "Item de terceiro em poder da empresa — não gera ordem" },
  { value: "SERVICO", label: "Serviço", hint: "Serviço comercial/fiscal — não gera ordem de material" },
];
const TIPOS_STRUCT: { value: TypeStructItem; label: string; hint: string }[] = [
  { value: "INDUSTRIAL", label: "Industrial", hint: "O MRP gera ordem e controla estoque" },
  { value: "COMERCIAL", label: "Comercial", hint: "Item pronto para venda" },
];
const TIPOS_PLAN: { value: TypePlanejamento; label: string; hint: string }[] = [
  { value: "NORMAL_MRP", label: "MRP normal", hint: "Planejado pelo MRP a partir da demanda" },
  { value: "PROJETO", label: "Projeto", hint: "Planejado por projeto, fora do MRP regular" },
];
/** Rótulo da aba Suprimentos ⇄ `TypeOfUseItem` do backend. */
const TIPO_UTILIZACAO_WIRE: Record<TypeTipoUtilizacao, string> = {
  "Industrialização": "INDUSTRIALIZACAO",
  "Consumo": "CONSUMO",
  "Imobilizado": "IMOBILIZADO",
};
/**
 * Marcadores de natureza. Combináveis: marcar "Item Base" e "Configurado"
 * juntos é legítimo e comum em produto paramétrico.
 */
const MARCADORES: { field: MarcadorField; label: string; hint: string }[] = [
  { field: "isBase",        label: "Item Base",       hint: "Serve de modelo para criar outros itens (grupos, modificadores e atributos do PDM só aceitam itens marcados aqui)" },
  { field: "isConfigured",  label: "Configurado",     hint: "Tem variações — cor, medida — resolvidas pelo configurador de produto" },
  { field: "isGeneric",     label: "Genérico",        hint: "Agrupa materiais não estocáveis sob um único código, como material de expediente" },
  { field: "isPrototype",   label: "Protótipo",       hint: "Item em desenvolvimento: o MRP não planeja, o controle é manual" },
  { field: "isTool",        label: "Ferramenta",      hint: "Vincule a ficha de vida útil em VPRO1000" },
  { field: "isProcessItem", label: "Item de Processo", hint: "Item de processo em terceiros, criado a partir de operações externas" },
  { field: "isScrap",       label: "Sucata / retalho", hint: "Nasce do processo: fica fora do MRP e entra na EFD como subproduto" },
];
type MarcadorField = "isBase" | "isConfigured" | "isGeneric" | "isPrototype" | "isTool" | "isProcessItem" | "isScrap";

/**
 * `nature` é o resumo que o backend antigo ainda espera. Genérico e configurado
 * têm código próprio; o resto cai em item base (2), que é o padrão.
 */
/**
 * Natureza a partir dos marcadores. Sem marcador o item é **Genérico**: antes
 * ele caía em "Item Base", e como o formulário ainda nascia com "Item Base"
 * marcado, todo item cadastrado — chapa, bucha, lateral — virava modelo e
 * passava a aparecer na busca de itens-base.
 */
function natureDosMarcadores(f: Pick<FormItem, MarcadorField>): ItemNature {
  if (f.isGeneric) return 0 as ItemNature;
  if (f.isConfigured) return 1 as ItemNature;
  if (f.isBase) return 2 as ItemNature;
  return 0 as ItemNature;
}
/**
 * Origem da mercadoria — tabela A do CST do ICMS, códigos 0 a 8. A tela só
 * oferecia 0–2: um item de origem 3 a 8 abria com o campo em branco e não havia
 * como corrigi-lo por aqui.
 */
const ORIGENS: OrigemItem[] = [
  "0 - Nacional",
  "1 - Estrangeira (Importação Direta)",
  "2 - Estrangeira (Adquirida no Mercado Interno)",
  "3 - Nacional, conteúdo de importação > 40% e ≤ 70%",
  "4 - Nacional, produção conforme PPB",
  "5 - Nacional, conteúdo de importação ≤ 40%",
  "6 - Estrangeira (Importação Direta), sem similar nacional (CAMEX)",
  "7 - Estrangeira (Mercado Interno), sem similar nacional (CAMEX)",
  "8 - Nacional, conteúdo de importação > 70%",
];

const ABAS: { id: AbaAtiva; label: string }[] = [
  { id: "capa", label: "Capa" },
  { id: "estoque", label: "Estoque e compras" },
  { id: "engenharia", label: "Engenharia" },
  { id: "planejamento", label: "Planejamento" },
  { id: "comercial", label: "Comercial" },
  { id: "contabil", label: "Contábil" },
];
const ABA_PRONTIDAO: { id: AbaAtiva; label: string } = { id: "prontidao", label: "Prontidão" };

/** Dígito verificador GS1: o mesmo cálculo do backend, para avisar ao digitar. */
function gtinValido(gtin: string): boolean {
  if (![8, 12, 13, 14].includes(gtin.length) || !/^\d+$/.test(gtin)) return false;
  let soma = 0;
  for (let i = gtin.length - 2, peso = 3; i >= 0; i--, peso = peso === 3 ? 1 : 3) soma += Number(gtin[i]) * peso;
  return (10 - (soma % 10)) % 10 === Number(gtin[gtin.length - 1]);
}

/**
 * Ponto de pedido por dia trabalhado: consumo por dia em que a empresa trabalha
 * × dias que ela vai trabalhar no prazo de reposição + estoque de segurança. A
 * reposição faz a conta com o calendário industrial (sábado trabalhado conta,
 * feriado não) e, sem consumo informado, apura o consumo dos últimos 90 dias.
 * CR vai 1 para o formato continuar legível por quem lê TR × CM ÷ CR + ES.
 */
function montarPontoDePedido(f: FormItem): { TR: number; CM: number; CR: number; ES: number; modo: string } | null {
  if (!f.usaPontoDePedido) return null;
  const TR = Number(f.tempoReposicao) || Number(f.purchaseLeadTimeDays) || Number(f.manufacturingLeadTimeDays) || 0;
  if (TR <= 0) return null;
  return { TR, CM: Number(f.consumoMedio) || 0, CR: 1, ES: Number(f.estoqueSeguranca) || 0, modo: "DIA_TRABALHADO" };
}

/** Estimativa de segunda a sexta, para a tela: a reposição usa o calendário. */
function calcularPontoDePedido(f: FormItem): number | null {
  const p = montarPontoDePedido(f);
  return p && p.CM > 0 ? Math.ceil(p.TR * p.CM + p.ES) : null;
}

const formInicial: FormItem = {
  code: "",
  name: "",
  description: "",
  complement: "",
  nature: 0,
  isBase: false,
  isConfigured: false,
  isGeneric: false,
  isPrototype: false,
  isTool: false,
  isProcessItem: false,
  isScrap: false,
  revision: "",
  previousCode: "",
  manufacturerName: "",
  manufacturerPartNumber: "",
  longDescription: "",
  descriptionEn: "",
  pdmAttrs: {},
  groupID: "",
  modifierID: "",
  situation: "LINHA",
  health: "ATIVO",
  observations: "",
  warehouseID: "",
  unitOfMeasurement: "UN",
  automaticLow: false,
  cyclicalCount: false,
  cyclicalCountDays: 0,
  cyclicalCountMinStock: 0,
  fractional: true,
  secondaryUom: "",
  secondaryFactor: "",
  maximumStock: "",
  controlsLot: false,
  controlsAddress: false,
  controlsSerial: false,
  lotIssueRule: "FEFO",
  shelfLifeDays: "",
  minRemainingLifeDays: "",
  storageConditions: "",
  hazardous: false,
  unNumber: "",
  hazardClass: "",
  itemBaseCod: "",
  grossWeight: "",
  netWeight: "",
  cubicVolume: "",
  type: "COMPRADO",
  typeStruct: "INDUSTRIAL",
  oem: false,
  dimLength: "",
  dimWidth: "",
  dimHeight: "",
  requiresDrawing: false,
  cuttingGrain: "NONE",
  cuttingNoRotation: false,
  typePlanejamento: "NORMAL_MRP",
  llc: "2",
  lotMaximo: "",
  lotMinimo: "",
  lotMultiplo: "",
  estoqueSeguranca: "",
  tempoSeguranca: "",
  tempoReposicao: "",
  consumoMedio: "",
  cobertura: "",
  usaPontoDePedido: false,
  curvaAbc: "",
  tanque: "",
  purchaseLeadTimeDays: "",
  manufacturingLeadTimeDays: "",
  materialIssueTiming: "PRODUCTION",
  productionReportingType: "OPERATION",
  critico: false,
  exclusivo: false,
  ativoPlanejamento: true,
  fantasma: false,
  obsPlanjamento: "",
  descrComercial: "",
  almoxTransf: "",
  alterarDescrFat: false,
  emiteEtiquetas: false,
  montagemVolExp: false,
  embalagDif: false,
  retencaoPisCofins: false,
  tipoVenda: "Venda",
  multiploVenda: "",
  minVenda: "",
  embalagem: false,
  tempoGarantia: "",
  almoxAssTec: "",
  entregaEstimada: "",
  mobileEnabled: false,
  embExportacao: false,
  obsComercial: "",
  exclusiveCustomer: "",
  volumesPerUnit: "",
  classifFiscVenda: "",
  classifFiscCompra: "",
  umVenda: "",
  origem: "",
  cest: "",
  obsContabil: "",
  gtin: "",
  gtinTax: "",
  efdItemType: "",
  taxUnit: "",
  taxUnitFactor: "",
  exTipi: "",
  relevantScale: "",
  manufacturerCnpj: "",
  fciNumber: "",
  umSuprimentos: "UN",
  almoxSuprimentos: "",
  checklistRecebimento: false,
  controlaSafra: false,
  receiptRouting: "PADRAO",
  requiresCertificate: false,
  overTolerance: "",
  underTolerance: "",
  tipoUtilizacao: "Industrialização",
  obsSuprimentos: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Vent0200Page(): JSX.Element {
  const [form, setForm] = useState<FormItem>(formInicial);
  const [aba, setAba] = useState<AbaAtiva>("capa");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<
    { type: "success" | "error" | "warn"; message: string } | null
  >(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormItem, string>>>(
    {},
  );
  /**
   * As mensagens de obrigatório só aparecem depois da primeira tentativa de
   * salvar. Antes disso o formulário fica limpo — reclamar de campo vazio para
   * quem acabou de abrir a tela não ajuda ninguém.
   */
  const [submitTentado, setSubmitTentado] = useState(false);
  // Código do item aberto para alteração. Vazio = a tela está criando um item
  // novo; preenchido = está mantendo um já cadastrado.
  const [itemEmEdicao, setItemEmEdicao] = useState("");
  /**
   * Impacto de inativar: as montagens que consomem este item.
   *
   * Inativar é uma decisão de cadastro com consequência em produção. Sem esta
   * lista, o estrago só aparece no MRP da semana seguinte — como falta de
   * componente numa ordem que ninguém relaciona com a decisão tomada aqui.
   * `null` = ainda não consultado; `[]` = consultado e não é usado em lugar
   * nenhum, que é uma resposta tão útil quanto a lista cheia.
   */
  const [ondeUsado, setOndeUsado] = useState<WhereUsedRow[] | null>(null);
  const [conferindoUso, setConferindoUso] = useState(false);
  const [carregandoItem, setCarregandoItem] = useState(false);
  const [modeloPDM, setModeloPDM] = useState<ModeloPDM | null>(null);
  const [previaPDM, setPreviaPDM] = useState<PreviaPDM | null>(null);
  const [prontidao, setProntidao] = useState<Prontidao[]>([]);
  const [previaFiscal, setPreviaFiscal] = useState<PreviaFiscal | null>(null);
  // Responsáveis vêm do grupo do PDM (setor de planejamento e de compras).
  const [responsaveis, setResponsaveis] = useState<Responsaveis | null>(null);
  useEffect(() => {
    const grupo = Number(form.groupID);
    if (!grupo) { setResponsaveis(null); return; }
    let vivo = true;
    void responsaveisDoGrupo(grupo).then((r) => { if (vivo) setResponsaveis(r); }).catch(() => { if (vivo) setResponsaveis(null); });
    return () => { vivo = false; };
  }, [form.groupID]);
  // Impostos pelo MESMO motor da nota (simulação): a classificação fiscal guarda
  // alíquotas que o cálculo não usa, e a prévia mostrava PIS/COFINS 0%.
  const [impostosDaNota, setImpostosDaNota] = useState<{ dentro?: SimulacaoResultado; fora?: SimulacaoResultado; erro?: string } | null>(null);
  /** Consequências da alteração, à espera da confirmação de quem salva. */
  const [impactos, setImpactos] = useState<ImpactoAlteracao[] | null>(null);
  /** Só grava o perfil de série quando muda: ele guarda também a garantia. */
  const [serieGravada, setSerieGravada] = useState(false);
  const [embalagens, setEmbalagens] = useState<EmbalagemItem[]>([]);
  const [revisoes, setRevisoes] = useState<RevisaoItem[]>([]);
  const [novaRevisao, setNovaRevisao] = useState({ revision: "", valid_from: "", reason: "" });
  const [saldo, setSaldo] = useState<SaldoDuasUnidades | null>(null);
  const [atributosLivres, setAtributosLivres] = useState<AtributoLivre[]>([]);
  const [nomesLivres, setNomesLivres] = useState<string[]>([]);

  useEffect(() => {
    let vivo = true;
    setEmbalagens([]); setRevisoes([]); setSaldo(null); setAtributosLivres([]);
    if (!itemEmEdicao) return;
    void Promise.all([embalagensDoItem(itemEmEdicao), revisoesDoItem(itemEmEdicao), saldoDuasUnidades(itemEmEdicao), atributosLivresDoItem(itemEmEdicao), nomesDeAtributosLivres()])
      .then(([e, r, s, a, n]) => { if (vivo) { setEmbalagens(e); setRevisoes(r); setSaldo(s); setAtributosLivres(a); setNomesLivres(n); } })
      .catch((err) => { if (vivo) setFeedback({ type: "error", message: errMessage(err, "Não foi possível ler as embalagens e revisões do item.") }); });
    return () => { vivo = false; };
  }, [itemEmEdicao]);

  const gravarEmbalagens = async () => {
    try {
      setEmbalagens(await salvarEmbalagensDoItem(itemEmEdicao, embalagens));
      setFeedback({ type: "success", message: "Embalagens gravadas." });
    } catch (err) { setFeedback({ type: "error", message: errMessage(err, "Não foi possível gravar as embalagens.") }); }
  };
  const gravarAtributosLivres = async () => {
    try {
      setAtributosLivres(await salvarAtributosLivres(itemEmEdicao, atributosLivres));
      setNomesLivres(await nomesDeAtributosLivres());
      invalidarListas();
      setFeedback({ type: "success", message: "Atributos livres gravados." });
    } catch (err) { setFeedback({ type: "error", message: errMessage(err, "Não foi possível gravar os atributos livres.") }); }
  };
  const gravarRevisao = async () => {
    try {
      setRevisoes(await criarRevisaoDoItem(itemEmEdicao, novaRevisao));
      setNovaRevisao({ revision: "", valid_from: "", reason: "" });
      const item = await getItemTemplate(itemEmEdicao);
      setField("revision", parseStr(item, "revision"));
      setFeedback({ type: "success", message: "Revisão gravada." });
    } catch (err) { setFeedback({ type: "error", message: errMessage(err, "Não foi possível gravar a revisão.") }); }
  };

  const abas = itemEmEdicao ? [...ABAS, ABA_PRONTIDAO] : ABAS;
  const modeloAtivo = useMemo(() => (modeloPDM?.attributes ?? []).filter((a) => a.is_active), [modeloPDM]);
  const temPadraoPDM = modeloAtivo.length > 0;

  /** Só os modificadores do grupo; grupo sem vínculo aceita todos. */
  const modificadoresDoGrupoLoader = useCallback(async () => {
    const todos = await loadPdmModifiers();
    if (!form.groupID) return todos;
    const vinculados = await modificadoresDoGrupo(Number(form.groupID));
    return vinculados.length === 0 ? todos : todos.filter((o) => vinculados.includes(Number(o.code)));
  }, [form.groupID]);

  useEffect(() => {
    let vivo = true;
    setModeloPDM(null);
    setPreviaPDM(null);
    if (!form.groupID || !form.modifierID) return;
    obterModeloPDM(Number(form.groupID), Number(form.modifierID))
      .then((m) => { if (vivo) setModeloPDM(m); })
      .catch(() => { /* O backend confere o padrão ao salvar. */ });
    return () => { vivo = false; };
  }, [form.groupID, form.modifierID]);

  useEffect(() => {
    if (!temPadraoPDM) return;
    let vivo = true;
    const t = setTimeout(() => {
      previaDaDescricaoPDM({
        group_code: Number(form.groupID), modifier_id: Number(form.modifierID), exclude: itemEmEdicao,
        attributes: Object.entries(form.pdmAttrs).filter(([, v]) => v.trim()).map(([name, value]) => ({ name, value })),
      }).then((p) => { if (vivo) setPreviaPDM(p); }).catch(() => { if (vivo) setPreviaPDM(null); });
    }, 350);
    return () => { vivo = false; clearTimeout(t); };
  }, [temPadraoPDM, form.pdmAttrs, form.groupID, form.modifierID, itemEmEdicao]);

  useEffect(() => {
    if (aba !== "prontidao" || !itemEmEdicao) return;
    let vivo = true;
    void Promise.all([prontidaoDoItem(itemEmEdicao), previaFiscalDoItem(itemEmEdicao)])
      .then(([p, f]) => { if (vivo) { setProntidao(p); setPreviaFiscal(f); } })
      .catch((err) => { if (vivo) setFeedback({ type: "error", message: errMessage(err, "Não foi possível conferir a prontidão do item.") }); });
    // Venda a empresa (contribuinte, industrialização) dentro e fora do estado.
    const simular = (uf: string) => impostosDoItem(itemEmEdicao, uf);
    setImpostosDaNota(null);
    void (async () => {
      try {
        const sp = await simular("SP");
        const ufEmpresa = sp.uf_origem;
        const dentro = ufEmpresa && ufEmpresa !== "SP" ? await simular(ufEmpresa) : sp;
        const fora = ufEmpresa === "SP" ? await simular("RJ") : sp;
        if (vivo) setImpostosDaNota({ dentro, fora });
      } catch (err) {
        if (vivo) setImpostosDaNota({ erro: errMessage(err, "Não foi possível simular os impostos.") });
      }
    })();
    return () => { vivo = false; };
  }, [aba, itemEmEdicao]);
  const [classificacoesFiscais, setClassificacoesFiscais] = useState<FiscalClassification[]>([]);
  // Fase 4: itens parecidos com o nome digitado (só no cadastro novo), para
  // não duplicar o mesmo item com outra grafia.
  const [parecidos, setParecidos] = useState<Candidato[]>([]);
  useEffect(() => {
    const nome = form.name.trim();
    if (itemEmEdicao || nome.length < 5) { setParecidos([]); return; }
    let ativo = true;
    const t = setTimeout(() => {
      itensParecidos(nome).then((c) => { if (ativo) setParecidos(c); }).catch(() => { if (ativo) setParecidos([]); });
    }, 600);
    return () => { ativo = false; clearTimeout(t); };
  }, [form.name, itemEmEdicao]);

  useEffect(() => {
    let active = true;
    void listFiscalClassifications(false)
      .then((rows) => { if (active) setClassificacoesFiscais(rows); })
      .catch(() => { /* O backend validará o código digitado mesmo se a lista estiver indisponível. */ });
    return () => { active = false; };
  }, []);

  const fiscalVenda = classificacoesFiscais.find((c) => String(c.code) === form.classifFiscVenda.trim());
  const fiscalCompra = classificacoesFiscais.find((c) => String(c.code) === form.classifFiscCompra.trim());

  const setField = useCallback(
    <K extends keyof FormItem>(key: K, value: FormItem[K]) => {
      setForm((p) => ({ ...p, [key]: value }));
      setErrors((p) => ({ ...p, [key]: undefined }));
      setFeedback(null);
    },
    [],
  );

  /**
   * Consulta onde o item é usado assim que alguém marca Inativo num item já
   * gravado. Item novo não tem histórico, então não há o que conferir; falha de
   * consulta não trava o cadastro — o aviso é uma ajuda, não uma trava.
   */
  useEffect(() => {
    let vivo = true;
    if (form.health !== "INATIVO" || !itemEmEdicao) { setOndeUsado(null); return; }
    setConferindoUso(true);
    void listWhereUsed(itemEmEdicao)
      .then((linhas) => { if (vivo) setOndeUsado(linhas); })
      .catch(() => { if (vivo) setOndeUsado(null); })
      .finally(() => { if (vivo) setConferindoUso(false); });
    return () => { vivo = false; };
  }, [form.health, itemEmEdicao]);

  /** Genérico não convive com Base e Configurado: a natureza do item é uma só. */
  const marcar = (campo: MarcadorField, valor: boolean) => {
    setField(campo, valor);
    if (!valor) return;
    if (campo === "isGeneric") { setField("isBase", false); setField("isConfigured", false); }
    if (campo === "isBase" || campo === "isConfigured") setField("isGeneric", false);
  };
  /**
   * Por que uma marcação não pode ser ligada junto com as outras. As mesmas
   * regras o backend confere ao gravar (conferirMarcadores, controle de lote e
   * perfil de série).
   */
  const bloqueio = (campo: string): string | undefined => {
    const f = form;
    const semEstoque = f.type === "SERVICO" ? "Serviço não tem estoque" : f.fantasma ? "Fantasma não tem estoque" : "";
    const naturezaDeSucata = [f.isBase && "item base", f.isConfigured && "configurado", f.isPrototype && "protótipo", f.isTool && "ferramenta", f.isProcessItem && "item de processo"].filter(Boolean).join(", ");
    switch (campo) {
      case "isScrap": return naturezaDeSucata ? `sucata/retalho nasce do processo e não pode ser também ${naturezaDeSucata}` : undefined;
      case "isBase": case "isConfigured": case "isTool":
        if (f.isScrap) return "sucata/retalho não combina com esta marcação";
        if (f.isProcessItem) return "item de processo representa uma operação em terceiros";
        return undefined;
      case "isPrototype": return f.isScrap ? "sucata/retalho não combina com protótipo" : undefined;
      case "isProcessItem":
        if (f.isScrap) return "sucata/retalho não combina com item de processo";
        return f.isBase || f.isConfigured || f.isTool ? "item de processo não pode ser item base, configurado nem ferramenta" : undefined;
      case "fantasma":
        if (f.type !== "FABRICADO") return "fantasma é um conjunto fabricado: mude o tipo do item para Fabricado";
        if (f.critico) return "fantasma não tem estoque: desmarque Crítico";
        if (f.cyclicalCount || f.controlsLot || f.controlsAddress || f.controlsSerial) return "fantasma não tem estoque: desmarque contagem cíclica, lote, endereço e série";
        return undefined;
      case "critico": return f.fantasma ? "fantasma não tem estoque, o alerta de falta nunca dispararia" : undefined;
      case "cyclicalCount": case "controlsLot": case "controlsAddress":
        return semEstoque ? `${semEstoque} para contar, lotear ou endereçar` : undefined;
      case "controlsSerial":
        return semEstoque ? `${semEstoque} para numerar` : undefined;
      case "fractional": return f.controlsSerial ? "item com número de série é contado por unidade" : undefined;
      case "hazardous": return f.type === "SERVICO" ? "serviço não é produto perigoso: o risco é do material" : undefined;
      case "automaticLow": return semEstoque ? `${semEstoque} para baixar` : undefined;
      case "requiresDrawing": return f.type !== "FABRICADO" ? "só item fabricado tem OF para exigir desenho" : undefined;
      case "embExportacao": return f.embalagDif ? "já marcada como embalagem diferenciada: o romaneio destaca uma só" : undefined;
      case "embalagDif": return f.embExportacao ? "já marcada como embalagem de exportação: o romaneio destaca uma só" : undefined;
      default: return undefined;
    }
  };
  const setAtributo = (nome: string, valor: string) => setForm((p) => ({ ...p, pdmAttrs: { ...p.pdmAttrs, [nome]: valor } }));
  const erroDe = (campo: keyof FormItem) => (submitTentado ? errors[campo] : undefined);

  /** Campos obrigatórios, com o rótulo e a aba onde cada um mora. */
  function coletarErros(): Partial<Record<keyof FormItem, string>> {
    const e: Partial<Record<keyof FormItem, string>> = {};
    const itemCode = form.code.trim();
    if (itemCode.length > 60) e.code = "Código deve ter no máximo 60 caracteres.";
    else if (itemCode && !/^[A-Za-z0-9._/-]+$/.test(itemCode))
      e.code = "Use apenas letras, números, hífen, ponto, barra ou sublinhado.";
    if (!form.name.trim()) e.name = "Nome obrigatório.";
    if (!form.groupID.trim()) e.groupID = "Grupo PDM obrigatório — cadastre em VITE0114 se ainda não existir.";
    if (!form.modifierID.trim()) e.modifierID = "Modificador PDM obrigatório — cadastre em VITE0115 se ainda não existir.";
    // Weight.IsValid(): bruto não pode ser menor que líquido.
    const bruto = Number(form.grossWeight || 0);
    const liquido = Number(form.netWeight || 0);
    if (liquido < 0) e.netWeight = "Peso líquido não pode ser negativo.";
    else if (bruto < liquido) e.grossWeight = "Peso bruto não pode ser menor que o líquido.";
    if (form.multiploVenda.trim() && Number(form.multiploVenda) <= 0)
      e.multiploVenda = "Múltiplo de venda deve ser maior que zero.";
    if (form.minVenda.trim() && Number(form.minVenda) < 0)
      e.minVenda = "Mínimo de venda não pode ser negativo.";
    if (form.entregaEstimada.trim() && Number(form.entregaEstimada) < 0)
      e.entregaEstimada = "Prazo de entrega não pode ser negativo.";
    if (form.tempoGarantia.trim() && Number(form.tempoGarantia) < 0)
      e.tempoGarantia = "Garantia não pode ser negativa.";
    if (form.cest.trim() && !/^\d{7}$/.test(form.cest.trim()))
      e.cest = "CEST deve conter exatamente 7 dígitos.";
    if (form.gtin && !gtinValido(form.gtin)) e.gtin = "GTIN inválido: confira os dígitos e o verificador.";
    if (form.gtinTax && !gtinValido(form.gtinTax)) e.gtinTax = "GTIN inválido: confira os dígitos e o verificador.";
    if (form.taxUnit.trim() && !(Number(form.taxUnitFactor) > 0)) e.taxUnitFactor = "Informe quantas unidades tributáveis há em uma comercial.";
    if (form.taxUnitFactor.trim() && !form.taxUnit.trim()) e.taxUnit = "Informe a unidade tributável do fator.";
    if (form.shelfLifeDays.trim() && Number(form.shelfLifeDays) <= 0) e.shelfLifeDays = "A validade deve ser maior que zero.";
    if (form.minRemainingLifeDays.trim() && form.shelfLifeDays.trim() && Number(form.minRemainingLifeDays) > Number(form.shelfLifeDays))
      e.minRemainingLifeDays = "Não pode passar da validade do item.";
    if (form.hazardous && !/^\d{4}$/.test(form.unNumber.trim())) e.unNumber = "Produto perigoso exige o número ONU, com 4 dígitos.";
    if (form.lotMaximo.trim() && Number(form.lotMinimo) > 0 && Number(form.lotMaximo) < Number(form.lotMinimo)) e.lotMaximo = "Não pode ser menor que o lote mínimo.";
    if (form.underTolerance.trim() && (Number(form.underTolerance) < 0 || Number(form.underTolerance) > 100)) e.underTolerance = "Vai de 0 a 100%.";
    if (form.overTolerance.trim() && Number(form.overTolerance) < 0) e.overTolerance = "Não pode ser negativa.";
    if (form.secondaryUom && !(Number(form.secondaryFactor) > 0)) e.secondaryFactor = "Informe o fator da segunda unidade.";
    if (form.exTipi && !/^\d{2,3}$/.test(form.exTipi)) e.exTipi = "O EX TIPI tem 2 ou 3 dígitos.";
    if (form.manufacturerCnpj && form.manufacturerCnpj.length !== 14) e.manufacturerCnpj = "O CNPJ tem 14 dígitos.";
    if (form.fciNumber.trim() && form.fciNumber.trim().length !== 36) e.fciNumber = "A FCI tem 36 caracteres.";
    if (form.hazardous && !form.storageConditions.trim()) e.storageConditions = "Produto perigoso exige as condições de armazenagem.";
    if (form.cyclicalCount && !(Number(form.cyclicalCountDays) > 0)) e.cyclicalCountDays = "Informe de quantos em quantos dias contar.";
    if (Number(form.minVenda) > 0 && Number(form.multiploVenda) > 0 && Math.abs(Number(form.minVenda) / Number(form.multiploVenda) - Math.round(Number(form.minVenda) / Number(form.multiploVenda))) > 1e-9)
      e.minVenda = "O mínimo de venda precisa ser múltiplo do múltiplo de venda.";
    if (form.embalagem && form.efdItemType && form.efdItemType !== "02") e.efdItemType = "Item que é embalagem é do tipo 02 na EFD.";
    if (form.tipoVenda === "Revenda" && form.type !== "COMPRADO") e.tipoVenda = "Revenda é item comprado pronto: mude o tipo para Comprado ou a venda para Venda.";
    return e;
  }

  /** Rótulo amigável + aba de cada campo obrigatório, para a mensagem de erro. */
  const CAMPO_INFO: Partial<Record<keyof FormItem, { label: string; aba: AbaAtiva }>> = {
    code: { label: "Código", aba: "capa" },
    name: { label: "Nome", aba: "capa" },
    groupID: { label: "Grupo PDM", aba: "capa" },
    modifierID: { label: "Modificador PDM", aba: "capa" },
    itemBaseCod: { label: "Item-base", aba: "engenharia" },
    grossWeight: { label: "Peso bruto", aba: "engenharia" },
    netWeight: { label: "Peso líquido", aba: "engenharia" },
    multiploVenda: { label: "Múltiplo de venda", aba: "comercial" },
    minVenda: { label: "Mínimo de venda", aba: "comercial" },
    entregaEstimada: { label: "Entrega estimada", aba: "comercial" },
    tempoGarantia: { label: "Tempo de garantia", aba: "comercial" },
    cest: { label: "CEST", aba: "contabil" },
    gtin: { label: "GTIN comercial", aba: "contabil" },
    gtinTax: { label: "GTIN tributável", aba: "contabil" },
    taxUnit: { label: "Unidade tributável", aba: "contabil" },
    taxUnitFactor: { label: "Fator tributável", aba: "contabil" },
    shelfLifeDays: { label: "Validade", aba: "estoque" },
    minRemainingLifeDays: { label: "Vida útil mínima", aba: "estoque" },
    unNumber: { label: "Número ONU", aba: "estoque" },
    lotMaximo: { label: "Lote máximo", aba: "planejamento" },
    underTolerance: { label: "Tolerância de falta", aba: "estoque" },
    overTolerance: { label: "Tolerância de excesso", aba: "estoque" },
    secondaryFactor: { label: "Fator da segunda unidade", aba: "estoque" },
    exTipi: { label: "EX TIPI", aba: "contabil" },
    manufacturerCnpj: { label: "CNPJ do fabricante", aba: "contabil" },
    fciNumber: { label: "Número da FCI", aba: "contabil" },
    storageConditions: { label: "Condições de armazenagem", aba: "estoque" },
    cyclicalCountDays: { label: "Contar a cada", aba: "estoque" },
    efdItemType: { label: "Tipo do item na EFD", aba: "contabil" },
    tipoVenda: { label: "Tipo de venda", aba: "comercial" },
  };

  async function handleSalvar() {
    setSubmitTentado(true);
    const e = coletarErros();
    setErrors(e);
    const faltando = Object.keys(e) as (keyof FormItem)[];
    if (faltando.length > 0) {
      const primeiro = CAMPO_INFO[faltando[0]];
      setAba(primeiro?.aba ?? "capa");
      setFeedback({
        type: "error",
        // O motivo vai junto: "Verifique: Código." não dizia o que estava errado.
        message: `Verifique ${faltando
          .map((k) => `${CAMPO_INFO[k]?.label ?? k}: ${String(e[k] ?? "").replace(/\.$/, "")}`)
          .join("; ")}.`,
      });
      return;
    }

    if (itemEmEdicao) {
      // A alteração passa pela conferência de impacto antes de gravar. Falha na
      // consulta não trava: o backend confere de novo no salvar.
      setIsSaving(true);
      try {
        const alteracao = montarPayload();
        delete alteracao.code;
        const achados = await impactoDaAlteracao(itemEmEdicao, alteracao);
        if (achados.length > 0) { setImpactos(achados); return; }
      } catch (err) {
        setFeedback({ type: "error", message: errMessage(err, "Não foi possível conferir o impacto da alteração.") });
        return;
      } finally {
        setIsSaving(false);
      }
    }
    await gravar();
  }

  /** Corpo de criar e de alterar. Na alteração, `null` limpa o campo opcional. */
  function montarPayload(): Obj {
      const parseDecimal = (value: string): number =>
        Number(value.trim().replace(",", "."));
      const bruto = parseDecimal(form.grossWeight || "0");
      const liquido = parseDecimal(form.netWeight || "0");
      const optionalNumber = (value: string): number | undefined => {
        if (!value.trim()) return undefined;
        const parsed = parseDecimal(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      };
      const pontoDePedido = montarPontoDePedido(form);
      // Nos campos novos o null limpa; nos antigos, o texto vazio limpa.
      const texto = (v: string): string | null => v.trim() || null;
      const antigo = (v: string): string | undefined => v.trim() || (itemEmEdicao ? "" : undefined);
      const numero = (v: string): number | null => optionalNumber(v) ?? null;

      return {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        complement: antigo(form.complement),
        long_description: texto(form.longDescription),
        general_notes: texto(form.observations),
        revision: texto(form.revision),
        previous_code: texto(form.previousCode),
        manufacturer_name: texto(form.manufacturerName),
        manufacturer_part_number: texto(form.manufacturerPartNumber),
        is_scrap: form.isScrap,
        description_en: texto(form.descriptionEn),
        nature: natureDosMarcadores(form),
        is_base: form.isBase,
        is_configured: form.isConfigured,
        is_prototype: form.isPrototype,
        is_tool: form.isTool,
        is_process_item: form.isProcessItem,
        situation: form.situation,
        health: form.health,
        pdm: {
          group_code: Number(form.groupID),
          modifier_code: Number(form.modifierID),
          attributes: Object.entries(form.pdmAttrs).filter(([, v]) => v.trim()).map(([name, value]) => ({ name, value })),
          description_technique: form.description.trim() || form.name.trim(),
        },
        warehouse: {
          warehouse_code: Number(form.warehouseID) || 1,
          unit_of_measurement: form.unitOfMeasurement,
          automatic_low: form.automaticLow,
          minimum_stock: Number(form.cyclicalCountMinStock) || 0,
          ...(form.cyclicalCount
            ? { cyclical_count_config: { days_interval: Number(form.cyclicalCountDays) || 0 } }
            : itemEmEdicao ? { cyclical_count_config: null } : {}),
          // Sem lote não há validade: o backend recusa e a tela já a apagou.
          shelf_life_days: form.controlsLot ? numero(form.shelfLifeDays) : null,
          min_remaining_life_days: form.controlsLot ? numero(form.minRemainingLifeDays) : null,
          storage_conditions: texto(form.storageConditions),
          hazardous: form.hazardous,
          un_number: form.hazardous ? texto(form.unNumber) : null,
          hazard_class: form.hazardous ? texto(form.hazardClass) : null,
          accepts_fractional_quantity: form.fractional,
          secondary_uom: texto(form.secondaryUom),
          secondary_factor: numero(form.secondaryFactor),
        },
        engineering: {
          ...(form.itemBaseCod.trim() ? { item_base_cod: form.itemBaseCod.trim() } : {}),
          weight: { gross: bruto, net: liquido, unit: "KG" },
          // O objeto de dimensões só vai completo: o backend recusa medida
          // parcial, e mandar pela metade transformaria um campo opcional em
          // erro de cadastro.
          ...(parseDecimal(form.dimLength) > 0 && parseDecimal(form.dimWidth) > 0 && parseDecimal(form.dimHeight) > 0
            ? { dimensions: { Length: Number(form.dimLength), Width: Number(form.dimWidth), Height: parseDecimal(form.dimHeight) } }
            : {}),
          type: form.type,
          type_struct: form.typeStruct,
          oem: form.oem,
          volume: numero(form.cubicVolume),
          requires_drawing: form.requiresDrawing,
          cutting_grain: form.cuttingGrain,
          cutting_no_rotation: form.cuttingNoRotation,
        },
        // A aba Planejamento coletava lote mínimo, múltiplo, estoque de
        // segurança, crítico, exclusivo e classe ABC — e o payload mandava só
        // três campos. Tudo o mais que o usuário digitava era descartado em
        // silêncio, e o MRP planejava com lote 0.
        planning: {
          type_mrp: form.typePlanejamento,
          llc: Number(form.llc) || 0,
          ghost: form.fantasma,
          minimum_lot: Number(form.lotMinimo) || 0,
          multiple_lot: Number(form.lotMultiplo) || 0,
          safety_stock: Number(form.estoqueSeguranca) || 0,
          critical: form.critico,
          exclusive: form.exclusivo,
          active: form.ativoPlanejamento,
          abc_class: form.curvaAbc.trim() || undefined,
          tank_code: numero(form.tanque),
          reorder_point: pontoDePedido,
          purchase_lead_time_days: numero(form.purchaseLeadTimeDays),
          manufacturing_lead_time_days: numero(form.manufacturingLeadTimeDays),
          notes: texto(form.obsPlanjamento),
          material_issue_timing: form.materialIssueTiming,
          production_reporting_type: form.productionReportingType,
          maximum_stock: numero(form.maximumStock),
          safety_time_days: numero(form.tempoSeguranca),
          maximum_lot: numero(form.lotMaximo),
        },
        supplies: {
          type_of_use: TIPO_UTILIZACAO_WIRE[form.tipoUtilizacao],
          purchase_uom: form.umSuprimentos || undefined,
          warehouse_code: optionalNumber(form.almoxSuprimentos),
          receiving_checklist: form.checklistRecebimento,
          harvest: form.controlaSafra,
          // Havia campo na tela e nenhuma chave no payload: o texto sumia.
          notes: form.obsSuprimentos.trim() || undefined,
          under_delivery_tolerance_pct: numero(form.underTolerance),
          over_delivery_tolerance_pct: numero(form.overTolerance),
          receipt_routing: form.receiptRouting,
          requires_certificate: form.requiresCertificate,
        },
        commercial: {
          description: antigo(form.descrComercial),
          sale_type: form.tipoVenda.toUpperCase(),
          sale_multiple: optionalNumber(form.multiploVenda),
          minimum_sale_quantity: optionalNumber(form.minVenda),
          estimated_delivery_days: optionalNumber(form.entregaEstimada),
          warranty_days: optionalNumber(form.tempoGarantia) ?? 0,
          // Código do almoxarifado (texto, ex.: ALM-PA) — a coluna tem chave
          // estrangeira para warehouse(code). Convertido para número, como era,
          // todo código alfanumérico virava `undefined` e sumia sem erro.
          transfer_warehouse_code: form.almoxTransf.trim() || undefined,
          technical_assistance_warehouse_code: form.almoxAssTec.trim() || undefined,
          allow_billing_description_change: form.alterarDescrFat,
          issue_loading_labels: form.emiteEtiquetas,
          assemble_shipping_volumes: form.montagemVolExp,
          requires_special_packaging: form.embalagDif,
          withhold_pis_cofins: form.retencaoPisCofins,
          is_packaging: form.embalagem,
          mobile_enabled: form.mobileEnabled,
          export_packaging: form.embExportacao,
          notes: antigo(form.obsComercial),
          exclusive_customer_code: numero(form.exclusiveCustomer),
          volumes_per_unit: numero(form.volumesPerUnit),
        },
        accounting: {
          sale_fiscal_classification_code: antigo(form.classifFiscVenda),
          purchase_fiscal_classification_code: antigo(form.classifFiscCompra),
          ...(form.origem ? { origin: Number(form.origem.split(" ", 1)[0]) } : {}),
          sale_unit_of_measurement: form.umVenda || undefined,
          cest: antigo(form.cest),
          notes: antigo(form.obsContabil),
          gtin: texto(form.gtin),
          gtin_tax: texto(form.gtinTax),
          efd_item_type: texto(form.efdItemType),
          tax_unit: texto(form.taxUnit),
          tax_unit_factor: numero(form.taxUnitFactor),
          ex_tipi: texto(form.exTipi),
          relevant_scale: form.relevantScale ? form.relevantScale === "SIM" : null,
          manufacturer_cnpj: texto(form.manufacturerCnpj),
          fci_number: texto(form.fciNumber),
        },
      };
  }

  /**
   * Lote, endereço e série têm regras próprias (não se desliga lote com saldo),
   * então vão pelos endpoints deles, depois do item. Se falharem, o item já está
   * gravado e a mensagem diz exatamente o que ficou de fora.
   */
  async function gravarControles(codigo: string): Promise<string | null> {
    try {
      await salvarControleDoItem(codigo, { controls_lot: form.controlsLot, controls_address: form.controlsAddress, lot_issue_rule: form.lotIssueRule });
      if (form.controlsSerial !== serieGravada) await salvarPerfil(codigo, { controla_serie: form.controlsSerial });
      return null;
    } catch (err) {
      return errMessage(err, "não foi possível gravar o controle de lote, endereço ou série.");
    }
  }

  async function gravar() {
    setIsSaving(true);
    setFeedback(null);
    try {
      const payload = montarPayload();
      if (itemEmEdicao) {
        // Na alteração o código não vai no corpo: ele identifica o item na URL
        // e é justamente o que não pode mudar.
        const alteracao = { ...payload };
        delete alteracao.code;
        // Validade é do lote: ligando o lote, o controle grava antes do item;
        // desligando, o item (já sem validade) grava antes do controle.
        const antes = form.controlsLot ? await gravarControles(itemEmEdicao) : null;
        if (antes) throw new Error(antes);
        const gravado = await updateItem(itemEmEdicao, alteracao);
        const codigoGravado = parseStr(gravado, "code", "Code") || itemEmEdicao;
        const falha = form.controlsLot ? null : await gravarControles(codigoGravado);
        setFeedback(falha ? { type: "error", message: `Item ${codigoGravado} alterado, mas ${falha}` } : { type: "success", message: `Item ${codigoGravado} alterado com sucesso.` });
        setSerieGravada(form.controlsSerial);
        setErrors({});
        setSubmitTentado(false);
        return;
      }

      // Item novo com validade: cria sem ela, liga o lote e grava a validade.
      const warehouse = payload.warehouse as Record<string, unknown>;
      const validade = { shelf_life_days: warehouse.shelf_life_days ?? null, min_remaining_life_days: warehouse.min_remaining_life_days ?? null };
      const temValidade = validade.shelf_life_days !== null || validade.min_remaining_life_days !== null;
      const created = await createItem(temValidade ? { ...payload, warehouse: { ...warehouse, shelf_life_days: null, min_remaining_life_days: null } } : payload);
      const codigoGravado = parseStr(created, "code", "Code") || form.code.trim() || "gerado automaticamente";
      let falha = form.controlsLot || form.controlsAddress || form.controlsSerial ? await gravarControles(codigoGravado) : null;
      if (!falha && temValidade) {
        try { await updateItem(codigoGravado, { warehouse: validade }); }
        catch (err) { falha = errMessage(err, "não foi possível gravar a validade."); }
      }
      setFeedback(falha ? { type: "error", message: `Item ${codigoGravado} gravado, mas ${falha}` } : { type: "success", message: `Item ${codigoGravado} gravado com sucesso.` });
      setForm(formInicial);
      setErrors({});
      setSubmitTentado(false);
      setAba("capa");
    } catch (err) {
      setFeedback({ type: "error", message: errMessage(err, itemEmEdicao ? "Não foi possível alterar o item." : "Não foi possível gravar o item.") });
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Traduz o item que veio da API para os campos do formulário.
   *
   * O mesmo mapeamento serve para duas coisas: copiar as pastas de um item-base
   * ao criar, e abrir um item existente para alterar. Manter os dois caminhos
   * numa função só evita que um deles fique para trás quando um campo novo
   * aparece na API.
   */
  function pastasParaFormulario(base: Obj, atual: FormItem): Partial<FormItem> {
    const pdm = unwrapObject(base["pdm"] ?? base["Pdm"]);
    const warehouse = unwrapObject(base["warehouse"] ?? base["Warehouse"]);
    const engineering = unwrapObject(base["engineering"] ?? base["Engineering"]);
    const weight = unwrapObject(engineering["weight"] ?? engineering["Weight"]);
    const planning = unwrapObject(base["planning"] ?? base["Planning"]);
    const commercial = unwrapObject(base["commercial"] ?? base["Commercial"]);
    const accounting = unwrapObject(base["accounting"] ?? base["Accounting"]);
    const supplies = unwrapObject(base["supplies"] ?? base["Supplies"]);
    const opt = (o: Obj, ...keys: string[]) => parseStr(o, ...keys);
    const numText = (o: Obj, ...keys: string[]) => {
      const value = parseNum(o, ...keys);
      return value === 0 ? "" : String(value);
    };
    const use = opt(supplies, "type_of_use", "TypeOfUse");
    // Campos que a API devolve e a tela não lia de volta. Eles abriam com o
    // valor padrão do formulário e o próximo salvar gravava esse padrão por
    // cima: item de REVENDA virava VENDA, IPI por VALOR virava PERCENTUAL, a
    // UM de compra voltava para a do estoque e o item desativado no
    // planejamento era reativado. O mesmo mapeamento copia o item-base, então
    // esses valores também não passavam do item-base para o item novo.
    const cru = (o: Obj, ...keys: string[]): unknown => {
      for (const k of keys) if (o[k] !== undefined) return o[k];
      return undefined;
    };
    const origemCrua = cru(accounting, "origin", "Origin");
    const origemLida: OrigemItem =
      origemCrua === null || origemCrua === undefined || origemCrua === ""
        ? ""
        : (ORIGENS.find((o) => o.startsWith(`${Number(origemCrua)} -`)) ?? "");
    const ativoCru = cru(planning, "active", "Active");
    const ciclica = unwrapObject(warehouse["cyclical_count_config"] ?? warehouse["CyclicalCountConfig"]);
    const diasCiclica = parseNum(ciclica, "days_interval", "DaysInterval");
    return {
      groupID: String(parseNum(pdm, "group_code", "GroupCode") || atual.groupID),
      modifierID: String(parseNum(pdm, "modifier_code", "ModifierCode") || atual.modifierID),
      warehouseID: String(parseNum(warehouse, "warehouse_code", "WarehouseCode") || atual.warehouseID),
      unitOfMeasurement: (opt(warehouse, "unit_of_measurement", "UnitOfMeasurement") || atual.unitOfMeasurement) as TypeUnitOfMeasurementItem,
      automaticLow: parseBool(warehouse, "automatic_low", "AutomaticLow"),
      fractional: cru(warehouse, "accepts_fractional_quantity") !== false,
      secondaryUom: opt(warehouse, "secondary_uom"),
      secondaryFactor: numText(warehouse, "secondary_factor"),
      shelfLifeDays: numText(warehouse, "shelf_life_days"),
      minRemainingLifeDays: numText(warehouse, "min_remaining_life_days"),
      storageConditions: opt(warehouse, "storage_conditions"),
      hazardous: parseBool(warehouse, "hazardous"),
      unNumber: opt(warehouse, "un_number"),
      hazardClass: opt(warehouse, "hazard_class"),
      cyclicalCountMinStock: parseNum(warehouse, "minimum_stock", "MinimumStock"),
      grossWeight: numText(weight, "gross", "Gross"),
      netWeight: numText(weight, "net", "Net"),
      type: (opt(engineering, "type", "Type") || atual.type) as TypeItem,
      typeStruct: (opt(engineering, "type_struct", "TypeStruct") || atual.typeStruct) as TypeStructItem,
      oem: parseBool(engineering, "oem", "OEM"),
      cubicVolume: numText(engineering, "volume"),
      requiresDrawing: parseBool(engineering, "requires_drawing"),
      cuttingGrain: (["LENGTH", "WIDTH"].includes(opt(engineering, "cutting_grain")) ? opt(engineering, "cutting_grain") : "NONE") as FormItem["cuttingGrain"],
      cuttingNoRotation: parseBool(engineering, "cutting_no_rotation"),
      ...(() => {
        const dim = unwrapObject(engineering["dimensions"] ?? engineering["Dimensions"]);
        return {
          dimLength: numText(dim, "length", "Length"),
          dimWidth: numText(dim, "width", "Width"),
          dimHeight: numText(dim, "height", "Height"),
        };
      })(),
      typePlanejamento: (opt(planning, "type_mrp", "TypeMrp") || atual.typePlanejamento) as TypePlanejamento,
      llc: String(parseNum(planning, "llc", "Llc", "LLC") || atual.llc),
      fantasma: parseBool(planning, "ghost", "Ghost"),
      lotMinimo: numText(planning, "minimum_lot", "MinimumLot"),
      lotMultiplo: numText(planning, "multiple_lot", "MultipleLot"),
      estoqueSeguranca: numText(planning, "safety_stock", "SafetyStock"),
      critico: parseBool(planning, "critical", "Critical"),
      exclusivo: parseBool(planning, "exclusive", "Exclusive"),
      curvaAbc: opt(planning, "abc_class", "ABCClass"),
      tanque: numText(planning, "tank_code", "TankCode"),
      purchaseLeadTimeDays: numText(planning, "purchase_lead_time_days"),
      manufacturingLeadTimeDays: numText(planning, "manufacturing_lead_time_days"),
      obsPlanjamento: opt(planning, "notes"),
      materialIssueTiming: opt(planning, "material_issue_timing") === "REGISTRATION_RELEASE" ? "REGISTRATION_RELEASE" : "PRODUCTION",
      productionReportingType: opt(planning, "production_reporting_type") === "ORDER" ? "ORDER" : "OPERATION",
      maximumStock: numText(planning, "maximum_stock"),
      tempoSeguranca: numText(planning, "safety_time_days"),
      lotMaximo: numText(planning, "maximum_lot"),
      ...(() => {
        const rop = unwrapObject(planning["reorder_point"] ?? planning["ReorderPoint"]);
        const tr = parseNum(rop, "tr", "TR"), cm = parseNum(rop, "cm", "CM"), cr = parseNum(rop, "cr", "CR");
        // O formato antigo guardava o consumo de CR dias: vira consumo por dia.
        const porDia = rop["modo"] === "DIA_TRABALHADO" ? cm : cr > 0 ? cm / cr : 0;
        return {
          usaPontoDePedido: tr > 0,
          tempoReposicao: tr > 0 ? String(tr) : "",
          consumoMedio: porDia > 0 ? String(Number(porDia.toFixed(4))) : "",
          cobertura: "",
        };
      })(),
      almoxSuprimentos: numText(supplies, "warehouse_code", "WarehouseCode"),
      checklistRecebimento: parseBool(supplies, "receiving_checklist", "ReceivingChecklist"),
      controlaSafra: parseBool(supplies, "harvest", "Harvest"),
      underTolerance: numText(supplies, "under_delivery_tolerance_pct"),
      overTolerance: numText(supplies, "over_delivery_tolerance_pct"),
      receiptRouting: (["DIRETO", "INSPECAO"].includes(opt(supplies, "receipt_routing")) ? opt(supplies, "receipt_routing") : "PADRAO") as FormItem["receiptRouting"],
      requiresCertificate: parseBool(supplies, "requires_certificate"),
      exclusiveCustomer: numText(commercial, "exclusive_customer_code"),
      volumesPerUnit: numText(commercial, "volumes_per_unit"),
      descrComercial: opt(commercial, "description", "Description"),
      multiploVenda: numText(commercial, "sale_multiple", "SaleMultiple"),
      minVenda: numText(commercial, "minimum_sale_quantity", "MinimumSaleQuantity"),
      entregaEstimada: numText(commercial, "estimated_delivery_days", "EstimatedDeliveryDays"),
      tempoGarantia: numText(commercial, "warranty_days", "WarrantyDays"),
      almoxTransf: opt(commercial, "transfer_warehouse_code", "TransferWarehouseCode") || numText(commercial, "transfer_warehouse_code"),
      almoxAssTec: opt(commercial, "technical_assistance_warehouse_code", "TechnicalAssistanceWarehouseCode") || numText(commercial, "technical_assistance_warehouse_code"),
      alterarDescrFat: parseBool(commercial, "allow_billing_description_change", "AllowBillingDescriptionChange"),
      emiteEtiquetas: parseBool(commercial, "issue_loading_labels", "IssueLoadingLabels"),
      montagemVolExp: parseBool(commercial, "assemble_shipping_volumes", "AssembleShippingVolumes"),
      embalagDif: parseBool(commercial, "requires_special_packaging", "RequiresSpecialPackaging"),
      retencaoPisCofins: parseBool(commercial, "withhold_pis_cofins", "WithholdPisCofins"),
      embalagem: parseBool(commercial, "is_packaging", "IsPackaging"),
      mobileEnabled: parseBool(commercial, "mobile_enabled", "MobileEnabled"),
      embExportacao: parseBool(commercial, "export_packaging", "ExportPackaging"),
      obsComercial: opt(commercial, "notes", "Notes"),
      classifFiscVenda: opt(accounting, "sale_fiscal_classification_code", "SaleFiscalClassificationCode"),
      classifFiscCompra: opt(accounting, "purchase_fiscal_classification_code", "PurchaseFiscalClassificationCode"),
      umVenda: opt(accounting, "sale_unit_of_measurement", "SaleUnitOfMeasurement"),
      cest: opt(accounting, "cest", "Cest"),
      obsContabil: opt(accounting, "notes", "Notes"),
      efdItemType: opt(accounting, "efd_item_type"),
      taxUnit: opt(accounting, "tax_unit"),
      taxUnitFactor: numText(accounting, "tax_unit_factor"),
      exTipi: opt(accounting, "ex_tipi"),
      relevantScale: (() => { const v = cru(accounting, "relevant_scale"); return v === true ? "SIM" : v === false ? "NAO" : ""; })() as FormItem["relevantScale"],
      manufacturerCnpj: opt(accounting, "manufacturer_cnpj"),
      fciNumber: opt(accounting, "fci_number"),
      umSuprimentos: (opt(supplies, "purchase_uom", "PurchaseUom", "unit_of_measurement") || atual.umSuprimentos) as TypeUnitOfMeasurementItem,
      tipoUtilizacao: use === "CONSUMO" ? "Consumo" : use === "IMOBILIZADO" ? "Imobilizado" : "Industrialização",
      tipoVenda: opt(commercial, "sale_type", "SaleType").toUpperCase() === "REVENDA" ? "Revenda" : "Venda",
      origem: origemLida,
      ativoPlanejamento: ativoCru === undefined ? true : ativoCru === true,
      cyclicalCount: diasCiclica > 0,
      cyclicalCountDays: diasCiclica,
      obsSuprimentos: opt(supplies, "notes", "Notes"),
    };
  }

  async function aplicarItemBase(code: string | undefined) {
    setField("itemBaseCod", code ? String(code) : "");
    if (!code) return;
    try {
      const base = await getItemTemplate(code);
      // GTIN e referências identificam um produto: não passam do modelo para o novo.
      setForm((atual) => ({ ...atual, ...pastasParaFormulario(base, atual), itemBaseCod: String(code) }));
      setFeedback({ type: "success", message: `Configurações do item-base ${code} copiadas. Código, nome e nome técnico do novo item foram mantidos.` });
    } catch (err) {
      setFeedback({ type: "error", message: errMessage(err, "Não foi possível copiar os dados do item-base.") });
    }
  }

  /**
   * Abre um item já cadastrado para alteração.
   *
   * Antes a tela só criava: para corrigir um peso, uma classificação fiscal ou
   * a natureza de um item era preciso mexer no banco. Aqui o cadastro passa a
   * ter os dois lados — incluir e manter.
   */
  async function abrirItem(code: string | undefined) {
    if (!code) return;
    setCarregandoItem(true);
    setFeedback(null);
    try {
      const item = await getItemTemplate(String(code));
      const pdm = unwrapObject(item["pdm"] ?? item["Pdm"]);
      const situacao = parseStr(item, "situation", "Situation");
      const saude = parseStr(item, "health", "Health");
      const [controle, perfil] = await Promise.all([getControleDoItem(String(code)), obterPerfil(String(code)).catch(() => null)]);
      const controles = {
        controlsLot: controle.controls_lot, controlsAddress: controle.controls_address,
        lotIssueRule: controle.lot_issue_rule, controlsSerial: Boolean(perfil?.controla_serie),
      };
      setForm((atual) => ({
        ...atual,
        ...pastasParaFormulario(item, atual),
        code: parseStr(item, "code", "Code", "business_code", "BusinessCode") || String(code),
        name: parseStr(item, "name", "Name"),
        description: parseStr(pdm, "description_technique", "DescriptionTechnique"),
        complement: parseStr(item, "complement", "Complement"),
        // Marcadores combináveis: a natureza legada só entra se o backend ainda
        // não devolver os marcadores.
        isBase: parseBool(item, "is_base", "IsBase") || parseNum(item, "nature", "Nature") === 2,
        isConfigured: parseBool(item, "is_configured", "IsConfigured") || parseNum(item, "nature", "Nature") === 1,
        // Item sem marcador tem natureza 0: isso não é o mesmo que marcá-lo genérico.
        isGeneric: parseNum(item, "nature", "Nature") === 0 && !parseBool(item, "is_base", "IsBase") && !parseBool(item, "is_configured", "IsConfigured") && !parseBool(item, "is_prototype", "IsPrototype") && !parseBool(item, "is_tool", "IsTool") && !parseBool(item, "is_process_item", "IsProcessItem") && !parseBool(item, "is_scrap"),
        isPrototype: parseBool(item, "is_prototype", "IsPrototype"),
        isTool: parseBool(item, "is_tool", "IsTool"),
        isProcessItem: parseBool(item, "is_process_item", "IsProcessItem"),
        isScrap: parseBool(item, "is_scrap"),
        situation: (situacao || atual.situation) as TypeSituationItem,
        health: (saude || atual.health) as Health,
        itemBaseCod: parseStr(unwrapObject(item["engineering"] ?? item["Engineering"]), "item_base_cod", "ItemBaseCod"),
        longDescription: parseStr(item, "long_description"),
        descriptionEn: parseStr(item, "description_en"),
        observations: parseStr(item, "general_notes"),
        revision: parseStr(item, "revision"),
        previousCode: parseStr(item, "previous_code"),
        manufacturerName: parseStr(item, "manufacturer_name"),
        manufacturerPartNumber: parseStr(item, "manufacturer_part_number"),
        gtin: parseStr(unwrapObject(item["accounting"]), "gtin"),
        gtinTax: parseStr(unwrapObject(item["accounting"]), "gtin_tax"),
        pdmAttrs: Object.fromEntries(((pdm["attributes"] ?? []) as Obj[]).map((a) => [parseStr(a, "name", "Name"), parseStr(a, "value", "Value")])),
        ...controles,
      }));
      setSerieGravada(controles.controlsSerial);
      setItemEmEdicao(String(code));
      setErrors({});
      setSubmitTentado(false);
      setAba("capa");
      setFeedback({ type: "success", message: `Item ${code} aberto para alteração. O código não muda; o resto pode ser corrigido.` });
    } catch (err) {
      setFeedback({ type: "error", message: errMessage(err, "Não foi possível abrir o item.") });
    } finally {
      setCarregandoItem(false);
    }
  }

  /** Sai do modo de alteração e volta a tela para o cadastro de um item novo. */
  function handleNovoItem() {
    setForm(formInicial);
    setErrors({});
    setSubmitTentado(false);
    setItemEmEdicao("");
    setAba("capa");
    setFeedback({ type: "success", message: "Tela pronta para cadastrar um item novo." });
  }

  function handleLimpar() {
    setForm(formInicial);
    setErrors({});
    setFeedback(null);
    setSubmitTentado(false);
    setItemEmEdicao("");
    setAba("capa");
  }

  // Só conta erros depois da primeira tentativa de salvar — ver `submitTentado`.
  const errCount = submitTentado ? Object.values(errors).filter(Boolean).length : 0;

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Engenharia</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Cadastro de Item</span><span className="erp-crumb-code">VENT0200</span></nav>
        <div className="erp-titlebar-spacer" />
        {errCount > 0 && <span className="erp-badge erp-badge-red">{errCount} erro{errCount > 1 ? "s" : ""}</span>}
        <span id="item-estado" className={`erp-badge ${form.health === "ATIVO" ? "erp-badge-green" : "erp-badge-gray"}`}>{form.health === "ATIVO" ? "Ativo" : form.health === "INATIVO" ? "Inativo" : "Fantasma"}</span>
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" id="item-salvar" onClick={() => void handleSalvar()} disabled={isSaving}>
            {isSaving && <span className="erp-spin" />}{isSaving ? "Salvando…" : itemEmEdicao ? "Salvar alterações" : "Salvar"}
          </button>
          <button className="erp-btn" onClick={handleNovoItem} disabled={!itemEmEdicao && !form.code.trim()}>Novo item</button>
          <button className="erp-btn erp-btn-ghost" onClick={handleLimpar}>Limpar</button>
        </div>
        <div className="erp-tspacer" />
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Abrir item</span>
          <div id="item-abrir" className="erp-tlookup" style={{ minWidth: 260 }}>
            <LookupField<string> value={itemEmEdicao || undefined} loader={loadItems} entityLabel="item" placeholder="Buscar item para alterar…" includeInactive disabled={carregandoItem} onChange={(c) => void abrirItem(c)} />
          </div>
        </div>
      </div>

      <div className="erp-content">
        {feedback && <div className={`erp-feedback ${feedback.type}`} role="status">{feedback.message}</div>}
        <section className="erp-detail-panel">
        <div className="erp-tabs">
          {abas.map((a) => (
            <button key={a.id} className={`erp-tab${aba === a.id ? " active" : ""}`} onClick={() => setAba(a.id)}>{a.label}</button>
          ))}
        </div>
        <div className="erp-detail-body">
        {aba === "capa" && (<>
          <Secao titulo="Identificação">
            <Campo c={3} rotulo="Código" erro={erroDe("code")} dica={itemEmEdicao ? "O código não muda na alteração. Para outro código, cadastre um item novo." : "Letras, números e - . / _, até 60 caracteres, sem espaço (ex.: TEA453-3). Em branco, o sistema gera o próximo."}>
              <input className="erp-input" id="item-codigo" maxLength={60} value={form.code} readOnly={Boolean(itemEmEdicao)} onChange={(e) => setField("code", e.target.value.toUpperCase())} />
            </Campo>
            <Campo c={6} rotulo="Nome" req erro={erroDe("name")} dica="Usado como descrição técnica quando não há padrão do PDM e o campo técnico fica em branco.">
              <input className="erp-input" value={form.name} placeholder="Nome resumido do item" onChange={(e) => setField("name", e.target.value)} />
              {!itemEmEdicao && parecidos.length > 0 && (
                <div className="erp-note" id="item-parecidos">Já existe item parecido: {parecidos.slice(0, 3).map((c) => `${c.codigo} · ${c.nome} (${Math.round(c.semelhanca * 100)}%)`).join("; ")}.</div>
              )}
            </Campo>
            <Campo c={3} rotulo="Situação" dica="Linha = item de catálogo corrente; Promoção = campanha temporária.">
              <select className="erp-input" value={form.situation} onChange={(e) => setField("situation", e.target.value as TypeSituationItem)}><option value="LINHA">Linha</option><option value="PROMOCAO">Promoção</option></select>
            </Campo>
            <Campo c={6} rotulo="Complemento do nome"><input className="erp-input" value={form.complement} placeholder="Ex.: linha premium" onChange={(e) => setField("complement", e.target.value)} /></Campo>
            <Campo c={3} rotulo="Revisão" dica={revisoes.length ? "Vigente. Nova revisão na aba Engenharia." : "Revisão de engenharia."}><input className="erp-input" maxLength={20} readOnly={revisoes.length > 0} value={form.revision} onChange={(e) => setField("revision", e.target.value)} /></Campo>
            <Campo c={3} rotulo="Código anterior" dica="O código que o item tinha no sistema antigo ou na planilha. A busca de itens também acha por ele."><input className="erp-input" maxLength={60} value={form.previousCode} onChange={(e) => setField("previousCode", e.target.value)} /></Campo>
            <Campo c={3} rotulo="Estado">
              <select className="erp-input" value={form.health} onChange={(e) => { setField("health", e.target.value as Health); setField("fantasma", e.target.value === "FANTASMA" ? true : form.health === "FANTASMA" ? false : form.fantasma); }}><option value="ATIVO">Ativo</option><option value="INATIVO">Inativo</option><option value="FANTASMA">Fantasma</option></select>
            </Campo>
            <Campo c={5} rotulo="Fabricante"><input className="erp-input" maxLength={120} value={form.manufacturerName} onChange={(e) => setField("manufacturerName", e.target.value)} /></Campo>
            <Campo c={4} rotulo="Referência do fabricante (MPN)" dica="Número da peça no catálogo do fabricante. A busca de itens também acha por ele."><input className="erp-input" maxLength={60} value={form.manufacturerPartNumber} onChange={(e) => setField("manufacturerPartNumber", e.target.value)} /></Campo>
          </Secao>

          <Secao titulo="Padrão descritivo (PDM)">
            <Campo c={6} rotulo="Grupo" req erro={erroDe("groupID")} dica="Cadastre em VITE0114 antes do item.">
              <LookupField<number> value={form.groupID ? Number(form.groupID) : undefined} loader={loadPdmGroups} entityLabel="grupo" placeholder="Selecionar grupo…" onChange={(c) => { setField("groupID", c ? String(c) : ""); setField("modifierID", ""); }} />
            </Campo>
            <Campo c={6} rotulo="Modificador" req erro={erroDe("modifierID")} dica="Só os modificadores do grupo. Vincule em VITE0116.">
              <LookupField<number> key={form.groupID} value={form.modifierID ? Number(form.modifierID) : undefined} loader={modificadoresDoGrupoLoader} entityLabel="modificador" placeholder="Selecionar modificador…" onChange={(c) => setField("modifierID", c ? String(c) : "")} />
            </Campo>

            {modeloAtivo.map((a) => (
              <Campo key={a.id ?? a.name} c={a.value_type === "TEXTO" ? 4 : 3} rotulo={`${a.name}${a.unit ? ` (${a.unit})` : ""}`} req={a.is_required}>
                {a.value_type === "LISTA" ? (
                  <select className="erp-input" value={form.pdmAttrs[a.name] ?? ""} onChange={(e) => setAtributo(a.name, e.target.value)}>
                    <option value="">—</option>
                    {a.values.filter((v) => v.is_active).map((v) => <option key={v.value} value={v.value}>{v.value}</option>)}
                  </select>
                ) : (
                  <input className="erp-input" inputMode={a.value_type === "NUMERO" ? "decimal" : undefined} value={form.pdmAttrs[a.name] ?? ""} onChange={(e) => setAtributo(a.name, e.target.value)} />
                )}
              </Campo>
            ))}

            <Campo c={12} rotulo={temPadraoPDM ? "Descrição técnica gerada pelo padrão" : "Nome técnico detalhado"} dica={temPadraoPDM ? `${previaPDM?.length ?? 0} de 120 caracteres da NF-e.` : undefined}>
              <input className="erp-input" id="item-descricao-tecnica" readOnly={temPadraoPDM} value={temPadraoPDM ? (previaPDM?.description ?? "") : form.description} placeholder="Opcional; se vazio, será usado o nome do item" onChange={(e) => setField("description", e.target.value)} />
              {previaPDM && previaPDM.errors.length > 0 && <div className="erp-note">Falta no padrão: {previaPDM.errors.join("; ")}.</div>}
              {previaPDM?.exceeds_invoice_limit && <div className="erp-note">A descrição passa dos 120 caracteres da NF-e: informe uma descrição comercial mais curta.</div>}
              {previaPDM && previaPDM.duplicates.length > 0 && <div className="erp-note" id="item-pdm-duplicados">Mesma combinação de atributos já cadastrada em: {previaPDM.duplicates.join(", ")}.</div>}
            </Campo>
            <Campo c={12} rotulo="Descrição longa" dica="Texto livre para catálogo e proposta. Não vai para a nota.">
              <textarea className="erp-input erp-textarea" rows={2} value={form.longDescription} onChange={(e) => setField("longDescription", e.target.value)} />
            </Campo>
            <Campo c={12} rotulo="Descrição para exportação" dica="Vai na nota com CFOP 7xxx."><input className="erp-input" maxLength={255} value={form.descriptionEn} placeholder="Ex.: HEX BOLT M8 ZINC PLATED" onChange={(e) => setField("descriptionEn", e.target.value)} /></Campo>
          </Secao>

          {form.health === "INATIVO" && itemEmEdicao && (
            <div className="erp-feedback warn" id="item-impacto-inativar">
              {conferindoUso ? "Conferindo onde o item é usado…" : ondeUsado === null ? "Não foi possível conferir onde o item é usado." : ondeUsado.length === 0 ? "Este item não é componente de nenhuma estrutura." : `Atenção: ${ondeUsado.length} montagem(ns) usam este item: ${ondeUsado.slice(0, 8).map((l) => l.parent_code).join(", ")}.`}
            </div>
          )}

          <Secao titulo="Natureza">
            <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
              {MARCADORES.map((m) => <Marca key={m.field} rotulo={m.label} title={m.hint} checked={form[m.field]} bloqueio={bloqueio(m.field)} onChange={(v) => marcar(m.field, v)} />)}
            </div>
            <div className="erp-field erp-c12"><small className="erp-hint">{MARCADORES.filter((m) => form[m.field]).map((m) => m.hint).join(" · ") || "Sem marcação, o item é Genérico. Item Base serve de modelo para criar outros itens."}</small></div>
            <Campo c={12} rotulo="Observações"><textarea className="erp-input erp-textarea" rows={2} maxLength={1000} value={form.observations} placeholder="Observações gerais…" onChange={(e) => setField("observations", e.target.value)} /></Campo>
          </Secao>
        </>)}

        {aba === "estoque" && (<>
          <Secao titulo="Unidade e almoxarifado">
            <Campo c={3} rotulo="Unidade de estoque" dica="A unidade em que o saldo é controlado e todas as quantidades do item são convertidas. Com saldo ou documento aberto ela não muda.">
              <select className="erp-input" value={form.unitOfMeasurement} onChange={(e) => setField("unitOfMeasurement", e.target.value as TypeUnitOfMeasurementItem)}>{UNIDADES.map((u) => <option key={u}>{u}</option>)}</select>
            </Campo>
            <Campo c={3} rotulo="Unidade de compra" dica="Em que o fornecedor vende. Diferente da de estoque, cadastre a conversão em VSUP0110 (ex.: 1 BR = 6 M).">
              <select className="erp-input" value={form.umSuprimentos} onChange={(e) => setField("umSuprimentos", e.target.value as TypeUnitOfMeasurementItem)}>{UNIDADES.map((u) => <option key={u}>{u}</option>)}</select>
            </Campo>
            <Campo c={3} rotulo="Almoxarifado padrão" dica="Onde o item fica guardado e de onde sai quando o documento não indica outro. Em branco = almoxarifado 1.">
              <LookupField<number> value={form.warehouseID ? Number(form.warehouseID) : undefined} loader={loadWarehouses} entityLabel="almoxarifado" placeholder="Selecionar almoxarifado…" onChange={(c) => setField("warehouseID", c ? String(c) : "")} />
            </Campo>
            <Campo c={3} rotulo="Almoxarifado de recebimento" dica="Só se a compra entra em outro lugar, como a inspeção. Em branco, o recebimento usa o almoxarifado padrão.">
              <LookupField<number> value={form.almoxSuprimentos ? Number(form.almoxSuprimentos) : undefined} loader={loadWarehouses} entityLabel="almoxarifado" placeholder="O mesmo do padrão" onChange={(c) => setField("almoxSuprimentos", c ? String(c) : "")} />
            </Campo>
            <Campo c={3} rotulo="Segunda unidade" dica="Para controlar também em outra medida, como peça e peso (KG) da chapa ou do perfil."><select className="erp-input" id="item-segunda-um" disabled={form.type === "SERVICO"} value={form.secondaryUom} onChange={(e) => { setField("secondaryUom", e.target.value); if (!e.target.value) setField("secondaryFactor", ""); }}><option value="">Não controla</option>{UNIDADES.filter((u) => u !== form.unitOfMeasurement).map((u) => <option key={u}>{u}</option>)}</select></Campo>
            <Campo c={3} rotulo="Fator nominal da segunda unidade" erro={erroDe("secondaryFactor")} dica="Quanto 1 unidade de estoque vale na segunda (ex.: 1 PC = 12,5 KG). O recebimento pode informar o peso real."><input className="erp-input" inputMode="decimal" disabled={!form.secondaryUom} value={form.secondaryFactor} onChange={(e) => setField("secondaryFactor", e.target.value)} /></Campo>
            {saldo?.secondary_uom && <Dado c={6} rotulo="Saldo nas duas unidades" valor={`${Number(saldo.quantity).toLocaleString("pt-BR")} ${saldo.uom} · ${Number(saldo.secondary_quantity).toLocaleString("pt-BR")} ${saldo.secondary_uom}`} />}
            {saldo?.secondary_uom && saldo.details.length > 0 && (
              <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                <table className="erp-grid" id="item-saldo-lotes">
                  <thead><tr><th>Almoxarifado</th><th>Lote</th><th>{saldo.uom}</th><th>{saldo.secondary_uom}</th></tr></thead>
                  <tbody>
                    {saldo.details.map((d) => (
                      <tr key={`${d.warehouse_id}-${d.lot ?? ""}`}><td>{d.warehouse}</td><td>{d.lot ?? "Sem lote"}</td><td>{Number(d.quantity).toLocaleString("pt-BR")}</td><td>{Number(d.secondary_quantity).toLocaleString("pt-BR")}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Secao>

          <Secao titulo="Controle do saldo">
            <Campo c={3} rotulo="Estoque mínimo (alerta)" dica="Quando o saldo fica abaixo disto, a sugestão de reposição propõe compra ou fabricação."><input className="erp-input" type="number" disabled={form.type === "SERVICO" || form.fantasma} value={form.cyclicalCountMinStock || ""} placeholder="Qtde mínima" onChange={(e) => setField("cyclicalCountMinStock", Number(e.target.value))} /></Campo>
            <Campo c={3} rotulo="Estoque máximo" dica="Teto da reposição: o MRP e a sugestão de compra não pedem acima disto."><input className="erp-input" inputMode="decimal" disabled={form.type === "SERVICO" || form.fantasma} value={form.maximumStock} onChange={(e) => setField("maximumStock", e.target.value)} /></Campo>
            {form.cyclicalCount && <Campo c={3} rotulo="Contar a cada (dias)" req erro={erroDe("cyclicalCountDays")} dica="O sistema programa a próxima contagem esta quantidade de dias depois da última aprovada. A vencida avisa quem está em VNOT0100."><input className="erp-input" type="number" value={form.cyclicalCountDays || ""} placeholder="Ex.: 30" onChange={(e) => setField("cyclicalCountDays", Number(e.target.value))} /></Campo>}
            <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
              <Marca rotulo="Faz baixa automática" title="A OF consome o item sozinha, sem requisição ao almoxarifado." checked={form.automaticLow} bloqueio={bloqueio("automaticLow")} onChange={(v) => setField("automaticLow", v)} />
              <Marca rotulo="Aceita quantidade fracionada" title="Desmarcado, pedidos, OFs e movimentos só aceitam quantidade inteira." checked={form.fractional} bloqueio={bloqueio("fractional")} onChange={(v) => setField("fractional", v)} />
              <Marca rotulo="Contagem cíclica própria" title="Marcado, o item é contado na frequência informada aqui. Desmarcado, segue a classe ABC: A a cada 90 dias, B a cada 180, C a cada 365." checked={form.cyclicalCount} bloqueio={bloqueio("cyclicalCount")} onChange={(v) => setField("cyclicalCount", v)} />
            </div>
            <div className="erp-field erp-c12"><small className="erp-hint" id="item-regra-contagem">{form.cyclicalCount
              ? `Contagem própria: a cada ${form.cyclicalCountDays || "?"} dias após a última aprovada.`
              : form.curvaAbc
                ? `Contagem pela classe ${form.curvaAbc}: a cada ${({ A: 90, B: 180, C: 365 } as Record<string, number>)[form.curvaAbc] ?? "?"} dias. A classe fica na aba Planejamento.`
                : "Sem contagem programada: marque a contagem própria ou classifique a curva ABC na aba Planejamento."}</small></div>
          </Secao>

          <Secao titulo="Compra e recebimento">
            <Campo c={3} rotulo="Tipo de utilização" dica="Sugestão para o pedido de compra e a nota de entrada: industrialização dá crédito de imposto; consumo e imobilizado, não."><select className="erp-input" value={form.tipoUtilizacao} onChange={(e) => setField("tipoUtilizacao", e.target.value as TypeTipoUtilizacao)}><option>Industrialização</option><option>Consumo</option><option>Imobilizado</option></select></Campo>
            <Campo c={3} rotulo="Roteiro de recebimento" dica={ROTEIROS.find((r) => r.value === form.receiptRouting)?.hint}>
              <select className="erp-input" id="item-roteiro" value={form.receiptRouting} onChange={(e) => setField("receiptRouting", e.target.value as FormItem["receiptRouting"])}>{ROTEIROS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
            </Campo>
            <Campo c={3} rotulo="Tolerância de excesso (%)" erro={erroDe("overTolerance")} dica="Quanto o recebimento aceita acima do pedido. Vale sobre a da empresa e a do fornecedor."><input className="erp-input" inputMode="decimal" value={form.overTolerance} onChange={(e) => setField("overTolerance", e.target.value)} /></Campo>
            <Campo c={3} rotulo="Tolerância de falta (%)" erro={erroDe("underTolerance")} dica="Se faltar até isto, o recebimento oferece encerrar a linha do pedido."><input className="erp-input" inputMode="decimal" value={form.underTolerance} onChange={(e) => setField("underTolerance", e.target.value)} /></Campo>
            <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
              <Marca rotulo="Check list de recebimento" title="O recebimento só conclui com a confirmação do check list." checked={form.checklistRecebimento} onChange={(v) => setField("checklistRecebimento", v)} />
              <Marca rotulo="Exige certificado e corrida" title="O recebimento pede lote, corrida e certificado do material (aço, chapa)." checked={form.requiresCertificate} onChange={(v) => setField("requiresCertificate", v)} />
            </div>
            <Campo c={12} rotulo="Observações de compra"><textarea className="erp-input erp-textarea" rows={2} maxLength={1000} value={form.obsSuprimentos} placeholder="Aparece para o comprador no pedido…" onChange={(e) => setField("obsSuprimentos", e.target.value)} /></Campo>
          </Secao>

          <Secao titulo="Rastreabilidade e validade">
            <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
              <Marca rotulo="Controla lote" title="Toda entrada e saída informa o lote, e a rastreabilidade vai da compra à nota de venda. Desmarcar apaga a validade, que é do lote." checked={form.controlsLot} bloqueio={bloqueio("controlsLot")} onChange={(v) => { setField("controlsLot", v); if (!v) { setField("shelfLifeDays", ""); setField("minRemainingLifeDays", ""); } }} />
              <Marca rotulo="Controla endereço" title="O saldo fica por endereço (rua, prateleira) dentro do almoxarifado." checked={form.controlsAddress} bloqueio={bloqueio("controlsAddress")} onChange={(v) => setField("controlsAddress", v)} />
              <Marca rotulo="Controla número de série" title="Cada unidade tem número de série, usado na garantia e na assistência. Marcar torna o item de quantidade inteira." checked={form.controlsSerial} bloqueio={bloqueio("controlsSerial")} onChange={(v) => { setField("controlsSerial", v); if (v) setField("fractional", false); }} />
            </div>
            <Campo c={4} rotulo="Regra de baixa do lote" dica="Qual lote a separação sugere primeiro.">
              <select className="erp-input" value={form.lotIssueRule} disabled={!form.controlsLot} onChange={(e) => setField("lotIssueRule", e.target.value as "FEFO" | "FIFO")}><option value="FEFO">FEFO: o que vence primeiro</option><option value="FIFO">FIFO: o que entrou primeiro</option></select>
            </Campo>
            <Campo c={4} rotulo="Validade (dias)" erro={erroDe("shelfLifeDays")} dica={form.controlsLot ? "Prazo de validade a partir da entrada. O lote sem data de validade recebe entrada + este prazo." : "Só com controle de lote: a validade é do lote."}><input className="erp-input" type="number" min={1} disabled={!form.controlsLot} value={form.shelfLifeDays} onChange={(e) => setField("shelfLifeDays", e.target.value)} /></Campo>
            <Campo c={4} rotulo="Vida útil mínima no recebimento (dias)" erro={erroDe("minRemainingLifeDays")} dica={form.controlsLot ? "O recebimento recusa lote com menos dias de validade restantes. Útil para tinta, adesivo e cola." : "Só com controle de lote."}><input className="erp-input" type="number" min={0} disabled={!form.controlsLot} value={form.minRemainingLifeDays} onChange={(e) => setField("minRemainingLifeDays", e.target.value)} /></Campo>
          </Secao>

          <Secao titulo="Armazenagem e segurança">
            <Campo c={6} rotulo="Condições de armazenagem" req={form.hazardous} erro={erroDe("storageConditions")} dica="Como guardar o item. Obrigatório para produto perigoso. Aparece para quem recebe, separa, fabrica e expede."><input className="erp-input" maxLength={120} value={form.storageConditions} placeholder="Ex.: local seco, até 25 °C" onChange={(e) => setField("storageConditions", e.target.value)} /></Campo>
            <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><Marca rotulo="Produto perigoso" title="Tinta, solvente, gás: exige número ONU e classe de risco no transporte." checked={form.hazardous} bloqueio={bloqueio("hazardous")} onChange={(v) => setField("hazardous", v)} /></div>
            <Campo c={2} rotulo="Número ONU" req={form.hazardous} erro={erroDe("unNumber")} dica="4 dígitos da FISPQ."><input className="erp-input" maxLength={4} disabled={!form.hazardous} value={form.unNumber} onChange={(e) => setField("unNumber", e.target.value)} /></Campo>
            <Campo c={2} rotulo="Classe de risco" dica="Ex.: 3 (inflamável)."><input className="erp-input" maxLength={10} disabled={!form.hazardous} value={form.hazardClass} onChange={(e) => setField("hazardClass", e.target.value)} /></Campo>
          </Secao>
        </>)}

        {aba === "engenharia" && (<>
          <Secao titulo="Classificação">
            <Campo c={3} rotulo="Tipo de item" dica={TIPOS_ITEM.find((t) => t.value === form.type)?.hint}>
              <select className="erp-input" value={form.type} onChange={(e) => { setField("type", e.target.value as TypeItem); if (e.target.value !== "COMPRADO" && form.tipoVenda === "Revenda") setField("tipoVenda", "Venda"); }}>{TIPOS_ITEM.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
            </Campo>
            <Campo c={3} rotulo="Tipo de estrutura" dica={TIPOS_STRUCT.find((t) => t.value === form.typeStruct)?.hint}>
              <select className="erp-input" value={form.typeStruct} onChange={(e) => setField("typeStruct", e.target.value as TypeStructItem)}>{TIPOS_STRUCT.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
            </Campo>
            <Campo c={4} rotulo="Usar item-base como modelo" dica="Opcional. Copia as configurações das demais abas; código, nome, GTIN e referências continuam os do novo item.">
              <LookupField<string> value={form.itemBaseCod || undefined} loader={loadBaseItems} entityLabel="item base" placeholder="Selecionar item base…" onChange={(c) => void aplicarItemBase(c)} />
            </Campo>
            <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><Marca rotulo="OEM" title="Montado sob marca de outra empresa." checked={form.oem} onChange={(v) => setField("oem", v)} /></div>
          </Secao>
          <Secao titulo="Dimensões e peso">
            <Campo c={3} rotulo="Peso bruto (kg)" erro={erroDe("grossWeight")}><input className="erp-input" inputMode="decimal" value={form.grossWeight} placeholder="0,00" onChange={(e) => setField("grossWeight", e.target.value)} /></Campo>
            <Campo c={3} rotulo="Peso líquido (kg)" erro={erroDe("netWeight")}><input className="erp-input" inputMode="decimal" value={form.netWeight} placeholder="0,00" onChange={(e) => setField("netWeight", e.target.value)} /></Campo>
            <Campo c={3} rotulo="Volume (m³)"><input className="erp-input" inputMode="decimal" value={form.cubicVolume} placeholder="0,0000" onChange={(e) => setField("cubicVolume", e.target.value)} /></Campo>
            <Campo c={3} rotulo="Comprimento (mm)"><input className="erp-input" type="number" value={form.dimLength} onChange={(e) => setField("dimLength", e.target.value)} /></Campo>
            <Campo c={3} rotulo="Largura (mm)"><input className="erp-input" type="number" value={form.dimWidth} onChange={(e) => setField("dimWidth", e.target.value)} /></Campo>
            <Campo c={3} rotulo="Altura (mm)"><input className="erp-input" inputMode="decimal" value={form.dimHeight} onChange={(e) => setField("dimHeight", e.target.value)} /></Campo>
          </Secao>
          {itemEmEdicao && (
            <Secao titulo="Revisões">
              <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                <table className="erp-grid" id="item-revisoes">
                  <thead><tr><th>Revisão</th><th>De</th><th>Até</th><th>Motivo</th></tr></thead>
                  <tbody>
                    {revisoes.length === 0 && <tr><td colSpan={4} className="erp-grid-empty">Sem revisões com vigência.</td></tr>}
                    {revisoes.map((r) => <tr key={r.revision}><td><strong>{r.revision}</strong></td><td>{dataBr(r.valid_from)}</td><td>{r.valid_until ? dataBr(r.valid_until) : "—"}</td><td>{r.reason}</td></tr>)}
                  </tbody>
                </table>
              </div>
              <Campo c={2} rotulo="Nova revisão"><input className="erp-input" id="item-rev-codigo" maxLength={20} value={novaRevisao.revision} onChange={(e) => setNovaRevisao((v) => ({ ...v, revision: e.target.value }))} /></Campo>
              <Campo c={3} rotulo="Vigente a partir de"><input className="erp-input" id="item-rev-data" type="date" value={novaRevisao.valid_from} onChange={(e) => setNovaRevisao((v) => ({ ...v, valid_from: e.target.value }))} /></Campo>
              <Campo c={5} rotulo="Motivo"><input className="erp-input" id="item-rev-motivo" maxLength={500} value={novaRevisao.reason} onChange={(e) => setNovaRevisao((v) => ({ ...v, reason: e.target.value }))} /></Campo>
              <div className="erp-field erp-c2" style={{ flexDirection: "row", alignItems: "flex-end" }}><button className="erp-btn" id="item-rev-gravar" disabled={!novaRevisao.revision.trim() || !novaRevisao.valid_from || !novaRevisao.reason.trim()} onClick={() => void gravarRevisao()}>Gravar revisão</button></div>
            </Secao>
          )}
          {itemEmEdicao && (
            <Secao titulo="Atributos livres">
              <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                <table className="erp-grid" id="item-atributos-livres">
                  <thead><tr><th>Atributo</th><th>Valor</th><th /></tr></thead>
                  <tbody>
                    {atributosLivres.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Sem atributos livres. Use para o que o PDM não padroniza, como tonalidade ou acabamento.</td></tr>}
                    {atributosLivres.map((a, i) => (
                      <tr key={i}>
                        <td><input className="erp-cell-input" list="item-atributos-nomes" maxLength={60} value={a.name} onChange={(ev) => setAtributosLivres((l) => l.map((x, j) => (j === i ? { ...x, name: ev.target.value } : x)))} /></td>
                        <td><input className="erp-cell-input" maxLength={200} value={a.value} onChange={(ev) => setAtributosLivres((l) => l.map((x, j) => (j === i ? { ...x, value: ev.target.value } : x)))} /></td>
                        <td><button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => setAtributosLivres((l) => l.filter((_, j) => j !== i))}>Remover</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <datalist id="item-atributos-nomes">{nomesLivres.map((n) => <option key={n} value={n} />)}</datalist>
              </div>
              <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8 }}>
                <button className="erp-btn" id="item-atributo-novo" onClick={() => setAtributosLivres((l) => [...l, { name: "", value: "" }])}>Adicionar atributo</button>
                <button className="erp-btn erp-btn-primary" id="item-atributo-gravar" onClick={() => void gravarAtributosLivres()}>Gravar atributos</button>
              </div>
            </Secao>
          )}
          <Secao titulo="Corte e fabricação">
            <div className="erp-field erp-c12"><small className="erp-hint">Usado pelo plano de corte (chapa, MDF, perfil) e pela liberação da OF. Item que não passa por corte pode deixar como está.</small></div>
            <Campo c={4} rotulo="Sentido do material no corte" dica="O veio do MDF ou o sentido de laminação da chapa. Com sentido, o plano de corte posiciona a peça alinhada a ele e não a gira.">
              <select className="erp-input" id="item-veio" value={form.cuttingGrain} onChange={(e) => setField("cuttingGrain", e.target.value as FormItem["cuttingGrain"])}><option value="NONE">Sem sentido: pode girar</option><option value="LENGTH">No comprimento</option><option value="WIDTH">Na largura</option></select>
            </Campo>
            <div className="erp-field erp-c8" style={{ flexDirection: "row", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <Marca rotulo="Não girar no corte" title="Proíbe girar a peça 90° no plano de corte mesmo sem sentido do material, por exemplo por estampa ou furação." checked={form.cuttingNoRotation} onChange={(v) => setField("cuttingNoRotation", v)} />
              <Marca rotulo="Exige desenho para produzir" title="A prontidão de produção só fica verde com desenho técnico vinculado ao item." checked={form.requiresDrawing} bloqueio={bloqueio("requiresDrawing")} onChange={(v) => setField("requiresDrawing", v)} />
            </div>
          </Secao>
        </>)}

        {aba === "planejamento" && (<>
          <Secao titulo="Política">
            <Campo c={3} rotulo="Tipo de planejamento" dica={TIPOS_PLAN.find((t) => t.value === form.typePlanejamento)?.hint}>
              <select className="erp-input" value={form.typePlanejamento} onChange={(e) => setField("typePlanejamento", e.target.value as TypePlanejamento)}>{TIPOS_PLAN.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
            </Campo>
            <Campo c={4} rotulo="Curva ABC" dica="Importância do item no valor consumido. Ajuda a priorizar inventário e compras.">
              <select className="erp-input" value={form.curvaAbc} onChange={(e) => setField("curvaAbc", e.target.value)}><option value="">Não classificado</option><option value="A">A: poucos itens, maior parte do valor</option><option value="B">B: valor intermediário</option><option value="C">C: muitos itens, pouco valor</option></select>
            </Campo>
            <Campo c={2} rotulo="Nível na estrutura (LLC)" dica="1 = produto final; 2 a 8 = intermediários; 9 = matéria-prima. O MRP calcula de cima para baixo."><input className="erp-input" type="number" value={form.llc} onChange={(e) => setField("llc", e.target.value)} /></Campo>
            <div className="erp-field erp-c12" id="item-responsaveis"><small className="erp-hint">
              <strong>Responsáveis (do grupo do PDM):</strong>{" "}
              {responsaveis && (responsaveis.planning_department || responsaveis.purchasing_department)
                ? <>planejamento {responsaveis.planning_department_name || "sem setor"}{responsaveis.planning_people?.length ? ` (${responsaveis.planning_people.join(", ")})` : ""} · compras {responsaveis.purchasing_department_name || "sem setor"}{responsaveis.purchasing_people?.length ? ` (${responsaveis.purchasing_people.join(", ")})` : ""}. Altere no grupo (VITE0114).</>
                : "o grupo ainda não tem setor de planejamento nem de compras: defina em VITE0114."}
            </small></div>
            <Campo c={3} rotulo="Tanque / linha de capacidade" dica="Só para quem usa a promessa de entrega por capacidade: a linha em que o item ocupa capacidade. Cadastre as linhas em VPME0102."><LookupField<number> value={form.tanque ? Number(form.tanque) : undefined} loader={loadCapacityLines} entityLabel="tanque / linha" placeholder="Nenhuma" clearable onChange={(c) => setField("tanque", c ? String(c) : "")} /></Campo>
          </Secao>
          <Secao titulo="Tamanho do lote">
            <div className="erp-field erp-c12"><small className="erp-hint">Como o MRP arredonda a quantidade das ordens de compra e de fabricação. Ex.: precisa de 37, lote mínimo 50 e múltiplo 25 → ordem de 50.</small></div>
            <Campo c={4} rotulo="Lote mínimo" dica="A ordem nunca é menor que isto."><input className="erp-input" inputMode="decimal" value={form.lotMinimo} placeholder="0" onChange={(e) => setField("lotMinimo", e.target.value)} /></Campo>
            <Campo c={4} rotulo="Lote múltiplo" dica="A ordem sai em múltiplos disto, como caixa de 25 ou barra inteira."><input className="erp-input" inputMode="decimal" value={form.lotMultiplo} placeholder="0" onChange={(e) => setField("lotMultiplo", e.target.value)} /></Campo>
            <Campo c={4} rotulo="Lote máximo" erro={erroDe("lotMaximo")} dica="Acima disto, o MRP divide a necessidade em várias ordens, por capacidade do forno ou da máquina."><input className="erp-input" inputMode="decimal" value={form.lotMaximo} onChange={(e) => setField("lotMaximo", e.target.value)} /></Campo>
          </Secao>
          <Secao titulo="Prazos e estoque de segurança">
            <Campo c={3} rotulo="Prazo de compra (dias úteis)" dica="Do pedido à chegada. O MRP usa quando o fornecedor preferencial não tem prazo próprio."><input className="erp-input" type="number" min={0} disabled={form.type !== "COMPRADO"} title={form.type !== "COMPRADO" ? "Só item comprado gera ordem de compra." : undefined} value={form.purchaseLeadTimeDays} onChange={(e) => setField("purchaseLeadTimeDays", e.target.value)} /></Campo>
            <Campo c={3} rotulo="Prazo de fabricação (dias úteis)" dica="Da liberação da OF ao item pronto. O MRP usa quando o roteiro não permite calcular."><input className="erp-input" type="number" min={0} disabled={form.type !== "FABRICADO"} title={form.type !== "FABRICADO" ? "Só item fabricado gera OF." : undefined} value={form.manufacturingLeadTimeDays} onChange={(e) => setField("manufacturingLeadTimeDays", e.target.value)} /></Campo>
            <Campo c={3} rotulo="Tempo de segurança (dias úteis)" dica="Folga de prazo: o MRP faz o item chegar estes dias antes da data em que é necessário."><input className="erp-input" type="number" min={0} max={365} value={form.tempoSeguranca} onChange={(e) => setField("tempoSeguranca", e.target.value)} /></Campo>
            <Campo c={3} rotulo="Estoque de segurança" dica="Folga de quantidade: o MRP repõe para nunca ficar abaixo disto. Cobre atraso de fornecedor e pico de venda."><input className="erp-input" inputMode="decimal" value={form.estoqueSeguranca} placeholder="0" onChange={(e) => setField("estoqueSeguranca", e.target.value)} /></Campo>
          </Secao>
          <Secao titulo="Ponto de pedido (reposição por consumo)">
            <div className="erp-field erp-c12"><small className="erp-hint">Para itens repostos pelo consumo, sem depender do MRP, como parafuso, consumível e embalagem. Quando o saldo chega ao ponto de pedido, a reposição sugere comprar. O consumo é contado por dia trabalhado e o prazo pelo calendário industrial: mês com sábado trabalhado ou feriado não distorce a conta.</small></div>
            <div className="erp-field erp-c12"><Marca rotulo="Repor pelo ponto de pedido" title="Desmarcado, o item é planejado só pelo MRP e pelo estoque mínimo." checked={form.usaPontoDePedido} onChange={(v) => setField("usaPontoDePedido", v)} /></div>
            <Campo c={4} rotulo="Consumo por dia trabalhado" dica="Quanto sai por dia em que a empresa trabalha. Em branco, a reposição apura dos últimos 90 dias: consumo ÷ dias trabalhados no calendário."><input className="erp-input" id="item-consumo-dia" inputMode="decimal" disabled={!form.usaPontoDePedido} value={form.consumoMedio} placeholder="Apurar do histórico" onChange={(e) => setField("consumoMedio", e.target.value)} /></Campo>
            <Campo c={4} rotulo="Prazo de reposição (dias úteis)" dica="Quanto o item demora para chegar depois de pedido. A reposição conta quantos desses dias a empresa trabalha. Em branco, usa o prazo de compra ou de fabricação."><input className="erp-input" type="number" disabled={!form.usaPontoDePedido} value={form.tempoReposicao} placeholder={form.purchaseLeadTimeDays || form.manufacturingLeadTimeDays || ""} onChange={(e) => setField("tempoReposicao", e.target.value)} /></Campo>
            <Campo c={4} rotulo="Ponto de pedido estimado" dica="Consumo por dia × prazo + estoque de segurança, de segunda a sexta. A reposição recalcula com os sábados e feriados do calendário."><input className="erp-input" id="item-ponto-pedido" readOnly value={calcularPontoDePedido(form) ?? ""} placeholder={form.usaPontoDePedido ? (montarPontoDePedido(form) ? "apurado na reposição" : "informe o prazo") : "desligado"} /></Campo>
          </Secao>
          <Secao titulo="Produção">
            <Campo c={4} rotulo="Baixa de material da OF" dica="Na produção: os componentes saem do estoque conforme o apontamento. Na liberação: saem todos quando a OF é liberada.">
              <select className="erp-input" disabled={form.type !== "FABRICADO"} value={form.materialIssueTiming} onChange={(e) => setField("materialIssueTiming", e.target.value as FormItem["materialIssueTiming"])}><option value="PRODUCTION">Na produção</option><option value="REGISTRATION_RELEASE">Na liberação da ordem</option></select>
            </Campo>
            <Campo c={4} rotulo="Apontamento" dica="Por operação: cada etapa do roteiro (corte, solda, pintura) é apontada. Por ordem: um apontamento só, no fim.">
              <select className="erp-input" disabled={form.type !== "FABRICADO"} value={form.productionReportingType} onChange={(e) => setField("productionReportingType", e.target.value as FormItem["productionReportingType"])}><option value="OPERATION">Por operação</option><option value="ORDER">Por ordem</option></select>
            </Campo>
            <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
              <Marca rotulo="Crítico" title="Sai marcado como crítico nos alertas de estoque (abaixo do mínimo, negativo, contagem), para quem recebe priorizar." checked={form.critico} bloqueio={bloqueio("critico")} onChange={(v) => setField("critico", v)} />
              <Marca rotulo="Fantasma" title="Conjunto que não vai para o estoque: o MRP passa direto aos componentes dele, sem gerar OF do conjunto." checked={form.fantasma} bloqueio={bloqueio("fantasma")} onChange={(v) => { setField("fantasma", v); if (v) setField("health", "FANTASMA"); else if (form.health === "FANTASMA") setField("health", "ATIVO"); }} />
              <Marca rotulo="Ativo no MRP" title={form.isPrototype || form.isScrap || form.isProcessItem ? "Protótipo, sucata e item de processo ficam fora do MRP mesmo marcado." : "Desmarcado, o MRP e a reposição ignoram o item."} checked={form.ativoPlanejamento} onChange={(v) => setField("ativoPlanejamento", v)} />
            </div>
            <div className="erp-field erp-c12"><small className="erp-hint">{[form.critico && "Crítico: destacado nos alertas de estoque.", form.fantasma && "Fantasma: o MRP explode direto os componentes.", !form.ativoPlanejamento && "Fora do MRP: não gera ordem nem sugestão."].filter(Boolean).join(" ") || "Passe o mouse sobre as opções para ver o que cada uma faz."}</small></div>
            <Campo c={12} rotulo="Observações de planejamento"><textarea className="erp-input erp-textarea" rows={2} maxLength={1000} value={form.obsPlanjamento} placeholder="Observações de planejamento…" onChange={(e) => setField("obsPlanjamento", e.target.value)} /></Campo>
          </Secao>
        </>)}

        {aba === "comercial" && (<>
          <Secao titulo="Venda">
            <Campo c={8} rotulo="Descrição comercial" dica="Como o item aparece no orçamento, no pedido e na nota. Em branco, usa a descrição técnica."><input className="erp-input" maxLength={255} value={form.descrComercial} placeholder="Descrição usada em pedidos e notas fiscais" onChange={(e) => setField("descrComercial", e.target.value)} /></Campo>
            <Campo c={4} rotulo="Tipo de venda" erro={erroDe("tipoVenda")} dica="Venda: produzido aqui. Revenda: comprado pronto para revender. Define o tipo do item na EFD."><select className="erp-input" value={form.tipoVenda} onChange={(e) => setField("tipoVenda", e.target.value as TypeVenda)}><option>Venda</option><option disabled={form.type !== "COMPRADO"}>Revenda</option></select></Campo>
            <Campo c={3} rotulo="Unidade de venda" dica="Em que o item é vendido, se não for a de estoque. A conversão entre as duas fica em VSUP0110."><select className="erp-input" value={form.umVenda} onChange={(e) => setField("umVenda", e.target.value)}><option value="">A de estoque</option>{UNIDADES.map((u) => <option key={u}>{u}</option>)}</select></Campo>
            <Campo c={3} rotulo="Mínimo de venda" erro={erroDe("minVenda")} dica="O pedido não aceita quantidade menor."><input className="erp-input" inputMode="decimal" value={form.minVenda} placeholder="0" onChange={(e) => setField("minVenda", e.target.value)} /></Campo>
            <Campo c={3} rotulo="Múltiplo de venda" erro={erroDe("multiploVenda")} dica="O pedido só aceita múltiplos disto, como caixa fechada de 50."><input className="erp-input" inputMode="decimal" value={form.multiploVenda} placeholder="0" onChange={(e) => setField("multiploVenda", e.target.value)} /></Campo>
            <Campo c={3} rotulo="Entrega estimada (dias)" erro={erroDe("entregaEstimada")} dica="Prazo sugerido no orçamento e no pedido quando não há data combinada."><input className="erp-input" type="number" value={form.entregaEstimada} placeholder="0" onChange={(e) => setField("entregaEstimada", e.target.value)} /></Campo>
            <Campo c={3} rotulo="Tempo de garantia (dias)" erro={erroDe("tempoGarantia")} dica="Conta a partir da nota de venda. A assistência técnica usa para saber se o chamado está na garantia."><input className="erp-input" type="number" value={form.tempoGarantia} placeholder="0" onChange={(e) => setField("tempoGarantia", e.target.value)} /></Campo>
            <Campo c={3} rotulo="Volumes por unidade" dica="Em quantas caixas uma unidade embarca, como o móvel desmontado em 3 volumes. O romaneio soma os volumes por aqui."><input className="erp-input" id="item-volumes" type="number" min={1} value={form.volumesPerUnit} onChange={(e) => setField("volumesPerUnit", e.target.value)} /></Campo>
            <Campo c={3} rotulo="Cliente exclusivo" dica="Peça com desenho do cliente: só ele pode comprar."><LookupField<number> value={form.exclusiveCustomer ? Number(form.exclusiveCustomer) : undefined} loader={loadCustomers} entityLabel="cliente" placeholder="Qualquer cliente" onChange={(c) => { setField("exclusiveCustomer", c ? String(c) : ""); setField("exclusivo", Boolean(c)); }} /></Campo>
          </Secao>
          <Secao titulo="Faturamento e expedição">
            <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
              <Marca rotulo="Altera descrição no faturamento" title="Ligado, quem fatura pode mudar a descrição na nota. Desligado, a nota sai sempre com a do cadastro." checked={form.alterarDescrFat} onChange={(v) => setField("alterarDescrFat", v)} />
              <Marca rotulo="Exige volumes no despacho" title="O romaneio só despacha com os volumes montados e conferidos." checked={form.montagemVolExp} onChange={(v) => setField("montagemVolExp", v)} />
              <Marca rotulo="Embalagem diferenciada" title="Sai destacada no romaneio para a expedição separar." checked={form.embalagDif} bloqueio={bloqueio("embalagDif")} onChange={(v) => setField("embalagDif", v)} />
              <Marca rotulo="Embalagem de exportação" title="Sai destacada no romaneio como embalagem de exportação." checked={form.embExportacao} bloqueio={bloqueio("embExportacao")} onChange={(v) => setField("embExportacao", v)} />
              <Marca rotulo="É embalagem" title="O próprio item é uma embalagem (caixa, palete, filme): entra na EFD como tipo 02." checked={form.embalagem} onChange={(v) => setField("embalagem", v)} />
            </div>
            <div className="erp-field erp-c12"><small className="erp-hint">A embalagem que vai no produto (caixa, cantoneira, filme) entra na estrutura do item em VENT0210: a OF consome junto com a matéria-prima.</small></div>
            <Campo c={12} rotulo="Observações comerciais"><textarea className="erp-input erp-textarea" rows={2} maxLength={1000} value={form.obsComercial} placeholder="Observações comerciais…" onChange={(e) => setField("obsComercial", e.target.value)} /></Campo>
          </Secao>
        </>)}

        {aba === "contabil" && (<>
          <Secao titulo="Classificações fiscais">
            <Campo c={4} rotulo="Classif. fiscal de venda" dica={fiscalVenda ? `${fiscalVenda.code} — ${fiscalVenda.description}` : undefined}>
              <LookupField<string> value={form.classifFiscVenda || undefined} loader={loadFiscalClassifications} entityLabel="classificação fiscal" placeholder="Buscar classificação fiscal de venda" onChange={(c) => setField("classifFiscVenda", c ? String(c) : "")} />
            </Campo>
            <Campo c={4} rotulo="Classif. fiscal de compra" dica={fiscalCompra ? `${fiscalCompra.code} — ${fiscalCompra.description}` : undefined}>
              <LookupField<string> value={form.classifFiscCompra || undefined} loader={loadFiscalClassifications} entityLabel="classificação fiscal" placeholder="Buscar classificação fiscal de compra" onChange={(c) => setField("classifFiscCompra", c ? String(c) : "")} />
            </Campo>
            <Campo c={4} rotulo="Origem"><select className="erp-input" value={form.origem} onChange={(e) => setField("origem", e.target.value as OrigemItem)}><option value="">Herdar do mestre fiscal</option>{ORIGENS.map((o) => <option key={o}>{o}</option>)}</select></Campo>
            <Campo c={3} rotulo="CEST" erro={erroDe("cest")}><input className="erp-input" maxLength={7} value={form.cest} placeholder="Código CEST" onChange={(e) => setField("cest", e.target.value)} /></Campo>
            <Campo c={5} rotulo="Tipo do item na EFD" erro={erroDe("efdItemType")} dica="Registro 0200. Em branco, o sistema deduz; só informando chega a 03, 05, 06 e 10.">
              <select className="erp-input" id="item-tipo-efd" value={form.efdItemType} onChange={(e) => setField("efdItemType", e.target.value)}><option value="">Deduzir do cadastro</option>{TIPOS_EFD.map(([c, r]) => <option key={c} value={c}>{c} — {r}</option>)}</select>
            </Campo>
          </Secao>
          <Secao titulo="Código de barras e unidade tributável">
            <Campo c={3} rotulo="GTIN comercial" erro={erroDe("gtin")} dica="cEAN da NF-e. Único na empresa."><input className="erp-input" id="item-gtin" inputMode="numeric" maxLength={14} value={form.gtin} onChange={(e) => setField("gtin", e.target.value.replace(/\D/g, ""))} /></Campo>
            <Campo c={3} rotulo="GTIN tributável" erro={erroDe("gtinTax")} dica="cEANTrib. Em branco, repete o comercial."><input className="erp-input" inputMode="numeric" maxLength={14} value={form.gtinTax} onChange={(e) => setField("gtinTax", e.target.value.replace(/\D/g, ""))} /></Campo>
            <Campo c={3} rotulo="Unidade tributável" erro={erroDe("taxUnit")} dica="uTrib. Em branco, repete a comercial."><input className="erp-input" maxLength={6} value={form.taxUnit} onChange={(e) => setField("taxUnit", e.target.value.toUpperCase())} /></Campo>
            <Campo c={3} rotulo="Fator tributável" erro={erroDe("taxUnitFactor")} dica="Quantas unidades tributáveis há em uma comercial."><input className="erp-input" inputMode="decimal" value={form.taxUnitFactor} onChange={(e) => setField("taxUnitFactor", e.target.value)} /></Campo>
            <Campo c={2} rotulo="EX TIPI" erro={erroDe("exTipi")}><input className="erp-input" inputMode="numeric" maxLength={3} value={form.exTipi} onChange={(e) => setField("exTipi", e.target.value.replace(/\D/g, ""))} /></Campo>
            <Campo c={3} rotulo="Escala relevante" dica="indEscala da NF-e."><select className="erp-input" disabled={!form.cest.trim()} title={!form.cest.trim() ? "Escala e CNPJ do fabricante vão no grupo do CEST: sem CEST não saem na nota." : undefined} value={form.relevantScale} onChange={(e) => setField("relevantScale", e.target.value as FormItem["relevantScale"])}><option value="">Não informar</option><option value="SIM">Sim</option><option value="NAO">Não</option></select></Campo>
            <Campo c={3} rotulo="CNPJ do fabricante" req={form.relevantScale === "NAO"} erro={erroDe("manufacturerCnpj")} dica="Obrigatório quando a escala não é relevante. Só vai na nota com CEST."><input className="erp-input" inputMode="numeric" maxLength={14} disabled={!form.cest.trim()} value={form.manufacturerCnpj} onChange={(e) => setField("manufacturerCnpj", e.target.value.replace(/\D/g, ""))} /></Campo>
            <Campo c={4} rotulo="Número da FCI" erro={erroDe("fciNumber")}><input className="erp-input" maxLength={36} value={form.fciNumber} onChange={(e) => setField("fciNumber", e.target.value)} /></Campo>
          </Secao>
          {itemEmEdicao && (
            <Secao titulo="Embalagens e GTIN">
              <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                <table className="erp-grid" id="item-embalagens">
                  <thead><tr><th>GTIN</th><th>Unidade</th><th>Contém</th><th>Quantidade do nível</th><th>Total em {form.unitOfMeasurement}</th><th>Descrição</th><th /></tr></thead>
                  <tbody>
                    {embalagens.length === 0 && <tr><td colSpan={7} className="erp-grid-empty">Sem embalagens. O palete sem código de barras pode ficar sem GTIN.</td></tr>}
                    {embalagens.map((e, i) => (
                      <tr key={i}>
                        <td><input className="erp-cell-input" inputMode="numeric" maxLength={14} value={e.gtin} onChange={(ev) => setEmbalagens((l) => l.map((x, j) => (j === i ? { ...x, gtin: ev.target.value.replace(/\D/g, "") } : x)))} /></td>
                        <td><select className="erp-cell-input" value={e.uom} onChange={(ev) => setEmbalagens((l) => l.map((x, j) => (j === i ? { ...x, uom: ev.target.value } : x)))}>{[...new Set([...UNIDADES_EMBALAGEM, e.uom])].map((u) => <option key={u} value={u}>{ROTULO_EMBALAGEM[u] ?? u}</option>)}</select></td>
                        <td><select className="erp-cell-input" value={e.parent_uom ?? ""} onChange={(ev) => setEmbalagens((l) => l.map((x, j) => (j === i ? { ...x, parent_uom: ev.target.value || undefined, parent_quantity: ev.target.value ? (x.parent_quantity ?? 1) : undefined } : x)))}><option value="">Direto</option>{[...new Set<string>([form.unitOfMeasurement, ...embalagens.map((x) => x.uom)])].filter((u) => u !== e.uom).map((u) => <option key={u}>{u}</option>)}</select></td>
                        <td><input className="erp-cell-input" type="number" min={0} disabled={!e.parent_uom} value={e.parent_quantity ?? ""} onChange={(ev) => setEmbalagens((l) => l.map((x, j) => (j === i ? { ...x, parent_quantity: Number(ev.target.value) } : x)))} /></td>
                        <td><input className="erp-cell-input" type="number" min={0} disabled={!!e.parent_uom} title={e.parent_uom ? "Calculado ao gravar." : undefined} value={e.package_quantity} onChange={(ev) => setEmbalagens((l) => l.map((x, j) => (j === i ? { ...x, package_quantity: Number(ev.target.value) } : x)))} /></td>
                        <td><input className="erp-cell-input" maxLength={120} value={e.description ?? ""} onChange={(ev) => setEmbalagens((l) => l.map((x, j) => (j === i ? { ...x, description: ev.target.value } : x)))} /></td>
                        <td><button className="erp-btn erp-btn-danger erp-btn-sm" onClick={() => setEmbalagens((l) => l.filter((_, j) => j !== i))}>Remover</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="erp-field erp-c12" style={{ flexDirection: "row", gap: 8 }}>
                <button className="erp-btn" id="item-embalagem-nova" onClick={() => setEmbalagens((l) => [...l, { gtin: "", uom: "CX", package_quantity: 1 }])}>Adicionar embalagem</button>
                <button className="erp-btn erp-btn-primary" id="item-embalagem-gravar" onClick={() => void gravarEmbalagens()}>Gravar embalagens</button>
              </div>
            </Secao>
          )}
          <Secao titulo="Impostos da nota">
            <div className="erp-field erp-c12" id="item-impostos-origem"><small className="erp-hint">
              As alíquotas não ficam no item. Na nota, o <strong>IPI</strong> vem do NCM na tabela tributária (VFIS0110); o <strong>ICMS</strong>, da UF de destino e da regra de ICMS/IPI (VFIS0320), que também dá redução, ST e diferimento; <strong>PIS e COFINS</strong>, do regime da empresa e das exceções do NCM. Por isso o item só precisa da classificação fiscal (NCM), da origem e do CEST acima. Para ver o resultado, use a Prévia fiscal na aba Prontidão.
            </small></div>
          </Secao>
          <Secao titulo="Observações">
            <Campo c={12} rotulo="Observações contábeis e fiscais"><textarea className="erp-input erp-textarea" rows={2} maxLength={1000} value={form.obsContabil} placeholder="Observações contábeis…" onChange={(e) => setField("obsContabil", e.target.value)} /></Campo>
          </Secao>
        </>)}


        {aba === "prontidao" && itemEmEdicao && (<>
          <div className="erp-metrics" id="item-prontidao">
            {prontidao.filter((p) => p.aplica).map((p) => (
              <div key={p.processo} className="erp-metric">
                <div className="erp-metric-label">{p.rotulo}</div>
                <div className="erp-metric-value"><span className={`erp-badge ${!p.pronto ? "erp-badge-red" : p.politica === "AVISO" || p.pendencias.length > 0 ? "erp-badge-amber" : "erp-badge-green"}`}>{!p.pronto ? "Não pronto" : p.politica === "AVISO" ? "Com aviso" : p.pendencias.length > 0 ? "Pronto, com ressalvas" : "Pronto"}</span></div>
              </div>
            ))}
          </div>
          <Secao titulo="O que falta">
            <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
              <table className="erp-grid">
                <thead><tr><th>Processo</th><th>Nível</th><th>Pendência</th><th>Onde resolver</th></tr></thead>
                <tbody>
                  {prontidao.every((p) => p.pendencias.length === 0) && <tr><td colSpan={4} className="erp-grid-empty">Nenhuma pendência.</td></tr>}
                  {prontidao.flatMap((p) => p.pendencias.map((x) => (
                    <tr key={p.processo + x.mensagem}><td>{p.rotulo}</td><td><span className={`erp-badge ${x.nivel === "IMPEDE" ? "erp-badge-red" : "erp-badge-amber"}`}>{x.nivel === "IMPEDE" ? "Impede" : "Atenção"}</span></td><td>{x.mensagem}</td><td>{x.onde}</td></tr>
                  )))}
                </tbody>
              </table>
            </div>
          </Secao>
          {previaFiscal && (
            <Secao titulo="Prévia fiscal">
              <Dado c={2} rotulo="NCM" valor={previaFiscal.ncm} />
              <Dado c={2} rotulo="CEST" valor={previaFiscal.cest} />
              <Dado c={2} rotulo="Origem" valor={previaFiscal.origem === undefined ? "" : String(previaFiscal.origem)} />
              <Dado c={2} rotulo="cClassTrib" valor={previaFiscal.cclass_trib} />
              <Dado c={2} rotulo="Unid. comercial" valor={previaFiscal.unidade_comercial} />
              <Dado c={2} rotulo="Unid. tributável" valor={`${previaFiscal.unidade_tributavel} × ${previaFiscal.fator_tributavel}`} />
              <Dado c={3} rotulo="GTIN comercial" valor={previaFiscal.gtin} />
              <Dado c={3} rotulo="GTIN tributável" valor={previaFiscal.gtin_tributavel} />
              <Dado c={3} rotulo="Tipo na EFD" valor={`${previaFiscal.tipo_efd} (${previaFiscal.tipo_efd_origem === "INFORMADO" ? "informado" : "deduzido"})`} />
              {impostosDaNota?.erro && <div className="erp-field erp-c12"><small className="erp-hint" style={{ color: "var(--v-err)" }}>Impostos: {impostosDaNota.erro}</small></div>}
              {impostosDaNota?.dentro?.itens[0] && (() => {
                const d = impostosDaNota.dentro.itens[0], f = impostosDaNota.fora?.itens[0];
                const pct = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%`;
                return (<>
                  <Dado c={6} rotulo={`Impostos na venda dentro do estado (${impostosDaNota.dentro.uf_destino})`} valor={`IPI ${pct(d.aliq_ipi_pct)} · ICMS ${pct(d.aliq_icms_pct)} (CST ${d.cst_icms}) · PIS ${pct(d.aliq_pis_pct)} · COFINS ${pct(d.aliq_cofins_pct)}`} />
                  {f && <Dado c={6} rotulo={`Fora do estado (${impostosDaNota.fora?.uf_destino})`} valor={`ICMS ${pct(f.aliq_icms_pct)} (CST ${f.cst_icms})${f.origem_mercadoria !== "0" ? " · origem " + f.origem_mercadoria : ""}`} />}
                  <div className="erp-field erp-c12" id="item-impostos-simulados"><small className="erp-hint">Pelo mesmo cálculo da nota, para venda a empresa contribuinte. {impostosDaNota.dentro.pendencias.map((x) => x.mensagem).join(" ")}</small></div>
                </>);
              })()}
              <div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
                <table className="erp-grid" id="item-previa-fiscal">
                  <thead><tr><th>Nível</th><th>Conferência</th><th>Como resolver</th></tr></thead>
                  <tbody>
                    {previaFiscal.checks.length === 0 && <tr><td colSpan={3} className="erp-grid-empty">Nada que a SEFAZ recusaria.</td></tr>}
                    {previaFiscal.checks.map((c) => <tr key={c.mensagem}><td><span className={`erp-badge ${c.nivel === "IMPEDE" ? "erp-badge-red" : "erp-badge-amber"}`}>{c.nivel === "IMPEDE" ? "Impede" : "Atenção"}</span></td><td>{c.mensagem}</td><td>{c.como_resolver}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </Secao>
          )}
        </>)}
        </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <span className="erp-status-item">Código: <strong>{form.code || "—"}</strong></span>
        <span className="erp-status-item">Tipo: <strong>{TIPOS_ITEM.find((t) => t.value === form.type)?.label}</strong></span>
        <span className="erp-status-item">Planejamento: <strong>{TIPOS_PLAN.find((t) => t.value === form.typePlanejamento)?.label}</strong></span>
        <span className="erp-status-item">UM de estoque: <strong>{form.unitOfMeasurement}</strong></span>
        <span className="erp-status-spacer" />
      </footer>

      {impactos && (
        <div className="erp-modal-backdrop" role="dialog" aria-modal="true" aria-label="Impacto da alteração">
          <div className="erp-modal erp-modal-lg" id="item-impacto">
            <div className="erp-modal-head">Impacto da alteração</div>
            <div className="erp-modal-body">
              <div className="erp-grid-wrap"><table className="erp-grid">
                <thead><tr><th>Campo</th><th>De</th><th>Para</th><th>Consequência</th></tr></thead>
                <tbody>{impactos.map((i) => (
                  <tr key={i.campo}><td><span className={`erp-badge ${i.severidade === "BLOQUEIA" ? "erp-badge-red" : "erp-badge-amber"}`}>{i.rotulo}</span></td><td>{i.antes || "—"}</td><td>{i.depois || "—"}</td><td>{i.mensagem}</td></tr>
                ))}</tbody>
              </table></div>
            </div>
            <div className="erp-modal-actions">
              <button className="erp-btn" onClick={() => setImpactos(null)}>Voltar</button>
              <button className="erp-btn erp-btn-primary" id="item-impacto-confirmar" disabled={impactos.some((i) => i.severidade === "BLOQUEIA")} onClick={() => { setImpactos(null); void gravar(); }}>Confirmar e salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const dataBr = (s: string) => s.slice(0, 10).split("-").reverse().join("/");

function Secao({ titulo, children }: { titulo: string; children: ReactNode }): JSX.Element {
  return <div className="erp-fieldset"><div className="erp-fieldset-head">{titulo}</div><div className="erp-fieldset-body">{children}</div></div>;
}

function Campo({ c, rotulo, req, erro, dica, children }: { c: number; rotulo: string; req?: boolean; erro?: string; dica?: string; children: ReactNode }): JSX.Element {
  return (
    <div className={`erp-field erp-c${c}`}>
      <label className={`erp-label${req ? " erp-req" : ""}`}>{rotulo}</label>
      {children}
      {erro ? <span className="erp-field-hint" style={{ color: "var(--v-err)" }}>{erro}</span> : dica ? <span className="erp-field-hint">{dica}</span> : null}
    </div>
  );
}

/**
 * Caixa de marcar. Com `bloqueio`, a opção não pode ser ligada e o motivo aparece
 * ao passar o mouse; já ligada, ela ainda pode ser desligada para resolver o
 * conflito.
 */
function Marca({ rotulo, title, checked, onChange, bloqueio }: { rotulo: string; title?: string; checked: boolean; onChange: (v: boolean) => void; bloqueio?: string }): JSX.Element {
  const travada = Boolean(bloqueio) && !checked;
  return (
    <label className="erp-check" title={bloqueio ? `${checked ? "Conflito" : "Indisponível"}: ${bloqueio}` : title} style={travada ? { opacity: 0.5, cursor: "not-allowed" } : bloqueio ? { color: "var(--v-err)" } : undefined}>
      <input type="checkbox" checked={checked} disabled={travada} onChange={(e) => onChange(e.target.checked)} /> {rotulo}
    </label>
  );
}

function Dado({ c, rotulo, valor }: { c: number; rotulo: string; valor: string }): JSX.Element {
  return <div className={`erp-field erp-c${c}`}><span className="erp-label">{rotulo}</span><strong>{valor || "—"}</strong></div>;
}

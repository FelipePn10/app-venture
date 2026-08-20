import { useState, useCallback, useEffect } from "react";
import { createItem, getItemTemplate } from "@/services/itemService";
import { listFiscalClassifications, type FiscalClassification } from "@/services/fiscalAdvancedService";
import { errMessage, parseBool, parseNum, parseStr, unwrapObject, type Obj } from "@/services/fiscalShared";
import { LookupField } from "@/components/ui/LookupField";
import { loadPdmGroups, loadPdmModifiers, loadBaseItems, loadWarehouses } from "@/services/lookups";

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
  | "TONELADA";
type TypeItem = "FABRICADO" | "COMPRADO" | "DE_TERCEIRO" | "SERVICO";
type TypeStructItem = "INDUSTRIAL" | "COMERCIAL";
type TypePlanejamento = "NORMAL_MRP" | "PROJETO";
/** `ItemNature` — 0 Genérico, 1 Configurado, 2 Item Base. */
type ItemNature = 0 | 1 | 2;
type TypeBaixaOF = "Não faz" | "Cadastro/Liberação" | "Entrega de Produção";
type TypeBaixaAut = "Direta" | "Transferência";
type TypeTipoUtilizacao = "Industrialização" | "Consumo" | "Imobilizado";
type TypeVenda = "Venda" | "Revenda";
type TipoIPI = "Percentual" | "Valor";
type OrigemItem =
  | ""
  | "0 - Nacional"
  | "1 - Estrangeira (Importação Direta)"
  | "2 - Estrangeira (Adquirida no Mercado Interno)";

type AbaAtiva =
  | "capa"
  | "estoque"
  | "engenharia"
  | "planejamento"
  | "comercial"
  | "contabil"
  | "suprimentos";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface FormItem {
  // Capa
  code: string;
  name: string;
  description: string;
  complement: string;
  /**
   * Antes eram três checkboxes independentes (Genérico/Configurado/Item Base),
   * o que permitia marcar as três ao mesmo tempo. No backend é um enum único
   * (`ItemNature`), então aqui virou um campo só.
   */
  nature: ItemNature;
  process: boolean;
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

  // Engenharia
  itemBaseCod: string;
  grossWeight: string;
  netWeight: string;
  cubicVolume: string;
  type: TypeItem;
  typeStruct: TypeStructItem;
  oem: boolean;

  // Planejamento
  typePlanejamento: TypePlanejamento;
  /** Low Level Code: 1 = produto final, 2–8 intermediários, 9 = matéria-prima. */
  llc: string;
  lotMaximo: string;
  lotMinimo: string;
  lotMultiplo: string;
  qtdeMaxOrdem: string;
  estoqueSeguranca: string;
  tempoSeguranca: string;
  tempoReposicao: string;
  cobertura: string;
  coberturaSegDem: string;
  agrupamento: string;
  classificacaoPlan: string;
  kanbanNumCartoes: string;
  critico: boolean;
  exclusivo: boolean;
  fantasma: boolean;
  tipoBaixaAut: TypeBaixaAut;
  tipoBaixaOF: TypeBaixaOF;
  obsPlanjamento: string;

  // Comercial
  descrComercial: string;
  fatorConvVol: string;
  almoxTransf: string;
  alterarDescrFat: boolean;
  emiteEtiquetas: boolean;
  montagemVolExp: boolean;
  embalagDif: boolean;
  retencaoPisCofins: boolean;
  tipoVenda: TypeVenda;
  itemEmbalagem: string;
  multiploVenda: string;
  minVenda: string;
  embalagem: boolean;
  tempoGarantia: string;
  almoxAssTec: string;
  entregaEstimada: string;
  foccoMobile: boolean;
  embExportacao: boolean;
  classificacaoCom: string;
  obsComercial: string;

  // Contábil
  classifFiscVenda: string;
  classifFiscCompra: string;
  aliqIpiVenda: string;
  aliqIpiCompra: string;
  tipoIpiVenda: TipoIPI;
  tipoIpiCompra: TipoIPI;
  aliqIcms: string;
  umVenda: string;
  umCompra: string;
  origem: OrigemItem;
  grupoInventario: string;
  classificacaoCont: string;
  cest: string;
  insumo: string;
  calculaPisCofins: "HERDAR" | "SIM" | "NAO";
  obsContabil: string;

  // Suprimentos
  umSuprimentos: TypeUnitOfMeasurementItem;
  almoxSuprimentos: string;
  checkListReceb: boolean;
  controleSafra: boolean;
  tipoUtilizacao: TypeTipoUtilizacao;
  classifSuprimentos: string;
  obsSuprimentos: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

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
const NATUREZAS: { value: ItemNature; label: string; hint: string }[] = [
  { value: 2, label: "Item Base", hint: "Modelo reutilizável com parâmetros contábeis, comerciais, de estoque e planejamento" },
  { value: 0, label: "Genérico", hint: "Agrupa materiais não estocáveis sob um código" },
  { value: 1, label: "Configurado", hint: "Item com variações, como cor e medida" },
];
const ORIGENS: OrigemItem[] = [
  "0 - Nacional",
  "1 - Estrangeira (Importação Direta)",
  "2 - Estrangeira (Adquirida no Mercado Interno)",
];

const ABAS: { id: AbaAtiva; label: string }[] = [
  { id: "capa", label: "Capa" },
  { id: "estoque", label: "Estoque" },
  { id: "engenharia", label: "Engenharia" },
  { id: "planejamento", label: "Planejamento" },
  { id: "comercial", label: "Comercial" },
  { id: "contabil", label: "Contábil" },
  { id: "suprimentos", label: "Suprimentos" },
];

const formInicial: FormItem = {
  code: "",
  name: "",
  description: "",
  complement: "",
  nature: 2,
  process: false,
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
  itemBaseCod: "",
  grossWeight: "",
  netWeight: "",
  cubicVolume: "",
  type: "COMPRADO",
  typeStruct: "INDUSTRIAL",
  oem: false,
  typePlanejamento: "NORMAL_MRP",
  llc: "2",
  lotMaximo: "",
  lotMinimo: "",
  lotMultiplo: "",
  qtdeMaxOrdem: "",
  estoqueSeguranca: "",
  tempoSeguranca: "",
  tempoReposicao: "",
  cobertura: "",
  coberturaSegDem: "",
  agrupamento: "",
  classificacaoPlan: "",
  kanbanNumCartoes: "",
  critico: false,
  exclusivo: false,
  fantasma: false,
  tipoBaixaAut: "Direta",
  tipoBaixaOF: "Não faz",
  obsPlanjamento: "",
  descrComercial: "",
  fatorConvVol: "",
  almoxTransf: "",
  alterarDescrFat: false,
  emiteEtiquetas: false,
  montagemVolExp: false,
  embalagDif: false,
  retencaoPisCofins: false,
  tipoVenda: "Venda",
  itemEmbalagem: "",
  multiploVenda: "",
  minVenda: "",
  embalagem: false,
  tempoGarantia: "",
  almoxAssTec: "",
  entregaEstimada: "",
  foccoMobile: false,
  embExportacao: false,
  classificacaoCom: "",
  obsComercial: "",
  classifFiscVenda: "",
  classifFiscCompra: "",
  aliqIpiVenda: "",
  aliqIpiCompra: "",
  tipoIpiVenda: "Percentual",
  tipoIpiCompra: "Percentual",
  aliqIcms: "",
  umVenda: "",
  umCompra: "",
  origem: "",
  grupoInventario: "",
  classificacaoCont: "",
  cest: "",
  insumo: "",
  calculaPisCofins: "HERDAR",
  obsContabil: "",
  umSuprimentos: "UN",
  almoxSuprimentos: "",
  checkListReceb: false,
  controleSafra: false,
  tipoUtilizacao: "Industrialização",
  classifSuprimentos: "",
  obsSuprimentos: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Vent0200Page(): JSX.Element {
  const [form, setForm] = useState<FormItem>(formInicial);
  const [aba, setAba] = useState<AbaAtiva>("capa");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<
    { type: "success" | "error"; message: string } | null
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
  const [classificacoesFiscais, setClassificacoesFiscais] = useState<FiscalClassification[]>([]);

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
    if (form.fatorConvVol.trim() && Number(form.fatorConvVol) <= 0)
      e.fatorConvVol = "Fator de conversão deve ser maior que zero.";
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
    fatorConvVol: { label: "Fator de conversão de volume", aba: "comercial" },
    multiploVenda: { label: "Múltiplo de venda", aba: "comercial" },
    minVenda: { label: "Mínimo de venda", aba: "comercial" },
    entregaEstimada: { label: "Entrega estimada", aba: "comercial" },
    tempoGarantia: { label: "Tempo de garantia", aba: "comercial" },
    cest: { label: "CEST", aba: "contabil" },
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
        message: `Verifique: ${faltando
          .map((k) => CAMPO_INFO[k]?.label ?? k)
          .join(", ")}.`,
      });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const bruto = Number(form.grossWeight || 0);
      const liquido = Number(form.netWeight || 0);
      const optionalNumber = (value: string): number | undefined => {
        if (!value.trim()) return undefined;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      };
      const created = await createItem({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        complement: form.complement.trim() || undefined,
        nature: form.nature,
        situation: form.situation,
        health: form.health,
        pdm: {
          group_code: Number(form.groupID),
          modifier_code: Number(form.modifierID),
          attributes: [],
          description_technique: form.description.trim() || form.name.trim(),
        },
        warehouse: {
          warehouse_code: Number(form.warehouseID) || 1,
          unit_of_measurement: form.unitOfMeasurement,
          automatic_low: form.automaticLow,
          minimum_stock: Number(form.cyclicalCountMinStock) || 0,
          ...(form.cyclicalCount
            ? { cyclical_count_config: { days_interval: Number(form.cyclicalCountDays) || 0 } }
            : {}),
        },
        engineering: {
          ...(form.itemBaseCod.trim() ? { item_base_cod: form.itemBaseCod.trim() } : {}),
          weight: { gross: bruto, net: liquido, unit: "KG" },
          type: form.type,
          type_struct: form.typeStruct,
          oem: form.oem,
        },
        planning: {
          type_mrp: form.typePlanejamento,
          llc: Number(form.llc) || 0,
          ghost: form.fantasma,
        },
        supplies: { type_of_use: TIPO_UTILIZACAO_WIRE[form.tipoUtilizacao] },
        commercial: {
          description: form.descrComercial.trim() || undefined,
          sale_type: form.tipoVenda.toUpperCase(),
          volume_conversion_factor: optionalNumber(form.fatorConvVol),
          sale_multiple: optionalNumber(form.multiploVenda),
          minimum_sale_quantity: optionalNumber(form.minVenda),
          estimated_delivery_days: optionalNumber(form.entregaEstimada),
          warranty_days: optionalNumber(form.tempoGarantia) ?? 0,
          transfer_warehouse_code: optionalNumber(form.almoxTransf),
          technical_assistance_warehouse_code: optionalNumber(form.almoxAssTec),
          packaging_item_code: form.itemEmbalagem.trim() || undefined,
          allow_billing_description_change: form.alterarDescrFat,
          issue_loading_labels: form.emiteEtiquetas,
          assemble_shipping_volumes: form.montagemVolExp,
          requires_special_packaging: form.embalagDif,
          withhold_pis_cofins: form.retencaoPisCofins,
          is_packaging: form.embalagem,
          mobile_enabled: form.foccoMobile,
          export_packaging: form.embExportacao,
          classification_code: form.classificacaoCom.trim() || undefined,
          notes: form.obsComercial.trim() || undefined,
        },
        accounting: {
          sale_fiscal_classification_code: form.classifFiscVenda.trim() || undefined,
          purchase_fiscal_classification_code: form.classifFiscCompra.trim() || undefined,
          ...(form.origem ? { origin: Number(form.origem.split(" ", 1)[0]) } : {}),
          sale_ipi_type: form.tipoIpiVenda.toUpperCase(),
          sale_ipi_rate: optionalNumber(form.aliqIpiVenda),
          purchase_ipi_type: form.tipoIpiCompra.toUpperCase(),
          purchase_ipi_rate: optionalNumber(form.aliqIpiCompra),
          icms_rate: optionalNumber(form.aliqIcms),
          sale_unit_of_measurement: form.umVenda || undefined,
          purchase_unit_of_measurement: form.umCompra || undefined,
          inventory_group_code: optionalNumber(form.grupoInventario),
          accounting_classification_code: form.classificacaoCont.trim() || undefined,
          cest: form.cest.trim() || undefined,
          input_code: form.insumo.trim() || undefined,
          ...(form.calculaPisCofins === "HERDAR" ? {} : { calculate_pis_cofins: form.calculaPisCofins === "SIM" }),
          notes: form.obsContabil.trim() || undefined,
        },
      });
      const codigoGravado = parseStr(created, "code", "Code") || form.code.trim() || "gerado automaticamente";
      setFeedback({ type: "success", message: `Item ${codigoGravado} gravado com sucesso.` });
      setForm(formInicial);
      setErrors({});
      setSubmitTentado(false);
      setAba("capa");
    } catch (err) {
      setFeedback({ type: "error", message: errMessage(err, "Não foi possível gravar o item.") });
    } finally {
      setIsSaving(false);
    }
  }

  async function aplicarItemBase(code: string | undefined) {
    setField("itemBaseCod", code ? String(code) : "");
    if (!code) return;
    try {
      const base = await getItemTemplate(code);
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
      setForm((current) => ({
        ...current,
        itemBaseCod: String(code),
        groupID: String(parseNum(pdm, "group_code", "GroupCode") || current.groupID),
        modifierID: String(parseNum(pdm, "modifier_code", "ModifierCode") || current.modifierID),
        warehouseID: String(parseNum(warehouse, "warehouse_code", "WarehouseCode") || current.warehouseID),
        unitOfMeasurement: (opt(warehouse, "unit_of_measurement", "UnitOfMeasurement") || current.unitOfMeasurement) as TypeUnitOfMeasurementItem,
        automaticLow: parseBool(warehouse, "automatic_low", "AutomaticLow"),
        cyclicalCountMinStock: parseNum(warehouse, "minimum_stock", "MinimumStock"),
        grossWeight: numText(weight, "gross", "Gross"),
        netWeight: numText(weight, "net", "Net"),
        type: (opt(engineering, "type", "Type") || current.type) as TypeItem,
        typeStruct: (opt(engineering, "type_struct", "TypeStruct") || current.typeStruct) as TypeStructItem,
        oem: parseBool(engineering, "oem", "OEM"),
        typePlanejamento: (opt(planning, "type_mrp", "TypeMrp") || current.typePlanejamento) as TypePlanejamento,
        llc: String(parseNum(planning, "llc", "Llc", "LLC") || current.llc),
        fantasma: parseBool(planning, "ghost", "Ghost"),
        descrComercial: opt(commercial, "description", "Description"),
        fatorConvVol: numText(commercial, "volume_conversion_factor", "VolumeConversionFactor"),
        multiploVenda: numText(commercial, "sale_multiple", "SaleMultiple"),
        minVenda: numText(commercial, "minimum_sale_quantity", "MinimumSaleQuantity"),
        entregaEstimada: numText(commercial, "estimated_delivery_days", "EstimatedDeliveryDays"),
        tempoGarantia: numText(commercial, "warranty_days", "WarrantyDays"),
        almoxTransf: numText(commercial, "transfer_warehouse_code", "TransferWarehouseCode"),
        almoxAssTec: numText(commercial, "technical_assistance_warehouse_code", "TechnicalAssistanceWarehouseCode"),
        itemEmbalagem: opt(commercial, "packaging_item_code", "PackagingItemCode"),
        alterarDescrFat: parseBool(commercial, "allow_billing_description_change", "AllowBillingDescriptionChange"),
        emiteEtiquetas: parseBool(commercial, "issue_loading_labels", "IssueLoadingLabels"),
        montagemVolExp: parseBool(commercial, "assemble_shipping_volumes", "AssembleShippingVolumes"),
        embalagDif: parseBool(commercial, "requires_special_packaging", "RequiresSpecialPackaging"),
        retencaoPisCofins: parseBool(commercial, "withhold_pis_cofins", "WithholdPisCofins"),
        embalagem: parseBool(commercial, "is_packaging", "IsPackaging"),
        foccoMobile: parseBool(commercial, "mobile_enabled", "MobileEnabled"),
        embExportacao: parseBool(commercial, "export_packaging", "ExportPackaging"),
        classificacaoCom: opt(commercial, "classification_code", "ClassificationCode"),
        obsComercial: opt(commercial, "notes", "Notes"),
        classifFiscVenda: opt(accounting, "sale_fiscal_classification_code", "SaleFiscalClassificationCode"),
        classifFiscCompra: opt(accounting, "purchase_fiscal_classification_code", "PurchaseFiscalClassificationCode"),
        aliqIpiVenda: numText(accounting, "sale_ipi_rate", "SaleIpiRate"),
        aliqIpiCompra: numText(accounting, "purchase_ipi_rate", "PurchaseIpiRate"),
        aliqIcms: numText(accounting, "icms_rate", "IcmsRate"),
        umVenda: opt(accounting, "sale_unit_of_measurement", "SaleUnitOfMeasurement"),
        umCompra: opt(accounting, "purchase_unit_of_measurement", "PurchaseUnitOfMeasurement"),
        grupoInventario: numText(accounting, "inventory_group_code", "InventoryGroupCode"),
        classificacaoCont: opt(accounting, "accounting_classification_code", "AccountingClassificationCode"),
        cest: opt(accounting, "cest", "Cest"),
        insumo: opt(accounting, "input_code", "InputCode"),
        calculaPisCofins: parseBool(accounting, "calculate_pis_cofins", "CalculatePisCofins") ? "SIM" : "NAO",
        obsContabil: opt(accounting, "notes", "Notes"),
        umSuprimentos: (opt(supplies, "unit_of_measurement", "UnitOfMeasurement") || current.umSuprimentos) as TypeUnitOfMeasurementItem,
        tipoUtilizacao: use === "CONSUMO" ? "Consumo" : use === "IMOBILIZADO" ? "Imobilizado" : "Industrialização",
        obsSuprimentos: opt(supplies, "notes", "Notes"),
      }));
      setFeedback({ type: "success", message: `Configurações do item-base ${code} copiadas. Código, nome e nome técnico do novo item foram mantidos.` });
    } catch (err) {
      setFeedback({ type: "error", message: errMessage(err, "Não foi possível copiar os dados do item-base.") });
    }
  }

  function handleLimpar() {
    setForm(formInicial);
    setErrors({});
    setFeedback(null);
    setSubmitTentado(false);
    setAba("capa");
  }

  // Só conta erros depois da primeira tentativa de salvar — ver `submitTentado`.
  const errCount = submitTentado ? Object.keys(errors).length : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .it-root {
          min-height: 100vh; background: #dfe4e0;
          font-family: 'Inter', sans-serif; color: #1c2b22;
          display: flex; flex-direction: column;
        }

        /* TOPBAR */
        .it-topbar {
          height: 52px; background: #16281d;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .it-topbar-left { display: flex; align-items: center; gap: 10px; }
        .it-logo-mark { width: 28px; height: 28px; background: #2f7d47; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
        .it-app-name  { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .it-app-sub   { display: block; font-size: 9px; font-weight: 400; color: #54655a; }
        .it-screen-title { font-size: 12.5px; font-weight: 500; color: #3f8a58; padding-left: 14px; margin-left: 14px; border-left: 1px solid rgba(255,255,255,0.08); }

        /* ACTION BAR */
        .it-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center; gap: 4px; height: 46px; flex-shrink: 0;
        }
        .it-action-group { display: flex; align-items: center; gap: 2px; padding-right: 10px; margin-right: 6px; border-right: 1px solid #e8f0e4; }
        .it-action-group:last-child { border-right: none; }
        .it-action-label { font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; color: #94a49a; margin-right: 6px; white-space: nowrap; }
        .it-nav-btn { width: 30px; height: 30px; border-radius: 6px; display: flex; align-items: center; justify-content: center; background: transparent; border: 1.5px solid #d4e8d0; cursor: pointer; color: #46574c; transition: background 0.12s; }
        .it-nav-btn:hover { background: #edf7ea; border-color: #a0c8a8; }
        .it-btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 1.5px solid transparent; border-radius: 7px; font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: background 0.13s, border-color 0.13s; }
        .it-btn-primary { background: #16281d; color: #dff0e2; border-color: #16281d; }
        .it-btn-primary:hover:not(:disabled) { background: #1e3728; }
        .it-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .it-btn-ghost { background: transparent; color: #46574c; border-color: #d4e8d0; }
        .it-btn-ghost:hover { background: #f0f8ec; border-color: #a9b6ac; }
        .it-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .it-btn-danger:hover { background: #fff0f0; border-color: #e09090; }

        /* BODY */
        .it-body { flex: 1; padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
        .it-body::-webkit-scrollbar { width: 5px; }
        .it-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        /* CARD */
        .it-card { background: #fff; border: 1px solid #dbe8d5; border-radius: 12px; overflow: hidden; }
        .it-card-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9; }
        .it-card-header-left { display: flex; align-items: center; gap: 8px; }
        .it-card-title { font-size: 12px; font-weight: 600; color: #253a2d; text-transform: uppercase; letter-spacing: 0.6px; }
        .it-card-badge { font-size: 10.5px; font-weight: 500; color: #2f7d47; background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px; }
        .it-err-badge { font-size: 10.5px; font-weight: 600; color: #b94040; background: #fdecea; border: 1px solid #f0c8c8; border-radius: 12px; padding: 2px 8px; }

        /* ABAS */
        .it-tabs { display: flex; align-items: flex-end; border-bottom: 2px solid #dbe8d5; background: #fafcf9; overflow-x: auto; }
        .it-tabs::-webkit-scrollbar { height: 3px; }
        .it-tab { padding: 10px 18px; font-size: 12.5px; font-weight: 500; color: #6b7d71; cursor: pointer; border: none; background: transparent; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: color 0.13s, border-color 0.13s; white-space: nowrap; font-family: 'Inter', sans-serif; }
        .it-tab:hover { color: #253a2d; }
        .it-tab.active { color: #16281d; border-bottom-color: #2f7d47; font-weight: 600; }
        .it-tab-body { padding: 20px 18px; }

        /* GRID / FIELDS */
        .it-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .it-col-1  { grid-column: span 1; }
        .it-col-2  { grid-column: span 2; }
        .it-col-3  { grid-column: span 3; }
        .it-col-4  { grid-column: span 4; }
        .it-col-5  { grid-column: span 5; }
        .it-col-6  { grid-column: span 6; }
        .it-col-8  { grid-column: span 8; }
        .it-col-9  { grid-column: span 9; }
        .it-col-10 { grid-column: span 10; }
        .it-col-12 { grid-column: span 12; }

        .it-field { display: flex; flex-direction: column; gap: 5px; }
        .it-label { font-size: 10.5px; font-weight: 600; color: #6b7d71; text-transform: uppercase; letter-spacing: 0.4px; display: flex; align-items: center; gap: 4px; }
        .it-label-req { color: #c84040; font-size: 12px; line-height: 1; }
        .it-field-hint { font-size: 10.5px; color: #94a49a; margin-top: 2px; line-height: 1.5; }
        .it-field-error { font-size: 11px; color: #c84040; margin-top: 2px; display: flex; align-items: center; gap: 4px; }

        .it-input {
          width: 100%; height: 36px; background: #f8fbf6; border: 1.5px solid #d4e8cc;
          border-radius: 7px; padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1c2b22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .it-input:focus { border-color: #2f7d47; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .it-input::placeholder { color: #a9b6ac; font-size: 12px; }
        .it-input:disabled { background: #dfe4e0; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }
        .it-input.err { border-color: #e05252; box-shadow: 0 0 0 2px rgba(224,82,82,0.1); }

        .it-input-num { text-align: right; font-variant-numeric: tabular-nums; }

        .it-textarea { width: 100%; min-height: 64px; background: #f8fbf6; border: 1.5px solid #d4e8cc; border-radius: 7px; padding: 8px 10px; font-family: 'Inter', sans-serif; font-size: 13px; color: #1c2b22; outline: none; resize: vertical; transition: border-color 0.13s, box-shadow 0.13s; }
        .it-textarea:focus { border-color: #2f7d47; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .it-textarea::placeholder { color: #a9b6ac; font-size: 12px; }

        .it-select {
          width: 100%; height: 36px; background: #f8fbf6; border: 1.5px solid #d4e8cc;
          border-radius: 7px; padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1c2b22; outline: none; appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .it-select:focus { border-color: #2f7d47; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .it-select:disabled { background-color: #dfe4e0; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }

        @media (max-width: 700px) {
          .it-root { width: 100%; min-width: 0; overflow-x: hidden; }
          .it-topbar { min-height: 52px; height: auto; padding: 8px 12px; }
          .it-app-name { display: none; }
          .it-screen-title { margin-left: 0; padding-left: 10px; font-size: 11.5px; }
          .it-actionbar { height: auto; min-width: 0; padding: 7px 10px; flex-wrap: wrap; align-items: flex-start; gap: 6px; }
          .it-action-group { max-width: 100%; margin: 0; padding: 0; border-right: 0; flex-wrap: wrap; }
          .it-action-label { width: 100%; margin: 0 0 2px; }
          .it-body { min-width: 0; padding: 10px; overflow-x: hidden; }
          .it-card { width: 100%; min-width: 0; }
          .it-card-header { align-items: flex-start; gap: 8px; padding: 10px 12px; flex-wrap: wrap; }
          .it-tabs { width: 100%; min-width: 0; overscroll-behavior-x: contain; }
          .it-tab { flex: 0 0 auto; padding: 10px 13px; }
          .it-tab-body { min-width: 0; padding: 14px 12px; }
          .it-grid { grid-template-columns: minmax(0, 1fr); gap: 12px; }
          .it-grid > [class*="it-col-"] { grid-column: 1 / -1; min-width: 0; }
          .it-field { min-width: 0; }
        }

        .it-input-wrap { position: relative; display: flex; }
        .it-input-btn { height: 36px; width: 34px; flex-shrink: 0; background: #edf5ea; border: 1.5px solid #d4e8cc; border-left: none; border-radius: 0 7px 7px 0; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #4a8060; transition: background 0.12s; }
        .it-input-btn:hover { background: #ddf0e0; }

        /* Toggle */
        .it-toggle { position: relative; width: 36px; height: 19px; flex-shrink: 0; cursor: pointer; }
        .it-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .it-toggle-track { position: absolute; inset: 0; background: #d4e0d0; border-radius: 20px; transition: background 0.2s; }
        .it-toggle input:checked ~ .it-toggle-track { background: #2f7d47; }
        .it-toggle-thumb { position: absolute; top: 2.5px; left: 2.5px; width: 14px; height: 14px; background: #fff; border-radius: 50%; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
        .it-toggle input:checked ~ .it-toggle-thumb { transform: translateX(17px); }
        .it-toggle-row { display: flex; align-items: center; gap: 8px; }
        .it-toggle-label { font-size: 13px; color: #46574c; }

        /* Checkbox grid */
        .it-checks { display: flex; flex-wrap: wrap; gap: 10px 20px; }
        .it-check-label { display: flex; align-items: center; gap: 7px; cursor: pointer; user-select: none; }
        .it-checkbox { width: 15px; height: 15px; flex-shrink: 0; border: 1.5px solid #a9b6ac; border-radius: 4px; appearance: none; cursor: pointer; background: #f8fbf6; position: relative; transition: background 0.12s, border-color 0.12s; }
        .it-checkbox:checked { background: #2f7d47; border-color: #2f7d47; }
        .it-checkbox:checked::after { content: ''; position: absolute; left: 4px; top: 1.5px; width: 4px; height: 8px; border: 2px solid #fff; border-top: none; border-left: none; transform: rotate(45deg); }
        .it-check-text { font-size: 12.5px; color: #46574c; }

        /* Section divider */
        .it-sep { height: 1px; background: #edf5e8; margin: 18px 0; }
        .it-sec-label { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #a0b8a8; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
        .it-sec-label::after { content: ''; flex: 1; height: 1px; background: #e8f0e4; }

        /* Info box */
        .it-info-box { display: flex; align-items: flex-start; gap: 10px; background: #f4f9f2; border: 1px solid #d4e8cc; border-radius: 8px; padding: 10px 12px; font-size: 12px; color: #46574c; line-height: 1.55; }

        /* Situação badge inline */
        .it-sit-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; padding: 3px 10px; border-radius: 10px; }
        .it-sit-ativo   { background: #e8f5ea; color: #1a6630; border: 1px solid #b4dec0; }
        .it-sit-inativo { background: #fdecea; color: #991c1c; border: 1px solid #f0c8c8; }

        /* Feedback */
        .it-feedback { display: flex; align-items: center; gap: 9px; padding: 11px 15px; border-radius: 9px; font-size: 13px; animation: itFade 0.2s ease; }
        .it-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .it-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .it-feedback.it-warn { background: #fffbeb; border: 1px solid #fde68a; border-left: 3px solid #f59e0b; color: #92400e; align-items: flex-start; line-height: 1.5; }
        .it-feedback.it-warn svg { flex-shrink: 0; margin-top: 2px; }

        /* Footer */
        .it-footer { background: #fff; border-top: 1px solid #dbe8d5; padding: 8px 20px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .it-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6b7d71; }
        .it-footer-stat strong { color: #1c2b22; font-weight: 600; }
        .it-footer-group { display: flex; align-items: center; gap: 20px; }

        /* Spinner */
        @keyframes spin { to { transform: rotate(360deg); } }
        .it-spinner { width: 14px; height: 14px; border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2; border-radius: 50%; animation: spin 0.65s linear infinite; flex-shrink: 0; }
        @keyframes itFade { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="it-root">
        {/* TOPBAR */}
        <header className="it-topbar">
          <div className="it-topbar-left">
            <div className="it-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect
                  x="1.5"
                  y="1.5"
                  width="6"
                  height="6"
                  rx="1.2"
                  fill="rgba(255,255,255,0.9)"
                />
                <rect
                  x="10.5"
                  y="1.5"
                  width="6"
                  height="6"
                  rx="1.2"
                  fill="rgba(255,255,255,0.4)"
                />
                <rect
                  x="1.5"
                  y="10.5"
                  width="6"
                  height="6"
                  rx="1.2"
                  fill="rgba(255,255,255,0.4)"
                />
                <rect
                  x="10.5"
                  y="10.5"
                  width="6"
                  height="6"
                  rx="1.2"
                  fill="rgba(255,255,255,0.7)"
                />
              </svg>
            </div>
            <span className="it-app-name">
              Venture<span className="it-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="it-screen-title">VENT0200 — Cadastro de Item</span>
          </div>
        </header>

        {/* ACTION BAR */}
        <div className="it-actionbar">
          <div className="it-action-group">
            <span className="it-action-label">Nav</span>
            {[
              { title: "Primeiro", path: "M9 2L3 6l6 4M2 2v8" },
              { title: "Anterior", path: "M8 2L4 6l4 4" },
              { title: "Próximo", path: "M4 2l4 4-4 4" },
              { title: "Último", path: "M3 2l6 4-6 4M10 2v8" },
            ].map(({ title, path }) => (
              <button key={title} className="it-nav-btn" title={title}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d={path}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ))}
          </div>

          <div className="it-action-group">
            <span className="it-action-label">Ações</span>
            <button
              className="it-btn it-btn-primary"
              onClick={handleSalvar}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="it-spinner" />
                  Salvando...
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5 2v4h6V2M5 9h6"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                  Salvar
                </>
              )}
            </button>
            <button className="it-btn it-btn-danger" onClick={handleLimpar}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 3l10 10M13 3L3 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Limpar
            </button>
            <button className="it-btn it-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Apagar
            </button>
          </div>

          <div className="it-action-group">
            <span className="it-action-label">Ferramentas</span>
            <button className="it-btn it-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M8 7v4M8 5.5h.01"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              Ajuda
            </button>
            <button className="it-btn it-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <rect
                  x="2"
                  y="3"
                  width="12"
                  height="10"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M5 7h6M5 10h4"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              PDM
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="it-body">
          {feedback?.type === "success" && (
            <div className="it-feedback success">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 8l3.5 3.5L13 5"
                  stroke="#1e6030"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {feedback.message}
            </div>
          )}
          {feedback?.type === "error" && (
            <div className="it-feedback error">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="#e05252"
                  strokeWidth="1.4"
                />
                <path
                  d="M8 5v3.5M8 10.5h.01"
                  stroke="#e05252"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              {feedback.message}
            </div>
          )}

          <div className="it-card">
            <div className="it-card-header">
              <div className="it-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect
                    x="1"
                    y="1"
                    width="14"
                    height="14"
                    rx="2"
                    stroke="#2f7d47"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M5 8h6M8 5v6"
                    stroke="#2f7d47"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="it-card-title">Cadastro de Item</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {errCount > 0 && (
                  <span className="it-err-badge">
                    {errCount} erro{errCount > 1 ? "s" : ""}
                  </span>
                )}
                <span className="it-card-badge">VENT0200</span>
                <span
                  className={`it-sit-badge ${form.health === "ATIVO" ? "it-sit-ativo" : "it-sit-inativo"}`}
                >
                  {form.health === "ATIVO" ? "Ativo" : form.health === "INATIVO" ? "Inativo" : "Fantasma"}
                </span>
              </div>
            </div>

            {/* ABAS */}
            <div className="it-tabs">
              {ABAS.map((a) => (
                <button
                  key={a.id}
                  className={`it-tab${aba === a.id ? " active" : ""}`}
                  onClick={() => setAba(a.id)}
                >
                  {a.label}
                </button>
              ))}
            </div>

            {/* ── ABA: CAPA ── */}
            {aba === "capa" && (
              <div className="it-tab-body">
                <div className="it-grid">
                  <div className="it-field it-col-3">
                    <label className="it-label">
                      Código
                    </label>
                    <input
                      className={`it-input${errors.code ? " err" : ""}`}
                      type="text"
                      maxLength={60}
                      value={form.code}
                      onChange={(e) => setField("code", e.target.value.toUpperCase())}
                      placeholder="Ex.: TEA452-0 (vazio = automático)"
                    />
                    {errors.code && (
                      <span className="it-field-error">
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <circle
                            cx="6"
                            cy="6"
                            r="5"
                            stroke="#c84040"
                            strokeWidth="1.2"
                          />
                          <path
                            d="M6 4v2.5M6 8h.01"
                            stroke="#c84040"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                          />
                        </svg>
                        {errors.code}
                      </span>
                    )}
                    <span className="it-field-hint">
                      Número inteiro maior que zero.
                    </span>
                  </div>

                  <div className="it-field it-col-7">
                    <label className="it-label">
                      Nome <span className="it-label-req">*</span>
                    </label>
                    <input
                      className={`it-input${errors.name ? " err" : ""}`}
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                      placeholder="Nome resumido do item"
                      maxLength={60}
                    />
                    {errors.name && (
                      <span className="it-field-error">
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <circle
                            cx="6"
                            cy="6"
                            r="5"
                            stroke="#c84040"
                            strokeWidth="1.2"
                          />
                          <path
                            d="M6 4v2.5M6 8h.01"
                            stroke="#c84040"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                          />
                        </svg>
                        {errors.name}
                      </span>
                    )}
                    <span className="it-field-hint">
                      Usado como descrição técnica quando o campo abaixo ficar em branco.
                    </span>
                  </div>

                  <div className="it-field it-col-2">
                    <label className="it-label">Situação</label>
                    <select
                      className="it-select"
                      value={form.situation}
                      onChange={(e) =>
                        setField(
                          "situation",
                          e.target.value as TypeSituationItem,
                        )
                      }
                    >
                      <option value="LINHA">Linha</option>
                      <option value="PROMOCAO">Promoção</option>
                    </select>
                    <span className="it-field-hint">
                      Linha = item de catálogo corrente; Promoção = campanha temporária.
                    </span>
                  </div>

                  <div className="it-field it-col-9">
                    <label className="it-label">
                      Nome técnico detalhado
                    </label>
                    <input
                      className={`it-input${errors.description ? " err" : ""}`}
                      value={form.description}
                      onChange={(e) => setField("description", e.target.value)}
                      placeholder="Opcional; se vazio, será usado o nome do item"
                    />
                    {errors.description && (
                      <span className="it-field-error">
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <circle
                            cx="6"
                            cy="6"
                            r="5"
                            stroke="#c84040"
                            strokeWidth="1.2"
                          />
                          <path
                            d="M6 4v2.5M6 8h.01"
                            stroke="#c84040"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                          />
                        </svg>
                        {errors.description}
                      </span>
                    )}
                  </div>

                  <div className="it-field it-col-3">
                    <label className="it-label">Complemento do nome</label>
                    <input
                      className="it-input"
                      value={form.complement}
                      onChange={(e) => setField("complement", e.target.value)}
                      placeholder="Ex.: linha premium"
                    />
                  </div>

                  <div className="it-field it-col-3">
                    <label className="it-label">
                      Grupo (PDM) <span className="it-label-req">*</span>
                    </label>
                    <LookupField
                      value={Number(form.groupID) || undefined}
                      onChange={(code) => setField("groupID", code ? String(code) : "")}
                      loader={loadPdmGroups}
                      entityLabel="grupo"
                      placeholder="Selecionar grupo…"
                    />
                    {errors.groupID
                      ? <span className="it-field-error">{errors.groupID}</span>
                      : <span className="it-field-hint">Cadastre em VITE0114 antes do item.</span>}
                  </div>

                  <div className="it-field it-col-3">
                    <label className="it-label">
                      Modificador (PDM) <span className="it-label-req">*</span>
                    </label>
                    <LookupField
                      value={Number(form.modifierID) || undefined}
                      onChange={(code) => setField("modifierID", code ? String(code) : "")}
                      loader={loadPdmModifiers}
                      entityLabel="modificador"
                      placeholder="Selecionar modificador…"
                    />
                    {errors.modifierID
                      ? <span className="it-field-error">{errors.modifierID}</span>
                      : <span className="it-field-hint">Cadastre em VITE0115 antes do item.</span>}
                  </div>

                  <div className="it-field it-col-3">
                    <label className="it-label">Estado</label>
                    <select
                      className="it-select"
                      value={form.health}
                      onChange={(e) =>
                        setField("health", e.target.value as Health)
                      }
                    >
                      <option value="ATIVO">Ativo</option>
                      <option value="INATIVO">Inativo</option>
                      <option value="FANTASMA">Fantasma</option>
                    </select>
                  </div>

                  <div className="it-field it-col-4">
                    <label className="it-label">Natureza</label>
                    <select
                      className="it-select"
                      value={form.nature}
                      onChange={(e) =>
                        setField("nature", e.target.value as unknown as ItemNature)
                      }
                    >
                      {NATUREZAS.map((n) => (
                        <option key={n.value} value={n.value}>{n.label}</option>
                      ))}
                    </select>
                    <span className="it-field-hint">
                      {NATUREZAS.find((n) => n.value === form.nature)?.hint}
                    </span>
                  </div>

                  <div className="it-field it-col-8">
                    <label className="it-label">Indicadores</label>
                    <div className="it-checks">
                      <label
                        className="it-check-label"
                        title="Operações externas / terceiros"
                      >
                        <input
                          type="checkbox"
                          className="it-checkbox"
                          checked={form.process}
                          onChange={(e) => setField("process", e.target.checked)}
                        />
                        <span className="it-check-text">Item de Processo</span>
                      </label>
                    </div>
                  </div>

                  <div className="it-field it-col-12">
                    <label className="it-label">Observações</label>
                    <textarea
                      className="it-textarea"
                      value={form.observations}
                      onChange={(e) => setField("observations", e.target.value)}
                      placeholder="Observações gerais..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── ABA: ESTOQUE ── */}
            {aba === "estoque" && (
              <div className="it-tab-body">
                <div className="it-grid">
                  <div className="it-field it-col-4">
                    <label className="it-label">Almoxarifado</label>
                    <LookupField
                      value={Number(form.warehouseID) || undefined}
                      onChange={(code) => setField("warehouseID", code ? String(code) : "")}
                      loader={loadWarehouses}
                      entityLabel="almoxarifado"
                      placeholder="Selecionar almoxarifado…"
                    />
                    <span className="it-field-hint">
                      Depósito padrão de estoque do item. Em branco = almoxarifado 1.
                    </span>
                  </div>

                  <div className="it-field it-col-3">
                    <label className="it-label">Unidade de Medida</label>
                    <select
                      className="it-select"
                      value={form.unitOfMeasurement}
                      onChange={(e) =>
                        setField(
                          "unitOfMeasurement",
                          e.target.value as TypeUnitOfMeasurementItem,
                        )
                      }
                    >
                      {UNIDADES.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                    <span className="it-field-hint">
                      UM utilizada no armazenamento.
                    </span>
                  </div>

                  <div className="it-field it-col-5">
                    <label className="it-label">Indicadores de Estoque</label>
                    <div className="it-checks" style={{ paddingTop: 4 }}>
                      <label className="it-check-label">
                        <input
                          type="checkbox"
                          className="it-checkbox"
                          checked={form.automaticLow}
                          onChange={(e) =>
                            setField("automaticLow", e.target.checked)
                          }
                        />
                        <span className="it-check-text">
                          Faz Baixa Automática
                        </span>
                      </label>
                      <label className="it-check-label">
                        <input
                          type="checkbox"
                          className="it-checkbox"
                          checked={form.cyclicalCount}
                          onChange={(e) =>
                            setField("cyclicalCount", e.target.checked)
                          }
                        />
                        <span className="it-check-text">Contagem Cíclica</span>
                      </label>
                    </div>
                  </div>

                  {form.cyclicalCount && (
                    <>
                      <div
                        className="it-sep"
                        style={{ gridColumn: "span 12" }}
                      />
                      <div
                        className="it-sec-label"
                        style={{ gridColumn: "span 12" }}
                      >
                        Configuração de Contagem Cíclica
                      </div>

                      <div className="it-field it-col-3">
                        <label className="it-label">Intervalo (dias)</label>
                        <input
                          className="it-input it-input-num"
                          type="number"
                          min={1}
                          value={form.cyclicalCountDays || ""}
                          onChange={(e) =>
                            setField(
                              "cyclicalCountDays",
                              Number(e.target.value),
                            )
                          }
                          placeholder="Ex: 30"
                        />
                        <span className="it-field-hint">
                          A cada quantos dias contar.
                        </span>
                      </div>

                      <div className="it-field it-col-3">
                        <label className="it-label">
                          Estoque Mínimo Alerta
                        </label>
                        <input
                          className="it-input it-input-num"
                          type="number"
                          min={0}
                          value={form.cyclicalCountMinStock || ""}
                          onChange={(e) =>
                            setField(
                              "cyclicalCountMinStock",
                              Number(e.target.value),
                            )
                          }
                          placeholder="Qtde mínima"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── ABA: ENGENHARIA ── */}
            {aba === "engenharia" && (
              <div className="it-tab-body">
                <div className="it-grid">
                  <div className="it-field it-col-3">
                    <label className="it-label">Tipo de Item</label>
                    <select
                      className="it-select"
                      value={form.type}
                      onChange={(e) =>
                        setField("type", e.target.value as TypeItem)
                      }
                    >
                      {TIPOS_ITEM.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="it-field it-col-3">
                    <label className="it-label">Tipo de Estrutura</label>
                    <select
                      className="it-select"
                      value={form.typeStruct}
                      onChange={(e) =>
                        setField("typeStruct", e.target.value as TypeStructItem)
                      }
                    >
                      {TIPOS_STRUCT.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="it-field it-col-3">
                    <label className="it-label">
                      Usar item-base como modelo
                    </label>
                    <LookupField
                      value={form.itemBaseCod || undefined}
                      onChange={(code) => void aplicarItemBase(code)}
                      loader={loadBaseItems}
                      entityLabel="item base"
                      placeholder="Selecionar item base…"
                    />
                    {errors.itemBaseCod
                      ? <span className="it-field-error">{errors.itemBaseCod}</span>
                      : <span className="it-field-hint">
                          Opcional. Ao selecionar, copia as configurações das demais abas; código, nome e nome técnico continuam sendo os do novo item.
                        </span>}
                  </div>

                  <div className="it-field it-col-3">
                    <label className="it-label">OEM</label>
                    <div className="it-toggle-row" style={{ paddingTop: 8 }}>
                      <label className="it-toggle">
                        <input
                          type="checkbox"
                          checked={form.oem}
                          onChange={(e) => setField("oem", e.target.checked)}
                        />
                        <div className="it-toggle-track" />
                        <div className="it-toggle-thumb" />
                      </label>
                      <span className="it-toggle-label">
                        {form.oem ? "Sim" : "Não"}
                      </span>
                    </div>
                    <span className="it-field-hint">
                      Montado sob marca de outra empresa.
                    </span>
                  </div>

                  <div className="it-sep" style={{ gridColumn: "span 12" }} />
                  <div
                    className="it-sec-label"
                    style={{ gridColumn: "span 12" }}
                  >
                    Dimensões e Peso
                  </div>

                  <div className="it-field it-col-2">
                    <label className="it-label">Peso Bruto (kg)</label>
                    <input
                      className="it-input it-input-num"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.grossWeight}
                      onChange={(e) => setField("grossWeight", e.target.value)}
                      placeholder="0,00"
                    />
                  </div>

                  <div className="it-field it-col-2">
                    <label className="it-label">Peso Líquido (kg)</label>
                    <input
                      className="it-input it-input-num"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.netWeight}
                      onChange={(e) => setField("netWeight", e.target.value)}
                      placeholder="0,00"
                    />
                  </div>

                  <div className="it-field it-col-2">
                    <label className="it-label">Volume Cúbico (m³)</label>
                    <input
                      className="it-input it-input-num"
                      type="number"
                      min={0}
                      step="0.0001"
                      value={form.cubicVolume}
                      onChange={(e) => setField("cubicVolume", e.target.value)}
                      placeholder="0,0000"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── ABA: PLANEJAMENTO ── */}
            {aba === "planejamento" && (
              <div className="it-tab-body">
                <div className="it-grid">
                  <div className="it-field it-col-4">
                    <label className="it-label">Tipo de Planejamento</label>
                    <select
                      className="it-select"
                      value={form.typePlanejamento}
                      onChange={(e) =>
                        setField(
                          "typePlanejamento",
                          e.target.value as TypePlanejamento,
                        )
                      }
                    >
                      {TIPOS_PLAN.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="it-field it-col-4">
                    <label className="it-label">Classificação</label>
                    <div className="it-input-wrap">
                      <input
                        className="it-input"
                        value={form.classificacaoPlan}
                        onChange={(e) =>
                          setField("classificacaoPlan", e.target.value)
                        }
                        placeholder="Código de classificação"
                      />
                    </div>
                  </div>

                  <div className="it-field it-col-2">
                    <label className="it-label">LLC</label>
                    <input
                      className="it-input it-input-num"
                      type="number"
                      min={0}
                      max={9}
                      value={form.llc}
                      onChange={(e) => setField("llc", e.target.value)}
                      placeholder="2"
                    />
                    <span className="it-field-hint">
                      Nível na estrutura: 1 = produto final · 2–8 = intermediários · 9 = matéria-prima.
                    </span>
                  </div>

                  <div className="it-sep" style={{ gridColumn: "span 12" }} />
                  <div
                    className="it-sec-label"
                    style={{ gridColumn: "span 12" }}
                  >
                    Lotes
                  </div>

                  <div className="it-field it-col-2">
                    <label className="it-label">Lote Mínimo</label>
                    <input
                      className="it-input it-input-num"
                      type="number"
                      min={0}
                      value={form.lotMinimo}
                      onChange={(e) => setField("lotMinimo", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="it-field it-col-2">
                    <label className="it-label">Lote Máximo</label>
                    <input
                      className="it-input it-input-num"
                      type="number"
                      min={0}
                      value={form.lotMaximo}
                      onChange={(e) => setField("lotMaximo", e.target.value)}
                      placeholder="9999"
                    />
                  </div>
                  <div className="it-field it-col-2">
                    <label className="it-label">Lote Múltiplo</label>
                    <input
                      className="it-input it-input-num"
                      type="number"
                      min={0}
                      value={form.lotMultiplo}
                      onChange={(e) => setField("lotMultiplo", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="it-field it-col-2">
                    <label className="it-label">Qtde Máx. Ordem</label>
                    <input
                      className="it-input it-input-num"
                      type="number"
                      min={0}
                      value={form.qtdeMaxOrdem}
                      onChange={(e) => setField("qtdeMaxOrdem", e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="it-sep" style={{ gridColumn: "span 12" }} />
                  <div
                    className="it-sec-label"
                    style={{ gridColumn: "span 12" }}
                  >
                    Estoque e Tempos
                  </div>

                  <div className="it-field it-col-2">
                    <label className="it-label">Estq. Segurança</label>
                    <input
                      className="it-input it-input-num"
                      type="number"
                      min={0}
                      value={form.estoqueSeguranca}
                      onChange={(e) =>
                        setField("estoqueSeguranca", e.target.value)
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="it-field it-col-2">
                    <label className="it-label">Tempo Segurança</label>
                    <input
                      className="it-input it-input-num"
                      type="number"
                      min={0}
                      value={form.tempoSeguranca}
                      onChange={(e) =>
                        setField("tempoSeguranca", e.target.value)
                      }
                      placeholder="Dias úteis"
                    />
                  </div>
                  <div className="it-field it-col-2">
                    <label className="it-label">Tempo Reposição</label>
                    <input
                      className="it-input it-input-num"
                      type="number"
                      min={0}
                      value={form.tempoReposicao}
                      onChange={(e) =>
                        setField("tempoReposicao", e.target.value)
                      }
                      placeholder="Dias úteis"
                    />
                  </div>
                  <div className="it-field it-col-2">
                    <label className="it-label">Cobertura (dias)</label>
                    <input
                      className="it-input it-input-num"
                      type="number"
                      min={0}
                      value={form.cobertura}
                      onChange={(e) => setField("cobertura", e.target.value)}
                      placeholder="Dias úteis"
                    />
                  </div>
                  <div className="it-field it-col-2">
                    <label className="it-label">Cob. Seg. Demanda</label>
                    <input
                      className="it-input it-input-num"
                      type="number"
                      min={0}
                      value={form.coberturaSegDem}
                      onChange={(e) =>
                        setField("coberturaSegDem", e.target.value)
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="it-field it-col-2">
                    <label className="it-label">Agrupamento (dias)</label>
                    <input
                      className="it-input it-input-num"
                      type="number"
                      min={0}
                      value={form.agrupamento}
                      onChange={(e) => setField("agrupamento", e.target.value)}
                      placeholder="Dias corridos"
                    />
                  </div>

                  <div className="it-sep" style={{ gridColumn: "span 12" }} />
                  <div
                    className="it-sec-label"
                    style={{ gridColumn: "span 12" }}
                  >
                    Baixa de Produção
                  </div>

                  <div className="it-field it-col-3">
                    <label className="it-label">Tp. Baixa Automática</label>
                    <select
                      className="it-select"
                      value={form.tipoBaixaAut}
                      onChange={(e) =>
                        setField("tipoBaixaAut", e.target.value as TypeBaixaAut)
                      }
                    >
                      <option>Direta</option>
                      <option>Transferência</option>
                    </select>
                  </div>
                  <div className="it-field it-col-3">
                    <label className="it-label">Baixa OF</label>
                    <select
                      className="it-select"
                      value={form.tipoBaixaOF}
                      onChange={(e) =>
                        setField("tipoBaixaOF", e.target.value as TypeBaixaOF)
                      }
                    >
                      <option>Não faz</option>
                      <option>Cadastro/Liberação</option>
                      <option>Entrega de Produção</option>
                    </select>
                  </div>

                  <div className="it-field it-col-12">
                    <label className="it-label">Indicadores</label>
                    <div className="it-checks">
                      {(
                        [
                          {
                            key: "critico",
                            label: "Crítico (MPS)",
                            hint: "Item crítico para análise da linha crítica no MPS",
                          },
                          {
                            key: "exclusivo",
                            label: "Exclusivo",
                            hint: "Exclusivo para promessa de entrega",
                          },
                          {
                            key: "fantasma",
                            label: "Fantasma",
                            hint: "Nível na estrutura sem controle de estoque",
                          },
                        ] as {
                          key: keyof FormItem;
                          label: string;
                          hint: string;
                        }[]
                      ).map(({ key, label, hint }) => (
                        <label
                          key={key}
                          className="it-check-label"
                          title={hint}
                        >
                          <input
                            type="checkbox"
                            className="it-checkbox"
                            checked={form[key] as boolean}
                            onChange={(e) => setField(key, e.target.checked)}
                          />
                          <span className="it-check-text">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="it-field it-col-12">
                    <label className="it-label">Observações</label>
                    <textarea
                      className="it-textarea"
                      value={form.obsPlanjamento}
                      onChange={(e) =>
                        setField("obsPlanjamento", e.target.value)
                      }
                      placeholder="Observações de planejamento..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── ABA: COMERCIAL ── */}
            {aba === "comercial" && (
              <div className="it-tab-body">
                <div className="it-grid">
                  <div className="it-field it-col-8">
                    <label className="it-label">Descrição Comercial</label>
                    <input
                      className="it-input"
                      value={form.descrComercial}
                      onChange={(e) =>
                        setField("descrComercial", e.target.value)
                      }
                      placeholder="Descrição usada em pedidos e notas fiscais"
                    />
                  </div>

                  <div className="it-field it-col-2">
                    <label className="it-label">Tipo Venda</label>
                    <select
                      className="it-select"
                      value={form.tipoVenda}
                      onChange={(e) =>
                        setField("tipoVenda", e.target.value as TypeVenda)
                      }
                    >
                      <option>Venda</option>
                      <option>Revenda</option>
                    </select>
                  </div>

                  <div className="it-field it-col-2">
                    <label className="it-label">Fator Conv. Volume</label>
                    <input
                      className="it-input it-input-num"
                      type="number"
                      min={0}
                      step="0.0001"
                      value={form.fatorConvVol}
                      onChange={(e) => setField("fatorConvVol", e.target.value)}
                      placeholder="1,0000"
                    />
                  </div>

                  <div className="it-field it-col-2">
                    <label className="it-label">Múltiplo de Venda</label>
                    <input
                      className="it-input it-input-num"
                      type="number"
                      min={0}
                      value={form.multiploVenda}
                      onChange={(e) =>
                        setField("multiploVenda", e.target.value)
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="it-field it-col-2">
                    <label className="it-label">Mínimo de Venda</label>
                    <input
                      className="it-input it-input-num"
                      type="number"
                      min={0}
                      value={form.minVenda}
                      onChange={(e) => setField("minVenda", e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="it-field it-col-2">
                    <label className="it-label">Entrega Estimada (dias)</label>
                    <input
                      className="it-input it-input-num"
                      type="number"
                      min={0}
                      value={form.entregaEstimada}
                      onChange={(e) =>
                        setField("entregaEstimada", e.target.value)
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="it-field it-col-2">
                    <label className="it-label">Tempo de Garantia (dias)</label>
                    <input
                      className="it-input it-input-num"
                      type="number"
                      min={0}
                      value={form.tempoGarantia}
                      onChange={(e) =>
                        setField("tempoGarantia", e.target.value)
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="it-field it-col-4">
                    <label className="it-label">Almox. Transferência</label>
                    <div className="it-input-wrap">
                      <input
                        className="it-input"
                        value={form.almoxTransf}
                        onChange={(e) =>
                          setField("almoxTransf", e.target.value)
                        }
                        placeholder="Código"
                      />
                    </div>
                  </div>

                  <div className="it-field it-col-4">
                    <label className="it-label">Almox. Ass. Técnica</label>
                    <div className="it-input-wrap">
                      <input
                        className="it-input"
                        value={form.almoxAssTec}
                        onChange={(e) =>
                          setField("almoxAssTec", e.target.value)
                        }
                        placeholder="Código"
                      />
                    </div>
                  </div>

                  <div className="it-field it-col-4">
                    <label className="it-label">Item Embalagem</label>
                    <div className="it-input-wrap">
                      <input
                        className="it-input"
                        value={form.itemEmbalagem}
                        onChange={(e) =>
                          setField("itemEmbalagem", e.target.value)
                        }
                        placeholder="Código do item embalagem"
                      />
                    </div>
                  </div>

                  <div className="it-field it-col-12">
                    <label className="it-label">Indicadores</label>
                    <div className="it-checks">
                      {(
                        [
                          {
                            key: "alterarDescrFat",
                            label: "Alterar Descr. no Faturamento",
                          },
                          {
                            key: "emiteEtiquetas",
                            label: "Emite Etiquetas de Carregamento",
                          },
                          {
                            key: "montagemVolExp",
                            label: "Montagem de Volumes de Expedição",
                          },
                          {
                            key: "embalagDif",
                            label: "Embalagem Diferenciada",
                          },
                          {
                            key: "retencaoPisCofins",
                            label: "Retenção PIS/COFINS",
                          },
                          { key: "embalagem", label: "É Embalagem" },
                          { key: "foccoMobile", label: "FoccoMOBILE" },
                          { key: "embExportacao", label: "Emb. Exportação" },
                        ] as { key: keyof FormItem; label: string }[]
                      ).map(({ key, label }) => (
                        <label key={key} className="it-check-label">
                          <input
                            type="checkbox"
                            className="it-checkbox"
                            checked={form[key] as boolean}
                            onChange={(e) => setField(key, e.target.checked)}
                          />
                          <span className="it-check-text">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="it-field it-col-12">
                    <label className="it-label">Observações</label>
                    <textarea
                      className="it-textarea"
                      value={form.obsComercial}
                      onChange={(e) => setField("obsComercial", e.target.value)}
                      placeholder="Observações comerciais..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── ABA: CONTÁBIL ── */}
            {aba === "contabil" && (
              <div className="it-tab-body">
                <div className="it-grid">
                  <div
                    className="it-sec-label"
                    style={{ gridColumn: "span 12" }}
                  >
                    Classificações Fiscais
                  </div>

                  <div className="it-field it-col-4">
                    <label className="it-label">Classif. Fiscal Venda</label>
                    <div className="it-input-wrap">
                      <input
                        className="it-input"
                        list="classificacoes-fiscais-item"
                        value={form.classifFiscVenda}
                        onChange={(e) =>
                          setField("classifFiscVenda", e.target.value)
                        }
                        placeholder="Selecione o código do mestre fiscal"
                      />
                    </div>
                  </div>

                  <div className="it-field it-col-4">
                    <label className="it-label">Classif. Fiscal Compra</label>
                    <div className="it-input-wrap">
                      <input
                        className="it-input"
                        list="classificacoes-fiscais-item"
                        value={form.classifFiscCompra}
                        onChange={(e) =>
                          setField("classifFiscCompra", e.target.value)
                        }
                        placeholder="Selecione o código do mestre fiscal"
                      />
                    </div>
                  </div>

                  <datalist id="classificacoes-fiscais-item">
                    {classificacoesFiscais.map((c) => <option key={c.code} value={c.code}>{c.description}</option>)}
                  </datalist>

                  {(fiscalVenda || fiscalCompra) && (
                    <div className="it-field it-col-12">
                      <div className="it-field-hint">
                        {fiscalVenda && <>Venda herdará de <strong>{fiscalVenda.code} — {fiscalVenda.description}</strong>: NCM {fiscalVenda.ncm || "não definido"}, IPI {fiscalVenda.ipi_rate ?? 0}%, ICMS {fiscalVenda.default_icms_rate ?? 0}%, PIS {fiscalVenda.pis_rate ?? 0}% e COFINS {fiscalVenda.cofins_rate ?? 0}%.</>}
                        {fiscalVenda && fiscalCompra && <br />}
                        {fiscalCompra && <>Compra herdará de <strong>{fiscalCompra.code} — {fiscalCompra.description}</strong>: NCM {fiscalCompra.ncm || "não definido"}, IPI {fiscalCompra.ipi_rate ?? 0}%, ICMS {fiscalCompra.default_icms_rate ?? 0}%, PIS {fiscalCompra.pis_rate ?? 0}% e COFINS {fiscalCompra.cofins_rate ?? 0}%.</>}
                        <br />Preencha os campos abaixo somente quando precisar sobrescrever o padrão do mestre.
                      </div>
                    </div>
                  )}

                  <div className="it-field it-col-4">
                    <label className="it-label">Origem</label>
                    <select
                      className="it-select"
                      value={form.origem}
                      onChange={(e) =>
                        setField("origem", e.target.value as OrigemItem)
                      }
                    >
                      <option value="">Herdar do mestre fiscal</option>
                      {ORIGENS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="it-sep" style={{ gridColumn: "span 12" }} />
                  <div
                    className="it-sec-label"
                    style={{ gridColumn: "span 12" }}
                  >
                    IPI e ICMS
                  </div>

                  <div className="it-field it-col-2">
                    <label className="it-label">Tipo IPI Venda</label>
                    <select
                      className="it-select"
                      value={form.tipoIpiVenda}
                      onChange={(e) =>
                        setField("tipoIpiVenda", e.target.value as TipoIPI)
                      }
                    >
                      <option>Percentual</option>
                      <option>Valor</option>
                    </select>
                  </div>
                  <div className="it-field it-col-2">
                    <label className="it-label">Alíq. IPI Venda (%)</label>
                    <input
                      className="it-input it-input-num"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.aliqIpiVenda}
                      onChange={(e) => setField("aliqIpiVenda", e.target.value)}
                      placeholder="0,00"
                    />
                  </div>

                  <div className="it-field it-col-2">
                    <label className="it-label">Tipo IPI Compra</label>
                    <select
                      className="it-select"
                      value={form.tipoIpiCompra}
                      onChange={(e) =>
                        setField("tipoIpiCompra", e.target.value as TipoIPI)
                      }
                    >
                      <option>Percentual</option>
                      <option>Valor</option>
                    </select>
                  </div>
                  <div className="it-field it-col-2">
                    <label className="it-label">Alíq. IPI Compra (%)</label>
                    <input
                      className="it-input it-input-num"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.aliqIpiCompra}
                      onChange={(e) =>
                        setField("aliqIpiCompra", e.target.value)
                      }
                      placeholder="0,00"
                    />
                  </div>

                  <div className="it-field it-col-2">
                    <label className="it-label">Alíq. ICMS (%)</label>
                    <input
                      className="it-input it-input-num"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.aliqIcms}
                      onChange={(e) => setField("aliqIcms", e.target.value)}
                      placeholder="0,00"
                    />
                    <span className="it-field-hint">
                      99,99 = Isento · 88,88 = Outras
                    </span>
                  </div>

                  <div className="it-sep" style={{ gridColumn: "span 12" }} />
                  <div
                    className="it-sec-label"
                    style={{ gridColumn: "span 12" }}
                  >
                    Unidades e Inventário
                  </div>

                  <div className="it-field it-col-2">
                    <label className="it-label">UM Venda</label>
                    <select
                      className="it-select"
                      value={form.umVenda}
                      onChange={(e) => setField("umVenda", e.target.value)}
                    >
                      <option value="">—</option>
                      {UNIDADES.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  <div className="it-field it-col-2">
                    <label className="it-label">UM Compra</label>
                    <select
                      className="it-select"
                      value={form.umCompra}
                      onChange={(e) => setField("umCompra", e.target.value)}
                    >
                      <option value="">—</option>
                      {UNIDADES.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  <div className="it-field it-col-3">
                    <label className="it-label">Grupo de Inventário</label>
                    <div className="it-input-wrap">
                      <input
                        className="it-input"
                        value={form.grupoInventario}
                        onChange={(e) =>
                          setField("grupoInventario", e.target.value)
                        }
                        placeholder="Código"
                      />
                    </div>
                  </div>

                  <div className="it-field it-col-3">
                    <label className="it-label">CEST</label>
                    <div className="it-input-wrap">
                      <input
                        className="it-input"
                        value={form.cest}
                        onChange={(e) => setField("cest", e.target.value)}
                        placeholder="Código CEST"
                      />
                    </div>
                  </div>

                  <div className="it-field it-col-4">
                    <label className="it-label">Cálculo de PIS/COFINS</label>
                    <select className="it-select" value={form.calculaPisCofins} onChange={(e) => setField("calculaPisCofins", e.target.value as FormItem["calculaPisCofins"])}>
                      <option value="HERDAR">Herdar do mestre fiscal</option>
                      <option value="SIM">Sobrescrever: Sim</option>
                      <option value="NAO">Sobrescrever: Não</option>
                    </select>
                  </div>

                  <div className="it-field it-col-12">
                    <label className="it-label">Observações</label>
                    <textarea
                      className="it-textarea"
                      value={form.obsContabil}
                      onChange={(e) => setField("obsContabil", e.target.value)}
                      placeholder="Observações contábeis..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── ABA: SUPRIMENTOS ── */}
            {aba === "suprimentos" && (
              <div className="it-tab-body">
                <div className="it-grid">
                  <div className="it-field it-col-3">
                    <label className="it-label">Unidade de Medida</label>
                    <select
                      className="it-select"
                      value={form.umSuprimentos}
                      onChange={(e) =>
                        setField(
                          "umSuprimentos",
                          e.target.value as TypeUnitOfMeasurementItem,
                        )
                      }
                    >
                      {UNIDADES.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                    <span className="it-field-hint">
                      Deve ter fator de conversão com a UM do Estoque.
                    </span>
                  </div>

                  <div className="it-field it-col-4">
                    <label className="it-label">Almoxarifado</label>
                    <div className="it-input-wrap">
                      <input
                        className="it-input"
                        value={form.almoxSuprimentos}
                        onChange={(e) =>
                          setField("almoxSuprimentos", e.target.value)
                        }
                        placeholder="Código do almoxarifado"
                      />
                    </div>
                  </div>

                  <div className="it-field it-col-5">
                    <label className="it-label">Tipo de Utilização</label>
                    <select
                      className="it-select"
                      value={form.tipoUtilizacao}
                      onChange={(e) =>
                        setField(
                          "tipoUtilizacao",
                          e.target.value as TypeTipoUtilizacao,
                        )
                      }
                    >
                      <option>Industrialização</option>
                      <option>Consumo</option>
                      <option>Imobilizado</option>
                    </select>
                    <span className="it-field-hint">
                      Padrão para pedidos de compra.
                    </span>
                  </div>

                  <div className="it-field it-col-4">
                    <label className="it-label">Classificação</label>
                    <div className="it-input-wrap">
                      <input
                        className="it-input"
                        value={form.classifSuprimentos}
                        onChange={(e) =>
                          setField("classifSuprimentos", e.target.value)
                        }
                        placeholder="Código de classificação"
                      />
                    </div>
                  </div>

                  <div className="it-field it-col-12">
                    <label className="it-label">Indicadores</label>
                    <div className="it-checks">
                      <label className="it-check-label">
                        <input
                          type="checkbox"
                          className="it-checkbox"
                          checked={form.checkListReceb}
                          onChange={(e) =>
                            setField("checkListReceb", e.target.checked)
                          }
                        />
                        <span className="it-check-text">
                          Check List de Recebimento
                        </span>
                      </label>
                      <label className="it-check-label">
                        <input
                          type="checkbox"
                          className="it-checkbox"
                          checked={form.controleSafra}
                          onChange={(e) =>
                            setField("controleSafra", e.target.checked)
                          }
                        />
                        <span className="it-check-text">Controle de Safra</span>
                      </label>
                    </div>
                  </div>

                  <div className="it-field it-col-12">
                    <label className="it-label">Observações</label>
                    <textarea
                      className="it-textarea"
                      value={form.obsSuprimentos}
                      onChange={(e) =>
                        setField("obsSuprimentos", e.target.value)
                      }
                      placeholder="Observações de suprimentos..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <footer className="it-footer">
          <div className="it-footer-group">
            <div className="it-footer-stat">
              Código: <strong>{form.code || "—"}</strong>
            </div>
            <div className="it-footer-stat">
              Tipo: <strong>{form.type}</strong>
            </div>
            <div className="it-footer-stat">
              Planejamento: <strong>{form.typePlanejamento}</strong>
            </div>
            <div className="it-footer-stat">
              UM Estoque: <strong>{form.unitOfMeasurement}</strong>
            </div>
          </div>
          <div className="it-footer-stat">
            Empresa: <strong>1 — GRUPO VENTURE LTDA</strong>
          </div>
        </footer>
      </div>
    </>
  );
}

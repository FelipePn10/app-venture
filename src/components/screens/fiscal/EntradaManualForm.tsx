import { useState } from "react";
import { type EntradaDocumento, type EntradaManualItem, criarEntradaManual } from "@/services/nfeEntradaService";
import { listSuppliers } from "@/services/supplierService";
import { lookupCnpj } from "@/services/customerService";
import { errMessage } from "@/services/fiscalShared";
import { validateCNPJOrCPF } from "@/utils/validation";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadSuppliers, loadChartOfAccounts, loadFinancialCostCenters, loadEntryOperations, loadWarehouses } from "@/services/lookups";
import { parcelasIguais, paraCentavos, deCentavos } from "./entradaRateio";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

const today = () => new Date().toISOString().slice(0, 10);
const round = (n: number) => Number(n.toFixed(2));
const money = (n?: number) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const digitos = (s: string) => s.replace(/\D/g, "");
const addDias = (iso: string, dias: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

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

const ITEM_VAZIO: EntradaManualItem = {
  sequence: 1, ncm: "", cfop: "1101", quantity: 1, unit_price: 0, total_price: 0, valor_icms: 0, valor_ipi: 0,
};

interface Props {
  onCriada: (d: EntradaDocumento) => void;
  onFeedback: (f: FeedbackState) => void;
  onCancelar: () => void;
}

/**
 * Lançamento manual da nota de entrada (nota sem XML: modelo 1/1A, serviço
 * avulso, contingência). O emitente é escolhido do cadastro de fornecedores —
 * pelo nome ou pelo CNPJ — e, se o CNPJ não estiver cadastrado, os dados vêm
 * da consulta à Receita. Itens já entram com o item do cadastro e o plano de
 * contas, e as parcelas com a distribuição feita na conferência.
 */
export function EntradaManualForm({ onCriada, onFeedback, onCancelar }: Props): JSX.Element {
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
  const [frete, setFrete] = useState(0);
  const [seguro, setSeguro] = useState(0);
  const [desconto, setDesconto] = useState(0);
  const [itens, setItens] = useState<EntradaManualItem[]>([{ ...ITEM_VAZIO }]);
  const [opNota, setOpNota] = useState<number | undefined>();
  const [retencoes, setRetencoes] = useState<Record<CampoRetencao, number>>({
    valor_irrf: 0, valor_ret_pis: 0, valor_ret_cofins: 0, valor_ret_csll: 0, valor_ret_prev: 0, valor_iss_ret: 0,
  });
  const [nParcelas, setNParcelas] = useState(1);
  const [intervalo, setIntervalo] = useState(30);
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState("");

  const produtos = round(itens.reduce((s, it) => s + it.total_price, 0));
  const ipi = round(itens.reduce((s, it) => s + (it.valor_ipi || 0), 0));
  const icms = round(itens.reduce((s, it) => s + (it.valor_icms || 0), 0));
  const total = round(produtos + ipi + frete + seguro - desconto);
  const totalRetencoes = round(Object.values(retencoes).reduce((s, v) => s + (v || 0), 0));
  // O fornecedor recebe o líquido; cada retenção vira título a recolher.
  const aPagar = round(total - totalRetencoes);

  async function escolherFornecedor(code?: number) {
    setSupplierCode(code); setAviso("");
    if (!code) return;
    try {
      const f = (await listSuppliers(false)).find((s) => s.code === code);
      if (!f) return;
      setCnpj(digitos(f.document_number || "")); setRazao(f.name || ""); setIe(f.state_registration || "");
      if (f.document_number && digitos(f.document_number).length === 14) {
        lookupCnpj(f.document_number).then((r) => setUf((u) => u || r.address?.uf || "")).catch(() => undefined);
      }
    } catch (e) { onFeedback({ type: "error", message: errMessage(e) }); }
  }

  /**
   * Busca pelo CNPJ: primeiro no cadastro de fornecedores (é ele que liga o
   * contas a pagar e os vínculos dos itens); se não houver, a Receita completa
   * razão social, IE e UF — e a tela avisa que convém cadastrar o fornecedor.
   */
  async function buscarPorCnpj() {
    const d = digitos(cnpj);
    if (!validateCNPJOrCPF(d)) { onFeedback({ type: "error", message: "CNPJ/CPF inválido (dígito verificador não confere)." }); return; }
    setBusy(true); setAviso("");
    try {
      const cadastrado = (await listSuppliers(false)).find((s) => digitos(s.document_number || "") === d);
      if (cadastrado?.code) {
        setSupplierCode(cadastrado.code); setRazao(cadastrado.name); setIe(cadastrado.state_registration || "");
        if (cadastrado.is_active === false) setAviso(`O fornecedor ${cadastrado.code} está inativo no cadastro.`);
      } else {
        setSupplierCode(undefined);
        setAviso("CNPJ não cadastrado como fornecedor: os dados vieram da Receita. Cadastre o fornecedor para o contas a pagar nascer com ele e os vínculos dos itens serem memorizados.");
      }
      if (d.length === 14) {
        try {
          const r = await lookupCnpj(d);
          setRazao((v) => v || r.legal_name);
          setUf((v) => v || r.address?.uf || "");
          const ieUf = r.state_registrations.find((x) => x.uf === (r.address?.uf ?? "") && x.enabled);
          setIe((v) => v || ieUf?.number || r.state_registration || "");
        } catch { /* Receita fora do ar: segue com o que o cadastro tem */ }
      }
    } catch (e) { onFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); }
  }

  function setItem(idx: number, patch: Partial<EntradaManualItem>) {
    setItens((xs) => xs.map((it, i) => {
      if (i !== idx) return it;
      const m = { ...it, ...patch };
      m.total_price = round(m.quantity * m.unit_price);
      return m;
    }));
  }

  async function salvar() {
    if (!numero || !digitos(cnpj) || !uf.trim()) { onFeedback({ type: "error", message: "Número da NF, CNPJ e UF do emitente são obrigatórios." }); return; }
    if (!validateCNPJOrCPF(digitos(cnpj))) { onFeedback({ type: "error", message: "CNPJ/CPF do emitente inválido." }); return; }
    if (chave && digitos(chave).length !== 44) { onFeedback({ type: "error", message: "A chave de acesso tem 44 dígitos." }); return; }
    if (itens.some((it) => !it.item_code || !it.cfop || it.quantity <= 0)) { onFeedback({ type: "error", message: "Todo item precisa do item do cadastro, CFOP e quantidade." }); return; }
    if (total <= 0) { onFeedback({ type: "error", message: "O total da nota precisa ser maior que zero." }); return; }
    if (Object.values(retencoes).some((v) => v < 0) || totalRetencoes > total) { onFeedback({ type: "error", message: "As retenções não podem ser negativas nem maiores que o total da nota." }); return; }
    const valores = aPagar > 0 ? parcelasIguais(paraCentavos(aPagar), Math.max(1, nParcelas)) : [];
    setBusy(true); onFeedback(null);
    try {
      const d = await criarEntradaManual({
        chave_acesso: digitos(chave) || undefined,
        numero_nf: numero, serie, modelo, data_emissao: emissao, data_entrada: entrada,
        supplier_code: supplierCode, cnpj_emitente: digitos(cnpj), razao_social_emitente: razao, ie_emitente: ie || undefined, uf_emitente: uf,
        valor_produtos: produtos, valor_frete: frete, valor_seguro: seguro, valor_desconto: desconto,
        valor_ipi: ipi, valor_icms: icms, valor_pis: 0, valor_cofins: 0, valor_total: total, tipo_documento: "NFE",
        entry_operation_code: opNota, ...retencoes,
        itens: itens.map((it, i) => ({
          ...it, sequence: i + 1, base_icms: it.valor_icms ? it.total_price : 0, aliq_icms: 0, base_ipi: it.valor_ipi ? it.total_price : 0, aliq_ipi: 0,
          valor_pis: 0, valor_cofins: 0,
          gera_credito_icms: it.valor_icms > 0, gera_credito_ipi: it.valor_ipi > 0, gera_credito_pis: false, gera_credito_cofins: false,
        })),
        parcelas: valores.map((v, i) => ({ numero: i + 1, data_vencimento: addDias(emissao, intervalo * (i + 1)), valor: deCentavos(v) })),
      });
      onCriada(d);
    } catch (e) { onFeedback({ type: "error", message: errMessage(e) }); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div className="erp-fieldset">
        <div className="erp-fieldset-head">Emitente</div>
        <div className="erp-fieldset-body">
          <div className="erp-field erp-c6"><label className="erp-label">Fornecedor do cadastro</label>
            <LookupField value={supplierCode} loader={loadSuppliers} entityLabel="fornecedor" allowManualCode={false}
              onChange={(c) => void escolherFornecedor(c ? Number(c) : undefined)} /></div>
          <div className="erp-field erp-c4"><label className="erp-label erp-req">CNPJ/CPF</label>
            <input className="erp-input" value={cnpj} onChange={(e) => setCnpj(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void buscarPorCnpj(); }} />
            {cnpj.trim() && <span className="erp-field-hint" style={{ color: validateCNPJOrCPF(digitos(cnpj)) ? "#1e6030" : "#b91c1c" }}>{validateCNPJOrCPF(digitos(cnpj)) ? "✓ válido" : "✗ inválido"}</span>}</div>
          <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn" onClick={() => void buscarPorCnpj()} disabled={busy}>Buscar CNPJ</button></div>
          <div className="erp-field erp-c6"><label className="erp-label">Razão social</label><input className="erp-input" value={razao} onChange={(e) => setRazao(e.target.value)} /></div>
          <div className="erp-field erp-c3"><label className="erp-label">IE</label><input className="erp-input" value={ie} onChange={(e) => setIe(e.target.value)} /></div>
          <div className="erp-field erp-c1"><label className="erp-label erp-req">UF</label><input className="erp-input" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} /></div>
          {aviso && <div className="erp-field erp-c12"><div className="erp-feedback info">{aviso}</div></div>}
        </div>
      </div>

      <div className="erp-fieldset">
        <div className="erp-fieldset-head">Nota</div>
        <div className="erp-fieldset-body">
          <div className="erp-field erp-c2"><label className="erp-label erp-req">Número</label><input className="erp-input num" type="number" value={numero || ""} onChange={(e) => setNumero(Number(e.target.value))} /></div>
          <div className="erp-field erp-c1"><label className="erp-label">Série</label><input className="erp-input" value={serie} onChange={(e) => setSerie(e.target.value)} /></div>
          <div className="erp-field erp-c1"><label className="erp-label">Modelo</label><input className="erp-input" value={modelo} onChange={(e) => setModelo(e.target.value)} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Emissão</label><input className="erp-input" type="date" value={emissao} onChange={(e) => setEmissao(e.target.value)} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Entrada</label><input className="erp-input" type="date" value={entrada} onChange={(e) => setEntrada(e.target.value)} /></div>
          <div className="erp-field erp-c4"><label className="erp-label">Chave de acesso (opcional)</label><input className="erp-input" value={chave} onChange={(e) => setChave(e.target.value)} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Frete</label><input className="erp-input num" type="number" step="0.01" value={frete} onChange={(e) => setFrete(Number(e.target.value))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Seguro</label><input className="erp-input num" type="number" step="0.01" value={seguro} onChange={(e) => setSeguro(Number(e.target.value))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Desconto</label><input className="erp-input num" type="number" step="0.01" value={desconto} onChange={(e) => setDesconto(Number(e.target.value))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Parcelas</label><input className="erp-input num" type="number" min={1} value={nParcelas} onChange={(e) => setNParcelas(Number(e.target.value))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Intervalo (dias)</label><input className="erp-input num" type="number" min={0} value={intervalo} onChange={(e) => setIntervalo(Number(e.target.value))} /></div>
          <div className="erp-field erp-c2"><label className="erp-label">Total</label><div className="erp-input" style={{ fontWeight: 600 }}>R$ {money(total)}</div></div>
          <div className="erp-field erp-c4"><label className="erp-label">Operação de entrada</label>
            <LookupField value={opNota} loader={loadEntryOperations} entityLabel="operação de entrada" allowManualCode={false}
              onChange={(c) => setOpNota(c ? Number(c) : undefined)} /></div>
          {RETENCOES.map((r) => (
            <div key={r.campo} className="erp-field erp-c1"><label className="erp-label">{r.rotulo}</label>
              <input className="erp-input num" type="number" step="0.01" min="0" value={retencoes[r.campo] || ""}
                onChange={(e) => setRetencoes((x) => ({ ...x, [r.campo]: Number(e.target.value) || 0 }))} /></div>
          ))}
          <div className="erp-field erp-c2"><label className="erp-label">A pagar ao fornecedor</label><div className="erp-input" style={{ fontWeight: 600 }}>R$ {money(aPagar)}</div></div>
        </div>
      </div>

      <div className="erp-fieldset">
        <div className="erp-fieldset-head">Itens — <span style={{ fontWeight: 400, opacity: 0.65 }}>produtos R$ {money(produtos)} · IPI R$ {money(ipi)} · ICMS R$ {money(icms)}</span></div>
        <div className="erp-fieldset-body"><div className="erp-field erp-c12" style={{ overflowX: "auto" }}>
          <table className="erp-grid">
            <thead><tr><th>#</th><th style={{ minWidth: 220 }}>Item do cadastro</th><th>NCM</th><th>CFOP</th><th>Qtd</th><th>Unit.</th><th>Total</th><th>ICMS</th><th>IPI</th><th style={{ minWidth: 200 }}>Plano de contas</th><th style={{ minWidth: 160 }}>Centro de custo</th><th style={{ minWidth: 170 }}>Almoxarifado</th><th /></tr></thead>
            <tbody>
              {itens.map((it, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td><LookupField value={it.item_code} loader={loadItems} entityLabel="item" allowManualCode={false}
                    onChange={(c, o) => setItem(idx, { item_code: c ? Number(c) : undefined, description: o?.label, uom: o?.sub })} /></td>
                  <td><input className="erp-input" style={{ height: 30, width: 90 }} value={it.ncm} onChange={(e) => setItem(idx, { ncm: e.target.value })} /></td>
                  <td><input className="erp-input" style={{ height: 30, width: 60 }} value={it.cfop} onChange={(e) => setItem(idx, { cfop: e.target.value })} /></td>
                  <td><input className="erp-input num" style={{ height: 30, width: 70 }} type="number" value={it.quantity} onChange={(e) => setItem(idx, { quantity: Number(e.target.value) })} /></td>
                  <td><input className="erp-input num" style={{ height: 30, width: 90 }} type="number" step="0.01" value={it.unit_price} onChange={(e) => setItem(idx, { unit_price: Number(e.target.value) })} /></td>
                  <td>{money(it.total_price)}</td>
                  <td><input className="erp-input num" style={{ height: 30, width: 80 }} type="number" step="0.01" value={it.valor_icms} onChange={(e) => setItem(idx, { valor_icms: Number(e.target.value) })} /></td>
                  <td><input className="erp-input num" style={{ height: 30, width: 80 }} type="number" step="0.01" value={it.valor_ipi} onChange={(e) => setItem(idx, { valor_ipi: Number(e.target.value) })} /></td>
                  <td><LookupField value={it.plano_contas_id} loader={loadChartOfAccounts} entityLabel="plano de contas" allowManualCode={false}
                    onChange={(c) => setItem(idx, { plano_contas_id: c ? Number(c) : undefined })} /></td>
                  <td><LookupField value={it.centro_custo_id} loader={loadFinancialCostCenters} entityLabel="centro de custo" allowManualCode={false}
                    onChange={(c) => setItem(idx, { centro_custo_id: c ? Number(c) : undefined })} /></td>
                  <td><LookupField value={it.warehouse_id} loader={loadWarehouses} entityLabel="almoxarifado" allowManualCode={false} placeholder="o do item"
                    onChange={(c) => setItem(idx, { warehouse_id: c ? Number(c) : undefined })} /></td>
                  <td><button className="erp-btn erp-btn-sm erp-btn-danger" disabled={itens.length === 1} onClick={() => setItens((xs) => xs.filter((_, i) => i !== idx))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="erp-field erp-c12" style={{ display: "flex", flexDirection: "row", gap: 8, alignItems: "center" }}>
          <button className="erp-btn" onClick={() => setItens((xs) => [...xs, { ...ITEM_VAZIO, sequence: xs.length + 1 }])}>+ Item</button>
          <div style={{ flex: 1 }} />
          <button className="erp-btn" onClick={onCancelar} disabled={busy}>Cancelar</button>
          <button className="erp-btn erp-btn-primary" onClick={() => void salvar()} disabled={busy}>{busy ? "Lançando..." : "Lançar e conferir"}</button>
        </div>
        </div>
      </div>
    </>
  );
}

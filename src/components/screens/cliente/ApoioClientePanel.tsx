import { useEffect, useState } from "react";
import { SupportCrud, type FieldSpec } from "./SupportCrud";
import { PoliticaCreditoPanel } from "./PoliticaCreditoPanel";
import { listSupport, postSupport } from "@/services/customerService";
import { errMessage, type Obj } from "@/services/fiscalShared";

/*
 * Cadastros de apoio do cliente (botão da VCLI0500): região, segmento, tipos de
 * contato e de cliente, portador e grupo de portadores, tipo de imposto e a
 * política de crédito da empresa. O tipo de nota fiscal foi para a VFIS0305. Tudo inclui, altera e
 * exclui aqui; o que está em uso não sai. Eram as telas VCLI0510 e VCLI0530 — nove cadastrinhos que
 * só interessam a quem está cadastrando cliente, como já é no fornecedor.
 */

type Tab = "regiao" | "segmento" | "tcontato" | "tcliente" | "portador" | "grupo" | "imposto" | "credito";
const ABAS: { id: Tab; label: string }[] = [
  { id: "regiao", label: "Região" }, { id: "segmento", label: "Segmento" }, { id: "tcontato", label: "Tipo de contato" },
  { id: "tcliente", label: "Tipo de cliente" }, { id: "portador", label: "Portador" }, { id: "grupo", label: "Grupo de portadores" },
  { id: "imposto", label: "Tipo de imposto" }, { id: "credito", label: "Política de crédito" },
];




// Tipo de imposto: classifica o cliente para as regras da VFIS0320 (filtro
// "tipo de imposto") e, marcado como consumidor final, leva a finalidade de uso
// e consumo à nota. As composições de base antigas saíram do banco na v1.20.0:
// nenhum cálculo as usava.
const TAX_FIELDS: FieldSpec[] = [
  { key: "description", label: "Descrição", col: 8, required: true,
    dica: "Nome do grupo de tributação (ex.: Contribuinte indústria, Consumidor final). O cliente recebe o tipo na VCLI0500 → Fiscal. As regras de ICMS/IPI (VFIS0320) podem ser restritas a um tipo: a regra com o tipo do cliente vence a genérica." },
  { key: "is_consumer", label: "Consumidor final (uso e consumo)", kind: "bool", col: 4,
    dica: "Ligado: a venda para cliente deste tipo é tratada como uso e consumo (consumidor final: IPI na base do ICMS, DIFAL, sem diferimento) quando o cliente e o pedido não informam a finalidade da compra." },
];

export function ApoioClientePanel(): JSX.Element {
  const [tab, setTab] = useState<Tab>("regiao");
  const [member, setMember] = useState({ carrier_group_code: "", carrier_code: "" });
  const [grupos, setGrupos] = useState<Obj[]>([]);
  const [portadores, setPortadores] = useState<Obj[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // O vínculo portador ↔ grupo escolhe nas listas (antes pedia os dois códigos).
  useEffect(() => {
    if (tab !== "grupo") return;
    void Promise.all([listSupport("carrier-groups"), listSupport("carriers")]).then(([g, p]) => { setGrupos(g); setPortadores(p); }).catch(() => undefined);
  }, [tab]);

  async function addMember() {
    if (!member.carrier_group_code || !member.carrier_code) { setFeedback({ type: "error", message: "Escolha o grupo e o portador." }); return; }
    setBusy(true); setFeedback(null);
    try { await postSupport("carrier-groups/members", { carrier_group_code: Number(member.carrier_group_code), carrier_code: Number(member.carrier_code) }); setMember({ carrier_group_code: "", carrier_code: "" }); setFeedback({ type: "success", message: "Portador vinculado ao grupo." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="erp-fieldset">
      <div className="erp-tabs">
        {ABAS.map((a) => <button key={a.id} className={`erp-tab ${tab === a.id ? "active" : ""}`} onClick={() => setTab(a.id)}>{a.label}</button>)}
      </div>

          {tab === "regiao" && <SupportCrud resource="regions" inativavel
            editable deletable
            fields={[{ key: "description", label: "Descrição", col: 6, required: true }, { key: "uf", label: "UF", col: 2, required: true }, { key: "city", label: "Cidade", col: 4, required: true }]}
            columns={[{ key: "description", label: "Descrição" }, { key: "uf", label: "UF" }, { key: "city", label: "Cidade" }]} />}

          {tab === "segmento" && <SupportCrud resource="market-segments" inativavel
            editable deletable
            fields={[{ key: "description", label: "Descrição", col: 5, required: true }, { key: "parent_code", label: "Pai (cód.)", kind: "number", col: 2 }, { key: "has_pis_cofins_retention", label: "Retém PIS/COFINS", kind: "bool", col: 3 }, { key: "retention_indicator", label: "Indicador retenção", col: 2 }]}
            columns={[{ key: "description", label: "Descrição" }, { key: "has_pis_cofins_retention", label: "Retém", kind: "bool" }, { key: "retention_indicator", label: "Indicador" }]} />}

          {tab === "tcontato" && <SupportCrud resource="contact-types"
            editable deletable
            fields={[{ key: "description", label: "Descrição", col: 10, required: true }]}
            columns={[{ key: "description", label: "Descrição" }]} />}

          {tab === "tcliente" && <SupportCrud resource="customer-types" inativavel
            editable deletable
            fields={[{ key: "code", label: "Código", kind: "number", col: 2, required: true }, { key: "description", label: "Descrição", col: 4, required: true }, { key: "category", label: "Categoria", kind: "select", options: ["NORMAL", "CONSUMIDOR"], col: 3 }, { key: "delivery_days", label: "Dias entrega", kind: "number", col: 2 }]}
            columns={[{ key: "description", label: "Descrição" }, { key: "category", label: "Categoria" }, { key: "delivery_days", label: "Dias entrega", kind: "number" }]} />}

          {tab === "portador" && <SupportCrud resource="carriers" inativavel
            editable deletable
            fields={[
              { key: "description", label: "Descrição", col: 8, required: true,
                dica: "Banco ou carteira por onde o cliente paga (ex.: Itaú boleto, Carteira). Escolhido no cliente (VCLI0500 → Comercial e logística), vem sugerido no orçamento e no pedido e serve de critério na Política Comercial de Descontos (VPDV0108). Não é transportadora: essa fica no Cadastro de Transportadora (VSUP0140)." },
            ]}
            columns={[{ key: "description", label: "Descrição" }]} />}

          {tab === "grupo" && (
            <>
              <SupportCrud resource="carrier-groups"
                editable deletable
                fields={[{ key: "description", label: "Descrição", col: 10, required: true }]}
                columns={[{ key: "description", label: "Descrição" }]} />
              <div className="erp-fieldset-body" style={{ borderTop: "1px solid #e2e8e4" }}>
                {feedback && <div className={`erp-feedback ${feedback.type}`} style={{ marginBottom: 10 }}>{feedback.message}</div>}
                <div className="erp-results-bar"><div className="erp-results-bar-left"><span className="erp-results-bar-label">Vincular portador ao grupo</span></div>
                  <select className="erp-input" style={{ width: 200, height: 30 }} aria-label="Grupo" value={member.carrier_group_code} onChange={(e) => setMember((p) => ({ ...p, carrier_group_code: e.target.value }))}>
                    <option value="">Grupo…</option>{grupos.map((g) => <option key={String(g.code)} value={String(g.code)}>{String(g.description ?? g.code)}</option>)}
                  </select>
                  <select className="erp-input" style={{ width: 200, height: 30 }} aria-label="Portador" value={member.carrier_code} onChange={(e) => setMember((p) => ({ ...p, carrier_code: e.target.value }))}>
                    <option value="">Portador…</option>{portadores.map((c) => <option key={String(c.code)} value={String(c.code)}>{String(c.description ?? c.code)}</option>)}
                  </select>
                  <button className="erp-btn erp-btn-primary" onClick={() => void addMember()} disabled={busy}>+ Vincular</button>
                </div>
              </div>
            </>
          )}
          {tab === "imposto" && <SupportCrud resource="tax-types" inativavel fields={TAX_FIELDS} editable deletable
            columns={[{ key: "description", label: "Descrição" }, { key: "is_consumer", label: "Consumidor", kind: "bool" }]} />}
          {tab === "credito" && <PoliticaCreditoPanel />}
    </div>
  );
}

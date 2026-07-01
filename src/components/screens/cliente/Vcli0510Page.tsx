import { useState } from "react";
import { SupportCrud } from "./SupportCrud";
import { postSupport } from "@/services/customerService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

type Tab = "regiao" | "segmento" | "tcontato" | "tcliente" | "portador" | "grupo";

export function Vcli0510Page(): JSX.Element {
  const [tab, setTab] = useState<Tab>("regiao");
  const [member, setMember] = useState({ carrier_group_code: "", carrier_code: "" });
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function addMember() {
    if (!member.carrier_group_code || !member.carrier_code) { setFeedback({ type: "error", message: "Informe grupo e portador." }); return; }
    setBusy(true); setFeedback(null);
    try { await postSupport("carrier-groups/members", { carrier_group_code: Number(member.carrier_group_code), carrier_code: Number(member.carrier_code) }); setMember({ carrier_group_code: "", carrier_code: "" }); setFeedback({ type: "success", message: "Portador vinculado ao grupo." }); }
    catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VCLI0510 — Apoio de Cliente (Básico)</span>
      </div></header>
      <div className="fsc-actionbar"><div className="fsc-action-group"><span className="fsc-action-label">Cadastros de apoio</span></div><div className="fsc-action-group"><span className="fsc-action-label">Relatório</span><ExportButton title="VCLI0510 — Apoio de Cliente (Básico)" filename="vcli0510" /></div></div>

      <div className="fsc-body">
        <div className="fsc-card">
          <div className="fsc-tabs">
            <button className={`fsc-tab ${tab === "regiao" ? "active" : ""}`} onClick={() => setTab("regiao")}>Região</button>
            <button className={`fsc-tab ${tab === "segmento" ? "active" : ""}`} onClick={() => setTab("segmento")}>Segmento</button>
            <button className={`fsc-tab ${tab === "tcontato" ? "active" : ""}`} onClick={() => setTab("tcontato")}>Tipo Contato</button>
            <button className={`fsc-tab ${tab === "tcliente" ? "active" : ""}`} onClick={() => setTab("tcliente")}>Tipo Cliente</button>
            <button className={`fsc-tab ${tab === "portador" ? "active" : ""}`} onClick={() => setTab("portador")}>Portador</button>
            <button className={`fsc-tab ${tab === "grupo" ? "active" : ""}`} onClick={() => setTab("grupo")}>Grupo Portadores</button>
          </div>

          {tab === "regiao" && <SupportCrud resource="regions"
            fields={[{ key: "description", label: "Descrição", col: 6, required: true }, { key: "uf", label: "UF", col: 2, required: true }, { key: "city", label: "Cidade", col: 4, required: true }]}
            columns={[{ key: "description", label: "Descrição" }, { key: "uf", label: "UF" }, { key: "city", label: "Cidade" }]} />}

          {tab === "segmento" && <SupportCrud resource="market-segments"
            fields={[{ key: "description", label: "Descrição", col: 5, required: true }, { key: "parent_code", label: "Pai (cód.)", kind: "number", col: 2 }, { key: "has_pis_cofins_retention", label: "Retém PIS/COFINS", kind: "bool", col: 3 }, { key: "retention_indicator", label: "Indicador retenção", col: 2 }]}
            columns={[{ key: "description", label: "Descrição" }, { key: "has_pis_cofins_retention", label: "Retém", kind: "bool" }, { key: "retention_indicator", label: "Indicador" }]} />}

          {tab === "tcontato" && <SupportCrud resource="contact-types"
            fields={[{ key: "description", label: "Descrição", col: 10, required: true }]}
            columns={[{ key: "description", label: "Descrição" }]} />}

          {tab === "tcliente" && <SupportCrud resource="customer-types"
            fields={[{ key: "code", label: "Código", kind: "number", col: 2, required: true }, { key: "description", label: "Descrição", col: 4, required: true }, { key: "category", label: "Categoria", kind: "select", options: ["NORMAL", "CONSUMIDOR"], col: 3 }, { key: "delivery_days", label: "Dias entrega", kind: "number", col: 2 }]}
            columns={[{ key: "description", label: "Descrição" }, { key: "category", label: "Categoria" }, { key: "delivery_days", label: "Dias entrega", kind: "number" }]} />}

          {tab === "portador" && <SupportCrud resource="carriers"
            fields={[
              { key: "description", label: "Descrição", col: 5, required: true },
              { key: "billing_type", label: "Cobrança", kind: "select", options: ["CARTEIRA", "COBRANCA_ESCRITURAL", "BOLETO"], col: 3 },
              { key: "uses_credit_limit", label: "Usa limite crédito", kind: "bool", col: 2 },
              { key: "consider_available", label: "Considera disponível", kind: "bool", col: 2 },
              { key: "postpone_due_date", label: "Adia p/ dia útil", kind: "bool", col: 3 },
              { key: "receipt_days", label: "Dias recebimento", kind: "number", col: 2 },
              { key: "payment_days", label: "Dias compensação", kind: "number", col: 2 },
            ]}
            columns={[{ key: "description", label: "Descrição" }, { key: "billing_type", label: "Cobrança" }, { key: "uses_credit_limit", label: "Limite", kind: "bool" }]} />}

          {tab === "grupo" && (
            <>
              <SupportCrud resource="carrier-groups"
                fields={[{ key: "description", label: "Descrição", col: 10, required: true }]}
                columns={[{ key: "description", label: "Descrição" }]} />
              <div className="fsc-card-body" style={{ borderTop: "1px solid #e2e8e4" }}>
                {feedback && <div className={`fsc-feedback ${feedback.type}`} style={{ marginBottom: 10 }}>{feedback.message}</div>}
                <div className="fsc-results-bar"><div className="fsc-results-bar-left"><span className="fsc-results-bar-label">Vincular portador ao grupo</span></div>
                  <input className="fsc-input" style={{ width: 90, height: 30 }} type="number" placeholder="grupo" value={member.carrier_group_code} onChange={(e) => setMember((p) => ({ ...p, carrier_group_code: e.target.value }))} />
                  <input className="fsc-input" style={{ width: 90, height: 30 }} type="number" placeholder="portador" value={member.carrier_code} onChange={(e) => setMember((p) => ({ ...p, carrier_code: e.target.value }))} />
                  <button className="fsc-btn fsc-btn-primary" onClick={() => void addMember()} disabled={busy}>+ Vincular</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Apoio: <strong>{tab}</strong></div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}

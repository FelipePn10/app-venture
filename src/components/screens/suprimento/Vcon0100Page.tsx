import { ExportButton } from "@/components/ui/ExportButton";

/**
 * VCON0100 — Tipos de Contratos. O backend de contratos de fornecedores
 * (`/api/procurement/supplier-contracts`) **não** modela "tipo de contrato" como
 * cadastro separado: o contrato carrega status, vigência, moeda e índice de reajuste
 * na própria capa. Esta tela é informativa até o backend expor tipos, se necessário.
 */
export function Vcon0100Page(): JSX.Element {
  return (
    <div className="fsc-root">
      <header className="fsc-topbar"><div className="fsc-topbar-left">
        <div className="fsc-logo"><svg width="15" height="15" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" /></svg></div>
        <span className="fsc-app-name">Venture<span className="fsc-app-sub">ERP &amp; Soluções</span></span>
        <span className="fsc-screen-title">VCON0100 — Tipos de Contratos</span>
      </div></header>

      <div className="fsc-actionbar">
        <div className="fsc-action-group"><span className="fsc-action-label">Relatório</span>
          <ExportButton title="VCON0100 — Tipos de Contratos" filename="vcon0100" /></div>
      </div>

      <div className="fsc-body">
        <div className="fsc-feedback info" style={{ marginBottom: 12 }}>
          O ERP não mantém <strong>tipos de contrato</strong> como cadastro separado. Um contrato de fornecedor
          já descreve tudo na própria capa: <strong>status</strong> (DRAFT · ACTIVE · SUSPENDED · CLOSED · CANCELLED),
          <strong> vigência</strong>, <strong>moeda</strong> e <strong>índice de reajuste</strong>.
        </div>
        <div className="fsc-section-banner"><span className="fsc-section-banner-pill">Onde cadastrar/consultar contratos</span><div className="fsc-section-banner-line" /></div>
        <div className="fsc-card"><div className="fsc-card-body">
          <table className="fsc-table">
            <thead><tr><th>Tela</th><th>Função</th></tr></thead>
            <tbody>
              <tr><td style={{ fontWeight: 600 }}>VCON0200</td><td>Cadastro de Contratos de Fornecedores (capa + linhas)</td></tr>
              <tr><td style={{ fontWeight: 600 }}>VCON0400</td><td>Consulta de contratos + mudança de status</td></tr>
              <tr><td style={{ fontWeight: 600 }}>VCON0202</td><td>Baixa de saldo (consumo) e cancelamento do contrato</td></tr>
            </tbody>
          </table>
        </div></div>
      </div>

      <footer className="fsc-footer">
        <div className="fsc-footer-left"><div className="fsc-footer-stat">Contratos de fornecedores</div></div>
        <div className="fsc-footer-stat"><span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span></div>
      </footer>
    </div>
  );
}

import { ExportButton } from "@/components/ui/ExportButton";

/**
 * VCON0100 — Tipos de Contratos. O backend de contratos de fornecedores
 * (`/api/procurement/supplier-contracts`) **não** modela "tipo de contrato" como
 * cadastro separado: o contrato carrega status, vigência, moeda e índice de reajuste
 * na própria capa. Esta tela é informativa até o backend expor tipos, se necessário.
 */
export function Vcon0100Page(): JSX.Element {
  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Suprimento</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Tipos de Contratos</span><span className="erp-crumb-code">VCON0100</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VCON0100 — Tipos de Contratos" filename="vcon0100" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Tipos de Contratos</button></div>
          <div className="erp-detail-body">
        <div className="erp-feedback info" style={{ marginBottom: 12 }}>
          O ERP não mantém <strong>tipos de contrato</strong> como cadastro separado. Um contrato de fornecedor
          já descreve tudo na própria capa: <strong>status</strong> (DRAFT · ACTIVE · SUSPENDED · CLOSED · CANCELLED),
          <strong> vigência</strong>, <strong>moeda</strong> e <strong>índice de reajuste</strong>.
        </div>
        <div className="erp-fieldset"><div className="erp-fieldset-head">Onde cadastrar/consultar contratos</div><div className="erp-fieldset-body">
          <table className="erp-grid">
            <thead><tr><th>Tela</th><th>Função</th></tr></thead>
            <tbody>
              <tr><td style={{ fontWeight: 600 }}>VCON0200</td><td>Cadastro de Contratos de Fornecedores (capa + linhas)</td></tr>
              <tr><td style={{ fontWeight: 600 }}>VCON0400</td><td>Consulta de contratos + mudança de status</td></tr>
              <tr><td style={{ fontWeight: 600 }}>VCON0202</td><td>Baixa de saldo (consumo) e cancelamento do contrato</td></tr>
            </tbody>
          </table>
        </div></div>
      </div></section></div>

      <footer className="erp-statusbar">
        <div style={{display:"contents"}}><div className="erp-status-item">Contratos de fornecedores</div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

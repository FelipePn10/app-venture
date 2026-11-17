import { useCallback, useEffect, useState } from "react";
import { getSaneamento, type Saneamento } from "@/services/customerService";
import { errMessage } from "@/services/fiscalShared";
import { ExportButton } from "@/components/ui/ExportButton";

/*
 * VCLI0510 — Saneamento do cadastro de clientes. Lista, por categoria, o que no
 * cadastro dos clientes ativos faz a NF-e ser rejeitada, o pedido travar ou a
 * análise de crédito errar, e como resolver. Só leitura: a correção é na
 * VCLI0500 (busque pelo código).
 */

export function Vcli0510Page(): JSX.Element {
  const [dados, setDados] = useState<Saneamento | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"TODAS" | "IMPEDE" | "ATENCAO">("TODAS");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setBusy(true); setErro(null);
    try { setDados(await getSaneamento()); }
    catch (e) { setErro(errMessage(e, "Não foi possível montar o saneamento.")); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  const categorias = (dados?.categorias ?? []).filter((c) => filtro === "TODAS" || c.gravidade === filtro);

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Cliente</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Saneamento do Cadastro de Clientes</span><span className="erp-crumb-code">VCLI0510</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Mostrar</span>
          {(["TODAS", "IMPEDE", "ATENCAO"] as const).map((f) => (
            <button key={f} className={`erp-btn${filtro === f ? " erp-btn-primary" : ""}`} onClick={() => setFiltro(f)}>
              {f === "TODAS" ? "Todas" : f === "IMPEDE" ? "Só as que impedem" : "Só atenção"}</button>
          ))}
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn" onClick={() => void carregar()} disabled={busy}>{busy ? "Conferindo…" : "Conferir de novo"}</button>
        </div>
        <div className="erp-tgroup">
          <span className="erp-tgroup-label">Relatório</span>
          {/* Todas as pendências do filtro, não só a categoria aberta na tela. */}
          <ExportButton title="VCLI0510 — Saneamento do Cadastro de Clientes" filename="vcli0510" disabled={!dados}
            build={() => ({
              columns: ["Gravidade", "Pendência", "Código", "Cliente", "Documento", "O que está errado", "Como resolver"],
              rows: categorias.flatMap((c) => c.clientes.map((x) => [c.gravidade === "IMPEDE" ? "Impede" : "Atenção", c.titulo,
                String(x.customer_code), x.name, x.document, x.detalhe, x.como_resolver])),
            })} />
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs"><button className="erp-tab active">Pendências do cadastro</button></div>
          <div className="erp-detail-body">
            {erro && <div className="erp-feedback error">{erro}</div>}
            <div className="erp-fieldset"><div className="erp-fieldset-body">
              <div className="erp-field erp-c12"><p className="erp-note" style={{ margin: 0 }}>
                Confere os clientes <strong>ativos</strong>. <strong>Impede</strong>: a NF-e é rejeitada ou o pedido trava até corrigir.
                <strong> Atenção</strong>: vale corrigir, mas nada para hoje. A correção é na <strong>VCLI0500</strong> — busque o cliente pelo código.
              </p></div>
              {dados && <>
                <div className="erp-field erp-c3"><label className="erp-label">Clientes ativos</label><div className="erp-input" style={{ border: 0, fontWeight: 600 }}>{dados.clientes_ativos}</div></div>
                <div className="erp-field erp-c3"><label className="erp-label">Com alguma pendência</label><div className="erp-input" style={{ border: 0, fontWeight: 600 }}>{dados.clientes_com_pendencia}</div></div>
                <div className="erp-field erp-c3"><label className="erp-label">Pendências que impedem</label><div className="erp-input" style={{ border: 0, fontWeight: 600, color: dados.pendencias_que_impedem ? "var(--v-err)" : undefined }}>{dados.pendencias_que_impedem}</div></div>
                <div className="erp-field erp-c3"><label className="erp-label">Conferido em</label><div className="erp-input" style={{ border: 0 }}>{new Date(dados.gerado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</div></div>
              </>}
            </div></div>

            {dados && categorias.length === 0 && <div className="erp-feedback success">Nenhuma pendência {filtro === "TODAS" ? "" : "deste tipo "}no cadastro dos clientes ativos.</div>}
            {categorias.map((c) => (
              <div key={c.code} className="erp-fieldset">
                <div className="erp-fieldset-head" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setAberta(aberta === c.code ? null : c.code)}>
                  <span className={`erp-badge ${c.gravidade === "IMPEDE" ? "erp-badge-red" : "erp-badge-amber"}`}>{c.gravidade === "IMPEDE" ? "Impede" : "Atenção"}</span>
                  <span>{c.titulo}</span><span style={{ fontWeight: 400, opacity: 0.65 }}>— {c.total} cliente(s)</span>
                  <span style={{ flex: 1 }} /><span style={{ fontWeight: 400 }}>{aberta === c.code ? "Ocultar" : "Ver clientes"}</span>
                </div>
                {aberta === c.code && <div className="erp-fieldset-body"><div className="erp-field erp-c12">
                  <p className="erp-note" style={{ marginTop: 0 }}>Como resolver: {c.clientes[0]?.como_resolver}</p>
                  <table className="erp-grid">
                    <thead><tr><th style={{ width: 90 }}>Código</th><th>Cliente</th><th>Documento</th><th>O que está errado</th></tr></thead>
                    <tbody>
                      {c.clientes.map((x) => (
                        <tr key={`${c.code}-${x.customer_code}`}><td>{x.customer_code}</td><td>{x.name}</td><td>{x.document}</td><td>{x.detalhe}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div></div>}
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div style={{ display: "contents" }}><div className="erp-status-item">Pendências: <strong>{dados ? dados.categorias.reduce((n, c) => n + c.total, 0) : "—"}</strong></div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

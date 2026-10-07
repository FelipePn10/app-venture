import { useState } from "react";
import { gerarEfdAutomatica, type SpedEfdPedido, type SpedEfdResultado } from "@/services/spedEfdService";
import { errMessage } from "@/services/fiscalShared";
import { downloadBlob } from "@/services/fileDownload";
import { paraLatin1, competenciaAnterior, cpfValido } from "./spedArquivo";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

const money = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// O contabilista e o perfil mudam raramente: ficam lembrados neste navegador.
const CHAVE_PREFERENCIAS = "vfis0600.preferencias";
type Preferencias = Pick<SpedEfdPedido, "perfil" | "ind_atividade" | "contabilista_nome" | "contabilista_cpf" | "contabilista_crc" | "contabilista_cnpj" | "cod_receita_icms">;

function lerPreferencias(): Partial<Preferencias> {
  try { return JSON.parse(localStorage.getItem(CHAVE_PREFERENCIAS) ?? "{}") as Partial<Preferencias>; } catch { return {}; }
}
function gravarPreferencias(p: Preferencias): void {
  try { localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify(p)); } catch { /* navegador sem armazenamento: só não lembra */ }
}

function pedidoInicial(): SpedEfdPedido {
  const { ano, mes } = competenciaAnterior(new Date());
  const pref = lerPreferencias();
  return {
    ano, mes, finalidade: "0", perfil: pref.perfil ?? "A", ind_atividade: pref.ind_atividade ?? "0",
    contabilista_nome: pref.contabilista_nome ?? "", contabilista_cpf: pref.contabilista_cpf ?? "",
    contabilista_crc: pref.contabilista_crc ?? "", contabilista_cnpj: pref.contabilista_cnpj ?? "",
    saldo_credor_anterior_icms: 0, saldo_credor_anterior_ipi: 0, cod_receita_icms: pref.cod_receita_icms ?? "", vencimento_icms: "",
  };
}

export function Vfis0600Page(): JSX.Element {
  const [pedido, setPedido] = useState<SpedEfdPedido>(pedidoInicial);
  const [ipiAuto, setIpiAuto] = useState(true);
  // Bloco H: o inventário de 31/12 vai na EFD de fevereiro.
  const [comInventario, setComInventario] = useState(() => pedidoInicial().mes === 2);
  const [resultado, setResultado] = useState<SpedEfdResultado | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const setP = <K extends keyof SpedEfdPedido>(k: K, v: SpedEfdPedido[K]) => { setPedido((p) => ({ ...p, [k]: v })); setResultado(null); };

  async function gerar() {
    if (!pedido.contabilista_nome.trim() || !cpfValido(pedido.contabilista_cpf)) {
      setFeedback({ type: "error", message: "Informe o nome e o CPF (11 dígitos) do contabilista — o registro 0100 é obrigatório." });
      return;
    }
    if (pedido.saldo_credor_anterior_icms < 0 || pedido.saldo_credor_anterior_ipi < 0) {
      setFeedback({ type: "error", message: "Saldo credor anterior não pode ser negativo." });
      return;
    }
    setBusy(true); setFeedback(null); setResultado(null);
    try {
      if (comInventario && !pedido.inventario_data) {
        setFeedback({ type: "error", message: "Informe a data do inventário (bloco H)." }); setBusy(false); return;
      }
      const corpo: SpedEfdPedido = { ...pedido, contribuinte_ipi: ipiAuto ? undefined : pedido.contribuinte_ipi, vencimento_icms: pedido.vencimento_icms || undefined,
        inventario_data: comInventario ? pedido.inventario_data : undefined, inventario_motivo: comInventario ? (pedido.inventario_motivo || "01") : undefined };
      const r = await gerarEfdAutomatica(corpo);
      setResultado(r);
      gravarPreferencias({
        perfil: pedido.perfil, ind_atividade: pedido.ind_atividade, contabilista_nome: pedido.contabilista_nome,
        contabilista_cpf: pedido.contabilista_cpf, contabilista_crc: pedido.contabilista_crc, contabilista_cnpj: pedido.contabilista_cnpj,
        cod_receita_icms: pedido.cod_receita_icms,
      });
      setFeedback(r.avisos.length
        ? { type: "info", message: `Arquivo gerado com ${r.avisos.length} aviso(s) de cadastro — confira antes de transmitir.` }
        : { type: "success", message: "Arquivo gerado. Confira o resumo e baixe para validar no PVA." });
    } catch (e) { setFeedback({ type: "error", message: errMessage(e, "Falha ao gerar a EFD.") }); }
    finally { setBusy(false); }
  }

  function baixar() {
    if (!resultado) return;
    // O PVA lê ISO-8859-1: o texto UTF-8 da API vira bytes Latin-1.
    const bytes = paraLatin1(resultado.arquivo);
    downloadBlob(new Blob([bytes], { type: "text/plain;charset=iso-8859-1" }), resultado.nome_arquivo);
  }

  const r = resultado?.resumo;
  const anoAtual = new Date().getFullYear();

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Fiscal</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">SPED EFD ICMS/IPI</span><span className="erp-crumb-code">VFIS0600</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Competência</span>
          <select className="erp-input" style={{ width: 130, height: 32 }} value={pedido.mes} onChange={(e) => setP("mes", Number(e.target.value))}>
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <input className="erp-input num" style={{ width: 80, height: 32 }} type="number" min={2009} max={anoAtual} value={pedido.ano} onChange={(e) => setP("ano", Number(e.target.value))} />
        </div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Ações</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void gerar()} disabled={busy}>{busy ? "Gerando…" : "Gerar EFD"}</button>
          <button className="erp-btn" onClick={baixar} disabled={!resultado || busy}>Baixar arquivo</button>
        </div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel"><div className="erp-detail-body">
          {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}

          <div className="erp-fieldset">
            <div className="erp-fieldset-head">O que entra no arquivo</div>
            <div className="erp-fieldset-body">
              <div className="erp-field erp-c12"><div className="erp-feedback info"><div>
                O arquivo é montado das próprias notas da empresa no mês:
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  <li>NF-e de entrada aprovadas, pela data de entrada (C100/C170/C190), com o CFOP de entrada e só o ICMS que a empresa credita;</li>
                  <li>NF-e emitidas autorizadas e canceladas, pela data de emissão (C100/C190);</li>
                  <li>CT-e de frete sobre compras lançados (D100/D190);</li>
                  <li>apuração do ICMS (E110/E116) e, para o contribuinte, do IPI (E500/E510/E520); participantes, unidades e itens referenciados (0150/0190/0200/0220).</li>
                </ul>
                Empresa (CNPJ, IE, município) vem da configuração fiscal.
              </div></div></div>
            </div>
          </div>

          <div className="erp-fieldset">
            <div className="erp-fieldset-head">Escrituração</div>
            <div className="erp-fieldset-body">
              <div className="erp-field erp-c3"><label className="erp-label">Finalidade</label>
                <select className="erp-input" value={pedido.finalidade} onChange={(e) => setP("finalidade", e.target.value as "0" | "1")}>
                  <option value="0">Original</option><option value="1">Substituta (retificadora)</option>
                </select></div>
              <div className="erp-field erp-c3"><label className="erp-label">Perfil</label>
                <select className="erp-input" value={pedido.perfil} onChange={(e) => setP("perfil", e.target.value as "A" | "B" | "C")}>
                  <option value="A">A</option><option value="B">B</option><option value="C">C</option>
                </select>
                <span className="erp-hint">Definido pela SEFAZ da UF.</span></div>
              <div className="erp-field erp-c3"><label className="erp-label">Atividade</label>
                <select className="erp-input" value={pedido.ind_atividade} onChange={(e) => setP("ind_atividade", e.target.value as "0" | "1")}>
                  <option value="0">Industrial ou equiparado</option><option value="1">Outros</option>
                </select></div>
              <div className="erp-field erp-c3"><label className="erp-label">Apuração do IPI</label>
                <select className="erp-input" value={ipiAuto ? "auto" : pedido.contribuinte_ipi ? "sim" : "nao"} onChange={(e) => {
                  const v = e.target.value; setIpiAuto(v === "auto"); setP("contribuinte_ipi", v === "sim");
                }}>
                  <option value="auto">Pela atividade (industrial apura)</option><option value="sim">Sim</option><option value="nao">Não</option>
                </select></div>
            </div>
          </div>

          <div className="erp-fieldset">
            <div className="erp-fieldset-head">Contabilista (0100)</div>
            <div className="erp-fieldset-body">
              <div className="erp-field erp-c4"><label className="erp-label erp-req">Nome</label>
                <input className="erp-input" value={pedido.contabilista_nome} onChange={(e) => setP("contabilista_nome", e.target.value)} /></div>
              <div className="erp-field erp-c3"><label className="erp-label erp-req">CPF</label>
                <input className="erp-input" value={pedido.contabilista_cpf} placeholder="000.000.000-00" onChange={(e) => setP("contabilista_cpf", e.target.value)} /></div>
              <div className="erp-field erp-c2"><label className="erp-label">CRC</label>
                <input className="erp-input" value={pedido.contabilista_crc ?? ""} onChange={(e) => setP("contabilista_crc", e.target.value)} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">CNPJ do escritório</label>
                <input className="erp-input" value={pedido.contabilista_cnpj ?? ""} onChange={(e) => setP("contabilista_cnpj", e.target.value)} /></div>
            </div>
          </div>

          <div className="erp-fieldset">
            <div className="erp-fieldset-head">Apuração</div>
            <div className="erp-fieldset-body">
              <div className="erp-field erp-c3"><label className="erp-label">Saldo credor anterior de ICMS</label>
                <input className="erp-input num" type="number" step="0.01" min="0" value={pedido.saldo_credor_anterior_icms} onChange={(e) => setP("saldo_credor_anterior_icms", Number(e.target.value))} />
                <span className="erp-hint">O "saldo credor a transportar" da EFD do mês anterior.</span></div>
              <div className="erp-field erp-c3"><label className="erp-label">Saldo credor anterior de IPI</label>
                <input className="erp-input num" type="number" step="0.01" min="0" value={pedido.saldo_credor_anterior_ipi} onChange={(e) => setP("saldo_credor_anterior_ipi", Number(e.target.value))} /></div>
              <div className="erp-field erp-c3"><label className="erp-label">Código de receita do ICMS</label>
                <input className="erp-input" value={pedido.cod_receita_icms ?? ""} placeholder="ex.: 1015" onChange={(e) => setP("cod_receita_icms", e.target.value)} />
                <span className="erp-hint">Da UF (E116); exigido quando há ICMS a recolher.</span></div>
              <div className="erp-field erp-c3"><label className="erp-label">Vencimento do ICMS</label>
                <input className="erp-input" type="date" value={pedido.vencimento_icms ?? ""} onChange={(e) => setP("vencimento_icms", e.target.value)} />
                <span className="erp-hint">Vazio: o dia da configuração fiscal no mês seguinte.</span></div>
            </div>
          </div>

          <div className="erp-fieldset">
            <div className="erp-fieldset-head">Inventário (bloco H)</div>
            <div className="erp-fieldset-body">
              <div className="erp-field erp-c4" style={{ alignSelf: "end" }}>
                <label><input type="checkbox" checked={comInventario} onChange={(e) => { setComInventario(e.target.checked); setResultado(null);
                  if (e.target.checked && !pedido.inventario_data) setP("inventario_data", `${pedido.mes <= 2 ? pedido.ano - 1 : pedido.ano}-12-31`); }} /> Incluir o inventário do estoque</label>
                <span className="erp-hint">Obrigatório na EFD de fevereiro (inventário de 31/12) e nas situações do motivo.</span></div>
              {comInventario && <>
                <div className="erp-field erp-c3"><label className="erp-label erp-req">Data do inventário</label>
                  <input className="erp-input" type="date" value={pedido.inventario_data ?? ""} onChange={(e) => setP("inventario_data", e.target.value)} /></div>
                <div className="erp-field erp-c5"><label className="erp-label">Motivo</label>
                  <select className="erp-input" value={pedido.inventario_motivo || "01"} onChange={(e) => setP("inventario_motivo", e.target.value)}>
                    <option value="01">01 — No final no período</option>
                    <option value="02">02 — Mudança de forma de tributação da mercadoria</option>
                    <option value="03">03 — Solicitação da baixa cadastral / paralisação</option>
                    <option value="04">04 — Alteração de regime de pagamento</option>
                    <option value="05">05 — Por determinação dos fiscos</option>
                    <option value="06">06 — Controle das mercadorias sujeitas à ST</option>
                  </select>
                  <span className="erp-hint">Quantidade e custo de cada item somados dos movimentos de estoque até a data.</span></div>
              </>}
            </div>
          </div>

          {r && resultado && (
            <div className="erp-fieldset">
              <div className="erp-fieldset-head">Resumo — {MESES[pedido.mes - 1]}/{pedido.ano} <span style={{ fontWeight: 400, opacity: 0.65 }}>{resultado.nome_arquivo} · {r.linhas} linhas</span></div>
              <div className="erp-fieldset-body">
                <div className="erp-field erp-c12">
                  <div className="erp-metrics">
                    <div className="erp-metric"><div className="erp-metric-label">Entradas</div><div className="erp-metric-value">{r.entradas}</div></div>
                    <div className="erp-metric"><div className="erp-metric-label">Saídas</div><div className="erp-metric-value">{r.saidas}{r.canceladas ? ` (+${r.canceladas} canc.)` : ""}</div></div>
                    <div className="erp-metric"><div className="erp-metric-label">CT-e de frete</div><div className="erp-metric-value">{r.fretes}</div></div>
                    <div className="erp-metric"><div className="erp-metric-label">Participantes / itens</div><div className="erp-metric-value">{r.participantes} / {r.itens}</div></div>
                    {r.itens_inventario > 0 && <div className="erp-metric"><div className="erp-metric-label">Inventário ({r.itens_inventario} itens)</div><div className="erp-metric-value">{money(r.valor_inventario)}</div></div>}
                  </div>
                  <div className="erp-metrics" style={{ marginTop: 10 }}>
                    <div className="erp-metric"><div className="erp-metric-label">ICMS débitos</div><div className="erp-metric-value">{money(r.icms_debitos)}</div></div>
                    <div className="erp-metric"><div className="erp-metric-label">ICMS créditos</div><div className="erp-metric-value">{money(r.icms_creditos)}</div></div>
                    <div className="erp-metric"><div className="erp-metric-label">ICMS a recolher</div><div className="erp-metric-value">{money(r.icms_recolher)}</div></div>
                    <div className="erp-metric"><div className="erp-metric-label">Saldo credor a transportar</div><div className="erp-metric-value">{money(r.icms_saldo_credor)}</div></div>
                    {(r.ipi_debitos > 0 || r.ipi_creditos > 0) && <>
                      <div className="erp-metric"><div className="erp-metric-label">IPI débitos</div><div className="erp-metric-value">{money(r.ipi_debitos)}</div></div>
                      <div className="erp-metric"><div className="erp-metric-label">IPI créditos</div><div className="erp-metric-value">{money(r.ipi_creditos)}</div></div>
                    </>}
                  </div>
                </div>
                {resultado.avisos.length > 0 && (
                  <div className="erp-field erp-c12" style={{ marginTop: 10 }}>
                    <div className="erp-feedback info"><div>
                      <strong>O PVA vai cobrar — ajuste no cadastro e gere de novo:</strong>
                      <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>{resultado.avisos.map((a) => <li key={a}>{a}</li>)}</ul>
                    </div></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div></section>
      </div>

      <footer className="erp-statusbar">
        <div className="erp-status-item">Competência: <strong>{String(pedido.mes).padStart(2, "0")}/{pedido.ano}</strong></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

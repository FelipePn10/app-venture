import { useState } from "react";
import {
  cancelarOndaSeparacao, confirmarOndaSeparacao, criarOndaSeparacao, sugerirGuarda, sugerirSeparacao,
  type OndaDTO, type SugestaoGuardaDTO, type SugestaoSeparacaoDTO,
} from "@/services/stockService";
import { LookupField } from "@/components/ui/LookupField";
import { EntityName } from "@/components/ui/EntityName";
import { loadItems, loadWarehouses } from "@/services/lookups";
import { num, qtd, useAcao } from "./comum";
import { FeedbackBox, Resumo } from "./ui";

/** Separação (FEFO/FIFO), onda de separação e sugestão de guarda (endereçamento). */
export function SeparacaoTab({ itemCode }: { itemCode: string }) {
  const { busy, feedback, setFeedback, run } = useAcao();
  const [almox, setAlmox] = useState(0);
  const [regra, setRegra] = useState<"FEFO" | "FIFO">("FEFO");
  const [sepQtd, setSepQtd] = useState("");
  const [separacao, setSeparacao] = useState<SugestaoSeparacaoDTO | null>(null);
  const [ondaForm, setOndaForm] = useState({ code: "", linhas: "" });
  const [onda, setOnda] = useState<OndaDTO | null>(null);
  const [guardaQtd, setGuardaQtd] = useState("");
  const [guarda, setGuarda] = useState<SugestaoGuardaDTO[]>([]);

  const sugerir = () => run(async () => {
    const q = Number(sepQtd.replace(",", "."));
    if (!itemCode || !(q > 0)) { setFeedback({ type: "error", message: "Selecione o item (barra superior) e informe a quantidade." }); return; }
    const r = await sugerirSeparacao(itemCode, q, almox || undefined, regra);
    setSeparacao(r);
    setFeedback(r.missing_qty > 0 ? { type: "error", message: `Faltam ${num(r.missing_qty)} para completar a separação.` } : { type: "success", message: `Separação sugerida por ${r.rule}.` });
  });
  const gerarOnda = () => run(async () => {
    const code = Number(ondaForm.code);
    const lines = ondaForm.linhas.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [item, q] = l.split(";").map((p) => p.trim());
      return { item_code: item, quantity: Number((q ?? "").replace(",", ".")) };
    }).filter((l) => l.item_code && l.quantity > 0);
    if (!(code > 0) || !lines.length || !almox) { setFeedback({ type: "error", message: "Informe o número da onda, o almoxarifado e ao menos uma necessidade." }); return; }
    const r = await criarOndaSeparacao({ code, warehouse_id: almox, rule: regra, lines });
    setOnda(r);
    setFeedback(r.missing.length ? { type: "error", message: `Onda ${r.code} criada com falta em ${r.missing.length} item(ns).` } : { type: "success", message: `Onda ${r.code}: ${r.lines.length} parada(s) na caminhada.` });
  });
  const encerrar = (confirmar: boolean) => run(async () => {
    if (!onda) return;
    const r = confirmar ? await confirmarOndaSeparacao(onda.code) : await cancelarOndaSeparacao(onda.code);
    setOnda({ ...onda, status: r.status });
    setFeedback({ type: "success", message: confirmar ? `Onda ${r.code} separada: estoque baixado e reservas liberadas.` : `Onda ${r.code} cancelada: o reservado voltou a ficar disponível.` });
  });
  const sugerirOndeGuardar = () => run(async () => {
    const q = Number(guardaQtd.replace(",", "."));
    if (!itemCode || !(q > 0) || !almox) { setFeedback({ type: "error", message: "Informe item, almoxarifado e quantidade a guardar." }); return; }
    const r = await sugerirGuarda(itemCode, q, almox);
    setGuarda(r);
    setFeedback(r.length ? { type: "success", message: `${r.length} endereço(s) sugerido(s).` } : { type: "error", message: "Nenhum endereço livre comporta essa quantidade." });
  });

  return (<>
    <FeedbackBox feedback={feedback} />
    <div className="erp-fieldset"><div className="erp-fieldset-head">Parâmetros</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c4"><label className="erp-label">Almoxarifado</label>
        <LookupField value={almox || undefined} loader={loadWarehouses} entityLabel="almoxarifado" onChange={(c) => setAlmox(c ? Number(c) : 0)} /></div>
      <div className="erp-field erp-c4"><label className="erp-label">Regra</label>
        <select className="erp-input" value={regra} onChange={(e) => setRegra(e.target.value as "FEFO" | "FIFO")}>
          <option value="FEFO">FEFO — vence antes, sai antes</option><option value="FIFO">FIFO — entrou antes, sai antes</option>
        </select></div>
    </div></div>

    <div className="erp-fieldset"><div className="erp-fieldset-head">Separação — de onde tirar</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c2"><label className="erp-label">Quantidade</label><input className="erp-input num" value={sepQtd} onChange={(e) => setSepQtd(e.target.value)} /></div>
      <div className="erp-field erp-c3" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={sugerir} disabled={busy}>Sugerir separação</button></div>
      {separacao && (
        <div className="erp-field erp-c12">
          <div><Resumo>Necessário <strong>{qtd(separacao.required_qty)}</strong> · atendido <strong>{qtd(separacao.covered_qty)}</strong>
            {separacao.missing_qty > 0 && <> · <strong>faltam {qtd(separacao.missing_qty)}</strong></>}
            {separacao.expired_skipped > 0 && <> · {separacao.expired_skipped} lote(s) vencido(s) ignorado(s)</>}
            {separacao.blocked_skipped > 0 && <> · {separacao.blocked_skipped} em endereço bloqueado</>}</Resumo></div>
          <table className="erp-grid">
            <thead><tr><th>Rota</th><th>Endereço</th><th>Zona</th><th>Lote</th><th>Corrida</th><th>Certificado</th><th>Validade</th><th className="num">Disponível</th><th className="num">Separar</th></tr></thead>
            <tbody>{separacao.lines.map((l, i) => (
              <tr key={`${l.lot}-${l.address}-${i}`}>
                <td className="num">{l.pick_sequence || "—"}</td><td><strong>{l.address || "—"}</strong></td><td>{l.zone || "—"}</td>
                <td>{l.lot}</td><td>{l.heat_number ?? "—"}</td><td>{l.certificate ?? "—"}</td>
                <td>{l.expires_at ? new Date(l.expires_at).toLocaleDateString("pt-BR") : "—"}</td>
                <td className="num">{qtd(l.available_qty)}</td><td className="num"><strong>{qtd(l.suggested_qty)}</strong></td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
    </div></div>

    <div className="erp-fieldset"><div className="erp-fieldset-head">Onda de separação (várias necessidades numa caminhada)</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c2"><label className="erp-label erp-req">Nº da onda</label><input className="erp-input num" value={ondaForm.code} onChange={(e) => setOndaForm((p) => ({ ...p, code: e.target.value }))} /></div>
      <div className="erp-field erp-c6"><label className="erp-label erp-req">Necessidades</label>
        <textarea className="erp-input" rows={3} placeholder={"MP-CH-3MM;400\nMP-PERFIL-U;50"} value={ondaForm.linhas} onChange={(e) => setOndaForm((p) => ({ ...p, linhas: e.target.value }))} />
        <small className="erp-hint">Uma por linha: item;quantidade.</small></div>
      <div className="erp-field erp-c2" style={{ alignSelf: "end" }}><button className="erp-btn erp-btn-primary" onClick={gerarOnda} disabled={busy}>Gerar onda</button></div>
      {onda && (
        <div className="erp-field erp-c12">
          <div><Resumo>Onda <strong>{onda.code}</strong> · {onda.status} · regra {onda.rule} · {onda.lines.length} parada(s)
            {onda.missing.length > 0 && <> · <strong>falta:</strong> {onda.missing.map((m) => `${m.item_code} (${qtd(m.quantity)})`).join(", ")}</>}</Resumo></div>
          <table className="erp-grid">
            <thead><tr><th>Rota</th><th>Endereço</th><th>Item</th><th>Lote</th><th>Corrida</th><th className="num">Quantidade</th><th>Origem</th></tr></thead>
            <tbody>{onda.lines.map((l) => (
              <tr key={l.id}><td className="num">{l.pick_sequence || "—"}</td><td><strong>{l.address || "—"}</strong></td>
                <td><EntityName code={l.item_code} loader={loadItems} prefix="Item" /></td><td>{l.lot || "—"}</td><td>{l.heat_number ?? "—"}</td>
                <td className="num">{qtd(l.quantity)}</td><td>{l.reference_type ? `${l.reference_type} ${l.reference_code ?? ""}` : "—"}</td></tr>))}</tbody>
          </table>
          {onda.status === "ABERTA" && (
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              <button className="erp-btn erp-btn-primary" onClick={() => encerrar(true)} disabled={busy}>Confirmar separação</button>
              <button className="erp-btn" onClick={() => encerrar(false)} disabled={busy}>Cancelar onda</button>
            </div>
          )}
        </div>
      )}
    </div></div>

    <div className="erp-fieldset"><div className="erp-fieldset-head">Guardar recebimento (onde colocar)</div><div className="erp-fieldset-body">
      <div className="erp-field erp-c2"><label className="erp-label">Quantidade</label><input className="erp-input num" value={guardaQtd} onChange={(e) => setGuardaQtd(e.target.value)} /></div>
      <div className="erp-field erp-c3" style={{ alignSelf: "end" }}><button className="erp-btn" onClick={sugerirOndeGuardar} disabled={busy}>Sugerir endereço</button></div>
      {guarda.length > 0 && (
        <div className="erp-field erp-c12">
          <table className="erp-grid">
            <thead><tr><th>Endereço</th><th>Zona</th><th>Rota</th><th className="num">Já tem</th><th className="num">Capacidade</th><th>Por quê</th></tr></thead>
            <tbody>{guarda.map((g) => (
              <tr key={g.address}><td><strong>{g.address}</strong></td><td>{g.zone || "—"}</td><td className="num">{g.pick_sequence || "—"}</td>
                <td className="num">{qtd(g.current_qty)}</td><td className="num">{g.capacity == null ? "sem limite" : qtd(g.capacity)}</td><td>{g.reason}</td></tr>))}</tbody>
          </table>
        </div>
      )}
    </div></div>
  </>);
}

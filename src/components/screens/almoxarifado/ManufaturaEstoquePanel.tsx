import { useEffect, useState } from "react";
import { configureManufacturingStock, configureWarehouseAddress, listWarehouseAddresses } from "@/services/productionOrderService";
import { errMessage } from "@/services/fiscalShared";
import { LookupField } from "@/components/ui/LookupField";
import { loadWarehouses } from "@/services/lookups";
import { useAuthStore } from "@/store/authStore";

/*
 * Aba Manufatura da VENT0800 (era a rotina genérica VPRO1100): como a produção
 * devolve e baixa lotes, a janela de movimentação e os endereços de cada
 * almoxarifado usados na baixa por endereço. O controle de lote e de endereço
 * por item fica no cadastro do item (VENT0200, aba Estoque e compras).
 */
export function ManufaturaEstoquePanel(): JSX.Element {
  const isAdmin = useAuthStore((s) => s.user?.role?.toUpperCase() === "ADMIN");
  const [p, setP] = useState({ modo: "A" as "A" | "I" | "E", auto: false, de: "", ate: "" });
  const [almox, setAlmox] = useState<number | undefined>();
  const [enderecos, setEnderecos] = useState<{ address: string; is_active: boolean }[]>([]);
  const [novo, setNovo] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const run = async (fn: () => Promise<void>) => { setBusy(true); setFeedback(null); try { await fn(); } catch (e) { setFeedback({ type: "error", message: errMessage(e) }); } finally { setBusy(false); } };

  useEffect(() => { if (almox) void listWarehouseAddresses(almox).then(setEnderecos).catch(() => setEnderecos([])); else setEnderecos([]); }, [almox]);

  const gravarParametros = () => run(async () => {
    if (p.de && p.ate && p.de > p.ate) { setFeedback({ type: "error", message: "A data inicial não pode ser posterior à final." }); return; }
    await configureManufacturingStock({ lot_return_mode: p.modo, auto_issue_lots: p.auto, movement_from: p.de || undefined, movement_to: p.ate || undefined });
    setFeedback({ type: "success", message: "Parâmetros da manufatura gravados." });
  });
  const gravarEndereco = (address: string, is_active: boolean) => run(async () => {
    if (!almox || !address.trim()) { setFeedback({ type: "error", message: "Escolha o almoxarifado e informe o endereço." }); return; }
    await configureWarehouseAddress({ warehouse_id: almox, address: address.trim().toUpperCase(), is_active });
    setNovo(""); setEnderecos(await listWarehouseAddresses(almox));
  });

  return (
    <div className="erp-detail-body">
      {feedback && <div className={`erp-feedback ${feedback.type}`}>{feedback.message}</div>}
      <div className="erp-fieldset"><div className="erp-fieldset-head">Parâmetros de estoque da manufatura (empresa)</div><div className="erp-fieldset-body">
        <div className="erp-field erp-c4"><label className="erp-label">Devolução de lote</label><select className="erp-input" value={p.modo} onChange={(e) => setP((x) => ({ ...x, modo: e.target.value as "A" | "I" | "E" }))}>
          <option value="A">Automática — o sistema escolhe o lote</option><option value="I">Informada — o operador informa o lote</option><option value="E">Estorno — volta ao lote de origem</option></select></div>
        <div className="erp-field erp-c3"><label className="erp-check" style={{ marginTop: 22 }}><input type="checkbox" checked={p.auto} onChange={(e) => setP((x) => ({ ...x, auto: e.target.checked }))} /> Baixar lotes automaticamente</label></div>
        <div className="erp-field erp-c2"><label className="erp-label">Movimentação de</label><input className="erp-input" type="date" value={p.de} onChange={(e) => setP((x) => ({ ...x, de: e.target.value }))} /></div>
        <div className="erp-field erp-c2"><label className="erp-label">até</label><input className="erp-input" type="date" value={p.ate} onChange={(e) => setP((x) => ({ ...x, ate: e.target.value }))} /></div>
        <div className="erp-field erp-c12" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <span className="erp-field-hint">Fora da janela de movimentação, a produção não movimenta estoque. Os valores atuais não são exibidos: gravar substitui os anteriores.</span>
          <button className="erp-btn erp-btn-primary" onClick={() => void gravarParametros()} disabled={busy || !isAdmin} title={isAdmin ? undefined : "Somente o administrador"}>Gravar parâmetros</button></div>
      </div></div>
      <div className="erp-fieldset"><div className="erp-fieldset-head">Endereços do almoxarifado</div><div className="erp-fieldset-body">
        <div className="erp-field erp-c5"><label className="erp-label erp-req">Almoxarifado</label><LookupField value={almox} loader={loadWarehouses} entityLabel="almoxarifado" clearable onChange={(c) => setAlmox(c ? Number(c) : undefined)} /></div>
        {almox && <>
          <div className="erp-field erp-c4"><label className="erp-label">Novo endereço</label><input className="erp-input" placeholder="Ex.: A-01-03" value={novo} onChange={(e) => setNovo(e.target.value)} /></div>
          <div className="erp-field erp-c3" style={{ justifyContent: "flex-end" }}><button className="erp-btn" onClick={() => void gravarEndereco(novo, true)} disabled={busy || !isAdmin || !novo.trim()}>Incluir endereço</button></div>
          <div className="erp-field erp-c12"><table className="erp-grid"><thead><tr><th>Endereço ativo</th><th style={{ width: 110 }} /></tr></thead><tbody>
            {enderecos.length === 0 && <tr><td colSpan={2} className="erp-grid-empty">Nenhum endereço neste almoxarifado.</td></tr>}
            {enderecos.map((a) => <tr key={a.address}><td style={{ fontWeight: 600 }}>{a.address}</td>
              <td><button className="erp-btn erp-btn-sm" onClick={() => void gravarEndereco(a.address, false)} disabled={busy || !isAdmin}>Inativar</button></td></tr>)}
          </tbody></table><span className="erp-field-hint">Endereço inativo some da lista e da baixa; para reativar, inclua-o de novo.</span></div>
        </>}
      </div></div>
    </div>
  );
}

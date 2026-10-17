import { useState } from "react";
import { ExportButton } from "@/components/ui/ExportButton";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems } from "@/services/lookups";
import { PosicaoTab } from "./estoque/PosicaoTab";
import { KardexTab } from "./estoque/KardexTab";
import { LancamentosTab } from "./estoque/LancamentosTab";
import { TransferenciasTab } from "./estoque/TransferenciasTab";
import { ReservasTab } from "./estoque/ReservasTab";
import { RequisicoesTab } from "./estoque/RequisicoesTab";
import { SeparacaoTab } from "./estoque/SeparacaoTab";
import { LotesTab } from "./estoque/LotesTab";
import { ReposicaoTab } from "./estoque/ReposicaoTab";
import { AnaliseTab } from "./estoque/AnaliseTab";
import { useUnidadeDoItem } from "./estoque/comum";

/**
 * Central de estoque. Cada assunto é uma aba, e o item escolhido na barra vale
 * para todas — a pessoa consulta a posição, abre o extrato e lança sem
 * escolher o item de novo. Inventário e tipos de movimento ficam na VEST0200;
 * contagem cíclica na VEST0500; almoxarifados na VENT0800.
 */
type Aba = "posicao" | "extrato" | "lancamentos" | "transferencias" | "reservas" | "requisicoes" | "separacao" | "lotes" | "reposicao" | "analises";

const ABAS: { id: Aba; label: string; hint: string }[] = [
  { id: "posicao", label: "Posição", hint: "ATP por situação do estoque e posição valorizada em qualquer data" },
  { id: "extrato", label: "Extrato", hint: "Kardex: saldo anterior, movimentos com saldo acumulado e estorno" },
  { id: "lancamentos", label: "Lançamentos", hint: "Entrada/saída manual com tipo de movimento e centro de custo" },
  { id: "transferencias", label: "Transferências", hint: "Entre almoxarifados (uma operação) e entre endereços" },
  { id: "requisicoes", label: "Requisições", hint: "Pedido interno ao almoxarifado, atendimento por centro de custo" },
  { id: "reservas", label: "Reservas", hint: "Reservar, liberar e consumir saldo" },
  { id: "separacao", label: "Separação e guarda", hint: "FEFO/FIFO, ondas e endereço sugerido" },
  { id: "lotes", label: "Lotes", hint: "Registro, saldo por lote e genealogia" },
  { id: "reposicao", label: "Reposição", hint: "Ponto de pedido / mínimo e geração de requisição de compra" },
  { id: "analises", label: "Análises", hint: "Giro, cobertura, itens parados, curva ABC e lotes a vencer" },
];

export function Vest0100Page(): JSX.Element {
  const [aba, setAba] = useState<Aba>("posicao");
  const [itemCode, setItemCode] = useState("");
  const uom = useUnidadeDoItem(itemCode);

  return (
    <div className="erp-screen">
      <header className="erp-titlebar">
        <div className="erp-brand"><div className="erp-brand-logo">V</div></div>
        <nav className="erp-crumbs"><span className="erp-crumb-mut">Almoxarifado</span><span className="erp-crumb-sep">›</span><span className="erp-crumb-cur">Central de estoque</span><span className="erp-crumb-code">VEST0100</span></nav>
        <div className="erp-titlebar-spacer" />
      </header>

      <div className="erp-toolbar">
        <div className="erp-tgroup"><span className="erp-tgroup-label">Item</span>
          <div className="erp-tlookup"><LookupField value={itemCode || undefined} loader={loadItems} entityLabel="item" placeholder="Selecionar item" clearable onChange={(c) => setItemCode(String(c ?? ""))} /></div>
          {uom && <span className="erp-badge erp-badge-gray" title="Unidade de estoque do item">UM {uom}</span>}
        </div>
        <div className="erp-tgroup"><span className="erp-tgroup-label">Relatório</span>
          <ExportButton title="VEST0100 — Estoque" filename="vest0100" /></div>
      </div>

      <div className="erp-content">
        <section className="erp-detail-panel">
          <div className="erp-tabs" role="tablist">
            {ABAS.map((a) => (
              <button key={a.id} role="tab" aria-selected={aba === a.id} className={`erp-tab${aba === a.id ? " active" : ""}`} onClick={() => setAba(a.id)} title={a.hint}>{a.label}</button>
            ))}
          </div>
          <div className="erp-detail-body">
            {aba === "posicao" && <PosicaoTab itemCode={itemCode} />}
            {aba === "extrato" && <KardexTab itemCode={itemCode} />}
            {aba === "lancamentos" && <LancamentosTab itemCode={itemCode} />}
            {aba === "transferencias" && <TransferenciasTab itemCode={itemCode} />}
            {aba === "requisicoes" && <RequisicoesTab />}
            {aba === "reservas" && <ReservasTab itemCode={itemCode} />}
            {aba === "separacao" && <SeparacaoTab itemCode={itemCode} />}
            {aba === "lotes" && <LotesTab itemCode={itemCode} />}
            {aba === "reposicao" && <ReposicaoTab />}
            {aba === "analises" && <AnaliseTab />}
          </div>
        </section>
      </div>

      <footer className="erp-statusbar">
        <div style={{ display: "contents" }}><div className="erp-status-item">{ABAS.find((a) => a.id === aba)?.hint}</div></div>
        <div className="erp-status-spacer" /><span className="erp-status-brand">GRUPO VENTURE LTDA — VentureERP</span>
      </footer>
    </div>
  );
}

import { useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Vent0800Page } from "./almoxarifado/Vent0800Page";

import { Vent0200Page } from "./engenharia/Vent0200Page";
import { Vent0210Page } from "./engenharia/Vent0210Page";
import { Vent0108Page } from "./engenharia/Vent0108Page";
import { Vpme0102Page } from "./engenharia/Vpme0102Page";
import { Vpme0102ItePage } from "./engenharia/Vpme0102ItePage";
import { Vite0114Page } from "./engenharia/Vite0114Page";
import { Vite0115Page } from "./engenharia/Vite0115Page";
import { Vite0116Page } from "./engenharia/Vite0116Page";
import { Vctb0102Page } from "./contabilidade/Vctb0102Page";
import { Vutl0555Page } from "./contabilidade/Vutl0555Page";
import { Vpla0102Page } from "./planejamento/Vpla0102Page";
import { Vpre0101Page } from "./previsao/Vpre0101Page";
import { Vpre0102Page } from "./previsao/Vpre0102Page";
import { Vpre0201Page } from "./previsao/Vpre0201Page";
import { Vpre0251Page } from "./previsao/Vpre0251Page";
import { Vpre0301Page } from "./previsao/Vpre0301Page";
import { Vass0201Page } from "./assistencia/Vass0201Page";
import { Vass0402Page } from "./assistencia/Vass0402Page";
import { Vatc0280Page } from "./assistencia/Vatc0280Page";
import { Vatc0480Page } from "./assistencia/Vatc0480Page";
import { Vatc0380Page } from "./assistencia/Vatc0380Page";
import { Vcli0500Page } from "./cliente/Vcli0500Page";
import { Vcli0510Page } from "./cliente/Vcli0510Page";
import { Vcli0520Page } from "./cliente/Vcli0520Page";
import { Vcli0530Page } from "./cliente/Vcli0530Page";
import { Vcst0202Page } from "./custo/Vcst0202Page";
import { Vpdv0108Page } from "./pdv/Vpdv0108Page";
import { Vpdv0111Page } from "./pdv/Vpdv0111Page";
import { Vvre0200Page } from "./pdv/Vvre0200Page";
import { Vre0203Page } from "./pdv/Vre0203Page";
import { Vcon0100Page } from "./suprimento/Vcon0100Page";
import { Vcon0200Page } from "./suprimento/Vcon0200Page";
import { Vcon0400Page } from "./suprimento/Vcon0400Page";
import { Vcon0202Page } from "./suprimento/Vcon0202Page";
import { Vavr0200Page } from "./suprimento/Vavr0200Page";
import { Vins0105Page } from "./inspecao/Vins0105Page";
import { Vins0106Page } from "./inspecao/Vins0106Page";
import { Vins0200Page } from "./inspecao/Vins0200Page";
import { Vins0211Page } from "./inspecao/Vins0211Page";
import { Vavf0105Page } from "./inspecao/Vavf0105Page";
import { Vavf0101Page } from "./inspecao/Vavf0101Page";
import { Vfin0100Page } from "./financeiro/Vfin0100Page";
import { Vfin0110Page } from "./financeiro/Vfin0110Page";
import { Vfin0120Page } from "./financeiro/Vfin0120Page";
import { Vfin0130Page } from "./financeiro/Vfin0130Page";
import { Vfin0200Page } from "./financeiro/Vfin0200Page";
import { Vfin0210Page } from "./financeiro/Vfin0210Page";
import { Vfin0300Page } from "./financeiro/Vfin0300Page";
import { Vfin0400Page } from "./financeiro/Vfin0400Page";
import { Vfin0500Page } from "./financeiro/Vfin0500Page";
import { Vfis0100Page } from "./fiscal/Vfis0100Page";
import { Vfis0110Page } from "./fiscal/Vfis0110Page";
import { Vfis0200Page } from "./fiscal/Vfis0200Page";
import { Vfis0210Page } from "./fiscal/Vfis0210Page";
import { Vfis0220Page } from "./fiscal/Vfis0220Page";
import { Vfis0300Page } from "./fiscal/Vfis0300Page";
import { Vfis0310Page } from "./fiscal/Vfis0310Page";
import { Vfis0320Page } from "./fiscal/Vfis0320Page";
import { Vfis0330Page } from "./fiscal/Vfis0330Page";
import { Vfis0340Page } from "./fiscal/Vfis0340Page";
import { Vfis0350Page } from "./fiscal/Vfis0350Page";
import { Vfis0360Page } from "./fiscal/Vfis0360Page";
import { Vfis0500Page } from "./fiscal/Vfis0500Page";
import { Vfis0510Page } from "./fiscal/Vfis0510Page";
import { Vfis0520Page } from "./fiscal/Vfis0520Page";
import { Vfis0530Page } from "./fiscal/Vfis0530Page";
import { Vfis0540Page } from "./fiscal/Vfis0540Page";
import { Vfis0550Page } from "./fiscal/Vfis0550Page";
import { Vfis0560Page } from "./fiscal/Vfis0560Page";
import { Vemp0100Page } from "./cadastros/Vemp0100Page";
import { Vfun0100Page } from "./cadastros/Vfun0100Page";
import { Vloc0100Page } from "./cadastros/Vloc0100Page";
import { Vcla0100Page } from "./cadastros/Vcla0100Page";
import { Vcal0100Page } from "./cadastros/Vcal0100Page";
import { Vpri0100Page } from "./cadastros/Vpri0100Page";
import { Vctb0200Page } from "./contabilidade/Vctb0200Page";
import { Vnfs0100Page } from "./fiscal/Vnfs0100Page";
import { Vexp0100Page } from "./almoxarifado/Vexp0100Page";
import { Vvnd0100Page } from "./comercial/Vvnd0100Page";
import { Vvnd0200Page } from "./comercial/Vvnd0200Page";
import { Vvnd0300Page } from "./comercial/Vvnd0300Page";
import { Vvnd0400Page } from "./comercial/Vvnd0400Page";
import { Vvnd0500Page } from "./comercial/Vvnd0500Page";
import { Vsac0100Page } from "./comercial/Vsac0100Page";
import { Vdpr0100Page } from "./comercial/Vdpr0100Page";
import { Vpro0900Page } from "./producao/Vpro0900Page";
import { Vpro1000Page } from "./producao/Vpro1000Page";
import { Vpro0100Page } from "./producao/Vpro0100Page";
import { Vpro0200Page } from "./producao/Vpro0200Page";
import { Vpro0210Page } from "./producao/Vpro0210Page";
import { Vpro0300Page } from "./producao/Vpro0300Page";
import { Vpro0400Page } from "./producao/Vpro0400Page";
import { Vpro0500Page } from "./producao/Vpro0500Page";
import { Vpro0600Page } from "./producao/Vpro0600Page";
import { Vpro0700Page } from "./producao/Vpro0700Page";
import { Vpro0800Page } from "./producao/Vpro0800Page";
import { Vcus0100Page } from "./custo/Vcus0100Page";
import { Vest0100Page } from "./almoxarifado/Vest0100Page";
import { Vcut0100Page } from "./producao/Vcut0100Page";
import { Vmrp0100Page } from "./planejamento/Vmrp0100Page";
import { Vsup0500Page } from "./suprimento/Vsup0500Page";
import { Vsup0510Page } from "./suprimento/Vsup0510Page";
import { Vsup0110Page } from "./suprimento/Vsup0110Page";
import { Vsup0120Page } from "./suprimento/Vsup0120Page";
import { Vsup0130Page } from "./suprimento/Vsup0130Page";
import { Vsup0200Page } from "./suprimento/Vsup0200Page";
import { Vsup0300Page } from "./suprimento/Vsup0300Page";
import { Vsup0400Page } from "./suprimento/Vsup0400Page";
import { Vitm0100Page } from "./engenharia/Vitm0100Page";
import { Vest0200Page } from "./almoxarifado/Vest0200Page";
import { Vmaq0101Page } from "./engenharia/Vmaq0101Page";
import { Vmaq0200Page } from "./engenharia/Vmaq0200Page";
import { Vexr0100Page } from "./comercial/Vexr0100Page";
import { WindowControls } from "@/components/window/WindowControls";
import { OperationalRoutinePage } from "./OperationalRoutinePage";
import { OPERATIONAL_ROUTINES } from "./operationalRoutines";

const SCREEN_REGISTRY: Record<string, JSX.Element> = {
  ...Object.fromEntries(Object.entries(OPERATIONAL_ROUTINES).map(([code, routine]) => [code, <OperationalRoutinePage key={code} routine={routine} />])),
  // Engenharia
  VENT0108: <Vent0108Page />,
  VPME0102: <Vpme0102Page />,
  VPME0102ITE: <Vpme0102ItePage />,
  VENT0200: <Vent0200Page />,
  VENT0210: <Vent0210Page />,
  VITE0114: <Vite0114Page />,
  VITE0115: <Vite0115Page />,
  VITE0116: <Vite0116Page />,
  // Comercial
  // Almoxarifado
  VENT0800: <Vent0800Page />,
  // Contabilidade
  VCTB0102: <Vctb0102Page />,
  VUTL0555: <Vutl0555Page />,
  // Planejamento
  VPLA0102: <Vpla0102Page />,
  VPRE0101: <Vpre0101Page />,
  VPRE0102: <Vpre0102Page />,
  VPRE0201: <Vpre0201Page />,
  VPRE0251: <Vpre0251Page />,
  VPRE0301: <Vpre0301Page />,
  // Assistência Técnica
  VASS0201: <Vass0201Page />,
  VASS0402: <Vass0402Page />,
  VATC0280: <Vatc0280Page />,
  VATC0480: <Vatc0480Page />,
  VATC0380: <Vatc0380Page />,
  // Cliente
  VCLI0500: <Vcli0500Page />,
  VCLI0510: <Vcli0510Page />,
  VCLI0520: <Vcli0520Page />,
  VCLI0530: <Vcli0530Page />,

  // Vendas & Expedição (novas)
  VEXP0100: <Vexp0100Page />,
  VVND0100: <Vvnd0100Page />,
  VVND0200: <Vvnd0200Page />,
  VVND0300: <Vvnd0300Page />,
  VVND0400: <Vvnd0400Page />,
  VVND0500: <Vvnd0500Page />,
  VSAC0100: <Vsac0100Page />,
  VDPR0100: <Vdpr0100Page />,
  VPRO0900: <Vpro0900Page />,
  VPRO1000: <Vpro1000Page />,
  VPRO0100: <Vpro0100Page />,
  VPRO0200: <Vpro0200Page />,
  VPRO0210: <Vpro0210Page />,
  VPRO0300: <Vpro0300Page />,
  VPRO0400: <Vpro0400Page />,
  VPRO0500: <Vpro0500Page />,
  VPRO0600: <Vpro0600Page />,
  VPRO0700: <Vpro0700Page />,
  VPRO0800: <Vpro0800Page />,
  VCUS0100: <Vcus0100Page />,
  VEST0100: <Vest0100Page />,
  VEST0200: <Vest0200Page />,
  VCUT0100: <Vcut0100Page />,
  VMRP0100: <Vmrp0100Page />,
  VSUP0500: <Vsup0500Page />,
  VSUP0510: <Vsup0510Page />,
  VSUP0110: <Vsup0110Page />,
  VSUP0120: <Vsup0120Page />,
  VSUP0130: <Vsup0130Page />,
  VSUP0200: <Vsup0200Page />,
  VSUP0300: <Vsup0300Page />,
  VSUP0400: <Vsup0400Page />,
  VITM0100: <Vitm0100Page />,
  VMAQ0101: <Vmaq0101Page />,
  VMAQ0200: <Vmaq0200Page />,
  VEXR0100: <Vexr0100Page />,

  // Cadastros & Plataforma (novas)
  VEMP0100: <Vemp0100Page />,
  VFUN0100: <Vfun0100Page />,
  VLOC0100: <Vloc0100Page />,
  VCLA0100: <Vcla0100Page />,
  VCAL0100: <Vcal0100Page />,
  VPRI0100: <Vpri0100Page />,
  VCTB0200: <Vctb0200Page />,
  VNFS0100: <Vnfs0100Page />,

  // Fiscal & Financeiro
  VFIN0100: <Vfin0100Page />,
  VFIN0110: <Vfin0110Page />,
  VFIN0120: <Vfin0120Page />,
  VFIN0130: <Vfin0130Page />,
  VFIN0200: <Vfin0200Page />,
  VFIN0210: <Vfin0210Page />,
  VFIN0300: <Vfin0300Page />,
  VFIN0400: <Vfin0400Page />,
  VFIN0500: <Vfin0500Page />,
  VFIS0100: <Vfis0100Page />,
  VFIS0110: <Vfis0110Page />,
  VFIS0200: <Vfis0200Page />,
  VFIS0210: <Vfis0210Page />,
  VFIS0220: <Vfis0220Page />,
  VFIS0300: <Vfis0300Page />,
  VFIS0310: <Vfis0310Page />,
  VFIS0320: <Vfis0320Page />,
  VFIS0330: <Vfis0330Page />,
  VFIS0340: <Vfis0340Page />,
  VFIS0350: <Vfis0350Page />,
  VFIS0360: <Vfis0360Page />,
  VFIS0500: <Vfis0500Page />,
  VFIS0510: <Vfis0510Page />,
  VFIS0520: <Vfis0520Page />,
  VFIS0530: <Vfis0530Page />,
  VFIS0540: <Vfis0540Page />,
  VFIS0550: <Vfis0550Page />,
  VFIS0560: <Vfis0560Page />,
  // Custos
  VCST0202: <Vcst0202Page />,
  // PDV
  VPDV0108: <Vpdv0108Page />,
  VPDV0111: <Vpdv0111Page />,
  VVRE0200: <Vvre0200Page />,
  VRE0203: <Vre0203Page />,
  // Manutenção
  // Suprimento
  // Código legado direcionado à implementação real de Pedido de Compra.
  VCON0100: <Vcon0100Page />,
  VCON0200: <Vcon0200Page />,
  VCON0400: <Vcon0400Page />,
  VCON0202: <Vcon0202Page />,
  VAVR0200: <Vavr0200Page />,
  // Inspeção
  VINS0105: <Vins0105Page />,
  VINS0106: <Vins0106Page />,
  VINS0200: <Vins0200Page />,
  VINS0211: <Vins0211Page />,
  VAVF0105: <Vavf0105Page />,
  VAVF0101: <Vavf0101Page />,
};

export function ScreenHostPage(): JSX.Element {
  const { code } = useParams<{ code: string }>();

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (e.clientY > 52) return;
      if (
        (e.target as HTMLElement).closest("button, input, select, a, textarea")
      )
        return;
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) { try { void getCurrentWindow().startDragging(); } catch { /* not in Tauri */ } }
    }
    window.addEventListener("mousedown", onMouseDown, true);
    return () => window.removeEventListener("mousedown", onMouseDown, true);
  }, []);

  const screen = useMemo(() => {
    if (code && code in SCREEN_REGISTRY) {
      return SCREEN_REGISTRY[code];
    }
    return (
      <main className="screen-layout">
        <header>
          <h1>{code ?? "Tela não encontrada"}</h1>
          <p>Tela ainda não implementada.</p>
        </header>
      </main>
    );
  }, [code]);

  return (
    <div className="screen-host" style={{ position: "relative" }}>
      {screen}

      <span className="screen-host-routine-code" aria-label={`Rotina ${code ?? "desconhecida"}`}>
        {code ?? "—"}
      </span>

      {/* Window controls pinned to top-right */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "52px",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
        }}
      >
        <WindowControls />
      </div>
    </div>
  );
}

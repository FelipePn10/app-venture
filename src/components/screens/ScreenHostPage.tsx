import { useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Vent0100Page } from "./comercial/Vent0100Page";
import { Vent0800Page } from "./almoxarifado/Vent0800Page";

import { Vent0200Page } from "./engenharia/Vent0200Page";
import { Vent0204Page } from "./engenharia/pdm/Vent0204Page";
import { Vent0210Page } from "./engenharia/Vent0210Page";
import { Vent0108Page } from "./engenharia/Vent0108Page";
import { Vpme0102Page } from "./engenharia/Vpme0102Page";
import { Vpme0102ItePage } from "./engenharia/Vpme0102ItePage";
import { Vent0115Page } from "./engenharia/Vent0115Page";
import { Vent0202Page } from "./engenharia/Vent0202Page";
import { Vent0363Page } from "./engenharia/Vent0363Page";
import { Veng0204Page } from "./engenharia/Veng0204Page";
import { Vite0313Page } from "./engenharia/Vite0313Page";
import { Vite0114Page } from "./engenharia/Vite0114Page";
import { Vite0115Page } from "./engenharia/Vite0115Page";
import { Vite0116Page } from "./engenharia/Vite0116Page";
import { Vite0118Page } from "./engenharia/Vite0118Page";
import { Vite0129Page } from "./engenharia/Vite0129Page";
import { Vctb0102Page } from "./contabilidade/Vctb0102Page";
import { Vutl0555Page } from "./contabilidade/Vutl0555Page";
import { Vpla0102Page } from "./planejamento/Vpla0102Page";
import { Vplc0211Page } from "./planejamento/Vplc0211Page";
import { Vplc0200Page } from "./planejamento/Vplc0200Page";
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
import { Vgar0211Page } from "./garantia/Vgar0211Page";
import { Vcli0202Page } from "./cliente/Vcli0202Page";
import { Vcli0117Page } from "./cliente/Vcli0117Page";
import { Vcst0202Page } from "./custo/Vcst0202Page";
import { Vpdv0200Page } from "./pdv/Vpdv0200Page";
import { Vpdv0253Page } from "./pdv/Vpdv0253Page";
import { Vpdv0108Page } from "./pdv/Vpdv0108Page";
import { Vpdv0111Page } from "./pdv/Vpdv0111Page";
import { Vvre0200Page } from "./pdv/Vvre0200Page";
import { Vre0203Page } from "./pdv/Vre0203Page";
import { Vman0202Page } from "./manutencao/Vman0202Page";
import { Vman0401Page } from "./manutencao/Vman0401Page";
import { Vpdc0200Page } from "./suprimento/Vpdc0200Page";
import { Vcon0100Page } from "./suprimento/Vcon0100Page";
import { Vcon0200Page } from "./suprimento/Vcon0200Page";
import { Vcon0400Page } from "./suprimento/Vcon0400Page";
import { Vcon0202Page } from "./suprimento/Vcon0202Page";
import { Vavr0200Page } from "./suprimento/Vavr0200Page";
import { Vvor0202Page } from "./suprimento/Vvor0202Page";
import { Vimp0200Page } from "./importacao/Vimp0200Page";
import { Vimp0102Page } from "./importacao/Vimp0102Page";
import { Vimp0101Page } from "./importacao/Vimp0101Page";
import { Vins0105Page } from "./inspecao/Vins0105Page";
import { Vins0106Page } from "./inspecao/Vins0106Page";
import { Vins0400Page } from "./inspecao/Vins0400Page";
import { Vins0313Page } from "./inspecao/Vins0313Page";
import { Vins0200Page } from "./inspecao/Vins0200Page";
import { Vins0201Page } from "./inspecao/Vins0201Page";
import { Vins0206Page } from "./inspecao/Vins0206Page";
import { Vins0211Page } from "./inspecao/Vins0211Page";
import { Vavf0105Page } from "./inspecao/Vavf0105Page";
import { Vavf0101Page } from "./inspecao/Vavf0101Page";
import { Vavf0204Page } from "./inspecao/Vavf0204Page";
import { WindowControls } from "@/components/window/WindowControls";

const SCREEN_REGISTRY: Record<string, JSX.Element> = {
  // Engenharia
  VENT0108: <Vent0108Page />,
  VPME0102: <Vpme0102Page />,
  VPME0102ITE: <Vpme0102ItePage />,
  VENT0200: <Vent0200Page />,
  VENT0210: <Vent0210Page />,
  VENT0204: <Vent0204Page />,
  VENT0115: <Vent0115Page />,
  VENT0202: <Vent0202Page />,
  VENT0363: <Vent0363Page />,
  VENG0204: <Veng0204Page />,
  VITE0313: <Vite0313Page />,
  VITE0114: <Vite0114Page />,
  VITE0115: <Vite0115Page />,
  VITE0116: <Vite0116Page />,
  VITE0118: <Vite0118Page />,
  VITE0129: <Vite0129Page />,
  // Comercial
  VENT0100: <Vent0100Page />,
  // Almoxarifado
  VENT0800: <Vent0800Page />,
  // Contabilidade
  VCTB0102: <Vctb0102Page />,
  VUTL0555: <Vutl0555Page />,
  // Planejamento
  VPLA0102: <Vpla0102Page />,
  VPLC0211: <Vplc0211Page />,
  VPLC0200: <Vplc0200Page />,
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
  // Garantia
  VGAR0211: <Vgar0211Page />,
  // Cliente
  VCLI0202: <Vcli0202Page />,
  VCLI0117: <Vcli0117Page />,
  // Custos
  VCST0202: <Vcst0202Page />,
  // PDV
  VPDV0200: <Vpdv0200Page />,
  VPDV0253: <Vpdv0253Page />,
  VPDV0108: <Vpdv0108Page />,
  VPDV0111: <Vpdv0111Page />,
  VVRE0200: <Vvre0200Page />,
  VRE0203: <Vre0203Page />,
  // Manutenção
  VMAN0202: <Vman0202Page />,
  VMAN0401: <Vman0401Page />,
  // Suprimento
  VPDC0200: <Vpdc0200Page />,
  VCON0100: <Vcon0100Page />,
  VCON0200: <Vcon0200Page />,
  VCON0400: <Vcon0400Page />,
  VCON0202: <Vcon0202Page />,
  VAVR0200: <Vavr0200Page />,
  VVOR0202: <Vvor0202Page />,
  // Importação
  VIMP0200: <Vimp0200Page />,
  VIMP0102: <Vimp0102Page />,
  VIMP0101: <Vimp0101Page />,
  // Inspeção
  VINS0105: <Vins0105Page />,
  VINS0106: <Vins0106Page />,
  VINS0400: <Vins0400Page />,
  VINS0313: <Vins0313Page />,
  VINS0200: <Vins0200Page />,
  VINS0201: <Vins0201Page />,
  VINS0206: <Vins0206Page />,
  VINS0211: <Vins0211Page />,
  VAVF0105: <Vavf0105Page />,
  VAVF0101: <Vavf0101Page />,
  VAVF0204: <Vavf0204Page />,
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
      void getCurrentWindow().startDragging();
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
    <div style={{ position: "relative" }}>
      {screen}

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

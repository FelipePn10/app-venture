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
import { Vctb0102Page } from "./contabilidade/Vctb0102Page";
import { Vpla0102Page } from "./planejamento/Vpla0102Page";
import { Vpre0101Page } from "./previsao/Vpre0101Page";
import { Vpre0102Page } from "./previsao/Vpre0102Page";
import { Vpre0201Page } from "./previsao/Vpre0201Page";
import { Vpre0251Page } from "./previsao/Vpre0251Page";
import { Vpre0301Page } from "./previsao/Vpre0301Page";
import { WindowControls } from "@/components/window/WindowControls";

const SCREEN_REGISTRY: Record<string, JSX.Element> = {
  VENT0108: <Vent0108Page />,
  VPME0102: <Vpme0102Page />,
  VPME0102ITE: <Vpme0102ItePage />,
  VCTB0102: <Vctb0102Page />,
  VENT0200: <Vent0200Page />,
  VENT0210: <Vent0210Page />,
  VENT0100: <Vent0100Page />,
  VENT0800: <Vent0800Page />,
  VENT0204: <Vent0204Page />,
  VPLA0102: <Vpla0102Page />,
  VPRE0101: <Vpre0101Page />,
  VPRE0102: <Vpre0102Page />,
  VPRE0201: <Vpre0201Page />,
  VPRE0251: <Vpre0251Page />,
  VPRE0301: <Vpre0301Page />,
};

export function ScreenHostPage(): JSX.Element {
  const { code } = useParams<{ code: string }>();

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (e.clientY > 52) return;
      if ((e.target as HTMLElement).closest("button, input, select, a, textarea")) return;
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

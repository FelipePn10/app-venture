import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { Vent0100Page } from "./comercial/Vent0100Page";
import { Vent0800Page } from "./almoxarifado/Vent0800Page";
import { Vent0200Page } from "./engenharia/Vent0200Page";
import { Vent0204Page } from "./engenharia/pdm/Vent0204Page";
import { Vent0210Page } from "./engenharia/Vent0210Page";

const SCREEN_REGISTRY: Record<string, JSX.Element> = {
  VENT0200: <Vent0200Page />,
  VENT0210: <Vent0210Page />,
  VENT0100: <Vent0100Page />,
  VENT0800: <Vent0800Page />,
  VENT0204: <Vent0204Page />,
};

export function ScreenHostPage(): JSX.Element {
  const { code } = useParams<{ code: string }>();

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

  return screen;
}

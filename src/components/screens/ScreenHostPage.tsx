import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { Fite0200Page } from "@/components/screens/Fite0200Page";
import { Vent0100Page } from "./comercial/Vent0100Page";

const SCREEN_REGISTRY: Record<string, JSX.Element> = {
  FITE0200: <Fite0200Page />,
  VENT0100: <Vent0100Page />,
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

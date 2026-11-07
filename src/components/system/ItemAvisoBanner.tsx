import { useEffect, useState } from "react";
import { ITEM_AVISO_EVENT } from "@/services/httpClient";

/**
 * A política "com aviso" deixa o documento passar: o aviso tem de aparecer em
 * qualquer tela que gravou o item, então ele vive fora delas.
 */
export function ItemAvisoBanner(): JSX.Element | null {
  const [aviso, setAviso] = useState("");
  useEffect(() => {
    const ouvir = (e: Event) => setAviso((e as CustomEvent<string>).detail);
    window.addEventListener(ITEM_AVISO_EVENT, ouvir);
    return () => window.removeEventListener(ITEM_AVISO_EVENT, ouvir);
  }, []);
  if (!aviso) return null;
  return (
    <div className="erp-feedback warn" id="item-aviso-global" role="alert" style={{ position: "fixed", top: 12, right: 16, zIndex: 2000, maxWidth: 520, margin: 0 }}>
      <span>Item com restrição de cadastro usado neste documento: {aviso}. O uso ficou registrado no histórico.</span>
      <button className="erp-btn erp-btn-sm" onClick={() => setAviso("")}>Fechar</button>
    </div>
  );
}

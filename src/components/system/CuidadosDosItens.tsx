import { useEffect, useState } from "react";
import { cuidadosDosItens, textoDoCuidado, type CuidadoDoItem } from "@/services/cuidadosDosItens";

/**
 * Aviso com os cuidados dos itens de um documento (OF, entrada, requisição,
 * separação, romaneio). Quem recebe, fabrica, separa ou expede lê antes de mexer
 * no material. Não aparece quando nenhum item tem cuidado cadastrado.
 */
export function CuidadosDosItens({ codigos, contexto }: { codigos: (string | null | undefined)[]; contexto: string }): JSX.Element | null {
  const [mapa, setMapa] = useState<Map<string, CuidadoDoItem>>(new Map());
  useEffect(() => {
    let vivo = true;
    void cuidadosDosItens().then((m) => { if (vivo) setMapa(m); });
    return () => { vivo = false; };
  }, []);
  const vistos = new Set<string>();
  const itens = codigos
    .map((c) => (c ?? "").trim().toUpperCase())
    .filter((c) => c && !vistos.has(c) && vistos.add(c))
    .map((c) => mapa.get(c))
    .filter((c): c is CuidadoDoItem => Boolean(c));
  if (itens.length === 0) return null;
  const perigoso = itens.some((c) => c.hazardous);
  return (
    <div className={`erp-feedback ${perigoso ? "error" : "warn"}`} role="alert" data-cuidados>
      <strong>{perigoso ? "Atenção: produto perigoso" : "Cuidados de armazenagem"} {contexto}</strong>
      <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
        {itens.map((c) => <li key={c.item}><strong>{c.item}</strong> {c.name} — {textoDoCuidado(c)}</li>)}
      </ul>
    </div>
  );
}

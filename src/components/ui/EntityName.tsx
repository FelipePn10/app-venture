import { useEffect, useState } from "react";
import type { LookupLoader } from "@/services/lookups";

type EntityNameProps = {
  code: string | number | null | undefined;
  loader: LookupLoader;
  prefix?: string;
  showCode?: boolean;
};

/** Exibe o nome de uma entidade em listas que recebem somente seu código. */
export function EntityName({ code, loader, prefix, showCode = true }: EntityNameProps): JSX.Element {
  const [label, setLabel] = useState("");

  useEffect(() => {
    let active = true;
    if (code == null || code === "") { setLabel(""); return () => { active = false; }; }
    void loader().then((options) => {
      if (!active) return;
      const found = options.find((option) => String(option.code) === String(code));
      setLabel(found?.label ?? "");
    }).catch(() => { if (active) setLabel(""); });
    return () => { active = false; };
  }, [code, loader]);

  if (code == null || code === "") return <>—</>;
  const fallback = `${prefix ? `${prefix} ` : ""}${code}`;
  return <>{label ? `${label}${showCode ? ` (${code})` : ""}` : fallback}</>;
}

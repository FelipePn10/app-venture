import { useMemo } from "react";
import { LookupField } from "@/components/ui/LookupField";

interface OpcoesLookupProps<T extends string | number> {
  value?: T;
  onChange: (code: T | undefined) => void;
  /** A lista que a tela já carregou: plano de contas, centros de custo. */
  opcoes: { code: T; label: string; sub?: string }[];
  entityLabel: string;
  placeholder?: string;
  disabled?: boolean;
}

/** Busca em lista que a própria tela já tem, para os cadastros longos demais para um `select`. */
export function OpcoesLookup<T extends string | number>({ value, onChange, opcoes, entityLabel, placeholder, disabled }: OpcoesLookupProps<T>): JSX.Element {
  const loader = useMemo(() => () => Promise.resolve(opcoes), [opcoes]);
  return <LookupField<T> value={value} loader={loader} entityLabel={entityLabel} placeholder={placeholder} disabled={disabled} allowManualCode={false} clearable
    onChange={(c) => onChange(c)} />;
}

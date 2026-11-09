import type { SelectHTMLAttributes } from 'react';
import { useUnidades, useRotulosDeUnidades } from '@/hooks/useUnidades';

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> & {
  value?: string | null;
  onChange: (unidade: string) => void;
  /** Lista usada enquanto o catálogo carrega (ou se ele não responder). */
  reserva?: readonly string[];
  /** Mostra a opção vazia (campo opcional). */
  vazio?: string;
  /** Mostra só o código (célula de grade estreita); a descrição fica no title. */
  compacto?: boolean;
};

/**
 * Unidade escolhida do catálogo da empresa (VSUP0110 › Unidades). Substitui o
 * campo de texto livre: "KGS" ou "CXA" digitados passavam e depois nenhuma
 * conversão os alcançava. O valor já gravado sempre aparece, mesmo inativo.
 * A opção mostra a descrição ("GL — Galão"): só o código, ninguém achava o galão.
 */
export function SelectUnidade({ value, onChange, reserva = ['UN'], vazio, compacto, className = 'erp-input', ...resto }: Props): JSX.Element {
  const unidades = useUnidades(reserva, value);
  const rotulos = useRotulosDeUnidades();
  const atual = (value ?? '').toUpperCase();
  return (
    <select {...resto} className={className} value={atual} title={rotulos[atual] ?? resto.title} onChange={(e) => onChange(e.target.value)}>
      {vazio !== undefined && <option value="">{vazio}</option>}
      {vazio === undefined && !value && <option value="" disabled>Selecione</option>}
      {unidades.map((u) => <option key={u} value={u}>{compacto || !rotulos[u] ? u : rotulos[u]}</option>)}
    </select>
  );
}

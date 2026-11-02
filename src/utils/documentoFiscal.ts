/** CNPJ ou CPF com a máscara; outro valor volta como veio. */
export function documentoComMascara(valor?: string): string {
  const d = (valor ?? "").replace(/\D/g, "");
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  return valor ?? "";
}

/** Chave de acesso em grupos de 4, como no DANFE. */
export function chaveEmGrupos(chave?: string): string {
  return (chave ?? "").replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ");
}

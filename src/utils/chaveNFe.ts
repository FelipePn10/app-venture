/** Chave de acesso da NF-e: 44 dígitos, com módulo 11 no último. */
export interface ChaveLida {
  uf: string; anoMes: string; cnpj: string; modelo: string; serie: string; numero: number;
}

const UF_POR_CODIGO: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO", "21": "MA", "22": "PI", "23": "CE", "24": "RN",
  "25": "PB", "26": "PE", "27": "AL", "28": "SE", "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP", "41": "PR", "42": "SC",
  "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF",
};

function digitoVerificador(base: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = base.length - 1; i >= 0; i--) {
    soma += Number(base[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function chaveValida(chave: string): boolean {
  return /^\d{44}$/.test(chave) && digitoVerificador(chave.slice(0, 43)) === Number(chave[43]);
}

export function lerChaveNFe(chave: string): ChaveLida | null {
  if (!/^\d{44}$/.test(chave)) return null;
  return {
    uf: UF_POR_CODIGO[chave.slice(0, 2)] ?? "", anoMes: chave.slice(2, 6), cnpj: chave.slice(6, 20), modelo: chave.slice(20, 22),
    serie: String(Number(chave.slice(22, 25))), numero: Number(chave.slice(25, 34)),
  };
}

/** O que a chave diz da nota digitada. Vazio: confere. */
export function divergenciaDaChave(chave: string, nota: { cnpj?: string; numero?: number; serie?: string; modelo?: string; uf?: string; emissao?: string }): string {
  if (!chaveValida(chave)) return chave.length !== 44 ? `A chave de acesso tem 44 dígitos; esta tem ${chave.length}.` : "A chave de acesso está errada: o último dígito não confere. Copie a chave de novo.";
  const c = lerChaveNFe(chave)!;
  if (nota.cnpj && c.cnpj !== nota.cnpj.padStart(14, "0")) return "A chave de acesso é de outro CNPJ: confira a chave ou o emitente.";
  if (nota.numero && c.numero !== nota.numero) return `A chave de acesso é da nota ${c.numero}, e a nota informada é ${nota.numero}.`;
  if (nota.serie && c.serie !== String(Number(nota.serie))) return `A chave de acesso é da série ${c.serie}, e a série informada é ${nota.serie}.`;
  if (nota.modelo && c.modelo !== nota.modelo) return `A chave de acesso é do modelo ${c.modelo}, e o modelo informado é ${nota.modelo}.`;
  if (nota.uf && c.uf && c.uf !== nota.uf) return `A chave de acesso é de ${c.uf}, e o emitente é de ${nota.uf}.`;
  if (nota.emissao) {
    const anoMes = nota.emissao.slice(2, 4) + nota.emissao.slice(5, 7);
    if (anoMes !== c.anoMes) return `A chave de acesso é de ${c.anoMes.slice(2)}/20${c.anoMes.slice(0, 2)}, e a emissão informada é ${nota.emissao.slice(5, 7)}/${nota.emissao.slice(0, 4)}.`;
  }
  return "";
}

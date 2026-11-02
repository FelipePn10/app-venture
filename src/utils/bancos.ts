/** Bancos mais usados, pelo código da Febraban. A lista só ajuda a digitar: outro código também vale. */
export const BANCOS: { codigo: string; nome: string }[] = [
  { codigo: "001", nome: "Banco do Brasil" },
  { codigo: "033", nome: "Santander" },
  { codigo: "041", nome: "Banrisul" },
  { codigo: "077", nome: "Inter" },
  { codigo: "104", nome: "Caixa Econômica Federal" },
  { codigo: "133", nome: "Cresol" },
  { codigo: "136", nome: "Unicred" },
  { codigo: "208", nome: "BTG Pactual" },
  { codigo: "237", nome: "Bradesco" },
  { codigo: "260", nome: "Nubank" },
  { codigo: "336", nome: "C6 Bank" },
  { codigo: "341", nome: "Itaú" },
  { codigo: "422", nome: "Safra" },
  { codigo: "748", nome: "Sicredi" },
  { codigo: "756", nome: "Sicoob" },
];

export const nomeDoBanco = (codigo: string): string => BANCOS.find((b) => b.codigo === codigo.padStart(3, "0"))?.nome ?? "";

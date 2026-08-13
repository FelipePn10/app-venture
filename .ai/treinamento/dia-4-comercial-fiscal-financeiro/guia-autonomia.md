# DIA 4 — Guia de Autonomia: Venda, Fiscal e Financeiro

Este guia acompanha o fluxo do pedido ao caixa. Em cada transição, confira o
documento anterior; não recrie dados manualmente numa tela posterior quando o ERP
deveria trazê-los do processo.

## Antes de vender

Confirme cliente ativo com endereço fiscal, contatos, condição de pagamento,
limite/restrições e política comercial; item ativo com descrição comercial,
unidade, preço/custo e parametrização fiscal; estoque e promessa disponíveis.
Dados ausentes aqui reaparecem como bloqueio no pedido ou rejeição da nota.

## Do preço ao pedido

| Etapa | Tela | Faça | Confirme antes de seguir |
|:--|:--|:--|:--|
| Custo | `VCUS0100` | Consulte material, mão de obra e indiretos | Data/base do custo é a correta |
| Precificação | `VCST0202` | Simule preço e margem | Margem atende a política e impostos/frete estão considerados |
| Parâmetros | `VVND0310` | Confira comissão e motivos | Motivos necessários estão ativos |
| Orçamento | `VVND0300` | Cadastre cliente, itens, preço e validade | Totais, condição e aprovação estão corretos |
| Pedido | `VVND0200` | Converta/confirme o pedido | Reserva, financeiro previsto e demanda foram gerados conforme regra |

### Pedido bloqueado

Leia o motivo antes de agir. Crédito, preço fora da política, cadastro incompleto,
estoque e permissão exigem responsáveis diferentes. Não altere limite ou preço só
para “passar”; registre a aprovação prevista no processo.

## Expedição sem confundir reserva e baixa

Em `VEXP0100`, gere o romaneio a partir do pedido, confira itens/quantidades, realize
separação e conferência e avance o status até expedição. O romaneio **reserva** o
estoque; a NF-e autorizada é que efetiva a **baixa**. Se houver divergência física,
trate-a antes de faturar.

## Emissão fiscal segura

1. Em `VFIS0100`, confira empresa, certificado e, sobretudo, **Homologação ou Produção**.
2. Confira cliente, endereço/UF, itens, NCM/CEST, origem e natureza/CFOP.
3. Em `VFIS0200`, crie o rascunho a partir do documento de origem sempre que houver.
4. Compare base, alíquotas, tributos e total com o documento comercial.
5. Autorize uma única vez e aguarde a resposta; em timeout, consulte o status antes
   de tentar novamente.
6. Guarde chave/protocolo e confirme a baixa de estoque e geração do título.

### Rejeição, cancelamento ou CC-e?

- **Rejeitada:** leia a mensagem, corrija o dado permitido e retransmita.
- **Autorizada com erro que muda valor, destinatário ou item:** avalie cancelamento
  dentro do prazo; CC-e não corrige esses campos.
- **Autorizada com erro textual permitido:** use CC-e conforme regra fiscal.
- Nunca “resolva” emitindo outra nota sem verificar a situação da primeira.

## Do título ao caixa

| Necessidade | Tela | Controle essencial |
|:--|:--|:--|
| Receber do cliente | `VFIN0210` | Documento, parcela, vencimento, valor e baixa parcial/total |
| Pagar fornecedor | `VFIN0200` | Aprovação antes da baixa, documento e rateio |
| Ver posição futura | `VFIN0300` | Separar previsto de realizado e conferir período |
| Conferir impostos | `VFIN0400` | Competência, origem dos documentos e total apurado |
| Conciliar banco | rotina de conciliação | Conta correta, lançamentos únicos e diferenças justificadas |

Antes de baixar, confirme conta, data, valor, juros/desconto e documento. Uma baixa
financeira não deve ser usada para esconder um título criado em duplicidade.

## Parametrização fiscal do item

Cadastre primeiro o mestre em `VFIS0350`, informando vigência, NCM, CEST, origem,
unidades e padrões de IPI, ICMS, PIS e COFINS. Depois, em `VENT0200` → Contábil,
selecione separadamente a classificação de compra e a de venda.

Para **Cálculo de PIS/COFINS**, existem três escolhas:

- **Herdar do mestre fiscal:** o item acompanha o padrão vigente da classificação;
- **Sobrescrever: Sim:** força o cálculo especificamente neste item;
- **Sobrescrever: Não:** desativa o cálculo especificamente neste item.

Ao consultar o item, `HERDADO` identifica valor vindo do mestre e `SOBRESCRITO`
identifica decisão específica do item. Compra e venda são contextos independentes.
Antes da emissão, confira o valor efetivo mostrado, não apenas o campo preenchido.

## Fechamento diário comercial, fiscal e financeiro

- [ ] Orçamentos vencidos ou pendentes têm responsável
- [ ] Pedidos bloqueados foram encaminhados à área correta
- [ ] Romaneios conferidos correspondem aos pedidos
- [ ] Toda nota transmitida tem situação final conhecida
- [ ] Notas autorizadas geraram estoque e financeiro esperados
- [ ] Títulos baixados correspondem ao extrato/documento
- [ ] Duplicidades e diferenças estão justificadas, não compensadas informalmente
- [ ] Fluxo previsto foi revisado e riscos de caixa foram comunicados

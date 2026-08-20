# DIA 3 — Guia de Autonomia: PCP e Produção

Este guia responde quatro perguntas em cada etapa: **quando abrir a tela, o que
precisa estar pronto, o que fazer e como conferir se deu certo**. Use-o depois do
treinamento, sem depender do instrutor.

## Antes de planejar

Confirme item ativo, estrutura/BOM aprovada, roteiro com operações e tempos,
máquinas ativas, calendário industrial e saldo confiável. Se um desses dados
estiver errado, pare e corrija na origem; executar novamente o MRP não corrige
cadastro.

## Da demanda ao plano

| Etapa | Tela | Faça | Confirme antes de seguir |
|:--|:--|:--|:--|
| Demanda independente | `VPLA0102` | Informe item, quantidade e data necessária | Data é útil e registro aparece na consulta |
| Previsão | `VPRE0101` / `VPRE0102` | Cadastre ou gere previsão quando o processo usar forecast | Período, unidade e item estão corretos |
| Plano | `VPLN0100` | Crie o cenário com horizonte e parâmetros | Plano está salvo e ativo para a execução |
| MRP | `VMRP0100` | Execute, leia necessidades e sugestões | Não há erro de BOM; sugestão tem origem e data compreensíveis |
| Perfil e alertas | `VPME0102` / `VPRO0700` | Investigue estoque projetado e exceções | Você sabe qual ação tomar em cada alerta |
| Aprovação | `VPME0102` | Firme somente a sugestão revisada | Ordem resultante existe; firmar não é só “salvar” |

### Se o MRP não sugerir nada

Confira, nesta ordem: demanda e data; saldo disponível e reservas; ordens já
abertas; item comprado/fabricado; BOM aprovada; LLC; horizonte do plano. Registre
o diagnóstico antes de alterar parâmetros — isso evita “forçar” uma compra sem
entender a necessidade.

## Da capacidade ao sequenciamento

| Decisão | Use | Leitura correta |
|:--|:--|:--|
| Quero saber se a carga cabe | CRP | Compare horas necessárias com horas disponíveis |
| Quero saber a ordem exata de execução | APS | Leia sequência, início/fim e conflitos no Gantt |
| Há sobrecarga | CRP + cadastro | Mude data, recurso, turno ou capacidade real; não esconda o alerta |
| Uma operação atrasou | APS | Reprograme e confira o efeito em cascata nas dependências |

Antes de aceitar um sequenciamento, confira calendário, preventiva, recurso
alternativo, prioridade e data prometida. O Gantt bonito não garante plano viável
se a capacidade de origem estiver errada.

## Da ordem ao produto concluído

1. Em `VPRO0100`, localize ou crie a OF e confira item, máscara, quantidade,
   datas, prioridade e roteiro explodido.
2. Inicie a OF somente quando material, máquina e operador estiverem liberados.
3. Registre consumo com item, quantidade, almoxarifado e lote corretos.
4. Aponte cada operação com quantidade boa, refugo, horas, máquina e operador.
5. Em caso de não-conformidade, registre e aplique a disposição antes de liberar.
6. Conclua a OF no almoxarifado e lote corretos; depois confira entrada do acabado,
   baixa dos componentes e genealogia.
7. Encerre somente depois de revisar apontamentos e custo real.

> ⚠️ O código de barras para iniciar e terminar processos ainda depende do contrato
> do backend. Até a entrega dessa função, use a seleção da OF/operação e confirme o
> número na tela antes de apontar.

## Como corrigir sem perder rastreabilidade

- **Quantidade errada:** não crie um segundo apontamento compensatório sem conhecer
  a regra da empresa; use estorno/correção autorizada.
- **Lote errado:** interrompa o fluxo e corrija antes da conclusão.
- **Operação fora de sequência:** verifique se a regra permite pular; não marque
  como concluída apenas para liberar a próxima.
- **Refugo:** sempre informe quantidade e motivo; refugo sem motivo distorce custo
  e qualidade.
- **Máquina parada:** registre manutenção e reprograme; não aumente capacidade
  ficticiamente.

## Fechamento diário do PCP e da produção

- [ ] Demandas novas ou alteradas foram avaliadas
- [ ] Exceções do MRP têm responsável e prazo
- [ ] Sobrecargas do CRP foram tratadas
- [ ] Sequenciamento publicado corresponde ao chão
- [ ] OFs iniciadas têm material e roteiro
- [ ] Apontamentos, consumos, lotes e refugos foram conferidos
- [ ] OFs concluídas movimentaram o estoque esperado
- [ ] Divergências de custo têm explicação ou plano de ação


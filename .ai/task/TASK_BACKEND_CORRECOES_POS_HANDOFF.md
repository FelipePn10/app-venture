# Backend — correções encontradas na validação do handoff operacional

> Reteste do frontend em 13/08/2026: os itens 1 e 3 estão corrigidos no worktree
> `panossoerp-ajustes` e a credencial do item 2 voltou a autenticar. Permanecem as
> pendências operacionais e de contrato descritas no final deste documento.

## Status final — CONCLUÍDO em 13/08/2026

Reteste independente após o novo retorno do backend:

- container de treinamento reconstruído em 13/08/2026 e saudável;
- login autenticado respondeu `200`;
- geração de calendário, rota de compatibilidade e scanner responderam `422` aos
  payloads inválidos controlados, confirmando roteamento e validação;
- rota antiga do calendário respondeu `200`;
- busca de item-fornecedor chegou ao handler (sem os antigos `404/405`);
- `item_base_cod` consta no middleware e no teste HTTP aninhado, incluindo
  `0007-A` e `legacy_item_base_cod` apenas na resposta de compatibilidade;
- `go test ./...`, auditoria dos 1.004 endpoints, alinhamento das 211 telas e
  validação de versionamento passaram.

Os itens 1 a 5 abaixo ficam preservados como histórico do diagnóstico e dos
critérios de aceite.

## 1. Publicar as rotas do calendário industrial

O handler novo declara `POST /generate` e `POST /generate/{year}/{month}` em
`internal/interfaces/http/handler/industrial_calendar.go`, mas o bloco
`/api/industrial-calendar` de `api/api.go` continua registrando somente `create`,
`month` e `workdays`. O método `IndustrialCalendarHandler.Mount` não é chamado.

Critério de aceite:

- `POST /api/industrial-calendar/generate` chega ao handler `Generate`;
- a rota de compatibilidade com ano/mês também fica acessível;
- teste de roteamento impede nova omissão;
- ambos continuam protegidos por empresa e papéis autorizados.

## 2. Disponibilizar credencial funcional no ambiente de treinamento

Em 12/08/2026, o login de `instrutor@venturerp.training` usando
`TRAINING_ADMIN_PASSWORD` de `deploy/training/training.env` retornou `401 invalid
credentials`. O container estava saudável. Isso bloqueou o teste HTTP autenticado
de ponta a ponta das rotas novas.

Critério de aceite:

- `make training-users` mantém a senha documentada sincronizada com o banco;
- adicionar um smoke test de login ao bootstrap;
- não imprimir a senha em logs.

## 3. Acrescentar teste HTTP com código comercial alfanumérico

O middleware de compatibilidade traduz `item_code` para a chave legada antes dos
handlers, portanto DTOs internos numéricos são esperados durante o rollout. Falta,
porém, um teste de integração HTTP que cubra ao menos `TEA452-0` em criação de
vínculo item-fornecedor, estoque, pedido, MRP, estrutura e ordem de produção.

Critério de aceite:

- requests aceitam o código comercial como string;
- respostas devolvem o código comercial e `legacy_item_code` apenas para
  compatibilidade;
- zeros à esquerda permanecem intactos;
- códigos são resolvidos somente dentro da empresa autenticada.

## 4. Atualizar o backend executado no ambiente de treinamento

O login real voltou a responder `200`, mas o container `venturerp-api-training`
continua usando uma imagem criada em 08/08/2026, anterior aos ajustes. No smoke
autenticado de 13/08/2026:

- `POST /api/industrial-calendar/generate` retornou `404`;
- `POST /api/industrial-calendar/generate/{year}/{month}` retornou `404`;
- `GET /api/item-suppliers/search` retornou `405`;
- `POST /api/production-order/scanner/scan` retornou `404`;
- uma rota antiga do calendário respondeu `200`, confirmando autenticação e API.

Critério de aceite:

- reconstruir/reimplantar o treinamento a partir da branch que contém os ajustes;
- aplicar as migrations 301 a 306 no banco de treinamento;
- repetir o smoke autenticado das rotas acima sem imprimir senha ou token;
- não misturar nem sobrescrever as alterações locais protegidas da `develop`.

## 5. Tratar `item_base_cod` como referência comercial de item

O cadastro de item possui `engineering.item_base_cod`, mas essa chave não está em
`itemReferenceKeys` do middleware `item_business_code.go`. O DTO interno continua
numérico, portanto enviar `TEA452-0` nesse campo pode falhar no binding em vez de
ser resolvido para o ID imutável.

Critério de aceite:

- incluir `item_base_cod` entre as referências traduzidas no body;
- aceitar códigos como `TEA452-0` e `0007-A` nesse campo;
- devolver o código comercial na resposta e manter a referência legada apenas no
  campo temporário de compatibilidade;
- cobrir criação de item baseado em outro item com teste HTTP e isolamento por
  empresa.

## 6. Permitir herança real do indicador PIS/COFINS — PENDENTE

Na varredura final do frontend, o mestre fiscal e `fiscal_effective.sources`
foram integrados à interface. Entretanto, `AccountingDTO.calculate_pis_cofins`
no cadastro do item ainda é `bool`, enquanto o update já utiliza `*bool`.
Consequentemente, o create não distingue campo ausente (herdar) de `false`
(sobrescrever com não), e o repositório sempre marca um valor específico do item.

Critério de aceite:

- alterar o campo do create para `*bool` ou mecanismo equivalente que preserve
  ausência no JSON;
- manter três estados públicos: ausente = `HERDADO`, `true`/`false` =
  `SOBRESCRITO`;
- persistir valor nullable ou outro indicador explícito de override;
- `fiscal_effective.purchase/sale.sources.calculate_pis_cofins` deve refletir a
  origem correta;
- teste HTTP deve cobrir herança de `true`, herança de `false` e os dois valores
  sobrescritos.

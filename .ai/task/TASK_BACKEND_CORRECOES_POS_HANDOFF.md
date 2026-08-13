# Backend — correções encontradas na validação do handoff operacional

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

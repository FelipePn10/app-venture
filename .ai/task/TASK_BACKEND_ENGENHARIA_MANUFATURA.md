# TASK backend — engenharia & manufatura (VMAQ0200, VENT0200/0210, VENT0115/0202/0204, VPRO0100/0900)

## Objetivo

Resolver de ponta a ponta os erros de engenharia/manufatura relatados e alinhar o
backend ao frontend já corrigido. O frontend (repositório `app-venture`) foi ajustado
para: campos de item/máscara/classificação/característica/operação com modal pesquisável
(`LookupField`) + entrada manual de código, textos 100% em PT-BR, abas e exportação. O que
segue são as contrapartes **de servidor**, sem as quais os erros abaixo persistem.

Antes de implementar, pesquise como ERPs enterprise (SAP S/4HANA PP, Oracle Fusion
Manufacturing, Microsoft Dynamics 365 Supply Chain, TOTVS Protheus e Odoo Manufacturing)
tratam **roteiro de fabricação por item**, **BOM multi-nível com drill-down**, **tempo por
item × máquina e custo/hora**, **programação CRP/APS** e **ordens de produção geradas pelo
MRP**. Registre as decisões aplicáveis em `docs/dev/decisoes-enterprise-*.md`; não copie
complexidade sem ganho operacional.

## P0 — contratos que quebram a operação (código de item canônico)

### 1. `item_code` texto em roteiros e estrutura (BOM)

O item no domínio tem `Code` (identificador numérico legado) e `BusinessCode` (código
comercial texto, ex.: "10001", "TEA452-0"). O frontend e a pipeline de preço usam o
**código comercial texto**. Ainda restam DTOs usando `int64` e devolvendo
"item_code must be a positive integer" / falhas de unmarshal:

- Roteiros: `internal/application/dto/request/routing_request.go` (`ItemCode int64`,
  `ServiceItemCode *int64`), handlers de `ListRoutesByItem`, `CreateRoute`, `ConsultStructure`.
- Estrutura/BOM: `internal/application/dto/request/item_struct_request.go`
  (`CreateStructureComponentDTO.ParentCode/ChildCode int64`, `UpdateStructureComponentDTO`,
  `ConsultStructureDTO.ItemCode int64`, `GetStructureTreeDTO.RootItemCode int64`,
  `ResolveStructureForMaskDTO.RootItemCode int64`).

**Solicitado:**
- Migrar `parent_code`/`child_code`/`item_code`/`root_item_code` para `TextCode`
  (canônico texto), com compatibilidade numérica temporária e telemetria de depreciação.
- Resolver internamente o identificador numérico legado quando necessário.
- Cobrir com testes de DTO (texto, numérico temporário, inválido) e integração autenticada
  com dois tenants.

### 2. `DELETE` de componente de estrutura (BOM)

`VENG/VENT0210` permite "remover" um componente, mas o `deleteUC` está comentado
(`internal/interfaces/http/handler/handler.go`) e não existe rota `DELETE /api/items/structure/...`.

**Solicitado:**
- Disponibilizar `DELETE /api/items/structure/{parentCode}/{childCode}` (ou equivalente
  canônico) para remover um componente da estrutura, validando tenant, máscara e
  inexistência de vínculo. Exclusão lógica é aceitável se houver histórico.
- Garantir que `PUT /update` já aceita `position` (o frontend passou a enviar).

### 3. Grupo PDM — identidade automática (VENT0204)

`CreateGroupDTO`/`UpdateGroupDTO` exigem `enterprise_id` e `created_by` no corpo, causando
"created_by cannot be empty" e expondo dados que o usuário não deve informar.

**Solicitado:**
- Obter `enterprise_id` (tenant) e `created_by` (ator) exclusivamente do JWT, como já foi
  feito nos contratos comerciais. Remover `enterprise_id`/`created_by` do corpo.
- Validar tenant nas rotas `POST /create-group`, `GET /groups`, `GET|PUT /groups/{code}`.
- Testes: criação, atualização, tenant cruzado e identificador forjado no corpo rejeitado.

## P1 — máquinas, tempos e cálculo (VMAQ0200)

### 4. Cálculo de tempo de produção robusto

Hoje `POST /api/machine/time/production/calculate` devolve "no active production time
config found for item X on machine Y" quando não há cadastro de tempo item × máquina.

**Solicitado:**
- Devolver erro de domínio em PT-BR com orientação (ex.: "Este item não possui tempo
  cadastrado para a máquina selecionada. Cadastre em VMAQ0200 → Tempos."), com código estável.
- Evoluir o cálculo para considerar: tempo padrão, setup, quantidade base, lote,
  eficiência da máquina, fator de tempo por recurso/centro e gargalo (comparar com a
  capacidade por período). Explicar os fatores usados no retorno.
- Pesquisar práticas enterprise (padrão de tempo × eficiência × taxa de ocupação) e expor
  no DTO de resposta os componentes do cálculo (não só os totais).

### 5. Listagem de tempos por item × máquina

`GET /api/machine/time/list` exige `item_code` obrigatório. O usuário quer uma visão
"Tempo por item × máquina".

**Solicitado:**
- Permitir listagem sem filtro (ou com filtro opcional por item/máquina), paginada e
  ordenada, limitada ao tenant, para alimentar a aba "Tempos" da VMAQ0200.
- Confirmar que `POST /api/machine/create` não falha mais com 500 (revisar causa: enum de
  capacidade, `created_by`, `machine_type_code` ou tenant). Devolver 422 em PT-BR em falha de validação.

## P2 — roteiros e operações (VENT0115/VENT0202/VPRO0100)

### 6. Catálogos canônicos para os modais

- Operações: garantir `GET /api/routing/` devolve todas as operações ativas do tenant
  (código/descrição/origem), para o modal de `operation_id`.
- Grupos PDM: `GET /api/pdm/groups` devolve todos os grupos do tenant.
- Classificações de item: confirmar listagem plana em `GET /api/items/classifications/masks`
  (código + descrição + situação); se não houver listagem plana, criar
  `GET /api/items/classifications`.
- Características: confirmar `GET /api/configurator/characteristics` (código + descrição).

### 7. Tradução e consistência do roteiro

- Garantir que os campos devolvidos por `GET /api/routing/routes/{id}` (operações, rede,
  recursos, caminho crítico, lead time) tenham tags JSON estáveis (`snake_case`) para o
  frontend exibir rótulos em PT-BR. Evitar devolver campos sem tag (PascalCase) que
  aparecem como "IS STANDARD", "EFF TIME", "CRITICAL PATH", etc.
- Confirmar que o lead time (CPM) devolve `lead_time_hours` e `critical_path` no formato
  documentado.
- Verificar se VENT0115/VENT0202/VPRO0100 convergem para **uma única** fonte de roteiro
  (`/api/routing`): a VPRO0100 hoje mantém uma "biblioteca de operações" que deve ser a
  mesma usada por roteiros, MRP, CRP e APS. Documentar o fluxo operação → roteiro → OF.

## P3 — estrutura de produto (VENT0210)

- Após o P0 (item_code texto), validar o fluxo completo: criar 10001 (Estrutura) →
  10002 (Conjunto, filho) → matérias-primas dentro do conjunto, com drill-down, posição
  obrigatória, UM herdada do cadastro do item e descrição/UM preenchidas ao consultar o
  filho.
- Confirmar que a descrição e a UM do filho são devolvidas por `GET /api/items/search/{code}`
  (o frontend as usa no preenchimento automático).

## P4 — item (VENT0200)

- **Unidade de medida e classificação por aba**: esclarecer/dedicar a semântica de cada
  UM (Estoque base, Suprimentos/compras, Contábil venda/compra) e de cada classificação
  (planejamento, comercial, contábil, suprimentos) para o frontend exibir rótulos que
  deixem claro que são propósitos distintos (não repetição). Documentar em `docs/dev`.
- **Fator de conversão de volume (Comercial)** ↔ **VSUP0110 (conversão de UM)**: confirmar
  se `volume_conversion_factor` conflita com a conversão de unidades do cadastro. Se forem
  a mesma regra, unificar no backend; se distintas, documentar a diferença e impedir
  sobrescrita acidental.
- **Indicadores comerciais**: verificar que todos os indicadores exibidos têm coluna/campo
  correspondente no backend (o rótulo "FoccoMOBILE" foi renomeado para "Habilita no
  aplicativo" no frontend; garantir `mobile_enabled` no DTO).

## P5 — ordem de produção (VPRO0900)

## P5.5 — ADENDO pós-validação (30/08): tempo por item × máquina usa `item_code` texto

Após a validação, restou **um** ponto de `item_code` que ainda não foi migrado para o
canônico texto e quebra a VMAQ0200 com códigos comerciais alfanuméricos:

- `internal/application/dto/request/machine.go` → `CreateItemMachineTimeDTO.ItemCode int64`
  (`json:"item_code"`).
- `internal/interfaces/http/handler/machine_handler.go` → `ListItemTimes` faz
  `strconv.ParseInt` no query param `item_code`, e o cálculo de produção ainda trata o
  código como numérico.

O frontend envia `item_code` em **texto** (o código comercial). Migrar o DTO e os handlers
de tempo/calculo para `TextCode`, resolvendo internamente o identificador numérico legado,
com compatibilidade numérica temporária e testes de DTO/integração (texto, numérico
temporário, inválido e dois tenants).

> Outro ajuste de contrato foi resolvido no frontend: a criação de componente de estrutura
> agora envia a posição como `sequence` (campo esperado pelo `CreateStructureComponentDTO`),
> enquanto a atualização continua enviando `position` (campo do `UpdateStructureComponentDTO`).
> Se preferir, o backend pode unificar ambos para `position` e o frontend será reajustado.

- Confirmar que a VPRO0900 **não** é a única porta de criação de OF: ordens devem nascer
  do MRP/planejamento (com roteiro, centro de trabalho, tempos, materiais e APS/CRP).
  Documentar o contrato da criação manual (campos mínimos) e o que o backend preenche
  automaticamente ao gerar a OF pelo MRP.
- Se a criação manual atual permite OF "vazia" (sem roteiro/operações), alinhar com o
  backend para exigir ou explodir o roteiro ao iniciar.

## Requisitos transversais

- Isolamento por `enterprise_code` em todo SELECT/UPDATE/DELETE + teste cruzado entre dois
  tenants.
- Ator exclusivamente pelo JWT; rejeitar/ignorar `created_by` e equivalentes no corpo.
- Erros de domínio em PT-BR com HTTP 400/404/409/422 coerente e código estável.
- Paginação/ordenação determinística para listagens grandes (tempos, operações, grupos).
- Idempotency key nas mutações que geram OF/reprogramam/movimentam estoque.
- Auditoria imutável de antes/depois nos cadastros estruturais (BOM, roteiro, grupo).

## Testes obrigatórios e aceite

- Testes de DTO para `item_code`/`parent_code`/`child_code` texto + compatibilidade numérica.
- Integração autenticada por fluxo: cadastrar item base → estrutura multi-nível (pai/conjunto/
  matéria-prima) → roteiro por item → tempo por item × máquina → calcular produção →
  gerar OF pelo MRP com roteiro/APS/CRP → apontar/concluir.
- Testes transacionais para exclusão de componente, atualização de posição e máscara.
- Smoke end-to-end **em ambiente publicado** com `go test ./...`, linters e migrations.
- Não considerar concluído apenas porque o endpoint retorna 2xx: conferir estado persistido,
  auditoria, isolamento por empresa e a resposta apresentada ao usuário.

## Estratégia de entrega

PRs pequenos: (1) `item_code` texto em roteiro/BOM + DELETE de componente; (2) grupo PDM
com identidade automática; (3) máquinas/tempos/cálculo + listagem; (4) catálogos e
consistência de roteiro; (5) estrutura multi-nível e UM/classificação do item; (6) ordem de
produção gerada pelo MRP. Publicar backend antes das telas que dependem de contrato novo e
manter rollback por PR.

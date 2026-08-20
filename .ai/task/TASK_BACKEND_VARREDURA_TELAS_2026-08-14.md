# Backend — erros encontrados na varredura das telas do Desktop

## Reteste final após correção integral da migration 000315 — 20/08/2026

A lacuna J foi corrigida e aprovada no ambiente de treinamento com a API reconstruída. O fluxo real retornou:

- criação do plano 1D com peças e estoque: `201`;
- inclusão posterior de peça: `201`;
- inclusão posterior de estoque: `201`;
- otimização e persistência de padrões/posicionamentos: `200`;
- detalhe, programa, SVG e DXF: `200`;
- geração a partir de ordem: `201`.

O plano alcançou aproveitamento de 80,8%. A tentativa de firmar retornou `422` por ausência de saldo do material da fixture, regra de domínio esperada e sem falha de tenant. Portanto, as correções E–J deste documento estão encerradas.

Na varredura ampla foram aprovadas 398 de 401 chamadas. As três falhas restantes são fixtures antigas/incompletas: orçamento sem divisão livre, payload legado de item-base e consulta de retalho com item inexistente.

## Histórico do primeiro reteste da migration 000315 — 20/08/2026

Correções aprovadas no fluxo HTTP/PostgreSQL real:

- rota de máscaras: `200`, e criação de máscara: `201`;
- tipo de máquina: `201`;
- máquina: `201`;
- reserva: `201`, seguida de liberação `204`;
- lote/corrida/certificado: `201`;
- cabeçalho do plano de corte agora recebe o tenant.

Na primeira versão testada, permaneceu uma falha de tenant na coleção filha do plano de corte, posteriormente corrigida conforme o reteste final acima:

### J. Peças do plano de corte ainda perdem `enterprise_id`

A criação do cabeçalho avançou após a migration 315, mas a inclusão das peças retornou:

```text
422 adding part: ERROR: null value in column "enterprise_id" of relation "cutting_plan_parts" violates not-null constraint (SQLSTATE 23502)
```

Critérios de aceite:

- todos os INSERTs filhos do plano (peças, estoque/alocações e demais coleções tenant-aware) recebem a empresa do contexto ou do cabeçalho persistido;
- nenhuma mensagem PostgreSQL é devolvida como erro de domínio ao Desktop;
- criação 1D completa retorna `201` e pode ser relida somente pelo tenant autenticado;
- teste HTTP/PostgreSQL percorre cabeçalho → peças → estoque → consulta, incluindo isolamento multiempresa.

As três outras falhas restantes da suíte ampla são fixtures antigas/incompletas (regra de divisão comercial, item-base antigo e código de retalho inexistente), não regressões das cinco correções.

## Varredura integral após correções A/B/C — 20/08/2026

Fluxos aprovados no container reconstruído:

- Fundação/item/update parcial/scheduler: 44/44;
- Orçamento de venda: 91/91;
- Central de Alertas e contagens: 20/20;
- 213 telas abertas em navegador real, sem 404, erro de renderização, sobreposição, estouro horizontal ou conteúdo cortado.

Uma suíte histórica de 390 chamadas encontrou nove falhas. Quatro são fixtures/regras antigas da própria suíte (orçamento sem divisão livre, responsável de garantia incompleto, precificação sem pré-requisitos e códigos de corte inexistentes) e devem ser atualizadas no Desktop. Permanecem cinco falhas backend reproduzíveis que precisam de triagem:

### E. Rota estática de máscaras interceptada como código de item

`GET /api/items/classifications/masks/` retornou `422 item "classifications" nao encontrado na empresa autenticada`.

O middleware está tratando o segmento estático `classifications` como `{code}`. Rotas estáticas sob `/api/items` devem ser excluídas da resolução de código comercial e cobertas no router real.

### F. Criação de máquina e tipo de máquina retorna 500

- criação de tipo de máquina: `500 internal server error`;
- criação de máquina com enum português de capacidade: `500 internal server error`.

Validar payloads consumidos pelas telas de máquinas e converter referências/validações esperadas para `409/422`. Falhas inesperadas devem ter teste HTTP/PostgreSQL com a mensagem de domínio sanitizada.

### G. Reserva de estoque válida retorna 500

Após movimento de entrada aprovado (`201`), a criação da reserva para validar ATP retornou `500 internal server error`. Cobrir movimento → saldo → reserva → ATP no tenant autenticado.

### H. Registro de lote válido retorna 500

O cadastro de lote/corrida/certificado retornou `500 internal server error`. Cobrir criação com item e almoxarifado válidos, preservando código comercial textual.

### I. Plano de corte perde o tenant na persistência

A criação de plano 1D retornou `422`, mas a mensagem expôs a causa PostgreSQL:

```text
null value in column "enterprise_id" of relation "cutting_plans"
```

O handler/use case deve obter a empresa exclusivamente do contexto autenticado e nunca chegar ao INSERT com tenant nulo. Responder erro de domínio apenas para dados realmente inválidos e adicionar teste HTTP multiempresa.

Observação: respostas `404` de configuração opcional e `422` de fixtures deliberadamente incompletas não foram classificadas como defeito do backend.

## Reteste após a migration 000311 — 15/08/2026

As quatro correções originais foram retestadas no container de treinamento reconstruído. Plano de corte sem configuração retornou `200` com `AUTOMATIC`; referências PDM inválidas, funcionário e prioridade passaram a retornar erros semânticos; cancelamento inválido retornou `422`. A varredura completa abriu 211 telas sem erro JavaScript ou componente ausente.

Permanecem as seguintes falhas novas ou divergências encontradas no reteste:

### A. Cadastro válido de item retorna 500

Dois cadastros válidos de item alfanumérico falharam. O log da API registrou:

`create item: ERROR: column "engineering_item_base_cod" does not exist (SQLSTATE 42703)`

O schema e a query gerada usam `engineering_item_base_code`. Validar o artefato SQL efetivamente executado e adicionar teste HTTP de criação válida após a migration 000311. O caso deve responder `201`, preservando o código comercial como string.

### B. Unidade de medida inexistente ainda retorna 500

O cadastro de item com unidade inexistente continua produzindo erro interno. Referência inválida é erro de domínio e deve retornar `409` ou `422`, com mensagem compreensível, antes da persistência.

### C. Processo de alertas consulta coluna inexistente

O worker registra repetidamente `ERROR: column w.name does not exist (SQLSTATE 42703)`. As consultas em `internal/infrastructure/repository/notification/repository.go` concatenam `w.code` com `w.name`; alinhar ao nome real da coluna do almoxarifado e cobrir a avaliação de alertas com teste PostgreSQL.

### D. Contrato do orçamento diverge do comportamento observado

O handoff afirma que `enterprise_code` diferente do tenant é rejeitado com `422`, mas o teste HTTP recebeu `201`. O middleware tenant-aware aparenta substituir o valor antes do use case, fazendo o registro ficar no tenant autenticado. Isso mantém o isolamento, porém contradiz o contrato declarado. Escolher e testar uma única regra: rejeitar explicitamente com `422` ou documentar que o campo externo é ignorado.

Varredura executada em 14/08/2026 contra `http://127.0.0.1:5073`, com o container de treinamento migrado até `000307`. Credenciais e token não foram impressos.

## 1. Plano de corte: leitura dos padrões retorna 500 — CORRIGIDO NO RETESTE

`GET /api/cutting-settings` retorna `500 internal server error` para o tenant de treinamento. A tela `VCUT0100` depende dessa chamada para carregar os padrões de consumo, sobra e almoxarifado.

Critérios de aceite:

- tenant sem configuração recebe padrões válidos ou resposta vazia tratável (`200`), nunca `500`;
- teste HTTP autenticado cobre tenant sem configuração e tenant configurado;
- isolamento por empresa é preservado.

## 2. Item aceita referência a grupo PDM inexistente — CORRIGIDO NO RETESTE

`POST /api/items/create` aceitou e persistiu um item cujo `pdm.group_code` era `999999`, inexistente no tenant autenticado. Isso cria item com referência inválida e contradiz a validação esperada pelo cadastro.

Critérios de aceite:

- validar grupo e modificador PDM dentro da empresa autenticada;
- responder `400`, `409` ou `422` com mensagem compreensível;
- não persistir parcialmente o item;
- cobrir grupo inexistente, modificador inexistente e referência pertencente a outra empresa.

## 3. Erros de validação retornam 500 — CORRIGIDO NO RETESTE

Os seguintes casos inválidos retornaram `500`, embora sejam erros de domínio esperados:

- funcionário com código zero/negativo;
- funcionário com nome vazio;
- funcionário com código duplicado;
- prioridade com início maior ou igual ao fim;
- prioridade com faixa sobreposta.

Critérios de aceite:

- responder `400`, `409` ou `422`, conforme o caso;
- manter a mensagem de domínio no JSON;
- reservar `500` para falhas inesperadas;
- adicionar testes HTTP para cada cenário.

## 4. Orçamento aceita `enterprise_code` de outro tenant — ISOLAMENTO OK, CONTRATO DIVERGENTE

`POST /api/sales-quotation/create` autenticado na empresa 1 aceitou `enterprise_code: 778` e respondeu `201`. A empresa do payload não pode substituir o tenant autenticado.

Critérios de aceite:

- ignorar o campo e assumir a empresa autenticada, ou rejeitar com `400/403/422`;
- garantir que nenhum registro seja persistido em outro tenant;
- cobrir tentativa por ADMIN e USER em teste HTTP multiempresa.

Também retornaram `500` em vez de erro de domínio: parâmetros de orçamento com rótulo vazio, padrão de comissão desbalanceado, motivo de cancelamento sem descrição e cancelamento sem motivo válido.

## Evidências adicionais

- 211 rotinas do Desktop foram abertas automaticamente: nenhum componente faltante e nenhum erro JavaScript;
- o antigo `GET /api/enterprise` usado pelo frontend foi corrigido para `GET /api/enterprise/list`;
- `404` de logo não configurada e parâmetros de promessa não configurados são estados opcionais já tratados no frontend;
- criação de grupo e modificador PDM funciona quando `created_by` autenticado é enviado;
- cadastro mínimo de item alfanumérico respondeu `201`.

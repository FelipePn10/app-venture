# Backend — lacunas encontradas na integração da Central de Alertas

## Reteste da correção estrutural de A — 20/08/2026

A resolução nativa por `(enterprise_id, business_code)` foi aprovada no router real:

- item numérico recém-criado `234141`: criação `201`, busca `200` e readiness `200`;
- `4853`: readiness `200`;
- `0007` existente somente no tenant 9 retornou `item not found` para o instrutor do tenant 1, confirmando o isolamento;
- B e C continuaram aprovados em 20/20 verificações.

O update parcial, entretanto, ainda não está concluído. O mesmo payload que altera apenas garantia, origem e PIS/COFINS agora chega ao use case, mas retorna:

```text
422 {"error":"invalid reorder point"}
```

Depois de tratar `engineering.dimensions` vazio como ausência, é necessário aplicar a mesma semântica de campo omitido ao `planning.reorder_point` e auditar os demais value objects JSONB opcionais. Corrigir campo por campo tende a revelar a próxima estrutura vazia.

Critérios restantes de A:

- fazer merge do patch com o item persistido antes de validar, ou representar presença/ausência explicitamente no DTO;
- JSONB histórico `{}` de value objects opcionais deve significar ausência, sem criar um valor inválido;
- payload parcial sem `planning.reorder_point` não pode validar um novo reorder point vazio;
- teste HTTP deve usar um item real com dimensões e reorder point ausentes, alterar somente `commercial.warranty_days`, `accounting.origin` e `accounting.calculate_pis_cofins` e confirmar preservação do restante;
- auditar outros blocos opcionais para impedir correção sequencial de um erro por vez.

## Reteste das correções A, B e C — 20/08/2026, binário reconstruído

- **B aprovado:** criação manual retorna `origin: MANUAL` sem `policy_days`; ocorrência automática retorna `origin: POLITICA_ITEM` com o intervalo correto.
- **C aprovado:** o Desktop envia `warehouse.cyclical_count_config.days_interval`; a política foi persistida e o scheduler criou a ocorrência automática.
- **A não pôde ser aprovado no ambiente real:** o mesmo item numérico criado com `201` e relido pela busca com `200` voltou a retornar `404 item not found` no `PUT` e `422 item not found` no `activation-readiness`. A requisição não chega à validação de dimensões.

Evidência mais recente:

- código comercial `234139`: criação `201`;
- `GET /api/items/search/234139`: `200`;
- `PUT /api/items/234139`: `404`;
- `GET /api/items/234139/activation-readiness`: `422`;
- scheduler do mesmo item: ocorrência `POLITICA_ITEM` criada corretamente.

Portanto B e C estão encerrados. Para concluir A, primeiro é necessário restaurar a resolução numérica no router real e então repetir o teste de preservação do update parcial no mesmo fluxo HTTP.

## Reteste após a migration 000314 — 20/08/2026

O banco de treinamento foi confirmado na versão `314` e a API foi reconstruída novamente depois da gravação dos arquivos da migration. O scheduler passou no fluxo real: uma política de 1 dia persistida no item gerou uma ocorrência `POLITICA_ITEM`, estado `PROGRAMADA`, com auditoria `PROGRAMADA_AUTOMATICAMENTE`.

Permanecem três lacunas de contrato:

### A. Atualização parcial do item exige dimensões omitidas

Após a reconstrução com o binário realmente posterior à migration 314, a resolução numérica foi aprovada:

- criação do código comercial textual `234137`: `201`;
- `GET /api/items/search/234137`: `200`;
- `GET /api/items/234137/activation-readiness`: `200`;
- o `PUT /api/items/234137` alcançou a validação do item, confirmando que a rota foi resolvida.

Porém uma atualização parcial válida:

```json
{
  "commercial": { "warranty_days": 730 },
  "accounting": { "origin": 1, "calculate_pis_cofins": true }
}
```

retornou `422 {"error":"invalid dimensions"}`. O bloco `engineering.dimensions` não foi enviado e não deveria ser revalidado como um valor novo inválido nem apagar o valor existente.

Critérios de aceite:

- update parcial preserva blocos e campos omitidos;
- dimensões só são validadas quando informadas ou após merge correto com o estado persistido;
- teste HTTP cria item completo, altera somente garantia/origem e confirma que descrição, CEST e engenharia permanecem;
- referência numérica continua coberta no mesmo teste de router real.

### B. Expor origem e intervalo da ocorrência no contrato público

As colunas `stock_cycle_counts.origin` e `policy_days` existem e são preenchidas pelo scheduler, mas não aparecem na entidade pública `CycleCount` nem em `cycleColumns`. Assim, a tela não consegue distinguir uma ocorrência automática de uma programação manual, nem explicar qual intervalo a originou.

Critérios de aceite:

- criação, listagem e detalhe retornam `origin: MANUAL | POLITICA_ITEM`;
- ocorrências automáticas retornam `policy_days` e manuais podem omiti-lo;
- preservar ambos ao mapear o código comercial textual;
- teste HTTP cobre as duas origens.

### C. Normalizar o JSON da política de contagem do item

O contrato global declara JSON em `snake_case`, porém `CyclicalCountConfig` não possui tag JSON. No teste HTTP:

- `{ "cyclical_count_config": { "days": 1 } }` foi aceito, mas persistiu `{"DaysInterval":0}` e não ativou a política;
- `{ "cyclical_count_config": { "DaysInterval": 1 } }` persistiu corretamente e ativou o scheduler.

O Desktop usa temporariamente `DaysInterval` para não deixar a funcionalidade quebrada, mas o backend deve aceitar e devolver uma chave pública em `snake_case` (recomendado: `days_interval`) e rejeitar intervalo zero/inválido em vez de aceitar silenciosamente.

Critérios de aceite:

- DTO explícito com `json:"days_interval"` (ou contrato snake_case documentado equivalente);
- create/update rejeitam zero e valores negativos com `422` quando a política é informada;
- resposta do item usa a mesma convenção;
- manter compatibilidade temporária de leitura com `DaysInterval` para clientes instalados;
- teste HTTP garante que uma política enviada pelo contrato público ativa o scheduler.

Validação executada pelo Desktop em 16/08/2026 contra o worktree `panossoerp-ajustes` e o ambiente de treinamento atualizado.

## 1. Expor destinatários internos selecionáveis

O contrato exige que a assinatura permita selecionar usuário ativo ou departamento do tenant, mas a API expõe apenas criação/listagem de assinaturas. Não existe rota autenticada para listar:

- usuários ativos vinculados à empresa, com UUID e nome seguro para exibição;
- departamentos ativos da empresa, com código e descrição.

Sem essas rotas, o Desktop só consegue oferecer com segurança os papéis conhecidos `ADMIN` e `USER`; não deve aceitar UUID, código de departamento ou e-mail digitado manualmente.

Critérios de aceite:

- rotas tenant-aware para usuários e departamentos elegíveis;
- nunca retornar hash, token, credencial ou dados de outro tenant;
- indicar usuário/departamento inativo;
- testes ADMIN, USER e isolamento multiempresa;
- documentar os DTOs no handoff.

## 2. Informar quais eventos possuem produtor ativo

O catálogo mistura eventos já conectados a processos reais e eventos reservados para produtores futuros. A resposta de `GET /api/notifications/events` não informa essa diferença. Assim, o administrador pode habilitar uma assinatura válida que nunca produzirá alerta.

Critérios de aceite:

- acrescentar ao catálogo um indicador como `producer_status: ATIVO | FUTURO` ou rota equivalente;
- informar uma descrição operacional quando o produtor ainda não existe;
- permitir ao Desktop desabilitar ou sinalizar claramente eventos futuros;
- teste que mantenha o catálogo e os produtores sincronizados.

## 3. Retornar erros semânticos nas rotas de notificações

`notificationError` atualmente converte praticamente qualquer validação, conflito ou registro inexistente em `500`. Entradas inválidas de settings, assinatura, destinatário, threshold, transição e quantidade contada são regras de domínio esperadas.

Critérios de aceite:

- `400` para JSON/formato inválido;
- `404` para recurso do tenant inexistente;
- `409` para conflito de estado/transição concorrente;
- `422` para regra, referência, threshold ou quantidade inválida;
- preservar mensagem compreensível em `error`;
- manter `500` somente para falha inesperada;
- testes HTTP das rotas de settings, assinatura, retry e contagem cíclica.

## 4. Tornar o contrato público da contagem compatível com código comercial

O DTO de domínio ainda declara `item_code` como inteiro. O middleware faz a tradução durante o rollout, mas o contrato público e a documentação devem declarar explicitamente string e preservar códigos como `TEA452-0` e `0007-A` nas respostas.

Critérios de aceite:

- teste HTTP de criação, listagem e detalhe com os dois códigos;
- resposta devolve o código comercial textual;
- isolamento por empresa;
- referências legadas ficam apenas nos campos temporários `legacy_*`.

## 5. Resolver também códigos comerciais compostos somente por números

O middleware atual ignora qualquer referência que passe em `strconv.ParseInt`. Isso confunde um código comercial textual como `234127` ou `4853` com a chave legada interna. Evidência HTTP no treinamento:

- `POST /api/items/create` criou o código comercial `234127` e `GET /api/items/search/234127` retornou `200`;
- `PUT /api/items/234127` retornou `404 item not found`;
- `GET /api/items/234127/activation-readiness` retornou `422 item not found`;
- a criação de contagem para um item comercial numérico chegou ao repositório com o número errado.

O contrato anterior exige preservar códigos numéricos legados como texto. A decisão “se parece número, já é ID” não é válida na API pública.

Critérios de aceite:

- resolver toda referência pública por `(enterprise_id, business_code)`, inclusive quando contém apenas dígitos;
- usar ID/chave legada somente depois da resolução e internamente;
- cobrir `PUT /api/items/{code}`, `activation-readiness`, contagem cíclica e demais rotas com `4853`, `0007`, `TEA452-0` e isolamento multiempresa;
- nunca remover zeros à esquerda.

## 6. Corrigir INSERT da auditoria de contagem cíclica

Uma programação válida retornou `500`. O PostgreSQL registrou a causa exata:

`could not determine data type of parameter $4`

Query afetada:

`jsonb_build_object('programada_para',$4)` em `CreateCycleCount`.

Critérios de aceite:

- tipar explicitamente o parâmetro (`$4::timestamptz`) ou usar expressão equivalente;
- criação retorna `201` e grava auditoria na mesma transação;
- teste HTTP/PostgreSQL cobre criar → iniciar → concluir/cancelar;
- falhas esperadas retornam erro semântico, não `500`.

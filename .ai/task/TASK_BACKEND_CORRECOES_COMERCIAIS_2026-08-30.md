# TASK backend — consolidação do ciclo comercial (2ª rodada, 30/08/2026)

## Contexto

A primeira rodada (TASK_BACKEND_CORRECOES_COMERCIAIS_2026-08-28) corrigiu parte dos
contratos (`TextCode` para precificação/políticas, resolução de tabela, histórico,
RMA, reprogramação, etc.) e o frontend foi alinhado. Ainda assim, **95% dos erros
relatados pelo usuário permanecem na operação real**. A causa raiz está em três frentes
que precisam ser resolvidas nesta rodada:

1. **Ambiente publicado desatualizado.** O worktree `panossoerp-ajustes`
   (branch `fix/ajustes-operacionais`, migration 319) contém os handlers canônicos, mas
   os ambientes (5070/5073, demo, training) ainda rodam imagens antigas. Erros como
   "divisão de vendas não encontrada" (reativar), "internal server error" (excluir) e
   reprogramação sem botão são, em grande parte, backend publicado antigo — **não** falta
   de implementação no frontend. Publicar **antes** de testar as telas.

2. **`item_code` canônico em texto ainda não está uniforme.** A precificação
   (`FormSalesPriceDTO`, `GenerateSalesTablePricesDTO`, `CommercialPolicySpecificItemDTO`,
   `resolve-by-item`) já aceita `TextCode`, mas **pedido de venda e orçamento ainda usam
   `ItemCode int64`** (`CreateSalesOrderItemDTO.ItemCode int64` em
   `internal/application/dto/request/sales_order_dto.go:148` e o item de orçamento em
   `sales_quotation_dto.go:135`). O item no domínio tem `Code int64` (identificador
   numérico legado) e `BusinessCode` (código comercial texto, ex.: "TEA452-0"). O
   frontend — e toda a pipeline de preço — usam o **código comercial em texto**. Resultado:
   após corrigir a "data de referência inválida", a inclusão de item em pedido/orçamento
   vai falhar com `json: cannot unmarshal string into ... item_code of type int64`.

3. **Dados da empresa ausentes no cabeçalho dos relatórios.** `ReportExportHandler`
   monta o papel timbrado a partir de `GetFiscalConfig`; se a configuração fiscal da
   empresa não estiver preenchida (razão social, CNPJ, IE, endereço, telefone, e-mail,
   logo), o cabeçalho sai **em branco** (o handler "fails soft"). Isso explica "CNPJ em
   branco" em VSAC0100, VEXR0100, VVND0400, VVND0600, VREP0600, VPDV0253, VRES0100 e
   VVRE0200.

Esta task é **de backend**. O frontend deste repositório já foi ajustado; o que segue são
as contrapartes de servidor, o plano de publicação e os testes de aceite.

Antes de implementar, pesquise como ERPs enterprise (SAP S/4HANA, Oracle Fusion Cloud,
Microsoft Dynamics 365, TOTVS e Odoo) tratam **código de item canônico**, **precificação
autoritativa por linha**, **acúmulo de comissão como passivo/custo**, **filtros de carteira
de pedidos (analisado/atendido/conferido/atrasado/faturado)** e **papel timbrado
centralizado**. Registre as decisões aplicáveis; não copie complexidade sem ganho operacional.

---

## P0 — itens e contratos que bloqueiam a operação

### 1. `item_code` canônico em texto (pedido de venda e orçamento)

- Migrar `CreateSalesOrderItemDTO`, `UpdateSalesOrderItemDTO`, o item de orçamento
  (`CreateSalesQuotationItemDTO`/`UpdateSalesQuotationItemDTO`) e todos os DTOs/use cases
  que recebem `item_code` do cliente para `TextCode` (texto), **canonicalizando o código
  comercial (`BusinessCode`)**.
- Resolver internamente o identificador numérico legado (`items.Code`) quando necessário,
  sem expor isso ao cliente. Não mudar colunas de banco sem migration planejada e reversível.
- Manter compatibilidade temporária com JSON numérico (como já feito em `TextCode`), com
  telemetria de depreciação, e rejeitar texto inválido com mensagem em português.
- Garantir que a inclusão/atualização de item resolva o preço vigente pela tabela da linha
  (ou da capa) usando o **código comercial**, validando item existente no tenant.
- Cobrir com testes: item texto válido, item numérico temporário, item inexistente, máscara,
  tenant cruzado e atualização de quantidade/preço.

### 2. Publicação dos ambientes (pré-requisito de qualquer validação)

- Executar a linha de migrations correta (`240 → 241 → 242 → 283...315 → 319`) sobre bancos
  isolados; **não** aplicar sobre bancos compartilhados nem sobre o training divergente.
- Publicar a imagem da branch `fix/ajustes-operacionais` em demo e training; validar
  `GET /api/version` e smoke autenticado em cada ambiente.
- Confirmar que os handlers canônicos respondem (não 404): `/api/sales-division/{code}/status`,
  `/api/sales-division/{code}` (DELETE), `/api/delivery-reschedule/preview/{code}`,
  `/api/delivery-reschedule/batch`, `/api/sales-order/search`, `/api/recurring-sales/*`,
  `/api/representatives/*`, `/api/customers/support/commercial-policies/*`.
- Registrar em `docs/dev` a matriz "rota × ambiente × migration" para evitar regressão de
  rota fantasma.

### 3. Relatórios com papel timbrado (CNPJ/razão social/IE/logo)

- Criar **fonte canônica dos dados da empresa autenticada** (razão social, nome fantasia,
  CNPJ/CPF, inscrição estadual, endereço completo, telefone, e-mail, logomarca e cor da
  marca) consultada por `ReportExportHandler` e por qualquer relatório dedicado.
- Não depender de valores enviados pelo frontend; obter tudo pelo JWT/tenant.
- Se a configuração fiscal ainda não estiver cadastrada, devolver um erro claro em português
  (ou um cabeçalho mínimo com razão social da empresa) **sem** produzir um PDF "em branco"
  silencioso. Documentar o fluxo de primeiro cadastro.
- Garantir que o mesmo gerador corporativo alimente PDF/XLSX/DOCX/CSV e que relatório geral
  e individual compartilhem os mesmos filtros e totais.

---

## P0.5 — catálogos canônicos para os modais de busca

O frontend passou a substituir campos de código livre por modais pesquisáveis
(`LookupField`) com entrada manual de código, usando os loaders abaixo. Garantir
que cada endpoint devolva **todas** as entidades ativas do tenant e seja estável:

- Itens: `GET /api/items/` (já existe).
- Máscaras: `GET /api/items/with-masks` (já existe).
- Classificações de item: hoje o frontend consome `GET /api/items/classifications/masks`.
  **Confirmar** se essa rota devolve a lista plana de classificações (código + descrição)
  ou apenas máscaras; se não houver listagem plana de classificações, criar
  `GET /api/items/classifications` devolvendo código/máscara, descrição e situação,
  limitado ao tenant, para o modal não depender de digitação.
- Características do configurador: `GET /api/configurator/characteristics` (confirmar
  que devolve código + descrição e que `id`/`code` são estáveis para o modal).

## P1 — fluxos específicos relatados pelo usuário### 4. Divisões de venda (VVND0100)

- Confirmar que `PATCH /status` e `DELETE` respondem em todos os ambientes e diferenciam
  404 real, 403 (permissão) e 409/422 (vínculo). Reativação de divisão válida não pode
  retornar "não encontrada"; exclusão de divisão vinculada deve retornar mensagem em
  português orientando desativação. Testar com dois tenants.

### 5. Pedidos e carteira (VVND0200/VPDV0253/VVND0600)

- `reference_date` em ISO (YYYY-MM-DD) já validado; garantir que `emission_date` vindo como
  RFC3339 da capa não quebre a consulta (normalizar na borda).
- `/api/sales-order/search` deve aceitar filtro opcional por cliente (código ou
  nome/documento), representante, item, situação, análise comercial/financeira, conferência,
  liberação e período, retornando **todas** as linhas (ou paginação com `limit` até 500 e
  totalizadores), nunca só a página visível.
- Criar consultas consistentes para **analisados, atendidos, conferidos, atrasados e
  faturados** (hoje falta filtro de "atendido" e "atrasado"). Definir semântica clara e
  documentar os códigos de situação (`R/P/A/OA/OF/F/CANCELLED`), análise
  (`NOT_ANALYZED/APPROVED/REJECTED`), liberação (`BLOCKED/MANUAL_RELEASED/RELEASED`) e
  conferência (`PENDING/CONFERRED/DIVERGENT`).
- As ações `analyze`/`attend`/`conference`/`delay-reason` devem rejeitar situação/ação vazias
  no servidor (não confiar só no cliente).

### 6. Orçamento, comissão e histórico (VVND0300)

- Confirmar que `GET /api/customers/support/sales-tables/resolve-by-item` seleciona a tabela
  por linha e que a capa **não** duplica/engana a tabela (o frontend removeu o campo da capa;
  manter `price_table_code` da capa apenas como "preferencial").
- Resolver a comissão do vínculo vigente representante × empresa (tipo/plano/segmento/política)
  e **não aceitar percentual livre** do usuário comum. Exceção exige permissão, motivo e
  auditoria.
- Garantir que eventos transacionais (inclusão/edição/cancelamento de item, mudança comercial,
  conversão) sejam gravados em `sales_quotation_events` com antes/depois, ator, horário e
  correlação — a aba Histórico depende disso.
- Contabilizar comissão como passivo/custo comercial no evento de competência configurável
  (faturamento/recebimento/rateio), com estorno em cancelamento/devolução e conciliação até o
  pagamento; não somar comissão ao preço se já embutida na formação. Revisar
  `commercialCommissionService`/`commissions` no backend para garantir `ledger/{code}/{action}`
  e idempotência.

### 7. Representantes (VVND0400/VREP0600)

- `GET /api/representatives/{code}` deve devolver **todas** as coleções (empresas, segmentos,
  planos, interesses, contatos, endereços), inclusive vazias. Confirmação já entregue; validar
  em ambiente publicado.
- Usar `type_code` de fato nas regras (elegibilidade, faturamento direto, comissão,
  território/carteira, relatórios). A tela "Tipos" não pode ser decorativa.
- `/api/representatives/interest-classifications` deve listar as classificações válidas
  (código/máscara/descrição) para o vínculo de interesse; hoje o contrato de
  `POST /api/representatives/interests` exige `item_classification_code` numérico sem
  consulta canônica.

### 8. SAC, entrega e RMA (VSAC0100/VEXR0100/VGAR0211)

- Fornecer catálogo estável de situação em português (ex.: `DISCONTINUED_ORDER` →
  "Pedido descontinuado") na API ou em endpoint de catálogo; o frontend já mapeia, mas o
  servidor não deve devolver enums em inglês como único rótulo.
- Reprogramação: `preview/{code}` deve devolver por linha saldo aberto, datas, reservas,
  ATP/CTP, MRP, CRP, APS, compras/produção, expedição e fiscal, com `can_reschedule`,
  `suggested_date`, `suggestion_source` e `justification` em português. `batch` deve ser
  atômico e idempotente, bloquear linhas faturadas e recalcular promessas afetadas.
- Em operações com "código do anexo", garantir listagem (`attachments`), download e exclusão
  autenticados por chamado, para o modal de pesquisa funcionar sem digitar código de cor.

### 9. Recorrências e reajuste (VVRE0200/VVND0610)

- `GET /api/recurring-sales/{code}` deve devolver `allowed_actions`, `can_generate_order`,
  `can_cancel`, `can_adjust`, `missing_preconditions` e `lifecycle_status`, para a tela não
  oferecer ações inválidas nem esconder o cancelamento.
- Cancelamento com máquina de estados, motivo obrigatório, data efetiva, política sobre
  pedidos futuros e auditoria; idempotência na geração do pedido.
- A prévia de reajuste deve exibir valor anterior/novo, índice ou percentual, base
  legal/contratual, vigência, impacto por item e total. O motivo não pode existir duplicado
  em dois campos sem semânticas distintas (o frontend já unificou em um único campo de motivo).

### 10. Políticas comerciais (VPDV0108/VPDV0111)

- `PUT /api/customers/support/commercial-policies/{code}` (atualização integral) e
  `POST /specific-items` devem aceitar `item_code`/`item_mask` por consulta canônica; item ou
  máscara inexistente retorna 422 em português. Validar precedência, vigência, empilhamento,
  aprovação e histórico de versões.

---

## Requisitos transversais

- Isolamento por `enterprise_code` em todo SELECT/UPDATE/DELETE, com teste cruzado entre dois
  tenants.
- Ator exclusivamente pelo JWT; rejeitar/ignorar `created_by` e equivalentes no corpo.
- Erros de domínio em português com HTTP 400/404/409/422 coerente e código estável.
- Paginação/ordenação determinística e limites para consultas grandes.
- Idempotency key em mutações que geram pedidos, reprogramações, reajustes ou lançamentos.
- Auditoria imutável de antes/depois e métricas sem dados pessoais nos logs.

---

## Testes obrigatórios e aceite

- Testes de DTO para `item_code` texto em pedido/orçamento, compatibilidade numérica
  temporária e mensagens inválidas.
- Integração autenticada por fluxo: sucesso, registro inexistente, vínculo, permissão e dois
  tenants.
- Smoke end-to-end **em ambiente publicado**: cadastrar preço, resolver tabela, criar
  orçamento multi-item, conferir histórico/comissão, converter em pedido, analisar/atender,
  reprogramar saldo, exportar (geral e individual) e cancelar recorrência.
- Relatórios geral/individual com empresa preenchida (CNPJ/razão social visíveis no PDF);
  arquivo deve abrir e conter ao menos uma linha conhecida.
- `go test ./...`, linters, `git diff --check` e verificação de migrations passando.
- Não considerar concluído apenas porque o endpoint retorna 2xx: conferir estado persistido,
  evento/auditoria, isolamento por empresa e a resposta efetivamente apresentada ao usuário.

## Estratégia de entrega

PRs pequenos, nesta ordem: (1) `item_code` canônico em pedido/orçamento + publicação dos
ambientes; (2) relatórios com papel timbrado e fonte canônica da empresa; (3) carteira de
pedidos (filtros analisado/atendido/conferido/atrasado/faturado); (4) comissão como
passivo/custo e histórico; (5) recorrência/reajuste e catálogos do representante;
(6) catálogos SAC/RMA e anexos. Publicar backend antes das telas que dependem de contrato
novo e manter rollback por PR.

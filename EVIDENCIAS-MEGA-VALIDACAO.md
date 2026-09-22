# Evidências da validação ampliada — atualização 22/09/2026

Suíte: `go test -tags=integration -p 1 ./internal/... -count=1 -json`. Banco PostgreSQL descartável local; nenhum ambiente remoto alterado.

Resultado atual da suíte global (`./internal/... ./api`): **1.401 testes/subtestes aprovados, zero falhas e 3 ignorados**. A contagem inclui unitários, integrações e subtestes; não representa 1.401 fluxos ponta a ponta. JSON: `/tmp/venture-release-final-validation.jsonl`.

Os 27 problemas listados abaixo são **históricos e resolvidos**. As fixtures passaram a usar empresa/usuário existentes, referências obrigatórias, enums válidos e o parâmetro 45 criado/restaurado. Não foram removidas as verificações do produto para fazê-las passar. O teste de código de item passou a usar o middleware real, e ausência de dimensão aceita as representações nula/objeto vazio previstas pelo contrato.

## Histórico das 27 falhas resolvidas

As mensagens abaixo preservam a evidência da rodada anterior. A repetição posterior com dados válidos passou, incluindo configurador, custos, roteiros, compras, estoque, terceiros e código de item.

### TestIntegration_Configurator_Flow

Pacote: `internal/application/usecase/configurator_uc`.

```text
configurator_integration_test.go:51: CreateSet: criando conjunto: nenhuma empresa selecionada na sessão atual
```

### TestIntegration_Configurator_CartesianWithRestriction

Pacote: `internal/application/usecase/configurator_uc`.

```text
configurator_integration_test.go:175: CreateSet CART9129099575-COR: criando conjunto: nenhuma empresa selecionada na sessão atual
```

### TestIntegration_Configurator_ItemDescription

Pacote: `internal/application/usecase/configurator_uc`.

```text
configurator_integration_test.go:275: CreateDescriptionType: criando tipo de descrição: nenhuma empresa selecionada na sessão atual
```

### TestIntegration_Configurator_EquivalentRule

Pacote: `internal/application/usecase/configurator_uc`.

```text
/usr/local/go/src/testing/testing.go:1872 +0x237
/usr/local/go/src/testing/testing.go:1875 +0x35b
/usr/local/go/src/runtime/panic.go:783 +0x132
/home/felipepanosso/GolandProjects/panossoerp-ajustes/internal/application/usecase/configurator_uc/configurator_integration_test.go:341 +0x25e
```

### TestIntegration_CostRollup_CoproductAndFixedQty

Pacote: `internal/application/usecase/cost_uc`.

```text
coproduct_cost_integration_test.go:35: cleanup exec failed (INSERT INTO items (code, warehouse_code, created_by) VALUES ($1,$2,$3)): ERROR: null value in column "enterprise_id" of relation "items" violates not-null constraint (SQLSTATE 23502)
coproduct_cost_integration_test.go:35: cleanup exec failed (INSERT INTO items (code, warehouse_code, created_by) VALUES ($1,$2,$3)): ERROR: null value in column "enterprise_id" of relation "items" violates not-null constraint (SQLSTATE 23502)
coproduct_cost_integration_test.go:35: cleanup exec failed (INSERT INTO items (code, warehouse_code, created_by) VALUES ($1,$2,$3)): ERROR: null value in column "enterprise_id" of relation "items" violates not-null constraint (SQLSTATE 23502)
coproduct_cost_integration_test.go:35: cleanup exec failed (INSERT INTO items (code, warehouse_code, created_by) VALUES ($1,$2,$3)): ERROR: null value in column "enterprise_id" of relation "items" violates not-null constraint (SQLSTATE 23502)
```

### TestIntegration_CostRollup_PerWorkCenterRichTime

Pacote: `internal/application/usecase/cost_uc`.

```text
cost_integration_test.go:45: UpsertWorkCenterCost: nenhuma empresa selecionada na sessão atual
```

### TestIntegration_Drawing_TenantItemConfigurationAndRevisionReplication

Pacote: `internal/application/usecase/drawing_uc`.

```text
drawing_integration_test.go:85: cleanup exec failed (INSERT INTO item_masks(item_code,mask,mask_hash,created_by,created_at) VALUES($1,$2,$3,$4,NOW())): ERROR: insert or update on table "item_masks" violates foreign key constraint "item_masks_created_by_fkey" (SQLSTATE 23503)
drawing_integration_test.go:95: plain item=<nil> err=item ou configuração não encontrado: ERROR: insert or update on table "item_engineering_drawings" violates foreign key constraint "item_engineering_drawings_updated_by_fkey" (SQLSTATE 23503)
```

### TestIntegration_LotMask_Generate

Pacote: `internal/application/usecase/lot_mask_uc`.

```text
lot_mask_integration_test.go:28: Create: criando máscara de lote: ERROR: null value in column "enterprise_id" of relation "lot_masks" violates not-null constraint (SQLSTATE 23502)
```

### TestIntegration_FirmGeneratesServiceRequisition

Pacote: `internal/application/usecase/planned_order_uc`.

```text
service_requisition_integration_test.go:76: generateServiceRequisition: nenhuma empresa selecionada na sessão atual
```

### TestIntegration_GeneratePurchaseOrders_E2E

Pacote: `internal/application/usecase/purchase_requisition_uc`.

```text
generate_integration_test.go:84: create requisition: generating code: nenhuma empresa selecionada na sessão atual
```

### TestAvailabilityExplodesManualQuantityAndAppliesLayout

Pacote: `internal/infrastructure/repository/mrp_report`.

```text
report_integration_test.go:59: can't scan into dest[0] (col: created_by): cannot scan NULL into *string
```

### TestProfileReturnsPersistedOriginsAndTenantDrawings

Pacote: `internal/infrastructure/repository/mrp_report`.

```text
report_integration_test.go:101: can't scan into dest[0] (col: created_by): cannot scan NULL into *string
```

### TestReorderPointTraversesReleasedAndBlockedSalesOrderStructures

Pacote: `internal/infrastructure/repository/mrp_report`.

```text
report_integration_test.go:154: can't scan into dest[0] (col: created_by): cannot scan NULL into *string
```

### TestCycleCountUsesBusinessCodeAndWritesAuditTransactionally

Pacote: `internal/infrastructure/repository/notification`.

```text
cycle_count_integration_test.go:40: ERROR: invalid input value for enum warehouse_location: "NORMAL" (SQLSTATE 22P02)
```

### TestPolicyCycleCountSchedulerLifecycleAndTenantIsolation

Pacote: `internal/infrastructure/repository/notification`.

```text
cycle_count_policy_integration_test.go:25: ERROR: invalid input value for enum warehouse_location: "NORMAL" (SQLSTATE 22P02)
```

### TestParameter45_BlocksOrderReportingWithIssueAtRelease

Pacote: `internal/infrastructure/repository/production_order`.

```text
material_control_integration_test.go:145: parameter 45 must block this production release
```

### TestIntegrationPurchasePriceTenantResolutionAndAdjustments

Pacote: `internal/infrastructure/repository/purchase_price`.

```text
purchase_price_integration_test.go:118: ERROR: insert or update on table "notification_outbox" violates foreign key constraint "notification_outbox_originator_user_id_fkey" (SQLSTATE 23503)
```

### TestIntegration_Requisition_AttendanceStatusRecompute

Pacote: `internal/infrastructure/repository/purchase_requisition`.

```text
purchase_requisition_integration_test.go:23: NextCode: nenhuma empresa selecionada na sessão atual
```

### TestIntegration_Routing_EffectivitySelection

Pacote: `internal/infrastructure/repository/routing`.

```text
effectivity_integration_test.go:26: cleanup exec failed (INSERT INTO items (code, warehouse_code, created_by) VALUES ($1,$2,$3)): ERROR: null value in column "enterprise_id" of relation "items" violates not-null constraint (SQLSTATE 23502)
effectivity_integration_test.go:38: create expired: nenhuma empresa selecionada na sessão atual
```

### TestIntegration_Routing_AlternativeResources

Pacote: `internal/infrastructure/repository/routing`.

```text
resources_integration_test.go:40: CreateOperation: nenhuma empresa selecionada na sessão atual
```

### TestIntegration_Routing_RichTimeRoundTrip

Pacote: `internal/infrastructure/repository/routing`.

```text
routing_integration_test.go:42: CreateOperation: nenhuma empresa selecionada na sessão atual
```

### TestThirdPartyRoutingDetailsRoundTrip

Pacote: `internal/infrastructure/repository/routing`.

```text
third_party_integration_test.go:22: ERROR: null value in column "enterprise_id" of relation "items" violates not-null constraint (SQLSTATE 23502)
```

### TestReservationAndLotCreationAreTenantAware

Pacote: `internal/infrastructure/repository/stock`.

```text
operational_creation_integration_test.go:28: ERROR: invalid input value for enum warehouse_location: "NORMAL" (SQLSTATE 22P02)
```

### TestIntegration_Supplier_CRUD

Pacote: `internal/infrastructure/repository/supplier`.

```text
supplier_integration_test.go:54: CreateSupplier: nenhuma empresa selecionada na sessão atual
```

### TestIntegration_Supplier_PropagateStateRegistration

Pacote: `internal/infrastructure/repository/supplier`.

```text
supplier_integration_test.go:141: create c1: nenhuma empresa selecionada na sessão atual
```

### TestPriceLifecycleResolutionAndTenantIsolation

Pacote: `internal/infrastructure/repository/third_party_service`.

```text
repository_integration_test.go:35: ERROR: null value in column "enterprise_id" of relation "suppliers" violates not-null constraint (SQLSTATE 23502)
```

### TestItemBusinessCodeHTTPAcrossOperationalDomains

Pacote: `internal/interfaces/middleware`.

```text
item_business_code_integration_test.go:43: ERROR: invalid input value for enum warehouse_location: "NORMAL" (SQLSTATE 22P02)
```

## Cenários ignorados

- `TestSMTPHostingerIntegration`.
- `TestSMTPHostingerAllCatalogPreviews`.
- `TestIdentityMirrorUsesProductionAuthorityAndIsIdempotent`.

## Reprodutibilidade

O JSON da rodada atual está em `/tmp/venture-release-final-validation.jsonl`; as rodadas anteriores estão em `/tmp/venture-mega-integration-final.jsonl` e `/tmp/venture-mega-integration.jsonl`. Esses arquivos temporários podem desaparecer após limpeza do ambiente. As falhas e resultados essenciais estão preservados neste documento.

Para repetir, aponte `TEST_DATABASE_URL` para uma cópia descartável migrada. Os testes existentes alteram dados e alguns não limpam completamente suas fixtures; nunca executar essa suíte em produção, treinamento ou desenvolvimento compartilhado.

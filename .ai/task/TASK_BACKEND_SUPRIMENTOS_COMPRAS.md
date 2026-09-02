# TASK backend — suprimentos & compras (VPCT0100, VTPS0100, VPDC0200/0210, VSUP*, VCON*, VAVR0200, VTER*, VVOR0202)

## Contexto

Rodada de suprimentos/compras. O frontend (repositório `app-venture`) já foi ajustado
nos pontos de interface (rótulos em PT-BR, modais pesquisáveis, exemplos de payload com
enums válidos). O que segue são as contrapartes **de servidor** e as correções de lógica
de negócio sem as quais os erros relatados persistem. Antes de implementar, pesquise como
ERPs enterprise (SAP S/4HANA MM, Oracle Fusion Procurement, Dynamics 365 Supply Chain,
TOTVS e Odoo Purchase) tratam **pedido de compra integrado ao MRP**, **cadastro único de
fornecedor**, **tolerâncias/alçadas/EDI** e **serviços terceirizados**. Registre decisões
em `docs/dev/decisoes-enterprise-*.md`.

## P0 — `item_code` canônico em texto (restante)

A migração `item_code → TextCode` ainda não chegou nestes módulos:

1. **Serviços terceirizados**: `internal/application/dto/request/third_party_service_request.go`
   (`ItemCode int64 json:"item_code"`). O frontend envia texto (ex.: "TEA452-0").
2. **Tempo por item × máquina** (ADENDO da rodada anterior, ainda em aberto):
   `internal/application/dto/request/machine.go` (`CreateItemMachineTimeDTO.ItemCode int64`)
   e `machine_handler.go` (`ListItemTimes` com `strconv.ParseInt`).

Migrar ambos para `TextCode`, com compatibilidade numérica temporária e testes de DTO
(texto, numérico temporário, inválido, dois tenants).

## P1 — mensagens de erro em PT-BR (erros atuais em inglês)

Traduzir para PT-BR (com código estável), sem quebrar a mensagem de contrato:

- `freight_type must be FIXED or PERCENT` (VTPS0100/VTER0100) → "frete deve ser FIXO ou PERCENTUAL".
- `scope must be GLOBAL, SUPPLIER, COST_CENTER or CATEGORY` (VSUP0610).
- `invalid domain "RECEIVING"` (VSUP0610) — validar contra o catálogo
  `PURCHASE_TABLE|PURCHASE_ORDER|QUOTATION|REQUISITION|RECEIVING_NOTICE|INSPECTION|SUPPLIER_EVALUATION|CONTRACT|SUPPLIER|NF_ENTRY`.
- `invalid message_type ""` (VSUP0620) — validar contra `PO_CONFIRMATION|ASN|INVOICE`.
- `enterprise, code and supplier are required` (VSUP0120).
- `invalid purchase tolerance` (VSUP0630).
- `third-party service record not found` (VTER0200).
- Demais validações de suprimentos/terceiros que ainda devolvam inglês.

## P2 — identidade automática (empresa/usuário)

Várias rotinas ainda exigem `enterprise_code`/`enterprise_id`/`created_by` no corpo
(VSUP0120, VSUP0660, VPDC0200 e outras). Padronizar:

- Resolver **empresa (tenant)** e **ator** exclusivamente do JWT, como já feito nos
  contratos comerciais e no grupo PDM. Remover `enterprise_code`/`created_by` do corpo
  onde o usuário não deve informar.
- Cobrir: criação de tabela de compra (VSUP0120), parâmetros de fornecedor (VSUP0660),
  pedido de compra (VPDC0200) e demais cadastros de suprimentos que exijam empresa.

## P3 — pedido de compra (VPDC0200 vs VSUP0200 vs VSUP0300)

- **Esclarecer a tela canônica** de pedido de compra e eliminar a ambiguidade: VPDC0200
  hoje é genérica demais (sem itens/fornecedor/dados financeiro-fiscal-almoxarifado), e
  VSUP0200 é o cadastro de pedido. Definir **uma** tela/contrato canônico
  (`/api/purchase-order`) com: capa (fornecedor, empresa, moeda, condição de pagamento,
  datas), itens (item, quantidade, preço, UM, depósito), e vínculo com requisição/cotação.
- **Integração MRP → pedido de compra**: quando o MRP gera sugestão de compra, o pedido
  deve nascer **vinculado ao pedido de venda/ordem de produção** de origem, com rastreio
  item → demanda independente → pedido de compra → recebimento → estoque.
- "Adicionar item" não deve apontar para pedido de venda — separar claramente os contextos
  de venda (VVND0200) e compra (VSUP0200/VPDC0200).
- `GET /api/purchase-order/{code}` deve devolver usuário responsável resolvido (hoje
  "Usuário não localizado").

## P4 — fornecedor (VSUP0500/VSUP0510/VSUP0130)

- **Unificar VSUP0510 em VSUP0500** (remover VSUP0510 do catálogo), incorporando a aba
  "Parâmetros" e demais informações de fornecedor em uma tela única. Documentar a remoção.
- **Bloqueio de fornecedor**: garantir que `PATCH /api/suppliers/{code}/block` funciona
  (auditar tenant e estado) e que a interface consiga bloquear/desbloquear com motivo.
- **Cadastro de apoio com modais**: condições de pagamento, tipo de NF, conta financeira,
  empresa etc. devem ter listagem canônica (`GET /api/customers/support/payment-conditions`,
  `/api/fiscal/...`, `/api/financial/...`) para o modal de busca.
- VSUP0130: remover duplicidade de fornecedor (código do fornecedor aparece duas vezes).

## P5 — conversão de unidades (VSUP0110/0510/VTER0400)

- Avaliar se VTER0400 (conversões globais) é duplicação de VSUP0510/VSUP0110. Se for,
  unificar em uma tela só e remover a redundante.
- Evoluir a conversão de unidades para nível enterprise: múltiplos fatores por item/UM,
  conversão entre UM de estoque × compra × venda, fator por faixa, arredondamento,
  validação de ciclo e integração com a UM do item (VENT0200) e a VSUP0110.

## P6 — alçadas, parâmetros, tolerâncias e EDI (VSUP0610/0620/0630)

- Alçadas: validar `scope` (GLOBAL/SUPPLIER/COST_CENTER/CATEGORY) e `scope_ref` obrigatório
  quando não GLOBAL; mensagens em PT-BR.
- Parâmetros: `domain` contra catálogo e `value_type` (STRING/NUMBER/BOOL/JSON).
- EDI: `message_type` contra `PO_CONFIRMATION|ASN|INVOICE`; validar direção e payload.
- Tolerâncias: corrigir `invalid purchase tolerance` (validar intervalos, tipo, aplicação,
  ação) com mensagem PT-BR; garantir idempotência nas duas operações de cadastro.

## P7 — terceiros (VTER0100/0200/0300)

- `freight_type` FIXED/PERCENT (mensagem PT-BR); `item_code` TextCode (P0).
- `GET /api/third-party-services/orders/{id}` devolver registro ou 404 em PT-BR
  ("registro de serviço terceirizado não encontrado") — não "third-party service record
  not found".
- Ordem de terceiros deve vincular a OF/ordem de origem (PURCHASE REQUISITION CODE →
  "Código da requisição de compra") e integrar com requisição/pedido de compra.

## Requisitos transversais

- Isolamento por `enterprise_code` em todo SELECT/UPDATE/DELETE + teste de dois tenants.
- Ator exclusivamente pelo JWT.
- Erros de domínio em PT-BR, HTTP 400/404/409/422 coerente, código estável.
- Paginação/ordenação determinística; idempotency key nas mutações de pedido/recebimento.
- Auditoria imutável de antes/depois.

## Testes obrigatórios e aceite

- DTO: `item_code` texto em terceiros e tempo por máquina; enums (freight_type, scope,
  domain, value_type, message_type) com mensagens PT-BR.
- Integração: criação de pedido de compra com itens/fornecedor, geração pelo MRP vinculada
  ao pedido de venda, bloqueio de fornecedor, parâmetros/alçadas/EDI/tolerâncias, serviços
  terceirizados (criação, listagem, 404).
- Smoke end-to-end em ambiente publicado: `go test ./...`, linters, migrations.
- Não considerar concluído apenas com 2xx: conferir estado persistido, auditoria e
  isolamento por empresa.

## P8 — ADENDO pós-validação: mensagens de erro em inglês restantes

O `item_code` em máquina/terceiros foi corrigido e os erros específicos (freight_type,
scope, domain, message_type, tolerância, 404 de terceiros) foram traduzidos. Porém a
varredura geral de PT-BR ficou **incompleta**. Restam mensagens em inglês nestes arquivos
(todas alcançam o usuário via `err.Error()` no handler):

- `internal/application/usecase/machine_uc/create_machine.go`: `efficiency_rate must be
  between 0.0 and 1.0`, `capacity must be greater than zero`, `authenticated user is
  required`, `machine type is inactive`.
- `internal/application/usecase/machine_uc/create_type.go` / `update_machine_type.go`:
  `invalid machine type: %s`, `authenticated user is required`.
- `internal/application/usecase/machine_uc/calculate_production_time.go`: `demand_qty must
  be greater than zero`, `invalid item code: %w`, `item %d not found: %w`, `machine %d not
  found: %w`, `error fetching production time config: %w`.
- `internal/application/usecase/machine_uc/create_item_machine_time.go`: `machine %d not
  found: %w`, `invalid configuration — item '%s' uses unit '%s' ...`.
- `internal/domain/purchase_price/entity/entity.go`: `description is required`,
  `currency_code must have 3 characters`, `validity_start must not be after validity_end`,
  `table_id and item_code are required`, `price must be positive`, `invalid price
  adjustment`.
- `internal/application/usecase/procurement_uc/procurement_closeout_uc.go`: `invalid
  scheduled_at`, `invalid status`, `invalid divergence_type`, `invalid resolution`,
  `invalid confirmed_date`, `invalid po_date`, `exchange_rate must be positive`,
  `apportion_basis must be VALUE, WEIGHT or QUANTITY`.
- `internal/application/usecase/procurement_uc/procurement_governance_uc.go`:
  `supplier_code is required`, `contract_number is required`, `invalid period_start/end`,
  `period_end must be on or after period_start`, `invalid status`, `invalid valid_from`.
- `internal/application/usecase/supplier_uc/supplier_uc.go`: `contact name is required`.
- `internal/interfaces/http/handler/supplier_handler.go` (UnblockSupplier/DeleteSupplier):
  `invalid code`.

Solicitação: traduzir TODAS para PT-BR (com código estável), manter os testes verdes e
rodar um grep de `errors.New("|fmt.Errorf("` em `internal/` para zerar mensagens em inglês
destinadas ao usuário antes de considerar a rodada concluída.

## Estratégia de entregaPRs pequenos: (1) item_code texto (terceiros + tempo máquina) + mensagens PT-BR; (2)
empresa/ator automáticos; (3) pedido de compra canônico + integração MRP; (4) fornecedor
unificado + bloqueio; (5) conversão de unidades enterprise; (6) alçadas/parâmetros/EDI/
tolerâncias; (7) terceiros.

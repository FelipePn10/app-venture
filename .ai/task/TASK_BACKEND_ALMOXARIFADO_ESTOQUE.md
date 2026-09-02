# TASK backend — almoxarifado & estoque (VEST0500, VENT0800, VEST0100/0200, VEXP0100, VEST0300, VEXP0110/0120, VEST0400)

## Contexto

Rodada de almoxarifado/estoque. O frontend já foi ajustado nos pontos de interface
(modais pesquisáveis, rótulos PT-BR, remoção de header inútil, operações com nomes
distintos). Abaixo estão as contrapartes **de servidor** e as correções de contrato sem
as quais os erros persistem. Antes de implementar, pesquise como ERPs enterprise (SAP EWM,
Oracle WMS, Dynamics 365, TOTVS e Odoo Inventory) tratam **contagem cíclica**, **inventário
com ajuste**, **máscaras de lote/série** e **expedição/cargas**. Registre decisões em
`docs/dev/decisoes-enterprise-*.md`.

## P0 — contrato de criação de almoxarifado (VENT0800 "invalid request body")

`internal/application/dto/request/create_warehouse.go` (`CreateWarehouseRequestDTO`):

- `Code int json:"code"` — o frontend envia código **texto** (ex.: "ALMOX01"). Migrar para
  `TextCode` (código comercial texto), resolvendo o identificador interno quando necessário.
- `CreatedBy uuid.UUID json:"created_by"` — obrigatório, mas o frontend não envia. Resolver
  exclusivamente do JWT (como já feito nos contratos comerciais/PDM).
- Garantir `location`/`type` aceitarem os enums usados (`INTERNO|EXTERNO|INSPECAO|REJEICAO|
  RESERVA|TRANSITO|ESPECIAL|EXPEDICAO|ASSISTENCIA_TECNICA` e `NORMAL|LINHA DE PRODUÇÃO`) com
  mensagem PT-BR para valor inválido (hoje "invalid request body").
- Adicionar testes de DTO/integração: código texto, numérico temporário, tenant, enum inválido.

## P1 — `item_code` texto nas máscaras de lote e geração

`internal/application/dto/request/lot_mask_request.go` (`LotMaskDTO.ItemCode`, `GenerateLotDTO`)
— confirmar/ajustar para `TextCode`. A tela VEST0300 passou a enviar `application: "SUPRIMENTOS"`
(catálogo válido: `SUPRIMENTOS|PRODUCAO|VENDAS|EXPEDICAO|GERAL`), `part_type`
(`CARACTER|DATA|SEQ_NUMERICA|SEQ_CARACTER`) e `date_format` (ex.: "DDMMYYYY"). Traduzir as
mensagens de validação de lote/série (hoje "Date Format", "Lot Mask Id", "Part Type", etc.) para PT-BR.

## P2 — contagem cíclica (VEST0500) e inventário (VEST0200)

- `VEST0500` usa `warehouse_address_id` ("Endereço") — confirmar que é o endereço físico WMS;
  se houver cadastro de endereços, expor listagem canônica para o modal.
- `VEST0200` "abrir inventário" não funciona: validar `GET /api/inventory/{id}` e
  `GET /api/inventory/{id}/items` (retornam o inventário e as linhas); devolver 404 em PT-BR
  quando inexistente.
- Confirmar que a contagem cíclica da VEST0500 **não duplica** a política definida no cadastro
  do item (VENT0200 → `cyclical_count_config`): a política é do item; a VEST0500 só executa
  ocorrências. Documentar a fronteira e impedir duplicação.

## P3 — saldos e movimentos (VEST0400 / VEST0100)

- `VEST0400` "Saldos do almoxarifado" (`GET /api/stock/balances/warehouse/{warehouseId}`)
  não retorna nada: revisar o handler/repositório para devolver saldos por almoxarifado,
  paginado, com filtro opcional de item/lote.
- Garantir que `GET /api/stock/balances/get` e `movements/warehouse/{id}` funcionem e devolvam
  os campos que o frontend lê (item, depósito, saldo, lote).

## P4 — expedição / cargas (VEXP0110/VEXP0120)

- Traduzir mensagens/status das cargas para PT-BR (hoje "OPEN", "SHIPPED", etc.).
- Expor listagem canônica de cargas, romaneios, caixas de despacho e transportadoras para os
  modais de busca (item/carga/romaneio/caixa). Confirmar que `warehouse_id` das caixas usa o
  catálogo de almoxarifados.

## P5 — mensagens de erro em PT-BR (varredura)

- Traduzir TODAS as mensagens de validação de almoxarifado/estoque/expedição ainda em inglês
  (ex.: "invalid request body" → "corpo da requisição inválido"). Rodar
  `grep -rnE 'errors.New\("|fmt.Errorf\("' internal/ | grep -iE 'must|invalid|required|not found|cannot'`
  para zerar inglês em mensagens de usuário.

## Requisitos transversais

- Isolamento por `enterprise_code` em todo SELECT/UPDATE/DELETE + teste de dois tenants.
- Ator exclusivamente pelo JWT.
- Erros de domínio em PT-BR, HTTP 400/404/409/422 coerente, código estável.
- Idempotency key nas mutações de inventário/ajuste/movimento.
- Auditoria imutável de antes/depois.

## Testes obrigatórios e aceite

- DTO: `code` texto de almoxarifado e `item_code` de lote/série; enums com mensagem PT-BR.
- Integração: criar almoxarifado (código texto), contagem cíclica, inventário (abrir/contar/
  ajustar/fechar), saldos por almoxarifado, máscara de lote (criar/gerar código), cargas.
- Smoke end-to-end em ambiente publicado: `go test ./...`, linters, migrations.
- Não considerar concluído apenas com 2xx: conferir estado persistido, auditoria e isolamento
  por empresa.

## Estratégia de entrega

PRs pequenos: (1) contrato de almoxarifado + item_code lote; (2) inventário/contagem cíclica;
(3) saldos/movimentos; (4) expedição/cargas + catálogos; (5) varredura PT-BR.

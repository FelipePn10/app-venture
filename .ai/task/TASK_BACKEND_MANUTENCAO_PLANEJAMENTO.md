# TASK backend — manutenção, APS, planejamento, MRP e previsão (VMAN*, VAPS0300, VPLN0100, VPLA0102/0300, VMRP0100/0200, VPRE*, VPLC*, VCAL0200)

## Contexto

Rodada de manutenção/APS/planejamento/MRP/previsão. O frontend já foi ajustado nos
pontos de interface (rótulos PT-BR, mensagem de integração de VPRE0301, enums de
manutenção/parada). Abaixo estão as contrapartes **de servidor** e as correções sem as
quais os erros persistem. Antes de implementar, pesquise como ERPs enterprise (SAP PM/PP,
Oracle Maintenance, Dynamics 365, TOTVS e Odoo) tratam **ordens de manutenção**, **paradas
de máquina/APS**, **parâmetros de planejamento** e **previsão × realizado**. Registre
decisões em `docs/dev/decisoes-enterprise-*.md`.

## P0 — mensagens de erro em PT-BR (atuais em inglês)

Traduzir (com código estável) sem quebrar contrato:

- `internal/interfaces/http/handler/aps_handler.go:202` → `from/to must be RFC3339`
  → "os campos 'de' e 'até' devem estar no formato RFC3339 (AAAA-MM-DDTHH:MM:SSZ)".
- `internal/infrastructure/repository/aps/sequencing_configuration.go:185` →
  `downtime not found` → "parada de máquina não encontrada".
- `internal/interfaces/http/handler/shipment_handler.go:289` → `{"status":"removed"}`
  → resposta rica em PT-BR (ex.: "romaneio removido da carga", com romaneio e carga).
- Qualquer `shipment %d not found` → "romaneio X não encontrado" (VPLC0200).
- `no rows in result set` vazado pelo backend (o frontend mapeia, mas o backend não deve
  vazar SQL cru): capturar e devolver `404`/`422` em PT-BR.

## P1 — erros 500 (erro interno do servidor)

- **VMRP0100 "Rodar MRP"** e **"criar regras"** retornam 500: investigar
  `internal/application/usecase/mrp_calculation` (run e configured-rules) e o handler
  `mrp_handler.go`; devolver erro de domínio em PT-BR em vez de `internal server error`.
- **VPLN0100** retorna 500: investigar `planning_uc`/pipeline e os campos de referência
  (plano/ordem) exigidos; validar antes de persistir e devolver 422 em PT-BR com o campo.
- **VMRP0200 pipeline**: a mensagem "referência inválido(a)" vem de violação de FK do
  Postgres. O backend deve validar `plan_code`/`order`/referências **antes** de inserir,
  devolvendo "plano/ordem de referência não encontrado — selecione um cadastro existente"
  em PT-BR.

## P2 — catálogos canônicos para os modais

Expor listagens paginadas e estáveis para os campos que hoje exigem digitação de código:

- Planos de manutenção (`/api/maintenance/plans` ou equivalente) para VMAN0202/VMAN0401.
- Ordens de manutenção (por plano/centro) para VMAN0202/VMAN0401.
- Paradas de máquina (listagem) já existe; garantir filtros `from`/`to` RFC3339 e
  `machine_id` por modal.
- Parâmetros de planejamento (`/api/planning-params/list`) para VPLA0300 — confirmar
  que o "número do parâmetro" é pesquisável.
- Calendário industrial por item/máscara (VCAL0200) — validar ano/mês positivos e
  devolver 422 em PT-BR para negativos.
- Romaneios/cargas (VPLC0200/VPLC0211) para os modais de "adicionar romaneio" etc.

## P3 — previsão × realizado (VPRE0301)

- Confirmar se há (ou criar) endpoint que expõe o **realizado** (pedidos/faturamento) por
  item/ano, para que a coluna "Realizado" de VPRE0301 deixe de ficar vazia. Se não houver,
  documentar o roadmap e manter a mensagem de "não integrado" já em PT-BR.

## Requisitos transversais

- Isolamento por `enterprise_code` em todo SELECT/UPDATE/DELETE + teste de dois tenants.
- Ator exclusivamente pelo JWT.
- Erros de domínio em PT-BR, HTTP 400/404/409/422 coerente, código estável.
- Idempotency key nas mutações (apontamento, pipeline, paradas).
- Auditoria imutável de antes/depois.

## Testes obrigatórios e aceite

- Tradução das mensagens (RFC3339, downtime not found, shipment not found, removed).
- Integração: rodar MRP (sucesso + erro de referência em PT-BR), criar regra, pipeline
  MRP→CRP→APS, parada de máquina (criar/desativar), parâmetro de planejamento, calendário
  (ano/mês inválido), cargas (adicionar/remover romaneio).
- Smoke end-to-end em ambiente publicado: `go test ./...`, linters, migrations.
- Não considerar concluído apenas com 2xx: conferir estado persistido, auditoria e
  isolamento por empresa.

## Estratégia de entrega

PRs pequenos: (1) mensagens PT-BR; (2) erros 500 de MRP/planejamento; (3) catálogos dos
modais; (4) previsão × realizado.

# TASK backend — fechamento de engenharia/cadastros (VCLA0100, VITE0114, VENT0200/0210/0800, VSUP0120/0130/0500, VBOM0100, VMAQ0200, VCUS0100, configurador, restrições)

## Contexto

Rodada de fechamento. O frontend já foi ajustado em parte (VTPS0100 `freight_type`,
modais, VITE0114 código automático/empresa auto, mensagens PT-BR). Abaixo as
contrapartes **de servidor** e correções de contrato restantes. Pesquisar FoccoERP
(help.focco.com.br) e ERPs enterprise (SAP/Oracle/Dynamics/TOTVS/Odoo) para: **configurador
de produto embutido na estrutura de produto**, **restrições/dependências de configuração**
(FENG0116), **fórmulas de quantidade no BOM** (ex.: `2*(COMPRIMENTO/1000)+2*(PROFUNDIDADE/1000)`),
**classificação de itens** e **cadastro de item multi-abas**. Registre em
`docs/dev/decisoes-enterprise-*.md`.

## P0 — contratos que quebram o cadastro

### 1. Classificação de itens (VCLA0100)

- `internal/application/usecase/item_classification_uc/item_classification_uc.go:124` →
  `parent classification not found` → "classificação pai não encontrada" (PT-BR).
- `internal/infrastructure/repository/item_classification/item_classification_repository.go:196`
  → acentuar ("classificação pai não pertence à empresa").
- Investigar o **500 ao abrir uma classificação** (`GET /api/items/classifications/...`):
  nil pointer/erro não tratado deve virar 404/422 em PT-BR. Validar máscara e hierarquia
  (pai → filho) com `enterprise_id`.

### 2. Tabela de preço de compra (VSUP0120)

- `CreatePurchasePriceTableDTO` exige `enterprise_code`/`code`/`supplier_code`. Resolver
  **empresa (tenant)** do JWT e `code` da tabela; devolver 422 em PT-BR apontando o campo
  ausente (hoje "enterprise, code and supplier are required").

### 3. Cabeçalho de estrutura BOM (VBOM0100)

- `CreateBomHeaderDTO`: migrar `ItemCode int64` → `TextCode`; resolver `created_by` do JWT
  (`json:"-"`); aceitar `bom_type` opcional com default `MBOM`; devolver mensagem PT-BR.
- Confirmar os campos que o frontend não envia (versão/status/tipo) e documentá-los para a
  tela exibir/omitir corretamente.

### 4. Conversões por item (VSUP0130)

- "não existe fator de conversão cadastrado para o item — cadastre em Conversões por Item":
  garantir que a criação de item/requisição valide antes e que a listagem retorne os
  vínculos (hoje não salva nem lista sem erro).

## P1 — estrutura de produto (VENT0210)

- Após o `item_code` texto (já migrado), validar: listar componentes (não aparece vazio),
  puxar peso líquido/dados do item, drill-down por duplo clique e remoção persistente.
- **Fórmulas de quantidade**: permitir fórmula por componente (com variáveis do configurador,
  ex.: COMPRIMENTO/PROFUNDIDADE) — coluna/JSON de fórmula avaliada ao gerar a OF.
- Garantir que `GET /api/items/structure/resolve/{code}` devolve os filhos e que o `PUT/DELETE`
  funcionam (ver TASK_BACKEND_ENGENHARIA_MANUFATURA).

## P2 — configurador embutido (não como tela própria)

- Expor as operações do configurador (conjuntos, características, variáveis, regras
  equivalentes, geração de máscara, descrições configuradas) de modo que a **estrutura de
  produto** (VENT0210) as consuma por um **botão**, sem tela própria. Confirmar
  `GET/POST /api/configurator/*` já suportam o fluxo FENG0116 + FENG0210 (configurador →
  restrições/dependências → estrutura com fórmulas).
- **Restrições e dependências**: validar o motor de regras (`/api/restriction`, `/api/configurator/items/*/rules`,
  `equivalent-rules`) para espelhar o FENG0116 (restrições de combinação por característica).

## P3 — cadastro de item (VENT0200)

- Migrar `EngineeringItemBaseCode`/`CommercialPackagingItemCode`/classificações fiscais para
  `TextCode` onde o frontend envia texto; garantir que a tela possa **voltar e continuar** um
  cadastro parcial (GET por código retorna o item salvo em qualquer aba).
- Classificações fiscais venda/compra devem vir de catálogo canônico
  (`/api/fiscal-classifications`).

## P4 — máquina (VMAQ0200) e custo (VCUS0100)

- VMAQ0200: investigar o 500 ao cadastrar máquina (campos esperados vs. enviados; enum de
  capacidade/período; `created_by`). Devolver 422 em PT-BR.
- VCUS0100: confirmar `GET /api/standard-cost/work-centers` devolve todos os centros ativos
  do tenant (para o modal e a divisão em abas).

## P5 — fornecedor (VSUP0500)

- Confirmar que a **consulta de CNPJ** retorna a Inscrição Estadual diretamente (campo IE
  obrigatório exceto transportadora/redespacho); exibir essa regra na tela.
- Bloquear/desbloquear fornecedor deve funcionar (ver TASK_BACKEND_SUPRIMENTOS_COMPRAS P4).

## P7 — produção e APS (engenharia-cinco.md)

- **VPRO0100 × VENT0115/VENT0202 (roteiros)**: confirmar a tela canônica de roteiro
  (`/api/routing`). Se VPRO0100 for duplicação, centralizar em VENT0115 (modelos) e
  VENT0202 (roteiro por item) e remover VPRO0100 do catálogo; documentar a fronteira
  operação → roteiro → OF (MRP/CRP/APS).
- **VPRO0200 (CRP)**: expor listagem de planos MRP para o modal; corrigir o erro de
  exportação vazia (o frontend exporta o resultado).
- **VPRO0210**: endpoint de **Gantt** (ou devolver dados de sequenciamento para o gráfico);
  listagem de ordens de produção e centros para os modais.
- **VPRO0900 (OF)**: investigar o 500 ao criar OF — validar campos obrigatórios (item,
  roteiro/operações, centro) e devolver 422 em PT-BR.
- **VPRO01000 (ferramentas)**: "ficha não abre" e "quantidade sempre zerada" — revisar
  `GET /api/.../{code}` e o saldo/quantidade persistida; "zerar/inativar" sem efeito.
- **VAPS0100**: `resource or tenant configuration not found` → 404/422 em PT-BR; catálogo
  de calendários/recursos para os modais (traduzir `CALENDAR ID`, `LOCATION`).
- **VAPS0400**: `employee not found` / `employee contact not found` → PT-BR; catálogo de
  funcionários/centros de custo.
- **VPRO1100 (parâmetros de estoque)**: traduzir `lot_return_mode must be A, I or E`
  (documentar o significado de A/I/E), `valid item_code, stock_uom and
  inventory_group_type are required`, `warehouse_id and address are required`; migrar
  `item_code` para `TextCode` no controle por item.
- **VAPS0200/0600**: devolver datas já em ISO legível (o frontend formata para pt-BR) e
  catálogo de recursos/ordens/máquinas/centros/operações para os modais.

## P6 — mensagens PT-BR (varredura)- Zerar inglês nas mensagens de usuário de engenharia/cadastros/configurador:
  `grep -rnE 'errors.New\("|fmt.Errorf\("' internal/ | grep -iE 'must|invalid|required|not found|cannot'`.

## Requisitos transversais

- Isolamento por `enterprise_code` + teste de dois tenants; ator só pelo JWT.
- Erros de domínio PT-BR, HTTP 400/404/409/422 coerente, código estável.
- Idempotency key nas mutações; auditoria imutável de antes/depois.

## Testes obrigatórios e aceite

- Classificação (criar pai/filho, abrir, pai inexistente → 422 PT-BR); tabela de preço
  (empresa auto); BOM header (item_code texto, created_by JWT); estrutura com fórmula;
  configurador via estrutura; máquina (cadastro); fornecedor (CNPJ retorna IE).
- Smoke end-to-end em ambiente publicado: `go test ./...`, linters, migrations.
- Não considerar concluído só com 2xx: conferir estado persistido, auditoria e tenant.

## Estratégia de entrega

PRs: (1) classificação/tabela/BOM header; (2) estrutura + fórmulas; (3) configurador embutido
+ restrições; (4) item/classificações fiscais; (5) máquina/custo; (6) fornecedor; (7) PT-BR.


IMPORTANTE:
 quero que verifique Manutenção de Restrições e Dependencias. tentei criar usando como o FoccoERP e aperfeiçoando: https://help.foccoerp.com.br/Programas/FoccoERP/Manufatura/Configurador%20de%20Produto/FENG0116/?h=feng0116

Caso nao esteja pelo o menos igual (claro buscamos sempre sermos melhores) precisamos corrigir (isso inclui um design/estilo parecido mas é claro mantendo nossa identidade visual)

Aqui quero que verifique o Configurador. tentei criar usando como o FoccoERP e aperfeiçoando: https://help.foccoerp.com.br/Processos/Manufatura/configurador-de-produto/?h=configurad e como o configurador ele será bastante usado no Cadastro de estrutura de produtos: https://help.foccoerp.com.br/Programas/FoccoERP/Manufatura/Engenharia/Estrutura%20de%20Produto/FENG0210/?h=feng0210

Caso nao esteja pelo o menos igual (claro buscamos sempre sermos melhores) precisamos corrigir (isso inclui um design/estilo parecido mas é claro mantendo nossa identidade visual)

E também no cadastro de estrutura de produtos poderemos usar fórmulas para gerar a quantidade de algumas matérias primas e relacionados, veja um exemplo: 2*(COMPRIMENTO/1000)+2*(PROFUNDIDADE/1000). Veja como usei as "perguntas" na formula do item etc.

Outras partes que deve entrar na validação: Consulta de Estrutura:
https://help.foccoerp.com.br/Programas/FoccoERP/Manufatura/Engenharia/Consultas/CENG0401/?h=ceng0401 

* CONFIGURADOR NÃO DEVE TER UMA TELA  PROPRIA, DEVE SER UM BOTÃO QUE FICARÁ DENTRO DO CADASTRO DE ESTRUTUA DE PRODUTOS, ASSIM COMO NO FOCCOERP, VEJA TODOS OS LINKS E PESQUISE AS PARTES DO FOCCO NO HELP.FOCCO.COM.BR PARA TIRAR DÚVIDAS!

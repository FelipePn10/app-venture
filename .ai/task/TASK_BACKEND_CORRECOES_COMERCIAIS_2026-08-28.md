# TASK backend — confiabilidade e evolução enterprise do ciclo comercial

## Objetivo

Eliminar definitivamente as falhas observadas nas rotinas VCST0202, VVND0100, VVND0200, VVND0300, VVND0400, VSAC0100, VEXR0100, VRES0100, VVND0600, VVND0610, VREP0600, VPDV0253, VPDV0108, VPDV0111, VVRE0200 e VGAR0211. A solução deve preservar isolamento por empresa, regras de domínio no servidor, auditoria pelo usuário do JWT, mensagens em português e compatibilidade com os clientes publicados.

Antes de implementar, pesquise práticas atuais de ERPs enterprise (SAP S/4HANA, Oracle Fusion Cloud ERP, Microsoft Dynamics 365, TOTVS e Odoo) para precificação, comissões, recorrências, promessa/reprogramação de entrega, workflow comercial, garantia e rastreabilidade. Registre as decisões aplicáveis ao VentureERP; não copie complexidade sem benefício operacional. A meta é oferecer um fluxo mais claro, automatizado, auditável e capaz que as alternativas de mercado.

## P0 — contratos e erros atuais

1. Precificação (VCST0202/VVND0200/VVND0300)
   - Aceitar `item_code` e `item_codes` no tipo canônico texto em criação de preço, formação, geração em lote e políticas específicas. Manter compatibilidade temporária com JSON numérico, convertendo-o na borda e emitindo telemetria de depreciação, sem devolver erro de unmarshal ao usuário.
   - Na inclusão de preço, resolver `sales_table_code` dentro do tenant; validar item existente, vigência, unidade, conversão, preço positivo e duplicidade. Retornar 422 com erros por campo, em português.
   - Disponibilizar resolução canônica de tabelas vigentes por item e contexto (cliente, quantidade, unidade, moeda e data). Orçamentos com vários itens devem admitir tabela por linha; não manter uma tabela duplicada/enganosa na capa.
   - O preço aplicado, descontos, impostos, margem e comissão devem ser calculados no backend, com origem da regra e justificativa para qualquer override autorizado.

2. Divisões de venda (VVND0100)
   - Corrigir reativação/desativação por código e empresa. Diferenciar 404 real, 403 e conflito por vínculo.
   - Exclusão física só para divisão nunca usada; para divisão referenciada, retornar 409 em português e orientar a desativação. Garantir auditoria e teste de tenant.

3. Pedidos, relatórios e filtros (VVND0200/VPDV0253/VRES0100/VVND0600)
   - Validar `reference_date` em ISO e devolver mensagem de campo; se o problema for item sem preço, retornar erro específico, sem atribuí-lo à data.
   - Consultas devem permitir cliente opcional por código, paginação e busca por nome/documento, além de todos os clientes ativos do tenant.
   - Relatórios devem aceitar escopo geral ou filtros por cliente, item, representante, situação e período. A resposta de listagem deve conter todas as linhas, não somente a página visível, ou existir endpoint assíncrono de relatório.
   - Ações de análise, atendimento, conferência e atraso devem rejeitar situação/ação vazias. Criar consultas consistentes dos pedidos analisados, atendidos, conferidos, atrasados e faturados.

4. Orçamento e comissão (VVND0300)
   - Resolver automaticamente a tabela por linha de item. Se houver mais de uma candidata, devolver candidatos, prioridade e motivo da escolha.
   - Obter a comissão do vínculo vigente entre representante, empresa, tipo/plano/segmento e política. O usuário comum não altera o percentual; exceção exige permissão, motivo e auditoria.
   - Persistir eventos transacionais para inclusão, alteração, cancelamento e restauração de item, mudança comercial e conversão. O histórico deve trazer antes/depois, ator, horário e correlação.
   - Contabilizar comissão como passivo/custo comercial no evento de competência definido (faturamento, recebimento ou rateio configurável), com estorno em cancelamento/devolução e conciliação até o pagamento. Não somar comissão novamente ao preço se ela já estiver embutida na formação.

5. Representantes (VVND0400/VREP0600)
   - Usar efetivamente `type_code` no cadastro e nas regras: elegibilidade, faturamento direto, comissão, território/carteira e relatórios.
   - O detalhe deve devolver todos os segmentos, planos, interesses, empresas, contatos e endereços do representante, inclusive coleções vazias. Listagens devem suportar filtro individual.
   - Expor catálogo canônico de classificações de item para interesses; validar todos os vínculos e o tenant.

6. SAC, garantia e entrega (VSAC0100/VEXR0100/VGAR0211)
   - Traduzir situações na API ou fornecer catálogo estável; `DISCONTINUED_ORDER` deve ter apresentação em português sem perder o código técnico.
   - Reprogramação deve ter prévia por linha com saldo aberto, reservas, ATP/CTP, MRP, CRP, APS, compras/produção, expedição e fiscal. Sugerir data e explicar os fatores usados.
   - Gravar lote selecionado de modo atômico e idempotente, bloquear linhas já faturadas e recalcular promessas/demandas afetadas.
   - Em operações com anexo, oferecer pesquisa dos anexos do chamado e upload/download autenticados. Nunca confiar em caminho local informado pelo desktop.
   - Evoluir VGAR0211 para um caso de devolução/RMA ligado ao chamado: elegibilidade, motivo, itens/serial/lote, evidências, autorização, logística reversa, inspeção, destino (reparo/troca/crédito/sucata), SLA, custos e rastreabilidade fiscal/estoque.

7. Recorrências e reajustes (VVRE0200/VVND0610)
   - Implementar cancelamento com máquina de estados, motivo obrigatório, data efetiva, política sobre pedidos futuros e auditoria; devolver `allowed_actions`.
   - Na criação, suportar vigência, frequência/calendário, itens, preços/tabelas por linha, reajuste (índice, periodicidade, teto/piso), cobrança, entrega, impostos, representante, centro de custo, renovação, suspensão e término.
   - A prévia de reajuste deve exibir valor anterior/novo, índice ou percentual, base legal/contratual, vigência, impacto por item e total. O motivo não deve existir duplicado em dois campos sem semânticas diferentes.
   - Geração de pedido e reajuste devem ser idempotentes; impedir duplicidade por competência.

8. Políticas comerciais (VPDV0108/VPDV0111)
   - Manter PUT por código para atualização integral e devolver a política persistida.
   - Validar item e máscara por consultas canônicas. Máscaras devem ser pesquisáveis por item e descrição; combinações inexistentes retornam 422 em português.
   - Garantir precedência, vigência, empilhamento, aprovação, simulação explicável e histórico de versões das políticas.

## Relatórios e dados da empresa

Todos os relatórios citados devem obter razão social, nome fantasia, CNPJ/CPF, inscrição estadual, endereço, telefone, e-mail e logomarca da empresa autenticada, sem confiar em valores enviados pelo frontend. Corrigir cabeçalhos em VSAC0100, VEXR0100, VVND0400, VVND0600, VREP0600 e VPDV0253. Aplicar o mesmo gerador corporativo a PDF, XLSX, DOCX e CSV quando pertinente. Relatório individual e geral devem produzir o mesmo conjunto de filtros e totais.

## Requisitos transversais

- Isolamento por `enterprise_code` em todo SELECT/UPDATE/DELETE e teste cruzado entre dois tenants.
- Ator exclusivamente pelo JWT; ignorar/rejeitar `created_by` e equivalentes no corpo.
- Erros de domínio em português, com HTTP 400/404/409/422 coerente e código estável legível pelo cliente.
- Paginação, ordenação determinística, limites e índices para consultas grandes.
- Idempotency key nas mutações que geram pedidos, reprogramações, reajustes ou lançamentos.
- Outbox/eventos para integrações e auditoria imutável de antes/depois.
- Métricas de erro, latência e volume por operação, sem dados pessoais nos logs.

## Testes obrigatórios e aceite

- Testes de DTO cobrindo `item_code` texto, compatibilidade numérica temporária, lista de itens e mensagens inválidas.
- Integração autenticada para cada fluxo acima, incluindo sucesso, registro inexistente, vínculo, permissão e dois tenants.
- Testes transacionais e de concorrência para preço, conversão, comissão, reprogramação, recorrência e histórico.
- Relatórios geral/individual com empresa preenchida e filtros; arquivo deve abrir e conter ao menos uma linha conhecida.
- Smoke end-to-end: cadastrar preço, resolver tabela, criar orçamento multi-item, confirmar histórico/comissão, converter em pedido, analisar/atender, reprogramar saldo, exportar e cancelar recorrência.
- `go test ./...`, linters e verificação de migrations devem passar. Documentar contratos em `docs/dev`, atualizar a coleção de API e anexar evidências dos smokes.
- Não considerar concluído apenas porque o endpoint retorna 2xx: conferir estado persistido, evento/auditoria, isolamento por empresa e resposta apresentada ao usuário.

## Estratégia de entrega

Dividir em PRs pequenos: (1) contratos/erros P0; (2) relatórios/empresa; (3) orçamento, comissão e histórico; (4) workflow/consultas; (5) recorrência/reajuste; (6) entrega/RMA enterprise. Manter compatibilidade durante a transição, publicar backend antes das telas que dependem de contrato novo e incluir plano de rollback por PR.

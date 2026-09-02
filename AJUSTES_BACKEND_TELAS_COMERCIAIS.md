# Ajustes e validação do backend — telas comerciais

Data da auditoria: 25/08/2026.

## Estado da integração em 27/08/2026

As entregas mais recentes do backend foram incorporadas ao frontend: resolução canônica de tabela/preço por item, preço autoritativo em pedidos e orçamentos, eventos transacionais dos itens, ativação/desativação de divisões, anexos reais do SAC, consulta de centros de trabalho, manutenção dos apoios do orçamento e reprogramação integrada em lote. As seções históricas abaixo permanecem como registro dos contratos solicitados e entregues.

## Representante bloqueado — validação obrigatória no backend (27/08/2026)

O frontend remove representantes inativos ou bloqueados dos seletores de novos pedidos, orçamentos, metas e recorrências. Essa proteção de interface não é suficiente para integrações ou requisições diretas.

Solicitação:

- rejeitar no backend qualquer nova operação comercial que informe um representante com `blocked = true` ou `is_active = false`;
- aplicar a validação, no mínimo, em pedidos, orçamentos, metas de vendas, vendas recorrentes, promessa de entrega e demais vínculos comerciais que aceitem `representative_code`;
- manter leitura e relatórios históricos funcionando para documentos já existentes;
- retornar HTTP 422/409 com mensagem em português informando que o representante está bloqueado ou inativo;
- validar empresa/tenant em todas as consultas do representante;
- corrigir `Repository.Block` e `Repository.Unblock` para incluir a empresa autenticada no `UPDATE`; atualmente ambos filtram somente por `code`, o que permite atingir registro homônimo de outro tenant;
- incluir testes para criação, alteração, conversão de orçamento, geração recorrente e tentativa por integração direta;
- centralizar a regra em um resolvedor/use case compartilhado, evitando validações divergentes entre módulos.

Também é recomendável que `AddConsumerServiceCallReturnDTO.created_by` deixe de ser aceito no corpo e passe a ser obtido exclusivamente do JWT, como já ocorre nos anexos do SAC e nas demais rotinas comerciais corrigidas.

## Exclusão e restauração dos apoios do orçamento (27/08/2026)

A VVND0310 possui apenas `GET/POST` para padrões de comissão e motivos de cancelamento e `GET/PUT` para o parâmetro único da empresa. Não existe contrato para remover/desativar esses registros.

Solicitação:

- disponibilizar exclusão ou, preferencialmente, ativação/desativação de padrões de comissão e motivos de cancelamento, preservando históricos já referenciados;
- para parâmetros, disponibilizar uma operação explícita de restauração dos padrões da empresa (por exemplo `DELETE /api/sales-quotation/parameters` com semântica documentada de reset), pois o registro é único por empresa e não deve simplesmente desaparecer;
- impedir desativação de motivo exigido por documento ainda cancelado/descancelável, ou preservar a leitura histórica mesmo inativo;
- restringir manutenção a `ADMIN`, respeitar tenant e retornar mensagens em português;
- incluir testes para registro livre, registro referenciado, tenant e restauração dos parâmetros.

## Planejamento integrado da reprogramação de entrega (27/08/2026)

O frontend já carrega automaticamente todos os itens com saldo do pedido, permite selecionar apenas as linhas afetadas e registra a data atual de cada linha como origem. O backend atual, porém, oferece apenas `POST /api/delivery-reschedule/create`, uma linha por chamada, sem prévia nem transação de lote e sem explicar sinais de MRP/CRP/APS/faturamento.

Solicitação:

- criar uma consulta canônica de prévia por pedido que devolva cada item, saldo aberto, datas atual/firme, reservas, demanda independente, OF/OC planejada ou firme, capacidade CRP, sequenciamento APS, expedição e notas já emitidas;
- devolver sugestões por item com nova data, severidade, origem (`MRP`, `CRP`, `APS`, `ATP`, `FISCAL` etc.) e justificativa em português;
- distinguir sugestão de alerta: item já atendido/faturado não pode ser reprogramado; item parcialmente atendido deve considerar apenas o saldo;
- criar operação canônica em lote, atômica e idempotente, recebendo somente os itens selecionados e respectivos motivos/datas;
- recalcular demanda, reserva/promessa, necessidades MRP e impactos de capacidade somente para os saldos afetados;
- não alterar automaticamente documentos fiscais autorizados; devolver bloqueio e orientação operacional;
- registrar auditoria, ator do JWT e histórico anterior/novo por linha;
- testar pedido com múltiplos itens, seleção parcial, atendimento parcial, reserva, OF/OC, sobrecarga CRP, APS, nota fiscal e rollback integral.

Contrato entregue na migration 319 e integrado ao frontend em 27/08/2026. A VEXR0100 usa a prévia por pedido, identifica cada linha por `sales_order_item_code` e envia somente a seleção do usuário em uma operação atômica e idempotente.

## Validação do ambiente demo em 27/08/2026

Um smoke autenticado contra `http://127.0.0.1:5072` criou uma divisão temporária com HTTP 201 e a excluiu com HTTP 204. Entretanto, tanto a desativação quanto a reativação em `PATCH /api/sales-division/{code}/status` retornaram HTTP 404. A divisão temporária foi removida ao final.

Esse diagnóstico foi superado pela reconstrução informada em 27/08/2026: Demo e Training estão na migration 319 com a imagem atualizada. A interface permanece alinhada à rota canônica de situação.

O frontend foi alinhado às rotas presentes no worktree `panossoerp-ajustes`, branch `fix/ajustes-operacionais`. Os testes do router confirmam que os handlers canônicos já existem e que os aliases antigos permanecem ausentes. Portanto, se um ambiente responder `404 page not found`, a causa é backend publicado desatualizado, e não falta de implementação nessa branch. Não criar aliases nem duplicar handlers.

## Rotas que precisam estar disponíveis no ambiente

- Pedidos: `/api/sales-order/list`, `/api/sales-order/items/{code}`, `/api/sales-order/status/{status}` e ações `analyze`, `attend`, `conference` e `delay-reason`.
- Reprogramação: `/api/delivery-reschedule/create` e `/api/delivery-reschedule/list/{sales_order_code}` (singular).
- Parâmetros e orçamento: grupo `/api/sales-quotation`, incluindo parâmetros, motivos, itens, eventos, anexos e conversão.
- Representantes e metas: grupos `/api/representatives` e `/api/sales-goals`.
- SAC e garantia: grupo `/api/consumer-service`, incluindo consumidores, chamados, retornos e cadastros de apoio.
- Promessa de entrega: `/api/delivery-promise/occupation`, reservas e reprogramação.
- Recorrências: grupo `/api/recurring-sales`, incluindo listagem, criação e recálculo de reajuste.
- Tabelas e políticas comerciais: `/api/customers/support/sales-tables`, `/sales-price-policies` e `/commercial-policies`.

## Contratos que exigem atenção

- `CreateDeliveryRescheduleDTO.item_code` é `valueobject.ItemCode` e recebe JSON numérico. O frontend agora envia número; manter teste de contrato para rejeitar regressões.
- A criação de preço aceita `sales_table_code` e resolve internamente o ID da tabela. O frontend agora envia esse campo também no corpo da inclusão.
- Não existe endpoint `/api/sales-order/invoiced`: faturados são consultados por `/api/sales-order/status/F`.
- Não existe `/api/sales-order/{code}/items`: a consulta canônica é `/api/sales-order/items/{code}`.

### Reprogramação corrigida no backend em 26/08/2026

O código e o usuário responsável passaram a ser definidos no backend. O frontend não envia mais `created_by` na reprogramação individual, reserva de tanque ou reprogramação em lote.

## Validação já concluída no backend

- Testes focados de router, DTO, use case e handlers passaram.
- `go test ./...` e `git diff --check` passaram.
- Smoke sem autenticação alcançou a camada de autenticação com HTTP 401, sem 404.
- `item_code` numérico é aceito e texto é rejeitado com mensagem em português.
- `sales_table_code` resolve internamente o ID da tabela.
- Nenhuma migration, código gerado, alias ou handler duplicado foi criado.

Permanece necessário executar smoke autenticado contra uma API construída dessa branch e um banco isolado criado pela linha correta de migrations.

## Varredura ampliada do restante do ERP

Os testes ampliados do router confirmaram também:

- notificações: eventos, configurações, inscrições, destinatários, teste de e-mail, alertas e reenvio;
- inventário rotativo: listagem, criação e transições de contagem;
- ordens de produção: apontamento, consumo e scanner;
- fornecedores/inspeção: pesquisa de item-fornecedor e relatórios de qualidade;
- calendário industrial: geração de calendário.

Após ajustar o auditor para reconhecer sub-routers montados por `Routes()`, a verificação do frontend contra `panossoerp-ajustes` encontrou **zero rotas fantasmas**, **zero campos ausentes** e **zero endpoints sem cobertura reconhecida**. Endpoints novos de corte permanecem fora do escopo.

## Situação dos ambientes e migrations

- A API na porta 5070 e os bancos nas migrations 232/240 estão atrás do worktree.
- A porta 5073 responde a `/api/version`, mas ainda exige smoke autenticado da branch correta.
- O banco de treinamento está na migration 315, porém possui uma linha divergente nas migrations 243–282 e não deve validar nem receber esta branch.
- A linha deste worktree é `240 → 241 → 242 → 283...315`. Não aplicar diretamente sobre bancos compartilhados ou sobre o treinamento divergente.

Publicar a imagem sobre banco 232/240 sem executar previamente a linha correta de migrations pode quebrar calendário, scanner, inspeção, notificações e inventário.
# Complementos encontrados na validação de 25/08/2026

## Conversão de orçamento (VVND0300) — resolvida

O `ConvertUseCase` e a unidade transacional foram corrigidos. A conversão autenticada retorna HTTP 201 e cria pedido, itens, evento e outbox na mesma transação. O frontend chama a rota canônica sem enviar `created_by`.

## Pastas do representante (VVND0400/VREP0600) — resolvida

O detalhe `GET /api/representatives/{code}` agora devolve todas as coleções, inclusive vazias. A rota `GET /api/representatives/sales-plans` fornece os códigos configurados. O frontend passou a exibir empresas, telefones e e-mails persistidos e usa a nova consulta no seletor de planos.

## Identidade em rotinas comerciais

Reserva, reprogramação e conversão agora resolvem a identidade exclusivamente pelo contexto autenticado. Os respectivos DTOs não expõem `created_by`.

# Pendências confirmadas na validação de 26/08/2026

## Classificações de item para interesses de representante

O contrato de `POST /api/representatives/interests` exige `item_classification_code` numérico, mas não existe uma consulta global, por empresa, que forneça as classificações válidas para preencher esse vínculo. As rotas atuais de máscaras exigem que o cliente já conheça a máscara ou o identificador.

Solicitação: disponibilizar uma rota canônica somente de consulta que devolva, no mínimo, o identificador numérico, código/máscara e descrição da classificação, respeitando empresa e registros ativos. Proteger com teste de contrato e isolamento por empresa. O frontend já impede que o campo seja confundido com o código textual de um item.

## Identidade nas rotinas de assistência técnica

Os DTOs `AddTechnicalAssistanceReturnNoteDTO`, `GenerateTechnicalAssistanceOrdersDTO` e `UpdateTechnicalAssistanceCallStatusDTO` ainda expõem `created_by`, enquanto os contratos comerciais corrigidos obtêm o ator pelo JWT.

Solicitação: retirar `created_by` desses corpos, resolver a identidade pelo contexto autenticado e acrescentar testes que comprovem que um identificador forjado no corpo é ignorado/rejeitado. Mensagens de validação destinadas ao usuário devem permanecer em português.

## Geração de pedido/ordem de assistência

Validar com teste de integração os fluxos `POST /api/technical-assistance/calls/{code}/return-notes` e `POST /api/technical-assistance/calls/{code}/generate-orders`, incluindo os estados e motivos de defeito que permitem cada ação. O retorno deve distinguir pré-condição não atendida de falha interna e explicar em português quais dados estão faltando (divisão, tabela de preço, condição de pagamento ou almoxarifado).

## Exclusão de divisão de vendas — pendência de 26/08/2026

A rota `DELETE /api/sales-division/{code}` aceita os papéis `ADMIN` e `USER`, mas o use case executa uma segunda autorização por `CanDeleteSalesDivision`. Validar o comportamento porque a exclusão continua sendo recusada no ambiente atualizado.

Critérios solicitados:

- alinhar a autorização do router e do use case, documentando qual papel pode excluir;
- quando a divisão estiver vinculada, retornar HTTP 409/422 com mensagem em português, sem expor constraint SQL;
- quando faltar permissão, retornar HTTP 403 com mensagem em português;
- adicionar testes para exclusão livre, divisão vinculada e usuário sem permissão.

## Upload real de anexos do SAC e garantia — pendência de 26/08/2026

O endpoint `POST /api/consumer-service/calls/{code}/attachments` aceita somente JSON com `file_name`, `file_path` e `content_type`. Ele registra metadados, mas não recebe nem armazena o conteúdo do arquivo; por isso o frontend não consegue oferecer um upload verdadeiro sem inventar um caminho como `/documentos/evidencia.pdf`.

Solicitação:

- aceitar upload multipart na rota canônica, ou disponibilizar uma rota canônica de upload que devolva o identificador persistido;
- armazenar o conteúdo em mecanismo definido pelo backend e nunca confiar em caminho local enviado pelo desktop;
- validar tamanho, tipo permitido, nome seguro, tenant e autorização do chamado;
- devolver ID, nome original, tipo, tamanho e rota autenticada de download;
- criar rota autenticada para download e, se permitido, exclusão;
- obter autoria exclusivamente do JWT;
- incluir testes de upload, download, arquivo inválido, isolamento por empresa e chamado inexistente.

## Consulta de centros de trabalho — pendência de 26/08/2026

A configuração de custo/hora da VCUS0100 possui somente `GET /api/standard-cost/work-center-costs`, que lista centros que já receberam um custo. Não há uma consulta canônica dos centros de trabalho cadastrados; por isso o frontend não consegue mostrar todos os centros disponíveis sem inventar dados ou confundir esse cadastro com o custo já configurado.

Solicitação:

- disponibilizar uma rota canônica de consulta dos centros de trabalho ativos, limitada à empresa autenticada;
- devolver ao menos identificador, código, nome/descrição e situação;
- permitir pesquisa por código e descrição, mantendo paginação compatível com os demais cadastros;
- proteger o contrato e o isolamento por empresa com testes.

Enquanto essa rota não existir, a VCUS0100 lista no seletor os centros que já aparecem em `work-center-costs` e continua aceitando a escolha do respectivo código.

# Melhorias comerciais identificadas em 26/08/2026

## Precificação autoritativa de pedidos e orçamentos

O pedido e o orçamento possuem `price_table_code`, mas a inclusão do item ainda aceita `unit_price` livre e o use case de pedido apenas persiste esse valor. O frontend passou a consultar a tabela selecionada para preencher o preço, porém essa regra precisa ser garantida no servidor para integrações, importações e clientes antigos não criarem pedidos com preço divergente.

Solicitação:

- ao incluir ou alterar item de pedido/orçamento, resolver o preço vigente pela tabela da capa ou da linha;
- considerar cliente, quantidade, unidade, vigência, bloqueio do preço, moeda, máscara, política e formação configurada;
- devolver preço base, preço aplicado e origem da regra, permitindo alteração manual somente mediante permissão explícita e registrando a justificativa;
- retornar erro de negócio em português quando não houver preço válido;
- recalcular impostos, descontos, totais e comissões no backend;
- cobrir alteração de tabela, alteração de quantidade, item sem preço, preço promocional, vigência e concorrência com testes.

Isso torna a precificação consistente em qualquer canal e reduz erro operacional na digitação.

## Edição dos cadastros de apoio de clientes

Hoje apenas regiões possuem atualização genérica e tabelas de venda possuem uma rota própria com código. Segmentos, tipos de contato, tipos de cliente, portadores, grupos e condições de pagamento expõem criação/listagem, mas não atualização. A interface não deve oferecer um botão de edição que inevitavelmente falha.

Solicitação: criar rotas canônicas de atualização para os cadastros de apoio que sejam efetivamente editáveis, com código no caminho ou um contrato uniforme, validação em português, auditoria e testes de tenant. Para cadastros históricos que não possam ser alterados, documentar essa imutabilidade e oferecer ativação/desativação.

## Relatório individual do cliente

A exportação atual gera somente a lista completa de clientes. Disponibilizar relatório individual autenticado, por código do cliente, incluindo dados cadastrais, estabelecimentos, endereços, contatos e condições comerciais, com saída PDF e isolamento por empresa. Isso permite emitir uma ficha cadastral sem filtrar manualmente a exportação geral.

## Fluxo empresarial de vendas recorrentes

Recomendações adicionais:

- validar o representante principal já na criação, com mensagem em português;
- devolver no detalhe quais pré-condições faltam para gerar pedido;
- expor ações permitidas no estado atual (`can_generate_order`, `can_cancel`, `can_adjust`) para a tela não oferecer operações inválidas;
- tornar criação da recorrência, representantes e geração do primeiro pedido transacionais ou oferecer idempotência explícita;
- traduzir as validações residuais de recorrência destinadas ao usuário.

## Histórico de alterações dos itens do orçamento — concluído e integrado em 27/08/2026

Os use cases `sales_quotation_uc.CreateItem` e `UpdateItem` recalculam preço e totais, mas não gravam eventos em `sales_quotation_events`. Por isso a aba Histórico da VVND0300 permanece vazia quando um item é incluído ou alterado, embora a alteração tenha sido persistida.

Solicitação:

- gravar evento transacional na inclusão, alteração e cancelamento de item;
- registrar usuário do JWT, item, sequência, campos anteriores e novos, tabela de preço, preço aplicado e origem da precificação;
- não aceitar `created_by` enviado pelo cliente;
- garantir que a alteração do item e o evento sejam atômicos;
- incluir testes para inclusão, alteração de quantidade/preço calculado, cancelamento e rollback.

## Desativação de divisão de vendas vinculada — concluída e integrada em 27/08/2026

A exclusão física deve continuar recusando divisões vinculadas. Para permitir manutenção sem quebrar pedidos e orçamentos históricos, disponibilizar uma operação canônica de ativação/desativação. Divisões inativas devem permanecer nos registros históricos, mas não aparecer em seletores de novos documentos. A operação deve ser restrita ao perfil definido pelo backend, auditada e coberta por testes de tenant.

## Resolução automática de tabela por item — concluída e integrada em 27/08/2026

O backend valida corretamente uma combinação conhecida de `table_code + item_code`, mas não oferece uma consulta para descobrir em quais tabelas ativas e vigentes determinado item possui preço. Isso impede uma seleção automática eficiente quando cada linha do mesmo pedido/orçamento pode utilizar uma tabela diferente.

Solicitação:

- criar uma rota canônica de resolução por item, cliente, quantidade, unidade, moeda e data de referência;
- devolver somente tabelas ativas/vigentes com preço ativo e desbloqueado, incluindo código/descrição da tabela, preço aplicado, unidade e origem;
- aplicar uma prioridade determinística: vínculo específico do cliente, política comercial, tabela padrão e demais candidatas;
- quando houver uma única opção válida, informar a seleção automática; quando houver empate sem regra de prioridade, devolver as candidatas para decisão explícita;
- permitir que a capa tenha uma tabela preferencial, mas persistir e validar a tabela efetivamente usada em cada linha;
- impedir confirmação de pedido/orçamento caso alguma linha não possua preço válido;
- incluir testes de item ausente, múltiplas tabelas, vigência, bloqueio, cliente, quantidade, unidade, tenant e concorrência.

O frontend usa agora `GET /api/customers/support/sales-tables/resolve-by-item` em uma única chamada, respeita a seleção prioritária do servidor e persiste a tabela efetivamente escolhida em cada linha. A combinação é revalidada imediatamente antes da inclusão; não há mais descoberta N+1 nem preço livre na interface.

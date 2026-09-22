# Validação ampliada de manufatura — 22/09/2026

**Resultado: os cenários automatizados executados passaram, sem falhas restantes na suíte global.** Foram 1.401 testes/subtestes aprovados e três integrações externas ignoradas. A rodada adicional com detector de corridas passou em 24 execuções. Isso sustenta o fluxo testado; não certifica ausência de bugs em todo o ERP nem equivalência integral a SAP, Focco ou Oracle.

## Escopo e método

Validação local no PostgreSQL descartável `venture_routing_20260920`, migrado até 360. Foram exercitados engenharia, configurador, custos, MRP, CRP, APS, produção, estoque, compras, terceiros e isolamento. Os testes HTTP usam servidor real em memória, handlers, casos de uso e PostgreSQL; somente a identidade da sessão é fornecida pela fixture. A simulação de navegador usa respostas HTTP isoladas. Não houve teste único navegador → API real → banco de todo o processo.

Nenhum commit, push, release ou alteração da branch develop. Escritas de backend exclusivamente no worktree `panossoerp-ajustes`. Nenhuma alteração nos ambientes remotos. O banco descartável pode conter resíduos de testes e não deve ser usado para negócio.

## Correções e critérios de aceite

| Controle | Alteração e evidência |
|---|---|
| Telas e referências | VCUS0100 possui cinco abas com campos preservados. VSUP0110 usa unidades válidas em seletores. O centro de trabalho envia ID interno 8, embora o código público seja 9. Navegador validou os payloads das abas 2 e 5 da VENT0202. |
| Tutorial RN 01001 | A seção 5.5 do HTML/PDF distingue as 15 operações da biblioteca aplicadas a componentes e montagem das etapas da montagem final. |
| MRP → CRP → APS → OF | Corrigida a gravação de horários antes da alocação pai. O teste integrado verifica reservas, ausência de sobreposição, continuação no próximo dia, tempos na OF e rollback do replanejamento sem calendário. |
| Criação atômica | OF, materiais, etapas, inspeções e programação de máquinas participam da mesma transação na criação pela API. Falha injetada após inserir etapas não deixa OF parcial. |
| Liberação planejada | Situação da planejada, OF e serviços/requisição compartilham transação. Inspeção obrigatória sem plano desfaz a liberação. 24 liberações concorrentes geraram uma OF e uma etapa. Todas as consultas internas usam a conexão transacional para evitar esgotamento do pool. |
| Numeração concorrente | A reserva do número da OF por empresa substitui MAX+1 sem bloqueio. 24 solicitações concorrentes retornaram 24 números distintos. Erros do banco são propagados. |
| Dependências estáveis | A OF recebe cópia das predecessoras. O teste remove a rede de engenharia após a geração e confirma que a OF preserva o controle de caminhos paralelos e junção. |
| Ciclo de execução | Início, pausa, interrupção, retomada, conclusão e dispensa têm transições validadas. Motivo obrigatório quando aplicável; etapa só inicia com predecessoras concluídas/dispensadas. Concluir libera a sucessora, sem iniciar máquina automaticamente. |
| Histórico | Eventos persistidos com autor, horário, estado e fonte OPERATION/SCANNER na mesma transação. UPDATE/DELETE desses eventos são rejeitados. Lista da API e tela exibem histórico. Escritas legadas sem identidade não recebem autor fictício. |
| Ferramentas e concorrência | 24 conclusões simultâneas deixam uma conclusão e um débito de ferramenta. |
| Qualidade e entrega | Inspeção obrigatória é criada com usuário válido. Resultado pendente/rejeitado bloqueia entrega final; pedidos de serviço pendentes também bloqueiam. Etapa final do scanner orienta a entrega explícita do acabado. |
| Estoque e repetição | Fluxo HTTP reconciliou componente 30−6=24 e acabado 0+2=2. Repetir a entrega não duplica estoque. Reutilizar a chave com outra quantidade ou finalidade retorna 422. Validação também compara ordem, almoxarifado e lote. |
| Ordem encerrada | Entrega não reabre ordem concluída/cancelada; de 24 entregas finais simultâneas, somente uma é aceita. |
| Regressões anteriores | As 27 falhas da rodada anterior foram resolvidas com fixtures válidas: empresa, usuário, referências, enums, parâmetro 45 e middleware real de código de item. Não foram removidas validações do produto. |

## Resultados executados

| Verificação | Resultado |
|---|---|
| `go test -tags=integration -p 1 ./internal/... ./api -count=1 -json` | 1.401 testes/subtestes aprovados, zero falhas, três ignorados. Inclui unitários e integrações, não apenas fluxos ponta a ponta. |
| Oito cenários críticos com `-race -count=3` | 24 execuções aprovadas; sem alerta do detector. Inclui o novo teste exclusivo de numeração concorrente, incluído também na regressão anterior à release. |
| `go vet ./...` e `go test ./...` | Aprovados. |
| Migrações 358, 359, 360 | Aplicação, rollback das três e reaplicação aprovados no banco descartável. |
| 12 scripts frontend `test:*` | Aprovados; a tentativa inicial de executá-los por subprocesso falhou na ferramenta, e cada script foi executado diretamente com sucesso. |
| Lint, TypeScript, build de produção | Aprovados. Permanecem avisos de tamanho do JavaScript e importação estática/dinâmica existentes. |
| Navegador | Abas, campos preservados, código/ID, unidades, cadastro de roteiro, rede, ciclo da etapa e seis eventos do histórico aprovados; sem erro JavaScript nos cenários. |
| Diff | Sem erros de whitespace. |

Logs temporários: `/tmp/venture-release-final-validation.jsonl`, `/tmp/venture-hardening-race.log`, `/tmp/venture-hardening-unit.log`, `/tmp/venture-hardening-build.log`, `/tmp/venture-test-*.log`. A evidência histórica das 27 falhas está em [EVIDENCIAS-MEGA-VALIDACAO.md](EVIDENCIAS-MEGA-VALIDACAO.md).

## Decisões de operação e atualização

- Uma planejada que já gerou OF não volta a PLANNED por essa ação; deve ser ajustada pela OF correspondente. Isso evita replanejamento com OF antiga ainda executável e liberação duplicada.
- A numeração pode ter lacunas após uma tentativa de criação que falhe. Ela não é numeração fiscal.
- A migração 358 copia para ordens antigas a rede disponível na atualização. Ela não reconstrói versões históricas que nunca foram armazenadas.
- A migração 359 registra eventos novos. Ela não inventa autores ou eventos anteriores à instalação. Imutabilidade da tabela não equivale a proteção contra administrador do banco.
- Reverter 358/359 remove suas novas tabelas e, portanto, suas cópias de rede e eventos. O teste de rollback não significa que se deva descartar esse histórico em um ambiente com uso real; é necessário preservar dados/backup no procedimento de atualização.
- Nenhuma migração foi publicada ou aplicada fora do banco descartável. Backend e frontend precisam ser homologados e publicados de forma compatível quando solicitado.

## Referências oficiais e limites da comparação

| Referência | Critério adotado e limite |
|---|---|
| [Focco: roteiro de fabricação](https://help-preview.foccoerp.com.br/Processos/Manufatura/roteiro-de-fabricacao/) | Roteiro do item alimenta execução, capacidade e custo. Testes de custos, capacidade e transferência à OF passaram. |
| [Focco: apontamento de produção](https://help.foccoerp.com.br/Processos/Manufatura/apontamento-de-producao/) | Acompanhamento por operação e relação com entrega. A implementação mantém entrega explícita; não reproduz todos os modos de entrega automática do fornecedor. |
| [Oracle NetSuite: centros e tarefas de manufatura](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N2349668.html) | Controle de predecessoras e andamento das operações. Paralelismo e junção foram exercitados; confirmação parcial entre todas as etapas não foi homologada. |
| [SAP: ordens de produção](https://help.sap.com/docs/SUPPORT_CONTENT/prodord/3138697900.html) | Confirmação associada a movimentos de materiais. Estoque do fluxo HTTP foi reconciliado; não houve reconciliação contábil completa de todos os modos de apontamento. |
| [SAP: decisão de utilização na qualidade](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/2bc3ee8d1c83404e8cf62418640004f2/2b99ba53422bb54ce10000000a174cb4.html) | Qualidade precisa de avaliação explícita. Foi testado bloqueio da entrega; não foi implementado o modelo completo de estoque em inspeção do SAP. |
| [SAP: reversão de movimentos](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/21aead0c98bd4755abdacd91c99e3393/578abf53f106b44ce10000000a174cb4.html?locale=en-US) | Estorno e reconciliação completos seguem fora da homologação ponta a ponta desta rodada. |

## Riscos residuais e não executados

Não foram executadas as duas integrações reais de SMTP nem o espelhamento de identidades entre bancos: dependem de configuração externa e não foram habilitados envios de mensagens. Também não houve homologação Windows/Tauri, carga sustentada com percentis/SLA, interrupção real do processo e recuperação, nem fluxo completo de terceirização/estorno/contabilidade conectado à mesma OF. No teste HTTP, a decisão de qualidade foi preparada por SQL depois de verificar a inspeção criada; a tela/API de aprovação não foi exercitada nesse fluxo.

As medições locais anteriores de consultas com 2.000 registros não representam a capacidade da instalação de produção. A mensagem original das abas 2/5 não pôde ser atribuída com certeza a um ambiente; a causa código versus ID foi comprovada nos logs locais, conforme [investigação](VALIDACAO-ROTEIRO-MRP.md).

## Arquivos modificados

Frontend: telas `Vcus0100Page.tsx`, `Vsup0110Page.tsx`, `RoteiroFabricacaoPage.tsx`, `Vpro0900Page.tsx`; `LookupField.tsx`; serviços `lookups.ts`, `apiError.ts`, `productionOrderService.ts`; rótulos, ajuda, simulação `scripts/ui-sim/routing-regressions.mjs` e estes relatórios.

Backend: `api/api.go`, `api/planned_release.go` e teste; casos de uso de produção/roteiros/liberação; domínio das transições e integração MRP/máquinas; repositórios de produção, MRP e terceiros; DTOs; query `operation_execution.sql` e SQLC gerado; migrações 358–360; testes de integração e helper `testutil/session.go`; documentação de produção e tutorial HTML/PDF. As alterações em testes de outros módulos corrigem a preparação dos cenários da validação global solicitada.

Não houve alteração de segredos, infraestrutura remota, releases ou arquivos fora do escopo de implementação e validação autorizado.

# Roteiros e execução de produção — validação de 21/09/2026

Validação ampliada posterior: [parecer e correções adicionais](MEGA-VALIDACAO-MRP.md). Este documento registra a investigação inicial. As falhas da suíte e os limites de atomicidade/rede descritos naquela rodada foram tratados na continuação; os resultados atuais estão no parecer ampliado.

## Entrega

- VCUS0100: cinco abas, preservando os campos ao alternar entre elas.
- Conversão de unidades: seletores com os valores aceitos pelo backend. A tela correspondente no projeto é VSUP0110.
- VENT0202: seleção de centro de trabalho pelo ID interno; mensagens de referência mais específicas; validação de pertencimento das etapas ao roteiro e rejeição de ciclos na rede.
- Tutorial HTML e PDF: seção 5.5 esclarece que as quinze operações pertencem à biblioteca usada pelos componentes e pela montagem da RN 01001. Não são quinze etapas da montagem final.
- Produção: início, pausa, interrupção, retomada e conclusão das etapas, com motivo, histórico e datas. Predecessoras controlam a liberação das sucessoras; a liberação não inicia automaticamente uma máquina.
- Geração das etapas: roteiro aprovado do item/máscara, tempos convertidos para horas e calculados por lote; repetição da geração não duplica etapas.
- Entrega final bloqueada enquanto existirem etapas não concluídas/dispensadas. No scanner, etapas intermediárias não incrementam o produto acabado; ao terminar o roteiro, a resposta orienta a entrega para registrar a entrada no estoque.

## Investigação da mensagem

A mensagem genérica vem da tradução de violações PostgreSQL de chave estrangeira (SQLSTATE 23503) em `src/services/apiError.ts`. Ela não prova, por si só, que o usuário deixou de cadastrar a referência.

Nos logs locais do ambiente demo de 20/09/2026, foram encontradas rejeições nas referências `operations_default_work_center_id_fkey` e `route_operation_resources_work_center_id_fkey`, ambas com valor 9. Consulta somente leitura confirmou um centro existente com **ID 8 e código 9**. O lookup priorizava o código público; foi corrigido para enviar o ID e impedir entrada manual ambígua nesses campos.

Não foi possível identificar com certeza o incidente relatado nas abas 2 e 5 nem seu ambiente. A consulta dos logs remotos disponíveis não encontrou ocorrência correspondente. Os testes reproduziram o cadastro de roteiro e a rede com referências existentes, além de referências inválidas e ciclos. Nenhuma alteração foi aplicada aos ambientes remotos.

## Validação executada

- Backend: `go vet ./...` e `go test ./...`.
- Frontend: lint, TypeScript e build de produção.
- Verificações existentes: engenharia 186/186, planejamento 4/4 e suprimentos 14/14.
- PostgreSQL real, em cópia descartável local migrada: três testes de integração aprovados, cobrindo transições, motivos, predecessoras, caminhos paralelos, isolamento por empresa, tempos por lote, geração sem duplicação, bloqueio da entrega e scanner com repetição idempotente.
- Navegador: abas e preservação dos campos, diferença código/ID, unidades, payloads das abas 2 e 5, início/pausa/interrupção/retomada/conclusão e liberação da sucessora. Sem erros JavaScript nesses cenários. As respostas HTTP desse teste são simuladas; os testes PostgreSQL são separados.
- PDF regenerado e texto extraído conferido para a seção 5.5.
- `git diff --check` sem erros.

Teste de navegador reproduzível: iniciar o Vite local e executar `APP_URL=http://127.0.0.1:5198 node scripts/ui-sim/routing-regressions.mjs`, ajustando porta e `CHROME_PATH` quando necessário.

## Decisões e limites

A finalização de uma operação libera as próximas conforme a rede, ou conforme a sequência quando não há rede. A entrada no estoque continua passando pela entrega de produção, com seus dados de quantidade, depósito e lote.

Os testes aprovados não certificam 100% de todos os processos do MRP. Qualidade, terceirização e execução completa em instalação Windows não foram homologadas ponta a ponta nesta alteração. O build ainda apresenta os avisos existentes de tamanho do pacote JavaScript e importação estática/dinâmica de `fiscalAdvancedService`.

Atualização de 22/09: a criação passou a ser transacional e as dependências são
copiadas para cada ordem. Foi acrescentado histórico persistido com autor, estado e
horário, bloqueado contra atualização/exclusão. A continuidade da validação e seus
limites estão em [MEGA-VALIDACAO-MRP.md](MEGA-VALIDACAO-MRP.md).

## Referências oficiais consultadas

- [FoccoERP: roteiro de fabricação](https://help-preview.foccoerp.com.br/Processos/Manufatura/roteiro-de-fabricacao/): roteiro vinculado ao item.
- [FoccoERP: apontamento de produção](https://help.foccoerp.com.br/Processos/Manufatura/apontamento-de-producao/): acompanhamento por operação/ordem e relação com entrega da produção.
- [Oracle: conclusão de operações](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25d/faumf/use-the-quick-complete-action-to-execute-a-standard-discrete.html) e [sequenciamento](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25d/faumf/how-you-resequence-a-work-order-operation.html): execução controlada pelas operações da ordem.
- [SAP: confirmações de produção](https://help.sap.com/docs/SAP_S4HANA_CLOUD_BEST_PRACTICES/2d331e7b035519f1698379a1bdf3d44a/60bcab8998f44eb69854cbe6fc001727.html?locale=en-US&state=PRODUCTION&version=2608): registro de execução e tempos de operações.

## Escopo dos arquivos e publicação

Frontend: telas de custos, unidades, roteiros e produção; lookup, tradução de erros e serviço de produção; teste de navegador em `scripts/ui-sim/routing-regressions.mjs`.

Backend: exclusivamente `/home/felipepanosso/GolandProjects/panossoerp-ajustes`, nas camadas de roteiros e ordens de produção, consultas SQL/SQLC geradas, testes e tutorial. A continuação acrescentou as migrações 358, 359 e 360, testadas somente no banco descartável. Nenhum commit, push, release ou alteração da branch develop foi realizado.

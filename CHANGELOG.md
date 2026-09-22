# Changelog

## Unreleased

## Novidades
- Acompanhe início, pausa, interrupção, retomada e conclusão de cada etapa, com histórico de quem realizou a ação e quando.

## Melhorias
- Organizamos a consulta de custos em abas que preservam os campos preenchidos.
- Facilitamos a conversão de unidades com seleção das unidades disponíveis.
- Preservamos a sequência de fabricação das ordens abertas quando o roteiro é alterado.

## Correções
- Corrigimos a seleção de centros de trabalho que podia rejeitar referências já cadastradas.
- Evitamos ordens duplicadas em liberações simultâneas e entregas repetidas no estoque.
- Bloqueamos a entrega final enquanto houver etapas, inspeções ou serviços pendentes.

## [v1.1.29] — 2026-09-19

## Novidades
- **Os tempos do roteiro entram em segundos.** A ficha de fábrica diz "setup 300 s, 15 s por peça" — agora é isso que se digita. Antes era preciso dividir por 3600 à mão e lançar 0,0833 e 0,0042, e era ali que o arredondamento entrava, virando minutos perdidos num lote de 500.
- **Tutorial de roteiro em PDF** (`docs/treinamento-pratico/tutorial-roteiro.pdf`): 26 páginas montando os nove roteiros do RN 01001 do zero, com a cadeia da bucha que sai para cementação em terceiro.

## Melhorias
- **A conversão de unidade se cadastra no sentido que você sabe.** "1 barra = 6.000 mm" é o que está na nota do fornecedor; "1 mm = 0,000166667 barra" é o mesmo número e ninguém confere. A tela e a mensagem de erro passaram a mostrar o sentido legível, e o cadastro aceita qualquer um dos dois — o sistema usa a inversa.

## Correções
- **A conversão de unidade perdia precisão e dava dois números diferentes para a mesma linha.** Para 104 mm de uma barra de 6 metros, a quantidade gravada era 0,017333 e o recálculo pelo fator dava 0,017368 — meio por cento a mais, sempre para o mesmo lado, reaparecendo no consumo da ordem, no custo e no saldo do estoque.

## [v1.1.28] — 2026-09-18

## Novidades
- **O roteiro de fabricação virou seis abas.** Eram sete blocos empilhados numa rolagem só; agora cada aba responde a uma pergunta, na ordem em que se desenha um processo: biblioteca de operações, roteiros do item, etapas do roteiro, recursos e ferramentas, rede de dependências, e tempo e custo do lote.
- **Refugo por operação — a conta de quantas peças soltar.** Se o corte refuga 3% e a solda 1%, entregar 100 boas exige soltar mais na primeira etapa. A tela mostra a cascata etapa a etapa para o lote que você digitar, e o número entra no prazo, na capacidade reservada na máquina e na ordem de produção. Antes a ordem saía curta e as peças faltavam na expedição.
- **Terceirização agora se cadastra na etapa do roteiro.** Uma bucha torneada aqui, cementada num terceiro e retificada aqui é cadastrada como três etapas — a do meio com fornecedor, custo por peça e prazo. A etapa que sai da fábrica aparece destacada na grade, e o MRP gera a ordem de serviço sozinho.
- **Ponto de inspeção no roteiro.** Marque que depois de uma etapa a peça para para ser conferida, descreva o que medir, a amostra e o nível de aceitação. A ordem de produção abre o registro de inspeção ao chegar naquela etapa.
- **Documento de processo por operação.** Desenho, instrução de trabalho, ficha e norma, com a revisão vigente. A instrução genérica fica na operação e vale em todo roteiro; o desenho fica na etapa, porque é do item. O operador vê os dois juntos.
- **A tela de serviços de terceiros (VTPS0100) virou quatro abas** e passou a mostrar o que já existia sem aparecer: preço com frete, imposto e vigência, reajuste e troca de terceirizado em lote, ordens com o que foi enviado, o que voltou e o que ainda está lá, e o registro de remessa e retorno com nota e lote.

## Melhorias
- **A estrutura agora exige conversão quando a unidade difere.** Dava para cadastrar uma chapa em quilo no item e escrever "2 m²" na estrutura — e o sistema passava a reservar 2 kg. Agora a diferença só é aceita com a conversão cadastrada, e a tela mostra "2 m² = 31,4 kg" ao lado do campo. É esse valor que o MRP reserva, a ordem consome e o custo rateia.
- **O prazo do terceiro aparece separado das horas.** São dois relógios: horas de trabalho nosso (8 h por dia útil) e dias corridos no fornecedor. Somar os dois num número só dava uma conta que não batia com nenhum deles.
- **Confirmação de desativar passou a ser uma janela do sistema**, em português, dizendo qual registro será afetado e o que acontece depois — não a caixa do navegador.
- A resposta de gravar uma etapa passou a trazer a linha completa (nome da operação, centro, tempos). Antes a linha aparecia em branco até alguém recarregar a tela, e parecia que não tinha gravado.

## Correções
- **Criar roteiro com data no formato da tela falhava.** A data "17/09/2026" voltava um erro técnico sobre formato de hora. Agora a tela e a API falam a mesma língua.
- **Roteiro duplicado devolvia o erro cru do banco.** Agora explica que já existe um roteiro com aquela alternativa e o que fazer.
- **O MRP travava o plano depois de terminar com ressalvas.** O cálculo rodava inteiro, gravava as sugestões e falhava exatamente ao registrar o próprio término — e como é esse registro que libera a trava, toda tentativa seguinte de planejar respondia "já existe um cálculo em andamento", sem saída pela tela. Bastava uma ressalva (um item sem produtividade cadastrada) para o plano travar de vez.
- **Cálculo interrompido não bloqueia mais o plano.** Se o serviço reinicia no meio de um MRP, o registro ficava "rodando" para sempre. Agora ele é encerrado automaticamente e o planejamento segue.
- O refugo cadastrado na operação voltava zerado ao reabrir o cadastro. Gravava certo, mas a tela mostrava 0 — e quem "corrigisse" apagava o valor certo.

## [v1.1.27] — 2026-09-17

## Novidades
- **Simulação de margem na VCUS0200.** Antes de fechar o pedido, veja o que sobra: preço, quantidade, custo, impostos e comissão devolvem a cascata inteira — e o que o prazo de pagamento custa aparece como linha, não sumido na conta. Informando a margem desejada, a tela devolve o **preço mínimo** que a atinge, com a diferença para o preço simulado. Venda que dá prejuízo é avisada em vermelho.
- **Unidade de tempo em segundos** na produtividade por item. A ficha traz "85 s por peça" e agora é lançado direto.
- **Famílias de preparação.** Agrupe os itens que custam o mesmo para trocar na máquina e escreva a regra entre famílias — quarenta chapas pedem três regras, não mil e seiscentos pares. A tela mostra quantos pares cada família dispensa.

## Melhorias
- **O terminal de parada de máquina (VPRO1200) foi redesenhado.** A cor passa a carregar o estado: máquina parada tinge a tela de âmbar e o cronômetro fica grande o bastante para ler do outro lado do corredor. Os motivos viraram seis alvos grandes em vez de uma lista de linhas finas.
- A aba Paradas separa **"a máquina parou agora"** de **"lançar parada que já aconteceu"** — antes os dois tinham um campo "Motivo" e não dava para saber qual usar.
- O seletor de base de custo da VCUS0200 cortava o texto no meio da frase.

## [v1.1.26] — 2026-09-16

## Novidades
- **A tela de máquinas virou nove abas.** Eram sete cadastros empilhados numa rolagem só; agora cada aba responde a uma pergunta, na ordem em que a fábrica cadastra: centros de trabalho, máquinas, turnos, paradas, consumíveis, produtividade, preparação, simulador e agenda.
- **Cadastro de turnos.** Calendário por regime de trabalho, com as horas de cada turno calculadas na hora. Turno que vira o dia — 22:00 às 06:00 — é aceito e a tela avisa que termina no dia seguinte.
- **Registro de paradas de máquina.** Quebra, manutenção e parada programada, com hora exata. Antes só dava para escolher um calendário já existente; não havia como criar um nem como registrar uma quebra.
- **Cadastro de consumíveis** — gás de corte, eletrodo, arame — com a autonomia da carga e o tempo de troca. O consumo por hora fica na produtividade do item, e o simulador mostra quantas trocas a ordem vai exigir e quantos minutos a máquina fica parada nelas.
- **A produtividade ganhou forma de produção** (contínua ou ciclos fechados) e eficiência do próprio item.

## Melhorias
- A grade de recursos mostra a **jornada de cada máquina** — o calendário de turnos com o total semanal, ou as horas por dia de quem não usa calendário. É o que governa a capacidade, e antes não aparecia em lugar nenhum.
- A lista de produtividade mostra o consumo configurado de cada item.
- As sugestões do MRP mostram **em qual máquina a ordem foi alocada** e quantos minutos vai ocupar, ao lado do término previsto.
- O simulador informa a eficiência aplicada e de onde ela veio — item ou máquina.

## [v1.1.25] — 2026-09-14

## Correções
- **O portão de release passou a conferir as notas da versão que está sendo publicada.** Ele validava a seção da versão anterior, então uma nota fora do padrão só quebrava no final do pipeline — com a tag já publicada e sem instalador gerado.
- **Buscar pelo código exato abre o item certo.** Digitar `5` no campo de busca trazia `900500` na frente — o `5` está dentro dele —, e o item errado abria. Como cada produto tem a sua estrutura, a tela mostrava uma estrutura vazia e parecia que o cadastro tinha sumido. A busca agora ordena por relevância: código exato primeiro, depois começa-com, depois contém. Vale para todos os campos de seleção do sistema.

## Melhorias
- **Material prático atualizado** (15 PDFs, 334 páginas). O Dia 2 ganhou o almoxarifado endereçado — endereço, FEFO × FIFO, onda de separação, sugestão de guarda, curva ABC e transferência entre endereços —, com o roteiro dizendo de onde tirar os 10 minutos e quando pular o bloco.
- **A conta da perda está documentada.** O material dizia que o MRP "soma a perda"; a conta padrão é `base ÷ (1 − perda)`. Para 2.250 peças com 5%, são 2.368,42 — não 2.362,50. O Dia 3 passa a documentar o parâmetro 20 e as três fórmulas.
- **Mensagens de erro da estrutura** (ciclo, componente duplicado, situação em branco) entraram nos erros comuns do Dia 1, com o que fazer em cada caso.
- Corrigido o código do movimento de ajuste no material: é `ADJUSTMENT`, não `ADJUST`.

## [v1.1.23] — 2026-09-13

## Estoque e almoxarifado
- **Saldo por endereço.** O sistema sabia quanto havia de um item no almoxarifado, mas não onde. Agora o endereço entra no saldo e no movimento, e a tela mostra onde o material entrou e saiu — uma transferência aparece como `ALM-MP-A01 → ALM-MP-A02` numa linha só.
- **Separação FEFO.** O que vence antes sai antes, com a corrida e o certificado do lote na própria linha, para o separador não precisar de uma segunda tela. Lote vencido nunca é sugerido: aparece contado à parte, em vez de fingir que o saldo está disponível.
- **A lista de separação sai na ordem do galpão.** O FEFO decide qual lote; a sequência de rota decide o caminho, para não cruzar o corredor a cada linha.
- **Onda de separação.** Várias necessidades numa caminhada só, com reserva por endereço — duas ondas não prometem mais a mesma peça. A onda nasce mesmo faltando saldo, sinalizando o que não coube.
- **Sugestão de onde guardar o recebimento**, explicando o porquê: endereço fixo do item, consolidação com o que já está lá, endereço vazio da zona ou qualquer um com espaço. Endereço bloqueado nunca é sugerido e a capacidade é respeitada.
- **Transferência entre endereços**, com o lote acompanhando o material.
- **Curva ABC calculada pelo valor consumido**, não pela quantidade — mil parafusos baratos não são item A. A classe passa a definir de quanto em quanto tempo o item é contado; antes, item sem intervalo digitado à mão nunca era contado.
- **Contagem por endereço confiável.** A quantidade esperada passou a considerar o endereço; antes comparava com o saldo do almoxarifado inteiro e acusava divergência em toda contagem.
- **Validade do lote** no cadastro, que é o que ordena o FEFO. Data inválida agora é recusada com aviso, em vez de ser descartada em silêncio.

## Correções
- **Consultas por código de item não funcionavam em boa parte do sistema.** Saldo, ATP, movimentos, lotes, ficha técnica e outras telas ou davam erro com códigos como `TP-01001-A`, ou — pior — respondiam saldo zerado sem erro nenhum, o que levava a promessa de entrega errada.
- **Planejamento e fábrica calculavam a perda da estrutura de formas diferentes.** O MRP comprava uma quantidade e a ordem de produção consumia outra, e o custo saía sobre uma terceira. Agora a conta é a mesma nos quatro lugares.
- **Movimento de estoque com tipo inválido era aceito e não mexia no saldo.** O registro aparecia no extrato e o estoque não mudava. Agora é recusado com aviso.
- **Saídas de estoque ficavam com valor zero** nos relatórios de valorização, embora o saldo baixasse pelo custo certo.
- **Telas que davam "erro interno do servidor"** ao salvar — previsão de venda, contas bancárias, tabela de NCM — agora explicam o que está errado. Digitar mais caracteres do que o campo aceita também deixou de ser erro interno.
- **Campo de data recusado ao salvar** em cabeçalho de estrutura e classificação fiscal.
- **Cadastro de máquina: abrir e salvar sem mexer em nada dava erro.**
- **Ao gravar um cadastro parcial, marcações ligadas voltavam a desligadas** sozinhas (tipo de máquina e característica do configurador).
- **Alterar característica pela rotina apagava máscara, limites numéricos, fórmula e opções.**
- **Endereço agora é escolhido em modal**, como os demais códigos do sistema, em vez de digitado à mão.
- Mensagens que mostravam nome interno de campo (`item_code é obrigatório`) passaram a usar o nome que aparece na tela; mensagens sem acentuação e trechos em inglês foram corrigidos.

## Segurança
- **Funcionários e centros de custo não eram separados por empresa.** Uma empresa via — e podia alterar ou inativar — o cadastro da outra. Nenhum dado vazou até aqui, porque só há uma empresa em operação.
- A apuração de custo-padrão registrava como autor quem o cliente informasse; agora usa o usuário autenticado.

## [v1.1.22] — 2026-09-11

## Correções
- **Campos de busca não encontravam códigos com letras.** Procurar por `TP-01001-A` respondia "Nenhum resultado" e só restava digitar o código à mão. Valia para todos os campos de busca do sistema. A busca também deixou de diferenciar acentos.
- **Cadastro de item: o que você salvava voltava ao padrão ao reabrir.** Tipo de venda, tipo de IPI de venda e de compra, origem da mercadoria, unidade de compra, consumo médio, contagem cíclica e "ativo no planejamento" não eram lidos de volta — e a gravação seguinte apagava o que estava guardado. Um item de revenda virava venda sozinho. O mesmo acontecia ao copiar um item-base: esses campos não vinham junto.
- **Todo item novo nascia marcado como "Item Base".** Agora, sem marcação, o item é Genérico.
- **Estrutura de produto: o duplo clique não abria o componente.** O clique caía no campo da linha e só selecionava o texto. Agora abre a estrutura do componente — inclusive de um componente sem filhos, que é como se monta um nível novo — e há um botão de abrir na coluna Ações.
- **Ao descer um nível, a máscara usada era a do item pai**, e não a do componente.
- Origem da mercadoria oferecia apenas três opções; agora traz as nove da tabela oficial (0 a 8).

## Melhorias
- **Cadastro de item**: o campo Nome ficou maior, que é o que aparece nas listas.
- **Estrutura de produto**: código do item pai e código do filho com mais espaço, coluna "Health" renomeada para "Situação" e um botão para recolher o painel de detalhe e usar a tela inteira para a grade.
- **Botão Conferir mais completo**: além dos erros de preenchimento, aponta componente repetido, componente igual ao pai, componente fora de vigência e configuração incompleta.
- Almoxarifado de transferência, de assistência técnica, de suprimentos e grupo de inventário passaram a ter busca em vez de digitação do código.

## [v1.1.21] — 2026-09-10

## Correções
- Corrigimos o cadastro de estruturas com códigos de item alfanuméricos.
- O sistema agora mostra a causa real quando um componente não pode ser salvo.
- Evitamos inclusões duplicadas quando uma requisição é repetida.

## [v1.1.19] — 2026-09-10

## Correções
- O campo **Altura (mm)** do cadastro de item passou a aceitar espessuras decimais, como 6,35 mm, preservando o valor correto ao gravar e reabrir o item.

## [v1.1.18] — 2026-09-09

## Correções
- **Campos de busca diziam "nenhum registro cadastrado" quando na verdade a consulta tinha falhado.** Qualquer instabilidade — token expirado, rede oscilando — transformava a lista em vazia, e o vazio ficava guardado pelo resto da sessão: mesmo depois de a conexão voltar, o campo continuava mudo e só restava digitar o código de cabeça. Agora o campo mostra o que deu errado e oferece **Tentar de novo**. Vale para todos os campos de busca do sistema.
- **Máquinas e tipos de máquina não podiam ser alterados.** Não havia como corrigir nome, capacidade ou qualquer outro dado depois de cadastrar — só criar e excluir. Os dois passaram a ter alteração.
- Na fila da máquina, a **prioridade manual** era gravada e nunca reaparecia na tela; e excluir um item que não existia respondia "sucesso". Ambos corrigidos.
- A fila de uma empresa podia ser lida e alterada por outra informando o código. Todas as consultas da agenda passaram a respeitar a empresa da sessão.
- O tipo de máquina "Injeção" era recusado na gravação. "Moinho" e "Imprensa" viraram **Fresadora** e **Prensa**, que é como a fábrica chama.
- As mensagens de recusa do cadastro de item que ainda saíam em inglês foram traduzidas, e a da curva ABC passou a dizer o nome do campo na tela.

## Novidades
- **Cadastro de máquina completo (VMAQ0200).** A tela pedia sete campos; o sistema guarda vinte. Entraram centro de custo, localização no chão de fábrica, uso do recurso, marca, fornecedor, data de aquisição, responsável pela manutenção, tempo de preparação e os marcadores **gargalo** e **preferencial** — que são o que o sequenciamento usa para decidir o que roda onde. O formulário foi dividido em blocos (identificação, capacidade, chão de fábrica, aquisição) e a lista mostra os marcadores como etiquetas.
- **Cadastro de tipos de máquina na própria tela**, com alteração e o campo *exige operador* — antes só existia pela tela genérica de rotinas.
- **Telefone e e-mail do contato do fornecedor** podem ser informados junto com o contato, e aparecem na lista. Antes o contato nascia sem forma de ser contatado.

## Melhorias
- A curva ABC do item ficou como campo próprio, com as três opções explicadas — ela decide o rigor do controle de estoque, não é a classificação do item.

## [v1.1.17] — 2026-09-09

## Correções
- **Cadastro de item recusava a gravação com "classe ABC inválida"**: o campo Classificação da aba Planejamento estava ligado à lista de classificações do item, mas era gravado como curva ABC — que só aceita A, B ou C. Agora é um campo próprio, **Curva ABC**, com as três opções explicadas.
- **A busca de item base abria vazia** e obrigava a digitar o código na mão: a lista passou a aceitar tanto o marcador novo quanto os cadastros antigos e, quando nenhum item está marcado como base, mostra todos em vez de nada.
- **Fornecedor sumia da listagem depois de ser alterado**: qualquer edição devolvia o cadastro como inativo. A situação agora é carregada, aparece como a caixa **Ativo** e só muda quando você marca. O mesmo acerto vale para cliente, representante, transportadora, condição de pagamento, tabela de venda, tipo de nota, máquina, classificação fiscal e demais cadastros de apoio.
- O cargo do contato do fornecedor era descartado na gravação; o contato também passou a ter tipo e ordem.
- A quantidade de ferramentas por operação do roteiro era descartada — um jogo de quatro insertos virava um.
- O ajuste de inventário não acontecia: o sistema exigia o tipo de acerto, que a tela nunca enviava. Agora o acerto é deduzido da diferença (entrada, saída ou sem diferença) e aceita um motivo por linha.
- A conversão de unidade de item que não aceita fração recusava tudo, porque a política de arredondamento nunca era informada; o resultado também deixou de aparecer como texto técnico.
- A reprogramação de entregas ignorava os pedidos escolhidos e reprogramava a faixa inteira de datas.

## Novidades
- **Fila da máquina (VMAQ0200)**: a agenda passou a ser uma fila de verdade — dá para subir e descer a ordem, forçar prioridade sem renumerar tudo, corrigir horários, apontar o que foi produzido e remover o slot que não vai rodar.
- **Parâmetros e reajustes da venda recorrente (VVRE0200)**: dia limite de faturamento, dias de entrega, representante e plano genéricos, datas de reajuste por cliente e o reajuste em massa com simulação antes de aplicar.
- **CT-e com autorização na SEFAZ (VFIS0220)**: o conhecimento passou a aceitar os dados de emissão (trajeto, partes, tomador, produto predominante) e a ser enviado à SEFAZ pela própria tela.
- **Origem do item no pedido de compra**: cada linha pode apontar a requisição (e a linha atendida), a cotação, o contrato, a ordem planejada, o pedido de venda ou a ordem de produção que a originou.
- **Corte de forma real**: peças irregulares podem ter o contorno informado ponto a ponto, com prévia do desenho — sem ele, a peça era encaixada pelo retângulo que a envolve e sobrava material entre as curvas.
- **Restrições por classificação ou divisão de vendas**: a regra pode ser escrita uma vez para a família inteira, em vez de repetida item a item.
- **Descontos e acréscimos na tabela de preço de compra**, aplicados em cadeia, e a opção de levar o preço negociado para o valor de reposição do item.

## Melhorias
- O custo padrão passou a diluir a preparação pelo lote de referência informado, em vez de cobrar o setup inteiro de cada peça.
- O apontamento de produção aceita a data do turno (para lançar a noite na manhã seguinte), a máquina e o operador; o consumo pode ser amarrado ao apontamento e registrar o item que substituiu.
- Contas a pagar e a receber ganharam o vínculo com o pedido de compra e o pedido de venda, e as buscas de fornecedor e cliente deixaram de pedir o código digitado.
- O rateio de custos indiretos passou a aceitar a conta do plano de contas e a base de alocação (horas-máquina, área, pessoas).
- O plano de produção pode valer para todos os itens, para uma classificação ou para um item de ordem.
- A meta do grupo comercial pode ser repartida entre os clientes que o compõem.
- O lote de matéria-prima registra o fornecedor e a data de recebimento; a nota de entrada registra o CT-e do transporte e a de saída, o cupom fiscal que substitui.

## [v1.1.16] — 2026-09-07

## Novidades
- **Pedido de compra (VPDC0200)**: nova tela com capa, itens e transporte/pagamento, mostrando situação e alçada de aprovação por extenso, saldo de cada item (pedido, recebido, cancelado e a receber) e o total do pedido no rodapé.
- **Mapa de cotação**: a cotação de compras passou a montar a matriz item × fornecedor, destacando o melhor preço de cada item, quanto se economiza em relação ao segundo colocado e se compensa pulverizar ou concentrar a compra em um único fornecedor.
- **Configurador do produto (VCFG0100)**: virou um roteiro de cinco passos — conjuntos, perguntas, perguntas do item, gerar máscara e restrições — para você cadastrar as perguntas (comprimento, profundidade, cor…), amarrar as respostas ao item e gerar as máscaras dos itens configurados sem sair da tela.
- **Restrições de configuração**: as combinações proibidas agora aceitam os operadores igual, diferente, maior, menor, pertence e não pertence, explicam a precedência em português e mostram quais combinações foram bloqueadas na geração da máscara.
- **Tempo e custo do roteiro**: o roteiro de fabricação simula o lote informado e separa setup, tempo de máquina e tempo de mão de obra, mostrando o custo por peça — que cai conforme o lote cresce, como acontece na fábrica.
- **Testar fórmula na estrutura**: o cadastro de estrutura ganhou o teste de fórmula, que pergunta os valores das variáveis e mostra a quantidade bruta, arredondada, com perda e por pedido.
- **Histórico da estrutura**: dá para ver quem mudou o quê na estrutura do produto, com o antes e o depois em português.
- **Abrir item para alterar**: no cadastro de item de engenharia (VENT0200) agora é possível abrir um item já cadastrado e alterar suas informações; o código fica protegido durante a alteração.

## Melhorias
- O cadastro de item passou a gravar as pastas de planejamento, engenharia e recebimento por inteiro: lote mínimo e múltiplo, estoque de segurança, item crítico e exclusivo, classe ABC, tanque, ponto de pedido, dimensões, roteiro de conferência no recebimento e safra.
- A classificação fiscal do item (VFIS0320) foi reorganizada em blocos — chave, ICMS, ST, IPI e casos especiais — e deixou de perder informação ao abrir um registro para alterar.
- O plano de corte passou a calcular os metros de fita de borda por peça e a registrar a rastreabilidade da chapa.
- O cadastro de cliente (VCLI0530), a matriz de PIS/COFINS (VFIS0350), as metas de venda (VVND0500), a reserva de estoque, a NFS-e e a inspeção de recebimento passaram a expor os campos que o sistema já guardava, mas que não apareciam na tela.
- As buscas de item base, ferramenta, centro de custo, tipo de nota e dispositivo legal ganharam lista de pesquisa.

## Correções
- Campos que eram preenchidos na tela e descartados em silêncio na gravação — condição de pagamento do fornecedor, máscara do lote e horizonte da manutenção preventiva — agora chegam ao sistema.
- Máquinas e tipos de máquina passaram a nascer ativos, em vez de inativos.
- Perguntas do configurador e restrições que ficavam invisíveis por causa de dois códigos diferentes do mesmo item voltaram a aparecer, e as combinações proibidas voltaram a bloquear de fato.
- Situações que respondiam "erro interno do servidor" — como informar um ano inválido no gráfico de Gantt — agora explicam o que precisa ser corrigido.
- Traduzimos as mensagens que ainda chegavam em inglês nas rotinas do sistema.

## [v1.1.15] — 2026-09-05

## Melhorias
- Registros que antes apareciam como texto técnico — genealogia de lote, programa de corte, resultado do planejamento e inspeção — passaram a ser exibidos como tabelas em português.
- Campos que pediam um "id" agora mostram o nome do cadastro que você está informando.

## Correções
- Quando um cadastro não existe, o sistema informa isso claramente em vez de "erro interno do servidor".
- Cadastrar um código já usado agora avisa que o registro existe, em vez de apresentar uma falha genérica.
- A consulta de máquina deixou de trazer o tipo de máquina no lugar da máquina.
- Traduzimos as últimas mensagens que ainda chegavam em inglês e corrigimos a acentuação das demais.
- Corrigimos o Aviso de Recebimento, que exibia rótulos e botões sobrepostos e agora abre listas de busca para empresa, fornecedor, transportadora e item.

## [v1.1.14] — 2026-09-04

## Novidades
- O cadastro de estrutura de produto ganhou o botão **Configurador**: responda as perguntas do item e o sistema monta a máscara, valida as combinações proibidas e já calcula as quantidades que vêm de fórmula, aplicando tudo na estrutura.

## Melhorias
- Centralizamos o roteiro de fabricação nas telas de engenharia, com operações, precedências, recursos, ferramentas e cálculo de lead time em um lugar só.
- Os cadastros de apoio do fornecedor (tipos de fornecedor, tipos de contato e parâmetros de compras) passaram para dentro do cadastro de fornecedor, no botão **Cadastros de apoio**.
- A comparação de previsto e realizado de vendas passou a mostrar o realizado, a diferença e o percentual de aderência, podendo considerar pedidos, faturamento ou os dois.
- Traduzimos quase trezentos campos que ainda apareciam em inglês nas rotinas do sistema.
- Datas deixaram de aparecer no formato técnico e passaram a usar o seletor de dia, mês, ano e horário.
- Operações que tinham o mesmo nome dentro de uma rotina ganharam nomes distintos, deixando claro o que cada uma faz.
- As classificações fiscais de venda e compra do item agora abrem a lista de busca com todos os cadastros.
- O cadastro de fornecedor indica quando a inscrição estadual é obrigatória.
- Telas que existiam apenas repetindo outra saíram do menu e, se abertas por um atalho antigo, explicam para onde a função foi.

## Correções
- Você não é mais desconectado ao reabrir o aplicativo com uma sessão válida.
- Corrigimos a consulta dos endereços de almoxarifado da produção, que não retornava nada.

## [v1.1.13] — 2026-09-02

## Correções
- Corrigimos o cadastro de classificações em níveis para reconhecer o código da classificação pai.
- Classificações principais agora são salvas sem uma referência de pai vazia.
- Os filtros de classificação do planejamento e do MRP deixam de ser confundidos com códigos de itens.

## [v1.1.12] — 2026-09-02

## Melhorias
- Deixamos todas as telas comerciais, de engenharia, manufatura, suprimentos, almoxarifado e produção com textos em português, sem termos técnicos em inglês.
- Agora os campos de item, classificação, máscara, característica, cliente, fornecedor, representante, plano, ordem, máquina, centro de custo e afins abrem uma lista de busca com todos os cadastros, mantendo a opção de digitar o código manualmente.
- Corrigimos a exportação de relatórios em dezenas de telas, que antes exibiam "Nada para exportar".
- As mensagens de erro passaram a ser claras e em português, explicando o que ajustar em vez de mostrar códigos técnicos.

## Correções
- Corrigimos o cadastro de preços em tabelas de venda, a formação de preço e a geração em lote, que rejeitavam itens com código alfanumérico.
- Corrigimos a reativação e exclusão de divisões de vendas, a reprogramação de entrega com sugestão automática de data e o bloqueio de fornecedores.
- Corrigimos a estrutura de produto (BOM): inclusão, atualização, remoção e navegação entre os níveis com a unidade e a descrição preenchidas automaticamente.
- Corrigimos a contagem cíclica, o inventário, os saldos por almoxarifado e o cadastro de almoxarifado.
- Corrigimos a criação de políticas comerciais (desconto e frete), permitindo salvar as alterações e buscar itens e máscaras.
- Corrigimos o cadastro de grupo PDM e de roteiros de fabricação, com códigos gerados automaticamente quando não informados.

## [v1.1.11] — 2026-08-25

## Correções
- A consulta de CNPJ do cadastro de cliente agora preenche corretamente a inscrição estadual e mostra o endereço encontrado, que é salvo junto com o cadastro.

## [v1.1.10] — 2026-08-21

## Melhorias
- O sistema agora verifica a compatibilidade da versão durante todo o uso, inclusive em telas que já estavam abertas.
- Quando uma atualização for indispensável para operar com segurança, o ERP bloqueia novas operações e oferece a instalação antes de continuar.
- Atualizações compatíveis permanecem opcionais, evitando interrupções desnecessárias no trabalho.

## [v1.1.9] — 2026-08-20

## Novidades
- Adicionamos uma Central de Alertas para configurar avisos internos, acompanhar entregas de e-mail e reenviar mensagens que falharam.
- A nova rotina de Contagem Cíclica permite acompanhar e executar as conferências geradas automaticamente pelas políticas dos itens.

## Melhorias
- A consulta de CNPJ agora preenche também inscrição estadual, endereço, telefone, e-mail e demais informações cadastrais disponíveis.
- A busca de telas ficou mais precisa e coloca primeiro o código ou nome pesquisado, sem resultados repetidos ou sem relação.
- Deixamos os formulários e materiais de treinamento mais claros, com termos em português e orientações para trabalhar com autonomia.

## Correções
- Corrigimos campos e botões sobrepostos, conteúdo cortado e problemas de navegação em diferentes tamanhos de janela.
- Reforçamos a integração com itens alfanuméricos, parametrização fiscal, estoque, máquinas e plano de corte.

## [v1.1.8] — 2026-08-13

## Melhorias
- O cadastro do item agora permite selecionar o mestre fiscal e mostra os valores que serão herdados em compra e venda.
- A classificação fiscal passa a cadastrar vigência, origem, ICMS, unidades e cálculo padrão de PIS/COFINS.
- O treinamento do Dia 4 agora explica como herdar o cálculo de PIS/COFINS ou definir explicitamente Sim e Não no item.

## Correções
- Removemos a última lupa em formato de emoji e mantivemos a pesquisa profissional também nos campos alfanuméricos.

## [v1.1.7] — 2026-08-13

## Correções
- O cadastro completo de itens agora aceita códigos com letras e símbolos permitidos, além de permitir a geração automática quando o código fica vazio.
- Corrigimos campos de item no planejamento, MRP, estoque, compras, custos, engenharia e serviços para não restringirem a digitação a números.
- Itens-base e itens de embalagem passam a preservar integralmente o código comercial informado.

## [v1.1.6] — 2026-08-13

## Novidades
- Adicionamos códigos alfanuméricos aos itens, preservando letras, símbolos permitidos e zeros à esquerda em todas as rotinas.
- O calendário industrial agora pode preparar automaticamente os dias do mês sem apagar ajustes já revisados.
- A ordem de produção passa a gerar e ler códigos de barras seguros para iniciar, apontar e concluir operações.
- O cadastro de fornecedor consulta os dados do CNPJ e permite revisá-los antes de salvar.
- Relatórios de qualidade podem ser anexados ao item do fornecedor e associados à inspeção de recebimento.

## Melhorias
- As rotinas que possuem consulta e cadastro passam a abrir primeiro na busca ou listagem.
- O relatório de itens usa o espaço da página com mais segurança, evitando que a identificação da empresa seja encoberta.

## Correções
- Códigos comerciais de item deixam de ser convertidos em números nas telas de estoque, vendas, engenharia, planejamento, produção, fiscal e suprimentos.

## [v1.1.5] — 2026-08-12

## Melhorias
- A busca de telas agora coloca o resultado mais exato em primeiro lugar, facilitando abrir a rotina desejada pelo código.
- Substituímos a lupa em formato de emoji por um ícone mais profissional e consistente.
- Reorganizamos os campos em janelas menores para evitar informações juntas ou sobrepostas.
- O Histórico de Alterações ficou mais fácil de entender, mostrando quem fez a ação, quando aconteceu e qual cadastro foi afetado.

## Correções
- Centralizamos o cadastro de itens na tela completa, evitando registros incompletos em uma opção resumida.

## [v1.1.4] — 2026-08-10

## Novidades
- Adicionamos lupas para pesquisar itens, máquinas e outros cadastros relacionados sem precisar memorizar códigos.

## Melhorias
- Deixamos as rotinas operacionais mais claras, com situações, datas e informações apresentadas em português.
- A estrutura do produto agora permite escolher o item e suas máscaras já cadastradas em listas pesquisáveis.
- Ampliamos o treinamento do primeiro dia para ensinar a criação da máscara antes da estrutura do produto.

## Correções
- Removemos endereços técnicos e identificadores internos que apareciam em algumas telas.
- O responsável pelos registros passa a ser identificado automaticamente, sem solicitar códigos internos do usuário.

## [v1.1.3] — 2026-08-09

## Novidades
- Agora você pode escolher um item-base como modelo e copiar automaticamente as configurações de estoque, engenharia, planejamento, vendas, contabilidade e suprimentos.

## Melhorias
- O cadastro de itens ficou mais simples, com nomes de campos claros e sem descrições repetidas.
- Itens Genéricos e Configurados podem ser cadastrados sem item-base; quando um modelo é usado, o código e o nome do novo item são preservados.

## Correções
- As mensagens de validação do nome e do item-base passam a ser exibidas em português.

## [v1.1.2] — 2026-08-09

## Novidades
- O cadastro de itens agora salva também as informações Comerciais e Contábeis, incluindo garantia, tipo de venda, origem, CEST e unidades de compra e venda.

## Melhorias
- O cadastro de Grupo PDM passa a sugerir o próximo código automaticamente.
- A montagem da descrição técnica do item ficou mais clara, sem exibir informações em formato JSON.
- A prioridade das ordens explica claramente as faixas de quantidade e impede intervalos sobrepostos.

## Correções
- O Centro de Custo Contábil agora confere se o centro pai existe antes de salvar, evitando hierarquias quebradas.
- Códigos técnicos sem utilidade deixaram de aparecer como zero na lista de prioridades.

## [v1.1.1] — 2026-08-03

- **Correção — Cadastro de Item (VITM0100)**: o cadastro rápido deixou de gravar e passou a exibir "item name is required" após a atualização do servidor. Foi adicionado o campo **Nome**, agora obrigatório, e o item volta a ser criado normalmente.

## [v1.1.0] — 2026-07-25

- **Orçamento de Venda renovado (VVND0300)**: agora dá para editar o orçamento depois de criado, anexar documentos (até 10 MB), acompanhar todo o histórico do pedido, bloquear/liberar comercialmente e gerar o DAV/Pré-Venda. O cancelamento passa a exigir um motivo cadastrado, e o descancelamento reabre a proposta com o mesmo motivo.
- **Nova tela: Parâmetros de Orçamento (VVND0310)** — cadastre aqui os motivos de cancelamento, os padrões de comissão e as regras de frete e NFC-e da empresa. É pré-requisito para cancelar orçamentos.
- **Divisão de Vendas (VVND0100)**: novo indicador "permite condição livre", que autoriza usar no orçamento uma condição de pagamento diferente da cadastrada no cliente. Prazos, PIS e COFINS também passaram a ser editáveis — antes eram zerados sem aviso ao salvar.
- **Cadastro de Item (VITM0100)**: novo tipo **Serviço**, necessário para vender serviço com NFC-e.
- **Confirmação de download**: ao exportar um relatório ou baixar um arquivo, o sistema agora avisa que o download terminou e mostra o nome do arquivo. Antes o arquivo era salvo em silêncio.
- **Correção — Contas a Pagar e a Receber**: o painel de vencimentos mostrava R$ 0,00 em todas as faixas; agora exibe os valores reais por faixa, com o total.
- **Correção — Apuração de Impostos**: a tabela de ICMS, IPI, PIS e COFINS aparecia zerada; agora traz os valores apurados de cada imposto.
- **Correção — Previsão Estatística**: o modelo, o erro (MAPE) e as quantidades previstas não apareciam.
- **Correção — Perfil do MRP**: as colunas de ordens planejadas, ordens firmes e estoque projetado apareciam zeradas.
- **Correção — Contas Bancárias**: a coluna de saldo mostrava R$ 0,00; passa a exibir o saldo inicial (o saldo movimentado continua no Fluxo de Caixa).
- **Correções menores**: descrição e unidade do item do fornecedor, indicador de IPI do fornecedor, quantidade alocada na ordem de produção e marcação de dia útil no quadro do APS voltaram a aparecer.
- **Downloads mais confiáveis**: corrigido um problema que podia interromper o download do arquivo logo após iniciar.

## [v1.0.3] — 2026-07-20

- Visual renovado: todas as telas do sistema adotaram o novo padrão, mais organizado, consistente e fácil de ler.
- Novidades mais legíveis: o painel de novidades passa a exibir as notas de atualização já formatadas (sem símbolos técnicos na tela).
- Seu nome real passa a aparecer no topo do sistema após entrar (antes mostrava "Usuário ERP").
- Correção: no painel inicial, o relógio e as informações do topo não se sobrepõem mais.
- Exportação de listas (Excel, PDF e CSV) mais confiável.
- Segurança: o token da integração fiscal (Focus NF-e) passa a ser protegido e apenas administradores podem alterar a configuração fiscal.

## [v1.0.2] — 2026-07-16

- Correção: a trava de compatibilidade não reaparece mais ao abrir cada tela — só a janela principal valida no login; as telas abrem sem o "load" de validação.
- Novo: troca de senha direto da tela de login ("Trocar senha") — solicitar e concluir, integrado ao fluxo com aprovação de administrador.
- Novo: tela de **Novidades** (login e painel) mostrando o que cada atualização traz.
- A versão real do app passa a ser exibida no login (sem números fictícios).

## [v1.0.1] — 2026-07-16

## [v1.0.0] — 2026-07-16

- Atualizador nativo assinado, trava de compatibilidade e painel de atualização segura do backend.

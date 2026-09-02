# Changelog

## Unreleased

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

# Changelog

## Unreleased

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

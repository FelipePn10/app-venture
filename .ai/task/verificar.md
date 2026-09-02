Aqui quero que verifique Manutenção de Restrições e Dependencias. tentei criar usando como o FoccoERP e aperfeiçoando: https://help.foccoerp.com.br/Programas/FoccoERP/Manufatura/Configurador%20de%20Produto/FENG0116/?h=feng0116

Caso nao esteja pelo o menos igual (claro buscamos sempre sermos melhores) precisamos corrigir (isso inclui um design/estilo parecido mas é claro mantendo nossa identidade visual)

Aqui quero que verifique o Configurador. tentei criar usando como o FoccoERP e aperfeiçoando: https://help.foccoerp.com.br/Processos/Manufatura/configurador-de-produto/?h=configurad e como o configurador ele será bastante usado no Cadastro de estrutura de produtos: https://help.foccoerp.com.br/Programas/FoccoERP/Manufatura/Engenharia/Estrutura%20de%20Produto/FENG0210/?h=feng0210

Caso nao esteja pelo o menos igual (claro buscamos sempre sermos melhores) precisamos corrigir (isso inclui um design/estilo parecido mas é claro mantendo nossa identidade visual)

E também no cadastro de estrutura de produtos poderemos usar fórmulas para gerar a quantidade de algumas matérias primas e relacionados, veja um exemplo: 2*(COMPRIMENTO/1000)+2*(PROFUNDIDADE/1000). Veja como usei as "perguntas" na formula do item etc.

Outras partes que deve entrar na validação: Consulta de Estrutura:
https://help.foccoerp.com.br/Programas/FoccoERP/Manufatura/Engenharia/Consultas/CENG0401/?h=ceng0401 

* CONFIGURADOR NÃO DEVE TER UMA TELA  PROPRIA, DEVE SER UM BOTÃO QUE FICARÁ DENTRO DO CADASTRO DE ESTRUTUA DE PRODUTOS, ASSIM COMO NO FOCCOERP, VEJA TODOS OS LINKS E PESQUISE AS PARTES DO FOCCO NO HELP.FOCCO.COM.BR PARA TIRAR DÚVIDAS! 


VCLA0100 - Ao abrir uma classificação de itens temos o erro: internal server error e também ao tentar abrir a mascara e cadastrar as classificações: parent classification not found. Melhore o layout para melhor visualização também

VITE0114 - deixar inserir código manual para criar e se nao for inserido gerar automaticamente na sequencia (ordem) com base no ultimo código cadastrado no sistema Empresa deve vir direto e nao o usuário inserir manualmente.

VENT0800 - O campo Descrição está muito curto impedindo de ter uma boa visualização. E sempre recebo o erro: invalid request body mesmo com tudo preenchido. Corrija o design da tela para ser igual as outras partes do sistema.

VENT0200 - o campo Nome do item  está muito curto impedindo de ter uma boa visualização. Se eu começo a cadastrar um item e preencho somente a Capa ou uma outra aba somente, não consigo voltar posteriormente para terminar de cadastrar, corrija isso também. CLASSIF. FISCAL VENDA e CLASSIF. FISCAL COMPRA deve ser um modal que mostram todos cadastrados no sistema e permite inserir o código manualmente. Veja se tudo o que o Backend e o resto do sistema precisa se encontra corretamente nesta tela!

VSUP0500 - Nenhuma aba além de Dados abre. Veja se tudo o que o Backend e o resto do sistema precisa se encontra corretamente nesta tela! Inscrição Estadual é obrigatória (exceto transportadoras/redespacho) porém nao mostra na tela que é, e na consulta de CNPJ era para retorna a IE porém nao está retorando diretamente.

VSUP0120 - Erro ao criar uma tabela: enterprise, code and supplier are required

VSUP0130 - Não está salvando e listar também não está funcionando - não aparece mensagem de erro (talvez seja so um problema de listar) e temos o erro: não existe fator de conversão cadastrado para o item — cadastre em Conversões por Item

VENT0210 - Quando adiciono um item a estrutura e depois tento listar não aparece nada, mostra como se estivesse vázio, porém não aparece nenhuma mensagem de erro e se eu tento adicionar de novo: Request failed with status code 422. Os dados como peso (liquido) e outros nao puxam direto tambem e nao consigo entrar no filho com double clique - eu havia passado isso na task engenharia.md e muitos dos erros eu havia passado na task engenharia-dois/tres/quatro/cinco.md

VBOM0100 - Ao criar cabeçalho nada acontece, acredito que falta muitas coisas que o backend espera também como versão/tipo etc. Verificar.

VMAQ0200 - Melhore o layout de visualização, ao tentar realizar cadastro: erro interno do servidor acredito que falta muitas coisas que o backend espera também mas verifique!

VCUS0100: Layout precisa mudar e dividir em abas para melhor visualização e acredito que falta muitas coisas que o backend espera também mas verifique!




Vários erros eu já havia passado nas taks engenharia.md (dois/tres/quatro/cinco) porém vejo que a maioria dos erros continuam.. Por que? Você deve corrigir, inclusive as tasks que gerou para o backend todas foram feitas. Por ex o erro da VTPS0100 ainda continua também e assim por diante. 

Vou deixar para você um pdf que comtempla um treinamento completo de uma das partes do meu sistema, com esse PDG execute todos os testes/validações e parecidos possíveis no frontend para captar erros/bugs/falhas e coisas relacionadas que precisam ser corrigidas no backend, mas so determine se algo precisa ser corrigido no backend caso realmente o backend não esteja correto, por que as vezes o erro pode estar no proprio frontend! Não esqueça de sempre olhar para o worktree panossoerp-ajustes e nao para a branch develop. Segue o caminho do PDF: /home/felipepanosso/GolandProjects/panossoerp-ajustes/docs/treinamento-pratico/dia-dois.pdf




IMPORTANTE - NÃO FAÇA SEM LER:

* Por enquanto é isso, * busque no sistema erros parecidos para você já corrigir. Não pode ter palavras/frases etc em ingles, os campos de itens/classificações/planos/mascaras/caracteristicas e outras coisas deve ser possivel ver todas ja criadas no sistema e inserir o código manualmente, também todas as rotas/funcionalidades devem funcionar e comunicar com outras partes do sistema que sejam necessárias para tudo funcionar em alto nivel como um ERP deve ser e também as mensagens de erro devem ser em PT-BR!


* Para evoluir algumas correções, veja sempre como os grandes ERPs fazem e como podemos evoluir e implementar isso em nosso ERP. Tente identificar se há erros parecidos em outras partes do sistema para você ja fazer a correção e também verifique o que precisa mudar/evoluir/corrigir no backend, o que for necessário mudar/atualizar/corrigir/evoluir no backend, monte uma task completa em .ai/task. Tambem quando verificar essas telas veja se há pontos que conseguimos evoluir para realmente nos tornamos um ERP nivel enterprise como os grandes ERPs e proporcionar o melhor para nossos clientes. Corrija tudo o que listei, veja formas de melhorar e evoluir também so com isso diga  que toda a task foi 

* As mensagens de erro devem ser em PT-BR e entendiveis para os usuarios, afinal eles não são Devs ou coisas do tipo.

* TAMBÉM VEJA SE AS TELAS SE COMUNICAM COM AS OUTRAS PARTES DO SISTEMA QUE SÃO NECESSÁRIAS/IMPORTNATES, PARA QUE O ERP SEJA REALMENTE O MELHOR SISTEM AERP E TOTALMENTE FUNCIONAL.

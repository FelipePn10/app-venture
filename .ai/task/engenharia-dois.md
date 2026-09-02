VPCT0100: Várias palavras em inglês, tudo deve ser Pt-br. Ao clicar em "avaliar", o retoro é: {
  "actual": "0",
  "allowed": "0",
  "deviation": "0",
  "exceeded": false,
  "expected": "0",
  "matched": false
} Isso é horrivel para o usuário afinal ele nao entende json etc..

VTPS0100: Erro: freight_type must be FIXED or PERCENT. Os "modais" de item/fornecedor/operação deve listar toods ja criados no sistema e a possibilidade de procurar usando o código. A UN de medida deve vir do item cadastro ou então usar um enum correto como na hora de cadastrar o item.

VPDC0200: Mensagens em ingles: ADVANCE VALUE e FREIGHT TYPE na operação consultar. Na operação de cadastrar deve a empresa ja deve vir por padrão e nao o usuário inserir. Ao cadastrar o usuário não consegue ser encontrado: Usuário não localizado e eu não entendi esse pedido de compra, porque eu abro o pedido de compra e nao coloco os itens, fornecedores, nao tem dados para financeiro/fiscal/almoxarifado etc, e também se for gerado um pedido de compra pelo MRP esse pedido de compra precisa ser daquela ordem/pedido de venda para dar certo a produção, essa tela precisa se integrar com muitas partes do sistema todo para dar certo. Na operação "adicionar item" também nao faz sentido ser separado da aba de cadastrar e não o minimo de sentido eu cadastrar um pedido se na hora de adicionar o item a ser comprado, ele é adicionado ao pedido de venda. aqui precisa de muita correção de lógica de negócio. - Observação: Essa tela eu presumi que é para cadastar um pedido de compra porém temos a tela VSUP0200 onde também é sobre pedido de compras (ela também bem básica) se a VSUP0200 for de fato onde é o pedido de compra iremos precisar fazer a maioria das correções nesta tela e não ma VPDC0200 (valide a diferença entre as telas e o qse eu solicitei é valido a ser aplicado) e nessa analise inclusa a VSUP0300.

VSUP0500: Na aba "Vencimentos" precisamos que seja possivel listar todas as condições de pagamentos ja cadastradas no sistema ou o usuario inserir manualmente o código para facilitar. O mesmo para empresas, os campos dde Tipo NF,  conta financeira etc deve listar todas cadastrar no sistema já! E precisamos corrigir a lógica de Bloquear um fornecedor, pois hoje não está sendo possível bloquear um fornecedor.
 
VSUP0510: Essa tela ela precisa ser deletada e o que for necessário como a aba "parâmetros" adicionada a VSUP0500 para conseguimos centralizar todas as informações de fornecedores em uma tela só, então veja o que tem na VSUP0510 que nao tem na VSUP0500 e adicione na VSUP0500

VSUP0510: Precisamos evoluir a um nivel enterpise a conversão de unidades pois temos várias combinações possíveis e muitas coisas que não hoje não fazemos que são uteis tanto para os usuários quanto para o proprio sistema.

VSUP0120: Precisamos evoluir a um nivel enterprise também, pois criar uma tabela de compra precisa de muitas coisas que hoje não tem que são uteis tanto para os usuários quanto para o proprio sistema. E também temos o erro: enterprise, code and supplier are required

VSUP0130: Eu coloco o fornecedor mas também pede em baixo CÓD. NO FORNECEDOR, acredito ser informação duplicada, e o layout/leitura dos dados etc está horrivel de entender/ver/cadastrar etc

VCON0100: Tela desnecessária, não faz nada. Deve ser removida.

VCON0400: Precisa usar  status em PT-BR e não em inglês.

VCON0202: os erros precisam ser em PT-BR

VAVR0200: Layout totalmente quebrado/embaraçoso e com muitos campos sobrepostos.

VVOR0202: Veja se toda a lógica está correta e sendo bem aplicada.

VSUP0610: Vários textos/opções em inglês, erro também: scope must be GLOBAL, SUPPLIER, COST_CENTER or CATEGORY e invalid domain "RECEIVING"  Veja se toda a lógica está correta, sendo bem aplicada e se faz sentido

VSUP0620: Vários textos/opções em inglês e erro também: invalid message_type ". Veja se toda a lógica está correta e sendo bem aplicada.

VPDC0210: Os modais de Pedido inicial e pedido final etc devem ser possiveis mostrar todos ja cadastrados no sistema e a opção de inserir o código manualmente. Veja se toda a lógica está correta e sendo bem aplicada.

VTER0100: Temos o erro: freight_type must be FIXED or PERCENT ao tentar cadastrar. Também temos mensagens em inglês. Adicionar Rules para mim nao faz sentido, não entendi o proposito. Os modais de código/operação etc deve listar todos ja criados no sistema e a possibilidade de procurar usando o código. Veja se toda a lógica está correta e sendo bem aplicada. As mensagens de erro devem ser em PT-BR. Veja se toda a lógica está correta e sendo bem aplicada.


VTER0200: Os modais de código etc deve listar todos ja criados no sistema e a possibilidade de procurar usando o código, ao gerar/cadastar não está sendo retornado nada, ao tentar abrir uma ordem: third-party service record not found. Também atualize as mensagens em inglês como: PURCHASE REQUISITION CODE. Veja se toda a lógica está correta e sendo bem aplicada.


VTER0300: Os modais de código etc deve listar todos ja criados no sistema e a possibilidade de procurar usando o código.  Também atualize as mensagens dos campos etc em inglês para PT-BR. Ao consultar não retorna nada. Veja se toda a lógica está correta e sendo bem aplicada.

VTER0400: O modal de excluir precisa passar por estilização pois está horrivel e totalmente anti-padrão. Veja se essa tela não é repetição de informação em relação a VSUP0510. Se for repitção ou desnecesária unifique em um tela só (VSUP0510) se não for e for necessário manter essa tela, faça as correções e de o mesmo tratamento de melhora na conversão que eu passei para você fazer na VSUP0510. Veja se toda a lógica está correta e sendo bem aplicada.

VSUP0630: Várias mensagens/campos em inglês, erro ao cadastar/alterar: invalid purchase tolerance, uas operações chamadas cadastrar (a 2 segunda funciona) e o modal de excluir precisa passar por estilização pois está horrivel e totalmente anti-padrão. Veja se toda a lógica está correta e sendo bem aplicada.

VSUP0640: Várias mensagens/campos em inglês que precisam ser traduzidos e na operação alterar situação a nova situação permite colocar qualquer coisa porém acredito que esse campo é um enum! Veja se toda a lógica está correta e sendo bem aplicada.

 VSUP0650: Várias mensagens/campos em inglês que precisam ser traduzidos. 
 
VSUP0660: Várias mensagens/campos em inglês que precisam ser traduzidos, campo empresa o usuário não deve preencher, deve vir sozinho (o mesmo vale para as outras telas acima que exige o campo "empresa"). Aqui a 2 operações chanada "Cadastrar" - ambas dão erro. Veja se toda a lógica está correta e sendo bem aplicada.
 
 VSUP0670: Várias mensagens/campos em inglês que precisam ser traduzidos. Veja se toda a lógica está correta e sendo bem aplicada.
 
 VSUP0680: Várias mensagens/campos em inglês que precisam ser traduzidos. Veja se toda a lógica está correta e sendo bem aplicada. Aqui a 2 operações chanada "Cadastrar" - ambos com erro.



IMPORTANTE - NÃO FAÇA SEM LER:


* Por enquanto é isso, * busque no sistema erros parecidos para você já corrigir. Não pode ter palavras/frases etc em ingles, os campos de itens/classificações/planos/mascaras/caracteristicas e outras coisas deve ser possivel ver todas ja criadas no sistema e inserir o código manualmente, também todas as rotas/funcionalidades devem funcionar e comunicar com outras partes do sistema que sejam necessárias para tudo funcionar em alto nivel como um ERP deve ser e também as mensagens de erro devem ser em PT-BR!


* Para evoluir algumas correções, veja sempre como os grandes ERPs fazem e como podemos evoluir e implementar isso em nosso ERP. Tente identificar se há erros parecidos em outras partes do sistema para você ja fazer a correção e também verifique o que precisa mudar/evoluir/corrigir no backend, o que for necessário mudar/atualizar/corrigir/evoluir no backend, monte uma task completa em .ai/task. Tambem quando verificar essas telas veja se há pontos que conseguimos evoluir para realmente nos tornamos um ERP nivel enterprise como os grandes ERPs e proporcionar o melhor para nossos clientes. Corrija tudo o que listei, veja formas de melhorar e evoluir também so com isso diga  que toda a task foi 

* As mensagens de erro devem ser em PT-BR e entendiveis para os usuarios, afinal eles não são Devs ou coisas do tipo.

* TAMBÉM VEJA SE AS TELAS SE COMUNICAM COM AS OUTRAS PARTES DO SISTEMA QUE SÃO NECESSÁRIAS/IMPORTNATES, PARA QUE O ERP SEJA REALMENTE O MELHOR SISTEM AERP E TOTALMENTE FUNCIONAL.

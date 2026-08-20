# Plano de Treinamento — ERP Venture | Indústria Metalúrgica

**Carga horária total:** 16 horas · **Formato:** 4 ciclos de 4 horas
**Público:** usuários-chave e operadores dos setores da indústria
**Metodologia:** ensino por ordem lógica de processo (a jusante nunca antes da montante) + prática guiada na tela + fixação ao final de cada ciclo
**Documento:** estrutura geral dos 4 ciclos + **detalhamento completo do Ciclo 1** (para calibrar tom e profundidade)

---

## 0. Premissa metodológica — por que esta ordem

Um ERP industrial é uma corrente: cada elo consome o que o elo anterior produziu. Treinar "por setor solto" gera o clássico problema de *"a tela pede um dado que ninguém sabe de onde vem"*. Por isso a ordem de ensino segue a **cadeia de valor da metalúrgica**, não o organograma:

```
CADASTROS  →  ENGENHARIA  →  SUPRIMENTOS + ESTOQUE  →  PCP  →  PRODUÇÃO  →  VENDAS  →  FISCAL  →  FINANCEIRO
 (a base)     (o produto)      (o abastecimento)      (o plano)  (o chão)    (o giro)   (o imposto)  (o caixa)
```

Regra aplicada: **se o setor B depende de dados gerados no setor A, o ciclo de B só começa depois de A.** Ex.: o PCP (MRP) só faz sentido depois que Engenharia definiu a **estrutura (BOM)** e o **roteiro**, e depois que Estoque sabe o **saldo**. Produção só aponta ordens que o PCP **planejou**. Fiscal só emite nota do que Vendas **faturou**.

O sistema tem **213 telas em 18 módulos**. O treinamento **não** cobre 213 telas uma a uma — cobre o **fluxo troncal** de cada setor (as ~40 telas que movem o dia a dia) e ensina o usuário a *navegar e buscar* o resto com autonomia.

---

## 1. Cronograma e Ordem de Ensino (visão dos 4 ciclos)

| Ciclo | Bloco (4h) | Tema | Setores / Módulos | Depende de | Papel na corrente |
|:-:|:--|:--|:--|:--|:--|
| **1** | Fundação | **Cadastros, Parametrização e Engenharia** | Cadastros & Plataforma, Engenharia (itens, BOM, roteiro, desenhos, configurador) | — (é a base) | Define *o que* a fábrica compra, estoca e produz |
| **2** | Abastecimento | **Suprimentos, Estoque e Recebimento** | Suprimento/Compras, Almoxarifado, Inspeção, Importação | Ciclo 1 (itens/fornecedores) | Traz o material para dentro e o disponibiliza |
| **3** | Coração Industrial | **PCP e Chão de Fábrica** | Planejamento (MRP→CRP→APS), Produção, Manutenção | Ciclos 1 e 2 (BOM, roteiro, saldo) | Transforma plano em produto |
| **4** | Giro & Retaguarda | **Comercial, Custo, Fiscal, Financeiro** | Comercial/Vendas, PDV, Custos/Precificação, Fiscal, Financeiro, Contabilidade, Pós-venda | Todos os anteriores | Vende, fatura, recebe e fecha o caixa |

> **Observação de dependência circular (Vendas ⇄ PCP):** o MRP consome a **demanda de vendas** como uma de suas fontes. Como Vendas está no Ciclo 4 e o PCP no Ciclo 3, no Ciclo 3 apresentamos as **fontes de demanda** (pedido de venda, previsão, ponto de reposição) de forma conceitual; a operação plena da venda é aprofundada no Ciclo 4. Essa é a única "amarra" que quebra a linearidade — e é tratada explicitamente para o usuário não se perder.

### Sugestão de agenda por ciclo (ritmo de 4h)
- **0:00–0:15** — Abertura, contexto e "onde estamos na corrente"
- **0:15–1:45** — Bloco A (conceito + demonstração na tela)
- **1:45–2:00** — Intervalo
- **2:00–3:15** — Bloco B (prática guiada — cada usuário no seu ambiente)
- **3:15–3:45** — **Dinâmica de fixação** (exercício cronometrado)
- **3:45–4:00** — Dúvidas, checklist de saída e "gancho" para o próximo ciclo

---

## 2. Divisão por Setores Críticos (foco de cada um)

O objetivo aqui é garantir que **a operação não pare**: cada setor precisa dominar seu *fluxo troncal* antes de qualquer refinamento.

| Setor | Não pode sair sem saber | Risco se falhar |
|:--|:--|:--|
| **Cadastros / TI-Key user** | Cadastrar item/material, fornecedor, cliente; entender permissões e centros de custo | Todo o resto nasce errado |
| **Engenharia / PCE** | Montar **estrutura (BOM)**, **roteiro de fabricação** (operações, centros de trabalho, tempos), revisão de desenho | MRP e custo saem furados |
| **Compras / Suprimentos** | Requisição → cotação → **pedido de compra** → acompanhamento; contratos e tolerâncias | Falta de material para na produção |
| **Almoxarifado** | Entrada por recebimento, **movimentação**, lote/série, endereçamento, saldo | Estoque "mentiroso" trava MRP e apontamento |
| **Inspeção / Qualidade** | Roteiro de inspeção no recebimento, registro de resultado, **não-conformidade** e disposição | Material ruim entra na linha |
| **PCP / Planejamento** | **MRP → CRP → APS**, ordem inicial, leitura de alertas, sequenciamento | Fábrica produz o que não precisa |
| **Produção / Chão de Fábrica** | Abrir/apontar **Ordem de Produção**, consumo de material, ferramental, qualidade em processo | Chão sem rastreio, custo perdido |
| **Manutenção** | Plano preventivo, ordem de manutenção, avanço de status | Máquina para e derruba o APS |
| **Comercial / Vendas** | **Pedido de venda**, tabela de preço, política comercial, divisão de vendas | Receita e demanda inconsistentes |
| **Custos / Precificação** | Custo padrão, formação de preço, margem | Vende no prejuízo |
| **Fiscal** | Emissão **NF-e/CT-e**, natureza de operação, apuração | Multa, bloqueio de faturamento |
| **Financeiro / Contábil** | Contas a pagar/receber, fluxo de caixa, conciliação | Caixa cego |

---

## 3. Roteiro de Conteúdo por Ciclo (resumo — Ciclos 2 a 4)

> O Ciclo 1 está **detalhado por completo** na Seção 6. Abaixo, o esqueleto dos demais para dar a visão do todo.

### Ciclo 2 — Suprimentos, Estoque e Recebimento
- **Bloco A — Comprar:** Requisição de compra → Cotação/mapa comparativo → **Pedido de Compra** (aprovação, autorização) → Contratos de fornecimento e tolerâncias de PC.
- **Bloco B — Receber e estocar:** Aviso de recebimento → conferência → **Inspeção de recebimento** (roteiro, resultado, não-conformidade/disposição) → entrada em estoque, **lote/série**, endereçamento → consulta de saldo e movimentação. Pincelada em **Importação** (processo de importação, landed cost) para quem importa insumo metalúrgico.

### Ciclo 3 — PCP e Chão de Fábrica (o coração)
- **Bloco A — Planejar:** fontes de demanda (venda/previsão/reposição) → **MRP** (nº de ordem inicial, explosão da BOM) → **CRP** (capacidade × carga, gargalos) → **APS** (sequenciamento, quadro/Gantt) → alertas de planejamento.
- **Bloco B — Produzir:** abrir **Ordem de Produção** → consumo de materiais e alocação de lote → **apontamento** de operação → **ferramental** (ficha da ferramenta) → **qualidade em processo** (plano, registro, NC) → **manutenção preventiva** (plano, ordem, avanço).

### Ciclo 4 — Comercial, Custo, Fiscal e Financeiro
- **Bloco A — Vender e precificar:** **Pedido de Venda** → tabela de preço e política comercial → custo padrão e **formação de preço/margem** → pós-venda (assistência técnica, garantia).
- **Bloco B — Faturar e receber:** **NF-e / CT-e** (natureza da operação, emissão) → apuração fiscal → **Contas a Receber/Pagar** e fluxo de caixa → visão de contabilidade e fechamento.

---

## 4. Abordagem do Instrutor (fala e postura) — princípios gerais

**Tom:** consultor que *opera junto*, não professor que *disserta*. Toda funcionalidade é ensinada respondendo a pergunta silenciosa do usuário: *"o que isso resolve no meu dia?"*

Três muletas de linguagem que funcionam:
1. **Analogia física** — traduzir o abstrato para o chão de fábrica ("a estrutura/BOM é a *receita do bolo*; o roteiro é o *modo de preparo*").
2. **"De onde vem / para onde vai"** — sempre situar a tela na corrente ("esse saldo que você vê aqui foi o Almoxarifado que deu entrada no ciclo passado").
3. **Erro antes da regra** — mostrar o problema que a funcionalidade evita antes de mostrar o botão ("quando o estoque mente, o MRP compra o que já tem — deixa eu mostrar como travar isso").

---

## 5. Dinâmicas de Fixação (modelo geral)

Toda dinâmica é **cronometrada (15–25 min), na tela, com um "entregável"** verificável — nada de quiz teórico. Formato preferido: **"da entrada à saída"** (o usuário executa um mini-fluxo ponta a ponta do próprio ciclo). Modelos que se repetem:

- **Corrida do fluxo:** cada dupla executa o fluxo troncal do ciclo; ganha quem chega ao entregável correto (não quem chega primeiro — correção > velocidade).
- **Caça ao erro:** o instrutor deixa um cadastro/ordem propositalmente furado; a turma tem que achar e corrigir (ensina a ler o que o sistema reclama).

A dinâmica detalhada do Ciclo 1 está na Seção 6.3.

---

# 6. CICLO 1 — DETALHADO (Fundação: Cadastros, Parametrização e Engenharia)

> Este é o ciclo de referência para vocês avaliarem tom e profundidade. Os outros três seguirão exatamente este nível de detalhe.

**Duração:** 4h · **Pré-requisito:** nenhum (é a base) · **Público:** key-users de Cadastro/TI + Engenharia/PCE (e, como ouvintes, líderes de Compras e PCP, que consomem estes dados)

**Objetivo do ciclo:** ao final, o participante cadastra um item/material metalúrgico corretamente, entende parametrização e permissões, e monta a **estrutura (BOM)** e o **roteiro de fabricação** de um produto — os dois artefatos de que *todo o resto do ERP depende*.

**Mensagem-síntese do ciclo (repetir na abertura e no fecho):**
> *"Nada no sistema funciona melhor do que o cadastro que o alimenta. Hoje a gente constrói a fundação: se ela estiver de pé, compras, estoque, PCP e custo vão andar sozinhos."*

### 6.1 Roteiro de conteúdo — passo a passo na tela

#### Bloco A (0:15–1:45) — A base: cadastros e parametrização

**A1. Panorama e navegação (15 min)**
- Mostrar a **Dashboard**: as 3 grandes áreas (Comercial & Vendas, Industrial & Produção, Administrativo & Financeiro) e a **busca por código de tela** (ex.: digitar o código e cair direto na rotina).
- Ensinar a **lógica dos códigos** (prefixo por módulo + número) e a busca por nome — o usuário nunca vai decorar 213 telas; vai *procurar*.
- Login e identidade: quem sou eu no sistema, meu papel/permissão.

**A2. Cadastro de Item / Material (35 min)** — *o cadastro mais importante da metalúrgica*
- Abrir a rotina de **cadastro de item**. Demonstrar campos que **importam a jusante**: código, descrição, **unidade de medida**, classificação, se é **comprado × fabricado** (define se vira PC ou OF), item de estoque, controle por **lote/série**.
- Amarrar ao contexto metalúrgico: matéria-prima (chapa, barra, perfil), item de transformação, produto acabado — e como o *tipo* muda o comportamento no MRP.
- Mostrar o vínculo **item × fornecedor** e **conversão de unidade** (compra em kg, estoca em kg, consome em peça) — clássico da metalurgia.

**A3. Cadastros de apoio (20 min)** — passar rápido, mostrando *onde ficam*:
- **Fornecedor** e **Cliente** (visão geral — serão aprofundados nos Ciclos 2 e 4).
- **UFs/Países**, **centros de custo**, **centros de trabalho/máquinas** (ganchos que Engenharia e PCP vão usar no Bloco B).

**A4. Parametrização e permissões (20 min)**
- Como o sistema separa **o que cada perfil pode ver/fazer** — e por que isso protege a operação (não é burocracia, é rede de segurança).
- Onde ficam os parâmetros que mudam o comportamento das rotinas (sem entrar em cada flag — mostrar o conceito e onde procurar).

#### Bloco B (2:00–3:15) — Engenharia: o produto ganha forma

> Gancho de transição: *"Cadastramos as peças soltas. Agora vamos ensinar o sistema a **montar o produto** com elas — e a **saber fabricá-lo**."*

**B1. Estrutura de Produto / BOM (30 min)** — *a "receita"*
- Abrir o **cabeçalho de estrutura (BOM)**: versão, tipo (**EBOM** de engenharia × **MBOM** de manufatura) e status (rascunho → aprovada → obsoleta).
- Montar a estrutura de um produto metalúrgico simples: componentes, quantidades, perdas/refugo.
- Fala-chave: *"Essa árvore é o que o MRP vai 'explodir' no Ciclo 3 para saber o que comprar e o que fabricar. Um componente esquecido aqui = uma falta de material lá na frente."*

**B2. Roteiro de Fabricação (30 min)** — *o "modo de preparo"*
- Abrir o **roteiro**: sequência de **operações**, **centro de trabalho** de cada uma, **tempos** (setup + processo), recursos.
- Mostrar recursos alternativos e ferramentas por operação (visão geral — o ferramental é aprofundado no Ciclo 3).
- Fala-chave: *"O roteiro é o que alimenta o CRP (capacidade) e o custo. Sem tempo de operação, o sistema não sabe quanto tempo de máquina o pedido consome nem quanto custa."*

**B3. Complementos de engenharia (15 min)** — mostrar onde estão, sem aprofundar:
- **Desenhos técnicos** (revisão/vigência), **configurador de produto** e **PDM** (grupos/modificadores/atributos) — dizer para quem serve e deixar como "aprofundamento pós-treinamento".

### 6.2 Falas do instrutor — trechos prontos (Ciclo 1)

- **Abertura:** *"Quem já viu o sistema 'errar' uma compra ou uma ordem? Quase sempre a raiz não está na tela que errou — está num cadastro lá atrás. Hoje a gente cuida da raiz."*
- **No item comprado × fabricado:** *"Esse joguinho aqui — comprado ou fabricado — é o interruptor mais importante da metalúrgica. Comprado, o sistema gera pedido pro fornecedor. Fabricado, ele gera ordem pro chão. Marque errado e o material nunca chega ou nunca é feito."*
- **Na BOM:** *"Pensa na estrutura como a receita do bolo, e no roteiro como o modo de preparo. A receita diz **o quê** e **quanto**; o modo de preparo diz **como** e **quanto tempo**. O ERP precisa dos dois pra fazer qualquer conta."*
- **Sobre erro de cadastro (desmistificar o medo):** *"Errar cadastro é normal e é reversível. O grave é errar e não perceber — por isso a gente confere antes de seguir."*

### 6.3 Dinâmica de fixação — Ciclo 1 (30 min)

**"Do parafuso ao produto" — mini-fluxo ponta a ponta**

- **Setup:** cada dupla recebe uma ficha com um produto metalúrgico simples (ex.: um suporte soldado: chapa + 2 parafusos + 1 operação de corte + 1 de solda).
- **Tarefa (cronometrada, 20 min):**
  1. Cadastrar os itens faltantes (com unidade e tipo comprado/fabricado corretos).
  2. Montar a **estrutura (BOM)** do produto.
  3. Montar o **roteiro** com as 2 operações e seus centros de trabalho/tempos.
  4. Aprovar a estrutura.
- **Entregável verificável:** produto com BOM aprovada + roteiro com tempos. O instrutor valida em cada máquina.
- **Fechamento (5 min):** *"Vocês acabaram de construir, em 20 minutos, a base que o setor de Compras vai usar amanhã de manhã. No Ciclo 2, a gente compra esse material."* (gancho para o próximo ciclo).

### 6.4 Checklist de saída do Ciclo 1 (o instrutor confere antes de encerrar)
- [ ] Sabe navegar por código/nome de tela e entende as 3 áreas do sistema.
- [ ] Cadastra item com unidade, classificação e tipo comprado/fabricado corretos.
- [ ] Sabe onde ficam fornecedor, cliente, centro de custo e centro de trabalho.
- [ ] Monta e aprova uma estrutura (BOM).
- [ ] Monta um roteiro com operações e tempos.

---

## 7. Próximos passos sugeridos

1. **Validar tom e profundidade** deste Ciclo 1 (é o gabarito dos demais).
2. Definir se o formato ideal é **4×4h** (proposto) ou **2×8h** (mais intenso, menos fixação) — recomendo **4×4h** por causa da curva de retenção e das dinâmicas.
3. Confirmar os **participantes por ciclo** (alguns key-users participam de mais de um).
4. Após o aval, detalho **Ciclos 2, 3 e 4** neste mesmo padrão, incluindo as telas específicas de cada fluxo troncal.

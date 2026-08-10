# DIA 1 — Fundação: Cadastros, Parametrização e Engenharia

**Duração:** 4h · **Pré-requisito:** nenhum (é a base da corrente)
**Público principal:** key-users de Cadastro/TI + Engenharia/PCE · **Ouvintes:** líderes de Compras e PCP (que consomem estes dados)

> **Onde estamos na corrente:** `[CADASTROS → ENGENHARIA] → Suprimentos → PCP → Produção → Vendas → Fiscal → Financeiro`
> Hoje construímos a **fundação**. Nada no sistema funciona melhor do que o cadastro que o alimenta.

**Ao final, o participante consegue:** cadastrar um item/material metalúrgico correto, entender parametrização e permissões, e montar a **estrutura (BOM)** e o **roteiro de fabricação** de um produto.

---

## Agenda cronometrada (4h)

| Horário | Bloco | Conteúdo |
|:--|:--|:--|
| 0:00–0:15 | Abertura | Contexto, a corrente, mensagem-síntese |
| 0:15–1:45 | **Bloco A** | Navegação + Cadastros base + Parametrização + Permissões |
| 1:45–2:00 | Intervalo | — |
| 2:00–3:15 | **Bloco B** | Engenharia: Item → Estrutura (BOM) → Roteiro |
| 3:15–3:45 | **Dinâmica** | "Do parafuso ao produto" |
| 3:45–4:00 | Fecho | Dúvidas + checklist de saída + gancho para o Dia 2 |

**Mensagem-síntese:**
> *"Hoje a gente constrói a fundação. Se ela estiver de pé, Compras, Estoque, PCP e Custo vão andar quase sozinhos. Se ela estiver torta, todo o resto herda o erro."*

---

## Bloco A — A base: cadastros e parametrização (0:15–1:45)

### A1. Navegação e panorama (15 min)
Abrir a **Dashboard** e mostrar:
- As **3 grandes áreas**: Comercial & Vendas, Industrial & Produção, Administrativo & Financeiro.
- A **busca por código de tela** (ex.: digitar `VENT0200` e cair direto no cadastro de itens) e a busca por nome.
- A lógica dos códigos: prefixo do módulo + número.

🗣 **Fala:** *"São mais de 200 telas. Ninguém decora isso — e nem precisa. Você vai **procurar**. Decore só o fluxo do seu setor; o resto o sistema acha pra você."*

### A2. Cadastros de plataforma (20 min)
Passar mostrando **onde ficam** (sem esgotar cada campo):

| Ordem | Tela | O que é | Papel |
|:-:|:--|:--|:--|
| 1 | `VEMP0100` | Cadastro de Empresa | Identidade da(s) fábrica(s) — multi-empresa |
| 2 | `VFUN0100` | Cadastro de Funcionário | Quem opera; base de responsáveis |
| 3 | `VSEC0100` / `VUSR0100` | Troca de senha (solicitação/aprovação) | Autonomia + segurança |
| 4 | `VLOC0100` | Localização (Países e UFs) | Base fiscal/logística (usada em cliente/fornecedor) |
| 5 | `VCLA0100` | Classificação de Itens | Agrupa itens — usada no MRP, custo e compras |
| 6 | `VCAL0100` | Calendário Industrial | Dias úteis da fábrica — o PCP conta em cima disso |
| 7 | `VPRI0100` | Prioridade de Ordens | Etiqueta automática por **quantidade** da ordem planejada |
| 8 | `VCTB0102` | Centro de Custo | Para onde vão custos de produção/compra |

🗣 **Fala (calendário):** *"Esse calendário parece detalhe, mas é ele que diz ao sistema quando a fábrica trabalha. É a régua que o PCP usa lá no Dia 3 pra prometer data. Feriado errado aqui = promessa de entrega errada lá."*

### A3. PDM — a descrição técnica (10 min) — **pré-requisito do cadastro de item**

**Telas:** `VITE0114` (Grupos) · `VITE0115` (Modificadores) · `VITE0116` (Atributos)

▶ **Por que agora e não depois:** o item guarda um **ponteiro** para Grupo e
Modificador. Se eles não existirem, o cadastro de item é **recusado** — a turma
trava no primeiro item. Este bloco tem de vir antes do A4.

1. `VITE0114` — criar um **Grupo** (ex.: `CHAPAS`): código sugerido automaticamente + descrição + empresa.
   ⚠️ O código é **imutável** e não há exclusão.
2. `VITE0115` — criar um **Modificador** (ex.: `Chapa Aço Carbono`): só descrição,
   o Código é automático. ⚠️ É **global**: serve para qualquer grupo.
3. `VITE0116` — montar os **Atributos** (`{Liga: 1020, Espessura: 6,35mm}`) e ver
   a descrição composta. ⚠️ Esta tela **não salva nada sozinha** — ela monta.

🗣 **Fala:** *"A descrição técnica não é digitada livre. Ela é composta: Grupo + Modificador + Atributos. É assim que a indústria fala, e é assim que o sistema guarda. Sem isso cadastrado, o item nem entra."*

▶ **Antes da aula:** rode `npm run e2e:fundacao` — ele avisa se o ambiente estiver sem grupo/modificador.

### A4. Cadastro de Item / Material — **o mais importante da metalúrgica** (30 min)

**Tela:** `VENT0200` — Cadastro de Itens (complemento: `VITM0100` — Item & Prontidão para o MRP)

▶ **O que criar (ao vivo, um item de matéria-prima e um produto acabado):**
1. **Código** — **número inteiro maior que zero** (não aceita letras) — e o **Nome**.
2. **Grupo e Modificador PDM** — escolhidos na **lista de busca** (os que foram criados no A3). São **obrigatórios**.
3. **Unidade de medida** — a fábrica compra em `KG`, estoca em `KG`, consome em peça? Isso importa. ⚠️ A lista é **fechada**: `UN KG M M2 M3 MM CM IN MICROMETRO TONELADA`.
4. **Natureza** — `Item Base` / `Genérico` / `Configurado`. É **um campo só**; o item-base é apenas um modelo opcional para copiar configurações.
5. **Comprado × Fabricado** — *o interruptor mais importante*: comprado gera **pedido de compra**; fabricado gera **ordem de produção**.
6. **LLC** (aba Planejamento) — `1` produto final, `2`–`8` intermediários, `9` matéria-prima.
7. Em `VITM0100`, revisar a **prontidão para o MRP** (o que falta para o item "rodar" no planejamento).

▶ **Comercial e Contábil:** preencha os campos relevantes para o exercício. As
duas abas são gravadas junto com o item e podem ser conferidas ao reabrir o cadastro.

🗣 **Fala (comprado × fabricado):** *"Esse joguinho — comprado ou fabricado — decide o destino do item. Marca comprado e o sistema vai atrás do fornecedor; marca fabricado e ele manda pro chão de fábrica. Erra aqui e o material nunca chega ou nunca é feito."*

🗣 **Fala (unidade):** *"Comprar em quilo e consumir em peça é o dia a dia de vocês. A conversão a gente cadastra no Dia 2, mas ela começa aqui, na unidade do item."*

### A5. Parametrização e permissões (15 min)
- Mostrar como o sistema separa **o que cada perfil pode ver/fazer** (segurança da operação).
- `VADM0100` / `VAUD0100` — **trilha de auditoria**: o sistema registra quem fez o quê.

🗣 **Fala (auditoria):** *"O sistema anota tudo, não pra vigiar vocês, mas pra proteger vocês: quando algo dá errado, dá pra ver o que aconteceu e desfazer, em vez de virar caça às bruxas."*

---

## Bloco B — Engenharia: o produto ganha forma (2:00–3:15)

🗣 **Transição:** *"Cadastramos as peças soltas. Agora vamos ensinar o sistema a **montar o produto** com elas — e a **saber fabricá-lo**."*

### B0. Máquinas e centros de trabalho (10 min) — pré-requisito do roteiro
| Tela | O que é |
|:--|:--|
| `VMAQ0101` | Tipos de Máquina (corte, dobra, solda, usinagem…) |
| `VMAQ0200` | Máquinas, Tempos e Cálculo |
| `VMAQ0300` | Tempos e Programação de Máquina |

▶ **O que fazer:** conferir/cadastrar as máquinas-tipo da metalúrgica. Elas serão os **centros de trabalho** das operações do roteiro.

Na `VMAQ0300`, use a **lupa** para escolher a máquina e o item já cadastrados. Mostre que situações e datas aparecem em português e que a tela descreve a ação de negócio, sem expor endereços técnicos da API.

### B0.1. Máscara do item configurado (10 min) — antes da BOM

Se o produto for configurado, abra `VITE0313`, pesquise o item e o Grupo PDM, selecione as características, simule e **persista** a máscara. Na `VBOM0100`, confirme que essa máscara aparece na lista pesquisável; o participante não deve copiar nem digitar uma máscara longa manualmente.

### B1. Estrutura de Produto / BOM — a "receita" (30 min)

**Telas:** `VBOM0100` — Cabeçalhos de Estrutura (BOM) · `VENT0210` / `VENG0300` — Estrutura de Produtos

▶ **O que criar (a estrutura de um produto simples):**
1. Em `VBOM0100`, criar o **cabeçalho da estrutura**: versão, **tipo (EBOM** engenharia × **MBOM** manufatura**)** e situação (**Rascunho** → **Aprovado** → **Obsoleto**).
2. Em `VENT0210`, adicionar os **componentes**: item-filho, **quantidade** e **perda/refugo** (crítico na metalurgia — sobra de chapa, aparas).
3. **Aprovar** a estrutura (mudar a situação para **Aprovado**).

🗣 **Fala:** *"Essa árvore é a receita do bolo: diz **o quê** e **quanto** entra no produto. É exatamente isso que o MRP vai 'explodir' no Dia 3 pra saber o que comprar e o que fabricar. Um componente esquecido aqui vira uma falta de material lá na frente."*

⚠️ **Ponto de atenção:** estrutura em **Rascunho** **não** é considerada pelo planejamento. Mostrar que aprovar é o que "liga" a BOM.

### B2. Roteiro de Fabricação — o "modo de preparo" (30 min)

**Telas:** `VPRO0100` / `VENT0202` — Roteiro de Fabricação · `VENT0115` — Roteiro Padrão · `VENG0600` — Rede de Precedência

▶ **O que criar (o roteiro do mesmo produto):**
1. Criar a **sequência de operações** (ex.: 10-Corte → 20-Dobra → 30-Solda → 40-Acabamento).
2. Para cada operação, definir o **centro de trabalho** (máquina-tipo do B0) e os **tempos**: **setup** + **processo**.
3. (Visão geral) recursos alternativos e ferramentas por operação — o **ferramental** é aprofundado no Dia 3.

🗣 **Fala:** *"Se a BOM é a receita, o roteiro é o modo de preparo: **como** e **em quanto tempo**. É o roteiro que alimenta o CRP (capacidade) e o custo. Sem tempo de operação, o sistema não sabe quanto de máquina o pedido consome nem quanto custa."*

### B3. Complementos de engenharia (5 min) — mostrar onde ficam, sem aprofundar
- `VDES0100` / `VENG0400` — **Desenhos técnicos** (revisão/vigência).
- `VCFG0100`–`VCFG0600` — **Configurador de Produto** (produto configurável sob medida).
- `VPME0102` — **Parâmetros de Promessa de Entrega**.

🗣 **Fala:** *"Isso é o 'segundo andar' da engenharia. Fica de referência pra quando vocês forem além do básico. Hoje o que trava a fábrica é item + BOM + roteiro — e isso vocês já dominam."*

## 🎯 Dinâmica de fixação — "Do parafuso ao produto" (30 min)

**Setup:** cada dupla recebe a ficha de um produto metalúrgico simples — ex.: **suporte soldado** = 1 chapa + 2 parafusos, com operações de **corte** e **solda**.

**Tarefa cronometrada (20 min):**
1. Cadastrar os itens faltantes (`VENT0200`) com unidade e tipo comprado/fabricado corretos.
2. Montar a **estrutura/BOM** (`VBOM0100` + `VENT0210`).
3. Montar o **roteiro** (`VPRO0100`) com as 2 operações, centros de trabalho e tempos.
4. **Aprovar** a estrutura.

**Entregável verificável:** produto com **BOM aprovada + roteiro com tempos**. O instrutor valida em cada máquina.


**Fechamento (5 min):**
🗣 *"Vocês acabaram de construir, em 20 minutos, a base que o Compras vai usar amanhã. **No Dia 2, a gente compra esse material** e coloca ele no estoque."*

---

## ✅ Checklist de saída do Dia 1
- [ ] Navega por código/nome de tela e entende as 3 áreas do sistema.
- [ ] Cadastra item com unidade, classificação e **comprado/fabricado** corretos (`VENT0200`).
- [ ] Sabe onde ficam empresa, funcionário, UF, classificação, calendário e centro de custo.
- [ ] Cadastra/entende máquinas e centros de trabalho (`VMAQ*`).
- [ ] Monta e **aprova** uma estrutura/BOM (`VBOM0100` / `VENT0210`).
- [ ] Monta um roteiro com operações e tempos (`VPRO0100`).

**Gancho para o Dia 2:** *"Temos o produto definido. Amanhã, o desafio é: **como o material entra na fábrica?** Vamos comprar, receber, inspecionar e estocar."*

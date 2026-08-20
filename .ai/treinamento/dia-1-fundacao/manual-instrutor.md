# DIA 1 — FUNDAÇÃO · Manual do Instrutor

**Cadastros, Parametrização, Plataforma e Engenharia**

| | |
|:--|:--|
| **Carga horária** | 4 horas (bloco único, com 15 min de intervalo) |
| **Público principal** | Key-users de Cadastro/TI · Engenharia / PCE |
| **Ouvintes recomendados** | Líderes de Compras, PCP e Custos (consomem estes dados) |
| **Pré-requisito** | Nenhum — este é o primeiro elo da corrente |
| **Telas no escopo** | 45 telas (12 troncais · 14 de apoio · 19 de referência) |
| **Entregável do dia** | 1 produto metalúrgico com **BOM aprovada** e **roteiro com tempos** |

> **Posição na corrente:**
> `[CADASTROS → ENGENHARIA] → Suprimentos → PCP → Produção → Vendas → Fiscal → Financeiro`

---

## Índice

1. [Objetivos de aprendizagem](#1-objetivos-de-aprendizagem)
2. [Preparação do instrutor (antes do dia)](#2-preparação-do-instrutor-antes-do-dia)
3. [Mapa completo das telas do Dia 1](#3-mapa-completo-das-telas-do-dia-1)
4. [Agenda minuto a minuto](#4-agenda-minuto-a-minuto)
5. [Abertura (0:00–0:15)](#5-abertura-000015)
6. [Bloco A — A base: plataforma, cadastros e parametrização (0:15–1:45)](#6-bloco-a--a-base-plataforma-cadastros-e-parametrização-015145)
7. [Bloco B — Engenharia: o produto ganha forma (2:00–3:15)](#7-bloco-b--engenharia-o-produto-ganha-forma-200315)
8. [Dinâmica de fixação + gabarito](#8-dinâmica-de-fixação--gabarito)
9. [Fecho e gancho para o Dia 2](#9-fecho-e-gancho-para-o-dia-2)
10. [Troubleshooting — erros que vão acontecer na sala](#10-troubleshooting--erros-que-vão-acontecer-na-sala)
11. [Perguntas que a turma sempre faz (com respostas)](#11-perguntas-que-a-turma-sempre-faz-com-respostas)
12. [Checklist de saída e avaliação](#12-checklist-de-saída-e-avaliação)
13. [Anexo A — Dados-semente do produto-exemplo](#anexo-a--dados-semente-do-produto-exemplo)
14. [Anexo B — Glossário do Dia 1](#anexo-b--glossário-do-dia-1)

---

## 1. Objetivos de aprendizagem

Ao final do Dia 1, o participante deve ser capaz de — **na tela, sem ajuda**:

| # | Competência | Evidência verificável |
|:-:|:--|:--|
| 1 | Navegar no ERP por **código** e por **nome** de tela | Abre `VENT0200` digitando o código |
| 2 | Explicar a lógica de prefixos dos códigos de tela | Identifica o módulo de um código novo |
| 3 | Cadastrar um **item** metalúrgico completo nas 7 abas | Item salvo com UM, tipo e origem fiscal |
| 4 | Diferenciar **Comprado × Fabricado × De terceiro × Serviço** | Explica o que cada tipo gera no MRP |
| 5 | Rodar o **checklist de prontidão** do item | Item aparece ✅ pronto em `VITM0100` |
| 6 | Montar a descrição técnica via **PDM** (Grupo + Modificador + Atributos) | Objeto `pdm` colado no item |
| 7 | Criar **cabeçalho de BOM** e mover status `RASCUNHO → APROVADO` | Versão APROVADO vigente |
| 8 | Montar a **estrutura (BOM)** com quantidades e perdas | Árvore com ≥ 2 componentes |
| 9 | Cadastrar **tipos de máquina** e **máquinas** com capacidade e eficiência | Máquina criada e tempo calculado |
| 10 | Montar o **roteiro de fabricação** com operações, CT e tempos | Roteiro marcado como **Padrão** |
| 11 | Definir **dependências** entre operações e ler o **lead time (CPM)** | Caminho crítico exibido |

**Meta de aprovação do dia:** 9 das 11 competências demonstradas.

---

## 2. Preparação do instrutor (antes do dia)

### 2.1 Ambiente

- [ ] Ambiente **de treinamento** (nunca produção), com base de dados restaurável.
- [ ] **Empresa cadastrada** (`VEMP0100`) com CNPJ válido, regime tributário e endereço completo — sem isso nenhuma tela carrega direito.
- [ ] **Países e UFs** (`VLOC0100` / `VUTL0555`) populados, com código IBGE.
- [ ] **Calendário industrial** (`VCAL0100`) do ano corrente já configurado (feriados marcados).
- [ ] Um **login por participante**, com o perfil do setor dele (`USER`), e um login `ADMIN` para o instrutor.
- [ ] Projetor / compartilhamento de tela + **cada participante na própria máquina**.
- [ ] **Snapshot do banco** tirado antes da aula (para restaurar se a turma "quebrar" a base).

### 2.2 Dados-semente que devem existir ANTES da aula

| Cadastro | Tela | O que deixar pronto |
|:--|:--|:--|
| Empresa | `VEMP0100` | 1 matriz completa |
| UFs / Países | `VLOC0100`, `VUTL0555` | Ao menos SP, MG, RS, SC + Brasil |
| Classificação de itens | `VCLA0100` | 1 máscara `99.99.99` + classificações de metalurgia |
| Calendário | `VCAL0100` | Ano corrente, feriados nacionais marcados |
| Prioridades | `VPRI0100` | Faixas de **quantidade da ordem**: Baixa 1–10 · Normal 11–30 · Alta 31–70 · Urgente 71–1000 |
| Centros de custo | `VFIN0130` / `VCTB0102` | 1 PRODUTIVO, 1 ADMINISTRATIVO |
| Grupos PDM | `VITE0114` | `CHAPAS`, `PARAFUSOS`, `CONJUNTOS` |
| Modificadores PDM | `VITE0115` | `Chapa Aço Carbono`, `Parafuso Sextavado`, `Suporte Soldado` |
| Tipos de máquina | `VMAQ0101` | `CUT` (Corte), `BEND` (Dobra), `WELD` (Solda) |

> ⚠️ **Não deixe pronto:** o item, a BOM e o roteiro do produto-exemplo. Eles são o entregável da turma.

### 2.3 O que testar você mesmo, na véspera

1. Criar um item completo em `VENT0200` — cronometre; é a demo mais longa do dia.
2. Rodar **Prontidão** em `VITM0100` e ver o checklist com pendências.
3. Criar cabeçalho de BOM (`VBOM0100`), adicionar componentes (`VENT0210`) e **aprovar**.
4. Criar roteiro (`VPRO0100`), adicionar 2 operações, ligar dependência (`VENG0600`) e calcular **lead time (CPM)**.
5. Rodar o **cálculo de tempo** em `VMAQ0200` e ver a sinalização de **gargalo**.

### 2.4 Materiais impressos

- Ficha do produto-exemplo (**Anexo A**) — 1 por dupla.
- Apostila do participante (`apostila-participante.md`) — 1 por pessoa.
- Cartão "cola" com os códigos troncais do dia.

---

## 3. Mapa completo das telas do Dia 1

As 44 telas do escopo, em 3 níveis de profundidade. **Nada do Dia 1 fica de fora** — o que não é demonstrado ao vivo é localizado na tela e detalhado na apostila do participante.

### 3.1 Troncais — demonstrar ao vivo + praticar (12)

| Código | Tela | Por que é troncal |
|:--|:--|:--|
| `VENT0200` | Cadastro de Itens | Cadastro mais importante do ERP; 7 abas alimentam todos os módulos |
| `VITM0100` | Item & Prontidão para o MRP | Checklist que diz se o item "roda" no planejamento |
| `VBOM0100` | Cabeçalhos de Estrutura (BOM) | Versiona a BOM; só `APROVADO` conta para o MRP |
| `VENT0210` | Estrutura de Produtos (BOM) | As linhas da receita: componente, quantidade, perda |
| `VENG0300` | Cabeçalho e Situação da BOM | Tipo `EBOM`/`MBOM`, vigência e transição de status |
| `VPRO0100` | Roteiro de Fabricação (PCP) | Operações, CT, dependências e **lead time CPM** |
| `VENT0202` | Roteiro de Fabricação (Engenharia) | Visão por item: operação, CT, tempo, homens, origem |
| `VENG0600` | Rede de Precedência do Roteiro | Predecessor → sucessor com **overlap** |
| `VMAQ0101` | Tipos de Máquina | Categoria do equipamento + **requer operador** |
| `VMAQ0200` | Máquinas, Tempos e Cálculo | Capacidade, eficiência, tempo item×máquina, **gargalo** |
| `VCLA0100` | Classificação de Itens | Máscara + hierarquia que agrupa o item |
| `VCAL0100` | Calendário Industrial | A régua de dias úteis que o PCP usa para prometer data |

### 3.2 Apoio — demonstrar rápido, localizar na tela (14)

| Código | Tela | Papel no Dia 1 |
|:--|:--|:--|
| `VEMP0100` | Cadastro de Empresa | Fundação: identidade e regime tributário |
| `VFUN0100` | Cadastro de Funcionário | Base de responsáveis e técnicos |
| `VLOC0100` | Localização Países/UFs | Base geográfica primária |
| `VUTL0555` | Cadastro de UFs e Países | Complemento com IBGE (usado na NF-e) |
| `VPRI0100` | Prioridade de Ordens | Etiqueta automática por **quantidade** da ordem planejada (lida pelo APS/MRP) |
| `VFIN0130` | Centros de Custo (Financeiro) | Para onde vão as despesas |
| `VCTB0102` | Centro de Custo (Contábil) | Mesmo conceito, com vínculo a empresa e Ativo/Inativo |
| `VITE0114` | Grupos PDM | 1ª dimensão da descrição técnica |
| `VITE0115` | Modificadores PDM | 2ª dimensão da descrição técnica |
| `VITE0116` | Atributos PDM (montador) | 3ª dimensão: pares nome:valor |
| `VENT0204` | Cadastro de Grupo PDM | Raiz do configurador (variante do VITE0114) |
| `VENG0500` | Consulta Avançada de Estruturas | **Onde usado** (pesquisa inversa) |
| `VSEC0100` | Solicitação/Aprovação de Troca de Senha | Autonomia + segurança |
| `VADM0100` | Trilha de Auditoria | "O sistema anota tudo — para proteger vocês" |

### 3.3 Referência — mostrar onde fica, aprofundar depois (19)

| Código | Tela | Quando o usuário vai precisar |
|:--|:--|:--|
| `VUSR0100` | Solicitações de Troca de Senha | Fluxo administrativo de senha |
| `VAUD0100` | Log de Auditoria | Consulta de "quem mexeu no quê" |
| `VENT0108` | Calendário Financeiro/Industrial | Calendário corporativo alternativo |
| `VCAL0200` | Dias Úteis Prometidos por Item | Conferência do calendário de promessa |
| `VPME0102` | Parâmetros de Promessa de Entrega | Master switch do módulo de promessa |
| `VPME0102ITE` | Calendário de Promessa por Item | Exceções de calendário por item |
| `VENT0115` | Roteiro Padrão | Template reutilizável de roteiro |
| `VENT0363` | Relatório Tempo CT | Horas e custo por centro de trabalho |
| `VMAQ0300` | Tempos e Programação de Máquina | Registro de tempo e agenda da máquina |
| `VDES0100` | Desenhos Técnicos | Cadastro + histórico de revisões |
| `VENG0400` | Desenhos, Revisões e Distribuição | Revisão vigente + distribuição controlada |
| `VENG0610` | Seriais Físicos de Ferramentas | Rastreio da unidade física da ferramenta |
| `VITE0129` | Replicação de Parâmetros | Copiar parâmetros entre itens em lote |
| `VITE0313` | Geração de Máscara de Itens Configurados | Gera o código do item configurado |
| `VITE0118` | Regras de Itens Configurados | Mapeia característica → campo de destino |
| `VENG0204` | Regras de Variáveis Equivalentes | Componente escolhido por condição |
| `VCFG0100`–`VCFG0600` | Configurador de Produto (6 telas) | Produto sob medida (conjuntos, características, regras) |
| `VUTL0560` | Consulta de UF e Região Comercial | Consulta pontual |

> 🗣 **Como apresentar o nível 3:** *"Esse é o segundo andar da engenharia. Eu não vou ensinar hoje — vou mostrar onde fica e para que serve, para que no dia em que vocês precisarem, saibam que existe e onde procurar. O que trava a fábrica é item + BOM + roteiro, e isso vocês vão dominar hoje."*

---

## 4. Agenda minuto a minuto

| Horário | Duração | Bloco | Conteúdo | Formato |
|:--|:-:|:--|:--|:--|
| 0:00–0:05 | 5' | Abertura | Apresentação, contrato de convivência | Fala |
| 0:05–0:15 | 10' | Abertura | A corrente dos 4 dias + mensagem-síntese | Fala + diagrama |
| 0:15–0:30 | 15' | **A1** | Navegação, Dashboard, busca por código | Demo |
| 0:30–0:50 | 20' | **A2** | Cadastros de plataforma (8 telas) | Demo rápida |
| 0:50–1:00 | 10' | **A3** | PDM: como nasce a descrição técnica | Demo |
| 1:00–1:35 | 35' | **A4** | Cadastro de Item — as 7 abas ⭐ | Demo + prática |
| 1:35–1:45 | 10' | **A5** | Permissões, senha e auditoria | Demo |
| 1:45–2:00 | 15' | — | **Intervalo** | — |
| 2:00–2:12 | 12' | **B0** | Máquinas e centros de trabalho | Demo |
| 2:12–2:42 | 30' | **B1** | Estrutura / BOM ⭐ | Demo + prática |
| 2:42–3:05 | 23' | **B2** | Roteiro de fabricação ⭐ | Demo + prática |
| 3:05–3:15 | 10' | **B3** | Complementos: desenhos, configurador, PDM avançado | Tour |
| 3:15–3:45 | 30' | **Dinâmica** | "Do parafuso ao produto" | Prática em dupla |
| 3:45–4:00 | 15' | Fecho | Checklist de saída + gancho Dia 2 | Fala |

**Regra de ritmo:** se atrasar, corte tempo do **B3** (tour de complementos) — nunca do B1/B2. A BOM e o roteiro são o entregável do dia.

---

## 5. Abertura (0:00–0:15)

### 5.1 Quebra-gelo dirigido (3 min)

Pergunte à sala, e **anote as respostas no flip chart** — você vai usá-las no fecho:

> *"Quem já viu o sistema — qualquer sistema — 'errar' uma compra, uma ordem ou um estoque? Me conta um caso."*

Depois de 2–3 relatos, faça a amarração:

🗣 *"Reparem numa coisa: em quase todos esses casos, a raiz do erro não estava na tela que errou. Estava num cadastro lá atrás. Hoje a gente cuida da raiz."*

### 5.2 A corrente (7 min)

Desenhe (ou projete) o diagrama e explique **por que a ordem do treinamento é essa**:

```
DIA 1              DIA 2                    DIA 3            DIA 4
CADASTROS ──▶ ENGENHARIA ──▶ SUPRIMENTOS+ESTOQUE ──▶ PCP ──▶ PRODUÇÃO ──▶ VENDAS ──▶ FISCAL ──▶ FINANCEIRO
 (a base)      (o produto)     (o abastecimento)      (o plano)  (o chão)     (o giro)   (o imposto)  (o caixa)
```

🗣 *"A regra é simples: um setor só é treinado depois do setor de que ele depende. O PCP do Dia 3 precisa da BOM e do roteiro que a gente monta hoje, e do saldo de estoque que o Dia 2 traz. O Fiscal do Dia 4 só emite nota do que Vendas faturou. Isso evita o clássico: 'a tela pede um dado que ninguém sabe de onde vem'."*

### 5.3 Mensagem-síntese do dia (2 min)

> 🗣 *"Hoje a gente constrói a fundação. Se ela estiver de pé, Compras, Estoque, PCP e Custo vão andar quase sozinhos. Se ela estiver torta, todo o resto herda o erro."*

Escreva essa frase no quadro e **deixe lá o dia inteiro**.

### 5.4 Contrato do dia (3 min)

- Errar aqui é **de graça** — é ambiente de treinamento, e a base é restaurável.
- Interromper é bem-vindo: pergunta no meio vale mais que pergunta no fim.
- Todo mundo executa na própria máquina. **Assistir não ensina a operar.**

---

## 6. Bloco A — A base: plataforma, cadastros e parametrização (0:15–1:45)

### A1. Navegação e panorama (0:15–0:30 · 15 min)

#### O que demonstrar

1. **Login** — mostre quem você é no sistema: usuário, empresa (tenant) e perfil.
2. **Dashboard** — as 3 grandes áreas:
   - **Comercial & Vendas**
   - **Industrial & Produção**
   - **Administrativo & Financeiro**
3. **Busca por código** — digite `VENT0200` e caia direto no cadastro de itens.
4. **Busca por nome** — digite "estrutura" e mostre as telas que aparecem.
5. **A lógica dos prefixos** — projete esta tabela:

| Prefixo | Área | Prefixo | Área |
|:--|:--|:--|:--|
| `VEMP` | Empresa | `VFIS` | Fiscal |
| `VCLI` | Cliente | `VFIN` | Financeiro |
| `VSUP` | Fornecedor / Compras | `VCTB` | Contabilidade |
| `VVND` / `VPDV` | Vendas / Pedidos | `VMAQ` | Máquinas |
| `VENT` / `VITE` / `VENG` | Engenharia | `VMRP` / `VPLA` / `VAPS` | Planejamento |
| `VPRO` | Produção / PCP | `VEST` | Estoque |
| `VINS` / `VAVF` | Inspeção / Avaliação de fornecedor | `VCUS` / `VCST` | Custos / Precificação |

#### Fala

🗣 *"São mais de 200 telas. Ninguém decora isso — e nem precisa. Vocês vão **procurar**. Decorem só o fluxo do setor de vocês; o resto o sistema acha. O código é o atalho: quem sabe o código chega na tela em 2 segundos, quem não sabe usa o nome."*

#### ⚠️ Armadilha

Participante que anota os 200 códigos no caderno. **Interrompa isso na hora:**
🗣 *"Não anote todos. Anote os 8 do seu setor. Os outros o sistema procura por você."*

---

### A2. Cadastros de plataforma (0:30–0:50 · 20 min)

Passe **mostrando onde ficam**, sem esgotar campo por campo. Ritmo: ~2,5 min por tela.

| Ordem | Tela | O que mostrar | Fala-âncora |
|:-:|:--|:--|:--|
| 1 | `VEMP0100` | CNPJ com validação ✓/✗, **Regime Tributário**, endereço SEFAZ | *"Sem empresa cadastrada, nada funciona. E o regime tributário aqui muda o comportamento fiscal do sistema inteiro — Simples calcula diferente de Lucro Real."* |
| 2 | `VLOC0100` / `VUTL0555` | Países (DDI, BACEN, SISCOMEX) e UFs (sigla, IBGE) | *"O código IBGE parece burocracia — mas é ele que a NF-e exige. Sem IBGE, nota rejeitada lá no Dia 4."* |
| 3 | `VFUN0100` | Situação ATIVO/INATIVO, flags **Assistente Técnico** e **Participa Orçamento** | *"Funcionário inativo some das listas, mas continua no histórico. A gente nunca apaga — a gente inativa."* |
| 4 | `VCLA0100` | Máscara `99.99.99` + hierarquia por **Código Pai** | *"A classificação agrupa item. É por ela que Compras filtra, que o MRP separa e que o custo se organiza."* |
| 5 | `VCAL0100` | Grid mensal, toggle **Dia útil?**, métricas | *"Essa é a régua que o PCP usa para prometer data. Feriado errado aqui = promessa de entrega errada lá no Dia 3."* |
| 6 | `VPRI0100` | Faixas de **quantidade** (Baixa 1–10 … Urgente 71–1000) | *"O MRP olha quantas peças a ordem pede e carimba a etiqueta da faixa. Não é dias, não é prazo — é quantidade."* |
| 7 | `VFIN0130` | Código em texto, descrição e tipo | *"Este é o centro gerencial usado para classificar e ratear no Financeiro."* |
| 8 | `VCTB0102` | Empresa/unidade, CC Pai, vigência e Ativo | *"Este é o centro contábil: tem hierarquia, validade e vínculo empresarial."* |

#### ⚠️ Pegadinhas para citar (elas geram chamado de suporte depois)

- **`VCAL0100`:** dia **não registrado** é tratado como **dia útil**. Para marcar feriado, é preciso registrar o dia com o toggle desligado.
- **`VLOC0100`:** a **sigla da UF não pode ser alterada** depois de criada — errou, exclui e recria.
- **`VPRI0100`:** o intervalo é a **quantidade da ordem planejada**, em unidades do item — não dias nem valor. As faixas **não podem se sobrepor** (o backend recusa) e a máxima tem de ser **estritamente maior** que a mínima. Quantidade fora de todas as faixas fica sem etiqueta.
- **`VFIN0130` × `VCTB0102`:** faça duas demonstrações separadas. Na primeira,
  crie `CC-PROD` com descrição e tipo no Financeiro. Na segunda, crie o centro
  contábil escolhendo empresa/unidade, pai, vigência e situação. Os registros não
  são sincronizados automaticamente e os campos não são intercambiáveis.

---

### A3. PDM — como nasce a descrição técnica (0:50–1:00 · 10 min)

**Telas:** `VITE0114` (Grupos) · `VITE0115` (Modificadores) · `VITE0116` (Atributos — montador) · `VENT0204`

> ⚠️ **Este bloco vem antes do cadastro de item de propósito — não inverta.**
> O item guarda um **ponteiro** para Grupo e Modificador; se eles não existirem,
> a gravação do item é **recusada pelo backend** e a turma trava na primeira
> tentativa. Antes de começar o A4, confirme que o ambiente tem pelo menos um
> grupo e um modificador cadastrados (`GET /api/pdm/groups` e `/modifiers`, ou
> rode `npm run e2e:fundacao` — ele acusa se estiverem vazios).

#### O conceito, em uma frase

🗣 *"A descrição técnica de um item não é digitada livre. Ela é **composta** por três dimensões: **Grupo + Modificador + Atributos**. É exatamente como a indústria fala."*

```
Grupo: CHAPAS
  + Modificador: Chapa Aço Carbono
    + Atributos: {Liga: 1020, Espessura: 6,35mm}
      = "Chapa Aço Carbono 1020 6,35mm"
```

#### Demo (3 telas, ~3 min cada)

1. **`VITE0114` — Grupos:** listar, clicar em Novo e mostrar que o próximo **código é sugerido automaticamente**; preencher descrição + empresa. ⚠️ *O código fica imutável depois de criado. E o backend não tem exclusão de grupo — só criar, editar e consultar.*
2. **`VITE0115` — Modificadores:** listar, criar (só descrição; o **Código** é automático). ⚠️ *O modificador é **global** — não pertence a um grupo. O mesmo modificador serve para qualquer grupo.*
3. **`VITE0116` — Atributos (montador):** escolher Grupo + Modificador, adicionar pares nome:valor e conferir a **descrição técnica composta** e o resumo legível. No item, selecionar os mesmos dados — não mostrar JSON ao participante.

⚠️ **Ponto crítico a explicar:** *"Atributo **não tem cadastro próprio** no sistema. Ele vive dentro do item. Esta tela `VITE0116` não salva nada sozinha — ela monta uma conferência legível antes do cadastro. Muita gente se confunde com isso."*

---

### A4. Cadastro de Item / Material ⭐ (1:00–1:35 · 35 min)

> **Esta é a demo mais importante do dia.** Reserve o tempo e não corra.

**Telas:** `VENT0200` (Cadastro de Itens) · `VITM0100` (Item & Prontidão para o MRP)

#### Abertura do tópico

🗣 *"Se hoje tem uma tela que vocês vão abrir todo dia pelo resto da vida no sistema, é essa. O item é o átomo do ERP: tudo que a empresa compra, produz ou vende é um item. E ele tem sete abas porque sete áreas diferentes precisam de informação dele."*

#### Demo guiada — cadastrar 1 matéria-prima + 1 produto acabado

Faça **na frente da turma**, narrando cada aba. Depois **repita** e peça que eles façam junto.

**Item 1 — matéria-prima:** `MP-CHAPA-1020-6.35` — Chapa de Aço Carbono 1020, 6,35 mm

| Aba | Campo | Valor | O que dizer |
|:--|:--|:--|:--|
| **Capa** | Código | `MP-CHAPA-1020-6.35` | *"Padrão de código é decisão da empresa. Escolham um e não mudem — o código é para sempre."* |
| | Nome do item | Chapa Aço Carbono 1020 6,35mm | Obrigatório; o nome técnico detalhado é opcional |
| | Grupo PDM / Modificador PDM | `CHAPAS` / `Chapa Aço Carbono` | *"A descrição técnica não é digitada livre — ela é **composta**."* |
| | Saúde | `Normal` | ⚠️ *"Crítico ou Obsoleto muda o comportamento do MRP e pode bloquear ordens."* |
| **Estoque** | Unidade de Medida | `KG` | ⭐ *"A fábrica compra em quilo. Guardem isso — no Dia 2 a gente converte."* |
| | Almoxarifado padrão | Almox. MP | |
| | Estoque Mínimo | 500 | *"Abaixo disso o sistema alerta."* |
| | Contagem cíclica / Intervalo | Sim / 90 dias | |
| **Engenharia** | **Tipo** | `Comprado` | ⭐⭐ **O interruptor mais importante** |
| | Estrutura | `INDUSTRIAL` | *"Industrial = o MRP gera ordem e controla estoque. Comercial = item pronto para venda."* |
| | Usar item-base como modelo | Em branco | *"É opcional. Quando escolhido, copia as configurações das outras abas sem trocar o código ou o nome deste item."* |
| | Peso bruto / líquido | 49,9 kg/m² | *"Peso é o que o Fiscal e a Expedição vão usar."* |
| **Planejamento** | Tipo de Planejamento | `NORMAL_MRP` | *"São dois: NORMAL_MRP entra no cálculo; PROJETO fica de fora. O ponto de pedido é configurado à parte."* |
| | Classificação ABC | `A` | |
| | Lote mínimo / múltiplo | 100 / 50 | *"O MRP arredonda a sugestão para o múltiplo."* |
| | Estoque de segurança | 200 | |
| | Lead time (dias) | 15 | ⭐ *"É este número que o MRP usa para calcular **quando** disparar a compra."* |
| **Comercial** | (pular para MP) | — | *"Matéria-prima não se vende — a aba fica quase vazia."* |
| **Contábil** | Origem | `0 - Nacional` | ⭐ *"Obrigatório. É o primeiro dígito do CST na nota."* |
| | NCM | `7208.51.00` | *"O NCM decide a tributação. Errou o NCM, errou o imposto."* |
| | Alíquotas IPI / ICMS / PIS / COFINS | conforme empresa | |
| **Suprimentos** | UM de Suprimento | `KG` | |
| | Tipo de Utilização | `Industrialização` | ⚠️ *"Isso muda a contabilização: custo × despesa × imobilizado."* |
| | Checklist de recebimento | "Conferir certificado de qualidade e espessura" | *"Esse texto aparece para o Almoxarifado no Dia 2."* |

**Item 2 — produto acabado:** `PA-SUP-SOLD-001` — Suporte Soldado

Repita, alterando o essencial:
- **Engenharia → Tipo = `Fabricado`**, Estrutura = `INDUSTRIAL`
- **Estoque → UM = `PC`** (peça)
- **Comercial →** Descrição comercial, Tipo de Venda = `Venda`, Garantia = 90 dias
- **Planejamento →** Tipo = `MRP`, Lead time = 3 dias

#### As 4 falas obrigatórias deste tópico

🗣 **Comprado × Fabricado (repita 2×):**
> *"Esse joguinho — comprado ou fabricado — decide o destino do item. Marca **Comprado** e o sistema vai atrás do fornecedor: gera **pedido de compra**. Marca **Fabricado** e ele manda pro chão de fábrica: gera **ordem de produção**. Errou aqui e o material nunca chega ou nunca é feito. É o interruptor mais importante da metalúrgica."*

🗣 **Os 4 tipos (complete o quadro):**
> *"Além desses dois tem mais dois: **De terceiro** — material que está em poder de terceiro, e **Serviço** — que não gera ordem de material nenhuma, é comercial/fiscal puro. Quatro tipos, quatro destinos diferentes."*

🗣 **Unidade de medida:**
> *"Comprar em quilo e consumir em peça é o dia a dia de vocês. A conversão a gente cadastra amanhã, no Dia 2, em outra tela (`VSUP0110`). Mas ela **começa aqui**, na unidade do item. Se a unidade estiver errada aqui, a conta sai errada em todo lugar: no estoque, no custo, na nota."*

🗣 **Lead time (plantando o Dia 3):**
> *"Esse lead time parece um número perdido numa aba. Não é. É ele que o MRP vai usar no Dia 3 para dizer 'compre isso HOJE, senão não chega a tempo'. Lead time subestimado = falta de material. Superestimado = estoque parado. Preencham com o número real, não com o otimista."*

#### `VITM0100` — o checklist de prontidão (últimos 8 min do tópico)

Abra `VITM0100`, selecione o item recém-criado e clique em **Prontidão**.

**O que o sistema confere automaticamente:**

| Tipo do item | O que precisa ter | Se faltar |
|:--|:--|:--|
| **Fabricado** | Estrutura (BOM) **e** roteiro | ⚠️ Pendência — não roda no MRP |
| **Comprado** | Fornecedor preferencial | ⚠️ Pendência |
| **Comprado** | Conversão de UM (se UM de compra ≠ UM de estoque) | ⚠️ Alerta |
| **Terceiro** | — (não gera ordem) | — |
| **Serviço** | — (não gera ordem de material) | — |

🗣 *"Olha o que ele acabou de dizer: esse item está **pendente** porque é Fabricado e ainda não tem estrutura nem roteiro. Ele não está me acusando — ele está me dizendo exatamente o que falta para o item funcionar. Depois do intervalo a gente resolve essas duas pendências, e vocês vão ver esse ⚠️ virar ✅."*

> 💡 **Truque didático:** deixe a prontidão **pendente de propósito** aqui. No fim do Bloco B, volte a esta tela e mostre o ✅. É o momento mais satisfatório do dia.

#### Conceitos-chave para explicar aqui

| Conceito | Explicação de sala |
|:--|:--|
| **LLC (Low Level Code)** | *"É o andar do item na estrutura: **1** = produto final, **2–8** = intermediários, **9** = matéria-prima. O MRP processa de cima para baixo usando esse número."* |
| **Natureza** | *"Item Base = o molde. Genérico = sem máscara. Configurado = uma variante gerada pelo configurador."* |
| **Item-base como modelo** | *"É um atalho opcional: copia estoque, engenharia, planejamento, comercial, contábil e suprimentos. Depois você altera o nome e o nome técnico do novo item."* |
| **Tipo MRP** | *"São dois valores: `NORMAL_MRP` e `PROJETO`. Quem repõe por ponto de pedido preenche o bloco de reposição (TR/CM/CR/ES) — não é um tipo separado."* |
| **Ponto de pedido (ROP)** | Fórmula: `(TR × CM / CR) + ES` — *"tempo de reposição × consumo médio, mais o estoque de segurança."* |
| **Percentual de perda** | *"Na metalurgia é regra, não exceção: sobra de chapa, aparas. O MRP soma a perda na necessidade."* |

---

### A5. Permissões, senha e auditoria (1:35–1:45 · 10 min)

#### Perfis

| Perfil | O que pode |
|:--|:--|
| `ADMIN` | Tudo, incluindo parâmetros, usuários, importações protegidas e manutenção estrutural |
| `USER` | Operações operacionais autorizadas; ação que exige ADMIN fica desabilitada (e chamada direta retorna 403) |
| `VIEWER` | Somente leitura |

🗣 *"Permissão não é desconfiança — é rede de segurança. Ela impede que alguém, sem querer, mexa em algo que derruba a operação inteira."*

#### `VSEC0100` / `VUSR0100` — troca de senha

Fluxo: **solicitar → aprovar/rejeitar (ADMIN) → concluir (titular)**.

- Motivo é **obrigatório** na solicitação.
- Depois de aprovada, a autorização vale por **15 minutos**.
- Senha nova: **12 a 128 caracteres**, com maiúscula, minúscula, número e caractere especial.
- Concluir a troca **invalida todas as sessões anteriores** — é preciso autenticar de novo.
- ⚠️ *"O administrador aprova, mas **não conhece e não define** a senha nova. Ele só libera a troca."*

#### `VADM0100` / `VAUD0100` — auditoria

Somente leitura, **exclusiva de ADMIN** (usuário `USER` recebe 403). Filtra por entidade, ação, usuário e período. O log é **imutável** — não há edição nem exclusão.

🗣 **Fala sobre a auditoria:**
> *"O sistema anota tudo. Não para vigiar vocês — para **proteger** vocês. Quando algo dá errado, dá para ver exatamente o que aconteceu e desfazer, em vez de virar caça às bruxas. O sistema trabalha a favor de quem opera."*

#### Regra operacional que vale para o ERP inteiro (explicar 1× e cobrar sempre)

> **Excluir é exceção. A regra é mudar de estado.**
>
> Documentos que participam de estoque, fiscal, financeiro, compras, vendas, produção ou auditoria **não desaparecem**. A ação correta é **Cancelar**, **Inativar**, **Encerrar**, **Bloquear** ou avançar para um estado terminal.
>
> - Cadastros auxiliares sem uso → podem aceitar **exclusão**
> - Contratos → **encerrados**
> - Fornecedores / clientes → **bloqueados** ou **inativados**
> - Pedidos e documentos → **cancelados**
> - Ordens → **canceladas** ou **fechadas**
> - Ocorrências → recebem **disposição** ou **resolução**

🗣 *"Se o botão Excluir não aparece, não é bug nem falta de permissão: é regra do processo. O sistema está te dizendo que aquele registro tem história e a história não se apaga."*

---

## 7. Bloco B — Engenharia: o produto ganha forma (2:00–3:15)

### Transição (1 min)

🗣 *"Antes do intervalo a gente cadastrou as peças soltas: a chapa, o parafuso, o produto. Agora vamos ensinar o sistema a **montar o produto** com elas — e a **saber fabricá-lo**. São duas coisas diferentes, e o ERP precisa das duas."*

Desenhe no quadro:

```
BOM      = A RECEITA        → o quê e quanto entra
ROTEIRO  = O MODO DE PREPARO → como e em quanto tempo
```

---

### B0. Máquinas e centros de trabalho (2:00–2:12 · 12 min)

> **Pré-requisito do roteiro.** Sem máquina cadastrada, a operação do roteiro não tem onde acontecer.

#### `VMAQ0101` — Tipos de Máquina

Cadastre as categorias: **CUT** (corte), **BEND** (dobra), **WELD** (solda), além de ASSEMBLE, PAINT, LATHE, MILL, PRESS, INJECTION.

⭐ **O campo que ninguém entende — explique com calma:**

| Requer operador | Comportamento | Consequência |
|:--|:--|:--|
| **Sim** (máquina manual) — padrão | O sistema **ignora sobreposição (overlap)** no roteiro | Lead time realista |
| **Não** (máquina automática) | Permite **overlap** entre operações | Lead time menor |

🗣 *"Por que isso importa? Porque o operador não abandona uma peça no meio para começar outra. Se a máquina é manual, o sistema não deixa a operação seguinte começar antes da anterior terminar — e assim ele não **subestima** o prazo. Máquina automática pode sobrepor, porque ela roda sozinha."*

#### `VMAQ0200` — Máquinas, Tempos e Cálculo

Três seções, demonstradas em sequência:

**1. Nova máquina**
| Campo | Exemplo | Observação |
|:--|:--|:--|
| Código / Nome | `GUILH-01` / Guilhotina 6mm | |
| Tipo | `CUT` | Código do tipo de `VMAQ0101` |
| Capacidade | 120 | |
| Unidade de capacidade | `Chapas` | Peças, Chapas, Kg, T, M, M², M³, Litros, Un |
| Período | `Por Hora` | Por Minuto / Por Hora / Por Dia |
| Eficiência | 0,85 | 0 a 1 |

⚠️ *"Use as listas — as unidades e períodos são em português (Chapas, Peças; Dia, Hora, Minuto). Digitar errado gera recusa."*

**2. Tempo por item × máquina** — ⭐ *"Esse cadastro é o coração do cálculo."*
| Campo | Exemplo |
|:--|:--|
| Item / Máquina | `PA-SUP-SOLD-001` / `GUILH-01` |
| Tempo de ciclo + unidade | 2 min |
| Quantidade base | 10 |
| Setup | 15 min |
| Prioridade | 1 (= máquina preferida) |

**3. Cálculo de tempo de produção** — informe Item, Máquina e Quantidade e clique em **Calcular tempo**.

O sistema devolve: **ciclos** (arredondados para cima), tempo de setup, tempo de produção, total em min/h e **se a máquina está em gargalo**.

**Como o cálculo funciona** (projete e explique — a turma adora ver a conta):
```
1. Resolve o tempo pela variante (máscara) do item; sem variante, usa o padrão
2. Normaliza o período para minutos (1 dia = 480 min / 8h)
3. Verifica compatibilidade de unidade item × máquina (converte kg↔t, mm↔m…)
4. ciclos = teto(quantidade ÷ quantidade base)      ← arredonda para CIMA
5. tempo total = ciclos × tempo de ciclo + setup    ← setup entra UMA vez
6. Compara a vazão exigida com a capacidade efetiva (capacidade × eficiência)
   → sinaliza GARGALO
```

🗣 *"Repare no passo 6: ele já te avisa se essa máquina vira gargalo nessa quantidade. Isso é o CRP do Dia 3 começando aqui, no cadastro."*

#### `VMAQ0300` — Tempos e Programação de Máquina (mostrar, 2 min)

Registrar tempo (item, prioridade, tempo produtivo) e **programar a máquina** (ordem, data, início/fim, quantidade planejada, situação, sequência).

Mostre a **lupa** dos campos Máquina e Item. O participante deve selecionar pelo nome; nunca memorizar códigos. Destaque também que situações e datas são apresentadas em português e que a tela não exibe endereços técnicos da API.

⚠️ *"Esta rotina **não** serve para registrar produção realizada. Isso é apontamento, e é no Dia 3."*

---

### B1. Estrutura de Produto / BOM ⭐ (2:12–2:42 · 30 min)

**Telas:** `VBOM0100` (cabeçalhos/versões) · `VENG0300` (cabeçalho e situação) · `VENT0210` (linhas/componentes) · `VENG0500` (consulta avançada)

Antes de iniciar, se o produto for **Configurado**, abra `VITE0313`, selecione as características, simule e persista uma máscara. Volte à `VBOM0100` e mostre que a máscara aparece na lista pesquisável. Sem essa etapa, não avance para uma BOM específica de variante.

#### A ordem correta (a turma erra isso o tempo todo)

```
1. VBOM0100 / VENG0300 → cria o CABEÇALHO (a versão)
2. VENT0210            → adiciona as LINHAS (os componentes)
3. VBOM0100 / VENG0300 → muda o STATUS para APROVADO
```

🗣 *"Cabeçalho primeiro, componentes depois, aprovar por último. Se inverter, você aprova uma BOM vazia — e BOM vazia aprovada é pior que BOM em rascunho, porque o MRP acredita nela."*

#### Passo 1 — `VBOM0100` / `VENG0300`: o cabeçalho

| Campo | Valor | O que explicar |
|:--|:--|:--|
| Item | `PA-SUP-SOLD-001` | |
| Máscara | (opcional) | Só para itens configurados |
| **Tipo** | `MBOM` (padrão) | ⭐ **EBOM** = estrutura de **engenharia** (como foi projetado) · **MBOM** = estrutura de **manufatura** (como é realmente fabricado) |
| Vigência inicial | hoje | |
| Situação | Rascunho | Percorre **Rascunho → Aprovado → Obsoleto** |

O usuário responsável vem automaticamente da sessão. Nunca peça UUID à turma. Para vigência, explique o formato visual **dia/mês/ano** e escolha a data no calendário.

⚠️ **Três avisos obrigatórios:**
1. **Só a versão `APROVADO` vigente é considerada pelo MRP e pela produção.**
2. **Criar um cabeçalho novo NÃO copia as linhas da versão anterior** — depois de criar, é preciso montar a estrutura na `VENT0210`.
3. **Tornar obsoleta não apaga histórico** nem altera ordens já firmadas.

🗣 **EBOM × MBOM:**
> *"A engenharia projeta de um jeito (EBOM) e a fábrica monta de outro (MBOM) — com a ordem de montagem real, o material de consumo, a embalagem. As duas são legítimas. Quem manda no MRP e na produção é a **MBOM**."*

#### Passo 2 — `VENT0210`: os componentes

Demonstre a árvore hierárquica:

1. Informe o **Item Pai** e pressione Enter → carrega o nível 0.
2. Clique no pai e em **Inserir Filho** (ou digite na última linha do grid editável).
3. Preencha: **Item Componente**, **Quantidade**, **Unidade de Medida**, Sequência e flags.
4. O marcador **•** (bolinha) = linha ainda **não salva**. Salve com **F9**.
5. **Duplo clique** em item com o marcador **↩** (tem filhos) = drill-down para o nível abaixo.
6. Use o **breadcrumb** no topo para voltar aos níveis superiores.
7. Selecione uma linha → o **painel lateral** mostra código, nome, tipo, estrutura, UM, lead time e **saldo atual**.
8. A **cor de saúde** aparece na árvore: 🟢 Normal · 🟡 Crítico · 🔴 Obsoleto.

**Estrutura do produto-exemplo:**

| Componente | Qtd | UM | Perda | Flags |
|:--|:-:|:-:|:-:|:--|
| `MP-CHAPA-1020-6.35` | 2,5 | KG | 8% | — |
| `MP-PARAF-M8-25` | 2 | PC | 0% | — |
| `MP-ELETRODO-E6013` | 0,15 | KG | 0% | — |

⭐ **A perda é o ponto metalúrgico deste tópico:**

🗣 *"Oito por cento de perda numa chapa não é desleixo — é o vão da guilhotina, é a apara, é o refile. Se vocês não colocarem essa perda aqui, o MRP vai comprar chapa a menos e a produção vai parar no meio. E o custo vai sair mentiroso pra baixo. A perda na metalurgia é regra, não exceção."*

#### Flags da linha de estrutura

| Flag | Efeito |
|:--|:--|
| **Fantasma** | Componente é **ignorado pelo MRP** — as necessidades são explodidas direto para o nível de baixo |
| **Alternativo** | Componente substituto |

🗣 **Item fantasma:** *"Fantasma é aquele subconjunto que existe no desenho mas nunca vira estoque — ele é montado e consumido na mesma hora. O MRP pula ele e vai direto nos componentes dele."*

#### Passo 3 — Aprovar

Volte em `VBOM0100` / `VENG0300` e mude o status para **`APROVADO`**.

⚠️ **Não aprove BOM sem componentes, quantidades, unidades e efetividade validados.**

🗣 *"Repara no que acabou de acontecer: até esse clique, essa estrutura não existia para o resto do sistema. O MRP não olhava para ela. Agora ela é lei. É por isso que a BOM presa em RASCUNHO é um dos erros mais comuns — a pessoa monta tudo certinho e esquece de aprovar."*

#### `VENG0500` — Consulta e Manutenção Avançada de Estruturas (5 min)

Quatro consultas que valem ouro para a Engenharia:

| Consulta | Para que serve |
|:--|:--|
| **Filhos diretos** | Confere só o primeiro nível |
| **Consultar estrutura** | Item + máscara + **data de efetividade** + nº de níveis (`0` = árvore toda) |
| **Onde usado** ⭐ | Pesquisa **inversa**: em quais produtos este componente participa |
| **Alterar componente** | Ajuste com verificação de ciclo e vigência |

🗣 **Onde usado:** *"Essa é a consulta que salva o seu dia. O fornecedor avisa que o parafuso M8 saiu de linha. Você abre 'Onde usado' e em 3 segundos sabe TODOS os produtos afetados. Sem isso, é caçar na planilha."*

⚠️ Antes de alterar componente: consulte a estrutura, confirme sequência/quantidade/vigência e **verifique se a mudança não cria ciclo**. Depois de salvar, repita a consulta **na mesma data de efetividade**.

#### Fala de fechamento do B1

🗣 *"Essa árvore é a receita do bolo: diz **o quê** e **quanto** entra no produto. É exatamente isso que o MRP vai 'explodir' no Dia 3 para saber o que comprar e o que fabricar. Um componente esquecido aqui vira uma falta de material lá na frente — e ninguém vai descobrir que a culpa foi da BOM."*

⚠️ **Aviso de performance:** estruturas com mais de **10 níveis** impactam o desempenho do MRP.

---

### B2. Roteiro de Fabricação ⭐ (2:42–3:05 · 23 min)

**Telas:** `VPRO0100` (roteiro do PCP, com CPM) · `VENT0202` (roteiro por item) · `VENT0115` (roteiro padrão) · `VENG0600` (rede de precedência) · `VENT0363` (relatório de tempo)

#### As duas telas de roteiro — explique a diferença logo no início

| Tela | Visão | Use quando |
|:--|:--|:--|
| `VENT0202` | **Engenharia** — por item: operação, CT, tempo, homens, origem, situação, fórmula | Cadastro do dia a dia da Engenharia |
| `VPRO0100` | **PCP** — biblioteca de operações + roteiro + **dependências** + **lead time via CPM** | Quando precisa do caminho crítico e da rede de precedência |

🗣 *"São duas portas para o mesmo conceito. A da Engenharia é mais direta; a do PCP tem a rede de precedência e o cálculo de caminho crítico. Vocês vão usar as duas."*

#### Demo em `VPRO0100` (o fluxo completo)

**1. Crie operações genéricas** (biblioteca reutilizável)

| Campo | Valor |
|:--|:--|
| Nome | `CORTE GUILHOTINA` |
| **Origem** | `Interna` |
| Tempo padrão | 2 min |

⭐ **Origem define o tipo de ordem que o MRP gera:**
- **Interna** → **Ordem de Fabricação (OF)**
- **Externa / Terceiros** → **Ordem de Serviço (OS)**

🗣 *"Marcar Externa aqui é o que faz o sistema mandar a peça para a zincagem em vez de mandar para a sua bancada. Na metalurgia isso é comum: tratamento térmico, galvanização, usinagem fora. Origem errada = peça que nunca sai da fábrica ou peça que sai sem precisar."*

**2. Crie o roteiro do item**

| Campo | Valor | Observação |
|:--|:--|:--|
| Item | `PA-SUP-SOLD-001` | |
| Descrição | Roteiro padrão suporte soldado | |
| Alternativa | — | |
| **Padrão** | ✅ marcado | ⭐ **Apenas um roteiro padrão por item** — é o que o MRP e o CRP leem |

**3. Adicione as operações**

| Seq | Operação | Centro de Trabalho | Tempo | Homens |
|:-:|:--|:--|:-:|:-:|
| 10 | Corte da chapa | `GUILH-01` (CUT) | 2 min | 1 |
| 20 | Dobra | `DOBRA-01` (BEND) | 3 min | 1 |
| 30 | Solda | `SOLDA-01` (WELD) | 8 min | 1 |
| 40 | Rebarba / acabamento | `BANCADA-01` | 4 min | 1 |

🗣 *"Numere de 10 em 10. Por quê? Porque um dia você vai precisar enfiar uma operação no meio — e aí ela vira 15, sem renumerar o roteiro inteiro. É um truque velho de chão de fábrica."*

**4. Defina as dependências** (`VENG0600` ou dentro do `VPRO0100`)

Informe roteiro, **predecessora**, **sucessora** e **sobreposição (overlap %)**:

| Overlap | Significado |
|:-:|:--|
| `0` | A sucessora só começa quando a predecessora terminar **100%** |
| `> 0` | Execução parcialmente simultânea |

⚠️ **Três regras da rede:**
1. Não ligue uma operação a ela mesma, nem crie **ciclo** direto ou indireto.
2. Os IDs são das **operações vinculadas ao roteiro**, não da biblioteca de operações.
3. **Máquina manual nunca tem overlap válido** — o sistema o ignora e trata como `0`.

**5. Clique em Lead time (CPM)**

O sistema devolve o **tempo total** e o **caminho crítico**.

🗣 *"Caminho crítico é a sequência de operações que define o prazo. Se você acelerar uma operação que **não** está no caminho crítico, o prazo não muda — você só gastou dinheiro. Se acelerar uma que **está**, o produto sai antes. É por isso que o sistema calcula isso: para você saber onde investir."*

#### `VENT0202` — a visão da Engenharia (5 min)

Campos adicionais que a `VPRO0100` não tem:

| Campo | Opções | O que significa |
|:--|:--|:--|
| **Homens** | número | Quantos operadores a operação exige |
| **Situação** | `Aprovada` / `Inativa` / `Fantasma` | ⚠️ **Inativa** não entra no cálculo de carga do CT; **Fantasma** existe só para documentação (não gera apontamento nem custo) |
| **Fórmula** | ex.: `T * 1.1` | Fator sobre o tempo base `T` — `T * 1.2` adiciona 20% |
| **Apontamento** | Sim / Não | Se a operação exige apontamento do operador (Dia 3) |
| **Roteiro Padrão Ref.** | select | De onde as operações foram copiadas |

**Botão Copiar de Roteiro Padrão** → traz as operações de um template de `VENT0115`.

#### `VENT0115` — Roteiro Padrão (3 min)

Templates reutilizáveis, **não vinculados a nenhum item**. Código auto-gerado e sequencial.

🗣 *"Se vocês têm uma família de produtos que segue sempre corte → dobra → solda, cadastrem uma vez aqui e copiem para cada item novo. Poupa horas."*

#### `VENT0363` — Relatório Tempo CT (2 min)

Horas e custo (R$) por centro de trabalho, com filtros de período, item, CT, seleção (**NF de Saída** ou **OF Encerradas**) e opção (Todas / Com Custos / Sem Custos). Exporta para Excel.

⚠️ *"A coluna Custo (R$) = tempo (h) × custo-hora do CT. É a ponte entre engenharia e custo — vocês vão ver esse número virar preço no Dia 4."*

#### Fala de fechamento do B2

🗣 *"Se a BOM é a receita, o roteiro é o modo de preparo: **como** e **em quanto tempo**. É o roteiro que alimenta o CRP — a capacidade — e o custo. Sem tempo de operação, o sistema não sabe quanto de máquina o pedido consome nem quanto custa produzir. É o roteiro que transforma 'a gente faz isso aqui' em número."*

#### 🎬 Momento de fechamento do círculo (2 min) — não pule

Volte para `VITM0100`, selecione `PA-SUP-SOLD-001` e clique em **Prontidão**.

O item que estava ⚠️ **pendente** antes do intervalo agora está ✅ **pronto**.

🗣 *"Lembram que antes do intervalo esse item estava pendente? O sistema dizia: 'falta estrutura e falta roteiro'. Vocês acabaram de resolver as duas coisas. Esse ✅ significa que esse item agora **roda no MRP**. Vocês construíram isso em duas horas."*

---

### B3. Complementos de engenharia — tour guiado (3:05–3:15 · 10 min)

> Objetivo: **mostrar onde fica e para que serve**. Não aprofundar. Se estiver atrasado, corte para 5 min.

#### Documentação técnica (3 min)

| Tela | O que faz | Ponto de atenção |
|:--|:--|:--|
| `VDES0100` | Cadastro de desenhos + histórico de revisões | Histórico é **acumulativo** — revisões anteriores permanecem consultáveis. Excluir desenho remove também o vínculo com as revisões |
| `VENG0400` | Desenhos, revisões e **distribuição controlada** | Código + Dígito devem identificar o documento sem ambiguidade. Ao tornar uma revisão **Atual**, encerre logicamente a anterior. Alterar/excluir revisão exige avaliar OFs que já a referenciam |
| `VENG0610` | Seriais físicos de ferramentas | Cada unidade física rastreada por nº de série, situação e localização. **Não reutilize número físico**. Desativar = baixa definitiva/perda/descarte |

#### Configurador de Produto (4 min) — para produto sob medida

```
VCFG0100 (Conjuntos e Variáveis) → VCFG0200 (Características) → VCFG0300 (Características por Item)
   → VCFG0400 (Geração individual e em lote) → VCFG0500 (Descrições) → VCFG0600 (Regras)
```

| Tela | Em uma frase |
|:--|:--|
| `VCFG0100` | O **conjunto** agrupa respostas possíveis; a **variável** é uma resposta (conjunto `COR` → variáveis `AZUL`, `PRETO`) |
| `VCFG0200` | As **características** (a pergunta), com 7 tipos: `CAMPO`, `DESENHO`, `ESCOLHA`, `ESCOLHA_MULT`, `FORMULA`, `INF_CARACTER`, `INF_NUMERICA` |
| `VCFG0300` | Quais características cada item tem, em que sequência |
| `VCFG0400` | Gera a configuração — **individual** ou **em lote** |
| `VCFG0500` | Como a descrição do item configurado é montada linha a linha |
| `VCFG0600` | Regras equivalentes (pai → filho) e regras de item configurado |
| `VITE0313` | Gera a **máscara** (o código do item configurado) |
| `VITE0118` | Regras que mapeiam característica → tabela/campo de destino |
| `VENG0204` | Componente escolhido por condição (`=`, `<>`, `>`, `<`, `>=`, `<=`) |

⚠️ **A regra de ouro do configurador — diga em voz alta:**
> **Sempre simule com `Persistir` DESMARCADO primeiro.** Confira máscara, descrição, regras aplicadas e mensagens. Só depois marque `Persistir` e execute de novo.

🗣 *"Persistir cria código de item de verdade, que passa a existir para o comercial e o industrial. Simular é de graça; persistir é para sempre. Simulem sempre."*

⚠️ **Produto cartesiano:** na geração em lote, calcule antes o número de combinações (multiplicando as opções de cada característica). 5 características com 4 opções cada = 1.024 itens. *"Vocês não querem isso."*

#### Promessa de entrega e calendários (2 min)

| Tela | O que faz |
|:--|:--|
| `VPME0102` | Parâmetros globais — o toggle `use_delivery_promise` é o **master switch** |
| `VPME0102ITE` | Calendário de promessa **por item** (1 clique = útil confirmado, 2 cliques = não útil) |
| `VENT0108` | Calendário corporativo alternativo (financeiro/industrial), com **Limpar Mês** |
| `VCAL0200` | Consulta dos dias úteis prometidos por item |

⚠️ *"Dias bloqueados pelo calendário industrial (`VCAL0100`) **não podem** ser alterados pelo calendário do item. A hierarquia é essa: empresa manda no item."*

#### `VITE0129` — Replicação de Parâmetros (1 min)

Copia parâmetros de um item de origem para vários itens de destino, escolhendo as **pastas** (as abas do `VENT0200`: Planejamento, Comercial, Contábil, Custos, Estoque, Engenharia, Suprimentos, Fiscal).

⚠️ **A replicação é em lote e não pode ser desfeita automaticamente.** Parâmetros fiscais exigem validação depois.

🗣 *"Cadastrou 1 item da família certinho? Replica para os outros 40. Mas confira antes — não tem 'desfazer'."*

## 8. Dinâmica de fixação + gabarito

### "Do parafuso ao produto" (30 min)

**Formato:** duplas · **Entregável:** produto com BOM aprovada + roteiro com tempos

#### Setup (3 min)

Cada dupla recebe a ficha do **Anexo A** — o **suporte soldado**: 1 chapa + 2 parafusos + eletrodo, com operações de corte e solda.

🗣 *"Correção vale mais que velocidade. Não é corrida — é para ficar certo."*

#### Tarefa cronometrada (20 min)

| # | Passo | Tela | Ponto de controle |
|:-:|:--|:--|:--|
| 1 | Cadastrar os itens faltantes, com UM e tipo corretos | `VENT0200` | Tipo `Comprado` para MP, `Fabricado` para PA |
| 2 | Conferir a prontidão (deve dar ⚠️) | `VITM0100` | Pendência de BOM/roteiro |
| 3 | Criar o **cabeçalho** da estrutura | `VBOM0100` | Tipo `MBOM`, status `RASCUNHO` |
| 4 | Montar a **estrutura** com quantidades e perdas | `VENT0210` | 3 componentes, perda na chapa |
| 5 | Criar o **roteiro** com 2+ operações, CT e tempos | `VPRO0100` | Marcado como **Padrão** |
| 6 | Ligar a **dependência** entre as operações | `VENG0600` | Overlap `0` |
| 7 | **Aprovar** a estrutura | `VBOM0100` | Status `APROVADO` |
| 8 | Conferir a prontidão de novo (deve dar ✅) | `VITM0100` | ✅ pronto |

#### Gabarito para o instrutor validar (em cada máquina)

- [ ] Item `PA-SUP-SOLD-001` existe, tipo **Fabricado**, UM `PC`, origem fiscal preenchida
- [ ] Itens de MP existem, tipo **Comprado**, UM correta
- [ ] Cabeçalho de BOM com tipo **MBOM** e status **`APROVADO`**
- [ ] Estrutura com **≥ 2 componentes**, quantidades preenchidas e **perda na chapa**
- [ ] Roteiro com **≥ 2 operações**, cada uma com **centro de trabalho** e **tempo ≠ 0**
- [ ] Roteiro marcado como **Padrão**
- [ ] `VITM0100` → **Prontidão = ✅**

#### Erros que vão aparecer (e o que dizer)

| Erro observado | Diagnóstico | Como corrigir |
|:--|:--|:--|
| BOM aprovada mas o MRP "não vê" | Aprovou o cabeçalho **errado** ou a vigência não começou | Conferir data de vigência inicial |
| Não consegue inserir componente | Item pai não é **Fabricado** ou é **Fantasma** | Corrigir a aba Engenharia do `VENT0200` |
| Linha da BOM não salva | Marcador **•** presente — falta F9 | Salvar com F9 |
| Roteiro sem lead time | Sem dependências definidas | Ligar predecessor → sucessor no `VENG0600` |
| Tempo calculado absurdo | Unidade de tempo trocada (min × hora) | Conferir a unidade em `VMAQ0200` |
| Prontidão continua ⚠️ | Roteiro existe mas **não está marcado como Padrão** | Marcar Padrão |

#### Validação e correção (5 min)

Passe de máquina em máquina com o gabarito acima. Para cada dupla, marque o que ficou 🟢/🟡/🔴 e **corrija na hora** o que estiver errado — o erro corrigido na frente da pessoa fixa mais do que o acerto de primeira.

#### Fechamento da dinâmica (2 min)

🗣 *"Vocês acabaram de construir, em 20 minutos, a base que o Compras vai usar amanhã. **No Dia 2, a gente compra esse material** e coloca ele no estoque."*

---

## 9. Fecho e gancho para o Dia 2

### Recapitulação em 3 frases (2 min)

1. **O item** é o átomo do ERP — e o interruptor **comprado × fabricado** decide o destino dele.
2. **A BOM** é a receita (o quê e quanto) — e só vale quando está **`APROVADO`**.
3. **O roteiro** é o modo de preparo (como e em quanto tempo) — e é ele que alimenta capacidade e custo.

### Volte ao flip chart da abertura (2 min)

Releia os casos de erro que a turma contou na abertura e pergunte:

🗣 *"Qual desses casos teria sido evitado por um cadastro certo hoje?"*

Quase todos serão. É o fecho mais forte possível.

### Gancho (2 min)

🗣 *"Temos o produto definido. Amanhã o desafio é: **como o material entra na fábrica?** Vamos comprar, receber, inspecionar e estocar. E vocês vão ver a chapa que cadastraram hoje virar saldo de estoque de verdade."*

### Lição de casa opcional (para key-users)

- Listar os **10 itens mais críticos** do setor e conferir se estão prontos em `VITM0100`.
- Trazer para o Dia 2 a lista dos **fornecedores principais** de cada um.

---

## 10. Troubleshooting — erros que vão acontecer na sala

| Sintoma | Causa provável | Solução |
|:--|:--|:--|
| Tela não carrega / lista vazia | Empresa não cadastrada ou token de outra empresa | Conferir `VEMP0100`; dados sempre pertencem à empresa do token |
| **403** ao clicar num botão | Ação exige perfil `ADMIN` | Perfil `USER` não acessa parâmetros, auditoria e manutenção estrutural |
| **401** / caiu para o login | Sessão expirou (ou senha foi trocada) | Reautenticar — trocar a senha invalida as sessões anteriores |
| CNPJ com ✗ vermelho | Dígito verificador inválido | Conferir o número; a validação é módulo 11 |
| Não consigo alterar a sigla da UF | Campo desabilitado na edição, por regra | Excluir e recriar |
| Botão **Excluir** não aparece | Registro participa de processo com histórico | Usar Cancelar / Inativar / Encerrar / Bloquear |
| Item Serviço sem aba Estoque | Comportamento correto — serviço não tem estoque físico | Nenhuma |
| Grupo PDM não pode ser excluído | Backend não expõe exclusão de grupo | Alterar descrição/empresa |
| Máscara de item configurado duplicada | Combinação já persistida | Simular com `Persistir` desmarcado antes |
| Cálculo de tempo recusado | Unidade do item incompatível com a da máquina | Conferir unidades em `VMAQ0200` |
| Lead time do roteiro parece baixo demais | Overlap indevido em máquina manual | Máquina com **Requer operador = Sim** ignora overlap; conferir `VMAQ0101` |
| Alteração de componente recusada | Criaria **ciclo** na estrutura, ou vigência conflitante | Reler a árvore antes de regravar |
| "Salvei mas não aparece" | Mensagem de sucesso ≠ conferência | **Sempre reconsulte** e confira status/identificadores retornados |

> 🗣 **Fala que vale para o ERP inteiro:** *"Uma mensagem de sucesso não substitui a conferência. Salvou? Consulta de novo e olha o que voltou. Esse hábito evita 80% dos problemas."*

---

## 11. Perguntas que a turma sempre faz (com respostas)

**P: Por que existem duas telas de centro de custo (`VFIN0130` e `VCTB0102`)?**
R: São complementares. A `VFIN0130` é do módulo financeiro (código + descrição + tipo). A `VCTB0102` é do contábil e adiciona **vínculo com empresa** e **controle Ativo/Inativo**. Ambas coexistem e alimentam a estrutura de rateio.

**P: Por que tem duas telas de roteiro (`VENT0202` e `VPRO0100`)?**
R: São duas portas para o mesmo conceito. A da Engenharia (`VENT0202`) é o cadastro direto por item, com homens, situação e fórmula. A do PCP (`VPRO0100`) tem biblioteca de operações, rede de precedência e cálculo de **lead time por CPM**.

**P: Qual a diferença entre EBOM e MBOM?**
R: **EBOM** é a estrutura de **engenharia** (como o produto foi projetado). **MBOM** é a de **manufatura** (como ele é realmente fabricado, com ordem de montagem, consumíveis e embalagem). Quem manda no MRP e na produção é a **MBOM**.

**P: Se eu criar uma versão nova da BOM, ela copia a anterior?**
R: **Não.** Criar cabeçalho não copia linhas. Depois de criar a versão, monte a estrutura em `VENT0210`.

**P: Posso apagar um item que cadastrei errado?**
R: Depende. Cadastro auxiliar sem uso pode aceitar exclusão. Item que já participa de estoque, compra, produção ou fiscal **não** — a ação correta é inativar ou marcar como Obsoleto.

**P: O que acontece se eu marcar um item como Obsoleto?**
R: O campo **Saúde** com `Crítico` ou `Obsoleto` altera o comportamento do MRP e **pode bloquear** novas ordens de compra/venda. Use com intenção.

**P: Item fantasma — quando usar?**
R: Quando o subconjunto existe no desenho mas nunca vira estoque (é montado e consumido na hora). O MRP **ignora** o fantasma e explode direto para os componentes dele.

**P: Preciso cadastrar o roteiro de item comprado?**
R: Não. Roteiro é para item **Fabricado**. Item Comprado precisa de **fornecedor preferencial** (Dia 2), não de roteiro.

**P: E se a mesma peça puder ser feita em duas máquinas?**
R: Cadastre o tempo item×máquina para as duas em `VMAQ0200` e use o campo **Prioridade** — `1` é a máquina preferida.

**P: Quantos níveis a estrutura pode ter?**
R: Tecnicamente muitos, mas **acima de 10 níveis** o desempenho do MRP é impactado. Se estiver passando disso, provavelmente há subconjuntos que deveriam ser itens fantasma.

**P: O treinamento vai cobrir todas as 200+ telas?**
R: Não, e isso é proposital. Cobrimos o **fluxo troncal** de cada setor — as telas que movem o dia a dia — e ensinamos a **buscar** o resto com autonomia. Todas as telas do dia estão na apostila como referência.

---

## 12. Checklist de saída e avaliação

### Checklist do participante (ele mesmo marca)

- [ ] Navego por código e por nome, e entendo as 3 áreas do sistema
- [ ] Sei a lógica dos prefixos de código de tela
- [ ] Cadastro um item completo nas 7 abas (`VENT0200`)
- [ ] Explico o que muda entre Comprado, Fabricado, De terceiro e Serviço
- [ ] Rodo o checklist de prontidão e sei ler as pendências (`VITM0100`)
- [ ] Monto a descrição técnica via PDM (`VITE0114`/`0115`/`0116`)
- [ ] Sei onde ficam empresa, funcionário, UF, classificação, calendário, prioridade e centro de custo
- [ ] Cadastro tipo de máquina e máquina com capacidade e eficiência (`VMAQ0101`/`VMAQ0200`)
- [ ] Crio cabeçalho de BOM, monto a estrutura e **aprovo** (`VBOM0100` + `VENT0210`)
- [ ] Uso a consulta **Onde usado** (`VENG0500`)
- [ ] Monto roteiro com operações, CT, tempos e dependências (`VPRO0100` + `VENG0600`)
- [ ] Leio o lead time e o caminho crítico
- [ ] Sei que **excluir é exceção** — a regra é cancelar/inativar/encerrar

### Avaliação do instrutor (por participante)

| Competência | 🔴 Não fez | 🟡 Fez com ajuda | 🟢 Fez sozinho |
|:--|:-:|:-:|:-:|
| Cadastrar item completo | | | |
| Definir tipo comprado/fabricado corretamente | | | |
| Montar e aprovar BOM | | | |
| Montar roteiro com tempos | | | |
| Ler alertas / prontidão | | | |

> **Ação para 🔴 e 🟡:** agende 20 min de reforço individual antes do Dia 3 — o PCP depende disso.

---

## Anexo A — Dados-semente do produto-exemplo

### Ficha técnica: **Suporte Soldado** (`PA-SUP-SOLD-001`)

```
        ┌──────────────────┐
        │   ▄▄▄▄▄▄▄▄▄▄▄▄   │  Chapa 6,35mm dobrada em L
        │   █          █   │  Solda de filete nas abas
        │   █    ○  ○  █   │  2 furos Ø9 para parafuso M8
        │   ▀▀▀▀▀▀▀▀▀▀▀▀   │
        └──────────────────┘
```

**Cabeçalho do item**

| Campo | Valor |
|:--|:--|
| Código | `PA-SUP-SOLD-001` |
| Nome | Suporte Soldado 150×80 |
| Grupo PDM / Modificador | `CONJUNTOS` / `Suporte Soldado` |
| Atributos PDM | `{Largura: 150mm, Altura: 80mm, Acabamento: Natural}` |
| UM de estoque | `PC` |
| Tipo (Engenharia) | **Fabricado** |
| Estrutura | `INDUSTRIAL` |
| Tipo de planejamento | MRP |
| Lead time | 3 dias |
| Origem (Contábil) | 0 - Nacional |
| NCM | `7326.90.90` |

**Estrutura (BOM) — MBOM, vigência hoje**

| Seq | Componente | Descrição | Qtd | UM | Perda |
|:-:|:--|:--|:-:|:-:|:-:|
| 10 | `MP-CHAPA-1020-6.35` | Chapa Aço Carbono 1020 6,35mm | 2,500 | KG | **8%** |
| 20 | `MP-PARAF-M8-25` | Parafuso Sextavado M8×25 | 2,000 | PC | 0% |
| 30 | `MP-ELETRODO-E6013` | Eletrodo E6013 Ø2,5mm | 0,150 | KG | 0% |

**Componentes — cadastro**

| Código | UM | Tipo | Tipo planej. | Lead time | Origem |
|:--|:-:|:--|:--|:-:|:--|
| `MP-CHAPA-1020-6.35` | KG | Comprado | MRP | 15 d | 0 - Nacional |
| `MP-PARAF-M8-25` | PC | Comprado | `NORMAL_MRP` + ROP | 7 d | 0 - Nacional |
| `MP-ELETRODO-E6013` | KG | Comprado | `NORMAL_MRP` | 10 d | 0 - Nacional |

**Roteiro de fabricação** (marcar como **Padrão**)

| Seq | Operação | Centro de Trabalho | Tipo máq. | Tempo | Homens | Origem |
|:-:|:--|:--|:--|:-:|:-:|:--|
| 10 | Corte da chapa | `GUILH-01` | CUT | 2 min | 1 | Interna |
| 20 | Dobra em L | `DOBRA-01` | BEND | 3 min | 1 | Interna |
| 30 | Solda de filete | `SOLDA-01` | WELD | 8 min | 1 | Interna |
| 40 | Rebarba e inspeção visual | `BANCADA-01` | — | 4 min | 1 | Interna |

**Rede de precedência**

```
10 (Corte) ──0%──▶ 20 (Dobra) ──0%──▶ 30 (Solda) ──0%──▶ 40 (Acabamento)
```

**Máquinas a cadastrar**

| Código | Nome | Tipo | Capacidade | Unidade | Período | Eficiência | Requer operador |
|:--|:--|:--|:-:|:--|:--|:-:|:-:|
| `GUILH-01` | Guilhotina 6mm | CUT | 120 | Chapas | Por Hora | 0,85 | Sim |
| `DOBRA-01` | Dobradeira CNC | BEND | 90 | Peças | Por Hora | 0,90 | Sim |
| `SOLDA-01` | Cabine de Solda MIG | WELD | 40 | Peças | Por Hora | 0,80 | Sim |

**Tempos item × máquina (`VMAQ0200`)**

| Item | Máquina | Tempo ciclo | Qtd base | Setup | Prioridade |
|:--|:--|:-:|:-:|:-:|:-:|
| `PA-SUP-SOLD-001` | `GUILH-01` | 2 min | 10 | 15 min | 1 |
| `PA-SUP-SOLD-001` | `DOBRA-01` | 3 min | 10 | 20 min | 1 |
| `PA-SUP-SOLD-001` | `SOLDA-01` | 8 min | 1 | 10 min | 1 |

> 💡 **Este produto atravessa os 4 dias.** No Dia 2 vocês compram a chapa; no Dia 3, planejam e produzem o suporte; no Dia 4, vendem, faturam e recebem. Mantenha os mesmos códigos.

---

## Anexo B — Glossário do Dia 1

| Termo | Definição |
|:--|:--|
| **APS** | *Advanced Planning and Scheduling* — sequenciamento avançado da produção |
| **ATP** | *Available to Promise* — saldo disponível para prometer ao cliente |
| **BOM** | *Bill of Materials* — estrutura/receita do produto: componentes e quantidades |
| **CPM** | *Critical Path Method* — cálculo do caminho crítico e do lead time do roteiro |
| **CRP** | *Capacity Requirements Planning* — confronta carga × capacidade dos centros de trabalho |
| **CT** | Centro de Trabalho — onde a operação do roteiro acontece |
| **RASCUNHO / APROVADO / OBSOLETO** | Estados do cabeçalho da BOM. Só **APROVADO** vigente vale para o MRP |
| **EBOM** | Estrutura de **engenharia** — como o produto foi projetado |
| **Efetividade / Vigência** | Data a partir da qual uma versão de estrutura vale |
| **Firmar** | Aprovar uma sugestão do MRP, transformando-a em ordem real |
| **Item Fantasma** | Componente ignorado pelo MRP; a necessidade é explodida para o nível abaixo |
| **LLC** | *Low Level Code* — nível do item na estrutura (1 = produto final, 9 = matéria-prima) |
| **MBOM** | Estrutura de **manufatura** — como o produto é realmente fabricado |
| **MRP** | *Material Requirements Planning* — calcula o que comprar/produzir, quanto e até quando |
| **Máscara** | Formato de codificação (ex.: `99.99.99`) ou código gerado para item configurado |
| **NCM** | Nomenclatura Comum do Mercosul — define a tributação do item |
| **Origem (fiscal)** | 0-Nacional / 1-Estrangeira Importação / 2-Estrangeira Mercado Interno |
| **Origem (operação)** | Interna → gera Ordem de Fabricação · Externa/Terceiros → gera Ordem de Serviço |
| **Overlap** | Percentual em que a operação sucessora pode sobrepor a predecessora |
| **PDM** | *Product Data Management* — descrição técnica composta por Grupo + Modificador + Atributos |
| **ROP** | *Reorder Point* / Ponto de Pedido — `(TR × CM / CR) + ES` |
| **Roteiro** | Sequência de operações que descreve **como** o item é produzido |
| **Saúde do item** | Normal / Crítico / Obsoleto — altera o comportamento do MRP |
| **Setup** | Tempo de preparação da máquina, contado **uma vez** por ordem |
| **Tenant** | A empresa autenticada. Identificador de outra empresa é tratado como inexistente |
| **Tipo do item** | Fabricado / Comprado / De terceiro / Serviço — define o que o MRP gera |
| **Tipo MRP** | `NORMAL_MRP` (entra no cálculo) ou `PROJETO` (fica de fora) |

---

**Fim do Manual do Instrutor — Dia 1.**
Material complementar desta pasta: `roteiro-cronometrado.md` (agenda de bolso) e `apostila-participante.md` (material do aluno).

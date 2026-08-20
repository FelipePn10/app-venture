# DIA 3 — CORAÇÃO INDUSTRIAL · Manual do Instrutor

**PCP (MRP → CRP → APS), Chão de Fábrica, Qualidade e Manutenção**

| | |
|:--|:--|
| **Carga horária** | 4 horas (bloco único, com 15 min de intervalo) |
| **Público principal** | PCP/Planejamento · Produção/Chão de Fábrica · Manutenção |
| **Ouvintes recomendados** | Engenharia, Compras, Custos |
| **Pré-requisito** | **Dia 1** (BOM aprovada + roteiro com tempos) e **Dia 2** (saldo de estoque) |
| **Telas no escopo** | 37 telas (12 troncais · 12 de apoio · 13 de referência) |
| **Entregável do dia** | Ordem de Produção com **operações apontadas** e material consumido do estoque |

> **Posição na corrente:**
> `Cadastros → Engenharia → Suprimentos+Estoque → [PCP → PRODUÇÃO] → Vendas → Fiscal → Financeiro`

---

## ⚠️ Amarra de dependência — leia para a turma na abertura

O MRP consome a **demanda de vendas**, que só será operada plenamente no **Dia 4**. Hoje apresentamos as **fontes de demanda** (previsão, demanda independente, ponto de reposição) e usamos a **demanda independente manual** para rodar o MRP.

É a única "volta" na corrente — e é **proposital**. Diga isso explicitamente; senão a turma se perde.

🗣 *"Hoje a gente vai criar a demanda na mão, para vocês entenderem a mecânica. Amanhã, quando o pedido de venda entrar, ele vai gerar essa demanda sozinho. O motor é o mesmo — muda só quem aperta o botão."*

---

## Índice

1. [Objetivos de aprendizagem](#1-objetivos-de-aprendizagem)
2. [Preparação do instrutor](#2-preparação-do-instrutor)
3. [Mapa completo das telas do Dia 3](#3-mapa-completo-das-telas-do-dia-3)
4. [Agenda minuto a minuto](#4-agenda-minuto-a-minuto)
5. [Abertura (0:00–0:15)](#5-abertura-000015)
6. [Bloco A — Planejar (0:15–1:45)](#6-bloco-a--planejar-015145)
7. [Bloco B — Produzir (2:00–3:15)](#7-bloco-b--produzir-200315)
8. [Dinâmica de fixação + gabarito](#8-dinâmica-de-fixação--gabarito)
9. [Fecho e gancho para o Dia 4](#9-fecho-e-gancho-para-o-dia-4)
10. [Troubleshooting](#10-troubleshooting)
11. [Perguntas que a turma sempre faz](#11-perguntas-que-a-turma-sempre-faz)
12. [Checklist de saída e avaliação](#12-checklist-de-saída-e-avaliação)
13. [Anexo A — Dados-semente do Dia 3](#anexo-a--dados-semente-do-dia-3)
14. [Anexo B — Glossário do Dia 3](#anexo-b--glossário-do-dia-3)

---

## 1. Objetivos de aprendizagem

| # | Competência | Evidência verificável |
|:-:|:--|:--|
| 1 | Explicar as **3 fontes de demanda** do MRP | Diferencia pedido, previsão e demanda independente |
| 2 | Cadastrar **demanda independente** em dia útil válido | Demanda salva, data aceita |
| 3 | Cadastrar/gerar **previsão de vendas** (semanal e mensal) | Previsão distribuída em semanas |
| 4 | Criar um **plano** e **rodar o MRP** | Resumo com itens processados e ordens geradas |
| 5 | Ler as **sugestões** e **firmar** as corretas | Sugestão vira Ordem Planejada + OF |
| 6 | Explicar **necessidade líquida** e **LLC** | Interpreta o Perfil MRP |
| 7 | Ler as **exceções** e notificá-las | 5 tipos de exceção identificados |
| 8 | Rodar o **CRP** e identificar o **gargalo** | Centro com carga > 100% localizado |
| 9 | Rodar o **APS**, ler o **Gantt** e **remanejar** | Operação movida com cascata |
| 10 | Abrir **OF**, consumir insumo, **apontar** e **concluir** | OF em `Concluída` com lote |
| 11 | **Apurar o custo real** e ler a **variância** | Material + conversão + overhead |
| 12 | Vincular **série de ferramenta** e registrar substituição | Histórico com motivo |
| 13 | Registrar **qualidade** e abrir **NC** com disposição | NC com disposição aplicada |
| 14 | Criar **plano preventivo** e gerar/avançar ordem | `Planejada → Em execução → Concluída` |
| 15 | Otimizar e **firmar** um **plano de corte** | Aproveitamento % e retalhos gerados |

**Meta de aprovação do dia:** 12 das 15 competências demonstradas.

---

## 2. Preparação do instrutor

### 2.1 Ambiente e dados-semente

- [ ] **Base dos Dias 1 e 2 preservada** — BOM aprovada, roteiro com tempos e **saldo positivo** de matéria-prima.
- [ ] **Calendário industrial** (`VCAL0100` / `VENT0108`) do ano corrente configurado — ⚠️ *o MRP empurra datas de fim de semana/feriado para o próximo dia útil, e a demanda independente exige dia útil*.
- [ ] **Máquinas com capacidade e eficiência** (`VMAQ0200`) e **tempos item × máquina** cadastrados.
- [ ] **Centros de trabalho** configurados no APS (`VAPS0100`) com **capacidade em horas** e centros de custo de máquina e mão de obra.
- [ ] **Calendários de máquina** (`VAPS0200`) com os turnos reais.
- [ ] **Custo/hora dos centros** (`VCUS0100`) — ⚠️ *sem isso o custo real da OF vem zerado*.
- [ ] **Custo padrão** calculado (`VPRO0300`) para haver base de variância.
- [ ] **Prioridades de ordem** (`VPRI0100`, Dia 1) cadastradas.
- [ ] **Ferramentas e séries** (`VPRO1000`, aba Cadastro) com limite de vida.
- [ ] **Parâmetros de estoque da manufatura** (`VPRO1100`) definidos.
- [ ] **Snapshot do banco** antes da aula.

> ⚠️ **Não deixe pronto:** a demanda, o plano de MRP, a OF, os apontamentos. É tudo entregável da turma.

### 2.2 O que testar na véspera

1. Criar um plano e **rodar o MRP** — confira que sugestões aparecem.
2. **Firmar** uma sugestão de fabricação e ver a **OF criada automaticamente**.
3. Rodar o **CRP** e ver **pelo menos um centro sobrecarregado** — se não houver, aumente a demanda até haver. **O gargalo é o momento mais didático do dia.**
4. **Sequenciar** no APS e abrir o **Quadro do mês**; exportar em SVG/PDF.
5. **Remanejar** uma operação com **Cascata** ligada.
6. Percorrer a OF inteira: consumir → apontar → concluir com lote → apurar custo → encerrar.
7. Rodar o **Plano de Corte** e ver **aproveitamento %** e **retalhos**.
8. Confirmar que o **custo real da OF não vem zerado** (custo/hora cadastrado + consumo registrado).

### 2.3 Os dois quadros que ficam no flip chart

**Quadro 1 — o pipeline de planejamento**
```
DEMANDA ──▶ MRP ──▶ CRP ──▶ APS ──▶ ORDEM DE PRODUÇÃO
          "o quê,   "cabe?"  "quando   "faz"
          quanto,            exatamente?"
          quando"
```

**Quadro 2 — o ciclo da OF**
```
Aberta ──▶ Em produção ──▶ Concluída ──▶ Encerrada
              │                │            │
           consome          IN do        apura
           (OUT)           acabado       custo
                          (com lote)      real
```

---

## 3. Mapa completo das telas do Dia 3

### 3.1 Troncais — demonstrar ao vivo + praticar (12)

| Código | Tela | Por que é troncal |
|:--|:--|:--|
| `VPLA0102` | Demandas Independentes | A entrada primária do MRP hoje |
| `VMRP0100` | MRP (Planejamento de Materiais) | O posto de comando do planejador |
| `VPRO0700` | Alertas de Exceções MRP | O que exige ação depois do cálculo |
| `VPRO0200` | CRP (Capacity Requirements Planning) | "A fábrica tem horas para isso?" |
| `VPRO0210` | APS (Sequenciamento / Gantt) | "Quando exatamente cada operação acontece?" |
| `VPRO0900` | Ordem de Produção (OF) | O plano vira produto |
| `VPRO1000` | Ficha de Produção da Ferramenta | Qual série física roda em cada operação |
| `VPRO0400` | Qualidade (planos, registros e NC) | Qualidade em processo |
| `VPRO0500` | Manutenção Preventiva | Máquina parada derruba o APS |
| `VCUT0100` | Plano de Corte | Aproveitamento de chapa/barra — chave na metalurgia |
| `VPRO0300` | Custo Padrão | Base de comparação da variância |
| `VEST0100` | Estoque | Onde os movimentos da OF aparecem |

### 3.2 Apoio — demonstrar rápido (12)

| Código | Tela | Papel no Dia 3 |
|:--|:--|:--|
| `VPRE0201` | Cadastro da Previsão de Vendas | Semanal, mensal (rateio) e consulta |
| `VPRE0251` | Geração de Previsão de Vendas | Gera do histórico com índice de projeção |
| `VPRE0301` | Previsto × Realizado | Visão gerencial do previsto |
| `VPRO0600` | Previsão Estatística | Escolhe o modelo de melhor ajuste (menor MAPE) |
| `VMRP0200` | Pipeline MRP → CRP → APS | Os três em um disparo |
| `VPLN0100` | Pipeline de Planejamento | Viabilidade + parâmetros globais |
| `VAPS0100` | Grupos, Recursos e Centros de Trabalho | Capacidade em horas e centros de custo |
| `VAPS0200` | Calendários de Máquinas | Turnos e intervalos |
| `VAPS0300` | Paradas de Máquinas | Indisponibilidade que reduz capacidade |
| `VAPS0600` | Cálculo e Consulta do Sequenciamento | O motor por trás do Gantt |
| `VCUS0100` | Custos (centro, compra, alocação, overhead) | Custo/hora que alimenta a apuração |
| `VPRO1100` | Parâmetros de Estoque da Manufatura | Backflush, lote, WMS, almoxarifado de linha |

### 3.3 Referência — mostrar onde fica (13)

| Código | Tela | Quando o usuário vai precisar |
|:--|:--|:--|
| `VPRE0101` | Tabela de Apropriação | Distribuição dentro da semana |
| `VPRE0102` | Bloqueio de Previsão de Vendas | Impede gravação em período bloqueado |
| `VPLA0300` | Parâmetros do Planejamento | Parâmetros globais numerados do MRP |
| `VPLC0200` | Montagem de Carga | Agrupa pedidos em cargas por tipo de frete |
| `VPLC0211` | Orientações de Entrega | Instruções para o transportador |
| `VDPR0100` | Promessa de Entrega — Ocupação e Reservas | Reserva comercial de capacidade |
| `VAPS0400` | Perfil de Operadores | Contatos, funções, supervisor/gerente |
| `VAPS0500` | Perfil Industrial de Máquinas | Serviços, frequência, itens e responsáveis |
| `VPRO0800` | Restrições e Configurador | Regras de combinação válida de atributos |
| `VRES0100` | Motivos de Restrição | Mensagem apresentada quando algo é recusado |
| `VMAN0202` / `VMAN0401` | Apontamento e Consulta de OS de Manutenção | Mão de obra, material e serviço |
| `VENG0610` | Seriais Físicos de Ferramentas | Rastreio da unidade física |

---

## 4. Agenda minuto a minuto

| Horário | Duração | Bloco | Conteúdo | Formato |
|:--|:-:|:--|:--|:--|
| 0:00–0:15 | 15' | Abertura | A corrente até aqui + a amarra de dependência | Fala |
| 0:15–0:32 | 17' | **A1** | Fontes de demanda + previsão | Demo + prática |
| 0:32–1:07 | 35' | **A2** | MRP ⭐ — rodar, ler sugestões, firmar, exceções | Demo + prática |
| 1:07–1:22 | 15' | **A3** | CRP ⭐ — capacidade × carga, o gargalo | Demo + prática |
| 1:22–1:42 | 20' | **A4** | APS ⭐ — sequenciamento, Gantt, remanejamento | Demo + prática |
| 1:42–1:45 | 3' | **A5** | Pipeline em um disparo + parâmetros | Tour |
| 1:45–2:00 | 15' | — | **Intervalo** | — |
| 2:00–2:25 | 25' | **B1** | Ordem de Produção ⭐ — o ciclo completo | Demo + prática |
| 2:25–2:45 | 20' | **B2** | Ferramental, plano de corte e custo | Demo + prática |
| 2:45–3:00 | 15' | **B3** | Qualidade em processo ⭐ | Demo + prática |
| 3:00–3:15 | 15' | **B4** | Manutenção preventiva e paradas | Demo |
| 3:15–3:45 | 30' | **Dinâmica** | "Do plano ao apontamento" | Prática em dupla |
| 3:45–4:00 | 15' | Fecho | Checklist + gancho Dia 4 | Fala |

**Regra de ritmo:** se atrasar, corte **A5** e reduza **B4**. Nunca corte A2 (MRP) nem B1 (OF).

---

## 5. Abertura (0:00–0:15)

### 5.1 A corrente até aqui (5 min)

Abra `VEST0100` com o item de matéria-prima e mostre o **saldo criado ontem**.

🗣 *"Olha o que vocês têm agora: um produto perfeitamente cadastrado, com receita e modo de preparo, e matéria-prima de verdade no estoque. Falta uma coisa só: **alguém decidir o que fazer com isso**. Esse alguém, hoje, é o PCP."*

### 5.2 A mensagem-síntese do dia (3 min)

> 🗣 *"O PCP é o maestro: ele não toca instrumento nenhum, mas faz a orquestra inteira tocar junto. Hoje vocês aprendem a reger a fábrica — planejar certo pra não produzir o que não precisa e não faltar o que precisa."*

### 5.3 A amarra de dependência (3 min)

Leia a caixa de aviso do topo deste manual para a turma. **Não pule.**

### 5.4 As 3 perguntas do dia (4 min)

Escreva no quadro — cada bloco responde uma:

```
MRP  →  "O QUE produzir/comprar, QUANTO e ATÉ QUANDO?"
CRP  →  "A fábrica TEM HORAS para isso?"
APS  →  "QUANDO EXATAMENTE cada operação acontece?"
```

🗣 *"Três perguntas diferentes, três motores diferentes. Muita gente confunde CRP com APS. O CRP diz **se cabe**; o APS diz **quando**. Guardem essa frase."*

---

## 6. Bloco A — Planejar (0:15–1:45)

### A1. Fontes de demanda e previsão (0:15–0:32 · 17 min)

#### As 3 fontes de demanda — explique antes de abrir qualquer tela

| Fonte | Tela | Quando usar |
|:--|:--|:--|
| **Pedido de venda confirmado** | `VVND0200` (Dia 4) | O cliente já comprou — gera demanda automaticamente |
| **Previsão de vendas** | `VPRE0201` / `VPRE0251` | Você acredita que vai vender — produção para estoque |
| **Demanda independente** | `VPLA0102` | Necessidade manual: pedido especial, protótipo, reposição |

🗣 *"O MRP não inventa necessidade — ele **responde** a uma demanda. Se não entrar demanda, ele não sugere nada, e não é bug. Muita gente roda o MRP, não vê sugestão nenhuma e acha que quebrou. Não quebrou: não tinha o que planejar."*

#### `VPLA0102` — Demandas Independentes (demonstrar e praticar, 7 min)

**Pré-requisitos:** item cadastrado · máscara gerada (se configurado) · centro de custo (`VCTB0102`) · calendário com dias úteis (`VENT0108`).

**Passo a passo**
1. **Novo** (F2).
2. **Item** (obrigatório).
3. Se o item for **Configurado**, ative o toggle e selecione a **Máscara** (torna-se obrigatória).
4. **Centro de Custo**.
5. **Quantidade** (> 0).
6. **Data** — ⚠️ **deve ser um dia útil** conforme `VENT0108`.
7. **Salvar** (F9).

⚠️ **Duas rejeições certeiras:**
- **Data em fim de semana ou feriado → rejeitada.** *"Se você não conseguir salvar, olhe o calendário antes de olhar o sistema."*
- **Item configurado sem máscara → não salva.**

#### Previsão de vendas (10 min)

**`VPRE0201` — Cadastro da Previsão** (3 abas)

| Aba | Como funciona |
|:--|:--|
| **Semanal** | Item, Máscara (opcional), **Semana ISO** (1–53), Ano (> 2000), Quantidade (> 0) → **Gravar** |
| **Mensal** | Item, Ano, Mês, Quantidade mensal → **Distribuir em semanas**. ⭐ *O sistema rateia pelas semanas usando os **dias úteis do calendário industrial*** |
| **Consultar** | Por ano ou por item (o item prevalece) |

**Flags do mensal:**
- **Aceita fração** — sem ela, as semanas são **arredondadas para baixo** e o **saldo fica na última semana do mês**.
- **Atualizar existente** — sobrescreve previsões já gravadas.

⚠️ *Se o mês não estiver no calendário industrial, o sistema aplica **fallback de segunda a sexta**.*
⚠️ *Não há edição/exclusão dedicada — a manutenção é **regravar a mesma chave** ou usar **Atualizar existente**.*

**`VPRE0251` — Geração a partir do histórico**

1. Item + **Fonte do histórico**: `ORDERS` (pedidos liberados) · `INVOICING` (faturamento autorizado) · `BOTH`.
2. Período do **histórico** (de/até).
3. Período **gerado** (semana/ano inicial e final).
4. **Projeção (%)** — `+10` aumenta, `-5` reduz, `0` replica a média.
5. **Aceita fração** e **Atualizar existente** conforme necessário.
6. **Gerar previsão**.

⚠️ *Pedidos usados como histórico precisam estar **liberados e sem bloqueio**; cancelados/bloqueados são ignorados.*

**`VPRO0600` — Previsão Estatística** (mostrar, 2 min)

Escolhe **automaticamente o modelo de melhor ajuste** (menor **MAPE**) entre:
`Holt-Winters` · `Suavização Exponencial` · `Média Móvel (k=3)` · `Média Móvel (k=6)`

1. Item + quantidade de **períodos à frente**.
2. Preencha o **histórico** (período e quantidade).
3. Calcule → retorna o **modelo escolhido**, o **MAPE (erro %)** e a quantidade prevista por período (`+1`, `+2`, …).

⚠️ **A previsão estatística NÃO é persistida automaticamente.** Para armazenar, use os blocos de previsão de vendas.

🗣 *"O MAPE é o erro médio percentual do modelo. Se ele der 8%, o modelo erra 8% em média. Se der 45%, não confie — seu histórico é errático demais e a previsão vai enganar mais que ajudar."*

**Complementos (citar):** `VPRE0101` Tabela de Apropriação (distribuição dentro da semana) · `VPRE0102` Bloqueio de Previsão · `VPRE0301` Previsto × Realizado.

---

### A2. MRP ⭐ (0:32–1:07 · 35 min) — *o disparo central do dia*

#### A frase que precisa ficar (diga antes de abrir a tela)

> 🗣 **"O MRP propõe, o planejador dispõe."**
>
> *"O motor roda o cálculo sozinho — explode a estrutura, olha o estoque, calcula a necessidade líquida. Mas ele gera **sugestões**, não ordens. A tela existe para **você** revisar e aprovar. É assim em todo ERP sério. O dia em que um sistema comprar sozinho sem ninguém olhar, esse é o dia de desligar o sistema."*

#### Passo a passo da demo

**1. Criar o plano**
Em **Planos de produção**, crie um plano: **código** + **nome** + **modos de planejamento**. É o plano que o cálculo roda.

**2. Rodar o MRP**
Clique em **Rodar MRP**. O motor:
```
1. Tira um snapshot do estoque
2. Calcula o LLC (nível mais baixo) de cada item
3. Processa item a item:
      demanda − estoque − ordens abertas = NECESSIDADE LÍQUIDA
4. Aplica as regras do item (lote mínimo, múltiplo, lead time, estoque de segurança)
5. Gera as SUGESTÕES
```
O resumo mostra **itens processados** e **ordens geradas**.

**3. Consultar**
Carrega **sugestões**, **exceções** e **ordens planejadas**.

**4. Analisar e firmar**
Na tabela de **Sugestões**, cada linha traz: item, quantidade, **tipo** (Fabricação/Compra), demanda (Independente/Dependente), **data de necessidade**, **data de início** e **LLC**.

**Firmar** → a sugestão vira **Ordem Planejada** real (com número). Se for **Fabricação**, uma **Ordem de Produção é criada automaticamente**.

⚠️ **Aviso obrigatório sobre a numeração:**
> A **Ordem Planejada** e a **Ordem de Produção** têm **numerações próprias e independentes**. **Não espere que os números sejam iguais.** O vínculo é mantido internamente — confirme abrindo a OF criada.

⚠️ **Se repetir a operação, consulte primeiro o estado atual.** Uma ordem já liberada **não deve ser liberada de novo**.

**5. Perfil MRP** — a "tabela MRP" clássica
Demanda · ordens planejadas · ordens firmes · **estoque projetado** ao longo do horizonte.

🗣 *"Essa é a tela que separa quem opera de quem entende. O **estoque projetado** mostra como o saldo evolui no tempo. Se ele fica negativo em algum ponto, é ali que a coisa quebra — e o MRP já te disse a data."*

**6. Exceções**
Ordens atrasadas, compras vencidas, excesso de estoque, sobrecarga.

**7. Regras configuradas por item**
Cadastre regras (ex.: *"se lead_time = 0, usar 15 dias"*) **sem alterar o cadastro do item**.

🗣 *"Isso é ouro na implantação. Você tem 3.000 itens com lead time zerado e não vai corrigir um a um hoje. Cria a regra, o MRP roda com sentido, e você corrige o cadastro com calma."*

**8. Empresas inter-fábrica**
Associe empresas de origem cujas ordens `INTER_FACTORY` entram no plano como demanda. **Liberação automática** faz as sugestões derivadas seguirem sozinhas.
⚠️ **Salvar substitui a lista inteira** — remover todas esvazia as associações.

**9. Relatórios operacionais** (5 visões, **sem rodar o MRP**)

| Relatório | O que traz |
|:--|:--|
| **Perfil** | Demanda × estoque projetado |
| **Disponibilidade** | Estoque + ordens − demanda, por item ou pedido |
| **Necessidades agrupadas** | Consolidado por período |
| **Explosão** | Multinível de um item — ⭐ *aplica perdas e valida a estrutura* |
| **Ponto de reposição** | Itens no ROP |

🗣 *"A **Explosão** é o teste de sanidade da BOM. Ela aplica as perdas e valida a estrutura. Se algo estiver torto no cadastro do Dia 1, ela mostra — sem precisar rodar o MRP inteiro."*

#### Conceitos-chave — escreva no quadro

| Termo | Significado |
|:--|:--|
| **Demanda independente** | O que o cliente pediu (pedido/previsão). É a **entrada** do MRP |
| **Demanda dependente** | O que precisa ser feito **por causa** da independente (explosão da BOM) |
| **Necessidade líquida** | `demanda − estoque disponível − ordens já abertas`. Se ≤ 0, **o MRP não sugere nada** |
| **LLC** | Nível mais fundo em que o item aparece; garante somar **toda** a demanda dele de uma vez |
| **Sugestão × Ordem** | O MRP gera **sugestões**. **Firmar** converte em **Ordem Planejada** real |
| **Firmar** | Ação **irreversível**: ordens firmes passam a contar nos próximos cálculos |

#### Regras de geração — a tabela que resolve 80% das dúvidas

| Situação | O MRP gera |
|:--|:--|
| Item **Fabricado** + necessidade líquida > 0 | **Ordem de Produção** |
| Item **Comprado** + necessidade líquida > 0 | **Ordem de Compra** |
| Item de **terceiro** | ❌ nada |
| Item tipo MRP = **Projeto** | ❌ nada |
| **Estoque suficiente** | ❌ nada |
| Item de estrutura **Comercial** | ❌ nada |

⭐ **Rodar o MRP de novo recalcula do zero as sugestões; ordens já firmadas NÃO são afetadas.**

🗣 *"Isso desarma o medo. Rodar o MRP de novo não bagunça o que você já aprovou. Rodem à vontade — quantas vezes for preciso."*

#### O "momento aha" — não deixe passar

🗣 *"Repara no que acabou de acontecer: o sistema pegou a receita que vocês montaram no Dia 1, olhou o estoque que vocês criaram no Dia 2, e disse sozinho o que falta comprar e o que precisa fabricar — **com data**. Isso que vocês faziam na planilha, ele fez em segundos. E sem esquecer nenhum componente, que é onde a planilha sempre falha."*

#### O calendário e as regras do item

⚠️ O **calendário industrial** (`VCAL0100`) **empurra datas** que caem em fim de semana/feriado **para o próximo dia útil**.
⚠️ As **regras do item** (lote mínimo, lead time, estoque de segurança) **ajustam as quantidades e datas** das sugestões.

🗣 *"Pediu 137 peças e o MRP sugeriu 150? Não é bug — é o lote múltiplo do Dia 1 agindo."*

#### `VPRO0700` — Alertas de Exceções MRP (5 min)

1. Informe o **código do plano**.
2. (Opcional) **URL de webhook** e/ou **e-mails** de destino.
3. **Notificar** → retorna o total de exceções e a lista por tipo.

**Os 5 tipos de exceção:**

| Código | Significado | Ação típica do PCP |
|:--|:--|:--|
| `LATE_ORDER` | Ordem vencida | Reprogramar ou acelerar |
| `OVERDUE_PURCHASE` | Compra vencida | Cobrar o fornecedor |
| `EXCESS_STOCK` | Estoque acima do máximo | Suspender reposição |
| `OPEN_ORDER_NO_DEMAND` | Ordem aberta sem demanda | Cancelar ou realocar |
| `CAPACITY_OVERLOAD` | Centro sobrecarregado | Adiar, hora extra ou terceirizar |

⚠️ Os **dois canais funcionam juntos**. Se o SMTP não estiver configurado, o e-mail é **ignorado silenciosamente**, sem afetar o webhook.

🗣 *"Essa é a diferença entre um PCP reativo e um proativo. As exceções são a lista de coisas que **vão** dar errado. Quem trata a lista todo dia de manhã não apaga incêndio à tarde."*

---

### A3. CRP ⭐ (1:07–1:22 · 15 min)

#### `VPRO0200` — Capacity Requirements Planning

**A pergunta:** *"A fábrica tem horas suficientes para executar as ordens planejadas?"*

**Passo a passo**
1. Informe o **código do plano** (MRP) → **Calcular CRP**.
2. Veja o resumo: total de registros e **quantos centros estão sobrecarregados**.
3. Filtre por **Todos** ou apenas **Sobrecarga** para ver `carga %` por centro × dia.
4. Consulte a capacidade de um **centro específico** em um período.

#### Como interpretar — escreva no quadro

```
carga (%) = horas necessárias ÷ horas disponíveis × 100

Acima de 100%  =  SOBRECARGA

Capacidade nominal = nº de máquinas ativas do centro × 8h/dia − manutenção do dia
```

⭐ **O CRP NÃO rearranja nada.** Ele só **aponta** onde há sobrecarga.

#### As 3 decisões do PCP diante de um gargalo

| Decisão | Quando faz sentido |
|:--|:--|
| **Adiar** ordens | Há folga no prazo do cliente |
| Autorizar **hora extra** | Sobrecarga pontual, o custo compensa |
| **Terceirizar** | Sobrecarga estrutural — vira ordem de serviço (Dia 2, `VTER0200`) |

🗣 **Fala-chave:**
> *"O MRP diz o que fazer; o CRP diz **se cabe**. De nada adianta planejar 100 peças se a dobradeira só dá conta de 60. E repara: o CRP **não conserta** — ele mostra. A decisão de adiar, fazer hora extra ou mandar pra fora é **sua**. O sistema te dá o número; o julgamento é humano."*

⚠️ **A manutenção preventiva (`VPRO0500`) desconta horas da capacidade.** Se você marcou parada, o CRP já conta com ela.

🗣 *"Isso é importante: o CRP não é otimista. Ele já tira as horas de manutenção. Se o número dele dá sobrecarga, é sobrecarga de verdade."*

---

### A4. APS ⭐ (1:22–1:42 · 20 min)

#### `VPRO0210` — Sequenciamento / Gantt

**A pergunta:** *"Quando exatamente cada operação começa e termina?"*

⭐ **A diferença que a turma precisa gravar:**

| | CRP | APS |
|:--|:--|:--|
| Responde | **Se** há capacidade | **Quando** cada operação acontece |
| Visão | Carga % por centro/dia | Gantt, hora a hora |
| Capacidade | Agregada | **Finita** — um trabalho por vez por centro |
| Prioriza por | — | **EDD** (*Earliest Due Date*) — quem vence antes sai na frente |

**Passo a passo**
1. **Sequenciar** → gera o sequenciamento de todas as ordens abertas.
2. Consulte o **Gantt por ordem** (nº da OF) ou **por centro de trabalho** (centro + período).
3. Analise os horários (início/fim) e a ocupação de cada centro.
4. **Quadro do mês:** escolha ano, mês e o agrupamento (**por centro** ou **por ordem**) → **Ver quadro**.
   Consolida o mês inteiro: nº de linhas, **dias sobrecarregados** (carga CRP > 100%), **barras atrasadas** e **dependências** finish-start.
5. **Exporte** como **SVG** (web/impressão) ou **PDF** (A4 paisagem com a marca da empresa).
6. **Remaneje** manualmente (drag-drop): informe a **sequência**, o **novo início** e, opcionalmente, um **novo centro**.

⭐ **O flag Cascata:** as operações **a jusante da mesma OF** são empurradas respeitando a precedência.
⭐ **Avisos de capacidade NÃO bloqueiam o movimento** — é decisão do planejador.

🗣 *"Repara que o sistema te avisa mas não te impede. Isso é proposital: quem conhece o chão é você. Se você sabe que dá pra encaixar, encaixa — o sistema registra que avisou e segue com a sua decisão."*

#### Regras de sequenciamento

⚠️ **Máquinas manuais recebem uma operação por vez**, como qualquer outra (o operador termina antes de começar a próxima).
⚠️ Se uma operação **não couber no dia**, vai para o **próximo dia útil** (fins de semana são pulados).
⚠️ `duração = setup + tempo planejado`

💡 **Ordens ainda não sequenciadas** entram no quadro como *fallback* pelas datas da própria OF.
💡 O quadro mensal é um atalho do quadro por *range* com escala diária — o mesmo motor aceita **qualquer intervalo** e escala semanal (para enxergar trimestres).

#### Os cadastros que sustentam o APS (5 min de tour)

| Tela | O que configura | Atenção |
|:--|:--|:--|
| `VAPS0100` | **Grupos** de recursos · **recursos** (calendário, localização, crítico, ativo) · **centros** (centro de custo **máquina** e **mão de obra**, **capacidade em horas**) | ⚠️ Todas as mutações exigem **ADMIN**. Os dois centros de custo devem representar **naturezas distintas**. Alterações afetam cálculos futuros, **não reescrevem apontamentos** |
| `VAPS0200` | **Calendários de máquina** — intervalos por dia da semana | ⚠️ **Fim posterior ao início.** Dois turnos no mesmo dia = **dois intervalos sem sobreposição**. Intervalos sobrepostos ou vazios **distorcem a capacidade** |
| `VAPS0300` | **Paradas de máquina** — real ou planejada | ⚠️ Horários em RFC3339 com o **fuso do navegador** — confira a data/hora retornada. ⚠️ **Nunca cadastre uma parada falsa para ajustar o Gantt manualmente** |
| `VAPS0600` | **Cálculo e consulta do sequenciamento** — o motor | Listas vazias = considera todo o universo elegível. O flag **"Listar somente recursos ativos"** exige ADMIN |
| `VAPS0400` / `VAPS0500` | Perfil de operadores · perfil industrial de máquinas | Consulta ADMIN/USER; alterações exigem ADMIN |

🗣 **Sobre paradas falsas:** *"Já vi gente cadastrar parada de máquina que não existe só para o Gantt ficar bonito. Não façam isso. A parada falsa some do Gantt mas fica no cálculo de capacidade, e daqui a três meses ninguém entende por que a fábrica 'não tem hora'."*

---

### A5. Pipeline em um disparo (1:42–1:45 · 3 min)

#### `VMRP0200` / `VPLN0100` — MRP → CRP → APS

**`VMRP0200` — passo a passo**
1. **Código do plano**
2. **Número inicial da ordem** — reservado para as sugestões geradas
3. Marque **Gerar LLC** quando os níveis baixos precisarem ser recalculados
4. **Data/hora inicial do sequenciamento**
5. **Execute uma única vez** e acompanhe o retorno consolidado

⚠️ **O fluxo é sequencial:** MRP calcula necessidades → CRP mede capacidade → APS posiciona as operações.
⚠️ **Falha em uma etapa pode impedir as seguintes.** Não presuma atomicidade total — **confira os registros retornados**.
⚠️ Leia o resultado de **cada etapa**, especialmente: itens sem estrutura/lead time, centros sobrecarregados e operações não sequenciadas.
⚠️ **Só libere sugestões depois de revisar a viabilidade.**

**`VPLN0100`** — informe o **plano**, o **número inicial de ordem** (default `10000`) e, opcionalmente, a **data de início**. O resultado informa se o plano é **viável** e traz as observações.

⚠️ **Executar o pipeline REGRAVA as sugestões do plano informado.** Ele **não firma ordens automaticamente**.
⚠️ O bloco de **parâmetros** são **globais** — a mudança afeta **todos** os próximos cálculos, não só o plano em tela.

**`VPLA0300` — Parâmetros do Planejamento** (citar)
1. Localize o **número documentado** do parâmetro.
2. Abra pelo número e confira descrição, valor atual e tipo.
3. **Alterar** → informe número e novo valor.
4. **Reabra e execute um cálculo controlado para validar o efeito.**

⚠️ Valores são armazenados como **texto** e interpretados pelo domínio — **não inclua símbolos nem formatação incompatível**.
⚠️ **Alterar lote, estoque de segurança ou políticas de cálculo pode modificar TODAS as sugestões futuras. Documente a mudança.**

---

## 7. Bloco B — Produzir (2:00–3:15)

### Transição (1 min)

🗣 *"O plano está pronto. Agora ele desce pro chão: a ordem planejada vira **Ordem de Produção** e a fábrica coloca a mão na massa. E aqui muda o perfil de quem opera — sai o planejador, entra o encarregado."*

---

### B1. Ordem de Produção ⭐ (2:00–2:25 · 25 min)

#### `VPRO0900` — o ciclo completo

**Pré-requisitos:** item com **roteiro** (`VPRO0100`) e **estrutura** (`VENT0210`) · **insumos com saldo** (`VEST0100`).

```
Aberta ──▶ Em produção ──▶ Concluída ──▶ Encerrada
                                              (ou Cancelada)
```

**Passo a passo — execute inteiro ao vivo**

| # | Ação | O que acontece por baixo |
|:-:|:--|:--|
| 1 | **Nova ordem:** Item, **Quantidade planejada**, máquina, centro de custo e prioridade → **Criar OF** | Nasce **Aberta** |
| 2 | **Iniciar (→ Em produção)** | Muda o status |
| 3 | **Explodir roteiro** (opcional) | Traz as operações da OF |
| 4 | **Consumir insumo:** Item e Quantidade | ⭐ Gera **OUT** no estoque e **alimenta o custo real** |
| 5 | **Apontar:** quantidade produzida / refugada | Com **backflush**, os componentes da BOM são baixados automaticamente |
| 6 | **Concluir (→ Concluída):** depósito do acabado + **lote** | ⭐ Gera o **IN** do acabado e **habilita a genealogia** |
| 7 | **Apurar custo** e **Encerrar** | O fechamento também apura o custo real automaticamente |
| 8 | **Retornar sucata** | Registra subproduto valorizado (**IN**) para reaproveitamento |

#### ⭐ As automações de estoque — a tabela que amarra tudo

| Ação na OF | Efeito no estoque |
|:--|:--|
| **Consumo** | **OUT** do insumo (atualiza saldo e **custo médio**) |
| **Conclusão** | **IN** do acabado (com lote, se informado) |
| **Fechar** | Apura o **custo real** (material + conversão + overhead) e a **variância vs padrão** |

#### De onde vem cada parcela do custo real

```
Material   ← custo médio do estoque (dos insumos consumidos)
Conversão  ← horas apontadas × custo/hora do centro (VCUS0100)
Overhead   ← alocação (VCUS0100)
─────────────────────────────────────────
Custo real da OF   →  comparado ao Custo Padrão (VPRO0300)  =  VARIÂNCIA
```

⚠️ **A apuração é idempotente** — reexecutar recalcula a linha única da OF. *"Podem rodar de novo sem medo."*

#### As duas falas obrigatórias deste tópico

🗣 **Sobre a rastreabilidade:**
> *"Essa OF é a ligação entre o plano e o físico. Quando você aloca o lote da chapa que entrou ontem, o sistema já sabe **exatamente** qual material foi para qual produto. Isso é rastreabilidade de verdade, do lote ao produto acabado. No dia em que um cliente reclamar, você abre a genealogia e sabe qual corrida foi. Sem isso, é recall total."*

🗣 **Desmistificar o apontamento — repita 2×:**
> *"Apontar não é 'preencher papelada pro chefe'. É como o **custo real** e a **rastreabilidade** acontecem. Cada apontamento seu é o que faz o sistema saber quanto custou **de verdade** produzir aquela peça — e é isso que protege a margem lá no Dia 4. Sem apontamento, o custo é chute, e o preço vira aposta."*

#### `VPRO1100` — Parâmetros de Estoque da Manufatura (mostrar, 3 min)

Rotina que **altera comportamento transversal da produção** — deve ser operada por usuário autorizado.

| Bloco | O que configura |
|:--|:--|
| **Parâmetros gerais** | Modo de retorno de lote · **baixa automática (backflush)** · janela de movimentos |
| **Controle por item** | Item, UM de estoque, controles de **lote/endereço**, grupo de inventário, tipo de baixa, **almoxarifado de linha** |
| **Endereços de almoxarifado** | Almoxarifado, se usa **WMS**, saída intermediária |

⚠️ **Não mude parâmetros durante apontamentos em andamento.**
⚠️ Combinações incompatíveis de lote, WMS ou almoxarifado são **recusadas**.
💡 Depois de alterar, **abra uma OF de teste** e valide reserva, baixa e retorno.

---

### B2. Ferramental, plano de corte e custo (2:25–2:45 · 20 min)

#### `VPRO1000` — Ficha de Produção da Ferramenta (7 min)

**O problema que ela resolve:** a fábrica tem **várias cópias físicas da mesma ferramenta** (o mesmo molde/matriz, cada uma com seu número de série). Esta tela define **qual série** roda em cada operação da OF — e o desgaste é debitado **na série exata**.

**Aba Ficha de Produção**
1. **Filtrar por nº / item** → busque a ordem (⚠️ *a lista **exclui ordens tipo OFC***) → **Abrir**.
2. A ficha traz o cabeçalho e as **operações** com recurso, ferramenta e série atual.
3. Para cada operação: selecione **ferramenta** e **série** → **Vincular**.
4. Se a série precisar trocar (quebra, manutenção): selecione a **nova série**, informe o **motivo** → **Substituir**.
   ⭐ *O histórico (série antiga → nova + motivo) é guardado — veja em **Histórico**.*
5. **Atualiza** recarrega os vínculos.

**Aba Cadastro de Ferramentas**
1. Cadastre a ferramenta (⭐ **o código é gerado automaticamente**): nome, tipo, **tipo de vida** (`GOLPES` / `HORAS` / `PECAS`), **limite de vida** e custo.
2. Selecione a ferramenta para gerenciar as **séries** (número, status `ATIVA`/`MANUTENCAO`/`INATIVA`, localização).
3. **Zerar vida útil** após a troca física · **Inativar** quando aposentada.

⭐ **O consumo de vida é debitado na SÉRIE vinculada, não na ferramenta genérica.**
⭐ **"Ferramentas → precisam de troca"** lista as que atingiram o limite de vida.

🗣 *"Ter três matrizes iguais e controlar como se fosse uma é o erro clássico. Uma está no fim da vida e as outras novinhas — e o sistema acha que todas estão a 70%. Aqui o desgaste vai na peça física certa."*

💡 **`VENG0610`** (Dia 1) mantém os **seriais físicos** com situação e localização.

#### `VCUT0100` — Plano de Corte (8 min) ⭐ *o tópico mais metalúrgico do dia*

**O que faz:** otimiza o aproveitamento de matéria-prima encaixando (*nesting*) as peças no estoque disponível.

**Três tipos de corte:**

| Tipo | Para que serve |
|:--|:--|
| **Linear 1D** | Barras, perfis, tubos |
| **2D guilhotinado** | Chapa, painel |
| **True-shape** | Irregular — laser/plasma |

**Passo a passo**
1. **Listar** (carrega planos e os padrões da empresa).
2. **Novo plano:** **matéria-prima**, **tipo de corte**, **kerf**, **refile**, **sobra mínima**, **UoM de estoque** e ⚠️ **depósito** → **Criar plano** (nasce **Rascunho**).
3. **Demanda / peças:** adicione as peças a cortar — comprimento (1D) ou largura×altura (2D) e quantidade.
4. **Estoque disponível:** adicione as peças de estoque (cada uma com seu tamanho); marque **retalho** quando for sobra reaproveitada.
   💡 *Ou marque **semear retalhos** no cadastro para o sistema puxar os retalhos do inventário automaticamente.*
5. **Otimizar** → calcula os **padrões de corte** (layout repetido N vezes), o **aproveitamento (%)**, a **sucata** e lista peças **sem encaixe**.
6. Revise os padrões (posição de cada peça ao longo da barra/chapa).
7. **Firmar (baixa)** → consome o estoque de verdade, gera os **retalhos** e a trilha de consumo. O plano passa a **Firmado**.
8. **Programa** mostra a sequência de cortes · **Agendar** leva à agenda da máquina · **SVG/DXF/PDF** baixam o mapa para a seccionadora/CAM.

**Conceitos — escreva no quadro**

| Termo | Significado |
|:--|:--|
| **Kerf** | Material perdido na **espessura da serra** entre dois cortes |
| **Refile (trim)** | Aparo removido da **cabeça** da barra/chapa antes do primeiro corte |
| **Retalho** | Sobra ≥ sobra mínima — **volta ao estoque** como material reaproveitável, **com rastreabilidade** |
| **Aproveitamento** | `demanda ÷ estoque consumido` (inclui a sobra da última barra) |
| **Sucata** | Perda **real** (exclui o retalho) — **vira custo** |
| **Status** | `Rascunho → Otimizado → Firmado → Em execução → Concluído` |

⚠️ **Materiais diferentes são planos diferentes** — cada plano corta **um único item** de matéria-prima.
⚠️ **Firmar exige depósito** no plano (ou depósito padrão nos parâmetros da empresa).
⚠️ **Modo de consumo:** **Automático (FIFO)** baixa da corrida mais antiga · **Manual** usa o lote atribuído.
⚠️ Peças maiores que qualquer estoque ficam **sem encaixe** (aviso ao operador).

🗣 **Fala-chave:**
> *"Numa metalúrgica, sobra de chapa é dinheiro no lixo. E repara na diferença entre **retalho** e **sucata**: retalho volta pro estoque com rastreabilidade — ele **herda o lote, a corrida e o certificado**. Sucata é perda de verdade e vira custo. A diferença entre os dois é a **sobra mínima** que você configura. Configurar isso bem é dinheiro no bolso, todo mês."*

#### Custo (5 min)

**`VPRO0300` — Custo Padrão**
1. Informe o **item** → **Calcular** (executa o **rollup multinível**).
2. Veja os componentes: **Material** · **Operação** · **Overhead** · **Total**.
3. **Consultar** recupera o custo padrão salvo.

```
custo = Σ material(BOM) + Σ (tempo_operação × custo/hora_centro) + overhead
```

⭐ O **rollup multinível** compõe o custo dos **intermediários antes** do produto final.

**`VCUS0100` — Custos (as entradas do cálculo)**
- **Custo/hora** por centro de trabalho ⚠️ *sem isso o custo real da OF vem zerado*
- **Custo de compra** por item
- **Bases de alocação** (critério de rateio)
- **Alocações de overhead**
- Permite recalcular o **rollup** do custo padrão

🗣 *"O custo padrão é a expectativa; o custo real da OF é o que aconteceu. A diferença é a **variância** — e é ela que diz se o problema está no processo, no cadastro ou no preço da matéria-prima. Sem custo/hora cadastrado aqui, essa conta inteira vem zerada e ninguém entende por quê."*

---

### B3. Qualidade em processo ⭐ (2:45–3:00 · 15 min)

#### `VPRO0400` — Qualidade (4 peças)

```
PLANOS ──▶ CARACTERÍSTICAS ──▶ REGISTROS ──▶ NÃO-CONFORMIDADES
"o que e     "os pontos          "o laudo      "quando sai fora"
 quando"      medidos"            real"
```

**Aba Planos & Características**
1. **Novo plano:** Item, **Momento** (`RECEBIMENTO` / `PROCESSO` / `EXPEDICAO`), descrição, **tamanho da amostra**, **nível de aceitação** e (opcional) a **operação do roteiro** → **Criar plano**.
2. **Buscar planos** por item ⚠️ *(a consulta é **por item** — não há listagem geral)* e selecione um na grade.
3. No painel do plano, adicione **características**: nome, **nominal**, **tolerâncias −/+**, unidade, **crítica**.
4. **Desativar** encerra o plano.

**Aba Registros**
1. Selecione o **plano** (busque antes na aba Planos) — as características carregam automaticamente.
2. Informe **OF**, **lote**, quantidades **inspecionada / aprovada / rejeitada** e o **resultado** (`APROVADO` / `REJEITADO` / `CONDICIONAL` / `PENDENTE`).
3. Informe o **valor medido** por característica e marque "conforme" → **Gravar registro**.
4. Consulte registros **por ordem (OF)** ou **por item**.

**Aba Não-conformidades**
1. As NC **em aberto** carregam automaticamente.
2. Registre uma nova NC: item, quantidade, **severidade** (`CRITICA` / `MAIOR` / `MENOR` / `OBSERVACAO`), descrição; opcional: registro/OF/lote.
3. Para cada NC, escolha a **disposição** → **Aplicar**.

**As 4 disposições:**

| Disposição | O que significa |
|:--|:--|
| `SUCATA` | Perda — vira custo |
| `RETRABALHO` | Volta para a linha |
| `APROVADO_CONDICIONAL` | Aceito com desvio, sob decisão |
| `DEVOLVIDO` | Volta ao fornecedor |

⚠️ *A inspeção **`PROCESSO`** ocorre **após uma operação**; registros e NC referenciam a **OF**.*
⚠️ *A operação do roteiro pode **ancorar** o plano (`route_operation_id`).*

🗣 **Fala-chave:**
> *"Qualidade no processo é mais barata que qualidade no cliente. Pegar o desvio aqui custa **uma peça**; pegar depois custa **o cliente**. E repara que a NC não fecha sozinha: ela fica aberta até alguém dar a **disposição**. Isso é de propósito — ninguém consegue varrer o problema pra debaixo do tapete."*

#### Restrições (citar, 2 min)

| Tela | O que faz |
|:--|:--|
| `VPRO0800` | Regras que controlam quais **combinações de atributos** são válidas. Operadores: `==` `!=` `>` `<` `>=` `<=` `IN` `NOT_IN`. Use **Avaliar** para testar um contexto |
| `VRES0100` | Os **motivos** apresentados quando uma combinação é recusada |

⚠️ Em `VRES0100`: escreva descrição **objetiva, orientada ao usuário**. **Evite mensagens técnicas** ou que revelem regra confidencial. **Prefira inativar** quando o motivo já fizer parte do histórico.

---

### B4. Manutenção preventiva (3:00–3:15 · 15 min)

#### `VPRO0500` — Manutenção Preventiva

**Por que isso é PCP, e não "outro setor":**

🗣 *"A manutenção não é um setor à parte. Máquina parada derruba o APS que a gente montou de manhã. E o CRP **já desconta** as horas de parada da capacidade — ou seja, preventiva bem cadastrada é o que faz o plano ser realista. Preventiva não cadastrada é o que faz a fábrica prometer o que não pode cumprir."*

**Passo a passo**
1. **Crie um plano:** máquina, centro de trabalho, **frequência** (`Diária` / `Semanal` / `Mensal` / `Personalizada`), **intervalo em dias** e **horas estimadas de parada**.
2. **Gerar ordens** (por **horizonte de dias**) cria ordens **Planejadas** de forma **idempotente** ⭐ *(não duplica plano+data)*.
3. Avance a ordem:
   ```
   Planejada ──▶ Em execução ──▶ Concluída
                (registra       (registra horas
                 início)         reais e término)
   ```

⭐ **As horas de parada são descontadas da capacidade pelo CRP**, evitando planejar produção em horários de máquina parada.

#### `VAPS0300` — Paradas de Máquina (revisão)

Indisponibilidade **real ou planejada** que reduz a capacidade considerada pelo APS.

1. Consulte por **máquina e intervalo completo de data/hora** — ⚠️ *verifique se já existe parada sobreposta*.
2. **Cadastrar:** Máquina, Início, Fim, **Tipo**, **Motivo** e **ordem de manutenção** (opcional).
   ⚠️ *Vincule a ordem apenas quando ela **existir** e **representar a causa** da indisponibilidade.*
3. ⚠️ Horários em **RFC3339** com o fuso do navegador — **confira a data/hora retornada** para evitar deslocamento de fuso.
4. Atualize a listagem no mesmo intervalo e confirme que a parada aparece **uma única vez**.
5. **Execute um sequenciamento controlado** e valide que operações não ocupam o período bloqueado.

⚠️ **Nunca cadastre uma parada falsa para ajustar manualmente o Gantt.**

#### Ordens de serviço de manutenção (5 min)

**`VMAN0202` — Apontamento de OS**
1. Selecione a **Ordem de Serviço**.
2. Para cada movimentação: **Tipo** (`Mão de Obra` / `Material` / `Serviço`), **Data/Hora**, **Item/Serviço** (condicional), **Quantidade**, **Valor**, **Observação**.
3. **Salvar** (F9).

⭐ **Apontamento do tipo Material gera movimentação de estoque** (baixa no almoxarifado).
💡 Mão de obra usa **horas**; material usa **unidades de estoque**; serviço pode usar horas ou valor fixo.

**`VMAN0401` — Consulta de OS**
Filtros **cumulativos** (AND): número, período, item, status, responsável. ⚠️ **Read-only** — para editar, vá à tela de origem. Exporta para Excel.

**`VAPS0500` — Perfil Industrial de Máquinas** (citar)
Descrição de uso, aquisição, tempo/unidade de preparação, fornecedor, marca, preferência, responsável pela manutenção + **serviços** (código, tipo, frequência, tolerância, última execução, itens e responsáveis) + **campos especiais**.

## 8. Dinâmica de fixação + gabarito

### "Do plano ao apontamento" (30 min)

**Formato:** duplas · **Entregável:** OF com operações apontadas e material consumido do estoque

#### Setup (3 min)

Usando o produto e o material dos Dias 1 e 2, cada dupla leva o **suporte soldado** do plano ao apontamento.

#### Tarefa cronometrada (20 min)

| # | Passo | Tela | Ponto de controle |
|:-:|:--|:--|:--|
| 1 | Cadastrar a **demanda independente** (dia útil!) | `VPLA0102` | Salvou sem rejeição de data |
| 2 | Criar o **plano** e **rodar o MRP** | `VMRP0100` | Resumo com ordens geradas |
| 3 | Ler as **sugestões** e identificar a do produto | `VMRP0100` | Tipo = Fabricação |
| 4 | **Firmar** a sugestão | `VMRP0100` | Ordem Planejada + OF criada |
| 5 | Ler o **Perfil MRP** do produto | `VMRP0100` | Estoque projetado interpretado |
| 6 | Ler as **exceções** | `VPRO0700` | Tipos identificados |
| 7 | Rodar o **CRP** e achar o **gargalo** | `VPRO0200` | Centro com carga > 100% |
| 8 | **Sequenciar** no APS e ver o Gantt | `VPRO0210` | Barras posicionadas |
| 9 | **Remanejar** uma operação com Cascata | `VPRO0210` | Operações a jusante empurradas |
| 10 | Abrir a **OF** e **Iniciar** | `VPRO0900` | Status Em produção |
| 11 | **Consumir** o insumo (lote do Dia 2) | `VPRO0900` | Movimento OUT gerado |
| 12 | **Apontar** as operações de corte e solda | `VPRO0900` | Produzido + refugo |
| 13 | Vincular a **série de ferramenta** | `VPRO1000` | Série vinculada |
| 14 | Registrar **1 medição de qualidade** | `VPRO0400` | Registro gravado |
| 15 | **Concluir** com lote e **apurar o custo** | `VPRO0900` | IN do acabado + custo real |
| 16 | Conferir os movimentos no **estoque** | `VEST0100` | OUT e IN visíveis |

#### Gabarito para o instrutor validar

- [ ] Demanda independente salva em **dia útil**
- [ ] Plano criado e MRP **rodado** com sugestões geradas
- [ ] Sugestão **firmada** → Ordem Planejada + **OF criada automaticamente**
- [ ] CRP rodado com **pelo menos um centro sobrecarregado** identificado
- [ ] APS **sequenciado**, com Gantt visível
- [ ] OF com status **Concluída** (ou Encerrada)
- [ ] **Movimento OUT** do insumo no `VEST0100`
- [ ] **Movimento IN** do acabado **com lote**
- [ ] **≥ 2 operações apontadas** com quantidade produzida
- [ ] **Custo real apurado ≠ 0** (material + conversão)
- [ ] **≥ 1 registro de qualidade** gravado
- [ ] Série de ferramenta vinculada a pelo menos uma operação

#### Erros que vão aparecer (e o que dizer)

| Erro observado | Diagnóstico | Como corrigir |
|:--|:--|:--|
| Demanda não salva | Data em fim de semana/feriado | Escolher dia útil (`VENT0108`) |
| MRP roda mas **não gera nada** | Sem demanda, ou estoque suficiente, ou item não é Fabricado/Comprado | Conferir a tabela de regras de geração |
| MRP não explode a BOM | **BOM não está `APROVADO`** (Dia 1!) | `VBOM0100` |
| Sugestão sem data coerente | Item sem **lead time** | `VENT0200` aba Planejamento, ou regra configurada no MRP |
| Firmou e não achou a OF | Numerações **independentes** | Abrir a OF criada para confirmar o vínculo |
| CRP sem sobrecarga nenhuma | Demanda baixa demais para a capacidade | Aumentar a quantidade da demanda |
| CRP com capacidade zero | Centro sem **capacidade em horas** (`VAPS0100`) ou máquinas inativas | Conferir cadastro |
| APS não sequencia a operação | Operação sem centro de trabalho ou sem tempo | Conferir o roteiro do Dia 1 |
| Gantt com barras estranhas | Calendário de máquina com intervalos sobrepostos | `VAPS0200` |
| Não consegue consumir insumo | **Sem saldo** no estoque | Voltar ao Dia 2 |
| Custo real **zerado** | Sem consumo registrado, ou centro **sem custo/hora** | `VCUS0100` |
| Variância absurda | Custo padrão não calculado | `VPRO0300` |
| Não consegue concluir a OF | Falta depósito do acabado ou lote obrigatório | Informar ambos |
| Plano de corte não firma | **Falta depósito** no plano | Informar o depósito |
| Peça "sem encaixe" | Maior que qualquer peça de estoque | Comportamento correto — avisar o operador |
| NC não some da lista | Falta a **disposição** | Aplicar disposição |

#### Validação e correção (5 min)

Passe de máquina em máquina com o gabarito acima. Para cada dupla, marque o que ficou 🟢/🟡/🔴 e **corrija na hora** o que estiver errado — o erro corrigido na frente da pessoa fixa mais do que o acerto de primeira.

#### Fechamento (2 min)

🗣 *"Produzimos. Agora falta a parte que paga a conta: **vender, faturar e receber**. É o Dia 4 — o giro que fecha a corrente."*

---

## 9. Fecho e gancho para o Dia 4

### Recapitulação em 3 frases

1. **O MRP propõe, o planejador dispõe** — sugestão só vira ordem quando alguém firma.
2. **CRP diz se cabe; APS diz quando.** São perguntas diferentes.
3. **Apontar é como o custo real e a rastreabilidade acontecem** — não é papelada.

### O círculo que fecha (2 min)

Abra `VEST0100` e mostre os dois movimentos gerados pela OF: o **OUT** da chapa e o **IN** do suporte.

🗣 *"Olha o que aconteceu com o estoque de ontem: a chapa saiu e o produto entrou. O saldo de matéria-prima caiu, o de acabado subiu. Ninguém digitou isso — foi a OF. É assim que um ERP conversa consigo mesmo."*

### Gancho

🗣 *"A fábrica produziu. Amanhã fechamos o ciclo: **vender pelo preço certo, emitir a nota e receber** — sem furar o caixa nem o fisco. E vocês vão ver esse custo que apuramos hoje virar **margem** lá no preço."*

### Lição de casa opcional

- Rodar o MRP com a demanda real do próximo mês e listar as **exceções**.
- Conferir se todos os centros de trabalho têm **custo/hora** cadastrado (`VCUS0100`).

---

## 10. Troubleshooting

### Erros específicos do Dia 3

| Sintoma | Causa provável | Solução |
|:--|:--|:--|
| MRP não gera sugestão nenhuma | Sem demanda registrada | Cadastrar demanda (`VPLA0102`) ou previsão |
| MRP ignora um item | Item de terceiro, tipo Projeto, estrutura Comercial ou estoque suficiente | Comportamento correto |
| BOM não é explodida | Status **≠ `APROVADO`** | `VBOM0100` |
| Datas todas no mesmo dia | Item sem lead time | `VENT0200` ou regra configurada |
| Quantidade sugerida diferente da pedida | **Lote mínimo/múltiplo** agindo | Comportamento correto |
| Data empurrada alguns dias | **Calendário** empurrou para o próximo dia útil | Comportamento correto |
| "Já liberada" ao firmar de novo | Ordem já firmada | Consultar o estado atual antes |
| Pipeline (`VMRP0200`) para no meio | Falha em uma etapa impede as seguintes | Ler o retorno de cada etapa |
| Parâmetro de planejamento sem efeito | Valor com símbolo/formatação incompatível | Valores são **texto**; sem símbolos |
| CRP com carga irreal | Calendário de máquina com intervalos sobrepostos ou vazios | `VAPS0200` |
| Capacidade menor que o esperado | **Manutenção** descontando horas | Comportamento correto |
| APS deixa operação para o dia seguinte | Não coube no dia; fins de semana são pulados | Comportamento correto |
| Remanejamento avisa mas deixa mover | **Avisos de capacidade não bloqueiam** — é decisão do planejador | Comportamento correto |
| Parada de máquina com hora deslocada | Conversão RFC3339 com o fuso do navegador | Conferir a data/hora retornada |
| OF não deixa consumir | Sem saldo, ou parâmetros de manufatura incompatíveis | `VEST0100` / `VPRO1100` |
| Custo real zerado | Sem consumo, ou centro sem custo/hora | `VCUS0100` |
| Genealogia vazia depois de concluir | Concluiu **sem informar lote** | Informar o lote na conclusão |
| Ficha de ferramenta não acha a ordem | A lista **exclui ordens tipo OFC** | Verificar o tipo da ordem |
| Vida útil debitada na ferramenta errada | Série não vinculada à operação | Vincular em `VPRO1000` |
| Plano de corte sem retalho | **Sobra mínima** alta demais | Ajustar o parâmetro |
| Plano de corte não acha o plano de qualidade | A consulta de planos é **por item** | Buscar por item |
| NC não fecha | Falta **disposição** | Aplicar disposição |
| Preventiva gerou ordens duplicadas | Não gera — é **idempotente** por plano+data | Reconsultar |

### Códigos de erro (revisão)

| Erro | Verificação |
|:--|:--|
| **400** | Campo obrigatório, número, data/hora, estrutura das listas |
| **401** | Refazer login; não repetir antes de autenticar |
| **403** | Ação exige **ADMIN** ou permissão de planejamento |
| **404** | Código pertence à empresa autenticada? Registro desativado? |
| **409 / 422** | Situação, saldo, vigência, duplicidade, transição permitida |
| **Timeout após gravar** | **Consultar antes de reenviar** |

---

## 11. Perguntas que a turma sempre faz

**P: Qual a diferença entre CRP e APS?**
R: O **CRP** diz **se** há capacidade (carga % por centro/dia). O **APS** diz **quando** cada operação acontece (Gantt, hora a hora). Rode o CRP para achar gargalos e o APS para sequenciar.

**P: Rodei o MRP e não veio sugestão nenhuma. Quebrou?**
R: Não. Provavelmente **não há demanda registrada**, ou a **necessidade líquida é ≤ 0** (estoque suficiente), ou os itens não se qualificam (terceiro, tipo Projeto, estrutura Comercial).

**P: Se eu rodar o MRP de novo, perco o que já aprovei?**
R: **Não.** Rodar de novo **recalcula do zero as sugestões**, mas **ordens já firmadas não são afetadas**.

**P: Firmei a sugestão e o número da OF é diferente do número da Ordem Planejada.**
R: Correto. As **numerações são próprias e independentes**. O vínculo é interno — confirme abrindo a OF criada.

**P: Por que a quantidade sugerida é diferente da que eu pedi?**
R: **Lote mínimo** e **lote múltiplo** do cadastro do item (Dia 1) ajustam a quantidade. **Estoque de segurança** e **lead time** ajustam data e volume.

**P: O custo real da OF veio zerado.**
R: Verifique se houve **consumo** de insumos (a quantidade consumida) e se os centros têm **custo/hora** cadastrado em `VCUS0100`. O fechamento apura o custo.

**P: Por que o ATP é menor que o saldo?**
R: Há **reservas** ativas (pedidos confirmados, romaneios separados). `ATP = saldo − reservas`. É o que realmente pode ser prometido.

**P: O que é backflush?**
R: A **baixa automática** dos componentes da BOM quando você aponta a produção — em vez de consumir insumo a insumo. Configurado em `VPRO1100`.

**P: Qual a diferença entre retalho e sucata no plano de corte?**
R: **Retalho** é sobra ≥ sobra mínima — volta ao estoque como material reaproveitável, herdando lote/corrida/certificado. **Sucata** é perda real e **vira custo**. A **sobra mínima** é o que separa os dois.

**P: Posso cadastrar uma parada de máquina só para ajustar o Gantt?**
R: **Não.** A parada falsa some do Gantt mas **fica no cálculo de capacidade** — e três meses depois ninguém entende por que a fábrica "não tem hora".

**P: O APS me avisou de sobrecarga mas deixou eu mover a operação.**
R: Correto e proposital. **Avisos de capacidade não bloqueiam o movimento** — quem conhece o chão é o planejador. O sistema registra que avisou.

**P: A previsão estatística fica salva?**
R: **Não.** `VPRO0600` calcula em tempo real e **não persiste**. Para armazenar, use os blocos de previsão de vendas (`VPRE0201` / `VPRE0251`).

**P: Onde eu vejo qual lote de chapa foi para qual produto?**
R: Na **genealogia** do lote, em `VEST0100` — histórico bidirecional (OFs que consumiram × produziram).

---

## 12. Checklist de saída e avaliação

### Checklist do participante

- [ ] Explico as 3 fontes de demanda do MRP
- [ ] Cadastro demanda independente em dia útil válido (`VPLA0102`)
- [ ] Cadastro/gero previsão semanal e mensal (`VPRE0201` / `VPRE0251`)
- [ ] Sei ler o MAPE da previsão estatística (`VPRO0600`)
- [ ] Crio um plano e rodo o MRP (`VMRP0100`)
- [ ] Explico necessidade líquida, LLC e demanda dependente × independente
- [ ] Leio as sugestões e **firmo** as corretas
- [ ] Interpreto o **Perfil MRP** e o estoque projetado
- [ ] Identifico os 5 tipos de exceção e sei notificá-los (`VPRO0700`)
- [ ] Rodo o CRP e localizo o **gargalo** (`VPRO0200`)
- [ ] Sei as 3 decisões diante de um gargalo
- [ ] Sequencio no APS, leio o Gantt e **remanejo com cascata** (`VPRO0210`)
- [ ] Sei a diferença entre CRP e APS
- [ ] Abro OF, consumo insumo, aponto e concluo com lote (`VPRO0900`)
- [ ] Apuro o custo real e leio a variância
- [ ] Vinculo série de ferramenta e registro substituição (`VPRO1000`)
- [ ] Otimizo e firmo um plano de corte; sei retalho × sucata (`VCUT0100`)
- [ ] Registro qualidade e aplico disposição em NC (`VPRO0400`)
- [ ] Crio plano preventivo e avanço a ordem (`VPRO0500`)
- [ ] Sei que preventiva desconta capacidade no CRP

### Avaliação do instrutor (por participante)

| Competência | 🔴 Não fez | 🟡 Fez com ajuda | 🟢 Fez sozinho |
|:--|:-:|:-:|:-:|
| Rodar o MRP e firmar sugestão | | | |
| Identificar gargalo no CRP | | | |
| Sequenciar e remanejar no APS | | | |
| Executar a OF do início ao fim | | | |
| Apurar custo real | | | |
| Registrar qualidade / NC | | | |

---

## Anexo A — Dados-semente do Dia 3

### Demanda para a dinâmica (`VPLA0102`)

| Campo | Valor |
|:--|:--|
| Item | `PA-SUP-SOLD-001` |
| Centro de custo | `CC-PROD` |
| Quantidade | **200 PC** |
| Data | Um **dia útil** daqui a 20 dias |

### Plano de MRP (`VMRP0100`)

| Campo | Valor |
|:--|:--|
| Código | `PLANO-TREINO-01` |
| Nome | Plano de treinamento — Dia 3 |
| Nº inicial de ordem | `10000` |

### O que o MRP deve sugerir

| Item | Tipo | Quantidade esperada | Por quê |
|:--|:--|:-:|:--|
| `PA-SUP-SOLD-001` | Fabricação | 200 PC | Demanda independente |
| `MP-CHAPA-1020-6.35` | Compra ou nada | 200 × 2,5 kg × 1,08 (perda) − saldo | Demanda dependente da BOM |
| `MP-PARAF-M8-25` | Compra ou nada | 400 PC − saldo | Demanda dependente |
| `MP-ELETRODO-E6013` | Compra ou nada | 30 kg − saldo | Demanda dependente |

> 💡 **Ajuste a quantidade da demanda** para que o MRP **precise** sugerir compra de pelo menos um item — é mais didático.

### Configuração do APS (`VAPS0100` / `VAPS0200`)

| Centro | Capacidade (h/dia) | Centro de custo máquina | Centro de custo MO | Calendário |
|:--|:-:|:--|:--|:--|
| `GUILH-01` | 8 | `CC-MAQ-CORTE` | `CC-MO-CORTE` | `CAL-1TURNO` |
| `DOBRA-01` | 8 | `CC-MAQ-DOBRA` | `CC-MO-DOBRA` | `CAL-1TURNO` |
| `SOLDA-01` | 8 | `CC-MAQ-SOLDA` | `CC-MO-SOLDA` | `CAL-1TURNO` |

**Calendário `CAL-1TURNO`:** segunda a sexta, `07:00–12:00` e `13:00–17:00` (dois intervalos, sem sobreposição).

> 💡 **Para forçar um gargalo didático:** reduza a capacidade da `SOLDA-01` para 4h/dia. A operação de solda leva 8 min/peça × 200 peças = **26,7 h**, o que estoura vários dias.

### Custo/hora dos centros (`VCUS0100`)

| Centro | Custo/hora |
|:--|:-:|
| `GUILH-01` | R$ 85,00 |
| `DOBRA-01` | R$ 95,00 |
| `SOLDA-01` | R$ 120,00 |
| `BANCADA-01` | R$ 55,00 |

### Custo padrão esperado (`VPRO0300`)

```
Material  = 2,5 kg × 1,08 × R$ 8,40  +  2 × R$ 0,38  +  0,15 × R$ 22,00
          = R$ 22,68 + R$ 0,76 + R$ 3,30
          = R$ 26,74

Operação  = (2/60 × 85) + (3/60 × 95) + (8/60 × 120) + (4/60 × 55)
          = 2,83 + 4,75 + 16,00 + 3,67
          = R$ 27,25

Overhead  = conforme alocação da empresa

Total     ≈ R$ 53,99 + overhead
```

> 💡 Projete essa conta. É o momento em que a Engenharia e o Custo entendem que estão olhando o **mesmo** número.

### Ferramentas (`VPRO1000`, aba Cadastro)

| Ferramenta | Tipo de vida | Limite | Séries |
|:--|:--|:-:|:--|
| Matriz de dobra 90° | `GOLPES` | 50.000 | `MD90-A` (ATIVA) · `MD90-B` (ATIVA) · `MD90-C` (MANUTENCAO) |
| Gabarito de solda | `PECAS` | 20.000 | `GS-01` (ATIVA) |

### Plano de inspeção em processo (`VPRO0400`)

**Plano:** Item `PA-SUP-SOLD-001` · Momento `PROCESSO` · Amostra 5 · Operação `30 — Solda de filete`

| Característica | Nominal | Tol. − | Tol. + | Unidade | Crítica |
|:--|:-:|:-:|:-:|:--|:-:|
| Altura do filete de solda | 4,0 | 0,5 | 0,5 | mm | ✅ |
| Distância entre furos | 100,0 | 0,3 | 0,3 | mm | ✅ |
| Ausência de respingo | — | — | — | — | ❌ |

### Plano de manutenção preventiva (`VPRO0500`)

| Campo | Valor |
|:--|:--|
| Máquina | `SOLDA-01` |
| Centro de trabalho | `SOLDA-01` |
| Frequência | Mensal |
| Intervalo | 30 dias |
| Horas estimadas de parada | 4 h |

### Plano de corte (`VCUT0100`)

| Campo | Valor |
|:--|:--|
| Matéria-prima | `MP-CHAPA-1020-6.35` |
| Tipo de corte | **2D guilhotinado** |
| Kerf | 3 mm |
| Refile | 10 mm |
| Sobra mínima | 200 mm |
| UoM de estoque | KG |
| Depósito | `ALM-MP` |

**Demanda:** 200 peças de 150 × 80 mm
**Estoque:** chapas de 1000 × 2000 mm

---

## Anexo B — Glossário do Dia 3

| Termo | Definição |
|:--|:--|
| **APS** | *Advanced Planning and Scheduling* — sequenciamento em **capacidade finita**, com Gantt |
| **ATP** | `saldo − reservas` — o que realmente pode ser prometido |
| **Backflush** | Baixa automática dos componentes da BOM ao apontar a produção |
| **Capacidade nominal** | `nº de máquinas ativas × 8h/dia − manutenção do dia` |
| **Carga (%)** | `horas necessárias ÷ horas disponíveis × 100`. Acima de 100% = sobrecarga |
| **CRP** | *Capacity Requirements Planning* — diz **se** cabe, não rearranja nada |
| **Demanda dependente** | O que precisa ser feito por causa da independente (explosão da BOM) |
| **Demanda independente** | O que o cliente pediu (pedido/previsão) — a entrada do MRP |
| **EDD** | *Earliest Due Date* — critério de prioridade do APS |
| **Exceção MRP** | `LATE_ORDER` · `OVERDUE_PURCHASE` · `EXCESS_STOCK` · `OPEN_ORDER_NO_DEMAND` · `CAPACITY_OVERLOAD` |
| **Firmar** | Aprovar a sugestão do MRP — **irreversível**; passa a contar nos cálculos seguintes |
| **Genealogia** | Histórico bidirecional do lote: OFs que consumiram × produziram |
| **Kerf** | Material perdido na espessura da serra |
| **LLC** | *Low-Level Code* — nível mais fundo em que o item aparece |
| **MAPE** | Erro médio percentual absoluto — critério de escolha do modelo de previsão |
| **Necessidade líquida** | `demanda − estoque disponível − ordens já abertas` |
| **NC** | Não-conformidade. Severidade: `CRITICA`/`MAIOR`/`MENOR`/`OBSERVACAO`. Disposição: `SUCATA`/`RETRABALHO`/`APROVADO_CONDICIONAL`/`DEVOLVIDO` |
| **Nesting** | Encaixe otimizado das peças no material disponível |
| **OF** | Ordem de Fabricação/Produção. Ciclo: `Aberta → Em produção → Concluída → Encerrada` |
| **Refile (trim)** | Aparo removido da cabeça da barra/chapa |
| **Retalho** | Sobra ≥ sobra mínima — volta ao estoque **com rastreabilidade** |
| **Rollup** | Cálculo multinível que compõe o custo dos intermediários antes do produto final |
| **Sucata** | Perda real (exclui o retalho) — **vira custo** |
| **Sugestão** | Proposta do MRP; vira ordem real só quando **firmada** |
| **Variância** | Diferença entre o **custo real** da OF e o **custo padrão** |

---

**Fim do Manual do Instrutor — Dia 3.**
Material complementar desta pasta: `roteiro-cronometrado.md` e `apostila-participante.md`.

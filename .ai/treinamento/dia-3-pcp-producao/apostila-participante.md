# DIA 3 — CORAÇÃO INDUSTRIAL · Apostila do Participante

**ERP Venture · Treinamento para Indústria Metalúrgica**
*PCP (MRP → CRP → APS), Chão de Fábrica, Qualidade e Manutenção*

---

## Antes de começar

**O que você vai saber fazer no fim do dia:**

✅ Rodar o **MRP** e decidir o que **firmar**
✅ Ler a **capacidade (CRP)** e achar o **gargalo**
✅ **Sequenciar** a fábrica no APS e remanejar o Gantt
✅ Abrir uma **Ordem de Produção**, consumir material, **apontar** e concluir
✅ Registrar **qualidade**, tratar **não-conformidade** e programar **manutenção**
✅ Otimizar o **plano de corte** e entender retalho × sucata

> **Onde estamos:** `Cadastros → Engenharia → Suprimentos+Estoque → [PCP → PRODUÇÃO] → Vendas → Fiscal → Financeiro`

---

## ⚠️ Uma observação importante sobre hoje

O MRP consome a **demanda de vendas** — que só será operada plenamente no **Dia 4**.

Hoje você vai criar a demanda **na mão**, para entender a mecânica. Amanhã, quando o pedido de venda entrar, ele vai gerar essa demanda **sozinho**.

> **O motor é o mesmo — muda só quem aperta o botão.**

---

## Índice

| Parte | Conteúdo |
|:-:|:--|
| 1 | [As 3 perguntas do dia](#parte-1--as-3-perguntas-do-dia) |
| 2 | [Fontes de demanda e previsão](#parte-2--fontes-de-demanda-e-previsão) |
| 3 | [MRP — Planejamento de Materiais](#parte-3--mrp--planejamento-de-materiais) |
| 4 | [CRP — Capacidade](#parte-4--crp--capacidade) |
| 5 | [APS — Sequenciamento e Gantt](#parte-5--aps--sequenciamento-e-gantt) |
| 6 | [Pipeline e parâmetros](#parte-6--pipeline-e-parâmetros) |
| 7 | [Ordem de Produção](#parte-7--ordem-de-produção) |
| 8 | [Ferramental](#parte-8--ferramental) |
| 9 | [Plano de Corte](#parte-9--plano-de-corte) |
| 10 | [Custo](#parte-10--custo) |
| 11 | [Qualidade em processo](#parte-11--qualidade-em-processo) |
| 12 | [Manutenção](#parte-12--manutenção) |
| 13 | [Exercícios do dia](#parte-13--exercícios-do-dia) |
| 14 | [Erros comuns](#parte-14--erros-comuns-e-como-resolver) |
| 15 | [Cola rápida](#parte-15--cola-rápida--os-códigos-do-dia-3) |
| 16 | [Glossário](#parte-16--glossário) |

---

# PARTE 1 — As 3 perguntas do dia

```
MRP  →  "O QUE produzir/comprar, QUANTO e ATÉ QUANDO?"
CRP  →  "A fábrica TEM HORAS para isso?"
APS  →  "QUANDO EXATAMENTE cada operação acontece?"
```

**Três perguntas diferentes, três motores diferentes.**

| | **CRP** | **APS** |
|:--|:--|:--|
| Responde | **Se** há capacidade | **Quando** cada operação acontece |
| Visão | Carga % por centro/dia | Gantt, hora a hora |
| Capacidade | Agregada | **Finita** — um trabalho por vez por centro |
| Prioriza por | — | **EDD** — quem vence antes sai na frente |
| Rearranja? | ❌ Só aponta | ✅ Posiciona no tempo |

## O pipeline

```
DEMANDA ──▶ MRP ──▶ CRP ──▶ APS ──▶ ORDEM DE PRODUÇÃO
          "o quê,   "cabe?"  "quando   "faz"
          quanto,            exatamente?"
          quando"
```

## A mensagem do dia

> **O PCP é o maestro:** ele não toca instrumento nenhum, mas faz a orquestra inteira tocar junto.
>
> Planejar certo é não produzir o que não precisa e não faltar o que precisa.

---

# PARTE 2 — Fontes de demanda e previsão

## 2.1 As 3 fontes de demanda

| Fonte | Tela | Quando usar |
|:--|:--|:--|
| **Pedido de venda confirmado** | `VVND0200` (Dia 4) | O cliente já comprou — gera demanda automaticamente |
| **Previsão de vendas** | `VPRE0201` / `VPRE0251` | Você acredita que vai vender — produção para estoque |
| **Demanda independente** | `VPLA0102` | Necessidade manual: pedido especial, protótipo, reposição |

> ⚠️ **O MRP não inventa necessidade — ele responde a uma demanda.**
> Se não entrar demanda, ele **não sugere nada**. E isso não é bug.

---

## 2.2 `VPLA0102` — Demandas Independentes

**Pré-requisitos:** item cadastrado · máscara gerada (se configurado) · centro de custo (`VCTB0102`) · calendário com dias úteis (`VENT0108`).

### Passo a passo
1. **Novo** (F2).
2. **Item** (obrigatório).
3. Se o item for **Configurado** → ative o toggle e selecione a **Máscara** (torna-se obrigatória).
4. **Centro de Custo**.
5. **Quantidade** (> 0).
6. **Data** — ⚠️ **deve ser um dia útil**.
7. **Salvar** (F9).

### ⚠️ As duas rejeições certeiras
- **Data em fim de semana ou feriado → rejeitada.** *Se não conseguir salvar, olhe o calendário antes de olhar o sistema.*
- **Item configurado sem máscara → não salva.**

💡 A pesquisa permite filtrar por **item** e **data** para localizar demandas existentes.

---

## 2.3 `VPRE0201` — Cadastro da Previsão de Vendas

| Aba | Como funciona |
|:--|:--|
| **Semanal** | Item, Máscara (opcional), **Semana ISO** (1–53), Ano (> 2000), Quantidade (> 0) → **Gravar previsão semanal** |
| **Mensal** | Item, Ano, Mês, Quantidade mensal → **Distribuir em semanas**. ⭐ *O sistema rateia usando os **dias úteis do calendário industrial*** |
| **Consultar** | Por ano ou por item (o item prevalece) |

### Flags do mensal

| Flag | Efeito |
|:--|:--|
| **Aceita fração** | Permite semanas com valor fracionado. **Sem ela**, as semanas são arredondadas **para baixo** e o **saldo fica na última semana do mês** |
| **Atualizar existente** | Sobrescreve previsões já gravadas |

⚠️ Se o mês não estiver no calendário industrial, o sistema aplica **fallback de segunda a sexta**.
⚠️ **Não há edição/exclusão dedicada** — a manutenção é **regravar a mesma chave** ou usar **Atualizar existente**.

---

## 2.4 `VPRE0251` — Geração de Previsão a partir do histórico

### Passo a passo
1. **Item** + **Fonte do histórico**:
   - `ORDERS` — pedidos liberados
   - `INVOICING` — faturamento autorizado
   - `BOTH`
2. Período do **histórico** (de/até).
3. Período **gerado** (semana/ano inicial e final).
4. **Projeção (%)** — `+10` aumenta · `-5` reduz · `0` replica a média.
5. **Aceita fração** e **Atualizar existente** conforme necessário.
6. **Gerar previsão**.

⚠️ Pedidos usados como histórico precisam estar **liberados e sem bloqueio**. Cancelados/bloqueados são **ignorados**.

---

## 2.5 `VPRO0600` — Previsão Estatística

Escolhe **automaticamente o modelo de melhor ajuste** (menor **MAPE**):

`Holt-Winters` · `Suavização Exponencial` · `Média Móvel (k=3)` · `Média Móvel (k=6)`

### Passo a passo
1. **Item** + quantidade de **períodos à frente**.
2. Preencha o **histórico** (período e quantidade).
3. Calcule → retorna o **modelo escolhido**, o **MAPE (erro %)** e a quantidade prevista por período (`+1`, `+2`, …).

⚠️ **A previsão estatística NÃO é persistida automaticamente.** Para armazenar, use os blocos de previsão de vendas.

> 💡 **Como ler o MAPE:** se der 8%, o modelo erra 8% em média. Se der 45%, **não confie** — seu histórico é errático demais e a previsão vai enganar mais que ajudar.

## 2.6 Complementos

| Tela | O que faz |
|:--|:--|
| `VPRE0101` | Tabela de apropriação — distribuição dentro da semana |
| `VPRE0102` | Bloqueio de previsão — impede gravação em período bloqueado |
| `VPRE0301` | Previsto × Realizado — consolida o previsto do ano por item |

---

# PARTE 3 — MRP — Planejamento de Materiais

## 3.1 A frase que resume tudo

> ## **"O MRP propõe, o planejador dispõe."**

O motor roda o cálculo sozinho — explode a estrutura, olha o estoque, calcula a necessidade líquida. Mas ele gera **sugestões**, não ordens.

**A tela existe para VOCÊ revisar e aprovar.**

---

## 3.2 `VMRP0100` — passo a passo

### 1. Criar o plano
Em **Planos de produção**, crie um plano: **código** + **nome** + **modos de planejamento**.

### 2. Rodar o MRP
```
1. Tira um snapshot do estoque
2. Calcula o LLC (nível mais baixo) de cada item
3. Processa item a item:
      demanda − estoque − ordens abertas = NECESSIDADE LÍQUIDA
4. Aplica as regras do item (lote mínimo, múltiplo, lead time, estoque de segurança)
5. Gera as SUGESTÕES
```
O resumo mostra **itens processados** e **ordens geradas**.

### 3. Consultar
Carrega **sugestões**, **exceções** e **ordens planejadas**.

### 4. Analisar e firmar
Cada sugestão traz: item, quantidade, **tipo** (Fabricação/Compra), demanda (Independente/Dependente), **data de necessidade**, **data de início** e **LLC**.

**Firmar** → a sugestão vira **Ordem Planejada** real. Se for **Fabricação**, uma **Ordem de Produção é criada automaticamente**.

> ⚠️ **A Ordem Planejada e a Ordem de Produção têm numerações próprias e independentes.**
> **Não espere que os números sejam iguais.** O vínculo é interno — confirme abrindo a OF criada.

⚠️ **Se repetir a operação, consulte o estado atual primeiro.** Uma ordem já liberada **não deve ser liberada de novo**.

### 5. Perfil MRP — a "tabela MRP" clássica
Demanda · ordens planejadas · ordens firmes · **estoque projetado** ao longo do horizonte.

> 💡 O **estoque projetado** mostra como o saldo evolui no tempo. Se ele fica **negativo** em algum ponto, é ali que a coisa quebra — e o MRP já te disse a data.

### 6. Exceções
Ordens atrasadas, compras vencidas, excesso de estoque, sobrecarga.

### 7. Regras configuradas por item
Cadastre regras (ex.: *"se lead_time = 0, usar 15 dias"*) **sem alterar o cadastro do item**.

> 💡 Isso é ouro na implantação: 3.000 itens com lead time zerado, e você não vai corrigir um a um hoje.

### 8. Empresas inter-fábrica
Associe empresas cujas ordens `INTER_FACTORY` entram no plano como demanda. **Liberação automática** faz as sugestões derivadas seguirem sozinhas.

⚠️ **Salvar substitui a lista inteira** — remover todas esvazia as associações.

### 9. Relatórios operacionais (sem rodar o MRP)

| Relatório | O que traz |
|:--|:--|
| **Perfil** | Demanda × estoque projetado |
| **Disponibilidade** | Estoque + ordens − demanda, por item ou pedido |
| **Necessidades agrupadas** | Consolidado por período |
| ⭐ **Explosão** | Multinível de um item — **aplica perdas e valida a estrutura** |
| **Ponto de reposição** | Itens no ROP |

> 💡 A **Explosão** é o teste de sanidade da BOM. Se algo estiver torto no cadastro do Dia 1, ela mostra — sem precisar rodar o MRP inteiro.

---

## 3.3 Conceitos-chave

| Termo | Significado |
|:--|:--|
| **Demanda independente** | O que o cliente pediu (pedido/previsão). É a **entrada** do MRP |
| **Demanda dependente** | O que precisa ser feito **por causa** da independente (explosão da BOM) |
| **Necessidade líquida** | `demanda − estoque disponível − ordens já abertas`. Se ≤ 0, **o MRP não sugere nada** |
| **LLC** | Nível mais fundo em que o item aparece; garante somar **toda** a demanda dele de uma vez |
| **Sugestão × Ordem** | O MRP gera **sugestões**. **Firmar** converte em **Ordem Planejada** real |
| **Firmar** | Ação **irreversível**: ordens firmes passam a contar nos próximos cálculos |

---

## 3.4 ⭐ Regras de geração — a tabela que resolve 80% das dúvidas

| Situação | O MRP gera |
|:--|:--|
| Item **Fabricado** + necessidade líquida > 0 | **Ordem de Produção** |
| Item **Comprado** + necessidade líquida > 0 | **Ordem de Compra** |
| Item de **terceiro** | ❌ nada |
| Item tipo MRP = **Projeto** | ❌ nada |
| **Estoque suficiente** | ❌ nada |
| Item de estrutura **Comercial** | ❌ nada |

> ⭐ **Rodar o MRP de novo recalcula do zero as sugestões — mas ordens já firmadas NÃO são afetadas.**
>
> Rode à vontade, quantas vezes precisar.

## 3.5 O que ajusta as sugestões

⚠️ O **calendário industrial** (`VCAL0100`) **empurra datas** de fim de semana/feriado para o **próximo dia útil**.
⚠️ As **regras do item** (lote mínimo, múltiplo, lead time, estoque de segurança) **ajustam quantidades e datas**.

> Pediu 137 peças e o MRP sugeriu 150? **Não é bug — é o lote múltiplo do Dia 1 agindo.**

### ⭐ Onde entram as prioridades do `VPRI0100` (Dia 1)

É aqui que aquelas faixas cadastradas no Dia 1 finalmente são usadas. Depois de
gerar as sugestões, o MRP **carimba uma etiqueta de prioridade em cada uma**:

1. Olha a **quantidade** que a sugestão pede.
2. Procura a faixa do `VPRI0100` que contém essa quantidade.
3. Grava o nome da faixa na ordem planejada.

**Duas condições precisam estar satisfeitas, senão nada é etiquetado:**

| Condição | Onde se configura | Se faltar |
|:--|:--|:--|
| Gerar prioridades ligado | Parâmetro **Gerar Prioridades de Ordens** | Nenhuma ordem recebe etiqueta |
| Sugestão dentro da janela | Parâmetro **Dias de Prioridades** (padrão **5**) | Sugestões que começam depois de hoje + N dias ficam **sem** etiqueta |

⚠️ **A janela pega muita gente de surpresa.** Com o padrão de 5 dias, só as
sugestões que começam nos próximos 5 dias são priorizadas — o resto fica em
branco, e isso **é o comportamento esperado**, não falha de cadastro.

⚠️ Quantidade que **não cai em nenhuma faixa** também fica sem etiqueta. Se
você cadastrou de 1 a 100 e a ordem pede 250, ela não recebe prioridade.

---

## 3.6 `VPRO0700` — Alertas de Exceções MRP

### Passo a passo
1. Informe o **código do plano**.
2. (Opcional) **URL de webhook** e/ou **e-mails** de destino.
3. **Notificar** → retorna o total de exceções e a lista por tipo.

### Os 5 tipos de exceção

| Código | Significado | Sua ação |
|:--|:--|:--|
| `LATE_ORDER` | Ordem vencida | Reprogramar ou acelerar |
| `OVERDUE_PURCHASE` | Compra vencida | Cobrar o fornecedor |
| `EXCESS_STOCK` | Estoque acima do máximo | Suspender reposição |
| `OPEN_ORDER_NO_DEMAND` | Ordem aberta sem demanda | Cancelar ou realocar |
| `CAPACITY_OVERLOAD` | Centro sobrecarregado | Adiar, hora extra ou terceirizar |

⚠️ Os **dois canais funcionam juntos**. Se o SMTP não estiver configurado, o e-mail é **ignorado silenciosamente**, sem afetar o webhook.

> 💡 As exceções são **a lista de coisas que vão dar errado**. Quem trata a lista todo dia de manhã não apaga incêndio à tarde.

---

# PARTE 4 — CRP — Capacidade

## `VPRO0200` — Capacity Requirements Planning

**A pergunta:** *"A fábrica tem horas suficientes para executar as ordens planejadas?"*

### Passo a passo
1. Informe o **código do plano** (MRP) → **Calcular CRP**.
2. Veja o resumo: total de registros e **quantos centros estão sobrecarregados**.
3. Filtre por **Todos** ou apenas **Sobrecarga** para ver `carga %` por centro × dia.
4. Consulte a capacidade de um **centro específico** em um período.

## ⭐ Como interpretar

```
carga (%) = horas necessárias ÷ horas disponíveis × 100

Acima de 100%  =  SOBRECARGA

Capacidade nominal = nº de máquinas ativas do centro × 8h/dia − manutenção do dia
```

> ⭐ **O CRP NÃO rearranja nada.** Ele só **aponta** onde há sobrecarga.

## As 3 decisões diante de um gargalo

| Decisão | Quando faz sentido |
|:--|:--|
| **Adiar** ordens | Há folga no prazo do cliente |
| Autorizar **hora extra** | Sobrecarga pontual, o custo compensa |
| **Terceirizar** | Sobrecarga estrutural — vira ordem de serviço (`VTER0200`) |

> **O MRP diz o que fazer; o CRP diz se cabe.**
>
> De nada adianta planejar 100 peças se a dobradeira só dá conta de 60. O CRP **mostra**; a decisão é **sua**.

⚠️ **A manutenção preventiva (`VPRO0500`) desconta horas da capacidade.**
Ou seja: **o CRP não é otimista**. Se o número dele dá sobrecarga, é sobrecarga de verdade.

---

# PARTE 5 — APS — Sequenciamento e Gantt

## `VPRO0210` — Sequenciamento / Gantt

**A pergunta:** *"Quando exatamente cada operação começa e termina?"*

### Passo a passo
1. **Sequenciar** → gera o sequenciamento de todas as ordens abertas.
2. Consulte o **Gantt por ordem** (nº da OF) ou **por centro de trabalho** (centro + período).
3. Analise os horários (início/fim) e a ocupação de cada centro.
4. **Quadro do mês:** ano, mês e agrupamento (**por centro** ou **por ordem**) → **Ver quadro**.
   Consolida o mês inteiro: nº de linhas, **dias sobrecarregados** (carga CRP > 100%), **barras atrasadas** e **dependências** finish-start.
5. **Exporte** como **SVG** (web/impressão) ou **PDF** (A4 paisagem com a marca da empresa).
6. **Remaneje** manualmente (drag-drop): informe a **sequência**, o **novo início** e, opcionalmente, um **novo centro**.

### ⭐ Dois comportamentos importantes

| Comportamento | O que significa |
|:--|:--|
| **Cascata** | As operações **a jusante da mesma OF** são empurradas respeitando a precedência |
| **Avisos de capacidade não bloqueiam** | É **decisão do planejador** — o sistema avisa, mas deixa mover |

> 💡 Isso é proposital: **quem conhece o chão é você.** Se você sabe que dá pra encaixar, encaixa — o sistema registra que avisou e segue com a sua decisão.

## Regras de sequenciamento

⚠️ **Máquinas manuais recebem uma operação por vez**, como qualquer outra.
⚠️ Se uma operação **não couber no dia**, vai para o **próximo dia útil** (fins de semana são pulados).
⚠️ `duração = setup + tempo planejado`

💡 Ordens **ainda não sequenciadas** entram no quadro como *fallback* pelas datas da própria OF.
💡 O quadro mensal é um atalho — o mesmo motor aceita **qualquer intervalo** e escala semanal (para enxergar trimestres).

---

## Os cadastros que sustentam o APS

| Tela | O que configura | ⚠️ Atenção |
|:--|:--|:--|
| `VAPS0100` | **Grupos** de recursos · **recursos** (calendário, localização, crítico, ativo) · **centros** (centro de custo **máquina** e **mão de obra**, **capacidade em horas**) | Mutações exigem **ADMIN**. Os dois centros de custo devem ter **naturezas distintas**. Alterações afetam cálculos futuros, **não reescrevem apontamentos** |
| `VAPS0200` | **Calendários de máquina** — intervalos por dia da semana | **Fim posterior ao início.** Dois turnos = **dois intervalos sem sobreposição**. Intervalos sobrepostos ou vazios **distorcem a capacidade** |
| `VAPS0300` | **Paradas de máquina** — real ou planejada | Horários em RFC3339 com o **fuso do navegador** — **confira a data/hora retornada**. **Nunca cadastre parada falsa para ajustar o Gantt** |
| `VAPS0600` | **Cálculo e consulta do sequenciamento** | Listas vazias = considera todo o universo elegível |
| `VAPS0400` / `VAPS0500` | Perfil de operadores · perfil industrial de máquinas | Consulta ADMIN/USER; alterações exigem ADMIN |

### `VAPS0300` — cadastrar parada
1. Consulte por **máquina e intervalo completo de data/hora** — verifique se já existe parada **sobreposta**.
2. **Cadastrar:** Máquina, Início, Fim, **Tipo**, **Motivo** e ordem de manutenção (opcional — só se ela **existir** e **representar a causa**).
3. Confira a **data/hora retornada** para evitar deslocamento de fuso.
4. Atualize a listagem e confirme que a parada aparece **uma única vez**.
5. **Execute um sequenciamento controlado** e valide que operações não ocupam o período bloqueado.

> ⚠️ **Parada falsa some do Gantt mas fica no cálculo de capacidade.** Três meses depois, ninguém entende por que a fábrica "não tem hora".

---

# PARTE 6 — Pipeline e parâmetros

## `VMRP0200` / `VPLN0100` — MRP → CRP → APS em um disparo

### `VMRP0200` — passo a passo
1. **Código do plano**
2. **Número inicial da ordem** — reservado para as sugestões geradas
3. Marque **Gerar LLC** quando os níveis baixos precisarem ser recalculados
4. **Data/hora inicial do sequenciamento**
5. **Execute uma única vez** e acompanhe o retorno consolidado

⚠️ **O fluxo é sequencial:** MRP calcula necessidades → CRP mede capacidade → APS posiciona as operações.
⚠️ **Falha em uma etapa pode impedir as seguintes.** **Confira os registros retornados.**
⚠️ Leia o resultado de **cada etapa** — especialmente: itens sem estrutura/lead time, centros sobrecarregados, operações não sequenciadas.
⚠️ **Só libere sugestões depois de revisar a viabilidade.**

### `VPLN0100`
Informe o **plano**, o **número inicial de ordem** (default `10000`) e, opcionalmente, a **data de início**. O resultado informa se o plano é **viável**.

⚠️ **Executar o pipeline REGRAVA as sugestões do plano.** Ele **não firma ordens automaticamente**.
⚠️ Os **parâmetros** do bloco são **globais** — a mudança afeta **todos** os próximos cálculos.

### `VPLA0300` — Parâmetros do Planejamento
1. Localize o **número documentado** do parâmetro.
2. Abra pelo número e confira descrição, valor atual e tipo.
3. **Alterar** → número e novo valor.
4. **Reabra e execute um cálculo controlado para validar o efeito.**

⚠️ Valores são armazenados como **texto** — **não inclua símbolos nem formatação incompatível**.
⚠️ **Alterar lote, estoque de segurança ou políticas de cálculo pode modificar TODAS as sugestões futuras. Documente a mudança.**

---

# PARTE 7 — Ordem de Produção

## `VPRO0900` — o ciclo completo

**Pré-requisitos:** item com **roteiro** e **estrutura** · **insumos com saldo** em estoque.

```
Aberta ──▶ Em produção ──▶ Concluída ──▶ Encerrada
                                              (ou Cancelada)
```

### Passo a passo

| # | Ação | O que acontece por baixo |
|:-:|:--|:--|
| 1 | **Nova ordem:** Item, **Quantidade planejada**, máquina, centro de custo, prioridade → **Criar OF** | Nasce **Aberta** |
| 2 | **Iniciar (→ Em produção)** | Muda o status |
| 3 | **Explodir roteiro** (opcional) | Traz as operações da OF |
| 4 | **Consumir insumo:** Item e Quantidade | ⭐ Gera **OUT** no estoque e **alimenta o custo real** |
| 5 | **Apontar:** quantidade produzida / refugada | Com **backflush**, os componentes da BOM são baixados automaticamente |
| 6 | **Concluir (→ Concluída):** depósito do acabado + **lote** | ⭐ Gera o **IN** do acabado e **habilita a genealogia** |
| 7 | **Apurar custo** e **Encerrar** | O fechamento também apura o custo real automaticamente |
| 8 | **Retornar sucata** | Registra subproduto valorizado (**IN**) para reaproveitamento |

## ⭐ As automações de estoque

| Ação na OF | Efeito no estoque |
|:--|:--|
| **Consumo** | **OUT** do insumo (atualiza saldo e **custo médio**) |
| **Conclusão** | **IN** do acabado (com lote, se informado) |
| **Fechar** | Apura o **custo real** (material + conversão + overhead) e a **variância vs padrão** |

## De onde vem cada parcela do custo real

```
Material   ← custo médio do estoque (dos insumos consumidos)
Conversão  ← horas apontadas × custo/hora do centro (VCUS0100)
Overhead   ← alocação (VCUS0100)
─────────────────────────────────────────────────────
Custo real da OF  →  comparado ao Custo Padrão  =  VARIÂNCIA
```

⚠️ **A apuração é idempotente** — reexecutar recalcula a linha única da OF. Pode rodar de novo sem medo.

---

## ⭐⭐ Por que apontar importa

> **Apontar não é "preencher papelada pro chefe".**
>
> É como o **custo real** e a **rastreabilidade** acontecem. Cada apontamento seu é o que faz o sistema saber **quanto custou de verdade** produzir aquela peça — e é isso que protege a margem lá no Dia 4.
>
> **Sem apontamento, o custo é chute — e o preço vira aposta.**

## E por que o lote importa

> Quando você aloca o lote da chapa que entrou no Dia 2, o sistema sabe **exatamente** qual material foi para qual produto.
>
> No dia em que um cliente reclamar, você abre a **genealogia** e sabe qual corrida foi. **Sem isso, é recall total.**

---

## `VPRO1100` — Parâmetros de Estoque da Manufatura

| Bloco | O que configura |
|:--|:--|
| **Parâmetros gerais** | Modo de retorno de lote · **baixa automática (backflush)** · janela de movimentos |
| **Controle por item** | Item, UM de estoque, controles de **lote/endereço**, grupo de inventário, tipo de baixa, **almoxarifado de linha** |
| **Endereços de almoxarifado** | Almoxarifado, se usa **WMS**, saída intermediária |

⚠️ **Não mude parâmetros durante apontamentos em andamento.**
⚠️ Combinações incompatíveis de lote, WMS ou almoxarifado são **recusadas**.
💡 Depois de alterar, **abra uma OF de teste** e valide reserva, baixa e retorno.

---

# PARTE 8 — Ferramental

## `VPRO1000` — Ficha de Produção da Ferramenta

**O problema que resolve:** a fábrica tem **várias cópias físicas da mesma ferramenta** (o mesmo molde, cada uma com seu número de série). Esta tela define **qual série** roda em cada operação — e o desgaste é debitado **na série exata**.

### Aba **Ficha de Produção**
1. **Filtrar por nº / item** → busque a ordem ⚠️ *(a lista **exclui ordens tipo OFC**)* → **Abrir**.
2. A ficha traz o cabeçalho e as **operações** com recurso, ferramenta e série atual.
3. Para cada operação: selecione **ferramenta** e **série** → **Vincular**.
4. Se a série precisar trocar (quebra, manutenção): selecione a **nova série**, informe o **motivo** → **Substituir**.
   ⭐ *O histórico (série antiga → nova + motivo) é guardado — veja em **Histórico**.*
5. **Atualiza** recarrega os vínculos.

### Aba **Cadastro de Ferramentas**
1. Cadastre a ferramenta (⭐ **código gerado automaticamente**): nome, tipo, **tipo de vida** (`GOLPES` / `HORAS` / `PECAS`), **limite de vida** e custo.
2. Selecione a ferramenta para gerenciar as **séries** (número, status `ATIVA`/`MANUTENCAO`/`INATIVA`, localização).
3. **Zerar vida útil** após a troca física · **Inativar** quando aposentada.

> ⭐ **O consumo de vida é debitado na SÉRIE vinculada, não na ferramenta genérica.**
>
> ⭐ **"Ferramentas → precisam de troca"** lista as que atingiram o limite de vida.

💡 **`VENG0610`** mantém os **seriais físicos** com situação e localização.

---

# PARTE 9 — Plano de Corte

## `VCUT0100` — o tópico mais metalúrgico do dia

**O que faz:** otimiza o aproveitamento de matéria-prima encaixando (*nesting*) as peças no estoque disponível.

### Três tipos de corte

| Tipo | Para que serve |
|:--|:--|
| **Linear 1D** | Barras, perfis, tubos |
| **2D guilhotinado** | Chapa, painel |
| **True-shape** | Irregular — laser/plasma |

### Passo a passo
1. **Listar** (carrega planos e os padrões da empresa).
2. **Novo plano:** **matéria-prima**, **tipo de corte**, **kerf**, **refile**, **sobra mínima**, **UoM de estoque** e ⚠️ **depósito** → **Criar plano** (nasce **Rascunho**).
3. **Demanda / peças:** adicione as peças a cortar — comprimento (1D) ou largura×altura (2D) e quantidade.
4. **Estoque disponível:** adicione as peças de estoque (cada uma com seu tamanho); marque **retalho** quando for sobra reaproveitada.
   💡 *Ou marque **semear retalhos** no cadastro para o sistema puxar os retalhos do inventário automaticamente.*
5. **Otimizar** → calcula os **padrões de corte**, o **aproveitamento (%)**, a **sucata** e lista peças **sem encaixe**.
6. Revise os padrões (posição de cada peça ao longo da barra/chapa).
7. **Firmar (baixa)** → consome o estoque de verdade, gera os **retalhos** e a trilha de consumo. O plano passa a **Firmado**.
8. **Programa** mostra a sequência de cortes · **Agendar** leva à agenda da máquina · **SVG/DXF/PDF** baixam o mapa para a seccionadora/CAM.

### Conceitos

| Termo | Significado |
|:--|:--|
| **Kerf** | Material perdido na **espessura da serra** entre dois cortes |
| **Refile (trim)** | Aparo removido da **cabeça** da barra/chapa antes do primeiro corte |
| **Retalho** | Sobra ≥ sobra mínima — **volta ao estoque** como material reaproveitável, **com rastreabilidade** |
| **Aproveitamento** | `demanda ÷ estoque consumido` (inclui a sobra da última barra) |
| **Sucata** | Perda **real** (exclui o retalho) — **vira custo** |
| **Status** | `Rascunho → Otimizado → Firmado → Em execução → Concluído` |

⚠️ **Materiais diferentes são planos diferentes** — cada plano corta **um único item**.
⚠️ **Firmar exige depósito** no plano (ou depósito padrão nos parâmetros da empresa).
⚠️ **Modo de consumo:** **Automático (FIFO)** baixa da corrida mais antiga · **Manual** usa o lote atribuído.
⚠️ Peças maiores que qualquer estoque ficam **sem encaixe** (aviso ao operador).

> ## ⭐ Retalho × Sucata
>
> **Retalho** volta pro estoque com rastreabilidade — ele **herda o lote, a corrida e o certificado**.
> **Sucata** é perda de verdade e **vira custo**.
>
> **A diferença entre os dois é a sobra mínima que você configura.** Configurar isso bem é dinheiro no bolso, todo mês.

---

# PARTE 10 — Custo

## `VPRO0300` — Custo Padrão

### Passo a passo
1. Informe o **item** → **Calcular** (executa o **rollup multinível**).
2. Veja os componentes: **Material** · **Operação** · **Overhead** · **Total**.
3. **Consultar** recupera o custo padrão já salvo.

### A fórmula
```
custo = Σ material(BOM) + Σ (tempo_operação × custo/hora_centro) + overhead
```

⭐ O **rollup multinível** compõe o custo dos **intermediários antes** do produto final.

## `VCUS0100` — Custos (as entradas do cálculo)

| Bloco | O que cadastra |
|:--|:--|
| **Custo/hora por centro de trabalho** | ⚠️ **Sem isso o custo real da OF vem zerado** |
| **Custo de compra por item** | Entrada do cálculo de material |
| **Bases de alocação** | Critério de rateio |
| **Alocações de overhead** | Indiretos |
| **Rollup** | Recalcula o custo padrão de um item |

> **O custo padrão é a expectativa; o custo real da OF é o que aconteceu.**
>
> A diferença é a **variância** — e é ela que diz se o problema está no processo, no cadastro ou no preço da matéria-prima.

---

# PARTE 11 — Qualidade em processo

## `VPRO0400` — as 4 peças

```
PLANOS ──▶ CARACTERÍSTICAS ──▶ REGISTROS ──▶ NÃO-CONFORMIDADES
"o que e     "os pontos          "o laudo      "quando sai fora"
 quando"      medidos"            real"
```

### Aba **Planos & Características**
1. **Novo plano:** Item, **Momento** (`RECEBIMENTO` / `PROCESSO` / `EXPEDICAO`), descrição, **tamanho da amostra**, **nível de aceitação** e (opcional) a **operação do roteiro** → **Criar plano**.
2. **Buscar planos** por item ⚠️ *(a consulta é **por item** — não há listagem geral)*.
3. No painel do plano, adicione **características**: nome, **nominal**, **tolerâncias −/+**, unidade, **crítica**.
4. **Desativar** encerra o plano.

### Aba **Registros**
1. Selecione o **plano** (busque antes na aba Planos) — as características carregam automaticamente.
2. Informe **OF**, **lote**, quantidades **inspecionada / aprovada / rejeitada** e o **resultado** (`APROVADO` / `REJEITADO` / `CONDICIONAL` / `PENDENTE`).
3. Informe o **valor medido** por característica e marque "conforme" → **Gravar registro**.
4. Consulte registros **por ordem (OF)** ou **por item**.

### Aba **Não-conformidades**
1. As NC **em aberto** carregam automaticamente.
2. Nova NC: item, quantidade, **severidade** (`CRITICA` / `MAIOR` / `MENOR` / `OBSERVACAO`), descrição; opcional: registro/OF/lote.
3. Escolha a **disposição** → **Aplicar**.

### As 4 disposições

| Disposição | O que significa |
|:--|:--|
| `SUCATA` | Perda — vira custo |
| `RETRABALHO` | Volta para a linha |
| `APROVADO_CONDICIONAL` | Aceito com desvio, sob decisão |
| `DEVOLVIDO` | Volta ao fornecedor |

⚠️ A inspeção **`PROCESSO`** ocorre **após uma operação**; registros e NC referenciam a **OF**.
⚠️ A operação do roteiro pode **ancorar** o plano.

> **Qualidade no processo é mais barata que qualidade no cliente.**
> Pegar o desvio aqui custa **uma peça**; pegar depois custa **o cliente**.
>
> E a NC **não fecha sozinha** — ela fica aberta até alguém dar a **disposição**. Isso é de propósito.

## Restrições

| Tela | O que faz |
|:--|:--|
| `VPRO0800` | Regras que controlam quais **combinações de atributos** são válidas. Operadores: `==` `!=` `>` `<` `>=` `<=` `IN` `NOT_IN`. Use **Avaliar** para testar |
| `VRES0100` | Os **motivos** apresentados quando uma combinação é recusada |

⚠️ Em `VRES0100`: descrição **objetiva, orientada ao usuário**. **Evite mensagens técnicas** ou que revelem regra confidencial. **Prefira inativar** quando o motivo já fizer parte do histórico.

---

# PARTE 12 — Manutenção

## Por que manutenção é assunto de PCP

> **Máquina parada derruba o APS que foi montado de manhã.**
>
> E o CRP **já desconta** as horas de parada da capacidade — ou seja, **preventiva bem cadastrada é o que faz o plano ser realista**.

## `VPRO0500` — Manutenção Preventiva

### Passo a passo
1. **Crie um plano:** máquina, centro de trabalho, **frequência** (`Diária` / `Semanal` / `Mensal` / `Personalizada`), **intervalo em dias** e **horas estimadas de parada**.
2. **Gerar ordens** (por **horizonte de dias**) cria ordens **Planejadas** de forma **idempotente** ⭐ *(não duplica plano+data)*.
3. Avance a ordem:
```
Planejada ──▶ Em execução ──▶ Concluída
             (registra       (registra horas
              início)         reais e término)
```

⭐ **As horas de parada são descontadas da capacidade pelo CRP.**

## `VMAN0202` — Apontamento de OS de Manutenção

1. Selecione a **Ordem de Serviço**.
2. Para cada movimentação: **Tipo** (`Mão de Obra` / `Material` / `Serviço`), **Data/Hora**, **Item/Serviço** (condicional), **Quantidade**, **Valor**, **Observação**.
3. **Salvar** (F9).

⭐ **Apontamento do tipo Material gera movimentação de estoque** (baixa no almoxarifado).
💡 Mão de obra usa **horas**; material usa **unidades de estoque**; serviço pode usar horas ou valor fixo.

## `VMAN0401` — Consulta de OS

Filtros **cumulativos** (AND lógico): número, período, item, status, responsável.
⚠️ **Read-only** — para editar, vá à tela de origem. Exporta para Excel.

## `VAPS0500` — Perfil Industrial de Máquinas

Descrição de uso, aquisição, tempo/unidade de preparação, fornecedor, marca, preferência e responsável pela manutenção + **serviços** (código, tipo, frequência/unidade, tolerância, implantação, última execução, itens e responsáveis) + **campos especiais**.

# PARTE 13 — Exercícios do dia

## 🎯 Exercício 1 — CRP ou APS? (3 min)

Marque qual motor responde cada pergunta:

| Pergunta | CRP | APS |
|:--|:-:|:-:|
| "A dobradeira aguenta o volume do mês?" | ☐ | ☐ |
| "A que horas a solda do pedido 4712 começa?" | ☐ | ☐ |
| "Qual centro está com 140% de carga na terça?" | ☐ | ☐ |
| "Se eu adiar a OF 300, o que acontece com as outras?" | ☐ | ☐ |

---

## 🎯 Exercício 2 — Por que o MRP não sugeriu nada? (4 min)

Para cada caso, diga o motivo:

| Caso | Motivo |
|:--|:--|
| Item Fabricado, demanda 100, estoque 500 | |
| Item com tipo MRP = Projeto | |
| Item de terceiro | |
| Não há demanda cadastrada | |
| BOM em `DRAFT` | |

---

## 🎯 Exercício 3 — A conta do custo (4 min)

Complete, usando os dados do produto:

```
Material  = 2,5 kg × 1,08 (perda) × R$ 8,40  = R$ ________
          + 2 pç × R$ 0,38                    = R$ ________
          + 0,15 kg × R$ 22,00                = R$ ________
                                       Total  = R$ ________

Operação  = (2/60 × 85) + (3/60 × 95) + (8/60 × 120) + (4/60 × 55)
                                       Total  = R$ ________

CUSTO PADRÃO (sem overhead)                   = R$ ________
```

Se a OF apontou **10 minutos a mais** de solda, o custo real sobe ou desce? Quanto?
______________________________________________

---

## 🎯 Exercício 4 — DINÂMICA: "Do plano ao apontamento" (20 min, em dupla)

**Objetivo:** levar o **suporte soldado** do plano ao apontamento.

| # | O que fazer | Tela | ✓ |
|:-:|:--|:--|:-:|
| 1 | Cadastrar a **demanda independente** (dia útil!) | `VPLA0102` | ☐ |
| 2 | Criar o **plano** e **rodar o MRP** | `VMRP0100` | ☐ |
| 3 | Ler as **sugestões** e achar a do produto | `VMRP0100` | ☐ |
| 4 | **Firmar** a sugestão | `VMRP0100` | ☐ |
| 5 | Ler o **Perfil MRP** do produto | `VMRP0100` | ☐ |
| 6 | Ler as **exceções** | `VPRO0700` | ☐ |
| 7 | Rodar o **CRP** e achar o **gargalo** | `VPRO0200` | ☐ |
| 8 | **Sequenciar** no APS e ver o Gantt | `VPRO0210` | ☐ |
| 9 | **Remanejar** uma operação com Cascata | `VPRO0210` | ☐ |
| 10 | Abrir a **OF** e **Iniciar** | `VPRO0900` | ☐ |
| 11 | **Consumir** o insumo (lote do Dia 2) | `VPRO0900` | ☐ |
| 12 | **Apontar** as operações de corte e solda | `VPRO0900` | ☐ |
| 13 | Vincular a **série de ferramenta** | `VPRO1000` | ☐ |
| 14 | Registrar **1 medição de qualidade** | `VPRO0400` | ☐ |
| 15 | **Concluir** com lote e **apurar o custo** | `VPRO0900` | ☐ |
| 16 | Conferir os movimentos no **estoque** | `VEST0100` | ☐ |

### Dados do cenário

**Demanda**

| Campo | Valor |
|:--|:--|
| Item | `PA-SUP-SOLD-001` |
| Centro de custo | `CC-PROD` |
| Quantidade | **200 PC** |
| Data | Um **dia útil** daqui a 20 dias |

**Plano de MRP:** `PLANO-TREINO-01` · Nº inicial de ordem `10000`

**O que o MRP deve sugerir**

| Item | Tipo | Por quê |
|:--|:--|:--|
| `PA-SUP-SOLD-001` | Fabricação | Demanda independente |
| `MP-CHAPA-1020-6.35` | Compra (ou nada) | Demanda dependente da BOM, com **perda de 8%** |
| `MP-PARAF-M8-25` | Compra (ou nada) | Demanda dependente |
| `MP-ELETRODO-E6013` | Compra (ou nada) | Demanda dependente |

**Custo/hora dos centros**

| Centro | Custo/hora |
|:--|:-:|
| `GUILH-01` | R$ 85,00 |
| `DOBRA-01` | R$ 95,00 |
| `SOLDA-01` | R$ 120,00 |
| `BANCADA-01` | R$ 55,00 |

**Plano de inspeção em processo**

Item `PA-SUP-SOLD-001` · Momento `PROCESSO` · Amostra 5 · Operação `30 — Solda de filete`

| Característica | Nominal | Tol. − | Tol. + | Unidade | Crítica |
|:--|:-:|:-:|:-:|:--|:-:|
| Altura do filete de solda | 4,0 | 0,5 | 0,5 | mm | ✅ |
| Distância entre furos | 100,0 | 0,3 | 0,3 | mm | ✅ |
| Ausência de respingo | — | — | — | — | ❌ |

### ✅ Entregável
> **OF com operações apontadas, material consumido do estoque, IN do acabado com lote e custo real apurado ≠ 0.**

---

# PARTE 14 — Erros comuns e como resolver

| O que acontece | Por quê | O que fazer |
|:--|:--|:--|
| Demanda não salva | Data em fim de semana/feriado | Escolher **dia útil** (`VENT0108`) |
| Item configurado não salva a demanda | Falta a **máscara** | Gerar em `VITE0313` |
| MRP roda mas **não gera nada** | Sem demanda · estoque suficiente · item não qualificado | Ver a tabela de regras de geração |
| MRP não explode a BOM | **BOM não está `APPROVED`** | `VBOM0100` |
| Sugestão com data estranha | Item **sem lead time** | `VENT0200` aba Planejamento, ou regra configurada |
| Quantidade sugerida diferente da pedida | **Lote mínimo / múltiplo** agindo | Comportamento correto |
| Data empurrada alguns dias | **Calendário** empurrou para o próximo dia útil | Comportamento correto |
| Firmou e não achou a OF | **Numerações independentes** | Abrir a OF criada para confirmar |
| "Já liberada" ao firmar de novo | Ordem já firmada | Consultar o estado atual antes |
| Pipeline para no meio | Falha em uma etapa impede as seguintes | Ler o retorno de **cada** etapa |
| Parâmetro de planejamento sem efeito | Valor com símbolo/formatação incompatível | Valores são **texto**, sem símbolos |
| CRP sem sobrecarga nenhuma | Demanda baixa para a capacidade | Comportamento correto |
| CRP com capacidade zero | Centro sem **capacidade em horas** ou máquinas inativas | `VAPS0100` |
| Capacidade menor que o esperado | **Manutenção** descontando horas | Comportamento correto |
| Carga irreal no CRP | Calendário de máquina com intervalos sobrepostos/vazios | `VAPS0200` |
| APS não sequencia a operação | Operação sem centro de trabalho ou sem tempo | Conferir o roteiro (Dia 1) |
| Operação foi para o dia seguinte | Não coube no dia; fins de semana são pulados | Comportamento correto |
| Remanejamento avisa mas deixa mover | **Avisos não bloqueiam** — decisão do planejador | Comportamento correto |
| Parada com hora deslocada | Conversão RFC3339 com o fuso do navegador | Conferir a data/hora retornada |
| Não consegue consumir insumo | **Sem saldo** no estoque | Voltar ao Dia 2 |
| **Custo real zerado** | Sem consumo registrado, ou centro **sem custo/hora** | `VCUS0100` |
| Variância absurda | Custo padrão não calculado | `VPRO0300` |
| Não consegue concluir a OF | Falta depósito do acabado ou lote obrigatório | Informar ambos |
| Genealogia vazia após concluir | Concluiu **sem informar lote** | Informar o lote na conclusão |
| Ficha de ferramenta não acha a ordem | A lista **exclui ordens tipo OFC** | Verificar o tipo da ordem |
| Vida útil na ferramenta errada | Série não vinculada à operação | Vincular em `VPRO1000` |
| Plano de corte não firma | **Falta depósito** no plano | Informar o depósito |
| Plano de corte sem retalho | **Sobra mínima** alta demais | Ajustar o parâmetro |
| Peça "sem encaixe" | Maior que qualquer peça de estoque | Comportamento correto — avisar o operador |
| Não acho o plano de qualidade | A consulta é **por item** | Buscar por item |
| NC não some da lista | Falta a **disposição** | Aplicar disposição |
| Preventiva gerou ordens duplicadas | Não gera — é **idempotente** por plano+data | Reconsultar |

## Códigos de erro

| Erro | O que verificar |
|:--|:--|
| **400** | Campo obrigatório, número, data/hora, estrutura das listas |
| **401** | Refazer login; não repetir antes de autenticar |
| **403** | Ação exige **ADMIN** ou permissão de planejamento |
| **404** | Código pertence à sua empresa? Registro desativado? |
| **409 / 422** | Situação, saldo, vigência, duplicidade, transição permitida |
| **Timeout após gravar** | **Consultar antes de reenviar** |

---

# PARTE 15 — Cola rápida — os códigos do Dia 3

### ⭐ Os 10 que você vai usar sempre

```
VPLA0102  Demandas Independentes      ← a necessidade manual
VMRP0100  MRP                         ← o posto de comando
VPRO0700  Alertas de Exceções MRP     ← o que exige ação
VPRO0200  CRP                         ← "cabe?"
VPRO0210  APS / Gantt                 ← "quando?"
VPRO0900  Ordem de Produção           ← o plano vira produto
VPRO1000  Ficha da Ferramenta         ← qual série roda
VPRO0400  Qualidade                   ← planos, registros, NC
VPRO0500  Manutenção Preventiva       ← desconta capacidade
VCUT0100  Plano de Corte              ← aproveitamento de chapa
```

### Demanda e previsão
```
VPRE0201  Cadastro da Previsão     VPRE0101  Tabela de Apropriação
VPRE0251  Geração de Previsão      VPRE0102  Bloqueio de Previsão
VPRE0301  Previsto × Realizado     VPRO0600  Previsão Estatística
VDPR0100  Promessa: Ocupação e Reservas
```

### Planejamento
```
VMRP0200  Pipeline MRP→CRP→APS     VPLA0300  Parâmetros do Planejamento
VPLN0100  Pipeline de Planejamento VPLC0200  Montagem de Carga
                                   VPLC0211  Orientações de Entrega
```

### APS — cadastros
```
VAPS0100  Grupos, Recursos e Centros   VAPS0400  Perfil de Operadores
VAPS0200  Calendários de Máquinas      VAPS0500  Perfil Industrial
VAPS0300  Paradas de Máquinas          VAPS0600  Cálculo do Sequenciamento
```

### Produção, custo e qualidade
```
VPRO1100  Parâmetros de Estoque da Manufatura
VPRO0300  Custo Padrão            VPRO0800  Restrições e Configurador
VCUS0100  Custos                  VRES0100  Motivos de Restrição
VEST0100  Estoque                 VENG0610  Seriais de Ferramentas
```

### Manutenção
```
VMAN0202  Apontamento de OS      VMAN0401  Consulta de OS
```

### Fórmulas do dia
```
Necessidade líquida  = demanda − estoque disponível − ordens já abertas
Carga (%)            = horas necessárias ÷ horas disponíveis × 100
Capacidade nominal   = nº de máquinas ativas × 8h/dia − manutenção do dia
Duração da operação  = setup + tempo planejado
Custo padrão         = Σ material(BOM) + Σ (tempo × custo/hora) + overhead
Aproveitamento       = demanda ÷ estoque consumido
Variância            = custo real da OF − custo padrão
```

### Atalhos
```
F2 = Novo     F8 = Processar     F9 = Salvar
```

---

# PARTE 16 — Glossário

| Termo | O que significa |
|:--|:--|
| **APS** | Sequenciamento em **capacidade finita**, com Gantt |
| **ATP** | `saldo − reservas` — o que realmente pode ser prometido |
| **Backflush** | Baixa automática dos componentes da BOM ao apontar |
| **Capacidade nominal** | `nº de máquinas ativas × 8h/dia − manutenção do dia` |
| **Carga (%)** | `horas necessárias ÷ horas disponíveis × 100` |
| **CRP** | Diz **se** cabe — **não rearranja** nada |
| **Demanda dependente** | O que precisa ser feito por causa da independente (explosão da BOM) |
| **Demanda independente** | O que o cliente pediu — a entrada do MRP |
| **EDD** | *Earliest Due Date* — critério de prioridade do APS |
| **Exceção MRP** | `LATE_ORDER` · `OVERDUE_PURCHASE` · `EXCESS_STOCK` · `OPEN_ORDER_NO_DEMAND` · `CAPACITY_OVERLOAD` |
| **Firmar** | Aprovar a sugestão — **irreversível** |
| **Genealogia** | Histórico bidirecional do lote: OFs que consumiram × produziram |
| **Kerf** | Material perdido na espessura da serra |
| **LLC** | Nível mais fundo em que o item aparece |
| **MAPE** | Erro médio percentual — critério de escolha do modelo de previsão |
| **Necessidade líquida** | `demanda − estoque disponível − ordens já abertas` |
| **NC** | Não-conformidade. Severidade `CRITICA`/`MAIOR`/`MENOR`/`OBSERVACAO`; disposição `SUCATA`/`RETRABALHO`/`APROVADO_CONDICIONAL`/`DEVOLVIDO` |
| **Nesting** | Encaixe otimizado das peças no material disponível |
| **OF** | Ordem de Fabricação. `Aberta → Em produção → Concluída → Encerrada` |
| **Refile (trim)** | Aparo da cabeça da barra/chapa |
| **Retalho** | Sobra ≥ sobra mínima — volta ao estoque **com rastreabilidade** |
| **Rollup** | Cálculo multinível do custo, dos intermediários ao produto final |
| **Sucata** | Perda real — **vira custo** |
| **Sugestão** | Proposta do MRP; vira ordem só quando **firmada** |
| **Variância** | Diferença entre **custo real** e **custo padrão** |

---

# ✅ Checklist de saída — Dia 3

- [ ] Explico as 3 fontes de demanda do MRP
- [ ] Cadastro demanda independente em dia útil válido
- [ ] Cadastro/gero previsão semanal e mensal
- [ ] Sei ler o MAPE da previsão estatística
- [ ] Crio um plano e rodo o MRP
- [ ] Explico necessidade líquida, LLC e demanda dependente × independente
- [ ] Leio as sugestões e **firmo** as corretas
- [ ] Interpreto o **Perfil MRP** e o estoque projetado
- [ ] Identifico os 5 tipos de exceção
- [ ] Rodo o CRP e localizo o **gargalo**
- [ ] Sei as 3 decisões diante de um gargalo
- [ ] Sequencio no APS, leio o Gantt e remanejo com cascata
- [ ] **Sei a diferença entre CRP e APS**
- [ ] Abro OF, consumo insumo, aponto e concluo com lote
- [ ] Apuro o custo real e leio a variância
- [ ] Vinculo série de ferramenta e registro substituição
- [ ] Otimizo e firmo um plano de corte; sei retalho × sucata
- [ ] Registro qualidade e aplico disposição em NC
- [ ] Crio plano preventivo e avanço a ordem
- [ ] Sei que preventiva desconta capacidade no CRP

---

## 📌 Suas anotações

```
Nossos centros de trabalho e capacidade:
_________________________________________________________

Nossos gargalos conhecidos:
_________________________________________________________

Custo/hora dos nossos centros:
_________________________________________________________

Sobra mínima que faz sentido pra nossa chapa: ____________

Dúvidas para o instrutor:
_________________________________________________________
```

---

> **Amanhã (Dia 4):** a fábrica produziu. Fechamos o ciclo — **vender pelo preço certo, emitir a nota e receber**, sem furar o caixa nem o fisco. Você vai ver o custo que apuramos hoje virar **margem** lá no preço.

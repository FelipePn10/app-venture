# DIA 3 — Coração Industrial: PCP e Chão de Fábrica

**Duração:** 4h · **Pré-requisito:** Dia 1 (BOM + roteiro) e Dia 2 (saldo de estoque)
**Público principal:** PCP/Planejamento, Produção/Chão de Fábrica, Manutenção · **Ouvintes:** Engenharia e Compras

> **Onde estamos na corrente:** `Cadastros → Engenharia → Suprimentos+Estoque → [PCP → PRODUÇÃO] → Vendas → Fiscal → Financeiro`
> Este é o **coração do sistema**. Aqui, tudo que cadastramos vira **plano** e o plano vira **produto**.

**Ao final, o participante consegue:** rodar o MRP, ler capacidade (CRP) e sequenciamento (APS), abrir uma **Ordem de Produção**, consumir material, apontar operação e tratar qualidade/manutenção.

> ⚠️ **Amarra de dependência (ler para a turma):** o MRP consome a **demanda de vendas** — que só será operada plenamente no Dia 4. Hoje apresentamos as **fontes de demanda** (previsão, demanda independente, ponto de reposição) de forma conceitual, para o PCP entender de onde vem a necessidade. É a única "volta" na corrente, e é proposital.

---

## Agenda cronometrada (4h)

| Horário | Bloco | Conteúdo |
|:--|:--|:--|
| 0:00–0:15 | Abertura | A corrente até aqui + o papel do PCP |
| 0:15–1:45 | **Bloco A** | Planejar: Demanda → MRP → CRP → APS |
| 1:45–2:00 | Intervalo | — |
| 2:00–3:15 | **Bloco B** | Produzir: Ordem de Produção → material → apontamento → qualidade → manutenção |
| 3:15–3:45 | **Dinâmica** | "Do plano ao apontamento" |
| 3:45–4:00 | Fecho | Dúvidas + checklist de saída + gancho para o Dia 4 |

**Mensagem-síntese:**
> *"O PCP é o maestro: ele não toca instrumento nenhum, mas faz a orquestra inteira tocar junto. Hoje vocês aprendem a reger a fábrica — planejar certo pra não produzir o que não precisa e não faltar o que precisa."*

---

## Bloco A — Planejar (0:15–1:45)

### A1. Fontes de demanda (17 min) — de onde nasce a necessidade
| Tela | O que é |
|:--|:--|
| `VPRE0201` / `VPRE0251` | Cadastro / Geração de **Previsão de Vendas** |
| `VPLA0102` | Cadastro de **Demandas Independentes** |
| `VPRE0101` | Tabela de Apropriação |
| `VPRE0301` | Previsto × Realizado |

🗣 **Fala:** *"O MRP não inventa necessidade — ele responde a uma demanda. Ela vem de três lugares: o pedido de venda (Dia 4), a previsão de vendas e a demanda independente. Hoje a gente prepara a previsão pra ter o que planejar."*

### A2. MRP — Planejamento de Materiais (35 min) ⭐ o disparo central
**Telas:** `VMRP0100` — MRP · `VPRO0700` — Alertas de Exceções MRP

▶ **O que fazer (ao vivo):**
1. Em `VMRP0100`, informar o **nº de ordem inicial** (obrigatório) e os parâmetros.
2. **Rodar o MRP**: o sistema **explode a BOM** do Dia 1 contra o **saldo** do Dia 2 e gera **ordens planejadas** (de compra e de produção).
3. Ler o resultado: o que **comprar**, o que **fabricar**, e **quando**.
4. Em `VPRO0700`, ler os **alertas/exceções** (ex.: ordem que precisa ser antecipada/postergada).

🗣 **Fala (o "momento aha"):** *"Repara no que acabou de acontecer: o sistema pegou a receita (BOM), olhou o que tem no estoque, e disse sozinho o que falta comprar e o que precisa fabricar, com data. Isso que vocês faziam na planilha, ele fez em segundos — e sem esquecer nenhum componente."*

### A3. CRP — Capacidade (15 min)
**Tela:** `VPRO0200` — CRP (Capacity Requirements Planning)

▶ **O que fazer:** rodar o CRP e ler **capacidade × carga** por centro de trabalho — onde está o **gargalo**.

🗣 **Fala:** *"O MRP diz o que fazer; o CRP diz se cabe. De nada adianta planejar 100 peças se a dobradeira só dá conta de 60. O CRP mostra o gargalo antes de ele virar atraso."*

### A4. APS — Sequenciamento / Gantt (20 min)
**Telas:** `VPRO0210` — APS / Gantt · `VAPS0600` — Cálculo do Sequenciamento · `VAPS0100`–`VAPS0500` — parâmetros/calendários de recursos

▶ **O que fazer:** calcular o **sequenciamento**, ler o **quadro/Gantt** (ordens por máquina no tempo), e **remanejar** uma ordem (arrastar sequência / trocar centro).

🗣 **Fala:** *"O APS é a agenda da fábrica: cada máquina, cada hora, o que ela faz. E é vivo — quebrou uma máquina, atrasou um material, você remaneja aqui e o sistema recalcula as datas."*

### A5. Pipeline integrado (3 min)

`VMRP0200` / `VPLN0100` executa **MRP → CRP → APS** em um disparo e apresenta o parecer de viabilidade. Use somente depois de a turma compreender cada etapa isoladamente.

---

## Bloco B — Produzir (2:00–3:15)

🗣 **Transição:** *"O plano está pronto. Agora ele desce pro chão: a ordem planejada vira **Ordem de Produção** e a fábrica coloca a mão na massa."*

### B1. Ordem de Produção (25 min) ⭐ troncal
**Telas:** `VPRO0900` — Ordem de Produção · `VPRO1100` — Estoque da Manufatura

▶ **O que fazer (ao vivo):**
1. **Abrir/firmar** a OF (a partir da ordem planejada do MRP ou manual).
2. **Materiais da OF (MRP):** listar os componentes, **alocar lotes** (o material que entrou no Dia 2) e definir **destino de refugo**.
3. Mostrar o consumo no **Estoque da Manufatura** (`VPRO1100`).

🗣 **Fala:** *"Essa OF é a ligação entre o plano e o físico. Quando você aloca o lote da chapa que entrou ontem, o sistema já sabe **exatamente** qual material foi para qual produto — é rastreabilidade de verdade, do lote ao produto acabado."*

### B2. Apontamento e ferramental (25 min)
| Tela | O que é |
|:--|:--|
| `VPRO0900` | Apontamento das **operações** da OF (produzido, refugo, tempo) |
| `VPRO1000` | **Ficha de Produção da Ferramenta** (vincular série, substituir, vida útil) |
| `VCUT0100` | **Plano de Corte** (aproveitamento de chapa/barra — chave na metalurgia) |
| `VPRO0300` | Custo Padrão (referência de custo da OF) |

▶ **O que fazer:** **apontar** a operação de corte e a de solda (quantidade produzida, refugo, tempo real) e vincular a **ferramenta** usada (`VPRO1000`).

🗣 **Fala (apontamento — desmistificar):** *"Apontar não é 'preencher papelada pro chefe'. É como o custo real e a rastreabilidade acontecem. Cada apontamento seu é o que faz o sistema saber quanto custou de verdade produzir aquela peça — e é isso que protege a margem lá no Dia 4."*

🗣 **Fala (plano de corte):** *"Numa metalúrgica, sobra de chapa é dinheiro no lixo. O plano de corte aqui otimiza o aproveitamento — é economia que aparece direto no custo."*

### B3. Qualidade em processo (15 min)
**Tela:** `VPRO0400` — Qualidade (Planos, Registros, Não-Conformidades)

▶ **O que fazer:** registrar a **medição** de uma característica na operação e, se reprovar, abrir uma **não-conformidade** com **disposição** (sucata/retrabalho/aprovado condicional).

🗣 **Fala:** *"Qualidade no processo é mais barata que qualidade no cliente. Pegar o desvio aqui custa uma peça; pegar depois custa o cliente."*

### B4. Manutenção (10 min) — para a máquina não parar o APS
| Tela | O que é |
|:--|:--|
| `VPRO0500` | **Manutenção Preventiva** (plano + ordem + avanço) |
| `VMAN0202` / `VMAN0401` | Apontamento / Consulta de Ordens de Serviço |
| `VAPS0300` | Paradas de Máquinas |

▶ **O que fazer:** criar um **plano preventivo** (descrição obrigatória) e gerar/avançar uma **ordem** (`PLANEJADO → EM_ANDAMENTO → CONCLUIDO`).

🗣 **Fala:** *"A manutenção não é um setor à parte: máquina parada derruba o APS que a gente montou de manhã. Preventiva bem-feita é o que segura o plano de pé."*

## 🎯 Dinâmica de fixação — "Do plano ao apontamento" (30 min)

**Setup:** usando o produto e o material dos Dias 1 e 2, cada dupla leva o "suporte soldado" do plano ao apontamento.

**Tarefa cronometrada (20 min):**
1. **Rodar o MRP** (`VMRP0100`) e identificar a ordem planejada do produto.
2. Ler o **CRP** (`VPRO0200`) e achar o gargalo.
3. **Abrir a OF** (`VPRO0900`) e **alocar o lote** do material do Dia 2.
4. **Apontar** as operações de corte e solda (quantidade + refugo).
5. Registrar **1 medição de qualidade** (`VPRO0400`).

**Entregável verificável:** OF com **operações apontadas** e material consumido do estoque.


**Fechamento (5 min):**
🗣 *"Produzimos. Agora falta a parte que paga a conta: **vender, faturar e receber**. É o Dia 4 — o giro que fecha a corrente."*

---

## ✅ Checklist de saída do Dia 3
- [ ] Entende as fontes de demanda e prepara previsão (`VPRE0201`).
- [ ] Roda o MRP com nº de ordem inicial e lê ordens planejadas + alertas (`VMRP0100` / `VPRO0700`).
- [ ] Lê capacidade/gargalo no CRP (`VPRO0200`) e sequencia no APS (`VPRO0210`).
- [ ] Abre OF, aloca lote e consome material (`VPRO0900` / `VPRO1100`).
- [ ] Aponta operações e vincula ferramenta (`VPRO0900` / `VPRO1000`).
- [ ] Registra qualidade e não-conformidade (`VPRO0400`).
- [ ] Cria plano/ordem de manutenção preventiva (`VPRO0500`).

**Gancho para o Dia 4:** *"A fábrica produziu. Amanhã fechamos o ciclo: **vender pelo preço certo, emitir a nota e receber** — sem furar o caixa nem o fisco."*

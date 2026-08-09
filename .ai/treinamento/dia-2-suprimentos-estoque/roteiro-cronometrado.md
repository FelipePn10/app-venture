# DIA 2 — Abastecimento: Suprimentos, Estoque e Recebimento

**Duração:** 4h · **Pré-requisito:** Dia 1 (itens cadastrados, comprado/fabricado definido)
**Público principal:** Compras/Suprimentos, Almoxarifado, Inspeção/Qualidade de recebimento · **Ouvintes:** PCP

> **Onde estamos na corrente:** `Cadastros → Engenharia → [SUPRIMENTOS + ESTOQUE] → PCP → Produção → Vendas → Fiscal → Financeiro`
> Ontem definimos **o produto**. Hoje trazemos o **material para dentro da fábrica** e o deixamos disponível para produzir.

**Ao final, o participante consegue:** cadastrar fornecedor, disparar uma compra (requisição → cotação → pedido), receber, inspecionar e dar entrada no estoque com lote/série.

---

## Agenda cronometrada (4h)

| Horário | Bloco | Conteúdo |
|:--|:--|:--|
| 0:00–0:15 | Abertura | Retomada do Dia 1 + a corrente do abastecimento |
| 0:15–1:45 | **Bloco A** | Fornecedor + Fluxo de Compra (requisição→cotação→PC) |
| 1:45–2:00 | Intervalo | — |
| 2:00–3:15 | **Bloco B** | Recebimento + Inspeção + Entrada no Estoque |
| 3:15–3:45 | **Dinâmica** | "Da compra à prateleira" |
| 3:45–4:00 | Fecho | Dúvidas + checklist de saída + gancho para o Dia 3 |

**Mensagem-síntese:**
> *"Estoque que mente é o pior inimigo da fábrica: faz o sistema comprar o que já tem e faltar o que precisa. Hoje a gente aprende a manter o estoque **honesto** — da compra à prateleira."*

---

## Bloco A — Comprar (0:15–1:45)

### A1. Cadastro de Fornecedor (25 min)
| Ordem | Tela | O que é |
|:-:|:--|:--|
| 1 | `VSUP0500` | Cadastro de Fornecedor (dados principais) |
| 2 | `VSUP0510` / `VSUP0660` | Apoio do Fornecedor — parâmetros e contatos |
| 3 | `VSUP0670` | Itens e Qualidade do Fornecedor |
| 4 | `VVOR0202` | Cadastro de Itens por Fornecedor (o que cada um fornece) |
| 5 | `VSUP0130` | Fornecedor Preferencial por Item |

▶ **O que criar:** um fornecedor de matéria-prima (ex.: distribuidor de chapas), com contato, e **vincular** os itens que ele fornece (`VVOR0202`) marcando o **preferencial** (`VSUP0130`).

🗣 **Fala:** *"O fornecedor aqui não é só um nome: é a ponte entre o item do Dia 1 e a compra. Quando você vincula o item ao fornecedor, o sistema já sabe de quem comprar e por quanto."*

### A2. Conversão de unidade e preço de compra (15 min)
| Tela | O que é |
|:--|:--|
| `VSUP0110` | Conversão de UM por Item (compra em kg → estoca/consome em peça) |
| `VSUP0120` / `VSUP0680` | Tabela de Preço de Compra / Fontes de Preço |

▶ **O que criar:** a **conversão** do item metalúrgico (ex.: 1 barra = X kg) e a **tabela de preço** do fornecedor.

🗣 **Fala:** *"Lembra da unidade que a gente definiu ontem? É aqui que ela vira conta: o sistema compra em quilo, mas sabe quantas peças aquilo dá. Sem isso, o estoque e o custo saem errados."*

### A3. O fluxo de compra — requisição → cotação → pedido (35 min) ⭐ troncal
| Ordem | Tela | O que é / o que fazer |
|:-:|:--|:--|
| 1 | `VSUP0300` | **Solicitação de Compra** — a necessidade nasce aqui (ou vem do MRP no Dia 3) |
| 2 | `VSUP0400` | **Cotação de Compra** — comparar fornecedores, mapa de preços |
| 3 | `VPDC0200` / `VSUP0200` | **Cadastro de Pedido de Compra** — formaliza a compra |
| 4 | `VPDC0210` | **Consulta, Aprovação e Recebimento** — aprova/autoriza e acompanha |

▶ **O que criar (fluxo ponta a ponta ao vivo):**
1. `VSUP0300`: abrir uma **solicitação** do material do Dia 1.
2. `VSUP0400`: gerar **cotação**, comparar e escolher o fornecedor.
3. `VPDC0200`: gerar o **pedido de compra** a partir da cotação.
4. `VPDC0210`: **aprovar/autorizar** o pedido (mostrar as alçadas).

**Parametrização de apoio (mostrar onde ficam):**
- `VSUP0610` — Alçadas e Parâmetros de Compras (quem aprova até quanto).
- `VPCT0100` / `VSUP0630` — Tolerâncias de Pedido de Compra (quanto pode divergir sem travar).
- `VCON0200` / `VCON0400` / `VCON0202` — Contratos de Fornecedores (compra recorrente por contrato + baixa de saldo).
- `VTPS0100` / `VTER0100`–`VTER0400` — Serviços de Terceiros (ex.: mandar peça para zincagem/usinagem externa — comum na metalurgia).

🗣 **Fala (alçadas — desmistificar):** *"Alçada não é desconfiança: é proteção. Ela garante que ninguém, sozinho, aprove uma compra grande por engano. Você tem autonomia até o seu limite — acima disso, o sistema pede um segundo olhar."*

---

## Bloco B — Receber, inspecionar e estocar (2:00–3:15)

🗣 **Transição:** *"O pedido saiu, o caminhão chegou. Agora o material precisa **entrar certo** — conferido, inspecionado e no lugar certo do estoque."*

### B1. Recebimento (15 min)
**Tela:** `VAVR0200` — Aviso de Recebimento

▶ **O que criar:** registrar a **chegada** do material (aviso), conferir capa e itens, avançar o status (`SCHEDULED → ARRIVED → IN_CONFERENCE → RELEASED/BLOCKED`) e tratar **divergências** (falta, excesso, avaria).

🗣 **Fala:** *"Aqui é o pedágio da fábrica. O que entra errado aqui contamina tudo pra frente. Divergiu? Registra a divergência — não empurra pro sistema um número que não é verdade."*

### B2. Inspeção de recebimento / Qualidade (25 min)
| Ordem | Tela | O que é |
|:-:|:--|:--|
| 1 | `VINS0200` | Cadastro do **Roteiro de Inspeção** (o que medir por item) |
| 2 | `VINS0201` | Geração/Manutenção das **Ordens de Inspeção** |
| 3 | `VINS0206` | **Tratamento** das ordens (resultado, disposição) |
| 4 | `VSUP0600` | Inspeção de Recebimento (visão do fornecedor) |
| 5 | `VINS0313` / `VINS0400` | Consulta de inspeções e ocorrências |

▶ **O que criar:** um **roteiro de inspeção** para o material (ex.: espessura da chapa, dureza), **gerar a ordem** no recebimento, **registrar a medição** e a **disposição** (aprovado / rejeitado / retrabalho / devolução).

**Avaliação de fornecedor (mostrar):** `VAVF0203` Homologação, `VAVF0300` Scorecard/IQF, `VAVF0204` Envio de IQF.

🗣 **Fala:** *"Inspeção é o filtro que impede material ruim de entrar na linha. E o IQF é a memória: fornecedor que entrega ruim aparece no scorecard — a próxima compra já leva isso em conta."*

### B3. Entrada no estoque — lote, série e endereço (25 min) ⭐ troncal
| Ordem | Tela | O que é |
|:-:|:--|:--|
| 1 | `VENT0800` | Cadastro de **Almoxarifado** (onde guardar) |
| 2 | `VEST0300` / `VLOT0100` | **Máscaras de Lote e Série** (rastreabilidade) |
| 3 | `VEST0100` | **Estoque** — Movimentos, Saldos, ATP, Reservas, Lotes |
| 4 | `VEST0200` | Inventário e Tipos de Movimento |
| 5 | `VEST0400` | Consultas de Estoque por Almoxarifado |

▶ **O que criar:** dar **entrada** do material inspecionado em `VEST0100`, atribuindo **lote/série** e almoxarifado; depois **consultar o saldo** (`VEST0400`) e mostrar o **ATP** (disponível para promessa).

🗣 **Fala (saldo → PCP):** *"Esse saldo que acabou de aparecer aqui é exatamente o número que o MRP vai olhar amanhã pra decidir o que ainda falta comprar. Estoque certo aqui = MRP certo lá."*

**Importação (pincelada, 5 min):** `VIMP0200` Console de Processos de Importação, `VIMP0300` Custo Nacionalizado — para quem importa insumo (landed cost).

## 🎯 Dinâmica de fixação — "Da compra à prateleira" (30 min)

**Setup:** cada dupla precisa abastecer o material do produto do Dia 1 (a chapa e os parafusos do "suporte soldado").

**Tarefa cronometrada (20 min):**
1. Cadastrar/confirmar o **fornecedor** e o **vínculo item×fornecedor** (`VSUP0500` / `VVOR0202`).
2. Disparar **solicitação → cotação → pedido de compra** (`VSUP0300` → `VSUP0400` → `VPDC0200`) e **aprovar** (`VPDC0210`).
3. Registrar o **recebimento** (`VAVR0200`) e a **inspeção** (`VINS0201`/`VINS0206`).
4. Dar **entrada no estoque** com lote (`VEST0100`) e **conferir o saldo** (`VEST0400`).

**Entregável verificável:** saldo do material **positivo em estoque**, com lote e pedido de compra vinculados.


**Fechamento (5 min):**
🗣 *"Material comprado, inspecionado e no estoque. **No Dia 3, o PCP decide o que produzir com ele** — e o chão de fábrica coloca a mão na massa."*

---

## ✅ Checklist de saída do Dia 2
- [ ] Cadastra fornecedor e vincula itens (`VSUP0500` / `VVOR0202`).
- [ ] Cadastra conversão de UM e preço de compra (`VSUP0110` / `VSUP0120`).
- [ ] Executa o fluxo requisição → cotação → pedido → aprovação (`VSUP0300`/`0400` → `VPDC0200`/`0210`).
- [ ] Registra recebimento e trata divergência (`VAVR0200`).
- [ ] Gera e trata ordem de inspeção (`VINS0201` / `VINS0206`).
- [ ] Dá entrada no estoque com lote/série e consulta saldo (`VEST0100` / `VEST0400`).

**Gancho para o Dia 3:** *"Temos produto (Dia 1) e material (Dia 2). Amanhã a pergunta é: **o que, quanto e quando produzir?** Entramos no coração do sistema — PCP e chão de fábrica."*

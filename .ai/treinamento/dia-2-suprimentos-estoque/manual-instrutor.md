# DIA 2 — ABASTECIMENTO · Manual do Instrutor

**Suprimentos, Compras, Recebimento, Inspeção, Estoque e Importação**

| | |
|:--|:--|
| **Carga horária** | 4 horas (bloco único, com 15 min de intervalo) |
| **Público principal** | Compras/Suprimentos · Almoxarifado · Inspeção/Qualidade de recebimento |
| **Ouvintes recomendados** | PCP, Engenharia, Financeiro (contas a pagar) |
| **Pré-requisito** | **Dia 1** — itens cadastrados, com tipo Comprado/Fabricado definido |
| **Telas no escopo** | 49 telas (13 troncais · 16 de apoio · 20 de referência) |
| **Entregável do dia** | Material do produto-exemplo com **saldo positivo em estoque**, com lote e pedido de compra vinculados |

> **Posição na corrente:**
> `Cadastros → Engenharia → [SUPRIMENTOS + ESTOQUE] → PCP → Produção → Vendas → Fiscal → Financeiro`

---

## Índice

1. [Objetivos de aprendizagem](#1-objetivos-de-aprendizagem)
2. [Preparação do instrutor](#2-preparação-do-instrutor)
3. [Mapa completo das telas do Dia 2](#3-mapa-completo-das-telas-do-dia-2)
4. [Agenda minuto a minuto](#4-agenda-minuto-a-minuto)
5. [Abertura (0:00–0:15)](#5-abertura-000015)
6. [Bloco A — Comprar (0:15–1:45)](#6-bloco-a--comprar-015145)
7. [Bloco B — Receber, inspecionar e estocar (2:00–3:15)](#7-bloco-b--receber-inspecionar-e-estocar-200315)
8. [Dinâmica de fixação + gabarito](#8-dinâmica-de-fixação--gabarito)
9. [Fecho e gancho para o Dia 3](#9-fecho-e-gancho-para-o-dia-3)
10. [Troubleshooting](#10-troubleshooting)
11. [Perguntas que a turma sempre faz](#11-perguntas-que-a-turma-sempre-faz)
12. [Checklist de saída e avaliação](#12-checklist-de-saída-e-avaliação)
13. [Anexo A — Dados-semente do Dia 2](#anexo-a--dados-semente-do-dia-2)
14. [Anexo B — Glossário do Dia 2](#anexo-b--glossário-do-dia-2)

---

## 1. Objetivos de aprendizagem

| # | Competência | Evidência verificável |
|:-:|:--|:--|
| 1 | Cadastrar **fornecedor** completo com dados fiscais e pastas | Fornecedor salvo, IE validada |
| 2 | Vincular **itens × fornecedor** e definir o **preferencial** | Ranking 1 atribuído |
| 3 | Cadastrar **conversão de UM** e **tabela de preço de compra** | Conversão testada no bloco Converter |
| 4 | Abrir **solicitação de compra** e gerar pedidos a partir dela | Solicitação com saldo atendido |
| 5 | Conduzir uma **cotação**: convidar, precificar, selecionar, gerar pedidos | Vencedor selecionado por item |
| 6 | Emitir e **aprovar** um pedido de compra respeitando a **alçada** | Pedido aprovado (ou bloqueado, com autorização) |
| 7 | Aprovar/rejeitar **sugestões do MRP** na aba Sugestões | Sugestão vira pedido firme |
| 8 | Registrar **aviso de recebimento** e avançar o ciclo de status | `SCHEDULED → ARRIVED → IN_CONFERENCE → RELEASED` |
| 9 | Registrar **divergência** de recebimento com resolução | Divergência com "afeta IQF" marcada |
| 10 | Criar **roteiro de inspeção** e gerar/analisar a ordem | Ordem analisada, com destinação |
| 11 | Dar **entrada no estoque** com lote e almoxarifado | Movimento IN registrado |
| 12 | Consultar **saldo, ATP e reservas** | Painel ATP lido corretamente |
| 13 | Ler o **IQF/scorecard** do fornecedor | Nota final interpretada |

**Meta de aprovação do dia:** 11 das 13 competências demonstradas.

---

## 2. Preparação do instrutor

### 2.1 Ambiente e dados-semente

- [ ] Base do **Dia 1 preservada** — os itens, BOM e roteiro criados ontem são a matéria-prima de hoje.
- [ ] **Tipos de fornecedor** cadastrados (`VSUP0510`) — ⚠️ **sem isso o cadastro de fornecedor é recusado**.
- [ ] **Tipos de contato** (`VSUP0510`) — Comprador, Gerente, Qualidade.
- [ ] **Parâmetros de compras por empresa** (`VSUP0510` aba Parâmetros / `VSUP0660`).
- [ ] **Almoxarifados** criados (`VENT0800`): `ALM-MP` (Interno), `ALM-INSP` (Inspeção), `ALM-REJ` (Rejeição), `ALM-PA` (Interno), `ALM-EXP` (Expedição).
- [ ] **Máscara de lote** (`VEST0300` / `VLOT0100`) para matéria-prima.
- [ ] **Alçadas de compra** (`VSUP0610`) com um limite baixo o suficiente para o pedido da aula **bloquear** — isso é didático de propósito.
- [ ] **Tolerâncias** (`VSUP0630` / `VPCT0100`) com uma regra de quantidade ativa.
- [ ] **Tipos de movimento** de estoque (`VEST0200`).
- [ ] **Snapshot do banco** antes da aula.

> ⚠️ **Não deixe pronto:** o fornecedor, a solicitação, a cotação, o pedido, o recebimento e a entrada em estoque. É tudo entregável da turma.

### 2.2 O que testar na véspera

1. Cadastrar um fornecedor do zero em `VSUP0500` — cronometre; é a demo mais longa do bloco A.
2. Rodar `VSUP0300 → VSUP0400 → VSUP0200` ponta a ponta.
3. Aprovar um pedido em `VPDC0210` e ver **um bloqueio de alçada** acontecer.
4. Criar aviso em `VAVR0200` e percorrer todo o ciclo de status.
5. Gerar e analisar uma ordem de inspeção em `VINS0201`, com **Movimentar estoque** marcado.
6. Consultar o painel **ATP** em `VEST0100` antes e depois da entrada.
7. Calcular o IQF em `VAVF0300` com `Persistir = não`.

### 2.3 O quadro que fica no flip chart o dia inteiro

```
SOLICITAÇÃO ──▶ COTAÇÃO ──▶ PEDIDO ──▶ APROVAÇÃO ──▶ AVISO ──▶ INSPEÇÃO ──▶ ESTOQUE
 VSUP0300      VSUP0400    VSUP0200    VPDC0210    VAVR0200   VINS0201    VEST0100
 "eu preciso"  "quanto?"   "compro"    "pode?"     "chegou"   "tá bom?"   "guardei"
```

---

## 3. Mapa completo das telas do Dia 2

### 3.1 Troncais — demonstrar ao vivo + praticar (13)

| Código | Tela | Por que é troncal |
|:--|:--|:--|
| `VSUP0500` | Cadastro de Fornecedor | A ponte entre o item e a compra |
| `VVOR0202` | Itens por Fornecedor | Quem fornece o quê (grid de 18 colunas) |
| `VSUP0130` | Fornecedor Preferencial por Item | O ranking que resolve o fornecedor automaticamente |
| `VSUP0110` | Conversão de UM por Item | Compra em KG, estoca em PC |
| `VSUP0120` | Tabela de Preço de Compra | 1º nível da hierarquia de preço do pedido |
| `VSUP0300` | Solicitação de Compra | Onde a necessidade nasce |
| `VSUP0400` | Cotação de Compra | Comparar e escolher fornecedor |
| `VSUP0200` | Pedido de Compra (+ Sugestões do MRP) | Formaliza a compra e firma a sugestão |
| `VPDC0210` | Consulta, Aprovação, Autorização e Recebimento | Onde a alçada é aplicada |
| `VAVR0200` | Aviso de Recebimento | O pedágio da fábrica |
| `VINS0200` | Cadastro do Roteiro de Inspeção | O que medir por item |
| `VINS0201` | Manutenção das Ordens de Inspeção | Analisar e destinar fisicamente |
| `VEST0100` | Estoque (movimentos, saldos, ATP, reservas, lotes) | O coração do estoque |

### 3.2 Apoio — demonstrar rápido (16)

| Código | Tela | Papel no Dia 2 |
|:--|:--|:--|
| `VSUP0510` | Apoio de Fornecedores | Tipos de fornecedor, contatos e 10 parâmetros por empresa |
| `VPDC0200` | Pedido de Compra (4 abas) | Visão de formulário do pedido |
| `VSUP0610` | Alçadas e Parâmetros de Compras | Quem aprova até quanto |
| `VSUP0630` | Tolerâncias de Pedido de Compra | Quanto pode divergir sem travar |
| `VPCT0100` | Tolerâncias de Pedido de Compra (com simulador) | Avaliar a regra sem gravar |
| `VENT0800` | Cadastro de Almoxarifado | Onde guardar (8 localizações) |
| `VEST0300` / `VLOT0100` | Máscaras de Lote e Série | Como o número de lote é montado |
| `VEST0200` | Inventário e Tipos de Movimento | Contar, ajustar, fechar |
| `VEST0400` | Consultas por Almoxarifado | Trilha e posição consolidada |
| `VSUP0600` | Inspeção de Recebimento (operacional) | Roteiro + ordem + destinação em uma rotina |
| `VAVF0300` | Scorecard e IQF do Fornecedor | A memória do desempenho |
| `VAVF0204` | Envio de IQF aos Fornecedores | Cálculo e envio do índice |
| `VCON0200` | Cadastro de Contratos de Fornecedores | Compra recorrente com saldo |
| `VCON0202` | Baixa de Saldo / Cancelamento | Consumo do contrato |
| `VIMP0200` | Console de Processos de Importação | Custo nacionalizado (landed) |

### 3.3 Referência — mostrar onde fica (20)

| Código | Tela | Quando o usuário vai precisar |
|:--|:--|:--|
| `VSUP0660` | Parâmetros e Contatos Complementares | Regras corporativas de fornecedor |
| `VSUP0670` | Itens do Fornecedor e Relatórios de Qualidade | Anexar laudo/certificado ao vínculo |
| `VSUP0680` | Fontes e Atualização de Preços de Compra | Atualizar tabela a partir do praticado |
| `VSUP0620` | EDI de Fornecedores | Confirmação eletrônica do pedido |
| `VSUP0640` | Registros Operacionais de Compras | Ocorrências sem tela especializada |
| `VSUP0650` | Histórico de Movimentos de Compra | Evolução de preço por fornecedor/item |
| `VCON0100` | Tipos de Contratos (informativa) | Orienta onde cadastrar contrato |
| `VCON0400` | Consulta de Contratos | Carteira + mudança de status |
| `VINS0206` | Tratamento das Ordens de Inspeção | Mesma análise, formato operacional |
| `VINS0313` | Consulta de Inspeções de Recebimento | Consulta somente leitura |
| `VINS0400` | Consulta de Ocorrências / Ordens | Duas abas consolidadas |
| `VINS0106` | Cadastro de Ocorrências | Registro genérico por tipo |
| `VAVF0101` | Parâmetros de Avaliação de Fornecedores | Pesos e chaves do IQF |
| `VAVF0203` | Homologação de Fornecedores | Homologado / condicional / validade |
| `VIMP0101` / `VIMP0102` / `VIMP0300` | Status logístico · CT-e · Custo nacionalizado | Quem importa insumo |
| `VTPS0100` / `VTER0100`–`VTER0400` | Serviços de Terceiros (5 telas) | Zincagem, tratamento térmico, usinagem externa |

---

## 4. Agenda minuto a minuto

| Horário | Duração | Bloco | Conteúdo | Formato |
|:--|:-:|:--|:--|:--|
| 0:00–0:15 | 15' | Abertura | Retomada do Dia 1 + a corrente do abastecimento | Fala |
| 0:15–0:40 | 25' | **A1** | Cadastro de Fornecedor e apoios | Demo + prática |
| 0:40–0:55 | 15' | **A2** | Conversão de UM, preço e fornecedor preferencial | Demo |
| 0:55–1:30 | 35' | **A3** | O fluxo de compra ⭐ (requisição → cotação → pedido → aprovação) | Demo + prática |
| 1:30–1:45 | 15' | **A4** | Alçadas, tolerâncias, contratos e terceiros | Tour |
| 1:45–2:00 | 15' | — | **Intervalo** | — |
| 2:00–2:18 | 18' | **B1** | Recebimento (aviso, status, divergências) | Demo + prática |
| 2:18–2:43 | 25' | **B2** | Inspeção e qualidade de recebimento ⭐ | Demo + prática |
| 2:43–3:08 | 25' | **B3** | Entrada no estoque: almoxarifado, lote, ATP ⭐ | Demo + prática |
| 3:08–3:15 | 7' | **B4** | Inventário, consultas e importação | Tour |
| 3:15–3:45 | 30' | **Dinâmica** | "Da compra à prateleira" | Prática em dupla |
| 3:45–4:00 | 15' | Fecho | Checklist + gancho Dia 3 | Fala |

**Regra de ritmo:** se atrasar, corte **A4** e **B4** (tours). Nunca corte B2 ou B3.

---

## 5. Abertura (0:00–0:15)

### 5.1 Retomada do Dia 1 (5 min)

Abra o item que a turma criou ontem e mostre o **checklist de prontidão** (`VITM0100`).

🗣 *"Ontem vocês criaram esse produto: item, estrutura e roteiro. O sistema disse que ele está pronto. Só que tem um detalhe: **não existe um grama de chapa no estoque**. Um produto perfeitamente cadastrado que não pode ser feito. Hoje a gente resolve isso."*

### 5.2 A mensagem-síntese do dia (3 min)

> 🗣 *"Estoque que mente é o pior inimigo da fábrica: faz o sistema comprar o que já tem e faltar o que precisa. Hoje a gente aprende a manter o estoque **honesto** — da compra à prateleira."*

Escreva no quadro e deixe o dia inteiro.

### 5.3 A corrente do abastecimento (5 min)

Desenhe o fluxo macro e **mostre onde cada pessoa da sala entra**:

```
Cadastro de Fornecedor (VSUP0500)  +  Mestres de compra (VSUP0110/0120/0130)
        │
        ▼
MRP → Sugestão de Compra ─────────────►  Pedido de Compra (VSUP0200)  ──► Fornecedor
        │                                        ▲
Solicitação (VSUP0300) ── gerar pedidos ─────────┤
        │                                        │
        └──► Cotação (VSUP0400) ── selecionar vencedor → gerar pedidos ┘
```

🗣 *"Repara: a necessidade pode nascer de dois lugares. **Manual**, quando alguém abre uma solicitação. Ou **automática**, quando o MRP calcula a falta — e isso é amanhã, no Dia 3. Hoje a gente faz o caminho manual, para vocês entenderem a mecânica. Amanhã o MRP faz sozinho."*

### 5.4 Contrato do dia (2 min)

- O que entra errado aqui **contamina tudo para frente**.
- Divergiu? **Registra a divergência.** Não empurra pro sistema um número que não é verdade.

---

## 6. Bloco A — Comprar (0:15–1:45)

### A1. Cadastro de Fornecedor (0:15–0:40 · 25 min)

#### `VSUP0510` — Apoio de Fornecedores (primeiro! 5 min)

> ⚠️ **Comece por aqui, não pelo fornecedor.** Sem tipo de fornecedor cadastrado, o `VSUP0500` recusa o cadastro com "tipo inválido". É o erro nº 1 do dia.

**Aba Tipos** — cadastre tipos informando descrição e o **`kind`**:

| Kind | Consequência |
|:--|:--|
| `NORMAL` | **Inscrição Estadual obrigatória** |
| `TRANSPORTADORA` | IE **dispensada** |
| `TRANSP_REDESP` | IE dispensada |
| `REDESPACHO` | IE dispensada |

**Aba Contatos** — tipos de contato (Comprador, Gerente, Qualidade…).

**Aba Parâmetros** — 10 parâmetros por empresa que governam o módulo:
- Conta financeira default · se **exige conta**
- **Homologação default**
- **Data base padrão para vencimentos**: `Emissão` / `Entrada` / `Digitação`
- Fornecedor genérico da NF-e

🗣 **Data base de vencimento:** *"Parece detalhe, mas define quando o título vence. Data de emissão, de entrada ou de digitação da nota — 30 dias contados de cada uma dá três datas diferentes. Definam isso com o Financeiro."*

#### `VSUP0500` — Cadastro de Fornecedor (15 min)

**Demo ao vivo:** cadastrar um distribuidor de chapas.

**Passo a passo**
1. **Novo** → aba **Dados**:
   - **Razão social**, tipo de pessoa (Jurídica/Física)
   - **CNPJ/CPF** com validação de dígito — use **🔎 CNPJ** para pré-preencher pela Receita
   - **Inscrição Estadual**
   - **Tipo de fornecedor** (o que você cadastrou no `VSUP0510`)
   - **Tipo de frete** · **Contribuinte de ICMS**
2. **Endereço** — ⚠️ *a UF do endereço é usada na consulta SEFAZ*.
3. **Pastas:** telefones · e-mails · **vencimentos** (condições de pagamento) · contatos · **vínculo por empresa** (conta financeira, IPI, tipo de NF, tabela de preço de compra).
4. **Salvar**.
5. **Bloquear/Desbloquear** controla a situação de faturamento.
6. **Consulta SEFAZ** grava a situação cadastral (Liberado/Bloqueado) no fornecedor.

**Regras de negócio a citar em voz alta:**

| Regra | Detalhe |
|:--|:--|
| **IE obrigatória** | Exceto transportadoras (`TRANSPORTADORA` / `TRANSP_REDESP` / `REDESPACHO`) |
| **MEI** | Não pode ser marcado para Pessoa Física |
| **Registro M.A.** | Formato `AA-99999-9` (Ministério da Agricultura) |
| **Documento duplicado** | O sistema retorna **conflito** indicando o fornecedor existente |

⭐ **O ponto mais importante:** o fornecedor tem um **provider de defaults** — condição de pagamento, tipo de frete, conta financeira e tabela de preço são **consumidos automaticamente pelo Pedido de Compra**.

🗣 *"Cada minuto que vocês gastam preenchendo esse cadastro direito volta em segundos economizados em cada pedido de compra pelos próximos anos. O pedido vai vir com condição de pagamento, frete e preço já preenchidos. Cadastro bem-feito é preguiça inteligente."*

⚠️ **Diferente do cliente, o fornecedor TEM atualização** (edição do cadastro). Exportação em Excel/PDF/CSV.

#### `VVOR0202` — Itens por Fornecedor (5 min)

Grid **editável de 18 colunas** que diz **o que cada fornecedor fornece**.

1. Selecione o **Fornecedor**.
2. **Nova Linha** → selecione o item.
3. Preencha inline: **Preço Unitário**, **Lead Time (dias)**, **Lote Mínimo**, **Classificação ABC** (deste fornecedor), código do item no fornecedor, embalagem…
4. **Modal PDM** para itens configurados · **Modal Dados de Qualidade** por linha.
5. **Salvar** (F9).

⚠️ **Dois avisos:**
- A **classificação ABC por fornecedor** pode ser **diferente** da ABC do item (aba Planejamento do `VENT0200`). *"O parafuso pode ser C pra você e A pra ele."*
- Os **Dados de Qualidade** por linha **alimentam o módulo de inspeção** (`VINS0200`).

#### Complementos (mostrar, 2 min)

| Tela | O que faz |
|:--|:--|
| `VSUP0660` | Parâmetros corporativos de fornecedor + telefone/e-mail de contato existente. ⚠️ Exige o **ID do contato**, não o código do fornecedor |
| `VSUP0670` | Anexar **laudo/certificado** ao vínculo item × fornecedor (PDF/PNG/JPEG, convertido em Base64). ⚠️ Laudo no vínculo errado influencia homologação e IQF |

---

### A2. Conversão de UM, preço e fornecedor preferencial (0:40–0:55 · 15 min)

> 🗣 **Transição:** *"Lembram da unidade que a gente definiu ontem? Agora ela vira conta."*

#### `VSUP0110` — Conversão de UM por Item ⭐

**Passo a passo**
1. Informe o **item** → **Carregar** (mostra as conversões existentes).
2. Cadastre: **De** (UM origem), **Para** (UM destino) e o **fator**.
3. Use o bloco **Converter** para **testar**: informe De/Para/Quantidade e veja o resultado.

**Como o sistema resolve:** tenta a conversão **direta**; se ausente, usa a **inversa** (`1/fator`).

🗣 *"O sistema compra em quilo, mas sabe quantas peças aquilo dá. Sem isso, o Pedido de Compra não calcula a quantidade interna — e o estoque e o custo saem errados. Se faltar conversão, o próprio pedido de compra orienta a abrir esta tela."*

💡 **Amarre com o Dia 1:** o alerta de prontidão do `VITM0100` para item comprado com UM de compra ≠ UM de estoque é resolvido **aqui**.

#### `VSUP0120` — Tabela de Preço de Compra

1. Crie a **tabela**: descrição, **moeda**, **vigência**.
2. Selecione a tabela e adicione **itens**: item, preço, UM, **quantidade mínima** e, opcionalmente, o **fornecedor específico**.

⭐ **A hierarquia de preço do Pedido de Compra:**
```
1º  Preço ESPECÍFICO do fornecedor  (se existir)
2º  Preço GENÉRICO da tabela        (fallback)
```

🗣 *"Quando o preço aparece sozinho no pedido, ele veio daqui. E o %IPI vem da classificação fiscal, e a UM interna das conversões. Três cadastros trabalhando juntos para que o comprador só digite a quantidade."*

#### `VSUP0130` — Fornecedor Preferencial por Item

1. Informe o **item** → carregue os vínculos.
2. Cadastre um fornecedor com:
   - **Ranking** (⭐ `1` = preferido)
   - Código / descrição / UM do item **no fornecedor**
   - **Lead time** em dias

🗣 *"É esse ranking que faz a solicitação de compra virar pedido sem ninguém escolher fornecedor na mão. O sistema pega o de menor ranking. Cadastrem pelo menos dois por item crítico — o preferido e o backup."*

#### `VSUP0680` — Fontes e Atualização de Preços (mostrar, 2 min)

Encontra **preços efetivamente praticados** e atualiza a tabela a partir deles.

1. **Consultar fontes** — obrigatório informar **início e fim** (`AAAA-MM-DD`).
2. **Consultar candidatos** — informe a tabela (modo padrão `INTERNAL`, ordenação `NUMERIC`).
3. **Aplicar fontes** — informe `table_code` e **mantenha `overwrite=false`** para proteger preços existentes.

⚠️ *"`overwrite=true` substitui preço vigente. Registre a justificativa e confira o histórico depois."*

---

### A3. O fluxo de compra ⭐ (0:55–1:30 · 35 min)

> **Este é o tronco do dia.** Execute ponta a ponta ao vivo e depois deixe a turma repetir.

#### `VSUP0300` — Solicitação de Compra (10 min)

**O que é:** onde a necessidade nasce — manualmente ou vinda do MRP (Dia 3).

**Passo a passo**
1. Crie a solicitação (empresa, **solicitante**) com um ou mais **itens** (quantidade, UM, preço sugerido).
2. Abra a solicitação e adicione itens, se necessário.
3. **Gerar pedidos:** informe a **quantidade a atender** e, opcionalmente, o **fornecedor** de cada item.
   - Sem fornecedor informado → usa o **preferencial** (`VSUP0130`).
   - O sistema **agrupa por fornecedor** e gera **um pedido por grupo**.
   - O atendimento é registrado de volta na solicitação.

⭐ **A matemática do saldo:**
```
saldo = quantidade − atendida − cancelada
status: Aberto → Parcial → Atendido
```

🗣 *"Repara que dá pra atender parcialmente. Pediu 1.000 kg, gerou pedido de 600? A solicitação fica **Parcial** com saldo de 400. Ela não some — ela fica te cobrando. É bom que seja assim."*

#### `VSUP0400` — Cotação de Compra (12 min)

**Passo a passo**
1. **Crie a cotação** informando os itens (IDs de itens de solicitação e/ou códigos de ordens planejadas) e os **fornecedores convidados**.
2. Abra a cotação e **convide** mais fornecedores, se necessário.
3. **Registre os preços** por item × fornecedor: **preço**, **lead time**, **condição de pagamento**. A cotação passa a **Cotada**.
4. **Selecione** o preço vencedor **de cada item**.
5. **Gere os pedidos:** agrupa os preços selecionados por fornecedor, cria **um pedido por fornecedor** e registra o atendimento nas solicitações de origem.

🗣 **O ponto que os compradores adoram:**
> *"Repara que a seleção é **por item**, não por fornecedor. Você pode comprar a chapa do fornecedor A e o parafuso do B, na mesma cotação — e o sistema gera dois pedidos, um pra cada. É assim que se compra bem."*

⚠️ **Não é só preço.** Chame atenção para o **lead time** e a **condição de pagamento** registrados junto:
🗣 *"O mais barato que entrega em 40 dias pode ser o mais caro do mundo, se a linha parar. O sistema mostra os três dados juntos justamente para você não decidir só pelo preço."*

#### `VSUP0200` — Pedido de Compra (8 min)

**Aba Pedidos**
1. Crie a **capa**: empresa, **fornecedor**, moeda, tipo de frete.
   - Sem condição de pagamento informada → vem dos **defaults do fornecedor**.
2. Abra o pedido e **adicione itens** (item, quantidade, preço).
   - ⭐ **Preço**, **%IPI** e **UM interna** são resolvidos **automaticamente** pelo backend.
3. **Cancele** o pedido quando necessário.

**Aba Sugestões** ⭐ — *a ponte com o Dia 3*
- Veja as sugestões geradas pelo **MRP**.
- **Aprovar** → informe fornecedor e preço → **gera um pedido de compra firme**.
- **Rejeitar** → descarta a sugestão.

🗣 **Fala-chave (plante o Dia 3):**
> *"O MRP **sugere**; o comprador **aprova**. O sistema não compra nada sozinho. E tem um detalhe técnico importante: **só suprimentos firmes entram no netting do MRP**. Enquanto a sugestão não vira pedido, o MRP continua achando que falta material. Aprovar não é burocracia — é o que fecha a conta."*

#### `VPDC0200` — Pedido de Compra (visão formulário, 3 min)

Quatro abas:

| Aba | O que tem |
|:--|:--|
| **Dados Gerais** | Fornecedor, data, **contrato** (opcional), condições de pagamento, contato |
| **Transporte** | Transportadora, tipo de frete (CIF/FOB), dados de entrega |
| **Vencimento** | Datas e valores das parcelas |
| **Itens** | Modal de seleção com busca por código/nome/descrição |

Status inicial: **Pendente**.

#### `VPDC0210` — Consulta, Aprovação, Autorização e Recebimento (7 min) ⭐

**Consulta:** filtros cumulativos por intervalo de pedido, fornecedor, item, comprador, tipo de solicitação, emissão, entrega, posição, Kanban e paginação.
⭐ O flag **Todos os itens** controla se a consulta mostra a **capa** ou **cada linha** do pedido.

**Aprovação e autorização** — *demonstre um bloqueio de alçada acontecendo:*
1. Abra o pedido e confirme fornecedor, moeda, itens, preços e **total**.
2. **Aprovar** → o backend compara o valor com a **alçada vigente**.
3. Se o pedido ficar **bloqueado**, somente um usuário **ADMIN** usa **Autorizar alçada**.
4. **Reconsulte** e confirme a situação final.

⚠️ **Diga isso explicitamente:** *"**Aprovação não significa recebimento.** São duas coisas diferentes, na mesma tela."*

**Recebimento** (será usado no Bloco B):
1. Informe o pedido e adicione **cada linha efetivamente recebida**.
2. Por linha: **código da linha**, **quantidade**, **almoxarifado**. Lote, série, partida, validade e observação conforme o item.
3. Confira o **saldo aberto** e as **tolerâncias**.
4. **Registre uma única vez** e valide os movimentos de entrada retornados.

⚠️ Quantidade superior ao saldo → **aviso ou bloqueio** conforme `VSUP0630`. Lotes e séries obrigatórios devem ser informados **antes** da confirmação.

---

### A4. Alçadas, tolerâncias, contratos e terceiros (1:30–1:45 · 15 min)

#### `VSUP0610` — Alçadas e Parâmetros de Compras (5 min)

**Alçadas**
1. Consulte antes de cadastrar uma nova vigência.
2. Informe **Empresa**, **Escopo**, referência opcional, **moeda** e **início da validade**.
3. **Aprovação automática até** = o maior valor liberado **sem intervenção**.
4. **Bloquear acima de** = o valor que exige **autoridade superior**.
5. Informe **fim de validade** para regras temporárias e documente a justificativa.

**Parâmetros**
- Por **domínio**, informe Chave, Valor e **Tipo** (`TEXT`, `NUMBER`, `BOOLEAN`…).
- ⚠️ Booleanos usam `true/false`; números **sem** símbolo de moeda e **sem** separador de milhar.

⚠️ **Alçadas e parâmetros exigem ADMIN.** Uma alçada incorreta pode bloquear ou liberar pedidos indevidamente — **valide em `VPDC0210` com um pedido de teste**.

🗣 **Desmistificar a alçada — fala pronta:**
> *"Alçada não é desconfiança: é proteção. Ela garante que ninguém, sozinho, aprove uma compra grande por engano — inclusive você. Você tem autonomia total até o seu limite; acima disso o sistema pede um segundo olhar. E não é sobre você: é sobre o valor."*

#### `VSUP0630` / `VPCT0100` — Tolerâncias de Pedido de Compra (5 min)

**Campo a campo (`VSUP0630`):**

| Campo | Função |
|:--|:--|
| **Tipo de tolerância** | Quantidade · preço do item · valor total |
| **Onde se aplica** | Entrada fiscal · aviso de recebimento · todos |
| **Intervalo mín/máx** | Faixa de valor em que a regra é escolhida |
| **Tolerância** | Desvio permitido |
| **Tipo do valor** | Percentual ou valor fixo |
| **Fornecedor** | Especializa a regra para um parceiro |
| **Ação** | **Permitir** · **Avisar** · **Bloquear** |
| **Ativa** | Participa ou não da avaliação |

⚠️ Cadastre intervalos **sem sobreposição ambígua**. Antes de ativar, use **Avaliar** com valor esperado e realizado nos limites, dentro e fora da tolerância.

⭐ **`VPCT0100` tem o simulador** — informe valor esperado e real e a tela devolve o veredito **sem gravar nada**.

🗣 *"Usem o simulador antes de colocar a regra em produção. É de graça e evita descobrir na doca que você bloqueou o caminhão inteiro por 0,5% de diferença."*

💡 Regras se **acumulam**: uma por fornecedor e outra geral podem valer juntas; a precedência é resolvida pelo backend.

#### Contratos de fornecedores (3 min)

**O modelo real:** capa (fornecedor, número, status, moeda, vigência, índice de reajuste) + **linhas** (item, quantidade contratada, preço, pedido mínimo).

```
DRAFT → ACTIVE → (SUSPENDED) → CLOSED / CANCELLED
```

| Tela | O que faz |
|:--|:--|
| `VCON0100` | **Informativa** — o ERP não mantém "tipo de contrato" como cadastro separado |
| `VCON0200` | Cadastra o contrato (capa + linhas) em um passo |
| `VCON0400` | Consulta a carteira + **muda o status** |
| `VCON0202` | **Baixa de saldo** (consumo) e cancelamento |

⭐ **A mecânica do saldo:** `saldo = contratada − consumida`. Conforme os pedidos consomem, a linha acumula quantidade consumida.

⚠️ **Três regras:**
1. Só linhas de contrato **`ACTIVE`** podem ter saldo consumido.
2. O consumo é **rejeitado** se exceder o saldo.
3. O cancelamento (`CANCELLED`) é **irreversível** pela tela.

🗣 *"Não existe 'cancelamento de item' avulso. O encerramento é mudança de status, e a baixa é consumo de saldo. É mais simples do que parece — e mais honesto, porque o histórico fica."*

#### Serviços de terceiros (2 min) — comum na metalurgia

```
Preço/Custo (VTER0100) → OF com operação externa → Ordem de terceiro (VTER0200)
   → Pedido de compra → Remessa/Retorno (VTER0300) → Recebimento/inspeção
```

| Tela | O que faz |
|:--|:--|
| `VTPS0100` | Preços de serviço por fornecedor (item + fornecedor + operação = preço) e ordens de serviço |
| `VTER0100` | Preços, **resolução** e **cálculo de custo** com vigência, frete e impostos |
| `VTER0200` | Ordens de serviço de terceiros — **Gerar pela OF** (ADMIN) |
| `VTER0300` | Remessas, retornos e histórico — tipos `SHIPMENT` / `RETURN` / `RECEIPT` / `ADJUSTMENT` |
| `VTER0400` | Conversões globais de UM para serviços |

⚠️ **`VTER0300` exige chave de idempotência estável** (ex.: `OS15-REMESSA-NF123-1`). Execute **uma vez**; se houver timeout, **consulte antes de repetir** com a mesma chave.
⚠️ Em `VTER0200`, **não gere de novo sem conferir se a OF já tem ordens** — reprocessamento duplica a cadeia de compras.

🗣 *"Mandar a peça pra zincagem é uma compra de serviço, não um sumiço de material. O sistema controla remessa e retorno justamente para o estoque não mentir enquanto a peça está fora."*

---

## 7. Bloco B — Receber, inspecionar e estocar (2:00–3:15)

### Transição (1 min)

🗣 *"O pedido saiu, o caminhão chegou. Agora o material precisa **entrar certo** — conferido, inspecionado e no lugar certo do estoque. Aqui é o pedágio da fábrica: o que entra errado aqui contamina tudo pra frente."*

Desenhe o fluxo do bloco:

```
AVISO ──▶ CONFERÊNCIA ──▶ INSPEÇÃO ──▶ DESTINAÇÃO ──▶ SALDO
VAVR0200   divergências   VINS0201    almoxarifados   VEST0100
"chegou"   "bate?"        "tá bom?"   "pra onde vai"  "tenho X"
```

---

### B1. Recebimento (2:00–2:18 · 18 min)

#### `VAVR0200` — Aviso de Recebimento

**O que é:** a agenda de doca e a conferência da mercadoria **antes da NF**.

**Passo a passo**
1. **Novo aviso:** informe **Fornecedor** e/ou **Pedido de compra**, **Doca**, **Nº NF**, **Agendado para** e observações.
2. Em cada linha: **Item**, **Qtd esperada** e (opcional) **Máscara**/**UM** → **+ item**.
3. **Criar aviso** → nasce em **`SCHEDULED`**.
4. **Listar** e **Abrir** para ver o detalhe.
5. **Avance o status** pelo seletor **Avançar**.

⭐ **O ciclo de status — desenhe no quadro:**
```
SCHEDULED ──▶ ARRIVED ──▶ IN_CONFERENCE ──▶ RELEASED
 agendado     chegou       conferindo        liberado
                                    └──▶ BLOCKED  (bloqueado)
                                    └──▶ CANCELLED
```

#### Divergências ⭐ — o coração do tópico

Registre **item**, **tipo**, quantidades **esperada/real** e se **afeta o IQF**; depois escolha a **resolução**.

**Os 8 tipos de divergência:**

| Tipo | O que é |
|:--|:--|
| `SHORTAGE` | Falta |
| `EXCESS` | Sobra |
| `DAMAGE` | Avaria |
| `WRONG_ITEM` | Item errado |
| `PRICE` | Divergência de preço |
| `DOCUMENT` | Problema documental |
| `LATE` | Atraso |
| `OTHER` | Outros |

**As 5 resoluções:**

| Resolução | O que significa |
|:--|:--|
| `ACCEPTED` | Aceito como veio |
| `PARTIAL_RETURN` | Devolução parcial |
| `FULL_RETURN` | Devolução total |
| `WAIVED` | Dispensado |
| `SUPPLIER_DEBIT` | Débito ao fornecedor |

🗣 **A fala mais importante do bloco:**
> *"Divergiu? **Registra a divergência.** Não empurra pro sistema um número que não é verdade. Sei que dá vontade de 'ajustar depois', mas o depois nunca chega — e aí o estoque vira ficção. Cinco segundos aqui evitam três dias de caça ao erro lá na frente."*

⭐ **O flag "afeta IQF" é uma decisão de gestão:**
🗣 *"Se a culpa é do fornecedor, marca. Se o caminhão bateu no caminho e não foi culpa dele, não marca. Esse flag alimenta o scorecard — é a memória do relacionamento. Marcar por raiva distorce a próxima compra."*

⚠️ Este é o **fechamento de recebimento (FAVR)** — **precede** a entrada fiscal/física da NF.

---

### B2. Inspeção de recebimento ⭐ (2:18–2:43 · 25 min)

#### `VINS0200` — Cadastro do Roteiro de Inspeção (10 min)

**O que é:** define **como** um item (ou uma classificação) é inspecionado no recebimento.

**Passo a passo — Capa**
1. Escolha a **Base**: `ITEM` ou `CLASSIFICATION`.
2. Informe o item/classificação, o **almoxarifado de inspeção** e a **vigência**.
3. (Opcional) qualificadores de manuseio, armazenagem, rota, mercado e inspeção.

**Passo a passo — Etapas**
Para cada etapa, informe nome, espécie, forma de apontamento, amostra e limites.

| Campo | Opções | O que significa |
|:--|:--|:--|
| **Espécie** | `VALUE` (medição) · `ATTRIBUTE` (passa/não passa) · `STRUCTURE` | A natureza da verificação |
| **Apontamento** | `ALL_MEASUREMENTS` · `SINGLE_INTERVAL` · `MULTIPLE_INTERVAL` · `STATUS_ONLY` | Como o resultado é registrado |
| **Amostra** | número | Tamanho da amostra |
| **Nominal / Mín / Máx** | número | Faixa de aceitação (etapas de medição) |

**Exemplo metalúrgico para montar ao vivo:**

| Seq | Etapa | Espécie | Nominal | Mín | Máx | Amostra |
|:-:|:--|:--|:-:|:-:|:-:|:-:|
| 10 | Espessura da chapa (mm) | `VALUE` | 6,35 | 6,20 | 6,50 | 5 |
| 20 | Certificado de qualidade | `ATTRIBUTE` | — | — | — | 1 |
| 30 | Aspecto superficial | `ATTRIBUTE` | — | — | — | 5 |

⭐ **Duas automações que a turma precisa entender:**
1. Ao receber mercadoria com **roteiro ativo**, o sistema **abre a ordem de inspeção automaticamente** e a mercadoria segue para o **almoxarifado de inspeção**.
2. A busca do roteiro **prefere o específico por item/máscara** e **cai para a classificação**.

🗣 *"Repara na consequência prática: se você cadastra o roteiro por **classificação**, cobre a família inteira de uma vez. Chapa nova entrando no cadastro já nasce com inspeção. Isso é escala."*

#### `VINS0201` — Manutenção das Ordens de Inspeção (12 min) ⭐

**Passo a passo**
1. **Carregar** para listar as ordens.
2. **Gerar ordem de inspeção** (para inspeção manual): origem, item, almoxarifado, quantidade → **Gerar ordem**.
3. Selecione uma ordem e, em **Análise**, informe:
   - As **quantidades por resultado**
   - O **tratamento**
   - Se **afeta o IQF**
   - Marque **Movimentar estoque** para transferir da quarentena para os destinos
4. **Registrar análise**.

⭐ **Para onde vai cada quantidade — desenhe no quadro:**

| Resultado | Destino |
|:--|:--|
| **Conforme** | Almoxarifado **disponível** |
| **Restrita** | Almoxarifado **disponível** |
| **Retrabalho** | Almoxarifado de **retrabalho** |
| **Rejeitada** | Almoxarifado de **rejeição** |

⚠️ **A soma não pode exceder a quantidade da ordem.**

🗣 **Fala-chave:**
> *"Repara no que 'Movimentar estoque' faz: o material sai da quarentena e vai fisicamente para o lugar certo. Enquanto você não faz isso, ele **não está disponível para produzir** — e é assim que tem que ser. Material aprovado só fica disponível **depois** da movimentação."*

#### `VSUP0600` — Inspeção de Recebimento (visão operacional, 3 min)

A mesma inspeção em formato de rotina única, com mais controle:

- **Cadastrar roteiro** — Base (`ITEM`/classificação), almoxarifado de inspeção, vigência, etapas com amostra/aceitação/rejeição.
- **Gerar ordem** — origem `PURCHASE_ORDER`, aviso ou entrada fiscal.
- **Registrar resultados** — etapa, sequência da amostra, valor medido ou atributo, limites, aprovação, observação.
- **Analisar ordem** — distribuir entre conforme / rejeitada / retrabalho / restrita. ⚠️ **A soma deve corresponder à quantidade analisada.**
- **Destinar estoque** — fluxo simplificado com aprovado, rejeitado, destino, quarentena e motivo.

⚠️ **Pré-requisito de configuração:** o **almoxarifado de inspeção deve ser separado** dos destinos de material aprovado e rejeitado.
⚠️ Se a API responder **conflito de saldo**, atualize a ordem antes de tentar de novo. **Não repita um apontamento sem verificar se ele já aparece** no resultado.

#### Avaliação de fornecedor (mostrar, 3 min)

**`VAVF0300` — Scorecard e IQF**

O IQF reúne 4 dimensões:

| Dimensão | Origem | Peso (`VAVF0204`) |
|:--|:--|:-:|
| **Qualidade** | Automático — `(inspecionada − rejeitada) / inspecionada` | 40% |
| **Entrega** | Automático — `(recebimentos − atrasados) / recebimentos` | 30% |
| **Comercial** | Nota manual | 20% |
| **Atendimento** | Nota manual | 10% |

**Cálculo automático:** informe fornecedor, início e fim do período + as notas Comercial e Atendimento → execute e confira quantidade total, rejeições, atrasos, notas parciais e **nota final**.

⚠️ **`Persistir = não` é simulação** e não deve aparecer como avaliação oficial. Marque **Persistir** somente quando o período estiver **fechado e revisado**.
⚠️ Não misture **períodos sobrepostos** — distorce a tendência.
⚠️ Divergências marcadas como "**não afeta IQF**" não devem penalizar o fornecedor.

**`VAVF0203` — Homologação:** período avaliado + limites **Homologado mínimo** e **Condicional mínimo** (⚠️ homologado ≥ condicional) + situação, categoria, validade e observações.

⚠️ **Homologação vencida ou abaixo do limite deve ser considerada pelos compradores antes de emitir novos pedidos.**

**`VAVF0101`:** parâmetros do domínio `SUPPLIER_EVALUATION` (chave/valor tipados). Escrita restrita a **ADMIN**.

🗣 *"Inspeção é o filtro que impede material ruim de entrar na linha. E o IQF é a **memória**: fornecedor que entrega ruim aparece no scorecard, e a próxima compra já leva isso em conta. Sem isso, a empresa esquece — e compra do mesmo problema de novo."*

---

### B3. Entrada no estoque ⭐ (2:43–3:08 · 25 min)

#### `VENT0800` — Cadastro de Almoxarifado (5 min)

**Passo a passo**
1. **Novo** → aba **Dados**: **Código** e **Descrição** (obrigatórios), **Localização**, **Tipo**, **Disponível**, **Almox Expedição**, **Estabelecimento**, Observação.
2. Se a localização for **Externo** ou **Trânsito** → preencha as abas **Clientes** e **Fornecedores**.
3. **Salvar**.

⭐ **As 8 localizações e o que cada uma faz:**

| Localização | Comportamento |
|:--|:--|
| **Interno** | Padrão |
| **Expedição** | **Baixa ao faturar** |
| **Rejeição** | Qualidade |
| **Inspeção** | Qualidade (quarentena) |
| **Trânsito** | Transferências |
| **Assistência Técnica** | Uso exclusivo do módulo |
| **Externo** | Material em poder de terceiro |
| **Reserva** | Separação/bloqueio |

**Tipo:** `Normal` ou `Linha de Produção`.

⚠️ **Almoxarifados não disponíveis não aparecem como opção em movimentações.**
⚠️ Externo e Trânsito **exigem** vínculo de cliente, estabelecimento e fornecedor.

🗣 *"Não é só 'onde guardo'. A localização muda o comportamento do sistema. Expedição baixa ao faturar; inspeção segura o material em quarentena. Escolher a localização errada é o mesmo que deixar o material no lugar errado — mas invisível."*

#### `VEST0300` / `VLOT0100` — Máscaras de Lote e Série (5 min)

**Cadastro da máscara**
1. Consulte as existentes.
2. Informe **Aplicação**, Cliente/Item opcionais, Tipo/Código de classificação, indicador de **zerar no ano** e **Descrição**.
3. Abra a máscara e adicione **partes na ordem desejada** (numeradas de 10 em 10).

**Os 4 tipos de parte:**

| Tipo | Campos | Exemplo |
|:--|:--|:--|
| `CARACTER` | Valor e tamanho | Prefixo `LT` |
| `DATA` | Formato de data | `yyyyMMdd` |
| `SEQ_NUMERICA` | Tamanho e zerar no ano | `000001` |
| `SEQ_CARACTER` | Tamanho | Sequência alfanumérica |

**Exemplo montado ao vivo:** `LT` + `yyyyMMdd` + `000001` → `LT20260731000042`

**Geração:** informe a máscara explicitamente **ou** o contexto (Aplicação, Cliente, Item, Classificação) — o backend resolve e **avança a sequência**.

⚠️ **A geração é operação de negócio, não pré-visualização. Não clique repetidamente.** Use exatamente o código retornado.
⚠️ **Não altere a composição de uma máscara já usada** sem avaliar rastreabilidade. Mudar uma parte muda os lotes **futuros**, nunca os já gerados.
⚠️ **Desativar** impede novas gerações, mas os lotes existentes permanecem válidos.

#### `VEST0100` — Estoque ⭐ (15 min) — *a tela mais importante do Almoxarifado*

**Passo a passo**
1. Informe um **item** → **Consultar** → o sistema traz **movimentos**, **saldos por depósito**, o painel **ATP** e os **lotes**.
2. **Lançar movimento:** item, depósito, **tipo**, quantidade, preço e lote.
   ⭐ *O saldo e o **custo médio ponderado** são atualizados na mesma transação.*
3. **Reservas:** crie (reduz o ATP) e depois **Libere** ou **Consuma** por ID.
4. **Lotes:** registre um lote (corrida/*heat*, certificado) → **Genealogia** mostra o histórico **bidirecional** (OFs que **consumiram** × **produziram** o lote).
5. **Consumo médio (ROP):** **Recalcular** atualiza a média móvel (padrão **6 meses**) usada no ponto de reposição.

**Os 5 tipos de movimento:**

| Tipo | O que é |
|:--|:--|
| `IN` | Entrada |
| `OUT` | Saída |
| `TRANSFER_IN` | Entrada por transferência |
| `TRANSFER_OUT` | Saída por transferência |
| `ADJUST` | Ajuste |

#### ⭐⭐ O conceito de ATP — o mais importante do dia

```
ATP = saldo em mãos − reservas
```

Painel: **Em mãos** · **Reservado** · **Disponível**

🗣 **Explique com uma cena:**
> *"Você tem 100 chapas no galpão. Um pedido de venda confirmado já reservou 80. Quanto você pode prometer para o próximo cliente? **Vinte.** Não cem. O ATP é o número honesto — é o que você pode prometer sem quebrar promessa. Confirmar um pedido de venda **reserva automaticamente** o disponível, mantendo o ATP consistente."*

⚠️ **Todo movimento com lote atualiza o saldo segregado por lote.**

**Quem mexe no ATP (mostre a tabela — ela amarra os 4 dias):**

| Tela | O que faz |
|:--|:--|
| `VVND0200` (Pedido de Venda — Dia 4) | **Reserva** o ATP ao confirmar |
| `VPRO0900` (OF — Dia 3) | Gera **OUT** (consumo) e **IN** (conclusão com lote) |
| `VEXP0100` (Romaneio — Dia 4) | Reserva na separação e **consome** no despacho |
| `VEST0200` (Inventário) | **Ajusta** divergências de saldo |

🗣 **Fala de fechamento do B3 (a ponte com o Dia 3):**
> *"Esse saldo que acabou de aparecer aqui é **exatamente** o número que o MRP vai olhar amanhã para decidir o que ainda falta comprar. Estoque certo aqui = MRP certo lá. Estoque errado aqui e o MRP compra o que já tem, ou deixa faltar o que precisa. É por isso que a gente insiste tanto em registrar divergência."*

---

### B4. Inventário, consultas e importação (3:08–3:15 · 7 min)

#### `VEST0200` — Inventário e Tipos de Movimento (3 min)

**Inventário:** `criar → contar → ajustar → fechar`
1. **Novo inventário:** depósito + descrição → nasce **`OPEN`**.
2. Abra e **registre contagens** por item/depósito.
3. **Ajuste** as diferenças por item — ⭐ *cada ajuste gera um **movimento de acerto** de saldo*.
4. **Feche** o inventário.

**Tipos de movimento:** cadastre com **Sigla**, **Descrição** e tipo (IN/OUT) — classificam os lançamentos do `VEST0100`.

#### `VEST0400` — Consultas por Almoxarifado (2 min)

| Consulta | O que traz |
|:--|:--|
| **Movimentos do almoxarifado** | Trilha cronológica de entradas e saídas |
| **Consultar saldo** | Exige **item e almoxarifado**; lote é obrigatório só para item controlado |
| **Saldos do almoxarifado** | Posição consolidada de todos os itens |

⚠️ **Somente leitura — não corrigem estoque.** Para ajuste, use inventário/movimentação **com justificativa e autorização**.
💡 Compare **saldo × movimentos × reservas** antes de concluir que existe divergência.

#### Importação (2 min) — para quem importa insumo

| Tela | O que faz |
|:--|:--|
| `VIMP0200` | Console de processos: capa (moeda, câmbio, incoterm, **base de rateio**), itens (FOB, qtd, peso) e **despesas** |
| `VIMP0101` | Painel de status logístico: `OPEN → NATIONALIZED → CANCELLED` |
| `VIMP0102` | CT-e — cadastrar, consultar e **autorizar** |
| `VIMP0300` | Importação e custo nacionalizado (visão operacional, com **Recalcular**) |

⭐ **A conta do custo nacionalizado:**
```
custo nacionalizado = FOB convertido pelo câmbio + rateio das despesas ÷ quantidade
```

**Bases de rateio:** `VALUE` · `QUANTITY` · `WEIGHT`

⚠️ **Só despesas marcadas "Compõe custo do item" entram no rateio** — as demais ficam informativas.
⚠️ Use **Recalcular** sempre que câmbio, item ou despesa mudar. **Não recalcule processos fechados sem autorização.**

🗣 *"Quem importa sabe: o preço na fatura não é o custo. O custo é FOB + frete + seguro + imposto + despacho, tudo rateado. Essa tela faz essa conta — e é ela que evita vender no prejuízo achando que a chapa custou o que estava na proforma."*

## 8. Dinâmica de fixação + gabarito

### "Da compra à prateleira" (30 min)

**Formato:** duplas · **Entregável:** saldo positivo em estoque, com lote e pedido vinculados

#### Setup (3 min)

Cada dupla precisa abastecer o material do produto do Dia 1 — **a chapa e os parafusos do suporte soldado**.

#### Tarefa cronometrada (20 min)

| # | Passo | Tela | Ponto de controle |
|:-:|:--|:--|:--|
| 1 | Conferir/criar o **tipo de fornecedor** | `VSUP0510` | `kind` correto |
| 2 | Cadastrar o **fornecedor** com IE e endereço | `VSUP0500` | Salvou sem conflito |
| 3 | Vincular os **itens ao fornecedor** | `VVOR0202` | Preço e lead time preenchidos |
| 4 | Marcar o **preferencial** (ranking 1) | `VSUP0130` | Ranking 1 |
| 5 | Cadastrar a **conversão de UM** e testar | `VSUP0110` | Bloco Converter dá o resultado esperado |
| 6 | Cadastrar a **tabela de preço** | `VSUP0120` | Vigência válida |
| 7 | Abrir a **solicitação de compra** | `VSUP0300` | Status Aberto |
| 8 | Gerar **cotação**, precificar e selecionar vencedor | `VSUP0400` | Status Cotada + vencedor por item |
| 9 | **Gerar o pedido** a partir da cotação | `VSUP0400` → `VSUP0200` | Pedido criado |
| 10 | **Aprovar** o pedido (ver a alçada agir) | `VPDC0210` | Aprovado ou bloqueado |
| 11 | Registrar o **aviso de recebimento** e avançar o status | `VAVR0200` | `RELEASED` |
| 12 | Registrar **1 divergência** com resolução | `VAVR0200` | Tipo + resolução preenchidos |
| 13 | Criar **roteiro de inspeção** e gerar a ordem | `VINS0200` / `VINS0201` | Ordem gerada |
| 14 | **Analisar** a ordem com **Movimentar estoque** | `VINS0201` | Quantidades distribuídas |
| 15 | Dar **entrada no estoque** com lote | `VEST0100` | Movimento `IN` com lote |
| 16 | **Consultar o saldo e o ATP** | `VEST0400` / `VEST0100` | Saldo positivo |

#### Gabarito para o instrutor validar

- [ ] Fornecedor salvo com **IE** (ou tipo transportadora, que dispensa)
- [ ] Vínculo item × fornecedor com **preço** e **lead time**
- [ ] **Ranking 1** definido em `VSUP0130`
- [ ] Conversão de UM cadastrada **e testada**
- [ ] Solicitação com status **Parcial** ou **Atendido** (não Aberto)
- [ ] Cotação com **vencedor selecionado por item**
- [ ] Pedido de compra criado a partir da cotação
- [ ] Aviso de recebimento em **`RELEASED`**
- [ ] **≥ 1 divergência** registrada com tipo e resolução
- [ ] Ordem de inspeção **analisada**, com soma ≤ quantidade da ordem
- [ ] Movimento de estoque `IN` com **lote** preenchido
- [ ] **Saldo positivo** e painel **ATP** coerente

#### Erros que vão aparecer (e o que dizer)

| Erro observado | Diagnóstico | Como corrigir |
|:--|:--|:--|
| "Tipo inválido" ao criar fornecedor | Falta tipo de fornecedor | Cadastrar em `VSUP0510` |
| IE recusada | Tipo `NORMAL` exige IE | Preencher IE ou mudar o kind |
| Conflito de documento | CNPJ já cadastrado | O sistema indica o fornecedor existente |
| Pedido sem preço automático | Falta tabela de preço vigente | `VSUP0120` |
| Pedido sem UM interna | Falta conversão | `VSUP0110` |
| Solicitação não gera pedido | Sem fornecedor e sem preferencial | `VSUP0130` |
| Pedido fica bloqueado ao aprovar | **Alçada** — comportamento esperado | ADMIN usa **Autorizar alçada** |
| Recebimento recusa a quantidade | Acima do saldo + tolerância | Conferir `VSUP0630` |
| Ordem de inspeção não aparece | Roteiro fora da vigência, ou base errada | Conferir `VINS0200` |
| Soma da análise recusada | Excede a quantidade da ordem | Redistribuir |
| Material aprovado não aparece disponível | Faltou **Movimentar estoque** | Marcar e registrar de novo |
| Lote recusado | Máscara desativada ou item exige lote | `VEST0300` |
| ATP menor que o saldo | Existem **reservas** — comportamento correto | Consultar reservas em `VEST0100` |

#### Validação e correção (5 min)

Passe de máquina em máquina com o gabarito acima. Para cada dupla, marque o que ficou 🟢/🟡/🔴 e **corrija na hora** o que estiver errado — o erro corrigido na frente da pessoa fixa mais do que o acerto de primeira.

#### Fechamento (2 min)

🗣 *"Material comprado, inspecionado e no estoque. **No Dia 3, o PCP decide o que produzir com ele** — e o chão de fábrica coloca a mão na massa."*

---

## 9. Fecho e gancho para o Dia 3

### Recapitulação em 3 frases

1. **A necessidade nasce** de uma solicitação (ou do MRP) — e vira pedido depois de cotar e aprovar.
2. **O recebimento é o pedágio:** divergiu, registra. O que entra errado aqui contamina tudo.
3. **O saldo tem que ser honesto** — e o número honesto para prometer é o **ATP**, não o saldo em mãos.

### Gancho

🗣 *"Temos produto (Dia 1) e material (Dia 2). Amanhã a pergunta é: **o que, quanto e quando produzir?** Entramos no coração do sistema — PCP e chão de fábrica. E vocês vão ver o MRP olhar exatamente para esse saldo que vocês acabaram de criar."*

### Lição de casa opcional

- Listar os **5 fornecedores críticos** do setor e conferir se estão homologados (`VAVF0203`).
- Conferir se os itens comprados têm **conversão de UM** e **fornecedor preferencial**.

---

## 10. Troubleshooting

### Códigos de erro (vale para o ERP inteiro)

| Erro | Verificação recomendada |
|:--|:--|
| **400** — dados inválidos | Campo obrigatório, número, data/hora e estrutura das listas |
| **401** — sessão inválida | Refazer login; **não repetir a operação antes de autenticar** |
| **403** — acesso negado | A ação exige ADMIN ou permissão específica |
| **404** — não encontrado | O código pertence à empresa autenticada? O registro foi desativado? |
| **409 / 422** — regra de negócio | Situação atual, saldo, vigência, duplicidade, transição permitida |
| **Grade vazia** | Limpar filtros, conferir período/tenant, executar Consultar |
| **Timeout após gravar** | **Consultar pelo código/referência antes de reenviar** |

### Erros específicos do Dia 2

| Sintoma | Causa provável | Solução |
|:--|:--|:--|
| Fornecedor recusado por "tipo inválido" | `VSUP0510` sem tipos cadastrados | Cadastrar o tipo primeiro |
| MEI marcado em Pessoa Física | Regra de negócio | MEI só para PJ |
| Registro M.A. recusado | Formato incorreto | Usar `AA-99999-9` |
| Consulta SEFAZ falhando | Credencial ou indisponibilidade do provedor | ⚠️ **Não preencher a tela com dado local** |
| Preço não veio automático | Tabela sem vigência ou sem o item | `VSUP0120` |
| Quantidade interna zerada no pedido | Falta conversão de UM | `VSUP0110` |
| Alçada bloqueando tudo | Limite mal cadastrado | Validar com pedido de teste em `VPDC0210` |
| Tolerância barrando entrega correta | Intervalos sobrepostos | Usar o simulador do `VPCT0100` |
| Contrato não deixa consumir saldo | Contrato não está `ACTIVE` | Mudar status em `VCON0400` |
| Consumo de contrato recusado | Excede o saldo | Conferir `contratada − consumida` |
| EDI com divergência | Fora da tolerância cadastrada | Tratar antes de aprovar/receber |
| Ordem de terceiro duplicada | Gerou pela OF duas vezes | ⚠️ Conferir antes de gerar |
| Movimento de terceiro duplicado | Repetiu sem chave de idempotência | Consultar movimentos antes de repetir |
| Almoxarifado não aparece | **Disponível** desligado | Ativar em `VENT0800` |
| Lote repetido | Clicou em gerar mais de uma vez | ⚠️ Geração **avança a sequência** — não clique repetido |
| Genealogia vazia | O lote ainda não participou de OF | Normal antes do Dia 3 |
| IQF sem dados | Sem recebimentos/inspeções no período | Ampliar o período |
| Custo nacionalizado errado | Despesa sem "Compõe custo do item" | Marcar e **Recalcular** |

### Conferência antes de encerrar qualquer rotina (ensine como hábito)

1. Verifique a mensagem de sucesso ou erro.
2. Confira o **identificador e a situação retornados**.
3. **Reexecute a consulta** da entidade alterada.
4. Confirme **efeitos colaterais**: estoque, pedido, custo, score.
5. Em operação com lista, compare a **quantidade de linhas enviada × processada**.
6. Guarde referência e observação suficientes para auditoria.

---

## 11. Perguntas que a turma sempre faz

**P: Qual a diferença entre Solicitação e Cotação?**
R: A **solicitação** é o pedido interno de compra ("o que eu preciso"). A **cotação** é o processo de comparar preços de vários fornecedores antes de comprar. Ambas terminam gerando **pedidos de compra**.

**P: A sugestão do MRP vira pedido sozinha?**
R: **Não.** O MRP **sugere**; o comprador **aprova** na aba Sugestões do `VSUP0200`, informando fornecedor e preço. Só então vira pedido firme — e **só suprimento firme entra no netting do MRP**.

**P: De onde veio o preço que apareceu sozinho no item do pedido?**
R: Da **Tabela de Preço de Compra** (`VSUP0120`), preferindo o preço **específico do fornecedor**. O **%IPI** vem da classificação fiscal e a **UM interna** das conversões (`VSUP0110`).

**P: Posso comprar de fornecedores diferentes na mesma cotação?**
R: Sim — a seleção do vencedor é **por item**. O sistema agrupa por fornecedor e gera um pedido para cada.

**P: Aprovar o pedido é o mesmo que receber?**
R: **Não.** São operações diferentes, ainda que na mesma tela (`VPDC0210`). Aprovação libera o pedido; recebimento registra a chegada física.

**P: Por que meu pedido ficou bloqueado ao aprovar?**
R: O valor excedeu a **alçada** vigente (`VSUP0610`). Um usuário **ADMIN** precisa usar **Autorizar alçada**.

**P: Existem duas telas de tolerância. Qual eu uso?**
R: `VSUP0630` é o cadastro completo, campo a campo. `VPCT0100` tem o **simulador** — informe esperado e real e veja o veredito sem gravar. Use o simulador antes de ativar a regra.

**P: Por que o ATP está menor que o saldo?**
R: Porque existem **reservas**. `ATP = saldo em mãos − reservas`. É o número honesto do que você pode prometer.

**P: O material foi aprovado na inspeção mas não aparece disponível.**
R: Faltou marcar **Movimentar estoque** na análise. Material aprovado só fica disponível **depois** da movimentação para o almoxarifado de destino.

**P: Posso cadastrar o roteiro de inspeção por família em vez de item a item?**
R: Sim — use a base **`CLASSIFICATION`**. A busca prefere o específico por item/máscara e **cai para a classificação**. É assim que se cobre a família inteira.

**P: Onde eu vejo o histórico de preço que paguei por um item?**
R: `VSUP0650` — Histórico de Movimentos de Compra. Comece com limite baixo (100) e filtre por fornecedor e/ou item.

**P: Posso apagar um contrato?**
R: Não. Contratos são **encerrados** (status `CLOSED`) ou **cancelados** (`CANCELLED`, irreversível pela tela).

**P: Quando devo marcar "afeta IQF" numa divergência?**
R: Quando a **não conformidade for responsabilidade do fornecedor**. Se não for, não marque — divergências marcadas como "não afeta IQF" não devem penalizá-lo.

---

## 12. Checklist de saída e avaliação

### Checklist do participante

- [ ] Cadastro tipo de fornecedor e fornecedor completo (`VSUP0510` → `VSUP0500`)
- [ ] Vinculo itens ao fornecedor e defino o preferencial (`VVOR0202` / `VSUP0130`)
- [ ] Cadastro conversão de UM e testo o resultado (`VSUP0110`)
- [ ] Cadastro tabela de preço de compra e sei a hierarquia de preço (`VSUP0120`)
- [ ] Abro solicitação e gero pedidos a partir dela (`VSUP0300`)
- [ ] Conduzo uma cotação e seleciono vencedor por item (`VSUP0400`)
- [ ] Emito pedido de compra e entendo os defaults automáticos (`VSUP0200` / `VPDC0200`)
- [ ] Aprovo/autorizo pedido respeitando a alçada (`VPDC0210`)
- [ ] Aprovo sugestões do MRP na aba Sugestões (`VSUP0200`)
- [ ] Registro aviso de recebimento e percorro o ciclo de status (`VAVR0200`)
- [ ] Registro divergência com tipo, resolução e flag de IQF (`VAVR0200`)
- [ ] Crio roteiro de inspeção com etapas e limites (`VINS0200`)
- [ ] Gero e analiso ordem de inspeção com movimentação (`VINS0201`)
- [ ] Cadastro almoxarifado sabendo o efeito da localização (`VENT0800`)
- [ ] Monto máscara de lote e sei que a geração avança a sequência (`VEST0300`)
- [ ] Lanço movimento de estoque com lote (`VEST0100`)
- [ ] Leio saldo, ATP e reservas (`VEST0100` / `VEST0400`)
- [ ] Interpreto o IQF do fornecedor (`VAVF0300`)

### Avaliação do instrutor (por participante)

| Competência | 🔴 Não fez | 🟡 Fez com ajuda | 🟢 Fez sozinho |
|:--|:-:|:-:|:-:|
| Cadastrar fornecedor completo | | | |
| Executar solicitação → cotação → pedido | | | |
| Aprovar respeitando alçada | | | |
| Registrar recebimento com divergência | | | |
| Analisar inspeção e destinar material | | | |
| Dar entrada com lote e ler o ATP | | | |

> **Ação para 🔴 e 🟡:** o Dia 3 depende de saldo correto. Agende reforço antes.

---

## Anexo A — Dados-semente do Dia 2

### Fornecedor-exemplo

| Campo | Valor |
|:--|:--|
| Razão social | Metalúrgica Distribuidora Aço Sul Ltda |
| Tipo de pessoa | Jurídica |
| Tipo de fornecedor | `NORMAL` (exige IE) |
| Tipo de frete | CIF |
| Contribuinte de ICMS | Sim |
| UF | SP |
| Condição de pagamento | 30/60 dias |

### Itens × fornecedor (`VVOR0202` / `VSUP0130`)

| Item | Ranking | Preço | UM | Lead time | Lote mín. | ABC |
|:--|:-:|:-:|:-:|:-:|:-:|:-:|
| `MP-CHAPA-1020-6.35` | 1 | R$ 8,40/kg | KG | 15 d | 500 | A |
| `MP-PARAF-M8-25` | 1 | R$ 0,38/pc | PC | 7 d | 1000 | C |
| `MP-ELETRODO-E6013` | 1 | R$ 22,00/kg | KG | 10 d | 20 | B |

### Conversões de UM (`VSUP0110`)

| Item | De | Para | Fator | Significado |
|:--|:--|:--|:-:|:--|
| `MP-CHAPA-1020-6.35` | `CH` | `KG` | 49,9 | 1 chapa 1000×2000×6,35 = 49,9 kg |
| `MP-PARAF-M8-25` | `CX` | `PC` | 500 | 1 caixa = 500 parafusos |
| `MP-ELETRODO-E6013` | `CX` | `KG` | 5 | 1 caixa = 5 kg |

### Almoxarifados (`VENT0800`)

| Código | Descrição | Localização | Tipo |
|:--|:--|:--|:--|
| `ALM-MP` | Matéria-prima | Interno | Normal |
| `ALM-INSP` | Quarentena de inspeção | Inspeção | Normal |
| `ALM-REJ` | Material rejeitado | Rejeição | Normal |
| `ALM-RETR` | Retrabalho | Interno | Normal |
| `ALM-PA` | Produto acabado | Interno | Normal |
| `ALM-EXP` | Expedição | Expedição | Normal |
| `ALM-LINHA` | Linha de produção | Interno | Linha de Produção |

### Roteiro de inspeção da chapa (`VINS0200`)

**Capa:** Base `ITEM` · Item `MP-CHAPA-1020-6.35` · Almoxarifado de inspeção `ALM-INSP` · Vigência: hoje

| Seq | Etapa | Espécie | Apontamento | Nominal | Mín | Máx | Amostra |
|:-:|:--|:--|:--|:-:|:-:|:-:|:-:|
| 10 | Espessura (mm) | `VALUE` | `ALL_MEASUREMENTS` | 6,35 | 6,20 | 6,50 | 5 |
| 20 | Certificado de qualidade | `ATTRIBUTE` | `STATUS_ONLY` | — | — | — | 1 |
| 30 | Aspecto superficial | `ATTRIBUTE` | `STATUS_ONLY` | — | — | — | 5 |

### Máscara de lote (`VEST0300` / `VLOT0100`)

| Seq | Tipo | Valor / Formato | Tamanho |
|:-:|:--|:--|:-:|
| 10 | `CARACTER` | `LT` | 2 |
| 20 | `DATA` | `yyyyMMdd` | 8 |
| 30 | `SEQ_NUMERICA` | zerar no ano = sim | 6 |

Resultado: `LT20260731000042`

### Cenário da dinâmica

| Etapa | Valor |
|:--|:--|
| Solicitação | 1.000 kg de `MP-CHAPA-1020-6.35` |
| Cotação | 3 fornecedores convidados |
| Vencedor | R$ 8,40/kg · lead time 15 d · 30/60 |
| Pedido | 1.000 kg = **R$ 8.400,00** |
| Alçada sugerida para a aula | Aprovação automática até **R$ 5.000** → o pedido **bloqueia** (didático) |
| Recebimento | 980 kg (divergência `SHORTAGE` de 20 kg, resolução `ACCEPTED`, afeta IQF ✅) |
| Inspeção | 980 kg → 950 conforme · 30 rejeitada |
| Entrada em estoque | 950 kg no `ALM-MP`, lote `LT20260731000042` |

---

## Anexo B — Glossário do Dia 2

| Termo | Definição |
|:--|:--|
| **Alçada** | Valor máximo que um perfil pode aprovar sem intervenção superior |
| **ATP** | *Available to Promise* — `saldo em mãos − reservas`. O que você pode prometer |
| **Aviso de recebimento (FAVR)** | Registro da chegada, **antes** da entrada fiscal da NF |
| **Consumo médio (ROP)** | Média móvel (padrão 6 meses) usada no ponto de reposição |
| **Cotação** | Comparação de preços de vários fornecedores antes de comprar |
| **Custo médio ponderado** | Custo do estoque atualizado a cada movimento, na mesma transação |
| **Custo nacionalizado (landed)** | FOB convertido + rateio das despesas ÷ quantidade |
| **Divergência** | Diferença entre o esperado e o recebido (8 tipos, 5 resoluções) |
| **EDI** | Troca eletrônica de dados com o fornecedor (confirmação de pedido) |
| **Genealogia** | Histórico bidirecional do lote: OFs que consumiram × produziram |
| **Homologação** | Aprovação formal do fornecedor, com validade e limites |
| **Incoterm** | Termo internacional de comércio (FOB, CIF…) |
| **IQF** | Índice de Qualificação de Fornecedores — qualidade 40% + entrega 30% + comercial 20% + atendimento 10% |
| **Lote / série** | Identificação da corrida (*heat*) que segue a mercadoria |
| **Netting** | Cálculo do MRP que abate suprimentos **firmes** da necessidade |
| **Ordem de inspeção** | Documento que representa a quantidade a inspecionar |
| **Preferencial (ranking)** | Ordem de escolha do fornecedor por item — `1` é o preferido |
| **Quarentena** | Almoxarifado de inspeção, onde o material aguarda liberação |
| **Reserva** | Bloqueio lógico do estoque — reduz o ATP, não baixa o físico |
| **Saldo de contrato** | `contratada − consumida` |
| **Solicitação de compra** | Pedido interno que expressa a necessidade |
| **Sugestão de compra** | Proposta gerada pelo MRP; vira pedido só quando aprovada |
| **Tolerância** | Desvio permitido entre pedido e entrega, com ação permitir/avisar/bloquear |

---

**Fim do Manual do Instrutor — Dia 2.**
Material complementar desta pasta: `roteiro-cronometrado.md` e `apostila-participante.md`.

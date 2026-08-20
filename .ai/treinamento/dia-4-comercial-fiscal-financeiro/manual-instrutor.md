# DIA 4 — GIRO & RETAGUARDA · Manual do Instrutor

**Comercial, Expedição, Custo/Precificação, Fiscal, Financeiro e Contabilidade**

| | |
|:--|:--|
| **Carga horária** | 4 horas (bloco único, com 15 min de intervalo) |
| **Público principal** | Comercial/Vendas · Custos/Precificação · Fiscal · Financeiro/Contábil |
| **Ouvintes recomendados** | Diretoria · Expedição · PCP |
| **Pré-requisito** | **Dias 1–3** — produto, material e custo de produção |
| **Telas no escopo** | 85 telas (14 troncais · 25 de apoio · 46 de referência) |
| **Entregável do dia** | **NF-e emitida + título a receber gerado + impacto visível no fluxo de caixa** |

> **Posição na corrente:**
> `Cadastros → Engenharia → Suprimentos+Estoque → PCP → Produção → [VENDAS → FISCAL → FINANCEIRO]`
>
> **É o dia que fecha a corrente:** transforma o produto em receita, a receita em nota e a nota em caixa.

---

## Índice

1. [Objetivos de aprendizagem](#1-objetivos-de-aprendizagem)
2. [Preparação do instrutor](#2-preparação-do-instrutor)
3. [Mapa completo das telas do Dia 4](#3-mapa-completo-das-telas-do-dia-4)
4. [Agenda minuto a minuto](#4-agenda-minuto-a-minuto)
5. [Abertura (0:00–0:15)](#5-abertura-000015)
6. [Bloco A — Vender e precificar (0:15–1:45)](#6-bloco-a--vender-e-precificar-015145)
7. [Bloco B — Faturar e receber (2:00–3:15)](#7-bloco-b--faturar-e-receber-200315)
8. [Dinâmica de fixação + gabarito](#8-dinâmica-de-fixação--gabarito)
9. [Encerramento do treinamento](#9-encerramento-do-treinamento)
10. [Troubleshooting](#10-troubleshooting)
11. [Perguntas que a turma sempre faz](#11-perguntas-que-a-turma-sempre-faz)
12. [Checklist de saída e avaliação](#12-checklist-de-saída-e-avaliação)
13. [Anexo A — Dados-semente do Dia 4](#anexo-a--dados-semente-do-dia-4)
14. [Anexo B — Glossário do Dia 4](#anexo-b--glossário-do-dia-4)

---

## 1. Objetivos de aprendizagem

| # | Competência | Evidência verificável |
|:-:|:--|:--|
| 1 | Cadastrar **cliente** completo (3 abas) com dados fiscais e **limite de crédito** | Cliente salvo, CNPJ validado |
| 2 | Configurar **permissões/restrições de venda** e faixas de frete | Regra aplicada no pedido |
| 3 | Formar **preço** com margem a partir do custo | Margem % calculada |
| 4 | Criar **orçamento** e **converter em pedido** | Pedido criado com o saldo aberto |
| 5 | Criar **pedido de venda** e **confirmar** | 3 automações disparadas |
| 6 | Explicar as **3 automações** da confirmação | Crédito · reserva ATP · demanda MRP |
| 7 | Tratar um pedido **bloqueado por crédito** | Desbloqueio após liberação |
| 8 | Gerar **romaneio** e percorrer o ciclo até despacho | `ABERTO → SEPARADO → CONFERIDO → DESPACHADO` |
| 9 | Emitir **NF-e de saída** e **autorizar** na SEFAZ | Status `Autorizada` + chave de 44 dígitos |
| 10 | Tratar uma **NF-e rejeitada** | Motivo lido e corrigido |
| 11 | Emitir **CC-e** e saber seus limites | Correção sem cancelar a nota |
| 12 | Localizar o **título a receber** gerado | Vínculo com a NF-e |
| 13 | **Baixar** um título (total e parcial) | Status `pago` / `parcial` |
| 14 | Ler o **fluxo de caixa** (realizado, projetado, saldos) | 3 abas interpretadas |
| 15 | Ler a **apuração de impostos** por competência | Saldo a recolher × crédito |
| 16 | **Conciliar** por OFX | Movimentos conciliados |

**Meta de aprovação do dia:** 13 das 16 competências demonstradas.

---

## 2. Preparação do instrutor

### 2.1 Ambiente e dados-semente

- [ ] **Base dos Dias 1–3 preservada** — produto acabado **com saldo em estoque** e **custo real apurado**.
- [ ] **Apoios de cliente** (`VCLI0510` / `VCLI0520` / `VCLI0530`): regiões, segmentos, tipos de cliente, tipos de contato, portadores, condições de pagamento, tabelas de venda, tipos de NF de saída, tipos de imposto.
- [ ] **Motivos de cancelamento de orçamento** (`VVND0310`) — ⚠️ **sem ao menos um motivo o `VVND0300` não cancela nada**.
- [ ] **Configuração fiscal** (`VFIS0100`) completa: CNPJ, razão social, IE, **regime tributário**, endereço com IBGE, **token Focus NF-e** e **ambiente = Homologação**.
- [ ] **Tabelas tributárias** (`VFIS0110`): NCMs do produto, ICMS interno da UF e pares interestaduais.
- [ ] **CFOPs** (`VFIS0300`): pelo menos `5101` / `5102` / `6101` / `6102`.
- [ ] **Contas bancárias** (`VFIN0100`), **condições de pagamento** (`VFIN0110`), **plano de contas** (`VFIN0120`), **centros de custo** (`VFIN0130`).
- [ ] **Custo/hora dos centros** e custo padrão calculado (do Dia 3).
- [ ] **Almoxarifado de expedição** (`VENT0800`).
- [ ] **Snapshot do banco** antes da aula.

> ⚠️ **AMBIENTE FISCAL:** confirme **Homologação** em `VFIS0100` antes de começar. **Nota emitida em Produção é nota real.** Diga isso em voz alta para a turma.

> ⚠️ **Não deixe pronto:** cliente, precificação, orçamento, pedido, romaneio, NF-e, títulos. É tudo entregável da turma.

### 2.2 O que testar na véspera

1. Cadastrar um cliente do zero em `VCLI0500` (3 abas).
2. Formar preço em `VCST0202` a partir do custo do Dia 3.
3. Criar orçamento (`VVND0300`) e **converter em pedido**.
4. Confirmar o pedido (`VVND0200`) e ver as **3 automações**.
5. **Forçar um bloqueio de crédito** — baixe o limite do cliente-teste de propósito. É a demo mais didática do bloco A.
6. Gerar romaneio (`VEXP0100`) por auto-fill e percorrer até `DESPACHADO`.
7. Criar rascunho de NF-e (`VFIS0200`), **autorizar em homologação** e conferir a chave de 44 dígitos.
8. Emitir uma **CC-e** e um **cancelamento** com justificativa de 15+ caracteres.
9. Localizar o título em `VFIN0210` e **baixar parcialmente**.
10. Ler as 3 abas do `VFIN0300`.

### 2.3 O quadro que fica no flip chart o dia inteiro

```
CLIENTE ──▶ PREÇO ──▶ ORÇAMENTO ──▶ PEDIDO ──▶ ROMANEIO ──▶ NF-e ──▶ TÍTULO ──▶ CAIXA
VCLI0500   VCST0202   VVND0300     VVND0200   VEXP0100    VFIS0200  VFIN0210  VFIN0300
"quem"     "quanto"   "proposta"   "vendido"  "separado"  "faturado" "a receber" "recebido"
```

---

## 3. Mapa completo das telas do Dia 4

> É o dia mais amplo do treinamento (70 telas). A estratégia: **14 troncais em profundidade**, **22 de apoio demonstradas rápido** e **34 de referência localizadas na tela**, todas documentadas na apostila.

### 3.1 Troncais — demonstrar ao vivo + praticar (14)

| Código | Tela | Por que é troncal |
|:--|:--|:--|
| `VCLI0500` | Cadastro de Cliente | A base de todo o processo comercial |
| `VCLI0117` | Permissões e Restrições de Venda | O que este cliente pode/não pode comprar |
| `VCST0202` | Precificação de Produtos | Onde o custo vira preço com margem |
| `VVND0300` | Orçamento de Venda | A proposta antes do pedido |
| `VVND0310` | Parâmetros de Orçamento | Pré-requisito do orçamento (motivos de cancelamento) |
| `VVND0200` | Pedido de Venda | O ponto de partida da demanda — **3 automações** |
| `VVND0600` | Análise, Atendimento e Conferência de Pedidos | Workflow comercial |
| `VEXP0100` | Expedição / Romaneio | Separação → conferência → packing → despacho |
| `VFIS0100` | Configuração Fiscal | A fundação do módulo fiscal |
| `VFIS0300` | CFOPs / Naturezas de Operação | Define a natureza da operação |
| `VFIS0200` | NF-e de Saída | ⭐ A tela mais importante do módulo fiscal |
| `VFIN0210` | Contas a Receber | O título que a venda gerou |
| `VFIN0200` | Contas a Pagar | O título que a compra do Dia 2 gerou |
| `VFIN0300` | Fluxo de Caixa e Saldos | O espelho de tudo que a fábrica fez |

### 3.2 Apoio — demonstrar rápido (25)

| Código | Tela | Papel no Dia 4 |
|:--|:--|:--|
| `VCLI0510` / `VCLI0520` / `VCLI0530` | Apoio de Cliente — Básico / Comercial / Fiscal | Pré-requisitos do cadastro de cliente |
| `VCLI0202` | Políticas de Frete e Formação de Preço | Faixas de frete por cliente |
| `VCLI0600` | Manutenção Avançada de Preços de Venda | Ajuste em massa |
| `VCUS0100` | Custos (centro, compra, alocação, overhead) | As entradas do custo |
| `VPDV0200` | Cadastro de Pedido de Venda | Visão de formulário do pedido |
| `VPDV0108` / `VPDV0111` | Políticas Comerciais de Descontos / Fretes | Regras que bloqueiam ou liberam |
| `VVND0100` | Divisão de Vendas | Organização comercial; permite condição livre |
| `VVND0400` / `VVND0500` | Representantes / Metas de Vendas | Quem vende e quanto deve vender |
| `VEXP0110` / `VEXP0120` | Gestão de Cargas / Instruções e Caixas | Carga física que agrupa romaneios |
| `VFIS0110` | Tabelas Tributárias | NCM, ICMS interno e interestadual |
| `VFIS0210` | NF-e de Entrada | As compras do Dia 2 → conta a pagar |
| `VFIS0640` | Faturamento Fiscal de Carga e DANFE | Carga → NF-e + DANFE/XML |
| `VFIN0400` | Apuração de Impostos | Débito × crédito por competência |
| `VFIN0100` / `VFIN0110` / `VFIN0120` | Contas Bancárias / Condições / Plano de Contas | Fundação financeira |
| `VFIN0620` | Conciliação Bancária por OFX | Bater o extrato |
| `VFIN0500` | Relatórios Fiscais e Financeiros | R01–R18 |
| `VCTB0102` / `VCTB0200` | Centro de Custo / Contabilidade SPED ECD | Ponte contábil |

### 3.3 Referência — mostrar onde fica (46)

**Comercial e pós-venda**
`VENT0100` Consulta de Pedido de Venda · `VPDV0253` Console de Acompanhamento · `VEXR0100` Reprogramação de Entrega · `VVRE0200` Console de Vendas Recorrentes · `VVND0610` Reajuste de Venda Recorrente · `VREP0600` Complementos do Representante · `VRE0203` Consulta de Comissões Futuras · `VDPR0100` Promessa: Ocupação e Reservas · `VPLC0200` Montagem de Carga · `VPLC0211` Orientações de Entrega · `VASS0201` / `VASS0402` Assistência Técnica · `VATC0280` / `VATC0380` / `VATC0480` Chamados · `VGAR0211` Devoluções e Garantia · `VSAC0100` / `VSAC0200` SAC

**Fiscal**
`VFIS0310` Dispositivos Legais · `VFIS0320` Parâmetros ICMS/IPI · `VFIS0330` Redução/Substituição/Diferimento · `VFIS0350` Classificações Fiscais · `VFIS0360` Tipos de Operação de Entrada · `VFIS0340` Apuração do Simples Nacional · `VFIS0500` Motivos de Transferência DAPI · `VFIS0510` / `VFIS0520` Códigos de Ajuste ICMS · `VFIS0530` / `VFIS0540` Linhas e Lançamentos de Apuração · `VFIS0550` Restituição ICMS ST · `VFIS0560` Notas Especiais de Ajuste · `VFIS0600` SPED EFD ICMS/IPI · `VFIS0610` Importação de NF-e por Chave · `VFIS0620` Manifestação e Inutilização · `VFIS0630` Tabela IBPT · `VFIS0120` Exclusão de Tributação NCM · `VFIS0660` Consultas Pontuais · `VFIS0220` CT-e · `VNFS0100` NFS-e · `VIMP0102` CT-e (importação)

**Financeiro e contábil**
`VFIN0130` Centros de Custo · `VFIN0600` Adiantamentos · `VFIN0610` Remessa CNAB 240 · `VCTB0600` SPED ECD · `VUTL0555` / `VUTL0560` UFs e Regiões

---

## 4. Agenda minuto a minuto

| Horário | Duração | Bloco | Conteúdo | Formato |
|:--|:-:|:--|:--|:--|
| 0:00–0:15 | 15' | Abertura | A corrente completa + o giro que fecha o ciclo | Fala |
| 0:15–0:35 | 20' | **A1** | Cadastro de Cliente e apoios | Demo + prática |
| 0:35–0:45 | 10' | **A2** | Restrições de venda e políticas de frete | Demo |
| 0:45–1:05 | 20' | **A3** | Custo e precificação ⭐ | Demo + prática |
| 1:05–1:35 | 30' | **A4** | Orçamento → Pedido de Venda ⭐ | Demo + prática |
| 1:35–1:45 | 10' | **A5** | Workflow, representantes e pós-venda | Tour |
| 1:45–2:00 | 15' | — | **Intervalo** | — |
| 2:00–2:12 | 12' | **B1** | Expedição / Romaneio | Demo + prática |
| 2:12–2:45 | 33' | **B2** | Fiscal: NF-e de Saída ⭐ | Demo + prática |
| 2:45–3:05 | 20' | **B3** | Financeiro: contas e fluxo de caixa ⭐ | Demo + prática |
| 3:05–3:15 | 10' | **B4** | Apuração, SPED e contabilidade | Tour |
| 3:15–3:45 | 30' | **Dinâmica** | "Do pedido ao recebimento" | Prática em dupla |
| 3:45–4:00 | 15' | Encerramento | O ciclo completo + entrega dos materiais | Fala |

**Regra de ritmo:** se atrasar, corte **A5** e **B4**. Nunca corte A4 (pedido), B2 (NF-e) ou B3 (financeiro).

---

## 5. Abertura (0:00–0:15)

### 5.1 A corrente completa (6 min)

Projete o diagrama dos 4 dias e **percorra o que a turma já construiu**:

```
DIA 1              DIA 2                    DIA 3            DIA 4
CADASTROS ──▶ ENGENHARIA ──▶ SUPRIMENTOS+ESTOQUE ──▶ PCP ──▶ PRODUÇÃO ──▶ VENDAS ──▶ FISCAL ──▶ FINANCEIRO
   ✅              ✅                  ✅               ✅          ✅          hoje       hoje        hoje
```

🗣 *"Vocês cadastraram um produto, compraram o material, planejaram, produziram — e agora existe um suporte soldado no estoque, com custo real apurado. Só que ele **não vale nada** enquanto não virar dinheiro. É isso que fechamos hoje."*

### 5.2 A mensagem-síntese do dia (3 min)

> 🗣 *"Vender é fácil; vender **pelo preço certo, faturar sem erro e receber no prazo** é o que mantém a fábrica viva. Hoje a gente fecha a corrente — do pedido ao caixa."*

### 5.3 As 3 travessias do dia (3 min)

Escreva no quadro:

```
VENDAS     →  transforma PRODUTO em RECEITA
FISCAL     →  transforma RECEITA em NOTA
FINANCEIRO →  transforma NOTA em CAIXA
```

### 5.4 ⚠️ Aviso de ambiente fiscal (3 min) — não pule

🗣 *"Vamos emitir nota fiscal hoje. O sistema tem dois ambientes: **Homologação** — que é o de teste, e é onde estamos — e **Produção**, onde a nota é real e tem valor jurídico. Antes de qualquer emissão na empresa de vocês, **conferir o ambiente é a primeira coisa a fazer**. Nota emitida em Produção por engano é nota que precisa ser cancelada em 24 horas, e cancelamento fora do prazo a SEFAZ rejeita."*

Abra `VFIS0100` e mostre o rodapé com o **regime tributário** e o **ambiente ativo**.

---

## 6. Bloco A — Vender e precificar (0:15–1:45)

### A1. Cadastro de Cliente (0:15–0:35 · 20 min)

#### Os apoios primeiro (5 min)

> ⚠️ **Mesma lógica do Dia 2:** sem os apoios, o cadastro de cliente não fecha.

| Tela | Abas / O que cadastrar |
|:--|:--|
| `VCLI0510` (Básico) | **Região** (UF + Cidade) · **Segmento** (com hierarquia e retenção de PIS/COFINS) · **Tipo Contato** · **Tipo Cliente** (código, descrição, categoria `NORMAL`/`CONSUMIDOR`, dias de entrega) · **Portador** · **Grupo de Portadores** |
| `VCLI0520` (Comercial) | **Condições de Pagamento** · **Tabelas de Venda** |
| `VCLI0530` (Fiscal) | **Tipos de NF de Saída** · **Tipos de Imposto** |

#### `VCLI0500` — Cadastro de Cliente (15 min)

**3 abas.** Demonstre ao vivo cadastrando um cliente industrial.

**Aba Dados — identificação**

| Campo | Obrig. | O que explicar |
|:--|:-:|:--|
| **Código** | auto | Gerado ao salvar; somente leitura na edição |
| **Razão Social / Nome** | ✅ | |
| Nome Fantasia | | |
| **Tipo Documento** | ✅ | `CNPJ` (PJ) ou `CPF` (PF) |
| **Documento** | ✅ | ⭐ Validação de **dígito verificador** em tempo real |
| Inscrição Estadual | | Contribuintes de ICMS |
| Inscrição Municipal | | Prestadores de serviço |
| **Código SUFRAMA** | | Zona Franca de Manaus |
| **Corporate (Matriz/Filial)** | | Toggle |
| **Matriz** | ✅ se filial | ⚠️ **Filial DEVE ter matriz associada — e a matriz precisa existir antes** |

**Aba Dados — classificação comercial**
Região · Segmento de Mercado · Tipo Cliente · **Condição de Pagamento** · **Tabela de Venda** · Transportadora · Grupo Transportadora · **Tipo de Nota Fiscal** · **Tipo de Imposto**

**Aba Dados — parâmetros comerciais**

| Campo | O que faz |
|:--|:--|
| **Visibilidade Cond. Pagto** | `Somente Vinculados` restringe · `Todos` libera qualquer condição |
| ⭐ **Limite de Crédito** | Valor máximo em R$. Vendas que excedam podem ser **bloqueadas** |
| ⭐ **Bloqueado** | Toggle que **impede novos pedidos** |
| Website | |

**Aba Endereços** — ⚠️ *adicione ao menos um*
**Tipo** (`Cobrança` / `Entrega` / `Faturamento`) · CEP · Logradouro · Número · Bairro · Cidade · UF · País · marcar um como **padrão**.

⭐ **Cada cliente pode ter vários endereços de cada tipo** — permite múltiplos endereços de entrega (filiais do cliente) sob um mesmo cadastro.

**Aba Contatos**
Tipo · Nome · E-mail · Telefone · Celular · Cargo · **Primário**.

#### As 3 falas obrigatórias

🗣 **Sobre o cadastro fiscal:**
> *"O cadastro fiscal do cliente aqui é o que vai preencher a nota depois, **sozinho**. Cada campo que vocês deixam vazio agora é um campo que alguém vai digitar na mão em cada nota — e errar em alguma."*

🗣 **Sobre o limite de crédito:**
> *"O limite de crédito é o **freio** que evita vender pra quem não vai pagar. Clientes **sem limite definido** (zero ou nulo) **não sofrem restrição nenhuma** — ou seja, deixar em branco não é 'seguro por padrão', é 'liberado por padrão'. Definam isso conscientemente."*

🗣 **Sobre bloqueio:**
> *"Cliente bloqueado **não pode ter novos pedidos**. Mas os pedidos já existentes **não são afetados** — isso é proposital, senão você quebraria contratos em andamento."*

⚠️ **Ponto que a turma sempre esquece:** alterar a Condição de Pagamento ou a Tabela de Venda padrão **não afeta pedidos já criados** — só os novos.

---

### A2. Restrições de venda e políticas de frete (0:35–0:45 · 10 min)

#### `VCLI0117` — Permissões e Restrições de Venda

**O que faz:** controla **quais itens ou classificações** podem (Permissão) ou não podem (Restrição) ser vendidos para determinados clientes, estabelecimentos ou representantes.

**Passo a passo**
1. **Filtros / escopo:** **Cliente** (obrigatório) · Estab. Faturamento (opcional) · Representante (opcional).
2. Escolha a aba **Itens** (produto por produto) ou **Classificação** (categoria inteira).
3. **Adicionar** → Item ou Classificação · **Tipo Regra** (`Permissão` / `Restrição`) · **Data Início/Fim** de vigência (opcional) · **Motivo**.
4. **Salvar**.

⭐ **A lógica — desenhe no quadro:**

```
SEM regras         →  TODOS os itens são vendáveis
COM Permissões     →  APENAS os listados são liberados  (whitelist)
COM Restrições     →  Os listados são bloqueados        (blacklist)

RESTRIÇÕES PREVALECEM SOBRE PERMISSÕES
```

⭐ **Escopo por Classificação** aplica a regra a **todos os itens da categoria** — presentes **e futuros**.
⚠️ O sistema consulta estas regras **automaticamente durante a criação do pedido**.

🗣 *"Isso serve pra exclusividade de distribuidor, bloqueio de item por região, e — na prática — pra não vender pro concorrente disfarçado. E repara: por classificação, item novo da família já nasce coberto pela regra."*

#### `VCLI0202` — Políticas de Frete por Cliente

Faixas de valor com **percentuais progressivos ou regressivos**.

| Campo | Obrig. |
|:--|:-:|
| Cliente | ✅ |
| Estabelecimento (vazio = todos) | |
| **Valor Inicial** / **Valor Final** | ✅ |
| **Percentual Frete (%)** | ✅ |

⚠️ **Validação:** `Valor Final > Valor Inicial` e `Percentual > 0`.
⚠️ **Faixas sem sobreposição** — use faixas contíguas (`0–5000`, `5000,01–20000`).

Exemplo: *"Pedidos até R$ 5.000: 5% de frete; de R$ 5.000,01 a R$ 20.000: 3,5%."*

#### Políticas comerciais (citar, 3 min)

| Tela | O que faz |
|:--|:--|
| `VPDV0108` | Política Comercial de **Descontos** |
| `VPDV0111` | Política Comercial de **Fretes** |

⚠️ **Uma política que exija aprovação bloqueia o orçamento automaticamente** quando as condições são atingidas. A turma precisa saber disso antes de operar o `VVND0300`.

---

### A3. Custo e precificação ⭐ (0:45–1:05 · 20 min)

> **Este é o momento em que os 4 dias se encontram.** Reserve tempo.

#### A ponte com o Dia 3 (3 min)

Abra a OF do dia anterior e mostre o **custo real apurado**. Depois abra `VPRO0300` e mostre o **custo padrão**.

🗣 *"Lembram dos apontamentos de ontem? É deles que sai esse custo. Agora dá pra ver a mágica: vocês vão vender sabendo a **margem real**, não no chute. Sem o custo do chão, precificar é apostar."*

#### `VCUS0100` — Custos (as entradas)

| Bloco | O que cadastra |
|:--|:--|
| **Custo/hora** por centro de trabalho | Alimenta a conversão da OF e o custo padrão |
| **Custo de compra** por item | Entrada de material |
| **Bases de alocação** | Critério de rateio |
| **Alocações de overhead** | Indiretos |
| **Rollup** | Recalcula o custo padrão de um item |

#### `VCST0202` — Precificação de Produtos ⭐

**3 grandes áreas:**

| Área | O que faz |
|:--|:--|
| **Tabelas & Preços** | Cria a tabela de venda (validade, formação, casas decimais, composição FOB/CIF, tolerâncias) e mantém os preços por item |
| **Formação de Preço** | Calcula o **preço sugerido** a partir de custo + margem/impostos (ou de uma política) e **gera preços em lote** (upsert + histórico) |
| **Políticas** | Cadastra as políticas de formação (fonte de custo, margem, impostos, comissão) |

**Fluxo operacional (três visões, alternadas pelos botões da barra superior)**

1. **Tabelas & Preços:** **Nova tabela** → **Descrição**, **validade**, **Formação**
   (`INFORMADO` = preço digitado · `FORMADO` = calculado), casas decimais e
   composição FOB/CIF → Salvar. Com a tabela selecionada, adicione os **preços
   por item** (item, preço, UM de estoque e de compra, situação).
2. **Políticas** *(faça antes se for usar formação automática)*: fonte de custo,
   **margem**, **impostos** e **comissão**. Evita digitar margem item a item.
3. **Formação de Preço:** tabela + item + **custo base** + **margem %** +
   **impostos %** (ou uma **política**) → devolve o **preço sugerido**; dá para
   **gerar em lote** para a tabela inteira. A margem obedece:
   ```
   Margem (%) = (Preço Venda − Custo) / Preço Venda × 100
   ```

⚠️ **Não existe aba "Precificações", "Revisões" nem "Dados Gerais" nesta tela, e
não há código `PR0001` gerado automaticamente.** Se a turma procurar "Nova
Revisão", não vai achar. O que controla a publicação do preço é a **validade da
tabela**, não um botão de fechar revisão.

🗣 **A fala que ancora o dia:**
> *"Repara na fórmula: margem sobre o **preço de venda**, não sobre o custo. Muita gente confunde markup com margem e vende achando que está ganhando 30% quando está ganhando 23%. O sistema calcula certo — só não deixem de olhar."*

💡 **`VCLI0600`** — Manutenção Avançada de Preços de Venda: ajuste em massa depois que a tabela está formada.

---

### A4. Orçamento → Pedido de Venda ⭐ (1:05–1:35 · 30 min)

#### `VVND0310` — Parâmetros de Orçamento (primeiro! 5 min)

> ⚠️ **Sem motivo de cancelamento cadastrado, o `VVND0300` não cancela nada** — nem o orçamento, nem itens.

**Aba Parâmetros**
Rótulos dos campos ("ordem de compra", "autorização de entrega") · **Cliente consumidor final** · **Padrão NFC-e** · **Itens de serviço na NFC-e** · **Frete CIF mínimo** · **Somar redespacho ao frete**.

**Aba Padrões de comissão**
Descrição + percentuais. ⭐ *O **código pode ficar em branco** (o sistema gera o próximo).*
⚠️ **Faturamento + pagamento têm de somar a comissão.**

**Aba Motivos de cancelamento**
⭐ **Indicador D** — permite **descancelamento**
⭐ **Indicador C** — **exige complemento** no cancelamento

⚠️ **Gravar com um código já existente atualiza** o registro. As listas mostram apenas registros **ativos**. A gravação é restrita a **ADMIN**.

#### `VVND0300` — Orçamento de Venda (12 min)

**Passo a passo**
1. **Novo orçamento** → **Cliente**, **Tipo** (`VENDA` / `NEGOCIACAO` / `CONSULTA` / `API_TERCEIROS` / `FOCCOPORTAL` / `IMPORTADO`), **Validade**, **Probabilidade %** → **Criar orçamento** (nasce como **Orçam. VentureERP / OV**).
   💡 *Estabelecimento em branco assume a empresa do login. Transportadora, tabela de preço e condição de pagamento em branco herdam o cadastro do cliente.*
2. Abra e adicione **itens**: item, quantidade, preço, desconto, **IPI**, **ST**, depósito, data de entrega.
   ⭐ *Os totais são recalculados a cada alteração e as **políticas comerciais são reavaliadas** — uma política que exija aprovação **bloqueia o orçamento automaticamente**.*
3. Ajuste a capa e clique em **Salvar capa**.
   ⚠️ **Enquanto houver alteração não salva, a troca de status e o bloqueio/liberação ficam travados.**
4. Quando aprovado → **Converter em pedido**. ⭐ *O sistema cria o pedido com o **saldo aberto** — pedido, itens, vínculo e evento gravados na **mesma transação**.*
5. Alternativas: **Atender** (encerra sem gerar pedido) · **Cancelar** (exige motivo) · **Descancelar** · **Gerar DAV**.

**As 4 abas**

| Aba | O que tem |
|:--|:--|
| **Dados gerais** | Identificação, condições, transporte, valores, observações, totais, **saldo aberto** e motivos de bloqueio/cancelamento/atendimento |
| **Itens** | Inclusão, edição (solicitada/atendida/cancelada, preço, descontos, IPI, ST) e cancelamento com motivo |
| **Anexos** | Documentos de até **10 MB** por arquivo |
| **Histórico** | Todos os eventos, do mais recente ao mais antigo |

⚠️ **As 6 regras que geram chamado de suporte:**
1. **Não emite NF-e** nem autoriza documento fiscal — **Venda NFC-e** apenas prepara a intenção fiscal.
2. **Conversão bloqueada** para orçamentos: cancelados, expirados, atendidos, tipo **CONSULTA**, bloqueados comercialmente, sem itens ou já convertidos.
3. **Cancelamento (de orçamento e de item) exige motivo cadastrado.** Motivos com "exige complemento" recusam complemento em branco.
4. **Descancelar só funciona com o mesmo motivo do cancelamento**, e apenas se esse motivo permitir — por isso a tela apresenta o motivo travado.
5. Depois de **Gerar DAV**, o orçamento libera **apenas o relatório DAV** — cupom fiscal, impressão de pedido e envio por e-mail ficam indisponíveis. A geração é **idempotente**.
6. **Status muda somente pela caixa "Alterar status"** — cancelar, atender e expirar têm ações próprias.

⭐ **Tipo de frete:** FOB / cortesia / retira / sem frete / terceiros **zeram frete e seguro**.
⭐ **Entrega com recibo** força **NFC-e** e **zera o IPI** dos itens novos.
⭐ Para usar condição de pagamento diferente da do cliente, a **divisão de vendas** (`VVND0100`) precisa estar marcada como **"permite condição livre"**.

💡 **Relatório:** consolida totais, retenções e **valor ponderado por probabilidade** da carteira filtrada. Listagem traz até **100 orçamentos por página**.

#### `VVND0200` — Pedido de Venda ⭐ (13 min)

**Passo a passo**
1. **Novo pedido:** **Empresa**, **Cliente**, **Moeda**, **Condição de pagamento** → **Criar pedido** (nasce **Rascunho / R**).
2. Abra e adicione **itens** (item, depósito, quantidade, preço, desconto). Os totais são calculados pelo sistema.
3. **Confirmar (→ P)**.
4. Se ficar bloqueado, use **Desbloquear** (após liberar o crédito).
5. **Faturado (F)** acontece **automaticamente** quando a NF-e de saída é autorizada.

### ⭐⭐ As 3 automações da confirmação — o conceito central do bloco A

Desenhe no quadro **antes** de clicar em Confirmar, e peça que a turma preveja o que vai acontecer:

```
                    CONFIRMAR (→P)
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
1. CHECAGEM DE      2. RESERVA DE      3. DEMANDA
   CRÉDITO             ESTOQUE (ATP)      INDEPENDENTE
   Estourou o          Cada linha         Gera, por item,
   limite ou           reserva o          a necessidade
   cliente             disponível no      que alimenta
   bloqueado?          depósito           o MRP
   → PEDIDO
     BLOQUEADO
```

⚠️ **Um pedido bloqueado NÃO gera demanda nem reserva.** Resolva o crédito primeiro.

🗣 **A fala que fecha a corrente — a mais importante do treinamento:**
> *"Repara no que acabou de acontecer no ponto 3. Esse pedido de venda é **exatamente a demanda** que o MRP do Dia 3 estava esperando. Ontem a gente criou a demanda na mão para vocês entenderem a mecânica. Hoje ela nasceu sozinha, de uma venda real. **A corrente se fecha aqui** — tudo que a gente planejou lá atrás nasce de um pedido como este."*

**Ciclo de status:**
```
Rascunho (R) ──confirmar──▶ Confirmado (P) ──NF-e autorizada──▶ Faturado (F)
                                  │
                            Bloqueado / Cancelado (libera reservas)
```

💡 **Filtros:** liste pedidos por **cliente** ou por **status**.

#### `VVND0600` — Análise, Atendimento e Conferência de Pedidos (3 min)

O **workflow comercial** do pedido: análise, atendimento e conferência antes da liberação.

#### `VPDV0200` — Pedido de Venda (visão formulário, 2 min)

Visão alternativa com carregamento automático de todos os parâmetros do cliente ao selecioná-lo.

---

### A5. Workflow, representantes e pós-venda (1:35–1:45 · 10 min)

#### Organização comercial

| Tela | O que faz |
|:--|:--|
| `VVND0100` | **Divisão de Vendas** — organização comercial; indicador de **"permite condição livre"** |
| `VVND0400` | **Representantes** — vendedores externos/internos, gerentes e prepostos, com documento, território e comissão |
| `VVND0500` | **Metas de Vendas** |
| `VREP0600` | Complementos do Representante |

#### Acompanhamento

| Tela | O que faz |
|:--|:--|
| `VENT0100` | Consulta de Pedido de Venda |
| `VPDV0253` | Console de Acompanhamento de Pedidos |
| `VEXR0100` | **Reprogramação de Entrega** — histórico de remarcações por pedido |
| `VDPR0100` | Promessa de Entrega — **ocupação diária**, **reserva comercial de capacidade**, expiração e **reprogramação em lote** |

⚠️ **`VDPR0100`:** a reserva **não vira pedido nem demanda de MRP** — é só compromisso de capacidade. Na reprogramação em lote, **pedidos e itens com data firme são ignorados**.

#### Venda recorrente

| Tela | O que faz |
|:--|:--|
| `VVRE0200` | Console de Vendas Recorrentes |
| `VVND0610` | Reajuste de Venda Recorrente |

#### Pós-venda (mostrar onde fica, 3 min)

| Tela | O que faz |
|:--|:--|
| `VASS0201` / `VASS0402` | Cadastro e consulta de **chamado de assistência técnica** |
| `VATC0280` / `VATC0380` / `VATC0480` | Cadastro, relatório e consulta de **chamados** |
| `VGAR0211` | **Devoluções** de atendimento e garantia |
| `VSAC0100` / `VSAC0200` | **SAC** + relatórios, etiquetas e anexos |

⭐ **Ciclo do chamado:**
```
PENDENTE → EM_ANALISE → AGUARDANDO_RETORNO / AGUARDANDO_PEDIDO → ATENDIDO → ENCERRADO
                                                              (ou CANCELADO)
```
⭐ Cada item calcula automaticamente `warranty_until` / `in_warranty` a partir da **data da NF de compra + dias de garantia** (que veio do cadastro do item, no Dia 1).
⭐ O chamado numera **por empresa**.

⚠️ Só funcionários com a flag **Assistente Técnico** (`VFUN0100`, Dia 1) podem ser designados como técnico executor.

🗣 *"Repara como o Dia 1 volta: a garantia em dias que vocês cadastraram no item é o que o sistema usa aqui pra saber se o chamado está na garantia ou não."*

---

## 7. Bloco B — Faturar e receber (2:00–3:15)

### Transição (1 min)

🗣 *"Pedido aprovado e produto pronto. Agora vem a parte que o fisco e o caixa cobram: **separar e despachar**, **emitir a nota** e **receber o dinheiro**."*

---

### B1. Expedição / Romaneio (2:00–2:12 · 12 min)

#### `VEXP0100` — Romaneio

**O que é:** documento **logístico** de saída (*packing list* / *delivery note*). Atende pedidos de **venda**, **compra** (devolução) e **produção**.

**Passo a passo**
1. ⭐ **Auto-fill:** informe o código do **pedido de venda** → **Gerar**. O romaneio nasce **Aberto** já com os itens do pedido.
2. **Separar (reserva):** reserva o estoque dos itens (`ABERTO → SEPARADO`).
3. **Conferir itens:** registre a quantidade conferida de cada item. ⚠️ *Sobra/falta gera **divergência** (⚠️), que **bloqueia o despacho** salvo aceite explícito.*
4. **Conferir romaneio** (exige **todos** os itens conferidos): `SEPARADO → CONFERIDO`.
5. **Packing:** adicione **volumes** (espécie: Caixa, Pallet, Fardo… com peso e dimensões — ⭐ *a cubagem é calculada de L×A×C*).
6. **Transporte:** modalidade de frete (CIF/FOB…), valor, placa, motorista, **ANTT**, lacres e previsão de entrega.
7. Emita a **NF-e de saída** e **Vincule a NF-e** ao romaneio.
8. **Despachar** (`CONFERIDO → DESPACHADO`): consome as reservas. Se houver divergência, marque **aceitar divergência**.
9. **Exporte** em **PDF** ou **Excel**.

**Ciclo de vida**
```
ABERTO ──separar──► SEPARADO ──conferir──► CONFERIDO ──despachar──► DESPACHADO
  │  (reserva)         │  (todos itens)        │  (sem divergência
  └──────────────── CANCELADO (libera reservas) ─────── ou aceite)
```

### ⭐⭐ A frase que resolve a maior confusão do dia

> ## **O romaneio RESERVA; a NF-e BAIXA.**
>
> A reserva **reduz o disponível (ATP)**; o físico só cai na **autorização da NF-e de saída**.

🗣 *"Isso confunde muita gente. Você separou 100 peças, o ATP caiu 100, mas o saldo físico continua 100. Ele só cai quando a nota é autorizada. Faz sentido: até a nota sair, a mercadoria ainda é sua."*

💡 A **trilha de auditoria** registra cada transição (Criado, Separado, Conferido, Despachado, Cancelado, NF-e vinculada).

#### Carga física (mostrar, 3 min)

| Tela | O que faz |
|:--|:--|
| `VEXP0110` | **Gestão de Cargas** — agrupa um ou mais romaneios. ⚠️ *O código legado `VPLC0200` abre esta mesma rotina* |
| `VEXP0120` | **Instruções e Caixas de Despacho**. ⚠️ *O código legado `VPLC0211` abre esta rotina* |

**Ciclo obrigatório da carga:**
```
ABERTO → LIBERADO → EM_CARREGAMENTO → CARREGADO → DESPACHADO
```

⚠️ **Antes de criar a carga, conclua separação e conferência dos romaneios.**
⚠️ **Remover o vínculo não cancela nem exclui o romaneio.**
⚠️ **Não despache antes da autorização fiscal** e da conferência do responsável.
⚠️ **Erro 422** = transição inválida, romaneio/nota incompatível ou dado obrigatório ausente — **recarregue a carga antes de tentar de novo**.
⚠️ **Um despacho confirmado não deve ser repetido após timeout** sem antes consultar a situação atual.

💡 A **caixa** (`VEXP0120`) representa uma **posição/doca operacional**, **não** um volume de `VEXP0100`.

---

### B2. Fiscal — NF-e de Saída ⭐ (2:12–2:45 · 33 min)

> **Bloco mais denso do treinamento.** Comece desmistificando.

#### Abertura (2 min)

🗣 *"Fiscal assusta, mas 90% do trabalho pesado o sistema já faz: a tributação vem das tabelas, o CFOP vem da natureza da operação, os valores vêm do pedido. Seu papel é **conferir e transmitir**. E nota rejeitada não é o fim do mundo — o sistema diz o motivo e você corrige."*

#### A base fiscal (8 min)

**`VFIS0100` — Configuração Fiscal** (a fundação)

| Seção | O que tem |
|:--|:--|
| **Emitente** | CNPJ (validação módulo 11 em tempo real ✓/✗) · Razão Social · IE · ⭐ **Regime Tributário** (`1` Simples · `2` Lucro Presumido · `3` Lucro Real) · UF · Telefone |
| **Endereço** | Logradouro, número, complemento, bairro, município, **Cód. IBGE (7 dígitos)**, CEP — ⚠️ **obrigatório para autorizar NF-e na SEFAZ** |
| **Focus NF-e** | ⭐ **Token** (obrigatório) · ⭐ **Ambiente** (`Homologação` / `Produção`) |
| **Tributação & Vencimentos** | ICMS interno · Diferimento ICMS · Juros ao mês · Multa atraso — todos em **ratio** (`0,12` = 12%) · Dia de vencimento de ICMS, IPI e PIS/COFINS |
| **Identidade visual** | Logo **PNG/JPEG até 2 MB** · **Cor da marca** `#RRGGBB` |

⚠️ **O Token Focus NF-e é dado sensível** — armazenado com criptografia, nunca incluído em logs ou exportações.
⚠️ **Salvar identidade** (logo/cor) é **independente** de **Salvar Configuração**.
⚠️ O **Preview persistido** é baixado do backend — ele confirma o que está **no banco**, não uma prévia local.
⚠️ **Não feche a tela durante "Enviando...".** Após timeout, recarregue e confira o preview antes de repetir.
⚠️ O rodapé mostra **regime tributário** e **ambiente ativo** — use isso como conferência rápida.

🗣 **Sobre o regime tributário:** *"Esse campo é praticamente imutável na operação. Simples Nacional apura na `VFIS0340`; os demais usam a apuração detalhada por tributo. Mudar isso depois exige reconfigurar toda a lógica."*

**`VFIS0110` — Tabelas Tributárias** (3 abas)

| Aba | Chave | O que cadastra |
|:--|:--|:--|
| **NCM** | NCM de 8 dígitos (⚠️ **imutável**) | Alíquotas de IPI, PIS, COFINS + **CSTs**. Padrões sugeridos: PIS `0,0165` · COFINS `0,076` (cumulativo) |
| **ICMS Interno** | UF (2 caracteres) | Alíquota interna (ex.: `0,18` = 18%) + **FCP** |
| **ICMS Interestadual** | UF origem + UF destino | Alíquota conforme CONFAZ |

⭐ **Alíquotas interestaduais padrão (CONFAZ):**
```
7%   Sul/Sudeste (exceto ES)  →  Norte, Nordeste, Centro-Oeste e ES
12%  Entre estados das mesmas regiões, ou casos não cobertos pela regra acima
4%   Operações interestaduais com PRODUTOS IMPORTADOS
```

### ⭐⭐ A hierarquia de busca de alíquotas — escreva no quadro

```
1º  VFIS0350  Classificações Fiscais       ← PRECEDÊNCIA MÁXIMA
2º  VFIS0320  Parâmetros ICMS/IPI          (por UF + NCM + Operação)
3º  VFIS0330  Redução/Substituição/Diferimento
4º  VFIS0110  Tabelas Tributárias          ← FALLBACK
5º  VFIS0100  Alíquotas padrão             ← último recurso
```

🗣 *"Quando a alíquota vier 'errada' na nota, é essa hierarquia que vocês vão percorrer, de cima para baixo, para descobrir de onde veio o número. Guardem essa escada."*

**Demonstração obrigatória — herança fiscal do item (5 min)**

1. Abra `VFIS0350` e mostre vigência, origem, ICMS, unidades e o padrão de PIS/COFINS.
2. Abra `VENT0200` → Contábil e associe os mestres de Compra e Venda.
3. Mostre as três opções de PIS/COFINS: **Herdar**, **Sobrescrever: Sim** e **Sobrescrever: Não**.
4. Explique que `HERDADO` acompanha o mestre vigente e `SOBRESCRITO` preserva a decisão do item.

🗣 *"Campo ausente não quer dizer Não. Ausente quer dizer: siga o mestre. O Não explícito é uma sobrescrita e continuará Não mesmo que o padrão da classificação mude."*

✅ **Verificação:** alterne entre os três estados e peça à turma para dizer qual
origem deve aparecer. Reforce que compra e venda podem usar mestres diferentes.

**`VFIS0300` — CFOPs / Naturezas de Operação**

| Campo | Opções |
|:--|:--|
| **Código** | 4 dígitos — ⚠️ **imutável após criação** |
| **Descrição** | Conforme tabela oficial |
| **Utilização** | `INDUSTRIALIZACAO_COMERCIO` / `IMOBILIZADO` / `USO_CONSUMO` |
| **Ind. Operação** | `NORMAL` / `ENERGIA_ELETRICA` / `TELECOMUNICACAO` |
| **Tipo Utilização** | `NORMAL` / `VENDA_COMERCIAL_EXPORTADORA` / `COMPRA_FIM_ESPECIFICO_EXPORTACAO` / `EXPORTACAO` |
| ⭐ **DIFAL** | Toggle — habilita Diferencial de Alíquota em operações interestaduais para **consumidor final não-contribuinte** |
| **Doação** | Toggle — tratamento fiscal específico |

⚠️ **O código do CFOP é imutável** — CFOPs referenciados por NF-es emitidas não podem ter o código alterado sem invalidar o histórico.
⭐ **Ative DIFAL** para CFOPs de venda interestadual a consumidor final não-contribuinte (ex.: `6108`, `6109`).
💡 As classificações são usadas na **apuração de ICMS** (`VFIS0530`/`VFIS0540`), no **SPED Fiscal** (registros C190/C195) e no **cálculo de DIFAL**.

#### `VFIS0200` — NF-e de Saída ⭐ (18 min) — *a demo mais importante do dia*

**Pré-requisitos:** `VFIS0100` (token, CNPJ, regime, endereço) · `VFIS0110` (NCMs e ICMS) · `VFIS0300` (CFOPs) · `VFIS0350` (opcional) · `VCLI0500` (destinatário).

**Passo a passo**

**1. Listagem** — pills coloridos por status:
```
🟢 verde   = Autorizada      🔵 azul     = Processando
🔴 vermelho = Cancelada      ⚪ cinza    = Rascunho
🟠 âmbar   = Rejeitada
```

**2. + Nova NF-e** → **Cabeçalho**

| Campo | Obrig. | Observação |
|:--|:-:|:--|
| **Número NF** / **Série** | ✅ | |
| **CFOP** (4 dígitos) | ✅ | Da `VFIS0300` |
| **Emissão** / **Saída** | ✅ | |
| **Pessoa** | ✅ | `J` (Jurídica) / `F` (Física) |
| **CNPJ/CPF Destinatário** | ✅ | ⭐ Validação em tempo real |
| **Razão Social Destinatário** | ✅ | |
| **IE Destinatário** | | ⭐ Para não-contribuintes, preencher **`ISENTO`** |
| ⭐ **UF Destino** | ✅ | **Determina se a operação é interna ou interestadual** |
| **Natureza da Operação** | ✅ | Herdada do CFOP, **editável** |
| Frete / Seguro / Desconto | | Valores acessórios |

**3. Itens** (tabela inline)

Seq (auto) · **Cód. Item** · ⭐ **NCM (8 dígitos)** · **CFOP do item** (pode divergir do cabeçalho) · **Origem** (`0` Nacional a `8` Importação > 70%) · **Descrição** · **Qtd** (> 0) · **Unit.** (> 0) · Total (auto).

⭐ **Ao informar o NCM, o sistema busca automaticamente as alíquotas** da `VFIS0110` e `VFIS0350`.

**4. Criar Rascunho** — o sistema:
- Valida obrigatórios (número, CNPJ/CPF, UF destino, **NCM e CFOP de cada item**)
- ⭐ **Calcula automaticamente ICMS, IPI, PIS e COFINS** seguindo a hierarquia
- Exibe os valores calculados e o **Valor Total**
- Grava com status **Rascunho** (editável)

**5. Autorizar** — o sistema:
- Monta o **XML no leiaute oficial NFe 4.00**
- Envia à API Focus NF-e → SEFAZ
- Status → **Processando** (azul)
- ✅ Autorizada → **protocolo** + ⭐ **chave de acesso de 44 dígitos**
- ❌ Rejeitada → **motivo da SEFAZ exibido para correção**

**6. Cancelamento** — justificativa de ⭐ **mínimo 15 caracteres**.
**7. CC-e (Carta de Correção)** — texto de ⭐ **mínimo 15 caracteres**.
**8. Status** — consulta a situação atual na SEFAZ.

### ⚠️ Os 3 avisos que evitam o erro mais caro do dia

**1. UF de Destino é crítica**
```
UF destino == UF do emitente  →  operação INTERNA       →  ICMS interno
UF destino != UF do emitente  →  operação INTERESTADUAL →  alíquota interestadual + DIFAL quando aplicável
```

**2. Prazo de cancelamento**
> O cancelamento está sujeito ao prazo regulamentar (**geralmente 24 horas** da autorização). **O sistema não bloqueia por prazo, mas a SEFAZ pode rejeitar.**

**3. O que a CC-e PODE e NÃO PODE corrigir**

| ✅ Pode corrigir | ❌ Não pode |
|:--|:--|
| Natureza da operação | **CFOP** |
| Descrições | **Valores fiscais** |
| Dados do transportador | **CNPJ/CPF** |
| Outros campos que não afetam imposto nem identidade das partes | **Datas** |

> Para esses casos: **cancelamento + nova NF-e**.

🗣 **Fala sobre nota rejeitada:**
> *"Nota rejeitada **trava o faturamento e a entrega**. É o erro mais caro do dia. Mas repara: o sistema mostra o motivo da SEFAZ em texto. Leiam o motivo — ele quase sempre aponta um campo específico. NCM faltando, IBGE errado, IE inválida. É conserto de cinco minutos se você ler."*

#### Emissão complementar (5 min)

| Tela | O que faz | Atenção |
|:--|:--|:--|
| `VFIS0210` | **NF-e de Entrada** — 3 modos: manual · **importação por chave de 44 dígitos** · upload de XML | ⭐ **Aprovar gera automaticamente conta a pagar** no `VFIN0200` e registra créditos tributários |
| `VFIS0640` | **Faturamento Fiscal de Carga e DANFE** — transforma carga expedida em NF-e | ⚠️ **Não gere duas saídas para a mesma carga.** Em timeout, consulte a lista fiscal antes de repetir. **Consultar DANFE** retorna URLs de DANFE e XML — abra **somente os endereços retornados** |
| `VFIS0610` | Importação de NF-e de compra **por chave** | ⚠️ Execute **uma única vez**. Antes de repetir após timeout, **procure a chave nas entradas fiscais** |
| `VFIS0620` | **Manifestação do Destinatário** e **Inutilização** | ⚠️ **Não manifeste desconhecimento antes de conferir** CNPJ, fornecedor e escrituração. Na inutilização, confirme que **nenhum número da faixa foi usado** — e **não reutilize a faixa** depois |
| `VFIS0220` / `VIMP0102` | **CT-e** (Conhecimento de Transporte) | |
| `VNFS0100` | **NFS-e** (Nota Fiscal de Serviço) | |

🗣 **`VFIS0210` — a ponte com o Dia 2:** *"Lembram do pedido de compra que vocês fizeram? Quando a nota do fornecedor entra aqui e é aprovada, o sistema cria a conta a pagar **sozinho**. Ninguém digita título a pagar duas vezes num ERP bem operado."*

---

### B3. Financeiro — receber e pagar ⭐ (2:45–3:05 · 20 min)

#### A base (3 min)

| Tela | O que cadastra | Atenção |
|:--|:--|:--|
| `VFIN0100` | **Contas Bancárias** — banco, agência, conta, dígito, titular, **saldo inicial**, **chave PIX** | ⚠️ **A tela não tem edição nem exclusão** de contas já cadastradas |
| `VFIN0110` | **Condições de Pagamento** — nome + dias separados por vírgula | ⭐ `0` = à vista · `30,60,90` = três parcelas. ⚠️ **Não há validação de ordenação** — informe em ordem crescente |
| `VFIN0120` | **Plano de Contas** — notação hierárquica com pontos (`3.1.01`) | ⭐ O **nível é calculado automaticamente** pelo número de segmentos. Base do relatório **R05 (DRE)** |
| `VFIN0130` / `VCTB0102` | **Centros de Custo** | `PRODUTIVO` / `ADMINISTRATIVO` / `COMERCIAL` / `AUXILIAR` |

#### `VFIN0210` — Contas a Receber (7 min)

**O título que a venda gerou.**

**Criação**
Nº Documento ✅ · Cliente (ID) · **NF Saída (ID)** · Forma de Pagamento (padrão `boleto`) · **Valor Bruto** ✅ · **Emissão** ✅ · **Vencimento** ✅ · Desconto · Parc. nº / Parc. tot. · Observação → **Salvar** (status **pendente**).

**Baixa (recebimento)**
1. Localize um título **pendente** (âmbar) ou **parcial** (azul) → **Baixar**.
2. **Conta Bancária** ✅ · **Valor Recebido** ✅ · **Data Recebimento** ✅ · Observação.
3. **Confirmar Baixa**.

⭐ **Status:** `pendente` (âmbar) → `parcial` (azul) → `pago` (verde) · `cancelado` (vermelho)
⭐ **Sem fluxo de aprovação** — diferente do Contas a Pagar.
⭐ **Recebimento parcial é nativo** — o hint mostra o **saldo restante**.

**Dashboard de aging** — faixas vindas do backend: **Vencido** · **7** · **15** · **30** · **60 dias** · **Acima de 60 dias** + **Total**.
⚠️ *Os cartões são **informativos** — para filtrar a tabela, use o **seletor de status** da barra.*
⚠️ *Só aparecem as faixas que **têm título** no período.*

#### `VFIN0200` — Contas a Pagar (5 min)

**O título que a compra do Dia 2 gerou.**

⭐ **INTEGRAÇÃO CRÍTICA:** aprovar uma **NF-e de Entrada** no `VFIS0210` **gera automaticamente** uma conta a pagar aqui.

**Ciclo — diferente do Receber:**
```
pendente (âmbar) ──aprovar──▶ aprovado (azul) ──baixar──▶ pago (verde)
       │                            │
       └──rejeitar (com motivo)──▶ cancelado (vermelho) ◀──cancelar──┘
```

⚠️ **A rejeição solicita um motivo** (ex.: "Documento duplicado", "Valor divergente da NF-e") e o título vai para **cancelado**.
⚠️ **Só título aprovado pode ser baixado.**
⚠️ **Cancelamento não tem desfazer.**

**Campos de rateio (opcionais mas importantes):** **Plano Contas (ID)** e **Centro Custo (ID)**.

🗣 *"Repara na assimetria: pagar tem aprovação, receber não. Faz sentido — você quer um segundo olhar antes de tirar dinheiro do caixa, não antes de colocar."*

#### `VFIN0300` — Fluxo de Caixa e Saldos ⭐ (5 min)

Tela **exclusivamente consultiva** — 3 abas.

| Aba | Parâmetros | O que mostra |
|:--|:--|:--|
| **Realizado** | Início **e** Fim | **Entradas** (verde) · **Saídas** (vermelho) · **Saldo** (entradas − saídas) + tabela cronológica com **Conciliação** (Sim/Não) |
| **Projetado** | Apenas Início | Vencimento, tipo, descrição e valor dos **lançamentos futuros previstos** |
| **Saldos das Contas** | — | Quantidade de contas + **saldo total somado** + saldo atual de cada conta |

⚠️ **Os títulos precisam ter sido baixados** (pagos/recebidos) para aparecerem na aba **Realizado**.
⭐ Os saldos = **saldo inicial** do `VFIN0100` + **todas as baixas** registradas.
⚠️ A aba **Projetado não tem conciliação** — são previsões.

🗣 **A fala que fecha a corrente:**
> *"Olha o que aconteceu: a **venda** virou **nota**, a nota virou **título a receber**, e o título entra no **fluxo de caixa**. A **compra** do Dia 2 virou **título a pagar**. O caixa é o **espelho** de tudo que a fábrica fez — e agora vocês sabem ler esse espelho."*

---

### B4. Apuração, conciliação, SPED e contabilidade (3:05–3:15 · 10 min)

#### `VFIN0400` — Apuração de Impostos (3 min)

Apuração de **ICMS, IPI, PIS e COFINS** por **competência mensal** (`AAAA-MM`).

```
NF-e de ENTRADA (VFIS0210)  →  CRÉDITOS
NF-e de SAÍDA   (VFIS0200)  →  DÉBITOS
                    ↓
          Saldo a recolher (positivo, VERMELHO)
                    ou
          Crédito acumulado (negativo, VERDE)
```

🗣 *"Saldo negativo em verde não é erro — significa que a empresa acumulou mais créditos do que débitos no período. É crédito que pode ser compensado em períodos futuros."*

#### `VFIN0620` — Conciliação Bancária por OFX (2 min)

1. **Importar arquivo OFX** → informe o **ID da conta bancária**.
   ⚠️ *Compare banco, agência e conta com o cabeçalho do arquivo — **para não conciliar na conta errada**.*
2. Escolha o `.ofx` **original exportado pelo banco**.
   ⚠️ **Não converta PDF, CSV ou planilha mudando apenas a extensão.**
3. **Importar** e confira: movimentos **lidos**, **conciliados**, **criados** e **ignorados**.
4. Abra o fluxo em `VFIN0300` e valide datas, sinais de débito/crédito, valores e saldo.
   ⚠️ *Uma reimportação deve ser **conferida quanto a duplicidades**.*

#### `VFIN0610` — Remessa Bancária CNAB 240 (1 min)

Gera o arquivo `.rem` a partir do **convênio bancário real** e dos títulos.

⚠️ **Não reutilize uma sequência de arquivo já aceita pelo banco.**
⚠️ **Valide no validador/homologador do banco antes de transmitir** — gerar o arquivo **não significa** que o banco registrou os títulos.

#### `VFIN0600` — Adiantamentos (1 min)

Tipo `PAGAR` (adiantamento a fornecedor) ou `RECEBER` (valor antecipado de cliente).

⚠️ **`PAGAR` não pode ser aplicado em conta a receber**, nem `RECEBER` em conta a pagar.
⚠️ **Valor zero, negativo ou superior ao saldo é recusado.**
⚠️ **A aplicação é operação financeira efetiva e não possui exclusão** nesta rotina.

#### SPED e contabilidade (3 min)

| Tela | O que gera | Atenção |
|:--|:--|:--|
| `VFIS0600` | **SPED EFD ICMS/IPI** → `SPED_EFD_ICMS_IPI.txt` | ⚠️ **Valide no PVA antes de transmitir.** A geração **não equivale à entrega** à Receita |
| `VCTB0600` | **SPED ECD** → `SPED_ECD.txt` | ⚠️ **Feche o período contábil antes.** A geração **não corrige inconsistências contábeis**. ⚠️ A criação do TXT **não representa assinatura nem transmissão** |
| `VCTB0200` | Contabilidade SPED ECD — lançamentos por partidas dobradas, balancete | |
| `VFIN0500` | **Relatórios Fiscais e Financeiros** (R01–R18) | R05 = DRE · R09/R10 = Aging Receber/Pagar · R11/R12 = Extrato por Fornecedor/Cliente |
| `VFIS0340` | Apuração do **Simples Nacional** | Só relevante se o regime for Simples |
| `VFIS0530` / `VFIS0540` | Linhas de Apuração (Bloco E) e Lançamentos Resumo de ICMS | |
| `VFIS0630` | **Tabela IBPT** — carga tributária aproximada (Lei da Transparência) | ⚠️ Importe o **CSV oficial vigente**, separado por **ponto e vírgula**; só **ADMIN** importa |

⚠️ *Relatórios que processam grandes volumes (R01–R04, R09–R10, R17–R18) **demoram** — aguarde a conclusão antes de trocar de relatório.*

## 8. Dinâmica de fixação + gabarito

### "Do pedido ao recebimento" (30 min)

**Formato:** duplas · **Entregável:** NF-e emitida + título a receber + impacto no caixa

#### Setup (3 min)

Cada dupla vende o **suporte soldado** produzido nos dias anteriores.

#### Tarefa cronometrada (20 min)

| # | Passo | Tela | Ponto de controle |
|:-:|:--|:--|:--|
| 1 | Conferir/criar os **apoios de cliente** | `VCLI0510`/`0520`/`0530` | Região, condição e tipo de NF existem |
| 2 | Cadastrar o **cliente** com dados fiscais e **limite de crédito** | `VCLI0500` | CNPJ ✓, endereço, limite |
| 3 | Formar o **preço** com margem | `VCST0202` | Margem % calculada |
| 4 | Conferir os **motivos de cancelamento** | `VVND0310` | ≥ 1 motivo ativo |
| 5 | Criar **orçamento** e **converter em pedido** | `VVND0300` | Pedido criado com saldo aberto |
| 6 | **Confirmar** o pedido | `VVND0200` | Status `P` (ou bloqueado) |
| 7 | Observar as **3 automações** | `VVND0200` / `VEST0100` | ATP reduzido |
| 8 | Gerar o **romaneio** e levá-lo até `CONFERIDO` | `VEXP0100` | Itens conferidos |
| 9 | **Emitir a NF-e de saída** (rascunho) | `VFIS0200` | Impostos calculados |
| 10 | **Autorizar** na SEFAZ (homologação) | `VFIS0200` | Status `Autorizada` + chave 44 dígitos |
| 11 | **Vincular a NF-e** ao romaneio e **despachar** | `VEXP0100` | Status `DESPACHADO` |
| 12 | Localizar o **título a receber** | `VFIN0210` | Título pendente |
| 13 | **Baixar parcialmente** o título | `VFIN0210` | Status `parcial` |
| 14 | Ler o **fluxo de caixa** (3 abas) | `VFIN0300` | Entradas/saídas/saldo |
| 15 | Localizar o **título a pagar** do Dia 2 | `VFIN0200` | Título da compra |
| 16 | Ler a **apuração de impostos** | `VFIN0400` | Débito × crédito |

#### Gabarito para o instrutor validar

- [ ] Cliente salvo com **CNPJ válido**, endereço e **limite de crédito** definido
- [ ] Precificação com **revisão fechada** e margem % coerente
- [ ] Orçamento **convertido** em pedido (evento no Histórico)
- [ ] Pedido **Confirmado (P)** — ou bloqueado, com o bloqueio compreendido
- [ ] **ATP reduzido** em `VEST0100` (prova da reserva)
- [ ] Romaneio em **`CONFERIDO`** ou **`DESPACHADO`**
- [ ] NF-e com status **`Autorizada`** e **chave de 44 dígitos**
- [ ] Impostos calculados ≠ 0 (ICMS, IPI, PIS, COFINS)
- [ ] Título a receber **localizado** e **baixado** (total ou parcial)
- [ ] **Fluxo de caixa** mostrando a entrada
- [ ] Apuração de impostos lida

#### Erros que vão aparecer (e o que dizer)

| Erro observado | Diagnóstico | Como corrigir |
|:--|:--|:--|
| Cliente não salva | Filial sem matriz, ou apoio faltando | `VCLI0510`/`0520`/`0530` |
| CNPJ com ✗ | Dígito verificador inválido | Conferir o número |
| Orçamento não cancela | **Sem motivo cadastrado** | `VVND0310` |
| Orçamento não converte | Cancelado, expirado, atendido, tipo `CONSULTA`, bloqueado, sem itens ou já convertido | Ver a lista de bloqueios |
| Não consegue trocar status do orçamento | **Há alteração não salva na capa** | **Salvar capa** primeiro |
| Pedido fica **bloqueado** ao confirmar | **Crédito** estourado ou cliente bloqueado | Liberar crédito → **Desbloquear** |
| Pedido confirmado mas **sem demanda no MRP** | Está **bloqueado** — bloqueado não gera demanda nem reserva | Desbloquear |
| Item recusado no pedido | Regra de **restrição de venda** | `VCLI0117` |
| Romaneio não despacha | **Divergência** sem aceite, ou itens não conferidos | Conferir todos + aceitar divergência |
| NF-e **rejeitada** | Ler o **motivo da SEFAZ** | Quase sempre NCM, IBGE, IE ou CFOP |
| NF-e sem imposto calculado | NCM ausente ou sem alíquota cadastrada | `VFIS0110` |
| ICMS "errado" | Percorrer a **hierarquia** de alíquotas | `VFIS0350` → `0320` → `0330` → `0110` → `0100` |
| Não consegue autorizar | **Token Focus ausente** ou endereço do emitente incompleto | `VFIS0100` |
| Cancelamento rejeitado | **Fora do prazo** regulamentar (≈24h) | Emitir nota de devolução |
| CC-e rejeitada | Tentou corrigir CFOP/valor/CNPJ/data | Só cancelamento + nova NF-e resolve |
| Justificativa recusada | **Mínimo 15 caracteres** | Escrever mais |
| Título a receber não apareceu | Vincular manualmente pelo **NF Saída (ID)** | `VFIN0210` |
| Título a pagar não pode ser baixado | Está **pendente** — falta **aprovar** | `VFIN0200` |
| Fluxo de caixa vazio na aba Realizado | **Títulos não foram baixados** | Baixar primeiro |
| Saldo negativo em verde na apuração | **Crédito acumulado** — comportamento correto | Nada a fazer |

#### Validação e correção (5 min)

Passe de máquina em máquina com o gabarito acima. Para cada dupla, marque o que ficou 🟢/🟡/🔴 e **corrija na hora** o que estiver errado — o erro corrigido na frente da pessoa fixa mais do que o acerto de primeira.

---

## 9. Encerramento do treinamento

### 9.1 A corrente inteira, em uma tela (3 min)

Abra o `VFIN0300` e mostre a entrada gerada pela venda. Depois volte, tela a tela, contando a história ao contrário:

```
Esse dinheiro veio deste título (VFIN0210)
   ← que veio desta nota (VFIS0200)
      ← que veio deste pedido (VVND0200)
         ← que consumiu este produto (VPRO0900)
            ← que foi planejado aqui (VMRP0100)
               ← com este material (VEST0100)
                  ← comprado aqui (VSUP0200)
                     ← deste item, com esta receita (VENT0200 + VENT0210)
```

### 9.2 A fala de encerramento

🗣 *"Vocês percorreram a corrente inteira: cadastraram o produto, compraram o material, planejaram, produziram, venderam, faturaram e receberam. O mesmo **suporte soldado** que nasceu como uma ficha no Dia 1 virou **dinheiro no caixa** hoje. É assim que o sistema conversa de ponta a ponta — e é assim que vocês vão operar a partir de amanhã."*

### 9.3 O que entregar (3 min)

- [ ] **Checklist consolidado dos 4 dias**
- [ ] **Cartão com os códigos do fluxo troncal** de cada setor
- [ ] **Apostilas dos 4 dias**
- [ ] **Canal de suporte pós-treinamento** + SLA de resposta
- [ ] **Agenda de acompanhamento**: sugestão de retorno em 15 e 30 dias

### 9.4 Avaliação de reação (2 min)

Pergunte e anote:
1. O que ficou **mais claro** nesses 4 dias?
2. O que ainda está **confuso**?
3. Qual tela vocês vão abrir **amanhã de manhã**?

> A resposta da pergunta 3 é a melhor métrica de sucesso do treinamento.

---

## 10. Troubleshooting

### Erros específicos do Dia 4

| Sintoma | Causa provável | Solução |
|:--|:--|:--|
| Cliente filial não salva | **Matriz não cadastrada** | Cadastrar a matriz primeiro |
| Condição de pagamento não aparece | **Visibilidade = Somente Vinculados** | Ajustar no cliente |
| Alterei a tabela de venda e o pedido não mudou | **Pedidos já criados não são afetados** | Comportamento correto |
| Item bloqueado no pedido | Regra de **restrição** (restrições prevalecem sobre permissões) | `VCLI0117` |
| Frete diferente do esperado | Faixas **sobrepostas** em `VCLI0202` | Usar faixas contíguas |
| Não consigo editar itens da precificação | **Revisão está Fechada** | Criar nova revisão |
| Margem parece baixa | Margem é sobre o **preço de venda**, não sobre o custo | Comportamento correto |
| Orçamento bloqueou sozinho | **Política comercial** exige aprovação | `VPDV0108` / `VPDV0111` |
| Não consigo descancelar | Motivo **não permite** (Indicador D desligado), ou motivo diferente | Ver `VVND0310` |
| DAV gerado travou o cupom fiscal | Comportamento esperado — após DAV, só o relatório DAV fica disponível | — |
| Condição de pagamento livre recusada | Divisão de vendas sem **"permite condição livre"** | `VVND0100` |
| Pedido confirmado sem reservar | Está **bloqueado** | Desbloquear |
| Romaneio não separa | Sem **saldo/ATP** | `VEST0100` |
| ATP caiu mas o saldo físico não | ⭐ **Correto** — o romaneio reserva, a NF-e baixa | — |
| Carga com erro 422 | Transição inválida, romaneio/nota incompatível ou dado ausente | **Recarregar a carga** antes de tentar de novo |
| NF-e rejeitada — motivo genérico | Falta NCM, IBGE, IE ou CFOP | Ler o texto da SEFAZ |
| Alíquota "errada" na nota | Hierarquia de busca | `VFIS0350` → `0320` → `0330` → `0110` → `0100` |
| Token Focus não funciona | Ambiente errado, ou token de outro ambiente | `VFIS0100` |
| Logo fiscal não salva | > 2 MB, arquivo corrompido, ou não é PNG/JPEG | Corrigir o arquivo |
| DANFE indisponível | Nota **ainda não autorizada**, rejeitada, ou integração sem documento | Conferir status |
| Inutilização recusada | **Faixa já utilizada** | Conferir o sequencial fiscal |
| Conta a pagar não aparece após NF-e | A NF-e de entrada **não foi aprovada** | `VFIS0210` |
| Não consigo editar uma conta bancária | ⚠️ A tela **não tem edição nem exclusão** | Cadastrar novo registro |
| Parcelas na ordem errada | ⚠️ **Não há validação de ordenação** em `VFIN0110` | Informar em ordem crescente |
| Conciliação OFX conciliou errado | **Conta bancária errada** informada | Comparar com o cabeçalho do arquivo |
| Remessa CNAB rejeitada pelo banco | Sequência reutilizada, ou dados do convênio incorretos | Validar no homologador do banco |
| SPED rejeitado no PVA | Período não fechado, lançamentos não balanceados, cadastro incompleto | Corrigir a **origem**, não o arquivo |
| Relatório demora muito | Volume grande (R01–R04, R09–R10, R17–R18) | Aguardar; **não trocar de relatório** |

### Códigos de erro (revisão final)

| Erro | Verificação |
|:--|:--|
| **400** | Campo obrigatório, número, data/hora, estrutura das listas |
| **401** | Refazer login; não repetir antes de autenticar |
| **403** | Ação exige **ADMIN** ou permissão específica |
| **404** | Código pertence à empresa autenticada? Registro desativado? |
| **409 / 422** | Situação, saldo, vigência, duplicidade, transição permitida |
| **Timeout em operação fiscal** | ⚠️ **Consulte a situação no provedor/SEFAZ antes de reenviar** — evita duplicidade |

---

## 11. Perguntas que a turma sempre faz

**P: Confirmei o pedido e ele ficou "bloqueado". Por quê?**
R: A checagem de crédito estourou o limite do cliente, ou o cliente está bloqueado. Libere o crédito e use **Desbloquear**. ⚠️ **Enquanto bloqueado, o pedido não gera demanda nem reserva.**

**P: Cliente sem limite de crédito é mais seguro?**
R: **Não.** Clientes **sem limite definido** (zero ou nulo) **não sofrem restrição nenhuma**. Deixar em branco é "liberado por padrão", não "seguro por padrão".

**P: Qual a diferença entre orçamento e pedido?**
R: O **orçamento** é a proposta comercial (validade, probabilidade, negociação). O **pedido** é a venda firme — e é ele que dispara crédito, reserva e demanda. A conversão copia **apenas o saldo aberto** dos itens.

**P: Por que não consigo cancelar meu orçamento?**
R: Falta cadastrar **motivo de cancelamento** em `VVND0310`. Sem ao menos um motivo, o `VVND0300` não cancela nada — nem orçamento, nem itens.

**P: O romaneio baixou meu estoque?**
R: **Não.** O **romaneio reserva** (reduz o ATP); a **NF-e baixa** o físico. Faz sentido: até a nota sair, a mercadoria ainda é sua.

**P: Cancelei um romaneio — o estoque voltou?**
R: **Sim.** Cancelar **libera as reservas**. O físico só teria sido baixado pela NF-e.

**P: A alíquota da nota veio errada. De onde ela vem?**
R: Percorra a hierarquia, de cima para baixo: `VFIS0350` (Classificações Fiscais — precedência máxima) → `VFIS0320` (Parâmetros ICMS/IPI) → `VFIS0330` (Redução/Diferimento) → `VFIS0110` (Tabelas Tributárias) → `VFIS0100` (padrão).

**P: A nota foi rejeitada. E agora?**
R: Leia o **motivo da SEFAZ** exibido na tela — ele aponta o campo. Corrija no rascunho e autorize de novo. Rejeição **não consome** número de nota.

**P: Posso corrigir o CFOP com uma CC-e?**
R: **Não.** A CC-e só corrige o que **não afeta imposto nem a identidade das partes** — natureza da operação, descrições, dados do transportador. Para CFOP, valores, CNPJ/CPF ou datas: **cancelamento + nova NF-e**.

**P: Qual o prazo para cancelar uma NF-e?**
R: Geralmente **24 horas** da autorização, conforme regra da SEFAZ. **O sistema não bloqueia por prazo, mas a SEFAZ pode rejeitar.**

**P: A NF-e de entrada gerou conta a pagar sozinha?**
R: **Sim.** Ao **aprovar** a NF-e de Entrada no `VFIS0210`, o sistema cria automaticamente o título no `VFIN0200`. É uma integração crítica entre Fiscal e Financeiro.

**P: Por que o Contas a Pagar tem aprovação e o Contas a Receber não?**
R: Assimetria proposital: você quer um segundo olhar antes de **tirar** dinheiro do caixa, não antes de colocar.

**P: Como faço um pagamento parcial?**
R: No painel de baixa, informe um **Valor Pago menor que o saldo restante**. O título fica em aberto pelo remanescente, permitindo novas baixas.

**P: Um título cancelado pode ser reativado?**
R: **Não.** O cancelamento é definitivo. Crie um novo título com os mesmos dados.

**P: Por que a apuração mostra saldo negativo em verde?**
R: A empresa acumulou **mais créditos do que débitos** no período. O valor negativo em verde é **crédito acumulado**, compensável em períodos futuros.

**P: Gerei o SPED. Já entreguei?**
R: **Não.** A geração do TXT **não representa assinatura nem transmissão**. Valide no **PVA** e transmita pelo canal oficial.

**P: Quais faixas aparecem no dashboard de aging?**
R: **Vencido**, **7**, **15**, **30**, **60 dias** e **Acima de 60 dias**, mais o **Total**. Só aparecem as faixas que têm título no período. As cores da tabela indicam o **status** do título, não a faixa.

---

## 12. Checklist de saída e avaliação

### Checklist do participante

**Comercial**
- [ ] Cadastro cliente completo nas 3 abas, com dados fiscais e limite de crédito
- [ ] Sei que cliente **sem limite** não sofre restrição
- [ ] Configuro permissões/restrições de venda e sei que **restrição prevalece**
- [ ] Configuro faixas de frete sem sobreposição
- [ ] Formo preço com margem e sei que a margem é sobre o **preço de venda**
- [ ] Cadastro motivos de cancelamento antes de operar o orçamento
- [ ] Crio orçamento, adiciono itens e **converto em pedido**
- [ ] Conheço os 6 bloqueios de conversão do orçamento
- [ ] Crio e **confirmo** um pedido de venda
- [ ] **Explico as 3 automações da confirmação**
- [ ] Trato um pedido bloqueado por crédito

**Expedição**
- [ ] Gero romaneio por auto-fill e percorro o ciclo até `DESPACHADO`
- [ ] Sei que **o romaneio reserva e a NF-e baixa**
- [ ] Trato divergência de conferência

**Fiscal**
- [ ] **Confiro o ambiente (Homologação/Produção) antes de emitir**
- [ ] Sei ler a hierarquia de busca de alíquotas
- [ ] Cadastro CFOP e sei quando ativar DIFAL
- [ ] Crio rascunho de NF-e e leio os impostos calculados
- [ ] **Autorizo** a NF-e e localizo a chave de 44 dígitos
- [ ] **Trato uma NF-e rejeitada** lendo o motivo da SEFAZ
- [ ] Emito CC-e e sei o que ela **não** pode corrigir
- [ ] Sei o prazo de cancelamento

**Financeiro**
- [ ] Localizo o título a receber gerado pela NF-e
- [ ] **Baixo** um título (total e parcial)
- [ ] Sei que o Contas a Pagar exige **aprovação** antes da baixa
- [ ] Leio o fluxo de caixa nas 3 abas
- [ ] Leio a apuração de impostos por competência
- [ ] Concilio por OFX conferindo a conta correta
- [ ] Sei que gerar SPED **não é transmitir**

**Geral**
- [ ] **Sei percorrer a corrente inteira, do caixa ao cadastro**

### Avaliação do instrutor (por participante)

| Competência | 🔴 Não fez | 🟡 Fez com ajuda | 🟢 Fez sozinho |
|:--|:-:|:-:|:-:|
| Cadastrar cliente completo | | | |
| Formar preço com margem | | | |
| Orçamento → pedido → confirmação | | | |
| Romaneio até despacho | | | |
| **Emitir e autorizar NF-e** | | | |
| Tratar rejeição da SEFAZ | | | |
| Baixar título e ler o caixa | | | |

---

## Anexo A — Dados-semente do Dia 4

### Apoios de cliente

**`VCLI0510`**
| Aba | Registros sugeridos |
|:--|:--|
| Região | `SUDESTE-SP`, `SUL`, `NORDESTE` |
| Segmento | `INDUSTRIA`, `DISTRIBUIDOR`, `CONSTRUCAO` |
| Tipo Contato | `COMERCIAL`, `FINANCEIRO`, `TECNICO` |
| Tipo Cliente | `NORMAL` (categoria NORMAL, 5 dias) · `CONSUMIDOR` |
| Portador | Banco principal |

**`VCLI0520`**
| Aba | Registros |
|:--|:--|
| Condições de Pagamento | `À Vista` (`0`) · `30/60` (`30,60`) · `30/60/90` (`30,60,90`) |
| Tabelas de Venda | `TAB-INDUSTRIA`, `TAB-DISTRIBUIDOR` |

**`VCLI0530`**
| Aba | Registros |
|:--|:--|
| Tipos de NF de Saída | Venda de produção · Devolução |
| Tipos de Imposto | Conforme regime |

### Cliente-exemplo

| Campo | Valor |
|:--|:--|
| Razão Social | Montadora Industrial Paulista Ltda |
| Tipo Documento / Documento | CNPJ (válido) |
| Inscrição Estadual | preenchida |
| Região / Segmento / Tipo | `SUDESTE-SP` / `INDUSTRIA` / `NORMAL` |
| Condição de Pagamento | `30/60` |
| Tabela de Venda | `TAB-INDUSTRIA` |
| Visibilidade Cond. Pagto | `Somente Vinculados` |
| **Limite de Crédito** | **R$ 15.000,00** |
| Endereço | Tipo `Entrega`, UF `SP`, com CEP e IBGE |
| Contato | Comprador, com e-mail e telefone |

> 💡 **Para forçar o bloqueio didático:** venda **300 peças** a R$ 89,90 = **R$ 26.970**, acima do limite de R$ 15.000. O pedido **vai bloquear** — e é exatamente o que você quer mostrar.

### Precificação (`VCST0202`)

**Custo vindo do Dia 3:** ≈ **R$ 54,00** (material R$ 26,74 + operação R$ 27,25)

| Campo | Valor |
|:--|:--|
| Descrição | Precificação Suporte Soldado 2026 |
| Item | `PA-SUP-SOLD-001` |
| Custo | R$ 54,00 |
| **Preço de Venda** | **R$ 89,90** |
| **Margem calculada** | `(89,90 − 54,00) / 89,90 × 100` = **39,93%** |
| Comissão padrão | 3% |
| Tipo de frete | CIF |

**Faixas de frete (`VCLI0202`)**

| Valor Inicial | Valor Final | % Frete |
|:-:|:-:|:-:|
| 0,00 | 5.000,00 | 5,0 |
| 5.000,01 | 20.000,00 | 3,5 |
| 20.000,01 | 100.000,00 | 2,0 |

### Parâmetros de orçamento (`VVND0310`)

**Motivos de cancelamento**

| Descrição | Indicador D (descancelar) | Indicador C (exige complemento) |
|:--|:-:|:-:|
| Desistência do cliente | ✅ | ❌ |
| Preço não aprovado | ✅ | ✅ |
| Prazo inviável | ❌ | ✅ |
| Erro de digitação | ✅ | ❌ |

**Padrão de comissão:** Comissão 3% = Faturamento 2% + Pagamento 1%

### Orçamento e pedido

| Campo | Valor |
|:--|:--|
| Cliente | Montadora Industrial Paulista |
| Tipo | `VENDA` |
| Válido até | +30 dias |
| Probabilidade | 70% |
| Item | `PA-SUP-SOLD-001` · **100 PC** · R$ 89,90 |
| **Total** | **R$ 8.990,00** |
| Condição de pagamento | `30/60` |
| Depósito | `ALM-PA` |

> 💡 Este valor **passa** no limite de crédito. Para a demo do bloqueio, use a variante de 300 peças.

### Configuração fiscal (`VFIS0100`)

| Campo | Valor |
|:--|:--|
| Regime Tributário | `3 — Lucro Real` (ou o da empresa) |
| ⚠️ **Ambiente** | **Homologação** |
| ICMS interno (ratio) | `0,18` |
| Venc. ICMS / IPI / PIS-COFINS | dia `10` / `25` / `25` |

### Tabelas tributárias (`VFIS0110`)

**NCM**
| NCM | IPI | PIS | COFINS | CST IPI | CST PIS | CST COFINS |
|:--|:-:|:-:|:-:|:-:|:-:|:-:|
| `7326.90.90` | 0,05 | 0,0165 | 0,076 | 50 | 01 | 01 |
| `7208.51.00` | 0,00 | 0,0165 | 0,076 | 50 | 01 | 01 |

**ICMS Interno**
| UF | Alíquota | FCP |
|:--|:-:|:-:|
| SP | 0,18 | 0,00 |
| MG | 0,18 | 0,02 |
| RS | 0,17 | 0,02 |

**ICMS Interestadual**
| Origem | Destino | Alíquota |
|:--|:--|:-:|
| SP | MG | 0,12 |
| SP | BA | 0,07 |
| SP | RS | 0,12 |

### CFOPs (`VFIS0300`)

| Código | Descrição | Utilização | DIFAL |
|:--|:--|:--|:-:|
| `5101` | Venda de produção do estabelecimento | `INDUSTRIALIZACAO_COMERCIO` | ❌ |
| `5102` | Venda de mercadoria adquirida de terceiros | `INDUSTRIALIZACAO_COMERCIO` | ❌ |
| `6101` | Venda de produção — interestadual | `INDUSTRIALIZACAO_COMERCIO` | ❌ |
| `6108` | Venda a consumidor final não-contribuinte | `INDUSTRIALIZACAO_COMERCIO` | ✅ |
| `1101` | Compra para industrialização | `INDUSTRIALIZACAO_COMERCIO` | ❌ |

### NF-e de saída (a nota da dinâmica)

| Campo | Valor |
|:--|:--|
| Número / Série | sequencial / `001` |
| **CFOP** | `5101` (venda dentro de SP) |
| Emissão / Saída | hoje |
| Pessoa | `J` |
| Destinatário | Montadora Industrial Paulista |
| **UF Destino** | `SP` → **operação interna** |
| Natureza da Operação | Venda de produção do estabelecimento |

**Item**
| Cód. | NCM | CFOP | Origem | Qtd | Unit. | Total |
|:--|:--|:--|:-:|:-:|:-:|:-:|
| `PA-SUP-SOLD-001` | `7326.90.90` | `5101` | `0` | 100 | 89,90 | **8.990,00** |

**Impostos esperados (aproximados)**
```
ICMS   = 8.990,00 × 18%   = R$ 1.618,20
IPI    = 8.990,00 × 5%    = R$   449,50
PIS    = 8.990,00 × 1,65% = R$   148,34
COFINS = 8.990,00 × 7,6%  = R$   683,24
```

### Financeiro

**Contas bancárias (`VFIN0100`)**
| Banco | Agência | Conta | Descrição | Saldo Inicial |
|:-:|:--|:--|:--|:-:|
| 341 | 1234 | 56789 | Conta Principal Itaú | R$ 50.000,00 |
| 001 | 4321 | 98765 | Conta BB | R$ 10.000,00 |

**Condições de pagamento (`VFIN0110`)**
| Nome | Parcelas |
|:--|:--|
| À Vista | `0` |
| 30/60 | `30,60` |
| 30/60/90 | `30,60,90` |

**Plano de contas (`VFIN0120`) — extrato mínimo**
| Código | Descrição | Tipo | Natureza |
|:--|:--|:--|:--|
| `3` | Receitas | RECEITA | CRÉDITO |
| `3.1` | Receita Operacional | RECEITA | CRÉDITO |
| `3.1.01` | Receita de Vendas | RECEITA | CRÉDITO |
| `4` | Despesas | DESPESA | DÉBITO |
| `4.1` | Custo dos Produtos Vendidos | DESPESA | DÉBITO |
| `4.2` | Despesas Administrativas | DESPESA | DÉBITO |

**Títulos gerados na dinâmica**
| Origem | Tela | Valor | Vencimento |
|:--|:--|:-:|:--|
| NF-e de venda | `VFIN0210` | R$ 8.990,00 (2 parcelas de R$ 4.495,00) | +30 e +60 dias |
| NF-e de compra (Dia 2) | `VFIN0200` | R$ 8.400,00 | conforme condição |

**Baixa parcial sugerida:** receber **R$ 2.000,00** na 1ª parcela → título fica **parcial** com saldo de R$ 2.495,00.

---

## Anexo B — Glossário do Dia 4

| Termo | Definição |
|:--|:--|
| **Aging** | Análise de vencimentos por faixa: Vencido, 7, 15, 30, 60 dias e Acima de 60 |
| **ATP** | `saldo em mãos − reservas` — o que pode ser prometido |
| **Baixa** | Registro do pagamento (a pagar) ou recebimento (a receber) de um título |
| **Baixa parcial** | Valor inferior ao saldo; o título fica em aberto pelo restante |
| **CC-e** | Carta de Correção Eletrônica — corrige o que **não** afeta imposto nem identidade das partes. Mínimo 15 caracteres |
| **CFOP** | Código Fiscal de Operação (4 dígitos) — define a natureza da operação. **Imutável** após criação |
| **Chave de acesso** | Identificador de 44 dígitos da NF-e autorizada |
| **Competência** | Período mensal de apuração, formato `AAAA-MM` |
| **Conciliação** | Conferência dos lançamentos com o extrato bancário |
| **CST** | Código de Situação Tributária |
| **DANFE** | Documento Auxiliar da NF-e (a "nota impressa") |
| **DAV** | Documento Auxiliar de Venda / Pré-Venda |
| **DIFAL** | Diferencial de Alíquota — operação interestadual a consumidor final não-contribuinte |
| **Divergência (romaneio)** | Quantidade conferida ≠ planejada. **Bloqueia o despacho** até o aceite |
| **DRE** | Demonstrativo de Resultado do Exercício (relatório R05) |
| **FCP** | Fundo de Combate à Pobreza — adicional sobre o ICMS em alguns estados |
| **IBPT** | Tabela de carga tributária aproximada (Lei da Transparência) |
| **Inutilização** | Comunica à SEFAZ uma faixa de números que **nunca foi usada** |
| **Manifestação do destinatário** | Evento sobre uma NF-e recebida (ciência, confirmação, desconhecimento, operação não realizada) |
| **Margem (%)** | `(Preço Venda − Custo) / Preço Venda × 100` — sobre o **preço**, não sobre o custo |
| **NCM** | Nomenclatura Comum do Mercosul (8 dígitos) — define a tributação. **Imutável** |
| **NFC-e** | Nota Fiscal de Consumidor Eletrônica |
| **NFS-e** | Nota Fiscal de Serviço Eletrônica |
| **Partidas dobradas** | Para cada débito há um crédito de igual valor |
| **Rateio** | Distribuição de despesa/receita entre centros de custo |
| **Romaneio** | Documento logístico de saída. **Reserva** o estoque; a NF-e é que **baixa** |
| **Saldo aberto (orçamento)** | O que ainda não foi atendido nem cancelado — é o que a conversão copia |
| **SPED ECD** | Escrituração Contábil Digital |
| **SPED EFD** | Escrituração Fiscal Digital (ICMS/IPI) |
| **SUFRAMA** | Código para clientes da Zona Franca de Manaus |
| **Título** | Documento financeiro: obrigação de pagar ou direito de receber |
| **Valor ponderado** | Total do orçamento × probabilidade de fechamento |

---

**Fim do Manual do Instrutor — Dia 4.**
Material complementar desta pasta: `roteiro-cronometrado.md` e `apostila-participante.md`.

---

## 🎓 Fim do treinamento de 16 horas

> *"O mesmo suporte soldado que nasceu como uma ficha no Dia 1 virou dinheiro no caixa hoje."*

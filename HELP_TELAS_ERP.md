# HELP - Telas do ERP Venture

> Documentação completa de todas as telas do sistema ERP Venture Desktop.
> Total de telas documentadas: **136**
> Estilo: Processos de negócio com fluxos, pré-requisitos e passo a passo.
> Última atualização: Junho 2026

---

## Índice de Processos

| Processo | Telas |
|----------|-------|
| [Financeiro, Contábil e Cadastros](#processo-financeiro-contabil-e-cadastros) | 18 |
| [Industrial e Produção](#processo-industrial-e-producao) | 54 |
| [Comercial, Vendas e PDV](#processo-comercial-vendas-e-pdv) | 18 |
| [Fiscal](#processo-fiscal) | 20 |
| [PCP, Chão de Fábrica, Estoque e Custos](#processo-pcp-chao-de-fabrica-estoque-e-custos) | 18 |
| [Suprimento e Compras](#processo-suprimento-e-compras) | 8 |

> **Novo neste ciclo (PCP & Chão de Fábrica):** este processo reúne as rotinas que
> transformam a demanda em produto acabado e o entregam ao cliente — **Pedido de
> Venda** (VVND0200), **Roteiro/CRP/APS/Custo Padrão/Qualidade/Manutenção/Previsão/
> Alertas MRP/Configurador** (VPRO0100–0800), **Ordem de Produção** (VPRO0900),
> **Máquinas e Tempos** (VMAQ0101/0200), **Custos auxiliares** (VCUS0100), **Estoque**
> (VEST0100/0200) e o **Romaneio de Expedição** profissional (VEXP0100).

---

## Introdução — Como usar este guia

Bem-vindo ao guia de telas (rotinas) do **VentureERP**. Este documento descreve, tela
por tela, **o que cada rotina faz, quando usar, o passo a passo e como ela se conecta às
demais** — organizado por **processos de negócio** (não por menus), para que você
aprenda o *fluxo*, não apenas os botões.

### O que é o VentureERP em uma frase

Um sistema que acompanha o produto do **pedido do cliente** até a **entrega e o
faturamento**, passando por **planejamento (MRP)**, **compras**, **produção** e
**estoque** — mantendo o **fiscal** e o **financeiro** sincronizados automaticamente.

### O grande fluxo (visão de 30 segundos)

```
CLIENTE  →  Pedido de Venda  →  (confirma)  →  gera DEMANDA + reserva estoque
                                                   │
                                                   ▼
                                                  MRP  →  sugere COMPRAS e PRODUÇÃO
                                                   │              │
                          ┌────────────────────────┘              │
                          ▼                                        ▼
                 Pedido de Compra                        Ordem de Produção
                 (recebe → estoque)                       (consome → produz → estoque)
                                                                   │
                                                                   ▼
                                          NF-e de Saída  →  baixa estoque + gera Conta a Receber
                                                                   │
                                                                   ▼
                                                    Romaneio / Expedição  →  ENTREGA
```

Cada seta é **automática** no VentureERP: confirmar o pedido já gera a demanda do MRP;
firmar a sugestão do MRP já cria a ordem; concluir a produção já movimenta o estoque; e
autorizar a NF-e já baixa o estoque e gera o título financeiro.

### Como as telas são nomeadas

Cada tela tem um **código** (ex.: `VVND0200`) e um **título** (ex.: "Pedido de Venda").
O prefixo indica a área: `VCLI`=Cliente, `VSUP`=Fornecedor/Compras, `VVND`=Vendas,
`VPRO`=Produção/PCP, `VEST`=Estoque, `VFIS`=Fiscal, `VFIN`=Financeiro, `VMAQ`=Máquinas,
`VMRP`=Planejamento MRP, `VCUS`=Custos, `VITM`=Item, `VCUT`=Plano de Corte, etc. Você
pode buscar qualquer tela pelo código ou pelo título na busca do sistema.

### Convenções deste guia

Cada tela é descrita com a mesma estrutura, para você achar o que precisa rapidamente:

- **Objetivo** — o que a tela resolve, em linguagem de negócio.
- **Pré-requisitos** — o que precisa existir antes (cadastros, permissões).
- **Passo a passo** — a sequência de ações para concluir a tarefa.
- **Campos** — o significado de cada campo e suas opções.
- **Observações importantes** — regras, automações e “pegadinhas”.
- **Telas relacionadas** — para onde ir antes/depois.

### Glossário universal (termos que aparecem em todo o ERP)

| Termo | O que significa |
|-------|-----------------|
| **Item** | Tudo que a empresa compra, produz ou vende (matéria-prima, componente, produto). |
| **Estrutura / BOM** | A "receita" do produto: quais componentes e quantidades formam cada item. |
| **MRP** | O "cérebro" que calcula **o que** comprar/produzir, **quanto** e **até quando**. |
| **Demanda** | Necessidade de um item — independente (pedido/previsão) ou dependente (explosão da BOM). |
| **Ordem** | O trabalho a executar: de **Produção** (fabricar) ou de **Compra** (adquirir). |
| **Firmar** | Aprovar uma **sugestão** (do MRP) ou proposta, transformando-a em ordem real. |
| **Estoque / Saldo** | Quantidade disponível de um item por depósito; o **ATP** é o disponível para prometer. |
| **Reserva** | Bloqueio lógico do estoque (não baixa o físico) — a NF-e é que baixa de verdade. |
| **NF-e** | Nota Fiscal eletrônica; sua autorização baixa estoque e gera o título financeiro. |
| **Romaneio** | Documento logístico de saída (separar → conferir → despachar). |
| **Lote / Rastreabilidade** | Identificação da corrida/certificado que segue a mercadoria (genealogia). |
| **Situação / Status** | O estado atual de um documento (ex.: Rascunho → Confirmado → Faturado). |

### Segurança e acesso

Todas as telas exigem **login** (usuário + senha). O acesso é controlado por **perfil**:
`ADMIN` (tudo), `USER` (operacional) e `VIEWER` (somente leitura). Ações sensíveis
(rodar o planejamento, aprovar compra, autorizar fiscal, gerir financeiro) podem exigir
permissão específica.

---

## Processo Financeiro, Contábil e Cadastros


> Documentação completa dos processos dos módulos Financeiro, Contabilidade e Cadastros do ERP Venture.
> Total de telas documentadas: **18**
> Última atualização: Junho 2026

---

## Índice

| Módulo | Telas |
|--------|-------|
| [1. Visão Geral dos Processos](#1-visão-geral-dos-processos) | — |
| [2. Pré-requisitos Gerais](#2-pré-requisitos-gerais) | — |
| [3. Fluxo do Processo](#3-fluxo-do-processo) | — |
| [4. Financeiro](#4-financeiro) | 9 |
| [5. Contabilidade](#5-contabilidade) | 3 |
| [6. Cadastros](#6-cadastros) | 6 |

---

## 1. Visão Geral dos Processos

Os módulos **Financeiro**, **Contabilidade** e **Cadastros** formam a espinha dorsal administrativa do ERP Venture. Juntos, eles gerenciam todo o ciclo financeiro da empresa — desde o cadastro das entidades fundamentais (empresa, bancos, plano de contas) até a execução de pagamentos, recebimentos, apuração de impostos e emissão de relatórios gerenciais.

### Arquitetura dos Módulos

```
┌──────────────────────────────────────────────────────────────┐
│                       CADASTROS (6 telas)                     │
│  VEMP0100  VFUN0100  VLOC0100  VCLA0100  VCAL0100  VPRI0100 │
│  (Empresa) (Funcion.) (Países)  (Classif.) (Calend.) (Prior.)│
└────────────────────────┬─────────────────────────────────────┘
                         │ fundação
    ┌────────────────────┼────────────────────┐
    ▼                    ▼                    ▼
┌───────────┐    ┌──────────────┐    ┌──────────────┐
│FINANCEIRO │    │ CONTABILIDADE│    │   FISCAL     │
│  (9 telas)│    │   (3 telas)  │    │ (mód.ext.)   │
│           │    │              │    │              │
│ VFIN0100  │    │ VCTB0102     │    │ VFIS0210─────┤───┐
│ VFIN0110  │    │ VCTB0200     │    │ (NF Entrada) │   │ gera
│ VFIN0120  │    │ VUTL0555     │    │              │   ▼
│ VFIN0130  │    │              │    │         VFIN0200
│ VFIN0200◄─┤    │              │    │         (Pagar)
│ VFIN0210  │    │              │    │
│ VFIN0300  │    │              │    │
│ VFIN0400  │    │              │    │
│ VFIN0500  │    │              │    │
└───────────┘    └──────────────┘    └──────────────┘
```

### Responsabilidades de Cada Módulo

| Módulo | Responsabilidade |
|--------|-----------------|
| **Financeiro** | Contas bancárias, condições de pagamento, plano de contas, centros de custo, contas a pagar/receber, fluxo de caixa, apuração de impostos e relatórios financeiros/fiscais. |
| **Contabilidade** | Cadastro contábil de centros de custo, plano de contas para SPED ECD, lançamentos contábeis (partidas dobradas), balancete e tabela base de UFs/cidades. |
| **Cadastros** | Fundação do sistema: empresa (com validação de CNPJ), funcionários, localização geográfica (países/UFs), classificação hierárquica de itens, calendário industrial e prioridades de produção. |

---

## 2. Pré-requisitos Gerais

Antes de operar qualquer tela dos módulos Financeiro, Contabilidade ou Cadastros, assegure-se de que os seguintes itens estão atendidos:

### 2.1 Cadastros Obrigatórios (Ordem de Criação)

A ordem de cadastro é **rígida** e deve ser seguida para garantir a integridade referencial do sistema:

| Ordem | Tela | Cadastro | Justificativa |
|-------|------|----------|---------------|
| 1º | **VEMP0100** | Empresa | Fundação do sistema. Sem empresa cadastrada, nenhum outro módulo funciona. |
| 2º | **VLOC0100** | Países e UFs | Base geográfica para todos os endereços do sistema. |
| 3º | **VUTL0555** | UFs e Cidades | Complemento municipal da base geográfica, referenciado em todos os cadastros de endereço. |
| 4º | **VCAL0100** | Calendário Industrial | Define dias úteis. Necessário para VPLA0102, VPME0102ITE e VENT0108. |
| 5º | **VFIN0100** | Contas Bancárias | Contas para baixas (pagamentos/recebimentos) em VFIN0200 e VFIN0210. |
| 6º | **VFIN0110** | Condições de Pagamento | Usado em todo local que envolve pagamento (pedidos, títulos, fornecedores). |
| 7º | **VFIN0120** | Plano de Contas | Estrutura contábil referenciada por VFIN0200 e relatório R05 (DRE). |
| 8º | **VFIN0130 / VCTB0102** | Centros de Custo | Rateio de despesas/receitas. VFIN0130 (financeiro) e VCTB0102 (contábil) são complementares. |

### 2.2 Permissões de Acesso

- O usuário deve possuir perfil de acesso com permissão aos módulos Financeiro, Contabilidade e Cadastros.
- Telas de consulta (VFIN0300, VFIN0400, VFIN0500) requerem permissão de leitura.
- Telas de movimentação (VFIN0200, VFIN0210) requerem permissão de leitura e escrita.
- O fluxo de aprovação em VFIN0200 pode exigir perfil específico de aprovador.

### 2.3 Conceitos Fundamentais

| Conceito | Definição |
|----------|-----------|
| **Baixa** | Ato de registrar o pagamento (Contas a Pagar) ou recebimento (Contas a Receber) de um título financeiro. Pode ser parcial (valor menor que o saldo) ou total. |
| **Aging** | Análise de vencimentos por faixa de dias: a vencer, vencido até 30 dias, 31–60, 61–90 e mais de 90 dias. |
| **Conciliação** | Marcação que indica se um lançamento do fluxo de caixa foi conferido e batido com o extrato bancário. |
| **Competência** | Período de apuração de impostos, no formato YYYY-MM (ex: 2026-06 para junho de 2026). |
| **Natureza (Contábil)** | Classificação do saldo da conta: CRÉDITO (aumenta com crédito, diminui com débito) ou DÉBITO (aumenta com débito, diminui com crédito). |

---

## 3. Fluxo do Processo

### 3.1 Fluxo Financeiro Completo (Contas a Pagar)

```
Criação do Título          Aprovação           Baixa (Pagamento)
─────────────────      ───────────────      ───────────────────
                      │               │
VFIS0210 (NF-e Entrada)──► VFIN0200 ──► aprovar(null) = Aprovado
   (aprovação auto gera      │               │
    conta a pagar)           │               ▼
                             │         Painel de Baixa:
                             │         • Conta Bancária (VFIN0100)
Criação Manual:              │         • Valor Pago
VFIN0200 → + Nova Conta     │         • Data Pagamento
                             │               │
                             │               ▼
                      Rejeitar("motivo")   Status: PAGO (verde)
                        = Cancelado               │
                        (vermelho)                ▼
                                            VFIN0300 (Fluxo de Caixa)
                                            VFIN0500 (Relatórios)
```

### 3.2 Fluxo Financeiro (Contas a Receber)

```
Criação do Título               Baixa (Recebimento)
──────────────────      ──────────────────────────────
VFIN0210 → + Nova Conta       Painel de Baixa:
  • Nº Documento              • Conta Bancária (VFIN0100)
  • Valor Bruto               • Valor Recebido
  • Cliente ID                • Data Recebimento
  • Vencimento                       │
        │                             ▼
        │                      Status: PAGO (verde) ou PARCIAL (azul)
        ▼                             │
  Status: PENDENTE (âmbar)           ▼
                              VFIN0300 (Fluxo de Caixa)
                              VFIN0500 (Relatórios)
```

### 3.3 Fluxo de Apuração de Impostos

```
VFIS0200 (NF-e Saída) ──► Débitos (ICMS/IPI/PIS/COFINS) ──┐
                                                            │
VFIS0210 (NF-e Entrada) ──► Créditos (ICMS/IPI/PIS/COFINS) ─┤
                                                            │
             ┌──────────────────────────────────────────────┘
             ▼
      VFIN0400 (Apuração)
        Competência: YYYY-MM
        Botão Apurar → Calcula Saldo = Saídas - Entradas
             │
             ├── Saldo > 0: A Recolher (vermelho)
             └── Saldo < 0: Crédito Acumulado (verde)
```

### 3.4 Conexões Críticas Entre Telas

| Conexão | Descrição |
|---------|-----------|
| **VEMP0100 + VFIN0100 → VFIN0200/0210** | Empresa e contas bancárias são pré-requisitos para realizar baixas (pagamentos/recebimentos). |
| **VFIS0210 (aprovação) → VFIN0200** | Ao aprovar uma NF-e de Entrada no módulo Fiscal, o sistema gera automaticamente um título a pagar no Financeiro. |
| **VFIN0200/0210 → VFIN0300** | Todos os pagamentos e recebimentos baixados alimentam o fluxo de caixa (aba Realizado). |
| **VFIN0120 → VFIN0200 + VFIN0500 (R05)** | O plano de contas estrutura a classificação contábil dos títulos e serve de base para o Demonstrativo de Resultado do Exercício (DRE). |
| **VUTL0555 → TUDO** | A tabela de UFs e Cidades é referência universal para todos os endereços do sistema (clientes, fornecedores, empresas, NF-e). |
| **VCAL0100 → VPLA0102 / VPME0102ITE / VENT0108** | O calendário industrial define os dias úteis que validam datas de entrega e prazos de produção. |

---

## 4. Financeiro

#### VFIN0100 — Contas Bancárias

##### Objetivo

Cadastrar e manter as contas bancárias da empresa. Este é o cadastro **FUNDAMENTAL** do módulo financeiro — todas as operações de baixa (pagamentos e recebimentos) nas telas VFIN0200 e VFIN0210 utilizam as contas aqui cadastradas. A tela VFIN0300 exibe os saldos destas contas na aba "Saldos das Contas".

##### Pré-requisitos

- Nenhum. Esta é uma das primeiras telas a ser configurada no módulo financeiro.
- Ter em mãos os dados bancários: código do banco, agência, número da conta, dígito verificador.

##### Passo a Passo

1. Acesse o módulo **Financeiro > Contas Bancárias** (VFIN0100).
2. Clique no botão **+ Nova Conta**.
3. Preencha o campo **Banco** com o código numérico da instituição (ex: `341` para Itaú, `001` para Banco do Brasil).
4. Preencha o campo **Conta** com o número da conta corrente (sem o dígito).
5. Preencha o campo **Descrição** com um nome identificador (ex: "Conta Principal Itaú", "Conta Investimento BB").
6. Preencha opcionalmente **Agência**, **Dígito**, **Titular** e **Saldo Inicial**.
7. Se a conta aceitar PIX, selecione o **Tipo Chave PIX** e informe a **Chave PIX**.
8. Clique em **Salvar**.
9. A conta aparecerá na tabela de listagem com o saldo atual formatado em reais (R$).

##### Campos

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Banco | texto | Sim | — | Código do banco (ex: `341`, `001`, `237`) |
| Agência | texto | Não | — | Número da agência bancária |
| Conta | texto | Sim | — | Número da conta corrente |
| Dígito | texto | Não | — | Dígito verificador da conta |
| Descrição | texto | Sim | — | Nome descritivo para identificação (ex: "Conta Principal Itaú") |
| Titular | texto | Não | — | Nome do titular da conta |
| Saldo Inicial | número | Não | — | Saldo inicial para conciliação bancária |
| Tipo Chave PIX | seleção | Não | CNPJ / CPF / E-mail / Telefone / Aleatória | Tipo de chave PIX cadastrada |
| Chave PIX | texto | Não | — | Valor da chave PIX conforme o tipo selecionado |

##### Observações importantes

- A tela não possui funcionalidade de edição ou exclusão de contas já cadastradas. Em caso de erro, o administrador do sistema deve corrigir diretamente na base de dados ou cadastrar novo registro.
- O **Saldo Inicial** cadastrado é o ponto de partida para a conciliação. Os saldos exibidos na tela VFIN0300 consideram este valor inicial mais todas as movimentações de baixa registradas.
- Bancos, agências e contas devem ser informados sem máscaras ou caracteres especiais (apenas números e, para dígito, o caractere verificador).
- A chave PIX é um campo opcional mas recomendado, pois permite identificar recebimentos via PIX no fluxo de caixa.

##### Telas Relacionadas

| Tela | Por que se conecta |
|------|--------------------|
| **VFIN0200 (Contas a Pagar)** | Utiliza as contas bancárias no painel de baixa para registrar pagamentos. |
| **VFIN0210 (Contas a Receber)** | Utiliza as contas bancárias no painel de baixa para registrar recebimentos. |
| **VFIN0300 (Fluxo de Caixa e Saldos)** | A aba "Saldos das Contas" exibe o saldo atualizado de cada conta cadastrada aqui. |
| **VEMP0100 (Cadastro Empresa)** | A empresa à qual as contas pertencem; os pagamentos e recebimentos são consolidados por empresa. |

---

#### VFIN0110 — Condições de Pagamento

##### Objetivo

Cadastrar as condições de pagamento utilizadas em todo o sistema ERP. Estas condições definem as regras de parcelamento — quantas parcelas e em quantos dias cada uma vence a partir da data base. São referenciadas em pedidos de venda, títulos financeiros, cadastros de clientes e fornecedores.

##### Pré-requisitos

- Nenhum. Esta tela é autônoma e pode ser configurada a qualquer momento.

##### Passo a Passo

1. Acesse **Financeiro > Condições de Pagamento** (VFIN0110).
2. Clique em **+ Nova Condição**.
3. No campo **Nome**, informe um identificador descritivo. A convenção recomendada é usar os prazos separados por barra (ex: `30/60/90`, `28/56`, `À Vista`).
4. No campo **Parcelas**, informe os dias de vencimento de cada parcela, separados por vírgula. Exemplos:
   - `0` = pagamento à vista (parcela única, vencimento na data base)
   - `30,60,90` = três parcelas: 30, 60 e 90 dias da data base
   - `28,56,84` = três parcelas mensais de 28 dias
5. Clique em **Salvar**.
6. A condição aparecerá na tabela de listagem com ID, Nome e a string de parcelas.

##### Campos

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Nome | texto | Sim | — | Nome identificador da condição (ex: "30/60/90", "À Vista", "28/56") |
| Parcelas | texto | Sim | — | Dias de vencimento separados por vírgula. `0` = à vista. Ex: `30,60,90` |

##### Observações importantes

- Espaços em branco no campo Parcelas são removidos automaticamente ao salvar.
- O valor `0` (zero) tem significado especial: indica pagamento em parcela única à vista, com vencimento na data de emissão/base.
- Não há validação de ordenação — certifique-se de informar os dias em ordem crescente para que o sistema gere as parcelas corretamente.
- Condições de pagamento não podem ser excluídas se já estiverem referenciadas em títulos ou pedidos.

##### Telas Relacionadas

| Tela | Por que se conecta |
|------|--------------------|
| **VFIN0200 (Contas a Pagar)** | Referencia condições de pagamento para calcular datas de vencimento das parcelas. |
| **VFIN0210 (Contas a Receber)** | Referencia condições de pagamento para títulos a receber. |
| **VCLI0520 (Apoio Cliente — Comercial)** | Possui cadastro próprio de condições de pagamento para clientes. |
| **VPDV0200 (Cadastro de Pedido de Venda)** | Utiliza condições de pagamento no fechamento de pedidos. |

---

#### VFIN0120 — Plano de Contas

##### Objetivo

Manter o plano de contas contábil da empresa. Utiliza notação hierárquica com pontos para representar a estrutura de árvore contábil (ex: `3.1.01` representa Grupo 3 → Subgrupo 1 → Conta 01). Serve como classificação contábil para os títulos financeiros e como base para o relatório DRE (R05). O nível de cada conta é calculado automaticamente pelo número de segmentos separados por ponto.

##### Pré-requisitos

- Conhecimento básico de estrutura contábil (grupos, subgrupos, contas analíticas).
- Recomenda-se definir a estrutura hierárquica antes de iniciar o cadastro.

##### Passo a Passo

1. Acesse **Financeiro > Plano de Contas** (VFIN0120).
2. Para criar uma conta de **primeiro nível** (grupo):
   - Clique em **+ Nova Conta**.
   - Informe o **Código** como um número simples (ex: `1`, `2`, `3`).
   - Informe a **Descrição** (ex: "Ativo", "Passivo", "Receitas").
   - Selecione o **Tipo** correspondente (ATIVO, PASSIVO, PATRIMÔNIO, RECEITA, DESPESA).
   - Selecione a **Natureza** (CRÉDITO ou DÉBITO).
   - Deixe **Código Pai** em branco.
   - Clique em **Salvar**.
3. Para criar uma conta de **nível inferior** (subgrupo ou conta analítica):
   - Clique em **+ Nova Conta**.
   - Informe o **Código** no formato hierárquico com ponto (ex: `3.1` para subgrupo, `3.1.01` para conta analítica).
   - Informe a **Descrição**.
   - No campo **Código Pai**, informe o código da conta superior (ex: para `3.1.01`, o código pai seria `3.1`).
   - Selecione **Tipo** e **Natureza**.
   - Clique em **Salvar**.
4. A tabela de listagem exibe os códigos com indentação visual progressiva conforme o nível hierárquico.

##### Campos

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Código | texto | Sim | — | Código hierárquico com notação de ponto (ex: `3.1.01`). O nível é calculado pelos segmentos. |
| Descrição | texto | Sim | — | Nome descritivo da conta contábil (ex: "Receita de Vendas", "Despesas Administrativas") |
| Código Pai | texto | Não | — | Código da conta superior na hierarquia. Em branco para contas de primeiro nível. |
| Tipo | seleção | Sim | RECEITA / DESPESA / ATIVO / PASSIVO / PATRIMÔNIO | Classificação contábil da conta. |
| Natureza | seleção | Sim | CRÉDITO / DÉBITO | Natureza do saldo: CRÉDITO (aumenta com crédito) ou DÉBITO (aumenta com débito). |

##### Observações importantes

- O **nível** de cada conta é calculado automaticamente pelo sistema com base na quantidade de segmentos no código separados por ponto. Ex: `3` = nível 1, `3.1` = nível 2, `3.1.01` = nível 3.
- A indentação visual na tabela de listagem facilita a leitura da estrutura hierárquica.
- Contas do tipo RECEITA normalmente têm natureza CRÉDITO. Contas do tipo DESPESA normalmente têm natureza DÉBITO.
- O plano de contas é a base para o relatório **R05 (DRE)** no VFIN0500 — certifique-se de que as contas de receita e despesa estejam corretamente classificadas.
- Alterações no plano de contas após o início da operação devem ser feitas com cautela, pois impactam relatórios e a classificação de títulos já existentes.

##### Telas Relacionadas

| Tela | Por que se conecta |
|------|--------------------|
| **VFIN0200 (Contas a Pagar)** | Permite vincular títulos a contas contábeis via campo `plano_contas_id`. |
| **VFIN0500 (Relatórios)** | O relatório R05 (DRE) utiliza a estrutura do plano de contas para montar o demonstrativo. |
| **VCTB0200 (Contabilidade SPED ECD)** | Estrutura similar no módulo contábil, com foco em SPED. As naturezas e tipos são compatíveis. |

---

#### VFIN0130 — Centros de Custo

##### Objetivo

Cadastrar e manter os centros de custo da empresa, que permitem classificar e ratear despesas e receitas por área, departamento ou unidade de negócio. São utilizados para contabilidade gerencial, análises de rentabilidade por centro e apropriação de custos.

##### Pré-requisitos

- Nenhum. Esta tela é autônoma e pode ser configurada a qualquer momento.

##### Passo a Passo

1. Acesse **Financeiro > Centros de Custo** (VFIN0130).
2. Clique em **+ Novo Centro**.
3. Informe um **Código** identificador (ex: `CC-001`, `PROD`, `ADM`).
4. Informe a **Descrição** (ex: "Produção Fábrica A", "Administrativo Central", "Comercial SP").
5. Selecione o **Tipo** de centro conforme sua função:
   - **PRODUTIVO**: áreas que geram receita diretamente (fábrica, linha de produção).
   - **ADMINISTRATIVO**: back-office (RH, finanças, diretoria).
   - **COMERCIAL**: vendas, marketing, representantes.
   - **AUXILIAR**: áreas de suporte (TI, manutenção, limpeza).
6. Clique em **Salvar**.
7. O centro de custo ficará disponível para vinculação nos títulos do VFIN0200.

##### Campos

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Código | texto | Sim | — | Código identificador do centro de custo (ex: `CC-001`) |
| Descrição | texto | Sim | — | Nome descritivo (ex: "Produção Fábrica A") |
| Tipo | seleção | Sim | PRODUTIVO / ADMINISTRATIVO / COMERCIAL / AUXILIAR | Classificação do centro de custo |

##### Observações importantes

- A classificação por tipo é essencial para a correta apuração de custos e formação de preço.
- Centros do tipo PRODUTIVO são os que normalmente recebem rateio de custos diretos de produção.
- Centros AUXILIARES geralmente têm seus custos rateados entre os centros PRODUTIVOS.
- O módulo contábil possui um cadastro complementar de centros de custo (VCTB0102) com vínculo a empresa.

##### Telas Relacionadas

| Tela | Por que se conecta |
|------|--------------------|
| **VFIN0200 (Contas a Pagar)** | Permite vincular títulos a pagar a centros de custo para rateio de despesas. |
| **VFIN0500 (Relatórios)** | Relatórios gerenciais podem ser filtrados/agrupados por centro de custo. |
| **VCTB0102 (Cadastro Centro de Custo — Contábil)** | Cadastro alternativo/complementar no módulo contábil, com vínculo a empresa. |

---

#### VFIN0200 — Contas a Pagar

##### Objetivo

Gerenciar o ciclo de vida completo dos títulos a pagar: criação, aprovação/rejeição, baixa (pagamento parcial ou total) e cancelamento. A tela oferece um dashboard de aging com faixas de vencimento (a vencer, vencido 30, 60, 90 e +90 dias) e status visuais (âmbar = pendente, azul = aprovado, verde = pago, vermelho = cancelado).

**INTEGRAÇÃO CRÍTICA**: Quando uma NF-e de Entrada é aprovada no módulo Fiscal (VFIS0210), o sistema gera automaticamente uma conta a pagar nesta tela.

##### Pré-requisitos

- **VFIN0100 (Contas Bancárias)**: Necessário para realizar a baixa (pagamento).
- **VFIN0120 (Plano de Contas)**: Opcional — para classificação contábil do título.
- **VFIN0130 (Centros de Custo)**: Opcional — para rateio da despesa.
- **VEMP0100 (Cadastro Empresa)**: A empresa deve estar cadastrada.

##### Passo a Passo

##### Criação de Título

1. Acesse **Financeiro > Contas a Pagar** (VFIN0200).
2. A tela abre no modo **Listagem**, exibindo o dashboard de aging e a tabela de títulos existentes.
3. Clique em **+ Nova Conta** para entrar no modo de criação.
4. Preencha os campos obrigatórios:
   - **Nº Documento**: número do documento fiscal ou interno (ex: `NF-5500`, `CT-001`).
   - **Emissão**: data de emissão do título (padrão: data atual).
   - **Vencimento**: data de vencimento do título (padrão: data atual).
   - **Valor Bruto**: valor total do título em reais.
5. Preencha opcionalmente:
   - **Fornecedor (ID)**: ID do fornecedor vinculado (do cadastro VAVR0200).
   - **NF Entrada (ID)**: ID da nota fiscal de entrada vinculada (do VFIS0210).
   - **Desconto**: valor de desconto a ser abatido.
   - **Parc. nº / Parc. tot.**: número da parcela atual e total de parcelas.
   - **Plano Contas (ID)**: ID da conta contábil do VFIN0120 para classificação.
   - **Centro Custo (ID)**: ID do centro de custo do VFIN0130 para rateio.
   - **Observação**: texto livre para anotações.
6. Clique em **Salvar**. O título será criado com status **pendente** (âmbar).

##### Aprovação do Título

7. Na tabela de listagem, localize o título com status **pendente**.
8. Clique no botão **Aprovar**. O sistema processa a aprovação sem solicitar motivo.
9. O status muda para **aprovado** (azul). O título agora está apto para baixa.

##### Rejeição do Título

7. Na tabela de listagem, localize o título com status **pendente**.
8. Clique no botão **Rejeitar**. O sistema solicitará um **motivo** da rejeição via prompt.
9. Informe o motivo (ex: "Documento duplicado", "Valor divergente da NF-e") e confirme.
10. O status muda para **cancelado** (vermelho).

##### Baixa (Pagamento)

7. Localize um título com status **aprovado** (azul).
8. Clique no botão **Baixar**. Um painel expansível será exibido.
9. Preencha os campos de baixa:
   - **Conta Bancária**: selecione a conta de VFIN0100 de onde sairá o pagamento.
   - **Valor Pago**: informe o valor a pagar. Se for menor que o saldo restante, será uma **baixa parcial** (o título fica com status "parcial" até ser totalmente quitado). O hint abaixo do campo mostra o saldo restante.
   - **Data Pagamento**: data em que o pagamento foi efetuado (padrão: data atual).
   - **Observação**: opcional, para notas sobre a baixa.
10. Clique em **Confirmar Baixa**.
11. Se o valor pago for igual ou superior ao saldo, o status muda para **pago** (verde). Se for parcial, o título permanece com saldo em aberto.

##### Cancelamento

7. Um título com status **aprovado** também pode ser cancelado clicando em **Cancelar**.
8. O status muda para **cancelado** (vermelho). Esta operação não tem desfazer.

##### Campos

##### Criação

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Nº Documento | texto | Sim | — | Número do documento de referência (ex: `NF-5500`) |
| Tipo Doc. | texto | Não | — | Tipo do documento (padrão: `NF-e`) |
| Fornecedor (ID) | número | Não | — | ID do fornecedor no cadastro VAVR0200 |
| NF Entrada (ID) | número | Não | — | ID da NF-e de entrada (VFIS0210) vinculada |
| Forma Pagamento | texto | Não | — | Meio de pagamento (padrão: `transferencia`) |
| Emissão | data | Sim | — | Data de emissão do título (padrão: hoje) |
| Vencimento | data | Sim | — | Data de vencimento (padrão: hoje) |
| Valor Bruto | número | Sim | — | Valor total do título em reais |
| Desconto | número | Não | — | Valor de desconto a abater |
| Parc. nº | número | Não | — | Número da parcela atual (padrão: 1) |
| Parc. tot. | número | Não | — | Total de parcelas (padrão: 1) |
| Plano Contas (ID) | número | Não | — | Vínculo com conta do plano de contas (VFIN0120) |
| Centro Custo (ID) | número | Não | — | Vínculo com centro de custo (VFIN0130) |
| Observação | texto | Não | — | Texto livre para anotações |

##### Baixa

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Conta Bancária | seleção | Sim | Contas de VFIN0100 | Conta bancária do pagamento |
| Valor Pago | número | Sim | — | Valor a pagar. Menor que o saldo = baixa parcial. |
| Data Pagamento | data | Sim | — | Data do pagamento (padrão: hoje) |
| Observação | texto | Não | — | Anotação sobre a baixa |

##### Observações importantes

- **Fluxo de aprovação**: a função de aprovar recebe um motivo opcional. Se `null`, o título é aprovado. Se informado com texto, o título é rejeitado (cancelado) com o motivo.
- **Baixa parcial**: o sistema suporta nativamente pagamentos parciais. Enquanto houver saldo em aberto, o título permanece disponível para novas baixas.
- **Status e cores**: pendente (âmbar/laranja) → aprovado (azul) → pago (verde) ou cancelado (vermelho).
- **Geração automática**: ao aprovar uma NF-e de Entrada no VFIS0210, o sistema cria automaticamente uma conta a pagar nesta tela com os dados da nota.
- **Dashboard de aging**: exibe totais de a vencer, vencido até 30d, 31–60d, 61–90d e +90d. Clique nas faixas para filtrar a tabela.
- **Filtro por status**: use o seletor de status (Todos / pendente / aprovado / pago / cancelado) para refinar a listagem.

##### Telas Relacionadas

| Tela | Por que se conecta |
|------|--------------------|
| **VFIN0100 (Contas Bancárias)** | Fornece as contas para o painel de baixa (pagamento). |
| **VFIN0120 (Plano de Contas)** | Classificação contábil opcional do título. |
| **VFIN0130 (Centros de Custo)** | Rateio opcional da despesa por centro de custo. |
| **VFIN0300 (Fluxo de Caixa)** | Alimenta o fluxo de caixa realizado com os pagamentos efetuados. |
| **VFIN0500 (Relatórios)** | Relatórios R10 (Aging Pagar Detalhado) e R11 (Extrato por Fornecedor). |
| **VFIS0210 (NF-e de Entrada)** | A aprovação de uma NF-e gera automaticamente uma conta a pagar aqui. |
| **VEMP0100 (Cadastro Empresa)** | A empresa é o contexto para todos os títulos financeiros. |

---

#### VFIN0210 — Contas a Receber

##### Objetivo

Gerenciar o ciclo de vida dos títulos a receber: criação, baixa (recebimento parcial ou total) e cancelamento. Similar ao VFIN0200, porém **sem fluxo de aprovação** — títulos a receber entram diretamente no status "pendente" e podem ser baixados ou cancelados. Exibe dashboard de aging com faixas de vencimento.

##### Pré-requisitos

- **VFIN0100 (Contas Bancárias)**: Necessário para registrar a baixa (recebimento).
- **VEMP0100 (Cadastro Empresa)**: A empresa deve estar cadastrada.

##### Passo a Passo

##### Criação de Título

1. Acesse **Financeiro > Contas a Receber** (VFIN0210).
2. A tela abre no modo **Listagem**, exibindo o dashboard de aging e a tabela de títulos.
3. Clique em **+ Nova Conta** para entrar no modo de criação.
4. Preencha os campos obrigatórios:
   - **Nº Documento**: número do documento de referência (ex: `NF-1001`, `BOL-050`).
   - **Valor Bruto**: valor total do título em reais.
   - **Emissão**: data de emissão (padrão: data atual).
   - **Vencimento**: data de vencimento (padrão: data atual).
5. Preencha opcionalmente:
   - **Cliente (ID)**: ID do cliente devedor (do cadastro VCLI0500).
   - **NF Saída (ID)**: ID da nota fiscal de saída vinculada (do VFIS0200).
   - **Forma Pagamento**: meio de recebimento (padrão: `boleto`).
   - **Desconto**: desconto concedido.
   - **Parc. nº / Parc. tot.**: número da parcela e total de parcelas.
   - **Observação**: texto livre.
6. Clique em **Salvar**. O título será criado com status **pendente** (âmbar).

##### Baixa (Recebimento)

7. Na tabela, localize um título com status **pendente** (âmbar) ou **parcial** (azul).
8. Clique em **Baixar**. O painel de baixa será exibido.
9. Preencha:
   - **Conta Bancária**: selecione a conta de VFIN0100 onde o valor será depositado.
   - **Valor Recebido**: informe o valor. Se for menor que o saldo, será **recebimento parcial**.
   - **Data Recebimento**: data do recebimento (padrão: data atual).
   - **Observação**: opcional.
10. Clique em **Confirmar Baixa**.
11. Status muda para **pago** (verde) se quitado totalmente, ou permanece **parcial** (azul) se ainda houver saldo.

##### Cancelamento

7. Um título pendente ou parcial pode ser cancelado clicando em **Cancelar**.
8. Status muda para **cancelado** (vermelho).

##### Campos

##### Criação

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Nº Documento | texto | Sim | — | Número do documento (ex: `NF-1001`, `BOL-050`) |
| Cliente (ID) | número | Não | — | ID do cliente devedor (VCLI0500) |
| NF Saída (ID) | número | Não | — | ID da NF-e de saída (VFIS0200) vinculada |
| Forma Pagamento | texto | Não | — | Meio de recebimento (padrão: `boleto`) |
| Valor Bruto | número | Sim | — | Valor total do título |
| Emissão | data | Sim | — | Data de emissão (padrão: hoje) |
| Vencimento | data | Sim | — | Data de vencimento (padrão: hoje) |
| Desconto | número | Não | — | Desconto concedido |
| Parc. nº | número | Não | — | Número da parcela atual |
| Parc. tot. | número | Não | — | Total de parcelas |
| Observação | texto | Não | — | Texto livre |

##### Baixa

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Conta Bancária | seleção | Sim | Contas de VFIN0100 | Conta onde o valor será depositado |
| Valor Recebido | número | Sim | — | Valor a receber. Menor que o saldo = recebimento parcial. |
| Data Recebimento | data | Sim | — | Data do recebimento (padrão: hoje) |
| Observação | texto | Não | — | Anotação sobre o recebimento |

##### Observações importantes

- **Sem fluxo de aprovação**: diferentemente do VFIN0200, títulos a receber não passam por aprovação. São criados como pendentes e podem ser baixados imediatamente.
- **Status possíveis**: pendente (âmbar), parcial (azul), pago (verde), cancelado (vermelho).
- **Recebimento parcial**: suportado nativamente. O hint no painel de baixa exibe o saldo restante.
- **Dashboard de aging**: idêntico ao VFIN0200, com faixas de a vencer, vencido 30d, 31–60d, 61–90d e +90d.
- **Integração fiscal**: títulos podem ser vinculados a NF-e de Saída (VFIS0200) para rastreabilidade.

##### Telas Relacionadas

| Tela | Por que se conecta |
|------|--------------------|
| **VFIN0100 (Contas Bancárias)** | Contas utilizadas para registrar o recebimento. |
| **VFIN0300 (Fluxo de Caixa)** | Alimenta o fluxo de caixa realizado com os recebimentos. |
| **VFIN0500 (Relatórios)** | Relatórios R09 (Aging Receber Detalhado) e R12 (Extrato por Cliente). |
| **VCLI0500 (Cadastro de Cliente)** | Origem dos clientes devedores referenciados nos títulos. |
| **VFIS0200 (NF-e de Saída)** | Notas fiscais de saída vinculadas aos títulos a receber. |
| **VEMP0100 (Cadastro Empresa)** | Empresa de contexto dos títulos. |

---

#### VFIN0300 — Fluxo de Caixa e Saldos

##### Objetivo

Fornecer uma visão consolidada da posição financeira da empresa através de três perspectivas (abas): **Realizado** (fluxo de caixa efetivo com métricas de entradas/saídas/saldo), **Projetado** (previsão futura de caixa) e **Saldos das Contas** (saldo atual de cada conta bancária do VFIN0100). Tela exclusivamente **consultiva** — não permite criação ou edição.

##### Pré-requisitos

- **VFIN0100 (Contas Bancárias)**: Para a aba "Saldos das Contas".
- **VFIN0200 (Contas a Pagar)**: Fonte de dados de saídas.
- **VFIN0210 (Contas a Receber)**: Fonte de dados de entradas.
- Os títulos precisam ter sido baixados (pagos/recebidos) para aparecerem na aba Realizado.

##### Passo a Passo

##### Aba Realizado

1. Acesse **Financeiro > Fluxo de Caixa e Saldos** (VFIN0300).
2. A aba **Realizado** é exibida por padrão.
3. Informe o **Início** (data inicial do período) e o **Fim** (data final do período).
4. Clique em **Consultar**.
5. O sistema exibe:
   - **Métricas no topo**: Entradas (verde), Saídas (vermelho) e Saldo (entradas − saídas).
   - **Tabela**: lista cronológica de lançamentos com Data, Tipo (pill verde = entrada, pill vermelho = saída), Descrição, Conciliação (Sim / Não) e Valor.
6. Para exportar, clique em **Exportar**.

##### Aba Projetado

7. Clique na aba **Projetado**.
8. Informe apenas o **Início** (data a partir da qual a projeção é calculada). Não há campo Fim.
9. Clique em **Consultar**.
10. O sistema exibe tabela com Vencimento, Tipo, Descrição e Valor dos lançamentos futuros previstos.

##### Aba Saldos das Contas

11. Clique na aba **Saldos das Contas**.
12. Não há parâmetros de data — os saldos são calculados automaticamente.
13. O sistema exibe:
    - **Métricas**: quantidade de contas cadastradas e saldo total somado.
    - **Tabela**: Banco, Descrição e Saldo Atual de cada conta do VFIN0100.

##### Campos (Parâmetros)

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Início | data | Não | — | Data inicial. Usado nas abas Realizado e Projetado. |
| Fim | data | Não | — | Data final. Usado apenas na aba Realizado. |

##### Observações importantes

- A aba **Realizado** contém lançamentos com indicador de **Conciliação** (Sim/Não), permitindo identificar quais transações já foram conferidas com o extrato bancário.
- A aba **Projetado** não possui campo de conciliação, pois trata de previsões futuras.
- Os saldos da aba **Saldos das Contas** são calculados a partir do saldo inicial cadastrado no VFIN0100 mais todas as baixas (pagamentos e recebimentos) registradas.
- Tela exclusivamente consultiva — todas as alterações de dados devem ser feitas nas telas de origem (VFIN0200 para pagamentos, VFIN0210 para recebimentos, VFIN0100 para cadastro de contas).

##### Telas Relacionadas

| Tela | Por que se conecta |
|------|--------------------|
| **VFIN0100 (Contas Bancárias)** | Fornece os saldos exibidos na aba "Saldos das Contas" e as contas usadas nas transações. |
| **VFIN0200 (Contas a Pagar)** | Origem dos lançamentos de saída (pagamentos) no fluxo realizado e projetado. |
| **VFIN0210 (Contas a Receber)** | Origem dos lançamentos de entrada (recebimentos) no fluxo realizado e projetado. |

---

#### VFIN0400 — Apuração de Impostos

##### Objetivo

Processar e exibir a apuração de impostos indiretos (ICMS, IPI, PIS, COFINS) por competência mensal. Os dados provêm das notas fiscais de entrada (VFIS0210, que geram créditos) e de saída (VFIS0200, que geram débitos). O resultado mostra o saldo a recolher (se positivo, em vermelho) ou crédito acumulado (se negativo, em verde).

##### Pré-requisitos

- **VFIS0200 (NF-e de Saída)**: Notas fiscais de saída devem estar emitidas para gerar débitos.
- **VFIS0210 (NF-e de Entrada)**: Notas fiscais de entrada devem estar aprovadas para gerar créditos.
- **VFIS0100 (Configuração Fiscal)**: Deve estar configurada com alíquotas, regime tributário e token Focus NFe.

##### Passo a Passo

1. Acesse **Financeiro > Apuração de Impostos** (VFIN0400).
2. Informe a **Competência** no formato YYYY-MM (ex: `2026-06` para junho de 2026). O padrão é o mês atual.
3. Escolha uma das duas ações:
   - **Consultar**: recupera uma apuração já processada anteriormente para esta competência.
   - **Apurar**: executa o cálculo dos impostos com base nos dados fiscais do período. O botão muda para "Apurando..." e fica desabilitado durante o processamento.
4. Após o processamento, a tabela de resultado exibe:

| Imposto | Saídas (Débito) | Entradas (Crédito) | Saldo a Recolher |
|---------|----------------|--------------------|--------------------|
| ICMS | R$ X.XXX,XX | R$ X.XXX,XX | R$ X.XXX,XX (cor) |
| IPI | R$ X.XXX,XX | R$ X.XXX,XX | R$ X.XXX,XX (cor) |
| PIS | R$ X.XXX,XX | R$ X.XXX,XX | R$ X.XXX,XX (cor) |
| COFINS | R$ X.XXX,XX | R$ X.XXX,XX | R$ X.XXX,XX (cor) |

5. O **Saldo a Recolher** é formatado com cor condicional:
   - **Vermelho**: saldo positivo (valor a recolher/pagar).
   - **Verde**: saldo negativo (crédito acumulado a compensar).
6. Para exportar os dados, clique em **Exportar**.

##### Campos

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Competência | texto | Sim | — | Período de apuração no formato YYYY-MM. Ex: `2026-06`. Validado por regex. |

##### Observações importantes

- A competência deve estar no formato exato `YYYY-MM` (4 dígitos do ano, hífen, 2 dígitos do mês). A validação é feita por expressão regular.
- O botão **Apurar** processa os cálculos assincronamente. Durante o processamento, ambos os botões (Consultar e Apurar) ficam desabilitados.
- Se a apuração já tiver sido processada anteriormente, use **Consultar** para recuperar os resultados sem recalcular.
- Os dados vêm exclusivamente das notas fiscais (entrada e saída). Certifique-se de que as notas do período estejam devidamente emitidas/aprovadas.
- Similar ao VFIS0340 (Apuração Simples Nacional) para empresas do regime Simples.

##### Telas Relacionadas

| Tela | Por que se conecta |
|------|--------------------|
| **VFIS0200 (NF-e de Saída)** | Gera os valores de débito (Saídas) para cada imposto. |
| **VFIS0210 (NF-e de Entrada)** | Gera os valores de crédito (Entradas) para cada imposto. |
| **VFIS0100 (Configuração Fiscal)** | Fornece alíquotas e regime tributário para os cálculos. |
| **VFIS0340 (Apuração Simples Nacional)** | Tela similar para empresas optantes pelo Simples Nacional. |

---

#### VFIN0500 — Relatórios Fiscais e Financeiros

##### Objetivo

Centralizar **19 relatórios** fiscais e financeiros em uma única interface. Utiliza sistema inteligente de parâmetros dinâmicos — conforme o relatório selecionado, os filtros exibidos se adaptam automaticamente (período, entidade, item ou nenhum). Oferece exportação adaptativa (formato chave-valor para fichas técnicas ou tabular para listagens).

##### Pré-requisitos

- Depende de dados de todas as telas de movimentação financeira (VFIN0200, VFIN0210), fiscal (VFIS0200, VFIS0210), módulo de produtos/estoque e produção.
- Para relatórios de aging (R09, R10): os títulos devem estar cadastrados nas respectivas telas.
- Para relatórios de extrato (R11, R12): IDs de fornecedor/cliente devem ser informados.

##### Passo a Passo

1. Acesse **Financeiro > Relatórios Fiscais e Financeiros** (VFIN0500).
2. No dropdown **Relatório**, selecione o relatório desejado (R01 a R19).
3. Os parâmetros de filtro se adaptam automaticamente conforme o tipo do relatório:
   - **Tipo `range` (período)**: exibe campos Início e Fim. Ex: R01–R05, R13–R15, R17–R19.
   - **Tipo `entity` (entidade)**: exibe campo de texto para ID + período. Ex: R11 (ID Fornecedor), R12 (ID Cliente).
   - **Tipo `item`**: exibe campo de texto para código do item. Ex: R16.
   - **Tipo `none` (sem filtro)**: não exibe filtros adicionais. Ex: R09, R10.
4. Preencha os parâmetros exibidos.
5. Clique em **Gerar**.
6. O resultado é exibido em formato adaptativo:
   - **Formato "single" (chave-valor)**: tabela com colunas Indicador e Valor. Usado para R16 (Ficha Técnica).
   - **Formato tabular**: colunas dinâmicas extraídas das chaves dos objetos retornados pela API.
7. Para exportar, clique em **Exportar**. O formato de exportação se adapta automaticamente ao tipo de resultado.

##### Relatórios Disponíveis

| Código | Nome | Tipo de Filtro | Descrição |
|--------|------|----------------|-----------|
| R01 | Livro de Entradas | Período | Registro de todas as notas fiscais de entrada no período. |
| R02 | Livro de Saídas | Período | Registro de todas as notas fiscais de saída no período. |
| R03 | Impostos das Saídas | Período | Detalhamento de impostos (ICMS/IPI/PIS/COFINS) sobre saídas. |
| R04 | Impostos das Entradas | Período | Detalhamento de impostos sobre entradas. |
| R05 | DRE (Demonstrativo de Resultado) | Período | Estrutura do plano de contas (VFIN0120) com receitas e despesas. |
| R09 | Aging Receber Detalhado | Sem filtro | Títulos a receber por faixa de vencimento, com nomes de clientes enriquecidos. |
| R10 | Aging Pagar Detalhado | Sem filtro | Títulos a pagar por faixa de vencimento, com nomes de fornecedores enriquecidos. |
| R11 | Extrato por Fornecedor | Entidade (ID Fornecedor) + Período | Movimentação financeira de um fornecedor específico. |
| R12 | Extrato por Cliente | Entidade (ID Cliente) + Período | Movimentação financeira de um cliente específico. |
| R13 | Produtos Vendidos | Período | Relatório de produtos vendidos com quantidades e valores. |
| R14 | Produtos Produzidos | Período | Relatório de produtos produzidos no período. |
| R15 | Histórico de Custos | Período | Evolução de custos dos produtos ao longo do tempo. |
| R16 | Ficha Técnica com Custo | Item (Código) | Detalhamento técnico e de custos de um item específico. |
| R17 | Curva ABC de Clientes | Período | Classificação ABC dos clientes por valor de compra. |
| R18 | Curva ABC de Produtos | Período | Classificação ABC dos produtos por faturamento. |
| R19 | Compras no Período | Período | Consolidação de todas as compras realizadas no período. |

##### Campos

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Relatório | seleção | Sim | R01 a R19 | Seleção do relatório desejado |
| Período Início | data | Condicional | — | Exibido para relatórios tipo `range` e `entity` |
| Período Fim | data | Condicional | — | Exibido para relatórios tipo `range` e `entity` |
| ID Fornecedor / Cliente / Item | texto | Condicional | — | Exibido para relatórios tipo `entity` (R11, R12) e `item` (R16) |

##### Observações importantes

- Ao trocar o relatório selecionado no dropdown, toda a área de filtros é resetada. Certifique-se de selecionar o relatório correto antes de preencher os parâmetros.
- Os relatórios R09 e R10 (Aging Detalhado) **enriquecem** os resultados com nomes de clientes e fornecedores, respectivamente, consultando serviços auxiliares do sistema. Isso torna a leitura mais amigável do que apenas IDs numéricos.
- O relatório R05 (DRE) depende diretamente da correta classificação do plano de contas (VFIN0120) — contas de receita e despesa devem estar com os tipos e naturezas corretos.
- O endpoint da API para cada relatório é construído dinamicamente a partir do código selecionado. A URL é montada no formato `/api/reports/...` com os parâmetros adequados.
- Para relatórios com grande volume de dados, o processamento pode levar alguns segundos. Aguarde a conclusão antes de exportar.

##### Telas Relacionadas

| Tela | Por que se conecta |
|------|--------------------|
| **VFIN0200 (Contas a Pagar)** | Fonte de dados para R10 (Aging Pagar), R11 (Extrato Fornecedor) e R19 (Compras). |
| **VFIN0210 (Contas a Receber)** | Fonte de dados para R09 (Aging Receber), R12 (Extrato Cliente) e R13 (Produtos Vendidos). |
| **VFIN0120 (Plano de Contas)** | Base para R05 (DRE). |
| **VFIS0200 (NF-e de Saída)** | Dados para R02 (Livro de Saídas), R03 (Impostos das Saídas). |
| **VFIS0210 (NF-e de Entrada)** | Dados para R01 (Livro de Entradas), R04 (Impostos das Entradas). |

---

## 5. Contabilidade

#### VCTB0102 — Cadastro Centro de Custo

##### Objetivo

Cadastrar centros de custo vinculados a empresas, permitindo a apropriação de despesas e receitas por área no módulo contábil. Complementa o cadastro financeiro de centros de custo (VFIN0130) adicionando o vínculo com empresa e controle de ativação.

##### Pré-requisitos

- **VEMP0100 (Cadastro Empresa)**: A empresa à qual o centro de custo será vinculado deve estar cadastrada.

##### Passo a Passo

1. Acesse **Contabilidade > Cadastro Centro de Custo** (VCTB0102).
2. Clique em **+ Novo**.
3. Informe o **Código** identificador do centro de custo.
4. Informe a **Descrição** (ex: "Administrativo Matriz", "Produção Filial SP").
5. Informe o **Empresa ID** da empresa à qual o centro pertence.
6. Selecione o **Tipo**: PRODUTIVO, ADMINISTRATIVO, COMERCIAL ou AUXILIAR.
7. O toggle **Ativo** vem ligado por padrão. Desligue-o apenas se o centro estiver temporariamente inativo.
8. Clique em **Salvar**.

##### Campos

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Código | texto | Sim | — | Código identificador do centro de custo |
| Descrição | texto | Sim | — | Nome descritivo do centro |
| Empresa ID | número | Sim | — | ID da empresa (VEMP0100) à qual o centro pertence |
| Tipo | seleção | Sim | PRODUTIVO / ADMINISTRATIVO / COMERCIAL / AUXILIAR | Classificação do centro |
| Ativo | toggle | Não | — | Status do centro (ativo/inativo) |

##### Observações importantes

- Este cadastro é complementar ao VFIN0130 (Centros de Custo do módulo financeiro). Ambos coexistem no sistema, mas o VCTB0102 adiciona o vínculo com empresa e o controle de ativação.
- O campo Ativo permite desabilitar temporariamente um centro de custo sem removê-lo da base de dados, preservando a integridade referencial de lançamentos passados.
- Centros de custo do tipo PRODUTIVO são os que normalmente recebem rateio de custos diretos de produção.

##### Telas Relacionadas

| Tela | Por que se conecta |
|------|--------------------|
| **VPLA0102 (Demandas Independentes)** | Referencia centros de custo para apropriação de demandas de produção. |
| **VFIN0130 (Centros de Custo — Financeiro)** | Cadastro complementar. Ambos alimentam a estrutura de rateio do sistema. |
| **VCTB0200 (Contabilidade SPED ECD)** | Compartilha a estrutura de centros de custo para lançamentos contábeis. |
| **VEMP0100 (Cadastro Empresa)** | Fornece as empresas às quais os centros são vinculados. |

---

#### VCTB0200 — Contabilidade SPED ECD

##### Objetivo

Gerenciar a contabilidade completa da empresa em conformidade com o SPED ECD (Escrituração Contábil Digital). Inclui: plano de contas hierárquico, lançamentos contábeis com partidas dobradas (débito e crédito) e balancete de verificação. Atende aos requisitos legais de escrituração contábil digital.

##### Pré-requisitos

- **VEMP0100 (Cadastro Empresa)**: Empresa deve estar cadastrada.
- **VCTB0102 (Cadastro Centro de Custo)**: Recomendado para apropriação dos lançamentos.
- Conhecimento de contabilidade (partidas dobradas, natureza das contas, plano de contas).

##### Passo a Passo

##### Plano de Contas

1. Acesse **Contabilidade > Contabilidade SPED ECD** (VCTB0200).
2. Utilize a ação **Gerenciar Plano** para cadastrar a estrutura hierárquica de contas.
3. Para cada conta, defina:
   - **Código**: hierárquico com notação de ponto (ex: `1.1.01`).
   - **Descrição**: nome da conta.
   - **Código Pai**: conta superior na hierarquia.
   - **Tipo**: RECEITA, DESPESA, ATIVO, PASSIVO ou PATRIMÔNIO.
   - **Natureza**: CRÉDITO ou DÉBITO.

##### Lançamentos Contábeis

4. Acesse a seção **Lançamentos**.
5. Para cada lançamento, preencha:
   - **Período**: data de referência do lançamento.
   - **Conta Débito**: código da conta a ser debitada.
   - **Conta Crédito**: código da conta a ser creditada.
   - **Valor**: valor do lançamento.
   - **Histórico**: descrição da operação.
   - **Data**: data efetiva do lançamento.
6. O sistema valida que o total de débitos seja igual ao total de créditos (partidas dobradas).

##### Balancete

7. Acesse a seção **Balancete** para visualizar a consolidação dos saldos por conta.
8. O balancete lista Conta e Saldo (devedor ou credor conforme a natureza).
9. Utilize **Exportar** para gerar o balancete em formato adequado para o SPED ECD.

##### Campos

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| **Plano de Contas** |||||
| Código | texto | Sim | — | Código hierárquico com notação de ponto |
| Descrição | texto | Sim | — | Nome da conta contábil |
| Código Pai | texto | Não | — | Conta superior na hierarquia |
| Tipo | seleção | Sim | RECEITA / DESPESA / ATIVO / PASSIVO / PATRIMÔNIO | Classificação contábil |
| Natureza | seleção | Sim | CRÉDITO / DÉBITO | Natureza do saldo |
| **Lançamentos** |||||
| Período | data | Sim | — | Período de referência |
| Conta Débito | texto | Sim | — | Código da conta debitada |
| Conta Crédito | texto | Sim | — | Código da conta creditada |
| Valor | número | Sim | — | Valor do lançamento |
| Histórico | texto | Sim | — | Descrição da operação contábil |
| Data | data | Sim | — | Data efetiva do lançamento |
| **Balancete** |||||
| Conta | texto | Não | — | Código da conta (calculado) |
| Saldo | número | Não | — | Saldo consolidado (calculado) |

##### Observações importantes

- A estrutura do plano de contas é similar à do VFIN0120 (Plano de Contas do módulo financeiro), porém com foco específico nas exigências do SPED ECD.
- Os lançamentos seguem o princípio das **partidas dobradas**: para cada débito, deve haver um crédito correspondente de igual valor.
- Natureza CRÉDITO: o saldo da conta aumenta com lançamentos a crédito e diminui com débitos (ex: contas de receita, passivo).
- Natureza DÉBITO: o saldo da conta aumenta com lançamentos a débito e diminui com créditos (ex: contas de despesa, ativo).
- O balancete é consolidado automaticamente a partir dos lançamentos registrados. Verifique-o periodicamente para assegurar a integridade contábil.

##### Telas Relacionadas

| Tela | Por que se conecta |
|------|--------------------|
| **VFIN0120 (Plano de Contas — Financeiro)** | Estrutura similar; as naturezas e tipos são compatíveis entre os módulos. |
| **VCTB0102 (Cadastro Centro de Custo)** | Centros de custo podem ser referenciados nos lançamentos contábeis. |
| **VFIN0200 (Contas a Pagar)** | Títulos a pagar podem gerar lançamentos contábeis quando baixados. |
| **VFIN0210 (Contas a Receber)** | Títulos a receber podem gerar lançamentos contábeis quando baixados. |

---

#### VUTL0555 — Cadastro UFs e Cidades

##### Objetivo

Manter a tabela base de Unidades Federativas (UFs) e municípios brasileiros com código IBGE. Esta é a **TABELA BASE UNIVERSAL** — todos os endereços do sistema (clientes, fornecedores, empresas, notas fiscais) utilizam este cadastro como referência. Sem este cadastro, não é possível criar nenhum registro que exija UF e Município.

##### Pré-requisitos

- Nenhum. Esta é uma das primeiras telas a ser populada, idealmente logo após VEMP0100 e VLOC0100.

##### Passo a Passo

1. Acesse **Contabilidade > Cadastro UFs e Cidades** (VUTL0555).
2. Clique em **+ Novo**.
3. Preencha:
   - **UF**: sigla da Unidade Federativa com 2 caracteres (ex: `SP`, `RJ`, `MG`).
   - **Nome UF**: nome por extenso do estado (ex: `São Paulo`, `Rio de Janeiro`).
   - **Cód. IBGE**: código IBGE do município com 7 dígitos (ex: `3550308` para São Paulo/SP).
   - **Município**: nome do município por extenso (ex: `São Paulo`).
4. Clique em **Salvar**.
5. Repita para cada município que será utilizado nos cadastros do sistema.

##### Campos

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| UF | texto | Sim | — | Sigla da Unidade Federativa (2 caracteres, ex: `SP`) |
| Nome UF | texto | Sim | — | Nome por extenso do estado (ex: `São Paulo`) |
| Cód. IBGE | texto | Não | — | Código IBGE do município com 7 dígitos (ex: `3550308`) |
| Município | texto | Sim | — | Nome do município (ex: `São Paulo`, `Campinas`) |

##### Observações importantes

- Esta tela é a **referência universal de endereços** do sistema. Qualquer cadastro que contenha campos de UF e Município (clientes, fornecedores, empresas, emitente fiscal, transportadoras) valida os dados contra esta tabela.
- O código IBGE de 7 dígitos é obrigatório para a correta emissão de NF-e (campo `cMun` no XML da nota fiscal).
- Recomenda-se popular esta tabela com os municípios de atuação da empresa antes de iniciar os cadastros operacionais.
- A tela está localizada no módulo Contabilidade, mas seu uso é **transversal a todo o ERP**.

##### Telas Relacionadas

| Tela | Por que se conecta |
|------|--------------------|
| **VCLI0500 (Cadastro de Cliente)** | Utiliza UFs e Cidades para endereços de cobrança, entrega e faturamento. |
| **VAVR0200 (Cadastro de Fornecedor)** | Utiliza UFs e Cidades para endereço do fornecedor. |
| **VEMP0100 (Cadastro Empresa)** | Utiliza UFs e Cidades para endereço da sede e filiais. |
| **VFIS0100 (Configuração Fiscal)** | Utiliza UFs e Cidades para endereço do emitente fiscal. |
| **VLOC0100 (Localização Países/UFs)** | Cadastro complementar de países e UFs com códigos internacionais. |

---

## 6. Cadastros

#### VEMP0100 — Cadastro Empresa

##### Objetivo

Cadastrar a empresa (matriz e filiais) no sistema. Esta é a tela de **FUNDAÇÃO do ERP** — sem empresa cadastrada, nenhum outro módulo funciona. Inclui validação de CNPJ em tempo real, regime tributário e endereço completo para SEFAZ.

##### Pré-requisitos

- **VUTL0555 (Cadastro UFs e Cidades)**: Para preenchimento de UF, Município e Cód. IBGE.
- **VLOC0100 (Localização Países/UFs)**: Para validação de UF.
- Ter em mãos: CNPJ, Razão Social, IE, IM e endereço completo da empresa.

##### Passo a Passo

1. Acesse **Cadastros > Cadastro Empresa** (VEMP0100).
2. Informe o **CNPJ** da empresa (apenas números, 14 dígitos).
   - O sistema valida os dígitos verificadores em tempo real e exibe ícone ✓ (válido) ou ✗ (inválido).
3. Informe a **Razão Social** completa (nome empresarial).
4. Informe opcionalmente o **Nome Fantasia**.
5. Informe a **IE** (Inscrição Estadual) e **IM** (Inscrição Municipal), se aplicável.
6. Selecione o **Regime Tributário**:
   - **1 — Simples Nacional**: para empresas optantes do Simples.
   - **2 — Lucro Presumido**: para empresas do regime presumido.
   - **3 — Lucro Real**: para empresas do regime real.
7. Informe a **UF** da sede (2 caracteres, auto-uppercase).
8. Preencha o endereço completo:
   - **Município** (conforme VUTL0555)
   - **Cód. IBGE** (7 dígitos, obrigatório para NF-e)
   - **CEP** (formato 00000-000)
   - **Logradouro**, **Número**, **Bairro**
9. Informe opcionalmente o **Telefone** de contato.
10. Se for uma **filial**, informe o **Matriz CNPJ** para vincular à empresa principal.
11. Clique em **Salvar**.

##### Campos

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| CNPJ | texto | Sim | — | CNPJ da empresa com validação de dígito verificador (✓/✗) |
| Razão Social | texto | Sim | — | Nome empresarial completo |
| Nome Fantasia | texto | Não | — | Nome fantasia da empresa |
| Inscrição Estadual (IE) | texto | Não | — | Inscrição Estadual |
| Inscrição Municipal (IM) | texto | Não | — | Inscrição Municipal |
| Regime Tributário | seleção | Sim | 1-Simples / 2-Lucro Presumido / 3-Lucro Real | Regime de tributação da empresa |
| UF | texto | Não | — | Sigla da UF da sede (auto-uppercase) |
| Município | texto | Não | — | Nome do município da sede |
| Cód. IBGE | texto | Não | — | Código IBGE do município (7 dígitos) |
| CEP | texto | Não | — | CEP da sede (formato 00000-000) |
| Logradouro | texto | Não | — | Nome da rua/avenida |
| Número | texto | Não | — | Número do endereço |
| Bairro | texto | Não | — | Bairro |
| Telefone | texto | Não | — | Telefone de contato |
| Matriz CNPJ | texto | Não | — | CNPJ da matriz (para cadastro de filiais) |

##### Observações importantes

- A validação de CNPJ utiliza o algoritmo de **dígito verificador módulo 11** padrão da Receita Federal. Um ícone verde (✓) indica CNPJ válido; ícone vermelho (✗) indica CNPJ inválido.
- O **Regime Tributário** é crítico para o comportamento de todo o sistema: empresas do Simples Nacional têm tratamento diferenciado em PIS/COFINS e ICMS (alíquotas unificadas via VFIS0340). Empresas de Lucro Presumido ou Real usam o regime não-cumulativo com alíquotas do VFIS0110.
- Para filiais, o campo **Matriz CNPJ** vincula a filial à sua matriz. Este vínculo é utilizado para consolidações fiscais e relatórios multi-empresa.
- Os campos de endereço seguem a especificação da SEFAZ para emissão de NF-e (Logradouro, Número, Bairro, Município, Cód. IBGE, CEP, UF).
- Esta tela deve ser a **primeira** a ser configurada no sistema. Sem empresa cadastrada, telas dependentes não carregam corretamente.

##### Telas Relacionadas

| Tela | Por que se conecta |
|------|--------------------|
| **VFIS0100 (Configuração Fiscal)** | A empresa é a base do emitente fiscal; o regime tributário define o comportamento fiscal. |
| **VFIN0100 (Contas Bancárias)** | As contas bancárias pertencem à empresa e são usadas nas baixas de VFIN0200/0210. |
| **VFIN0200 / VFIN0210 (Pagar/Receber)** | Os títulos financeiros são vinculados à empresa. |
| **VCTB0102 (Cadastro Centro de Custo)** | Centros de custo são vinculados a uma empresa. |
| **VUTL0555 (Cadastro UFs e Cidades)** | Fornece UF, Município e Cód. IBGE para o endereço. |
| **VCLI0500 (Cadastro de Cliente)** | Estrutura similar de validação de CNPJ/CPF. |

---

#### VFUN0100 — Cadastro Funcionário

##### Objetivo

Cadastrar os funcionários da empresa com controle de situação (ATIVO/INATIVO) e flags funcionais: participação em orçamento e designação como assistente técnico. Referenciado nos módulos de assistência técnica (VASS0201) e chamados (VATC0280).

##### Pré-requisitos

- Nenhum. Esta tela é autônoma.

##### Passo a Passo

1. Acesse **Cadastros > Cadastro Funcionário** (VFUN0100).
2. Clique em **+ Novo**.
3. O **Código** é gerado automaticamente pelo sistema (campo desabilitado).
4. Informe o **Nome** completo do funcionário.
5. Informe opcionalmente a **Função / Cargo** (ex: "Técnico de Campo", "Analista Financeiro").
6. Selecione a **Situação**: ATIVO ou INATIVO.
7. Marque os toggles conforme aplicável:
   - **Participa Orçamento**: se o funcionário participa da elaboração de orçamentos.
   - **Assistente Técnico**: se o funcionário atua como técnico de campo em assistências.
8. Clique em **Salvar**.
9. Para editar, selecione um registro na tabela, faça as alterações e clique em **Atualizar**.
10. Para desativar um funcionário sem excluí-lo, altere a Situação para INATIVO ou use **Desativar**.

##### Campos

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Código | número | Sim (auto) | — | Gerado automaticamente, não editável |
| Nome | texto | Sim | — | Nome completo do funcionário |
| Função / Cargo | texto | Não | — | Cargo ou função (ex: "Técnico de Campo") |
| Situação | seleção | Sim | ATIVO / INATIVO | Status do funcionário no sistema |
| Participa Orçamento | toggle | Não | — | Indica se o funcionário participa de orçamentos |
| Assistente Técnico | toggle | Não | — | Indica se o funcionário atua como assistente técnico |

##### Observações importantes

- O **Código** é gerado automaticamente e não pode ser alterado durante a edição.
- A flag **Assistente Técnico** é utilizada como filtro nas telas VASS0201 (Cadastro de Chamado) e VATC0280 (Cadastro de Chamados): apenas funcionários com esta flag ativa podem ser designados como técnicos executores.
- A flag **Participa Orçamento** controla a visibilidade do funcionário nos módulos de orçamentação.
- Funcionários INATIVOS não aparecem nas listas de seleção das telas dependentes, mas permanecem na base para preservar o histórico.

##### Telas Relacionadas

| Tela | Por que se conecta |
|------|--------------------|
| **VASS0201 (Cadastro de Chamado de Assistência)** | Seleciona assistente técnico dentre funcionários com a flag ativa. |
| **VATC0280 (Cadastro de Chamados)** | Seleciona técnico executor dentre funcionários habilitados. |
| **VMAN0202 (Apontamento de Ordens de Serviço)** | Seleciona executor da manutenção dentre funcionários. |

---

#### VLOC0100 — Localização Países/UFs

##### Objetivo

Manter a base geográfica universal do sistema: países (com códigos DDI, BACEN e SISCOMEX) e Unidades Federativas (UFs com sigla, nome, vínculo com país e código IBGE). É a referência primária para todas as regras de endereço e localização.

##### Pré-requisitos

- Nenhum. Esta tela é uma das primeiras a ser populada.

##### Passo a Passo

##### Aba Países

1. Acesse **Cadastros > Localização Países/UFs** (VLOC0100).
2. Na aba **Países**, clique em **Adicionar**.
3. Informe:
   - **Sigla**: até 3 caracteres, forçado uppercase (ex: `BRA`, `USA`, `ARG`).
   - **Nome**: nome do país (ex: `Brasil`, `Estados Unidos`).
   - **DDI**: código de Discagem Direta Internacional (ex: `55` para Brasil).
   - **BACEN**: código do Banco Central do Brasil (ex: `1058` para Brasil).
   - **SISCOMEX**: código no Sistema Integrado de Comércio Exterior.
4. Clique em **Atualizar** para salvar.

##### Aba UFs

5. Clique na aba **UFs**.
6. Clique em **Adicionar**.
7. Informe:
   - **Sigla**: 2 caracteres, uppercase (ex: `SP`, `RJ`). **Não pode ser alterada após a criação.**
   - **Nome**: nome da UF (ex: `São Paulo`).
   - **País ID**: número do país ao qual a UF pertence (referência da aba Países).
   - **Cód. IBGE**: código IBGE da UF com 2 dígitos (ex: `35` para São Paulo).
8. Clique em **Atualizar**.

##### Campos

##### Países

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Sigla | texto | Sim | — | Sigla do país, máx. 3 caracteres uppercase (ex: `BRA`) |
| Nome | texto | Sim | — | Nome do país (ex: `Brasil`) |
| DDI | texto | Não | — | Código de Discagem Direta Internacional |
| BACEN | texto | Não | — | Código do país no Banco Central |
| SISCOMEX | texto | Não | — | Código no SISCOMEX para comércio exterior |

##### UFs

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Sigla | texto | Sim | — | Sigla da UF, 2 caracteres uppercase (ex: `SP`). Desabilitada na edição. |
| Nome | texto | Sim | — | Nome da UF (ex: `São Paulo`) |
| País ID | número | Sim | — | ID do país ao qual a UF pertence |
| Cód. IBGE | texto | Não | — | Código IBGE da UF com 2 dígitos (ex: `35`) |

##### Observações importantes

- A sigla da UF **não pode ser alterada** após a criação (campo desabilitado na edição). Em caso de erro, é necessário excluir e recriar o registro.
- Os códigos BACEN e SISCOMEX são utilizados em operações de importação/exportação e transações internacionais.
- Esta tela é base para as regras de endereço em todo o sistema. Países e UFs aqui cadastrados alimentam os dropdowns de seleção em todos os cadastros que envolvem endereço.

##### Telas Relacionadas

| Tela | Por que se conecta |
|------|--------------------|
| **VUTL0555 (Cadastro UFs e Cidades)** | Complementa com o cadastro de municípios dentro de cada UF. |
| **VCLI0500 (Cadastro de Cliente)** | Utiliza países e UFs para endereços de clientes. |
| **VAVR0200 (Cadastro de Fornecedor)** | Utiliza países e UFs para endereços de fornecedores. |
| **VEMP0100 (Cadastro Empresa)** | Utiliza UF para endereço da sede. |
| **VFIS0100 (Configuração Fiscal)** | Utiliza UF do emitente. |

---

#### VCLA0100 — Classificação Itens

##### Objetivo

Cadastrar classificações hierárquicas de itens com máscaras de formatação (ex: `99.99.99`). Opera em dois níveis: **Máscaras** (templates de codificação) e **Classificações** (categorias dentro de cada máscara, com hierarquia via Código Pai). Utilizado pelo cadastro de itens (VENT0200) e por regras de restrição de venda (VCLI0117).

##### Pré-requisitos

- Nenhum. Esta tela é autônoma.

##### Passo a Passo

##### Criar Máscara

1. Acesse **Cadastros > Classificação Itens** (VCLA0100).
2. Na seção de **Máscaras**, preencha:
   - **Descrição**: nome da máscara (ex: "Classificação Padrão 3 Níveis").
   - **Máscara**: formato da codificação (ex: `99.99.99` para três níveis com dois dígitos cada, ou `9.99.999` para níveis variados).
3. Clique no botão de ação da máscara para salvar.

##### Criar Classificações

4. Selecione uma máscara existente na lista.
5. Na seção de **Classificações**, para cada categoria:
   - **Código**: código da classificação conforme o formato da máscara (ex: `01.01.01`).
   - **Descrição**: nome da classificação (ex: "Móveis de Madeira").
   - **Código Pai**: se a classificação pertence a um nível superior, informe o código da classificação pai (ex: para `01.01.01`, o pai seria `01.01`).
6. Clique no botão de ação para salvar cada classificação.

##### Campos

##### Máscaras

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Descrição | texto | Sim | — | Nome descritivo da máscara |
| Máscara (Formato) | texto | Sim | — | Formato da codificação (ex: `99.99.99`) |

##### Classificações

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Código | texto | Sim | — | Código da classificação conforme a máscara |
| Descrição | texto | Sim | — | Nome da classificação |
| Código Pai | texto | Não | — | Código da classificação superior na hierarquia |

##### Observações importantes

- O formato da máscara utiliza `9` para representar dígitos numéricos. Ex: `99.99.99` = três níveis com dois dígitos cada.
- A hierarquia de classificações permite até 3 níveis (nível 1 → nível 2 → nível 3), controlados pelo Código Pai.
- As classificações são utilizadas para agrupar itens com características similares, facilitando buscas e relatórios.
- Alterações nas classificações após itens já estarem vinculados devem ser feitas com cautela.

##### Telas Relacionadas

| Tela | Por que se conecta |
|------|--------------------|
| **VENT0200 (Cadastro de Itens)** | Itens são vinculados a classificações para categorização. |
| **VCLI0117 (Permissões e Restrições de Venda)** | Regras de restrição podem ser baseadas em classificações de itens. |

---

#### VCAL0100 — Calendário Industrial

##### Objetivo

Gerenciar o calendário industrial da empresa, definindo quais dias do ano são úteis (trabalhados) e quais são não úteis (feriados, paradas programadas). Essencial para validação de datas de entrega em VPLA0102 (Demandas Independentes), planejamento em VPME0102ITE e VENT0108.

##### Pré-requisitos

- Nenhum. Esta tela é autônoma, mas deve ser configurada antes dos módulos de planejamento.

##### Passo a Passo

1. Acesse **Cadastros > Calendário Industrial** (VCAL0100).
2. Use os filtros de **Ano** e **Mês** para selecionar o período a visualizar/configurar.
3. Clique em **Ver** para carregar o grid do mês selecionado.
4. Para cada dia do mês (1 a 31), configure:
   - **Dia**: número do dia (preenchido automaticamente).
   - **Dia útil?**: toggle — ligado para dia útil, desligado para dia não útil (feriado, parada).
   - **Descrição**: opcional, para identificar o evento (ex: "Feriado Nacional", "Parada Manutenção").
5. Clique em **Registrar dia** para salvar cada registro.
6. O sistema exibe métricas consolidadas: **dias úteis**, **dias não úteis** e **total de dias registrados**.
7. Dias **não registrados** são considerados como dias úteis pelo sistema.

##### Campos

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Ano | número | Não (filtro) | — | Ano de referência do calendário |
| Mês | seleção | Não (filtro) | Jan a Dez | Mês de referência do calendário |
| Dia | número | Sim | 1 a 31 | Dia do mês |
| Dia útil? | toggle | Não | — | Indica se o dia é útil (ligado) ou não útil (desligado) |
| Descrição | texto | Não | — | Descrição do evento (ex: "Feriado Nacional") |

##### Observações importantes

- **Dias não registrados** (ausentes na tabela) são considerados automaticamente como dias úteis pelo sistema. Para marcar um dia como não útil, é necessário registrá-lo com o toggle desligado.
- As métricas (úteis/não úteis/registrados) são calculadas dinamicamente conforme o mês e ano selecionados.
- O calendário é a **fonte da verdade** para validação de datas em VPLA0102: ao cadastrar uma demanda independente, o sistema verifica se a data informada é um dia útil conforme este calendário.
- Recomenda-se configurar o ano inteiro de uma só vez durante a implantação, marcando todos os feriados nacionais, estaduais e municipais, além de paradas programadas (férias coletivas, manutenção).

##### Telas Relacionadas

| Tela | Por que se conecta |
|------|--------------------|
| **VPLA0102 (Demandas Independentes)** | Valida se a data informada é dia útil com base neste calendário. |
| **VPME0102ITE (Calendário Promessa por Item)** | Herda os dias não úteis definidos aqui como base para o calendário por item. |
| **VENT0108 (Calendário Financeiro/Industrial)** | Calendário complementar no módulo de engenharia, com interface de grid mensal. |
| **VPRE0102 (Bloqueio de Previsão de Vendas)** | Períodos de bloqueio de previsão podem ser influenciados pelo calendário. |

---

#### VPRI0100 — Prioridade Ordens

##### Objetivo

Definir níveis de prioridade para ordens de produção, utilizados pelo sistema APS (Advanced Planning and Scheduling) no sequenciamento da produção. Cada prioridade possui um nome, descrição e intervalo numérico que determina sua posição na fila de produção.

##### Pré-requisitos

- Nenhum. Esta tela é autônoma.

##### Passo a Passo

1. Acesse **Cadastros > Prioridade Ordens** (VPRI0100).
2. Clique em **Adicionar**.
3. Informe a **Prioridade** (ex: `Urgente`, `Alta`, `Normal`, `Baixa`).
4. Informe opcionalmente uma **Descrição** explicativa.
5. Defina o **Início Intervalo** e o **Fim Intervalo**:
   - O intervalo numérico posiciona a prioridade na escala de classificação.
   - Ex: Urgente = 1–10, Alta = 11–30, Normal = 31–70, Baixa = 71–100.
   - O sistema valida que **Fim ≥ Início**.
6. Clique no botão de ação para salvar.
7. A tabela exibe as prioridades ordenadas pelo Início Intervalo.

##### Campos

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Prioridade | texto | Sim | — | Nome da prioridade (ex: `Urgente`, `Normal`) |
| Descrição | texto | Não | — | Descrição explicativa da prioridade |
| Início Intervalo | número | Não | — | Valor inicial do intervalo de classificação |
| Fim Intervalo | número | Não | — | Valor final do intervalo (deve ser ≥ Início) |

##### Observações importantes

- Os intervalos numéricos definem a ordenação relativa entre prioridades. Ordens de produção com valores dentro de intervalos mais baixos (ex: 1–10) são sequenciadas antes das de intervalos mais altos (ex: 71–100).
- O sistema valida que o **Fim Intervalo** seja maior ou igual ao **Início Intervalo**.
- Intervalos podem ser sobrepostos entre prioridades diferentes? **Não recomendado** — o comportamento do APS em caso de sobreposição é indefinido. Mantenha os intervalos mutuamente exclusivos.
- Esta tela é utilizada pelo módulo de produção (APS) e impacta diretamente a ordem de fabricação no chão de fábrica.

##### Telas Relacionadas

| Tela | Por que se conecta |
|------|--------------------|
| **VPRO0100 (Ordens de Produção — APS)** | Utiliza as prioridades para sequenciar as ordens de produção. |
| **VPLA0102 (Demandas Independentes)** | Demandas podem herdar prioridades que influenciam o sequenciamento. |

---

## 7. Glossário de Termos

| Termo | Definição |
|-------|-----------|
| **Aging** | Análise de vencimentos agrupados por faixa de dias (a vencer, vencido 30, 60, 90, +90 dias). |
| **APS** | Advanced Planning and Scheduling — sistema de sequenciamento e planejamento avançado da produção. |
| **Baixa** | Registro do pagamento (Contas a Pagar) ou recebimento (Contas a Receber) de um título financeiro. |
| **Baixa Parcial** | Pagamento ou recebimento de valor inferior ao saldo total do título, mantendo-o em aberto pelo restante. |
| **Balancete** | Relatório contábil que consolida os saldos de todas as contas, verificando que o total de débitos é igual ao total de créditos. |
| **Centro de Custo** | Unidade organizacional para apropriação e rateio de despesas e receitas (ex: Produção, Administrativo, Comercial). |
| **Competência** | Período mensal de apuração de impostos, no formato YYYY-MM. |
| **Conciliação** | Conferência de lançamentos financeiros com o extrato bancário, marcando-os como conferidos (Sim/Não). |
| **DRE** | Demonstrativo de Resultado do Exercício — relatório contábil que confronta receitas e despesas para apurar o lucro ou prejuízo do período. |
| **Natureza (Contábil)** | Propriedade da conta que define como seu saldo se comporta: CRÉDITO (aumenta com crédito) ou DÉBITO (aumenta com débito). |
| **Partidas Dobradas** | Princípio contábil fundamental: para cada débito em uma conta, deve haver um crédito de igual valor em outra conta. |
| **Plano de Contas** | Estrutura hierárquica de contas contábeis classificadas por tipo (Receita, Despesa, Ativo, Passivo, Patrimônio) e natureza. |
| **Rateio** | Distribuição de um valor de despesa ou receita entre múltiplos centros de custo. |
| **Regime Tributário** | Enquadramento fiscal da empresa: Simples Nacional, Lucro Presumido ou Lucro Real. |
| **SPED ECD** | Sistema Público de Escrituração Digital — Escrituração Contábil Digital. Obrigação acessória que transmite dados contábeis ao Fisco. |
| **Título** | Documento financeiro que representa uma obrigação de pagar (Contas a Pagar) ou um direito de receber (Contas a Receber). |

---

## 8. Perguntas Frequentes (FAQ)

**P: Em que ordem devo cadastrar as telas pela primeira vez?**
R: Siga rigorosamente a ordem: VEMP0100 → VLOC0100 → VUTL0555 → VCAL0100 → VFIN0100 → VFIN0110 → VFIN0120 → VFIN0130/VCTB0102. Consulte a seção 2.1 para detalhes.

**P: Como faço para pagar uma conta parcialmente?**
R: No VFIN0200, localize o título aprovado, clique em **Baixar** e informe um **Valor Pago** menor que o saldo restante. O sistema manterá o título em aberto pelo valor remanescente, permitindo novas baixas futuras.

**P: Uma NF-e de Entrada aprovada gera automaticamente conta a pagar?**
R: Sim. Quando uma NF-e de Entrada é aprovada no VFIS0210, o sistema automaticamente cria um título a pagar no VFIN0200 com os dados da nota. Esta é uma integração crítica entre os módulos Fiscal e Financeiro.

**P: O que significam as cores no dashboard de aging?**
R: As cores são informativas por faixa — tons de verde para títulos a vencer, amarelo/âmbar para vencidos recentes (até 30d), laranja para 31–60d e vermelho para vencidos há mais de 60 dias. Não são os status dos títulos individuais.

**P: Qual a diferença entre VFIN0130 e VCTB0102?**
R: Ambas cadastram centros de custo. O VFIN0130 é do módulo financeiro (código + descrição + tipo). O VCTB0102 é do módulo contábil e adiciona vínculo com empresa e controle de Ativo/Inativo. São complementares.

**P: Por que a apuração de impostos (VFIN0400) mostra saldo negativo em verde?**
R: Saldo negativo significa que a empresa acumulou mais créditos do que débitos no período (as entradas superaram as saídas). O valor negativo em verde indica **crédito acumulado** que pode ser compensado em períodos futuros.

**P: Os relatórios do VFIN0500 demoram para carregar. É normal?**
R: Sim, especialmente relatórios que processam grandes volumes de dados (R01–R04, R09–R10, R17–R18). O tempo depende do volume de movimentações no período selecionado. Aguarde a conclusão antes de trocar de relatório.

**P: Um título cancelado pode ser reativado?**
R: Não. O cancelamento é definitivo. Se um título foi cancelado por engano, é necessário criar um novo título com os mesmos dados.

---

> **Documento atualizado em Junho de 2026.** Para dúvidas não cobertas por esta documentação, entre em contato com o suporte técnico do ERP Venture.


---

## Processo Industrial e Produção


**ERP Venture** · Módulo Industrial
Engenharia · Planejamento · Manutenção · Suprimento · Importação · Inspeção · Previsão · Assistência · Garantia

---

## Fluxo Macro do Produto

```
ENGENHARIA          PLANEJAMENTO        SUPRIMENTO         INSPEÇÃO           ESTOQUE           COMERCIAL           EXPEDIÇÃO
VENT0200 ──────► VPLA0102 ──────► VPDC0200 ──────► VINS0200 ──────► VENT0800 ──────► VPDV0200 ──────► VEXP0100
  Item               Demanda            Pedido             Roteiro            Saldo             Pedido             Carga
  │                  Independente       Compra             Inspeção           Estoque           Venda              Remessa
  │
  └─► VENT0210 (Estrutura)
  └─► VENT0202 (Roteiro Fabricação)
  └─► VENT0115 (Roteiro Padrão)
  └─► VITE0313 (Máscara Config.)
  └─► VITE0118 (Regras Config.)
```

O produto nasce na **Engenharia** (VENT0200), onde recebe código, estrutura e roteiro. Planejado via **MRP/MPS** (VPLA0102), dispara ordens de compra em **Suprimentos** (VPDC0200). Ao chegar, passa por **Inspeção** (VINS0200) e é estocado (VENT0800). Vendido (VPDV0200) e expedido (VEXP0100), fecha o ciclo.

---

## 1. ENGENHARIA

#### VENT0200 — Cadastro de Itens

##### Objetivo
Cadastrar, consultar e manter todos os itens do sistema (matérias-primas, semiacabados, acabados, serviços e insumos). É a tela de cadastro mais complexa do ERP Venture, centralizando informações de engenharia, estoque, planejamento, comercial, contábil/fiscal e suprimentos em sete abas.

##### Pré-requisitos
- Empresa cadastrada no sistema.
- Para itens do tipo Fabricado: Estrutura de Produtos (VENT0210) e Roteiro de Fabricação (VENT0202) devem existir.
- Para itens configurados: Grupo PDM (VENT0204), Modificadores (VITE0115) e Atributos (VITE0116) devem estar parametrizados.
- Para itens de suprimentos: Fornecedores (VAVR0200) e Contratos (VCON0200) cadastrados.

##### Passo a passo

1. Acesse **VENT0200** pelo menu _Engenharia > Cadastro de Itens_.
2. Clique em **Novo** (F2).
3. Na aba **Capa**, preencha ao menos: **Código**, **Nome** e **Descrição** (campos obrigatórios).
4. Selecione o **Grupo PDM** e o **Modificador PDM** se o item pertencer a uma família de configurados.
5. Defina o **Status de Saúde** do item: _Normal_, _Crítico_ ou _Obsoleto_.
6. Marque os flags aplicáveis: _Genérico_, _Configurado_, _Item Base_, _Processo_.
7. Na aba **Estoque**, defina almoxarifado padrão, unidade de medida (UN, KG, M, M², M³, L, CX, PC, GL, PAR) e parâmetros de contagem cíclica (intervalo em dias, estoque mínimo, baixa automática).
8. Na aba **Engenharia**, defina o **tipo** do item (Fabricado, Comprado, Terceirizado, Serviço), a **estrutura** (Simples, Fantasma, Conjunto, Subconjunto), o item base para referência OEM, peso bruto, peso líquido e volume cúbico.
9. Na aba **Planejamento**, escolha o **tipo de planejamento** (MRP, MPS, Kanban, Min-Max, Ponto de Reposição, Carro a Carro, Protótipo), classificação ABC, lotes, estoques de segurança, tempos de produção e flags (Crítico, Exclusivo, Fantasma).
10. Na aba **Comercial**, preencha descrição comercial, tipo de venda (Venda, Revenda), múltiplos de venda, garantia em dias e flags.
11. Na aba **Contábil**, defina classificações fiscais: origem (0-Nacional, 1-Estrangeira Importação, 2-Estrangeira adquirida no mercado interno), NCM, alíquotas de IPI, ICMS, CEST e PIS/COFINS.
12. Na aba **Suprimentos**, configure unidade de medida de suprimento, almoxarifado padrão para suprimentos, tipo de utilização (Industrialização, Consumo, Imobilizado), checklist de recebimento e safra.
13. Clique em **Salvar** (F9).

##### Campos

| Campo | Aba | Tipo | Obrigatório | Descrição |
|-------|-----|------|-------------|-----------|
| Código | Capa | Texto (30) | Sim | Código único do item no sistema |
| Nome | Capa | Texto (120) | Sim | Nome reduzido do item |
| Descrição | Capa | Texto (255) | Sim | Descrição completa do item |
| Grupo PDM | Capa | Select | Não | Família PDM à qual o item pertence |
| Modificador PDM | Capa | Select | Não | Modificador dentro do grupo PDM |
| Saúde | Capa | Select | Sim | Normal / Crítico / Obsoleto |
| Genérico | Capa | Checkbox | Não | Item serve como template para configurados |
| Configurado | Capa | Checkbox | Não | Item gerado via configurador PDM |
| Item Base | Capa | Checkbox | Não | Item de referência para a família |
| Processo | Capa | Checkbox | Não | Item representa uma etapa de processo |
| Almoxarifado | Estoque | Select | Não | Almoxarifado padrão para movimentações |
| Unidade de Medida | Estoque | Select | Sim | UN / KG / M / M² / M³ / L / CX / PC / GL / PAR |
| Baixa Automática | Estoque | Checkbox | Não | Baixa estoque automaticamente na produção |
| Contagem Cíclica | Estoque | Checkbox | Não | Habilita contagem cíclica para o item |
| Intervalo (dias) | Estoque | Number | Não | Intervalo entre contagens cíclicas |
| Estoque Mínimo | Estoque | Number | Não | Quantidade mínima antes de disparar alerta |
| Tipo | Engenharia | Select | Sim | Fabricado / Comprado / Terceirizado / Serviço |
| Estrutura | Engenharia | Select | Não | Simples / Fantasma / Conjunto / Subconjunto |
| Item Base | Engenharia | Select | Não | Item OEM de referência |
| OEM | Engenharia | Texto (30) | Não | Código do fabricante original |
| Peso Bruto | Engenharia | Number | Não | Peso bruto em KG |
| Peso Líquido | Engenharia | Number | Não | Peso líquido em KG |
| Volume Cúbico | Engenharia | Number | Não | Volume em M³ |
| Tipo Planejamento | Planejamento | Select | Sim | MRP / MPS / Kanban / Min-Max / Ponto Reposição / Carro a Carro / Protótipo |
| Classificação | Planejamento | Select | Não | Classificação ABC (A, B, C) |
| Lote Mínimo | Planejamento | Number | Não | Tamanho mínimo de lote de produção/compra |
| Lote Múltiplo | Planejamento | Number | Não | Múltiplo para arredondamento de lotes |
| Estoque Segurança | Planejamento | Number | Não | Quantidade de estoque de segurança |
| Lead Time (dias) | Planejamento | Number | Não | Tempo total de ressuprimento |
| Baixa Produção | Planejamento | Checkbox | Não | Habilita baixa automática na produção |
| Crítico | Planejamento | Checkbox | Não | Item crítico para planejamento |
| Exclusivo | Planejamento | Checkbox | Não | Item de uso exclusivo |
| Fantasma | Planejamento | Checkbox | Não | Item fantasma no planejamento |
| Descrição Comercial | Comercial | Texto (255) | Não | Descrição para documentos comerciais |
| Tipo Venda | Comercial | Select | Não | Venda / Revenda |
| Múltiplo Venda | Comercial | Number | Não | Quantidade múltipla para venda |
| Garantia (dias) | Comercial | Number | Não | Prazo de garantia em dias |
| Almoxarifado Venda | Comercial | Select | Não | Almoxarifado padrão para vendas |
| Origem | Contábil | Select | Sim | 0-Nacional / 1-Estrangeira Importação / 2-Estrangeira Mercado Interno |
| NCM | Contábil | Texto (10) | Não | Nomenclatura Comum do Mercosul |
| Alíquota IPI | Contábil | Number | Não | Alíquota de IPI (%) |
| Alíquota ICMS | Contábil | Number | Não | Alíquota de ICMS (%) |
| CEST | Contábil | Texto (10) | Não | Código Especificador da Substituição Tributária |
| PIS | Contábil | Number | Não | Alíquota de PIS (%) |
| COFINS | Contábil | Number | Não | Alíquota de COFINS (%) |
| UM Suprimento | Suprimentos | Select | Não | Unidade de medida para compras |
| Almoxarifado Supr. | Suprimentos | Select | Não | Almoxarifado padrão para recebimento |
| Tipo Utilização | Suprimentos | Select | Não | Industrialização / Consumo / Imobilizado |
| Checklist | Suprimentos | Texto (500) | Não | Instruções de conferência no recebimento |
| Safra | Suprimentos | Texto (20) | Não | Identificação de safra para itens agrícolas |

##### Observações importantes
- O campo **Saúde** com valor _Crítico_ ou _Obsoleto_ altera o comportamento do MRP e pode bloquear novas ordens de compra/venda.
- Itens com flag **Configurado** exigem máscara gerada via VITE0313 e regras de configuração via VITE0118 antes do uso em planejamento.
- A aba **Planejamento** controla como o MRP/MPS trata o item; alterações aqui impactam diretamente a geração de ordens.
- O **Tipo de Utilização** em Suprimentos afeta a contabilização do item (custo vs. despesa vs. ativo imobilizado).
- Itens do tipo **Serviço** não possuem estoque físico — a aba Estoque é ocultada automaticamente.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VENT0210 | Estrutura de Produtos — vincula componentes ao item fabricado |
| VENT0202 | Roteiro de Fabricação — define operações necessárias ao item |
| VENT0204 | Grupo PDM — famílias para itens configurados |
| VITE0313 | Geração Máscara Itens Config. — cria máscaras para itens configurados |
| VITE0118 | Regras Itens Configurados — regras de mapeamento contábil/comercial |
| VPLA0102 | Demandas Independentes — o item aparece como opção para demanda |
| VPDC0200 | Pedido de Compra — itens comprados são referenciados aqui |
| VINS0200 | Roteiro Inspeção — itens recebidos passam por inspeção |
| VENT0800 | Saldo Estoque — consulta posição de estoque do item |

---

#### VENT0210 — Estrutura de Produtos (BOM)

##### Objetivo
Manter a lista de materiais (Bill of Materials) dos itens fabricados, representando hierarquicamente os componentes, subconjuntos e matérias-primas necessários à produção. Utiliza árvore hierárquica com navegação via breadcrumb, grid inline editável e painel de detalhe lateral.

##### Pré-requisitos
- Item pai cadastrado em VENT0200 com Tipo = Fabricado e Estrutura diferente de Fantasma.
- Componentes cadastrados em VENT0200.

##### Passo a passo

1. Acesse **VENT0210** pelo menu _Engenharia > Estrutura de Produtos_.
2. Informe o **Item Pai** no campo de pesquisa e pressione Enter.
3. A árvore hierárquica será carregada exibindo o nível 0 (item pai).
4. Para adicionar um componente, clique no item pai e depois no botão **Inserir Filho** ou digite diretamente na última linha do grid editável.
5. Preencha: **Item Componente**, **Quantidade**, **Unidade de Medida** e flags.
6. O marcador **•** (bolinha) indica que a linha ainda não foi salva. Salve pressionando F9.
7. Navegue pela hierarquia usando **duplo clique** em itens que possuem o marcador **↩** (tem filhos) — comportamento drill-down.
8. Use o **breadcrumb** no topo da árvore para retornar a níveis superiores.
9. Ao selecionar uma linha, o **painel de detalhe lateral** exibe informações completas do componente.
10. A **cor de saúde** do item é exibida na árvore (verde = Normal, amarelo = Crítico, vermelho = Obsoleto).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Item Pai | Select | Sim | Item que será produzido |
| Item Componente | Select | Sim | Componente filho na estrutura |
| Quantidade | Number | Sim | Quantidade necessária do componente para 1 unidade do pai |
| Unidade de Medida | Select | Sim | UN da quantidade |
| Sequência | Number | Não | Ordem de exibição na estrutura |
| Fantasma | Checkbox | Não | Componente fantasma — não gera necessidade MRP |
| Alternativo | Checkbox | Não | Componente alternativo/substituto |
| Observação | Texto (255) | Não | Notas sobre o vínculo |

##### Observações importantes
- **Itens Fantasma** na estrutura são ignorados pelo MRP — suas necessidades são "explodidas" para o nível inferior.
- O **painel lateral** mostra: código, nome, tipo, estrutura, unidade de medida, lead time e saldo atual.
- A edição inline permite alterar quantidade e flags sem abrir modais — ideal para ajustes rápidos.
- Estruturas muito profundas (acima de 10 níveis) podem impactar a performance do MRP.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VENT0200 | Origem dos itens pai e componentes |
| VENT0202 | Roteiro de Fabricação — operações que consomem os componentes |
| VPLA0102 | Demandas Independentes — dispara cálculo MRP sobre a estrutura |
| VENT0363 | Relatório Tempo CT — calcula tempos com base na estrutura |

---

#### VENT0204 — Cadastro de Grupo PDM

##### Objetivo
Cadastrar os grupos (famílias) PDM que agrupam itens configurados com características e variáveis comuns. O grupo PDM é o primeiro nível da hierarquia de configuração.

##### Pré-requisitos
- Empresa cadastrada no sistema.

##### Passo a passo

1. Acesse **VENT0204** pelo menu _Engenharia > Grupos PDM_.
2. Clique em **Novo** (F2).
3. Informe o **Código** do grupo (alfanumérico, até 10 caracteres).
4. Selecione a **Empresa** à qual o grupo pertence.
5. Preencha a **Descrição** do grupo (ex.: "Família Bombas Centrífugas").
6. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Código | Texto (10) | Sim | Identificador único do grupo PDM |
| Empresa | Select | Sim | Empresa proprietária do grupo |
| Descrição | Texto (120) | Sim | Nome descritivo do grupo PDM |

##### Observações importantes
- O grupo PDM é a entidade raiz do configurador. Sem ele, não é possível criar modificadores nem atributos.
- Um mesmo grupo pode ser usado por múltiplos itens configurados da mesma família.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VENT0200 | Vincula item ao grupo no campo Grupo PDM |
| VITE0114 | Grupos PDM (tema azul) — versão alternativa de cadastro com vínculo empresa/item base |
| VITE0115 | Modificadores PDM — modificadores dentro deste grupo |
| VITE0116 | Atributos PDM — atributos de modificadores dentro deste grupo |
| VITE0118 | Regras Itens Configurados — regras baseadas nos atributos do grupo |

---

#### VENT0202 — Roteiro de Fabricação

##### Objetivo
Definir a sequência de operações necessárias para fabricar um item específico, vinculando cada operação a um Centro de Trabalho (CT), tempo de execução e número de homens. Suporta origem interna e externa (terceirização) e permite copiar operações de um roteiro padrão pré-definido.

##### Pré-requisitos
- Item cadastrado em VENT0200 com Tipo = Fabricado.
- Centros de Trabalho cadastrados no sistema.
- (Opcional) Roteiro Padrão (VENT0115) para usar o botão Copiar.

##### Passo a passo

1. Acesse **VENT0202** pelo menu _Engenharia > Roteiro de Fabricação_.
2. Selecione o **Item** para o qual deseja definir o roteiro.
3. Clique em **Nova Operação** para abrir o modal de cadastro.
4. No modal, selecione a **Operação** (descrição da etapa).
5. Selecione o **Centro de Trabalho** (CT) onde a operação será executada.
6. Informe o **Tempo** (horas ou minutos, conforme configuração do CT).
7. Informe o número de **Homens** necessários.
8. Defina a **Origem**: _Interna_ ou _Externa_ (terceirizada).
9. Defina a **Situação**: _Aprovada_, _Inativa_ ou _Fantasma_.
10. Se aplicável, informe a **Fórmula** para cálculo do tempo (ex.: `T * 1.1` para acréscimo de 10%).
11. Para usar um template, clique em **Copiar de Roteiro Padrão** e selecione o roteiro em VENT0115.
12. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Item | Select | Sim | Item ao qual o roteiro pertence |
| Sequência | Number (auto) | Sim | Ordem da operação no roteiro |
| Operação | Texto (120) | Sim | Descrição da operação |
| Centro de Trabalho | Select | Sim | CT onde a operação é executada |
| Tempo | Number | Sim | Tempo padrão da operação |
| Unidade Tempo | Select | Sim | Hora / Minuto |
| Homens | Number | Sim | Quantidade de operadores necessários |
| Origem | Select | Sim | Interna / Externa |
| Situação | Select | Sim | Aprovada / Inativa / Fantasma |
| Roteiro Padrão Ref. | Select | Não | Referência ao roteiro padrão de origem |
| Fórmula | Texto (50) | Não | Expressão de cálculo do tempo (ex.: T*1.1) |
| Apontamento | Select | Não | Sim / Não — exige ou não apontamento do operador |

##### Observações importantes
- A **Fórmula** aplica um fator sobre o tempo base (`T`). Exemplo: `T * 1.2` adiciona 20% ao tempo padrão.
- Operações com **Situação Inativa** não são consideradas no cálculo de carga dos CTs.
- Operações **Fantasma** existem apenas para documentação — não geram apontamento nem custo.
- O botão **Copiar de Roteiro Padrão** acelera o cadastro para itens que seguem um fluxo produtivo comum.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VENT0200 | Item de origem do roteiro |
| VENT0115 | Roteiro Padrão — fonte para cópia |
| VENT0363 | Relatório Tempo CT — consome dados de tempo deste roteiro |
| VMAQ0101 | Tipos de Máquina — os CTs usam máquinas cadastradas aqui |

---

#### VENT0115 — Roteiro Padrão

##### Objetivo
Criar templates de roteiro reutilizáveis, que servem como base para copiar operações para roteiros de fabricação de itens específicos (VENT0202). Ideal para famílias de produtos que seguem a mesma sequência produtiva.

##### Pré-requisitos
- Centros de Trabalho cadastrados no sistema.

##### Passo a passo

1. Acesse **VENT0115** pelo menu _Engenharia > Roteiro Padrão_.
2. O sistema gera automaticamente um **código sequencial** para o roteiro padrão.
3. Preencha a **Descrição** do roteiro padrão.
4. Clique em **Nova Operação** para abrir o modal.
5. No modal, preencha: **Operação** (nome), **Centro de Trabalho**, **Tempo**, **Homens**.
6. Defina **Apontamento**: _Sim_ ou _Não_.
7. Defina **Origem**: _Interna_ ou _Terceiros_.
8. Repita os passos 4–7 para cada operação do roteiro.
9. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Código | Number (auto) | Sim | Código sequencial automático |
| Descrição | Texto (120) | Sim | Nome do roteiro padrão |
| Sequência | Number | Sim | Ordem da operação |
| Operação | Texto (120) | Sim | Descrição da operação |
| Centro de Trabalho | Select | Sim | CT da operação |
| Tempo | Number | Sim | Tempo padrão |
| Homens | Number | Sim | Quantidade de operadores |
| Apontamento | Select | Sim | Sim / Não |
| Origem | Select | Sim | Interna / Terceiros |

##### Observações importantes
- O código do roteiro padrão é **auto-gerado** e sequencial, não editável pelo usuário.
- Roteiros padrão não estão vinculados a nenhum item — são puramente templates.
- Um roteiro padrão pode ser copiado para múltiplos roteiros de fabricação.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VENT0202 | Roteiro de Fabricação — copia operações deste roteiro padrão |
| VENT0200 | Os itens fabricados que utilizarão o roteiro |

---

#### VENT0363 — Relatório Tempo CT

##### Objetivo
Exibir relatório de tempos e custos por Centro de Trabalho, totalizando horas trabalhadas e custo em reais para itens produzidos. Permite filtrar por período, CT, tipo de estrutura e seleção de documentos (NF de Saída ou Ordens de Fabricação Encerradas).

##### Pré-requisitos
- Itens com roteiro de fabricação (VENT0202) e ordens de fabricação encerradas ou notas fiscais de saída emitidas.

##### Passo a passo

1. Acesse **VENT0363** pelo menu _Engenharia > Relatório Tempo CT_.
2. Defina o **período** (data inicial e final).
3. Opcionalmente, filtre por **Item** e/ou **Centro de Trabalho**.
4. Selecione a **Seleção**: _NF Saída_ ou _OF Encerradas_.
5. Escolha o **Tipo de Estrutura** (Simples, Conjunto, etc.) ou deixe em branco para todas.
6. Defina a **Opção**: _Todas_, _Com Custos_ ou _Sem Custos_.
7. Marque os flags desejados (opções adicionais de filtro).
8. Clique em **Processar** (F8).
9. O relatório exibe: **CT**, **Operação**, **Item**, **Tempo (h)** e **Custo (R$)**.

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Data Inicial | Date | Sim | Início do período de análise |
| Data Final | Date | Sim | Fim do período de análise |
| Item | Select | Não | Filtro por item específico |
| Centro de Trabalho | Select | Não | Filtro por CT específico |
| Seleção | Select | Sim | NF Saída / OF Encerradas |
| Tipo Estrutura | Select | Não | Filtro por tipo de estrutura da BOM |
| Opção | Select | Sim | Todas / Com Custos / Sem Custos |
| Flags | Checkbox | Não | Filtros complementares |

##### Observações importantes
- A coluna **Custo (R$)** é calculada multiplicando o tempo (h) pelo custo-hora do Centro de Trabalho.
- O relatório pode ser exportado para Excel.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VENT0202 | Roteiro de Fabricação — origem dos tempos por operação |
| VENT0210 | Estrutura de Produtos — define a hierarquia usada no cálculo |
| VMAQ0101 | Tipos de Máquina — CTs e seus custos-hora |

---

#### VPME0102 — Parâmetros Promessa de Entrega

##### Objetivo
Configurar os parâmetros globais do módulo de Promessa de Entrega, controlando o comportamento do sistema para promessas de data de entrega, recálculos e bloqueios.

##### Pré-requisitos
- Permissão de acesso ao módulo de Promessa de Entrega.
- Módulo VPME habilitado na licença.

##### Passo a passo

1. Acesse **VPME0102** pelo menu _Engenharia > Promessa de Entrega > Parâmetros_.
2. Ative/desative os **8 toggles** conforme a política da empresa.
3. Selecione a **Ordenação Padrão** no campo select.
4. Informe o valor para **Show Order Values** (campo numérico).
5. O sistema detecta automaticamente alterações (dirty state) — o botão Salvar fica habilitado.
6. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| use_delivery_promise | Toggle | Não | Habilita/desabilita o módulo de promessa de entrega (master switch) |
| blocked_orders | Toggle | Não | Bloqueia ordens que não atendem à promessa |
| blocked_export | Toggle | Não | Bloqueia exportação de pedidos fora da promessa |
| break_tank | Toggle | Não | Permite quebra de tanque (movimentação parcial) |
| recalculate_after_release | Toggle | Não | Recalcula promessa após liberação de ordem |
| reprogram_loaded | Toggle | Não | Permite reprogramar cargas já carregadas |
| allow_date_change | Toggle | Não | Permite alteração manual de data da promessa |
| default_sort | Select | Sim | Critério de ordenação padrão da grade |
| show_order_values | Number | Não | Quantidade de valores de ordem a exibir |

##### Observações importantes
- O toggle **use_delivery_promise** é o master switch — desativá-lo desabilita todas as funcionalidades de promessa.
- **break_tank** está relacionado a movimentações de tanque (líquidos/granéis).
- O **dirty state** é indicado visualmente (borda do campo muda de cor) sempre que um valor difere do salvo no banco.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VPME0102ITE | Calendário Promessa por Item — usa os parâmetros definidos aqui |
| VENT0108 | Calendário Financeiro/Industrial — calendário complementar |

---

#### VPME0102ITE — Calendário Promessa por Item

##### Objetivo
Definir, para cada item, os dias úteis e não úteis para promessa de entrega em um calendário mensal. Utiliza 5 estados visuais (cores) para identificar a situação de cada dia e permite transferência de saldo entre dias para movimentações de tanque.

##### Pré-requisitos
- Parâmetros de Promessa de Entrega (VPME0102) configurados.
- Item cadastrado em VENT0200.

##### Passo a passo

1. Acesse **VPME0102ITE** pelo menu _Engenharia > Promessa de Entrega > Calendário por Item_.
2. Selecione o **Item** desejado.
3. O calendário mensal é exibido com 5 cores representando estados.
4. Clique em um dia para alternar entre os estados:
   - **1 clique**: marca como _útil confirmado_.
   - **2 cliques**: marca como _não útil_.
   - **3 cliques**: volta ao estado padrão.
5. Para transferir saldo entre dias (tanque), utilize o **modal de transferência**.
6. As alterações são salvas automaticamente ao trocar de mês ou item.

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Item | Select | Sim | Item para o qual se define o calendário |
| Mês/Ano | Date | Sim | Mês de referência do calendário |
| Dia | Click | Não | Estado do dia: útil confirmado / não útil / padrão |

##### Observações importantes
- Os 5 estados de cor representam: útil confirmado, útil previsto, não útil, feriado, bloqueado.
- O modal de **transferência** é específico para itens líquidos/granéis controlados por tanque.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VPME0102 | Parâmetros Promessa de Entrega — configurações mestras |
| VENT0108 | Calendário Financeiro/Industrial — compartilha feriados e bloqueios |

---

#### VENT0108 — Calendário Financeiro/Industrial

##### Objetivo
Definir o calendário corporativo mensal, marcando dias úteis, fins de semana, feriados e bloqueios. Utilizado tanto pelo módulo financeiro quanto pelo industrial (MRP, promessa de entrega, planejamento de capacidade).

##### Pré-requisitos
- Nenhum.

##### Passo a passo

1. Acesse **VENT0108** pelo menu _Engenharia > Calendário Financeiro/Industrial_.
2. Selecione o **Mês/Ano** desejado.
3. O grid mensal é exibido com o estado atual de cada dia.
4. Clique em um dia para alternar entre os estados (útil / não útil / feriado / bloqueado).
5. Para limpar todas as marcações do mês, clique em **Limpar Mês**.
6. As alterações são salvas automaticamente.

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Mês/Ano | Date | Sim | Mês de referência |
| Dia | Click | Não | Alterna entre estados do dia |
| Limpar Mês | Button | Não | Remove todas as marcações do mês atual |

##### Observações importantes
- O calendário é **corporativo** (vale para toda a empresa), não por item.
- Dias marcados como **não útil** são ignorados pelo MRP no cálculo de datas de necessidade.
- O botão **Limpar Mês** reseta todos os dias para o estado padrão (útil).

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VPME0102ITE | Calendário Promessa por Item — herda feriados/bloqueios deste calendário |
| VPLA0102 | Demandas Independentes — valida se a data informada é dia útil |
| VPRE0201 | Cadastro Previsão Vendas — usa calendário para distribuição semanal |

---

#### VENG0204 — Regras Variáveis Equivalentes

##### Objetivo
Estabelecer regras de equivalência entre itens pai e filho baseadas em características com operadores lógicos (=, <>, >, <, >=, <=). Permite definir que um determinado componente é selecionado quando a característica do item pai atende a uma condição.

##### Pré-requisitos
- Itens pai e filho cadastrados em VENT0200.
- Características definidas no configurador PDM (VITE0116).

##### Passo a passo

1. Acesse **VENG0204** pelo menu _Engenharia > Regras Variáveis Equivalentes_.
2. Selecione o **Item Pai** (item configurável).
3. Para cada **Item Filho** (componente alternativo), defina:
   - A **Característica** (atributo do configurador).
   - O **Operador** (=, <>, >, <, >=, <=).
   - O **Valor** de comparação.
4. Utilize o botão **F** (fórmula) para criar expressões mais complexas envolvendo múltiplas características.
5. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Item Pai | Select | Sim | Item configurável pai |
| Item Filho | Select | Sim | Componente alternativo filho |
| Característica | Select | Sim | Atributo PDM usado na condição |
| Operador | Select | Sim | = / <> / > / < / >= / <= |
| Valor | Texto (50) | Sim | Valor de referência para comparação |
| F (fórmula) | Button | Não | Abre editor de fórmula avançada |

##### Observações importantes
- O botão **F** permite expressões como `(COR = 'AZUL') AND (TENSAO >= 220)`.
- Estas regras são avaliadas em tempo de configuração para selecionar automaticamente os componentes corretos.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VENT0200 | Itens pai e filho |
| VITE0116 | Atributos PDM — origem das características |
| VITE0118 | Regras Itens Configurados — regras de mapeamento para tabelas do sistema |
| VITE0313 | Geração Máscara Itens Config. — usa estas regras na geração |

---

#### VITE0313 — Geração Máscara Itens Configurados

##### Objetivo
Gerar máscaras (códigos configurados) para itens configuráveis a partir da seleção de características e variáveis de um grupo PDM. A máscara gerada é o código do item configurado final.

##### Pré-requisitos
- Item configurável cadastrado em VENT0200 com flag Configurado = Sim.
- Grupo PDM (VENT0204), Modificadores (VITE0115) e Atributos (VITE0116) configurados.

##### Passo a passo

1. Acesse **VITE0313** pelo menu _Engenharia > Configurador > Geração Máscara_.
2. Selecione o **Item** configurável.
3. O sistema carrega automaticamente as **características** (atributos PDM) vinculadas ao grupo do item.
4. Para cada característica, selecione a **variável** desejada (valor do atributo).
5. À medida que seleciona, o sistema monta a **máscara** (código configurado) em tempo real.
6. Clique em **Gerar Máscaras** para criar o(s) código(s) configurado(s).
7. Confirme a geração.

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Item | Select | Sim | Item configurável base |
| Característica | (automático) | — | Atributos PDM carregados do grupo |
| Variável | Select | Sim | Valor selecionado para cada característica |
| Máscara | Texto (read-only) | — | Código configurado gerado |

##### Observações importantes
- A máscara gerada segue o padrão definido no grupo PDM (ex.: `BOMBA-123-220V-AZUL`).
- Máscaras geradas criam automaticamente novos códigos no cadastro de itens (VENT0200) com flag Configurado = Sim.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VENT0200 | Cadastro de Itens — item base e itens configurados gerados |
| VENT0204 | Grupo PDM — define o grupo cujos atributos são usados |
| VITE0115 | Modificadores PDM — modificadores do grupo |
| VITE0116 | Atributos PDM — atributos usados como características |
| VITE0118 | Regras Itens Configurados — regras aplicadas aos itens gerados |

---

#### VITE0114 — Grupos PDM (Tema Azul)

##### Objetivo
Cadastro alternativo de Grupos PDM com tema visual azul, oferecendo modal de vínculo com empresa e item base. Permite pesquisa rápida por código ou descrição.

##### Pré-requisitos
- Empresa cadastrada.
- (Opcional) Item base cadastrado em VENT0200.

##### Passo a passo

1. Acesse **VITE0114** pelo menu _Engenharia > Configurador > Grupos PDM (Azul)_.
2. Pesquise por **Código** ou **Descrição** para localizar grupos existentes.
3. Para criar, clique em **Novo** (F2).
4. Preencha **Código**, **Descrição** e **Abreviatura**.
5. Clique no **modal de vínculo** para associar uma **Empresa** e um **Item Base** ao grupo.
6. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Código | Texto (10) | Sim | Código do grupo PDM |
| Descrição | Texto (120) | Sim | Nome descritivo |
| Abreviatura | Texto (10) | Não | Abreviatura para relatórios |
| Empresa | Select (modal) | Sim | Empresa vinculada ao grupo |
| Item Base | Select (modal) | Não | Item de referência do grupo |

##### Observações importantes
- O **Item Base** serve como template para os itens configurados gerados a partir deste grupo.
- A versão "tema azul" é cosmeticamente diferente de VENT0204, mas os dados são compartilhados.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VENT0204 | Cadastro de Grupo PDM — mesmo domínio, outra interface |
| VENT0200 | Cadastro de Itens — item base vinculado |
| VITE0115 | Modificadores PDM — modificadores do grupo |
| VITE0116 | Atributos PDM — atributos dos modificadores |

---

#### VITE0115 — Modificadores PDM

##### Objetivo
Gerenciar os modificadores dentro de cada grupo PDM. O modificador representa uma dimensão de variação do produto (ex.: Cor, Tensão, Material) e contém os atributos que definem os valores possíveis.

##### Pré-requisitos
- Grupo PDM cadastrado em VENT0204 ou VITE0114.

##### Passo a passo

1. Acesse **VITE0115** pelo menu _Engenharia > Configurador > Modificadores PDM_.
2. Pesquise pelo **Grupo PDM** desejado.
3. A lista de modificadores do grupo é exibida.
4. Para criar, clique em **Novo** (F2).
5. Preencha os campos do modal de vínculo (código, descrição, grupo).
6. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Grupo PDM | Select | Sim | Grupo ao qual o modificador pertence |
| Código | Texto (10) | Sim | Código do modificador |
| Descrição | Texto (120) | Sim | Nome do modificador (ex.: "Cor", "Tensão") |
| Ordem | Number | Não | Ordem de exibição no configurador |

##### Observações importantes
- Um grupo PDM pode ter múltiplos modificadores (ex.: Cor, Tensão, Material, Dimensão).
- O modal de vínculo é o mesmo usado em VITE0114 para associar empresa e item base.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VITE0114 | Grupos PDM — grupo pai do modificador |
| VITE0116 | Atributos PDM — atributos que pertencem a este modificador |
| VITE0118 | Regras Itens Configurados — regras baseadas nos atributos |

---

#### VITE0116 — Atributos PDM

##### Objetivo
Gerenciar os atributos (valores possíveis) de cada modificador PDM. Apresenta pesquisa hierárquica em 3 níveis (Grupo → Modificador → Atributo) e oferece funcionalidade de Copiar/Colar atributos entre modificadores.

##### Pré-requisitos
- Grupo PDM (VITE0114) e Modificador PDM (VITE0115) cadastrados.

##### Passo a passo

1. Acesse **VITE0116** pelo menu _Engenharia > Configurador > Atributos PDM_.
2. No primeiro nível, selecione o **Grupo PDM**.
3. No segundo nível, selecione o **Modificador**.
4. No terceiro nível, a lista de **atributos** é exibida.
5. Para criar, clique em **Novo** (F2) e preencha:
   - **Código** e **Descrição** do atributo.
   - **TAM** (tamanho do campo).
   - **E/C**: _Essencial_ ou _Complementar_.
6. Para copiar atributos de um modificador para outro, use **Copiar** no modificador de origem e **Colar** no modificador de destino.
7. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Grupo PDM | Select (nível 1) | Sim | Grupo PDM pai |
| Modificador | Select (nível 2) | Sim | Modificador dentro do grupo |
| Código | Texto (10) | Sim | Código do atributo |
| Descrição | Texto (120) | Sim | Valor do atributo (ex.: "Azul", "220V") |
| TAM | Number | Não | Tamanho do campo na máscara |
| E/C | Select | Sim | Essencial / Complementar |
| Copiar / Colar | Button | Não | Copia atributos entre modificadores |

##### Observações importantes
- Atributos **Essenciais** são obrigatórios na configuração; **Complementares** são opcionais.
- O campo **TAM** define quantos caracteres o valor ocupa na máscara gerada.
- A funcionalidade **Copiar/Colar** é útil quando dois modificadores compartilham os mesmos valores (ex.: "Cor" para pintura e "Cor" para acabamento).

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VITE0115 | Modificadores PDM — modificador pai do atributo |
| VITE0118 | Regras Itens Configurados — atributos usados nas condições das regras |
| VITE0313 | Geração Máscara — atributos apresentados como características |
| VENG0204 | Regras Variáveis Equivalentes — atributos nas condições |

---

#### VITE0118 — Regras Itens Configurados

##### Objetivo
Definir regras que mapeiam características do configurador para tabelas do sistema (Contábil, Comercial, Custos, Planejamento, etc.). Quando um item configurado é gerado, estas regras determinam automaticamente classificações fiscais, preços, centros de custo e outros parâmetros.

##### Pré-requisitos
- Grupo PDM, Modificadores e Atributos (VITE0114, VITE0115, VITE0116) configurados.
- Tabelas de destino parametrizadas (plano de contas, tabelas de preço, etc.).

##### Passo a passo

1. Acesse **VITE0118** pelo menu _Engenharia > Configurador > Regras Itens Configurados_.
2. Selecione o **Grupo PDM**.
3. As **características** (atributos) do grupo são exibidas inline.
4. Clique em **Nova Regra**.
5. Defina a **condição**: combinação de características com operadores.
6. Selecione a **Tabela de Destino** (Contábil, Comercial, Custos, Planejamento, etc.).
7. O **campo dinâmico** muda conforme a tabela selecionada — preencha o valor alvo.
8. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Grupo PDM | Select | Sim | Grupo de itens configurados |
| Características | Inline | Sim | Atributos usados na condição |
| Tabela Destino | Select | Sim | Contábil / Comercial / Custos / Planejamento / ... |
| Campo Dinâmico | Varia | Sim | Campo da tabela de destino (contextual) |
| Valor | Varia | Sim | Valor a ser atribuído quando a condição for atendida |

##### Observações importantes
- O **campo dinâmico** é o diferencial desta tela — ele se adapta ao domínio da tabela selecionada, mostrando selects ou inputs apropriados.
- As regras são avaliadas sequencialmente; a primeira que satisfizer a condição é aplicada.
- Tabelas de destino típicas: Classificação Fiscal (Contábil), Tabela de Preço (Comercial), Centro de Custo (Custos), Tipo de Planejamento (Planejamento).

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VITE0116 | Atributos PDM — características usadas nas condições |
| VITE0313 | Geração Máscara — regras aplicadas ao gerar itens configurados |
| VENT0200 | Cadastro de Itens — campos populados pelas regras |
| VENG0204 | Regras Variáveis Equivalentes — regras de equivalência de componentes |

---

#### VITE0129 — Replicação Parâmetros

##### Objetivo
Replicar parâmetros de um item de origem para múltiplos itens de destino, em lote. Permite selecionar quais categorias de parâmetros (pastas) serão copiadas através de 8 checkboxes.

##### Pré-requisitos
- Item de origem cadastrado em VENT0200 com os parâmetros a replicar.
- Itens de destino cadastrados em VENT0200.

##### Passo a passo

1. Acesse **VITE0129** pelo menu _Engenharia > Configurador > Replicação Parâmetros_.
2. Selecione o **Item Origem** — aquele cujos parâmetros serão copiados.
3. Selecione os **Itens Destino** (pode ser múltiplos).
4. Marque as **pastas** (checkboxes) que deseja replicar (ex.: Planejamento, Comercial, Contábil, etc.).
5. Clique em **Replicar**.
6. Confirme a operação.

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Item Origem | Select | Sim | Item fonte dos parâmetros |
| Itens Destino | Multi-Select | Sim | Itens que receberão os parâmetros |
| Pasta 1–8 | Checkbox (8) | Não | Categorias de parâmetros a replicar (Planejamento, Comercial, Contábil, Custos, Estoque, Engenharia, Suprimentos, Fiscal) |

##### Observações importantes
- Cada checkbox corresponde a uma das abas do cadastro de itens (VENT0200).
- A replicação é uma operação **em lote** e não pode ser desfeita automaticamente.
- Parâmetros fiscais (pasta Contábil) podem exigir validação adicional após a replicação.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VENT0200 | Cadastro de Itens — origem e destino dos parâmetros |
| VITE0118 | Regras Itens Configurados — alternativa para definir parâmetros por regra |

---

## 2. PLANEJAMENTO

#### VPLA0102 — Demandas Independentes

##### Objetivo
Registrar demandas independentes de itens (previsões de venda, ordens de produção manuais, pedidos especiais) que alimentam o MRP/MPS. Para itens configurados, exige que a máscara esteja gerada.

##### Pré-requisitos
- Item cadastrado em VENT0200.
- Para itens configurados: máscara gerada via VITE0313.
- Centro de Custo (VCTB0102) cadastrado.
- Calendário financeiro/industrial (VENT0108) com dias úteis definidos.

##### Passo a passo

1. Acesse **VPLA0102** pelo menu _Planejamento > Demandas Independentes_.
2. Clique em **Novo** (F2).
3. Informe o **Item** (campo numérico, obrigatório).
4. Se o item for **Configurado**, ative o toggle e selecione a **Máscara** — o campo torna-se obrigatório.
5. Informe o **Centro de Custo** (referência VCTB0102).
6. Informe a **Quantidade** (número positivo, obrigatório).
7. Informe a **Data** (obrigatório — deve ser um **dia útil** conforme VENT0108).
8. Para itens configurados, utilize o **modal de configuração** para selecionar as variáveis.
9. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Item | Select (numérico) | Sim | Item objeto da demanda |
| Configurado | Toggle | Não | Indica se o item é configurado |
| Máscara | Select | Condicional | Código configurado (obrigatório se Configurado = Sim) |
| Centro de Custo | Select | Sim | Centro de custo da demanda (ref. VCTB0102) |
| Quantidade | Number | Sim | Quantidade demandada (deve ser > 0) |
| Data | Date | Sim | Data de entrega desejada (deve ser dia útil) |

##### Observações importantes
- A **data deve ser dia útil** — o sistema valida contra o calendário VENT0108 e rejeita datas em fins de semana ou feriados.
- Itens configurados **exigem** máscara — sem ela, a demanda não pode ser salva.
- A pesquisa permite filtrar por **item** e **data** para localizar demandas existentes.
- Demandas independentes são a **entrada primária** do MRP — a partir delas o sistema explode a BOM e gera necessidades de produção e compra.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VENT0200 | Cadastro de Itens — itens disponíveis para demanda |
| VENT0210 | Estrutura de Produtos — explode necessidades via MRP |
| VITE0313 | Geração Máscara — máscara para itens configurados |
| VENT0108 | Calendário Financeiro/Industrial — validação de dia útil |
| VCTB0102 | Cadastro de Centro de Custo — referência para o campo C.Custo |
| VPRE0201 | Cadastro Previsão Vendas — previsto vs. realizado |

---

#### VPLC0200 — Montagem de Carga

##### Objetivo
Agrupar pedidos de venda em cargas de transporte, categorizando por tipo de frete (10 opções). Exibe tabela hierárquica com cargas (nível pai) e pedidos (nível filho), totalizadores de cargas, pedidos, valor e peso.

##### Pré-requisitos
- Pedidos de venda liberados no sistema.

##### Passo a passo

1. Acesse **VPLC0200** pelo menu _Planejamento > Montagem de Carga_.
2. Selecione o **Tipo de Frete** dentre as 10 opções disponíveis.
3. O sistema carrega os pedidos elegíveis.
4. Arraste pedidos para cargas existentes ou crie **Nova Carga**.
5. A tabela hierárquica mostra: **Cargas** (expansíveis) com seus **Pedidos** (filhos).
6. Utilize **Ver Pedidos** (modal) para detalhar os pedidos de uma carga.
7. Utilize **Info Pedido** (modal) para ver dados completos de um pedido específico.
8. Os totalizadores na parte inferior exibem: total de cargas, total de pedidos, valor total (R$) e peso total.

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Tipo de Frete | Select | Sim | Categoria de frete (10 opções) |
| Carga | (hierárquico) | Sim | Nó pai na tabela hierárquica |
| Pedido | (hierárquico) | Não | Nó filho — pedidos vinculados à carga |
| Total Cargas | (totalizador) | — | Quantidade de cargas |
| Total Pedidos | (totalizador) | — | Quantidade de pedidos |
| Valor Total | (totalizador) | — | Soma do valor de todos os pedidos |
| Peso Total | (totalizador) | — | Soma do peso de todos os pedidos |

##### Observações importantes
- Pedidos só podem pertencer a uma carga por vez.
- A tabela hierárquica permite expandir/colapsar cargas para visualizar seus pedidos.
- Alterações na montagem de carga podem afetar a **promessa de entrega** (VPME0102).

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VPDV0200 | Pedido de Venda — origem dos pedidos agrupados |
| VEXP0100 | Expedição — destino das cargas montadas |
| VPLC0211 | Orientações Entrega — orientações vinculadas à carga |
| VPME0102 | Parâmetros Promessa de Entrega — impacto na data prometida |

---

#### VPLC0211 — Orientações Entrega

##### Objetivo
Registrar orientações para a entrega de cargas, incluindo CEP com auto-preenchimento de endereço, seleção de rota e campo de orientações em texto livre (até 500 caracteres).

##### Pré-requisitos
- Carga montada em VPLC0200.

##### Passo a passo

1. Acesse **VPLC0211** pelo menu _Planejamento > Orientações Entrega_.
2. Informe o **CEP** de destino — os campos de endereço são preenchidos automaticamente.
3. Selecione a **Rota** dentre as 4 opções disponíveis.
4. Preencha o campo **Orientação** com instruções para o transportador (máximo 500 caracteres).
5. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| CEP | Texto (9) | Sim | CEP de destino (auto-preenche endereço) |
| Rota | Select | Sim | Rota de entrega (4 opções) |
| Orientação | Textarea (500) | Não | Instruções adicionais para entrega |

##### Observações importantes
- O **auto-preenchimento** do CEP consulta uma base de CEPs integrada ao sistema.
- O campo **Orientação** tem limite de 500 caracteres — use para informações como "entregar no depósito B", "contatar fulano antes", etc.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VPLC0200 | Montagem de Carga — carga à qual a orientação se aplica |
| VEXP0100 | Expedição — usa as orientações na liberação da remessa |

---

## 3. PREVISÃO

#### VPRE0101 — Tabela Apropriação

##### Objetivo
Definir a distribuição percentual das vendas previstas nos dias da semana (Segunda a Sexta). A soma dos percentuais deve totalizar 100% e a validação ocorre em tempo real.

##### Pré-requisitos
- Nenhum.

##### Passo a passo

1. Acesse **VPRE0101** pelo menu _Previsão > Tabela Apropriação_.
2. Para cada dia da semana, informe o **percentual** de distribuição:
3. O sistema exibe em **tempo real** o total acumulado.
4. Certifique-se de que a **soma = 100%** — caso contrário, o sistema não permite salvar.
5. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Segunda | Number | Sim | Percentual de vendas na segunda (%) |
| Terça | Number | Sim | Percentual de vendas na terça (%) |
| Quarta | Number | Sim | Percentual de vendas na quarta (%) |
| Quinta | Number | Sim | Percentual de vendas na quinta (%) |
| Sexta | Number | Sim | Percentual de vendas na sexta (%) |
| Total | Number (read-only) | — | Soma dos percentuais (deve ser 100%) |

##### Observações importantes
- A **validação em tempo real** atualiza o total a cada campo alterado, destacando em vermelho se diferente de 100%.
- Esta tabela é usada pelo módulo de **previsão de vendas** (VPRE0201) para distribuir previsões mensais em semanas e dias.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VPRE0201 | Cadastro Previsão Vendas — usa esta tabela para distribuição diária |
| VPRE0251 | Geração Previsão — usa na projeção de dados históricos |

---

#### VPRE0102 — Bloqueio Previsão

##### Objetivo
Definir intervalos de semanas em que a previsão de vendas fica bloqueada para alterações. Útil para períodos de fechamento ou auditoria.

##### Pré-requisitos
- Nenhum.

##### Passo a passo

1. Acesse **VPRE0102** pelo menu _Previsão > Bloqueio Previsão_.
2. Informe a **Semana Inicial** e o **Ano Inicial** do bloqueio.
3. Informe a **Semana Final** e o **Ano Final** do bloqueio.
4. O sistema valida: `AnoFinal * 100 + SemanaFinal >= AnoInicial * 100 + SemanaInicial`.
5. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Semana Inicial | Number | Sim | Número da semana inicial (1–53) |
| Ano Inicial | Number | Sim | Ano da semana inicial |
| Semana Final | Number | Sim | Número da semana final (1–53) |
| Ano Final | Number | Sim | Ano da semana final |

##### Observações importantes
- A validação `ano * 100 + semana` garante que o intervalo final não seja anterior ao inicial, considerando viradas de ano.
- Durante o período bloqueado, a previsão não pode ser alterada em VPRE0201.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VPRE0201 | Cadastro Previsão Vendas — bloqueio impede edição |
| VPRE0251 | Geração Previsão — bloqueio impede geração no período |

---

#### VPRE0201 — Cadastro Previsão Vendas

##### Objetivo
Cadastrar e ajustar previsões de vendas por item, com visão mensal e semanal. Oferece distribuição fracionada (valores iguais por semana) ou inteira (piso com resto concentrado nas primeiras semanas), além de modal de ajuste semanal com redistribuição automática.

##### Pré-requisitos
- Tabela de Apropriação (VPRE0101) configurada.
- Calendário financeiro/industrial (VENT0108) com dias úteis.
- Itens cadastrados em VENT0200.

##### Passo a passo

1. Acesse **VPRE0201** pelo menu _Previsão > Cadastro Previsão Vendas_.
2. Selecione a aba **Mensal** ou **Semanal** conforme a necessidade.
3. Na aba Mensal:
   - Informe o **Item**, **Ano/Mês** e **Quantidade Prevista**.
   - Escolha o tipo de distribuição: **Fracionado** (divide igualmente) ou **Inteiro** (piso + resto nas primeiras semanas).
4. Na aba Semanal:
   - Visualize a distribuição por semana.
   - Use o **modal de ajuste semanal** para alterar valores de semanas específicas.
   - A **redistribuição automática** ajusta as demais semanas para manter o total mensal.
5. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Item | Select | Sim | Item da previsão |
| Ano/Mês | Date | Sim | Período de referência |
| Quantidade Prevista | Number | Sim | Quantidade total prevista para o mês |
| Distribuição | Select | Sim | Fracionado / Inteiro |
| Semana 1–5 | Number (modal) | Não | Quantidade ajustada por semana |
| Total Semanal | Number (read-only) | — | Soma das semanas (deve igualar o total mensal) |

##### Observações importantes
- Na distribuição **Fracionada**, se a quantidade for 10 e houver 4 semanas, cada semana recebe 2,5 (valores decimais).
- Na distribuição **Inteira**, se a quantidade for 10 e houver 4 semanas: semanas 1 e 2 recebem 3, semanas 3 e 4 recebem 2 (piso = 2, resto = 2 concentrado no início).
- O **modal de ajuste semanal** recalcula automaticamente para manter o total.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VPRE0101 | Tabela Apropriação — distribuição diária dentro da semana |
| VPRE0102 | Bloqueio Previsão — impede edição em períodos bloqueados |
| VPRE0251 | Geração Previsão — pode alimentar ou ser alimentado por esta tela |
| VPRE0301 | Previsto X Realizado — compara o previsto aqui com o real |
| VENT0200 | Cadastro de Itens — item da previsão |
| VENT0108 | Calendário Financeiro/Industrial — dias úteis por semana |

---

#### VPRE0251 — Geração Previsão

##### Objetivo
Gerar previsões de vendas a partir de dados históricos (pedidos ou faturamento), aplicando índice de projeção percentual sobre a média histórica. Permite selecionar quais itens incluir na geração via checkboxes.

##### Pré-requisitos
- Histórico de pedidos de venda ou faturamento no sistema.
- Tabela de Apropriação (VPRE0101) configurada.

##### Passo a passo

1. Acesse **VPRE0251** pelo menu _Previsão > Geração Previsão_.
2. Selecione a **fonte do histórico**: _Pedidos_ ou _Faturamento_.
3. Defina o **período histórico** (data inicial e final).
4. Defina as **semanas alvo** (semanas futuras para as quais gerar previsão).
5. Informe o **índice de projeção** (% — ex.: 110 para crescimento de 10%).
6. A tabela exibe: checkbox por item, **média histórica** (calculada) e **projeção calculada** (média x índice%).
7. Marque/desmarque os checkboxes dos itens que deseja incluir.
8. Clique em **Gerar Previsão**.
9. Confirme a operação.

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Histórico | Select | Sim | Pedidos / Faturamento |
| Período Início | Date | Sim | Início do período histórico |
| Período Fim | Date | Sim | Fim do período histórico |
| Semanas Alvo | Number (range) | Sim | Semanas futuras a prever |
| Índice Projeção | Number | Sim | Percentual de projeção (ex.: 110 = +10%) |
| Checkbox | Checkbox | Não | Seleciona item para inclusão |
| Média Histórica | Number (read-only) | — | Média calculada do histórico |
| Projeção Calculada | Number (read-only) | — | Média x Índice (%) |

##### Observações importantes
- O **índice de projeção** de 100% replica exatamente a média histórica; acima de 100% projeta crescimento; abaixo de 100% projeta retração.
- Itens sem histórico suficiente podem apresentar projeção zerada.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VPRE0201 | Cadastro Previsão Vendas — destino das previsões geradas |
| VPRE0101 | Tabela Apropriação — distribuição das previsões geradas |
| VPRE0301 | Previsto X Realizado — compara o gerado com o realizado |
| VPDV0200 | Pedido de Venda — fonte de histórico (pedidos) |

---

#### VPRE0301 — Previsto X Realizado

##### Objetivo
Comparar visualmente a previsão de vendas com o efetivamente realizado, exibindo 4 cards de KPI no topo e uma tabela com barras de progresso. Permite ordenação por qualquer coluna.

##### Pré-requisitos
- Previsões cadastradas em VPRE0201 ou VPRE0251.
- Dados de realização (pedidos/faturamento) no período.

##### Passo a passo

1. Acesse **VPRE0301** pelo menu _Previsão > Previsto X Realizado_.
2. Visualize os **4 cards KPI** no topo (ex.: Total Previsto, Total Realizado, Aderência %, Itens Acima da Meta).
3. A tabela abaixo exibe por item: **Previsto**, **Realizado**, **Diferença** e **Barra de Progresso**.
4. Clique no cabeçalho de qualquer coluna para **ordenar** (ascendente/descendente).
5. Use filtros de período e item para refinar a consulta.

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Período | Date | Sim | Período de análise |
| Item | Select | Não | Filtro por item |
| Card KPI 1–4 | (read-only) | — | Total Previsto / Realizado / Aderência % / Acima Meta |
| Previsto | Number (read-only) | — | Quantidade prevista |
| Realizado | Number (read-only) | — | Quantidade efetivamente realizada |
| Diferença | Number (read-only) | — | Realizado - Previsto |
| Barra Progresso | (visual) | — | Barra horizontal colorida (verde = atingido, vermelho = abaixo) |

##### Observações importantes
- A barra de progresso é **colorida**: verde quando realizado maior ou igual a previsto, vermelho quando abaixo.
- A ordenação por coluna permite identificar rapidamente itens com maior desvio ou melhor aderência.
- Os 4 cards KPI fornecem uma visão gerencial rápida.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VPRE0201 | Cadastro Previsão Vendas — origem do previsto |
| VPRE0251 | Geração Previsão — origem do previsto (gerado) |
| VPDV0200 | Pedido de Venda — origem do realizado |

---

## 4. MANUTENÇÃO

#### VMAN0202 — Apontamento OS Manutenção

##### Objetivo
Registrar os apontamentos (movimentações) das Ordens de Serviço de manutenção, incluindo horas trabalhadas, materiais consumidos e serviços executados.

##### Pré-requisitos
- Ordem de Serviço de manutenção aberta no sistema.
- Itens e serviços cadastrados em VENT0200.
- Funcionários/operadores cadastrados.

##### Passo a passo

1. Acesse **VMAN0202** pelo menu _Manutenção > Apontamento OS_.
2. Selecione a **Ordem de Serviço** (OS) para apontamento.
3. Para cada movimentação, informe:
   - **Tipo** (mão de obra, material, serviço).
   - **Data/Hora** do apontamento.
   - **Quantidade** (horas para mão de obra, quantidade para material).
   - **Valor** (se aplicável).
4. Adicione **observações** relevantes sobre o trabalho executado.
5. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Ordem de Serviço | Select | Sim | OS de origem |
| Tipo | Select | Sim | Mão de Obra / Material / Serviço |
| Data/Hora | DateTime | Sim | Momento do apontamento |
| Item/Serviço | Select | Condicional | Item ou serviço utilizado |
| Quantidade | Number | Sim | Horas (mão de obra) ou quantidade (material) |
| Valor | Number | Não | Custo unitário ou total |
| Observação | Texto (255) | Não | Descrição do trabalho executado |

##### Observações importantes
- Apontamentos de **Mão de Obra** geralmente usam horas; **Material** usa unidades de estoque; **Serviço** pode usar horas ou valor fixo.
- Cada apontamento gera movimentação de estoque para o tipo Material (baixa no almoxarifado).

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VMAN0401 | Consulta OS — origem da ordem de serviço |
| VENT0200 | Cadastro de Itens — itens e serviços disponíveis |

---

#### VMAN0401 — Consulta OS

##### Objetivo
Consultar e listar Ordens de Serviço de manutenção com múltiplos filtros. Permite visualizar status, datas, itens, responsáveis e custos.

##### Pré-requisitos
- Ordens de Serviço geradas no sistema.

##### Passo a passo

1. Acesse **VMAN0401** pelo menu _Manutenção > Consulta OS_.
2. Utilize os filtros disponíveis para refinar a pesquisa (número OS, período, item, status, responsável, etc.).
3. A listagem exibe as OS com colunas configuráveis.
4. Clique em uma OS para visualizar os detalhes.
5. Opcionalmente, exporte para Excel.

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Número OS | Texto | Não | Filtro por número da OS |
| Período | Date (range) | Não | Data de abertura da OS |
| Item | Select | Não | Filtro por item da manutenção |
| Status | Select | Não | Filtro por situação da OS |
| Responsável | Select | Não | Filtro por responsável técnico |

##### Observações importantes
- A listagem é **read-only** — para editar, acesse a tela de origem da OS.
- Os filtros são cumulativos (AND lógico).

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VMAN0202 | Apontamento OS Manutenção — faz apontamentos nas OS listadas aqui |
| VENT0200 | Cadastro de Itens — itens vinculados às OS |

---

## 5. SUPRIMENTO

#### VAVR0200 — Cadastro Aviso de Recebimento (Fornecedores/Transportadoras)

##### Objetivo
Cadastrar fornecedores e transportadoras no sistema, com 5 abas de informações. Suporta Pessoa Jurídica e Pessoa Física condicionalmente. Inclui sub-tabelas para Telefones, E-mails e Transporte.

##### Pré-requisitos
- Nenhum (cadastro básico).

##### Passo a passo

1. Acesse **VAVR0200** pelo menu _Suprimento > Cadastro Fornecedores/Transportadoras_.
2. Clique em **Novo** (F2).
3. Na aba principal, selecione o **Tipo**: _Fornecedor_, _Transportadora_, _Transp. Redesp._ ou _Redespacho_.
4. Selecione **Pessoa Jurídica** ou **Pessoa Física** — o formulário se adapta condicionalmente (CNPJ vs. CPF).
5. Preencha os dados cadastrais (razão social/nome, endereço, contato).
6. Na sub-tabela **Telefones**, adicione os números de contato (comercial, celular, fax).
7. Na sub-tabela **E-mails**, adicione endereços eletrônicos (comercial, financeiro, expedição).
8. Na sub-tabela **Transporte**, configure dados específicos para transportadoras (placa, veículo, ANTT).
9. Navegue pelas demais abas para preencher informações complementares.
10. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Tipo | Select | Sim | Fornecedor / Transportadora / Transp. Redesp. / Redespacho |
| Pessoa | Select | Sim | Jurídica / Física (condicional) |
| CNPJ / CPF | Texto (18/14) | Sim | Documento conforme tipo de pessoa |
| Razão Social / Nome | Texto (120) | Sim | Nome oficial ou fantasia |
| Endereço | Texto (120) | Não | Logradouro |
| Telefones | Sub-tabela | Não | Lista de contatos telefônicos |
| E-mails | Sub-tabela | Não | Lista de e-mails |
| Transporte | Sub-tabela | Não | Dados de veículo/ANTT (transportadoras) |

##### Observações importantes
- O campo **CNPJ/CPF** é condicional: se Pessoa Jurídica, espera CNPJ (14 dígitos); se Física, CPF (11 dígitos).
- As **sub-tabelas** (Telefones, E-mails, Transporte) permitem múltiplos registros inline.
- O **Tipo** define como o cadastro pode ser usado: Fornecedor em pedidos de compra, Transportadora em fretes e cargas.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VPDC0200 | Pedido de Compra — fornecedor do pedido |
| VCON0200 | Contratos Fornecedores — fornecedor do contrato |
| VVOR0202 | Itens por Fornecedor — fornecedor com itens vinculados |
| VPLC0200 | Montagem de Carga — transportadora da carga |
| VINS0106 | Ocorrências — fornecedor da ocorrência |
| VAVF0204 | Envio IQF Fornecedores — fornecedor avaliado |

---

#### VCON0100 — Tipos de Contratos

##### Objetivo
Cadastrar os tipos de contrato (tabela de domínio) utilizados na gestão de contratos com fornecedores.

##### Pré-requisitos
- Nenhum.

##### Passo a passo

1. Acesse **VCON0100** pelo menu _Suprimento > Tipos de Contratos_.
2. Clique em **Novo** (F2).
3. Preencha a **Descrição** do tipo de contrato.
4. Defina se é **Tempo Determinado**: _Sim_ ou _Não_.
5. Marque **Ativo** para disponibilizar o tipo para uso.
6. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Descrição | Texto (120) | Sim | Nome do tipo de contrato |
| Tempo Determinado | Select | Sim | Sim / Não — contrato com prazo definido |
| Ativo | Checkbox | Sim | Indica se o tipo está disponível para uso |

##### Observações importantes
- É uma **tabela de domínio** — os tipos aqui cadastrados aparecem no select de VCON0200.
- Tipos inativos não aparecem para seleção em novos contratos.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VCON0200 | Contratos Fornecedores — campo Tipo de Contrato |
| VCON0400 | Consulta Contratos — filtro por tipo |

---

#### VCON0200 — Contratos Fornecedores

##### Objetivo
Cadastrar e gerenciar contratos com fornecedores em modo dual (pesquisa + cadastro). Suporta datas condicionais, moeda com data de referência condicional e condições de pagamento.

##### Pré-requisitos
- Fornecedor cadastrado em VAVR0200.
- Tipo de Contrato cadastrado em VCON0100.

##### Passo a passo

1. Acesse **VCON0200** pelo menu _Suprimento > Contratos Fornecedores_.
2. O layout **dual mode** exibe pesquisa à esquerda e cadastro à direita.
3. Para criar, clique em **Novo** (F2) no painel direito.
4. Preencha os dados do contrato:
   - **Fornecedor**, **Tipo de Contrato**, **Número**.
   - **Datas** (vigência) — campos condicionais conforme o tipo.
   - **Moeda** e **Data Moeda** — a Data Moeda pode ser: _Data Atual_, _Data Abertura_, _Data Informada_ ou _Valor Fixo_.
   - **Condições de Pagamento**.
5. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Fornecedor | Select | Sim | Fornecedor do contrato (ref. VAVR0200) |
| Tipo de Contrato | Select | Sim | Tipo (ref. VCON0100) |
| Número | Texto (20) | Sim | Identificador do contrato |
| Data Início | Date | Condicional | Início da vigência |
| Data Fim | Date | Condicional | Fim da vigência (se Tempo Determinado) |
| Moeda | Select | Sim | Moeda do contrato |
| Data Moeda | Select | Sim | Data Atual / Abertura / Informado / Valor Fixo |
| Data Moeda Valor | Date/Text | Condicional | Valor da data conforme opção selecionada |
| Pagamento | Texto (255) | Não | Condições de pagamento negociadas |

##### Observações importantes
- **Datas condicionais**: se o tipo for Tempo Determinado = Sim, Data Fim é obrigatória; se Não, é ocultada.
- **Data Moeda condicional**: _Data Atual_ usa a data do sistema; _Abertura_ usa a data de criação do contrato; _Informado_ exibe campo de data; _Valor Fixo_ exibe campo de texto.
- O modo dual permite pesquisar contratos existentes enquanto edita um novo.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VAVR0200 | Cadastro Aviso de Recebimento — fornecedor do contrato |
| VCON0100 | Tipos de Contratos — tipo do contrato |
| VCON0202 | Cancelamento Itens Contrato — itens vinculados a este contrato |
| VCON0400 | Consulta Contratos — listagem e filtros |
| VPDC0200 | Pedido de Compra — pode referenciar contrato |

---

#### VCON0202 — Cancelamento Itens Contrato

##### Objetivo
Permitir o cancelamento ou descancelamento de itens individuais de um contrato, com 6 motivos de cancelamento disponíveis e histórico de alterações por item.

##### Pré-requisitos
- Contrato cadastrado em VCON0200 com itens vinculados.

##### Passo a passo

1. Acesse **VCON0202** pelo menu _Suprimento > Cancelamento Itens Contrato_.
2. Selecione o **Contrato**.
3. O sistema carrega automaticamente os **itens** do contrato.
4. Para cada item, utilize o **toggle Cancelar/Descancelar**.
5. Ao cancelar, selecione um dos **6 motivos** disponíveis.
6. O **histórico** de cada item exibe as alterações anteriores.
7. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Contrato | Select | Sim | Contrato de referência |
| Item | (automático) | — | Itens carregados do contrato |
| Cancelar/Descancelar | Toggle | Não | Ação sobre o item |
| Motivo | Select (6 opções) | Condicional | Motivo do cancelamento |
| Histórico | (read-only) | — | Log de alterações do item |

##### Observações importantes
- O **histórico por item** registra data, usuário e motivo de cada alteração de status.
- Itens cancelados não geram obrigações de compra, mas permanecem visíveis para auditoria.
- O descancelamento reverte o status, registrando novo evento no histórico.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VCON0200 | Contratos Fornecedores — contrato de origem |
| VCON0400 | Consulta Contratos — visão consolidada com status dos itens |
| VPDC0200 | Pedido de Compra — itens cancelados não podem ser pedidos |

---

#### VCON0400 — Consulta Contratos

##### Objetivo
Consultar contratos com 13 filtros opcionais. Tela exclusivamente de consulta (read-only), permitindo análises gerenciais sobre a carteira de contratos.

##### Pré-requisitos
- Contratos cadastrados em VCON0200.

##### Passo a passo

1. Acesse **VCON0400** pelo menu _Suprimento > Consulta Contratos_.
2. Preencha os filtros desejados (até 13 opções).
3. Clique em **Pesquisar** (F8).
4. A listagem exibe os contratos que atendem aos critérios.
5. Para visualizar detalhes, clique no contrato desejado (abre em modo leitura).
6. Opcionalmente, exporte os resultados.

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Fornecedor | Select | Não | Filtro por fornecedor |
| Tipo de Contrato | Select | Não | Filtro por tipo |
| Status | Select | Não | Ativo / Encerrado / Cancelado |
| Período Vigência | Date (range) | Não | Data inicial e final de vigência |
| Item | Select | Não | Filtro por item do contrato |
| Moeda | Select | Não | Filtro por moeda |
| + outros 7 filtros | Varia | Não | Filtros complementares |

##### Observações importantes
- Tela **100% read-only** — não permite edições, apenas consulta e exportação.
- Os 13 filtros permitem granularidade fina na pesquisa.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VCON0200 | Contratos Fornecedores — origem dos contratos |
| VCON0202 | Cancelamento Itens Contrato — reflete os cancelamentos |
| VPDC0200 | Pedido de Compra — contratos podem ser origem de PC |

---

#### VPDC0200 — Pedido de Compra

##### Objetivo
Emitir pedidos de compra para fornecedores. Possui 4 abas (Dados Gerais, Transporte, Vencimento, Itens) e status inicial Pendente. Os itens são adicionados via modal de seleção.

##### Pré-requisitos
- Fornecedor cadastrado em VAVR0200.
- Itens comprados cadastrados em VENT0200.
- (Opcional) Contrato vigente em VCON0200.

##### Passo a passo

1. Acesse **VPDC0200** pelo menu _Suprimento > Pedido de Compra_.
2. Na aba **Dados Gerais**, preencha: fornecedor, data, condições de pagamento, contato.
3. Na aba **Transporte**, defina: transportadora, tipo de frete, dados de entrega.
4. Na aba **Vencimento**, configure as datas de vencimento e valores.
5. Na aba **Itens**, clique em **Adicionar Item** (abre modal de seleção).
6. No modal, pesquise e selecione os itens, informe quantidades e valores.
7. O status inicial do pedido é **Pendente**.
8. Clique em **Salvar** (F9).

##### Campos

| Campo | Aba | Tipo | Obrigatório | Descrição |
|-------|-----|------|-------------|-----------|
| Fornecedor | Dados Gerais | Select | Sim | Fornecedor do pedido |
| Data | Dados Gerais | Date | Sim | Data de emissão |
| Contrato | Dados Gerais | Select | Não | Contrato de referência (opcional) |
| Cond. Pagamento | Dados Gerais | Texto | Não | Condições negociadas |
| Transportadora | Transporte | Select | Não | Responsável pelo frete |
| Tipo Frete | Transporte | Select | Não | CIF / FOB / etc. |
| Vencimentos | Vencimento | Grid | Não | Datas e valores de parcelas |
| Item | Itens | Modal | Sim | Item sendo comprado |
| Quantidade | Itens | Number | Sim | Quantidade pedida |
| Valor Unitário | Itens | Number | Sim | Preço unitário negociado |
| Status | (sistema) | Read-only | — | Pendente (inicial) |

##### Observações importantes
- O status inicial é sempre **Pendente**. O workflow posterior (aprovação, envio ao fornecedor, recebimento) é tratado em outras telas.
- O **modal de itens** permite busca por código, nome ou descrição, com filtros por fornecedor e tipo.
- Pedidos de compra alimentam o **Aviso de Recebimento** e a **Inspeção de Recebimento**.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VENT0200 | Cadastro de Itens — itens disponíveis para compra |
| VAVR0200 | Cadastro Aviso de Recebimento — fornecedor do pedido |
| VCON0200 | Contratos Fornecedores — contrato de referência |
| VINS0200 | Roteiro Inspeção — inspeção dos itens no recebimento |
| VVOR0202 | Itens por Fornecedor — fornecedores habilitados por item |

---

#### VVOR0202 — Itens por Fornecedor

##### Objetivo
Gerenciar a relação de itens que cada fornecedor está habilitado a fornecer, em um grid editável de 18 colunas. Inclui modal de PDM e modal de Dados de Qualidade por linha, além de classificação ABC por fornecedor.

##### Pré-requisitos
- Fornecedor cadastrado em VAVR0200.
- Itens cadastrados em VENT0200.

##### Passo a passo

1. Acesse **VVOR0202** pelo menu _Suprimento > Itens por Fornecedor_.
2. Selecione o **Fornecedor**.
3. O grid editável de 18 colunas exibe os itens já vinculados.
4. Para adicionar, clique em **Nova Linha** e selecione o item.
5. Preencha os campos editáveis diretamente no grid (preço, lead time, lote mínimo, etc.).
6. Para itens configurados, use o **modal PDM** para definir a configuração.
7. Para registrar dados de qualidade, clique no **modal Dados Qualidade** na linha do item.
8. Atribua a **classificação ABC** para o item neste fornecedor.
9. Clique em **Salvar** (F9).

##### Campos (18 colunas)

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| Item | Select | Sim | Código do item |
| Descrição | Read-only | — | Descrição do item |
| UM | Read-only | — | Unidade de medida |
| Preço Unitário | Number | Não | Preço negociado com o fornecedor |
| Lead Time (dias) | Number | Não | Prazo de entrega do fornecedor |
| Lote Mínimo | Number | Não | Quantidade mínima por pedido |
| Classificação ABC | Select | Não | A / B / C para este fornecedor |
| + outras 11 colunas | Varia | Não | Informações complementares (código fornecedor, embalagem, etc.) |
| Modal PDM | Button | Não | Configuração para itens configurados |
| Modal Dados Qualidade | Button | Não | Parâmetros de qualidade por item/fornecedor |

##### Observações importantes
- O grid é **totalmente editável** — alterações são feitas inline, sem abrir modais para cada campo.
- A **classificação ABC** por fornecedor pode diferir da classificação ABC do item (aba Planejamento em VENT0200).
- Os **Dados de Qualidade** por linha alimentam o módulo de inspeção (VINS0200).

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VAVR0200 | Cadastro Aviso de Recebimento — fornecedor |
| VENT0200 | Cadastro de Itens — itens vinculados |
| VINS0200 | Roteiro Inspeção — dados de qualidade usados na inspeção |
| VPDC0200 | Pedido de Compra — sugestão de fornecedor por item |

---

## 6. IMPORTAÇÃO

#### VIMP0101 — Status Logístico da Carga

##### Objetivo
Acompanhar o status logístico de cargas de importação, registrando etapas como embarque, trânsito, chegada ao porto, desembaraço e liberação.

##### Pré-requisitos
- Processo de importação iniciado.
- Cargas de importação registradas.

##### Passo a passo

1. Acesse **VIMP0101** pelo menu _Importação > Status Logístico da Carga_.
2. Selecione a **Carga** de importação.
3. Visualize o status atual e o histórico de etapas.
4. Para atualizar, registre a nova etapa com data e observações.
5. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Carga | Select | Sim | Identificador da carga de importação |
| Status Atual | Read-only | — | Situação logística corrente |
| Etapa | Select | Sim | Nova etapa registrada |
| Data | Date | Sim | Data da ocorrência da etapa |
| Observação | Texto (255) | Não | Detalhes da etapa |

##### Observações importantes
- As etapas típicas incluem: Embarque Origem, Em Trânsito, Chegada Porto, Desembaraço, Liberação, Entrega.
- O histórico de etapas é cumulativo e não pode ser alterado retroativamente.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VIMP0200 | Console Processos Importação — visão consolidada do processo |
| VIMP0102 | Tipos Conhecimentos Transporte — CT-e vinculados à carga |

---

#### VIMP0102 — Tipos Conhecimentos Transporte

##### Objetivo
Cadastrar os tipos de Conhecimento de Transporte Eletrônico (CT-e) utilizados em processos de importação.

##### Pré-requisitos
- Nenhum.

##### Passo a passo

1. Acesse **VIMP0102** pelo menu _Importação > Tipos Conhecimentos Transporte_.
2. Clique em **Novo** (F2).
3. Preencha o **Código** e a **Descrição** do tipo de CT-e.
4. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Código | Texto (10) | Sim | Código do tipo de CT-e |
| Descrição | Texto (120) | Sim | Descrição do tipo |

##### Observações importantes
- Tabela de domínio — tipos cadastrados aqui são referenciados nos processos de importação.
- Tipos típicos: Marítimo, Aéreo, Rodoviário, Ferroviário, Multimodal.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VIMP0101 | Status Logístico da Carga — CT-e vinculado à carga |
| VIMP0200 | Console Processos Importação — CT-e do processo |

---

#### VIMP0200 — Console Processos Importação

##### Objetivo
Central de acompanhamento de todos os processos de importação, consolidando informações de status logístico, documentação, custos e prazos em uma única interface.

##### Pré-requisitos
- Processos de importação registrados no sistema.
- Cargas (VIMP0101) e CT-e (VIMP0102) vinculados.

##### Passo a passo

1. Acesse **VIMP0200** pelo menu _Importação > Console Processos Importação_.
2. Visualize o dashboard central com todos os processos ativos.
3. Filtre por status, período, fornecedor ou carga.
4. Clique em um processo para expandir os detalhes.
5. Acompanhe: status logístico, documentos pendentes, custos acumulados, prazos.
6. Utilize as ações disponíveis conforme o status do processo.

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Processo | (listagem) | — | Processos de importação ativos |
| Status Logístico | (indicador) | — | Etapa atual da carga |
| Documentos | (indicador) | — | Status da documentação |
| Custos | (totalizador) | — | Custos acumulados do processo |
| Prazo | (indicador) | — | Dias restantes até a data prevista |

##### Observações importantes
- O console é a **visão 360 graus** do processo de importação — integra informações de múltiplas telas.
- Indicadores visuais (cores) destacam processos com atraso ou pendências críticas.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VIMP0101 | Status Logístico da Carga — status por carga |
| VIMP0102 | Tipos Conhecimentos Transporte — CT-e dos processos |
| VAVR0200 | Cadastro Aviso de Recebimento — fornecedores estrangeiros |
| VPDC0200 | Pedido de Compra — pedidos de importação |
| VINS0200 | Roteiro Inspeção — inspeção no recebimento da importação |

---

## 7. INSPEÇÃO

#### VINS0105 — Tipos de Ocorrências

##### Objetivo
Configurar os tipos de ocorrências de inspeção com 4 layouts disponíveis (Padrão, Simplificado, Detalhado, Relatório Técnico) e 7 toggles que habilitam/desabilitam seções do formulário de ocorrência.

##### Pré-requisitos
- Nenhum.

##### Passo a passo

1. Acesse **VINS0105** pelo menu _Inspeção > Tipos de Ocorrências_.
2. Clique em **Novo** (F2).
3. Preencha a **Descrição** do tipo de ocorrência.
4. Selecione o **Layout**: _Padrão_, _Simplificado_, _Detalhado_ ou _Relatório Técnico_.
5. Ative/desative os **7 toggles** de seções conforme a necessidade (ex.: "Exige Foto", "Exige Análise", "Exige Plano de Ação", etc.).
6. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Descrição | Texto (120) | Sim | Nome do tipo de ocorrência |
| Layout | Select | Sim | Padrão / Simplificado / Detalhado / Relatório Técnico |
| Toggle 1–7 | Toggle (7) | Não | Seções configuráveis do formulário |

##### Observações importantes
- Os **7 toggles** controlam quais campos e seções aparecem ao registrar uma ocorrência daquele tipo (ex.: fotos obrigatórias, análise de causa, ação corretiva).
- O layout **Relatório Técnico** inclui campos adicionais para laudos e evidências técnicas.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VINS0106 | Ocorrências — tipo de ocorrência selecionado ao registrar |
| VINS0400 | Consulta Ocorrências/Ordens — filtro por tipo de ocorrência |

---

#### VINS0106 — Ocorrências

##### Objetivo
Registrar ocorrências de inspeção (não conformidades, divergências, avisos, desvios de qualidade) vinculadas a fornecedor, item e ordem. Suporta abono com justificativa e fechamento com 4 status possíveis.

##### Pré-requisitos
- Tipos de Ocorrências (VINS0105) cadastrados.
- Fornecedor (VAVR0200), Item (VENT0200) e Ordem de Compra ou Inspeção associados.

##### Passo a passo

1. Acesse **VINS0106** pelo menu _Inspeção > Ocorrências_.
2. Clique em **Novo** (F2).
3. Selecione o **Fornecedor**.
4. Selecione o **Tipo**: _NC_ (Não Conformidade), _DI_ (Divergência), _AV_ (Aviso), _DQ_ (Desvio de Qualidade).
5. Informe o **Item** e a **Ordem** relacionados.
6. Descreva a ocorrência.
7. Se a ocorrência for **Abonada**, ative o toggle — o campo **Motivo do Abono** torna-se visível e obrigatório.
8. No **Fechamento**, selecione: _Aprovado_, _Reprovado_, _Devolvido_ ou _Retrabalho_.
9. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Fornecedor | Select | Sim | Fornecedor relacionado |
| Tipo | Select | Sim | NC / DI / AV / DQ |
| Item | Select | Sim | Item objeto da ocorrência |
| Ordem | Select | Sim | Ordem de compra/inspeção relacionada |
| Descrição | Textarea | Sim | Detalhamento da ocorrência |
| Abonado | Toggle | Não | Indica se a divergência foi aceita |
| Motivo Abono | Textarea | Condicional | Justificativa (obrigatório se Abonado = Sim) |
| Fechamento | Select | Sim | Aprovado / Reprovado / Devolvido / Retrabalho |

##### Observações importantes
- Tipos de ocorrência: **NC** = Não Conformidade crítica, **DI** = Divergência, **AV** = Aviso/observação, **DQ** = Desvio de Qualidade.
- **Abonado = Sim** significa que a divergência foi aceita (ex.: diferença de quantidade aceita comercialmente).
- O **Fechamento** define o destino do item: Aprovado segue para estoque; Reprovado/Devolvido retorna ao fornecedor; Retrabalho passa por correção.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VINS0105 | Tipos de Ocorrências — layout condicional do formulário |
| VAVR0200 | Cadastro Aviso de Recebimento — fornecedor |
| VENT0200 | Cadastro de Itens — item |
| VINS0200 | Roteiro Inspeção — ordem de inspeção |
| VINS0400 | Consulta Ocorrências/Ordens — listagem e análise |
| VAVF0105 | Tipos Abono Divergências — motivos de abono |

---

#### VINS0200 — Roteiro Inspeção

##### Objetivo
Tela mais rica do módulo de inspeção. Define o roteiro (plano) de inspeção para itens recebidos, com cabeçalho de 10 campos informativos, sequências dinâmicas de inspeção e modal por sequência com seleção de espécie/tipo (valor, atributo ou estrutura).

##### Pré-requisitos
- Item cadastrado em VENT0200.
- Fornecedor cadastrado em VAVR0200.
- Tipos de Roteiro Inspeção (VINS0211) configurados.

##### Passo a passo

1. Acesse **VINS0200** pelo menu _Inspeção > Roteiro Inspeção_.
2. Preencha os **10 campos do cabeçalho**: item, fornecedor, tipo de roteiro, ordem de compra, quantidade, lote, data, etc.
3. Clique em **Nova Sequência** para adicionar uma etapa de inspeção.
4. No **modal da sequência**, defina:
   - **Descrição** da etapa.
   - **Espécie/Tipo** via radio button: _Valor_ (medição numérica), _Atributo_ (aprovação visual/binária) ou _Estrutura_ (inspeção hierárquica).
   - Conforme a espécie selecionada, campos específicos são exibidos (valor nominal, tolerância, unidade para Valor; critério de aprovação para Atributo).
5. Repita para cada etapa necessária.
6. Clique em **Salvar** (F9).

##### Campos

| Campo | Local | Tipo | Obrigatório | Descrição |
|-------|-------|------|-------------|-----------|
| Item | Cabeçalho | Select | Sim | Item a ser inspecionado |
| Fornecedor | Cabeçalho | Select | Sim | Fornecedor do item |
| Tipo Roteiro | Cabeçalho | Select | Sim | Tipo de roteiro (ref. VINS0211) |
| Ordem de Compra | Cabeçalho | Select | Não | OC de referência |
| Quantidade | Cabeçalho | Number | Sim | Quantidade do lote a inspecionar |
| Lote | Cabeçalho | Texto (20) | Não | Número do lote |
| Data | Cabeçalho | Date | Sim | Data da inspeção |
| + outros 3 campos | Cabeçalho | Varia | Não | Informações complementares |
| Sequência | Sequência | Number (auto) | Sim | Ordem da etapa |
| Descrição | Sequência | Texto (120) | Sim | Descrição da etapa de inspeção |
| Espécie/Tipo | Sequência (modal) | Select | Sim | Valor / Atributo / Estrutura |
| Valor Nominal | Modal (Valor) | Condicional | Medida alvo |
| Tolerância +/- | Modal (Valor) | Condicional | Faixa de aceitação |
| Unidade | Modal (Valor) | Condicional | Unidade da medida |
| Critério Aprovação | Modal (Atributo) | Condicional | Condição de aprovação/reprovação |

##### Observações importantes
- Esta é a **tela mais rica** de inspeção — combina cabeçalho, sequências dinâmicas e modais contextuais.
- **Espécie Valor**: para medições quantitativas (ex.: diâmetro 10mm +/- 0.1mm).
- **Espécie Atributo**: para verificações qualitativas (ex.: cor conforme, sem arranhões).
- **Espécie Estrutura**: para inspeção hierárquica de conjuntos e subconjuntos.
- O resultado da inspeção determina se o item segue para estoque (aprovado) ou é bloqueado (reprovado).

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VENT0200 | Cadastro de Itens — item inspecionado |
| VAVR0200 | Cadastro Aviso de Recebimento — fornecedor |
| VINS0211 | Tipos Roteiro Inspeção — tipo de roteiro usado |
| VINS0201 | Manutenção Ordens Inspeção — ordens geradas a partir do roteiro |
| VINS0313 | Consulta Inspeções Recebimento — resultados das inspeções |
| VVOR0202 | Itens por Fornecedor — dados de qualidade do item/fornecedor |

---

#### VINS0201 — Manutenção Ordens Inspeção

##### Objetivo
Gerenciar as ordens de inspeção geradas, com filtros, listagem de resultados e ações inline disponíveis: Tp.Rot. (alterar tipo de roteiro), Inspeção (executar inspeção), Aprovar (aprovar ordem) e Análise (registrar análise técnica).

##### Pré-requisitos
- Ordens de inspeção geradas via VINS0200.

##### Passo a passo

1. Acesse **VINS0201** pelo menu _Inspeção > Manutenção Ordens Inspeção_.
2. Utilize os **filtros** para localizar ordens (por status, item, fornecedor, período, etc.).
3. Na listagem de resultados, utilize as **ações inline** em cada linha:
   - **Tp.Rot.**: altera o tipo de roteiro aplicado à ordem.
   - **Inspeção**: abre a tela de execução da inspeção.
   - **Aprovar**: aprova a ordem (pula etapas pendentes se permitido).
   - **Análise**: registra análise técnica sobre o resultado.
4. Clique em **Salvar** (F9) após cada ação.

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Filtro Status | Select | Não | Pendente / Em Execução / Aprovada / Reprovada |
| Filtro Item | Select | Não | Item específico |
| Filtro Fornecedor | Select | Não | Fornecedor específico |
| Filtro Período | Date (range) | Não | Período de criação da ordem |
| Tp.Rot. | Button (inline) | Não | Altera o tipo de roteiro |
| Inspeção | Button (inline) | Não | Executa a inspeção |
| Aprovar | Button (inline) | Não | Aprova a ordem |
| Análise | Button (inline) | Não | Registra análise técnica |

##### Observações importantes
- As **ações inline** são exibidas condicionalmente conforme o status da ordem (ex.: "Aprovar" só aparece para ordens com inspeção concluída).
- A ação **Tp.Rot.** permite trocar o roteiro de inspeção se necessário (ex.: de normal para rigoroso).

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VINS0200 | Roteiro Inspeção — origem das ordens |
| VINS0211 | Tipos Roteiro Inspeção — tipos disponíveis para Tp.Rot. |
| VINS0206 | Exclusão Ordens Inspeção — ordens podem ser excluídas em lote |
| VINS0313 | Consulta Inspeções Recebimento — consulta os resultados |

---

#### VINS0206 — Exclusão Ordens Inspeção

##### Objetivo
Realizar exclusão em lote de ordens de inspeção, com seleção por checkbox em duas abas: Ordens (seleção do que excluir) e Exclusão (confirmação e log da exclusão).

##### Pré-requisitos
- Ordens de inspeção existentes em VINS0201.

##### Passo a passo

1. Acesse **VINS0206** pelo menu _Inspeção > Exclusão Ordens Inspeção_.
2. Na aba **Ordens**, filtre as ordens desejadas (por período, status, item, etc.).
3. Marque os **checkboxes** das ordens que deseja excluir.
4. Navegue para a aba **Exclusão**.
5. Confira a lista de ordens selecionadas para exclusão.
6. Clique em **Excluir** e confirme a operação.

##### Campos

| Campo | Aba | Tipo | Obrigatório | Descrição |
|-------|-----|------|-------------|-----------|
| Checkbox | Ordens | Checkbox | Não | Seleciona ordem para exclusão |
| Ordem | Ordens | Read-only | — | Número da ordem |
| Item | Ordens | Read-only | — | Item da ordem |
| Status | Ordens | Read-only | — | Status atual |
| Lista Exclusão | Exclusão | Read-only | — | Ordens selecionadas para exclusão |

##### Observações importantes
- A exclusão é uma operação **em lote** e irreversível — utilize com cautela.
- Apenas ordens em status Pendente podem ser excluídas (ordens em execução ou concluídas são protegidas).
- O **log de exclusão** registra data, usuário e ordens excluídas para auditoria.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VINS0201 | Manutenção Ordens Inspeção — origem das ordens |
| VINS0200 | Roteiro Inspeção — geração de novas ordens |

---

#### VINS0211 — Tipos Roteiro Inspeção

##### Objetivo
Cadastrar os tipos de roteiro de inspeção, com configuração mínima: código (auto-gerado) e descrição.

##### Pré-requisitos
- Nenhum.

##### Passo a passo

1. Acesse **VINS0211** pelo menu _Inspeção > Tipos Roteiro Inspeção_.
2. O **código é auto-gerado** sequencialmente.
3. Preencha a **Descrição** do tipo de roteiro (ex.: "Inspeção Normal", "Inspeção Rigorosa", "Inspeção Simplificada").
4. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Código | Number (auto) | Sim | Código sequencial automático |
| Descrição | Texto (120) | Sim | Nome do tipo de roteiro |

##### Observações importantes
- Tipos de roteiro são usados para classificar e agrupar roteiros de inspeção com critérios semelhantes.
- Exemplos: Normal (NBR 5426), Rigorosa, Simplificada, Inspeção Visual, Inspeção Dimensional.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VINS0200 | Roteiro Inspeção — campo Tipo Roteiro |
| VINS0201 | Manutenção Ordens Inspeção — ação Tp.Rot. para alterar tipo |

---

#### VINS0313 — Consulta Inspeções Recebimento

##### Objetivo
Consultar inspeções de recebimento realizadas, com 11 filtros disponíveis e opção de exportar resultados para Excel.

##### Pré-requisitos
- Inspeções realizadas via VINS0200/VINS0201.

##### Passo a passo

1. Acesse **VINS0313** pelo menu _Inspeção > Consulta Inspeções Recebimento_.
2. Preencha os **filtros** desejados (até 11 opções).
3. Clique em **Pesquisar** (F8).
4. Analise os resultados na listagem.
5. Para exportar, clique em **Exportar Excel**.

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Período | Date (range) | Não | Período da inspeção |
| Item | Select | Não | Item inspecionado |
| Fornecedor | Select | Não | Fornecedor |
| Status | Select | Não | Aprovado / Reprovado / Pendente |
| Tipo Roteiro | Select | Não | Tipo de roteiro aplicado |
| + outros 6 filtros | Varia | Não | Filtros complementares |

##### Observações importantes
- Tela de consulta **read-only** — não permite alterações nos resultados das inspeções.
- A exportação para Excel inclui todas as colunas visíveis na listagem.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VINS0200 | Roteiro Inspeção — origem das inspeções |
| VINS0201 | Manutenção Ordens Inspeção — execução das inspeções |
| VINS0400 | Consulta Ocorrências/Ordens — visão complementar com ocorrências |

---

#### VINS0400 — Consulta Ocorrências/Ordens

##### Objetivo
Consultar ocorrências e ordens de inspeção em duas abas independentes, cada uma com seus próprios filtros. Fornece visão consolidada do histórico de qualidade.

##### Pré-requisitos
- Ocorrências registradas em VINS0106 e/ou ordens de inspeção em VINS0201.

##### Passo a passo

1. Acesse **VINS0400** pelo menu _Inspeção > Consulta Ocorrências/Ordens_.
2. Na aba **Ocorrências**:
   - Preencha os filtros de ocorrência (tipo, fornecedor, item, período, fechamento).
   - Visualize os resultados.
3. Na aba **Ordens**:
   - Preencha os filtros de ordem (status, item, fornecedor, período, tipo de roteiro).
   - Visualize os resultados.
4. As abas são **independentes** — filtros de uma não afetam a outra.
5. Clique em um registro para ver detalhes.

##### Campos

| Aba | Campo (Filtro) | Tipo | Obrigatório | Descrição |
|-----|----------------|------|-------------|-----------|
| Ocorrências | Tipo | Select | Não | NC / DI / AV / DQ |
| Ocorrências | Fornecedor | Select | Não | Fornecedor |
| Ocorrências | Item | Select | Não | Item |
| Ocorrências | Período | Date (range) | Não | Data da ocorrência |
| Ocorrências | Fechamento | Select | Não | Aprovado / Reprovado / Devolvido / Retrabalho |
| Ordens | Status | Select | Não | Status da ordem |
| Ordens | Item | Select | Não | Item |
| Ordens | Fornecedor | Select | Não | Fornecedor |
| Ordens | Período | Date (range) | Não | Período de criação |
| Ordens | Tipo Roteiro | Select | Não | Tipo de roteiro |

##### Observações importantes
- As **abas independentes** permitem comparar visões de ocorrências e ordens sem perder os filtros.
- Ideal para analisar correlações: um fornecedor com muitas ocorrências tende a ter mais ordens reprovadas.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VINS0106 | Ocorrências — origem dos dados da aba Ocorrências |
| VINS0201 | Manutenção Ordens Inspeção — origem dos dados da aba Ordens |
| VINS0313 | Consulta Inspeções Recebimento — consulta complementar focada em recebimento |

---

#### VAVF0101 — Parâmetros Avaliação Fornecedores

##### Objetivo
Configurar os parâmetros para avaliação de fornecedores (IQF — Índice de Qualidade do Fornecedor) com 3 sub-tabelas: Dimensões (com peso), Critérios (com peso e tipo: MAIOR_MELHOR, MENOR_MELHOR, NOMINAL_MELHOR) e Intervalos (7 colunas, conceito de 0 a 10).

##### Pré-requisitos
- Fornecedores cadastrados em VAVR0200.

##### Passo a passo

1. Acesse **VAVF0101** pelo menu _Inspeção > Parâmetros Avaliação Fornecedores_.
2. Na sub-tabela **Dimensões**, cadastre as dimensões de avaliação (ex.: Qualidade, Entrega, Preço, Atendimento) com seus respectivos **pesos** (a soma deve ser 100%).
3. Na sub-tabela **Critérios**, para cada dimensão, cadastre os critérios de avaliação com:
   - **Peso** do critério dentro da dimensão.
   - **Tipo**: _MAIOR_MELHOR_ (ex.: nota de qualidade), _MENOR_MELHOR_ (ex.: preço), _NOMINAL_MELHOR_ (ex.: prazo exato).
4. Na sub-tabela **Intervalos**, defina as 7 faixas de pontuação com **conceito de 0 a 10** para cada intervalo.
5. Clique em **Salvar** (F9).

##### Campos

| Sub-Tabela | Campo | Tipo | Obrigatório | Descrição |
|------------|-------|------|-------------|-----------|
| Dimensões | Descrição | Texto (120) | Sim | Nome da dimensão (Qualidade, Entrega, etc.) |
| Dimensões | Peso | Number | Sim | Peso da dimensão na nota final (%) |
| Critérios | Dimensão | Select | Sim | Dimensão à qual o critério pertence |
| Critérios | Descrição | Texto (120) | Sim | Nome do critério |
| Critérios | Peso | Number | Sim | Peso do critério (%) |
| Critérios | Tipo | Select | Sim | MAIOR_MELHOR / MENOR_MELHOR / NOMINAL_MELHOR |
| Intervalos | Valor Mínimo | Number | Sim | Limite inferior do intervalo |
| Intervalos | Valor Máximo | Number | Sim | Limite superior do intervalo |
| Intervalos | Conceito | Number (0–10) | Sim | Nota atribuída ao intervalo |
| Intervalos | + outras 4 colunas | Varia | Não | Colunas complementares de parametrização |

##### Observações importantes
- **MAIOR_MELHOR**: quanto maior o valor real, melhor (ex.: nota de qualidade).
- **MENOR_MELHOR**: quanto menor o valor real, melhor (ex.: preço, prazo de entrega).
- **NOMINAL_MELHOR**: o valor ideal é um alvo específico (ex.: quantidade exata entregue).
- Os **intervalos** mapeiam valores reais para uma escala de 0 a 10, que é usada no cálculo do IQF.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VAVF0204 | Envio IQF Fornecedores — cálculo do IQF usando estes parâmetros |
| VAVR0200 | Cadastro Aviso de Recebimento — fornecedores avaliados |

---

#### VAVF0105 — Tipos Abono Divergências

##### Objetivo
Cadastrar os tipos de abono (justificativas) para divergências encontradas em inspeções. Tela ultra-simples com apenas o campo descrição.

##### Pré-requisitos
- Nenhum.

##### Passo a passo

1. Acesse **VAVF0105** pelo menu _Inspeção > Tipos Abono Divergências_.
2. Clique em **Novo** (F2).
3. Preencha a **Descrição** do tipo de abono (ex.: "Divergência Comercial", "Aceite Técnico", "Urgência de Produção").
4. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Descrição | Texto (120) | Sim | Nome do tipo de abono |

##### Observações importantes
- Os tipos de abono aparecem no campo Motivo Abono em VINS0106 quando a ocorrência é abonada.
- Exemplos: Divergência Comercial, Aceite Técnico, Divergência Menor, Urgência, Acordo Contratual.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VINS0106 | Ocorrências — motivo do abono selecionado aqui |

---

#### VAVF0204 — Envio IQF Fornecedores

##### Objetivo
Calcular o Índice de Qualidade do Fornecedor (IQF), exibir os resultados em tabela com bar chart colorido (verde maior ou igual a 70, amarelo 50–69, vermelho abaixo de 50) e enviar o resultado por e-mail ao fornecedor.

##### Pré-requisitos
- Parâmetros de Avaliação (VAVF0101) configurados.
- Fornecedores (VAVR0200) com histórico de inspeções (VINS0200/VINS0106).
- E-mails dos fornecedores cadastrados.

##### Passo a passo

1. Acesse **VAVF0204** pelo menu _Inspeção > Envio IQF Fornecedores_.
2. Defina o **período de avaliação** (data inicial e final).
3. Selecione os **fornecedores** a avaliar (ou todos).
4. Clique em **Calcular IQF**.
5. A tabela exibe, para cada fornecedor:
   - **Nota IQF** (0 a 100).
   - **Barra colorida**: verde se IQF maior ou igual a 70, amarelo se 50–69, vermelho se abaixo de 50.
   - **Detalhamento** por dimensão.
6. Para enviar o resultado, clique em **Enviar E-mail** — o sistema usa o e-mail cadastrado do fornecedor.
7. Confirme o envio.

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Período Início | Date | Sim | Início do período de avaliação |
| Período Fim | Date | Sim | Fim do período de avaliação |
| Fornecedores | Multi-Select | Não | Fornecedores a avaliar (vazio = todos) |
| Nota IQF | Number (calculado) | — | Índice de 0 a 100 |
| Bar Chart | (visual) | — | Barra colorida por faixa de desempenho |
| Enviar E-mail | Button | Não | Dispara e-mail com o relatório IQF |

##### Observações importantes
- O **IQF** é calculado com base nos parâmetros de VAVF0101 e no histórico real de entregas e ocorrências do período.
- **Verde (maior ou igual a 70)**: fornecedor aprovado — desempenho satisfatório.
- **Amarelo (50–69)**: fornecedor em observação — requer atenção.
- **Vermelho (abaixo de 50)**: fornecedor crítico — pode ser bloqueado para novos pedidos.
- O e-mail enviado contém o relatório completo com notas por dimensão e critério.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VAVF0101 | Parâmetros Avaliação Fornecedores — parâmetros de cálculo do IQF |
| VAVR0200 | Cadastro Aviso de Recebimento — fornecedores avaliados |
| VINS0106 | Ocorrências — dados de não conformidades usados no cálculo |
| VINS0200 | Roteiro Inspeção — resultados de inspeção usados no cálculo |
| VINS0400 | Consulta Ocorrências/Ordens — visão histórica consolidada |

---

## 8. ASSISTÊNCIA

#### VASS0201 — Cadastro Chamado Assistência

##### Objetivo
Cadastrar e gerenciar chamados de assistência técnica, com 6 tipos (Garantia, Fora Garantia, Troca, Conserto, Revisão, Recall), workflow de status e vínculo de itens via modal com nota fiscal, lote e número de série.

##### Pré-requisitos
- Consumidor/cliente cadastrado.
- Itens cadastrados em VENT0200.
- Nota fiscal de venda do item (se aplicável).

##### Passo a passo

1. Acesse **VASS0201** pelo menu _Assistência > Cadastro Chamado_.
2. Clique em **Novo** (F2).
3. Selecione o **Tipo**: _Garantia_, _Fora Garantia_, _Troca_, _Conserto_, _Revisão_ ou _Recall_.
4. Informe o **Consumidor** (cliente).
5. Descreva o **problema relatado**.
6. Para vincular itens, clique em **Adicionar Item** (abre modal):
   - Selecione o **Item**.
   - Informe a **Nota Fiscal** de venda.
   - Informe o **Lote** e/ou **Número de Série** se aplicável.
7. O **Status** do chamado segue o workflow (Aberto, Em Análise, Em Execução, Aguardando Peças, Concluído, Fechado).
8. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Tipo | Select | Sim | Garantia / Fora Garantia / Troca / Conserto / Revisão / Recall |
| Consumidor | Select | Sim | Cliente que abriu o chamado |
| Problema Relatado | Textarea | Sim | Descrição do defeito/reclamação |
| Item | Modal | Sim | Item objeto do chamado |
| Nota Fiscal | Modal | Não | NF de venda do item |
| Lote | Modal | Não | Lote do item |
| Número de Série | Modal | Não | Número de série do item |
| Status | Select (workflow) | Sim | Aberto / Em Análise / Em Execução / Aguard. Peças / Concluído / Fechado |

##### Observações importantes
- Chamados tipo **Recall** indicam campanha de recall — podem gerar múltiplos chamados para o mesmo defeito de fabricação.
- O **modal de itens** permite vincular mais de um item ao mesmo chamado (ex.: kit de componentes).
- O **workflow de status** controla a progressão do atendimento — cada transição pode gerar notificações.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VENT0200 | Cadastro de Itens — itens do chamado |
| VASS0402 | Consulta Assistência — listagem e filtros |
| VATC0280 | Cadastro Chamados (alternativo) — cadastro alternativo de chamados |
| VATC0380 | Relatório Chamados — relatórios gerenciais |
| VGAR0211 | Gerar Pedido Devolução — chamados de garantia geram pedidos de devolução |

---

#### VASS0402 — Consulta Assistência

##### Objetivo
Consultar chamados de assistência com 14 filtros disponíveis. Os resultados exibem status como pills coloridas para rápida identificação visual.

##### Pré-requisitos
- Chamados cadastrados em VASS0201.

##### Passo a passo

1. Acesse **VASS0402** pelo menu _Assistência > Consulta Assistência_.
2. Preencha os **filtros** desejados (até 14 opções).
3. Clique em **Pesquisar** (F8).
4. Os resultados exibem os chamados com **status pills** coloridas (verde para Concluído, azul para Em Execução, vermelho para Aberto atrasado).
5. Clique em um chamado para visualizar detalhes completos.

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Tipo | Select | Não | Garantia / Fora Garantia / Troca / Conserto / Revisão / Recall |
| Status | Select | Não | Status do workflow |
| Consumidor | Select | Não | Cliente |
| Item | Select | Não | Item do chamado |
| Período Abertura | Date (range) | Não | Data de abertura |
| Período Fechamento | Date (range) | Não | Data de fechamento |
| + outros 8 filtros | Varia | Não | Filtros complementares |

##### Observações importantes
- As **status pills** usam cores semânticas: verde (concluído/fechado), azul (em andamento), amarelo (aguardando), vermelho (atrasado).
- A consulta é **read-only** — para editar um chamado, acesse VASS0201.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VASS0201 | Cadastro Chamado Assistência — origem dos chamados |
| VATC0280 | Cadastro Chamados (alternativo) — chamados alternativos |
| VATC0480 | Consulta Chamados — consulta complementar com filtro client-side |

---

#### VATC0280 — Cadastro Chamados (Alternativo)

##### Objetivo
Cadastro alternativo de chamados de assistência com foco no consumidor, garantia toggle e vistoria workflow com campos condicionais que aparecem/desaparecem conforme o andamento.

##### Pré-requisitos
- Consumidor cadastrado.
- Itens cadastrados em VENT0200.

##### Passo a passo

1. Acesse **VATC0280** pelo menu _Assistência > Cadastro Chamados (Alt)_.
2. Clique em **Novo** (F2).
3. Selecione o **Consumidor**.
4. Ative o **toggle de Garantia** se o chamado estiver coberto.
5. Preencha os dados do chamado (item, defeito, data).
6. Avance no **workflow de vistoria** — campos adicionais são exibidos conforme o status atual:
   - _Aguardando Vistoria_: exibe campo de data agendada.
   - _Em Vistoria_: exibe campos de diagnóstico.
   - _Vistoria Concluída_: exibe laudo e ações recomendadas.
7. Clique em **Salvar** (F9).

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Consumidor | Select | Sim | Cliente do chamado |
| Garantia | Toggle | Não | Indica se o chamado está em garantia |
| Item | Select | Sim | Item objeto do chamado |
| Defeito | Textarea | Sim | Descrição do defeito |
| Data Abertura | Date | Sim | Data de abertura do chamado |
| Status Vistoria | Select (workflow) | Sim | Aguardando / Em Vistoria / Concluída |
| Data Agendada | Date | Condicional | Data agendada (se Aguardando Vistoria) |
| Diagnóstico | Textarea | Condicional | Diagnóstico técnico (se Em Vistoria) |
| Laudo | Textarea | Condicional | Laudo final (se Vistoria Concluída) |

##### Observações importantes
- O **workflow de vistoria** controla quais campos são exibidos — campos condicionais reduzem a poluição visual.
- A versão "alternativa" possui uma interface mais enxuta que VASS0201, focada no fluxo de vistoria técnica.
- Ambos os cadastros (VASS0201 e VATC0280) compartilham a mesma base de dados de chamados.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VENT0200 | Cadastro de Itens — itens do chamado |
| VASS0201 | Cadastro Chamado Assistência — cadastro principal de chamados |
| VATC0380 | Relatório Chamados — relatórios destes chamados |
| VATC0480 | Consulta Chamados — consulta com filtros |

---

#### VATC0380 — Relatório Chamados

##### Objetivo
Emitir relatórios gerenciais de chamados de assistência com 16 filtros disponíveis e configuração de saída (Análise, Quebra, Opções) para personalizar o formato do relatório.

##### Pré-requisitos
- Chamados cadastrados em VASS0201 ou VATC0280.

##### Passo a passo

1. Acesse **VATC0380** pelo menu _Assistência > Relatório Chamados_.
2. Preencha os **16 filtros** desejados (período, tipo, status, consumidor, item, etc.).
3. Configure a **Saída**:
   - **Análise**: define agrupamentos e totalizadores.
   - **Quebra**: define campos de quebra de página.
   - **Opções**: define formato, ordenação e visualização.
4. Clique em **Processar** (F8).
5. O relatório é gerado conforme as configurações de saída.
6. Opcionalmente, exporte para PDF ou Excel.

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Período Abertura | Date (range) | Não | Período de abertura dos chamados |
| Período Fechamento | Date (range) | Não | Período de fechamento dos chamados |
| Tipo | Select | Não | Tipo de chamado |
| Status | Select | Não | Status do chamado |
| Consumidor | Select | Não | Cliente |
| Item | Select | Não | Item |
| + outros 10 filtros | Varia | Não | Filtros complementares |
| Análise | Config | Sim | Agrupamentos e totalizadores |
| Quebra | Config | Não | Campos de quebra de página |
| Opções | Config | Sim | Formato, ordenação e visualização |

##### Observações importantes
- As **configurações de saída** (Análise/Quebra/Opções) permitem alta customização do relatório.
- A **Análise** permite agrupar por consumidor, item, tipo ou período.
- A **Quebra** insere quebras de página a cada mudança do campo selecionado.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VASS0201 | Cadastro Chamado Assistência — origem dos dados |
| VATC0280 | Cadastro Chamados (alternativo) — origem dos dados |
| VATC0480 | Consulta Chamados — visão prévia dos dados |

---

#### VATC0480 — Consulta Chamados

##### Objetivo
Consultar chamados de assistência com 12 filtros e filtro client-side adicional. Exibe colunas de vistoria para acompanhamento do processo técnico.

##### Pré-requisitos
- Chamados cadastrados em VASS0201 ou VATC0280.

##### Passo a passo

1. Acesse **VATC0480** pelo menu _Assistência > Consulta Chamados_.
2. Preencha os **12 filtros** desejados.
3. Clique em **Pesquisar** (F8).
4. Nos resultados, utilize o **filtro client-side** para refinar ainda mais os dados já carregados.
5. As **colunas de vistoria** (data agendada, diagnóstico, laudo) são exibidas conforme disponíveis.
6. Clique em um chamado para detalhes.

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Tipo | Select | Não | Tipo de chamado |
| Status | Select | Não | Status do workflow |
| Consumidor | Select | Não | Cliente |
| Item | Select | Não | Item do chamado |
| Período | Date (range) | Não | Período de abertura |
| Status Vistoria | Select | Não | Status da vistoria |
| + outros 6 filtros | Varia | Não | Filtros complementares |
| Filtro Client-Side | Texto | Não | Filtro adicional sobre resultados carregados |

##### Observações importantes
- O **filtro client-side** opera sobre os dados já carregados no navegador, sem nova consulta ao servidor — ideal para refinar rapidamente.
- As **colunas de vistoria** incluem: Data Agendada, Técnico, Diagnóstico, Laudo, Data Conclusão.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VASS0201 | Cadastro Chamado Assistência — origem dos dados |
| VATC0280 | Cadastro Chamados (alternativo) — origem dos dados com vistoria |
| VATC0380 | Relatório Chamados — relatórios a partir destes dados |

---

## 9. GARANTIA

#### VGAR0211 — Gerar Pedido Devolução

##### Objetivo
Gerar pedidos de devolução a partir de chamados de assistência em garantia, transformando um chamado de garantia aprovado em um pedido de devolução para o fornecedor ou para o estoque de avarias.

##### Pré-requisitos
- Chamado de garantia cadastrado em VASS0201 com status que permita devolução.
- Item do chamado com fornecedor ou almoxarifado de devolução configurado em VENT0200.

##### Passo a passo

1. Acesse **VGAR0211** pelo menu _Garantia > Gerar Pedido Devolução_.
2. Selecione o **Chamado** de garantia que originará a devolução.
3. O sistema carrega os itens do chamado elegíveis para devolução.
4. Confira os dados: item, quantidade, fornecedor, almoxarifado de destino.
5. Selecione o **tipo de devolução** (Fornecedor, Estoque Avarias, Descarte).
6. Informe o **motivo da devolução** (defeito de fabricação, recall, etc.).
7. Clique em **Gerar Pedido Devolução**.
8. Confirme a geração — um número de pedido de devolução é gerado e vinculado ao chamado.

##### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Chamado | Select | Sim | Chamado de garantia de origem |
| Itens | (automático) | — | Itens do chamado elegíveis |
| Tipo Devolução | Select | Sim | Fornecedor / Estoque Avarias / Descarte |
| Fornecedor | Select | Condicional | Fornecedor (se tipo = Fornecedor) |
| Almoxarifado | Select | Condicional | Destino (se tipo = Estoque Avarias) |
| Motivo | Textarea | Sim | Justificativa da devolução |
| Pedido Devolução | (gerado) | — | Número do pedido de devolução gerado |

##### Observações importantes
- Apenas chamados com **status que permitam devolução** (ex.: Fechado como Reprovado, Aguardando Devolução) podem ser usados.
- O pedido de devolução gerado segue o workflow padrão de devoluções do sistema.
- Chamados de **Recall** podem gerar múltiplos pedidos de devolução.

##### Telas relacionadas

| Tela | Relação |
|------|---------|
| VASS0201 | Cadastro Chamado Assistência — chamado de origem |
| VENT0200 | Cadastro de Itens — fornecedor/almoxarifado de devolução |
| VAVR0200 | Cadastro Aviso de Recebimento — fornecedor da devolução |

---

## Apêndice: Lista Completa de Telas por Módulo

| Módulo | Quantidade | Telas |
|--------|-----------|-------|
| Engenharia | 17 | VENT0200, VENT0210, VENT0204, VENT0202, VENT0115, VENT0363, VPME0102, VPME0102ITE, VENT0108, VENG0204, VITE0313, VITE0114, VITE0115, VITE0116, VITE0118, VITE0129, VMAQ0101 |
| Planejamento | 3 | VPLA0102, VPLC0200, VPLC0211 |
| Previsão | 5 | VPRE0101, VPRE0102, VPRE0201, VPRE0251, VPRE0301 |
| Manutenção | 2 | VMAN0202, VMAN0401 |
| Suprimento | 7 | VAVR0200, VCON0100, VCON0200, VCON0202, VCON0400, VPDC0200, VVOR0202 |
| Importação | 3 | VIMP0101, VIMP0102, VIMP0200 |
| Inspeção | 11 | VINS0105, VINS0106, VINS0200, VINS0201, VINS0206, VINS0211, VINS0313, VINS0400, VAVF0101, VAVF0105, VAVF0204 |
| Assistência | 5 | VASS0201, VASS0402, VATC0280, VATC0380, VATC0480 |
| Garantia | 1 | VGAR0211 |
| **Total** | **54** | |

---

## Apêndice: Fluxo de Dados Entre Telas

### Ciclo de Vida do Produto

```
1. ENGENHARIA (VENT0200) — cadastro do item
   ├── Estrutura (VENT0210) — define BOM
   ├── Roteiro (VENT0202) — define operações
   ├── Configurador (VITE0313, VITE0118) — se item configurado
   └── Parâmetros replicados via VITE0129

2. PLANEJAMENTO (VPLA0102) — demanda independente
   ├── MRP explode BOM (VENT0210) e gera necessidades
   └── Previsão (VPRE0201) complementa projeções

3. SUPRIMENTOS (VPDC0200) — pedido de compra
   ├── Fornecedor (VAVR0200)
   ├── Contrato (VCON0200)
   └── Itens por Fornecedor (VVOR0202)

4. INSPEÇÃO RECEBIMENTO (VINS0200) — roteiro de inspeção
   ├── Ocorrências (VINS0106) — se detectado desvio
   ├── Ordens Inspeção (VINS0201) — execução
   └── Resultado: Aprovado → 5; Reprovado → retorna ao 3

5. ESTOQUE (VENT0800) — saldo disponível

6. VENDAS (VPDV0200) — pedido de venda
   └── Reserva estoque

7. EXPEDIÇÃO (VEXP0100) — remessa
   ├── Montagem Carga (VPLC0200)
   ├── Orientações (VPLC0211)
   └── Promessa Entrega (VPME0102)
```

### Ciclo de Assistência / Garantia

```
Cliente reporta defeito
   └── Chamado (VASS0201 / VATC0280)
        ├── Análise (VAT C0480 — consulta)
        ├── Relatório (VATC0380)
        └── Se Garantia e Reprovado:
             └── Pedido Devolução (VGAR0211)
                  ├── Devolução ao Fornecedor
                  └── Estoque de Avarias
```

### Ciclo de Importação

```
Fornecedor Estrangeiro (VAVR0200)
   └── Pedido Compra Importação (VPDC0200)
        └── Status Logístico (VIMP0101)
             ├── CT-e (VIMP0102)
             └── Console (VIMP0200)
                  └── Inspeção Recebimento (VINS0200)
```

### Ciclo de Avaliação de Fornecedores

```
Histórico de Entregas e Inspeções
   └── Parâmetros Avaliação (VAVF0101)
        └── Cálculo IQF (VAVF0204)
             ├── Bar Chart colorido
             └── Envio E-mail ao Fornecedor
                  └── Feedbacks para Contratos (VCON0200) e Compras (VPDC0200)
```

---

*Documentação gerada para o sistema ERP Venture — Módulo Processos Industriais.*
*Estilo Focco ERP Help. Última atualização: junho/2026.*


---

## Processo Comercial, Vendas e PDV

## Processo Comercial, Vendas e PDV

> Documentação completa do processo comercial do ERP Venture.
> Total de telas documentadas: **18**
> Última atualização: Junho 2026

---

## Visão Geral

O módulo **Processo Comercial, Vendas e PDV** é o **coração do ERP Venture** — todo o fluxo operacional da empresa se origina de um pedido de venda. A partir da venda, são disparados os processos de expedição, faturamento (NF-e de Saída), contas a receber e, nos casos de indústria, a demanda de produção.

O fluxo comercial completo segue esta cadeia:

```
Cadastros de Apoio → Cadastro de Cliente → Políticas Comerciais
                                                      ↓
                                         Pedido de Venda (PDV)
                                                      ↓
                              Acompanhamento de Pedidos / Reprogramações
                                                      ↓
Período de Apropriação / Comissões → Precificação ←──┘
                                                      ↓
                                          Expedição / Romaneio
                                                      ↓
                                       Faturamento (NF-e Saída)
                                                      ↓
                                         Contas a Receber (Financeiro)
```

Cada etapa possui telas específicas que se comunicam e se complementam. Antes de criar um pedido de venda no **VPDV0200**, é imprescindível que os cadastros de apoio estejam devidamente configurados: itens (VENT0200), clientes (VCLI0500), regiões/segmentos/tipos (VCLI0510), condições de pagamento e tabelas de venda (VCLI0520), tipos fiscais (VCLI0530), almoxarifados (VENT0800), configurações fiscais (VFIS0100) e condições financeiras (VFIN0110).

Ao selecionar o cliente no pedido, o sistema **automaticamente** consulta:
- **Permissões e Restrições de Venda** (VCLI0117) — para validar se o item pode ser vendido ao cliente;
- **Políticas Comerciais de Descontos** (VPDV0108) — para aplicar descontos configurados por cliente, grupo, item ou classificação;
- **Políticas Comerciais de Fretes** (VPDV0111) — para calcular o frete conforme transportadora, CEP, valor ou peso;
- **Percentuais de Frete por Cliente** (VCLI0202) — para aplicar taxas de frete diferenciadas por faixa de valor.

Após a criação do pedido, a equipe comercial pode **acompanhar** o andamento de cada pedido no console VPDV0253, **reprogramar entregas** no VEXR0100, **simular precificações** no VCST0202 e **projetar comissões** no VRE0203. O setor de logística inicia a **expedição** no VEXP0100, que avança pelo workflow de separação, conferência e despacho, culminando no faturamento via módulo Fiscal.

---

## Pré-Requisitos Gerais

Antes de operar qualquer tela do processo comercial, os seguintes cadastros de base devem estar concluídos:

| Tela               | Cadastro                                              | Módulo        |
|--------------------|-------------------------------------------------------|---------------|
| VENT0100           | Empresa (cadastro de filiais/estabelecimentos)        | Cadastros     |
| VENT0200           | Itens / Produtos (código, descrição, UM, classificação, impostos) | Cadastros |
| VCLI0500           | Cadastro de Cliente (documento, endereços, contatos)  | Cliente       |
| VCLI0510           | Apoio Básico (Regiões, Segmentos, Tipos, Portadores)  | Cliente       |
| VCLI0520           | Apoio Comercial (Condições de Pagamento, Tabelas de Venda) | Cliente  |
| VCLI0530           | Apoio Fiscal (Tipos de NF de Saída, Tipos de Imposto) | Cliente       |
| VFIS0100           | Configuração Fiscal (naturezas, CSTs, alíquotas)      | Fiscal        |
| VFIN0110           | Condições de Pagamento (financeiro, parcelas em dias) | Financeiro    |
| VENT0800           | Cadastro de Almoxarifado (próprio, terceiros, virtual)| Almoxarifado  |

**Sem estes cadastros**, o sistema não consegue validar cliente, calcular impostos, determinar preços ou processar a expedição.

---

## Fluxo do Processo Comercial

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         CADASTROS DE APOIO                                │
│  VCLI0510 (Região/Segmento/Tipo/Portador)                                │
│  VCLI0520 (Condição Pagamento/Tabela Vendas)                              │
│  VCLI0530 (Tipo NF/Tipo Imposto)                                          │
│  VENT0800 (Almoxarifado)                                                  │
│  VVND0100 (Divisão de Vendas)                                             │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         CADASTRO DE CLIENTE                               │
│  VCLI0500 (Dados/Endereços/Contatos — CNPJ/CPF, região, segmento, etc.)  │
│  VCLI0117 (Permissões/Restrições de Venda por Cliente × Item)            │
│  VCLI0202 (Percentuais de Frete por Cliente × Faixa de Valor)            │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       POLÍTICAS COMERCIAIS                                │
│  VPDV0108 (Política de Descontos — prioridade, tipo, vigência)           │
│  VPDV0111 (Política de Fretes — transportadora, CEP, seguro, pedágio)    │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       PEDIDO DE VENDA (PDV)                               │
│  VPDV0200 (Cabeçalho + Itens + Totais)                                    │
│  VCST0202 (Precificação/Simulação de Preços)                              │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     ACOMPANHAMENTO E GESTÃO                               │
│  VPDV0253 (Console de Acompanhamento — cards de posição, drill-down)     │
│  VEXR0100 (Reprogramação de Entrega — data original × nova data)         │
│  VRE0203 (Comissões Futuras — projeção por representante)                │
│  VVRE0200 (Vendas Recorrentes — assinaturas, renovação)                  │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     EXPEDIÇÃO E LOGÍSTICA                                │
│  VEXP0100 (Romaneio — workflow Aberto→Separação→Conferido→Expedido)      │
│  VENT0800 (Almoxarifado de destino/saída)                                 │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     FATURAMENTO E FINANCEIRO                             │
│  VFIS0100 → NF-e de Saída                                                │
│  VFIN0210 → Contas a Receber (geração automática a partir do faturamento)│
└──────────────────────────────────────────────────────────────────────────┘
```

O fluxo acima é **linear e sequencial**: não se pode faturar um pedido que não foi criado, não se pode expedir um pedido que não está liberado, e não se pode criar um pedido sem cliente e itens cadastrados. A integridade referencial entre as telas garante a consistência dos dados em toda a cadeia.


---

## Telas do Processo Comercial

---

### Módulo: Comercial (3 telas)

---

#### VENT0100 — Consulta de Pedido de Venda

##### Objetivo

Consultar todos os pedidos de venda cadastrados no sistema. Esta tela é **exclusivamente de consulta** (read-only) — não permite criar, editar ou excluir pedidos. Fornece visão consolidada com filtros flexíveis por número do pedido, cliente, período de datas e status, exibindo os resultados com indicadores visuais (pills coloridas) de situação.

##### Pré-requisitos

- Pedidos de venda devem ter sido criados previamente no **VPDV0200** (Cadastro de Pedido de Venda).
- Clientes devem estar cadastrados no **VCLI0500**.
- Para que os status reflitam o ciclo de vida real, os processos de liberação, expedição e faturamento devem estar em operação.

##### Passo a passo

1. Acesse a tela **VENT0100 — Consulta de Pedido de Venda**.
2. Preencha um ou mais filtros na seção superior:
   - **Pedido**: informe o número completo ou parcial para busca exata.
   - **Cliente**: informe o código ou parte do nome para busca textual.
   - **Período (início)** e **Período (fim)**: defina uma faixa de datas de emissão.
   - **Status**: selecione um status específico (Todos, Rascunho, Em Análise, Liberado, Faturado, Cancelado) ou mantenha "Todos".
3. Clique em **Pesquisar** para executar a consulta.
4. Analise os resultados na tabela inferior, que exibe: Nº Pedido, Cliente, Data Emissão, Data Entrega, Valor Total, Status e Origem.
5. Cada status é representado por uma **pill colorida**:
   - **Verde**: Liberado ou Faturado — pedido em situação normal.
   - **Âmbar**: Em Análise — pedido aguardando aprovação.
   - **Cinza**: Rascunho — pedido ainda não finalizado.
   - **Vermelho**: Cancelado — pedido cancelado.
6. Utilize o botão **Exportar** para gerar um relatório (CSV/Excel) com os dados filtrados.
7. Para limpar os filtros e começar nova consulta, clique em **Limpar**.

##### Campos

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Pedido | texto | Não | — | Número do pedido para filtro (busca parcial) |
| Cliente | texto | Não | — | Código ou nome do cliente para filtro textual |
| Período (início) | data | Não | — | Data inicial do filtro por período de emissão |
| Período (fim) | data | Não | — | Data final do filtro por período de emissão |
| Status | seleção | Não | Todos / Rascunho / Em Análise / Liberado / Faturado / Cancelado | Filtrar por situação do pedido |

**Colunas da tabela de resultados:**

| Coluna | Descrição |
|--------|-----------|
| Nº Pedido | Número identificador do pedido |
| Cliente | Nome ou Razão Social do cliente |
| Data Emissão | Data em que o pedido foi criado |
| Data Entrega | Data prevista para entrega |
| Valor Total | Valor total do pedido (soma dos itens) |
| Status | Situação atual (com pill colorida) |
| Origem | Canal de origem do pedido (Normal, Web, Importado, etc.) |

##### Observações importantes

- Esta tela **não permite edição**. Para qualquer alteração em um pedido, utilize a tela VPDV0200.
- A consulta é em tempo real e reflete o estado atual dos pedidos na base de dados.
- Status em "Rascunho" indicam pedidos que foram iniciados mas não finalizados — podem conter dados incompletos.
- O botão Exportar gera um arquivo com os dados exatamente como aparecem na tabela (respeitando os filtros aplicados).
- Períodos muito amplos podem retornar grande volume de dados; recomenda-se sempre utilizar ao menos um filtro.

##### Telas relacionadas

- **VPDV0200 (Cadastro de Pedido de Venda)**: Origem de todos os pedidos visualizados aqui. Para criar ou alterar um pedido, navegue para esta tela.
- **VCLI0500 (Cadastro de Cliente)**: Os clientes referenciados nos pedidos são cadastrados aqui.
- **VEXR0100 (Reprogramação de Entrega)**: Se um pedido listado aqui precisar de ajuste na data de entrega, esta tela registra a reprogramação com histórico.
- **VPDV0253 (Console de Acompanhamento de Pedidos)**: Oferece visão gerencial com cards de posição e drill-down por item, complementar à consulta tabular desta tela.


---

#### VVND0100 — Divisão de Vendas

##### Objetivo

Cadastrar e gerenciar as **Divisões de Vendas** da empresa — estruturas organizacionais que representam equipes comerciais, regionais ou unidades de negócio. Cada divisão pode ser vinculada a uma região geográfica e posteriormente associada a pedidos de venda, permitindo análises segmentadas de performance comercial (vendas por equipe, por região, por unidade).

##### Pré-requisitos

- **Regiões** devem estar cadastradas no **VCLI0510** (Apoio Básico > aba Região) para que o vínculo regional funcione.

##### Passo a passo

1. Acesse a tela **VVND0100 — Divisão de Vendas**.
2. Para criar uma nova divisão, clique em **Novo**.
3. Preencha os campos:
   - **Código** (obrigatório): identificador único da divisão.
   - **Descrição** (obrigatório): nome da divisão (ex: "Equipe São Paulo", "Vendas Online", "Região Sul").
   - **Análise comercial** e **Análise financeira**: definem se pedidos desta divisão
     passam por análise/bloqueio (ver tabela abaixo). Padrão: **Livre**.
   - **Considera MRP**: quando marcado, a demanda desta divisão entra no cálculo do MRP.
4. Clique em **Salvar** para persistir o registro.
5. Para editar uma divisão existente, selecione-a na tabela de listagem, altere os campos e salve novamente.
6. Utilize **Exportar** para gerar um relatório das divisões cadastradas.

##### Campos

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Código | número | Sim | — | Identificador único (positivo) da divisão |
| Descrição | texto | Sim | — | Nome descritivo da divisão |
| Análise comercial | seleção | Não | Livre / Bloqueia sempre / Sempre analisa | Regra de análise comercial do pedido (default: Livre) |
| Análise financeira | seleção | Não | Livre / Bloqueia sempre / Sempre analisa | Regra de análise financeira do pedido (default: Livre) |
| Considera MRP | toggle | Não | — | Inclui a demanda da divisão no cálculo do MRP |

**Valores de análise:**

| Valor | Significado |
|-------|-------------|
| **Livre** (`FREE`) | Sem análise ou bloqueio — o pedido segue normalmente. |
| **Bloqueia sempre** (`BLOCK_ALWAYS`) | Todo pedido da divisão é bloqueado, independentemente de crédito. |
| **Sempre analisa** (`ALWAYS_ANALYZE`) | Todo pedido passa por análise antes de liberar. |

##### Observações importantes

- Os campos de análise são **opcionais** — se não informados, assumem **Livre**.
- A divisão de vendas é associável ao **Pedido de Venda (VVND0200)** para análise de
  resultado por equipe/região/unidade e para as regras comerciais acima.
- A divisão de vendas é um dos critérios de segmentação nos consoles de acompanhamento.

##### Telas relacionadas

- **VPDV0200 (Cadastro de Pedido de Venda)**: No cabeçalho do pedido, o campo "Divisão Venda" referencia as divisões aqui cadastradas, permitindo classificar cada venda por equipe/unidade.
- **VCLI0510 (Apoio Básico)**: A aba "Região" fornece as regiões que podem ser vinculadas às divisões.
- **VPDV0253 (Console de Acompanhamento)**: Permite filtrar e agrupar pedidos por divisão de vendas.


---

#### VEXR0100 — Reprogramação de Entrega

##### Objetivo

Registrar e consultar **reprogramações de data de entrega** de pedidos de venda. Quando um pedido tem sua data de entrega original alterada por qualquer motivo, esta tela documenta a alteração com: data original, nova data, motivo da reprogramação e observações. Mantém um histórico completo e auditável de todas as mudanças de prazo.

##### Pré-requisitos

- O pedido de venda deve existir no sistema (criado via **VPDV0200** e visível na consulta **VENT0100**).
- O número do pedido é a chave de vínculo — o sistema busca automaticamente a data de entrega original cadastrada no pedido.

##### Passo a passo

1. Acesse a tela **VEXR0100 — Reprogramação de Entrega**.
2. Clique em **Nova Reprogramação** para abrir o formulário.
3. Informe o **Pedido** (obrigatório): número do pedido de venda. O sistema preencherá automaticamente:
   - **Data Original**: data de entrega atual do pedido (somente leitura, carregada do cadastro).
4. Informe a **Nova Data** (obrigatório): data para a qual a entrega será reprogramada.
5. Selecione o **Motivo** (obrigatório) da reprogramação entre as opções:
   - Atraso produção — atraso na fabricação/montagem dos itens.
   - Logística — problemas com transporte, rota ou transportadora.
   - Cliente solicitou — solicitação expressa do cliente para adiar/antecipar.
   - Fornecedor — atraso no recebimento de matéria-prima ou componentes.
   - Outros — qualquer outro motivo não listado.
6. Preencha a **Observação** (opcional) com detalhes adicionais sobre a reprogramação.
7. Clique em **Salvar** para registrar a reprogramação.
8. A reprogramação aparecerá na tabela de consulta inferior, exibindo: Pedido, Data Original, Nova Data, Motivo, Status.
9. Utilize **Pesquisar** para filtrar reprogramações por período ou pedido específico.
10. Utilize **Exportar** para gerar relatório das reprogramações.

##### Campos

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Pedido | texto | Sim | — | Número do pedido de venda a ser reprogramado |
| Data Original | data | Sim (readonly) | — | Data de entrega original, carregada automaticamente do pedido |
| Nova Data | data | Sim | — | Nova data de entrega proposta |
| Motivo | seleção | Sim | Atraso produção / Logística / Cliente solicitou / Fornecedor / Outros | Justificativa da reprogramação |
| Observação | texto | Não | — | Detalhes adicionais sobre o motivo da alteração |

##### Observações importantes

- A data de entrega **original** é preservada e nunca sobrescrita — o histórico mantém a rastreabilidade completa.
- Um mesmo pedido pode ter múltiplas reprogramações ao longo do tempo. Cada reprogramação é um registro independente com data/hora de criação.
- A reprogramação **não altera automaticamente** a data de entrega no pedido original (VPDV0200) — isso é feito em processo separado após a autorização.
- O campo Motivo é essencial para análises gerenciais de causas de atraso e indicadores de performance logística (OTIF — On Time In Full).
- A observação deve ser utilizada para registrar aprovações, contatos com cliente ou informações operacionais relevantes.

##### Telas relacionadas

- **VPDV0200 (Cadastro de Pedido de Venda)**: Origem dos pedidos. A data de entrega original do pedido é referência para a reprogramação.
- **VENT0100 (Consulta de Pedido de Venda)**: Permite localizar pedidos e verificar datas de entrega antes de registrar uma reprogramação.
- **VPDV0253 (Console de Acompanhamento de Pedidos)**: Exibe o status atual de cada pedido, incluindo alertas de prazo (verde/amarelo/vermelho) que podem motivar uma reprogramação.


---

### Módulo: Cliente (6 telas)

---

#### VCLI0500 — Cadastro de Cliente

##### Objetivo

Realizar o **cadastro completo de clientes** — a base de todo o processo comercial. Esta tela é do tipo CRUD completo (criar, ler, atualizar) e permite gerenciar todos os dados cadastrais, fiscais e comerciais do cliente. Organizada em 3 abas (Dados, Endereços, Contatos), oferece validação de CNPJ/CPF com dígito verificador, controle de bloqueio/desbloqueio, estrutura matriz/filial e vínculos com todas as tabelas de apoio do sistema.

##### Pré-requisitos

Antes de cadastrar um cliente, os seguintes cadastros de apoio devem existir:

| Cadastro | Tela | Aba/Campo |
|----------|------|-----------|
| Regiões | VCLI0510 | Aba Região |
| Segmentos de Mercado | VCLI0510 | Aba Segmento |
| Tipos de Cliente | VCLI0510 | Aba Tipo Cliente |
| Condições de Pagamento | VCLI0520 | Aba Condição |
| Tabelas de Venda | VCLI0520 | Aba Tabela |
| Portadores (Cobrança) | VCLI0510 | Aba Portador |
| Grupos de Portadores | VCLI0510 | Aba Grupo Portadores |
| Tipos de NF de Saída | VCLI0530 | Aba Tipo NF |
| Tipos de Imposto | VCLI0530 | Aba Tipo Imposto |
| Países, UFs e Cidades | VUTL0555 / VLOC0100 | — |

##### Passo a passo

1. Acesse a tela **VCLI0500 — Cadastro de Cliente**.
2. Clique em **Novo** para iniciar um novo cadastro.
3. Na aba **Dados**, preencha os campos de identificação:
   - **Código**: gerado automaticamente ao salvar (somente leitura no modo edição).
   - **Razão Social / Nome** (obrigatório): nome completo ou razão social.
   - **Nome Fantasia**: nome comercial, se diferente.
   - **Tipo Documento**: selecione CNPJ (pessoa jurídica) ou CPF (pessoa física).
   - **Documento** (obrigatório): informe o número. O sistema valida o dígito verificador automaticamente.
   - **Inscrição Estadual**: para contribuintes de ICMS.
   - **Inscrição Municipal**: para prestadores de serviço.
   - **Código SUFRAMA**: para clientes da Zona Franca de Manaus.
   - **Corporate (Matriz/Filial)**: ative o toggle para indicar que este cliente é matriz ou filial.
   - **Matriz**: se for filial, selecione o código da matriz (obrigatório para filiais).
4. Preencha os campos de classificação comercial:
   - **Região**: selecione a região geográfica.
   - **Segmento Mercado**: selecione o segmento (ex: Varejo, Atacado, Indústria).
   - **Tipo Cliente**: selecione o tipo (ex: NORMAL, CONSUMIDOR).
   - **Condição Pagamento**: condição padrão para vendas a este cliente.
   - **Tabela de Venda**: tabela de preços vinculada.
   - **Transportadora**: transportadora padrão para entregas.
   - **Grupo Transportadora**: grupo de transportadoras.
   - **Tipo de Nota Fiscal**: tipo de NF padrão para vendas.
   - **Tipo de Imposto**: regime tributário aplicável.
5. Configure os parâmetros comerciais:
   - **Visibilidade Cond. Pagto**: "Somente Vinculados" restringe a visibilidade; "Todos" libera para qualquer condição.
   - **Limite de Crédito**: valor máximo de crédito (R$). Vendas que excedam este limite podem ser bloqueadas.
   - **Bloqueado**: toggle para bloquear/desbloquear vendas para este cliente.
   - **Website**: endereço do site do cliente.
6. Na aba **Endereços**, adicione ao menos um endereço:
   - Clique em **Adicionar Endereço**.
   - Selecione o **Tipo**: Cobrança, Entrega ou Faturamento.
   - Preencha CEP, Logradouro, Número, Bairro, Cidade, UF e País.
   - Marque um endereço como **padrão**.
7. Na aba **Contatos**, adicione contatos do cliente:
   - Clique em **Adicionar Contato**.
   - Informe Tipo, Nome, Email, Telefone, Celular e Cargo.
   - Marque o contato principal como **Primário**.
8. Clique em **Salvar** para persistir o cadastro completo.
9. Para bloquear/desbloquear um cliente existente, selecione-o na listagem e utilize o botão **Bloquear/Desbloquear**.

##### Campos

**Aba Dados:**

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Código | número (auto) | Sim | — | Gerado automaticamente ao salvar; somente leitura na edição |
| Razão Social / Nome | texto | Sim | — | Nome completo ou razão social do cliente |
| Nome Fantasia | texto | Não | — | Nome comercial |
| Tipo Documento | seleção | Sim | CNPJ / CPF | Tipo de documento fiscal |
| Documento | texto (validado) | Sim | — | CNPJ ou CPF com validação de dígito |
| Inscrição Estadual | texto | Não | — | IE do cliente (contribuintes de ICMS) |
| Inscrição Municipal | texto | Não | — | IM do cliente (prestadores de serviço) |
| Código SUFRAMA | texto | Não | — | Código para clientes da Zona Franca |
| Corporate (Matriz/Filial) | toggle | Não | — | Indica se é matriz ou filial |
| Matriz | seleção | Não (Sim se Filial) | Clientes cadastrados | Vínculo com a matriz (obrigatório para filiais) |
| Região | seleção | Não | Regiões (VCLI0510) | Região geográfica do cliente |
| Segmento Mercado | seleção | Não | Segmentos (VCLI0510) | Classificação de mercado |
| Tipo Cliente | seleção | Não | Tipos (VCLI0510) | Categoria NORMAL/CONSUMIDOR |
| Condição Pagamento | seleção | Não | Condições (VCLI0520) | Condição de pagamento padrão |
| Tabela de Venda | seleção | Não | Tabelas (VCLI0520) | Tabela de preços vinculada |
| Transportadora | seleção | Não | Portadores (VCLI0510) | Transportadora padrão |
| Grupo Transportadora | seleção | Não | Grupos (VCLI0510) | Grupo de transportadoras |
| Tipo de Nota Fiscal | seleção | Não | Tipos NF (VCLI0530) | Tipo de NF padrão para vendas |
| Tipo de Imposto | seleção | Não | Tipos Imposto (VCLI0530) | Regime tributário aplicável |
| Visibilidade Cond. Pagto | seleção | Sim | Somente Vinculados / Todos | Controla quais condições de pagamento são visíveis |
| Limite de Crédito | número | Não | — | Valor máximo de crédito em R$ |
| Bloqueado | toggle | Não | — | Bloqueia vendas para este cliente |
| Website | texto | Não | — | URL do site do cliente |

**Aba Endereços:**

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Tipo | seleção | Sim | Cobrança / Entrega / Faturamento | Finalidade do endereço |
| CEP | texto | Não | — | Código postal |
| Logradouro | texto | Não | — | Rua, avenida, etc. |
| Número | texto | Não | — | Número do imóvel |
| Bairro | texto | Não | — | Bairro |
| Cidade | texto | Não | — | Cidade |
| UF | texto | Não | — | Unidade Federativa |
| País | texto | Não | — | País |

**Aba Contatos:**

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Tipo | seleção | Não | Tipos de Contato (VCLI0510) | Classificação do contato |
| Nome | texto | Não | — | Nome da pessoa de contato |
| Email | texto | Não | — | Endereço de e-mail |
| Telefone | texto | Não | — | Número de telefone fixo |
| Celular | texto | Não | — | Número de celular |
| Cargo | texto | Não | — | Cargo/função na empresa |
| Primário | toggle | Não | — | Indica o contato principal |

##### Observações importantes

- **Validação de CNPJ/CPF**: O sistema verifica automaticamente o dígito verificador. Documentos inválidos são rejeitados.
- **Estrutura Matriz/Filial**: Clientes marcados como filial **devem** ter uma matriz associada. A matriz deve ser cadastrada primeiro.
- **Bloqueio**: Um cliente bloqueado não poderá ter novos pedidos de venda criados. Pedidos já existentes não são afetados.
- **Limite de Crédito**: Se configurado, o sistema verifica o saldo devedor do cliente antes de liberar novos pedidos. Clientes sem limite definido (valor zero ou nulo) não sofrem esta restrição.
- **Múltiplos endereços**: Cada cliente pode ter vários endereços de cada tipo. Isso permite, por exemplo, múltiplos endereços de entrega (filiais do cliente) sob um mesmo cadastro.
- Ao alterar a Condição de Pagamento ou Tabela de Venda padrão, pedidos já criados **não são afetados** — apenas novos pedidos utilizarão os valores atualizados.

##### Telas relacionadas

- **VCLI0510 (Apoio Básico)**: Fornece as tabelas de Região, Segmento, Tipo Contato, Tipo Cliente, Portador e Grupo de Portadores.
- **VCLI0520 (Apoio Comercial)**: Fornece Condições de Pagamento e Tabelas de Venda.
- **VCLI0530 (Apoio Fiscal)**: Fornece Tipos de NF de Saída e Tipos de Imposto.
- **VCLI0117 (Permissões e Restrições)**: Após cadastrar o cliente, defina quais itens ele pode ou não comprar.
- **VCLI0202 (Percentuais de Frete)**: Configure taxas de frete específicas para este cliente.
- **VPDV0200 (Cadastro de Pedido de Venda)**: Ao criar um pedido, o cliente é selecionado a partir deste cadastro. Todos os parâmetros são carregados automaticamente.


---

#### VCLI0510 — Apoio de Cliente (Básico)

##### Objetivo

Centralizar os **cadastros de apoio básico** referenciados pelo cadastro de clientes e por outras telas do sistema. Funciona como um **hub de tabelas auxiliares** organizado em 6 abas, cada uma gerenciando uma entidade de apoio independente via componente SupportCrud (CRUD padronizado).

##### Pré-requisitos

- Nenhum. Esta é uma tela de cadastros básicos que serve como fundação para todo o resto do módulo de clientes.

##### Passo a passo

1. Acesse a tela **VCLI0510 — Apoio de Cliente (Básico)**.
2. Selecione a aba correspondente ao cadastro desejado:
   - **Região**: cadastre regiões geográficas vinculando UF e Cidade.
   - **Segmento**: cadastre segmentos de mercado, opcionalmente com hierarquia (código pai) e indicador de retenção de PIS/COFINS.
   - **Tipo Contato**: cadastre tipos de contato (ex: "Financeiro", "Comercial", "Diretor").
   - **Tipo Cliente**: cadastre categorias de cliente com código, descrição, categoria (NORMAL/CONSUMIDOR) e dias de entrega.
   - **Portador**: cadastre portadores (bancos/carteiras de cobrança) com tipo de cobrança, flags e prazos.
   - **Grupo Portadores**: cadastre grupos e vincule portadores a cada grupo.
3. Em cada aba, utilize os botões padrão do SupportCrud:
   - **Novo**: abre formulário para criar registro.
   - **Salvar**: persiste o registro.
   - **Editar**: selecione um registro na tabela para carregá-lo no formulário e editá-lo.
4. Na aba **Grupo Portadores**, além do CRUD padrão, há uma seção extra para **Vincular portador ao grupo**:
   - Informe o código do grupo e do portador.
   - Clique em **Vincular** para associá-los.
5. Utilize **Exportar** em qualquer aba para gerar relatório.

##### Campos (por aba)

**Aba Região:**

| Campo | Tipo | Obrigatório | Função |
|-------|------|-------------|--------|
| Descrição | texto | Sim | Nome da região (ex: "Sudeste", "Sul") |
| UF | texto | Sim | Unidade Federativa (ex: "SP", "RJ") |
| Cidade | texto | Sim | Nome da cidade |

**Aba Segmento:**

| Campo | Tipo | Obrigatório | Função |
|-------|------|-------------|--------|
| Descrição | texto | Sim | Nome do segmento (ex: "Varejo", "Indústria") |
| Pai (cód.) | número | Não | Código do segmento pai (hierarquia) |
| Retém PIS/COFINS | booleano | Não | Indica se o segmento retém PIS/COFINS |
| Indicador retenção | texto | Não | Código do indicador de retenção fiscal |

**Aba Tipo Contato:**

| Campo | Tipo | Obrigatório | Função |
|-------|------|-------------|--------|
| Descrição | texto | Sim | Nome do tipo de contato |

**Aba Tipo Cliente:**

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Código | número | Sim | — | Identificador numérico |
| Descrição | texto | Sim | — | Nome do tipo |
| Categoria | seleção | Não | NORMAL / CONSUMIDOR | Classificação da categoria |
| Dias entrega | número | Não | — | Prazo padrão de entrega em dias |

**Aba Portador:**

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Descrição | texto | Sim | — | Nome do portador |
| Cobrança | seleção | Não | CARTEIRA / COBRANCA_ESCRITURAL / BOLETO | Tipo de cobrança |
| Usa limite crédito | booleano | Não | — | Se o portador respeita limite de crédito |
| Considera disponível | booleano | Não | — | Considera saldo disponível |
| Adia p/ dia útil | booleano | Não | — | Posterga vencimento para dia útil |
| Dias recebimento | número | Não | — | Prazo para confirmação de recebimento |
| Dias compensação | número | Não | — | Prazo de compensação bancária |

**Aba Grupo Portadores (seção principal):**

| Campo | Tipo | Obrigatório | Função |
|-------|------|-------------|--------|
| Descrição | texto | Sim | Nome do grupo de portadores |

**Aba Grupo Portadores (seção de vínculo):**

| Campo | Tipo | Obrigatório | Função |
|-------|------|-------------|--------|
| Grupo (cód.) | número | Sim | Código do grupo de portadores |
| Portador (cód.) | número | Sim | Código do portador a vincular |

##### Observações importantes

- As tabelas de apoio são a **base de toda a classificação de clientes**. Sem elas, o VCLI0500 não terá opções nos selects.
- O SupportCrud oferece interface padronizada com validação de campos obrigatórios, feedback visual de sucesso/erro e paginação.
- Na aba Segmento, o campo "Pai" permite criar hierarquias (ex: "Móveis" → "Móveis de Escritório" → "Cadeiras").
- Na aba Portador, o tipo de cobrança define como os títulos serão processados: CARTEIRA (cobrança simples), COBRANCA_ESCRITURAL (registro eletrônico) ou BOLETO (emissão de boleto).
- O vínculo portador-grupo é uma relação N:N — um portador pode pertencer a vários grupos e um grupo pode conter vários portadores.

##### Telas relacionadas

- **VCLI0500 (Cadastro de Cliente)**: Todos os selects da aba Dados consomem as tabelas aqui cadastradas: Região, Segmento, Tipo Cliente, Portador.
- **VCLI0520 (Apoio Comercial)**: Complementa os cadastros de apoio com Condições de Pagamento e Tabelas de Venda.
- **VPDV0200 (Cadastro de Pedido de Venda)**: Utiliza Portador e Tipo Cliente indiretamente através dos dados carregados do cliente.


---

#### VCLI0520 — Apoio de Cliente (Comercial)

##### Objetivo

Gerenciar os **cadastros de apoio comercial** essenciais para o processo de venda: **Condições de Pagamento** (com suas parcelas) e **Tabelas de Venda** (com regras de formação de preço, tolerâncias e incoterms). Estas tabelas determinam como os pedidos serão precificados e parcelados.

##### Pré-requisitos

- **Portadores** devem estar cadastrados no **VCLI0510** (aba Portador) para serem referenciados nas Condições de Pagamento.

##### Passo a passo

**Aba Condição de Pagamento:**

1. Selecione a aba **Condição de Pagamento**.
2. Utilize o SupportCrud para cadastrar a condição (ex: "30/60/90", "À Vista", "28 DDL"):
   - **Descrição**: nome da condição.
   - **Portador (cód.)**: código do portador vinculado.
   - **Análise crédito**: SEMPRE_ANALISA (exige análise), BLOQUEIA_SEMPRE (recusa automaticamente), LIBERA_SEM_ANALISE (aprova sem análise).
   - **Início parcelas**: define a base de contagem: EMISSAO (data da nota), PROXIMO_MES (dia 1º do mês seguinte), PROXIMA_QUINZENA (dia 1º ou 16).
   - **Despesas**: valor de despesas fixas por parcela.
   - **Prazo médio (d)**: prazo médio de pagamento em dias.
   - **Especial**: indica condição especial (não padrão).
   - **Gera receita**: indica se gera reconhecimento de receita.
   - **À vista**: indica pagamento em parcela única.
3. Salve a condição.
4. Na seção **Parcelas** (abaixo do CRUD), adicione as parcelas que compõem a condição:
   - Informe o **código da condição** (gerado no passo anterior).
   - **Nº**: número sequencial da parcela (1, 2, 3...).
   - **Dias venc.**: dias para vencimento a partir da data base.
   - **Descrição**: identificação da parcela (ex: "Entrada", "30 dias").
   - **Documento**: DUPLICATA, CHEQUE ou PROMISSORIA.
   - Clique em **+ Parcela** para adicionar.

**Aba Tabela de Vendas:**

1. Selecione a aba **Tabela de Vendas**.
2. Utilize o SupportCrud para cadastrar a tabela:
   - **Descrição**: nome da tabela (ex: "Tabela SP 2026").
   - **Vigência início** e **Vigência fim**: período de validade (formato ISO).
   - **Tol. mín %** e **Tol. máx %**: percentuais de tolerância para negociação de preços.
   - **Formação de preço**: INFORMADO (manual), CUSTO_MEDIO, CUSTO_STANDARD_TOTAL, CUSTO_STANDARD_MATERIAL, INFORMADO_SEM_ICMS, MAT_OPER, TABELA_CUSTO, TRANSFERENCIA_IPI, TRANSFERENCIA_UF.
   - **Casas decimais**: precisão dos preços (ex: 2 para centavos).
   - **Incoterm**: FOB (comprador paga frete), CIF (vendedor paga frete) ou EXWORK (retirada na fábrica).
   - **Tipo**: NORMAL (tabela padrão) ou PROMOCIONAL (tabela temporária).
   - **Data base**: PEDIDO (usa data do pedido) ou DATA_ATUAL (usa data corrente).
   - **Permite < R$0,01**: permite itens com preço abaixo de 1 centavo.
   - **ICMS por dentro**: ICMS incluso no preço (cálculo "por dentro").
   - **Observação**: campo livre para anotações.
3. Salve a tabela.

##### Campos

**Aba Condição de Pagamento:**

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Descrição | texto | Sim | — | Nome da condição |
| Portador (cód.) | número | Não | — | Código do portador vinculado |
| Análise crédito | seleção | Não | SEMPRE_ANALISA / BLOQUEIA_SEMPRE / LIBERA_SEM_ANALISE | Política de análise de crédito |
| Início parcelas | seleção | Não | EMISSAO / PROXIMO_MES / PROXIMA_QUINZENA | Base de contagem das parcelas |
| Despesas | número | Não | — | Despesas fixas por parcela |
| Prazo médio (d) | número | Não | — | Prazo médio de pagamento |
| Especial | booleano | Não | — | Condição especial |
| Gera receita | booleano | Não | — | Gera reconhecimento de receita |
| À vista | booleano | Não | — | Pagamento em parcela única |

**Parcelas (sub-form):**

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Condição (cód.) | número | Sim | — | Código da condição de pagamento |
| Nº | número | Sim | — | Número da parcela |
| Dias venc. | número | Não | — | Dias para vencimento |
| Descrição | texto | Não | — | Identificação da parcela |
| Documento | seleção | Não | DUPLICATA / CHEQUE / PROMISSORIA | Tipo de documento da parcela |

**Aba Tabela de Vendas:**

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Descrição | texto | Sim | — | Nome da tabela |
| Vigência início | texto (ISO) | Não | — | Data de início da validade |
| Vigência fim | texto (ISO) | Não | — | Data de fim da validade |
| Tol. mín % | número | Não | — | Tolerância mínima de desconto |
| Tol. máx % | número | Não | — | Tolerância máxima de acréscimo |
| Formação de preço | seleção | Não | Ver 9 opções no texto | Método de formação do preço de venda |
| Casas decimais | número | Não | — | Precisão decimal dos preços |
| Incoterm | seleção | Não | FOB / CIF / EXWORK | Termo internacional de comércio |
| Tipo | seleção | Não | NORMAL / PROMOCIONAL | Tipo de tabela |
| Data base | seleção | Não | PEDIDO / DATA_ATUAL | Data de referência para preços |
| Permite < R$0,01 | booleano | Não | — | Permitir preços abaixo de 1 centavo |
| ICMS por dentro | booleano | Não | — | ICMS incluso no preço |
| Observação | texto | Não | — | Anotações livres |

##### Observações importantes

- **Condição de Pagamento × Financeiro**: As condições cadastradas aqui no módulo comercial são independentes das condições financeiras do VFIN0110. As comerciais possuem mais parâmetros (análise de crédito, início de parcelas, despesas).
- **Formação de preço**: Este é um dos campos mais importantes. Determina como o preço será calculado:
  - `INFORMADO`: preço digitado manualmente no pedido.
  - `CUSTO_MEDIO`: baseado no custo médio do item.
  - `CUSTO_STANDARD_TOTAL`: custo padrão considerando todos os componentes.
  - `TABELA_CUSTO`: preço extraído de uma tabela de custo pré-definida.
- **Tolerâncias**: Definem os limites percentuais que um vendedor pode aplicar de desconto ou acréscimo sem aprovação adicional.
- **Incoterm**: FOB (comprador assume frete), CIF (vendedor inclui frete e seguro no preço), EXWORK (retirada na fábrica).
- **Vigência**: Tabelas PROMOCIONAIS devem ter data de fim definida. Após o vencimento, o sistema deixa de oferecê-las.

##### Telas relacionadas

- **VCLI0500 (Cadastro de Cliente)**: Os campos Condição Pagamento e Tabela de Venda referenciam os registros aqui cadastrados.
- **VCLI0510 (Apoio Básico)**: Portadores referenciados nas condições de pagamento.
- **VPDV0200 (Cadastro de Pedido de Venda)**: Ao criar um pedido, a condição de pagamento e tabela de venda do cliente são carregadas. O preço dos itens é calculado conforme a formação definida na tabela.
- **VFIN0110 (Condições de Pagamento — Financeiro)**: Cadastro paralelo no módulo financeiro, mais simplificado.


---

#### VCLI0530 — Apoio de Cliente (Fiscal)

##### Objetivo

Gerenciar os **cadastros de apoio fiscal** que definem o comportamento tributário das operações de venda. Duas abas independentes: **Tipo de NF de Saída** (natureza da operação, percentuais de impostos, CSTs, flags de processo) e **Tipo de Imposto** (flags de base de cálculo para cada tributo). Estas configurações determinam como os impostos serão calculados nas notas fiscais de saída.

##### Pré-requisitos

- Nenhum. Esta é uma tela de cadastros básicos fiscais. Entretanto, conhecimento da legislação tributária (ICMS, IPI, PIS, COFINS, CSLL, IR, ISSQN, INSS) é necessário para configurar corretamente.

##### Passo a passo

**Aba Tipo de NF de Saída:**

1. Selecione a aba **Tipo de NF de Saída**.
2. Utilize o SupportCrud para cadastrar um tipo de NF (ex: "Venda Normal", "Devolução"):
   - **Descrição**: nome do tipo de NF.
   - **Natureza**: selecione a natureza da operação — 17 opções disponíveis (VENDA, DEVOLUCAO, REMESSA, TRANSFERENCIA, etc.).
   - **Estoque**: ATUALIZA, NAO_ATUALIZA ou TRANSFERENCIA_EXTERNA.
   - **Situação ICMS**: TRIBUTADO, ISENTO, OUTROS.
   - **% impostos**: ICMS, Red. ICMS, IPI, PIS, COFINS, ISSQN, IR, CSLL, INSS.
   - **CSTs**: CST ICMS, CSOSN, CST IPI, CST PIS, CST COFINS.
   - **% Presunção**: IR e CSLL para lucro presumido.
   - **Modelo NF**: 55 (NF-e) ou 65 (NFC-e).
   - **Flags booleanas** (12 opções): Gera receita, Atualiza estoque, Gera título, Conta metas, Calc. ICMS-ST, Calc. diferimento, Calc. PIS/COFINS, Calc. DIFAL, Exige pedido, Livros fiscais, Baixa pedido, Título devolução, Exige SUFRAMA.
3. Salve o tipo de NF.

**Aba Tipo de Imposto:**

1. Selecione a aba **Tipo de Imposto**.
2. Utilize o SupportCrud para cadastrar um tipo (ex: "Normal", "Simples Nacional"):
   - **Descrição**: nome do tipo.
   - **Consumidor final**: indica se é para consumidor final.
   - **Flags de base de cálculo**: para cada tributo (IPI, ICMS, PIS/COFINS, CSLL, IR), defina se a base:
     - Inclui o total dos itens.
     - Subtrai desconto.
     - Adiciona frete.
     - Adiciona IPI (no caso da base de ICMS).
     - Adiciona seguro (no caso de PIS/COFINS).
     - Adiciona despesas.
3. Salve o tipo de imposto.

##### Campos

**Aba Tipo de NF de Saída (27 campos):**

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Descrição | texto | Sim | — | Nome do tipo de NF |
| Natureza | seleção | Não | 17 opções (VENDA, DEVOLUCAO, REMESSA...) | Natureza da operação fiscal |
| Estoque | seleção | Não | ATUALIZA / NAO_ATUALIZA / TRANSFERENCIA_EXTERNA | Efeito sobre o estoque |
| Situação ICMS | seleção | Não | TRIBUTADO / ISENTO / OUTROS | Situação tributária do ICMS |
| % ICMS | número | Não | — | Alíquota de ICMS |
| % Red. ICMS | número | Não | — | Percentual de redução da base de ICMS |
| % IPI | número | Não | — | Alíquota de IPI |
| % PIS | número | Não | — | Alíquota de PIS |
| % COFINS | número | Não | — | Alíquota de COFINS |
| % ISSQN | número | Não | — | Alíquota de ISSQN |
| % IR | número | Não | — | Alíquota de IR |
| % CSLL | número | Não | — | Alíquota de CSLL |
| % INSS | número | Não | — | Alíquota de INSS |
| CST ICMS | texto | Não | — | Código de Situação Tributária do ICMS |
| CSOSN | texto | Não | — | Código de Situação da Operação no Simples Nacional |
| CST IPI | texto | Não | — | Código de Situação Tributária do IPI |
| CST PIS | texto | Não | — | Código de Situação Tributária do PIS |
| CST COFINS | texto | Não | — | Código de Situação Tributária da COFINS |
| % Presunção IR | número | Não | — | Percentual de presunção para IR |
| % Presunção CSLL | número | Não | — | Percentual de presunção para CSLL |
| Modelo NF | seleção | Não | 55 / 65 | Modelo do documento fiscal |
| Gera receita | booleano | Não | — | Operação gera reconhecimento de receita |
| Atualiza estoque | booleano | Não | — | Movimenta saldo de estoque |
| Gera título | booleano | Não | — | Gera título a receber automaticamente |
| Conta metas | booleano | Não | — | Computa para metas de vendas |
| Calc. ICMS-ST | booleano | Não | — | Calcula substituição tributária |
| Calc. diferimento | booleano | Não | — | Calcula diferimento de ICMS |
| Calc. PIS/COFINS | booleano | Não | — | Calcula PIS e COFINS |
| Calc. DIFAL | booleano | Não | — | Calcula Diferencial de Alíquotas |
| Exige pedido | booleano | Não | — | Requer pedido de venda vinculado |
| Livros fiscais | booleano | Não | — | Lista em livros fiscais |
| Baixa pedido | booleano | Não | — | Baixa o pedido de venda ao faturar |
| Título devolução | booleano | Não | — | Gera título para devolução |
| Exige SUFRAMA | booleano | Não | — | Exige código SUFRAMA do cliente |

**Aba Tipo de Imposto (22 campos — flags de base de cálculo):**

| Campo | Tipo | Obrigatório | Função |
|-------|------|-------------|--------|
| Descrição | texto | Sim | Nome do tipo de imposto |
| Consumidor final | booleano | Não | Indica se é para consumidor final |
| IPI: total itens | booleano | Não | Base do IPI = soma dos itens |
| IPI: − desconto | booleano | Não | Abater desconto da base do IPI |
| IPI: + frete | booleano | Não | Incluir frete na base do IPI |
| IPI: + despesas | booleano | Não | Incluir despesas na base do IPI |
| ICMS: total itens | booleano | Não | Base do ICMS = soma dos itens |
| ICMS: − desconto | booleano | Não | Abater desconto da base do ICMS |
| ICMS: + frete | booleano | Não | Incluir frete na base do ICMS |
| ICMS: + IPI | booleano | Não | Incluir IPI na base do ICMS |
| ICMS: + despesas | booleano | Não | Incluir despesas na base do ICMS |
| PIS/COF: total itens | booleano | Não | Base do PIS/COFINS = soma dos itens |
| PIS/COF: − desconto | booleano | Não | Abater desconto da base |
| PIS/COF: + frete | booleano | Não | Incluir frete na base |
| PIS/COF: + seguro | booleano | Não | Incluir seguro na base |
| PIS/COF: + despesas | booleano | Não | Incluir despesas na base |
| CSLL: total itens | booleano | Não | Base da CSLL = soma dos itens |
| CSLL: − desconto | booleano | Não | Abater desconto da base da CSLL |
| CSLL: + frete | booleano | Não | Incluir frete na base da CSLL |
| IR: total itens | booleano | Não | Base do IR = soma dos itens |
| IR: − desconto | booleano | Não | Abater desconto da base do IR |
| IR: + frete | booleano | Não | Incluir frete na base do IR |

##### Observações importantes

- **Natureza da operação**: Define o CFOP e impacta diretamente a apuração de impostos e obrigações acessórias (SPED Fiscal).
- As **flags de base de cálculo** são cumulativas e determinam exatamente a composição da base de cada tributo.
- **Modelo NF**: 55 para NF-e padrão; 65 para NFC-e (venda ao consumidor no varejo/PDV).
- **Exige SUFRAMA**: Quando ativo, clientes sem código SUFRAMA não poderão utilizar este tipo de NF.
- Configurações incorretas nestas telas podem gerar erros fiscais graves. Recomenda-se revisão por consultor tributário.

##### Telas relacionadas

- **VCLI0500 (Cadastro de Cliente)**: Os campos Tipo NF e Tipo Imposto referenciam os registros aqui cadastrados.
- **VPDV0200 (Cadastro de Pedido de Venda)**: Ao criar um pedido, o Tipo NF e Tipo Imposto são carregados do cliente.
- **VFIS0100 (Configuração Fiscal)**: Complementa as configurações fiscais para emissão de NF-e.
- **VFIS0210 (NF-e de Saída)**: Utiliza os Tipos de NF e Tipos de Imposto para emissão do documento fiscal.


---

#### VCLI0117 — Permissões e Restrições de Venda

##### Objetivo

Controlar **quais itens ou classificações de itens** podem (Permissão) ou não podem (Restrição) ser vendidos para determinados clientes, estabelecimentos de faturamento ou representantes. Essencial para políticas de exclusividade, bloqueio de inadimplentes ou liberação por representante.

##### Pré-requisitos

- **Clientes** devem estar cadastrados no **VCLI0500**.
- **Itens** devem estar cadastrados no **VENT0200**.
- **Classificações de Itens** devem estar cadastradas no **VCLA0100**, se for utilizar o escopo por classificação.

##### Passo a passo

1. Acesse a tela **VCLI0117 — Permissões e Restrições de Venda**.
2. Na seção de filtros, selecione o escopo:
   - **Cliente**: informe o código do cliente (obrigatório).
   - **Estab Faturamento**: opcional, para restringir por estabelecimento.
   - **Representante**: opcional, para restringir por representante.
3. Selecione a aba correspondente: **Itens** (produto por produto) ou **Classificação** (categoria inteira).
4. Clique em **Adicionar** para incluir um vínculo:
   - Selecione o **Item** ou **Classificação**.
   - Escolha o **Tipo Regra**: Permissão (libera) ou Restrição (bloqueia).
   - Defina **Data Início** e **Data Fim** de vigência (opcional, para regras temporárias).
   - Informe um **Motivo** para documentar a razão.
5. Repita para múltiplos itens/classificações.
6. Clique em **Salvar**.
7. Para remover, selecione na tabela e clique em **Remover**.

##### Campos

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Tipo Regra | seleção | Sim | Permissão / Restrição | Define se libera ou bloqueia |
| Cliente | texto | Sim (escopo cliente) | — | Código do cliente |
| Grupo Cliente | seleção | Não | — | Grupo de clientes (alternativo) |
| Item | texto | Sim (escopo item) | — | Código do item |
| Classificação | seleção | Não | Classificações (VCLA0100) | Escopo por classificação |
| Data Início Vigência | data | Não | — | Início da validade da regra |
| Data Fim Vigência | data | Não | — | Fim da validade da regra |
| Motivo | texto | Não | — | Justificativa |

##### Observações importantes

- **Permissão vs. Restrição**: Sem regras, todos os itens são vendáveis. Com regras de Permissão, apenas os itens listados são liberados (whitelist). Restrições bloqueiam itens específicos (blacklist).
- **Escopo por Classificação**: Aplica a regra a todos os itens da categoria (presentes e futuros).
- **Prioridade**: Restrições prevalecem sobre Permissões.
- O sistema consulta automaticamente estas regras durante a criação do pedido (VPDV0200).

##### Telas relacionadas

- **VCLI0500 (Cadastro de Cliente)**: Clientes referenciados nas regras.
- **VENT0200 (Cadastro de Itens)**: Itens referenciados.
- **VCLA0100 (Classificação de Itens)**: Categorias utilizadas no escopo por classificação.
- **VPDV0200 (Cadastro de Pedido de Venda)**: Regras validadas ao adicionar itens ao pedido.


---

#### VCLI0202 — Percentuais de Frete por Cliente

##### Objetivo

Configurar **percentuais de frete diferenciados** por cliente, com faixas de valor (inicial/final) que determinam taxas progressivas ou regressivas. Exemplo: "Pedidos até R$ 5.000: 5% de frete; de R$ 5.000,01 a R$ 20.000: 3,5%".

##### Pré-requisitos

- **Clientes** devem estar cadastrados no **VCLI0500**.
- **Estabelecimentos** (se diferenciar por estabelecimento) no **VENT0100**.

##### Passo a passo

1. Acesse a tela **VCLI0202 — Percentuais de Frete por Cliente**.
2. Para adicionar uma nova faixa de frete:
   - **Cliente**: código do cliente (nome preenchido automaticamente).
   - **Estabelecimento**: opcional; deixe em branco para "Todos".
   - **Valor Inicial**: valor mínimo da faixa (R$).
   - **Valor Final**: valor máximo da faixa (R$).
   - **Percentual Frete**: percentual aplicado (%).
3. Clique em **Salvar**.
4. Na tabela inferior, é possível **Editar** (clique no ícone de edição) ou **Excluir** faixas inline.

##### Campos

| Campo | Tipo | Obrigatório | Função |
|-------|------|-------------|--------|
| Cliente | texto | Sim | Código do cliente |
| Cliente (Nome) | texto (auto) | Não | Preenchido automaticamente |
| Estabelecimento | texto | Não | Código do estabelecimento (vazio = todos) |
| Estabelecimento (Nome) | texto (auto) | Não | Preenchido automaticamente |
| Valor Inicial | número | Sim | Valor inicial da faixa (R$) |
| Valor Final | número | Sim | Valor final da faixa (R$) |
| Percentual Frete | número | Sim | Percentual de frete (%) |

##### Observações importantes

- **Validação**: `Valor Final > Valor Inicial` e `Percentual Frete > 0`.
- **Faixas sem sobreposição**: Recomenda-se faixas contíguas (0-5000, 5000.01-20000) para evitar ambiguidade.
- As configurações são consultadas automaticamente no VPDV0200 e VPLC0200.

##### Telas relacionadas

- **VCLI0500 (Cadastro de Cliente)**: Clientes para os quais as faixas são configuradas.
- **VPDV0200 (Cadastro de Pedido de Venda)**: Consulta as faixas ao calcular frete do pedido.
- **VPDV0111 (Política Comercial de Fretes)**: Políticas mais abrangentes que trabalham em conjunto.
- **VPLC0200 (Montagem de Carga)**: Utiliza os percentuais para compor frete total.


---

### Módulo: PDV / Pedidos (6 telas)

---

#### VPDV0108 — Política Comercial de Descontos

##### Objetivo

Cadastrar e gerenciar **políticas comerciais de descontos** aplicadas automaticamente durante a criação de pedidos de venda. Cada política define regras de prioridade, vigência, tipo de aplicação e um conjunto de linhas com faixas de valores e gerações automáticas de desconto.

##### Pré-requisitos

- Nenhum. Políticas podem ser cadastradas antes de clientes e itens, pois são genéricas. Para ter efeito prático, clientes e itens devem existir.

##### Passo a passo

1. Acesse a tela **VPDV0108 — Política Comercial de Descontos**.
2. Na seção **1 — Pesquisar**, utilize os filtros e clique em **Pesquisar**. Clique em uma linha de resultado para carregar no formulário.
3. Na seção **2 — Criar / Editar**, preencha o cabeçalho:
   - **Prioridade** (obrigatório): ordem de avaliação (menor = mais prioritário).
   - **Sequência** (obrigatório): número único.
   - **Validade Inicial** e **Validade Final**: vigência (final em branco = indeterminado).
   - **Tipo**: Informação (informativo), Escolha (obriga seleção) ou Opcional (sugere, não obriga).
4. Configure as **Opções** (6 flags):
   - **Permite alterar descontos**: vendedor pode modificar o valor calculado.
   - **Usada na Política de Comissões**: impacto no cálculo de comissão.
   - **Políticas aplicadas a itens**: aplica desconto por item.
   - **Permite informar valores maiores**: acima do máximo configurado.
   - **Opção Prazo Médio**: considera prazo médio.
   - **Opção Tipo de Representante**: varia por tipo de representante.
5. Clique em **Política** para abrir o modal de **Linhas da Política**:
   - Preencha: Linha, Início, Fim e toggle Permite Valores Maiores.
   - Clique em **Adicionar Linha**.
6. Clique em **Ger. Automática** para abrir o modal de **Geração Automática**:
   - Preencha: Sequência, Descrição, Tipo (Percentual/Valor), Valores Mín/Máx/Default.
   - Clique em **Adicionar**.
7. Clique em **Salvar** para persistir a política completa.

##### Campos

**Cabeçalho:**

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Prioridade | número | Sim | — | Ordem de avaliação (menor = mais prioritário) |
| Sequência | número | Sim | — | Número sequencial único |
| Validade Inicial | data | Não | — | Início da vigência |
| Validade Final | data | Não | — | Fim (vazio = indeterminado) |
| Tipo | seleção | Não | Informação / Escolha / Opcional | Comportamento da política |
| Permite alterar descontos | booleano | Não | — | Vendedor pode modificar |
| Usada na Política de Comissões | booleano | Não | — | Afeta comissões |
| Políticas aplicadas a itens | booleano | Não | — | Desconto por item |
| Permite informar valores maiores | booleano | Não | — | Ultrapassar máximo |
| Opção Prazo Médio | booleano | Não | — | Considera prazo médio |
| Opção Tipo de Representante | booleano | Não | — | Varia conforme representante |

**Modal Linhas da Política:**

| Campo | Tipo | Função |
|-------|------|--------|
| Linha | número | Número sequencial |
| Início | número | Valor inicial da faixa |
| Fim | número | Valor final da faixa |
| Permite Valores Maiores | booleano | Se a faixa pode ser ultrapassada |

**Modal Geração Automática:**

| Campo | Tipo | Opções | Função |
|-------|------|--------|--------|
| Sequência | número | — | Número da regra |
| Descrição | texto | — | Nome da regra |
| Tipo | seleção | Percentual / Valor | Tipo de desconto |
| Valor Mínimo | número | — | Limite inferior |
| Valor Máximo | número | — | Limite superior |
| Default Valor | número | — | Valor padrão sugerido |

##### Observações importantes

- **Prioridade**: Menor número = avaliado primeiro. Em empate, usa-se a sequência. A primeira política aplicável é utilizada.
- **Tipo Informação**: Exibe o desconto, mas não o aplica. **Escolha**: obriga seleção. **Opcional**: sugere, permite ignorar.
- **Geração Automática**: Cria cenários pré-definidos oferecidos como opção na venda.
- Políticas fora da vigência são ignoradas.
- As linhas e gerações são sub-registros vinculados à política principal.

##### Telas relacionadas

- **VPDV0200 (Cadastro de Pedido de Venda)**: As políticas são consultadas automaticamente ao criar o pedido.
- **VPDV0111 (Política Comercial de Fretes)**: Trabalha em conjunto para desconto e frete.
- **VCLI0500 (Cadastro de Cliente)**: O cliente selecionado dispara a consulta às políticas vinculadas.


---

#### VPDV0111 — Política Comercial de Fretes

##### Objetivo

Cadastrar e gerenciar **políticas comerciais de frete** que determinam automaticamente o valor do frete nos pedidos de venda. Baseadas em múltiplos critérios (Tipo de Dado) selecionáveis via chips (máx. 6), com linhas detalhadas cobrindo seguro, pedágio, excedentes, limites e valor do frete.

##### Pré-requisitos

- **Transportadoras** (portadores) devem estar cadastradas no **VCLI0510** (aba Portador).

##### Passo a passo

1. Acesse a tela **VPDV0111 — Política Comercial de Fretes**.
2. Na seção **1 — Pesquisar**, filtre e selecione uma política para editar.
3. Na seção **2 — Criar / Editar**, preencha:
   - **Prioridade** e **Sequência** (obrigatórios).
   - **Validade Inicial** e **Final**.
   - **Tipo de Dado**: selecione até 6 tipos nos chips (Cliente, Transportadora, Cidade, UF, CEP, Rota, Veículo, Carga Fracionada, Capital, Tipo Veículo, Item, Classificação do Item).
4. Clique em **Política** para abrir o modal rico com 8 blocos:
   - **Dados da Linha**: Linha, Início, Fim, Transportadora.
   - **Seguro**: Valor, Tipo (Percentual/Valor), Aplicação (Valor da Nota/Valor Mercadoria).
   - **Pedágio**: Valor, Tipo, Aplicação.
   - **Valor Excedente**: Valor, Tipo, Aplicação.
   - **Peso Excedente**: Valor, Tipo, Aplicação.
   - **Limites**: Valor Até, Pesos Até.
   - **Valor Frete**: Valor, Tipo, Aplicação.
   - **Excedente**: Toggle, Valor Base, Peso Base.
5. Preencha os blocos desejados e clique em **Adicionar Linha**.
6. Clique em **Salvar**.

##### Campos

**Cabeçalho:**

| Campo | Tipo | Obrigatório | Função |
|-------|------|-------------|--------|
| Prioridade | número | Sim | Ordem de avaliação |
| Sequência | número | Sim | Número sequencial único |
| Validade Inicial | data | Não | Data de início |
| Validade Final | data | Não | Data de fim |
| Tipo de Dado | chips (multiselect) | Não | Até 6 de 12 tipos |

**Modal — Bloco Dados da Linha:**

| Campo | Tipo | Função |
|-------|------|--------|
| Linha | número | Sequencial |
| Início | número | Início da faixa |
| Fim | número | Fim da faixa |
| Transportadora | texto | Código da transportadora |

**Blocos Seguro / Pedágio / Valor Excedente / Peso Excedente / Valor Frete (cada):**

| Campo | Tipo | Opções | Função |
|-------|------|--------|--------|
| Valor | número | — | Valor base |
| Tipo | seleção | Percentual / Valor | Incidência |
| Aplicação | seleção | Valor da Nota / Valor Mercadoria | Base de cálculo |

**Bloco Limites:**

| Campo | Tipo | Função |
|-------|------|--------|
| Valor Até | número | Limite de valor da nota |
| Pesos Até | número | Limite de peso |

**Bloco Excedente:**

| Campo | Tipo | Função |
|-------|------|--------|
| Excedente | booleano | Indica cálculo de excedente |
| Valor Base | número | Referência de valor |
| Peso Base | número | Referência de peso |

##### Observações importantes

- Máximo de 6 tipos de dado simultâneos.
- Ordem de avaliação por prioridade e sequência — primeira que atender é aplicada.
- "Aplicação" define se o cálculo incide sobre "Valor da Nota" (com impostos) ou "Valor Mercadoria" (apenas produtos).
- A política é consultada automaticamente no VPDV0200 e VPLC0200.

##### Telas relacionadas

- **VPDV0200 (Cadastro de Pedido de Venda)**: Cálculo de frete no pedido.
- **VCLI0500 (Cadastro de Cliente)**: Endereço do cliente fornece UF/Cidade/CEP.
- **VCLI0202 (Percentuais de Frete por Cliente)**: Complementa com taxas por cliente.
- **VPLC0200 (Montagem de Carga)**: Consolida fretes de múltiplos pedidos.
- **VPDV0108 (Política de Descontos)**: Impacta o valor base do cálculo de frete.


---

#### VPDV0200 — Cadastro de Pedido de Venda

##### Objetivo

**Tela central do módulo PDV** — aqui são criados, editados e gerenciados todos os pedidos de venda do sistema. Organizada em 3 abas (Dados Gerais, Itens, Totais), integra informações do cliente, estabelecimentos, representante, parâmetros fiscais e comerciais. É o ponto de partida de todo o fluxo comercial.

##### Pré-requisitos

Todos os cadastros de apoio devem estar concluídos: VCLI0500, VENT0200, VCLI0510, VCLI0520, VCLI0530, VCLI0117 (se houver), VPDV0108, VPDV0111.

##### Passo a passo

1. Acesse **VPDV0200 — Cadastro de Pedido de Venda**.
2. Clique em **Novo**.

**Aba Dados Gerais:**

3. Preencha:
   - **Status**: Rascunho (inicial), Pedido VentureWeb, Em Análise, Pedido ERP, Orçamento.
   - **Origem**: Normal, Assistência, Cópia, Precificação, Negociação, Importado, Reserva, Inter-Fábrica.
   - **Emissão** e **Data Digitação**: preenchidas automaticamente.
   - **Data Entrega** e **Data Venda**.
4. Informe o **Cliente** (obrigatório). O nome é preenchido automaticamente. Os parâmetros padrão são carregados.
5. Configure **Estab Fatura**, **Estab Cobrança**, **Estab Entrega**.
6. Preencha **Representante**, **Plano**, **Divisão Venda**, **Canal Venda**, **Comissão (%)**.
7. Configure **Tipo Imposto**, **Ind. Presença** (7 opções), **Tipo NF**, **Tabela Venda**, **Cond. Pagto**, **Portador**.
8. Toggle **Firme** (não cancelável) e **NFC-e** (venda ao consumidor).
9. **Pedido Representante** e **Ordem de Compra** (opcionais).
10. Clique em **Salvar**.

**Aba Itens:**

11. Clique em **Adicionar Item**:
    - **Item**: código do produto.
    - **Descrição**: automática.
    - **UM**, **Quantidade**, **Valor Unit.**.
    - **Valor Total**: calculado automaticamente (Qtd × Valor Unit.).
    - **Tipo NF**: pode diferir do cabeçalho.
12. Clique em **Confirmar**. Repita para todos os itens.

**Aba Totais:**

13. Visualize os cards: Total Itens, Peso Líquido/Bruto, Total Bruto/Líquido, c/IPI, c/ST.

14. Altere o status do pedido conforme o fluxo de aprovação.

##### Campos

**Aba Dados Gerais (28 campos):**

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Status | seleção | Sim | Rascunho / Pedido VentureWeb / Em Análise / Pedido ERP / Orçamento | Situação do pedido |
| Liberação | status | Não | — | Status de liberação |
| Pedido | texto (auto) | Sim | — | Gerado ao salvar |
| Origem | seleção | Sim | Normal / Assistência / Cópia / Precificação / Negociação / Importado / Reserva / Inter-Fábrica | Canal de origem |
| Emissão | data | Sim | — | Data de criação |
| Data Digitação | data | Sim | — | Data de digitação |
| Data Entrega | data | Não | — | Data prevista de entrega |
| Data Venda | data | Não | — | Data da venda |
| Pedido Representante | texto | Não | — | Nº no sistema do representante |
| Firme | toggle | Não | — | Pedido não cancelável |
| NFCe | toggle | Não | — | Emissão de NFC-e |
| Ordem de Compra | texto | Não | — | OC do cliente |
| Cliente | texto | Sim | — | Código do cliente |
| Cliente (Nome) | texto (auto) | Não | — | Nome preenchido automaticamente |
| Estab Fatura | seleção | Não | — | Estabelecimento de faturamento |
| Estab Cobrança | seleção | Não | — | Estabelecimento de cobrança |
| Estab Entrega | seleção | Não | — | Estabelecimento de entrega |
| Representante | seleção | Não | — | Vendedor responsável |
| Plano | seleção | Não | — | Plano de vendas |
| Divisão Venda | seleção | Não | — | Divisão (VVND0100) |
| Canal Venda | seleção | Não | — | Canal de venda |
| Comissão (%) | número | Não | — | Percentual de comissão |
| Tipo Imposto | seleção | Não | — | Tipo de imposto (VCLI0530) |
| Ind. Presença | seleção | Não | 7 opções | Indicador de presença |
| Tipo NF | seleção | Sim | — | Tipo de NF (VCLI0530) |
| Tabela Venda | seleção | Não | — | Tabela de preços (VCLI0520) |
| Cond. Pagto | seleção | Não | — | Condição de pagamento (VCLI0520) |
| Portador | seleção | Não | — | Carteira de cobrança (VCLI0510) |

**Aba Itens:**

| Campo | Tipo | Obrigatório | Função |
|-------|------|-------------|--------|
| Seq | número (auto) | Sim | Sequencial |
| Item | texto | Sim | Código do produto |
| Descrição | texto (auto) | Não | Descrição do produto |
| Máscara | seleção | Não | Máscara configurável |
| UM | texto | Não | Unidade de medida |
| Quantidade | número | Sim | Quantidade vendida |
| Valor Unit. | número | Sim | Preço unitário |
| Valor Total | número (auto) | Não | Qtd × Valor Unit. |
| Tipo NF | seleção | Não | Tipo de NF do item |

**Aba Totais (cards):**

| Card | Descrição |
|------|-----------|
| Total Itens | Soma dos valores dos itens |
| Peso Líquido | Soma dos pesos líquidos |
| Peso Bruto | Soma dos pesos brutos |
| Total Bruto | Valor antes de descontos |
| Total Líquido | Valor após descontos |
| c/IPI | Total com IPI incluso |
| c/ST | Total com Substituição Tributária |

##### Observações importantes

- **Ciclo de vida**: Rascunho → Em Análise → Liberado → Faturado. Cada status restringe ou libera operações.
- **Cliente obrigatório**: O sistema valida se o cliente não está bloqueado.
- Ao adicionar itens, o sistema consulta VCLI0117 (permissões), VPDV0108 (descontos) e VPDV0111 (fretes).
- O preço unitário é carregado da Tabela de Venda ou informado manualmente (respeitando tolerâncias).
- **Firme**: Pedidos firmes não podem ser cancelados sem autorização superior.
- **NFC-e**: Adapta o comportamento para venda ao consumidor final (varejo), modelo 65.

##### Telas relacionadas

- **VCLI0500**: Cliente e parâmetros padrão carregados no pedido.
- **VCLI0117**: Validado ao adicionar itens.
- **VPDV0108**: Descontos automáticos.
- **VPDV0111**: Cálculo de frete.
- **VENT0100**: Consulta de pedidos criados.
- **VEXP0100**: Expedição após liberação.
- **VPDV0253**: Acompanhamento gerencial.
- **VEXR0100**: Reprogramação de entrega.
- **VVND0100**: Divisão de vendas.
- **VRE0203**: Projeção de comissões.


---

#### VPDV0253 — Console de Acompanhamento de Pedidos

##### Objetivo

Oferecer uma **visão gerencial em tempo real** do andamento dos pedidos. Apresenta **cards de posição** agrupados, tabela de pedidos com indicadores de prazo (semáforo verde/amarelo/vermelho) e **drill-down** para itens e histórico de movimentações.

##### Pré-requisitos

- Pedidos de venda devem existir (criados via **VPDV0200**).

##### Passo a passo

1. Acesse **VPDV0253 — Console de Acompanhamento de Pedidos**.
2. Nos filtros, preencha **Pedido**, **Data Entrega** e toggle **Exibir Atendidos** (default: ocultos).
3. Clique em **Consultar**.
4. Analise os **cards de posição** (dashboard): cada card mostra uma posição e a contagem de pedidos.
5. Na tabela, visualize: Pedido, Cliente, Data Entrega, Posição, Setor, Prazo (bolinha verde/amarela/vermelha), Status, Itens.
6. Para drill-down, clique em **Itens** (visão detalhada dos itens) ou **Hist.** (histórico de movimentações com data/hora, usuário, operação).
7. Use o **breadcrumb** para navegar de volta.

##### Campos

**Filtros:**

| Campo | Tipo | Obrigatório | Função |
|-------|------|-------------|--------|
| Pedido | texto | Não | Filtrar por número |
| Data Entrega | data | Não | Filtrar por data |
| Exibir Atendidos | toggle | Não | Incluir concluídos |

**Tabela de Pedidos:**

| Coluna | Descrição |
|--------|-----------|
| Pedido | Nº do pedido |
| Cliente | Nome do cliente |
| Data Entrega | Previsão de entrega |
| Posição | Etapa atual |
| Setor | Departamento responsável |
| Prazo | Verde (ok), Amarelo (atenção), Vermelho (atrasado) |
| Status | Situação do pedido |
| Itens | Quantidade de itens |

**Drill-down Itens:** Nº, Item, Descrição, Data Entrega, Posição, Prazo.

**Drill-down Históricos:** Data/Hora, Usuário, Operação, Posição Anterior, Posição Nova.

##### Observações importantes

- Console **read-only** — para editar, use VPDV0200.
- Cards de posição são dinâmicos, recalculados a cada consulta.
- O semáforo de prazo compara data de entrega com data atual e estágio do pedido.
- Histórico registra cada transição de status com rastreabilidade completa.

##### Telas relacionadas

- **VPDV0200**: Origem dos pedidos. Para editar, navegue para lá.
- **VENT0100**: Visão tabular complementar com mais filtros.
- **VEXR0100**: Reprogramação para pedidos com indicador vermelho.
- **VEXP0100**: A posição reflete o andamento da expedição.


---

#### VVRE0200 — Console de Vendas Recorrentes

##### Objetivo

Gerenciar **contratos de vendas recorrentes** (assinaturas), com suporte a upgrade, downgrade, reajustes e cancelamentos. Permite ações em lote como gerar pedido, recalcular, cancelar e processar downgrades.

##### Pré-requisitos

- **Clientes** no **VCLI0500**.
- **Itens/Serviços** no **VENT0200**.

##### Passo a passo

1. Acesse **VVRE0200 — Console de Vendas Recorrentes**.
2. Filtre por **Tipo Movimento** (Upgrade/Downgrade/Reajuste/Venda/Cancelamento) e **Somente ativos**.
3. Clique em **Pesquisar**.
4. Selecione registros via checkbox.
5. Use as **ações em lote**: Gerar pedido, Excluir pedido, Excluir recorrência, Recálculo, Cancelamento, Downgrade, Data Reajuste, Edição.

##### Campos

**Filtros:**

| Campo | Tipo | Opções | Função |
|-------|------|--------|--------|
| Tipo Movimento | seleção | Upgrade / Downgrade / Reajuste / Venda / Cancelamento | Filtrar por tipo |
| Somente ativos | toggle | — | Apenas recorrências ativas |

**Tabela:** Tipo, Cliente, Estabelecimento, Item, Valor, Parcelas, Próx. Pagamento, Data Reajuste, Nº Pedido, Ativo.

**Ações em lote:** Gerar Pedido, Exclusão Pedido, Exclusão Recorrência, Recálculo, Cancelamento, Downgrade, Data Reajuste, Edição.

##### Observações importantes

- **Tipos de movimento**: Venda (original), Upgrade (aumento), Downgrade (redução), Reajuste (alteração de valor), Cancelamento (encerramento).
- Ao executar "Gerar Pedido", um pedido é criado no VPDV0200 com os dados do contrato.
- Recorrências canceladas não geram novos pedidos.

##### Telas relacionadas

- **VPDV0200**: Destino dos pedidos gerados.
- **VCLI0500**: Clientes titulares.
- **VFIN0210**: Contas a receber após faturamento.


---

#### VRE0203 — Consulta de Comissões Futuras

##### Objetivo

Projetar **comissões futuras** a serem pagas aos representantes, baseadas em pedidos ainda não faturados ou vendas recorrentes. Tabela hierárquica de 3 níveis (Representante → Venda → Produto) com colunas dinâmicas por mês.

##### Pré-requisitos

- Pedidos de venda ou vendas recorrentes com representante e comissão definidos.

##### Passo a passo

1. Acesse **VRE0203 — Consulta de Comissões Futuras**.
2. Preencha filtros: Data Inicial/Final, Cliente, Representante, Item, Classificação, Reajuste.
3. Clique em **Executar**.
4. Analise a tabela hierárquica:
   - **Nível 1 — Representante**: código e nome.
   - **Nível 2 — Venda**: pedido/venda com cliente e totais.
   - **Nível 3 — Produto**: produto com valor de comissão por mês.
5. As colunas de meses são dinâmicas conforme o período consultado. Última coluna: Total geral.

##### Campos

**Filtros:** Data Inicial, Data Final, Cliente, Representante, Item, Classificação, Reajuste.

**Tabela Hierárquica:** Representante (código, nome) → Venda (nº venda, cliente) → Produto (código, descrição) com colunas de meses dinâmicas e total geral.

##### Observações importantes

- **Projeção**, não realização. Comissões só se tornam devidas após faturamento.
- Colunas dinâmicas detectam automaticamente o range de meses com dados.
- O cálculo considera o percentual de comissão do pedido (VPDV0200).

##### Telas relacionadas

- **VPDV0200**: Pedidos com comissão definida.
- **VVRE0200**: Vendas recorrentes também geram projeções.
- **VFIN0210**: Contas a receber quando as comissões se tornam efetivas.


---

### Módulo: Almoxarifado (1 tela)

---

#### VENT0800 — Cadastro de Almoxarifado

##### Objetivo

Cadastrar e gerenciar os **almoxarifados** do sistema — locais físicos ou lógicos onde os itens são armazenados, recebidos ou expedidos. Classificados por localização (Interno, Externo, Expedição, etc.) e tipo (Normal, Linha de Produção). Referência fundamental para estoque, expedição, produção e faturamento.

##### Pré-requisitos

- **Empresa / Estabelecimentos** devem estar cadastrados no **VENT0100**.

##### Passo a passo

1. Acesse **VENT0800 — Cadastro de Almoxarifado**.
2. Clique em **Novo**.
3. Na aba **Dados**, preencha:
   - **Código** (obrigatório): identificador único.
   - **Descrição** (obrigatório): nome do almoxarifado.
   - **Localização**: Interno, Externo, Assistência Técnica, Rejeição, Inspeção, Expedição, Reserva ou Trânsito.
   - **Tipo**: Normal ou Linha de Produção.
   - **Disponível**: toggle ativo/inativo.
   - **Almox Expedição**: almoxarifado de destino.
   - **Estabelecimento**: código vinculado.
   - **Observação**: campo livre.
4. Se localização for **Externo** ou **Trânsito**, preencha os vínculos nas abas **Clientes** e **Fornecedores**.
5. Clique em **Salvar**.

##### Campos

**Aba Dados:**

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Código | texto | Sim | — | Identificador único |
| Descrição | texto | Sim | — | Nome do almoxarifado |
| Localização | seleção | Não | Interno / Externo / Assistência Técnica / Rejeição / Inspeção / Expedição / Reserva / Trânsito | Tipo de localização |
| Tipo | seleção | Não | Normal / Linha de Produção | Classificação |
| Disponível | toggle | Não | — | Status ativo/inativo |
| Almox Expedição | texto | Não | — | Almoxarifado vinculado para expedição |
| Estabelecimento | texto | Não | — | Código do estabelecimento |
| Observação | texto | Não | — | Anotações livres |

**Abas Clientes / Fornecedores (para Externo e Trânsito):**

| Campo | Tipo | Obrigatório | Função |
|-------|------|-------------|--------|
| Cliente | seleção | Sim (se Externo/Trânsito) | Cliente dono do almoxarifado externo |
| Fornecedor | seleção | Sim (se Externo/Trânsito) | Fornecedor gestor |

##### Observações importantes

- **Localização** determina o comportamento: Interno (padrão), Expedição (baixa ao faturar), Rejeição e Inspeção (qualidade), Trânsito (transferências), Assistência Técnica (uso exclusivo do módulo).
- Almoxarifados Externo e Trânsito exigem vínculo de cliente, estabelecimento e fornecedor.
- Almoxarifados não disponíveis não aparecem como opção em movimentações.

##### Telas relacionadas

- **VENT0100 (Cadastro de Empresa)**: Fornece os estabelecimentos.
- **VEXP0100 (Expedição / Romaneio)**: Utiliza o almoxarifado de expedição.
- **VPDV0200 (Cadastro de Pedido de Venda)**: Campo "Estab Entrega" referencia o almoxarifado.


---

### Módulo: Custos / Precificação (1 tela)

---

#### VCST0202 — Precificação de Produtos

##### Objetivo

Realizar a **simulação e formação de preços de venda** baseados em custos, margens e impostos. Permite criar cenários de precificação com controle de revisões (ciclo de vida Aberta/Fechada), seleção de itens, cálculo automático de margem e configuração de parâmetros comerciais (cliente, tabela de venda, frete, seguro, comissão).

##### Pré-requisitos

- **Itens** com custo definido no **VENT0200**.
- **Clientes** (opcional) no **VCLI0500**.
- **Tabelas de Venda** (opcional) no **VCLI0520**.
- **Classificações de Itens** (opcional, para máscaras) no **VCLA0100**.

##### Passo a passo

1. Acesse **VCST0202 — Precificação de Produtos**.

**Aba Precificações:**

2. Clique em **Novo**. Preencha **Descrição** e **Empresa**. Salve. O código é gerado automaticamente (PR0001, PR0002...).

**Aba Revisões:**

3. Selecione a precificação. Cada precificação tem ao menos uma revisão Aberta.
4. Para criar nova revisão: **Nova Revisão**, preencha descrição, data validade, observações. Salve.
5. Para finalizar, clique em **Fechar Revisão** (situação muda para Fechada).

**Aba Itens:**

6. Com revisão Aberta, clique em **Selecionar Itens**.
7. Para cada item, ajuste **Preço Venda**, **Custo** e veja a **Margem (%)** calculada automaticamente: `(Preço Venda - Custo) / Preço Venda × 100`.
8. Use **Cálculo Automático** para aplicar margem uniforme.
9. Use checkboxes para selecionar/desselecionar itens. "Selecionar Todos" afeta toda a lista.

**Aba Dados Gerais:**

10. Configure parâmetros: Cliente, Tabela de Venda, Tipo Frete (10 opções), Cond. Pagamento, Valor Frete, Valor Seguro, Comissão Padrão (%).
11. Clique em **Recalcular** para atualizar preços conforme novos parâmetros.
12. Ao finalizar, volte à aba Revisões e **Feche a Revisão**.

##### Campos

**Aba Precificações:**

| Campo | Tipo | Obrigatório | Função |
|-------|------|-------------|--------|
| Código | texto (auto) | Sim | Gerado automaticamente (PR0001...) |
| Descrição | texto | Sim | Nome da precificação |
| Empresa | texto | Sim | Código do estabelecimento |
| Revisões | número | Não | Quantidade de revisões |
| Data Cadastro | data | Sim | Data de criação |

**Aba Revisões:**

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Código | texto | Sim | — | Código da revisão |
| Descrição | texto | Não | — | Descrição |
| Data Cadastro | data | Sim | — | Data de criação |
| Data Validade | data | Não | — | Expiração |
| Última Alteração | data | Não | — | Última modificação |
| Último Cálculo | data | Não | — | Último recálculo |
| Situação | seleção | Não | Aberta / Fechada | Status |
| Observações | texto | Não | — | Anotações |

**Aba Itens:**

| Campo | Tipo | Obrigatório | Função |
|-------|------|-------------|--------|
| Linha | número | Sim | Sequencial |
| Código | texto | Sim | Código do item |
| Descrição | texto | Não | Descrição |
| Máscara | seleção | Não | Máscara configurável |
| Quantidade | número | Não | Quantidade de referência |
| Preço Venda | número | Não | Preço proposto |
| Custo | número | Não | Custo do item |
| Margem (%) | número (auto) | Não | (Preço Venda - Custo) / Preço Venda × 100 |

**Aba Dados Gerais:**

| Campo | Tipo | Obrigatório | Opções | Função |
|-------|------|-------------|--------|--------|
| Cliente | texto | Não | — | Cliente alvo |
| Tabela de Venda | seleção | Não | — | Tabela vinculada |
| Tipo Frete | seleção | Não | 10 opções (Cif-Contrat. a Terceiros) | Modalidade |
| Cond. Pagamento | seleção | Não | — | Condição |
| Valor Frete | número | Não | — | Simulação de frete |
| Valor Seguro | número | Não | — | Simulação de seguro |
| Comissão Padrão (%) | número | Não | — | Percentual |

##### Observações importantes

- **Ciclo de revisões**: Apenas revisões Abertas permitem edição. Ao fechar, torna-se histórica — abra uma nova para alterações. Garante rastreabilidade.
- **Margem**: Calculada automaticamente. Editar o Preço Venda ou Custo atualiza a margem instantaneamente.
- **Parâmetros comerciais**: Os valores de frete, seguro e comissão na aba Dados Gerais são para simulação e não alteram os cadastros mestres.
- Precificações podem ser usadas como base para gerar pedidos de venda (origem "Precificação" no VPDV0200).

##### Telas relacionadas

- **VENT0200 (Cadastro de Itens)**: Origem dos itens com custo.
- **VCLI0500 (Cadastro de Cliente)**: Cliente alvo da precificação.
- **VCLI0520 (Apoio Comercial)**: Tabelas de Venda e Condições de Pagamento referenciadas.
- **VPDV0200 (Cadastro de Pedido de Venda)**: Precificações aprovadas podem originar pedidos com origem "Precificação".
- **VCLA0100 (Classificação de Itens)**: Máscaras configuráveis.


---

## Resumo dos Fluxos de Integração

##### Fluxo Principal: Do Cadastro ao Faturamento

```
VCLI0510/0520/0530 (Cadastros de Apoio)
           ↓
VCLI0500 (Cadastro de Cliente)
           ↓
VCLI0117 (Permissões/Restrições) + VCLI0202 (Fretes por Cliente)
           ↓
VPDV0108 (Política Descontos) + VPDV0111 (Política Fretes)
           ↓
VPDV0200 (Pedido de Venda) ← VCST0202 (Precificação)
           ↓
VENT0100 (Consulta) + VPDV0253 (Acompanhamento) + VEXR0100 (Reprogramação)
           ↓
VEXP0100 (Expedição/Romaneio) → VENT0800 (Almoxarifado)
           ↓
VFIS0100 (Faturamento / NF-e Saída)
           ↓
VFIN0210 (Contas a Receber)
```

##### Fluxo de Vendas Recorrentes

```
VVRE0200 (Console de Recorrências) → VPDV0200 (Gera Pedido) → Fluxo Normal
                                   → VRE0203 (Projeção de Comissões)
```

##### Fluxo de Precificação

```
VCST0202 (Simulação) → Revisão Aberta → Cálculo de Margens
                    → Revisão Fechada → VPDV0200 (Origem: Precificação)
```

---

> **Documento gerado com base na análise completa do código-fonte do ERP Venture.**
> Para informações sobre outras telas do sistema, consulte `HELP_TELAS_ERP.md`.
> Em caso de dúvidas, contate o suporte técnico do Grupo Venture.


---

## Processo Fiscal

## Processo Fiscal

> Documentação completa do processo fiscal do ERP Venture.
> Total de telas documentadas: **20**
> Última atualização: Junho 2026

---

## Visão Geral do Processo Fiscal

O processo fiscal do ERP Venture é a espinha dorsal da gestão tributária da empresa, cobrindo todo o ciclo de vida dos documentos fiscais — desde a configuração do emitente e das tabelas tributárias até a emissão de NF-e, apuração de impostos e geração de relatórios. O processo é organizado em uma sequência lógica de camadas:

1. **Configuração Fiscal (VFIS0100):** Fundação do módulo. Define o emitente (CNPJ, Razão Social, IE), o regime tributário (Simples Nacional, Lucro Presumido ou Lucro Real), o token de integração com a API Focus NF-e (gateway obrigatório para comunicação com a SEFAZ) e as alíquotas padrão de ICMS, PIS, COFINS, juros, multa e prazos de vencimento. Sem esta tela configurada, nenhuma outra tela fiscal funciona.

2. **Tabelas Tributárias (VFIS0110):** Repositório central de alíquotas. Organizada em três abas — NCM (com IPI, PIS, COFINS e CSTs), ICMS Interno (alíquotas por UF com FCP) e ICMS Interestadual (pares origem-destino). Estas alíquotas são consumidas por todas as telas de emissão fiscal como valores padrão.

3. **Classificações e Parâmetros (VFIS0300, VFIS0310, VFIS0320, VFIS0330, VFIS0350, VFIS0360):** Camada de especialização tributária. Os CFOPs (VFIS0300) definem as naturezas de operação. As Classificações Fiscais (VFIS0350) vinculam itens específicos a NCM, CEST, alíquotas e atributos de exportação. Os Parâmetros ICMS/IPI (VFIS0320) refinam alíquotas por UF + NCM/Item + tipo de operação. O motor de regras (VFIS0330) aplica reduções, substituições e diferimentos de ICMS com lógica hierárquica. Os Dispositivos Legais (VFIS0310) fundamentam juridicamente cada tratamento diferenciado. Os Tipos de Operação de Entrada (VFIS0360) padronizam as entradas fiscais por grupo de UF.

4. **Emissão de Documentos Fiscais (VFIS0200, VFIS0210, VFIS0220, VNFS0100):** O coração operacional. A VFIS0200 emite NF-e de Saída com cálculo automático de ICMS/IPI/PIS/COFINS e integração com a SEFAZ via API Focus (autorização, cancelamento, CC-e). A VFIS0210 registra NF-e de Entrada em três modos (manual, chave de acesso de 44 dígitos, upload de XML) e gera automaticamente contas a pagar no financeiro. A VFIS0220 controla CT-es para rateio de frete. A VNFS0100 emite NFS-e de serviços com cálculo automático de ISS.

5. **Apuração e Ajustes (VFIS0340, VFIS0500 a VFIS0560):** A camada de fechamento. A VFIS0340 calcula o Simples Nacional por anexo. As telas VFIS0500 a VFIS0530 mantêm as tabelas de apoio à apuração (motivos DAPI, códigos de ajuste SPED 5.1.1 e 5.2/5.3/5.6/5.7, linhas do Bloco E). A VFIS0540 centraliza os lançamentos manuais de ICMS por período/UF com notas vinculadas e adicionais C197. A VFIS0550 controla restituições de ICMS ST. A VFIS0560 emite notas especiais de ajuste com geração automática de lançamentos na apuração.

**Como as telas se conectam:** A VFIS0100 é pré-requisito de todas as demais. A VFIS0110 alimenta VFIS0200 e VFIS0210 com alíquotas padrão. A VFIS0350 e VFIS0320 especializam essas alíquotas por item/UF. A VFIS0330 aplica regras de redução/diferimento sobre as alíquotas base. Os CFOPs da VFIS0300 são referenciados em todas as telas de emissão. A VFIS0200 e VFIS0210 alimentam automaticamente a apuração na VFIS0540, que é complementada por ajustes manuais e pelas notas especiais da VFIS0560. Ao final do período, a VFIS0340 (para Simples Nacional) ou o conjunto VFIS0530+VFIS0540 (para demais regimes) consolidam a apuração, que gera as guias de recolhimento no módulo financeiro.

---

## Pré-Requisitos Gerais

Antes de utilizar as telas do processo fiscal, os seguintes cadastros devem estar previamente realizados no sistema:

| Tela | Descrição | Por que é necessária |
|------|-----------|---------------------|
| **VEMP0100 — Cadastro Empresa** | Cadastro da empresa emitente (CNPJ, Razão Social, IE, regime tributário, endereço) | A VFIS0100 depende do cadastro da empresa para validar o CNPJ e carregar os dados do emitente. Sem empresa cadastrada, não é possível configurar o módulo fiscal. |
| **VLOC0100 — Localização Países/UFs** | Cadastro de países e Unidades Federativas com códigos IBGE, DDI, BACEN e SISCOMEX | Todas as telas fiscais que trabalham com UF (VFIS0100, VFIS0110, VFIS0200, VFIS0210, VFIS0320, VFIS0330, VFIS0500, VFIS0510, VFIS0520, VFIS0540, VFIS0550, VNFS0100) validam as UFs contra esta tabela. |
| **VCLI0500 — Cadastro de Cliente** | Cadastro de clientes (CNPJ/CPF, Razão Social, IE, endereço) | A VFIS0200 (NF-e de Saída) utiliza os clientes como destinatários das notas fiscais. |
| **VAVR0200 — Cadastro de Fornecedores** | Cadastro de fornecedores (CNPJ/CPF, Razão Social, IE, endereço) | A VFIS0210 (NF-e de Entrada) utiliza os fornecedores como emitentes das notas de entrada. A VFIS0220 (CT-e) referencia transportadoras. |

---

## Fluxo do Processo Fiscal

```
┌──────────────────────────────────────────────────────────────────┐
│                   FLUXO DO PROCESSO FISCAL                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. CONFIGURAR EMITENTE                                          │
│     └─ VFIS0100 (Configuração Fiscal)                            │
│        • CNPJ, Razão Social, IE, Regime Tributário              │
│        • Token Focus NF-e, Ambiente (Homologação/Produção)      │
│        • Alíquotas padrão, prazos de vencimento                 │
│        • Endereço completo para SEFAZ                            │
│                          │                                       │
│                          ▼                                       │
│  2. CADASTRAR TABELAS TRIBUTÁRIAS                                │
│     └─ VFIS0110 (Tabelas Tributárias)                            │
│        • Aba NCM: IPI, PIS, COFINS, CSTs                        │
│        • Aba ICMS Interno: alíquotas por UF + FCP               │
│        • Aba ICMS Interestadual: pares origem-destino            │
│                          │                                       │
│                          ▼                                       │
│  3. CADASTRAR CFOPs E NATUREZAS                                  │
│     └─ VFIS0300 (CFOPs / Naturezas de Operação)                 │
│        • Códigos de 4 dígitos, natureza, indicadores            │
│        • Flags: DIFAL, Doação                                    │
│        • Classificações: Utilização, Ind.Operação, Tipo         │
│                          │                                       │
│                          ▼                                       │
│  4. CONFIGURAR PARÂMETROS E REGRAS                               │
│     ├─ VFIS0350 (Classificações Fiscais)                        │
│     │   • NCM, CEST, Ex Tarifário, alíquotas                    │
│     │   • Idiomas (exportação), Atributos (Drawback/Reintegra)  │
│     ├─ VFIS0320 (Parâmetros ICMS/IPI)                            │
│     │   • Alíquotas por UF + NCM/Item + Tipo Operação           │
│     ├─ VFIS0330 (Redução/Substituição/Diferimento ICMS)         │
│     │   • Motor hierárquico de regras tributárias               │
│     │   • Busca prioritária por cenário                         │
│     ├─ VFIS0310 (Dispositivos Legais)                            │
│     │   • Fundamentação legal das regras                        │
│     └─ VFIS0360 (Tipos Operação Entrada)                         │
│         • Padronização de entradas por grupo de UF              │
│                          │                                       │
│                          ▼                                       │
│  5. EMITIR / LANÇAR DOCUMENTOS FISCAIS                           │
│     ├─ VFIS0200 (NF-e de Saída)                                  │
│     │   • Rascunho → Autorizar (Focus/SEFAZ) → Cancelar/CC-e   │
│     │   • Cálculo automático ICMS/IPI/PIS/COFINS                │
│     ├─ VFIS0210 (NF-e de Entrada)                                │
│     │   • Manual / Chave 44 dígitos (Focus) / Upload XML        │
│     │   • Lançar → Aprovar → Gera conta a pagar (VFIN0200)     │
│     ├─ VFIS0220 (CT-e)                                           │
│     │   • Registro local, rateio VALOR/PESO                     │
│     └─ VNFS0100 (NFS-e)                                          │
│         • RPS → Rascunho → Autorizar → Cancelar                │
│         • Cálculo automático ISS                                │
│                          │                                       │
│                          ▼                                       │
│  6. APURAR IMPOSTOS                                              │
│     ├─ VFIS0340 (Apuração Simples Nacional)                      │
│     │   • Cálculo por anexo (I-VI), DAS                         │
│     ├─ VFIS0530 (Linhas Apuração ICMS - Bloco E)                │
│     │   • Estrutura de débitos e créditos                       │
│     ├─ VFIS0540 (Lançamentos Resumo ICMS)                        │
│     │   • Lançamentos manuais por período/UF/CFOP               │
│     │   • Notas vinculadas, adicionais C197                     │
│     └─ VFIS0560 (Notas Especiais Ajuste)                         │
│         • Complementares e de ajuste                            │
│         • Geração automática de lançamentos                     │
│                          │                                       │
│                          ▼                                       │
│  7. TABELAS DE APOIO À APURAÇÃO                                  │
│     ├─ VFIS0500 (Motivos Transferência DAPI)                    │
│     ├─ VFIS0510 (Códigos Ajuste ICMS 5.1.1)                    │
│     ├─ VFIS0520 (Códigos Ajuste 5.2/5.3/5.6/5.7)              │
│     └─ VFIS0550 (Restituição ICMS ST)                           │
│                          │                                       │
│                          ▼                                       │
│  8. GERAR RELATÓRIOS E DECLARAÇÕES                              │
│     └─ Exportação em todos os formatos (PDF, XML, CSV)          │
│        Alimentação do SPED Fiscal (EFD ICMS/IPI)                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Telas do Processo Fiscal

---

#### VFIS0100 — Configuração Fiscal

**Objetivo:** Cadastrar a identidade fiscal completa do emitente, configurar o token de integração com a API Focus NF-e para comunicação com a SEFAZ, definir as alíquotas padrão de ICMS (interno, diferimento, juros, multa) e os prazos de vencimento dos tributos. É a tela fundação de todo o módulo fiscal — sem esta configuração, nenhuma outra tela fiscal opera.

**Pré-requisitos:**
- VEMP0100 (Cadastro Empresa): A empresa emitente deve estar previamente cadastrada no sistema com CNPJ e Razão Social válidos.
- VLOC0100 (Localização Países/UFs): As UFs para o campo UF Empresa devem existir na tabela de localização.
- Token Focus NF-e: O usuário deve possuir um token válido da API Focus NF-e, obtido no painel Focus (https://focusnfe.com.br). O token é necessário para autorização de NF-e e consulta de chaves de acesso.

**Passo a passo:**

1. Acesse a tela VFIS0100 — Configuração Fiscal no menu Fiscal do ERP Venture.
2. Na seção **Emitente**, preencha o CNPJ da empresa emitente. O sistema valida o dígito verificador em tempo real pelo algoritmo módulo 11. Um indicador verde (&#10003; CNPJ/CPF válido) ou vermelho (&#10007; CNPJ/CPF inválido) aparece abaixo do campo conforme você digita.
3. Preencha a Razão Social completa da empresa, exatamente como consta no cadastro da Receita Federal. Este campo é obrigatório e será utilizado no XML da NF-e.
4. Preencha a Inscrição Estadual (IE) da empresa. Campo opcional, mas fortemente recomendado para operações interestaduais.
5. Selecione o Regime Tributário no dropdown: **1 — Simples Nacional**, **2 — Lucro Presumido** ou **3 — Lucro Real**. Esta escolha é crítica e determina como os tributos serão calculados em todo o módulo fiscal. Empresas do Simples Nacional utilizam a VFIS0340 para apuração unificada; demais regimes utilizam a apuração detalhada por tributo.
6. Informe a UF da empresa (2 caracteres, maiúsculas automáticas). Obrigatório.
7. Opcionalmente, preencha o telefone de contato do emitente.
8. Na seção **Endereço**, preencha os campos de logradouro, número, complemento, bairro, município, código IBGE (7 dígitos) e CEP. Este endereço é obrigatório para a autorização da NF-e na SEFAZ — o XML da NF-e exige endereço completo do emitente.
9. Na seção **Focus NF-e**, informe o Token Focus NF-e (campo obrigatório). Este token é a credencial de autenticação para todas as operações de NF-e via API Focus. O ambiente padrão é "Homologação" — altere para "Produção" somente quando for emitir notas fiscais reais.
10. Na seção **Tributação & Vencimentos**, configure as alíquotas em formato decimal (ex.: 0,12 = 12%):
    - **ICMS interno (ratio):** Alíquota padrão de ICMS para operações dentro do estado.
    - **Diferimento ICMS (ratio):** Percentual de ICMS diferido nas operações internas.
    - **Juros ao mês (ratio):** Taxa de juros moratórios para ICMS em atraso.
    - **Multa atraso (ratio):** Percentual de multa por recolhimento fora do prazo.
    - **Venc. ICMS (dia), Venc. IPI (dia), Venc. PIS/COFINS (dia):** Dia do mês em que cada tributo vence (1 a 31).
11. Clique em **Salvar Configuração**. O sistema valida os campos obrigatórios (CNPJ, Razão Social e UF) e persiste os dados.
12. Para recarregar os dados do banco, utilize o botão **Recarregar** (descarta alterações não salvas).
13. Para exportar a configuração, utilize o botão **Exportar** (formato CSV/JSON para backup ou transferência entre ambientes).

**Campos:**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| CNPJ | text (14 dígitos) | Sim | — | CNPJ do emitente com validação de dígito verificador em tempo real (algoritmo módulo 11). Exibe indicador visual: verde (&#10003;) para válido, vermelho (&#10007;) para inválido. |
| Razão Social | text | Sim | — | Nome empresarial completo do emitente, conforme cadastro na Receita Federal. Utilizado no XML da NF-e. |
| Inscrição Estadual (IE) | text | Não | — | Inscrição Estadual do emitente. Campo opcional mas recomendado para operações interestaduais. |
| Regime Tributário | select | Sim | 1 — Simples Nacional / 2 — Lucro Presumido / 3 — Lucro Real | Regime de tributação adotado pela empresa. Determina a lógica de cálculo de tributos em todo o módulo fiscal. |
| UF | text (2 caracteres) | Sim | UFs do VLOC0100 | Unidade Federativa da empresa. Obrigatório para a NF-e. |
| Telefone | text | Não | — | Telefone de contato do emitente. |
| Logradouro | text | Não | — | Nome da rua/avenida do endereço do emitente. |
| Número | text | Não | — | Número do endereço. |
| Complemento | text | Não | — | Complemento (sala, andar, bloco). |
| Bairro | text | Não | — | Bairro do endereço. |
| Município | text | Não | — | Nome do município do emitente. |
| Cód. IBGE | text (7 dígitos) | Não | — | Código IBGE do município. Utilizado no XML da NF-e. |
| CEP | text | Não | — | CEP do emitente (formato 00000-000). |
| Token Focus NF-e | text | Sim | — | Token de autenticação da API Focus NF-e. Obrigatório para emissão, autorização e consulta de NF-e. Dado sensível — nunca compartilhar. |
| Ambiente | select | Sim | Homologação / Produção | Define se as requisições à SEFAZ são enviadas ao ambiente de testes (Homologação) ou de produção (notas reais). |
| ICMS interno (ratio) | number | Não | 0,0000 a 1,0000 | Alíquota padrão de ICMS para operações internas (ex.: 0,12 = 12%). |
| Diferimento ICMS (ratio) | number | Não | 0,0000 a 1,0000 | Percentual de ICMS diferido nas operações internas. |
| Juros ao mês (ratio) | number | Não | 0,0000 a 1,0000 | Taxa de juros moratórios para ICMS recolhido em atraso. |
| Multa atraso (ratio) | number | Não | 0,0000 a 1,0000 | Percentual de multa por atraso no recolhimento de ICMS. |
| Venc. ICMS (dia) | number | Não | 1 a 31 | Dia do mês de vencimento do ICMS. |
| Venc. IPI (dia) | number | Não | 1 a 31 | Dia do mês de vencimento do IPI. |
| Venc. PIS/COFINS (dia) | number | Não | 1 a 31 | Dia do mês de vencimento do PIS e COFINS. |

**Observações importantes:**
- O CNPJ é validado pelo algoritmo módulo 11 padrão da Receita Federal. O indicador visual aparece apenas quando o campo possui conteúdo.
- O Token Focus NF-e é um dado sensível. Ele é armazenado com criptografia no banco de dados e nunca é incluído em logs de erro ou exportações. Mantenha o token em segurança e não o compartilhe.
- As alíquotas configuradas nesta tela funcionam como **sugestão padrão** para os cálculos automáticos nas telas VFIS0200 (NF-e de Saída), VFIS0210 (NF-e de Entrada) e VFIS0220 (CT-e). Em cada tela de emissão, as alíquotas podem ser sobrescritas manualmente por item ou por nota.
- O campo Regime Tributário é imutável na prática durante a operação — alterá-lo requer reconfigurar toda a lógica de apuração. Empresas do Simples Nacional utilizam a VFIS0340; demais regimes utilizam a apuração detalhada por tributo.
- O rodapé da tela exibe um resumo com o regime tributário selecionado e o ambiente Focus NF-e ativo, facilitando a verificação rápida da configuração atual.
- A alteração entre ambientes (Homologação/Produção) é uma operação sensível: certifique-se de estar no ambiente correto antes de emitir notas fiscais.

**Telas relacionadas:**
- **VFIS0110 (Tabelas Tributárias):** As alíquotas padrão configuradas aqui são usadas como fallback quando as tabelas tributárias não possuem uma alíquota específica para o NCM/UF. O regime tributário da VFIS0100 também afeta quais CSTs são aplicáveis.
- **VFIS0200 (NF-e de Saída):** Consome diretamente o Token Focus NF-e para autorizar notas na SEFAZ. Utiliza o CNPJ, Razão Social, IE, endereço e UF do emitente no XML da NF-e. As alíquotas padrão de ICMS são o valor inicial para os cálculos automáticos.
- **VFIS0210 (NF-e de Entrada):** Utiliza o Token Focus NF-e para importar NF-e por chave de acesso de 44 dígitos. O regime tributário define as regras de creditamento (PIS/COFINS não-cumulativo para Lucro Real).
- **VFIS0220 (CT-e):** Utiliza as alíquotas padrão de ICMS para cálculo do ICMS sobre frete.
- **VFIS0340 (Apuração Simples Nacional):** Só é relevante se o regime for "Simples Nacional". A empresa configurada aqui é o sujeito passivo da apuração.
- **VNFS0100 (NFS-e):** Utiliza o CNPJ do emitente, endereço e código de município para emissão da NFS-e. O Token Focus pode ser usado para webservice municipal dependendo da integração.
- **VCLI0500 (Cadastro de Clientes):** O CNPJ do emitente é validado contra a base de clientes/fornecedores.
- **VEMP0100 (Cadastro Empresa):** Pré-requisito fundamental — o CNPJ e Razão Social devem existir no cadastro de empresas.

---

#### VFIS0110 — Tabelas Tributárias

**Objetivo:** Manter o repositório central de tabelas tributárias do sistema, organizado em três abas: NCM (com alíquotas de IPI, PIS, COFINS e CSTs), ICMS Interno (alíquotas por UF incluindo FCP) e ICMS Interestadual (pares origem-destino com alíquotas conforme regras do CONFAZ). Estas alíquotas são a base de cálculo para todas as telas de emissão fiscal.

**Pré-requisitos:**
- VFIS0100 (Configuração Fiscal): O regime tributário e as alíquotas padrão precisam estar configurados para que as tabelas tributárias possam ser utilizadas como referência.
- Conhecimento das tabelas oficiais da Receita Federal (NCM, CST) e das alíquotas estaduais de ICMS vigentes.

**Passo a passo:**

**Aba NCM (IPI/PIS/COFINS):**
1. Na aba **NCM (IPI/PIS/COFINS)**, preencha o código NCM de 8 dígitos no campo NCM. Este código é a chave primária da tabela — não pode ser duplicado.
2. Informe as alíquotas de IPI, PIS e COFINS em formato decimal (ex.: 0,05 = 5%). Os valores padrão sugeridos são 0,0165 para PIS e 0,076 para COFINS (regime cumulativo).
3. Preencha os CSTs (Códigos de Situação Tributária) para IPI, PIS e COFINS. Consulte a tabela oficial da Receita Federal para os códigos corretos (ex.: "50" para IPI, "01" para PIS/COFINS).
4. Opcionalmente, preencha o campo Descrição com um texto descritivo do NCM.
5. Clique em **Salvar NCM**. O sistema valida que o NCM não está vazio e persiste os dados.
6. Para desativar um NCM existente (removê-lo das listas de seleção nas telas de emissão), clique no botão **Desativar** na linha correspondente da tabela.
7. A tabela inferior exibe todos os NCMs cadastrados com suas alíquotas e CSTs.

**Aba ICMS Interno:**
1. Alterne para a aba **ICMS Interno**.
2. Informe a UF (2 caracteres, maiúsculas automáticas). Campo obrigatório — a UF é a chave única desta tabela.
3. Informe a alíquota de ICMS interna padrão para esta UF (ex.: 0,18 para SP = 18%).
4. Opcionalmente, informe a alíquota de FCP (Fundo de Combate à Pobreza), um adicional sobre o ICMS aplicável em alguns estados.
5. Clique em **Salvar UF**. Se a UF já existir, os dados são atualizados (upsert).
6. A tabela inferior exibe todas as UFs cadastradas com suas alíquotas de ICMS e FCP.

**Aba ICMS Interestadual:**
1. Alterne para a aba **ICMS Interestadual**.
2. Informe a UF de Origem (2 caracteres, maiúsculas automáticas).
3. Informe a UF de Destino (2 caracteres, maiúsculas automáticas).
4. Informe a alíquota interestadual aplicável. As alíquotas padrão conforme CONFAZ são:
   - 7% para operações originadas nas regiões Sul e Sudeste (exceto ES) com destino às regiões Norte, Nordeste, Centro-Oeste e ES.
   - 12% para operações entre estados das mesmas regiões ou entre regiões diferentes que não se enquadram na regra anterior.
   - 4% para operações interestaduais com produtos importados.
5. Clique em **Salvar**. A chave composta (UF Origem, UF Destino, Alíquota) é tratada como única.
6. A tabela inferior exibe todos os pares cadastrados.

**Campos (Aba NCM):**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| NCM | text (8 dígitos) | Sim | — | Código NCM de 8 dígitos. Chave primária — imutável após criação. |
| Alíq. IPI | number | Não | 0,0000 a 1,0000 | Alíquota de IPI para o NCM. |
| Alíq. PIS | number | Não | 0,0000 a 1,0000 | Alíquota de PIS para o NCM. Padrão sugerido: 0,0165 (1,65% - cumulativo). |
| Alíq. COFINS | number | Não | 0,0000 a 1,0000 | Alíquota de COFINS para o NCM. Padrão sugerido: 0,076 (7,6% - cumulativo). |
| CST IPI | text | Não | 00 a 99 | Código de Situação Tributária do IPI. |
| CST PIS | text | Não | 01 a 99 | Código de Situação Tributária do PIS. |
| CST COFINS | text | Não | 01 a 99 | Código de Situação Tributária da COFINS. |
| Descrição | text | Não | — | Descrição textual do NCM para referência. |
| Ativo | toggle | Não | — | Indica se o NCM está ativo para seleção nas telas de emissão. NCMs desativados não aparecem nos dropdowns. |

**Campos (Aba ICMS Interno):**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| UF | text (2 caracteres) | Sim | AC a TO | Unidade Federativa. Chave única da tabela de ICMS interno. |
| Alíq. ICMS | number | Sim | 0,0000 a 1,0000 | Alíquota de ICMS interna padrão para esta UF. |
| Alíq. FCP | number | Não | 0,0000 a 1,0000 | Fundo de Combate à Pobreza — adicional sobre o ICMS em alguns estados. |

**Campos (Aba ICMS Interestadual):**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| UF Origem | text (2 caracteres) | Sim | AC a TO | UF de origem da operação interestadual. |
| UF Destino | text (2 caracteres) | Sim | AC a TO | UF de destino da operação interestadual. |
| Alíq. ICMS | number | Sim | 0,0000 a 1,0000 | Alíquota interestadual aplicável (4%, 7% ou 12% conforme regras CONFAZ). |
| Ativo | toggle | Não | — | Indica se a alíquota está ativa para seleção. |

**Observações importantes:**
- O NCM é imutável após a criação. Se precisar alterar um código NCM, será necessário desativar o registro existente e criar um novo com o código correto.
- As alíquotas de ICMS Interno e Interestadual seguem as regras do CONFAZ e devem ser mantidas atualizadas conforme alterações na legislação estadual. A responsabilidade pela atualização é do usuário.
- Na hierarquia de busca de alíquotas do sistema, a VFIS0110 é o **fallback** (último nível). A VFIS0350 (Classificações Fiscais) tem precedência máxima, seguida pela VFIS0320 (Parâmetros ICMS/IPI). Se um item não possui classificação fiscal específica nem parâmetro por UF+NCM, o sistema recorre às alíquotas desta tela.
- Os CSTs seguem as tabelas oficiais da Receita Federal. Consulte a documentação da NF-e (Nota Técnica) para os códigos atualizados.
- O rodapé da tela exibe a contagem de NCMs, UFs internas e pares interestaduais cadastrados, permitindo verificar rapidamente a cobertura das tabelas.

**Telas relacionadas:**
- **VFIS0100 (Configuração Fiscal):** O regime tributário definido na VFIS0100 influencia quais CSTs e alíquotas são aplicáveis. As alíquotas padrão da VFIS0100 servem como último fallback.
- **VFIS0200 (NF-e de Saída):** As alíquotas de NCM (IPI/PIS/COFINS) são carregadas automaticamente ao adicionar um item com determinado NCM. A alíquota interestadual é consultada quando a UF de destino difere da UF do emitente.
- **VFIS0210 (NF-e de Entrada):** As alíquotas de NCM são utilizadas como referência para os valores de impostos dos itens de entrada. Os CSTs são sugeridos conforme o NCM.
- **VFIS0320 (Parâmetros ICMS/IPI):** As alíquotas desta tela são o fallback quando a VFIS0320 não possui um parâmetro específico para a combinação UF+NCM+Operação.
- **VFIS0350 (Classificações Fiscais):** A VFIS0350 complementa a VFIS0110 fornecendo dados adicionais do NCM como CEST, Ex Tarifário e modalidades de base de cálculo.
- **VFIS0330 (Redução/Substituição/Diferimento ICMS):** As regras tributárias da VFIS0330 podem modificar as alíquotas base definidas nesta tela.
- **VFIS0550 (Restituição ICMS ST):** As alíquotas de ICMS ST referenciam as alíquotas desta tabela.

---

#### VFIS0200 — NF-e de Saída

**Objetivo:** Realizar o ciclo completo de emissão de Nota Fiscal Eletrônica de saída: criação de rascunho, cálculo automático de ICMS/IPI/PIS/COFINS, autorização via API Focus/SEFAZ, cancelamento com justificativa e emissão de Carta de Correção Eletrônica (CC-e). É a tela operacional mais importante do módulo fiscal.

**Pré-requisitos:**
- VFIS0100 (Configuração Fiscal): Token Focus NF-e configurado, CNPJ do emitente, regime tributário e endereço completo.
- VFIS0110 (Tabelas Tributárias): NCMs com alíquotas de IPI/PIS/COFINS e pares interestaduais de ICMS.
- VFIS0300 (CFOPs): CFOPs de saída cadastrados (ex.: 5101, 5102, 6101, 6102).
- VFIS0350 (Classificações Fiscais): Classificações fiscais dos itens a serem faturados (opcional, mas recomendado).
- VCLI0500 (Cadastro de Clientes): Destinatários cadastrados com CNPJ/CPF, Razão Social, IE e endereço.

**Passo a passo:**

1. Acesse a tela VFIS0200 — NF-e de Saída. A visão padrão é a **Listagem**, exibindo todas as NF-es de saída emitidas com seus status (pills coloridos: verde = autorizada, vermelho = cancelada, âmbar = rejeitada, azul = processando, cinza = rascunho).

2. Clique em **+ Nova NF-e** para iniciar uma nova nota. O sistema abre o formulário de criação.

3. Na seção **Cabeçalho**, preencha:
   - **Número NF:** Número sequencial da nota. Obrigatório.
   - **Série:** Série da NF-e (ex.: "001"). Obrigatório.
   - **CFOP:** Código Fiscal de Operação (4 dígitos). Selecione da tabela VFIS0300. Obrigatório.
   - **Emissão:** Data de emissão da NF-e (padrão: data atual). Obrigatório.
   - **Saída:** Data de efetiva saída da mercadoria. Obrigatório.
   - **Pessoa:** Tipo de pessoa do destinatário — J (Jurídica) ou F (Física).
   - **CNPJ/CPF Destinatário:** CNPJ ou CPF do destinatário com validação de dígito verificador em tempo real. Indicador visual verde/vermelho.
   - **Razão Social Destinatário:** Nome do destinatário. Obrigatório.
   - **IE Destinatário:** Inscrição Estadual do destinatário. Campo opcional — para não-contribuintes, preencher com "ISENTO".
   - **UF Destino:** UF de destino da mercadoria. Obrigatório. Determina se a operação é interna ou interestadual e qual alíquota de ICMS se aplica.
   - **Natureza da Operação:** Descrição da natureza da operação (herdada do CFOP selecionado, mas editável).
   - **Frete, Seguro, Desconto:** Valores acessórios da nota (opcionais).

4. Na seção **Itens**, adicione os produtos da nota. Para cada item, a tabela inline permite preencher:
   - **Seq:** Sequencial do item (1, 2, 3...). Gerado automaticamente.
   - **Cód. Item:** Código do produto no cadastro de itens.
   - **NCM:** Código NCM de 8 dígitos. Obrigatório para cada item. O sistema busca automaticamente as alíquotas da VFIS0110 e VFIS0350 ao informar o NCM.
   - **CFOP:** CFOP do item (pode divergir do CFOP do cabeçalho).
   - **Origem:** Origem da mercadoria (0=Nacional a 8=Importação > 70%).
   - **Descrição:** Descrição do produto.
   - **Qtd:** Quantidade. Obrigatório (> 0).
   - **Unit.:** Valor unitário. Obrigatório (> 0).
   - **Total:** Calculado automaticamente (Qtd x Unit.).

5. Clique em **+ Adicionar item** para incluir mais produtos na nota. Use o botão **✕** para remover um item (pelo menos um item é obrigatório).

6. Clique em **Criar Rascunho**. O sistema:
   - Valida campos obrigatórios (número da NF, CNPJ/CPF do destinatário, UF destino, NCM e CFOP de cada item).
   - Calcula automaticamente ICMS, IPI, PIS e COFINS com base nas alíquotas das tabelas tributárias (VFIS0110), classificações fiscais (VFIS0350) e parâmetros (VFIS0320).
   - Exibe no feedback os valores calculados: ICMS, IPI, PIS, COFINS e Valor Total da nota.
   - Armazena a NF-e com status **Rascunho** (cinza), permitindo edições posteriores.

7. Na listagem, localize a NF-e em rascunho e clique em **Autorizar**. O sistema:
   - Monta o XML da NF-e conforme o leiaute oficial NFe 4.00.
   - Envia o XML à API Focus NF-e, que o encaminha à SEFAZ.
   - Altera o status para **Processando** (azul) durante a transmissão.
   - Ao receber o retorno: se autorizada, o status muda para **Autorizada** (verde) e o protocolo de autorização e a chave de acesso de 44 dígitos são armazenados. Se rejeitada, o status muda para **Rejeitada** (âmbar) e o motivo da SEFAZ é exibido para correção.

8. **Cancelamento:** Para uma NF-e autorizada, clique em **Cancelar**. O sistema solicita uma justificativa com no mínimo 15 caracteres. Após confirmação, envia o pedido de cancelamento à SEFAZ via API Focus. O status muda para **Cancelada** (vermelho).

9. **CC-e (Carta de Correção):** Para corrigir informações não-fiscais de uma NF-e autorizada (natureza da operação, descrições, dados do transportador), clique em **Nova CC-e**. Informe o texto da correção (mínimo 15 caracteres). A CC-e é emitida sem necessidade de cancelamento da nota original.

10. **Status:** Para consultar o status atual de qualquer NF-e na SEFAZ, clique em **Status**. O sistema consulta a API Focus e exibe o status retornado.

11. Utilize o botão **Exportar** para gerar relatórios nos formatos disponíveis.

**Campos (Cabeçalho):**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Número NF | number | Sim | — | Número sequencial da NF-e. |
| Série | text | Sim | — | Série da NF-e (ex.: "001", "1"). |
| CFOP | text (4 dígitos) | Sim | CFOPs da VFIS0300 | Código Fiscal de Operação. Define a natureza da operação fiscal. |
| Data de Emissão | date | Sim | — | Data de emissão da NF-e. |
| Data de Saída | date | Sim | — | Data de efetiva saída da mercadoria. |
| Tipo Pessoa | select | Sim | J (Jurídica) / F (Física) | Tipo de pessoa do destinatário. |
| CNPJ/CPF Destinatário | text | Sim | — | CNPJ ou CPF do destinatário. Validado em tempo real. |
| Razão Social Destinatário | text | Sim | — | Nome ou razão social do destinatário. |
| IE Destinatário | text | Não | ISENTO (para não-contribuintes) | Inscrição Estadual do destinatário. |
| UF Destino | text (2 caracteres) | Sim | UFs do VLOC0100 | UF de destino. Determina alíquota interestadual e DIFAL. |
| Natureza da Operação | text | Sim | — | Descrição da natureza da operação (herdada do CFOP, editável). |
| Frete | number | Não | >= 0 | Valor do frete. |
| Seguro | number | Não | >= 0 | Valor do seguro. |
| Desconto | number | Não | >= 0 | Valor de desconto sobre o total da nota. |

**Campos (Itens):**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Seq | number | Sim | — | Sequencial do item na nota (1, 2, 3...). Gerado automaticamente. |
| Cód. Item | number | Sim | — | Código do produto no cadastro de itens. |
| NCM | text (8 dígitos) | Sim | NCMs da VFIS0110 | Código NCM do item. Obrigatório — sem NCM a nota é rejeitada pela SEFAZ. |
| CFOP | text (4 dígitos) | Sim | CFOPs da VFIS0300 | CFOP específico do item. |
| Origem | text | Sim | 0 a 8 | Origem da mercadoria conforme tabela SEFAZ (0=Nacional, 1=Estrangeira importação direta, etc.). |
| Descrição | text | Sim | — | Descrição detalhada do produto. |
| Quantidade | number | Sim | > 0 | Quantidade do item. |
| Valor Unitário | number | Sim | > 0 | Preço unitário do item. |
| Valor Total | number (auto) | — | — | Calculado automaticamente: Quantidade x Valor Unitário. |
| Base ICMS | number (auto) | — | — | Base de cálculo do ICMS, calculada automaticamente pelo sistema. |
| Alíquota ICMS | number (auto) | — | — | Alíquota de ICMS aplicável, carregada das tabelas tributárias (VFIS0110/VFIS0320). |
| Valor ICMS | number (auto) | — | — | ICMS calculado automaticamente: Base ICMS x Alíquota ICMS. |
| Alíquota IPI | number | Não | 0,00 a 100,00 | Alíquota de IPI, carregada da VFIS0110 ou VFIS0350. |
| Valor IPI | number (auto) | — | — | IPI calculado automaticamente. |
| Alíquota PIS | number | Não | 0,00 a 100,00 | Alíquota de PIS. |
| Valor PIS | number (auto) | — | — | PIS calculado automaticamente. |
| Alíquota COFINS | number | Não | 0,00 a 100,00 | Alíquota de COFINS. |
| Valor COFINS | number (auto) | — | — | COFINS calculado automaticamente. |
| Status | badge | — | Rascunho / Autorizada / Cancelada / Rejeitada / Processando | Pill colorida na listagem: verde=autorizada, vermelho=cancelada, âmbar=rejeitada, azul=processando, cinza=rascunho. |

**Observações importantes:**
- O cálculo automático de impostos ocorre no momento em que a NF-e é salva como rascunho. O sistema consulta a seguinte hierarquia para cada alíquota: VFIS0350 (Classificações Fiscais — precedência máxima) → VFIS0320 (Parâmetros ICMS/IPI) → VFIS0330 (Regras de redução/diferimento) → VFIS0110 (Tabelas Tributárias — fallback).
- O CNPJ do destinatário é validado em tempo real (algoritmo módulo 11). Um indicador verde ou vermelho aparece abaixo do campo.
- A UF de Destino é crítica: se for igual à UF do emitente (VFIS0100), a operação é interna e utiliza a alíquota de ICMS interno. Se for diferente, é interestadual e utiliza a alíquota da tabela interestadual (VFIS0110) + DIFAL quando aplicável.
- O cancelamento de NF-e está sujeito ao prazo regulamentar (geralmente 24 horas a partir da autorização para a maioria dos CFOPs). O sistema não bloqueia o cancelamento por prazo, mas a SEFAZ pode rejeitá-lo.
- A CC-e (Carta de Correção) permite corrigir campos que não afetam o cálculo do imposto ou a identidade das partes. Não é permitido alterar CFOP, valores fiscais, CNPJ/CPF ou datas via CC-e — utilize cancelamento + nova NF-e para essas situações.
- O texto da CC-e e da justificativa de cancelamento têm requisito mínimo de 15 caracteres, conforme regra da SEFAZ.
- Os totais de Valor Produtos e Valor Total da nota são recalculados automaticamente a cada alteração nos itens, frete, seguro ou desconto.

**Telas relacionadas:**
- **VFIS0100 (Configuração Fiscal):** Token Focus NF-e (obrigatório para autorização e cancelamento), CNPJ e endereço do emitente (usados no XML da NF-e), regime tributário e alíquotas padrão.
- **VFIS0110 (Tabelas Tributárias):** Alíquotas de NCM (IPI/PIS/COFINS), ICMS interno (por UF) e ICMS interestadual (pares origem-destino) são a base dos cálculos automáticos.
- **VFIS0300 (CFOPs):** Seleção de CFOP no cabeçalho e nos itens. A natureza da operação é herdada do CFOP.
- **VFIS0350 (Classificações Fiscais):** Precedência máxima na hierarquia de busca de alíquotas. Se o item possui classificação fiscal, suas alíquotas são usadas prioritariamente.
- **VFIS0320 (Parâmetros ICMS/IPI):** Alíquotas específicas por UF+NCM/Item+Tipo Operação, consultadas na hierarquia.
- **VFIS0330 (Redução/Substituição/Diferimento ICMS):** Regras de redução, substituição e diferimento que modificam as alíquotas base.
- **VFIS0310 (Dispositivos Legais):** Fundamentação legal para alíquotas diferenciadas aplicadas nos itens.
- **VCLI0500 (Clientes):** Dados do destinatário (CNPJ/CPF, Razão Social, IE).

---

#### VFIS0210 — NF-e de Entrada

**Objetivo:** Registrar notas fiscais de entrada de mercadorias em três modos flexíveis: entrada manual (todos os campos preenchidos pelo usuário), importação por chave de acesso de 44 dígitos via API Focus (consulta automática à SEFAZ) e upload de arquivo XML (parsing local). Após aprovação, gera automaticamente contas a pagar no módulo financeiro (VFIN0200) e registra créditos tributários.

**Pré-requisitos:**
- VFIS0100 (Configuração Fiscal): Token Focus NF-e (para modo importação por chave), regime tributário (define regras de creditamento).
- VFIS0110 (Tabelas Tributárias): NCMs com alíquotas e CSTs de referência.
- VFIS0300 (CFOPs): CFOPs de entrada cadastrados (ex.: 1101, 1102, 2101, 2102).
- VFIS0360 (Tipos Operação Entrada): Tipos de operação de entrada configurados para validação de UF.
- VAVR0200 (Cadastro de Fornecedores): Fornecedores cadastrados para referência como emitentes.

**Passo a passo:**

1. Acesse a tela VFIS0210 — NF-e de Entrada. A visão padrão é a **Listagem**, exibindo todas as NF-es de entrada com status (aprovada = verde, pendente = âmbar, rascunho = cinza).

2. Escolha o modo de entrada:

   **Modo A — Lançamento Manual:**
   a. Clique em **+ Lançamento manual**. O sistema abre o formulário de criação.
   b. Na seção **Cabeçalho**, preencha o número da NF, série, modelo (padrão "55"), datas de emissão e entrada, CNPJ do emitente (com validação de dígito verificador), Razão Social, IE e UF do emitente.
   c. Informe os valores de frete, seguro e desconto. O total da nota é recalculado automaticamente.
   d. Na seção **Itens**, adicione os produtos. Para cada item, preencha: código do item, NCM, CFOP de entrada (ex.: 1101), quantidade, valor unitário e os valores de ICMS e IPI destacados na nota do fornecedor.
   e. Clique em **Lançar Entrada**. A NF-e é salva com status pendente e os totais são recalculados.

   **Modo B — Importar por Chave (44 dígitos):**
   a. Clique em **Importar por chave**. O sistema exibe o campo para a chave de acesso.
   b. Digite exatamente os 44 dígitos da chave de acesso da NF-e (apenas números — o campo remove automaticamente caracteres não numéricos).
   c. O sistema exibe um contador de dígitos em tempo real (X/44).
   d. Clique em **Importar NF-e**. O sistema:
      - Consulta a API Focus NF-e, que recupera o XML da NF-e na SEFAZ.
      - Extrai automaticamente todos os campos: número, série, modelo, datas, emitente, itens com NCM, CFOP, quantidades, valores e impostos destacados.
      - Popula o registro de entrada com os dados extraídos.
      - Salva a NF-e com status pendente.
   e. O feedback exibe o número da NF-e importada e confirma a movimentação de estoque.

   **Modo C — Upload de XML:**
   a. Clique em **Importar XML**. O sistema exibe uma área de texto.
   b. Cole o conteúdo completo do arquivo XML da NF-e (o elemento `<nfeProc>` completo recebido da SEFAZ).
   c. O contador de caracteres exibe o tamanho do XML colado.
   d. Clique em **Enviar XML**. O sistema faz o parsing local do XML, extrai todos os campos e popula o registro de entrada automaticamente.
   e. O feedback exibe o número da NF-e importada.

3. Na listagem, localize a NF-e com status **Pendente** e clique em **Aprovar**. O sistema:
   - Finaliza o registro da NF-e de entrada.
   - Gera automaticamente uma conta a pagar no VFIN0200 (Contas a Pagar) vinculada ao fornecedor emitente, com valor total da nota.
   - Registra os créditos tributários (ICMS, IPI, PIS, COFINS) conforme as flags de creditamento de cada item.
   - Altera o status para **Aprovada** (verde).

4. Utilize **Exportar** para gerar relatórios nos formatos disponíveis.

**Campos (Cabeçalho):**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Número NF | number | Sim | — | Número da NF-e de entrada. |
| Série | text | Sim | — | Série da nota. |
| Modelo | text | Sim | — | Modelo do documento fiscal (55 = NF-e, 65 = NFC-e). |
| Data de Emissão | date | Sim | — | Data de emissão da NF-e pelo fornecedor. |
| Data de Entrada | date | Sim | — | Data de efetiva entrada da mercadoria no estabelecimento. |
| Tipo Doc. | text | Sim | — | Tipo de documento (NF-e, CT-e, etc.). |
| CNPJ Emitente | text (14 dígitos) | Sim | — | CNPJ do fornecedor emitente com validação de dígito verificador. |
| Razão Social Emitente | text | Sim | — | Nome do fornecedor emitente. |
| IE Emitente | text | Não | — | Inscrição Estadual do emitente. |
| UF Emitente | text (2 caracteres) | Sim | UFs do VLOC0100 | UF do fornecedor emitente. |
| Frete | number | Não | >= 0 | Valor do frete. |
| Seguro | number | Não | >= 0 | Valor do seguro. |
| Desconto | number | Não | >= 0 | Valor de desconto sobre a nota. |
| Modo Entrada | — | — | Manual / Importar Chave / Upload XML | Modo de introdução da NF-e no sistema (automático, baseado na ação do usuário). |

**Campos (Itens):**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Seq | number | Sim | — | Sequencial do item (1, 2, 3...). |
| Cód. Item | number | Sim | — | Código do item no cadastro de produtos. |
| NCM | text (8 dígitos) | Sim | NCMs da VFIS0110 | Código NCM do item. |
| CFOP | text (4 dígitos) | Sim | CFOPs da VFIS0300 | CFOP de entrada do item. |
| Quantidade | number | Sim | > 0 | Quantidade recebida. |
| Valor Unitário | number | Sim | > 0 | Valor unitário do item. |
| Valor Total | number (auto) | — | — | Calculado automaticamente: Quantidade x Valor Unitário. |
| Valor ICMS | number | Não | >= 0 | Valor de ICMS destacado na nota do fornecedor. |
| Valor IPI | number | Não | >= 0 | Valor de IPI destacado na nota do fornecedor. |
| Base ICMS | number | Não | >= 0 | Base de cálculo do ICMS. |
| Alíquota ICMS | number | Não | 0,00 a 100,00 | Alíquota de ICMS do item. |
| Valor PIS | number | Não | >= 0 | Valor de PIS destacado. |
| Valor COFINS | number | Não | >= 0 | Valor de COFINS destacado. |
| Credita ICMS | toggle | Não | — | Se ativo, gera crédito de ICMS na apuração. |
| Credita IPI | toggle | Não | — | Se ativo, gera crédito de IPI. |
| Credita PIS | toggle | Não | — | Se ativo, gera crédito de PIS (regime não-cumulativo). |
| Credita COFINS | toggle | Não | — | Se ativo, gera crédito de COFINS (regime não-cumulativo). |
| CST ICMS | text | Não | 00 a 90 | Código de Situação Tributária do ICMS. |
| CST IPI | text | Não | 00 a 99 | CST do IPI. |
| CST PIS | text | Não | 01 a 99 | CST do PIS. |
| CST COFINS | text | Não | 01 a 99 | CST da COFINS. |
| Status | badge | — | Pendente / Aprovada | Pill colorida na listagem. |

**Observações importantes:**
- A importação por chave de acesso utiliza a API Focus NF-e — o Token Focus NF-e configurado na VFIS0100 deve estar válido e o ambiente (Homologação/Produção) deve corresponder à NF-e que se deseja importar.
- A chave de acesso de 44 dígitos é o identificador universal da NF-e e contém informações codificadas: UF, ano/mês, CNPJ, modelo, série, número e dígito verificador. O campo aceita apenas números — caracteres não numéricos são automaticamente removidos.
- O upload de XML aceita o conteúdo completo do arquivo XML (elemento `<nfeProc>`). O sistema faz o parsing localmente, portanto não depende de conexão com a API Focus.
- A ação **Aprovar** é irreversível — uma vez aprovada, a NF-e de entrada não pode ser editada. Certifique-se de revisar todos os campos, especialmente as flags de creditamento, antes de aprovar.
- As flags de creditamento (Credita ICMS/IPI/PIS/COFINS) são pré-selecionadas com base no CFOP e no regime tributário da VFIS0100, mas podem ser alteradas manualmente. Empresas do Lucro Real geralmente podem creditar PIS/COFINS (não-cumulativo); empresas do Simples Nacional e Lucro Presumido geralmente não.
- A conta a pagar gerada automaticamente no VFIN0200 é vinculada ao fornecedor emitente. Se o fornecedor não estiver cadastrado no VAVR0200, a geração da conta a pagar pode falhar.
- Os totais de impostos (ICMS, IPI, PIS, COFINS) e valor total da nota são recalculados automaticamente como somatório dos itens + frete + seguro - desconto.

**Telas relacionadas:**
- **VFIS0100 (Configuração Fiscal):** Token Focus NF-e para importação por chave. Regime tributário define regras de creditamento.
- **VFIS0110 (Tabelas Tributárias):** Alíquotas de NCM e CSTs sugeridos para os itens.
- **VFIS0300 (CFOPs):** CFOPs de entrada disponíveis para seleção.
- **VFIS0360 (Tipos Operação Entrada):** Validação de UF para a operação de entrada. A UF do emitente é validada contra o grupo de estados configurado.
- **VFIN0200 (Contas a Pagar):** Destino da geração automática de contas a pagar após aprovação da NF-e de entrada.
- **VFIS0220 (CT-e):** CT-es podem ser vinculados às NF-es de entrada para rateio de frete.
- **VAVR0200 (Fornecedores):** Cadastro de fornecedores referenciados como emitentes.

---

#### VFIS0220 — CT-e (Conhecimento de Transporte Eletrônico)

**Objetivo:** Registrar localmente Conhecimentos de Transporte Eletrônicos para controle de fretes e rateio de valores de transporte entre NF-es de entrada. Não possui integração com a SEFAZ — é um registro interno para fins de custeio e controle.

**Pré-requisitos:**
- VFIS0100 (Configuração Fiscal): Alíquotas padrão de ICMS para cálculo de ICMS sobre frete.
- VFIS0300 (CFOPs): CFOPs de transporte disponíveis (ex.: 1352, 2352).
- VFIS0210 (NF-e de Entrada): NF-es de entrada às quais o CT-e pode ser vinculado para rateio.

**Passo a passo:**

1. Acesse a tela VFIS0220 — CT-e. A visão padrão é a **Listagem**, exibindo todos os CT-es registrados.

2. Clique em **+ Novo CT-e**. O sistema abre o formulário de criação.

3. Na seção **Dados do CT-e**, preencha:
   - **Número CT-e:** Número do conhecimento de transporte. Obrigatório.
   - **Série:** Série do CT-e (padrão: "001").
   - **CFOP:** CFOP do CT-e. Selecione um CFOP de transporte (ex.: "1352").
   - **Emissão:** Data de emissão do CT-e.
   - **Entrada:** Data de entrada/prestação do serviço de transporte.
   - **CNPJ Emitente:** CNPJ da transportadora. Obrigatório.
   - **Razão Social (Transportadora):** Nome da transportadora.
   - **UF Emitente:** UF da transportadora (2 caracteres, maiúsculas automáticas). Obrigatório.
   - **Tipo Rateio:** Selecione o critério de rateio do frete entre as NF-es vinculadas:
     - **VALOR:** O frete é rateado proporcionalmente ao valor total de cada NF-e vinculada.
     - **PESO:** O frete é rateado proporcionalmente ao peso dos itens (somatório de quantidades).
   - **Frete, Seguro, Outros:** Valores de frete, seguro e outros custos de transporte.
   - **Base ICMS:** Base de cálculo do ICMS sobre o frete.
   - **Alíq. ICMS:** Alíquota de ICMS sobre transporte (padrão da UF da transportadora).
   - **Valor ICMS:** Valor do ICMS sobre o frete (calculado ou informado manualmente).
   - **CST ICMS:** Código de Situação Tributária do ICMS do frete.
   - **NF-e Entrada vinculada (ID):** ID da NF-e de entrada da VFIS0210 à qual este CT-e está vinculado. Opcional.

4. Clique em **Registrar CT-e**. O sistema:
   - Persiste o CT-e.
   - Se vinculado a uma NF-e de entrada, o valor do frete é rateado e incorporado ao custo de aquisição da nota vinculada.

5. O Valor Total é recalculado automaticamente como Frete + Seguro + Outros Custos.

**Campos:**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Número CT-e | number | Sim | — | Número sequencial do CT-e. |
| Série | text | Sim | — | Série do CT-e (ex.: "001"). |
| CFOP | text (4 dígitos) | Sim | CFOPs da VFIS0300 | CFOP do CT-e (ex.: 1352, 2352). |
| Data de Emissão | date | Sim | — | Data de emissão do CT-e. |
| Data de Entrada | date | Sim | — | Data de entrada/prestação do serviço. |
| CNPJ Emitente | text (14 dígitos) | Sim | — | CNPJ da transportadora. |
| Razão Social (Transportadora) | text | Sim | — | Razão social da transportadora. |
| UF Emitente | text (2 caracteres) | Sim | UFs do VLOC0100 | UF da transportadora. |
| Tipo Rateio | select | Sim | VALOR / PESO | Critério de rateio do frete entre NF-es vinculadas: proporcional ao valor ou ao peso. |
| Frete | number | Não | >= 0 | Valor total do frete contratado. |
| Seguro | number | Não | >= 0 | Valor do seguro da carga. |
| Outros | number | Não | >= 0 | Outros custos de transporte (taxas, pedágios, etc.). |
| Base ICMS | number | Não | >= 0 | Base de cálculo do ICMS sobre o frete. |
| Alíq. ICMS | number | Não | 0,00 a 100,00 | Alíquota de ICMS sobre transporte. |
| Valor ICMS | number | Não | >= 0 | Valor do ICMS sobre o frete. |
| CST ICMS | text | Não | 00 a 90 | CST do ICMS do frete. |
| NF-e Entrada vinculada (ID) | number | Não | — | ID da NF-e de entrada (VFIS0210) vinculada para rateio. |
| Valor Total | number (auto) | — | — | Calculado automaticamente: Frete + Seguro + Outros. |

**Observações importantes:**
- A VFIS0220 é um registro **local**, sem comunicação com a SEFAZ. Diferente das NF-es (VFIS0200 e VFIS0210), o CT-e aqui registrado não é transmitido para autorização — serve apenas para controle interno de custos de frete e rateio.
- O Tipo Rateio determina como o valor do frete é distribuído entre as NF-es vinculadas. No modo VALOR, o rateio é proporcional ao valor total de cada nota. No modo PESO, o rateio é proporcional à quantidade de itens.
- A vinculação do CT-e a uma NF-e de entrada (campo fiscal_entry_id) é opcional. Se não vinculado, o CT-e é um registro independente.
- O Valor Total é recalculado automaticamente sempre que Frete, Seguro ou Outros são alterados.
- O ICMS sobre frete pode gerar crédito tributário, dependendo da legislação estadual e do CFOP utilizado.

**Telas relacionadas:**
- **VFIS0100 (Configuração Fiscal):** Alíquotas padrão de ICMS.
- **VFIS0210 (NF-e de Entrada):** CT-es podem ser vinculados a NF-es de entrada para rateio dos custos de transporte no custo de aquisição.
- **VFIS0300 (CFOPs):** Seleção de CFOPs de transporte.


---

#### VFIS0300 — CFOPs / Naturezas de Operação

**Objetivo:** Manter a tabela mestra de Códigos Fiscais de Operação (CFOP) com suas naturezas de operação, classificações de utilização, indicadores de operação e flags de DIFAL e Doação. É a fonte de dados de CFOPs para todas as telas de emissão fiscal do sistema.

**Pré-requisitos:**
- Conhecimento da tabela oficial de CFOPs da SEFAZ/Receita Federal (códigos de 4 dígitos, naturezas e classificações).
- Nenhuma tela fiscal específica é pré-requisito para esta — a VFIS0300 é ela própria um cadastro base.

**Passo a passo:**

1. Acesse a tela VFIS0300 — CFOPs / Naturezas de Operação. A tela exibe a lista de CFOPs já cadastrados e o formulário de cadastro/edição.

2. Para criar um novo CFOP, clique em **+ Novo CFOP**. O formulário é limpo e o modo de edição é definido como "Novo".

3. Preencha os campos:
   - **Código:** Código CFOP de 4 dígitos (ex.: 5101, 6102, 1101, 2101). Obrigatório. **Atenção: o código é imutável após a criação** — revise cuidadosamente antes de salvar.
   - **Descrição:** Descrição completa do CFOP conforme tabela oficial (ex.: "Venda de produção do estabelecimento"). Obrigatório.
   - **Utilização:** Classificação de uso do CFOP:
     - `INDUSTRIALIZACAO_COMERCIO` — para operações de industrialização ou comércio.
     - `IMOBILIZADO` — para aquisição de bens do ativo imobilizado.
     - `USO_CONSUMO` — para aquisição de material de uso e consumo.
   - **Ind. Operação:** Indicador do tipo de operação:
     - `NORMAL` — operação padrão.
     - `ENERGIA_ELETRICA` — operações com energia elétrica (CFOPs 5.2XX/6.2XX).
     - `TELECOMUNICACAO` — operações com telecomunicações (CFOPs 5.3XX/6.3XX).
   - **Tipo Utilização:** Classificação de destinação para exportação:
     - `NORMAL` — operação normal, sem vínculo com exportação.
     - `VENDA_COMERCIAL_EXPORTADORA` — venda para empresa comercial exportadora.
     - `COMPRA_FIM_ESPECIFICO_EXPORTACAO` — compra com fim específico de exportação.
     - `EXPORTACAO` — operação de exportação direta.
   - **DIFAL:** Toggle (Sim/Não). Se ativo, habilita o cálculo de Diferencial de Alíquota nas operações interestaduais para consumidor final não-contribuinte.
   - **Doação:** Toggle (Sim/Não). Se ativo, indica que o CFOP é utilizado para operações de doação, com tratamento fiscal específico.

4. Clique em **Salvar** para cadastrar o novo CFOP.

5. Para editar um CFOP existente, localize-o na tabela e clique em **Editar**. O formulário é preenchido com os dados do CFOP selecionado e o campo Código fica desabilitado (imutável). Altere os campos permitidos e clique em **Atualizar**.

6. A tabela de listagem exibe o código, descrição, utilização e status do DIFAL (Sim = pill azul, Não = pill cinza) de cada CFOP.

7. Use **Exportar** para gerar relatórios.

**Campos:**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Código | number (4 dígitos) | Sim | — | Código CFOP de 4 dígitos. Chave primária — imutável após criação. |
| Descrição | text | Sim | — | Descrição completa do CFOP conforme tabela oficial. |
| Utilização | select | Sim | INDUSTRIALIZACAO_COMERCIO / IMOBILIZADO / USO_CONSUMO | Classificação de uso do CFOP para apuração e crédito tributário. |
| Ind. Operação | select | Sim | NORMAL / ENERGIA_ELETRICA / TELECOMUNICACAO | Indicador do tipo de operação para obrigações acessórias. |
| Tipo Utilização | select | Sim | NORMAL / VENDA_COMERCIAL_EXPORTADORA / COMPRA_FIM_ESPECIFICO_EXPORTACAO / EXPORTACAO | Classificação de destinação para fins de exportação. |
| DIFAL | toggle | Não | Sim / Não | Habilita cálculo de Diferencial de Alíquota para operações interestaduais com consumidor final. |
| Doação | toggle | Não | Sim / Não | Indica CFOP de doação com tratamento fiscal específico. |

**Observações importantes:**
- O código do CFOP é imutável após a criação. Esta restrição existe para preservar a integridade referencial — uma vez que um CFOP é referenciado por NF-es emitidas, alterar seu código invalidaria todo o histórico fiscal.
- Os campos de classificação (Utilização, Ind. Operação, Tipo Utilização) são utilizados em múltiplos contextos: (a) na apuração de ICMS (VFIS0530/VFIS0540) para classificar débitos e créditos; (b) no SPED Fiscal para preencher campos específicos dos registros C190/C195; (c) nos cálculos de DIFAL quando o toggle está ativo.
- O toggle DIFAL deve ser ativado para CFOPs de venda interestadual a consumidor final não-contribuinte (ex.: 6108, 6109). Nesses casos, o sistema calcula automaticamente o diferencial de alíquota (diferença entre alíquota interna e interestadual) devido à UF de destino.
- O toggle Doação altera o comportamento do cálculo de ICMS: em operações de doação, a base de cálculo do ICMS pode ser o valor de mercado ou o custo de aquisição, dependendo da legislação estadual — o sistema ajusta a base conforme o CFOP.
- A natureza da operação (campo herdado pelas telas de emissão) é o texto que aparece impresso no documento fiscal — certifique-se de que as descrições estejam corretas e em conformidade com a tabela oficial.

**Telas relacionadas:**
- **VFIS0200 (NF-e de Saída):** Seleção de CFOP no cabeçalho e nos itens. A natureza da operação é herdada do CFOP.
- **VFIS0210 (NF-e de Entrada):** Seleção de CFOP nos itens de entrada.
- **VFIS0220 (CT-e):** Seleção de CFOP do CT-e.
- **VFIS0540 (Lançamentos Resumo ICMS):** Agrupamento de lançamentos por CFOP. O sistema utiliza a classificação do CFOP (Utilização, Ind. Operação) para totalizar débitos e créditos corretamente.
- **VFIS0560 (Notas Especiais Ajuste):** CFOP de notas de ajuste.

---

#### VFIS0310 — Dispositivos Legais

**Objetivo:** Cadastrar os embasamentos legais (artigos de lei, decretos, convênios, laudos) que fundamentam alíquotas diferenciadas, reduções de base de cálculo, isenções, diferimentos e substituições tributárias aplicadas nas regras fiscais e nas NF-es emitidas.

**Pré-requisitos:**
- Conhecimento da legislação tributária aplicável (RICMS, Convênios CONFAZ, Leis Complementares, etc.).
- Nenhuma tela fiscal é pré-requisito — a VFIS0310 é um cadastro de apoio.

**Passo a passo:**

1. Acesse a tela VFIS0310 — Dispositivos Legais. A tela exibe a lista de dispositivos cadastrados e o formulário de cadastro/edição.

2. Para criar um novo dispositivo, clique em **+ Novo Dispositivo**. O formulário é limpo.

3. Preencha os campos:
   - **Tipo:** Selecione o tipo de dispositivo legal:
     - `ICMS` — Dispositivo relacionado ao ICMS (ex.: Convênio CONFAZ, artigo do RICMS).
     - `IPI` — Dispositivo relacionado ao IPI (ex.: TIPI, Decreto Federal).
     - `LAUDO` — Laudo técnico (ex.: laudo de classificação fiscal de NCM).
     - `PIS` — Dispositivo relacionado ao PIS.
     - `COFINS` — Dispositivo relacionado à COFINS.
   - **Descrição:** Texto do dispositivo legal. Deve conter a referência completa: norma, artigo, parágrafo e um breve resumo do efeito tributário. Exemplo: "Art. 32, Anexo IX do RICMS/SP — Redução de base de cálculo do ICMS em 41,67% nas saídas internas de máquinas e equipamentos industriais."

4. Clique em **Salvar**. O sistema gera um código numérico automático para o dispositivo.

5. Para editar um dispositivo existente, localize-o na tabela e clique em **Editar**. Altere os campos e clique em **Atualizar**.

6. A coluna **Ativo** na tabela indica se o dispositivo está vigente (Sim = pill verde) ou foi desativado (Não = pill vermelho). Dispositivos inativos não aparecem nas listas de seleção das telas de emissão, mas permanecem no histórico.

**Campos:**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Tipo | select | Sim | ICMS / IPI / LAUDO / PIS / COFINS | Classifica o dispositivo por tipo de tributo ou natureza. |
| Descrição | text | Sim | — | Texto completo do dispositivo legal com referência normativa e resumo do efeito tributário. |
| Ativo | toggle | — | Sim / Não | Indica se o dispositivo está em vigor. Controlado pelo backend — ao desativar, o registro fica indisponível para novas seleções. |

**Observações importantes:**
- Os dispositivos legais são referenciados nos registros fiscais (VFIS0200, VFIS0210) para justificar alíquotas diferenciadas, reduções de base de cálculo, isenções e diferimentos. No XML da NF-e, cada item pode ter um dispositivo legal associado no campo `infAdProd`.
- Dispositivos do tipo `LAUDO` são utilizados para fundamentar classificações fiscais específicas de produtos (ex.: laudo de classificação de NCM emitido por perito credenciado).
- O toggle Ativo permite "aposentar" dispositivos revogados sem excluí-los do banco de dados, preservando o histórico — notas fiscais já emitidas continuam referenciando o dispositivo, mas ele não aparece como opção em novas emissões.
- A descrição do dispositivo deve ser precisa e completa, incluindo o número da norma, artigo e parágrafo. Isso é fundamental para auditoria fiscal e para a correta escrituração no SPED.
- Os dispositivos são consumidos principalmente pela VFIS0330 (motor de regras), onde cada regra pode ser vinculada a um dispositivo que a fundamenta legalmente.

**Telas relacionadas:**
- **VFIS0200 (NF-e de Saída) e VFIS0210 (NF-e de Entrada):** Dispositivos legais podem ser referenciados por item nas notas fiscais para justificar tratamentos tributários diferenciados.
- **VFIS0330 (Redução/Substituição/Diferimento ICMS):** Cada regra do motor tributário pode ser vinculada a um dispositivo legal que a fundamenta. Esta é a principal tela consumidora da VFIS0310.

---

#### VFIS0320 — Parâmetros ICMS/IPI

**Objetivo:** Definir parâmetros específicos de alíquotas de ICMS e IPI por combinações de UF, classificação fiscal (NCM ou Item) e tipo de operação, com distinção entre contribuintes e não-contribuintes do ICMS. Esta tela oferece granularidade intermediária na hierarquia de busca de alíquotas do sistema.

**Pré-requisitos:**
- VFIS0110 (Tabelas Tributárias): NCMs e alíquotas base já cadastrados, pois os parâmetros desta tela refinam as alíquotas genéricas.
- VLOC0100 (Localização Países/UFs): UFs para o campo UF.

**Passo a passo:**

1. Acesse a tela VFIS0320 — Parâmetros ICMS/IPI. A tela exibe a lista de parâmetros cadastrados e o formulário.

2. Para criar um novo parâmetro, clique em **+ Novo Parâmetro**.

3. Preencha os campos de identificação:
   - **UF:** Unidade Federativa de aplicação do parâmetro. Obrigatório (2 caracteres, maiúsculas automáticas).
   - **NCM:** Código NCM de 8 dígitos para um parâmetro específico por classificação fiscal. **Mutuamente exclusivo com o campo Item** — preencha um OU outro, nunca ambos.
   - **Código Item:** Código do item no cadastro de produtos para um parâmetro específico por produto. Mutuamente exclusivo com NCM.
   - **Tipo Operação:** Sentido da operação fiscal:
     - `AMBAS` — Aplica-se tanto a entradas quanto a saídas.
     - `ENTRADA` — Aplica-se apenas a operações de entrada (compras).
     - `SAIDA` — Aplica-se apenas a operações de saída (vendas).
     - `CUSTOS` — Aplica-se a operações de custos (transferências internas, etc.).

4. Preencha os campos de alíquotas e CSTs:
   - **% ICMS Contrib.:** Alíquota de ICMS para contribuintes do imposto (ex.: 18%).
   - **% ICMS Não-Contrib.:** Alíquota de ICMS para não-contribuintes (consumidor final). Pode ser diferente — ex.: 12% para alguns produtos em operações interestaduais.
   - **CST Contrib.:** Código de Situação Tributária para contribuintes (ex.: "00" = tributação normal).
   - **CST Não-Contrib.:** CST para não-contribuintes.

5. Clique em **Salvar**. O sistema valida:
   - UF é obrigatória.
   - NCM e Item são mutuamente exclusivos: se ambos estiverem preenchidos ou ambos vazios, o sistema exibe erro "Forneça NCM OU código de item (nunca ambos)".
   - A combinação (UF, NCM/Item, Tipo Operação) deve ser única — o backend rejeita duplicatas.

6. Para editar um parâmetro existente, clique em **Editar** na linha correspondente. Altere os campos e clique em **Atualizar**.

**Campos:**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| UF | text (2 caracteres) | Sim | UFs do VLOC0100 | UF de aplicação do parâmetro. |
| NCM | text (8 dígitos) | Não | NCMs da VFIS0110 | NCM para parâmetro por classificação fiscal. Mutuamente exclusivo com Código Item. |
| Código Item | number | Não | — | Código do item para parâmetro por produto. Mutuamente exclusivo com NCM. |
| Tipo Operação | select | Sim | AMBAS / ENTRADA / SAIDA / CUSTOS | Sentido da operação à qual o parâmetro se aplica. |
| % ICMS Contrib. | number | Não | 0,00 a 100,00 | Alíquota de ICMS para contribuintes. |
| % ICMS Não-Contrib. | number | Não | 0,00 a 100,00 | Alíquota de ICMS para não-contribuintes. |
| CST Contrib. | text | Não | 00 a 90 | CST de ICMS para contribuintes. |
| CST Não-Contrib. | text | Não | 00 a 90 | CST de ICMS para não-contribuintes. |

**Observações importantes:**
- NCM e Item ID são **mutuamente exclusivos**: o parâmetro deve ser vinculado ou a um NCM (aplica-se a todos os itens com aquele NCM) ou a um Item específico (aplica-se apenas àquele produto). Se ambos forem preenchidos, o Item ID tem precedência.
- O Tipo Operação (`AMBAS`, `ENTRADA`, `SAIDA`, `CUSTOS`) filtra o contexto de aplicação. Um parâmetro com Tipo Operação `ENTRADA` só é considerado nas NF-es de entrada (VFIS0210); com `SAIDA`, apenas nas NF-es de saída (VFIS0200).
- Na hierarquia de busca de alíquotas do sistema, a VFIS0320 é consultada **após** a VFIS0350 (Classificações Fiscais, que tem precedência máxima) e **antes** da VFIS0110 (tabelas padrão, que é o fallback). O motor de regras da VFIS0330 pode sobrescrever os valores encontrados aqui.
- As alíquotas para contribuintes e não-contribuintes podem ser diferentes. Isso é particularmente relevante para operações interestaduais destinadas a consumidor final, onde a alíquota interestadual se aplica ao contribuinte e a alíquota interna (com DIFAL) ao não-contribuinte.

**Telas relacionadas:**
- **VFIS0110 (Tabelas Tributárias):** Alíquotas padrão usadas como fallback quando não há parâmetro específico nesta tela.
- **VFIS0200 (NF-e de Saída) e VFIS0210 (NF-e de Entrada):** As alíquotas parametrizadas são consultadas durante o cálculo automático de impostos dos itens.
- **VFIS0350 (Classificações Fiscais):** Nível superior na hierarquia de busca — se o item possui classificação fiscal, suas alíquotas têm precedência sobre os parâmetros da VFIS0320.
- **VFIS0330 (Redução/Substituição/Diferimento ICMS):** As regras tributárias podem modificar as alíquotas definidas nesta tela.

---

#### VFIS0330 — Redução / Substituição / Diferimento de ICMS

**Objetivo:** Implementar o motor hierárquico de regras tributárias para redução de base de cálculo, substituição tributária (ICMS ST) e diferimento de ICMS. Permite definir regras com múltiplos escopos (UF, NCM, Item, Cliente, Fornecedor, Estabelecimento, Segmento de Mercado) e inclui um simulador de busca prioritária por cenário.

**Pré-requisitos:**
- VFIS0110 (Tabelas Tributárias): Alíquotas base de ICMS que as regras podem modificar.
- VFIS0310 (Dispositivos Legais): Dispositivos legais para fundamentar as regras (opcional, mas recomendado).
- VFIS0320 (Parâmetros ICMS/IPI): Parâmetros específicos que podem ser sobrescritos por regras desta tela.

**Passo a passo:**

1. Acesse a tela VFIS0330 — Redução / Substituição / Diferimento de ICMS. A tela exibe três seções: Identificação (cadastro da regra), Alíquotas & CST (efeitos tributários) e Busca da regra prioritária (simulador).

2. Para criar uma nova regra, clique em **+ Nova Regra**.

3. Na seção **Identificação**, preencha o escopo da regra (quanto mais campos preenchidos, mais específica a regra):
   - **UF:** Unidade Federativa. Obrigatório (2 caracteres).
   - **Tipo Operação:** `AMBAS`, `ENTRADA`, `SAIDA` ou `CUSTOS`.
   - **NCM:** Código NCM ao qual a regra se aplica. Opcional — se omitido, aplica-se a todos os NCMs da UF.
   - **Item (ID):** Código do item específico. Opcional.
   - **Preferencial:** Toggle (Sim/Não). Se ativo, esta regra tem prioridade máxima sobre todas as outras na busca hierárquica, independentemente da especificidade.
   - **Cliente (ID), Fornecedor (ID), Estabelecimento (ID), Seg. Mercado (ID):** Escopos adicionais opcionais para refinar a aplicação da regra.

4. Na seção **Alíquotas & CST**, configure os efeitos tributários:
   - **% ICMS Contrib. e % ICMS Não-Contrib.:** Alíquotas de ICMS resultantes para contribuintes e não-contribuintes.
   - **CST Contrib. e CST Não-Contrib.:** CSTs aplicáveis.
   - **% Redução Contrib.:** Percentual de redução a ser aplicado.
   - **Alvo Redução:** Se a redução for informada, escolha:
     - `BASE` — A redução incide sobre a base de cálculo do ICMS (ex.: reduz BC em 41,67%).
     - `PERCENTUAL` — A redução incide diretamente sobre a alíquota do ICMS (ex.: reduz alíquota de 18% para 7%).
   - **% Diferimento:** Percentual do ICMS diferido (postergado para a etapa seguinte da cadeia). Ex.: 100% de diferimento significa que nenhum ICMS é recolhido nesta operação.
   - **% Substituição:** Percentual de MVA (Margem de Valor Agregado) para ICMS ST, ou alíquota direta de substituição tributária.

5. Clique em **Salvar**. O sistema valida que a UF é obrigatória.

6. **Busca da regra prioritária (simulador):** Esta ferramenta permite testar as regras antes da emissão:
   a. Na seção **Busca da regra prioritária**, preencha o cenário: UF (obrigatório), Item (ID), Cliente (ID) e Tipo Operação.
   b. Clique em **Buscar**. O sistema percorre todas as regras cadastradas e retorna a de maior prioridade para o cenário informado.
   c. A regra encontrada é exibida em uma tabela com seus detalhes: ID, UF, Operação, Escopo (com indicador PREF se preferencial), % Contrib. e CSTs.
   d. Se nenhuma regra casar, o sistema exibe "Nenhuma regra casa com o cenário informado."

7. Para filtrar a lista de regras por UF, preencha o campo de filtro na barra de ações e clique em **Filtrar**.

**Campos (Identificação):**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| UF | text (2 caracteres) | Sim | UFs do VLOC0100 | UF onde a regra se aplica. |
| Tipo Operação | select | Sim | AMBAS / ENTRADA / SAIDA / CUSTOS | Direção da operação fiscal. |
| NCM | text (8 dígitos) | Não | — | NCM ao qual a regra se aplica. Opcional — se omitido, aplica-se a todos. |
| Item (ID) | number | Não | — | Item específico. Opcional. |
| Preferencial | toggle | Não | Sim / Não | Se ativo, a regra tem prioridade máxima na busca hierárquica. |
| Cliente (ID) | number | Não | — | Cliente específico. Opcional. |
| Fornecedor (ID) | number | Não | — | Fornecedor específico. Opcional. |
| Estabelecimento (ID) | number | Não | — | Estabelecimento/filial específico. Opcional. |
| Seg. Mercado (ID) | number | Não | — | Segmento de mercado. Opcional. |

**Campos (Alíquotas & CST):**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| % ICMS Contrib. | number | Não | 0,00 a 100,00 | Alíquota para contribuintes. |
| % ICMS Não-Contrib. | number | Não | 0,00 a 100,00 | Alíquota para não-contribuintes. |
| CST Contrib. | text | Não | 00 a 90 | CST para contribuintes. |
| CST Não-Contrib. | text | Não | 00 a 90 | CST para não-contribuintes. |
| % Redução Contrib. | number | Não | 0,00 a 100,00 | Percentual de redução a aplicar. |
| Alvo Redução | select | Não | BASE / PERCENTUAL | Define se a redução incide sobre a base de cálculo ou sobre a alíquota (percentual). |
| % Diferimento | number | Não | 0,00 a 100,00 | Percentual do ICMS diferido (postergado). |
| % Substituição | number | Não | 0,00 a 100,00 | Percentual de MVA para ICMS ST ou alíquota direta de ST. |

**Observações importantes:**
- A hierarquia de prioridade na busca de regras segue esta ordem: (1) Regras com toggle Preferencial ativo sempre vencem; (2) Regras com Item específico têm precedência sobre regras com NCM; (3) Regras com Cliente/Fornecedor específico vencem sobre regras genéricas; (4) Regras com maior número de condições preenchidas têm precedência; (5) Em caso de empate, o ID mais recente (maior) vence.
- Os efeitos da regra são aplicados cumulativamente: uma mesma operação pode ter redução de base E substituição tributária aplicadas simultaneamente.
- O % Redução com Alvo BASE reduz a base de cálculo do ICMS antes de aplicar a alíquota. Exemplo: BC = R$ 1.000, Redução = 41,67% → BC reduzida = R$ 583,30 → ICMS = R$ 583,30 x alíquota.
- O % Redução com Alvo PERCENTUAL reduz a própria alíquota. Exemplo: alíquota original = 18%, Redução = 60% → alíquota efetiva = 7,2%.
- O % Diferimento indica quanto do ICMS é postergado (não recolhido nesta etapa). Exemplo: Diferimento 100% em BC de R$ 1.000 com alíquota 18% → ICMS total = R$ 180, ICMS diferido = R$ 180, ICMS a recolher = R$ 0.
- O % Substituição configura o ICMS ST: a MVA é aplicada sobre o valor total para compor a BC do ICMS ST, e o ICMS próprio é deduzido do ICMS ST total.
- Use o simulador (Busca da regra prioritária) sempre que houver dúvida sobre qual regra se aplica a um cenário específico. Isso evita erros de configuração que podem resultar em cálculos incorretos de ICMS nas NF-es.

**Telas relacionadas:**
- **VFIS0110 (Tabelas Tributárias):** NCM e alíquotas base que as regras modificam.
- **VFIS0310 (Dispositivos Legais):** Fundamentação legal das regras (cada regra pode ser vinculada a um dispositivo).
- **VFIS0320 (Parâmetros ICMS/IPI):** Parâmetros específicos que as regras podem sobrescrever.
- **VFIS0200 (NF-e de Saída) e VFIS0210 (NF-e de Entrada):** As regras são aplicadas automaticamente durante o cálculo dos impostos.

---

#### VFIS0340 — Apuração do Simples Nacional

**Objetivo:** Registrar a apuração mensal do Simples Nacional com base nos parâmetros de receita bruta (interna, externa e acumulada 12 meses) e folha de pagamento, utilizando as tabelas progressivas oficiais dos anexos I a VI para calcular a alíquota nominal, alíquota efetiva, alíquota efetiva de ICMS e o valor a recolher (DAS).

**Pré-requisitos:**
- VFIS0100 (Configuração Fiscal): O regime tributário da empresa deve ser "1 — Simples Nacional". Esta tela não se aplica aos regimes de Lucro Presumido ou Lucro Real.
- Dados contábeis do período: Receita Bruta do período (interna e externa), Receita Bruta acumulada dos últimos 12 meses (RBT12) e Folha de Pagamento (para anexos III e V).

**Passo a passo:**

1. Acesse a tela VFIS0340 — Apuração do Simples Nacional. A tela exibe a lista de apurações já realizadas.

2. Clique em **+ Nova Apuração**. O período é preenchido automaticamente com o mês/ano atual (YYYY-MM). O anexo padrão é "I".

3. Preencha os campos da apuração:
   - **Período:** Formato YYYY-MM (ex.: "2026-06"). Obrigatório. Após a criação, o período e o anexo tornam-se imutáveis — a chave (período, anexo) é única.
   - **Anexo:** Selecione o anexo do Simples Nacional conforme a atividade da empresa:
     - I — Comércio
     - II — Indústria
     - III — Serviços (locação de bens móveis, manutenção, etc.)
     - IV — Serviços (construção, limpeza, vigilância, etc.)
     - V — Serviços (auditoria, publicidade, engenharia, etc.)
     - VI — Serviços (medicina, odontologia, advocacia, etc.)
   - **Receita Interna:** Receita bruta do período proveniente do mercado interno. Obrigatório.
   - **Receita Externa:** Receita bruta de exportação no período (imune a PIS/COFINS).
   - **Folha de Pagamento:** Total da folha de pagamento do período. Relevante para os Anexos III e V, onde o fator "r" (folha / receita bruta) determina a faixa de tributação.
   - **Receita Bruta 12m:** Receita bruta acumulada dos últimos 12 meses (RBT12). Este é o valor chave para determinar a faixa de enquadramento e a alíquota aplicável.
   - **Simples Recolhido:** Valor do DAS a recolher no período.
   - **Alíq. Nominal (%):** Alíquota nominal da faixa de enquadramento (conforme tabela oficial).
   - **Alíq. Efetiva (%):** Alíquota efetiva calculada: `(RBT12 x Alíquota Nominal - Parcela a Deduzir) / RBT12`.
   - **Alíq. Efetiva ICMS (%):** Percentual da alíquota efetiva correspondente ao ICMS, conforme tabela de partilha do anexo.
   - **Parcela a Deduzir:** Valor a deduzir conforme a faixa da tabela do Simples Nacional.
   - **Observação:** Campo livre para notas e observações sobre a apuração.

4. Clique em **Salvar**. O sistema valida o formato do período e persiste os dados.

5. Para editar uma apuração existente, clique em **Editar**. Apenas os campos calculados e de receita podem ser alterados — o período e o anexo ficam desabilitados.

6. Use **Exportar** para gerar relatórios.

**Campos:**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Período | text (YYYY-MM) | Sim | — | Mês/ano de apuração. Imutável após criação. |
| Anexo | select | Sim | I / II / III / IV / V / VI | Anexo do Simples Nacional conforme atividade. Imutável após criação. |
| Receita Interna | number | Sim | >= 0 | Receita bruta do mercado interno no período. |
| Receita Externa | number | Não | >= 0 | Receita bruta de exportação no período. |
| Folha de Pagamento | number | Não | >= 0 | Total da folha de pagamento do período (relevante para Anexos III e V). |
| Receita Bruta 12m | number | Sim | >= 0 | Receita bruta acumulada dos últimos 12 meses (RBT12). |
| Simples Recolhido | number | Não | >= 0 | Valor do DAS a recolher no período. |
| Alíq. Nominal (%) | number | Não | 0,00 a 100,00 | Alíquota nominal da faixa de enquadramento. |
| Alíq. Efetiva (%) | number | Não | 0,00 a 100,00 | Alíquota efetiva calculada conforme fórmula oficial. |
| Alíq. Efetiva ICMS (%) | number | Não | 0,00 a 100,00 | Percentual da alíquota efetiva correspondente ao ICMS. |
| Parcela a Deduzir | number | Não | >= 0 | Valor a deduzir conforme faixa da tabela do Simples. |
| Observação | text | Não | — | Observações sobre a apuração. |

**Observações importantes:**
- A chave (Período, Anexo) é única e imutável após a criação. Isso garante que uma vez apurado um período com determinado anexo, os parâmetros não possam ser alterados acidentalmente.
- O cálculo das alíquotas segue a metodologia oficial da Receita Federal: a partir da RBT12, o sistema determina a faixa de enquadramento e obtém a Alíquota Nominal e a Parcela a Deduzir das tabelas oficiais (anexos I a VI da LC 123/2006). A Alíquota Efetiva = `(RBT12 x Alíquota Nominal - Parcela a Deduzir) / RBT12`. O Simples Recolhido = Receita do Período x Alíquota Efetiva.
- A Receita Externa (exportação) é imune a PIS/COFINS, portanto não compõe a base de cálculo desses tributos dentro da alíquota do Simples.
- A Folha de Pagamento é relevante para os Anexos III e V, onde o "fator r" (relação entre folha de pagamento e receita bruta dos últimos 12 meses) determina se a empresa tributa na faixa com alíquotas menores (Anexo III) ou maiores (Anexo V).
- Esta tela se aplica apenas a empresas do Simples Nacional. Empresas do Lucro Presumido ou Lucro Real devem utilizar as telas de apuração detalhada (VFIS0530 + VFIS0540).
- Os valores apurados aqui podem ser integrados ao módulo financeiro (VFIN0200) para geração automática do DAS a pagar.

**Telas relacionadas:**
- **VFIS0100 (Configuração Fiscal):** A VFIS0340 só é relevante se o Regime Tributário for "1 — Simples Nacional". O CNPJ da empresa é o sujeito passivo da apuração.
- **VFIN0200 (Contas a Pagar):** O valor apurado (Simples Recolhido) pode gerar automaticamente um DAS (Documento de Arrecadação do Simples Nacional) a pagar no módulo financeiro.

---

#### VFIS0350 — Classificações Fiscais

**Objetivo:** Manter a tabela detalhada de classificações fiscais por item/produto, incluindo NCM, CEST, Exceção Tarifária, alíquotas de IPI/PIS/COFINS, modalidades de base de cálculo de ICMS e ICMS ST, e códigos de classificação tributária (CBS/IBS). Inclui sub-entidades para traduções (idiomas para exportação) e atributos de exportação (Drawback, Reintegra) com controle de vigência. É o nível máximo de especificidade na hierarquia de busca de alíquotas.

**Pré-requisitos:**
- VFIS0110 (Tabelas Tributárias): NCMs base já cadastrados. A VFIS0350 complementa a VFIS0110 com dados adicionais.
- Cadastro de Itens (Produtos): Os itens aos quais as classificações fiscais serão vinculadas.

**Passo a passo:**

1. Acesse a tela VFIS0350 — Classificações Fiscais. A tela exibe a lista de classificações cadastradas.

2. Para criar uma nova classificação, clique em **+ Nova Classificação**.

3. Na seção **Identificação**, preencha:
   - **Descrição:** Nome descritivo da classificação fiscal (ex.: "Máquinas industriais — NCM 8471.49.00"). Obrigatório.
   - **NCM:** Código NCM de 8 dígitos.
   - **CEST:** Código Especificador da Substituição Tributária (7 dígitos), quando aplicável.
   - **Ex Tarifário:** Código de Exceção Tarifária, quando aplicável.

4. Na seção **Tributos**, preencha:
   - **Alíq. IPI:** Alíquota de IPI (percentual).
   - **Indicador IPI:** `PERCENTUAL` (calculado sobre o valor) ou `VALOR` (valor fixo por unidade).
   - **Alíq. PIS:** Alíquota de PIS (ex.: 0,0165 para cumulativo).
   - **Alíq. COFINS:** Alíquota de COFINS (ex.: 0,076 para cumulativo).
   - **Mod. BC ICMS:** Modalidade de determinação da base de cálculo do ICMS (0 = Preço Tabelado, 1 = Pauta, 2 = Preço Sugerido, 3 = Valor da Operação).
   - **Mod. BC ICMS ST:** Modalidade da base de cálculo do ICMS ST (0 = Preço Tabelado, 1 = Lista Negativa, 2 = Lista Positiva, 3 = Lista Neutra, 4 = MVA).
   - **Cód. Clas. Trib (CBS/IBS):** Código de classificação tributária para CBS e IBS — preparado para a reforma tributária.
   - **Obs. Fiscal (infAdFisco):** Campo livre para informações fiscais adicionais que serão incluídas no campo `infAdFisco` do XML da NF-e.

5. Clique em **Salvar**. O sistema gera um código automático para a classificação.

6. **Sub-entidade: Idiomas (para exportação):**
   a. Na listagem, localize a classificação desejada e clique em **Idiomas/Atrib.**.
   b. Na seção **Idiomas**, preencha o código do idioma (ex.: "en" para inglês, "es" para espanhol) e a descrição traduzida da classificação fiscal naquele idioma.
   c. Clique em **+ Idioma**. A descrição traduzida é utilizada nos documentos fiscais de exportação.

7. **Sub-entidade: Atributos de Exportação:**
   a. Na seção **Atributos de Exportação**, preencha:
      - **Código:** Código do atributo de exportação.
      - **NCM:** NCM associado ao atributo.
      - **Descrição:** Descrição do atributo.
      - **Domínio:** Regime aduaneiro especial (ex.: "Drawback", "Reintegra").
      - **Vigência início e Vigência fim:** Datas de validade do atributo (opcional — se não preenchidas, vigência indeterminada).
   b. Clique em **+ Atributo**.

**Campos (Principal):**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Descrição | text | Sim | — | Nome descritivo da classificação fiscal. |
| NCM | text (8 dígitos) | Não | — | Código NCM. |
| CEST | text (7 dígitos) | Não | — | Código Especificador da Substituição Tributária. |
| Ex Tarifário | text | Não | — | Código de Exceção Tarifária. |
| Alíq. IPI | number | Não | 0,00 a 100,00 | Alíquota de IPI (percentual). |
| Indicador IPI | select | Não | PERCENTUAL / VALOR | Define se o IPI é calculado como percentual ou valor fixo por unidade. |
| Alíq. PIS | number | Não | 0,0000 a 1,0000 | Alíquota de PIS. |
| Alíq. COFINS | number | Não | 0,0000 a 1,0000 | Alíquota de COFINS. |
| Mod. BC ICMS | text | Não | 0 a 3 | Modalidade de determinação da base de cálculo do ICMS. |
| Mod. BC ICMS ST | text | Não | 0 a 4 | Modalidade da base de cálculo do ICMS ST. |
| Cód. Clas. Trib (CBS/IBS) | text | Não | — | Código de classificação tributária para CBS e IBS. |
| Obs. Fiscal (infAdFisco) | text | Não | — | Informações fiscais adicionais para o XML da NF-e. |

**Sub-entidade: Idiomas**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Idioma | text | Sim | en, es, pt, etc. | Código do idioma (ISO 639-1). |
| Descrição | text | Sim | — | Descrição da classificação fiscal no idioma selecionado. |

**Sub-entidade: Atributos de Exportação**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Código | text | Sim | — | Código do atributo de exportação. |
| NCM | text | Não | — | NCM associado ao atributo. |
| Descrição | text | Não | — | Descrição do atributo. |
| Domínio | text | Não | Drawback / Reintegra / etc. | Regime aduaneiro especial. |
| Vigência início | date | Não | — | Data de início de vigência do atributo. |
| Vigência fim | date | Não | — | Data de fim de vigência (vazio = indeterminada). |

**Observações importantes:**
- Na hierarquia de busca de alíquotas, a VFIS0350 tem a **precedência máxima**. Se um item possui classificação fiscal cadastrada aqui, suas alíquotas de IPI, PIS e COFINS, modalidades de BC e CSTs são utilizadas prioritariamente, ignorando as configurações da VFIS0110 e VFIS0320.
- A sub-entidade Idiomas é essencial para empresas exportadoras que precisam emitir documentos fiscais com descrições em inglês, espanhol ou outros idiomas. Cada classificação pode ter múltiplas traduções.
- A sub-entidade Atributos de Exportação gerencia regimes aduaneiros especiais: Drawback (suspensão/imunidade de tributos na importação para posterior exportação) e Reintegra (reintegração de valores para empresas exportadoras). O controle de vigência por data permite gerenciar atributos temporais.
- O campo Cód. Clas. Trib (CBS/IBS) é uma preparação para a reforma tributária brasileira, que prevê a substituição de PIS, COFINS, IPI, ICMS e ISS pela CBS e IBS.

**Telas relacionadas:**
- **VFIS0110 (Tabelas Tributárias):** Alíquotas padrão usadas como fallback quando o item não possui classificação fiscal específica.
- **VFIS0200 (NF-e de Saída) e VFIS0210 (NF-e de Entrada):** As classificações fiscais são a primeira fonte consultada para determinar as alíquotas dos itens.
- **VFIS0360 (Tipos Operação Entrada):** Classificações fiscais podem ser vinculadas como padrão para tipos de operação de entrada.
- **Módulo de Exportação:** Os atributos de exportação (Drawback, Reintegra) são utilizados no processo de exportação.

---

#### VFIS0360 — Tipos de Operação de Entrada

**Objetivo:** Padronizar os tipos de operação de entrada utilizados na VFIS0210 (NF-e de Entrada), definindo códigos de operação, naturezas fiscais, tipos de nota, grupos de estados (para validação de UF) e classificações fiscais padrão. Inclui um validador inline para verificar se uma combinação (operação, UF) é permitida.

**Pré-requisitos:**
- VFIS0300 (CFOPs): Naturezas de operação referenciadas.
- VFIS0350 (Classificações Fiscais): Classificações fiscais padrão que podem ser vinculadas às operações.
- VLOC0100 (Localização Países/UFs): UFs para composição dos grupos de estado.

**Passo a passo:**

1. Acesse a tela VFIS0360 — Tipos de Operação de Entrada. A tela possui duas abas: **Tipos de Operação** e **Grupos de Estado**.

2. **Aba Grupos de Estado (configurar primeiro):**
   a. Alterne para a aba **Grupos de Estado**.
   b. Para criar um novo grupo, preencha o **Código Grupo** e a **Descrição** (ex.: código "SUL", descrição "Região Sul") e clique em **+ Grupo**.
   c. Para adicionar UFs a um grupo, preencha o código do grupo e a UF (2 caracteres) na seção "Adicionar UF ao grupo" e clique em **Adicionar**. Repita para cada UF.
   d. A tabela exibe todos os grupos com suas UFs listadas (ex.: "PR, SC, RS" para o grupo SUL).

3. **Aba Tipos de Operação:**
   a. Alterne para a aba **Tipos de Operação**.
   b. Clique em **+ Novo Tipo** para criar uma nova operação.
   c. Preencha os campos:
      - **Código:** Código da operação de entrada. Imutável após criação.
      - **Descrição:** Descrição da operação. Obrigatório.
      - **Natureza Op.:** Natureza da operação fiscal (ex.: "1101", "2101"). Obrigatório.
      - **Tipo Nota:** Tipo de documento fiscal associado (ex.: "NF-e", "CT-e").
      - **Grupo Estado:** Código do grupo de estados (criado na Aba Grupos de Estado). Define em quais UFs esta operação é válida.
      - **Tipo Fornecedor:** Classificação do fornecedor (ex.: "NACIONAL", "ESTRANGEIRO").
      - **Classif. (tipo) e Classif. (código):** Classificação fiscal padrão vinculada a esta operação (da VFIS0350). Itens registrados com esta operação herdam automaticamente as alíquotas e CSTs da classificação vinculada.
   d. Clique em **Salvar**.

4. **Validador inline de UF:**
   a. Na seção "Validar UF x Natureza", preencha o código do tipo de operação e a UF a ser validada.
   b. Clique em **Validar**. O sistema consulta o grupo de estados vinculado à operação e verifica se a UF pertence ao grupo.
   c. O feedback exibe "UF XX válida para YY" (verde) ou "UF XX inválida para YY — motivo" (vermelho).
   d. Esta validação é integrada na VFIS0210 durante o registro de NF-es de entrada.

5. Use **Exportar** para gerar relatórios.

**Campos (Aba 1 — Tipos de Operação):**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Código | text | Não | — | Código da operação de entrada. Imutável após criação. |
| Descrição | text | Sim | — | Descrição da operação. |
| Natureza Op. | text | Sim | — | Natureza da operação fiscal (ex.: "1101"). |
| Tipo Nota | text | Não | NF-e / CT-e | Tipo de documento fiscal associado. |
| Grupo Estado | text | Não | Grupos cadastrados | Código do grupo de estados que define onde a operação é válida. |
| Tipo Fornecedor | text | Não | — | Classificação do fornecedor (ex.: "NACIONAL"). |
| Classif. (tipo) | text | Não | — | Tipo de classificação fiscal padrão. |
| Classif. (código) | text | Não | — | Código da classificação fiscal padrão (VFIS0350). |

**Campos (Aba 2 — Grupos de Estado):**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Código Grupo | text | Sim | — | Código do grupo de estados. |
| Descrição | text | Não | — | Descrição do grupo. |
| UFs | multi-select | Sim | Todas as UFs | Lista de UFs que compõem o grupo. |

**Observações importantes:**
- Configure os **Grupos de Estado primeiro**, antes de criar os Tipos de Operação, pois as operações referenciam os grupos.
- O validador inline de UF é uma ferramenta de diagnóstico: ele permite verificar em tempo real se uma combinação de código de operação + UF é permitida, sem precisar acessar a VFIS0210. Esta validação é integrada na VFIS0210 como parte do fluxo de registro.
- O campo Classif. (código) vincula uma classificação fiscal da VFIS0350 à operação. Ao registrar uma NF-e de entrada com este tipo de operação, os itens herdam automaticamente as alíquotas e CSTs da classificação vinculada, agilizando o lançamento.
- O código da operação é imutável após a criação — revise cuidadosamente antes de salvar.
- Empresas que operam em múltiplos estados devem criar grupos de estado para cada cenário (ex.: "SUL" = PR, SC, RS; "SUDESTE" = SP, RJ, MG, ES; "NORDESTE" = BA, PE, CE, etc.) e vincular cada operação ao grupo adequado.

**Telas relacionadas:**
- **VFIS0210 (NF-e de Entrada):** Utiliza os tipos de operação como referência para padronizar o registro de NF-es de entrada e validar as UFs dos emitentes.
- **VFIS0300 (CFOPs):** Naturezas de operação referenciadas.
- **VFIS0350 (Classificações Fiscais):** Classificação fiscal padrão vinculada à operação.


---

#### VFIS0500 — Motivos de Transferência DAPI

**Objetivo:** Cadastrar os motivos legais de transferência de crédito de ICMS utilizados na Declaração de Apuração e Informações (DAPI), com controle de UF de destino e vigência. Os motivos cadastrados aqui são referenciados na apuração de ICMS (VFIS0540) quando há movimentação de crédito entre estabelecimentos ou entre UFs.

**Pré-requisitos:**
- VLOC0100 (Localização Países/UFs): UFs para o campo Destino.
- Conhecimento dos motivos de transferência previstos na legislação estadual (Regulamento do ICMS).

**Passo a passo:**

1. Acesse a tela VFIS0500 — Motivos de Transferência DAPI. A tela exibe a lista de motivos cadastrados.

2. Clique em **+ Novo Motivo**.

3. Preencha os campos:
   - **Código:** Código do motivo de transferência (ex.: "01", "TRANSF_CRED"). Obrigatório. Imutável após criação.
   - **Motivo:** Descrição do motivo da transferência de crédito de ICMS (ex.: "Transferência de crédito acumulado para filial"). Obrigatório.
   - **Destino (UF):** UF de destino do crédito transferido (2 caracteres, maiúsculas automáticas).
   - **Vigência:** Data de início de vigência do motivo (padrão: data atual).

4. Clique em **Salvar**.

5. Para editar um motivo existente, clique em **Editar**. O campo Código fica desabilitado (imutável).

6. A coluna **Ativo** (Sim = pill verde, Não = pill vermelho) indica se o motivo está vigente.

**Campos:**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Código | text | Sim | — | Código do motivo de transferência. Imutável após criação. |
| Motivo | text | Sim | — | Descrição do motivo da transferência de crédito de ICMS. |
| Destino (UF) | text (2 caracteres) | Sim | UFs do VLOC0100 | UF de destino do crédito transferido. |
| Vigência | date | Não | — | Data de início de vigência do motivo. |
| Ativo | toggle | — | Sim / Não | Indica se o motivo está vigente (controlado pelo backend). |

**Observações importantes:**
- O código do motivo é imutável após a criação, pois é referenciado em declarações já entregues. Altere a descrição e vigência conforme necessário.
- A DAPI (Declaração de Apuração e Informações do ICMS) é uma obrigação acessória mensal exigida por diversas SEFAZs estaduais. O campo "motivo de transferência" é obrigatório quando há movimentação de crédito entre filiais ou entre empresas do mesmo grupo.
- O controle de vigência permite gerenciar motivos temporários — motivos fora da vigência não aparecem para seleção nas telas de lançamento, mas permanecem no histórico.
- Os motivos cadastrados aqui são consumidos pela VFIS0540 (Lançamentos Resumo ICMS) quando o lançamento envolve transferência de crédito.

**Telas relacionadas:**
- **VFIS0540 (Lançamentos Resumo ICMS):** Seleção de motivo de transferência em lançamentos que envolvem movimentação de crédito entre UFs.
- **Módulo DAPI:** Geração do arquivo da Declaração de Apuração e Informações do ICMS.

---

#### VFIS0510 — Códigos de Ajuste de Apuração ICMS (5.1.1)

**Objetivo:** Manter a tabela de códigos de ajuste da apuração de ICMS — tabela 5.1.1 do SPED Fiscal (EFD ICMS/IPI). Cada código é vinculado a uma UF e possui vigência. A chave primária é composta por (código, UF), garantindo que o mesmo código numérico possa existir em diferentes estados.

**Pré-requisitos:**
- VLOC0100 (Localização Países/UFs): UFs para vinculação dos códigos.
- Conhecimento dos códigos de ajuste oficiais publicados pelas SEFAZs estaduais.

**Passo a passo:**

1. Acesse a tela VFIS0510 — Códigos de Ajuste de Apuração ICMS (5.1.1). A tela exibe a lista de códigos cadastrados.

2. Clique em **+ Novo Código**.

3. Preencha os campos:
   - **Código:** Código de ajuste composto por UF (2 letras) + sequencial numérico (ex.: "SP10000000"). Obrigatório.
   - **UF:** Unidade Federativa do código (2 caracteres, maiúsculas automáticas). Obrigatório.
   - **Vigência:** Data de início de vigência.
   - **Descrição:** Descrição completa do código de ajuste conforme tabela oficial da SEFAZ. Obrigatório.

4. Clique em **Salvar**. O sistema valida que o par (código, UF) é único — não é permitido duplicar códigos para a mesma UF.

5. Para editar, clique em **Editar** na linha correspondente.

**Campos:**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Código | text | Sim | — | Código de ajuste (padrão: UF + sequencial). Parte da chave única (código, UF). |
| UF | text (2 caracteres) | Sim | UFs do VLOC0100 | UF do código de ajuste. Parte da chave única. |
| Vigência | date | Não | — | Data de início de vigência. |
| Descrição | text | Sim | — | Descrição do código de ajuste conforme tabela oficial da SEFAZ. |
| Ativo | toggle | — | Sim / Não | Indica se o código está vigente. |

**Observações importantes:**
- A tabela 5.1.1 contém os códigos de ajuste genéricos da apuração de ICMS, utilizados no Bloco E da EFD para justificar ajustes que não constam diretamente nos documentos fiscais de entrada/saída, como estornos de crédito, complementos de débito ou ajustes decorrentes de ação fiscal.
- O campo Código segue o padrão oficial: duas letras da UF + sequencial numérico. Ex.: "SP000001" para o primeiro código de São Paulo.
- A chave única é composta por (código, UF) — códigos iguais em UFs diferentes são permitidos (ex.: "SP000001" e "RJ000001" podem coexistir).
- O usuário é responsável por manter esta tabela atualizada conforme as publicações das SEFAZs estaduais. Códigos podem ser criados, alterados ou revogados por legislação estadual.
- O controle de vigência permite desativar códigos obsoletos sem excluí-los, preservando o histórico de declarações já entregues.

**Telas relacionadas:**
- **VFIS0530 (Linhas Apuração ICMS):** As linhas do Bloco E podem ser associadas a códigos de ajuste desta tabela.
- **VFIS0540 (Lançamentos Resumo ICMS):** Seleção de códigos de ajuste nos lançamentos manuais.
- **VFIS0560 (Notas Especiais Ajuste):** Utilização de códigos de ajuste em notas de ajuste.

---

#### VFIS0520 — Códigos de Ajuste ICMS (5.2 / 5.3 / 5.6 / 5.7)

**Objetivo:** Complementar a VFIS0510 gerenciando os códigos de ajuste das demais tabelas do Bloco E do SPED Fiscal: 5.2 (Ajustes de ICMS de Substituição Tributária), 5.3 (Ajustes de ICMS de Diferencial de Alíquota), 5.6 (Ajustes de ICMS de operações com energia elétrica) e 5.7 (Ajustes de ICMS de operações com telecomunicações). A chave única é composta por (UF, código, tabela).

**Pré-requisitos:**
- VLOC0100 (Localização Países/UFs): UFs para vinculação dos códigos.
- Conhecimento das tabelas oficiais 5.2, 5.3, 5.6 e 5.7 do SPED Fiscal publicadas pelas SEFAZs.

**Passo a passo:**

1. Acesse a tela VFIS0520 — Códigos de Ajuste ICMS (5.2/5.3/5.6/5.7). A tela exibe a lista de códigos cadastrados.

2. Clique em **+ Novo Código**.

3. Preencha os campos:
   - **Código:** Código de ajuste (padrão UF + sequencial, ex.: "SP20000100"). Obrigatório.
   - **UF:** Unidade Federativa (2 caracteres). Obrigatório.
   - **Tabela:** Selecione a tabela do SPED à qual o código pertence:
     - `5.2` — Ajustes de ICMS de Substituição Tributária.
     - `5.3` — Ajustes de ICMS de Diferencial de Alíquota (DIFAL).
     - `5.6` — Ajustes de ICMS de operações com energia elétrica.
     - `5.7` — Ajustes de ICMS de operações com telecomunicações.
   - **Vigência:** Data de início de vigência.
   - **Descrição:** Descrição completa do código conforme tabela oficial. Obrigatório.

4. Clique em **Salvar**. O sistema valida a unicidade da combinação (UF, código, tabela).

**Campos:**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Código | text | Sim | — | Código de ajuste. Parte da chave única tripla (UF, código, tabela). |
| UF | text (2 caracteres) | Sim | UFs do VLOC0100 | UF do código de ajuste. |
| Tabela | select | Sim | 5.2 / 5.3 / 5.6 / 5.7 | Tabela do SPED Fiscal à qual o código pertence. |
| Vigência | date | Não | — | Data de início de vigência. |
| Descrição | text | Sim | — | Descrição do código de ajuste. |
| Ativo | toggle | — | Sim / Não | Indica se o código está vigente. |

**Observações importantes:**
- A chave única é tripla (UF, código, tabela), permitindo que um mesmo código numérico exista em diferentes UFs ou em diferentes tabelas. Por exemplo, "SP000001" pode existir simultaneamente na tabela 5.2 e na 5.6.
- As tabelas têm finalidades específicas:
  - **5.2:** Ajustes relacionados a ICMS de Substituição Tributária (ST).
  - **5.3:** Ajustes de ICMS de Diferencial de Alíquota (DIFAL) — interestadual para consumidor final.
  - **5.6:** Ajustes de ICMS de operações com energia elétrica (CFOPs 5.2XX/6.2XX).
  - **5.7:** Ajustes de ICMS de operações com telecomunicações (CFOPs 5.3XX/6.3XX).
- O seletor de Tabela é um dropdown com as 4 opções, permitindo filtrar corretamente os códigos disponíveis conforme o contexto (linha de apuração ou nota de ajuste).

**Telas relacionadas:**
- **VFIS0530 (Linhas Apuração ICMS):** Associação de códigos de ajuste às linhas de apuração.
- **VFIS0540 (Lançamentos Resumo ICMS):** Seleção de códigos nos lançamentos manuais.
- **VFIS0560 (Notas Especiais Ajuste):** Utilização em notas de ajuste.

---

#### VFIS0530 — Linhas de Apuração de ICMS (Bloco E)

**Objetivo:** Definir a estrutura do Bloco E do SPED Fiscal/EFD ICMS IPI, cadastrando as linhas de apuração (ex.: E110, E111, E210, E211) com sua classificação contábil (débito, crédito, saldo, dedução) e indicando se a linha aceita lançamentos manuais. As linhas aqui cadastradas estruturam toda a apuração de ICMS do sistema.

**Pré-requisitos:**
- Conhecimento do guia prático do SPED Fiscal (EFD ICMS/IPI) — Bloco E.
- VFIS0510 e VFIS0520: Códigos de ajuste que serão vinculados às linhas.

**Passo a passo:**

1. Acesse a tela VFIS0530 — Linhas de Apuração de ICMS (Bloco E). A tela exibe a lista de linhas cadastradas.

2. Clique em **+ Nova Linha**.

3. Preencha os campos:
   - **Código:** Código da linha de apuração (ex.: "E110", "E111", "E210", "E211"). Obrigatório. Imutável após criação.
   - **Descrição:** Descrição da linha conforme o guia prático do SPED (ex.: "Valor total dos débitos por saídas e prestações"). Obrigatório.
   - **Tipo:** Natureza contábil da linha:
     - `DEBITO` — Linha de débito (ICMS a recolher, saídas).
     - `CREDITO` — Linha de crédito (ICMS a compensar, entradas).
     - `SALDO` — Linha de saldo (resultado líquido da apuração).
     - `DEDUCAO` — Linha de dedução (isenta, não-tributada).
     - `OUTROS` — Outras naturezas.
   - **Aceita lançamentos:** Toggle (Sim/Não). Se ativo, permite que o usuário faça lançamentos manuais diretamente nesta linha através da VFIS0540.
   - **Natureza:** Campo adicional para detalhamento da natureza da linha.

4. Clique em **Salvar**.

**Campos:**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Código | text | Sim | — | Código da linha (ex.: E110). Imutável após criação. |
| Descrição | text | Sim | — | Descrição conforme guia prático do SPED Fiscal. |
| Tipo | select | Sim | DEBITO / CREDITO / SALDO / DEDUCAO / OUTROS | Natureza contábil da linha na apuração. |
| Aceita lançamentos | toggle | Não | Sim / Não | Se ativo, permite lançamentos manuais via VFIS0540. |
| Natureza | text | Não | — | Campo adicional para detalhamento. |

**Observações importantes:**
- As linhas de apuração seguem a nomenclatura oficial do SPED: E110 (totais de débitos por saídas), E111 (detalhamento dos ajustes de débito), E210 (totais de créditos por entradas), E211 (detalhamento dos ajustes de crédito), etc.
- O campo Tipo classifica a linha contabilmente: linhas de DEBITO representam ICMS a recolher (saídas), linhas de CREDITO representam ICMS a compensar (entradas), linhas de DEDUCAO abatem do saldo devedor (isenções, reduções) e SALDO é o resultado líquido.
- O toggle "Aceita Lançamentos" é a chave de controle: linhas como E110 (total de débitos por saída) tipicamente NÃO aceitam lançamentos manuais, pois são alimentadas automaticamente pelas NF-es emitidas. Já linhas como E111 (ajustes de débito) aceitam lançamentos, permitindo ao usuário registrar ajustes manuais baseados nos códigos das tabelas VFIS0510 e VFIS0520. Esta arquitetura garante que os totais automáticos não possam ser adulterados manualmente.
- O código da linha é imutável após a criação.

**Telas relacionadas:**
- **VFIS0510 (Códigos Ajuste 5.1.1) e VFIS0520 (Códigos 5.2/5.3/5.6/5.7):** Códigos de ajuste vinculados às linhas de apuração.
- **VFIS0540 (Lançamentos Resumo ICMS):** Lançamentos manuais nas linhas que aceitam entradas.
- **VFIS0560 (Notas Especiais Ajuste):** Notas de ajuste que alimentam estas linhas.

---

#### VFIS0540 — Lançamentos Resumo de ICMS

**Objetivo:** Centralizar os lançamentos manuais na apuração de ICMS por período e UF, com vinculação a CFOPs e a notas fiscais individuais. Inclui sub-entidades para notas vinculadas e registros C197 (processos judiciais/administrativos que fundamentam os ajustes).

**Pré-requisitos:**
- VFIS0300 (CFOPs): CFOPs para vinculação nos lançamentos.
- VFIS0500 (Motivos Transferência DAPI): Motivos de transferência para lançamentos de movimentação de crédito.
- VFIS0510 e VFIS0520 (Códigos de Ajuste): Códigos que fundamentam os lançamentos.
- VFIS0530 (Linhas Apuração ICMS): Linhas que aceitam lançamentos manuais.

**Passo a passo:**

1. Acesse a tela VFIS0540 — Lançamentos Resumo de ICMS. A tela exibe a lista de lançamentos cadastrados.

2. Clique em **+ Novo Lançamento**.

3. Na seção **Lançamento**, preencha:
   - **Período:** Formato YYYY-MM (ex.: "2026-06"). Obrigatório.
   - **UF:** UF da apuração (2 caracteres, maiúsculas automáticas). Obrigatório.
   - **CFOP (ID):** ID do CFOP da VFIS0300 associado ao lançamento. Obrigatório.
   - **Base ICMS:** Base de cálculo do ICMS do lançamento.
   - **Valor ICMS:** Valor do ICMS (débito ou crédito conforme a linha de apuração vinculada).

4. Clique em **Salvar**. O sistema valida o formato do período e os campos obrigatórios.

5. **Sub-entidade: Notas Vinculadas:**
   a. Na listagem, localize o lançamento desejado e clique em **Notas/Adic.**.
   b. Na seção **Notas**, preencha os dados de cada nota fiscal que compõe o lançamento:
      - **Nº Nota:** Número da NF-e. Obrigatório.
      - **Série:** Série da NF-e.
      - **CNPJ Emitente:** CNPJ do emitente da nota. Obrigatório.
      - **Emissão:** Data de emissão da NF-e.
      - **Valor Item:** Valor contábil do item.
      - **Base ICMS e Valor ICMS:** Base e ICMS destacado na nota.
   c. Clique em **+ Nota**. Repita para cada nota que compõe o lançamento.

6. **Sub-entidade: Adicionais (C197):**
   a. Na seção **Adicionais (C197 / processos)**, preencha os dados do processo que originou o ajuste:
      - **Indicador:** `SEFAZ`, `JUSTICA_FEDERAL`, `JUSTICA_ESTADUAL` ou `OUTROS`.
      - **Processo:** Número do processo judicial ou administrativo.
      - **Descrição:** Descrição complementar do processo.
   b. Clique em **+ Adicional**.

7. Para editar um lançamento, clique em **Editar** na linha correspondente.

**Campos (Principal):**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Período | text (YYYY-MM) | Sim | — | Período de apuração (mês/ano). |
| UF | text (2 caracteres) | Sim | UFs do VLOC0100 | UF da apuração. |
| CFOP (ID) | number | Sim | CFOPs da VFIS0300 | ID do CFOP associado ao lançamento. |
| Base ICMS | number | Sim | >= 0 | Base de cálculo do ICMS do lançamento. |
| Valor ICMS | number | Sim | >= 0 | Valor do ICMS (débito ou crédito). |

**Sub-entidade: Notas Vinculadas**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Nº Nota | text | Sim | — | Número da NF-e vinculada. |
| Série | text | Não | — | Série da NF-e. |
| CNPJ Emitente | text | Sim | — | CNPJ do emitente da nota. |
| Emissão | date | Não | — | Data de emissão da NF-e. |
| Valor Item | number | Não | — | Valor contábil da nota. |
| Base ICMS | number | Não | — | Base de ICMS da nota. |
| Valor ICMS | number | Não | — | ICMS destacado na nota. |

**Sub-entidade: Adicionais C197**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Indicador | select | Não | SEFAZ / JUSTICA_FEDERAL / JUSTICA_ESTADUAL / OUTROS | Origem do processo que gerou o ajuste (registro C197 do SPED). |
| Processo | text | Não | — | Número do processo judicial ou administrativo. |
| Descrição | text | Não | — | Descrição complementar do processo. |

**Observações importantes:**
- O lançamento é vinculado a um Período (mês/ano), uma UF e um CFOP. A combinação destes três elementos é tratada como única na apuração.
- A sub-entidade Notas Vinculadas permite registrar individualmente cada NF-e que compõe o total do lançamento — essencial para rastreabilidade e para a geração correta do SPED Fiscal.
- A sub-entidade Adicionais C197 captura informações sobre processos judiciais ou administrativos que originaram o ajuste, preenchendo o registro C197 da EFD. O indicador aponta a origem (SEFAZ, JUSTIÇA FEDERAL, JUSTIÇA ESTADUAL, OUTROS).
- O sistema filtra automaticamente as linhas de apuração disponíveis para seleção com base no toggle "Aceita Lançamentos" da VFIS0530.

**Telas relacionadas:**
- **VFIS0300 (CFOPs):** CFOP associado ao lançamento.
- **VFIS0500 (Motivos Transferência DAPI):** Motivo de transferência para lançamentos de movimentação de crédito.
- **VFIS0510 e VFIS0520 (Códigos Ajuste):** Códigos que fundamentam os lançamentos.
- **VFIS0530 (Linhas Apuração ICMS):** Linhas que aceitam lançamento manual.
- **VFIS0560 (Notas Especiais Ajuste):** Notas de ajuste que podem gerar lançamentos automáticos nesta tela.

---

#### VFIS0550 — Restituição / Ressarcimento de ICMS ST

**Objetivo:** Controlar pedidos de restituição, ressarcimento e complementação de ICMS Substituição Tributária (ICMS ST), com referência ao documento fiscal de origem e detalhamento dos valores de ST original e valores a restituir. Requer filtro por período para listagem.

**Pré-requisitos:**
- VFIS0100 (Configuração Fiscal): Dados da empresa solicitante.
- VFIS0110 (Tabelas Tributárias): Alíquotas de ICMS e ICMS ST de referência.
- VFIS0210 (NF-e de Entrada): Notas fiscais de entrada que geraram o ICMS ST a ser restituído.

**Passo a passo:**

1. Acesse a tela VFIS0550 — Restituição / Ressarcimento de ICMS ST.

2. A listagem exige um **filtro por período** (YYYY-MM). Preencha o período desejado e clique em **Filtrar**.

3. Para criar um novo pedido, clique em **+ Novo Pedido**.

4. Na seção **Documento de origem**, preencha:
   - **Empresa (ID):** Identificador da empresa/filial solicitante. Obrigatório.
   - **Período:** Período de referência (YYYY-MM). Obrigatório.
   - **Tipo:** `RESTITUICAO` (devolução de valor pago a maior), `RESSARCIMENTO` (compensação de crédito) ou `COMPLEMENTACAO` (valor adicional a receber).
   - **UF:** UF de origem do ICMS ST. Obrigatório.
   - **Modelo:** Modelo do documento fiscal (padrão: "55").
   - **Nº Doc.:** Número do documento fiscal de origem.
   - **CNPJ Emitente:** CNPJ do emitente da nota que gerou o ICMS ST.
   - **Item:** Código do item/produto.
   - **CFOP:** CFOP do documento de origem.
   - **CST:** CST do ICMS do item.

5. Na seção **Valores ICMS ST**, preencha:
   - **Base ST:** Base de cálculo do ICMS ST original.
   - **Alíq. ST (%):** Alíquota do ICMS ST aplicada.
   - **Valor ST:** Valor do ICMS ST original (Base ST x Alíquota ST).
   - **Base Restituição:** Base de cálculo sobre a qual se pede a restituição.
   - **Valor Restituição:** Valor da restituição/ressarcimento solicitado.

6. Clique em **Salvar**.

7. O pedido aparece na listagem do período selecionado após recarregar.

**Campos:**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Empresa (ID) | number | Sim | — | Identificador da empresa/filial solicitante. |
| Período | text (YYYY-MM) | Sim | — | Período de referência. Campo usado como filtro obrigatório. |
| Tipo | select | Sim | RESTITUICAO / RESSARCIMENTO / COMPLEMENTACAO | Natureza da solicitação. |
| UF | text (2 caracteres) | Sim | UFs do VLOC0100 | UF de origem do ICMS ST. |
| Modelo | text | Não | — | Modelo do documento fiscal (ex.: "55"). |
| Nº Doc. | text | Não | — | Número do documento fiscal de origem. |
| CNPJ Emitente | text | Não | — | CNPJ do emitente da nota que gerou o ICMS ST. |
| Item | text | Não | — | Código do item/produto. |
| CFOP | text | Não | — | CFOP do documento de origem. |
| CST | text | Não | 00 a 90 | CST do ICMS do item. |
| Base ST | number | Sim | >= 0 | Base de cálculo do ICMS ST original. |
| Alíq. ST (%) | number | Sim | 0,00 a 100,00 | Alíquota do ICMS ST aplicada. |
| Valor ST | number | Não | >= 0 | ICMS ST original (Base ST x Alíquota ST). |
| Base Restituição | number | Sim | >= 0 | Base de cálculo sobre a qual se pede restituição. |
| Valor Restituição | number | Sim | >= 0 | Valor da restituição/ressarcimento solicitado. |

**Observações importantes:**
- O filtro por período é obrigatório para exibir os registros na grid — uma medida de performance para evitar carregar todo o histórico de uma vez.
- O ICMS ST é recolhido antecipadamente pelo substituto tributário. Quando a operação efetiva com consumidor final resulta em base de cálculo menor que a presumida, o contribuinte substituído tem direito à restituição. O complemento ocorre quando a base real é maior que a presumida.
- O Valor ST original é informado manualmente pelo usuário (não calculado automaticamente, apesar de o rótulo sugerir o contrário).
- O Valor Restituição é calculado com base na diferença entre o ICMS ST recolhido e o ICMS próprio devido na operação real.
- Estes valores alimentam a apuração de ICMS e podem ser utilizados para compensação em períodos subsequentes.

**Telas relacionadas:**
- **VFIS0100 (Configuração Fiscal):** Dados da empresa solicitante.
- **VFIS0110 (Tabelas Tributárias):** Alíquotas de ICMS e ICMS ST.
- **VFIS0210 (NF-e de Entrada):** Notas de entrada que geraram o ICMS ST.

---

#### VFIS0560 — Notas Especiais de Ajuste

**Objetivo:** Emitir notas fiscais especiais de ajuste (complementares e de ajuste) que não são NF-es convencionais, mas servem para ajustar valores na apuração de ICMS. As notas possuem itens detalhados, status de rascunho e a opção de gerar automaticamente lançamentos resumo na VFIS0540 ao serem salvas. Requer filtro por período para listagem.

**Pré-requisitos:**
- VFIS0300 (CFOPs): CFOPs para notas de ajuste.
- VFIS0510 e VFIS0520 (Códigos de Ajuste): Códigos que fundamentam os ajustes.
- VFIS0530 (Linhas Apuração ICMS): Linhas de apuração onde os ajustes serão lançados.

**Passo a passo:**

1. Acesse a tela VFIS0560 — Notas Especiais de Ajuste.

2. A listagem exige um **filtro por período** (YYYY-MM). Preencha o período e clique em **Filtrar**.

3. Para criar uma nova nota de ajuste, clique em **+ Nova Nota**.

4. Na seção **Nota**, preencha:
   - **Empresa (ID):** Identificador da empresa emitente. Obrigatório.
   - **Finalidade:** `COMPLEMENTAR` (complementa valores de uma NF-e existente) ou `AJUSTE` (ajusta valores na apuração sem NF-e correspondente).
   - **Período:** Período fiscal ao qual o ajuste se refere (YYYY-MM). Obrigatório.
   - **Emissão:** Data de emissão da nota de ajuste.
   - **Gera resumo automático:** Toggle (Sim/Não). Se ativo, ao salvar a nota o sistema cria automaticamente um lançamento resumo na VFIS0540.
   - **CFOP (ID):** ID do CFOP da nota de ajuste (VFIS0300).
   - **Linha Apur. (ID):** ID da linha de apuração da VFIS0530 na qual o ajuste será lançado.
   - **Cód. Ajuste (ID):** ID do código de ajuste (VFIS0510 ou VFIS0520).
   - **Valor Total:** Somatório dos valores totais dos itens.
   - **ICMS Total:** Somatório dos valores de ICMS dos itens.
   - **Observação:** Campo livre para detalhamento da finalidade do ajuste.

5. Clique em **Salvar**. A nota é criada com status **RASCUNHO**.

6. **Adicionar Itens:**
   a. Na listagem, localize a nota e clique em **Itens**.
   b. Na seção **Itens**, preencha para cada item:
      - **Item:** Código do item/produto. Obrigatório.
      - **Descrição:** Descrição do item. Obrigatório.
      - **Qtd:** Quantidade.
      - **UN:** Unidade de medida (ex.: "UN", "KG").
      - **Vlr Unit.:** Valor unitário.
      - **Valor Total:** Calculado automaticamente (Qtd x Vlr Unit.).
      - **Base ICMS:** Base de cálculo do ICMS do item.
      - **% ICMS:** Alíquota de ICMS.
      - **Valor ICMS:** Valor do ICMS (calculado manualmente ou Base ICMS x % ICMS).
      - **CST:** CST do ICMS do item.
   c. Clique em **+ Item**. O valor total do botão é atualizado automaticamente conforme o valor total do item sendo adicionado.

7. Se o toggle **Gera resumo automático** estiver ativo, ao salvar a nota o sistema cria automaticamente um registro na VFIS0540 (Lançamentos Resumo ICMS) com os mesmos período, UF, CFOP, linha de apuração, código de ajuste, base e valor de ICMS.

8. Após o lançamento (manual ou automático), o status da nota muda para **LANÇADO** e ela não pode mais ser editada.

**Campos (Cabeçalho):**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Empresa (ID) | number | Sim | — | Identificador da empresa emitente. |
| Finalidade | select | Sim | COMPLEMENTAR / AJUSTE | Finalidade da nota: complementar ou ajuste. |
| Período | text (YYYY-MM) | Sim | — | Período fiscal ao qual o ajuste se refere. |
| Emissão | date | Não | — | Data de emissão da nota de ajuste. |
| Gera resumo automático | toggle | Não | Sim / Não | Se ativo, ao salvar cria automaticamente o lançamento resumo na VFIS0540. |
| CFOP (ID) | number | Não | CFOPs da VFIS0300 | ID do CFOP da nota de ajuste. |
| Linha Apur. (ID) | number | Não | Linhas da VFIS0530 | ID da linha de apuração onde o ajuste será lançado. |
| Cód. Ajuste (ID) | number | Não | Códigos da VFIS0510/VFIS0520 | ID do código de ajuste. |
| Valor Total | number (auto) | — | — | Somatório dos valores totais dos itens. |
| ICMS Total | number (auto) | — | — | Somatório dos valores de ICMS dos itens. |
| Observação | text | Não | — | Descrição detalhada da finalidade do ajuste. |
| Status | badge | — | RASCUNHO / LANÇADO | Inicia como RASCUNHO; após lançamento, muda para LANÇADO (não editável). |

**Campos (Itens):**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Item | text | Sim | — | Código do item/produto. |
| Descrição | text | Sim | — | Descrição do item. |
| Qtd | number | Não | > 0 | Quantidade. |
| UN | text | Não | — | Unidade de medida. |
| Vlr Unit. | number | Não | — | Valor unitário do item. |
| Valor Total | number (auto) | — | — | Calculado automaticamente (Qtd x Vlr Unit.). |
| Base ICMS | number | Não | >= 0 | Base de cálculo do ICMS do item. |
| % ICMS | number | Não | 0,00 a 100,00 | Alíquota de ICMS do item. |
| Valor ICMS | number | Não | — | Valor do ICMS do item. |
| CST | text | Não | 00 a 90 | CST do ICMS do item. |

**Observações importantes:**
- A VFIS0560 é especializada para emissão de notas fiscais de ajuste — documentos que não são NF-es convencionais de entrada ou saída, mas servem para ajustar valores na apuração de ICMS.
- Finalidade COMPLEMENTAR: complementa valor de uma NF-e já emitida (ex.: reajuste de preço após a emissão).
- Finalidade AJUSTE: ajuste contábil/fiscal sem vínculo com uma NF-e específica (ex.: estornos, correções de apuração).
- O toggle "Gera resumo automático" é a integração chave: quando ativo, ao salvar a nota o sistema cria automaticamente um lançamento na VFIS0540. Quando inativo, o usuário deve fazer o lançamento manualmente na VFIS0540.
- Uma vez que o status muda para LANÇADO (após o lançamento automático ou manual), a nota não pode mais ser editada.
- O Valor Total e ICMS Total do cabeçalho são recalculados automaticamente a partir dos itens.
- O filtro por período é obrigatório para listagem, por questões de performance.

**Telas relacionadas:**
- **VFIS0300 (CFOPs):** Seleção de CFOP para a nota de ajuste.
- **VFIS0510 e VFIS0520 (Códigos Ajuste):** Códigos que fundamentam o ajuste.
- **VFIS0530 (Linhas Apuração ICMS):** Linhas de apuração onde o ajuste é lançado.
- **VFIS0540 (Lançamentos Resumo ICMS):** Destino da geração automática de lançamentos.

---

#### VNFS0100 — NFS-e (Nota Fiscal de Serviço Eletrônica)

**Objetivo:** Realizar o ciclo completo de emissão de Nota Fiscal de Serviço Eletrônica: preenchimento dos dados do RPS (Recibo Provisório de Serviço), do tomador e do serviço prestado; cálculo automático de ISS; autorização via webservice municipal; e cancelamento com justificativa. Integra-se com a API do município conforme padrão ABRASF/GINFES.

**Pré-requisitos:**
- VFIS0100 (Configuração Fiscal): CNPJ do emitente, endereço, código de município (IBGE) e Token Focus NF-e (para integração com webservice municipal).
- Cadastro de serviços: Conhecimento do item da lista de serviços da LC 116/2003 aplicável (1 a 40) e do código de tributação municipal.

**Passo a passo:**

1. Acesse a tela VNFS0100 — NFS-e. A visão padrão é a **Listagem**, exibindo todas as NFS-es emitidas com seus status (autorizada = verde, cancelada = vermelho, rascunho = cinza).

2. Clique em **+ Nova** para iniciar uma nova NFS-e.

3. Na seção **RPS**, preencha:
   - **Nº RPS:** Número do Recibo Provisório de Serviço (sequencial). Obrigatório.
   - **Série:** Série do RPS (padrão: "1").
   - **Emissão:** Data de emissão do RPS/NFS-e. Obrigatório.
   - **Optante Simples:** Toggle (Sim/Não). Se ativo, indica que o emitente é optante do Simples Nacional.
   - **Cód. município (prestador):** Código IBGE de 7 dígitos do município onde o serviço é prestado. Determina qual webservice municipal será acionado.

4. Na seção **Tomador**, preencha:
   - **CNPJ/CPF:** CNPJ ou CPF do tomador do serviço. Mutuamente excludentes — preencher um ou outro.
   - **Razão social:** Nome ou razão social do tomador. Obrigatório.
   - **Cód. município:** Código IBGE do município do tomador.
   - **UF:** UF do tomador (2 caracteres, maiúsculas automáticas).
   - **E-mail:** E-mail do tomador para envio da NFS-e.

5. Na seção **Serviço**, preencha:
   - **Item lista serviço:** Código do item da lista de serviços da LC 116/2003 (ex.: "14.01" para serviços de informática). Campo texto livre.
   - **Cód. trib. município:** Código de tributação de serviço específico do município (quando exigido pela prefeitura).
   - **Discriminação:** Discriminação detalhada do serviço prestado (campo de texto).
   - **Valor serviços:** Valor total dos serviços prestados. Base de cálculo do ISS. Obrigatório.
   - **Deduções:** Valor de deduções permitidas (materiais, serviços de terceiros subcontratados).
   - **Alíquota ISS (ratio):** Alíquota de ISS em formato decimal (ex.: 0,05 = 5%). Padrão: 0,05.
   - **ISS retido:** Toggle (Sim/Não). Se ativo, indica que o ISS foi retido pelo tomador (substituição tributária).

6. Clique em **Emitir (rascunho)**. O sistema:
   - Valida que RPS, tomador e valor dos serviços estão preenchidos.
   - Valida o CNPJ/CPF do tomador, se informado.
   - Calcula automaticamente o ISS: Base de Cálculo = Valor Serviços - Deduções. ISS = Base de Cálculo x Alíquota ISS.
   - Exibe no feedback o valor do ISS e do valor líquido da NFS-e.
   - Salva a NFS-e com status de rascunho.

7. Na listagem, localize a NFS-e e clique em **Autorizar**. O sistema envia a NFS-e ao webservice municipal. O status muda para **Autorizada** (verde).

8. Para cancelar uma NFS-e autorizada, clique em **Cancelar**. O sistema solicita justificativa com no mínimo 15 caracteres. Após confirmação, envia o pedido de cancelamento ao webservice municipal.

9. Use **Exportar** para gerar relatórios (PDF, XML).

**Campos (RPS):**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Nº RPS | number | Sim | — | Número do Recibo Provisório de Serviço (sequencial). |
| Série | text | Não | — | Série do RPS (padrão: "1"). |
| Emissão | date | Sim | — | Data de emissão do RPS/NFS-e. |
| Optante Simples | toggle | Não | Sim / Não | Indica se o emitente é optante do Simples Nacional. |
| Cód. município (prestador) | text (7 dígitos) | Não | — | Código IBGE do município de prestação do serviço. |

**Campos (Tomador):**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| CNPJ/CPF | text | Não | — | CNPJ ou CPF do tomador. Mutuamente excludentes. |
| Razão social | text | Sim | — | Nome ou razão social do tomador. Obrigatório. |
| Cód. município | text | Não | — | Código IBGE do município do tomador. |
| UF | text (2 caracteres) | Não | UFs do VLOC0100 | UF do tomador. |
| E-mail | text | Não | — | E-mail do tomador para envio da NFS-e. |

**Campos (Serviço):**

| Campo | Tipo | Obrigatório | Opções | Descrição |
|-------|------|-------------|--------|-----------|
| Item lista serviço | text | Não | LC 116 itens 1 a 40 | Código do item da lista de serviços da LC 116/2003. |
| Cód. trib. município | text | Não | — | Código de tributação de serviço específico do município. |
| Discriminação | text | Não | — | Discriminação detalhada do serviço prestado. |
| Valor serviços | number | Sim | > 0 | Valor total dos serviços. Base de cálculo do ISS. |
| Deduções | number | Não | >= 0 | Valor de deduções (materiais, serviços terceiros). |
| Alíquota ISS (ratio) | number | Sim | 0,0000 a 1,0000 | Alíquota de ISS em decimal. Padrão: 0,05 (5%). |
| ISS retido | toggle | Não | Sim / Não | Se ativo, ISS foi retido pelo tomador (substituição tributária). |

**Observações importantes:**
- Diferente das NF-es de mercadorias (VFIS0200), a NFS-e é regulamentada por legislação municipal. A comunicação com o webservice da prefeitura segue o padrão ABRASF ou GINFES, dependendo do município.
- O campo Cód. município (prestador) determina qual webservice municipal será acionado. Certifique-se de que o código IBGE está correto.
- O cálculo do ISS é automático: Base de Cálculo = Valor Serviços - Deduções. ISS = Base de Cálculo x Alíquota ISS.
- A alíquota padrão de ISS é 5% (0,05), mas pode variar conforme o município e o tipo de serviço (2% a 5% para a maioria dos serviços).
- O toggle "ISS retido" indica que o tomador é responsável pela retenção e recolhimento do ISS — neste caso o emitente não recolhe, mas a NFS-e deve indicar a retenção.
- O toggle "Optante Simples Nacional" altera o tratamento do ISS: empresas do Simples recolhem ISS em guia única (DAS) ou em separado, dependendo do município e do anexo.
- O cancelamento exige justificativa e está sujeito às regras de prazo do município (tipicamente 24h a 5 dias).

**Telas relacionadas:**
- **VFIS0100 (Configuração Fiscal):** CNPJ do emitente, endereço completo e código de município (IBGE). O Token Focus NF-e pode ser utilizado para integração com o webservice municipal, dependendo da configuração.

---

> **Fim da documentação do Processo Fiscal do ERP Venture.**
> 
> Para informações sobre outros módulos, consulte a documentação complementar:
> - Módulo Financeiro (VFIN0100 a VFIN0500)
> - Módulo de Cadastros (VEMP0100, VLOC0100, VCLI0500, VAVR0200)
> - Módulo Contábil (VCTB0102, VCTB0200)
> 
> Documentação atualizada em Junho 2026.



---

## Processo PCP, Chão de Fábrica, Estoque e Custos

> Documentação dos módulos que transformam a **demanda** em **produto acabado** e o
> entregam ao cliente: Pedido de Venda, Planejamento (MRP/CRP/APS), Roteiro,
> Máquinas, Ordem de Produção, Custos, Estoque e Romaneio de Expedição.
> Total de telas deste processo: **18**.
> Última atualização: Junho 2026.

---

### Visão Geral do Processo

O PCP (Planejamento e Controle da Produção) responde a três perguntas: **o que**
produzir/comprar, **quanto** e **quando**. A partir do **Pedido de Venda** confirmado
(que vira demanda), o sistema explode a estrutura (BOM), lê o **Roteiro** (operações ×
máquinas) e calcula quando cada ordem deve ser emitida. As ordens de fabricação são
executadas no chão de fábrica (apontamento, consumo, conclusão), consomem e produzem
**estoque** (com rastreabilidade de lote), apuram **custo real** e, ao final, o produto
é separado, conferido e despachado por **romaneio**.

#### Fluxo macro (do pedido à entrega)

```
Pedido de Venda (VVND0200)  ── confirmar (P) ──►  Demanda independente + Reserva de estoque
        │                                                    │
        ▼                                                    ▼
      MRP  ──── Estrutura (VENT0210) + Roteiro (VPRO0100) + Estoque (VEST0100)
        │
        ├──► Sugestões de Compra ─────────────►  Pedido de Compra (Suprimento)
        │
        └──► Sugestões de Fabricação
                     │
                     ▼   (PCP analisa a capacidade)
              CRP (VPRO0200)  ──► sobrecarga por centro/dia?
                     │
                     ▼
              APS (VPRO0210)  ──► sequenciamento fino (Gantt), respeitando Manutenção (VPRO0500)
                     │
                     ▼
         Ordem de Produção (VPRO0900)
         iniciar → consumir insumo (OUT) → apontar (backflush) → concluir (IN + lote) → fechar (custo real)
                     │
                     ▼
             Estoque de acabados (VEST0100)  ── genealogia de lote
                     │
                     ▼
   NF-e de Saída (Fiscal) ── baixa fiscal do estoque + consome reservas + pedido Faturado
                     │
                     ▼
      Romaneio / Expedição (VEXP0100): separar → conferir → packing → despachar
```

> **Regra de ouro do estoque:** o **romaneio reserva**, a **NF-e baixa**. A reserva
> reduz o *disponível* (ATP) sem mexer no físico; a NF-e de saída reduz o físico. Isso
> evita vender o mesmo estoque duas vezes.

---

### Pré-requisitos Gerais

Antes de operar este processo, garanta que os cadastros-base existem:

1. **Itens** (VENT0200) e **Estrutura de Produtos / BOM** (VENT0210).
2. **Tipos de Máquina** (VMAQ0101) e **Máquinas** (VMAQ0200) — os centros de trabalho.
3. **Roteiro de Fabricação** (VPRO0100) — operações, sequência e dependências.
4. **Custo/hora dos centros** e **custo de compra** (VCUS0100) — para o custo padrão.
5. **Almoxarifados** (VENT0800) e saldos de estoque (VEST0100).
6. **Cliente** (VCLI0500) — para o pedido de venda.

---

### Conceitos Fundamentais

| Termo | Significado |
|-------|-------------|
| **Demanda independente** | Necessidade que "nasce" fora da produção (pedido de venda, previsão). Confirmar um pedido gera uma demanda por item automaticamente. |
| **ATP (Available To Promise)** | Disponível para promessa = saldo em mãos − reservas. É o que realmente pode ser prometido a um novo pedido. |
| **Reserva** | Bloqueio lógico do estoque (não baixa o físico). Criada na separação do romaneio ou ao confirmar o pedido. |
| **CPM (Caminho Crítico)** | Cálculo do lead time de fabricação: o tempo do caminho mais lento do roteiro, considerando o que corre em paralelo. |
| **CRP** | Verifica se a fábrica tem **horas** suficientes por centro/dia (capacidade). Só aponta a sobrecarga. |
| **APS** | Sequencia as ordens em capacidade finita e produz o **Gantt** (quando cada operação começa/termina). |
| **Backflush** | Baixa automática dos componentes da BOM ao apontar produção, proporcional à quantidade produzida. |
| **Genealogia de lote** | Rastreabilidade bidirecional: quais OFs consumiram um lote e quais o produziram. |
| **Custo padrão × real** | Padrão = custo *planejado* do item (rollup). Real = custo *incorrido* na OF. A diferença é a **variância**. |

---

### Módulo: Engenharia — Item

---

#### VITM0100 — Item & Prontidão para o MRP

##### Objetivo

Listar os itens cadastrados, criar novos itens pelas **pastas** (PDM, Almoxarifado,
Engenharia, Planejamento, Suprimentos) e, principalmente, **validar se um item está
pronto para participar do MRP/produção/compras**. O item vai da matéria-prima ao
produto final, e cada papel exige configurações diferentes.

##### Conceitos-chave

| Conceito | O que significa |
|----------|-----------------|
| **Natureza** | Item Base (molde de variações), Genérico ou Configurado (gera máscara por atributos/PDM). |
| **PDM** | A descrição técnica é **composta** por Grupo + Modificador + Atributos (ex.: "Chapa Aço Carbono 1020 6,35mm"), não digitada livre. |
| **LLC** | Nível do item na estrutura: **1** = produto final; **2–8** = intermediários; **9** = matéria-prima. Ordena o processamento do MRP. |
| **Tipo MRP** | MRP, Min/Max, Kanban, Ponto de Pedido (ROP), MPS — a política que decide como o item é reposto. |

##### Passo a passo

1. Clique em **Listar** para trazer os itens (filtre por código/descrição).
2. Para cadastrar, use o **Cadastro rápido**: código (opcional), natureza, **grupo/
   modificador** (PDM), UM de estoque, tipo de engenharia, estrutura, **tipo MRP** e
   **LLC**. Clique em **Criar item**.
3. Selecione um item e clique em **Prontidão**: o sistema roda o **checklist de
   ativação** e mostra se o item está ✅ **pronto** ou ⚠️ com **pendências**/**alertas**,
   além da **estrutura (BOM)** do item.

##### O checklist de prontidão

Ao clicar em **Prontidão**, o sistema confere automaticamente se o item tem tudo o que
precisa para participar do planejamento e da produção:

- Item **fabricado** → precisa de **estrutura (BOM)** e **roteiro**.
- Item **comprado** → precisa de **fornecedor preferencial** e recebe um alerta se
  faltar a **conversão de unidade de medida** (necessária quando a UM de compra é
  diferente da UM de estoque).

A verificação **apenas informa** o que está pronto ou pendente — ela **não altera** o
item. Use-a como uma conferência final antes de colocar o item para operar.

##### Observações importantes

- **UM de compra ≠ UM de estoque** (ex.: chapa comprada em KG, estocada em UN): cadastre
  o fator de conversão em **VSUP0110** (Conversão de UM), senão o pedido de compra não
  calcula a quantidade interna.
- **Ponto de pedido (ROP)** = `(TR × CM / CR) + ES` — usado quando o Tipo MRP é Ponto de
  Pedido.
- **Percentual de perda** na estrutura (corte/estampagem) aumenta a necessidade que o
  MRP calcula.

##### Telas relacionadas

- **VENT0210 (Estrutura de Produto)**: cadastra a BOM (pai → filho, quantidade, perda).
- **VSUP0110/0130 (Conversão de UM / Fornecedor Preferencial)**: pré-requisitos de
  compra.
- **VFIS0350 (Classificações Fiscais)**: NCM/IPI vinculados ao item.
- **VMAQ0200 (Máquinas e Tempos)**: tempos por item × máquina (APS/CRP).
- **VMRP0100 (MRP)**: consome o item pronto no cálculo.

---

### Módulo: Planejamento — MRP

---

#### VMRP0100 — MRP (Planejamento de Materiais)

##### Objetivo

Ser o **posto de comando do planejador**: acionar o cálculo do **MRP** (Planejamento
das Necessidades de Materiais), **analisar as sugestões** de ordens que o motor gera e
decidir o que **firmar** (aprovar) ou descartar. O MRP responde: *"o que produzir/
comprar, quanto e até quando, para entregar tudo que foi pedido?"*

> **Importante — o MRP calcula "por baixo dos panos", mas quem decide é uma pessoa.**
> O motor roda o cálculo automaticamente (explode a estrutura, verifica estoque,
> calcula necessidade líquida), porém ele gera **sugestões**, não ordens definitivas. A
> tela existe para o planejador **rever e aprovar** essas sugestões — é o padrão de todo
> ERP sério: *"o MRP propõe, o planejador dispõe"*. Uma sugestão só vira **Ordem
> Planejada** (e, se for produção, **Ordem de Fabricação**) quando você a **firma**.

##### Pré-requisitos

- **Demandas** registradas — pedidos de venda confirmados (VVND0200) geram demanda
  automaticamente, ou demanda independente manual (VPLA0102).
- **Estrutura de Produto / BOM** (VENT0210) e **itens** (VENT0200) com tipo (Fabricado/
  Comprado), lead time, lote mínimo e estoque de segurança configurados.
- Um **plano** de planejamento cadastrado (é o `plano` que o MRP roda).

##### Passo a passo

1. Acesse **VMRP0100 — MRP**. Em **Planos de produção**, **crie um plano** (código +
   nome + modos de planejamento) ou selecione um existente — é o plano que o cálculo roda.
2. Clique em **Rodar MRP**. O motor: tira um *snapshot* do estoque, calcula o **LLC**
   (nível mais baixo de cada item), processa item a item (demanda − estoque − ordens
   abertas = necessidade líquida), aplica as regras do item e **gera as sugestões**.
   O resumo mostra itens processados e ordens geradas.
3. Clique em **Consultar** para carregar as **sugestões**, **exceções** e **ordens
   planejadas**.
4. Na tabela de **Sugestões**, analise cada proposta (item, quantidade, tipo —
   Fabricação/Compra, demanda Independente/Dependente, data de necessidade e de início,
   LLC). Clique em **Firmar** para aprovar: a sugestão vira **Ordem Planejada** real
   (com número); se for **Fabricação**, uma **Ordem de Produção** é criada
   automaticamente.
5. Consulte o **Perfil MRP** de um item (a "tabela MRP" clássica): demanda, ordens
   planejadas, ordens firmes e **estoque projetado** ao longo do horizonte.
6. Veja as **exceções** (ordens atrasadas, compras vencidas, excesso de estoque,
   sobrecarga) e cadastre **regras configuradas** por item (ex.: "se lead_time = 0, usar
   15 dias") sem alterar o cadastro do item.

##### Conceitos-chave

| Termo | Significado |
|-------|-------------|
| **Demanda independente** | O que o cliente pediu (pedido/previsão). É a entrada do MRP. |
| **Demanda dependente** | O que precisa ser feito *por causa* da independente (explosão da BOM). |
| **Necessidade líquida** | Demanda − estoque disponível − ordens já abertas. Se ≤ 0, o MRP não sugere nada. |
| **LLC (Low-Level Code)** | Nível mais fundo em que um item aparece; garante somar toda a demanda dele de uma vez. |
| **Sugestão × Ordem** | O MRP gera **sugestões** (propostas). **Firmar** converte em **Ordem Planejada** real. |
| **Firmar** | Ação irreversível: aprova a sugestão. Ordens firmes passam a contar nos próximos cálculos. |

##### Regras de geração

- Item **Fabricado** + necessidade líquida > 0 → sugere **Ordem de Produção**.
- Item **Comprado** + necessidade líquida > 0 → sugere **Ordem de Compra**.
- **Não gera nada** para: item de terceiro, item tipo MRP = Projeto, estoque
  suficiente, ou item de estrutura Comercial.
- Rodar o MRP de novo **recalcula do zero** as sugestões; **ordens já firmadas não são
  afetadas**.

##### Observações importantes

- O **calendário industrial** (VCAL0100) empurra datas que caem em fim de semana/feriado
  para o próximo dia útil.
- As **regras do item** (lote mínimo, lead time, estoque de segurança) ajustam as
  quantidades e datas das sugestões.

##### Telas relacionadas

- **VVND0200 (Pedido de Venda)**: origem automática da demanda (ao confirmar).
- **VPLA0102 (Demandas Independentes)**: demanda manual/previsão.
- **VENT0210 (Estrutura de Produtos)**: a BOM que o MRP explode.
- **VPRO0900 (Ordem de Produção)**: criada ao firmar uma sugestão de fabricação.
- **VPRO0200/0210 (CRP/APS)**: analisam a capacidade das ordens que o MRP propôs.
- **VPRO0700 (Alertas de Exceções MRP)**: notifica as exceções por webhook/e-mail.

---

### Módulo: Comercial — Pedido de Venda

---

#### VVND0200 — Pedido de Venda

##### Objetivo

Gerir o **pedido de venda** ponta a ponta: cabeçalho (cliente, empresa, moeda,
condição de pagamento), itens (item, quantidade, depósito, preço), e o ciclo de
status **Rascunho (R) → Confirmado (P) → Faturado (F)**, além de **bloqueio** e
**cancelamento**. É o ponto de partida da demanda de produção e de compras.

##### Pré-requisitos

- **Cliente** cadastrado (VCLI0500) e dentro do limite de crédito.
- **Itens** cadastrados (VENT0200) e com saldo/ATP para reserva (VEST0100).
- **Condição de pagamento** (VFIN0110).

##### Passo a passo

1. Acesse **VVND0200 — Pedido de Venda**.
2. Em **Novo pedido**, informe **Empresa**, **Cliente**, **Moeda**, **Condição de
   pagamento** e clique em **Criar pedido** (nasce como **Rascunho / R**).
3. Abra o pedido na lista e adicione **itens** (item, depósito, quantidade, preço,
   desconto). Os totais são calculados pelo sistema.
4. Clique em **Confirmar (→P)**. Isso dispara **três automações** do sistema:
   - **Checagem de crédito** — se o cliente estourar o limite (ou estiver bloqueado),
     o pedido fica **bloqueado** automaticamente, sem gerar demanda nem reserva.
   - **Reserva de estoque (ATP)** — cada linha reserva o disponível no depósito.
   - **Demanda independente** — gera, por item, a necessidade que alimenta o MRP.
5. Se o pedido ficar bloqueado, use **Desbloquear** (após liberar o crédito).
6. O pedido é marcado como **Faturado (F)** automaticamente quando a **NF-e de saída**
   é autorizada (consome as reservas e baixa o estoque).

##### Campos principais

| Campo | Obrigatório | Função |
|-------|-------------|--------|
| Empresa | Sim | Estabelecimento emissor |
| Cliente | Sim | Destinatário do pedido |
| Moeda | Não | Padrão BRL |
| Condição de pagamento | Não | Parcelamento |
| Item / Qtd / Preço | Sim (por item) | Linha do pedido |
| Depósito | Não | Origem da reserva de estoque |

##### Observações importantes

- **Filtros**: liste pedidos por **cliente** ou por **status**.
- Um pedido bloqueado não gera demanda nem reserva — resolva o crédito primeiro.
- **Cancelar** encerra o pedido (libera reservas).

##### Telas relacionadas

- **VEXR0100 (Reprogramação de Entrega)**: remarca datas de entrega do pedido.
- **VVND0100 (Divisão de Vendas)**: organização comercial associável ao pedido.
- **VEST0100 (Estoque)**: origem do ATP reservado.
- **VPRO0900 (Ordem de Produção)**: atende a demanda gerada.

---

### Módulo: Engenharia — Máquinas e Tempos

---

#### VMAQ0101 — Tipos de Máquina

##### Objetivo

Cadastrar as **categorias de equipamento** (corte, dobra, solda, pintura, torno…) que
classificam as máquinas do chão de fábrica. Também define se o tipo **exige operador**
(máquina manual) — o que afeta o cálculo de lead time (CPM) e o sequenciamento (APS).

##### Passo a passo

1. Acesse **VMAQ0101 — Tipos de Máquina** e clique em **Novo Tipo**.
2. Informe **Código**, **Nome** e **Tipo** (CUT, BEND, WELD, ASSEMBLE, PAINT, LATHE,
   MILL, PRESS, INJECTION).
3. Marque **Requer operador** quando for máquina manual (padrão: sim).
4. Salve.

##### Observações importantes

- **Requer operador = verdadeiro** (manual): o sistema **ignora sobreposição
  (overlap)** no roteiro — o operador não abandona uma peça no meio. Isso evita
  subestimar o lead time.
- **Requer operador = falso** (automática): permite overlap entre operações.

##### Telas relacionadas

- **VMAQ0200 (Máquinas e Tempos)**: cada máquina pertence a um tipo.
- **VPRO0100 (Roteiro)**: as operações referenciam centros de trabalho.

---

#### VMAQ0200 — Máquinas, Tempos e Cálculo

##### Objetivo

Cadastrar as **máquinas** (capacidade, unidade, período, eficiência), os **tempos por
item × máquina** (tempo de ciclo, quantidade base, setup, prioridade) e **calcular o
tempo de produção** de uma quantidade — inclusive detectando **gargalo**. Também
registra a **agenda** da máquina (consumida pelo CRP/APS).

##### Pré-requisitos

- **Tipos de máquina** cadastrados (VMAQ0101).

##### Passo a passo

1. Acesse **VMAQ0200**. As máquinas e tipos são carregados automaticamente.
2. Em **Nova máquina**, informe Código, Nome, **Tipo**, Capacidade, **Unidade de
   capacidade** (Peças, Chapas, Kg, T, M, M², M³, Litros, Un) e **Período** (Por
   Minuto, Por Hora, Por Dia) e a **Eficiência** (0–1). Clique em **Criar máquina**.
3. Em **Tempo por item × máquina**, informe Item, Máquina, **Tempo de ciclo**, unidade
   de tempo, **Quantidade base**, **Setup** e **Prioridade** (1 = máquina preferida).
   Esse cadastro é o **coração do cálculo**.
4. Em **Cálculo de tempo de produção**, informe Item, Máquina e Quantidade e clique em
   **Calcular tempo**. O sistema retorna: **ciclos** (arredondados para cima), tempo de
   setup, tempo de produção, total em minutos/horas e se a máquina está em **gargalo**.
5. Em **Agenda da máquina**, registre disponibilidade/paradas por data.

##### Como o cálculo funciona

1. Resolve o tempo pela **variante (máscara)** do item; sem variante, usa o padrão.
2. Normaliza o período para minutos (1 dia = 480 min / 8h).
3. Verifica **compatibilidade de unidade** item × máquina (converte kg↔t, mm↔m, etc.).
4. `ciclos = teto(quantidade ÷ quantidade base)` (arredonda para cima).
5. `tempo total = ciclos × tempo de ciclo + setup` (setup uma vez).
6. Compara a vazão exigida com a **capacidade efetiva** (capacidade × eficiência) →
   sinaliza **gargalo**.

##### Observações importantes

- **Unidades e períodos** usam os valores em português do sistema (Chapas, Peças; Dia,
  Hora, Minuto) — selecione pela lista para evitar erro.
- A **prioridade** decide qual máquina é escolhida quando o item pode ser feito em mais
  de uma (1 = preferida).

##### Telas relacionadas

- **VPRO0100 (Roteiro)**: usa o tempo/ciclo e setup de cada operação.
- **VPRO0200 (CRP)** e **VPRO0210 (APS)**: consomem a capacidade e a agenda.

---

### Módulo: Produção (PCP)

---

#### VPRO0100 — Roteiro de Fabricação

##### Objetivo

Descrever **como** um item é produzido: quais **operações**, em que **sequência**, em
quais **centros de trabalho**, com quais **tempos** e **dependências**. O roteiro é
criado manualmente pelo PCP/engenharia; o MRP, CRP e APS apenas o *leem*. Calcula o
**lead time via CPM** (caminho crítico).

##### Passo a passo

1. **Crie operações genéricas** (biblioteca reutilizável): Nome, **Origem** (Interna =
   gera OF; Externa/Terceiros = gera OS) e tempo padrão.
2. **Crie o roteiro do item**: informe o Item, descrição, alternativa e marque
   **Padrão** (o roteiro que o MRP/CRP usam — apenas um por item).
3. **Adicione operações ao roteiro** com sequência (10, 20, 30…), centro de trabalho e
   tempo.
4. **Defina as dependências** (predecessor → sucessor) com **overlap (%)** — quanto o
   sucessor pode sobrepor o predecessor. `0` = espera terminar 100%.
5. Clique em **Lead time (CPM)** para ver o tempo total e o caminho crítico.

##### Observações importantes

- **Origem** define o tipo de ordem que o MRP gera: Interna → **Ordem de Fabricação**;
  Externa/Terceiros → **Ordem de Serviço**.
- **Máquinas manuais nunca têm overlap válido** — o sistema o ignora e trata como 0,
  evitando lead time subestimado.
- A última operação (que não é predecessora de ninguém) é automaticamente a final.

##### Telas relacionadas

- **VMAQ0200 (Tempos)**: fornece setup e ciclo de cada operação.
- **VPRO0900 (Ordem de Produção)**: a OF explode o roteiro nas operações.

---

#### VPRO0200 — CRP (Capacity Requirements Planning)

##### Objetivo

Responder: **"a fábrica tem horas suficientes para executar as ordens planejadas?"** O
CRP soma as horas exigidas por centro de trabalho por dia e compara com a capacidade
disponível (descontando manutenção preventiva). **Não rearranja** as ordens — só aponta
onde há sobrecarga.

##### Passo a passo

1. Informe o **código do plano** (MRP) e clique em **Calcular CRP**.
2. Veja o resumo: total de registros e quantos centros estão sobrecarregados.
3. Filtre por **Todos** ou apenas **Sobrecarga** para ver `carga %` por centro × dia.
4. Consulte a capacidade de um **centro específico** em um período.

##### Como interpretar

- `carga (%) = horas necessárias ÷ horas disponíveis × 100`. Acima de 100% = sobrecarga.
- **Capacidade nominal** = nº de máquinas ativas do centro × 8h/dia − manutenção do dia.
- O PCP decide: **adiar** ordens, autorizar **hora extra** ou **terceirizar**.

##### Telas relacionadas

- **VPRO0500 (Manutenção Preventiva)**: desconta horas de parada da capacidade.
- **VPRO0210 (APS)**: usa a mesma base de capacidade para sequenciar.

---

#### VPRO0210 — APS (Sequenciamento / Gantt)

##### Objetivo

Responder: **"quando exatamente cada operação começa e termina?"** Enquanto o CRP diz
que um centro está sobrecarregado, o APS distribui as ordens no tempo em **capacidade
finita** (um trabalho por vez por centro) e produz o **Gantt**. Prioriza por **EDD
(Earliest Due Date)** — quem vence antes sai na frente.

##### Passo a passo

1. Clique em **Sequenciar** para gerar o sequenciamento de todas as ordens abertas.
2. Consulte o **Gantt por ordem** (informe o número da OF) ou **por centro de
   trabalho** (informe o centro e o período).
3. Analise os horários (início/fim) e a ocupação de cada centro.

##### Observações importantes

- **Máquinas manuais** recebem uma operação por vez, como qualquer outra (o operador
  termina antes de começar a próxima).
- Se uma operação não couber no dia, vai para o próximo dia útil (fins de semana são
  pulados). `duração = setup + tempo planejado`.

##### Telas relacionadas

- **VPRO0200 (CRP)**: aponta a sobrecarga que o APS tenta acomodar.
- **VPRO0900 (Ordem de Produção)**: as operações sequenciadas são executadas.

---

#### VPRO0900 — Ordem de Produção (OF)

##### Objetivo

Gerir a **Ordem de Produção** no chão de fábrica: ciclo **Aberta → Em produção →
Concluída → Encerrada** (ou Cancelada), com **apontamentos** de produção, **consumo de
insumos** (movimento OUT no estoque), **conclusão** (movimento IN do acabado com lote),
**apuração de custo real** e **retorno de sucata** valorizada.

##### Pré-requisitos

- **Item** com **roteiro** (VPRO0100) e **estrutura** (VENT0210).
- **Insumos** com saldo em estoque (VEST0100).

##### Passo a passo

1. Em **Nova ordem**, informe Item, **Quantidade planejada**, máquina, centro de custo
   e prioridade. Clique em **Criar OF** (nasce **Aberta**).
2. Clique em **Iniciar (→ Em produção)**.
3. **Explodir roteiro** (opcional) traz as operações da OF.
4. **Consumir insumo**: informe Item e Quantidade → gera **OUT** no estoque e alimenta
   o custo real. (Use o campo `consumed_qty`.)
5. **Apontar**: informe quantidade produzida/refugada. Com **backflush**, os
   componentes da BOM são baixados automaticamente.
6. **Concluir (→ Concluída)**: informe o depósito do acabado e o **lote** →
   gera o **IN** do acabado e habilita a **genealogia**.
7. **Apurar custo** e **Encerrar** a OF (o fechamento também apura o custo real
   automaticamente).
8. **Retornar sucata**: registra subproduto valorizado (IN) para reaproveitamento.

##### Automações de estoque

- **Consumo → OUT** do insumo (atualiza saldo e custo médio).
- **Conclusão → IN** do acabado (com lote, se informado).
- **Fechar → apura o custo real** (material + conversão + overhead) e a **variância** vs
  padrão.

##### Observações importantes

- O **material real** vem do custo médio do estoque; a **conversão** vem das horas
  apontadas × custo/hora do centro (VCUS0100).
- A apuração é **idempotente** — reexecutar recalcula a linha única da OF.

##### Telas relacionadas

- **VEST0100 (Estoque)**: recebe os movimentos OUT/IN e o lote.
- **VCUS0100 (Custos)**: fornece o custo/hora dos centros para a apuração.
- **VPRO0300 (Custo Padrão)**: base de comparação para a variância.

---

#### VPRO0300 — Custo Padrão

##### Objetivo

Calcular o **custo de fabricação planejado** de um item — materiais (BOM) + operações
(roteiro × custo/hora) + overhead — com **rollup multinível** (compõe o custo dos
intermediários antes do produto final). É a referência que a Ordem de Produção usa para
medir variâncias.

##### Passo a passo

1. Informe o **item** e clique em **Calcular** (executa o rollup).
2. Veja os componentes: **Material**, **Operação**, **Overhead** e **Total**.
3. Use **Consultar** para recuperar o custo padrão já salvo de um item.

##### Fórmula

```
custo = Σ material(BOM) + Σ (tempo_operação × custo/hora_centro) + overhead
```

##### Telas relacionadas

- **VCUS0100 (Custos)**: cadastra custo/hora dos centros e custo de compra (entradas do
  cálculo). O rollup também está disponível ali.

---

#### VPRO0400 — Qualidade (Pontos de Inspeção)

##### Objetivo

Registrar **pontos de inspeção** ao longo do processo produtivo (Recebimento, Em
processo, Final) e lançar **laudos** (Aprovado / Reprovado / Condicional) com
quantidades inspecionadas, aprovadas e rejeitadas.

##### Passo a passo

1. Clique em **Novo Ponto**, informe Nome, **Tipo** (Recebimento / Em processo /
   Final), Item e (opcional) Operação. Salve.
2. Selecione o ponto e **registre o laudo**: veredito, quantidades e observação.
3. Consulte o histórico de resultados do ponto.

##### Telas relacionadas

- **VPRO0900 (OF)**: a inspeção "Em processo" ocorre após uma operação.
- **VINS0xxx (Inspeção)**: módulo dedicado de ordens de inspeção de recebimento.

---

#### VPRO0500 — Manutenção Preventiva

##### Objetivo

Gerenciar **planos de manutenção** periódica de máquinas/centros e as **ordens**
geradas a partir deles. As horas de parada são **descontadas da capacidade** pelo CRP,
evitando planejar produção em horários de máquina parada.

##### Passo a passo

1. Crie um **plano**: máquina, centro de trabalho, **frequência** (Diária / Semanal /
   Mensal / Personalizada), intervalo em dias e horas estimadas de parada.
2. **Gerar ordens** (por horizonte de dias) cria ordens **Planejadas** de forma
   idempotente (não duplica plano+data).
3. Avance a ordem: **Planejada → Em execução** (registra início) **→ Concluída**
   (registra horas reais e término).

##### Telas relacionadas

- **VPRO0200 (CRP)**: consome as horas de parada como indisponibilidade.

---

#### VPRO0600 — Previsão Estatística

##### Objetivo

Calcular a **previsão de demanda futura** a partir de uma série histórica, escolhendo
automaticamente o **modelo de melhor ajuste** (menor MAPE): Holt-Winters, Suavização
Exponencial, Média Móvel (k=3) ou Média Móvel (k=6).

##### Passo a passo

1. Informe o **item** e a **quantidade de períodos à frente**.
2. Preencha o **histórico** (período e quantidade).
3. Calcule. O sistema retorna o **modelo usado**, o **MAPE** (erro %) e a previsão por
   período.

##### Observações importantes

- A previsão é calculada em tempo real e **não é persistida** automaticamente. Para
  armazenar, use os blocos de previsão de vendas (Planejamento).

##### Telas relacionadas

- **VPRE0xxx (Previsão de Vendas)**: cadastro e geração de previsões de venda.

---

#### VPRO0700 — Alertas de Exceções MRP

##### Objetivo

Consolidar e **notificar** (por **webhook** e/ou **e-mail**) as exceções geradas após o
MRP rodar, para o PCP agir: ordens atrasadas, compras vencidas, excesso de estoque,
ordem aberta sem demanda e sobrecarga de capacidade.

##### Passo a passo

1. Informe o **código do plano** MRP.
2. (Opcional) informe a **URL de webhook** e/ou os **e-mails** de destino.
3. Clique em **Notificar**. O sistema retorna o total de exceções e a lista por tipo.

##### Tipos de exceção

`LATE_ORDER` (ordem vencida), `OVERDUE_PURCHASE` (compra vencida), `EXCESS_STOCK`
(estoque acima do máximo), `OPEN_ORDER_NO_DEMAND` (ordem sem demanda),
`CAPACITY_OVERLOAD` (centro sobrecarregado).

##### Observações importantes

- Os dois canais funcionam juntos. Se o SMTP não estiver configurado, o e-mail é
  ignorado silenciosamente, sem afetar o webhook.

---

#### VPRO0800 — Restrições e Configurador

##### Objetivo

Definir **regras de negócio** que controlam quais combinações de atributos de um item
são válidas (configurador de produto / validação de cadastro). Suporta os operadores
`==`, `!=`, `>`, `<`, `>=`, `<=`, `IN`, `NOT_IN`.

##### Passo a passo

1. **Crie uma restrição** com a condição desejada (atributo, operador, valor).
2. Use **Avaliar** informando um contexto (conjunto de atributos) para testar se a
   combinação é válida.

##### Telas relacionadas

- **VITE0xxx (PDM / Itens Configurados)**: grupos, modificadores e atributos que a
  restrição valida.

---

#### VCUT0100 — Plano de Corte

##### Objetivo

Otimizar o **aproveitamento de matéria-prima** encaixando (*nesting*) as peças
demandadas no estoque disponível, minimizando sobra e sucata. Suporta três tipos de
corte: **linear 1D** (barras, perfis, tubos), **2D guilhotinado** (chapa, painel MDF) e
**true-shape** (irregular, laser/plasma). Ao **firmar**, baixa o estoque, gera
**retalhos reaproveitáveis rastreáveis** (herdando lote/corrida/certificado) e a trilha
de consumo. Exporta o **mapa de corte** (SVG/DXF/PDF) e agenda o corte na máquina.

##### Pré-requisitos

- **Item de matéria-prima** cadastrado (VENT0200) com estoque (VEST0100).
- **Almoxarifado** (VENT0800) — obrigatório informar o **depósito** para poder firmar.

##### Passo a passo

1. Acesse **VCUT0100 — Plano de Corte** e clique em **Listar** (carrega planos e os
   padrões da empresa).
2. Em **Novo plano**, informe a **matéria-prima**, o **tipo de corte** (1D/2D/
   true-shape), **kerf** (espessura da serra), **refile** (aparo da cabeça da barra),
   **sobra mínima** (a partir da qual a sobra vira retalho reaproveitável), a **UoM de
   estoque** e o **depósito**. Clique em **Criar plano** (nasce **Rascunho**).
3. **Demanda / peças**: adicione as peças a cortar — comprimento (1D) ou largura×altura
   (2D) e quantidade.
4. **Estoque disponível**: adicione as peças de estoque (cada uma com seu tamanho); marque
   **retalho** quando for sobra reaproveitada. (Ou marque **semear retalhos** no cadastro
   para o sistema puxar os retalhos do inventário automaticamente.)
5. Clique em **Otimizar**. O sistema calcula os **padrões de corte** (layout repetido N
   vezes), o **aproveitamento** (%), a **sucata** e lista peças **sem encaixe**.
6. Revise os padrões (posição de cada peça ao longo da barra/chapa).
7. Clique em **Firmar (baixa)** para consumir o estoque de verdade (gera os retalhos e a
   trilha de consumo). O plano passa a **Firmado**.
8. **Programa** mostra a sequência de cortes; **Agendar** leva o corte à agenda da
   máquina; **SVG/DXF/PDF** baixam o mapa para a seccionadora/CAM.

##### Conceitos

| Termo | Significado |
|-------|-------------|
| **Kerf** | Material perdido na espessura da serra entre dois cortes. |
| **Refile (trim)** | Aparo removido da cabeça da barra/chapa antes do primeiro corte. |
| **Retalho** | Sobra ≥ sobra mínima — volta ao estoque como material reaproveitável, com rastreabilidade. |
| **Aproveitamento** | Demanda ÷ estoque consumido. Inclui a sobra da última barra (que pode virar retalho). |
| **Sucata** | Perda real (exclui o retalho reaproveitável) — vira custo. |
| **Status** | Rascunho → Otimizado → Firmado → Em execução → Concluído. |

##### Observações importantes

- **Materiais diferentes são planos diferentes** — cada plano corta um único item de
  matéria-prima. O estoque é heterogêneo (cada peça tem seu comprimento).
- **Firmar exige depósito** no plano (ou depósito padrão nos parâmetros da empresa).
- **Modo de consumo** (padrão da empresa): **Automático (FIFO)** baixa da corrida mais
  antiga; **Manual** usa o lote atribuído.
- Peças maiores que qualquer estoque ficam **sem encaixe** (aviso ao operador).

##### Telas relacionadas

- **VEST0100 (Estoque)**: origem do estoque e destino dos retalhos.
- **VPRO0900 (Ordem de Produção)**: a baixa do corte pode referenciar a OP; o custo é
  rateado por ordem.
- **VMAQ0200 (Máquinas)**: a agenda do corte entra no calendário da máquina (CRP/APS).

---

### Módulo: Custos

---

#### VCUS0100 — Custos (Centro, Compra, Alocação e Overhead)

##### Objetivo

Manter as **entradas do custo padrão** e o **rateio de indiretos**: **custo/hora** por
centro de trabalho, **custo de compra** por item, **bases de alocação** (critério de
rateio) e **alocações de overhead**. Também permite recalcular o **rollup** do custo
padrão de um item.

##### Passo a passo

1. **Custo/hora por centro de trabalho**: informe o centro e o valor/hora e salve. É
   usado na apuração da mão-de-obra real da OF.
2. **Custo de compra por item**: informe o item e o custo (entra no material do custo
   padrão de itens comprados).
3. **Base de alocação**: cadastre o critério de rateio (código, descrição, período).
4. **Alocação de overhead**: distribui os indiretos usando a base escolhida (centro de
   custo, base, taxa %).
5. **Rollup**: informe um item e recalcule o custo padrão (Material / Operação / Total).

##### Observações importantes

- Os custos de centro e de compra alimentam diretamente a **fórmula do custo padrão**
  (VPRO0300) e a **apuração real** da OF (VPRO0900).

##### Telas relacionadas

- **VPRO0300 (Custo Padrão)** · **VPRO0900 (OF — custo real)** · **VCTB0102 (Centro de
  Custo)**.

---

### Módulo: Estoque / Almoxarifado

---

#### VEST0100 — Estoque (Movimentos, Saldos, ATP, Reservas, Lotes)

##### Objetivo

Central operacional do estoque: **lançar movimentos** (entrada/saída/transferência/
ajuste), consultar **saldos** e o **ATP** (disponível para promessa), criar e gerenciar
**reservas**, registrar **lotes** com rastreabilidade (**genealogia**) e acompanhar o
**consumo médio mensal** (ponto de reposição).

##### Passo a passo

1. Informe um **item** e clique em **Consultar** — o sistema traz movimentos, saldos por
   depósito, o painel **ATP** (Em mãos / Reservado / Disponível) e os lotes.
2. **Lançar movimento**: item, depósito, **tipo** (IN, OUT, TRANSFER_IN/OUT, ADJUST),
   quantidade, preço e lote. O saldo e o **custo médio ponderado** são atualizados na
   mesma transação.
3. **Reservas**: crie uma reserva (reduz o ATP) e depois **Libere** ou **Consuma** por
   ID.
4. **Lotes**: registre um lote (corrida/heat, certificado) e clique em **Genealogia**
   para ver o histórico bidirecional (OFs que consumiram × produziram o lote).
5. **Consumo médio (ROP)**: clique em **Recalcular** para atualizar a média móvel
   (padrão 6 meses) usada no ponto de reposição.

##### Conceitos

- **ATP = saldo em mãos − reservas.** Confirmar um pedido de venda reserva o disponível
  automaticamente, mantendo o ATP consistente.
- Todo movimento com **lote** atualiza o saldo segregado por lote.

##### Telas relacionadas

- **VVND0200 (Pedido de Venda)**: reserva o ATP ao confirmar.
- **VPRO0900 (OF)**: gera OUT (consumo) e IN (conclusão com lote).
- **VEXP0100 (Romaneio)**: reserva na separação e consome no despacho.
- **VEST0200 (Inventário)**: ajusta divergências de saldo.

---

#### VEST0200 — Inventário e Tipos de Movimento

##### Objetivo

Conduzir o **inventário** físico (criar → contar → ajustar → fechar) e manter os
**tipos de movimento** (classificação, com sigla, de cada lançamento de estoque).

##### Passo a passo (inventário)

1. Clique em **Carregar**. Em **Novo inventário**, informe o depósito e a descrição →
   nasce **Aberto (OPEN)**.
2. Abra o inventário e **registre contagens** por item/depósito (quantidade contada).
3. **Ajuste** as diferenças por item — cada ajuste gera um **movimento de acerto** de
   saldo.
4. **Feche** o inventário quando terminar.

##### Passo a passo (tipos de movimento)

- Cadastre com **Sigla** e **Descrição** (e tipo IN/OUT). São usados para classificar
  os lançamentos no VEST0100.

##### Telas relacionadas

- **VEST0100 (Estoque)**: o ajuste do inventário atualiza os saldos.

---

#### VEXP0100 — Expedição / Romaneio

##### Objetivo

Documento **logístico** de saída (*packing list* / *delivery note*) no padrão de um
*outbound delivery* de ERP de ponta: **separação → conferência → packing em volumes →
despacho**, com **reserva de estoque**, **dados de transporte**, **vínculo com a NF-e**,
**auditoria** e **exportação profissional (PDF/Excel)**. Atende pedidos de **venda**,
**compra** (devolução) e **produção** (movimentação de acabados).

##### Pré-requisitos

- **Pedido de origem** (venda/compra/produção) e itens com saldo/ATP.

##### Passo a passo

1. **Auto-fill**: informe o código do **pedido de venda** e clique em **Gerar** — o
   romaneio nasce **Aberto** já com os itens do pedido. (Ou crie manualmente.)
2. **Separar (reserva)**: reserva o estoque dos itens (Aberto → Separado).
3. **Conferir itens**: registre a quantidade conferida de cada item. Sobra/falta gera
   **divergência** (`⚠️`), que bloqueia o despacho salvo aceite explícito.
4. **Conferir romaneio** (exige todos os itens conferidos): Separado → Conferido.
5. **Packing**: adicione **volumes** (espécie: Caixa, Pallet, Fardo… com peso e
   dimensões; a cubagem é calculada de L×A×C).
6. **Transporte**: informe modalidade de frete (CIF/FOB/…), valor, placa, motorista,
   ANTT, lacres e previsão de entrega.
7. Emita a **NF-e de saída** (módulo fiscal) e **Vincule a NF-e** ao romaneio.
8. **Despachar** (Conferido → Expedido): consome as reservas (a NF-e faz a baixa real).
   Se houver divergência, marque **aceitar divergência**.
9. **Exporte** o romaneio em **PDF** ou **Excel**.

##### Ciclo de vida

```
OPEN ──separar──► SEPARATED ──conferir──► CONFERRED ──despachar──► SHIPPED
  │  (reserva)         │  (todos itens)        │  (sem divergência
  └──────────────── CANCELLED (libera reservas) ─────── ou aceite)
```

##### Observações importantes

- **O romaneio reserva; a NF-e baixa.** A reserva reduz o disponível (ATP); o físico só
  cai na autorização da NF-e de saída.
- A **trilha de auditoria** registra cada transição (Criado, Separado, Conferido,
  Despachado, Cancelado, NF-e vinculada).
- **Divergência** = quantidade conferida ≠ planejada. Bloqueia o despacho até o aceite.

##### Telas relacionadas

- **VVND0200 (Pedido de Venda)**: origem do romaneio (auto-fill).
- **VEST0100 (Estoque)**: reserva/consumo do estoque.
- **VFIS0200 (NF-e de Saída)**: baixa fiscal e vínculo.
- **VENT0800 (Almoxarifado)**: depósito de expedição.

---

### Perguntas Frequentes (PCP & Estoque)

**Confirmei o pedido e ele ficou "bloqueado". Por quê?**
A checagem de crédito estourou o limite do cliente (ou o cliente está bloqueado).
Libere o crédito e use **Desbloquear** na VVND0200. Enquanto bloqueado, o pedido não
gera demanda nem reserva.

**Qual a diferença entre CRP e APS?**
O CRP diz *se* há capacidade (carga % por centro/dia); o APS diz *quando* cada operação
acontece (Gantt, hora a hora). Rode o CRP para achar gargalos e o APS para sequenciar.

**Por que o ATP é menor que o saldo?**
Porque há **reservas** ativas (pedidos confirmados / romaneios separados). ATP = saldo −
reservas. É o que realmente pode ser prometido.

**O custo real da OF veio zerado.**
Verifique se houve **consumo** de insumos (campo correto: quantidade consumida) e se os
centros têm **custo/hora** cadastrado (VCUS0100). O fechamento apura o custo.

**Cancelei um romaneio — o estoque voltou?**
Sim. Cancelar **libera as reservas**. O físico só teria sido baixado pela NF-e.

---

> **Fim do Processo PCP, Chão de Fábrica, Estoque e Custos.**
> Documentação atualizada em Junho 2026.

---

## Processo Suprimento e Compras

> Documentação do módulo de **Suprimento**: cadastro de fornecedor/transportadora,
> cadastros mestres de compra (conversão de UM, tabela de preço, fornecedor
> preferencial) e o ciclo de aquisição (solicitação → cotação → pedido de compra),
> integrado ao MRP.
> Total de telas deste processo: **8**.
> Última atualização: Junho 2026.

---

### Visão Geral do Processo

O suprimento garante que a fábrica tenha os materiais certos, do fornecedor certo, no
prazo certo. A necessidade nasce do **MRP** (sugestões de compra) ou de uma
**solicitação** manual; passa (opcionalmente) por uma **cotação** para escolher o
melhor preço; e vira um **pedido de compra** enviado ao fornecedor. Os cadastros de
apoio (fornecedor, conversão de UM, tabela de preço, fornecedor preferencial) alimentam
o pedido com dados automáticos (condição de pagamento, preço, %IPI, UM interna).

#### Fluxo macro

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

---

### Módulo: Cadastro de Fornecedor

---

#### VSUP0500 — Cadastro de Fornecedor

##### Objetivo

Cadastrar **fornecedores e transportadoras** com todos os dados fiscais e comerciais,
organizados em **pastas** (endereço, telefones, e-mails, vencimentos, contatos,
empresas). Reaproveita condição de pagamento, transportadora e região do módulo de
Cliente. Alimenta o Pedido de Compra e a NF de entrada com defaults automáticos.

##### Pré-requisitos

- **Tipos de fornecedor** cadastrados (VSUP0510) — obrigatório para criar o fornecedor.

##### Passo a passo

1. Acesse **VSUP0500** e clique em **Novo**.
2. Na aba **Dados**, informe **Razão social**, tipo de pessoa (Jurídica/Física),
   **CNPJ/CPF** (com validação de dígito), **Inscrição Estadual**, **Tipo de
   fornecedor**, **Tipo de frete** e **Contribuinte de ICMS**. Use **🔎 CNPJ** para
   pré-preencher pela Receita.
3. Preencha o **Endereço** (a UF do endereço é usada na consulta SEFAZ).
4. Nas pastas, adicione **telefones**, **e-mails**, **vencimentos** (condições de
   pagamento), **contatos** e o **vínculo por empresa** (conta financeira, IPI, tipo de
   NF, tabela de preço de compra).
5. Salve. Use **Bloquear/Desbloquear** para controlar a situação de faturamento.
6. **Consulta SEFAZ** grava a situação cadastral (Liberado/Bloqueado) no fornecedor.

##### Regras de negócio

- **Inscrição Estadual obrigatória**, exceto para transportadoras (kind
  `TRANSPORTADORA`/`TRANSP_REDESP`/`REDESPACHO`).
- **MEI** não pode ser marcado para Pessoa Física.
- **Registro M.A.** (Ministério da Agricultura) deve seguir o formato `AA-99999-9`.
- **Documento duplicado** → o sistema retorna conflito indicando o fornecedor existente.

##### Observações importantes

- Diferente do cliente, o fornecedor **tem atualização** (edição do cadastro).
- O **provider de defaults** (condição de pagamento, tipo de frete, conta financeira,
  tabela de preço) é consumido automaticamente pelo Pedido de Compra.
- Exportação da lista em **Excel/PDF/CSV**.

##### Telas relacionadas

- **VSUP0510 (Apoio de Fornecedores)**: tipos e parâmetros.
- **VSUP0200 (Pedido de Compra)**: usa os defaults do fornecedor.
- **VFIS0210 (NF-e de Entrada)**: casa o CNPJ do emitente ao fornecedor.

---

#### VSUP0510 — Apoio de Fornecedores

##### Objetivo

Manter os cadastros de apoio do fornecedor: **Tipos de Fornecedor** (com o `kind` que
controla a obrigatoriedade da IE), **Tipos de Contato** e os **Parâmetros por empresa**
(10 parâmetros que governam o comportamento do módulo).

##### Passo a passo

1. Aba **Tipos**: cadastre tipos de fornecedor informando descrição e **kind** (Normal,
   Transportadora, Transp. Redespacho, Redespacho).
2. Aba **Contatos**: cadastre os tipos de contato (Comprador, Gerente…).
3. Aba **Parâmetros**: por empresa, defina conta financeira default, se exige conta,
   homologação default, **data base padrão para vencimentos** (Emissão/Entrada/
   Digitação), fornecedor genérico da NF-e, etc.

##### Telas relacionadas

- **VSUP0500 (Cadastro de Fornecedor)**: consome estes apoios.

---

### Módulo: Cadastros Mestres de Compra

---

#### VSUP0110 — Conversão de UM por Item

##### Objetivo

Cadastrar **fatores de conversão** entre unidades de medida de um item (ex.: `1 CX = 12
UN`), usado quando a UM de compra difere da UM de estoque. O Pedido de Compra usa isso
para calcular UM interna, quantidade interna e preço interno.

##### Passo a passo

1. Informe o **item** e clique em **Carregar** para ver as conversões existentes.
2. Cadastre uma conversão: **De** (UM origem), **Para** (UM destino) e o **fator**.
3. Use o bloco **Converter** para testar: informe De/Para/Quantidade e veja o resultado
   (o sistema tenta a conversão direta; se ausente, usa a inversa `1/fator`).

##### Observações importantes

- Sem cadastro de conversão para a UM da pasta Estoque, o Pedido de Compra orienta a
  abrir esta tela.

---

#### VSUP0120 — Tabela de Preço de Compra

##### Objetivo

Cadastrar **tabelas de preço de compra** (cabeçalho com código, descrição, moeda e
vigência) e seus **itens** (preço por item, com UM e quantidade mínima). O preço pode
ser **genérico** (qualquer fornecedor) ou **específico por fornecedor**.

##### Passo a passo

1. Crie a **tabela** (descrição, moeda, vigência).
2. Selecione a tabela e adicione **itens**: item, preço, UM, quantidade mínima e,
   opcionalmente, o fornecedor específico.

##### Observações importantes

- É o **1º nível** da hierarquia de preço do Pedido de Compra (prefere o preço
  específico do fornecedor, cai para o genérico).

---

#### VSUP0130 — Fornecedor Preferencial por Item

##### Objetivo

Vincular um **item** a **fornecedores** com **ranking** de preferência. Também guarda o
código, a descrição e a UM do item **no fornecedor**, além do lead time. O sistema
usa o fornecedor de menor ranking ao gerar pedidos a partir de solicitações.

##### Passo a passo

1. Informe o **item** e carregue os vínculos.
2. Cadastre um fornecedor com **ranking** (1 = preferido), código/descrição/UM do item
   no fornecedor e **lead time** em dias.

##### Telas relacionadas

- **VSUP0300 (Solicitação)**: sugere o fornecedor preferencial na geração de pedidos.

---

### Módulo: Ciclo de Aquisição

---

#### VSUP0200 — Pedido de Compra

##### Objetivo

Gerir o **pedido de compra** (capa + itens) enviado ao fornecedor, e **aprovar/rejeitar
as sugestões de compra** geradas pelo MRP. Ao adicionar um item, o backend resolve
automaticamente **preço** (tabela), **%IPI** (classificação fiscal) e **UM interna**
(conversões).

##### Pré-requisitos

- **Fornecedor** cadastrado (VSUP0500); itens (VENT0200).

##### Passo a passo

1. Aba **Pedidos**: crie a capa (empresa, **fornecedor**, moeda, tipo de frete). Se não
   informar a condição de pagamento, ela vem dos **defaults do fornecedor**.
2. Abra o pedido e **adicione itens** (item, quantidade, preço). Preço/IPI/UM são
   resolvidos pelo sistema.
3. **Cancele** o pedido quando necessário.
4. Aba **Sugestões**: veja as sugestões do MRP e **Aprove** (informando fornecedor e
   preço → gera um pedido de compra firme) ou **Rejeite**.

##### Observações importantes

- Aprovar uma sugestão gera um `purchase_order` (origem MRP) e torna a ordem planejada
  firme — só suprimentos firmes entram no *netting* do MRP.

##### Telas relacionadas

- **VMRP0100 (MRP)**: origem das sugestões de compra.
- **VSUP0500 (Fornecedor)**: defaults de condição/frete/conta.

---

#### VSUP0300 — Solicitação de Compra

##### Objetivo

Registrar **solicitações de compra** (cabeçalho + itens com quantidade, UM, preço
sugerido) e **gerar pedidos de compra** a partir delas, agrupando por fornecedor. O
**saldo** do item = quantidade − atendida − cancelada; o status evolui Aberto →
Parcial → Atendido.

##### Passo a passo

1. Crie a solicitação (empresa, solicitante) com um ou mais **itens**.
2. Abra a solicitação e adicione itens, se necessário.
3. Em **Gerar pedidos**, informe a **quantidade a atender** e (opcional) o **fornecedor**
   de cada item — sem fornecedor, usa o **preferencial** (VSUP0130). O sistema agrupa por
   fornecedor e gera um pedido por grupo, registrando o atendimento de volta na
   solicitação.

##### Telas relacionadas

- **VSUP0130 (Fornecedor Preferencial)**: resolve o fornecedor de cada item.
- **VSUP0200 (Pedido de Compra)**: destino da geração.

---

#### VSUP0400 — Cotação de Compra

##### Objetivo

Conduzir a **cotação**: liberar itens (de solicitações ou ordens planejadas) para
cotação, convidar fornecedores, **registrar os preços** de cada um, **selecionar o
vencedor** por item e **gerar os pedidos** a partir das seleções.

##### Passo a passo

1. **Crie a cotação** informando os itens (IDs de itens de solicitação e/ou códigos de
   ordens planejadas) e os **fornecedores convidados**.
2. Abra a cotação e **convide** mais fornecedores, se necessário.
3. **Registre os preços** por item × fornecedor (preço, lead time, condição de
   pagamento). A cotação passa a *Cotada*.
4. **Selecione** o preço vencedor de cada item.
5. **Gere os pedidos**: agrupa os preços selecionados por fornecedor, cria um pedido por
   fornecedor e registra o atendimento nas solicitações de origem.

##### Telas relacionadas

- **VSUP0300 (Solicitação)**: origem dos itens de cotação.
- **VSUP0200 (Pedido de Compra)**: resultado da cotação.

---

### Perguntas Frequentes (Suprimento)

**Criei o fornecedor e deu erro de "tipo inválido".**
Cadastre primeiro um **Tipo de Fornecedor** na VSUP0510 — o cadastro exige um tipo
válido.

**O preço do item do pedido veio automático. De onde?**
Da **Tabela de Preço de Compra** (VSUP0120), preferindo o preço específico do
fornecedor. O %IPI vem da classificação fiscal e a UM interna das conversões (VSUP0110).

**Qual a diferença entre Solicitação e Cotação?**
A **solicitação** é o pedido interno de compra (o que preciso). A **cotação** é o
processo de comparar preços de vários fornecedores antes de comprar. Ambas geram
**pedidos de compra** ao final.

**A sugestão do MRP virou pedido sozinha?**
Não — o MRP **sugere**; o comprador **aprova** na aba Sugestões da VSUP0200 (informando
fornecedor e preço). Só então vira pedido firme.

---

> **Fim do Processo Suprimento e Compras.**
> Documentação atualizada em Junho 2026.

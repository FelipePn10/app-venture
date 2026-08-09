# DIA 4 — GIRO & RETAGUARDA · Apostila do Participante

**ERP Venture · Treinamento para Indústria Metalúrgica**
*Comercial, Expedição, Custo/Precificação, Fiscal, Financeiro e Contabilidade*

---

## Antes de começar

**O que você vai saber fazer no fim do dia:**

✅ Cadastrar **cliente** com dados fiscais e limite de crédito
✅ Formar **preço** com margem, a partir do custo real da produção
✅ Criar **orçamento**, converter em **pedido de venda** e confirmá-lo
✅ Separar, conferir e **despachar** um romaneio
✅ Emitir e **autorizar a NF-e** de saída — e tratar rejeição
✅ Localizar o **título a receber**, dar **baixa** e ler o **fluxo de caixa**

> **Onde estamos:** `Cadastros → Engenharia → Suprimentos+Estoque → PCP → Produção → [VENDAS → FISCAL → FINANCEIRO]`

**É o dia que fecha a corrente.**

---

## ⚠️ Aviso antes de emitir qualquer nota

O sistema tem **dois ambientes fiscais**:

| Ambiente | O que significa |
|:--|:--|
| **Homologação** | Ambiente de teste. É onde estamos hoje |
| **Produção** | A nota é **real** e tem valor jurídico |

> **Conferir o ambiente é a primeira coisa a fazer antes de emitir.**
> Nota emitida em Produção por engano precisa ser cancelada em ~24 horas — e cancelamento fora do prazo a SEFAZ rejeita.

O ambiente ativo aparece no **rodapé da tela `VFIS0100`**.

---

## Índice

| Parte | Conteúdo |
|:-:|:--|
| 1 | [As 3 travessias do dia](#parte-1--as-3-travessias-do-dia) |
| 2 | [Cadastro de Cliente](#parte-2--cadastro-de-cliente) |
| 3 | [Restrições de venda e frete](#parte-3--restrições-de-venda-e-frete) |
| 4 | [Custo e precificação](#parte-4--custo-e-precificação) |
| 5 | [Orçamento de Venda](#parte-5--orçamento-de-venda) |
| 6 | [Pedido de Venda](#parte-6--pedido-de-venda) |
| 7 | [Organização comercial e pós-venda](#parte-7--organização-comercial-e-pós-venda) |
| 8 | [Expedição / Romaneio](#parte-8--expedição--romaneio) |
| 9 | [Fiscal — a base](#parte-9--fiscal--a-base) |
| 10 | [Fiscal — NF-e de Saída](#parte-10--fiscal--nf-e-de-saída) |
| 11 | [Fiscal — emissão complementar](#parte-11--fiscal--emissão-complementar) |
| 12 | [Financeiro](#parte-12--financeiro) |
| 13 | [Apuração, conciliação, SPED e contabilidade](#parte-13--apuração-conciliação-sped-e-contabilidade) |
| 14 | [Exercícios do dia](#parte-14--exercícios-do-dia) |
| 15 | [Erros comuns](#parte-15--erros-comuns-e-como-resolver) |
| 16 | [Cola rápida](#parte-16--cola-rápida--os-códigos-do-dia-4) |
| 17 | [Glossário](#parte-17--glossário) |
| 18 | [A corrente completa dos 4 dias](#parte-18--a-corrente-completa-dos-4-dias) |

---

# PARTE 1 — As 3 travessias do dia

```
VENDAS     →  transforma PRODUTO em RECEITA
FISCAL     →  transforma RECEITA em NOTA
FINANCEIRO →  transforma NOTA em CAIXA
```

## O mapa do dia

```
CLIENTE ──▶ PREÇO ──▶ ORÇAMENTO ──▶ PEDIDO ──▶ ROMANEIO ──▶ NF-e ──▶ TÍTULO ──▶ CAIXA
VCLI0500   VCST0202   VVND0300     VVND0200   VEXP0100    VFIS0200  VFIN0210  VFIN0300
"quem"     "quanto"   "proposta"   "vendido"  "separado"  "faturado" "a receber" "recebido"
```

## A mensagem do dia

> **Vender é fácil; vender pelo preço certo, faturar sem erro e receber no prazo é o que mantém a fábrica viva.**

---

# PARTE 2 — Cadastro de Cliente

## 2.1 Os apoios primeiro ⚠️

Sem estes cadastros, o cliente não fecha:

| Tela | O que cadastrar |
|:--|:--|
| `VCLI0510` (Básico) | **Região** (UF + Cidade) · **Segmento** (com hierarquia e retenção de PIS/COFINS) · **Tipo Contato** · **Tipo Cliente** (código, descrição, categoria `NORMAL`/`CONSUMIDOR`, dias de entrega) · **Portador** · **Grupo de Portadores** |
| `VCLI0520` (Comercial) | **Condições de Pagamento** · **Tabelas de Venda** |
| `VCLI0530` (Fiscal) | **Tipos de NF de Saída** · **Tipos de Imposto** |
| `VUTL0555` / `VLOC0100` | Países, UFs e Cidades |

---

## 2.2 `VCLI0500` — Cadastro de Cliente

**3 abas: Dados · Endereços · Contatos.**

### Aba **Dados** — identificação

| Campo | Obrig. | O que preencher |
|:--|:-:|:--|
| **Código** | auto | Gerado ao salvar; somente leitura na edição |
| **Razão Social / Nome** | ✅ | |
| Nome Fantasia | | Nome comercial |
| **Tipo Documento** | ✅ | `CNPJ` (PJ) ou `CPF` (PF) |
| **Documento** | ✅ | ⭐ **Validação de dígito verificador em tempo real** |
| Inscrição Estadual | | Contribuintes de ICMS |
| Inscrição Municipal | | Prestadores de serviço |
| **Código SUFRAMA** | | Zona Franca de Manaus |
| **Corporate (Matriz/Filial)** | | Toggle |
| **Matriz** | ✅ se filial | ⚠️ **Filial DEVE ter matriz — e a matriz precisa existir antes** |

### Aba **Dados** — classificação comercial

Região · Segmento de Mercado · Tipo Cliente · **Condição de Pagamento** · **Tabela de Venda** · Transportadora · Grupo Transportadora · **Tipo de Nota Fiscal** · **Tipo de Imposto**

### Aba **Dados** — parâmetros comerciais

| Campo | O que faz |
|:--|:--|
| **Visibilidade Cond. Pagto** | `Somente Vinculados` restringe · `Todos` libera qualquer condição |
| ⭐ **Limite de Crédito** | Valor máximo em R$. Vendas que excedam podem ser **bloqueadas** |
| ⭐ **Bloqueado** | Toggle que **impede novos pedidos** |
| Website | |

> ## ⚠️ Cliente SEM limite não é cliente seguro
>
> Clientes **sem limite definido** (zero ou nulo) **não sofrem restrição nenhuma**.
> Deixar em branco é **"liberado por padrão"**, não "seguro por padrão".

### Aba **Endereços** — adicione ao menos um

**Tipo** (`Cobrança` / `Entrega` / `Faturamento`) · CEP · Logradouro · Número · Bairro · Cidade · UF · País · marcar um como **padrão**.

⭐ Cada cliente pode ter **vários endereços de cada tipo** — permite múltiplos endereços de entrega (filiais do cliente) sob um mesmo cadastro.

### Aba **Contatos**

Tipo · Nome · E-mail · Telefone · Celular · Cargo · **Primário**.

### ⚠️ Três regras que geram dúvida

1. **Cliente bloqueado não pode ter novos pedidos** — mas os **pedidos já existentes não são afetados**.
2. Alterar a **Condição de Pagamento** ou a **Tabela de Venda** padrão **não afeta pedidos já criados** — só os novos.
3. **Documento inválido é rejeitado** — a validação é módulo 11.

✍️ **Anote o padrão de código de cliente da sua empresa:**
```
_________________________________________________________
```

---

# PARTE 3 — Restrições de venda e frete

## 3.1 `VCLI0117` — Permissões e Restrições de Venda

**O que faz:** controla **quais itens ou classificações** podem (Permissão) ou não podem (Restrição) ser vendidos para determinados clientes, estabelecimentos ou representantes.

### Passo a passo
1. **Filtros / escopo:** **Cliente** (obrigatório) · Estab. Faturamento (opcional) · Representante (opcional).
2. Escolha a aba **Itens** (produto por produto) ou **Classificação** (categoria inteira).
3. **Adicionar** → Item ou Classificação · **Tipo Regra** (`Permissão` / `Restrição`) · **Data Início/Fim** de vigência · **Motivo**.
4. **Salvar**.

### ⭐ A lógica

```
SEM regras         →  TODOS os itens são vendáveis
COM Permissões     →  APENAS os listados são liberados  (whitelist)
COM Restrições     →  Os listados são bloqueados        (blacklist)

RESTRIÇÕES PREVALECEM SOBRE PERMISSÕES
```

⭐ **Escopo por Classificação** aplica a regra a **todos os itens da categoria** — presentes **e futuros**.
⚠️ O sistema consulta estas regras **automaticamente durante a criação do pedido**.

---

## 3.2 `VCLI0202` — Políticas de Frete por Cliente

Faixas de valor com percentuais progressivos ou regressivos.

| Campo | Obrig. |
|:--|:-:|
| Cliente | ✅ |
| Estabelecimento (vazio = todos) | |
| **Valor Inicial** / **Valor Final** | ✅ |
| **Percentual Frete (%)** | ✅ |

⚠️ **Validação:** `Valor Final > Valor Inicial` e `Percentual > 0`.
⚠️ **Faixas sem sobreposição** — use faixas contíguas.

**Exemplo:**

| Valor Inicial | Valor Final | % Frete |
|:-:|:-:|:-:|
| 0,00 | 5.000,00 | 5,0 |
| 5.000,01 | 20.000,00 | 3,5 |
| 20.000,01 | 100.000,00 | 2,0 |

## 3.3 Políticas comerciais

| Tela | O que faz |
|:--|:--|
| `VPDV0108` | Política Comercial de **Descontos** |
| `VPDV0111` | Política Comercial de **Fretes** |

> ⚠️ **Uma política que exija aprovação bloqueia o orçamento automaticamente** quando as condições são atingidas.

---

# PARTE 4 — Custo e precificação

## 4.1 De onde vem o custo

```
Apontamentos do Dia 3  →  Custo real da OF  →  Custo padrão (VPRO0300)
        +
Custo/hora dos centros (VCUS0100)
        ↓
              PREÇO DE VENDA (VCST0202)
```

> **Sem o custo do chão, precificar é apostar.**

## 4.2 `VCUS0100` — Custos (as entradas)

| Bloco | O que cadastra |
|:--|:--|
| **Custo/hora** por centro de trabalho | Alimenta a conversão da OF e o custo padrão |
| **Custo de compra** por item | Entrada de material |
| **Bases de alocação** | Critério de rateio |
| **Alocações de overhead** | Indiretos |
| **Rollup** | Recalcula o custo padrão de um item |

---

## 4.3 `VCST0202` — Precificação de Produtos ⭐

### As 3 grandes áreas

| Área | O que faz |
|:--|:--|
| **Tabelas & Preços** | Cria a tabela de venda (validade, formação, casas decimais, composição FOB/CIF, tolerâncias) e mantém os preços por item |
| **Formação de Preço** | Calcula o **preço sugerido** a partir de custo + margem/impostos (ou de uma política) e **gera preços em lote** |
| **Políticas** | Políticas de formação (fonte de custo, margem, impostos, comissão) |

### Fluxo operacional

A tela tem **três visões**, alternadas pelos botões da barra superior:
**Tabelas & Preços**, **Formação de Preço** e **Políticas**.

**1. Visão Tabelas & Preços**
**Nova tabela** → **Descrição**, **validade**, **Formação** (`INFORMADO` = você
digita o preço · `FORMADO` = o sistema calcula), casas decimais e composição
FOB/CIF → Salvar. Depois, com a tabela selecionada, adicione os **preços por
item** (item, preço, UM de estoque e de compra, situação).

**2. Visão Políticas** *(opcional, mas faça antes se for usar formação automática)*
Cadastre a política: **fonte de custo**, **margem**, **impostos** e **comissão**.
É ela que a formação de preço usa para não obrigar você a digitar margem item a item.

**3. Visão Formação de Preço**
Informe **tabela de venda**, **item**, **custo base**, **margem %** e **impostos %**
(ou aponte uma **política**) → o sistema devolve o **preço sugerido**. Dá para
**gerar preços em lote** para a tabela inteira.

### ⭐ A fórmula da margem

```
Margem (%) = (Preço Venda − Custo) / Preço Venda × 100
```

> ⚠️ **A margem é sobre o PREÇO DE VENDA, não sobre o custo.**
>
> Muita gente confunde markup com margem e vende achando que ganha 30% quando ganha 23%.

Use a **geração em lote** da visão Formação de Preço para aplicar a mesma
margem a vários itens de uma vez, em vez de digitar item a item.

⚠️ **Não existe "fechar revisão" nesta tela.** O preço passa a valer assim que
é gravado na tabela e a **validade da tabela** está em vigor — é a validade que
controla a publicação, não um botão de fechamento.

💡 **`VCLI0600`** — Manutenção Avançada de Preços de Venda: ajuste em massa depois da tabela formada.

✍️ **Anote a margem-alvo da sua empresa:** _______ %

---

# PARTE 5 — Orçamento de Venda

## 5.1 `VVND0310` — Parâmetros de Orçamento ⚠️ *pré-requisito*

> ## **Sem motivo de cancelamento cadastrado, o `VVND0300` não cancela nada** — nem orçamento, nem itens.

### Aba **Parâmetros**
Rótulos ("ordem de compra", "autorização de entrega") · **Cliente consumidor final** · **Padrão NFC-e** · **Itens de serviço na NFC-e** · **Frete CIF mínimo** · **Somar redespacho ao frete**.

### Aba **Padrões de comissão**
Descrição + percentuais.
⭐ O **código pode ficar em branco** (o sistema gera o próximo).
⚠️ **Faturamento + pagamento têm de somar a comissão.**

### Aba **Motivos de cancelamento**

| Indicador | O que faz |
|:--|:--|
| ⭐ **Indicador D** | Permite **descancelamento** |
| ⭐ **Indicador C** | **Exige complemento** no cancelamento |

⚠️ **Gravar com um código já existente atualiza** o registro.
⚠️ As listas mostram apenas registros **ativos**.
⚠️ **A gravação é restrita a ADMIN** — os demais perfis abrem em consulta.

---

## 5.2 `VVND0300` — Orçamento de Venda

**O que é:** a proposta comercial **antes** do pedido. Guarda a intenção da venda e, quando o cliente aprova, é **convertida em pedido** — copiando apenas o **saldo aberto** dos itens.

### Passo a passo

1. **Novo orçamento** → **Cliente**, **Tipo**, **Validade**, **Probabilidade %** → **Criar orçamento** (nasce como **Orçam. VentureERP / OV**).
   💡 *Estabelecimento em branco assume a empresa do login. Transportadora, tabela de preço e condição de pagamento em branco herdam o cadastro do cliente.*
2. Abra e adicione **itens**: item, quantidade, preço, desconto, **IPI**, **ST**, depósito, data de entrega.
   ⭐ *Totais recalculados a cada alteração; **políticas comerciais reavaliadas**.*
3. Ajuste a capa e clique em **Salvar capa**.
   ⚠️ **Enquanto houver alteração não salva, a troca de status e o bloqueio/liberação ficam travados.**
4. Quando aprovado → **Converter em pedido**.
   ⭐ *Pedido, itens, vínculo e evento são gravados na **mesma transação**.*
5. Alternativas: **Atender** (encerra sem gerar pedido) · **Cancelar** (exige motivo) · **Descancelar** · **Gerar DAV**.

### Tipos de orçamento
`VENDA` · `NEGOCIACAO` · `CONSULTA` · `API_TERCEIROS` · `FOCCOPORTAL` · `IMPORTADO`

### As 4 abas

| Aba | O que tem |
|:--|:--|
| **Dados gerais** | Identificação, condições, transporte, valores, observações, totais, **saldo aberto** e motivos de bloqueio/cancelamento/atendimento |
| **Itens** | Inclusão, edição (solicitada/atendida/cancelada, preço, descontos, IPI, ST) e cancelamento com motivo |
| **Anexos** | Documentos de até **10 MB** por arquivo |
| **Histórico** | Todos os eventos, do mais recente ao mais antigo |

### ⚠️ As 6 regras que mais geram dúvida

1. **Não emite NF-e** nem autoriza documento fiscal — **Venda NFC-e** apenas prepara a intenção fiscal.
2. **Conversão bloqueada** para orçamentos: cancelados · expirados · atendidos · tipo **CONSULTA** · bloqueados comercialmente · sem itens · já convertidos.
3. **Cancelamento (de orçamento e de item) exige motivo cadastrado.** Motivos com "exige complemento" recusam complemento em branco.
4. **Descancelar só funciona com o mesmo motivo do cancelamento**, e apenas se esse motivo permitir — por isso a tela apresenta o motivo travado.
5. Depois de **Gerar DAV**, o orçamento libera **apenas o relatório DAV** — cupom fiscal, impressão de pedido e envio por e-mail ficam indisponíveis. A geração é **idempotente**.
6. **Status muda somente pela caixa "Alterar status"** — cancelar, atender e expirar têm ações próprias.

### ⭐ Comportamentos automáticos

| Situação | O que acontece |
|:--|:--|
| Tipo de frete **FOB / cortesia / retira / sem frete / terceiros** | **Zeram frete e seguro** |
| **Entrega com recibo** | Força **NFC-e** e **zera o IPI** dos itens novos |
| Condição de pagamento diferente da do cliente | Exige **divisão de vendas** marcada como **"permite condição livre"** (`VVND0100`) |

💡 **Relatório:** consolida totais, retenções e **valor ponderado por probabilidade** da carteira. Listagem traz até **100 orçamentos por página**.

---

# PARTE 6 — Pedido de Venda

## `VVND0200` — Pedido de Venda

**Pré-requisitos:** cliente dentro do limite de crédito · itens com **saldo/ATP** · condição de pagamento.

### Passo a passo
1. **Novo pedido:** **Empresa**, **Cliente**, **Moeda**, **Condição de pagamento** → **Criar pedido** (nasce **Rascunho / R**).
2. Abra e adicione **itens** (item, depósito, quantidade, preço, desconto). Totais calculados pelo sistema.
3. **Confirmar (→ P)**.
4. Se ficar bloqueado, use **Desbloquear** (após liberar o crédito).
5. **Faturado (F)** acontece **automaticamente** quando a NF-e de saída é autorizada.

---

## ⭐⭐ As 3 automações da confirmação

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

> ⚠️ **Um pedido bloqueado NÃO gera demanda nem reserva.** Resolva o crédito primeiro.

## ⭐ A corrente se fecha aqui

> Esse pedido de venda é **exatamente a demanda** que o MRP do Dia 3 estava esperando.
>
> Ontem você criou a demanda **na mão** para entender a mecânica. Hoje ela nasceu **sozinha**, de uma venda real.

## Ciclo de status

```
Rascunho (R) ──confirmar──▶ Confirmado (P) ──NF-e autorizada──▶ Faturado (F)
                                  │
                            Bloqueado / Cancelado (libera reservas)
```

💡 **Filtros:** liste pedidos por **cliente** ou por **status**.

## Telas complementares

| Tela | O que faz |
|:--|:--|
| `VPDV0200` | Cadastro de Pedido de Venda — visão de formulário; ao selecionar o cliente, **todos os parâmetros são carregados automaticamente** |
| `VVND0600` | **Análise, Atendimento e Conferência** de pedidos — o workflow comercial |
| `VENT0100` | Consulta de Pedido de Venda |
| `VPDV0253` | Console de Acompanhamento de Pedidos |
| `VEXR0100` | **Reprogramação de Entrega** — histórico de remarcações |

---

# PARTE 7 — Organização comercial e pós-venda

## 7.1 Organização comercial

| Tela | O que faz |
|:--|:--|
| `VVND0100` | **Divisão de Vendas** — organização comercial; indicador **"permite condição livre"** |
| `VVND0400` | **Representantes** — vendedores externos/internos, gerentes e prepostos, com documento, território e comissão |
| `VVND0500` | **Metas de Vendas** |
| `VREP0600` | Complementos do Representante |

## 7.2 Promessa de entrega e venda recorrente

| Tela | O que faz |
|:--|:--|
| `VDPR0100` | **Ocupação diária**, **reserva comercial de capacidade**, expiração e **reprogramação em lote** |
| `VVRE0200` | Console de Vendas Recorrentes |
| `VVND0610` | Reajuste de Venda Recorrente |
| `VPLC0200` / `VPLC0211` | Montagem de Carga / Orientações de Entrega |

⚠️ **`VDPR0100`:** a reserva **não vira pedido nem demanda de MRP** — é só compromisso de capacidade.
⚠️ Na **reprogramação em lote**, pedidos e itens com **data firme são ignorados**.

## 7.3 Pós-venda

| Tela | O que faz |
|:--|:--|
| `VASS0201` / `VASS0402` | Cadastro e consulta de **chamado de assistência técnica** |
| `VATC0280` / `VATC0380` / `VATC0480` | Cadastro, relatório e consulta de **chamados** |
| `VGAR0211` | **Devoluções** de atendimento e garantia |
| `VSAC0100` / `VSAC0200` | **SAC** + relatórios, etiquetas e anexos |

### ⭐ Ciclo do chamado
```
PENDING → IN_ANALYSIS → WAITING_RETURN / WAITING_ORDER → ATTENDED → CLOSED
                                                              (ou CANCELLED)
```

⭐ Cada item calcula automaticamente `warranty_until` / `in_warranty` a partir da **data da NF de compra + dias de garantia**.
⭐ O chamado numera **por empresa**.

> 💡 **O Dia 1 volta aqui:** a **garantia em dias** que você cadastrou no item (`VENT0200`, aba Comercial) é o que o sistema usa para saber se o chamado está na garantia.

⚠️ Só funcionários com a flag **Assistente Técnico** (`VFUN0100`) podem ser designados como técnico executor.

---

# PARTE 8 — Expedição / Romaneio

## `VEXP0100` — Romaneio

**O que é:** documento **logístico** de saída (*packing list*). Atende pedidos de **venda**, **compra** (devolução) e **produção**.

### Passo a passo
1. ⭐ **Auto-fill:** informe o código do **pedido de venda** → **Gerar**. O romaneio nasce **Aberto** já com os itens.
2. **Separar (reserva):** reserva o estoque (`OPEN → SEPARATED`).
3. **Conferir itens:** registre a quantidade conferida de cada item.
   ⚠️ *Sobra/falta gera **divergência** (⚠️), que **bloqueia o despacho** salvo aceite explícito.*
4. **Conferir romaneio** (exige **todos** os itens conferidos): `SEPARATED → CONFERRED`.
5. **Packing:** adicione **volumes** (Caixa, Pallet, Fardo… com peso e dimensões).
   ⭐ *A cubagem é calculada de L×A×C.*
6. **Transporte:** modalidade de frete (CIF/FOB…), valor, placa, motorista, **ANTT**, lacres, previsão de entrega.
7. Emita a **NF-e de saída** e **Vincule a NF-e** ao romaneio.
8. **Despachar** (`CONFERRED → SHIPPED`): consome as reservas. Se houver divergência, marque **aceitar divergência**.
9. **Exporte** em **PDF** ou **Excel**.

### Ciclo de vida
```
OPEN ──separar──► SEPARATED ──conferir──► CONFERRED ──despachar──► SHIPPED
  │  (reserva)         │  (todos itens)        │  (sem divergência
  └──────────────── CANCELLED (libera reservas) ─────── ou aceite)
```

## ⭐⭐ A frase que resolve a maior confusão do dia

> # O romaneio RESERVA; a NF-e BAIXA.
>
> A reserva **reduz o disponível (ATP)**; o físico só cai na **autorização da NF-e de saída**.

> Você separou 100 peças → o ATP caiu 100, mas o **saldo físico continua 100**.
> Ele só cai quando a nota é autorizada. Faz sentido: **até a nota sair, a mercadoria ainda é sua**.

💡 A **trilha de auditoria** registra cada transição (Criado, Separado, Conferido, Despachado, Cancelado, NF-e vinculada).

## Carga física

| Tela | O que faz |
|:--|:--|
| `VEXP0110` | **Gestão de Cargas** — agrupa um ou mais romaneios. ⚠️ *O código legado `VPLC0200` abre esta rotina* |
| `VEXP0120` | **Instruções e Caixas de Despacho**. ⚠️ *O código legado `VPLC0211` abre esta rotina* |

### Ciclo obrigatório da carga
```
OPEN → RELEASED → LOADING → LOADED → SHIPPED
```

⚠️ **Antes de criar a carga, conclua separação e conferência dos romaneios.**
⚠️ **Remover o vínculo não cancela nem exclui o romaneio.**
⚠️ **Não despache antes da autorização fiscal** e da conferência do responsável.
⚠️ **Erro 422** = transição inválida, romaneio/nota incompatível ou dado ausente — **recarregue a carga** antes de tentar de novo.
⚠️ **Um despacho confirmado não deve ser repetido após timeout** sem antes consultar a situação atual.

💡 A **caixa** (`VEXP0120`) é uma **posição/doca operacional**, **não** um volume de `VEXP0100`.

---

# PARTE 9 — Fiscal — a base

## 9.1 `VFIS0100` — Configuração Fiscal

| Seção | O que tem |
|:--|:--|
| **Emitente** | CNPJ (validação ✓/✗ em tempo real) · Razão Social · IE · ⭐ **Regime Tributário** (`1` Simples · `2` Lucro Presumido · `3` Lucro Real) · UF · Telefone |
| **Endereço** | Logradouro, número, complemento, bairro, município, **Cód. IBGE (7 dígitos)**, CEP — ⚠️ **obrigatório para autorizar NF-e** |
| **Focus NF-e** | ⭐ **Token** (obrigatório) · ⭐ **Ambiente** (`Homologação` / `Produção`) |
| **Tributação & Vencimentos** | ICMS interno · Diferimento · Juros ao mês · Multa atraso — todos em **ratio** (`0,12` = 12%) · Dia de vencimento de ICMS, IPI e PIS/COFINS |
| **Identidade visual** | Logo **PNG/JPEG até 2 MB** · **Cor da marca** `#RRGGBB` |

⚠️ **O Token Focus NF-e é dado sensível** — criptografado no banco, nunca em logs ou exportações. **Não compartilhe.**
⚠️ **Salvar identidade** (logo/cor) é **independente** de **Salvar Configuração**.
⚠️ O **Preview persistido** vem do backend — confirma o que está **no banco**, não uma prévia local.
⚠️ **Não feche a tela durante "Enviando..."**. Após timeout, recarregue e confira o preview antes de repetir.
⚠️ **O regime tributário é praticamente imutável na operação** — Simples apura na `VFIS0340`; os demais usam apuração detalhada por tributo.

💡 O **rodapé** mostra regime tributário e ambiente ativo — use como conferência rápida.

---

## 9.2 `VFIS0110` — Tabelas Tributárias

| Aba | Chave | O que cadastra |
|:--|:--|:--|
| **NCM** | NCM de 8 dígitos — ⚠️ **imutável** | Alíquotas de IPI, PIS, COFINS + **CSTs**. Padrões sugeridos: PIS `0,0165` · COFINS `0,076` (cumulativo) |
| **ICMS Interno** | UF (2 caracteres) | Alíquota interna (ex.: `0,18` = 18%) + **FCP** |
| **ICMS Interestadual** | UF origem + UF destino | Alíquota conforme CONFAZ |

### ⭐ Alíquotas interestaduais (CONFAZ)
```
7%   Sul/Sudeste (exceto ES)  →  Norte, Nordeste, Centro-Oeste e ES
12%  Entre estados das mesmas regiões, ou casos não cobertos acima
4%   Operações interestaduais com PRODUTOS IMPORTADOS
```

⚠️ **O NCM é imutável após a criação.** Para corrigir, desative e crie novo.
⚠️ Manter as alíquotas atualizadas conforme a legislação é **responsabilidade do usuário**.

---

## 9.3 ⭐⭐ A hierarquia de busca de alíquotas — memorize

```
1º  VFIS0350  Classificações Fiscais       ← PRECEDÊNCIA MÁXIMA
2º  VFIS0320  Parâmetros ICMS/IPI          (por UF + NCM + Operação)
3º  VFIS0330  Redução/Substituição/Diferimento
4º  VFIS0110  Tabelas Tributárias          ← FALLBACK
5º  VFIS0100  Alíquotas padrão             ← último recurso
```

> **Quando a alíquota vier "errada" na nota, é essa escada que você percorre, de cima para baixo.**

---

## 9.4 `VFIS0300` — CFOPs / Naturezas de Operação

| Campo | Opções |
|:--|:--|
| **Código** | 4 dígitos — ⚠️ **imutável após criação** |
| **Descrição** | Conforme tabela oficial |
| **Utilização** | `INDUSTRIALIZACAO_COMERCIO` / `IMOBILIZADO` / `USO_CONSUMO` |
| **Ind. Operação** | `NORMAL` / `ENERGIA_ELETRICA` / `TELECOMUNICACAO` |
| **Tipo Utilização** | `NORMAL` / `VENDA_COMERCIAL_EXPORTADORA` / `COMPRA_FIM_ESPECIFICO_EXPORTACAO` / `EXPORTACAO` |
| ⭐ **DIFAL** | Toggle — Diferencial de Alíquota em operações interestaduais para **consumidor final não-contribuinte** |
| **Doação** | Toggle — tratamento fiscal específico |

⚠️ **O código do CFOP é imutável** — CFOPs referenciados por NF-es emitidas não podem mudar de código.
⭐ **Ative DIFAL** para CFOPs de venda interestadual a consumidor final não-contribuinte (ex.: `6108`, `6109`).
💡 As classificações são usadas na **apuração de ICMS**, no **SPED Fiscal** (registros C190/C195) e no **cálculo de DIFAL**.

## 9.5 Complementos fiscais de base

| Tela | O que faz |
|:--|:--|
| `VFIS0310` | Dispositivos Legais — o embasamento das alíquotas diferenciadas |
| `VFIS0320` | Parâmetros ICMS/IPI por UF + NCM + Operação |
| `VFIS0330` | Redução / Substituição / Diferimento de ICMS |
| `VFIS0350` | Classificações Fiscais — CEST, Ex Tarifário, modalidades de base de cálculo |
| `VFIS0360` | Tipos de Operação de Entrada |
| `VFIS0630` | **Tabela IBPT** — carga tributária aproximada (Lei da Transparência) |
| `VFIS0120` | Exclusão controlada de tributação NCM |
| `VFIS0660` | Consultas pontuais de parâmetros fiscais |

---

# PARTE 10 — Fiscal — NF-e de Saída

## `VFIS0200` — a tela mais importante do módulo fiscal

**Pré-requisitos:** `VFIS0100` (token, CNPJ, regime, endereço) · `VFIS0110` (NCMs e ICMS) · `VFIS0300` (CFOPs) · `VCLI0500` (destinatário).

### Os status na listagem
```
🟢 verde    = Autorizada       🔵 azul    = Processando
🔴 vermelho = Cancelada        ⚪ cinza   = Rascunho
🟠 âmbar    = Rejeitada
```

### Passo a passo

**1. + Nova NF-e → Cabeçalho**

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

**2. Itens** (tabela inline)

Seq (auto) · **Cód. Item** · ⭐ **NCM (8 dígitos)** · **CFOP do item** (pode divergir do cabeçalho) · **Origem** (`0` Nacional a `8` Importação > 70%) · **Descrição** · **Qtd** (> 0) · **Unit.** (> 0) · Total (auto).

⭐ **Ao informar o NCM, o sistema busca automaticamente as alíquotas.**
⚠️ **Sem NCM a nota é rejeitada pela SEFAZ.**
⚠️ Pelo menos **um item** é obrigatório.

**3. Criar Rascunho** — o sistema:
- Valida obrigatórios (número, CNPJ/CPF, UF destino, **NCM e CFOP de cada item**)
- ⭐ **Calcula ICMS, IPI, PIS e COFINS** seguindo a hierarquia
- Exibe os valores calculados e o **Valor Total**
- Grava com status **Rascunho** (editável)

**4. Autorizar** — o sistema:
- Monta o **XML no leiaute oficial NFe 4.00**
- Envia à API Focus NF-e → SEFAZ
- Status → **Processando** (azul)
- ✅ **Autorizada** → **protocolo** + ⭐ **chave de acesso de 44 dígitos**
- ❌ **Rejeitada** → **motivo da SEFAZ exibido para correção**

**5. Cancelamento** — justificativa de ⭐ **mínimo 15 caracteres**.
**6. CC-e** — texto de ⭐ **mínimo 15 caracteres**.
**7. Status** — consulta a situação atual na SEFAZ.
**8. Exportar** — relatórios.

---

## ⚠️ Os 3 avisos que evitam o erro mais caro do dia

### 1. UF de Destino é crítica
```
UF destino == UF do emitente  →  operação INTERNA
                                 →  ICMS interno

UF destino != UF do emitente  →  operação INTERESTADUAL
                                 →  alíquota interestadual + DIFAL quando aplicável
```

### 2. Prazo de cancelamento
> Geralmente **24 horas** da autorização. **O sistema não bloqueia por prazo, mas a SEFAZ pode rejeitar.**

### 3. O que a CC-e PODE e NÃO PODE corrigir

| ✅ Pode corrigir | ❌ Não pode |
|:--|:--|
| Natureza da operação | **CFOP** |
| Descrições | **Valores fiscais** |
| Dados do transportador | **CNPJ/CPF** |
| Campos que não afetam imposto nem identidade das partes | **Datas** |

> Para esses casos: **cancelamento + nova NF-e**.

---

## 💡 Nota rejeitada não é o fim do mundo

> Nota rejeitada **trava o faturamento e a entrega** — é o erro mais caro do dia.
>
> Mas o sistema mostra o **motivo da SEFAZ em texto**. **Leia o motivo** — ele quase sempre aponta um campo específico: NCM faltando, IBGE errado, IE inválida, CFOP incompatível.
>
> **É conserto de cinco minutos se você ler.**

💡 **Rejeição não consome número de nota.**

---

# PARTE 11 — Fiscal — emissão complementar

| Tela | O que faz | ⚠️ Atenção |
|:--|:--|:--|
| `VFIS0210` | **NF-e de Entrada** — 3 modos: manual · **importação por chave de 44 dígitos** · upload de XML | ⭐ **Aprovar gera automaticamente conta a pagar** no `VFIN0200` e registra créditos tributários |
| `VFIS0640` | **Faturamento Fiscal de Carga e DANFE** | **Não gere duas saídas para a mesma carga.** Em timeout, consulte a lista fiscal antes de repetir. **Consultar DANFE** retorna URLs de DANFE e XML — **abra somente os endereços retornados** |
| `VFIS0610` | Importação de NF-e de compra **por chave** | Execute **uma única vez**. Antes de repetir após timeout, **procure a chave nas entradas fiscais** |
| `VFIS0620` | **Manifestação do Destinatário** e **Inutilização** | **Não manifeste desconhecimento antes de conferir** CNPJ, fornecedor e escrituração. Na inutilização, confirme que **nenhum número da faixa foi usado** — e **não reutilize a faixa** |
| `VFIS0220` / `VIMP0102` | **CT-e** (Conhecimento de Transporte) | |
| `VNFS0100` | **NFS-e** (Nota Fiscal de Serviço) | |

> 💡 **O Dia 2 volta aqui:** quando a nota do fornecedor entra no `VFIS0210` e é **aprovada**, o sistema cria a conta a pagar **sozinho**. Ninguém digita título a pagar duas vezes num ERP bem operado.

## ⚠️ Regra geral de operação fiscal com timeout

> **Em operações fiscais com timeout, consulte a situação no provedor/SEFAZ antes de reenviar — evita duplicidade.**

---

# PARTE 12 — Financeiro

## 12.1 A base

### `VFIN0100` — Contas Bancárias

**Passo a passo:** **+ Nova Conta** → **Banco** (código, ex.: `341`) · Agência · **Conta** · Dígito · **Descrição** · Titular · **Saldo Inicial** · **Tipo Chave PIX** + **Chave PIX** → **Salvar**.

⚠️ **A tela não tem edição nem exclusão** de contas já cadastradas.
⚠️ Informe **sem máscaras ou caracteres especiais**.
⭐ O **Saldo Inicial** é o ponto de partida da conciliação.

### `VFIN0110` — Condições de Pagamento

**Nome** (ex.: `30/60/90`) + **Parcelas** (dias separados por vírgula).

| Exemplo | Significa |
|:--|:--|
| `0` | À vista — parcela única, vencimento na data base |
| `30,60,90` | Três parcelas: 30, 60 e 90 dias |
| `28,56,84` | Três parcelas mensais de 28 dias |

⚠️ **Não há validação de ordenação** — informe em ordem **crescente**.
⚠️ Condições referenciadas em títulos ou pedidos **não podem ser excluídas**.

### `VFIN0120` — Plano de Contas

Notação hierárquica com pontos: `3` → `3.1` → `3.1.01`.

| Campo | Opções |
|:--|:--|
| **Código** | Hierárquico com ponto |
| **Descrição** | |
| **Código Pai** | Em branco para 1º nível |
| **Tipo** | `RECEITA` / `DESPESA` / `ATIVO` / `PASSIVO` / `PATRIMÔNIO` |
| **Natureza** | `CRÉDITO` (aumenta com crédito) / `DÉBITO` (aumenta com débito) |

⭐ O **nível é calculado automaticamente** pelo número de segmentos.
⭐ É a base do relatório **R05 (DRE)**.
💡 Receita normalmente tem natureza **CRÉDITO**; despesa, **DÉBITO**.

---

## 12.2 `VFIN0210` — Contas a Receber

**O título que a venda gerou.**

### Criação
Nº Documento ✅ · Cliente (ID) · **NF Saída (ID)** · Forma de Pagamento (padrão `boleto`) · **Valor Bruto** ✅ · **Emissão** ✅ · **Vencimento** ✅ · Desconto · Parc. nº / Parc. tot. · Observação → **Salvar** (status **pendente**).

### Baixa (recebimento)
1. Localize um título **pendente** (âmbar) ou **parcial** (azul) → **Baixar**.
2. **Conta Bancária** ✅ · **Valor Recebido** ✅ · **Data Recebimento** ✅ · Observação.
3. **Confirmar Baixa**.

### Status
```
pendente (âmbar) → parcial (azul) → pago (verde)
                                  → cancelado (vermelho)
```

⭐ **Sem fluxo de aprovação** — diferente do Contas a Pagar.
⭐ **Recebimento parcial é nativo** — o hint mostra o **saldo restante**.

### Dashboard de aging
Faixas: **Vencido** · **7** · **15** · **30** · **60 dias** · **Acima de 60 dias** + **Total**.

⚠️ Os cartões são **informativos** — para filtrar a tabela, use o **seletor de status**.
⚠️ Só aparecem as faixas que **têm título** no período.
💡 As **cores da tabela** indicam o **status** do título, não a faixa de aging.

---

## 12.3 `VFIN0200` — Contas a Pagar

**O título que a compra do Dia 2 gerou.**

> ⭐ **INTEGRAÇÃO CRÍTICA:** aprovar uma **NF-e de Entrada** no `VFIS0210` **gera automaticamente** uma conta a pagar aqui.

### Ciclo — diferente do Receber
```
pendente (âmbar) ──aprovar──▶ aprovado (azul) ──baixar──▶ pago (verde)
       │                            │
       └──rejeitar (com motivo)──▶ cancelado (vermelho) ◀──cancelar──┘
```

⚠️ **A rejeição solicita um motivo** e o título vai para **cancelado**.
⚠️ **Só título aprovado pode ser baixado.**
⚠️ **Cancelamento não tem desfazer.**

### Campos de rateio (opcionais mas importantes)
**Plano Contas (ID)** — classificação contábil
**Centro Custo (ID)** — rateio da despesa

> 💡 **Por que a assimetria?** Você quer um segundo olhar antes de **tirar** dinheiro do caixa, não antes de colocar.

---

## 12.4 `VFIN0300` — Fluxo de Caixa e Saldos

Tela **exclusivamente consultiva** — 3 abas.

| Aba | Parâmetros | O que mostra |
|:--|:--|:--|
| **Realizado** | Início **e** Fim | **Entradas** (verde) · **Saídas** (vermelho) · **Saldo** + tabela cronológica com **Conciliação** (Sim/Não) |
| **Projetado** | Apenas Início | Vencimento, tipo, descrição e valor dos **lançamentos futuros previstos** |
| **Saldos das Contas** | — | Quantidade de contas + **saldo total somado** + saldo atual de cada conta |

⚠️ **Os títulos precisam ter sido baixados** para aparecerem na aba **Realizado**.
⭐ Saldos = **saldo inicial** do `VFIN0100` + **todas as baixas** registradas.
⚠️ A aba **Projetado não tem conciliação** — são previsões.
⚠️ Todas as alterações são feitas nas **telas de origem** (`VFIN0200`, `VFIN0210`, `VFIN0100`).

> ## ⭐ O caixa é o espelho de tudo
>
> A **venda** virou **nota** → a nota virou **título a receber** → o título entra no **fluxo de caixa**.
> A **compra** do Dia 2 virou **título a pagar**.

## 12.5 Complementos financeiros

| Tela | O que faz | ⚠️ Atenção |
|:--|:--|:--|
| `VFIN0600` | **Adiantamentos** de clientes e fornecedores | `PAGAR` **não** pode ser aplicado em conta a receber, nem `RECEBER` em conta a pagar. Valor zero, negativo ou acima do saldo é recusado. **A aplicação não tem exclusão** |
| `VFIN0610` | **Remessa Bancária CNAB 240** (`.rem`) | **Não reutilize sequência já aceita pelo banco.** **Valide no homologador do banco** — gerar o arquivo **não significa** que o banco registrou os títulos |
| `VFIN0620` | **Conciliação Bancária por OFX** | **Compare banco/agência/conta com o cabeçalho do arquivo.** Use o `.ofx` **original**; **não converta PDF/CSV mudando a extensão**. Confira duplicidades em reimportações |
| `VFIN0500` | **Relatórios** (R01–R18) | R05 = DRE · R09/R10 = Aging Receber/Pagar · R11/R12 = Extrato por Fornecedor/Cliente. Relatórios grandes **demoram** — aguarde antes de trocar |
| `VFIN0130` | Centros de Custo | `PRODUTIVO` / `ADMINISTRATIVO` / `COMERCIAL` / `AUXILIAR` |

---

# PARTE 13 — Apuração, conciliação, SPED e contabilidade

## 13.1 `VFIN0400` — Apuração de Impostos

Apuração de **ICMS, IPI, PIS e COFINS** por **competência mensal** (`AAAA-MM`).

```
NF-e de ENTRADA (VFIS0210)  →  CRÉDITOS
NF-e de SAÍDA   (VFIS0200)  →  DÉBITOS
                    ↓
          Saldo a recolher (positivo, VERMELHO)
                    ou
          Crédito acumulado (negativo, VERDE)
```

> 💡 **Saldo negativo em verde não é erro** — significa que a empresa acumulou **mais créditos do que débitos** no período. É crédito compensável em períodos futuros.

## 13.2 SPED e contabilidade

| Tela | O que gera | ⚠️ Atenção |
|:--|:--|:--|
| `VFIS0600` | **SPED EFD ICMS/IPI** → `SPED_EFD_ICMS_IPI.txt` | **Valide no PVA antes de transmitir.** A geração **não equivale à entrega** à Receita |
| `VCTB0600` | **SPED ECD** → `SPED_ECD.txt` | **Feche o período contábil antes.** A geração **não corrige inconsistências contábeis** nem representa **assinatura ou transmissão** |
| `VCTB0200` | Contabilidade SPED ECD — lançamentos por partidas dobradas, balancete | |
| `VCTB0102` | Centro de Custo (contábil) | Vínculo com empresa + Ativo/Inativo |
| `VFIS0340` | Apuração do **Simples Nacional** | Só relevante se o regime for Simples |
| `VFIS0530` / `VFIS0540` | Linhas de Apuração (Bloco E) e Lançamentos Resumo de ICMS | |
| `VFIS0500` / `VFIS0510` / `VFIS0520` | Motivos DAPI e códigos de ajuste de ICMS | |
| `VFIS0550` / `VFIS0560` | Restituição ICMS ST · Notas Especiais de Ajuste | |

> ## ⚠️ Gerar SPED NÃO é transmitir SPED
>
> A criação do TXT **não representa assinatura nem transmissão**. Valide no **PVA** e transmita pelo canal oficial, com assinatura autorizada.

# PARTE 14 — Exercícios do dia

## 🎯 Exercício 1 — As 3 automações (3 min)

Você clicou em **Confirmar** no pedido de venda. Liste o que o sistema faz:

```
1. ______________________________________________

2. ______________________________________________

3. ______________________________________________
```

O que acontece se o pedido ficar **bloqueado**?
______________________________________________

---

## 🎯 Exercício 2 — Reserva × Baixa (3 min)

Você tem **500 peças** em estoque. Um romaneio separou **200**.

| Pergunta | Resposta |
|:--|:--|
| Qual o saldo **físico** agora? | ______ |
| Qual o **ATP** agora? | ______ |
| Quando o saldo físico cai? | ______________________ |

---

## 🎯 Exercício 3 — A margem (3 min)

Custo do suporte soldado: **R$ 54,00**. Preço de venda: **R$ 89,90**.

```
Margem (%) = (______ − ______) / ______ × 100 = ______ %
```

Se você calculasse "margem" dividindo pelo **custo**, daria quanto? ______ %
Qual dos dois é o número correto para decisão comercial? ______________

---

## 🎯 Exercício 4 — De onde veio a alíquota? (4 min)

A NF-e saiu com ICMS de 12% e você esperava 18%. Liste a ordem em que você vai investigar:

```
1º  ______________________________________________
2º  ______________________________________________
3º  ______________________________________________
4º  ______________________________________________
5º  ______________________________________________
```

E qual campo do **cabeçalho** decide se a operação é interna ou interestadual?
______________________________________________

---

## 🎯 Exercício 5 — CC-e ou cancelamento? (3 min)

Para cada erro, marque o que resolve:

| Erro na nota autorizada | CC-e | Cancelar + nova NF-e |
|:--|:-:|:-:|
| Descrição do produto com typo | ☐ | ☐ |
| CFOP errado | ☐ | ☐ |
| Nome do motorista errado | ☐ | ☐ |
| Quantidade errada (valor muda) | ☐ | ☐ |
| CNPJ do destinatário errado | ☐ | ☐ |
| Natureza da operação mal descrita | ☐ | ☐ |

---

## 🎯 Exercício 6 — DINÂMICA: "Do pedido ao recebimento" (20 min, em dupla)

**Objetivo:** vender o suporte soldado produzido nos dias anteriores e receber por ele.

| # | O que fazer | Tela | ✓ |
|:-:|:--|:--|:-:|
| 1 | Conferir/criar os **apoios de cliente** | `VCLI0510`/`0520`/`0530` | ☐ |
| 2 | Cadastrar o **cliente** com dados fiscais e **limite de crédito** | `VCLI0500` | ☐ |
| 3 | Formar o **preço** com margem | `VCST0202` | ☐ |
| 4 | Conferir os **motivos de cancelamento** | `VVND0310` | ☐ |
| 5 | Criar **orçamento** e **converter em pedido** | `VVND0300` | ☐ |
| 6 | **Confirmar** o pedido | `VVND0200` | ☐ |
| 7 | Observar as **3 automações** (veja o ATP cair) | `VVND0200` / `VEST0100` | ☐ |
| 8 | Gerar o **romaneio** e levá-lo até `CONFERRED` | `VEXP0100` | ☐ |
| 9 | **Emitir a NF-e de saída** (rascunho) | `VFIS0200` | ☐ |
| 10 | **Autorizar** na SEFAZ (homologação) | `VFIS0200` | ☐ |
| 11 | **Vincular a NF-e** ao romaneio e **despachar** | `VEXP0100` | ☐ |
| 12 | Localizar o **título a receber** | `VFIN0210` | ☐ |
| 13 | **Baixar parcialmente** o título | `VFIN0210` | ☐ |
| 14 | Ler o **fluxo de caixa** (3 abas) | `VFIN0300` | ☐ |
| 15 | Localizar o **título a pagar** do Dia 2 | `VFIN0200` | ☐ |
| 16 | Ler a **apuração de impostos** | `VFIN0400` | ☐ |

### Dados do cenário

**Cliente**

| Campo | Valor |
|:--|:--|
| Razão Social | Montadora Industrial Paulista Ltda |
| Tipo Documento | CNPJ (válido) · com Inscrição Estadual |
| Região / Segmento / Tipo | `SUDESTE-SP` / `INDUSTRIA` / `NORMAL` |
| Condição de Pagamento | `30/60` |
| Tabela de Venda | `TAB-INDUSTRIA` |
| **Limite de Crédito** | **R$ 15.000,00** |
| Endereço | Tipo `Entrega` · UF `SP` · CEP e IBGE preenchidos |

**Precificação**

| Campo | Valor |
|:--|:--|
| Custo (vindo do Dia 3) | R$ 54,00 |
| **Preço de Venda** | **R$ 89,90** |
| **Margem** | **39,93%** |
| Comissão padrão | 3% |

**Orçamento / pedido**

| Campo | Valor |
|:--|:--|
| Item | `PA-SUP-SOLD-001` · **100 PC** · R$ 89,90 |
| **Total** | **R$ 8.990,00** |
| Condição | `30/60` · Depósito `ALM-PA` |

> 💡 **Variante do bloqueio:** venda **300 peças** = **R$ 26.970** → **acima do limite de R$ 15.000** → o pedido **bloqueia**. Vale testar.

**NF-e de saída**

| Campo | Valor |
|:--|:--|
| **CFOP** | `5101` (venda dentro de SP) |
| Pessoa / **UF Destino** | `J` / `SP` → **operação interna** |
| Natureza da Operação | Venda de produção do estabelecimento |

**Item da nota**
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

**Baixa sugerida:** receber **R$ 2.000,00** na 1ª parcela (R$ 4.495,00) → título fica **parcial** com saldo de R$ 2.495,00.

### ✅ Entregável
> **NF-e autorizada (com chave de 44 dígitos) + título a receber gerado + impacto visível no fluxo de caixa.**

---

# PARTE 15 — Erros comuns e como resolver

## Comercial

| O que acontece | Por quê | O que fazer |
|:--|:--|:--|
| Cliente não salva | Filial **sem matriz**, ou apoio faltando | `VCLI0510`/`0520`/`0530` |
| CNPJ com ✗ | Dígito verificador inválido | Conferir o número |
| Condição de pagamento não aparece | **Visibilidade = Somente Vinculados** | Ajustar no cliente |
| Alterei a tabela de venda e o pedido não mudou | **Pedidos já criados não são afetados** | Comportamento correto |
| Item bloqueado no pedido | Regra de **restrição** (restrições prevalecem) | `VCLI0117` |
| Frete diferente do esperado | Faixas **sobrepostas** | `VCLI0202` |
| Não consigo editar itens da precificação | **Revisão está Fechada** | Criar nova revisão |
| Margem parece baixa | Margem é sobre o **preço de venda** | Comportamento correto |
| Orçamento bloqueou sozinho | **Política comercial** exige aprovação | `VPDV0108` / `VPDV0111` |
| Orçamento não cancela | **Sem motivo cadastrado** | `VVND0310` |
| Orçamento não converte | Cancelado · expirado · atendido · tipo `CONSULTA` · bloqueado · sem itens · já convertido | Ver a lista de bloqueios |
| Não consigo trocar o status do orçamento | **Alteração não salva na capa** | **Salvar capa** primeiro |
| Não consigo descancelar | Motivo **não permite** (Indicador D desligado) ou motivo diferente | `VVND0310` |
| DAV travou o cupom fiscal | Após DAV, só o relatório DAV fica disponível | Comportamento correto |
| Condição de pagamento livre recusada | Divisão de vendas sem **"permite condição livre"** | `VVND0100` |
| Pedido fica **bloqueado** ao confirmar | **Crédito** estourado ou cliente bloqueado | Liberar → **Desbloquear** |
| Pedido confirmado mas **sem demanda no MRP** | Está **bloqueado** | Desbloquear |

## Expedição

| O que acontece | Por quê | O que fazer |
|:--|:--|:--|
| Romaneio não separa | Sem **saldo/ATP** | `VEST0100` |
| Romaneio não despacha | **Divergência** sem aceite, ou itens não conferidos | Conferir todos + aceitar divergência |
| ATP caiu mas o saldo físico não | ⭐ **Correto** — o romaneio reserva, a NF-e baixa | Nada a fazer |
| Cancelei o romaneio — o estoque voltou? | **Sim** — cancelar **libera as reservas** | — |
| Carga com **erro 422** | Transição inválida, romaneio/nota incompatível ou dado ausente | **Recarregar a carga** antes de tentar de novo |

## Fiscal

| O que acontece | Por quê | O que fazer |
|:--|:--|:--|
| NF-e **rejeitada** | Ler o **motivo da SEFAZ** | Quase sempre NCM, IBGE, IE ou CFOP |
| NF-e sem imposto calculado | NCM ausente ou sem alíquota cadastrada | `VFIS0110` |
| Alíquota "errada" | Percorrer a **hierarquia** | `VFIS0350` → `0320` → `0330` → `0110` → `0100` |
| Não consigo autorizar | **Token Focus ausente** ou endereço do emitente incompleto | `VFIS0100` |
| Logo fiscal não salva | > 2 MB, corrompido, ou não é PNG/JPEG | Corrigir o arquivo |
| Cancelamento rejeitado | **Fora do prazo** (≈24h) | Emitir nota de devolução |
| CC-e rejeitada | Tentou corrigir CFOP/valor/CNPJ/data | Cancelamento + nova NF-e |
| Justificativa recusada | **Mínimo 15 caracteres** | Escrever mais |
| DANFE indisponível | Nota **ainda não autorizada**, rejeitada, ou sem documento na integração | Conferir status |
| Inutilização recusada | **Faixa já utilizada** | Conferir o sequencial fiscal |
| Timeout numa operação fiscal | ⚠️ **Consulte a SEFAZ antes de reenviar** | Evita duplicidade |

## Financeiro

| O que acontece | Por quê | O que fazer |
|:--|:--|:--|
| Conta a pagar não apareceu após NF-e | A NF-e de entrada **não foi aprovada** | `VFIS0210` |
| Título a pagar não baixa | Está **pendente** — falta **aprovar** | `VFIN0200` |
| Título a receber não apareceu | Vincular manualmente pelo **NF Saída (ID)** | `VFIN0210` |
| Não consigo editar uma conta bancária | ⚠️ A tela **não tem edição nem exclusão** | Cadastrar novo registro |
| Parcelas na ordem errada | ⚠️ **Não há validação de ordenação** | Informar em ordem crescente |
| Fluxo de caixa vazio (Realizado) | **Títulos não foram baixados** | Baixar primeiro |
| Saldo negativo em verde na apuração | **Crédito acumulado** | Comportamento correto |
| Conciliação OFX conciliou errado | **Conta bancária errada** informada | Comparar com o cabeçalho do arquivo |
| Remessa CNAB rejeitada | Sequência reutilizada, ou dados do convênio incorretos | Validar no homologador do banco |
| SPED rejeitado no PVA | Período não fechado, lançamentos não balanceados, cadastro incompleto | Corrigir a **origem**, não o arquivo |
| Relatório demora muito | Volume grande (R01–R04, R09–R10, R17–R18) | Aguardar; **não trocar de relatório** |
| Título cancelado por engano | ⚠️ **Cancelamento é definitivo** | Criar novo título |

## Códigos de erro

| Erro | O que verificar |
|:--|:--|
| **400** | Campo obrigatório, número, data/hora, estrutura das listas |
| **401** | Refazer login; não repetir antes de autenticar |
| **403** | Ação exige **ADMIN** ou permissão específica |
| **404** | Código pertence à sua empresa? Registro desativado? |
| **409 / 422** | Situação, saldo, vigência, duplicidade, transição permitida |
| **Timeout fiscal** | ⚠️ **Consulte no provedor/SEFAZ antes de reenviar** |

---

# PARTE 16 — Cola rápida — os códigos do Dia 4

### ⭐ Os 12 que você vai usar sempre

```
VCLI0500  Cadastro de Cliente        ← quem compra
VCLI0117  Restrições de Venda        ← o que ele pode comprar
VCST0202  Precificação               ← quanto custa vender
VVND0310  Parâmetros de Orçamento    ← pré-requisito (motivos!)
VVND0300  Orçamento de Venda         ← a proposta
VVND0200  Pedido de Venda            ← as 3 automações
VEXP0100  Expedição / Romaneio       ← separa e despacha
VFIS0100  Configuração Fiscal        ← ⚠️ CONFIRA O AMBIENTE
VFIS0300  CFOPs                      ← a natureza da operação
VFIS0200  NF-e de Saída              ← ⭐ a nota
VFIN0210  Contas a Receber           ← o título
VFIN0300  Fluxo de Caixa             ← o espelho
```

### Cliente e comercial
```
VCLI0510  Apoio Básico            VVND0100  Divisão de Vendas
VCLI0520  Apoio Comercial         VVND0400  Representantes
VCLI0530  Apoio Fiscal            VVND0500  Metas de Vendas
VCLI0202  Políticas de Frete      VREP0600  Complementos do Representante
VCLI0600  Preços Avançados        VVND0600  Análise e Conferência
VPDV0108  Política de Descontos   VPDV0200  Pedido (formulário)
VPDV0111  Política de Fretes      VPDV0253  Console de Pedidos
VENT0100  Consulta de Pedido      VEXR0100  Reprogramação de Entrega
VVRE0200  Vendas Recorrentes      VVND0610  Reajuste Recorrente
VDPR0100  Promessa: Ocupação e Reservas
```

### Custo
```
VCUS0100  Custos (centro, compra, alocação, overhead)
VPRO0300  Custo Padrão
```

### Expedição
```
VEXP0100  Romaneio               VPLC0200  Montagem de Carga (→ VEXP0110)
VEXP0110  Gestão de Cargas       VPLC0211  Orientações (→ VEXP0120)
VEXP0120  Instruções e Caixas
```

### Pós-venda
```
VASS0201  Chamado de Assistência   VATC0380  Relatório de Chamados
VASS0402  Consulta de Assistência  VATC0480  Consulta de Chamados
VATC0280  Cadastro de Chamados     VGAR0211  Devoluções e Garantia
VSAC0100  SAC                      VSAC0200  Relatórios do SAC
```

### Fiscal — base
```
VFIS0100  Configuração Fiscal     VFIS0330  Redução/Substituição/Diferimento
VFIS0110  Tabelas Tributárias     VFIS0350  Classificações Fiscais
VFIS0300  CFOPs                   VFIS0360  Tipos de Operação de Entrada
VFIS0310  Dispositivos Legais     VFIS0630  Tabela IBPT
VFIS0320  Parâmetros ICMS/IPI     VFIS0120  Exclusão de Tributação NCM
                                  VFIS0660  Consultas Pontuais
```

### Fiscal — emissão e apuração
```
VFIS0200  NF-e de Saída           VFIS0340  Apuração Simples Nacional
VFIS0210  NF-e de Entrada         VFIS0500  Motivos DAPI
VFIS0220  CT-e                    VFIS0510  Códigos de Ajuste (5.1.1)
VNFS0100  NFS-e                   VFIS0520  Códigos de Ajuste (5.2/5.3/5.6/5.7)
VFIS0640  Faturamento de Carga    VFIS0530  Linhas de Apuração (Bloco E)
VFIS0610  Importação por Chave    VFIS0540  Lançamentos Resumo ICMS
VFIS0620  Manifestação/Inutiliz.  VFIS0550  Restituição ICMS ST
VFIS0600  SPED EFD ICMS/IPI       VFIS0560  Notas Especiais de Ajuste
```

### Financeiro e contábil
```
VFIN0100  Contas Bancárias        VFIN0400  Apuração de Impostos
VFIN0110  Condições de Pagamento  VFIN0500  Relatórios (R01–R18)
VFIN0120  Plano de Contas         VFIN0600  Adiantamentos
VFIN0130  Centros de Custo        VFIN0610  Remessa CNAB 240
VFIN0200  Contas a Pagar          VFIN0620  Conciliação OFX
VFIN0210  Contas a Receber        VCTB0102  Centro de Custo (contábil)
VFIN0300  Fluxo de Caixa          VCTB0200  Contabilidade SPED ECD
                                  VCTB0600  SPED ECD
```

### Fórmulas e regras do dia
```
Margem (%)  = (Preço Venda − Custo) / Preço Venda × 100
ATP         = saldo em mãos − reservas

Confirmar pedido  →  crédito + reserva ATP + demanda MRP
Romaneio RESERVA  ·  NF-e BAIXA
NF-e de entrada aprovada  →  gera conta a pagar automaticamente

Hierarquia de alíquotas:
VFIS0350 → VFIS0320 → VFIS0330 → VFIS0110 → VFIS0100

ICMS interestadual (CONFAZ):
7% Sul/Sudeste→N/NE/CO/ES  ·  12% demais  ·  4% importados

CC-e e cancelamento: mínimo 15 caracteres
Prazo de cancelamento: ~24 horas
```

---

# PARTE 17 — Glossário

| Termo | O que significa |
|:--|:--|
| **Aging** | Vencimentos por faixa: Vencido, 7, 15, 30, 60 dias e Acima de 60 |
| **ATP** | `saldo em mãos − reservas` — o que pode ser prometido |
| **Baixa** | Registro do pagamento (a pagar) ou recebimento (a receber) |
| **Baixa parcial** | Valor inferior ao saldo; o título fica em aberto pelo restante |
| **CC-e** | Carta de Correção Eletrônica — corrige o que **não** afeta imposto nem identidade das partes. Mínimo 15 caracteres |
| **CFOP** | Código Fiscal de Operação (4 dígitos). **Imutável** após criação |
| **Chave de acesso** | Identificador de 44 dígitos da NF-e autorizada |
| **Competência** | Período mensal de apuração, formato `AAAA-MM` |
| **Conciliação** | Conferência dos lançamentos com o extrato bancário |
| **CST** | Código de Situação Tributária |
| **DANFE** | Documento Auxiliar da NF-e (a "nota impressa") |
| **DAV** | Documento Auxiliar de Venda / Pré-Venda |
| **DIFAL** | Diferencial de Alíquota — interestadual a consumidor final não-contribuinte |
| **Divergência (romaneio)** | Conferido ≠ planejado. **Bloqueia o despacho** até o aceite |
| **DRE** | Demonstrativo de Resultado do Exercício (relatório R05) |
| **FCP** | Fundo de Combate à Pobreza — adicional sobre o ICMS |
| **IBPT** | Tabela de carga tributária aproximada (Lei da Transparência) |
| **Inutilização** | Comunica à SEFAZ uma faixa de números que **nunca foi usada** |
| **Manifestação do destinatário** | Evento sobre NF-e recebida (ciência, confirmação, desconhecimento, operação não realizada) |
| **Margem (%)** | `(Preço Venda − Custo) / Preço Venda × 100` — sobre o **preço** |
| **NCM** | Nomenclatura Comum do Mercosul (8 dígitos). **Imutável** |
| **NFC-e** | Nota Fiscal de Consumidor Eletrônica |
| **NFS-e** | Nota Fiscal de Serviço Eletrônica |
| **Partidas dobradas** | Para cada débito há um crédito de igual valor |
| **Rateio** | Distribuição de despesa/receita entre centros de custo |
| **Romaneio** | Documento logístico de saída. **Reserva**; a NF-e **baixa** |
| **Saldo aberto (orçamento)** | O que ainda não foi atendido nem cancelado — é o que a conversão copia |
| **SPED ECD** | Escrituração Contábil Digital |
| **SPED EFD** | Escrituração Fiscal Digital (ICMS/IPI) |
| **SUFRAMA** | Código para clientes da Zona Franca de Manaus |
| **Título** | Documento financeiro: obrigação de pagar ou direito de receber |
| **Valor ponderado** | Total do orçamento × probabilidade de fechamento |

---

# PARTE 18 — A corrente completa dos 4 dias

## Percorra ao contrário — do dinheiro até o cadastro

```
DINHEIRO NO CAIXA               VFIN0300
   ← veio deste TÍTULO          VFIN0210
      ← que veio desta NOTA     VFIS0200
         ← que veio deste PEDIDO          VVND0200
            ← que consumiu este PRODUTO   VPRO0900
               ← planejado aqui           VMRP0100
                  ← com este MATERIAL     VEST0100
                     ← comprado aqui      VSUP0200
                        ← deste ITEM      VENT0200
                           com esta RECEITA   VENT0210
                           e este ROTEIRO     VPRO0100
```

## O que você aprendeu em 16 horas

| Dia | Você saiu sabendo |
|:-:|:--|
| **1** | Cadastrar item, montar **BOM** e **roteiro** — a fundação |
| **2** | Comprar, receber, **inspecionar** e estocar — o abastecimento |
| **3** | **MRP → CRP → APS**, abrir e **apontar** ordem de produção — o coração |
| **4** | Vender, **faturar**, receber e ler o caixa — o giro |

> ## 🎓
> **O mesmo suporte soldado que nasceu como uma ficha no Dia 1 virou dinheiro no caixa hoje.**
>
> É assim que o sistema conversa de ponta a ponta — e é assim que você vai operar a partir de amanhã.

---

# ✅ Checklist de saída — Dia 4

**Comercial**
- [ ] Cadastro cliente completo nas 3 abas, com dados fiscais e limite de crédito
- [ ] Sei que cliente **sem limite** não sofre restrição
- [ ] Configuro permissões/restrições e sei que **restrição prevalece**
- [ ] Configuro faixas de frete sem sobreposição
- [ ] Formo preço com margem e sei que a margem é sobre o **preço de venda**
- [ ] Cadastro motivos de cancelamento antes de operar o orçamento
- [ ] Crio orçamento e **converto em pedido**
- [ ] Conheço os bloqueios de conversão
- [ ] Crio e **confirmo** um pedido de venda
- [ ] **Explico as 3 automações da confirmação**
- [ ] Trato um pedido bloqueado por crédito

**Expedição**
- [ ] Gero romaneio por auto-fill e percorro até `SHIPPED`
- [ ] **Sei que o romaneio reserva e a NF-e baixa**
- [ ] Trato divergência de conferência

**Fiscal**
- [ ] **Confiro o ambiente antes de emitir**
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
- [ ] Sei que **gerar SPED não é transmitir**

**Geral**
- [ ] **Sei percorrer a corrente inteira, do caixa ao cadastro**

---

## 📌 Suas anotações

```
Nossos clientes principais e limites de crédito:
_________________________________________________________

Margem-alvo da empresa: ______ %

Nossos CFOPs mais usados:
_________________________________________________________

Ambiente fiscal do nosso sistema: ☐ Homologação  ☐ Produção

Nossas contas bancárias e condições de pagamento:
_________________________________________________________

Canal de suporte pós-treinamento:
_________________________________________________________

Qual tela vou abrir amanhã de manhã:
_________________________________________________________
```

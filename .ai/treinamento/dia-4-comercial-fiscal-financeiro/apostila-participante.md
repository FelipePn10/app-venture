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

## 4.2 `VCUS0100` — Custos

> **O que a tela responde.** *"Quanto custa fabricar uma peça, e de onde vem cada
> centavo desse custo."* Seis abas: **Apuração do custo**, **Esquema de indiretos**,
> **Centros de trabalho**, **Custos de compra**, **Histórico** e **Rateio contábil**.

### ⚠️⚠️ O que mudou nesta versão — leia antes de usar

O motor de custo já fazia o essencial: descia a estrutura, aplicava perda, creditava
co-produto, escolhia substituto, cobrava cada operação na taxa do **seu** centro de
trabalho separando hora-máquina de hora-homem, diluía o setup pelo lote e reconhecia
operação de terceiro. Faltava o que os ERPs grandes chamam de **esquema de cálculo**:

| Lacuna | Consequência |
|:--|:--|
| **Os indiretos não entravam.** `overhead` era gravado **sempre zero** — a coluna existia e não havia como configurar | Energia, depreciação, supervisão e aluguel **não chegavam ao custo do produto**. O custo saía sistematicamente **abaixo** do real |
| **O custo saía em dois números** — "material" e "operação" | Sem separar preparação, máquina, mão de obra e terceiro, não se sabe **o que atacar** |
| **Não havia nível próprio × nível inferior** | Um aumento no custo não dizia se veio **da fábrica** ou **do que se comprou** |
| **Toda apuração sobrescrevia a anterior** | Não se respondia *"por que o custo subiu 12% este mês"* |

> **As quatro estão fechadas.** Se você tem custo apurado de antes, **reapure**: o
> número anterior não tinha indireto nenhum.

### 4.2.1 Aba **Apuração do custo**

| Campo | Observação |
|:--|:--|
| **Item** ✅ | 🔍 lupa |
| **Lote de referência** | O setup é **diluído por ele**. Com `1`, cada peça carrega o setup inteiro — é o número conservador |

Clique **Apurar custo**. A tela devolve três blocos.

**Bloco 1 — indicadores**

| Indicador | O que é |
|:--|:--|
| **Custo total unitário** | O número final |
| **Esta etapa agrega** | Nível próprio: conversão + indiretos desta fábrica |
| **Veio dos componentes** | Nível inferior: o custo total do que está abaixo na estrutura |
| **Indiretos no total** | Que fatia do custo é indireto |

**Bloco 2 — composição, componente a componente**

| Componente | O que é | O que fazer se estiver alto |
|:--|:--|:--|
| **Material** | Componentes comprados, com perda e crédito de co-produto aplicados | Negociar compra, revisar perda da estrutura |
| **Preparação (setup)** | Diluída pelo lote informado | **Aumentar o lote** — é o único componente que o lote reduz |
| **Hora-máquina** | Ocupação do equipamento na taxa do CT de cada operação | Outro recurso, outro roteiro |
| **Mão de obra direta** | Horas-homem, já multiplicadas pelo tamanho da equipe | Revisar equipe no roteiro |
| **Serviço de terceiro** | Operações externas, no preço vigente do fornecedor | Internalizar, ou renegociar |
| **Indiretos** | Aplicados pelo esquema de rateio | Ver aba *Esquema de indiretos* |

> ⚠️ **Se "Indiretos" vier zero e houver um aviso amarelo no topo**, é porque
> **nenhuma regra está cadastrada**. O custo está incompleto — falta energia,
> depreciação, supervisão e aluguel.

**Bloco 3 — de onde vem cada centavo de indireto**

Uma linha por regra aplicada: **Regra · Base · Método · Taxa · Valor da base ·
Aplicado**. É o que você mostra quando alguém questionar o custo.

**Bloco 4 — composição pela estrutura**

A árvore, um nível por linha, com todos os componentes abertos.

> 💡 **Cada nível mostra o que ELE agrega.** O que o pai recebe de um componente é o
> **total** dele — é por isso que a hora-máquina do filho **não** soma na
> hora-máquina do pai. Ela já está dentro do total que subiu.

### 4.2.2 Aba **Esquema de indiretos** ⭐ (nova)

> **O que é.** As regras que trazem energia, depreciação, supervisão e aluguel para
> dentro do custo do produto. É o equivalente ao **esquema de cálculo** do SAP, às
> **taxas de CIF** do TOTVS e às **despesas indiretas** do Focco.

| Campo | O que é |
|:--|:--|
| **Código** ✅ | `CIF-ENERGIA`, `CIF-SUPERV`… |
| **Descrição** ✅ | **Escreva o motivo.** É o que explica o indireto quando alguém questionar |
| **Incide sobre** ✅ | A base — ver tabela abaixo |
| **Método** ✅ | Percentual · R$ por hora · R$ por unidade |
| **Taxa** ✅ | Em **percentual** (`12` para 12%) ou em **reais**, conforme o método |
| **Vigente de** ✅ / **Vigente até** | Em branco no "até": vale indefinidamente |
| **Só no centro de trabalho** | 🔍 lupa. Energia caríssima só na usinagem, por exemplo |
| **Só no item** | 🔍 lupa. Um produto com tratamento próprio |
| **Conta contábil do indireto** | 🔍 lupa. Liga o indireto do produto ao que a contabilidade lançou |
| **Centro de custo de origem** | 🔍 lupa |

#### As sete bases

| Base | Incide sobre | Exemplo de uso |
|:--|:--|:--|
| **Material** | O material do item | Armazenagem, seguro de estoque |
| **Preparação (setup)** | O custo de preparação | Ferramental de setup |
| **Hora-máquina** | A ocupação de máquina | **Energia**, depreciação do equipamento |
| **Hora-homem** | A mão de obra direta | Encargos, supervisão de produção |
| **Conversão** | Setup + máquina + homem | Aluguel do galpão, custo fixo de fábrica |
| **Serviço de terceiro** | O que foi para fora | Frete e controle do serviço externo |
| **Custo total antes dos indiretos** | Tudo somado | Administração geral rateada ao produto |

#### Os três métodos

| Método | Como calcula | Quando usar |
|:--|:--|:--|
| **Percentual sobre a base** | `base × taxa` | Quando o indireto acompanha o valor |
| **R$ por hora da base** | `horas × taxa` | **Energia** (R$/h de máquina), supervisão (R$/h de homem). ⚠️ Só sobre bases medidas em horas |
| **R$ por unidade produzida** | valor fixo por peça | Embalagem, etiqueta, custo por peça independente de valor |

> ⭐⭐ **A ordem de aplicação é FIXA, não a ordem de cadastro.** Primeiro as bases
> específicas (material, setup, máquina, homem, terceiro), depois **Conversão**,
> depois **Total**. E **nenhum indireto incide sobre outro** — a base de *Total* é
> material + conversão + terceiro, sem o indireto já aplicado.
>
> **Por que isso importa:** sem essa regra, duas instalações com as **mesmas** regras
> cadastradas em ordem diferente chegariam a **custos diferentes** — e ninguém
> conseguiria explicar a divergência.

> ⚠️ **O erro de digitação mais provável: `12` em vez de `0,12`.** O campo pede
> **percentual** (digite `12`), e o sistema guarda a fração. Se você informar por API,
> mande `0.12` — a validação recusa acima de 100% e diz o número certo na mensagem.

> ⚠️ **Desativar não apaga.** As apurações antigas apontam para a regra; apagá-la
> deixaria o histórico sem explicação. A regra desativada continua na lista, apagada.

> ⚠️ **Regra fora de vigência não aplica.** Uma regra vencida ontem simplesmente não
> entra — e o custo sai plausível, só menor. Confira a vigência quando o indireto
> "sumir".

### 4.2.3 Aba **Centros de trabalho**

| Campo | O que é |
|:--|:--|
| **Centro de trabalho** ✅ | 🔍 lupa |
| **R$ por hora-máquina** | Ocupação do equipamento, rode ele sozinho ou não |
| **R$ por hora-homem** | ⭐ **Multiplicada pelo tamanho da equipe** do roteiro |

> ⭐ **Separar máquina de homem é o que permite custear** um roteiro em que a máquina
> roda sozinha (só hora-máquina) ou em que dois operadores atendem um equipamento
> (hora-homem × 2).

⚠️ **Sem taxa cadastrada, o roteiro não gera custo de conversão** — o custo sai só
com material, e ninguém percebe.

### 4.2.4 Aba **Custos de compra**

O custo das **folhas** da estrutura: o que a apuração usa como material.

⚠️ **Alterar aqui não reapura sozinho** os produtos que consomem o item. Rode a
apuração deles.

### 4.2.5 Aba **Histórico** ⭐ (nova)

Escolha o item e consulte. A tela mostra duas coisas:

**1. O que mudou desde a apuração anterior** — componente a componente, com a
variação em reais e em percentual. O que subiu aparece em **vermelho**.

> ⭐ **É esta tabela que responde "por que o custo subiu 12%".** Se a variação está
> em *Material*, foi compra; em *Hora-máquina*, foi taxa de centro; em *Indiretos*,
> foi regra nova.

**2. A série de apurações** — uma linha por apuração, com todos os componentes.

> ⚠️ **Duas apurações só são comparáveis com o MESMO lote**, porque a preparação é
> diluída por ele. A tela mostra o lote de cada uma para você conferir.

> ⭐ **O histórico não é sobrescrito nem apagado.** O banco recusa alteração: uma
> apuração passada é fato consumado, e reescrevê-la apagaria a explicação de uma
> variação já analisada.

### 4.2.6 Aba **Rateio contábil**

> ⚠️ **Não confunda com o Esquema de indiretos.** Esta aba distribui custo **entre
> centros de custo** (contabilidade); o esquema de indiretos leva custo **para o
> produto**. São dois movimentos diferentes.

**Base de alocação** — o critério do rateio: horas-máquina, área ocupada, número de
pessoas. **Distribuição** — de qual centro sai, para qual vai, em que período, por
percentual fixo ou por base.

### 4.2.7 ⭐ A ordem de cadastro, se você está começando

```
1. Custos de compra      →  quanto custa o material comprado
2. Centros de trabalho   →  R$/hora de máquina e de homem
3. Esquema de indiretos  →  energia, depreciação, supervisão, aluguel
4. Apuração do custo     →  roda o cálculo
5. Histórico             →  acompanha a variação mês a mês
```

Pular o passo 3 é o que produz custo sistematicamente abaixo do real.

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
PENDENTE → EM_ANALISE → AGUARDANDO_RETORNO / AGUARDANDO_PEDIDO → ATENDIDO → ENCERRADO
                                                              (ou CANCELADO)
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
2. **Separar (reserva):** reserva o estoque (`ABERTO → SEPARADO`).
3. **Conferir itens:** registre a quantidade conferida de cada item.
   ⚠️ *Sobra/falta gera **divergência** (⚠️), que **bloqueia o despacho** salvo aceite explícito.*
4. **Conferir romaneio** (exige **todos** os itens conferidos): `SEPARADO → CONFERIDO`.
5. **Packing:** adicione **volumes** (Caixa, Pallet, Fardo… com peso e dimensões).
   ⭐ *A cubagem é calculada de L×A×C.*
6. **Transporte:** modalidade de frete (CIF/FOB…), valor, placa, motorista, **ANTT**, lacres, previsão de entrega.
7. Emita a **NF-e de saída** e **Vincule a NF-e** ao romaneio.
8. **Despachar** (`CONFERIDO → DESPACHADO`): consome as reservas. Se houver divergência, marque **aceitar divergência**.
9. **Exporte** em **PDF** ou **Excel**.

### Ciclo de vida
```
ABERTO ──separar──► SEPARADO ──conferir──► CONFERIDO ──despachar──► DESPACHADO
  │  (reserva)         │  (todos itens)        │  (sem divergência
  └──────────────── CANCELADO (libera reservas) ─────── ou aceite)
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
ABERTO → LIBERADO → EM_CARREGAMENTO → CARREGADO → DESPACHADO
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

> **Para que serve.** É o **piso** da tributação: o que vale quando nenhuma regra
> mais específica alcança a operação. Toda nota emitida passa por aqui, mesmo que
> você nunca abra a tela — por isso cadastro incompleto aqui não dá erro: dá nota
> com imposto a menos.

A tela tem **três abas**, e cada uma responde a uma pergunta diferente.

### 9.2.1 Aba **NCM — IPI, PIS e COFINS**

Responde: *"quanto de IPI, PIS e COFINS incide sobre esta mercadoria?"* — a
mercadoria é identificada pela sua classificação fiscal (NCM).

| Campo | O que é | Como preencher |
|:--|:--|:--|
| **NCM** (busca) | Lupa que lista os NCMs **já cadastrados** | Escolher um NCM existente **carrega a tributação atual** para você conferir antes de alterar. Use sempre que a mercadoria já tiver tributação definida — é o que evita cadastrar o mesmo NCM duas vezes com alíquotas diferentes |
| **NCM (digitar)** | O código em si, **8 dígitos** | Só dígitos; o contador ao lado mostra `n/8`. Com 4 ou 6 dígitos a nota sai com classificação incompleta e a SEFAZ rejeita |
| **Descrição da mercadoria** | Texto livre | Não vai na nota. Serve para **quem confere** saber o que aquele número classifica. Preencha: seis meses depois ninguém lembra que `76169900` é "outras obras de alumínio" |
| **Alíquota IPI (%)** | Percentual do IPI | Digite **em percentual**: `6,5` para 6,5%. Zero é resposta válida (mercadoria não tributada) |
| **Alíquota PIS (%)** | Percentual do PIS | `0,65` no regime **cumulativo** · `1,65` no **não cumulativo** |
| **Alíquota COFINS (%)** | Percentual da COFINS | `3,00` no **cumulativo** · `7,60` no **não cumulativo** |
| **CST IPI** | Situação tributária do IPI | `50` saída tributada · `51` isenta · `52` suspensão · `53` saída não tributada |
| **CST PIS** | Situação tributária do PIS | `01` tributado alíquota normal · `06` alíquota zero · `07` isento · `08` sem incidência |
| **CST COFINS** | Situação tributária da COFINS | Na prática **acompanha o CST do PIS** — as duas contribuições andam juntas |

> ⚠️ **Regime cumulativo × não cumulativo.** As alíquotas de PIS/COFINS dependem do
> regime da EMPRESA, não da mercadoria. Lucro Presumido normalmente é cumulativo
> (0,65% / 3,00%); Lucro Real é não cumulativo (1,65% / 7,60%). Errar isso erra
> **todas** as notas. Confirme com o contador antes de cadastrar o primeiro NCM.

**Campo de busca da lista.** A tabela de NCM de uma indústria passa facilmente de
cem linhas. O campo *Buscar por NCM ou descrição* filtra pelos dois — digite `8471`
ou `monitor`. Cada linha tem **Alterar** (carrega no formulário) e **Desativar**.

> ⚠️ **Desativar um NCM** faz as notas novas com aquela mercadoria saírem **sem** IPI,
> PIS e COFINS configurados. A tela avisa antes de confirmar.

### 9.2.2 Aba **ICMS Interno por UF**

Responde: *"quanto de ICMS incide quando vendo dentro do estado?"*

| Campo | O que é | Como preencher |
|:--|:--|:--|
| **UF** | Lista fechada das 27 unidades federativas, com o nome do estado | Escolher uma UF **já cadastrada** carrega as alíquotas atuais |
| **Alíquota ICMS (%)** | Alíquota interna do estado | `18` em SP · `18` em MG · `20` no RJ (confira: muda por lei estadual) |
| **Alíquota FCP (%)** | Fundo de Combate à Pobreza | `0` quando o estado não cobra. Onde existe, some à alíquota do ICMS na nota |

> 💡 **Por que a UF virou lista.** Era campo de texto livre, e `Sp`, `sp` ou `SPO`
> gravavam uma alíquota que **nenhuma nota encontrava** depois — a busca procura por
> `SP`. Com lista fechada o erro não acontece.

O rodapé mostra `n de 27`: é o quanto do país está coberto. Você só precisa das UFs
para as quais realmente vende.

### 9.2.3 Aba **ICMS Interestadual**

Responde: *"quanto de ICMS incide quando vendo para outro estado?"* — e a resposta
depende do **par origem → destino**.

| Campo | O que é |
|:--|:--|
| **UF de origem** | De onde a mercadoria sai — normalmente a UF do emitente |
| **UF de destino** | Para onde vai. Escolher um par já cadastrado carrega a alíquota atual |
| **Alíquota ICMS (%)** | A alíquota do par |

#### ⭐ As alíquotas interestaduais (CONFAZ) — o que decorar

```
 7%   Sul / Sudeste (exceto ES)   →   Norte, Nordeste, Centro-Oeste e ES
12%   Todos os outros pares entre estados
 4%   Operações interestaduais com PRODUTO IMPORTADO (qualquer par)
```

> ⚠️ **Origem igual ao destino é operação interna**, e a tela recusa: a alíquota
> dessa operação vive na aba *ICMS Interno*. Aceitar aqui criaria duas fontes de
> verdade para o mesmo imposto — e quando as duas divergem, ninguém descobre qual
> a nota usou.

O campo *Filtrar por UF* mostra os pares em que aquela UF aparece como origem **ou**
destino — é assim que se confere "para quais estados eu já tenho alíquota".

### 9.2.4 ⚠️ O detalhe que mais gera retrabalho

**As alíquotas são digitadas em PERCENTUAL e guardadas como FRAÇÃO.** Você digita
`18`; o sistema guarda `0,18`. A tela cuida da conversão nos dois sentidos, e todas
as colunas mostram `%`.

> Isso importa porque, se você olhar o banco ou uma exportação técnica, vai ver
> `0,18` — e isso está **certo**. Não "corrija" para 18 por fora da tela: isso
> gravaria 1800%.

---

## 9.2.5 `VFIS0320` — Parâmetros de ICMS e IPI

> **Por que esta tela vem junto com a VFIS0110.** As duas respondem à mesma
> pergunta — "qual alíquota usar?" — em **níveis diferentes de precisão**. A
> VFIS0110 diz "IPI deste NCM é 6,5%". A VFIS0320 diz "**mas** quando vendo este
> NCM para o Paraná, para contribuinte, na operação de venda, o ICMS é 12% com
> redução de base de 33,33% amparada no artigo tal". Quando existe parâmetro, ele
> **ganha** da tabela tributária.
>
> Na prática: **VFIS0110 é o piso; VFIS0320 é a exceção.** Comece pela VFIS0110 e
> só cadastre VFIS0320 quando houver um tratamento específico a registrar.

### Aba **Parâmetros ICMS** — grupo *Identificação*

Define **para qual operação** o parâmetro vale. É a chave de busca.

| Campo | O que é | Cuidado |
|:--|:--|:--|
| **UF** | Estado de destino da operação | Obrigatório: o tratamento muda por estado |
| **NCM** | Aplica a todos os itens daquela classificação | ⚠️ **Informe NCM OU Código Item, nunca os dois.** O cabeçalho da tela lembra isso |
| **Código Item** | Aplica a um item específico | Mais preciso que o NCM; use quando um único produto tem tratamento próprio |
| **Máscara do item** | Variante do item (cor, dimensão) | Em branco, vale para todas as variantes |
| **Tipo Operação** | Venda, devolução, remessa, bonificação… | É o que separa "vender" de "devolver": o CST muda |
| **Cliente** / **Estabelecimento do cliente** | Restringe a um cliente ou a uma filial dele | Use para regime especial concedido a um cliente específico |
| **Tipo de NF — saída / entrada** | Espécie do documento | Casa o parâmetro com a natureza da nota |
| **Descrição** | Texto livre | **Escreva o motivo do parâmetro aqui.** É o que responde "por que esta nota saiu com 12%?" meses depois |

### Grupo *ICMS — alíquota, redução, diferimento e acréscimos*

A separação **Contribuinte × Não-Contribuinte** aparece em quase todo campo, e é a
distinção mais importante da tela: a mesma mercadoria, para o mesmo estado, tem
tratamento diferente se o destinatário é empresa inscrita no ICMS ou consumidor
final.

| Campo | O que é |
|:--|:--|
| **% ICMS Contrib.** / **Não-Contrib.** | A alíquota efetiva em cada caso |
| **CST Contrib.** / **Não-Contrib.** | Situação tributária (`00` tributada integralmente, `20` com redução, `40` isenta, `41` não tributada, `51` diferimento, `60` ST já recolhida…) |
| **CSOSN** | Código equivalente para emitente do **Simples Nacional** |
| **Situação B** | Situação tributária complementar exigida por alguns estados |
| **CST devolução Contrib.** / **Não-Contrib.** | O CST muda na devolução; sem estes campos a nota de devolução sai com o CST da venda |
| **Dispositivo legal Contrib.** / **Não-Contrib.** | O **embasamento** da alíquota diferenciada (cadastrado em `VFIS0310`). ⚠️ Alíquota reduzida sem dispositivo legal na nota é autuação |
| **% redução Contrib.** / **Não-Contrib.** + **Incide sobre** | Redução de base de cálculo. `Incide sobre` diz sobre qual base a redução é aplicada |
| **Disp. legal redução** (cada um) | Embasamento da redução |
| **% diferimento** + **Incide sobre** + **Dispositivo legal** | Parcela do imposto **postergada** para etapa seguinte. É o tratamento da industrialização em SP (Portaria CAT 22/2007) |
| **Código do benefício (RBC)** | Código do benefício fiscal na tabela nacional; obrigatório na NF-e quando há benefício |
| **% acréscimo Contrib.** / **Não-Contrib.** + **Natureza** | Acréscimos sobre a base (frete, seguro, despesas) e a natureza de cada um |

### Grupo *Substituição tributária e DIFAL*

| Campo | O que é |
|:--|:--|
| **% ST Contrib.** / **Não-Contrib.** / **uso e consumo** | Alíquota da substituição tributária em cada destinação |
| **% redução da ST** + **Disp. legal** | Redução da base da ST |
| **% ICMS interno** | Alíquota interna do estado de DESTINO — é a base do cálculo da ST |
| **Modalidade da base (modBCST)** | Como a base da ST é formada: MVA, pauta, preço tabelado, valor da operação. Vai na NF-e |
| **% p/ ST Contrib.** / **Não-Contrib.** | MVA (margem de valor agregado) aplicada |
| **% FCP-ST partilha** | Fundo de Combate à Pobreza dentro da ST |
| **Tratamento** (DIFAL) | Como o diferencial de alíquota é tratado |
| **% redução** / **% redução na compra** / **Incide sobre (compra)** | Reduções específicas do DIFAL |
| **Dif. alíquota ST uso/consumo** | Diferencial na aquisição para uso e consumo |

> ⚠️ **ST e DIFAL não se somam por acidente.** Operação com ST recolhida na origem
> (CST `60`) **não** tem DIFAL. Se você cadastrar os dois no mesmo parâmetro, a nota
> sai com imposto a mais — e o cliente reclama antes do fisco.

### Grupo *IPI*

| Campo | O que é |
|:--|:--|
| **CST saída** / **CST entrada** | Situação tributária do IPI em cada sentido |
| **Origem da classificação** | De onde vem a classificação fiscal aplicada |
| **% redução Contrib.** / **Não-Contrib.** + **Incide sobre** + **Dispositivo legal** | Redução de base do IPI, com embasamento |

### Grupo *Regimes especiais, FCI e benefícios*

| Campo | O que é |
|:--|:--|
| **Anexo do Simples** | Anexo da LC 123 aplicável quando o emitente é Simples Nacional |
| **% ICMS origens 1, 2, 3 e 8** | Alíquota para mercadoria **importada** (origens 1, 2, 3 e 8 da tabela de origem) |
| **% ST origens 1, 2, 3 e 8** | ST para mercadoria importada |
| **CST do FCI** | Situação tributária ligada à Ficha de Conteúdo de Importação |
| **Geral** / **Contribuinte** / **Não contribuinte** (benefícios) | Códigos de benefício aplicáveis a cada caso |

### ⚠️ Os três erros mais comuns na VFIS0320

1. **Preencher NCM e Código Item juntos.** A tela pede um ou outro; com os dois, a
   busca fica ambígua.
2. **Cadastrar alíquota reduzida sem dispositivo legal.** A nota sai, a SEFAZ
   autoriza — e a autuação vem depois, porque a redução não tem amparo declarado.
3. **Esquecer o CST de devolução.** Só aparece quando a primeira devolução acontece,
   e aí a nota já saiu com o CST da venda.

### 💡 Como testar se o parâmetro funcionou

Emita a **prévia** de uma NF-e (`VFIS0200`) para um cliente daquela UF com aquele
item. A prévia mostra a alíquota aplicada **sem transmitir nada** à SEFAZ. Se a
alíquota não for a esperada, percorra a escada da seção 9.3 de cima para baixo.

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

### Mestre fiscal e herança no item

Em `VFIS0350`, cadastre a classificação com sua **vigência**, NCM, CEST, origem,
unidades e padrões de IPI, ICMS, PIS e COFINS. Em seguida, associe-a ao item em
`VENT0200` → aba **Contábil**, separando os contextos de **Compra** e **Venda**.

O campo **Cálculo de PIS/COFINS** possui três estados:

| Escolha no item | Resultado |
|:--|:--|
| **Herdar do mestre fiscal** | Usa o padrão vigente; a origem aparece como `HERDADO` |
| **Sobrescrever: Sim** | Força o cálculo neste item; origem `SOBRESCRITO` |
| **Sobrescrever: Não** | Força a não calcular neste item; origem `SOBRESCRITO` |

⚠️ **Ausente não é igual a Não.** Ausente significa acompanhar o mestre; “Não” é
uma decisão explícita do item. Se o padrão do mestre mudar, somente os itens em
**Herdar** acompanham a alteração.

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
| `VFIS0350` | Mestre de Classificações Fiscais — vigência, NCM, CEST, origem, unidades e padrões de IPI/ICMS/PIS/COFINS |
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

**O título que a venda gerou.** A tela tem duas abas: **Carteira** (consulta e
baixa) e **Novo título** (cadastro manual).

### 12.2.1 Aba **Carteira** — o painel de idade

No topo, a **composição por idade** da carteira: `Vencido`, `7`, `15`, `30`,
`60 dias`, `Acima de 60` e **Total a receber**.

> ⚠️ **Estes cartões são da carteira INTEIRA**, sempre — eles não acompanham o
> filtro. É deliberado: eles respondem *"quanto está vencido no total"*, e recortá-los
> pelo filtro os transformaria numa soma do que já está na grade logo abaixo.

### 12.2.2 Aba **Carteira** — o filtro (⭐ mudou nesta versão)

| Campo | Para que serve |
|:--|:--|
| **Cliente** | 🔍 Lupa. Toda a carteira de um cliente |
| **Situação** | Pendente · Recebido em parte · Recebido · Quitado · Cancelado |
| **Período por** | **Vencimento** ou **Emissão** — escolha qual data o período filtra |
| **De** / **Até** | O período em si |
| **Nº do documento** | Casa por **trecho**: `1001` encontra `NF-1001/2` |
| **Valor de** / **Valor até** | Faixa de valor bruto |
| **Só títulos vencidos e em aberto** | Caixa de marcação. Vencimento no passado **E** título não quitado |

> ⭐ **Vencimento × Emissão — por que a escolha existe.** Quem **cobra** pergunta
> "o que vence nesta semana" (vencimento). Quem **confere a conta com o cliente**
> pergunta "o que faturamos em setembro" (emissão). São duas perguntas diferentes
> sobre os mesmos títulos, e antes só a primeira era possível.

> ⚠️ **O que mudou e por quê.** Até esta versão havia **um** seletor de situação — e
> ele **não funcionava**. O servidor lia o filtro do corpo de uma requisição `GET`
> (nenhum navegador envia corpo em `GET`), e comparava `pendente` com a coluna que
> grava `PENDENTE`. O sintoma não era erro: a tela mostrava **a carteira inteira**
> com o filtro marcado, e quem consultava concluía que não havia título vencido.
> **Se você usou este filtro antes e confiou no resultado, reconfira.**

### 12.2.3 Aba **Carteira** — a grade

| Coluna | Observação |
|:--|:--|
| **Documento** | Mostra `parcela n/total` embaixo quando o título é parcelado |
| **Cliente** | Nome resolvido do código |
| **Emissão** / **Vencimento** | O vencimento traz os **dias de atraso** embaixo (`12 dia(s) em atraso`, `vence hoje`, `em 5 dia(s)`) e fica **vermelho** quando vencido e em aberto |
| **Valor** / **Recebido** / **Saldo** | Saldo só aparece em título aberto |
| **Situação** | Etiqueta colorida |
| **Ações** | **Baixar** e **Cancelar** em títulos abertos; em títulos encerrados, a data do recebimento |

O **rodapé da tabela** soma valor, recebido e saldo dos títulos **mostrados**.

### 12.2.4 Baixa (recebimento)

1. Clique **Baixar** num título aberto.
2. **Conta bancária que recebeu** ✅ (🔍 lupa) · **Valor recebido** ✅ · **Data do recebimento** ✅ · Observação.
3. **Confirmar baixa**.

> ⚠️ **A conta bancária NÃO vem preenchida.** Antes assumia a primeira da lista, e
> confirmar sem olhar creditava o recebimento na conta errada. Agora é escolha
> obrigatória.

> ⭐ **Recebimento parcial é nativo.** Valor menor que o saldo registra parcial, e a
> mensagem diz o saldo restante. Valor **acima** do saldo é recusado com os dois
> números na mensagem.

### 12.2.5 Aba **Novo título**

| Campo | Observação |
|:--|:--|
| **Nº do documento** ✅ | |
| **Cliente** | 🔍 lupa |
| **Nota fiscal de saída** | 🔍 lupa — ⭐ **busca pelo NÚMERO e série da nota** |
| **Pedido de venda** | 🔍 lupa. Fecha o ciclo pedido → nota → recebimento |
| **Emissão** / **Vencimento** ✅ | Vencimento anterior à emissão é recusado |
| **Valor bruto** ✅ / **Desconto** | Desconto maior que o bruto é recusado |
| **Valor líquido** | Calculado, somente leitura |
| **Forma de recebimento** | Lista fechada: Boleto · Transferência · PIX · Dinheiro · Cartão · Cheque · Débito automático · Outra |
| **Parcela** / **de** | Parcela maior que o total é recusada |

> ⭐ **"NF Saída (ID)" acabou.** Era um campo numérico para digitar o **identificador
> interno da nota no banco de dados** — número que ninguém sabe de cabeça, e que o
> campo aceitava sem conferir: o título ficava vinculado à nota errada **sem nenhum
> aviso**. Agora você busca `NF 5911/1 · CLIENTE · R$ 412,60` e o sistema resolve o
> vínculo interno.

> 💡 **Forma de pagamento virou lista** pelo mesmo motivo: era texto livre, e
> `boleto`, `Boleto` e `BOL` viravam **três formas diferentes** nos relatórios.

### Ciclo de situação
```
PENDENTE (âmbar) → PARCIAL (azul) → RECEBIDO / PAGO (verde)
                                  → CANCELADO (vermelho)
```

⭐ **Sem fluxo de aprovação** — ao contrário do Contas a Pagar.

---

## 12.3 `VFIN0200` — Contas a Pagar

**O título que a compra do Dia 2 gerou.** Mesma estrutura de duas abas do
VFIN0210, com o que é próprio do lado a pagar.

> ⭐ **INTEGRAÇÃO CRÍTICA:** aprovar uma **NF-e de Entrada** no `VFIS0210` **gera
> automaticamente** uma conta a pagar aqui.

### 12.3.1 O ciclo — diferente do Receber
```
PENDENTE ──aprovar──▶ APROVADO ──pagar──▶ PAGO
    │                     │
    └─rejeitar (c/ motivo)─┴──cancelar──▶ CANCELADO
```

> ⭐ **Por que a assimetria.** Você quer um segundo olhar antes de **tirar** dinheiro
> do caixa, não antes de colocar. O botão **Pagar** só aparece depois da aprovação.

⚠️ **A rejeição exige motivo.** A tela pergunta, e o texto fica registrado — é o
que você responde ao fornecedor quando ele cobrar.
⚠️ **Cancelamento não tem desfazer.**

### 12.3.2 O filtro — tudo do VFIN0210, mais o que é do lado a pagar

Além de fornecedor, situação, período (vencimento ou emissão), documento, faixa de
valor e "só vencidos":

| Campo | Para que serve |
|:--|:--|
| **Conta do plano** | 🔍 Lupa. "Tudo que foi classificado em despesa com energia" |
| **Centro de custo** | 🔍 Lupa. "Tudo que a usinagem gastou no mês" |

### 12.3.3 A grade

Tem uma coluna a mais que o Receber: **Aprovação** — `Aguardando aprovação`,
`Aprovado` ou `Rejeitado`, separada da situação do título.

> 💡 **Por que duas colunas de situação.** Um título pode estar **aguardando
> aprovação** e **já vencido** ao mesmo tempo. São dois problemas diferentes, com
> dois responsáveis diferentes.

O indicador **Aguardando aprovação** aparece no painel de idade quando há títulos
parados — é a fila que trava o pagamento.

### 12.3.4 Aba **Novo título** — os campos próprios

| Campo | Observação |
|:--|:--|
| **Tipo de documento** | Lista fechada: NF-e · NFS-e · CT-e · Fatura · Recibo · Boleto · Contrato · Outro |
| **Nota fiscal de entrada** | 🔍 lupa — ⭐ era `NF Entrada (ID)` |
| **Pedido de compra** | 🔍 lupa. Fecha o ciclo pedido → nota → pagamento |
| **Conta do plano** | 🔍 lupa — ⭐ era `Plano Contas (ID)` |
| **Centro de custo** | 🔍 lupa — ⭐ era `Centro Custo (ID)` |

> ⭐ **Os três campos "(ID)" acabaram.** Eram campos numéricos pedindo o
> identificador do registro no banco. Além de ninguém saber esses números, **qualquer
> valor era aceito** — o título ficava classificado na conta contábil errada, e isso
> só aparece no fechamento.

### 12.3.5 Baixa (pagamento)

Igual à do Receber, com **Conta bancária de onde sai** (🔍 lupa, sem valor
pré-escolhido) · **Valor pago** · **Data do pagamento** · Observação.

---

## 12.4 `VFIN0300` — Fluxo de Caixa & Saldos

Tela **consultiva** — três abas. É o espelho de tudo o que aconteceu no caixa.

### 12.4.1 Aba **Realizado** — o que entrou e saiu

**Parâmetros:** Início **e** Fim · **Agrupar** (Dia / Semana / Mês, só afeta o gráfico).

**Recortes** (⭐ novos):

| Campo | Para que serve |
|:--|:--|
| **Conta bancária** | 🔍 Lupa. ⭐ Com mais de uma conta, o caixa somado **não responde** se há saldo NA conta de onde o pagamento vai sair |
| **Tipo de movimento** | Entradas e saídas · Só entradas · Só saídas |
| **Buscar no histórico** | Cliente, fornecedor, documento |

**O que a aba mostra:**
1. **Gráfico** de entradas (verde) e saídas (vermelho) por dia, semana ou mês, com o **saldo acumulado** no rótulo de cada coluna.
2. **Indicadores**: Entradas · Saídas · Saldo do período (vermelho quando negativo) · Lançamentos.
3. **Tabela** cronológica: Data · Tipo · Histórico · **Conta** · Conciliado (Sim/Não) · Valor. O rodapé traz o saldo do período.

> ⚠️ **Os títulos precisam ter sido BAIXADOS** para aparecerem aqui. Título em
> aberto é previsão, e previsão vive na aba **Projetado**.

### 12.4.2 Aba **Projetado** — o que ainda vai acontecer

**Parâmetro:** apenas *A partir de* — é uma projeção para frente.

Mostra o mesmo gráfico e, ⭐ **novo**, os **totais**: A receber · A pagar · **Saldo
projetado** · Títulos. Antes havia a curva e nenhum número.

⚠️ **Não tem conciliação** — são previsões, não movimento de banco.

### 12.4.3 Aba **Saldos das contas**

Contas · **Saldo total** · e o saldo de cada conta, com o negativo em vermelho.

⭐ Saldo = **saldo inicial** do `VFIN0100` + **todas as baixas** registradas.

> ⚠️ **Tudo aqui é leitura.** Para mudar qualquer número, vá à tela de origem:
> `VFIN0200` (a pagar), `VFIN0210` (a receber), `VFIN0100` (cadastro da conta).

> ## ⭐ O caixa é o espelho de tudo
>
> A **venda** virou **nota** → a nota virou **título a receber** → o título baixado
> entra no **fluxo de caixa**. A **compra** do Dia 2 virou **título a pagar** e sai
> pelo mesmo caixa.

---

## 12.5 `VFIN0600` — Adiantamentos de Clientes e Fornecedores

> **O que é.** Dinheiro que mudou de mãos **antes de existir título**: pagamento
> antecipado a fornecedor ou recebimento antecipado de cliente. O caixa se move no
> registro; o **saldo** fica guardado para abater títulos depois.

> ⭐ **Esta tela é nova.** Antes era um formulário de JSON genérico: você digitava
> `{"tipo":"PAGAR","conta_bancaria_id":1,...}` à mão, sem lista de saldos, sem
> escolher a conta numa busca e sem saber em qual título aplicar. Registrar era
> possível; **usar** o saldo, na prática, não.

### 12.5.1 Aba **Saldos disponíveis**

Indicadores: **Adiantado a fornecedores** · **Recebido de clientes** · **Com saldo a
aplicar** · **Registrados**. Filtro por **Tipo** e **Parceiro** (🔍 lupa).

A grade traz `#` · Tipo · Parceiro · Documento · Data · Valor · **Aplicado** ·
**Saldo** · Situação · **Aplicar**.

| Situação | Significa |
|:--|:--|
| **Saldo integral disponível** | Nada aplicado ainda |
| **Saldo usado em parte** | Parte já abateu título |
| **Saldo todo aplicado** | Acabou |
| **Cancelado** | Linha aparece apagada |

### 12.5.2 Aplicar o saldo em um título

Clique **Aplicar**. A tela carrega **somente** os títulos em aberto **do mesmo
parceiro** e **do lado certo** da operação, e propõe o menor valor entre o saldo do
adiantamento e o saldo do título.

> ⚠️ **A regra que a tela protege.** Adiantamento **pago a fornecedor** só abate
> conta **a pagar**; **recebido de cliente** só abate conta **a receber**. Cruzar os
> dois abateria a dívida com um parceiro usando o crédito de outro — por isso a
> lista já vem filtrada, e não há como escolher errado.

> 💡 **Um adiantamento grande pode abater vários títulos** ao longo do tempo. O saldo
> diminui a cada aplicação, e a situação acompanha.

### 12.5.3 Aba **Novo adiantamento**

| Campo | Observação |
|:--|:--|
| **Tipo** ✅ | *Pago a fornecedor* ou *Recebido de cliente*. A dica embaixo diz se o valor SAI ou ENTRA da conta |
| **Fornecedor / Cliente** ✅ | 🔍 lupa — muda conforme o tipo. Trocar o tipo **limpa** a escolha, porque o parceiro deixa de existir na lista certa |
| **Conta bancária** ✅ | 🔍 lupa. O rótulo diz "de onde sai" ou "onde entra" conforme o tipo |
| **Valor** ✅ | Maior que zero |
| **Data** ✅ | Não aceita data futura: o caixa se move nesta data |
| **Documento** / **Descrição** | Recibo, contrato, comprovante |

⚠️ **Registrar move o caixa imediatamente.** Não é uma promessa — é um movimento.
⚠️ **A aplicação não tem exclusão.**

---

## 12.6 `VFIN0620` — Conciliação Bancária por OFX

> **O que é.** Importa o extrato da conta e casa cada lançamento com o pagamento ou
> recebimento já registrado no sistema.

> ⚠️⚠️ **O defeito que esta versão corrige — leia.** A rotina anterior aceitava
> **qualquer** arquivo e respondia **sucesso**. Importar um JSON, um PDF ou uma
> planilha dava "sucesso" com **zero lançamento** — e quem importava concluía que o
> extrato do mês estava vazio, não que havia mandado o arquivo errado. **Se alguma
> conciliação passada "não trouxe nada", era isto.**

### 12.6.1 Os três passos da tela

**1. Conta bancária do extrato** (🔍 lupa). Os lançamentos entram no extrato
**desta** conta. A tela mostra banco, agência, conta e descrição para você confirmar.

**2. Arquivo do extrato.** Escolha o `.ofx`. A tela confere **na hora** e mostra:

| Resultado | O que aparece |
|:--|:--|
| **Aceito** | Nome do arquivo, **quantos lançamentos**, banco, conta e **período** lidos do próprio arquivo |
| **Recusado** | O motivo, dizendo **o que parece** ter sido enviado ("parece um arquivo JSON", "é um arquivo PDF", "parece uma planilha ou CSV") e **qual formato baixar** |

> ⭐ **A conferência é por ESTRUTURA, não por extensão.** Renomear um PDF para
> `.ofx` não engana: o sistema procura o cabeçalho `OFXHEADER` ou a marcação
> `<OFX>`. O filtro do diálogo de arquivo (`.ofx`) é só conveniência.

> ⚠️ **Aviso de conta divergente.** Se o arquivo é da conta `99999-0` e você escolheu
> a `12345-6`, a tela avisa **antes** e pede confirmação. Conciliar o extrato de uma
> conta contra os pagamentos de outra casa lançamentos que nunca existiram ali — é o
> erro mais caro desta tela.

**3. Importar extrato.** O resultado mostra quatro números:

| Indicador | Significa |
|:--|:--|
| **Importados** | Entraram agora |
| **Conciliados automaticamente** | Casaram com um pagamento ou recebimento de mesmo valor e data |
| **Já existiam** | Duplicados — reimportar o mesmo arquivo **não duplica nada** |
| **Ignorados** | ⭐ Linhas que **não** entraram, com o motivo de cada uma |

> ⭐ **"Ignorados" é novo e importa.** Linha com data ou valor ilegível era descartada
> **em silêncio**: você via "importados: 12" num extrato de 15 lançamentos e não tinha
> como saber dos 3 que faltaram. Agora cada linha descartada aparece com o motivo.

### 12.6.2 Como a conciliação funciona

Cada lançamento é identificado pelo código único que o banco atribui (**FITID**)
somado à conta, à data e ao valor. É esse identificador que permite reimportar o
mesmo arquivo — ou um período que se sobrepõe — sem duplicar movimento.

O que não casar fica **pendente** e aparece como **não conciliado** no `VFIN0300`.

### 12.6.3 Onde baixar o arquivo certo

No internet banking, procure **"extrato para Money"**, **"OFX"** ou **"Open
Financial Exchange"**. CSV, PDF, planilha e comprovante **não servem**: a
conciliação precisa do identificador único de cada lançamento, que só o OFX traz.

⚠️ Limite de **8 MB** por arquivo — se passar, baixe um período menor.

---

## 12.7 Complementos financeiros

| Tela | O que faz | ⚠️ Atenção |
|:--|:--|:--|
| `VFIN0610` | **Remessa Bancária CNAB 240** (`.rem`) | **Não reutilize sequência já aceita pelo banco.** **Valide no homologador** — gerar o arquivo **não significa** que o banco registrou os títulos |
| `VFIN0500` | **Relatórios** (R01–R19) | R05 = DRE · R09/R10 = Aging Receber/Pagar · R11/R12 = Extrato por Fornecedor/Cliente. Relatórios grandes **demoram** |
| `VFIN0130` | Centros de Custo | `PRODUTIVO` / `ADMINISTRATIVO` / `COMERCIAL` / `AUXILIAR` |
| `VFIN0100` | Contas bancárias | O **saldo inicial** daqui é a base de todo saldo do `VFIN0300` |
| `VFIN0110` | Condições de pagamento | Parcelas, percentuais e evento base |
| `VFIN0120` | Plano de contas | A classificação contábil que o `VFIN0200` usa |

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
| 8 | Gerar o **romaneio** e levá-lo até `CONFERIDO` | `VEXP0100` | ☐ |
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
- [ ] Gero romaneio por auto-fill e percorro até `DESPACHADO`
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

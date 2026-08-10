# DIA 1 — FUNDAÇÃO · Apostila do Participante

**ERP Venture · Treinamento para Indústria Metalúrgica**
*Cadastros, Parametrização, Plataforma e Engenharia*

---

## Antes de começar

**O que você vai saber fazer no fim do dia:**

✅ Navegar no sistema e achar qualquer tela
✅ Cadastrar um item/material metalúrgico completo
✅ Montar a **estrutura (BOM)** de um produto — a receita
✅ Montar o **roteiro de fabricação** — o modo de preparo

**Como usar esta apostila:**

- 📖 **Fichas de tela** — o passo a passo de cada rotina. Use durante a aula e depois, no dia a dia.
- ⚠️ **Atenção** — as pegadinhas que geram retrabalho. Leia todas.
- ✍️ **Anote aqui** — espaço para os padrões da SUA empresa (códigos, nomenclaturas, decisões).
- 🎯 **Exercícios** — a prática guiada.

> **Onde estamos:** `[CADASTROS → ENGENHARIA] → Suprimentos → PCP → Produção → Vendas → Fiscal → Financeiro`

---

## Índice

| Parte | Conteúdo |
|:-:|:--|
| 1 | [Como o sistema é organizado](#parte-1--como-o-sistema-é-organizado) |
| 2 | [Os conceitos que sustentam o dia](#parte-2--os-conceitos-que-sustentam-o-dia) |
| 3 | [Cadastros de plataforma](#parte-3--cadastros-de-plataforma) |
| 4 | [PDM — como a descrição técnica é montada](#parte-4--pdm-como-a-descrição-técnica-do-item-é-montada) |
| 5 | [Cadastro de Item — a tela mais importante](#parte-5--cadastro-de-item--a-tela-mais-importante) |
| 6 | [Segurança, senha e auditoria](#parte-6--segurança-senha-e-auditoria) |
| 7 | [Máquinas e centros de trabalho](#parte-7--máquinas-e-centros-de-trabalho) |
| 8 | [Estrutura de produto (BOM)](#parte-8--estrutura-de-produto-bom) |
| 9 | [Roteiro de fabricação](#parte-9--roteiro-de-fabricação) |
| 10 | [Complementos de engenharia](#parte-10--complementos-de-engenharia) |
| 11 | [Exercícios do dia](#parte-11--exercícios-do-dia) |
| 12 | [Erros comuns e como resolver](#parte-12--erros-comuns-e-como-resolver) |
| 13 | [Cola rápida](#parte-13--cola-rápida--os-códigos-do-dia-1) |
| 14 | [Glossário](#parte-14--glossário) |

---

# PARTE 1 — Como o sistema é organizado

## 1.1 As 3 grandes áreas

| Área | O que tem lá |
|:--|:--|
| **Comercial & Vendas** | Clientes, orçamentos, pedidos, representantes, pós-venda |
| **Industrial & Produção** | Engenharia, PCP, chão de fábrica, estoque, compras, qualidade |
| **Administrativo & Financeiro** | Fiscal, financeiro, contabilidade, cadastros de plataforma |

## 1.2 Como achar uma tela

O sistema tem **mais de 200 telas**. Você **não precisa decorar** nenhuma.

**Duas formas de achar:**

1. **Pelo código** — digite `VENT0200` na busca e caia direto. É o atalho de quem já sabe.
2. **Pelo nome** — digite "estrutura", "item", "roteiro" e escolha na lista.

## 1.3 A lógica dos códigos

Todo código é **prefixo do módulo + número**.

| Prefixo | Área | Prefixo | Área |
|:--|:--|:--|:--|
| `VEMP` | Empresa | `VFIS` | Fiscal |
| `VCLI` | Cliente | `VFIN` | Financeiro |
| `VSUP` | Fornecedor / Compras | `VCTB` | Contabilidade |
| `VVND` / `VPDV` | Vendas / Pedidos | `VMAQ` | Máquinas |
| `VENT` / `VITE` / `VENG` | Engenharia | `VMRP` / `VPLA` / `VAPS` | Planejamento |
| `VPRO` | Produção / PCP | `VEST` | Estoque |
| `VINS` / `VAVF` | Inspeção / Fornecedor | `VCUS` / `VCST` | Custos / Preço |
| `VCAL` / `VPRI` / `VCLA` | Cadastros de apoio | `VEXP` | Expedição |

> 💡 **Decore só os 8 códigos do seu setor.** O resto o sistema acha para você.

## 1.4 Quem é você no sistema

| Perfil | O que pode fazer |
|:--|:--|
| `ADMIN` | Tudo — inclusive parâmetros, usuários e auditoria |
| `USER` | As operações do dia a dia autorizadas ao seu perfil |
| `VIEWER` | Somente consultar |

⚠️ **Se um botão aparece desabilitado ou dá "403":** a ação exige perfil `ADMIN`. Não é bug — é regra de segurança.

⚠️ **Tudo que você vê pertence à SUA empresa.** Um código válido em outra empresa é tratado como inexistente.

---

# PARTE 2 — Os conceitos que sustentam o dia

## 2.1 A corrente do ERP

```
DIA 1              DIA 2                    DIA 3            DIA 4
CADASTROS ──▶ ENGENHARIA ──▶ SUPRIMENTOS+ESTOQUE ──▶ PCP ──▶ PRODUÇÃO ──▶ VENDAS ──▶ FISCAL ──▶ FINANCEIRO
 (a base)      (o produto)     (o abastecimento)      (o plano)  (o chão)     (o giro)   (o imposto)  (o caixa)
```

**Por que isso importa para você:** cada elo consome o que o elo anterior produziu. Um erro no Dia 1 aparece como problema no Dia 3 — e ninguém vai desconfiar do cadastro.

## 2.2 As duas metades do produto

|  | **BOM (Estrutura)** | **Roteiro** |
|:--|:--|:--|
| É a... | **Receita** | **Modo de preparo** |
| Responde | **O QUÊ** e **QUANTO** entra | **COMO** e **EM QUANTO TEMPO** |
| Alimenta | O **MRP** (o que comprar/fabricar) | O **CRP** (capacidade) e o **custo** |
| Tela | `VBOM0100` + `VENT0210` | `VPRO0100` / `VENT0202` |
| Se faltar | Falta material na produção | Não sabe prazo nem custo |

> **O ERP precisa das duas.** Só com uma delas ele não faz conta nenhuma.

## 2.3 A regra de ouro: excluir é exceção

No ERP Venture, registros que têm história **não desaparecem**.

| Tipo de registro | A ação correta |
|:--|:--|
| Cadastro auxiliar sem uso | **Excluir** |
| Contrato | **Encerrar** |
| Fornecedor / Cliente | **Bloquear** ou **Inativar** |
| Pedido / documento fiscal | **Cancelar** |
| Ordem de produção | **Cancelar** ou **Fechar** |
| Ocorrência / não-conformidade | Dar **disposição** ou **resolução** |

⚠️ **Se o botão "Excluir" não aparece, não é falta de permissão — é regra do processo.** O sistema está dizendo que aquele registro participa de estoque, fiscal, financeiro, compras, vendas, produção ou auditoria.

## 2.4 Uma mensagem de sucesso não é conferência

Salvou e apareceu "sucesso"? **Consulte de novo** e confira status, quantidades e identificadores retornados.

> Esse único hábito evita a maior parte dos problemas de cadastro.

---

# PARTE 3 — Cadastros de plataforma

> Estes cadastros são a **fundação**. Normalmente são feitos uma vez, na implantação, e mantidos pelo key-user. Você precisa **saber onde ficam** e **o que eles afetam**.

## 3.1 `VEMP0100` — Cadastro de Empresa

**O que é:** a identidade da fábrica no sistema. Matriz e filiais.

**Passo a passo**
1. Informe o **CNPJ** (14 dígitos, só números) — o sistema valida em tempo real: ✓ válido, ✗ inválido.
2. Informe **Razão Social** e, se quiser, **Nome Fantasia**.
3. Informe **IE** (Inscrição Estadual) e **IM** (Municipal), se aplicável.
4. Selecione o **Regime Tributário**: `1` Simples Nacional · `2` Lucro Presumido · `3` Lucro Real.
5. Preencha o endereço completo: **UF**, **Município**, **Cód. IBGE** (7 dígitos), **CEP**, Logradouro, Número, Bairro.
6. Se for **filial**, informe o **CNPJ da matriz**.
7. **Salvar**.

⚠️ **Atenção**
- O **Regime Tributário** muda o comportamento fiscal do sistema inteiro. Simples Nacional calcula PIS/COFINS/ICMS diferente de Lucro Real.
- O **Cód. IBGE** é exigido pela SEFAZ na emissão da NF-e. Sem ele, nota rejeitada no Dia 4.
- Esta é a **primeira** tela a configurar. Sem empresa, as demais não carregam corretamente.

---

## 3.2 `VLOC0100` / `VUTL0555` — Países e UFs

**O que é:** a base geográfica de todos os endereços do sistema.

**Passo a passo — Países** (`VLOC0100`, aba Países)
1. **Adicionar** → informe **Sigla** (até 3 letras, ex. `BRA`), **Nome**, **DDI**, **BACEN**, **SISCOMEX**.
2. **Atualizar**.

**Passo a passo — UFs**
1. Aba **UFs** → **Adicionar**.
2. Informe **Sigla** (2 letras, ex. `SP`), **Nome**, **País ID**, **Cód. IBGE** (2 dígitos, ex. `35`).
3. **Atualizar**.

⚠️ **Atenção**
- A **sigla da UF não pode ser alterada** depois de criada. Errou? Exclua e recrie.
- **Não existe cadastro de municípios** — onde a cidade é necessária, ela é texto livre no próprio cadastro de endereço.
- BACEN e SISCOMEX são usados em importação/exportação (Dia 2).

---

## 3.3 `VCLA0100` — Classificação de Itens

**O que é:** o agrupamento hierárquico dos itens. É por ela que o MRP separa, o Compras filtra e o custo se organiza.

**Passo a passo**
1. **Criar a máscara:** informe **Descrição** e o **Formato** (ex.: `99.99.99` = 3 níveis de 2 dígitos).
2. **Criar as classificações:** selecione a máscara e informe **Código** (ex.: `01.01.01`), **Descrição** e **Código Pai** (ex.: `01.01`).

⚠️ **Atenção**
- O `9` na máscara representa um dígito numérico.
- A hierarquia permite até **3 níveis**, controlados pelo Código Pai.
- Alterar classificações depois que itens já estão vinculados exige cautela.

✍️ **Anote a estrutura de classificação da sua empresa:**

| Código | Descrição |
|:--|:--|
| | |
| | |
| | |

---

## 3.4 `VCAL0100` — Calendário Industrial

**O que é:** quais dias do ano a fábrica trabalha. É a **régua que o PCP usa para prometer data**.

**Passo a passo**
1. Filtre **Ano** e **Mês** e clique em **Ver**.
2. Para cada dia: informe o **Dia**, ligue/desligue o toggle **Dia útil?** e, se quiser, a **Descrição** ("Feriado Nacional", "Parada Manutenção").
3. Clique em **Registrar dia**.
4. O sistema mostra as métricas: dias úteis, não úteis e total registrado.

⚠️ **A pegadinha mais importante desta tela**
> **Dia não registrado = dia útil.** Para marcar um feriado, você precisa **registrar** aquele dia com o toggle **desligado**. Não basta deixar em branco.

💡 Configure o **ano inteiro** de uma vez na implantação: feriados nacionais, estaduais, municipais, férias coletivas e paradas programadas.

---

## 3.5 `VFUN0100` — Cadastro de Funcionário

**Por que esta tela existe:** vários documentos do ERP precisam apontar para uma
pessoa — quem planejou a ordem, quem é o técnico responsável pelo atendimento,
quem participa do orçamento. Esta é a lista única dessas pessoas. Não é folha de
pagamento nem RH: é o cadastro de **quem pode ser escolhido** nos outros módulos.

**Passo a passo**
1. **+ Novo** → o **Código** é gerado automaticamente (campo desabilitado; o
   sistema sugere o próximo número livre).
2. Informe **Nome** e, opcionalmente, **Função / Cargo**.
3. Selecione a **Situação**: `ATIVO` ou `INATIVO`.
4. Marque os toggles: **Participa Orçamento** · **Assistente Técnico**.
5. **Salvar**.

⚠️ **Atenção**
- A flag **Assistente Técnico** filtra quem pode ser designado como técnico nas telas de assistência (Dia 4) e manutenção (Dia 3).
- Funcionário `INATIVO` **some das listas** mas **permanece na base**, preservando o histórico. Nunca apague — inative.

---

## 3.6 `VPRI0100` — Prioridade de Ordens

**Por que esta tela existe:** quando o MRP roda, ele cospe dezenas ou centenas de
ordens planejadas de uma vez. Alguém precisa dizer quais são grandes o bastante
para merecer atenção primeiro. Esta tela é essa régua: ela **classifica
automaticamente cada ordem planejada por uma etiqueta de prioridade**, sem
ninguém marcar ordem por ordem.

### ⚠️ O que significa "Intervalo" — leia com atenção

O intervalo é a **quantidade que a ordem pede**, em **unidades do item**.
**Não é dias, não é valor em reais, não é prazo.**

Quando o MRP gera uma ordem planejada, ele olha a quantidade dela e procura a
faixa em que essa quantidade se encaixa. A ordem recebe a etiqueta daquela faixa.

```
Ordem planejada de 45 peças
  → procura a faixa que contém 45
    → faixa "Normal" (31 a 70)
      → a ordem é marcada como Normal
```

**Passo a passo**
1. **Adicionar** → informe a **Prioridade** (ex.: `Urgente`), a **Descrição**, a
   **Qtd. mínima da ordem** e a **Qtd. máxima da ordem**.
2. Salve.

**Exemplo de escala** *(as faixas cobrem quantidades, não dias)*

| Prioridade | Qtd. de | Qtd. até | Lê-se |
|:--|--:|--:|:--|
| Baixa | 1 | 10 | ordens de até 10 unidades |
| Normal | 11 | 30 | de 11 a 30 unidades |
| Alta | 31 | 70 | de 31 a 70 unidades |
| Urgente | 71 | 1000 | ordens grandes, de 71 unidades para cima |

⚠️ **Atenção**
- O sistema exige **Qtd. máxima > Qtd. mínima** (estritamente maior — não aceita iguais).
- **Não sobreponha faixas.** O backend **recusa** o cadastro se a nova faixa
  cruzar uma existente, porque a primeira faixa que casar é a que vence e o
  resultado ficaria dependendo da ordem de cadastro.
- Quantidade que **não cai em nenhuma faixa** fica **sem prioridade** — não é
  erro, mas a ordem não recebe etiqueta. Cubra a escala inteira.
- Sem nenhuma faixa cadastrada, **nenhuma ordem é priorizada**.

---

## 3.7 Centros de Custo — por que há duas telas

**Por que estas telas existem:** todo gasto da empresa precisa cair em algum
lugar antes de virar custo de produto. O centro de custo é esse "balde". Sem ele,
a hora de máquina e a hora de mão de obra não têm onde ser lançadas — e a
formação de preço (Dia 4) não fecha.

**Tipos**

| Tipo | Quem é |
|:--|:--|
| `PRODUTIVO` | Fábrica, linha de produção — gera receita diretamente |
| `ADMINISTRATIVO` | RH, finanças, diretoria |
| `COMERCIAL` | Vendas, marketing, representantes |
| `AUXILIAR` | TI, manutenção, limpeza — normalmente rateado nos produtivos |

As telas tratam o mesmo conceito, mas não têm os mesmos campos nem o mesmo uso.

### 3.7.1 `VFIN0130` — Centro de Custo Financeiro

Use para classificar e ratear despesas e receitas na gestão financeira.

1. Clique em **+ Novo Centro**.
2. Informe um **Código em texto** (ex.: `CC-001`, `PROD`, `ADM`).
3. Informe a **Descrição**.
4. Escolha o **Tipo**: Produtivo, Administrativo, Comercial ou Auxiliar.
5. Clique em **Salvar**.

| Campo exclusivo/relevante | Como preencher |
|:--|:--|
| **Código** | Texto definido pela empresa; pode usar padrão como `CC-001` |
| **Tipo** | Define a função gerencial do centro no rateio |

Nesta tela não há Empresa, Unidade, CC Pai, vigência nem Ativo/Inativo.

### 3.7.2 `VCTB0102` — Centro de Custo Contábil

Use para a apropriação contábil por empresa/unidade e para organizar a hierarquia de centros.

1. Clique em **+ Novo**.
2. Informe **Código** e **Descrição**.
3. Selecione a **Empresa** e, quando aplicável, a **Unidade**.
4. Escolha o **Tipo**.
5. Se houver hierarquia, informe o **CC Pai**.
6. Informe a **vigência**; a data inicial precisa ser o primeiro dia do mês.
7. Mantenha **Ativo** ligado para permitir o uso do centro e salve.

| Campo adicional da VCTB0102 | Para que serve |
|:--|:--|
| **Empresa / Unidade** | Separa o centro dentro da estrutura empresarial |
| **CC Pai** | Monta a hierarquia usada nos rateios |
| **Data inicial/final** | Controla o período de validade |
| **Ativo** | Inativa sem apagar o histórico |

### O campo **CC Pai**

É **opcional** e serve para montar a hierarquia (ex.: `Usinagem` abaixo de
`Fábrica`), que é o que permite o rateio subir de nível.

- O código digitado é **conferido ao sair do campo**: se o centro de custo não
  existir, a tela mostra o erro e **não deixa salvar**. Se existir, aparece o
  nome dele em verde como confirmação.
- Um centro de custo **não pode ser pai de si mesmo**.
- Deixe em branco quando o centro de custo for de primeiro nível.

⚠️ Não cadastre automaticamente o mesmo registro nas duas telas. Use `VFIN0130`
quando o processo pede o centro financeiro e `VCTB0102` quando pede o centro
contábil. Se a empresa decidir manter códigos equivalentes, isso é uma regra de
cadastro interna, não uma sincronização do sistema.

⚠️ **Na VCTB0102, a data inicial deve ser o dia 01** do mês — a tela recusa qualquer outro dia.

---

# PARTE 4 — PDM: como a descrição técnica do item é montada

> ### 📌 Por que esta parte vem **antes** do cadastro de item
>
> O item não guarda um texto livre de descrição: ele guarda um **ponteiro para um
> Grupo e um Modificador do PDM**. Se esses dois não existirem, o sistema
> **recusa** a gravação do item — a tela devolve erro e nada é salvo.
>
> Ou seja: **não é possível cadastrar item nenhum antes de existir PDM.** Por
> isso o PDM é a Parte 4 e o item é a Parte 5. Se você tentar na ordem inversa,
> vai travar no primeiro item.

**A ideia:** a descrição técnica **não é digitada livre**. Ela é **composta** por três dimensões — exatamente como a indústria fala.

```
Grupo: CHAPAS
  + Modificador: Chapa Aço Carbono
    + Atributos: {Liga: 1020, Espessura: 6,35mm}
      = "Chapa Aço Carbono 1020 6,35mm"
```

## 4.1 `VITE0114` — Grupos PDM

A **1ª dimensão** (ex.: `CHAPAS`, `PARAFUSOS`, `CABOS`).

1. **Listar** para ver os grupos (filtre por código ou descrição).
2. **Novo** → o sistema sugere automaticamente o próximo **Código** livre; informe **Descrição** e **Empresa** (padrão 1) → **Criar**.
3. Para editar: **Editar** na linha → o **código não muda** (é a chave) → **Atualizar**.

⚠️ O código é **imutável** depois de criado. E o sistema **não tem exclusão** de grupo — só criar, editar e consultar.

## 4.2 `VITE0115` — Modificadores PDM

A **2ª dimensão** (ex.: `Chapa Aço Carbono`, `Parafuso Sextavado`).

1. **Listar** → **Novo** → informe a **Descrição** → **Criar** (o **Código** é automático).

⚠️ O modificador é **global** — não pertence a um grupo. O mesmo modificador serve para qualquer grupo.

## 4.3 `VITE0116` — Atributos (montador)

A **3ª dimensão**: os pares **nome:valor**.

1. **Carregar grupos/modificadores**.
2. Selecione o **Grupo** e o **Modificador**.
3. Em **Atributos do item**, informe **Nome** (ex.: `LIGA`) e **Valor** (ex.: `1020`) → **Adicionar**. Repita.
4. Confira a **Descrição técnica composta** e o resumo com Grupo, Modificador e Atributos.
5. No cadastro do item (`VENT0200`), selecione os mesmos Grupo e Modificador e informe os atributos.

⚠️ **Atributo não tem cadastro próprio** — ele vive dentro do item. Esta tela **não salva nada sozinha**: ela serve para montar e conferir a descrição antes do cadastro.

---

# PARTE 5 — Cadastro de Item — a tela mais importante

## `VENT0200` — Cadastro de Itens

**Por que esta tela existe:** o item é o átomo do ERP. Compra, produção, estoque,
venda, custo e nota fiscal **todos apontam para um código de item** — sem item
cadastrado, nenhum outro módulo tem do que falar. As **7 abas** existem porque 7
áreas diferentes precisam guardar informação sobre o mesmo objeto: o almoxarifado
quer unidade e mínimo, a engenharia quer peso e tipo, o planejamento quer o nível
na estrutura, e assim por diante. Você não precisa preencher todas de uma vez —
mas cada aba vazia é uma área que vai reclamar depois.

### Pré-requisitos — nesta ordem
1. **Grupo PDM** (`VITE0114`) e **Modificador PDM** (`VITE0115`) cadastrados.
   Sem os dois, a gravação é recusada. *(Parte 4 — faça primeiro.)*
2. Empresa cadastrada (`VEMP0100`).
3. Opcionalmente, um **item-base** já cadastrado para copiar as configurações das
   demais abas e acelerar o preenchimento.
4. Para item **Fabricado**: Estrutura (`VENT0210`) e Roteiro (`VENT0202`) —
   podem vir depois, mas o item só fica *pronto para o MRP* quando existirem.

### Campos obrigatórios (aba Capa)
| Campo | Regra |
|:--|:--|
| **Código** | Número inteiro **maior que zero**. Não aceita letras. |
| **Nome do item** | Texto livre. Também é usado como nome técnico se o campo detalhado ficar em branco. |
| **Grupo (PDM)** | Escolhido na lista — só aparecem grupos já cadastrados. |
| **Modificador (PDM)** | Idem. |

### Passo a passo geral
1. **Novo** (F2).
2. Preencha a **Capa**: Código, Nome, **Grupo** e **Modificador** (os dois últimos
   são escolhidos numa lista de busca, não digitados).
3. Percorra as abas **Estoque → Engenharia → Planejamento → Comercial → Contábil → Suprimentos**.
4. **Salvar** (F9).

---

### 🔷 Aba CAPA

| Campo | Obrig. | O que preencher |
|:--|:-:|:--|
| **Código** | ✅ | **Número inteiro maior que zero.** Não aceita letras. O código é **para sempre** |
| **Nome do item** | ✅ | Nome principal do item |
| Nome técnico detalhado | | Texto técnico completo. Em branco, o sistema usa o Nome do item |
| Complemento do nome | | Informação adicional, como linha ou acabamento |
| **Grupo PDM** | ✅ | Escolhido numa **lista de busca** — só grupos já cadastrados (`VITE0114`) |
| **Modificador PDM** | ✅ | Idem, de `VITE0115` |
| **Estado** | ✅ | `Ativo` / `Inativo` / `Fantasma` |
| Situação | | `Linha` (catálogo corrente) / `Promoção` (campanha temporária) |
| **Natureza** | ✅ | `Item Base` / `Genérico` / `Configurado` — **é um campo só**, não três marcações |
| Item de Processo | | Representa operação externa / de terceiro |

💡 **Usar item-base como modelo é opcional.** Ao selecionar um modelo na aba
Engenharia, o sistema copia suas configurações e mantém o código, o nome e o nome
técnico informados para o novo item.

⚠️ **Estado `Fantasma`** faz o item ser explodido pelo MRP sem gerar ordem própria
— ele "atravessa" para os filhos. Use com intenção.

---

### 🔷 Aba ESTOQUE

| Campo | Obrig. | O que preencher |
|:--|:-:|:--|
| **Unidade de Medida** | ✅ | `UN` `KG` `M` `M2` `M3` `MM` `CM` `IN` `MICROMETRO` `TONELADA` — **lista fechada**: qualquer outra sigla é recusada |
| Almoxarifado | | Almoxarifado padrão de movimentação |
| Baixa Automática | | Baixa estoque automaticamente na produção |
| Contagem Cíclica | | Habilita contagem cíclica |
| Intervalo (dias) | | Periodicidade da contagem |
| Estoque Mínimo | | Abaixo disso, o sistema alerta |

⚠️ **A unidade de medida é a decisão mais consequente desta aba.** Se você compra em `KG` e consome em `PC`, a conversão é cadastrada no Dia 2 (`VSUP0110`) — mas ela **começa aqui**.

⚠️ Item do tipo **Serviço não tem estoque físico** — a aba Estoque é ocultada automaticamente.

---

### 🔷 Aba ENGENHARIA — ⭐ o interruptor mais importante

| Campo | Obrig. | Opções |
|:--|:-:|:--|
| **Tipo** | ✅ | `Fabricado` (gera ordem de fabricação) / `Comprado` (gera ordem de compra) / `De terceiro` (em poder da empresa, não gera ordem) / `Serviço` (não gera ordem de material) |
| Estrutura | | `INDUSTRIAL` (MRP gera ordem e controla estoque) / `COMERCIAL` (item pronto para venda) |
| Usar item-base como modelo | | Opcional; copia as configurações das demais abas sem alterar código, nome e nome técnico |
| OEM | | Indica item montado sob a marca de outra empresa |
| Peso Bruto / Líquido | | Em KG |
| Volume Cúbico | | Em M³ |

### ⭐⭐ O que cada TIPO faz no sistema

| Tipo | O que o MRP gera | O que o item precisa ter |
|:--|:--|:--|
| **Comprado** | **Pedido de Compra** — vai atrás do fornecedor | Fornecedor preferencial (+ conversão de UM se a UM de compra for diferente) |
| **Fabricado** | **Ordem de Produção** — vai para o chão de fábrica | **Estrutura (BOM)** + **Roteiro** |
| **De terceiro** | Material de terceiro em poder da empresa — **não gera ordem** | — |
| **Serviço** | **Não gera ordem de material** — é comercial/fiscal | — |

> **Erre este campo e o material nunca chega, ou nunca é feito.**

---

### 🔷 Aba PLANEJAMENTO

| Campo | Obrig. | O que preencher |
|:--|:-:|:--|
| **Tipo de Planejamento** | ✅ | `MRP normal` (entra no cálculo do MRP) / `Projeto` (planejado fora do MRP regular) |
| **LLC** | ✅ | Nível na estrutura: `1` = produto final · `2`–`8` = intermediários · `9` = matéria-prima |
| Classificação ABC | | `A` (crítico/caro) · `B` · `C` |
| Lote Mínimo | | Tamanho mínimo de lote |
| Lote Múltiplo | | O MRP arredonda a sugestão para este múltiplo |
| Estoque de Segurança | | Colchão contra variação |
| **Lead Time (dias)** | | Tempo total de ressuprimento |
| Crítico / Exclusivo / Fantasma | | Flags de planejamento |
| Baixa Produção | | Baixa automática na produção |

⚠️ **O Lead Time é o que o MRP usa no Dia 3 para dizer "compre HOJE, senão não chega".**
Subestimado → falta de material. Superestimado → estoque parado. **Preencha com o número real.**

**Ponto de Pedido (ROP):** `(TR × CM / CR) + ES`
*(tempo de reposição × consumo médio ÷ ciclo de reposição, + estoque de segurança)*

---

### 🔷 Aba COMERCIAL

> Estas abas são gravadas junto com o item. Ao concluir, reabra o cadastro e
> confira especialmente tipo de venda, garantia, origem, CEST e unidades de
> compra/venda.

| Campo | O que preencher |
|:--|:--|
| Descrição Comercial | Como o item aparece nos documentos comerciais |
| Tipo de Venda | `Venda` / `Revenda` |
| Múltiplo de Venda | Quantidade múltipla de venda |
| Garantia (dias) | Prazo de garantia |
| Almoxarifado de Venda | Almoxarifado padrão de saída |

💡 Matéria-prima normalmente deixa esta aba quase vazia.

---

### 🔷 Aba CONTÁBIL — a aba fiscal do item

| Campo | Obrig. | O que preencher |
|:--|:-:|:--|
| **Origem** | ✅ | `0` Nacional · `1` Estrangeira (Importação) · `2` Estrangeira (Mercado Interno) |
| NCM | | Nomenclatura Comum do Mercosul |
| Alíquota IPI | | % |
| Alíquota ICMS | | % |
| CEST | | Código Especificador da Substituição Tributária |
| PIS / COFINS | | % |

⚠️ **O NCM decide a tributação do item.** NCM errado = imposto errado na nota do Dia 4.
⚠️ A **Origem** é o primeiro dígito do CST na nota fiscal.

---

### 🔷 Aba SUPRIMENTOS

| Campo | O que preencher |
|:--|:--|
| UM de Suprimento | Unidade em que o item é **comprado** |
| Almoxarifado de Suprimentos | Onde o material é recebido |
| **Tipo de Utilização** | `Industrialização` / `Consumo` / `Imobilizado` |
| Checklist | Instruções de conferência que o Almoxarifado vê no recebimento |
| Safra | Identificação de safra (itens agrícolas) |

⚠️ **O Tipo de Utilização muda a contabilização**: custo × despesa × ativo imobilizado.
💡 O **Checklist** é o texto que aparece para quem recebe o material no Dia 2. Use-o.

---

## `VITM0100` — Item & Prontidão para o MRP

**O que é:** a tela que responde **"esse item está pronto para operar?"**

### Conceitos-chave

| Conceito | O que significa |
|:--|:--|
| **Natureza** | `Item Base` (o molde) · `Genérico` (sem máscara) · `Configurado` (variante gerada) |
| **PDM** | A descrição técnica é **composta**: Grupo + Modificador + Atributos |
| **LLC** | Nível do item na estrutura: `1` = produto final · `2–8` = intermediários · `9` = matéria-prima. Ordena o processamento do MRP |
| **Tipo MRP** | `NORMAL_MRP` ou `PROJETO`. O **ponto de pedido** é configurado à parte, no bloco Ponto de Reposição (TR/CM/CR/ES) |

### Passo a passo
1. **Listar** → traz os itens cadastrados, com descrição composta, natureza, situação e parâmetros de planejamento.
2. **Cadastro rápido** (opcional) → informe **Código**, **Nome**, **Grupo PDM** e **Modificador PDM** já cadastrados; escolha a **Natureza**.
3. Complete UM de estoque, uso, tipo de engenharia, estrutura, tipo de planejamento, LLC e demais parâmetros.
4. **Criar item** → aguarde a confirmação e confira em **Listar**.
5. Selecione um item e clique em **Prontidão**.

### ⭐ O checklist de prontidão

| Se o item for... | Ele precisa de... | Sem isso |
|:--|:--|:--|
| **Fabricado** | **Estrutura (BOM)** e **Roteiro** | ⚠️ Pendente — não roda no MRP |
| **Comprado** | **Fornecedor preferencial** | ⚠️ Pendente |
| **Comprado** com UM de compra ≠ UM de estoque | **Conversão de UM** (`VSUP0110`) | ⚠️ Alerta |
| **Terceiro** | — (não gera ordem) | — |
| **Serviço** | — (não gera ordem de material) | — |

> A verificação **apenas informa** — ela **não altera** o item. Use como conferência final antes de colocar o item para operar.

⚠️ **A descrição técnica é montada pelo PDM.** Se Grupo ou Modificador não existirem, o cadastro é **recusado** e nada é gravado.

✍️ **Anote o padrão de código de item da sua empresa:**

```
Matéria-prima:  ________________________________
Semiacabado:    ________________________________
Produto final:  ________________________________
```

---

# PARTE 6 — Segurança, senha e auditoria

## 6.1 `VSEC0100` / `VUSR0100` — Troca de senha

**O fluxo:** `solicitar → aprovar/rejeitar (ADMIN) → concluir (você)`

**Se você é o titular:**
1. **Solicitar troca** — informe o **motivo** (obrigatório). A solicitação nasce pendente.
2. Aguarde a aprovação do administrador. Depois de aprovada, **a autorização vale 15 minutos**.
3. **Concluir troca** — informe o **ID da solicitação**, a **senha atual**, a **nova senha** e a **confirmação**.
4. Autentique-se novamente.

**Regras da senha nova:** de **12 a 128 caracteres**, com **maiúscula**, **minúscula**, **número** e **caractere especial**.

⚠️ **O administrador aprova, mas não conhece e não define a sua senha.** Ele apenas libera a troca.
⚠️ Concluir a troca **invalida todas as suas sessões anteriores**.

**Erros possíveis:**

| Erro | Significa |
|:--|:--|
| `401` | Senha atual incorreta |
| `400` | Senha fraca ou confirmação diferente |
| Recusado | Solicitação vencida, já usada ou rejeitada — abra uma nova |

## 6.2 `VADM0100` / `VAUD0100` — Auditoria

**Somente leitura**, **exclusiva de ADMIN**. Registra quem alterou o quê.

Filtre por **entidade**, **ação**, **usuário** e **período** e carregue. As colunas variam conforme a entidade. Datas em `AAAA-MM-DD hh:mm:ss`.

⚠️ **O log é imutável** — não há edição nem exclusão.
⚠️ Resultado vazio significa **ausência de evento compatível com o filtro**, não ausência de atividade.

> 💡 **Por que isso é bom para você:** quando algo dá errado, dá para ver exatamente o que aconteceu e desfazer — em vez de virar caça às bruxas.

---

# PARTE 7 — Máquinas e centros de trabalho

> Pré-requisito do roteiro: sem máquina cadastrada, a operação não tem onde acontecer.

## 7.1 `VMAQ0101` — Tipos de Máquina

**O que é:** as **categorias** de equipamento que classificam as máquinas do chão.

1. **Novo Tipo** → informe **Código**, **Nome** e **Tipo**:
   `CUT` (corte) · `BEND` (dobra) · `WELD` (solda) · `ASSEMBLE` · `PAINT` · `LATHE` (torno) · `MILL` (fresa) · `PRESS` (prensa) · `INJECTION`
2. Marque **Requer operador** quando for máquina manual (**padrão: sim**).
3. Salve.

### ⭐ O campo "Requer operador" — o que ele realmente faz

| Requer operador | Comportamento | Por quê |
|:--|:--|:--|
| **Sim** (manual) | O sistema **ignora sobreposição (overlap)** no roteiro | O operador não abandona uma peça no meio — assim o lead time não é **subestimado** |
| **Não** (automática) | **Permite overlap** entre operações | A máquina roda sozinha |

## 7.2 `VMAQ0200` — Máquinas, Tempos e Cálculo

### Seção 1 — Nova máquina

| Campo | O que preencher |
|:--|:--|
| Código / Nome | Identificação da máquina |
| **Tipo** | O código do tipo cadastrado em `VMAQ0101` |
| Capacidade | Número |
| Unidade de capacidade | `Peças` `Chapas` `Kg` `T` `M` `M²` `M³` `Litros` `Un` |
| Período | `Por Minuto` / `Por Hora` / `Por Dia` |
| Eficiência | 0 a 1 (ex.: `0,85` = 85%) |

⚠️ **Use as listas.** As unidades e períodos são em português — digitar errado gera recusa.

### Seção 2 — Tempo por item × máquina ⭐ *o coração do cálculo*

| Campo | O que preencher |
|:--|:--|
| Item / Máquina | O par que está sendo cronometrado |
| **Tempo de ciclo** + unidade | Tempo para produzir a quantidade base |
| **Quantidade base** | Quantas peças saem em um ciclo |
| **Setup** | Preparação da máquina (conta **uma vez**) |
| **Prioridade** | `1` = máquina preferida |

💡 Se a mesma peça pode ser feita em duas máquinas, cadastre as duas e use a **Prioridade** para dizer qual é a preferida.

### Seção 3 — Cálculo de tempo de produção

Informe **Item**, **Máquina** e **Quantidade** → **Calcular tempo**.

**O sistema devolve:** ciclos (arredondados para cima), tempo de setup, tempo de produção, total em min/h e **se a máquina está em gargalo**.

**Como a conta é feita:**
```
1. Resolve o tempo pela variante (máscara) do item; sem variante, usa o padrão
2. Normaliza o período para minutos (1 dia = 480 min / 8h)
3. Verifica compatibilidade de unidade item × máquina (converte kg↔t, mm↔m…)
4. ciclos = teto(quantidade ÷ quantidade base)       ← arredonda para CIMA
5. tempo total = ciclos × tempo de ciclo + setup     ← setup entra UMA vez
6. Compara a vazão exigida com a capacidade efetiva (capacidade × eficiência)
   → sinaliza GARGALO
```

### Seção 4 — Agenda da máquina
Registre disponibilidade e paradas por data. **Selecione a máquina na grade** para que a tela envie o identificador real.

## 7.3 `VMAQ0300` — Tempos e Programação de Máquina

- **Registrar tempo:** pesquise a máquina e o item pela lupa, informe a prioridade (menor = mais preferida) e o tempo produtivo.
- **Programar máquina:** pesquise a máquina, informe ordem, data, início/fim, quantidade planejada, situação e sequência.
- A tela mostra **Rascunho, Planejado, Aprovado, Obsoleto** e demais situações em português; códigos técnicos e endereços da API não são informações para o operador.

⚠️ Esta rotina **não** registra produção realizada — isso é apontamento (Dia 3).
💡 Depois de programar, consulte o sequenciamento em `VAPS0600` para detectar sobreposição.

## 7.4 Máscara do item configurado — faça antes da estrutura

Se o item for **Configurado**, gere sua máscara antes de abrir a estrutura:

1. Em `VCFG0100`/`VCFG0200`, confira as características e opções que formam a variante.
2. Abra `VITE0313` e pesquise o item configurável e o Grupo PDM.
3. Selecione as respostas, confira a prévia e use **Simular** antes de persistir.
4. Clique em **Gerar máscaras** com a opção de persistência habilitada.
5. Volte à consulta e confirme que a máscara aparece na lista do item.

Na `VBOM0100`, a máscara é escolhida em uma lista: não copie nem digite sequências longas. Se a máscara não aparecer, ela ainda não foi persistida para aquele item.

---

# PARTE 8 — Estrutura de produto (BOM)

## A ordem correta — memorize

```
1. VBOM0100 / VENG0300 → cria o CABEÇALHO (a versão)
2. VENT0210            → adiciona as LINHAS (os componentes)
3. VBOM0100 / VENG0300 → muda o STATUS para APPROVED
```

> **Se inverter, você aprova uma BOM vazia — e BOM vazia aprovada é pior que BOM em rascunho, porque o MRP acredita nela.**

---

## 8.1 `VBOM0100` / `VENG0300` — Cabeçalho e versão da BOM

**O que é:** cada cabeçalho é uma **versão** da estrutura, com tipo, vigência e status próprios.

**Passo a passo**
1. Informe o **item** e carregue para ver as versões existentes.
2. Para criar: informe o **Tipo**, opcionalmente a **Máscara**, e a **data de início de vigência**.
3. A **situação** percorre **Rascunho → Aprovado → Obsoleto** e é alterada direto na listagem.

### EBOM × MBOM

| Tipo | O que é |
|:--|:--|
| **EBOM** | Estrutura de **Engenharia** — como o produto foi **projetado** |
| **MBOM** | Estrutura de **Manufatura** — como ele é **realmente fabricado** (ordem de montagem, consumíveis, embalagem) |

> **Quem manda no MRP e na produção é a MBOM.**

⚠️ **Três regras que evitam retrabalho**
1. **Só a versão `APPROVED` vigente é considerada** pelo MRP e pela produção.
2. **Criar um cabeçalho novo NÃO copia as linhas** da versão anterior — monte a estrutura de novo em `VENT0210`.
3. **Tornar obsoleta não apaga histórico** nem altera ordens já firmadas.

⚠️ **Não aprove BOM sem componentes, quantidades, unidades e vigência validados.**

---

## 8.2 `VENT0210` — Estrutura de Produtos (os componentes)

**Pré-requisitos:** item pai cadastrado como **Fabricado** e com estrutura diferente de **Fantasma**; componentes cadastrados.

**Passo a passo**
1. Informe o **Item Pai** no campo de pesquisa e pressione **Enter** → a árvore carrega no nível 0.
2. Clique no item pai e depois em **Inserir Filho** (ou digite na última linha do grid editável).
3. Preencha: **Item Componente**, **Quantidade**, **Unidade de Medida**, Sequência e flags.
4. O marcador **•** (bolinha) indica linha **não salva** → salve com **F9**.
5. **Duplo clique** em item com o marcador **↩** (tem filhos) → drill-down para o nível abaixo.
6. Use o **breadcrumb** no topo para voltar aos níveis superiores.
7. Selecione uma linha → o **painel lateral** mostra código, nome, tipo, estrutura, UM, lead time e **saldo atual**.

### As cores da árvore
🟢 Normal · 🟡 Crítico · 🔴 Obsoleto

### Campos da linha

| Campo | Obrig. | O que é |
|:--|:-:|:--|
| **Item Componente** | ✅ | O filho na estrutura |
| **Quantidade** | ✅ | Quanto entra para **1 unidade** do pai |
| **Unidade de Medida** | ✅ | UM da quantidade |
| Sequência | | Ordem de exibição |
| **Fantasma** | | Componente **ignorado pelo MRP** — a necessidade é explodida para o nível abaixo |
| **Alternativo** | | Componente substituto |
| Observação | | Notas sobre o vínculo |

### ⭐ A perda / refugo — o ponto metalúrgico

> **8% de perda numa chapa não é desleixo — é o vão da guilhotina, a apara, o refile.**
>
> Sem essa perda cadastrada, o MRP compra chapa **a menos** e a produção para no meio. E o custo sai mentiroso **para baixo**.
>
> **Na metalurgia, perda é regra — não exceção.**

⚠️ **Performance:** estruturas com mais de **10 níveis** impactam o desempenho do MRP.

---

## 8.3 `VENG0500` — Consulta e Manutenção Avançada de Estruturas

Quatro consultas que valem ouro:

| Consulta | Para que serve |
|:--|:--|
| **Filhos diretos** | Confere só o primeiro nível |
| **Consultar estrutura** | Item + máscara + **data de efetividade** + nº de níveis (`0` = árvore toda) |
| ⭐ **Onde usado** | Pesquisa **inversa**: em quais produtos este componente participa |
| **Alterar componente** | Ajuste com verificação de ciclo e vigência |

> 💡 **Onde usado é a consulta que salva o seu dia.** O fornecedor avisa que o parafuso M8 saiu de linha? Em 3 segundos você sabe TODOS os produtos afetados.

⚠️ Antes de alterar componente: consulte a estrutura, confirme sequência/quantidade/vigência e **verifique se a mudança não cria ciclo**. Depois de salvar, **repita a consulta na mesma data de efetividade**.

---

# PARTE 9 — Roteiro de fabricação

## As duas portas para o mesmo conceito

| Tela | Visão | Use quando |
|:--|:--|:--|
| `VENT0202` | **Engenharia** — por item | Cadastro do dia a dia |
| `VPRO0100` | **PCP** — biblioteca + rede de precedência + **lead time CPM** | Precisa do caminho crítico |

---

## 9.1 `VPRO0100` — Roteiro de Fabricação (visão PCP)

**Passo a passo**

**1. Crie operações genéricas** (biblioteca reutilizável)
- **Nome**, **Origem** e tempo padrão.

### ⭐ Origem define o tipo de ordem que o MRP gera

| Origem | O MRP gera |
|:--|:--|
| **Interna** | **Ordem de Fabricação (OF)** — feita na sua fábrica |
| **Externa / Terceiros** | **Ordem de Serviço (OS)** — enviada para fora |

> Na metalurgia isso é comum: zincagem, tratamento térmico, usinagem externa. **Origem errada = peça que nunca sai da fábrica, ou que sai sem precisar.**

**2. Crie o roteiro do item**
- Item, descrição, alternativa e marque **Padrão**.

⚠️ **Apenas UM roteiro padrão por item** — é o que o MRP e o CRP leem.

**3. Adicione as operações**
- **Sequência** (10, 20, 30…), **Centro de Trabalho** e **Tempo**.

> 💡 **Numere de 10 em 10.** Um dia você vai precisar enfiar uma operação no meio — e aí ela vira 15, sem renumerar tudo.

**4. Defina as dependências** (predecessor → sucessor) com **overlap (%)**

| Overlap | Significado |
|:--|:--|
| `0` | A sucessora só começa quando a predecessora terminar **100%** |
| `> 0` | Execução parcialmente simultânea |

⚠️ **Máquina manual nunca tem overlap válido** — o sistema ignora e trata como `0`.

**5. Clique em Lead time (CPM)** → o sistema devolve o **tempo total** e o **caminho crítico**.

> **Caminho crítico** é a sequência de operações que define o prazo. Acelerar uma operação **fora** do caminho crítico não muda o prazo — só gasta dinheiro. Acelerar uma que **está** nele faz o produto sair antes.

💡 A última operação (que não é predecessora de ninguém) é automaticamente a final.

---

## 9.2 `VENG0600` — Rede de Precedência do Roteiro

**Definir dependência:** roteiro + **predecessora** + **sucessora** + **sobreposição (%)**.
**Remover dependência:** mesmo par de IDs + confirmação (operação destrutiva).

⚠️ **Três regras**
1. Não ligue uma operação a ela mesma, nem crie **ciclo** direto ou indireto.
2. Os IDs são das **operações vinculadas ao roteiro**, não da biblioteca de operações.
3. Antes de liberar o roteiro, **confira todas as arestas e o caminho crítico**.

---

## 9.3 `VENT0202` — Roteiro de Fabricação (visão Engenharia)

**Passo a passo**
1. Selecione o **Item**.
2. **Nova Operação** → no modal, preencha:

| Campo | Obrig. | O que é |
|:--|:-:|:--|
| **Operação** | ✅ | Descrição da etapa |
| **Centro de Trabalho** | ✅ | Onde é executada |
| **Tempo** + Unidade | ✅ | `Hora` ou `Minuto` |
| **Homens** | ✅ | Quantos operadores a operação exige |
| **Origem** | ✅ | `Interna` / `Externa` |
| **Situação** | ✅ | `Aprovada` / `Inativa` / `Fantasma` |
| Fórmula | | Fator sobre o tempo base `T` (ex.: `T * 1.1` = +10%) |
| Apontamento | | `Sim` / `Não` — se exige apontamento do operador (Dia 3) |
| Roteiro Padrão Ref. | | De onde as operações foram copiadas |

3. **Copiar de Roteiro Padrão** (opcional) → traz as operações de um template.
4. **Salvar** (F9).

⚠️ **Situação**
- **Inativa** → não entra no cálculo de carga do CT.
- **Fantasma** → existe só para documentação; **não gera apontamento nem custo**.

---

## 9.4 `VENT0115` — Roteiro Padrão

Templates reutilizáveis, **não vinculados a nenhum item**. O código é **auto-gerado** e sequencial.

1. Preencha a **Descrição**.
2. **Nova Operação** → Operação, Centro de Trabalho, Tempo, Homens, Apontamento (`Sim`/`Não`), Origem (`Interna`/`Terceiros`).
3. Repita para cada operação → **Salvar** (F9).

💡 Se a sua família de produtos segue sempre corte → dobra → solda, cadastre uma vez aqui e copie para cada item novo.

---

## 9.5 `VENT0363` — Relatório Tempo CT

Horas e custo (R$) por Centro de Trabalho.

1. Defina o **período** (data inicial e final).
2. Filtre por **Item** e/ou **Centro de Trabalho** (opcional).
3. **Seleção:** `NF Saída` ou `OF Encerradas`.
4. **Tipo de Estrutura** e **Opção** (`Todas` / `Com Custos` / `Sem Custos`).
5. **Processar** (F8).

**Colunas:** CT · Operação · Item · Tempo (h) · Custo (R$)

> **Custo (R$) = tempo (h) × custo-hora do Centro de Trabalho.** É a ponte entre engenharia e custo — você vai ver esse número virar preço no Dia 4. Exporta para Excel.

---

# PARTE 10 — Complementos de engenharia

> Estas telas você **não precisa dominar hoje**. Saiba que existem e onde ficam.

## 10.1 Documentação técnica

| Tela | O que faz | Atenção |
|:--|:--|:--|
| `VDES0100` | Desenhos técnicos + histórico de revisões | O histórico é **acumulativo**. Excluir o desenho remove também o vínculo com as revisões |
| `VENG0400` | Desenhos, revisões e **distribuição controlada** | **Código + Dígito** devem identificar o documento sem ambiguidade. Ao tornar uma revisão **Atual**, encerre a anterior |
| `VENG0610` | **Seriais físicos de ferramentas** | Cada unidade rastreada por nº de série, situação e localização. **Não reutilize número físico** |

**Registrar uma revisão (`VDES0100`):** abra o desenho e informe **revisão**, **data de início**, **motivo** e **aprovador**; marque **é a atual** para que passe a valer.

## 10.2 Configurador de Produto — para produto sob medida

```
VCFG0100 → VCFG0200 → VCFG0300 → VCFG0400 → VCFG0500 → VCFG0600
Conjuntos   Caracte-   Caracte-    Geração    Descrições  Regras
e Variáveis rísticas   rísticas    (indiv./               (equival.
                       por item     lote)                  e de item)
```

| Tela | Em uma frase |
|:--|:--|
| `VCFG0100` | O **conjunto** agrupa respostas; a **variável** é uma resposta (conjunto `COR` → `AZUL`, `PRETO`) |
| `VCFG0200` | As **características** (as perguntas). 7 tipos: `CAMPO`, `DESENHO`, `ESCOLHA`, `ESCOLHA_MULT`, `FORMULA`, `INF_CARACTER`, `INF_NUMERICA` |
| `VCFG0300` | Quais características cada item tem, e em que sequência |
| `VCFG0400` | Gera a configuração — **individual** ou **em lote** |
| `VCFG0500` | Como a descrição do item configurado é montada, linha a linha |
| `VCFG0600` | Regras equivalentes (pai → filho) e regras de item configurado |
| `VITE0313` | Gera a **máscara** — o código do item configurado |
| `VITE0118` | Regras que mapeiam característica → tabela/campo de destino |
| `VENG0204` | Componente escolhido por condição (`=`, `<>`, `>`, `<`, `>=`, `<=`) |

### ⚠️ A regra de ouro do configurador

> **Sempre simule com `Persistir` DESMARCADO primeiro.**
> Confira máscara, descrição, regras aplicadas e mensagens.
> **Só depois** marque `Persistir` e execute de novo.

**Por quê:** persistir cria um **código de item de verdade**, que passa a existir para o comercial e o industrial. Simular é de graça; persistir é para sempre.

### ⚠️ Produto cartesiano na geração em lote

Antes de gerar em lote, **calcule o número de combinações** multiplicando as opções de cada característica.

> 5 características com 4 opções cada = **1.024 itens**. Você não quer isso.

## 10.3 Promessa de entrega e calendários

| Tela | O que faz |
|:--|:--|
| `VPME0102` | Parâmetros globais — o toggle `use_delivery_promise` é o **master switch** |
| `VPME0102ITE` | Calendário de promessa **por item** (1 clique = útil confirmado · 2 cliques = não útil) |
| `VENT0108` | Calendário corporativo (financeiro/industrial), com **Limpar Mês** |
| `VCAL0200` | Consulta dos dias úteis prometidos por item |

⚠️ **Dias bloqueados pelo calendário industrial (`VCAL0100`) não podem ser alterados pelo calendário do item.** A empresa manda no item.

## 10.4 `VITE0129` — Replicação de Parâmetros

Copia parâmetros de um item de origem para vários itens de destino, escolhendo as **pastas** (as abas do `VENT0200`).

1. Selecione o **Item Origem**.
2. Selecione os **Itens Destino** (múltiplos).
3. Marque as **pastas** a replicar: Planejamento, Comercial, Contábil, Custos, Estoque, Engenharia, Suprimentos, Fiscal.
4. **Replicar** → confirme.

⚠️ **É uma operação em lote e não pode ser desfeita automaticamente.** Parâmetros fiscais exigem validação depois.

# PARTE 11 — Exercícios do dia

## 🎯 Exercício 1 — Reconhecimento (5 min)

Abra as telas abaixo **pelo código** e anote em uma frase o que cada uma faz:

| Código | O que faz (escreva com suas palavras) |
|:--|:--|
| `VENT0200` | |
| `VBOM0100` | |
| `VPRO0100` | |
| `VITM0100` | |
| `VMAQ0200` | |

---

## 🎯 Exercício 2 — O interruptor (3 min)

Para cada item, marque o **Tipo** correto e diga **o que o MRP vai gerar**:

| Item | Tipo | O MRP gera... |
|:--|:--|:--|
| Chapa de aço comprada do distribuidor | ☐ Comprado ☐ Fabricado ☐ De terceiro ☐ Serviço | |
| Suporte soldado que a fábrica monta | ☐ Comprado ☐ Fabricado ☐ De terceiro ☐ Serviço | |
| Peça enviada para zincagem externa | ☐ Comprado ☐ Fabricado ☐ De terceiro ☐ Serviço | |
| Frete cobrado do cliente | ☐ Comprado ☐ Fabricado ☐ De terceiro ☐ Serviço | |

---

## 🎯 Exercício 3 — DINÂMICA: "Do parafuso ao produto" (20 min, em dupla)

**Objetivo:** levar o **suporte soldado** de zero até estar **pronto para o MRP**.

### Passo a passo

| # | O que fazer | Tela | ✓ |
|:-:|:--|:--|:-:|
| 1 | Cadastrar os itens faltantes, com UM e tipo corretos | `VENT0200` | ☐ |
| 2 | Conferir a prontidão (vai dar ⚠️ — é esperado) | `VITM0100` | ☐ |
| 3 | Criar o **cabeçalho** da estrutura (tipo `MBOM`, status `DRAFT`) | `VBOM0100` | ☐ |
| 4 | Montar a **estrutura** com quantidades e **perda** | `VENT0210` | ☐ |
| 5 | Criar o **roteiro** com 2+ operações, CT e tempos — marcar **Padrão** | `VPRO0100` | ☐ |
| 6 | Ligar a **dependência** entre as operações (overlap `0`) | `VENG0600` | ☐ |
| 7 | **Aprovar** a estrutura (status `APPROVED`) | `VBOM0100` | ☐ |
| 8 | Conferir a prontidão de novo — agora deve dar ✅ | `VITM0100` | ☐ |

### Ficha do produto: Suporte Soldado

**Item principal**

| Campo | Valor |
|:--|:--|
| Código | `PA-SUP-SOLD-001` |
| Nome | Suporte Soldado 150×80 |
| Grupo PDM / Modificador | `CONJUNTOS` / `Suporte Soldado` |
| Atributos PDM | `{Largura: 150mm, Altura: 80mm, Acabamento: Natural}` |
| UM de estoque | `PC` |
| Tipo (Engenharia) | **Fabricado** · Estrutura: `INDUSTRIAL` |
| Tipo de planejamento | MRP · Lead time 3 dias |
| Origem (Contábil) | `0 - Nacional` · NCM `7326.90.90` |

**Estrutura (BOM) — MBOM, vigência hoje**

| Seq | Componente | Descrição | Qtd | UM | Perda |
|:-:|:--|:--|:-:|:-:|:-:|
| 10 | `MP-CHAPA-1020-6.35` | Chapa Aço Carbono 1020 6,35mm | 2,500 | KG | **8%** |
| 20 | `MP-PARAF-M8-25` | Parafuso Sextavado M8×25 | 2,000 | PC | 0% |
| 30 | `MP-ELETRODO-E6013` | Eletrodo E6013 Ø2,5mm | 0,150 | KG | 0% |

**Componentes**

| Código | UM | Tipo | Tipo planej. | Lead time |
|:--|:-:|:--|:--|:-:|
| `MP-CHAPA-1020-6.35` | KG | Comprado | MRP | 15 d |
| `MP-PARAF-M8-25` | PC | Comprado | `NORMAL_MRP` + ponto de reposição | 7 d |
| `MP-ELETRODO-E6013` | KG | Comprado | `NORMAL_MRP` | 10 d |

**Roteiro** (marcar como **Padrão**)

| Seq | Operação | Centro de Trabalho | Tempo | Homens | Origem |
|:-:|:--|:--|:-:|:-:|:--|
| 10 | Corte da chapa | `GUILH-01` | 2 min | 1 | Interna |
| 20 | Dobra em L | `DOBRA-01` | 3 min | 1 | Interna |
| 30 | Solda de filete | `SOLDA-01` | 8 min | 1 | Interna |
| 40 | Rebarba e inspeção visual | `BANCADA-01` | 4 min | 1 | Interna |

**Rede de precedência**
```
10 (Corte) ──0%──▶ 20 (Dobra) ──0%──▶ 30 (Solda) ──0%──▶ 40 (Acabamento)
```

### ✅ Entregável
> **Produto com BOM `APPROVED` + roteiro com tempos + prontidão ✅ em `VITM0100`.**

---

# PARTE 12 — Erros comuns e como resolver

| O que acontece | Por quê | O que fazer |
|:--|:--|:--|
| A tela não carrega / lista vazia | Empresa não cadastrada, ou dado de outra empresa | Conferir `VEMP0100`. Tudo pertence à empresa do seu login |
| **403** ao clicar num botão | A ação exige perfil `ADMIN` | Solicitar ao administrador |
| **401** / voltou para o login | Sessão expirou, ou você trocou a senha | Autenticar de novo |
| CNPJ com ✗ vermelho | Dígito verificador inválido | Conferir o número |
| Não consigo alterar a sigla da UF | Campo desabilitado por regra | Excluir e recriar |
| Botão **Excluir** não aparece | O registro participa de um processo com histórico | Usar Cancelar / Inativar / Encerrar / Bloquear |
| Item Serviço não tem aba Estoque | Comportamento correto | Nada a fazer |
| Não consigo excluir um Grupo PDM | O sistema não expõe exclusão de grupo | Alterar descrição/empresa |
| A linha da BOM não salvou | O marcador **•** ainda está lá | Salvar com **F9** |
| Não consigo inserir componente | O item pai não é **Fabricado**, ou é **Fantasma** | Corrigir a aba Engenharia do `VENT0200` |
| Aprovei a BOM mas o MRP não a vê | Vigência ainda não começou, ou aprovou outra versão | Conferir data de início de vigência |
| Alteração de componente recusada | Criaria **ciclo** na estrutura, ou vigência conflitante | Reler a árvore antes de regravar |
| O roteiro não mostra lead time | Faltam as dependências entre operações | Definir predecessor → sucessor em `VENG0600` |
| Tempo calculado saiu absurdo | Unidade de tempo trocada (min × hora) | Conferir a unidade em `VMAQ0200` |
| Lead time do roteiro parece baixo demais | Overlap indevido em máquina manual | Conferir **Requer operador** em `VMAQ0101` |
| Cálculo de tempo recusado | Unidade do item incompatível com a da máquina | Conferir unidades em `VMAQ0200` |
| Prontidão continua ⚠️ | O roteiro existe mas **não está marcado como Padrão** | Marcar **Padrão** |
| Máscara de item configurado duplicada | A combinação já foi persistida | Simular com `Persistir` desmarcado antes |
| "Salvei mas não aparece" | Mensagem de sucesso ≠ conferência | **Sempre reconsulte** e confira o que voltou |

---

# PARTE 13 — Cola rápida — os códigos do Dia 1

### ⭐ Os 8 que você vai usar sempre

```
VENT0200  Cadastro de Itens          ← o átomo do ERP
VITM0100  Item & Prontidão MRP       ← "esse item está pronto?"
VBOM0100  Cabeçalhos de BOM          ← as versões da estrutura
VENT0210  Estrutura de Produtos      ← os componentes (a receita)
VPRO0100  Roteiro de Fabricação      ← operações + lead time CPM
VENT0202  Roteiro (Engenharia)       ← visão por item
VMAQ0200  Máquinas e Tempos          ← capacidade e cálculo
VENG0500  Consulta de Estruturas     ← "onde usado"
```

### Cadastros de plataforma
```
VEMP0100  Empresa            VCLA0100  Classificação de Itens
VFUN0100  Funcionário        VCAL0100  Calendário Industrial
VLOC0100  Países / UFs       VPRI0100  Prioridade de Ordens
VUTL0555  UFs e Países       VFIN0130  Centros de Custo (Fin.)
VUTL0560  Consulta UF/Região VCTB0102  Centro de Custo (Cont.)
```

### Engenharia — estrutura e roteiro
```
VENG0300  Cabeçalho/Situação da BOM   VENT0115  Roteiro Padrão
VENG0500  Consulta de Estruturas      VENG0600  Rede de Precedência
VENT0363  Relatório Tempo CT
```

### Máquinas
```
VMAQ0101  Tipos de Máquina    VMAQ0300  Tempos e Programação
```

### PDM e configurador
```
VITE0114  Grupos PDM          VCFG0100  Conjuntos e Variáveis
VITE0115  Modificadores PDM   VCFG0200  Características
VITE0116  Atributos PDM       VCFG0300  Características por Item
VENT0204  Grupo PDM           VCFG0400  Geração (indiv./lote)
VITE0313  Geração de Máscara  VCFG0500  Descrições
VITE0118  Regras de Config.   VCFG0600  Regras
VENG0204  Regras Equivalentes VITE0129  Replicação de Parâmetros
```

### Documentação e calendários
```
VDES0100  Desenhos Técnicos       VPME0102     Parâm. Promessa
VENG0400  Desenhos e Revisões     VPME0102ITE  Calend. por Item
VENG0610  Seriais de Ferramentas  VENT0108     Calend. Corporativo
                                  VCAL0200     Dias Úteis por Item
```

### Segurança
```
VSEC0100  Troca de Senha (fluxo)   VADM0100  Trilha de Auditoria
VUSR0100  Solicitações de Senha    VAUD0100  Log de Auditoria
```

### Atalhos de teclado
```
F2 = Novo     F8 = Processar     F9 = Salvar
```

---

# PARTE 14 — Glossário

| Termo | O que significa |
|:--|:--|
| **APS** | *Advanced Planning and Scheduling* — sequenciamento avançado da produção |
| **ATP** | *Available to Promise* — saldo disponível para prometer ao cliente |
| **BOM** | *Bill of Materials* — a estrutura/receita do produto |
| **CPM** | *Critical Path Method* — cálculo do caminho crítico e do lead time |
| **CRP** | *Capacity Requirements Planning* — carga × capacidade dos centros de trabalho |
| **CT** | Centro de Trabalho — onde a operação acontece |
| **DRAFT / APPROVED / OBSOLETE** | Estados da BOM. Só **APPROVED** vigente vale para o MRP |
| **EBOM** | Estrutura de **engenharia** — como o produto foi projetado |
| **Efetividade / Vigência** | Data a partir da qual uma versão de estrutura vale |
| **Firmar** | Aprovar uma sugestão do MRP, transformando-a em ordem real |
| **Item Fantasma** | Componente ignorado pelo MRP; a necessidade explode para o nível abaixo |
| **LLC** | *Low Level Code* — nível do item (1 = produto final · 9 = matéria-prima) |
| **MBOM** | Estrutura de **manufatura** — como o produto é realmente fabricado |
| **MRP** | *Material Requirements Planning* — o que comprar/produzir, quanto e até quando |
| **Máscara** | Formato de codificação (`99.99.99`) ou código gerado para item configurado |
| **NCM** | Nomenclatura Comum do Mercosul — define a tributação do item |
| **Origem (fiscal)** | `0` Nacional · `1` Estrangeira Importação · `2` Estrangeira Mercado Interno |
| **Origem (operação)** | Interna → Ordem de Fabricação · Externa → Ordem de Serviço |
| **Overlap** | % em que a operação sucessora pode sobrepor a predecessora |
| **PDM** | Descrição técnica composta: Grupo + Modificador + Atributos |
| **ROP** | Ponto de Pedido — `(TR × CM / CR) + ES` |
| **Roteiro** | Sequência de operações que descreve **como** o item é produzido |
| **Saúde do item** | Normal / Crítico / Obsoleto — altera o comportamento do MRP |
| **Setup** | Tempo de preparação da máquina, contado **uma vez** por ordem |
| **Tipo do item** | Fabricado / Comprado / De terceiro / Serviço |
| **Tipo MRP** | `NORMAL_MRP` / `PROJETO`; o ponto de pedido fica no bloco próprio (TR/CM/CR/ES) |

---

# ✅ Checklist de saída — Dia 1

Marque o que você **sabe fazer sozinho**:

- [ ] Navego por código e por nome, e entendo as 3 áreas do sistema
- [ ] Sei a lógica dos prefixos de código de tela
- [ ] Cadastro um item completo nas 7 abas (`VENT0200`)
- [ ] Explico o que muda entre Comprado, Fabricado, De terceiro e Serviço
- [ ] Rodo o checklist de prontidão e sei ler as pendências (`VITM0100`)
- [ ] Monto a descrição técnica via PDM (`VITE0114`/`0115`/`0116`)
- [ ] Sei onde ficam empresa, funcionário, UF, classificação, calendário, prioridade e centro de custo
- [ ] Cadastro tipo de máquina e máquina com capacidade e eficiência
- [ ] Crio cabeçalho de BOM, monto a estrutura e **aprovo**
- [ ] Uso a consulta **Onde usado** (`VENG0500`)
- [ ] Monto roteiro com operações, CT, tempos e dependências
- [ ] Leio o lead time e o caminho crítico
- [ ] Sei que **excluir é exceção** — a regra é cancelar/inativar/encerrar

---

## 📌 Suas anotações

```
Padrão de código de item da empresa:
_________________________________________________________

Classificações que usamos:
_________________________________________________________

Centros de trabalho da nossa fábrica:
_________________________________________________________

Dúvidas para o instrutor:
_________________________________________________________
_________________________________________________________
```

---

> **Amanhã (Dia 2):** temos o produto definido. O desafio passa a ser **como o material entra na fábrica** — comprar, receber, inspecionar e estocar. Você vai ver a chapa que cadastrou hoje virar saldo de estoque de verdade.

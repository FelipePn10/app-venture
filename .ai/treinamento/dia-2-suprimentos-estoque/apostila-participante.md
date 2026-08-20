# DIA 2 — ABASTECIMENTO · Apostila do Participante

**ERP Venture · Treinamento para Indústria Metalúrgica**
*Suprimentos, Compras, Recebimento, Inspeção, Estoque e Importação*

---

## Antes de começar

**O que você vai saber fazer no fim do dia:**

✅ Cadastrar fornecedor e vincular os itens que ele fornece
✅ Disparar uma compra: **solicitação → cotação → pedido → aprovação**
✅ Registrar o **recebimento** e tratar divergências
✅ **Inspecionar** o material e destinar fisicamente o que foi aprovado e rejeitado
✅ Dar **entrada no estoque** com lote e ler **saldo, ATP e reservas**

> **Onde estamos:** `Cadastros → Engenharia → [SUPRIMENTOS + ESTOQUE] → PCP → Produção → Vendas → Fiscal → Financeiro`

**Ontem** você definiu **o produto**. **Hoje** você traz o **material para dentro da fábrica**.

---

## Índice

| Parte | Conteúdo |
|:-:|:--|
| 1 | [O fluxo do abastecimento](#parte-1--o-fluxo-do-abastecimento) |
| 2 | [Cadastro de Fornecedor](#parte-2--cadastro-de-fornecedor) |
| 3 | [Mestres de compra](#parte-3--mestres-de-compra) |
| 4 | [O ciclo de aquisição](#parte-4--o-ciclo-de-aquisição) |
| 5 | [Alçadas e tolerâncias](#parte-5--alçadas-e-tolerâncias) |
| 6 | [Contratos de fornecedores](#parte-6--contratos-de-fornecedores) |
| 7 | [Serviços de terceiros](#parte-7--serviços-de-terceiros) |
| 8 | [Recebimento](#parte-8--recebimento) |
| 9 | [Inspeção de recebimento](#parte-9--inspeção-de-recebimento) |
| 10 | [Avaliação de fornecedores (IQF)](#parte-10--avaliação-de-fornecedores-iqf) |
| 11 | [Estoque](#parte-11--estoque) |
| 12 | [Importação](#parte-12--importação) |
| 13 | [Exercícios do dia](#parte-13--exercícios-do-dia) |
| 14 | [Erros comuns](#parte-14--erros-comuns-e-como-resolver) |
| 15 | [Cola rápida](#parte-15--cola-rápida--os-códigos-do-dia-2) |
| 16 | [Glossário](#parte-16--glossário) |

---

# PARTE 1 — O fluxo do abastecimento

## 1.1 O mapa do dia

```
SOLICITAÇÃO ──▶ COTAÇÃO ──▶ PEDIDO ──▶ APROVAÇÃO ──▶ AVISO ──▶ INSPEÇÃO ──▶ ESTOQUE
 VSUP0300      VSUP0400    VSUP0200    VPDC0210    VAVR0200   VINS0201    VEST0100
 "eu preciso"  "quanto?"   "compro"    "pode?"     "chegou"   "tá bom?"   "guardei"
```

## 1.2 De onde nasce a necessidade

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

**Dois caminhos:**
- **Manual** — alguém abre uma solicitação de compra.
- **Automático** — o **MRP** calcula a falta e gera uma **sugestão** (Dia 3).

> ⚠️ **O MRP sugere; o comprador aprova.** O sistema não compra nada sozinho.

## 1.3 A mensagem do dia

> **Estoque que mente é o pior inimigo da fábrica:** faz o sistema comprar o que já tem e faltar o que precisa.
>
> Hoje você aprende a manter o estoque **honesto** — da compra à prateleira.

---

# PARTE 2 — Cadastro de Fornecedor

## 2.1 `VSUP0510` — Apoio de Fornecedores ⚠️ *comece por aqui*

> **Sem tipo de fornecedor cadastrado, o `VSUP0500` recusa o cadastro com "tipo inválido".** É o erro nº 1 do dia.

### Aba **Tipos**
Cadastre tipos informando **descrição** e o **`kind`**:

| Kind | Consequência |
|:--|:--|
| `NORMAL` | **Inscrição Estadual obrigatória** |
| `TRANSPORTADORA` | IE **dispensada** |
| `TRANSP_REDESP` | IE dispensada |
| `REDESPACHO` | IE dispensada |

### Aba **Contatos**
Tipos de contato: Comprador, Gerente, Qualidade…

### Aba **Parâmetros** (por empresa — 10 parâmetros)
- Conta financeira default · se **exige conta**
- **Homologação default**
- **Data base padrão para vencimentos:** `Emissão` / `Entrada` / `Digitação`
- Fornecedor genérico da NF-e

⚠️ **A data base define quando o título vence.** 30 dias contados da emissão, da entrada ou da digitação dão três datas diferentes. Alinhe com o Financeiro.

---

## 2.2 `VSUP0500` — Cadastro de Fornecedor

**O que é:** fornecedores **e transportadoras**, com dados fiscais e comerciais organizados em pastas.

### Passo a passo

1. **Novo** → aba **Dados**:
   - **Razão social**, tipo de pessoa (Jurídica / Física)
   - **CNPJ/CPF** — com validação de dígito. Use **🔎 CNPJ** para pré-preencher pela Receita
   - **Inscrição Estadual**
   - **Tipo de fornecedor** (do `VSUP0510`)
   - **Tipo de frete** · **Contribuinte de ICMS**
2. **Endereço** — ⚠️ *a UF do endereço é usada na consulta SEFAZ*
3. **Pastas:**
   - **Telefones** · **E-mails**
   - **Vencimentos** (condições de pagamento)
   - **Contatos**
   - **Vínculo por empresa** — conta financeira, IPI, tipo de NF, tabela de preço de compra
4. **Salvar**
5. **Bloquear / Desbloquear** controla a situação de faturamento
6. **Consulta SEFAZ** grava a situação cadastral (Liberado/Bloqueado) no fornecedor

### ⚠️ Regras de negócio

| Regra | Detalhe |
|:--|:--|
| **IE obrigatória** | Exceto transportadoras (`TRANSPORTADORA` / `TRANSP_REDESP` / `REDESPACHO`) |
| **MEI** | Não pode ser marcado para Pessoa Física |
| **Registro M.A.** | Formato `AA-99999-9` (Ministério da Agricultura) |
| **Documento duplicado** | O sistema retorna **conflito** indicando o fornecedor já existente |

### ⭐ Por que preencher tudo compensa

O fornecedor tem um **provider de defaults**: condição de pagamento, tipo de frete, conta financeira e tabela de preço são **consumidos automaticamente pelo Pedido de Compra**.

> Cada minuto gasto aqui volta em segundos economizados em cada pedido — pelos próximos anos.

💡 Diferente do cliente, o fornecedor **tem edição de cadastro**. Exportação em Excel/PDF/CSV.

---

## 2.3 `VVOR0202` — Itens por Fornecedor

**O que é:** o grid **editável de 18 colunas** que diz **o que cada fornecedor fornece**.

### Passo a passo
1. Selecione o **Fornecedor**.
2. **Nova Linha** → selecione o item.
3. Preencha inline: **Preço Unitário**, **Lead Time (dias)**, **Lote Mínimo**, **Classificação ABC**, código do item no fornecedor, embalagem…
4. **Modal PDM** — para itens configurados.
5. **Modal Dados de Qualidade** — parâmetros por item/fornecedor.
6. **Salvar** (F9).

⚠️ **Dois pontos importantes**
- A **classificação ABC por fornecedor** pode ser **diferente** da ABC do item (aba Planejamento do `VENT0200`). *O parafuso pode ser C pra você e A pra ele.*
- Os **Dados de Qualidade** por linha **alimentam o módulo de inspeção** (`VINS0200`).

---

## 2.4 Complementos do fornecedor

| Tela | O que faz | Atenção |
|:--|:--|:--|
| `VSUP0660` | Parâmetros corporativos + telefone/e-mail de contato existente | Exige o **ID do contato**, não o código do fornecedor |
| `VSUP0670` | **Anexar laudo/certificado** ao vínculo item × fornecedor (PDF/PNG/JPEG) | Laudo no vínculo errado influencia **homologação e IQF** |
| `VSUP0650` | Histórico de movimentos de compra (consulta) | Comece com limite 100 |
| `VSUP0640` | Registros operacionais de compras | Prefira `VAVR0200` ou `VSUP0600` quando existir fluxo específico |
| `VSUP0620` | EDI de fornecedores | Divergências fora da tolerância devem ser tratadas antes de aprovar |

---

# PARTE 3 — Mestres de compra

## 3.1 `VSUP0110` — Conversão de UM por Item ⭐

**O que é:** o fator que traduz a unidade de **compra** para a unidade de **estoque**.

### Passo a passo
1. Informe o **item** → **Carregar** (mostra as conversões existentes).
2. Cadastre: **De** (UM origem), **Para** (UM destino) e o **fator**.
3. Use o bloco **Converter** para **testar**: informe De/Para/Quantidade e veja o resultado.

**Como o sistema resolve:** tenta a conversão **direta**; se não existir, usa a **inversa** (`1/fator`).

⚠️ **Sem conversão cadastrada, o Pedido de Compra não calcula a quantidade interna** — o próprio pedido orienta a abrir esta tela.

💡 **Amarra com o Dia 1:** o alerta de prontidão do `VITM0100` para item comprado com UM de compra ≠ UM de estoque é resolvido **aqui**.

✍️ **Anote as conversões da sua fábrica:**

| Item | De | Para | Fator |
|:--|:--|:--|:-:|
| | | | |
| | | | |

---

## 3.2 `VSUP0120` — Tabela de Preço de Compra

### Passo a passo
1. Crie a **tabela**: descrição, **moeda**, **vigência**.
2. Selecione a tabela e adicione **itens**: item, preço, UM, **quantidade mínima** e, opcionalmente, o **fornecedor específico**.

### ⭐ A hierarquia de preço do Pedido de Compra
```
1º  Preço ESPECÍFICO do fornecedor  (se existir)
2º  Preço GENÉRICO da tabela        (fallback)
```

> **Quando o preço aparece sozinho no pedido, ele veio daqui.** O **%IPI** vem da classificação fiscal e a **UM interna** das conversões (`VSUP0110`).

---

## 3.3 `VSUP0130` — Fornecedor Preferencial por Item

### Passo a passo
1. Informe o **item** → carregue os vínculos.
2. Cadastre um fornecedor com:
   - ⭐ **Ranking** (`1` = preferido)
   - Código / descrição / UM do item **no fornecedor**
   - **Lead time** em dias

> É esse ranking que faz a **solicitação virar pedido sem ninguém escolher fornecedor na mão**. O sistema pega o de **menor ranking**.

💡 Cadastre **pelo menos dois** por item crítico: o preferido e o backup.

---

## 3.4 `VSUP0680` — Fontes e Atualização de Preços

Encontra **preços efetivamente praticados** e atualiza a tabela a partir deles.

1. **Consultar fontes** — obrigatório informar **início e fim** (`AAAA-MM-DD`). Filtros opcionais: fornecedor, tabela, origem.
2. **Consultar candidatos** — informe a tabela (modo padrão `INTERNAL`, ordenação `NUMERIC`).
3. **Aplicar fontes** — informe `table_code` e **mantenha `overwrite=false`** para proteger preços existentes.
4. **Copiar ajustes** — informe os **IDs das linhas**, não os códigos dos itens.

⚠️ `overwrite=true` **substitui preço vigente**. Registre a justificativa e confira o histórico depois.

---

# PARTE 4 — O ciclo de aquisição

## 4.0 Antes do pedido: confira a governança

Antes de iniciar a solicitação, consulte `VSUP0610` e confirme a **alçada** que decidirá quem pode aprovar o pedido. Em seguida, simule em `VPCT0100`/`VSUP0630` a **tolerância** que será aplicada no recebimento. A Parte 5 aprofunda esses cadastros, mas a regra precisa estar conhecida **antes** de aprovar ou receber.

Ordem segura: **alçada/tolerância → solicitação → cotação → pedido → aprovação → recebimento**.

## 4.1 `VSUP0300` — Solicitação de Compra

**O que é:** onde a necessidade nasce.

### Passo a passo
1. Crie a solicitação (empresa, **solicitante**) com um ou mais **itens** (quantidade, UM, preço sugerido).
2. Abra a solicitação e adicione itens, se necessário.
3. **Gerar pedidos:**
   - Informe a **quantidade a atender**
   - (Opcional) o **fornecedor** de cada item — sem ele, usa o **preferencial** (`VSUP0130`)
   - O sistema **agrupa por fornecedor** e gera **um pedido por grupo**
   - O atendimento é registrado de volta na solicitação

### ⭐ A matemática do saldo
```
saldo = quantidade − atendida − cancelada

status:  Aberto  →  Parcial  →  Atendido
```

> **Atendimento parcial é normal.** Pediu 1.000 kg e gerou pedido de 600? A solicitação fica **Parcial** com saldo de 400 — ela não some, ela fica te cobrando.

---

## 4.2 `VSUP0400` — Cotação de Compra

### Passo a passo
1. **Crie a cotação** informando os itens (IDs de itens de solicitação e/ou códigos de ordens planejadas) e os **fornecedores convidados**.
2. Abra a cotação e **convide** mais fornecedores, se necessário.
3. **Registre os preços** por item × fornecedor: **preço**, **lead time**, **condição de pagamento**. A cotação passa a **Cotada**.
4. **Selecione** o preço vencedor **de cada item**.
5. **Gere os pedidos** — agrupa os selecionados por fornecedor, cria **um pedido por fornecedor** e registra o atendimento nas solicitações de origem.

### ⭐ A seleção é POR ITEM

> Você pode comprar a chapa do fornecedor A e o parafuso do B, na mesma cotação — e o sistema gera dois pedidos, um para cada.

⚠️ **Não decida só pelo preço.** O sistema mostra **preço + lead time + condição de pagamento** juntos justamente por isso.

> O mais barato que entrega em 40 dias pode ser o mais caro do mundo, se a linha parar.

---

## 4.3 `VSUP0200` — Pedido de Compra

### Aba **Pedidos**
1. Crie a **capa**: empresa, **fornecedor**, moeda, tipo de frete.
   - Sem condição de pagamento informada → vem dos **defaults do fornecedor**.
2. Abra o pedido e **adicione itens** (item, quantidade, preço).
   - ⭐ **Preço**, **%IPI** e **UM interna** são resolvidos **automaticamente** pelo sistema.
3. **Cancele** o pedido quando necessário.

### Aba **Sugestões** ⭐ — *a ponte com o Dia 3*
- Veja as sugestões geradas pelo **MRP**.
- **Aprovar** → informe fornecedor e preço → **gera um pedido de compra firme**.
- **Rejeitar** → descarta a sugestão.

> ⚠️ **Só suprimentos firmes entram no *netting* do MRP.** Enquanto a sugestão não vira pedido, o MRP continua achando que falta material. **Aprovar não é burocracia — é o que fecha a conta.**

---

## 4.4 `VPDC0200` — Pedido de Compra (visão formulário)

| Aba | O que tem |
|:--|:--|
| **Dados Gerais** | Fornecedor, data, **contrato** (opcional), condições de pagamento, contato |
| **Transporte** | Transportadora, tipo de frete (CIF/FOB), dados de entrega |
| **Vencimento** | Datas e valores das parcelas |
| **Itens** | Modal de seleção com busca por código, nome ou descrição |

Status inicial: **Pendente**. **Salvar** (F9).

---

## 4.5 `VPDC0210` — Consulta, Aprovação, Autorização e Recebimento ⭐

### Consulta
Filtros **cumulativos**: intervalo de pedido, fornecedor, item, comprador, tipo de solicitação, emissão, entrega, posição, Kanban, paginação.

⭐ O flag **Todos os itens** controla se a consulta mostra a **capa** ou **cada linha** do pedido.

### Aprovação e autorização
1. Abra o pedido e confirme fornecedor, moeda, itens, preços e **total**.
2. **Aprovar** → o sistema compara o valor com a **alçada vigente**.
3. Se o pedido ficar **bloqueado**, apenas um usuário **ADMIN** usa **Autorizar alçada**.
4. **Reconsulte** e confirme a situação final.

> ⚠️ **Aprovação NÃO significa recebimento.** São duas coisas diferentes, na mesma tela.

### Recebimento
1. Informe o pedido e adicione **cada linha efetivamente recebida**.
2. Por linha: **código da linha**, **quantidade**, **almoxarifado**. Lote, série, partida, validade e observação conforme o item.
3. Confira o **saldo aberto** e as **tolerâncias**.
4. **Registre uma única vez** e valide os movimentos de entrada retornados.

⚠️ Quantidade acima do saldo → **aviso ou bloqueio** conforme `VSUP0630`.
⚠️ **Lotes e séries obrigatórios devem ser informados antes da confirmação.**

---

# PARTE 5 — Alçadas e tolerâncias

## 5.1 `VSUP0610` — Alçadas e Parâmetros de Compras

### Alçadas
1. Consulte antes de cadastrar uma nova vigência.
2. Informe **Empresa**, **Escopo**, referência opcional, **moeda** e **início da validade**.
3. **Aprovação automática até** = o maior valor liberado **sem intervenção**.
4. **Bloquear acima de** = o valor que exige **autoridade superior**.
5. **Fim de validade** para regras temporárias — documente a justificativa.

### Parâmetros
Por **domínio**: Chave, Valor e **Tipo** (`TEXTO`, `NUMERO`, `LOGICO`…).

⚠️ Booleanos usam `true/false`. Números **sem** símbolo de moeda e **sem** separador de milhar.

⚠️ **Alçadas e parâmetros exigem ADMIN.** Uma alçada incorreta pode bloquear ou liberar pedidos indevidamente — **valide com um pedido de teste em `VPDC0210`**.

> 💡 **Alçada não é desconfiança: é proteção.** Ela garante que ninguém, sozinho, aprove uma compra grande por engano. Você tem autonomia total até o seu limite.

---

## 5.2 `VSUP0630` / `VPCT0100` — Tolerâncias de Pedido de Compra

**O que é:** quanto uma entrega pode divergir do pedido antes de o sistema avisar ou bloquear.

### Campo a campo

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

### ⭐ Use o simulador antes de ativar

O `VPCT0100` tem o painel de **avaliação**: informe o **valor esperado** e o **real** e a tela devolve o veredito que o recebimento aplicaria — **sem gravar nada**.

⚠️ Cadastre intervalos **sem sobreposição ambígua**.
💡 Regras se **acumulam**: uma por fornecedor e outra geral podem valer ao mesmo tempo.

---

# PARTE 6 — Contratos de fornecedores

## O modelo real

**Capa** (fornecedor, número, status, moeda, vigência, índice de reajuste) + **linhas** (item, quantidade contratada, preço, pedido mínimo).

```
RASCUNHO → ATIVO → (SUSPENSO) → ENCERRADO / CANCELADO
```

| Tela | O que faz |
|:--|:--|
| `VCON0100` | **Informativa** — o ERP não mantém "tipo de contrato" como cadastro separado |
| `VCON0200` | Cadastra o contrato (capa + linhas) em um passo |
| `VCON0400` | Consulta a carteira + **muda o status** |
| `VCON0202` | **Baixa de saldo** (consumo) e cancelamento |

## `VCON0200` — Cadastro

**Capa:** Empresa · **Fornecedor** · **Número do contrato** · **Status** · **Moeda** · **Vigência de/até** · Descrição · Índice de reajuste · Observações
**Linhas:** **Item** · **Qtd contratada** · Preço unit. · Máscara · UM · Pedido mínimo

## `VCON0202` — Baixa de saldo

1. Informe o **nº interno** do contrato → **Abrir**.
2. A tabela mostra **contratada**, **consumida** e **saldo**.
3. **Selecionar** a linha → informe a **quantidade a baixar** → **Baixar saldo**.
4. **Cancelar contrato** muda o status para `CANCELADO`.

### ⭐ A mecânica
```
saldo = contratada − consumida
```

⚠️ **Três regras**
1. Só linhas de contrato **`ATIVO`** podem ter saldo consumido.
2. O consumo é **rejeitado** se exceder o saldo.
3. O cancelamento (`CANCELADO`) é **irreversível** pela tela.

> Não existe "cancelamento de item" avulso. O encerramento é **mudança de status**, e a baixa é **consumo de saldo**.

---

# PARTE 7 — Serviços de terceiros

> Zincagem, tratamento térmico, usinagem externa — comum na metalurgia.

## O fluxo
```
Preço/Custo (VTER0100) → OF com operação externa → Ordem de terceiro (VTER0200)
   → Pedido de compra → Remessa/Retorno (VTER0300) → Recebimento/inspeção
```

| Tela | O que faz |
|:--|:--|
| `VTPS0100` | **Preços:** item + fornecedor + operação = preço unitário, com UM, tipo de frete e **preferencial**. **Ordens de serviço:** listagem e mudança de status |
| `VTER0100` | Preços com vigência, **Resolver preço** e **Calcular custo** (bruto, frete, impostos recuperáveis, conversão, custo efetivo). Reajuste, cópia e movimentação |
| `VTER0200` | Ordens de serviço de terceiros — **Gerar pela OF** (ADMIN) |
| `VTER0300` | Remessas, retornos e histórico — tipos `REMESSA` / `RETORNO` / `RECEBIMENTO` / `AJUSTE` |
| `VTER0400` | **Conversões globais** de UM para serviços |

### ⚠️ Dois cuidados críticos

**`VTER0200`** — **Não gere de novo sem conferir se a OF já tem ordens.** Reprocessamento indevido **duplica a cadeia de compras**.

**`VTER0300`** — Crie uma **chave de idempotência estável** (ex.: `OS15-REMESSA-NF123-1`). Execute **uma vez**. Se houver timeout, **consulte os movimentos antes de repetir** com a mesma chave.

> Mandar a peça pra zincagem é uma **compra de serviço**, não um sumiço de material. O sistema controla remessa e retorno justamente para o estoque não mentir enquanto a peça está fora.

---

# PARTE 8 — Recebimento

## `VAVR0200` — Aviso de Recebimento

**O que é:** a agenda de doca e a conferência da mercadoria **antes da NF**.

### Passo a passo
1. **Novo aviso:** **Fornecedor** e/ou **Pedido de compra**, **Doca**, **Nº NF**, **Agendado para**, observações.
2. Em cada linha: **Item**, **Qtd esperada** e (opcional) **Máscara**/**UM** → **+ item**.
3. **Criar aviso** → nasce em **`PROGRAMADO`**.
4. **Listar** e **Abrir** para ver o detalhe.
5. **Avance o status** pelo seletor **Avançar**.

### ⭐ O ciclo de status
```
PROGRAMADO ──▶ RECEBIDO ──▶ EM_CONFERENCIA ──▶ LIBERADO
 agendado     chegou       conferindo        liberado
                                    └──▶ BLOQUEADO   (bloqueado)
                                    └──▶ CANCELADO
```

## ⭐ Divergências — o coração do recebimento

Registre **item**, **tipo**, quantidades **esperada/real** e se **afeta o IQF**; depois escolha a **resolução**.

### Os 8 tipos

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

### As 5 resoluções

| Resolução | O que significa |
|:--|:--|
| `ACCEPTED` | Aceito como veio |
| `PARTIAL_RETURN` | Devolução parcial |
| `FULL_RETURN` | Devolução total |
| `WAIVED` | Dispensado |
| `SUPPLIER_DEBIT` | Débito ao fornecedor |

> ⚠️ **Divergiu? Registra a divergência.** Não empurre pro sistema um número que não é verdade.
>
> Dá vontade de "ajustar depois", mas o depois nunca chega — e aí o estoque vira ficção. **Cinco segundos aqui evitam três dias de caça ao erro.**

### O flag "afeta IQF" é uma decisão de gestão

Marque quando a **não conformidade for responsabilidade do fornecedor**. Se o caminhão bateu no caminho e não foi culpa dele, **não marque**. Esse flag alimenta o **scorecard** — é a memória do relacionamento.

💡 Este é o **fechamento de recebimento (FAVR)** — precede a entrada fiscal/física da NF.

---

# PARTE 9 — Inspeção de recebimento

## 9.1 `VINS0200` — Cadastro do Roteiro de Inspeção

**O que é:** define **como** um item (ou uma classificação) é inspecionado.

### Capa
1. Escolha a **Base**: `ITEM` ou `CLASSIFICATION`.
2. Informe o item/classificação, o **almoxarifado de inspeção** e a **vigência**.
3. (Opcional) qualificadores de manuseio, armazenagem, rota, mercado e inspeção.

### Etapas

| Campo | Opções | O que significa |
|:--|:--|:--|
| **Espécie** | `VALOR` (medição) · `ATRIBUTO` (passa/não passa) · `ESTRUTURA` | A natureza da verificação |
| **Apontamento** | `TODAS_MEDICOES` · `SINGLE_INTERVAL` · `MULTIPLE_INTERVAL` · `STATUS_ONLY` | Como o resultado é registrado |
| **Amostra** | número | Tamanho da amostra |
| **Nominal / Mín / Máx** | número | Faixa de aceitação (etapas de medição) |

### Exemplo metalúrgico

| Seq | Etapa | Espécie | Nominal | Mín | Máx | Amostra |
|:-:|:--|:--|:-:|:-:|:-:|:-:|
| 10 | Espessura da chapa (mm) | `VALOR` | 6,35 | 6,20 | 6,50 | 5 |
| 20 | Certificado de qualidade | `ATRIBUTO` | — | — | — | 1 |
| 30 | Aspecto superficial | `ATRIBUTO` | — | — | — | 5 |

### ⭐ Duas automações importantes
1. Ao receber mercadoria com **roteiro ativo**, o sistema **abre a ordem de inspeção automaticamente** e a mercadoria segue para o **almoxarifado de inspeção**.
2. A busca do roteiro **prefere o específico por item/máscara** e **cai para a classificação**.

> 💡 **Cadastre por classificação** e cubra a família inteira de uma vez. Chapa nova entrando no cadastro já nasce com inspeção.

---

## 9.2 `VINS0201` — Manutenção das Ordens de Inspeção ⭐

### Passo a passo
1. **Carregar** para listar as ordens.
2. **Gerar ordem de inspeção** (manual): origem, item, almoxarifado, quantidade → **Gerar ordem**.
3. Selecione uma ordem e, em **Análise**, informe:
   - As **quantidades por resultado**
   - O **tratamento**
   - Se **afeta o IQF**
   - Marque **Movimentar estoque** para transferir da quarentena para os destinos
4. **Registrar análise**.

### ⭐ Para onde vai cada quantidade

| Resultado | Destino |
|:--|:--|
| **Conforme** | Almoxarifado **disponível** |
| **Restrita** | Almoxarifado **disponível** |
| **Retrabalho** | Almoxarifado de **retrabalho** |
| **Rejeitada** | Almoxarifado de **rejeição** |

⚠️ **A soma não pode exceder a quantidade da ordem.**

> ⚠️ **"Movimentar estoque" é o que libera o material.** Enquanto você não marca, o material aprovado **não está disponível para produzir** — e é assim que tem que ser.

---

## 9.3 `VSUP0600` — Inspeção de Recebimento (visão operacional)

A mesma inspeção em rotina única, com mais controle:

| Operação | O que faz |
|:--|:--|
| **Cadastrar roteiro** | Base, almoxarifado de inspeção, vigência, etapas com amostra/aceitação/rejeição |
| **Gerar ordem** | Origem `PURCHASE_ORDER`, aviso ou entrada fiscal |
| **Consultar** | Filtro por situação e fornecedor; **Abrir roteiro** confirma o critério aplicado |
| **Registrar resultados** | Etapa, sequência da amostra, valor medido ou atributo, limites, aprovação, observação |
| **Analisar ordem** | Distribuir entre conforme / rejeitada / retrabalho / restrita |
| **Destinar estoque** | Fluxo simplificado: aprovado, rejeitado, destino, quarentena, motivo |

⚠️ **Pré-requisito:** o **almoxarifado de inspeção deve ser separado** dos destinos de aprovado e rejeitado.
⚠️ **Material aprovado só fica disponível após a movimentação** ao almoxarifado de destino.
⚠️ Se a API responder **conflito de saldo**, atualize a ordem antes de tentar de novo.
⚠️ **Não repita um apontamento sem verificar** se ele já aparece no resultado da ordem.

---

## 9.4 Outras telas de inspeção

| Tela | O que faz |
|:--|:--|
| `VINS0206` | Tratamento das ordens — a mesma análise, em formato operacional |
| `VINS0313` | Consulta somente leitura das ordens, com filtro por status |
| `VINS0400` | Consulta consolidada: abas **Ocorrências** e **Ordens de inspeção** |
| `VINS0106` | Cadastro de ocorrências operacionais por tipo, com **Encerrar** |

---

# PARTE 10 — Avaliação de fornecedores (IQF)

## 10.1 `VAVF0300` / `VAVF0204` — Scorecard e IQF

### As 4 dimensões

| Dimensão | Origem | Peso |
|:--|:--|:-:|
| **Qualidade** | Automático — `(inspecionada − rejeitada) / inspecionada` | **40%** |
| **Entrega** | Automático — `(recebimentos − atrasados) / recebimentos` | **30%** |
| **Comercial** | Nota manual | **20%** |
| **Atendimento** | Nota manual | **10%** |

### Cálculo automático (`VAVF0300`)
1. **Consultar** — informe o fornecedor e veja os períodos já gravados.
2. **Cadastrar/Calcular** — fornecedor, **início** e **fim** do período.
3. Informe as notas **Comercial** e **Atendimento**.
4. Marque **Persistir** somente quando o período estiver **fechado e revisado**.
5. Execute e confira quantidade total, rejeições, atrasos, notas parciais e **nota final**.

⚠️ **`Persistir = não` é simulação** — não deve aparecer como avaliação oficial.
⚠️ **Período inicial não pode ser posterior ao final.**
⚠️ **Não misture períodos sobrepostos** — distorce a tendência.
⚠️ Divergências marcadas como "**não afeta IQF**" não devem penalizar o fornecedor.

### Avaliação manual
Use **Cadastrar scorecard** apenas quando houver **avaliação externa** ou **implantação sem histórico**. Informe as 4 notas e os contadores. **Registre o motivo nas observações.**

---

## 10.2 `VAVF0203` — Homologação de Fornecedores

1. Consulte o **histórico** do fornecedor.
2. Informe o **período avaliado** e os limites **Homologado mínimo** e **Condicional mínimo** — ⚠️ *homologado ≥ condicional*.
3. Informe **situação**, **categoria**, **validade** e observações.
4. Cadastre e confira o registro retornado.
5. **Gerar itens do fornecedor** cria/atualiza vínculos item × fornecedor observados nas compras.

⚠️ **Homologação vencida ou abaixo do limite deve ser considerada pelos compradores antes de emitir novos pedidos.**
⚠️ A geração de itens **não substitui** a revisão de preferência, unidade e condições comerciais.

## 10.3 `VAVF0101` — Parâmetros de Avaliação

Domínio `SUPPLIER_EVALUATION` e outros, como pares **chave/valor tipados** (`TEXTO`/`NUMERO`/`LOGICO`/`DATA`) por empresa. ⚠️ **Escrita restrita a ADMIN.**

> **Inspeção é o filtro** que impede material ruim de entrar na linha. **O IQF é a memória:** fornecedor que entrega ruim aparece no scorecard, e a próxima compra já leva isso em conta.

---

# PARTE 11 — Estoque

## 11.1 `VENT0800` — Cadastro de Almoxarifado

### Passo a passo
1. **Novo** → aba **Dados**: **Código** e **Descrição** (obrigatórios), **Localização**, **Tipo**, **Disponível**, **Almox Expedição**, **Estabelecimento**, Observação.
2. Se a localização for **Externo** ou **Trânsito** → preencha as abas **Clientes** e **Fornecedores**.
3. **Salvar**.

### ⭐ As 8 localizações — e o que cada uma FAZ

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

**Tipo:** `Normal` ou `Linha de Produção`

⚠️ **Almoxarifados não disponíveis não aparecem como opção em movimentações.**
⚠️ Externo e Trânsito **exigem** vínculo de cliente, estabelecimento e fornecedor.

> **Não é só "onde guardo".** A localização **muda o comportamento do sistema**.

---

## 11.2 `VEST0300` / `VLOT0100` — Máscaras de Lote e Série

### Cadastro da máscara
1. Consulte as existentes.
2. Informe **Aplicação**, Cliente/Item opcionais, Tipo/Código de classificação, **zerar no ano** e **Descrição**.
3. Abra a máscara e adicione **partes na ordem desejada** (numeradas de 10 em 10).

### Os 4 tipos de parte

| Tipo | Campos principais | Exemplo |
|:--|:--|:--|
| `CARACTER` | Valor e tamanho | Prefixo `LT` |
| `DATA` | Formato de data | `yyyyMMdd` |
| `SEQ_NUMERICA` | Tamanho e zerar no ano | `000001` |
| `SEQ_CARACTER` | Tamanho | Sequência alfanumérica |

**Exemplo:** `LT` + `yyyyMMdd` + `000001` → **`LT20260731000042`**

### Geração
Informe a máscara explicitamente **ou** o contexto (Aplicação, Cliente, Item, Classificação) — o sistema resolve a máscara aplicável e **avança a sequência**.

> ⚠️ **A geração é operação de negócio, não pré-visualização. Não clique repetidamente.**
> Use **exatamente** o código retornado no lote/serial.

⚠️ **Não altere a composição de uma máscara já usada** sem avaliar rastreabilidade. Mudar uma parte muda os lotes **futuros**, nunca os já gerados.
⚠️ **Desativar** impede novas gerações; os lotes existentes permanecem válidos.

---

## 11.3 `VEST0100` — Estoque ⭐ *a tela central do Almoxarifado*

### Passo a passo
1. Informe um **item** → **Consultar** → traz **movimentos**, **saldos por depósito**, o painel **ATP** e os **lotes**.
2. **Lançar movimento:** item, depósito, **tipo**, quantidade, preço e lote.
   ⭐ *O saldo e o **custo médio ponderado** são atualizados na mesma transação.*
3. **Reservas:** crie uma reserva (**reduz o ATP**) e depois **Libere** ou **Consuma** por ID.
4. **Lotes:** registre um lote (corrida/*heat*, certificado) → **Genealogia** mostra o histórico **bidirecional** (OFs que **consumiram** × **produziram** o lote).
5. **Consumo médio (ROP):** **Recalcular** atualiza a média móvel (padrão **6 meses**).

### Os 5 tipos de movimento

| Tipo | O que é |
|:--|:--|
| `IN` | Entrada |
| `OUT` | Saída |
| `TRANSFER_IN` | Entrada por transferência |
| `TRANSFER_OUT` | Saída por transferência |
| `ADJUST` | Ajuste |

## ⭐⭐ ATP — o conceito mais importante do dia

```
ATP = saldo em mãos − reservas
```

**Painel:** Em mãos · Reservado · **Disponível**

> **A cena:** você tem 100 chapas no galpão. Um pedido de venda confirmado já reservou 80.
> Quanto você pode prometer para o próximo cliente? **Vinte.** Não cem.
>
> O ATP é o **número honesto** — é o que você pode prometer sem quebrar promessa.

⚠️ **Confirmar um pedido de venda reserva automaticamente o disponível**, mantendo o ATP consistente.
⚠️ **Todo movimento com lote atualiza o saldo segregado por lote.**

### Quem mexe no ATP (amarra os 4 dias)

| Tela | O que faz |
|:--|:--|
| `VVND0200` (Pedido de Venda — Dia 4) | **Reserva** o ATP ao confirmar |
| `VPRO0900` (Ordem de Produção — Dia 3) | Gera **OUT** (consumo) e **IN** (conclusão com lote) |
| `VEXP0100` (Romaneio — Dia 4) | Reserva na separação e **consome** no despacho |
| `VEST0200` (Inventário) | **Ajusta** divergências de saldo |

> 💡 **Esse saldo é exatamente o número que o MRP vai olhar amanhã** para decidir o que ainda falta comprar. **Estoque certo aqui = MRP certo lá.**

---

## 11.4 `VEST0200` — Inventário e Tipos de Movimento

### Inventário: `criar → contar → ajustar → fechar`
1. **Novo inventário:** depósito + descrição → nasce **`ABERTO`**.
2. Abra e **registre contagens** por item/depósito (quantidade contada).
3. **Ajuste** as diferenças por item — ⭐ *cada ajuste gera um **movimento de acerto** de saldo*.
4. **Feche** o inventário quando terminar.

### Tipos de movimento
Cadastre com **Sigla** e **Descrição** (e tipo IN/OUT) — classificam os lançamentos do `VEST0100`.

---

## 11.5 `VEST0400` — Consultas por Almoxarifado

| Consulta | O que traz |
|:--|:--|
| **Movimentos do almoxarifado** | Trilha cronológica de entradas e saídas |
| **Consultar saldo** | Exige **item e almoxarifado**; lote é obrigatório só para item controlado |
| **Saldos do almoxarifado** | Posição consolidada de todos os itens |

⚠️ **Somente leitura — não corrigem estoque.** Para ajuste, use inventário/movimentação **com justificativa e autorização**.
💡 Compare **saldo × movimentos × reservas** antes de concluir que existe divergência.

---

# PARTE 12 — Importação

> Para quem importa insumo metalúrgico.

| Tela | O que faz |
|:--|:--|
| `VIMP0200` | Console de processos: capa (moeda, câmbio, incoterm, **base de rateio**), **itens** (FOB, qtd, peso) e **despesas** |
| `VIMP0101` | Painel de status logístico: `ABERTO → NACIONALIZADO → CANCELADO` |
| `VIMP0102` | **CT-e** — cadastrar, consultar e **autorizar** |
| `VIMP0300` | Importação e custo nacionalizado (visão operacional, com **Recalcular**) |

## `VIMP0200` — passo a passo
1. **Capa:** empresa, fornecedor, referência (DI/DUIMP), **incoterm**, **moeda**, **câmbio** e a **base de rateio**.
2. **Itens:** item, quantidade, peso e **FOB unitário**.
3. **Despesas:** tipo e valor, marcando **"No custo do item"** quando a despesa deve ser rateada.
4. **Criar processo** → o detalhe mostra o **custo nacionalizado unitário** por item.
5. **Recalcular landed** após ajustes; mude o **status** (`ABERTO → NACIONALIZADO / CANCELADO`).

### ⭐ A conta
```
custo nacionalizado = FOB convertido pelo câmbio + rateio das despesas ÷ quantidade
```

**Bases de rateio:** `VALOR` · `QUANTIDADE` · `PESO`

⚠️ **Só despesas marcadas "Compõe custo do item" entram no rateio** — as demais ficam informativas.
⚠️ **Não recalcule processos fechados sem autorização.**

> **O preço na fatura não é o custo.** O custo é FOB + frete + seguro + imposto + despacho, tudo rateado. É essa conta que evita vender no prejuízo achando que a chapa custou o que estava na proforma.

# PARTE 13 — Exercícios do dia

## 🎯 Exercício 1 — De onde veio o dado? (5 min)

Você abre um pedido de compra e, ao adicionar o item, aparecem valores sozinhos. De onde veio cada um?

| O que apareceu | Veio de qual tela? |
|:--|:--|
| Preço unitário | |
| %IPI | |
| UM interna / quantidade interna | |
| Condição de pagamento | |
| Fornecedor sugerido pela solicitação | |

---

## 🎯 Exercício 2 — Divergência (3 min)

O pedido era de **1.000 kg**. Chegaram **980 kg**, e 15 kg estão com oxidação.

| Pergunta | Sua resposta |
|:--|:--|
| Quantas divergências você registra? | |
| Qual o tipo de cada uma? | |
| Qual resolução você usaria? | |
| Marca "afeta IQF"? Por quê? | |

---

## 🎯 Exercício 3 — ATP (3 min)

O item tem **500 kg em mãos** e **180 kg reservados**.

```
ATP = ______________ kg
```

Um cliente pede **250 kg** para entrega imediata. Você pode prometer? ☐ Sim ☐ Não
Por quê? ______________________________________________

---

## 🎯 Exercício 4 — DINÂMICA: "Da compra à prateleira" (20 min, em dupla)

**Objetivo:** abastecer o material do produto do Dia 1 — a chapa e os parafusos do suporte soldado.

| # | O que fazer | Tela | ✓ |
|:-:|:--|:--|:-:|
| 1 | Conferir/criar o **tipo de fornecedor** | `VSUP0510` | ☐ |
| 2 | Cadastrar o **fornecedor** com IE e endereço | `VSUP0500` | ☐ |
| 3 | Vincular os **itens ao fornecedor** (preço e lead time) | `VVOR0202` | ☐ |
| 4 | Marcar o **preferencial** (ranking 1) | `VSUP0130` | ☐ |
| 5 | Cadastrar a **conversão de UM** e testar no bloco Converter | `VSUP0110` | ☐ |
| 6 | Cadastrar a **tabela de preço** | `VSUP0120` | ☐ |
| 7 | Abrir a **solicitação de compra** | `VSUP0300` | ☐ |
| 8 | Gerar **cotação**, precificar e selecionar o vencedor | `VSUP0400` | ☐ |
| 9 | **Gerar o pedido** a partir da cotação | `VSUP0200` | ☐ |
| 10 | **Aprovar** o pedido (veja a alçada agir) | `VPDC0210` | ☐ |
| 11 | Registrar o **aviso de recebimento** e avançar até `LIBERADO` | `VAVR0200` | ☐ |
| 12 | Registrar **1 divergência** com resolução | `VAVR0200` | ☐ |
| 13 | Criar **roteiro de inspeção** e gerar a ordem | `VINS0200`/`VINS0201` | ☐ |
| 14 | **Analisar** a ordem com **Movimentar estoque** | `VINS0201` | ☐ |
| 15 | Dar **entrada no estoque** com lote | `VEST0100` | ☐ |
| 16 | **Consultar o saldo e o ATP** | `VEST0400`/`VEST0100` | ☐ |

### Dados do cenário

**Fornecedor**

| Campo | Valor |
|:--|:--|
| Razão social | Metalúrgica Distribuidora Aço Sul Ltda |
| Tipo | `NORMAL` (exige IE) · Frete CIF · Contribuinte ICMS |
| UF | SP · Condição de pagamento 30/60 |

**Itens × fornecedor**

| Item | Ranking | Preço | UM | Lead time | Lote mín. | ABC |
|:--|:-:|:-:|:-:|:-:|:-:|:-:|
| `MP-CHAPA-1020-6.35` | 1 | R$ 8,40/kg | KG | 15 d | 500 | A |
| `MP-PARAF-M8-25` | 1 | R$ 0,38/pc | PC | 7 d | 1000 | C |
| `MP-ELETRODO-E6013` | 1 | R$ 22,00/kg | KG | 10 d | 20 | B |

**Conversões de UM**

| Item | De | Para | Fator |
|:--|:--|:--|:-:|
| `MP-CHAPA-1020-6.35` | `CH` | `KG` | 49,9 |
| `MP-PARAF-M8-25` | `CX` | `PC` | 500 |
| `MP-ELETRODO-E6013` | `CX` | `KG` | 5 |

**Roteiro de inspeção da chapa**

| Seq | Etapa | Espécie | Nominal | Mín | Máx | Amostra |
|:-:|:--|:--|:-:|:-:|:-:|:-:|
| 10 | Espessura (mm) | `VALOR` | 6,35 | 6,20 | 6,50 | 5 |
| 20 | Certificado de qualidade | `ATRIBUTO` | — | — | — | 1 |
| 30 | Aspecto superficial | `ATRIBUTO` | — | — | — | 5 |

**O que acontece**

| Etapa | Valor |
|:--|:--|
| Solicitação | 1.000 kg de chapa |
| Vencedor da cotação | R$ 8,40/kg · lead time 15 d · 30/60 |
| Pedido | 1.000 kg = **R$ 8.400,00** |
| Recebimento | **980 kg** → divergência `SHORTAGE` de 20 kg, resolução `ACCEPTED`, afeta IQF ✅ |
| Inspeção | 980 kg → **950 conforme** · **30 rejeitada** |
| Entrada em estoque | 950 kg no `ALM-MP`, com lote |

### ✅ Entregável
> **Saldo positivo em estoque, com lote e pedido de compra vinculados.**

---

# PARTE 14 — Erros comuns e como resolver

## Códigos de erro (valem para o ERP inteiro)

| Erro | O que verificar |
|:--|:--|
| **400** — dados inválidos | Campo obrigatório, número, data/hora, estrutura das listas |
| **401** — sessão inválida | Refazer login. **Não repita a operação antes de autenticar** |
| **403** — acesso negado | A ação exige ADMIN ou permissão específica |
| **404** — não encontrado | O código pertence à sua empresa? O registro foi desativado? |
| **409 / 422** — regra de negócio | Situação atual, saldo, vigência, duplicidade, transição permitida |
| **Grade vazia** | Limpar filtros, conferir período/empresa, executar Consultar |
| **Timeout após gravar** | **Consulte pelo código antes de reenviar** |

## Erros do Dia 2

| O que acontece | Por quê | O que fazer |
|:--|:--|:--|
| "Tipo inválido" ao criar fornecedor | Falta tipo em `VSUP0510` | Cadastrar o tipo primeiro |
| IE recusada | Tipo `NORMAL` exige IE | Preencher IE ou usar kind de transportadora |
| MEI recusado | MEI não vale para Pessoa Física | Corrigir |
| Registro M.A. recusado | Formato incorreto | Usar `AA-99999-9` |
| Conflito de documento | CNPJ já cadastrado | O sistema indica o fornecedor existente |
| Consulta SEFAZ falhando | Credencial ou provedor indisponível | ⚠️ **Não preencha a tela com dado local** |
| Preço não veio automático | Tabela sem vigência ou sem o item | `VSUP0120` |
| Quantidade interna zerada | Falta conversão de UM | `VSUP0110` |
| Solicitação não gera pedido | Sem fornecedor e sem preferencial | `VSUP0130` |
| Pedido bloqueado ao aprovar | **Alçada** — comportamento esperado | ADMIN usa **Autorizar alçada** |
| Recebimento recusa a quantidade | Acima do saldo + tolerância | Conferir `VSUP0630` |
| Contrato não deixa consumir | Não está `ATIVO` | Mudar status em `VCON0400` |
| Consumo de contrato recusado | Excede o saldo | Conferir `contratada − consumida` |
| Ordem de terceiro duplicada | Gerou pela OF duas vezes | ⚠️ Conferir antes de gerar |
| Movimento de terceiro duplicado | Repetiu sem chave de idempotência | Consultar antes de repetir |
| Ordem de inspeção não aparece | Roteiro fora da vigência ou base errada | Conferir `VINS0200` |
| Soma da análise recusada | Excede a quantidade da ordem | Redistribuir |
| Material aprovado não fica disponível | Faltou **Movimentar estoque** | Marcar e registrar de novo |
| Almoxarifado não aparece na lista | **Disponível** desligado | Ativar em `VENT0800` |
| Lote pulou números | Clicou em gerar mais de uma vez | ⚠️ A geração **avança a sequência** |
| Genealogia vazia | O lote ainda não participou de OF | Normal antes do Dia 3 |
| ATP menor que o saldo | Existem **reservas** — comportamento correto | Consultar reservas |
| IQF sem dados | Sem recebimentos/inspeções no período | Ampliar o período |
| Custo nacionalizado errado | Despesa sem "Compõe custo do item" | Marcar e **Recalcular** |

## Conferência antes de encerrar qualquer rotina

1. Verifique a mensagem de sucesso ou erro.
2. Confira o **identificador e a situação retornados**.
3. **Reexecute a consulta** da entidade alterada.
4. Confirme **efeitos colaterais**: estoque, pedido, custo, score.
5. Compare a **quantidade de linhas enviada × processada**.
6. Guarde referência e observação para auditoria.

---

# PARTE 15 — Cola rápida — os códigos do Dia 2

### ⭐ Os 10 que você vai usar sempre

```
VSUP0500  Cadastro de Fornecedor      ← a ponte item → compra
VVOR0202  Itens por Fornecedor        ← quem fornece o quê
VSUP0130  Fornecedor Preferencial     ← o ranking
VSUP0110  Conversão de UM             ← kg → peça
VSUP0120  Tabela de Preço de Compra   ← de onde vem o preço
VSUP0300  Solicitação de Compra       ← "eu preciso"
VSUP0400  Cotação de Compra           ← "quanto?"
VSUP0200  Pedido de Compra            ← "compro" (+ Sugestões do MRP)
VPDC0210  Aprovação e Recebimento     ← "pode?" / "chegou"
VEST0100  Estoque                     ← saldo, ATP, reservas, lotes
```

### Fornecedor e apoios
```
VSUP0510  Apoio de Fornecedores    VSUP0670  Itens e Relatórios de Qualidade
VSUP0660  Parâmetros e Contatos    VSUP0680  Fontes e Atualização de Preços
VSUP0650  Histórico de Compras     VSUP0620  EDI de Fornecedores
VSUP0640  Registros Operacionais
```

### Compra e governança
```
VPDC0200  Pedido de Compra (4 abas)   VSUP0610  Alçadas e Parâmetros
VSUP0630  Tolerâncias                 VPCT0100  Tolerâncias (com simulador)
```

### Contratos e terceiros
```
VCON0100  Tipos de Contratos (info)   VTPS0100  Serviços de Terceiros
VCON0200  Cadastro de Contratos       VTER0100  Preços e Custo
VCON0202  Baixa de Saldo              VTER0200  Ordens de Serviço
VCON0400  Consulta de Contratos       VTER0300  Remessas e Retornos
                                      VTER0400  Conversões Globais
```

### Recebimento, inspeção e avaliação
```
VAVR0200  Aviso de Recebimento     VINS0313  Consulta de Inspeções
VINS0200  Roteiro de Inspeção      VINS0400  Consulta de Ocorrências
VINS0201  Ordens de Inspeção       VINS0106  Cadastro de Ocorrências
VINS0206  Tratamento das Ordens    VAVF0101  Parâmetros de Avaliação
VSUP0600  Inspeção (operacional)   VAVF0203  Homologação
VAVF0300  Scorecard e IQF          VAVF0204  Envio de IQF
```

### Estoque
```
VENT0800  Cadastro de Almoxarifado    VEST0200  Inventário e Tipos de Movimento
VEST0100  Estoque (central)           VEST0400  Consultas por Almoxarifado
VEST0300  Máscaras de Lote e Série    VLOT0100  Máscaras de Lote/Série
```

### Importação
```
VIMP0200  Console de Importação    VIMP0102  CT-e
VIMP0101  Status Logístico         VIMP0300  Custo Nacionalizado
```

### Fórmulas do dia
```
ATP     = saldo em mãos − reservas
Saldo solicitação = quantidade − atendida − cancelada
Saldo contrato    = contratada − consumida
Custo nacionalizado = FOB convertido + rateio das despesas ÷ quantidade
IQF     = qualidade 40% + entrega 30% + comercial 20% + atendimento 10%
```

---

# PARTE 16 — Glossário

| Termo | O que significa |
|:--|:--|
| **Alçada** | Valor máximo que um perfil pode aprovar sem intervenção superior |
| **ATP** | *Available to Promise* — `saldo em mãos − reservas` |
| **Aviso de recebimento (FAVR)** | Registro da chegada, **antes** da entrada fiscal da NF |
| **Consumo médio (ROP)** | Média móvel (padrão 6 meses) usada no ponto de reposição |
| **Cotação** | Comparação de preços de vários fornecedores antes de comprar |
| **Custo médio ponderado** | Custo do estoque atualizado a cada movimento |
| **Custo nacionalizado (landed)** | FOB convertido + rateio das despesas ÷ quantidade |
| **Divergência** | Diferença entre o esperado e o recebido (8 tipos, 5 resoluções) |
| **EDI** | Troca eletrônica de dados com o fornecedor |
| **Genealogia** | Histórico bidirecional do lote: OFs que consumiram × produziram |
| **Homologação** | Aprovação formal do fornecedor, com validade e limites |
| **Incoterm** | Termo internacional de comércio (FOB, CIF…) |
| **IQF** | Índice de Qualificação de Fornecedores (40/30/20/10) |
| **Lote / série** | Identificação da corrida (*heat*) que segue a mercadoria |
| **Netting** | Cálculo do MRP que abate suprimentos **firmes** da necessidade |
| **Ordem de inspeção** | Documento que representa a quantidade a inspecionar |
| **Preferencial (ranking)** | Ordem de escolha do fornecedor por item — `1` é o preferido |
| **Quarentena** | Almoxarifado de inspeção, onde o material aguarda liberação |
| **Reserva** | Bloqueio lógico do estoque — reduz o ATP, não baixa o físico |
| **Solicitação de compra** | Pedido interno que expressa a necessidade |
| **Sugestão de compra** | Proposta do MRP; vira pedido só quando aprovada |
| **Tolerância** | Desvio permitido entre pedido e entrega |

---

# ✅ Checklist de saída — Dia 2

- [ ] Cadastro tipo de fornecedor e fornecedor completo
- [ ] Vinculo itens ao fornecedor e defino o preferencial
- [ ] Cadastro conversão de UM e testo o resultado
- [ ] Sei a hierarquia de preço do pedido de compra
- [ ] Abro solicitação e gero pedidos a partir dela
- [ ] Conduzo uma cotação e seleciono vencedor **por item**
- [ ] Emito pedido e entendo os defaults automáticos
- [ ] Aprovo/autorizo pedido respeitando a alçada
- [ ] Aprovo sugestões do MRP na aba Sugestões
- [ ] Registro aviso de recebimento e percorro o ciclo de status
- [ ] Registro divergência com tipo, resolução e flag de IQF
- [ ] Crio roteiro de inspeção com etapas e limites
- [ ] Gero e analiso ordem de inspeção com movimentação
- [ ] Cadastro almoxarifado sabendo o efeito da localização
- [ ] Monto máscara de lote e sei que a geração avança a sequência
- [ ] Lanço movimento de estoque com lote
- [ ] **Leio saldo, ATP e reservas**
- [ ] Interpreto o IQF do fornecedor

---

## 📌 Suas anotações

```
Nossos fornecedores críticos:
_________________________________________________________

Conversões de UM que usamos:
_________________________________________________________

Alçada do meu perfil: R$ ______________

Almoxarifados da nossa fábrica:
_________________________________________________________

Dúvidas para o instrutor:
_________________________________________________________
```

---

> **Amanhã (Dia 3):** temos produto (Dia 1) e material (Dia 2). A pergunta passa a ser **o que, quanto e quando produzir**. Entramos no coração do sistema — PCP e chão de fábrica. Você vai ver o MRP olhar exatamente para o saldo que criou hoje.

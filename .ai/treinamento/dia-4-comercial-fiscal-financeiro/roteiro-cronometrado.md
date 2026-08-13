# DIA 4 — Giro & Retaguarda: Comercial, Custo, Fiscal e Financeiro

**Duração:** 4h · **Pré-requisito:** Dias 1–3 (produto, material, custo de produção)
**Público principal:** Comercial/Vendas, Custos/Precificação, Fiscal, Financeiro/Contábil · **Ouvintes:** Diretoria

> **Onde estamos na corrente:** `Cadastros → Engenharia → Suprimentos+Estoque → PCP → Produção → [VENDAS → FISCAL → FINANCEIRO]`
> É o dia que **fecha a corrente**: transforma o produto em receita, a receita em nota e a nota em caixa.

**Ao final, o participante consegue:** cadastrar cliente, fazer um pedido de venda com preço correto, emitir NF-e, lançar contas a receber/pagar e ler o fluxo de caixa.

---

## Agenda cronometrada (4h)

| Horário | Bloco | Conteúdo |
|:--|:--|:--|
| 0:00–0:15 | Abertura | A corrente completa + o giro que fecha o ciclo |
| 0:15–1:45 | **Bloco A** | Vender e precificar: Apoios → Cliente → Custo/Preço → Orçamento → Pedido |
| 1:45–2:00 | Intervalo | — |
| 2:00–3:15 | **Bloco B** | Faturar e receber: Expedição → NF-e → Contas → Fluxo de Caixa |
| 3:15–3:45 | **Dinâmica** | "Do pedido ao recebimento" |
| 3:45–4:00 | Fecho | Dúvidas + checklist de saída + encerramento do treinamento |

**Mensagem-síntese:**
> *"Vender é fácil; vender **pelo preço certo, faturar sem erro e receber no prazo** é o que mantém a fábrica viva. Hoje a gente fecha a corrente — do pedido ao caixa."*

---

## Bloco A — Vender e precificar (0:15–1:45)

### A1. Apoios e cadastro de cliente (20 min)
| Ordem | Tela | O que é |
|:-:|:--|:--|
| 1 | `VCLI0510` / `VCLI0520` / `VCLI0530` | Apoio — Básico / Comercial / Fiscal (**pré-requisito**) |
| 2 | `VCLI0500` | Cadastro de Cliente |
| 3 | `VCLI0117` | Permissões e Restrições de Venda (limite de crédito) |
| 4 | `VCLI0202` | Percentuais de Frete por Cliente |

▶ **O que criar:** um cliente com dados fiscais (`VCLI0530`) e **limite de crédito** (`VCLI0117`).

🗣 **Fala:** *"O cadastro fiscal do cliente aqui é o que vai preencher a nota depois, sozinho. E o limite de crédito é o freio que evita vender pra quem não vai pagar."*

### A2. Restrições e frete (10 min)

| Tela | O que preparar |
|:--|:--|
| `VCLI0117` | Limite de crédito, bloqueios e permissões de venda |
| `VCLI0202` | Política de frete do cliente |
| `VPDV0108` / `VPDV0111` | Políticas comerciais de desconto e frete |

▶ **O que fazer:** confira crédito e frete antes de montar a proposta; essas regras serão aplicadas quando o pedido for liberado.

### A3. Custo e Precificação (20 min) — antes de vender, saber quanto custa
| Tela | O que é |
|:--|:--|
| `VCUS0100` | Custos — Centro, Compra, Alocação e Overhead |
| `VCST0202` | **Precificação de Produtos** (formação de preço/margem) |
| `VCLI0600` | Manutenção Avançada de Preços de Venda |

▶ **O que fazer:** mostrar o **custo** que veio da produção (apontamentos do Dia 3) e **formar o preço** com margem em `VCST0202`.

🗣 **Fala (a ponte com o Dia 3):** *"Lembra dos apontamentos de ontem? É deles que sai esse custo. Agora dá pra ver a mágica: você vende sabendo a margem real, não no chute. Sem o custo do chão, precificar é apostar."*

### A4. Orçamento → Pedido de Venda (30 min) ⭐ troncal
| Ordem | Tela | O que é |
|:-:|:--|:--|
| 1 | `VVND0310` | Parâmetros do orçamento (**pré-requisito**) |
| 2 | `VVND0300` | Orçamento de Venda |
| 3 | `VVND0200` / `VPDV0200` | **Pedido de Venda** |
| 4 | `VVND0600` | Workflow do Pedido de Venda |

▶ **O que criar (ao vivo):**
1. Confirmar em `VVND0310` os motivos e padrões necessários.
2. Criar o **Orçamento** (`VVND0300`) e convertê-lo em pedido.
3. Conferir o **Pedido de Venda** (`VVND0200`): cliente, item, preço formado no A3 e condição de pagamento.
4. Acompanhar o **workflow** (`VVND0600`): aprovação comercial, crédito e liberação.

🗣 **Fala (a demanda que fecha o ciclo):** *"Repara: esse pedido de venda é a **demanda** que o MRP do Dia 3 estava esperando. A corrente se fecha aqui — o que a gente planejou lá atrás nasceu de um pedido como este."*

### A5. Organização comercial e pós-venda (10 min)

- `VVND0100` — Divisão de Vendas.
- `VVND0400` / `VVND0500` — Representantes e metas.
- `VASS0201`, `VGAR0211` e `VSAC0100` — assistência, garantia/devolução e SAC.

---

## Bloco B — Faturar e receber (2:00–3:15)

🗣 **Transição:** *"Pedido aprovado e produto pronto. Agora vem a parte que o fisco e o caixa cobram: **emitir a nota** e **receber o dinheiro**."*

### B1. Expedição e romaneio (12 min)

| Ordem | Tela | O que fazer |
|:-:|:--|:--|
| 1 | `VEXP0100` | Criar o romaneio a partir do pedido liberado |
| 2 | `VEXP0110` | Agrupar romaneios na carga física |
| 3 | `VEXP0120` | Conferir instruções e posição de despacho |

▶ **Sequência neste momento:** criar → separar → conferir → embalar e deixar pronto. Depois de autorizar a NF-e no B2, volte à expedição e **despache**. Nunca confirme o despacho antes da autorização fiscal.

### B2. Fiscal — NF-e (33 min) ⭐ troncal
| Ordem | Tela | O que é |
|:-:|:--|:--|
| 1 | `VFIS0100` / `VFIS0110` | Configuração Fiscal / Tabelas Tributárias (base) |
| 2 | `VFIS0350` / `VENT0200` | Mestre fiscal, vínculo e herança do item |
| 3 | `VFIS0300` | CFOPs e Naturezas de Operação |
| 4 | `VFIS0200` | **NF-e de Saída** (a nota da venda) |
| 5 | `VFIS0640` | Faturamento de Carga e DANFE |
| 6 | `VFIS0210` | NF-e de Entrada (compras do Dia 2) |
| — | `VFIS0220` / `VIMP0102` | CT-e (transporte) |
| — | `VNFS0100` | NFS-e (nota de serviço) |

▶ **O que fazer:** a partir do pedido do A4 e do romaneio do B1, **emitir a NF-e de saída** (`VFIS0200`) — escolher a **natureza de operação** (`VFIS0300`), validar tributação e **transmitir** à SEFAZ; gerar o **DANFE** (`VFIS0640`).

▶ **Antes da nota:** em `VFIS0350`, confira o mestre fiscal vigente; em
`VENT0200`, mostre Compra/Venda e alterne PIS/COFINS entre **Herdar**,
**Sobrescrever: Sim** e **Sobrescrever: Não**. Confirme `HERDADO` ou
`SOBRESCRITO` antes de transmitir.

✅ Com a NF-e autorizada, retorne a `VEXP0100`/`VEXP0110`, vincule a nota quando necessário e confirme o despacho.

**Apuração/SPED (mostrar):** `VFIS0340` Simples Nacional, `VFIS0530`–`VFIS0540` Apuração ICMS, `VFIS0600` SPED EFD, `VFIS0620` Manifestação/Inutilização.

🗣 **Fala (desmistificar o fiscal):** *"Fiscal assusta, mas 90% do trabalho pesado o sistema já faz: a tributação vem das tabelas, o CFOP vem da natureza da operação. Seu papel é conferir e transmitir. Nota rejeitada não é o fim do mundo — o sistema diz o motivo e você corrige."*

⚠️ **Ponto de atenção:** nota **rejeitada** trava o faturamento e a entrega. É o erro mais caro do dia — confira a nota antes de transmitir.

### B3. Financeiro — receber e pagar (20 min) ⭐ troncal
| Ordem | Tela | O que é |
|:-:|:--|:--|
| 1 | `VFIN0110` | Condições de Pagamento |
| 2 | `VFIN0100` / `VFIN0120` | Contas Bancárias / Plano de Contas |
| 3 | `VFIN0210` | **Contas a Receber** (título da venda) |
| 4 | `VFIN0200` | **Contas a Pagar** (título da compra do Dia 2) |
| 5 | `VFIN0300` | **Fluxo de Caixa e Saldos** |
| — | `VFIN0620` / `VFIN0610` | Conciliação (OFX) / Remessa CNAB 240 |
| — | `VFIN0400` | Apuração de Impostos |
| — | `VFIN0600` | Adiantamentos de Clientes/Fornecedores |

▶ **O que fazer:**
1. Mostrar o **título a receber** gerado pela NF-e (`VFIN0210`).
2. Mostrar o **título a pagar** do fornecedor do Dia 2 (`VFIN0200`).
3. Ler o **Fluxo de Caixa** (`VFIN0300`): entra × sai × saldo projetado.
4. **Baixar** um título (receber) e conciliar (`VFIN0620`).

🗣 **Fala (o fechamento da corrente):** *"Olha o que aconteceu: a venda virou nota, a nota virou título a receber, e o título entra no fluxo de caixa. A compra do Dia 2 virou título a pagar. O caixa é o espelho de tudo que a fábrica fez — e agora vocês sabem ler esse espelho."*

**Contabilidade (mostrar):** `VCTB0200` / `VCTB0600` SPED ECD, `VCTB0102` Centro de Custo.

### B4. Apuração e contabilidade (10 min)

- `VFIN0400` — apuração de impostos depois das notas autorizadas.
- `VFIN0620` / `VFIN0610` — conciliação OFX e remessa bancária.
- `VCTB0200` / `VCTB0600` — escrituração e SPED contábil.

## 🎯 Dinâmica de fixação — "Do pedido ao recebimento" (30 min)

**Setup:** cada dupla vende o "suporte soldado" produzido nos dias anteriores.

**Tarefa cronometrada (20 min):**
1. Confirmar os **apoios** e cadastrar o cliente com crédito (`VCLI0510`–`0530` → `VCLI0500` / `VCLI0117`).
2. Formar o **preço** com margem (`VCST0202`).
3. Confirmar `VVND0310`, criar o **orçamento**, convertê-lo em pedido e liberar no workflow (`VVND0300` → `VVND0200` / `VVND0600`).
4. Separar e conferir o romaneio (`VEXP0100`).
5. **Emitir a NF-e de saída** (`VFIS0200`) e gerar o DANFE (`VFIS0640`).
6. Localizar o **título a receber** (`VFIN0210`) e ver o impacto no **fluxo de caixa** (`VFIN0300`).

**Entregável verificável:** NF-e emitida + título a receber gerado + impacto visível no caixa.


**Fechamento — encerramento do treinamento (5 min):**
🗣 *"Vocês percorreram a corrente inteira: cadastraram o produto, compraram o material, planejaram, produziram, venderam, faturaram e receberam. O mesmo 'suporte soldado' que nasceu como uma ficha no Dia 1 virou dinheiro no caixa hoje. É assim que o sistema conversa de ponta a ponta — e é assim que vocês vão operar a partir de amanhã."*

---

## ✅ Checklist de saída do Dia 4
- [ ] Confirma os apoios e cadastra cliente com dados fiscais e crédito (`VCLI0510`–`0530` → `VCLI0500` / `VCLI0117`).
- [ ] Forma preço com margem a partir do custo (`VCST0202`).
- [ ] Configura o orçamento, converte em pedido e libera (`VVND0310` → `VVND0300` → `VVND0200` / `VVND0600`).
- [ ] Separa e confere o romaneio antes do faturamento (`VEXP0100`).
- [ ] Emite NF-e de saída e gera DANFE (`VFIS0200` / `VFIS0640`).
- [ ] Localiza título a receber e a pagar (`VFIN0210` / `VFIN0200`).
- [ ] Lê o fluxo de caixa e baixa/concilia um título (`VFIN0300` / `VFIN0620`).

**Encerramento:** entregar o **checklist consolidado dos 4 dias**, os códigos de tela do fluxo troncal de cada setor, o canal de suporte pós-treinamento e a agenda de acompanhamento (retorno em 15 e 30 dias).

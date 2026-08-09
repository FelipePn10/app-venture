# Treinamento ERP Venture — Indústria Metalúrgica

**Carga horária:** 16 horas · **Formato:** 4 dias de 4 horas · **Base:** telas reais do sistema (199 telas documentadas / 18 módulos)

Esta pasta contém o **material completo** do treinamento. Cada dia tem sua própria pasta com **três documentos**: o roteiro cronometrado (agenda de bolso), o **manual do instrutor** (documento de condução, completo) e a **apostila do participante** (material do aluno, para usar durante e depois).

---

## PDFs prontos para impressão

Os 13 documentos já estão gerados em **[`pdf/`](pdf/)**, separados por dia — A4, identidade visual Venture, 311 páginas no total.

```
pdf/
├── 00 — Visão Geral do Programa.pdf          6 pág.
├── Dia 1 — Fundação/                        72 pág.
│   ├── Dia 1 — Manual do Instrutor.pdf      33
│   ├── Dia 1 — Apostila do Participante.pdf 33
│   └── Dia 1 — Roteiro Cronometrado.pdf      6
├── Dia 2 — Abastecimento/                   74 pág.
├── Dia 3 — Coração Industrial/              72 pág.
└── Dia 4 — Giro & Retaguarda/               87 pág.
```

Os PDFs não usam emoji: os marcadores dos `.md` (`⚠️`, `⭐`, `💡`, `🗣`, `🎯`) viram **rótulos tipográficos** — ATENÇÃO, PONTO-CHAVE, DICA, FALA DO INSTRUTOR, EXERCÍCIO — sobre caixas coloridas. `✅`/`❌` viram `✓`/`✗`.

Para regerar depois de editar qualquer `.md`:

```bash
cd .ai/treinamento && python3 _build/build.py
```

O script não tem dependências externas (só Python 3). Ele usa o Chromium que o Playwright já baixou para os testes do projeto; se não achar navegador, gera só o HTML em `_build/out/` — aí é abrir e usar `Ctrl+P → Salvar como PDF`.

---

## Estrutura da pasta

```
.ai/treinamento/
├── README.md                             ← você está aqui
├── pdf/                                  ← 13 PDFs prontos (entregável)
├── _build/build.py                       ← gerador (markdown → PDF)
├── dia-1-fundacao/
│   ├── roteiro-cronometrado.md           agenda de bolso (4h)
│   ├── manual-instrutor.md               ⭐ documento de condução
│   └── apostila-participante.md          ⭐ material do aluno
├── dia-2-suprimentos-estoque/
│   ├── roteiro-cronometrado.md
│   ├── manual-instrutor.md
│   └── apostila-participante.md
├── dia-3-pcp-producao/
│   ├── roteiro-cronometrado.md
│   ├── manual-instrutor.md
│   └── apostila-participante.md
└── dia-4-comercial-fiscal-financeiro/
    ├── roteiro-cronometrado.md
    ├── manual-instrutor.md
    └── apostila-participante.md
```

---

## Os 4 dias (ordem por dependência de processo)

| Dia | Pasta | Tema | Setores | Telas | Entregável do dia |
|:-:|:--|:--|:--|:-:|:--|
| **1** | [`dia-1-fundacao/`](dia-1-fundacao/) | **Fundação** | Cadastros, Plataforma, Engenharia | 45 | Produto com **BOM aprovada + roteiro com tempos** |
| **2** | [`dia-2-suprimentos-estoque/`](dia-2-suprimentos-estoque/) | **Abastecimento** | Compras, Almoxarifado, Inspeção, Importação | 49 | Material com **saldo positivo em estoque**, com lote |
| **3** | [`dia-3-pcp-producao/`](dia-3-pcp-producao/) | **Coração Industrial** | Planejamento (MRP/CRP/APS), Produção, Manutenção | 37 | **OF com operações apontadas** e material consumido |
| **4** | [`dia-4-comercial-fiscal-financeiro/`](dia-4-comercial-fiscal-financeiro/) | **Giro & Retaguarda** | Vendas, Expedição, Custo, Fiscal, Financeiro | 85 | **NF-e emitida + título a receber + impacto no caixa** |

---

## A corrente (por que esta ordem)

```
DIA 1              DIA 2                    DIA 3            DIA 4
CADASTROS ──▶ ENGENHARIA ──▶ SUPRIMENTOS+ESTOQUE ──▶ PCP ──▶ PRODUÇÃO ──▶ VENDAS ──▶ FISCAL ──▶ FINANCEIRO
 (a base)      (o produto)     (o abastecimento)      (o plano)  (o chão)     (o giro)   (o imposto)  (o caixa)
```

Regra: **um setor só é treinado depois do setor de que ele depende.** O PCP (Dia 3) precisa da BOM e do roteiro (Dia 1) e do saldo de estoque (Dia 2). O Fiscal (Dia 4) só emite nota do que Vendas faturou. Isso evita o clássico *"a tela pede um dado que ninguém sabe de onde vem"*.

> ⚠️ **A única "volta" da corrente:** o MRP (Dia 3) consome demanda de vendas (Dia 4). No Dia 3 a demanda é criada manualmente, de propósito, e isso é explicitado para a turma na abertura.

---

## O fio condutor: o "suporte soldado"

O mesmo produto atravessa os 4 dias. **Mantenha os mesmos códigos** em todos os dias:

| Dia | O que acontece com ele |
|:-:|:--|
| 1 | Nasce como item (`PA-SUP-SOLD-001`), ganha **estrutura** e **roteiro** |
| 2 | A chapa, os parafusos e o eletrodo são **comprados, inspecionados e estocados** |
| 3 | É **planejado** pelo MRP, vira **OF**, é **apontado** e tem o custo real apurado |
| 4 | É **precificado**, **vendido**, **faturado** e vira **dinheiro no caixa** |

As fichas com todos os dados-semente estão no **Anexo A** de cada manual do instrutor.

---

## Qual documento usar

| Documento | Para quem | Quando usar |
|:--|:--|:--|
| `roteiro-cronometrado.md` | Instrutor | **Na sala, na mão** — agenda de bolso com timing, falas-âncora e checklist |
| `manual-instrutor.md` | Instrutor | **Na preparação e na condução** — mapa completo das telas, demo passo a passo, armadilhas, gabarito das dinâmicas, troubleshooting, FAQ e dados-semente |
| `apostila-participante.md` | Participante | **Durante e depois do treinamento** — passo a passo de cada tela, campos, exercícios, erros comuns, cola rápida e glossário |

---

## Como cada manual do instrutor está organizado

1. **Objetivos de aprendizagem** — competências com evidência verificável e meta de aprovação
2. **Preparação do instrutor** — checklist de ambiente, dados-semente e o que testar na véspera
3. **Mapa completo das telas** — todas as telas do dia em 3 níveis (troncal · apoio · referência)
4. **Agenda minuto a minuto** — com regra de ritmo (o que cortar se atrasar)
5. **Blocos A e B** — demo passo a passo, falas prontas (🗣) e armadilhas (⚠️)
6. **Dinâmica + gabarito** — tarefa cronometrada, pontos de controle e erros esperados
7. **Troubleshooting** — sintoma → causa → solução
8. **FAQ** — as perguntas que a turma sempre faz, com resposta pronta
9. **Checklist de saída e avaliação** — por participante, com escala 🔴🟡🟢
10. **Anexos** — dados-semente completos e glossário

---

## Cobertura de telas

**Todas as 199 telas documentadas do sistema estão distribuídas pelos 4 dias**, em 3 níveis de profundidade:

| Nível | Tratamento | Onde aparece |
|:--|:--|:--|
| ⭐ **Troncal** | Demonstrada ao vivo + praticada pela turma | Manual + apostila, passo a passo completo |
| **Apoio** | Demonstrada rápido, campos críticos explicados | Manual + apostila, ficha resumida |
| **Referência** | Localizada na tela; "para que serve e onde fica" | Manual + apostila, tabela de referência |

> A fonte da documentação de tela é o `HELP_TELAS_ERP.md` na raiz do projeto — objetivo, pré-requisitos, passo a passo, campos, observações e telas relacionadas de cada rotina.

## Ambiente e preparação (antes do Dia 1)

- [ ] Ambiente **de treinamento** (nunca produção), com base de dados **restaurável**
- [ ] **Snapshot do banco** tirado antes de cada dia
- [ ] Dados de exemplo de uma metalúrgica (itens: chapa, barra, perfil; máquinas: corte, dobra, solda, usinagem)
- [ ] Um usuário/login por participante, com o perfil do setor dele, + um `ADMIN` para o instrutor
- [ ] Projetor/compartilhamento de tela + **cada participante na própria máquina**
- [ ] Ficha impressa do produto-exemplo (o "suporte soldado") — 1 por dupla
- [ ] Apostilas impressas dos 4 dias
- [ ] ⚠️ **Ambiente fiscal em Homologação** (`VFIS0100`) — crítico para o Dia 4

Cada manual do instrutor traz a lista específica de dados-semente do seu dia (Seção 2).

---

## Encerramento

Ao fim do Dia 4, entregar:
- Checklist consolidado dos 4 dias
- Cartão com os códigos do fluxo troncal de cada setor
- Apostilas dos 4 dias
- Canal de suporte pós-treinamento + SLA
- Agenda de acompanhamento (sugestão: retorno em 15 e 30 dias)

> **A melhor métrica de sucesso do treinamento** é a resposta à pergunta final: *"Qual tela vocês vão abrir amanhã de manhã?"*

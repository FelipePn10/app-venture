# HELP — Telas do VentureERP

> Guia de todas as telas do VentureERP, escrito a partir do sistema atual.
> **226 telas** no menu, em 3 grupos e 18 módulos.
> Última revisão completa: outubro de 2026.

## Como usar este guia

Este guia descreve, tela por tela, **para que serve cada rotina do VentureERP, o que
precisa existir antes, o passo a passo e as regras que o sistema aplica**. As telas
estão na mesma ordem e com os mesmos nomes do menu: três grupos (Comercial & Vendas,
Industrial & Produção, Administrativo & Financeiro), cada um com os seus módulos.

Use o **índice** logo abaixo para achar a tela pelo módulo, ou procure pelo código
(ex.: `VVND0200`) com Ctrl+F. No sistema, a busca de telas aceita o código ou o
título.

### Como cada tela é descrita

- **Para que serve** — o que a tela resolve, em linguagem de negócio.
- **Antes de começar** — o que precisa estar cadastrado.
- **Passo a passo** / **Abas** — a sequência de trabalho.
- **Regras e cuidados** — o que o sistema confere, bloqueia ou faz sozinho.
- **Telas relacionadas** — para onde ir antes e depois.

### Telas e rotinas de operações

A maioria das telas é um formulário próprio. Algumas, marcadas no guia como
*Rotina de operações* ou *Rotina de consulta*, são um **console**: você escolhe a
operação na lista, preenche os campos (às vezes um bloco de dados já com um
exemplo), executa e confere o retorno. Elas existem para manutenção avançada e
para operações pontuais; quando há uma tela em formulário para o mesmo assunto, o
guia indica qual usar no dia a dia.

### Nomes das telas

Cada tela tem um **código** e um **título**. O prefixo indica a área: `VVND` vendas,
`VCLI` clientes, `VSUP`/`VPDC` compras, `VENT`/`VENG`/`VCFG` engenharia, `VPRO`
produção, `VMRP`/`VPLN`/`VPRE` planejamento, `VEST`/`VEXP` estoque e expedição,
`VINS` qualidade, `VFIS` fiscal, `VFIN` financeiro, `VCTB` contabilidade, `VADM`
administração. Nas listas, os registros relacionados aparecem como **Nome
(código)**, e os campos de cliente, item, fornecedor, almoxarifado e similares têm
busca por nome ou código.

### Cada empresa tem os seus dados

O sistema atende várias empresas no mesmo ambiente. Clientes, fornecedores,
pedidos, notas, regras fiscais e o resto pertencem à empresa em que você entrou:
um registro de uma empresa não aparece nem é alterado em outra.

---

## O grande fluxo

```
CLIENTE → Orçamento (VVND0300) → Pedido de Venda (VVND0200)
                                       │ confirmar: crédito, reserva de estoque, demanda
                                       ▼
                                 MRP (VMRP0100) ── sugere ──┬─► Compra (VPDC0200) ─► NF de Entrada (VFIS0210)
                                       │                    │                         │ estoque + contas a pagar
                                       │                    └─► Ordem de Produção (VPRO0900)
                                       │                              │ apontar, consumir, entregar ao estoque
                                       ▼                              ▼
                        Capacidade e sequência (VPRO0200 / VPRO0210)  Qualidade (VINS0300)
                                                                      │
                                       NF-e de Saída (VFIS0200) ◄─────┘
                                       │ autorizar: baixa estoque, contas a receber, pedido faturado
                                       ▼
                         Romaneio / Carga (VEXP0100 / VEXP0110) → ENTREGA
```

Quase toda seta é automática: confirmar o pedido gera a demanda do MRP e reserva o
estoque; firmar a sugestão do MRP cria a ordem de produção; aprovar a NF de entrada
dá entrada no estoque e gera o contas a pagar; autorizar a NF-e de saída baixa o
estoque, gera o contas a receber e fatura o pedido.

### Fluxos principais, passo a passo

**Venda.** Cliente (VCLI0500) e preço do item numa tabela de venda (VCST0202) →
orçamento (VVND0300) → **converter em pedido** → pedido (VVND0200) **confirmar**
(crédito, reserva, demanda) → aprovação de crédito se bloqueado (VAPR0100) →
faturar o pedido na VFIS0200 → **prévia** → **autorizar** → romaneio (VEXP0100).

**Compra.** Necessidade vinda do MRP (sugestões de compra na VPDC0200), da
solicitação (VSUP0300) ou da reposição (VEST0100) → cotação (VSUP0400) → pedido
de compra (VPDC0200) com alçada → envio ao fornecedor → aviso de recebimento
(VAVR0200) → NF de entrada (VFIS0210): importar, conciliar, distribuir parcelas e
**aprovar** → contas a pagar (VFIN0200) → pagamento.

**Produção.** Estrutura (VENT0210) e roteiro (VENT0202) do item → MRP (VMRP0100)
→ **firmar** a sugestão (cria a OF) → OF (VPRO0900): conferir faltas, iniciar,
apontar, consumir, entregar ao estoque, encerrar (custo real) → capacidade e
sequência (VPRO0200 / VPRO0210).

**Qualidade.** Roteiro de inspeção do item (VINS0200) e amostragem (VINS0110) →
o recebimento abre o **lote de inspeção** (VINS0300) com o material retido → medir
→ **decisão de uso** (libera, rejeita, retrabalho, sucata) → não conformidade e
CAPA (VINS0500) → certificado ao cliente (VINS0700).

**Beneficiamento (material do cliente).** NF-e de remessa do cliente (VBEN0100) →
produção → nota de serviço com a devolução do material (VBEN0100 → VFIS0200) →
saldo do cliente em VBEN0200.

**Tributação da venda.** Configuração fiscal (VFIS0100) → tabelas (VFIS0110) e
classificação fiscal do item (VFIS0350) → **regras de ICMS/IPI por cenário**
(VFIS0320) → conferir no **simulador** (VFIS0325) → a NF-e (VFIS0200) aplica a
regra de cada linha.

---

## Glossário

| Termo | O que significa |
|---|---|
| **Item** | Tudo o que a empresa compra, produz ou vende |
| **Máscara** | A parte variável do código de um item configurado (uma combinação de respostas) |
| **Estrutura (BOM)** | Os componentes e quantidades que formam um item |
| **Roteiro** | As etapas (operações) pelas quais o item passa na fábrica |
| **MRP** | O cálculo de **o que** comprar ou fabricar, **quanto** e **quando** |
| **Demanda** | Necessidade de um item — de pedido, previsão ou demanda lançada |
| **Firmar** | Transformar a sugestão do MRP em ordem real |
| **OF** | Ordem de fabricação (ordem de produção) |
| **CRP / APS** | Carga de máquina × capacidade / sequência das operações nas máquinas |
| **ATP** | Disponível para promessa: saldo − reservas, sem o que está em inspeção ou rejeição |
| **Reserva** | Separação lógica do estoque para um pedido; quem baixa é a nota |
| **Lote de inspeção** | O objeto da inspeção de qualidade, com amostra, resultados e decisão |
| **NC / CAPA** | Não conformidade / ação corretiva ou preventiva (8D) |
| **Regra de ICMS/IPI** | O cadastro da VFIS0320 que diz a tributação de um cenário |
| **Finalidade da compra** | Revenda, industrialização ou uso e consumo — muda a tributação |
| **cBenef** | Código de benefício fiscal exigido por alguns estados em CST com benefício |
| **Prévia** | A conferência da NF-e antes de transmitir, com as pendências |
| **Alçada** | O limite de valor que cada aprovador pode liberar |

---

## Segurança e acesso

- Todas as telas exigem login. O papel do usuário (`ADMIN`, `USER`, `VIEWER`) define
  o básico; os **perfis de acesso** (VADM0200) definem, por módulo, o que cada um
  pode ler, incluir, excluir, aprovar, autorizar e executar. O menu esconde o que o
  usuário não pode abrir. O administrador nunca é restringido.
- Aprovações com alçada (crédito do pedido, política comercial do orçamento) ficam
  na VAPR0100, com segregação de funções.
- A troca de senha passa por aprovação do administrador (VSEC0100).
- Tudo o que é alterado fica no histórico (VAUD0100), que não pode ser apagado.

---

## Índice

### Comercial & Vendas

**[Comercial](#comercial)** — Orçamento, pedido de venda, representantes, metas, SAC e promessa de entrega.

| Código | Tela | Para que serve |
|---|---|---|
| [VENT0100](#vent0100--consulta-de-pedido-de-venda) | Consulta de Pedido de Venda | Consultar todos os pedidos de vendas. |
| [VCST0202](#vcst0202--tabelas-de-venda-e-preços-por-item) | Tabelas de Venda e Preços por Item | Criar tabelas de venda, vincular itens, manter preços, unidades, vigência e políticas comerciais. |
| [VVND0100](#vvnd0100--divisão-de-vendas) | Divisão de Vendas | Cadastrar divisões de vendas (equipe/região/unidade) associáveis ao pedido. |
| [VVND0200](#vvnd0200--pedido-de-venda) | Pedido de Venda | Gerir pedidos de venda: capa, itens, confirmação (crédito/reserva/demanda), bloqueio e cancelamento (R→P→F). |
| [VVND0300](#vvnd0300--orçamento-de-venda) | Orçamento de Venda | Registrar propostas comerciais (capa + itens), acompanhar carteira, liberar/bloquear, cancelar/descancelar com motivo, atender, anexar documentos, gerar DAV/Pré-Venda e converter o saldo aberto em pedido de venda. |
| [VVND0310](#vvnd0310--parâmetros-de-orçamento) | Parâmetros de Orçamento | Configurar por empresa os rótulos dos campos comerciais, cliente consumidor final, padrão NFC-e, frete CIF mínimo e redespacho, além dos padrões de comissão e motivos de cancelamento usados no VVND0300. |
| [VVND0400](#vvnd0400--representantes) | Representantes | Cadastrar vendedores/gerentes/prepostos: dados, documento, território, comissão, tipos, pastas (empresas, telefones, e-mails), bloqueio, relatório cadastral e ficha de acompanhamento. |
| [VVND0500](#vvnd0500--metas-de-vendas) | Metas de Vendas | Definir metas comerciais por período, representante e cliente (valor/quantidade), acompanhar previsto × realizado, premiação e saldos excedentes. |
| [VSAC0100](#vsac0100--atendimento-ao-consumidor-sac) | Atendimento ao Consumidor (SAC) | Centralizar consumidores finais, chamados de SAC (recebido/efetuado/garantia), reclamações com sintomas, visitas técnicas, retornos e indicadores. |
| [VDPR0100](#vdpr0100--promessa-de-entrega--ocupação-e-reservas) | Promessa de Entrega — Ocupação e Reservas | Consultar ocupação diária de tanque/setor, criar/simular reserva comercial de capacidade, expirar reservas vencidas e reprogramar datas de entrega em lote. |
| [VEXR0100](#vexr0100--reprogramação-de-entrega) | Reprogramação de Entrega | Registrar e consultar reprogramações de data de entrega por pedido (data original × nova × motivo). |
| [VRES0100](#vres0100--motivos-de-restrição) | Motivos de Restrição | Cadastro de motivos usados nas restrições comerciais e de configuração. |
| [VVND0600](#vvnd0600--workflow-do-pedido-de-venda) | Workflow do Pedido de Venda | Análise, atendimento, conferência e atrasos. |
| [VVND0610](#vvnd0610--reajuste-de-venda-recorrente) | Reajuste de Venda Recorrente | Recalcular e justificar o reajuste de um contrato recorrente. |
| [VVND0700](#vvnd0700--devolução-de-venda) | Devolução de Venda | Devolução do cliente pela NF de venda: NF-e de entrada própria ou NF do cliente, estoque de volta, abatimento, crédito, comissão e séries. |
| [VVND0710](#vvnd0710--contrato-de-venda) | Contrato de Venda | Contrato de fornecimento com o cliente: itens com preço fixado, teto, vigência, programação e pedidos de chamada pelo saldo. |
| [VCLI0600](#vcli0600--manutenção-avançada-de-preços-de-venda) | Manutenção Avançada de Preços de Venda | Consultar histórico, alterar linhas e gerar preços por política. |
| [VREP0600](#vrep0600--complementos-do-representante) | Complementos do Representante | Segmentos, planos, interesses e correspondência. |

**[PDV / Pedidos](#pdv--pedidos)** — Acompanhamento da carteira, políticas de desconto e frete, vendas recorrentes e comissões.

| Código | Tela | Para que serve |
|---|---|---|
| [VPDV0253](#vpdv0253--console-de-acompanhamento-de-pedidos) | Console de Acompanhamento de Pedidos | Visão completa dos pedidos de venda em aberto e sua situação. |
| [VPDV0108](#vpdv0108--cadastro-de-política-comercial-de-descontos) | Cadastro de Política Comercial de Descontos | Cadastrar políticas comerciais de descontos com prioridades, sequências e validade. |
| [VPDV0111](#vpdv0111--cadastro-de-política-comercial-de-fretes) | Cadastro de Política Comercial de Fretes | Determinar valor do frete/seguro com base em critérios definidos pela transportadora. |
| [VVRE0200](#vvre0200--console-de-vendas-recorrentes) | Console de Vendas Recorrentes | Visualizar histórico de recorrências ativas e inativas para um cliente/estabelecimento. |
| [VRE0203](#vre0203--consulta-de-comissões-futuras) | Consulta de Comissões Futuras | Apresentar projeção de recorrências de comissão ativas para um período futuro. |

**[Assistência Técnica](#assistência-técnica)** — Chamados de assistência técnica e os relatórios do atendimento.

| Código | Tela | Para que serve |
|---|---|---|
| [VATC0100](#vatc0100--base-instalada) | Base Instalada | Equipamentos por número de série: onde estão, em que nota foram vendidos, instalação, transferência, baixa e histórico. |
| [VATC0110](#vatc0110--pós-venda-do-item) | Pós-venda do Item | Perfil de pós-venda do item: controle por número de série e máscara de geração da série na entrega da OF. |
| [VATC0300](#vatc0300--ordem-de-serviço) | Ordem de Serviço | Atendimento do chamado no cliente ou na fábrica: agenda, técnico, horas, peças do estoque, despesas, garantia e faturamento. |
| [VATC0310](#vatc0310--sla-da-assistência) | SLA da Assistência | Prazo de resposta e de solução do chamado por prioridade e por cliente; painel de chamados em risco e vencidos. |
| [VATC0320](#vatc0320--recuperação-junto-ao-fornecedor) | Recuperação junto ao Fornecedor | Cobrar do fornecedor o custo da garantia de componente com falha: reclamação, aceite ou recusa e ressarcimento. |
| [VATC0400](#vatc0400--indicadores-do-pós-venda) | Indicadores do Pós-venda | Custo da garantia por item, defeito e lote, recuperado de fornecedores, taxa de falha, MTBF, SLA cumprido e tempo de atendimento. |
| [VATC0280](#vatc0280--cadastro-de-chamados) | Cadastro de Chamados | Cadastrar chamados com dados do consumidor, tipo, garantia, motivo, responsável e posição. |
| [VATC0480](#vatc0480--consulta-de-chamados) | Consulta de Chamados | Consultar chamados cadastrados por diversos filtros como tipo, data, grupo, motivo, consumidor, responsável e situação. |
| [VATC0380](#vatc0380--relatório-de-chamados) | Relatório de Chamados | Listar chamados com opções de filtro por data, UF, cidade, consumidor, responsável, tipo, grupo, motivo, posição e situação. |
| [VSAC0200](#vsac0200--relatórios-e-anexos-do-atendimento) | Relatórios e Anexos do Atendimento | Etiquetas, relatórios e documentos do chamado. |

**[Garantia](#garantia)** — Devolução de garantia (RMA) ligada ao chamado.

| Código | Tela | Para que serve |
|---|---|---|
| [VGAR0211](#vgar0211--gerar-pedido-de-devolução) | Gerar Pedido de Devolução | Gerar os pedidos de devolução. |

**[Cliente](#cliente)** — Cadastro de clientes e os cadastros de apoio (região, portador, condição de pagamento, tabela de venda, tipos de nota).

| Código | Tela | Para que serve |
|---|---|---|
| [VCLI0202](#vcli0202--cadastro-de-percentuais-de-frete-por-cliente) | Cadastro de Percentuais de Frete Por Cliente | Cadastrar percentuais de frete por cliente e estabelecimentos. |
| [VCLI0117](#vcli0117--cadastro-de-permissões-e-restrições-de-venda) | Cadastro de Permissões e Restrições de Venda | Restringir ou permitir a venda de itens ou classificação fiscal para clientes, estabelecimentos ou representantes. |
| [VCLI0500](#vcli0500--cadastro-de-cliente) | Cadastro de Cliente | Cadastrar clientes (matriz/filiais), dados fiscais, apoios vinculados, endereços, contatos e bloqueio/desbloqueio. |
| [VCLI0510](#vcli0510--apoio-de-cliente--básico) | Apoio de Cliente — Básico | Manter os cadastros de apoio básicos: região, segmento de mercado, tipo de contato, tipo de cliente, portador e grupo de portadores. |
| [VCLI0520](#vcli0520--apoio-de-cliente--comercial) | Apoio de Cliente — Comercial | Manter condições de pagamento (com parcelas) e tabelas de vendas usadas pelo pedido de venda. |
| [VCLI0530](#vcli0530--apoio-de-cliente--fiscal) | Apoio de Cliente — Fiscal | Manter tipos de nota fiscal de saída e tipos de imposto (composição de base de cálculo) padrão do cliente. |

**[Custos / Precificação](#custos--precificação)** — Custo-padrão do produto e margem de contribuição.

| Código | Tela | Para que serve |
|---|---|---|
| [VCUS0200](#vcus0200--margem-de-contribuição) | Margem de Contribuição | Quanto sobra de cada venda depois de impostos, custo, despesas e do descasamento de caixa; parâmetros do mês e apuração por item e cliente. |
| [VCUS0100](#vcus0100--custos--centro-compra-alocação-e-overhead) | Custos — Centro, Compra, Alocação e Overhead | Custo/hora por centro de trabalho, custo de compra por item, base de alocação, overhead e rollup do custo padrão. |

### Industrial & Produção

**[Engenharia](#engenharia)** — Itens, estruturas, roteiros, máquinas, desenhos, PDM e o configurador de produto.

| Código | Tela | Para que serve |
|---|---|---|
| [VDES0100](#vdes0100--desenhos-técnicos) | Desenhos Técnicos | Cadastrar desenhos (código/dígito/formato), revisões com vigência/aprovação e características. |
| [VBOM0100](#vbom0100--cabeçalhos-de-estrutura-bom) | Cabeçalhos de Estrutura (BOM) | Versão, tipo de estrutura de engenharia/fabricação e situação por item. |
| [VPME0102](#vpme0102--parâmetros-de-promessa-de-entrega) | Parâmetros de Promessa de Entrega | Configurar os parâmetros globais do módulo de promessa de entrega. |
| [VPME0102ITE](#vpme0102ite--calendário-de-promessa-de-entrega-por-item) | Calendário de Promessa de Entrega por Item | Cadastrar dias úteis e não úteis para enchimento de tanques por item e máscara. |
| [VITM0100](#vitm0100--item--prontidão-para-o-mrp) | Item & Prontidão para o MRP | Listar itens, cadastrar (pastas PDM/Almox/Engenharia/Planejamento) e validar a prontidão para o MRP (checklist de BOM/roteiro/fornecedor/conversão) + estrutura. |
| [VMAQ0101](#vmaq0101--tipos-de-máquina) | Tipos de Máquina | Cadastrar categorias de equipamento (corte, dobra, solda, pintura, torno…). |
| [VMAQ0200](#vmaq0200--máquinas-tempos-e-cálculo) | Máquinas, Tempos e Cálculo | Cadastrar máquinas (capacidade/eficiência), tempos por item × máquina, agenda e calcular o tempo de produção (ciclos, setup, gargalo). |
| [VENT0108](#vent0108--calendário-financeiro) | Calendário Financeiro | Manutenção dos dias não úteis do calendário financeiro. |
| [VENT0200](#vent0200--cadastro-de-itens) | Cadastro de Itens | Cadastro e manutenção de itens do estoque. |
| [VENT0250](#vent0250--governança-do-cadastro) | Governança do Cadastro | Liberação do cadastro do item por área, campos obrigatórios, bloqueio, descontinuação com substituto e histórico campo a campo. |
| [VENT0210](#vent0210--cadastro-de-estrutura-de-produtos) | Cadastro de Estrutura de Produtos | Realize o cadastro das estruturas dos produtos. |
| [VENT0204](#vent0204--cadastro-de-grupo) | Cadastro de Grupo | Cadastro e manutenção de grupos do PDM. |
| [VENT0115](#vent0115--cadastro-de-roteiro-padrão) | Cadastro de Roteiro Padrão | Cadastrar roteiros padrão para agilizar o cadastro dos roteiros de fabricação. |
| [VENT0202](#vent0202--cadastro-do-roteiro-de-fabricação) | Cadastro do Roteiro de Fabricação | Cadastrar operações e roteiros padrões na sequência de fabricação. |
| [VENT0363](#vent0363--relatório-de-tempo-de-centro-de-trabalho) | Relatório de Tempo de Centro de Trabalho | Listar os tempos de fabricação por centro de trabalho. |
| [VENG0204](#veng0204--cadastro-de-regras-de-variáveis-equivalentes) | Cadastro de Regras de Variáveis Equivalentes | Cadastrar regras para itens configurados conforme a configuração do item pai. |
| [VITE0313](#vite0313--geração-de-máscara-para-itens-configurados) | Geração de Máscara para Itens Configurados | Gerar combinações válidas de itens configurados para novas máscaras. |
| [VITE0114](#vite0114--cadastro-de-grupos-pdm) | Cadastro de Grupos (PDM) | Cadastrar grupos para a Padronização da Descrição dos Materiais. |
| [VITE0115](#vite0115--cadastro-de-modificadores-pdm) | Cadastro de Modificadores (PDM) | Cadastrar modificadores referentes aos grupos do PDM. |
| [VITE0116](#vite0116--cadastro-de-atributos-pdm) | Cadastro de Atributos (PDM) | Cadastrar atributos ligados a um determinado modificador do PDM. |
| [VITE0118](#vite0118--cadastro-de-regras-de-itens-configurados) | Cadastro de Regras de Itens Configurados | Cadastrar regras para itens configurados e definir onde estas regras devem ser executadas. |
| [VITE0129](#vite0129--recarga-de-descrições-de-itens-configurados) | Recarga de Descrições de Itens Configurados | Recarregar e renderizar descrições configuradas usando as regras vigentes. |
| [VCFG0100](#vcfg0100--conjuntos-e-variáveis-do-configurador) | Conjuntos e Variáveis do Configurador | Conjuntos de respostas, variáveis, máscaras e traduções. |
| [VCFG0200](#vcfg0200--características-do-configurador) | Características do Configurador | Tipos, fórmulas, limites, idiomas e itens de recebimento. |
| [VCFG0300](#vcfg0300--características-por-item) | Características por Item | Ordenação e comportamento das características de cada item configurável. |
| [VCFG0400](#vcfg0400--geração-de-máscaras-configuradas) | Geração de Máscaras Configuradas | Geração individual ou cartesiana de máscaras por respostas. |
| [VCFG0500](#vcfg0500--descrições-configuradas) | Descrições Configuradas | Tipos, linhas e renderização de descrições de itens configurados. |
| [VCFG0600](#vcfg0600--regras-do-configurador) | Regras do Configurador | Regras equivalentes pai-filho e regras de preenchimento do item. |
| [VENG0300](#veng0300--cabeçalho-e-revisão-de-estrutura-bom) | Cabeçalho e Revisão de Estrutura BOM | Versão, efetividade e status da estrutura do produto. |
| [VENG0400](#veng0400--desenhos-e-revisões) | Desenhos e Revisões | Desenhos, revisões, distribuição, características e parâmetros fabris. |
| [VENG0500](#veng0500--estruturas-avançadas) | Estruturas Avançadas | Manutenção, explosão e onde-usado de estruturas. |
| [VMAQ0300](#vmaq0300--tempos-e-programação-de-máquina) | Tempos e Programação de Máquina | Tempos produtivos e agenda da máquina. |
| [VENG0600](#veng0600--rede-de-precedência-do-roteiro) | Rede de Precedência do Roteiro | Manter dependências e sobreposição entre operações do roteiro. |
| [VENG0610](#veng0610--seriais-físicos-de-ferramentas) | Seriais Físicos de Ferramentas | Consultar e manter instâncias serializadas de ferramentas. |

**[Produção](#produção)** — Ordem de produção, capacidade (CRP), sequenciamento (APS), plano de corte, ferramentas e paradas.

| Código | Tela | Para que serve |
|---|---|---|
| [VPRO0200](#vpro0200--crp--capacity-requirements-planning) | CRP — Capacity Requirements Planning | Calcular carga por centro de trabalho/dia e identificar sobrecargas de um plano MRP. |
| [VPRO0210](#vpro0210--aps--sequenciamento--gantt) | APS — Sequenciamento / Gantt | Sequenciar ordens em capacidade finita (EDD) e visualizar o Gantt por ordem/centro. |
| [VPRO0300](#vpro0300--custo-padrão) | Custo Padrão | Calcular o custo padrão (material + operação + overhead) com rollup multinível. |
| [VPRO0400](#vpro0400--qualidade--pontos-de-inspeção) | Qualidade — Pontos de Inspeção | Cadastrar pontos de inspeção (recebimento/processo/final) e registrar laudos. |
| [VPRO0500](#vpro0500--manutenção-preventiva) | Manutenção Preventiva | Planos de manutenção e ordens (PLANNED→IN_PROGRESS→DONE); horas descontadas no CRP. |
| [VPRO0600](#vpro0600--previsão-estatística) | Previsão Estatística | Prever demanda com modelos estatísticos (Holt-Winters, suavização, média móvel) — menor MAPE. |
| [VPRO0700](#vpro0700--alertas-de-exceções-mrp) | Alertas de Exceções MRP | Consolidar e notificar exceções do MRP via webhook e/ou e-mail. |
| [VPRO0800](#vpro0800--restrições-e-configurador) | Restrições e Configurador | Definir regras de validade de combinações de atributos e avaliá-las com um contexto. |
| [VCUT0100](#vcut0100--plano-de-corte) | Plano de Corte | Otimizar aproveitamento de matéria-prima (nesting 1D/2D/true-shape): demanda, estoque, otimizar, firmar (baixa + retalhos), programa, agenda e export SVG/DXF/PDF. |
| [VPRO0900](#vpro0900--ordem-de-produção) | Ordem de Produção | Gerir a OF: ciclo OPEN→IN_PROGRESS→COMPLETED→CLOSED, apontamentos, consumos (OUT), conclusão (IN+lote), custo real e sucata. |
| [VPRO1000](#vpro1000--ficha-de-produção-da-ferramenta) | Ficha de Produção da Ferramenta | Vincular a série física de ferramenta em cada operação da OF (substituição com histórico) e cadastrar ferramentas/séries com vida útil. |
| [VAPS0100](#vaps0100--grupos-e-parâmetros-de-recursos-aps) | Grupos e Parâmetros de Recursos APS | Agrupamento, capacidade, calendário e criticidade de recursos. |
| [VAPS0200](#vaps0200--calendários-de-máquinas) | Calendários de Máquinas | Intervalos semanais de disponibilidade para capacidade finita. |
| [VAPS0400](#vaps0400--perfil-de-operadores-aps) | Perfil de Operadores APS | Contatos, funções, supervisão e centros de custo de operadores. |
| [VAPS0500](#vaps0500--perfil-industrial-de-máquinas) | Perfil Industrial de Máquinas | Preparação, responsáveis, serviços, itens e campos especiais. |
| [VAPS0600](#vaps0600--cálculo-e-consulta-do-sequenciamento-aps) | Cálculo e Consulta do Sequenciamento APS | Cálculo, recursos, visão, exportação e parâmetros do sequenciamento. |
| [VPRO1100](#vpro1100--estoque-da-manufatura) | Estoque da Manufatura | Parâmetros de lotes, baixas e endereçamento produtivo. |
| [VPRO1200](#vpro1200--parada-de-máquina) | Parada de Máquina | Terminal de chão de fábrica: registrar que a máquina parou e que voltou, sem digitar horário. |

**[Manutenção](#manutenção)** — Ordens de manutenção e paradas de máquina.

| Código | Tela | Para que serve |
|---|---|---|
| [VMAN0202](#vman0202--apontamento-de-ordens-de-serviço-de-manutenção) | Apontamento de Ordens de Serviço de Manutenção | Realizar movimentações das ordens de serviço de manutenções. |
| [VMAN0401](#vman0401--consulta-ordens-de-serviço) | Consulta Ordens de Serviço | Listar as ordens de serviço de manutenção realizadas. |
| [VAPS0300](#vaps0300--paradas-de-máquinas) | Paradas de Máquinas | Indisponibilidades planejadas e emergenciais de recursos. |

**[Planejamento](#planejamento)** — MRP, pipeline de planejamento, previsão de vendas, demandas e cargas.

| Código | Tela | Para que serve |
|---|---|---|
| [VPLN0100](#vpln0100--pipeline-de-planejamento-mrpcrpaps) | Pipeline de Planejamento (MRP→CRP→APS) | Executar MRP, CRP e APS num único disparo com parecer de viabilidade, e manter parâmetros de planejamento. |
| [VPLA0102](#vpla0102--cadastro-de-demandas-independentes) | Cadastro de Demandas Independentes | Cadastrar demandas independentes para o Cálculo do Planejamento. |
| [VMRP0100](#vmrp0100--mrp--planejamento-de-materiais) | MRP — Planejamento de Materiais | Rodar o MRP por plano, analisar sugestões de ordens, firmar (→ Ordem Planejada/OF), perfil MRP por item, exceções e regras configuradas. |
| [VPRE0101](#vpre0101--tabela-de-apropriação) | Tabela de Apropriação | Determinar o percentual de acomodação dos itens nos dias da semana. |
| [VPRE0102](#vpre0102--bloqueio-de-previsão-de-vendas) | Bloqueio de Previsão de Vendas | Informar períodos em que as previsões de venda devem estar bloqueadas. |
| [VPRE0201](#vpre0201--cadastro-da-previsão-de-vendas) | Cadastro da Previsão de Vendas | Cadastrar a previsão de vendas manualmente e dar manutenção nas previsões geradas. |
| [VPRE0251](#vpre0251--geração-de-previsão-de-vendas) | Geração de Previsão de Vendas | Gerar previsão de vendas com base no histórico de pedidos e/ou faturamento. |
| [VPRE0301](#vpre0301--listagem-vendas-previsto-x-realizado) | Listagem Vendas Previsto X Realizado | Listar e comparar a previsão de vendas com o realizado por período. |
| [VPLC0211](#vplc0211--cadastro-de-orientações-de-entrega) | Cadastro de Orientações de Entrega | Incluir informações no romaneio de entrega para orientar o motorista em outras atividades. |
| [VPLC0200](#vplc0200--montagem-de-carga) | Montagem de Carga | Selecionar pedidos e gerar cargas para faturamento, etiquetas e emissão de notas fiscais por carga. |
| [VMRP0200](#vmrp0200--pipeline-mrp--crp--aps) | Pipeline MRP → CRP → APS | Execução coordenada do planejamento de materiais, capacidade e sequência. |
| [VPLA0300](#vpla0300--parâmetros-do-planejamento) | Parâmetros do Planejamento | Parâmetros numerados consumidos pelo MRP e planejamento industrial. |
| [VCAL0200](#vcal0200--dias-úteis-prometidos-por-item) | Dias Úteis Prometidos por Item | Calendário mensal efetivo da promessa do item. |

**[Suprimento](#suprimento)** — Fornecedores, pedido de compra, solicitação, cotação, contratos, recebimento e serviços de terceiros.

| Código | Tela | Para que serve |
|---|---|---|
| [VPCT0100](#vpct0100--tolerâncias-de-pedido-de-compra) | Tolerâncias de Pedido de Compra | Faixas de tolerância de quantidade, preço e total por operação e fornecedor, com bloqueio ou alerta. |
| [VTPS0100](#vtps0100--serviços-de-terceiros) | Serviços de Terceiros | Preços de serviço por item×fornecedor×operação e ordens de serviço (OF→requisição→OC). |
| [VPDC0200](#vpdc0200--pedido-de-compra) | Pedido de Compra | Pedido de compra completo: capa, itens, alçada, PDF e envio ao fornecedor por e-mail, acompanhamento de entregas, histórico de preço, notas por linha, previsão de pagamentos e sugestões do MRP. |
| [VSUP0500](#vsup0500--cadastro-de-fornecedor) | Cadastro de Fornecedor | Cadastrar fornecedores/transportadoras: dados, endereço, pastas (telefones/emails/vencimentos/contatos/empresas), SEFAZ, auto-fill CNPJ e bloqueio. |
| [VSUP0110](#vsup0110--conversão-de-um-por-item) | Conversão de UM por Item | Cadastrar fatores de conversão entre unidades de medida de um item (ex.: 1 CX = 12 UN) para o pedido de compra. |
| [VSUP0120](#vsup0120--tabela-de-preço-de-compra) | Tabela de Preço de Compra | Cadastrar tabelas de preço de compra (genéricas ou por fornecedor) com vigência, moeda e itens. |
| [VSUP0140](#vsup0140--cadastro-de-transportadora) | Cadastro de Transportadora | Cadastrar o perfil de transporte do fornecedor transportadora: RNTRC/ANTT, modal, tabela de frete, seguro, frota com motorista, regiões atendidas com prazo, ocorrências de entrega e cotação comparativa de frete. |
| [VSUP0130](#vsup0130--fornecedor-preferencial-por-item) | Fornecedor Preferencial por Item | Vincular fornecedores a um item com ranking de preferência, código/descrição/UM do item no fornecedor e lead time. |
| [VSUP0300](#vsup0300--solicitação-de-compra) | Solicitação de Compra | Registrar solicitações de compra (itens com saldo/atendimento) e gerar pedidos agrupando por fornecedor. |
| [VSUP0400](#vsup0400--cotação-de-compra) | Cotação de Compra | Liberar itens para cotação, registrar preços por fornecedor, selecionar o vencedor e gerar pedidos. |
| [VCON0200](#vcon0200--cadastro-de-contratos-de-fornecedores) | Cadastro de Contratos de Fornecedores | Cadastrar contratos com fornecedores para acompanhamento de quantidades contratadas e recebidas. |
| [VCON0400](#vcon0400--consulta-de-contratos-de-fornecedores) | Consulta de Contratos de Fornecedores | Visualizar dados referentes aos contratos de fornecedores. |
| [VCON0202](#vcon0202--baixa-de-saldo--cancelamento-do-contrato) | Baixa de Saldo / Cancelamento do Contrato | Consumir saldo de linhas do contrato (baixa) e cancelar o contrato via status. |
| [VAVR0200](#vavr0200--aviso-de-recebimento) | Aviso de Recebimento | Agendar doca, informar itens esperados, acompanhar conferência e tratar divergências antes da entrada fiscal. |
| [VVOR0202](#vvor0202--cadastro-de-itens-por-fornecedor) | Cadastro de Itens por Fornecedor | Configurar o cadastro de itens personalizados para cada fornecedor. |
| [VSUP0610](#vsup0610--alçadas-e-parâmetros-de-compras) | Alçadas e Parâmetros de Compras | Limites de aprovação e parâmetros operacionais de suprimentos. |
| [VSUP0620](#vsup0620--edi-de-fornecedores) | EDI de Fornecedores | Confirmações eletrônicas de pedidos e divergências de quantidade, preço e prazo. |
| [VPDC0210](#vpdc0210--consulta-aprovação-e-recebimento-de-pedidos) | Consulta, Aprovação e Recebimento de Pedidos | Consulta operacional, alçada e recebimento físico do pedido de compra. |
| [VTER0100](#vter0100--preços-de-serviços-de-terceiros) | Preços de Serviços de Terceiros | Preços, vigência, fórmula, reajuste, cópia e histórico. |
| [VTER0200](#vter0200--ordens-de-serviço-de-terceiros) | Ordens de Serviço de Terceiros | Geração pela OF e acompanhamento de requisição, compra e execução. |
| [VTER0300](#vter0300--remessas-e-retornos-de-terceiros) | Remessas e Retornos de Terceiros | Movimentos de remessa, retorno, recebimento e ajuste. |
| [VTER0400](#vter0400--conversões-globais-de-terceiros) | Conversões Globais de Terceiros | Fatores globais de conversão de unidades para terceiros. |
| [VSUP0640](#vsup0640--registros-operacionais-de-compras) | Registros Operacionais de Compras | Ocorrências normalizadas de compra, recebimento e inspeção. |
| [VSUP0650](#vsup0650--histórico-de-movimentos-de-compra) | Histórico de Movimentos de Compra | Rastreabilidade consolidada de movimentos por fornecedor e item. |
| [VSUP0660](#vsup0660--parâmetros-e-contatos-do-fornecedor) | Parâmetros e Contatos do Fornecedor | Configurar regras do fornecedor e complementar contatos persistidos. |
| [VSUP0670](#vsup0670--itens-e-qualidade-do-fornecedor) | Itens e Qualidade do Fornecedor | Consultar itens e anexar relatórios de qualidade ao vínculo com o fornecedor. |
| [VSUP0680](#vsup0680--fontes-de-preços-de-compra) | Fontes de Preços de Compra | Selecionar fontes, candidatos e ajustes para tabelas de preços de compra. |

**[Almoxarifado](#almoxarifado)** — Almoxarifados, estoque, inventário, lotes, expedição e o material de terceiros (beneficiamento).

| Código | Tela | Para que serve |
|---|---|---|
| [VLOT0100](#vlot0100--máscaras-de-lotesérie) | Máscaras de Lote/Série | Compor o número de lote/série por partes (caractere/data/sequencial) e gerar o próximo lote. |
| [VEST0500](#vest0500--programação-e-execução-de-contagem-cíclica) | Programação e Execução de Contagem Cíclica | Executar a política definida no item: programar conferências, registrar quantidades, tratar divergências e aprovar. |
| [VENT0800](#vent0800--cadastro-de-almoxarifado) | Cadastro de Almoxarifado | Cadastrar almoxarifados e configurações de estoque. |
| [VEST0100](#vest0100--central-de-estoque) | Central de Estoque | Posição e ATP por situação, extrato (kardex), lançamentos com tipo e centro de custo, transferências, requisições ao almoxarifado, reservas, separação, lotes, reposição e análises (giro, cobertura, parados). |
| [VEST0200](#vest0200--inventário-e-tipos-de-movimento) | Inventário e Tipos de Movimento | Inventário físico com foto do saldo, contagem e recontagem, diferenças valorizadas e fechamento que lança os ajustes; tipos de movimento com as regras do lançamento manual. |
| [VEXP0100](#vexp0100--expedição--romaneio) | Expedição / Romaneio | Montar romaneio de expedição: itens, conferência e despacho (OPEN→SEPARATED→CONFERRED→SHIPPED). |
| [VBEN0100](#vben0100--beneficiamento--remessas-e-retorno-fiscal) | Beneficiamento — Remessas e Retorno Fiscal | Receber a NF-e de remessa do cliente (CFOP 5901), acompanhar saldo por linha, lançar retorno (5902), sobra e sucata (5903) com rastreabilidade, bloquear material sem pedido ou divergente e encerrar com aprovação. |
| [VBEN0200](#vben0200--estoque-de-terceiros--material-do-cliente) | Estoque de Terceiros — Material do Cliente | Saldo do material que pertence ao cliente e está em poder da empresa, por cliente proprietário, item da nota e NF-e de remessa, ordenado pelo prazo fiscal de retorno. Não entra na valoração do estoque próprio. |
| [VEXP0110](#vexp0110--gestão-de-cargas-de-expedição) | Gestão de Cargas de Expedição | Montagem, liberação, carregamento e despacho de cargas. |
| [VEXP0120](#vexp0120--instruções-e-caixas-de-despacho) | Instruções e Caixas de Despacho | Orientações de entrega e posições físicas da expedição. |
| [VEST0400](#vest0400--consultas-de-estoque-por-almoxarifado) | Consultas de Estoque por Almoxarifado | Movimentos e saldos persistidos por almoxarifado. |

**[Importação](#importação)** — Processos de importação e custo nacionalizado.

| Código | Tela | Para que serve |
|---|---|---|
| [VIMP0200](#vimp0200--console-de-processos-de-importação) | Console de Processos de Importação | Manutenção e acompanhamento dos processos de importação, centralizando informações em um único local. |
| [VIMP0102](#vimp0102--conhecimentos-de-transporte-ct-e) | Conhecimentos de Transporte (CT-e) | Cadastrar, consultar e autorizar conhecimentos de transporte (CT-e) vinculáveis às entradas e processos de importação. |
| [VIMP0101](#vimp0101--status-logístico-da-carga) | Status Logístico da Carga | Acompanhar a situação logística dos processos de importação: aberto, nacionalizado ou cancelado. |
| [VIMP0300](#vimp0300--importação-e-custo-nacionalizado) | Importação e Custo Nacionalizado | Processos, despesas, rateio e recálculo do custo de importação. |

**[Inspeção](#inspeção)** — Qualidade: lote de inspeção, amostragem NBR 5426, CAPA/8D, metrologia, certificados, documentos e avaliação de fornecedores.

| Código | Tela | Para que serve |
|---|---|---|
| [VINS0700](#vins0700--certificados-de-qualidade) | Certificados de Qualidade | Certificado ao cliente com lote, corrida, certificado da usina e o resumo das medições dos lotes de inspeção aprovados (PDF). |
| [VINS0800](#vins0800--documentos-da-qualidade) | Documentos da Qualidade | Instruções de trabalho, procedimentos e formulários com revisão, aprovação por quem não elaborou e histórico de revisões obsoletas. |
| [VINS0600](#vins0600--metrologia) | Metrologia | Instrumentos de medição, calibrações com resultado pelo erro máximo admissível, vencimentos e impacto da calibração reprovada. |
| [VINS0500](#vins0500--não-conformidades-e-capa8d) | Não conformidades e CAPA/8D | Não conformidades com lote de inspeção, CAPA pelo 8D ou simples (5 porquês, Ishikawa), ações com responsável e prazo e verificação de eficácia. |
| [VINS0300](#vins0300--lotes-de-inspeção) | Lotes de Inspeção | Lote único de inspeção (recebimento, processo, final): resultados por unidade da amostra, avaliação NBR 5426 e decisão de uso que libera o estoque. |
| [VINS0110](#vins0110--amostragem-nbr-5426) | Amostragem NBR 5426 | Calculadora da norma, procedimentos de amostragem e severidade (normal, apertada, atenuada) por item e fornecedor. |
| [VINS0106](#vins0106--cadastro-de-ocorrências) | Cadastro de Ocorrências | Cadastrar ocorrências para itens na inspeção. |
| [VINS0400](#vins0400--consulta-de-ocorrências--ordens-de-inspeção) | Consulta de Ocorrências / Ordens de Inspeção | Consultar ocorrências cadastradas e ordens de inspeção detalhadas. |
| [VINS0313](#vins0313--consulta-de-inspeções-de-recebimento) | Consulta de Inspeções de Recebimento | Gerar relatório em Excel com os dados das inspeções de recebimento. |
| [VINS0200](#vins0200--cadastro-do-roteiro-de-inspeção) | Cadastro do Roteiro de Inspeção | Cadastrar o roteiro de inspeção para itens que serão inspecionados. |
| [VINS0201](#vins0201--manutenção-das-ordens-de-inspeções) | Manutenção das Ordens de Inspeções | Mostrar e gerenciar ordens que podem ser inspecionadas ou analisadas. |
| [VINS0206](#vins0206--tratamento-das-ordens-de-inspeção) | Tratamento das Ordens de Inspeção | Analisar quantidades inspecionadas e efetivar a destinação física (aprovado/rejeitado/retrabalho). |
| [VAVF0101](#vavf0101--cadastro-de-parâmetros-de-avaliação-de-fornecedores) | Cadastro de Parâmetros de Avaliação de Fornecedores | Cadastrar pesos, notas e intervalos de avaliação para o IQF dos fornecedores. |
| [VAVF0204](#vavf0204--envio-de-iqf-aos-fornecedores) | Envio de IQF aos Fornecedores | Calcular e enviar o IQF aos fornecedores com layout de e-mail personalizado. |
| [VSUP0600](#vsup0600--inspeção-de-recebimento) | Inspeção de Recebimento | Roteiros, ordens, resultados, análise e destinação de inspeções de compra. |
| [VAVF0300](#vavf0300--scorecard-e-iqf-do-fornecedor) | Scorecard e IQF do Fornecedor | Cálculo automático, lançamento manual e histórico do IQF. |
| [VAVF0203](#vavf0203--homologação-de-fornecedores) | Homologação de Fornecedores | Faixas, validade e geração de vínculos de itens do fornecedor. |

### Administrativo & Financeiro

**[Financeiro](#financeiro)** — Contas bancárias, plano de contas, contas a pagar e a receber, fluxo de caixa, adiantamentos e conciliação.

| Código | Tela | Para que serve |
|---|---|---|
| [VFIN0100](#vfin0100--contas-bancárias) | Contas Bancárias | Cadastrar contas bancárias com saldo inicial e chave PIX. |
| [VFIN0110](#vfin0110--condições-de-pagamento) | Condições de Pagamento | Cadastrar condições de pagamento (parcelas em dias) do módulo financeiro. |
| [VFIN0120](#vfin0120--plano-de-contas) | Plano de Contas | Manter o plano de contas (tipo/natureza, hierarquia). |
| [VFIN0130](#vfin0130--centros-de-custo) | Centros de Custo | Cadastrar centros de custo. |
| [VFIN0200](#vfin0200--contas-a-pagar) | Contas a Pagar | Lançar, aprovar, baixar e cancelar contas a pagar; rateio e visão por plano de contas; aging. |
| [VFIN0210](#vfin0210--contas-a-receber) | Contas a Receber | Lançar, baixar e cancelar contas a receber; aging. |
| [VFIN0300](#vfin0300--fluxo-de-caixa-e-saldos) | Fluxo de Caixa e Saldos | Extrato realizado, projeção de caixa e saldos das contas. |
| [VFIN0400](#vfin0400--apuração-de-impostos) | Apuração de Impostos | Apurar ICMS/IPI/PIS/COFINS por competência. |
| [VFIN0500](#vfin0500--relatórios-fiscais-e-financeiros) | Relatórios Fiscais e Financeiros | Relatórios R01–R19 (livros, DRE, aging, curva ABC, produtos). |
| [VFIN0600](#vfin0600--adiantamentos-de-clientes-e-fornecedores) | Adiantamentos de Clientes e Fornecedores | Registrar, consultar e aplicar antecipações em contas a pagar ou receber. |
| [VFIN0610](#vfin0610--remessa-bancária-cnab-240) | Remessa Bancária CNAB 240 | Gerar arquivo de remessa CNAB 240 para envio ao banco. |
| [VFIN0620](#vfin0620--conciliação-bancária-por-ofx) | Conciliação Bancária por OFX | Importar extrato OFX real e conciliar movimentos da conta bancária. |

**[Fiscal](#fiscal)** — Configuração fiscal, NF-e de saída e de entrada, regras de ICMS/IPI, simulador, apurações, SPED e reforma tributária.

| Código | Tela | Para que serve |
|---|---|---|
| [VFIS0100](#vfis0100--configuração-fiscal) | Configuração Fiscal | Configurar emitente, endereço, Focus NF-e, alíquotas e vencimentos. |
| [VFIS0110](#vfis0110--tabelas-tributárias) | Tabelas Tributárias | Manter tabelas NCM (IPI/PIS/COFINS) e ICMS interno/interestadual. |
| [VFIS0200](#vfis0200--nf-e-de-saída) | NF-e de Saída | Emitir NF-e de saída (avulsa ou faturando o pedido de venda): rascunho, prévia, autorização, CC-e, cancelamento. |
| [VFIS0210](#vfis0210--nf-e-de-entrada) | NF-e de Entrada | Importar o XML da NF-e de entrada, conciliar itens com o cadastro, plano de contas por item, parcelas e aprovar. |
| [VFIS0220](#vfis0220--ct-e-conhecimento-de-transporte) | CT-e (Conhecimento de Transporte) | Registrar CT-e e ratear frete vinculado à NF-e de entrada. |
| [VFIS0300](#vfis0300--cfops-e-naturezas-de-operação) | CFOPs e Naturezas de Operação | Manter CFOPs e suas classificações de utilização. |
| [VFIS0310](#vfis0310--dispositivos-legais) | Dispositivos Legais | Cadastrar dispositivos legais (ICMS/IPI/PIS/COFINS/laudo). |
| [VFIS0320](#vfis0320--parâmetros-icmsipi) | Parâmetros ICMS/IPI | Parâmetros básicos de ICMS/IPI por NCM/Item, UF e operação. |
| [VFIS0325](#vfis0325--simulador-de-tributação) | Simulador de Tributação | Calcular ICMS, IPI, PIS/COFINS, ST e DIFAL de uma venda como a NF-e vai calcular, por cliente, UF, finalidade e tipo de nota — sem gravar nada. |
| [VFIS0340](#vfis0340--apuração-do-simples-nacional) | Apuração do Simples Nacional | Apuração mensal do Simples Nacional por anexo. |
| [VFIS0350](#vfis0350--classificações-fiscais) | Classificações Fiscais | Cadastro de classificação fiscal de mercadorias (NCM/CEST), idiomas e atributos de exportação. |
| [VFIS0360](#vfis0360--tipos-de-operação-de-entrada) | Tipos de Operação de Entrada | Natureza fiscal das compras, grupos de estado e validação UF×natureza. |
| [VFIS0500](#vfis0500--motivos-de-transferência-dapi) | Motivos de Transferência DAPI | Cadastrar motivos de transferência usados na DAPI. |
| [VFIS0510](#vfis0510--códigos-de-ajuste-de-apuração-icms-511) | Códigos de Ajuste de Apuração ICMS (5.1.1) | Códigos de ajuste de apuração ICMS do SPED Fiscal por UF. |
| [VFIS0520](#vfis0520--códigos-de-ajuste-icms-52535657) | Códigos de Ajuste ICMS (5.2/5.3/5.6/5.7) | Códigos de ajuste ICMS para benefícios, incentivos e estornos. |
| [VFIS0530](#vfis0530--linhas-de-apuração-de-icms) | Linhas de Apuração de ICMS | Linhas do bloco E do SPED Fiscal (apuração de ICMS). |
| [VFIS0540](#vfis0540--lançamentos-resumo-de-icms) | Lançamentos Resumo de ICMS | Resumo de ICMS por período/UF/CFOP e notas vinculadas (+ adicionais C197). |
| [VFIS0550](#vfis0550--restituição--ressarcimento-de-icms-st) | Restituição / Ressarcimento de ICMS ST | Pedidos de restituição/ressarcimento/complementação de ICMS ST. |
| [VFIS0560](#vfis0560--notas-especiais-de-ajuste) | Notas Especiais de Ajuste | Notas complementares e de ajuste de apuração de ICMS (com itens). |
| [VNFS0100](#vnfs0100--nfs-e-nota-fiscal-de-serviço) | NFS-e (Nota Fiscal de Serviço) | Emitir, autorizar e cancelar NFS-e (modelo ABRASF via Focus), com cálculo de ISS. |
| [VFIS0620](#vfis0620--manifestação-e-inutilização-de-nf-e) | Manifestação e Inutilização de NF-e | Transmitir eventos fiscais de destinatário e faixas inutilizadas. |
| [VFIS0630](#vfis0630--tabela-ibpt) | Tabela IBPT | Importar a tabela oficial e consultar carga tributária por NCM e UF. |
| [VFIS0640](#vfis0640--faturamento-de-carga-e-danfe) | Faturamento de Carga e DANFE | Gerar NF-e a partir da carga e consultar documentos autorizados. |
| [VFIS0670](#vfis0670--reforma-tributária-ibscbs) | Reforma Tributária (IBS/CBS) | Alíquotas de IBS e CBS por ano, cClassTrib padrão por CFOP e tabela oficial de classificação tributária. |
| [VFIS0120](#vfis0120--exclusão-de-tributação-ncm) | Exclusão de Tributação NCM | Remover tributação NCM obsoleta de forma controlada. |
| [VFIS0660](#vfis0660--consultas-de-parâmetros-fiscais) | Consultas de Parâmetros Fiscais | Consultar cadastros fiscais por chaves e filtros específicos. |
| [VFIS0600](#vfis0600--sped-efd-icmsipi) | SPED EFD ICMS/IPI | EFD do mês gerada das notas de entrada, saída e CT-e, com a apuração do ICMS e do IPI. |
| [VFIS0610](#vfis0610--importação-de-nf-e-por-chave) | Importação de NF-e por Chave | Importação da NF-e de compra, baixa do pedido e entrada em estoque. |

**[Contabilidade](#contabilidade)** — Plano contábil, lançamentos, balancete, contabilização automática e ECD.

| Código | Tela | Para que serve |
|---|---|---|
| [VCTB0102](#vctb0102--cadastro-de-centro-de-custo) | Cadastro de Centro de Custo | Cadastrar e vincular centros de custo às empresas. |
| [VUTL0555](#vutl0555--cadastro-de-ufs-e-países) | Cadastro de UFs e Países | Cadastrar Unidades Federativas (com código IBGE) e Países. Municípios não têm cadastro próprio no backend. |
| [VCTB0200](#vctb0200--contabilidade-sped-ecd) | Contabilidade (SPED ECD) | Plano de contas, contas contábeis, lançamentos e balancete (escrituração). |
| [VCTB0600](#vctb0600--sped-ecd) | SPED ECD | Gerar o arquivo da Escrituração Contábil Digital. |
| [VUTL0560](#vutl0560--consulta-de-uf-e-região) | Consulta de UF e Região | Localizar UF e região comercial por suas chaves. |

**[Cadastros & Plataforma](#cadastros--plataforma)** — Empresa, funcionários, calendários, acesso, aprovações, alertas e auditoria.

| Código | Tela | Para que serve |
|---|---|---|
| [VAUD0100](#vaud0100--histórico-de-alterações) | Histórico de Alterações | Consultar quem realizou cada ação, quando aconteceu e qual cadastro ou processo foi afetado (somente ADMIN). |
| [VNOT0100](#vnot0100--central-de-alertas) | Central de Alertas | Configurar alertas internos, assinaturas, resumos por e-mail, histórico de entregas e reenvios. |
| [VEMP0100](#vemp0100--cadastro-de-empresa) | Cadastro de Empresa | Cadastrar empresa (CNPJ, inscrições, regime tributário, endereço SEFAZ); matriz/filiais. |
| [VFUN0100](#vfun0100--cadastro-de-funcionário) | Cadastro de Funcionário | Cadastrar, editar e desativar funcionários (função, situação, flags). |
| [VLOC0100](#vloc0100--localização-países-e-ufs) | Localização (Países e UFs) | Manter países e UFs (base para endereços e regras fiscais). |
| [VCLA0100](#vcla0100--classificação-de-itens) | Classificação de Itens | Manter máscaras de classificação e a árvore de classificações de itens. |
| [VCAL0100](#vcal0100--calendário-industrial) | Calendário Industrial | Cadastrar dias úteis/não úteis da fábrica, consumidos pelo planejamento. |
| [VPRI0100](#vpri0100--prioridade-de-ordens) | Prioridade de Ordens | Cadastrar níveis de prioridade usados pelo APS no sequenciamento. |
| [VSEC0100](#vsec0100--troca-de-senha) | Troca de Senha | Solicitar a troca da própria senha, acompanhar a aprovação e definir a nova senha; o administrador aprova ou rejeita as solicitações da empresa. |
| [VAPR0100](#vapr0100--aprovações) | Aprovações | Solicitações por alçada (crédito do pedido, política comercial do orçamento) e políticas de aprovação. |
| [VADM0200](#vadm0200--perfis-de-acesso) | Perfis de Acesso | Perfis da empresa com permissão por módulo e ação, e os perfis de cada usuário. |
| [VADM0100](#vadm0100--trilha-de-auditoria) | Trilha de Auditoria | Consulta administrativa de alterações por usuário, rota e período. |

---

## Telas que mudaram de lugar

Estes códigos antigos ainda abrem — por favoritos, atalhos ou hábito —, mas levam à
tela nova, que faz o mesmo e mais. Eles não aparecem no menu.

| Código antigo | Era | Agora é |
|---|---|---|
| VCON0100 | Tipos de Contratos | **VCON0200** — Cadastro de Contratos de Fornecedores |
| VEST0300 | Máscaras de Lote e Série | **VLOT0100** — Máscaras de Lote/Série |
| VFIS0330 | Redução / Substituição / Diferimento de ICMS | **VFIS0320** — Parâmetros ICMS/IPI |
| VPRO0100 | Roteiro de Fabricação | **VENT0202** — Cadastro do Roteiro de Fabricação |
| VSUP0510 | Apoio de Fornecedores | **VSUP0500** — Cadastro de Fornecedor |
| VSUP0630 | Tolerâncias de Pedido de Compra | **VPCT0100** — Tolerâncias de Pedido de Compra |
| VUSR0100 | Solicitações de Troca de Senha | **VSEC0100** — Troca de Senha |

#### VCON0100 — Tipos de Contratos

Código antigo: abre a [VCON0200 — Cadastro de Contratos de Fornecedores](#vcon0200--cadastro-de-contratos-de-fornecedores).

#### VEST0300 — Máscaras de Lote e Série

Código antigo: abre a [VLOT0100 — Máscaras de Lote/Série](#vlot0100--máscaras-de-lotesérie).

#### VFIS0330 — Redução / Substituição / Diferimento de ICMS

Código antigo: abre a [VFIS0320 — Parâmetros ICMS/IPI](#vfis0320--parâmetros-icmsipi).

#### VPRO0100 — Roteiro de Fabricação

Código antigo: abre a [VENT0202 — Cadastro do Roteiro de Fabricação](#vent0202--cadastro-do-roteiro-de-fabricação).

#### VSUP0510 — Apoio de Fornecedores

Código antigo: abre a [VSUP0500 — Cadastro de Fornecedor](#vsup0500--cadastro-de-fornecedor).

#### VSUP0630 — Tolerâncias de Pedido de Compra

Código antigo: abre a [VPCT0100 — Tolerâncias de Pedido de Compra](#vpct0100--tolerâncias-de-pedido-de-compra).

#### VUSR0100 — Solicitações de Troca de Senha

Código antigo: abre a [VSEC0100 — Troca de Senha](#vsec0100--troca-de-senha).

# Comercial & Vendas

## Comercial

*Orçamento, pedido de venda, representantes, metas, SAC e promessa de entrega.*

#### VENT0100 — Consulta de Pedido de Venda

*Rotina de consulta (console de operações). Não altera o pedido.*

**Para que serve.** Consultar a carteira de pedidos de venda e os itens de um
pedido sem correr o risco de alterar nada. Para criar, confirmar, bloquear ou
cancelar, use a **VVND0200**.

**Operações disponíveis.**

| Operação | O que traz |
|---|---|
| Consultar | Todos os pedidos da empresa |
| Abrir pedido | A capa de um pedido (informe o número) |
| Consultar itens | As linhas do pedido, com quantidade, saldo e situação |
| Consultar por cliente | Os pedidos de um cliente (informe o código) |

**Dica.** Para filtros combinados (situação, análise, conferência, período),
use a **VVND0600**; para a visão gerencial com indicadores, a **VPDV0253**.

**Telas relacionadas.** VVND0200 (pedido), VVND0600 (workflow), VPDV0253 (console).

---

#### VCST0202 — Tabelas de Venda e Preços por Item

**Para que serve.** Criar as tabelas de venda e manter o preço de cada item
nelas. É daqui que o orçamento (VVND0300) e o pedido (VVND0200) buscam o preço:
item sem preço ativo em nenhuma tabela não entra no pedido.

**Antes de começar.**
- Itens cadastrados (VENT0200). Para calcular preço sugerido, o item precisa ter
  custo (VCUS0100 / VPRO0300).

**Passo a passo.**
1. **Nova tabela de venda:** informe descrição, casas decimais, formação do
   preço, composição (FOB/CIF) e a validade (de/até). Clique em **Criar tabela**.
2. Selecione a tabela na lista e use **Incluir item na tabela**: item, preço de
   venda, unidade de venda e unidade comercial (com o preço convertido, quando
   são diferentes), situação, disponibilidade, fórmula/referência e observação
   comercial.
3. **Formação de preço:** escolha tabela e item e clique em **Calcular preço
   sugerido** — custo base + margem % + impostos %, ou o resultado da política
   escolhida.
4. **Gerar preços em lote:** escolha tabela e política, liste os itens separados
   por vírgula e clique em **Gerar preços**. O sistema grava os preços (inclui ou
   atualiza) e guarda o histórico da alteração.
5. **Nova política de formação de preço:** fonte de custo, margem, impostos,
   prioridade e comissão — reutilizável na geração em lote.

**Regras e cuidados.**
- O preço precisa ser maior que zero.
- Dados fiscais do produto (NCM, tributação) não ficam aqui: ficam no cadastro
  do item e nas regras fiscais, porque valem para qualquer tabela.
- O cliente pode ter uma **tabela padrão** (VCLI0500/VCLI0520). Quando o item
  existe em mais de uma tabela, o pedido pede para escolher a tabela.

**Telas relacionadas.** VCLI0600 (manutenção avançada e histórico), VPDV0108
(política de descontos), VVND0200, VVND0300.

---

#### VVND0100 — Divisão de Vendas

**Para que serve.** Cadastrar as divisões comerciais da empresa (ex.: Indústria,
Revenda, Exportação) e os parâmetros que cada uma exige no pedido e no orçamento.

**Passo a passo.**
1. **Identificação:** código (maior que zero) e descrição.
2. **Parâmetros de análise:** marque o que a divisão exige — análise comercial,
   análise financeira, planejamento, promessa de entrega, assistência técnica e
   limites de crédito.
3. **Prazos e tributos:** condição de pagamento padrão, prazo mínimo de entrega
   (dias), atraso financeiro tolerado (dias), PIS % e COFINS %.
4. Salve. Na lista é possível ativar/inativar ou excluir a divisão.

**Telas relacionadas.** VVND0200, VVND0300 (a divisão é escolhida na capa).

---

#### VVND0200 — Pedido de Venda

**Para que serve.** Registrar a venda fechada e levá-la ao fluxo da empresa:
crédito, reserva de estoque, demanda para o MRP, expedição e faturamento.

**Antes de começar.**
- Cliente cadastrado (VCLI0500), com tabela de venda padrão ou com a tabela
  escolhida no pedido.
- Itens com preço ativo em uma tabela de venda (VCST0202).
- Condição de pagamento (VFIN0110) e, se houver, representante (VVND0400).

**Passo a passo.**
1. Clique em **Novo pedido**. Em **Dados gerais** preencha:
   - **Identificação:** estabelecimento, cliente, moeda, emissão e entrega;
   - **Condições comerciais:** condição de pagamento, comissão, **finalidade da
     compra** (revenda, industrialização ou uso e consumo — define a tributação
     da nota), portador, canal de venda, pedido do representante e indicador de
     presença;
   - **Nota fiscal:** tipo de NF padrão e estabelecimento de cobrança;
   - **Transporte e expedição:** transportadora, frete, volumes, espécie e pesos;
   - **Projeto:** código e nome, quando a venda pertence a um projeto.
2. Grave: o pedido nasce como **Rascunho (R)**.
3. Aba **Itens:** escolha o item; o sistema mostra as tabelas válidas para ele e
   o preço da tabela. Informe almoxarifado, quantidade, desconto, lote, tipo de NF
   da linha (quando diferente do pedido) e a entrega combinada.
4. Aba **Comissão:** reparta a comissão entre até cinco representantes, com
   papel, percentual e base (total dos produtos ou total líquido). A soma não pode
   passar de 100%.
5. Clique em **Confirmar**. O sistema:
   - confere o **limite de crédito** do cliente (títulos em aberto + outros
     pedidos). Estourou, ou o cliente está bloqueado: o pedido fica **bloqueado**
     e não gera demanda nem reserva;
   - **reserva o estoque** disponível no almoxarifado de cada linha;
   - cria a **demanda** de cada item para o MRP.
6. Aba **Atendimento (MRP):** depois de confirmado, mostra como o MRP vai atender
   cada linha — estoque, ordens firmes, sugestões, o que falta e o que vai chegar
   atrasado. É só consulta; a ação é no MRP (VMRP0100).
7. O pedido passa a **Faturado (F)** sozinho quando a NF-e de saída é autorizada
   (VFIS0200).

**Bloquear, desbloquear e cancelar.**
- **Bloquear/Desbloquear:** bloqueio manual ou de crédito. Se a empresa tiver a
  política de aprovação de crédito ativa (VAPR0100), o desbloqueio só acontece
  pela aprovação; aprovado, o pedido termina a confirmação (reserva e demanda).
- **Cancelar:** exige motivo (e complemento, quando o motivo pede). Os títulos a
  receber ligados ao pedido (sinal, adiantamento, título lançado à mão) são
  cancelados junto. **Não cancela** se algum título já teve recebimento ou se o
  título veio da NF de saída — nesse caso cancele primeiro a nota.

**Telas relacionadas.** VVND0300 (orçamento que vira pedido), VEXR0100
(reprogramação), VVND0600 (análise, conferência, atraso), VFIS0200 (faturar),
VEXP0100 (romaneio), VMRP0100.

---

#### VVND0300 — Orçamento de Venda

**Para que serve.** Montar a proposta comercial, negociar e, quando aceita,
convertê-la em pedido de venda sem redigitar nada.

**Antes de começar.** Cliente (VCLI0500), itens com preço em tabela (VCST0202) e
os parâmetros do orçamento (VVND0310).

**Passo a passo.**
1. **Identificação:** número, estabelecimento, cliente, tipo, representante e
   divisão de vendas. **Condições comerciais:** condição de pagamento, moeda,
   comissão, probabilidade de fechamento, emissão, validade, entrega prevista e
   data firme. Marque **NFC-e** ou **Entrega com recibo** quando for venda a
   consumidor final.
2. **Transporte e valores:** transportadora, tipo de frete, conferir frete,
   frete, redespacho, seguro, descontos e acréscimos.
3. Aba **Itens:** adicione cada item (o preço vem da tabela válida). A grade
   mostra quantidade, atendido, cancelado, saldo, IPI e ST. Em **Como mostrar os
   valores** escolha ver produto, produto + IPI ou o total com ST.
4. Aba **Pagamento:** confira o plano de parcelas gerado pela condição.
5. Abas **Comissão** (rateio entre representantes), **Anexos** (até 10 MB por
   arquivo) e **Histórico** (todos os eventos do orçamento).
6. **Converter em pedido:** cria o pedido de venda com o **saldo aberto** dos
   itens ativos. A confirmação (crédito, reserva, MRP) continua na VVND0200.

**Outras ações.**
- **Gerar DAV:** registra o DAV/Pré-venda. Depois disso só o relatório DAV fica
  liberado nesse orçamento.
- **Bloquear/liberar comercialmente**, **atender manualmente** (encerra sem gerar
  pedido) e **cancelar** — todos pedem motivo. O cancelamento usa um **motivo
  cadastrado**: motivo com indicador **C** exige complemento; só motivo com
  indicador **D** permite descancelar depois.
- **Relatório:** consolidado da carteira de orçamentos com os filtros da barra.

**Regras e cuidados.**
- Orçamento cancelado, vencido, atendido, do tipo *Consulta*, bloqueado ou já
  convertido não pode ser convertido nem alterado.
- Com alterações não salvas na capa, as ações de situação ficam travadas (elas
  recarregam o registro e perderiam o que foi digitado).

**Telas relacionadas.** VVND0310, VVND0200, VCST0202.

---

#### VVND0310 — Parâmetros de Orçamento

**Para que serve.** Configurar, por empresa, as regras de apoio do orçamento de
venda. Qualquer usuário consulta; só administrador grava.

**O que se configura.**
- **Rótulos dos campos comerciais:** como chamar os campos "ordem de compra" e
  "autorização de entrega".
- **NFC-e e consumidor final:** cliente consumidor final padrão, padrão NFC-e e
  se itens de serviço entram na NFC-e.
- **Frete:** frete CIF mínimo (não pode ser negativo) e regra de redespacho.
- **Padrões de comissão:** código, descrição e comissão % dividida entre *no
  faturamento %* e *no pagamento %* — a soma das duas partes tem de ser igual à
  comissão.
- **Motivos de cancelamento:** código, descrição e os indicadores **D** (permite
  descancelar) e **C** (exige complemento).

**Botões.** *Salvar parâmetros*, *Restaurar padrões* (volta aos valores do
sistema), *Gravar padrão*, *Gravar motivo*.

**Telas relacionadas.** VVND0300.

---

#### VVND0400 — Representantes

**Para que serve.** Cadastrar representantes e vendedores, as empresas em que
atuam (com a comissão padrão de cada uma) e os contatos.

**Passo a passo.**
1. **Novo tipo** (uma vez): descrição, *Disponível sem restrição* e *Ignora
   faturamento direto*.
2. **Novo representante — Dados gerais:** nome, nome fantasia, documento
   (CPF/CNPJ), tipo, data de cadastro, UF e cidade. Em **Vínculos** indique se ele
   também é cliente ou fornecedor e quantos dispositivos usa.
3. Aba **Empresas:** vincule cada estabelecimento em que ele vende, com a
   **comissão padrão %**. É essa comissão que o orçamento e o pedido usam.
4. Aba **Contatos:** telefones (DDD + número) e e-mails.

**Ações.** *Bloquear* (pede motivo — o representante sai dos seletores de novas
operações), *Desbloquear*, *Relatório* (cadastral), *Relatório individual* e
*Follow-up* (ficha de acompanhamento).

**Regras.** Nome e documento são obrigatórios. O vínculo com a empresa respeita
a empresa do usuário: um representante só aparece na empresa em que está
vinculado.

**Telas relacionadas.** VREP0600 (segmentos, planos, endereços), VRE0203
(comissões futuras), VVND0500 (metas).

---

#### VVND0500 — Metas de Vendas

**Para que serve.** Definir metas por representante e período e acompanhar o
previsto × realizado.

**Passo a passo.**
1. **Novo período:** descrição, tipo, início e fim (o início não pode ser depois
   do fim).
2. **Nova meta — Dados gerais:** representante, período, base e premiação %.
3. Aba **Itens da meta:** cada linha tem **um alvo só** — item, classificação ou
   grupo — com quantidade, valor e bônus %.
4. Aba **Grupo e saldo:**
   - **Meta do grupo comercial** com os três patamares: mínima, provável e ideal;
   - **Clientes da meta do grupo:** reparte a meta entre os clientes do grupo;
   - **Saldo de meta:** o que sobra ou falta vai para o próximo período.
5. **Relatório:** previsto × realizado.

**Telas relacionadas.** VVND0400, VPRE0301.

---

#### VSAC0100 — Atendimento ao Consumidor (SAC)

**Para que serve.** Registrar consumidores (pessoa física ou jurídica) e os
chamados de SAC — reclamações, dúvidas, pedidos de visita — com o histórico de
retornos.

**Passo a passo.**
1. **Cadastros de apoio** (uma vez): tipos de chamado (marque *É reclamação*
   quando for o caso) e locais/meios de conhecimento.
2. **Novo consumidor:** nome, pessoa (física aceita só CPF, jurídica só CNPJ),
   UF, cidade e local de conhecimento. Acrescente telefones e e-mails.
3. **Novo chamado:** estabelecimento, consumidor, tipo, direção, assunto e, em
   reclamação, os sintomas. Visita técnica exige a data solicitada.
4. **Registrar retorno / contato:** descreva o contato e, se houver, o próximo
   contato. Mude a posição do chamado (pendente, agendado, resolvido).
5. **Relatório:** chamados do período.

**Telas relacionadas.** VATC0280 (assistência técnica), VSAC0200 (relatórios e
anexos).

---

#### VDPR0100 — Promessa de Entrega — Ocupação e Reservas

**Para que serve.** Ver a ocupação diária dos tanques de planejamento (setores
de capacidade), reservar capacidade para uma proposta e reprogramar entregas em
lote.

**Passo a passo.**
1. **Ocupação diária:** informe o período e, se quiser, os tanques (separados por
   vírgula; vazio = todos). A grade mostra alocado, capacidade, livre e ocupação
   por dia.
2. **Reserva comercial:** data prometida, validade (dias), capacidade diária,
   *Descontar ATP* (considera o estoque disponível) e as linhas (item, quantidade,
   preço). Sem marcar **Gravar**, o sistema só simula. Reservas podem ser
   canceladas, e **Expirar vencidas** encerra as que passaram da validade.
3. **Reprogramação em lote:** faixa de entrega, cliente, representante, pedidos
   ou itens específicos, nova data e motivo. Pedidos e itens com **data firme**
   são ignorados.

**Telas relacionadas.** VPME0102 (parâmetros da promessa), VPME0102ITE, VEXR0100.

---

#### VEXR0100 — Reprogramação de Entrega

**Para que serve.** Mudar a data de entrega de itens de um pedido de venda,
registrando o motivo.

**Passo a passo.**
1. Escolha o pedido. A grade mostra item, quantidade solicitada, saldo, data
   atual e o planejamento.
2. Marque os itens (ou *Selecionar todos os itens permitidos*), informe a **nova
   data** e o **motivo comum** e clique em **Aplicar**.

**Regras.**
- A nova data tem de ser posterior à atual.
- Itens sem saldo ou já com nota autorizada não podem ser reprogramados.
- É tudo ou nada: uma linha inválida desfaz a reprogramação inteira.
- A data nova vai para a demanda do MRP e para as reservas do saldo. Ordens de
  produção e de compra firmes **não** são mexidas — a decisão fica com o
  planejamento.
- Cada reprogramação fica no histórico do pedido (data antiga, nova e motivo).

**Telas relacionadas.** VVND0200, VDPR0100 (reprogramação em lote).

---

#### VRES0100 — Motivos de Restrição

**Para que serve.** Cadastro simples dos motivos usados nas restrições de venda e
de configuração (ex.: "produto em descontinuação").

**Como usar.** Clique em **Novo**, informe a descrição e a situação e grave. Para
alterar, selecione o motivo na lista.

**Telas relacionadas.** VCLI0117 (restrições de venda), VPRO0800.

---

#### VVND0600 — Workflow do Pedido de Venda

*Rotina de operações (console).*

**Para que serve.** Executar as decisões que vêm depois do cadastro do pedido:
análise comercial e financeira, atendimento manual, conferência logística e
motivo de atraso.

**Operações disponíveis.**

| Operação | O que faz |
|---|---|
| Consultar pedidos (filtros) | Situação, análise comercial/financeira, conferência, liberação, cliente, representante, item e período de emissão |
| Abrir pedido / Listar por situação | Consulta |
| Analisar | Registra a análise da área (COMERCIAL ou FINANCEIRO): aprovado ou rejeitado, com motivo |
| Atender | Atendimento manual com motivo e data — encerra o pedido no fluxo |
| Conferir | Conferência logística: conferido ou divergente (divergência exige motivo) |
| Motivo de atraso | Motivo e ação planejada para pedido atrasado |

**Situações do pedido:** R (rascunho), P (confirmado), A (em análise), F
(faturado), CANCELLED (cancelado).

**Telas relacionadas.** VVND0200, VPDV0253.

---

#### VVND0610 — Reajuste de Venda Recorrente

*Rotina de operações (console).*

**Para que serve.** Recalcular o valor de um contrato de venda recorrente pelo
percentual de reajuste e registrar o motivo.

**Operações.** *Consultar recorrência*, *Listar recorrências* e **Recalcular
reajuste** — informe o percentual (o contratual; negativo só para redução
autorizada) e o motivo, com a base contratual.

**Telas relacionadas.** VVRE0200 (console de vendas recorrentes).

---

#### VVND0700 — Devolução de Venda

**Para que serve.** Registrar a devolução do cliente a partir da NF de venda
autorizada, com estoque, financeiro, comissão e imposto acertados juntos.

**Como usar.**
- Escolha a **NF de venda**. A tela mostra, por item, o vendido, o já devolvido
  e o **disponível**: não dá para devolver mais do que foi vendido.
- Informe as quantidades. Em item com número de série, marque as séries que
  voltaram; só aparecem as que estão com o cliente.
- Escolha o **motivo** (defeito, avaria no transporte, erro no pedido,
  desistência, garantia, outros) e o **almoxarifado** que recebe a mercadoria
  (pode ser o da inspeção).

**Documento da devolução.**
- **NF-e de entrada da empresa:** cliente não contribuinte. Após criar, use
  **Gerar NF-e de entrada**. A nota nasce em rascunho, com os itens e impostos
  proporcionais, o CFOP de devolução (5101 → 1201, 5102 → 1202, 6102 → 2202…)
  e a NF de venda referenciada. Transmita na VFIS0200; autorizada, a devolução
  é efetivada sozinha.
- **NF de devolução do cliente:** cliente contribuinte, que emite a nota dele.
  Informe a chave de 44 dígitos e use **Efetivar devolução**.

**O que a efetivação faz.**
- **Estoque:** a mercadoria volta pelo custo com que saiu na venda; as séries
  voltam para *Em estoque*.
- **Financeiro:** o valor abate os títulos em aberto da NF de venda. O que
  sobrar (títulos já recebidos) vira **crédito do cliente**, um adiantamento a
  receber, sem movimento de caixa, usado para abater títulos futuros.
- **Comissão:** a de faturamento é estornada na proporção devolvida.
- **Imposto:** o ICMS, o IPI, o PIS e a COFINS da devolução entram como
  crédito na apuração do mês.

Efetivar de novo não duplica. Uma devolução efetivada não se cancela, e a NF-e
de entrada dela também não. Em rascunho, ou com a NF-e cancelada na SEFAZ, a
devolução pode ser cancelada.

**Telas relacionadas.** VFIS0200, VFIN0600 (adiantamentos), VATC0100 (séries).

---

#### VVND0710 — Contrato de Venda

**Para que serve.** Controlar o acordo de fornecimento com o cliente:
quantidade e preço fixados por item, teto em valor (opcional) e vigência. Os
pedidos de venda **de chamada** nascem do contrato e consomem o saldo.

**Como usar.**
1. **Novo contrato:**
   - informe o cliente, a descrição, a vigência e, se houver, o **teto em
     valor**;
   - inclua os itens com a **quantidade contratada** e o **preço fixado**;
   - defina os alertas: saldo abaixo de um percentual (padrão 20%) e
     vencimento com antecedência em dias (padrão 30).
2. **Ativar.** O contrato nasce em rascunho e só recebe chamada depois de
   ativo.
3. **Programação de entregas** (opcional): parcelas por item e data.
4. **Gerar pedido de chamada:**
   - informe a quantidade de cada item, ou escolha uma parcela da
     programação;
   - informe a data de entrega, que precisa estar na vigência.

   O pedido nasce em **rascunho**, pelo preço do contrato. O sistema recusa o
   que passa do saldo do item ou do teto em valor.

**Saldo.**
- **Consumido:** soma dos itens de pedido de chamada não cancelados.
- **Pedido cancelado devolve o saldo.**

**Encerrar e cancelar.**
- **Encerrar:** termina o contrato, com motivo.
- **Cancelar:** só para contrato sem nenhuma chamada.

Contrato encerrado ou cancelado não recebe chamada.

**Alertas.** Na Central de Alertas (VNOT0100), módulo Comercial:
- *Contrato de venda perto do vencimento*;
- *Contrato de venda com saldo baixo*.

Cada um fecha sozinho quando o contrato é encerrado ou o saldo volta.

**Atenção.** O pedido de chamada é um pedido de venda comum depois de gerado:
se a linha for alterada no pedido (VVND0100), vale o que for gravado lá.

**Telas relacionadas.** VVND0100, VNOT0100.

---

#### VCLI0600 — Manutenção Avançada de Preços de Venda

*Rotina de operações (console).*

**Para que serve.** Ajustes pontuais nas tabelas de venda que a VCST0202 não
mostra direto.

**Operações.**

| Operação | O que faz |
|---|---|
| Preço do item | Preço atual de um item em uma tabela |
| Histórico de preços | Todas as alterações de preço da tabela (filtro por item) |
| Alterar preço | Altera uma linha de preço |
| Excluir preço | Remove uma linha de preço |
| Gerar preços | Geração em lote pela política comercial, com motivo |

**Telas relacionadas.** VCST0202.

---

#### VREP0600 — Complementos do Representante

*Rotina de operações (console).*

**Para que serve.** Manter os dados complementares do representante que não
estão na VVND0400.

**Operações.** Consultar o representante; listar planos de venda, classificações
de interesse e segmentos de mercado; **vincular segmento**, **plano de vendas** e
**interesse** (classificação de item); cadastrar **endereço de correspondência**;
e configurar a **integração contábil da comissão** (contas de débito e crédito e
centro de custo).

**Telas relacionadas.** VVND0400.

---

## PDV / Pedidos

*Acompanhamento da carteira, políticas de desconto e frete, vendas recorrentes e comissões.*

#### VPDV0253 — Console de Acompanhamento de Pedidos

*Rotina de operações (console).*

**Para que serve.** Acompanhar a carteira: posição do pedido, itens e saldos e as
reprogramações já feitas. Não altera nada.

**Operações.** *Consultar* (todos os pedidos), *Pedidos faturados*, *Abrir
posição* (capa do pedido), *Itens e saldos* e *Reprogramações* (histórico de
datas do pedido).

**Telas relacionadas.** VVND0200, VEXR0100, VVND0600.

---

#### VPDV0108 — Cadastro de Política Comercial de Descontos

**Para que serve.** Definir as regras de desconto que o pedido e o orçamento
podem aplicar, por faixa de valor ou quantidade, e simular o resultado.

**Passo a passo.**
1. **Nova política de desconto:** descrição, cálculo, valor %, máximo %, valor
   mínimo bruto, quantidade mínima, tipo de escolha, *Acumulável*, *Requer
   aprovação* e validade.
2. Selecione a política e acrescente as **faixas** (número da faixa, valor mínimo
   e máximo).
3. **Itens específicos:** restrinja a política a itens (e máscara). *Bloquear
   desconto* impede desconto naquele item.
4. **Simular políticas sobre um pedido:** informe valor bruto, quantidade e
   cliente e clique em **Avaliar** — o sistema mostra o desconto em reais que as
   políticas dão.

**Telas relacionadas.** VPDV0111 (frete), VCST0202, VAPR0100 (quando a política
exige aprovação).

---

#### VPDV0111 — Cadastro de Política Comercial de Fretes

**Para que serve.** Definir o frete cobrado por faixa de valor ou quantidade do
pedido e simular o frete de uma venda.

**Passo a passo.**
1. **Nova política de frete:** descrição, cálculo (valor ou %), faixa de valor
   bruto (mínimo **e máximo**), faixa de quantidade, prioridade, *Acumulável* e
   validade.
2. Acrescente as faixas, com valor fixo quando for o caso.
3. **Simular frete sobre um pedido:** valor bruto, quantidade, transportadora e
   cliente → **Avaliar**.

**Regra.** Preencha o teto da faixa: sem o valor máximo, a política vale para
qualquer valor de pedido.

**Telas relacionadas.** VPDV0108, VCLI0202.

---

#### VVRE0200 — Console de Vendas Recorrentes

**Para que serve.** Controlar contratos de venda recorrente (assinatura, locação,
manutenção mensal): vigência, valor, reajuste e a geração mensal dos pedidos.

**Passo a passo.**
1. **Nova recorrência:** estabelecimento, cliente, item, representante principal,
   movimento (venda ou upgrade, no cadastro direto), quantidade e valor unitário.
2. Escolha a vigência:
   - **Indeterminada:** frequência, tabela de preço, moeda, índice de reajuste,
     reajuste a cada N meses, piso % e teto % e a data do próximo reajuste
     (obrigatória);
   - **Determinada:** meses, parcelas, carência e valor da parcela (obrigatórios).
3. **Listar** mostra os contratos com valor mensal, situação e as ações
   permitidas. **Receita mensal** projeta o faturamento mês a mês entre duas datas.
4. **Cancelar** pede motivo e confirmação.

**Abas de apoio.**
- **Parâmetros:** até que dia do mês o faturamento cai na competência corrente e
  o dia de programação da entrega.
- **Datas de reajuste:** datas de reajuste por cliente e estabelecimento.
- **Aplicar reajuste:** primeiro **simule** (mostra, contrato a contrato, o
  faturamento de hoje, depois do reajuste e a diferença) e só então confirme.

**Regra.** Na rodada mensal informe a competência (AAAA-MM) do pedido gerado: a
segunda geração do mesmo contrato no mesmo mês é recusada como duplicidade.

**Telas relacionadas.** VVND0610 (reajuste pontual), VVND0200.

---

#### VRE0203 — Consulta de Comissões Futuras

**Para que serve.** Ver quanto de comissão vai ser pago e quando, e o razão das
comissões já lançadas.

**Visões.**
- **Projeção:** por mês, representante e cliente — base, valor base, comissão %
  e comissão.
- **Razão de comissões:** os lançamentos do período (competência, pedido, evento
  e situação).
- **Configuração:** o evento de competência e a divisão da comissão entre o
  **faturamento** e o **recebimento** — os dois percentuais têm de somar 100%.

**Telas relacionadas.** VVND0400, VVND0310 (padrões de comissão).

---

## Assistência Técnica

*Chamados de assistência técnica e os relatórios do atendimento.*

#### VATC0100 — Base Instalada

**Para que serve.** Acompanhar cada equipamento pelo **número de série**: onde está
(em estoque, no cliente, em assistência, baixado), em que nota foi vendido, quando
e onde foi instalado e tudo o que aconteceu com ele. É o ponto de partida da
garantia e da assistência técnica.

**De onde vêm as séries.**
- **Produção:** a entrega da OF de item que controla série (VATC0110) cria as
  séries em estoque — informadas na entrega ou geradas pela máscara.
- **Cadastro:** o bloco *Cadastrar séries* registra equipamentos vendidos antes do
  sistema (no cliente, com data de venda e instalação) ou estoque comprado — uma
  série por linha, várias de uma vez.

**Como usar.**
1. Filtre por cliente, item, situação ou texto (série, item, cliente) e **Abrir**.
2. Série no cliente: **Registrar instalação** (data e local) ou **Transferir** para
   outro cliente (com motivo).
3. **Garantia:** ao abrir a série, a tela mostra se ela está em garantia, até
   quando, de onde a garantia foi contada e o que cobre. **Estender garantia**
   (data e motivo — contrato, cortesia) prolonga a cobertura daquela série.
4. **Baixar** (com motivo) tira a série de uso.
5. O **histórico** mostra cada evento — produção, venda, instalação,
   transferência, estorno, baixa — e não pode ser alterado.

**Regras.**
- A série é única por item na empresa.
- A série sai do estoque só pela **NF de saída**: a prévia exige uma série por
  unidade, a autorização leva a série ao cliente da nota e o cancelamento a devolve
  ao estoque.

**Telas relacionadas.** VATC0110, VPRO0900, VFIS0200, VATC0280.

---

#### VATC0110 — Pós-venda do Item

**Para que serve.** Dizer, por item, como o pós-venda o acompanha. Equipamento é
rastreado por **número de série**; peça sob encomenda segue rastreada pela nota e
pelo lote.

**Como usar.** Escolha o item, marque **Controla número de série** e, se quiser que
o sistema gere a série, escolha a **máscara** (VLOT0100 — ex.: BAL-0001). Sem
máscara, a série é digitada na entrega da OF. A lista mostra os itens com perfil.

**Garantia.** Prazo em **meses** e de quando conta — **da venda** (data da NF) ou
**da instalação** (se registrada na Base Instalada; sem ela, conta da venda) — e a
cobertura: **peças**, **mão de obra**, **deslocamento do técnico**. Sem meses no
perfil, vale o *tempo de garantia (dias)* do cadastro do item (VENT0200). A
garantia vale até o último dia do prazo, inclusive.

**Onde a garantia é usada.** No item do chamado (VATC0280), na Base Instalada
(VATC0100) e na consulta de garantia: com série, pela data de venda/instalação da
série; sem série (peça sob encomenda), pela **NF de venda ao cliente**.

**O que muda ao ligar o controle de série.**
- A entrega da OF (VPRO0900) passa a pedir/gerar uma série por unidade (só
  quantidade inteira).
- A NF de saída (VFIS0200) exige as séries das linhas desse item.

**Telas relacionadas.** VATC0100, VLOT0100.

---

#### VATC0300 — Ordem de Serviço

**Para que serve.** Executar o atendimento de um chamado (VATC0280), seja **no
cliente**, com o técnico de campo, ou **na fábrica**, quando o equipamento vem
para conserto (RMA). A OS registra a agenda, o técnico, as horas, as peças, as
despesas, o defeito constatado e a solução. No fim, gera o pedido de venda do
que o cliente paga.

**Abrir.** Escolha o **chamado** e o **item do chamado**. É o item que traz a
garantia já decidida (pela série, pela NF ou pela data informada) e o que ela
cobre. Depois escolha **onde** o atendimento acontece e, se quiser, o técnico e
o agendamento. A OS sem item do chamado é atendimento cobrado.

**Situações.** Aberta → Agendada → Em execução → Concluída → Faturada, ou
Cancelada. Para iniciar, a OS precisa de técnico. Na OS **na fábrica**, iniciar
leva a série para *Em assistência* na Base Instalada (VATC0100), e concluir a
devolve para *No cliente*. Uma OS concluída pode ser **reaberta** com motivo,
enquanto não estiver faturada.

**Lançamentos** (só com a OS em execução):
- **Horas** de trabalho ou de deslocamento. Custo e preço vêm dos Parâmetros.
- **Peças.** Em garantia que cobre peças, a peça **sai do estoque na hora**,
  pelo custo médio. Se for removida, volta ao estoque. Cobrada do cliente, a
  peça exige preço e **não sai do estoque pela OS**: entra no pedido do
  faturamento e sai pela NF dele, para não baixar duas vezes.
- **Despesas:** quilometragem (custo e preço do km vêm dos Parâmetros),
  hospedagem, alimentação, pedágio e outros. Sem preço informado, a despesa
  cobrada é repassada pelo valor gasto.

O sistema marca cada lançamento como **cobrado** ou **garantia** conforme a
cobertura. Exemplo: garantia que não cobre deslocamento → as horas de
deslocamento e o km são cobrados, e o trabalho e as peças, não.

**Concluir** exige ao menos uma hora apontada, o **defeito constatado** e a
**solução**. Uma OS com peça já baixada do estoque só é cancelada depois de
remover a peça.

**Totais.** Custo total (horas, peças e despesas), **custo da garantia** (o que
a empresa absorve) e **a cobrar** do cliente.

**Faturar** (OS concluída com valor a cobrar). Gera um pedido de venda em
rascunho para o cliente, com:
- uma linha por peça cobrada;
- uma linha do **item de serviço** com o total das horas e despesas cobradas.

A OS fica *Faturada* com o pedido. Depois, o pedido segue o fluxo normal de
liberação e NF.

**Parâmetros.**
- Custo e preço da hora e do km.
- Almoxarifado padrão das peças.
- **Item de serviço** do faturamento, obrigatório para faturar mão de obra e
  despesas.

**SLA.** Abrir a OS conta como a **primeira resposta** do chamado no SLA
(VATC0310).

**Qualidade e fornecedor** (OS concluída ou faturada):
- **Abrir CAPA da reclamação** abre a CAPA de *reclamação do cliente*
  (VINS0500), com o cliente, o item e a referência do chamado. Cada chamado
  tem uma CAPA só.
- **Cobrar do fornecedor** abre a reclamação de custo de garantia (VATC0320).

**Telas relacionadas.** VATC0280, VATC0100, VATC0110, VATC0310, VATC0320, VATC0400, VINS0500, VVND0100.

---

#### VATC0310 — SLA da Assistência

**Para que serve.** Definir e acompanhar o prazo de atendimento dos chamados
(acordo de nível de serviço). Cada chamado tem dois prazos:
- **primeira resposta**: o chamado sai de *Pendente* ou ganha uma ordem de
  serviço (VATC0300);
- **solução**: o chamado é atendido ou encerrado.

**Regras.** Uma regra por **prioridade** (baixa, normal, alta, crítica), com as
horas de resposta e de solução e o **percentual de alerta**: a partir dele, o
prazo fica *em risco* (padrão 80%). Uma regra pode valer para **um cliente**
(contrato com prazo próprio), e ela vence a regra geral da mesma prioridade.
Prioridade sem regra deixa o chamado sem SLA.

**Como o prazo é contado.** A partir da abertura do chamado (VATC0280), em
**horas corridas** ou em **horas úteis**, se a regra estiver marcada assim. Em
horas úteis conta só o expediente da empresa (aba **Expediente**) e não contam
os feriados do calendário industrial (dias marcados como não úteis). Sem
expediente cadastrado, vale segunda a sexta, 08:00–12:00 e 13:00–18:00. O
prazo é gravado no chamado no momento da abertura: mudar a regra ou o
expediente depois vale só para os chamados novos e para as retomadas.

**Relógio parado.** Enquanto o chamado está em *aguardando retorno* ou
*aguardando pedido* (a pendência é do cliente), o prazo não corre: no painel
ele aparece *Pausado (aguardando cliente)* e a Central não alerta. Quando o
chamado sai da espera, os prazos em aberto andam o tempo que ficou parado (em
horas úteis, se a regra for útil). A coluna *Relógio* mostra o tipo de
contagem e as horas paradas.

**Painel.**
- Mostra os chamados abertos, com a situação de cada prazo: *no prazo*, *em
  risco* ou *vencido*. Os encerrados aparecem como *cumprido* ou *cumprido com
  atraso*.
- Filtros: em risco, vencidos, pausados (aguardando cliente) ou todos (últimos
  90 dias), e cliente.
- O resumo conta os abertos, em risco, vencidos e pausados.

**Alertas.** Na Central de Alertas (VNOT0100), assine os eventos *SLA do
chamado em risco* e *SLA do chamado vencido*, módulo Assistência. O alerta
fecha sozinho quando o chamado responde, é solucionado ou é cancelado. O de
risco também fecha quando o prazo vence, e aí fica o de vencido. Qualquer um
fecha quando a retomada da pausa empurra o prazo.

**Telas relacionadas.** VATC0280, VATC0300, VNOT0100.

---

#### VATC0320 — Recuperação junto ao Fornecedor

**Para que serve.** Cobrar do fornecedor o custo da garantia quando a falha foi
de um componente comprado dele (célula de carga, motor, rolamento…). É a
recuperação de garantia do SAP e da Oracle.

**Como nasce.** Na OS concluída (VATC0300), em *Qualidade e fornecedor*,
escolha o fornecedor e o valor (sugere o custo da garantia da OS) e clique
**Cobrar do fornecedor**. A reclamação herda da OS o chamado, o item e a CAPA
ligada.

**Andamento.**
- **Reclamada → Aceita**, quando o fornecedor reconhece.
- **Recuperada**: registre o valor recebido, a forma (nota de crédito, débito
  em título, reposição da peça ou desconto em compra), o documento e a data. O
  valor pode ser parcial, mas nunca maior que o reclamado.
- **Recusada**, com a resposta do fornecedor.

Recusada e recuperada são situações finais.

**Onde aparece.** O recuperado no período abate o **custo líquido da
garantia** nos Indicadores do Pós-venda (VATC0400).

**Telas relacionadas.** VATC0300, VATC0400, VINS0500.

---

#### VATC0400 — Indicadores do Pós-venda

**Para que serve.** Mostrar quanto a garantia custa, onde e por quê, para
decidir onde agir na engenharia, na qualidade e nas compras.

**Período.** De/até, com padrão dos últimos 90 dias.

**Resumo.**
- **Custo da garantia:** horas, peças e despesas **não cobradas** das OS
  concluídas no período, pelo custo.
- **Recuperado de fornecedores** e **custo líquido** (garantia − recuperado).
- **Cobrado dos clientes.**
- **Chamados** do período, quantos têm CAPA.
- **Tempo médio de atendimento:** do início à conclusão da OS.
- **SLA cumprido** (resposta e solução): conta só os prazos já decididos.

**Custo da garantia por item, por motivo do defeito** (do item do chamado) e
**por lote** (da série).

**Confiabilidade da base instalada** (itens com série):
- **taxa de falha:** séries com chamado no período ÷ séries no cliente;
- **MTBF:** dias de operação de todas as séries, da instalação ou da venda, ÷
  falhas registradas.

**Telas relacionadas.** VATC0300, VATC0310, VATC0320, VATC0100.

---

#### VATC0280 — Cadastro de Chamados

**Para que serve.** Abrir e acompanhar chamados de assistência técnica: o que o
cliente devolveu ou reclamou, o diagnóstico, a solução e o documento que resolve
(pedido de venda ou ordem de produção).

**Antes de começar.** Cadastre, no rodapé da tela, os **grupos de defeito**, os
**motivos de defeito** (cada motivo pertence a um grupo) e os **responsáveis pela
garantia** (um funcionário ou um cliente).

**Passo a passo.**
1. **Novo chamado:** empresa, cliente, responsável pela garantia, assunto,
   prioridade, data prometida, consumidor (quando o produto é de um consumidor
   final) e descrição.
2. **Incluir item:** item, quantidade, número de série, motivo e complemento do
   defeito, NF de compra e a data dela, garantia (dias) e a **ação solicitada**
   (análise, reparo, troca ou crédito). O chamado precisa de pelo menos um item.
   - **A garantia é decidida pelo sistema** e aparece antes de incluir: pela
     **série** (Base Instalada), ou pela **NF de venda** ao cliente do chamado
     (informe o número no campo NF), ou pela data informada. Mostra até quando
     vale, de onde veio, o que cobre e os avisos (série de outro cliente, série
     baixada, NF não encontrada). Os dias digitados só valem quando nada disso
     existe.
3. **Andamento:** altere a situação e registre diagnóstico e solução.
4. **Vincular nota de devolução ou remessa:** número, série, emissão, operação,
   valor, chave de acesso e observações.
5. **Gerar pedido de venda ou ordem de produção:** informe divisão de vendas,
   tabela de preço, condição de pagamento e almoxarifado. O documento fica
   vinculado ao chamado — cada chamado gera só um.

**Situações do chamado.** Pendente, Em análise, Aguardando devolução,
Aguardando pedido/ordem, Atendido, Encerrado e Cancelado.

**Telas relacionadas.** VATC0480 (consulta), VATC0380 (relatório), VGAR0211
(devolução/RMA), VSAC0100 (SAC).

---

#### VATC0480 — Consulta de Chamados

**Para que serve.** Consultar os chamados de assistência e seus itens, sem
alterar nada.

**Como usar.** Filtre pela situação (Pendente, Em análise, Aguardando devolução,
Aguardando pedido/ordem, Atendido, Encerrado, Cancelado). Selecione o chamado
para ver capa, diagnóstico, solução e os itens com série, motivo, complemento,
garantia e situação.

**Telas relacionadas.** VATC0280.

---

#### VATC0380 — Relatório de Chamados

**Para que serve.** Gerar a listagem completa dos chamados de assistência para
análise ou exportação.

**Como usar.** Clique em **Gerar relatório** e, se quiser, em **Exportar** (Excel
ou PDF).

**Telas relacionadas.** VATC0280, VATC0480.

---

#### VSAC0200 — Relatórios e Anexos do Atendimento

**Para que serve.** Guardar documentos dos chamados de SAC e gerar as listagens do
atendimento.

**Como usar.**
- **Documentos do chamado:** escolha o chamado, o arquivo (até 10 MB) e as
  observações e anexe. A grade permite baixar e excluir.
- **Relatórios:** *Etiquetas de consumidores*, *Relatório de contatos* e
  *Etiquetas de chamados*. O resultado aparece na grade e pode ser exportado.

**Telas relacionadas.** VSAC0100.

---

## Garantia

*Devolução de garantia (RMA) ligada ao chamado.*

#### VGAR0211 — Gerar Pedido de Devolução

*Rotina de operações (console).*

**Para que serve.** Tratar a devolução de garantia (RMA) ligada a um chamado de
assistência técnica e registrar o retorno dado ao consumidor.

**Fluxo da devolução (RMA).**
1. **Solicitar RMA** no chamado de assistência: motivo, elegibilidade e
   justificativa. A operação é idempotente — repetir o envio não cria uma segunda
   RMA.
2. **Avançar RMA:** muda a situação (ex.: autorizada, com o número de
   autorização), sempre com motivo.
3. **Enviar evidência:** fotos ou laudos (PDF, PNG ou JPEG). Depois, *Listar* e
   *Baixar evidência*.

**Do lado do SAC.** *Abrir chamado* do consumidor, listar, baixar e excluir
anexos e **Registrar retorno** (data e tipo do contato, descrição e próximo
contato).

**Telas relacionadas.** VATC0280, VSAC0100, VFIS0210 (NF de devolução recebida).

---

## Cliente

*Cadastro de clientes e os cadastros de apoio (região, portador, condição de pagamento, tabela de venda, tipos de nota).*

#### VCLI0202 — Cadastro de Percentuais de Frete Por Cliente

*Rotina de operações (console).*

**Para que serve.** Manter as políticas de formação de preço — fonte de custo,
prioridade, sequência, escopo e os componentes como o percentual de frete — que
a VCST0202 usa para calcular e gerar preços.

**Operações.** *Listar políticas*, *Criar política*, *Abrir política* e *Alterar
política*.

**Telas relacionadas.** VCST0202 (onde a política é aplicada), VPDV0111 (frete
do pedido).

---

#### VCLI0117 — Cadastro de Permissões e Restrições de Venda

*Rotina de operações (console).*

**Para que serve.** Impedir ou permitir a venda de um item conforme o cliente e o
contexto da venda (canal, região, configuração), com motivo cadastrado.

**Operações.**

| Operação | O que faz |
|---|---|
| Listar / Abrir restrição | Consulta |
| Criar restrição | Item, situação, motivo (VRES0100) e as condições que disparam a regra |
| Restrições do cliente / do item | O que vale para um cliente ou para um item |
| Alterar restrição | Muda situação, item ou motivo |
| **Avaliar venda** | Testa cliente + item + contexto e diz se a venda é permitida e por quê |
| Desativar | Tira a restrição de uso sem apagar o histórico |

**Dica.** Antes de ativar uma regra nova, use **Avaliar venda** com um cliente e
um item reais para conferir o efeito.

**Telas relacionadas.** VRES0100, VVND0200, VVND0300.

---

#### VCLI0500 — Cadastro de Cliente

**Para que serve.** Cadastrar os clientes da empresa, com endereços e contatos.
Cada empresa tem o seu cadastro: um cliente da empresa A não aparece nem é
alterado na empresa B.

**Antes de começar.** Os cadastros de apoio, nesta ordem: região, segmento, tipo
de contato, tipo de cliente, portador e grupo (VCLI0510); condição de pagamento e
tabela de venda (VCLI0520); tipo de NF de saída e tipo de imposto (VCLI0530).

**Passo a passo.**
1. Clique em **+ Novo**. Em **Dados** informe razão social/nome, fantasia, tipo
   de documento e CNPJ/CPF.
   - Com CNPJ, use o botão de **buscar na Receita**: o sistema preenche nome e
     endereço. Confira antes de salvar.
2. Complete inscrição estadual, inscrição municipal e SUFRAMA, a matriz (quando o
   cliente é filial) ou *É matriz*, a **finalidade da compra** (revenda,
   industrialização ou uso e consumo), a visibilidade da condição de pagamento,
   o **limite de crédito** e o site.
3. Preencha o **endereço principal** e salve.
4. Aba **Endereços:** cadastre outros endereços (entrega, cobrança) e marque o
   padrão de cada tipo.
5. Aba **Contatos:** nome, tipo de contato, cargo, e-mail, telefone e celular;
   marque o principal.

**Por que cada campo importa.**
- **Inscrição estadual:** com IE o cliente é contribuinte do ICMS; sem IE (ou
  ISENTO) é não contribuinte — isso muda o ICMS, o DIFAL e o IPI na base.
- **Finalidade da compra:** escolhe a regra de ICMS/IPI da nota (VFIS0320) quando
  o pedido não informa outra.
- **Limite de crédito:** conferido na confirmação do pedido de venda.

**Bloquear / Desbloquear.** O cliente bloqueado não passa na confirmação de
pedido. O motivo fica no histórico.

**Telas relacionadas.** VCLI0510, VCLI0520, VCLI0530, VVND0200, VFIS0320.

---

#### VCLI0510 — Apoio de Cliente — Básico

**Para que serve.** Os cadastros de apoio que classificam o cliente e a cobrança.

**Abas.**

| Aba | O que cadastra |
|---|---|
| Região | Descrição, UF e cidade |
| Segmento | Descrição, segmento pai e se o segmento retém PIS/COFINS (com o indicador da retenção) |
| Tipo Contato | Descrição |
| Tipo Cliente | Descrição, retenção e indicador |
| Portador | Banco/carteira de cobrança: categoria, dias de entrega, cobrança, *usa limite de crédito*, *considera disponível*, *adia para dia útil*, dias de recebimento e de compensação e limite |
| Grupo Portadores | Agrupa portadores (informe grupo e portador para vincular) |

**Regra do portador.** Com *usa limite de crédito*, o pedido com esse portador
passa pela análise de crédito; com *considera disponível*, o limite é descontado
dos pedidos em aberto.

**Telas relacionadas.** VCLI0500, VCLI0520.

---

#### VCLI0520 — Apoio de Cliente — Comercial

**Para que serve.** Condições de pagamento (com as parcelas) e tabelas de venda.

**Aba Condição de Pagamento.**
1. Descrição, portador, tipo de análise de crédito, início das parcelas,
   despesas, prazo médio, *Especial*, *Gera receita* e *À vista*.
2. **Parcelas:** percentual do total, de quando conta o prazo, dias para o
   vencimento e documento. A tela mostra a soma dos percentuais — a condição só
   fecha quando chega a 100%. Entrada é pagamento no ato (prazo em dias não se
   aplica).
3. Use o **valor de referência** e a **data de entrega** para ver os vencimentos
   que a condição gera.

**Tipo de análise de crédito.** *Sempre analisa*, *Bloqueia sempre* ou *Libera
sem análise*. Condição sem *Gera receita* não cria conta a receber (amostra,
operação interna).

**Aba Tabela de Vendas.** Descrição, vigência, tolerâncias mínima e máxima % (o
preço abaixo do piso bloqueia o pedido), formação de preço, casas decimais,
incoterm, tipo, data base, *permite valor abaixo de R$ 0,01*, *ICMS por dentro* e
observação. Os preços dos itens são mantidos na VCST0202.

**Telas relacionadas.** VFIN0110, VCST0202, VVND0200.

---

#### VCLI0530 — Apoio de Cliente — Fiscal

**Para que serve.** Os tipos de nota fiscal de saída e os tipos de imposto.

**Aba Tipo de NF de Saída.** Define o comportamento da nota:
- natureza, movimento de estoque, situação do ICMS e percentuais padrão
  (ICMS, redução, IPI, PIS, COFINS, ISSQN, IR, CSLL, INSS);
- o que a nota faz: *gera receita*, *atualiza estoque*, *gera título*, *conta
  metas*, *exige pedido*, *baixa pedido*, *título de devolução*, *exige SUFRAMA*;
- o que o motor fiscal calcula: **ICMS-ST**, **diferimento**, **PIS/COFINS** e
  **DIFAL** — desmarcado, o cálculo não acontece nas notas desse tipo;
- modelo da NF e os CSTs/CSOSN padrão, presunções de IR/CSLL, a descrição
  impressa na nota e os livros e arquivos em que entra (registro de saída,
  ICMS/IPI, SPED Fiscal).

**Aba Tipo de Imposto.** Agrupamento usado nas regras de ICMS/IPI (VFIS0320).

**Telas relacionadas.** VFIS0110, VFIS0320, VFIS0200.

---

## Custos / Precificação

*Custo-padrão do produto e margem de contribuição.*

#### VCUS0200 — Margem de Contribuição

**Para que serve.** Mostrar em quais produtos e clientes a empresa ganha dinheiro:
quanto sobra de cada venda depois de impostos, custo, despesas **e do custo de
financiar o prazo** (vender a prazo e pagar à vista também custa).

**Aba Parâmetros do mês** (preencha antes de apurar).
- Ano e mês; provisão de IR/CSLL %; incidência administrativa %; frete médio %;
  taxa financeira (% ao mês).
- Prazos médios de venda e de compra, ciclo de produção e os prazos de pagamento
  de material, mão de obra e impostos. A tela mostra o **ciclo de caixa** e a taxa
  financeira real que resultam deles.
- **Gravar parâmetros do mês.**

**Aba Apuração.** Escolha o período e clique em **Consultar**. O sistema apura as
notas de saída linha a linha: faturamento, impostos, custo, despesas e margem.
Mostra o resultado do período, as linhas com prejuízo e permite ordenar por item
ou cliente. Verde é margem boa, amarelo é margem baixa (até 5%), vermelho é
prejuízo.

**Aba Simulação.** Informe quantidade, preço, custo unitário, custo de
transformação, impostos (IPI, ICMS, PIS/COFINS), comissão, outros valores e a
margem desejada e clique em **Simular**. O resultado mostra a cascata da margem,
a margem por peça, o custo de financiar o prazo e o **preço mínimo** para atingir
a margem desejada.

**Telas relacionadas.** VCUS0100 (custo do produto), VFIS0200 (notas apuradas).

---

#### VCUS0100 — Custos — Centro, Compra, Alocação e Overhead

**Para que serve.** Calcular o **custo-padrão** do produto e manter o que entra
nele: taxa por hora de cada centro de trabalho, custo de compra dos itens e os
custos indiretos (energia, depreciação, supervisão, aluguel).

**Blocos da tela.**
1. **Apurar o custo-padrão:** escolha o item e o lote de referência. O resultado
   mostra a composição do custo unitário (material, setup, máquina, homem,
   terceiro, indiretos, componentes), **de onde vem cada centavo dos indiretos**,
   a composição pela estrutura e os avisos da apuração (ex.: componente sem
   custo).
2. **Esquema de cálculo (indiretos):** cada regra tem código, descrição (é o que
   explica o indireto no custo do produto), base (sobre o que incide), método
   (percentual ou valor por hora), taxa e vigência; pode valer só para um centro
   de trabalho ou só para um item e ter a conta contábil e o centro de custo de
   origem. A próxima apuração já aplica a regra.
3. **Taxa por hora do centro de trabalho:** R$ por hora-máquina e R$ por
   hora-homem.
4. **Custo de compra por item:** o custo unitário de compra. Depois de alterar,
   reapure os produtos que consomem o item.
5. **Apurações anteriores:** histórico do item e **o que mudou** desde a
   apuração anterior, componente a componente.
6. **Rateio contábil:** bases de alocação (critério de rateio) e a distribuição
   dos custos indiretos de um centro de custo para outros, por período.

**Regras e cuidados.**
- Percentual é digitado em % (12 = 12%). Taxa acima de 100% da base pede
  conferência.
- Valor por hora só incide em base medida em horas (máquina, mão de obra,
  preparação ou conversão).
- A apuração desce a estrutura (VENT0210), aplica a perda, credita co-produto,
  usa o substituto quando é o caso e cobra cada operação do roteiro na taxa do
  **seu** centro de trabalho.

**Telas relacionadas.** VPRO0300 (custo padrão), VENT0210, VENT0202, VCUS0200.

---

# Industrial & Produção

## Engenharia

*Itens, estruturas, roteiros, máquinas, desenhos, PDM e o configurador de produto.*

#### VDES0100 — Desenhos Técnicos

**Para que serve.** Cadastrar o desenho técnico de um item e controlar as revisões
(qual está valendo, desde quando, por quê e quem aprovou).

**Passo a passo.**
1. **Novo desenho:** código, dígito, formato, item, unidade de medida e
   descrição → **Criar desenho**.
2. Selecione o desenho e use **+ revisão**: revisão, data de início, motivo e
   aprovador. A grade marca qual é a revisão **atual**.

**Telas relacionadas.** VENG0400 (distribuição controlada, características e
parâmetros), VENT0200.

---

#### VBOM0100 — Cabeçalhos de Estrutura (BOM)

**Para que serve.** Controlar as versões da estrutura de um item: tipo, vigência e
situação de cada versão. As linhas (componentes) ficam na VENT0210.

**Passo a passo.**
1. Escolha o item e, se ele for configurado, a máscara cadastrada.
2. **Novo cabeçalho:** tipo e vigência a partir de. A versão é numerada sozinha.
3. Na lista, mude a situação da versão (ex.: **aprovada** ou **obsoleta**).

**Regra.** A máscara precisa existir para o item.

**Telas relacionadas.** VENT0210, VENG0300.

---

#### VPME0102 — Parâmetros de Promessa de Entrega

**Para que serve.** Ligar e ajustar a promessa de entrega da empresa.

**Parâmetros.** Utilizar promessa de entrega; bloquear pedidos na promessa;
bloquear exportação na promessa; quebrar ocupação de tanque; recalcular após
liberação; reprogramar pedidos carregados; permitir alteração da data de
entrega. Marque e salve.

**Telas relacionadas.** VDPR0100, VPME0102ITE.

---

#### VPME0102ITE — Calendário de Promessa de Entrega por Item

**Para que serve.** Marcar dias em que um item específico não pode ser prometido
(ex.: linha parada para manutenção), além dos dias não úteis gerais.

**Como usar.** Informe item (e máscara), navegue pelo mês com as setas, clique nos
dias para marcar ou desmarcar como não úteis e salve. A mensagem diz quantos dias
foram marcados e quantos restaurados.

**Telas relacionadas.** VPME0102, VENT0108, VCAL0200.

---

#### VITM0100 — Item & Prontidão para o MRP

**Para que serve.** Conferir, antes de colocar um item em operação, se ele tem tudo
o que o planejamento precisa.

**Como usar.** **Listar** traz os itens (código, descrição técnica, natureza, tipo,
nível na estrutura, tipo de MRP e situação). Selecione um item:
- **Prontidão do item:** ✅ pronto ou ⚠️ não pronto, com as **pendências** (o que
  impede) e os **alertas** (o que convém corrigir);
- **Estrutura / BOM:** os componentes, quantidades e perdas.

**O que é conferido.**
- Item **fabricado:** precisa de estrutura e de roteiro.
- Item **comprado:** precisa de fornecedor preferencial; alerta se faltar
  conversão de unidade quando a unidade de compra difere da de estoque.

**Telas relacionadas.** VENT0200, VENT0210, VENT0202, VVOR0202.

---

#### VMAQ0101 — Tipos de Máquina

**Para que serve.** Cadastrar os tipos de máquina (torno, prensa, solda...) usados
para classificar os recursos na VMAQ0200.

**Como usar.** Código (número positivo), nome, tipo e descrição. A lista mostra a
situação de cada tipo.

**Telas relacionadas.** VMAQ0200.

---

#### VMAQ0200 — Máquinas, Tempos e Cálculo

**Para que serve.** Tudo o que a fábrica precisa cadastrar sobre seus recursos para
o MRP, o CRP e o sequenciamento calcularem certo. Cada aba responde a uma
pergunta, na ordem em que se cadastra.

**Abas.**

| Aba | O que se faz |
|---|---|
| **Centros de trabalho** | Os centros (recursos) e as máquinas que atendem cada um |
| **Máquinas** | Cadastro completo: código, nome, natureza, tipo, marca, calendário de turnos, horas por dia **ou** produção nominal de referência, eficiência padrão %, tempo de preparação, centro de custo, localização, uso, fornecedor, aquisição e responsável pela manutenção |
| **Turnos** | Calendários de turno (dia, início, fim) e as horas por semana |
| **Paradas** | **Máquina parou** (abre a parada agora — a máquina deixa de contar como disponível) e **Voltou a produzir**; ou lance uma parada que já aconteceu (de/até e motivo) — o planejamento deixa de ocupar esse período |
| **Consumíveis** | O que a máquina consome por hora de usinagem e quanto rende por carga e o tempo de troca |
| **Produtividade** | Tempo do item na máquina: forma de produção, eficiência do item, tempo de produção e quantidade nesse tempo, preparação por ordem e prioridade (1 = máquina preferida) |
| **Preparação** | Famílias de preparação e a **matriz de setup**: quanto tempo leva trocar de um item (ou família) para outro no centro |
| **Simulador** | Quanto tempo leva produzir uma quantidade: ciclos, setup, produção, total e eficiência aplicada |
| **Agenda** | A fila da máquina no dia (CRP/APS): reordenar, prioridade manual, situação e apontamento do que saiu |

**Regras e cuidados.**
- A máquina precisa de jornada diária **ou** de produção nominal de referência.
- **Quem manda no tempo:** quando o item tem roteiro, vale o tempo da etapa do
  roteiro; o tempo desta tela é a medida da máquina e vale para item sem roteiro.
  A tela mostra os dois lado a lado e avisa quando divergem muito.
- Na matriz de preparação, informe ao menos o item ou a família de origem ou de
  destino — sem critério a linha valeria para qualquer troca.
- O simulador calcula o tempo da ordem; a sobrecarga depende das demais ordens e
  do calendário — confira no CRP (VPRO0200).

**Telas relacionadas.** VMAQ0101, VENT0202, VPRO0200, VPRO0210, VAPS0200,
VAPS0300.

---

#### VENT0108 — Calendário Financeiro

**Para que serve.** Definir os dias úteis e não úteis da empresa (feriados,
recesso). Vencimentos, prazos e planejamento usam este calendário.

**Como usar.** Escolha ano e mês, clique nos dias para marcar ou desmarcar como
não úteis e salve. A mensagem diz quantos dias foram atualizados.

**Telas relacionadas.** VCAL0100 (calendário industrial), VPME0102ITE.

---

#### VENT0200 — Cadastro de Itens

**Para que serve.** O cadastro mestre de itens: produto acabado, semiacabado,
matéria-prima, embalagem, ferramenta, serviço. Quase tudo no sistema começa aqui.

**Passo a passo.**
1. **Capa:** código, nome, situação, nome técnico detalhado e complemento, grupo e
   modificador (PDM), estado e os **marcadores de natureza** — fabricado,
   comprado, de terceiro, serviço, item base, configurado, genérico, protótipo,
   ferramenta, item de processo. Os marcadores combinam entre si (um item pode
   ser *base* e *configurado* ao mesmo tempo). Sem marcador, o item é genérico.
2. **Estoque:** almoxarifado padrão, unidade de medida, indicadores de estoque,
   intervalo de inventário e estoque mínimo de alerta.
3. **Engenharia:** tipo de item, tipo de estrutura, item-base usado como modelo,
   OEM, pesos e as dimensões da embalagem em milímetros (vão para o romaneio e o
   frete).
4. **Planejamento:** tipo de planejamento, curva ABC, nível na estrutura (1 =
   produto final, 9 = matéria-prima), lotes mínimo, máximo e múltiplo, quantidade
   máxima por ordem, estoque e tempo de segurança, tempo de reposição, consumo
   médio, cobertura, tanque/setor e baixa automática. O **ponto de pedido** é
   calculado na tela antes de gravar: (tempo de reposição × consumo médio ÷
   cobertura) + estoque de segurança.
5. **Comercial:** descrição comercial, tipo de venda, múltiplo e mínimo de venda,
   entrega estimada, tempo de garantia, almoxarifados de transferência e de
   assistência técnica e item de embalagem.
6. **Contábil:** classificações fiscais de venda e de compra (NCM), **origem da
   mercadoria** (0 a 8), IPI de venda e de compra, ICMS, unidades de venda e de
   compra, grupo de inventário, CEST e cálculo de PIS/COFINS.
7. **Suprimentos:** recebimento, tipo de utilização e classificação.

**Usar um item-base como modelo.** Escolha o item-base: o sistema copia as pastas
para o item novo e mantém código, nome e nome técnico que você digitou.

**Alterar um item.** Abra o item na lista; o código não muda, o resto pode ser
corrigido. A lista mostra também os itens inativos — é aqui que se reativa.

**Regras e cuidados.**
- Os obrigatórios aparecem só depois da primeira tentativa de salvar, com a aba
  onde cada um está.
- Ao marcar **Inativo** num item já gravado, a tela mostra **onde ele é usado**
  (as estruturas que consomem o item) — inativar sem olhar isso vira falta de
  componente no MRP.
- O grupo de inventário precisa existir no cadastro de grupos.
- Ao digitar o **nome** de um item novo, a tela avisa se já existe item
  parecido, ignorando acento, caixa e a ordem das palavras. Confira o aviso
  antes de gravar, para não ter o mesmo item com dois códigos.
- Se a empresa exige a liberação do cadastro (VENT0250), o item novo nasce
  **em cadastro** e só entra em documento depois que as áreas liberarem.

**Telas relacionadas.** VENT0210 (estrutura), VENT0202 (roteiro), VITM0100
(prontidão), VSUP0110 (conversão de UM), VFIS0350 (classificação fiscal),
VENT0250 (governança do cadastro).

---

#### VENT0250 — Governança do Cadastro

**Para que serve.** Garantir que o item só seja usado com o cadastro completo e
aprovado por cada área, como no SAP MDG e no ciclo de vida do item da Oracle.

**Status do cadastro.**
- **Em cadastro:** o item ainda não entra em documento.
- **Liberado:** uso normal.
- **Bloqueado:** suspenso, com motivo.
- **Descontinuado:** fora de linha, com motivo e, se houver, o **item
  substituto**.

Em cadastro, bloqueado ou descontinuado, o item **não entra em documento
novo**: pedido de venda, orçamento, pedido e requisição de compra, OF e NF. A
mensagem diz o motivo e, no descontinuado, qual item usar. Documento já aberto
segue normalmente.

**Visões.** Engenharia, Fiscal, Suprimentos, Planejamento, Comercial e Custos.
- A tela mostra as pendências de cada visão, ou seja, os campos obrigatórios
  que faltam para aquele tipo de item. Exemplos: NCM e origem no fiscal;
  fornecedor e unidade de compra no comprado; estrutura, roteiro e custo
  padrão no fabricado.
- **Liberar** só fica disponível com a visão completa, e só para quem tem
  permissão de **aprovar no módulo da área** (perfis de acesso, VADM0200).
- Com a última visão exigida liberada, o item passa de *em cadastro* para
  *liberado*.
- **Estornar** desfaz a liberação, com motivo.

**Status.** Bloqueie, desbloqueie, descontinue (com substituto, que precisa
estar liberado) ou reative, sempre com motivo. A tela mostra **onde o item é
usado**: saldo, pedidos de venda e de compra e OFs abertos, e as estruturas em
que é componente.

**Histórico.** Toda alteração do cadastro, venha da tela ou de outro processo,
fica registrada campo a campo: quem, quando, antes e depois. Também ficam as
liberações e as mudanças de status. O histórico não pode ser alterado nem
apagado.

**Em cadastro.** Lista dos itens aguardando liberação e as visões que faltam.

**Parâmetros e regras.**
- **Exigir liberação:** liga ou desliga para item novo. Os itens que já
  existem continuam liberados.
- Escolha das visões que liberam o cadastro.
- Para cada campo, se é **obrigatório** na empresa, com a opção de voltar ao
  padrão do sistema.

**Alertas.** Na Central de Alertas (VNOT0100), módulo Cadastro, ficam
disponíveis:
- item sem classificação fiscal;
- comprado sem fornecedor;
- fabricado sem estrutura;
- fabricado sem roteiro;
- item inativo, bloqueado ou descontinuado com pedido ou OF em aberto.

Cada alerta se resolve sozinho quando o cadastro é corrigido.

**Telas relacionadas.** VENT0200, VADM0200, VNOT0100.

---

#### VENT0210 — Cadastro de Estrutura de Produtos

**Para que serve.** Montar a estrutura (BOM) do item: os componentes, quantidades,
perdas e vigências que o MRP explode e o custo soma.

**Passo a passo.**
1. Informe o **código do item pai** (e a máscara, se configurado). A grade mostra
   os componentes atuais.
2. Para cada componente: código do filho (descrição e UM vêm do cadastro),
   posição, quantidade, unidade, perda %, situação e vigência (início/fim).
   Opcionais: fórmula da quantidade e da perda (com **Simular a fórmula**),
   arredondamento e casas decimais, grupo e prioridade (alternativos),
   almoxarifado e almoxarifado de linha, perda de preparação, centro de custo,
   perda de custo e observações.
3. Para montar o nível de baixo, abra o componente — vale para qualquer
   componente gravado, mesmo sem filhos ainda.
4. A coluna **Sinais** mostra o que muda o comportamento no planejamento:
   quantidade por fórmula, componente fora de vigência, componente com
   alternativo.

**Regras e cuidados.**
- **Unidade diferente da de estoque:** a tela mostra o que o planejamento vai
  usar (ex.: 2 M2 de chapa viram 31,4 kg). Sem conversão de UM cadastrada
  (VSUP0110), a gravação é recusada.
- A conferência lista **todos** os problemas de uma vez (sem gravar), para
  corrigir de uma passada só. Combinações que o MRP não consegue explodir são
  recusadas.
- As fórmulas podem ser copiadas e coladas entre componentes dentro da tela.

**Telas relacionadas.** VBOM0100, VENG0500 (onde usado, explosão), VENT0200,
VCFG0100 (máscara do configurado).

---

#### VENT0204 — Cadastro de Grupo

*Rotina de operações (console).*

**Para que serve.** Consultar, cadastrar e alterar os grupos (famílias) PDM da
empresa.

**Operações.** *Consultar*, *Abrir grupo*, *Cadastrar* (código e descrição) e
*Alterar grupo*. Para o cadastro em formulário, use a **VITE0114**.

**Telas relacionadas.** VITE0114, VITE0115, VITE0116.

---

#### VENT0115 — Cadastro de Roteiro Padrão

**Para que serve.** Manter os **roteiros modelo** — processos-padrão que depois são
copiados para os itens parecidos. Usa a mesma tela e as mesmas abas da VENT0202
(veja abaixo); a diferença é o uso: aqui se monta o modelo e se usa **Copiar
roteiro para outro item**.

**Telas relacionadas.** VENT0202.

---

#### VENT0202 — Cadastro do Roteiro de Fabricação

**Para que serve.** Descrever como um item é fabricado: as etapas, em que centro,
com que tempos, ferramentas e inspeções. O MRP, o CRP, o custo e a ordem de
produção leem o roteiro.

**Abas (na ordem em que se monta o processo).**
1. **Operação / Biblioteca:** o vocabulário de operações — nome, origem (interna
   ou externa), unidade dos tempos, centro padrão, preparação por lote, tempo de
   máquina, tempo de mão de obra, peças por ciclo, operadores, fila, espera,
   movimentação e refugo padrão. Operação **externa** (terceiro) tem fornecedor,
   item de serviço, custo por peça, prazo em dias e o que remeter. Documentos
   vinculados à operação valem em todo roteiro que a usa.
2. **Roteiros do item:** crie o roteiro do item — alternativa, máscara, *padrão
   (MRP/CRP)* e vigência. A lista mostra os ativos e os inativos.
3. **Etapas do roteiro:** inclua as etapas (sequência, operação, centro de
   trabalho, tempos, refugo da etapa, ponto de inspeção e observação). Operação
   externa já traz os dados da biblioteca; ajuste só o que for diferente.
4. **Recursos e ferramentas:** centros alternativos (prioridade, fator de tempo,
   principal), ferramentas, documentos e **inspeção nesta etapa** (o que
   inspecionar, amostra e aceitação %). A ordem de produção abre o registro de
   inspeção quando chega nessa etapa.
5. **Rede de dependências:** predecessora, sucessora e sobreposição %. A tela
   mostra o **caminho crítico**.
6. **Tempo e custo do lote:** informe um tamanho de lote e veja, etapa por etapa,
   máquina, mão de obra, paradas e custo — antes de gravar qualquer ordem.

**Desativar e reativar.**
- **Desativar** a operação: ela sai da lista de escolha, mas os roteiros que a
  usam continuam funcionando.
- **Desativar** o roteiro: deixa de ser usado no próximo MRP/CRP; ordens já
  geradas mantêm as etapas que receberam.
- **Reativar** o roteiro: volta a entrar no MRP e no CRP. Se outro roteiro do item
  já for o padrão, ele volta como **alternativo**.

**Prontidão do roteiro.** A tela confere sozinha, a cada mudança, o que o
planejamento exige e não está nesta tela — máquina apta no centro (VMAQ0200) e
tarifa por hora (VCUS0100) — e mostra a pendência na hora.

**Copiar roteiro para outro item.** Vão juntas as etapas (tempos, refugo,
terceirização) e a rede de dependências.

**Telas relacionadas.** VENT0115, VMAQ0200, VCUS0100, VPRO0900, VPRO0200,
VENG0600.

---

#### VENT0363 — Relatório de Tempo de Centro de Trabalho

*Rotina de consulta (console).*

**Para que serve.** Consultar tempos de operação e lead time para analisar carga e
tempo padrão. Não altera roteiros nem ordens.

**Operações.** *Consultar* (operações), *Tempos do roteiro*, *Lead time crítico*
(do roteiro) e *Carga CRP do plano*.

**Telas relacionadas.** VENT0202, VPRO0200.

---

#### VENG0204 — Cadastro de Regras de Variáveis Equivalentes

*Rotina de operações (console).*

**Para que serve.** Relacionar características do item pai com as do filho no
produto configurado (ex.: a cor do armário define a cor da porta).

**Operações.** *Consultar regras* de um item pai, *Cadastrar*, *Abrir*,
*Alterar*, *Excluir* e **Aplicar** (testa as respostas do pai e mostra o que
resulta no filho).

**Telas relacionadas.** VCFG0600, VCFG0100.

---

#### VITE0313 — Geração de Máscara para Itens Configurados

*Rotina de operações (console).*

**Para que serve.** Gerar uma máscara a partir das respostas informadas, opcionalmente
gravando-a.

**Dica.** Para responder as perguntas e ver a máscara se formando, use a
**VCFG0100**, aba *Configurar e gerar máscara*.

---

#### VITE0114 — Cadastro de Grupos (PDM)

**Para que serve.** Cadastrar os grupos PDM (famílias de itens) que compõem a
descrição técnica padronizada.

**Como usar.** **Novo**: o código é sugerido e não muda depois; informe a
descrição. Grupos não são excluídos — altere a descrição quando preciso.

**Telas relacionadas.** VITE0115, VITE0116, VENT0200.

---

#### VITE0115 — Cadastro de Modificadores (PDM)

**Para que serve.** Cadastrar os modificadores PDM (o qualificador que vem depois
do grupo: "PARAFUSO **SEXTAVADO**").

**Como usar.** **Novo**: o código é gerado pelo sistema; informe a descrição. Os
modificadores valem para todas as empresas.

**Telas relacionadas.** VITE0114, VITE0116.

---

#### VITE0116 — Cadastro de Atributos (PDM)

**Para que serve.** Montar a descrição técnica do item a partir do grupo, do
modificador e dos atributos (ex.: COR = PRETO, DIÂMETRO = 8 MM).

**Como usar.** Escolha grupo e modificador, adicione os atributos (nome e valor) e
confira a **pré-visualização**: a descrição técnica composta e o resumo para o
cadastro do item.

**Importante.** Atributo não tem cadastro próprio: os pares nome/valor são gravados
no próprio item (VENT0200).

**Telas relacionadas.** VITE0114, VITE0115, VENT0200.

---

#### VITE0118 — Cadastro de Regras de Itens Configurados

*Rotina de operações (console).*

**Para que serve.** Regras que preenchem campos do item configurado a partir das
respostas do configurador (ex.: a descrição ou o peso).

**Operações.** *Consultar regras do item*, *Cadastrar*, **Avaliar** (com as
respostas, mostra o resultado), *Abrir*, *Alterar* e *Excluir*.

**Telas relacionadas.** VCFG0600, VCFG0100.

---

#### VITE0129 — Recarga de Descrições de Itens Configurados

*Rotina de operações (console).*

**Para que serve.** Recarregar as linhas de uma descrição de item configurado
depois que o modelo da descrição mudou.

**Operações.** *Abrir descrição* e *Recarregar linhas*.

**Telas relacionadas.** VCFG0500.

---

#### VCFG0100 — Conjuntos e Variáveis do Configurador

**Para que serve.** O configurador de produto: ensinar ao sistema as perguntas que o
vendedor responde, as respostas possíveis, quais combinações existem e como cada
resposta forma o código (máscara) do item.

**Abas (cada etapa depende da anterior).**
1. **Respostas:** conjuntos de respostas ("Cores de MDF", "Espessuras de chapa").
   Cada resposta tem o pedaço que contribui para a máscara; a tela mostra como
   as respostas apareceriam montadas.
2. **Perguntas:** as características — descrição (o que o vendedor lê), tipo de
   resposta, se compõe a máscara, conjunto de respostas, mínimo/máximo, rótulos
   de Sim/Não e fórmula. **Onde é usada** mostra os itens que usam a pergunta.
3. **Perguntas do item:** vincule as perguntas ao item configurável e ordene
   (setas ↑ ↓). A ordem importa: as respostas já dadas eliminam opções das
   seguintes. **Renumerar de 10 em 10** abre espaço para encaixes.
4. **Restrições:** regra escrita como frase — *SE a COR for igual a PRETO E a
   LARGURA pertencer a 400, 450 ENTÃO a PROFUNDIDADE é inválida*. Informe o
   motivo (comercial, técnico, processo ou global) e a abrangência (item,
   classificação ou divisão de vendas; ou só para um cliente). A **auditoria**
   explica por que uma pergunta some.
5. **Configurar e gerar:** responda as perguntas e veja a máscara se formar.
   **Gerar combinações** cria de uma vez todas as combinações de um recorte de
   respostas; as restrições já removem as impossíveis.

**Telas relacionadas.** VCFG0200 a VCFG0600 (manutenção avançada), VENT0210,
VPRO0800.

---

#### VCFG0200 — Características do Configurador

*Rotina de operações (manutenção avançada).*

**Para que serve.** Manutenção avançada das características (perguntas): traduções,
itens vinculados e itens de recebimento. O cadastro guiado é a **VCFG0100**.

**Operações.** Listar, cadastrar, abrir, alterar e excluir característica;
traduzir (idioma, descrição e máscara) e excluir tradução; listar itens
vinculados; listar, vincular e excluir itens de recebimento.

**Cuidado.** *Alterar característica* substitui a característica **inteira**:
campo que não vier preenchido é gravado vazio. Abra a característica antes e
altere a partir do que veio.

---

#### VCFG0300 — Características por Item

*Rotina de operações (manutenção avançada).*

**Para que serve.** Manutenção avançada do vínculo item × característica (marcas de
especial, desenho e carga, fórmula e respostas padrão). Para ordenar com setas,
use a **VCFG0100**.

**Operações.** Listar as características do item, adicionar, alterar e excluir o
vínculo.

---

#### VCFG0400 — Geração de Máscaras Configuradas

*Rotina de operações.*

**Para que serve.** Gerar máscara (individual ou em lote) enviando as respostas
diretamente. Para ver a máscara se formando, use a **VCFG0100**.

**Operações.** *Gerar máscara* e *Gerar máscaras em lote* (com o recorte de
respostas e a opção de gravar).

---

#### VCFG0500 — Descrições Configuradas

*Rotina de operações.*

**Para que serve.** Montar descrições do item configurado (comercial, técnica)
que mudam conforme as respostas.

**Operações.** Tipos de descrição (listar, cadastrar, abrir, alterar, excluir);
descrição do item (cadastrar, listar, abrir, excluir); **atualizar linhas**,
**recarregar linhas** e **renderizar** (mostra o texto final para um conjunto de
respostas).

---

#### VCFG0600 — Regras do Configurador

*Rotina de operações.*

**Para que serve.** Reúne as regras equivalentes pai-filho (como a VENG0204) e as
regras que preenchem campos do item (como a VITE0118), com **aplicar** e
**avaliar** para testar antes de usar.

---

#### VENG0300 — Cabeçalho e Revisão de Estrutura BOM

*Rotina de operações.*

**Para que serve.** Criar o cabeçalho da estrutura (item, máscara, tipo e vigência),
consultar por item e alterar a situação (ex.: aprovada). O cadastro em
formulário é a **VBOM0100**.

---

#### VENG0400 — Desenhos e Revisões

*Rotina de operações.*

**Para que serve.** A manutenção completa do desenho técnico, além do que a VDES0100
faz.

**Operações.**
- Desenho: listar, cadastrar, abrir, alterar e excluir.
- Revisões: adicionar, listar, alterar e excluir.
- **Distribuição controlada:** registre quem recebeu a cópia de cada revisão e
  quando.
- **Características:** vincule respostas do configurador ao desenho (o desenho
  que vale para cada configuração).
- **Código por item:** consulte e mantenha o código do desenho por item e
  máscara.
- **Parâmetros fabris:** por exemplo, replicar a revisão do desenho.

---

#### VENG0500 — Estruturas Avançadas

*Rotina de operações.*

**Para que serve.** Consultas da estrutura que a VENT0210 não mostra numa tela só.

**Operações.** *Alterar componente*; *Filhos diretos*; **Consultar estrutura**
(explosão por item, máscara, data de efetividade e número de níveis — 0 = todos);
**Onde usado** (em que estruturas um componente entra).

---

#### VMAQ0300 — Tempos e Programação de Máquina

*Rotina de operações.*

**Para que serve.** Registrar o tempo produtivo de um item numa máquina e programar
uma ordem na máquina. Os mesmos cadastros, em formulário, ficam nas abas
*Produtividade* e *Agenda* da **VMAQ0200**.

---

#### VENG0600 — Rede de Precedência do Roteiro

*Rotina de operações.*

**Para que serve.** Definir ou remover a dependência entre duas etapas de um
roteiro, com sobreposição %. Em formulário, com o caminho crítico, use a aba
*Rede de dependências* da **VENT0202**.

---

#### VENG0610 — Seriais Físicos de Ferramentas

*Rotina de operações.*

**Para que serve.** Consultar, corrigir (número de série, situação, local,
observações) e desativar as unidades físicas de cada ferramenta.

**Telas relacionadas.** VPRO1000 (ficha de produção da ferramenta), VENT0202
(ferramentas da etapa).

---

## Produção

*Ordem de produção, capacidade (CRP), sequenciamento (APS), plano de corte, ferramentas e paradas.*

#### VPRO0200 — CRP — Capacity Requirements Planning

**Para que serve.** Mostrar quanto de máquina o plano do MRP pede, por centro de
trabalho e por dia, contra a capacidade de cada centro — e onde estoura.

**Como usar.** Escolha o **plano MRP** na lista (aparece com a data do último
cálculo); a carga já abre calculada. Filtre por centro e período quando quiser.

**Abas.**

| Aba | Pergunta que responde |
|---|---|
| **Visão geral** | Onde aperta: por centro, dias, horas necessárias × disponíveis, ocupação, pico e situação |
| **Mapa de carga** | Quando aperta: um gráfico por centro — a barra é a carga, a linha tracejada é a capacidade; o dia que passa da linha aparece hachurado e com o número |
| **Sobrecargas** | O que estoura: data, centro e o excedente |
| **Registros** | O número exato de cada carga |

**Indicadores.** Centros com carga, horas necessárias, ocupação média, pico de
carga e dias em sobrecarga (clicáveis — levam à aba que explica o número).

**Antes de confiar no número.** O CRP usa os tempos do roteiro (VENT0202), os
turnos e as paradas das máquinas (VMAQ0200). Máquina sem calendário ou etapa sem
tempo distorcem a carga.

**Telas relacionadas.** VMRP0100, VPRO0210, VMAQ0200, VMRP0200.

---

#### VPRO0210 — APS — Sequenciamento / Gantt

**Para que serve.** Sequenciar as operações das ordens de produção nos centros, ver
tudo num quadro (Gantt) e remanejar quando precisa.

**Abas.**
- **Quadro do mês:** linha do tempo por recurso, com navegação de mês. A colisão
  entre ordens e o buraco de agenda aparecem sem procurar; a barra atrasada vem
  hachurada e escrita "atrasada". Indicadores: operações no mês, atrasadas, dias
  sobrecarregados e dependências. Exporta o quadro.
- **Por ordem:** escolha a OF e veja suas operações (posição, centro, início, fim,
  duração, situação).
- **Por centro:** escolha o centro e o período.
- **Remanejar:** escolha a operação (na lista das barras do quadro) e o novo
  início. O sistema empurra as operações que dependem dela e avisa os problemas
  de capacidade.

**Sentido da programação.** Para frente (a partir de hoje) ou para trás (a partir
da entrega). Ordens que não cabem no prazo são reprogramadas para frente, e a
mensagem lista quais.

**Telas relacionadas.** VPRO0200, VPRO0900, VAPS0600, VMAQ0200 (agenda da
máquina).

---

#### VPRO0300 — Custo Padrão

**Para que serve.** Calcular e consultar o custo padrão do item (material,
operação, overhead e total).

**Como usar.** Informe o item e calcule; a lista mostra os custos padrão já
gravados. Para a composição detalhada, os indiretos e o histórico, use a
**VCUS0100**.

**Telas relacionadas.** VCUS0100, VPRO0900 (custo real × padrão).

---

#### VPRO0400 — Qualidade — Pontos de Inspeção

**Para que serve.** Planos de inspeção de processo por item, os laudos de inspeção e
as não conformidades de produção.

**Passo a passo.**
1. **Novo plano de inspeção:** item, momento (em que ponto do processo) e
   descrição. **Buscar planos** lista os do item.
2. **Nova característica:** nome, valor nominal, tolerâncias, unidade e se é
   crítica.
3. **Novo registro de inspeção (laudo):** plano, lote, resultado, observações e
   as medições por característica.
4. **Consultar registros:** por OF, lote ou item.
5. **Registrar não conformidade:** item, quantidade, descrição e severidade;
   depois escolha a **disposição** (destino do material).

**Telas relacionadas.** VINS0300 (lote de inspeção), VINS0500 (NC e CAPA),
VENT0202 (inspeção na etapa do roteiro).

---

#### VPRO0500 — Manutenção Preventiva

**Para que serve.** Planos de manutenção preventiva por máquina e as ordens geradas
a partir deles.

**Passo a passo.**
1. **Novo plano:** máquina, centro, descrição, frequência, intervalo (dias) e
   horas estimadas.
2. Gere as ordens para um horizonte (dias).
3. Em **Ordens** do plano: **Iniciar**, **Concluir** (com as horas reais) ou
   **Cancelar** cada ordem.

**Telas relacionadas.** VMAN0202, VMAN0401, VAPS0300 (paradas), VAPS0500.

---

#### VPRO0600 — Previsão Estatística

**Para que serve.** Projetar a demanda de um item a partir do histórico.

**Como usar.** Informe o item e o histórico (período AAAA-MM e quantidade; **+
Período** acrescenta linhas — são necessários ao menos 2). O sistema escolhe o
modelo que melhor explica o histórico, mostra o erro médio (MAPE %) e a quantidade
prevista dos períodos futuros.

**Telas relacionadas.** VPRE0251 (geração da previsão de vendas), VPRE0201.

---

#### VPRO0700 — Alertas de Exceções MRP

**Para que serve.** Ver as mensagens de exceção do último MRP e avisar os
responsáveis.

**Abas.**
- **Exceções do plano:** escolha o plano. A tela mostra os cinco tipos de
  mensagem do MRP com o que fazer em cada um. Vermelho pede ação imediata;
  amarelo é excesso ou cancelamento. Filtre por item ou texto. Esta aba não envia
  nada.
- **Notificar:** envia as exceções por **webhook** (começa com http:// ou
  https://) e/ou **e-mails**.

**Telas relacionadas.** VMRP0100.

---

#### VPRO0800 — Restrições e Configurador

**Para que serve.** Regras simples de restrição por atributo (nome, atributo,
operador, valor) e o teste de uma restrição contra um contexto.

**Como usar.** Cadastre a regra; em **Avaliar**, escolha a restrição e informe o
contexto (em JSON) para ver o resultado. Para o configurador completo, use a
**VCFG0100** (aba Restrições).

---

#### VCUT0100 — Plano de Corte

**Para que serve.** Otimizar o corte de chapas, barras e perfis: encaixar as peças
pedidas no material disponível com o menor desperdício, gerar o programa de corte
e baixar o estoque com os retalhos.

**Passo a passo.**
1. **Novo plano de corte:** matéria-prima (item), tipo de corte, descrição, kerf
   (largura da serra), refile, sobra mínima, unidade de estoque e fator, e o
   depósito (usado ao firmar).
2. **Demanda / peças:** etiqueta, largura, altura ou comprimento (mm), quantidade,
   item da peça e origem. Para peça de forma real, digite o **contorno** (x,y por
   linha, ao menos três vértices) e confira a prévia. Marque os **lados com fita**
   de borda: a tela calcula os metros e o custo da fita.
3. **Estoque disponível:** chapas e retalhos que podem ser usados.
4. **Otimizar:** gera os padrões de corte e mostra aproveitamento, sucata,
   estoque usado e as peças que não couberam.
5. **Programa:** a sequência de cortes para a máquina; **Agendar na máquina**.
6. **Firmar (baixa):** baixa o estoque e gera os retalhos.

**Padrões da empresa.** Modo de consumo, sobra mínima padrão e depósito padrão.

**Telas relacionadas.** VEST0100 (retalhos em estoque), VPRO0900.

---

#### VPRO0900 — Ordem de Produção

**Para que serve.** A ordem de fabricação (OF): do início à entrega no estoque, com
apontamentos, etapas, materiais, consumos e o custo real.

**Origem.** A OF nasce ao **firmar** uma ordem planejada do MRP (VMRP0100) ou pelo
botão **+ Nova OF** (item, quantidade, máquina, prioridade, observações).

**Situações.** Aberta → Em produção → Concluída → Encerrada (ou Cancelada).

**Abas.**
1. **Resumo:** planejado, apontado bom, refugo, entregue ao estoque, saldo a
   produzir, datas, origem e o que já foi feito.
   - **Iniciar produção:** antes, a tela confere as **faltas de material**. Com
     falta parcial ou sem saldo, pede confirmação (iniciar continua permitido).
   - **Explodir roteiro**, **Apurar custo**, **Encerrar**.
2. **Apontamento:** quantidade boa, refugo e motivo, data, máquina e **operador**
   (obrigatório). *Baixa automática da estrutura no depósito* baixa os
   componentes junto. Também há a leitura por **código de barras** (código lido,
   ação, dispositivo, funcionário).
3. **Etapas:** as operações do roteiro — iniciar, **pausar** ou **interromper**
   (com motivo) e **concluir**. Para concluir, informe horas trabalhadas ou peças
   produzidas: é o que desconta a vida útil da ferramenta.
4. **Materiais:** o que a ordem consome — a baixar, livre no depósito, o que as OFs
   da frente vão consumir, disponível e falta. Inclua material, aloque lotes e
   registre o destino da sucata.
5. **Consumos:** registre o consumo do insumo (sai do estoque para a ordem) ou
   **retorne como sucata** (volta ao estoque com valor).
6. **Custo:** custo real × padrão por componente, com o desvio. Sem custo padrão,
   o desvio não aparece (não há com o que comparar).

**Entrega ao estoque.** Informe depósito do acabado, quantidade e lote. Item que
controla número de série (VATC0110) pede as **séries** — uma por linha, uma por
unidade; vazio, se o perfil tiver máscara, o sistema gera. Entrega
parcial mantém a OF em produção; a entrega **final** conclui. Não dá para
concluir com quantidade zero se houver ordem de serviço de terceiro pendente.

**Encerrar** apura o custo real. A mensagem avisa se ficou algum custo pendente.

**Telas relacionadas.** VMRP0100, VENT0202, VPRO0210, VEST0100, VPRO1000,
VTPS0100 (serviço de terceiro).

---

#### VPRO1000 — Ficha de Produção da Ferramenta

**Para que serve.** Controlar que ferramenta (e qual unidade física, a série) está
em cada operação da ordem, e a vida útil de cada uma.

**Como usar.**
1. **Selecionar ordem** (as ordens do tipo OFC não entram) e abrir a ficha: cada
   operação com recurso, ferramenta e série atual.
2. Vincule a série à operação ou **troque** por outra — a substituição fica no
   histórico da operação.
3. **Ferramentas:** cadastre (código gerado), com tipo de vida, limite de vida e
   custo. **Só as que precisam de troca a partir de X%** mostra as que estão
   perto do limite (80% dá tempo de pedir a afiação). É possível zerar a vida
   útil (após afiação) ou inativar.
4. **Nova série:** número de série, situação e localização da cópia física.

**Telas relacionadas.** VENG0610, VENT0202, VPRO0900.

---

#### VAPS0100 — Grupos e Parâmetros de Recursos APS

*Rotina de operações (administrador).*

**Para que serve.** Organizar os recursos para o sequenciamento: grupos de recursos
(ex.: CORTE), e para cada recurso o grupo, calendário, localização, se é crítico
e se está ativo; para cada centro, os centros de custo de máquina e de mão de obra
e a capacidade em horas.

**Telas relacionadas.** VAPS0200, VAPS0600, VMAQ0200.

---

#### VAPS0200 — Calendários de Máquinas

*Rotina de operações (administrador).*

**Para que serve.** Os intervalos semanais de disponibilidade (dia da semana, início
e fim) que limitam o sequenciamento finito. Em formulário, use a aba *Turnos* da
**VMAQ0200**.

---

#### VAPS0400 — Perfil de Operadores APS

*Rotina de operações (administrador).*

**Para que serve.** O perfil do funcionário para o sequenciamento: contatos, funções
(com centro de custo, supervisor e gerente).

**Operações.** Consultar e salvar o perfil; alterar e desativar contato; alterar e
desativar função.

---

#### VAPS0500 — Perfil Industrial de Máquinas

*Rotina de operações (administrador).*

**Para que serve.** O perfil industrial da máquina: uso, aquisição, preparação,
marca, responsáveis, **serviços preventivos** (com frequência e os itens trocados)
e campos especiais (ex.: potência).

**Operações.** Consultar e salvar o perfil; alterar e desativar serviço, item do
serviço e campo especial.

---

#### VAPS0600 — Cálculo e Consulta do Sequenciamento APS

*Rotina de operações.*

**Para que serve.** Rodar o motor de sequenciamento e consultar o resultado sem o
quadro gráfico.

**Operações.** *Executar sequenciamento* (a partir de uma data, para ordens,
máquinas, centros ou operações escolhidos); *Consultar* recursos; *Abrir visão*
de um período; *Exportar eventos*; *Reprogramar operação* (com cascata); *Salvar
parâmetros* (ex.: listar só recursos ativos — administrador).

**Dica.** Para o dia a dia, use o quadro da **VPRO0210**.

---

#### VPRO1100 — Estoque da Manufatura

*Rotina de operações.*

**Para que serve.** Parâmetros de estoque da produção.

**Operações.**
- **Parâmetros gerais:** modo de retorno de lote, baixa automática de lotes,
  período de movimentação.
- **Controle por item:** unidade de estoque, se controla lote e endereço, tipo de
  grupo de inventário e baixa automática.
- **Endereços de almoxarifado:** se o almoxarifado é WMS e o almoxarifado
  intermediário de saída.

---

#### VPRO1200 — Parada de Máquina

**Para que serve.** O terminal de chão de fábrica para registrar a parada da máquina
no momento em que acontece. Fica aberto ao lado da máquina o turno inteiro.

**Como usar.**
1. Escolha o **posto** (máquina).
2. Quando a máquina parar, toque no **motivo** (os mais frequentes vêm primeiro).
   A tela fica **âmbar** e mostra há quanto tempo a máquina está parada.
3. Quando voltar, toque em **Voltou a produzir**: a tela mostra a duração da
   parada.

A parada já desconta a disponibilidade da máquina no planejamento. Parada
retroativa, correção e consulta por período ficam na **VMAQ0200**, aba Paradas.

**Telas relacionadas.** VMAQ0200, VPRO0200.

---

## Manutenção

*Ordens de manutenção e paradas de máquina.*

#### VMAN0202 — Apontamento de Ordens de Serviço de Manutenção

*Rotina de operações.*

**Para que serve.** Executar uma ordem de manutenção preventiva já gerada: iniciar e
concluir, com as horas reais. Não altera o plano.

**Operações.** *Ordens do plano* (informe o plano), **Iniciar ordem** e **Concluir
ordem** (com as horas reais).

**Telas relacionadas.** VPRO0500 (planos e geração das ordens), VMAN0401.

---

#### VMAN0401 — Consulta Ordens de Serviço

*Rotina de consulta.*

**Para que serve.** Consultar as ordens de manutenção por plano ou por centro de
trabalho, sem apontar nem alterar.

---

#### VAPS0300 — Paradas de Máquinas

*Rotina de operações (administrador).*

**Para que serve.** Registrar indisponibilidades planejadas ou emergenciais da
máquina (início, fim, tipo — ex.: manutenção — e motivo) e consultar por máquina e
período. O planejamento não ocupa a máquina nesses períodos.

**Dica.** Para registrar a parada na hora em que acontece, use a **VPRO1200**; para
a manutenção em formulário, a aba *Paradas* da **VMAQ0200**.

---

## Planejamento

*MRP, pipeline de planejamento, previsão de vendas, demandas e cargas.*

#### VPLN0100 — Pipeline de Planejamento (MRP→CRP→APS)

**Para que serve.** Rodar o planejamento inteiro de uma vez — materiais (MRP),
capacidade (CRP) e sequenciamento (APS) — e dizer se o plano é **viável**; também
programar a rodada automática, simular cenários e manter os parâmetros.

**Abas.**
1. **Executar pipeline:** plano, número inicial das ordens e "sequenciar a partir
   de". O resultado mostra o que cada etapa fez (ordens do MRP, sobrecargas do
   CRP, operações do APS) e o **parecer**: viável ou inviável, com os motivos.
2. **Execução automática:** liga a rodada diária, no horário escolhido (fuso da
   empresa), para o plano escolhido, com a opção de recalcular os níveis da
   estrutura. A rodada usa a sessão de quem salvou a configuração. O histórico
   mostra cada rodada: início, origem, situação, itens alterados, duração e
   parecer.
3. **Cenários (simulação):** crie um cenário a partir de um plano base e ajuste
   **demanda** (entrada ou baixa por item), **estoque**, **prazo** (dias) e
   **capacidade** (máquina, horas por dia, parada de/até). Calcule e compare lado
   a lado com o plano real: planejado, cobertura, falta, horas por centro e dias
   em sobrecarga. Nada disso mexe no plano real; **só a demanda** pode ser
   aplicada ao plano real. Descarte o cenário quando terminar.
4. **Parâmetros de planejamento:** a lista dos parâmetros numerados, editáveis na
   própria linha.

**Regra.** Só um cálculo de planejamento roda por vez; uma segunda execução
simultânea é recusada.

**Telas relacionadas.** VMRP0100, VPRO0200, VPRO0210, VMRP0200.

---

#### VPLA0102 — Cadastro de Demandas Independentes

**Para que serve.** Lançar demandas que não vêm de pedido de venda (previsão
firme, reposição, amostra, projeto) para o MRP considerar.

**Como usar.** Informe número da demanda, item (e se for configurado, a
**máscara** — o botão de máscaras permite escolher ou gerenciar as
configurações), centro de custo, quantidade e data. Para alterar, busque pelo
número.

**Dica.** As demandas dos pedidos de venda nascem sozinhas quando o pedido é
confirmado (VVND0200) — não lance de novo aqui.

**Telas relacionadas.** VMRP0100, VVND0200.

---

#### VMRP0100 — MRP — Planejamento de Materiais

**Para que serve.** Calcular o que comprar e o que fabricar, quanto e quando, para
atender pedidos, demandas e previsões — e transformar as sugestões em ordens.

**Como usar.** Escolha o **plano** na barra (vale para a tela toda), informe o
número inicial das ordens e calcule. Cada aba é um passo do trabalho do
planejador.

| Aba | O que se faz |
|---|---|
| **Visão geral** | Sugestões a firmar, as que terminam atrasadas, demandas, modos do plano e último cálculo |
| **Cobertura** | Para cada item: até quando o estoque cobre e até quando estoque + ordens firmes cobrem, com farol (crítico, atenção, coberto). Filtre por planejador ou tipo e firme a planejada que cobre a falta sem sair da tela |
| **Sugestões** | O resultado do cálculo: item, tipo (fabricação/compra), quantidade, necessidade, início e término, máquina e tempo. Filtre por item, tipo e atraso e **firme em lote**. *Para quem é* mostra os pedidos e demandas que a sugestão atende |
| **Ordens planejadas** | As ordens já criadas, com as transições **Firmar**, **Liberar** e **Voltar para planejada** (em lote) |
| **Exceções** | As mensagens do cálculo com a ação na própria linha: reprogramar para a data que o cálculo pede, cancelar ordem sem demanda ou marcar como analisada (fica registrado quem tratou e como) |
| **Rastreamento** | De cada pedido ou demanda até as compras dos componentes, e de uma ordem até quem depende dela — "esta compra serve a quem?" e "o que falta para este pedido sair?" |
| **Perfil do item** | O perfil por data: demanda, planejadas, firmes e estoque projetado — e quando o estoque fura. Também as regras configuradas do item |
| **Planos** | Cadastro dos planos (código, nome, abrangência, classificação) e as empresas inter-fábrica de cada plano |
| **Relatórios** | Relatórios do plano em grade legível |

**Firmar uma sugestão.** Vira ordem planejada firme; se for de **fabricação**, a
ordem de produção (VPRO0900) é criada na hora; se for operação **externa**, nasce
a requisição de serviço (VTPS0100). Ordens firmes não são mexidas pelos cálculos
seguintes.

**O que o MRP não planeja.** Item de terceiro, item com tipo MRP *projeto*, item
de estrutura comercial e item com estoque suficiente.

**Antes de calcular.** Itens prontos (VITM0100), estrutura (VENT0210), roteiro
(VENT0202), parâmetros de lote e segurança (VENT0200, aba Planejamento) e
fornecedor preferencial dos comprados.

**Telas relacionadas.** VPLN0100, VPRO0700, VPRO0900, VPRO0200, VSUP0400 (cotação
de compra), VVND0200 (aba Atendimento).

---

#### VPRE0101 — Tabela de Apropriação

**Para que serve.** Repartir a previsão semanal pelos dias da semana (quanto de cada
semana cai na segunda, na terça...).

**Como usar.** Descrição e o percentual de cada dia — a soma dos sete dias tem de
dar 100%. Marque **Definir como padrão** para a tabela usada por omissão.

**Telas relacionadas.** VPRE0201.

---

#### VPRE0102 — Bloqueio de Previsão de Vendas

**Para que serve.** Travar um período para que ninguém altere a previsão (ex.: mês
já fechado com a diretoria).

**Como usar.** Início, fim (não pode ser antes do início) e motivo. Semanas cuja
segunda-feira cai no período passam a ser recusadas na gravação.

**Telas relacionadas.** VPRE0201, VPRE0251.

---

#### VPRE0201 — Cadastro da Previsão de Vendas

**Para que serve.** Lançar a previsão de vendas por item.

**Como usar.**
- **Previsão semanal:** item, máscara, semana (1 a 53), ano e quantidade — grava
  direto na semana.
- **Previsão mensal:** item, mês, ano e quantidade mensal — o sistema reparte nas
  semanas pelos **dias úteis do calendário industrial**. *Aceita fração* permite
  quantidades quebradas; *Atualizar existente* sobrescreve o que já houver.
- **Consultar previsões:** por ano ou por item (o item prevalece sobre o ano).

**Telas relacionadas.** VPRE0251, VPRE0301, VPRE0102, VCAL0100.

---

#### VPRE0251 — Geração de Previsão de Vendas

**Para que serve.** Gerar a previsão a partir do histórico, em vez de digitar.

**Como usar.** Escolha os itens (e máscara), a **fonte do histórico** (pedidos ou
faturamento) e o período do histórico; depois o período a gerar (semana e ano
inicial e final) e a **projeção %** (ex.: +10% sobre o histórico). Marque *Aceita
fração* e *Atualizar existente* se for o caso. O resultado é gravado no cadastro
de previsões.

**Telas relacionadas.** VPRE0201, VPRO0600 (previsão estatística).

---

#### VPRE0301 — Listagem Vendas Previsto X Realizado

**Para que serve.** Comparar, no ano, o previsto com o realizado de cada item.

**Como usar.** Escolha o ano e a fonte do realizado (pedidos e/ou faturamento). A
grade mostra item, máscara, semanas, previsto, realizado, diferença e aderência
(% da previsão atendida).

**Telas relacionadas.** VPRE0201, VVND0500.

---

#### VPLC0211 — Cadastro de Orientações de Entrega

*Rotina de operações.*

**Para que serve.** Registrar instruções de entrega ligadas à carga e ao cliente
(ex.: "Agendamento obrigatório", "Entregar só após confirmação").

**Operações.** *Consultar* (por carga; só as ativas) e *Cadastrar* (carga, cliente,
título e instrução).

**Telas relacionadas.** VPLC0200, VEXP0110, VEXP0120.

---

#### VPLC0200 — Montagem de Carga

*Rotina de operações.*

**Para que serve.** Montar a carga com os romaneios e as notas antes da liberação
logística.

**Operações.** *Consultar* (por situação e transportadora); *Cadastrar* a carga
(descrição, transportadora, placa, motorista); *Abrir carga*; *Adicionar* e
*Remover romaneio*; *Adicionar nota fiscal*.

**Telas relacionadas.** VEXP0110 (gestão de cargas), VEXP0100 (romaneio),
VFIS0640 (faturar a carga).

---

#### VMRP0200 — Pipeline MRP → CRP → APS

*Rotina de operações.*

**Para que serve.** Disparar o pipeline de planejamento com os parâmetros enviados
diretamente (plano, número inicial das ordens, recalcular níveis, sequenciar a
partir de). Para o resultado legível e o parecer de viabilidade, use a
**VPLN0100**.

---

#### VPLA0300 — Parâmetros do Planejamento

*Rotina de operações.*

**Para que serve.** Consultar e alterar os parâmetros numerados do MRP e do
planejamento. A mesma lista, editável na linha, está na aba *Parâmetros de
planejamento* da **VPLN0100**.

---

#### VCAL0200 — Dias Úteis Prometidos por Item

*Rotina de consulta.*

**Para que serve.** Ver o calendário efetivo do mês que a promessa de entrega usa
para um item e uma configuração (máscara; use "-" quando não houver).

**Telas relacionadas.** VPME0102ITE, VENT0108, VCAL0100.

---

## Suprimento

*Fornecedores, pedido de compra, solicitação, cotação, contratos, recebimento e serviços de terceiros.*

#### VPCT0100 — Tolerâncias de Pedido de Compra

**Para que serve.** Definir quanto a nota de entrada ou o aviso de recebimento pode
divergir do pedido de compra e o que o sistema faz quando passa disso.

**Como usar.**
1. **Nova regra:** tipo (**quantidade**, **preço do item** ou **total dos
   produtos**), a que se aplica (NF de entrada, aviso de recebimento ou os dois),
   fornecedor (opcional — vazio vale para todos), intervalo mínimo e máximo,
   limite, unidade (% ou valor fixo) e **ação**: **avisar** ou **bloquear**.
2. **Avaliar (esperado × real):** informe os dois números e veja que regra dispara
   e qual ação resulta.

**Telas relacionadas.** VPDC0200, VAVR0200, VFIS0210.

---

#### VTPS0100 — Serviços de Terceiros

**Para que serve.** Controlar o que vai para fora ser processado (tratamento térmico,
galvanização, pintura): quanto custa, o que está no terceiro agora e o que saiu e
voltou de cada ordem.

**Abas.**
1. **Preços de serviço:** item, fornecedor e **operação** (os três definem o
   preço), máscara, UM, preço unitário, vigência, frete, imposto %, preferencial,
   fator de conversão e fórmula. **Ações em lote:** reajustar (percentual e
   motivo — o histórico guarda o valor anterior) e copiar ou mover preços para
   outro fornecedor/operação. Desativar um preço tira-o do custo e das ordens
   novas; ordens já emitidas mantêm o preço.
2. **Ordens de serviço:** as ordens com o que foi enviado, o que voltou, o que
   **está lá** agora, a data prometida e a situação. *Vencida* = ainda há peça no
   terceiro e a data prometida passou.
3. **Remessa e retorno:** lance o movimento da ordem (tipo, quantidade,
   documento, lote, observação) e veja o histórico.
4. **Conversões de unidade:** da unidade do fornecedor para a nossa (de, para,
   fator).

**De onde vem a ordem.** Da ordem de produção, quando o roteiro tem etapa externa
(a firmação no MRP já cria a requisição de serviço).

**Telas relacionadas.** VENT0202 (operação externa), VPRO0900, VTER0100 a
VTER0400 (manutenção avançada).

---

#### VPDC0200 — Pedido de Compra

**Para que serve.** Formalizar a compra: o documento que vai ao fornecedor e que o
recebimento confere depois.

**Visões da tela.** **Pedidos** (o cadastro), **Sugestões do MRP**,
**Acompanhamento de entregas** e **Previsão de pagamentos**.

**Passo a passo (Pedidos).**
1. **Novo — aba Capa:** fornecedor, emissão, entrega prevista, moeda,
   observações e condição de pagamento. Grave a capa antes dos itens.
2. **Aba Transporte e pagamento:** frete (tipo, valor, em que momento e por quem
   é aplicado), transportadora, redespacho, talão, **adiantamento** (valor e data),
   incoterm e embarque.
3. **+ Item:** item, quantidade, preço unitário, entrega, almoxarifado, desconto,
   IPI, ICMS, tolerância, centro de custo, utilização, classificação fiscal e tipo
   de nota. Preço, unidade interna e IPI podem ficar em branco — o sistema busca
   na tabela de preço, nas conversões do item e na classificação fiscal. O painel
   de **histórico de preço** mostra a última compra, o custo médio de 12 meses
   por unidade de estoque e o último pedido.
4. **Origem da linha:** solicitante, requisição (e **qual linha** dela este item
   atende), cotação, contrato, ordem planejada do MRP, pedido de venda ou ordem de
   produção.
5. **Confirmar / aprovar:** passa pela **alçada do comprador**. Acima da alçada, o
   pedido fica bloqueado até a autorização superior; acima do teto absoluto, nem
   a autorização libera.
6. **Aba Enviar ao fornecedor:** o PDF do pedido, os e-mails do cadastro (o
   contato "de pedido de compra" vem sugerido) e o histórico de envios —
   inclusive os que falharam e por quê.
7. **Aba Notas e recebimentos:** que notas de entrada atenderam cada linha.
8. **Aba Pagamentos previstos:** as parcelas que o pedido ainda vai gerar.

**Depois da aprovação** a capa e as linhas não mudam mais; só se **elimina o saldo**
de uma linha (com motivo).

**Cancelar o pedido.** Os títulos a pagar ligados ao pedido (como o adiantamento)
são cancelados junto. Não cancela se o título já teve pagamento ou se veio da NF
de entrada — nesse caso cancele a nota primeiro.

**Sugestões do MRP.** As ordens planejadas de compra ainda não firmes: escolha o
fornecedor e **Gerar pedido** (passa pela alçada como qualquer pedido) ou
**Rejeitar**.

**Acompanhamento de entregas.** O que os fornecedores ainda devem, com os dias de
atraso. **Registrar contato** grava a nova data prometida, com quem se falou e o
que foi dito; a data passa a valer aqui e na previsão de pagamentos.

**Telas relacionadas.** VSUP0300 (solicitação), VSUP0400 (cotação), VPDC0210,
VAVR0200, VFIS0210 (NF de entrada), VFIN0200.

---

#### VSUP0500 — Cadastro de Fornecedor

**Para que serve.** O cadastro dos fornecedores, com endereços, telefones, e-mails,
vencimentos, contatos e os dados por empresa.

**Passo a passo.**
1. **Dados:** razão social, fantasia, pessoa, tipo de documento e CNPJ/CPF (com
   CNPJ válido, é possível **consultar** os dados e revisar antes de salvar),
   inscrições estadual e municipal, tipo de fornecedor, tipo de frete,
   contribuinte do ICMS, plataforma de rastreio, GLN e demais marcadores.
2. Salve. Depois preencha as pastas:
   - **Endereços**, **Telefones** (com ranking), **E-mails**;
   - **Vencimentos:** condição de pagamento, tipo de pagamento, mês subsequente;
   - **Janela de recebimento:** de que horas a que horas o caminhão pode encostar
     e quanto tempo a descarga leva (a portaria agenda a doca por isso);
   - **Contatos:** nome, cargo, tipo de contato (comercial, fiscal, logística...),
     ordem, telefone, e-mail, departamento e a marca de contato do pedido de
     compra;
   - **Empresas:** em que estabelecimento o fornecedor é usado, com conta
     financeira, tipo de NF padrão, tabela de preço de compra e IPI.

**Cadastros de apoio** (modo próprio da tela): tipos de fornecedor, tipos de
contato e os **parâmetros de compras da empresa** — conta financeira padrão, tipo
de fornecedor para compra, fornecedor genérico da NF-e, data-base dos vencimentos
das notas de entrada, código de item único por fornecedor, exigir conta
financeira, copiar observação para o pedido e para a NF de entrada, homologação
padrão e usar a unidade de estoque.

**Bloquear / desbloquear** o fornecedor está na lista.

**Telas relacionadas.** VSUP0130, VSUP0140 (transportadora), VPDC0200, VSUP0660.

---

#### VSUP0110 — Conversão de UM por Item

**Para que serve.** Cadastrar a conversão entre unidades de um item (ex.: 1 BARRA =
6000 MM; 1 CX = 12 UN). Compra, estoque, estrutura e MRP usam esta conversão.

**Como usar.**
1. Escolha o item. Informe **De (UM)**, **Para (UM)**, fator, arredondamento %,
   tolerância e em que a tolerância é medida. A tela mostra a conversão nos dois
   sentidos, para conferir que não foi cadastrada invertida.
2. **Resolver conversão:** simule (de, para, quantidade) e veja o resultado.

**Regras.**
- O par de unidades é a identidade da conversão. Para trocar uma unidade, exclua e
  cadastre de novo — alterar a unidade criaria outra conversão.
- A tela avisa quando o par não toca nenhuma unidade do item (conversão que
  ninguém vai usar).

**Telas relacionadas.** VENT0200, VENT0210, VPDC0200.

---

#### VSUP0120 — Tabela de Preço de Compra

**Para que serve.** Os preços negociados com fornecedores, com vigência e descontos
ou acréscimos.

**Como usar.** **Nova tabela:** descrição, moeda e vigência. **Adicionar preço:**
item, preço, UM, quantidade mínima e fornecedor; acrescente **descontos e
acréscimos em cadeia** (natureza, cálculo, valor) — a ordem importa, cada um
incide sobre o resultado do anterior.

**Telas relacionadas.** VPDC0200 (preço sugerido no pedido), VSUP0680.

---

#### VSUP0140 — Cadastro de Transportadora

**Para que serve.** Os dados que faltam para operar frete com uma transportadora
(que é um fornecedor): habilitação, tabela de frete, seguro, frota, regiões e a
avaliação pelas ocorrências.

**Passo a passo.**
1. **+ Nova transportadora:** escolha o fornecedor que é a transportadora.
2. **Identificação e habilitação:** RNTRC (8 dígitos) e validade, categoria ANTT,
   modal, tipo de frete padrão, prazo médio, URL de rastreamento e contato.
3. **Tabela de frete padrão:** piso, R$ por kg, ad valorem %, GRIS %, pedágio por
   100 kg; seguradora, apólice, validade e cobertura.
4. **Frota e motoristas** (+ Veículo) e **Regiões atendidas** (+ Região: UF,
   cidade, faixa de CEP, prazo e preços próprios — em branco usa a tabela padrão).
5. **Ocorrências de entrega:** data, tipo, pedido, atraso, custo e descrição.
   Entram na **avaliação dos últimos 12 meses**.

**Cotação comparativa de frete.** Com nenhuma transportadora aberta, informe
destino (UF ou CEP), peso, volume e valor da carga e **Cotar frete**: a tela
compara todas as transportadoras com total e previsão de entrega.

**Não confundir** com o *portador* (VCLI0510), que é o cadastro financeiro de
cobrança.

---

#### VSUP0130 — Fornecedor Preferencial por Item

**Para que serve.** Ligar o item aos fornecedores que o vendem, com ranking (o
preferencial), lead time, o código e a descrição do item no fornecedor e a UM.

**Por que importa.** O MRP e a geração de pedidos usam o fornecedor preferencial;
item comprado sem fornecedor não está pronto para o MRP (VITM0100). O código no
fornecedor é o que a importação da NF-e usa para reconhecer o item.

**Telas relacionadas.** VVOR0202, VSUP0670, VFIS0610.

---

#### VSUP0300 — Solicitação de Compra

**Para que serve.** O pedido interno de compra: alguém da empresa precisa de um
material; o comprador atende gerando pedidos.

**Como usar.**
1. **Nova solicitação:** estabelecimento, solicitante e observação; adicione os
   itens (item, quantidade, UM, valor sugerido).
2. **Atender:** marque quanto atender em cada item e o fornecedor (vazio = o
   preferencial). O sistema gera um pedido de compra **por fornecedor** e
   registra o atendimento na solicitação (saldo, situação do item).

**Telas relacionadas.** VSUP0400 (cotação), VPDC0200.

---

#### VSUP0400 — Cotação de Compra

**Para que serve.** Cotar com vários fornecedores, comparar e fechar.

**Como usar.**
1. **Liberar cotação:** estabelecimento; marque na lista as **linhas de solicitação
   com saldo em aberto** (solicitação, item, saldo, UM, entrega) e/ou informe os
   números das ordens planejadas do MRP que entram na cotação.
2. **Convidar fornecedores:** os códigos, separados por vírgula.
3. **Mapa da cotação:** a matriz item × fornecedor. Digite o preço (e o lead
   time) na célula do fornecedor: o **melhor preço** de cada linha fica marcado, com
   a economia contra o segundo, e o **total por fornecedor** mostra quanto
   custaria fechar tudo com cada um.
4. Selecione o vencedor de cada linha (ou **Fechar tudo com…** um fornecedor) e
   gere os pedidos. A mensagem diz os números dos pedidos gerados e o que não
   entrou, com o motivo. Também é possível registrar um preço avulso escolhendo o
   item da cotação na lista.

**Telas relacionadas.** VSUP0300, VMRP0100, VPDC0200.

---

#### VCON0200 — Cadastro de Contratos de Fornecedores

**Para que serve.** Registrar o contrato de fornecimento: quantidades e preços
acordados por um período.

**Como usar.** **Capa:** empresa, fornecedor, número do contrato, situação,
descrição, moeda, vigência e índice de reajuste. **Linhas:** item, máscara, UM,
quantidade contratada (positiva), preço unitário e pedido mínimo. O sistema
devolve o número interno do contrato.

**Telas relacionadas.** VCON0400, VCON0202, VPDC0200 (linha atende contrato).

---

#### VCON0400 — Consulta de Contratos de Fornecedores

**Para que serve.** Ver os contratos e o saldo de cada linha (contratada, consumida,
saldo) e mudar a situação do contrato.

---

#### VCON0202 — Baixa de Saldo / Cancelamento do Contrato

**Para que serve.** Baixar saldo de uma linha do contrato ou encerrar o contrato.

**Como usar.** Informe o número interno e **Abrir**. Selecione a linha e a
**quantidade a baixar** (só em contrato ativo e até o saldo). **Cancelar
contrato** encerra todo o contrato.

---

#### VAVR0200 — Aviso de Recebimento

**Para que serve.** Avisar a portaria e o almoxarifado do que vai chegar, agendar a
doca e registrar as divergências na chegada.

**Como usar.**
1. **Novo aviso:** empresa, fornecedor (ou pedido de compra), transportadora,
   pedido, doca, número da NF, data agendada e observações; **itens esperados**
   (item, máscara, quantidade, unidade).
2. Acompanhe o aviso pela situação na lista.
3. **Divergências:** tipo, quantidade esperada e real; depois registre a
   **resolução** de cada uma.

**Telas relacionadas.** VPDC0200, VFIS0210, VSUP0140 (janela de recebimento).

---

#### VVOR0202 — Cadastro de Itens por Fornecedor

*Rotina de operações.*

**Para que serve.** Consultar os itens de um fornecedor e manter os **relatórios de
qualidade** do vínculo item × fornecedor (data, situação e o arquivo — PDF, PNG ou
JPEG).

**Telas relacionadas.** VSUP0130, VSUP0670.

---

#### VSUP0610 — Alçadas e Parâmetros de Compras

*Rotina de operações (gravação só por administrador).*

**Para que serve.** Os limites de aprovação de compra e os parâmetros de
suprimentos.

**Operações.**
- **Alçadas:** escopo (ex.: por fornecedor), moeda, **valor até o qual aprova
  sozinho** e **valor acima do qual bloqueia**, vigência e observação.
- **Parâmetros:** por domínio (ex.: aviso de recebimento — exigir aviso), com
  chave, valor e tipo.

**Telas relacionadas.** VPDC0200, VAPR0100.

---

#### VSUP0620 — EDI de Fornecedores

*Rotina de operações.*

**Para que serve.** Receber as confirmações eletrônicas do fornecedor (quantidade,
preço e data confirmados) e evidenciar as divergências contra o pedido, com as
tolerâncias.

**Operações.** Consultar (por fornecedor e situação), registrar mensagem e abrir.

---

#### VPDC0210 — Consulta, Aprovação e Recebimento de Pedidos

*Rotina de operações.*

**Para que serve.** A consulta operacional dos pedidos de compra com filtros por
faixa (pedido, fornecedor, item), tipo de solicitação, comprador, emissão,
entrega, kanban e posição; e as ações **Aprovar**, **Autorizar alçada**
(administrador) e **Registrar recebimento** físico (linha, quantidade,
almoxarifado e lote).

**Dica.** O mesmo ciclo, em formulário, está na **VPDC0200**.

---

#### VTER0100 — Preços de Serviços de Terceiros

*Rotina de operações (gravação só por administrador).*

**Para que serve.** Manutenção avançada dos preços de serviço: consultar por faixas,
cadastrar, alterar, **resolver o preço** de um item numa data, **consultar o
custo do serviço**, histórico, reajustar, copiar/mover e excluir. Em formulário,
use a aba *Preços de serviço* da **VTPS0100**.

---

#### VTER0200 — Ordens de Serviço de Terceiros

*Rotina de operações.*

**Para que serve.** Consultar as ordens (por situação e fornecedor), emitir o
relatório, **gerar as ordens a partir da OF**, abrir e mudar a situação (com a
requisição e o pedido de compra vinculados). Em formulário: **VTPS0100**.

---

#### VTER0300 — Remessas e Retornos de Terceiros

*Rotina de operações.*

**Para que serve.** Registrar os movimentos da ordem de serviço (remessa, retorno,
recebimento, ajuste — com lote e almoxarifado) e ver o histórico. O registro não
duplica se for enviado duas vezes. Em formulário: **VTPS0100**, aba *Remessa e
retorno*.

---

#### VTER0400 — Conversões Globais de Terceiros

*Rotina de operações (administrador).*

**Para que serve.** Os fatores de conversão de unidades usados no custo e nos
movimentos de terceiros (ex.: KG → UN). Em formulário: **VTPS0100**, aba
*Conversões de unidade*.

---

#### VSUP0640 — Registros Operacionais de Compras

*Rotina de operações.*

**Para que serve.** Ocorrências operacionais de compra, recebimento e inspeção
(tipo, situação, fornecedor, pedido, item, quantidade, referência): consultar,
cadastrar, abrir e mudar a situação.

---

#### VSUP0650 — Histórico de Movimentos de Compra

*Rotina de consulta.*

**Para que serve.** Consolidar os movimentos de compra por fornecedor e item para
rastrear e analisar as compras.

---

#### VSUP0660 — Parâmetros e Contatos do Fornecedor

*Rotina de operações.*

**Para que serve.** Os parâmetros corporativos do cadastro de fornecedores (os mesmos
dos *Cadastros de apoio* da VSUP0500) e a inclusão de telefones e e-mails em
contatos já gravados.

---

#### VSUP0670 — Itens e Qualidade do Fornecedor

*Rotina de operações.*

**Para que serve.** Consultar os itens do fornecedor (inclusive buscando pelo código
ou descrição do fornecedor), manter os relatórios de qualidade do vínculo e
associá-los (ou removê-los) às ordens de inspeção de recebimento.

---

#### VSUP0680 — Fontes de Preços de Compra

*Rotina de operações.*

**Para que serve.** Atualizar a tabela de preço de compra a partir das compras
reais.

**Operações.** **Consultar fontes** (preços vindos de pedidos e notas num período,
por fornecedor ou tabela), **Consultar candidatos** de uma tabela, **Aplicar fonte
de preço** (com ou sem sobrescrever) e **Copiar e reajustar itens** entre linhas
da tabela.

**Telas relacionadas.** VSUP0120.

---

## Almoxarifado

*Almoxarifados, estoque, inventário, lotes, expedição e o material de terceiros (beneficiamento).*

#### VLOT0100 — Máscaras de Lote/Série

**Para que serve.** Definir como o número de lote ou de série é formado (por partes:
texto fixo, data, sequência...) e gerar o próximo número. Também abre pelo código
antigo VEST0300.

**Como usar.**
1. **Nova máscara:** aplicação (lote ou série), descrição e, se quiser, item e
   cliente (a máscara vale só para eles).
2. **Partes:** sequência, tipo, tamanho e — para parte de data — o formato
   (ex.: DDMMYYYY, YYMM). Uma parte desativada deixa de compor o lote.
3. **Gerar próximo lote** (pela máscara) ou **Gerar código de lote** pelo contexto
   do item e do cliente. A tela mostra o último lote gerado.

**Telas relacionadas.** VEST0100 (aba Lotes), VPRO0900 (lote do acabado).

---

#### VEST0500 — Programação e Execução de Contagem Cíclica

**Para que serve.** Executar as contagens cíclicas (a política de contagem fica no
cadastro do item, VENT0200 — aba Estoque).

**Como usar.**
- **Programação manual extraordinária:** almoxarifado, endereço, item, máscara,
  lote e data/hora.
- **Conferência do item:** a tela mostra situação, origem e quantidade esperada;
  informe a quantidade contada (ou física) e o motivo. A divergência e a próxima
  etapa aparecem na hora.

**Telas relacionadas.** VEST0200 (inventário geral), VEST0100.

---

#### VENT0800 — Cadastro de Almoxarifado

**Para que serve.** Cadastrar os almoxarifados (depósitos) e como cada um se comporta.

**Como usar.**
1. **Dados gerais:** código, descrição, **localização** (ex.: produção,
   expedição, **inspeção**, rejeição), tipo, almoxarifado de expedição, *Disp.
   planejamento* (o MRP conta o saldo dele), **Saldo negativo** (permite ou não),
   estabelecimento e observação.
2. Abas **Clientes** e **Fornecedores:** para almoxarifado de terceiro
   (consignação, material do cliente).
3. Para alterar, busque pelo código — o código não muda.

**Regras importantes.**
- **Sem "saldo negativo" marcado**, qualquer saída que deixe o almoxarifado (ou o
  endereço) abaixo de zero é recusada. O ajuste de inventário e de contagem
  cíclica passa.
- Almoxarifado de **inspeção:** o material só sai pela decisão do lote de
  inspeção (VINS0300). Inspeção e rejeição **não entram no disponível para
  promessa** (ATP).

**Telas relacionadas.** VEST0100, VINS0300.

---

#### VEST0100 — Central de Estoque

**Para que serve.** Tudo do estoque do dia a dia numa tela: posição, extrato,
lançamentos, transferências, requisições, reservas, separação, lotes, reposição e
análises. O item escolhido na barra de cima vale para todas as abas.

**Abas.**

| Aba | O que se faz |
|---|---|
| **Posição** | Em mãos, reservado, **disponível para promessa (ATP)** e o *não prometível* (em inspeção ou rejeição), por almoxarifado; consumo médio/mês (com *Recalcular* — transferências e estornos não contam). **Posição em data** valorizada, com a 2ª unidade quando o item tem conversão |
| **Extrato** | O kardex: saldo anterior, cada movimento com o saldo acumulado em quantidade e valor, e o saldo final. **Estorno** de movimento manual ou de transferência, com motivo |
| **Lançamentos** | Lançar movimento manual: item, almoxarifado, **tipo de movimento** (VEST0200 — diz se é entrada ou saída, se exige centro de custo e se mexe no custo médio), quantidade, preço, lote, endereço, centro de custo e observação |
| **Transferências** | Entre almoxarifados (uma operação só: sai ao custo médio e entra pelo mesmo custo) ou entre endereços do mesmo almoxarifado |
| **Requisições** | Requisição ao almoxarifado: solicitante, centro de custo e itens. O almoxarife entrega tudo ou parte (*Entregar tudo o pendente*); cada entrega é uma saída no centro de custo da requisição. Cancelar mantém o que já foi entregue |
| **Reservas** | Nova reserva (item, almoxarifado, quantidade, origem, validade) — diminui o ATP. Liberar ou consumir |
| **Separação e guarda** | Sugestão de separação (FEFO/FIFO), **onda de separação** (várias necessidades numa caminhada) e **sugestão de endereço** para guardar o recebimento |
| **Lotes** | Registrar lote (corrida, certificado, fornecedor, recebimento, validade), saldos por lote e **genealogia** |
| **Reposição** | Itens a repor por ponto de pedido / estoque mínimo — para o que não passa pelo MRP (consumíveis, manutenção). A projeção já desconta pedidos e requisições de compra em aberto. Os marcados viram uma **requisição de compra** (VSUP0300) |
| **Análises** | Giro, cobertura, itens parados, **curva ABC** do valor consumido e lotes vencidos ou a vencer |

**Telas relacionadas.** VEST0200 (inventário e tipos de movimento), VEST0500,
VENT0800, VEST0400.

---

#### VEST0200 — Inventário e Tipos de Movimento

**Para que serve.** O inventário físico e o cadastro dos tipos de movimento.

**Aba Inventário físico.**
1. **Abrir inventário:** número, almoxarifado, descrição, data e, se for parcial,
   o recorte. A abertura grava a **foto** do saldo naquele momento.
2. **Registrar contagem:** item, quantidade contada e observação. A diferença é
   contra a foto; recontar substitui a contagem anterior (que fica guardada).
3. **Fechar:** lança o ajuste de cada diferença ao custo médio e mostra o valor
   líquido. O que entrou ou saiu depois da abertura continua valendo.

**Aba Tipos de movimento.** Sigla, descrição, direção (entrada/saída), uso,
permite lançamento manual, exige centro de custo, atualiza custo e conta como
consumo.

**Telas relacionadas.** VEST0100, VEST0500.

---

#### VEXP0100 — Expedição / Romaneio

**Para que serve.** O romaneio de expedição: o que vai sair, em quantos volumes, com
que peso e em que transporte.

**Passo a passo.**
1. **Novo romaneio** (tipo e transportadora) ou **Gerar** a partir do pedido de
   venda (informe o código do pedido).
2. **Itens:** item, quantidade, depósito e pesos unitários. Confira cada item
   (planejado × conferido; a divergência fica marcada).
3. **Volumes / packing:** espécie, peso bruto, dimensões (a cubagem é calculada) e
   marca.
4. **Transporte & NF-e:** modalidade e valor do frete, placa, motorista,
   ANTT/lacres e previsão de entrega. **Vincular NF-e** (número e chave).
5. A **trilha de auditoria** registra cada evento do romaneio.

**Telas relacionadas.** VVND0200, VFIS0200, VEXP0110 (cargas), VPLC0200.

---

#### VBEN0100 — Beneficiamento — Remessas e Retorno Fiscal

**Para que serve.** Controlar o material que o **cliente** manda para a empresa
processar (industrialização por encomenda) e devolvê-lo na nota fiscal certa. O
material de terceiro tem controle próprio, separado do estoque da empresa.

**Fluxo.**
1. **Receber NF-e de remessa do cliente** (CFOP 5901): cliente proprietário,
   número da NF-e, emissão, recebimento, prazo de retorno, pedido de
   beneficiamento, valor e chave de acesso. Confira item a item (quantidade da
   nota × conferida; divergência com motivo). Uma remessa com problema entra
   **bloqueada** e não pode ir para a produção até ser regularizada.
2. **Lançar movimento:** consumo, sobra, sucata (exige destinação), ajuste (exige
   justificativa), com a ordem de fabricação. Você escolhe o **tipo** do
   movimento; o CFOP é aplicado pelo sistema.
3. **Faturar o beneficiamento:** uma nota com o **serviço** (CFOP 5124) e a
   **devolução do material** (5902) — sobra e sucata devolvidas saem em 5903.
   Informe o valor e o código do serviço e o que retorna. A nota nasce em
   rascunho; transmita pela VFIS0200.
4. **Liberar**, **Bloquear** (com motivo) ou **Encerrar** a remessa.

**Consultar.** Por cliente, NF-e, situação e prazo de retorno ("vencendo até").
A coluna **Falta** e o prazo dizem o que precisa voltar primeiro.

**Telas relacionadas.** VBEN0200, VFIS0200, VPRO0900.

---

#### VBEN0200 — Estoque de Terceiros — Material do Cliente

**Para que serve.** Ver o material do cliente que está na empresa, separado do
estoque próprio (os dois nunca se somam).

**Como usar.** Filtre por cliente proprietário e pelo código do item **como aparece
na nota do cliente** (é com ele que o retorno fiscal sai). A lista vem ordenada
pelo **prazo fiscal mais próximo** — o que precisa voltar primeiro — com saldo,
remessas e o item interno correspondente.

**Telas relacionadas.** VBEN0100, VEST0100.

---

#### VEXP0110 — Gestão de Cargas de Expedição

*Rotina de operações.*

**Para que serve.** Conduzir a carga até o despacho: montar (romaneios e notas) e
avançar o ciclo.

**Operações.** Consultar (situação, transportadora, período); cadastrar; abrir;
adicionar e remover romaneio; adicionar nota fiscal; **Liberar carga**, **Iniciar
carregamento**, **Concluir carregamento**, **Despachar** e **Cancelar**; vincular
caixa de despacho; **Monitor geral**, **Monitor de separação** e **Painel
logístico**.

**Telas relacionadas.** VPLC0200, VEXP0100, VEXP0120, VFIS0640.

---

#### VEXP0120 — Instruções e Caixas de Despacho

*Rotina de operações.*

**Para que serve.** As instruções de entrega por carga e cliente e as **caixas de
despacho** (posições físicas da expedição: código, descrição, almoxarifado e zona)
usadas na montagem das cargas.

---

#### VEST0400 — Consultas de Estoque por Almoxarifado

*Rotina de consulta.*

**Para que serve.** Os movimentos de um almoxarifado, o saldo pontual de um item
(com lote) e todos os saldos do almoxarifado. Para a consulta completa, use a
**VEST0100**.

---

## Importação

*Processos de importação e custo nacionalizado.*

#### VIMP0200 — Console de Processos de Importação

**Para que serve.** Montar o processo de importação e calcular o **custo
nacionalizado** de cada item (FOB + frete, seguro, impostos e despesas rateados).

**Passo a passo.**
1. **Capa:** empresa, fornecedor, referência (DI/DUIMP), incoterm, moeda, câmbio
   e a **base de rateio** das despesas (ex.: valor FOB ou peso).
2. **Itens:** item, quantidade, peso e FOB unitário.
3. **Despesas:** tipo (frete, seguro, II, armazenagem, despachante...), valor e se
   rateia.
4. **Recalcular landed:** a grade mostra o FOB unitário e o **custo nacionalizado
   unitário** de cada item.
5. Mude a situação do processo (aberto → nacionalizado, ou cancelado).

**Telas relacionadas.** VIMP0101, VIMP0300, VFIS0210 (NF de entrada de
importação).

---

#### VIMP0102 — Conhecimentos de Transporte (CT-e)

*Rotina de operações.*

**Para que serve.** Cadastrar, consultar e autorizar os CT-e ligados às entradas e
aos processos logísticos. Para emitir e consultar em formulário, use a
**VFIS0220**.

---

#### VIMP0101 — Status Logístico da Carga

**Para que serve.** Acompanhar e mudar a situação dos processos de importação:
**aberto** (em trânsito) → **nacionalizado**, ou **cancelado**. O cadastro e o
custeio ficam na VIMP0200.

---

#### VIMP0300 — Importação e Custo Nacionalizado

*Rotina de operações.*

**Para que serve.** As mesmas operações da VIMP0200 enviadas diretamente: consultar
por situação, cadastrar, abrir, **recalcular** e mudar a situação.

---

## Inspeção

*Qualidade: lote de inspeção, amostragem NBR 5426, CAPA/8D, metrologia, certificados, documentos e avaliação de fornecedores.*

> **Como a qualidade se organiza.** A inspeção de recebimento, de processo e final
> usa um só objeto, o **lote de inspeção** (VINS0300). A amostragem segue a NBR
> 5426 (VINS0110); a não conformidade é tratada por CAPA/8D (VINS0500); os
> instrumentos ficam na metrologia (VINS0600); o certificado ao cliente e os
> documentos controlados, nas VINS0700 e VINS0800. As telas antigas de ordem de
> inspeção (VINS0201, VINS0206, VINS0313, VINS0400) continuam funcionando, mas
> trabalham sobre os lotes de inspeção.

#### VINS0700 — Certificados de Qualidade

**Para que serve.** Emitir o certificado de qualidade para o cliente (no espírito do
certificado 3.1 da EN 10204): o que foi inspecionado no material vendido.

**Como usar.**
1. **Emitir certificado:** item, quantidade, lote/corrida, cliente e a NF de
   saída (o cliente da nota tem de ser o informado). Os lotes de inspeção vêm
   informados ou são achados pelo lote/corrida.
2. O certificado traz, por lote de inspeção, a decisão e, por característica, a
   especificação, mínimo, máximo e média medidos, não conformes e os instrumentos.
   Lote aceito por **concessão** aparece como tal.
3. **PDF** para enviar; **Cancelar certificado** (com motivo) quando errado.

**Regras.**
- Só emite com lote de inspeção **decidido e aproveitado**.
- A soma dos certificados sobre os mesmos lotes não pode passar da quantidade
  aprovada (certificados parciais são aceitos; o cancelado libera a quantidade).
- O conteúdo fica **congelado** na emissão. Para corrigir, cancele e emita outro.

**Telas relacionadas.** VINS0300, VFIS0200, VEST0100 (lote e corrida).

---

#### VINS0800 — Documentos da Qualidade

**Para que serve.** Controlar as revisões de instruções de trabalho, procedimentos,
formulários, planos de inspeção e especificações.

**Como usar.**
1. Cadastre o documento: código, título, tipo e, se for o caso, item e área.
2. Crie o **rascunho** da revisão: o que muda, texto e/ou arquivo (até 10 MB).
3. **Aprovar:** o rascunho vira **vigente** e a anterior fica **obsoleta**.

**Regras.**
- Há no máximo um rascunho e uma vigente por documento.
- **Quem elaborou não aprova** (outra pessoa precisa aprovar).
- Revisão aprovada não muda de conteúdo.
- O desenho de engenharia continua na VDES0100 / VENG0400.

---

#### VINS0600 — Metrologia

**Para que serve.** Os instrumentos de medição, as calibrações e o bloqueio de
medição com instrumento inválido.

**Como usar.**
1. **Instrumento:** código, descrição, **grupo** (o mesmo grupo usado no roteiro
   de inspeção — ex.: PAQUÍMETRO), faixa, resolução, **EMA** (erro máximo
   admissível) e frequência de calibração.
2. **Registrar calibração:** data, executor, laboratório, certificado (obrigatório
   em calibração externa), erro e incerteza.
   - Com erro e EMA, o sistema decide: aprovada se |erro| + incerteza ≤ EMA.
   - **Aprovada:** marca a próxima calibração e desbloqueia o instrumento.
   - **Reprovada:** **bloqueia** o instrumento e mostra o **impacto** — os lotes
     medidos com ele desde a última calibração aprovada.
3. **Lotes medidos com o instrumento:** informe a data inicial (ou deixe vazio
   para ver desde o início) e clique em **Consultar lotes**. A consulta mostra os
   lotes em que o instrumento foi usado, a qualquer momento, sem registrar
   calibração.
4. **Baixar** o instrumento que saiu de uso.

**Na inspeção.** O instrumento usado precisa estar ativo, com calibração em dia e
ser do grupo da característica. A exigência só vale quando a empresa já
cadastrou instrumentos daquele grupo.

---

#### VINS0500 — Não conformidades e CAPA/8D

**Para que serve.** Tratar a causa das não conformidades com ação corretiva ou
preventiva (CAPA), pelo método 8D ou simples.

**Abas.**
- **Não conformidades:** as NCs da empresa com o lote de inspeção, quantidade,
  severidade, disposição e a CAPA ligada (filtros: abertas, sem CAPA).
- **CAPAs:** abra uma CAPA (método, origem — NC, reclamação de cliente,
  fornecedor, auditoria ou interna —, título, prazo, fornecedor ou cliente) e
  conduza as etapas.
- **Minhas ações:** as ações pendentes e atrasadas de quem está usando.

**O que cada etapa exige para avançar (8D).**

| Etapa | Exige |
|---|---|
| D1 Equipe | líder e ao menos 2 pessoas |
| D2 Problema | o quê, onde, quando, quanto |
| D3 Contenção | a ação de contenção, ou por que não é necessária |
| D4 Causa raiz | 5 porquês (≥ 3 respostas) ou Ishikawa (≥ 1 causa), a causa raiz e o **ponto de escape** (por que o controle não detectou) |
| D5 / D6 | ações corretivas cadastradas e depois concluídas com evidência |
| D7 Prevenção | o que muda para não acontecer de novo e as ações preventivas concluídas |
| D8 Eficácia | encerramento |

**Encerramento.** Informe como a eficácia foi verificada e as lições aprendidas.
**Eficaz** encerra; **ineficaz** volta a CAPA para a causa raiz num ciclo novo
(as ações antigas ficam no histórico). Toda mudança fica no **histórico**.

**Regra.** A disposição do material fica na NC (o que fazer com as peças); a CAPA
diz por que elas saíram ruins.

---

#### VINS0300 — Lotes de Inspeção

**Para que serve.** A tela central da inspeção: o lote de inspeção de recebimento,
de processo e final, os resultados e a **decisão de uso** que libera o estoque.

**De onde vêm os lotes.**
- **Recebimento:** abertos sozinhos no recebimento do pedido de compra e na
  aprovação da NF de entrada, quando o item tem roteiro de inspeção (VINS0200). O
  material fica no **almoxarifado de inspeção**.
- **Processo:** abertos na criação da OF para cada etapa com plano de inspeção.
- **Manual, final ou devolução:** **Novo lote manual** (destino, origem, item,
  quantidade, almoxarifado de inspeção, fornecedor, lote/corrida).

O lote já vem com as características do plano e o **plano de amostragem** (VINS0110)
pela severidade corrente. Quando o *skip-lot* dispensa, o lote abre como
**pulado**.

**Passo a passo.**
1. **Abrir** o lote. Em **Resultados — unidades**, registre cada característica
   por unidade da amostra (1 a n). Para característica medida, a conformidade é
   decidida pelos limites do plano. *Aceitar tudo* / *Rejeitar tudo* preenchem
   rápido.
2. **Decisão de uso:** reparta a quantidade do lote entre **aceita**,
   **restrita**, **retrabalho**, **rejeitada** e **sucata**, cada parte com o
   destino; informe o **tratamento** e o motivo.

**Laudos do fornecedor.** O bloco lista os laudos anexados no vínculo item ×
fornecedor (VSUP0670): os do fornecedor do lote, ou os de todos os fornecedores do
item quando o lote não tem fornecedor. Com o lote aberto, **Vincular** liga o laudo
ao lote e **Desvincular** desfaz. O arquivo do laudo baixa pelo nome.

**Regras da decisão.**
- As partes têm de somar a quantidade do lote.
- Aproveitar qualquer parte exige a inspeção completa; rejeitar não.
- Aceitar tudo num lote recusado pela amostragem exige o tratamento **concessão**
  e motivo.
- Característica **crítica** reprovada recusa o lote mesmo dentro do Ac.
- A decisão move o estoque na hora (aceita → disponível; rejeitada → rejeição;
  sucata → baixada ou transferida), atualiza a severidade da amostragem e abre a
  **NC** quando há parte não aceita ou concessão.
- Com a inspeção do item **suspensa**, só é possível rejeitar ou devolver.

**Cancelar o lote.** Só sem estoque retido (ou depois do estorno da entrada).

**Efeitos.** O material no almoxarifado de inspeção só sai pela decisão; o MRP não
conta o rejeitado; a entrega final da OF espera os lotes da ordem decididos; o IQF
do fornecedor lê os lotes decididos.

---

#### VINS0110 — Amostragem NBR 5426

**Para que serve.** Os planos de amostragem por atributos da NBR 5426 (ISO 2859-1),
os procedimentos da empresa e o controle da severidade.

**Aba Calculadora.** Informe o tamanho do lote (unidades, mínimo 2), o nível (S1 a
S4, I, II, III), o NQA % e a severidade: a tela devolve a letra, o tamanho da
amostra (n), o número de aceitação (Ac) e de rejeição (Re) da normal, da
apertada e da atenuada.

**Aba Procedimentos.**
- Tipos: **Norma** (nível, NQA, permite atenuada), **Fixo** (n, Ac, Re — serve
  para lote em kg ou metro) e **100%** (lote inteiro).
- **Skip-lot** (regra da empresa): depois de N lotes aceitos seguidos,
  inspecionar 1 a cada K. Uma recusa volta a inspecionar todo lote; nunca vale em
  apertada.
- **Severidade corrente** por unidade de controle (item × fornecedor no
  recebimento, item × operação no processo), com pontuação, recusas e aceitos
  seguidos, e o **histórico de trocas**.

**Troca de severidade (cláusula 9).** Normal → apertada com 2 recusas em até 5
lotes; apertada → normal com 5 aceitos seguidos; normal → atenuada com
pontuação ≥ 30 (se o procedimento permitir); atenuada → normal com 1 recusa;
apertada → **suspensa** com 5 recusas acumuladas.

**Simular o próximo lote.** Na aba de severidade, **Simular** na linha da unidade
de controle pede a quantidade do lote. A tela mostra o plano pela severidade
corrente (n, Ac, Re), se o *skip-lot* dispensaria o lote e se a inspeção está
suspensa. Nada é registrado.

**Liberar a inspeção suspensa.** Exige a permissão de aprovar e a ação que
justifica; a inspeção recomeça em apertada.

---

#### VINS0106 — Cadastro de Ocorrências

**Para que serve.** Registrar uma ocorrência operacional de qualidade ou de
recebimento: tipo, situação, fornecedor, item, quantidade e referência.

**Telas relacionadas.** VINS0400, VSUP0640.

---

#### VINS0400 — Consulta de Ocorrências / Ordens de Inspeção

**Para que serve.** Consultar (só leitura) as ocorrências e as ordens de inspeção,
com tipo, fornecedor, item, referência, situação, quantidade e origem.

---

#### VINS0313 — Consulta de Inspeções de Recebimento

**Para que serve.** Consultar (só leitura) as inspeções de recebimento: item,
máscara, quantidade, origem, fornecedor, situação e data. Para trabalhar o lote,
use a **VINS0300**.

---

#### VINS0200 — Cadastro do Roteiro de Inspeção

**Para que serve.** Definir o que inspecionar no recebimento de um item (ou de uma
classificação de itens). É o roteiro que faz o recebimento abrir o lote de
inspeção.

**Passo a passo.**
1. **Capa:** empresa, base (**item** ou **classificação**), item ou
   classificação, máscara, **almoxarifado de inspeção** (obrigatório), manuseio,
   armazenagem, tipos de roteiro, inspeção e mercado e vigência.
2. **+ etapa:** inspeção, espécie (medida ou atributo), apontamento,
   **instrumento** (grupo), como amostrar, amostra, aceita até, rejeita a partir
   de, unidade, nominal, mínimo, máximo, atributos a conferir, norma e referência.
   Ordene com ↑ ↓.

**Regras.** Pelo menos uma etapa. A tela recusa plano incoerente (mínimo maior que
máximo, aceita maior que rejeita) e mostra o plano de amostragem em português,
como o inspetor lê.

**Telas relacionadas.** VINS0300, VINS0110, VINS0600.

---

#### VINS0201 — Manutenção das Ordens de Inspeções

**Para que serve.** Gerar uma ordem de inspeção de recebimento à mão (origem, item,
máscara, almoxarifado, quantidade, fornecedor, lote) e registrar a análise
(conforme, rejeitada, retrabalho, restrita, tratamento e almoxarifados de destino
e de rejeição). A ordem é um lote de inspeção: a análise **distribui o lote
inteiro e move o estoque**.

**Dica.** Use a **VINS0300**, que mostra os resultados por unidade e a decisão de
uso completa.

---

#### VINS0206 — Tratamento das Ordens de Inspeção

*Rotina de operações.*

**Para que serve.** Analisar a ordem de inspeção (quantidades conforme, rejeitada,
retrabalho, restrita e tratamento) e destinar o estoque. Funciona sobre o lote de
inspeção; a análise não pode ser feita duas vezes. Em formulário: **VINS0300**.

---

#### VAVF0101 — Cadastro de Parâmetros de Avaliação de Fornecedores

**Para que serve.** Os parâmetros da avaliação de fornecedores (chave, valor, tipo e
descrição) usados no cálculo do IQF.

---

#### VAVF0204 — Envio de IQF aos Fornecedores

**Para que serve.** Calcular o IQF (Índice de Qualificação de Fornecedores) do
período e registrar o resultado.

**Como usar.** Fornecedor e período; informe as notas manuais de **comercial** e
**atendimento** (0 a 100). O sistema calcula **qualidade** e **entrega** pelo
histórico real (lotes de inspeção e entregas) e o **IQF final** = qualidade 40% +
entrega 30% + comercial 20% + atendimento 10%.

**Telas relacionadas.** VAVF0300, VAVF0203.

---

#### VSUP0600 — Inspeção de Recebimento

*Rotina de operações.*

**Para que serve.** O ciclo de inspeção de recebimento pelas rotas antigas:
cadastrar e abrir roteiro, abrir ordem de inspeção, registrar resultados, analisar
e destinar o estoque. Tudo isso agora grava lotes de inspeção — para o dia a dia,
use **VINS0200** (roteiro) e **VINS0300** (lote).

---

#### VAVF0300 — Scorecard e IQF do Fornecedor

*Rotina de operações.*

**Para que serve.** Consultar o histórico de avaliações do fornecedor, **calcular**
uma avaliação do período (com as notas comercial e de atendimento, gravando ou
não) e registrar uma avaliação manual.

---

#### VAVF0203 — Homologação de Fornecedores

*Rotina de operações.*

**Para que serve.** Registrar a homologação do fornecedor (período, faixas mínimas
para homologado e condicional, situação, categoria) e **gerar os itens do
fornecedor** pelo histórico de compras.

---

# Administrativo & Financeiro

## Financeiro

*Contas bancárias, plano de contas, contas a pagar e a receber, fluxo de caixa, adiantamentos e conciliação.*

#### VFIN0100 — Contas Bancárias

**Para que serve.** Cadastrar as contas bancárias da empresa (de onde saem os
pagamentos e onde entram os recebimentos).

**Como usar.** Banco, agência, conta, dígito, descrição, titular, saldo inicial e,
se houver, tipo e chave PIX. Banco, conta e descrição são obrigatórios.

**Importante.** O cadastro guarda só o saldo **inicial**; o saldo movimentado está
na VFIN0300.

---

#### VFIN0110 — Condições de Pagamento

**Para que serve.** Cadastro rápido de condição de pagamento por nome e dias das
parcelas (ex.: "30/60/90" → 30, 60, 90).

**Dica.** A condição completa — percentual por parcela, entrada, análise de
crédito, se gera receita — é mantida na **VCLI0520**, aba Condição de Pagamento.

---

#### VFIN0120 — Plano de Contas

**Para que serve.** O plano de contas da empresa: código, descrição, conta pai, tipo
(sintética ou analítica), natureza e situação.

**Como usar.** **+ Nova Conta** ou clique numa conta para alterar. A lista vem em
**ordem natural** do código (2.1.9 antes de 2.1.10) e mostra o nível.

**Exige centro de custo.** Na alteração da conta, marque *Exige centro de custo*:
o título a pagar (no rateio ou sem rateio) e o item da nota de entrada nesta conta
não são aceitos sem centro de custo.

**Telas relacionadas.** VFIN0200 (título por plano), VCTB0200, VFIN0500 (DRE),
VCTB0102 (centros de custo).

---

#### VFIN0130 — Centros de Custo

**Agora na VCTB0102.** O cadastro de centro de custo é um só: o código antigo abre a
VCTB0102. Os centros que estavam aqui foram levados para lá com o mesmo código
(CC-FAB-CORTE…) e a hierarquia montada pelo prefixo.

---

#### VFIN0200 — Contas a Pagar

**Para que serve.** A carteira de contas a pagar: lançar, aprovar, pagar,
acompanhar e analisar.

**Lançar um título.** *Dados do título:* número e tipo do documento, fornecedor,
nota fiscal de entrada e pedido de compra (por busca), conta do plano, centro de
custo, forma de pagamento, emissão, vencimento, valor bruto, desconto, valor
líquido e parcela (n de N).
- **Rateio por plano de contas:** ligado, o título vai para vários planos (ex.:
  matéria-prima e EPI da mesma nota). A soma tem de fechar com o valor bruto.

**Aprovar e pagar.**
1. O título nasce **aguardando aprovação**. Aprove (ou rejeite, com motivo) na
   carteira.
2. Só depois de aprovado aparece o botão **Pagar**: conta bancária de onde sai,
   valor pago, desconto obtido, data e observação. Valor pago + desconto não pode
   passar do saldo do título (pagamento parcial é aceito).

**Filtrar a carteira.** Fornecedor, situação, situação da aprovação, período (por
emissão ou vencimento), documento, faixa de valor, conta do plano, centro de
custo e *só vencidos*. **Composição por idade** mostra a carteira inteira por
faixa de atraso. **Contas a pagar por plano de contas** soma os títulos pela parte
de cada plano (o rateio entra proporcional).

**Regras.**
- O vencimento não pode ser anterior à emissão; o desconto não pode passar do
  valor bruto; a parcela não pode passar do total.
- Para o título que veio da **NF de entrada**, cancele a nota (VFIS0210): ela
  estorna o estoque e cancela os títulos juntos. Cancelar o pedido de compra
  cancela os títulos ligados ao pedido (como o adiantamento), se nenhum foi pago.

**Telas relacionadas.** VFIS0210, VPDC0200, VFIN0600 (adiantamentos), VFIN0300.

---

#### VFIN0210 — Contas a Receber

**Para que serve.** A carteira de contas a receber: lançar, baixar, acompanhar e
analisar.

**Lançar um título.** Número do documento, cliente, **nota fiscal de saída** (busca
por número e série), pedido de venda, emissão, vencimento, valor bruto,
desconto, forma de recebimento, valor líquido e parcela.

**Baixar.** Conta bancária que recebeu, valor recebido, desconto concedido, data e
observação. Valor + desconto não pode passar do saldo.

**Filtrar.** Cliente, situação, período (emissão ou vencimento), documento, faixa
de valor e *só vencidos*. O vencimento aparece com os **dias de atraso** ao lado;
a **composição por idade** resume a carteira.

**Regras.**
- Os títulos da NF de saída nascem sozinhos na autorização da nota (VFIS0200).
- Para o título que veio da NF de saída, cancele a nota (VFIS0200): ela cancela os
  títulos juntos.
- Cancelar o pedido de venda cancela os títulos ligados ao pedido (sinal,
  adiantamento), se nenhum teve recebimento.

**Telas relacionadas.** VFIS0200, VVND0200, VFIN0600, VFIN0620.

---

#### VFIN0300 — Fluxo de Caixa e Saldos

**Para que serve.** O que entrou e saiu, o que vai vencer e quanto há em cada conta.

**Visões.**
- **Realizado:** entradas e saídas do período, com gráfico (entradas, saídas e
  saldo acumulado) e os lançamentos (data, tipo, histórico, conta, conciliado,
  valor).
- **Projetado:** os títulos previstos a partir de uma data, com totais.
- **Saldo por conta bancária:** saldo atual de cada conta.

**Recortes.** Conta bancária, tipo de movimento e busca no histórico.

**Telas relacionadas.** VFIN0100, VFIN0620, VFIN0200, VFIN0210.

---

#### VFIN0400 — Apuração de Impostos

**Para que serve.** Apurar os impostos de uma competência: débitos (saídas),
créditos (entradas) e o saldo a recolher de cada imposto.

**Como usar.** Informe a competência (AAAA-MM) e apure (ou carregue uma apuração já
feita). Uma linha por imposto.

**Telas relacionadas.** VFIS0540, VFIS0340 (Simples), VFIN0500.

---

#### VFIN0500 — Relatórios Fiscais e Financeiros

**Para que serve.** Os relatórios gerenciais e fiscais, num só lugar.

| Relatório | O que mostra |
|---|---|
| R01 / R02 | Livro de entradas / de saídas |
| R03 / R04 | Impostos das saídas / das entradas |
| R05 | DRE |
| R09 / R10 | Aging detalhado a receber / a pagar |
| R11 / R12 | Extrato por fornecedor / por cliente |
| R13 / R14 | Produtos vendidos / produzidos |
| R15 / R16 | Histórico de custos / ficha técnica com custo |
| R17 / R18 | Curva ABC de clientes / de produtos |
| R19 | Compras no período |

**Como usar.** Escolha o relatório, o período (e o cliente, fornecedor ou item
quando o relatório pede) e gere. Exporte em Excel ou PDF.

---

#### VFIN0600 — Adiantamentos de Clientes e Fornecedores

**Para que serve.** Registrar dinheiro que mudou de mãos **antes** de existir o
título — pagamento antecipado a fornecedor ou recebimento antecipado de cliente —
e usar esse saldo depois para abater títulos.

**Passo a passo.**
1. **Novo adiantamento:** tipo (pago a fornecedor ou recebido de cliente),
   parceiro, conta bancária, valor, data, documento e descrição. O caixa se move
   no registro.
2. **Saldos em aberto** mostra o que sobra de cada adiantamento.
3. **Aplicar:** escolha o título a abater (a tela oferece **só** os títulos do mesmo
   parceiro e do lado certo) e o valor.

**Regras.** Adiantamento pago a fornecedor só abate conta a pagar; recebido de
cliente só abate conta a receber. O valor aplicado não passa do saldo do
adiantamento nem do saldo do título.

---

#### VFIN0610 — Remessa Bancária CNAB 240

*Rotina de operações (administrador).*

**Para que serve.** Gerar o arquivo de remessa CNAB 240 (com a configuração do banco
e os títulos) e baixá-lo para enviar ao banco.

---

#### VFIN0620 — Conciliação Bancária por OFX

**Para que serve.** Importar o extrato da conta (OFX) e casar cada lançamento com o
pagamento ou recebimento já registrado no sistema.

**Passo a passo.**
1. Escolha a **conta bancária** do extrato.
2. Escolha o **arquivo OFX** (até 8 MB). A tela confere o arquivo na hora — pela
   estrutura, não pela extensão — e avisa se a conta do arquivo não é a conta
   escolhida.
3. **Importar e conciliar.** O resultado mostra o que conciliou e **o que a
   importação deixou de fora**, com o motivo.

**Telas relacionadas.** VFIN0300, VFIN0100.

---

## Fiscal

*Configuração fiscal, NF-e de saída e de entrada, regras de ICMS/IPI, simulador, apurações, SPED e reforma tributária.*

> **Como o sistema decide o imposto da nota de venda.** Para cada linha, o motor
> fiscal procura a **regra de ICMS/IPI** (VFIS0320) que mais se encaixa — item, NCM
> completo ou capítulo do NCM; cliente, segmento ou tipo de imposto; finalidade da
> compra (revenda, industrialização, uso e consumo); contribuinte ou não. A regra
> define alíquota, CST, redução de base, diferimento, ST e benefício fiscal. Sem
> regra, vale o ICMS interno da configuração (VFIS0100), e a prévia avisa — ou
> impede, se a empresa ligou *Exigir regra de ICMS/IPI*. Confira qualquer cenário
> no **Simulador de Tributação (VFIS0325)** antes de faturar.

#### VFIS0100 — Configuração Fiscal

**Para que serve.** Os parâmetros fiscais da empresa emitente. A identificação
(CNPJ, razão social, IE, regime, endereço) aparece no alto só para leitura e é
alterada na **VEMP0100** (botão *Alterar na VEMP0100*).

**Blocos.**
- **Empresa:** o resumo da identificação mantida na VEMP0100.
- **Identidade visual:** logo (PNG ou JPEG) e cor da marca (#RRGGBB) usadas nos
  documentos.
- **Focus NF-e:** em **homologação**, o token de homologação (não é mostrado depois
  de gravado; para trocar, digite um novo). A passagem para **produção**, com o
  token de produção, é feita pela Venture ERP; em produção o bloco só mostra que o
  token está configurado — para trocá-lo (certificado novo, nova conta na Focus),
  fale com a Venture.
- **Tributação por regra:** *Exigir regra de ICMS/IPI em toda nota de venda* —
  ligado, a nota com item sem regra na VFIS0320 fica impedida na prévia;
  desligado, o item sem regra usa o ICMS interno e a prévia avisa. No Simples,
  também o **crédito do Simples %**.
- **Tributação e vencimentos:** ICMS interno, diferimento de ICMS e o **cBenef do
  diferimento** (no PR, por exemplo, o código do diferimento parcial), juros ao
  mês, multa de atraso e os dias de vencimento de ICMS, IPI e PIS/COFINS. Os
  percentuais são digitados em % (19,5 = 19,5%).

**Telas relacionadas.** VEMP0100 (identificação), VFIS0320, VFIS0325.

---

#### VFIS0110 — Tabelas Tributárias

**Para que serve.** As três tabelas que alimentam o cálculo de toda nota.

**Abas.**
- **Tributação por NCM:** NCM (8 dígitos), descrição, alíquotas de IPI, PIS e
  COFINS e os CSTs. Abrir um NCM e salvar substitui a tributação dele.
- **ICMS dentro do estado:** por UF, a alíquota interna de ICMS e a do FCP.
- **ICMS entre estados:** por par origem → destino, a alíquota interestadual
  (origem e destino iguais é operação interna — use a aba anterior).

As alíquotas aparecem e são digitadas em **%**.

**Telas relacionadas.** VFIS0350, VFIS0320, VFIS0120.

---

#### VFIS0200 — NF-e de Saída

**Para que serve.** Emitir, transmitir e acompanhar a NF-e de saída: venda,
devolução, remessa, beneficiamento.

**Criar a nota.**
- **Faturar pedido de venda:** escolha o pedido; a tela mostra cliente, endereço,
  representante, condição de pagamento e as linhas com o que falta faturar.
  Fature tudo ou parte (desmarque linhas ou reduza quantidades); o resto continua
  pendente. Cada pedido mostra as notas já emitidas para ele.
- **+ Nova NF-e:** cabeçalho (número, série, CFOP, emissão, saída, natureza da
  operação, **finalidade da compra**, **tipo de nota**), destinatário (pessoa,
  CNPJ/CPF, razão social, IE, UF, endereço — ou o cliente do cadastro), itens
  (item, NCM, CFOP, origem, quantidade, preço), frete, seguro, desconto, carga de
  expedição e informações complementares. Substitui cupom fiscal quando for o
  caso.

**Prévia (conferência).** Antes de transmitir, **Prévia** mostra o que vai para a
SEFAZ: emitente e destinatário, itens com ICMS, IPI, ST/DIFAL, PIS/COFINS e IBS/CBS
(com o cClassTrib, ajustável por linha), totais, pagamento e as **pendências** —
cada uma com nível (*impede* ou *atenção*) e **como resolver**. Exemplos: item sem
regra quando a empresa exige; CST com benefício sem o cBenef (PR, RS, RJ, SC, GO e
DF exigem).

**Números de série.** Linha de item que controla série mostra, na prévia, as
séries em estoque para marcar — uma por unidade. Sem elas a nota não sai. As
séries vão no infAdProd do item e, autorizada a nota, passam ao cliente na Base
Instalada (VATC0100).

**Autorizar.** Transmite de verdade. Com pendência que impede, a emissão nem sai;
com pendência de atenção, você confirma sabendo o que aceita. Na autorização, o
sistema baixa o estoque, gera os títulos a receber e marca o pedido como faturado.

**Depois de transmitida.**
- **Status:** consulta a SEFAZ. Rejeitada: corrija pelo motivo (veja a prévia) e
  **Reenviar**.
- **Efeitos:** se algum efeito da autorização (títulos, estoque, pedido) falhou,
  aparece aqui com as tentativas; **Reprocessar agora** refaz.
- **Nova CC-e / Ver CC-e:** carta de correção (texto com pelo menos 15
  caracteres).
- **Cancelar:** dentro do prazo da SEFAZ, com justificativa de pelo menos 15
  caracteres. O cancelamento cancela os títulos a receber da nota, devolve o
  estoque, estorna a contabilização e devolve ao pedido o saldo a faturar (se
  algum desses efeitos falhar, ele aparece em **Efeitos** para reprocessar).

**Nota autorizada não se corrige** — só cancelamento ou carta de correção.

**Telas relacionadas.** VVND0200, VFIS0320, VFIS0325, VFIN0210, VEXP0100.

---

#### VFIS0210 — NF-e de Entrada

**Para que serve.** Dar entrada nas notas dos fornecedores: importar, conciliar com
o cadastro, distribuir as parcelas por plano de contas e aprovar — o que gera o
contas a pagar, a entrada no estoque, a baixa do pedido e a contabilização.

**Formas de trazer a nota.**
- **Importar o XML** (um ou vários de uma vez; o DANFE em PDF não serve).
- **Importar pela chave** (44 dígitos) — busca na SEFAZ via Focus.
- **Notas recebidas na SEFAZ:** as notas emitidas contra o CNPJ da empresa chegam
  antes da mercadoria. **Manifeste** (a confirmação encerra o prazo; o
  desconhecimento protege contra nota fria) e importe.
- **Lançamento manual** (nota sem XML, modelo 1/1A, serviço avulso).

**Passo a passo.**
1. **Itens e conciliação:** cada produto da nota é ligado ao item do cadastro.
   O vínculo produto × fornecedor concilia sozinho; os demais vêm com
   **sugestões** (descrição parecida só sugere — nunca liga sozinha). Também é
   possível cadastrar o item novo com os dados da nota. Escolha a **operação de
   entrada** (padrão dos itens), o almoxarifado e o **pedido de compra** (e a
   linha) que a nota atende.
2. **Plano de contas** de cada item (sugerido pelo último uso ou pela conta do
   fornecedor) e o centro de custo.
3. **Parcelas × plano de contas:** as duplicatas do XML (sem duplicata, uma à
   vista). Cada parcela é distribuída pelos planos na proporção dos itens; dá para
   mudar (ex.: 1ª parcela toda EPI). **Gerar parcelas iguais**, **Distribuir
   proporcionalmente** e **Fechar** (a última conta leva os centavos).
4. **Retenções na fonte**, quando houver (viram títulos a recolher).
5. **Conferência:** as divergências contra o pedido (preço, quantidade, imposto)
   com o esperado e o que veio na nota.
6. **Aprovar:** só com tudo conciliado e classificado, parcelas fechando com o
   valor a pagar e nenhuma divergência que bloqueie. Gera um título por parcela,
   a entrada no estoque, a baixa do pedido e a contabilização. O material de item
   com roteiro de inspeção vai para o almoxarifado de inspeção (VINS0300).

**Cancelar a NF.** Com motivo (pelo menos 10 caracteres): estorna estoque e
cancela os títulos.

**Devolver ao fornecedor.** Na nota aprovada, informe o que devolver; nasce a NF-e
de devolução (CFOP de devolução, nota original referenciada) em rascunho.
Autorizada, a mercadoria sai pelo custo médio, o valor abate os títulos em aberto
e o que sobrar vira crédito a receber do fornecedor.

**Frete sobre compras.** O CT-e da transportadora (XML ou à mão) é rateado entre os
itens das notas transportadas: o que ainda está em estoque vai ao custo, o já
consumido vai para despesa, e nasce o título da transportadora.

**Telas relacionadas.** VPDC0200, VFIS0360, VFIN0200, VINS0300, VSUP0130.

---

#### VFIS0220 — CT-e (Conhecimento de Transporte)

**Para que serve.** Registrar e emitir CT-e: número, série, CFOP, datas, emitente
(transportadora), tipo de rateio, frete, seguro, outros, ICMS e a NF-e de entrada
vinculada.

**Emitir na SEFAZ.** Além do registro, preencha os **dados de emissão**: natureza,
finalidade, tomador, RNTRC, município e UF de início e de fim, produto
predominante, valor da carga, remetente e destinatário. Sem o trajeto e as partes,
o CT-e fica só como registro local (para apropriar o frete).

**Telas relacionadas.** VFIS0210 (frete sobre compras), VIMP0102.

---

#### VFIS0300 — CFOPs e Naturezas de Operação

**Para que serve.** A tabela de CFOP: a **tabela oficial** do Portal Nacional da NF-e
(619 códigos, com título, nota explicativa e vigência) mais o que a empresa ajusta
em cada código: utilização, indicador de operação, tipo de utilização, DIFAL e
doação.

**Como usar.** **Buscar** por código (5101, ou só 51) ou parte da descrição; filtre
**Entradas (1, 2, 3)** ou **Saídas (5, 6, 7)**; *Mostrar inativos*. **Editar** mostra
a vigência, os indicadores oficiais (Devolução, Retorno, Remessa…) e a nota
explicativa. Inativar um CFOP faz a nota que o usar ficar impedida.

**Na nota.** A prévia e a transmissão impedem CFOP fora da tabela, inativo, fora da
vigência, não permitido em NF-e e CFOP de **devolução** sem a nota referenciada.
No faturamento do pedido, o item comprado (de revenda) sai com o CFOP de revenda
(5102/6102/6108) mesmo que a nota tenha sido gerada com o de produção.

---

#### VFIS0310 — Dispositivos Legais

**Para que serve.** O cadastro dos dispositivos legais (base legal de isenção,
redução, diferimento, ST) por tipo e descrição. As regras de ICMS/IPI (VFIS0320)
apontam para eles, e o texto vai para as informações complementares da nota.

---

#### VFIS0320 — Parâmetros ICMS/IPI

**Para que serve.** As **regras de tributação por cenário**: para que produto, cliente
e operação vale qual ICMS e IPI. É o que o motor fiscal usa em cada linha da nota.
(Desde esta versão também concentra as regras que ficavam na antiga VFIS0330 —
redução e substituição de ICMS —, marcadas com o selo "da VFIS0330".)

**Abas.**
1. **Identificação** — *a quem a regra se aplica*: UF (destino na saída, origem na
   entrada), **NCM** ou **item** (nunca os dois), máscara do item, tipo de
   operação (saída, entrada, ambas), cliente, **fornecedor**, estabelecimento do
   cliente, tipo de NF de saída e de entrada, **finalidade da compra** e
   descrição.
2. **ICMS** — % contribuinte e não contribuinte, CST de cada um (e de devolução),
   CSOSN, situação B, dispositivos legais, **% de redução** (e sobre o que incide),
   **% de diferimento**, **código do benefício** (cBenef/RBC) e acréscimos.
3. **Substituição e DIFAL** — MVA, % ST, % ST uso e consumo, redução da ST, ICMS
   interno, modalidade da base, alíquota de destino, FCP-ST, DIFAL e os
   dispositivos.
4. **IPI** — tratamento, % de redução, CST de saída e de entrada.
5. **Regimes especiais** — Simples (anexo), % ICMS e % ST para as origens 1, 2, 3 e
   8 (importados, Resolução do Senado 13/2012), FCI e Zona Franca.

**Qual regra vale (da mais específica para a mais geral).** Item > NCM completo >
capítulo do NCM; tipo de nota; cliente > segmento > tipo de imposto > geral;
finalidade; Simples; preferencial.

**Regras do cadastro.**
- Os percentuais vão em %, com até 4 casas.
- Regra restrita a **fornecedor**, estabelecimento ou máscara vale só na
  **entrada**; a NF de venda não a usa.
- Nos estados que exigem cBenef (PR, RS, RJ, SC, GO, DF), informe o código para
  CST com benefício (20, 40, 41, 50, 51, 90...).

**Telas relacionadas.** VFIS0325 (simular), VFIS0100, VFIS0310, VFIS0200.

---

#### VFIS0325 — Simulador de Tributação

**Para que serve.** Calcular os impostos de uma venda **exatamente como a NF-e vai
calcular — sem gravar nada**. É onde o contador confere a parametrização de cada
cenário antes de faturar.

**Como usar.**
1. **Venda:** cliente (ou só a UF de destino), IE do destinatário, finalidade da
   compra e tipo de nota.
2. **Itens:** item ou NCM, origem (0 a 8), quantidade e valor unitário.
3. Simule. Para cada linha: a **regra que valeu** (e por quê), CST/CSOSN, base e
   ICMS, diferido, ICMS-ST, IPI, PIS, COFINS e DIFAL + FCP.

Se a venda não puder ser transmitida (ex.: falta regra com a exigência ligada), a
tela mostra as pendências.

---

#### VFIS0340 — Apuração do Simples Nacional

**Para que serve.** Registrar a apuração mensal do Simples: período, anexo, receitas
interna e externa, folha, receita bruta 12 meses, alíquota nominal e efetiva,
alíquota efetiva de ICMS, parcela a deduzir, valor recolhido e observação.

---

#### VFIS0345 — CIAP — Crédito do ICMS do Ativo

**Para que serve.** O ICMS do bem do ativo imobilizado não é creditado de uma vez na
nota: entra no CIAP e é apropriado em parcelas mensais (48), cada uma multiplicada
pela participação das saídas tributadas e de exportação no total de saídas do mês.
A EFD leva o Bloco G e o crédito no E111 da apuração do ICMS.

**Aba Apuração do mês.** Escolha o ano e o mês: a tela mostra a prévia — saldo
inicial, soma das parcelas, saídas, índice e o **ICMS a apropriar** — e os
movimentos de cada bem (imobilização, saldo inicial, fim das parcelas, baixa). As
saídas vêm das NF-e autorizadas do mês; digite outras quando a legislação da UF
excluir operações do cálculo. **Apurar e gravar** grava o mês (refaz enquanto não
for fechado); **Fechar mês** trava; só o administrador reabre.

**Aba Bens.** O item da nota de entrada aprovada com CFOP de ativo (1551, 2551,
1406…) e ICMS entra sozinho. O bem anterior ao sistema entra em **+ Bem manual**
(código do controle patrimonial, descrição, entrada e o ICMS). Informe a **conta
contábil do ativo** (a EFD exige) e o centro de custo de uso. **Baixar**: alienação,
perecimento ou outras saídas — o bem deixa de apropriar o restante. Nota cancelada
tira o bem (ou o baixa, se já apropriou).

**Aba Parâmetros.** O **código de ajuste** do crédito no E111 (outros créditos da
tabela 5.1.1 da UF — confira na VFIS0510 ou com o contador), a conta do ativo padrão
e o número de parcelas (48).

**Telas relacionadas.** VFIS0210 (nota de entrada), VFIS0360 (tipo de operação),
VFIS0510 (códigos de ajuste), VCTB0200 (plano contábil).

---

#### VFIS0350 — Classificações Fiscais

**Para que serve.** As classificações fiscais (NCM com os padrões) que os itens
herdam.

**Blocos.**
- **Identificação:** descrição, NCM, CEST, Ex tarifário e vigência.
- **Padrões herdados pelos itens:** origem padrão e ICMS padrão %.
- **Tributos:** IPI (UM, alíquota, indicador, CSTs), PIS/COFINS, ST, desconto
  ZF, uso e consumo, retenção, redução, majoração, modalidades de base,
  **cClassTrib (IBS/CBS)** e a observação fiscal (infAdFisco).
- **Idiomas** e **Atributos de exportação**.

**Telas relacionadas.** VENT0200 (aba Contábil), VFIS0110, VFIS0670.

---

#### VFIS0360 — Tipos de Operação de Entrada

**Para que serve.** O comportamento da operação na nota de entrada (equivalente à
TES): natureza (CFOP de entrada), tipo de nota, grupo de estado, tipo de
fornecedor, classificação e **o que a nota faz** (gera financeiro, estoque,
crédito...).

**Regras.**
- A **natureza** é um CFOP de entrada da tabela oficial (VFIS0300); a tela mostra o
  título. Na nota, o 1º dígito acompanha a UF do fornecedor.
- Natureza de **uso e consumo** (x556, x407) não credita ICMS nem IPI; de **ativo
  imobilizado** (x551, x406) não credita IPI, e o ICMS é apropriado em parcelas
  (CIAP, VFIS0345), fora da nota. A tela desmarca e trava esses créditos.
- Com **grupo de estado**, a operação vale só para fornecedor das UFs do grupo.
- **Sem tipo de operação**, a nota usa a finalidade da compra (da linha do pedido de
  compra ou do tipo de uso do item): compra para industrialização (1101/2101),
  uso e consumo (1556/2556) ou ativo (1551/2551). Para **revenda**, cadastre aqui
  uma operação com natureza 1102.

**Abas.** *Tipos de Operação* e *Grupos de Estado* (grupos de UFs; teste se uma UF
é válida para o tipo).

**Telas relacionadas.** VFIS0210, VFIS0300.

---

#### VFIS0500 — Motivos de Transferência DAPI

**Para que serve.** Os motivos de transferência da DAPI: código, motivo, UF de
destino e vigência.

---

#### VFIS0510 — Códigos de Ajuste de Apuração ICMS (5.1.1)

**Para que serve.** Os códigos de ajuste da apuração do ICMS (tabela 5.1.1 do SPED):
código, UF, vigência e descrição.

---

#### VFIS0520 — Códigos de Ajuste ICMS (5.2/5.3/5.6/5.7)

**Para que serve.** Os códigos de ajuste de documento das tabelas 5.2, 5.3, 5.6 e
5.7 do SPED: código, UF, tabela, vigência e descrição.

---

#### VFIS0530 — Linhas de Apuração de ICMS

**Para que serve.** As linhas da apuração de ICMS: código, descrição, tipo, se aceita
lançamentos e natureza.

---

#### VFIS0540 — Lançamentos Resumo de ICMS

**Para que serve.** Os lançamentos de resumo de ICMS por período, UF e CFOP (base e
valor), as notas de cada lançamento e os registros adicionais (C197 / processos).

---

#### VFIS0550 — Restituição / Ressarcimento de ICMS ST

**Para que serve.** Os pedidos de restituição ou ressarcimento de ICMS-ST: documento
de origem (empresa, período, tipo, UF, modelo, número, emitente, item, CFOP, CST) e
os valores (base e alíquota da ST, valor da ST, base e valor da restituição).
Liste por período (AAAA-MM).

---

#### VFIS0560 — Notas Especiais de Ajuste

**Para que serve.** Notas especiais de ajuste do ICMS: finalidade, período, emissão,
CFOP, linha da apuração, código de ajuste, totais e itens (com base, % e valor do
ICMS e CST). *Gera resumo automático* lança no resumo de ICMS. A nota nasce em
rascunho.

---

#### VNFS0100 — NFS-e (Nota Fiscal de Serviço)

**Para que serve.** Emitir a nota fiscal de serviço.

**Como usar.** **RPS:** número, série, emissão, optante do Simples e município do
prestador. **Tomador:** CNPJ/CPF, razão social e endereço. **Serviço:** item da
lista de serviço, código de tributação do município, discriminação, valor,
deduções, **alíquota do ISS** (em %) e ISS retido. A tela mostra o
ISS e o líquido. Depois **Autorizar**; **Cancelar** exige justificativa de 15
caracteres.

---

#### VFIS0620 — Manifestação e Inutilização de NF-e

*Rotina de operações.*

**Para que serve.** **Manifestar** uma NF-e recebida (ciência, confirmação,
desconhecimento ou operação não realizada) e **inutilizar** uma faixa de numeração
própria não usada (série, número inicial e final e justificativa).

**Dica.** A manifestação também é feita na VFIS0210, em *Notas recebidas na SEFAZ*.

---

#### VFIS0630 — Tabela IBPT

*Rotina de operações.*

**Para que serve.** Importar o arquivo oficial do IBPT (CSV por UF — administrador) e
consultar a carga tributária aproximada de um NCM (a que vai impressa na nota de
consumidor).

---

#### VFIS0640 — Faturamento de Carga e DANFE

*Rotina de operações.*

**Para que serve.** Criar a NF-e de saída a partir de uma carga e consultar o
endereço do DANFE e do XML autorizados.

---

#### VFIS0670 — Reforma Tributária (IBS/CBS)

**Para que serve.** Configurar o IBS e a CBS da reforma tributária, que convivem com
ICMS, IPI, PIS e COFINS na transição.

**Abas.**
- **Alíquotas por ano:** o **modelo de tributação na NF-e** (modo e motivo); por ano,
  IBS estadual %, IBS municipal % e CBS %, com o fundamento. Sem cadastro, o ano
  segue a lei (ou fica pendente). A tela mostra a transição.
- **cClassTrib por CFOP:** o padrão da operação — um CFOP de saída passa a usar um
  cClassTrib; sem vínculo, vale a classificação fiscal do item.
- **Tabela oficial:** as classificações admitidas na NF-e (cClassTrib, CST, se
  tributa, redução de IBS/CBS, vigência), com filtro.

**Telas relacionadas.** VFIS0350, VFIS0200 (prévia mostra IBS/CBS por linha).

---

#### VFIS0120 — Exclusão de Tributação NCM

*Rotina de operações.*

**Para que serve.** Remover a tributação de um NCM que a empresa não deve mais usar.
A exclusão é definitiva para o cadastro fiscal — confira na VFIS0110 antes.

---

#### VFIS0660 — Consultas de Parâmetros Fiscais

*Rotina de consulta.*

**Para que serve.** Localizar cadastros fiscais por chave sem alterar nada:
dispositivo legal (por código ou tipo), CFOP (por código ou direção), regras de
ICMS/IPI (por id, UF, item ou NCM), motivo DAPI, códigos de ajuste, linha e
lançamento de apuração e apuração do Simples.

---

#### VFIS0600 — SPED EFD ICMS/IPI

**Para que serve.** Gerar o arquivo da EFD ICMS/IPI para validar no PVA e transmitir.

**Como usar.** Escolha o período e preencha:
- **Escrituração:** finalidade, perfil, atividade e apuração do IPI;
- **Contabilista (registro 0100, obrigatório):** nome, CPF, CRC e CNPJ do
  escritório;
- **Apuração:** saldo credor anterior de ICMS e de IPI, código de receita e
  vencimento do ICMS;
- **Inventário (bloco H):** data do inventário e motivo, quando entra.

**Baixar arquivo.** O resumo mostra o que entrou e os **avisos de cadastro** —
confira antes de transmitir. O arquivo sai na codificação que o PVA lê.

---

#### VFIS0610 — Importação de NF-e por Chave

*Rotina de operações.*

**Para que serve.** Baixar da SEFAZ a NF-e de compra pela chave de acesso (44
dígitos). A nota entra **pendente de conferência**: a conciliação dos itens, o plano
de contas, as parcelas e a aprovação são feitos na **VFIS0210**, que também tem o
botão *Importar pela chave*.

---

## Contabilidade

*Plano contábil, lançamentos, balancete, contabilização automática e ECD.*

#### VCTB0102 — Centros de Custo

**Para que serve.** O cadastro único de centros de custo (antes havia também a
VFIN0130): hierarquia, vigência, o responsável, o aprovador das requisições, a
conta contábil padrão, o orçamento mensal e o realizado.

**Aba Cadastro.** **Código** da empresa (ex.: CC-FAB-CORTE), descrição,
**centro-pai**, tipo, início (1º dia do mês), fim, *Recebe rateio de absorção* e
situação. Em **Gestão**: **responsável**, **aprovador**, *Aprova as requisições de
compra* (exige o aprovador) e **conta contábil padrão** (vale na nota de entrada
quando o item tem o centro e nenhuma conta). A lista mostra a árvore recuada.

**Regra.** Centro **em uso** só muda descrição, data final, situação e a gestão; não
pode ser excluído (desative). Centro inativo ou fora da vigência não recebe
lançamento.

**Aba Orçamento.** Por ano, o orçado de cada mês por centro; embaixo de cada mês, o
**realizado** (contas a pagar pela data de emissão), em vermelho quando passou do
orçado. **Gravar orçamento** grava só o que mudou.

**Aba Árvore e realizado.** Ano e mês (ou ano todo): cada centro com o orçado e o
realizado próprios e **consolidados** (somando os filhos), % usado e o selo
*estourado*.

**Aba Aprovações de requisição.** A requisição de compra com item de centro que
aprova requisições só vira pedido depois que o aprovador aprova aqui (quem pediu
não aprova a própria; reprovar exige motivo). Vale também para a requisição de
serviço gerada ao firmar a ordem planejada (MRP), com o centro da ordem. A
reprovada, corrigida com item novo, volta para o aprovador.

**Alertas.** *Orçamento do centro de custo estourado* e *Requisição aguardando o
aprovador do centro de custo*.

**Telas relacionadas.** VFIN0120 (conta que exige centro), VFIN0200, VCUS0100
(rateio), VSUP0200/VPDC0200 (requisições).

---

#### VUTL0555 — Cadastro de UFs e Países

**Para que serve.** As UFs (sigla, nome, país, código IBGE) e os países.

---

#### VCTB0200 — Contabilidade (SPED ECD)

**Para que serve.** O plano de contas contábil, os lançamentos, o balancete e a
contabilização automática.

**Abas.**
- **Planos:** número, descrição, vigência e situação do plano contábil.
- **Contas:** abra um plano e cadastre as contas (número, descrição, conta
  superior, tipo e natureza).
- **Lançamentos:** data, débito, crédito, valor e histórico (débito e crédito na
  mesma conta não são aceitos).
- **Balancete:** saldo por conta numa competência (AAAA-MM).
- **Contabilização automática:** o plano contábil e a conta de fornecedores; a
  ligação **plano de contas financeiro × conta contábil** (a conta debitada na
  entrada) e **conta bancária × conta contábil** (o caixa da baixa). Com isso, a
  NF de entrada aprovada, os pagamentos e os recebimentos se contabilizam sozinhos.

**Telas relacionadas.** VCTB0600, VFIN0120, VFIS0210.

---

#### VCTB0600 — SPED ECD

*Rotina de operações.*

**Para que serve.** Gerar e baixar o arquivo da ECD (Escrituração Contábil Digital)
com o plano, os lançamentos e os dados cadastrais do período.

---

#### VUTL0560 — Consulta de UF e Região

*Rotina de consulta.*

**Para que serve.** Localizar uma UF pela sigla e uma região comercial pelo código.

---

## Cadastros & Plataforma

*Empresa, funcionários, calendários, acesso, aprovações, alertas e auditoria.*

#### VAUD0100 — Histórico de Alterações

**Para que serve.** O histórico imutável do que foi feito no sistema — quem, quando,
o quê, onde e com que resultado. Exclusivo de administradores.

**Como usar.** Filtre por período, pela ação realizada e por trecho do caminho; cada
linha mostra se a ação foi concluída, recusada ou falhou. **Ver detalhes** abre o
registro.

---

#### VNOT0100 — Central de Alertas

**Para que serve.** Configurar os alertas e e-mails automáticos da empresa — por
exemplo, NF-e rejeitada ou cancelada, item não identificado na NF de entrada,
divergência fiscal, contagem cíclica próxima ou divergente, saldo abaixo do
mínimo ou negativo, lote perto do vencimento e exceções do MRP.

**Como usar.**
- **Funcionamento da central:** central ativa, horário do resumo, fuso horário,
  retenção (dias), limite de envios por minuto e de anexo.
- **Nova assinatura interna:** evento, cadência (imediato ou resumo), tipo de
  destinatário e destinatário, antecedência (dias) e limites de quantidade e de
  valor.
- As grades mostram as assinaturas, os alertas abertos e os envios (com
  tentativas e o motivo de falha).

---

#### VEMP0100 — Cadastro de Empresa

**Para que serve.** O **único lugar** da identificação da empresa: CNPJ, razão
social, fantasia, inscrição estadual, regime tributário, telefone, e-mail e o
endereço usado na SEFAZ (com o código IBGE do município). A VFIS0100 só mostra.

**Abas.**
- **Empresa atual:** a identificação da empresa em que você está; altere e
  **Salvar Identificação** (só administrador). O nome da empresa acompanha o nome
  fantasia (ou a razão social).
- **Nova empresa:** cadastra outra empresa com a identificação; ela recebe o
  próximo código livre e quem cadastra fica vinculado a ela como administrador.

**Regra.** CNPJ, razão social e UF são obrigatórios; o CNPJ é conferido e o código
IBGE tem de ser de município da UF. Alíquotas, vencimentos e Focus NF-e de
homologação ficam na VFIS0100; o token Focus de **produção** é gravado pela
Venture ERP.

**Mais de uma empresa.** Quem tem acesso a mais de uma empresa escolhe em qual
entrar na tela de login (campo *Empresa*, que aparece depois da senha).

**Telas relacionadas.** VFIS0100 (parâmetros fiscais).

---

#### VFUN0100 — Cadastro de Funcionário

**Para que serve.** Os funcionários: código (sugerido), nome, função/cargo, situação,
*participa do orçamento* e *assistente técnico*. São usados no apontamento da
produção, na assistência técnica e no sequenciamento.

**Como usar.** **+ Novo**, preencha e salve; **Editar** ou **Desativar** na lista.

---

#### VLOC0100 — Localização (Países e UFs)

**Para que serve.** Os países (sigla, nome, DDI, código BACEN, SISCOMEX) e as UFs
(sigla, nome, país, código IBGE).

---

#### VCLA0100 — Classificação de Itens

**Para que serve.** As classificações hierárquicas de itens (famílias e subfamílias),
usadas em regras, metas, restrições e relatórios.

**Como usar.** Crie a **máscara de classificação** (descrição e formato, ex.:
99.99.999); abra-a e cadastre as classificações (código, descrição e pai). A
lista mostra o nível.

---

#### VCAL0100 — Calendário Industrial

**Para que serve.** Os dias úteis da fábrica (o que o planejamento e a previsão usam
para repartir e programar).

**Como usar.** Gere o calendário do período (os dias já cadastrados são
preservados) e ajuste dia a dia: *Dia útil?* e descrição (ex.: feriado municipal).

**Telas relacionadas.** VENT0108, VPRE0201.

---

#### VPRI0100 — Prioridade de Ordens

**Para que serve.** Faixas de prioridade das ordens no sequenciamento (APS) pela
quantidade da ordem.

**Como usar.** Prioridade, descrição e a faixa de quantidade (mínima e máxima). A
máxima tem de ser maior que a mínima, e as faixas não podem se sobrepor.

---

#### VSEC0100 — Troca de Senha

**Para que serve.** Trocar a própria senha com aprovação de um administrador.

**Como funciona.**
1. **Minha senha → Solicitar troca de senha** (com o motivo).
2. O administrador aprova (ou rejeita) em **Aprovação das solicitações da
   empresa**. Aprovada, a pessoa tem **15 minutos** para concluir.
3. Volte à tela, informe a senha atual, a nova (veja os requisitos) e a
   confirmação. Todas as sessões abertas são encerradas — entre de novo.

**Histórico** mostra as solicitações (quem, quando, motivo, situação).

---

#### VAPR0100 — Aprovações

**Para que serve.** A caixa de aprovações da empresa e as políticas de alçada.
Aparece para qualquer usuário.

**Aba de solicitações.** O que espera aprovação (tipo, documento, valor, motivo,
solicitante, nível e situação). Aprove, ou **reprove com justificativa**
(obrigatória). Aprovado no último nível, o documento é liberado sozinho — o pedido
bloqueado por crédito termina a confirmação; o orçamento bloqueado por política
comercial é liberado.

**Aba Políticas de alçada** (administrador). Por tipo de documento — **liberação de
crédito**, **orçamento por política comercial** e **pedido por política comercial
ou desconto acima da alçada** —, os níveis em escalada: cada
nível tem um teto (*encerra até R$*) e um aprovador (um perfil de acesso ou um
usuário). O valor do documento exige os níveis até o primeiro teto que o cobre.
**Segregação de funções** (ligada por padrão): quem pediu não aprova e a mesma
pessoa não aprova dois níveis.

**Alçada de desconto do pedido.** No bloco do pedido, informe o desconto máximo
da linha em % (vazio = sem limite) e clique em **Gravar alçada**. Linha de pedido
com desconto acima da alçada bloqueia o pedido até a aprovação. Isso vale também
para o orçamento convertido. As políticas comerciais (VPDV0108) agora valem também
no pedido; as que exigem aprovação caem no mesmo tipo. Depois de aprovado, o
pedido não volta a bloquear ao editar outra linha. Subir o desconto ou o valor
pede nova aprovação.

**Sem política ativa**, a liberação continua manual (VVND0200, VVND0300). A
exceção é o desconto acima da alçada: sem quem aprove, a linha é recusada.

**Histórico** é imutável.

---

#### VADM0200 — Perfis de Acesso

**Para que serve.** Definir o que cada usuário pode fazer, por módulo, na empresa.

**Abas.**
- **Perfis:** nome, descrição, situação e, por módulo (comercial, suprimentos,
  qualidade, estoque, engenharia, planejamento, produção, manutenção, assistência,
  fiscal, financeiro, contabilidade, custos, cadastros, administração), as ações
  permitidas: **ler**, **incluir/alterar**, **excluir**, **aprovar**,
  **autorizar** e **executar**. *Tudo* marca o módulo inteiro.
- **Usuários:** ligue cada usuário aos seus perfis.

**Como vale.**
- Usuário com perfil ativo faz só o que a soma dos seus perfis permite; o menu já
  esconde o que ele não pode abrir.
- Usuário sem perfil segue só com o papel dele.
- **Administrador nunca é restringido.**
- Consultar os cadastros de apoio (itens, clientes, fornecedores, CFOP...) é livre
  para qualquer perfil.

---

#### VADM0100 — Trilha de Auditoria

*Rotina de consulta (administrador).*

**Para que serve.** Consultar as alterações por usuário, rota e período (com limite e
deslocamento para paginar). Para a consulta legível, use a **VAUD0100**.

---

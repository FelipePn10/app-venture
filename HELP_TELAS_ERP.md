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
                         Romaneio / Carga (VEXP0100)              → ENTREGA
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

**Beneficiamento (material do cliente).** Produto com o material marcado como
fornecido pelo cliente (VENT0210) → pedido de venda do serviço (VVND0200) → NF-e
de remessa do cliente ligada ao pedido (VBEN0100) → produção apontando só horas
(VBEN0300) → nota única com o serviço e a devolução do material (VBEN0100 →
VFIS0200) → inventário e movimentação do material do cliente em VBEN0200.

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
| [VCST0202](#vcst0202--tabelas-de-venda-e-preços-por-item) | Tabelas de Venda e Preços por Item | Criar tabelas de venda, vincular itens, manter preços, unidades, vigência e políticas comerciais. |
| [VVND0100](#vvnd0100--divisão-de-vendas) | Divisão de Vendas | Cadastrar divisões de vendas (equipe/região/unidade) associáveis ao pedido. |
| [VVND0200](#vvnd0200--pedido-de-venda) | Pedido de Venda | Gerir pedidos de venda: capa, itens, confirmação (crédito/reserva/demanda), bloqueio e cancelamento (R→P→F). |
| [VVND0300](#vvnd0300--orçamento-de-venda) | Orçamento de Venda | Registrar propostas comerciais (capa + itens), acompanhar carteira, liberar/bloquear, cancelar/descancelar com motivo, atender, anexar documentos, gerar DAV/Pré-Venda e converter o saldo aberto em pedido de venda. |
| [VVND0400](#vvnd0400--representantes) | Representantes | Cadastrar vendedores/gerentes/prepostos: dados, documento, território, comissão, tipos, pastas (empresas, telefones, e-mails), bloqueio, relatório cadastral e ficha de acompanhamento. |
| [VVND0500](#vvnd0500--metas-de-vendas) | Metas de Vendas | Definir metas comerciais por período, representante e cliente (valor/quantidade), acompanhar previsto × realizado, premiação e saldos excedentes. |
| [VSAC0100](#vsac0100--atendimento-ao-consumidor-sac) | Atendimento ao Consumidor (SAC) | Centralizar consumidores finais, chamados de SAC (recebido/efetuado/garantia), reclamações com sintomas, visitas técnicas, retornos e indicadores. |
| [VDPR0100](#vdpr0100--promessa-de-entrega--ocupação-e-reservas) | Promessa de Entrega — Ocupação e Reservas | Consultar ocupação diária de tanque/setor, criar/simular reserva comercial de capacidade, expirar reservas vencidas e reprogramar datas de entrega em lote. |
| [VVND0700](#vvnd0700--devolução-de-venda) | Devolução de Venda | Devolução do cliente pela NF de venda: NF-e de entrada própria ou NF do cliente, estoque de volta, abatimento, crédito, comissão e séries. |
| [VVND0710](#vvnd0710--contrato-de-venda) | Contrato de Venda | Contrato de fornecimento com o cliente: itens com preço fixado, teto, vigência, programação e pedidos de chamada pelo saldo. |

**[PDV / Pedidos](#pdv--pedidos)** — Acompanhamento da carteira, políticas de desconto e frete, vendas recorrentes e comissões.

| Código | Tela | Para que serve |
|---|---|---|
| [VPDV0108](#vpdv0108--cadastro-de-política-comercial-de-descontos) | Cadastro de Política Comercial de Descontos | Cadastrar políticas comerciais de descontos com prioridades, sequências e validade. |
| [VPDV0111](#vpdv0111--cadastro-de-política-comercial-de-fretes) | Cadastro de Política Comercial de Fretes | Determinar valor do frete/seguro com base em critérios definidos pela transportadora. |
| [VVRE0200](#vvre0200--console-de-vendas-recorrentes) | Console de Vendas Recorrentes | Visualizar histórico de recorrências ativas e inativas para um cliente/estabelecimento. |

**[Assistência Técnica](#assistência-técnica)** — Chamados de assistência técnica e os relatórios do atendimento.

| Código | Tela | Para que serve |
|---|---|---|
| [VATC0100](#vatc0100--base-instalada) | Base Instalada | Equipamentos por número de série: onde estão, em que nota foram vendidos, instalação, transferência, baixa e histórico. |
| [VATC0300](#vatc0300--ordem-de-serviço) | Ordem de Serviço | Atendimento do chamado no cliente ou na fábrica: agenda, técnico, horas, peças do estoque, despesas, garantia e faturamento. |
| [VATC0310](#vatc0310--sla-da-assistência) | SLA da Assistência | Prazo de resposta e de solução do chamado por prioridade e por cliente; painel de chamados em risco e vencidos. |
| [VATC0320](#vatc0320--recuperação-junto-ao-fornecedor) | Recuperação junto ao Fornecedor | Cobrar do fornecedor o custo da garantia de componente com falha: reclamação, aceite ou recusa e ressarcimento. |
| [VATC0400](#vatc0400--indicadores-do-pós-venda) | Indicadores do Pós-venda | Custo da garantia por item, defeito e lote, recuperado de fornecedores, taxa de falha, MTBF, SLA cumprido e tempo de atendimento. |
| [VATC0280](#vatc0280--cadastro-de-chamados) | Cadastro de Chamados | Cadastrar chamados com dados do consumidor, tipo, garantia, motivo, responsável e posição. |

**[Garantia](#garantia)** — Devolução de garantia (RMA) ligada ao chamado.

| Código | Tela | Para que serve |
|---|---|---|
| [VGAR0211](#vgar0211--gerar-pedido-de-devolução) | Gerar Pedido de Devolução | Gerar os pedidos de devolução. |

**[Cliente](#cliente)** — Cadastro de clientes e os cadastros de apoio (região, portador, condição de pagamento, tabela de venda, tipos de nota).

| Código | Tela | Para que serve |
|---|---|---|
| [VCLI0500](#vcli0500--cadastro-de-cliente) | Cadastro de Cliente | Cadastrar clientes (matriz/filiais), dados fiscais, apoios vinculados, endereços, contatos e bloqueio/desbloqueio. |

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
| [VPME0102ITE](#vpme0102ite--calendário-de-promessa-de-entrega-por-item) | Calendário de Promessa de Entrega por Item | Cadastrar dias úteis e não úteis para enchimento de tanques por item e máscara. |
| [VMAQ0200](#vmaq0200--máquinas-tempos-e-cálculo) | Máquinas, Tempos e Cálculo | Cadastrar máquinas (capacidade/eficiência), tempos por item × máquina, agenda e calcular o tempo de produção (ciclos, setup, gargalo). |
| [VENT0200](#vent0200--cadastro-de-itens) | Cadastro de Itens | Cadastro e manutenção de itens do estoque. |
| [VENT0250](#vent0250--governança-do-cadastro) | Governança do Cadastro | Liberação do cadastro do item por área, campos obrigatórios, bloqueio, descontinuação com substituto e histórico campo a campo. |
| [VENT0210](#vent0210--cadastro-de-estrutura-de-produtos) | Cadastro de Estrutura de Produtos | Realize o cadastro das estruturas dos produtos. |
| [VENT0202](#vent0202--roteiro-de-fabricação) | Roteiro de Fabricação | Roteiros dos itens, modelos de roteiro e biblioteca de operações. |
| [VITE0116](#vite0116--padrão-descritivo-pdm) | Padrão Descritivo (PDM) | Modificadores de cada grupo e modelo de atributos que gera a descrição técnica do item. |
| [VCFG0100](#vcfg0100--conjuntos-e-variáveis-do-configurador) | Conjuntos e Variáveis do Configurador | Conjuntos de respostas, variáveis, máscaras e traduções. |

**[Produção](#produção)** — Ordem de produção, capacidade (CRP), sequenciamento (APS), plano de corte, ferramentas e paradas.

| Código | Tela | Para que serve |
|---|---|---|
| [VPRO0200](#vpro0200--crp--capacity-requirements-planning) | CRP — Capacity Requirements Planning | Calcular carga por centro de trabalho/dia e identificar sobrecargas de um plano MRP. |
| [VPRO0210](#vpro0210--aps--sequenciamento--gantt) | APS — Sequenciamento / Gantt | Sequenciar ordens em capacidade finita (EDD) e visualizar o Gantt por ordem/centro. |
| [VCUT0100](#vcut0100--plano-de-corte) | Plano de Corte | Otimizar aproveitamento de matéria-prima (nesting 1D/2D/true-shape): demanda, estoque, otimizar, firmar (baixa + retalhos), programa, agenda e export SVG/DXF/PDF. |
| [VPRO0900](#vpro0900--ordem-de-produção) | Ordem de Produção | Gerir a OF: ciclo OPEN→IN_PROGRESS→COMPLETED→CLOSED, apontamentos, consumos (OUT), conclusão (IN+lote), custo real e sucata. |
| [VPRO1000](#vpro1000--ficha-de-produção-da-ferramenta) | Ficha de Produção da Ferramenta | Vincular a série física de ferramenta em cada operação da OF (substituição com histórico) e cadastrar ferramentas/séries com vida útil. |
| [VPRO1200](#vpro1200--parada-de-máquina) | Parada de Máquina | Terminal de chão de fábrica: registrar que a máquina parou e que voltou, sem digitar horário. |

**[Manutenção](#manutenção)** — Ordens de manutenção e paradas de máquina.

| Código | Tela | Para que serve |
|---|---|---|
| [VPRO0500](#vpro0500--manutenção-preventiva) | Manutenção Preventiva | Planos de manutenção por máquina, geração das ordens, início e conclusão com as horas de parada (descontadas da capacidade) e ordens por centro de trabalho. |

**[Planejamento](#planejamento)** — MRP, pipeline de planejamento, previsão de vendas, demandas e cargas.

| Código | Tela | Para que serve |
|---|---|---|
| [VPLN0100](#vpln0100--pipeline-de-planejamento-mrpcrpaps) | Pipeline de Planejamento (MRP→CRP→APS) | Executar MRP, CRP e APS num único disparo com parecer de viabilidade, e manter parâmetros de planejamento. |
| [VPLA0102](#vpla0102--demanda-independente) | Demanda Independente | Produzir ou comprar sem pedido de venda: estoque, amostra, feira, consumo interno, assistência, projeto; consumo pela venda e OF direta. |
| [VMRP0100](#vmrp0100--mrp--planejamento-de-materiais) | MRP — Planejamento de Materiais | Rodar o MRP por plano, analisar sugestões de ordens, firmar (→ Ordem Planejada/OF), perfil MRP por item, exceções e regras configuradas. |
| [VPRE0201](#vpre0201--previsão-de-vendas) | Previsão de Vendas | Lançar, gerar (histórico ou estatística) e comparar com o realizado a previsão de vendas; apropriação e bloqueio. |
| [VPLA0310](#vpla0310--política-de-planejamento-por-item) | Política de Planejamento por Item | Estratégia (consumo pela venda ou sob encomenda), janela de consumo, horizonte firme e tempo de segurança por item ou classificação. |

**[Suprimento](#suprimento)** — Fornecedores, pedido de compra, solicitação, cotação, contratos, recebimento e serviços de terceiros.

| Código | Tela | Para que serve |
|---|---|---|
| [VPCT0100](#vpct0100--parâmetros-de-compras) | Parâmetros de Compras | Tolerâncias de quantidade, preço e total (bloqueio ou alerta) e alçadas de aprovação do pedido de compra. |
| [VTPS0100](#vtps0100--serviços-de-terceiros) | Serviços de Terceiros | Preços de serviço por item×fornecedor×operação e ordens de serviço (OF→requisição→OC). |
| [VPDC0200](#vpdc0200--pedido-de-compra) | Pedido de Compra | Pedido de compra completo: capa, itens, alçada, PDF e envio ao fornecedor por e-mail, acompanhamento de entregas, histórico de preço, notas por linha, previsão de pagamentos e sugestões do MRP. |
| [VSUP0500](#vsup0500--cadastro-de-fornecedor) | Cadastro de Fornecedor | Cadastrar fornecedores/transportadoras: dados, endereço, pastas (telefones/emails/vencimentos/contatos/empresas), SEFAZ, auto-fill CNPJ e bloqueio. |
| [VSUP0110](#vsup0110--conversão-de-um-por-item) | Conversão de UM por Item | Cadastrar fatores de conversão entre unidades de medida de um item (ex.: 1 CX = 12 UN) para o pedido de compra. |
| [VSUP0120](#vsup0120--tabela-de-preço-de-compra) | Tabela de Preço de Compra | Cadastrar tabelas de preço de compra (genéricas ou por fornecedor) com vigência, moeda e itens. |
| [VSUP0140](#vsup0140--cadastro-de-transportadora) | Cadastro de Transportadora | Cadastrar o perfil de transporte do fornecedor transportadora: RNTRC/ANTT, modal, tabela de frete, seguro, frota com motorista, regiões atendidas com prazo, ocorrências de entrega e cotação comparativa de frete. |
| [VSUP0130](#vsup0130--fornecedor-preferencial-por-item) | Fornecedor Preferencial por Item | Vincular fornecedores a um item com ranking de preferência, código/descrição/UM do item no fornecedor e lead time. |
| [VSUP0300](#vsup0300--solicitação-de-compra) | Solicitação de Compra | Registrar solicitações de compra (itens com saldo/atendimento) e gerar pedidos agrupando por fornecedor. |
| [VSUP0400](#vsup0400--cotação-de-compra) | Cotação de Compra | Liberar itens para cotação, registrar preços por fornecedor, selecionar o vencedor e gerar pedidos. |
| [VCON0200](#vcon0200--contratos-de-fornecedores) | Contratos de Fornecedores | Cadastrar, consultar o saldo, baixar saldo e encerrar contratos com fornecedores. |
| [VAVR0200](#vavr0200--aviso-de-recebimento) | Aviso de Recebimento | Agendar doca, informar itens esperados, acompanhar conferência e tratar divergências antes da entrada fiscal. |

**[Almoxarifado](#almoxarifado)** — Almoxarifados, estoque, inventário, lotes, expedição e o material de terceiros (beneficiamento).

| Código | Tela | Para que serve |
|---|---|---|
| [VLOT0100](#vlot0100--máscaras-de-lotesérie) | Máscaras de Lote/Série | Compor o número de lote/série por partes (caractere/data/sequencial) e gerar o próximo lote. |
| [VEST0500](#vest0500--programação-e-execução-de-contagem-cíclica) | Programação e Execução de Contagem Cíclica | Executar a política definida no item: programar conferências, registrar quantidades, tratar divergências e aprovar. |
| [VENT0800](#vent0800--cadastro-de-almoxarifado) | Cadastro de Almoxarifado | Cadastrar almoxarifados e configurações de estoque. |
| [VEST0100](#vest0100--central-de-estoque) | Central de Estoque | Posição e ATP por situação, extrato (kardex), lançamentos com tipo e centro de custo, transferências, requisições ao almoxarifado, reservas, separação, lotes, reposição e análises (giro, cobertura, parados). |
| [VEST0200](#vest0200--inventário-e-tipos-de-movimento) | Inventário e Tipos de Movimento | Inventário físico com foto do saldo, contagem e recontagem, diferenças valorizadas e fechamento que lança os ajustes; tipos de movimento com as regras do lançamento manual. |
| [VEST0150](#vest0150--coletor-de-estoque) | Coletor de Estoque | Tela para leitor de código de barras: consulta, separação de ondas, contagem de inventário, movimentação entre endereços e etiquetas. |
| [VEXP0100](#vexp0100--expedição--romaneio) | Expedição / Romaneio | Romaneios (separação, conferência, volumes e despacho) e cargas: montar com os romaneios prontos, caixa de despacho, orientações ao motorista, faturar e despachar. |
| [VBEN0100](#vben0100--beneficiamento--remessas-e-retorno-fiscal) | Beneficiamento — Remessas e Retorno Fiscal | Receber a NF-e de remessa do cliente (CFOP 5901) ligada ao pedido de beneficiamento, acompanhar o saldo por linha, lançar retorno, sobra e sucata, e faturar numa nota única o serviço (5124) e a devolução do material (5902/5903), com histórico e auditoria. |
| [VBEN0200](#vben0200--estoque-de-terceiros--material-do-cliente) | Estoque de Terceiros — Material do Cliente | Inventário do material que pertence ao cliente e está em poder da empresa, ordenado pelo prazo fiscal de retorno, e a movimentação de entrada e saída no período. Não entra na valoração do estoque próprio. |
| [VBEN0300](#vben0300--horas-de-beneficiamento) | Horas de Beneficiamento | Horas trabalhadas nas ordens de fabricação de beneficiamento, por cliente e pedido: apontamentos e horas lançadas nas operações do roteiro. |

**[Importação](#importação)** — Processos de importação e custo nacionalizado.

| Código | Tela | Para que serve |
|---|---|---|
| [VIMP0200](#vimp0200--console-de-processos-de-importação) | Console de Processos de Importação | Manutenção e acompanhamento dos processos de importação, centralizando informações em um único local. |

**[Inspeção](#inspeção)** — Qualidade: lote de inspeção, amostragem NBR 5426, CAPA/8D, metrologia, certificados, documentos e avaliação de fornecedores.

| Código | Tela | Para que serve |
|---|---|---|
| [VINS0700](#vins0700--certificados-de-qualidade) | Certificados de Qualidade | Certificado ao cliente com lote, corrida, certificado da usina e o resumo das medições dos lotes de inspeção aprovados (PDF). |
| [VINS0800](#vins0800--documentos-da-qualidade) | Documentos da Qualidade | Instruções de trabalho, procedimentos e formulários com revisão, aprovação por quem não elaborou e histórico de revisões obsoletas. |
| [VINS0600](#vins0600--metrologia) | Metrologia | Instrumentos de medição, calibrações com resultado pelo erro máximo admissível, vencimentos e impacto da calibração reprovada. |
| [VINS0500](#vins0500--não-conformidades-e-capa8d) | Não conformidades e CAPA/8D | Não conformidades com lote de inspeção, CAPA pelo 8D ou simples (5 porquês, Ishikawa), ações com responsável e prazo e verificação de eficácia. |
| [VINS0300](#vins0300--lotes-de-inspeção) | Lotes de Inspeção | Lote único de inspeção (recebimento, processo, final): resultados por unidade da amostra, avaliação NBR 5426 e decisão de uso que libera o estoque. |
| [VINS0110](#vins0110--amostragem-nbr-5426) | Amostragem NBR 5426 | Calculadora da norma, procedimentos de amostragem e severidade (normal, apertada, atenuada) por item e fornecedor. |
| [VINS0200](#vins0200--cadastro-do-roteiro-de-inspeção) | Cadastro do Roteiro de Inspeção | Roteiro de inspeção de recebimento por item ou classificação e planos de inspeção de processo e final com as características a medir. |
| [VAVF0300](#vavf0300--avaliação-de-fornecedores) | Avaliação de Fornecedores | IQF calculado do histórico, histórico de avaliações e homologação do fornecedor. |

### Administrativo & Financeiro

**[Financeiro](#financeiro)** — Contas bancárias, plano de contas, contas a pagar e a receber, fluxo de caixa, adiantamentos e conciliação.

| Código | Tela | Para que serve |
|---|---|---|
| [VFIN0100](#vfin0100--contas-bancárias) | Contas Bancárias | Cadastrar contas bancárias com saldo inicial e chave PIX. |
| [VFIN0110](#vfin0110--condições-de-pagamento) | Condições de Pagamento | A condição de pagamento única (parcelas com percentual e evento) usada por cliente, fornecedor, orçamento, pedido e faturamento. |
| [VFIN0120](#vfin0120--plano-de-contas-gerencial) | Plano de Contas Gerencial | O plano gerencial (títulos, DRE e rateio), com a conta contábil vinculada a cada conta. |
| [VFIN0200](#vfin0200--contas-a-pagar) | Contas a Pagar | Lançar, aprovar, baixar e cancelar contas a pagar; rateio e visão por plano de contas; aging. |
| [VFIN0210](#vfin0210--contas-a-receber) | Contas a Receber | Lançar, baixar e cancelar contas a receber; aging. |
| [VFIN0300](#vfin0300--fluxo-de-caixa-e-saldos) | Fluxo de Caixa e Saldos | Extrato realizado, projeção de caixa e saldos das contas. |
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
| [VFIS0345](#vfis0345--ciap--crédito-do-icms-do-ativo) | CIAP — Crédito do ICMS do Ativo | Bens do ativo imobilizado, parcelas mensais do crédito de ICMS pelo índice das saídas, Bloco G da EFD e crédito no E111. |
| [VFIS0350](#vfis0350--classificações-fiscais) | Classificações Fiscais | Cadastro de classificação fiscal de mercadorias (NCM/CEST), idiomas e atributos de exportação. |
| [VFIS0360](#vfis0360--tipos-de-operação-de-entrada) | Tipos de Operação de Entrada | Natureza fiscal das compras, grupos de estado e validação UF×natureza. |
| [VFIS0510](#vfis0510--tabelas-da-apuração-de-icms) | Tabelas da Apuração de ICMS | Códigos de ajuste (5.1.1 e 5.2 a 5.7), linhas de apuração e motivos de transferência DAPI. |
| [VFIN0400](#vfin0400--apuração-de-impostos) | Apuração de Impostos | Apurar ICMS/IPI/PIS/COFINS por competência e manter os lançamentos de resumo do ICMS. |
| [VFIS0550](#vfis0550--restituição--ressarcimento-de-icms-st) | Restituição / Ressarcimento de ICMS ST | Pedidos de restituição/ressarcimento/complementação de ICMS ST. |
| [VFIS0560](#vfis0560--notas-especiais-de-ajuste) | Notas Especiais de Ajuste | Notas complementares e de ajuste de apuração de ICMS (com itens). |
| [VNFS0100](#vnfs0100--nfs-e-nota-fiscal-de-serviço) | NFS-e (Nota Fiscal de Serviço) | Emitir, autorizar e cancelar NFS-e (modelo ABRASF via Focus), com cálculo de ISS. |
| [VFIS0670](#vfis0670--reforma-tributária-ibscbs) | Reforma Tributária (IBS/CBS) | Alíquotas de IBS e CBS por ano, cClassTrib padrão por CFOP e tabela oficial de classificação tributária. |
| [VFIS0600](#vfis0600--sped-efd-icmsipi) | SPED EFD ICMS/IPI | EFD do mês gerada das notas de entrada, saída e CT-e, com a apuração do ICMS e do IPI. |

**[Contabilidade](#contabilidade)** — Plano contábil, lançamentos, balancete, contabilização automática e ECD.

| Código | Tela | Para que serve |
|---|---|---|
| [VCTB0102](#vctb0102--centros-de-custo) | Cadastro de Centro de Custo | Cadastrar e vincular centros de custo às empresas. |
| [VCTB0200](#vctb0200--contabilidade-sped-ecd) | Contabilidade (SPED ECD) | Plano de contas, contas contábeis, lançamentos e balancete (escrituração). |

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
| [VSEC0100](#vsec0100--troca-de-senha) | Troca de Senha | Solicitar a troca da própria senha, acompanhar a aprovação e definir a nova senha; o administrador aprova ou rejeita as solicitações da empresa. |
| [VAPR0100](#vapr0100--aprovações) | Aprovações | Solicitações por alçada (crédito do pedido, política comercial do orçamento) e políticas de aprovação. |
| [VADM0200](#vadm0200--perfis-de-acesso) | Perfis de Acesso | Perfis da empresa com permissão por módulo e ação, e os perfis de cada usuário. |

---

# Comercial & Vendas

## Comercial

*Orçamento, pedido de venda, representantes, metas, SAC e promessa de entrega.*

#### VCST0202 — Tabelas de Venda e Preços por Item

**Para que serve.** Criar as tabelas de venda e manter o preço de cada item
nelas. É daqui que o orçamento (VVND0300) e o pedido (VVND0200) buscam o preço:
item sem preço ativo em nenhuma tabela não entra no pedido.

**Antes de começar.**
- Itens cadastrados (VENT0200). Para calcular preço sugerido, o item precisa ter
  custo (VCUS0100).

**Passo a passo.**
1. **Nova tabela de venda:** informe descrição, casas decimais, formação do
   preço, composição (FOB/CIF) e a validade (de/até). Clique em **Criar tabela**.
2. Selecione a tabela na lista e use **Incluir item na tabela**: item, preço de
   venda, unidade de venda e unidade comercial (com o preço convertido, quando
   são diferentes), situação, disponibilidade, fórmula/referência e observação
   comercial. Na grade, **Editar** abre a linha para alterar o preço e
   **Histórico** mostra cada mudança (de, para, origem e motivo).
3. **Formação de preço:** escolha tabela e item e clique em **Calcular preço
   sugerido** — custo base + margem % + impostos %, ou o resultado da política
   escolhida.
4. **Gerar preços em lote:** escolha tabela e política, liste os itens separados
   por vírgula e clique em **Gerar preços**. O sistema grava os preços (inclui ou
   atualiza) e guarda o histórico da alteração.
5. **Cabeçalho das tabelas** (botão na barra): o cadastro completo da tabela —
   vigência, tolerâncias mínima e máxima % (preço abaixo do piso bloqueia o
   pedido), formação de preço, casas decimais, incoterm, tipo, data base, *permite
   valor abaixo de R$ 0,01*, *ICMS por dentro* e observação.
6. **Nova política de formação de preço:** fonte de custo, margem, impostos,
   prioridade, comissão, **frete**, despesas e desconto — reutilizável na geração em
   lote. Clique numa política da lista para alterá-la.

**Regras e cuidados.**
- O preço precisa ser maior que zero.
- Dados fiscais do produto (NCM, tributação) não ficam aqui: ficam no cadastro
  do item e nas regras fiscais, porque valem para qualquer tabela.
- O cliente pode ter uma **tabela padrão** (VCLI0500). Quando o item
  existe em mais de uma tabela, o pedido pede para escolher a tabela.

**Telas relacionadas.** VPDV0108
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
7. Aba **Entrega:** reprograma a data de entrega dos itens. A prévia mostra, por
   linha, saldo, reservas, demanda, ordens, compras, expedição e faturamento e
   sugere a nova data. Marque os itens, informe a nova data e o motivo (ou
   **Aplicar aos marcados**) e **Reprogramar itens marcados**. A nova data tem de
   ser posterior à atual; item sem saldo ou já faturado não reprograma; é tudo ou
   nada. Embaixo, o **histórico** de remarcações do pedido. Para vários pedidos de
   uma vez, use a VDPR0100.
8. O pedido passa a **Faturado (F)** sozinho quando a NF-e de saída é autorizada
   (VFIS0200).

**Consultar a carteira.** Os filtros se somam: cliente, situação e andamento
(análise comercial ou financeira pendente ou reprovada, conferência pendente ou
com divergência). O pedido aberto mostra itens e saldos.

**Aba Andamento.** Depois de confirmado: aprovar ou reprovar a **análise
comercial** e a **financeira**, marcar a **conferência** (conferido ou com
divergência), **registrar o atendimento** (com a data) e **registrar o atraso**
(o que será feito). Toda decisão pede um motivo, que fica no histórico do pedido.

**Bloquear, desbloquear e cancelar.**
- **Bloquear/Desbloquear:** bloqueio manual ou de crédito. Se a empresa tiver a
  política de aprovação de crédito ativa (VAPR0100), o desbloqueio só acontece
  pela aprovação; aprovado, o pedido termina a confirmação (reserva e demanda).
- **Cancelar:** exige motivo (e complemento, quando o motivo pede). Os títulos a
  receber ligados ao pedido (sinal, adiantamento, título lançado à mão) são
  cancelados junto. **Não cancela** se algum título já teve recebimento ou se o
  título veio da NF de saída — nesse caso cancele primeiro a nota.

**Telas relacionadas.** VVND0300 (orçamento que vira pedido), VDPR0100 (reprogramação em lote), VFIS0200 (faturar),
VEXP0100 (romaneio), VMRP0100.

---

#### VVND0300 — Orçamento de Venda

**Para que serve.** Montar a proposta comercial, negociar e, quando aceita,
convertê-la em pedido de venda sem redigitar nada.

**Antes de começar.** Cliente (VCLI0500), itens com preço em tabela (VCST0202) e
os parâmetros do orçamento (botão **Parâmetros** da tela).

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

**Parâmetros (botão da tela).** As regras de apoio do orçamento, por empresa.
Qualquer usuário consulta; só administrador grava.
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

*Salvar parâmetros*, *Restaurar padrões* (volta aos valores do sistema), *Gravar
padrão* e *Gravar motivo*. **Voltar aos orçamentos** retorna à lista.

**Telas relacionadas.** VVND0200, VCST0202.

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
5. Aba **Complementos:** segmentos de mercado, planos de venda, interesses
   (classificações de item), endereços de correspondência e as contas da
   contabilização da comissão (gerada e estornada) da empresa atual.

**Ações.** *Bloquear* (pede motivo — o representante sai dos seletores de novas
operações), *Desbloquear*, *Relatório* (cadastral), *Relatório individual* e
*Follow-up* (ficha de acompanhamento).

**Regras.** Nome e documento são obrigatórios. O vínculo com a empresa respeita
a empresa do usuário: um representante só aparece na empresa em que está
vinculado.

**Telas relacionadas.** VVRE0200 (comissões futuras), VVND0500 (metas).

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

**Telas relacionadas.** VVND0400, VPRE0201 (Previsto × realizado).

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
6. **Documentos do chamado** (com o chamado aberto): anexe PDF, imagem ou texto
   (até 10 MiB) com observação; baixe ou exclua.
7. **Relatórios** (botão na barra): etiquetas de consumidores, relatório de
   contatos e etiquetas de chamados.

**Telas relacionadas.** VATC0280 (assistência técnica).

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

**Telas relacionadas.** VPME0102ITE (calendário e Parâmetros), VVND0200.

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

## PDV / Pedidos

*Acompanhamento da carteira, políticas de desconto e frete, vendas recorrentes e comissões.*

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

**Telas relacionadas.** VPDV0108, VCST0202 (políticas de preço com frete %).

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
5. **Reajuste** (com o contrato aberto): percentual e motivo; aplica o reajuste
   pontual ao contrato. Use o percentual do contrato; negativo só para redução
   autorizada.

**Abas de apoio.**
- **Parâmetros:** até que dia do mês o faturamento cai na competência corrente e
  o dia de programação da entrega.
- **Datas de reajuste:** datas de reajuste por cliente e estabelecimento.
- **Aplicar reajuste:** primeiro **simule** (mostra, contrato a contrato, o
  faturamento de hoje, depois do reajuste e a diferença) e só então confirme.

**Regra.** Na rodada mensal informe a competência (AAAA-MM) do pedido gerado: a
segunda geração do mesmo contrato no mesmo mês é recusada como duplicidade.

**Comissões futuras** (aba no topo): quanto de comissão vai ser pago e quando.
- **Projeção:** por mês, representante e cliente — base, valor, comissão % e comissão.
- **Razão de comissões:** os lançamentos do período (competência, pedido, evento e
  situação).
- **Configuração:** o evento de competência e a divisão da comissão entre
  **faturamento** e **recebimento** (os dois somam 100%).

**Telas relacionadas.** VVND0200, VVND0400.

---

## Assistência Técnica

*Chamados de assistência técnica e os relatórios do atendimento.*

#### VATC0100 — Base Instalada

**Para que serve.** Acompanhar cada equipamento pelo **número de série**: onde está
(em estoque, no cliente, em assistência, baixado), em que nota foi vendido, quando
e onde foi instalado e tudo o que aconteceu com ele. É o ponto de partida da
garantia e da assistência técnica.

**De onde vêm as séries.**
- **Produção:** a entrega da OF de item que controla série (aba Pós-venda da VENT0200) cria as
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

**Telas relacionadas.** VENT0200 (aba Pós-venda), VPRO0900, VFIS0200, VATC0280.

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

**Telas relacionadas.** VATC0280, VATC0100, VENT0200 (aba Pós-venda), VATC0310, VATC0320, VATC0400, VINS0500, VVND0100.

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

**Consultar e relatório.** A lista de chamados filtra por **situação** e por texto
(assunto, consumidor, número ou cliente). **Relatório** (barra) gera os indicadores
dos chamados, com filtro em todas as colunas e exportação.

**Telas relacionadas.** VGAR0211 (devolução/RMA), VSAC0100 (SAC).

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

#### VCLI0500 — Cadastro de Cliente

**Para que serve.** Cadastrar os clientes da empresa, com endereços e contatos.
Cada empresa tem o seu cadastro: um cliente da empresa A não aparece nem é
alterado na empresa B.

**Antes de começar.** Os **Cadastros de apoio** (botão da própria tela), nesta
ordem: região, segmento, tipo de contato, tipo de cliente, portador e grupo de
portadores, tipo de NF de saída e tipo de imposto. No grupo de portadores, o
vínculo portador ↔ grupo é escolhido nas listas. Condição de pagamento: VFIN0110;
tabela de venda: VCST0202.

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

**Telas relacionadas.** VFIN0110, VCST0202, VVND0200, VFIS0320.

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
5. **Histórico:** **Listar todos** mostra o custo-padrão vigente de cada item
   (material, operação, indiretos e total); abaixo, as apurações anteriores de um
   item e **o que mudou** desde a apuração anterior, componente a componente.
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

**Telas relacionadas.** VENT0210, VENT0202, VCUS0200.

---

# Industrial & Produção

## Engenharia

*Itens, estruturas, roteiros, máquinas, desenhos, PDM e o configurador de produto.*

#### VDES0100 — Desenhos Técnicos

**Para que serve.** A tela única do desenho técnico: cadastro, revisões com
vigência e aprovação, cópias controladas, as características do configurador
que escolhem o desenho e o código de desenho de cada item.

**Passo a passo.**
1. **Novo desenho:** código, dígito, formato, modelo, item (busca pelo nome),
   descrição, unidade, peso, data de criação e material → **Criar desenho**.
   Para corrigir, abra o desenho na lista, altere e **Gravar alterações**.
2. Aba **Revisões:** revisão, vigência (de/até), aprovador e data da aprovação,
   motivo e material. Marque **Vigente** na revisão que vale; a grade mostra o
   código composto (desenho + dígito + formato + revisão). **Alterar** e
   **Excluir** ficam na linha.
3. **Cópias** (na linha da revisão): registre a quem a cópia controlada foi
   entregue e quando. Ao emitir a revisão nova, a lista diz quem precisa trocar
   a cópia antiga.
4. Aba **Características:** para produto configurado, diga quando este desenho
   vale — característica, condição (igual, diferente, maior, menor, pertence) e a
   resposta. Sem vínculo, o desenho vale para qualquer configuração.
5. Aba **Código por item:** escolha o item (e a máscara, se for configurado),
   **Consultar** e **Gravar código**. É o código impresso na ordem e na estrutura.

**Parâmetros** (barra da tela): *nova revisão replica para o item vinculado* —
ligado, a revisão vigente atualiza sozinha o código de desenho do item.

**Desativar** tira o desenho das listas de escolha; revisões e vínculos ficam.
**Mostrar desativados** traz os antigos de volta à lista para consulta.

**Telas relacionadas.** VENT0200 (item), VENT0210 (estrutura), VCFG0100
(configurador).

---


#### VPME0102ITE — Calendário de Promessa de Entrega por Item

**Para que serve.** Marcar dias em que um item específico não pode ser prometido
(ex.: linha parada para manutenção), além dos dias não úteis gerais.

**Como usar.** Informe item (e máscara), navegue pelo mês com as setas, clique nos
dias para marcar ou desmarcar como não úteis e salve. A mensagem diz quantos dias
foram marcados e quantos restaurados.

**Parâmetros** (botão na barra; "← Voltar ao calendário" retorna): liga e ajusta a
promessa de entrega da empresa — utilizar promessa; bloquear pedidos e exportação
na promessa; quebrar ocupação de tanque; recalcular após liberação; reprogramar
pedidos carregados; permitir alterar a data de entrega. No fim, os **tanques /
linhas de capacidade** (código, descrição, capacidade por dia e unidade). O item
escolhe a sua linha em VENT0200 › Planejamento, e a promessa reparte a quantidade
pela capacidade diária nos dias úteis (300 un numa linha de 120/dia: 120, 120 e 60).

**Telas relacionadas.** VDPR0100, VCAL0100, VENT0200.

---

#### VMAQ0200 — Máquinas, Tempos e Cálculo

**Para que serve.** Tudo o que a fábrica precisa cadastrar sobre seus recursos para
o MRP, o CRP e o sequenciamento calcularem certo. Cada aba responde a uma
pergunta, na ordem em que se cadastra.

**Abas.**

| Aba | O que se faz |
|---|---|
| **Centros de trabalho** | Os centros (recursos) e as máquinas que atendem cada um |
| **Máquinas** | Cadastro completo: código, nome, natureza, tipo, marca, calendário de turnos, **grupo de recursos**, horas por dia **ou** produção nominal de referência, eficiência padrão %, tempo de preparação, centro de custo, localização, uso, fornecedor, aquisição e responsável pela manutenção |
| **Turnos** | Calendários de turno (dia, início, fim) e as horas por semana |
| **Paradas** | **Máquina parou** (abre a parada agora — a máquina deixa de contar como disponível) e **Voltou a produzir**; ou lance uma parada que já aconteceu (de/até e motivo) — o planejamento deixa de ocupar esse período |
| **Consumíveis** | O que a máquina consome por hora de usinagem e quanto rende por carga e o tempo de troca |
| **Produtividade** | Tempo do item na máquina: forma de produção, eficiência do item, tempo de produção e quantidade nesse tempo, preparação por ordem e prioridade (1 = máquina preferida) |
| **Preparação** | Famílias de preparação e a **matriz de setup**: quanto tempo leva trocar de um item (ou família) para outro no centro |
| **Simulador** | Quanto tempo leva produzir uma quantidade: ciclos, setup, produção, total e eficiência aplicada |
| **Agenda** | A fila da máquina no dia (CRP/APS): reordenar, prioridade manual, situação e apontamento do que saiu |
| **APS e custos** | **Grupos de recursos** (máquinas que o sequenciamento pode trocar entre si), **campos especiais** da máquina (potência, tensão, curso…) e o **custo e a capacidade do centro**: centro de custo da máquina e da mão de obra e horas por dia (administrador) |

**Regras e cuidados.**
- A máquina precisa de jornada diária **ou** de produção nominal de referência.
- **Quem manda no tempo:** quando o item tem roteiro, vale o tempo da etapa do
  roteiro; o tempo desta tela é a medida da máquina e vale para item sem roteiro.
  A tela mostra os dois lado a lado e avisa quando divergem muito.
- Na matriz de preparação, informe ao menos o item ou a família de origem ou de
  destino — sem critério a linha valeria para qualquer troca.
- O simulador calcula o tempo da ordem; a sobrecarga depende das demais ordens e
  do calendário — confira no CRP (VPRO0200).

**Telas relacionadas.** VENT0202, VPRO0200, VPRO0210, VPRO0500.

---

#### VENT0200 — Cadastro de Itens

**Para que serve.** O cadastro mestre de itens: produto acabado, semiacabado,
matéria-prima, embalagem, ferramenta, serviço. Quase tudo no sistema começa aqui.

**Passo a passo.**
1. **Capa:** código, nome, situação, complemento, revisão, código anterior, estado,
   fabricante e referência do fabricante. Em **Padrão descritivo**, grupo, modificador
   e os atributos do modelo (VITE0116): o sistema gera a descrição técnica e avisa se a
   mesma combinação já existe. Sem modelo, a descrição segue livre. Depois vêm a
   descrição longa e os **marcadores de natureza** — item base, configurado, genérico,
   protótipo, ferramenta, item de processo, sucata/retalho. Genérico não combina com
   item base nem com configurado. Protótipo e sucata ficam fora do MRP; sucata sai na
   EFD como subproduto.
2. **Estoque e compras:** unidade de estoque e **unidade de compra** (diferentes,
   a conversão fica em VSUP0110), **almoxarifado padrão** e **almoxarifado de
   recebimento** (em branco, o recebimento usa o padrão), segunda unidade e fator,
   estoque mínimo (abaixo dele a reposição sugere compra ou fabricação) e máximo,
   baixa automática, fracionado, **contagem cíclica própria** (sem ela, o item é
   contado pela curva ABC: A a cada 90 dias, B 180, C 365; a contagem vencida avisa
   quem estiver configurado em VNOT0100), tipo de utilização, **roteiro de
   recebimento** (direto, padrão ou inspeção obrigatória), tolerâncias de excesso e de
   falta, **check list** e **certificado e corrida**, controle de lote, endereço e
   série, regra de baixa do lote, **validade**, **vida útil mínima no recebimento**,
   condições de armazenagem e produto perigoso (número ONU e classe de risco).
3. **Engenharia:** tipo de item, tipo de estrutura, item-base usado como modelo,
   OEM, pesos, volume, dimensões em milímetros, revisões, atributos livres e **corte e
   fabricação**: o **sentido do material** (veio do MDF, laminação da chapa) faz o
   plano de corte alinhar a peça e não girá-la; **não girar no corte** proíbe o giro
   mesmo sem sentido (estampa, furação); **exige desenho para produzir** só deixa a
   prontidão de produção verde com desenho vinculado.
4. **Planejamento:**
   - *Política:* tipo de planejamento, curva ABC, nível na estrutura (1 = produto
     final, 9 = matéria-prima) e tanque/linha de capacidade (escolhida na lista das
     linhas cadastradas em VPME0102ITE (Parâmetros), com a capacidade por dia).
   - *Tamanho do lote:* mínimo, múltiplo e máximo. O MRP arredonda as ordens por eles
     e divide a necessidade acima do máximo.
   - *Prazos e estoque de segurança:* prazo de compra e de fabricação (o MRP usa
     quando o fornecedor ou o roteiro não dão prazo), **tempo de segurança** (folga de
     prazo: o item chega antes) e **estoque de segurança** (folga de quantidade).
   - *Ponto de pedido:* para itens repostos pelo consumo, fora do MRP. Marque
     "Repor pelo ponto de pedido": consumo por dia trabalhado (em branco, apurado dos
     últimos 90 dias ÷ dias trabalhados) × dias que a empresa trabalha no prazo de
     reposição, pelo calendário industrial (sábado trabalhado conta, feriado não), +
     estoque de segurança. A reposição (VEST) e o MRP usam este mesmo número.
   - *Responsáveis:* o setor que planeja e o que compra o item, com as pessoas,
     vêm do grupo (VITE0116 — Grupos e modificadores). Para mudar, altere o grupo, não o item.
   - *Produção:* momento da baixa de material, forma de apontamento, crítico
     (destacado nos alertas de estoque), fantasma (o MRP passa direto aos
     componentes) e ativo no MRP.
5. **Comercial:** descrição comercial, tipo de venda, **unidade de venda**, mínimo e
   múltiplo de venda (o pedido e o orçamento recusam quantidade fora da regra), entrega
   estimada, tempo de garantia, **volumes por unidade** e **cliente exclusivo**.
   Faturamento e expedição: altera descrição no faturamento, exige volumes no despacho,
   embalagem diferenciada e de exportação (saem destacadas no romaneio) e é embalagem.
   A embalagem que vai com o produto entra na estrutura do item (VENT0210).
6. **Contábil:** classificações fiscais de venda e de compra (NCM), **origem da
   mercadoria** (0 a 8), CEST, **tipo do item na EFD**, **GTIN** comercial e
   tributável, unidade tributável e fator e embalagens com GTIN. As alíquotas não ficam
   no item: o IPI vem do NCM (VFIS0110), o ICMS da UF e da regra de ICMS/IPI (VFIS0320)
   e o PIS/COFINS do regime e do NCM.

**Marcações que não combinam.** A tela não deixa marcar juntas: sucata com item
base, configurado, protótipo, ferramenta ou item de processo; fantasma em item que
não é fabricado, crítico ou com lote/série/contagem; embalagem de exportação com diferenciada; serviço perigoso ou com
estoque. Passe o mouse na opção desabilitada para ver o motivo. Marcar o número de
série torna o item de quantidade inteira.

**Campos que dependem de outros.** Os campos de OF (prazo de fabricação, baixa de
material, apontamento, exige desenho) só valem para item Fabricado e o prazo de
compra só para Comprado; serviço não tem campos de estoque. Validade e vida útil
são do lote: num item novo, informar a validade já liga o controle de lote; num
item existente, ligue o lote antes; e desligar o lote de item com validade é
recusado até a validade sair do cadastro. Escala relevante e CNPJ do fabricante
só vão na nota com CEST. Revenda é só para item Comprado e o mínimo de venda
precisa ser múltiplo do múltiplo. Na aba **Prontidão**, a prévia fiscal mostra os
impostos pelo mesmo cálculo da nota, numa venda a empresa contribuinte para
industrialização, dentro e fora do estado; quem cadastra item a vê sem precisar
de acesso ao módulo fiscal.

**Cuidados no manuseio.** Produto perigoso (ONU e classe) e condições de
armazenagem aparecem em destaque na OF, na entrada de nota, na requisição, na
separação, no recebimento pelo coletor, nas etiquetas de item e na expedição, e
saem no romaneio.
7. **Prontidão** (item já gravado): diz se o item está pronto para comprar, produzir,
   estocar, vender e faturar, o que falta e em qual tela resolver. Para quem pode
   ativar item, **Pronto para o MRP** lista o que impede e o que merece atenção antes
   de o item entrar no planejamento. A **prévia fiscal** mostra o que vai à nota e à
   EFD e o que a SEFAZ recusaria.
8. **Pós-venda** (item já gravado): se o item é rastreado por **número de série** e
   com que máscara a série nasce na entrega da OF, a **garantia** (meses, se conta
   da venda ou da instalação, o que cobre) e observações. Item com série exige a
   série na NF de saída e entra na base instalada (VATC0100).

**Achar o item por outro código.** Em qualquer campo de item do sistema, a busca
acha também pelo código anterior, pela referência do fabricante, pelo código do
item no fornecedor (VSUP0130), pelo GTIN e pelos atributos livres. Num campo em
que se digita o código, use o código atual: se digitar um desses outros, a
mensagem diz qual é o item. Para não haver dúvida, o cadastro não aceita código
anterior ou referência do fabricante igual ao código de outro item, e a busca
mostra por qual código achou cada item.

**Usar um item-base como modelo.** Escolha o item-base: o sistema copia as pastas
para o item novo e mantém código, nome e nome técnico que você digitou.

**Alterar um item.** Abra o item na lista; o código não muda, o resto pode ser
corrigido. A lista mostra também os itens inativos — é aqui que se reativa.

**Regras e cuidados.**
- Os obrigatórios aparecem só depois da primeira tentativa de salvar, com a aba
  onde cada um está.
- Ao alterar campo com efeito fora do cadastro, a tela mostra o **impacto** antes de
  gravar. Unidade de estoque com saldo ou com documento aberto não muda, nem o tipo do
  item com ordem ou pedido de compra aberto.
- O GTIN é conferido pelo dígito verificador e não se repete na empresa.
- Ao marcar **Inativo** num item já gravado, a tela mostra **onde ele é usado**
  (as estruturas que consomem o item) — inativar sem olhar isso vira falta de
  componente no MRP.
- O grupo de inventário precisa existir no cadastro de grupos.
- Ao digitar o **nome** de um item novo, a tela avisa se já existe item
  parecido, ignorando acento, caixa e a ordem das palavras. Confira o aviso
  antes de gravar, para não ter o mesmo item com dois códigos.
- Se a empresa exige a liberação do cadastro (VENT0250), o item novo nasce
  **em cadastro** e só entra em documento depois que as áreas liberarem.

**Novidades do cadastro.**
- **Embalagens e GTIN** (Contábil): cada nível diz o que contém (a caixa tem 10 unidades, o palete tem 40 caixas) e o total é calculado ao gravar. O palete pode ficar sem GTIN. O leitor, a entrada de nota e a NF-e reconhecem cada embalagem.
- **Atributos livres** (Engenharia): o que o PDM não padroniza, como tonalidade ou acabamento. O valor também acha o item na busca.
- **Saldo por lote** (Estoque): com segunda unidade, a tela mostra as duas quantidades por almoxarifado e lote.
- **Revisões** (Engenharia): a nova revisão fecha a anterior na véspera. Com início futuro, a vigente só muda na data. A OF guarda a revisão com que nasceu.
- **Segunda unidade** (Estoque): controla peso além da peça. O recebimento informa o peso real; sem ele vale o fator nominal.
- **Item de embalagem** (Comercial): o despacho baixa uma embalagem por volume.
- **Entrega estimada:** vira a data da linha de venda quando ela vem sem data.
- **Tolerância de falta:** encerra a linha do pedido de compra quando a falta cabe nela.

**Telas relacionadas.** VITE0116 (padrão descritivo), VENT0210 (estrutura), VENT0202
(roteiro), VSUP0110 (conversão de UM), VFIS0350 (classificação fiscal),
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

**O que cada status permite.** Em **Regras**, a matriz ajusta isso por documento:
**Bloqueado** (padrão), **Com aviso** (deixa passar e registra o uso no histórico do
item, e a tela do documento avisa quem gravou) ou **Liberado**. Exemplo: descontinuado bloqueia a compra e libera a venda do
saldo.

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
   alternativo, co-produto, quantidade por ordem e material fornecido pelo
   cliente.

**Regras e cuidados.**
- **Unidade diferente da de estoque:** a tela mostra o que o planejamento vai
  usar (ex.: 2 M2 de chapa viram 31,4 kg). Sem conversão de UM cadastrada
  (VSUP0110), a gravação é recusada.
- A conferência lista **todos** os problemas de uma vez (sem gravar), para
  corrigir de uma passada só. Combinações que o MRP não consegue explodir são
  recusadas.
- As fórmulas podem ser copiadas e coladas entre componentes dentro da tela.
- **Fornecido pelo cliente (beneficiamento):** marque no componente que o
  cliente manda para a empresa processar. Ele não é comprado pelo MRP, não é
  baixado do estoque próprio nem entra no custo, e a ordem de fabricação do pai
  **não dá entrada do produto no estoque** — o material volta ao cliente na nota
  de beneficiamento (VBEN0100). Não pode ser marcado junto com co-produto.

**Versões da estrutura** (botão **Versões**, com o item aberto). É o controle de
revisão da lista de materiais, como no SAP e na revisão de estrutura do Protheus:

- **Abrir nova versão:** tipo — **Fabricação (MBOM)**, a que a produção usa, ou
  **Engenharia (EBOM)**, a do projeto — e a data a partir da qual vale. Nasce como
  rascunho, com o número seguinte.
- **Aprovar:** grava a **foto** da estrutura daquele momento e torna obsoleta a
  versão aprovada anterior do mesmo tipo. Estrutura vazia não é aprovada.
- **O que mudou:** compara a versão aprovada com a estrutura de agora — componente
  incluído, removido ou alterado (quantidade, unidade, perda, fórmula, validade).
- **Descartar / Tornar obsoleta:** a versão não volta a valer. Aprovada não volta a
  rascunho: para mudar, abra outra versão.

**Efeito na produção.** Depois que o item ganha a primeira versão de fabricação, ele
fica sob controle de versão: a OF (manual ou firmada pelo MRP) só é criada com uma
**MBOM aprovada e vigente**, e a prontidão do item (VENT0200) mostra *Impede* enquanto
não houver. Se a estrutura mudar depois da aprovação, a prontidão avisa (*Atenção*)
para revisar e aprovar uma nova versão. Item sem versão nenhuma funciona como antes.

**Telas relacionadas.** VENT0200 (cadastro e onde o item é usado),
VCFG0100 (máscara do configurado), VBEN0100.

---

#### VENT0202 — Roteiro de Fabricação

**Para que serve.** Descrever como cada item é fabricado — etapas, centros,
tempos, ferramentas, inspeções e em que etapa cada componente entra. O MRP, o
CRP, o custo e a ordem de produção leem o roteiro. É a única tela de roteiro:
os modelos (roteiros sem item) são um modo dela.

**Três modos (no alto da tela).**
- **Roteiros do item:** escolha o item; à esquerda ficam os roteiros dele
  (alternativa, máscara, vigência, faixa de lote, padrão). Crie **do zero** ou
  **a partir de um modelo**.
- **Modelos:** roteiros sem item ("chapa cortada, dobrada e pintada"). Monte as
  etapas uma vez e use **Usar em um item** para criar o roteiro de cada peça
  parecida. Modelo nunca é planejado.
- **Biblioteca de operações:** o vocabulário da fábrica. Cada operação diz onde é
  feita (na fábrica ou num terceiro), o centro padrão, a unidade dos tempos, **como
  o tempo é contado** (por peça, por m², por metro linear, por metro de perímetro
  ou por um atributo do item, como furos), preparação, tempo de máquina, quanto
  sai por ciclo, mão de obra, operadores, fila/espera/movimentação e refugo.

**O roteiro aberto.**
- **Cabeçalho:** descrição, padrão, vigência e **faixa de lote** — com faixa, o
  roteiro alternativo cuja faixa contém a quantidade da ordem vence o padrão
  (ex.: guilhotina até 49 peças, laser a partir de 50).
- **Prontidão:** o que impede o planejamento (sem centro, sem máquina apta na
  VMAQ0200, terceiro sem prazo, medida faltando no item) e o que só distorce o
  resultado (sem tarifa na VCUS0100).
- **Etapas:** o processo desenhado em cartões, na ordem — verde na fábrica, âmbar
  no terceiro, tracejado quando é fantasma. Clique numa etapa para editar tudo
  dela: tempos (em branco herda da biblioteca), centro, situação, terceiro,
  refugo, ponto de inspeção, **centros alternativos**, ferramentas, documentos e
  o que inspecionar.
- **Dependências:** o que precisa vir antes de quê e quanto pode sobrepor. Sem
  dependência, as etapas seguem a sequência. Remover uma etapa liga a anterior à
  seguinte.
- **Materiais por etapa:** em que etapa cada componente da estrutura entra. O
  planejamento pede o componente para quando a etapa começa.
- **Tempo e custo:** prazo do lote (horas nossas e dias no terceiro, separados),
  caminho crítico e custo por etapa.
- **Padrão × real:** compara o tempo padrão com o apontado nas ordens concluídas
  e sugere o novo tempo de máquina (botão **Aplicar**).

**Desativar e reativar.** Operação desativada sai da escolha, mas os roteiros que
a usam continuam. Roteiro desativado deixa de entrar no próximo MRP/CRP; ao
reativar, volta como alternativo se outro já for o padrão.

**Telas relacionadas.** VENT0210, VMAQ0200, VCUS0100, VTPS0100, VPRO0900, VPRO0200.

---

#### VITE0116 — Padrão Descritivo (PDM)

**Para que serve.** Definir quais modificadores cada grupo aceita e quais atributos
cada par grupo e modificador pede. A VENT0200 usa esse modelo para gerar a descrição
técnica do item: quem cadastra escolhe os valores e o sistema escreve a descrição
sempre do mesmo jeito.

**Como usar.** Escolha o grupo, marque os modificadores e grave. Escolha o modificador,
crie os atributos (texto, número ou lista de valores), com prefixo, unidade e ordem, e
use **Testar o padrão** para ver a descrição gerada. Na lista de valores, escreva um por
linha; para abreviar na descrição, use `ZINCADO BRANCO=ZB`.

**Grupos e modificadores** (botão na barra): o cadastro dos grupos PDM (famílias de
itens) e dos modificadores (o qualificador depois do grupo: "PARAFUSO
**SEXTAVADO**"). O código do grupo é sugerido e não muda; o do modificador é gerado.
Cada empresa tem os seus; a lista mostra quantos itens usam cada um. Nome repetido é
recusado e o **inativo** deixa de ser oferecido para item novo, sem mexer nos itens
que já o usam. Não se exclui — altere a descrição. Ao editar um grupo, escolha o
setor que **planeja** e o que **compra** os itens dele (setores na VNOT0100): todo
item do grupo herda esses responsáveis.

**Importante.** Grupo sem modificador marcado aceita todos. Modificador sem atributos
mantém a descrição livre. Item antigo continua como está até alguém preencher os
atributos dele. **Identifica o item** diz quais atributos entram na conferência de
duplicidade: dois itens com os mesmos valores são apontados na VENT0200.

**Telas relacionadas.** VENT0200, VNOT0100.

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
   explica por que uma pergunta some. **Motivos e consulta por cliente** (no fim
   da aba) mantém os motivos de restrição (editar, inativar, excluir) e lista as
   restrições próprias de um cliente. Toda restrição precisa de ao menos um SE e
   um ENTÃO.
5. **Configurar e gerar:** responda as perguntas e veja a máscara se formar.
   **Gerar combinações** cria de uma vez todas as combinações de um recorte de
   respostas; as restrições já removem as impossíveis.

**Telas relacionadas.** VENT0210 (o botão Configurador abre esta configuração
direto na estrutura).

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

**Telas relacionadas.** VMRP0100, VPRO0210, VMAQ0200, VPLN0100.

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

**Barra da tela.**
- **Parâmetros:** a lista das máquinas que o sequenciamento enxerga, com o
  centro e a situação, e a opção *listar só as máquinas ativas* (o administrador
  altera). Abaixo, as **faixas de prioridade das ordens**: o MRP dá a cada ordem
  planejada a prioridade cuja faixa de **quantidade** (em unidades do item) a
  contém; as faixas não podem se sobrepor.
- **Exportar eventos (CSV):** o início e o fim de cada operação programada, em
  planilha, para levar a programação a outro sistema.


**Telas relacionadas.** VPRO0200, VPRO0900, VMAQ0200 (agenda da
máquina).

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

**Origem.** A OF nasce ao **firmar** uma ordem planejada do MRP (VMRP0100), pelo
**Gerar OF agora** da demanda independente (VPLA0102) ou pelo botão **+ Nova OF**
(item, quantidade, máquina, início, término, almoxarifado que recebe, centro de
custo, prioridade, observações). O início não pode ser depois do término, e o
almoxarifado que recebe precisa ser da empresa em que você está.

**Situações.** Aberta → Em produção → Concluída → Encerrada (ou Cancelada).

**Quem faz o quê.**

| Ação | Onde | Quem |
|---|---|---|
| Criar OF | **+ Nova OF** (ou firmar no VMRP0100) | PCP |
| Iniciar produção | botão **Iniciar produção** | PCP |
| Iniciar/pausar/concluir etapa | aba **Etapas** | Operador (posto) e PCP |
| Apontar produção e refugo, registrar consumo | aba **Apontamento** | Operador e PCP |
| Entregar ao estoque / concluir a OF | aba **Apontamento** → **Entregar e concluir** | PCP ou almoxarifado |
| Encerrar (após concluída) | botão **Encerrar** | PCP |
| Cancelar | botão **Cancelar OF** — só sem apontamento, consumo ou peças no terceiro; cancela junto a OS de terceiro e a inspeção abertas | PCP |
| Apurar custo | botão **Apurar custo** / aba **Custo** | PCP / custos |

O perfil **Operador** vê só o que pode fazer: abre a OF, executa etapas, aponta,
consome e imprime. Para ler o código de barras da ordem impressa, leia na busca da
lista (`OF000607`) e tecle Enter — a ordem abre.

**O percentual da lista.** É o **entregue ao estoque ÷ quantidade planejada**
(17,4 de 29 = 60%). Apontar a última etapa não move a barra: só a entrada no
estoque (entrega) move.

**Abas.**
1. **Resumo:** planejado, apontado bom, refugo, entregue ao estoque, saldo a
   produzir, datas, origem e o que já foi feito.
   - **Iniciar produção:** antes, a tela confere as **faltas de material**. Com
     falta parcial ou sem saldo, pede confirmação (iniciar continua permitido).
   - **Imprimir OP:** baixa o PDF da ordem para a fábrica — observações, etapas na
     sequência com quem executa (centro ou terceiro), peças que entram, horas,
     inspeção, material por etapa, ferramentas, serviços em terceiro e campos de visto.
   - **Explodir roteiro**, **Apurar custo**, **Encerrar**.
2. **Apontamento:** quantidade boa, refugo e motivo, data, máquina e **operador**
   (obrigatório). *Baixa automática da estrutura no depósito* baixa os
   componentes junto. Também há a leitura por **código de barras** (código lido,
   ação, dispositivo, funcionário).
3. **Etapas:** as operações do roteiro — iniciar, **pausar** ou **interromper**
   (com motivo) e **concluir**. Para concluir, informe horas trabalhadas ou peças
   produzidas: é o que desconta a vida útil da ferramenta. Etapa feita em
   **terceiro** mostra "Com o terceiro — OS n": ela anda pela OS no VTPS0100 (a
   remessa põe em andamento, o recebimento de todas as peças conclui e libera a
   etapa seguinte), não pelos botões.
4. **Materiais:** o que a ordem consome — a baixar, livre no depósito, o que as OFs
   da frente vão consumir, disponível e falta. Inclua material, aloque lotes e
   registre o destino da sucata.
5. **Consumos:** registre o consumo do insumo (sai do estoque para a ordem) ou
   **retorne como sucata** (volta ao estoque com valor).
6. **Custo:** custo real × padrão nos mesmos componentes do custo padrão
   (VCUS0100): **material** (o que saiu do estoque para a OF), **máquina e
   preparação** e **mão de obra** (horas apontadas nas etapas × taxas do centro),
   **serviços de terceiros** (peças recebidas × preço do pedido, da VTPS0100 ou do
   roteiro) e **indiretos** (absorvidos na proporção do padrão). Sem custo padrão,
   o desvio não aparece (não há com o que comparar). Concluir a OF com material
   da lista sem baixa pede confirmação: o custo ficaria sem esse material.
   O administrador tem **Reapurar todas as OFs**, que refaz pela regra atual o
   custo das OFs apuradas antes da mudança (sem máquina e terceiros).

**Entrega ao estoque.** Informe depósito do acabado, quantidade e lote. Item que
controla número de série (aba Pós-venda da VENT0200) pede as **séries** — uma por linha, uma por
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
   **Desativar** tira da lista a série sucateada ou extraviada (o histórico fica).

**Perfil de posto (operador).** O operador abre a **Ficha de Produção** para
conferir a ferramenta e a série de cada operação e o histórico de substituições.
Cadastrar, vincular e substituir ficam com o PCP e a ferramentaria.

**Telas relacionadas.** VENT0202, VPRO0900.

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

**Perfil de posto (operador).** A tela está no menu do operador e funciona com
esse perfil: ele escolhe a máquina, abre e fecha a parada — nada mais da agenda.

**Telas relacionadas.** VMAQ0200, VPRO0200.

---

## Manutenção

*Ordens de manutenção e paradas de máquina.*

#### VPRO0500 — Manutenção Preventiva

**Para que serve.** Planos de manutenção preventiva por máquina e o ciclo das
ordens geradas a partir deles. As horas de parada saem da capacidade da máquina
no planejamento.

**Passo a passo.**
1. **Novo plano:** escolha a máquina e, se quiser, o centro de trabalho (busca
   pelo nome), descreva o que é feito e informe a frequência, o intervalo em dias
   e as horas previstas → **Criar plano**.
2. **Gerar ordens:** informe o horizonte em dias e clique em **Gerar**. A coluna
   *Próxima* mostra a data da próxima ordem de cada plano.
3. **Ordens** (na linha do plano): **Iniciar** quando a manutenção começa e
   **Concluir** informando as horas reais de parada; **Cancelar** pede
   confirmação. **+ Ordem manual** cria uma ordem para hoje.
4. Aba **Ordens por centro de trabalho:** escolha o centro e o período para ver
   todas as ordens das máquinas dele, com as mesmas ações.

**Desativar** um plano para as próximas gerações; as ordens já geradas ficam.

**Telas relacionadas.** VMAQ0200 (máquina, agenda e paradas), VPRO0200 (carga de
máquina), VPRO1200 (parada no chão de fábrica).

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
   aplicada ao plano real. Ao aplicar, a demanda zerada no cenário é cancelada —
   ou encerrada, se já teve saída para a finalidade — e a quantidade nova não pode
   ficar abaixo do que já saiu (a aplicação inteira é recusada, com o motivo).
   Descarte o cenário quando terminar.
4. **Parâmetros de planejamento:** a lista dos parâmetros numerados, editáveis na
   própria linha.

**Regra.** Só um cálculo de planejamento roda por vez; uma segunda execução
simultânea é recusada.

**Telas relacionadas.** VMRP0100, VPRO0200, VPRO0210.

---

#### VPLA0102 — Demanda Independente

**Para que serve.** Dizer ao MRP o que produzir ou comprar **sem pedido de
venda**: fabricar para estoque, repor, antecipar uma venda esperada, fazer
amostra ou protótipo, peças para feira, consumo interno, assistência técnica ou
um projeto/obra. O MRP gera a OF (item fabricado) ou a compra (item comprado).

**Como usar.** **+ Nova demanda** → item (e a máscara, se for configurado),
**motivo**, quantidade e data da necessidade; opcionalmente almoxarifado de
destino, centro de custo, cliente, projeto (obrigatório no motivo Projeto),
prioridade e observação. A numeração é automática. Para dividir em entregas,
use a **programação** (ex.: 100 peças em 4 entregas a cada 7 dias).

**Os dois tipos de motivo.**

| Família | Motivos | Como se encerra |
|---|---|---|
| Expectativa de venda | Produção para estoque, Reposição, Antecipação de venda | O **pedido de venda consome** a demanda (só o pedido confirmado ou faturado; rascunho e orçamento não consomem): o MRP planeja o maior dos dois, nunca a soma. Pedido com entrega até 30 dias depois da data da demanda consome (parâmetros 46/47 da VPLN0100). Passada a janela sem venda, ela **vence** e sai do cálculo |
| Finalidade própria | Amostra, Feira, Consumo interno, Assistência, Projeto | A venda não consome. Ela segura o estoque até a saída: o que a OF da demanda entrega fica **reservado** para ela (nenhum pedido de venda pega). **Atender** lança a saída no estoque (com o tipo de movimento), consome a reserva e baixa o saldo da demanda. Estornar a saída na Central de Estoque devolve o saldo; encerrar a demanda libera a reserva |

**A demanda aberta mostra** o que a venda já consumiu, o que já saiu para a
finalidade, o que o **MRP vai planejar** e quanto disso já está **coberto por
ordens** (e quanto ainda está **sem ordem**); a aba **Ordens** mostra as ordens
que a cobrem (a sugestão firmada no MRP ou a OF aberta aqui), pelo número da OF.

**Aba Consumo.** Mostra que pedidos de venda consumiram a demanda (pedido, linha,
cliente, entrega e quanto). **Ver o consumo do item** abre o quadro do item
inteiro: a previsão por semana (prevista, consumida e o que sobra para o MRP), as
demandas de estoque e cada pedido — quanto ele consumiu e quanto vendeu **acima da
expectativa** (esse excedente o MRP planeja pelo próprio pedido).

**Janela e estratégia por item.** A janela de consumo e a estratégia são as da
política do item (VPLA0310) ou, sem ela, as dos parâmetros 46/47. Item **sob
encomenda** não aceita demanda de estoque, reposição ou antecipação de venda.

**Ações.** **Alterar** (só aberta), **Gerar OF agora** (urgência: abre a OF já
ligada à demanda; no próximo MRP ela é suprimento firme), **Atender** (finalidade
própria), **Cancelar** (nada saiu ainda) ou **Encerrar saldo** (já houve saída ou
ordem).

**Gerar OF agora** sugere a quantidade **sem ordem** e só aparece enquanto houver
saldo sem ordem: a demanda já coberta não abre uma segunda OF. Se a OF ligada for
cancelada (ou a ordem planejada excluída antes de virar OF), a quantidade volta a
ficar sem ordem e o botão reaparece. Vale só para item
**fabricado**: o comprado é atendido pela compra que o MRP sugere. Uma quantidade
maior (lote mínimo, múltiplo) é aceita, mas a demanda conta como coberto só o que
estava sem ordem. O **almoxarifado de destino** precisa ser da empresa em que você
está.

**Dica.** Não lance aqui os pedidos de venda: o MRP já lê o pedido confirmado
direto. Antes de 28/10/2026 a confirmação gerava uma demanda por linha, e o
pedido entrava duas vezes no cálculo; essas demandas foram canceladas.

**Telas relacionadas.** VMRP0100, VPRO0900, VEST0100, VPLN0100, VPRE0201.

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
| **Exceções** | As mensagens do cálculo com a ação na própria linha: reprogramar para a data que o cálculo pede, cancelar ordem sem demanda ou marcar como analisada (fica registrado quem tratou e como). **Horizonte firme**: a sugestão precisava começar dentro do horizonte firme (VPLA0310/parâmetros da VPLN0100) e foi para o fim dele; a mensagem diz quanto ela chega depois da necessidade — firme a ordem à mão se precisar antes e marque como tratada. **Demanda vencida** (estoque que passou da janela de consumo sem venda) e **demanda atrasada** (amostra, feira, projeto com saldo e data vencida): **Encerrar saldo** encerra a demanda (VPLA0102) ali mesmo. **Enviar as exceções por webhook ou e-mail** manda a lista do plano a quem precisa saber |
| **Rastreamento** | De cada pedido ou demanda até as compras dos componentes, e de uma ordem até quem depende dela — "esta compra serve a quem?" e "o que falta para este pedido sair?" |
| **Perfil do item** | O perfil por data: demanda, planejadas, firmes e estoque projetado — e quando o estoque fura. Também as regras configuradas do item: **Campo** `lead_time` (prazo em dias úteis) ou `lote_minimo`, o **Valor** e, se a regra for só para uma configuração, a **Condição da máscara** (igual, diferente ou faixa "mínimo-máximo"). Sem condição, a regra vale para o item inteiro |
| **Planos** | Cadastro dos planos (código, nome, abrangência, classificação) e as empresas inter-fábrica de cada plano. Na abrangência *um item de ordem*, busque o pedido pelo **número** e escolha a linha |
| **Relatórios** | Relatórios do plano em grade legível |

**De onde vem o prazo.** O MRP recua o início de cada ordem pelo prazo do item,
em dias úteis: a regra configurada do item (aba Perfil do item), se houver; senão,
para item **comprado**, o prazo de entrega do fornecedor preferencial do item; para
item **fabricado**, o tempo do roteiro. Sem nenhum deles, o prazo é zero. O tempo
de segurança e o horizonte firme (VPLA0310) entram depois.

**Firmar uma sugestão.** Vira ordem planejada firme; se for de **fabricação**, a
ordem de produção (VPRO0900) é criada na hora; se for operação **externa**, nasce
a requisição de serviço (VTPS0100). Ordens firmes não são mexidas pelos cálculos
seguintes.

**O que o MRP não planeja.** Item de terceiro, item com tipo MRP *projeto*, item
de estrutura comercial e item com estoque suficiente.

**Antes de calcular.** Itens prontos (VENT0200 (aba Prontidão)), estrutura (VENT0210), roteiro
(VENT0202), parâmetros de lote e segurança (VENT0200, aba Planejamento) e
fornecedor preferencial dos comprados.

**Telas relacionadas.** VPLN0100, VPRO0900, VPRO0200, VSUP0400 (cotação
de compra), VVND0200 (aba Atendimento).

---

#### VPRE0201 — Previsão de Vendas

**Para que serve.** Lançar a previsão de vendas por item.

**Como usar.**
- **Previsão semanal:** item, máscara, semana (1 a 53), ano e quantidade — grava
  direto na semana.
- **Previsão mensal:** item, mês, ano e quantidade mensal — o sistema reparte nas
  semanas pelos **dias úteis do calendário industrial**. *Aceita fração* permite
  quantidades quebradas; *Atualizar existente* sobrescreve o que já houver.
- **Consultar previsões:** por ano ou por item (o item prevalece sobre o ano).

**Abas.**
- **Gerar pelo histórico:** itens (e máscara), a **fonte** (pedidos ou faturamento) e
  o período do histórico; o período a gerar (semana e ano) e a **projeção %** (ex.:
  +10%). *Aceita fração* e *Atualizar existente* se for o caso. Grava nas previsões.
- **Gerar estatística:** item e histórico (AAAA-MM e quantidade, ao menos 2 períodos):
  o sistema escolhe o modelo que melhor explica o histórico, mostra o erro médio
  (MAPE %) e a quantidade prevista dos próximos períodos.
- **Previsto × realizado:** no ano, por item, o previsto contra o realizado (pedidos
  e/ou faturamento), a diferença e a aderência (% atendida).
- **Apropriação:** como a previsão semanal se reparte pelos dias da semana; a soma
  dos sete dias tem de dar 100%. *Definir como padrão* marca a tabela usada por
  omissão.
- **Bloqueio:** trava um período (início, fim e motivo) para ninguém alterar a
  previsão; semanas cuja segunda-feira cai no período são recusadas na gravação.

**Telas relacionadas.** VCAL0100, VVND0500.

---

#### VPLA0310 — Política de Planejamento por Item

**Para que serve.** Dar a um item, ou a uma classificação de itens, um jeito
próprio de ser planejado, em vez dos parâmetros da empresa (VPLN0100, Parâmetros).

**O que se define.**

| Campo | O que faz |
|---|---|
| **Estratégia** | **Consumo pela venda** (padrão): o pedido de venda consome a previsão e a demanda de estoque; o MRP planeja o maior dos dois, nunca a soma. **Sob encomenda**: só o pedido de venda gera necessidade; a previsão e a demanda de estoque do item não entram no MRP (amostra, feira e as outras finalidades continuam). |
| **Consumo: dias antes / depois** | A janela em que um pedido consome a previsão e a demanda de estoque, contada da entrega do pedido. Com 0 dias antes e 15 depois, o pedido só consome o que vem depois dele. |
| **Horizonte firme** | Dias corridos, a partir de hoje, em que o MRP não cria ordem nova para o item. A sugestão vai para o fim do horizonte e o MRP avisa. Para atender antes, firme a ordem à mão. |
| **Tempo de segurança** | Dias úteis que a ordem chega antes da necessidade. |
| **Lote por período** | **Por dia**, **por semana** (segunda a domingo) ou **por mês**: as necessidades do item no mesmo período viram uma ordem só, na data da primeira. Sem agrupamento, uma ordem por necessidade. A empresa tem o seu no parâmetro 50 (VPLN0100, Parâmetros). |
| **Lote máximo** | Só na política do item. A necessidade acima dele vira várias ordens, cada uma com no máximo esse valor (ajustado ao lote múltiplo do item); a última leva o resto. |

**Herança.** Campo vazio herda. A ordem é: a política do **item**; depois a da
**classificação** mais detalhada do item (a subfamília vence a família); por fim
os **parâmetros da empresa**. Cada campo herda sozinho: o item pode definir só o
tempo de segurança e herdar a estratégia da família.

**Como usar.**
1. **+ Nova política**, escolha **Vale para** (um item ou uma classificação) e
   preencha só o que muda. Uma política por item e uma por classificação.
2. **Alterar** troca os valores; o item ou a classificação não muda (exclua e
   cadastre outra).
3. **Excluir** devolve o item ou a classificação à herança.
4. **Política que vale para um item**: escolha o item e **Consultar** — mostra o
   valor final de cada campo e de onde ele veio (do item, da classificação ou
   parâmetro da empresa).

**Quando vale.** No próximo MRP e na hora, na posição das demandas (VPLA0102).
Demanda de estoque, reposição ou antecipação de venda de item **sob encomenda**
não se cadastra; a que já existia aparece como *Sob encomenda* e fica fora do
cálculo.

**Telas relacionadas.** VPLN0100, VPLA0102, VMRP0100, VPRE0201.

---

## Suprimento

*Fornecedores, pedido de compra, solicitação, cotação, contratos, recebimento e serviços de terceiros.*

#### VPCT0100 — Parâmetros de Compras

**Para que serve.** Definir quanto a nota de entrada ou o aviso de recebimento pode
divergir do pedido de compra e o que o sistema faz quando passa disso, e até que
valor o pedido aprova sozinho.

**Aba Tolerâncias de quantidade e preço.**
1. **Nova regra:** tipo (**quantidade**, **preço do item** ou **total dos
   produtos**), a que se aplica (NF de entrada, aviso de recebimento ou os dois),
   fornecedor (opcional — vazio vale para todos), intervalo mínimo e máximo,
   limite, unidade (% ou valor fixo) e **ação**: **avisar** ou **bloquear**.
2. **Avaliar (esperado × real):** informe os dois números e veja que regra dispara
   e qual ação resulta.

**Aba Alçadas de aprovação** (administrador grava). Para todos os fornecedores ou
para um: **aprova sozinho até** (R$), **bloqueia acima de** (R$, opcional) e
vigência. Na aprovação do pedido: até o primeiro valor passa direto; acima dele
precisa da autorização superior; acima do bloqueio nem ela libera. Vale a alçada
do fornecedor; sem ela, a geral; sem nenhuma, o pedido aprova sem controle de
valor. Uma alçada nova vigente substitui a anterior.

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
   documento, lote, observação). Abaixo, o **histórico da ordem**: cada mudança
   de situação e cada movimento, com data e documento.
4. **Conversões de unidade:** da unidade do fornecedor para a nossa (de, para,
   fator).

**De onde vem a ordem.** Da ordem de produção, quando o roteiro tem etapa externa
(a firmação no MRP já cria a requisição de serviço).

**Gerar ordens de uma OF** (aba Ordens de serviço, administrador): para a OF
criada antes de o roteiro ganhar a etapa em terceiro. Etapa que já tem ordem não
é duplicada, e OF encerrada ou cancelada não gera ordem.


**Telas relacionadas.** VENT0202 (operação externa), VPRO0900 (ordem de
fabricação).

---

#### VPDC0200 — Pedido de Compra

**Para que serve.** Formalizar a compra: o documento que vai ao fornecedor e que o
recebimento confere depois.

**Visões da tela.** **Pedidos** (o cadastro), **Sugestões do MRP**,
**Acompanhamento de entregas**, **Previsão de pagamentos** e **Histórico de compras**
(por fornecedor e item: pedido, recebido, cancelado, em aberto e preço de cada
linha; clique para abrir o pedido).

**Filtrar a lista de pedidos.** Situação, fornecedor, item (procura nas linhas do
pedido) e *entrega até*.

**Passo a passo (Pedidos).**
1. **Novo — aba Capa:** fornecedor, emissão, entrega prevista, moeda,
   observações e condição de pagamento. Grave a capa antes dos itens.
2. **Aba Transporte e pagamento:** frete (tipo, valor, em que momento e por quem
   é aplicado), transportadora, redespacho, talão, **adiantamento** (valor e data),
   incoterm e embarque.
3. **+ Item:** item, quantidade, preço unitário, entrega, almoxarifado, desconto,
   IPI, ICMS, tolerância, centro de custo, utilização, classificação fiscal e tipo
   de nota. Preço, unidade interna e IPI podem ficar em branco — o sistema busca
   na tabela de preço, nas conversões do item e na classificação fiscal. Sem
   classificação na linha, vale a de compra do cadastro do item (ou a de venda), e
   o IPI é o do NCM dela na tabela tributária (VFIS0110), o mesmo da nota. O painel
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
7. **Aba Notas e recebimentos:** que notas de entrada atenderam cada linha e,
   com o pedido aprovado, **Receber material** — para quando o material chega
   antes da nota. Informe, por linha, a quantidade recebida, o almoxarifado, o
   lote, a validade, a corrida e o certificado (obrigatórios quando o cadastro do
   item exige) e **Registrar recebimento**. Item com roteiro de inspeção entra no
   almoxarifado de inspeção e abre o lote (VINS0300). Quando a nota chegar, a
   entrada fiscal não lança de novo o que já entrou.
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

**Telas relacionadas.** VSUP0300 (solicitação), VSUP0400 (cotação),
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

**Telas relacionadas.** VSUP0130, VSUP0140 (transportadora), VPDC0200.

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

**Buscar preços das compras** (com a tabela aberta): período, fornecedor e origem
(pedidos, notas de entrada ou os dois) listam os preços praticados; marque os que
vão para a tabela e **Levar para a tabela**. Item que já tem preço só muda se
marcar **Substituir**. **Copiar descontos e acréscimos** leva a cadeia de um item
da tabela para outro (substituindo ou acrescentando).

**Telas relacionadas.** VPDC0200 (preço sugerido no pedido).

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

**Não confundir** com o *portador* (Cadastros de apoio da VCLI0500), que é o cadastro financeiro de
cobrança.

---

#### VSUP0130 — Fornecedor Preferencial por Item

**Para que serve.** Ligar o item aos fornecedores que o vendem, com ranking (o
preferencial), lead time, o código e a descrição do item no fornecedor e a UM.

**Por que importa.** O MRP e a geração de pedidos usam o fornecedor preferencial;
item comprado sem fornecedor não está pronto para o MRP (VENT0200 (aba Prontidão)). O código no
fornecedor é o que a importação da NF-e usa para reconhecer o item.

**Regra do código no fornecedor.** O código do fornecedor **não pode ser o código
atual de outro item nosso**: quem digitasse esse código num pedido ou numa nota
levaria o outro item. A tela recusa e diz qual item já usa o código. Nesse caso,
vincule o item sem o código do fornecedor ou peça ao fornecedor o código dele. A
mesma regra vale quando a entrada de nota (VFIS0210) aprende o vínculo: ali, a
recusa pede para desmarcar **lembrar vínculo** na linha, e a nota é lançada sem
memorizar o código.

**Laudos de qualidade** (ao abrir um vínculo): data, situação (pendente, aprovado,
rejeitado, expirado), arquivo PDF/PNG/JPEG até 10 MB e observação. O lote de
inspeção (VINS0300) lista e vincula esses laudos.

**Telas relacionadas.** VINS0300, VFIS0210.

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

#### VCON0200 — Contratos de Fornecedores

**Para que serve.** Registrar o contrato de fornecimento (quantidades e preços
acordados por um período) e acompanhar o saldo de cada linha.

**Como usar.**
1. A lista à esquerda mostra os contratos da empresa; filtre pela **situação**.
2. **Novo contrato:** **capa** (fornecedor, número, situação, descrição, moeda,
   vigência e índice de reajuste) e **linhas** (item, máscara, UM, quantidade
   contratada positiva, preço unitário e pedido mínimo). **Criar contrato** abre o
   contrato criado.
3. **Contrato aberto:** cada linha com contratada, consumida e **saldo**.
   **Baixar saldo** (só em contrato **Ativo**, sem passar do saldo) consome a
   quantidade informada. **Mudar situação** ativa, suspende, encerra ou cancela;
   encerrar e cancelar pedem confirmação, porque o saldo restante deixa de poder
   ser consumido.

**Telas relacionadas.** VPDC0200 (linha atende contrato).

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

## Almoxarifado

*Almoxarifados, estoque, inventário, lotes, expedição e o material de terceiros (beneficiamento).*

#### VLOT0100 — Máscaras de Lote/Série

**Para que serve.** Definir como o número de lote ou de série é formado (por partes:
texto fixo, data, sequência...) e gerar o próximo número.

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
4. Aba **Manufatura:** os parâmetros de estoque da produção (como a devolução
   escolhe o lote, baixa automática de lotes e a janela de movimentação; só o
   administrador grava) e os **endereços** de cada almoxarifado usados na baixa
   por endereço (incluir e inativar). O controle de lote e de endereço por item
   fica no cadastro do item.

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
| **Análises** | Giro, cobertura, itens parados, **acuracidade** das contagens, idade do estoque, **curva ABC** do valor consumido e lotes vencidos ou a vencer |

**Telas relacionadas.** VEST0200 (inventário e tipos de movimento), VEST0500,
VENT0800.

---

#### VEST0150 — Coletor de Estoque

Também recebe pedido de compra (informe o pedido, leia o item e digite o que chegou) e faz a contagem cíclica programada em VEST0500.

**Para que serve.** Operação do almoxarifado com leitor de código de barras USB ou Bluetooth, sem usar o teclado. O leitor lê o código e confirma sozinho.

**Como usar.** Escolha o almoxarifado e o modo:

- **Consultar:** leia um item, lote ou endereço para ver o saldo.
- **Separar:** escolha a onda e siga as paradas, lendo endereço e item. Leitura errada avisa na tela e com som.
- **Contar:** escolha o inventário, leia o endereço e o item e digite o que contou.
- **Mover:** leia o item, o endereço de origem e o de destino, e digite a quantidade.
- **Receber:** leia o endereço e o item do envio em trânsito que chegou.
- **Etiquetas:** imprima as etiquetas dos endereços e dos itens.

**Telas relacionadas.** VEST0100 (ondas), VEST0200 (inventário).

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
1. **Novo romaneio:** escolha o tipo (pedido de venda, pedido de compra ou ordem
   de fabricação) e busque o documento pelo nome; ou **Gerar** a partir de um
   pedido de venda escolhido na lista.
2. **Itens:** item, quantidade, depósito e pesos unitários. Confira cada item
   (planejado × conferido; a divergência fica marcada).
3. **Volumes / packing:** espécie, peso bruto, dimensões (a cubagem é calculada) e
   marca.
4. **Transporte & NF-e:** modalidade e valor do frete, placa, motorista,
   ANTT/lacres e previsão de entrega. **Vincular NF-e** (número e chave).
5. A **trilha de auditoria** registra cada evento do romaneio.

**Romaneio impresso (PDF e planilha).** Cada linha sai com o **código comercial**
do item. Item perigoso ou com condição de armazenagem gera, depois da tabela de
itens, a seção **Cuidados no transporte e na armazenagem** (ONU, classe e
condição), com o texto inteiro. Na tela, o mesmo aviso aparece acima dos itens.

**Aba Cargas.** A carga agrupa os romaneios que saem no mesmo veículo. O fluxo é
uma linha reta: romaneio conferido → entra na carga → liberar → carregar →
faturar → despachar.
1. **+ Nova:** descrição, transportadora, saída e entrega previstas, placa,
   motorista, rota, caixa de despacho (doca), origem e destino.
2. Abra a carga. Em **Romaneios prontos** aparecem os romaneios separados ou
   conferidos que não estão em outra carga: **Incluir** põe na carga, **Tirar**
   devolve (enquanto a carga está planejada ou liberada).
3. O botão do topo segue o fluxo: **Liberar carga** → **Iniciar carregamento** →
   **Concluir carregamento** → **Despachar**. **Cancelar** devolve os romaneios.
4. **Faturar carga** (carregando ou carregada): os itens e os preços vêm dos
   romaneios e o destinatário, do cadastro do cliente; confira série, datas, CFOP
   e natureza e clique em **Criar NF-e da carga**. A nota nasce como rascunho para
   transmitir na VFIS0200. Uma nota já emitida pode ser **vinculada** à carga.
5. **Orientações de entrega:** o recado ao motorista (para um cliente da carga ou
   para todos), com prioridade.

Sem carga aberta, a aba mostra as **caixas de despacho** (docas e posições da
expedição): cadastre o código, a descrição e a zona; a coluna *Ocupada por* diz
qual carga está nela.

**Telas relacionadas.** VVND0200, VFIS0200, VENT0200.

---

#### VBEN0100 — Beneficiamento — Remessas e Retorno Fiscal

**Para que serve.** Controlar o material que o **cliente** manda para a empresa
processar (industrialização por encomenda) e devolvê-lo na nota fiscal certa. O
material de terceiro tem controle próprio, separado do estoque da empresa.

**Antes de começar.** Cadastre o produto com a estrutura e o roteiro (VENT0210) e
marque o material que o cliente manda como **Fornecido pelo cliente
(beneficiamento)**. Implante o **pedido de venda** do serviço para o cliente
(VVND0200), com a natureza de beneficiamento.

**Fluxo.**
1. **+ Receber remessa:** cliente proprietário, **pedido de beneficiamento** (a
   busca mostra só os pedidos abertos desse cliente), número da NF-e, emissão,
   recebimento, prazo de retorno, valor e chave de acesso. Confira item a item
   (quantidade da nota × conferida; divergência exige motivo). Em **Item do cadastro**,
   busque o item: descrição, NCM, unidade e CST vêm dele, e o código e o valor do
   cliente vêm da última remessa, quando houver. **Item do cliente** lista os materiais
   já recebidos desse cliente, ou aceita um código novo. Colar a chave preenche o número
   da nota. Sem pedido, ou com divergência, a remessa
   entra **bloqueada** e não pode ir para a produção.
2. **Vincular pedido:** quando o material chega antes do pedido, vincule-o depois.
   Se a remessa estava bloqueada só por falta de pedido, o material é liberado.
3. **Movimentos** (na grade de itens): retorno, sobra, sucata (exige destinação) e
   ajuste (exige justificativa), com a busca da ordem de fabricação. Você escolhe
   o **tipo** do movimento; o CFOP é aplicado pelo sistema.
4. **Faturar:** a aba **Faturamento** já vem preenchida — a linha do pedido com o
   saldo a faturar, o serviço com descrição, quantidade e preço do pedido, e a
   devolução do **saldo inteiro** de cada item. Ajuste o que for preciso e use
   **Gerar nota**: sai uma nota única com o **serviço** (CFOP 5124) e a
   **devolução do material** (5902; sobra e sucata em 5903). A nota nasce em
   rascunho e a remessa mostra **Nota em rascunho**: use **Transmitir** ali mesmo
   ou pela VFIS0200. Se a SEFAZ rejeitar, a remessa mostra o motivo; **Descartar**
   devolve o saldo e tira o atendido do pedido, para corrigir o dado (a inscrição
   estadual do cliente, por exemplo) e faturar de novo. A cobrança (duplicata e conta a receber) é
   **só do serviço** — o material volta ao cliente e não é cobrado. Quando a nota
   é autorizada, a linha do pedido é dada por atendida.
5. **Liberar material**, **Bloquear** (com motivo) ou **Encerrar** a remessa
   (encerrar com saldo ainda aqui exige motivo).

**Consultar.** A lista à esquerda filtra por cliente (barra de ferramentas) e
pelas abas rápidas **Com material aqui**, **Prazo até 5 dias**, **Bloqueadas** e
**Encerradas**; a busca acha por NF-e, pedido ou item. Os indicadores do topo
levam ao filtro correspondente. A aba **Histórico e auditoria** mostra quem
alterou o quê, quando, o valor antes e depois e o motivo.

**Telas relacionadas.** VBEN0200, VBEN0300, VFIS0200, VVND0200, VENT0210, VPRO0900.

---

#### VBEN0200 — Estoque de Terceiros — Material do Cliente

**Para que serve.** Ver o material do cliente que está na empresa, separado do
estoque próprio (os dois nunca se somam), e a movimentação dele.

**Inventário (saldo atual).** O saldo por cliente proprietário e pelo código do
item **como aparece na nota do cliente** (é com ele que o retorno fiscal sai),
ordenado pelo **prazo fiscal mais próximo** — o que precisa voltar primeiro —, com
as remessas e o item interno correspondente.

**Movimentação (entrada e saída).** Escolha o período e o tipo: entradas
(recebimento da remessa), saídas (retorno, sobra, sucata, ajuste) ou um tipo só.
Cada linha traz a NF-e do cliente, o item, a quantidade, o CFOP, a nota de saída
com a situação e a ordem de fabricação. Marque **Mostrar estornados** para ver os
movimentos desfeitos pelo cancelamento da nota de saída.

Filtre por cliente e por item na barra de ferramentas. **Exportar** gera a lista da
aba aberta.

**Telas relacionadas.** VBEN0100, VBEN0300, VEST0100.

---

#### VBEN0300 — Horas de Beneficiamento

**Para que serve.** No beneficiamento a produção não consome estoque próprio: o
que a empresa vende é o trabalho. Esta tela mostra as **horas trabalhadas** em
cada ordem de fabricação de beneficiamento, por cliente e pedido.

**Como usar.** Escolha o período e, se quiser, o cliente e o pedido (com o cliente
escolhido, a busca de pedido mostra só os dele). Entra a ordem do produto que tem,
na estrutura, material **fornecido pelo cliente**, com hora registrada no período.
Para cada ordem aparecem as **horas apontadas** (início e fim dos apontamentos), o
número de apontamentos e as **horas lançadas nas operações** do roteiro; quando as
duas diferem, a célula fica destacada — alguém apontou num lugar e não no outro.

Ordem aberta à mão aparece **sem cliente**: use **Vincular pedido** na linha para
ligá-la ao pedido de venda.

**Telas relacionadas.** VBEN0100, VPRO0900, VPRO0210.

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
   A lista à esquerda filtra por **situação** (aberto, nacionalizado, cancelado).

**Telas relacionadas.** VFIS0210 (NF de entrada de
importação).

---

## Inspeção

*Qualidade: lote de inspeção, amostragem NBR 5426, CAPA/8D, metrologia, certificados, documentos e avaliação de fornecedores.*

> **Como a qualidade se organiza.** A inspeção de recebimento, de processo e final
> usa um só objeto, o **lote de inspeção** (VINS0300). A amostragem segue a NBR
> 5426 (VINS0110); a não conformidade é tratada por CAPA/8D (VINS0500); os
> instrumentos ficam na metrologia (VINS0600); o certificado ao cliente e os
> documentos controlados, nas VINS0700 e VINS0800.

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
- O desenho de engenharia continua na VDES0100.

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
- **Manual, final ou devolução:** **Novo lote manual** (origem, item e
  fornecedor escolhidos pela busca, quantidade, almoxarifado de inspeção e
  lote/corrida).

**Consultar.** A lista filtra por situação, origem, item e fornecedor; o botão
Exportar leva a lista para planilha ou PDF.

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
fornecedor (VSUP0130): os do fornecedor do lote, ou os de todos os fornecedores do
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

**Roteiros cadastrados** (barra da tela): escolha na lista o roteiro (por item ou
classificação, com a vigência) para conferir as etapas.

**Aba Processo e final (planos).** Escolha o item e crie o plano de inspeção de
processo, final ou recebimento: descrição, amostra e quantos defeitos aceita.
Em **Características**, cadastre o que medir (nominal, tolerâncias, unidade e se
é crítica). O lote de inspeção (VINS0300) copia essas características ao abrir.
O plano de uma etapa do roteiro de fabricação é cadastrado na própria etapa
(VENT0202). **Desativar** tira o plano dos lotes novos.

**Telas relacionadas.** VINS0300, VINS0110, VINS0600, VENT0202.

---

#### VAVF0300 — Avaliação de Fornecedores

**Para que serve.** A ficha de avaliação de cada fornecedor: o **IQF** (Índice de
Qualificação de Fornecedores) e a **homologação**.

**Como usar.** Escolha o fornecedor na barra e o período avaliado.
- **Aba IQF:** informe as notas **comercial** e de **atendimento** (0 a 100) e
  **Calcular (prévia)** ou **Calcular e gravar**. Qualidade (peças aprovadas na
  inspeção) e entrega (recebimentos no prazo) vêm do histórico do período. Pesos:
  qualidade 40%, entrega 30%, comercial 20%, atendimento 10%. Abaixo, o histórico dos
  IQF gravados.
- **Aba Homologação:** as faixas (homologa a partir de, condicional a partir de),
  a situação (vazio = decidida pelo IQF do período), a categoria, a validade e a
  observação. A lista mostra as decisões anteriores. **Gerar os vínculos item ×
  fornecedor** cria na VSUP0130 o vínculo de todos os itens já comprados dele.

**Telas relacionadas.** VINS0300 (inspeção), VSUP0130, VSUP0500.
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

**Para que serve.** O cadastro **único** de condição de pagamento: é a condição que
cliente, fornecedor, orçamento, pedido de venda e de compra e o faturamento usam.

**Como usar.**
1. **Condição:** descrição, portador, tipo de análise de crédito, início das
   parcelas, despesas, prazo médio, *Especial*, *Gera receita* e *À vista*.
2. **Parcelas:** escolha a condição na lista e informe percentual do total, de
   quando conta o prazo (emissão, entrada, entrega ou faturamento), dias para o
   vencimento e documento. A tela mostra a soma dos percentuais — a condição só
   fecha em 100%. Todos em branco = partes iguais. Entrada é pagamento no ato.
3. **Conferir em dinheiro:** informe um valor e a data de entrega e veja os
   vencimentos que a condição gera, sem gravar nada.

**Tipo de análise de crédito.** *Sempre analisa*, *Bloqueia sempre* ou *Libera
sem análise*. Condição sem *Gera receita* não cria conta a receber (amostra,
operação interna).

**Mudança.** Antes havia dois cadastros: esta tela gravava uma lista à parte, que
nenhum pedido lia. As condições que existiam só nela foram copiadas para cá na
atualização (mesmo nome e prazos; percentual em partes iguais).

**Telas relacionadas.** VCLI0500 (condição do cliente), VSUP0500, VVND0200, VCST0202.

---

#### VFIN0120 — Plano de Contas Gerencial

**Para que serve.** O plano **gerencial** da empresa — o que classifica títulos a
pagar e receber, a DRE e o rateio: código, descrição, conta pai, tipo (sintética ou
analítica), natureza e situação. Não confundir com o **plano contábil** (VCTB0200),
que é o do SPED: cada conta gerencial aponta para uma conta contábil, e a coluna
**Conta contábil** mostra esse vínculo (feito na VCTB0200, aba Contabilização
automática).

**Como usar.** **+ Nova Conta** ou clique numa conta para alterar. A lista vem em
**ordem natural** do código (2.1.9 antes de 2.1.10) e mostra o nível.

**Exige centro de custo.** Na alteração da conta, marque *Exige centro de custo*:
o título a pagar (no rateio ou sem rateio) e o item da nota de entrada nesta conta
não são aceitos sem centro de custo.

**Telas relacionadas.** VFIN0200 (título por plano), VCTB0200, VFIN0500 (DRE),
VCTB0102 (centros de custo).

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
- **Parcelar este título:** marcado, troca vencimento e parcela por um plano de
  parcelas que combina percentual e parcelas, como 30% de entrada mais 2 parcelas ou
  3 parcelas e 40% ao final. Nasce um título por parcela, numerado como "DOC 1/3", e
  desconto e rateio são repartidos sem perder centavos. Ou todos são criados, ou nenhum.

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

4. **Cancelar:** desfaz um adiantamento lançado por engano, enquanto nada dele foi
   aplicado. Peça o motivo; o valor volta para a conta bancária com um lançamento
   inverso no fluxo de caixa e o adiantamento fica **Cancelado**, sem saldo.

**Regras.** Adiantamento pago a fornecedor só abate conta a pagar; recebido de
cliente só abate conta a receber, e sempre do **mesmo parceiro**. O valor aplicado
não passa do saldo do adiantamento nem do que falta pagar no título (já
descontados pagamentos, descontos e outros abatimentos). Título quitado ou
cancelado não recebe aplicação. Adiantamento com aplicação não pode ser cancelado.

**Contabilidade.** Com a contabilização de pagamentos (ou de recebimentos) ligada
na VCTB0200, o adiantamento é contabilizado sozinho: pago a fornecedor entra em
*Adiantamentos a fornecedores* contra o banco; recebido de cliente, no banco contra
*Adiantamentos de clientes*. A aplicação passa o valor para Fornecedores/Clientes (ou
para a despesa/receita do título avulso), e o cancelamento estorna a entrada. Sem
essas contas configuradas, a tela avisa o que falta e não lança.

---

#### VFIN0610 — Remessa Bancária CNAB 240

**Para que serve.** Gerar o arquivo de remessa CNAB 240 dos títulos em aberto e
baixá-lo para enviar ao banco. Só o administrador gera a remessa.

**Passo a passo.**
1. Escolha a **conta bancária**: banco, agência e conta vêm do cadastro; a empresa,
   da Configuração Fiscal.
2. Informe o que foi combinado com o banco: **convênio**, carteira, espécie do título
   e o **número da remessa** (cada arquivo enviado usa o número seguinte).
3. Marque os **títulos**. O pagador de cada um vem do cadastro do cliente.
4. **Gerar remessa** baixa o arquivo. Se faltar CNPJ ou endereço de um cliente, a tela
   diz qual é, para corrigir antes.

**Atenção.** Gerar o arquivo não marca o título como enviado, e o retorno do banco é
outra etapa. Antes do primeiro uso, valide o arquivo com o banco.

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
  Para o beneficiamento fora de SP, preencha com a contabilidade o **cBenef da
  suspensão** e o **Texto legal da nota de retorno de industrialização**: sem o
  texto, a nota de retorno não é gerada.

**Telas relacionadas.** VEMP0100 (identificação), VFIS0320, VFIS0325.

---

#### VFIS0110 — Tabelas Tributárias

**Para que serve.** As tabelas que alimentam o cálculo de toda nota e a carga
tributária aproximada do rodapé.

**Abas.**
- **Tributação por NCM:** NCM (8 dígitos), descrição, alíquotas de IPI, PIS e
  COFINS e os CSTs. Abrir um NCM e salvar substitui a tributação dele.
- **ICMS dentro do estado:** por UF, a alíquota interna de ICMS e a do FCP.
- **ICMS entre estados:** por par origem → destino, a alíquota interestadual
  (origem e destino iguais é operação interna — use a aba anterior).
- **IBPT (carga aproximada):** consulte, por NCM e UF, a carga federal (nacional e
  importado), estadual e municipal que sai no rodapé da nota (Lei 12.741). O
  administrador importa o CSV oficial do IBPT de cada UF; cada versão fica
  guardada e vale a vigente.

As alíquotas aparecem e são digitadas em **%**.

**Quem altera.** As tabelas são a lei e valem para **todas as empresas** do sistema:
só o administrador altera; os demais consultam. Exceções da empresa (redução,
substituição, benefício) são cadastradas na VFIS0320.

**Qual alíquota a nota usa.** A regra da VFIS0320 vence; sem regra, vale esta
tabela (a alíquota interna do estado do emitente, a interestadual e a do NCM); e
só se o estado não estiver aqui vale o ICMS interno da Configuração Fiscal
(VFIS0100).

**Desativar** (na linha do NCM) tira a tributação do NCM.

**Telas relacionadas.** VFIS0350, VFIS0320, VFIS0100.

---

#### VFIS0200 — NF-e de Saída

**Número e série.** A nota recebe número e série na autorização, seguindo a sequência configurada para a empresa no painel da Focus NF-e. Até lá ela aparece sem número.

**Tipo de nota.** Vem dos Cadastros de apoio da VCLI0500, aba Tipo de NF de saída, e decide se a nota gera título, mexe no estoque, baixa o pedido e entra como receita. Bonificação e remessa, por exemplo, saem sem pagamento.

**Conferência antes de sair.** A prévia e a transmissão conferem emitente, destinatário, datas (emissão no futuro ou com mais de 30 dias impede), nota de origem, NCM, CFOP e as contas de linha e total. O que impede aparece em Pendências, com o que fazer.

**Para que serve.** Emitir, transmitir e acompanhar a NF-e de saída: venda,
devolução, remessa, beneficiamento.

**Criar a nota.**
- **Faturar pedido de venda:** escolha o pedido; a tela mostra cliente, endereço,
  representante, condição de pagamento e as linhas com o que falta faturar.
  Fature tudo ou parte (desmarque linhas ou reduza quantidades); o resto continua
  pendente. Cada pedido mostra as notas já emitidas para ele.
- **+ Nova NF-e:** a nota avulsa, em três partes:
  - **Destinatário:** em **Cliente cadastrado**, busque o cliente por nome, código
    ou CNPJ: razão social, CNPJ/CPF, inscrição estadual, endereço e contato vêm do
    cadastro. Com mais de um endereço, escolha em **Endereço da nota**. Para uma
    entrega pontual, use **Alterar endereço só nesta nota**; o cadastro não muda. Em
    **Sem cadastro**, digite o CNPJ ou CPF (**Buscar** completa os dados pelo CNPJ)
    e o endereço. Se o documento já for de um cliente, a tela oferece usar o cadastro.
  - **Itens:** busque o item por código ou descrição: descrição, NCM, unidade, origem,
    CFOP e o preço da tabela de venda vêm sozinhos, e tudo pode ser ajustado na
    linha. Sem item do cadastro, escreva a descrição e preencha o NCM.
  - **Dados da nota:** o **CFOP** é sugerido pela UF e pela inscrição estadual do
    destinatário (item comprado sai como revenda); depois vêm natureza da operação,
    emissão, saída, série, número (em branco, usa o próximo), **finalidade da
    compra**, **tipo de nota**, frete, seguro, desconto, carga de expedição e
    informações complementares. Marque a opção do cupom quando a nota substituir
    um cupom fiscal.

  O total fica sempre à vista, e **Criar rascunho** aponta o que falta antes de
  criar a nota. Criada, ela abre direto na prévia.

**Prévia (conferência).** Antes de transmitir, **Prévia** mostra as **pendências**,
cada uma com nível (*impede* ou *atenção*) e **como resolver**, os itens com ICMS,
IPI, ST/DIFAL, PIS/COFINS e IBS/CBS (com o cClassTrib, ajustável por linha), os
totais e o pagamento. No fim, **Documento que será transmitido** traz a própria nota
no layout do DANFE, como o cliente vai receber; o que falta sai em vermelho, e a
chave e o protocolo só existem depois da autorização. Exemplos: item sem
regra quando a empresa exige; CST com benefício sem o cBenef (PR, RS, RJ, SC, GO e
DF exigem).

**Ações na lista.** Busque por número, destinatário ou CNPJ e filtre pela situação.
- **Status:** abre a situação da nota na SEFAZ, com chave, protocolo e motivo. Nota
  sem envio registrado por este sistema não tem o que consultar, e a janela avisa.
- **DANFE:** abre o PDF da nota transmitida. **Baixar XML** fica na janela de Status.
- **Nova CC-e:** de 15 a 1000 caracteres. Não corrige valores, impostos, quantidade,
  CFOP, destinatário nem datas. **Ver CC-e** lista as cartas registradas.
- **Efeitos:** mostra se títulos, estoque e pedido foram atualizados e permite
  **Reprocessar agora** quando algo ficou pendente.
- **Cancelar:** justificativa de 15 a 255 caracteres. O cancelamento vai à SEFAZ; sem
  o token da empresa em VFIS0100, a nota transmitida não é cancelada.

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

**Inutilizar numeração** (barra, Visão): para números que não vão ser usados
(pulados ou de nota rejeitada). Informe série, número inicial e final (vazio = só
o inicial) e a justificativa de 15 a 255 caracteres. A SEFAZ registra e **não se
desfaz** — a tela pede confirmação.

**Telas relacionadas.** VVND0200, VFIS0320, VFIS0325, VFIN0210, VEXP0100.

---

#### VFIS0210 — NF-e de Entrada

**Conferência do XML.** A nota é recusada quando foi emitida para outra empresa, quando a chave de acesso não confere com número, série, emitente, UF ou mês, quando a SEFAZ não a autorizou ou, em produção, quando é de homologação.

**Lançamento manual.** Informe também ICMS-ST e outras despesas, quando houver. A chave é conferida com os dados digitados, e as somas de produtos, IPI, ICMS e total precisam fechar com a nota. Em Pendências aparece tudo o que impede a aprovação.

**Parcelas.** Monte o parcelamento pelo plano de parcelas, combinando percentual e parcelas, e use Distribuir proporcionalmente para repartir no plano de contas.

**Para que serve.** Dar entrada nas notas dos fornecedores: importar, conciliar com
o cadastro, distribuir as parcelas por plano de contas e aprovar — o que gera o
contas a pagar, a entrada no estoque, a baixa do pedido e a contabilização.

**Formas de trazer a nota.**
- **Importar o XML** (um ou vários de uma vez; o DANFE em PDF não serve).
- **Importar pela chave** (44 dígitos) — busca na SEFAZ via Focus.
- **Notas recebidas na SEFAZ:** as notas emitidas contra o CNPJ da empresa chegam
  antes da mercadoria. **Manifeste** (a confirmação encerra o prazo; o
  desconhecimento protege contra nota fria) e importe. Nota que não apareceu na
  lista: **Manifestar por chave** (44 dígitos).
- **Lançamento manual** (nota sem XML, modelo 1/1A, serviço avulso). Escolha o
  **fornecedor cadastrado** e razão social, CNPJ, inscrição estadual e UF vêm do
  cadastro; **sem cadastro**, busque o CNPJ na Receita. Colar a chave preenche número,
  série e modelo. Ao escolher o item, NCM, unidade e descrição vêm do cadastro, e o
  CFOP é sugerido pela UF. Plano de contas, centro de custo e almoxarifado ficam na
  segunda linha de cada item. A mesma nota do mesmo fornecedor não entra duas vezes.
  - **Código no fornecedor:** informe o código impresso na nota. Com o vínculo já
    cadastrado (VSUP0110), o item do cadastro vem sozinho. Código novo: escolha o item
    e deixe **Lembrar vínculo** marcado para a próxima nota já reconhecer. Se o
    código do fornecedor for o código atual de outro item nosso, o vínculo é
    recusado e a mensagem diz qual item o usa: desmarque **Lembrar vínculo** e
    lance a nota sem memorizar.
  - **Preço, ICMS % e IPI %:** valem os da nota do fornecedor. O sistema sugere o
    preço (pedido de compra em aberto ou última compra) e as alíquotas (tabelas
    fiscais); o que você digita prevalece. Confira com a nota: fornecedor do Simples,
    por exemplo, pode não destacar ICMS.
  - **Pagamento:** o plano vem da condição de pagamento do fornecedor e pode ser
    combinado à vontade (veja *Plano de parcelas* abaixo).

**Passo a passo.**
1. **Itens e conciliação:** cada produto da nota é ligado ao item do cadastro.
   O vínculo produto × fornecedor concilia sozinho; os demais vêm com
   **sugestões** (descrição parecida só sugere — nunca liga sozinha). Item
   perigoso ou com condição de armazenagem aparece num aviso no topo da nota (ONU,
   classe e como armazenar), para quem vai receber o material. Também é
   possível cadastrar o item novo com os dados da nota. Escolha a **operação de
   entrada** (padrão dos itens), o almoxarifado e o **pedido de compra** (e a
   linha) que a nota atende.
2. **Plano de contas** de cada item (sugerido pelo último uso ou pela conta do
   fornecedor) e o centro de custo.
3. **Parcelas × plano de contas:** as duplicatas do XML (sem duplicata, uma à
   vista). Cada parcela é distribuída pelos planos na proporção dos itens; dá para
   mudar (ex.: 1ª parcela toda EPI). **Gerar parcelas iguais**, **Distribuir
   proporcionalmente** e **Fechar** (a última conta leva os centavos). O plano de
   parcelas pode ser aplicado aqui com **Aplicar às parcelas**. A coluna **Duplicata**
   é o número da duplicata do fornecedor: vem do XML e, em nota sem duplicata, é
   preenchida como número da nota/parcela.
4. **Retenções na fonte**, quando houver (viram títulos a recolher).
5. **Conferência:** as divergências contra o pedido (preço, quantidade, imposto)
   com o esperado e o que veio na nota.
6. **Aprovar:** só com tudo conciliado e classificado, parcelas fechando com o
   valor a pagar e nenhuma divergência que bloqueie. Gera um título por parcela,
   a entrada no estoque, a baixa do pedido e a contabilização. O material de item
   com roteiro de inspeção vai para o almoxarifado de inspeção (VINS0300).

**Plano de parcelas.** Monte o pagamento em blocos, cada um com percentual ou valor,
o número de parcelas e os dias: por exemplo, 30% de entrada e o restante em 2
parcelas, ou 3 parcelas e 40% ao final. Um bloco pode ficar com **o que sobrar**. Se
os blocos não fecharem com o total, a tela avisa e não aplica.

**Operação de entrada.** As opções vêm do cadastro em VFIS0360; operação nova já
aparece na lista, sem precisar entrar de novo no sistema.

**Cancelar a NF.** Com motivo (pelo menos 10 caracteres): estorna estoque e
cancela os títulos. O material sai pelo mesmo valor com que entrou, e o custo médio do
item volta ao que era antes da nota.

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

Remetente e destinatário podem vir do cadastro de clientes: a busca acima dos campos
preenche documento, nome, município e UF.

**Para que serve.** Registrar e emitir CT-e: número, série, CFOP, datas, emitente
(transportadora), tipo de rateio, frete, seguro, outros, ICMS e a NF-e de entrada
vinculada.

**Emitir na SEFAZ.** Além do registro, preencha os **dados de emissão**: natureza,
finalidade, tomador, RNTRC, município e UF de início e de fim, produto
predominante, valor da carga, remetente e destinatário. Sem o trajeto e as partes,
o CT-e fica só como registro local (para apropriar o frete).

**Telas relacionadas.** VFIS0210 (frete sobre compras).

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
Também concentra a redução e a substituição de ICMS.

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
tabela 5.1.1 da UF — confira na aba Ajuste de apuração da VFIS0510 ou com o contador), a conta do ativo padrão
e o número de parcelas (48).

**Telas relacionadas.** VFIS0210 (nota de entrada), VFIS0360 (tipo de operação),
VFIS0510 (códigos de ajuste), VCTB0200 (plano contábil).

---

#### VFIS0350 — Classificações Fiscais

**Para que serve.** As classificações fiscais (NCM com os padrões) que os itens
herdam.

**Blocos.**
- **Identificação:** descrição, NCM e CEST.
- **Padrões herdados pelos itens:** vigência, origem padrão (0 a 8) e UM de
  tributação.
- **Impostos da nota:** a classificação **não guarda alíquota**. Na nota, o IPI e
  as exceções de PIS/COFINS (monofásico, alíquota zero, suspensão) vêm do NCM na
  tabela tributária (VFIS0110); o ICMS vem da UF e das regras (VFIS0320); o PIS e
  a COFINS, do regime da empresa. O campo **IPI do NCM (VFIS0110)** mostra, só
  para leitura, a alíquota que a nota vai usar; para mudá-la, altere o NCM na
  VFIS0110. Ficam aqui a **Apuração** (EFD e devolução de compra) e o
  **cClassTrib (IBS/CBS)**.
- **Idiomas** e **Atributos de exportação**.

**Regras.**
- A lista mostra a coluna **IPI do NCM**. NCM fora da tabela aparece sem
  alíquota: cadastre-o na VFIS0110 antes de faturar.
- O **pedido de compra** sugere o IPI da linha por esta classificação (a de
  compra do item, ou a de venda quando a de compra está vazia), pelo mesmo NCM.

**Telas relacionadas.** VENT0200 (aba Contábil), VFIS0110, VFIS0320, VPDC0200, VFIS0670.

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

#### VFIS0510 — Tabelas da Apuração de ICMS

**Para que serve.** As tabelas de códigos oficiais que quem fecha a apuração do ICMS
mantém, uma por aba:

- **Ajuste de apuração (5.1.1):** códigos de ajuste da apuração do ICMS do SPED —
  código, UF, vigência e descrição.
- **Ajuste de ICMS (5.2 a 5.7):** códigos de ajuste de documento das tabelas 5.2,
  5.3, 5.6 e 5.7 — código, UF, tabela, vigência e descrição.
- **Linhas de apuração:** código, descrição, tipo, se aceita lançamentos e natureza.
- **Motivos de transferência DAPI:** código, motivo, UF de destino e vigência.

---

#### VFIN0400 — Apuração de Impostos

**Para que serve.** Apurar os impostos de uma competência e manter o resumo do ICMS
que entra no SPED. Fica na pasta Fiscal.

**Aba Apuração.** Informe a competência (AAAA-MM) e apure (ou carregue uma apuração
já feita): débitos (saídas), créditos (entradas) e o saldo a recolher de cada
imposto, uma linha por imposto.

**Aba Lançamentos resumo de ICMS.** Os lançamentos de resumo por período, UF e
CFOP (base e valor), as notas de cada lançamento e os registros adicionais (C197 /
processos).

**Telas relacionadas.** VFIS0510 (tabelas da apuração), VFIS0340 (Simples), VFIN0500.

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

Em **Tomador**, o campo **Cliente** busca no cadastro e preenche documento, razão
social, endereço e e-mail; o que for específico desta nota continua editável.

**Para que serve.** Emitir a nota fiscal de serviço.

**Como usar.** **RPS:** número, série, emissão, optante do Simples e município do
prestador. **Tomador:** CNPJ/CPF, razão social e endereço. **Serviço:** item da
lista de serviço, código de tributação do município, discriminação, valor,
deduções, **alíquota do ISS** (em %) e ISS retido. A tela mostra o
ISS e o líquido. Depois **Autorizar**; **Cancelar** exige justificativa de 15
caracteres.

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

## Contabilidade

*Plano contábil, lançamentos, balancete, contabilização automática e ECD.*

#### VCTB0102 — Centros de Custo

**Para que serve.** O cadastro único de centros de custo: hierarquia, vigência, o responsável, o aprovador das requisições, a
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
(rateio), VPDC0200 (requisições).

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
  Em *Pagamentos e recebimentos* ficam também as contas de **Adiantamentos a
  fornecedores** e **Adiantamentos de clientes**, usadas pelos adiantamentos da
  VFIN0600.
- **SPED ECD:** gera e baixa o arquivo da ECD (Escrituração Contábil Digital) com o
  plano, os lançamentos e os dados cadastrais do período. Escolha o plano e o
  período, informe NIRE, e-mail e número do livro e clique em **Gerar arquivo da
  ECD** (só o administrador). Os dados da empresa vêm da Configuração Fiscal
  (VFIS0100). Valide o arquivo no programa da Receita antes de entregar.

**Telas relacionadas.** VFIN0120, VFIS0210, VFIN0600.

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
- **Setores:** cadastre os setores da empresa (ex.: COMPRAS, PCP), com código e
  nome, e marque as pessoas de cada um. Um setor desativado continua nos
  registros antigos, mas não é oferecido de novo. Os setores dizem **quem
  responde** por cada grupo de itens (VITE0116 — Grupos e modificadores).

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

**Contatos e funções** (ao editar): telefones e e-mails (com o principal), as
funções do funcionário com centro de custo e se é supervisor ou gestor, e o
limite de crédito. Só o administrador grava.

---

#### VLOC0100 — Localização (Países e UFs)

**Para que serve.** Os países (sigla, nome, DDI, código BACEN, SISCOMEX) e as UFs
(sigla, nome, país, código IBGE) — a base dos endereços e das regras fiscais. É o
único cadastro de países e UFs do sistema; mexe-se nele na implantação.

**Como usar.** Aba **Países** ou **UFs**: preencha e **Adicionar**; **Editar** na
lista. Na UF, o país é escolhido da lista e não muda depois de criada.

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
preservados). Na grade do mês, **clique no dia** para alternar útil e não útil (em
negrito, os dias já registrados; os demais seguem o padrão de segunda a sexta). Para
registrar com descrição (ex.: feriado municipal), use *Registrar dia com descrição*.

**Telas relacionadas.** VPME0102ITE, VPRE0201.

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

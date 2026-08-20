# Task backend — ajustes operacionais de calendário, itens, fornecedores, produção e relatórios

## Objetivo

Entregar os contratos e regras de negócio necessários para os ajustes solicitados
no ERP, preservando isolamento por empresa, auditoria, compatibilidade e integridade
referencial. O frontend será integrado somente após os endpoints estarem publicados
e documentados no ambiente de desenvolvimento.

## 1. Calendário industrial automático

- Criar uma operação idempotente para gerar um mês ou ano completo.
- Regra inicial: segunda a sexta = dia trabalhado; sábado e domingo = não trabalhado.
- Permitir informar feriados e exceções depois da geração, sem recriar ou duplicar dias.
- Não sobrescrever uma alteração manual ao executar a geração novamente.
- Sugerido: `POST /api/industrial-calendar/generate`, com `year`, `month` opcional,
  `weekdays` opcional e resposta com quantidades criadas, preservadas e ignoradas.
- `GET /api/industrial-calendar/month/{year}/{month}` deve retornar todos os dias do
  mês e a origem da regra (`AUTO`, `WEEKEND`, `HOLIDAY`, `MANUAL`).

## 2. Um item interno para descrições diferentes de fornecedores

Criar o vínculo item × fornecedor × identificação do fornecedor. Um mesmo item
interno deve aceitar vários fornecedores e, para cada um, código, descrição e unidade
usados na nota/pedido daquele fornecedor.

Campos mínimos: `item_code`, `supplier_code`, `supplier_item_code`,
`supplier_description`, `supplier_uom`, fator de conversão, preferência e vigência.
Impedir duplicidade ativa do mesmo identificador dentro do fornecedor/empresa.
Disponibilizar busca por código ou descrição externa para que a entrada fiscal resolva
o item interno sem criar uma segunda matéria-prima. Registrar a resolução na nota para
rastreabilidade.

## 3. Código alfanumérico para produtos de venda

Hoje o contrato de item usa `code` numérico em rotas, DTOs e relacionamentos. Migrar
com retrocompatibilidade para código de negócio alfanumérico (ex.: `PA-SUP-SOLD-001`):

- definir tamanho, caracteres aceitos, normalização e unicidade por empresa;
- não converter para número nem remover zeros à esquerda;
- atualizar chaves estrangeiras/DTOs/rotas de item, BOM, estoque, compras, produção,
  vendas, fiscal, custos e relatórios;
- preferir uma chave interna imutável (`id`) para relacionamentos e manter `code` como
  identificador de negócio alterável somente com regra/auditoria;
- manter leitura dos códigos numéricos existentes durante a migração;
- documentar estratégia de migração, rollback e impacto em integrações.

O handoff deve listar todos os endpoints alterados. Sem isso, o frontend não deve
apenas trocar `<input type="number">` por texto, pois quebraria buscas e vínculos.

## 4. Logo no relatório VITM0100

O cabeçalho de PDF é produzido por `POST /api/reports/export`. Limitar a logo a uma
caixa própria, com `object-fit: contain` equivalente, preservando proporção e espaço
fixo entre logo e razão social. O nome empresarial nunca pode ficar sob a imagem.

Critérios visuais: testar logo horizontal, quadrada e vertical; razão social longa;
A4 retrato e paisagem; primeira página e páginas seguintes. Aplicar a correção ao
template comum se ele for compartilhado, sem prejudicar os demais relatórios.

## 5. Código de barras na ordem de produção

Gerar uma identificação escaneável e não ambígua para a OF e, quando necessário,
para cada operação. Não colocar comando mutável ou dados sensíveis em texto aberto;
usar um token/identificador validado no servidor.

Criar endpoints de resolução e apontamento por leitura para:

1. localizar OF/operação;
2. iniciar processo, validando status, sequência, operador e permissão;
3. concluir processo, registrando quantidade boa, refugo, horas e data/hora;
4. rejeitar leitura repetida ou transição inválida com mensagem útil;
5. manter idempotência para reenvio causado por conexão instável.

Toda leitura deve gerar auditoria (empresa, usuário, dispositivo quando disponível,
data/hora, ação e resultado). Entregar também o valor/arquivo do código de barras para
impressão na OP e exemplos reais dos requests e responses.

## 6. Parametrização fiscal automática no cadastro do item

Ao selecionar a classificação fiscal/tributária do item, retornar e aplicar os padrões
governados pelo cadastro mestre: NCM, CEST quando cabível, origem padrão, unidades,
IPI, ICMS e indicador de PIS/COFINS. Diferenciar valor herdado de exceção explícita.

- Não calcular imposto de uma operação comercial dentro do cadastro do item.
- Não sobrescrever exceção manual sem confirmação/regra de prioridade.
- Validar vigência, empresa e referências.
- `GET /api/items/search/{code}` deve devolver valores, origem (`INHERITED`/`OVERRIDE`)
  e a referência fiscal usada.
- Integrar este escopo à persistência das pastas `commercial` e `accounting` descrita
  em `TASK_BACKEND_ITEM_COMERCIAL_CONTABIL.md`.

## 7. Auditoria de duplicidades do cadastro de item

Revisar campos equivalentes nos DTOs/tabelas de item, PDM, engenharia, almoxarifado,
suprimentos, comercial e contábil. Para cada aparente repetição, registrar:

- se é o mesmo conceito (deve haver uma fonte da verdade);
- se é uma visão derivada (devolver como somente leitura);
- se são conceitos diferentes com nomes confusos (renomear/documentar);
- se é redundância sem consumidor (migrar e remover com compatibilidade).

Priorizar descrição/nome do item, unidade de medida, peso, classificação fiscal,
tipo comprado/fabricado, estoque mínimo e códigos de fornecedor. Não remover coluna
com dados reais sem migração, telemetria de uso e plano de rollback.

## Requisitos transversais

- Isolamento por empresa e autorização em todos os endpoints.
- Migrações reversíveis e seguras para dados existentes.
- Operações compostas em transação.
- Erros de validação em `400`/`409`/`422`, nunca `500`.
- OpenAPI e exemplos reais em `snake_case`.
- Testes unitários, repositório e integração HTTP, incluindo concorrência e idempotência.
- Nenhuma alteração em ambientes ou dados de produção para validar a implementação.

## Handoff obrigatório para o frontend

Informar migrations, contratos finais, enums, endpoints alterados, compatibilidade,
comandos de teste, commit e ambiente de desenvolvimento. Incluir uma coleção de
exemplos que cubra: calendário anual e exceção manual; dois fornecedores para o mesmo
item; item alfanumérico atravessando compra/BOM/OF/venda/NF; leitura duplicada de
código de barras; herança e override fiscal; exportação do VITM0100 com logo grande.


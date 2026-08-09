# Task backend — persistir as pastas Comercial e Contábil do item

## Objetivo

Fazer o cadastro de item persistir, consultar e atualizar os dados das abas
**Comercial** e **Contábil** da tela `VENT0200`.

Hoje `POST /api/items/create` grava capa/PDM, almoxarifado, engenharia,
planejamento e suprimentos. A entidade e o DTO do item não expõem as duas pastas
abaixo. O frontend só deverá enviá-las depois que este contrato estiver publicado
e validado no ambiente de desenvolvimento.

## Escopo obrigatório

1. Criar estruturas de domínio próprias para `commercial` e `accounting`.
2. Criar migração reversível para as novas colunas/tabelas, com vínculo pelo item.
3. Adicionar as duas estruturas aos DTOs de criação, atualização e resposta.
4. Persistir tudo na mesma transação do item; falha em qualquer pasta deve
   desfazer o cadastro inteiro.
5. Retornar as pastas em `GET /api/items/search/{code}` e nas respostas de
   criação/atualização.
6. Preservar compatibilidade: clientes antigos podem omitir ambas as estruturas.
7. Manter isolamento por empresa e as mesmas regras de autorização do item.
8. Adicionar testes unitários, de repositório e de integração HTTP.

## Contrato solicitado

Os nomes abaixo são o contrato esperado pelo frontend. Não devolver nomes em
PascalCase e não reutilizar IDs internos como se fossem códigos de negócio.

```json
{
  "commercial": {
    "description": "SUPORTE SOLDADO REFORÇADO",
    "sale_type": "VENDA",
    "volume_conversion_factor": 1,
    "sale_multiple": 5,
    "minimum_sale_quantity": 5,
    "estimated_delivery_days": 7,
    "warranty_days": 365,
    "transfer_warehouse_code": 2,
    "technical_assistance_warehouse_code": 3,
    "packaging_item_code": 10050,
    "allow_billing_description_change": true,
    "issue_loading_labels": true,
    "assemble_shipping_volumes": true,
    "requires_special_packaging": false,
    "withhold_pis_cofins": false,
    "is_packaging": false,
    "mobile_enabled": false,
    "export_packaging": false,
    "classification_code": "PA",
    "notes": "Venda somente em múltiplos de cinco"
  },
  "accounting": {
    "sale_fiscal_classification_code": "85043111",
    "purchase_fiscal_classification_code": "85043111",
    "origin": 0,
    "sale_ipi_type": "PERCENTUAL",
    "sale_ipi_rate": 5,
    "purchase_ipi_type": "PERCENTUAL",
    "purchase_ipi_rate": 5,
    "icms_rate": 18,
    "sale_unit_of_measurement": "UN",
    "purchase_unit_of_measurement": "UN",
    "inventory_group_code": 10,
    "accounting_classification_code": "PRODUTO_ACABADO",
    "cest": "0100100",
    "input_code": "01",
    "calculate_pis_cofins": true,
    "notes": "Tributação padrão de venda"
  }
}
```

As estruturas completas devem ser aceitas dentro do corpo já existente do
`POST /api/items/create`; não criar um segundo cadastro desconectado do item.

## Tipos e validações

### Comercial

| Campo | Tipo | Regra |
|---|---|---|
| `description` | string opcional | aparar espaços; definir limite coerente com o banco |
| `sale_type` | enum opcional | `VENDA` ou `REVENDA` |
| `volume_conversion_factor` | decimal opcional | maior que zero quando informado |
| `sale_multiple` | decimal opcional | maior que zero quando informado |
| `minimum_sale_quantity` | decimal opcional | zero ou positivo |
| `estimated_delivery_days` | inteiro opcional | zero ou positivo |
| `warranty_days` | inteiro opcional | zero ou positivo |
| códigos de almoxarifado | inteiro opcional | devem existir e pertencer à empresa do item |
| `packaging_item_code` | inteiro opcional | item deve existir; impedir autorreferência |
| indicadores | boolean | `false` como padrão |
| códigos de classificação/notas | string opcional | aparar espaços e limitar tamanho |

`warranty_days` precisa ficar disponível para a Assistência Técnica calcular o
período de garantia. Não o trate como campo apenas visual.

### Contábil

| Campo | Tipo | Regra |
|---|---|---|
| classificações fiscais | string/código opcional | validar existência quando houver cadastro mestre correspondente |
| `origin` | inteiro opcional | aceitar códigos SEFAZ de `0` a `8`; não persistir o rótulo da tela |
| tipos de IPI | enum opcional | `PERCENTUAL` ou `VALOR` |
| alíquotas/valores | decimal opcional | zero ou positivo; usar decimal, nunca ponto flutuante binário no banco |
| unidades de medida | enum opcional | usar o mesmo enum oficial do item |
| `inventory_group_code` | inteiro opcional | validar referência e empresa |
| `cest` | string opcional | somente 7 dígitos quando informado |
| `calculate_pis_cofins` | boolean | `false` como padrão |

Preferência de modelagem fiscal: ligar o item ao cadastro mestre de classificação
fiscal em vez de duplicar NCM, CEST e alíquotas sem governança. Caso o backend
adote essa modelagem, alinhar o contrato com o frontend antes de concluir a task.
A origem da mercadoria continua sendo atributo do item.

## Criação, consulta e atualização

- `POST /api/items/create`: aceitar e gravar as duas pastas opcionalmente.
- `GET /api/items/search/{code}`: devolver exatamente o que foi persistido.
- Endpoint de atualização do item: permitir alteração parcial das pastas sem
  zerar campos omitidos.
- Listagens podem continuar resumidas, mas não devem inventar valores padrão que
  não estejam persistidos.
- Auditoria deve registrar criação e alteração das duas pastas sem expor dados
  técnicos desnecessários ao usuário.

## Migração e integridade

- A migração deve funcionar em banco com itens existentes.
- Campos novos devem ser anuláveis ou possuir padrão seguro.
- Criar chaves estrangeiras para item, almoxarifados, item de embalagem e demais
  cadastros referenciados.
- Impedir mais de uma pasta Comercial ou Contábil para o mesmo item.
- A reversão da migração não pode afetar as tabelas atuais do item.

## Critérios de aceite

1. Criar um item com todos os campos das duas pastas retorna `200`/`201`.
2. Consultar o item devolve os mesmos valores, inclusive `false`, `0` e textos.
3. Atualizar um único campo não apaga os demais.
4. Criar item sem `commercial` e `accounting` continua funcionando.
5. Enum inválido, CEST malformado e referências inexistentes retornam `400` ou
   `422` com mensagem útil; nunca `500`.
6. Uma falha em qualquer pasta não deixa item parcialmente gravado.
7. Testes confirmam isolamento por empresa e autorização.
8. Migração sobe e desce em banco de teste.
9. O contrato OpenAPI/documentação da API contém exemplos de request e response.

## Teste de integração esperado

O teste deve executar esta jornada:

1. criar os cadastros de referência necessários;
2. criar um item com Comercial e Contábil completamente preenchidos;
3. consultar e comparar campo a campo;
4. atualizar descrição comercial, garantia, origem e CEST;
5. consultar novamente e confirmar atualização sem perda dos demais campos;
6. tentar referências e enums inválidos e confirmar rejeição;
7. criar outro item sem as pastas e confirmar retrocompatibilidade.

## Fora desta task

- Alterar regras de preço, comissão ou política comercial.
- Calcular tributos de nota fiscal dentro do cadastro do item.
- Modificar o fluxo de PDM, estoque, engenharia, planejamento ou suprimentos.
- Alterar o frontend antes de o contrato acima estar disponível.

## Handoff para o frontend

Ao concluir, informar:

- migration aplicada;
- endpoints e exemplos reais de request/response;
- nomes finais dos enums;
- como funciona a atualização parcial;
- comandos dos testes executados;
- ambiente/commit em que a API pode ser validada.

Depois desse handoff, o frontend deverá mapear os campos de `VENT0200`, habilitar
o envio e a leitura das duas pastas e ampliar o E2E de cadastro completo do item.

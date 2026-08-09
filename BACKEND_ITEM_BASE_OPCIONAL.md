# Task de backend — item-base opcional no cadastro de itens

## Objetivo

Permitir que `item_base_cod` seja uma referência opcional usada apenas como modelo para agilizar o cadastro. Um item Genérico, Configurado ou Item Base deve poder ser criado sem essa referência.

O frontend já copia os valores do item-base selecionado para o formulário, mantendo código, nome e textos informados para o novo item. O vínculo não pode ser necessário para validar ou persistir o novo cadastro.

## Alterações necessárias

1. Remover da validação de domínio a regra que rejeita `nature = 0` (Genérico) ou `nature = 1` (Configurado) quando `engineering.item_base_cod` estiver ausente, nulo ou zero.
2. Aceitar `engineering.item_base_cod` omitido para as três naturezas (`0`, `1` e `2`).
3. Quando informado, validar apenas que o código existe. A referência não deve obrigatoriamente apontar para um item de determinada natureza.
4. Não substituir campos enviados pelo frontend pelos valores atuais do item referenciado. A seleção é uma cópia inicial e o usuário pode alterar qualquer valor antes de salvar.
5. Padronizar a validação do nome:
   - aceitar `name` no corpo de `POST /api/items/create`;
   - aplicar `TrimSpace` antes de validar;
   - persistir e devolver o mesmo nome em `GET /api/items/search/{code}`;
   - devolver erros de validação em português, por exemplo `Informe o nome do item.`.
6. Manter compatibilidade com corpos antigos que não enviam as novas pastas opcionais.

## Contrato esperado

Este corpo deve criar um item sem item-base:

```json
{
  "code": 12345,
  "name": "Transformador 30 kVA",
  "nature": 1,
  "situation": "LINHA",
  "health": "ATIVO",
  "pdm": {
    "group_code": 1,
    "modifier_code": 1,
    "attributes": [],
    "description_technique": "Transformador 30 kVA"
  },
  "engineering": {
    "type": "FABRICADO",
    "type_struct": "INDUSTRIAL",
    "oem": false,
    "weight": { "gross": 0, "net": 0, "unit": "KG" }
  }
}
```

O mesmo corpo também deve funcionar com `engineering.item_base_cod` preenchido.

## Testes de aceitação

- Criar Item Base sem `item_base_cod` retorna `200` ou `201`.
- Criar Genérico sem `item_base_cod` retorna `200` ou `201`.
- Criar Configurado sem `item_base_cod` retorna `200` ou `201`.
- Criar item com `item_base_cod` existente retorna `200` ou `201` e mantém os valores enviados.
- Código de item-base inexistente retorna `400` ou `422` com mensagem em português.
- Nome ausente ou composto apenas por espaços retorna `400` ou `422` com mensagem em português.
- Nome válido é persistido e devolvido na consulta do item.
- As pastas Comercial e Contábil copiadas e alteradas pelo usuário permanecem exatamente como enviadas.

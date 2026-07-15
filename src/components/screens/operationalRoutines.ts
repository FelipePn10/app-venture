import type { OperationalRoutine, RoutineField, RoutineOperation } from "./OperationalRoutinePage";

const id = (name = "id", label = "Código"): RoutineField => ({ name, label, type: "number", required: true });
const json = (placeholder: string): RoutineField => ({ name: "__body", label: "Dados da operação", type: "json", required: true, placeholder });
const list = (path: string, fields: RoutineField[] = [], query: string[] = []): RoutineOperation => ({ label: "Consultar", method: "GET", path, fields, query });
const create = (path: string, example: string, adminOnly = false): RoutineOperation => ({ label: "Cadastrar", method: "POST", path, fields: [json(example)], adminOnly });
const remove = (path: string, fields: RoutineField[] = [id()], adminOnly = false): RoutineOperation => ({ label: "Desativar / excluir", method: "DELETE", path, fields, destructive: true, adminOnly });
const routine = (code: string, title: string, description: string, operations: RoutineOperation[]): OperationalRoutine => ({ code, title, description, guidance: "Selecione uma operação, preencha os dados e confira o retorno antes de avançar no fluxo.", operations });

export const OPERATIONAL_ROUTINES: Record<string, OperationalRoutine> = {
  VENT0204: routine("VENT0204", "Cadastro de Grupo PDM", "Consulta, cadastra e altera famílias PDM vinculadas à empresa, usando o cadastro estrutural persistido no backend.", [
    list("/api/pdm/groups"),
    { label: "Abrir grupo", method: "GET", path: "/api/pdm/groups/{code}", fields: [id("code", "Código do grupo")] },
    create("/api/pdm/create-group", '{"code":10,"description":"Família de produtos","enterprise_id":1}'),
    { label: "Alterar grupo", method: "PUT", path: "/api/pdm/groups/{code}", fields: [id("code", "Código do grupo"), json('{"description":"Família de produtos atualizada","enterprise_id":1}')] },
  ]),
  VSUP0640: routine("VSUP0640", "Registros operacionais de compras", "Consulta e mantém ocorrências operacionais normalizadas de compra, recebimento e inspeção.", [
    list("/api/procurement/records", [{ name: "type", label: "Tipo do registro" }, { name: "status", label: "Situação" }], ["type", "status"]),
    create("/api/procurement/records", '{"record_type":"RECEIVING_INSPECTION","status":"OPEN","supplier_code":10,"purchase_order_code":1000,"purchase_order_item_code":1,"item_code":100,"mask":"","warehouse_id":2,"quantity":10,"reference":"REC-001","payload":{}}'),
    { label: "Abrir registro", method: "GET", path: "/api/procurement/records/{id}", fields: [id()] },
    { label: "Alterar situação", method: "PATCH", path: "/api/procurement/records/{id}/status", fields: [id(), { name: "status", label: "Nova situação", required: true }] },
  ]),
  VSUP0650: routine("VSUP0650", "Histórico de movimentos de compra", "Consolida movimentos por fornecedor e item para rastreabilidade e análise de compras.", [
    list("/api/procurement/purchase-movements", [{ name: "supplier_code", label: "Fornecedor", type: "number" }, { name: "item_code", label: "Item", type: "number" }, { name: "limit", label: "Limite", type: "number", defaultValue: "100" }], ["supplier_code", "item_code", "limit"]),
  ]),
  VSUP0600: routine("VSUP0600", "Inspeção de recebimento", "Cria roteiros, gera ordens, registra resultados, analisa e destina o material inspecionado.", [
    create("/api/procurement/receiving-inspection-routes", '{"enterprise_code":1,"basis":"ITEM","item_code":100,"mask":"","inspection_warehouse_id":2,"valid_from":"2026-07-14","steps":[{"sequence":1,"inspection_name":"Dimensão","kind":"NUMERIC","appointment_mode":"SAMPLE","is_required":true,"emits_label":false,"sample_qty":5,"acceptance_qty":5,"rejection_qty":1,"min_value":9.9,"max_value":10.1,"attributes":[]}]}'),
    { label: "Abrir roteiro", method: "GET", path: "/api/procurement/receiving-inspection-routes/{id}", fields: [id()] },
    create("/api/procurement/receiving-inspection-orders", '{"source":"PURCHASE_ORDER","purchase_order_code":1000,"purchase_order_item_code":1,"supplier_code":10,"item_code":100,"mask":"","warehouse_id":2,"quantity":20}'),
    list("/api/procurement/receiving-inspection-orders", [{ name: "status", label: "Status" }, { name: "supplier_code", label: "Fornecedor", type: "number" }], ["status", "supplier_code"]),
    { label: "Registrar resultados", method: "POST", path: "/api/procurement/receiving-inspection-orders/{id}/results", fields: [id(), json('{"step_id":1,"sequence":1,"sample_index":1,"measured_value":10,"min_value":9.9,"max_value":10.1,"is_approved":true}')] },
    { label: "Analisar ordem", method: "POST", path: "/api/procurement/receiving-inspection-orders/{id}/analysis", fields: [id(), json('{"conform_qty":18,"rejected_qty":2,"rework_qty":0,"restricted_qty":0,"treatment":"PARTIAL_APPROVAL","affects_supplier_score":true,"move_stock":true,"destination_warehouse_id":1,"rejection_warehouse_id":3,"notes":"Conferência concluída"}')] },
    { label: "Destinar estoque", method: "POST", path: "/api/procurement/receiving-inspections/{id}/disposition", fields: [id(), json('{"approved_qty":18,"rejected_qty":2,"destination_warehouse_id":1,"quarantine_warehouse_id":2,"reason":"Avaria"}')] },
  ]),
  VAVF0300: routine("VAVF0300", "Scorecard e IQF do fornecedor", "Consulta o histórico e calcula ou registra os indicadores de qualidade, entrega, comercial e atendimento.", [
    list("/api/procurement/suppliers/{supplierCode}/scorecards", [id("supplierCode", "Fornecedor")]),
    create("/api/procurement/supplier-scorecards/compute", '{"supplier_code":10,"period_start":"2026-01-01","period_end":"2026-06-30","commercial_score":100,"service_score":100,"persist":true,"notes":"Apuração semestral"}'),
    create("/api/procurement/supplier-scorecards", '{"supplier_code":10,"period_start":"2026-01-01","period_end":"2026-06-30","quality_score":95,"delivery_score":90,"commercial_score":100,"service_score":98,"total_receipts":20,"rejected_receipts":1,"late_receipts":2,"notes":"Avaliação manual"}'),
  ]),
  VSUP0610: routine("VSUP0610", "Alçadas e parâmetros de compras", "Administra limites de aprovação e parâmetros operacionais de suprimentos.", [
    list("/api/procurement/approval-limits"), create("/api/procurement/approval-limits", '{"enterprise_code":1,"scope":"PURCHASE_ORDER","currency":"BRL","auto_approve_max":10000,"block_above":50000,"valid_from":"2026-01-01","notes":"Alçada padrão"}', true),
    list("/api/procurement/parameters", [{ name: "domain", label: "Domínio" }], ["domain"]),
    { label: "Salvar parâmetro", method: "PUT", path: "/api/procurement/parameters", adminOnly: true, fields: [json('{"enterprise_code":1,"domain":"RECEIVING","param_key":"REQUIRE_NOTICE","param_value":"true","value_type":"BOOLEAN","description":"Exigir aviso"}')] },
  ]),
  VSUP0620: routine("VSUP0620", "EDI de fornecedores", "Recebe confirmações eletrônicas e evidencia divergências contra o pedido de compra.", [
    list("/api/procurement/edi-messages", [{ name: "supplier_code", label: "Fornecedor", type: "number" }, { name: "status", label: "Status" }], ["supplier_code", "status"]),
    create("/api/procurement/edi-messages", '{"enterprise_code":1,"supplier_code":10,"direction":"INBOUND","message_type":"PO_CONFIRMATION","purchase_order_code":1000,"payload":{},"qty_tolerance":0,"price_tolerance":0,"lines":[]}'),
    { label: "Abrir mensagem", method: "GET", path: "/api/procurement/edi-messages/{id}", fields: [id()] },
  ]),
  VIMP0300: routine("VIMP0300", "Processo de importação e custo nacionalizado", "Controla itens, despesas, rateio, recálculo e situação do processo de importação.", [
    list("/api/procurement/import-processes", [{ name: "status", label: "Status" }], ["status"]),
    create("/api/procurement/import-processes", '{"enterprise_code":1,"supplier_code":10,"reference":"IMP-2026-001","incoterm":"FOB","currency":"USD","exchange_rate":5.5,"apportion_basis":"VALUE","items":[{"item_code":100,"mask":"","quantity":10,"weight":50,"fob_unit_price":100}],"expenses":[{"expense_type":"FREIGHT","amount":500,"in_item_cost":true}]}'),
    { label: "Abrir processo", method: "GET", path: "/api/procurement/import-processes/{id}", fields: [id()] },
    { label: "Recalcular", method: "POST", path: "/api/procurement/import-processes/{id}/recompute", fields: [id()] },
    { label: "Alterar status", method: "PATCH", path: "/api/procurement/import-processes/{id}/status", fields: [id(), { name: "status", label: "Novo status", required: true }] },
  ]),
  VIMP0200: routine("VIMP0200", "Console de processos de importação", "Consulta e mantém processos, itens, despesas, custo nacionalizado e situação usando exclusivamente a camada operacional do backend.", [
    list("/api/procurement/import-processes", [{ name: "status", label: "Status" }], ["status"]),
    create("/api/procurement/import-processes", '{"enterprise_code":1,"supplier_code":10,"reference":"IMP-2026-001","incoterm":"FOB","currency":"USD","exchange_rate":5.5,"apportion_basis":"VALUE","items":[{"item_code":100,"mask":"","quantity":10,"weight":50,"fob_unit_price":100}],"expenses":[{"expense_type":"FREIGHT","amount":500,"in_item_cost":true}]}'),
    { label: "Abrir processo", method: "GET", path: "/api/procurement/import-processes/{id}", fields: [id()] },
    { label: "Recalcular custo", method: "POST", path: "/api/procurement/import-processes/{id}/recompute", fields: [id()] },
    { label: "Alterar situação", method: "PATCH", path: "/api/procurement/import-processes/{id}/status", fields: [id(), { name: "status", label: "Nova situação", required: true }] },
  ]),
  VAVF0203: routine("VAVF0203", "Homologação de fornecedores", "Registra faixas de aprovação, validade e categoria da homologação e gera vínculos de itens pelo histórico.", [
    list("/api/procurement/suppliers/{supplierCode}/homologations", [id("supplierCode", "Fornecedor")]),
    create("/api/procurement/supplier-homologations", '{"supplier_code":10,"period_start":"2026-01-01","period_end":"2026-12-31","homologated_min":80,"conditional_min":60,"status":"HOMOLOGATED","category":"A","valid_until":"2027-01-31"}'),
    { label: "Gerar itens do fornecedor", method: "POST", path: "/api/procurement/suppliers/{supplierCode}/generate-items", fields: [id("supplierCode", "Fornecedor")] },
  ]),
  VPDC0210: routine("VPDC0210", "Consulta, aprovação e recebimento de pedidos", "Expõe a consulta operacional, aprovação por alçada, autorização superior e recebimento físico do pedido.", [
    list("/api/purchase-order/consultation", [{ name: "order_from", label: "Pedido inicial", type: "number" }, { name: "order_to", label: "Pedido final", type: "number" }, { name: "supplier_from", label: "Fornecedor inicial", type: "number" }, { name: "supplier_to", label: "Fornecedor final", type: "number" }, { name: "item_from", label: "Item inicial", type: "number" }, { name: "item_to", label: "Item final", type: "number" }, { name: "request_type", label: "Tipo de solicitação" }, { name: "buyer", label: "Comprador" }, { name: "emission_from", label: "Emissão de", type: "date" }, { name: "emission_to", label: "Emissão até", type: "date" }, { name: "delivery_from", label: "Entrega de", type: "date" }, { name: "delivery_to", label: "Entrega até", type: "date" }, { name: "all_items", label: "Todos os itens", type: "checkbox" }, { name: "only_kanban", label: "Somente Kanban", type: "checkbox" }, { name: "position", label: "Posição" }, { name: "target_currency", label: "Moeda de destino" }, { name: "limit", label: "Limite", type: "number", defaultValue: "100" }, { name: "offset", label: "Deslocamento", type: "number", defaultValue: "0" }], ["order_from", "order_to", "supplier_from", "supplier_to", "item_from", "item_to", "request_type", "buyer", "emission_from", "emission_to", "delivery_from", "delivery_to", "all_items", "only_kanban", "position", "target_currency", "limit", "offset"]),
    { label: "Aprovar", method: "POST", path: "/api/purchase-order/{code}/approve", fields: [id("code", "Pedido")] },
    { label: "Autorizar alçada", method: "POST", path: "/api/purchase-order/{code}/authorize", fields: [id("code", "Pedido")], adminOnly: true },
    { label: "Registrar recebimento", method: "POST", path: "/api/purchase-order/{code}/receipts", fields: [id("code", "Pedido"), json('{"items":[{"purchase_order_item_code":1,"quantity":10,"warehouse_id":1,"lot":"L001"}],"notes":"Recebimento conferido"}')] },
  ]),

  VCFG0100: routine("VCFG0100", "Conjuntos e variáveis do configurador", "Mantém conjuntos de respostas, variáveis, composição da máscara e traduções.", [
    list("/api/configurator/sets"), create("/api/configurator/sets", '{"description":"Cores"}'),
    { label: "Abrir conjunto", method: "GET", path: "/api/configurator/sets/{id}", fields: [id()] },
    { label: "Alterar conjunto", method: "PUT", path: "/api/configurator/sets/{id}", fields: [id(), json('{"description":"Cores disponíveis","is_active":true}')] }, remove("/api/configurator/sets/{id}"),
    list("/api/configurator/sets/{id}/variables", [id()]), { label: "Cadastrar variável", method: "POST", path: "/api/configurator/sets/{id}/variables", fields: [id(), json('{"code":"AZ","description":"Azul","mask_composition":"AZ","is_special":false,"include_description":true,"special_data":"","marketing":true}')] },
    { label: "Abrir variável", method: "GET", path: "/api/configurator/variables/{varId}", fields: [id("varId", "Variável")] },
    { label: "Alterar variável", method: "PUT", path: "/api/configurator/variables/{varId}", fields: [id("varId", "Variável"), json('{"code":"AZ","description":"Azul","mask_composition":"AZ","is_active":true,"is_special":false,"include_description":true,"special_data":"","marketing":true}')] },
    remove("/api/configurator/variables/{varId}", [id("varId", "Variável")]),
    { label: "Traduzir variável", method: "POST", path: "/api/configurator/variables/{varId}/languages", fields: [id("varId", "Variável"), json('{"language":"en","country":"US","translation":"Blue"}')] },
    remove("/api/configurator/variables/languages/{langId}", [id("langId", "Tradução")]),
  ]),
  VCFG0200: routine("VCFG0200", "Características do configurador", "Mantém características, tipos, fórmulas, limites, idiomas e itens de recebimento.", [
    list("/api/configurator/characteristics"), create("/api/configurator/characteristics", '{"code":"COR","description":"Cor","type":"ESCOLHA","set_id":1,"mask":"","is_required":true,"is_special":false,"affects_price":false,"controls_goals":false,"receiving_type":"","field_source":"","formula":"","option_true":"Sim","option_false":"Não"}'),
    { label: "Abrir característica", method: "GET", path: "/api/configurator/characteristics/{id}", fields: [id()] },
    { label: "Alterar característica", method: "PUT", path: "/api/configurator/characteristics/{id}", fields: [id(), json('{"code":"COR","description":"Cor","type":"ESCOLHA","is_active":true,"is_required":true}')] }, remove("/api/configurator/characteristics/{id}"),
    { label: "Traduzir característica", method: "POST", path: "/api/configurator/characteristics/{id}/languages", fields: [id(), json('{"language":"en","description":"Color","mask":"COLOR"}')] },
    remove("/api/configurator/characteristics/languages/{langId}", [id("langId", "Tradução")]),
    { label: "Listar itens vinculados", method: "GET", path: "/api/configurator/characteristics/{id}/items", fields: [id()] },
    list("/api/configurator/characteristics/{id}/receiving-items", [id()]), { label: "Vincular item de recebimento", method: "POST", path: "/api/configurator/characteristics/{id}/receiving-items", fields: [id(), json('{"variable_id":1,"receiving_type":"RECEBIMENTO","item_code":100}')] },
    remove("/api/configurator/characteristics/receiving-items/{recvId}", [id("recvId", "Vínculo de recebimento")]),
  ]),
  VCFG0300: routine("VCFG0300", "Características por item", "Ordena e configura as características que compõem cada item configurável.", [
    list("/api/configurator/items/{itemCode}/characteristics", [id("itemCode", "Item")]),
    { label: "Adicionar característica", method: "POST", path: "/api/configurator/items/{itemCode}/characteristics", fields: [id("itemCode", "Item"), json('{"characteristic_id":1,"sequence":1,"is_special":false,"is_drawing":false,"is_load":false,"formula":"","default_answers":[]}')] },
    { label: "Alterar vínculo", method: "PUT", path: "/api/configurator/item-characteristics/{id}", fields: [id(), json('{"sequence":1,"is_special":false,"is_drawing":false,"is_load":false,"formula":"","default_answers":[]}')] }, remove("/api/configurator/item-characteristics/{id}"),
  ]),
  VCFG0400: routine("VCFG0400", "Geração de máscaras configuradas", "Gera uma máscara por respostas ou combinações em lote, com opção de persistência.", [
    create("/api/configurator/generate-mask", '{"item_code":100,"answers":[{"characteristic_id":1,"variable_id":2,"value":""}],"persist":false}'),
    create("/api/configurator/generate-masks", '{"item_code":100,"restrict":[{"characteristic_id":1,"variable_ids":[1,2]}],"persist":false}'),
  ]),
  VCFG0500: routine("VCFG0500", "Descrições configuradas", "Mantém tipos, linhas e renderização das descrições de itens configurados.", [
    list("/api/configurator/description-types"), create("/api/configurator/description-types", '{"code":"COMERCIAL","description":"Descrição comercial","kind":"GERAL","is_active":true}'),
    { label: "Abrir tipo", method: "GET", path: "/api/configurator/description-types/{id}", fields: [id()] },
    { label: "Alterar tipo", method: "PUT", path: "/api/configurator/description-types/{id}", fields: [id(), json('{"code":"COMERCIAL","description":"Descrição comercial","kind":"GERAL","is_active":true}')] },
    remove("/api/configurator/description-types/{id}"),
    create("/api/configurator/item-descriptions", '{"item_code":100,"description_type_id":1}'), list("/api/configurator/items/{itemCode}/descriptions", [id("itemCode", "Item")]),
    { label: "Abrir descrição", method: "GET", path: "/api/configurator/item-descriptions/{id}", fields: [id()] },
    { label: "Atualizar linhas", method: "PUT", path: "/api/configurator/item-descriptions/{id}/lines", fields: [id(), json('{"lines":[{"id":1,"order_index":1,"show_characteristic":true,"show_mask":true,"desc_type":"DESCRICAO","text":"","line_break":false}]}')] },
    { label: "Recarregar linhas", method: "POST", path: "/api/configurator/item-descriptions/{id}/reload", fields: [id()] },
    { label: "Renderizar", method: "POST", path: "/api/configurator/item-descriptions/{id}/render", fields: [id(), json('{"answers":[{"characteristic_id":1,"variable_id":2,"value":""}]}')] },
    remove("/api/configurator/item-descriptions/{id}"),
  ]),
  VCFG0600: routine("VCFG0600", "Regras equivalentes e regras de item", "Avalia regras pai-filho e regras que preenchem campos do item configurado.", [
    list("/api/configurator/parents/{parentItemCode}/equivalent-rules", [id("parentItemCode", "Item pai")]), create("/api/configurator/equivalent-rules", '{"parent_item_code":100,"parent_uom":"UN","child_item_code":200,"parent_characteristic_id":1,"parent_operator":"EQ","child_characteristic_id":2,"child_operator":"SET","formula":""}'),
    create("/api/configurator/equivalent-rules/apply", '{"parent_item_code":100,"answers":[{"characteristic_id":1,"variable_id":2,"value":""}]}'),
    { label: "Abrir regra equivalente", method: "GET", path: "/api/configurator/equivalent-rules/{id}", fields: [id()] },
    { label: "Alterar regra equivalente", method: "PUT", path: "/api/configurator/equivalent-rules/{id}", fields: [id(), json('{"parent_item_code":100,"parent_uom":"UN","child_item_code":200,"parent_characteristic_id":1,"parent_operator":"EQ","child_characteristic_id":2,"child_operator":"SET","formula":""}')] },
    remove("/api/configurator/equivalent-rules/{id}"),
    list("/api/configurator/items/{itemCode}/rules", [id("itemCode", "Item")]), create("/api/configurator/item-rules", '{"item_code":100,"target_table":"items","target_field":"description","content":"Configurado","formula":"","description":"Preencher descrição","situation":"ACTIVE","conditions":[]}'),
    create("/api/configurator/item-rules/evaluate", '{"item_code":100,"answers":[]}'),
    { label: "Abrir regra do item", method: "GET", path: "/api/configurator/item-rules/{id}", fields: [id()] },
    { label: "Alterar regra do item", method: "PUT", path: "/api/configurator/item-rules/{id}", fields: [id(), json('{"item_code":100,"target_table":"items","target_field":"description","content":"Configurado","formula":"","description":"Preencher descrição","situation":"ACTIVE","conditions":[]}')] },
    remove("/api/configurator/item-rules/{id}"),
  ]),

  VTER0100: routine("VTER0100", "Preços de serviços de terceiros", "Mantém preços, vigências, regras, fórmula, custo resolvido, reajuste e histórico.", [
    list("/api/third-party-services/prices", [{ name: "item_from", label: "Item inicial", type: "number" }, { name: "item_to", label: "Item final", type: "number" }, { name: "supplier_from", label: "Fornecedor inicial", type: "number" }, { name: "supplier_to", label: "Fornecedor final", type: "number" }, { name: "operation_id", label: "Operação", type: "number" }, { name: "reference_date", label: "Data de referência", type: "date" }, { name: "price_type", label: "Tipo de preço" }, { name: "preferred", label: "Somente preferencial", type: "checkbox" }], ["item_from", "item_to", "supplier_from", "supplier_to", "operation_id", "reference_date", "price_type", "preferred"]), create("/api/third-party-services/prices", '{"item_code":100,"supplier_code":10,"operation_id":1,"uom":"UN","reference_date":"2026-07-14T00:00:00Z","preferred":true,"unit_price":"25.50","freight_type":"CIF","freight_value":"0","tax_percent":"0","reason":"Tabela 2026","rules":[]}', true),
    { label: "Abrir preço", method: "GET", path: "/api/third-party-services/prices/{id}", fields: [id()] },
    { label: "Alterar preço", method: "PUT", path: "/api/third-party-services/prices/{id}", adminOnly: true, fields: [id(), json('{"item_code":100,"supplier_code":10,"operation_id":1,"uom":"UN","reference_date":"2026-07-14T00:00:00Z","preferred":true,"unit_price":"25.50","freight_type":"CIF","freight_value":"0","tax_percent":"0","reason":"Revisão","rules":[]}')] },
    list("/api/third-party-services/prices/resolve", [{ name: "item_code", label: "Item", type: "number", required: true }, { name: "mask", label: "Máscara" }, { name: "supplier_code", label: "Fornecedor", type: "number" }, { name: "operation_id", label: "Operação", type: "number", required: true }, { name: "reference_date", label: "Data de referência", type: "date" }, { name: "attributes", label: "Atributos" }], ["item_code", "mask", "supplier_code", "operation_id", "reference_date", "attributes"]),
    list("/api/third-party-services/cost", [{ name: "item_code", label: "Item", type: "number", required: true }, { name: "mask", label: "Máscara" }, { name: "operation_id", label: "Operação", type: "number", required: true }, { name: "reference_date", label: "Data de referência", type: "date" }, { name: "mode", label: "Modo", defaultValue: "STANDARD" }], ["item_code", "mask", "operation_id", "reference_date", "mode"]),
    { label: "Histórico", method: "GET", path: "/api/third-party-services/prices/{id}/history", fields: [id()] }, { label: "Reajustar", method: "POST", path: "/api/third-party-services/prices/readjust", adminOnly: true, fields: [json('{"ids":[1,2],"percent":"5.0","reference_date":"2026-07-14T00:00:00Z","reason":"Reajuste anual"}')] },
    { label: "Copiar / mover", method: "POST", path: "/api/third-party-services/prices/copy-move", adminOnly: true, fields: [json('{"ids":[1],"supplier_code":20,"operation_id":2,"move":false,"reference_date":"2026-07-14T00:00:00Z","reason":"Nova negociação"}')] }, remove("/api/third-party-services/prices/{id}", [id()], true),
  ]),
  VTER0200: routine("VTER0200", "Ordens de serviço de terceiros", "Gera ordens a partir da OF, consulta relatório e controla requisição, compra e status.", [
    list("/api/third-party-services/orders", [{ name: "status", label: "Status" }, { name: "supplier_code", label: "Fornecedor", type: "number" }], ["status", "supplier_code"]),
    { label: "Emitir relatório", method: "GET", path: "/api/third-party-services/orders/report", fields: [{ name: "status", label: "Status" }, { name: "supplier_code", label: "Fornecedor", type: "number" }], query: ["status", "supplier_code"] },
    { label: "Gerar pela OF", method: "POST", path: "/api/third-party-services/production-orders/{productionOrderID}/orders", fields: [id("productionOrderID", "Ordem de fabricação")], adminOnly: true },
    { label: "Abrir ordem", method: "GET", path: "/api/third-party-services/orders/{id}", fields: [id()] },
    { label: "Alterar status", method: "PATCH", path: "/api/third-party-services/orders/{id}/status", adminOnly: true, fields: [id(), json('{"status":"PURCHASE_ORDER_CREATED","purchase_requisition_code":100,"purchase_order_code":200}')] },
  ]),
  VTER0300: routine("VTER0300", "Remessas e retornos de terceiros", "Registra movimentos idempotentes de remessa, retorno, recebimento e ajuste com lote e almoxarifado.", [
    list("/api/third-party-services/orders/{id}/movements", [id()]),
    { label: "Registrar movimento", method: "POST", path: "/api/third-party-services/orders/{id}/movements", adminOnly: true, fields: [id(), json('{"movement_type":"SHIPMENT","quantity":"10","occurred_at":"2026-07-14T12:00:00Z","reference_type":"NF","reference_code":"123","idempotency_key":"OS1-REM1","warehouse_id":1,"lot":"L001"}')] },
    { label: "Histórico da ordem", method: "GET", path: "/api/third-party-services/orders/{id}/history", fields: [id()] },
  ]),
  VTER0400: routine("VTER0400", "Conversões globais de terceiros", "Mantém fatores de conversão de unidades utilizados no custeio e nas movimentações terceirizadas.", [
    list("/api/third-party-services/global-conversions"), create("/api/third-party-services/global-conversions", '{"from_uom":"KG","to_uom":"UN","factor":"2.5"}', true), remove("/api/third-party-services/global-conversions/{id}", [id()], true),
  ]),

  VAPS0100: routine("VAPS0100", "Grupos e parâmetros de recursos APS", "Organiza recursos, calendário, localização, criticidade e capacidades por centro de trabalho.", [
    list("/api/aps/resource-groups"), create("/api/aps/resource-groups", '{"code":"CORTE","description":"Máquinas de corte"}', true), remove("/api/aps/resource-groups/{id}", [id()], true),
    { label: "Configurar recurso", method: "PUT", path: "/api/aps/resources/{id}/sequencing", adminOnly: true, fields: [id(), json('{"resource_group_id":1,"calendar_id":1,"location":"Fábrica 1","is_critical":true,"is_active":true}')] },
    { label: "Configurar centro", method: "PUT", path: "/api/aps/work-centers/{id}/sequencing", adminOnly: true, fields: [id(), json('{"machine_cost_center_id":1,"labor_cost_center_id":2,"capacity_hours":"8"}')] },
  ]),
  VAPS0200: routine("VAPS0200", "Calendários de máquinas", "Mantém intervalos semanais de disponibilidade que limitam o sequenciamento finito.", [
    list("/api/aps/machine-calendars"), create("/api/aps/machine-calendars", '{"code":1,"description":"Turno normal","intervals":[{"weekday":1,"start":"08:00","end":"17:00"}]}', true), remove("/api/aps/machine-calendars/{id}", [id()], true),
  ]),
  VAPS0300: routine("VAPS0300", "Paradas de máquinas", "Registra indisponibilidades planejadas ou emergenciais e seus vínculos de manutenção.", [
    list("/api/aps/machine-downtimes", [{ name: "machine_id", label: "Máquina", type: "number" }, { name: "from", label: "De", type: "datetime-local" }, { name: "to", label: "Até", type: "datetime-local" }], ["machine_id", "from", "to"]),
    create("/api/aps/machine-downtimes", '{"machine_id":1,"starts_at":"2026-07-14T12:00:00Z","ends_at":"2026-07-14T14:00:00Z","downtime_type":"MAINTENANCE","reason":"Preventiva","maintenance_order_id":1}', true), remove("/api/aps/machine-downtimes/{id}", [id()], true),
  ]),
  VAPS0400: routine("VAPS0400", "Perfil de operadores APS", "Mantém contatos, funções, centro de custo, supervisão e limite de crédito do funcionário.", [
    { label: "Consultar perfil", method: "GET", path: "/api/aps/employees/{id}/sequencing-profile", fields: [id("id", "Funcionário")] },
    { label: "Salvar perfil", method: "PUT", path: "/api/aps/employees/{id}/sequencing-profile", adminOnly: true, fields: [id("id", "Funcionário"), json('{"contacts":[{"contact_type":"EMAIL","value":"operador@empresa.com","is_primary":true}],"functions":[{"function_name":"OPERADOR","cost_center_id":1,"is_supervisor":false,"is_manager":false}],"credit_limit":"0"}')] },
    { label: "Alterar contato", method: "PATCH", path: "/api/aps/employees/{employeeID}/contacts/{contactID}", adminOnly: true, fields: [id("employeeID", "Funcionário"), id("contactID", "Contato"), json('{"contact_type":"EMAIL","value":"operador@empresa.com","is_primary":true}')] },
    remove("/api/aps/employees/{employeeID}/contacts/{contactID}", [id("employeeID", "Funcionário"), id("contactID", "Contato")], true),
    { label: "Alterar função", method: "PATCH", path: "/api/aps/employees/{employeeID}/functions/{functionID}", adminOnly: true, fields: [id("employeeID", "Funcionário"), id("functionID", "Função"), json('{"function_name":"OPERADOR","cost_center_id":1,"is_supervisor":false,"is_manager":false}')] },
    remove("/api/aps/employees/{employeeID}/functions/{functionID}", [id("employeeID", "Funcionário"), id("functionID", "Função")], true),
  ]),
  VAPS0500: routine("VAPS0500", "Perfil industrial de máquinas", "Mantém uso, preparação, marca, responsáveis, serviços preventivos, itens e campos especiais.", [
    { label: "Consultar perfil", method: "GET", path: "/api/aps/resources/{id}/industrial-profile", fields: [id("id", "Recurso")] },
    { label: "Salvar perfil", method: "PUT", path: "/api/aps/resources/{id}/industrial-profile", adminOnly: true, fields: [id("id", "Recurso"), json('{"usage_description":"Centro de usinagem","preparation_time":"30","preparation_time_unit":"MIN","brand":"Marca","is_preferred":true,"services":[],"special_values":[]}')] },
    { label: "Alterar serviço", method: "PATCH", path: "/api/aps/resources/{machineID}/services/{serviceID}", adminOnly: true, fields: [id("machineID", "Máquina"), id("serviceID", "Serviço"), json('{"service_code":"PREV001","description":"Preventiva","service_type":"PREVENTIVE","frequency_value":30,"frequency_unit":"DAY","max_tolerance":5,"implemented_on":"2026-07-14T00:00:00Z","items":[],"responsible_employee_ids":[]}')] },
    remove("/api/aps/resources/{machineID}/services/{serviceID}", [id("machineID", "Máquina"), id("serviceID", "Serviço")], true),
    { label: "Alterar item do serviço", method: "PATCH", path: "/api/aps/resources/{machineID}/services/{serviceID}/items/{itemID}", adminOnly: true, fields: [id("machineID", "Máquina"), id("serviceID", "Serviço"), id("itemID", "Item do serviço"), json('{"item_code":100,"quantity":"1","notes":"Troca preventiva"}')] },
    remove("/api/aps/resources/{machineID}/services/{serviceID}/items/{itemID}", [id("machineID", "Máquina"), id("serviceID", "Serviço"), id("itemID", "Item do serviço")], true),
    { label: "Alterar campo especial", method: "PATCH", path: "/api/aps/resources/{machineID}/special-values/{fieldID}", adminOnly: true, fields: [id("machineID", "Máquina"), id("fieldID", "Campo"), json('{"name":"Potência","value_type":"NUMERIC","numeric_value":"15.5"}')] },
    remove("/api/aps/resources/{machineID}/special-values/{fieldID}", [id("machineID", "Máquina"), id("fieldID", "Campo")], true),
  ]),
  VAPS0600: routine("VAPS0600", "Cálculo e consulta do sequenciamento APS", "Executa o cálculo, consulta recursos/eventos e administra parâmetros do motor de sequenciamento.", [
    create("/api/aps/sequence", '{"start_from":"2026-07-14T08:00:00Z","order_ids":[],"machine_ids":[],"work_center_ids":[],"operation_ids":[]}'),
    list("/api/aps/sequence/resources"),
    create("/api/aps/sequence/view", '{"from":"2026-07-14T00:00:00Z","to":"2026-07-21T23:59:59Z","resource_group_id":1,"time_unit":"HOUR","refresh_value":15}'),
    { label: "Exportar eventos", method: "POST", path: "/api/aps/sequence/events/export", fields: [json('{"from":"2026-07-14T00:00:00Z","to":"2026-07-21T23:59:59Z","resource_group_id":1,"time_unit":"HOUR","refresh_value":15}')] },
    { label: "Salvar parâmetros", method: "PUT", path: "/api/aps/sequence/settings", adminOnly: true, fields: [json('{"list_only_active_resources":true}')] },
  ]),

  VENG0300: routine("VENG0300", "Cabeçalho e revisão de estrutura BOM", "Controla efetividade, versão e status do cabeçalho da estrutura do produto.", [
    create("/api/bom-headers/", '{"item_code":100,"mask":"","bom_type":"MBOM","valid_from":"2026-07-14T00:00:00Z","created_by":"UUID_DO_USUARIO"}'),
    { label: "Consultar por item", method: "GET", path: "/api/bom-headers/item/{itemCode}", fields: [id("itemCode", "Item")] },
    { label: "Abrir cabeçalho", method: "GET", path: "/api/bom-headers/{id}", fields: [id()] },
    { label: "Alterar status", method: "PUT", path: "/api/bom-headers/{id}/status", fields: [id(), json('{"status":"ACTIVE"}')] },
  ]),
  VENG0400: routine("VENG0400", "Desenhos e revisões", "Mantém desenho técnico, revisões, distribuição controlada, características e parâmetros de fabricação.", [
    list("/api/drawings/"), create("/api/drawings/", '{"code":"DES-001","digit":"0","format":"A3","model":"2D","item_code":100,"description":"Desenho principal","uom":"UN","material_spec":"Aço","creation_date":"2026-07-14"}'),
    { label: "Abrir desenho", method: "GET", path: "/api/drawings/{id}", fields: [id()] },
    { label: "Alterar desenho", method: "PUT", path: "/api/drawings/{id}", fields: [id(), json('{"code":"DES-001","digit":"0","format":"A3","model":"2D","item_code":100,"description":"Desenho principal","uom":"UN","material_spec":"Aço","creation_date":"2026-07-14"}')] },
    remove("/api/drawings/{id}"),
    { label: "Adicionar revisão", method: "POST", path: "/api/drawings/{id}/revisions", fields: [id(), json('{"revision":"A","start_date":"2026-07-14","material_spec":"Aço","reason":"Emissão inicial","approved_by":"Responsável","approval_date":"2026-07-14","is_current":true}')] },
    { label: "Listar revisões", method: "GET", path: "/api/drawings/{id}/revisions", fields: [id()] },
    { label: "Alterar revisão", method: "PUT", path: "/api/drawings/revisions/{revId}", fields: [id("revId", "Revisão"), json('{"revision":"B","start_date":"2026-07-14","material_spec":"Aço","reason":"Ajuste dimensional","approved_by":"Responsável","approval_date":"2026-07-14","is_current":true}')] },
    remove("/api/drawings/revisions/{revId}", [id("revId", "Revisão")]),
    { label: "Distribuir revisão", method: "POST", path: "/api/drawings/revisions/{revId}/distributions", fields: [id("revId", "Revisão"), json('{"recipient":"Produção","distributed_at":"2026-07-14","notes":"Cópia controlada"}')] },
    remove("/api/drawings/distributions/{distId}", [id("distId", "Distribuição")]),
    { label: "Vincular característica", method: "POST", path: "/api/drawings/{id}/characteristics", fields: [id(), json('{"characteristic_id":1,"operator":"EQ","variable_id":1}')] },
    { label: "Listar características", method: "GET", path: "/api/drawings/{id}/characteristics", fields: [id()] },
    remove("/api/drawings/characteristics/{charLinkId}", [id("charLinkId", "Vínculo")]),
    { label: "Consultar código por item", method: "GET", path: "/api/drawings/item-code/{itemCode}", fields: [id("itemCode", "Item")] },
    { label: "Manter código por item", method: "PUT", path: "/api/drawings/item-code", fields: [json('{"item_code":100,"mask":"","drawing_code":"DES-001.0"}')] },
    list("/api/drawings/manufacturing-parameters"),
    { label: "Salvar parâmetros fabris", method: "PUT", path: "/api/drawings/manufacturing-parameters", fields: [json('{"replicate_drawing_revision":true}')] },
  ]),
  VMRP0200: routine("VMRP0200", "Pipeline MRP → CRP → APS", "Executa de forma coordenada o planejamento de materiais, capacidade e sequenciamento.", [
    { label: "Executar pipeline", method: "POST", path: "/api/planning/run-pipeline", fields: [json('{"plan_code":1,"initial_order_number":1000,"generate_llc":true,"start_from":"2026-07-14T08:00:00Z"}')] },
  ]),
  VEST0300: routine("VEST0300", "Máscaras de lote e série", "Define partes fixas, datas e sequências e gera códigos de lote pelo contexto do item.", [
    list("/api/lot-masks/"), create("/api/lot-masks/", '{"application":"RECEIVING","description":"Lote padrão","classification_type":"ITEM","zero_on_year_change":true}'),
    { label: "Abrir máscara", method: "GET", path: "/api/lot-masks/{id}", fields: [id()] },
    { label: "Alterar máscara", method: "PUT", path: "/api/lot-masks/{id}", fields: [id(), json('{"application":"RECEIVING","description":"Lote padrão","classification_type":"ITEM","zero_on_year_change":true}')] },
    { label: "Adicionar parte", method: "POST", path: "/api/lot-masks/{id}/parts", fields: [id(), json('{"sequence":1,"part_type":"DATA","value":"","size":8,"date_format":"yyyyMMdd","zero_on_year_change":false}')] },
    { label: "Alterar parte", method: "PUT", path: "/api/lot-masks/parts/{partId}", fields: [id("partId", "Parte"), json('{"sequence":1,"part_type":"DATA","value":"","size":8,"date_format":"yyyyMMdd","zero_on_year_change":false}')] },
    remove("/api/lot-masks/parts/{partId}", [id("partId", "Parte")]),
    create("/api/lot-masks/generate", '{"application":"RECEIVING","item_code":100}'), remove("/api/lot-masks/{id}"),
  ]),
  VSUP0630: routine("VSUP0630", "Tolerâncias de pedido de compra", "Define tolerâncias por faixa e fornecedor e avalia quantidade, preço ou prazo recebido.", [
    list("/api/purchase-order-tolerances/"), create("/api/purchase-order-tolerances/", '{"tolerance_type":"QUANTITY","applies_to":"RECEIPT","interval_min":"0","interval_max":"1000","tolerance_value":"5","value_type":"PERCENT","action":"WARN","is_active":true}'),
    { label: "Alterar", method: "PUT", path: "/api/purchase-order-tolerances/", fields: [json('{"id":1,"tolerance_type":"QUANTITY","applies_to":"RECEIPT","interval_min":"0","tolerance_value":"5","value_type":"PERCENT","action":"WARN","is_active":true}')] },
    create("/api/purchase-order-tolerances/evaluate", '{"tolerance_type":"QUANTITY","applies_to":"RECEIPT","supplier_code":10,"expected":"100","actual":"104"}'), remove("/api/purchase-order-tolerances/{id}"),
  ]),
  VSEC0100: routine("VSEC0100", "Solicitação e aprovação de troca de senha", "Controla o fluxo seguro de solicitação, aprovação administrativa e conclusão da troca pelo titular.", [
    { label: "Solicitar troca", method: "POST", path: "/api/password-change-requests/" },
    list("/api/password-change-requests/", [{ name: "status", label: "Situação" }], ["status"]),
    { label: "Aprovar solicitação", method: "POST", path: "/api/password-change-requests/{requestID}/approve", adminOnly: true, fields: [{ name: "requestID", label: "ID da solicitação", required: true }] },
    { label: "Rejeitar solicitação", method: "POST", path: "/api/password-change-requests/{requestID}/reject", adminOnly: true, fields: [{ name: "requestID", label: "ID da solicitação", required: true }, { name: "reason", label: "Motivo", required: true }] },
    { label: "Concluir troca", method: "POST", path: "/api/password-change-requests/{requestID}/complete", fields: [{ name: "requestID", label: "ID da solicitação", required: true }, { name: "current_password", label: "Senha atual", type: "password", required: true }, { name: "new_password", label: "Nova senha", type: "password", required: true }, { name: "confirm_password", label: "Confirmar nova senha", type: "password", required: true }] },
  ]),
  VPLA0300: routine("VPLA0300", "Parâmetros do planejamento", "Consulta e mantém parâmetros numerados usados pelo MRP e pelo planejamento industrial.", [
    list("/api/planning-params/list"),
    { label: "Abrir parâmetro", method: "GET", path: "/api/planning-params/{number}", fields: [id("number", "Número do parâmetro")] },
    { label: "Alterar parâmetro", method: "PUT", path: "/api/planning-params/update", fields: [json('{"param_number":1,"value":"true","updated_by":"UUID_DO_USUARIO"}')] },
  ]),
  VRES0100: routine("VRES0100", "Motivos de restrição", "Mantém os motivos utilizados nas restrições comerciais e de configuração.", [
    list("/api/restriction-reason/list"), create("/api/restriction-reason/create", '{"description":"Combinação não permitida","situation":"ACTIVE"}'),
    { label: "Abrir motivo", method: "GET", path: "/api/restriction-reason/{code}", fields: [id("code", "Código")] },
    { label: "Alterar motivo", method: "PUT", path: "/api/restriction-reason/{code}", fields: [id("code", "Código"), json('{"description":"Combinação não permitida","situation":"ACTIVE"}')] },
    remove("/api/restriction-reason/{code}", [id("code", "Código")]),
  ]),
  VFIS0600: routine("VFIS0600", "SPED EFD ICMS/IPI", "Gera o arquivo texto da Escrituração Fiscal Digital para o período informado.", [
    { label: "Gerar EFD", method: "POST", path: "/api/fiscal/sped/efd", downloadFilename: "SPED_EFD_ICMS_IPI.txt", fields: [json('{"cnpj":"00000000000000","nome":"EMPRESA","uf":"SP","ie":"","im":"","suframa":"","codigo_municipio":"3550308","regime_tributario":"3","data_inicial":"2026-07-01T00:00:00Z","data_final":"2026-07-31T23:59:59Z","indicador_situacao":"0","contabilista_nome":"","contabilista_cpf":"","contabilista_crc":"","contabilista_cnpj":"","participantes":[],"unidades":[],"itens":[],"documentos_fiscais":[],"inventario":[]}')] },
  ]),
  VFIS0610: routine("VFIS0610", "Importação de NF-e de compra por chave", "Busca a NF-e na integração fiscal, cria a entrada, baixa o pedido e movimenta o estoque.", [
    create("/api/fiscal/entries/import-nfe/", '{"chave_acesso":"00000000000000000000000000000000000000000000","purchase_order_code":1000,"warehouse_id":1}'),
  ]),
  VADM0100: routine("VADM0100", "Trilha de auditoria", "Consulta alterações autenticadas por usuário, rota e período; acesso exclusivo de administrador.", [
    { label: "Consultar", method: "GET", path: "/api/audit-log", adminOnly: true, fields: [{ name: "user_id", label: "Usuário" }, { name: "route", label: "Rota" }, { name: "from", label: "De", type: "datetime-local" }, { name: "to", label: "Até", type: "datetime-local" }, { name: "limit", label: "Limite", type: "number", defaultValue: "100" }, { name: "offset", label: "Deslocamento", type: "number", defaultValue: "0" }], query: ["user_id", "route", "from", "to", "limit", "offset"] },
  ]),
  VEXP0110: routine("VEXP0110", "Gestão de cargas de expedição", "Monta a carga com romaneios e notas fiscais e conduz seu ciclo até o despacho.", [
    list("/api/shipments/loads", [{ name: "status", label: "Situação" }, { name: "carrier_code", label: "Transportadora", type: "number" }, { name: "from", label: "De", type: "date" }, { name: "to", label: "Até", type: "date" }], ["status", "carrier_code", "from", "to"]),
    create("/api/shipments/loads", '{"description":"Carga São Paulo","carrier_code":10,"vehicle_plate":"ABC1D23","driver_name":"Motorista","driver_document":"00000000000","route_code":"SP-01","origin":"Matriz","destination":"São Paulo","dispatch_box_code":"BOX-01","planned_ship_date":"2026-07-15","estimated_delivery":"2026-07-16","notes":"Conferir lacres"}'),
    { label: "Abrir carga", method: "GET", path: "/api/shipments/loads/{loadCode}", fields: [id("loadCode", "Carga")] },
    { label: "Adicionar romaneio", method: "POST", path: "/api/shipments/loads/{loadCode}/shipments", fields: [id("loadCode", "Carga"), json('{"shipment_code":1001,"sequence":1}')] },
    { label: "Remover romaneio", method: "DELETE", path: "/api/shipments/loads/{loadCode}/shipments/{shipmentCode}", fields: [id("loadCode", "Carga"), id("shipmentCode", "Romaneio")] },
    { label: "Adicionar nota fiscal", method: "POST", path: "/api/shipments/loads/{loadCode}/fiscal-notes", fields: [id("loadCode", "Carga"), json('{"shipment_code":1001,"fiscal_exit_id":50,"nfe_number":12345,"nfe_key":"","sequence":1}')] },
    { label: "Liberar carga", method: "POST", path: "/api/shipments/loads/{loadCode}/release", fields: [id("loadCode", "Carga")] },
    { label: "Iniciar carregamento", method: "POST", path: "/api/shipments/loads/{loadCode}/start-loading", fields: [id("loadCode", "Carga")] },
    { label: "Concluir carregamento", method: "POST", path: "/api/shipments/loads/{loadCode}/finish-loading", fields: [id("loadCode", "Carga")] },
    { label: "Despachar carga", method: "POST", path: "/api/shipments/loads/{loadCode}/ship", fields: [id("loadCode", "Carga")] },
    { label: "Cancelar carga", method: "POST", path: "/api/shipments/loads/{loadCode}/cancel", fields: [id("loadCode", "Carga")] },
    { label: "Vincular caixa", method: "POST", path: "/api/shipments/loads/{loadCode}/box", fields: [id("loadCode", "Carga"), json('{"box_code":"BOX-01"}')] },
    { label: "Monitor geral", method: "GET", path: "/api/shipments/loads/monitor" },
    { label: "Monitor de separação", method: "GET", path: "/api/shipments/loads/separation-monitor" },
    { label: "Painel logístico", method: "GET", path: "/api/shipments/loads/logistic-panel" },
  ]),
  VEXP0120: routine("VEXP0120", "Instruções e caixas de despacho", "Mantém orientações de entrega e posições físicas usadas na montagem das cargas.", [
    list("/api/shipments/delivery-instructions", [{ name: "load_code", label: "Carga", type: "number" }, { name: "active_only", label: "Somente ativas", type: "checkbox", defaultValue: true }], ["load_code", "active_only"]),
    create("/api/shipments/delivery-instructions", '{"load_code":100,"customer_id":200,"title":"Agendamento obrigatório","instruction":"Entregar somente após confirmação do cliente.","priority":1}'),
    list("/api/shipments/dispatch-boxes", [{ name: "active_only", label: "Somente ativas", type: "checkbox", defaultValue: true }], ["active_only"]),
    create("/api/shipments/dispatch-boxes", '{"code":"BOX-01","description":"Doca principal","warehouse_id":1,"zone":"EXPEDICAO"}'),
  ]),
  VCLI0117: routine("VCLI0117", "Permissões e restrições de venda", "Mantém e avalia restrições por cliente, item e contexto comercial usando o motor real de regras.", [
    list("/api/restriction/list"),
    create("/api/restriction/create", '{"name":"Bloqueio comercial","attribute":"customer_code","operator":"==","value":"100"}'),
    { label: "Abrir restrição", method: "GET", path: "/api/restriction/{code}", fields: [id("code", "Código")] },
    { label: "Restrições do cliente", method: "GET", path: "/api/restriction/customer/{customerCode}", fields: [id("customerCode", "Cliente")] },
    { label: "Restrições do item", method: "GET", path: "/api/restriction/item/{itemCode}", fields: [id("itemCode", "Item")] },
    { label: "Alterar restrição", method: "PUT", path: "/api/restriction/{code}", fields: [id("code", "Código"), json('{"name":"Bloqueio comercial","attribute":"customer_code","operator":"==","value":"100"}')] },
    create("/api/restriction/evaluate", '{"customer_code":100,"item_code":200,"context":{"channel":"DIRECT"}}'),
    { label: "Desativar", method: "PATCH", path: "/api/restriction/{code}/deactivate", fields: [id("code", "Código")] },
  ]),
  VCLI0202: routine("VCLI0202", "Políticas de frete e formação de preço", "Mantém o percentual de frete e demais componentes da política comercial aplicada à formação do preço.", [
    list("/api/customers/support/sales-price-policies/"),
    create("/api/customers/support/sales-price-policies/", '{"description":"Política padrão","cost_source":"STANDARD","priority":1,"sequence":1,"policy_scope":"CUSTOMER","policy_types":"FREIGHT","markup_pct":0,"margin_pct":0,"max_margin_pct":0,"ideal_margin_pct":0,"margin_step_pct":0,"expenses_pct":0,"taxes_pct":0,"freight_pct":5,"commission_pct":0,"discount_pct":0,"min_margin_pct":0,"max_discount_pct":0,"incidences_json":{},"observation":"Frete comercial"}'),
    { label: "Abrir política", method: "GET", path: "/api/customers/support/sales-price-policies/{code}", fields: [id("code", "Código")] },
    { label: "Alterar política", method: "PUT", path: "/api/customers/support/sales-price-policies/{code}", fields: [id("code", "Código"), json('{"description":"Política padrão","cost_source":"STANDARD","priority":1,"sequence":1,"policy_scope":"CUSTOMER","policy_types":"FREIGHT","markup_pct":0,"margin_pct":0,"max_margin_pct":0,"ideal_margin_pct":0,"margin_step_pct":0,"expenses_pct":0,"taxes_pct":0,"freight_pct":5,"commission_pct":0,"discount_pct":0,"min_margin_pct":0,"max_discount_pct":0,"incidences_json":{},"observation":"Frete comercial"}')] },
  ]),
  VFIN0600: routine("VFIN0600", "Adiantamentos de clientes e fornecedores", "Registra antecipações financeiras, consulta o saldo e aplica o valor disponível em contas a pagar ou a receber.", [
    list("/api/financial/adiantamentos/list", [{ name: "tipo", label: "Tipo", help: "PAGAR para fornecedor ou RECEBER para cliente." }, { name: "parceiro_id", label: "Parceiro", type: "number" }], ["tipo", "parceiro_id"]),
    create("/api/financial/adiantamentos/create", '{"tipo":"PAGAR","parceiro_id":10,"conta_bancaria_id":1,"numero_documento":"ADI-2026-001","data_adiantamento":"2026-07-14","valor_original":1000,"descricao":"Antecipação contratual"}'),
    { label: "Abrir adiantamento", method: "GET", path: "/api/financial/adiantamentos/{id}", fields: [id()] },
    { label: "Aplicar em título", method: "POST", path: "/api/financial/adiantamentos/{id}/aplicar", fields: [id(), json('{"conta_tipo":"PAGAR","conta_id":100,"valor":250,"data_aplicacao":"2026-07-14"}')] },
  ]),
  VFIN0610: routine("VFIN0610", "Remessa bancária CNAB 240", "Gera e baixa o arquivo de remessa CNAB 240 com a configuração bancária e os títulos informados.", [
    { label: "Gerar remessa", method: "POST", path: "/api/financial/cnab/remessa-240", downloadFilename: "remessa.rem", fields: [json('{"config":{"BankCode":"001","BankName":"BANCO DO BRASIL","CompanyName":"EMPRESA EXEMPLO LTDA","CompanyCNPJ":"00000000000191","Agencia":"1234","AgenciaDV":"5","Conta":"123456","ContaDV":"7","Convenio":"123456","SequenceNSA":1,"Carteira":"1","EspecieTitulo":"02","LayoutArquivo":"083","LayoutLote":"042"},"titulos":[{"nosso_numero":"123456789","numero_documento":"FAT-001","vencimento":"2026-08-14","valor":500,"emissao":"2026-07-14","sacado_nome":"CLIENTE","sacado_tipo":2,"sacado_documento":"00000000000191","sacado_endereco":"RUA CENTRAL 100","sacado_bairro":"CENTRO","sacado_cidade":"SAO PAULO","sacado_uf":"SP","sacado_cep":"01001000"}]}')], adminOnly: true },
  ]),
  VFIN0620: routine("VFIN0620", "Conciliação bancária por OFX", "Importa um extrato OFX real, identifica movimentos e concilia os lançamentos na conta bancária selecionada.", [
    { label: "Importar arquivo OFX", method: "POST", path: "/api/financial/conciliacao/{conta_id}/importar-ofx", fields: [id("conta_id", "Conta bancária"), { name: "ofx_content", label: "Arquivo OFX", type: "file-text", required: true, accept: ".ofx,application/x-ofx,text/plain", help: "Selecione o arquivo exportado pelo banco. O conteúdo é enviado ao backend para importação." }] },
  ]),
  VSUP0660: routine("VSUP0660", "Parâmetros e contatos complementares do fornecedor", "Configura regras corporativas do cadastro de fornecedores e inclui telefones e e-mails em contatos já persistidos.", [
    { label: "Consultar parâmetros", method: "GET", path: "/api/suppliers/support/parameters/{enterpriseCode}", fields: [id("enterpriseCode", "Empresa")] },
    { label: "Salvar parâmetros", method: "PUT", path: "/api/suppliers/support/parameters/", fields: [json('{"enterprise_code":1,"default_financial_account":"2.1.1","unique_item_code_per_supplier":true,"requires_financial_account":true,"purchase_supplier_type_id":1,"copy_obs_to_purchase_order":true,"copy_obs_to_entry_invoice":true,"homologation_default":false,"use_stock_uom":true,"generic_supplier_code":null,"default_due_base_date":"EMISSAO"}')] },
    create("/api/suppliers/contacts/phones", '{"contact_id":1,"value":"11999999999","ranking":1}'),
    create("/api/suppliers/contacts/emails", '{"contact_id":1,"value":"compras@fornecedor.com.br","ranking":1}'),
  ]),
  VSUP0670: routine("VSUP0670", "Itens do fornecedor e relatórios de qualidade", "Consulta os itens vinculados ao fornecedor e mantém evidências documentais de qualidade do vínculo item-fornecedor.", [
    { label: "Itens por fornecedor", method: "GET", path: "/api/item-suppliers/supplier/{supplierCode}", fields: [id("supplierCode", "Fornecedor")] },
    { label: "Consultar relatórios", method: "GET", path: "/api/item-suppliers/{id}/quality-reports", fields: [id("id", "Vínculo item-fornecedor")] },
    { label: "Anexar relatório", method: "POST", path: "/api/item-suppliers/{id}/quality-reports", fields: [id("id", "Vínculo item-fornecedor"), { name: "registered_on", label: "Data do relatório", type: "date", required: true }, { name: "status", label: "Situação", required: true }, { name: "file_name", label: "Nome do arquivo", required: true }, { name: "content_type", label: "Tipo MIME", required: true, placeholder: "application/pdf" }, { name: "content", label: "Arquivo do relatório", type: "file-base64", required: true, accept: ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg", help: "O arquivo real é convertido para Base64 e persistido pelo backend." }, { name: "notes", label: "Observações", type: "textarea" }] },
  ]),
  VSUP0680: routine("VSUP0680", "Fontes e atualização de preços de compra", "Consulta candidatos e preços originados de compras, aplica seleções na tabela e copia ajustes entre seus itens.", [
    { label: "Consultar fontes", method: "GET", path: "/api/purchase-price-tables/sources", fields: [{ name: "start", label: "Data inicial", type: "date", required: true }, { name: "end", label: "Data final", type: "date", required: true }, { name: "supplier_code", label: "Fornecedor", type: "number" }, { name: "table_code", label: "Tabela", type: "number" }, { name: "source", label: "Origem" }], query: ["start", "end", "supplier_code", "table_code", "source"] },
    { label: "Consultar candidatos", method: "GET", path: "/api/purchase-price-tables/{code}/candidates", fields: [id("code", "Tabela"), { name: "mode", label: "Modo", defaultValue: "INTERNAL" }, { name: "order", label: "Ordenação", defaultValue: "NUMERIC" }, { name: "classification_id", label: "Classificação", type: "number" }], query: ["mode", "order", "classification_id"] },
    create("/api/purchase-price-tables/sources/apply", '{"table_code":1,"overwrite":false,"selections":[{"source_type":"PURCHASE_ORDER","source_id":100}]}'),
    create("/api/purchase-price-tables/items/copy-adjustments", '{"source_item_id":1,"target_item_id":2,"mode":"COPY"}'),
  ]),
  VENG0600: routine("VENG0600", "Rede de precedência do roteiro", "Mantém dependências predecessor-sucessor e sobreposição entre operações de um roteiro de fabricação.", [
    { label: "Definir dependência", method: "POST", path: "/api/routing/route-operations/{routeId}/network/set", fields: [id("routeId", "Roteiro"), { name: "predecessor_id", label: "Operação predecessora", type: "number", required: true }, { name: "successor_id", label: "Operação sucessora", type: "number", required: true }, { name: "overlap_pct", label: "Sobreposição (%)", type: "number", required: true }] },
    { label: "Remover dependência", method: "DELETE", path: "/api/routing/route-operations/{routeId}/network", destructive: true, fields: [id("routeId", "Roteiro"), { name: "predecessor_id", label: "Operação predecessora", type: "number", required: true }, { name: "successor_id", label: "Operação sucessora", type: "number", required: true }] },
  ]),
  VENG0610: routine("VENG0610", "Seriais físicos de ferramentas", "Consulta, corrige situação e desativa instâncias físicas serializadas das ferramentas industriais.", [
    { label: "Consultar serial", method: "GET", path: "/api/routing/tools/serials/{serialId}", fields: [id("serialId", "Serial")] },
    { label: "Alterar serial", method: "PUT", path: "/api/routing/tools/serials/{serialId}", fields: [id("serialId", "Serial"), json('{"serial_number":"FER-0001","status":"AVAILABLE","location":"FERRAMENTARIA","notes":"Inspeção dimensional aprovada"}')] },
    { label: "Desativar serial", method: "DELETE", path: "/api/routing/tools/serials/{serialId}", fields: [id("serialId", "Serial")], destructive: true },
  ]),
  VCLI0600: routine("VCLI0600", "Manutenção avançada de preços de venda", "Consulta preço pontual e histórico, altera ou exclui uma linha e gera preços em lote pela política comercial.", [
    { label: "Preço do item", method: "GET", path: "/api/customers/support/sales-tables/{tableCode}/prices/{itemCode}", fields: [id("tableCode", "Tabela"), { name: "itemCode", label: "Item", required: true }] },
    { label: "Histórico de preços", method: "GET", path: "/api/customers/support/sales-tables/{tableCode}/price-history", fields: [id("tableCode", "Tabela"), { name: "item_code", label: "Item" }], query: ["item_code"] },
    { label: "Alterar preço", method: "PUT", path: "/api/customers/support/sales-tables/prices/", fields: [json('{"id":1,"price":125.5,"ume":"UN","umc":"UN","price_conv":125.5,"formula":"","situation":"ATIVO","blocked":false,"observation":"Revisão comercial","product_line_id":null,"item_mask":""}')] },
    { label: "Excluir preço", method: "DELETE", path: "/api/customers/support/sales-tables/prices/{id}", fields: [id()], destructive: true },
    create("/api/customers/support/sales-tables/generate-prices", '{"sales_table_code":1,"policy_code":1,"item_codes":["100","101"],"warehouse_id":1,"reason":"Revisão periódica"}'),
  ]),
  VCTB0600: routine("VCTB0600", "SPED ECD — Escrituração Contábil Digital", "Gera e baixa o arquivo texto da ECD com plano, lançamentos e dados cadastrais persistidos no backend.", [
    { label: "Gerar SPED ECD", method: "POST", path: "/api/accounting/sped/ecd/", downloadFilename: "SPED_ECD.txt", fields: [json('{"plan_id":1,"empresa_id":1,"from":"2026-01-01","to":"2026-12-31","empresa":{"CNPJ":"00000000000191","CPF":"","Nome":"EMPRESA LTDA","UF":"SP","Email":"contabilidade@empresa.com.br","IE":"110042490114","CodigoMunicipio":"3550308","CEP":"01001000","Endereco":"PRACA DA SE","Numero":"100","Complemento":"","Bairro":"SE","Fone":"1130000000","NIRE":"35123456789","IndSitAtiv":"0","IndNireCert":"0","IndGrandePorte":"0","IndEscCons":"N","TipoECD":"0","HashECDSub":"","NumOrd":"1","NomeAudi":"","IndSitEsp":"0"},"livros":[{"NumOrd":"1","NatLivro":"G","NumLiv":"1","DescLiv":"LIVRO DIARIO GERAL","CodHash":"","NumHash":"","PerIni":"2026-01-01T00:00:00Z","PerFin":"2026-12-31T23:59:59Z","CodHashAnt":"","NumHashAnt":""}]}')] },
  ]),
  VFIS0620: routine("VFIS0620", "Manifestação do destinatário e inutilização", "Envia à SEFAZ eventos de manifestação de NF-e recebida e inutiliza faixas não utilizadas de numeração própria.", [
    create("/api/fiscal/manifestacao", '{"chave_nfe":"00000000000000000000000000000000000000000000","tipo":"CIENCIA","justificativa":"Documento identificado e aguardando conferência"}'),
    create("/api/fiscal/inutilizacao", '{"serie":1,"numero_inicial":100,"numero_final":105,"justificativa":"Faixa não utilizada por falha controlada de numeração"}'),
  ]),
  VFIS0630: routine("VFIS0630", "Tabela IBPT e carga tributária aproximada", "Importa o arquivo oficial IBPT/SCI por UF e consulta a carga tributária vigente por NCM.", [
    { label: "Importar tabela IBPT", method: "POST", path: "/api/fiscal/ibpt/import", adminOnly: true, fields: [{ name: "uf", label: "UF", required: true }, { name: "csv", label: "Arquivo CSV IBPT", type: "file-text", required: true, accept: ".csv,text/csv,text/plain", help: "Selecione o CSV oficial, separado por ponto e vírgula." }] },
    { label: "Consultar alíquota", method: "GET", path: "/api/fiscal/ibpt/lookup", fields: [{ name: "ncm", label: "NCM", required: true }, { name: "uf", label: "UF", required: true }], query: ["ncm", "uf"] },
  ]),
  VFIS0640: routine("VFIS0640", "Faturamento fiscal de carga e DANFE", "Cria a NF-e de saída a partir de uma carga persistida e recupera os endereços oficiais do DANFE e XML autorizados.", [
    create("/api/fiscal/exits/from-load", '{"load_code":100,"serie":"1","data_emissao":"2026-07-14","data_saida":"2026-07-14","cnpj_destinatario":"00000000000191","razao_social_destinatario":"CLIENTE LTDA","ie_destinatario":"ISENTO","uf_destinatario":"SP","tipo_pessoa":"J","cfop":"5102","natureza_operacao":"VENDA DE MERCADORIA","valor_frete":0,"valor_seguro":0,"valor_desconto":0,"origem_mercadoria":"0","item_overrides":[]}'),
    { label: "Consultar DANFE", method: "GET", path: "/api/fiscal/exits/{id}/danfe", fields: [id("id", "NF-e de saída")] },
  ]),
  VFIS0120: routine("VFIS0120", "Exclusão controlada de tributação NCM", "Remove do cadastro fiscal uma tributação de NCM que não deve mais ser utilizada pela empresa.", [
    { label: "Excluir tributação NCM", method: "DELETE", path: "/api/fiscal/tabelas/ncm/{ncm}", fields: [{ name: "ncm", label: "NCM", required: true }], destructive: true },
  ]),
  VFIS0660: routine("VFIS0660", "Consultas pontuais de parâmetros fiscais", "Localiza cadastros fiscais por chave, tipo, UF, item, NCM, período ou identificador sem alterar os registros.", [
    { label: "Dispositivo por código", method: "GET", path: "/api/fiscal/support/dispositivos-legais/{code}", fields: [id("code", "Dispositivo")] },
    { label: "Dispositivos por tipo", method: "GET", path: "/api/fiscal/support/dispositivos-legais/tipo/{type}", fields: [{ name: "type", label: "Tipo", required: true }] },
    { label: "CFOP por código", method: "GET", path: "/api/fiscal/support/cfops/{code}", fields: [id("code", "CFOP")] },
    { label: "CFOPs por direção", method: "GET", path: "/api/fiscal/support/cfops/direcao/{direction}", fields: [{ name: "direction", label: "Direção", required: true, help: "Informe ENTRADA ou SAIDA conforme o cadastro." }] },
    { label: "Parâmetro por ID", method: "GET", path: "/api/fiscal/support/parametros-icms-ipi/{id}", fields: [id()] },
    { label: "Parâmetros por UF", method: "GET", path: "/api/fiscal/support/parametros-icms-ipi/uf/{uf}", fields: [{ name: "uf", label: "UF", required: true }] },
    { label: "Parâmetros por item", method: "GET", path: "/api/fiscal/support/parametros-icms-ipi/item/{itemCode}", fields: [id("itemCode", "Item")] },
    { label: "Parâmetros por NCM", method: "GET", path: "/api/fiscal/support/parametros-icms-ipi/ncm/{ncmCode}", fields: [{ name: "ncmCode", label: "NCM", required: true }] },
    { label: "Motivo DAPI por código", method: "GET", path: "/api/fiscal/support/motivos-transferencia-dapi/{code}", fields: [{ name: "code", label: "Motivo", required: true }] },
    { label: "Ajuste de apuração por ID", method: "GET", path: "/api/fiscal/support/codigos-ajuste-apuracao-icms/{id}", fields: [id()] },
    { label: "Ajuste ICMS por ID", method: "GET", path: "/api/fiscal/support/codigos-ajuste-icms/{id}", fields: [id()] },
    { label: "Linha de apuração", method: "GET", path: "/api/fiscal/support/linhas-apuracao-icms/{code}", fields: [{ name: "code", label: "Linha", required: true }] },
    { label: "Lançamento resumo por ID", method: "GET", path: "/api/fiscal/support/lancamentos-resumo-icms/{id}", fields: [id()] },
    { label: "Apuração do Simples", method: "GET", path: "/api/fiscal/support/apuracao-simples-nacional/{period}/{annex}", fields: [{ name: "period", label: "Competência", required: true, placeholder: "2026-07" }, { name: "annex", label: "Anexo", required: true }] },
  ]),
  VUTL0560: routine("VUTL0560", "Consulta pontual de UF e região comercial", "Localiza uma UF pela sigla e uma região comercial pelo código usando os cadastros corporativos.", [
    { label: "Consultar UF", method: "GET", path: "/api/location/ufs/{sigla}", fields: [{ name: "sigla", label: "Sigla", required: true }] },
    { label: "Consultar região", method: "GET", path: "/api/customers/support/regions/{code}", fields: [id("code", "Região")] },
  ]),
  VIMP0102: routine("VIMP0102", "Conhecimentos de transporte CT-e", "Cadastra, consulta e autoriza conhecimentos de transporte vinculáveis às entradas e processos logísticos.", [
    list("/api/fiscal/cte/list"),
    create("/api/fiscal/cte/create", '{"numero_cte":1,"serie":"1","data_emissao":"2026-07-14","data_entrada":"2026-07-14","cnpj_emitente":"00000000000000","razao_social_emitente":"TRANSPORTADORA","cfop":"1353","valor_frete":100,"valor_seguro":0,"valor_outros":0,"valor_total":100,"valor_icms":0,"base_icms":0,"aliq_icms":0,"tipo_rateio":"VALOR","notes":"Conhecimento de importação"}'),
    { label: "Abrir CT-e", method: "GET", path: "/api/fiscal/cte/{code}", fields: [id("code", "Código")] },
    { label: "Autorizar CT-e", method: "POST", path: "/api/fiscal/cte/{code}/authorize", fields: [id("code", "Código")] },
  ]),
  VGAR0211: routine("VGAR0211", "Devoluções de atendimento e garantia", "Registra e consulta retornos associados ao chamado real do consumidor.", [
    { label: "Abrir chamado", method: "GET", path: "/api/consumer-service/calls/{code}", fields: [id("code", "Chamado")] },
    { label: "Registrar retorno", method: "POST", path: "/api/consumer-service/calls/{code}/returns", fields: [id("code", "Chamado"), json('{"contacted_at":"2026-07-14T10:00:00Z","contact_type":"PHONE","description":"Cliente orientado sobre a devolução.","next_return_at":"2026-07-15T10:00:00Z","user_code":1}')] },
  ]),
  VENG0500: routine("VENG0500", "Consulta e manutenção avançada de estruturas", "Altera componentes e consulta filhos, explosão e onde-usado da estrutura do item.", [
    { label: "Alterar componente", method: "PUT", path: "/api/items/structure/update", fields: [json('{"parent_item_code":100,"component_item_code":200,"sequence":10,"quantity":"1","valid_from":"2026-07-14"}')] },
    { label: "Filhos diretos", method: "GET", path: "/api/items/structure/{parentItemCode}/children", fields: [id("parentItemCode", "Item pai")] },
    { label: "Consultar estrutura", method: "GET", path: "/api/items/structure/consult", fields: [{ name: "item_code", label: "Item", type: "number", required: true }, { name: "mask", label: "Máscara" }, { name: "effectiveness_date", label: "Efetividade", type: "date" }, { name: "levels", label: "Níveis (0 = todos)", type: "number", defaultValue: "0" }], query: ["item_code", "mask", "effectiveness_date", "levels"] },
    { label: "Onde usado", method: "GET", path: "/api/items/structure/where-used/{itemCode}", fields: [id("itemCode", "Componente"), { name: "levels", label: "Níveis (0 = todos)", type: "number", defaultValue: "0" }], query: ["levels"] },
  ]),
  VMAQ0300: routine("VMAQ0300", "Tempos e programação de máquina", "Registra tempos produtivos do item e agenda ordens na máquina real.", [
    { label: "Registrar tempo", method: "POST", path: "/api/machine/time/{code}", fields: [id("code", "Máquina"), json('{"item_code":100,"priority":1,"production_time":1.5}')] },
    { label: "Programar máquina", method: "POST", path: "/api/machine/schedule/{code}", fields: [id("code", "Máquina"), json('{"order_code":1000,"schedule_date":"2026-07-15","start_time":"2026-07-15T08:00:00Z","end_time":"2026-07-15T10:00:00Z","planned_qty":10,"produced_qty":0,"status":"PLANNED","sequence":1,"notes":"Programação APS"}')] },
  ]),
  VCAL0200: routine("VCAL0200", "Dias úteis prometidos por item", "Consulta o calendário mensal efetivo usado na promessa do item e da configuração.", [
    { label: "Consultar dias úteis", method: "GET", path: "/api/item-calendar-promise/{item_code}/{mask}/{year}/{month}/workdays", fields: [id("item_code", "Item"), { name: "mask", label: "Máscara", defaultValue: "-", required: true }, { name: "year", label: "Ano", type: "number", required: true }, { name: "month", label: "Mês", type: "number", required: true }] },
  ]),
  VPRO1100: routine("VPRO1100", "Parâmetros de estoque da manufatura", "Configura lotes, baixa automática, controle por item e endereçamento de almoxarifados da produção.", [
    { label: "Parâmetros gerais", method: "PUT", path: "/api/production-order/manufacturing-stock-settings", fields: [json('{"lot_return_mode":"ORIGINAL","auto_issue_lots":false,"movement_from":"2026-07-01T00:00:00Z","movement_to":"2026-07-31T23:59:59Z"}')] },
    { label: "Controle por item", method: "PUT", path: "/api/production-order/manufacturing-item-stock-settings", fields: [json('{"item_code":100,"stock_uom":"UN","controls_lot":true,"controls_address":false,"inventory_group_type":"MATERIAL","automatic_issue_type":"MANUAL","line_warehouse_id":1}')] },
    { label: "Endereços de almoxarifado", method: "PUT", path: "/api/production-order/warehouse-addresses", fields: [json('{"warehouse_id":1,"is_wms":false,"intermediate_out_warehouse_id":2}')] },
    list("/api/warehouse/list"),
  ]),
  VVND0600: routine("VVND0600", "Análise, atendimento e conferência de pedidos", "Executa as decisões pós-cadastro que controlam análise, atendimento, conferência e atraso do pedido de venda.", [
    { label: "Analisar", method: "POST", path: "/api/sales-order/{code}/analyze", fields: [id("code", "Pedido"), json('{"area":"COMMERCIAL","status":"APPROVED","reason":"Análise concluída"}')] },
    { label: "Atender", method: "POST", path: "/api/sales-order/{code}/attend", fields: [id("code", "Pedido"), json('{"reason":"Pedido atendido","event_date":"2026-07-14"}')] },
    { label: "Conferir", method: "POST", path: "/api/sales-order/{code}/conference", fields: [id("code", "Pedido"), json('{"status":"CONFERRED","reason":"Conferência concluída"}')] },
    { label: "Motivo de atraso", method: "POST", path: "/api/sales-order/{code}/delay-reason", fields: [id("code", "Pedido"), json('{"reason":"Aguardando transportadora","action":"RESCHEDULE"}')] },
  ]),
  VVND0610: routine("VVND0610", "Reajuste de venda recorrente", "Recalcula o valor ajustado de um contrato recorrente existente e registra o motivo comercial do reajuste.", [
    { label: "Recalcular reajuste", method: "POST", path: "/api/recurring-sales/{code}/recalculate-adjustment", fields: [id("code", "Venda recorrente"), { name: "adjustment_percent", label: "Percentual de reajuste", type: "number", required: true, help: "Informe o percentual contratual; use valor negativo somente para redução autorizada." }, { name: "reason", label: "Motivo", type: "textarea", required: true }] },
  ]),
  VSAC0200: routine("VSAC0200", "Relatórios, etiquetas e anexos do atendimento", "Gera consultas operacionais e vincula documentos persistidos ao chamado do consumidor.", [
    { label: "Etiquetas de consumidores", method: "GET", path: "/api/consumer-service/consumers/labels" },
    { label: "Relatório de contatos", method: "GET", path: "/api/consumer-service/customer-contacts/report" },
    { label: "Etiquetas de chamados", method: "GET", path: "/api/consumer-service/calls/labels" },
    { label: "Vincular anexo", method: "POST", path: "/api/consumer-service/calls/{code}/attachments", fields: [id("code", "Chamado"), json('{"file_name":"evidencia.pdf","file_path":"/documentos/evidencia.pdf","content_type":"application/pdf","notes":"Documento recebido do cliente"}')] },
  ]),
  VREP0600: routine("VREP0600", "Complementos do representante", "Mantém segmentos, planos de venda, interesses e endereços de correspondência do representante.", [
    create("/api/representatives/segments", '{"representative_code":1,"segment_code":1,"is_primary":true}'),
    create("/api/representatives/sales-plans", '{"representative_code":1,"sales_plan_code":1,"valid_from":"2026-07-14"}'),
    create("/api/representatives/interests", '{"representative_code":1,"description":"Linha industrial"}'),
    create("/api/representatives/correspondence-addresses", '{"representative_code":1,"postal_code":"00000000","city":"São Paulo","state":"SP","street":"Rua Exemplo","street_number":"100"}'),
  ]),
  VEST0400: routine("VEST0400", "Consultas de movimentos e saldos por almoxarifado", "Consulta movimentos, saldo pontual e posição consolidada do estoque real.", [
    { label: "Movimentos do almoxarifado", method: "GET", path: "/api/stock/movements/warehouse/{warehouseId}", fields: [id("warehouseId", "Almoxarifado")] },
    { label: "Consultar saldo", method: "GET", path: "/api/stock/balances/get", fields: [{ name: "item_code", label: "Item", type: "number", required: true }, { name: "warehouse_id", label: "Almoxarifado", type: "number", required: true }, { name: "lot", label: "Lote" }], query: ["item_code", "warehouse_id", "lot"] },
    { label: "Saldos do almoxarifado", method: "GET", path: "/api/stock/balances/warehouse/{warehouseId}", fields: [id("warehouseId", "Almoxarifado")] },
  ]),
};

// Rotinas legadas que descrevem o mesmo agregado funcional. Mantêm seu código
// histórico no menu, mas usam o contrato real em vez das antigas telas mockadas.
const alias = (code: string, title: string, target: string): void => {
  const base = OPERATIONAL_ROUTINES[target];
  OPERATIONAL_ROUTINES[code] = { ...base, code, title };
};
alias("VIMP0200", "Console de Processos de Importação", "VIMP0300");
alias("VAVF0204", "Cálculo e Envio de IQF", "VAVF0300");
alias("VINS0201", "Manutenção das Ordens de Inspeção", "VSUP0600");
alias("VINS0206", "Exclusão e Tratamento de Ordens de Inspeção", "VSUP0600");
alias("VINS0313", "Consulta de Inspeções de Recebimento", "VSUP0600");
alias("VINS0400", "Consulta de Ocorrências e Ordens de Inspeção", "VSUP0600");
alias("VENG0204", "Regras de Variáveis Equivalentes", "VCFG0600");
alias("VITE0118", "Regras de Itens Configurados", "VCFG0600");
alias("VITE0313", "Geração de Máscaras Configuradas", "VCFG0400");
alias("VPLC0200", "Montagem e Gestão de Cargas", "VEXP0110");
alias("VPLC0211", "Instruções de Entrega", "VEXP0120");
alias("VVOR0202", "Fornecedor e Qualidade por Item", "VSUP0670");
alias("VIMP0101", "Status Logístico da Importação", "VEXP0110");
alias("VITE0129", "Recarga de Descrições de Itens Configurados", "VCFG0500");

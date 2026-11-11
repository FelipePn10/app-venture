import type { OperationalRoutine, RoutineField, RoutineOperation } from "./OperationalRoutinePage";

const id = (name = "id", label = "Código"): RoutineField => ({ name, label, type: "number", required: true });
const json = (placeholder: string): RoutineField => ({ name: "__body", label: "Dados da operação", type: "json", required: true, placeholder });
const list = (path: string, fields: RoutineField[] = [], query: string[] = [], label = "Consultar"): RoutineOperation => ({ label, method: "GET", path, fields, query });
const create = (path: string, example: string, adminOnly = false, label = "Cadastrar"): RoutineOperation => ({ label, method: "POST", path, fields: [json(example)], adminOnly });
const remove = (path: string, fields: RoutineField[] = [id()], adminOnly = false, label = "Desativar / excluir"): RoutineOperation => ({ label, method: "DELETE", path, fields, destructive: true, adminOnly });
const routine = (code: string, title: string, description: string, operations: RoutineOperation[]): OperationalRoutine => ({ code, title, description, guidance: "Selecione uma operação, preencha os dados e confira o retorno antes de avançar no fluxo.", operations });

export const OPERATIONAL_ROUTINES: Record<string, OperationalRoutine> = {
  VIMP0200: routine("VIMP0200", "Console de processos de importação", "Consulta e mantém processos, itens, despesas, custo nacionalizado e situação usando exclusivamente a camada operacional do backend.", [
    list("/api/procurement/import-processes", [{ name: "status", label: "Status" }], ["status"]),
    create("/api/procurement/import-processes", '{"enterprise_code":1,"supplier_code":10,"reference":"IMP-2026-001","incoterm":"FOB","currency":"USD","exchange_rate":5.5,"apportion_basis":"VALUE","items":[{"item_code":100,"mask":"","quantity":10,"weight":50,"fob_unit_price":100}],"expenses":[{"expense_type":"FREIGHT","amount":500,"in_item_cost":true}]}'),
    { label: "Abrir processo", method: "GET", path: "/api/procurement/import-processes/{id}", fields: [id()] },
    { label: "Recalcular custo", method: "POST", path: "/api/procurement/import-processes/{id}/recompute", fields: [id()] },
    { label: "Alterar situação", method: "PATCH", path: "/api/procurement/import-processes/{id}/status", fields: [id(), { name: "status", label: "Nova situação", required: true }] },
  ]),

  VCFG0100: routine("VCFG0100", "Conjuntos e variáveis do configurador", "Mantém conjuntos de respostas, variáveis, composição da máscara e traduções.", [
    list("/api/configurator/sets"), create("/api/configurator/sets", '{"description":"Cores"}'),
    { label: "Abrir conjunto", method: "GET", path: "/api/configurator/sets/{id}", fields: [id()] },
    { label: "Alterar conjunto", method: "PUT", path: "/api/configurator/sets/{id}", fields: [id(), json('{"description":"Cores disponíveis","is_active":true}')] }, remove("/api/configurator/sets/{id}"),
    list("/api/configurator/sets/{id}/variables", [id()]), { label: "Cadastrar variável", method: "POST", path: "/api/configurator/sets/{id}/variables", fields: [id(), json('{"code":"AZ","description":"Azul","mask_composition":"AZ","is_special":false,"include_description":true,"special_data":"","marketing":true}')] },
    { label: "Abrir variável", method: "GET", path: "/api/configurator/variables/{varId}", fields: [id("varId", "Variável")] },
    { label: "Alterar variável", method: "PUT", path: "/api/configurator/variables/{varId}", fields: [id("varId", "Variável"), json('{"code":"AZ","description":"Azul","mask_composition":"AZ","is_active":true,"is_special":false,"include_description":true,"special_data":"","marketing":true}')] },
    remove("/api/configurator/variables/{varId}", [id("varId", "Variável")], false, "Excluir variável"),
    { label: "Traduzir variável", method: "POST", path: "/api/configurator/variables/{varId}/languages", fields: [id("varId", "Variável"), json('{"language":"en","country":"US","translation":"Blue"}')] },
    remove("/api/configurator/variables/languages/{langId}", [id("langId", "Tradução")], false, "Excluir tradução da variável"),
  ]),



  VGAR0211: routine("VGAR0211", "Devoluções de atendimento e garantia", "Registra e consulta retornos associados ao chamado real do consumidor.", [
    { label: "Listar RMAs do chamado", method: "GET", path: "/api/technical-assistance/calls/{code}/rmas", fields: [id("code", "Chamado de assistência")] },
    { label: "Abrir RMA", method: "GET", path: "/api/technical-assistance/rmas/{rmaCode}", fields: [id("rmaCode", "RMA")] },
    { label: "Solicitar RMA", method: "POST", path: "/api/technical-assistance/calls/{code}/rmas", idempotent: true, fields: [id("code", "Chamado de assistência"), json('{"reason_code":"DEVOLUCAO","reason_description":"Solicitação do cliente","eligibility_status":"ELEGIVEL","eligibility_reason":"Produto dentro das regras de garantia","sla_due_at":"2026-09-15T18:00:00Z","product_cost":0,"freight_cost":0,"service_cost":0,"items":[{"call_item_code":1,"item_code":100,"quantity":1,"serial_number":"","lot_number":"","requested_destination":"REPARO"}]}')] },
    { label: "Avançar RMA", method: "PATCH", path: "/api/technical-assistance/rmas/{rmaCode}/transition", fields: [id("rmaCode", "RMA"), json('{"status":"AUTORIZADO","reason":"Devolução autorizada","correlation_id":"operacao-rma","authorization_number":"RMA-2026-001","reverse_carrier_code":null,"reverse_tracking_code":null,"inspection_notes":null,"destination":null,"fiscal_document_key":null,"stock_movement_code":null}')] },
    { label: "Listar evidências do RMA", method: "GET", path: "/api/technical-assistance/rmas/{rmaCode}/evidences", fields: [id("rmaCode", "RMA")] },
    { label: "Enviar evidência do RMA", method: "POST", path: "/api/technical-assistance/rmas/{rmaCode}/evidences", fields: [id("rmaCode", "RMA"), { name: "file", label: "Arquivo PDF, PNG ou JPEG", type: "file-upload", required: true, accept: ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" }] },
    { label: "Baixar evidência do RMA", method: "GET", path: "/api/technical-assistance/rmas/{rmaCode}/evidences/{evidenceID}", downloadFilename: "evidencia-rma", fields: [id("rmaCode", "RMA"), { name: "evidenceID", label: "Identificador da evidência", required: true }] },
    { label: "Abrir chamado", method: "GET", path: "/api/consumer-service/calls/{code}", fields: [id("code", "Chamado do consumidor")] },
    { label: "Listar anexos do chamado", method: "GET", path: "/api/consumer-service/calls/{code}/attachments", fields: [id("code", "Chamado do consumidor")] },
    { label: "Baixar anexo", method: "GET", path: "/api/consumer-service/calls/{code}/attachments/{attachmentCode}/download", downloadFilename: "anexo-do-chamado", fields: [id("code", "Chamado do consumidor"), id("attachmentCode", "Código do anexo")] },
    { label: "Excluir anexo", method: "DELETE", path: "/api/consumer-service/calls/{code}/attachments/{attachmentCode}", destructive: true, fields: [id("code", "Chamado do consumidor"), id("attachmentCode", "Código do anexo")] },
    { label: "Registrar retorno", method: "POST", path: "/api/consumer-service/calls/{code}/returns", fields: [id("code", "Chamado do consumidor"), json('{"contacted_at":"2026-07-14T10:00:00Z","contact_type":"PHONE","description":"Cliente orientado sobre a devolução.","next_return_at":"2026-07-15T10:00:00Z","user_code":1}')] },
  ]),
  // A tela possui implementação dedicada para o multipart e os downloads; esta
  // definição mantém o contrato catalogado para as auditorias de cobertura.
};

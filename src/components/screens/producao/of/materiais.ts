import { type MaterialAvailability, type MaterialAvailabilityStatus, type MaterialDTO, type OperationDTO } from "@/services/productionOrderService";

/**
 * Uma linha por material da OF, juntando a lista (o que a estrutura pede, em
 * que etapa entra, baixa automática ou manual) com a disponibilidade (quanto
 * já saiu, quanto falta sair e se há saldo). É o "componentes da ordem" do SAP.
 */
export interface MaterialDaOF {
  id: number;
  codigo: string;
  nome: string;
  unidade: string;
  etapa?: number;
  previsto: number;
  porPeca: number;
  saiu: number;
  falta: number;
  disponivel: number;
  /** Peça fabricada pela OF filha, guardada para esta OF. */
  reservado: number;
  /** O que as OFs que começam antes vão consumir. */
  comprometido: number;
  faltaSaldo: number;
  situacao: MaterialAvailabilityStatus;
  automatica: boolean;
  almoxarifado?: number;
  substitui?: string;
  material: MaterialDTO;
}

export function materiaisDaOF(materiais: MaterialDTO[], disponibilidade: MaterialAvailability | null, planejado: number): MaterialDaOF[] {
  const porId = new Map((disponibilidade?.lines ?? []).map((l) => [l.material_id, l]));
  return materiais
    .filter((m) => !m.kind || m.kind === "DEMAND")
    .map((m) => {
      const l = m.id ? porId.get(m.id) : undefined;
      const previsto = Number(m.quantity) || 0;
      const saiu = l ? l.issued : Number(m.allocated_qty ?? 0);
      return {
        id: m.id ?? 0,
        codigo: l?.business_code || m.item_code,
        nome: l?.description ?? "",
        unidade: l?.uom ?? "",
        etapa: m.route_operation_sequence,
        previsto,
        porPeca: planejado > 0 ? previsto / planejado : 0,
        saiu,
        falta: l ? l.remaining : Math.max(0, previsto - saiu),
        disponivel: l?.available ?? 0,
        reservado: l?.reserved_for_order ?? 0,
        comprometido: l?.committed_earlier ?? 0,
        faltaSaldo: l?.shortage ?? 0,
        situacao: l?.status ?? "COMPLETA",
        automatica: !!m.automatic_issue,
        almoxarifado: m.warehouse_id,
        substitui: m.substituted_item_code,
        material: m,
      };
    })
    .sort((a, b) => (a.etapa ?? 0) - (b.etapa ?? 0) || a.codigo.localeCompare(b.codigo));
}

/** Material da etapa; o que não tem etapa definida entra na primeira. */
export function materiaisDaEtapa(linhas: MaterialDaOF[], etapa: OperationDTO, primeira: boolean): MaterialDaOF[] {
  return linhas.filter((l) => l.etapa === etapa.sequence || (primeira && (l.etapa === undefined || !l.etapa)));
}

/** A etapa em que o trabalho está: a em andamento (ou parada), senão a próxima que pode começar, senão a última. */
export function etapaAtual(ordenadas: OperationDTO[]): OperationDTO | undefined {
  return ordenadas.find((o) => o.status === "IN_PROGRESS" || o.status === "PAUSED" || o.status === "INTERRUPTED")
    ?? ordenadas.find((o) => o.can_start)
    ?? ordenadas.find((o) => o.status === "PENDING")
    ?? ordenadas[ordenadas.length - 1];
}

import { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import { confirmar } from "@/components/ui/dialogos";
import { enumLabel } from "@/utils/enumLabels";
import { LookupField } from "@/components/ui/LookupField";
import { loadItems, loadWarehouses, loadCostCenters, loadEstablishments } from "@/services/lookups";
import { lerTenantAtivo } from "@/services/tenantDirectory";
import {
  findItemByCode,
  resolveStructure,
  resolveChildLevel,
  createComponent,
  updateComponent,
  deleteComponent,
  validateMask,
  type StructureComponent,
  type CreateStructurePayload,
  type UnitOfMeasurement,
  type Health,
  type ItemInfo,
  type QuantityRounding,
  type CostLossType,
  UNIT_OPTIONS,
  COST_LOSS_OPTIONS,
  HEALTH_OPTIONS,
  ROUNDING_OPTIONS,
  verificarConfiguracao,
} from '@/services/ItemStructureService';
import { StructureConfiguratorPanel } from './StructureConfiguratorPanel';
import { StructureFormulaTester } from './StructureFormulaTester';
import { StructureHistoryPanel } from './StructureHistoryPanel';
import { StructureVersionsPanel } from './StructureVersionsPanel';
import { StructureItemLookupModal, type CandidateStructureItem } from './StructureItemLookupModal';
import { hojeLocal } from "@/utils/dataLocal";
import { useUnidades, useRotulosDeUnidades } from "@/hooks/useUnidades";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BreadcrumbEntry {
  code: string;
  label: string;
  /** Máscara derivada deste nível; null quando o componente é genérico. */
  mask: string | null;
}

interface LocalRow extends StructureComponent {
  localId: string;
  dirty: boolean;
  isNew: boolean;
  quantityEdited?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return `new_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Mostra o que o resto do sistema realmente vai usar quando a unidade da
 * estrutura difere da unidade em que o item é estocado.
 *
 * Sem isso o usuário escreve "2 M2" numa chapa estocada em quilo e não tem como
 * saber que o planejamento passou a trabalhar com 31,4 kg — nem que, se a
 * conversão não estivesse cadastrada, a gravação teria sido recusada. O número
 * convertido aqui é o mesmo que o servidor gravou, não uma conta da tela.
 */
function ConversaoDeUnidade({ row }: { row: LocalRow }): JSX.Element | null {
  const daEstrutura = row.unitOfMeasurement;
  const doEstoque = row.stockUnitOfMeasurement;
  if (!doEstoque || doEstoque === daEstrutura) return null;

  if (row.isNew || (row.loadedUom && row.loadedUom !== daEstrutura)) {
    return (
      <span className="fe-d-hint" style={{ color: 'var(--v-info)' }}>
        Estocado em {enumLabel(doEstoque)} — salve para calcular e validar a conversão a partir de {enumLabel(daEstrutura)}.
      </span>
    );
  }

  const fator = row.conversionFactor || 1;
  const convertido = row.dirty ? row.quantity * fator : (row.quantityStockUom || row.quantity * fator);

  // A equivalência é mostrada no sentido legível. Para um tubo de 6 metros o
  // fator armazenado é 1/6000 = 0,000166667 — um número que ninguém reconhece.
  // Invertido vira "1 UN = 6.000 MM", que é o que está escrito na nota do
  // fornecedor e o que a pessoa confere de cabeça.
  const equivalencia = fator < 1
    ? `1 ${enumLabel(doEstoque)} = ${(1 / fator).toLocaleString('pt-BR', { maximumFractionDigits: 4 })} ${enumLabel(daEstrutura)}`
    : `1 ${enumLabel(daEstrutura)} = ${fator.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} ${enumLabel(doEstoque)}`;

  return (
    <span className="fe-d-hint" style={{ color: 'var(--v-info)' }}>
      Estocado em {enumLabel(doEstoque)}: {row.quantity.toLocaleString('pt-BR')} {enumLabel(daEstrutura)}
      {' = '}
      <strong>{convertido.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} {enumLabel(doEstoque)}</strong>
      {' '}({equivalencia}). É este valor que o MRP reserva, a ordem consome e o custo rateia.
    </span>
  );
}

function nextPosition(rows: LocalRow[]): number {
  if (rows.length === 0) return 1;
  return Math.max(...rows.map((r) => r.position)) + 1;
}

function blankRow(parentCode: string, rows: LocalRow[], parentMask: string | null = null): LocalRow {
  return {
    localId: uid(),
    dirty: true,
    isNew: true,
    id: 0,
    parentCode,
    childCode: '',
    childDescription: '',
    parentMask,
    quantity: 1,
    effectiveQuantity: 0,
    unitOfMeasurement: 'UN',
    // Linha nova ainda não passou pelo servidor: sem conversão conhecida, o
    // fator é 1 e a quantidade de estoque é a própria.
    quantityStockUom: 1,
    stockUnitOfMeasurement: null,
    conversionFactor: 1,
    health: 'ATIVO',
    lossPercentage: 0,
    position: nextPosition(rows),
    notes: null,
    isActive: true,
    createdAt: '',
    updatedAt: '',
    startDate: null,
    endDate: null,
    quantityFormula: null,
    lossFormula: null,
    quantityRounding: 'NONE',
    quantityScale: 4,
    isCoproduct: false,
    isFixedQty: false,
    substituteGroup: 0,
    substitutePriority: 1,
    inherit: false,
    warehouseCode: null,
    lineWarehouseCode: null,
    setupLoss: 0,
    costLossType: 'PERCENTUAL',
    costLoss: 0,
    costCenterCode: null,
    isCriticalMps: false,
    generatesInspection: false,
    customerSupplied: false,
    level: 1,
    hasChildren: false,
  };
}

function toPayload(row: LocalRow, fallbackMask: string | null): CreateStructurePayload {
  const effectiveParentMask = row.parentMask !== null
    ? (row.parentMask.trim() || null)
    : (fallbackMask || null);
  // Quando a quantidade exibida veio de uma fórmula avaliada para a máscara e o
  // usuário não editou a quantidade fixa manualmente, preserva a nominal gravada.
  const nominalQty = row.formulaApplied && !row.quantityEdited && row.nominalQuantity !== undefined
    ? row.nominalQuantity
    : row.quantity;
  return {
    parent_code:         row.parentCode,
    child_code:          row.childCode,
    parent_mask:         effectiveParentMask,
    quantity:            nominalQty,
    unit_of_measurement: row.unitOfMeasurement,
    health:              row.health,
    loss_percentage:     row.lossPercentage,
    position:            row.position,
    notes:               row.notes || null,
    is_active:           row.isActive,
    // O backend espera data-hora; a tela trabalha com o dia.
    start_date:          row.startDate ? `${row.startDate}T00:00:00Z` : null,
    end_date:            row.endDate ? `${row.endDate}T23:59:59Z` : null,
    quantity_formula:    row.quantityFormula?.trim() || null,
    loss_formula:        row.lossFormula?.trim() || null,
    quantity_rounding:   row.quantityRounding,
    quantity_scale:      row.quantityScale,
    is_coproduct:        row.isCoproduct,
    is_fixed_qty:        row.isFixedQty,
    substitute_group:    row.substituteGroup,
    substitute_priority: row.substitutePriority,
    inherit:             row.inherit,
    warehouse_code:      row.warehouseCode,
    line_warehouse_code: row.lineWarehouseCode,
    setup_loss:          row.setupLoss,
    cost_loss_type:      row.costLossType,
    cost_loss:           row.costLoss,
    cost_center_code:    row.costCenterCode,
    is_critical_mps:     row.isCriticalMps,
    generates_inspection: row.generatesInspection,
    customer_supplied:   row.customerSupplied,
  };
}

// ─── Health badge styles ──────────────────────────────────────────────────────

const HEALTH_COLOR: Record<Health, string> = {
  ATIVO:    '#1a6630',
  INATIVO:  '#991c1c',
  FANTASMA: '#3a3a8a',
};

/**
 * Recusa combinações que o planejamento não consegue explodir.
 *
 * Estes erros só apareceriam depois, como necessidade errada ou ordem faltando
 * — quando já é caro descobrir. Vale barrar no cadastro.
 */
/**
 * Todos os problemas da estrutura, não só o primeiro.
 *
 * Corrigir um erro por vez, com um salvamento entre cada um, é o que torna a
 * digitação de uma estrutura grande insuportável — e é assim que os ERPs de
 * mercado respondem. Aqui a tela devolve a lista inteira de uma vez.
 */
function listarProblemas(rows: LocalRow[]): string[] {
  const problemas: string[] = [];

  for (const r of rows) {
    const item = r.childCode || `posição ${r.position}`;

    if (!r.childCode.trim()) {
      problemas.push(`Item ${item}: informe o código do componente.`);
    }

    if (r.startDate && r.endDate && r.startDate > r.endDate) {
      problemas.push(`Item ${item}: o fim da vigência é anterior ao início.`);
    }
    if (!r.quantityFormula && r.quantity <= 0) {
      problemas.push(`Item ${item}: informe uma quantidade maior que zero ou uma fórmula.`);
    }
    if (r.quantity < 0) {
      problemas.push(`Item ${item}: a quantidade não pode ser negativa.`);
    }
    if (r.quantityFormula) {
      const f = r.quantityFormula.trim();
      // Sem análise sintática completa: só o que quebra na certa.
      const abre = (f.match(/\(/g) ?? []).length;
      const fecha = (f.match(/\)/g) ?? []).length;
      if (abre !== fecha) {
        problemas.push(`Item ${item}: a fórmula tem parênteses não fechados.`);
      }
      if (/[^A-Za-z0-9_ .,+\-*/()%]/.test(f)) {
        problemas.push(`Item ${item}: a fórmula contém um caractere que não é aceito.`);
      }
      if (!/[A-Za-z_]/.test(f)) {
        problemas.push(`Item ${item}: a fórmula não usa nenhuma variável — use a quantidade fixa.`);
      }
    }
    if (r.lossFormula) {
      const lf = r.lossFormula.trim();
      const abre = (lf.match(/\(/g) ?? []).length;
      const fecha = (lf.match(/\)/g) ?? []).length;
      if (abre !== fecha) {
        problemas.push(`Item ${item}: a fórmula da perda tem parênteses não fechados.`);
      }
      if (/[^A-Za-z0-9_ .,+\-*/()%]/.test(lf)) {
        problemas.push(`Item ${item}: a fórmula da perda contém um caractere que não é aceito.`);
      }
      if (!/[A-Za-z_]/.test(lf)) {
        problemas.push(`Item ${item}: a fórmula da perda não usa nenhuma variável — informe a perda percentual fixa.`);
      }
    }
    if (r.lossPercentage < 0 || r.lossPercentage > 100) {
      problemas.push(`Item ${item}: a perda percentual deve estar entre 0 e 100%.`);
    }
    if (r.setupLoss < 0) {
      problemas.push(`Item ${item}: a perda de preparação não pode ser negativa.`);
    }
    if (r.costLoss < 0) {
      problemas.push(`Item ${item}: a perda de custo não pode ser negativa.`);
    }
    if (r.costLossType === 'PERCENTUAL' && r.costLoss > 100) {
      problemas.push(`Item ${item}: a perda de custo percentual deve estar entre 0 e 100%.`);
    }
    if (r.substituteGroup > 0 && r.substitutePriority < 1) {
      problemas.push(`Item ${item}: a prioridade do alternativo deve ser 1 ou maior.`);
    }
    if (r.isCoproduct && r.isFixedQty) {
      problemas.push(`Item ${item}: co-produto e quantidade por ordem não podem ser marcados juntos.`);
    }
    if (r.isCoproduct && r.customerSupplied) {
      problemas.push(`Item ${item}: co-produto sai da ordem; não pode ser também material fornecido pelo cliente.`);
    }
  }

  // O mesmo componente duas vezes no mesmo nível. Em produção isso aconteceu
  // (o índice único não pegava estrutura sem máscara) e o MRP contava a
  // quantidade em dobro. Hoje o banco recusa a segunda linha; o Conferir avisa
  // antes, em vez de deixar o salvar falhar.
  const vezes = new Map<string, number>();
  for (const r of rows) {
    const c = r.childCode.trim().toUpperCase();
    if (c) vezes.set(c, (vezes.get(c) ?? 0) + 1);
  }
  for (const [codigo, n] of vezes) {
    if (n > 1) {
      problemas.push(`Item ${codigo}: aparece ${n} vezes nesta estrutura. Some as quantidades numa linha só, ou use grupo de alternativos se for opção de material.`);
    }
  }

  // Um item não pode ser componente de si mesmo — seria um ciclo imediato.
  for (const r of rows) {
    const pai = String(r.parentCode ?? '').trim().toUpperCase();
    if (pai && r.childCode.trim().toUpperCase() === pai) {
      problemas.push(`Item ${r.childCode}: não pode ser componente de si mesmo.`);
    }
  }

  // Dois componentes com o mesmo grupo e a mesma prioridade: a produção não
  // teria como escolher qual usar primeiro.
  const porGrupo = new Map<string, string[]>();
  for (const r of rows) {
    if (r.substituteGroup <= 0) continue;
    const chave = `${r.substituteGroup}|${r.substitutePriority}`;
    porGrupo.set(chave, [...(porGrupo.get(chave) ?? []), r.childCode || `posição ${r.position}`]);
  }
  for (const [chave, itens] of porGrupo) {
    if (itens.length > 1) {
      const [grupo, prioridade] = chave.split('|');
      problemas.push(`Alternativos do grupo ${grupo}: ${itens.join(' e ')} têm a mesma prioridade ${prioridade}. Dê prioridades diferentes para a produção saber qual usar primeiro.`);
    }
  }

  return problemas;
}

/** Data ISO (aaaa-mm-dd) no formato do país. */
function formatarDia(iso?: string | null): string {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

/** Vigência do componente em relação a hoje. */
function vigencia(row: LocalRow): 'futuro' | 'expirado' | 'vigente' {
  const hoje = hojeLocal();
  if (row.startDate && row.startDate > hoje) return 'futuro';
  if (row.endDate && row.endDate < hoje) return 'expirado';
  return 'vigente';
}

/**
 * Sinaliza na grade o que muda o comportamento do componente no planejamento.
 *
 * Sem isso o planejador teria de abrir item por item para descobrir que uma
 * quantidade vem de fórmula, que um componente já saiu de vigência ou que ele
 * tem alternativo — justamente o que costuma explicar uma necessidade errada.
 */
const ComponentFlags = memo(function ComponentFlags({ row }: { row: LocalRow }) {
  const situacao = vigencia(row);
  return (
    <>
      {row.quantityFormula && (
        <span className="fe-flag f-formula" title={`Quantidade por fórmula: ${row.quantityFormula}`}>ƒ</span>
      )}
      {row.lossFormula && (
        <span className="fe-flag f-formula" title={`Perda por fórmula: ${row.lossFormula}`}>%ƒ</span>
      )}
      {situacao === 'futuro' && (
        <span className="fe-flag f-futuro" title={`Entra em vigor em ${row.startDate}`}>◷</span>
      )}
      {situacao === 'expirado' && (
        <span className="fe-flag f-expirado" title={`Fora de vigência desde ${row.endDate}`}>⊘</span>
      )}
      {row.substituteGroup > 0 && (
        <span className="fe-flag f-alt" title={`Alternativo — grupo ${row.substituteGroup}, prioridade ${row.substitutePriority}`}>⇄</span>
      )}
      {row.isCoproduct && <span className="fe-flag f-co" title="Co-produto: sai da ordem">↥</span>}
      {row.isFixedQty && <span className="fe-flag f-fixa" title="Quantidade por ordem, não por peça">▣</span>}
      {row.inherit && <span className="fe-flag f-herda" title="Herda máscara do pai (configuração)">M</span>}
      {row.isCriticalMps && <span className="fe-flag f-mps" title="Crítico para o plano mestre (MPS)">★</span>}
      {row.generatesInspection && <span className="fe-flag f-insp" title="Gera inspeção no processo">✔</span>}
      {row.customerSupplied && <span className="fe-flag f-cli" title="Fornecido pelo cliente (beneficiamento)">⇆</span>}
      {row.health === 'FANTASMA' && <span className="fe-flag f-fant" title="Fantasma: não gera ordem">👻</span>}
    </>
  );
});

// ─── Detail Panel ─────────────────────────────────────────────────────────────

/**
 * Área de transferência da própria tela para as fórmulas.
 *
 * Numa estrutura de perfil, dezenas de componentes repetem a mesma expressão
 * com pequenas variações. Redigitar cada uma é o caminho mais curto para um
 * erro de cálculo silencioso — copiar e colar não é conforto, é controle.
 * Fica fora do clipboard do sistema de propósito: nada vaza da tela e não
 * depende de permissão do webview.
 */
let formulaCopiada: { formula: string; rounding: QuantityRounding; scale: number } | null = null;

interface DetailPanelProps {
  row: LocalRow | null;
  canStepUp: boolean;
  parentLevelLabel?: string;
  onUpdate: (patch: Partial<LocalRow>) => void;
  onChildCodeBlur: (code: string) => void;
  onOpenChildLookup: () => void;
  onDrillDown: (row: LocalRow) => void;
  onStepUp: () => void;
}

const DetailPanel = memo(function DetailPanel({
  row,
  canStepUp,
  parentLevelLabel,
  onUpdate,
  onChildCodeBlur,
  onOpenChildLookup,
  onDrillDown,
  onStepUp,
}: DetailPanelProps) {
  // Catálogo da empresa (VSUP0110); a unidade já gravada fica na lista.
  const unidades = useUnidades(UNIT_OPTIONS, row?.unitOfMeasurement);
  const rotuloUM = useRotulosDeUnidades();
  // Conferir a fórmula é uma ação do próprio componente: nada sai daqui.
  const [simulando, setSimulando] = useState(false);
  const [copiaAviso, setCopiaAviso] = useState('');
  // O aviso é da linha atual: trocar de componente zera a mensagem.
  useEffect(() => { setCopiaAviso(''); }, [row?.localId]);
  if (!row) {
    return (
      <div className="fe-detail-empty">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ opacity: 0.3 }}>
          <circle cx="18" cy="18" r="14" stroke="#2f7d47" strokeWidth="1.8"/>
          <path d="M18 12v7M18 23h.01" stroke="#2f7d47" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <span className="fe-detail-empty-title">Nenhum item selecionado</span>
        <span className="fe-detail-empty-sub">Clique em um item da grade.</span>
      </div>
    );
  }

  return (
    <div className="fe-detail-body">
      <div className="fe-d-sec">Identificação</div>

      <div className="fe-d-row">
        <div className="fe-d-field">
          <label className="fe-d-label">Cód. Filho</label>
          <div className="fe-d-input-wrap">
            <input className="fe-d-input"
              value={row.childCode || ''}
              readOnly={!row.isNew}
              onChange={(e) => { if (row.isNew) onUpdate({ childCode: e.target.value }); }}
              onBlur={(e) => { if (row.isNew) onChildCodeBlur(e.target.value); }}
              onKeyDown={(e) => {
                if (row.isNew && (e.key === 'F2' || e.key === 'F4')) {
                  e.preventDefault();
                  onOpenChildLookup();
                }
              }}
              title={row.isNew ? 'Digite o código ou clique na lupa (F2)' : 'Componente já gravado — para substituir o item, remova ou encerre a vigência e inclua o novo'}
              placeholder="Ex: 2206" style={{ textAlign: 'right' }}/>
            <button
              type="button"
              className="fe-d-lookup-btn"
              disabled={!row.isNew}
              onClick={onOpenChildLookup}
              aria-label="Pesquisar itens cadastrados"
              title={row.isNew ? 'Pesquisar itens cadastrados (seleção simples ou múltipla)' : 'Disponível apenas ao incluir um item novo'}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="fe-d-field">
          <label className="fe-d-label">Posição</label>
          <input className="fe-d-input" type="number" min={1}
            value={row.position}
            onChange={(e) => onUpdate({ position: parseInt(e.target.value, 10) || 1 })}
            style={{ textAlign: 'right' }}/>
        </div>
      </div>

      <div className="fe-d-field">
        <label className="fe-d-label">Descrição</label>
        <input className="fe-d-input" value={row.childDescription} readOnly
          placeholder="Preenchida automaticamente pelo cadastro do item"/>
      </div>

      {((!row.isNew && Boolean(row.childCode)) || canStepUp) && (
        <div className="fe-d-level-nav">
          {canStepUp && (
            <button
              type="button"
              className="fe-level-btn back"
              onClick={onStepUp}
              title={parentLevelLabel ? `Voltar para ${parentLevelLabel} (Alt+←)` : 'Voltar ao nível anterior (Alt+←)'}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M8.5 3L4.5 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Nível anterior
            </button>
          )}
          {!row.isNew && Boolean(row.childCode) && (
            <button
              type="button"
              className={`fe-level-btn enter${row.hasChildren ? ' has-sub' : ''}`}
              onClick={() => onDrillDown(row)}
              title={row.hasChildren ? 'Entrar na subestrutura deste componente' : 'Entrar neste componente para cadastrar os filhos dele'}
            >
              {row.hasChildren ? 'Ver subestrutura' : 'Abrir nível do filho'}
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M5.5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      )}

      <div className="fe-d-sep"/>
      <div className="fe-d-sec">Quantidades e UM</div>

      <div className="fe-d-row">
        <div className="fe-d-field">
          <label className="fe-d-label">Quantidade</label>
          <input className="fe-d-input" type="number" min={0} step="0.001"
            value={row.quantity}
            disabled={Boolean(row.quantityFormula)}
            onChange={(e) => onUpdate({ quantity: parseFloat(e.target.value) || 0, quantityEdited: true })}
            style={{ textAlign: 'right' }}/>
        </div>
        <div className="fe-d-field">
          <label className="fe-d-label">Unid. Medida</label>
          <select className="fe-d-select" value={row.unitOfMeasurement}
            onChange={(e) => onUpdate({ unitOfMeasurement: e.target.value as UnitOfMeasurement })}>
            {unidades.map((u) => <option key={u} value={u}>{rotuloUM[u] ?? enumLabel(u)}</option>)}
          </select>
          <ConversaoDeUnidade row={row} />
        </div>
      </div>

      <div className="fe-d-field">
        <label className="fe-d-label">Fórmula da quantidade</label>
        <input className="fe-d-input" value={row.quantityFormula ?? ''}
          onChange={(e) => onUpdate({ quantityFormula: e.target.value || null })}
          placeholder="Ex: 2*(COMPRIMENTO/1000)+2*(PROFUNDIDADE/1000)"/>
        <span className="fe-d-hint">
          {row.quantityFormula
            ? 'A quantidade acima é ignorada: quem manda é a fórmula, calculada a cada configuração.'
            : 'Deixe em branco para usar a quantidade fixa. As variáveis vêm das respostas do configurador.'}
        </span>
        <div className="fe-d-linkrow">
          {row.quantityFormula && (
            <button type="button" className="fe-d-linkbtn" onClick={() => setSimulando(true)}>
              Simular a fórmula
            </button>
          )}
          {row.quantityFormula && (
            <button type="button" className="fe-d-linkbtn" onClick={() => {
              formulaCopiada = {
                formula: row.quantityFormula ?? '',
                rounding: row.quantityRounding,
                scale: row.quantityScale,
              };
              setCopiaAviso('Fórmula copiada.');
            }}>
              Copiar
            </button>
          )}
          {formulaCopiada && (
            <button type="button" className="fe-d-linkbtn" onClick={() => {
              if (!formulaCopiada) return;
              onUpdate({
                quantityFormula: formulaCopiada.formula,
                quantityRounding: formulaCopiada.rounding,
                quantityScale: formulaCopiada.scale,
              });
              setCopiaAviso('Fórmula colada — confira antes de salvar.');
            }} title={`Colar "${formulaCopiada.formula}"`}>
              Colar
            </button>
          )}
          {copiaAviso && <span className="fe-d-linkmsg">{copiaAviso}</span>}
        </div>
      </div>

      {simulando && row.quantityFormula && (
        <StructureFormulaTester
          formula={row.quantityFormula}
          rounding={row.quantityRounding}
          scale={row.quantityScale}
          lossPercentage={row.lossPercentage}
          setupLoss={row.setupLoss}
          onClose={() => setSimulando(false)}/>
      )}

      {row.quantityFormula && (
        <div className="fe-d-row">
          <div className="fe-d-field">
            <label className="fe-d-label">Arredondamento</label>
            <select className="fe-d-select" value={row.quantityRounding}
              onChange={(e) => onUpdate({ quantityRounding: e.target.value as QuantityRounding })}>
              {ROUNDING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <span className="fe-d-hint">{ROUNDING_OPTIONS.find((o) => o.value === row.quantityRounding)?.hint}</span>
          </div>
          <div className="fe-d-field">
            <label className="fe-d-label">Casas decimais</label>
            <input className="fe-d-input" type="number" min={0} max={6}
              value={row.quantityScale}
              onChange={(e) => onUpdate({ quantityScale: Math.min(6, Math.max(0, parseInt(e.target.value, 10) || 0)) })}
              style={{ textAlign: 'right' }}/>
          </div>
        </div>
      )}

      <div className="fe-d-row">
        <div className="fe-d-field">
          <label className="fe-d-label">Perda (%)</label>
          <input className="fe-d-input" type="number" min={0} max={100} step="0.01"
            value={row.lossPercentage}
            onChange={(e) => onUpdate({ lossPercentage: parseFloat(e.target.value) || 0 })}
            disabled={Boolean(row.lossFormula)}
            style={{ textAlign: 'right' }}/>
        </div>
        <div className="fe-d-field">
          <label className="fe-d-label">Situação na estrutura</label>
          <select className="fe-d-select" value={row.health}
            onChange={(e) => onUpdate({ health: e.target.value as Health })}>
            {HEALTH_OPTIONS.map((h) => <option key={h} value={h}>{enumLabel(h)}</option>)}
          </select>
          <span className="fe-d-hint">
            {row.health === 'FANTASMA'
              ? 'Fantasma: aparece na estrutura, mas o planejamento não gera ordem para ele.'
              : row.health === 'INATIVO'
                ? 'Inativo: não é explodido pelo planejamento.'
                : 'Normal: explodido pelo planejamento e considerado no custo.'}
          </span>
        </div>
      </div>

      <div className="fe-d-field">
        <label className="fe-d-label">Fórmula da perda</label>
        <input className="fe-d-input" value={row.lossFormula ?? ''}
          onChange={(e) => onUpdate({ lossFormula: e.target.value || null })}
          placeholder="Opcional — quando a perda não é um percentual fixo"/>
      </div>

      <div className="fe-d-sep"/>
      <div className="fe-d-sec">Vigência</div>

      <div className="fe-d-row">
        <div className="fe-d-field">
          <label className="fe-d-label">Início</label>
          <input className="fe-d-input" type="date" value={row.startDate ?? ''}
            onChange={(e) => onUpdate({ startDate: e.target.value || null })}/>
        </div>
        <div className="fe-d-field">
          <label className="fe-d-label">Fim</label>
          <input className="fe-d-input" type="date" value={row.endDate ?? ''}
            onChange={(e) => onUpdate({ endDate: e.target.value || null })}/>
        </div>
      </div>
      <span className="fe-d-hint">
        Fora deste intervalo o componente não é explodido. É como se troca uma matéria-prima
        numa data futura sem manter duas estruturas.
      </span>

      <div className="fe-d-sep"/>
      <div className="fe-d-sec">Alternativos</div>

      <div className="fe-d-row">
        <div className="fe-d-field">
          <label className="fe-d-label">Grupo</label>
          <input className="fe-d-input" type="number" min={0}
            value={row.substituteGroup}
            onChange={(e) => onUpdate({ substituteGroup: parseInt(e.target.value, 10) || 0 })}
            style={{ textAlign: 'right' }}/>
        </div>
        <div className="fe-d-field">
          <label className="fe-d-label">Prioridade</label>
          <input className="fe-d-input" type="number" min={1}
            value={row.substitutePriority}
            disabled={row.substituteGroup === 0}
            onChange={(e) => onUpdate({ substitutePriority: Math.max(1, parseInt(e.target.value, 10) || 1) })}
            style={{ textAlign: 'right' }}/>
        </div>
      </div>
      <span className="fe-d-hint">
        {row.substituteGroup > 0
          ? 'Componentes com o mesmo grupo se substituem; a produção usa o de menor prioridade que tiver saldo.'
          : 'Zero = componente sem substitutos. Informe um grupo para permitir troca por alternativo.'}
      </span>

      <div className="fe-d-sep"/>
      <div className="fe-d-sec">Consumo e custo</div>

      <div className="fe-d-row">
        <div className="fe-d-field">
          <label className="fe-d-label">Almoxarifado</label>
          <LookupField<number>
            value={row.warehouseCode ?? undefined}
            loader={loadWarehouses}
            entityLabel="almoxarifado"
            placeholder="Do cadastro do item"
            allowManualCode={false}
            clearable
            onChange={(code) => onUpdate({ warehouseCode: code ? Number(code) : null })}
          />
        </div>
        <div className="fe-d-field">
          <label className="fe-d-label">Almox. de linha</label>
          <LookupField<number>
            value={row.lineWarehouseCode ?? undefined}
            loader={loadWarehouses}
            entityLabel="almoxarifado"
            placeholder="Opcional"
            allowManualCode={false}
            clearable
            onChange={(code) => onUpdate({ lineWarehouseCode: code ? Number(code) : null })}
          />
        </div>
      </div>
      <span className="fe-d-hint">
        Deixe o almoxarifado vazio para usar o do cadastro do item. O de linha é o que fica
        junto ao operador e atende a requisição.
      </span>

      <div className="fe-d-row">
        <div className="fe-d-field">
          <label className="fe-d-label">Perda de preparação</label>
          <input className="fe-d-input" type="number" min={0} step="0.001" value={row.setupLoss}
            onChange={(e) => onUpdate({ setupLoss: parseFloat(e.target.value) || 0 })}
            style={{ textAlign: 'right' }}/>
        </div>
        <div className="fe-d-field">
          <label className="fe-d-label">Centro de custo</label>
          <LookupField<number>
            value={row.costCenterCode ?? undefined}
            loader={loadCostCenters}
            entityLabel="centro de custo"
            placeholder="Opcional"
            allowManualCode={false}
            clearable
            onChange={(code) => onUpdate({ costCenterCode: code ? Number(code) : null })}
          />
        </div>
      </div>
      <span className="fe-d-hint">
        A perda de preparação é consumida uma vez por ordem, não por peça.
      </span>

      <div className="fe-d-row">
        <div className="fe-d-field">
          <label className="fe-d-label">Perda de custo</label>
          <input className="fe-d-input" type="number" min={0} step="0.001" value={row.costLoss}
            onChange={(e) => onUpdate({ costLoss: parseFloat(e.target.value) || 0 })}
            style={{ textAlign: 'right' }}/>
        </div>
        <div className="fe-d-field">
          <label className="fe-d-label">Tipo da perda de custo</label>
          <select className="fe-d-select" value={row.costLossType}
            onChange={(e) => onUpdate({ costLossType: e.target.value as CostLossType })}>
            {COST_LOSS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <span className="fe-d-hint">
        A perda de custo é separada da de engenharia: a de engenharia dimensiona a necessidade,
        esta entra apenas no custo do produto.
      </span>

      <div className="fe-d-sep"/>
      <div className="fe-d-sec">Complemento</div>

      <div className="fe-d-field">
        <label className="fe-d-label">Observações</label>
        <input className="fe-d-input" value={row.notes ?? ''}
          onChange={(e) => onUpdate({ notes: e.target.value || null })}
          placeholder="Opcional"/>
      </div>

      <div className="fe-d-field">
        <label className="fe-d-label">Máscara do pai</label>
        <input className="fe-d-input" value={row.parentMask ?? ''}
          onChange={(e) => onUpdate({ parentMask: e.target.value || null })}
          placeholder="Opcional"/>
        <span style={{ fontSize: 10.5, color: '#94a49a', marginTop: 2 }}>
          Validada ao salvar — deve pertencer ao item pai.
        </span>
      </div>

      <div className="fe-d-sep"/>
      <div className="fe-d-sec">Indicadores</div>

      <div className="fe-d-checks">
        <label className="fe-d-check-label">
          <input type="checkbox" className="fe-d-checkbox"
            checked={row.isCoproduct}
            onChange={(e) => onUpdate({ isCoproduct: e.target.checked })}/>
          Co-produto (saída da ordem)
        </label>
        <label className="fe-d-check-label">
          <input type="checkbox" className="fe-d-checkbox"
            checked={row.isFixedQty}
            onChange={(e) => onUpdate({ isFixedQty: e.target.checked })}/>
          Quantidade por ordem, não por peça
        </label>
        <label className="fe-d-check-label" title="Quando o filho também é um item configurado (PDM), deriva automaticamente a máscara dele a partir das respostas do pai.">
          <input type="checkbox" className="fe-d-checkbox"
            checked={row.inherit}
            onChange={(e) => onUpdate({ inherit: e.target.checked })}/>
          Herdar máscara do pai (configuração)
        </label>
        <label className="fe-d-check-label">
          <input type="checkbox" className="fe-d-checkbox"
            checked={row.isCriticalMps}
            onChange={(e) => onUpdate({ isCriticalMps: e.target.checked })}/>
          Crítico para o plano mestre
        </label>
        <label className="fe-d-check-label">
          <input type="checkbox" className="fe-d-checkbox"
            checked={row.generatesInspection}
            onChange={(e) => onUpdate({ generatesInspection: e.target.checked })}/>
          Gera inspeção no processo
        </label>
        <label className="fe-d-check-label" title="Beneficiamento: o cliente manda este material. Fica fora do MRP, da baixa automática e do custo.">
          <input type="checkbox" className="fe-d-checkbox"
            checked={row.customerSupplied}
            onChange={(e) => onUpdate({ customerSupplied: e.target.checked })}/>
          Fornecido pelo cliente (beneficiamento)
        </label>
      </div>
      <span className="fe-d-hint">
        {row.customerSupplied
          ? 'Fornecido pelo cliente: não é comprado pelo MRP nem baixado do estoque próprio, não entra no custo, e a ordem do pai não dá entrada do produto no estoque — o material volta ao cliente na nota de beneficiamento.'
          : row.isCoproduct
          ? 'Co-produto: sai da ordem em vez de ser consumido — o custo do pai é rateado com ele.'
          : row.isFixedQty
            ? 'Quantidade fixa: consumida uma vez por ordem, independente do tamanho do lote (ex.: material de setup).'
            : 'Sem indicadores: componente consumido proporcionalmente à quantidade do pai.'}
      </span>

      {row.createdAt && (
        <>
          <div className="fe-d-sep"/>
          <div style={{ fontSize: 10.5, color: '#94a49a', lineHeight: 1.7 }}>
            <div>Criado: {new Date(row.createdAt).toLocaleString('pt-BR')}</div>
            {row.updatedAt && <div>Atualizado: {new Date(row.updatedAt).toLocaleString('pt-BR')}</div>}
            {row.level > 0 && <div>Nível na árvore: {row.level}</div>}
          </div>
        </>
      )}
    </div>
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────

export function Vent0210Page(): JSX.Element {
  const unidadesDoCatalogo = useUnidades(UNIT_OPTIONS);
  const rotuloUM = useRotulosDeUnidades();
  const [breadcrumb, setBreadcrumb]       = useState<BreadcrumbEntry[]>([]);
  const [rootInfo, setRootInfo]           = useState<ItemInfo | null>(null);
  const [rootCodigo, setRootCodigo]       = useState('');
  const [rootMascara, setRootMascara]     = useState('');
  const [maskError, setMaskError]         = useState('');
  const [treeMeta, setTreeMeta]           = useState({ totalLevels: 0, totalNodes: 0 });

  const [rows, setRows]                         = useState<LocalRow[]>([]);
  const [selectedLocalId, setSelectedLocalId]   = useState<string | null>(null);
  const [isLoading, setIsLoading]               = useState(false);
  const [isSaving, setIsSaving]                 = useState(false);
  const [feedback, setFeedback]                 = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  // O configurador não tem tela própria: é este painel, aberto pelo botão da
  // barra de ações com o item pai já carregado.
  const [configuradorAberto, setConfiguradorAberto] = useState(false);
  const [versoesAbertas, setVersoesAbertas] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [lookupFilhoAberto, setLookupFilhoAberto] = useState(false);
  const [empresaNome, setEmpresaNome] = useState<string>(() => lerTenantAtivo()?.name ?? 'Empresa ativa');
  const [problemas, setProblemas]             = useState<string[] | null>(null);
  /** Detalhe recolhido dá a largura inteira para a grade de componentes. */
  const [detalheAberto, setDetalheAberto]     = useState(true);

  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedChildRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    let ativo = true;
    void loadEstablishments()
      .then((lista) => {
        if (!ativo || lista.length === 0) return;
        const tenant = lerTenantAtivo();
        if (tenant?.name) {
          setEmpresaNome(tenant.name);
        } else if (lista.length === 1) {
          setEmpresaNome(lista[0].label);
        }
      })
      .catch(() => undefined);
    return () => { ativo = false; };
  }, []);

  const currentLevel        = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1] : null;
  const currentParentCode   = currentLevel?.code ?? rootInfo?.code ?? null;
  const mascaraDoNivelAtual = (breadcrumb.length > 0 ? currentLevel?.mask : rootMascara.trim()) || null;
  const selectedRow         = rows.find((r) => r.localId === selectedLocalId) ?? null;
  const dirtyCount          = rows.filter((r) => r.dirty).length;
  const hasRoot             = currentParentCode !== null;

  const forbiddenCodesForLookup = useMemo(() => {
    const s = new Set<string>();
    if (rootInfo?.code) s.add(rootInfo.code.trim().toUpperCase());
    if (currentParentCode) s.add(currentParentCode.trim().toUpperCase());
    for (const b of breadcrumb) s.add(b.code.trim().toUpperCase());
    return s;
  }, [rootInfo?.code, currentParentCode, breadcrumb]);

  const existingChildCodesForLookup = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      if (r.localId === selectedLocalId && r.isNew) continue;
      const c = r.childCode.trim().toUpperCase();
      if (c) s.add(c);
    }
    return s;
  }, [rows, selectedLocalId]);

  // ── load root structure ──────────────────────────────────────────────────────

  const loadRoot = useCallback(async (code: string, mask?: string | null) => {
    setIsLoading(true);
    setRows([]);
    setSelectedLocalId(null);
    try {
      const result = await resolveStructure(code, mask);
      setTreeMeta({ totalLevels: result.totalLevels, totalNodes: result.totalNodes });
      setRows(result.components.map((c) => ({
        ...c,
        localId: String(c.id),
        dirty: false,
        isNew: false,
      })));
    } catch (e) {
      setFeedback({ type: 'error', msg: e instanceof Error ? e.message : 'Erro ao carregar estrutura.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── load child level (drill-down) ───────────────────────────────────────────

  const loadChildLevel = useCallback(async (childCode: string, mask?: string | null) => {
    setIsLoading(true);
    setRows([]);
    setSelectedLocalId(null);
    try {
      const components = await resolveChildLevel(childCode, mask);
      setRows(components.map((c) => ({
        ...c,
        localId: String(c.id),
        dirty: false,
        isNew: false,
      })));
    } catch (e) {
      setFeedback({ type: 'error', msg: e instanceof Error ? e.message : 'Erro ao carregar filhos.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── search root item ─────────────────────────────────────────────────────────

  async function handleSearchRoot() {
    await buscarItemPai(rootCodigo.trim());
  }

  async function confirmarDescarteSeSujo(acao: string): Promise<boolean> {
    if (dirtyCount === 0) return true;
    return confirmar({
      titulo: 'Alterações não salvas',
      mensagem: `Há ${dirtyCount} alteração(ões) não salva(s) neste nível. ${acao} descarta o que não foi gravado.`,
      rotulo: 'Descartar e continuar',
      tom: 'perigo',
    });
  }

  async function buscarItemPai(codeStr: string) {
    if (!codeStr) return;
    if (rootInfo && codeStr.trim().toUpperCase() !== rootInfo.code.trim().toUpperCase()) {
      if (!(await confirmarDescarteSeSujo('Trocar o item pai'))) return;
    }
    setIsLoading(true);
    setFeedback(null);
    setMaskError('');
    setBreadcrumb([]);
    resolvedChildRef.current.clear();
    try {
      const info = await findItemByCode(codeStr);
      setRootInfo(info);
      setRootCodigo(String(info.code));
      await loadRoot(info.code, rootMascara || null);
    } catch (e) {
      setFeedback({ type: 'error', msg: e instanceof Error ? e.message : 'Item não encontrado.' });
    } finally {
      setIsLoading(false);
    }
  }

  // ── mask validation ──────────────────────────────────────────────────────────

  async function handleMascaraBlur() {
    if (!rootInfo || !rootMascara.trim()) { setMaskError(''); return; }
    const ok = await validateMask(rootInfo.code, rootMascara.trim());
    if (!ok) {
      setMaskError(`Máscara "${rootMascara}" não encontrada para o item ${rootInfo.code}.`);
    } else {
      setMaskError('');
      await loadRoot(currentParentCode ?? rootInfo.code, rootMascara);
    }
  }

  // ── configurador ─────────────────────────────────────────────────────────────

  /**
   * Aplica na estrutura a máscara escolhida no configurador: volta para a raiz,
   * grava a máscara no cabeçalho e recarrega os componentes já resolvidos para
   * essa configuração.
   */
  async function handleUsarMascaraConfigurada(mask: string) {
    setConfiguradorAberto(false);
    setRootMascara(mask);
    setMaskError('');
    setBreadcrumb([]);
    if (rootInfo) {
      await loadRoot(rootInfo.code, mask);
      setFeedback({ type: 'success', msg: `Estrutura carregada para a configuração ${mask}.` });
    }
  }

  // ── breadcrumb & level navigation ───────────────────────────────────────────

  async function handleBreadcrumbClick(index: number) {
    if (!(await confirmarDescarteSeSujo('Voltar de nível'))) return;
    resolvedChildRef.current.clear();
    if (index === -1) {
      setBreadcrumb([]);
      if (rootInfo) await loadRoot(rootInfo.code, rootMascara || null);
    } else {
      const destino = breadcrumb[index];
      setBreadcrumb((p) => p.slice(0, index + 1));
      if (destino) await loadChildLevel(destino.code, destino.mask);
    }
  }

  async function handleSubirNivel() {
    if (breadcrumb.length === 0) return;
    await handleBreadcrumbClick(breadcrumb.length - 2);
  }

  // Atalho de teclado Alt+← ou Alt+↑ para subir rapidamente um nível na árvore.
  useEffect(() => {
    if (breadcrumb.length === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) {
        e.preventDefault();
        void handleSubirNivel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // ── drill-down double click ──────────────────────────────────────────────────

  function handleRowClick(localId: string) {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => setSelectedLocalId(localId), 200);
  }

  /**
   * Abre a estrutura do componente. Vale para qualquer componente já gravado,
   * inclusive sem filhos — é assim que se monta a estrutura de um nível novo.
   * Antes exigia `hasChildren`, então não havia como descer num componente
   * folha para cadastrar os componentes dele.
   */
  async function handleRowDoubleClick(row: LocalRow) {
    if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; }
    if (!row.childCode || row.isNew) return;
    if (dirtyCount > 0 && !(await confirmar({ titulo: "Alterações não salvas", mensagem: `Há ${dirtyCount} alteração(ões) não salva(s). Abrir o componente descarta o que não foi gravado.`, rotulo: "Descartar e abrir", tom: "perigo" }))) return;
    // O duplo clique dentro de um campo seleciona a palavra; sem limpar, a
    // seleção fica presa na tela nova.
    window.getSelection()?.removeAllRanges();
    // A máscara do filho é derivada da configuração do pai — não é a do pai.
    const mascaraFilho = row.effectiveMask ?? null;
    setBreadcrumb((p) => [...p, {
      code: row.childCode,
      label: row.childDescription || String(row.childCode),
      mask: mascaraFilho,
    }]);
    await loadChildLevel(row.childCode, mascaraFilho);
  }

  // ── row mutations ────────────────────────────────────────────────────────────

  function handleAddRow() {
    if (!currentParentCode) return;
    const row = blankRow(currentParentCode, rows, mascaraDoNivelAtual);
    setRows((p) => [...p, row]);
    setSelectedLocalId(row.localId);
    setDetalheAberto(true);
  }

  async function handleDeleteRow(localId: string) {
    const row = rows.find((r) => r.localId === localId);
    if (!row) return;
    if (row.isNew || !row.childCode) {
      resolvedChildRef.current.delete(localId);
      setRows((p) => p.filter((r) => r.localId !== localId));
      if (selectedLocalId === localId) setSelectedLocalId(null);
      return;
    }
    const confirmado = await confirmar({
      titulo: 'Remover componente da estrutura',
      mensagem: 'O componente será removido deste item pai e deixará de ser considerado em novas ordens e cálculos do MRP.',
      assunto: `${row.childCode}${row.childDescription ? ` — ${row.childDescription}` : ''}`,
      rotulo: 'Remover',
      tom: 'perigo',
    });
    if (!confirmado) return;
    const mascaraDaLinha = row.parentMask ?? mascaraDoNivelAtual;
    try {
      await deleteComponent(row.parentCode, row.childCode, mascaraDaLinha);
      resolvedChildRef.current.delete(localId);
      setRows((p) => p.filter((r) => r.localId !== localId));
      if (selectedLocalId === localId) setSelectedLocalId(null);
      setTreeMeta((m) => ({ ...m, totalNodes: Math.max(0, m.totalNodes - 1) }));
      setFeedback({ type: 'success', msg: 'Componente removido da estrutura.' });
    } catch (e) {
      setFeedback({ type: 'error', msg: e instanceof Error ? e.message : 'Falha ao remover componente.' });
    }
  }

  function handleMoveRow(localId: string, dir: 'up' | 'down') {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.localId === localId);
      const target = dir === 'up' ? idx - 1 : idx + 1;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const atual = next[idx];
      const vizinho = next[target];
      const posAtual = atual.position || idx + 1;
      const posVizinho = vizinho.position || target + 1;
      const novaPosAtual = posAtual === posVizinho ? target + 1 : posVizinho;
      const novaPosVizinho = posAtual === posVizinho ? idx + 1 : posAtual;
      next[idx] = { ...vizinho, position: novaPosVizinho, dirty: true };
      next[target] = { ...atual, position: novaPosAtual, dirty: true };
      return next;
    });
  }

  const updateRow = useCallback((localId: string, patch: Partial<LocalRow>) => {
    setRows((prev) =>
      prev.map((r) => r.localId === localId ? { ...r, ...patch, dirty: true } : r)
    );
  }, []);

  /** Ao informar manualmente o código do filho, puxa descrição e UM sem chamadas redundantes. */
  const handleChildCodeBlur = useCallback((localId: string, code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      resolvedChildRef.current.delete(localId);
      updateRow(localId, { childDescription: '', stockUnitOfMeasurement: null });
      return;
    }
    if (resolvedChildRef.current.get(localId) === trimmed.toUpperCase()) {
      return;
    }
    void findItemByCode(trimmed)
      .then((info) => {
        resolvedChildRef.current.set(localId, info.code.toUpperCase());
        setRows((prev) =>
          prev.map((r) =>
            r.localId === localId
              ? {
                  ...r,
                  childCode: info.code,
                  childDescription: info.name,
                  unitOfMeasurement: info.unit,
                  stockUnitOfMeasurement: info.unit,
                  conversionFactor: 1,
                  quantityStockUom: r.quantity,
                  health: info.ghost ? 'FANTASMA' : r.health,
                  dirty: true,
                }
              : r,
          ),
        );
      })
      .catch(() => {
        resolvedChildRef.current.delete(localId);
      });
  }, [updateRow]);

  /** Preenche a linha nova atual e cria linhas adicionais quando o usuário marca vários itens no modal. */
  const handleConfirmarItensDoModal = useCallback((escolhidos: CandidateStructureItem[]) => {
    if (!currentParentCode || escolhidos.length === 0) {
      setLookupFilhoAberto(false);
      return;
    }
    setLookupFilhoAberto(false);
    setFeedback(null);

    setRows((prev) => {
      const targetIdx = prev.findIndex((r) => r.localId === selectedLocalId && r.isNew);
      const usados = new Set<string>(forbiddenCodesForLookup);
      prev.forEach((r, idx) => {
        if (idx === targetIdx) return;
        const c = r.childCode.trim().toUpperCase();
        if (c) usados.add(c);
      });

      const unicos = escolhidos.filter((item) => {
        const chave = item.code.trim().toUpperCase();
        if (!chave || usados.has(chave)) return false;
        usados.add(chave);
        return true;
      });
      if (unicos.length === 0) return prev;

      const next = [...prev];
      let rest = unicos;
      let ultimoLocalId = selectedLocalId;

      if (targetIdx >= 0) {
        const primeiro = unicos[0];
        const base = next[targetIdx];
        next[targetIdx] = {
          ...base,
          childCode: primeiro.code,
          childDescription: primeiro.description,
          unitOfMeasurement: primeiro.uom,
          stockUnitOfMeasurement: primeiro.uom,
          conversionFactor: 1,
          quantityStockUom: base.quantity,
          health: primeiro.ghost ? 'FANTASMA' : 'ATIVO',
          dirty: true,
        };
        resolvedChildRef.current.set(base.localId, primeiro.code.toUpperCase());
        ultimoLocalId = base.localId;
        rest = unicos.slice(1);
      }

      for (const item of rest) {
        const nova = blankRow(currentParentCode, next, mascaraDoNivelAtual);
        nova.childCode = item.code;
        nova.childDescription = item.description;
        nova.unitOfMeasurement = item.uom;
        nova.stockUnitOfMeasurement = item.uom;
        nova.conversionFactor = 1;
        nova.quantityStockUom = nova.quantity;
        nova.health = item.ghost ? 'FANTASMA' : 'ATIVO';
        resolvedChildRef.current.set(nova.localId, item.code.toUpperCase());
        next.push(nova);
        ultimoLocalId = nova.localId;
      }

      if (ultimoLocalId) {
        setTimeout(() => setSelectedLocalId(ultimoLocalId), 0);
      }
      return next;
    });
  }, [currentParentCode, selectedLocalId, forbiddenCodesForLookup, mascaraDoNivelAtual]);

  // ── save ──────────────────────────────────────────────────────────────────────

  async function handleSalvar() {
    if (!currentParentCode) {
      setFeedback({ type: 'error', msg: 'Informe o item pai antes de salvar.' });
      return;
    }
    if (maskError) {
      setFeedback({ type: 'error', msg: 'Corrija a máscara antes de salvar.' });
      return;
    }
    const newRows = rows.filter((r) => r.dirty && r.isNew);
    const editRows = rows.filter((r) => r.dirty && !r.isNew);
    if (newRows.length === 0 && editRows.length === 0) {
      setFeedback({ type: 'success', msg: 'Nenhuma alteração pendente.' });
      return;
    }
    const invalidPos = rows.find((r) => r.dirty && (!r.position || r.position <= 0));
    if (invalidPos) {
      setFeedback({ type: 'error', msg: 'A posição de todos os itens deve ser um número positivo.' });
      return;
    }
    // O usuário vê a lista inteira em vez de descobrir um erro por vez.
    const erros = listarProblemas(rows.filter((r) => r.dirty));
    if (erros.length > 0) {
      setProblemas(erros);
      setFeedback({
        type: 'error',
        msg: erros.length === 1 ? erros[0] : `${erros.length} problemas impedem a gravação — veja a lista abaixo.`,
      });
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    setProblemas(null);
    try {
      const mask = mascaraDoNivelAtual;
      const created = await Promise.all(newRows.map((r) => createComponent(toPayload(r, mask))));
      const updated = await Promise.all(editRows.map((r) => updateComponent(toPayload(r, mask))));
      const createdMap = new Map(newRows.map((r, i) => [r.localId, created[i]]));
      const updatedMap = new Map(editRows.map((r, i) => [r.localId, updated[i]]));
      setRows((prev) =>
        prev.map((r) => {
          const c = createdMap.get(r.localId);
          if (c) return { ...c, localId: String(c.id), dirty: false, isNew: false };
          const u = updatedMap.get(r.localId);
          if (u) return { ...r, ...u, localId: String(u.id), dirty: false, isNew: false };
          return r;
        })
      );
      setFeedback({ type: 'success', msg: `${created.length} item(ns) criado(s) e ${updated.length} atualizado(s).` });
      // Reload to get fresh data
      if (breadcrumb.length === 0 && rootInfo) {
        await loadRoot(rootInfo.code, mask);
      } else if (currentLevel) {
        await loadChildLevel(currentLevel.code, currentLevel.mask);
      }
    } catch (e) {
      setFeedback({ type: 'error', msg: e instanceof Error ? e.message : 'Erro ao salvar.' });
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Lista todos os problemas sem tentar gravar. O salvar barra no primeiro;
   * aqui o usuário vê tudo de uma vez e corrige de uma passada só.
   */
  async function handleConferir() {
    setFeedback(null);
    // A vigência entra só aqui, como aviso: não pode ir para `listarProblemas`
    // porque ela também barra o salvar, e encerrar a vigência de um componente
    // é uma operação legítima. OF, MRP e plano de corte ignoram o componente
    // fora de vigência — o usuário precisa saber disso ao conferir.
    const avisos = rows
      .filter((r) => r.childCode.trim())
      .flatMap((r) => {
        const v = vigencia(r);
        if (v === 'expirado') return [`Item ${r.childCode}: fora de vigência desde ${formatarDia(r.endDate)} — não entra em OF, MRP nem plano de corte.`];
        if (v === 'futuro') return [`Item ${r.childCode}: só entra em vigor em ${formatarDia(r.startDate)} — até lá não é consumido.`];
        return [];
      });
    // A conferência de configuração vem do servidor: é ele que conhece as
    // características do filho, as regras de equivalência e as respostas
    // padrão. Sem ela, o problema só apareceria na ordem de produção.
    const deConfiguracao: string[] = [];
    const pai = currentParentCode;
    if (pai) {
      try {
        for (const c of await verificarConfiguracao(pai, rootMascara.trim() || null)) {
          if (c.missingCharacteristics.length > 0) {
            deConfiguracao.push(
              `Item ${c.childCode}: ${c.missingCharacteristics.join(', ')} — o pai não responde essa(s) característica(s), e não há regra de equivalência nem resposta padrão. A configuração não fecha e a estrutura específica do filho não será usada.`,
            );
          }
          if (c.requiresMask) {
            deConfiguracao.push(
              `Item ${c.childCode}: é configurado e não herda a máscara do pai — a estrutura dele não é explodida automaticamente. Marque "herda máscara" ou informe a máscara do componente.`,
            );
          }
        }
      } catch {
        deConfiguracao.push('Não foi possível verificar a configuração dos componentes no servidor.');
      }
    }
    setProblemas([...listarProblemas(rows), ...avisos, ...deConfiguracao]);
  }

  async function handleLimpar() {
    if (!(await confirmarDescarteSeSujo('Limpar a tela'))) return;
    resolvedChildRef.current.clear();
    setRootInfo(null);
    setRootCodigo('');
    setRootMascara('');
    setMaskError('');
    setBreadcrumb([]);
    setRows([]);
    setSelectedLocalId(null);
    setFeedback(null);
    setProblemas(null);
    setTreeMeta({ totalLevels: 0, totalNodes: 0 });
  }

  const parentLevelLabel = breadcrumb.length === 0
    ? undefined
    : breadcrumb.length === 1
      ? `${rootInfo?.code ?? rootCodigo}${rootInfo?.name ? ` — ${rootInfo.name}` : ''}`
      : breadcrumb[breadcrumb.length - 2].label;

  const breadcrumbLabel = breadcrumb.length === 0
    ? (rootInfo ? `${rootInfo.code} — ${rootInfo.name}` : '—')
    : breadcrumb.map((b) => b.label).join(' › ');

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .fe-root { min-height: 100vh; background: #dfe4e0; font-family: 'Inter', sans-serif; color: #1c2b22; display: flex; flex-direction: column; }

        .fe-topbar { height: 52px; background: #16281d; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; flex-shrink: 0; border-bottom: 1px solid rgba(62,150,84,0.15); }
        .fe-topbar-left { display: flex; align-items: center; gap: 10px; }
        .fe-logo-mark { width: 28px; height: 28px; background: #2f7d47; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
        .fe-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .fe-app-sub { display: block; font-size: 9px; font-weight: 400; color: #54655a; }
        .fe-screen-title { font-size: 12.5px; font-weight: 500; color: #3f8a58; padding-left: 14px; margin-left: 14px; border-left: 1px solid rgba(255,255,255,0.08); }

        .fe-actionbar { background: #fff; border-bottom: 1px solid #dbe8d5; padding: 0 20px; display: flex; align-items: center; gap: 4px; height: 46px; flex-shrink: 0; }
        .fe-action-group { display: flex; align-items: center; gap: 2px; padding-right: 10px; margin-right: 6px; border-right: 1px solid #e8f0e4; }
        .fe-action-group:last-child { border-right: none; }
        .fe-action-label { font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; color: #94a49a; margin-right: 6px; white-space: nowrap; }
        .fe-nav-btn { width: 30px; height: 30px; border-radius: 6px; display: flex; align-items: center; justify-content: center; background: transparent; border: 1.5px solid #d4e8d0; cursor: pointer; color: #46574c; transition: background 0.12s; }
        .fe-nav-btn:hover { background: #edf7ea; border-color: #a0c8a8; }
        .fe-btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 1.5px solid transparent; border-radius: 7px; font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: background 0.13s, border-color 0.13s; }
        .fe-btn-primary { background: #16281d; color: #dff0e2; border-color: #16281d; }
        .fe-btn-primary:hover:not(:disabled) { background: #1e3728; }
        .fe-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .fe-btn-ghost { background: transparent; color: #46574c; border-color: #d4e8d0; }
        .fe-btn-ghost:hover { background: #f0f8ec; border-color: #a9b6ac; }
        .fe-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .fe-btn-danger:hover { background: #fff0f0; border-color: #e09090; }
        .fe-btn-sm { height: 28px; padding: 0 10px; font-size: 12px; }

        .fe-body { flex: 1; padding: 14px 20px; display: flex; flex-direction: column; gap: 12px; overflow: hidden; min-height: 0; }

        .fe-header-card { background: #fff; border: 1px solid #dbe8d5; border-radius: 12px; overflow: hidden; flex-shrink: 0; }
        .fe-header-card-top { display: flex; align-items: center; justify-content: space-between; padding: 10px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9; }
        .fe-header-card-title { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: #253a2d; text-transform: uppercase; letter-spacing: 0.6px; }
        .fe-header-card-badge { font-size: 10.5px; font-weight: 500; color: #2f7d47; background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px; }
        .fe-header-card-meta { display: flex; align-items: center; gap: 12px; }
        .fe-meta-chip { font-size: 10.5px; color: #7a9a84; background: #eef5ea; border: 1px solid #c8e0c0; border-radius: 8px; padding: 2px 8px; font-weight: 500; }
        .fe-header-card-body { padding: 12px 18px; display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }

        .fe-h-field { display: flex; flex-direction: column; gap: 4px; }
        .fe-h-label { font-size: 9.5px; font-weight: 600; color: #6b7d71; text-transform: uppercase; letter-spacing: 0.4px; }
        .fe-h-input { height: 34px; background: #f8fbf6; border: 1.5px solid #d4e8cc; border-radius: 7px; padding: 0 10px; font-family: 'Inter', sans-serif; font-size: 13px; color: #1c2b22; outline: none; transition: border-color 0.12s; }
        .fe-h-input:focus { border-color: #2f7d47; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .fe-h-input.err { border-color: #e05252; }
        .fe-h-input::placeholder { color: #a9b6ac; font-size: 12px; }
        .fe-h-input:disabled { background: #dfe4e0; color: #8aaa94; border-color: #e0ead8; cursor: default; }
        .fe-h-input-wrap { display: flex; }
        .fe-h-input-btn { height: 34px; width: 32px; flex-shrink: 0; background: #edf5ea; border: 1.5px solid #d4e8cc; border-left: none; border-radius: 0 7px 7px 0; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #4a8060; transition: background 0.12s; }
        .fe-h-input-btn:hover:not(:disabled) { background: #ddf0e0; }
        .fe-h-input-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .fe-h-hint { font-size: 10.5px; color: #94a49a; margin-top: 3px; }
        .fe-h-err  { font-size: 10.5px; color: #c84040; margin-top: 3px; }

        .fe-split { display: flex; gap: 12px; flex: 1; min-height: 0; }
        .fe-left  { flex: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
        .fe-right { width: 320px; flex-shrink: 0; display: flex; flex-direction: column; min-height: 0; }
        .fe-right.oculto { display: none; }

        .fe-grid-card { background: #fff; border: 1px solid #dbe8d5; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; flex: 1; min-height: 0; }
        .fe-grid-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid #edf5e8; background: #fafcf9; flex-shrink: 0; gap: 8px; }
        .fe-grid-title { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: #253a2d; text-transform: uppercase; letter-spacing: 0.6px; flex: 1; flex-wrap: wrap; }
        .fe-grid-count { font-size: 11px; color: #7a9a84; background: #eef5ea; border: 1px solid #c8e0c0; border-radius: 10px; padding: 2px 8px; font-weight: 500; }
        .fe-dirty-badge { font-size: 10.5px; font-weight: 600; color: #8a5800; background: #fff4e0; border: 1px solid #f0d090; border-radius: 10px; padding: 2px 8px; }

        .fe-breadcrumb { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
        .fe-bc-btn { background: none; border: none; cursor: pointer; font-size: 12px; color: #2f7d47; font-family: 'Inter', sans-serif; font-weight: 500; padding: 0; }
        .fe-bc-btn:hover { text-decoration: underline; }
        .fe-bc-sep { color: #a9b6ac; font-size: 12px; }
        .fe-bc-cur { font-size: 12px; color: #1c2b22; font-weight: 600; }

        .fe-table-wrap { overflow: auto; flex: 1; }
        .fe-table-wrap::-webkit-scrollbar { height: 4px; width: 4px; }
        .fe-table-wrap::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }
        .fe-table { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 860px; }
        .fe-table thead { position: sticky; top: 0; z-index: 2; }
        .fe-table th { background: #f4f9f2; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; color: #6b7d71; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1.5px solid #dbe8d5; white-space: nowrap; }
        .fe-table td { padding: 0; border-bottom: 1px solid #f0f6ec; vertical-align: middle; }
        .fe-table tbody tr { cursor: pointer; }
        .fe-table tbody tr:hover td { background: #f4fbf2; }
        .fe-table tbody tr.sel td { background: #e4f5e6 !important; }
        .fe-table tbody tr.inact { opacity: 0.45; }

        .fe-td { padding: 5px 10px; display: flex; align-items: center; gap: 6px; min-height: 34px; }
        .fe-ci { width: 100%; background: transparent; border: none; outline: none; font-family: 'Inter', sans-serif; font-size: 12px; color: #1c2b22; padding: 0; min-width: 0; }
        .fe-ci:focus { background: #fff; border-radius: 4px; padding: 2px 4px; box-shadow: 0 0 0 1.5px #2f7d47; }
        .fe-cs { width: 100%; background: transparent; border: none; outline: none; font-family: 'Inter', sans-serif; font-size: 12px; color: #1c2b22; padding: 0; cursor: pointer; appearance: none; }
        .fe-cs:focus { background: #fff; border-radius: 4px; padding: 2px 4px; box-shadow: 0 0 0 1.5px #2f7d47; }
        .fe-ck { width: 14px; height: 14px; flex-shrink: 0; border: 1.5px solid #a9b6ac; border-radius: 3px; appearance: none; cursor: pointer; background: #f8fbf6; position: relative; transition: background 0.1s; }
        .fe-ck:checked { background: #2f7d47; border-color: #2f7d47; }
        .fe-ck:checked::after { content: ''; position: absolute; left: 3px; top: 1px; width: 4px; height: 7px; border: 1.5px solid #fff; border-top: none; border-left: none; transform: rotate(45deg); }

        .fe-pos { font-size: 11px; font-weight: 700; color: #2a5a3a; background: #eef5ea; border: 1px solid #c8e0c0; border-radius: 5px; padding: 2px 6px; font-variant-numeric: tabular-nums; min-width: 26px; text-align: center; flex-shrink: 0; }
        .fe-drill { font-size: 10px; color: #a9b6ac; flex-shrink: 0; }
        .fe-dot { color: #c8900a; font-size: 14px; flex-shrink: 0; }

        .fe-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; gap: 10px; }
        .fe-empty-title { font-size: 13.5px; font-weight: 500; color: #6b7d71; }
        .fe-empty-sub { font-size: 12px; color: #94a49a; text-align: center; line-height: 1.6; }
        .fe-loading { display: flex; align-items: center; justify-content: center; padding: 40px; gap: 10px; color: #6b7d71; font-size: 13px; }

        .fe-detail-card { background: #fff; border: 1px solid #dbe8d5; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; flex: 1; min-height: 0; }
        .fe-detail-header { padding: 10px 16px; border-bottom: 1px solid #edf5e8; background: #fafcf9; flex-shrink: 0; font-size: 11.5px; font-weight: 600; color: #253a2d; text-transform: uppercase; letter-spacing: 0.5px; }
        .fe-detail-body { padding: 14px 14px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; flex: 1; }
        .fe-detail-body::-webkit-scrollbar { width: 4px; }
        .fe-detail-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }
        .fe-detail-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; gap: 8px; }
        .fe-detail-empty-title { font-size: 12.5px; font-weight: 500; color: #6b7d71; }
        .fe-detail-empty-sub { font-size: 11.5px; color: #94a49a; }

        .fe-d-field { display: flex; flex-direction: column; gap: 4px; }
        .fe-flag { display: inline-flex; align-items: center; justify-content: center; min-width: 17px; height: 17px; padding: 0 3px; border-radius: 5px; font-size: 10.5px; font-weight: 600; line-height: 1; cursor: help; }
        .fe-flag.f-formula { background: #e4f0ff; color: #1c4f8a; border: 1px solid #b9d4f0; font-style: italic; }
        .fe-flag.f-futuro  { background: #fff4e0; color: #8a5800; border: 1px solid #f0d090; }
        .fe-flag.f-expirado{ background: #ffecec; color: #9a2b2b; border: 1px solid #f0c0c0; }
        .fe-flag.f-alt     { background: #eef5ea; color: #2f7d47; border: 1px solid #c4dfc8; }
        .fe-flag.f-co      { background: #f2eaff; color: #5a2f8a; border: 1px solid #d8c4f0; }
        .fe-flag.f-fixa    { background: #eaf6f6; color: #1c6a6a; border: 1px solid #bde0e0; }
        .fe-flag.f-fant    { background: #eef0f8; border: 1px solid #ccd2e8; }
        .fe-flag.f-cli     { background: #fdf0e6; color: #8a4a12; border: 1px solid #f0cfae; }
        .fe-flag.f-herda   { background: #e8f5ee; color: #1b5e36; border: 1px solid #b8dec6; }
        .fe-flag.f-mps     { background: #fff0f4; color: #9c1f4b; border: 1px solid #f0bfd0; }
        .fe-flag.f-insp    { background: #eef7ff; color: #1b568c; border: 1px solid #bcd8f4; }

        .fe-level-back { display: inline-flex; align-items: center; gap: 5px; height: 26px; padding: 0 9px; border-radius: 6px; border: 1.5px solid #b9dac0; background: #edf7ea; color: #1e5c32; font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 600; cursor: pointer; text-transform: none; letter-spacing: 0; transition: background 0.12s, border-color 0.12s; }
        .fe-level-back:hover:not(:disabled) { background: #dcf0d8; border-color: #2f7d47; }
        .fe-level-back:disabled { opacity: 0.45; cursor: not-allowed; }
        .fe-level-pill { font-size: 10.5px; font-weight: 700; color: #1e5c32; background: #e4f3e2; border: 1px solid #bcdcc0; border-radius: 999px; padding: 2px 8px; text-transform: none; letter-spacing: 0; }
        .fe-drill-btn { display: inline-flex; align-items: center; gap: 3px; height: 21px; padding: 0 6px; border-radius: 5px; border: 1px solid #cfe2cc; background: #f5faf3; color: #4a6b54; font-family: 'Inter', sans-serif; font-size: 10.5px; font-weight: 600; cursor: pointer; flex-shrink: 0; white-space: nowrap; transition: background 0.12s, border-color 0.12s, color 0.12s; }
        .fe-drill-btn:hover { background: #e2f2df; border-color: #2f7d47; color: #1b562e; }
        .fe-drill-btn.has-sub { background: #e6f5e8; border-color: #9ed0a8; color: #1c6634; }
        .fe-drill-btn.has-sub:hover { background: #d2ecd6; border-color: #2f7d47; }
        .fe-d-level-nav { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 2px; }
        .fe-level-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px; height: 29px; padding: 0 10px; border-radius: 7px; border: 1.5px solid #cde2c8; background: #f4faf2; color: #255734; font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: background 0.12s, border-color 0.12s; }
        .fe-level-btn:hover { background: #e3f3e0; border-color: #2f7d47; }
        .fe-level-btn.enter.has-sub { background: #e6f5e8; border-color: #8cc898; color: #18582d; }
        .fe-d-hint { display: block; font-size: 10.5px; color: #7a9a84; line-height: 1.4; margin-top: 3px; }
        .fe-d-linkbtn { align-self: flex-start; margin-top: 5px; background: none; border: none; padding: 0; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600; color: #2f7d47; text-decoration: underline; cursor: pointer; }
        .fe-d-linkbtn:hover { color: #1e6030; }
        .fe-d-linkrow { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 2px; }
        .fe-d-linkrow .fe-d-linkbtn { margin-top: 3px; }
        .fe-d-linkmsg { font-size: 10.5px; color: #2f7d47; margin-top: 3px; }
        .fe-d-label { font-size: 9.5px; font-weight: 600; color: #6a8068; text-transform: uppercase; letter-spacing: 0.4px; }
        .fe-d-input { width: 100%; height: 31px; background: #f8fbf6; border: 1.5px solid #d4e8cc; border-radius: 7px; padding: 0 9px; font-family: 'Inter', sans-serif; font-size: 12.5px; color: #1c2b22; outline: none; transition: border-color 0.12s; }
        .fe-d-input:focus { border-color: #2f7d47; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .fe-d-input::placeholder { color: #a9b6ac; font-size: 12px; }
        .fe-d-input[readonly] { background: #eff4ed; color: #5b6e61; border-color: #dbe8d5; cursor: default; }
        .fe-d-input-wrap { display: flex; align-items: center; }
        .fe-d-input-wrap .fe-d-input { border-radius: 7px 0 0 7px; }
        .fe-d-lookup-btn { height: 31px; width: 31px; flex-shrink: 0; background: #edf5ea; border: 1.5px solid #d4e8cc; border-left: none; border-radius: 0 7px 7px 0; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #2f7d47; transition: background 0.12s, color 0.12s; }
        .fe-d-lookup-btn:hover:not(:disabled) { background: #ddf0e0; color: #1e6030; }
        .fe-d-lookup-btn:disabled { opacity: 0.45; cursor: not-allowed; color: #8aaa94; background: #eff4ed; }
        .fe-right .erp-lookup-control { height: 31px; border: 1.5px solid #d4e8cc; border-radius: 7px; background: #f8fbf6; font-size: 12.5px; padding: 0 8px; }
        .fe-right .erp-lookup-control:hover:not(:disabled) { border-color: #2f7d47; }
        .fe-d-select { width: 100%; height: 31px; background: #f8fbf6; border: 1.5px solid #d4e8cc; border-radius: 7px; padding: 0 24px 0 9px; font-family: 'Inter', sans-serif; font-size: 12.5px; color: #1c2b22; outline: none; appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg width='9' height='5' viewBox='0 0 9 5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l3.5 3 3.5-3' stroke='%23789a84' stroke-width='1.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 9px center; transition: border-color 0.12s; }
        .fe-d-select:focus { border-color: #2f7d47; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .fe-d-row { display: flex; gap: 8px; }
        .fe-d-row > * { flex: 1; min-width: 0; }
        .fe-d-sep { height: 1px; background: #edf5e8; }
        .fe-d-sec { font-size: 9px; font-weight: 700; letter-spacing: 0.9px; text-transform: uppercase; color: #a0b8a8; display: flex; align-items: center; gap: 6px; }
        .fe-d-sec::after { content: ''; flex: 1; height: 1px; background: #e8f0e4; }
        .fe-d-checks { display: flex; flex-direction: column; gap: 6px; }
        .fe-d-check-label { display: flex; align-items: center; gap: 7px; cursor: pointer; font-size: 12.5px; color: #46574c; user-select: none; }
        .fe-d-checkbox { width: 14px; height: 14px; flex-shrink: 0; border: 1.5px solid #a9b6ac; border-radius: 4px; appearance: none; cursor: pointer; background: #f8fbf6; position: relative; transition: background 0.12s; }
        .fe-d-checkbox:checked { background: #2f7d47; border-color: #2f7d47; }
        .fe-d-checkbox:checked::after { content: ''; position: absolute; left: 3px; top: 1px; width: 4px; height: 7px; border: 1.5px solid #fff; border-top: none; border-left: none; transform: rotate(45deg); }

        .fe-feedback { display: flex; align-items: center; gap: 9px; padding: 10px 14px; border-radius: 9px; font-size: 13px; flex-shrink: 0; }
        .fe-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .fe-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .fe-problemas { border-radius: 9px; padding: 10px 14px; font-size: 12.5px; flex-shrink: 0; }
        .fe-problemas.tem { background: #fff8e8; border: 1px solid #f0d99a; border-left: 3px solid #d99b0f; color: #7a5a10; }
        .fe-problemas.ok  { background: #f0faf2; border: 1px solid #b4dec0; border-left: 3px solid #2f7d47; color: #1e6030; }
        .fe-problemas-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .fe-problemas-close { background: none; border: none; color: inherit; cursor: pointer; font-size: 13px; line-height: 1; padding: 2px 4px; }
        .fe-problemas-list { margin: 7px 0 0 18px; display: flex; flex-direction: column; gap: 4px; line-height: 1.45; }

        .fe-row-actions { display: flex; align-items: center; gap: 2px; }
        .fe-ib { width: 24px; height: 24px; border-radius: 5px; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #7a9c84; transition: background 0.1s, color 0.1s; flex-shrink: 0; }
        .fe-ib:hover { background: #f0f8ec; color: #2a5040; }
        .fe-ib.rm:hover { background: #fdecea; color: #b94040; }
        .fe-ib:disabled { opacity: 0.3; cursor: not-allowed; }

        .fe-footer { background: #fff; border-top: 1px solid #dbe8d5; padding: 7px 20px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .fe-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6b7d71; }
        .fe-footer-stat strong { color: #1c2b22; font-weight: 600; }
        .fe-footer-group { display: flex; align-items: center; gap: 20px; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .fe-spinner { width: 14px; height: 14px; border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2; border-radius: 50%; animation: spin 0.65s linear infinite; flex-shrink: 0; }
        .fe-spinner-g { width: 16px; height: 16px; border: 2px solid #d4e8cc; border-top-color: #2f7d47; border-radius: 50%; animation: spin 0.65s linear infinite; }
      `}</style>

      <div className="fe-root">

        {/* TOPBAR */}
        <header className="fe-topbar">
          <div className="fe-topbar-left">
            <div className="fe-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)"/>
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)"/>
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)"/>
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)"/>
              </svg>
            </div>
            <span className="fe-app-name">Venture<span className="fe-app-sub">ERP &amp; Soluções</span></span>
            <span className="fe-screen-title">VENT0210 — Cadastro de Estrutura de Produto</span>
          </div>
        </header>

        {/* ACTION BAR */}
        <div className="fe-actionbar">
          <div className="fe-action-group">
            <span className="fe-action-label">Ações</span>
            <button className="fe-btn fe-btn-primary" onClick={handleSalvar} disabled={isSaving || !hasRoot}>
              {isSaving
                ? <><div className="fe-spinner"/>Salvando...</>
                : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                  Salvar{dirtyCount > 0 ? ` (${dirtyCount})` : ''}</>
              }
            </button>
            <button className="fe-btn fe-btn-ghost" onClick={handleAddRow} disabled={!hasRoot || isLoading}>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Incluir Item
            </button>
            <button className="fe-btn fe-btn-ghost" onClick={() => setConfiguradorAberto(true)} disabled={!rootInfo} title={rootInfo ? 'Configurar o produto' : 'Busque o item pai para configurar'}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="8" cy="8" r="2.6" stroke="currentColor" strokeWidth="1.4"/></svg>
              Configurador
            </button>
            <button className="fe-btn fe-btn-ghost" onClick={() => void handleConferir()} disabled={rows.length === 0}
              title={rows.length ? 'Listar todos os problemas da estrutura' : 'Nenhum componente para conferir'}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 1.6l6 3v4.2c0 3.2-2.4 5.3-6 6.6-3.6-1.3-6-3.4-6-6.6V4.6l6-3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M5.6 8.1l1.7 1.7 3.1-3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Conferir
            </button>
            <button className="fe-btn fe-btn-ghost" onClick={() => setDetalheAberto((v) => !v)}
              title={detalheAberto ? 'Recolher o painel de detalhe e usar a tela toda para a grade' : 'Mostrar o painel de detalhe do componente'}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d={detalheAberto ? 'M10.5 2.5v11' : 'M5.5 2.5v11'} stroke="currentColor" strokeWidth="1.3"/></svg>
              {detalheAberto ? 'Ocultar detalhe' : 'Mostrar detalhe'}
            </button>
            <button className="fe-btn fe-btn-ghost" onClick={() => setHistoricoAberto(true)} disabled={!rootInfo} title={rootInfo ? 'Ver quem alterou a estrutura' : 'Busque o item pai para ver o histórico'}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.4"/><path d="M8 4.4V8l2.4 1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Histórico
            </button>
            <button className="fe-btn fe-btn-ghost" onClick={() => setVersoesAbertas(true)} disabled={!rootInfo} title={rootInfo ? 'Versões aprovadas da estrutura (MBOM / EBOM)' : 'Busque o item pai para ver as versões'}>
              Versões
            </button>
            <button className="fe-btn fe-btn-danger" onClick={() => void handleLimpar()}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Limpar
            </button>
          </div>

          {breadcrumb.length > 0 && (
            <div className="fe-action-group">
              <span className="fe-action-label">Nível {breadcrumb.length + 1}</span>
              <button
                type="button"
                className="fe-btn fe-btn-ghost fe-btn-sm"
                disabled={isLoading}
                onClick={() => void handleSubirNivel()}
                title={parentLevelLabel ? `Voltar para ${parentLevelLabel} (Alt+←)` : 'Voltar ao nível anterior (Alt+←)'}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3.5L5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Voltar nível
              </button>
              {breadcrumb.length > 1 && (
                <button
                  type="button"
                  className="fe-btn fe-btn-ghost fe-btn-sm"
                  disabled={isLoading}
                  onClick={() => void handleBreadcrumbClick(-1)}
                  title="Voltar direto para a estrutura do item pai raiz"
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M11.5 3.5L7 8l4.5 4.5M7.5 3.5L3 8l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Item raiz
                </button>
              )}
            </div>
          )}
        </div>

        {/* BODY */}
        <div className="fe-body">

          {feedback && (
            <div className={`fe-feedback ${feedback.type}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === 'success'
                  ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  : <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4"/><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round"/></>
                }
              </svg>
              {feedback.msg}
            </div>
          )}

          {problemas && (
            <div className={`fe-problemas ${problemas.length ? 'tem' : 'ok'}`}>
              <div className="fe-problemas-head">
                <strong>
                  {problemas.length
                    ? `${problemas.length} problema${problemas.length > 1 ? 's' : ''} na estrutura`
                    : 'Nenhum problema encontrado'}
                </strong>
                <button className="fe-problemas-close" onClick={() => setProblemas(null)} title="Fechar">✕</button>
              </div>
              {problemas.length > 0 && (
                <ul className="fe-problemas-list">
                  {problemas.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              )}
            </div>
          )}

          {/* HEADER CARD */}
          <div className="fe-header-card">
            <div className="fe-header-card-top">
              <div className="fe-header-card-title">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="1" width="14" height="14" rx="2" stroke="#2f7d47" strokeWidth="1.4"/>
                  <path d="M5 8l2.5 2.5L11 5" stroke="#2f7d47" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Item Pai
              </div>
              <div className="fe-header-card-meta">
                {treeMeta.totalLevels > 0 && (
                  <>
                    <span className="fe-meta-chip">{treeMeta.totalLevels} nível{treeMeta.totalLevels !== 1 ? 's' : ''}</span>
                    <span className="fe-meta-chip">{treeMeta.totalNodes} componente{treeMeta.totalNodes !== 1 ? 's' : ''}</span>
                  </>
                )}
                <span className="fe-header-card-badge">VENT0210</span>
              </div>
            </div>

            <div className="fe-header-card-body">
              <div className="fe-h-field" style={{ minWidth: 300 }}>
                <label className="fe-h-label">Código do Item Pai <span style={{ color: '#c84040' }}>*</span></label>
                <div className="fe-h-input-wrap" style={{ display: 'flex', gap: 6 }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <LookupField
                      value={rootCodigo || undefined}
                      onChange={(code) => { const c = code ? String(code) : ''; setRootCodigo(c); if (c) void buscarItemPai(c); }}
                      loader={loadItems}
                      entityLabel="item"
                      placeholder="Buscar item pai"
                    />
                  </div>
                  <button className="fe-h-input-btn" onClick={handleSearchRoot} title="Buscar item" disabled={isLoading}>
                    {isLoading && !rows.length
                      ? <div className="fe-spinner-g"/>
                      : <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/><path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                    }
                  </button>
                </div>
              </div>

              <div className="fe-h-field" style={{ flex: 1, minWidth: 200 }}>
                <label className="fe-h-label">Descrição Técnica</label>
                <input className="fe-h-input" style={{ width: '100%' }} value={rootInfo?.name ?? ''} disabled placeholder="Buscado automaticamente"/>
              </div>

              <div className="fe-h-field" style={{ width: 80 }}>
                <label className="fe-h-label">UM</label>
                <input className="fe-h-input" value={rootInfo?.unit ?? ''} disabled placeholder="—"/>
              </div>

              <div className="fe-h-field" style={{ width: 200 }}>
                <label className="fe-h-label">Máscara (PDM)</label>
                <input
                  className={`fe-h-input${maskError ? ' err' : ''}`}
                  value={rootMascara}
                  onChange={(e) => { setRootMascara(e.target.value); setMaskError(''); }}
                  onBlur={handleMascaraBlur}
                  placeholder="Opcional — Ex: 1.94M#1.94M"
                  disabled={!rootInfo}
                />
                {maskError
                  ? <span className="fe-h-err">{maskError}</span>
                  : <span className="fe-h-hint">Validada ao sair do campo.</span>
                }
              </div>
            </div>
          </div>

          {/* SPLIT */}
          <div className="fe-split">

            {/* GRID */}
            <div className="fe-left">
              <div className="fe-grid-card">
                <div className="fe-grid-header">
                  <div className="fe-grid-title">
                    {breadcrumb.length === 0 ? (
                      <>
                        <span>Componentes</span>
                        {hasRoot && <span className="fe-level-pill">Nível 1 · Raiz</span>}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="fe-level-back"
                          disabled={isLoading}
                          onClick={() => void handleSubirNivel()}
                          title={parentLevelLabel ? `Subir um nível para ${parentLevelLabel} (Alt+←)` : 'Subir um nível (Alt+←)'}
                        >
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                            <path d="M8.5 3L4.5 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Voltar
                        </button>
                        <span className="fe-level-pill">Nível {breadcrumb.length + 1}</span>
                        <div className="fe-breadcrumb">
                          <button type="button" className="fe-bc-btn" onClick={() => void handleBreadcrumbClick(-1)} title="Voltar ao item pai raiz">
                            {rootInfo?.code ?? rootCodigo}
                          </button>
                          {breadcrumb.map((crumb, i) => (
                            <span key={`${crumb.code}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span className="fe-bc-sep">›</span>
                              {i === breadcrumb.length - 1
                                ? <span className="fe-bc-cur">{crumb.code} — {crumb.label}</span>
                                : <button type="button" className="fe-bc-btn" onClick={() => void handleBreadcrumbClick(i)}>{crumb.code} — {crumb.label}</button>
                              }
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                    <span className="fe-grid-count">{rows.length} item{rows.length !== 1 ? 's' : ''}</span>
                    {dirtyCount > 0 && <span className="fe-dirty-badge">{dirtyCount} não salvo{dirtyCount !== 1 ? 's' : ''}</span>}
                  </div>
                  <button className="fe-btn fe-btn-ghost fe-btn-sm" onClick={handleAddRow} disabled={!hasRoot || isLoading}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    Incluir
                  </button>
                </div>

                <div className="fe-table-wrap">
                  {isLoading ? (
                    <div className="fe-loading"><div className="fe-spinner-g"/>Carregando estrutura...</div>
                  ) : rows.length === 0 ? (
                    <div className="fe-empty">
                      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ opacity: 0.3 }}>
                        <rect x="4" y="10" width="32" height="24" rx="3" stroke="#2f7d47" strokeWidth="1.8"/>
                        <path d="M4 16h32M14 10V6M26 10V6" stroke="#2f7d47" strokeWidth="1.8" strokeLinecap="round"/>
                        <path d="M20 22v6M17 25h6" stroke="#2f7d47" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                      <span className="fe-empty-title">{hasRoot ? 'Sem componentes neste nível' : 'Informe o código do item pai'}</span>
                      <span className="fe-empty-sub">{hasRoot ? 'Clique em Incluir para adicionar.\nItens com ↩ têm filhos — duplo clique para navegar.' : 'Digite o código e pressione Enter ou clique na lupa.'}</span>
                    </div>
                  ) : (
                    <table className="fe-table">
                      <thead>
                        <tr>
                          <th style={{ width: 44 }}>Pos.</th>
                          <th style={{ width: 132 }}>Cód. Filho</th>
                          <th style={{ minWidth: 240 }}>Descrição</th>
                          <th style={{ width: 92 }} title="Fórmula, vigência, alternativo, co-produto e quantidade por ordem">Sinais</th>
                          <th style={{ width: 85 }}>UM</th>
                          <th style={{ width: 75 }}>Qtde</th>
                          <th style={{ width: 70 }}>Perda %</th>
                          <th style={{ width: 104 }}>Situação</th>
                          <th style={{ width: 130 }}>Observações</th>
                          <th style={{ width: 68 }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, idx) => {
                          const isSel = selectedLocalId === row.localId;
                          return (
                            <tr
                              key={row.localId}
                              className={[isSel ? 'sel' : '', row.health === 'INATIVO' ? 'inact' : ''].filter(Boolean).join(' ')}
                              onClick={() => handleRowClick(row.localId)}
                              onDoubleClick={() => handleRowDoubleClick(row)}
                              title="Duplo clique abre a estrutura deste componente" 
                            >
                              <td><div className="fe-td">
                                <span className="fe-pos">{row.position}</span>
                                {row.dirty && <span className="fe-dot">•</span>}
                              </div></td>

                              <td><div className="fe-td">
                                <input className="fe-ci"
                                  value={row.childCode || ''}
                                  readOnly={!row.isNew}
                                  onChange={(e) => { if (row.isNew) updateRow(row.localId, { childCode: e.target.value }); }}
                                  onBlur={(e) => { if (row.isNew) handleChildCodeBlur(row.localId, e.target.value); }}
                                  placeholder="Código"
                                  onClick={(e) => { e.stopPropagation(); handleRowClick(row.localId); }}
                                  onDoubleClick={(e) => { e.stopPropagation(); void handleRowDoubleClick(row); }}
                                  style={{ textAlign: 'right' }}/>
                              </div></td>

                              <td><div className="fe-td">
                                <input className="fe-ci" value={row.childDescription}
                                  readOnly
                                  placeholder="Descrição do cadastro"
                                  onClick={(e) => { e.stopPropagation(); handleRowClick(row.localId); }}
                                  onDoubleClick={(e) => { e.stopPropagation(); void handleRowDoubleClick(row); }}
                                  style={{ textOverflow: 'ellipsis' }}/>
                                {!row.isNew && Boolean(row.childCode) && (
                                  <button
                                    type="button"
                                    className={`fe-drill-btn${row.hasChildren ? ' has-sub' : ''}`}
                                    title={row.hasChildren ? 'Possui subestrutura — clique para abrir os filhos deste componente' : 'Entrar neste componente para cadastrar os filhos dele'}
                                    onClick={(e) => { e.stopPropagation(); void handleRowDoubleClick(row); }}
                                  >
                                    {row.hasChildren ? 'Subnível' : 'Nível'}
                                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                      <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                )}
                              </div></td>

                              <td><div className="fe-td" style={{ gap: 3 }}>
                                <ComponentFlags row={row} />
                              </div></td>

                              <td><div className="fe-td">
                                <select className="fe-cs" value={row.unitOfMeasurement}
                                  onChange={(e) => updateRow(row.localId, { unitOfMeasurement: e.target.value as UnitOfMeasurement })}
                                  onClick={(e) => { e.stopPropagation(); handleRowClick(row.localId); }}
                                  onDoubleClick={(e) => { e.stopPropagation(); void handleRowDoubleClick(row); }}>
                                  {(unidadesDoCatalogo.includes(row.unitOfMeasurement) ? unidadesDoCatalogo : [...unidadesDoCatalogo, row.unitOfMeasurement]).map((u) => <option key={u} value={u}>{rotuloUM[u] ?? enumLabel(u)}</option>)}
                                </select>
                              </div></td>

                              <td><div className="fe-td">
                                <input className="fe-ci" type="number" min={0} step="0.001"
                                  value={row.quantity}
                                  disabled={Boolean(row.quantityFormula)}
                                  title={row.quantityFormula ? `Calculada pela fórmula: ${row.quantityFormula}` : undefined}
                                  onChange={(e) => updateRow(row.localId, { quantity: parseFloat(e.target.value) || 0, quantityEdited: true })}
                                  style={{ textAlign: 'right', width: 60 }}
                                  onClick={(e) => { e.stopPropagation(); handleRowClick(row.localId); }}
                                  onDoubleClick={(e) => { e.stopPropagation(); void handleRowDoubleClick(row); }}/>
                              </div></td>

                              <td><div className="fe-td">
                                <input className="fe-ci" type="number" min={0} max={100} step="0.01"
                                  value={row.lossPercentage}
                                  disabled={Boolean(row.lossFormula)}
                                  title={row.lossFormula ? `Calculada pela fórmula: ${row.lossFormula}` : undefined}
                                  onChange={(e) => updateRow(row.localId, { lossPercentage: parseFloat(e.target.value) || 0 })}
                                  style={{ textAlign: 'right', width: 55 }}
                                  onClick={(e) => { e.stopPropagation(); handleRowClick(row.localId); }}
                                  onDoubleClick={(e) => { e.stopPropagation(); void handleRowDoubleClick(row); }}/>
                              </div></td>

                              <td><div className="fe-td">
                                <select className="fe-cs" value={row.health}
                                  onChange={(e) => updateRow(row.localId, { health: e.target.value as Health })}
                                  onClick={(e) => { e.stopPropagation(); handleRowClick(row.localId); }}
                                  onDoubleClick={(e) => { e.stopPropagation(); void handleRowDoubleClick(row); }}
                                  style={{ color: HEALTH_COLOR[row.health] }}>
                                  {HEALTH_OPTIONS.map((h) => <option key={h} value={h}>{enumLabel(h)}</option>)}
                                </select>
                              </div></td>

                              <td><div className="fe-td">
                                <input className="fe-ci" value={row.notes ?? ''}
                                  onChange={(e) => updateRow(row.localId, { notes: e.target.value || null })}
                                  placeholder="—"
                                  onClick={(e) => { e.stopPropagation(); handleRowClick(row.localId); }}
                                  onDoubleClick={(e) => { e.stopPropagation(); void handleRowDoubleClick(row); }}/>
                              </div></td>

                              <td><div className="fe-td">
                                <div className="fe-row-actions">
                                  <button className="fe-ib" title="Abrir a estrutura deste componente"
                                    disabled={row.isNew || !row.childCode}
                                    onClick={(e) => { e.stopPropagation(); void handleRowDoubleClick(row); }}>
                                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M3 2v4a2 2 0 002 2h5M7 5l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </button>
                                  <button className="fe-ib" title="Subir" disabled={idx === 0}
                                    onClick={(e) => { e.stopPropagation(); handleMoveRow(row.localId, 'up'); }}>
                                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 8l4-4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </button>
                                  <button className="fe-ib" title="Descer" disabled={idx === rows.length - 1}
                                    onClick={(e) => { e.stopPropagation(); handleMoveRow(row.localId, 'down'); }}>
                                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </button>
                                  <button className="fe-ib rm" title="Remover"
                                    onClick={(e) => { e.stopPropagation(); void handleDeleteRow(row.localId); }}>
                                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                                  </button>
                                </div>
                              </div></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* DETAIL PANEL */}
            <div className={`fe-right${detalheAberto ? '' : ' oculto'}`}>
              <div className="fe-detail-card">
                <div className="fe-detail-header">
                  {selectedRow
                    ? `Detalhe — ${selectedRow.childDescription || `Cód. ${selectedRow.childCode}` || 'Novo'}`
                    : 'Detalhe do item'}
                </div>
                <DetailPanel
                  row={selectedRow}
                  canStepUp={breadcrumb.length > 0}
                  parentLevelLabel={parentLevelLabel}
                  onUpdate={(patch) => { if (selectedLocalId) updateRow(selectedLocalId, patch); }}
                  onChildCodeBlur={(code) => { if (selectedLocalId) handleChildCodeBlur(selectedLocalId, code); }}
                  onOpenChildLookup={() => { if (selectedRow?.isNew) setLookupFilhoAberto(true); }}
                  onDrillDown={(r) => void handleRowDoubleClick(r)}
                  onStepUp={() => void handleSubirNivel()}
                />
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER */}
        <footer className="fe-footer">
          <div className="fe-footer-group">
            <div className="fe-footer-stat">Estrutura: <strong>{breadcrumbLabel}</strong></div>
            <div className="fe-footer-stat">Nível atual: <strong>{breadcrumb.length + 1}</strong></div>
            <div className="fe-footer-stat">Componentes: <strong>{rows.length}</strong></div>
            {selectedRow && (
              <div className="fe-footer-stat">
                Selecionado: <strong>{selectedRow.childDescription || `Cód. ${selectedRow.childCode}`} — Pos. {selectedRow.position}</strong>
              </div>
            )}
          </div>
          <div className="fe-footer-stat">Empresa: <strong>{empresaNome}</strong></div>
        </footer>

      </div>

      {lookupFilhoAberto && currentParentCode && (
        <StructureItemLookupModal
          parentCode={currentParentCode}
          forbiddenCodes={forbiddenCodesForLookup}
          existingChildCodes={existingChildCodesForLookup}
          initialCode={selectedRow?.isNew ? selectedRow.childCode : undefined}
          onConfirm={handleConfirmarItensDoModal}
          onClose={() => setLookupFilhoAberto(false)}
        />
      )}

      {configuradorAberto && rootInfo && (
        <StructureConfiguratorPanel
          itemCode={rootInfo.code}
          itemName={rootInfo.name}
          onUseMask={(mask) => void handleUsarMascaraConfigurada(mask)}
          onClose={() => setConfiguradorAberto(false)}
        />
      )}

      {versoesAbertas && rootInfo && (
        <StructureVersionsPanel itemCode={rootInfo.code} itemName={rootInfo.name} mask={rootMascara.trim() || undefined} onClose={() => setVersoesAbertas(false)} />
      )}

      {historicoAberto && rootInfo && (
        <StructureHistoryPanel
          itemCode={rootInfo.code}
          onClose={() => setHistoricoAberto(false)}/>
      )}
    </>
  );
}

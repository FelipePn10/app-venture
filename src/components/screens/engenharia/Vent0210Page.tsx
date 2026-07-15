import { useState, useCallback, useRef, memo } from 'react';
import {
  findItemByCode,
  resolveStructure,
  resolveChildLevel,
  createComponent,
  validateMask,
  type StructureComponent,
  type CreateStructurePayload,
  type UnitOfMeasurement,
  type Health,
  type ItemInfo,
  UNIT_OPTIONS,
  HEALTH_OPTIONS,
} from '@/services/ItemStructureService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BreadcrumbEntry {
  code: number;
  label: string;
}

interface LocalRow extends StructureComponent {
  localId: string;
  dirty: boolean;
  isNew: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return `new_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function nextPosition(rows: LocalRow[]): number {
  if (rows.length === 0) return 1;
  return Math.max(...rows.map((r) => r.position)) + 1;
}

function blankRow(parentCode: number, rows: LocalRow[]): LocalRow {
  return {
    localId: uid(),
    dirty: true,
    isNew: true,
    id: 0,
    parentCode,
    childCode: 0,
    childDescription: '',
    parentMask: null,
    quantity: 1,
    effectiveQuantity: 0,
    unitOfMeasurement: 'UN',
    health: 'ATIVO',
    lossPercentage: 0,
    position: nextPosition(rows),
    notes: null,
    isActive: true,
    createdAt: '',
    updatedAt: '',
    level: 1,
    hasChildren: false,
  };
}

function toPayload(row: LocalRow, mask: string | null): CreateStructurePayload {
  return {
    parent_code:         row.parentCode,
    child_code:          row.childCode,
    parent_mask:         mask || null,
    quantity:            row.quantity,
    unit_of_measurement: row.unitOfMeasurement,
    health:              row.health,
    loss_percentage:     row.lossPercentage,
    position:            row.position,
    notes:               row.notes || null,
    is_active:           row.isActive,
  };
}

// ─── Health badge styles ──────────────────────────────────────────────────────

const HEALTH_COLOR: Record<Health, string> = {
  ATIVO:    '#1a6630',
  INATIVO:  '#991c1c',
  FANTASMA: '#3a3a8a',
};

// ─── Detail Panel ─────────────────────────────────────────────────────────────

interface DetailPanelProps {
  row: LocalRow | null;
  onUpdate: (patch: Partial<LocalRow>) => void;
}

const DetailPanel = memo(function DetailPanel({ row, onUpdate }: DetailPanelProps) {
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
          <label className="fe-d-label">Cód. Filho (int64)</label>
          <input className="fe-d-input" type="number" min={1}
            value={row.childCode || ''}
            onChange={(e) => onUpdate({ childCode: parseInt(e.target.value, 10) || 0 })}
            placeholder="Ex: 2206" style={{ textAlign: 'right' }}/>
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
        <input className="fe-d-input" value={row.childDescription}
          onChange={(e) => onUpdate({ childDescription: e.target.value })}
          placeholder="Preenchida automaticamente"/>
      </div>

      <div className="fe-d-sep"/>
      <div className="fe-d-sec">Quantidades e UM</div>

      <div className="fe-d-row">
        <div className="fe-d-field">
          <label className="fe-d-label">Quantidade</label>
          <input className="fe-d-input" type="number" min={0} step="0.001"
            value={row.quantity}
            onChange={(e) => onUpdate({ quantity: parseFloat(e.target.value) || 0 })}
            style={{ textAlign: 'right' }}/>
        </div>
        <div className="fe-d-field">
          <label className="fe-d-label">Unid. Medida</label>
          <select className="fe-d-select" value={row.unitOfMeasurement}
            onChange={(e) => onUpdate({ unitOfMeasurement: e.target.value as UnitOfMeasurement })}>
            {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div className="fe-d-row">
        <div className="fe-d-field">
          <label className="fe-d-label">Perda (%)</label>
          <input className="fe-d-input" type="number" min={0} max={100} step="0.01"
            value={row.lossPercentage}
            onChange={(e) => onUpdate({ lossPercentage: parseFloat(e.target.value) || 0 })}
            style={{ textAlign: 'right' }}/>
        </div>
        <div className="fe-d-field">
          <label className="fe-d-label">Health</label>
          <select className="fe-d-select" value={row.health}
            onChange={(e) => onUpdate({ health: e.target.value as Health })}>
            {HEALTH_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      </div>

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
            checked={row.isActive}
            onChange={(e) => onUpdate({ isActive: e.target.checked })}/>
          Ativo
        </label>
      </div>

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

  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentLevel      = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1] : null;
  const currentParentCode = currentLevel?.code ?? rootInfo?.code ?? null;
  const selectedRow       = rows.find((r) => r.localId === selectedLocalId) ?? null;
  const dirtyCount        = rows.filter((r) => r.dirty).length;
  const hasRoot           = currentParentCode !== null;

  // ── load root structure ──────────────────────────────────────────────────────

  const loadRoot = useCallback(async (code: number, mask?: string | null) => {
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

  const loadChildLevel = useCallback(async (childCode: number, mask?: string | null) => {
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
    const codeStr = rootCodigo.trim();
    if (!codeStr) return;
    const codeNum = parseInt(codeStr, 10);
    if (isNaN(codeNum)) {
      setFeedback({ type: 'error', msg: 'Código deve ser numérico (int64).' });
      return;
    }
    setIsLoading(true);
    setFeedback(null);
    setMaskError('');
    setBreadcrumb([]);
    try {
      const info = await findItemByCode(codeNum);
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

  // ── breadcrumb ───────────────────────────────────────────────────────────────

  async function handleBreadcrumbClick(index: number) {
    if (index === -1) {
      setBreadcrumb([]);
      if (rootInfo) await loadRoot(rootInfo.code, rootMascara || null);
    } else {
      setBreadcrumb((p) => p.slice(0, index + 1));
      await loadChildLevel(breadcrumb[index].code, rootMascara || null);
    }
  }

  // ── drill-down double click ──────────────────────────────────────────────────

  function handleRowClick(localId: string) {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => setSelectedLocalId(localId), 200);
  }

  async function handleRowDoubleClick(row: LocalRow) {
    if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; }
    if (!row.childCode || row.isNew || !row.hasChildren) return;
    setBreadcrumb((p) => [...p, {
      code: row.childCode,
      label: row.childDescription || String(row.childCode),
    }]);
    await loadChildLevel(row.childCode, rootMascara || null);
  }

  // ── row mutations ────────────────────────────────────────────────────────────

  function handleAddRow() {
    if (!currentParentCode) return;
    const row = blankRow(currentParentCode, rows);
    setRows((p) => [...p, row]);
    setSelectedLocalId(row.localId);
  }

  function handleDeleteRow(localId: string) {
    setRows((p) => p.filter((r) => r.localId !== localId));
    if (selectedLocalId === localId) setSelectedLocalId(null);
  }

  function handleMoveRow(localId: string, dir: 'up' | 'down') {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.localId === localId);
      const target = dir === 'up' ? idx - 1 : idx + 1;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  const updateRow = useCallback((localId: string, patch: Partial<LocalRow>) => {
    setRows((prev) =>
      prev.map((r) => r.localId === localId ? { ...r, ...patch, dirty: true } : r)
    );
  }, []);

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
    if (newRows.length === 0) {
      setFeedback({ type: 'success', msg: 'Nenhuma alteração pendente.' });
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      const mask = rootMascara.trim() || null;
      const created = await Promise.all(newRows.map((r) => createComponent(toPayload(r, mask))));
      const createdMap = new Map(newRows.map((r, i) => [r.localId, created[i]]));
      setRows((prev) =>
        prev.map((r) => {
          const c = createdMap.get(r.localId);
          if (!c) return r;
          return { ...c, localId: String(c.id), dirty: false, isNew: false };
        })
      );
      setFeedback({ type: 'success', msg: `${created.length} item(ns) salvo(s) com sucesso.` });
      // Reload to get fresh data
      if (breadcrumb.length === 0 && rootInfo) {
        await loadRoot(rootInfo.code, mask);
      } else if (currentLevel) {
        await loadChildLevel(currentLevel.code, mask);
      }
    } catch (e) {
      setFeedback({ type: 'error', msg: e instanceof Error ? e.message : 'Erro ao salvar.' });
    } finally {
      setIsSaving(false);
    }
  }

  function handleLimpar() {
    setRootInfo(null);
    setRootCodigo('');
    setRootMascara('');
    setMaskError('');
    setBreadcrumb([]);
    setRows([]);
    setSelectedLocalId(null);
    setFeedback(null);
    setTreeMeta({ totalLevels: 0, totalNodes: 0 });
  }

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
        .fe-right { width: 300px; flex-shrink: 0; display: flex; flex-direction: column; min-height: 0; }

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
        .fe-d-label { font-size: 9.5px; font-weight: 600; color: #6a8068; text-transform: uppercase; letter-spacing: 0.4px; }
        .fe-d-input { width: 100%; height: 31px; background: #f8fbf6; border: 1.5px solid #d4e8cc; border-radius: 7px; padding: 0 9px; font-family: 'Inter', sans-serif; font-size: 12.5px; color: #1c2b22; outline: none; transition: border-color 0.12s; }
        .fe-d-input:focus { border-color: #2f7d47; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .fe-d-input::placeholder { color: #a9b6ac; font-size: 12px; }
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
            <span className="fe-action-label">Nav</span>
            {[{ t:'Primeiro', d:'M9 2L3 6l6 4M2 2v8' }, { t:'Anterior', d:'M8 2L4 6l4 4' }, { t:'Próximo', d:'M4 2l4 4-4 4' }, { t:'Último', d:'M3 2l6 4-6 4M10 2v8' }].map(({ t, d }) => (
              <button key={t} className="fe-nav-btn" title={t}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            ))}
          </div>

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
            <button className="fe-btn fe-btn-danger" onClick={handleLimpar}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Limpar
            </button>
          </div>

          <div className="fe-action-group">
            <span className="fe-action-label">Ferramentas</span>
            {['Configurador', 'Alternativos', 'Ajuda'].map((l) => (
              <button key={l} className="fe-btn fe-btn-ghost fe-btn-sm">{l}</button>
            ))}
          </div>
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
              <div className="fe-h-field" style={{ minWidth: 180 }}>
                <label className="fe-h-label">Código do Item Pai <span style={{ color: '#c84040' }}>*</span></label>
                <div className="fe-h-input-wrap">
                  <input
                    className="fe-h-input"
                    style={{ borderRadius: '7px 0 0 7px', width: 140 }}
                    value={rootCodigo}
                    onChange={(e) => setRootCodigo(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearchRoot(); }}
                    placeholder="Ex: 2205"
                    type="number"
                    min={1}
                  />
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
                      <span>Componentes</span>
                    ) : (
                      <div className="fe-breadcrumb">
                        <button className="fe-bc-btn" onClick={() => handleBreadcrumbClick(-1)}>
                          {rootInfo?.code ?? rootCodigo}
                        </button>
                        {breadcrumb.map((crumb, i) => (
                          <span key={crumb.code} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span className="fe-bc-sep">›</span>
                            {i === breadcrumb.length - 1
                              ? <span className="fe-bc-cur">{crumb.label}</span>
                              : <button className="fe-bc-btn" onClick={() => handleBreadcrumbClick(i)}>{crumb.label}</button>
                            }
                          </span>
                        ))}
                      </div>
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
                          <th style={{ width: 90 }}>Cód. Filho</th>
                          <th>Descrição</th>
                          <th style={{ width: 85 }}>UM</th>
                          <th style={{ width: 75 }}>Qtde</th>
                          <th style={{ width: 70 }}>Perda %</th>
                          <th style={{ width: 90 }}>Health</th>
                          <th style={{ width: 160 }}>Observações</th>
                          <th style={{ width: 50, textAlign: 'center' }}>Ativo</th>
                          <th style={{ width: 68 }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, idx) => {
                          const isSel = selectedLocalId === row.localId;
                          return (
                            <tr
                              key={row.localId}
                              className={[isSel ? 'sel' : '', !row.isActive ? 'inact' : ''].filter(Boolean).join(' ')}
                              onClick={() => handleRowClick(row.localId)}
                              onDoubleClick={() => handleRowDoubleClick(row)}
                              title={row.hasChildren ? 'Duplo clique para ver filhos' : ''}
                            >
                              <td><div className="fe-td">
                                <span className="fe-pos">{row.position}</span>
                                {row.dirty && <span className="fe-dot">•</span>}
                              </div></td>

                              <td><div className="fe-td">
                                <input className="fe-ci" type="number" min={1}
                                  value={row.childCode || ''}
                                  onChange={(e) => updateRow(row.localId, { childCode: parseInt(e.target.value, 10) || 0 })}
                                  placeholder="Código"
                                  onClick={(e) => e.stopPropagation()}
                                  onDoubleClick={(e) => e.stopPropagation()}
                                  style={{ textAlign: 'right' }}/>
                              </div></td>

                              <td><div className="fe-td" style={{ maxWidth: 220 }}>
                                <input className="fe-ci" value={row.childDescription}
                                  onChange={(e) => updateRow(row.localId, { childDescription: e.target.value })}
                                  placeholder="Descrição"
                                  onClick={(e) => e.stopPropagation()}
                                  onDoubleClick={(e) => e.stopPropagation()}
                                  style={{ textOverflow: 'ellipsis' }}/>
                                {row.hasChildren && <span className="fe-drill">↩</span>}
                              </div></td>

                              <td><div className="fe-td">
                                <select className="fe-cs" value={row.unitOfMeasurement}
                                  onChange={(e) => updateRow(row.localId, { unitOfMeasurement: e.target.value as UnitOfMeasurement })}
                                  onClick={(e) => e.stopPropagation()}
                                  onDoubleClick={(e) => e.stopPropagation()}>
                                  {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                                </select>
                              </div></td>

                              <td><div className="fe-td">
                                <input className="fe-ci" type="number" min={0} step="0.001"
                                  value={row.quantity}
                                  onChange={(e) => updateRow(row.localId, { quantity: parseFloat(e.target.value) || 0 })}
                                  style={{ textAlign: 'right', width: 60 }}
                                  onClick={(e) => e.stopPropagation()}
                                  onDoubleClick={(e) => e.stopPropagation()}/>
                              </div></td>

                              <td><div className="fe-td">
                                <input className="fe-ci" type="number" min={0} max={100} step="0.01"
                                  value={row.lossPercentage}
                                  onChange={(e) => updateRow(row.localId, { lossPercentage: parseFloat(e.target.value) || 0 })}
                                  style={{ textAlign: 'right', width: 55 }}
                                  onClick={(e) => e.stopPropagation()}
                                  onDoubleClick={(e) => e.stopPropagation()}/>
                              </div></td>

                              <td><div className="fe-td">
                                <select className="fe-cs" value={row.health}
                                  onChange={(e) => updateRow(row.localId, { health: e.target.value as Health })}
                                  onClick={(e) => e.stopPropagation()}
                                  onDoubleClick={(e) => e.stopPropagation()}
                                  style={{ color: HEALTH_COLOR[row.health] }}>
                                  {HEALTH_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
                                </select>
                              </div></td>

                              <td><div className="fe-td">
                                <input className="fe-ci" value={row.notes ?? ''}
                                  onChange={(e) => updateRow(row.localId, { notes: e.target.value || null })}
                                  placeholder="—"
                                  onClick={(e) => e.stopPropagation()}
                                  onDoubleClick={(e) => e.stopPropagation()}/>
                              </div></td>

                              <td><div className="fe-td" style={{ justifyContent: 'center' }}>
                                <input type="checkbox" className="fe-ck" checked={row.isActive}
                                  onChange={(e) => updateRow(row.localId, { isActive: e.target.checked })}
                                  onClick={(e) => e.stopPropagation()}
                                  onDoubleClick={(e) => e.stopPropagation()}/>
                              </div></td>

                              <td><div className="fe-td">
                                <div className="fe-row-actions">
                                  <button className="fe-ib" title="Subir" disabled={idx === 0}
                                    onClick={(e) => { e.stopPropagation(); handleMoveRow(row.localId, 'up'); }}>
                                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 8l4-4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </button>
                                  <button className="fe-ib" title="Descer" disabled={idx === rows.length - 1}
                                    onClick={(e) => { e.stopPropagation(); handleMoveRow(row.localId, 'down'); }}>
                                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </button>
                                  <button className="fe-ib rm" title="Remover"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteRow(row.localId); }}>
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
            <div className="fe-right">
              <div className="fe-detail-card">
                <div className="fe-detail-header">
                  {selectedRow
                    ? `Detalhe — ${selectedRow.childDescription || `Cód. ${selectedRow.childCode}` || 'Novo'}`
                    : 'Detalhe do item'}
                </div>
                <DetailPanel
                  row={selectedRow}
                  onUpdate={(patch) => { if (selectedLocalId) updateRow(selectedLocalId, patch); }}
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
          <div className="fe-footer-stat">Empresa: <strong>GRUPO VENTURE LTDA</strong></div>
        </footer>

      </div>
    </>
  );
}
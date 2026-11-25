import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listItems, type ItemDTO } from '@/services/itemService';
import { buscaCompletaDosItens } from '@/services/lookups';
import { aoInvalidarListas, geracaoDasListas } from '@/services/lookupInvalidation';
import { errMessage } from '@/services/fiscalShared';
import { enumLabel } from '@/utils/enumLabels';
import { useRotulosDeUnidades } from '@/hooks/useUnidades';
import { useEscapeToClose } from '@/hooks/useEscapeToClose';
import type { UnitOfMeasurement } from '@/services/ItemStructureService';
import { CFG_STYLES } from './StructureConfiguratorPanel';

export interface CandidateStructureItem {
  code: string;
  description: string;
  uom: UnitOfMeasurement;
  engType?: string;
  ghost: boolean;
  inactive: boolean;
  searchText: string;
  aliases: { kind: string; value: string }[];
}

type TypeFilter = 'ALL' | 'COMPRADO' | 'FABRICADO' | 'DE_TERCEIRO' | 'FANTASMA' | 'SELECTED';

const TYPE_LABELS: Record<string, string> = {
  FABRICADO: 'Fabricado',
  COMPRADO: 'Comprado',
  DE_TERCEIRO: 'De terceiro',
  SERVICO: 'Serviço',
};

// Cache de sessão invalidado automaticamente quando qualquer cadastro muda.
let cacheCandidatos: Promise<CandidateStructureItem[]> | null = null;
let geracaoCache = -1;
aoInvalidarListas(() => {
  cacheCandidatos = null;
});

function carregarCandidatos(forcar = false): Promise<CandidateStructureItem[]> {
  const geracaoAtual = geracaoDasListas();
  if (forcar || geracaoCache !== geracaoAtual) {
    cacheCandidatos = null;
  }
  if (!cacheCandidatos) {
    geracaoCache = geracaoAtual;
    cacheCandidatos = Promise.all([listItems(), buscaCompletaDosItens()])
      .then(([itens, busca]): CandidateStructureItem[] =>
        itens
          .filter((i: ItemDTO) => Boolean(i.code))
          .map((i: ItemDTO) => {
            const code = String(i.code);
            const extra = busca.get(code);
            return {
              code,
              description: i.description || `Item ${code}`,
              uom: (i.uom || 'UN') as UnitOfMeasurement,
              engType: i.eng_type,
              ghost: Boolean(i.ghost) || i.health === 'FANTASMA',
              inactive: i.health === 'INATIVO',
              searchText: [
                extra?.texto ?? '',
                i.previous_code ?? '',
                i.manufacturer_part_number ?? '',
              ]
                .filter(Boolean)
                .join(' '),
              aliases: extra?.apelidos ?? [],
            };
          }),
      )
      .catch((erro: unknown) => {
        cacheCandidatos = null;
        throw erro;
      });
  }
  return cacheCandidatos;
}

function normalizarBusca(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function apelidoEncontrado(item: CandidateStructureItem, query: string): string | null {
  const q = normalizarBusca(query.trim());
  if (!q || item.aliases.length === 0) return null;
  if (normalizarBusca(item.code).includes(q) || normalizarBusca(item.description).includes(q)) {
    return null;
  }
  const achado = item.aliases.find(
    (a) => normalizarBusca(a.value).includes(q) || normalizarBusca(`${a.kind} ${a.value}`).includes(q),
  );
  return achado ? `${achado.kind.charAt(0).toLowerCase()}${achado.kind.slice(1)}: ${achado.value}` : null;
}

interface StructureItemLookupModalProps {
  parentCode: string;
  /** Códigos bloqueados por ciclo (item pai atual e ancestrais da navegação). */
  forbiddenCodes: Set<string>;
  /** Códigos já presentes neste nível da estrutura (exceto a própria linha vazia em edição). */
  existingChildCodes: Set<string>;
  /** Código inicialmente digitado na linha, se houver. */
  initialCode?: string;
  onConfirm: (items: CandidateStructureItem[]) => void;
  onClose: () => void;
}

export function StructureItemLookupModal({
  parentCode,
  forbiddenCodes,
  existingChildCodes,
  initialCode,
  onConfirm,
  onClose,
}: StructureItemLookupModalProps): JSX.Element {
  useEscapeToClose(onClose);
  const rotuloUM = useRotulosDeUnidades();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<CandidateStructureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(() => {
    const trimmed = initialCode?.trim();
    return trimmed ? new Set([trimmed]) : new Set();
  });

  const load = useCallback(async (forcar = false) => {
    setLoading(true);
    setError('');
    try {
      const lista = await carregarCandidatos(forcar);
      // Itens inativos não entram em estruturas novas.
      setItems(lista.filter((i) => !i.inactive));
    } catch (e) {
      setItems([]);
      setError(errMessage(e, 'Não foi possível carregar os itens cadastrados.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setTimeout(() => searchInputRef.current?.focus(), 20);
    return () => clearTimeout(t);
  }, [load]);

  const itemByCode = useMemo(() => {
    const map = new Map<string, CandidateStructureItem>();
    for (const item of items) {
      map.set(item.code.toUpperCase(), item);
    }
    return map;
  }, [items]);

  const isForbidden = useCallback(
    (code: string) => forbiddenCodes.has(code.trim().toUpperCase()),
    [forbiddenCodes],
  );
  const isExisting = useCallback(
    (code: string) => existingChildCodes.has(code.trim().toUpperCase()),
    [existingChildCodes],
  );
  const canSelect = useCallback(
    (code: string) => !isForbidden(code) && !isExisting(code),
    [isForbidden, isExisting],
  );

  // Remove da seleção inicial qualquer código bloqueado ou inexistente no catálogo ativo.
  useEffect(() => {
    if (loading || items.length === 0) return;
    setSelectedCodes((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const c of prev) {
        const canonical = itemByCode.get(c.toUpperCase())?.code;
        if (canonical && canSelect(canonical)) {
          next.add(canonical);
          if (canonical !== c) changed = true;
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [loading, items, itemByCode, canSelect]);

  const filtered = useMemo(() => {
    const q = normalizarBusca(query.trim());

    const byType = items.filter((item) => {
      if (typeFilter === 'SELECTED') return selectedCodes.has(item.code);
      if (typeFilter === 'FANTASMA') return item.ghost;
      if (typeFilter === 'ALL') return true;
      return item.engType === typeFilter;
    });

    if (!q) return byType.slice(0, 300);

    const relevancia = (item: CandidateStructureItem): number => {
      const code = normalizarBusca(item.code);
      const desc = normalizarBusca(item.description);
      if (code === q) return 0;
      if (code.startsWith(q)) return 1;
      if (code.includes(q)) return 2;
      if (desc.startsWith(q)) return 3;
      if (desc.includes(q)) return 4;
      return 5;
    };

    return byType
      .filter((item) => {
        const code = normalizarBusca(item.code);
        const desc = normalizarBusca(item.description);
        const extra = normalizarBusca(item.searchText);
        const uom = normalizarBusca(item.uom);
        return code.includes(q) || desc.includes(q) || extra.includes(q) || uom.includes(q);
      })
      .map((item, idx) => ({ item, rel: relevancia(item), idx }))
      .sort((a, b) => a.rel - b.rel || a.idx - b.idx)
      .map((entry) => entry.item)
      .slice(0, 300);
  }, [items, query, typeFilter, selectedCodes]);

  const toggleItem = useCallback(
    (code: string) => {
      if (!canSelect(code)) return;
      setSelectedCodes((prev) => {
        const next = new Set(prev);
        if (next.has(code)) next.delete(code);
        else next.add(code);
        return next;
      });
    },
    [canSelect],
  );

  const selectableVisible = useMemo(
    () => filtered.filter((i) => canSelect(i.code)),
    [filtered, canSelect],
  );

  const handleSelectVisible = () => {
    const batch = selectableVisible.slice(0, 100);
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      for (const item of batch) next.add(item.code);
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedCodes(new Set());
    if (typeFilter === 'SELECTED') setTypeFilter('ALL');
  };

  const handleConfirm = () => {
    const ordered: CandidateStructureItem[] = [];
    for (const code of selectedCodes) {
      const item = itemByCode.get(code.toUpperCase());
      if (item && canSelect(item.code)) {
        ordered.push(item);
      }
    }
    if (ordered.length === 0) return;
    onConfirm(ordered);
  };

  return (
    <div
      className="cfg-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Selecionar componentes da estrutura"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{CFG_STYLES}</style>
      <style>{`
        .bom-lk-toolbar { display: flex; flex-direction: column; gap: 10px; background: #fff; border: 1px solid #dbe8d5; border-radius: 10px; padding: 12px 14px; flex-shrink: 0; }
        .bom-lk-search-row { display: flex; align-items: center; gap: 8px; }
        .bom-lk-search-box { flex: 1; display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 11px; border: 1.5px solid #c8dfc2; border-radius: 8px; background: #f8fbf6; }
        .bom-lk-search-box:focus-within { border-color: #2f7d47; background: #fff; box-shadow: 0 0 0 2px rgba(47,125,71,0.12); }
        .bom-lk-search-input { flex: 1; border: none; outline: none; background: transparent; font-family: 'Inter', sans-serif; font-size: 13px; color: #1c2b22; }
        .bom-lk-chips { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
        .bom-lk-chip-group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .bom-lk-chip { height: 26px; padding: 0 10px; border-radius: 999px; border: 1px solid #cfe0cb; background: #f5faf3; color: #3d5244; font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 600; cursor: pointer; transition: background 0.12s, color 0.12s, border-color 0.12s; }
        .bom-lk-chip:hover { background: #e8f4e4; border-color: #2f7d47; }
        .bom-lk-chip.active { background: #2f7d47; border-color: #2f7d47; color: #fff; }
        .bom-lk-link { background: none; border: none; color: #2f7d47; font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 600; cursor: pointer; text-decoration: underline; padding: 2px 4px; }
        .bom-lk-link:disabled { opacity: 0.45; cursor: not-allowed; text-decoration: none; }
        .bom-lk-list-card { flex: 1; min-height: 260px; max-height: 54vh; background: #fff; border: 1px solid #dbe8d5; border-radius: 10px; overflow: auto; }
        .bom-lk-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .bom-lk-table thead th { position: sticky; top: 0; z-index: 2; background: #f4f9f2; color: #5b6e61; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 10px; text-align: left; border-bottom: 1.5px solid #dbe8d5; white-space: nowrap; }
        .bom-lk-table tbody tr { border-bottom: 1px solid #eff5ec; cursor: pointer; transition: background 0.1s; }
        .bom-lk-table tbody tr:hover:not(.disabled) { background: #f2faf0; }
        .bom-lk-table tbody tr.selected { background: #e3f4e6; }
        .bom-lk-table tbody tr.disabled { opacity: 0.55; cursor: not-allowed; background: #f9fbf9; }
        .bom-lk-table td { padding: 7px 10px; vertical-align: middle; }
        .bom-lk-code { display: inline-block; font-weight: 700; font-size: 11.5px; color: #16281d; background: #eef5ea; border: 1px solid #c8dfc2; border-radius: 5px; padding: 2px 7px; font-variant-numeric: tabular-nums; }
        .bom-lk-desc { font-weight: 500; color: #1c2b22; }
        .bom-lk-alias { display: block; font-size: 11px; color: #9a6a12; font-weight: 600; margin-top: 2px; }
        .bom-lk-badge { display: inline-flex; align-items: center; padding: 2px 7px; border-radius: 999px; font-size: 10.5px; font-weight: 600; border: 1px solid #d4e4d0; background: #f4f9f2; color: #36523f; white-space: nowrap; }
        .bom-lk-badge.ghost { background: #eef0f8; border-color: #ccd2e8; color: #3a3a8a; }
        .bom-lk-badge.warn { background: #fff4e0; border-color: #efd296; color: #8a5800; }
        .bom-lk-badge.block { background: #fdeaea; border-color: #f0c0c0; color: #8e2f2f; }
      `}</style>

      <div className="cfg-modal" style={{ width: 'min(920px, 96vw)' }}>
        <header className="cfg-head">
          <div>
            <div className="cfg-head-title">Pesquisar Itens para a Estrutura</div>
            <div className="cfg-head-sub">
              Item pai: {parentCode} · Marque um ou vários componentes para preencher automaticamente código, descrição e UM
            </div>
          </div>
          <button type="button" className="cfg-btn cfg-btn-ghost" onClick={onClose}>
            Fechar
          </button>
        </header>

        <div className="cfg-body" style={{ overflow: 'hidden' }}>
          <div className="bom-lk-toolbar">
            <div className="bom-lk-search-row">
              <div className="bom-lk-search-box">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: '#6b7d71', flexShrink: 0 }}>
                  <circle cx="6.8" cy="6.8" r="4.8" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  ref={searchInputRef}
                  className="bom-lk-search-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && selectedCodes.size > 0) {
                      e.preventDefault();
                      handleConfirm();
                    }
                  }}
                  placeholder="Buscar por código, descrição, código anterior, ref. fabricante, fornecedor ou GTIN…"
                />
                {query && (
                  <button
                    type="button"
                    className="bom-lk-link"
                    onClick={() => setQuery('')}
                    title="Limpar texto da busca"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            <div className="bom-lk-chips">
              <div className="bom-lk-chip-group">
                {(
                  [
                    ['ALL', 'Todos'],
                    ['COMPRADO', 'Comprados'],
                    ['FABRICADO', 'Fabricados'],
                    ['DE_TERCEIRO', 'De terceiro'],
                    ['FANTASMA', 'Fantasmas'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`bom-lk-chip${typeFilter === id ? ' active' : ''}`}
                    onClick={() => setTypeFilter(id)}
                  >
                    {label}
                  </button>
                ))}
                {selectedCodes.size > 0 && (
                  <button
                    type="button"
                    className={`bom-lk-chip${typeFilter === 'SELECTED' ? ' active' : ''}`}
                    onClick={() => setTypeFilter(typeFilter === 'SELECTED' ? 'ALL' : 'SELECTED')}
                  >
                    Marcados ({selectedCodes.size})
                  </button>
                )}
              </div>

              <div className="bom-lk-chip-group">
                <button
                  type="button"
                  className="bom-lk-link"
                  disabled={selectableVisible.length === 0}
                  onClick={handleSelectVisible}
                >
                  Marcar visíveis
                </button>
                {selectedCodes.size > 0 && (
                  <button type="button" className="bom-lk-link" onClick={handleClearSelection}>
                    Desmarcar todos
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bom-lk-list-card">
            {loading && <div className="cfg-note" style={{ margin: 14 }}>Carregando itens cadastrados…</div>}

            {!loading && error && (
              <div className="cfg-alert err" style={{ margin: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span>{error}</span>
                <button type="button" className="cfg-btn cfg-btn-sm" onClick={() => void load(true)}>
                  Tentar novamente
                </button>
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="cfg-empty" style={{ margin: 14 }}>
                {items.length === 0
                  ? 'Nenhum item ativo cadastrado nesta empresa.'
                  : 'Nenhum item encontrado para o filtro informado.'}
              </div>
            )}

            {!loading && !error && filtered.length > 0 && (
              <table className="bom-lk-table">
                <thead>
                  <tr>
                    <th style={{ width: 38, textAlign: 'center' }}>Sel.</th>
                    <th style={{ width: 130 }}>Código</th>
                    <th>Descrição</th>
                    <th style={{ width: 130 }}>Tipo</th>
                    <th style={{ width: 95 }}>UM Estoque</th>
                    <th style={{ width: 140 }}>Disponibilidade</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const forbidden = isForbidden(item.code);
                    const existing = isExisting(item.code);
                    const disabled = forbidden || existing;
                    const checked = selectedCodes.has(item.code);
                    const alias = apelidoEncontrado(item, query);

                    return (
                      <tr
                        key={item.code}
                        className={[checked ? 'selected' : '', disabled ? 'disabled' : ''].filter(Boolean).join(' ')}
                        onClick={() => toggleItem(item.code)}
                        onDoubleClick={() => {
                          if (!disabled && selectedCodes.size === 0) {
                            onConfirm([item]);
                          }
                        }}
                        title={
                          forbidden
                            ? 'Item pai ou nível superior — não pode entrar como componente de si mesmo'
                            : existing
                              ? 'Este item já está presente neste nível da estrutura'
                              : 'Clique para marcar/desmarcar (duplo clique inclui direto quando nenhum outro está marcado)'
                        }
                      >
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            className="fe-ck"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleItem(item.code)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td>
                          <span className="bom-lk-code">{item.code}</span>
                        </td>
                        <td>
                          <span className="bom-lk-desc">{item.description}</span>
                          {alias && <span className="bom-lk-alias">Achado pelo {alias}</span>}
                        </td>
                        <td>
                          {item.engType ? (
                            <span className="bom-lk-badge">{TYPE_LABELS[item.engType] ?? enumLabel(item.engType)}</span>
                          ) : (
                            <span style={{ color: '#94a49a' }}>—</span>
                          )}
                          {item.ghost && (
                            <span className="bom-lk-badge ghost" style={{ marginLeft: 4 }}>
                              Fantasma
                            </span>
                          )}
                        </td>
                        <td>{rotuloUM[item.uom] ?? enumLabel(item.uom)}</td>
                        <td>
                          {forbidden ? (
                            <span className="bom-lk-badge block">Item pai / nível superior</span>
                          ) : existing ? (
                            <span className="bom-lk-badge warn">Já na estrutura</span>
                          ) : (
                            <span className="bom-lk-badge">Disponível</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <footer className="cfg-foot">
          <span className="cfg-foot-hint">
            Exibindo {filtered.length} de {items.length} item(ns) ativo(s)
            {selectedCodes.size > 0 ? ` · ${selectedCodes.size} marcado(s) para inclusão` : ' · Dica: marque vários itens para incluí-los de uma só vez'}
          </span>
          <div className="cfg-foot-actions">
            <button type="button" className="cfg-btn" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="cfg-btn cfg-btn-primary"
              disabled={selectedCodes.size === 0}
              onClick={handleConfirm}
            >
              {selectedCodes.size <= 1
                ? 'Incluir item selecionado'
                : `Incluir ${selectedCodes.size} itens selecionados`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { LookupLoader, LookupOption } from "@/services/lookups";

interface LookupFieldProps<T extends string | number> {
  /** Código selecionado (ou undefined/0 = vazio). */
  value?: T;
  /** Disparado ao escolher/limpar. */
  onChange: (code: T | undefined, option?: LookupOption) => void;
  /** Fonte de dados (ex.: loadCustomers). */
  loader: LookupLoader;
  placeholder?: string;
  /** Nome da entidade para textos ("cliente", "item"…). */
  entityLabel?: string;
  disabled?: boolean;
  /** Permite limpar a seleção. */
  clearable?: boolean;
}

/**
 * Campo de seleção por lista pesquisável. Substitui "digite o ID de cor" por
 * "escolha da lista de registros cadastrados". Mostra `#código — rótulo`, abre
 * um popover com busca e resolve o rótulo do código atual automaticamente.
 */
export function LookupField<T extends string | number = number>({
  value, onChange, loader, placeholder = "Selecionar…", entityLabel = "registro", disabled = false, clearable = true,
}: LookupFieldProps<T>): JSX.Element {
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  const load = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true); setError(false);
    try { setOptions(await loader()); setLoaded(true); }
    catch { setError(true); }
    finally { setLoading(false); }
  }, [loader, loaded, loading]);

  // Resolve o rótulo do valor atual assim que a tela monta.
  useEffect(() => { void load(); }, [load]);

  // Fecha ao clicar fora / Esc.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!wrapRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const position = () => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const roomBelow = window.innerHeight - rect.bottom;
      const panelHeight = Math.min(340, Math.max(190, window.innerHeight * 0.55));
      const openAbove = roomBelow < 210 && rect.top > roomBelow;
      setPanelStyle({ position: "fixed", left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 300) - 8)), top: openAbove ? Math.max(8, rect.top - panelHeight - 4) : rect.bottom + 4, width: Math.max(rect.width, 300), maxHeight: panelHeight, zIndex: 20050 });
    };
    position();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); window.removeEventListener("resize", position); window.removeEventListener("scroll", position, true); };
  }, [open]);

  const selected = useMemo(() => options.find((o) => o.code === value), [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 200);
    return options
      .filter((o) => String(o.code).includes(q) || o.label.toLowerCase().includes(q) || (o.sub ?? "").toLowerCase().includes(q))
      .slice(0, 200);
  }, [options, query]);

  const manualCode = query.trim();
  const canUseManualCode = manualCode.length > 0
    && (typeof options[0]?.code !== "number" || /^\d+$/.test(manualCode))
    && !options.some((option) => String(option.code) === manualCode);

  const openPanel = () => {
    if (disabled) return;
    void load();
    setOpen(true); setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const choose = (o: LookupOption) => { onChange(o.code as T, o); setOpen(false); };
  const clear = (e: React.MouseEvent) => { e.stopPropagation(); onChange(undefined); };

  const display = selected
    ? `${selected.code} — ${selected.label}`
    : value
      ? `#${value}${loading ? " …" : ""}`
      : "";

  return (
    <div className="erp-lookup" ref={wrapRef}>
      <button type="button" className={`erp-lookup-control${open ? " open" : ""}`} onClick={openPanel} disabled={disabled} title={display || placeholder}>
        <span className={`erp-lookup-value${display ? "" : " placeholder"}`}>{display || placeholder}</span>
        {clearable && value ? (
          <span className="erp-lookup-clear" role="button" onClick={clear} title="Limpar">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </span>
        ) : (
          <svg className="erp-lookup-caret" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        )}
      </button>

      {open && createPortal(
        <div className="erp-lookup-panel" ref={panelRef} style={panelStyle}>
          <div className="erp-lookup-search">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.2" stroke="currentColor" strokeWidth="1.4"/><path d="M9.2 9.2L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Buscar ${entityLabel}…`} />
          </div>
          <div className="erp-lookup-list">
            {loading && <div className="erp-lookup-msg"><span className="erp-spin" /> Carregando…</div>}
            {!loading && error && <div className="erp-lookup-msg">Não foi possível carregar a lista.</div>}
            {!loading && !error && filtered.length === 0 && (
              <div className="erp-lookup-msg">{options.length === 0 ? `Nenhum ${entityLabel} cadastrado.` : "Nenhum resultado."}</div>
            )}
            {filtered.map((o) => (
              <button type="button" key={o.code} className={`erp-lookup-item${o.code === value ? " sel" : ""}`} onClick={() => choose(o)}>
                <span className="erp-lookup-item-code">{o.code}</span>
                <span className="erp-lookup-item-main">
                  <span className="erp-lookup-item-label">{o.label}</span>
                  {o.sub && <span className="erp-lookup-item-sub">{o.sub}</span>}
                </span>
              </button>
            ))}
            {!loading && !error && canUseManualCode && (
              <button type="button" className="erp-lookup-item" onClick={() => {
                const code = (typeof options[0]?.code === "number" ? Number(manualCode) : manualCode) as T;
                onChange(code); setOpen(false);
              }}>
                <span className="erp-lookup-item-code">{manualCode}</span>
                <span className="erp-lookup-item-main"><span className="erp-lookup-item-label">Usar este código informado manualmente</span></span>
              </button>
            )}
          </div>
          {options.length > 0 && <div className="erp-lookup-foot">{filtered.length} de {options.length} {entityLabel}(s)</div>}
        </div>, document.body
      )}
    </div>
  );
}

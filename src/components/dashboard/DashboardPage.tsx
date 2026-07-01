import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WindowControls } from "@/components/window/WindowControls";
import {
  ERP_SCREENS,
  MODULE_META,
  PARENT_CATEGORIES,
  PARENT_ORDER,
  type ErpModule,
  type ParentCategory,
  type ErpScreen,
} from "@/types/erpScreen";
import { openErpScreenWindow } from "@/utils/windowManager";
import { useAuthStore } from "@/store/authStore";

const MAX_RECENTS   = 5;
const MAX_FAVORITES = 8;
const LS_FAVORITES_KEY = "venture_erp_favorites";

function loadFavorites(): string[] {
  try { const raw = localStorage.getItem(LS_FAVORITES_KEY); return raw ? (JSON.parse(raw) as string[]) : []; }
  catch { return []; }
}
function saveFavorites(favs: string[]) { try { localStorage.setItem(LS_FAVORITES_KEY, JSON.stringify(favs)); } catch { /* noop */ } }

function useSessionTimer(startTime: number) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { const id = setInterval(() => setElapsed(Date.now() - startTime), 1000); return () => clearInterval(id); }, [startTime]);
  const s = Math.floor(elapsed / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}
function useLiveClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id); }, []);
  return time;
}

export function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const { userName, user, clearAuthData } = useAuthStore((s) => ({ userName: s.userName, user: s.user, clearAuthData: s.clearAuthData }));
  const [sessionStart]   = useState(() => Date.now());
  const sessionTime      = useSessionTimer(sessionStart);
  const clock            = useLiveClock();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType,    setFeedbackType]    = useState<"success" | "error">("success");
  const [isOpeningScreen, setIsOpeningScreen] = useState(false);
  const [activeScreen,    setActiveScreen]    = useState<string | null>(null);
  const [searchQuery,     setSearchQuery]     = useState("");
  const [recents,         setRecents]         = useState<string[]>([]);
  const [favorites,       setFavorites]       = useState<string[]>(loadFavorites);

  // All expanded state starts EMPTY → everything closed by default
  const [expandedParents, setExpandedParents] = useState<Set<ParentCategory>>(() => new Set());
  const [expandedModules, setExpandedModules] = useState<Set<ErpModule>>(() => new Set());

  const welcomeName  = useMemo(() => userName ?? user?.name ?? "Usuário", [user, userName]);
  const userRoleLabel = useMemo(() => user?.role ?? "Operador do sistema", [user]);
  const initials = useMemo(() => { const parts = (userName ?? "U").trim().split(" "); return parts.length >= 2 ? `${parts[0][0]}${parts[parts.length-1][0]}`.toUpperCase() : parts[0][0].toUpperCase(); }, [userName]);

  const groupedScreens = useMemo((): Record<ErpModule, ErpScreen[]> => {
    const g = {} as Record<ErpModule, ErpScreen[]>;
    for (const mod of PARENT_CATEGORIES.comercial_vendas.modules) g[mod] = [];
    for (const mod of PARENT_CATEGORIES.industrial_producao.modules) g[mod] = [];
    for (const mod of PARENT_CATEGORIES.administrativo_financeiro.modules) g[mod] = [];
    for (const s of ERP_SCREENS) g[s.module].push(s);
    return g;
  }, []);

  const filteredScreens = useMemo((): ErpScreen[] => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return ERP_SCREENS.filter(s => s.code.toLowerCase().includes(q) || s.title.toLowerCase().includes(q));
  }, [searchQuery]);

  function getNameByCode(code: string): string { return ERP_SCREENS.find(s => s.code === code)?.title ?? code; }

  function handleLogout() { clearAuthData(); navigate("/login", { replace: true }); }

  const toggleFavorite = useCallback((code: string) => {
    setFavorites(prev => {
      const next = prev.includes(code) ? prev.filter(c => c !== code) : prev.length < MAX_FAVORITES ? [...prev, code] : prev;
      saveFavorites(next); return next;
    });
  }, []);

  const toggleParent = useCallback((p: ParentCategory) => {
    setExpandedParents(prev => { const next = new Set(prev); next.has(p) ? next.delete(p) : next.add(p); return next; });
  }, []);

  const toggleModule = useCallback((mod: ErpModule) => {
    setExpandedModules(prev => { const next = new Set(prev); next.has(mod) ? next.delete(mod) : next.add(mod); return next; });
  }, []);

  async function handleOpenScreen(screenCode: string): Promise<void> {
    setFeedbackMessage(null); setActiveScreen(screenCode); setIsOpeningScreen(true);
    try {
      await openErpScreenWindow(screenCode);
      setRecents(prev => [screenCode, ...prev.filter(c => c !== screenCode)].slice(0, MAX_RECENTS));
      setFeedbackMessage(`Tela ${screenCode} aberta com sucesso.`); setFeedbackType("success");
    } catch (error) {
      setFeedbackMessage(`Erro: ${error instanceof Error ? error.message : "Falha ao abrir a tela."}`); setFeedbackType("error");
    } finally { setIsOpeningScreen(false); setActiveScreen(null); }
  }

  const clockStr  = clock.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
  const dateLabel = clock.toLocaleDateString("pt-BR", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  function renderScreenRow(screen: ErpScreen) {
    const { code, title } = screen;
    const isActive = activeScreen === code, isDisabled = isOpeningScreen && !isActive, isFav = favorites.includes(code);
    return (
      <div key={code} role="button" tabIndex={0}
        className={`si${isActive?' act':''}${isDisabled?' dis':''}`}
        onClick={() => handleOpenScreen(code)}
        onKeyDown={e => e.key==="Enter" && handleOpenScreen(code)}
        title={`${code} — ${title}`}>
        <span className="sc">{code}</span>
        <span className="sn">{title}</span>
        <button type="button" className={`fv${isFav?' on':''}`}
          onClick={e => { e.stopPropagation(); toggleFavorite(code); }}
          title={isFav?"Remover dos favoritos":"Fixar nos favoritos"}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill={isFav?"currentColor":"none"}>
            <path d="M8 1.5l1.8 3.6 4 .6-2.9 2.8.7 4L8 10.3l-3.6 1.9.7-4L2.2 5.7l4-.6L8 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg></button>
        {isActive ? <span className="spi"/> : <svg className="ar" width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5h9M8 3l3.5 3.5L8 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>);
  }

  return (<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      .r{min-height:100vh;display:grid;grid-template-rows:56px 1fr;grid-template-columns:300px 1fr;grid-template-areas:"t t" "s c";font-family:'Inter',sans-serif;background:#f0f4ee;color:#1a2e22}
      .t{grid-area:t;background:#162e20;display:flex;align-items:center;justify-content:space-between;padding:0 24px 0 20px;position:relative;z-index:10;border-bottom:1px solid rgba(62,150,84,.15)}
      .tl{display:flex;align-items:center;gap:12px}
      .lm{width:32px;height:32px;background:#3e9654;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
      .ln{font-size:14px;font-weight:600;color:#e0f0e3;line-height:1.15}.ls{display:block;font-size:10px;font-weight:400;color:#3d6b4d}
      .tc{position:absolute;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:16px;pointer-events:none}
      .clk{font-size:15px;font-weight:600;color:#c0e0c8;letter-spacing:1px;font-variant-numeric:tabular-nums}
      .d{font-size:11.5px;color:#3d6b4d;text-transform:capitalize}.sep{width:1px;height:18px;background:rgba(255,255,255,.08)}
      .tr{display:flex;align-items:center;gap:10px;-webkit-app-region:no-drag}
      .sbadge{display:flex;align-items:center;gap:5px;background:rgba(62,150,84,.1);border:1px solid rgba(62,150,84,.18);border-radius:6px;padding:4px 10px;font-size:11px;color:#5a9a6a;font-weight:500}
      .sd{width:5px;height:5px;background:#3e9654;border-radius:50%;flex-shrink:0}
      .ui{display:flex;flex-direction:column;align-items:flex-end}
      .un{font-size:13px;font-weight:500;color:#c0e0c8;line-height:1.2}.ur{font-size:10.5px;color:#3d6b4d}
      .av{width:32px;height:32px;background:rgba(62,150,84,.2);border:1.5px solid rgba(62,150,84,.35);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:600;color:#7ecb8f;flex-shrink:0}
      .lo{display:flex;align-items:center;gap:6px;background:transparent;border:1px solid rgba(255,255,255,.08);border-radius:7px;padding:6px 12px;font-family:'Inter',sans-serif;font-size:12px;font-weight:500;color:#5a8a68;cursor:pointer;transition:background .15s,color .15s}
      .lo:hover{background:rgba(224,82,82,.08);border-color:rgba(224,82,82,.2);color:#e07070}
      .hl{display:flex;align-items:center;justify-content:center;width:32px;height:30px;background:transparent;border:1px solid rgba(255,255,255,.08);border-radius:7px;font-family:'Inter',sans-serif;color:#5a8a68;cursor:pointer;transition:background .15s,color .15s}
      .hl:hover{background:rgba(62,150,84,.12);border-color:rgba(62,150,84,.35);color:#3e9654}
      .s{grid-area:s;background:#fff;border-right:1px solid #dbe8d5;display:flex;flex-direction:column;overflow:hidden}
      .stp{padding:14px 14px 10px;border-bottom:1px solid #edf5e8;flex-shrink:0}
      .sh{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#8ab09a;margin-bottom:10px}
      .sw{position:relative}
      .sico{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#a0c0a8;pointer-events:none}
      .sipt{width:100%;height:36px;background:#f5f9f3;border:1.5px solid #dbe8d5;border-radius:8px;padding:0 10px 0 34px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;transition:border-color .15s}
      .sipt::placeholder{color:#a0c0a8}.sipt:focus{border-color:#3e9654;box-shadow:0 0 0 3px rgba(62,150,84,.1)}
      .sm{display:flex;align-items:center;justify-content:space-between;margin-top:7px;padding:0 2px}
      .scnt{font-size:11px;color:#a0c0a8}.scl{font-size:11px;color:#7a9c84;background:none;border:none;cursor:pointer;padding:0;font-family:'Inter',sans-serif;font-weight:500}.scl:hover{color:#3e9654}
      .sl{flex:1;overflow-y:auto;padding:6px 8px 14px}
      .sl::-webkit-scrollbar{width:4px}.sl::-webkit-scrollbar-thumb{background:#cce0c8;border-radius:4px}

      /* Parent category */
      .pg{margin-bottom:2px}
      .ph{width:100%;display:flex;align-items:center;gap:8px;padding:8px 8px;border:none;border-radius:8px;background:transparent;cursor:pointer;text-align:left;font-family:'Inter',sans-serif;transition:background .12s}
      .ph:hover{background:#f4f9f2}
      .pi{color:#96b8a0;flex-shrink:0;display:flex}
      .pl{font-size:12px;font-weight:600;color:#3a5a45;flex:1;text-transform:uppercase;letter-spacing:.4px}
      .pcv{color:#a0c0a8;transition:transform .18s;flex-shrink:0}.pcv.exp{transform:rotate(90deg)}
      .pch{padding-left:8px;padding-bottom:2px}

      /* Module row */
      .mg{margin-bottom:1px}
      .mh{width:100%;display:flex;align-items:center;gap:7px;padding:7px 8px;border:none;border-radius:8px;background:transparent;cursor:pointer;text-align:left;font-family:'Inter',sans-serif;transition:background .12s}
      .mh:hover{background:#f4f9f2}
      .mi{color:#96b8a0;flex-shrink:0;display:flex}
      .ml{font-size:11.5px;font-weight:600;color:#4a7060;flex:1}.mc{font-size:10.5px;font-weight:600;color:#96b8a0;background:#edf5e8;border-radius:10px;padding:1px 7px}
      .mcv{color:#a0c0a8;transition:transform .18s;flex-shrink:0}.mcv.exp{transform:rotate(90deg)}
      .mch{padding-left:12px;padding-bottom:4px}

      /* Screen item */
      .si{display:flex;align-items:center;gap:8px;width:100%;padding:8px 8px;border-radius:8px;background:transparent;cursor:pointer;margin-bottom:1px;border:none;text-align:left;transition:background .1s}
      .si:hover{background:#edf7ea}.si:hover .ar{opacity:1;transform:translateX(2px)}.si:hover .fv{opacity:1}
      .si.act{background:#e2f2e4}.si.dis{opacity:.4;pointer-events:none}
      .sc{background:#edf5ea;border:1px solid #c8e0c0;border-radius:5px;padding:2px 6px;font-size:10.5px;font-weight:600;color:#2a7040;flex-shrink:0;white-space:nowrap;min-width:68px;text-align:center}
      .si.act .sc{background:#c8e8cc;border-color:#a0d0a8;color:#1a5028}
      .sn{font-size:12.5px;color:#243830;font-weight:400;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .si.act .sn{font-weight:500;color:#162e20}
      .fv{background:none;border:none;cursor:pointer;padding:3px;color:#c0d8c8;opacity:0;transition:opacity .12s,color .12s;display:flex;align-items:center;flex-shrink:0;border-radius:4px}
      .fv:hover{color:#f0a820}.fv.on{opacity:1!important;color:#e8a015}
      .ar{color:#b0d0b8;flex-shrink:0;opacity:0;transition:opacity .12s,transform .15s}
      .spi{width:13px;height:13px;border:2px solid rgba(62,150,84,.2);border-top-color:#3e9654;border-radius:50%;animation:spin .6s linear infinite;flex-shrink:0}
      .se{text-align:center;padding:24px 10px;font-size:13px;color:#a0c0a8;line-height:1.7}

      /* Content */
      .ct{grid-area:c;overflow-y:auto;padding:28px 32px;display:flex;flex-direction:column;gap:20px}
      .ct::-webkit-scrollbar{width:5px}.ct::-webkit-scrollbar-thumb{background:#cce0c8;border-radius:4px}
      .ey{font-size:10.5px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#3e9654;margin-bottom:4px}
      .ti{font-size:22px;font-weight:600;color:#162e20;letter-spacing:-.3px;line-height:1.25;margin-bottom:4px}.ti span{color:#3e9654}
      .su{font-size:13px;color:#6a8a74}

      /* Parent cards in content */
      .pcg{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
      .pcard{background:#fff;border:1px solid #dbe8d5;border-radius:12px;overflow:hidden}
      .pcdh{padding:12px 16px 10px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #edf5e8;background:#fafcf9}
      .pcdl{font-size:11.5px;font-weight:700;color:#2a4a35;text-transform:uppercase;letter-spacing:.4px;flex:1}
      .pcdc{font-size:10px;color:#96b8a0;font-weight:500}
      .pcdb{padding:10px 8px}
      .pcdi{display:flex;align-items:center;gap:8px;width:100%;padding:5px 6px;border:none;border-radius:7px;background:transparent;cursor:pointer;text-align:left;font-family:'Inter',sans-serif;transition:background .1s}
      .pcdi:hover{background:#f0f7ee}
      .pcdit{font-size:10px;font-weight:700;color:#5a8068;background:#edf5e8;border-radius:4px;padding:2px 5px;white-space:nowrap;flex-shrink:0}
      .pcdin{font-size:12px;color:#2a4030;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

      /* Module sub-cards inside parent */
      .msb{font-size:10.5px;font-weight:600;color:#7a9c84;text-transform:uppercase;letter-spacing:.4px;padding:8px 12px 4px;border-top:1px solid #edf5e8}
      .msi{display:flex;align-items:center;gap:7px;width:100%;padding:5px 8px 5px 16px;border:none;border-radius:7px;background:transparent;cursor:pointer;text-align:left;font-family:'Inter',sans-serif;transition:background .1s}
      .msi:hover{background:#f4f9f2}
      .msic{font-size:10px;font-weight:700;color:#5a8068;background:#eef5ea;border-radius:4px;padding:2px 5px;white-space:nowrap;flex-shrink:0}
      .msin{font-size:12px;color:#2a4030;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

      .mets{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .met{background:#fff;border:1px solid #dbe8d5;border-radius:12px;padding:16px 18px;position:relative;overflow:hidden;transition:border-color .15s,box-shadow .15s}
      .met:hover{border-color:#a8d0b0;box-shadow:0 2px 12px rgba(62,150,84,.07)}.met::after{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:#3e9654;opacity:.25;border-radius:12px 12px 0 0}.met.ac::after{opacity:1}
      .metic{width:30px;height:30px;background:#eef5ea;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:10px}
      .metl{font-size:10.5px;font-weight:600;color:#80a890;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
      .metv{font-size:26px;font-weight:600;color:#162e20;letter-spacing:-.5px;line-height:1;margin-bottom:3px}
      .metsu{font-size:11.5px;color:#9ab8a4}

      .card{background:#fff;border:1px solid #dbe8d5;border-radius:12px;padding:18px 20px}
      .cdh{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
      .cdt{font-size:12.5px;font-weight:600;color:#2a4030;text-transform:uppercase;letter-spacing:.5px}.cdc{font-size:11px;color:#a0b8a8}
      .fvg{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
      .ft{display:flex;flex-direction:column;align-items:flex-start;padding:11px;border-radius:9px;background:#f5f9f3;border:1.5px solid #dbe8d5;cursor:pointer;position:relative;transition:border-color .15s,background .15s;text-align:left}
      .ft:hover{border-color:#3e9654;background:#eef8ec;box-shadow:0 2px 8px rgba(62,150,84,.1)}.ft.load{opacity:.5;pointer-events:none}
      .ftc{font-size:11.5px;font-weight:700;color:#3e9654;margin-bottom:3px}.ftn{font-size:11px;color:#4a6a54;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .ftu{position:absolute;top:5px;right:5px;background:none;border:none;cursor:pointer;padding:2px;color:#c0d8c8;border-radius:4px;opacity:0;transition:opacity .12s,color .12s;display:flex}
      .ft:hover .ftu{opacity:1}.ftu:hover{color:#e05252}
      .fe{font-size:12.5px;color:#a0c0a8;padding:4px 2px;line-height:1.7}
      .rl{display:flex;flex-direction:column;gap:2px}
      .ri{display:flex;align-items:center;gap:10px;padding:8px 8px;border-radius:8px;background:transparent;border:none;cursor:pointer;text-align:left;width:100%;transition:background .1s;font-family:'Inter',sans-serif}
      .ri:hover{background:#edf7ea}.ri:hover .ra{opacity:1;transform:translateX(2px)}.ri:disabled{opacity:.5;pointer-events:none}
      .rc{font-size:11.5px;font-weight:600;color:#3e9654;min-width:70px;flex-shrink:0}.rn{font-size:13px;color:#2a4030;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ra{color:#b0d0b8;opacity:0;transition:opacity .12s,transform .15s;flex-shrink:0}.re{font-size:12.5px;color:#a0c0a8;padding:4px 2px}

      .fb{display:flex;align-items:center;gap:9px;padding:11px 14px;border-radius:9px;font-size:13px;animation:fade .18s ease}
      .fb.ok{background:#f0faf2;border:1px solid #b4dec0;color:#1e6030}.fb.er{background:#fff5f5;border:1px solid #f8c0c0;border-left:3px solid #e05252;color:#b91c1c}
      @keyframes fade{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      @keyframes spin{to{transform:rotate(360deg)}}
      .sp{width:14px;height:14px;border:2px solid rgba(223,240,226,.25);border-top-color:#dff0e2;border-radius:50%;animation:spin .65s linear infinite;flex-shrink:0}
    `}</style>

    <div className="r">
      <header className="t" onMouseDown={e => { if (!(e.target as HTMLElement).closest("button,input,a")) void getCurrentWindow().startDragging(); }}>
        <div className="tl">
          <div className="lm"><svg width="17" height="17" viewBox="0 0 18 18" fill="none"><rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,.9)"/><rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,.4)"/><rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,.4)"/><rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,.7)"/></svg></div>
          <span className="ln">Venture<span className="ls">ERP &amp; Soluções</span></span>
        </div>
        <div className="tc"><span className="clk">{clockStr}</span><div className="sep"/><span className="d">{dateLabel}</span></div>
        <div className="tr">
          <div className="sbadge"><span className="sd"/>Sessão: {sessionTime}</div>
          <div className="ui"><span className="un">{welcomeName}</span><span className="ur">{userRoleLabel}</span></div>
          <div className="av">{initials}</div>
          <button type="button" className="lo" onClick={handleLogout}><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>Sair</button>
          <button type="button" className="hl" onClick={() => { import("@tauri-apps/plugin-opener").then(m => m.openUrl("https://help.venturerp.com")); }} title="Ajuda"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M6.2 6a2 2 0 012.6-1.8 1.9 1.9 0 011 2.5c-.4.9-1.2 1.3-1.8 1.8M8 11.4h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
          <WindowControls />
        </div>
      </header>

      <aside className="s">
        <div className="stp">
          <div className="sh">Rotinas do sistema</div>
          <div className="sw">
            <span className="sico"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/><path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg></span>
            <input className="sipt" type="text" placeholder="Buscar código ou nome..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/>
          </div>
          {searchQuery.trim() && (
            <div className="sm">
              <span className="scnt">{filteredScreens.length} resultado{filteredScreens.length!==1?"s":""}</span>
              <button className="scl" onClick={() => setSearchQuery("")}>Limpar</button>
            </div>
          )}
        </div>

        <div className="sl">
          {searchQuery.trim() ? (
            filteredScreens.length === 0 ? <div className="se">Nenhuma rotina encontrada<br/>para "{searchQuery}".</div> : filteredScreens.map(s => renderScreenRow(s))
          ) : (
            PARENT_ORDER.map(parent => {
              const pmeta = PARENT_CATEGORIES[parent];
              if (!pmeta) return null;
              const parentScreens = pmeta.modules.flatMap(m => groupedScreens[m] || []);
              if (parentScreens.length === 0) return null;
              const pExpanded = expandedParents.has(parent);
              return (
                <div key={parent} className="pg">
                  <button type="button" className="ph" onClick={() => toggleParent(parent)}>
                    <span className="pi"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 2.5h3.8L6.5 4h4a1 1 0 011 1v3.5a1.2 1.2 0 01-1.2 1.2H1.5V2.5z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
                    <span className="pl">{pmeta.label}</span>
                    <svg className={`pcv${pExpanded?" exp":""}`} width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  {pExpanded && (
                    <div className="pch">
                      {pmeta.modules.map(mod => {
                        const screens = groupedScreens[mod];
                        if (!screens || screens.length === 0) return null;
                        const mExpanded = expandedModules.has(mod);
                        const meta = MODULE_META[mod];
                        return (
                          <div key={mod} className="mg">
                            <button type="button" className="mh" onClick={() => toggleModule(mod)}>
                              <span className="mi"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 2h3l1 1.5h4a.8.8 0 01.8.8v3.2a.8.8 0 01-.8.8H2V2z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
                              <span className="ml">{meta.label}</span>
                              <span className="mc">{screens.length}</span>
                              <svg className={`mcv${mExpanded?" exp":""}`} width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                            {mExpanded && <div className="mch">{screens.map(s => renderScreenRow(s))}</div>}
                          </div>
                        );})}
                    </div>
                  )}
                </div>
              );})
          )}
        </div>
      </aside>

      <main className="ct">
        <div>
          <p className="ey">Dashboard Operacional</p>
          <h1 className="ti">Bem-vindo, <span>{welcomeName}.</span></h1>
          <p className="su">Selecione uma rotina no menu lateral ou clique nos módulos abaixo.</p>
        </div>

        {/* Metrics */}
        <div className="mets">
          <div className="met ac">
            <div className="metic"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="#3e9654" strokeWidth="1.4"/><rect x="9.5" y="1" width="5.5" height="5.5" rx="1" stroke="#3e9654" strokeWidth="1.4"/><rect x="1" y="9.5" width="5.5" height="5.5" rx="1" stroke="#3e9654" strokeWidth="1.4"/><rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1" stroke="#3e9654" strokeWidth="1.4"/></svg></div>
            <div className="metl">Rotinas disponíveis</div>
            <div className="metv">{ERP_SCREENS.length}</div>
            <div className="metsu">{PARENT_ORDER.length} áreas | {Object.keys(MODULE_META).length} módulos</div>
          </div>
          <div className="met">
            <div className="metic"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 12l3-3 3 2.5 2.5-4L14 4" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
            <div className="metl">Acessos nesta sessão</div>
            <div className="metv">{recents.length}</div>
            <div className="metsu">{recents.length===0?"nenhuma rotina aberta":`última: ${recents[0]}`}</div>
          </div>
        </div>

        <div className="card">
          <div className="cdh"><span className="cdt"><svg width="13" height="13" viewBox="0 0 16 16" fill="#e8a015" style={{marginRight:6,verticalAlign:-1}}><path d="M8 1.5l1.8 3.6 4 .6-2.9 2.8.7 4L8 10.3l-3.6 1.9.7-4L2.2 5.7l4-.6L8 1.5z" stroke="#e8a015" strokeWidth="1.2" strokeLinejoin="round"/></svg>Favoritos</span><span className="cdc">{favorites.length}/{MAX_FAVORITES} — clique ★ no menu para fixar</span></div>
          {favorites.length===0 ? <div className="fe">Nenhum favorito ainda. Passe o mouse sobre uma rotina no menu lateral e clique na estrela para fixar aqui.</div> : (
            <div className="fvg">
              {favorites.map(code => { const name = getNameByCode(code); const isActive = activeScreen===code;
                return (<div key={code} className={`ft${isActive?" load":""}`} onClick={() => handleOpenScreen(code)} role="button" tabIndex={0} onKeyDown={e=>e.key==="Enter"&&handleOpenScreen(code)} title={`${code} — ${name}`}>
                  <button type="button" className="ftu" onClick={e=>{e.stopPropagation();toggleFavorite(code)}} title="Remover dos favoritos"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg></button>
                  {isActive ? <div className="spi" style={{marginBottom:6}}/> : <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{marginBottom:6,color:"#3e9654"}}><rect x="1" y="4" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 4V3a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
                  <span className="ftc">{code}</span><span className="ftn">{name}</span>
                </div>);})}
            </div>)}
        </div>

        <div className="card">
          <div className="cdh"><span className="cdt"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{marginRight:6,verticalAlign:-1}}><circle cx="8" cy="8" r="6" stroke="#3e9654" strokeWidth="1.4"/><path d="M8 5v3.2l2.2 2" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round"/></svg>Recentes</span><span className="cdc">esta sessão</span></div>
          {recents.length===0 ? <div className="re">Nenhuma rotina aberta ainda nesta sessão.</div> : (
            <div className="rl">
              {recents.map(code => { const name = getNameByCode(code); const isActive = activeScreen===code;
                return (<button key={code} type="button" className="ri" onClick={()=>handleOpenScreen(code)} disabled={isOpeningScreen}>
                  <span className="rc">{code}</span><span className="rn">{name}</span>
                  {isActive ? <span className="spi"/> : <svg className="ra" width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5h9M8 3l3.5 3.5L8 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>);})}
            </div>)}
        </div>

        {feedbackMessage && (
          <div className={`fb ${feedbackType==="success"?"ok":"er"}`}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              {feedbackType==="success" ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              : <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4"/><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round"/></>}
            </svg>
            {feedbackMessage}
          </div>
        )}
      </main>
    </div>
  </>);
}

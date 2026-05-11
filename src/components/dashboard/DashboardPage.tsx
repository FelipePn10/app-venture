import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WindowControls } from "@/components/window/WindowControls";
import {
  ERP_SCREENS,
  MODULE_META,
  MODULE_ORDER,
  type ErpModule,
  type ErpScreen,
} from "@/types/erpScreen";
import { openErpScreenWindow } from "@/utils/windowManager";
import { useAuthStore } from "@/store/authStore";

const MAX_RECENTS   = 6;
const MAX_FAVORITES = 8;
const LS_FAVORITES_KEY = "venture_erp_favorites";

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(LS_FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

function saveFavorites(favs: string[]) {
  try { localStorage.setItem(LS_FAVORITES_KEY, JSON.stringify(favs)); } catch { /* noop */ }
}

function useSessionTimer(startTime: number) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(id);
  }, [startTime]);
  const s = Math.floor(elapsed / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}

function useLiveClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

// ─── Module SVG icons ─────────────────────────────────────────────────────────

function ModuleIcon({ mod, size = 16 }: { mod: ErpModule; size?: number }) {
  const color = MODULE_META[mod].color;
  const s = size;
  switch (mod) {
    case "comercial":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12l-1.5 7H3.5L2 4z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
          <circle cx="5.5" cy="13" r="1" fill={color} />
          <circle cx="11" cy="13" r="1" fill={color} />
          <path d="M1 2h2l.5 2" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    case "financeiro":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke={color} strokeWidth="1.3" />
          <path d="M8 6v4M6.5 7.5C6.5 6.7 7.2 6 8 6s1.5.7 1.5 1.5S8.8 9 8 9s-1.5.7-1.5 1.5S7.2 12 8 12" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "contabilidade":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <rect x="2" y="1.5" width="12" height="13" rx="1.5" stroke={color} strokeWidth="1.3" />
          <path d="M5 5h6M5 8h6M5 11h4" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "engenharia":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="2.5" stroke={color} strokeWidth="1.3" />
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    case "almoxarifado":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <path d="M1 6l7-4 7 4v8H1V6z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
          <rect x="5.5" y="9" width="5" height="5" rx="0.5" stroke={color} strokeWidth="1.2" />
          <path d="M8 9v5" stroke={color} strokeWidth="1.2" />
        </svg>
      );
    case "planejamento":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke={color} strokeWidth="1.3" />
          <path d="M5 2v2M11 2v2" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
          <path d="M1.5 6.5h13" stroke={color} strokeWidth="1.2" />
          <path d="M4.5 10l2 1.5 4-3" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const { userName, user, clearAuthData } = useAuthStore((s) => ({
    userName: s.userName,
    user: s.user,
    clearAuthData: s.clearAuthData,
  }));

  const [sessionStart]   = useState(() => Date.now());
  const sessionTime       = useSessionTimer(sessionStart);
  const clock             = useLiveClock();

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType,    setFeedbackType]    = useState<"success" | "error">("success");
  const [isOpeningScreen, setIsOpeningScreen] = useState(false);
  const [activeScreen,    setActiveScreen]    = useState<string | null>(null);
  const [searchQuery,     setSearchQuery]     = useState("");
  const [recents,         setRecents]         = useState<string[]>([]);
  const [favorites,       setFavorites]       = useState<string[]>(loadFavorites);
  const [expandedModules, setExpandedModules] = useState<Set<ErpModule>>(
    () => new Set(MODULE_ORDER),  // all expanded by default
  );

  const welcomeName  = useMemo(() => userName ?? user?.name ?? "Usuário", [user, userName]);
  const userRoleLabel = useMemo(() => user?.role ?? "Operador do sistema", [user]);
  const initials = useMemo(() => {
    const parts = (userName ?? "U").trim().split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : parts[0][0].toUpperCase();
  }, [userName]);

  // Screens grouped by module (stable reference)
  const groupedScreens = useMemo((): Record<ErpModule, ErpScreen[]> => {
    const g = {} as Record<ErpModule, ErpScreen[]>;
    for (const mod of MODULE_ORDER) g[mod] = [];
    for (const s of ERP_SCREENS) g[s.module].push(s);
    return g;
  }, []);

  // Flat filtered screens for search
  const filteredScreens = useMemo((): ErpScreen[] => {
    if (!searchQuery.trim()) return ERP_SCREENS;
    const q = searchQuery.toLowerCase();
    return ERP_SCREENS.filter(
      (s) => s.code.toLowerCase().includes(q) || s.title.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  function getNameByCode(code: string): string {
    return ERP_SCREENS.find((s) => s.code === code)?.title ?? code;
  }

  function handleLogout() {
    clearAuthData();
    navigate("/login", { replace: true });
  }

  const toggleFavorite = useCallback((code: string) => {
    setFavorites((prev) => {
      const next = prev.includes(code)
        ? prev.filter((c) => c !== code)
        : prev.length < MAX_FAVORITES ? [...prev, code] : prev;
      saveFavorites(next);
      return next;
    });
  }, []);

  const toggleModule = useCallback((mod: ErpModule) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      next.has(mod) ? next.delete(mod) : next.add(mod);
      return next;
    });
  }, []);

  async function handleOpenScreen(screenCode: string): Promise<void> {
    setFeedbackMessage(null);
    setActiveScreen(screenCode);
    setIsOpeningScreen(true);
    try {
      await openErpScreenWindow(screenCode);
      setRecents((prev) => [screenCode, ...prev.filter((c) => c !== screenCode)].slice(0, MAX_RECENTS));
      setFeedbackMessage(`Tela ${screenCode} aberta com sucesso.`);
      setFeedbackType("success");
    } catch (error) {
      setFeedbackMessage(`Erro: ${error instanceof Error ? error.message : "Falha ao abrir a tela."}`);
      setFeedbackType("error");
    } finally {
      setIsOpeningScreen(false);
      setActiveScreen(null);
    }
  }

  const clockStr  = clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateLabel = clock.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // ── Render a single screen row (reused in sidebar + search results)
  function renderScreenRow(screen: ErpScreen) {
    const { code, title } = screen;
    const isActive   = activeScreen === code;
    const isDisabled = isOpeningScreen && !isActive;
    const isFav      = favorites.includes(code);
    return (
      <div
        key={code}
        role="button"
        tabIndex={0}
        className={`dp-screen-item${isActive ? " is-active" : ""}${isDisabled ? " is-disabled" : ""}`}
        onClick={() => handleOpenScreen(code)}
        onKeyDown={(e) => e.key === "Enter" && handleOpenScreen(code)}
        title={`${code} — ${title}`}
      >
        <span className="dp-screen-code-tag">{code}</span>
        <span className="dp-screen-name">{title}</span>
        <button
          type="button"
          className={`dp-fav-btn${isFav ? " is-fav" : ""}`}
          onClick={(e) => { e.stopPropagation(); toggleFavorite(code); }}
          title={isFav ? "Remover dos favoritos" : "Fixar nos favoritos"}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill={isFav ? "currentColor" : "none"}>
            <path d="M8 1.5l1.8 3.6 4 .6-2.9 2.8.7 4L8 10.3l-3.6 1.9.7-4L2.2 5.7l4-.6L8 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
        </button>
        {isActive
          ? <span className="dp-mini-spinner" />
          : <svg className="dp-screen-arrow" width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 6.5h9M8 3l3.5 3.5L8 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        }
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .dp-root {
          min-height: 100vh;
          display: grid;
          grid-template-rows: 56px 1fr;
          grid-template-columns: 300px 1fr;
          grid-template-areas: "topbar topbar" "sidebar content";
          font-family: 'Inter', sans-serif;
          background: #f0f4ee; color: #1a2e22;
        }

        /* ── TOPBAR ── */
        .dp-topbar {
          grid-area: topbar; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px 0 20px; position: relative; z-index: 10;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .dp-topbar-left { display: flex; align-items: center; gap: 12px; }
        .dp-logo-mark {
          width: 32px; height: 32px; background: #3e9654;
          border-radius: 7px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .dp-logo-name { font-size: 14px; font-weight: 600; color: #e0f0e3; line-height: 1.15; }
        .dp-logo-sub  { display: block; font-size: 10px; font-weight: 400; color: #3d6b4d; }
        .dp-topbar-center {
          position: absolute; left: 50%; transform: translateX(-50%);
          display: flex; align-items: center; gap: 16px; pointer-events: none;
        }
        .dp-clock { font-size: 15px; font-weight: 600; color: #c0e0c8; letter-spacing: 1px; font-variant-numeric: tabular-nums; }
        .dp-date  { font-size: 11.5px; color: #3d6b4d; text-transform: capitalize; }
        .dp-topbar-sep { width: 1px; height: 18px; background: rgba(255,255,255,0.08); }
        .dp-topbar-right { display: flex; align-items: center; gap: 10px; -webkit-app-region: no-drag; }
        .dp-session-badge {
          display: flex; align-items: center; gap: 5px;
          background: rgba(62,150,84,0.1); border: 1px solid rgba(62,150,84,0.18);
          border-radius: 6px; padding: 4px 10px;
          font-size: 11px; color: #5a9a6a; font-weight: 500;
        }
        .dp-session-dot { width: 5px; height: 5px; background: #3e9654; border-radius: 50%; flex-shrink: 0; }
        .dp-user-info { display: flex; flex-direction: column; align-items: flex-end; }
        .dp-user-name { font-size: 13px; font-weight: 500; color: #c0e0c8; line-height: 1.2; }
        .dp-user-role { font-size: 10.5px; color: #3d6b4d; }
        .dp-avatar {
          width: 32px; height: 32px;
          background: rgba(62,150,84,0.2); border: 1.5px solid rgba(62,150,84,0.35);
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: 11.5px; font-weight: 600; color: #7ecb8f; flex-shrink: 0;
        }
        .dp-logout-btn {
          display: flex; align-items: center; gap: 6px;
          background: transparent; border: 1px solid rgba(255,255,255,0.08);
          border-radius: 7px; padding: 6px 12px;
          font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 500;
          color: #5a8a68; cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .dp-logout-btn:hover { background: rgba(224,82,82,0.08); border-color: rgba(224,82,82,0.2); color: #e07070; }

        /* ── SIDEBAR ── */
        .dp-sidebar {
          grid-area: sidebar; background: #fff;
          border-right: 1px solid #dbe8d5;
          display: flex; flex-direction: column; overflow: hidden;
        }
        .dp-sidebar-top {
          padding: 14px 14px 10px; border-bottom: 1px solid #edf5e8; flex-shrink: 0;
        }
        .dp-sidebar-heading {
          font-size: 10px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: #8ab09a; margin-bottom: 10px;
        }
        .dp-search-wrap { position: relative; }
        .dp-search-icon {
          position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
          color: #a0c0a8; pointer-events: none;
        }
        .dp-search {
          width: 100%; height: 36px; background: #f5f9f3;
          border: 1.5px solid #dbe8d5; border-radius: 8px;
          padding: 0 10px 0 34px;
          font-family: 'Inter', sans-serif; font-size: 13px; color: #1a2e22;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .dp-search::placeholder { color: #a0c0a8; }
        .dp-search:focus { border-color: #3e9654; box-shadow: 0 0 0 3px rgba(62,150,84,0.1); }
        .dp-search-meta {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: 7px; padding: 0 2px;
        }
        .dp-search-count { font-size: 11px; color: #a0c0a8; }
        .dp-search-clear {
          font-size: 11px; color: #7a9c84; background: none;
          border: none; cursor: pointer; padding: 0;
          font-family: 'Inter', sans-serif; font-weight: 500;
        }
        .dp-search-clear:hover { color: #3e9654; }

        /* Screen list scroll area */
        .dp-screen-list { flex: 1; overflow-y: auto; padding: 6px 8px 14px; }
        .dp-screen-list::-webkit-scrollbar { width: 4px; }
        .dp-screen-list::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        /* ── MODULE GROUP ── */
        .dp-group { margin-bottom: 2px; }
        .dp-group-header {
          width: 100%; display: flex; align-items: center; gap: 7px;
          padding: 7px 8px; border: none; border-radius: 8px;
          background: transparent; cursor: pointer; text-align: left;
          transition: background 0.12s;
          font-family: 'Inter', sans-serif;
        }
        .dp-group-header:hover { background: #f4f9f2; }
        .dp-group-accent {
          width: 3px; height: 14px; border-radius: 2px; flex-shrink: 0;
        }
        .dp-group-label {
          font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
          text-transform: uppercase; color: #3a5a45; flex: 1;
        }
        .dp-group-count {
          font-size: 10.5px; font-weight: 600; color: #96b8a0;
          background: #edf5e8; border-radius: 10px; padding: 1px 7px;
        }
        .dp-group-chevron {
          color: #a0c0a8; transition: transform 0.18s; flex-shrink: 0;
        }
        .dp-group-chevron.expanded { transform: rotate(90deg); }
        .dp-group-screens { padding-left: 6px; padding-bottom: 4px; }

        /* ── SCREEN ITEM ── */
        .dp-screen-item {
          display: flex; align-items: center; gap: 8px;
          width: 100%; padding: 8px 8px; border-radius: 8px;
          background: transparent; cursor: pointer; margin-bottom: 1px;
          border: none; text-align: left; transition: background 0.1s;
        }
        .dp-screen-item:hover { background: #edf7ea; }
        .dp-screen-item:hover .dp-screen-arrow { opacity: 1; transform: translateX(2px); }
        .dp-screen-item:hover .dp-fav-btn { opacity: 1; }
        .dp-screen-item.is-active { background: #e2f2e4; }
        .dp-screen-item.is-disabled { opacity: 0.4; pointer-events: none; }
        .dp-screen-code-tag {
          background: #edf5ea; border: 1px solid #c8e0c0;
          border-radius: 5px; padding: 2px 6px;
          font-size: 10.5px; font-weight: 600; color: #2a7040;
          flex-shrink: 0; white-space: nowrap;
          min-width: 68px; text-align: center;
        }
        .dp-screen-item.is-active .dp-screen-code-tag { background: #c8e8cc; border-color: #a0d0a8; color: #1a5028; }
        .dp-screen-name {
          font-size: 12.5px; color: #243830; font-weight: 400;
          flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dp-screen-item.is-active .dp-screen-name { font-weight: 500; color: #162e20; }
        .dp-fav-btn {
          background: none; border: none; cursor: pointer; padding: 3px;
          color: #c0d8c8; opacity: 0; transition: opacity 0.12s, color 0.12s;
          display: flex; align-items: center; flex-shrink: 0; border-radius: 4px;
        }
        .dp-fav-btn:hover { color: #f0a820; }
        .dp-fav-btn.is-fav { opacity: 1 !important; color: #e8a015; }
        .dp-screen-arrow {
          color: #b0d0b8; flex-shrink: 0; opacity: 0;
          transition: opacity 0.12s, transform 0.15s;
        }
        .dp-mini-spinner {
          width: 13px; height: 13px;
          border: 2px solid rgba(62,150,84,0.2); border-top-color: #3e9654;
          border-radius: 50%; animation: spin 0.6s linear infinite; flex-shrink: 0;
        }
        .dp-screen-empty { padding: 24px 10px; text-align: center; font-size: 13px; color: #a0c0a8; line-height: 1.7; }

        /* ── CONTENT ── */
        .dp-content {
          grid-area: content; overflow-y: auto;
          padding: 28px 32px; display: flex; flex-direction: column; gap: 20px;
        }
        .dp-content::-webkit-scrollbar { width: 5px; }
        .dp-content::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .dp-page-eyebrow { font-size: 10.5px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: #3e9654; margin-bottom: 4px; }
        .dp-page-title   { font-size: 22px; font-weight: 600; color: #162e20; letter-spacing: -0.3px; line-height: 1.25; margin-bottom: 4px; }
        .dp-page-title span { color: #3e9654; }
        .dp-page-subtitle { font-size: 13px; color: #6a8a74; }

        /* ── MODULE OVERVIEW GRID ── */
        .dp-module-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }
        .dp-module-card {
          background: #fff; border: 1px solid #dbe8d5; border-radius: 12px;
          overflow: hidden; border-top-width: 3px;
          transition: box-shadow 0.15s, border-color 0.15s;
        }
        .dp-module-card:hover { box-shadow: 0 3px 14px rgba(0,0,0,0.07); }
        .dp-module-card-head {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 14px 10px;
        }
        .dp-module-card-label {
          font-size: 11.5px; font-weight: 700; letter-spacing: 0.4px;
          text-transform: uppercase; flex: 1;
        }
        .dp-module-card-count {
          font-size: 10.5px; color: #96b8a0; font-weight: 500;
        }
        .dp-module-card-screens { padding: 0 8px 10px; }
        .dp-module-screen-btn {
          display: flex; align-items: center; gap: 7px;
          width: 100%; padding: 6px 6px; border: none; border-radius: 7px;
          background: transparent; cursor: pointer; text-align: left;
          transition: background 0.1s; font-family: 'Inter', sans-serif;
        }
        .dp-module-screen-btn:hover { background: #f0f7ee; }
        .dp-module-screen-code {
          font-size: 10px; font-weight: 700; color: #5a8068;
          background: #edf5e8; border-radius: 4px; padding: 2px 5px;
          white-space: nowrap; flex-shrink: 0;
        }
        .dp-module-screen-name {
          font-size: 12px; color: #2a4030;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* ── METRICS ── */
        .dp-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .dp-metric {
          background: #fff; border: 1px solid #dbe8d5; border-radius: 12px;
          padding: 16px 18px; position: relative; overflow: hidden;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .dp-metric:hover { border-color: #a8d0b0; box-shadow: 0 2px 12px rgba(62,150,84,0.07); }
        .dp-metric::after {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 3px; border-radius: 12px 12px 0 0;
          background: #3e9654; opacity: 0.25;
        }
        .dp-metric.dp-accent::after { opacity: 1; }
        .dp-metric-icon { width: 30px; height: 30px; background: #eef5ea; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
        .dp-metric-label { font-size: 10.5px; font-weight: 600; color: #80a890; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .dp-metric-value { font-size: 26px; font-weight: 600; color: #162e20; letter-spacing: -0.5px; line-height: 1; margin-bottom: 3px; }
        .dp-metric-sub   { font-size: 11.5px; color: #9ab8a4; }

        /* ── CARDS ── */
        .dp-card { background: #fff; border: 1px solid #dbe8d5; border-radius: 12px; padding: 18px 20px; }
        .dp-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .dp-card-title { font-size: 12.5px; font-weight: 600; color: #2a4030; text-transform: uppercase; letter-spacing: 0.5px; }
        .dp-card-count { font-size: 11px; color: #a0b8a8; }

        /* Favorites */
        .dp-fav-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .dp-fav-tile {
          display: flex; flex-direction: column; align-items: flex-start;
          padding: 11px 11px; border-radius: 9px;
          background: #f5f9f3; border: 1.5px solid #dbe8d5;
          cursor: pointer; position: relative;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.12s;
          text-align: left;
        }
        .dp-fav-tile:hover { border-color: #3e9654; background: #eef8ec; box-shadow: 0 2px 8px rgba(62,150,84,0.1); }
        .dp-fav-tile.is-loading { opacity: 0.5; pointer-events: none; }
        .dp-fav-code { font-size: 11.5px; font-weight: 700; color: #3e9654; margin-bottom: 3px; }
        .dp-fav-name { font-size: 11px; color: #4a6a54; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .dp-fav-unpin {
          position: absolute; top: 5px; right: 5px;
          background: none; border: none; cursor: pointer; padding: 2px;
          color: #c0d8c8; border-radius: 4px; opacity: 0;
          transition: opacity 0.12s, color 0.12s; display: flex; align-items: center;
        }
        .dp-fav-tile:hover .dp-fav-unpin { opacity: 1; }
        .dp-fav-unpin:hover { color: #e05252; }
        .dp-fav-empty { font-size: 12.5px; color: #a0c0a8; padding: 4px 2px; line-height: 1.7; }

        /* Recents */
        .dp-recents-list { display: flex; flex-direction: column; gap: 2px; }
        .dp-recent-item {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 8px; border-radius: 8px;
          background: transparent; border: none; cursor: pointer;
          text-align: left; width: 100%; transition: background 0.1s;
          font-family: 'Inter', sans-serif;
        }
        .dp-recent-item:hover { background: #edf7ea; }
        .dp-recent-item:hover .dp-recent-arrow { opacity: 1; transform: translateX(2px); }
        .dp-recent-item:disabled { opacity: 0.5; pointer-events: none; }
        .dp-recent-code { font-size: 11.5px; font-weight: 600; color: #3e9654; min-width: 70px; flex-shrink: 0; }
        .dp-recent-name { font-size: 13px; color: #2a4030; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dp-recent-arrow { color: #b0d0b8; opacity: 0; transition: opacity 0.12s, transform 0.15s; flex-shrink: 0; }
        .dp-recents-empty { font-size: 12.5px; color: #a0c0a8; padding: 4px 2px; }

        /* Feedback */
        .dp-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 14px;
          border-radius: 9px; font-size: 13px; animation: fadeIn 0.18s ease;
        }
        .dp-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .dp-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        .dp-spinner { width: 14px; height: 14px; border: 2px solid rgba(223,240,226,0.25); border-top-color: #dff0e2; border-radius: 50%; animation: spin 0.65s linear infinite; flex-shrink: 0; }
      `}</style>

      <div className="dp-root">

        {/* ── TOPBAR — também é a barra de título da janela ── */}
        <header
          className="dp-topbar"
          onMouseDown={(e) => {
            if (!(e.target as HTMLElement).closest("button, input, a")) {
              void getCurrentWindow().startDragging();
            }
          }}
        >
          <div className="dp-topbar-left">
            <div className="dp-logo-mark">
              <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5"   width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5"  width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5"  width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="dp-logo-name">Venture<span className="dp-logo-sub">ERP &amp; Soluções</span></span>
          </div>

          <div className="dp-topbar-center">
            <span className="dp-clock">{clockStr}</span>
            <div className="dp-topbar-sep" />
            <span className="dp-date">{dateLabel}</span>
          </div>

          <div className="dp-topbar-right">
            <div className="dp-session-badge">
              <span className="dp-session-dot" />
              Sessão: {sessionTime}
            </div>
            <div className="dp-user-info">
              <span className="dp-user-name">{welcomeName}</span>
              <span className="dp-user-role">{userRoleLabel}</span>
            </div>
            <div className="dp-avatar">{initials}</div>
            <button type="button" className="dp-logout-btn" onClick={handleLogout}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Sair
            </button>
            <WindowControls />
          </div>
        </header>

        {/* ── SIDEBAR ── */}
        <aside className="dp-sidebar">
          <div className="dp-sidebar-top">
            <div className="dp-sidebar-heading">Rotinas do sistema</div>
            <div className="dp-search-wrap">
              <span className="dp-search-icon">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
              <input
                className="dp-search"
                type="text"
                placeholder="Buscar código ou nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {searchQuery.trim() && (
              <div className="dp-search-meta">
                <span className="dp-search-count">{filteredScreens.length} resultado{filteredScreens.length !== 1 ? "s" : ""}</span>
                <button className="dp-search-clear" onClick={() => setSearchQuery("")}>Limpar</button>
              </div>
            )}
          </div>

          <div className="dp-screen-list">
            {searchQuery.trim() ? (
              /* ── SEARCH RESULTS (flat) ── */
              filteredScreens.length === 0 ? (
                <div className="dp-screen-empty">
                  Nenhuma rotina encontrada<br />para "{searchQuery}".
                </div>
              ) : (
                filteredScreens.map((s) => renderScreenRow(s))
              )
            ) : (
              /* ── GROUPED BY MODULE ── */
              MODULE_ORDER.map((mod) => {
                const screens = groupedScreens[mod];
                if (!screens || screens.length === 0) return null;
                const meta      = MODULE_META[mod];
                const isExpanded = expandedModules.has(mod);
                return (
                  <div key={mod} className="dp-group">
                    <button
                      type="button"
                      className="dp-group-header"
                      onClick={() => toggleModule(mod)}
                    >
                      <span className="dp-group-accent" style={{ background: meta.color }} />
                      <ModuleIcon mod={mod} size={13} />
                      <span className="dp-group-label" style={{ color: meta.color }}>{meta.label}</span>
                      <span className="dp-group-count">{screens.length}</span>
                      <svg
                        className={`dp-group-chevron${isExpanded ? " expanded" : ""}`}
                        width="11" height="11" viewBox="0 0 12 12" fill="none"
                      >
                        <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="dp-group-screens">
                        {screens.map((s) => renderScreenRow(s))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ── CONTENT ── */}
        <main className="dp-content">
          <div>
            <p className="dp-page-eyebrow">Dashboard Operacional</p>
            <h1 className="dp-page-title">Bem-vindo, <span>{welcomeName}.</span></h1>
            <p className="dp-page-subtitle">Selecione uma rotina no menu lateral ou clique diretamente nos módulos abaixo.</p>
          </div>

          {/* ── MODULE OVERVIEW ── */}
          <div className="dp-module-grid">
            {MODULE_ORDER.map((mod) => {
              const screens = groupedScreens[mod];
              if (!screens || screens.length === 0) return null;
              const meta = MODULE_META[mod];
              return (
                <div
                  key={mod}
                  className="dp-module-card"
                  style={{ borderTopColor: meta.color }}
                >
                  <div className="dp-module-card-head">
                    <ModuleIcon mod={mod} size={16} />
                    <span className="dp-module-card-label" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                    <span className="dp-module-card-count">
                      {screens.length} tela{screens.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="dp-module-card-screens">
                    {screens.map((s) => (
                      <button
                        key={s.code}
                        type="button"
                        className="dp-module-screen-btn"
                        onClick={() => handleOpenScreen(s.code)}
                        disabled={isOpeningScreen}
                        title={s.description}
                      >
                        <span className="dp-module-screen-code">{s.code}</span>
                        <span className="dp-module-screen-name">{s.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── METRICS ── */}
          <div className="dp-metrics">
            <div className="dp-metric dp-accent">
              <div className="dp-metric-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="#3e9654" strokeWidth="1.4" />
                  <rect x="9.5" y="1" width="5.5" height="5.5" rx="1" stroke="#3e9654" strokeWidth="1.4" />
                  <rect x="1" y="9.5" width="5.5" height="5.5" rx="1" stroke="#3e9654" strokeWidth="1.4" />
                  <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1" stroke="#3e9654" strokeWidth="1.4" />
                </svg>
              </div>
              <div className="dp-metric-label">Rotinas disponíveis</div>
              <div className="dp-metric-value">{ERP_SCREENS.length}</div>
              <div className="dp-metric-sub">{MODULE_ORDER.length} módulos ativos</div>
            </div>
            <div className="dp-metric">
              <div className="dp-metric-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 12l3-3 3 2.5 2.5-4L14 4" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="dp-metric-label">Acessos nesta sessão</div>
              <div className="dp-metric-value">{recents.length}</div>
              <div className="dp-metric-sub">{recents.length === 0 ? "nenhuma rotina aberta" : `última: ${recents[0]}`}</div>
            </div>
          </div>

          {/* ── FAVORITES ── */}
          <div className="dp-card">
            <div className="dp-card-head">
              <span className="dp-card-title">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="#e8a015" style={{ marginRight: 6, verticalAlign: -1 }}>
                  <path d="M8 1.5l1.8 3.6 4 .6-2.9 2.8.7 4L8 10.3l-3.6 1.9.7-4L2.2 5.7l4-.6L8 1.5z" stroke="#e8a015" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
                Favoritos
              </span>
              <span className="dp-card-count">{favorites.length}/{MAX_FAVORITES} — clique ★ no menu para fixar</span>
            </div>
            {favorites.length === 0 ? (
              <div className="dp-fav-empty">
                Nenhum favorito ainda. Passe o mouse sobre uma rotina no menu lateral e clique na estrela para fixar aqui.
              </div>
            ) : (
              <div className="dp-fav-grid">
                {favorites.map((code) => {
                  const name     = getNameByCode(code);
                  const isActive = activeScreen === code;
                  return (
                    <div
                      key={code}
                      className={`dp-fav-tile${isActive ? " is-loading" : ""}`}
                      onClick={() => handleOpenScreen(code)}
                      role="button" tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && handleOpenScreen(code)}
                      title={`${code} — ${name}`}
                    >
                      <button
                        type="button" className="dp-fav-unpin"
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(code); }}
                        title="Remover dos favoritos"
                      >
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      </button>
                      {isActive
                        ? <div className="dp-mini-spinner" style={{ marginBottom: 6 }} />
                        : <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ marginBottom: 6, color: "#3e9654" }}>
                            <rect x="1" y="4" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                            <path d="M5 4V3a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                          </svg>
                      }
                      <span className="dp-fav-code">{code}</span>
                      <span className="dp-fav-name">{name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── RECENTS ── */}
          <div className="dp-card">
            <div className="dp-card-head">
              <span className="dp-card-title">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ marginRight: 6, verticalAlign: -1 }}>
                  <circle cx="8" cy="8" r="6" stroke="#3e9654" strokeWidth="1.4" />
                  <path d="M8 5v3.2l2.2 2" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                Recentes
              </span>
              <span className="dp-card-count">esta sessão</span>
            </div>
            {recents.length === 0 ? (
              <div className="dp-recents-empty">Nenhuma rotina aberta ainda nesta sessão.</div>
            ) : (
              <div className="dp-recents-list">
                {recents.map((code) => {
                  const name     = getNameByCode(code);
                  const isActive = activeScreen === code;
                  return (
                    <button
                      key={code} type="button"
                      className="dp-recent-item"
                      onClick={() => handleOpenScreen(code)}
                      disabled={isOpeningScreen}
                    >
                      <span className="dp-recent-code">{code}</span>
                      <span className="dp-recent-name">{name}</span>
                      {isActive
                        ? <span className="dp-mini-spinner" />
                        : <svg className="dp-recent-arrow" width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <path d="M2 6.5h9M8 3l3.5 3.5L8 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                      }
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {feedbackMessage && (
            <div className={`dp-feedback ${feedbackType}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedbackType === "success"
                  ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  : <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4" /><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round" /></>
                }
              </svg>
              {feedbackMessage}
            </div>
          )}
        </main>

      </div>
    </>
  );
}

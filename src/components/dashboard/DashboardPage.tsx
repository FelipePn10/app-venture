import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ERP_SCREENS, ErpScreen } from "@/types/erpScreen";
import { openErpScreenWindow } from "@/utils/windowManager";
import { useAuthStore } from "@/store/authStore";

const MAX_RECENTS = 6;
const MAX_FAVORITES = 8;
const LS_FAVORITES_KEY = "venture_erp_favorites";

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(LS_FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFavorites(favs: string[]) {
  try {
    localStorage.setItem(LS_FAVORITES_KEY, JSON.stringify(favs));
  } catch (e) {
    void e;
  }
}

function useSessionTimer(startTime: number) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(id);
  }, [startTime]);
  const totalSeconds = Math.floor(elapsed / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

function useLiveClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const { userName, user, clearAuthData } = useAuthStore((state) => ({
    userName: state.userName,
    user: state.user,
    clearAuthData: state.clearAuthData,
  }));

  const [sessionStart] = useState(() => Date.now());
  const sessionTime = useSessionTimer(sessionStart);
  const clock = useLiveClock();

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">(
    "success",
  );
  const [isOpeningScreen, setIsOpeningScreen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [recents, setRecents] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);

  const welcomeName = useMemo(
    () => userName ?? user?.name ?? "Usuário",
    [user, userName],
  );
  const userRoleLabel = useMemo(
    () => user?.role ?? "Operador do sistema",
    [user],
  );

  const initials = useMemo(() => {
    const parts = (userName ?? "U").trim().split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : parts[0][0].toUpperCase();
  }, [userName]);

  const filteredScreens = useMemo((): ErpScreen[] => {
    if (!searchQuery.trim()) return ERP_SCREENS;
    const q = searchQuery.toLowerCase();
    return ERP_SCREENS.filter(
      (s) =>
        s.code.toLowerCase().includes(q) || s.title.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  function getCode(s: ErpScreen): string {
    return s.code;
  }

  function getName(s: ErpScreen): string {
    return s.title;
  }

  function getNameByCode(code: string): string {
    return ERP_SCREENS.find((s) => s.code === code)?.title ?? code;
  }

  function handleLogout(): void {
    clearAuthData();
    navigate("/login", { replace: true });
  }

  const toggleFavorite = useCallback((code: string) => {
    setFavorites((prev) => {
      const next = prev.includes(code)
        ? prev.filter((c) => c !== code)
        : prev.length < MAX_FAVORITES
          ? [...prev, code]
          : prev;
      saveFavorites(next);
      return next;
    });
  }, []);

  async function handleOpenScreen(screenCode: string): Promise<void> {
    setFeedbackMessage(null);
    setActiveScreen(screenCode);
    setIsOpeningScreen(true);
    try {
      await openErpScreenWindow(screenCode);
      setRecents((prev) => {
        const filtered = prev.filter((c) => c !== screenCode);
        return [screenCode, ...filtered].slice(0, MAX_RECENTS);
      });
      setFeedbackMessage(`Tela ${screenCode} aberta com sucesso.`);
      setFeedbackType("success");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Falha ao abrir a tela selecionada.";
      setFeedbackMessage(`Erro: ${message}`);
      setFeedbackType("error");
    } finally {
      setIsOpeningScreen(false);
      setActiveScreen(null);
    }
  }

  const clockStr = clock.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dateLabel = clock.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .dp-root {
          min-height: 100vh;
          display: grid;
          grid-template-rows: 56px 1fr;
          grid-template-columns: 340px 1fr;
          grid-template-areas: "topbar topbar" "sidebar content";
          font-family: 'Inter', sans-serif;
          background: #f0f4ee;
          color: #1a2e22;
        }

        /* ── TOPBAR ── */
        .dp-topbar {
          grid-area: topbar;
          background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px 0 20px;
          position: relative; z-index: 10;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .dp-topbar-left { display: flex; align-items: center; gap: 12px; }
        .dp-logo-mark {
          width: 32px; height: 32px; background: #3e9654;
          border-radius: 7px; display: flex; align-items: center;
          justify-content: center; flex-shrink: 0;
        }
        .dp-logo-name { font-size: 14px; font-weight: 600; color: #e0f0e3; line-height: 1.15; }
        .dp-logo-sub { display: block; font-size: 10px; font-weight: 400; color: #3d6b4d; }

        .dp-topbar-center {
          position: absolute; left: 50%; transform: translateX(-50%);
          display: flex; align-items: center; gap: 16px;
          pointer-events: none;
        }
        .dp-clock {
          font-size: 15px; font-weight: 600; color: #c0e0c8;
          letter-spacing: 1px; font-variant-numeric: tabular-nums;
        }
        .dp-date { font-size: 11.5px; color: #3d6b4d; text-transform: capitalize; }
        .dp-topbar-sep { width: 1px; height: 18px; background: rgba(255,255,255,0.08); }

        .dp-topbar-right { display: flex; align-items: center; gap: 10px; }
        .dp-session-badge {
          display: flex; align-items: center; gap: 5px;
          background: rgba(62,150,84,0.1); border: 1px solid rgba(62,150,84,0.18);
          border-radius: 6px; padding: 4px 10px;
          font-size: 11px; color: #5a9a6a; font-weight: 500;
        }
        .dp-session-dot {
          width: 5px; height: 5px; background: #3e9654;
          border-radius: 50%; flex-shrink: 0;
        }
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
          padding: 16px 16px 12px;
          border-bottom: 1px solid #edf5e8; flex-shrink: 0;
        }
        .dp-sidebar-heading {
          font-size: 10.5px; font-weight: 600; letter-spacing: 0.9px;
          text-transform: uppercase; color: #8ab09a; margin-bottom: 11px;
        }
        .dp-search-wrap { position: relative; }
        .dp-search-icon {
          position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
          color: #a0c0a8; display: flex; pointer-events: none;
        }
        .dp-search {
          width: 100%; height: 38px; background: #f5f9f3;
          border: 1.5px solid #dbe8d5; border-radius: 9px;
          padding: 0 12px 0 36px;
          font-family: 'Inter', sans-serif; font-size: 13px; color: #1a2e22;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .dp-search::placeholder { color: #a0c0a8; }
        .dp-search:focus { border-color: #3e9654; box-shadow: 0 0 0 3px rgba(62,150,84,0.1); }
        .dp-search-meta {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: 8px; padding: 0 2px;
        }
        .dp-search-count { font-size: 11px; color: #a0c0a8; }
        .dp-search-clear {
          font-size: 11px; color: #7a9c84; background: none;
          border: none; cursor: pointer; padding: 0;
          font-family: 'Inter', sans-serif; font-weight: 500;
        }
        .dp-search-clear:hover { color: #3e9654; }

        /* Screen list */
        .dp-screen-list { flex: 1; overflow-y: auto; padding: 6px 10px 14px; }
        .dp-screen-list::-webkit-scrollbar { width: 4px; }
        .dp-screen-list::-webkit-scrollbar-track { background: transparent; }
        .dp-screen-list::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .dp-screen-item {
          display: flex; align-items: center; gap: 10px;
          width: 100%; padding: 10px 10px;
          border: none; border-radius: 9px;
          background: transparent; cursor: pointer; text-align: left;
          margin-bottom: 1px; position: relative;
          transition: background 0.1s;
          group: true;
        }
        .dp-screen-item:hover { background: #edf7ea; }
        .dp-screen-item:hover .dp-screen-arrow { opacity: 1; transform: translateX(3px); }
        .dp-screen-item:hover .dp-fav-btn { opacity: 1; }
        .dp-screen-item.is-active { background: #e2f2e4; }
        .dp-screen-item.is-disabled { opacity: 0.4; pointer-events: none; }

        .dp-screen-code-tag {
          background: #edf5ea; border: 1px solid #c8e0c0;
          border-radius: 6px; padding: 3px 7px;
          font-size: 11.5px; font-weight: 600; color: #2a7040;
          flex-shrink: 0; white-space: nowrap;
          font-variant-numeric: tabular-nums;
          min-width: 76px; text-align: center;
        }
        .dp-screen-item.is-active .dp-screen-code-tag { background: #c8e8cc; border-color: #a0d0a8; color: #1a5028; }
        .dp-screen-name {
          font-size: 13.5px; color: #243830; font-weight: 400;
          flex: 1; white-space: nowrap; overflow: hidden;
          text-overflow: ellipsis; line-height: 1.3;
        }
        .dp-screen-item.is-active .dp-screen-name { font-weight: 500; color: #162e20; }

        .dp-fav-btn {
          background: none; border: none; cursor: pointer; padding: 3px;
          color: #c0d8c8; opacity: 0; transition: opacity 0.12s, color 0.12s;
          display: flex; align-items: center; flex-shrink: 0;
          border-radius: 4px;
        }
        .dp-fav-btn:hover { color: #f0a820; }
        .dp-fav-btn.is-fav { opacity: 1 !important; color: #e8a015; }

        .dp-screen-arrow {
          color: #b0d0b8; flex-shrink: 0; opacity: 0;
          transition: opacity 0.12s, transform 0.15s;
        }
        .dp-mini-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(62,150,84,0.2); border-top-color: #3e9654;
          border-radius: 50%; animation: spin 0.6s linear infinite; flex-shrink: 0;
        }
        .dp-screen-empty { padding: 28px 12px; text-align: center; font-size: 13px; color: #a0c0a8; line-height: 1.7; }

        /* ── CONTENT ── */
        .dp-content {
          grid-area: content; overflow-y: auto;
          padding: 30px 34px; display: flex; flex-direction: column; gap: 20px;
        }
        .dp-content::-webkit-scrollbar { width: 5px; }
        .dp-content::-webkit-scrollbar-track { background: transparent; }
        .dp-content::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .dp-page-eyebrow { font-size: 10.5px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: #3e9654; margin-bottom: 4px; }
        .dp-page-title { font-size: 23px; font-weight: 600; color: #162e20; letter-spacing: -0.3px; line-height: 1.2; margin-bottom: 4px; }
        .dp-page-title span { color: #3e9654; }
        .dp-page-subtitle { font-size: 13px; color: #6a8a74; }

        /* Metrics */
        .dp-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .dp-metric {
          background: #fff; border: 1px solid #dbe8d5; border-radius: 12px;
          padding: 18px 20px; position: relative; overflow: hidden;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .dp-metric:hover { border-color: #a8d0b0; box-shadow: 0 2px 12px rgba(62,150,84,0.07); }
        .dp-metric::after {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 3px; border-radius: 12px 12px 0 0;
          background: #3e9654; opacity: 0.25;
        }
        .dp-metric.dp-accent::after { opacity: 1; }
        .dp-metric-icon { width: 32px; height: 32px; background: #eef5ea; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
        .dp-metric-label { font-size: 10.5px; font-weight: 600; color: #80a890; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .dp-metric-value { font-size: 28px; font-weight: 600; color: #162e20; letter-spacing: -0.5px; line-height: 1; margin-bottom: 4px; }
        .dp-metric-sub { font-size: 11.5px; color: #9ab8a4; }

        /* Section card */
        .dp-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; padding: 20px 22px;
        }
        .dp-card-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 14px;
        }
        .dp-card-title { font-size: 13px; font-weight: 600; color: #2a4030; text-transform: uppercase; letter-spacing: 0.6px; }
        .dp-card-count { font-size: 11px; color: #a0b8a8; }

        /* Recents */
        .dp-recents-list { display: flex; flex-direction: column; gap: 2px; }
        .dp-recent-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; border-radius: 8px;
          background: transparent; border: none; cursor: pointer;
          text-align: left; width: 100%;
          transition: background 0.1s;
        }
        .dp-recent-item:hover { background: #edf7ea; }
        .dp-recent-item:hover .dp-recent-arrow { opacity: 1; transform: translateX(2px); }
        .dp-recent-item.is-loading { opacity: 0.5; pointer-events: none; }
        .dp-recent-code {
          font-size: 11.5px; font-weight: 600; color: #3e9654;
          min-width: 72px; flex-shrink: 0; font-variant-numeric: tabular-nums;
        }
        .dp-recent-name { font-size: 13px; color: #2a4030; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dp-recent-arrow { color: #b0d0b8; opacity: 0; transition: opacity 0.12s, transform 0.15s; flex-shrink: 0; }
        .dp-recents-empty { font-size: 12.5px; color: #a0c0a8; padding: 8px 2px; }

        /* Favorites grid */
        .dp-fav-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .dp-fav-tile {
          display: flex; flex-direction: column; align-items: flex-start;
          padding: 12px 12px; border-radius: 10px;
          background: #f5f9f3; border: 1.5px solid #dbe8d5;
          cursor: pointer; position: relative;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.12s;
          text-align: left;
        }
        .dp-fav-tile:hover { border-color: #3e9654; background: #eef8ec; box-shadow: 0 2px 8px rgba(62,150,84,0.1); }
        .dp-fav-tile.is-loading { opacity: 0.5; pointer-events: none; }
        .dp-fav-code { font-size: 12px; font-weight: 700; color: #3e9654; margin-bottom: 4px; letter-spacing: 0.2px; }
        .dp-fav-name { font-size: 11.5px; color: #4a6a54; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .dp-fav-unpin {
          position: absolute; top: 6px; right: 6px;
          background: none; border: none; cursor: pointer; padding: 2px;
          color: #c0d8c8; border-radius: 4px; opacity: 0;
          transition: opacity 0.12s, color 0.12s;
          display: flex; align-items: center;
        }
        .dp-fav-tile:hover .dp-fav-unpin { opacity: 1; }
        .dp-fav-unpin:hover { color: #e05252; }
        .dp-fav-empty { font-size: 12.5px; color: #a0c0a8; padding: 4px 2px; line-height: 1.6; }

        /* Feedback */
        .dp-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 14px;
          border-radius: 9px; font-size: 13px;
          animation: fadeIn 0.18s ease;
        }
        .dp-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .dp-feedback.error { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }

        .dp-spinner { width: 14px; height: 14px; border: 2px solid rgba(223,240,226,0.25); border-top-color: #dff0e2; border-radius: 50%; animation: spin 0.65s linear infinite; flex-shrink: 0; }
      `}</style>

      <div className="dp-root">
        {/* TOPBAR */}
        <header className="dp-topbar">
          <div className="dp-topbar-left">
            <div className="dp-logo-mark">
              <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
                <rect
                  x="1.5"
                  y="1.5"
                  width="6"
                  height="6"
                  rx="1.2"
                  fill="rgba(255,255,255,0.9)"
                />
                <rect
                  x="10.5"
                  y="1.5"
                  width="6"
                  height="6"
                  rx="1.2"
                  fill="rgba(255,255,255,0.4)"
                />
                <rect
                  x="1.5"
                  y="10.5"
                  width="6"
                  height="6"
                  rx="1.2"
                  fill="rgba(255,255,255,0.4)"
                />
                <rect
                  x="10.5"
                  y="10.5"
                  width="6"
                  height="6"
                  rx="1.2"
                  fill="rgba(255,255,255,0.7)"
                />
              </svg>
            </div>
            <span className="dp-logo-name">
              Venture
              <span className="dp-logo-sub">ERP &amp; Soluções</span>
            </span>
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
            <button
              type="button"
              className="dp-logout-btn"
              onClick={handleLogout}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Sair
            </button>
          </div>
        </header>

        {/* SIDEBAR */}
        <aside className="dp-sidebar">
          <div className="dp-sidebar-top">
            <div className="dp-sidebar-heading">Rotinas do sistema</div>
            <div className="dp-search-wrap">
              <span className="dp-search-icon">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle
                    cx="6.5"
                    cy="6.5"
                    r="4.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M10 10l3.5 3.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
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
                <span className="dp-search-count">
                  {filteredScreens.length} resultado
                  {filteredScreens.length !== 1 ? "s" : ""}
                </span>
                <button
                  className="dp-search-clear"
                  onClick={() => setSearchQuery("")}
                >
                  Limpar
                </button>
              </div>
            )}
          </div>

          <div className="dp-screen-list">
            {filteredScreens.length === 0 ? (
              <div className="dp-screen-empty">
                Nenhuma rotina encontrada
                <br />
                para "{searchQuery}".
              </div>
            ) : (
              filteredScreens.map((screen) => {
                const code = getCode(screen);
                const name = getName(screen);
                const isActive = activeScreen === code;
                const isDisabled = isOpeningScreen && !isActive;
                const isFav = favorites.includes(code);
                return (
                  <div
                    key={code}
                    className={`dp-screen-item${isActive ? " is-active" : ""}${isDisabled ? " is-disabled" : ""}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      width: "100%",
                      padding: "10px",
                      borderRadius: "9px",
                      background: isActive ? "#e2f2e4" : "transparent",
                      marginBottom: "1px",
                      cursor: "pointer",
                      border: "none",
                      textAlign: "left",
                    }}
                    onClick={() => handleOpenScreen(code)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleOpenScreen(code)
                    }
                    title={`${code} — ${name}`}
                  >
                    <span className="dp-screen-code-tag">{code}</span>
                    <span className="dp-screen-name">{name}</span>
                    <button
                      type="button"
                      className={`dp-fav-btn${isFav ? " is-fav" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(code);
                      }}
                      title={
                        isFav ? "Remover dos favoritos" : "Fixar nos favoritos"
                      }
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 16 16"
                        fill={isFav ? "currentColor" : "none"}
                      >
                        <path
                          d="M8 1.5l1.8 3.6 4 .6-2.9 2.8.7 4L8 10.3l-3.6 1.9.7-4L2.2 5.7l4-.6L8 1.5z"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    {isActive ? (
                      <span className="dp-mini-spinner" />
                    ) : (
                      <svg
                        className="dp-screen-arrow"
                        width="13"
                        height="13"
                        viewBox="0 0 13 13"
                        fill="none"
                      >
                        <path
                          d="M2 6.5h9M8 3l3.5 3.5L8 10"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* CONTENT */}
        <main className="dp-content">
          <div>
            <p className="dp-page-eyebrow">Dashboard Operacional</p>
            <h1 className="dp-page-title">
              Bem-vindo, <span>{welcomeName}.</span>
            </h1>
            <p className="dp-page-subtitle">
              Selecione uma rotina no menu lateral ou utilize os atalhos abaixo.
            </p>
          </div>

          {/* Metrics */}
          <div className="dp-metrics">
            <div className="dp-metric dp-accent">
              <div className="dp-metric-icon">
                <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
                  <rect
                    x="1"
                    y="1"
                    width="5.5"
                    height="5.5"
                    rx="1"
                    stroke="#3e9654"
                    strokeWidth="1.4"
                  />
                  <rect
                    x="9.5"
                    y="1"
                    width="5.5"
                    height="5.5"
                    rx="1"
                    stroke="#3e9654"
                    strokeWidth="1.4"
                  />
                  <rect
                    x="1"
                    y="9.5"
                    width="5.5"
                    height="5.5"
                    rx="1"
                    stroke="#3e9654"
                    strokeWidth="1.4"
                  />
                  <rect
                    x="9.5"
                    y="9.5"
                    width="5.5"
                    height="5.5"
                    rx="1"
                    stroke="#3e9654"
                    strokeWidth="1.4"
                  />
                </svg>
              </div>
              <div className="dp-metric-label">Rotinas disponíveis</div>
              <div className="dp-metric-value">{ERP_SCREENS.length}</div>
              <div className="dp-metric-sub">telas cadastradas</div>
            </div>

            <div className="dp-metric">
              <div className="dp-metric-icon">
                <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2 12l3-3 3 2.5 2.5-4L14 4"
                    stroke="#3e9654"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="dp-metric-label">Acessos nesta sessão</div>
              <div className="dp-metric-value">{recents.length}</div>
              <div className="dp-metric-sub">
                {recents.length === 0
                  ? "nenhuma rotina aberta"
                  : `última: ${recents[0]}`}
              </div>
            </div>
          </div>

          {/* Favorites */}
          <div className="dp-card">
            <div className="dp-card-head">
              <span className="dp-card-title">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="#e8a015"
                  style={{ marginRight: 6, verticalAlign: -1 }}
                >
                  <path
                    d="M8 1.5l1.8 3.6 4 .6-2.9 2.8.7 4L8 10.3l-3.6 1.9.7-4L2.2 5.7l4-.6L8 1.5z"
                    stroke="#e8a015"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                </svg>
                Favoritos
              </span>
              <span className="dp-card-count">
                {favorites.length}/{MAX_FAVORITES} — clique ★ no menu para fixar
              </span>
            </div>
            {favorites.length === 0 ? (
              <div className="dp-fav-empty">
                Nenhum favorito ainda. Passe o mouse sobre uma rotina no menu
                lateral
                <br />e clique na estrela para fixar aqui.
              </div>
            ) : (
              <div className="dp-fav-grid">
                {favorites.map((code) => {
                  const name = getNameByCode(code);
                  const isActive = activeScreen === code;
                  return (
                    <div
                      key={code}
                      className={`dp-fav-tile${isActive ? " is-loading" : ""}`}
                      onClick={() => handleOpenScreen(code)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleOpenScreen(code)
                      }
                      title={`${code} — ${name}`}
                    >
                      <button
                        type="button"
                        className="dp-fav-unpin"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(code);
                        }}
                        title="Remover dos favoritos"
                      >
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <path
                            d="M2 2l8 8M10 2L2 10"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                      {isActive ? (
                        <div
                          className="dp-mini-spinner"
                          style={{ marginBottom: 6 }}
                        />
                      ) : (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 16 16"
                          fill="none"
                          style={{ marginBottom: 6, color: "#3e9654" }}
                        >
                          <rect
                            x="1"
                            y="4"
                            width="14"
                            height="10"
                            rx="1.5"
                            stroke="currentColor"
                            strokeWidth="1.3"
                          />
                          <path
                            d="M5 4V3a3 3 0 016 0v1"
                            stroke="currentColor"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                      <span className="dp-fav-code">{code}</span>
                      <span className="dp-fav-name">{name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recents */}
          <div className="dp-card">
            <div className="dp-card-head">
              <span className="dp-card-title">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  style={{ marginRight: 6, verticalAlign: -1 }}
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    stroke="#3e9654"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M8 5v3.2l2.2 2"
                    stroke="#3e9654"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                Recentes
              </span>
              <span className="dp-card-count">esta sessão</span>
            </div>
            {recents.length === 0 ? (
              <div className="dp-recents-empty">
                Nenhuma rotina aberta ainda nesta sessão.
              </div>
            ) : (
              <div className="dp-recents-list">
                {recents.map((code) => {
                  const name = getNameByCode(code);
                  const isActive = activeScreen === code;
                  const isDisabled = isOpeningScreen && !isActive;
                  return (
                    <button
                      key={code}
                      type="button"
                      className={`dp-recent-item${isDisabled ? " is-loading" : ""}`}
                      onClick={() => handleOpenScreen(code)}
                      disabled={isOpeningScreen}
                    >
                      <span className="dp-recent-code">{code}</span>
                      <span className="dp-recent-name">{name}</span>
                      {isActive ? (
                        <span className="dp-mini-spinner" />
                      ) : (
                        <svg
                          className="dp-recent-arrow"
                          width="13"
                          height="13"
                          viewBox="0 0 13 13"
                          fill="none"
                        >
                          <path
                            d="M2 6.5h9M8 3l3.5 3.5L8 10"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {feedbackMessage && (
            <div className={`dp-feedback ${feedbackType}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedbackType === "success" ? (
                  <path
                    d="M3 8l3.5 3.5L13 5"
                    stroke="#1e6030"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <>
                    <circle
                      cx="8"
                      cy="8"
                      r="6"
                      stroke="#e05252"
                      strokeWidth="1.4"
                    />
                    <path
                      d="M8 5v3.5M8 10.5h.01"
                      stroke="#e05252"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </>
                )}
              </svg>
              {feedbackMessage}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

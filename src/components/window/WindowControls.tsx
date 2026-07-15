import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface WindowControlsProps {
  /** Pass "light" when the controls sit on a dark background (default). */
  theme?: "light" | "dark";
}

/** True only inside the Tauri webview. In a plain browser (dev/preview) the
 * window APIs are unavailable, so we degrade gracefully instead of crashing. */
const IN_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Safe handle to the OS window; null outside Tauri. */
function safeWindow(): ReturnType<typeof getCurrentWindow> | null {
  if (!IN_TAURI) return null;
  try { return getCurrentWindow(); } catch { return null; }
}

export function WindowControls({ theme = "light" }: WindowControlsProps): JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = safeWindow();

  useEffect(() => {
    if (!appWindow) return;
    appWindow.isMaximized().then(setIsMaximized);
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [appWindow]);

  const iconColor = theme === "light" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";

  return (
    <>
      <style>{`
        .wc-wrap { display: flex; align-items: center; gap: 2px; -webkit-app-region: no-drag; }
        .wc-btn {
          width: 32px; height: 30px; border: none; background: transparent;
          border-radius: 6px; cursor: pointer; display: flex; align-items: center;
          justify-content: center; transition: background 0.13s, color 0.13s;
          outline: none; flex-shrink: 0; -webkit-app-region: no-drag;
        }
        .wc-btn:hover { background: rgba(255,255,255,0.1); }
        .wc-btn.wc-close:hover { background: rgba(210,40,40,0.8) !important; }
        .wc-btn.wc-close:hover svg { color: #fff !important; }
        .wc-btn svg { display: block; }
      `}</style>

      <div className="wc-wrap">
        <button
          type="button"
          className="wc-btn"
          title="Minimizar"
          onClick={() => appWindow?.minimize()}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={iconColor} strokeWidth="1.6" strokeLinecap="round">
            <line x1="1" y1="6" x2="11" y2="6" />
          </svg>
        </button>

        <button
          type="button"
          className="wc-btn"
          title={isMaximized ? "Restaurar" : "Maximizar"}
          onClick={() => appWindow?.toggleMaximize()}
        >
          {isMaximized ? (
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={iconColor} strokeWidth="1.3">
              <rect x="3" y="1" width="8" height="8" rx="1" />
              <path d="M1 4v7h7" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={iconColor} strokeWidth="1.3">
              <rect x="1" y="1" width="10" height="10" rx="1.5" />
            </svg>
          )}
        </button>

        <button
          type="button"
          className="wc-btn wc-close"
          title="Fechar"
          onClick={() => appWindow?.close()}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={iconColor} strokeWidth="1.6" strokeLinecap="round">
            <line x1="1.5" y1="1.5" x2="10.5" y2="10.5" />
            <line x1="10.5" y1="1.5" x2="1.5" y2="10.5" />
          </svg>
        </button>
      </div>
    </>
  );
}

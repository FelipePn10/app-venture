import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = getCurrentWindow();

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized);
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <>
      <style>{`
        .titlebar {
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px 0 16px;
          background: #0f1f14;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          position: relative;
          z-index: 9999;
          flex-shrink: 0;
          user-select: none;
        }

        .titlebar::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(74, 163, 88, 0.4) 30%,
            rgba(74, 163, 88, 0.4) 70%,
            transparent
          );
        }

        .titlebar-left {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: default;
        }

        .titlebar-logo {
          width: 18px;
          height: 18px;
          background: linear-gradient(135deg, #2d6a3f, #4aa358);
          border-radius: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          color: #fff;
          flex-shrink: 0;
        }

        .titlebar-title {
          font-family: 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
          font-size: 12px;
          font-weight: 500;
          color: rgba(255,255,255,0.55);
          letter-spacing: 0.02em;
        }

        .titlebar-title span {
          color: rgba(255,255,255,0.85);
          font-weight: 600;
        }

        .titlebar-divider {
          width: 1px;
          height: 14px;
          background: rgba(255,255,255,0.1);
          margin: 0 4px;
        }

        .titlebar-badge {
          font-family: 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #4aa358;
          background: rgba(74, 163, 88, 0.12);
          border: 1px solid rgba(74, 163, 88, 0.25);
          border-radius: 4px;
          padding: 2px 6px;
        }

        .titlebar-center {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          font-family: 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
          font-size: 11.5px;
          font-weight: 500;
          color: rgba(255,255,255,0.3);
          letter-spacing: 0.03em;
          pointer-events: none;
        }

        .titlebar-controls {
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .titlebar-btn {
          width: 32px;
          height: 26px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease;
          color: rgba(255,255,255,0.4);
          -webkit-app-region: no-drag;
          outline: none;
        }

        .titlebar-btn:hover {
          background: rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.75);
        }

        .titlebar-btn.close:hover {
          background: rgba(220, 53, 53, 0.75);
          color: #fff;
        }

        .titlebar-btn svg {
          width: 11px;
          height: 11px;
          stroke: currentColor;
          stroke-width: 1.6;
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
          flex-shrink: 0;
        }

        [data-tauri-drag-region] {
          -webkit-app-region: drag;
        }
      `}</style>

      <div className="titlebar" data-tauri-drag-region>
        {/* Left — logo + nome */}
        <div className="titlebar-left" data-tauri-drag-region>
          <div className="titlebar-logo">V</div>
          <div className="titlebar-title" data-tauri-drag-region>
            <span>Venture</span> ERP
          </div>
          <div className="titlebar-divider" />
          <div className="titlebar-badge">v4.2</div>
        </div>

        {/* Center — título da janela */}
        <div className="titlebar-center">ERP Venture Desktop</div>

        {/* Right — controles */}
        <div className="titlebar-controls">
          {/* Minimizar */}
          <button
            className="titlebar-btn"
            onClick={() => appWindow.minimize()}
            title="Minimizar"
          >
            <svg viewBox="0 0 12 12">
              <line x1="1" y1="6" x2="11" y2="6" />
            </svg>
          </button>

          {/* Maximizar / Restaurar */}
          <button
            className="titlebar-btn"
            onClick={() => appWindow.toggleMaximize()}
            title={isMaximized ? "Restaurar" : "Maximizar"}
          >
            {isMaximized ? (
              <svg viewBox="0 0 12 12">
                <rect x="3" y="1" width="8" height="8" rx="1" />
                <path d="M1 4v7h7" />
              </svg>
            ) : (
              <svg viewBox="0 0 12 12">
                <rect x="1" y="1" width="10" height="10" rx="1.5" />
              </svg>
            )}
          </button>

          {/* Fechar */}
          <button
            className="titlebar-btn close"
            onClick={() => appWindow.close()}
            title="Fechar"
          >
            <svg viewBox="0 0 12 12">
              <line x1="1.5" y1="1.5" x2="10.5" y2="10.5" />
              <line x1="10.5" y1="1.5" x2="1.5" y2="10.5" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

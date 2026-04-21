import { useEffect, useState } from "react";
import { ActionBar } from "@/components/ui/ActionBar";
import { TitleBar } from "@/components/window/TitleBar";

interface Action {
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface ScreenLayoutProps {
  children: React.ReactNode;
  title: string;
  screenCode: string;
  actions?: Action[];
  showNav?: boolean;
  breadcrumb?: { label: string; href?: string }[];
}

export function ScreenLayout({
  children,
  title,
  screenCode,
  actions = [],
  showNav = true,
}: ScreenLayoutProps): JSX.Element {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navActions: Action[] = showNav
    ? [
        {
          label: "",
          variant: "ghost",
          onClick: () => {},
          icon: (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M9 2L3 8l6 6M2 2v12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ),
        },
        {
          label: "",
          variant: "ghost",
          onClick: () => {},
          icon: (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2L3 8l5 6M2 8h12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ),
        },
        {
          label: "",
          variant: "ghost",
          onClick: () => {},
          icon: (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 14l5-6-5-6M2 8h12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ),
        },
        {
          label: "",
          variant: "ghost",
          onClick: () => {},
          icon: (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M7 2l5 6-5 6M2 2v12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ),
        },
      ]
    : [];

  const allActions = [...navActions, ...actions];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <TitleBar />

      {/* Screen Header */}
      <header
        style={{
          height: "56px",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(226, 232, 240, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              background: "linear-gradient(135deg, #3d7a3d, #5a9a5a)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <rect
                x="2"
                y="2"
                width="7"
                height="7"
                rx="1.5"
                fill="rgba(255,255,255,0.9)"
              />
              <rect
                x="11"
                y="2"
                width="7"
                height="7"
                rx="1.5"
                fill="rgba(255,255,255,0.5)"
              />
              <rect
                x="2"
                y="11"
                width="7"
                height="7"
                rx="1.5"
                fill="rgba(255,255,255,0.5)"
              />
              <rect
                x="11"
                y="11"
                width="7"
                height="7"
                rx="1.5"
                fill="rgba(255,255,255,0.75)"
              />
            </svg>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}
            >
              Venture ERP
            </div>
            <div
              style={{
                width: "1px",
                height: "20px",
                background:
                  "linear-gradient(180deg, transparent, #cbd5e1, transparent)",
              }}
            />
            <div
              style={{
                padding: "4px 10px",
                background: "rgba(93, 168, 93, 0.1)",
                border: "1px solid rgba(93, 168, 93, 0.2)",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 600,
                color: "#3d7a3d",
              }}
            >
              {screenCode}
            </div>{" "}
            <div
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "#64748b",
                paddingLeft: "8px",
                borderLeft: "1px solid #e2e8f0",
                marginLeft: "4px",
              }}
            >
              {title}
            </div>
          </div>
        </div>
      </header>

      {/* Action Bar */}
      {allActions.length > 0 && (
        <div
          style={{
            background: "#fff",
            borderBottom: "1px solid #e2e8f0",
            flexShrink: 0,
          }}
        >
          <ActionBar actions={allActions} />
        </div>
      )}

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          overflow: "auto",
          padding: "24px",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(8px)",
          transition: "all 300ms ease-out",
        }}
      >
        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto",
          }}
        >
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          height: "40px",
          background: "#fff",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          fontSize: "11px",
          color: "#64748b",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span>
            Registro: <strong style={{ color: "#334155" }}>Novo</strong>
          </span>
          <span>
            Última alteração: <strong style={{ color: "#334155" }}>—</strong>
          </span>
        </div>
        <div>
          <span style={{ fontWeight: 500 }}>GRUPO VENTURE LTDA</span>
        </div>
      </footer>
    </div>
  );
}

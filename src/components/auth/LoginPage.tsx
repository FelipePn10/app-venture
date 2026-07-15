import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { login } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";
import { WindowControls } from "@/components/window/WindowControls";

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const setAuthData = useAuthStore((state) => state.setAuthData);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);

    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = "Informe seu usuário ou e-mail.";
    if (!password) errors.password = "Informe sua senha.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const response = await login({ email, password });
      setAuthData({
        token: response.token,
        userName: response.userName,
        refreshToken: response.refreshToken,
        expiresAt: response.expiresAt,
        user: response.user,
      });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const defaultMessage = "Falha ao autenticar no backend. Verifique usuário, senha, rota e formato esperado pela API.";
      setErrorMessage(error instanceof Error ? error.message : defaultMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&family=Playfair+Display:ital,wght@0,400;0,500;1,400&display=swap');

        .lp-root {
          height: 100vh;
          display: grid;
          grid-template-columns: 420px 1fr;
          grid-template-rows: 38px 1fr;
          grid-template-areas: "titlebar titlebar" "sidebar form";
          font-family: 'DM Sans', sans-serif;
          background: #f2f6f0;
        }

        .lp-titlebar {
          grid-area: titlebar;
          background: #0d1f12;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding: 0 6px;
          cursor: grab;
        }

        /* ── LEFT SIDEBAR ── */
        .lp-sidebar {
          grid-area: sidebar;
          background: #162e20;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 40px 36px;
          position: relative;
          overflow: hidden;
        }

        .lp-sidebar::before {
          content: '';
          position: absolute;
          top: -120px;
          right: -120px;
          width: 360px;
          height: 360px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(62,150,84,0.18) 0%, transparent 70%);
          pointer-events: none;
        }

        .lp-sidebar::after {
          content: '';
          position: absolute;
          bottom: -100px;
          left: -80px;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(62,150,84,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .lp-logo {
          display: flex;
          align-items: center;
          gap: 11px;
          position: relative;
          z-index: 1;
        }

        .lp-logo-mark {
          width: 38px;
          height: 38px;
          background: #3e9654;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .lp-logo-name {
          font-size: 16px;
          font-weight: 600;
          color: #dff0e2;
          letter-spacing: -0.2px;
          line-height: 1.1;
        }

        .lp-logo-sub {
          display: block;
          font-size: 10px;
          font-weight: 400;
          color: #5a8a68;
          letter-spacing: 0.3px;
        }

        .lp-sidebar-body {
          position: relative;
          z-index: 1;
        }

        .lp-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(62, 150, 84, 0.18);
          border: 1px solid rgba(62, 150, 84, 0.28);
          border-radius: 20px;
          padding: 7px 14px;
          margin-bottom: 26px;
        }

        .lp-pill-text {
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.5px;
          color: #7ecb8f;
        }

        .lp-headline {
          font-family: 'Playfair Display', serif;
          font-size: 30px;
          font-weight: 400;
          color: #dff0e2;
          line-height: 1.35;
          margin-bottom: 14px;
          letter-spacing: -0.3px;
        }

        .lp-headline em {
          font-style: italic;
          color: #7ecb8f;
        }

        .lp-tagline {
          font-size: 13px;
          font-weight: 300;
          color: #6a9278;
          line-height: 1.7;
          max-width: 280px;
        }

        .lp-divider-line {
          width: 40px;
          height: 1px;
          background: rgba(62, 150, 84, 0.4);
          margin: 24px 0;
        }

        .lp-features {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .lp-feature {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .lp-feature-icon {
          width: 28px;
          height: 28px;
          background: rgba(62, 150, 84, 0.15);
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .lp-feature-text {
          font-size: 12.5px;
          color: #7a9c84;
        }

        .lp-stats-row {
          display: flex;
          gap: 0;
          position: relative;
          z-index: 1;
        }

        .lp-stat {
          flex: 1;
          padding: 16px 0;
          border-top: 1px solid rgba(255,255,255,0.06);
        }

        .lp-stat + .lp-stat {
          border-left: 1px solid rgba(255,255,255,0.06);
          padding-left: 18px;
        }

        .lp-stat-num {
          font-size: 20px;
          font-weight: 600;
          color: #dff0e2;
          letter-spacing: -0.5px;
          line-height: 1;
          margin-bottom: 4px;
        }

        .lp-stat-label {
          font-size: 10.5px;
          color: #4e7060;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* ── RIGHT FORM PANEL ── */
        .lp-form-panel {
          grid-area: form;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 48px;
          background: #f2f6f0;
          position: relative;
          overflow-y: auto;
        }

        .lp-dots-pattern {
          position: absolute;
          top: 40px;
          right: 40px;
          opacity: 0.18;
          pointer-events: none;
        }

        .lp-form-card {
          width: 100%;
          max-width: 420px;
        }

        .lp-form-eyebrow {
          font-size: 10.5px;
          font-weight: 500;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #3e9654;
          margin-bottom: 8px;
        }

        .lp-form-title {
          font-family: 'Playfair Display', serif;
          font-size: 36px;
          font-weight: 400;
          color: #162e20;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
          line-height: 1.15;
        }

        .lp-form-subtitle {
          font-size: 13px;
          color: #6a8a74;
          margin-bottom: 36px;
        }

        .lp-error-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: #fff5f5;
          border: 1px solid #fcc;
          border-left: 3px solid #e05252;
          border-radius: 8px;
          padding: 11px 14px;
          margin-bottom: 20px;
          animation: slideDown 0.2s ease;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .lp-error-text {
          font-size: 12.5px;
          color: #b91c1c;
          line-height: 1.5;
        }

        /* Field */
        .lp-field {
          margin-bottom: 16px;
        }

        .lp-field-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 7px;
        }

        .lp-label-text {
          font-size: 11.5px;
          font-weight: 500;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: #3a5e47;
        }

        .lp-input-wrap {
          position: relative;
        }

        .lp-input-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: #90b09a;
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        .lp-input {
          width: 100%;
          height: 48px;
          background: #fff;
          border: 1.5px solid #cde0d4;
          border-radius: 10px;
          padding: 0 14px 0 42px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #162e20;
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s;
          box-shadow: 0 1px 2px rgba(22, 46, 32, 0.04);
        }

        .lp-input::placeholder {
          color: #aac5b3;
          font-weight: 300;
        }

        .lp-input:hover {
          border-color: #9ecba8;
        }

        .lp-input:focus {
          border-color: #3e9654;
          box-shadow: 0 0 0 3px rgba(62, 150, 84, 0.13);
        }

        .lp-input.lp-input-error {
          border-color: #e05252;
          box-shadow: 0 0 0 3px rgba(224, 82, 82, 0.1);
        }

        .lp-field-error {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 6px;
          font-size: 12px;
          color: #c0392b;
          animation: slideDown 0.15s ease;
        }

        .lp-input-pr {
          padding-right: 44px;
        }

        .lp-eye-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #90b09a;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color 0.15s;
        }

        .lp-eye-toggle:hover {
          color: #3e9654;
        }

        /* Forgot link inline with label */
        .lp-forgot {
          font-size: 11.5px;
          color: #3e9654;
          text-decoration: none;
          font-weight: 500;
          transition: opacity 0.15s;
        }
        .lp-forgot:hover { opacity: 0.7; }

        /* Remember row */
        .lp-remember-row {
          display: flex;
          align-items: center;
          margin-bottom: 24px;
        }

        .lp-check-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          user-select: none;
        }

        .lp-checkbox {
          width: 17px;
          height: 17px;
          border: 1.5px solid #bcd8c4;
          border-radius: 5px;
          appearance: none;
          cursor: pointer;
          position: relative;
          background: #fff;
          flex-shrink: 0;
          transition: border-color 0.15s, background 0.15s;
        }

        .lp-checkbox:checked {
          background: #3e9654;
          border-color: #3e9654;
        }

        .lp-checkbox:checked::after {
          content: '';
          position: absolute;
          left: 4px;
          top: 2px;
          width: 5px;
          height: 9px;
          border: 2px solid #fff;
          border-top: none;
          border-left: none;
          transform: rotate(45deg);
        }

        .lp-check-text {
          font-size: 13px;
          color: #5a7d66;
        }

        /* Submit button */
        .lp-submit {
          width: 100%;
          height: 50px;
          background: #162e20;
          border: none;
          border-radius: 11px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #dff0e2;
          letter-spacing: 0.2px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          position: relative;
          overflow: hidden;
          transition: background 0.2s, transform 0.1s;
          margin-bottom: 14px;
        }

        .lp-submit::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, transparent 0%, rgba(62,150,84,0.1) 100%);
          pointer-events: none;
        }

        .lp-submit:hover:not(:disabled) {
          background: #1e3e2c;
        }

        .lp-submit:active:not(:disabled) {
          transform: scale(0.99);
        }

        .lp-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }





        .lp-spinner {
          width: 17px;
          height: 17px;
          border: 2px solid rgba(223, 240, 226, 0.25);
          border-top-color: #dff0e2;
          border-radius: 50%;
          animation: spin 0.65s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* SSO */
        .lp-sso {
          width: 100%;
          height: 46px;
          background: #fff;
          border: 1.5px solid #cde0d4;
          border-radius: 11px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 500;
          color: #2e5239;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          transition: border-color 0.18s, background 0.18s;
          box-shadow: 0 1px 2px rgba(22, 46, 32, 0.04);
        }

        .lp-sso:hover {
          border-color: #3e9654;
          background: #f8fbf8;
        }

        /* Footer */
        .lp-form-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 28px;
        }

        @media (max-width: 800px) {
          .lp-root {
            grid-template-columns: minmax(0, 1fr);
            grid-template-rows: 38px minmax(0, 1fr);
            grid-template-areas: "titlebar" "form";
            min-height: 100vh;
            height: auto;
          }

          .lp-sidebar {
            display: none;
          }

          .lp-form-panel {
            min-width: 0;
            padding: 32px 20px;
            align-items: flex-start;
            overflow-y: auto;
          }

          .lp-form-card {
            width: 100%;
            max-width: 420px;
            margin: 0 auto;
          }

          .lp-form-title {
            font-size: 27px;
          }
        }

        .lp-footer-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: #90a898;
        }

        .lp-footer-sep {
          width: 3px;
          height: 3px;
          background: #c0d4c8;
          border-radius: 50%;
        }
      `}</style>

      <main className="lp-root">
        {/* ── TITLE BAR ── */}
        <header
          className="lp-titlebar"
          onMouseDown={(e) => {
            if (!(e.target as HTMLElement).closest("button")) {
              void getCurrentWindow().startDragging();
            }
          }}
        >
          <WindowControls />
        </header>

        {/* ── SIDEBAR ── */}
        <aside className="lp-sidebar" aria-label="Apresentação do ERP Venture">
          <div className="lp-logo">
            <div className="lp-logo-mark">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
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
                  fill="rgba(255,255,255,0.4)"
                />
                <rect
                  x="2"
                  y="11"
                  width="7"
                  height="7"
                  rx="1.5"
                  fill="rgba(255,255,255,0.4)"
                />
                <rect
                  x="11"
                  y="11"
                  width="7"
                  height="7"
                  rx="1.5"
                  fill="rgba(255,255,255,0.7)"
                />
              </svg>
            </div>
            <span className="lp-logo-name">
              Venture <span className="lp-logo-sub">ERP &amp; Soluções</span>
            </span>
          </div>

          <div className="lp-sidebar-body">
            <div className="lp-pill">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path
                  d="M6 1l1.3 2.6L10 4.1 8 6.1l.5 2.9L6 7.6l-2.5 1.4L4 6.1 2 4.1l2.7-.5L6 1z"
                  fill="#7ecb8f"
                />
              </svg>
              <span className="lp-pill-text">Plataforma Empresarial</span>
            </div>

            <h1 className="lp-headline">
              Gestão <em>inteligente</em>
              <br />
              para sua empresa
              <br />
              crescer.
            </h1>

            <p className="lp-tagline">
              Módulos integrados de finanças, estoque, RH e operações —
              projetados para eficiência real.
            </p>

            <div className="lp-divider-line" />

            <div className="lp-features">
              {[
                {
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M2 8h12M8 2v12"
                        stroke="#3e9654"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  ),
                  text: "Dashboards em tempo real",
                },
                {
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <rect
                        x="2"
                        y="2"
                        width="5.5"
                        height="5.5"
                        rx="1.2"
                        stroke="#3e9654"
                        strokeWidth="1.3"
                      />
                      <rect
                        x="8.5"
                        y="2"
                        width="5.5"
                        height="5.5"
                        rx="1.2"
                        stroke="#3e9654"
                        strokeWidth="1.3"
                      />
                      <rect
                        x="2"
                        y="8.5"
                        width="5.5"
                        height="5.5"
                        rx="1.2"
                        stroke="#3e9654"
                        strokeWidth="1.3"
                      />
                      <rect
                        x="8.5"
                        y="8.5"
                        width="5.5"
                        height="5.5"
                        rx="1.2"
                        stroke="#3e9654"
                        strokeWidth="1.3"
                      />
                    </svg>
                  ),
                  text: "Mais de 240 integrações",
                },
                {
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M8 1.5L2 4v4c0 3 2.5 5.5 6 6 3.5-.5 6-3 6-6V4L8 1.5z"
                        stroke="#3e9654"
                        strokeWidth="1.3"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ),
                  text: "Certificação ISO 27001",
                },
              ].map((f, i) => (
                <div className="lp-feature" key={i}>
                  <div className="lp-feature-icon">{f.icon}</div>
                  <span className="lp-feature-text">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lp-stats-row">
            {[
              { num: "99.9%", label: "Uptime SLA" },
              { num: "+240", label: "Integrações" },
              { num: "v4.2", label: "Versão atual" },
            ].map((s, i) => (
              <div className="lp-stat" key={i}>
                <div className="lp-stat-num">{s.num}</div>
                <div className="lp-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* ── FORM PANEL ── */}
        <section
          className="lp-form-panel"
          aria-label="Formulário de autenticação"
        >
          {/* Dots decorativos */}
          <svg
            className="lp-dots-pattern"
            width="88"
            height="88"
            viewBox="0 0 88 88"
            fill="none"
          >
            {[0, 1, 2, 3, 4].map((row) =>
              [0, 1, 2, 3, 4].map((col) => (
                <circle
                  key={`${row}-${col}`}
                  cx={col * 22 + 11}
                  cy={row * 22 + 11}
                  r="2.5"
                  fill="#3e9654"
                />
              )),
            )}
          </svg>

          <div className="lp-form-card">
            <p className="lp-form-eyebrow">Acesso Corporativo</p>
            <h2 className="lp-form-title">Bem-vindo de volta.</h2>
            <p className="lp-form-subtitle">
              Insira suas credenciais para continuar.
            </p>

            {errorMessage && (
              <div className="lp-error-box" role="alert">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 16 16"
                  fill="none"
                  style={{ flexShrink: 0, marginTop: 1 }}
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="6.5"
                    stroke="#e05252"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M8 5v3.5M8 10.5h.01"
                    stroke="#e05252"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="lp-error-text">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Usuário / E-mail */}
              <div className="lp-field">
                <div className="lp-field-label">
                  <span className="lp-label-text">Usuário / E-mail</span>
                </div>
                <div className="lp-input-wrap">
                  <span className="lp-input-icon">
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                      <rect
                        x="1.5"
                        y="3.5"
                        width="13"
                        height="9"
                        rx="2"
                        stroke="#90b09a"
                        strokeWidth="1.3"
                      />
                      <path
                        d="M1.5 6.5l6.5 4 6.5-4"
                        stroke="#90b09a"
                        strokeWidth="1.3"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <input
                    id="email"
                    className={`lp-input${fieldErrors.email ? " lp-input-error" : ""}`}
                    type="text"
                    placeholder="voce@empresa.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFieldErrors((p) => ({ ...p, email: undefined }));
                    }}
                    autoComplete="username"
                    required
                  />
                </div>
                {fieldErrors.email && (
                  <span className="lp-field-error">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <circle
                        cx="6"
                        cy="6"
                        r="5"
                        stroke="#c0392b"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M6 3.5v3M6 8h.01"
                        stroke="#c0392b"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                    </svg>
                    {fieldErrors.email}
                  </span>
                )}
              </div>

              {/* Senha */}
              <div className="lp-field">
                <div className="lp-field-label">
                  <span className="lp-label-text">Senha</span>
                  <a href="#" className="lp-forgot">
                    Esqueci a senha
                  </a>
                </div>
                <div className="lp-input-wrap">
                  <span className="lp-input-icon">
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                      <rect
                        x="3"
                        y="7"
                        width="10"
                        height="7.5"
                        rx="1.5"
                        stroke="#90b09a"
                        strokeWidth="1.3"
                      />
                      <path
                        d="M5.5 7V5a2.5 2.5 0 015 0v2"
                        stroke="#90b09a"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <input
                    id="password"
                    className={`lp-input lp-input-pr${fieldErrors.password ? " lp-input-error" : ""}`}
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFieldErrors((p) => ({ ...p, password: undefined }));
                    }}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="lp-eye-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Ocultar senha" : "Mostrar senha"
                    }
                  >
                    {showPassword ? (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M2 2l12 12M6.7 6.8A2 2 0 009.3 9.2M4 4.5C2.5 5.8 1.5 7.5 1.5 7.5S4 12 8 12c1.1 0 2.1-.3 3-.8M6.5 3.2C7 3.1 7.5 3 8 3c4 0 6.5 4.5 6.5 4.5s-.7 1.4-2 2.6"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="8"
                          cy="8"
                          r="2"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <span className="lp-field-error">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <circle
                        cx="6"
                        cy="6"
                        r="5"
                        stroke="#c0392b"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M6 3.5v3M6 8h.01"
                        stroke="#c0392b"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                    </svg>
                    {fieldErrors.password}
                  </span>
                )}
              </div>

              {/* Lembrar */}
              <div className="lp-remember-row">
                <label className="lp-check-label">
                  <input type="checkbox" className="lp-checkbox" />
                  <span className="lp-check-text">Manter conectado</span>
                </label>
              </div>

              {/* Botão principal */}
              <button
                type="submit"
                className="lp-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="lp-spinner" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <span>Entrar na plataforma</span>
                )}
              </button>

              {/* SSO */}
              <button type="button" className="lp-sso">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect
                    x="1"
                    y="1"
                    width="6.5"
                    height="6.5"
                    rx="1.2"
                    fill="#3e9654"
                    opacity="0.75"
                  />
                  <rect
                    x="8.5"
                    y="1"
                    width="6.5"
                    height="6.5"
                    rx="1.2"
                    fill="#162e20"
                    opacity="0.5"
                  />
                  <rect
                    x="1"
                    y="8.5"
                    width="6.5"
                    height="6.5"
                    rx="1.2"
                    fill="#162e20"
                    opacity="0.5"
                  />
                  <rect
                    x="8.5"
                    y="8.5"
                    width="6.5"
                    height="6.5"
                    rx="1.2"
                    fill="#3e9654"
                    opacity="0.75"
                  />
                </svg>
                Entrar com SSO corporativo
              </button>
            </form>

            <div className="lp-form-footer">
              <span className="lp-footer-badge">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <rect
                    x="3"
                    y="7"
                    width="10"
                    height="7.5"
                    rx="1.5"
                    stroke="#90a898"
                    strokeWidth="1.3"
                  />
                  <path
                    d="M5.5 7V5a2.5 2.5 0 015 0v2"
                    stroke="#90a898"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
                TLS 1.3
              </span>
              <div className="lp-footer-sep" />
              <span className="lp-footer-badge">ISO 27001</span>
              <div className="lp-footer-sep" />
              <span className="lp-footer-badge">v4.2.1</span>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormGrupo {
  codigo: string;
  descricao: string;
  empresa: string;
}

const formInicial: FormGrupo = {
  codigo: "",
  descricao: "",
  empresa: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Vent0204Page(): JSX.Element {
  const [form, setForm] = useState<FormGrupo>(formInicial);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormGrupo, string>>
  >({});

  const setField = useCallback(
    <K extends keyof FormGrupo>(key: K, value: FormGrupo[K]) => {
      setForm((p) => ({ ...p, [key]: value }));
      setErrors((p) => ({ ...p, [key]: undefined }));
    },
    [],
  );

  function validate(): boolean {
    const e: Partial<Record<keyof FormGrupo, string>> = {};
    if (!form.codigo.trim()) e.codigo = "Código obrigatório.";
    if (!form.descricao.trim()) e.descricao = "Descrição obrigatória.";
    if (!form.empresa.trim()) e.empresa = "Empresa obrigatória.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSalvar() {
    if (!validate()) return;
    setIsSaving(true);
    setFeedback(null);
    // Conectar ao backend: grupoService.salvar(form)
    setTimeout(() => {
      setIsSaving(false);
      setFeedback("success");
      setTimeout(() => setFeedback(null), 4000);
    }, 700);
  }

  function handleLimpar() {
    setForm(formInicial);
    setErrors({});
    setFeedback(null);
  }

  const errCount = Object.keys(errors).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .vg-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        /* TOPBAR */
        .vg-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .vg-topbar-left { display: flex; align-items: center; gap: 10px; }
        .vg-logo-mark { width: 28px; height: 28px; background: #3e9654; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
        .vg-app-name  { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .vg-app-sub   { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .vg-screen-title { font-size: 12.5px; font-weight: 500; color: #5a9a6a; padding-left: 14px; margin-left: 14px; border-left: 1px solid rgba(255,255,255,0.08); }

        /* ACTION BAR */
        .vg-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center; gap: 4px;
          height: 46px; flex-shrink: 0;
        }
        .vg-action-group { display: flex; align-items: center; gap: 2px; padding-right: 10px; margin-right: 6px; border-right: 1px solid #e8f0e4; }
        .vg-action-group:last-child { border-right: none; }
        .vg-action-label { font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; color: #96b8a0; margin-right: 6px; white-space: nowrap; }
        .vg-nav-btn { width: 30px; height: 30px; border-radius: 6px; display: flex; align-items: center; justify-content: center; background: transparent; border: 1.5px solid #d4e8d0; cursor: pointer; color: #4a7060; transition: background 0.12s; }
        .vg-nav-btn:hover { background: #edf7ea; border-color: #a0c8a8; }
        .vg-btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 1.5px solid transparent; border-radius: 7px; font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: background 0.13s, border-color 0.13s; }
        .vg-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .vg-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .vg-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .vg-btn-ghost  { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .vg-btn-ghost:hover { background: #f0f8ec; border-color: #b0d4b8; }
        .vg-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .vg-btn-danger:hover { background: #fff0f0; border-color: #e09090; }

        /* BODY */
        .vg-body { flex: 1; padding: 24px 20px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
        .vg-body::-webkit-scrollbar { width: 5px; }
        .vg-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        /* CARD */
        .vg-card { background: #fff; border: 1px solid #dbe8d5; border-radius: 12px; overflow: hidden; max-width: 680px; }
        .vg-card-header { display: flex; align-items: center; justify-content: space-between; padding: 13px 20px; border-bottom: 1px solid #edf5e8; background: #fafcf9; }
        .vg-card-header-left { display: flex; align-items: center; gap: 8px; }
        .vg-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .vg-card-badge { font-size: 10.5px; font-weight: 500; color: #3e9654; background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px; }
        .vg-err-badge { font-size: 10.5px; font-weight: 600; color: #b94040; background: #fdecea; border: 1px solid #f0c8c8; border-radius: 12px; padding: 2px 8px; }
        .vg-card-body { padding: 24px 20px; }

        /* FIELDS */
        .vg-stack { display: flex; flex-direction: column; gap: 18px; }
        .vg-field { display: flex; flex-direction: column; gap: 5px; }
        .vg-label { font-size: 10.5px; font-weight: 600; color: #5a8068; text-transform: uppercase; letter-spacing: 0.4px; display: flex; align-items: center; gap: 4px; }
        .vg-label-req { color: #c84040; font-size: 12px; line-height: 1; }
        .vg-field-hint { font-size: 11px; color: #96b8a0; line-height: 1.5; }
        .vg-field-error { font-size: 11px; color: #c84040; display: flex; align-items: center; gap: 4px; }

        .vg-input {
          width: 100%; height: 38px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 8px;
          padding: 0 12px; font-family: 'Inter', sans-serif;
          font-size: 13.5px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .vg-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .vg-input::placeholder { color: #b0c8b8; font-size: 12.5px; }
        .vg-input.err { border-color: #e05252; box-shadow: 0 0 0 2px rgba(224,82,82,0.1); }

        .vg-input-wrap { display: flex; }
        .vg-input-btn { height: 38px; width: 36px; flex-shrink: 0; background: #edf5ea; border: 1.5px solid #d4e8cc; border-left: none; border-radius: 0 8px 8px 0; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #4a8060; transition: background 0.12s; }
        .vg-input-btn:hover { background: #ddf0e0; }

        /* Feedback */
        .vg-feedback { display: flex; align-items: center; gap: 9px; padding: 11px 15px; border-radius: 9px; font-size: 13px; animation: vgFade 0.2s ease; max-width: 680px; }
        .vg-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .vg-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }

        /* Footer */
        .vg-footer { background: #fff; border-top: 1px solid #dbe8d5; padding: 8px 20px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .vg-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .vg-footer-stat strong { color: #1a2e22; font-weight: 600; }
        .vg-footer-group { display: flex; align-items: center; gap: 20px; }

        /* Spinner */
        @keyframes spin { to { transform: rotate(360deg); } }
        .vg-spinner { width: 14px; height: 14px; border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2; border-radius: 50%; animation: spin 0.65s linear infinite; flex-shrink: 0; }
        @keyframes vgFade { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="vg-root">
        {/* TOPBAR */}
        <header className="vg-topbar">
          <div className="vg-topbar-left">
            <div className="vg-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
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
            <span className="vg-app-name">
              Venture
              <span className="vg-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="vg-screen-title">
              VENT0204 — Cadastro de Grupo
            </span>
          </div>
        </header>

        {/* ACTION BAR */}
        <div className="vg-actionbar">
          <div className="vg-action-group">
            <span className="vg-action-label">Nav</span>
            {[
              { title: "Primeiro", path: "M9 2L3 6l6 4M2 2v8" },
              { title: "Anterior", path: "M8 2L4 6l4 4" },
              { title: "Próximo", path: "M4 2l4 4-4 4" },
              { title: "Último", path: "M3 2l6 4-6 4M10 2v8" },
            ].map(({ title, path }) => (
              <button key={title} className="vg-nav-btn" title={title}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d={path}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ))}
          </div>

          <div className="vg-action-group">
            <span className="vg-action-label">Ações</span>
            <button
              className="vg-btn vg-btn-primary"
              onClick={handleSalvar}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="vg-spinner" />
                  Salvando...
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5 2v4h6V2M5 9h6"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                  Salvar
                </>
              )}
            </button>
            <button className="vg-btn vg-btn-danger" onClick={handleLimpar}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 3l10 10M13 3L3 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Limpar
            </button>
            <button className="vg-btn vg-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Apagar
            </button>
          </div>

          <div className="vg-action-group">
            <span className="vg-action-label">Ferramentas</span>
            <button className="vg-btn vg-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M8 7v4M8 5.5h.01"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              Ajuda
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="vg-body">
          {feedback === "success" && (
            <div className="vg-feedback success">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 8l3.5 3.5L13 5"
                  stroke="#1e6030"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Grupo salvo com sucesso.
            </div>
          )}

          {errCount > 0 && (
            <div className="vg-feedback error">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
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
              </svg>
              {errCount} campo{errCount > 1 ? "s" : ""} obrigatório
              {errCount > 1 ? "s" : ""} não preenchido{errCount > 1 ? "s" : ""}.
            </div>
          )}

          <div className="vg-card">
            <div className="vg-card-header">
              <div className="vg-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect
                    x="1"
                    y="4"
                    width="14"
                    height="9"
                    rx="1.5"
                    stroke="#3e9654"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M5 4V3a3 3 0 016 0v1"
                    stroke="#3e9654"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="vg-card-title">Cadastro de Grupo</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {errCount > 0 && (
                  <span className="vg-err-badge">
                    {errCount} erro{errCount > 1 ? "s" : ""}
                  </span>
                )}
                <span className="vg-card-badge">VENT0204</span>
              </div>
            </div>

            <div className="vg-card-body">
              <div className="vg-stack">
                {/* Código */}
                <div className="vg-field">
                  <label className="vg-label">
                    Código <span className="vg-label-req">*</span>
                  </label>
                  <input
                    className={`vg-input${errors.codigo ? " err" : ""}`}
                    value={form.codigo}
                    onChange={(e) =>
                      setField("codigo", e.target.value.toUpperCase())
                    }
                    placeholder="Ex: GRP001"
                    maxLength={20}
                    style={{ maxWidth: 220 }}
                  />
                  {errors.codigo ? (
                    <span className="vg-field-error">
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <circle
                          cx="6"
                          cy="6"
                          r="5"
                          stroke="#c84040"
                          strokeWidth="1.2"
                        />
                        <path
                          d="M6 4v2.5M6 8h.01"
                          stroke="#c84040"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />
                      </svg>
                      {errors.codigo}
                    </span>
                  ) : (
                    <span className="vg-field-hint">
                      Identificador único do grupo no sistema.
                    </span>
                  )}
                </div>

                {/* Descrição */}
                <div className="vg-field">
                  <label className="vg-label">
                    Descrição <span className="vg-label-req">*</span>
                  </label>
                  <input
                    className={`vg-input${errors.descricao ? " err" : ""}`}
                    value={form.descricao}
                    onChange={(e) => setField("descricao", e.target.value)}
                    placeholder="Ex: Matérias-primas metálicas"
                    maxLength={100}
                  />
                  {errors.descricao ? (
                    <span className="vg-field-error">
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <circle
                          cx="6"
                          cy="6"
                          r="5"
                          stroke="#c84040"
                          strokeWidth="1.2"
                        />
                        <path
                          d="M6 4v2.5M6 8h.01"
                          stroke="#c84040"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />
                      </svg>
                      {errors.descricao}
                    </span>
                  ) : (
                    <span className="vg-field-hint">
                      Nome completo e descritivo do grupo.
                    </span>
                  )}
                </div>

                {/* Empresa */}
                <div className="vg-field">
                  <label className="vg-label">
                    Empresa <span className="vg-label-req">*</span>
                  </label>
                  <div className="vg-input-wrap" style={{ maxWidth: 340 }}>
                    <input
                      className={`vg-input${errors.empresa ? " err" : ""}`}
                      style={{ borderRadius: "8px 0 0 8px" }}
                      value={form.empresa}
                      onChange={(e) => setField("empresa", e.target.value)}
                      placeholder="Código da empresa"
                      maxLength={10}
                    />
                    <button className="vg-input-btn" title="Buscar empresa">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
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
                    </button>
                  </div>
                  {errors.empresa ? (
                    <span className="vg-field-error">
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <circle
                          cx="6"
                          cy="6"
                          r="5"
                          stroke="#c84040"
                          strokeWidth="1.2"
                        />
                        <path
                          d="M6 4v2.5M6 8h.01"
                          stroke="#c84040"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />
                      </svg>
                      {errors.empresa}
                    </span>
                  ) : (
                    <span className="vg-field-hint">
                      Empresa à qual este grupo pertence.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="vg-footer">
          <div className="vg-footer-group">
            <div className="vg-footer-stat">
              Código: <strong>{form.codigo || "—"}</strong>
            </div>
            <div className="vg-footer-stat">
              Empresa: <strong>{form.empresa || "—"}</strong>
            </div>
          </div>
          <div className="vg-footer-stat">
            Sistema: <strong>GRUPO VENTURE LTDA</strong>
          </div>
        </footer>
      </div>
    </>
  );
}

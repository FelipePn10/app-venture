import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  MACHINE_TYPE_ENUMS,
  machineTypeLabel,
  listMachineTypes,
  createMachineType,
  type MachineType,
} from "@/services/machineTypeService";
import { useAuthStore } from "@/store/authStore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveUserId(id: string | undefined, token: string | null): string {
  if (id) return id;
  if (!token) return "";
  try {
    const part = token.split(".")[1];
    if (!part) return "";
    const p = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, unknown>;
    return String(p["sub"] ?? p["id"] ?? p["user_id"] ?? "");
  } catch { return ""; }
}

function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data as Record<string, unknown> | undefined;
    const msg = (data?.message ?? data?.error ?? data?.msg) as string | undefined;
    if (msg) return `Erro ${status ?? ""}: ${msg}`.trim();
    if (status === 401) return "Sessão expirada. Faça login novamente.";
    if (status === 403) return "Sem permissão.";
    if (!err.response) return "Servidor indisponível.";
    return `Erro HTTP ${status ?? "desconhecido"}.`;
  }
  return err instanceof Error ? err.message : "Erro desconhecido.";
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Feedback = { type: "success" | "error"; message: string } | null;

interface Form {
  code: string;
  name: string;
  description: string;
  type: string;
  is_active: boolean;
}

const EMPTY: Form = { code: "", name: "", description: "", type: "CUT", is_active: true };

const TYPE_COLORS: Record<string, string> = {
  CUT: "#ef4444", BEND: "#f97316", WELD: "#eab308", ASSEMBLE: "#22c55e",
  PAINT: "#3b82f6", LATHE: "#8b5cf6", MILL: "#06b6d4", PRESS: "#ec4899", INJECT: "#14b8a6",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Vmaq0101Page(): JSX.Element {
  const user  = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.token);

  const [types,     setTypes]     = useState<MachineType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving,  setIsSaving]  = useState(false);
  const [feedback,  setFeedback]  = useState<Feedback>(null);
  const [form,      setForm]      = useState<Form>({ ...EMPTY });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setTypes(await listMachineTypes());
    } catch (err) {
      setFeedback({ type: "error", message: extractErrorMessage(err) });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm(p => ({ ...p, [k]: v }));
  }

  async function handleSalvar() {
    if (!form.code || !form.name.trim() || !form.type) {
      setFeedback({ type: "error", message: "Preencha: Código, Nome e Tipo." });
      return;
    }
    const code = parseInt(form.code, 10);
    if (isNaN(code) || code <= 0) {
      setFeedback({ type: "error", message: "Código deve ser um número positivo." });
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      await createMachineType({
        code,
        name: form.name.trim(),
        description: form.description.trim() || null,
        type: form.type,
        created_by: resolveUserId(user?.id, token),
        is_active: form.is_active,
      });
      setFeedback({ type: "success", message: `Tipo "${form.name.trim()}" cadastrado com sucesso.` });
      setForm({ ...EMPTY });
      void load();
    } catch (err) {
      setFeedback({ type: "error", message: extractErrorMessage(err) });
    } finally {
      setIsSaving(false);
    }
  }

  const activeCount   = types.filter(t => t.is_active).length;
  const inactiveCount = types.length - activeCount;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .mtp-root { min-height: 100vh; background: #f0f4ee; font-family: 'Inter', sans-serif; color: #1a2e22; display: flex; flex-direction: column; }

        /* TOPBAR */
        .mtp-topbar { height: 52px; background: #162e20; display: flex; align-items: center; justify-content: space-between; padding: 0 110px 0 20px; flex-shrink: 0; border-bottom: 1px solid rgba(62,150,84,0.15); }
        .mtp-topbar-left { display: flex; align-items: center; gap: 10px; }
        .mtp-logo { width: 28px; height: 28px; background: #3e9654; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
        .mtp-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .mtp-app-sub { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .mtp-screen-title { font-size: 12.5px; font-weight: 500; color: #5a9a6a; padding-left: 14px; margin-left: 14px; border-left: 1px solid rgba(255,255,255,0.08); }
        .mtp-badge { font-size: 10px; font-weight: 700; letter-spacing: 0.8px; background: rgba(62,150,84,0.15); color: #7ecb8f; border: 1px solid rgba(62,150,84,0.25); border-radius: 5px; padding: 3px 8px; }

        /* ACTIONBAR */
        .mtp-actionbar { background: #fff; border-bottom: 1px solid #dbe8d5; padding: 0 20px; display: flex; align-items: center; gap: 6px; height: 46px; flex-shrink: 0; }
        .mtp-btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 1.5px solid transparent; border-radius: 7px; font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: background 0.13s, border-color 0.13s; }
        .mtp-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .mtp-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .mtp-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .mtp-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .mtp-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; }
        .mtp-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .mtp-sep { width: 1px; height: 20px; background: #e8f0e4; margin: 0 4px; }
        .mtp-spinner { width: 14px; height: 14px; flex-shrink: 0; border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2; border-radius: 50%; animation: mtpSpin 0.65s linear infinite; }
        .mtp-spin { width: 18px; height: 18px; border: 2px solid #d4e8cc; border-top-color: #3e9654; border-radius: 50%; animation: mtpSpin 0.65s linear infinite; }
        @keyframes mtpSpin { to { transform: rotate(360deg); } }

        /* BODY */
        .mtp-body { flex: 1; display: grid; grid-template-columns: 380px 1fr; gap: 16px; padding: 16px 20px; overflow: auto; align-items: start; }
        .mtp-body::-webkit-scrollbar { width: 5px; }
        .mtp-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }
        .mtp-feedback { grid-column: 1 / -1; display: flex; align-items: center; gap: 9px; padding: 11px 15px; border-radius: 9px; font-size: 13px; animation: mtpFade 0.2s ease; }
        .mtp-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .mtp-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        @keyframes mtpFade { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

        /* CARD */
        .mtp-card { background: #fff; border: 1px solid #dbe8d5; border-radius: 12px; overflow: hidden; }
        .mtp-card-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9; }
        .mtp-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .mtp-card-badge { font-size: 10.5px; font-weight: 500; color: #3e9654; background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px; }
        .mtp-card-body { padding: 18px; }

        /* FORM */
        .mtp-form-fields { display: flex; flex-direction: column; gap: 13px; }
        .mtp-row { display: flex; gap: 12px; }
        .mtp-field { display: flex; flex-direction: column; gap: 5px; flex: 1; }
        .mtp-label { font-size: 10.5px; font-weight: 600; color: #5a8068; text-transform: uppercase; letter-spacing: 0.4px; }
        .mtp-req { color: #c84040; font-size: 12px; }
        .mtp-input, .mtp-select, .mtp-textarea {
          background: #f8fbf6; border: 1.5px solid #d4e8cc; border-radius: 7px;
          font-family: 'Inter', sans-serif; font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .mtp-input, .mtp-select { height: 36px; padding: 0 10px; }
        .mtp-input:focus, .mtp-select:focus, .mtp-textarea:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .mtp-input::placeholder, .mtp-textarea::placeholder { color: #b0c8b8; font-size: 12px; }
        .mtp-select { appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px; }
        .mtp-textarea { padding: 8px 10px; resize: vertical; min-height: 70px; }
        .mtp-toggle-row { display: flex; align-items: center; gap: 10px; }
        .mtp-toggle { position: relative; width: 38px; height: 20px; flex-shrink: 0; }
        .mtp-toggle input { opacity: 0; width: 0; height: 0; }
        .mtp-toggle-slider { position: absolute; inset: 0; background: #d4e8cc; border-radius: 20px; transition: background 0.2s; cursor: pointer; }
        .mtp-toggle-slider::before { content: ''; position: absolute; width: 14px; height: 14px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: transform 0.2s; }
        .mtp-toggle input:checked + .mtp-toggle-slider { background: #3e9654; }
        .mtp-toggle input:checked + .mtp-toggle-slider::before { transform: translateX(18px); }
        .mtp-toggle-label { font-size: 13px; color: #3a5a45; }

        /* TABLE */
        .mtp-table-wrap { overflow-x: auto; }
        .mtp-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 400px; }
        .mtp-table th { padding: 8px 12px; text-align: left; font-size: 10.5px; font-weight: 700; color: #5a8068; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #dbe8d5; background: #f4f9f2; white-space: nowrap; }
        .mtp-table td { padding: 10px 12px; font-size: 13px; color: #1a2e22; border-bottom: 1px solid #f0f6ec; }
        .mtp-table tr:last-child td { border-bottom: none; }
        .mtp-table tr:hover td { background: #fafdf8; }
        .mtp-type-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; padding: 3px 9px; border-radius: 20px; }
        .mtp-status-dot { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; }
        .mtp-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .mtp-dot.active   { background: #22c55e; }
        .mtp-dot.inactive { background: #d1d5db; }
        .mtp-empty { padding: 48px 20px; text-align: center; color: #8aaa94; font-size: 13px; }

        /* FOOTER */
        .mtp-footer { background: #fff; border-top: 1px solid #dbe8d5; padding: 8px 20px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .mtp-footer-left { display: flex; align-items: center; gap: 20px; }
        .mtp-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .mtp-stat strong { color: #1a2e22; font-weight: 600; }
      `}</style>

      <div className="mtp-root">

        {/* TOPBAR */}
        <header className="mtp-topbar">
          <div className="mtp-topbar-left">
            <div className="mtp-logo">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5"   width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5"  width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5"  width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="mtp-app-name">Venture <span className="mtp-app-sub">ERP &amp; Soluções</span></span>
            <span className="mtp-screen-title">VMAQ0101 — Cadastro de Tipos de Máquina</span>
          </div>
          <span className="mtp-badge">ENGENHARIA</span>
        </header>

        {/* ACTIONBAR */}
        <div className="mtp-actionbar">
          <button className="mtp-btn mtp-btn-ghost" onClick={() => { setForm({ ...EMPTY }); setFeedback(null); }} disabled={isSaving}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Novo
          </button>
          <div className="mtp-sep" />
          <button className="mtp-btn mtp-btn-primary" onClick={() => void handleSalvar()} disabled={isSaving || isLoading}>
            {isSaving
              ? <><div className="mtp-spinner"/>Salvando...</>
              : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>Salvar</>}
          </button>
          <div className="mtp-sep" />
          <button className="mtp-btn mtp-btn-ghost" onClick={() => void load()} disabled={isLoading || isSaving}>
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M10 6A4 4 0 1 1 6 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M6 2l2-2M6 2L4 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {isLoading ? "Carregando..." : "Recarregar"}
          </button>
        </div>

        {/* BODY */}
        <div className="mtp-body">

          {feedback && (
            <div className={`mtp-feedback ${feedback.type}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === "success"
                  ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  : <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4"/><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round"/></>}
              </svg>
              {feedback.message}
            </div>
          )}

          {/* FORM */}
          <div className="mtp-card">
            <div className="mtp-card-header">
              <span className="mtp-card-title">Novo Tipo</span>
              <span className="mtp-card-badge">VMAQ0101</span>
            </div>
            <div className="mtp-card-body">
              <div className="mtp-form-fields">
                <div className="mtp-row">
                  <div className="mtp-field" style={{ maxWidth: 110 }}>
                    <label className="mtp-label">Código <span className="mtp-req">*</span></label>
                    <input className="mtp-input" type="number" min={1} placeholder="Ex.: 1" value={form.code} onChange={e => set("code", e.target.value)} />
                  </div>
                  <div className="mtp-field">
                    <label className="mtp-label">Nome <span className="mtp-req">*</span></label>
                    <input className="mtp-input" type="text" placeholder="Ex.: Serra Fita" value={form.name} onChange={e => set("name", e.target.value)} />
                  </div>
                </div>

                <div className="mtp-field">
                  <label className="mtp-label">Tipo <span className="mtp-req">*</span></label>
                  <select className="mtp-select" value={form.type} onChange={e => set("type", e.target.value)}>
                    {MACHINE_TYPE_ENUMS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="mtp-field">
                  <label className="mtp-label">Descrição</label>
                  <textarea className="mtp-textarea" placeholder="Opcional — descreva o tipo de máquina..." value={form.description} onChange={e => set("description", e.target.value)} />
                </div>

                <div className="mtp-toggle-row">
                  <label className="mtp-toggle">
                    <input type="checkbox" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} />
                    <span className="mtp-toggle-slider" />
                  </label>
                  <span className="mtp-toggle-label">{form.is_active ? "Ativo" : "Inativo"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* LIST */}
          <div className="mtp-card">
            <div className="mtp-card-header">
              <span className="mtp-card-title">Tipos Cadastrados</span>
              <span className="mtp-card-badge">{types.length} registro(s)</span>
            </div>
            <div className="mtp-card-body" style={{ padding: 0 }}>
              {isLoading ? (
                <div className="mtp-empty" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                  <div className="mtp-spin" /> Carregando...
                </div>
              ) : types.length === 0 ? (
                <div className="mtp-empty">Nenhum tipo cadastrado. Use o formulário ao lado para criar o primeiro.</div>
              ) : (
                <div className="mtp-table-wrap">
                  <table className="mtp-table">
                    <thead>
                      <tr>
                        <th>Cód.</th>
                        <th>Nome</th>
                        <th>Tipo</th>
                        <th>Descrição</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {types.map(t => {
                        const color = TYPE_COLORS[t.type] ?? "#6b7280";
                        return (
                          <tr key={t.code}>
                            <td style={{ fontWeight: 600, color: "#3e7a54", width: 60 }}>{t.code}</td>
                            <td style={{ fontWeight: 500 }}>{t.name}</td>
                            <td>
                              <span className="mtp-type-pill" style={{ background: color + "18", color, border: `1px solid ${color}40` }}>
                                {machineTypeLabel(t.type)}
                              </span>
                            </td>
                            <td style={{ color: "#6a8a74", fontSize: 12, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {t.description ?? "—"}
                            </td>
                            <td>
                              <span className="mtp-status-dot">
                                <span className={`mtp-dot ${t.is_active ? "active" : "inactive"}`} />
                                {t.is_active ? "Ativo" : "Inativo"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <footer className="mtp-footer">
          <div className="mtp-footer-left">
            <div className="mtp-stat">Total: <strong>{types.length}</strong></div>
            <div className="mtp-stat">Ativos: <strong style={{ color: "#22c55e" }}>{activeCount}</strong></div>
            {inactiveCount > 0 && <div className="mtp-stat">Inativos: <strong style={{ color: "#9ca3af" }}>{inactiveCount}</strong></div>}
          </div>
          <div className="mtp-stat" style={{ color: "#a0b8a8" }}>VMAQ0101 · Engenharia</div>
        </footer>

      </div>
    </>
  );
}

import { useState, useEffect, useCallback } from "react";
import { humanizeApiError } from '@/services/apiError';
import {
  DEFAULT_PARAMS,
  getDeliveryPromiseParams,
  updateDeliveryPromiseParams,
  type DeliveryPromiseParams,
} from "@/services/deliveryPromiseParamsService";
import { useAuthStore } from "@/store/authStore";

function resolveUserId(id: string | undefined, token: string | null): string {
  if (id) return id;
  if (!token) return "";
  try {
    const part = token.split(".")[1];
    if (!part) return "";
    const payload = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, unknown>;
    return String(payload["sub"] ?? payload["id"] ?? payload["user_id"] ?? "");
  } catch {
    return "";
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackState = { type: "success" | "error"; message: string } | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractErrorMessage(err: unknown): string {
  return humanizeApiError(err);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Vpme0102Page(): JSX.Element {
  const user  = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [params, setParams] = useState<DeliveryPromiseParams>({ ...DEFAULT_PARAMS });
  const [original, setOriginal] = useState<DeliveryPromiseParams>({ ...DEFAULT_PARAMS });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const isDirty =
    JSON.stringify(params) !== JSON.stringify(original);

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const data = await getDeliveryPromiseParams();
      setParams(data);
      setOriginal(data);
    } catch (err) {
      console.error("[VPME0102] getDeliveryPromiseParams falhou:", err);
      const msg = extractErrorMessage(err);
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSalvar() {
    setIsSaving(true);
    setFeedback(null);
    try {
      await updateDeliveryPromiseParams({ ...params, updated_by: resolveUserId(user?.id, token) });
      setOriginal({ ...params });
      setFeedback({ type: "success", message: "Parâmetros salvos com sucesso." });
    } catch (err) {
      console.error("[VPME0102] updateDeliveryPromiseParams falhou:", err);
      setFeedback({ type: "error", message: extractErrorMessage(err) });
    } finally {
      setIsSaving(false);
    }
  }

  function handleRestaurar() {
    setParams({ ...original });
    setFeedback(null);
  }

  // ── Field helpers ─────────────────────────────────────────────────────────

  function setBool(field: keyof DeliveryPromiseParams, value: boolean) {
    setParams((p) => ({ ...p, [field]: value }));
  }

  function setStr(field: keyof DeliveryPromiseParams, value: string) {
    setParams((p) => ({ ...p, [field]: value }));
  }

  function setNum(field: keyof DeliveryPromiseParams, value: number) {
    setParams((p) => ({ ...p, [field]: value }));
  }

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .pme-root {
          min-height: 100vh; background: #dfe4e0;
          font-family: 'Inter', sans-serif; color: #1c2b22;
          display: flex; flex-direction: column;
        }

        /* ── TOPBAR ── */
        .pme-topbar {
          height: 52px; background: #16281d;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 110px 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .pme-topbar-left { display: flex; align-items: center; gap: 10px; }
        .pme-logo-mark {
          width: 28px; height: 28px; background: #2f7d47;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .pme-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .pme-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #54655a; }
        .pme-screen-title {
          font-size: 12.5px; font-weight: 500; color: #3f8a58;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }
        .pme-screen-badge {
          font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
          background: rgba(62,150,84,0.15); color: #8fce9f;
          border: 1px solid rgba(62,150,84,0.25); border-radius: 5px;
          padding: 3px 8px;
        }

        /* ── ACTION BAR ── */
        .pme-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .pme-action-group {
          display: flex; align-items: center; gap: 2px;
          padding-right: 10px; margin-right: 6px;
          border-right: 1px solid #e8f0e4;
        }
        .pme-action-group:last-child { border-right: none; }
        .pme-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #94a49a; margin-right: 6px; white-space: nowrap;
        }
        .pme-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .pme-btn-primary { background: #16281d; color: #dff0e2; border-color: #16281d; }
        .pme-btn-primary:hover:not(:disabled) { background: #1e3728; }
        .pme-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .pme-btn-ghost { background: transparent; color: #46574c; border-color: #d4e8d0; }
        .pme-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #a9b6ac; }
        .pme-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .pme-dirty-badge {
          font-size: 10.5px; font-weight: 600; color: #b86000;
          background: #fff8ec; border: 1px solid #f0d090;
          border-radius: 20px; padding: 2px 8px;
          animation: pmeFadeIn 0.2s ease;
        }

        /* ── BODY ── */
        .pme-body {
          flex: 1; padding: 16px 20px;
          display: flex; flex-direction: column; gap: 14px; overflow-y: auto;
        }
        .pme-body::-webkit-scrollbar { width: 5px; }
        .pme-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        /* ── CARD ── */
        .pme-card {
          background: #fff; border: 1px solid #dbe8d5; border-radius: 12px; overflow: hidden;
        }
        .pme-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .pme-card-header-left { display: flex; align-items: center; gap: 8px; }
        .pme-card-title { font-size: 12px; font-weight: 600; color: #253a2d; text-transform: uppercase; letter-spacing: 0.6px; }
        .pme-card-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 0; }

        /* ── PARAM ROW ── */
        .pme-param-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 13px 0; border-bottom: 1px solid #f0f6ec; gap: 20px;
        }
        .pme-param-row:last-child { border-bottom: none; }
        .pme-param-info { flex: 1; min-width: 0; }
        .pme-param-label { font-size: 13px; font-weight: 500; color: #1a3428; line-height: 1.3; }
        .pme-param-desc  { font-size: 11.5px; color: #7a9c84; margin-top: 3px; line-height: 1.4; }

        /* ── TOGGLE SWITCH ── */
        .pme-toggle-wrap { position: relative; flex-shrink: 0; }
        .pme-toggle-input {
          position: absolute; opacity: 0; width: 0; height: 0;
        }
        .pme-toggle-track {
          display: block; width: 42px; height: 24px;
          background: #d8e8d4; border-radius: 12px;
          cursor: pointer; transition: background 0.2s;
          position: relative;
        }
        .pme-toggle-track::after {
          content: ''; position: absolute;
          top: 3px; left: 3px;
          width: 18px; height: 18px; border-radius: 50%;
          background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          transition: transform 0.2s;
        }
        .pme-toggle-input:checked + .pme-toggle-track { background: #2f7d47; }
        .pme-toggle-input:checked + .pme-toggle-track::after { transform: translateX(18px); }
        .pme-toggle-input:disabled + .pme-toggle-track { opacity: 0.4; cursor: not-allowed; }
        .pme-toggle-value {
          font-size: 11px; font-weight: 600; margin-top: 4px; text-align: center;
          color: #94a49a; transition: color 0.2s;
        }
        .pme-toggle-value.on { color: #2d8040; }

        /* ── SELECT / INPUT ── */
        .pme-select {
          height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1c2b22; outline: none; appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s, box-shadow 0.13s; min-width: 200px;
        }
        .pme-select:focus { border-color: #2f7d47; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .pme-select:disabled { background-color: #dfe4e0; color: #8aaa94; cursor: not-allowed; }
        .pme-number-input {
          height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1c2b22; outline: none; width: 100px;
          transition: border-color 0.13s, box-shadow 0.13s; text-align: right;
        }
        .pme-number-input:focus { border-color: #2f7d47; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .pme-number-input:disabled { background-color: #dfe4e0; color: #8aaa94; cursor: not-allowed; }

        /* ── FEEDBACK ── */
        .pme-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: pmeFadeIn 0.2s ease;
        }
        .pme-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .pme-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }

        /* ── SKELETON / LOADING ── */
        .pme-skeleton-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 13px 0; border-bottom: 1px solid #f0f6ec; gap: 20px;
        }
        .pme-skeleton-row:last-child { border-bottom: none; }
        .pme-skeleton-block {
          border-radius: 5px; background: linear-gradient(90deg, #edf5e8 25%, #dff0da 50%, #edf5e8 75%);
          background-size: 200% 100%; animation: pmeSkeleton 1.2s infinite;
        }
        @keyframes pmeSkeleton {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ── SPINNER ── */
        .pme-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: pmeSpin 0.65s linear infinite;
        }
        @keyframes pmeSpin { to { transform: rotate(360deg); } }

        /* ── FOOTER ── */
        .pme-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .pme-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6b7d71; }
        .pme-footer-stat strong { color: #1c2b22; font-weight: 600; }

        @keyframes pmeFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="pme-root">

        {/* ── TOPBAR ── */}
        <header className="pme-topbar">
          <div className="pme-topbar-left">
            <div className="pme-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5"   width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5"  width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5"  width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="pme-app-name">
              Venture <span className="pme-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="pme-screen-title">VPME0102 — Parâmetros de Promessa de Entrega</span>
          </div>
          <span className="pme-screen-badge">ENGENHARIA</span>
        </header>

        {/* ── ACTION BAR ── */}
        <div className="pme-actionbar">
          <div className="pme-action-group">
            <span className="pme-action-label">Ações</span>
            <button
              className="pme-btn pme-btn-primary"
              disabled={isSaving || isLoading || !isDirty}
              onClick={() => void handleSalvar()}
            >
              {isSaving
                ? <><div className="pme-spinner" />Salvando...</>
                : <>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                      <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    Salvar
                  </>
              }
            </button>
            <button
              className="pme-btn pme-btn-ghost"
              disabled={isSaving || isLoading || !isDirty}
              onClick={handleRestaurar}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 8a5 5 0 105 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M3 5v3h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Restaurar
            </button>
          </div>
          <div className="pme-action-group">
            <button className="pme-btn pme-btn-ghost" onClick={() => void load()} disabled={isLoading || isSaving}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M13 8A5 5 0 113 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M13 5v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Recarregar
            </button>
          </div>
          {isDirty && !isLoading && (
            <span className="pme-dirty-badge">Alterações não salvas</span>
          )}
        </div>

        {/* ── BODY ── */}
        <div className="pme-body">

          {feedback && (
            <div className={`pme-feedback ${feedback.type}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === "success"
                  ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  : <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4" /><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round" /></>
                }
              </svg>
              {feedback.message}
            </div>
          )}

          {/* ── ATIVAÇÃO ── */}
          <div className="pme-card">
            <div className="pme-card-header">
              <div className="pme-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="5.5" stroke="#2f7d47" strokeWidth="1.4" />
                  <path d="M8 5v3l2 2" stroke="#2f7d47" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="pme-card-title">Ativação</span>
              </div>
            </div>
            <div className="pme-card-body">
              {isLoading ? <SkeletonRows count={1} /> : (
                <ParamToggle
                  label="Utilizar Promessa de Entrega"
                  desc="Habilita o módulo de promessa de entrega em todo o sistema."
                  checked={params.use_delivery_promise}
                  disabled={isSaving}
                  onChange={(v) => setBool("use_delivery_promise", v)}
                />
              )}
            </div>
          </div>

          {/* ── RESTRIÇÕES ── */}
          <div className="pme-card">
            <div className="pme-card-header">
              <div className="pme-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2L2 5v5c0 3.3 2.7 5.7 6 6 3.3-.3 6-2.7 6-6V5L8 2z" stroke="#2f7d47" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M6 8l1.5 1.5L10 6.5" stroke="#2f7d47" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="pme-card-title">Restrições</span>
              </div>
            </div>
            <div className="pme-card-body">
              {isLoading ? <SkeletonRows count={2} /> : (
                <>
                  <ParamToggle
                    label="Bloquear Pedidos na Promessa"
                    desc="Impede a inclusão de pedidos bloqueados no cálculo da promessa de entrega."
                    checked={params.blocked_orders_in_promise}
                    disabled={isSaving || !params.use_delivery_promise}
                    onChange={(v) => setBool("blocked_orders_in_promise", v)}
                  />
                  <ParamToggle
                    label="Bloquear Exportação na Promessa"
                    desc="Impede a exportação de pedidos marcados como exportação no cálculo da promessa."
                    checked={params.blocked_export_in_promise}
                    disabled={isSaving || !params.use_delivery_promise}
                    onChange={(v) => setBool("blocked_export_in_promise", v)}
                  />
                </>
              )}
            </div>
          </div>

          {/* ── COMPORTAMENTO ── */}
          <div className="pme-card">
            <div className="pme-card-header">
              <div className="pme-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="2" fill="#2f7d47" />
                  <path d="M8 2v2M8 12v2M2 8h2M12 8h2M3.5 3.5l1.5 1.5M11 11l1.5 1.5M3.5 12.5L5 11M11 5l1.5-1.5" stroke="#2f7d47" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <span className="pme-card-title">Comportamento de Processamento</span>
              </div>
            </div>
            <div className="pme-card-body">
              {isLoading ? <SkeletonRows count={4} /> : (
                <>
                  <ParamToggle
                    label="Quebrar Ocupação de Tanque"
                    desc="Permite dividir a ocupação de um tanque entre múltiplos pedidos durante o cálculo."
                    checked={params.break_tank_occupation}
                    disabled={isSaving || !params.use_delivery_promise}
                    onChange={(v) => setBool("break_tank_occupation", v)}
                  />
                  <ParamToggle
                    label="Recalcular Após Liberação"
                    desc="Recalcula automaticamente a promessa de entrega após a liberação de um pedido."
                    checked={params.recalculate_after_release}
                    disabled={isSaving || !params.use_delivery_promise}
                    onChange={(v) => setBool("recalculate_after_release", v)}
                  />
                  <ParamToggle
                    label="Reprogramar Pedidos Carregados"
                    desc="Permite reprogramar pedidos que já possuem carregamento confirmado."
                    checked={params.reprogram_loaded_orders}
                    disabled={isSaving || !params.use_delivery_promise}
                    onChange={(v) => setBool("reprogram_loaded_orders", v)}
                  />
                  <ParamToggle
                    label="Permitir Alteração de Data de Entrega"
                    desc="Habilita a edição manual da data de entrega prometida por pedido."
                    checked={params.allow_delivery_date_change}
                    disabled={isSaving || !params.use_delivery_promise}
                    onChange={(v) => setBool("allow_delivery_date_change", v)}
                  />
                </>
              )}
            </div>
          </div>

          {/* ── EXIBIÇÃO ── */}
          <div className="pme-card">
            <div className="pme-card-header">
              <div className="pme-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="#2f7d47" strokeWidth="1.4" />
                  <circle cx="8" cy="8" r="2" stroke="#2f7d47" strokeWidth="1.4" />
                </svg>
                <span className="pme-card-title">Configurações de Exibição</span>
              </div>
            </div>
            <div className="pme-card-body">
              {isLoading ? <SkeletonRows count={2} /> : (
                <>
                  <div className="pme-param-row">
                    <div className="pme-param-info">
                      <div className="pme-param-label">Ordenação Padrão de Pedidos</div>
                      <div className="pme-param-desc">Define a ordenação padrão utilizada na listagem de pedidos na promessa de entrega.</div>
                    </div>
                    <select
                      className="pme-select"
                      value={params.default_order_sort}
                      disabled={isSaving || !params.use_delivery_promise}
                      onChange={(e) => setStr("default_order_sort", e.target.value)}
                    >
                      <option value="">— Padrão do sistema —</option>
                      <option value="DATA_ENTREGA">Data de entrega</option>
                      <option value="NUMERO_PEDIDO">Número do pedido</option>
                      <option value="CLIENTE">Cliente</option>
                      <option value="PRIORIDADE">Prioridade</option>
                      <option value="DATA_EMISSAO">Data de emissão</option>
                    </select>
                  </div>

                  <div className="pme-param-row">
                    <div className="pme-param-info">
                      <div className="pme-param-label">Exibir Valores de Pedidos</div>
                      <div className="pme-param-desc">Controla quais valores financeiros são exibidos para os pedidos na promessa de entrega.</div>
                    </div>
                    <input
                      className="pme-number-input"
                      type="number"
                      min={0}
                      value={params.show_order_values}
                      disabled={isSaving || !params.use_delivery_promise}
                      onChange={(e) => setNum("show_order_values", parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="pme-footer">
          <div className="pme-footer-stat">
            Usuário: <strong>{user?.name ?? "—"}</strong>
          </div>
          <div className="pme-footer-stat" style={{ color: "#a0b8a8" }}>
            VPME0102 · Engenharia
          </div>
        </footer>
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

let toggleCounter = 0;

interface ParamToggleProps {
  label: string;
  desc: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}

function ParamToggle({ label, desc, checked, disabled, onChange }: ParamToggleProps) {
  const id = `pme-toggle-${++toggleCounter}`;
  return (
    <div className="pme-param-row">
      <div className="pme-param-info">
        <div className="pme-param-label">{label}</div>
        <div className="pme-param-desc">{desc}</div>
      </div>
      <div className="pme-toggle-wrap">
        <input
          id={id}
          type="checkbox"
          className="pme-toggle-input"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <label htmlFor={id} className="pme-toggle-track" />
        <div className={`pme-toggle-value${checked ? " on" : ""}`}>
          {checked ? "Sim" : "Não"}
        </div>
      </div>
    </div>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="pme-skeleton-row">
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="pme-skeleton-block" style={{ height: 14, width: "55%", maxWidth: 280 }} />
            <div className="pme-skeleton-block" style={{ height: 11, width: "75%", maxWidth: 380 }} />
          </div>
          <div className="pme-skeleton-block" style={{ width: 42, height: 24, borderRadius: 12 }} />
        </div>
      ))}
    </>
  );
}

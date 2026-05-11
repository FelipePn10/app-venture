import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import axios from "axios";
import {
  getCalendarMonth,
  createCalendarDay,
} from "@/services/industrialCalendarService";

// ─── NOTE ─────────────────────────────────────────────────────────────────────
// diasNaoUteis always holds ONLY the current displayed month's non-working days.
// This keeps state simple and avoids stale-closure / merge bugs when navigating.
// serverSnapshot mirrors the last server response so we can diff on save.

// ─── Constants ────────────────────────────────────────────────────────────────

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril",
  "Maio", "Junho", "Julho", "Agosto",
  "Setembro", "Outubro", "Novembro", "Dezembro",
];

const DIAS_SEMANA_ABREV = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackState = {
  type: "success" | "error" | "info";
  message: string;
} | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDateKey(key: string): { year: number; month: number; day: number } {
  const [y, m, d] = key.split("-").map(Number);
  return { year: y, month: m, day: d };
}

function formatDateKeyFromDate(date: Date): string {
  return formatDateKey(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function buildCalendarWeeks(year: number, month: number): Array<Array<Date | null>> {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const weeks: Array<Array<Date | null>> = [];
  let currentWeek: Array<Date | null> = [];

  for (let i = 0; i < firstDay.getDay(); i++) currentWeek.push(null);

  for (let day = 1; day <= lastDay.getDate(); day++) {
    currentWeek.push(new Date(year, month, day));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  return weeks;
}

function normalizeErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    const msg = data?.message ?? data?.error;
    if (msg) return msg;
  }
  return error instanceof Error ? error.message : fallback;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Vent0108Page(): JSX.Element {
  const today = new Date();
  const [anoSelecionado, setAnoSelecionado] = useState(today.getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState(today.getMonth());

  // Holds ONLY the current month's non-working day keys ("YYYY-MM-DD")
  const [diasNaoUteis, setDiasNaoUteis] = useState<Set<string>>(new Set());
  // Mirror of the last server response — used to diff on save
  const serverSnapshot = useRef<Set<string>>(new Set());
  // Incremented on every load; stale async responses are discarded
  const loadIdRef = useRef(0);

  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Days the user explicitly confirmed as workday in this session (dark green)
  const [confirmedWorkdays, setConfirmedWorkdays] = useState<Set<string>>(new Set());
  const clickTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const anos = useMemo(
    () => Array.from({ length: 11 }, (_, i) => today.getFullYear() - 5 + i),
    [],
  );

  const semanas = useMemo(
    () => buildCalendarWeeks(anoSelecionado, mesSelecionado),
    [anoSelecionado, mesSelecionado],
  );

  const todayKey = formatDateKeyFromDate(today);

  // Since diasNaoUteis is always for the current month, no filtering needed
  const naoUteisDoMes = diasNaoUteis.size;

  // ── Load month from backend ─────────────────────────────────────────────────

  const loadMonth = useCallback(async (year: number, month: number) => {
    const loadId = ++loadIdRef.current;

    setIsLoadingMonth(true);
    setFeedback(null);
    setDiasNaoUteis(new Set());
    setConfirmedWorkdays(new Set());
    serverSnapshot.current = new Set();

    try {
      const days = await getCalendarMonth(year, month + 1); // backend expects 1-based

      // Discard if a newer load started while we were waiting
      if (loadId !== loadIdRef.current) return;

      const naoUteis = new Set<string>();
      for (const d of days) {
        if (!d.is_workday) {
          naoUteis.add(formatDateKey(d.year, d.month, d.day));
        }
      }

      setDiasNaoUteis(naoUteis);
      serverSnapshot.current = new Set(naoUteis);
    } catch (error) {
      if (loadId !== loadIdRef.current) return;
      setFeedback({
        type: "error",
        message: normalizeErrorMessage(
          error,
          `Não foi possível carregar o calendário de ${MESES[month]}/${year}.`,
        ),
      });
    } finally {
      if (loadId === loadIdRef.current) setIsLoadingMonth(false);
    }
  }, []);

  useEffect(() => {
    void loadMonth(anoSelecionado, mesSelecionado);
  }, [anoSelecionado, mesSelecionado, loadMonth]);

  // ── Day actions ─────────────────────────────────────────────────────────────
  //   1 click  → immediately marks as workday (dark green stays)
  //   2 clicks within 260ms → overrides to non-workday (red)

  const marcarUtil = useCallback((key: string) => {
    setDiasNaoUteis((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev); next.delete(key); return next;
    });
    setConfirmedWorkdays((prev) => {
      const next = new Set(prev); next.add(key); return next;
    });
    setFeedback(null);
  }, []);

  const marcarNaoUtil = useCallback((key: string) => {
    setConfirmedWorkdays((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev); next.delete(key); return next;
    });
    setDiasNaoUteis((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev); next.add(key); return next;
    });
    setFeedback(null);
  }, []);

  const handleDayClick = useCallback((date: Date) => {
    const key = formatDateKeyFromDate(date);

    const existing = clickTimers.current.get(key);
    if (existing !== undefined) {
      // Second click within window — override to non-workday
      clearTimeout(existing);
      clickTimers.current.delete(key);
      marcarNaoUtil(key);
      return;
    }

    // First click — immediately confirm as workday (dark green), open 260ms window
    marcarUtil(key);
    const timer = setTimeout(() => {
      clickTimers.current.delete(key);
    }, 260);
    clickTimers.current.set(key, timer);
  }, [marcarUtil, marcarNaoUtil]);

  // ── Navigation ──────────────────────────────────────────────────────────────

  function navegarMes(delta: number) {
    let novoMes = mesSelecionado + delta;
    let novoAno = anoSelecionado;
    if (novoMes < 0) { novoMes = 11; novoAno--; }
    if (novoMes > 11) { novoMes = 0; novoAno++; }
    setMesSelecionado(novoMes);
    setAnoSelecionado(novoAno);
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSalvar() {
    setIsSaving(true);
    setFeedback(null);

    try {
      const year = anoSelecionado;
      const month = mesSelecionado + 1; // 1-based for backend

      // diasNaoUteis is already scoped to the current month — no filtering needed
      const toMarkNonWorking = [...diasNaoUteis].filter((k) => !serverSnapshot.current.has(k));
      const toMarkWorking = [...serverSnapshot.current].filter((k) => !diasNaoUteis.has(k));
      const requests = [
        ...toMarkNonWorking.map((k) => {
          const { day } = parseDateKey(k);
          return createCalendarDay({ year, month, day, is_workday: false });
        }),
        ...toMarkWorking.map((k) => {
          const { day } = parseDateKey(k);
          return createCalendarDay({ year, month, day, is_workday: true });
        }),
      ];

      if (requests.length === 0) {
        setFeedback({ type: "info", message: "Nenhuma alteração para salvar neste mês." });
        return;
      }

      await Promise.all(requests);

      serverSnapshot.current = new Set(diasNaoUteis);
      setConfirmedWorkdays(new Set());

      setFeedback({
        type: "success",
        message: `Calendário de ${MESES[mesSelecionado]}/${year} salvo. ${requests.length} dia(s) atualizado(s). ${diasNaoUteis.size} dia(s) não útil(eis) neste mês.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeErrorMessage(error, "Erro ao salvar o calendário. Verifique a conexão com o servidor."),
      });
    } finally {
      setIsSaving(false);
    }
  }

  // ── Clear month ─────────────────────────────────────────────────────────────

  function handleLimparMes() {
    setDiasNaoUteis(new Set());
    setConfirmedWorkdays(new Set());
    setFeedback(null);
  }

  // ─── JSX ────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .vc-root {
          min-height: 100vh;
          background: #f0f4ee;
          font-family: 'Inter', sans-serif;
          color: #1a2e22;
          display: flex;
          flex-direction: column;
        }

        /* ── TOPBAR ── */
        .vc-topbar {
          height: 52px;
          background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .vc-topbar-left { display: flex; align-items: center; gap: 10px; }
        .vc-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .vc-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .vc-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .vc-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        /* ── ACTION BAR ── */
        .vc-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .vc-action-group {
          display: flex; align-items: center; gap: 2px;
          padding-right: 10px; margin-right: 6px;
          border-right: 1px solid #e8f0e4;
        }
        .vc-action-group:last-child { border-right: none; }
        .vc-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 6px; white-space: nowrap;
        }
        .vc-nav-btn {
          width: 30px; height: 30px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          background: transparent; border: 1.5px solid #d4e8d0;
          cursor: pointer; color: #4a7060;
          transition: background 0.12s, border-color 0.12s;
        }
        .vc-nav-btn:hover:not(:disabled) { background: #edf7ea; border-color: #a0c8a8; }
        .vc-nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .vc-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .vc-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .vc-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .vc-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .vc-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .vc-btn-ghost:hover { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .vc-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .vc-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .vc-btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── BODY ── */
        .vc-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 14px; overflow-y: auto;
        }
        .vc-body::-webkit-scrollbar { width: 5px; }
        .vc-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        /* ── CARD ── */
        .vc-card {
          background: #fff; border: 1px solid #dbe8d5; border-radius: 12px; overflow: hidden;
        }
        .vc-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .vc-card-header-left { display: flex; align-items: center; gap: 8px; }
        .vc-card-title {
          font-size: 12px; font-weight: 600; color: #2a4a35;
          text-transform: uppercase; letter-spacing: 0.6px;
        }
        .vc-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .vc-card-body { padding: 20px 18px; }

        /* ── PERIOD SELECTORS ── */
        .vc-period-row {
          display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
        }
        .vc-field { display: flex; flex-direction: column; gap: 5px; }
        .vc-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .vc-select {
          height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .vc-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .vc-select:disabled { background-color: #f0f4ee; color: #8aaa94; cursor: not-allowed; }
        .vc-select-ano { width: 110px; }
        .vc-select-mes { width: 160px; }

        .vc-period-nav {
          display: flex; align-items: center; gap: 6px; margin-left: 4px; margin-top: 20px;
        }
        .vc-period-nav-btn {
          width: 32px; height: 32px; border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          background: #f4f9f2; border: 1.5px solid #d4e8cc;
          cursor: pointer; color: #3e7a54;
          transition: background 0.12s, border-color 0.12s;
        }
        .vc-period-nav-btn:hover:not(:disabled) { background: #ddf0e0; border-color: #a0c8a8; }
        .vc-period-nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        .vc-period-label {
          font-size: 13px; font-weight: 600; color: #1a3a28;
          min-width: 160px; text-align: center;
        }

        /* ── CALENDAR ── */
        .vc-calendar-wrap { overflow-x: auto; }
        .vc-calendar {
          width: 100%; border-collapse: separate; border-spacing: 0;
          min-width: 520px;
        }
        .vc-cal-head-row th {
          padding: 8px 6px; text-align: center;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 2px solid #dbe8d5;
          background: #f4f9f2;
        }
        .vc-cal-head-row th.vc-th-week {
          color: #96b8a0; font-weight: 600; font-size: 10px;
          width: 52px; border-right: 1px solid #e8f0e4;
        }
        .vc-cal-head-row th.vc-th-dom,
        .vc-cal-head-row th.vc-th-sab { color: #a0907a; }

        .vc-cal-body tr:last-child td { border-bottom: none; }

        .vc-td-week {
          padding: 4px 8px; text-align: center;
          font-size: 10px; font-weight: 600; color: #96b8a0;
          background: #fafcf9; border-right: 1px solid #e8f0e4;
          border-bottom: 1px solid #f0f6ec;
          vertical-align: middle; letter-spacing: 0.3px;
        }
        .vc-td-day {
          padding: 4px; text-align: center; vertical-align: middle;
          border-bottom: 1px solid #f0f6ec; border-right: 1px solid #f0f6ec;
        }
        .vc-td-day:last-child { border-right: none; }

        .vc-day-cell {
          display: inline-flex; align-items: center; justify-content: center;
          width: 42px; height: 42px; border-radius: 8px;
          font-size: 14px; font-weight: 500; color: #2a4a35;
          transition: background 0.12s, color 0.12s, transform 0.1s;
          user-select: none;
        }
        .vc-day-cell.clickable { cursor: pointer; }
        .vc-day-cell.clickable:hover { transform: scale(1.06); }
        .vc-day-cell.vc-day-empty { background: transparent; cursor: default; }

        .vc-day-cell.vc-day-util { background: #f6fbf4; color: #2a4a35; }
        .vc-day-cell.vc-day-util:hover { background: #e4f4e0; }

        .vc-day-cell.vc-day-fim-semana { background: #f5f5f0; color: #8a7a6a; }
        .vc-day-cell.vc-day-fim-semana:hover { background: #ede8e0; }

        .vc-day-cell.vc-day-nao-util {
          background: #ffebeb; color: #c84040; font-weight: 600;
          box-shadow: inset 0 0 0 1.5px #f4b8b8;
        }
        .vc-day-cell.vc-day-nao-util:hover { background: #ffd8d8; }

        .vc-day-cell.vc-day-hoje { box-shadow: inset 0 0 0 2px #3e9654; }
        .vc-day-cell.vc-day-hoje.vc-day-util { background: #edfaed; }
        .vc-day-cell.vc-day-hoje.vc-day-nao-util {
          box-shadow: inset 0 0 0 2px #3e9654, inset 0 0 0 1.5px #f4b8b8;
        }
        .vc-day-cell.vc-day-confirmed {
          background: #1c4a2a;
          color: #a8f0b8;
          font-weight: 700;
          box-shadow: inset 0 0 0 2px #3e9654;
        }

        /* ── LOADING OVERLAY ── */
        .vc-loading-overlay {
          display: flex; align-items: center; justify-content: center;
          padding: 48px; gap: 10px; color: #5a8068; font-size: 13px;
        }
        .vc-loading-spinner {
          width: 18px; height: 18px;
          border: 2px solid #d4e8cc; border-top-color: #3e9654;
          border-radius: 50%; animation: spin 0.65s linear infinite; flex-shrink: 0;
        }

        /* ── LEGEND ── */
        .vc-legend {
          display: flex; align-items: center; gap: 20px;
          margin-top: 18px; padding-top: 14px;
          border-top: 1px solid #edf5e8; flex-wrap: wrap;
        }
        .vc-legend-item {
          display: flex; align-items: center; gap: 7px;
          font-size: 12px; color: #5a7a68;
        }
        .vc-legend-dot {
          width: 14px; height: 14px; border-radius: 4px; flex-shrink: 0;
        }
        .vc-legend-dot.util       { background: #f6fbf4; border: 1.5px solid #c8e8c4; }
        .vc-legend-dot.confirmed  { background: #1c4a2a; border: 1.5px solid #3e9654; }
        .vc-legend-dot.fim-semana { background: #f5f5f0; border: 1.5px solid #ddd8d0; }
        .vc-legend-dot.nao-util   { background: #ffebeb; border: 1.5px solid #f4b8b8; }
        .vc-legend-dot.hoje       { background: #edfaed; box-shadow: inset 0 0 0 2px #3e9654; }

        /* ── FEEDBACK ── */
        .vc-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px;
          animation: vcFadeIn 0.2s ease;
        }
        .vc-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .vc-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .vc-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        /* ── FOOTER ── */
        .vc-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .vc-footer-left { display: flex; align-items: center; gap: 20px; }
        .vc-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .vc-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .vc-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        @keyframes vcFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="vc-root">
        {/* TOPBAR */}
        <header className="vc-topbar">
          <div className="vc-topbar-left">
            <div className="vc-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="vc-app-name">
              Venture
              <span className="vc-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="vc-screen-title">
              VENT0108 — Manutenção do Calendário Financeiro
            </span>
          </div>
        </header>

        {/* ACTION BAR */}
        <div className="vc-actionbar">
          <div className="vc-action-group">
            <span className="vc-action-label">Mês</span>
            <button
              className="vc-nav-btn"
              title="Mês anterior"
              onClick={() => navegarMes(-1)}
              disabled={isLoadingMonth || isSaving}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              className="vc-nav-btn"
              title="Próximo mês"
              onClick={() => navegarMes(1)}
              disabled={isLoadingMonth || isSaving}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              className="vc-nav-btn"
              title="Recarregar do servidor"
              onClick={() => void loadMonth(anoSelecionado, mesSelecionado)}
              disabled={isLoadingMonth || isSaving}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M10 6A4 4 0 1 1 6 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M6 2l2-2M6 2L4 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="vc-action-group">
            <span className="vc-action-label">Ações</span>
            <button
              className="vc-btn vc-btn-primary"
              onClick={() => void handleSalvar()}
              disabled={isSaving || isLoadingMonth}
            >
              {isSaving ? (
                <><div className="vc-spinner" />Salvando...</>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  Salvar
                </>
              )}
            </button>
            <button
              className="vc-btn vc-btn-danger"
              onClick={handleLimparMes}
              disabled={isSaving || isLoadingMonth}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Limpar Mês
            </button>
          </div>

          <div className="vc-action-group">
            <span className="vc-action-label">Ferramentas</span>
            <button className="vc-btn vc-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Ajuda
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="vc-body">
          {/* Feedback */}
          {feedback && (
            <div className={`vc-feedback ${feedback.type}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === "success" ? (
                  <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                ) : feedback.type === "error" ? (
                  <>
                    <circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4" />
                    <path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <circle cx="8" cy="8" r="6" stroke="#4a90d9" strokeWidth="1.4" />
                    <path d="M8 7v4M8 5.5h.01" stroke="#4a90d9" strokeWidth="1.4" strokeLinecap="round" />
                  </>
                )}
              </svg>
              {feedback.message}
            </div>
          )}

          {/* PERIOD SELECTOR CARD */}
          <div className="vc-card">
            <div className="vc-card-header">
              <div className="vc-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="#3e9654" strokeWidth="1.4" />
                  <path d="M5 2v2M11 2v2M2 7h12" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="vc-card-title">Seleção de Período</span>
              </div>
              <span className="vc-card-badge">VENT0108</span>
            </div>
            <div className="vc-card-body">
              <div className="vc-period-row">
                <div className="vc-field">
                  <label className="vc-label">Ano</label>
                  <select
                    className="vc-select vc-select-ano"
                    value={anoSelecionado}
                    disabled={isLoadingMonth || isSaving}
                    onChange={(e) => setAnoSelecionado(Number(e.target.value))}
                  >
                    {anos.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                <div className="vc-field">
                  <label className="vc-label">Mês</label>
                  <select
                    className="vc-select vc-select-mes"
                    value={mesSelecionado}
                    disabled={isLoadingMonth || isSaving}
                    onChange={(e) => setMesSelecionado(Number(e.target.value))}
                  >
                    {MESES.map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="vc-period-nav">
                  <button
                    className="vc-period-nav-btn"
                    title="Mês anterior"
                    disabled={isLoadingMonth || isSaving}
                    onClick={() => navegarMes(-1)}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <span className="vc-period-label">
                    {isLoadingMonth ? "Carregando..." : `${MESES[mesSelecionado]} de ${anoSelecionado}`}
                  </span>
                  <button
                    className="vc-period-nav-btn"
                    title="Próximo mês"
                    disabled={isLoadingMonth || isSaving}
                    onClick={() => navegarMes(1)}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* CALENDAR CARD */}
          <div className="vc-card">
            <div className="vc-card-header">
              <div className="vc-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="#3e9654" strokeWidth="1.4" />
                  <path d="M5 2v2M11 2v2M2 7h12" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                  <path d="M5 10h2M9 10h2M5 12.5h2" stroke="#3e9654" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span className="vc-card-title">
                  Calendário — {MESES[mesSelecionado]} {anoSelecionado}
                </span>
              </div>
              {naoUteisDoMes > 0 && (
                <span style={{
                  fontSize: 11.5, fontWeight: 600, color: "#c84040",
                  background: "#ffebeb", border: "1px solid #f4b8b8",
                  borderRadius: 20, padding: "3px 10px",
                }}>
                  {naoUteisDoMes} dia(s) não útil(eis)
                </span>
              )}
            </div>
            <div className="vc-card-body">
              {isLoadingMonth ? (
                <div className="vc-loading-overlay">
                  <div className="vc-loading-spinner" />
                  Carregando calendário do servidor...
                </div>
              ) : (
                <>
                  <div className="vc-calendar-wrap">
                    <table className="vc-calendar">
                      <thead>
                        <tr className="vc-cal-head-row">
                          <th className="vc-th-week">Sem.</th>
                          {DIAS_SEMANA_ABREV.map((d, i) => (
                            <th
                              key={d}
                              className={i === 0 ? "vc-th-dom" : i === 6 ? "vc-th-sab" : ""}
                            >
                              {d}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="vc-cal-body">
                        {semanas.map((semana, si) => {
                          const primeiroDia = semana.find((d) => d !== null);
                          const numSemana = primeiroDia ? getISOWeekNumber(primeiroDia) : null;

                          return (
                            <tr key={si}>
                              <td className="vc-td-week">
                                {numSemana !== null ? String(numSemana).padStart(2, "0") : ""}
                              </td>
                              {semana.map((dia, di) => {
                                if (!dia) {
                                  return (
                                    <td key={di} className="vc-td-day">
                                      <div className="vc-day-cell vc-day-empty" />
                                    </td>
                                  );
                                }

                                const key = formatDateKeyFromDate(dia);
                                const isNaoUtil = diasNaoUteis.has(key);
                                const isFimSemana = di === 0 || di === 6;
                                const isHoje = key === todayKey;

                                const isConfirmed = confirmedWorkdays.has(key);
                                let cellClass = "vc-day-cell clickable";
                                if (isNaoUtil)       cellClass += " vc-day-nao-util";
                                else if (isConfirmed) cellClass += " vc-day-confirmed";
                                else if (isFimSemana) cellClass += " vc-day-fim-semana";
                                else                  cellClass += " vc-day-util";
                                if (isHoje) cellClass += " vc-day-hoje";

                                return (
                                  <td key={di} className="vc-td-day">
                                    <div
                                      className={cellClass}
                                      title={
                                        isNaoUtil
                                          ? `${dia.getDate()} — Não útil · 1 clique para restaurar como dia útil`
                                          : `${dia.getDate()} — ${isFimSemana ? "Final de semana" : "Dia útil"} · 1 clique = dia útil · 2 cliques = dia não útil`
                                      }
                                      onClick={() => handleDayClick(dia)}
                                    >
                                      {dia.getDate()}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="vc-legend">
                    <div className="vc-legend-item">
                      <div className="vc-legend-dot util" />
                      <span>Dia útil</span>
                    </div>
                    <div className="vc-legend-item">
                      <div className="vc-legend-dot confirmed" />
                      <span>Dia útil (confirmado)</span>
                    </div>
                    <div className="vc-legend-item">
                      <div className="vc-legend-dot fim-semana" />
                      <span>Final de semana</span>
                    </div>
                    <div className="vc-legend-item">
                      <div className="vc-legend-dot nao-util" />
                      <span>Dia não útil / Feriado</span>
                    </div>
                    <div className="vc-legend-item">
                      <div className="vc-legend-dot hoje" />
                      <span>Hoje</span>
                    </div>
                    <span style={{ marginLeft: "auto", fontSize: 11.5, color: "#7a9c84" }}>
                      1 clique = dia útil &nbsp;·&nbsp; 2 cliques = dia não útil
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="vc-footer">
          <div className="vc-footer-left">
            <div className="vc-footer-stat">
              Período: <strong>{MESES[mesSelecionado]}/{anoSelecionado}</strong>
            </div>
            <div className="vc-footer-stat">
              Não úteis no mês: <strong>{naoUteisDoMes}</strong>
            </div>
            {isLoadingMonth && (
              <div className="vc-footer-stat" style={{ color: "#3e9654" }}>
                <div className="vc-loading-spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
                Carregando...
              </div>
            )}
          </div>
          <div className="vc-footer-stat">
            Empresa: <strong>1 — GRUPO VENTURE LTDA</strong>
          </div>
        </footer>
      </div>
    </>
  );
}

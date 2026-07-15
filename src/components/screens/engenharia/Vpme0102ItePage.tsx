import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { humanizeApiError } from '@/services/apiError';
import {
  listItemCalendarMonth,
  upsertItemCalendarDay,
  deleteItemCalendarDay,
} from "@/services/itemCalendarPromiseService";
import { getCalendarMonth, type ParsedCalendarDay } from "@/services/industrialCalendarService";
import { findItemByCode, type ItemInfo } from "@/services/ItemStructureService";

// ─── Constants ────────────────────────────────────────────────────────────────

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril",
  "Maio", "Junho", "Julho", "Agosto",
  "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DIAS_SEMANA_ABREV = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function keyFromDate(d: Date): string {
  return fmtKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const y = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - y.getTime()) / 86400000 + 1) / 7);
}

function buildWeeks(year: number, month: number): Array<Array<Date | null>> {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const weeks: Array<Array<Date | null>> = [];
  let week: Array<Date | null> = [];
  for (let i = 0; i < first.getDay(); i++) week.push(null);
  for (let day = 1; day <= last.getDate(); day++) {
    week.push(new Date(year, month, day));
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

function extractErrorMessage(err: unknown): string {
  return humanizeApiError(err);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Vpme0102ItePage(): JSX.Element {
  const today = useMemo(() => new Date(), []);

  // ── Item + mask ───────────────────────────────────────────────────────────
  const [itemCodeInput, setItemCodeInput] = useState("");
  const [itemInfo, setItemInfo]           = useState<ItemInfo | null>(null);
  const [mask, setMask]                   = useState("");
  const [isSearching, setIsSearching]     = useState(false);

  // ── Period ────────────────────────────────────────────────────────────────
  const [ano, setAno]   = useState(today.getFullYear());
  const [mes, setMes]   = useState(today.getMonth()); // 0-indexed

  // ── Calendar data ─────────────────────────────────────────────────────────
  const [industrialDays, setIndustrialDays] = useState<ParsedCalendarDay[]>([]);
  const [serverNaoUteis, setServerNaoUteis] = useState<Set<string>>(new Set());
  const [localNaoUteis,  setLocalNaoUteis]  = useState<Set<string>>(new Set());

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isLoadingCal, setIsLoadingCal] = useState(false);
  const [isSaving,     setIsSaving]     = useState(false);
  const [feedback,     setFeedback]     = useState<FeedbackState>(null);

  // Days the user explicitly confirmed as workday in this session (dark green)
  const [confirmedWorkdays, setConfirmedWorkdays] = useState<Set<string>>(new Set());
  const clickTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const anos = useMemo(() => Array.from({ length: 11 }, (_, i) => today.getFullYear() - 5 + i), [today]);
  const weeks = useMemo(() => buildWeeks(ano, mes), [ano, mes]);
  const todayKey = useMemo(() => keyFromDate(today), [today]);

  const industrialNaoUteis = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    for (const d of industrialDays) {
      if (!d.is_workday) s.add(fmtKey(d.year, d.month, d.day));
    }
    return s;
  }, [industrialDays]);

  const isDirty = useMemo(() => {
    if (serverNaoUteis.size !== localNaoUteis.size) return true;
    for (const k of localNaoUteis) if (!serverNaoUteis.has(k)) return true;
    return confirmedWorkdays.size > 0;
  }, [serverNaoUteis, localNaoUteis, confirmedWorkdays]);

  // ── Load calendar ─────────────────────────────────────────────────────────

  const loadCalendar = useCallback(async (
    item: ItemInfo,
    maskVal: string,
    year: number,
    month: number, // 0-indexed
  ) => {
    setIsLoadingCal(true);
    setFeedback(null);
    try {
      const [indDays, itemDays] = await Promise.all([
        getCalendarMonth(year, month + 1),
        listItemCalendarMonth(item.code, maskVal, year, month + 1),
      ]);

      setIndustrialDays(indDays);

      const nu = new Set<string>();
      for (const d of itemDays) {
        if (!d.is_workday) nu.add(fmtKey(d.year, d.month, d.day));
      }
      setServerNaoUteis(nu);
      setLocalNaoUteis(new Set(nu));
      setConfirmedWorkdays(new Set());
    } catch (err) {
      console.error("[VPME0102ITE] loadCalendar:", err);
      setFeedback({ type: "error", message: extractErrorMessage(err) });
    } finally {
      setIsLoadingCal(false);
    }
  }, []);

  useEffect(() => {
    if (itemInfo) void loadCalendar(itemInfo, mask, ano, mes);
  }, [itemInfo, mask, ano, mes, loadCalendar]);

  // ── Item search ───────────────────────────────────────────────────────────

  async function handleSearchItem() {
    const code = parseInt(itemCodeInput.trim(), 10);
    if (isNaN(code) || code <= 0) {
      setFeedback({ type: "error", message: "Informe um código de item válido." });
      return;
    }
    setIsSearching(true);
    setFeedback(null);
    setItemInfo(null);
    setServerNaoUteis(new Set());
    setLocalNaoUteis(new Set());
    try {
      const info = await findItemByCode(code);
      setItemInfo(info);
    } catch (err) {
      console.error("[VPME0102ITE] findItemByCode:", err);
      setFeedback({ type: "error", message: extractErrorMessage(err) });
    } finally {
      setIsSearching(false);
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function navegarMes(delta: number) {
    let novoMes = mes + delta;
    let novoAno = ano;
    if (novoMes < 0)  { novoMes = 11; novoAno--; }
    if (novoMes > 11) { novoMes = 0;  novoAno++; }
    setMes(novoMes);
    setAno(novoAno);
  }

  // ── Day click — 1 click = workday (dark green stays), 2 clicks = non-workday ──

  const marcarUtil = useCallback((key: string) => {
    setLocalNaoUteis((p) => { const n = new Set(p); n.delete(key); return n; });
    setConfirmedWorkdays((p) => { const n = new Set(p); n.add(key); return n; });
    setFeedback(null);
  }, []);

  const marcarNaoUtil = useCallback((_date: Date, key: string) => {
    setConfirmedWorkdays((p) => { const n = new Set(p); n.delete(key); return n; });
    setLocalNaoUteis((p) => { const n = new Set(p); n.add(key); return n; });
    setFeedback(null);
  }, []);

  const handleDayClick = useCallback((date: Date) => {
    const key = keyFromDate(date);
    if (industrialNaoUteis.has(key)) return;

    const existing = clickTimers.current.get(key);
    if (existing !== undefined) {
      // Second click within window — override to non-workday
      clearTimeout(existing);
      clickTimers.current.delete(key);
      marcarNaoUtil(date, key);
      return;
    }

    // First click — immediately confirm as workday (dark green), open 260ms window
    marcarUtil(key);
    const timer = setTimeout(() => {
      clickTimers.current.delete(key);
    }, 260);
    clickTimers.current.set(key, timer);
  }, [industrialNaoUteis, marcarUtil, marcarNaoUtil]);

  // ── Save ──────────────────────────────────────────────────────────────────

  const pendingToAdd    = useMemo(() => [...localNaoUteis].filter(k => !serverNaoUteis.has(k)), [localNaoUteis, serverNaoUteis]);
  const pendingToRemove = useMemo(() => [...serverNaoUteis].filter(k => !localNaoUteis.has(k)), [localNaoUteis, serverNaoUteis]);

  async function handleSalvar() {
    if (!itemInfo) return;
    if (pendingToAdd.length === 0 && pendingToRemove.length === 0) {
      // Only visual confirmations — nothing to persist
      setConfirmedWorkdays(new Set());
      setFeedback({ type: "info", message: "Nenhuma alteração nos dias não úteis." });
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      await Promise.all([
        ...pendingToAdd.map((key) => {
          const [y, m, d] = key.split("-").map(Number);
          return upsertItemCalendarDay({
            item_code: itemInfo.code,
            mask: mask.trim(),
            year: y,
            month: m,
            day: d,
            is_workday: false,
          });
        }),
        ...pendingToRemove.map((key) => {
          const [y, m, d] = key.split("-").map(Number);
          return deleteItemCalendarDay(itemInfo.code, mask.trim(), y, m, d);
        }),
      ]);

      setServerNaoUteis(new Set(localNaoUteis));
      setConfirmedWorkdays(new Set());
      setFeedback({
        type: "success",
        message: `Calendário salvo. ${pendingToAdd.length} dia(s) não útil(eis) e ${pendingToRemove.length} dia(s) restaurado(s).`,
      });
    } catch (err) {
      console.error("[VPME0102ITE] handleSalvar:", err);
      setFeedback({ type: "error", message: extractErrorMessage(err) });
    } finally {
      setIsSaving(false);
    }
  }

  function handleLimpar() {
    setLocalNaoUteis(new Set(serverNaoUteis));
    setConfirmedWorkdays(new Set());
    setFeedback(null);
  }

  const naoUteisDoMes = useMemo(() =>
    [...localNaoUteis].filter(k => {
      const [, m] = k.split("-").map(Number);
      return m === mes + 1;
    }).length,
  [localNaoUteis, mes]);

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ite-root {
          min-height: 100vh; background: #dfe4e0;
          font-family: 'Inter', sans-serif; color: #1c2b22;
          display: flex; flex-direction: column;
        }

        /* ── TOPBAR ── */
        .ite-topbar {
          height: 52px; background: #16281d;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 110px 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .ite-topbar-left { display: flex; align-items: center; gap: 10px; }
        .ite-logo-mark {
          width: 28px; height: 28px; background: #2f7d47;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .ite-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .ite-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #54655a; }
        .ite-screen-title {
          font-size: 12.5px; font-weight: 500; color: #3f8a58;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }
        .ite-screen-badge {
          font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
          background: rgba(62,150,84,0.15); color: #8fce9f;
          border: 1px solid rgba(62,150,84,0.25); border-radius: 5px;
          padding: 3px 8px;
        }

        /* ── ACTION BAR ── */
        .ite-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .ite-action-group {
          display: flex; align-items: center; gap: 2px;
          padding-right: 10px; margin-right: 6px;
          border-right: 1px solid #e8f0e4;
        }
        .ite-action-group:last-child { border-right: none; }
        .ite-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #94a49a; margin-right: 6px; white-space: nowrap;
        }
        .ite-nav-btn {
          width: 30px; height: 30px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          background: transparent; border: 1.5px solid #d4e8d0;
          cursor: pointer; color: #46574c;
          transition: background 0.12s, border-color 0.12s;
        }
        .ite-nav-btn:hover:not(:disabled) { background: #edf7ea; border-color: #a0c8a8; }
        .ite-nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .ite-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .ite-btn-primary { background: #16281d; color: #dff0e2; border-color: #16281d; }
        .ite-btn-primary:hover:not(:disabled) { background: #1e3728; }
        .ite-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .ite-btn-ghost { background: transparent; color: #46574c; border-color: #d4e8d0; }
        .ite-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #a9b6ac; }
        .ite-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .ite-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .ite-btn-danger:hover:not(:disabled) { background: #fff0f0; }
        .ite-btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
        .ite-dirty-badge {
          font-size: 10.5px; font-weight: 600; color: #b86000;
          background: #fff8ec; border: 1px solid #f0d090;
          border-radius: 20px; padding: 2px 8px;
          animation: iteFadeIn 0.2s ease;
        }

        /* ── BODY ── */
        .ite-body {
          flex: 1; padding: 16px 20px;
          display: flex; flex-direction: column; gap: 14px; overflow-y: auto;
        }
        .ite-body::-webkit-scrollbar { width: 5px; }
        .ite-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        /* ── CARD ── */
        .ite-card {
          background: #fff; border: 1px solid #dbe8d5; border-radius: 12px; overflow: hidden;
        }
        .ite-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .ite-card-header-left { display: flex; align-items: center; gap: 8px; }
        .ite-card-title { font-size: 12px; font-weight: 600; color: #253a2d; text-transform: uppercase; letter-spacing: 0.6px; }
        .ite-card-badge { font-size: 10.5px; font-weight: 500; color: #2f7d47; background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px; }
        .ite-card-body { padding: 18px; }

        /* ── FIELDS ── */
        .ite-selector-row { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; }
        .ite-field { display: flex; flex-direction: column; gap: 5px; }
        .ite-label {
          font-size: 10.5px; font-weight: 600; color: #6b7d71;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .ite-label-req { color: #c84040; font-size: 12px; }
        .ite-input {
          height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1c2b22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .ite-input:focus { border-color: #2f7d47; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .ite-input::placeholder { color: #a9b6ac; font-size: 12px; }
        .ite-select {
          height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1c2b22; outline: none; appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .ite-select:focus { border-color: #2f7d47; }
        .ite-select:disabled { background-color: #dfe4e0; color: #8aaa94; cursor: not-allowed; }
        .ite-item-display {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 14px; background: #eef9f0;
          border: 1.5px solid #c4dfc8; border-radius: 8px;
          font-size: 13px; color: #1a4030;
        }
        .ite-item-code { font-weight: 700; font-size: 12px; background: #dff0e0; padding: 2px 6px; border-radius: 4px; color: #1a4030; }
        .ite-item-clear {
          background: none; border: none; cursor: pointer; color: #94a49a; padding: 2px;
          transition: color 0.12s; margin-left: auto;
        }
        .ite-item-clear:hover { color: #b94040; }
        .ite-search-row { display: flex; align-items: flex-end; gap: 6px; }
        .ite-period-nav {
          display: flex; align-items: center; gap: 6px; margin-top: 20px;
        }
        .ite-period-nav-btn {
          width: 32px; height: 32px; border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          background: #f4f9f2; border: 1.5px solid #d4e8cc;
          cursor: pointer; color: #3e7a54;
          transition: background 0.12s;
        }
        .ite-period-nav-btn:hover:not(:disabled) { background: #ddf0e0; border-color: #a0c8a8; }
        .ite-period-nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .ite-period-label { font-size: 13px; font-weight: 600; color: #1a3a28; min-width: 160px; text-align: center; }

        /* ── CALENDAR ── */
        .ite-calendar-wrap { overflow-x: auto; }
        .ite-calendar { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 520px; }
        .ite-cal-head-row th {
          padding: 8px 6px; text-align: center;
          font-size: 10.5px; font-weight: 700; color: #6b7d71;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 2px solid #dbe8d5; background: #f4f9f2;
        }
        .ite-th-week { color: #94a49a !important; font-weight: 600 !important; font-size: 10px !important; width: 52px; border-right: 1px solid #e8f0e4; }
        .ite-th-dom, .ite-th-sab { color: #a0907a !important; }
        .ite-cal-body tr:last-child td { border-bottom: none; }
        .ite-td-week {
          padding: 4px 8px; text-align: center;
          font-size: 10px; font-weight: 600; color: #94a49a;
          background: #fafcf9; border-right: 1px solid #e8f0e4;
          border-bottom: 1px solid #f0f6ec; vertical-align: middle;
        }
        .ite-td-day {
          padding: 4px; text-align: center; vertical-align: middle;
          border-bottom: 1px solid #f0f6ec; border-right: 1px solid #f0f6ec;
        }
        .ite-td-day:last-child { border-right: none; }

        .ite-day-cell {
          display: inline-flex; align-items: center; justify-content: center; flex-direction: column;
          width: 44px; height: 44px; border-radius: 8px;
          font-size: 14px; font-weight: 500; color: #253a2d;
          transition: background 0.12s, color 0.12s, transform 0.1s;
          user-select: none; gap: 2px;
        }
        .ite-day-cell.clickable { cursor: pointer; }
        .ite-day-cell.clickable:hover { transform: scale(1.06); }
        .ite-day-util { background: #f6fbf4; color: #253a2d; }
        .ite-day-util:hover { background: #e4f4e0 !important; }
        .ite-day-fim-semana { background: #f5f5f0; color: #8a7a6a; cursor: default !important; }
        .ite-day-industrial-nao-util {
          background: #f0eaea; color: #b87070; cursor: not-allowed !important;
          box-shadow: inset 0 0 0 1px #e0c0c0;
        }
        .ite-day-item-nao-util {
          background: #ffebeb; color: #c84040; font-weight: 600;
          box-shadow: inset 0 0 0 1.5px #f4b8b8;
        }
        .ite-day-item-nao-util:hover { background: #ffd8d8 !important; }
        .ite-day-empty { background: transparent; cursor: default !important; }
        .ite-day-hoje { box-shadow: inset 0 0 0 2px #2f7d47 !important; }
        .ite-day-hoje.ite-day-util { background: #edfaed; }
        .ite-day-cell.ite-day-confirmed {
          background: #1c4a2a;
          color: #a8f0b8;
          font-weight: 700;
          box-shadow: inset 0 0 0 2px #2f7d47;
        }
        .ite-day-cell.has-movimentos::after {
          content: ''; display: block;
          width: 5px; height: 5px; border-radius: 50%;
          background: #c88000; flex-shrink: 0;
        }

        /* ── LEGEND ── */
        .ite-legend {
          display: flex; align-items: center; gap: 20px;
          margin-top: 18px; padding-top: 14px;
          border-top: 1px solid #edf5e8; flex-wrap: wrap;
        }
        .ite-legend-item { display: flex; align-items: center; gap: 7px; font-size: 12px; color: #5a7a68; }
        .ite-legend-dot { width: 14px; height: 14px; border-radius: 4px; flex-shrink: 0; }
        .ite-legend-dot.util              { background: #f6fbf4; border: 1.5px solid #c8e8c4; }
        .ite-legend-dot.confirmed         { background: #1c4a2a; border: 1.5px solid #2f7d47; }
        .ite-legend-dot.fim-semana        { background: #f5f5f0; border: 1.5px solid #ddd8d0; }
        .ite-legend-dot.industrial-nao    { background: #f0eaea; border: 1.5px solid #e0c0c0; }
        .ite-legend-dot.item-nao          { background: #ffebeb; border: 1.5px solid #f4b8b8; }
        .ite-legend-dot.hoje              { background: #edfaed; box-shadow: inset 0 0 0 2px #2f7d47; }
        .ite-legend-movimento { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #5a7a68; }
        .ite-legend-mov-dot { width: 6px; height: 6px; border-radius: 50%; background: #c88000; }

        /* ── OBS BOX ── */
        .ite-obs-box {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 15px; background: #f0f8ff;
          border: 1px solid #c7def8; border-left: 3px solid #4a90d9;
          border-radius: 8px; font-size: 12px; color: #1a4070; line-height: 1.55;
        }

        /* ── FEEDBACK ── */
        .ite-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: iteFadeIn 0.2s ease;
        }
        .ite-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .ite-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .ite-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        /* ── LOADING ── */
        .ite-loading-overlay {
          display: flex; align-items: center; justify-content: center;
          padding: 48px; gap: 10px; color: #6b7d71; font-size: 13px;
        }
        .ite-loading-spinner {
          width: 18px; height: 18px;
          border: 2px solid #d4e8cc; border-top-color: #2f7d47;
          border-radius: 50%; animation: iteSpin 0.65s linear infinite; flex-shrink: 0;
        }
        .ite-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: iteSpin 0.65s linear infinite;
        }
        @keyframes iteSpin { to { transform: rotate(360deg); } }

        /* ── MODAL ── */
        .ite-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; animation: iteFadeIn 0.15s ease;
        }
        .ite-modal {
          background: #fff; border-radius: 14px; width: 500px; max-width: 92vw;
          box-shadow: 0 8px 40px rgba(0,0,0,0.2); display: flex; flex-direction: column;
        }
        .ite-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; border-bottom: 1px solid #edf5e8;
        }
        .ite-modal-title { font-size: 13.5px; font-weight: 600; color: #16281d; }
        .ite-modal-close {
          background: none; border: none; cursor: pointer; color: #8aaa94;
          padding: 4px; border-radius: 6px; display: flex; align-items: center;
          transition: background 0.12s;
        }
        .ite-modal-close:hover { background: #dfe4e0; color: #46574c; }
        .ite-modal-body { padding: 20px; }
        .ite-modal-footer { padding: 12px 20px; border-top: 1px solid #edf5e8; display: flex; justify-content: flex-end; gap: 8px; }
        .ite-modal-warn {
          display: flex; align-items: flex-start; gap: 10px; margin-bottom: 16px;
          padding: 10px 14px; background: #fffbf0;
          border: 1px solid #f0dca0; border-left: 3px solid #e8b800;
          border-radius: 8px; font-size: 12.5px; color: #5a4000; line-height: 1.55;
        }

        /* ── FOOTER ── */
        .ite-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .ite-footer-left { display: flex; align-items: center; gap: 20px; }
        .ite-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6b7d71; }
        .ite-footer-stat strong { color: #1c2b22; font-weight: 600; }

        @keyframes iteFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="ite-root">

        {/* ── TOPBAR ── */}
        <header className="ite-topbar">
          <div className="ite-topbar-left">
            <div className="ite-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5"   width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5"  width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5"  width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="ite-app-name">
              Venture <span className="ite-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="ite-screen-title">VPME0102ITE — Calendário de Promessa de Entrega por Item</span>
          </div>
          <span className="ite-screen-badge">ENGENHARIA</span>
        </header>

        {/* ── ACTION BAR ── */}
        <div className="ite-actionbar">
          <div className="ite-action-group">
            <span className="ite-action-label">Mês</span>
            <button className="ite-nav-btn" title="Mês anterior" onClick={() => navegarMes(-1)} disabled={isLoadingCal || isSaving}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button className="ite-nav-btn" title="Próximo mês" onClick={() => navegarMes(1)} disabled={isLoadingCal || isSaving}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>

          <div className="ite-action-group">
            <span className="ite-action-label">Ações</span>
            <button
              className="ite-btn ite-btn-primary"
              onClick={() => void handleSalvar()}
              disabled={isSaving || isLoadingCal || !itemInfo || !isDirty}
            >
              {isSaving
                ? <><div className="ite-spinner" />Salvando...</>
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
              className="ite-btn ite-btn-danger"
              onClick={handleLimpar}
              disabled={isSaving || isLoadingCal || !itemInfo || !isDirty}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Desfazer
            </button>
          </div>

          {isDirty && !isLoadingCal && itemInfo && (
            <span className="ite-dirty-badge">
              {pendingToAdd.length > 0 && `+${pendingToAdd.length} não útil`}
              {pendingToAdd.length > 0 && pendingToRemove.length > 0 && " · "}
              {pendingToRemove.length > 0 && `−${pendingToRemove.length} restaurado`}
            </span>
          )}
        </div>

        {/* ── BODY ── */}
        <div className="ite-body">

          {feedback && (
            <div className={`ite-feedback ${feedback.type}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === "success"
                  ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  : feedback.type === "error"
                  ? <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4" /><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round" /></>
                  : <><circle cx="8" cy="8" r="6" stroke="#4a90d9" strokeWidth="1.4" /><path d="M8 5.5v3M8 10h.01" stroke="#4a90d9" strokeWidth="1.4" strokeLinecap="round" /></>
                }
              </svg>
              {feedback.message}
            </div>
          )}

          {/* ── PARÂMETROS ── */}
          <div className="ite-card">
            <div className="ite-card-header">
              <div className="ite-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="5.5" stroke="#2f7d47" strokeWidth="1.4" />
                  <path d="M6 8l1.5 1.5L11 6" stroke="#2f7d47" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="ite-card-title">Parâmetros</span>
              </div>
              <span className="ite-card-badge">VPME0102ITE</span>
            </div>
            <div className="ite-card-body">
              <div className="ite-selector-row">

                {/* Item search */}
                <div className="ite-field">
                  <label className="ite-label">Item <span className="ite-label-req">*</span></label>
                  {itemInfo ? (
                    <div className="ite-item-display">
                      <code className="ite-item-code">{itemInfo.code}</code>
                      <span style={{ color: "#4a6a54", fontSize: 13 }}>{itemInfo.name}</span>
                      <button
                        type="button" className="ite-item-clear"
                        title="Alterar item"
                        onClick={() => { setItemInfo(null); setItemCodeInput(""); setServerNaoUteis(new Set()); setLocalNaoUteis(new Set()); }}
                      >
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="ite-search-row">
                      <input
                        className="ite-input" style={{ width: 160 }}
                        type="text" placeholder="Código do item..."
                        value={itemCodeInput}
                        onChange={(e) => setItemCodeInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") void handleSearchItem(); }}
                        disabled={isSearching}
                      />
                      <button
                        className="ite-btn ite-btn-ghost"
                        style={{ height: 36 }}
                        onClick={() => void handleSearchItem()}
                        disabled={isSearching || !itemCodeInput.trim()}
                      >
                        {isSearching
                          ? <div className="ite-loading-spinner" style={{ width: 14, height: 14 }} />
                          : <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                              <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            </svg>
                        }
                        Pesquisar
                      </button>
                    </div>
                  )}
                </div>

                {/* Mask */}
                <div className="ite-field">
                  <label className="ite-label">Máscara</label>
                  <input
                    className="ite-input" style={{ width: 160 }}
                    type="text" placeholder="Ex.: M001"
                    value={mask}
                    onChange={(e) => setMask(e.target.value)}
                    disabled={!itemInfo || isLoadingCal || isSaving}
                  />
                </div>

                {/* Ano */}
                <div className="ite-field">
                  <label className="ite-label">Ano</label>
                  <select
                    className="ite-select" style={{ width: 110 }}
                    value={ano}
                    disabled={isLoadingCal || isSaving}
                    onChange={(e) => setAno(Number(e.target.value))}
                  >
                    {anos.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                {/* Mês */}
                <div className="ite-field">
                  <label className="ite-label">Mês</label>
                  <select
                    className="ite-select" style={{ width: 160 }}
                    value={mes}
                    disabled={isLoadingCal || isSaving}
                    onChange={(e) => setMes(Number(e.target.value))}
                  >
                    {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>

                {/* Nav buttons */}
                <div className="ite-period-nav">
                  <button className="ite-period-nav-btn" disabled={isLoadingCal || isSaving} onClick={() => navegarMes(-1)}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <span className="ite-period-label">
                    {isLoadingCal ? "Carregando..." : `${MESES[mes]} de ${ano}`}
                  </span>
                  <button className="ite-period-nav-btn" disabled={isLoadingCal || isSaving} onClick={() => navegarMes(1)}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── OBSERVAÇÃO ── */}
          <div className="ite-obs-box">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="8" cy="8" r="6" stroke="#4a90d9" strokeWidth="1.4" />
              <path d="M8 5.5v3M8 10h.01" stroke="#4a90d9" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span>
              Inicialmente o calendário exibe o calendário industrial. É permitido alterar somente os dias que são <strong>úteis no calendário industrial</strong>
              — os dias não úteis (cinza) não podem ser alterados. Se uma data possuir movimentações no tanque
              {" "}(<span style={{ color: "#c88000", fontWeight: 600 }}>●</span>), será solicitada uma data de transferência ao marcar como não útil.
            </span>
          </div>

          {/* ── CALENDÁRIO ── */}
          <div className="ite-card">
            <div className="ite-card-header">
              <div className="ite-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="#2f7d47" strokeWidth="1.4" />
                  <path d="M5 2v2M11 2v2M2 7h12" stroke="#2f7d47" strokeWidth="1.4" strokeLinecap="round" />
                  <path d="M5 10h2M9 10h2M5 12.5h2" stroke="#2f7d47" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span className="ite-card-title">
                  Calendário — {MESES[mes]} {ano}
                  {itemInfo && <> — Item {itemInfo.code}{mask ? ` / ${mask}` : ""}</>}
                </span>
              </div>
              {naoUteisDoMes > 0 && (
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#c84040", background: "#ffebeb", border: "1px solid #f4b8b8", borderRadius: 20, padding: "3px 10px" }}>
                  {naoUteisDoMes} dia(s) não útil(eis) para este item
                </span>
              )}
            </div>
            <div className="ite-card-body">
              {!itemInfo ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", flexDirection: "column", gap: 12, color: "#7a9c84" }}>
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <rect x="4" y="7" width="32" height="28" rx="3" stroke="#c0d8c8" strokeWidth="1.5" />
                    <path d="M13 4v6M27 4v6M4 17h32" stroke="#c0d8c8" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="20" cy="27" r="5" stroke="#c0d8c8" strokeWidth="1.5" />
                    <path d="M20 25v2l1.5 1" stroke="#c0d8c8" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  <span style={{ fontSize: 13.5, fontWeight: 500 }}>Pesquise um item para visualizar o calendário</span>
                </div>
              ) : isLoadingCal ? (
                <div className="ite-loading-overlay">
                  <div className="ite-loading-spinner" />
                  Carregando calendário...
                </div>
              ) : (
                <>
                  <div className="ite-calendar-wrap">
                    <table className="ite-calendar">
                      <thead>
                        <tr className="ite-cal-head-row">
                          <th className="ite-th-week">Sem.</th>
                          {DIAS_SEMANA_ABREV.map((d, i) => (
                            <th key={d} className={i === 0 ? "ite-th-dom" : i === 6 ? "ite-th-sab" : ""}>{d}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="ite-cal-body">
                        {weeks.map((week, wi) => {
                          const firstDay = week.find((d) => d !== null);
                          const numSem = firstDay ? isoWeek(firstDay) : null;
                          return (
                            <tr key={wi}>
                              <td className="ite-td-week">
                                {numSem !== null ? String(numSem).padStart(2, "0") : ""}
                              </td>
                              {week.map((dia, di) => {
                                if (!dia) {
                                  return <td key={di} className="ite-td-day"><div className="ite-day-cell ite-day-empty" /></td>;
                                }
                                const key           = keyFromDate(dia);
                                const isIndNU       = industrialNaoUteis.has(key);
                                const isItemNU      = localNaoUteis.has(key);
                                const isFimSemana   = di === 0 || di === 6;
                                const isHoje        = key === todayKey;
                                const isClickable   = !isIndNU && !isFimSemana;

                                const isConfirmed = confirmedWorkdays.has(key);

                                let cls = "ite-day-cell";
                                if (isClickable) cls += " clickable";
                                if (isIndNU)          cls += " ite-day-industrial-nao-util";
                                else if (isConfirmed) cls += " ite-day-confirmed";
                                else if (isItemNU)    cls += " ite-day-item-nao-util";
                                else if (isFimSemana) cls += " ite-day-fim-semana";
                                else                  cls += " ite-day-util";
                                if (isHoje) cls += " ite-day-hoje";

                                const tip = isIndNU
                                  ? `${dia.getDate()} — Não útil no calendário industrial (imutável)`
                                  : isFimSemana
                                  ? `${dia.getDate()} — Final de semana`
                                  : isItemNU
                                  ? `${dia.getDate()} — Não útil para este item · clique para restaurar`
                                  : `${dia.getDate()} — Dia útil · clique para marcar como não útil`;

                                return (
                                  <td key={di} className="ite-td-day">
                                    <div
                                      className={cls}
                                      title={tip}
                                      onClick={isClickable ? () => handleDayClick(dia) : undefined}
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

                  <div className="ite-legend">
                    <div className="ite-legend-item"><div className="ite-legend-dot util" /><span>Dia útil</span></div>
                    <div className="ite-legend-item"><div className="ite-legend-dot confirmed" /><span>Dia útil (confirmado)</span></div>
                    <div className="ite-legend-item"><div className="ite-legend-dot fim-semana" /><span>Final de semana</span></div>
                    <div className="ite-legend-item"><div className="ite-legend-dot industrial-nao" /><span>Não útil no calendário industrial (imutável)</span></div>
                    <div className="ite-legend-item"><div className="ite-legend-dot item-nao" /><span>Não útil para este item</span></div>
                    <div className="ite-legend-item"><div className="ite-legend-dot hoje" /><span>Hoje</span></div>
                    <span style={{ marginLeft: "auto", fontSize: 11.5, color: "#7a9c84" }}>
                      1 clique = dia útil &nbsp;·&nbsp; 2 cliques = dia não útil
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="ite-footer">
          <div className="ite-footer-left">
            <div className="ite-footer-stat">Item: <strong>{itemInfo?.code ?? "—"}</strong></div>
            {mask && <div className="ite-footer-stat">Máscara: <strong>{mask}</strong></div>}
            <div className="ite-footer-stat">Período: <strong>{MESES[mes]}/{ano}</strong></div>
            {itemInfo && <div className="ite-footer-stat">Não úteis (item): <strong>{naoUteisDoMes}</strong></div>}
          </div>
          <div className="ite-footer-stat" style={{ color: "#a0b8a8" }}>
            VPME0102ITE · Engenharia
          </div>
        </footer>
      </div>

    </>
  );
}

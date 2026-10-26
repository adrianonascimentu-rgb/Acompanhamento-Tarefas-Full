import { supabase } from '@/lib/supabase';
import {
  subDays,
  addDays,
  startOfDay,
  endOfDay,
  isWithinInterval,
  parseISO,
  isValid,
  format,
} from 'date-fns';

export interface SalesCycleRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  startDay: number;  // e.g. 26
  endDay: number;    // e.g. 25
  refMonth: number;  // 1-12 (month where the cycle ends)
  refYear: number;   // YYYY
  label: string;     // e.g. "26/09/2026 a 25/10/2026"
  shortLabel: string; // e.g. "26/09 a 25/10"
  cycleName: string; // e.g. "Ciclo Outubro/2026"
  scope?: 'company' | 'user';
}

export interface SalesCyclePreference {
  scope: 'company' | 'user';
  userId?: string;
  startDay: number;       // default 26
  endDay: number;         // default 25
  startDate: string;      // YYYY-MM-DD
  endDate: string;        // YYYY-MM-DD
  autoRollover: boolean;  // true = follows startDay..endDay rule; false = fixed custom date range
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: string;
}

const STORAGE_KEY_CYCLE = 'sales_custom_cycle_range_v3';
const LEGACY_STORAGE_KEYS = ['sales_custom_cycle_range_v1', 'sales_custom_cycle_range_v2'];
export const SUPABASE_COMPANY_CYCLE_KEY = 'sales_cycle_config_company';
export const getSupabaseUserCycleKey = (userId: string) => `sales_cycle_config_user_${userId}`;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function clampDayForMonth(year: number, month1To12: number, day: number): number {
  const maxDays = new Date(year, month1To12, 0).getDate();
  return Math.min(Math.max(1, day), maxDays);
}

export function formatDateBR(yyyyMmDd: string): string {
  if (!yyyyMmDd || !yyyyMmDd.includes('-')) return yyyyMmDd;
  const [y, m, d] = yyyyMmDd.split('-');
  return `${d}/${m}/${y}`;
}

export function formatShortDateBR(yyyyMmDd: string): string {
  if (!yyyyMmDd || !yyyyMmDd.includes('-')) return yyyyMmDd;
  const [, m, d] = yyyyMmDd.split('-');
  return `${d}/${m}`;
}

/**
 * Calcula a data de fechamento de um mês comercial (base de 30 dias) subtraindo 5 dias
 * da data final do mês comercial utilizando `subDays` do `date-fns` (30 - 5 = dia 25).
 */
export function getCommercialMonthClosingDate(
  year: number,
  month1To12: number,
  endDay: number = 25
): Date {
  const safeEndDay = clampDayForMonth(year, month1To12, endDay || 25);
  // A data final do mês comercial de 30 dias fica 5 dias após o dia de fechamento (25 + 5 = 30).
  // Subtraímos 5 dias com `subDays` do `date-fns` para obter com precisão o dia 25 do mês comercial.
  const commercialMonthFinalDate = addDays(new Date(year, month1To12 - 1, safeEndDay, 12, 0, 0, 0), 5);
  return subDays(commercialMonthFinalDate, 5);
}

/**
 * Given a reference month (1-12) and year, returns the sales cycle:
 * Subtracts 5 days from each commercial month's final date via `date-fns` (`subDays`),
 * so the cycle starts on the 26th of the previous month and ends on the 25th of the reference month.
 */
export function getSalesCycleForMonthYear(
  refMonth: number,
  refYear: number,
  startDay: number = 26,
  endDay: number = 25,
  scope: 'company' | 'user' = 'company'
): SalesCycleRange {
  const safeStartDay = Math.min(31, Math.max(1, Number(startDay) || 26));
  const safeEndDay = Math.min(31, Math.max(1, Number(endDay) || 25));

  let startMonth = refMonth - 1;
  let startYear = refYear;

  // If startDay > endDay (e.g. 26 to 25), cycle crosses from previous month into refMonth
  if (safeStartDay > safeEndDay) {
    if (startMonth < 1) {
      startMonth = 12;
      startYear = refYear - 1;
    }
  } else {
    // Same calendar month (e.g. 1 to 30)
    startMonth = refMonth;
    startYear = refYear;
  }

  // Subtrai 5 dias da data final do mês comercial de referência (dia 30 comercial - 5 dias = dia 25)
  const closingDateObj = getCommercialMonthClosingDate(refYear, refMonth, safeEndDay);

  // Para o início do ciclo (padrão dia 26 do mês anterior = fechamento do mês comercial anterior + 1 dia)
  let openingDateObj: Date;
  if (safeStartDay === 26 && safeEndDay === 25) {
    const prevClosingDateObj = getCommercialMonthClosingDate(startYear, startMonth, safeEndDay);
    openingDateObj = addDays(prevClosingDateObj, 1);
  } else {
    const clampedStartDay = clampDayForMonth(startYear, startMonth, safeStartDay);
    openingDateObj = new Date(startYear, startMonth - 1, clampedStartDay, 12, 0, 0, 0);
  }

  const startDate = format(openingDateObj, 'yyyy-MM-dd');
  const endDate = format(closingDateObj, 'yyyy-MM-dd');

  const monthName = new Date(refYear, refMonth - 1, 1).toLocaleString('pt-BR', { month: 'long' });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return {
    startDate,
    endDate,
    startDay: safeStartDay,
    endDay: safeEndDay,
    refMonth,
    refYear,
    label: `${formatDateBR(startDate)} a ${formatDateBR(endDate)}`,
    shortLabel: `${formatShortDateBR(startDate)} a ${formatShortDateBR(endDate)}`,
    cycleName: `Ciclo ${capitalizedMonth}/${refYear} (${safeStartDay} a ${safeEndDay})`,
    scope,
  };
}

export function getTodayLocalYYYYMMDD(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Given any date (defaults to today), determines which sales cycle (default 26-to-25) it belongs to
 * by subtracting 5 days from the current commercial month's end date via `date-fns` (`subDays`).
 * If `date` is after the current month's closing date (day > 25, i.e. day >= 26), it belongs to next month's cycle.
 */
export function getDefaultSalesCycleForDate(
  date: Date = new Date(),
  startDay: number = 26,
  endDay: number = 25,
  scope: 'company' | 'user' = 'company'
): SalesCycleRange {
  const safeStartDay = Math.min(31, Math.max(1, Number(startDay) || 26));
  const safeEndDay = Math.min(31, Math.max(1, Number(endDay) || 25));

  let refMonth = date.getMonth() + 1;
  let refYear = date.getFullYear();

  // Data de fechamento do mês comercial atual (ex: dia 30 comercial - 5 dias via subDays = dia 25 às 23:59:59)
  const currentMonthClosing = endOfDay(getCommercialMonthClosingDate(refYear, refMonth, safeEndDay));

  if (safeStartDay > safeEndDay && date.getTime() > currentMonthClosing.getTime()) {
    refMonth += 1;
    if (refMonth > 12) {
      refMonth = 1;
      refYear += 1;
    }
  } else if (safeStartDay <= safeEndDay && date.getDate() > safeEndDay) {
    refMonth += 1;
    if (refMonth > 12) {
      refMonth = 1;
      refYear += 1;
    }
  }

  return getSalesCycleForMonthYear(refMonth, refYear, safeStartDay, safeEndDay, scope);
}

/**
 * Parses a date string (YYYY-MM-DD or ISO timestamp) or Date object into a local Date instance.
 */
export function parseSaleDateLocal(rawDate: string | Date | null | undefined): Date | null {
  if (!rawDate) return null;
  if (rawDate instanceof Date) {
    return isValid(rawDate) ? rawDate : null;
  }
  const str = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parsed = parseISO(`${str}T12:00:00`);
    return isValid(parsed) ? parsed : null;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parsed = parseISO(`${str.slice(0, 10)}T12:00:00`);
    return isValid(parsed) ? parsed : null;
  }
  const fallback = new Date(str);
  return isValid(fallback) ? fallback : null;
}

/**
 * Checks whether a date string (YYYY-MM-DD or ISO timestamp) or Date object falls
 * strictly within the commercial sales cycle interval [startDate, endDate] (inclusive)
 * using `date-fns` (`subDays`, `startOfDay`, `endOfDay`, `isWithinInterval`).
 */
export function isDateInSalesCycle(
  rawDate: string | Date | null | undefined,
  cycleRange: Pick<SalesCycleRange, 'startDate' | 'endDate'>
): boolean {
  if (!rawDate || !cycleRange?.startDate || !cycleRange?.endDate) return false;

  const saleDate = parseSaleDateLocal(rawDate);
  const startRaw = parseSaleDateLocal(cycleRange.startDate);
  const endRaw = parseSaleDateLocal(cycleRange.endDate);

  if (!saleDate || !startRaw || !endRaw) return false;

  // Subtrai 5 dias da data final do mês comercial correspondente (ou preserva o limite final configurado)
  const commercialEndBase = addDays(endRaw, 5);
  const cycleEnd = endOfDay(subDays(commercialEndBase, 5));
  const cycleStart = startOfDay(startRaw);

  if (cycleStart.getTime() > cycleEnd.getTime()) return false;

  return isWithinInterval(saleDate, { start: cycleStart, end: cycleEnd });
}

/**
 * Checks whether a sales_results database row's realized revenue (result_2026)
 * genuinely belongs to the given sales cycle range, preventing past-cycle values
 * from bleeding into a newly started cycle.
 */
export function isSalesResultFromCurrentCycle(
  row: { month?: number | null; year?: number | null; updated_at?: string | null; created_at?: string | null } | null | undefined,
  cycleRange: Pick<SalesCycleRange, 'startDate' | 'endDate' | 'refMonth' | 'refYear'>
): boolean {
  if (!row) return false;

  if (Number(row.month) !== Number(cycleRange.refMonth) || Number(row.year) !== Number(cycleRange.refYear)) {
    return false;
  }

  const rawTimestamp = row.updated_at || row.created_at;
  if (rawTimestamp && cycleRange.startDate && cycleRange.endDate) {
    if (!isDateInSalesCycle(rawTimestamp, cycleRange)) {
      return false;
    }
  }

  return true;
}

/**
 * Given a startDate and endDate (YYYY-MM-DD), infers the reference month/year
 * (based on endDate) and builds a SalesCycleRange object.
 */
export function buildCustomSalesCycleRange(
  startDate: string,
  endDate: string,
  scope: 'company' | 'user' = 'company'
): SalesCycleRange {
  const defaultCycle = getDefaultSalesCycleForDate();
  const safeEnd = endDate || defaultCycle.endDate;
  const safeStart = startDate || defaultCycle.startDate;

  const [, , startD] = safeStart.split('-').map(Number);
  const [endY, endM, endD] = safeEnd.split('-').map(Number);
  const refYear = endY || new Date().getFullYear();
  const refMonth = endM || new Date().getMonth() + 1;
  const startDay = startD || 26;
  const endDay = endD || 25;

  const monthName = new Date(refYear, refMonth - 1, 1).toLocaleString('pt-BR', { month: 'long' });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return {
    startDate: safeStart,
    endDate: safeEnd,
    startDay,
    endDay,
    refMonth,
    refYear,
    label: `${formatDateBR(safeStart)} a ${formatDateBR(safeEnd)}`,
    shortLabel: `${formatShortDateBR(safeStart)} a ${formatShortDateBR(safeEnd)}`,
    cycleName: `Ciclo ${capitalizedMonth}/${refYear} (${startDay} a ${endDay})`,
    scope,
  };
}

/**
 * Calculates total days, elapsed days, and remaining days in the selected [startDate, endDate] range.
 */
export function getCycleDaysProgress(startDate: string, endDate: string) {
  try {
    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [ey, em, ed] = endDate.split('-').map(Number);

    const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    const end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);

    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay));

    if (today < start) {
      return { totalDays, elapsedDays: 0, daysRemaining: totalDays };
    }
    if (today > end) {
      return { totalDays, elapsedDays: totalDays, daysRemaining: 0 };
    }

    const elapsedDays = Math.max(1, Math.floor((today.getTime() - start.getTime()) / msPerDay) + 1);
    const daysRemaining = Math.max(0, totalDays - elapsedDays);

    return { totalDays, elapsedDays, daysRemaining };
  } catch {
    return { totalDays: 30, elapsedDays: 15, daysRemaining: 15 };
  }
}

export function loadSavedSalesCycle(): SalesCycleRange {
  if (typeof window === 'undefined') {
    return getDefaultSalesCycleForDate();
  }
  const todayStr = getTodayLocalYYYYMMDD();
  try {
    // Clean up legacy keys from prior versions so stale cycle ranges are never reused
    LEGACY_STORAGE_KEYS.forEach(k => localStorage.removeItem(k));

    const raw = localStorage.getItem(STORAGE_KEY_CYCLE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.startDate && parsed?.endDate) {
        const startDay = Number(parsed.startDay) || 26;
        const endDay = Number(parsed.endDay) || 25;
        const scope = parsed.scope || 'company';
        const currentDefault = getDefaultSalesCycleForDate(new Date(), startDay, endDay, scope);

        // If the saved cycle already ended before today (parsed.endDate < todayStr),
        // roll over to the active commercial cycle using the configured startDay and endDay
        if (parsed.endDate < todayStr) {
          localStorage.setItem(
            STORAGE_KEY_CYCLE,
            JSON.stringify({
              startDate: currentDefault.startDate,
              endDate: currentDefault.endDate,
              startDay: currentDefault.startDay,
              endDay: currentDefault.endDay,
              scope: currentDefault.scope,
              autoRollover: true,
              savedOnDate: todayStr,
            })
          );
          return currentDefault;
        }

        const customRange = buildCustomSalesCycleRange(parsed.startDate, parsed.endDate, scope);
        return {
          ...customRange,
          startDay,
          endDay,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to read saved sales cycle:', e);
  }
  return getDefaultSalesCycleForDate();
}

export function saveSalesCycleRange(
  startDate: string,
  endDate: string,
  scope: 'company' | 'user' = 'company',
  autoRollover: boolean = true
): SalesCycleRange {
  const range = buildCustomSalesCycleRange(startDate, endDate, scope);
  if (typeof window !== 'undefined') {
    try {
      const todayStr = getTodayLocalYYYYMMDD();
      localStorage.setItem(
        STORAGE_KEY_CYCLE,
        JSON.stringify({
          startDate: range.startDate,
          endDate: range.endDate,
          startDay: range.startDay,
          endDay: range.endDay,
          scope: range.scope,
          autoRollover,
          savedOnDate: todayStr,
        })
      );
      window.dispatchEvent(new CustomEvent('sales_cycle_updated', { detail: range }));
    } catch (e) {
      console.warn('Failed to save sales cycle:', e);
    }
  }
  return range;
}

/**
 * Fetches the saved sales cycle preference from Supabase (user preference first, then company preference).
 * Automatically rolls over to the current cycle if the saved cycle's endDate is in the past
 * or if a new commercial cycle has started.
 */
export async function fetchSalesCycleFromSupabase(userId?: string): Promise<{
  range: SalesCycleRange;
  preference: SalesCyclePreference | null;
}> {
  const todayStr = getTodayLocalYYYYMMDD();

  try {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await fetch(`/api/sales/cycle${query}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      const pref: SalesCyclePreference | null = json.activePreference || null;
      if (pref && pref.startDate && pref.endDate) {
        const startDay = Number(pref.startDay) || 26;
        const endDay = Number(pref.endDay) || 25;
        const scope = pref.scope || 'company';
        const currentDefault = getDefaultSalesCycleForDate(new Date(), startDay, endDay, scope);

        const isExpired = pref.endDate < todayStr;
        const baseRange = isExpired
          ? currentDefault
          : buildCustomSalesCycleRange(pref.startDate, pref.endDate, scope);
        const range: SalesCycleRange = {
          ...baseRange,
          startDay: isExpired ? currentDefault.startDay : startDay,
          endDay: isExpired ? currentDefault.endDay : endDay,
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem(
            STORAGE_KEY_CYCLE,
            JSON.stringify({
              startDate: range.startDate,
              endDate: range.endDate,
              startDay: range.startDay,
              endDay: range.endDay,
              scope: range.scope,
              autoRollover: true,
              savedOnDate: todayStr,
            })
          );
        }
        return {
          range,
          preference: {
            ...pref,
            startDate: range.startDate,
            endDate: range.endDate,
            startDay: range.startDay,
            endDay: range.endDay,
          },
        };
      }
    }
  } catch (err) {
    console.warn('Fallback to direct Supabase system_settings for sales cycle:', err);
  }

  // Direct client-side fallback via Supabase system_settings
  try {
    const keys = userId
      ? [getSupabaseUserCycleKey(userId), SUPABASE_COMPANY_CYCLE_KEY]
      : [SUPABASE_COMPANY_CYCLE_KEY];

    const { data } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', keys);

    if (data && data.length > 0) {
      const userEntry = userId ? data.find(d => d.key === getSupabaseUserCycleKey(userId)) : null;
      const companyEntry = data.find(d => d.key === SUPABASE_COMPANY_CYCLE_KEY);
      const chosen = (userEntry?.value || companyEntry?.value) as SalesCyclePreference | undefined;

      if (chosen?.startDate && chosen?.endDate) {
        const startDay = Number(chosen.startDay) || 26;
        const endDay = Number(chosen.endDay) || 25;
        const scope = chosen.scope || 'company';
        const currentDefault = getDefaultSalesCycleForDate(new Date(), startDay, endDay, scope);

        const isExpired = chosen.endDate < todayStr;
        const baseRange = isExpired
          ? currentDefault
          : buildCustomSalesCycleRange(chosen.startDate, chosen.endDate, scope);
        const range: SalesCycleRange = {
          ...baseRange,
          startDay: isExpired ? currentDefault.startDay : startDay,
          endDay: isExpired ? currentDefault.endDay : endDay,
        };
        return {
          range,
          preference: {
            ...chosen,
            startDate: range.startDate,
            endDate: range.endDate,
            startDay: range.startDay,
            endDay: range.endDay,
          },
        };
      }
    }
  } catch (err) {
    console.warn('Error querying Supabase system_settings directly:', err);
  }

  return {
    range: loadSavedSalesCycle(),
    preference: null,
  };
}

/**
 * Saves the sales cycle configuration to Supabase (for the company or specific user)
 * and updates local state across all dashboard components.
 */
export async function saveSalesCycleToSupabase(params: {
  startDate: string;
  endDate: string;
  startDay?: number;
  endDay?: number;
  scope: 'company' | 'user';
  userId?: string;
  userName?: string;
  autoRollover?: boolean;
}): Promise<{ ok: boolean; range: SalesCycleRange; preference?: SalesCyclePreference }> {
  const range = saveSalesCycleRange(
    params.startDate,
    params.endDate,
    params.scope,
    params.autoRollover ?? true
  );

  const preferencePayload: SalesCyclePreference = {
    scope: params.scope,
    userId: params.userId,
    startDay: params.startDay ?? range.startDay,
    endDay: params.endDay ?? range.endDay,
    startDate: range.startDate,
    endDate: range.endDate,
    autoRollover: params.autoRollover ?? true,
    updatedBy: params.userId,
    updatedByName: params.userName || 'Gestão',
    updatedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch('/api/sales/cycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferencePayload),
    });

    if (res.ok) {
      const json = await res.json();
      return {
        ok: true,
        range,
        preference: json.preference || preferencePayload,
      };
    }
  } catch (err) {
    console.warn('API /api/sales/cycle failed, saving directly via Supabase client:', err);
  }

  // Fallback direct upsert to Supabase system_settings
  try {
    const settingKey =
      params.scope === 'user' && params.userId
        ? getSupabaseUserCycleKey(params.userId)
        : SUPABASE_COMPANY_CYCLE_KEY;

    const { error } = await supabase.from('system_settings').upsert({
      key: settingKey,
      value: preferencePayload,
      updated_at: new Date().toISOString(),
    });

    return { ok: !error, range, preference: preferencePayload };
  } catch (err) {
    console.error('Error saving sales cycle to Supabase:', err);
    return { ok: false, range, preference: preferencePayload };
  }
}

import { supabase } from '@/lib/supabase';

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

const STORAGE_KEY_CYCLE = 'sales_custom_cycle_range_v1';
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
 * Given a reference month (1-12) and year, returns the sales cycle:
 * By default starts on the 26th of the previous month and ends on the 25th of the reference month.
 * Also supports custom startDay and endDay configured by the user or company.
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

  const clampedStartDay = clampDayForMonth(startYear, startMonth, safeStartDay);
  const clampedEndDay = clampDayForMonth(refYear, refMonth, safeEndDay);

  const startDate = `${startYear}-${pad2(startMonth)}-${pad2(clampedStartDay)}`;
  const endDate = `${refYear}-${pad2(refMonth)}-${pad2(clampedEndDay)}`;

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

/**
 * Given any date (defaults to today), determines which sales cycle (default 26-to-25) it belongs to.
 * If day >= startDay (when startDay > endDay), it belongs to next month's cycle.
 */
export function getDefaultSalesCycleForDate(
  date: Date = new Date(),
  startDay: number = 26,
  endDay: number = 25,
  scope: 'company' | 'user' = 'company'
): SalesCycleRange {
  const safeStartDay = Math.min(31, Math.max(1, Number(startDay) || 26));
  const safeEndDay = Math.min(31, Math.max(1, Number(endDay) || 25));

  const day = date.getDate();
  let refMonth = date.getMonth() + 1;
  let refYear = date.getFullYear();

  if (safeStartDay > safeEndDay && day >= safeStartDay) {
    refMonth += 1;
    if (refMonth > 12) {
      refMonth = 1;
      refYear += 1;
    }
  }

  return getSalesCycleForMonthYear(refMonth, refYear, safeStartDay, safeEndDay, scope);
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
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CYCLE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.startDate && parsed?.endDate) {
        return buildCustomSalesCycleRange(
          parsed.startDate,
          parsed.endDate,
          parsed.scope || 'company'
        );
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
  scope: 'company' | 'user' = 'company'
): SalesCycleRange {
  const range = buildCustomSalesCycleRange(startDate, endDate, scope);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(
        STORAGE_KEY_CYCLE,
        JSON.stringify({
          startDate: range.startDate,
          endDate: range.endDate,
          startDay: range.startDay,
          endDay: range.endDay,
          scope: range.scope,
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
 * Also updates local cache and dispatches 'sales_cycle_updated' if a saved preference is found.
 */
export async function fetchSalesCycleFromSupabase(userId?: string): Promise<{
  range: SalesCycleRange;
  preference: SalesCyclePreference | null;
}> {
  try {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await fetch(`/api/sales/cycle${query}`);
    if (res.ok) {
      const json = await res.json();
      const pref: SalesCyclePreference | null = json.activePreference || null;
      if (pref && pref.startDate && pref.endDate) {
        const range = buildCustomSalesCycleRange(pref.startDate, pref.endDate, pref.scope || 'company');
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            STORAGE_KEY_CYCLE,
            JSON.stringify({
              startDate: range.startDate,
              endDate: range.endDate,
              startDay: range.startDay,
              endDay: range.endDay,
              scope: range.scope,
            })
          );
        }
        return { range, preference: pref };
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
        const range = buildCustomSalesCycleRange(chosen.startDate, chosen.endDate, chosen.scope || 'company');
        return { range, preference: chosen };
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
  const range = saveSalesCycleRange(params.startDate, params.endDate, params.scope);

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

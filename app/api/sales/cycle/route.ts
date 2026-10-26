import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  SalesCyclePreference,
  SUPABASE_COMPANY_CYCLE_KEY,
  getSupabaseUserCycleKey,
  getDefaultSalesCycleForDate,
  getSalesCycleForMonthYear,
  getTodayLocalYYYYMMDD,
} from '@/lib/salesCycle';

async function rolloverIfExpired(
  pref: SalesCyclePreference | null,
  settingKey: string,
  todayStr: string
): Promise<SalesCyclePreference | null> {
  if (!pref || !pref.endDate) return pref;

  const startDay = Number(pref.startDay) || 26;
  const endDay = Number(pref.endDay) || 25;
  const scope = pref.scope || 'company';
  const currentDefault = getDefaultSalesCycleForDate(new Date(), startDay, endDay, scope);

  if (pref.endDate < todayStr) {
    const updatedPref: SalesCyclePreference = {
      ...pref,
      startDay: currentDefault.startDay,
      endDay: currentDefault.endDay,
      startDate: currentDefault.startDate,
      endDate: currentDefault.endDate,
      autoRollover: true,
      updatedAt: new Date().toISOString(),
    };
    try {
      await supabase.from('system_settings').upsert({
        key: settingKey,
        value: updatedPref,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Warning persisting rolled over sales cycle:', e);
    }
    return updatedPref;
  }

  return pref;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || undefined;
    const todayStr = getTodayLocalYYYYMMDD();

    const keysToFetch = userId
      ? [getSupabaseUserCycleKey(userId), SUPABASE_COMPANY_CYCLE_KEY]
      : [SUPABASE_COMPANY_CYCLE_KEY];

    let userPreference: SalesCyclePreference | null = null;
    let companyPreference: SalesCyclePreference | null = null;

    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value, updated_at')
      .in('key', keysToFetch);

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        if (userId && row.key === getSupabaseUserCycleKey(userId) && row.value) {
          userPreference = row.value as SalesCyclePreference;
        }
        if (row.key === SUPABASE_COMPANY_CYCLE_KEY && row.value) {
          companyPreference = row.value as SalesCyclePreference;
        }
      }
    }

    if (userId && userPreference) {
      userPreference = await rolloverIfExpired(
        userPreference,
        getSupabaseUserCycleKey(userId),
        todayStr
      );
    }

    if (companyPreference) {
      companyPreference = await rolloverIfExpired(
        companyPreference,
        SUPABASE_COMPANY_CYCLE_KEY,
        todayStr
      );
    }

    // Default company cycle (26 of previous month to 25 of current/next month) if none stored yet
    if (!companyPreference) {
      const def = getDefaultSalesCycleForDate(new Date(), 26, 25, 'company');
      companyPreference = {
        scope: 'company',
        startDay: 26,
        endDay: 25,
        startDate: def.startDate,
        endDate: def.endDate,
        autoRollover: true,
      };
    }

    const activePreference = userPreference || companyPreference;

    return NextResponse.json({
      activePreference,
      companyPreference,
      userPreference,
    });
  } catch (error: any) {
    console.error('Error in GET /api/sales/cycle:', error);
    const def = getDefaultSalesCycleForDate(new Date(), 26, 25, 'company');
    return NextResponse.json({
      activePreference: {
        scope: 'company',
        startDay: 26,
        endDay: 25,
        startDate: def.startDate,
        endDate: def.endDate,
        autoRollover: true,
      },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      scope = 'company',
      userId,
      startDay = 26,
      endDay = 25,
      startDate,
      endDate,
      autoRollover = true,
      updatedBy,
      updatedByName,
    } = body;

    const computedCycle =
      startDate && endDate
        ? { startDate, endDate }
        : getDefaultSalesCycleForDate(new Date(), Number(startDay) || 26, Number(endDay) || 25, scope);

    const preference: SalesCyclePreference = {
      scope: scope === 'user' ? 'user' : 'company',
      userId: userId || undefined,
      startDay: Number(startDay) || 26,
      endDay: Number(endDay) || 25,
      startDate: computedCycle.startDate,
      endDate: computedCycle.endDate,
      autoRollover: Boolean(autoRollover),
      updatedBy: updatedBy || userId || undefined,
      updatedByName: updatedByName || 'Gestão',
      updatedAt: new Date().toISOString(),
    };

    const settingKey =
      preference.scope === 'user' && userId
        ? getSupabaseUserCycleKey(userId)
        : SUPABASE_COMPANY_CYCLE_KEY;

    const { error } = await supabase.from('system_settings').upsert({
      key: settingKey,
      value: preference,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('Supabase system_settings upsert warning:', error);
    }

    // If user resets to company cycle, optionally clear user override if requested
    if (body.clearUserOverride && userId) {
      await supabase
        .from('system_settings')
        .delete()
        .eq('key', getSupabaseUserCycleKey(userId));
    }

    const refParts = preference.endDate.split('-').map(Number);
    const refYear = refParts[0] || new Date().getFullYear();
    const refMonth = refParts[1] || new Date().getMonth() + 1;
    const range = getSalesCycleForMonthYear(
      refMonth,
      refYear,
      preference.startDay,
      preference.endDay,
      preference.scope
    );

    return NextResponse.json({
      success: true,
      preference,
      range: {
        ...range,
        startDate: preference.startDate,
        endDate: preference.endDate,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/sales/cycle:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao salvar configuração de ciclo de vendas no Supabase' },
      { status: 500 }
    );
  }
}

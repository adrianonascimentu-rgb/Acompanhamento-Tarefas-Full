import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getDefaultSalesCycleForDate } from '@/lib/salesCycle';
import { evaluateAndDispatchSalesMilestones } from '@/app/api/sales/milestone-alerts/route';

export interface DailySaleEntry {
  id?: string;
  date: string; // YYYY-MM-DD
  collaborator_id: string;
  seller_name: string;
  sales_amount: number;
  orders_count: number;
  store?: string;
  notes?: string;
  created_by?: string;
  created_by_name?: string;
  updated_at?: string;
}

const SETTING_KEY_DAILY_SALES = 'daily_sales_registry';

async function getStoredDailySales(): Promise<DailySaleEntry[]> {
  try {
    const { data, error } = await supabase
      .from('daily_sales_results')
      .select('*')
      .order('date', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data as DailySaleEntry[];
    }
  } catch (err) {
    console.warn('Table daily_sales_results not yet ready, using system_settings fallback:', err);
  }

  try {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', SETTING_KEY_DAILY_SALES)
      .maybeSingle();

    if (data && Array.isArray(data.value)) {
      return data.value as DailySaleEntry[];
    }
  } catch (err) {
    console.warn('Error reading from system_settings:', err);
  }

  return [];
}

async function saveDailySales(entriesToSave: DailySaleEntry[]): Promise<boolean> {
  let tableSuccess = false;

  try {
    const { error } = await supabase
      .from('daily_sales_results')
      .upsert(
        entriesToSave.map(e => ({
          date: e.date,
          collaborator_id: e.collaborator_id,
          seller_name: e.seller_name,
          sales_amount: Number(e.sales_amount) || 0,
          orders_count: Number(e.orders_count) || 0,
          store: e.store || '',
          notes: e.notes || '',
          created_by: e.created_by,
          created_by_name: e.created_by_name,
          updated_at: new Date().toISOString()
        })),
        { onConflict: 'date,collaborator_id' }
      );

    if (!error) {
      tableSuccess = true;
    }
  } catch (err) {
    console.warn('Upsert to daily_sales_results failed or table missing:', err);
  }

  try {
    const currentList = await getStoredDailySales();
    const map = new Map<string, DailySaleEntry>();

    currentList.forEach(item => {
      const key = `${item.date}_${item.collaborator_id}`;
      map.set(key, item);
    });

    entriesToSave.forEach(item => {
      const key = `${item.date}_${item.collaborator_id}`;
      map.set(key, {
        ...map.get(key),
        ...item,
        updated_at: new Date().toISOString()
      });
    });

    const updatedList = Array.from(map.values());

    await supabase.from('system_settings').upsert({
      key: SETTING_KEY_DAILY_SALES,
      value: updatedList,
      updated_at: new Date().toISOString()
    });

    return true;
  } catch (err) {
    console.error('Failed saving to system_settings:', err);
    return tableSuccess;
  }
}

// Sync sales_results for given sellers using the company's 26-to-25 sales cycle
async function syncMonthlySalesResults(dateString: string, sellerIds: string[]) {
  try {
    const parsedDate = new Date(dateString + 'T12:00:00Z');
    const cycle = getDefaultSalesCycleForDate(parsedDate);
    const { startDate, endDate, refMonth, refYear } = cycle;

    const allDaily = await getStoredDailySales();
    const cycleDaily = allDaily.filter(d => d.date >= startDate && d.date <= endDate);

    for (const sellerId of sellerIds) {
      const sellerDaily = cycleDaily.filter(d => d.collaborator_id === sellerId);
      const totalCycleSales = sellerDaily.reduce((acc, curr) => acc + (Number(curr.sales_amount) || 0), 0);

      const { data: existing } = await supabase
        .from('sales_results')
        .select('*')
        .eq('collaborator_id', sellerId)
        .eq('month', refMonth)
        .eq('year', refYear)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('sales_results')
          .update({
            result_2026: totalCycleSales,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Inherit the seller's previous cycle target_2026 if available
        let prevTarget = 50000;
        let prevSuggestion = 50000;
        let prevRes2025 = 0;
        try {
          const { data: prevRow } = await supabase
            .from('sales_results')
            .select('target_2026, target_suggestion, result_2025')
            .eq('collaborator_id', sellerId)
            .order('year', { ascending: false })
            .order('month', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (prevRow && Number(prevRow.target_2026) > 0) {
            prevTarget = Number(prevRow.target_2026);
            prevSuggestion = Number(prevRow.target_suggestion) || prevTarget;
            prevRes2025 = Number(prevRow.result_2025) || 0;
          }
        } catch {}

        await supabase
          .from('sales_results')
          .insert({
            collaborator_id: sellerId,
            month: refMonth,
            year: refYear,
            result_2025: prevRes2025,
            target_suggestion: prevSuggestion,
            target_2026: prevTarget,
            result_2026: totalCycleSales,
            updated_at: new Date().toISOString()
          });
      }
    }
  } catch (err) {
    console.error('Error syncing cycle sales_results:', err);
  }
}

function buildRangeAggregates(filtered: DailySaleEntry[]) {
  const byDate: Record<string, { total: number; sellers_count: number; orders: number }> = {};
  const bySeller: Record<string, { sales_amount: number; orders_count: number; seller_name: string }> = {};

  let totalSales = 0;
  let totalOrders = 0;

  filtered.forEach(item => {
    const amount = Number(item.sales_amount) || 0;
    const orders = Number(item.orders_count) || 0;
    totalSales += amount;
    totalOrders += orders;

    if (!byDate[item.date]) {
      byDate[item.date] = { total: 0, sellers_count: 0, orders: 0 };
    }
    byDate[item.date].total += amount;
    byDate[item.date].orders += orders;
    if (amount > 0) {
      byDate[item.date].sellers_count += 1;
    }

    if (!bySeller[item.collaborator_id]) {
      bySeller[item.collaborator_id] = {
        sales_amount: 0,
        orders_count: 0,
        seller_name: item.seller_name || 'Vendedor'
      };
    }
    bySeller[item.collaborator_id].sales_amount += amount;
    bySeller[item.collaborator_id].orders_count += orders;
  });

  const activeSellersCount = Object.values(bySeller).filter(s => s.sales_amount > 0).length;

  return {
    byDate,
    bySeller,
    summary: {
      total_sales: totalSales,
      total_orders: totalOrders,
      sellers_reported: Object.keys(bySeller).length,
      sellers_with_sales: activeSellersCount
    }
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const all = await getStoredDailySales();

    if (date) {
      const filtered = all.filter(e => e.date === date);
      const totalDay = filtered.reduce((acc, curr) => acc + (Number(curr.sales_amount) || 0), 0);
      const ordersDay = filtered.reduce((acc, curr) => acc + (Number(curr.orders_count) || 0), 0);
      return NextResponse.json({
        date,
        entries: filtered,
        summary: {
          total_sales: totalDay,
          total_orders: ordersDay,
          sellers_reported: filtered.length,
          sellers_with_sales: filtered.filter(f => Number(f.sales_amount) > 0).length
        }
      });
    }

    if (startDate && endDate) {
      const filtered = all.filter(e => e.date >= startDate && e.date <= endDate);
      const { byDate, bySeller, summary } = buildRangeAggregates(filtered);

      return NextResponse.json({
        startDate,
        endDate,
        entries: filtered,
        days_summary: byDate,
        by_seller: bySeller,
        total_registry_entries: all.length,
        summary
      });
    }

    if (month && year) {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      const filtered = all.filter(e => e.date.startsWith(prefix));
      const { byDate, bySeller, summary } = buildRangeAggregates(filtered);

      return NextResponse.json({
        month: Number(month),
        year: Number(year),
        entries: filtered,
        days_summary: byDate,
        by_seller: bySeller,
        summary
      });
    }

    return NextResponse.json({ entries: all });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro ao consultar lançamentos diários' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, entries, created_by, created_by_name } = body;

    if (!date || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'Data e lista de lançamentos são obrigatórios' }, { status: 400 });
    }

    const formattedEntries: DailySaleEntry[] = entries.map((item: any) => ({
      date,
      collaborator_id: item.collaborator_id,
      seller_name: item.seller_name || 'Vendedor',
      sales_amount: Number(item.sales_amount) || 0,
      orders_count: Number(item.orders_count) || (Number(item.sales_amount) > 0 ? 1 : 0),
      store: item.store || 'Loja Principal',
      notes: item.notes || '',
      created_by: created_by || null,
      created_by_name: created_by_name || 'Gestão',
      updated_at: new Date().toISOString()
    }));

    await saveDailySales(formattedEntries);

    const sellerIds = Array.from(new Set(formattedEntries.map(e => e.collaborator_id)));
    await syncMonthlySalesResults(date, sellerIds);

    // Automatically check 50%, 75%, and 100% milestones and dispatch push notifications to sellers
    const parsedDate = new Date(date + 'T12:00:00Z');
    const cycle = getDefaultSalesCycleForDate(parsedDate);
    let dispatchedMilestones: any[] = [];
    try {
      const milestoneResult = await evaluateAndDispatchSalesMilestones({
        refMonth: cycle.refMonth,
        refYear: cycle.refYear,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        sellerIds
      });
      dispatchedMilestones = milestoneResult.newlyDispatched || [];
    } catch (mErr) {
      console.warn('Erro ao disparar alertas de marcos de metas:', mErr);
    }

    const totalDay = formattedEntries.reduce((acc, curr) => acc + (Number(curr.sales_amount) || 0), 0);
    const totalOrders = formattedEntries.reduce((acc, curr) => acc + (Number(curr.orders_count) || 0), 0);

    return NextResponse.json({
      success: true,
      date,
      count: formattedEntries.length,
      total_sales: totalDay,
      total_orders: totalOrders,
      milestone_alerts: dispatchedMilestones,
      message: 'Lançamentos diários de vendas salvos com sucesso!'
    });
  } catch (err: any) {
    console.error('Erro no POST /api/sales/daily:', err);
    return NextResponse.json({ error: err?.message || 'Falha ao processar lançamentos diários' }, { status: 500 });
  }
}

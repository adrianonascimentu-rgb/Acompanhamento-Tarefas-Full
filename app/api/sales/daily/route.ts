import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    // Try table first
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

  // Fallback to system_settings
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
    // Attempt upsert to daily_sales_results
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

  // Always keep system_settings synced as resilient fallback
  try {
    const currentList = await getStoredDailySales();
    const map = new Map<string, DailySaleEntry>();
    
    // Add existing
    currentList.forEach(item => {
      const key = `${item.date}_${item.collaborator_id}`;
      map.set(key, item);
    });

    // Merge new entries
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

// Sync monthly sales_results for given sellers and month/year
async function syncMonthlySalesResults(dateString: string, sellerIds: string[]) {
  try {
    const parsedDate = new Date(dateString + 'T12:00:00Z');
    const month = parsedDate.getMonth() + 1;
    const year = parsedDate.getFullYear();

    // Get all daily entries for this month
    const allDaily = await getStoredDailySales();
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const monthDaily = allDaily.filter(d => d.date.startsWith(monthPrefix));

    // Calculate sum for each seller in this month
    for (const sellerId of sellerIds) {
      const sellerDaily = monthDaily.filter(d => d.collaborator_id === sellerId);
      const totalMonthSales = sellerDaily.reduce((acc, curr) => acc + (Number(curr.sales_amount) || 0), 0);

      // Check existing sales_results entry
      const { data: existing } = await supabase
        .from('sales_results')
        .select('*')
        .eq('collaborator_id', sellerId)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle();

      if (existing) {
        // Update result_2026
        await supabase
          .from('sales_results')
          .update({
            result_2026: totalMonthSales,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Insert new entry with default targets
        await supabase
          .from('sales_results')
          .insert({
            collaborator_id: sellerId,
            month,
            year,
            result_2025: 0,
            target_suggestion: 50000,
            target_2026: 50000,
            result_2026: totalMonthSales
          });
      }
    }
  } catch (err) {
    console.error('Error syncing monthly sales_results:', err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
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

    if (month && year) {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      const filtered = all.filter(e => e.date.startsWith(prefix));
      
      // Group by date
      const byDate: Record<string, { total: number; sellers_count: number; orders: number }> = {};
      filtered.forEach(item => {
        if (!byDate[item.date]) {
          byDate[item.date] = { total: 0, sellers_count: 0, orders: 0 };
        }
        byDate[item.date].total += Number(item.sales_amount) || 0;
        byDate[item.date].orders += Number(item.orders_count) || 0;
        if (Number(item.sales_amount) > 0) {
          byDate[item.date].sellers_count += 1;
        }
      });

      return NextResponse.json({
        month: Number(month),
        year: Number(year),
        entries: filtered,
        days_summary: byDate
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

    // Sync monthly totals in sales_results
    const sellerIds = Array.from(new Set(formattedEntries.map(e => e.collaborator_id)));
    await syncMonthlySalesResults(date, sellerIds);

    const totalDay = formattedEntries.reduce((acc, curr) => acc + (Number(curr.sales_amount) || 0), 0);
    const totalOrders = formattedEntries.reduce((acc, curr) => acc + (Number(curr.orders_count) || 0), 0);

    return NextResponse.json({
      success: true,
      date,
      count: formattedEntries.length,
      total_sales: totalDay,
      total_orders: totalOrders,
      message: 'Lançamentos diários de vendas salvos com sucesso!'
    });
  } catch (err: any) {
    console.error('Erro no POST /api/sales/daily:', err);
    return NextResponse.json({ error: err?.message || 'Falha ao processar lançamentos diários' }, { status: 500 });
  }
}

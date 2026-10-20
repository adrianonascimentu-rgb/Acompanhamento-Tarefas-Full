import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/serverAuth';
import { getSafeSupabaseConfig } from '@/lib/supabase';

function getSupabaseClient() {
  const { supabaseUrl, supabaseServiceKey } = getSafeSupabaseConfig();
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

const parseNum = (val: any) => (val !== '' && val !== null && val !== undefined ? parseFloat(String(val).replace(',', '.')) : null);

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authorized) return auth.response;

    const supabase = getSupabaseClient();
    const body = await request.json();

    if (Array.isArray(body) || Array.isArray(body.items)) {
      const rawList = Array.isArray(body) ? body : body.items;
      const recordsToInsert = rawList.map((item: any) => ({
        product_code: item.product_code?.trim() || null,
        product_name: item.product_name?.trim() || null,
        full_price: parseNum(item.full_price),
        cash_price: parseNum(item.cash_price),
        store_name: item.store_name?.trim() || null,
        company_id: item.company_id || null,
        created_by: item.created_by || null,
      }));

      const { data, error } = await supabase
        .from('competitor_prices')
        .insert(recordsToInsert)
        .select();

      if (error) {
        if (error.message?.includes('schema cache') || error.message?.includes('competitor_prices') || error.code === 'PGRST301' || error.code === '42P01') {
          return NextResponse.json({ 
            error: "A tabela 'competitor_prices' não existe no banco de dados Supabase.",
            missing_table: true 
          }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, count: data?.length || 0, data });
    }

    const { product_code, product_name, full_price, cash_price, store_name, company_id, created_by } = body;

    let targetCompanyId = company_id || null;
    if (!targetCompanyId && created_by) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', created_by)
        .single();
      if (profile?.company_id) {
        targetCompanyId = profile.company_id;
      }
    }

    const { data, error } = await supabase
      .from('competitor_prices')
      .insert([
        {
          product_code: product_code?.trim() || null,
          product_name: product_name?.trim() || null,
          full_price: parseNum(full_price),
          cash_price: parseNum(cash_price),
          store_name: store_name?.trim() || null,
          company_id: targetCompanyId,
          created_by: created_by || null,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.message?.includes('schema cache') || error.message?.includes('competitor_prices') || error.code === 'PGRST301' || error.code === '42P01') {
        return NextResponse.json({ 
          error: "A tabela 'competitor_prices' não existe no banco de dados Supabase.",
          missing_table: true 
        }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao salvar pesquisa.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authorized) return auth.response;

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('competitor_prices')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      if (error.message?.includes('schema cache') || error.message?.includes('competitor_prices') || error.code === 'PGRST301' || error.code === '42P01') {
        return NextResponse.json({ 
          error: "A tabela 'competitor_prices' não foi encontrada no Supabase.",
          missing_table: true,
          data: []
        }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao carregar pesquisas.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authorized) return auth.response;

    const supabase = getSupabaseClient();
    const body = await request.json();
    const { id, product_code, product_name, full_price, cash_price, store_name } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório para atualização.' }, { status: 400 });
    }

    const payload: Record<string, any> = {};
    if (product_code !== undefined) payload.product_code = product_code?.trim() || null;
    if (product_name !== undefined) payload.product_name = product_name?.trim() || null;
    if (full_price !== undefined) payload.full_price = parseNum(full_price);
    if (cash_price !== undefined) payload.cash_price = parseNum(cash_price);
    if (store_name !== undefined) payload.store_name = store_name?.trim() || null;

    const { data, error } = await supabase
      .from('competitor_prices')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao atualizar pesquisa de preço.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authorized) return auth.response;

    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch (e) {}
    }

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });
    }

    const { error, count } = await supabase
      .from('competitor_prices')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (count === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Registro não encontrado ou você não tem permissão para excluí-lo.' 
      }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: count });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao excluir pesquisa.' }, { status: 500 });
  }
}

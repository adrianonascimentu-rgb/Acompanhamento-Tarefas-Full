import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/serverAuth';
import { getSafeSupabaseConfig } from '@/lib/supabase';

function getSupabaseClient() {
  const { supabaseUrl, supabaseServiceKey } = getSafeSupabaseConfig();
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS mercado_livre_research (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  segmento_ml TEXT,
  codigo TEXT,
  nome TEXT,
  cod_adicional_1 TEXT,
  estoque INTEGER DEFAULT 0,
  vds_6m INTEGER DEFAULT 0,
  a_vista_cp NUMERIC(10, 2),
  liq_ml_envios NUMERIC(10, 2),
  pr_cp_ml NUMERIC(10, 2),
  pr_vende_mais NUMERIC(10, 2),
  liq_ml_full NUMERIC(10, 2),
  full_price NUMERIC(10, 2),
  segundo_preco NUMERIC(10, 2),
  cod_adicional_2 TEXT,
  cod_adicional_3 TEXT,
  cod_adicional_4 TEXT,
  cod_adicional_5 TEXT,
  codigo_barras TEXT,
  nome_fabricante TEXT,
  link_campos TEXT,
  link_vd_mais TEXT,
  vd_mais_segundo_pr NUMERIC(10, 2),
  company_id UUID,
  created_by UUID
);

ALTER TABLE mercado_livre_research ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mercado_livre_research_select" ON mercado_livre_research;
CREATE POLICY "mercado_livre_research_select" ON mercado_livre_research
FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "mercado_livre_research_insert" ON mercado_livre_research;
CREATE POLICY "mercado_livre_research_insert" ON mercado_livre_research
FOR INSERT TO authenticated, anon WITH CHECK (true);

DROP POLICY IF EXISTS "mercado_livre_research_update" ON mercado_livre_research;
CREATE POLICY "mercado_livre_research_update" ON mercado_livre_research
FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "mercado_livre_research_delete" ON mercado_livre_research;
CREATE POLICY "mercado_livre_research_delete" ON mercado_livre_research
FOR DELETE TO authenticated, anon USING (true);

NOTIFY pgrst, 'reload schema';`;

const parseNum = (val: any) => (val !== '' && val !== null && val !== undefined ? parseFloat(String(val).replace(',', '.')) : null);
const parseIntVal = (val: any) => (val !== '' && val !== null && val !== undefined ? parseInt(String(val), 10) : 0);

function mapItemPayload(item: any) {
  return {
    segmento_ml: item.segmento_ml?.trim() || null,
    codigo: item.codigo?.trim() || null,
    nome: item.nome?.trim() || null,
    cod_adicional_1: item.cod_adicional_1?.trim() || null,
    estoque: parseIntVal(item.estoque),
    vds_6m: parseIntVal(item.vds_6m),
    a_vista_cp: parseNum(item.a_vista_cp),
    liq_ml_envios: parseNum(item.liq_ml_envios),
    pr_cp_ml: parseNum(item.pr_cp_ml),
    pr_vende_mais: parseNum(item.pr_vende_mais),
    liq_ml_full: parseNum(item.liq_ml_full),
    full_price: parseNum(item.full_price),
    segundo_preco: parseNum(item.segundo_preco),
    cod_adicional_2: item.cod_adicional_2?.trim() || null,
    cod_adicional_3: item.cod_adicional_3?.trim() || null,
    cod_adicional_4: item.cod_adicional_4?.trim() || null,
    cod_adicional_5: item.cod_adicional_5?.trim() || null,
    codigo_barras: item.codigo_barras?.trim() || null,
    nome_fabricante: item.nome_fabricante?.trim() || null,
    link_campos: item.link_campos?.trim() || null,
    link_vd_mais: item.link_vd_mais?.trim() || null,
    vd_mais_segundo_pr: parseNum(item.vd_mais_segundo_pr),
    company_id: item.company_id || null,
    created_by: item.created_by || null,
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authorized) return auth.response;

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('mercado_livre_research')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message?.includes('schema cache') || error.message?.includes('mercado_livre_research') || error.code === 'PGRST301' || error.code === '42P01') {
        return NextResponse.json({ 
          error: "A tabela 'mercado_livre_research' não existe no Supabase.",
          missing_table: true,
          create_sql: CREATE_TABLE_SQL,
          data: []
        }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao carregar dados do Mercado Livre.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authorized) return auth.response;

    const supabase = getSupabaseClient();
    const body = await request.json();

    if (Array.isArray(body) || Array.isArray(body.items)) {
      const rawList = Array.isArray(body) ? body : body.items;
      const recordsToInsert = rawList.map(mapItemPayload);
      const { data, error } = await supabase
        .from('mercado_livre_research')
        .insert(recordsToInsert)
        .select();

      if (error) {
        if (error.message?.includes('schema cache') || error.message?.includes('mercado_livre_research') || error.code === 'PGRST301' || error.code === '42P01') {
          return NextResponse.json({ 
            error: "A tabela 'mercado_livre_research' não existe no Supabase.",
            missing_table: true,
            create_sql: CREATE_TABLE_SQL
          }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, count: data?.length || 0, data });
    }

    const payload = mapItemPayload(body);
    const { data, error } = await supabase
      .from('mercado_livre_research')
      .insert([payload])
      .select()
      .single();

    if (error) {
      if (error.message?.includes('schema cache') || error.message?.includes('mercado_livre_research') || error.code === 'PGRST301' || error.code === '42P01') {
        return NextResponse.json({ 
          error: "A tabela 'mercado_livre_research' não existe no Supabase.",
          missing_table: true,
          create_sql: CREATE_TABLE_SQL
        }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao salvar registro do Mercado Livre.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authorized) return auth.response;

    const supabase = getSupabaseClient();
    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório para atualização.' }, { status: 400 });
    }

    const payload: Record<string, any> = {};
    if (updateFields.segmento_ml !== undefined) payload.segmento_ml = updateFields.segmento_ml?.trim() || null;
    if (updateFields.codigo !== undefined) payload.codigo = updateFields.codigo?.trim() || null;
    if (updateFields.nome !== undefined) payload.nome = updateFields.nome?.trim() || null;
    if (updateFields.cod_adicional_1 !== undefined) payload.cod_adicional_1 = updateFields.cod_adicional_1?.trim() || null;
    if (updateFields.estoque !== undefined) payload.estoque = parseIntVal(updateFields.estoque);
    if (updateFields.vds_6m !== undefined) payload.vds_6m = parseIntVal(updateFields.vds_6m);
    if (updateFields.a_vista_cp !== undefined) payload.a_vista_cp = parseNum(updateFields.a_vista_cp);
    if (updateFields.liq_ml_envios !== undefined) payload.liq_ml_envios = parseNum(updateFields.liq_ml_envios);
    if (updateFields.pr_cp_ml !== undefined) payload.pr_cp_ml = parseNum(updateFields.pr_cp_ml);
    if (updateFields.pr_vende_mais !== undefined) payload.pr_vende_mais = parseNum(updateFields.pr_vende_mais);
    if (updateFields.liq_ml_full !== undefined) payload.liq_ml_full = parseNum(updateFields.liq_ml_full);
    if (updateFields.full_price !== undefined) payload.full_price = parseNum(updateFields.full_price);
    if (updateFields.segundo_preco !== undefined) payload.segundo_preco = parseNum(updateFields.segundo_preco);
    if (updateFields.cod_adicional_2 !== undefined) payload.cod_adicional_2 = updateFields.cod_adicional_2?.trim() || null;
    if (updateFields.cod_adicional_3 !== undefined) payload.cod_adicional_3 = updateFields.cod_adicional_3?.trim() || null;
    if (updateFields.cod_adicional_4 !== undefined) payload.cod_adicional_4 = updateFields.cod_adicional_4?.trim() || null;
    if (updateFields.cod_adicional_5 !== undefined) payload.cod_adicional_5 = updateFields.cod_adicional_5?.trim() || null;
    if (updateFields.codigo_barras !== undefined) payload.codigo_barras = updateFields.codigo_barras?.trim() || null;
    if (updateFields.nome_fabricante !== undefined) payload.nome_fabricante = updateFields.nome_fabricante?.trim() || null;
    if (updateFields.link_campos !== undefined) payload.link_campos = updateFields.link_campos?.trim() || null;
    if (updateFields.link_vd_mais !== undefined) payload.link_vd_mais = updateFields.link_vd_mais?.trim() || null;
    if (updateFields.vd_mais_segundo_pr !== undefined) payload.vd_mais_segundo_pr = parseNum(updateFields.vd_mais_segundo_pr);

    const { data, error } = await supabase
      .from('mercado_livre_research')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao atualizar registro do Mercado Livre.' }, { status: 500 });
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
      .from('mercado_livre_research')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, deleted: count });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao excluir registro.' }, { status: 500 });
  }
}

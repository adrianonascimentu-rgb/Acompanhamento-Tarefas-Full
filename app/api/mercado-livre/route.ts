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

    const {
      segmento_ml,
      codigo,
      nome,
      cod_adicional_1,
      estoque,
      vds_6m,
      a_vista_cp,
      liq_ml_envios,
      pr_cp_ml,
      pr_vende_mais,
      liq_ml_full,
      full_price,
      segundo_preco,
      cod_adicional_2,
      cod_adicional_3,
      cod_adicional_4,
      cod_adicional_5,
      codigo_barras,
      nome_fabricante,
      link_campos,
      link_vd_mais,
      vd_mais_segundo_pr,
      company_id,
      created_by
    } = body;

    const parseNum = (val: any) => (val !== '' && val !== null && val !== undefined ? parseFloat(val) : null);
    const parseIntVal = (val: any) => (val !== '' && val !== null && val !== undefined ? parseInt(val, 10) : 0);

    const { data, error } = await supabase
      .from('mercado_livre_research')
      .insert([
        {
          segmento_ml: segmento_ml?.trim() || null,
          codigo: codigo?.trim() || null,
          nome: nome?.trim() || null,
          cod_adicional_1: cod_adicional_1?.trim() || null,
          estoque: parseIntVal(estoque),
          vds_6m: parseIntVal(vds_6m),
          a_vista_cp: parseNum(a_vista_cp),
          liq_ml_envios: parseNum(liq_ml_envios),
          pr_cp_ml: parseNum(pr_cp_ml),
          pr_vende_mais: parseNum(pr_vende_mais),
          liq_ml_full: parseNum(liq_ml_full),
          full_price: parseNum(full_price),
          segundo_preco: parseNum(segundo_preco),
          cod_adicional_2: cod_adicional_2?.trim() || null,
          cod_adicional_3: cod_adicional_3?.trim() || null,
          cod_adicional_4: cod_adicional_4?.trim() || null,
          cod_adicional_5: cod_adicional_5?.trim() || null,
          codigo_barras: codigo_barras?.trim() || null,
          nome_fabricante: nome_fabricante?.trim() || null,
          link_campos: link_campos?.trim() || null,
          link_vd_mais: link_vd_mais?.trim() || null,
          vd_mais_segundo_pr: parseNum(vd_mais_segundo_pr),
          company_id: company_id || null,
          created_by: created_by || null,
        }
      ])
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

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


const normCode = (val: any) => {
  if (val === null || val === undefined) return "";
  const s = String(val).trim().toLowerCase().replace(/^0+/, "");
  return s || "0";
};

const parseStr = (val: any) => (val !== null && val !== undefined && String(val).trim() !== '' ? String(val).trim() : null);
const parseNum = (val: any) => (val !== '' && val !== null && val !== undefined ? parseFloat(String(val).replace(',', '.')) : null);
const parseIntVal = (val: any) => (val !== '' && val !== null && val !== undefined ? parseInt(String(val), 10) : 0);

function mapItemPayload(item: any) {
  return {
    segmento_ml: parseStr(item.segmento_ml),
    codigo: parseStr(item.codigo),
    nome: parseStr(item.nome),
    cod_adicional_1: parseStr(item.cod_adicional_1),
    estoque: parseIntVal(item.estoque),
    vds_6m: parseIntVal(item.vds_6m),
    a_vista_cp: parseNum(item.a_vista_cp),
    liq_ml_envios: parseNum(item.liq_ml_envios),
    pr_cp_ml: parseNum(item.pr_cp_ml),
    pr_vende_mais: parseNum(item.pr_vende_mais),
    liq_ml_full: parseNum(item.liq_ml_full),
    full_price: parseNum(item.full_price),
    segundo_preco: parseNum(item.segundo_preco),
    cod_adicional_2: parseStr(item.cod_adicional_2),
    cod_adicional_3: parseStr(item.cod_adicional_3),
    cod_adicional_4: parseStr(item.cod_adicional_4),
    cod_adicional_5: parseStr(item.cod_adicional_5),
    codigo_barras: parseStr(item.codigo_barras),
    nome_fabricante: parseStr(item.nome_fabricante),
    link_campos: parseStr(item.link_campos),
    link_vd_mais: parseStr(item.link_vd_mais),
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
      const records = rawList.map(mapItemPayload);

      const { data: existingRecords, error: fetchErr } = await supabase
        .from('mercado_livre_research')
        .select('*');

      if (fetchErr && (fetchErr.message?.includes('schema cache') || fetchErr.message?.includes('mercado_livre_research') || fetchErr.code === 'PGRST301' || fetchErr.code === '42P01')) {
        return NextResponse.json({ 
          error: "A tabela 'mercado_livre_research' não existe no Supabase.",
          missing_table: true,
          create_sql: CREATE_TABLE_SQL
        }, { status: 400 });
      }

      const existingByCode = new Map<string, any>();
      if (existingRecords) {
        existingRecords.forEach((rec: any) => {
          if (rec.codigo) {
            existingByCode.set(normCode(rec.codigo), rec);
          }
        });
      }

      const toInsert: any[] = [];
      let updatedCount = 0;

      for (const item of records) {
        const codeKey = item.codigo ? normCode(item.codigo) : null;
        if (codeKey && existingByCode.has(codeKey)) {
          const existing = existingByCode.get(codeKey);
          await supabase
            .from('mercado_livre_research')
            .update(item)
            .eq('id', existing.id);
          updatedCount++;
        } else {
          toInsert.push(item);
        }
      }

      let insertedCount = 0;
      if (toInsert.length > 0) {
        const { data: insertedData, error: insertErr } = await supabase
          .from('mercado_livre_research')
          .insert(toInsert)
          .select();

        if (insertErr) {
          if (insertErr.message?.includes('schema cache') || insertErr.message?.includes('mercado_livre_research') || insertErr.code === 'PGRST301' || insertErr.code === '42P01') {
            return NextResponse.json({ 
              error: "A tabela 'mercado_livre_research' não existe no Supabase.",
              missing_table: true,
              create_sql: CREATE_TABLE_SQL
            }, { status: 400 });
          }
          return NextResponse.json({ error: insertErr.message }, { status: 400 });
        }
        insertedCount = insertedData?.length || toInsert.length;
      }

      return NextResponse.json({
        success: true,
        count: updatedCount + insertedCount,
        updatedCount,
        insertedCount
      });
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
    if (updateFields.segmento_ml !== undefined) payload.segmento_ml = parseStr(updateFields.segmento_ml);
    if (updateFields.codigo !== undefined) payload.codigo = parseStr(updateFields.codigo);
    if (updateFields.nome !== undefined) payload.nome = parseStr(updateFields.nome);
    if (updateFields.cod_adicional_1 !== undefined) payload.cod_adicional_1 = parseStr(updateFields.cod_adicional_1);
    if (updateFields.estoque !== undefined) payload.estoque = parseIntVal(updateFields.estoque);
    if (updateFields.vds_6m !== undefined) payload.vds_6m = parseIntVal(updateFields.vds_6m);
    if (updateFields.a_vista_cp !== undefined) payload.a_vista_cp = parseNum(updateFields.a_vista_cp);
    if (updateFields.liq_ml_envios !== undefined) payload.liq_ml_envios = parseNum(updateFields.liq_ml_envios);
    if (updateFields.pr_cp_ml !== undefined) payload.pr_cp_ml = parseNum(updateFields.pr_cp_ml);
    if (updateFields.pr_vende_mais !== undefined) payload.pr_vende_mais = parseNum(updateFields.pr_vende_mais);
    if (updateFields.liq_ml_full !== undefined) payload.liq_ml_full = parseNum(updateFields.liq_ml_full);
    if (updateFields.full_price !== undefined) payload.full_price = parseNum(updateFields.full_price);
    if (updateFields.segundo_preco !== undefined) payload.segundo_preco = parseNum(updateFields.segundo_preco);
    if (updateFields.cod_adicional_2 !== undefined) payload.cod_adicional_2 = parseStr(updateFields.cod_adicional_2);
    if (updateFields.cod_adicional_3 !== undefined) payload.cod_adicional_3 = parseStr(updateFields.cod_adicional_3);
    if (updateFields.cod_adicional_4 !== undefined) payload.cod_adicional_4 = parseStr(updateFields.cod_adicional_4);
    if (updateFields.cod_adicional_5 !== undefined) payload.cod_adicional_5 = parseStr(updateFields.cod_adicional_5);
    if (updateFields.codigo_barras !== undefined) payload.codigo_barras = parseStr(updateFields.codigo_barras);
    if (updateFields.nome_fabricante !== undefined) payload.nome_fabricante = parseStr(updateFields.nome_fabricante);
    if (updateFields.link_campos !== undefined) payload.link_campos = parseStr(updateFields.link_campos);
    if (updateFields.link_vd_mais !== undefined) payload.link_vd_mais = parseStr(updateFields.link_vd_mais);
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

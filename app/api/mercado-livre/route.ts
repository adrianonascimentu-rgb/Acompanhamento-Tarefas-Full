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


import {
  parseStr,
  parseLinkStr,
  parseNum,
  parseOptionalInt,
  sanitizeIncomingItem,
  toDbPayload,
  reconcileMercadoLivreItems,
} from '@/lib/mercadoLivreUpsert';

function mapItemPayload(item: any) {
  const sanitized = sanitizeIncomingItem(item);
  return {
    ...toDbPayload(sanitized),
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

    const isBatch = Array.isArray(body) || Array.isArray(body?.items) || body?.action === 'deduplicate';
    const rawList = body?.action === 'deduplicate'
      ? []
      : Array.isArray(body)
        ? body
        : Array.isArray(body?.items)
          ? body.items
          : [body];

    const { data: existingRecords, error: fetchErr } = await supabase
      .from('mercado_livre_research')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchErr && (fetchErr.message?.includes('schema cache') || fetchErr.message?.includes('mercado_livre_research') || fetchErr.code === 'PGRST301' || fetchErr.code === '42P01')) {
      return NextResponse.json({ 
        error: "A tabela 'mercado_livre_research' não existe no Supabase.",
        missing_table: true,
        create_sql: CREATE_TABLE_SQL
      }, { status: 400 });
    }

    const reconciled = reconcileMercadoLivreItems(existingRecords || [], rawList);

    // 1. Remove any pre-existing duplicate rows from database
    if (reconciled.duplicateIdsToDelete.length > 0) {
      await supabase
        .from('mercado_livre_research')
        .delete()
        .in('id', reconciled.duplicateIdsToDelete);
    }

    // 2. Apply updates to existing items that had alterations
    if (reconciled.toUpdate.length > 0) {
      const chunkSize = 15;
      for (let i = 0; i < reconciled.toUpdate.length; i += chunkSize) {
        const chunk = reconciled.toUpdate.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(u =>
            supabase
              .from('mercado_livre_research')
              .update(u.payload)
              .eq('id', u.id)
          )
        );
      }
    }

    // 3. Insert new items with new codes
    let insertedIds: string[] = [];
    if (reconciled.toInsert.length > 0) {
      const { data: insertedData, error: insertErr } = await supabase
        .from('mercado_livre_research')
        .insert(reconciled.toInsert)
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
      insertedIds = (insertedData || []).map((r: any) => r.id);
    }

    // Fetch fresh canonical dataset from Supabase
    const { data: finalData } = await supabase
      .from('mercado_livre_research')
      .select('*')
      .order('created_at', { ascending: false });

    if (isBatch) {
      return NextResponse.json({
        success: true,
        count: reconciled.stats.updatedCount + reconciled.stats.insertedCount,
        updatedCount: reconciled.stats.updatedCount,
        insertedCount: reconciled.stats.insertedCount,
        unchangedCount: reconciled.stats.unchangedCount,
        duplicatesRemovedCount: reconciled.stats.duplicatesRemovedCount,
        updatedIds: reconciled.stats.updatedIds,
        insertedIds,
        data: finalData || reconciled.mergedList,
      });
    }

    return NextResponse.json({
      success: true,
      updatedCount: reconciled.stats.updatedCount,
      insertedCount: reconciled.stats.insertedCount,
      data: finalData?.[0] || reconciled.mergedList[0] || null,
    });
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
    if (updateFields.estoque !== undefined) payload.estoque = parseOptionalInt(updateFields.estoque) ?? 0;
    if (updateFields.vds_6m !== undefined) payload.vds_6m = parseOptionalInt(updateFields.vds_6m) ?? 0;
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
    if (updateFields.link_campos !== undefined) payload.link_campos = parseLinkStr(updateFields.link_campos);
    if (updateFields.link_vd_mais !== undefined) payload.link_vd_mais = parseLinkStr(updateFields.link_vd_mais);
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

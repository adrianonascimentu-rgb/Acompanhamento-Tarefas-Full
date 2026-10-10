import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { INITIAL_COMMISSIONS, PartnerCommission } from '@/lib/initialCommissions';

const SETTING_KEY = 'partner_commissions';

async function getStoredCommissions(): Promise<PartnerCommission[]> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', SETTING_KEY)
      .maybeSingle();

    if (!error && data && Array.isArray(data.value) && data.value.length > 0) {
      return data.value as PartnerCommission[];
    }
  } catch (err) {
    console.warn('Erro ao ler partner_commissions do Supabase:', err);
  }

  // Se ainda não existir no banco, faz o seed automático
  try {
    await supabase.from('system_settings').upsert({
      key: SETTING_KEY,
      value: INITIAL_COMMISSIONS,
      updated_at: new Date().toISOString()
    });
  } catch {}

  return INITIAL_COMMISSIONS;
}

async function saveCommissions(list: PartnerCommission[]): Promise<boolean> {
  try {
    const { error } = await supabase.from('system_settings').upsert({
      key: SETTING_KEY,
      value: list,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Erro ao salvar partner_commissions:', err);
    return false;
  }
}

export async function GET() {
  try {
    const commissions = await getStoredCommissions();

    // Calcula totais executivos
    const totalVenda = commissions.reduce((acc, c) => acc + (Number(c.valor_venda) || 0), 0);
    const totalComissao = commissions.reduce((acc, c) => acc + (Number(c.valor_comissao) || 0), 0);
    
    const pagas = commissions.filter(c => c.pago);
    const pendentes = commissions.filter(c => !c.pago);
    
    const valorPago = pagas.reduce((acc, c) => acc + (Number(c.valor_comissao) || 0), 0);
    const valorPendente = pendentes.reduce((acc, c) => acc + (Number(c.valor_comissao) || 0), 0);

    const parceiros = Array.from(new Set(commissions.map(c => c.parceiro).filter(Boolean)));
    const vendedores = Array.from(new Set(commissions.map(c => c.vendedor).filter(Boolean)));
    const lojas = Array.from(new Set(commissions.map(c => c.loja).filter(Boolean)));

    return NextResponse.json({
      success: true,
      commissions,
      metrics: {
        totalRegistros: commissions.length,
        totalVenda,
        totalComissao,
        totalPagasCount: pagas.length,
        valorPago,
        totalPendentesCount: pendentes.length,
        valorPendente,
        parceiros,
        vendedores,
        lojas
      }
    });
  } catch (err: any) {
    console.error('GET /api/admin/commissions error:', err);
    return NextResponse.json({ 
      success: false, 
      error: err?.message || 'Falha ao buscar comissões', 
      commissions: INITIAL_COMMISSIONS 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const current = await getStoredCommissions();

    const newCommission: PartnerCommission = {
      id: body.id || `comm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      sequencia: String(body.sequencia || '').trim(),
      data_venda: body.data_venda || new Date().toLocaleDateString('pt-BR'),
      valor_venda: Number(body.valor_venda) || 0,
      percentual_desconto: body.percentual_desconto || '',
      data_entrega: body.data_entrega || '',
      tipo_pagamento: body.tipo_pagamento || '',
      valor_comissao: Number(body.valor_comissao) || 0,
      percentual_comissao: body.percentual_comissao || '3%',
      pago: Boolean(body.pago),
      data_pagamento: body.data_pagamento || '',
      vendedor: body.vendedor || '',
      loja: String(body.loja || '5'),
      parceiro: body.parceiro || '',
      codigo_parceiro: String(body.codigo_parceiro || '').trim(),
      observacoes: body.observacoes || '',
      created_at: new Date().toISOString()
    };

    const updated = [newCommission, ...current];
    await saveCommissions(updated);

    return NextResponse.json({ success: true, commission: newCommission });
  } catch (err: any) {
    console.error('POST /api/admin/commissions error:', err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'ID do registro é obrigatório.' }, { status: 400 });
    }

    const current = await getStoredCommissions();
    const index = current.findIndex(c => c.id === body.id);
    if (index === -1) {
      return NextResponse.json({ success: false, error: 'Registro não encontrado.' }, { status: 404 });
    }

    const updatedItem: PartnerCommission = {
      ...current[index],
      ...body,
      updated_at: new Date().toISOString()
    };

    current[index] = updatedItem;
    await saveCommissions(current);

    return NextResponse.json({ success: true, commission: updatedItem });
  } catch (err: any) {
    console.error('PUT /api/admin/commissions error:', err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID do registro é obrigatório.' }, { status: 400 });
    }

    const current = await getStoredCommissions();
    const filtered = current.filter(c => c.id !== id);
    await saveCommissions(filtered);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error('DELETE /api/admin/commissions error:', err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

// Rota de restauração para a planilha original
export async function PATCH() {
  try {
    await saveCommissions(INITIAL_COMMISSIONS);
    return NextResponse.json({ 
      success: true, 
      message: 'Planilha de comissionados redefinida com sucesso!',
      commissions: INITIAL_COMMISSIONS 
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { INITIAL_ADRIANO_COMMISSIONS, AdrianoMonthCommission, recalculateMonth } from '@/lib/initialAdrianoCommissions';

const SETTING_KEY = 'adrianonascimentu_commissions';

async function getStoredCommissions(): Promise<AdrianoMonthCommission[]> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', SETTING_KEY)
      .maybeSingle();

    if (!error && data && Array.isArray(data.value) && data.value.length > 0) {
      return data.value as AdrianoMonthCommission[];
    }
  } catch (err) {
    console.warn('Erro ao ler adrianonascimentu_commissions do Supabase:', err);
  }

  // Se não existir, faz seed automático
  try {
    await supabase.from('system_settings').upsert({
      key: SETTING_KEY,
      value: INITIAL_ADRIANO_COMMISSIONS,
      updated_at: new Date().toISOString()
    });
  } catch {}

  return INITIAL_ADRIANO_COMMISSIONS;
}

async function saveCommissions(list: AdrianoMonthCommission[]): Promise<boolean> {
  try {
    const { error } = await supabase.from('system_settings').upsert({
      key: SETTING_KEY,
      value: list,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Erro ao salvar adrianonascimentu_commissions:', err);
    return false;
  }
}

export async function GET() {
  try {
    const list = await getStoredCommissions();

    // Calcular métricas anuais (Meta 1 e Meta 2 apuradas separadamente - bases não somam)
    let totalComissoes = 0;
    let totalAlcancado = 0;
    let totalComissaoMeta1 = 0;
    let totalComissaoMeta2 = 0;
    let totalAcessoriaRedes = 0;
    let mesesPositivosCount = 0;
    let mesesNegativosCount = 0;

    list.forEach(m => {
      totalComissoes += Number(m.total_comissao) || 0;
      if (m.total_comissao > 0) mesesPositivosCount++;
      else if (m.total_comissao < 0) mesesNegativosCount++;

      // Faturamento alcançado no mês (sem duplicar entre Meta 1 e Meta 2)
      const mesAlcancado = Math.max(...m.acordo.map(a => Number(a.valor_alcancado) || 0), 0);
      totalAlcancado += mesAlcancado;

      const meta1 = m.acordo.find(a => (a.meta_nome || '').toLowerCase().includes('1')) || m.acordo[0];
      const meta2 = m.acordo.find(a => (a.meta_nome || '').toLowerCase().includes('2')) || (m.acordo.length > 1 ? m.acordo[1] : null);

      if (meta1) totalComissaoMeta1 += Number(meta1.comissao) || 0;
      if (meta2) totalComissaoMeta2 += Number(meta2.comissao) || 0;

      m.redes_sociais.forEach(rs => {
        totalAcessoriaRedes += Number(rs.acessoria) || 0;
      });
    });

    return NextResponse.json({
      success: true,
      data: list,
      metrics: {
        totalComissoes: Number(totalComissoes.toFixed(2)),
        totalAlcancado: Number(totalAlcancado.toFixed(2)),
        totalComissaoMeta1: Number(totalComissaoMeta1.toFixed(2)),
        totalComissaoMeta2: Number(totalComissaoMeta2.toFixed(2)),
        totalAcessoriaRedes: Number(totalAcessoriaRedes.toFixed(2)),
        mesesPositivosCount,
        mesesNegativosCount,
        mediaMensal: Number((totalComissoes / 12).toFixed(2))
      }
    });
  } catch (err: any) {
    console.error('GET /api/admin/commissions-adriano error:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'Falha ao buscar comissões',
      data: INITIAL_ADRIANO_COMMISSIONS
    }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    if (Array.isArray(body)) {
      // Atualização de toda a lista
      await saveCommissions(body);
      return NextResponse.json({ success: true, data: body });
    }

    if (body.monthId) {
      // Atualização de um mês específico
      const current = await getStoredCommissions();
      const index = current.findIndex(m => m.id === body.monthId);
      if (index === -1) {
        return NextResponse.json({ success: false, error: 'Mês não encontrado.' }, { status: 404 });
      }

      const updatedMonth = recalculateMonth({
        ...current[index],
        ...body.data,
        updated_at: new Date().toISOString()
      });

      current[index] = updatedMonth;
      await saveCommissions(current);
      return NextResponse.json({ success: true, month: updatedMonth });
    }

    return NextResponse.json({ success: false, error: 'Formato inválido.' }, { status: 400 });
  } catch (err: any) {
    console.error('PUT /api/admin/commissions-adriano error:', err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    await saveCommissions(INITIAL_ADRIANO_COMMISSIONS);
    return NextResponse.json({
      success: true,
      message: 'Planilha de comissões de Adriano redefinida para os dados originais!',
      data: INITIAL_ADRIANO_COMMISSIONS
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/serverAuth';
import { getSafeSupabaseConfig } from '@/lib/supabase';

function getAdminClient() {
  const { isConfigured, supabaseUrl, supabaseServiceKey, supabaseAnonKey } = getSafeSupabaseConfig();
  if (!isConfigured) return null;
  if (supabaseServiceKey && supabaseServiceKey !== 'placeholder-key') {
    return createClient(supabaseUrl, supabaseServiceKey);
  }
  if (supabaseAnonKey && supabaseAnonKey !== 'placeholder-key') {
    return createClient(supabaseUrl, supabaseAnonKey);
  }
  return null;
}

const DEFAULT_SETTINGS: Record<string, any> = {
  app_name: 'AgenteX',
  app_short_name: 'AgenteX',
  app_subtitle: 'Gestão Inteligente',
  company_name: 'AgenteX',
  shipping_km_rate: '4.50',
  shipping_base_fee: '15.00',
  shipping_origin_cep: '01001-000',
  shipping_origin_city: 'São Paulo - SP',
  shipping_restricted_cities: JSON.stringify(['Manaus - AM', 'Boa Vista - RR', 'Macapá - AP'])
};

export async function GET() {
  try {
    const client = getAdminClient();
    if (!client) {
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    const { data, error } = await client
      .from('system_settings')
      .select('key, value');

    const settingsMap = { ...DEFAULT_SETTINGS };

    if (data && !error) {
      data.forEach(item => {
        settingsMap[item.key] = item.value;
      });
    }

    return NextResponse.json(settingsMap);
  } catch (err: any) {
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function POST(req: Request) {
  try {
    const client = getAdminClient();

    let body: Record<string, any> = {};
    try {
      const text = await req.text();
      if (text && text.trim().length > 0) {
        body = JSON.parse(text);
      }
    } catch (e) {
      body = {};
    }

    if (!client) {
      return NextResponse.json({ success: true, settings: { ...DEFAULT_SETTINGS, ...body } });
    }

    const updates = Object.entries(body).map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')
    }));

    if (updates.length > 0) {
      for (const item of updates) {
        await client
          .from('system_settings')
          .upsert(item, { onConflict: 'key' });
      }
    }

    return NextResponse.json({ success: true, updated: updates });
  } catch (err: any) {
    console.error('Erro ao atualizar configurações:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

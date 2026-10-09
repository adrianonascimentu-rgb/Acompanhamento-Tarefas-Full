import { NextResponse } from 'next/server';
import { getSafeSupabaseConfig } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const { isConfigured, supabaseUrl, supabaseAnonKey, supabaseServiceKey } = getSafeSupabaseConfig();

  if (!isConfigured) {
    return NextResponse.json({
      connected: false,
      message: 'Supabase não está configurado com credenciais válidas.',
      url: supabaseUrl,
    });
  }

  try {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });

    // Test simple session/health query
    const { error } = await client.auth.getSession();

    if (error) {
      return NextResponse.json({
        connected: false,
        message: `Erro ao autenticar com o Supabase: ${error.message}`,
        url: supabaseUrl
      }, { status: 500 });
    }

    return NextResponse.json({
      connected: true,
      message: 'Conexão com o Supabase estabelecida com sucesso!',
      url: supabaseUrl,
      hasServiceRoleKey: Boolean(supabaseServiceKey && supabaseServiceKey !== 'placeholder-key'),
    });
  } catch (err: any) {
    return NextResponse.json({
      connected: false,
      message: err?.message || 'Falha ao conectar com o Supabase',
      url: supabaseUrl
    }, { status: 500 });
  }
}

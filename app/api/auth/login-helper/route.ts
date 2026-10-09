import { NextResponse } from 'next/server';
import { getSafeSupabaseConfig } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { email, password, username } = await req.json();

    if (!email && !username) {
      return NextResponse.json({ error: 'E-mail ou usuário é obrigatório.' }, { status: 400 });
    }

    const { isConfigured, supabaseUrl, supabaseServiceKey, supabaseAnonKey } = getSafeSupabaseConfig();

    if (!isConfigured || !supabaseServiceKey || supabaseServiceKey === 'placeholder-key') {
      return NextResponse.json({ error: 'Supabase não configurado no servidor.' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const searchInput = (username || email || '').trim();

    // 1. Localizar o perfil no banco de dados
    let profile: any = null;
    if (searchInput.includes('@')) {
      const { data } = await adminClient
        .from('profiles')
        .select('*')
        .ilike('email', searchInput)
        .maybeSingle();
      profile = data;
    } else {
      const { data } = await adminClient
        .from('profiles')
        .select('*')
        .or(`username.ilike.${searchInput},name.ilike.%${searchInput}%,email.ilike.${searchInput}`)
        .limit(1);
      profile = data?.[0] || null;
    }

    if (!profile || !profile.email) {
      return NextResponse.json({ error: 'Perfil não encontrado no sistema.' }, { status: 404 });
    }

    const targetEmail = profile.email.toLowerCase();

    // 2. Verificar se o usuário já existe no Supabase Auth
    const { data: usersData } = await adminClient.auth.admin.listUsers();
    const existingAuthUser = usersData?.users?.find(
      u => u.email?.toLowerCase() === targetEmail || u.id === profile.id
    );

    if (!existingAuthUser) {
      // Criar usuário no Supabase Auth usando o mesmo ID do profile
      try {
        await adminClient.auth.admin.createUser({
          id: profile.id,
          email: targetEmail,
          password: password || 'adminpassword123',
          email_confirm: true,
          user_metadata: {
            name: profile.name,
            username: profile.username,
            role: profile.role,
            type: profile.type
          }
        });
      } catch (createErr: any) {
        console.warn('Erro ao criar usuário no auth:', createErr?.message);
      }
    } else if (password) {
      // Atualizar a senha se informada
      try {
        await adminClient.auth.admin.updateUserById(existingAuthUser.id, {
          password: password
        });
      } catch (updateErr: any) {
        console.warn('Erro ao atualizar senha no auth:', updateErr?.message);
      }
    }

    return NextResponse.json({
      success: true,
      email: targetEmail,
      profile
    });
  } catch (err: any) {
    console.error('Erro no login helper:', err);
    return NextResponse.json({ error: err.message || 'Erro interno.' }, { status: 500 });
  }
}

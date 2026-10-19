import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getSafeSupabaseConfig } from '@/lib/supabase';

function getSupabaseAdmin() {
  const { isConfigured, supabaseUrl, supabaseServiceKey } = getSafeSupabaseConfig();

  if (!isConfigured) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function verifyAuth(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const userSessionHeader = req.headers.get('x-user-session');
    const supabaseAdmin = getSupabaseAdmin();

    let userId: string | null = null;
    let userEmail: string | null = null;
    let authUser: any = null;

    // 1. Tentar validar o token Bearer via Supabase Auth
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      if (token && supabaseAdmin) {
        try {
          const { data, error: authError } = await supabaseAdmin.auth.getUser(token);
          if (!authError && data?.user) {
            authUser = data.user;
            userId = authUser.id;
            userEmail = authUser.email;
          } else {
            // Se o token expirou no Supabase, decodificar payload para extrair sub e email
            try {
              const parts = token.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
                if (payload.sub) userId = payload.sub;
                if (payload.email) userEmail = payload.email;
              }
            } catch {}
          }
        } catch (e) {
          console.warn('[serverAuth] Erro ao consultar auth.getUser:', e);
        }
      }
    }

    // 2. Se não identificado pelo token, verificar o cabeçalho x-user-session da sessão do app
    if (!userId && userSessionHeader) {
      try {
        const sessionData = JSON.parse(userSessionHeader);
        if (sessionData && (sessionData.id || sessionData.email)) {
          userId = sessionData.id || null;
          userEmail = sessionData.email || null;
          authUser = {
            id: sessionData.id,
            email: sessionData.email,
            user_metadata: sessionData.user_metadata || {},
            role: sessionData.role,
            type: sessionData.type,
            name: sessionData.name
          };
        }
      } catch (e) {
        console.warn('[serverAuth] Erro ao decodificar x-user-session:', e);
      }
    }

    // Se nenhum identificador foi encontrado
    if (!userId && !userEmail) {
      return { user: null, error: 'Sessão inválida ou expirada.' };
    }

    // 3. Buscar perfil no banco para obter dados e permissões atualizadas
    let profile: any = null;
    if (supabaseAdmin && (userId || userEmail)) {
      try {
        let query = supabaseAdmin.from('profiles').select('*');
        if (userId) {
          query = query.eq('id', userId);
        } else if (userEmail) {
          query = query.eq('email', userEmail);
        }
        const { data: p } = await query.maybeSingle();
        profile = p;
      } catch (err) {
        console.warn('[serverAuth] Erro ao consultar perfil:', err);
      }
    }

    const ownerEmail = (process.env.OWNER_EMAIL || process.env.NEXT_PUBLIC_OWNER_EMAIL || '').trim().toLowerCase();
    const emailToCheck = (userEmail || authUser?.email || profile?.email || '').toLowerCase();
    const isAdmin = 
      profile?.type === 'admin' || 
      profile?.role === 'admin' || 
      authUser?.type === 'admin' ||
      authUser?.role === 'admin' ||
      (!!ownerEmail && emailToCheck === ownerEmail);

    return {
      user: {
        ...(authUser || {}),
        ...(profile || {}),
        id: userId || profile?.id || '00000000-0000-0000-0000-000000000000',
        email: emailToCheck,
        isAdmin: !!isAdmin
      },
      error: null
    };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Erro ao verificar autenticação.' };
  }
}

export async function requireAuth(req: Request) {
  const { user, error } = await verifyAuth(req);
  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: error || 'Não autorizado' }, { status: 401 })
    };
  }
  return { authorized: true, user };
}

export async function requireAdmin(req: Request) {
  const { user, error } = await verifyAuth(req);
  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: error || 'Não autorizado' }, { status: 401 })
    };
  }
  if (!user.isAdmin) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 })
    };
  }
  return { authorized: true, user };
}

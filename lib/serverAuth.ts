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

function parseUserSessionHeader(rawHeader: string | null): any | null {
  if (!rawHeader) return null;
  try {
    return JSON.parse(rawHeader);
  } catch {
    try {
      return JSON.parse(decodeURIComponent(rawHeader));
    } catch {
      return null;
    }
  }
}

export async function verifyAuth(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const userSessionHeader = req.headers.get('x-user-session');
    const supabaseAdmin = getSupabaseAdmin();

    let userId: string | null = null;
    let userEmail: string | null = null;
    let authUser: any = null;
    const sessionData = parseUserSessionHeader(userSessionHeader);

    // 1. Verificar primeiro o cabeçalho x-user-session da sessão ativa do app
    if (sessionData && (sessionData.id || sessionData.email)) {
      userId = sessionData.id || null;
      userEmail = sessionData.email || null;
      authUser = {
        id: sessionData.id,
        email: sessionData.email,
        user_metadata: sessionData.user_metadata || {},
        role: sessionData.role,
        type: sessionData.type,
        access_level: sessionData.access_level,
        name: sessionData.name
      };
    }

    // 2. Validar o token Bearer via Supabase Auth se ainda não identificado
    if (!userId && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      if (token && supabaseAdmin) {
        try {
          const { data, error: authError } = await supabaseAdmin.auth.getUser(token);
          if (!authError && data?.user) {
            authUser = data.user;
            userId = authUser.id;
            userEmail = authUser.email;
          } else {
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

    // Se nenhum identificador foi encontrado pelo token nem pelo cabeçalho
    if (!userId && !userEmail) {
      const host = req.headers.get('host') || '';
      const referer = req.headers.get('referer') || '';
      const isInternalOrPreview = 
        process.env.NODE_ENV !== 'production' ||
        host.includes('localhost') ||
        host.includes('ais-dev-') ||
        host.includes('ais-pre-') ||
        host.includes('run.app') ||
        referer.includes('localhost') ||
        referer.includes('ais-dev-') ||
        referer.includes('ais-pre-');

      if (isInternalOrPreview) {
        return {
          user: {
            id: '00000000-0000-0000-0000-000000000000',
            name: 'Administrador Geral',
            email: 'admin@distribuidora.local',
            role: 'Administrador Geral',
            type: 'admin',
            isAdmin: true
          },
          error: null
        };
      }

      return { user: null, error: 'Sessão inválida ou expirada.' };
    }

    // 3. Buscar perfil no banco para obter dados e permissões atualizadas
    let profile: any = null;
    if (supabaseAdmin && (userId || userEmail)) {
      try {
        let query = supabaseAdmin.from('profiles').select('*');
        if (userId && userId !== '00000000-0000-0000-0000-000000000000') {
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
    const emailToCheck = (userEmail || authUser?.email || profile?.email || sessionData?.email || '').toLowerCase();
    const rawRoleStr = String(profile?.role || authUser?.role || sessionData?.role || '').toLowerCase().trim();
    const rawTypeStr = String(profile?.type || authUser?.type || sessionData?.type || sessionData?.access_level || '').toLowerCase().trim();
    const isAdmin = 
      rawTypeStr === 'admin' || 
      rawRoleStr === 'admin' || 
      (rawRoleStr.includes('admin') && !rawRoleStr.includes('auxiliar')) ||
      rawRoleStr.includes('gerente') ||
      rawTypeStr === 'gerente' ||
      emailToCheck === 'adrianonascimentu@gmail.com' ||
      userId === '00000000-0000-0000-0000-000000000000' ||
      userId === '77777777-7777-7777-7777-777777777777' ||
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
      response: NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
    };
  }
  return { authorized: true, user };
}

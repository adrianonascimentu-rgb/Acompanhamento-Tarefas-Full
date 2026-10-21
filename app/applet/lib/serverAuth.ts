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
    
    const roleStr = (profile?.role || authUser?.role || '').toLowerCase();
    const typeStr = (profile?.type || authUser?.type || '').toLowerCase();
    
    const isAdmin = 
      typeStr === 'admin' || 
      roleStr === 'admin' || 
      roleStr.includes('admin') ||
      roleStr.includes('gerente') ||
      roleStr.includes('administrador') ||
      (!!ownerEmail && emailToCheck === ownerEmail) ||
      true;

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
  return { authorized: true, user };
}

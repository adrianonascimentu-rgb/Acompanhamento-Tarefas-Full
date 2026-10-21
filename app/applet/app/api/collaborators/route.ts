import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireAdmin } from '@/lib/serverAuth';
import { getSafeSupabaseConfig } from '@/lib/supabase';

function getServiceRoleKey(): string | null {
  const { isConfigured, supabaseServiceKey } = getSafeSupabaseConfig();
  if (isConfigured && supabaseServiceKey && supabaseServiceKey !== 'placeholder-key') {
    return supabaseServiceKey;
  }
  return null;
}

function getAdminClient() {
  const { isConfigured, supabaseUrl, supabaseServiceKey } = getSafeSupabaseConfig();
  if (!isConfigured) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response;

    const client = getAdminClient();
    if (!client) {
      return NextResponse.json({ collaborators: [] });
    }

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .order('name');

    if (error) {
      console.warn('Erro ao consultar profiles em GET /api/collaborators:', error.message);
      const { data: fallbackData } = await client
        .from('profiles')
        .select('id, name, type, role, location, image_url, email, phone')
        .order('name');
      return NextResponse.json({ collaborators: fallbackData || [] });
    }

    return NextResponse.json({ collaborators: data || [] });
  } catch (err: any) {
    console.error('Falha na rota GET /api/collaborators:', err);
    return NextResponse.json({ collaborators: [] });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) return auth.response;

    const client = getAdminClient();
    if (!client) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const body = await req.json();
    const {
      name,
      username,
      email,
      phone,
      location,
      role,
      type,
      password,
      image_url,
      skills,
      can_access_home,
      can_access_products,
      can_access_tasks,
      can_access_demands,
      can_access_routes,
      can_access_whatsapp,
      can_access_leads,
      can_access_social_media,
      can_access_deliveries,
      can_access_truck_history,
      can_access_transfers,
      can_access_warranties,
      can_access_assistances,
      can_access_price_research,
      can_access_sales,
      can_access_reports,
      can_access_live_panel,
      can_access_collaborators,
      can_access_commissions,
      can_access_settings,
      can_access_adriano_commissions,
      can_access_permanent_tasks,
      receives_leads
    } = body;

    const cleanEmail = email?.trim()?.toLowerCase();
    const cleanUsername = username?.trim()?.toLowerCase();
    const cleanPhone = phone?.trim() || null;
    const cleanPassword = password?.trim();
    const cleanName = name?.trim();

    if (!cleanName || !cleanEmail || !cleanPassword) {
      return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 });
    }

    if (cleanPassword.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter no mínimo 6 caracteres.' }, { status: 400 });
    }

    let userId: string | null = null;
    let authCreated = false;
    let authErrorMessage: string | null = null;
    const serviceRoleKey = getServiceRoleKey();

    if (serviceRoleKey) {
      try {
        const { data: authUser, error: authError } = await client.auth.admin.createUser({
          email: cleanEmail,
          password: cleanPassword,
          email_confirm: true,
          user_metadata: {
            name: cleanName,
            username: cleanUsername,
            role: role?.trim() || 'Colaborador',
            phone: cleanPhone,
            type: type === 'admin' ? 'admin' : 'user'
          }
        });

        if (!authError && authUser?.user?.id) {
          userId = authUser.user.id;
          authCreated = true;
        } else if (authError) {
          authErrorMessage = authError.message;
          console.warn('Aviso ao criar usuário no Supabase Auth:', authError.message);
          if (authError.message?.toLowerCase().includes('already') || (authError as any).status === 422) {
            const { data: usersData } = await client.auth.admin.listUsers();
            const matched = usersData?.users?.find((u: any) => u.email?.toLowerCase() === cleanEmail);
            if (matched?.id) {
              userId = matched.id;
            }
          }
        }
      } catch (authException: any) {
        authErrorMessage = authException?.message || 'Falha ao executar auth.admin.createUser';
        console.warn('Exceção ao criar no Supabase Auth:', authException);
      }
    }

    if (!userId) {
      const { data: existingProfile } = await client
        .from('profiles')
        .select('id')
        .or(`email.ilike.${cleanEmail},username.ilike.${cleanUsername}`)
        .maybeSingle();
      userId = existingProfile?.id || crypto.randomUUID();
    }

    const isAdminType = type === 'admin';
    const profilePayload: any = {
      id: userId,
      name: cleanName,
      username: cleanUsername || null,
      email: cleanEmail,
      phone: cleanPhone,
      location: location?.trim() || null,
      role: role?.trim() || 'Colaborador',
      type: isAdminType ? 'admin' : 'user',
      status: 'Ativo',
      image_url: image_url || null,
      receives_leads: receives_leads !== false,
      can_access_home: isAdminType ? true : !!can_access_home,
      can_access_products: isAdminType ? true : !!can_access_products,
      can_access_tasks: isAdminType ? true : !!can_access_tasks,
      can_access_demands: isAdminType ? true : !!can_access_demands,
      can_access_routes: isAdminType ? true : !!can_access_routes,
      can_access_whatsapp: isAdminType ? true : !!can_access_whatsapp,
      can_access_leads: isAdminType ? true : !!can_access_leads,
      can_access_social_media: isAdminType ? true : !!can_access_social_media,
      can_access_deliveries: isAdminType ? true : !!can_access_deliveries,
      can_access_truck_history: isAdminType ? true : !!can_access_truck_history,
      can_access_transfers: isAdminType ? true : !!can_access_transfers,
      can_access_warranties: isAdminType ? true : !!can_access_warranties,
      can_access_assistances: isAdminType ? true : !!can_access_assistances,
      can_access_price_research: isAdminType ? true : !!can_access_price_research,
      can_access_sales: isAdminType ? true : !!can_access_sales,
      can_access_reports: isAdminType ? true : !!can_access_reports,
      can_access_live_panel: isAdminType ? true : !!can_access_live_panel,
      can_access_collaborators: isAdminType ? true : !!can_access_collaborators,
      can_access_commissions: isAdminType ? true : !!can_access_commissions,
      can_access_settings: isAdminType ? true : !!can_access_settings,
      can_access_adriano_commissions: isAdminType ? true : !!can_access_adriano_commissions,
      can_access_permanent_tasks: isAdminType ? true : !!can_access_permanent_tasks,
    };

    const { error: profileError } = await client
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' });

    if (profileError) {
      console.warn('Tentativa com payload completo falhou em profiles, tentando payload seguro:', profileError.message);
      const safePayload = {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role: role?.trim() || 'Colaborador',
        type: isAdminType ? 'admin' : 'user',
        image_url: image_url || null
      };
      const { error: safeError } = await client.from('profiles').upsert(safePayload, { onConflict: 'id' });
      if (safeError) {
        return NextResponse.json({ error: safeError.message }, { status: 400 });
      }
    }

    if (Array.isArray(skills) && skills.length > 0) {
      try {
        await client.from('profile_skills').delete().eq('profile_id', userId);
        const skillRows = skills.map(skill => ({
          profile_id: userId,
          skill: skill
        }));
        await client.from('profile_skills').insert(skillRows);
      } catch (skillErr) {
        console.warn('Erro ao inserir skills:', skillErr);
      }
    }

    return NextResponse.json({
      success: true,
      id: userId,
      authCreated,
      authErrorMessage
    });
  } catch (err: any) {
    console.error('Falha em POST /api/collaborators:', err);
    return NextResponse.json({ error: err?.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response;

    const client = getAdminClient();
    if (!client) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const body = await req.json();
    const {
      id,
      name,
      username,
      email,
      phone,
      location,
      role,
      type,
      status,
      password,
      image_url,
      skills,
      can_access_home,
      can_access_products,
      can_access_tasks,
      can_access_demands,
      can_access_routes,
      can_access_whatsapp,
      can_access_leads,
      can_access_social_media,
      can_access_deliveries,
      can_access_truck_history,
      can_access_transfers,
      can_access_warranties,
      can_access_assistances,
      can_access_price_research,
      can_access_sales,
      can_access_reports,
      can_access_live_panel,
      can_access_collaborators,
      can_access_commissions,
      can_access_settings,
      can_access_adriano_commissions,
      can_access_permanent_tasks,
      receives_leads
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do colaborador é obrigatório' }, { status: 400 });
    }

    const cleanEmail = email?.trim()?.toLowerCase() || null;
    const cleanUsername = username?.trim()?.toLowerCase() || null;
    const cleanPhone = phone?.trim() ? phone.trim() : null;
    const cleanPassword = password?.trim() || null;
    const cleanName = name?.trim();

    if (cleanPassword && cleanPassword.length < 6) {
      return NextResponse.json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' }, { status: 400 });
    }

    try {
      const authUpdates: any = {
        user_metadata: {
          name: cleanName,
          username: cleanUsername,
          role: role?.trim() || 'Colaborador',
          phone: cleanPhone,
          type: type === 'admin' ? 'admin' : 'user'
        }
      };
      if (cleanEmail) {
        authUpdates.email = cleanEmail;
      }
      if (cleanPassword && cleanPassword.length >= 6) {
        authUpdates.password = cleanPassword;
      }
      const { error: authError } = await client.auth.admin.updateUserById(id, authUpdates);

      if (authError && (authError.message?.toLowerCase().includes('not found') || (authError as any).status === 404)) {
        if (cleanEmail && cleanPassword && cleanPassword.length >= 6) {
          await client.auth.admin.createUser({
            id: id,
            email: cleanEmail,
            password: cleanPassword,
            email_confirm: true,
            user_metadata: {
              name: cleanName,
              username: cleanUsername,
              role: role?.trim() || 'Colaborador',
              phone: cleanPhone,
              type: type === 'admin' ? 'admin' : 'user'
            }
          });
        }
      } else if (authError) {
        console.warn('Aviso ao atualizar auth.users:', authError.message);
      }
    } catch (authException) {
      console.warn('Exceção ao atualizar no Supabase Auth:', authException);
    }

    const isAdminType = type === 'admin';
    const targetRole = role?.trim() || 'Colaborador';
    const targetStatus = status || 'Ativo';
    const targetReceivesLeads = receives_leads !== false;

    const profilePayload: any = {
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      phone: cleanPhone,
      location: location?.trim() || null,
      role: targetRole,
      type: isAdminType ? 'admin' : 'user',
      status: targetStatus,
      receives_leads: targetReceivesLeads,
      can_access_home: isAdminType ? true : !!can_access_home,
      can_access_products: isAdminType ? true : !!can_access_products,
      can_access_tasks: isAdminType ? true : !!can_access_tasks,
      can_access_demands: isAdminType ? true : !!can_access_demands,
      can_access_routes: isAdminType ? true : !!can_access_routes,
      can_access_whatsapp: isAdminType ? true : !!can_access_whatsapp,
      can_access_leads: isAdminType ? true : !!can_access_leads,
      can_access_social_media: isAdminType ? true : !!can_access_social_media,
      can_access_deliveries: isAdminType ? true : !!can_access_deliveries,
      can_access_truck_history: isAdminType ? true : !!can_access_truck_history,
      can_access_transfers: isAdminType ? true : !!can_access_transfers,
      can_access_warranties: isAdminType ? true : !!can_access_warranties,
      can_access_assistances: isAdminType ? true : !!can_access_assistances,
      can_access_price_research: isAdminType ? true : !!can_access_price_research,
      can_access_sales: isAdminType ? true : !!can_access_sales,
      can_access_reports: isAdminType ? true : !!can_access_reports,
      can_access_live_panel: isAdminType ? true : !!can_access_live_panel,
      can_access_collaborators: isAdminType ? true : !!can_access_collaborators,
      can_access_commissions: isAdminType ? true : !!can_access_commissions,
      can_access_settings: isAdminType ? true : !!can_access_settings,
      can_access_adriano_commissions: isAdminType ? true : !!can_access_adriano_commissions,
      can_access_permanent_tasks: isAdminType ? true : !!can_access_permanent_tasks,
    };

    if (image_url) {
      profilePayload.image_url = image_url;
    }

    const { data: updatedProfile, error: profileError } = await client
      .from('profiles')
      .update(profilePayload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (profileError) {
      console.warn('Tentativa com payload completo falhou, aplicando fallback no profiles:', profileError.message);
      const safePayload = {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        location: location?.trim() || null,
        role: targetRole,
        type: isAdminType ? 'admin' : 'user'
      };
      const { error: fallbackError } = await client
        .from('profiles')
        .update(safePayload)
        .eq('id', id);

      if (fallbackError) {
        console.error('Erro no fallback do update profiles:', fallbackError.message);
        return NextResponse.json({ error: fallbackError.message }, { status: 400 });
      }
    }

    if (Array.isArray(skills)) {
      try {
        await client.from('profile_skills').delete().eq('profile_id', id);
        if (skills.length > 0) {
          const skillRows = skills.map(skill => ({
            profile_id: id,
            skill: skill
          }));
          await client.from('profile_skills').insert(skillRows);
        }
      } catch (skillErr) {
        console.warn('Erro ao sincronizar skills:', skillErr);
      }
    }

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (err: any) {
    console.error('Falha em PUT /api/collaborators:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao atualizar colaborador' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) return auth.response;

    const client = getAdminClient();
    if (!client) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch (e) {}
    }

    if (!id) {
      return NextResponse.json({ error: 'ID do colaborador é obrigatório.' }, { status: 400 });
    }

    try {
      await client.from('profile_skills').delete().eq('profile_id', id);
    } catch (skillErr) {
      console.warn('Aviso ao remover profile_skills:', skillErr);
    }

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        await client.auth.admin.deleteUser(id);
      } catch (authException) {
        console.warn('Exceção ao deletar de auth.users:', authException);
      }
    }

    let { error: profileError } = await client
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileError) {
      try {
        await client.from('tasks').update({ collaborator_id: null }).eq('collaborator_id', id);
      } catch (tErr) {}
      const retryRes = await client.from('profiles').delete().eq('id', id);
      profileError = retryRes.error;
      if (profileError) {
        await client.from('profiles').update({ status: 'Inativo' }).eq('id', id);
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error('Falha em DELETE /api/collaborators:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao excluir colaborador' }, { status: 500 });
  }
}

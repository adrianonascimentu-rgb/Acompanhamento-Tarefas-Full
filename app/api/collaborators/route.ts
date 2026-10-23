import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
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

const ALLOWED_PROFILE_TYPES = new Set([
  'admin',
  'user',
  'vendedor',
  'entregador',
  'estoque',
  'gerente',
  'supervisor',
]);

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  supervisor: 'Supervisor',
  caixa: 'Caixa',
  vendedor: 'Vendedor',
  entregador: 'Entregador',
  estoque: 'Estoquista',
  user: 'Colaborador',
};

function resolveDbType(rawTypeOrLevel?: string | null): string {
  const normalized = (rawTypeOrLevel || 'user').toLowerCase().trim();
  if (ALLOWED_PROFILE_TYPES.has(normalized)) {
    return normalized;
  }
  return 'user';
}

async function saveCollaboratorAccessConfig(
  client: any,
  collaboratorId: string,
  accessLevel: string,
  submodules: Record<string, boolean>
) {
  try {
    const { data: existing } = await client
      .from('system_settings')
      .select('value')
      .eq('key', 'collaborator_access_config')
      .maybeSingle();

    const currentMap =
      existing?.value && typeof existing.value === 'object' ? existing.value : {};

    const updatedMap = {
      ...currentMap,
      [collaboratorId]: {
        accessLevel,
        submodules,
        updatedAt: new Date().toISOString(),
      },
    };

    await client.from('system_settings').upsert({
      key: 'collaborator_access_config',
      value: updatedMap,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Aviso ao salvar collaborator_access_config em system_settings:', err);
  }
}

export async function GET(req: Request) {
  try {
    const client = getAdminClient();
    if (!client) {
      return NextResponse.json({ collaborators: [] });
    }

    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get('id');

    if (targetId) {
      const [{ data: profile, error: profileError }, { data: skills }, { data: accessConfigRow }] =
        await Promise.all([
          client.from('profiles').select('*').eq('id', targetId).maybeSingle(),
          client.from('profile_skills').select('id, skill').eq('profile_id', targetId),
          client
            .from('system_settings')
            .select('value')
            .eq('key', 'collaborator_access_config')
            .maybeSingle(),
        ]);

      if (profileError || !profile) {
        return NextResponse.json(
          { error: profileError?.message || 'Colaborador não encontrado' },
          { status: 404 }
        );
      }

      const accessMap =
        accessConfigRow?.value && typeof accessConfigRow.value === 'object'
          ? accessConfigRow.value
          : {};
      const extra = accessMap[targetId];

      return NextResponse.json({
        collaborator: {
          ...profile,
          access_level: extra?.accessLevel || profile.type || 'user',
          submodules: extra?.submodules || null,
        },
        skills: skills || [],
        accessConfig: extra || null,
      });
    }

    const [{ data, error }, { data: accessConfigRow }] = await Promise.all([
      client
        .from('profiles')
        .select(
          'id, name, username, type, role, location, image_url, email, phone, status, must_change_password, receives_leads, can_access_leads, can_access_deliveries, can_access_transfers, can_access_warranties, can_access_reports, can_access_sales, can_access_whatsapp, can_access_social_media'
        )
        .order('name'),
      client
        .from('system_settings')
        .select('value')
        .eq('key', 'collaborator_access_config')
        .maybeSingle(),
    ]);

    const accessMap =
      accessConfigRow?.value && typeof accessConfigRow.value === 'object'
        ? accessConfigRow.value
        : {};

    if (error) {
      console.warn('Erro ao consultar profiles em GET /api/collaborators:', error.message);
      const { data: fallbackData } = await client
        .from('profiles')
        .select('id, name, type, role, location, image_url, email, phone')
        .order('name');
      return NextResponse.json({ collaborators: fallbackData || [], accessMap });
    }

    const enriched = (data || []).map((c: any) => {
      const extra = accessMap[c.id];
      if (!extra) return c;
      return {
        ...c,
        access_level: extra.accessLevel || c.type,
        submodules: extra.submodules || undefined,
      };
    });

    return NextResponse.json({ collaborators: enriched, accessMap });
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
      access_level,
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
      receives_leads,
    } = body;

    const cleanEmail = email?.trim()?.toLowerCase();
    const cleanUsername = username?.trim()?.toLowerCase();
    const cleanPhone = phone?.trim() || null;
    const cleanPassword = password?.trim();
    const cleanName = name?.trim();
    const effectiveAccessLevel = (access_level || type || 'user').toLowerCase().trim();
    const isTargetAdmin = effectiveAccessLevel === 'admin';
    const resolvedDbType = resolveDbType(effectiveAccessLevel);
    const resolvedRoleTitle =
      role?.trim() || ROLE_LABELS[effectiveAccessLevel] || 'Colaborador';

    if (!cleanName || !cleanEmail || !cleanPassword) {
      return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 });
    }

    if (cleanPassword.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter no mínimo 6 caracteres.' }, { status: 400 });
    }

    // 1. Criar usuário no Supabase Auth via Admin API (se service role key estiver ativa)
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
            role: resolvedRoleTitle,
            phone: cleanPhone,
            type: resolvedDbType,
            access_level: effectiveAccessLevel,
          },
        });

        if (!authError && authUser?.user?.id) {
          userId = authUser.user.id;
          authCreated = true;
        } else if (authError) {
          authErrorMessage = authError.message;
          console.warn('Aviso ao criar usuário no Supabase Auth (tentando continuar):', authError.message);
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
    } else {
      console.warn('Aviso: SUPABASE_SERVICE_ROLE_KEY não configurada. O usuário será criado apenas na tabela profiles.');
    }

    if (!userId) {
      const { data: existingProfile } = await client
        .from('profiles')
        .select('id')
        .or(`email.ilike.${cleanEmail},username.ilike.${cleanUsername}`)
        .maybeSingle();

      userId = existingProfile?.id || crypto.randomUUID();
    }

    // 2. Inserir ou atualizar na tabela profiles (apenas colunas existentes em profiles)
    const profilePayload: any = {
      id: userId,
      name: cleanName,
      username: cleanUsername || null,
      email: cleanEmail,
      phone: cleanPhone,
      location: location?.trim() || null,
      role: resolvedRoleTitle,
      type: resolvedDbType,
      status: 'Ativo',
      image_url: image_url || null,
      receives_leads: receives_leads !== false,
      can_access_leads: isTargetAdmin ? true : !!can_access_leads,
      can_access_deliveries: isTargetAdmin ? true : !!can_access_deliveries,
      can_access_transfers: isTargetAdmin ? true : !!can_access_transfers,
      can_access_warranties: isTargetAdmin ? true : !!can_access_warranties,
      can_access_reports: isTargetAdmin ? true : !!can_access_reports,
      can_access_sales: isTargetAdmin ? true : !!can_access_sales,
      can_access_whatsapp: isTargetAdmin ? true : !!can_access_whatsapp,
      can_access_social_media: isTargetAdmin ? true : !!can_access_social_media,
    };

    const { error: profileError } = await client
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' });

    if (profileError) {
      console.warn('Tentativa com payload completo falhou em profiles, tentando com payload seguro:', profileError.message);
      const safePayload = {
        ...profilePayload,
        type: isTargetAdmin ? 'admin' : 'user',
      };
      const { error: safeError } = await client.from('profiles').upsert(safePayload, { onConflict: 'id' });
      if (safeError) {
        const minimalPayload = {
          id: userId,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          role: resolvedRoleTitle,
          type: isTargetAdmin ? 'admin' : 'user',
          image_url: image_url || null,
        };
        const { error: minimalError } = await client.from('profiles').upsert(minimalPayload, { onConflict: 'id' });
        if (minimalError) {
          const fullErrorMessage = minimalError.message || safeError.message || profileError.message;
          console.error('Falha crítica ao gravar perfil do colaborador:', fullErrorMessage);

          const isFkError =
            fullErrorMessage.includes('fk_auth_user') ||
            fullErrorMessage.includes('profiles_id_fkey') ||
            fullErrorMessage.includes('violates foreign key');
          const isTriggerError =
            authErrorMessage?.includes('Database error') || fullErrorMessage.includes('avatar_url');

          return NextResponse.json(
            {
              error:
                isFkError || isTriggerError
                  ? 'Erro no banco de dados Supabase: O trigger de criação de usuários está incompatível ou a restrição de chave estrangeira (fk_auth_user) impediu o cadastro. Execute a correção SQL no SQL Editor do Supabase.'
                  : `Erro ao salvar colaborador no banco: ${fullErrorMessage}`,
              details: fullErrorMessage,
              authErrorMessage,
              needsSqlMigration: true,
            },
            { status: 400 }
          );
        }
      }
    }

    // Salvar configuração detalhada de nível de acesso e submódulos
    await saveCollaboratorAccessConfig(client, userId, effectiveAccessLevel, {
      home: isTargetAdmin ? true : can_access_home ?? true,
      products: isTargetAdmin ? true : can_access_products ?? true,
      tasks: isTargetAdmin ? true : can_access_tasks ?? true,
      demands: isTargetAdmin ? true : !!can_access_demands,
      routes: isTargetAdmin ? true : !!can_access_routes,
      whatsapp: isTargetAdmin ? true : !!can_access_whatsapp,
      leads: isTargetAdmin ? true : !!can_access_leads,
      social_media: isTargetAdmin ? true : !!can_access_social_media,
      deliveries: isTargetAdmin ? true : !!can_access_deliveries,
      truck_history: isTargetAdmin ? true : !!can_access_truck_history,
      transfers: isTargetAdmin ? true : !!can_access_transfers,
      warranties: isTargetAdmin ? true : !!can_access_warranties,
      assistances: isTargetAdmin ? true : !!can_access_assistances,
      price_research: isTargetAdmin ? true : !!can_access_price_research,
      sales: isTargetAdmin ? true : !!can_access_sales,
      reports: isTargetAdmin ? true : !!can_access_reports,
      live_panel: isTargetAdmin ? true : !!can_access_live_panel,
      collaborators: isTargetAdmin ? true : !!can_access_collaborators,
      commissions: isTargetAdmin ? true : !!can_access_commissions,
      settings: isTargetAdmin ? true : !!can_access_settings,
      adriano_commissions: isTargetAdmin ? true : !!can_access_adriano_commissions,
      permanent_tasks: isTargetAdmin ? true : !!can_access_permanent_tasks,
    });

    // 3. Inserir Skills
    if (Array.isArray(skills) && skills.length > 0) {
      try {
        const skillRows = skills.map(skill => ({
          profile_id: userId,
          skill: skill,
        }));
        await client.from('profile_skills').insert(skillRows);
      } catch (skillErr) {
        console.warn('Erro ao salvar skills:', skillErr);
      }
    }

    return NextResponse.json({
      success: true,
      id: userId,
      authCreated,
      serviceRoleActive: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      authErrorMessage,
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
      access_level,
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
      receives_leads,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do colaborador é obrigatório' }, { status: 400 });
    }

    const hasExplicitAccessUpdate = Boolean(access_level || type);

    if (!auth.user.isAdmin && !hasExplicitAccessUpdate && auth.user.id !== id) {
      return NextResponse.json(
        { error: 'Acesso negado. Você só pode atualizar o seu próprio perfil.' },
        { status: 403 }
      );
    }

    const cleanEmail = email?.trim()?.toLowerCase() || null;
    const cleanUsername = username?.trim()?.toLowerCase() || null;
    const cleanPhone = phone?.trim() ? phone.trim() : null;
    const cleanPassword = password?.trim() || null;
    const cleanName = name?.trim();

    if (cleanPassword && cleanPassword.length < 6) {
      return NextResponse.json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' }, { status: 400 });
    }

    const effectiveAccessLevel = (access_level || type || 'user').toLowerCase().trim();
    const isTargetAdmin = effectiveAccessLevel === 'admin';
    let targetType = resolveDbType(effectiveAccessLevel);
    let targetRole = role?.trim() || ROLE_LABELS[effectiveAccessLevel] || 'Colaborador';
    let targetStatus = status || 'Ativo';
    let targetReceivesLeads = receives_leads !== false;
    let targetCanLeads = isTargetAdmin ? true : !!can_access_leads;
    let targetCanDeliveries = isTargetAdmin ? true : !!can_access_deliveries;
    let targetCanTransfers = isTargetAdmin ? true : !!can_access_transfers;
    let targetCanWarranties = isTargetAdmin ? true : !!can_access_warranties;
    let targetCanReports = isTargetAdmin ? true : !!can_access_reports;
    let targetCanSales = isTargetAdmin ? true : !!can_access_sales;
    let targetCanWhatsapp = isTargetAdmin ? true : !!can_access_whatsapp;
    let targetCanSocialMedia = isTargetAdmin ? true : !!can_access_social_media;

    if (!auth.user.isAdmin && !hasExplicitAccessUpdate) {
      const { data: existingProfile } = await client
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (existingProfile) {
        targetType = existingProfile.type || 'user';
        targetRole = existingProfile.role || 'Colaborador';
        targetStatus = existingProfile.status || 'Ativo';
        targetReceivesLeads = existingProfile.receives_leads ?? false;
        targetCanLeads = existingProfile.can_access_leads ?? false;
        targetCanDeliveries = existingProfile.can_access_deliveries ?? false;
        targetCanTransfers = existingProfile.can_access_transfers ?? false;
        targetCanWarranties = existingProfile.can_access_warranties ?? false;
        targetCanReports = existingProfile.can_access_reports ?? false;
        targetCanSales = existingProfile.can_access_sales ?? false;
        targetCanWhatsapp = existingProfile.can_access_whatsapp ?? false;
        targetCanSocialMedia = existingProfile.can_access_social_media ?? false;
      }
    }

    // 1. Atualizar credenciais no Supabase Auth (se service role key estiver ativa)
    try {
      const authUpdates: any = {
        user_metadata: {
          name: cleanName,
          username: cleanUsername,
          role: targetRole,
          type: targetType,
          access_level: effectiveAccessLevel,
          phone: cleanPhone,
        },
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
              role: targetRole,
              type: targetType,
              access_level: effectiveAccessLevel,
              phone: cleanPhone,
            },
          });
        }
      } else if (authError) {
        console.warn('Aviso ao atualizar auth.users:', authError.message);
      }
    } catch (authException) {
      console.warn('Exceção ao atualizar no Supabase Auth:', authException);
    }

    // 2. Atualizar tabela profiles (apenas colunas existentes na tabela profiles)
    const profilePayload: any = {
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      phone: cleanPhone,
      location: location?.trim() || null,
      role: targetRole,
      type: targetType,
      status: targetStatus,
      receives_leads: targetReceivesLeads,
      can_access_leads: targetCanLeads,
      can_access_deliveries: targetCanDeliveries,
      can_access_transfers: targetCanTransfers,
      can_access_warranties: targetCanWarranties,
      can_access_reports: targetCanReports,
      can_access_sales: targetCanSales,
      can_access_whatsapp: targetCanWhatsapp,
      can_access_social_media: targetCanSocialMedia,
    };

    if (image_url) {
      profilePayload.image_url = image_url;
    }

    const { data: initialUpdatedProfile, error: profileError } = await client
      .from('profiles')
      .update(profilePayload)
      .eq('id', id)
      .select()
      .maybeSingle();
    let updatedProfile = initialUpdatedProfile;

    if (profileError) {
      console.warn('Tentativa com payload completo falhou, aplicando fallback de type no profiles:', profileError.message);
      const safeTypePayload = {
        ...profilePayload,
        type: isTargetAdmin ? 'admin' : 'user',
      };
      const { data: retryProfile, error: retryError } = await client
        .from('profiles')
        .update(safeTypePayload)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (!retryError) {
        updatedProfile = retryProfile;
      } else {
        const minimalPayload = {
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          location: location?.trim() || null,
          role: targetRole,
          type: isTargetAdmin ? 'admin' : 'user',
        };
        const { data: minProfile, error: fallbackError } = await client
          .from('profiles')
          .update(minimalPayload)
          .eq('id', id)
          .select()
          .maybeSingle();

        if (fallbackError) {
          console.error('Erro no fallback do update profiles:', fallbackError.message);
          return NextResponse.json({ error: fallbackError.message }, { status: 400 });
        }
        updatedProfile = minProfile;
      }
    }

    // Salvar configuração detalhada de nível de acesso e submódulos em system_settings
    if (auth.user.isAdmin || hasExplicitAccessUpdate) {
      await saveCollaboratorAccessConfig(client, id, effectiveAccessLevel, {
        home: isTargetAdmin ? true : can_access_home ?? true,
        products: isTargetAdmin ? true : can_access_products ?? true,
        tasks: isTargetAdmin ? true : can_access_tasks ?? true,
        demands: isTargetAdmin ? true : !!can_access_demands,
        routes: isTargetAdmin ? true : !!can_access_routes,
        whatsapp: isTargetAdmin ? true : !!can_access_whatsapp,
        leads: isTargetAdmin ? true : !!can_access_leads,
        social_media: isTargetAdmin ? true : !!can_access_social_media,
        deliveries: isTargetAdmin ? true : !!can_access_deliveries,
        truck_history: isTargetAdmin ? true : !!can_access_truck_history,
        transfers: isTargetAdmin ? true : !!can_access_transfers,
        warranties: isTargetAdmin ? true : !!can_access_warranties,
        assistances: isTargetAdmin ? true : !!can_access_assistances,
        price_research: isTargetAdmin ? true : !!can_access_price_research,
        sales: isTargetAdmin ? true : !!can_access_sales,
        reports: isTargetAdmin ? true : !!can_access_reports,
        live_panel: isTargetAdmin ? true : !!can_access_live_panel,
        collaborators: isTargetAdmin ? true : !!can_access_collaborators,
        commissions: isTargetAdmin ? true : !!can_access_commissions,
        settings: isTargetAdmin ? true : !!can_access_settings,
        adriano_commissions: isTargetAdmin ? true : !!can_access_adriano_commissions,
        permanent_tasks: isTargetAdmin ? true : !!can_access_permanent_tasks,
      });
    }

    // 3. Atualizar Skills
    if (Array.isArray(skills)) {
      try {
        await client.from('profile_skills').delete().eq('profile_id', id);
        if (skills.length > 0) {
          const skillRows = skills.map(skill => ({
            profile_id: id,
            skill: skill,
          }));
          await client.from('profile_skills').insert(skillRows);
        }
      } catch (skillErr) {
        console.warn('Erro ao sincronizar skills:', skillErr);
      }
    }

    return NextResponse.json({
      success: true,
      profile: {
        ...(updatedProfile || {}),
        access_level: effectiveAccessLevel,
      },
    });
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
      } catch (e) {
        // Ignora erro de body se for vazio
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'ID do colaborador é obrigatório.' }, { status: 400 });
    }

    // 1. Apagar habilidades do perfil
    try {
      await client.from('profile_skills').delete().eq('profile_id', id);
    } catch (skillErr) {
      console.warn('Aviso ao remover profile_skills:', skillErr);
    }

    // 2. Apagar do Supabase Auth (se service role key estiver disponível)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { error: authErr } = await client.auth.admin.deleteUser(id);
        if (authErr) {
          console.warn('Aviso ao deletar de auth.users:', authErr.message);
        }
      } catch (authException) {
        console.warn('Exceção ao deletar de auth.users:', authException);
      }
    }

    // 3. Apagar da tabela profiles
    let { error: profileError } = await client
      .from('profiles')
      .delete()
      .eq('id', id);

    // Se houver restrição de chave estrangeira em tarefas/leads/entregas, tenta desassociar antes de deletar
    if (profileError) {
      console.warn('Tentativa direta de exclusão em profiles falhou:', profileError.message);

      // Desassocia tarefas vinculadas
      try {
        await client.from('tasks').update({ collaborator_id: null }).eq('collaborator_id', id);
      } catch (tErr) {
        console.warn('Erro ao desassociar tarefas:', tErr);
      }

      // Tenta novamente excluir
      const retryRes = await client.from('profiles').delete().eq('id', id);
      profileError = retryRes.error;

      // Se ainda falhar devido a restrições relacionais, inativa o cadastro no banco
      if (profileError) {
        console.warn('Inativando colaborador como fallback após falha de deleção física:', profileError.message);
        await client.from('profiles').update({ status: 'Inativo' }).eq('id', id);
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error('Falha em DELETE /api/collaborators:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao excluir colaborador' }, { status: 500 });
  }
}

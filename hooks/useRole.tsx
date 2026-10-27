'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, handleSupabaseAuthError } from '@/lib/supabase';

export type Role = 'admin' | 'vendedor' | 'user' | 'gerente' | 'estoque' | 'entregador' | 'supervisor' | 'caixa';

// Normalizador inteligente de papéis/cargos para compatibilidade com títulos descritivos do banco de dados
export function normalizeRole(r: string | null | undefined): Role {
  if (!r) return 'user';
  const lower = r.toLowerCase().trim();
  if (lower.includes('caixa') || lower.includes('financeiro') || lower.includes('secretaria')) return 'caixa';
  if (lower.includes('administrador') || lower === 'admin' || lower.startsWith('admin ') || (lower.includes('admin') && !lower.includes('auxiliar'))) return 'admin';
  if (
    lower.includes('entrega') || 
    lower.includes('entregador') || 
    lower.includes('motorista') || 
    lower.includes('frete') || 
    lower.includes('courier')
  ) return 'entregador';
  if (lower.includes('vendedor') || lower.includes('venda') || lower.includes('comercial')) return 'vendedor';
  if (
    lower.includes('estoque') || 
    lower.includes('almoxarife') || 
    lower.includes('separador') || 
    lower.includes('conferente') || 
    lower.includes('expedi') || 
    lower.includes('logistica')
  ) return 'estoque';
  if (lower.includes('gerente') || lower.includes('gerencia') || lower.includes('gestor')) return 'gerente';
  if (lower.includes('supervisor') || lower.includes('coordenador')) return 'supervisor';
  return 'user';
}

export interface HomeCardDefinition {
  id: string;
  label: string;
  desc: string;
  category: 'Topo & Atalhos' | 'Indicadores & Operação' | 'Gráficos & Resumos';
}

export const HOME_PAGE_CARDS: HomeCardDefinition[] = [
  {
    id: 'card_truck_banner',
    label: 'Caminhão de Reposição (Topo)',
    desc: 'Banner superior com previsão de chegada e saída do caminhão',
    category: 'Topo & Atalhos',
  },
  {
    id: 'card_central_modulos',
    label: 'Central de Módulos & ADM',
    desc: 'Painel compacto superior com atalhos para os módulos',
    category: 'Topo & Atalhos',
  },
  {
    id: 'card_catalogo_pecas',
    label: 'Catálogo de Peças & Preços',
    desc: 'Botão e card de consulta de produtos e preços',
    category: 'Topo & Atalhos',
  },
  {
    id: 'card_tabela_split',
    label: 'Tabela de Split (Ar Condicionado)',
    desc: 'Consulta de preços oficiais de Split 1x a 10x (Agratto, Gree, Elgin)',
    category: 'Topo & Atalhos',
  },
  {
    id: 'card_clientes_fidelidade',
    label: 'Clientes Fidelidade & Bônus',
    desc: 'Acesso rápido ao programa de fidelidade, bônus e pontos a vencer',
    category: 'Indicadores & Operação',
  },
  {
    id: 'card_tarefas_permanentes',
    label: 'Tarefas Permanentes & Notas',
    desc: 'Acesso aos blocos de anotações e rotinas fixas diárias',
    category: 'Topo & Atalhos',
  },
  {
    id: 'card_acesso_rapido',
    label: 'Acesso Rápido aos Módulos',
    desc: 'Atalhos para Kanban, Demandas, Pesquisa de Preço e Assistência',
    category: 'Topo & Atalhos',
  },
  {
    id: 'card_painel_gestor_stats',
    label: 'Indicadores de Tarefas (Painel)',
    desc: 'Cards de contagem: Total, Pendentes, Concluídas e Atrasadas',
    category: 'Indicadores & Operação',
  },
  {
    id: 'card_faturamento',
    label: 'Faturamento Real & Metas',
    desc: 'Card de desempenho comercial, faturamento da equipe e metas',
    category: 'Indicadores & Operação',
  },
  {
    id: 'card_entregas_urgentes',
    label: 'Alertas de Entregas Urgentes',
    desc: 'Card de monitoramento de entregas prioritárias',
    category: 'Indicadores & Operação',
  },
  {
    id: 'card_transferencias',
    label: 'Resumo de Transferências',
    desc: 'Card de movimentação de estoque entre filiais',
    category: 'Indicadores & Operação',
  },
  {
    id: 'card_progresso_tarefas',
    label: 'Progresso Geral & Categorias',
    desc: 'Barra de progresso percentual e filtro por categoria de tarefas',
    category: 'Indicadores & Operação',
  },
  {
    id: 'card_graficos',
    label: 'Gráficos de Desempenho & SLA',
    desc: 'Gráficos de volume de tarefas, histórico mensal e SLA de entregas',
    category: 'Gráficos & Resumos',
  },
  {
    id: 'card_resumo_vendas',
    label: 'Card Resumo de Vendas',
    desc: 'Resumo numérico de vendas realizadas, receita e ticket médio',
    category: 'Gráficos & Resumos',
  },
  {
    id: 'card_resumo_entregas',
    label: 'Card Logística de Entregas',
    desc: 'Status operacional diário (Agendadas, Pendentes, Em Andamento, Finalizadas)',
    category: 'Gráficos & Resumos',
  },
  {
    id: 'card_funil_leads',
    label: 'Funil de Leads & Distribuição',
    desc: 'Indicadores de oportunidades e distribuição de leads por vendedor',
    category: 'Gráficos & Resumos',
  },
];

export function getDefaultHomeCardsForRole(roleInput: string | null | undefined): Record<string, boolean> {
  const r = normalizeRole(roleInput);
  if (r === 'admin' || r === 'gerente' || r === 'supervisor') {
    return {
      card_truck_banner: true,
      card_central_modulos: true,
      card_catalogo_pecas: true,
      card_tabela_split: true,
      card_clientes_fidelidade: true,
      card_tarefas_permanentes: true,
      card_acesso_rapido: true,
      card_painel_gestor_stats: true,
      card_faturamento: true,
      card_entregas_urgentes: true,
      card_transferencias: true,
      card_progresso_tarefas: true,
      card_graficos: true,
      card_resumo_vendas: true,
      card_resumo_entregas: true,
      card_funil_leads: true,
    };
  }
  if (r === 'vendedor') {
    return {
      card_truck_banner: true,
      card_central_modulos: true,
      card_catalogo_pecas: true,
      card_tabela_split: true,
      card_clientes_fidelidade: true,
      card_tarefas_permanentes: false,
      card_acesso_rapido: true,
      card_painel_gestor_stats: true,
      card_faturamento: true,
      card_entregas_urgentes: true,
      card_transferencias: false,
      card_progresso_tarefas: true,
      card_graficos: true,
      card_resumo_vendas: true,
      card_resumo_entregas: true,
      card_funil_leads: true,
    };
  }
  if (r === 'caixa') {
    return {
      card_truck_banner: true,
      card_central_modulos: true,
      card_catalogo_pecas: true,
      card_tarefas_permanentes: false,
      card_acesso_rapido: true,
      card_painel_gestor_stats: true,
      card_faturamento: true,
      card_entregas_urgentes: true,
      card_transferencias: true,
      card_progresso_tarefas: true,
      card_graficos: true,
      card_resumo_vendas: true,
      card_resumo_entregas: true,
      card_funil_leads: false,
    };
  }
  if (r === 'estoque') {
    return {
      card_truck_banner: true,
      card_central_modulos: true,
      card_catalogo_pecas: true,
      card_tarefas_permanentes: false,
      card_acesso_rapido: true,
      card_painel_gestor_stats: true,
      card_faturamento: false,
      card_entregas_urgentes: true,
      card_transferencias: true,
      card_progresso_tarefas: true,
      card_graficos: true,
      card_resumo_vendas: false,
      card_resumo_entregas: true,
      card_funil_leads: false,
    };
  }
  if (r === 'entregador') {
    return {
      card_truck_banner: true,
      card_central_modulos: true,
      card_catalogo_pecas: true,
      card_tarefas_permanentes: false,
      card_acesso_rapido: true,
      card_painel_gestor_stats: true,
      card_faturamento: false,
      card_entregas_urgentes: true,
      card_transferencias: false,
      card_progresso_tarefas: true,
      card_graficos: false,
      card_resumo_vendas: false,
      card_resumo_entregas: true,
      card_funil_leads: false,
    };
  }
  return {
    card_truck_banner: true,
    card_central_modulos: true,
    card_catalogo_pecas: true,
    card_tarefas_permanentes: false,
    card_acesso_rapido: true,
    card_painel_gestor_stats: true,
    card_faturamento: true,
    card_entregas_urgentes: true,
    card_transferencias: false,
    card_progresso_tarefas: true,
    card_graficos: true,
    card_resumo_vendas: false,
    card_resumo_entregas: true,
    card_funil_leads: false,
  };
}

export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  // Principal
  home: ['admin', 'gerente', 'supervisor', 'caixa', 'vendedor', 'estoque', 'entregador', 'user'],
  products: ['admin', 'gerente', 'supervisor', 'caixa', 'vendedor', 'estoque', 'entregador', 'user'],
  split_table: ['admin', 'gerente', 'supervisor', 'caixa', 'vendedor', 'estoque', 'entregador', 'user'],
  loyalty: ['admin', 'gerente', 'supervisor', 'caixa', 'vendedor'],
  loyalty_import: ['admin', 'gerente', 'supervisor'],
  tasks: ['admin', 'gerente', 'supervisor', 'caixa', 'vendedor', 'estoque', 'user'],
  demands: ['admin', 'gerente', 'supervisor', 'caixa', 'vendedor', 'estoque'],
  routes: ['admin', 'gerente', 'supervisor', 'entregador'],

  // Comunicação & CRM
  whatsapp: ['admin', 'gerente', 'vendedor'],
  leads: ['admin', 'gerente', 'supervisor', 'vendedor'],
  social_media: ['admin', 'gerente'],

  // Operações
  deliveries: ['admin', 'entregador', 'motorista', 'vendedor', 'estoque', 'gerente', 'supervisor', 'caixa'],
  truck_history: ['admin', 'gerente', 'supervisor', 'estoque', 'entregador'],
  transfers: ['admin', 'estoque', 'gerente', 'caixa'],
  warranties: ['admin', 'vendedor', 'estoque', 'gerente', 'caixa'],
  assistances: ['admin', 'gerente', 'estoque', 'vendedor'],
  price_research: ['admin', 'gerente', 'vendedor', 'estoque'],

  // Resultados
  sales: ['admin', 'vendedor', 'gerente', 'caixa'],
  reports: ['admin', 'gerente', 'supervisor', 'caixa'],

  // Administração
  live_panel: ['admin', 'gerente', 'supervisor'],
  collaborators: ['admin', 'gerente', 'supervisor'],
  commissions: ['admin', 'gerente'],
  settings: ['admin'],
  adriano_commissions: ['admin'],
  permanent_tasks: ['admin', 'gerente', 'supervisor']
};

export const DEFAULT_ADMIN_USER = {
  id: '00000000-0000-0000-0000-000000000000',
  name: 'Administrador',
  type: 'admin',
  role: 'Administrador Geral',
  status: 'Ativo'
};

interface RoleContextType {
  role: Role;
  user: any | null;
  isAdmin: boolean;
  isAdriano: boolean;
  isCaixa: boolean;
  isEntregador: boolean;
  isEstoque: boolean;
  isVendedor: boolean;
  isGerente: boolean;
  isSupervisor: boolean;
  canUploadCatalog: boolean;
  canManageHomeCards: boolean;
  canViewHomeCard: (cardId: string) => boolean;
  canAccessLeads: boolean;
  canAccessSocialMedia: boolean;
  canAccessWhatsapp: boolean;
  canAccessDeliveries: boolean;
  canUpdateDeliveryStatus: boolean;
  canAccessTransfers: boolean;
  canAccessWarranties: boolean;
  canAccessReports: boolean;
  canAccessSales: boolean;
  canAccessDemands: boolean;
  canAccessPermanentTasks: boolean;
  canAccessSplitTable: boolean;
  canAccessLoyalty: boolean;
  canImportLoyalty: boolean;
  hasSubmoduleAccess: (submoduleKey: string) => boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (roleOrUserData: any, userData?: any) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('app_user_session');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [permissions, setPermissions] = useState<Record<string, string[]>>(DEFAULT_PERMISSIONS);
  const [collaboratorAccessMap, setCollaboratorAccessMap] = useState<Record<string, any>>({});

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['module_permissions', 'collaborator_access_config']);
      
      if (error) {
        if (error.code === 'PGRST116') return;
        if (error.code === 'PGRST303' || error.message?.includes('JWT expired') || error.message?.includes('jwt expired')) {
          await handleSupabaseAuthError(error);
          return;
        }
        console.warn('Notice fetching permissions:', error.message);
        return;
      }

      if (Array.isArray(data)) {
        data.forEach((row: any) => {
          if (row.key === 'module_permissions' && row.value) {
            setPermissions(prev => ({
              ...prev,
              ...row.value
            }));
          } else if (row.key === 'collaborator_access_config' && row.value && typeof row.value === 'object') {
            setCollaboratorAccessMap(row.value);
          }
        });
      }
    } catch (err: any) {
      if (err?.code === 'PGRST303' || err?.message?.includes('JWT expired') || err?.message?.includes('jwt expired')) {
        await handleSupabaseAuthError(err);
        return;
      }
      console.warn('Notice fetching permissions:', err?.message || err);
    }
  };

  const refreshUser = async () => {
    setIsLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        let profile: any = null;
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();
          profile = profileData;
        } catch (profileErr) {
          console.warn('Error fetching profile for authUser:', profileErr);
        }

        let savedAccessEntry: any = null;
        try {
          const { data: accessConfigRow } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'collaborator_access_config')
            .maybeSingle();
          if (accessConfigRow?.value && typeof accessConfigRow.value === 'object') {
            savedAccessEntry = (accessConfigRow.value as Record<string, any>)[authUser.id] || null;
          }
        } catch {}

        const emailPrefix = authUser.email ? authUser.email.split('@')[0] : '';
        const formattedEmailName = emailPrefix ? emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1) : '';
        const resolvedName = 
          profile?.name || 
          profile?.full_name || 
          authUser.user_metadata?.name || 
          authUser.user_metadata?.full_name || 
          formattedEmailName || 
          'Usuário';

        // Preserva o cargo real descritivo do perfil ou o nível de acesso salvo
        const rawRoleTitle = (
          savedAccessEntry?.accessLevel ||
          (profile?.role && profile.role.toLowerCase() !== 'user' ? profile.role : null) ||
          (profile?.type && profile.type.toLowerCase() !== 'user' ? profile.type : null) ||
          authUser.user_metadata?.role ||
          authUser.user_metadata?.type ||
          profile?.role ||
          profile?.type ||
          'user'
        );

        const normalizedRoleName = normalizeRole(rawRoleTitle);

        const enrichedUser = { 
          ...authUser, 
          ...(profile || {}),
          id: authUser.id,
          name: resolvedName,
          type: savedAccessEntry?.accessLevel || profile?.type || (normalizedRoleName === 'admin' ? 'admin' : normalizedRoleName),
          role: profile?.role || rawRoleTitle,
          access_level: savedAccessEntry?.accessLevel || profile?.type || normalizedRoleName,
          submodules: savedAccessEntry?.submodules || null,
          homeCards: savedAccessEntry?.homeCards || null,
          normalizedRole: normalizedRoleName
        };

        setUser(enrichedUser);
        try {
          localStorage.setItem('app_user_session', JSON.stringify(enrichedUser));
        } catch {}
      } else {
        // Check local storage backup session
        try {
          const savedSession = localStorage.getItem('app_user_session');
          if (savedSession) {
            const parsed = JSON.parse(savedSession);
            if (parsed && parsed.id) {
              setUser(parsed);
              setIsLoading(false);
              return;
            }
          }
        } catch {}

        setUser(null);
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
    refreshUser();

    const handleAccessUpdated = () => {
      fetchPermissions();
      refreshUser();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('collaborator-access-updated', handleAccessUpdated);
    }

    let settingsChannel: any = null;
    try {
      settingsChannel = supabase
        .channel('public:system_settings-role-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'system_settings' },
          () => {
            fetchPermissions();
          }
        )
        .subscribe();
    } catch {}

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        refreshUser();
      } else if (event === 'SIGNED_OUT') {
        try {
          localStorage.removeItem('app_user_session');
        } catch {}
        setUser(null);
        setIsLoading(false);
      } else {
        try {
          const savedSession = localStorage.getItem('app_user_session');
          if (savedSession) {
            const parsed = JSON.parse(savedSession);
            if (parsed && parsed.id) {
              setUser(parsed);
            } else {
              setUser(null);
            }
          } else {
            setUser(null);
          }
        } catch {
          setUser(null);
        }
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('collaborator-access-updated', handleAccessUpdated);
      }
      if (settingsChannel) {
        supabase.removeChannel(settingsChannel);
      }
    };
  }, []);

  const login = (roleOrUserData: any, userData?: any) => {
    const finalData = userData || roleOrUserData;
    if (finalData) {
      const emailPrefix = finalData.email ? finalData.email.split('@')[0] : '';
      const formattedEmailName = emailPrefix ? emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1) : '';
      const resolvedName = 
        finalData.name || 
        finalData.full_name || 
        finalData.user_metadata?.name || 
        finalData.user_metadata?.full_name || 
        formattedEmailName || 
        'Usuário';

      const rawRoleTitle = (
        finalData.access_level ||
        (finalData.role && finalData.role.toLowerCase() !== 'user' ? finalData.role : null) ||
        finalData.user_metadata?.role ||
        (finalData.type && finalData.type.toLowerCase() !== 'user' ? finalData.type : null) ||
        finalData.user_metadata?.type ||
        (typeof roleOrUserData === 'string' && roleOrUserData.toLowerCase() !== 'user' ? roleOrUserData : null) ||
        finalData.role ||
        finalData.type ||
        'user'
      );

      const normalizedRoleName = normalizeRole(rawRoleTitle);

      const enrichedUser = {
        ...finalData,
        name: resolvedName,
        type: finalData.access_level || finalData.type || (normalizedRoleName === 'admin' ? 'admin' : normalizedRoleName),
        role: finalData.role || rawRoleTitle,
        normalizedRole: normalizedRoleName
      };
      setUser(enrichedUser);
      try {
        localStorage.setItem('app_user_session', JSON.stringify(enrichedUser));
      } catch {}
    } else {
      setUser(roleOrUserData);
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('app_user_session');
    } catch {}
    await supabase.auth.signOut().catch(() => {});
    setUser(null);
  };

  const ownerEmail = (process.env.NEXT_PUBLIC_OWNER_EMAIL || process.env.OWNER_EMAIL || '').trim().toLowerCase();
  const userEmail = (user?.email || '').trim().toLowerCase();
  const liveAccessEntry = user?.id ? collaboratorAccessMap[user.id] : null;
  const rawRole = (liveAccessEntry?.accessLevel || user?.access_level || user?.role || user?.type || 'user').toLowerCase();
  const normalizedRole = normalizeRole(liveAccessEntry?.accessLevel || user?.access_level || user?.role || user?.type);

  const isAdmin = 
    normalizedRole === 'admin' || 
    ((rawRole.includes('admin') || rawRole.includes('administrador')) && !rawRole.includes('auxiliar') && !rawRole.includes('assistente')) ||
    user?.type?.toLowerCase() === 'admin' ||
    user?.access_level?.toLowerCase() === 'admin' ||
    (!!ownerEmail && userEmail === ownerEmail);

  const isAdriano = Boolean(
    userEmail === 'adrianonascimentu@gmail.com' ||
    user?.username?.toLowerCase().trim() === 'adrianonascimentu@gmail.com' ||
    (user?.name && user.name.toLowerCase().includes('adriano nascimento'))
  );

  const isCaixa = 
    normalizedRole === 'caixa' || 
    rawRole.includes('caixa') || 
    rawRole.includes('financeiro') || 
    rawRole.includes('secretaria');

  const isEntregador = 
    normalizedRole === 'entregador' ||
    rawRole.includes('entrega') ||
    rawRole.includes('motorista') ||
    rawRole.includes('frete') ||
    rawRole.includes('courier');

  const isEstoque = 
    normalizedRole === 'estoque' ||
    rawRole.includes('estoque') ||
    rawRole.includes('almoxarife') ||
    rawRole.includes('separador') ||
    rawRole.includes('expedi') ||
    rawRole.includes('logistica');

  const isVendedor = 
    normalizedRole === 'vendedor' ||
    rawRole.includes('vendedor') ||
    rawRole.includes('venda') ||
    rawRole.includes('comercial');

  const isGerente = 
    normalizedRole === 'gerente' ||
    rawRole.includes('gerente') ||
    rawRole.includes('gerência') ||
    rawRole.includes('gerencia') ||
    rawRole.includes('gestor');

  const isSupervisor = 
    normalizedRole === 'supervisor' ||
    rawRole.includes('supervisor') ||
    rawRole.includes('coordenador');

  // Regra de Negócio: Somente Administrador, Gerente e Supervisor podem enviar o arquivo para atualização dos produtos
  const canUploadCatalog = Boolean(isAdmin || isGerente || isSupervisor);

  // Regra de Negócio: Administrador, Gerente e Supervisor podem habilitar quais cards da página inicial cada colaborador visualiza
  const canManageHomeCards = Boolean(isAdmin || isGerente || isSupervisor);

  const canViewHomeCard = (cardId: string): boolean => {
    if (!user) return false;
    const explicitHomeCards = liveAccessEntry?.homeCards || user?.homeCards;
    const explicitSubmodules = liveAccessEntry?.submodules || user?.submodules;

    // 1. Se houver configuração explícita salva para este card no perfil do colaborador, aplica exatamente o configurado
    if (explicitHomeCards && typeof explicitHomeCards[cardId] === 'boolean') {
      return explicitHomeCards[cardId];
    }
    if (explicitSubmodules && typeof explicitSubmodules[cardId] === 'boolean') {
      return explicitSubmodules[cardId];
    }

    // 2. Administradores visualizam todos os cards por padrão
    if (isAdmin) return true;

    // 3. Fallback para os padrões do cargo do colaborador
    const defaults = getDefaultHomeCardsForRole(normalizedRole);
    return defaults[cardId] ?? true;
  };
  
  const hasPermission = (module: string) => {
    if (isAdmin) return true;
    if (!user) return false;

    const effectiveSubmodules = liveAccessEntry?.submodules || user.submodules;

    // 0. Verificação explícita nos submódulos salvos do colaborador (collaborator_access_config)
    if (effectiveSubmodules && typeof effectiveSubmodules[module] === 'boolean') {
      return effectiveSubmodules[module];
    }
    
    // 1. Verificação explícita na coluna de permissão do usuário
    const userAccessKey = `can_access_${module}`;
    if (user[userAccessKey] === true) return true;
    
    // 2. Para entregas: Caixa, Administradores, Entregadores, Vendedores, Estoque e Gerência têm acesso nativo total
    if (module === 'deliveries') {
      if (isCaixa || isEntregador || isVendedor || isEstoque || isGerente) {
        return true;
      }
    }

    // 3. Verificação com a lista de papéis configurados
    const allowedRoles = (permissions[module] && permissions[module].length > 0)
      ? permissions[module]
      : (DEFAULT_PERMISSIONS[module] || []);

    return allowedRoles.some((allowed: string) => {
      const allowedLower = allowed.toLowerCase().trim();
      const normAllowed = normalizeRole(allowedLower);

      return (
        allowedLower === rawRole ||
        allowedLower === normalizedRole ||
        normAllowed === normalizedRole ||
        rawRole.includes(allowedLower) ||
        (user?.type && user.type.toLowerCase() === allowedLower) ||
        (user?.access_level && user.access_level.toLowerCase() === allowedLower)
      );
    });
  };

  // O Caixa também pode ver todas as entregas e operar o módulo de entregas
  const canAccessDeliveries = 
    isAdmin || 
    isCaixa ||
    isEntregador ||
    isVendedor ||
    isEstoque ||
    isGerente ||
    user?.can_access_deliveries === true ||
    user?.can_access_deliveries !== false ||
    hasPermission('deliveries');

  // Regra de Negócio: O usuário que tem a função de caixa também pode mudar o status das entregas
  const canUpdateDeliveryStatus = Boolean(
    isAdmin || 
    isCaixa || 
    isEntregador || 
    isGerente || 
    isSupervisor ||
    (normalizedRole as string) === 'caixa' ||
    rawRole.includes('caixa') ||
    rawRole.includes('financeiro') ||
    rawRole.includes('secretaria')
  );

  // Regra de Negócio: Somente Administrador, Gerente, Supervisor ou colaborador com card habilitado têm acesso a Tarefas Permanentes & Notas
  const canAccessPermanentTasks = Boolean(
    isAdmin || 
    isGerente || 
    isSupervisor ||
    (normalizedRole as string) === 'admin' ||
    (normalizedRole as string) === 'gerente' ||
    (normalizedRole as string) === 'supervisor' ||
    rawRole.includes('admin') ||
    rawRole.includes('gerente') ||
    rawRole.includes('supervisor') ||
    rawRole.includes('coordenador') ||
    rawRole.includes('gestor') ||
    hasPermission('permanent_tasks') ||
    canViewHomeCard('card_tarefas_permanentes')
  );

  const canAccessSplitTable = hasPermission('split_table');
  const canAccessLoyalty = hasPermission('loyalty');
  const canImportLoyalty = Boolean(isAdmin || isGerente || isSupervisor || hasPermission('loyalty_import'));

  const hasSubmoduleAccess = (submoduleKey: string): boolean => {
    if (isAdmin) return true;
    if (!user) return false;
    const effectiveSubmodules = liveAccessEntry?.submodules || user.submodules;
    if (effectiveSubmodules && typeof effectiveSubmodules[submoduleKey] === 'boolean') {
      return effectiveSubmodules[submoduleKey];
    }
    if (submoduleKey.startsWith('split_table_')) {
      return canAccessSplitTable;
    }
    if (submoduleKey.startsWith('loyalty_')) {
      if (submoduleKey === 'loyalty_import') return canImportLoyalty;
      return canAccessLoyalty;
    }
    return hasPermission(submoduleKey);
  };

  const value = {
    role: normalizedRole,
    user,
    isAdmin,
    isAdriano,
    isCaixa,
    isEntregador,
    isEstoque,
    isVendedor,
    isGerente,
    isSupervisor,
    canUploadCatalog,
    canManageHomeCards,
    canViewHomeCard,
    canAccessLeads: hasPermission('leads'),
    canAccessSocialMedia: hasPermission('social_media'),
    canAccessWhatsapp: hasPermission('whatsapp'),
    canAccessDeliveries,
    canUpdateDeliveryStatus,
    canAccessTransfers: hasPermission('transfers'),
    canAccessWarranties: hasPermission('warranties'),
    canAccessReports: hasPermission('reports'),
    canAccessSales: hasPermission('sales'),
    canAccessDemands: hasPermission('demands'),
    canAccessPermanentTasks,
    canAccessSplitTable,
    canAccessLoyalty,
    canImportLoyalty,
    hasSubmoduleAccess,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUser
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}

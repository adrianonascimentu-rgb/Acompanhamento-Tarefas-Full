'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

// Normalizador de papéis/cargos para compatibilidade com títulos descritivos do banco
export function normalizeRole(r: string | null | undefined): string {
  if (!r) return 'user';
  const lower = r.toLowerCase().trim();
  if (lower.includes('admin') || lower.includes('administrador')) return 'admin';
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
  if (lower.includes('caixa') || lower.includes('financeiro')) return 'caixa';
  return lower;
}

export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  leads: ['admin', 'vendedor', 'gerente', 'supervisor'],
  social_media: ['admin', 'gerente'],
  whatsapp: ['admin', 'vendedor', 'gerente'],
  deliveries: ['admin', 'entregador', 'motorista', 'vendedor', 'estoque', 'gerente', 'supervisor', 'caixa'],
  transfers: ['admin', 'estoque', 'gerente'],
  warranties: ['admin', 'vendedor', 'estoque', 'gerente'],
  sales: ['admin', 'vendedor', 'gerente'],
  reports: ['admin', 'gerente', 'supervisor'],
  demands: ['admin', 'vendedor', 'gerente', 'estoque']
};

export const DEFAULT_ADMIN_USER = {
  id: '00000000-0000-0000-0000-000000000000',
  name: 'Administrador',
  type: 'admin',
  role: 'Administrador Geral',
  status: 'Ativo'
};

interface RoleContextType {
  role: any;
  user: any | null;
  isAdmin: boolean;
  canAccessLeads: boolean;
  canAccessSocialMedia: boolean;
  canAccessWhatsapp: boolean;
  canAccessDeliveries: boolean;
  canAccessTransfers: boolean;
  canAccessWarranties: boolean;
  canAccessReports: boolean;
  canAccessSales: boolean;
  canAccessDemands: boolean;
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

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'module_permissions')
        .maybeSingle();
      
      if (error) {
        if (error.code === 'PGRST116') return;
        console.warn('Notice fetching permissions:', error.message);
        return;
      }

      if (data?.value) {
        setPermissions(prev => ({
          ...prev,
          ...data.value
        }));
      }
    } catch (err: any) {
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

        const emailPrefix = authUser.email ? authUser.email.split('@')[0] : '';
        const formattedEmailName = emailPrefix ? emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1) : '';
        const resolvedName = 
          profile?.name || 
          profile?.full_name || 
          authUser.user_metadata?.name || 
          authUser.user_metadata?.full_name || 
          formattedEmailName || 
          'Usuário';

        // Preserva o cargo real descritivo do perfil (ex: "Entregas e Estoque", "Vendedor", "Gerente")
        const rawRoleTitle = (
          (profile?.role && profile.role.toLowerCase() !== 'user' ? profile.role : null) ||
          authUser.user_metadata?.role ||
          (profile?.type && profile.type.toLowerCase() !== 'user' ? profile.type : null) ||
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
          type: profile?.type || (normalizedRoleName === 'admin' ? 'admin' : 'user'),
          role: rawRoleTitle,
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

    return () => subscription.unsubscribe();
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
        type: finalData.type || (normalizedRoleName === 'admin' ? 'admin' : 'user'),
        role: rawRoleTitle,
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
  const rawRole = (user?.role || user?.type || 'user').toLowerCase();
  const normalizedRole = normalizeRole(user?.role || user?.type);

  const isAdmin = 
    normalizedRole === 'admin' || 
    rawRole.includes('admin') || 
    rawRole.includes('administrador') ||
    user?.type?.toLowerCase() === 'admin' ||
    (!!ownerEmail && userEmail === ownerEmail);
  
  const hasPermission = (module: string) => {
    if (isAdmin) return true;
    if (!user) return false;
    
    // 1. Verificação explícita na coluna de permissão do usuário
    const userAccessKey = `can_access_${module}`;
    if (user[userAccessKey] === true) return true;
    
    // 2. Para entregas: entregadores, motoristas, vendedores, estoque e gerência têm acesso nativo
    if (module === 'deliveries') {
      if (
        normalizedRole === 'entregador' ||
        normalizedRole === 'vendedor' ||
        normalizedRole === 'estoque' ||
        normalizedRole === 'gerente' ||
        normalizedRole === 'supervisor' ||
        normalizedRole === 'caixa'
      ) {
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
        (user?.type && user.type.toLowerCase() === allowedLower)
      );
    });
  };

  const canAccessDeliveries = 
    isAdmin || 
    user?.can_access_deliveries === true ||
    normalizedRole === 'entregador' ||
    hasPermission('deliveries');

  const value = {
    role: normalizedRole,
    user,
    isAdmin,
    canAccessLeads: hasPermission('leads'),
    canAccessSocialMedia: hasPermission('social_media'),
    canAccessWhatsapp: hasPermission('whatsapp'),
    canAccessDeliveries,
    canAccessTransfers: hasPermission('transfers'),
    canAccessWarranties: hasPermission('warranties'),
    canAccessReports: hasPermission('reports'),
    canAccessSales: hasPermission('sales'),
    canAccessDemands: hasPermission('demands'),
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

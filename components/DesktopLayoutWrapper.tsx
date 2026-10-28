'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useUI } from '@/hooks/useUI';
import { useRole } from '@/hooks/useRole';

export function DesktopLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isSidebarCollapsed } = useUI();
  const {
    user,
    isAdmin,
    isLoading,
    canAccessProducts,
    canAccessSplitTable,
    canAccessLoyalty,
    canAccessTasks,
    canAccessDemands,
    canAccessRoutes,
    canAccessWhatsapp,
    canAccessLeads,
    canAccessSocialMedia,
    canAccessDeliveries,
    canAccessTruckHistory,
    canAccessTransfers,
    canAccessWarranties,
    canAccessAssistances,
    canAccessPriceResearch,
    canAccessSales,
    canAccessReports,
    canAccessLivePanel,
    canAccessCollaborators,
    canAccessCommissions,
    canAccessSettings,
    canAccessAdrianoCommissions,
  } = useRole();

  const desktopPadding = !user ? 'md:pl-0' : isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64';

  const isRouteBlocked = React.useMemo(() => {
    if (!user || isLoading || isAdmin || !pathname) return false;

    if (pathname.startsWith('/products')) return !canAccessProducts;
    if (pathname.startsWith('/tabela-split')) return !canAccessSplitTable;
    if (pathname.startsWith('/clientes-fidelidade') || pathname.startsWith('/fidelidade')) return !canAccessLoyalty;
    if (pathname.startsWith('/tasks')) return !canAccessTasks;
    if (pathname.startsWith('/demands')) return !canAccessDemands;
    if (pathname.startsWith('/routes')) return !canAccessRoutes;
    if (pathname.startsWith('/whatsapp') || pathname.startsWith('/chat')) return !canAccessWhatsapp;
    if (pathname.startsWith('/leads')) return !canAccessLeads;
    if (pathname.startsWith('/social-media')) return !canAccessSocialMedia;
    if (pathname.startsWith('/deliveries') || pathname.startsWith('/shipping-calculator')) return !canAccessDeliveries;
    if (pathname.startsWith('/reports/truck-history')) return !canAccessTruckHistory;
    if (pathname.startsWith('/transfers')) return !canAccessTransfers;
    if (pathname.startsWith('/warranties/assistances')) return !canAccessAssistances;
    if (pathname.startsWith('/warranties')) return !canAccessWarranties;
    if (pathname.startsWith('/price-research') || pathname.startsWith('/mercado-livre')) return !canAccessPriceResearch;
    if (pathname.startsWith('/sales')) return !canAccessSales;
    if (pathname === '/reports' || (pathname.startsWith('/reports/') && !pathname.startsWith('/reports/truck-history'))) {
      return !canAccessReports;
    }
    if (pathname.startsWith('/painel-ao-vivo') || pathname.startsWith('/admin/dashboard')) return !canAccessLivePanel;
    if (pathname.startsWith('/collaborators')) {
      // Permite que o próprio colaborador visualize seu perfil individual (/collaborators/[ownId])
      if (user?.id && pathname === `/collaborators/${user.id}`) {
        return false;
      }
      return !canAccessCollaborators;
    }
    if (pathname.startsWith('/admin/commissions')) return !canAccessCommissions;
    if (pathname.startsWith('/admin/settings')) return !canAccessSettings;
    if (pathname.startsWith('/admin/comissoes-adriano')) return !canAccessAdrianoCommissions;

    return false;
  }, [
    user,
    isLoading,
    isAdmin,
    pathname,
    canAccessProducts,
    canAccessSplitTable,
    canAccessLoyalty,
    canAccessTasks,
    canAccessDemands,
    canAccessRoutes,
    canAccessWhatsapp,
    canAccessLeads,
    canAccessSocialMedia,
    canAccessDeliveries,
    canAccessTruckHistory,
    canAccessTransfers,
    canAccessWarranties,
    canAccessAssistances,
    canAccessPriceResearch,
    canAccessSales,
    canAccessReports,
    canAccessLivePanel,
    canAccessCollaborators,
    canAccessCommissions,
    canAccessSettings,
    canAccessAdrianoCommissions,
  ]);

  return (
    <div
      className={`${desktopPadding} min-h-screen flex flex-col pb-24 md:pb-0 transition-all duration-300 ease-in-out w-full min-w-0`}
    >
      {isRouteBlocked ? (
        <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-md w-full p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
              <ShieldAlert size={28} />
            </div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-black uppercase tracking-wider">
                <Lock size={11} />
                <span>Módulo Desabilitado para seu Usuário</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Acesso Restrito a este Módulo
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Seu perfil não possui permissão ativa para acessar esta funcionalidade. Caso precise de liberação, solicite ao Administrador na gestão de colaboradores.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all"
              >
                <ArrowLeft size={15} />
                <span>Voltar para a Página Inicial</span>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

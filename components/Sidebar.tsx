'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  ClipboardList, 
  ListTodo,
  Users, 
  Target, 
  Truck, Calculator, 
  ArrowRightLeft, 
  ShieldCheck, 
  Settings, 
  LogOut, 
  BarChart3, 
  MessageCircle, 
  TrendingUp, 
  Share2,
  Sun,
  Moon,
  Zap,
  Radio,
  Tag, Store,
  Package,
  DollarSign,
  Wrench,
  ShoppingBag,
  Globe,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
  Wind,
  Award
} from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { useTheme } from '@/hooks/useTheme';
import { useUI } from '@/hooks/useUI';
import { useDataPrefetch } from '@/hooks/useDataPrefetch';
import { supabase } from '@/lib/supabase';

export function Sidebar() {
  const pathname = usePathname();
  const { prefetchRoute } = useDataPrefetch();
  const [appName, setAppName] = React.useState('AgenteX');

  React.useEffect(() => {
    async function loadAppName() {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'app_short_name')
          .single();
        if (data?.value) {
          const val = typeof data.value === 'string' ? data.value : JSON.stringify(data.value).replace(/^"|"$/g, '');
          if (val) setAppName(val);
        }
      } catch (e) {}
    }
    loadAppName();
  }, []);
  const { 
    role, 
    isAdmin, 
    isAdriano,
    user, 
    canAccessLeads, 
    canAccessDeliveries, 
    canAccessTransfers, 
    canAccessWarranties, 
    canAccessReports, 
    canAccessWhatsapp, 
    canAccessSales, 
    canAccessSocialMedia, 
    logout 
  } = useRole();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { showSettingsModal, isSidebarCollapsed, toggleSidebar } = useUI();

  const handleLogout = () => {
    setIsLoggingOut(true);
    logout();
  };

  if (!user) return null;

  // Grouped Navigation structure for modern scannability
  const sections = [
    {
      title: 'Principal',
      items: [
        { href: '/', icon: Home, label: 'Início', active: pathname === '/' },
        { href: '/products', icon: Package, label: 'Catálogo de Peças', active: pathname?.startsWith('/products') },
        { href: '/tabela-split', icon: Wind, label: 'Tabela de Split', active: pathname?.startsWith('/tabela-split') },
        { href: '/clientes-fidelidade', icon: Award, label: 'Clientes Fidelidade', active: pathname?.startsWith('/clientes-fidelidade') || pathname?.startsWith('/fidelidade') },
        { href: '/tasks', icon: ClipboardList, label: 'Tarefas', active: pathname?.startsWith('/tasks') },
        { href: '/demands', icon: ListTodo, label: 'Demandas', active: pathname?.startsWith('/demands') },
        { href: '/routes', icon: Truck, label: 'Rotas & GPS', active: pathname?.startsWith('/routes') },
      ]
    },
    {
      title: 'Comunicação & CRM',
      items: [
        ...(canAccessWhatsapp ? [{ href: '/whatsapp', icon: MessageCircle, label: 'WhatsApp', active: pathname?.startsWith('/whatsapp') }] : []),
        ...(canAccessLeads ? [{ href: '/leads', icon: Target, label: 'Leads', active: pathname?.startsWith('/leads') }] : []),
        ...(canAccessSocialMedia ? [{ href: '/social-media', icon: ShoppingBag, label: 'Site', active: pathname?.startsWith('/social-media') || pathname?.startsWith('/mercado-livre') }] : []),
      ]
    },
    {
      title: 'Operações',
      items: [
        ...(canAccessDeliveries ? [{ href: '/deliveries', icon: Truck, label: 'Entregas', active: pathname?.startsWith('/deliveries') }] : []),
        { href: '/shipping-calculator', icon: Calculator, label: 'Cálculo de Frete', active: pathname?.startsWith('/shipping-calculator') },
        { href: '/reports/truck-history', icon: Truck, label: 'Caminhão Reposição', active: pathname?.startsWith('/reports/truck-history') },
        ...(canAccessTransfers ? [{ href: '/transfers', icon: ArrowRightLeft, label: 'Transferências', active: pathname?.startsWith('/transfers') }] : []),
        ...(canAccessWarranties ? [
          { href: '/warranties', icon: ShieldCheck, label: 'Garantias', active: pathname?.startsWith('/warranties') && !pathname?.startsWith('/warranties/assistances') },
          { href: '/warranties/assistances', icon: Wrench, label: 'Assistência Técnica', active: pathname?.startsWith('/warranties/assistances') }
        ] : []),
        { href: '/price-research', icon: Tag, label: 'Pesquisa Concorrentes', active: pathname?.startsWith('/price-research') },
        { href: '/mercado-livre', icon: Store, label: 'Pesquisa Mercado Livre', active: pathname?.startsWith('/mercado-livre') },
      ]
    },
    {
      title: 'Resultados',
      items: [
        ...(canAccessSales ? [{ href: '/sales-results', icon: TrendingUp, label: 'Vendas', active: pathname?.startsWith('/sales') }] : []),
        ...(canAccessReports ? [{ href: '/reports', icon: BarChart3, label: 'Relatórios', active: pathname?.startsWith('/reports') }] : []),
      ]
    },
    {
      title: 'Administração',
      items: [
        ...(isAdmin || role === 'gerente' || role === 'supervisor' ? [
          { href: '/painel-ao-vivo', icon: Radio, label: 'Painel Ao Vivo (GPS)', active: pathname?.startsWith('/painel-ao-vivo') || pathname?.startsWith('/admin/dashboard') },
        ] : []),
        ...(isAdmin ? [
          { href: '/collaborators', icon: Users, label: 'Equipe', active: pathname?.startsWith('/collaborators') },
          { href: '/admin/commissions', icon: DollarSign, label: 'Comissionados', active: pathname?.startsWith('/admin/commissions') },
          { href: '/admin/settings', icon: Settings, label: 'Configurações', active: pathname?.startsWith('/admin/settings') },
        ] : []),
        ...(isAdriano ? [
          { href: '/admin/comissoes-adriano', icon: TrendingUp, label: 'Comissões Adriano', active: pathname?.startsWith('/admin/comissoes-adriano') },
        ] : []),
      ]
    }
  ].filter(section => section.items.length > 0);

  return (
    <aside
      className={`hidden md:flex flex-col ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      } h-screen fixed left-0 top-0 border-r border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-all duration-300 ease-in-out z-40`}
    >
      {/* Floating Edge Toggle Button */}
      <button
        type="button"
        onClick={toggleSidebar}
        title={isSidebarCollapsed ? 'Expandir menu lateral' : 'Minimizar menu lateral'}
        aria-label={isSidebarCollapsed ? 'Expandir menu lateral' : 'Minimizar menu lateral'}
        className="absolute -right-3 top-5 z-50 flex items-center justify-center w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm hover:bg-blue-600 hover:text-white hover:border-blue-600 dark:hover:bg-blue-600 dark:hover:text-white transition-all cursor-pointer"
      >
        {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Brand Header */}
      <div
        className={`h-16 ${
          isSidebarCollapsed ? 'px-2 justify-center' : 'px-4 justify-between'
        } flex items-center border-b border-slate-200/80 dark:border-slate-800 transition-all`}
      >
        <Link
          href="/"
          title={appName}
          className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2.5 min-w-0'} group`}
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-500 transition-colors shrink-0">
            <Zap size={17} className="fill-white" />
          </div>
          {!isSidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white leading-none truncate">
                {appName}
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight truncate">
                Gestão Inteligente
              </span>
            </div>
          )}
        </Link>

        {!isSidebarCollapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            title="Minimizar menu lateral"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <PanelLeftClose size={17} />
          </button>
        )}
      </div>

      {/* Quick Expand Bar when Collapsed */}
      {isSidebarCollapsed && (
        <div className="px-2 pt-2 flex justify-center">
          <button
            type="button"
            onClick={toggleSidebar}
            title="Expandir menu lateral"
            className="w-full py-1.5 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50/70 dark:hover:text-blue-400 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
          >
            <PanelLeftOpen size={17} />
          </button>
        </div>
      )}

      {/* Nav Content */}
      <div className={`flex-1 overflow-y-auto ${isSidebarCollapsed ? 'px-2 py-3 space-y-3' : 'px-3 py-4 space-y-5'} custom-scrollbar`}>
        {sections.map((section, secIdx) => (
          <div key={section.title} className="space-y-1">
            {!isSidebarCollapsed ? (
              <p className="px-3 text-[10px] font-semibold text-slate-400 dark:text-slate-400 tracking-wider uppercase truncate">
                {section.title}
              </p>
            ) : (
              secIdx > 0 && <div className="mx-2 my-1.5 border-t border-slate-100 dark:border-slate-800/80" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isSidebarCollapsed ? `${item.label} (${section.title})` : item.label}
                    onMouseEnter={() => prefetchRoute(item.href)}
                    onTouchStart={() => prefetchRoute(item.href)}
                    className={`flex items-center ${
                      isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2'
                    } rounded-lg text-xs font-medium transition-colors ${
                      item.active
                        ? 'bg-blue-50 text-blue-600 font-semibold dark:bg-blue-950/50 dark:text-blue-400'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon 
                      size={18} 
                      className={`shrink-0 ${
                        item.active 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-600'
                      }`} 
                    />
                    {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User & Settings Footer */}
      <div className="p-2.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
        {!isSidebarCollapsed ? (
          <div className="p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-600/20">
                {user.name ? user.name.substring(0, 2).toUpperCase() : 'US'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {user.name}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate capitalize">
                  {role}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <button
                onClick={() => toggleDarkMode(!isDarkMode)}
                title={isDarkMode ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              <Link
                href="/admin/settings"
                title="Configurações do Sistema"
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Settings size={15} />
              </Link>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                title="Sair da Conta"
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
              >
                <LogOut size={13} />
                <span>{isLoggingOut ? 'Saindo...' : 'Sair'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <div
              title={`${user.name || 'Usuário'} (${role || 'Colaborador'})`}
              className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-600/20"
            >
              {user.name ? user.name.substring(0, 2).toUpperCase() : 'US'}
            </div>

            <button
              onClick={() => toggleDarkMode(!isDarkMode)}
              title={isDarkMode ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <Link
              href="/admin/settings"
              title="Configurações do Sistema"
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Settings size={15} />
            </Link>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Sair da Conta"
              className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;

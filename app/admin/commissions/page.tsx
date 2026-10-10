'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, DollarSign, Settings } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useRole } from '@/hooks/useRole';
import CommissionsManager from '@/components/admin/CommissionsManager';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';

export default function AdminCommissionsPage() {
  const { isDarkMode } = useTheme();
  const { isAdmin, user, isLoading } = useRole();

  return (
    <div className={`min-h-screen flex ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar />

      <main className="flex-1 md:pl-64 flex flex-col min-h-screen pb-24 md:pb-12">
        {/* Header Bar */}
        <header className={`h-16 px-4 md:px-8 border-b flex items-center justify-between sticky top-0 z-30 backdrop-blur-md transition-colors ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200/80'
        }`}>
          <div className="flex items-center gap-3">
            <Link 
              href="/admin/settings"
              className={`p-2 rounded-xl border transition-colors ${
                isDarkMode ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
              title="Voltar para Configurações"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <DollarSign size={18} />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight">Comissionados</h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Administração &bull; Planilha de Controle de Comissões</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/settings"
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Settings size={14} />
              Configurações Gerais
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          <CommissionsManager isDarkMode={isDarkMode} />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

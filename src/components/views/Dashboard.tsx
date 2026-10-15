'use client';

import React, { useState } from 'react';
import { Pin, LayoutGrid } from 'lucide-react';
import { ReplenishmentTruckCard } from '@/components/dashboard/ReplenishmentTruckCard';

export default function Dashboard() {
  const [dashboardMode, setDashboardMode] = useState<'permanent_notes' | 'full'>('permanent_notes');
  const isDarkMode = false;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-8 py-4 space-y-4 pb-6">
        {/* Banner / Card do Caminhão de Reposição */}
        <ReplenishmentTruckCard isDarkMode={isDarkMode} />

        {/* Dashboard View Switcher */}
        <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-slate-200/60 dark:bg-slate-900 border border-slate-300/60 dark:border-slate-800">
          <button
            onClick={() => setDashboardMode('permanent_notes')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              dashboardMode === 'permanent_notes'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Pin size={15} className="rotate-12" />
            <span>📌 Bloquinhos de Anotações (Tarefas Permanentes)</span>
          </button>
          <button
            onClick={() => setDashboardMode('full')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              dashboardMode === 'full'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <LayoutGrid size={15} />
            <span>📊 Painel Geral de Métricas</span>
          </button>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-lg font-bold">Painel Operacional AgenteX</h2>
          <p className="text-xs text-slate-500">
            Acompanhamento de tarefas, entregas, comissionados e caminhão de reposição.
          </p>
        </div>
      </main>
    </div>
  );
}

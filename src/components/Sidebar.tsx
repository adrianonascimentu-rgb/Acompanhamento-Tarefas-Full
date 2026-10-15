'use client';

import React from 'react';
import Link from 'next/link';

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-40 p-4">
      <div className="font-bold text-lg mb-6 text-blue-600 dark:text-blue-400">AgenteX</div>
      <nav className="space-y-2 text-xs font-semibold">
        <Link href="/" className="block p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800">Início</Link>
        <Link href="/tasks" className="block p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800">Tarefas</Link>
        <Link href="/deliveries" className="block p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800">Entregas</Link>
        <Link href="/reports/truck-history" className="block p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800">Caminhão Reposição</Link>
        <Link href="/admin/commissions" className="block p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800">Comissionados</Link>
      </nav>
    </aside>
  );
}

export default Sidebar;

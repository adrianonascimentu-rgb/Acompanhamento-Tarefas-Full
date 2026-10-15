'use client';

import React from 'react';
import Link from 'next/link';

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around z-50 md:hidden text-xs">
      <Link href="/" className="font-bold text-blue-600">Início</Link>
      <Link href="/tasks">Tarefas</Link>
      <Link href="/deliveries">Entregas</Link>
      <Link href="/reports/truck-history">Caminhão</Link>
    </nav>
  );
}

export default BottomNav;

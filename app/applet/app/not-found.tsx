'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-6xl font-bold text-amber-500">404</h1>
        <h2 className="text-2xl font-semibold">Página Não Encontrada</h2>
        <p className="text-slate-400">
          A página que você está procurando não existe ou foi movida.
        </p>
        <Link 
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-slate-950 hover:bg-amber-400 font-semibold rounded-xl transition-all shadow-lg"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar ao Início
        </Link>
      </div>
    </div>
  );
}

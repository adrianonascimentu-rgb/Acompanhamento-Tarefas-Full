'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Caso seja erro de carregamento de chunk (ChunkLoadError após nova compilação), recarrega a página uma vez
    if (error?.message && (
      error.message.includes('ChunkLoadError') || 
      error.message.includes('Loading chunk') ||
      error.name === 'ChunkLoadError'
    )) {
      const hasReloaded = sessionStorage.getItem('chunk_load_reloaded');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_load_reloaded', '1');
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="bg-slate-900 text-white min-h-screen flex items-center justify-center">
        <div className="p-8 max-w-md w-full bg-slate-800 rounded-3xl border border-slate-700 text-center shadow-xl">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center text-xl font-black">
            !
          </div>
          <h2 className="text-xl font-bold mb-2 text-white">Ops, algo inesperado ocorreu</h2>
          <p className="text-xs text-slate-400 mb-6">
            A aplicação foi atualizada. Clique abaixo para recarregar com as novas versões.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                sessionStorage.removeItem('chunk_load_reloaded');
                window.location.reload();
              }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              Recarregar Página
            </button>
            <button
              onClick={() => reset()}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

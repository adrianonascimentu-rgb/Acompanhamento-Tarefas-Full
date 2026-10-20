import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-slate-900 text-white">
      <h2 className="text-2xl font-bold mb-2">404 - Página Não Encontrada</h2>
      <p className="text-sm text-slate-400 mb-4">A página solicitada não foi encontrada.</p>
      <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">
        Voltar ao Início
      </Link>
    </div>
  );
}

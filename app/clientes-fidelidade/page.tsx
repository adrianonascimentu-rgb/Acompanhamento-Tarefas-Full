'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Award,
  Search,
  Filter,
  Download,
  Upload,
  FileText,
  Copy,
  Check,
  MessageSquare,
  Gift,
  Clock,
  Sparkles,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  User,
  History,
  X,
  RefreshCw,
  Phone,
  FileSpreadsheet,
  CheckCircle2,
  DollarSign,
  ArrowUpDown,
  ShoppingBag,
  Info,
  Settings2,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useRole } from '@/hooks/useRole';
import { useUI } from '@/hooks/useUI';
import {
  LoyaltyClient,
  LoyaltyTransaction,
  LOYALTY_CONFIG,
  getStoredLoyaltyClients,
  saveLoyaltyClients,
  calculateLoyaltyStats,
  pointsToBRL,
  formatBRL,
  generateWhatsAppBonusMessage,
} from '@/lib/loyaltyData';

export default function ClientesFidelidadePage() {
  const { isDarkMode } = useTheme();
  const { user, isAdmin, isGerente, isSupervisor } = useRole();
  const { showToast } = useUI();

  // State
  const [clients, setClients] = useState<LoyaltyClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<
    'todos' | 'com_bonus' | 'a_vencer' | 'top_vip' | 'com_resgates'
  >('com_bonus');
  const [sortBy, setSortBy] = useState<'saldo_desc' | 'saldo_asc' | 'nome_asc' | 'validade_asc'>('saldo_desc');
  const [minPointsFilter, setMinPointsFilter] = useState<number | 'all'>('all');

  // Selected client for Extrato Modal
  const [selectedClient, setSelectedClient] = useState<LoyaltyClient | null>(null);
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null);

  // Rules Modal state
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  // Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load clients
  useEffect(() => {
    try {
      const data = getStoredLoyaltyClients();
      setClients(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Stats calculation
  const stats = useMemo(() => calculateLoyaltyStats(clients), [clients]);

  // Filtered & sorted clients
  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return clients
      .filter((client) => {
        // Tab filtering
        if (activeTab === 'com_bonus' && client.saldoPontos <= 0) return false;
        if (activeTab === 'a_vencer' && (!client.proximoVencimento || client.saldoPontos <= 0)) return false;
        if (activeTab === 'top_vip' && client.saldoPontos < 50) return false;
        if (activeTab === 'com_resgates' && client.pontosConvertidosTotal <= 0) return false;

        // Min points dropdown filter
        if (minPointsFilter !== 'all') {
          if (client.saldoPontos < minPointsFilter) return false;
        }

        // Search query
        if (query) {
          const haystack = `${client.codigo} ${client.nome} ${client.saldoPontos} ${client.proximoVencimento || ''}`.toLowerCase();
          return haystack.includes(query);
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'saldo_desc') return b.saldoPontos - a.saldoPontos;
        if (sortBy === 'saldo_asc') return a.saldoPontos - b.saldoPontos;
        if (sortBy === 'nome_asc') return a.nome.localeCompare(b.nome);
        if (sortBy === 'validade_asc') {
          if (!a.proximoVencimento) return 1;
          if (!b.proximoVencimento) return -1;
          const [d1, m1, y1] = a.proximoVencimento.split('/').map(Number);
          const [d2, m2, y2] = b.proximoVencimento.split('/').map(Number);
          return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
        }
        return 0;
      });
  }, [clients, activeTab, minPointsFilter, searchQuery, sortBy]);

  // Copy WhatsApp bonus message
  const handleCopyWhatsApp = (client: LoyaltyClient) => {
    const message = generateWhatsAppBonusMessage(client);
    navigator.clipboard.writeText(message);
    setCopiedClientId(client.id);
    showToast({
      title: 'Mensagem Copiada!',
      message: `Texto de bônus (${formatBRL(pointsToBRL(client.saldoPontos))}) copiado para envio no WhatsApp a ${client.nome.split(' ')[0]}.`,
      type: 'success',
    });
    setTimeout(() => {
      setCopiedClientId((prev) => (prev === client.id ? null : prev));
    }, 2500);
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/loyalty/import', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Erro ao processar o arquivo.');
      }

      setClients(json.clients);
      saveLoyaltyClients(json.clients);
      setIsImportModalOpen(false);
      showToast({
        title: 'Importação Concluída com Sucesso!',
        message: `${json.count} clientes e seus extratos de fidelidade foram atualizados.`,
        type: 'success',
      });
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Falha ao importar o arquivo.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className={`min-h-screen w-full transition-colors duration-200 ${
        isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Header */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors ${
          isDarkMode
            ? 'bg-slate-900/90 border-slate-800'
            : 'bg-white/90 border-slate-200'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Breadcrumb & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs shrink-0 font-black">
              <Award size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <Link href="/" className="hover:text-amber-500 transition-colors">
                  Início
                </Link>
                <ChevronRight size={12} />
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  Clientes Fidelidade & Bônus
                </span>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  Programa Fidelidade — Bônus para Compras & Vencimentos
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 tabular-nums">
                  {filteredClients.length} {filteredClients.length === 1 ? 'cliente' : 'clientes'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Rules / Import / Download Original PDF */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsRulesModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                  : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
              }`}
              title="Ver regras oficiais de cálculo de pontos e créditos"
            >
              <Settings2 size={14} className="shrink-0 text-amber-500" />
              <span>Regras de Pontos (4 pts = R$ 1,00)</span>
            </button>

            <a
              href="/assets/aistudio/PDF_Exportacao_381f1e5e.pdf"
              download="PDF_Exportacao_Fidelidade.pdf"
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Baixar PDF original de exportação"
            >
              <Download size={14} className="shrink-0 text-amber-500" />
              <span className="hidden sm:inline">Baixar PDF Original</span>
            </a>

            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Upload size={14} className="shrink-0 stroke-[2.5]" />
              <span>Importar / Atualizar Fidelidade</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Official Loyalty Rules Summary Bar */}
        <section
          className={`p-3.5 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
            isDarkMode
              ? 'bg-slate-900/90 border-amber-500/20'
              : 'bg-amber-50/60 border-amber-200/80'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Info size={16} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white">
                Configurações Oficiais de Fidelidade (Cálculo de Créditos)
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Cada <strong className="text-emerald-600 dark:text-emerald-400">4,00 pontos</strong> equivalem a{' '}
                <strong className="text-emerald-600 dark:text-emerald-400">R$ 1,00 em créditos</strong> para compras (1 ponto = R$ 0,25).
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 text-[11px] font-bold">
            <span
              className={`px-2.5 py-1 rounded-lg border tabular-nums ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              Produtos: <strong className="text-amber-600 dark:text-amber-400">R$ 10,00 = 1 pt</strong>
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg border tabular-nums ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              Serviços: <strong className="text-slate-500">R$ 0,00 (Não pontua)</strong>
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg border tabular-nums ${
                isDarkMode
                  ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              Resgate: <strong>4,00 pts = R$ 1,00</strong>
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg border tabular-nums ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              Liberação: <strong>{LOYALTY_CONFIG.diasParaCreditar} dias</strong>
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg border tabular-nums ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              Validade: <strong>{LOYALTY_CONFIG.validadeMeses} meses</strong>
            </span>
          </div>
        </section>

        {/* Metric Cards Row */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Card 1: Total de Clientes */}
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border shadow-xs ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Clientes Cadastrados</span>
              <User size={15} />
            </div>
            <p className="text-xl sm:text-2xl font-black tabular-nums text-slate-900 dark:text-white">
              {stats.totalClients}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Base do relatório de fidelidade
            </p>
          </div>

          {/* Card 2: Clientes com Bônus Ativo */}
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border shadow-xs ${
              isDarkMode
                ? 'bg-emerald-950/20 border-emerald-800/40'
                : 'bg-emerald-50/70 border-emerald-200/80'
            }`}
          >
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Com Bônus Ativo</span>
              <Gift size={15} />
            </div>
            <p className="text-xl sm:text-2xl font-black tabular-nums text-emerald-700 dark:text-emerald-400">
              {stats.clientsWithBalance}
            </p>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
              Saldo disponível para compras
            </p>
          </div>

          {/* Card 3: Total em Bônus (R$) */}
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border shadow-xs ${
              isDarkMode
                ? 'bg-amber-950/20 border-amber-800/40'
                : 'bg-amber-50/70 border-amber-200/80'
            }`}
          >
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total em Bônus Ativo</span>
              <DollarSign size={15} />
            </div>
            <p className="text-xl sm:text-2xl font-black tabular-nums text-amber-700 dark:text-amber-400">
              {stats.totalPointsActive.toLocaleString('pt-BR')} pts
            </p>
            <p className="text-[10px] font-semibold text-amber-600/90 dark:text-amber-400/90 mt-0.5">
              {formatBRL(stats.totalBonusBRL)} em créditos (4 pts = R$ 1,00)
            </p>
          </div>

          {/* Card 4: Clientes com Pontos a Vencer */}
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border shadow-xs ${
              isDarkMode
                ? 'bg-rose-950/20 border-rose-800/40'
                : 'bg-rose-50/70 border-rose-200/80'
            }`}
          >
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pontos a Vencer</span>
              <Clock size={15} />
            </div>
            <p className="text-xl sm:text-2xl font-black tabular-nums text-rose-700 dark:text-rose-400">
              {stats.clientsWithExpiringPoints}
            </p>
            <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
              Oportunidade para contato de vendas
            </p>
          </div>

          {/* Card 5: Pontos Convertidos em Compras */}
          <div
            className={`col-span-2 lg:col-span-1 p-3.5 sm:p-4 rounded-2xl border shadow-xs ${
              isDarkMode
                ? 'bg-blue-950/20 border-blue-800/40'
                : 'bg-blue-50/70 border-blue-200/80'
            }`}
          >
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Créditos Resgatados</span>
              <History size={15} />
            </div>
            <p className="text-xl sm:text-2xl font-black tabular-nums text-blue-700 dark:text-blue-400">
              {stats.totalPointsConverted.toLocaleString('pt-BR')} pts
            </p>
            <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">
              {formatBRL(stats.totalConvertedBRL)} convertidos em compras
            </p>
          </div>
        </section>

        {/* Filter & Search Bar */}
        <section
          className={`p-4 rounded-2xl border shadow-xs space-y-3.5 ${
            isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          {/* Row 1: Segment Tabs */}
          <div className="flex items-center flex-wrap gap-1.5 pb-1">
            <button
              type="button"
              onClick={() => setActiveTab('com_bonus')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'com_bonus'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Gift size={14} />
              <span>Com Bônus para Compras ({stats.clientsWithBalance})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('a_vencer')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'a_vencer'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Clock size={14} />
              <span>Pontos a Vencer ({stats.clientsWithExpiringPoints})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('top_vip')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'top_vip'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : isDarkMode
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Award size={14} />
              <span>Top Clientes VIP (+50 pts)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('com_resgates')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'com_resgates'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <History size={14} />
              <span>Já Resgataram Créditos</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'todos'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : isDarkMode
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Todos ({stats.totalClients})</span>
            </button>
          </div>

          {/* Row 2: Search Input + Minimum Points + Sorting */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome do cliente ou código (ex: Adriano, 3778, 308721)..."
                className={`w-full pl-10 pr-9 py-2 rounded-xl border text-xs font-medium outline-none transition-all ${
                  isDarkMode
                    ? 'bg-slate-800/90 border-slate-700 text-white placeholder:text-slate-400 focus:border-amber-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-amber-600 focus:bg-white'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filters & Sorting */}
            <div className="flex items-center flex-wrap gap-2.5">
              {/* Min Points Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Faixa:
                </span>
                <select
                  value={minPointsFilter}
                  onChange={(e) =>
                    setMinPointsFilter(
                      e.target.value === 'all' ? 'all' : Number(e.target.value)
                    )
                  }
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-200'
                      : 'bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="all">Todos os Saldos</option>
                  <option value="10">A partir de 10 pts (R$ 2,50)</option>
                  <option value="25">A partir de 25 pts (R$ 6,25)</option>
                  <option value="50">A partir de 50 pts (R$ 12,50)</option>
                  <option value="100">A partir de 100 pts (R$ 25,00)</option>
                </select>
              </div>

              {/* Order By */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Ordenar:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-200'
                      : 'bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="saldo_desc">Maior Saldo de Bônus</option>
                  <option value="saldo_asc">Menor Saldo</option>
                  <option value="validade_asc">Validade Mais Próxima</option>
                  <option value="nome_asc">Nome do Cliente (A-Z)</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Main Clients Table */}
        <section
          className={`rounded-2xl border shadow-xs overflow-hidden ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          {filteredClients.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <Award size={24} />
              </div>
              <h3 className="text-base font-bold">Nenhum cliente fidelidade encontrado</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Verifique se digitou o nome ou código corretamente ou altere a aba de filtros.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab('com_bonus');
                  setMinPointsFilter('all');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors cursor-pointer"
              >
                Limpar Busca e Filtros
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr
                    className={`border-b border-slate-200 dark:border-slate-800 ${
                      isDarkMode
                        ? 'bg-slate-800/90 text-slate-300'
                        : 'bg-slate-100/90 text-slate-700'
                    }`}
                  >
                    <th className="py-3 px-4 font-black uppercase tracking-wider">Código</th>
                    <th className="py-3 px-4 font-black uppercase tracking-wider min-w-[220px]">
                      Cliente
                    </th>
                    <th className="py-3 px-3 text-right font-black uppercase tracking-wider">
                      Saldo em Pontos
                    </th>
                    <th className="py-3 px-3 text-right font-black uppercase tracking-wider">
                      Bônus Compras (R$)
                      <span className="block text-[9px] font-semibold text-slate-400 normal-case">
                        4 pts = R$ 1,00
                      </span>
                    </th>
                    <th className="py-3 px-3 text-center font-black uppercase tracking-wider">
                      Próxima Validade
                    </th>
                    <th className="py-3 px-3 text-right font-black uppercase tracking-wider">
                      Já Resgatou
                    </th>
                    <th className="py-3 px-4 text-center font-black uppercase tracking-wider min-w-[190px]">
                      Ações Comerciais
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredClients.map((client, idx) => {
                    const isPositive = client.saldoPontos > 0;
                    const bonusReais = formatBRL(pointsToBRL(client.saldoPontos));
                    const isCopied = copiedClientId === client.id;
                    const whatsappHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(
                      generateWhatsAppBonusMessage(client)
                    )}`;
                    const zebraBg =
                      idx % 2 === 0
                        ? isDarkMode
                          ? 'bg-slate-900'
                          : 'bg-white'
                        : isDarkMode
                        ? 'bg-slate-900/60'
                        : 'bg-slate-50/70';

                    return (
                      <tr
                        key={client.id}
                        className={`${zebraBg} hover:bg-amber-500/5 transition-colors`}
                      >
                        {/* Código */}
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-500 dark:text-slate-400">
                          {client.codigo}
                        </td>

                        {/* Nome do Cliente */}
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-xs">{client.nome}</span>
                            {client.saldoPontos >= 50 && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 shrink-0">
                                VIP
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Saldo em Pontos */}
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-lg font-black text-xs ${
                              isPositive
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'text-slate-400 bg-slate-100 dark:bg-slate-800'
                            }`}
                          >
                            {client.saldoPontos.toLocaleString('pt-BR')} pts
                          </span>
                        </td>

                        {/* Bônus para Compras em R$ */}
                        <td className="py-2.5 px-3 text-right font-black tabular-nums text-emerald-600 dark:text-emerald-400 text-xs">
                          {isPositive ? bonusReais : 'R$ 0,00'}
                        </td>

                        {/* Próxima Validade / Alerta de Vencimento */}
                        <td className="py-2.5 px-3 text-center">
                          {client.proximoVencimento ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-[11px] tabular-nums">
                              <Clock size={12} className="shrink-0" />
                              <span>{client.proximoVencimento}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Total Já Resgatado */}
                        <td className="py-2.5 px-3 text-right tabular-nums text-slate-500 dark:text-slate-400 font-medium">
                          {client.pontosConvertidosTotal > 0 ? (
                            <div>
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                {client.pontosConvertidosTotal} pts
                              </span>
                              <span className="block text-[10px] text-slate-400">
                                ({formatBRL(pointsToBRL(client.pontosConvertidosTotal))})
                              </span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Ações Comerciais do Vendedor */}
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Extrato Completo */}
                            <button
                              type="button"
                              onClick={() => setSelectedClient(client)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                isDarkMode
                                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                              title="Ver extrato completo de compras, saídas e validade"
                            >
                              <FileText size={13} className="text-sky-500" />
                              <span>Extrato</span>
                            </button>

                            {/* Copiar WhatsApp */}
                            <button
                              type="button"
                              onClick={() => handleCopyWhatsApp(client)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                isCopied
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : isDarkMode
                                  ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-emerald-600 hover:text-white'
                                  : 'bg-white border-slate-200 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                              }`}
                              title="Copiar mensagem personalizada com saldo e pontos a vencer para o WhatsApp"
                            >
                              {isCopied ? <Check size={13} /> : <Copy size={13} />}
                              <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                            </button>

                            {/* Disparar WhatsApp Web */}
                            <a
                              href={whatsappHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors cursor-pointer inline-flex items-center justify-center"
                              title="Abrir no WhatsApp"
                            >
                              <MessageSquare size={14} />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Modal 1: Extrato Completo do Cliente */}
      {selectedClient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs"
          onClick={() => setSelectedClient(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-black/20 text-white">
                    Código: {selectedClient.codigo}
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white text-slate-950">
                    Fidelidade
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black mt-1 leading-snug">
                  {selectedClient.nome}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="p-2 rounded-full bg-black/10 hover:bg-black/20 text-slate-950 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Balance & Highlights Bar */}
            <div
              className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 text-xs ${
                isDarkMode ? 'bg-slate-800/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Saldo Atual em Pontos
                  </span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {selectedClient.saldoPontos.toLocaleString('pt-BR')} pts
                  </span>
                </div>

                <div className="h-7 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Bônus para Compras (4 pts = R$ 1,00)
                  </span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatBRL(pointsToBRL(selectedClient.saldoPontos))}
                  </span>
                </div>

                <div className="h-7 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Próximo Vencimento
                  </span>
                  <span className="font-bold tabular-nums text-rose-600 dark:text-rose-400">
                    {selectedClient.proximoVencimento || 'Sem vencimentos próximos'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCopyWhatsApp(selectedClient)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-colors cursor-pointer"
              >
                <MessageSquare size={13} />
                <span>Copiar Mensagem WhatsApp</span>
              </button>
            </div>

            {/* Modal Table Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr
                      className={
                        isDarkMode
                          ? 'bg-slate-800 text-slate-300'
                          : 'bg-slate-100 text-slate-700'
                      }
                    >
                      <th className="py-2.5 px-3 font-bold">Data</th>
                      <th className="py-2.5 px-3 font-bold">Descrição</th>
                      <th className="py-2.5 px-3 text-right font-bold">Anterior</th>
                      <th className="py-2.5 px-3 text-right font-bold">Débito</th>
                      <th className="py-2.5 px-3 text-right font-bold">Crédito</th>
                      <th className="py-2.5 px-3 text-right font-bold">Saldo Final</th>
                      <th className="py-2.5 px-3 text-right font-bold">Equivalente (R$)</th>
                      <th className="py-2.5 px-3 text-center font-bold">Validade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {selectedClient.transacoes.map((tx, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-500/5 transition-colors ${
                          tx.validade ? 'bg-sky-500/5' : ''
                        }`}
                      >
                        <td className="py-2 px-3 tabular-nums font-medium text-slate-500 dark:text-slate-400">
                          {tx.data}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                          {tx.descricao}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-slate-500 dark:text-slate-400">
                          {tx.anterior}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-bold text-rose-600 dark:text-rose-400">
                          {tx.debito > 0 ? `-${tx.debito}` : '0'}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                          {tx.credito > 0 ? `+${tx.credito}` : '0'}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-black text-slate-900 dark:text-white">
                          {tx.saldoFinal} pts
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                          {tx.saldoFinal > 0 ? formatBRL(pointsToBRL(tx.saldoFinal)) : 'R$ 0,00'}
                        </td>
                        <td className="py-2 px-3 text-center tabular-nums font-bold text-slate-600 dark:text-slate-300">
                          {tx.validade ? (
                            <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400">
                              {tx.validade}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Regras Oficiais de Fidelidade */}
      {isRulesModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setIsRulesModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Settings2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black">Configurações de Fidelidade (ERP)</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Parâmetros oficiais para cálculo de pontos e conversão em créditos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRulesModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2.5 text-xs">
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="font-semibold">Valor em produtos para adquirir 1 ponto (R$)</span>
                  <span className="font-black text-sm tabular-nums text-amber-600 dark:text-amber-400">
                    R$ 10,00
                  </span>
                </div>

                <div
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="font-semibold">Valor em serviços para adquirir 1 ponto (R$)</span>
                  <span className="font-black text-sm tabular-nums text-slate-500">
                    R$ 0,00
                  </span>
                </div>

                <div
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    isDarkMode
                      ? 'bg-emerald-950/30 border-emerald-800/60'
                      : 'bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <div>
                    <span className="font-bold block text-emerald-700 dark:text-emerald-300">
                      Pontos necessários para obter R$ 1,00 em créditos
                    </span>
                    <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
                      Equivale a R$ 0,25 de desconto por cada 1 ponto acumulado
                    </span>
                  </div>
                  <span className="font-black text-base tabular-nums text-emerald-600 dark:text-emerald-400">
                    4,00 pts
                  </span>
                </div>

                <div
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="font-semibold">Tempo para creditar os pontos (em dias)</span>
                  <span className="font-black text-sm tabular-nums">2 dias</span>
                </div>

                <div
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="font-semibold">Tempo de validade dos pontos (em meses)</span>
                  <span className="font-black text-sm tabular-nums">12 meses</span>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <img
                  src="/assets/aistudio/image_911b2ed0.png"
                  alt="Configurações de Fidelidade no ERP"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Import / Update Loyalty File (PDF, Excel, CSV) */}
      {isImportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => !isUploading && setIsImportModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Upload size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black">Importar Arquivo de Fidelidade</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Atualize a lista de clientes, saldos e pontos a vencer
                  </p>
                </div>
              </div>

              {!isUploading && (
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="p-6 space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${
                  isDarkMode
                    ? 'border-slate-700 hover:border-amber-500 bg-slate-800/40 hover:bg-slate-800/70'
                    : 'border-slate-300 hover:border-amber-600 bg-slate-50 hover:bg-amber-50/40'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.xlsx,.xls,.csv"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
                  {isUploading ? (
                    <RefreshCw size={24} className="animate-spin" />
                  ) : (
                    <FileSpreadsheet size={24} />
                  )}
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {isUploading
                    ? 'Processando e analisando extratos...'
                    : 'Clique para selecionar o novo arquivo de exportação'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Formatos aceitos: PDF oficial do ERP, planilhas Excel (.xlsx, .xls) ou CSV.
                </p>
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div
                className={`p-3.5 rounded-xl border text-[11px] space-y-1 ${
                  isDarkMode
                    ? 'bg-slate-800/60 border-slate-700 text-slate-300'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <p className="font-bold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <Sparkles size={13} />
                  <span>Como funciona a atualização:</span>
                </p>
                <p>
                  Ao enviar o relatório exportado do sistema, os saldos finais, novos créditos de compras, pontos expirados e validades futuras são recalculados automaticamente usando a regra oficial (4 pontos = R$ 1,00 em créditos).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

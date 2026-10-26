'use client';

// Force chunk regeneration
import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  Legend
} from 'recharts';
import { 
  BarChart3, ArrowLeft, Search, User, Download, Share2, 
  MoreVertical, Shield, Users, Target, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Calendar, Filter, Activity, Settings, Plus, ChevronRight, DollarSign, Award, Zap, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRole } from '@/hooks/useRole';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { BottomNav } from '@/components/BottomNav';
import { LoginForm } from '@/components/auth/LoginForm';
import { GsapSalesProgressBar } from '@/components/dashboard/GsapSalesProgressBar';
import { exportSalesDashboardToPDF } from '@/lib/exportPdf';
import { NewCommissionModal } from '@/components/sales/NewCommissionModal';
import { DailySalesInputModal } from '@/components/sales/DailySalesInputModal';
import { SalesCycleDateSelector } from '@/components/sales/SalesCycleDateSelector';
import { SalesCycleGoalGapCard } from '@/components/sales/SalesCycleGoalGapCard';
import { SalesMilestonePushCard } from '@/components/sales/SalesMilestonePushCard';
import { CalendarPlus, CalendarCheck } from 'lucide-react';
import Link from 'next/link';
import {
  SalesCycleRange,
  getDefaultSalesCycleForDate,
  getSalesCycleForMonthYear,
  loadSavedSalesCycle,
  saveSalesCycleRange,
  saveSalesCycleToSupabase,
  formatDateBR,
  getCycleDaysProgress,
  getTodayLocalYYYYMMDD,
  isSalesResultFromCurrentCycle,
  isDateInSalesCycle,
} from '@/lib/salesCycle';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function SalesResultsPage() {
  const { isDarkMode } = useTheme();
  const { role, user, isAdmin, isGerente, isSupervisor, canAccessSales, isAuthenticated, login } = useRole();
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [leadsData, setLeadsData] = useState<any[]>([]);

  const initialCycle = getDefaultSalesCycleForDate();
  const [cycleRange, setCycleRange] = useState<SalesCycleRange>(initialCycle);
  const [selectedMonth, setSelectedMonth] = useState(initialCycle.refMonth);
  const [selectedYear, setSelectedYear] = useState(initialCycle.refYear);

  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [showDailySalesModal, setShowDailySalesModal] = useState(false);
  const [todayDailySales, setTodayDailySales] = useState<{ total: number; sellersCount: number } | null>(null);
  const [tableFilter, setTableFilter] = useState<'all' | 'me'>('all');

  const isManagerial = isAdmin || isGerente || isSupervisor || role === 'gerente' || role === 'supervisor' || role === 'admin';

  useEffect(() => {
    const saved = loadSavedSalesCycle();
    setCycleRange(saved);
    setSelectedMonth(saved.refMonth);
    setSelectedYear(saved.refYear);

    const handleCycleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<SalesCycleRange>;
      if (customEvent.detail?.startDate && customEvent.detail?.endDate) {
        setCycleRange(customEvent.detail);
        setSelectedMonth(customEvent.detail.refMonth);
        setSelectedYear(customEvent.detail.refYear);
      }
    };

    window.addEventListener('sales_cycle_updated', handleCycleEvent);
    return () => window.removeEventListener('sales_cycle_updated', handleCycleEvent);
  }, []);

  const handleMonthYearChange = async (newMonth: number, newYear: number) => {
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
    const stdCycle = getSalesCycleForMonthYear(
      newMonth,
      newYear,
      cycleRange.startDay || 26,
      cycleRange.endDay || 25,
      cycleRange.scope || (isManagerial ? 'company' : 'user')
    );
    const todayStr = getTodayLocalYYYYMMDD();
    const isHistorical = stdCycle.endDate < todayStr;
    const saved = saveSalesCycleRange(stdCycle.startDate, stdCycle.endDate, stdCycle.scope, !isHistorical);
    setCycleRange(saved);

    await saveSalesCycleToSupabase({
      startDate: saved.startDate,
      endDate: saved.endDate,
      startDay: saved.startDay,
      endDay: saved.endDay,
      scope: isManagerial ? 'company' : 'user',
      userId: user?.id,
      userName: user?.name,
      autoRollover: !isHistorical,
    });
  };

  const fetchSalesData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all collaborators who should be in the sales list so that the global faturamento real
      // is always calculated completely and identically for all users.
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, type, can_access_sales')
        .or('type.eq.vendedor,can_access_sales.eq.true')
        .order('name');

      if (profilesError) throw profilesError;

      // 1. Fetch daily sales and direct sales strictly within the commercial cycle interval [startDate, endDate]
      let dailyBySeller: Record<string, { sales_amount: number; orders_count: number }> = {};
      let hasDailyRegistryInSystem = false;
      try {
        const dailyRes = await fetch(
          `/api/sales/daily?startDate=${cycleRange.startDate}&endDate=${cycleRange.endDate}`,
          { cache: 'no-store' }
        );
        if (dailyRes.ok) {
          const dailyJson = await dailyRes.json();
          const rawEntries: any[] = Array.isArray(dailyJson.entries) ? dailyJson.entries : [];
          hasDailyRegistryInSystem =
            Number(dailyJson.total_registry_entries) > 0 || rawEntries.length > 0;
          const cycleEntries = rawEntries.filter(entry =>
            isDateInSalesCycle(entry?.date || entry?.sale_date, cycleRange)
          );
          for (const entry of cycleEntries) {
            if (!dailyBySeller[entry.collaborator_id]) {
              dailyBySeller[entry.collaborator_id] = { sales_amount: 0, orders_count: 0 };
            }
            dailyBySeller[entry.collaborator_id].sales_amount += Number(entry.sales_amount) || 0;
            dailyBySeller[entry.collaborator_id].orders_count += Number(entry.orders_count) || 0;
          }
        }
      } catch (e) {
        console.warn('Falha ao buscar vendas diárias por período:', e);
      }

      const directSalesBySeller: Record<string, number> = {};
      try {
        const { data: directSales } = await supabase
          .from('sales')
          .select('seller_id, total_value, sale_date, created_at, status')
          .gte('sale_date', `${cycleRange.startDate}T00:00:00`)
          .lte('sale_date', `${cycleRange.endDate}T23:59:59`);

        if (directSales && directSales.length > 0) {
          for (const sale of directSales) {
            if (sale.status && sale.status !== 'completed') continue;
            if (!isDateInSalesCycle(sale.sale_date || sale.created_at, cycleRange)) continue;
            if (sale.seller_id) {
              directSalesBySeller[sale.seller_id] =
                (directSalesBySeller[sale.seller_id] || 0) + (Number(sale.total_value) || 0);
            }
          }
        }
      } catch (e) {
        // Optional fallback if sales table is unused
      }

      // 2. Fetch existing sales entries strictly for the active cycle's reference month/year
      const [startY, startM] = cycleRange.startDate.split('-').map(Number);

      const { data: sales, error: salesError } = await supabase
        .from('sales_results')
        .select('*')
        .eq('month', selectedMonth)
        .eq('year', selectedYear);

      if (salesError) throw salesError;

      let activeSalesRows: any[] = sales || [];
      const hasTargetsInRef = activeSalesRows.some(
        r => (Number(r.target_2026) || 0) > 0
      );

      // If the new cycle's month has no configured targets yet, inherit ONLY target_2026 (Meta)
      // from the previous cycle — NEVER inherit result_2026 (realized revenue from past cycle).
      if (!hasTargetsInRef && startM && startY && (startM !== selectedMonth || startY !== selectedYear)) {
        const { data: startSales } = await supabase
          .from('sales_results')
          .select('*')
          .eq('month', startM)
          .eq('year', startY);

        if (
          startSales &&
          startSales.some(r => (Number(r.target_2026) || 0) > 0)
        ) {
          activeSalesRows = startSales.map(r => ({
            ...r,
            result_2026: 0,
          }));
        }
      }

      // If still without targets, fallback to most recent recorded period ONLY for target_2026 (Meta)
      if (
        !activeSalesRows.some(r => (Number(r.target_2026) || 0) > 0)
      ) {
        const { data: fallbackSales } = await supabase
          .from('sales_results')
          .select('*')
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(40);

        if (fallbackSales && fallbackSales.length > 0) {
          const nonZero =
            fallbackSales.find(
              d => (Number(d.target_2026) || 0) > 0
            ) || fallbackSales[0];
          activeSalesRows = fallbackSales
            .filter(d => d.month === nonZero.month && d.year === nonZero.year)
            .map(r => ({
              ...r,
              result_2026:
                !hasDailyRegistryInSystem &&
                isSalesResultFromCurrentCycle(r, {
                  startDate: cycleRange.startDate,
                  endDate: cycleRange.endDate,
                  refMonth: selectedMonth,
                  refYear: selectedYear,
                })
                  ? r.result_2026
                  : 0,
            }));
        }
      }

      // Fetch leads data to calculate conversion rate accurately
      const { data: leads } = await supabase
        .from('leads')
        .select('id, name, status, assigned_to, created_at');

      const allLeads = leads || [];
      setLeadsData(allLeads);

      if (profiles) {
        const formattedData = profiles.map(profile => {
          const entry = activeSalesRows?.find(s => s.collaborator_id === profile.id);
          const profileLeads = allLeads.filter(l => l.assigned_to === profile.id);
          const profileConverted = profileLeads.filter(l => 
            l.status === 'Convertido' || l.status === 'Ganho' || l.status === 'Fechado'
          ).length;
          const profileConvRate = profileLeads.length > 0 
            ? (profileConverted / profileLeads.length) * 100 
            : 0;
          
          const res2025 = Number(entry?.result_2025 || 0);
          const isCurrentCycleRow =
            !hasDailyRegistryInSystem &&
            isSalesResultFromCurrentCycle(entry, {
              startDate: cycleRange.startDate,
              endDate: cycleRange.endDate,
              refMonth: selectedMonth,
              refYear: selectedYear,
            });
          const consolidatedRes2026 = isCurrentCycleRow ? Number(entry?.result_2026 || 0) : 0;
          const dailySellerAmount = Number(dailyBySeller[profile.id]?.sales_amount || 0);
          const directSellerAmount = Number(directSalesBySeller[profile.id] || 0);

          // For each seller, the realized revenue is the max between the informed consolidated result
          // for THIS commercial cycle and their recorded sales in [startDate, endDate].
          const res2026 = Math.max(consolidatedRes2026, dailySellerAmount, directSellerAmount);

          const yoyGrowth = res2025 > 0 
            ? ((res2026 - res2025) / res2025) * 100 
            : (res2026 > 0 ? 100 : 0);

          return {
            ...entry,
            id: profile.id,
            name: profile.name,
            res2025,
            sugMeta: Number(entry?.target_suggestion || 0),
            meta2026: Number(entry?.target_2026 || 0),
            res2026,
            leadsCount: profileLeads.length,
            convertedCount: profileConverted,
            conversionRate: profileConvRate,
            yoyGrowth,
          };
        });
        setSalesData(formattedData);
      }
    } catch (error: any) {
      console.error('Error fetching sales data:', error?.message || error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, cycleRange.startDate, cycleRange.endDate]);

  const fetchTodaySales = useCallback(async () => {
    try {
      const todayStr = getTodayLocalYYYYMMDD();
      const res = await fetch(`/api/sales/daily?date=${todayStr}`);
      if (res.ok) {
        const json = await res.json();
        setTodayDailySales({
          total: json.summary?.total_sales || 0,
          sellersCount: json.summary?.sellers_with_sales || 0
        });
      }
    } catch (e) {
      console.warn('Erro ao carregar vendas de hoje:', e);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && canAccessSales) {
      fetchSalesData();
      fetchTodaySales();
    }

    const handleUpdate = () => {
      fetchSalesData();
      fetchTodaySales();
    };

    window.addEventListener('daily_sales_updated', handleUpdate);
    window.addEventListener('sales_results_updated', handleUpdate);

    return () => {
      window.removeEventListener('daily_sales_updated', handleUpdate);
      window.removeEventListener('sales_results_updated', handleUpdate);
    };
  }, [isAuthenticated, canAccessSales, fetchSalesData, fetchTodaySales]);

  if (!isAuthenticated) return <LoginForm onLogin={login} />;
  if (!canAccessSales) return <div className="p-4">Acesso negado. Você não tem permissão para visualizar este módulo.</div>;

  const totals = salesData.reduce((acc, curr) => ({
    res2025: acc.res2025 + curr.res2025,
    meta2026: acc.meta2026 + curr.meta2026,
    res2026: acc.res2026 + curr.res2026,
    leadsCount: acc.leadsCount + (curr.leadsCount || 0),
    convertedCount: acc.convertedCount + (curr.convertedCount || 0),
  }), { res2025: 0, meta2026: 0, res2026: 0, leadsCount: 0, convertedCount: 0 });

  const diff = totals.res2026 - totals.meta2026;
  const percent = totals.meta2026 > 0 ? (diff / totals.meta2026) * 100 : 0;
  const attainment = totals.meta2026 > 0 ? (totals.res2026 / totals.meta2026) * 100 : 0;

  // Year-over-Year (YoY) Revenue Growth calculation
  const yoyRevenueDiff = totals.res2026 - totals.res2025;
  const yoyRevenueGrowth = totals.res2025 > 0 
    ? ((totals.res2026 - totals.res2025) / totals.res2025) * 100 
    : (totals.res2026 > 0 ? 100 : 0);

  // Team's Average Conversion Rate calculation
  const totalTeamLeads = totals.leadsCount > 0 ? totals.leadsCount : (leadsData?.length || 0);
  const totalConvertedLeads = totals.convertedCount > 0 
    ? totals.convertedCount 
    : (leadsData?.filter(l => l.status === 'Convertido' || l.status === 'Ganho' || l.status === 'Fechado')?.length || 0);
  
  const teamAverageConversionRate = totalTeamLeads > 0 
    ? (totalConvertedLeads / totalTeamLeads) * 100 
    : 0;

  const renderChartContainer = (title: string, children: React.ReactNode) => (
    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
      <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        {title}
      </h3>
      <div className="h-64 w-full">
        {children}
      </div>
    </div>
  );

  const handleExportPDF = () => {
    exportSalesDashboardToPDF({
      title: `Relatório de Resultados de Vendas - ${new Date(2000, selectedMonth - 1).toLocaleString('pt-BR', { month: 'long' })} / ${selectedYear}`,
      period: `${new Date(2000, selectedMonth - 1).toLocaleString('pt-BR', { month: 'long' })} ${selectedYear}`,
      totalRevenue: totals.res2026,
      totalSales: salesData.length,
      avgTicket: salesData.length > 0 ? totals.res2026 / salesData.length : 0,
      avgConversionRate: teamAverageConversionRate,
      yoyGrowth: yoyRevenueGrowth,
      salesResults: salesData.map(d => ({
        name: d.name,
        res2025: d.res2025,
        meta2026: d.meta2026,
        res2026: d.res2026,
      }))
    });
  };

  return (
    <div id="sales-dashboard" className={`flex flex-col min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <header className={`flex items-center justify-between p-4 border-b sticky top-0 z-10 ${isDarkMode ? 'border-slate-800 bg-slate-900/80 backdrop-blur-md' : 'border-slate-100 bg-white/80 backdrop-blur-md'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
            <TrendingUp size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Resultados de Vendas</h1>
            <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Monitoramento de metas, conversão e crescimento de receita
            </p>
          </div>
        </div>

        <div className="actions-bar flex items-center gap-2">
          {/* Lançamento Diário para Administrador, Gerente ou Supervisor */}
          {isManagerial && (
            <button
              type="button"
              onClick={() => setShowDailySalesModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black transition-all shadow-md shadow-blue-600/20 cursor-pointer"
              title="Informar diariamente o resultado das vendas de cada vendedor"
            >
              <CalendarPlus size={16} />
              <span>Informar Vendas do Dia</span>
            </button>
          )}

          {/* Atalho do botão de Nova Comissão para Vendedores */}
          <button
            onClick={() => setShowCommissionModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            title="Atalho: Lançar nova comissão (sequência, valor, desconto, loja, parceiro)"
          >
            <DollarSign size={16} />
            <span>Nova Comissão</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Exportar dados do dashboard para PDF"
          >
            <Download size={16} className="text-blue-400" />
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>

          {isAdmin && (
            <Link href="/sales-results/admin" className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Configurações & Metas">
              <Settings size={20} />
            </Link>
          )}
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto pb-32 p-4 space-y-6">
        {/* Filters, Sales Cycle (26 a 25) & Shortcut Bar */}
        <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 flex-1">
            {/* Month / Year Cycle Selector */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 px-2">
                Ciclo Ref.:
              </span>
              <select 
                value={selectedMonth} 
                onChange={(e) => handleMonthYearChange(parseInt(e.target.value), selectedYear)}
                className="bg-transparent border-none text-xs font-extrabold uppercase tracking-wider py-1.5 px-2 outline-none cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1} className="bg-white dark:bg-slate-900">
                    {new Date(2000, i).toLocaleString('pt-BR', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select 
                value={selectedYear} 
                onChange={(e) => handleMonthYearChange(selectedMonth, parseInt(e.target.value))}
                className="bg-transparent border-none text-xs font-extrabold uppercase tracking-wider py-1.5 px-2 outline-none cursor-pointer"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y} className="bg-white dark:bg-slate-900">{y}</option>
                ))}
              </select>
            </div>

            {/* Dynamic Start Date & End Date Selector with Supabase Persistence */}
            <div className="flex-1 min-w-[300px]">
              <SalesCycleDateSelector
                cycleRange={cycleRange}
                onChange={(newRange) => {
                  setCycleRange(newRange);
                  setSelectedMonth(newRange.refMonth);
                  setSelectedYear(newRange.refYear);
                }}
                userId={user?.id}
                userName={user?.name}
                isManagerial={isManagerial}
              />
            </div>
          </div>

          {/* Banner de atalho rápido para vendedores */}
          <button
            onClick={() => setShowCommissionModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-black transition-all cursor-pointer shadow-xs shrink-0"
            title="Clique para abrir o formulário de lançamento de comissão"
          >
            <DollarSign size={16} className="stroke-[2.5]" />
            <span>Lançar Comissão de Venda</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-600 text-white font-bold ml-1">Atalho Vendedor</span>
          </button>
        </div>

        {/* Daily Sales Quick Widget for Managers */}
        {isManagerial && (
          <div className={`p-4 rounded-3xl border transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-white border-blue-200/60 shadow-xs'}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
                  <CalendarCheck size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold tracking-tight">
                      Lançamento Diário de Vendas por Vendedor
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      Gestão Comercial
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {todayDailySales && todayDailySales.total > 0
                      ? `Resultado de hoje registrado: R$ ${todayDailySales.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} • ${todayDailySales.sellersCount} vendedores com venda informada`
                      : 'Administrador, gerente ou supervisor: informe o resultado das vendas do dia de cada vendedor para consolidar as metas.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDailySalesModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm shadow-blue-600/20 transition-all cursor-pointer active:scale-95 shrink-0"
              >
                <CalendarPlus size={15} />
                <span>{todayDailySales && todayDailySales.total > 0 ? 'Editar Vendas de Hoje' : 'Informar Vendas de Hoje'}</span>
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Activity className="animate-spin mb-4" size={32} />
            <p className="text-sm font-medium">Carregando resultados...</p>
          </div>
        ) : salesData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <TrendingUp size={48} className="mb-4 opacity-20" />
            <p className="font-medium">Nenhum dado para este período</p>
            {isAdmin && (
              <Link href="/sales-results/admin" className="mt-4 text-emerald-600 font-bold text-sm">
                Alimentar Dados
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards Section at the Top */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Resumo Executivo & Indicadores Estratégicos
                  </h2>
                  <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Ciclo ativo: <strong className="text-emerald-600 dark:text-emerald-400">{formatDateBR(cycleRange.startDate)} até {formatDateBR(cycleRange.endDate)}</strong> ({getCycleDaysProgress(cycleRange.startDate, cycleRange.endDate).daysRemaining} dias restantes)
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <Activity size={12} />
                  <span>Ciclo Comercial: {cycleRange.shortLabel}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Taxa Média de Conversão da Equipe */}
                <div className={`relative overflow-hidden p-5 rounded-3xl border transition-all duration-200 hover:shadow-md ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border-slate-800' 
                    : 'bg-gradient-to-br from-white via-white to-indigo-50/50 border-slate-100 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                      Eficiência da Equipe
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-xs">
                      <Target size={18} />
                    </div>
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Taxa Média de Conversão
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-black text-indigo-500 tracking-tight">
                      {teamAverageConversionRate.toFixed(1)}%
                    </p>
                    <span className={`text-[11px] font-bold ${teamAverageConversionRate >= 25 ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {teamAverageConversionRate >= 25 ? '• Acima da meta' : '• Alvo: ≥ 25%'}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Leads Convertidos</span>
                    <span className="font-extrabold text-slate-700 dark:text-slate-200">
                      {totalConvertedLeads} de {totalTeamLeads} leads
                    </span>
                  </div>
                </div>

                {/* 2. Crescimento YoY de Receita (Ano a Ano) */}
                <div className={`relative overflow-hidden p-5 rounded-3xl border transition-all duration-200 hover:shadow-md ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border-slate-800' 
                    : 'bg-gradient-to-br from-white via-white to-emerald-50/50 border-slate-100 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
                      yoyRevenueGrowth >= 0 
                        ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' 
                        : 'text-rose-500 bg-rose-500/10 border-rose-500/20'
                    }`}>
                      Crescimento YoY
                    </span>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-xs ${
                      yoyRevenueGrowth >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {yoyRevenueGrowth >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    </div>
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Crescimento Anual de Receita
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className={`text-3xl font-black tracking-tight ${yoyRevenueGrowth >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {yoyRevenueGrowth >= 0 ? '+' : ''}{yoyRevenueGrowth.toFixed(1)}%
                    </p>
                    <span className="flex items-center text-[11px] font-bold text-slate-400">
                      {yoyRevenueGrowth >= 0 ? <ArrowUpRight size={14} className="text-emerald-500" /> : <ArrowDownRight size={14} className="text-rose-500" />}
                      vs. {selectedYear - 1}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Variação Real (R$)</span>
                    <span className={`font-extrabold ${yoyRevenueDiff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {yoyRevenueDiff >= 0 ? '+' : '-'}R$ {Math.abs(yoyRevenueDiff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* 3. Faturamento Realizado */}
                <div className={`relative overflow-hidden p-5 rounded-3xl border transition-all duration-200 hover:shadow-md ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/30 border-slate-800' 
                    : 'bg-gradient-to-br from-white via-white to-blue-50/50 border-slate-100 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                      {cycleRange.shortLabel}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shadow-xs">
                      <DollarSign size={18} />
                    </div>
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Faturamento Realizado
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                      R$ {totals.res2026.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Atingimento da Meta</span>
                    <span className={`font-extrabold ${attainment >= 100 ? 'text-emerald-500' : 'text-blue-600 dark:text-blue-400'}`}>
                      {attainment.toFixed(1)}% da meta
                    </span>
                  </div>
                </div>

                {/* 4. Meta & Performance */}
                <div className={`relative overflow-hidden p-5 rounded-3xl border transition-all duration-200 hover:shadow-md ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border-slate-800' 
                    : 'bg-gradient-to-br from-white via-white to-amber-50/50 border-slate-100 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                      Meta ({cycleRange.shortLabel})
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-xs">
                      <Award size={18} />
                    </div>
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Meta Estipulada
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className={`text-2xl sm:text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      R$ {totals.meta2026.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      {diff >= 0 ? 'Superávit' : 'Gap Restante'}
                    </span>
                    <span className={`font-extrabold ${diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      R$ {Math.abs(diff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({percent >= 0 ? '+' : ''}{percent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* GSAP Sales Target Progress Bar Card */}
            <div id="faturamento-meta-card" className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
              <GsapSalesProgressBar
                currentRevenue={totals.res2026}
                targetGoal={totals.meta2026}
                label={`Faturamento Realizado vs Meta • Ciclo ${formatDateBR(cycleRange.startDate)} a ${formatDateBR(cycleRange.endDate)}`}
                subtitle={`Ciclo comercial de 26 a 25 • ${getCycleDaysProgress(cycleRange.startDate, cycleRange.endDate).daysRemaining} dias restantes no período`}
                isDarkMode={isDarkMode}
                showDetails={true}
                barHeight="h-4"
                colorScheme={totals.res2026 >= totals.meta2026 ? 'emerald' : 'blue'}
              />
            </div>

            {/* Novo Card: Quanto Falta para Atingir a Meta Diária e Mensal (Ciclo 26 a 25) */}
            <SalesCycleGoalGapCard
              cycleRange={cycleRange}
              totalGoal={totals.meta2026}
              totalResult={totals.res2026}
              todaySales={todayDailySales?.total || 0}
              loading={loading}
              isDarkMode={isDarkMode}
              isManagerial={isManagerial}
              onOpenDailySalesModal={() => setShowDailySalesModal(true)}
            />

            {/* Sistema de Notificações Push Automáticas por Marcos de Meta (50%, 75% e 100%) */}
            <SalesMilestonePushCard
              cycleRange={cycleRange}
              userId={user?.id}
              isManagerial={isManagerial}
              isDarkMode={isDarkMode}
            />

            {/* Main Chart */}
            {renderChartContainer(`Comparativo de Resultados - ${new Date(2000, selectedMonth - 1).toLocaleString('pt-BR', { month: 'long' })}`, (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value: any) => {
                      const numValue = typeof value === 'number' ? value : 0;
                      return `R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                  <Bar name="Resultado 2025" dataKey="res2025" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar name={`Meta ${selectedYear}`} dataKey="meta2026" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar name={`Resultado ${selectedYear}`} dataKey="res2026" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ))}

            {/* Detailed Table */}
            <div className={`overflow-hidden rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Detalhamento por Colaborador
                  </h3>
                  <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
                    Performance individual com crescimento YoY e conversão de leads
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {user?.id && salesData.some(s => s.id === user.id) && (
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setTableFilter('all')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          tableFilter === 'all'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        Todos ({salesData.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setTableFilter('me')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          tableFilter === 'me'
                            ? 'bg-blue-600 text-white shadow-xs font-black'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        Apenas Eu
                      </button>
                    </div>
                  )}
                  <div className="text-[11px] font-bold text-slate-400 hidden sm:block">
                    {salesData.length} vendedores listados
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Colaborador</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Res. {selectedYear - 1}</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Meta {selectedYear}</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Res. {selectedYear}</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Crescimento YoY</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Conversão Leads</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Atingimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tableFilter === 'me' && user?.id ? salesData.filter(s => s.id === user.id) : salesData).map((item, idx) => {
                      const atingimento = item.meta2026 > 0 ? (item.res2026 / item.meta2026) * 100 : 0;
                      const isMe = item.id === user?.id;
                      return (
                        <tr key={idx} className={`border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-50'} hover:bg-slate-500/5 transition-colors ${
                          isMe ? 'bg-blue-50/60 dark:bg-blue-950/20' : ''
                        }`}>
                          <td className="p-4 text-sm font-bold">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                                isMe ? 'bg-blue-600 text-white' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              }`}>
                                {item.name.charAt(0)}
                              </div>
                              <span className="flex items-center gap-1.5">
                                {item.name}
                                {isMe && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-2xs">
                                    Você
                                  </span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-right text-slate-500">
                            R$ {item.res2025.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-4 text-sm text-right font-medium">
                            R$ {item.meta2026.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-4 text-sm text-right font-bold text-blue-600 dark:text-blue-400">
                            R$ {item.res2026.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-4 text-sm text-right">
                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-black ${
                              item.yoyGrowth >= 0 
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}>
                              {item.yoyGrowth >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                              {item.yoyGrowth >= 0 ? '+' : ''}{item.yoyGrowth.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-4 text-sm text-right">
                            <div className="inline-flex flex-col items-end">
                              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs">
                                {item.conversionRate.toFixed(1)}%
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {item.convertedCount}/{item.leadsCount} leads
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-right min-w-[160px]">
                            <GsapSalesProgressBar
                              currentRevenue={item.res2026 || 0}
                              targetGoal={item.meta2026 || 0}
                              isDarkMode={isDarkMode}
                              showDetails={false}
                              barHeight="h-2.5"
                              colorScheme={atingimento >= 100 ? 'emerald' : 'blue'}
                              delay={0.1 + idx * 0.05}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal de Lançamento de Nova Comissão para Vendedores */}
      <NewCommissionModal 
        isOpen={showCommissionModal} 
        onClose={() => setShowCommissionModal(false)}
        onSuccess={() => {
          fetchSalesData();
        }}
      />

      {/* Modal de Lançamento Diário de Vendas por Vendedor (Admin, Gerente, Supervisor) */}
      <DailySalesInputModal
        isOpen={showDailySalesModal}
        onClose={() => setShowDailySalesModal(false)}
        onSaved={() => {
          fetchSalesData();
          fetchTodaySales();
        }}
      />

      <BottomNav />
    </div>
  );
}

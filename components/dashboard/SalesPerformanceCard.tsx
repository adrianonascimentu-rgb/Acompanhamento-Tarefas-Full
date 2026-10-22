'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  TrendingUp, ArrowUpRight, Target, CheckCircle2, Award, Zap, Users, 
  AlertTriangle, Sparkles, Clock, BarChart2, CalendarPlus, Calendar, RotateCcw, ChevronLeft, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { gsap } from 'gsap';
import { useRole } from '@/hooks/useRole';
import { DailySalesInputModal } from '@/components/sales/DailySalesInputModal';
import { SalesCycleDateSelector } from '@/components/sales/SalesCycleDateSelector';
import { SalesCycleGoalGapCard } from '@/components/sales/SalesCycleGoalGapCard';
import { SalesMilestonePushCard } from '@/components/sales/SalesMilestonePushCard';
import {
  SalesCycleRange,
  getDefaultSalesCycleForDate,
  getCycleDaysProgress,
  loadSavedSalesCycle,
  formatDateBR
} from '@/lib/salesCycle';

interface SalesPerformanceCardProps {
  isDarkMode?: boolean;
}

export function SalesPerformanceCard({ isDarkMode }: SalesPerformanceCardProps) {
  const { role, user, isAdmin, isGerente, isSupervisor } = useRole();
  const [showDailySalesModal, setShowDailySalesModal] = useState(false);
  const [todaySummary, setTodaySummary] = useState<{ total: number; sellersCount: number } | null>(null);
  const [cycleRange, setCycleRange] = useState<SalesCycleRange>(() => getDefaultSalesCycleForDate());
  const [performance, setPerformance] = useState<{
    totalGoal: number;
    totalResult: number;
    percentage: number;
    sellersCount: number;
  }>({
    totalGoal: 0,
    totalResult: 0,
    percentage: 0,
    sellersCount: 0
  });
  const [loading, setLoading] = useState(true);

  const circleRef = useRef<SVGCircleElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const resultNumRef = useRef<HTMLParagraphElement>(null);

  // Hydrate saved cycle from localStorage on mount & listen for cross-component updates
  useEffect(() => {
    const saved = loadSavedSalesCycle();
    setCycleRange(saved);

    const handleCycleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<SalesCycleRange>;
      if (customEvent.detail?.startDate && customEvent.detail?.endDate) {
        setCycleRange(customEvent.detail);
      } else {
        setCycleRange(loadSavedSalesCycle());
      }
    };

    window.addEventListener('sales_cycle_updated', handleCycleEvent);
    return () => window.removeEventListener('sales_cycle_updated', handleCycleEvent);
  }, []);

  const { daysRemaining, totalDays } = getCycleDaysProgress(cycleRange.startDate, cycleRange.endDate);
  const refMonthDate = new Date(cycleRange.refYear, cycleRange.refMonth - 1, 1);
  const currentMonthName = refMonthDate.toLocaleString('pt-BR', { month: 'long' });
  const formattedMonthName = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);

  const isManagerial = isAdmin || isGerente || isSupervisor || role === 'gerente' || role === 'supervisor' || role === 'admin';

  const fetchTodayDailySales = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/sales/daily?date=${todayStr}`);
      if (res.ok) {
        const json = await res.json();
        setTodaySummary({
          total: json.summary?.total_sales || 0,
          sellersCount: json.summary?.sellers_with_sales || 0
        });
      }
    } catch (e) {
      console.warn('Erro ao carregar resumo de hoje:', e);
    }
  }, []);

  useEffect(() => {
    fetchTodayDailySales();
    const handleDailyUpdate = () => {
      fetchTodayDailySales();
    };
    window.addEventListener('daily_sales_updated', handleDailyUpdate);
    return () => {
      window.removeEventListener('daily_sales_updated', handleDailyUpdate);
    };
  }, [fetchTodayDailySales]);

  useEffect(() => {
    async function fetchSalesResults() {
      try {
        setLoading(true);

        // Fetch active sellers/collaborators eligible for sales
        let profileQuery = supabase
          .from('profiles')
          .select('id, name');
        
        if (!isManagerial && user?.id) {
          profileQuery = profileQuery.eq('id', user.id);
        } else {
          profileQuery = profileQuery.or('type.eq.vendedor,can_access_sales.eq.true');
        }

        const { data: sellers } = await profileQuery;
        const sellerIds = (sellers || []).map(s => s.id);

        if (sellerIds.length === 0 && !isManagerial) {
          setPerformance({ totalGoal: 0, totalResult: 0, percentage: 0, sellersCount: 0 });
          setLoading(false);
          return;
        }

        // 1. Fetch daily sales in the exact [startDate, endDate] range
        let dailyBySeller: Record<string, { sales_amount: number; orders_count: number }> = {};
        let hasDailyEntriesInRange = false;
        try {
          const dailyRes = await fetch(
            `/api/sales/daily?startDate=${cycleRange.startDate}&endDate=${cycleRange.endDate}`
          );
          if (dailyRes.ok) {
            const dailyJson = await dailyRes.json();
            dailyBySeller = dailyJson.by_seller || {};
            hasDailyEntriesInRange = (dailyJson.entries?.length || 0) > 0;
          }
        } catch (e) {
          console.warn('Falha ao buscar vendas diárias por período:', e);
        }

        // 2. Fetch sales results — the values already informed for sellers in sales_results
        // already correspond to the 26-to-25 sales cycle.
        const [startY, startM] = cycleRange.startDate.split('-').map(Number);
        const [endY, endM] = cycleRange.endDate.split('-').map(Number);

        let salesQuery = supabase
          .from('sales_results')
          .select('collaborator_id, target_2026, result_2026, month, year')
          .eq('month', cycleRange.refMonth)
          .eq('year', cycleRange.refYear);
        
        if (!isManagerial && user?.id) {
          salesQuery = salesQuery.eq('collaborator_id', user.id);
        } else if (sellerIds.length > 0) {
          salesQuery = salesQuery.in('collaborator_id', sellerIds);
        }

        const { data, error } = await salesQuery;

        let activeRows = (!error && data && data.length > 0) ? data : [];
        const hasNonZeroInRef = activeRows.some(
          r => (parseFloat(r.result_2026) || 0) > 0 || (parseFloat(r.target_2026) || 0) > 0
        );

        // If the end-month has no informed values, check the start-month of the 26-to-25 cycle
        if (!hasNonZeroInRef && startM && startY && (startM !== endM || startY !== endY)) {
          let startMonthQuery = supabase
            .from('sales_results')
            .select('collaborator_id, target_2026, result_2026, month, year')
            .eq('month', startM)
            .eq('year', startY);

          if (!isManagerial && user?.id) {
            startMonthQuery = startMonthQuery.eq('collaborator_id', user.id);
          } else if (sellerIds.length > 0) {
            startMonthQuery = startMonthQuery.in('collaborator_id', sellerIds);
          }

          const { data: startMonthData } = await startMonthQuery;
          if (
            startMonthData &&
            startMonthData.some(
              r => (parseFloat(r.result_2026) || 0) > 0 || (parseFloat(r.target_2026) || 0) > 0
            )
          ) {
            activeRows = startMonthData;
          }
        }

        // Fallback to most recent recorded period with informed values if still empty
        const stillEmpty = !activeRows.some(
          r => (parseFloat(r.result_2026) || 0) > 0 || (parseFloat(r.target_2026) || 0) > 0
        );
        if (activeRows.length === 0 || stillEmpty) {
          let fallbackQuery = supabase
            .from('sales_results')
            .select('collaborator_id, target_2026, result_2026, month, year')
            .order('year', { ascending: false })
            .order('month', { ascending: false })
            .limit(40);
          
          if (!isManagerial && user?.id) {
            fallbackQuery = fallbackQuery.eq('collaborator_id', user.id);
          } else if (sellerIds.length > 0) {
            fallbackQuery = fallbackQuery.in('collaborator_id', sellerIds);
          }

          const { data: fallbackData } = await fallbackQuery;
          if (fallbackData && fallbackData.length > 0) {
            const nonZeroRow = fallbackData.find(
              d => (parseFloat(d.result_2026) || 0) > 0 || (parseFloat(d.target_2026) || 0) > 0
            ) || fallbackData[0];
            const latestMonth = nonZeroRow.month;
            const latestYear = nonZeroRow.year;
            activeRows = fallbackData.filter(d => d.month === latestMonth && d.year === latestYear);
          }
        }

        const relevantData = sellerIds.length > 0
          ? activeRows.filter(curr => sellerIds.includes(curr.collaborator_id))
          : activeRows;

        const totalGoal = relevantData.reduce((acc, curr) => acc + (parseFloat(curr.target_2026) || 0), 0);

        // The sum of the values already informed for the sellers (result_2026) already corresponds
        // to the 26-to-25 sales cycle. Preserve result_2026 and only use dailyBySeller if result_2026 is 0.
        const consolidatedSum = relevantData.reduce(
          (acc, curr) => acc + (parseFloat(curr.result_2026) || 0),
          0
        );

        let totalResult = consolidatedSum;
        if (consolidatedSum === 0 && hasDailyEntriesInRange) {
          totalResult = Object.values(dailyBySeller).reduce(
            (acc, curr) => acc + (Number(curr.sales_amount) || 0),
            0
          );
        }

        const percentage = totalGoal > 0 ? Math.round((totalResult / totalGoal) * 1000) / 10 : 0;

        setPerformance({
          totalGoal,
          totalResult,
          percentage,
          sellersCount: Math.max(relevantData.length, sellerIds.length)
        });
      } catch (err) {
        console.error('Error fetching sales performance data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSalesResults();

    const handleRefresh = () => {
      fetchSalesResults();
    };

    window.addEventListener('daily_sales_updated', handleRefresh);
    window.addEventListener('sales_results_updated', handleRefresh);

    const channel = supabase
      .channel('sales_results_current_month_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_results' }, () => {
        fetchSalesResults();
      })
      .subscribe();

    return () => {
      window.removeEventListener('daily_sales_updated', handleRefresh);
      window.removeEventListener('sales_results_updated', handleRefresh);
      supabase.removeChannel(channel);
    };
  }, [cycleRange.startDate, cycleRange.endDate, cycleRange.refMonth, cycleRange.refYear, isManagerial, role, user?.id]);

  // Gauge calculations
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const clampedPercentage = Math.min(100, Math.max(0, performance.percentage));
  const targetStrokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  const isGoalReached = performance.totalGoal > 0 && performance.totalResult >= performance.totalGoal;
  const gapValue = performance.totalGoal - performance.totalResult;
  const safeRemainingDays = Math.max(1, daysRemaining);
  const requiredDailyPace =
    !isGoalReached && gapValue > 0 ? gapValue / safeRemainingDays : 0;

  // Status and color theme
  const getStatusInfo = () => {
    if (performance.totalGoal === 0) {
      return {
        label: 'Aguardando Metas',
        badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        strokeColor: 'text-slate-400 dark:text-slate-500',
        progressGradient: 'from-slate-400 to-slate-500',
        icon: Clock,
      };
    }
    if (isGoalReached) {
      return {
        label: 'Meta Superada 🚀',
        badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        strokeColor: 'text-emerald-500 dark:text-emerald-400',
        progressGradient: 'from-emerald-500 to-teal-400',
        icon: Sparkles,
      };
    }
    if (performance.percentage >= 75) {
      return {
        label: 'Excelente Ritmo 🔥',
        badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        strokeColor: 'text-blue-500 dark:text-blue-400',
        progressGradient: 'from-blue-500 to-indigo-500',
        icon: TrendingUp,
      };
    }
    if (performance.percentage >= 40) {
      return {
        label: 'Em Andamento 📈',
        badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        strokeColor: 'text-amber-500 dark:text-amber-400',
        progressGradient: 'from-amber-500 to-orange-400',
        icon: BarChart2,
      };
    }
    return {
      label: 'Atenção ao Ritmo ⚠️',
      badgeColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      strokeColor: 'text-rose-500 dark:text-rose-400',
      progressGradient: 'from-rose-500 to-pink-500',
      icon: AlertTriangle,
    };
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;

  // GSAP animation
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      if (circleRef.current) {
        gsap.fromTo(
          circleRef.current,
          { strokeDashoffset: circumference },
          {
            strokeDashoffset: targetStrokeDashoffset,
            duration: 1.4,
            ease: 'power3.out',
            delay: 0.1,
          }
        );
      }

      if (barRef.current) {
        gsap.fromTo(
          barRef.current,
          { width: '0%' },
          {
            width: `${clampedPercentage}%`,
            duration: 1.4,
            ease: 'power3.out',
            delay: 0.15,
          }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, [circumference, targetStrokeDashoffset, clampedPercentage]);

  const formatBRL = (val: number, decimals = 2) =>
    `R$ ${val.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;

  return (
    <div
      ref={containerRef}
      className={`p-5 sm:p-6 rounded-3xl border transition-all flex flex-col justify-between gap-4 relative overflow-hidden shadow-sm hover:shadow-md ${
        isDarkMode 
          ? 'bg-gradient-to-br from-slate-900 via-slate-900/98 to-slate-950 border-slate-800/90 shadow-slate-950/50' 
          : 'bg-gradient-to-br from-white via-white to-slate-50/80 border-slate-200/90'
      }`}
    >
      {/* Decorative background glow */}
      <div className="absolute -top-24 -right-24 w-56 h-56 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/25 shadow-inner">
            <TrendingUp size={22} className="stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                Faturamento Realizado vs Meta
              </h3>
              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold rounded-full border border-emerald-500/20 whitespace-nowrap">
                Ciclo {formattedMonthName}/{cycleRange.refYear} ({cycleRange.shortLabel})
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
              {isManagerial
                ? 'Ciclo Comercial (26 a 25) • Soma consolidada dos valores informados pelos vendedores'
                : 'Meu Desempenho no Ciclo Comercial (26 a 25) • Acompanhamento em tempo real'}
            </p>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {isManagerial && (
            <button 
              type="button"
              onClick={() => setShowDailySalesModal(true)}
              className="flex items-center gap-1.5 text-xs font-black px-3.5 py-2 rounded-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm shadow-emerald-600/20 transition-all shrink-0 active:scale-95 cursor-pointer whitespace-nowrap"
              title="Lançamento diário do resultado de vendas de cada vendedor"
            >
              <CalendarPlus size={14} className="stroke-[2.5]" />
              <span>Lançar Vendas do Dia</span>
            </button>
          )}

          <Link 
            href="/sales-results" 
            className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 hover:bg-emerald-100/80 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/80 transition-all shrink-0 active:scale-95 shadow-2xs whitespace-nowrap"
            title="Ver Módulo de Vendas Completo"
          >
            <span>Painel Detalhado</span>
            <ArrowUpRight size={14} className="stroke-[2.5]" />
          </Link>
        </div>
      </div>

      {/* 2. Full-Width Dynamic Cycle Date Selector (26 to 25) saved in Supabase */}
      <div className="relative z-10">
        <SalesCycleDateSelector
          cycleRange={cycleRange}
          onChange={(newRange) => setCycleRange(newRange)}
          userId={user?.id}
          userName={user?.name}
          isManagerial={isManagerial}
          compact
        />
      </div>

      {/* 3. Main Hero Showcase: Realized Revenue, 3 KPI Boxes, Linear Progress & Circular Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch bg-slate-50/90 dark:bg-slate-900/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/90 relative z-10 shadow-inner">
        
        {/* Left 8 Columns: Realized Revenue + 3 KPI Strip + Linear Progress Bar */}
        <div className="lg:col-span-8 flex flex-col justify-between gap-4">
          {/* Top Label & Value */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Zap size={14} className="stroke-[2.5]" />
                </div>
                <span className="text-[11px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400">
                  Soma Realizada no Ciclo ({formatDateBR(cycleRange.startDate)} a {formatDateBR(cycleRange.endDate)})
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
                  <Users size={12} className="text-emerald-500" />
                  {isManagerial
                    ? `${performance.sellersCount} ${performance.sellersCount === 1 ? 'vendedor' : 'vendedores'}`
                    : 'Individual'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
                  <Clock size={12} className="text-blue-500" />
                  {daysRemaining === 0
                    ? 'Último dia'
                    : `${daysRemaining}d restantes de ${totalDays}d`}
                </span>
              </div>
            </div>

            <div className="flex items-baseline gap-3 flex-wrap pt-1">
              <p 
                ref={resultNumRef}
                className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight whitespace-nowrap"
              >
                {loading ? (
                  <span className="inline-block w-52 h-10 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-xl" />
                ) : (
                  formatBRL(performance.totalResult)
                )}
              </p>
              {!loading && performance.totalGoal > 0 && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold border ${
                    isGoalReached
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                      : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300/60 dark:border-slate-700'
                  }`}
                >
                  {isGoalReached
                    ? `+${formatBRL(Math.abs(gapValue))} acima da meta`
                    : `${performance.percentage.toFixed(1)}% da meta mensal`}
                </span>
              )}
            </div>
          </div>

          {/* 3-Column KPI Strip: Meta do Ciclo | Falta para a Meta | Ritmo Diário Necessário */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Box 1: Meta do Ciclo */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950/85 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                <Target size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 dark:text-slate-500 block">
                  Meta do Ciclo (26 a 25)
                </span>
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white tabular-nums block truncate">
                  {loading ? '...' : formatBRL(performance.totalGoal)}
                </span>
              </div>
            </div>

            {/* Box 2: Falta para a Meta ou Superávit */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950/85 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  isGoalReached
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}
              >
                {isGoalReached ? <CheckCircle2 size={18} /> : <Award size={18} />}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 dark:text-slate-500 block">
                  {isGoalReached ? 'Superávit no Ciclo' : 'Falta p/ Meta Mensal'}
                </span>
                <span
                  className={`text-sm sm:text-base font-black tabular-nums block truncate ${
                    isGoalReached
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {loading ? '...' : formatBRL(Math.abs(gapValue))}
                </span>
              </div>
            </div>

            {/* Box 3: Meta Diária Necessária */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950/85 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  isGoalReached
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                }`}
              >
                <Clock size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 dark:text-slate-500 block">
                  {isGoalReached ? 'Ritmo Diário' : `Meta/Dia (${safeRemainingDays}d rest.)`}
                </span>
                <span
                  className={`text-sm sm:text-base font-black tabular-nums block truncate ${
                    isGoalReached
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  {loading
                    ? '...'
                    : isGoalReached
                    ? 'Meta 100% Batida!'
                    : `${formatBRL(requiredDailyPace)}/dia`}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Linear Progress Bar with 25% / 50% / 75% / 100% Milestones */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <BarChart2 size={14} className="text-emerald-500" />
                <span>Progresso Acumulado no Ciclo ({cycleRange.shortLabel})</span>
              </div>
              <span className="tabular-nums px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-[11px]">
                {clampedPercentage.toFixed(1)}% concluído
              </span>
            </div>

            <div className="relative w-full h-3.5 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/70 dark:border-slate-700/80 shadow-inner">
              <div
                ref={barRef}
                style={{ width: '0%' }}
                className={`h-full rounded-full bg-gradient-to-r ${status.progressGradient} transition-all shadow-xs`}
              />
            </div>

            <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 px-0.5">
              <span>0%</span>
              <span>25%</span>
              <span className={performance.percentage >= 50 ? 'text-amber-600 dark:text-amber-400 font-extrabold' : ''}>
                50% (Alerta)
              </span>
              <span className={performance.percentage >= 75 ? 'text-blue-600 dark:text-blue-400 font-extrabold' : ''}>
                75% (Alerta)
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                100% (Meta)
              </span>
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Circular Gauge + Status Badge + Today's Sales Quick Box */}
        <div className="lg:col-span-4 flex flex-col items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-950/85 border border-slate-200/80 dark:border-slate-800/90 shadow-2xs gap-3">
          <div className="relative flex items-center justify-center mt-1">
            <svg className="w-32 h-32 transform -rotate-90">
              {/* Track */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                stroke="currentColor"
                strokeWidth="9"
                className="text-slate-100 dark:text-slate-800"
                fill="transparent"
              />
              {/* Animated Progress Arc */}
              <circle
                ref={circleRef}
                cx="64"
                cy="64"
                r={radius}
                stroke="currentColor"
                strokeWidth="9"
                strokeDasharray={circumference}
                strokeDashoffset={circumference}
                strokeLinecap="round"
                className={`${status.strokeColor} transition-colors`}
                fill="transparent"
              />
            </svg>
            
            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                {loading ? '...' : `${performance.percentage}%`}
              </span>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Atingido
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`flex items-center gap-1.5 px-3.5 py-1 text-xs font-black rounded-full border shadow-2xs ${status.badgeColor}`}>
            <StatusIcon size={13} className="shrink-0" />
            <span>{status.label}</span>
          </div>

          {/* Today's Sales Quick Status inside the Gauge Box */}
          {isManagerial ? (
            <button
              type="button"
              onClick={() => setShowDailySalesModal(true)}
              className="w-full p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
            >
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                  {todaySummary && todaySummary.total > 0 ? 'Vendas de Hoje' : 'Lançamento Diário'}
                </span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate block tabular-nums">
                  {todaySummary && todaySummary.total > 0
                    ? `${formatBRL(todaySummary.total)} (${todaySummary.sellersCount} vend.)`
                    : 'Informar vendas de hoje'}
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CalendarPlus size={13} />
              </div>
            </button>
          ) : (
            <div className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Fechamento do Ciclo
              </span>
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                Dia {formatDateBR(cycleRange.endDate)} ({daysRemaining}d restantes)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Quanto Falta para Atingir a Meta Diária e Mensal (Ciclo 26 a 25) */}
      <div className="relative z-10">
        <SalesCycleGoalGapCard
          cycleRange={cycleRange}
          totalGoal={performance.totalGoal}
          totalResult={performance.totalResult}
          todaySales={todaySummary?.total || 0}
          loading={loading}
          isDarkMode={isDarkMode}
          isManagerial={isManagerial}
          onOpenDailySalesModal={() => setShowDailySalesModal(true)}
          compact
        />
      </div>

      {/* 5. Automatic Push Notifications for 50%, 75%, and 100% Goal Milestones */}
      <div className="relative z-10">
        <SalesMilestonePushCard
          cycleRange={cycleRange}
          userId={user?.id}
          isManagerial={isManagerial}
          isDarkMode={isDarkMode}
          compact
        />
      </div>

      {/* Daily Sales Modal */}
      <DailySalesInputModal
        isOpen={showDailySalesModal}
        onClose={() => setShowDailySalesModal(false)}
        onSaved={() => {
          fetchTodayDailySales();
        }}
      />
    </div>
  );
}


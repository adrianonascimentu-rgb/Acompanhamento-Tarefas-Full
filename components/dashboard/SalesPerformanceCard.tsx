'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  TrendingUp, ArrowUpRight, Target, CheckCircle2, Award, Zap, Users, 
  AlertTriangle, Sparkles, Clock, BarChart2, CalendarPlus, Calendar, RotateCcw, ChevronLeft, ChevronRight,
  Settings2, Save, X, Building2, User
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
  subDays,
  addDays,
  subMonths,
  startOfDay,
  endOfDay,
  isWithinInterval,
  parseISO,
  isValid,
  format,
} from 'date-fns';
import {
  SalesCycleRange,
  getDefaultSalesCycleForDate,
  getSalesCycleForMonthYear,
  getCycleDaysProgress,
  loadSavedSalesCycle,
  saveSalesCycleToSupabase,
  formatDateBR,
  getTodayLocalYYYYMMDD,
  isSalesResultFromCurrentCycle,
} from '@/lib/salesCycle';

interface SalesPerformanceCardProps {
  isDarkMode?: boolean;
}

/**
 * Calcula com precisão o intervalo do ciclo comercial (26 do mês anterior a 25 do mês atual)
 * utilizando `date-fns` e subtraindo 5 dias (`subDays(..., 5)`) da data final de cada mês comercial (base 30 dias).
 */
function calculateCommercialCycleBounds(cycleRange: SalesCycleRange) {
  const safeStartDay = Math.min(31, Math.max(1, Number(cycleRange.startDay) || 26));
  const safeEndDay = Math.min(31, Math.max(1, Number(cycleRange.endDay) || 25));
  const refYear = Number(cycleRange.refYear) || new Date().getFullYear();
  const refMonth = Number(cycleRange.refMonth) || new Date().getMonth() + 1;

  // Mês comercial atual: data final base (dia 30 comercial = safeEndDay + 5) menos 5 dias via subDays = dia 25
  const maxDaysInRefMonth = new Date(refYear, refMonth, 0).getDate();
  const clampedEndDay = Math.min(safeEndDay, maxDaysInRefMonth);
  const currentCommercialMonthEnd = addDays(
    new Date(refYear, refMonth - 1, clampedEndDay, 12, 0, 0, 0),
    5
  );
  const computedEndDate = subDays(currentCommercialMonthEnd, 5);

  // Mês comercial anterior: data final base menos 5 dias via subDays = dia 25 do mês anterior -> + 1 dia = dia 26
  const prevMonthRef = subMonths(new Date(refYear, refMonth - 1, 1, 12, 0, 0, 0), 1);
  const prevYear = prevMonthRef.getFullYear();
  const prevMonth = prevMonthRef.getMonth() + 1;
  const maxDaysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
  const clampedPrevEndDay = Math.min(safeEndDay, maxDaysInPrevMonth);
  const prevCommercialMonthEnd = addDays(
    new Date(prevYear, prevMonth - 1, clampedPrevEndDay, 12, 0, 0, 0),
    5
  );
  const prevCycleClosingDate = subDays(prevCommercialMonthEnd, 5);
  const computedStartDate =
    safeStartDay === 26 && safeEndDay === 25
      ? addDays(prevCycleClosingDate, 1)
      : new Date(
          prevYear,
          prevMonth - 1,
          Math.min(safeStartDay, maxDaysInPrevMonth),
          12,
          0,
          0,
          0
        );

  // Se o usuário selecionou datas customizadas válidas no seletor, respeita-as aplicando subDays(addDays(..., 5), 5)
  const parsedCustomStart = cycleRange.startDate
    ? parseISO(`${cycleRange.startDate}T12:00:00`)
    : null;
  const parsedCustomEnd = cycleRange.endDate
    ? parseISO(`${cycleRange.endDate}T12:00:00`)
    : null;

  const finalStartObj =
    parsedCustomStart && isValid(parsedCustomStart) ? parsedCustomStart : computedStartDate;
  const finalEndObj =
    parsedCustomEnd && isValid(parsedCustomEnd)
      ? subDays(addDays(parsedCustomEnd, 5), 5)
      : computedEndDate;

  const cycleStart = startOfDay(finalStartObj);
  const cycleEnd = endOfDay(finalEndObj);

  return {
    cycleStart,
    cycleEnd,
    startDateStr: format(cycleStart, 'yyyy-MM-dd'),
    endDateStr: format(cycleEnd, 'yyyy-MM-dd'),
  };
}

/**
 * Verifica com `date-fns` (`parseISO`, `isWithinInterval`) se a data de uma venda
 * pertence estritamente ao intervalo do ciclo comercial `[cycleStart, cycleEnd]`.
 */
function isSaleDateWithinCommercialCycle(
  rawDate: string | Date | null | undefined,
  cycleStart: Date,
  cycleEnd: Date
): boolean {
  if (!rawDate || !isValid(cycleStart) || !isValid(cycleEnd)) return false;
  if (cycleStart.getTime() > cycleEnd.getTime()) return false;

  let parsed: Date;
  if (rawDate instanceof Date) {
    parsed = rawDate;
  } else {
    const str = String(rawDate).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      parsed = parseISO(`${str}T12:00:00`);
    } else if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      parsed = parseISO(`${str.slice(0, 10)}T12:00:00`);
    } else {
      parsed = new Date(str);
    }
  }

  if (!isValid(parsed)) return false;
  return isWithinInterval(parsed, { start: cycleStart, end: cycleEnd });
}

export function SalesPerformanceCard({ isDarkMode }: SalesPerformanceCardProps) {
  const { role, user, isAdmin, isGerente, isSupervisor } = useRole();
  const [showDailySalesModal, setShowDailySalesModal] = useState(false);
  const [showCycleSettingsModal, setShowCycleSettingsModal] = useState(false);
  const [todaySummary, setTodaySummary] = useState<{ total: number; sellersCount: number } | null>(null);
  const [cycleRange, setCycleRange] = useState<SalesCycleRange>(() => getDefaultSalesCycleForDate());
  const [modalStartDay, setModalStartDay] = useState<number>(26);
  const [modalEndDay, setModalEndDay] = useState<number>(25);
  const [modalStartDate, setModalStartDate] = useState<string>('');
  const [modalEndDate, setModalEndDate] = useState<string>('');
  const [modalScope, setModalScope] = useState<'company' | 'user'>('company');
  const [savingCycleConfig, setSavingCycleConfig] = useState<boolean>(false);
  const [cycleSavedFeedback, setCycleSavedFeedback] = useState<string | null>(null);
  const [performance, setPerformance] = useState<{
    totalGoal: number;
    totalResult: number;
    percentage: number;
    sellersCount: number;
    myResult?: number;
    myGoal?: number;
    myPercentage?: number;
    isSellerUser?: boolean;
  }>({
    totalGoal: 0,
    totalResult: 0,
    percentage: 0,
    sellersCount: 0,
    isSellerUser: false
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

  const openCycleConfigModal = () => {
    setModalStartDay(cycleRange.startDay || 26);
    setModalEndDay(cycleRange.endDay || 25);
    setModalStartDate(cycleRange.startDate);
    setModalEndDate(cycleRange.endDate);
    setModalScope(isManagerial ? (cycleRange.scope || 'company') : 'user');
    setCycleSavedFeedback(null);
    setShowCycleSettingsModal(true);
  };

  const handleModalDaysChange = (newStartDay: number, newEndDay: number) => {
    const safeStart = Math.min(31, Math.max(1, Number(newStartDay) || 26));
    const safeEnd = Math.min(31, Math.max(1, Number(newEndDay) || 25));
    setModalStartDay(safeStart);
    setModalEndDay(safeEnd);
    const previewCycle = getDefaultSalesCycleForDate(new Date(), safeStart, safeEnd, modalScope);
    setModalStartDate(previewCycle.startDate);
    setModalEndDate(previewCycle.endDate);
  };

  const handleSaveCycleSettingsModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const safeStart = Math.min(31, Math.max(1, Number(modalStartDay) || 26));
    const safeEnd = Math.min(31, Math.max(1, Number(modalEndDay) || 25));
    const targetScope = isManagerial ? modalScope : 'user';

    let finalStartDate = modalStartDate;
    let finalEndDate = modalEndDate;
    if (!finalStartDate || !finalEndDate || finalStartDate > finalEndDate) {
      const computed = getSalesCycleForMonthYear(
        cycleRange.refMonth,
        cycleRange.refYear,
        safeStart,
        safeEnd,
        targetScope
      );
      finalStartDate = computed.startDate;
      finalEndDate = computed.endDate;
    }

    setSavingCycleConfig(true);
    try {
      const { range } = await saveSalesCycleToSupabase({
        startDate: finalStartDate,
        endDate: finalEndDate,
        startDay: safeStart,
        endDay: safeEnd,
        scope: targetScope,
        userId: user?.id,
        userName: user?.name,
        autoRollover: true,
      });
      setCycleRange(range);
      setCycleSavedFeedback(
        targetScope === 'company'
          ? `Ciclo (${safeStart} a ${safeEnd}) salvo no banco para toda a Empresa!`
          : `Ciclo (${safeStart} a ${safeEnd}) salvo no banco para seu Usuário!`
      );
      setTimeout(() => {
        setShowCycleSettingsModal(false);
        setCycleSavedFeedback(null);
      }, 900);
    } finally {
      setSavingCycleConfig(false);
    }
  };

  const fetchTodayDailySales = useCallback(async () => {
    try {
      const todayStr = getTodayLocalYYYYMMDD();
      const res = await fetch(`/api/sales/daily?date=${todayStr}`, { cache: 'no-store' });
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

        // Determina o intervalo exato do ciclo comercial (26 do mês anterior a 25 do mês atual)
        // usando `date-fns` (`subDays(..., 5)` sobre a data final de cada mês comercial).
        const { cycleStart, cycleEnd, startDateStr, endDateStr } =
          calculateCommercialCycleBounds(cycleRange);

        // Fetch all active sellers/collaborators eligible for sales so that
        // the global revenue sum (faturamento real) is complete and accurate for ALL users.
        const { data: sellers } = await supabase
          .from('profiles')
          .select('id, name')
          .or('type.eq.vendedor,can_access_sales.eq.true');

        const sellerIds = (sellers || []).map(s => s.id);

        // 1. Fetch daily sales strictly within the commercial cycle interval [cycleStart, cycleEnd]
        const dailyBySeller: Record<string, { sales_amount: number; orders_count: number }> = {};
        let hasDailyEntriesInRange = false;
        let hasDailyRegistryInSystem = false;
        try {
          const dailyRes = await fetch(
            `/api/sales/daily?startDate=${startDateStr}&endDate=${endDateStr}`,
            { cache: 'no-store' }
          );
          if (dailyRes.ok) {
            const dailyJson = await dailyRes.json();
            const rawEntries: any[] = Array.isArray(dailyJson.entries) ? dailyJson.entries : [];
            hasDailyRegistryInSystem =
              Number(dailyJson.total_registry_entries) > 0 || rawEntries.length > 0;
            const cycleEntries = rawEntries.filter(entry =>
              isSaleDateWithinCommercialCycle(entry?.date || entry?.sale_date, cycleStart, cycleEnd)
            );
            hasDailyEntriesInRange = cycleEntries.length > 0;
            cycleEntries.forEach(entry => {
              const sId = entry.collaborator_id;
              if (!sId) return;
              if (!dailyBySeller[sId]) {
                dailyBySeller[sId] = { sales_amount: 0, orders_count: 0 };
              }
              dailyBySeller[sId].sales_amount += Number(entry.sales_amount) || 0;
              dailyBySeller[sId].orders_count += Number(entry.orders_count) || 0;
            });
          }
        } catch (e) {
          console.warn('Falha ao buscar vendas diárias por período:', e);
        }

        // 2. Fetch direct sales transactions from `sales` table strictly inside [cycleStart, cycleEnd]
        const directSalesBySeller: Record<string, number> = {};
        try {
          const { data: directSales } = await supabase
            .from('sales')
            .select('seller_id, total_value, sale_date, created_at, status')
            .gte('sale_date', `${startDateStr}T00:00:00`)
            .lte('sale_date', `${endDateStr}T23:59:59`);

          (directSales || []).forEach(sale => {
            if (sale.status && sale.status !== 'completed') return;
            const saleDateRef = sale.sale_date || sale.created_at;
            if (!sale.seller_id || !isSaleDateWithinCommercialCycle(saleDateRef, cycleStart, cycleEnd)) {
              return;
            }
            directSalesBySeller[sale.seller_id] =
              (directSalesBySeller[sale.seller_id] || 0) + (Number(sale.total_value) || 0);
          });
        } catch {
          // Ignore if table is not populated
        }

        // 3. Fetch sales_results for the commercial cycle's reference period
        const [startY, startM] = startDateStr.split('-').map(Number);
        const [endY, endM] = endDateStr.split('-').map(Number);

        let salesQuery = supabase
          .from('sales_results')
          .select('*')
          .eq('month', cycleRange.refMonth)
          .eq('year', cycleRange.refYear);
        
        if (sellerIds.length > 0) {
          salesQuery = salesQuery.in('collaborator_id', sellerIds);
        }

        const { data, error } = await salesQuery;

        let activeRows: any[] = (!error && data && data.length > 0) ? data : [];
        const hasTargetInRef = activeRows.some(
          r => (parseFloat(r.target_2026) || 0) > 0
        );

        // If the new cycle's reference month does not have targets configured yet,
        // fallback to the previous cycle ONLY for target_2026 (Meta), NEVER for result_2026 (Faturamento Realizado)!
        if (!hasTargetInRef && startM && startY && (startM !== endM || startY !== endY)) {
          let startMonthQuery = supabase
            .from('sales_results')
            .select('*')
            .eq('month', startM)
            .eq('year', startY);

          if (sellerIds.length > 0) {
            startMonthQuery = startMonthQuery.in('collaborator_id', sellerIds);
          }

          const { data: startMonthData } = await startMonthQuery;
          if (
            startMonthData &&
            startMonthData.some(r => (parseFloat(r.target_2026) || 0) > 0)
          ) {
            activeRows = startMonthData.map(r => ({
              ...r,
              // Realized sales from the previous cycle must NEVER carry over into the new cycle
              result_2026: 0,
            }));
          }
        }

        // Fallback to most recent recorded period ONLY for target_2026 (Meta) if still without targets
        const stillNoTargets = !activeRows.some(
          r => (parseFloat(r.target_2026) || 0) > 0
        );
        if (activeRows.length === 0 || stillNoTargets) {
          let fallbackQuery = supabase
            .from('sales_results')
            .select('*')
            .order('year', { ascending: false })
            .order('month', { ascending: false })
            .limit(40);
          
          if (sellerIds.length > 0) {
            fallbackQuery = fallbackQuery.in('collaborator_id', sellerIds);
          }

          const { data: fallbackData } = await fallbackQuery;
          if (fallbackData && fallbackData.length > 0) {
            const nonZeroRow = fallbackData.find(
              d => (parseFloat(d.target_2026) || 0) > 0
            ) || fallbackData[0];
            const latestMonth = nonZeroRow.month;
            const latestYear = nonZeroRow.year;
            activeRows = fallbackData
              .filter(d => d.month === latestMonth && d.year === latestYear)
              .map(r => ({
                ...r,
                // Keep result_2026 only if this row genuinely belongs to the current cycle interval [cycleStart, cycleEnd]
                result_2026:
                  !hasDailyRegistryInSystem &&
                  isSalesResultFromCurrentCycle(r, {
                    startDate: startDateStr,
                    endDate: endDateStr,
                    refMonth: cycleRange.refMonth,
                    refYear: cycleRange.refYear,
                  })
                    ? r.result_2026
                    : 0,
              }));
          }
        }

        const relevantData = sellerIds.length > 0
          ? activeRows.filter(curr => sellerIds.includes(curr.collaborator_id))
          : activeRows;

        const totalGoal = relevantData.reduce((acc, curr) => acc + (parseFloat(curr.target_2026) || 0), 0);

        // For each seller, compute realized sales strictly within [cycleStart, cycleEnd] (26 of prev month to 25 of current month)
        const sellerResultsMap = new Map<string, { goal: number; result: number }>();
        relevantData.forEach(row => {
          const sId = row.collaborator_id;
          const isCurrentCycleRow =
            !hasDailyRegistryInSystem &&
            Number(row.month) === Number(cycleRange.refMonth) &&
            Number(row.year) === Number(cycleRange.refYear) &&
            isSaleDateWithinCommercialCycle(
              row.updated_at || row.created_at,
              cycleStart,
              cycleEnd
            );
          const consolidated = isCurrentCycleRow ? (parseFloat(row.result_2026) || 0) : 0;
          const goal = parseFloat(row.target_2026) || 0;
          const daily = Number(dailyBySeller[sId]?.sales_amount) || 0;
          const direct = Number(directSalesBySeller[sId]) || 0;
          const finalResult = Math.max(consolidated, daily, direct);
          sellerResultsMap.set(sId, { goal, result: finalResult });
        });

        // Also add any sellers who have daily or direct sales in [cycleStart, cycleEnd]
        Object.entries(dailyBySeller).forEach(([sId, dailyData]) => {
          const dailyAmount = Number(dailyData.sales_amount) || 0;
          const directAmount = Number(directSalesBySeller[sId]) || 0;
          const cycleAmount = Math.max(dailyAmount, directAmount);
          if (!sellerResultsMap.has(sId)) {
            sellerResultsMap.set(sId, { goal: 0, result: cycleAmount });
          } else {
            const current = sellerResultsMap.get(sId)!;
            sellerResultsMap.set(sId, {
              goal: current.goal,
              result: Math.max(current.result, cycleAmount)
            });
          }
        });

        Object.entries(directSalesBySeller).forEach(([sId, directAmount]) => {
          const amount = Number(directAmount) || 0;
          if (!sellerResultsMap.has(sId)) {
            sellerResultsMap.set(sId, { goal: 0, result: amount });
          } else {
            const current = sellerResultsMap.get(sId)!;
            sellerResultsMap.set(sId, {
              goal: current.goal,
              result: Math.max(current.result, amount)
            });
          }
        });

        // Total realized revenue sum strictly within the defined commercial cycle [cycleStart, cycleEnd]
        let totalResult = Array.from(sellerResultsMap.values()).reduce((acc, curr) => acc + curr.result, 0);

        if (totalResult === 0 && hasDailyEntriesInRange) {
          totalResult = Object.values(dailyBySeller).reduce(
            (acc, curr) => acc + (Number(curr.sales_amount) || 0),
            0
          );
        }

        const percentage = totalGoal > 0 ? Math.round((totalResult / totalGoal) * 1000) / 10 : 0;

        // Check if the current logged-in user is one of the sellers
        const currentUserId = user?.id;
        const myData = currentUserId ? sellerResultsMap.get(currentUserId) : undefined;
        const isSellerUser = !!myData && (myData.goal > 0 || myData.result > 0);
        const myResult = myData ? myData.result : 0;
        const myGoal = myData ? myData.goal : 0;
        const myPercentage = myGoal > 0 ? Math.round((myResult / myGoal) * 1000) / 10 : 0;

        setPerformance({
          totalGoal,
          totalResult,
          percentage,
          sellersCount: Math.max(relevantData.length, sellerIds.length, sellerResultsMap.size),
          myResult,
          myGoal,
          myPercentage,
          isSellerUser,
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
      id="faturamento-meta-card"
      ref={containerRef}
      className={`p-6 rounded-3xl border transition-all flex flex-col justify-between gap-4 relative overflow-hidden shadow-sm hover:shadow-md ${
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
              Ciclo Comercial ({cycleRange.startDay || 26} a {cycleRange.endDay || 25}) • Soma consolidada do faturamento real de todos os vendedores
            </p>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={openCycleConfigModal}
            className="flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 transition-all shrink-0 active:scale-95 cursor-pointer whitespace-nowrap shadow-2xs"
            title="Configurar datas de início e fim do ciclo comercial e salvar no banco de dados"
          >
            <Settings2 size={14} className="text-emerald-600 dark:text-emerald-400 stroke-[2.3]" />
            <span>Configurar Ciclo ({cycleRange.startDay || 26} a {cycleRange.endDay || 25})</span>
          </button>

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
                  {`${performance.sellersCount} ${performance.sellersCount === 1 ? 'vendedor' : 'vendedores'}`}
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

            {/* Individual Seller Progress Box if the current user is a seller */}
            {performance.isSellerUser && (
              <div className="mt-2.5 p-3 rounded-2xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0">
                    <Users size={14} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 block">
                      Meu Desempenho Individual no Ciclo
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-200 font-bold tabular-nums">
                      Faturamento: <strong className="text-blue-600 dark:text-blue-300 font-black">{formatBRL(performance.myResult || 0)}</strong> de meta {formatBRL(performance.myGoal || 0)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-blue-600 text-white shadow-2xs">
                    {(performance.myPercentage || 0).toFixed(1)}% da meta pessoal
                  </span>
                </div>
              </div>
            )}
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
                  Meta do Ciclo ({cycleRange.startDay || 26} a {cycleRange.endDay || 25})
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

      {/* Commercial Cycle Configuration Modal (Saved in Supabase Database) */}
      {showCycleSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/25">
                  <Calendar size={20} />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Configurar Ciclo Comercial
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina os dias ou datas de início e fim do ciclo e salve no banco de dados
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCycleSettingsModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveCycleSettingsModal} className="p-6 space-y-5">
              {/* Quick Presets */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Modelos Rápidos de Ciclo
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: '26 a 25 (Padrão)', start: 26, end: 25 },
                    { label: '21 a 20', start: 21, end: 20 },
                    { label: '16 a 15', start: 16, end: 15 },
                    { label: '1 a 30 (Mês Civil)', start: 1, end: 30 },
                  ].map((preset) => {
                    const isSelected = modalStartDay === preset.start && modalEndDay === preset.end;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleModalDaysChange(preset.start, preset.end)}
                        className={`px-2.5 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start Day and End Day Rule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Dia de Início do Ciclo (1 a 31)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={modalStartDay}
                    onChange={(e) =>
                      handleModalDaysChange(parseInt(e.target.value, 10) || 1, modalEndDay)
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                    Ex: Dia 26 do mês anterior
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Dia de Fim / Fechamento (1 a 31)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={modalEndDay}
                    onChange={(e) =>
                      handleModalDaysChange(modalStartDay, parseInt(e.target.value, 10) || 1)
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                    Ex: Dia 25 do mês atual
                  </span>
                </div>
              </div>

              {/* Specific Start and End Dates */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                    Datas do Ciclo Comercial Ativo
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    {formatDateBR(modalStartDate)} até {formatDateBR(modalEndDate)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                      Data de Início
                    </label>
                    <input
                      type="date"
                      value={modalStartDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setModalStartDate(val);
                        if (val) {
                          const [, , d] = val.split('-').map(Number);
                          if (d) setModalStartDay(d);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                      Data de Fim
                    </label>
                    <input
                      type="date"
                      value={modalEndDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setModalEndDate(val);
                        if (val) {
                          const [, , d] = val.split('-').map(Number);
                          if (d) setModalEndDay(d);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Database Persistence Scope */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Onde Salvar no Banco de Dados (Supabase)
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    disabled={!isManagerial}
                    onClick={() => setModalScope('company')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      modalScope === 'company'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                    } ${!isManagerial ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Building2 size={14} />
                    <span>Padrão da Empresa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalScope('user')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      modalScope === 'user'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                    }`}
                  >
                    <User size={14} />
                    <span>Apenas Meu Usuário</span>
                  </button>
                </div>
              </div>

              {cycleSavedFeedback && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0" />
                  <span>{cycleSavedFeedback}</span>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCycleSettingsModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCycleConfig}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{savingCycleConfig ? 'Salvando no Banco...' : 'Salvar no Banco de Dados'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

